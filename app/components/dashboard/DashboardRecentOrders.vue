<!-- components/dashboard/DashboardRecentOrders.vue -->
<!-- 📋 Recent Orders List -->
<script setup lang="ts">
import type { Order } from "~/types";

defineProps<{
  orders: Order[];
}>();

const { t } = useI18n();
const currency = useCurrency();

const formatTime = (date: string): string => {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getStatusColor = (
  status: string
): "green" | "yellow" | "red" | "gray" => {
  const colors: Record<string, "green" | "yellow" | "red" | "gray"> = {
    completed: "green",
    pending: "yellow",
    processing: "yellow",
    cancelled: "red",
    refunded: "green",
    failed: "red"
  };
  return colors[status] || "gray";
};
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800"
  >
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-medium text-gray-900 dark:text-white text-sm">
        {{ t("dashboard.recentOrders") }}
      </h3>
      <NuxtLinkLocale
        to="/orders"
        class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
      >
        {{ t("common.viewAll") }}
      </NuxtLinkLocale>
    </div>

    <div v-if="orders.length === 0" class="text-center py-6 text-gray-500">
      <UIcon
        name="i-heroicons-inbox"
        class="w-8 h-8 mx-auto text-gray-300 mb-2"
      />
      <p class="text-xs">{{ t("dashboard.noOrdersYet") }}</p>
    </div>
    <div v-else class="space-y-1.5">
      <NuxtLinkLocale
        v-for="order in orders"
        :key="order.id"
        :to="`/orders/${order.id}`"
        class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div class="flex items-center gap-2">
          <div
            class="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-receipt-percent"
              class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400"
            />
          </div>
          <div>
            <p class="text-sm text-gray-900 dark:text-white">
              #{{ order.id?.slice(-6).toUpperCase() || "------" }}
            </p>
            <p class="text-[10px] text-gray-400">
              {{ formatTime(order.date) }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <p
            class="font-medium text-gray-900 dark:text-white tabular-nums text-sm"
          >
            {{ currency.format(order.total, "LAK") }}
          </p>
          <UBadge
            :color="getStatusColor(order.status)"
            variant="soft"
            size="xs"
          >
            {{ t(`orders.status.${order.status}`) }}
          </UBadge>
        </div>
      </NuxtLinkLocale>
    </div>
  </div>
</template>

<style scoped>
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
