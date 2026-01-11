<!-- pages/index.vue -->
<!-- 📊 Dashboard - Real-time Sales KPIs & Business Overview -->
<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

useHead({
  title: "bnos.space - BNOS Business Operation System",
  meta: [
    {
      name: "description",
      content: "BNOS Business Operation System",
    },
    {
      name: "keywords",
      content: "POS, bnos.space",
    },
    {
      name: "author",
      content: "bnos.space",
    },
    {
      name: "robots",
      content: "index, follow",
    },
  ],
});

const { t } = useI18n();
const ordersStore = useOrders();
const productsStore = useProducts();
const shop = useShop();
const company = useCompany();

// Tell layout whether to show navigation
const shouldShowNavigation = computed(() => {
  // Only show navigation when:
  // 1. NOT showing welcome screen
  // 2. NOT showing setup wizard
  // 3. Setup is actually complete
  return !showWelcome.value && !showSetup.value && shop.isSetupComplete.value;
});

// Provide to layout
provide("shouldShowNavigation", shouldShowNavigation);

// ============================================
// State
// ============================================
const selectedPeriod = ref<"today" | "week" | "month">("today");
const isInitialLoad = ref(true);
const isRefreshing = ref(false);
const showWelcome = ref(false); // Show choice screen
const showSetup = ref(false); // Show owner setup wizard
const showOnboardingChecklist = ref(false); // Show post-setup checklist

// Current time for greeting
const currentTime = ref(new Date());
const greeting = computed(() => {
  const hour = currentTime.value.getHours();
  if (hour < 12) return { text: t("dashboard.greeting.morning"), emoji: "🌅" };
  if (hour < 17)
    return { text: t("dashboard.greeting.afternoon"), emoji: "☀️" };
  if (hour < 21) return { text: t("dashboard.greeting.evening"), emoji: "🌆" };
  return { text: t("dashboard.greeting.night"), emoji: "🌙" };
});

// Finance health score
const financeHealth = computed(() => {
  const change = todayStats.value.revenueChange;
  if (change >= 20) return { score: "Excellent", color: "green", value: 95 };
  if (change >= 10) return { score: "Great", color: "green", value: 85 };
  if (change >= 0) return { score: "Good", color: "blue", value: 70 };
  if (change >= -10) return { score: "Fair", color: "yellow", value: 55 };
  return { score: "Needs Attention", color: "red", value: 40 };
});

// ============================================
// Computed - Check states
// ============================================
const hasCachedData = computed(() => {
  return (
    ordersStore.orders.value.length > 0 ||
    productsStore.products.value.length > 0
  );
});

// Check if user is new (no setup AND no company code)
const isNewUser = computed(() => {
  return (
    !shop.isSetupComplete.value &&
    !company.hasCompanyCode.value &&
    !hasCachedData.value
  );
});

// Check if needs owner setup
// IMPORTANT: If company code is enabled (user joined as staff), they should NOT see setup
// needsSetup only shows when:
// 1. Setup not complete
// 2. Company code exists but NOT enabled (means owner created code but didn't finish setup)
// 3. No cached data
const needsSetup = computed(() => {
  // If company code is enabled, user joined as staff - skip setup
  if (company.isCompanyCodeEnabled.value) {
    return false;
  }
  return !shop.isSetupComplete.value && !hasCachedData.value;
});

// ============================================
// Computed - Dashboard KPIs
// ============================================
const kpis = computed(() => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const startDate =
    selectedPeriod.value === "today"
      ? today
      : selectedPeriod.value === "week"
      ? weekStart
      : monthStart;

  const periodOrders = ordersStore.orders.value.filter((o) => {
    const orderDate = new Date(o.date);
    return orderDate >= startDate && o.status === "completed";
  });

  const totalRevenue = periodOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = periodOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const cashSales = periodOrders
    .filter((o) => o.paymentMethod === "cash")
    .reduce((sum, o) => sum + o.total, 0);
  const lightningSales = periodOrders
    .filter((o) =>
      ["lightning", "bolt12", "lnurl"].includes(o.paymentMethod || "")
    )
    .reduce((sum, o) => sum + o.total, 0);
  const otherSales = totalRevenue - cashSales - lightningSales;

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    cashSales,
    lightningSales,
    otherSales,
  };
});

// Today's stats
const todayStats = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = ordersStore.orders.value.filter((o) => {
    const orderDate = new Date(o.date);
    return orderDate >= today && o.status === "completed";
  });

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayOrders = ordersStore.orders.value.filter((o) => {
    const orderDate = new Date(o.date);
    return (
      orderDate >= yesterday && orderDate < today && o.status === "completed"
    );
  });

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + o.total, 0);
  const revenueChange =
    yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 0;

  return { revenue: todayRevenue, orders: todayOrders.length, revenueChange };
});

