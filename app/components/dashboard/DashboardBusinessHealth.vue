<!-- components/dashboard/DashboardBusinessHealth.vue -->
<!-- 🏥 Business Health Score -->
<script setup lang="ts">
interface FinanceHealth {
  score: string;
  color: string;
  value: number;
}

const props = defineProps<{
  financeHealth: FinanceHealth;
}>();
</script>

<template>
  <div class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
    <div class="flex items-center gap-2 mb-3">
      <div class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
        <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <p class="text-xs text-gray-500 dark:text-gray-400">Business Health</p>
        <p class="text-sm font-medium text-gray-900 dark:text-white">
          <span :class="`text-${financeHealth.color}-600 dark:text-${financeHealth.color}-400`">
            {{ financeHealth.score }}
          </span>
        </p>
      </div>
    </div>
    <div class="flex gap-0.5 mb-2">
      <div 
        v-for="i in 10" 
        :key="i"
        class="flex-1 h-1.5 rounded-full transition-colors duration-300"
        :class="i <= financeHealth.value / 10 
          ? `bg-${financeHealth.color}-500` 
          : 'bg-gray-200 dark:bg-gray-700'"
      />
    </div>
    <p class="text-[10px] text-gray-400">Based on revenue trends vs yesterday</p>
  </div>
</template>
