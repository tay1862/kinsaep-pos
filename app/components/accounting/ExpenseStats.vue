<script setup lang="ts">
/**
 * 📊 Expense Stats Component
 */
defineProps<{
  stats: {
    totalExpenses: number;
    thisMonth: number;
    expenseCount: number;
    categoryCount: number;
  };
}>();

const { format: formatCurrency } = useCurrency();
const { t } = useI18n();
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <CommonStatCard
      icon="i-heroicons-banknotes"
      icon-color="red"
      :label="t('accounting.expenses.totalExpenses')"
      :value="formatCurrency(stats.totalExpenses)"
    />
    
    <CommonStatCard
      icon="i-heroicons-calendar"
      icon-color="yellow"
      :label="t('accounting.expenses.thisMonth')"
      :value="formatCurrency(stats.thisMonth)"
    />
    
    <CommonStatCard
      icon="i-heroicons-document-text"
      icon-color="purple"
      :label="t('accounting.expenses.expenseCount')"
      :value="stats.expenseCount"
    />
    
    <CommonStatCard
      icon="i-heroicons-tag"
      icon-color="blue"
      :label="t('accounting.expenses.categories')"
      :value="stats.categoryCount"
    />
  </div>
</template>
