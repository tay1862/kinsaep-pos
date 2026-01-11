<!-- components/products/PromotionUsageHistory.vue -->
<!-- 📊 Promotion Usage History - Shows orders that used this promotion -->
<script setup lang="ts">
import type { Promotion, PromotionUsage } from "~/types";

interface Props {
  promotion: Promotion;
}

const props = defineProps<Props>();

const { t } = useI18n();
const currency = useCurrency();
const promotionsStore = usePromotionsStore();
const ordersStore = useOrders();

// Get usage history for this promotion
const usageHistory = computed(() => {
  return promotionsStore.getPromotionUsageHistory(props.promotion.id);
});

// Get usage statistics
const stats = computed(() => {
  const promoStats = promotionsStore.promotionUsageStats.value[props.promotion.id];
  return promoStats || { count: 0, totalDiscount: 0, lastUsed: "" };
});

// Get orders that used this promotion
const ordersWithPromotion = computed(() => {
  return ordersStore.orders.value.filter((order) =>
    order.appliedPromotions?.some((p) => p.promotionId === props.promotion.id)
  );
});

// Format date
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Calculate usage percentage if limit exists
const usagePercentage = computed(() => {
  if (!props.promotion.maxUsesTotal) return null;
  return Math.round((props.promotion.usageCount / props.promotion.maxUsesTotal) * 100);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Usage Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Total Uses -->
      <div
        class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-2xl">🎯</span>
          <span class="text-xs text-blue-600 dark:text-blue-400 font-medium">
            {{
              usagePercentage !== null
                ? `${usagePercentage}% of limit`
                : "No limit"
            }}
          </span>
        </div>
        <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">
          {{ stats.count }}
        </p>
        <p class="text-sm text-blue-700 dark:text-blue-300">
          {{ t("promotions.timesUsed", "Times Used") }}
          <span v-if="promotion.maxUsesTotal" class="text-xs">
            / {{ promotion.maxUsesTotal }}
          </span>
        </p>
      </div>

      <!-- Total Discount Given -->
      <div
        class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-2xl">💰</span>
        </div>
        <p class="text-2xl font-bold text-green-900 dark:text-green-100">
          {{ currency.format(stats.totalDiscount, "LAK") }}
        </p>
        <p class="text-sm text-green-700 dark:text-green-300">
          {{ t("promotions.totalDiscount", "Total Discount Given") }}
        </p>
      </div>

      <!-- Last Used -->
      <div
        class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-2xl">🕒</span>
        </div>
        <p class="text-lg font-bold text-purple-900 dark:text-purple-100">
          {{
            stats.lastUsed
              ? formatDateTime(stats.lastUsed).split(",")[0]
              : t("common.never", "Never")
          }}
        </p>
        <p class="text-sm text-purple-700 dark:text-purple-300">
          {{ t("promotions.lastUsed", "Last Used") }}
        </p>
      </div>
    </div>

    <!-- Usage History Table -->
    <div
      class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      <div
        class="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800"
      >
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
          📋 {{ t("promotions.usageHistory", "Usage History") }}
          ({{ usageHistory.length }})
        </h3>
      </div>

      <div class="overflow-x-auto max-h-96">
        <table class="w-full">
          <thead
            class="bg-gray-50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-800 sticky top-0"
          >
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ t("common.date", "Date") }}
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ t("orders.orderId", "Order") }}
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ t("common.customer", "Customer") }}
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ t("promotions.timesApplied", "Applied") }}
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ t("common.discount", "Discount") }}
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ t("common.actions", "Actions") }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
            <tr
              v-if="usageHistory.length === 0"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td
                colspan="6"
                class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                <div class="flex flex-col items-center gap-2">
                  <span class="text-3xl opacity-50">📊</span>
                  <p>{{ t("promotions.noUsageYet", "No usage history yet") }}</p>
                  <p class="text-xs">
                    {{
                      t(
                        "promotions.usageWillAppear",
                        "Usage will appear here when customers use this promotion"
                      )
                    }}
                  </p>
                </div>
              </td>
            </tr>

            <tr
              v-for="usage in usageHistory"
              :key="usage.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <!-- Date -->
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="text-sm text-gray-900 dark:text-white">
                  {{ formatDateTime(usage.usedAt) }}
                </span>
              </td>

              <!-- Order ID -->
              <td class="px-4 py-3 whitespace-nowrap">
                <NuxtLink
                  :to="`/orders/${usage.orderId}`"
                  class="text-sm font-mono text-primary-600 dark:text-primary-400 hover:underline"
                >
                  #{{ usage.orderId.slice(-8) }}
                </NuxtLink>
              </td>

              <!-- Customer -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div
                    class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium"
                  >
                    {{ (usage.customerId || "?")[0].toUpperCase() }}
                  </div>
                  <span class="text-sm text-gray-900 dark:text-white truncate">
                    {{ usage.customerId || t("common.guest", "Guest") }}
                  </span>
                </div>
              </td>

              <!-- Times Applied -->
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                >
                  {{ usage.timesApplied }}×
                </span>
              </td>

              <!-- Discount Amount -->
              <td class="px-4 py-3 text-right">
                <span
                  class="text-sm font-semibold text-green-600 dark:text-green-400"
                >
                  -{{ currency.format(usage.discountAmount, "LAK") }}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3 text-center">
                <UButton
                  :to="`/orders/${usage.orderId}`"
                  size="xs"
                  variant="ghost"
                  color="gray"
                  icon="i-heroicons-eye"
                >
                  {{ t("common.view", "View") }}
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Orders Using This Promotion -->
    <div
      class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      <div
        class="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800"
      >
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
          🛒 {{ t("promotions.ordersWithPromotion", "Orders Using This Promotion") }}
          ({{ ordersWithPromotion.length }})
        </h3>
      </div>

      <div class="divide-y divide-gray-200 dark:divide-gray-800 max-h-80 overflow-y-auto">
        <div
          v-if="ordersWithPromotion.length === 0"
          class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          <p>{{ t("promotions.noOrdersYet", "No orders yet") }}</p>
        </div>

        <NuxtLink
          v-for="order in ordersWithPromotion.slice(0, 20)"
          :key="order.id"
          :to="`/orders/${order.id}`"
          class="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span
                class="text-sm font-mono font-semibold text-gray-900 dark:text-white"
              >
                #{{ order.orderNumber || order.code || order.id.slice(-8) }}
              </span>
              <UBadge
                :color="order.status === 'completed' ? 'green' : 'yellow'"
                size="xs"
              >
                {{ order.status }}
              </UBadge>
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <span>{{ formatDateTime(order.date).split(",")[0] }}</span>
              <span>•</span>
              <span>{{ order.customer }}</span>
              <span>•</span>
              <span>{{ order.items.length }} items</span>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-gray-900 dark:text-white">
              {{ currency.format(order.total, order.currency || "LAK") }}
            </p>
            <p class="text-xs text-green-600 dark:text-green-400">
              -{{
                currency.format(
                  order.appliedPromotions?.find(
                    (p) => p.promotionId === promotion.id
                  )?.discountAmount || 0,
                  "LAK"
                )
              }}
            </p>
          </div>
        </NuxtLink>

        <div
          v-if="ordersWithPromotion.length > 20"
          class="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30"
        >
          +{{ ordersWithPromotion.length - 20 }}
          {{ t("common.more", "more orders") }}
        </div>
      </div>
    </div>
  </div>
</template>
