<script setup lang="ts">
import type { IngredientUnit, Recipe } from "~/types";

/**
 * 🍳 RECIPES MANAGEMENT PAGE
 * Manage recipes with cost calculations and profit analysis
 * Using Nuxt UI Components for consistency with Products page
 */

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const toast = useToast();

const recipesStore = useRecipes();
const ingredientsStore = useIngredients();
const productsStore = useProductsStore();

// Initialize stores
onMounted(async () => {
  await Promise.all([
    recipesStore.init(),
    ingredientsStore.init(),
    productsStore.init(),
  ]);
});

// Reactive data
const recipes = computed(() => recipesStore.recipes.value);
const products = computed(() => productsStore.products.value);
const ingredients = computed(() => ingredientsStore.ingredients.value);

// UI State
const showRecipeModal = ref(false);
const showDeleteModal = ref(false);
const showDetailsModal = ref(false);
const selectedRecipe = ref<(typeof recipes.value)[0] | null>(null);
const recipeToDelete = ref<(typeof recipes.value)[0] | null>(null);
const saving = ref(false);
const deleting = ref(false);

// Filters
const searchQuery = ref("");
const selectedDifficulty = ref("all");
const activeTab = ref<"recipes" | "analytics">("recipes");

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(10);

// Form state
const recipeForm = ref({
  name: "",
  nameLao: "",
  description: "",
  productId: "",
  servings: 1,
  servingUnit: "portion",
  overheadCost: 0,
  sellingPrice: 0,
  prepTime: 0,
  cookTime: 0,
  difficulty: "medium" as "easy" | "medium" | "hard",
  ingredients: [] as Array<{
    ingredientId: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>,
});

// Options
const difficultyOptions = computed(() => [
  { value: "all", label: t("common.all") },
  { value: "easy", label: t("recipes.easy", "Easy") },
  { value: "medium", label: t("recipes.medium", "Medium") },
  { value: "hard", label: t("recipes.hard", "Hard") },
]);

const servingUnitOptions = computed(() => [
  { value: "portion", label: t("recipes.servingUnits.portion") },
  { value: "slice", label: t("recipes.servingUnits.slice") },
  { value: "piece", label: t("recipes.servingUnits.piece") },
  { value: "plate", label: t("recipes.servingUnits.plate") },
  { value: "cup", label: t("recipes.servingUnits.cup") },
  { value: "bowl", label: t("recipes.servingUnits.bowl") },
]);

const unitOptions = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "L" },
  { value: "piece", label: "pc" },
  { value: "tbsp", label: "tbsp" },
  { value: "tsp", label: "tsp" },
];

// Product options for linking (filter out empty ids)
const productOptions = computed(() =>
  products.value.filter((p) => p.status === "active" && p.id)
);

// Ingredient options (filter out empty ids)
const ingredientOptions = computed(() =>
  ingredients.value.filter((i) => i.isActive && i.id)
);

// Computed: Cost preview
const costPreview = computed(() => {
  if (!recipeForm.value.ingredients.length) {
    return { totalIngredientCost: 0, costPerServing: 0, profitMargin: 0 };
  }

  const ingredientsCost = recipeForm.value.ingredients.map((ing) => ({
    ingredientId: ing.ingredientId,
    quantity: ing.quantity,
    unit: ing.unit as IngredientUnit,
    cost: ingredientsStore.calculateCost(
      ing.ingredientId,
      ing.quantity,
      ing.unit as IngredientUnit
    ),
    notes: ing.notes,
  }));

  return recipesStore.calculateRecipeCosts({
    ingredients: ingredientsCost,
    servings: recipeForm.value.servings,
    overheadCost: recipeForm.value.overheadCost,
    sellingPrice: recipeForm.value.sellingPrice,
  });
});

// Computed: Filtered recipes
const filteredRecipes = computed(() => {
  let filtered = recipes.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.nameTh?.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
    );
  }

  if (selectedDifficulty.value && selectedDifficulty.value !== "all") {
    filtered = filtered.filter(
      (r) => r.difficulty === selectedDifficulty.value
    );
  }

  return filtered;
});

const totalPages = computed(() =>
  Math.ceil(filteredRecipes.value.length / itemsPerPage.value)
);
const paginatedRecipes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredRecipes.value.slice(start, start + itemsPerPage.value);
});

