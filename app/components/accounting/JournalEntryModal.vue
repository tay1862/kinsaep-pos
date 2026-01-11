<script setup lang="ts">
/**
 * 📝 Journal Entry Modal Component
 */

interface JournalLine {
  account: string;
  debit: number;
  credit: number;
}

interface JournalEntryForm {
  date: string;
  description: string;
  lines: JournalLine[];
}

const props = defineProps<{
  open: boolean;
  form: JournalEntryForm;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'update:form': [value: JournalEntryForm];
  'create': [];
  'addLine': [];
}>();

const { t } = useI18n();

const isOpen = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
});

const updateFormField = <K extends keyof JournalEntryForm>(key: K, value: JournalEntryForm[K]) => {
  emit('update:form', { ...props.form, [key]: value });
};

const updateLine = (index: number, field: keyof JournalLine, value: string | number) => {
  const newLines = [...props.form.lines];
  newLines[index] = { ...newLines[index]!, [field]: value };
  emit('update:form', { ...props.form, lines: newLines });
};

const totalDebit = computed(() => props.form.lines.reduce((sum, l) => sum + (l.debit || 0), 0));
const totalCredit = computed(() => props.form.lines.reduce((sum, l) => sum + (l.credit || 0), 0));
const isBalanced = computed(() => Math.abs(totalDebit.value - totalCredit.value) < 0.01);
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ t("accounting.createEntry") }}
        </h3>
      </div>
    </template>
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('accounting.date')">
            <UInput 
              :model-value="form.date" 
              type="date"
              @update:model-value="updateFormField('date', $event)"
            />
          </UFormField>
          <UFormField :label="t('accounting.description')">
            <UInput 
              :model-value="form.description"
              @update:model-value="updateFormField('description', $event)"
            />
          </UFormField>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ t("accounting.journalLines") }}
          </h4>
          <div
            v-for="(line, idx) in form.lines"
            :key="idx"
            class="grid grid-cols-3 gap-2"
          >
            <UInput
              :model-value="line.account"
              :placeholder="t('accounting.account')"
              @update:model-value="updateLine(idx, 'account', $event)"
            />
            <UInput
              :model-value="line.debit"
              type="number"
              :placeholder="t('accounting.debit')"
              @update:model-value="updateLine(idx, 'debit', Number($event))"
            />
            <UInput
              :model-value="line.credit"
              type="number"
              :placeholder="t('accounting.credit')"
              @update:model-value="updateLine(idx, 'credit', Number($event))"
            />
          </div>
          <UButton size="xs" variant="ghost" icon="i-heroicons-plus" @click="emit('addLine')">
            {{ t("accounting.addLine") }}
          </UButton>
          
          <!-- Balance indicator -->
          <div class="flex justify-between items-center pt-2 border-t">
            <div class="text-sm text-gray-500">
              Debit: {{ totalDebit.toLocaleString() }} | Credit: {{ totalCredit.toLocaleString() }}
            </div>
            <UBadge :color="isBalanced ? 'success' : 'error'" variant="soft">
              {{ isBalanced ? 'Balanced ✓' : 'Not Balanced' }}
            </UBadge>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="isOpen = false">
          {{ t("common.cancel") }}
        </UButton>
        <UButton :disabled="!isBalanced" @click="emit('create')">
          {{ t("common.save") }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
