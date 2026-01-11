<template>
  <!-- Mobile Bottom Navigation -->
  <nav
    class="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 px-2 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl safe-area-bottom"
  >
    <NuxtLinkLocale
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center justify-center flex-1 py-2 transition-colors"
      :class="[
        isActive(item.to)
          ? 'text-primary-600 dark:text-primary-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
      ]"
    >
      <div
        class="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
        :class="[
          isActive(item.to)
            ? 'bg-primary-100 dark:bg-primary-900/30'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800',
        ]"
      >
        <Icon :name="item.icon" size="22" />
        <!-- Badge for orders -->
        <span
          v-if="item.badge && item.badge > 0"
          class="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-xs font-bold text-white bg-red-500 rounded-full"
        >
          {{ item.badge > 9 ? "9+" : item.badge }}
        </span>
      </div>
      <span class="text-xs mt-0.5 font-medium">{{ item.label }}</span>
    </NuxtLinkLocale>

    <!-- More Menu (opens sidebar) -->
    <button
      class="flex flex-col items-center justify-center flex-1 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      @click="$emit('open-menu')"
    >
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Icon name="i-heroicons-squares-2x2" size="22" />
      </div>
      <span class="text-xs mt-0.5 font-medium">{{
        $t("navigation.more", "More")
      }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute();
const { t } = useI18n();
const ordersStore = useOrders();

defineEmits(["open-menu"]);

// Core navigation items for bottom bar
const navItems = computed(() => [
  {
    label: t("navigation.dashboard", "Home"),
    to: "/",
    icon: "i-heroicons-home",
  },
  {
    label: t("navigation.pos", "POS"),
    to: "/pos",
    icon: "i-heroicons-bolt",
  },
  {
    label: t("navigation.orders", "Orders"),
    to: "/orders",
    icon: "i-heroicons-shopping-bag",
    badge: ordersStore.pendingOrders.value?.length || 0,
  },
  {
    label: t("navigation.products", "Products"),
    to: "/products",
    icon: "i-heroicons-cube",
  },
]);

function isActive(path: string): boolean {
  if (path === "/") {
    return route.path === "/";
  }
  return route.path.startsWith(path);
}
</script>

<style scoped>
/* Safe area inset for mobile devices with home indicators */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
