<script setup lang="ts">
/**
 * 📊 Expense Chart Component
 */

interface ChartData {
  name: string;
  value: number;
  color: string;
}

defineProps<{
  data: ChartData[];
  period: string;
}>();

const emit = defineEmits<{
  'update:period': [value: string];
}>();

const { t } = useI18n();

const periodOptions = computed(() => [
  { value: 'week', label: t('accounting.expenses.thisWeek') },
  { value: 'month', label: t('accounting.expenses.thisMonth') },
  { value: 'year', label: t('accounting.expenses.thisYear') }
]);
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">{{ t('accounting.expenses.expensesByCategory') }}</h3>
        <USelect
          :model-value="period"
          :items="periodOptions"
          value-key="value"
          label-key="label"
          class="w-32"
          @update:model-value="emit('update:period', $event)"
        />
      </div>
    </template>

    <div class="h-64">
      <ChartPie
        v-if="data.length > 0"
        :data="data"
      />
      <div v-else class="h-full flex items-center justify-center text-muted">
        {{ t('accounting.expenses.noData') }}
      </div>
    </div>
  </UCard>
</template>
