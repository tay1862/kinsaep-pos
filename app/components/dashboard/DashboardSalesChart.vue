<!-- components/dashboard/DashboardSalesChart.vue -->
<!-- 📈 Hourly Sales Chart -->
<script setup lang="ts">
interface HourlySale {
  hour: string;
  sales: number;
  orders: number;
}

const props = defineProps<{
  hourlySales: HourlySale[];
  peakHour: { hour: string; sales: number };
}>();

const { t } = useI18n();
const currency = useCurrency();

// Filter to business hours (6am - 10pm)
const businessHoursSales = computed(() => 
  props.hourlySales.filter((_, i) => i >= 6 && i <= 22)
);

const maxSales = computed(() => 
  Math.max(...props.hourlySales.map(h => h.sales)) || 1
);
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="font-medium text-gray-900 dark:text-white text-sm">{{ t('dashboard.hourlySales') }}</h3>
        <p class="text-xs text-gray-500">Sales throughout the day</p>
      </div>
      <UBadge v-if="peakHour.sales > 0" color="amber" variant="soft" size="sm">
        Peak: {{ peakHour.hour }}
      </UBadge>
    </div>
    
    <div class="h-36">
      <div class="flex items-end justify-between h-full gap-0.5">
        <div
          v-for="(data, index) in businessHoursSales"
          :key="index"
          class="flex-1 flex flex-col items-center gap-0.5 group cursor-pointer"
        >
          <div class="relative w-full">
            <div
              class="w-full bg-primary-500 dark:bg-primary-400 rounded-t transition-all group-hover:bg-primary-600 dark:group-hover:bg-primary-300"
              :style="{
                height: `${Math.max(3, (data.sales / maxSales) * 120)}px`
              }"
            />
            <div class="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap z-10">
              {{ currency.format(data.sales, 'LAK') }}
            </div>
          </div>
          <span class="text-[10px] text-gray-400 tabular-nums">{{ data.hour.split(':')[0] }}</span>
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
