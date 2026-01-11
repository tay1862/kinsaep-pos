<script setup lang="ts">
/**
 * 🔍 Expense Filters Component
 */

interface Category {
  value: string;
  label: string;
}

const props = defineProps<{
  category: string;
  startDate: string;
  endDate: string;
  search: string;
  categories: readonly Category[];
}>();

const emit = defineEmits<{
  'update:category': [value: string];
  'update:startDate': [value: string];
  'update:endDate': [value: string];
  'update:search': [value: string];
}>();

const { t } = useI18n();

const categoryOptions = computed(() => [
  { value: '', label: t('common.all') },
  ...props.categories.map(c => ({ value: c.value, label: t(`accounting.expenses.expenseCategories.${c.value}`) }))
]);
</script>

<template>
  <UCard>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UFormField :label="t('accounting.expenses.filterCategory')">
        <USelect
          :model-value="category"
          :items="categoryOptions"
          value-key="value"
          label-key="label"
          :placeholder="t('common.all')"
          @update:model-value="emit('update:category', $event)"
        />
      </UFormField>
      
      <UFormField :label="t('accounting.expenses.startDate')">
        <UInput 
          :model-value="startDate" 
          type="date"
          @update:model-value="emit('update:startDate', $event)"
        />
      </UFormField>
      
      <UFormField :label="t('accounting.expenses.endDate')">
        <UInput 
          :model-value="endDate" 
          type="date"
          @update:model-value="emit('update:endDate', $event)"
        />
      </UFormField>
      
      <UFormField :label="t('accounting.expenses.search')">
        <UInput
          :model-value="search"
          :placeholder="t('accounting.expenses.searchPlaceholder')"
          icon="i-heroicons-magnifying-glass"
          @update:model-value="emit('update:search', $event)"
        />
      </UFormField>
    </div>
  </UCard>
</template>
