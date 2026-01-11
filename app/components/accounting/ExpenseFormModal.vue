<script setup lang="ts">
/**
 * 📝 Expense Form Modal Component
 */
import type { Expense } from '~/composables/use-expenses'

interface Category {
  value: string;
  label: string;
}

interface PaymentMethod {
  value: string;
  label: string;
}

const props = defineProps<{
  open: boolean;
  expense: Expense | null;
  saving: boolean;
  categories: readonly Category[];
  paymentMethods: readonly PaymentMethod[];
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'save': [data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'synced'>];
}>();

const { t } = useI18n();

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
});

// Form state - explicit types to ensure values are never undefined
const form = reactive<{
  amount: number;
  category: string;
  description: string;
  date: string;
  vendor: string;
  paymentMethod: string;
  reference: string;
  notes: string;
  receipt: string;
}>({
  amount: 0,
  category: '',
  description: '',
  date: new Date().toISOString().split('T')[0]!,
  vendor: '',
  paymentMethod: 'cash',
  reference: '',
  notes: '',
  receipt: '',
});

const receiptInputRef = ref<HTMLInputElement | null>(null);

// Watch for expense prop changes
watch(() => props.expense, (expense) => {
  if (expense) {
    form.amount = expense.amount;
    form.category = expense.category;
    form.description = expense.description;
    form.date = expense.date;
    form.vendor = expense.vendor || '';
    form.paymentMethod = expense.paymentMethod;
    form.reference = expense.reference || '';
    form.notes = expense.notes || '';
    form.receipt = expense.receipt || '';
  } else {
    resetForm();
  }
}, { immediate: true });

function resetForm() {
  form.amount = 0;
  form.category = '';
  form.description = '';
  form.date = new Date().toISOString().split('T')[0]!;
  form.vendor = '';
  form.paymentMethod = 'cash';
  form.reference = '';
  form.notes = '';
  form.receipt = '';
}

function handleReceiptUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.[0]) {
    form.receipt = input.files[0].name;
  }
}

function handleSave() {
  const data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'synced'> = {
    amount: form.amount,
    category: form.category,
    description: form.description,
    date: form.date,
    vendor: form.vendor || undefined,
    paymentMethod: form.paymentMethod,
    reference: form.reference || undefined,
    notes: form.notes || undefined,
    receipt: form.receipt || undefined,
  };
  emit('save', data);
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <h3 class="font-semibold">
        {{ expense?.id ? t('accounting.expenses.editExpense') : t('accounting.expenses.addExpense') }}
      </h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('accounting.expenses.amount')" required>
          <UInput
            v-model.number="form.amount"
            type="number"
            min="0"
            step="0.01"
            :placeholder="t('accounting.expenses.amountPlaceholder')"
          />
        </UFormField>

        <UFormField :label="t('accounting.expenses.category')" required>
          <USelect
            v-model="form.category"
            :items="categories.map(c => ({ value: c.value, label: t(`accounting.expenses.expenseCategories.${c.value}`) }))"
            value-key="value"
            label-key="label"
            :placeholder="t('accounting.expenses.selectCategory')"
          />
        </UFormField>

        <UFormField :label="t('accounting.expenses.description')" required>
          <UInput
            v-model="form.description"
            :placeholder="t('accounting.expenses.descriptionPlaceholder')"
          />
        </UFormField>

        <UFormField :label="t('accounting.expenses.date')" required>
          <UInput v-model="form.date" type="date" />
        </UFormField>

        <UFormField :label="t('accounting.expenses.vendor')">
          <UInput
            v-model="form.vendor"
            :placeholder="t('accounting.expenses.vendorPlaceholder')"
          />
        </UFormField>

        <UFormField :label="t('accounting.expenses.paymentMethod')">
          <USelect
            v-model="form.paymentMethod"
            :items="paymentMethods.map(p => ({ value: p.value, label: t(`accounting.expenses.paymentMethods.${p.value}`) }))"
            value-key="value"
            label-key="label"
          />
        </UFormField>

        <UFormField :label="t('accounting.expenses.reference')">
          <UInput
            v-model="form.reference"
            :placeholder="t('accounting.expenses.referencePlaceholder')"
          />
        </UFormField>

        <UFormField :label="t('accounting.expenses.notes')">
          <UTextarea
            v-model="form.notes"
            :placeholder="t('accounting.expenses.notesPlaceholder')"
            :rows="2"
          />
        </UFormField>

        <UFormField :label="t('accounting.expenses.receipt')">
          <div class="border-2 border-dashed rounded-lg p-4 text-center">
            <input
              ref="receiptInputRef"
              type="file"
              accept="image/*,.pdf"
              class="hidden"
              @change="handleReceiptUpload"
            >
            <div v-if="!form.receipt">
              <UIcon name="i-heroicons-camera" class="text-2xl text-muted mb-2" />
              <p class="text-sm text-muted mb-2">{{ t('accounting.expenses.uploadReceipt') }}</p>
              <UButton size="sm" variant="outline" @click="receiptInputRef?.click()">
                {{ t('accounting.expenses.selectFile') }}
              </UButton>
            </div>
            <div v-else class="flex items-center justify-center gap-2">
              <UIcon name="i-heroicons-document-check" class="text-green-600" />
              <span class="text-sm">{{ form.receipt }}</span>
              <UButton variant="ghost" size="xs" icon="i-heroicons-x-mark" @click="form.receipt = ''" />
            </div>
          </div>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="isOpen = false">
          {{ t('common.cancel') }}
        </UButton>
        <UButton
          :loading="saving"
          :disabled="!form.amount || !form.category || !form.description"
          @click="handleSave"
        >
          {{ expense?.id ? t('common.update') : t('common.create') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
