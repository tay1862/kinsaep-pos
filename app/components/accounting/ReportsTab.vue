<script setup lang="ts">
/**
 * 📊 Accounting Reports Tab
 * Financial report generation and export with date range selection
 */

const emit = defineEmits<{
  export: [type: string, dateRange: { start: string; end: string }];
}>();

const { t } = useI18n();

// Date range state
const dateRange = reactive({
  start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0] as string,
  end: new Date().toISOString().split("T")[0] as string,
});

const reports = [
  {
    type: "income-statement",
    key: "incomeStatement",
    icon: "i-heroicons-document-chart-bar",
    color: "green",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400",
    borderColor: "hover:border-green-300 dark:hover:border-green-700",
  },
  {
    type: "balance-sheet",
    key: "balanceSheet",
    icon: "i-heroicons-scale",
    color: "blue",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    borderColor: "hover:border-blue-300 dark:hover:border-blue-700",
  },
  {
    type: "cash-flow",
    key: "cashFlow",
    icon: "i-heroicons-banknotes",
    color: "purple",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
    borderColor: "hover:border-purple-300 dark:hover:border-purple-700",
  },
  {
    type: "trial-balance",
    key: "trialBalance",
    icon: "i-heroicons-calculator",
    color: "amber",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderColor: "hover:border-amber-300 dark:hover:border-amber-700",
  },
  {
    type: "general-ledger",
    key: "generalLedger",
    icon: "i-heroicons-book-open",
    color: "indigo",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    borderColor: "hover:border-indigo-300 dark:hover:border-indigo-700",
  },
  {
    type: "tax-report",
    key: "taxReport",
    icon: "i-heroicons-receipt-percent",
    color: "red",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
    borderColor: "hover:border-red-300 dark:hover:border-red-700",
  },
];

function handleExport(type: string) {
  emit("export", type, dateRange);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Date Range Selector -->
    <UCard>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <UIcon
              name="i-heroicons-calendar-days"
              class="w-5 h-5 text-primary-600 dark:text-primary-400"
            />
          </div>
          <div>
            <h4 class="font-medium">{{ t("accounting.reports.dateRange") }}</h4>
            <p class="text-sm text-muted">
              {{ t("accounting.reports.exportAsCSV") }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UInput
            v-model="dateRange.start"
            type="date"
            size="sm"
            class="w-36"
          />
          <span class="text-muted">→</span>
          <UInput v-model="dateRange.end" type="date" size="sm" class="w-36" />
        </div>
      </div>
    </UCard>

    <!-- Report Cards -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            {{ t("accounting.reports.title") }}
          </h3>
          <UBadge variant="subtle" color="success">
            <UIcon name="i-heroicons-arrow-down-tray" class="w-3 h-3 mr-1" />
            CSV
          </UBadge>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          v-for="report in reports"
          :key="report.type"
          class="group text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary-500"
          :class="report.borderColor"
          @click="handleExport(report.type)"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-4">
              <div
                class="p-3 rounded-lg transition-transform group-hover:scale-110"
                :class="report.bgColor"
              >
                <UIcon
                  :name="report.icon"
                  class="w-6 h-6"
                  :class="report.iconColor"
                />
              </div>
              <div>
                <h4
                  class="font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                >
                  {{ t(`accounting.reports.${report.key}`) }}
                </h4>
                <p class="text-sm text-muted">
                  {{ t(`accounting.reports.${report.key}Desc`) }}
                </p>
              </div>
            </div>
            <UIcon
              name="i-heroicons-arrow-down-tray"
              class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors opacity-0 group-hover:opacity-100"
            />
          </div>
        </button>
      </div>
    </UCard>

    <!-- Quick Links to Subpages -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <NuxtLinkLocale to="/accounting/ledger">
        <UCard
          class="hover:shadow-lg transition-all cursor-pointer text-center py-4 hover:scale-[1.02]"
        >
          <UIcon
            name="i-heroicons-document-magnifying-glass"
            class="w-8 h-8 text-primary mx-auto mb-2"
          />
          <p class="font-medium">{{ t("accounting.ledger.title") }}</p>
        </UCard>
      </NuxtLinkLocale>
      <NuxtLinkLocale to="/accounting/accounts">
        <UCard
          class="hover:shadow-lg transition-all cursor-pointer text-center py-4 hover:scale-[1.02]"
        >
          <UIcon
            name="i-heroicons-rectangle-stack"
            class="w-8 h-8 text-primary mx-auto mb-2"
          />
          <p class="font-medium">{{ t("accounting.accounts.title") }}</p>
        </UCard>
      </NuxtLinkLocale>
      <NuxtLinkLocale to="/accounting/expenses">
        <UCard
          class="hover:shadow-lg transition-all cursor-pointer text-center py-4 hover:scale-[1.02]"
        >
          <UIcon
            name="i-heroicons-credit-card"
            class="w-8 h-8 text-primary mx-auto mb-2"
          />
          <p class="font-medium">{{ t("accounting.expenses.title") }}</p>
        </UCard>
      </NuxtLinkLocale>
      <NuxtLinkLocale to="/invoicing">
        <UCard
          class="hover:shadow-lg transition-all cursor-pointer text-center py-4 hover:scale-[1.02]"
        >
          <UIcon
            name="i-heroicons-document-text"
            class="w-8 h-8 text-primary mx-auto mb-2"
          />
          <p class="font-medium">{{ t("accounting.invoices") }}</p>
        </UCard>
      </NuxtLinkLocale>
    </div>
  </div>
</template>
