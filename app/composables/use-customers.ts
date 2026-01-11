// ============================================
// 👥 CUSTOMERS COMPOSABLE
// Customer & Loyalty Management with Dexie + Nostr
// ============================================

import type { LoyaltyMember, ZapReward } from "~/types";
import { db, type CustomerRecord } from "~/db/db";
import { EntityId, generateUUIDv7 } from "~/utils/id";

// Loyalty tier configuration
const LOYALTY_TIERS = {
  bronze: { minPoints: 0, zapMultiplier: 1, benefits: ["Basic rewards"] },
  silver: {
    minPoints: 1000,
    zapMultiplier: 1.5,
    benefits: ["5% discount", "Priority service"],
  },
  gold: {
    minPoints: 5000,
    zapMultiplier: 2,
    benefits: ["10% discount", "Free delivery", "Exclusive offers"],
  },
  platinum: {
    minPoints: 20000,
    zapMultiplier: 3,
    benefits: ["15% discount", "VIP access", "Personal account manager"],
  },
} as const;

// Points per currency unit
const POINTS_PER_SAT = 0.01; // 1 point per 100 sats
const POINTS_PER_LAK = 0.0001; // 1 point per 10,000 LAK

// Singleton state
const customers = ref<LoyaltyMember[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);
const syncPending = ref(0);

