<script setup lang="ts">
/**
 * 📊 Accounting Overview Tab
 * Premium financial dashboard with KPIs, trends, and account overview
 */

interface Props {
  financialOverview: {
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
    accountsReceivable: number;
    accountsPayable: number;
    cashBalance: number;
    lightningBalance: number;
  };
  chartOfAccounts: Array<{
    code: string;
    name: string;
    nameLao?: string;
    type: string;
    balance: number;
  }>;
}

const props = defineProps<Props>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();

// Financial health indicator
const financialHealth = computed(() => {
  const { revenue, expenses, profit, accountsReceivable, accountsPayable } =
    props.financialOverview;
  if (revenue === 0 && expenses === 0)
    return { score: 50, label: "neutral", color: "gray" };

  let score = 50;
  if (profit > 0) score += 20;
  if (props.financialOverview.profitMargin > 10) score += 15;
  if (accountsReceivable > accountsPayable) score += 15;

  if (score >= 80) return { score, label: "excellent", color: "green" };
  if (score >= 60) return { score, label: "good", color: "blue" };
  if (score >= 40) return { score, label: "fair", color: "yellow" };
  return { score, label: "needsAttention", color: "red" };
});

// Colors for account types
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    asset: "text-blue-600 dark:text-blue-400",
    liability: "text-red-600 dark:text-red-400",
    equity: "text-purple-600 dark:text-purple-400",
    revenue: "text-green-600 dark:text-green-400",
    expense: "text-orange-600 dark:text-orange-400",
  };
  return colors[type] || "text-gray-600";
}

function getTypeBgColor(type: string): string {
  const colors: Record<string, string> = {
    asset: "bg-blue-50 dark:bg-blue-900/20",
    liability: "bg-red-50 dark:bg-red-900/20",
    equity: "bg-purple-50 dark:bg-purple-900/20",
    revenue: "bg-green-50 dark:bg-green-900/20",
    expense: "bg-orange-50 dark:bg-orange-900/20",
  };
  return colors[type] || "bg-gray-50";
}
</script>

