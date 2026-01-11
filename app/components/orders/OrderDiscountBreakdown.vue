<!-- components/orders/OrderDiscountBreakdown.vue -->
<!-- 💰 Order Discount Breakdown - Shows all discounts applied to an order -->
<script setup lang="ts">
import type { Order } from "~/types";

interface Props {
  order: Order;
}

const props = defineProps<Props>();

const { t } = useI18n();
const currency = useCurrency();

// Calculate discount breakdown
const discountBreakdown = computed(() => {
  const breakdown = {
    promotions: props.order.appliedPromotions || [],
    manualDiscount: props.order.discount || 0,
    totalPromotionDiscount: 0,
    totalDiscount: 0,
  };

  breakdown.totalPromotionDiscount = breakdown.promotions.reduce(
    (sum, p) => sum + p.discountAmount,
    0
  );

  breakdown.totalDiscount =
    breakdown.totalPromotionDiscount + breakdown.manualDiscount;

  return breakdown;
});

// Check if order has any discounts
const hasDiscounts = computed(() => {
  return discountBreakdown.value.totalDiscount > 0;
});

// Get promotion type icon
function getPromotionIcon(type: string): string {
  const icons: Record<string, string> = {
    bogo: "🎁",
    discount: "💰",
    tiered: "📊",
    bundle: "📦",
    freebie: "🎀",
  };
  return icons[type] || "🎉";
}

// Get promotion type badge color
function getPromotionColor(type: string): string {
  const colors: Record<string, string> = {
    bogo: "green",
    discount: "blue",
    tiered: "purple",
    bundle: "amber",
    freebie: "pink",
  };
  return colors[type] || "gray";
}
</script>

<template>
  <div class="space-y-4">
    <!-- No Discounts State -->
    <div
      v-if="!hasDiscounts"
      class="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-6 text-center"
    >
      <span class="text-4xl opacity-50 mb-2 block">💸</span>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {{ t("orders.noDiscounts", "No discounts applied to this order") }}
      </p>
    </div>

    <!-- Discount Summary Card -->
    <div
      v-if="hasDiscounts"
      class="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border-2 border-green-200 dark:border-green-800"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-xl bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center"
          >
            <span class="text-2xl">🎉</span>
          </div>
          <div>
            <p class="text-sm font-medium text-green-700 dark:text-green-300">
              {{ t("orders.totalSavings", "Total Savings") }}
            </p>
            <p class="text-2xl font-bold text-green-900 dark:text-green-100">
              {{ currency.format(discountBreakdown.totalDiscount, order.currency || "LAK") }}
            </p>
          </div>
        </div>
        <div
          class="text-right text-sm text-green-700 dark:text-green-300"
        >
          <p class="font-medium">
            {{ Math.round((discountBreakdown.totalDiscount / (order.total + discountBreakdown.totalDiscount)) * 100) }}%
          </p>
          <p class="text-xs opacity-75">{{ t("common.off", "OFF") }}</p>
        </div>
      </div>
    </div>

    <!-- Applied Promotions -->
    <div
      v-if="discountBreakdown.promotions.length > 0"
      class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      <div
        class="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🎁</span>
            {{ t("promotions.appliedPromotions", "Applied Promotions") }}
          </h3>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ discountBreakdown.promotions.length }}
            {{ discountBreakdown.promotions.length === 1 ? "promotion" : "promotions" }}
          </span>
        </div>
      </div>

      <div class="divide-y divide-gray-200 dark:divide-gray-800">
        <div
          v-for="(promo, index) in discountBreakdown.promotions"
          :key="index"
          class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <!-- Promotion Info -->
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xl">{{ getPromotionIcon(promo.type) }}</span>
                <div>
                  <h4 class="font-semibold text-gray-900 dark:text-white">
                    {{ promo.promotionName }}
                  </h4>
                  <div class="flex items-center gap-2 mt-1">
                    <UBadge :color="getPromotionColor(promo.type)" size="xs">
                      {{ promo.type.toUpperCase() }}
                    </UBadge>
                    <span
                      v-if="promo.timesApplied > 1"
                      class="text-xs text-gray-500 dark:text-gray-400"
                    >
                      Applied {{ promo.timesApplied }}×
                    </span>
                  </div>
                </div>
              </div>

              <!-- Description -->
              <p
                v-if="promo.description"
                class="text-sm text-gray-600 dark:text-gray-400 mb-2"
              >
                {{ promo.description }}
              </p>

              <!-- Trigger & Reward Items -->
              <div class="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div v-if="promo.triggerItemIds.length > 0" class="flex items-center gap-1">
                  <span class="font-medium">Trigger:</span>
                  <span>{{ promo.triggerItemIds.length }} item(s)</span>
                </div>
                <div v-if="promo.rewardItemIds.length > 0" class="flex items-center gap-1">
                  <span class="font-medium">Reward:</span>
                  <span>{{ promo.rewardItemIds.length }} item(s)</span>
                </div>
              </div>
            </div>

            <!-- Discount Amount -->
            <div class="text-right flex-shrink-0">
              <p class="text-lg font-bold text-green-600 dark:text-green-400">
                -{{ currency.format(promo.discountAmount, order.currency || "LAK") }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ t("common.saved", "Saved") }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Promotion Total -->
      <div
        class="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800"
      >
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-green-700 dark:text-green-300">
            {{ t("promotions.totalPromotionDiscount", "Total Promotion Discount") }}
          </span>
          <span class="text-lg font-bold text-green-900 dark:text-green-100">
            -{{ currency.format(discountBreakdown.totalPromotionDiscount, order.currency || "LAK") }}
          </span>
        </div>
      </div>
    </div>

    <!-- Manual Discount -->
    <div
      v-if="discountBreakdown.manualDiscount > 0"
      class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      <div
        class="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800"
      >
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span>🏷️</span>
          {{ t("orders.manualDiscount", "Manual Discount") }}
        </h3>
      </div>

      <div class="p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ t("orders.discountAppliedByStaff", "Discount applied by staff") }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{
                t(
                  "orders.discountReason",
                  "May include staff discount, customer loyalty, or other reasons"
                )
              }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-lg font-bold text-blue-600 dark:text-blue-400">
              -{{ currency.format(discountBreakdown.manualDiscount, order.currency || "LAK") }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Discount Impact Summary -->
    <div
      v-if="hasDiscounts"
      class="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-4"
    >
      <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        💡 {{ t("orders.discountImpact", "Discount Impact") }}
      </h4>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between text-gray-600 dark:text-gray-400">
          <span>{{ t("orders.originalTotal", "Original Total") }}:</span>
          <span class="font-medium text-gray-900 dark:text-white">
            {{ currency.format(order.total + discountBreakdown.totalDiscount, order.currency || "LAK") }}
          </span>
        </div>
        <div class="flex justify-between text-green-600 dark:text-green-400">
          <span>{{ t("common.discount", "Total Discount") }}:</span>
          <span class="font-semibold">
            -{{ currency.format(discountBreakdown.totalDiscount, order.currency || "LAK") }}
          </span>
        </div>
        <div
          class="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700"
        >
          <span class="font-semibold text-gray-900 dark:text-white">
            {{ t("orders.finalTotal", "Final Total") }}:
          </span>
          <span class="text-lg font-bold text-gray-900 dark:text-white">
            {{ currency.format(order.total, order.currency || "LAK") }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
