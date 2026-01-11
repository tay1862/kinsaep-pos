<!-- components/dashboard/DashboardPaymentBreakdown.vue -->
<!-- 💳 Payment Methods Breakdown -->
<script setup lang="ts">
interface KPIs {
  totalRevenue: number;
  cashSales: number;
  lightningSales: number;
  otherSales: number;
}

const props = defineProps<{
  kpis: KPIs;
}>();

const { t } = useI18n();
const currency = useCurrency();

const getPercentage = (amount: number): number => {
  return props.kpis.totalRevenue > 0 ? (amount / props.kpis.totalRevenue) * 100 : 0;
};
</script>

<template>
  <div class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
    <h3 class="font-medium text-gray-900 dark:text-white text-sm mb-3">{{ t('dashboard.paymentBreakdown') }}</h3>
    
    <div class="space-y-3">
      <!-- Cash -->
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <UIcon name="i-heroicons-banknotes" class="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
        </div>
        <div class="flex-1">
          <div class="flex justify-between items-center mb-0.5">
            <span class="text-xs text-gray-600 dark:text-gray-300">{{ t('payment.methods.cash') }}</span>
            <span class="font-medium text-gray-900 dark:text-white tabular-nums text-sm">
              {{ currency.format(kpis.cashSales, 'LAK') }}
            </span>
          </div>
          <div class="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-green-500 rounded-full transition-all duration-500" 
              :style="{ width: `${getPercentage(kpis.cashSales)}%` }"
            />
          </div>
        </div>
      </div>
      
      <!-- Lightning -->
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <span class="text-sm">⚡</span>
        </div>
        <div class="flex-1">
          <div class="flex justify-between items-center mb-0.5">
            <span class="text-xs text-gray-600 dark:text-gray-300">{{ t('payment.methods.lightning') }}</span>
            <span class="font-medium text-amber-600 dark:text-amber-400 tabular-nums text-sm">
              {{ currency.format(kpis.lightningSales, 'LAK') }}
            </span>
          </div>
          <div class="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-amber-500 rounded-full transition-all duration-500" 
              :style="{ width: `${getPercentage(kpis.lightningSales)}%` }"
            />
          </div>
        </div>
      </div>
      
      <!-- Other -->
      <div v-if="kpis.otherSales > 0" class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <UIcon name="i-heroicons-device-phone-mobile" class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div class="flex-1">
          <div class="flex justify-between items-center mb-0.5">
            <span class="text-xs text-gray-600 dark:text-gray-300">{{ t('payment.methods.external') }}</span>
            <span class="font-medium text-gray-900 dark:text-white tabular-nums text-sm">
              {{ currency.format(kpis.otherSales, 'LAK') }}
            </span>
          </div>
          <div class="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-blue-500 rounded-full transition-all duration-500" 
              :style="{ width: `${getPercentage(kpis.otherSales)}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
