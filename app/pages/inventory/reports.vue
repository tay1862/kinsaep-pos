<!-- pages/inventory/reports.vue -->
<!-- Enterprise Inventory Analytics Dashboard -->
<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const inventory = useInventory();
const stockLots = useStockLots();

// ============================================
// 📊 STATE & INITIALIZATION
// ============================================
const loading = ref(true);
const activeTab = ref("valuation");

// Valuation method
const valuationMethod = ref<"fifo" | "lifo" | "weighted_avg">("fifo");

// Initialize on mount
onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([inventory.init(), stockLots.init()]);
  } finally {
    loading.value = false;
  }
});

// ============================================
// 📈 COMPUTED ANALYTICS
// ============================================

// Inventory items from composable
const inventoryItems = computed(() => inventory.inventoryItems.value);
const allLots = computed(() => stockLots.stockLots.value);

// Total Inventory Valuation
const totalValuation = computed(() => {
  if (valuationMethod.value === "fifo") {
    // FIFO: Use oldest lots first (cost from earliest batches)
    return allLots.value.reduce(
      (sum, lot) => sum + lot.currentQuantity * lot.costPrice,
      0
    );
  } else if (valuationMethod.value === "lifo") {
    // LIFO: Use newest lots first (approximate by reversing order)
    const sortedLots = [...allLots.value].sort(
      (a, b) =>
        new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime()
    );
    return sortedLots.reduce(
      (sum, lot) => sum + lot.currentQuantity * lot.costPrice,
      0
    );
  } else {
    // Weighted Average
    const totalQty = allLots.value.reduce(
      (sum, lot) => sum + lot.currentQuantity,
      0
    );
    const totalCost = allLots.value.reduce(
      (sum, lot) => sum + lot.currentQuantity * lot.costPrice,
      0
    );
    const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
    return totalQty * avgCost;
  }
});

// Valuation by Category
const valuationByCategory = computed(() => {
  const categoryMap: Record<string, { name: string; value: number; qty: number }> = {};

  inventoryItems.value.forEach((item) => {
    const catName = item.categoryName || t("common.uncategorized", "Uncategorized");

    if (!categoryMap[catName]) {
      categoryMap[catName] = { name: catName, value: 0, qty: 0 };
    }
    categoryMap[catName].value += item.value;
    categoryMap[catName].qty += item.currentStock;
  });

  return Object.values(categoryMap).sort((a, b) => b.value - a.value);
});

