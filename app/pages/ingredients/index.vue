<script setup lang="ts">
import type { IngredientUnit } from "~/types";

/**
 * 🧪 INGREDIENTS MANAGEMENT PAGE
 * Manage raw materials, stock, and costs
 * Using Nuxt UI Components for consistency
 */

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const toast = useToast();
const ingredientsStore = useIngredients();

// Initialize store
onMounted(async () => {
  await ingredientsStore.init();
});

// UI State
const showCreateModal = ref(false);
const showStockModal = ref(false);
const showDetailsModal = ref(false);
const selectedIngredient = ref<
  (typeof ingredientsStore.ingredients.value)[0] | null
>(null);
const activeTab = ref<"list" | "alerts" | "usage">("list");
const saving = ref(false);

// Filters
const searchQuery = ref("");
const selectedCategory = ref("all");
const currentPage = ref(1);
const itemsPerPage = 15;

// Form state for new ingredient
const formData = ref({
  name: "",
  nameTh: "",
  unit: "g" as IngredientUnit,
  baseUnit: "kg" as IngredientUnit,
  conversionFactor: 1000,
  costPerBaseUnit: 0,
  currentStock: 0,
  minStock: 0,
  maxStock: 100,
  categoryId: "",
  storageType: "ambient" as "ambient" | "refrigerated" | "frozen",
});

// Stock adjustment form
const stockForm = ref({
  adjustment: 0,
  type: "purchase" as "purchase" | "waste" | "adjustment" | "count",
  unitCost: 0,
  notes: "",
});

// Options
const unitOptions = [
  { value: "g", label: "Gram (g)" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "ml", label: "Milliliter (ml)" },
  { value: "l", label: "Liter (L)" },
  { value: "piece", label: "Piece" },
  { value: "pack", label: "Pack" },
  { value: "tray", label: "Tray" },
  { value: "bottle", label: "Bottle" },
  { value: "can", label: "Can" },
];

const baseUnitOptions = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "l", label: "Liter (L)" },
  { value: "piece", label: "Piece" },
  { value: "pack", label: "Pack" },
  { value: "tray", label: "Tray (30 pcs)" },
  { value: "bottle", label: "Bottle" },
];

const stockAdjustmentTypes = [
  { value: "purchase", label: "➕ Purchase/Restock" },
  { value: "waste", label: "🗑️ Waste/Spoilage" },
  { value: "adjustment", label: "📋 Adjustment" },
  { value: "count", label: "🔢 Physical Count" },
];

const storageTypes = [
  { value: "ambient", label: "🏪 Ambient", icon: "🏪" },
  { value: "refrigerated", label: "❄️ Refrigerated", icon: "❄️" },
  { value: "frozen", label: "🧊 Frozen", icon: "🧊" },
];

// Computed
const categoryOptions = computed(() => [
  { id: "all", name: t("common.all", "All Categories") },
  // Map categories without 'icon' property to prevent USelect from trying to render emoji as Icon
  ...ingredientsStore.categories.value
    .filter((c) => c.id)
    .map((c) => ({ id: c.id, name: c.name })),
]);

// Category options for form (exclude empty ids, strip icon to prevent USelect icon rendering issues)
const formCategoryOptions = computed(() =>
  ingredientsStore.categories.value
    .filter((c) => c.id && c.id !== "")
    .map((c) => ({ id: c.id, name: c.name }))
);

const filteredIngredients = computed(() => {
  let filtered = ingredientsStore.activeIngredients.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        i.nameTh?.toLowerCase().includes(query) ||
        i.code?.toLowerCase().includes(query)
    );
  }

  if (selectedCategory.value && selectedCategory.value !== "all") {
    filtered = filtered.filter((i) => i.categoryId === selectedCategory.value);
  }

  return filtered;
});

const totalPages = computed(() =>
  Math.ceil(filteredIngredients.value.length / itemsPerPage)
);
const paginatedIngredients = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredIngredients.value.slice(start, start + itemsPerPage);
});

// Methods
function resetFilters() {
  searchQuery.value = "";
  selectedCategory.value = "all";
  currentPage.value = 1;
}

