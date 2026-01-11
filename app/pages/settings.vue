<script setup lang="ts">
import { settingsNavigation } from '~/config/settings-navigation';

definePageMeta({
  middleware: ["auth"],
});

useHead({
  title: "System Settings",
});

const { t } = useI18n();
const route = useRoute();

const navItems = computed(() => 
  settingsNavigation
    .sort((a, b) => a.order - b.order)
    .map(item => {
      const parts = item.label.split('.');
      const fallback = parts[parts.length - 1] || 'Settings';
      return {
        label: t(item.label, fallback),
        to: item.to,
        icon: item.icon,
      };
    })
);

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + "/");
};
</script>

<template>
  <div class="flex h-full">
    <!-- Sidebar Navigation -->
    <aside
      class="w-64 border-r hidden md:block border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-1 overflow-y-auto"
    >
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white px-3">
          {{ $t("settings.title") }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 px-3">
          {{ $t("settings.description") }}
        </p>
      </div>

      <nav class="space-y-1">
        <NuxtLinkLocale
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="[
            isActive(item.to)
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
          ]"
        >
          <UIcon :name="item.icon" class="w-5 h-5 shrink-0" />
          <span>{{ item.label }}</span>
        </NuxtLinkLocale>
      </nav>

      <!-- Quick Actions -->
      <div class="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
        <p
          class="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2"
        >
          {{ $t("dashboard.quickActions") }}
        </p>
        <NuxtLinkLocale
          to="/pos"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <UIcon name="i-heroicons-shopping-cart" class="w-5 h-5" />
          <span>{{ $t("pos.terminal") }}</span>
        </NuxtLinkLocale>
        <NuxtLinkLocale
          to="/"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <UIcon name="i-heroicons-home" class="w-5 h-5" />
          <span>{{ $t("navigation.dashboard") }}</span>
        </NuxtLinkLocale>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
      <NuxtPage />
    </main>
  </div>
</template>

<style scoped></style>
