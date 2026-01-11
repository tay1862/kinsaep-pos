<template>
  <div class="h-dvh flex flex-col">
    <!-- Top Header (always visible) -->
    <AppHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />

    <div class="flex-1 flex overflow-hidden">
      <!-- Desktop Sidebar - Always visible on large screens -->
      <aside
        v-if="showNavigation"
        class="shrink-0 hidden lg:block border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
      >
        <AppSideBar @navigate="sidebarOpen = false" />
      </aside>

      <!-- Mobile/Tablet Drawer Sidebar -->
      <UDrawer
        v-model:open="sidebarOpen"
        title="Menu"
        description="Side Menu"
        direction="left"
      >
        <template #content>
          <div class="h-full">
            <AppSideBar @navigate="sidebarOpen = false" />
          </div>
        </template>
      </UDrawer>

      <!-- Main Content -->
      <main
        class="flex-1 overflow-y-auto"
        :class="showNavigation ? 'pb-16 lg:pb-0' : ''"
      >
        <slot />
      </main>
    </div>

    <!-- Mobile Bottom Navigation (hidden when sidebar is open) -->
    <AppBottomNav
      v-if="!sidebarOpen && showNavigation"
      @open-menu="sidebarOpen = true"
    />

    <!-- Help System -->
    <CommonHelpButton />
    <CommonHelpDrawer />
  </div>
</template>

<script setup lang="ts">
const appConfig = useAppConfig();
const { initSystemNotifications, initPosAlerts } = useNotifications();
const usersComposable = useUsers();
const shop = useShop();
const setupCheck = useSetupCheck();

// Sidebar state for mobile
const sidebarOpen = ref(false);

// Get navigation visibility from page (if provided)
const pageNavigationControl = inject<Ref<boolean> | undefined>(
  "shouldShowNavigation",
  undefined
);

// Check if navigation should be shown
const showNavigation = computed(() => {
  // If page provides explicit control, use that (more accurate)
  if (pageNavigationControl !== undefined) {
    return pageNavigationControl.value;
  }
  // Otherwise use fast localStorage check from composable
  return setupCheck.isSetupComplete.value;
});

// Close sidebar on route change
const route = useRoute();
watch(
  () => route.path,
  () => {
    sidebarOpen.value = false;
  }
);

// Load saved theme color on layout mount
onMounted(async () => {
  const savedColor = localStorage.getItem("theme-color");
  if (savedColor) {
    appConfig.ui.colors.primary = savedColor;
  }

  // Load company code from localStorage first (required for POS alerts)
  // This will auto-migrate old 8-char hashes to new 16-char format
  const company = useCompany();
  await company.loadCompanyCode();

  // Initialize system notifications
  initSystemNotifications();

  // Initialize POS alerts (waiter calls, bill requests, new orders via Nostr)
  // This must run AFTER company code is loaded to get ownerPubkey
  initPosAlerts();

  // Initialize users and shop in background (non-blocking)
  // Navigation is already shown via localStorage check above
  usersComposable.initialize();
  shop.init();
});
</script>
