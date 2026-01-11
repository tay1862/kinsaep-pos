// ============================================
// 📋 CONTRACTS COMPOSABLE
// Contract Management & Asset Rentals
// With Nostr Sync & History Logging
// ============================================

import type { Event, Filter } from "nostr-tools";
import type {
  Contract,
  ContractType,
  ContractStatus,
  RentalAsset,
  AssetType,
  RentalBooking,
  CurrencyCode,
  ContractHistoryEntry,
  ContractHistoryAction,
  ContractPayment,
  ContractPaymentMethod,
} from "~/types";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// ============================================
// 🔧 UTILITY FUNCTIONS
// ============================================

function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// 🗄️ SINGLETON STATE
// ============================================

const contracts = ref<Contract[]>([]);
const assets = ref<RentalAsset[]>([]);
const bookings = ref<RentalBooking[]>([]);
const history = ref<ContractHistoryEntry[]>([]);
const payments = ref<ContractPayment[]>([]);

// Loading & Sync State
const isLoading = ref(false);
const isSyncing = ref(false);
const lastSyncAt = ref<string | null>(null);
const syncError = ref<string | null>(null);
const error = ref<string | null>(null);
const isInitialized = ref(false);

// Counter for contract numbers
let contractCounter = 1;
let bookingCounter = 1;

// Subscription handles
let contractSubscription: { close: () => void } | null = null;
let assetSubscription: { close: () => void } | null = null;
let bookingSubscription: { close: () => void } | null = null;

// ============================================
// 📋 COMPOSABLE
// ============================================

