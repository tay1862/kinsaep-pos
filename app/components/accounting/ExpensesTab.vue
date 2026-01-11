<script setup lang="ts">
/**
 * 💳 Accounting Expenses Tab
 * Expense list with category badges and quick actions
 */

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  status: string;
}

const props = defineProps<{
  expenses: Expense[];
}>();

const emit = defineEmits<{
  add: [];
}>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();

const categoryColors: Record<string, string> = {
  inventory:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  utilities:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  payroll:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  rent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  marketing: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  supplies:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

function getCategoryColor(category: string): string {
  return (
    categoryColors[category] ||
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
  );
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            {{ t("accounting.expenses.title") }}
          </h3>
          <div class="flex gap-2">
            <NuxtLinkLocale to="/accounting/expenses">
              <UButton
                variant="outline"
                icon="i-heroicons-arrow-top-right-on-square"
                size="sm"
              >
                {{ t("common.viewAll") }}
              </UButton>
            </NuxtLinkLocale>
            <UButton icon="i-heroicons-plus" size="sm" @click="emit('add')">
              {{ t("accounting.addExpense") }}
            </UButton>
          </div>
        </div>
      </template>

      <div v-if="expenses.length === 0" class="text-center py-8">
        <UIcon
          name="i-heroicons-credit-card"
          class="w-12 h-12 text-muted mx-auto mb-3"
        />
        <p class="text-muted">{{ t("accounting.expenses.noExpenses") }}</p>
        <UButton variant="outline" class="mt-4" @click="emit('add')">
          {{ t("accounting.expenses.addFirstExpense") }}
        </UButton>
      </div>

      <div v-else class="divide-y">
        <div
          v-for="expense in expenses.slice(0, 10)"
          :key="expense.id"
          class="py-3 flex items-center justify-between"
        >
          <div class="flex items-center gap-4">
            <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-minus-circle"
                class="w-5 h-5 text-red-600"
              />
            </div>
            <div>
              <p class="font-medium">{{ expense.description }}</p>
              <p class="text-sm text-muted">{{ formatDate(expense.date) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span
              class="text-xs px-2 py-1 rounded-full"
              :class="getCategoryColor(expense.category)"
            >
              {{ expense.category }}
            </span>
            <span class="font-mono font-bold text-red-600">
              -{{ formatCurrency(expense.amount) }}
            </span>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