// Methods
function resetFilters() {
  searchQuery.value = "";
  selectedDifficulty.value = "all";
  currentPage.value = 1;
}

function openRecipeModal(recipe?: (typeof recipes.value)[0]) {
  if (recipe) {
    selectedRecipe.value = recipe;
    recipeForm.value = {
      name: recipe.name,
      nameLao: recipe.nameTh || "",
      description: recipe.description || "",
      productId: recipe.productId || "",
      servings: recipe.servings,
      servingUnit: recipe.servingUnit,
      overheadCost: recipe.overheadCost,
      sellingPrice: recipe.sellingPrice,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients.map((ing) => ({
        ingredientId: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
      })),
    };
  } else {
    selectedRecipe.value = null;
    recipeForm.value = {
      name: "",
      nameLao: "",
      description: "",
      productId: "",
      servings: 1,
      servingUnit: "portion",
      overheadCost: 0,
      sellingPrice: 0,
      prepTime: 0,
      cookTime: 0,
      difficulty: "medium",
      ingredients: [],
    };
  }
  showRecipeModal.value = true;
}

function viewRecipeDetails(recipe: (typeof recipes.value)[0]) {
  selectedRecipe.value = recipe;
  showDetailsModal.value = true;
}

function confirmDeleteRecipe(recipe: (typeof recipes.value)[0]) {
  recipeToDelete.value = recipe;
  showDeleteModal.value = true;
}

function addIngredientRow() {
  recipeForm.value.ingredients.push({
    ingredientId: "",
    quantity: 0,
    unit: "g",
    notes: "",
  });
}

function removeIngredientRow(index: number) {
  recipeForm.value.ingredients.splice(index, 1);
}

function getIngredientName(id: string): string {
  return ingredients.value.find((i) => i.id === id)?.name || "Unknown";
}

function getProductName(id: string): string {
  return products.value.find((p) => p.id === id)?.name || "-";
}

function getSuggestedPrice() {
  if (!costPreview.value.costPerServing) return;

  const suggested = recipesStore.suggestSellingPrice(
    {
      totalCostPerServing: costPreview.value.costPerServing,
    } as Recipe,
    60
  );

  recipeForm.value.sellingPrice = Math.ceil(suggested);
}

