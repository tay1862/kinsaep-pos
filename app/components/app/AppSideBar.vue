<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900 p-2">
    <!-- Navigation Items -->
    <ul
      class="p-1 flex-1 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
      <li v-for="(item, index) in items" :key="index">
        <NuxtLinkLocale :to="item.to"
          class="flex p-2 transition-all justify-center size-12 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 items-center group relative"
          active-class="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
          @click="$emit('navigate')">
          <Icon :name="item.icon" size="24" />
          <!-- Tooltip -->
          <span
            class="absolute left-full ml-2 px-2 py-1 bg-primary-600 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {{ item.label }}
          </span>
        </NuxtLinkLocale>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
defineEmits(["navigate"]);

const { t } = useI18n();
const shop = useShop();

// All navigation items with their feature key
const allItems = computed(() => [
  {
    label: t("navigation.dashboard"),
    to: "/",
    icon: "i-heroicons-home",
    feature: null, // Always visible
  },
  {
    label: t("navigation.pos"),
    to: "/pos",
    icon: "i-heroicons-bolt",
    feature: "pos",
  },
  {
    label: t("navigation.orders"),
    to: "/orders",
    icon: "i-heroicons-shopping-bag",
    feature: "orders",
  },
  {
    label: t("navigation.products"),
    to: "/products",
    icon: "i-heroicons-cube",
    feature: "products",
  },
  {
    label: "Recipes",
    to: "/recipes",
    icon: "i-heroicons-beaker",
    feature: "recipes",
  },
  {
    label: "Ingredients",
    to: "/ingredients",
    icon: "i-heroicons-variable",
    feature: "ingredients",
  },
  {
    label: t("navigation.customers", "Customers"),
    to: "/customers",
    icon: "i-heroicons-users",
    feature: "customers",
  },
  {
    label: t("memberships.title", "Memberships"),
    to: "/memberships",
    icon: "i-heroicons-credit-card",
    feature: "memberships",
  },
  {
    label: t("navigation.inventory", "Inventory"),
    to: "/inventory",
    icon: "i-heroicons-archive-box",
    feature: "inventory",
  },
  {
    label: t("navigation.kitchen", "Kitchen"),
    to: "/kitchen",
    icon: "i-heroicons-fire",
    feature: "kitchen",
  },
  {
    label: t("navigation.reports", "Reports"),
    to: "/reports",
    icon: "i-heroicons-chart-bar",
    feature: "reports",
  },
  {
    label: t("navigation.accounting", "Accounting"),
    to: "/accounting",
    icon: "i-heroicons-calculator",
    feature: "accounting",
  },
  {
    label: t("navigation.invoicing", "Invoicing"),
    to: "/invoicing",
    icon: "i-heroicons-document-text",
    feature: "invoicing",
  },
  {
    label: t("navigation.delivery", "Delivery"),
    to: "/delivery",
    icon: "i-heroicons-truck",
    feature: "delivery",
  },
  {
    label: t("navigation.contracts", "Contracts"),
    to: "/contracts",
    icon: "i-heroicons-clipboard-document-check",
    feature: "contracts",
  },
  {
    label: t("navigation.settings", "Settings"),
    to: "/settings",
    icon: "i-heroicons-cog-6-tooth",
    feature: "settings",
  },
]);

// Filter items based on enabled features
const items = computed(() => {
  const enabledFeatures = shop.shopConfig.value?.enabledFeatures;
  if (!enabledFeatures) return allItems.value;

  return allItems.value.filter((item) => {
    // Always show items without a feature requirement
    if (!item.feature) return true;
    // Check if feature is enabled
    return (enabledFeatures as any)[item.feature] === true;
  });
});
</script>

<style scoped>
/* Hide scrollbar but keep scroll functionality */
ul {
  -ms-overflow-style: none;
  /* IE and Edge */
  scrollbar-width: none;
  /* Firefox */
}

ul::-webkit-scrollbar {
  display: none;
  /* Chrome, Safari and Opera */
}
</style>
