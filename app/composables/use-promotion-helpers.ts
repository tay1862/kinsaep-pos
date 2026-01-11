// ============================================
// 🎁 PROMOTION HELPERS COMPOSABLE
// Helper functions for promotion display and utilities
// ============================================

import type { Promotion } from "~/types";

export function usePromotionHelpers() {
  const { t } = useI18n();
  const productsStore = useProducts();

  // Memoized product lookup map for performance
  const productMap = computed(() => {
    const map = new Map<string, string>();
    for (const product of productsStore.products.value) {
      map.set(product.id, product.name);
    }
    return map;
  });

  // Get product name by ID with fallback
  function getProductName(id: string): string {
    return productMap.value.get(id) || t("common.unknown", "Unknown");
  }

  // Get multiple product names
  function getProductNames(ids: string[]): string[] {
    return ids.map(id => getProductName(id));
  }

  // Format trigger text for display
  function formatTriggerText(promotion: Promotion): string {
    const triggerProductName = getProductName(promotion.triggerProductIds[0] || "");
    const additionalCount = promotion.triggerProductIds.length - 1;
    
    const baseText = `Buy ${promotion.triggerQuantity}× ${triggerProductName}`;
    
    if (additionalCount > 0) {
      return `${baseText} +${additionalCount} more`;
    }
    
    return baseText;
  }

  // Format reward text for display
  function formatRewardText(promotion: Promotion): string {
    const rewardProductName = getProductName(promotion.rewardProductIds[0] || "");
    const additionalCount = promotion.rewardProductIds.length - 1;
    
    const baseText = `Get ${promotion.rewardQuantity}× ${rewardProductName}`;
    
    if (additionalCount > 0) {
      return `${baseText} +${additionalCount} more`;
    }
    
    return baseText;
  }

  // Get status badge color
  function getStatusColor(status: Promotion["status"]): "green" | "gray" | "yellow" | "red" {
    switch (status) {
      case "active":
        return "green";
      case "inactive":
        return "gray";
      case "scheduled":
        return "yellow";
      case "expired":
        return "red";
      default:
        return "gray";
    }
  }

  // Get status text with i18n support
  function getStatusText(status: Promotion["status"]): string {
    return t(`promotions.status.${status}`, status);
  }

  // Check if promotion is active (for quick boolean check)
  function isActive(promotion: Promotion): boolean {
    return promotion.status === "active";
  }

  // Calculate total usage count across all promotions
  function getTotalUsageCount(promotions: Promotion[]): number {
    return promotions.reduce((total, promotion) => total + promotion.usageCount, 0);
  }

  // Get promotion type display text
  function getPromotionTypeText(type: Promotion["type"]): string {
    return t(`promotions.type.${type}`, type.toUpperCase());
  }

  // Check if promotion has time constraints
  function hasTimeConstraints(promotion: Promotion): boolean {
    return !!(promotion.startDate || promotion.endDate || promotion.startTime || promotion.endTime);
  }

  // Check if promotion is currently valid based on time
  function isCurrentlyValid(promotion: Promotion): boolean {
    if (promotion.status !== "active") return false;
    
    const now = new Date();
    const today = now.toISOString().split("T")[0]!;
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format

    // Check date range
    if (promotion.startDate && today < promotion.startDate) return false;
    if (promotion.endDate && today > promotion.endDate) return false;

    // Check time range
    if (promotion.startTime && currentTime < promotion.startTime) return false;
    if (promotion.endTime && currentTime > promotion.endTime) return false;

    return true;
  }

  // Get remaining uses for a promotion
  function getRemainingUses(promotion: Promotion): number {
    if (!promotion.maxUsesTotal) return Infinity;
    return Math.max(0, promotion.maxUsesTotal - promotion.usageCount);
  }

  // Check if promotion is near usage limit
  function isNearUsageLimit(promotion: Promotion, threshold = 0.1): boolean {
    if (!promotion.maxUsesTotal) return false;
    const remaining = getRemainingUses(promotion);
    return (remaining / promotion.maxUsesTotal) <= threshold;
  }

  return {
    // Product helpers
    productMap: readonly(productMap),
    getProductName,
    getProductNames,

    // Display helpers
    formatTriggerText,
    formatRewardText,
    getStatusColor,
    getStatusText,
    getPromotionTypeText,

    // Status helpers
    isActive,
    isCurrentlyValid,
    hasTimeConstraints,

    // Usage helpers
    getTotalUsageCount,
    getRemainingUses,
    isNearUsageLimit,
  };
}
