<script setup lang="ts">
/**
 * 💸 Expense Modal Component
 */

interface ExpenseForm {
  description: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
}

const props = defineProps<{
  open: boolean;
  form: ExpenseForm;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'update:form': [value: ExpenseForm];
  'create': [];
}>();

const { t } = useI18n();

const isOpen = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
});

const categoryOptions = [
  'inventory',
  'utilities',
  'payroll',
  'rent',
  'marketing',
  'other',
];

const paymentOptions = ['cash', 'lightning', 'bank_transfer'];

const updateFormField = <K extends keyof ExpenseForm>(key: K, value: ExpenseForm[K]) => {
  emit('update:form', { ...props.form, [key]: value });
};
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ t("accounting.addExpense") }}
        </h3>
      </div>
    </template>
    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('accounting.description')">
          <UInput 
            :model-value="form.description" 
            @update:model-value="updateFormField('description', $event)"
          />
        </UFormField>
        <UFormField :label="t('accounting.category')">
          <USelect
            :model-value="form.category"
            :items="categoryOptions"
            @update:model-value="updateFormField('category', $event)"
          />
        </UFormField>
        <UFormField :label="t('accounting.amount')">
          <UInput 
            :model-value="form.amount" 
            type="number"
            @update:model-value="updateFormField('amount', Number($event))"
          />
        </UFormField>
        <UFormField :label="t('accounting.date')">
          <UInput 
            :model-value="form.date" 
            type="date"
            @update:model-value="updateFormField('date', $event)"
          />
        </UFormField>
        <UFormField :label="t('accounting.paymentMethod')">
          <USelect
            :model-value="form.paymentMethod"
            :items="paymentOptions"
            @update:model-value="updateFormField('paymentMethod', $event)"
          />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="isOpen = false">
          {{ t("common.cancel") }}
        </UButton>
        <UButton @click="emit('create')">
          {{ t("common.save") }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