export function useCustomers() {
  const nostrData = useNostrData();
  const offline = useOffline();

  // ============================================
  // 📊 COMPUTED
  // ============================================

  const totalCustomers = computed(() => customers.value.length);

  const customersByTier = computed(() => ({
    bronze: customers.value.filter((c) => c.tier === "bronze"),
    silver: customers.value.filter((c) => c.tier === "silver"),
    gold: customers.value.filter((c) => c.tier === "gold"),
    platinum: customers.value.filter((c) => c.tier === "platinum"),
  }));

  const topCustomers = computed(() =>
    [...customers.value]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
  );

  const recentCustomers = computed(() =>
    [...customers.value]
      .sort(
        (a, b) =>
          new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
      )
      .slice(0, 10)
  );

  // ============================================
  // 💾 LOCAL DB OPERATIONS
  // ============================================

  async function loadFromLocal(): Promise<LoyaltyMember[]> {
    try {
      const records = await db.customers.toArray();
      return records.map((r) => ({
        id: r.id,
        nostrPubkey: r.nostrPubkey,
        name: r.name,
        email: r.email,
        phone: r.phone,
        address: r.address,
        notes: r.notes,
        lud16: r.lud16,
        tags: r.tags ? JSON.parse(r.tags) : [],
        points: r.points,
        tier: r.tier as LoyaltyMember["tier"],
        totalSpent: r.totalSpent,
        visitCount: r.visitCount,
        lastVisit: new Date(r.lastVisit).toISOString(),
        joinedAt: new Date(r.joinedAt).toISOString(),
        zapRewards: [],
      }));
    } catch (e) {
      console.error("Failed to load customers from local DB:", e);
      return [];
    }
  }

  async function saveToLocal(customer: LoyaltyMember): Promise<void> {
    if (!customer.id) return; // Skip invalid customers
    const record: CustomerRecord = {
      id: customer.id,
      nostrPubkey: customer.nostrPubkey,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      notes: customer.notes,
      lud16: customer.lud16,
      tags: customer.tags ? JSON.stringify(customer.tags) : undefined,
      points: customer.points,
      tier: customer.tier,
      totalSpent: customer.totalSpent,
      visitCount: customer.visitCount,
      lastVisit: new Date(customer.lastVisit).getTime(),
      joinedAt: new Date(customer.joinedAt).getTime(),
      synced: false,
    };
    await db.customers.put(record);
  }

  // ============================================
  // 📡 NOSTR SYNC
  // ============================================

  async function syncToNostr(customer: LoyaltyMember): Promise<boolean> {
    try {
      const event = await nostrData.saveCustomer(customer);
      if (event) {
        await db.customers.update(customer.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to sync customer to Nostr:", e);
      return false;
    }
  }

  async function loadFromNostr(): Promise<void> {
    try {
      const nostrCustomers = await nostrData.getAllCustomers();

      for (const customer of nostrCustomers) {
        await saveToLocal(customer);
      }

      customers.value = await loadFromLocal();
    } catch (e) {
      console.error("Failed to load from Nostr:", e);
    }
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  async function init(): Promise<void> {
    if (isInitialized.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      customers.value = await loadFromLocal();

      if (offline.isOnline.value) {
        await loadFromNostr();
      }

      const unsyncedCount = await db.customers.filter((c) => !c.synced).count();
      syncPending.value = unsyncedCount;

      isInitialized.value = true;
    } catch (e) {
      error.value = `Failed to initialize customers: ${e}`;
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 👤 CUSTOMER CRUD
  // ============================================

  async function getOrCreateCustomer(
    nostrPubkey: string
  ): Promise<LoyaltyMember> {
    // Check existing
    let customer = customers.value.find((c) => c.nostrPubkey === nostrPubkey);

    if (!customer) {
      // Create new customer
      const { id } = EntityId.customer();
      customer = {
        id,
        nostrPubkey,
        points: 0,
        tier: "bronze",
        totalSpent: 0,
        visitCount: 0,
        lastVisit: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
        zapRewards: [],
      };

      customers.value.push(customer);
      await saveToLocal(customer);

      if (offline.isOnline.value) {
        await syncToNostr(customer);
      } else {
        syncPending.value++;
      }
    }

    return customer;
  }

  /**
   * Create a new customer with optional nostrPubkey
   * This allows adding customers without requiring a Nostr public key
   */
  async function createCustomer(data: {
    name?: string;
    email?: string;
    phone?: string;
    nostrPubkey?: string;
    lud16?: string;
    address?: string;
    notes?: string;
    tags?: string[];
    tier?: LoyaltyMember["tier"];
    defaultPaymentTermId?: string;
    creditLimit?: number;
  }): Promise<LoyaltyMember> {
    // If nostrPubkey is provided, check for existing customer
    if (data.nostrPubkey) {
      const existing = customers.value.find(
        (c) => c.nostrPubkey === data.nostrPubkey
      );
      if (existing) {
        // Update existing instead
        const updated = await updateCustomer(existing.id, data);
        return updated || existing;
      }
    }

    // Create new customer
    const { id } = EntityId.customer();
    const customer: LoyaltyMember = {
      id,
      nostrPubkey: data.nostrPubkey || "",
      name: data.name,
      email: data.email,
      phone: data.phone,
      lud16: data.lud16,
      address: data.address,
      notes: data.notes,
      tags: data.tags || [],
      tier: data.tier || "bronze",
      defaultPaymentTermId: data.defaultPaymentTermId,
      creditLimit: data.creditLimit,
      points: 0,
      totalSpent: 0,
      visitCount: 0,
      lastVisit: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
      zapRewards: [],
    };

    customers.value.push(customer);
    await saveToLocal(customer);

    if (offline.isOnline.value) {
      await syncToNostr(customer);
    } else {
      syncPending.value++;
    }

    // Log to centralized audit log
    try {
      const { logActivity } = useAuditLog();
      await logActivity(
        "customer_create",
        `Created customer: ${customer.name || customer.id.slice(-8)}`,
        {
          resourceType: "customer",
          resourceId: customer.id,
          metadata: {
            tier: customer.tier,
            email: customer.email,
          },
        }
      );
    } catch {
      // Don't block customer creation if logging fails
    }

    return customer;
  }

  async function updateCustomer(
    id: string,
    updates: Partial<LoyaltyMember>
  ): Promise<LoyaltyMember | null> {
    const index = customers.value.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = customers.value[index]!;
    const updated: LoyaltyMember = {
      ...existing,
      ...updates,
      id: existing.id,
      // Allow updating nostrPubkey if it's explicitly provided in updates
      nostrPubkey:
        updates.nostrPubkey !== undefined
          ? updates.nostrPubkey
          : existing.nostrPubkey,
      joinedAt: existing.joinedAt,
    };

    customers.value[index] = updated;
    await saveToLocal(updated);

    if (offline.isOnline.value) {
      await syncToNostr(updated);
    }

    // Log to centralized audit log
    try {
      const { logActivity } = useAuditLog();
      await logActivity(
        "customer_update",
        `Updated customer: ${updated.name || updated.id.slice(-8)}`,
        {
          resourceType: "customer",
          resourceId: updated.id,
          metadata: {
            tier: updated.tier,
          },
        }
      );
    } catch {
      // Don't block customer update if logging fails
    }

    return updated;
  }

  function getCustomer(id: string): LoyaltyMember | undefined {
    return customers.value.find((c) => c.id === id);
  }

  function getCustomerByPubkey(pubkey: string): LoyaltyMember | undefined {
    return customers.value.find((c) => c.nostrPubkey === pubkey);
  }

  /**
   * Get customer by ID with fallback to Nostr relay
   * Tries: 1) Memory cache → 2) Local DB → 3) Nostr relay
   * Use this for dynamic pages that need to load on refresh
   */
  async function getCustomerById(id: string): Promise<LoyaltyMember | null> {
    // 1. Try memory cache first (fastest)
    const cached = customers.value.find((c) => c.id === id);
    if (cached) return cached;

    // 2. Try local Dexie DB
    try {
      const record = await db.customers.get(id);
      if (record) {
        const customer: LoyaltyMember = {
          id: record.id,
          nostrPubkey: record.nostrPubkey,
          name: record.name,
          email: record.email,
          phone: record.phone,
          address: record.address,
          notes: record.notes,
          lud16: record.lud16,
          tags: record.tags ? JSON.parse(record.tags) : [],
          points: record.points,
          tier: record.tier as LoyaltyMember["tier"],
          totalSpent: record.totalSpent,
          visitCount: record.visitCount,
          lastVisit: new Date(record.lastVisit).toISOString(),
          joinedAt: new Date(record.joinedAt).toISOString(),
          zapRewards: [],
        };
        // Add to memory cache for future use
        customers.value.push(customer);
        return customer;
      }
    } catch (e) {
      console.error("Failed to load customer from local DB:", e);
    }

    // 3. Fallback to Nostr relay (slowest, but works for shared links)
    // Note: Customers in Nostr are typically stored by pubkey, not local ID
    // This fallback is limited - it mainly relies on local DB
    if (offline.isOnline.value) {
      try {
        // Customers are typically keyed by pubkey in Nostr, not by local ID
        // For now, we can only load from local DB. Full Nostr lookup would
        // require iterating all customers which is expensive.
        console.warn(
          "Customer not found in local DB. Nostr fallback requires pubkey, not ID."
        );
      } catch (e) {
        console.error("Failed to load customer from Nostr:", e);
      }
    }

    return null;
  }

  // ============================================
  // ⭐ LOYALTY POINTS
  // ============================================

  function calculatePointsFromPurchase(
    amountSats?: number,
    amountFiat?: number
  ): number {
    let points = 0;

    if (amountSats) {
      points += Math.floor(amountSats * POINTS_PER_SAT);
    }
    if (amountFiat) {
      points += Math.floor(amountFiat * POINTS_PER_LAK);
    }

    return points;
  }

  function calculateTier(points: number): LoyaltyMember["tier"] {
    if (points >= LOYALTY_TIERS.platinum.minPoints) return "platinum";
    if (points >= LOYALTY_TIERS.gold.minPoints) return "gold";
    if (points >= LOYALTY_TIERS.silver.minPoints) return "silver";
    return "bronze";
  }

  async function addPoints(
    customerId: string,
    points: number,
    _reason: "purchase" | "referral" | "promotion" = "purchase"
  ): Promise<LoyaltyMember | null> {
    const customer = customers.value.find((c) => c.id === customerId);
    if (!customer) return null;

    // Apply tier multiplier
    const tierConfig = LOYALTY_TIERS[customer.tier];
    const earnedPoints = Math.floor(points * tierConfig.zapMultiplier);

    const newPoints = customer.points + earnedPoints;
    const newTier = calculateTier(newPoints);

    return updateCustomer(customerId, {
      points: newPoints,
      tier: newTier,
    });
  }

  async function redeemPoints(
    customerId: string,
    points: number,
    _rewardDescription: string
  ): Promise<{ success: boolean; reward?: ZapReward; error?: string }> {
    const customer = customers.value.find((c) => c.id === customerId);
    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    if (customer.points < points) {
      return { success: false, error: "Insufficient points" };
    }

    const reward: ZapReward = {
      id: generateUUIDv7(),
      memberId: customerId,
      amount: points,
      reason: "loyalty",
      createdAt: new Date().toISOString(),
      claimed: true,
    };

    await updateCustomer(customerId, {
      points: customer.points - points,
      zapRewards: [...(customer.zapRewards || []), reward],
    });

    return { success: true, reward };
  }

  async function recordPurchase(
    customerPubkey: string,
    amountSats: number,
    amountFiat: number,
    _orderId: string
  ): Promise<LoyaltyMember> {
    const customer = await getOrCreateCustomer(customerPubkey);

    const points = calculatePointsFromPurchase(amountSats, amountFiat);
    const tierConfig = LOYALTY_TIERS[customer.tier];
    const earnedPoints = Math.floor(points * tierConfig.zapMultiplier);

    const updated = await updateCustomer(customer.id, {
      points: customer.points + earnedPoints,
      tier: calculateTier(customer.points + earnedPoints),
      totalSpent: customer.totalSpent + amountFiat,
      visitCount: customer.visitCount + 1,
      lastVisit: new Date().toISOString(),
    });

    return updated || customer;
  }

  // ============================================
  // 🔍 SEARCH & FILTER
  // ============================================

  function searchCustomers(query: string): LoyaltyMember[] {
    const q = query.toLowerCase();
    return customers.value.filter(
      (c) =>
        c.nostrPubkey.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }

  function getCustomersByTier(tier: LoyaltyMember["tier"]): LoyaltyMember[] {
    return customers.value.filter((c) => c.tier === tier);
  }

  function getInactiveCustomers(daysSinceLastVisit = 30): LoyaltyMember[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysSinceLastVisit);

    return customers.value.filter((c) => new Date(c.lastVisit) < cutoff);
  }

  // ============================================
  // 📊 ANALYTICS
  // ============================================

  function getCustomerStats(): {
    total: number;
    byTier: Record<string, number>;
    totalPoints: number;
    avgPointsPerCustomer: number;
    activeThisMonth: number;
  } {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const totalPoints = customers.value.reduce((sum, c) => sum + c.points, 0);
    const activeThisMonth = customers.value.filter(
      (c) => new Date(c.lastVisit) >= thisMonth
    ).length;

    return {
      total: customers.value.length,
      byTier: {
        bronze: customersByTier.value.bronze.length,
        silver: customersByTier.value.silver.length,
        gold: customersByTier.value.gold.length,
        platinum: customersByTier.value.platinum.length,
      },
      totalPoints,
      avgPointsPerCustomer:
        customers.value.length > 0
          ? Math.floor(totalPoints / customers.value.length)
          : 0,
      activeThisMonth,
    };
  }

  function getTopSpenders(limit = 10): Array<{
    customer: LoyaltyMember;
    totalSpent: number;
    visitCount: number;
  }> {
    return [...customers.value]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit)
      .map((c) => ({
        customer: c,
        totalSpent: c.totalSpent,
        visitCount: c.visitCount,
      }));
  }

  // ============================================
  // 📤 EXPORT
  // ============================================

  async function exportCustomers(): Promise<string> {
    return JSON.stringify(
      {
        customers: customers.value,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  /**
   * Download import template as CSV
   */
  function downloadImportTemplate(): void {
    const headers = [
      "name",
      "email",
      "phone",
      "address",
      "notes",
      "tier",
      "tags",
    ];
    const exampleRow = [
      "John Doe",
      "john@example.com",
      "+856 20 1234 5678",
      "123 Main St, Vientiane",
      "VIP customer",
      "bronze",
      "vip,regular",
    ];

    const csvContent = [headers.join(","), exampleRow.join(",")].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customer_import_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import customers from CSV content
   */
  async function importCustomers(
    csvContent: string
  ): Promise<{ success: number; errors: string[] }> {
    const lines = csvContent.trim().split("\n");
    if (lines.length < 2) {
      return { success: 0, errors: ["File is empty or has no data rows"] };
    }

    const headers = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
    const errors: string[] = [];
    let success = 0;

    // Validate required headers
    const requiredHeaders = ["name"];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return {
        success: 0,
        errors: [`Missing required columns: ${missingHeaders.join(", ")}`],
      };
    }

    // Parse and import each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!line) continue;

      try {
        // Handle CSV parsing with quoted values
        const values = parseCSVLine(line);

        const rowData: Record<string, string> = {};
        headers.forEach((header, idx) => {
          rowData[header] = values[idx]?.trim() || "";
        });

        // Skip rows without name
        if (!rowData.name) {
          errors.push(`Row ${i + 1}: Name is required`);
          continue;
        }

        // Parse tags (comma-separated within the field)
        const tags = rowData.tags
          ? rowData.tags.split(";").map((t) => t.trim())
          : [];

        // Validate tier
        const validTiers = ["bronze", "silver", "gold", "platinum"];
        const tier = validTiers.includes(rowData.tier?.toLowerCase() || "")
          ? (rowData.tier?.toLowerCase() as
              | "bronze"
              | "silver"
              | "gold"
              | "platinum")
          : "bronze";

        await createCustomer({
          name: rowData.name,
          email: rowData.email || undefined,
          phone: rowData.phone || undefined,
          address: rowData.address || undefined,
          notes: rowData.notes || undefined,
          tier,
          tags,
        });

        success++;
      } catch (e) {
        errors.push(`Row ${i + 1}: ${String(e)}`);
      }
    }

    return { success, errors };
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  }

  // ============================================
  // 🔄 SYNC PENDING DATA
  // ============================================

  async function syncPendingData(): Promise<{
    synced: number;
    failed: number;
  }> {
    let synced = 0;
    let failed = 0;

    if (!offline.isOnline.value) {
      return { synced, failed };
    }

    try {
      // Sync unsynced customers
      const unsyncedCustomers = await db.customers
        .filter((c) => !c.synced)
        .toArray();

      for (const customerRecord of unsyncedCustomers) {
        try {
          const customer: LoyaltyMember = {
            id: customerRecord.id,
            nostrPubkey: customerRecord.nostrPubkey,
            name: customerRecord.name,
            email: customerRecord.email,
            phone: customerRecord.phone,
            address: customerRecord.address,
            notes: customerRecord.notes,
            lud16: customerRecord.lud16,
            tags: customerRecord.tags ? JSON.parse(customerRecord.tags) : [],
            points: customerRecord.points,
            tier: customerRecord.tier as LoyaltyMember["tier"],
            totalSpent: customerRecord.totalSpent,
            visitCount: customerRecord.visitCount,
            lastVisit: new Date(customerRecord.lastVisit).toISOString(),
            joinedAt: new Date(customerRecord.joinedAt).toISOString(),
            zapRewards: [],
          };

          const success = await syncToNostr(customer);
          if (success) {
            synced++;
          } else {
            failed++;
          }
        } catch (e) {
          console.error(`Failed to sync customer ${customerRecord.id}:`, e);
          failed++;
        }
      }

      syncPending.value = failed;
    } catch (e) {
      console.error("Failed to sync pending customers:", e);
      error.value = `Sync failed: ${e}`;
    }

    return { synced, failed };
  }

  return {
    // State
    customers,
    isLoading,
    error,
    isInitialized,
    syncPending,

    // Computed
    totalCustomers,
    customersByTier,
    topCustomers,
    recentCustomers,

    // Config
    LOYALTY_TIERS,

    // Init
    init,

    // CRUD
    createCustomer,
    getOrCreateCustomer,
    updateCustomer,
    getCustomer,
    getCustomerById,
    getCustomerByPubkey,

    // Loyalty
    calculatePointsFromPurchase,
    calculateTier,
    addPoints,
    redeemPoints,
    recordPurchase,

    // Search
    searchCustomers,
    getCustomersByTier,
    getInactiveCustomers,

    // Analytics
    getCustomerStats,
    getTopSpenders,

    // Sync
    loadFromNostr,
    syncPendingData,

    // Export/Import
    exportCustomers,
    importCustomers,
    downloadImportTemplate,
  };
}