// Top products
const topProducts = computed(() => {
  const productSales = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  ordersStore.orders.value
    .filter((o) => new Date(o.date) >= today && o.status === "completed")
    .forEach((order) => {
      order.items?.forEach((item) => {
        const existing = productSales.get(item.productId) || {
          name: item.product?.name || "Unknown",
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.total;
        productSales.set(item.productId, existing);
      });
    });

  return Array.from(productSales.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
});

// Hourly sales
const hourlySales = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hourlyData = Array(24)
    .fill(0)
    .map((_, hour) => ({
      hour: hour.toString().padStart(2, "0") + ":00",
      sales: 0,
      orders: 0,
    }));

  ordersStore.orders.value
    .filter((o) => new Date(o.date) >= today && o.status === "completed")
    .forEach((order) => {
      const hour = new Date(order.date).getHours();
      const hourData = hourlyData[hour];
      if (hourData) {
        hourData.sales += order.total;
        hourData.orders += 1;
      }
    });

  return hourlyData;
});

// Peak hour
const peakHour = computed(() => {
  let maxHour = { hour: "-", sales: 0 };
  hourlySales.value.forEach((h) => {
    if (h.sales > maxHour.sales) maxHour = h;
  });
  return maxHour;
});

// Low stock & recent orders
const lowStockProducts = computed(() =>
  productsStore.lowStockProducts.value.slice(0, 5)
);
const recentOrders = computed(() => {
  return [...ordersStore.orders.value]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
});

// ============================================
// Methods
// ============================================
const handleSetupComplete = () => {
  showSetup.value = false;
  showWelcome.value = false;
  // Show onboarding checklist after setup
  showOnboardingChecklist.value = true;
};

const handleChecklistDismiss = () => {
  showOnboardingChecklist.value = false;
};

const handleWelcomeJoin = () => {
  // Staff joined company - reload will show data
  showWelcome.value = false;
};

const handleWelcomeCreate = () => {
  // Owner wants to create - show setup wizard
  showWelcome.value = false;
  showSetup.value = true;
};

// ============================================
// Lifecycle
// ============================================
onMounted(async () => {
  // Initialize shop and company config
  await shop.init();
  await company.loadCompanyCode();

  // If company code is enabled, user is staff - go straight to dashboard
  if (company.isCompanyCodeEnabled.value) {
    console.log("[Dashboard] Company code enabled - skipping setup");
    isInitialLoad.value = false;
    // Continue to load data below
  }
  // Check if new user (no setup AND no company code)
  else if (isNewUser.value) {
    showWelcome.value = true;
    isInitialLoad.value = false;
    return;
  }
  // Check if needs owner setup
  else if (needsSetup.value) {
    showSetup.value = true;
    isInitialLoad.value = false;
    return;
  }

  // Fast load with background refresh
  if (hasCachedData.value) {
    isInitialLoad.value = false;
    isRefreshing.value = true;
    await Promise.all([ordersStore.init(), productsStore.init()]).finally(
      () => {
        isRefreshing.value = false;
      }
    );
  } else {
    await Promise.all([ordersStore.init(), productsStore.init()]);
    isInitialLoad.value = false;
  }

  // Check if we should show onboarding checklist
  const checklistDismissed = localStorage.getItem(
    "bitspace_onboarding_checklist_dismissed"
  );
  if (shop.isSetupComplete.value && !checklistDismissed) {
    showOnboardingChecklist.value = true;
  }
});
</script>

