// composables/use-cycle-count.ts
// Enterprise Cycle Counting for Physical Inventory
// Scheduled counts, variance reporting, and reconciliation

import { db, type CycleCountRecord } from "~/db/db";

// ============================================
// 📋 TYPES
// ============================================

export interface CycleCountItem {
  productId: string;
  productName: string;
  sku: string;
  expectedQty: number;
  countedQty?: number;
  varianceQty?: number;
  varianceValue?: number;
  costPrice: number;
  notes?: string;
  countedAt?: number;
}

export interface CycleCount {
  id: string;
  name: string;
  branchId: string;
  branchName?: string;
  status: CycleCountRecord["status"];
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  items: CycleCountItem[];
  totalItems: number;
  countedItems: number;
  varianceCount: number;
  varianceValue: number;
  createdBy: string; // npub or user identifier
  countedBy?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

// ============================================
// 📦 STATE
// ============================================

const cycleCounts = ref<CycleCount[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);

// ============================================
// 🔧 COMPOSABLE
// ============================================

export function useCycleCount() {
  // Generate unique ID
  const generateId = (): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `CC-${timestamp}-${random}`.toUpperCase();
  };

  // ============================================
  // 📥 LOAD DATA
  // ============================================

  const loadCycleCounts = async (): Promise<void> => {
    try {
      isLoading.value = true;
      const records = await db.cycleCounts.toArray();

      cycleCounts.value = records.map((record) => ({
        id: record.id,
        name: record.name,
        branchId: record.branchId,
        status: record.status,
        scheduledDate: new Date(record.scheduledDate).toISOString(),
        startedAt: record.startedAt
          ? new Date(record.startedAt).toISOString()
          : undefined,
        completedAt: record.completedAt
          ? new Date(record.completedAt).toISOString()
          : undefined,
        items: JSON.parse(record.itemsJson || "[]"),
        totalItems: record.totalItems,
        countedItems: record.countedItems,
        varianceCount: record.varianceCount,
        varianceValue: record.varianceValue,
        createdBy: record.createdBy,
        countedBy: record.countedBy,
        approvedBy: record.approvedBy,
        notes: record.notes,
        createdAt: new Date(record.createdAt).toISOString(),
        updatedAt: new Date(record.updatedAt).toISOString(),
        synced: record.synced,
      }));
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load cycle counts";
      console.error("Failed to load cycle counts:", err);
    } finally {
      isLoading.value = false;
    }
  };

  // ============================================
  // ➕ CREATE CYCLE COUNT
  // ============================================

  const createCycleCount = async (data: {
    name: string;
    branchId: string;
    scheduledDate: string;
    items: Array<{
      productId: string;
      productName: string;
      sku: string;
      expectedQty: number;
      costPrice: number;
    }>;
    notes?: string;
    createdBy: string;
  }): Promise<CycleCount | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const id = generateId();
      const now = Date.now();

      const record: CycleCountRecord = {
        id,
        name: data.name,
        branchId: data.branchId,
        status: "draft",
        scheduledDate: new Date(data.scheduledDate).getTime(),
        itemsJson: JSON.stringify(data.items),
        totalItems: data.items.length,
        countedItems: 0,
        varianceCount: 0,
        varianceValue: 0,
        createdBy: data.createdBy,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
        synced: false,
      };

      await db.cycleCounts.add(record);

      const cycleCount: CycleCount = {
        ...record,
        scheduledDate: new Date(record.scheduledDate).toISOString(),
        items: data.items,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      };

      cycleCounts.value.unshift(cycleCount);
      return cycleCount;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create cycle count";
      console.error("Failed to create cycle count:", err);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  // ============================================
  // ▶️ START COUNTING
  // ============================================

