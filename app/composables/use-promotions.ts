// ============================================
// 🎁 PROMOTIONS COMPOSABLE
// BOGO, Discounts, Bundles Management
// ============================================

import type {
  Promotion,
  PromotionType,
  PromotionStatus,
  PromotionScope,
  DiscountType,
  Product,
  PromotionUsage,
} from "~/types";
import { db, type PromotionRecord } from "~/db/db";
import { generateUUIDv7 } from "~/utils/id";

// Singleton state
const promotions = ref<Promotion[]>([]);
const promotionUsages = ref<PromotionUsage[]>([]); // NEW: Usage log
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);

/**
 * 🎁 PROMOTIONS STORE
 * Promotion CRUD with BOGO logic
 */
export function usePromotionsStore() {
  const toast = useToast();
  const { t } = useI18n();
  const nostrData = useNostrData();
  const offline = useOffline();
  const company = useCompany();

  // ============================================
  // 📊 COMPUTED
  // ============================================

  // Active promotions (status = active AND within date range)
  const activePromotions = computed(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0]!; // Non-null assertion for date string
    const currentDay = now.getDay(); // 0-6

    return promotions.value.filter((p) => {
      // Check status
      if (p.status !== "active") return false;

      // Check date range
      if (p.startDate && today < p.startDate) return false;
      if (p.endDate && today > p.endDate) return false;

      // Check day of week
      if (p.daysOfWeek && p.daysOfWeek.length > 0) {
        if (!p.daysOfWeek.includes(currentDay)) return false;
      }

      // Check usage limit
      if (p.maxUsesTotal && p.usageCount >= p.maxUsesTotal) return false;

      return true;
    });
  });

  // BOGO promotions only
  const bogoPromotions = computed(() =>
    activePromotions.value.filter((p) => p.type === "bogo")
  );

  // Discount promotions (percentage or fixed)
  const discountPromotions = computed(() =>
    activePromotions.value.filter((p) => p.type === "discount")
  );

  // Tiered promotions
  const tieredPromotions = computed(() =>
    activePromotions.value.filter((p) => p.type === "tiered")
  );

  // Bundle promotions
  const bundlePromotions = computed(() =>
    activePromotions.value.filter((p) => p.type === "bundle")
  );

  // ============================================
  // 🗄️ LOCAL STORAGE (Dexie)
  // ============================================

  async function loadPromotionsFromLocal(): Promise<Promotion[]> {
    try {
      if (!db.promotions) {
        console.warn("Promotions table not initialized in Dexie");
        return [];
      }
      const records = await db.promotions.toArray();
      return records.map((r: PromotionRecord) => ({
        ...r,
        // Parse JSON array fields
        triggerProductIds: r.triggerProductIds
          ? JSON.parse(r.triggerProductIds)
          : [],
        triggerCategoryIds: r.triggerCategoryIds
          ? JSON.parse(r.triggerCategoryIds)
          : undefined,
        rewardProductIds: r.rewardProductIds
          ? JSON.parse(r.rewardProductIds)
          : [],
        daysOfWeek: r.daysOfWeek ? JSON.parse(r.daysOfWeek) : undefined,
        tiers: r.tiers ? JSON.parse(r.tiers) : undefined,
        customerTiers: r.customerTiers
          ? JSON.parse(r.customerTiers)
          : undefined,
        excludePromotionIds: r.excludePromotionIds
          ? JSON.parse(r.excludePromotionIds)
          : undefined,
        // Cast string types
        type: r.type as PromotionType,
        status: r.status as PromotionStatus,
        scope: (r.scope || "all") as PromotionScope,
        discountType: r.discountType as DiscountType | undefined,
        rewardType: r.rewardType as
          | "free_product"
          | "discount"
          | "percentage_off",
      })) as Promotion[];
    } catch (e) {
      console.error("Failed to load promotions:", e);
      return [];
    }
  }

  async function savePromotionToLocal(promotion: Promotion): Promise<void> {
    if (!promotion.id) return;
    if (!db.promotions) {
      console.warn("Promotions table not initialized");
      return;
    }
    const record: PromotionRecord = {
      ...promotion,
      // Stringify JSON array fields
      triggerProductIds: JSON.stringify(promotion.triggerProductIds),
      triggerCategoryIds: promotion.triggerCategoryIds
        ? JSON.stringify(promotion.triggerCategoryIds)
        : undefined,
      rewardProductIds: JSON.stringify(promotion.rewardProductIds),
      daysOfWeek: promotion.daysOfWeek
        ? JSON.stringify(promotion.daysOfWeek)
        : undefined,
      tiers: promotion.tiers ? JSON.stringify(promotion.tiers) : undefined,
      customerTiers: promotion.customerTiers
        ? JSON.stringify(promotion.customerTiers)
        : undefined,
      excludePromotionIds: promotion.excludePromotionIds
        ? JSON.stringify(promotion.excludePromotionIds)
        : undefined,
      synced: false,
    };
    await db.promotions.put(record);
  }

  // ============================================
  // 📡 NOSTR SYNC
  // ============================================

  async function syncPromotionToNostr(promotion: Promotion): Promise<boolean> {
    try {
      const { NOSTR_KINDS } = await import("~/types/nostr-kinds");
      
      // Sync promotion with company code tag for team visibility
      const tags: string[][] = [
        ["d", promotion.id],
        ["type", promotion.type],
        ["status", promotion.status],
        ["name", promotion.name],
      ];

      // Add company code hash tag for team sync
      if (company.companyCodeHash.value) {
        tags.push(["c", company.companyCodeHash.value]);
      }

      const event = await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.PROMOTION,
        promotion,
        promotion.id,
        tags,
        true // Encrypt promotion data
      );

      if (event && db.promotions) {
        await db.promotions.update(promotion.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("[Promotions] Failed to sync to Nostr:", e);
      return false;
    }
  }

  async function loadPromotionsFromNostr(): Promise<Promotion[]> {
    try {
      const { NOSTR_KINDS } = await import("~/types/nostr-kinds");
      const results = await nostrData.getAllEventsOfKind<Promotion>(
        NOSTR_KINDS.PROMOTION
      );

      const promotions: Promotion[] = [];
      for (const result of results) {
        const promo = result.data as Promotion;
        // Skip deleted promotions
        if ((promo as any).deleted) continue;
        promotions.push(promo);
      }

      return promotions;
    } catch (e) {
      console.error("[Promotions] Failed to load from Nostr:", e);
      return [];
    }
  }

  async function syncAllToNostr(): Promise<{ synced: number; failed: number }> {
    if (!offline.isOnline.value) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    if (!db.promotions) return { synced, failed };

    const unsyncedPromotions = await db.promotions
      .filter((p) => !p.synced)
      .toArray();

    for (const record of unsyncedPromotions) {
      // Parse back the promotion
      const promotion: Promotion = {
        id: record.id,
        name: record.name,
        description: record.description,
        type: record.type as PromotionType,
        status: record.status as PromotionStatus,
        scope: (record.scope || "all") as PromotionScope,
        triggerProductIds: JSON.parse(record.triggerProductIds),
        triggerCategoryIds: record.triggerCategoryIds
          ? JSON.parse(record.triggerCategoryIds)
          : undefined,
        triggerQuantity: record.triggerQuantity,
        rewardProductIds: JSON.parse(record.rewardProductIds),
        rewardQuantity: record.rewardQuantity,
        rewardType: record.rewardType as "free_product" | "discount" | "percentage_off",
        rewardDiscount: record.rewardDiscount,
        discountType: record.discountType as DiscountType | undefined,
        discountValue: record.discountValue,
        priority: record.priority,
        startDate: record.startDate,
        endDate: record.endDate,
        daysOfWeek: record.daysOfWeek ? JSON.parse(record.daysOfWeek) : undefined,
        tiers: record.tiers ? JSON.parse(record.tiers) : undefined,
        maxUsesTotal: record.maxUsesTotal,
        maxUsesPerCustomer: record.maxUsesPerCustomer,
        maxUsesPerOrder: record.maxUsesPerOrder,
        usageCount: record.usageCount,
        customerTiers: record.customerTiers ? JSON.parse(record.customerTiers) : undefined,
        excludePromotionIds: record.excludePromotionIds
          ? JSON.parse(record.excludePromotionIds)
          : undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };

      if (await syncPromotionToNostr(promotion)) {
        synced++;
      } else {
        failed++;
      }
    }

    return { synced, failed };
  }

  // ============================================
  // 🔄 INITIALIZATION
  // ============================================

  async function init(): Promise<void> {
    if (isInitialized.value) return;
    isLoading.value = true;
    error.value = null;

    try {
      // Load from local first
      promotions.value = await loadPromotionsFromLocal();

      // Try to sync from Nostr if online
      if (offline.isOnline.value) {
        try {
          const nostrPromotions = await loadPromotionsFromNostr();
          
          // Merge with local data (Nostr is source of truth)
          for (const nostrPromo of nostrPromotions) {
            const existingIndex = promotions.value.findIndex(p => p.id === nostrPromo.id);
            if (existingIndex >= 0) {
              promotions.value[existingIndex] = nostrPromo;
            } else {
              promotions.value.push(nostrPromo);
            }
            // Save to local
            await savePromotionToLocal(nostrPromo);
          }
        } catch (e) {
          console.warn("[Promotions] Failed to load from Nostr, using local only:", e);
        }
      }

      isInitialized.value = true;
    } catch (e) {
      error.value = `Failed to initialize promotions: ${e}`;
      console.error(error.value);
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 📝 CRUD OPERATIONS
  // ============================================

  async function addPromotion(
    data: Omit<Promotion, "id" | "usageCount" | "createdAt" | "updatedAt">
  ): Promise<Promotion> {
    const now = new Date().toISOString();
    const promotion: Promotion = {
      ...data,
      id: generateUUIDv7(),
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    promotions.value.push(promotion);
    await savePromotionToLocal(promotion);

    // Sync to Nostr if online
    if (offline.isOnline.value) {
      await syncPromotionToNostr(promotion);
    }

    toast.add({
      title: t("promotions.createSuccess", "Promotion created"),
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    return promotion;
  }

  async function updatePromotion(
    id: string,
    updates: Partial<Promotion>
  ): Promise<Promotion | null> {
    const index = promotions.value.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = promotions.value[index]!;
    const updated: Promotion = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    promotions.value[index] = updated;
    await savePromotionToLocal(updated);

    // Sync to Nostr if online
    if (offline.isOnline.value) {
      await syncPromotionToNostr(updated);
    }

    toast.add({
      title: t("promotions.updateSuccess", "Promotion updated"),
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    return updated;
  }

  async function deletePromotion(id: string): Promise<boolean> {
    const index = promotions.value.findIndex((p) => p.id === id);
    if (index === -1) return false;

    promotions.value.splice(index, 1);
    if (db.promotions) {
      await db.promotions.delete(id);
    }

    // Mark as deleted on Nostr (soft delete)
    if (offline.isOnline.value) {
      try {
        const { NOSTR_KINDS } = await import("~/types/nostr-kinds");
        await nostrData.publishReplaceableEvent(
          NOSTR_KINDS.PROMOTION,
          { deleted: true, deletedAt: new Date().toISOString() },
          id,
          [["deleted", "true"]],
          true
        );
      } catch (e) {
        console.error("[Promotions] Failed to mark as deleted on Nostr:", e);
      }
    }

    toast.add({
      title: t("promotions.deleteSuccess", "Promotion deleted"),
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    return true;
  }

  // ============================================
  // 🔍 GETTERS
  // ============================================

  function getPromotion(id: string): Promotion | undefined {
    return promotions.value.find((p) => p.id === id);
  }

  function getPromotionsForProduct(productId: string): Promotion[] {
    return activePromotions.value.filter((p) =>
      p.triggerProductIds.includes(productId)
    );
  }

  function getPromotionsForCategory(categoryId: string): Promotion[] {
    return activePromotions.value.filter((p) =>
      p.triggerCategoryIds?.includes(categoryId)
    );
  }

  // ============================================
  // 🎁 BOGO LOGIC
  // ============================================

  interface CartItem {
    id: string;
    product: Product;
    quantity: number;
    price: number;
    isFreeItem?: boolean;
    promotionId?: string;
  }

  /**
   * Check which promotions apply to the current cart
   */
  function checkPromotions(
    cartItems: CartItem[]
  ): { promotion: Promotion; timesApplicable: number }[] {
    const applicablePromotions: {
      promotion: Promotion;
      timesApplicable: number;
    }[] = [];

    for (const promotion of activePromotions.value) {
      if (promotion.type !== "bogo") continue;

      // Count trigger products in cart
      let triggerCount = 0;
      for (const item of cartItems) {
        if (item.isFreeItem) continue; // Don't count free items
        if (promotion.triggerProductIds.includes(item.product.id)) {
          triggerCount += item.quantity;
        }
      }

      // Calculate how many times this promotion can be applied
      const timesApplicable = Math.floor(
        triggerCount / promotion.triggerQuantity
      );

      if (timesApplicable > 0) {
        // Respect maxUsesPerOrder limit
        const maxAllowed = promotion.maxUsesPerOrder || Infinity;
        applicablePromotions.push({
          promotion,
          timesApplicable: Math.min(timesApplicable, maxAllowed),
        });
      }
    }

    // Sort by priority (higher first)
    return applicablePromotions.sort(
      (a, b) => b.promotion.priority - a.promotion.priority
    );
  }

  /**
   * Apply BOGO promotion and return free items to add
   */
  function applyBOGO(
    promotion: Promotion,
    times: number,
    products: Product[]
  ): {
    freeProducts: { product: Product; quantity: number }[];
    discountAmount: number;
  } {
    const freeProducts: { product: Product; quantity: number }[] = [];
    let discountAmount = 0;

    if (promotion.rewardType === "free_product") {
      // Find reward products
      const rewardProductIds = promotion.rewardProductIds;
      const qty = promotion.rewardQuantity * times;

      for (const productId of rewardProductIds) {
        const product = products.find((p) => p.id === productId);
        if (product) {
          freeProducts.push({ product, quantity: qty });
          discountAmount += product.price * qty;
        }
      }
    } else if (promotion.rewardType === "discount") {
      discountAmount = (promotion.rewardDiscount || 0) * times;
    } else if (promotion.rewardType === "percentage_off") {
      // Percentage would be calculated on the trigger items' total
      // This is handled elsewhere
    }

    return { freeProducts, discountAmount };
  }

  /**
   * Increment usage count for a promotion
   */
  async function incrementUsage(
    promotionId: string,
    count: number = 1
  ): Promise<void> {
    const promotion = getPromotion(promotionId);
    if (!promotion) return;

    await updatePromotion(promotionId, {
      usageCount: promotion.usageCount + count,
    });
  }

  /**
   * 📝 Log promotion usage with Nostr sync
   * Records promotion usage and syncs to Nostr relay
   */
  async function logPromotionUsage(
    promotionId: string,
    orderId: string,
    discountAmount: number,
    timesApplied: number = 1,
    options?: {
      customerId?: string;
      customerPubkey?: string;
      branch?: string;
    }
  ): Promise<void> {
    const promotion = getPromotion(promotionId);
    if (!promotion) {
      console.warn(`[Promotions] Cannot log usage - promotion not found: ${promotionId}`);
      return;
    }

    try {
      // Create usage log entry
      const usage: PromotionUsage = {
        id: generateUUIDv7(),
        promotionId,
        promotionName: promotion.name,
        orderId,
        customerId: options?.customerId,
        customerPubkey: options?.customerPubkey,
        usedAt: new Date().toISOString(),
        discountAmount,
        timesApplied,
        branch: options?.branch,
      };

      // Add to local state
      promotionUsages.value.push(usage);

      // Increment usage count
      await incrementUsage(promotionId, timesApplied);

      // Sync usage log to Nostr
      if (offline.isOnline.value) {
        await syncPromotionUsageToNostr(usage);
      }

      console.log(`[Promotions] Logged usage for "${promotion.name}" in order ${orderId.slice(-8)}`);
    } catch (e) {
      console.error("[Promotions] Failed to log usage:", e);
    }
  }

  /**
   * 📡 Sync promotion usage log to Nostr
   */
  async function syncPromotionUsageToNostr(usage: PromotionUsage): Promise<boolean> {
    try {
      const { NOSTR_KINDS } = await import("~/types/nostr-kinds");
      
      const event = await nostrData.publishEvent(
        NOSTR_KINDS.PROMOTION_USAGE || 30314, // New kind for promotion usage logs
        usage,
        [
          ["d", usage.id],
          ["promotion_id", usage.promotionId],
          ["order_id", usage.orderId],
          ["company", company.companyCodeHash.value || ""],
        ]
      );

      return !!event;
    } catch (e) {
      console.error("[Promotions] Failed to sync usage to Nostr:", e);
      return false;
    }
  }

  /**
   * 📊 Get promotion usage statistics
   */
  const promotionUsageStats = computed(() => {
    const stats: Record<string, { count: number; totalDiscount: number; lastUsed: string }> = {};
    
    for (const usage of promotionUsages.value) {
      if (!stats[usage.promotionId]) {
        stats[usage.promotionId] = { 
          count: 0, 
          totalDiscount: 0,
          lastUsed: usage.usedAt
        };
      }
      const stat = stats[usage.promotionId];
      if (stat) {
        stat.count += usage.timesApplied;
        stat.totalDiscount += usage.discountAmount;
        // Update last used if this usage is more recent
        if (usage.usedAt > stat.lastUsed) {
          stat.lastUsed = usage.usedAt;
        }
      }
    }
    
    return stats;
  });

  /**
   * Get usage logs for a specific promotion
   */
  function getPromotionUsageHistory(promotionId: string): PromotionUsage[] {
    return promotionUsages.value.filter(u => u.promotionId === promotionId);
  }

  /**
   * Get usage logs for a specific customer
   */
  function getCustomerPromotionUsage(customerId: string): PromotionUsage[] {
    return promotionUsages.value.filter(u => u.customerId === customerId);
  }

  /**
   * Calculate discount for a promotion based on its type
   * @param promotion - The promotion to apply
   * @param itemTotal - Total price of applicable items
   * @param quantity - Total quantity of applicable items
   */
  function calculateDiscount(
    promotion: Promotion,
    itemTotal: number,
    quantity: number
  ): { discountAmount: number; discountDescription: string } {
    let discountAmount = 0;
    let discountDescription = "";

    switch (promotion.type) {
      case "discount":
        if (
          promotion.discountType === "percentage" &&
          promotion.discountValue
        ) {
          discountAmount = (itemTotal * promotion.discountValue) / 100;
          discountDescription = `${promotion.discountValue}% off`;
        } else if (
          promotion.discountType === "fixed" &&
          promotion.discountValue
        ) {
          discountAmount = Math.min(promotion.discountValue, itemTotal);
          discountDescription = `฿${promotion.discountValue} off`;
        }
        break;

      case "tiered":
        if (promotion.tiers && promotion.tiers.length > 0) {
          // Find the best applicable tier (highest quantity threshold met)
          const applicableTiers = promotion.tiers
            .filter((tier) => quantity >= tier.minQuantity)
            .sort((a, b) => b.minQuantity - a.minQuantity);

          if (applicableTiers.length > 0) {
            const tier = applicableTiers[0]!;
            if (tier.discountType === "percentage") {
              discountAmount = (itemTotal * tier.discountValue) / 100;
              discountDescription = `Buy ${tier.minQuantity}+ get ${tier.discountValue}% off`;
            } else {
              discountAmount = Math.min(tier.discountValue, itemTotal);
              discountDescription = `Buy ${tier.minQuantity}+ get ฿${tier.discountValue} off`;
            }
          }
        }
        break;

      case "bogo":
        // BOGO is handled by applyBOGO function
        break;

      default:
        break;
    }

    return { discountAmount, discountDescription };
  }

  // ============================================
  // 📤 EXPORT
  // ============================================

  return {
    // State
    promotions: readonly(promotions),
    promotionUsages: readonly(promotionUsages),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isInitialized: readonly(isInitialized),

    // Computed
    activePromotions,
    bogoPromotions,
    discountPromotions,
    tieredPromotions,
    bundlePromotions,
    promotionUsageStats,

    // Methods
    init,
    addPromotion,
    updatePromotion,
    deletePromotion,
    getPromotion,
    getPromotionsForProduct,
    getPromotionsForCategory,

    // Promotion Logic
    checkPromotions,
    applyBOGO,
    calculateDiscount,
    incrementUsage,
    logPromotionUsage,
    getPromotionUsageHistory,
    getCustomerPromotionUsage,

    // Nostr Sync
    syncPromotionToNostr,
    loadPromotionsFromNostr,
    syncAllToNostr,
    syncPromotionUsageToNostr,
  };
}
