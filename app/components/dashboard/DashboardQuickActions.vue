<!-- components/dashboard/DashboardQuickActions.vue -->
<!-- ⚡ Quick Action Buttons -->
<script setup lang="ts">
const { t } = useI18n();

const actions = [
  {
    to: "/pos",
    icon: "i-heroicons-shopping-cart",
    label: "pos.terminal",
    color: "primary",
  },
  {
    to: "/pos/shift",
    icon: "i-heroicons-currency-dollar",
    label: "pos.shift.title",
    color: "green",
  },
  {
    to: "/pos/tables",
    icon: "i-heroicons-table-cells",
    label: "pos.tables.title",
    color: "indigo",
  },
  {
    to: "/kitchen",
    icon: "i-heroicons-fire",
    label: "kitchen.title",
    color: "orange",
  },
  {
    to: "/accounting/expenses",
    icon: "i-heroicons-arrow-trending-down",
    label: "accounting.tabs.expenses",
    color: "red",
  },
  {
    to: "/reports",
    icon: "i-heroicons-chart-bar-square",
    label: "reports.title",
    color: "purple",
  },
];
</script>

<template>
  <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
    <NuxtLinkLocale
      v-for="action in actions"
      :key="action.to"
      :to="action.to"
      class="group"
    >
      <div
        class="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 transition-colors text-center"
        :class="`hover:border-${action.color}-300 dark:hover:border-${action.color}-700`"
      >
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2"
          :class="`bg-${action.color}-100 dark:bg-${action.color}-900/30`"
        >
          <UIcon
            :name="action.icon"
            class="w-4 h-4"
            :class="`text-${action.color}-600 dark:text-${action.color}-400`"
          />
        </div>
        <p class="text-xs font-medium text-gray-900 dark:text-white">
          {{ t(action.label) }}
        </p>
      </div>
    </NuxtLinkLocale>
  </div>
</template>
