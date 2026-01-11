<script setup lang="ts">
/**
 * 📊 Chart of Accounts Table Component
 */

interface Account {
  code: string;
  name: string;
  nameLao?: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
}

defineProps<{
  accounts: Account[];
}>();

const { formatCurrency } = useCurrency();
const { t } = useI18n();

const getAccountTypeColor = (type: string) => {
  switch (type) {
    case "asset": return "text-blue-600 dark:text-blue-400";
    case "liability": return "text-red-600 dark:text-red-400";
    case "equity": return "text-purple-600 dark:text-purple-400";
    case "revenue": return "text-green-600 dark:text-green-400";
    case "expense": return "text-orange-600 dark:text-orange-400";
    default: return "text-gray-600 dark:text-gray-400";
  }
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ t("accounting.chartOfAccounts") }}
        </h3>
        <UButton size="xs" variant="ghost" icon="i-heroicons-cog-6-tooth">
          {{ t("common.manage") }}
        </UButton>
      </div>
    </template>

    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <th class="pb-3 font-medium">{{ t("accounting.accountCode") }}</th>
            <th class="pb-3 font-medium">{{ t("accounting.accountName") }}</th>
            <th class="pb-3 font-medium">{{ t("accounting.accountType") }}</th>
            <th class="pb-3 font-medium text-right">{{ t("accounting.balance") }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
          <tr v-for="account in accounts" :key="account.code" class="text-sm">
            <td class="py-3 font-mono text-gray-600 dark:text-gray-400">
              {{ account.code }}
            </td>
            <td class="py-3 font-medium text-gray-900 dark:text-white">
              {{ account.name }}
              <span v-if="account.nameLao" class="text-xs text-gray-500 ml-1">({{ account.nameLao }})</span>
            </td>
            <td class="py-3">
              <span :class="getAccountTypeColor(account.type)" class="capitalize">
                {{ t(`accounting.types.${account.type}`) }}
              </span>
            </td>
            <td
              class="py-3 text-right font-medium"
              :class="account.type === 'expense' || account.type === 'liability' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'"
            >
              {{ formatCurrency(account.balance) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