<template>
  <div class="space-y-6">
    <!-- Financial Health Banner -->
    <div
      class="p-4 rounded-2xl border-2 flex items-center justify-between"
      :class="{
        'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800':
          financialHealth.color === 'green',
        'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800':
          financialHealth.color === 'blue',
        'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800':
          financialHealth.color === 'yellow',
        'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800':
          financialHealth.color === 'red',
        'bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700':
          financialHealth.color === 'gray',
      }"
    >
      <div class="flex items-center gap-4">
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center"
          :class="{
            'bg-green-100 dark:bg-green-800': financialHealth.color === 'green',
            'bg-blue-100 dark:bg-blue-800': financialHealth.color === 'blue',
            'bg-yellow-100 dark:bg-yellow-800':
              financialHealth.color === 'yellow',
            'bg-red-100 dark:bg-red-800': financialHealth.color === 'red',
            'bg-gray-100 dark:bg-gray-700': financialHealth.color === 'gray',
          }"
        >
          <UIcon
            :name="
              financialHealth.score >= 60
                ? 'i-heroicons-check-circle'
                : 'i-heroicons-exclamation-triangle'
            "
            class="w-7 h-7"
            :class="{
              'text-green-600 dark:text-green-400':
                financialHealth.color === 'green',
              'text-blue-600 dark:text-blue-400':
                financialHealth.color === 'blue',
              'text-yellow-600 dark:text-yellow-400':
                financialHealth.color === 'yellow',
              'text-red-600 dark:text-red-400': financialHealth.color === 'red',
              'text-gray-600 dark:text-gray-400':
                financialHealth.color === 'gray',
            }"
          />
        </div>
        <div>
          <p class="text-sm text-muted">Financial Health</p>
          <p
            class="text-xl font-bold capitalize"
            :class="`text-${financialHealth.color}-600 dark:text-${financialHealth.color}-400`"
          >
            {{
              financialHealth.label === "needsAttention"
                ? "Needs Attention"
                : financialHealth.label
            }}
          </p>
        </div>
      </div>
      <div class="text-right">
        <p
          class="text-3xl font-bold"
          :class="`text-${financialHealth.color}-600 dark:text-${financialHealth.color}-400`"
        >
          {{ financialHealth.score }}%
        </p>
      </div>
    </div>

    <!-- Primary KPIs - Gradient Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Revenue Card -->
      <div
        class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-5 text-white shadow-lg"
      >
        <div
          class="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"
        ></div>
        <UIcon
          name="i-heroicons-arrow-trending-up"
          class="w-8 h-8 mb-3 opacity-80"
        />
        <p class="text-sm opacity-80">{{ t("accounting.revenue") }}</p>
        <p class="text-2xl font-bold mt-1">
          {{ formatCurrency(financialOverview.revenue) }}
        </p>
      </div>

      <!-- Expenses Card -->
      <div
        class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-5 text-white shadow-lg"
      >
        <div
          class="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"
        ></div>
        <UIcon
          name="i-heroicons-arrow-trending-down"
          class="w-8 h-8 mb-3 opacity-80"
        />
        <p class="text-sm opacity-80">{{ t("accounting.expenseLabel") }}</p>
        <p class="text-2xl font-bold mt-1">
          {{ formatCurrency(financialOverview.expenses) }}
        </p>
      </div>

      <!-- Profit Card -->
      <div
        class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-lg"
      >
        <div
          class="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"
        ></div>
        <UIcon name="i-heroicons-chart-bar" class="w-8 h-8 mb-3 opacity-80" />
        <p class="text-sm opacity-80">{{ t("accounting.profit") }}</p>
        <p class="text-2xl font-bold mt-1">
          {{ formatCurrency(financialOverview.profit) }}
        </p>
        <p class="text-xs mt-1 opacity-70">
          {{ financialOverview.profitMargin }}% {{ t("accounting.margin") }}
        </p>
      </div>

      <!-- Lightning Balance Card -->
      <div
        class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg"
      >
        <div
          class="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"
        ></div>
        <UIcon name="i-heroicons-bolt" class="w-8 h-8 mb-3 opacity-80" />
        <p class="text-sm opacity-80">{{ t("accounting.lightningBalance") }}</p>
        <p class="text-2xl font-bold mt-1">
          {{ financialOverview.lightningBalance.toLocaleString() }} sats
        </p>
      </div>
    </div>

    <!-- Secondary KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard class="hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
            <UIcon
              name="i-heroicons-arrow-down-tray"
              class="w-6 h-6 text-green-600 dark:text-green-400"
            />
          </div>
          <div>
            <p class="text-sm text-muted">
              {{ t("accounting.accountsReceivable") }}
            </p>
            <p class="text-xl font-bold text-green-600 dark:text-green-400">
              {{ formatCurrency(financialOverview.accountsReceivable) }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard class="hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
            <UIcon
              name="i-heroicons-arrow-up-tray"
              class="w-6 h-6 text-red-600 dark:text-red-400"
            />
          </div>
          <div>
            <p class="text-sm text-muted">
              {{ t("accounting.accountsPayable") }}
            </p>
            <p class="text-xl font-bold text-red-600 dark:text-red-400">
              {{ formatCurrency(financialOverview.accountsPayable) }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard class="hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <UIcon
              name="i-heroicons-banknotes"
              class="w-6 h-6 text-blue-600 dark:text-blue-400"
            />
          </div>
          <div>
            <p class="text-sm text-muted">{{ t("accounting.cashBalance") }}</p>
            <p class="text-xl font-bold text-blue-600 dark:text-blue-400">
              {{ formatCurrency(financialOverview.cashBalance) }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Quick Links -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <NuxtLinkLocale to="/accounting/accounts">
        <UCard
          class="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] hover:border-blue-300 dark:hover:border-blue-700"
        >
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-rectangle-stack"
                class="w-5 h-5 text-blue-600 dark:text-blue-400"
              />
            </div>
            <span class="font-medium">{{
              t("accounting.chartOfAccounts")
            }}</span>
          </div>
        </UCard>
      </NuxtLinkLocale>
      <NuxtLinkLocale to="/accounting/ledger">
        <UCard
          class="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] hover:border-purple-300 dark:hover:border-purple-700"
        >
          <div class="flex items-center gap-3">
            <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-book-open"
                class="w-5 h-5 text-purple-600 dark:text-purple-400"
              />
            </div>
            <span class="font-medium">{{ t("accounting.ledger.title") }}</span>
          </div>
        </UCard>
      </NuxtLinkLocale>
      <NuxtLinkLocale to="/accounting/expenses">
        <UCard
          class="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] hover:border-red-300 dark:hover:border-red-700"
        >
          <div class="flex items-center gap-3">
            <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-credit-card"
                class="w-5 h-5 text-red-600 dark:text-red-400"
              />
            </div>
            <span class="font-medium">{{
              t("accounting.expenses.title")
            }}</span>
          </div>
        </UCard>
      </NuxtLinkLocale>
      <NuxtLinkLocale to="/invoicing">
        <UCard
          class="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] hover:border-green-300 dark:hover:border-green-700"
        >
          <div class="flex items-center gap-3">
            <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-document-text"
                class="w-5 h-5 text-green-600 dark:text-green-400"
              />
            </div>
            <span class="font-medium">{{ t("accounting.tabs.invoices") }}</span>
          </div>
        </UCard>
      </NuxtLinkLocale>
    </div>

    <!-- Chart of Accounts Summary -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <UIcon
                name="i-heroicons-table-cells"
                class="w-5 h-5 text-gray-600 dark:text-gray-400"
              />
            </div>
            <h3 class="text-lg font-semibold">
              {{ t("accounting.chartOfAccounts") }}
            </h3>
          </div>
          <NuxtLinkLocale to="/accounting/accounts">
            <UButton size="sm" variant="ghost" icon="i-heroicons-arrow-right">
              {{ t("common.viewAll") }}
            </UButton>
          </NuxtLinkLocale>
        </div>
      </template>

      <!-- Empty State -->
      <div v-if="chartOfAccounts.length === 0" class="text-center py-12">
        <div
          class="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center"
        >
          <UIcon name="i-heroicons-table-cells" class="w-8 h-8 text-muted" />
        </div>
        <h4 class="font-medium mb-1">{{ t("accounting.noAccounts") }}</h4>
        <p class="text-sm text-muted mb-4">
          Set up your chart of accounts to start tracking finances
        </p>
        <NuxtLinkLocale to="/accounting/accounts">
          <UButton icon="i-heroicons-plus">Create Account</UButton>
        </NuxtLinkLocale>
      </div>

      <!-- Accounts List -->
      <div
        v-else
        class="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto"
      >
        <div
          v-for="account in chartOfAccounts.slice(0, 10)"
          :key="account.code"
          class="py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-2 -mx-2 transition-colors"
        >
          <div class="flex items-center gap-3">
            <span
              class="font-mono text-sm px-2.5 py-1 rounded-lg"
              :class="getTypeBgColor(account.type)"
            >
              {{ account.code }}
            </span>
            <div>
              <span class="font-medium">{{ account.name }}</span>
              <span v-if="account.nameLao" class="text-sm text-muted ml-2">{{
                account.nameLao
              }}</span>
            </div>
            <UBadge
              :class="getTypeColor(account.type)"
              variant="subtle"
              size="xs"
            >
              {{ t(`accounting.types.${account.type}`) }}
            </UBadge>
          </div>
          <span
            class="font-mono font-medium"
            :class="
              account.balance >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            "
          >
            {{ formatCurrency(account.balance) }}
          </span>
        </div>
      </div>
    </UCard>
  </div>
</template>
