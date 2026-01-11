<template>
  <div class="flex flex-col h-full w-64 bg-white dark:bg-gray-900">
    <!-- Header with gradient -->
    <div
      class="px-4 py-4 bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent border-b border-gray-100 dark:border-gray-800"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20"
        >
          <span class="text-white text-lg">⚡</span>
        </div>
        <div>
          <h2 class="font-bold text-gray-900 dark:text-white">bnos.space</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ $t("navigation.menu", "Menu") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Navigation Groups -->
    <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-4">
      <!-- Main Navigation -->
      <div>
        <p
          class="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider"
        >
          {{ $t("navigation.main", "Main") }}
        </p>
        <ul class="space-y-1">
          <li v-for="item in mainItems" :key="item.to">
            <NuxtLinkLocale
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
              :class="[
                isActive(item.to)
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
              ]"
              @click="$emit('navigate')"
            >
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                :class="[
                  isActive(item.to)
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                    : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700',
                ]"
              >
                <Icon :name="item.icon" size="20" />
              </div>
              <span class="font-medium text-sm">{{ item.label }}</span>
              <Icon
                v-if="isActive(item.to)"
                name="i-heroicons-chevron-right"
                size="16"
                class="ml-auto text-primary-400"
              />
            </NuxtLinkLocale>
          </li>
        </ul>
      </div>

      <!-- Business -->
      <div v-if="businessItems.length > 0">
        <p
          class="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider"
        >
          {{ $t("navigation.business", "Business") }}
        </p>
        <ul class="space-y-1">
          <li v-for="item in businessItems" :key="item.to">
            <NuxtLinkLocale
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
              :class="[
                isActive(item.to)
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
              ]"
              @click="$emit('navigate')"
            >
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                :class="[
                  isActive(item.to)
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                    : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700',
                ]"
              >
                <Icon :name="item.icon" size="20" />
              </div>
              <span class="font-medium text-sm">{{ item.label }}</span>
              <Icon
                v-if="isActive(item.to)"
                name="i-heroicons-chevron-right"
                size="16"
                class="ml-auto text-primary-400"
              />
            </NuxtLinkLocale>
          </li>
        </ul>
      </div>

      <!-- Management -->
      <div v-if="managementItems.length > 0">
        <p
          class="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider"
        >
          {{ $t("navigation.management", "Management") }}
        </p>
        <ul class="space-y-1">
          <li v-for="item in managementItems" :key="item.to">
            <NuxtLinkLocale
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
              :class="[
                isActive(item.to)
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
              ]"
              @click="$emit('navigate')"
            >
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                :class="[
                  isActive(item.to)
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                    : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700',
                ]"
              >
                <Icon :name="item.icon" size="20" />
              </div>
              <span class="font-medium text-sm">{{ item.label }}</span>
              <Icon
                v-if="isActive(item.to)"
                name="i-heroicons-chevron-right"
                size="16"
                class="ml-auto text-primary-400"
              />
            </NuxtLinkLocale>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Footer with Settings -->
    <div class="p-3 border-t border-gray-100 dark:border-gray-800">
      <NuxtLinkLocale
        to="/settings"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
        :class="[
          isActive('/settings')
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
        ]"
        @click="$emit('navigate')"
      >
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          :class="[
            isActive('/settings')
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700',
          ]"
        >
          <Icon name="i-heroicons-cog-6-tooth" size="20" />
        </div>
        <span class="font-medium text-sm">{{
          $t("navigation.settings", "Settings")
        }}</span>
      </NuxtLinkLocale>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits(["navigate"]);

const route = useRoute();
const { t } = useI18n();
const shop = useShop();

function isActive(path: string): boolean {
  if (path === "/") return route.path === "/";
  return route.path.startsWith(path);
}

// Define navigation groups
const allItems = computed(() => ({
  main: [
    {
      label: t("navigation.dashboard"),
      to: "/",
      icon: "i-heroicons-home",
      feature: null,
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
  ],
  business: [
    {
      label: t("navigation.products"),
      to: "/products",
      icon: "i-heroicons-cube",
      feature: "products",
    },
    {
      label: t("navigation.customers"),
      to: "/customers",
      icon: "i-heroicons-users",
      feature: "customers",
    },
    {
      label: t("navigation.inventory"),
      to: "/inventory",
      icon: "i-heroicons-archive-box",
      feature: "inventory",
    },
    {
      label: t("navigation.reports"),
      to: "/reports",
      icon: "i-heroicons-chart-bar",
      feature: "reports",
    },
  ],
  management: [
    {
      label: t("navigation.kitchen"),
      to: "/kitchen",
      icon: "i-heroicons-fire",
      feature: "kitchen",
    },
    {
      label: t("navigation.accounting"),
      to: "/accounting",
      icon: "i-heroicons-calculator",
      feature: "accounting",
    },
    {
      label: t("memberships.title", "Memberships"),
      to: "/memberships",
      icon: "i-heroicons-credit-card",
      feature: "memberships",
    },
  ],
}));

// Filter based on enabled features
const enabledFeatures = computed(
  () => shop.shopConfig.value?.enabledFeatures || {}
);

const filterItems = (
  items: Array<{
    label: string;
    to: string;
    icon: string;
    feature: string | null;
  }>
) => {
  return items.filter((item) => {
    if (!item.feature) return true;
    return (enabledFeatures.value as any)[item.feature] === true;
  });
};

const mainItems = computed(() => filterItems(allItems.value.main));
const businessItems = computed(() => filterItems(allItems.value.business));
const managementItems = computed(() => filterItems(allItems.value.management));
</script>

<style scoped>
/* Hide scrollbar but keep scroll functionality */
nav {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
nav::-webkit-scrollbar {
  display: none;
}
</style>