function openCreateModal() {
  formData.value = {
    name: "",
    nameTh: "",
    unit: "g",
    baseUnit: "kg",
    conversionFactor: 1000,
    costPerBaseUnit: 0,
    currentStock: 0,
    minStock: 0,
    maxStock: 100,
    categoryId: "",
    storageType: "ambient",
  };
  showCreateModal.value = true;
}

function openStockModal(
  ingredient: (typeof ingredientsStore.ingredients.value)[0]
) {
  selectedIngredient.value = ingredient;
  stockForm.value = {
    adjustment: 0,
    type: "purchase",
    unitCost: ingredient.costPerBaseUnit,
    notes: "",
  };
  showStockModal.value = true;
}

function viewDetails(
  ingredient: (typeof ingredientsStore.ingredients.value)[0]
) {
  selectedIngredient.value = ingredient;
  showDetailsModal.value = true;
}

async function saveIngredient() {
  if (!formData.value.name) {
    toast.add({
      title: t("common.error"),
      description: "Ingredient name is required",
      color: "red",
      icon: "i-heroicons-exclamation-circle",
    });
    return;
  }

  saving.value = true;
  try {
    await ingredientsStore.addIngredient({
      name: formData.value.name,
      nameTh: formData.value.nameTh,
      unit: formData.value.unit,
      baseUnit: formData.value.baseUnit,
      conversionFactor: formData.value.conversionFactor,
      costPerBaseUnit: formData.value.costPerBaseUnit,
      currentStock: formData.value.currentStock,
      minStock: formData.value.minStock,
      maxStock: formData.value.maxStock,
      categoryId: formData.value.categoryId || undefined,
      storageType: formData.value.storageType,
      isActive: true,
    });

    toast.add({
      title: t("common.success"),
      description:
        t("ingredients.messages.created", "Ingredient created successfully"),
      color: "green",
      icon: "i-heroicons-check-circle",
    });

    showCreateModal.value = false;
  } catch (error) {
    console.error("Error saving ingredient:", error);
    toast.add({
      title: t("common.error"),
      description: "Failed to save ingredient",
      color: "red",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    saving.value = false;
  }
}

async function saveStockAdjustment() {
  if (!selectedIngredient.value) return;

  saving.value = true;
  try {
    const adjustment =
      stockForm.value.type === "count"
        ? stockForm.value.adjustment - selectedIngredient.value.currentStock
        : stockForm.value.type === "waste"
        ? -Math.abs(stockForm.value.adjustment)
        : stockForm.value.adjustment;

    await ingredientsStore.adjustStock(
      selectedIngredient.value.id,
      adjustment,
      stockForm.value.type,
      {
        unitCost: stockForm.value.unitCost,
        notes: stockForm.value.notes,
      }
    );

    toast.add({
      title: t("common.success"),
      description: "Stock adjusted successfully",
      color: "green",
      icon: "i-heroicons-check-circle",
    });

    showStockModal.value = false;
  } catch (error) {
    console.error("Error adjusting stock:", error);
    toast.add({
      title: t("common.error"),
      description: "Failed to adjust stock",
      color: "red",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    saving.value = false;
  }
}

async function acknowledgeAlert(alertId: string) {
  await ingredientsStore.acknowledgeAlert(alertId);
  toast.add({
    title: t("common.success"),
    description: "Alert dismissed",
    color: "green",
    icon: "i-heroicons-check-circle",
  });
}

// Format helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
  }).format(amount);
}

type BadgeColor =
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose"
  | "gray"
  | "neutral"
  | "primary"
  | "success"
  | "info"
  | "warning"
  | "error";

function getStockStatusColor(
  ingredient: (typeof ingredientsStore.ingredients.value)[0]
): BadgeColor {
  const status = ingredientsStore.getStockStatus(ingredient);
  switch (status) {
    case "ok":
      return "green";
    case "low":
      return "yellow";
    case "critical":
      return "orange";
    case "out":
      return "red";
    default:
      return "gray";
  }
}

function getStockStatusText(
  ingredient: (typeof ingredientsStore.ingredients.value)[0]
): string {
  const status = ingredientsStore.getStockStatus(ingredient);
  switch (status) {
    case "ok":
      return t("ingredients.statusInStock");
    case "low":
      return t("ingredients.statusLowStock");
    case "critical":
      return t("ingredients.statusCritical");
    case "out":
      return t("ingredients.statusOutOfStock");
    default:
      return t("ingredients.statusUnknown");
  }
}

function getStorageIcon(type: string): string {
  switch (type) {
    case "ambient":
      return "🏪";
    case "refrigerated":
      return "❄️";
    case "frozen":
      return "🧊";
    default:
      return "📦";
  }
}

function getPriorityColor(priority: string): BadgeColor {
  switch (priority) {
    case "critical":
      return "red";
    case "high":
      return "orange";
    case "medium":
      return "yellow";
    case "low":
      return "blue";
    default:
      return "gray";
  }
}

// Watch for filter changes
watch([searchQuery, selectedCategory], () => {
  currentPage.value = 1;
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center px-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          🧪 {{ t("ingredients.title") }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          {{ t("ingredients.description") }}
        </p>
      </div>
      <UButton
        color="primary"
        size="lg"
        :label="t('ingredients.addIngredient')"
        icon="i-heroicons-plus"
        @click="openCreateModal"
      />
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 px-4">
      <CommonStatCard
        icon="i-heroicons-cube"
        icon-color="blue"
        :label="t('ingredients.totalItems')"
        :value="ingredientsStore.activeIngredients.value.length"
      />
      <CommonStatCard
        icon="i-heroicons-currency-dollar"
        icon-color="blue"
        :label="t('ingredients.inventoryValue')"
        :value="formatCurrency(ingredientsStore.totalInventoryValue.value)"
      />
      <CommonStatCard
        icon="i-heroicons-exclamation-triangle"
        icon-color="yellow"
        :label="t('ingredients.lowStock')"
        :value="ingredientsStore.lowStockIngredients.value.length"
      />
      <CommonStatCard
        icon="i-heroicons-x-circle"
        icon-color="red"
        :label="t('ingredients.outOfStock')"
        :value="ingredientsStore.outOfStockIngredients.value.length"
      />
      <CommonStatCard
        icon="i-heroicons-bell-alert"
        icon-color="yellow"
        :label="t('ingredients.pendingAlerts')"
        :value="ingredientsStore.pendingAlerts.value.length"
      />
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 px-4">
      <UButton
        :color="activeTab === 'list' ? 'primary' : 'neutral'"
        :variant="activeTab === 'list' ? 'solid' : 'ghost'"
        icon="i-heroicons-cube"
        :label="t('ingredients.tabList')"
        @click="activeTab = 'list'"
      />
      <UButton
        :color="activeTab === 'alerts' ? 'primary' : 'neutral'"
        :variant="activeTab === 'alerts' ? 'solid' : 'ghost'"
        icon="i-heroicons-exclamation-triangle"
        :label="t('ingredients.tabAlerts')"
        @click="activeTab = 'alerts'"
      >
        <template v-if="ingredientsStore.pendingAlerts.value.length" #trailing>
          <UBadge
            color="red"
            size="xs"
            :label="String(ingredientsStore.pendingAlerts.value.length)"
          />
        </template>
      </UButton>
      <UButton
        :color="activeTab === 'usage' ? 'primary' : 'neutral'"
        :variant="activeTab === 'usage' ? 'solid' : 'ghost'"
        icon="i-heroicons-chart-bar"
        :label="t('ingredients.tabUsageHistory')"
        @click="activeTab = 'usage'"
      />
    </div>

    <!-- List Tab -->
    <template v-if="activeTab === 'list'">
      <!-- Filters -->
      <div class="flex px-4 flex-wrap gap-4 items-end">
        <UFormField :label="t('common.search')" class="min-w-[250px]">
          <UInput
            v-model="searchQuery"
            :placeholder="
              t('ingredients.searchPlaceholder', 'Search ingredients...')
            "
            icon="i-heroicons-magnifying-glass"
          />
        </UFormField>

        <UFormField :label="t('common.category')" class="min-w-[200px]">
          <USelect
            v-model="selectedCategory"
            :items="categoryOptions"
            value-key="id"
            label-key="name"
          />
        </UFormField>

        <UButton
          color="neutral"
          variant="ghost"
          :label="t('common.reset')"
          icon="i-heroicons-x-mark"
          @click="resetFilters"
        />
      </div>

      <!-- Ingredients Table -->
      <div>
        <div class="flex justify-between items-center px-4 mb-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ t("ingredients.title") }} ({{ filteredIngredients.length }})
          </h2>
        </div>

        <div
          class="bg-white dark:bg-gray-800 shadow-sm overflow-hidden border-gray-200 dark:border-gray-700"
        >
          <table class="w-full">
            <thead>
              <tr
                class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                <th
                  class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  Code
                </th>
                <th
                  class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  {{ t("ingredients.name") }}
                </th>
                <th
                  class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  {{ t("common.category") }}
                </th>
                <th
                  class="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  {{ t("ingredients.stock") }}
                </th>
                <th
                  class="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  {{ t("ingredients.cost") }}
                </th>
                <th
                  class="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  {{ t("ingredients.status") }}
                </th>
                <th
                  class="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  {{ t("ingredients.storage") }}
                </th>
                <th
                  class="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  {{ t("common.actions") }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ingredient in paginatedIngredients"
                :key="ingredient.id"
                class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="py-3 px-4 text-sm font-mono text-gray-500">
                  {{ ingredient.code }}
                </td>
                <td class="py-3 px-4">
                  <div class="font-medium text-gray-900 dark:text-white">
                    {{ ingredient.name }}
                  </div>
                  <div
                    v-if="ingredient.nameTh"
                    class="text-sm text-gray-500 dark:text-gray-400"
                  >
                    {{ ingredient.nameTh }}
                  </div>
                </td>
                <td class="py-3 px-4 text-sm">
                  {{
                    ingredientsStore.getCategory(ingredient.categoryId || "")
                      ?.name || "-"
                  }}
                </td>
                <td class="py-3 px-4 text-right">
                  <span class="font-medium">{{
                    ingredient.currentStock.toFixed(2)
                  }}</span>
                  <span class="text-gray-500 ml-1">{{
                    ingredient.baseUnit
                  }}</span>
                </td>
                <td class="py-3 px-4 text-right">
                  {{ formatCurrency(ingredient.costPerBaseUnit) }}/{{
                    ingredient.baseUnit
                  }}
                </td>
                <td class="py-3 px-4 text-center">
                  <UBadge
                    :color="getStockStatusColor(ingredient)"
                    :label="getStockStatusText(ingredient)"
                    variant="subtle"
                  />
                </td>
                <td class="py-3 px-4 text-center text-xl">
                  {{ getStorageIcon(ingredient.storageType) }}
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center justify-center gap-1">
                    <UButton
                      color="primary"
                      variant="ghost"
                      size="sm"
                      icon="i-heroicons-arrow-path"
                      @click="openStockModal(ingredient)"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      icon="i-heroicons-eye"
                      @click="viewDetails(ingredient)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div v-if="!filteredIngredients.length" class="text-center py-12">
            <div class="text-6xl mb-4">🧪</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {{ t("ingredients.noIngredients") }}
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-4">
              {{ t("ingredients.addFirstIngredient") }}
            </p>
            <UButton
              color="primary"
              :label="t('ingredients.addIngredient')"
              @click="openCreateModal"
            />
          </div>
        </div>

        <!-- Pagination -->
        <div
          v-if="filteredIngredients.length > itemsPerPage"
          class="flex justify-between items-center mt-4"
        >
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ t("common.showing") }}
            {{ (currentPage - 1) * itemsPerPage + 1 }} -
            {{
              Math.min(currentPage * itemsPerPage, filteredIngredients.length)
            }}
            {{ t("common.of") }} {{ filteredIngredients.length }}
          </div>
          <div class="flex gap-2">
            <UButton
              :disabled="currentPage === 1"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-chevron-left"
              @click="currentPage--"
            />
            <span class="px-3 py-1 text-sm">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <UButton
              :disabled="currentPage >= totalPages"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-chevron-right"
              @click="currentPage++"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Alerts Tab -->
    <template v-if="activeTab === 'alerts'">
      <div class="px-4">
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3
              class="font-semibold text-gray-900 dark:text-white flex items-center gap-2"
            >
              <span class="text-xl">⚠️</span>
              {{ t("ingredients.lowStockAlerts") }}
            </h3>
          </div>

          <div
            v-if="ingredientsStore.pendingAlerts.value.length"
            class="divide-y divide-gray-200 dark:divide-gray-700"
          >
            <div
              v-for="alert in ingredientsStore.pendingAlerts.value"
              :key="alert.id"
              class="p-4 flex justify-between items-center"
            >
              <div class="flex items-center gap-4">
                <UBadge
                  :color="getPriorityColor(alert.priority)"
                  :label="alert.priority.toUpperCase()"
                  size="xs"
                />
                <div>
                  <div class="font-medium text-gray-900 dark:text-white">
                    {{ alert.ingredient?.name || t("ingredients.unknown") }}
                  </div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    Current: {{ alert.currentStock.toFixed(2) }}
                    {{ alert.ingredient?.baseUnit }} (Min: {{ alert.minStock }})
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-right text-sm">
                  <div>
                    {{ t("ingredients.suggestedOrder") }}:
                    <span class="font-medium"
                      >{{ alert.suggestedPurchaseQty.toFixed(2) }}
                      {{ alert.ingredient?.baseUnit }}</span
                    >
                  </div>
                  <div class="text-gray-500">
                    {{ t("ingredients.estimatedCost") }}:
                    {{ formatCurrency(alert.estimatedCost) }}
                  </div>
                </div>
                <UButton
                  color="neutral"
                  variant="outline"
                  size="sm"
                  :label="t('ingredients.dismiss')"
                  @click="acknowledgeAlert(alert.id)"
                />
              </div>
            </div>
          </div>

          <div v-else class="p-12 text-center">
            <div class="text-6xl mb-4">✅</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {{ t("ingredients.allClear") }}
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
              {{ t("ingredients.noLowStockAlerts") }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- Usage Tab -->
    <template v-if="activeTab === 'usage'">
      <div class="px-4">
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3
              class="font-semibold text-gray-900 dark:text-white flex items-center gap-2"
            >
              <span class="text-xl">📊</span>
              {{ t("ingredients.recentStockMovements") }}
            </h3>
          </div>

          <div
            v-if="ingredientsStore.stockAdjustments.value.length"
            class="divide-y divide-gray-200 dark:divide-gray-700"
          >
            <div
              v-for="adj in ingredientsStore.stockAdjustments.value.slice(
                0,
                20
              )"
              :key="adj.id"
              class="p-4 flex justify-between items-center"
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center"
                  :class="{
                    'bg-green-100 dark:bg-green-900/30 text-green-600':
                      adj.type === 'purchase',
                    'bg-red-100 dark:bg-red-900/30 text-red-600':
                      adj.type === 'usage' || adj.type === 'waste',
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-600':
                      adj.type === 'count' || adj.type === 'adjustment',
                  }"
                >
                  <span class="text-lg">
                    {{
                      adj.type === "purchase"
                        ? "➕"
                        : adj.type === "usage"
                        ? "➖"
                        : adj.type === "waste"
                        ? "🗑️"
                        : "📋"
                    }}
                  </span>
                </div>
                <div>
                  <div class="font-medium text-gray-900 dark:text-white">
                    {{ adj.ingredient?.name || "Unknown" }}
                  </div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ adj.reason }}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div
                  class="font-medium"
                  :class="
                    adj.adjustment > 0 ? 'text-green-600' : 'text-red-600'
                  "
                >
                  {{ adj.adjustment > 0 ? "+" : ""
                  }}{{ adj.adjustment.toFixed(2) }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ new Date(adj.createdAt).toLocaleDateString() }}
                </div>
              </div>
            </div>
          </div>

          <div v-else class="p-12 text-center">
            <div class="text-6xl mb-4">📭</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {{ t("ingredients.noHistoryYet") }}
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
              {{ t("ingredients.stockAdjustmentsAppearHere") }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- Create Ingredient Modal -->
    <UModal
      v-model:open="showCreateModal"
      :overlay="true"
      :ui="{ overlay: 'bg-gray-950/50 dark:bg-gray-950/75' }"
    >
      <template #content>
        <UCard class="max-w-lg">
          <template #header>
            <div class="flex items-center gap-3">
              <span class="text-2xl">🧪</span>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t("ingredients.addIngredient") }}
              </h3>
            </div>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('ingredients.name') + ' (EN)'" required>
                <UInput
                  v-model="formData.name"
                  placeholder="e.g., Cake Flour"
                />
              </UFormField>
              <UFormField :label="t('ingredients.name') + ' (ລາວ)'">
                <UInput
                  v-model="formData.nameTh"
                  placeholder="e.g., ແປ້ງເຄັກ"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <UFormField :label="t('ingredients.recipeUnit')">
                <USelect
                  v-model="formData.unit"
                  :items="unitOptions"
                  value-key="value"
                  label-key="label"
                />
              </UFormField>
              <UFormField :label="t('ingredients.purchaseUnit')">
                <USelect
                  v-model="formData.baseUnit"
                  :items="baseUnitOptions"
                  value-key="value"
                  label-key="label"
                />
              </UFormField>
              <UFormField :label="t('ingredients.conversion')">
                <UInput
                  v-model.number="formData.conversionFactor"
                  type="number"
                  min="1"
                  placeholder="e.g., 1000"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="`Cost per ${formData.baseUnit}`">
                <UInput
                  v-model.number="formData.costPerBaseUnit"
                  type="number"
                  min="0"
                  step="100"
                />
              </UFormField>
              <UFormField :label="t('common.category')">
                <USelect
                  v-model="formData.categoryId"
                  :items="formCategoryOptions"
                  value-key="id"
                  label-key="name"
                  placeholder="Select category..."
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <UFormField :label="t('ingredients.initialStock')">
                <UInput
                  v-model.number="formData.currentStock"
                  type="number"
                  min="0"
                  step="0.1"
                />
              </UFormField>
              <UFormField :label="t('ingredients.minStock')">
                <UInput
                  v-model.number="formData.minStock"
                  type="number"
                  min="0"
                  step="0.1"
                />
              </UFormField>
              <UFormField :label="t('ingredients.maxStock')">
                <UInput
                  v-model.number="formData.maxStock"
                  type="number"
                  min="0"
                  step="0.1"
                />
              </UFormField>
            </div>

            <UFormField :label="t('ingredients.storageType')">
              <div class="flex gap-4">
                <label
                  v-for="storage in storageTypes"
                  :key="storage.value"
                  class="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    v-model="formData.storageType"
                    type="radio"
                    :value="storage.value"
                    class="w-4 h-4 text-primary-600"
                  />
                  <span>{{ storage.label }}</span>
                </label>
              </div>
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="outline"
                :label="t('common.cancel')"
                @click="showCreateModal = false"
              />
              <UButton
                color="primary"
                :loading="saving"
                :disabled="!formData.name"
                :label="t('common.create')"
                @click="saveIngredient"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Stock Adjustment Modal -->
    <UModal
      v-model:open="showStockModal"
      :overlay="true"
      :ui="{ overlay: 'bg-gray-950/50 dark:bg-gray-950/75' }"
    >
      <template #content>
        <UCard v-if="selectedIngredient" class="max-w-md">
          <template #header>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t("ingredients.adjustStock") }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ selectedIngredient.name }} - Current:
                {{ selectedIngredient.currentStock.toFixed(2) }}
                {{ selectedIngredient.baseUnit }}
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField :label="t('ingredients.adjustmentType')">
              <USelect
                v-model="stockForm.type"
                :items="stockAdjustmentTypes"
                value-key="value"
                label-key="label"
              />
            </UFormField>

            <UFormField
              :label="
                stockForm.type === 'count'
                  ? t('ingredients.newStockLevel')
                  : t('ingredients.quantity')
              "
            >
              <UInput
                v-model.number="stockForm.adjustment"
                type="number"
                step="0.1"
              />
            </UFormField>

            <UFormField
              v-if="stockForm.type === 'purchase'"
              :label="t('ingredients.unitCost')"
            >
              <UInput
                v-model.number="stockForm.unitCost"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>

            <UFormField :label="t('ingredients.notes')">
              <UTextarea
                v-model="stockForm.notes"
                :rows="2"
                placeholder="Optional notes..."
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="outline"
                :label="t('common.cancel')"
                @click="showStockModal = false"
              />
              <UButton
                color="primary"
                :loading="saving"
                :label="t('ingredients.saveAdjustment')"
                @click="saveStockAdjustment"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Details Modal -->
    <UModal
      v-model:open="showDetailsModal"
      :overlay="true"
      :ui="{ overlay: 'bg-gray-950/50 dark:bg-gray-950/75' }"
    >
      <template #content>
        <UCard v-if="selectedIngredient" class="max-w-lg">
          <template #header>
            <div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ selectedIngredient.name }}
              </h3>
              <p
                v-if="selectedIngredient.nameTh"
                class="text-gray-500 dark:text-gray-400"
              >
                {{ selectedIngredient.nameTh }}
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t("ingredients.code") }}
                </div>
                <div
                  class="font-mono font-medium text-gray-900 dark:text-white"
                >
                  {{ selectedIngredient.code }}
                </div>
              </div>
              <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t("common.category") }}
                </div>
                <div class="font-medium text-gray-900 dark:text-white">
                  {{
                    ingredientsStore.getCategory(
                      selectedIngredient.categoryId || ""
                    )?.name || t("ingredients.uncategorized")
                  }}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div
                class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center"
              >
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t("ingredients.currentStock") }}
                </div>
                <div class="font-bold text-lg text-gray-900 dark:text-white">
                  {{ selectedIngredient.currentStock.toFixed(2) }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ selectedIngredient.baseUnit }}
                </div>
              </div>
              <div
                class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center"
              >
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t("ingredients.minStock") }}
                </div>
                <div class="font-bold text-lg text-gray-900 dark:text-white">
                  {{ selectedIngredient.minStock.toFixed(2) }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ selectedIngredient.baseUnit }}
                </div>
              </div>
              <div
                class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center"
              >
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t("ingredients.maxStock") }}
                </div>
                <div class="font-bold text-lg text-gray-900 dark:text-white">
                  {{ selectedIngredient.maxStock.toFixed(2) }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ selectedIngredient.baseUnit }}
                </div>
              </div>
            </div>

            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <div class="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {{ t("ingredients.costInformation") }}
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <div class="text-xs text-gray-500">
                    {{
                      t("ingredients.perUnit", {
                        unit: selectedIngredient.baseUnit,
                      })
                    }}
                  </div>
                  <div class="font-bold text-gray-900 dark:text-white">
                    {{ formatCurrency(selectedIngredient.costPerBaseUnit) }}
                  </div>
                </div>
                <div>
                  <div class="text-xs text-gray-500">
                    {{
                      t("ingredients.perUnit", {
                        unit: selectedIngredient.unit,
                      })
                    }}
                  </div>
                  <div class="font-bold text-gray-900 dark:text-white">
                    {{ formatCurrency(selectedIngredient.costPerUnit) }}
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-between items-center">
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {{ t("ingredients.storage") }}:
                {{ getStorageIcon(selectedIngredient.storageType) }}
                {{ selectedIngredient.storageType }}
              </div>
              <UBadge
                :color="getStockStatusColor(selectedIngredient)"
                :label="getStockStatusText(selectedIngredient)"
                variant="subtle"
              />
            </div>
          </div>

          <template #footer>
            <div class="flex justify-between">
              <UButton
                color="primary"
                variant="ghost"
                icon="i-heroicons-arrow-path"
                :label="t('ingredients.adjustStock')"
                @click="
                  openStockModal(selectedIngredient);
                  showDetailsModal = false;
                "
              />
              <UButton
                color="neutral"
                variant="outline"
                :label="t('common.close')"
                @click="showDetailsModal = false"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
