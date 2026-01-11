<script setup lang="ts">
/**
 * 📋 Expense List Component
 */
import type { Expense } from '~/composables/use-expenses'

const props = defineProps<{
  expenses: Expense[];
  totalCount: number;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'edit': [expense: Expense];
  'delete': [expense: Expense];
  'duplicate': [expense: Expense];
  'export': [];
  'add': [];
}>();

const { format: formatCurrency } = useCurrency();
const { t } = useI18n();

const expensesStore = useExpenses();

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

function getExpenseActions(expense: Expense) {
  return [
    [
      {
        label: t('common.edit'),
        icon: 'i-heroicons-pencil',
        onSelect: () => emit('edit', expense)
      },
      {
        label: t('common.duplicate'),
        icon: 'i-heroicons-document-duplicate',
        onSelect: () => emit('duplicate', expense)
      }
    ],
    [
      {
        label: t('common.delete'),
        icon: 'i-heroicons-trash',
        color: 'error' as const,
        onSelect: () => emit('delete', expense)
      }
    ]
  ];
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">{{ t('accounting.expenses.expenseList') }}</h3>
        <UButton
          variant="outline"
          icon="i-heroicons-arrow-down-tray"
          size="sm"
          @click="emit('export')"
        >
          {{ t('accounting.expenses.export') }}
        </UButton>
      </div>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 5" :key="i" class="flex items-center gap-4 py-4">
        <USkeleton class="w-12 h-12 rounded-lg" />
        <div class="flex-1 space-y-2">
          <USkeleton class="h-4 w-48" />
          <USkeleton class="h-3 w-32" />
        </div>
        <USkeleton class="h-6 w-24" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="expenses.length === 0" class="text-center py-8">
      <UIcon name="i-heroicons-receipt-percent" class="text-4xl text-muted mb-2" />
      <p class="text-muted">{{ t('accounting.expenses.noExpenses') }}</p>
      <UButton
        variant="outline"
        class="mt-4"
        icon="i-heroicons-plus"
        @click="emit('add')"
      >
        {{ t('accounting.expenses.addFirstExpense') }}
      </UButton>
    </div>

    <!-- Expense Items -->
    <div v-else class="divide-y">
      <div
        v-for="expense in expenses"
        :key="expense.id"
        class="py-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-lg flex items-center justify-center"
            :style="{ backgroundColor: expensesStore.getCategoryInfo(expense.category).color + '20' }"
          >
            <UIcon
              :name="expensesStore.getCategoryInfo(expense.category).icon"
              class="text-xl"
              :style="{ color: expensesStore.getCategoryInfo(expense.category).color }"
            />
          </div>
          <div>
            <p class="font-medium">{{ expense.description }}</p>
            <div class="flex items-center gap-2 text-sm text-muted">
              <UBadge variant="subtle" size="xs">
                {{ t(`accounting.expenses.expenseCategories.${expense.category}`) }}
              </UBadge>
              <span>{{ formatDate(expense.date) }}</span>
              <span v-if="expense.vendor">· {{ expense.vendor }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right">
            <p class="font-bold text-error">-{{ formatCurrency(expense.amount) }}</p>
            <p class="text-xs text-muted">{{ t(`accounting.expenses.paymentMethods.${expense.paymentMethod}`) }}</p>
          </div>
          
          <UDropdownMenu :items="getExpenseActions(expense)">
            <UButton
              variant="ghost"
              icon="i-heroicons-ellipsis-vertical"
            />
          </UDropdownMenu>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div v-if="expenses.length > 0" class="flex justify-between items-center mt-4 pt-4 border-t">
      <p class="text-sm text-muted">
        {{ t('accounting.expenses.showing', { count: expenses.length, total: totalCount }) }}
      </p>
    </div>
  </UCard>
</template>
