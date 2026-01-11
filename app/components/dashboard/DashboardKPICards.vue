<!-- components/dashboard/DashboardKPICards.vue -->
<!-- 📊 KPI Cards - Revenue, Orders, Avg Value, Lightning Sales -->
<script setup lang="ts">
interface KPIs {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  cashSales: number;
  lightningSales: number;
  otherSales: number;
}

interface TodayStats {
  revenue: number;
  orders: number;
  revenueChange: number;
}

defineProps<{
  kpis: KPIs;
  todayStats: TodayStats;
  selectedPeriod: 'today' | 'week' | 'month';
}>();

const { t } = useI18n();
const currency = useCurrency();
</script>

<template>
  <div class="grid grid-cols-12 gap-3">
    <!-- Total Revenue -->
    <div class="col-span-12 sm:col-span-6 lg:col-span-3">
      <div class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
        <div class="flex items-center justify-between mb-2">
          <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-banknotes" class="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <span
            v-if="selectedPeriod === 'today'"
            class="text-xs font-medium"
            :class="todayStats.revenueChange >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'"
          >
            {{ todayStats.revenueChange >= 0 ? '+' : '' }}{{ todayStats.revenueChange.toFixed(1) }}%
          </span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('dashboard.totalRevenue') }}</p>
        <p class="text-xl font-semibold text-gray-900 dark:text-white tabular-nums">
          {{ currency.format(kpis.totalRevenue, 'LAK') }}
        </p>
      </div>
    </div>

    <!-- Total Orders -->
    <div class="col-span-6 lg:col-span-3">
      <div class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
        <div class="flex items-center mb-2">
          <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-clipboard-document-list" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('dashboard.totalOrders') }}</p>
        <p class="text-xl font-semibold text-gray-900 dark:text-white tabular-nums">{{ kpis.totalOrders }}</p>
      </div>
    </div>

    <!-- Average Order Value -->
    <div class="col-span-6 lg:col-span-3">
      <div class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
        <div class="flex items-center mb-2">
          <div class="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-chart-bar" class="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('dashboard.avgOrderValue') }}</p>
        <p class="text-xl font-semibold text-gray-900 dark:text-white tabular-nums">
          {{ currency.format(kpis.avgOrderValue, 'LAK') }}
        </p>
      </div>
    </div>

    <!-- Lightning Sales -->
    <div class="col-span-12 sm:col-span-6 lg:col-span-3">
      <div class="h-full bg-amber-50 dark:bg-amber-900/10 rounded-lg p-4 border border-amber-200 dark:border-amber-900/30">
        <div class="flex items-center justify-between mb-2">
          <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <span class="text-base">⚡</span>
          </div>
          <span class="text-xs font-medium text-amber-600 dark:text-amber-400">
            {{ kpis.totalRevenue > 0 ? ((kpis.lightningSales / kpis.totalRevenue) * 100).toFixed(0) : 0 }}%
          </span>
        </div>
        <p class="text-xs text-amber-600 dark:text-amber-400">{{ t('dashboard.lightningSales') }}</p>
        <p class="text-xl font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
          {{ currency.format(kpis.lightningSales, 'LAK') }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
