<script setup lang="ts">
/**
 * 🧾 Invoice Modal Component
 */

interface InvoiceForm {
  customer: string;
  amount: number;
  dueDate: string;
}

const props = defineProps<{
  open: boolean;
  form: InvoiceForm;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'update:form': [value: InvoiceForm];
  'create': [];
}>();

const { t } = useI18n();

const isOpen = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
});

const localForm = computed({
  get: () => props.form,
  set: (val: InvoiceForm) => emit('update:form', val),
});

const updateFormField = <K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) => {
  emit('update:form', { ...props.form, [key]: value });
};
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ t("accounting.createInvoice") }}
        </h3>
      </div>
    </template>
    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('accounting.customer')">
          <UInput 
            :model-value="localForm.customer" 
            @update:model-value="updateFormField('customer', $event)"
          />
        </UFormField>
        <UFormField :label="t('accounting.amount')">
          <UInput 
            :model-value="localForm.amount" 
            type="number"
            @update:model-value="updateFormField('amount', Number($event))"
          />
        </UFormField>
        <UFormField :label="t('accounting.dueDate')">
          <UInput 
            :model-value="localForm.dueDate" 
            type="date"
            @update:model-value="updateFormField('dueDate', $event)"
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
          {{ t("common.create") }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