  const startCounting = async (
    id: string,
    countedBy: string
  ): Promise<boolean> => {
    try {
      isLoading.value = true;
      const now = Date.now();

      await db.cycleCounts.update(id, {
        status: "in_progress",
        startedAt: now,
        countedBy,
        updatedAt: now,
        synced: false,
      });

      const index = cycleCounts.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        cycleCounts.value[index] = {
          ...cycleCounts.value[index],
          status: "in_progress",
          startedAt: new Date(now).toISOString(),
          countedBy,
          updatedAt: new Date(now).toISOString(),
          synced: false,
        };
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to start counting";
      console.error("Failed to start counting:", err);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // ============================================
  // 📝 UPDATE COUNT
  // ============================================

  const updateItemCount = async (
    cycleCountId: string,
    productId: string,
    countedQty: number,
    notes?: string
  ): Promise<boolean> => {
    try {
      const record = await db.cycleCounts.get(cycleCountId);
      if (!record) {
        error.value = "Cycle count not found";
        return false;
      }

      const items: CycleCountItem[] = JSON.parse(record.itemsJson || "[]");
      const itemIndex = items.findIndex((i) => i.productId === productId);

      if (itemIndex === -1) {
        error.value = "Product not found in count";
        return false;
      }

      // Update item
      const item = items[itemIndex];
      item.countedQty = countedQty;
      item.varianceQty = countedQty - item.expectedQty;
      item.varianceValue = item.varianceQty * item.costPrice;
      item.countedAt = Date.now();
      if (notes) item.notes = notes;

      // Calculate totals
      const countedItems = items.filter((i) => i.countedQty !== undefined).length;
      const varianceCount = items.filter(
        (i) => i.varianceQty !== undefined && i.varianceQty !== 0
      ).length;
      const varianceValue = items.reduce(
        (sum, i) => sum + (i.varianceValue || 0),
        0
      );

      const now = Date.now();
      await db.cycleCounts.update(cycleCountId, {
        itemsJson: JSON.stringify(items),
        countedItems,
        varianceCount,
        varianceValue,
        updatedAt: now,
        synced: false,
      });

      // Update local state
      const index = cycleCounts.value.findIndex((c) => c.id === cycleCountId);
      if (index !== -1) {
        cycleCounts.value[index] = {
          ...cycleCounts.value[index],
          items,
          countedItems,
          varianceCount,
          varianceValue,
          updatedAt: new Date(now).toISOString(),
          synced: false,
        };
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update count";
      console.error("Failed to update item count:", err);
      return false;
    }
  };

  // ============================================
  // ✅ COMPLETE & APPROVE
  // ============================================

  const submitForReview = async (id: string): Promise<boolean> => {
    try {
      isLoading.value = true;
      const now = Date.now();

      await db.cycleCounts.update(id, {
        status: "pending_review",
        updatedAt: now,
        synced: false,
      });

      const index = cycleCounts.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        cycleCounts.value[index].status = "pending_review";
        cycleCounts.value[index].updatedAt = new Date(now).toISOString();
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to submit";
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const approveCount = async (
    id: string,
    approvedBy: string,
    applyAdjustments = true
  ): Promise<boolean> => {
    try {
      isLoading.value = true;
      const record = await db.cycleCounts.get(id);
      if (!record) {
        error.value = "Cycle count not found";
        return false;
      }

      const now = Date.now();

      // Apply stock adjustments if requested
      if (applyAdjustments) {
        const items: CycleCountItem[] = JSON.parse(record.itemsJson || "[]");
        const inventory = useInventory();

        for (const item of items) {
          if (item.varianceQty && item.varianceQty !== 0) {
            await inventory.adjustStock(
              item.productId,
              record.branchId,
              item.varianceQty,
              "count",
              `Cycle count adjustment: ${record.name}`
            );
          }
        }
      }

      await db.cycleCounts.update(id, {
        status: "completed",
        completedAt: now,
        approvedBy,
        updatedAt: now,
        synced: false,
      });

      const index = cycleCounts.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        cycleCounts.value[index] = {
          ...cycleCounts.value[index],
          status: "completed",
          completedAt: new Date(now).toISOString(),
          approvedBy,
          updatedAt: new Date(now).toISOString(),
        };
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to approve";
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const cancelCount = async (id: string): Promise<boolean> => {
    try {
      const now = Date.now();
      await db.cycleCounts.update(id, {
        status: "cancelled",
        updatedAt: now,
        synced: false,
      });

      const index = cycleCounts.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        cycleCounts.value[index].status = "cancelled";
        cycleCounts.value[index].updatedAt = new Date(now).toISOString();
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to cancel";
      return false;
    }
  };

  // ============================================
  // 🔍 GETTERS
  // ============================================

  const getCycleCount = (id: string): CycleCount | undefined => {
    return cycleCounts.value.find((c) => c.id === id);
  };

  const getCycleCountsByStatus = (
    status: CycleCountRecord["status"]
  ): CycleCount[] => {
    return cycleCounts.value.filter((c) => c.status === status);
  };

  const getPendingCounts = computed(() =>
    cycleCounts.value.filter((c) =>
      ["draft", "in_progress", "pending_review"].includes(c.status)
    )
  );

  const getCompletedCounts = computed(() =>
    cycleCounts.value.filter((c) => c.status === "completed")
  );

  // ============================================
  // 🔄 INIT
  // ============================================

  const init = async (): Promise<void> => {
    if (isInitialized.value) return;
    await loadCycleCounts();
    isInitialized.value = true;
  };

  return {
    // State
    cycleCounts,
    isLoading,
    error,
    isInitialized,

    // Actions
    init,
    loadCycleCounts,
    createCycleCount,
    startCounting,
    updateItemCount,
    submitForReview,
    approveCount,
    cancelCount,

    // Getters
    getCycleCount,
    getCycleCountsByStatus,
    pendingCounts: getPendingCounts,
    completedCounts: getCompletedCounts,
  };
}