export function useContracts() {
  const nostrData = useNostrData();
  const company = useCompany();
  const relay = useNostrRelay();

  // ============================================
  // 🔍 COMPUTED
  // ============================================

  const activeContracts = computed(() =>
    contracts.value.filter((c) => c.status === "active")
  );

  const draftContracts = computed(() =>
    contracts.value.filter((c) => c.status === "draft")
  );

  const expiredContracts = computed(() =>
    contracts.value.filter((c) => c.status === "expired")
  );

  const expiringContracts = computed(() => {
    const inOneWeek = new Date();
    inOneWeek.setDate(inOneWeek.getDate() + 7);
    return contracts.value.filter((c) => {
      if (c.status !== "active") return false;
      return new Date(c.endDate) <= inOneWeek;
    });
  });

  const availableAssets = computed(() =>
    assets.value.filter((a) => a.isAvailable && a.isActive)
  );

  const todayBookings = computed(() => {
    const today = new Date().toISOString().split("T")[0] ?? "";
    return bookings.value.filter((b) => b.startTime?.startsWith(today));
  });

  const stats = computed(() => ({
    totalContracts: contracts.value.length,
    activeCount: activeContracts.value.length,
    draftCount: draftContracts.value.length,
    expiringCount: expiringContracts.value.length,
    totalAssets: assets.value.filter((a) => a.isActive).length,
    availableAssets: availableAssets.value.length,
    todayBookings: todayBookings.value.length,
    pendingDeposits: contracts.value.filter(
      (c) => c.depositStatus === "pending"
    ).length,
    monthlyRevenue: activeContracts.value
      .filter((c) => c.paymentSchedule === "monthly")
      .reduce((sum, c) => sum + c.amount, 0),
  }));

  const syncStatus = computed(() => {
    if (isSyncing.value) return "syncing";
    if (syncError.value) return "error";
    if (lastSyncAt.value) return "synced";
    return "idle";
  });

  const isCompanyCodeAvailable = computed(() => {
    return company.hasCompanyCode.value && company.isCompanyCodeEnabled.value;
  });

  // ============================================
  // 💾 LOCAL STORAGE (Offline Cache)
  // ============================================

  function saveToStorage() {
    localStorage.setItem("bitspace_contracts", JSON.stringify(contracts.value));
    localStorage.setItem(
      "bitspace_rental_assets",
      JSON.stringify(assets.value)
    );
    localStorage.setItem(
      "bitspace_rental_bookings",
      JSON.stringify(bookings.value)
    );
    localStorage.setItem(
      "bitspace_contract_history",
      JSON.stringify(history.value.slice(0, 100))
    );
    localStorage.setItem(
      "bitspace_contract_payments",
      JSON.stringify(payments.value)
    );
    localStorage.setItem(
      "bitspace_contract_counters",
      JSON.stringify({
        contract: contractCounter,
        booking: bookingCounter,
      })
    );
  }

  function loadFromStorage() {
    try {
      const storedContracts = localStorage.getItem("bitspace_contracts");
      const storedAssets = localStorage.getItem("bitspace_rental_assets");
      const storedBookings = localStorage.getItem("bitspace_rental_bookings");
      const storedHistory = localStorage.getItem("bitspace_contract_history");
      const storedPayments = localStorage.getItem("bitspace_contract_payments");
      const storedCounters = localStorage.getItem("bitspace_contract_counters");

      if (storedContracts) contracts.value = JSON.parse(storedContracts);
      if (storedAssets) assets.value = JSON.parse(storedAssets);
      if (storedBookings) bookings.value = JSON.parse(storedBookings);
      if (storedHistory) history.value = JSON.parse(storedHistory);
      if (storedPayments) payments.value = JSON.parse(storedPayments);
      if (storedCounters) {
        const counters = JSON.parse(storedCounters);
        contractCounter = counters.contract || 1;
        bookingCounter = counters.booking || 1;
      }
    } catch (e) {
      console.warn("[Contracts] Failed to load from storage:", e);
    }
  }

  // ============================================
  // 📤 NOSTR SYNC - PUBLISH
  // ============================================

  async function saveContractToNostr(contract: Contract): Promise<boolean> {
    const keys = nostrData.getUserKeys();
    if (!keys) return false;

    const tags: string[][] = [
      ["d", contract.id],
      ["status", contract.status],
      ["customer", contract.customerName],
      ["type", contract.type],
    ];

    if (company.companyCodeHash.value) {
      tags.push(["c", company.companyCodeHash.value]);
    }

    const event = await nostrData.publishReplaceableEvent(
      NOSTR_KINDS.CONTRACT,
      contract,
      contract.id,
      tags,
      true
    );

    return event !== null;
  }

  async function saveAssetToNostr(asset: RentalAsset): Promise<boolean> {
    const keys = nostrData.getUserKeys();
    if (!keys) return false;

    const tags: string[][] = [
      ["d", asset.id],
      ["name", asset.name],
      ["type", asset.type],
      ["available", asset.isAvailable ? "true" : "false"],
    ];

    if (company.companyCodeHash.value) {
      tags.push(["c", company.companyCodeHash.value]);
    }

    const event = await nostrData.publishReplaceableEvent(
      NOSTR_KINDS.RENTAL_ASSET,
      asset,
      asset.id,
      tags,
      true
    );

    return event !== null;
  }

  async function saveBookingToNostr(booking: RentalBooking): Promise<boolean> {
    const keys = nostrData.getUserKeys();
    if (!keys) return false;

    const tags: string[][] = [
      ["d", booking.id],
      ["asset", booking.assetId],
      ["customer", booking.customerName],
      ["status", booking.status],
    ];

    if (company.companyCodeHash.value) {
      tags.push(["c", company.companyCodeHash.value]);
    }

    const event = await nostrData.publishReplaceableEvent(
      NOSTR_KINDS.RENTAL_BOOKING,
      booking,
      booking.id,
      tags,
      true
    );

    return event !== null;
  }

  async function saveHistoryToNostr(
    entry: ContractHistoryEntry
  ): Promise<boolean> {
    const keys = nostrData.getUserKeys();
    if (!keys) return false;

    const tags: string[][] = [
      ["d", entry.id],
      ["entity", entry.entityType],
      ["entityId", entry.entityId],
      ["action", entry.action],
      ["user", entry.userId],
    ];

    if (company.companyCodeHash.value) {
      tags.push(["c", company.companyCodeHash.value]);
    }

    const event = await nostrData.publishReplaceableEvent(
      NOSTR_KINDS.CONTRACT_HISTORY,
      entry,
      entry.id,
      tags,
      true
    );

    return event !== null;
  }

  // ============================================
  // 📥 NOSTR SYNC - FETCH
  // ============================================

  async function fetchContractsFromNostr(): Promise<Contract[]> {
    const keys = nostrData.getUserKeys();
    if (!keys) return [];

    const filter: Filter = {
      kinds: [NOSTR_KINDS.CONTRACT],
      limit: 500,
    };

    if (company.companyCodeHash.value && company.isCompanyCodeEnabled.value) {
      filter["#c"] = [company.companyCodeHash.value];
    } else {
      filter.authors = [keys.pubkey];
    }

    const events = await relay.queryEvents(filter);
    const fetchedContracts: Contract[] = [];

    for (const event of events) {
      try {
        const isEncrypted =
          event.tags.find((t: string[]) => t[0] === "encrypted")?.[1] ===
          "true";
        let data: Contract | null = null;

        if (isEncrypted) {
          data = await nostrData.decryptData<Contract>(event.content);
        } else {
          data = JSON.parse(event.content);
        }

        if (data?.id) {
          fetchedContracts.push(data);
        }
      } catch (e) {
        console.warn("[Contracts] Failed to parse contract event:", e);
      }
    }

    return fetchedContracts;
  }

  async function fetchAssetsFromNostr(): Promise<RentalAsset[]> {
    const keys = nostrData.getUserKeys();
    if (!keys) return [];

    const filter: Filter = {
      kinds: [NOSTR_KINDS.RENTAL_ASSET],
      limit: 500,
    };

    if (company.companyCodeHash.value && company.isCompanyCodeEnabled.value) {
      filter["#c"] = [company.companyCodeHash.value];
    } else {
      filter.authors = [keys.pubkey];
    }

    const events = await relay.queryEvents(filter);
    const fetchedAssets: RentalAsset[] = [];

    for (const event of events) {
      try {
        const isEncrypted =
          event.tags.find((t: string[]) => t[0] === "encrypted")?.[1] ===
          "true";
        let data: RentalAsset | null = null;

        if (isEncrypted) {
          data = await nostrData.decryptData<RentalAsset>(event.content);
        } else {
          data = JSON.parse(event.content);
        }

        if (data?.id) {
          fetchedAssets.push(data);
        }
      } catch (e) {
        console.warn("[Contracts] Failed to parse asset event:", e);
      }
    }

    return fetchedAssets;
  }

  async function fetchBookingsFromNostr(): Promise<RentalBooking[]> {
    const keys = nostrData.getUserKeys();
    if (!keys) return [];

    const filter: Filter = {
      kinds: [NOSTR_KINDS.RENTAL_BOOKING],
      limit: 500,
    };

    if (company.companyCodeHash.value && company.isCompanyCodeEnabled.value) {
      filter["#c"] = [company.companyCodeHash.value];
    } else {
      filter.authors = [keys.pubkey];
    }

    const events = await relay.queryEvents(filter);
    const fetchedBookings: RentalBooking[] = [];

    for (const event of events) {
      try {
        const isEncrypted =
          event.tags.find((t: string[]) => t[0] === "encrypted")?.[1] ===
          "true";
        let data: RentalBooking | null = null;

        if (isEncrypted) {
          data = await nostrData.decryptData<RentalBooking>(event.content);
        } else {
          data = JSON.parse(event.content);
        }

        if (data?.id) {
          fetchedBookings.push(data);
        }
      } catch (e) {
        console.warn("[Contracts] Failed to parse booking event:", e);
      }
    }

    return fetchedBookings;
  }

  async function fetchHistoryFromNostr(): Promise<ContractHistoryEntry[]> {
    const keys = nostrData.getUserKeys();
    if (!keys) return [];

    const filter: Filter = {
      kinds: [NOSTR_KINDS.CONTRACT_HISTORY],
      limit: 200,
    };

    if (company.companyCodeHash.value && company.isCompanyCodeEnabled.value) {
      filter["#c"] = [company.companyCodeHash.value];
    } else {
      filter.authors = [keys.pubkey];
    }

    const events = await relay.queryEvents(filter);
    const fetchedHistory: ContractHistoryEntry[] = [];

    for (const event of events) {
      try {
        const isEncrypted =
          event.tags.find((t: string[]) => t[0] === "encrypted")?.[1] ===
          "true";
        let data: ContractHistoryEntry | null = null;

        if (isEncrypted) {
          data = await nostrData.decryptData<ContractHistoryEntry>(
            event.content
          );
        } else {
          data = JSON.parse(event.content);
        }

        if (data?.id) {
          fetchedHistory.push(data);
        }
      } catch (e) {
        console.warn("[Contracts] Failed to parse history event:", e);
      }
    }

    return fetchedHistory.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // ============================================
  // 🔄 SYNC
  // ============================================

  async function syncFromNostr(): Promise<void> {
    isSyncing.value = true;
    syncError.value = null;

    try {
      const [
        nostrContracts,
        nostrAssets,
        nostrBookings,
        nostrHistory,
        nostrPayments,
      ] = await Promise.all([
        fetchContractsFromNostr(),
        fetchAssetsFromNostr(),
        fetchBookingsFromNostr(),
        fetchHistoryFromNostr(),
        fetchPaymentsFromNostr(),
      ]);

      // Merge with local data (Nostr takes precedence for same IDs)
      const contractMap = new Map(contracts.value.map((c) => [c.id, c]));
      for (const contract of nostrContracts) {
        contractMap.set(contract.id, contract);
      }
      contracts.value = Array.from(contractMap.values());

      const assetMap = new Map(assets.value.map((a) => [a.id, a]));
      for (const asset of nostrAssets) {
        assetMap.set(asset.id, asset);
      }
      assets.value = Array.from(assetMap.values());

      const bookingMap = new Map(bookings.value.map((b) => [b.id, b]));
      for (const booking of nostrBookings) {
        bookingMap.set(booking.id, booking);
      }
      bookings.value = Array.from(bookingMap.values());

      history.value = nostrHistory;

      const paymentMap = new Map(payments.value.map((p) => [p.id, p]));
      for (const payment of nostrPayments) {
        paymentMap.set(payment.id, payment);
      }
      payments.value = Array.from(paymentMap.values());

      saveToStorage();
      lastSyncAt.value = new Date().toISOString();
    } catch (e) {
      console.error("[Contracts] Sync failed:", e);
      syncError.value = String(e);
    } finally {
      isSyncing.value = false;
    }
  }

  async function refreshContract(id: string): Promise<void> {
    const keys = nostrData.getUserKeys();
    if (!keys) return;

    isLoading.value = true;
    try {
      // 1. Fetch Contract by 'd' tag
      const contractFilter: Filter = {
        kinds: [NOSTR_KINDS.CONTRACT],
        "#d": [id],
        limit: 1,
      };

      // 2. Fetch Payments by 'contract' tag
      const paymentFilter: Filter = {
        kinds: [NOSTR_KINDS.CONTRACT_PAYMENT],
        "#contract": [id],
        limit: 500,
      };

      // 3. Fetch History by 'entityId' tag
      const historyFilter: Filter = {
        kinds: [NOSTR_KINDS.CONTRACT_HISTORY],
        "#entityId": [id],
        limit: 500,
      };

      if (company.companyCodeHash.value && company.isCompanyCodeEnabled.value) {
        const c = company.companyCodeHash.value;
        contractFilter["#c"] = [c];
        paymentFilter["#c"] = [c];
        historyFilter["#c"] = [c];
      } else {
        const p = keys.pubkey;
        contractFilter.authors = [p];
        paymentFilter.authors = [p];
        historyFilter.authors = [p];
      }

      const [contractEvents, paymentEvents, historyEvents] = await Promise.all([
        relay.queryEvents(contractFilter),
        relay.queryEvents(paymentFilter),
        relay.queryEvents(historyFilter),
      ]);

      // Process Contract
      for (const event of contractEvents) {
        try {
          const isEncrypted =
            event.tags.find((t: string[]) => t[0] === "encrypted")?.[1] ===
            "true";
          const data = isEncrypted
            ? await nostrData.decryptData<Contract>(event.content)
            : JSON.parse(event.content);

          if (data?.id) {
            const idx = contracts.value.findIndex((c) => c.id === data.id);
            if (idx >= 0) contracts.value[idx] = data;
            else contracts.value.unshift(data);
          }
        } catch (e) {
          console.warn("Failed to parse contract", e);
        }
      }

      // Process Payments
      const paymentMap = new Map(payments.value.map((p) => [p.id, p]));
      for (const event of paymentEvents) {
        try {
          const isEncrypted =
            event.tags.find((t: string[]) => t[0] === "encrypted")?.[1] ===
            "true";
          const data = isEncrypted
            ? await nostrData.decryptData<ContractPayment>(event.content)
            : JSON.parse(event.content);

          if (data?.id) paymentMap.set(data.id, data);
        } catch (e) {
          console.warn("Failed to parse payment", e);
        }
      }
      payments.value = Array.from(paymentMap.values()).sort(
        (a, b) =>
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      );

      // Process History
      const historyMap = new Map(history.value.map((h) => [h.id, h]));
      for (const event of historyEvents) {
        try {
          const isEncrypted =
            event.tags.find((t: string[]) => t[0] === "encrypted")?.[1] ===
            "true";
          const data = isEncrypted
            ? await nostrData.decryptData<ContractHistoryEntry>(event.content)
            : JSON.parse(event.content);

          if (data?.id) historyMap.set(data.id, data);
        } catch (e) {
          console.warn("Failed to parse history", e);
        }
      }
      history.value = Array.from(historyMap.values()).sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      saveToStorage();
    } catch (e) {
      console.error("[Contracts] Refresh failed:", e);
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 📝 HISTORY LOGGING
  // ============================================

  async function logHistory(
    entityType: ContractHistoryEntry["entityType"],
    entityId: string,
    action: ContractHistoryAction,
    details: string,
    previousData?: Record<string, unknown>,
    newData?: Record<string, unknown>
  ): Promise<void> {
    const { getCurrentUserIdentifier, getCurrentUserName } =
      useUserIdentifier();

    const entry: ContractHistoryEntry = {
      id: generateId(),
      entityType,
      entityId,
      action,
      timestamp: new Date().toISOString(),
      userId: getCurrentUserIdentifier(),
      userName: getCurrentUserName(),
      previousData,
      newData,
      details,
    };

    history.value.unshift(entry);
    saveToStorage();

    // Publish to Nostr (async, don't await)
    saveHistoryToNostr(entry).catch((e) =>
      console.warn("[Contracts] Failed to save history to Nostr:", e)
    );
  }

  // ============================================
  // 🚀 INITIALIZE
  // ============================================

  async function init(): Promise<void> {
    if (isInitialized.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      // Load from local storage first (instant)
      loadFromStorage();

      // Check for expired contracts
      await checkExpirations();

      // Sync from Nostr
      const syncPromise = syncFromNostr();

      // If no local data, wait for sync to avoid "empty" flash
      if (contracts.value.length === 0) {
        await syncPromise;
      } else {
        // Otherwise sync in background
        syncPromise.catch((e) =>
          console.warn("[Contracts] Background sync failed:", e)
        );
      }

      isInitialized.value = true;
    } catch (e) {
      console.error("[Contracts] Init error:", e);
      error.value = String(e);
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // CONTRACT CRUD
  // ============================================

  function generateContractId(): string {
    return generateId();
  }

  function generateContractNumber(): string {
    const year = new Date().getFullYear();
    const number = String(contractCounter++).padStart(5, "0");
    return `CTR-${year}-${number}`;
  }

  async function createContract(data: {
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    customerId?: string;
    type: ContractType;
    assetId?: string;
    startDate: string;
    endDate: string;
    amount: number;
    paymentSchedule: Contract["paymentSchedule"];
    depositAmount?: number;
    autoRenew?: boolean;
    description?: string;
    notes?: string;
    terms?: string;
    currency?: CurrencyCode;
  }): Promise<Contract> {
    const now = new Date().toISOString();
    const asset = data.assetId
      ? assets.value.find((a) => a.id === data.assetId)
      : undefined;

    const contract: Contract = {
      id: generateContractId(),
      contractNumber: generateContractNumber(),
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      customerAddress: data.customerAddress,
      type: data.type,
      status: "draft",
      assetId: data.assetId,
      asset,
      startDate: data.startDate,
      endDate: data.endDate,
      amount: data.amount,
      paymentSchedule: data.paymentSchedule,
      currency: data.currency || "LAK",
      depositAmount: data.depositAmount,
      depositStatus: data.depositAmount ? "pending" : undefined,
      autoRenew: data.autoRenew || false,
      description: data.description,
      notes: data.notes,
      terms: data.terms,
      createdAt: now,
      updatedAt: now,
    };

    contracts.value.unshift(contract);
    saveToStorage();

    // Log history
    await logHistory(
      "contract",
      contract.id,
      "created",
      `Contract ${contract.contractNumber} created for ${contract.customerName}`,
      undefined,
      contract as unknown as Record<string, unknown>
    );

    // Sync to Nostr
    saveContractToNostr(contract).catch((e) =>
      console.warn("[Contracts] Failed to save contract to Nostr:", e)
    );

    return contract;
  }

  async function updateContract(
    id: string,
    updates: Partial<Contract>
  ): Promise<Contract | null> {
    const index = contracts.value.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const previous = { ...contracts.value[index] } as Contract;
    const updated: Contract = {
      ...contracts.value[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    } as Contract;
    contracts.value[index] = updated;

    saveToStorage();

    // Log history
    await logHistory(
      "contract",
      id,
      "updated",
      `Contract updated`,
      previous as unknown as Record<string, unknown>,
      updates as unknown as Record<string, unknown>
    );

    // Sync to Nostr
    saveContractToNostr(updated).catch((e) =>
      console.warn("[Contracts] Failed to save contract to Nostr:", e)
    );

    return updated;
  }

  async function activateContract(id: string): Promise<Contract | null> {
    const result = await updateContract(id, {
      status: "active",
      activatedAt: new Date().toISOString(),
    });

    if (result) {
      await logHistory(
        "contract",
        id,
        "activated",
        `Contract ${result.contractNumber} activated`
      );
    }

    return result;
  }

  async function terminateContract(
    id: string,
    reason?: string
  ): Promise<Contract | null> {
    const contract = getContract(id);
    if (!contract) return null;

    // Release asset if attached
    if (contract.assetId) {
      await updateAssetAvailability(contract.assetId, true);
    }

    const result = await updateContract(id, {
      status: "terminated",
      terminatedAt: new Date().toISOString(),
      terminationReason: reason,
    });

    if (result) {
      await logHistory(
        "contract",
        id,
        "terminated",
        `Contract ${result.contractNumber} terminated: ${
          reason || "No reason provided"
        }`
      );
    }

    return result;
  }

  async function renewContract(
    id: string,
    newEndDate?: string
  ): Promise<Contract | null> {
    const contract = getContract(id);
    if (!contract) return null;

    let endDate = newEndDate;
    if (!endDate) {
      const current = new Date(contract.endDate);
      switch (contract.paymentSchedule) {
        case "daily":
          current.setDate(current.getDate() + 1);
          break;
        case "weekly":
          current.setDate(current.getDate() + 7);
          break;
        case "monthly":
          current.setMonth(current.getMonth() + 1);
          break;
        case "yearly":
          current.setFullYear(current.getFullYear() + 1);
          break;
        default:
          current.setMonth(current.getMonth() + 1);
      }
      endDate = current.toISOString();
    }

    const result = await updateContract(id, {
      endDate,
      status: "active",
    });

    if (result) {
      await logHistory(
        "contract",
        id,
        "renewed",
        `Contract ${result.contractNumber} renewed until ${new Date(
          endDate
        ).toLocaleDateString()}`
      );
    }

    return result;
  }

  async function collectDeposit(id: string): Promise<Contract | null> {
    const result = await updateContract(id, {
      depositStatus: "collected",
      depositPaidAt: new Date().toISOString(),
    });

    if (result) {
      await logHistory(
        "contract",
        id,
        "deposit_collected",
        `Deposit collected for contract ${result.contractNumber}`
      );
    }

    return result;
  }

  async function returnDeposit(id: string): Promise<Contract | null> {
    const result = await updateContract(id, {
      depositStatus: "returned",
      depositReturnedAt: new Date().toISOString(),
    });

    if (result) {
      await logHistory(
        "contract",
        id,
        "deposit_returned",
        `Deposit returned for contract ${result.contractNumber}`
      );
    }

    return result;
  }

  async function deleteContract(id: string): Promise<boolean> {
    const contract = getContract(id);
    if (!contract) return false;

    const index = contracts.value.findIndex((c) => c.id === id);
    if (index === -1) return false;

    contracts.value.splice(index, 1);
    saveToStorage();

    await logHistory(
      "contract",
      id,
      "deleted",
      `Contract ${contract.contractNumber} deleted`
    );

    return true;
  }

  function getContract(id: string): Contract | undefined {
    return contracts.value.find((c) => c.id === id);
  }

  async function checkExpirations(): Promise<void> {
    const now = new Date();
    contracts.value.forEach((contract, index) => {
      if (contract.status === "active" && new Date(contract.endDate) < now) {
        if (contract.autoRenew) {
          renewContract(contract.id);
        } else {
          (contracts.value[index] as Contract).status = "expired";
        }
      }
    });
    saveToStorage();
  }

  // ============================================
  // ASSET CRUD
  // ============================================

  function generateAssetId(): string {
    return `ast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async function addAsset(data: {
    name: string;
    nameLao?: string;
    type: AssetType;
    hourlyRate?: number;
    dailyRate?: number;
    monthlyRate?: number;
    deposit?: number;
    description?: string;
    location?: string;
    capacity?: number;
  }): Promise<RentalAsset> {
    const now = new Date().toISOString();
    const asset: RentalAsset = {
      id: generateAssetId(),
      name: data.name,
      nameLao: data.nameLao,
      type: data.type,
      hourlyRate: data.hourlyRate,
      dailyRate: data.dailyRate,
      monthlyRate: data.monthlyRate,
      deposit: data.deposit,
      description: data.description,
      location: data.location,
      capacity: data.capacity,
      isAvailable: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    assets.value.unshift(asset);
    saveToStorage();

    await logHistory(
      "asset",
      asset.id,
      "created",
      `Asset "${asset.name}" created`
    );

    saveAssetToNostr(asset).catch((e) =>
      console.warn("[Contracts] Failed to save asset to Nostr:", e)
    );

    return asset;
  }

  async function updateAsset(
    id: string,
    updates: Partial<RentalAsset>
  ): Promise<RentalAsset | null> {
    const index = assets.value.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const previous = { ...assets.value[index] } as RentalAsset;
    const updated: RentalAsset = {
      ...assets.value[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    } as RentalAsset;
    assets.value[index] = updated;

    saveToStorage();

    await logHistory(
      "asset",
      id,
      "updated",
      `Asset "${updated.name}" updated`,
      previous as unknown as Record<string, unknown>,
      updates as unknown as Record<string, unknown>
    );

    saveAssetToNostr(updated).catch((e) =>
      console.warn("[Contracts] Failed to save asset to Nostr:", e)
    );

    return updated;
  }

  async function updateAssetAvailability(
    id: string,
    isAvailable: boolean
  ): Promise<void> {
    await updateAsset(id, { isAvailable });
  }

  async function deleteAsset(id: string): Promise<boolean> {
    const asset = getAsset(id);
    if (!asset) return false;

    const index = assets.value.findIndex((a) => a.id === id);
    if (index === -1) return false;

    assets.value.splice(index, 1);
    saveToStorage();

    await logHistory("asset", id, "deleted", `Asset "${asset.name}" deleted`);

    return true;
  }

  function getAsset(id: string): RentalAsset | undefined {
    return assets.value.find((a) => a.id === id);
  }

  function getAssetsByType(type: AssetType): RentalAsset[] {
    return assets.value.filter((a) => a.type === type && a.isActive);
  }

  function getAvailableAssets(): RentalAsset[] {
    return availableAssets.value;
  }

  // ============================================
  // BOOKING CRUD
  // ============================================

  function generateBookingId(): string {
    return `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  function generateBookingNumber(): string {
    const year = new Date().getFullYear();
    const number = String(bookingCounter++).padStart(5, "0");
    return `BKG-${year}-${number}`;
  }

  async function createBooking(data: {
    assetId: string;
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    contractId?: string;
    startTime: string;
    endTime: string;
    totalAmount: number;
    depositAmount?: number;
    notes?: string;
  }): Promise<RentalBooking> {
    const now = new Date().toISOString();
    const asset = getAsset(data.assetId);

    const booking: RentalBooking = {
      id: generateBookingId(),
      bookingNumber: generateBookingNumber(),
      assetId: data.assetId,
      asset,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      contractId: data.contractId,
      startTime: data.startTime,
      endTime: data.endTime,
      status: "reserved",
      totalAmount: data.totalAmount,
      depositAmount: data.depositAmount,
      notes: data.notes,
      createdAt: now,
    };

    bookings.value.unshift(booking);

    if (asset) {
      await updateAssetAvailability(asset.id, false);
    }

    saveToStorage();

    await logHistory(
      "booking",
      booking.id,
      "created",
      `Booking ${booking.bookingNumber} created for ${booking.customerName}`
    );

    saveBookingToNostr(booking).catch((e) =>
      console.warn("[Contracts] Failed to save booking to Nostr:", e)
    );

    return booking;
  }

  async function checkOutBooking(id: string): Promise<RentalBooking | null> {
    const index = bookings.value.findIndex((b) => b.id === id);
    if (index === -1) return null;

    const now = new Date().toISOString();
    const booking = bookings.value[index] as RentalBooking;
    const updated: RentalBooking = {
      ...booking,
      status: "checked_out",
      actualStartTime: now,
      checkedOutAt: now,
      updatedAt: now,
    } as RentalBooking;
    bookings.value[index] = updated;

    saveToStorage();

    await logHistory(
      "booking",
      id,
      "checked_out",
      `Booking ${updated.bookingNumber || id} checked out`
    );

    saveBookingToNostr(updated).catch((e) =>
      console.warn("[Contracts] Failed to save booking to Nostr:", e)
    );

    return updated;
  }

  async function returnBooking(
    id: string,
    returnCondition?: string
  ): Promise<RentalBooking | null> {
    const index = bookings.value.findIndex((b) => b.id === id);
    if (index === -1) return null;

    const booking = bookings.value[index] as RentalBooking;
    const now = new Date().toISOString();

    const updated: RentalBooking = {
      ...booking,
      status: "returned",
      actualEndTime: now,
      returnedAt: now,
      returnCondition,
      updatedAt: now,
    } as RentalBooking;
    bookings.value[index] = updated;

    if (booking.assetId) {
      await updateAssetAvailability(booking.assetId, true);
    }

    saveToStorage();

    await logHistory(
      "booking",
      id,
      "returned",
      `Booking ${booking.bookingNumber || id} returned`
    );

    saveBookingToNostr(updated).catch((e) =>
      console.warn("[Contracts] Failed to save booking to Nostr:", e)
    );

    return updated;
  }

  async function cancelBooking(id: string): Promise<RentalBooking | null> {
    const index = bookings.value.findIndex((b) => b.id === id);
    if (index === -1) return null;

    const booking = bookings.value[index] as RentalBooking;
    const updated: RentalBooking = {
      ...booking,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    } as RentalBooking;
    bookings.value[index] = updated;

    if (booking.assetId && booking.status === "reserved") {
      await updateAssetAvailability(booking.assetId, true);
    }

    saveToStorage();
    saveBookingToNostr(updated).catch((e) =>
      console.warn("[Contracts] Failed to save booking to Nostr:", e)
    );

    return updated;
  }

  function getBooking(id: string): RentalBooking | undefined {
    return bookings.value.find((b) => b.id === id);
  }

  function getBookingsByDate(date: Date): RentalBooking[] {
    const dateStr = date.toISOString().split("T")[0] ?? "";
    return bookings.value.filter(
      (b) => b.startTime?.startsWith(dateStr) || b.endTime?.startsWith(dateStr)
    );
  }

  function getBookingsByAsset(assetId: string): RentalBooking[] {
    return bookings.value.filter((b) => b.assetId === assetId);
  }

  // ============================================
  // SEARCH & FILTER
  // ============================================

  function searchContracts(query: string): Contract[] {
    const q = query.toLowerCase();
    return contracts.value.filter(
      (c) =>
        c.contractNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.customerPhone?.includes(q) ||
        c.asset?.name.toLowerCase().includes(q)
    );
  }

  function getContractsByStatus(status: ContractStatus): Contract[] {
    return contracts.value.filter((c) => c.status === status);
  }

  function getContractsByCustomer(customerId: string): Contract[] {
    return contracts.value.filter((c) => c.customerId === customerId);
  }

  function getHistoryByEntity(
    entityType: ContractHistoryEntry["entityType"],
    entityId: string
  ): ContractHistoryEntry[] {
    return history.value.filter(
      (h) => h.entityType === entityType && h.entityId === entityId
    );
  }

  // ============================================
  // PAYMENT CRUD
  // ============================================

  async function savePaymentToNostr(
    payment: ContractPayment
  ): Promise<boolean> {
    const keys = nostrData.getUserKeys();
    if (!keys) return false;

    const tags: string[][] = [
      ["d", payment.id],
      ["contract", payment.contractId],
      ["amount", payment.amount.toString()],
      ["method", payment.paymentMethod],
    ];

    if (company.companyCodeHash.value) {
      tags.push(["c", company.companyCodeHash.value]);
    }

    const event = await nostrData.publishReplaceableEvent(
      NOSTR_KINDS.CONTRACT_PAYMENT,
      payment,
      payment.id,
      tags,
      true
    );

    return event !== null;
  }

  async function fetchPaymentsFromNostr(): Promise<ContractPayment[]> {
    const keys = nostrData.getUserKeys();
    if (!keys) return [];

    const filter: Filter = {
      kinds: [NOSTR_KINDS.CONTRACT_PAYMENT],
      limit: 1000,
    };

    if (company.companyCodeHash.value && company.isCompanyCodeEnabled.value) {
      filter["#c"] = [company.companyCodeHash.value];
    } else {
      filter.authors = [keys.pubkey];
    }

    const events = await relay.queryEvents(filter);
    const fetchedPayments: ContractPayment[] = [];

    for (const event of events) {
      try {
        const isEncrypted =
          event.tags.find((t: string[]) => t[0] === "encrypted")?.[1] ===
          "true";
        let data: ContractPayment | null = null;

        if (isEncrypted) {
          data = await nostrData.decryptData<ContractPayment>(event.content);
        } else {
          data = JSON.parse(event.content);
        }

        if (data?.id) {
          fetchedPayments.push(data);
        }
      } catch (e) {
        console.warn("[Contracts] Failed to parse payment event:", e);
      }
    }

    return fetchedPayments.sort(
      (a, b) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  }

  async function recordPayment(data: {
    contractId: string;
    amount: number;
    paymentMethod: ContractPaymentMethod;
    paymentDate?: string;
    periodStart?: string;
    periodEnd?: string;
    reference?: string;
    notes?: string;
    currency?: CurrencyCode;
  }): Promise<ContractPayment> {
    const { getCurrentUserIdentifier, getCurrentUserName } =
      useUserIdentifier();
    const contract = getContract(data.contractId);

    const payment: ContractPayment = {
      id: generateId(),
      contractId: data.contractId,
      amount: data.amount,
      currency: data.currency || contract?.currency || "LAK",
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate || new Date().toISOString(),
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      reference: data.reference,
      notes: data.notes,
      recordedBy: getCurrentUserIdentifier(),
      recordedByName: getCurrentUserName(),
      createdAt: new Date().toISOString(),
    };

    payments.value.unshift(payment);

    // Update contract totalPaid
    if (contract) {
      const totalPaid = getPaymentsByContract(data.contractId).reduce(
        (sum, p) => sum + p.amount,
        0
      );
      await updateContract(data.contractId, { totalPaid });
    }

    saveToStorage();

    // Log history
    await logHistory(
      "contract",
      data.contractId,
      "updated",
      `Payment of ${payment.amount} recorded via ${payment.paymentMethod}`,
      undefined,
      { paymentId: payment.id, amount: payment.amount } as Record<
        string,
        unknown
      >
    );

    // Sync to Nostr
    savePaymentToNostr(payment).catch((e) =>
      console.warn("[Contracts] Failed to save payment to Nostr:", e)
    );

    return payment;
  }

  function getPaymentsByContract(contractId: string): ContractPayment[] {
    return payments.value.filter((p) => p.contractId === contractId);
  }

  function getContractBalance(contractId: string): number {
    const contract = getContract(contractId);
    if (!contract) return 0;

    const totalPaid = getPaymentsByContract(contractId).reduce(
      (sum, p) => sum + p.amount,
      0
    );

    // For recurring contracts, calculate expected amount based on periods
    if (contract.paymentSchedule !== "once") {
      const start = new Date(contract.startDate);
      const now = new Date();
      let periods = 0;

      switch (contract.paymentSchedule) {
        case "daily":
          periods = Math.ceil(
            (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
          );
          break;
        case "weekly":
          periods = Math.ceil(
            (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)
          );
          break;
        case "monthly":
          periods =
            (now.getFullYear() - start.getFullYear()) * 12 +
            (now.getMonth() - start.getMonth()) +
            1;
          break;
        case "yearly":
          periods = now.getFullYear() - start.getFullYear() + 1;
          break;
      }

      const expectedAmount = periods * contract.amount;
      return expectedAmount - totalPaid;
    }

    return contract.amount - totalPaid;
  }

  function getTotalPaymentsByContract(contractId: string): number {
    return getPaymentsByContract(contractId).reduce(
      (sum, p) => sum + p.amount,
      0
    );
  }

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    contracts,
    assets,
    bookings,
    history,
    payments,
    isLoading,
    isSyncing,
    lastSyncAt,
    syncError,
    syncStatus,
    error,
    isCompanyCodeAvailable,
    // Computed
    activeContracts,
    draftContracts,
    expiredContracts,
    expiringContracts,
    availableAssets,
    todayBookings,
    stats,
    // Methods
    init,
    syncFromNostr,
    refreshContract,
    // Contract
    createContract,
    updateContract,
    activateContract,
    terminateContract,
    renewContract,
    collectDeposit,
    returnDeposit,
    deleteContract,
    getContract,
    searchContracts,
    getContractsByStatus,
    getContractsByCustomer,
    checkExpirations,
    // Asset
    addAsset,
    updateAsset,
    deleteAsset,
    getAsset,
    getAssetsByType,
    getAvailableAssets,
    // Booking
    createBooking,
    checkOutBooking,
    returnBooking,
    cancelBooking,
    getBooking,
    getBookingsByDate,
    getBookingsByAsset,
    // History
    getHistoryByEntity,
    // Payments
    recordPayment,
    getPaymentsByContract,
    getContractBalance,
    getTotalPaymentsByContract,
  };
}