async function saveRecipe() {
  if (!recipeForm.value.name || !recipeForm.value.ingredients.length) {
    toast.add({
      title: t("common.error"),
      description:
        t("recipes.validation.nameRequired", "Recipe name is required"),
      color: "red",
      icon: "i-heroicons-exclamation-circle",
    });
    return;
  }

  saving.value = true;
  try {
    const ingredientsData = recipeForm.value.ingredients.map((ing) => ({
      ingredientId: ing.ingredientId,
      quantity: ing.quantity,
      unit: ing.unit as IngredientUnit,
      cost: ingredientsStore.calculateCost(
        ing.ingredientId,
        ing.quantity,
        ing.unit as IngredientUnit
      ),
      notes: ing.notes,
    }));

    if (selectedRecipe.value) {
      await recipesStore.updateRecipe(selectedRecipe.value.id, {
        name: recipeForm.value.name,
        nameTh: recipeForm.value.nameLao,
        description: recipeForm.value.description,
        productId: recipeForm.value.productId
          ? recipeForm.value.productId
          : undefined,
        servings: recipeForm.value.servings,
        servingUnit: recipeForm.value.servingUnit,
        ingredients: ingredientsData,
        overheadCost: recipeForm.value.overheadCost,
        sellingPrice: recipeForm.value.sellingPrice,
        prepTime: recipeForm.value.prepTime,
        cookTime: recipeForm.value.cookTime,
        difficulty: recipeForm.value.difficulty,
      });
      toast.add({
        title: t("common.success"),
        description:
          t("recipes.messages.updated", "Recipe updated successfully"),
        color: "green",
        icon: "i-heroicons-check-circle",
      });
    } else {
      const recipeData: Omit<
        Recipe,
        | "id"
        | "totalIngredientCost"
        | "costPerServing"
        | "totalCostPerServing"
        | "profitPerServing"
        | "profitMargin"
        | "createdAt"
        | "updatedAt"
      > = {
        name: recipeForm.value.name,
        nameTh: recipeForm.value.nameLao,
        description: recipeForm.value.description,
        servings: recipeForm.value.servings,
        servingUnit: recipeForm.value.servingUnit,
        ingredients: ingredientsData,
        overheadCost: recipeForm.value.overheadCost,
        sellingPrice: recipeForm.value.sellingPrice,
        prepTime: recipeForm.value.prepTime,
        cookTime: recipeForm.value.cookTime,
        difficulty: recipeForm.value.difficulty,
        isActive: true,
      };

      if (recipeForm.value.productId) {
        recipeData.productId = recipeForm.value.productId;
      }

      await recipesStore.addRecipe(recipeData);
      toast.add({
        title: t("common.success"),
        description:
          t("recipes.messages.created", "Recipe created successfully"),
        color: "green",
        icon: "i-heroicons-check-circle",
      });
    }
    showRecipeModal.value = false;
  } catch (error) {
    console.error("Error saving recipe:", error);
    toast.add({
      title: t("common.error"),
      description: "Failed to save recipe",
      color: "red",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    saving.value = false;
  }
}

async function executeDeleteRecipe() {
  if (!recipeToDelete.value) return;

  deleting.value = true;
  try {
    await recipesStore.deleteRecipe(recipeToDelete.value.id);
    toast.add({
      title: t("common.success"),
      description:
        t("recipes.messages.deleted", "Recipe deleted successfully"),
      color: "green",
      icon: "i-heroicons-trash",
    });
    showDeleteModal.value = false;
  } catch (error) {
    console.error("Error deleting recipe:", error);
    toast.add({
      title: t("common.error"),
      description:
        t("recipes.messages.deleteFailed", "Failed to delete recipe"),
      color: "red",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    deleting.value = false;
  }
}

// Format helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
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

function getProfitColor(margin: number): BadgeColor {
  if (margin >= 60) return "green";
  if (margin >= 40) return "yellow";
  return "red";
}

function getDifficultyColor(difficulty: string): BadgeColor {
  switch (difficulty) {
    case "easy":
      return "green";
    case "medium":
      return "yellow";
    case "hard":
      return "red";
    default:
      return "gray";
  }
}

// Watch for filter changes
watch([searchQuery, selectedDifficulty], () => {
  currentPage.value = 1;
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center px-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          🍳 {{ t("recipes.title") }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          {{ t("recipes.description") }}
        </p>
      </div>
      <UButton
        color="primary"
        size="lg"
        :label="t('recipes.addRecipe')"
        icon="i-heroicons-plus"
        @click="openRecipeModal()"
      />
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 px-4">
      <CommonStatCard
        icon="i-heroicons-clipboard-document-list"
        icon-color="blue"
        :label="t('recipes.stats.totalRecipes')"
        :value="recipesStore.activeRecipes.value.length"
      />
      <CommonStatCard
        icon="i-heroicons-chart-bar"
        icon-color="blue"
        :label="t('recipes.stats.avgMargin')"
        :value="formatPercent(recipesStore.averageProfitMargin.value)"
      />
      <CommonStatCard
        icon="i-heroicons-currency-dollar"
        icon-color="green"
        :label="t('recipes.stats.highProfit')"
        :value="recipesStore.highProfitRecipes.value.length"
      />
      <CommonStatCard
        icon="i-heroicons-exclamation-triangle"
        icon-color="red"
        :label="t('recipes.stats.lowMargin')"
        :value="recipesStore.lowProfitRecipes.value.length"
      />
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 px-4">
      <UButton
        :color="activeTab === 'recipes' ? 'primary' : 'neutral'"
        :variant="activeTab === 'recipes' ? 'solid' : 'ghost'"
        icon="i-heroicons-clipboard-document-list"
        :label="t('recipes.tabs.recipes')"
        @click="activeTab = 'recipes'"
      />
      <UButton
        :color="activeTab === 'analytics' ? 'primary' : 'neutral'"
        :variant="activeTab === 'analytics' ? 'solid' : 'ghost'"
        icon="i-heroicons-chart-bar"
        :label="t('recipes.tabs.profitAnalysis')"
        @click="activeTab = 'analytics'"
      />
    </div>

    <!-- Recipes Tab -->
    <template v-if="activeTab === 'recipes'">
      <!-- Filters -->
      <div class="flex px-4 flex-wrap gap-4 items-end">
        <UFormField :label="t('common.search')" class="min-w-[250px]">
          <UInput
            v-model="searchQuery"
            :placeholder="t('recipes.searchPlaceholder')"
            icon="i-heroicons-magnifying-glass"
          />
        </UFormField>

        <UFormField :label="t('recipes.difficulty')" class="min-w-[150px]">
          <USelect
            v-model="selectedDifficulty"
            :items="difficultyOptions"
            value-key="value"
            label-key="label"
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

      <!-- Recipes Table -->
      <div>
        <div class="flex justify-between items-center px-4 mb-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ t("recipes.title") }} ({{ filteredRecipes.length }})
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
                  {{ t("recipes.name") }}
                </th>
                <th
                  class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  {{ t("recipes.product") }}
                </th>
                <th
                  class="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  {{ t("recipes.totalCost") }}
                </th>
                <th
                  class="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  {{ t("recipes.sellingPrice") }}
                </th>
                <th
                  class="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  {{ t("recipes.profitMargin") }}
                </th>
                <th
                  class="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  {{ t("recipes.difficulty") }}
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
                v-for="recipe in paginatedRecipes"
                :key="recipe.id"
                class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="py-3 px-4">
                  <div class="font-medium text-gray-900 dark:text-white">
                    {{ recipe.name }}
                  </div>
                  <div
                    v-if="recipe.nameTh"
                    class="text-sm text-gray-500 dark:text-gray-400"
                  >
                    {{ recipe.nameTh }}
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    🧪 {{ recipe.ingredients.length }}
                    {{ t("recipes.ingredients") }} • 🍽️ {{ recipe.servings }}
                    {{ recipe.servingUnit }}
                  </div>
                </td>
                <td class="py-3 px-4">
                  <span
                    v-if="recipe.productId"
                    class="text-gray-700 dark:text-gray-300"
                  >
                    {{ getProductName(recipe.productId) }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="py-3 px-4 text-right font-medium">
                  {{ formatCurrency(recipe.totalCostPerServing) }}
                </td>
                <td class="py-3 px-4 text-right font-medium">
                  {{ formatCurrency(recipe.sellingPrice) }}
                </td>
                <td class="py-3 px-4 text-center">
                  <UBadge
                    :color="getProfitColor(recipe.profitMargin)"
                    :label="formatPercent(recipe.profitMargin)"
                    variant="subtle"
                  />
                </td>
                <td class="py-3 px-4 text-center">
                  <UBadge
                    :color="getDifficultyColor(recipe.difficulty)"
                    :label="recipe.difficulty"
                    variant="subtle"
                  />
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center justify-center gap-1">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      icon="i-heroicons-eye"
                      @click="viewRecipeDetails(recipe)"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      icon="i-heroicons-pencil"
                      @click="openRecipeModal(recipe)"
                    />
                    <UButton
                      color="red"
                      variant="ghost"
                      size="sm"
                      icon="i-heroicons-trash"
                      @click="confirmDeleteRecipe(recipe)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div v-if="!filteredRecipes.length" class="text-center py-12">
            <div class="text-6xl mb-4">📝</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {{ t("recipes.noRecipes") }}
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-4">
              {{ t("recipes.createFirstRecipe") }}
            </p>
            <UButton
              color="primary"
              :label="t('recipes.addRecipe')"
              @click="openRecipeModal()"
            />
          </div>
        </div>

        <!-- Pagination -->
        <div
          v-if="filteredRecipes.length > itemsPerPage"
          class="flex justify-between items-center mt-4"
        >
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ t("common.showing") }}
            {{ (currentPage - 1) * itemsPerPage + 1 }} -
            {{ Math.min(currentPage * itemsPerPage, filteredRecipes.length) }}
            {{ t("common.of") }} {{ filteredRecipes.length }}
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

    <!-- Analytics Tab -->
    <template v-if="activeTab === 'analytics'">
      <div class="px-4 space-y-6">
        <!-- Low Margin Recipes Alert -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3
            class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
          >
            <span class="text-xl">⚠️</span>
            {{ t("recipes.lowMarginRecipes") }}
          </h3>

          <div
            v-if="recipesStore.lowProfitRecipes.value.length"
            class="space-y-3"
          >
            <div
              v-for="recipe in recipesStore.lowProfitRecipes.value"
              :key="recipe.id"
              class="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
            >
              <div>
                <span class="font-medium text-gray-900 dark:text-white">{{
                  recipe.name
                }}</span>
                <span class="text-sm text-gray-500 ml-2">
                  {{ t("recipes.cost") }}:
                  {{ formatCurrency(recipe.totalCostPerServing) }} /
                  {{ t("recipes.price") }}:
                  {{ formatCurrency(recipe.sellingPrice) }}
                </span>
              </div>
              <div class="flex items-center gap-3">
                <UBadge
                  color="red"
                  :label="formatPercent(recipe.profitMargin)"
                />
                <span class="text-sm text-gray-500">
                  {{ t("recipes.suggested") }}:
                  {{
                    formatCurrency(recipesStore.suggestSellingPrice(recipe, 60))
                  }}
                </span>
              </div>
            </div>
          </div>
          <p
            v-else
            class="text-gray-500 dark:text-gray-400 flex items-center gap-2"
          >
            <span class="text-xl">✅</span>
            {{ t("recipes.healthyMargins") }}
          </p>
        </div>

        <!-- Top Profit Recipes -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3
            class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
          >
            <span class="text-xl">💰</span>
            {{ t("recipes.topProfitableRecipes") }}
          </h3>

          <div class="space-y-3">
            <div
              v-for="recipe in recipesStore.getTopProfitRecipes(5)"
              :key="recipe.id"
              class="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
            >
              <div>
                <span class="font-medium text-gray-900 dark:text-white">{{
                  recipe.name
                }}</span>
                <span class="text-sm text-gray-500 ml-2">
                  {{ t("recipes.profit") }}:
                  {{ formatCurrency(recipe.profitPerServing) }}
                  {{ t("common.perServing", "per serving") }}
                </span>
              </div>
              <UBadge
                color="green"
                :label="formatPercent(recipe.profitMargin)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Create/Edit Recipe Modal -->
    <UModal
      v-model:open="showRecipeModal"
      :overlay="true"
      :ui="{ overlay: 'bg-gray-950/50 dark:bg-gray-950/75' }"
    >
      <template #content>
        <UCard class="max-w-3xl">
          <template #header>
            <div class="flex items-center gap-3">
              <span class="text-2xl">🍳</span>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{
                  selectedRecipe
                    ? t("recipes.editRecipe")
                    : t("recipes.addRecipe")
                }}
              </h3>
            </div>
          </template>

          <div class="space-y-4">
            <!-- Basic Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField :label="t('recipes.name') + ' (EN)'" required>
                <UInput
                  v-model="recipeForm.name"
                  placeholder="e.g., Chocolate Fudge Cake"
                />
              </UFormField>
              <UFormField :label="t('recipes.name') + ' (ລາວ)'">
                <UInput
                  v-model="recipeForm.nameLao"
                  placeholder="e.g., ເຄັກຊ໋ອກໂກແລັດ"
                />
              </UFormField>
            </div>

            <!-- Link to Product -->
            <UFormField :label="t('recipes.product')">
              <USelect
                v-model="recipeForm.productId"
                :items="productOptions"
                value-key="id"
                label-key="name"
                :placeholder="t('recipes.selectProduct')"
              />
            </UFormField>

            <!-- Servings & Difficulty -->
            <div class="grid grid-cols-3 gap-4">
              <UFormField :label="t('recipes.servings')">
                <UInput
                  v-model.number="recipeForm.servings"
                  type="number"
                  min="1"
                />
              </UFormField>
              <UFormField :label="t('recipes.servingUnit')">
                <USelect
                  v-model="recipeForm.servingUnit"
                  :items="servingUnitOptions"
                  value-key="value"
                  label-key="label"
                />
              </UFormField>
              <UFormField :label="t('recipes.difficulty')">
                <USelect
                  v-model="recipeForm.difficulty"
                  :items="difficultyOptions.filter((d) => d.value !== 'all')"
                  value-key="value"
                  label-key="label"
                />
              </UFormField>
            </div>

            <!-- Ingredients Section -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <label
                  class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {{ t("recipes.ingredients") }} *
                </label>
                <UButton
                  color="primary"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-plus"
                  :label="t('recipes.addIngredient')"
                  @click="addIngredientRow"
                />
              </div>

              <div class="space-y-2">
                <div
                  v-for="(ing, index) in recipeForm.ingredients"
                  :key="index"
                  class="flex gap-2 items-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <USelect
                    v-model="ing.ingredientId"
                    :items="ingredientOptions"
                    value-key="id"
                    label-key="name"
                    :placeholder="t('recipes.selectIngredient')"
                    class="flex-1"
                  />
                  <UInput
                    v-model.number="ing.quantity"
                    type="number"
                    min="0"
                    step="0.1"
                    :placeholder="t('recipes.qty')"
                    class="w-24"
                  />
                  <USelect
                    v-model="ing.unit"
                    :items="unitOptions"
                    value-key="value"
                    label-key="label"
                    class="w-20"
                  />
                  <UButton
                    color="red"
                    variant="ghost"
                    size="sm"
                    icon="i-heroicons-trash"
                    @click="removeIngredientRow(index)"
                  />
                </div>

                <div
                  v-if="!recipeForm.ingredients.length"
                  class="text-center py-4 text-gray-500"
                >
                  {{ t("recipes.addIngredientHint") }}
                </div>
              </div>
            </div>

            <!-- Cost Preview Card -->
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
            >
              <h4
                class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2"
              >
                <span>💰</span>
                {{ t("recipes.costBreakdown") }}
              </h4>
              <div class="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span class="text-gray-500 dark:text-gray-400">{{
                    t("recipes.totalCostLabel")
                  }}</span>
                  <div class="font-bold text-gray-900 dark:text-white">
                    {{ formatCurrency(costPreview.totalIngredientCost || 0) }}
                  </div>
                </div>
                <div>
                  <span class="text-gray-500 dark:text-gray-400">{{
                    t("recipes.costPerServingLabel")
                  }}</span>
                  <div class="font-bold text-gray-900 dark:text-white">
                    {{ formatCurrency(costPreview.costPerServing) }}
                  </div>
                </div>
                <div>
                  <span class="text-gray-500 dark:text-gray-400">{{
                    t("recipes.marginLabel")
                  }}</span>
                  <div
                    class="font-bold"
                    :class="`text-${getProfitColor(
                      costPreview.profitMargin
                    )}-600`"
                  >
                    {{ formatPercent(costPreview.profitMargin) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Pricing -->
            <div class="grid grid-cols-3 gap-4">
              <UFormField :label="t('recipes.overheadCost')">
                <UInput
                  v-model.number="recipeForm.overheadCost"
                  type="number"
                  min="0"
                  step="100"
                />
              </UFormField>
              <UFormField :label="t('recipes.sellingPrice')">
                <div class="flex gap-1">
                  <UInput
                    v-model.number="recipeForm.sellingPrice"
                    type="number"
                    min="0"
                    step="1000"
                    class="flex-1"
                  />
                  <UTooltip :text="t('recipes.suggestPriceTooltip')">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-light-bulb"
                      @click="getSuggestedPrice"
                    />
                  </UTooltip>
                </div>
              </UFormField>
              <UFormField :label="t('recipes.prepCookTime')">
                <div class="flex gap-2">
                  <UInput
                    v-model.number="recipeForm.prepTime"
                    type="number"
                    min="0"
                    :placeholder="t('recipes.prep')"
                  />
                  <UInput
                    v-model.number="recipeForm.cookTime"
                    type="number"
                    min="0"
                    :placeholder="t('recipes.cook')"
                  />
                </div>
              </UFormField>
            </div>

            <!-- Description -->
            <UFormField :label="t('recipes.instructions')">
              <UTextarea
                v-model="recipeForm.description"
                :placeholder="t('recipes.instructionsPlaceholder')"
                :rows="3"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="outline"
                :label="t('common.cancel')"
                @click="showRecipeModal = false"
              />
              <UButton
                color="primary"
                :loading="saving"
                :disabled="!recipeForm.name || !recipeForm.ingredients.length"
                :label="
                  selectedRecipe ? t('common.update') : t('common.create')
                "
                @click="saveRecipe"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Recipe Details Modal -->
    <UModal
      v-model:open="showDetailsModal"
      :overlay="true"
      :ui="{ overlay: 'bg-gray-950/50 dark:bg-gray-950/75' }"
    >
      <template #content>
        <UCard v-if="selectedRecipe" class="max-w-2xl">
          <template #header>
            <div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ selectedRecipe.name }}
              </h3>
              <p
                v-if="selectedRecipe.nameTh"
                class="text-gray-500 dark:text-gray-400"
              >
                {{ selectedRecipe.nameTh }}
              </p>
            </div>
          </template>

          <!-- Info Cards -->
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
              <div class="text-2xl mb-1">🍽️</div>
              <div class="font-bold">{{ selectedRecipe.servings }}</div>
              <div class="text-sm text-gray-500">
                {{ selectedRecipe.servingUnit }}
              </div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
              <div class="text-2xl mb-1">⏱️</div>
              <div class="font-bold">
                {{ selectedRecipe.prepTime + selectedRecipe.cookTime }}
              </div>
              <div class="text-sm text-gray-500">
                {{ t("recipes.minutes") }}
              </div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
              <div class="text-2xl mb-1">💰</div>
              <UBadge
                :color="getProfitColor(selectedRecipe.profitMargin)"
                :label="formatPercent(selectedRecipe.profitMargin)"
                size="lg"
              />
              <div class="text-sm text-gray-500">{{ t("recipes.margin") }}</div>
            </div>
          </div>

          <!-- Ingredients Table -->
          <div class="mb-6">
            <h4 class="font-semibold text-gray-900 dark:text-white mb-3">
              {{ t("recipes.ingredients") }}
            </h4>
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b dark:border-gray-700">
                  <th class="text-left py-2">{{ t("recipes.ingredient") }}</th>
                  <th class="text-right py-2">{{ t("recipes.quantity") }}</th>
                  <th class="text-right py-2">{{ t("recipes.cost") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="ing in selectedRecipe.ingredients"
                  :key="ing.ingredientId"
                  class="border-b dark:border-gray-700"
                >
                  <td class="py-2">
                    {{ getIngredientName(ing.ingredientId) }}
                  </td>
                  <td class="text-right py-2">
                    {{ ing.quantity }} {{ ing.unit }}
                  </td>
                  <td class="text-right py-2">
                    {{ formatCurrency(ing.cost) }}
                  </td>
                </tr>
                <tr class="font-bold bg-gray-50 dark:bg-gray-900">
                  <td class="py-2" colspan="2">
                    {{ t("recipes.totalIngredientCost") }}
                  </td>
                  <td class="text-right py-2">
                    {{ formatCurrency(selectedRecipe.totalIngredientCost) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Cost Breakdown -->
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h4 class="font-semibold text-gray-900 dark:text-white mb-3">
              {{ t("recipes.costBreakdown") }}
            </h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span>{{ t("recipes.ingredientCostPerServing") }}</span>
                <span>{{ formatCurrency(selectedRecipe.costPerServing) }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ t("recipes.overheadPerServing") }}</span>
                <span>{{
                  formatCurrency(
                    selectedRecipe.overheadCost / selectedRecipe.servings
                  )
                }}</span>
              </div>
              <div class="flex justify-between font-medium border-t pt-2">
                <span>{{ t("recipes.totalCostPerServing") }}</span>
                <span>{{
                  formatCurrency(selectedRecipe.totalCostPerServing)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ t("recipes.sellingPrice") }}:</span>
                <span>{{ formatCurrency(selectedRecipe.sellingPrice) }}</span>
              </div>
              <div
                class="flex justify-between font-bold text-green-600 dark:text-green-400 text-base"
              >
                <span
                  >{{ t("recipes.profit") }}
                  {{ t("common.perServing", "per Serving") }}:</span
                >
                <span>{{
                  formatCurrency(selectedRecipe.profitPerServing)
                }}</span>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-between">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-pencil"
                :label="t('recipes.editRecipeButton')"
                @click="
                  showDetailsModal = false;
                  openRecipeModal(selectedRecipe);
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

    <!-- Delete Confirmation Modal -->
    <UModal
      v-model:open="showDeleteModal"
      :overlay="true"
      :ui="{ overlay: 'bg-gray-950/50 dark:bg-gray-950/75' }"
    >
      <template #content>
        <UCard>
          <template #header>
            <h3
              class="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
              {{ t("common.confirmDelete") }}
            </h3>
          </template>

          <p class="text-gray-600 dark:text-gray-400">
            {{ t("common.deleteConfirmMessage") }}
            <strong class="text-gray-900 dark:text-white">
              "{{ recipeToDelete?.name }}" </strong
            >?
            {{ t("common.cannotUndo") }}
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="outline"
                :label="t('common.cancel')"
                @click="showDeleteModal = false"
              />
              <UButton
                color="red"
                :loading="deleting"
                :label="t('common.delete')"
                @click="executeDeleteRecipe"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
