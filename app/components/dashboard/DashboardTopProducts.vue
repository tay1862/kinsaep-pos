<!-- components/dashboard/DashboardTopProducts.vue -->
<!-- 🏆 Top Selling Products -->
<script setup lang="ts">
interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

defineProps<{
  products: TopProduct[];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-medium text-gray-900 dark:text-white text-sm">{{ t('dashboard.topProducts') }}</h3>
      <span class="text-[10px] text-gray-400">Today</span>
    </div>
    
    <div v-if="products.length === 0" class="text-center py-6 text-gray-500">
      <UIcon name="i-heroicons-cube" class="w-8 h-8 mx-auto text-gray-300 mb-2" />
      <p class="text-xs">{{ t('dashboard.noSalesYet') }}</p>
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="(product, index) in products"
        :key="index"
        class="flex items-center gap-2 py-1"
      >
        <span 
          class="w-5 h-5 rounded text-[10px] font-medium flex items-center justify-center"
          :class="index === 0 
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' 
            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
        >
          {{ index + 1 }}
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-900 dark:text-white truncate">{{ product.name }}</p>
        </div>
        <p class="font-medium text-gray-900 dark:text-white tabular-nums text-xs">
          {{ product.quantity }}
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