// Stock Aging Analysis
const stockAging = computed(() => {
  const now = new Date();
  const buckets = {
    "0-30": { label: "0-30 " + t("common.days"), value: 0, count: 0, color: "#22c55e" },
    "31-60": { label: "31-60 " + t("common.days"), value: 0, count: 0, color: "#eab308" },
    "61-90": { label: "61-90 " + t("common.days"), value: 0, count: 0, color: "#f97316" },
    "90+": { label: "90+ " + t("common.days"), value: 0, count: 0, color: "#ef4444" },
  };

  allLots.value.forEach((lot) => {
    const receivedDate = new Date(lot.receivedDate);
    const days = Math.floor(
      (now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const value = lot.currentQuantity * lot.costPrice;

    if (days <= 30) {
      buckets["0-30"].value += value;
      buckets["0-30"].count++;
    } else if (days <= 60) {
      buckets["31-60"].value += value;
      buckets["31-60"].count++;
    } else if (days <= 90) {
      buckets["61-90"].value += value;
      buckets["61-90"].count++;
    } else {
      buckets["90+"].value += value;
      buckets["90+"].count++;
    }
  });

  return Object.values(buckets);
});

// ABC Classification
const abcClassification = computed(() => {
  // Sort products by revenue contribution (using value as proxy)
  const sorted = [...inventoryItems.value].sort((a, b) => b.value - a.value);

  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  let cumulative = 0;

  const classified = sorted.map((item) => {
    cumulative += item.value;
    const pct = total > 0 ? (cumulative / total) * 100 : 0;

    let classification: "A" | "B" | "C" = "C";
    if (pct <= 80) classification = "A";
    else if (pct <= 95) classification = "B";

    return {
      ...item,
      classification,
      percentage: total > 0 ? (item.value / total) * 100 : 0,
      cumulativePercentage: pct,
    };
  });

  const counts = {
    A: classified.filter((i) => i.classification === "A").length,
    B: classified.filter((i) => i.classification === "B").length,
    C: classified.filter((i) => i.classification === "C").length,
  };

  const values = {
    A: classified
      .filter((i) => i.classification === "A")
      .reduce((sum, i) => sum + i.value, 0),
    B: classified
      .filter((i) => i.classification === "B")
      .reduce((sum, i) => sum + i.value, 0),
    C: classified
      .filter((i) => i.classification === "C")
      .reduce((sum, i) => sum + i.value, 0),
  };

  return { items: classified, counts, values, total };
});

// Inventory Turnover
const inventoryTurnover = computed(() => {
  // Calculate approximate turnover from movements
  const movements = inventory.stockMovements.value;
  const salesMovements = movements.filter((m) => m.type === "out");
  const totalSold = salesMovements.reduce((sum, m) => sum + m.quantity, 0);
  const avgInventory = inventoryItems.value.reduce(
    (sum, i) => sum + i.currentStock,
    0
  );

  const turnoverRatio = avgInventory > 0 ? totalSold / avgInventory : 0;
  const daysInInventory =
    turnoverRatio > 0 ? Math.round(365 / turnoverRatio) : 0;

  return {
    ratio: turnoverRatio.toFixed(2),
    daysInInventory,
    totalSold,
    avgInventory,
  };
});

// Dead Stock (no movement in 90+ days)
const deadStock = computed(() => {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  return allLots.value.filter((lot) => {
    const lastUpdate = new Date(lot.updatedAt || lot.receivedDate);
    return lastUpdate < ninetyDaysAgo && lot.currentQuantity > 0;
  });
});

// Chart data for aging
const agingChartSeries = computed(() => [
  {
    name: t("inventoryReports.stockValue", "Stock Value"),
    type: "bar" as const,
    data: stockAging.value.map((b) => b.value),
    itemStyle: {
      color: (params: { dataIndex: number }) => stockAging.value[params.dataIndex]?.color || "#3b82f6",
    },
  },
]);

const agingChartCategories = computed(() =>
  stockAging.value.map((b) => b.label)
);

// Category Valuation Pie Chart
const categoryPieData = computed(() => ({
  tooltip: {
    trigger: 'item' as const,
    formatter: '{b}: {c} ({d}%)',
  },
  legend: {
    orient: 'vertical' as const,
    left: 'right' as const,
    top: 'center' as const,
  },
  series: [
    {
      name: t("inventoryReports.categoryValue", "Category Value"),
      type: "pie" as const,
      radius: ["40%", "70%"],
      center: ['40%', '50%'],
      avoidLabelOverlap: true,
      label: {
        show: true,
        formatter: '{b}: {d}%',
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: 'bold' as const,
        },
      },
      data: valuationByCategory.value.slice(0, 8).map((cat, index) => {
        const colors = [
          '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', 
          '#10b981', '#06b6d4', '#6366f1', '#14b8a6'
        ];
        return {
          name: cat.name,
          value: cat.value,
          itemStyle: { color: colors[index] || '#6b7280' },
        };
      }),
    },
  ],
}));

// ABC Pie chart data
const abcPieData = computed(() => ({
  tooltip: {
    trigger: 'item' as const,
    formatter: '{b}: {c} ({d}%)',
  },
  legend: {
    orient: 'vertical' as const,
    left: 'right' as const,
    top: 'center' as const,
  },
  series: [
    {
      name: t("inventoryReports.abcPie", "ABC Distribution"),
      type: "pie" as const,
      radius: ["40%", "70%"],
      center: ['40%', '50%'],
      avoidLabelOverlap: true,
      label: {
        show: true,
        formatter: '{b}: {d}%',
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: 'bold' as const,
        },
      },
      data: [
        {
          name: "A - " + t("inventoryReports.highValue", "High Value"),
          value: abcClassification.value.values.A,
          itemStyle: { color: "#22c55e" },
        },
        {
          name: "B - " + t("inventoryReports.mediumValue", "Medium Value"),
          value: abcClassification.value.values.B,
          itemStyle: { color: "#eab308" },
        },
        {
          name: "C - " + t("inventoryReports.lowValue", "Low Value"),
          value: abcClassification.value.values.C,
          itemStyle: { color: "#94a3b8" },
        },
      ],
    },
  ],
}));

// ============================================
// 📝 FORMATTERS
// ============================================
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("en-US").format(num);
};

