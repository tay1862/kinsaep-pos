<script setup lang="ts">
/**
 * 💰 Financial KPIs Component
 * Displays revenue, expenses, profit, and Lightning balance cards
 */

interface FinancialData {
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  accountsReceivable: number;
  accountsPayable: number;
  cashBalance: number;
  lightningBalance: number;
}

const props = defineProps<{
  data: FinancialData;
}>();

const { formatCurrency } = useCurrency();
const { t } = useI18n();
</script>

<template>
  <div class="space-y-4">
    <!-- Primary KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Revenue -->
      <UCard class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-green-600 dark:text-green-400">
              {{ t("accounting.revenue") }}
            </p>
            <p class="text-2xl font-bold text-green-700 dark:text-green-300">
              {{ formatCurrency(data.revenue) }}
            </p>
          </div>
          <div class="p-3 bg-green-200 dark:bg-green-800 rounded-full">
            <UIcon name="i-heroicons-arrow-trending-up" class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </UCard>

      <!-- Expenses -->
      <UCard class="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-red-600 dark:text-red-400">
              {{ t("accounting.expenses") }}
            </p>
            <p class="text-2xl font-bold text-red-700 dark:text-red-300">
              {{ formatCurrency(data.expenses) }}
            </p>
          </div>
          <div class="p-3 bg-red-200 dark:bg-red-800 rounded-full">
            <UIcon name="i-heroicons-arrow-trending-down" class="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </UCard>

      <!-- Profit -->
      <UCard class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-blue-600 dark:text-blue-400">
              {{ t("accounting.profit") }}
            </p>
            <p class="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {{ formatCurrency(data.profit) }}
            </p>
            <p class="text-xs text-blue-500 dark:text-blue-400">
              {{ data.profitMargin }}% {{ t("accounting.margin") }}
            </p>
          </div>
          <div class="p-3 bg-blue-200 dark:bg-blue-800 rounded-full">
            <UIcon name="i-heroicons-chart-bar" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </UCard>

      <!-- Lightning Balance -->
      <UCard class="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-amber-600 dark:text-amber-400">
              ⚡ {{ t("accounting.lightningBalance") }}
            </p>
            <p class="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {{ data.lightningBalance.toLocaleString() }} sats
            </p>
          </div>
          <div class="p-3 bg-amber-200 dark:bg-amber-800 rounded-full">
            <UIcon name="i-heroicons-bolt" class="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Secondary KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Accounts Receivable -->
      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ t("accounting.accountsReceivable") }}
            </p>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(data.accountsReceivable) }}
            </p>
          </div>
        </div>
      </UCard>

      <!-- Accounts Payable -->
      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <UIcon name="i-heroicons-arrow-up-tray" class="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ t("accounting.accountsPayable") }}
            </p>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(data.accountsPayable) }}
            </p>
          </div>
        </div>
      </UCard>

      <!-- Cash Balance -->
      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ t("accounting.cashBalance") }}
            </p>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(data.cashBalance) }}
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