<template>
  <div>
    <!-- Welcome Choice (Join vs Create) -->
    <DashboardWelcomeChoice
      v-if="showWelcome"
      @join="handleWelcomeJoin"
      @create="handleWelcomeCreate"
    />

    <!-- Shop Setup Wizard (for owners) -->
    <DashboardShopSetup v-else-if="showSetup" @complete="handleSetupComplete" />

    <!-- Main Dashboard -->
    <div v-else class="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"
      >
        <div class="flex items-center gap-3">
          <span class="text-xl">{{ greeting.emoji }}</span>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ greeting.text }}
            </p>
            <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t("dashboard.title") }}
            </h1>
          </div>
          <span
            v-if="isRefreshing"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-xs text-primary-600 dark:text-primary-400"
          >
            <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
            {{ t("common.syncing") }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Period Selector -->
          <CommonButtonGroup
            v-model="selectedPeriod"
            :items="[
              {
                value: 'today',
                label: t('dashboard.today'),
                indicator: { show: true },
              },
              { value: 'week', label: t('dashboard.week') },
              { value: 'month', label: t('dashboard.month') },
            ]"
          />

          <NuxtLinkLocale to="/pos">
            <UButton color="primary" icon="i-heroicons-shopping-cart" size="sm">
              {{ t("pos.terminal") }}
            </UButton>
          </NuxtLinkLocale>
        </div>
      </div>

      <!-- Loading Skeletons -->
      <template v-if="isInitialLoad && !hasCachedData">
        <div class="grid grid-cols-12 gap-3">
          <!-- KPI Cards Skeleton (4 cards) -->
          <div
            v-for="i in 4"
            :key="`kpi-${i}`"
            class="col-span-12 sm:col-span-6 lg:col-span-3"
          >
            <div
              class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800"
            >
              <USkeleton class="h-3 w-16 mb-2" />
              <USkeleton class="h-7 w-28 mb-1" />
              <USkeleton class="h-3 w-20" />
            </div>
          </div>

          <!-- Sales Chart Skeleton -->
          <div class="col-span-12 lg:col-span-8">
            <div
              class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800"
            >
              <USkeleton class="h-5 w-32 mb-4" />
              <USkeleton class="h-48 w-full" />
            </div>
          </div>

          <!-- Business Health Skeleton -->
          <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <div
              class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800"
            >
              <USkeleton class="h-5 w-32 mb-4" />
              <USkeleton class="h-24 w-24 rounded-full mx-auto mb-3" />
              <USkeleton class="h-4 w-20 mx-auto" />
            </div>
          </div>

          <!-- Payment Breakdown Skeleton -->
          <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <div
              class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800"
            >
              <USkeleton class="h-5 w-40 mb-4" />
              <div class="space-y-3">
                <div
                  v-for="j in 3"
                  :key="`payment-${j}`"
                  class="flex justify-between"
                >
                  <USkeleton class="h-4 w-20" />
                  <USkeleton class="h-4 w-16" />
                </div>
              </div>
            </div>
          </div>

          <!-- Top Products Skeleton -->
          <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <div
              class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800"
            >
              <USkeleton class="h-5 w-28 mb-4" />
              <div class="space-y-3">
                <div
                  v-for="j in 5"
                  :key="`product-${j}`"
                  class="flex items-center gap-3"
                >
                  <USkeleton class="h-8 w-8 rounded" />
                  <div class="flex-1">
                    <USkeleton class="h-4 w-24 mb-1" />
                    <USkeleton class="h-3 w-16" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Orders Skeleton -->
          <div class="col-span-12 lg:col-span-6">
            <div
              class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800"
            >
              <USkeleton class="h-5 w-32 mb-4" />
              <div class="space-y-3">
                <div
                  v-for="j in 4"
                  :key="`order-${j}`"
                  class="flex justify-between items-center"
                >
                  <div class="flex items-center gap-3">
                    <USkeleton class="h-8 w-8 rounded-full" />
                    <div>
                      <USkeleton class="h-4 w-20 mb-1" />
                      <USkeleton class="h-3 w-16" />
                    </div>
                  </div>
                  <USkeleton class="h-4 w-16" />
                </div>
              </div>
            </div>
          </div>

          <!-- Low Stock Skeleton -->
          <div class="col-span-12 lg:col-span-6">
            <div
              class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800"
            >
              <USkeleton class="h-5 w-24 mb-4" />
              <div class="space-y-3">
                <div
                  v-for="j in 4"
                  :key="`stock-${j}`"
                  class="flex justify-between items-center"
                >
                  <div class="flex items-center gap-3">
                    <USkeleton class="h-8 w-8 rounded" />
                    <USkeleton class="h-4 w-24" />
                  </div>
                  <USkeleton class="h-6 w-12 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions Skeleton -->
          <div class="col-span-12">
            <div
              class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800"
            >
              <USkeleton class="h-5 w-28 mb-4" />
              <div class="flex gap-3 flex-wrap">
                <USkeleton
                  v-for="j in 4"
                  :key="`action-${j}`"
                  class="h-10 w-24 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Dashboard Content -->
      <template v-else>
        <!-- Onboarding Checklist (shown after setup) -->
        <div v-if="showOnboardingChecklist" class="mb-6 max-w-2xl">
          <DashboardOnboardingChecklist @dismiss="handleChecklistDismiss" />
        </div>
        <!-- Marketplace Setup Notification -->
        <div class="mb-6 max-w-2xl">
          <DashboardMarketplaceSetup />
        </div>

        <div class="grid grid-cols-12 gap-3">
          <!-- KPI Cards -->
          <div class="col-span-12">
            <DashboardKPICards
              :kpis="kpis"
              :today-stats="todayStats"
              :selected-period="selectedPeriod"
            />
          </div>

          <!-- Sales Chart -->
          <div class="col-span-12 lg:col-span-8">
            <DashboardSalesChart
              :hourly-sales="hourlySales"
              :peak-hour="peakHour"
            />
          </div>

          <!-- Business Health -->
          <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <DashboardBusinessHealth :finance-health="financeHealth" />
          </div>

          <!-- Payment Breakdown -->
          <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <DashboardPaymentBreakdown :kpis="kpis" />
          </div>

          <!-- Top Products -->
          <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <DashboardTopProducts :products="topProducts" />
          </div>

          <!-- Recent Orders -->
          <div class="col-span-12 lg:col-span-6">
            <DashboardRecentOrders :orders="recentOrders" />
          </div>

          <!-- Low Stock -->
          <div class="col-span-12 lg:col-span-6">
            <DashboardLowStock :products="lowStockProducts" />
          </div>

          <!-- Quick Actions -->
          <div class="col-span-12">
            <DashboardQuickActions />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