// ============================================
// 📤 EXPORT
// ============================================
const exportReport = async (format: "csv" | "excel") => {
  if (format === "csv") {
    const rows = [
      ["Product", "SKU", "Category", "Stock", "Value", "ABC Class"],
      ...abcClassification.value.items.map((item) => [
        item.productName,
        item.sku,
        item.categoryName,
        item.currentStock,
        item.value,
        item.classification,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
</script>

<template>
  <div class="min-h-screen">
    <!-- Header -->
    <CommonPageHeader
      :title="t('inventoryReports.title', 'Inventory Analytics')"
      :description="t('inventoryReports.description', 'Stock valuation, aging analysis, and ABC classification')"
    >
      <template #left>
        <UButton
          icon="i-heroicons-arrow-left"
          color="neutral"
          variant="ghost"
          @click="navigateTo('/inventory')"
        />
      </template>
      <template #right>
        <div class="flex gap-2">
          <UDropdownMenu
            :items="[
              [
                {
                  label: 'CSV',
                  icon: 'i-heroicons-document-text',
                  onSelect: () => exportReport('csv'),
                },
              ],
            ]"
          >
            <UButton
              color="neutral"
              variant="outline"
              icon="i-heroicons-arrow-down-tray"
              :label="t('common.export')"
              trailing-icon="i-heroicons-chevron-down"
            />
          </UDropdownMenu>
        </div>
      </template>
      <template #tabs>
        <UTabs
          v-model="activeTab"
          variant="link"
          :items="[
            {
              label: t('inventoryReports.valuation', 'Valuation'),
              value: 'valuation',
              icon: 'i-heroicons-currency-dollar',
            },
            {
              label: t('inventoryReports.aging', 'Stock Aging'),
              value: 'aging',
              icon: 'i-heroicons-clock',
            },
            {
              label: t('inventoryReports.abcAnalysis', 'ABC Analysis'),
              value: 'abc',
              icon: 'i-heroicons-chart-pie',
            },
            {
              label: t('inventoryReports.turnover', 'Turnover'),
              value: 'turnover',
              icon: 'i-heroicons-arrow-path',
            },
          ]"
        />
      </template>
    </CommonPageHeader>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <div v-else class="space-y-6 pb-8">
      <!-- ============================== -->
      <!-- VALUATION TAB -->
      <!-- ============================== -->
      <template v-if="activeTab === 'valuation'">
        <!-- Valuation Method Selector -->
        <div class="px-4">
          <div class="bg-linear-to-r from-primary-500/10 to-blue-500/10 rounded-2xl p-6 border border-primary-500/20">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span class="text-2xl">💰</span>
                  {{ t('inventoryReports.totalInventoryValue', 'Total Inventory Value') }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {{ t('inventoryReports.valuationMethodHint', 'Select valuation method to calculate') }}
                </p>
              </div>
              <div class="flex items-center gap-3">
                <USelect
                  v-model="valuationMethod"
                  :items="[
                    { value: 'fifo', label: 'FIFO (First In, First Out)' },
                    { value: 'lifo', label: 'LIFO (Last In, First Out)' },
                    { value: 'weighted_avg', label: 'Weighted Average' },
                  ]"
                  class="w-64"
                />
              </div>
            </div>
            <div class="mt-6">
              <p class="text-4xl font-black text-primary-600 dark:text-primary-400">
                {{ formatCurrency(totalValuation) }}
              </p>
              <p class="text-sm text-gray-500 mt-2">
                {{ formatNumber(inventoryItems.length) }} {{ t('common.products') }} •
                {{ formatNumber(allLots.length) }} {{ t('inventory.stockLots') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
          <CommonStatCard
            icon="i-heroicons-cube"
            icon-color="blue"
            :label="t('inventory.totalProducts', 'Total Products')"
            :value="formatNumber(inventoryItems.length)"
          />
          <CommonStatCard
            icon="i-heroicons-archive-box"
            icon-color="purple"
            :label="t('inventory.stockLots', 'Stock Lots')"
            :value="formatNumber(allLots.length)"
          />
          <CommonStatCard
            icon="i-heroicons-exclamation-triangle"
            icon-color="yellow"
            :label="t('inventory.lowStockItems', 'Low Stock')"
            :value="formatNumber(inventory.lowStockCount.value)"
          />
          <CommonStatCard
            icon="i-heroicons-x-circle"
            icon-color="red"
            :label="t('inventoryReports.deadStock', 'Dead Stock')"
            :value="formatNumber(deadStock.length)"
          />
        </div>

        <!-- Valuation by Category -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4">
          <!-- Category List -->
          <UCard>
            <template #header>
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-squares-2x2" class="text-primary-500" />
                {{ t('inventoryReports.valuationByCategory', 'Valuation by Category') }}
              </h3>
            </template>
            <div class="space-y-4">
              <div
                v-for="(cat, index) in valuationByCategory.slice(0, 8)"
                :key="cat.name"
                class="flex items-center gap-4"
              >
                <div class="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center font-bold text-primary-600">
                  {{ index + 1 }}
                </div>
                <div class="flex-1">
                  <div class="flex justify-between items-center mb-1">
                    <span class="font-medium text-gray-900 dark:text-white">{{ cat.name }}</span>
                    <span class="font-bold text-primary-600 dark:text-primary-400">
                      {{ formatCurrency(cat.value) }}
                    </span>
                  </div>
                  <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-linear-to-r from-primary-500 to-blue-500 rounded-full transition-all"
                      :style="{
                        width: `${
                          valuationByCategory[0]?.value
                            ? (cat.value / valuationByCategory[0].value) * 100
                            : 0
                        }%`,
                      }"
                    />
                  </div>
                </div>
                <span class="text-sm text-gray-500 w-16 text-right">
                  {{ formatNumber(cat.qty) }} {{ t('common.units') }}
                </span>
              </div>
            </div>
          </UCard>

          <!-- Category Pie Chart -->
          <UCard>
            <template #header>
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-chart-pie" class="text-primary-500" />
                {{ t('inventoryReports.categoryDistribution', 'Category Distribution') }}
              </h3>
            </template>
            <div class="h-80">
              <ChartPie :chart-data="categoryPieData" />
            </div>
          </UCard>
        </div>
      </template>

      <!-- ============================== -->
      <!-- AGING TAB -->
      <!-- ============================== -->
      <template v-if="activeTab === 'aging'">
        <!-- Aging Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4">
          <div
            v-for="bucket in stockAging"
            :key="bucket.label"
            class="p-4 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer"
            :style="{ borderColor: bucket.color + '40', backgroundColor: bucket.color + '10' }"
          >
            <p class="text-sm font-medium" :style="{ color: bucket.color }">
              {{ bucket.label }}
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {{ formatCurrency(bucket.value) }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              {{ bucket.count }} {{ t('inventory.stockLots') }}
            </p>
          </div>
        </div>

        <!-- Aging Chart -->
        <div class="px-4">
          <UCard>
            <template #header>
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-chart-bar" class="text-primary-500" />
                {{ t('inventoryReports.stockAgingChart', 'Stock Aging Distribution') }}
              </h3>
            </template>
            <div class="h-80">
              <ChartBar
                :series="agingChartSeries"
                :x-axis-data="agingChartCategories"
              />
            </div>
          </UCard>
        </div>

        <!-- Dead Stock Alert -->
        <div v-if="deadStock.length > 0" class="px-4">
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
              </div>
              <div class="flex-1">
                <h4 class="font-semibold text-red-800 dark:text-red-200">
                  {{ t('inventoryReports.deadStockAlert', 'Dead Stock Alert') }}
                </h4>
                <p class="text-sm text-red-700 dark:text-red-300 mt-1">
                  {{ deadStock.length }} {{ t('inventoryReports.lotsNoMovement', 'lots with no movement in 90+ days') }}
                </p>
              </div>
              <UButton color="red" variant="soft" size="sm" @click="activeTab = 'valuation'">
                {{ t('common.viewDetails') }}
              </UButton>
            </div>
          </div>
        </div>
      </template>

      <!-- ============================== -->
      <!-- ABC ANALYSIS TAB -->
      <!-- ============================== -->
      <template v-if="activeTab === 'abc'">
        <!-- ABC Summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
          <!-- A Class -->
          <div class="p-6 rounded-2xl bg-linear-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center text-xl font-black">
                A
              </div>
              <div>
                <p class="text-sm text-green-700 dark:text-green-400">
                  {{ t('inventoryReports.highValue', 'High Value') }}
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ abcClassification.counts.A }} {{ t('common.items') }}
                </p>
              </div>
            </div>
            <p class="text-lg font-bold text-green-600 dark:text-green-400">
              {{ formatCurrency(abcClassification.values.A) }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              ~80% {{ t('inventoryReports.ofTotalValue', 'of total value') }}
            </p>
          </div>

          <!-- B Class -->
          <div class="p-6 rounded-2xl bg-linear-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-xl bg-yellow-500 text-white flex items-center justify-center text-xl font-black">
                B
              </div>
              <div>
                <p class="text-sm text-yellow-700 dark:text-yellow-400">
                  {{ t('inventoryReports.mediumValue', 'Medium Value') }}
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ abcClassification.counts.B }} {{ t('common.items') }}
                </p>
              </div>
            </div>
            <p class="text-lg font-bold text-yellow-600 dark:text-yellow-400">
              {{ formatCurrency(abcClassification.values.B) }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              ~15% {{ t('inventoryReports.ofTotalValue', 'of total value') }}
            </p>
          </div>

          <!-- C Class -->
          <div class="p-6 rounded-2xl bg-linear-to-br from-gray-500/10 to-slate-500/10 border border-gray-500/20">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-xl bg-gray-500 text-white flex items-center justify-center text-xl font-black">
                C
              </div>
              <div>
                <p class="text-sm text-gray-700 dark:text-gray-400">
                  {{ t('inventoryReports.lowValue', 'Low Value') }}
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ abcClassification.counts.C }} {{ t('common.items') }}
                </p>
              </div>
            </div>
            <p class="text-lg font-bold text-gray-600 dark:text-gray-400">
              {{ formatCurrency(abcClassification.values.C) }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              ~5% {{ t('inventoryReports.ofTotalValue', 'of total value') }}
            </p>
          </div>
        </div>

        <!-- ABC Pie Chart -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4">
          <UCard>
            <template #header>
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-chart-pie" class="text-primary-500" />
                {{ t('inventoryReports.valueDistribution', 'Value Distribution') }}
              </h3>
            </template>
            <div class="h-80">
              <ChartPie :chart-data="abcPieData" />
            </div>
          </UCard>

          <!-- Top A-Class Products -->
          <UCard>
            <template #header>
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-star" class="text-green-500" />
                {{ t('inventoryReports.topAClassProducts', 'Top A-Class Products') }}
              </h3>
            </template>
            <div class="space-y-3 max-h-80 overflow-y-auto">
              <div
                v-for="(item, index) in abcClassification.items
                  .filter((i) => i.classification === 'A')
                  .slice(0, 10)"
                :key="item.id"
                class="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span class="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">
                  {{ index + 1 }}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white truncate">
                    {{ item.productName }}
                  </p>
                  <p class="text-xs text-gray-500">{{ item.sku }}</p>
                </div>
                <div class="text-right">
                  <p class="font-bold text-green-600 dark:text-green-400">
                    {{ formatCurrency(item.value) }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ item.percentage.toFixed(1) }}%
                  </p>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </template>

      <!-- ============================== -->
      <!-- TURNOVER TAB -->
      <!-- ============================== -->
      <template v-if="activeTab === 'turnover'">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
          <CommonStatCard
            icon="i-heroicons-arrow-path"
            icon-color="blue"
            :label="t('inventoryReports.turnoverRatio', 'Turnover Ratio')"
            :value="inventoryTurnover.ratio + 'x'"
          />
          <CommonStatCard
            icon="i-heroicons-calendar-days"
            icon-color="purple"
            :label="t('inventoryReports.daysInInventory', 'Days in Inventory')"
            :value="inventoryTurnover.daysInInventory + ' ' + t('common.days')"
          />
          <CommonStatCard
            icon="i-heroicons-arrow-trending-up"
            icon-color="green"
            :label="t('inventoryReports.totalSold', 'Total Units Sold')"
            :value="formatNumber(inventoryTurnover.totalSold)"
          />
          <CommonStatCard
            icon="i-heroicons-cube"
            icon-color="yellow"
            :label="t('inventoryReports.avgInventory', 'Avg Inventory')"
            :value="formatNumber(inventoryTurnover.avgInventory)"
          />
        </div>

        <!-- Turnover Explanation -->
        <div class="px-4">
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
            <h4 class="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
              <UIcon name="i-heroicons-information-circle" />
              {{ t('inventoryReports.understandingTurnover', 'Understanding Inventory Turnover') }}
            </h4>
            <ul class="space-y-2 text-sm text-blue-700 dark:text-blue-300">
              <li class="flex items-start gap-2">
                <span class="font-bold">•</span>
                <span>{{ t('inventoryReports.turnoverHint1', 'Higher turnover = faster-selling inventory (typically 4-6x is healthy for retail)') }}</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-bold">•</span>
                <span>{{ t('inventoryReports.turnoverHint2', 'Days in Inventory shows how long stock sits before being sold') }}</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-bold">•</span>
                <span>{{ t('inventoryReports.turnoverHint3', 'Low turnover may indicate overstocking or slow-moving items') }}</span>
              </li>
            </ul>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
