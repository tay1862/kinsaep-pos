<script setup lang="ts">
/**
 * 📊 RECIPE PROFIT ANALYSIS COMPONENT
 * Shows profit margins and cost analysis for menu items
 */

const props = defineProps<{
  startDate?: Date;
  endDate?: Date;
}>();

const recipesStore = useRecipes();
const ingredientsStore = useIngredients();

// Initialize stores
onMounted(async () => {
  await Promise.all([recipesStore.init(), ingredientsStore.init()]);
});

// Stats
const stats = computed(() => {
  const recipes = recipesStore.activeRecipes.value;
  if (!recipes.length) {
    return {
      totalRecipes: 0,
      avgProfitMargin: 0,
      avgCostPerServing: 0,
      avgSellingPrice: 0,
      highProfitCount: 0,
      lowProfitCount: 0,
      totalIngredientValue: 0,
    };
  }

  const totalMargin = recipes.reduce((sum, r) => sum + r.profitMargin, 0);
  const totalCost = recipes.reduce((sum, r) => sum + r.totalCostPerServing, 0);
  const totalPrice = recipes.reduce((sum, r) => sum + r.sellingPrice, 0);

  return {
    totalRecipes: recipes.length,
    avgProfitMargin: totalMargin / recipes.length,
    avgCostPerServing: totalCost / recipes.length,
    avgSellingPrice: totalPrice / recipes.length,
    highProfitCount: recipes.filter((r) => r.profitMargin >= 50).length,
    lowProfitCount: recipes.filter((r) => r.profitMargin < 30).length,
    totalIngredientValue: ingredientsStore.totalInventoryValue.value,
  };
});

// Format helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getProfitColor(margin: number): string {
  if (margin >= 60) return "text-green-600 dark:text-green-400";
  if (margin >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getProfitBg(margin: number): string {
  if (margin >= 60) return "bg-green-100 dark:bg-green-900/30";
  if (margin >= 40) return "bg-yellow-100 dark:bg-yellow-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}
</script>

<template>
  <div class="space-y-6">
    <!-- Summary Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-gray-500 dark:text-gray-400 text-sm"
            >Total Recipes</span
          >
          <span class="text-2xl">📋</span>
        </div>
        <div class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ stats.totalRecipes }}
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-gray-500 dark:text-gray-400 text-sm"
            >Avg. Margin</span
          >
          <span class="text-2xl">💰</span>
        </div>
        <div
          class="text-2xl font-bold"
          :class="getProfitColor(stats.avgProfitMargin)"
        >
          {{ formatPercent(stats.avgProfitMargin) }}
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-gray-500 dark:text-gray-400 text-sm"
            >Avg. Cost</span
          >
          <span class="text-2xl">📊</span>
        </div>
        <div class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ formatCurrency(stats.avgCostPerServing) }}
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-gray-500 dark:text-gray-400 text-sm"
            >Inventory Value</span
          >
          <span class="text-2xl">📦</span>
        </div>
        <div class="text-2xl font-bold text-primary-600">
          {{ formatCurrency(stats.totalIngredientValue) }}
        </div>
      </div>
    </div>

    <!-- Profit Distribution -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- High Profit Items -->
      <div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
      >
        <div
          class="p-4 border-b dark:border-gray-700 flex items-center justify-between"
        >
          <h3 class="font-semibold text-gray-900 dark:text-white">
            🌟 Top Profit Margins
          </h3>
          <span class="text-sm text-green-600 dark:text-green-400">
            {{ stats.highProfitCount }} items >50%
          </span>
        </div>
        <div class="divide-y dark:divide-gray-700">
          <div
            v-for="recipe in recipesStore.getTopProfitRecipes(5)"
            :key="recipe.id"
            class="p-4 flex justify-between items-center"
          >
            <div>
              <div class="font-medium text-gray-900 dark:text-white">
                {{ recipe.name }}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                Cost: {{ formatCurrency(recipe.totalCostPerServing) }} | Price:
                {{ formatCurrency(recipe.sellingPrice) }}
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold text-green-600 dark:text-green-400">
                {{ formatPercent(recipe.profitMargin) }}
              </div>
              <div class="text-sm text-gray-500">
                +{{ formatCurrency(recipe.profitPerServing) }}/unit
              </div>
            </div>
          </div>

          <div
            v-if="!recipesStore.getTopProfitRecipes(5).length"
            class="p-8 text-center text-gray-500"
          >
            No recipes yet
          </div>
        </div>
      </div>

      <!-- Low Profit Items -->
      <div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
      >
        <div
          class="p-4 border-b dark:border-gray-700 flex items-center justify-between"
        >
          <h3 class="font-semibold text-gray-900 dark:text-white">
            ⚠️ Needs Price Review
          </h3>
          <span class="text-sm text-red-600 dark:text-red-400">
            {{ stats.lowProfitCount }} items &lt;30%
          </span>
        </div>
        <div class="divide-y dark:divide-gray-700">
          <div
            v-for="recipe in recipesStore
              .getRecipesNeedingReview(30)
              .slice(0, 5)"
            :key="recipe.id"
            class="p-4 flex justify-between items-center"
          >
            <div>
              <div class="font-medium text-gray-900 dark:text-white">
                {{ recipe.name }}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                Cost: {{ formatCurrency(recipe.totalCostPerServing) }} | Price:
                {{ formatCurrency(recipe.sellingPrice) }}
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold text-red-600 dark:text-red-400">
                {{ formatPercent(recipe.profitMargin) }}
              </div>
              <div class="text-sm text-green-600">
                Suggested:
                {{
                  formatCurrency(recipesStore.suggestSellingPrice(recipe, 60))
                }}
              </div>
            </div>
          </div>

          <div
            v-if="!recipesStore.getRecipesNeedingReview(30).length"
            class="p-8 text-center text-gray-500"
          >
            ✅ All items have healthy margins
          </div>
        </div>
      </div>
    </div>

    <!-- All Recipes Analysis -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div class="p-4 border-b dark:border-gray-700">
        <h3 class="font-semibold text-gray-900 dark:text-white">
          📊 Complete Recipe Analysis
        </h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">
                Recipe
              </th>
              <th
                class="px-4 py-3 text-right text-sm font-medium text-gray-500"
              >
                Ingredient Cost
              </th>
              <th
                class="px-4 py-3 text-right text-sm font-medium text-gray-500"
              >
                Overhead
              </th>
              <th
                class="px-4 py-3 text-right text-sm font-medium text-gray-500"
              >
                Total Cost
              </th>
              <th
                class="px-4 py-3 text-right text-sm font-medium text-gray-500"
              >
                Selling Price
              </th>
              <th
                class="px-4 py-3 text-right text-sm font-medium text-gray-500"
              >
                Profit
              </th>
              <th
                class="px-4 py-3 text-center text-sm font-medium text-gray-500"
              >
                Margin
              </th>
            </tr>
          </thead>
          <tbody class="divide-y dark:divide-gray-700">
            <tr
              v-for="recipe in recipesStore.activeRecipes.value"
              :key="recipe.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ recipe.name }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ recipe.servings }} {{ recipe.servingUnit }}
                </div>
              </td>
              <td class="px-4 py-3 text-right text-sm">
                {{ formatCurrency(recipe.costPerServing) }}
              </td>
              <td class="px-4 py-3 text-right text-sm">
                {{ formatCurrency(recipe.overheadCost / recipe.servings) }}
              </td>
              <td class="px-4 py-3 text-right text-sm font-medium">
                {{ formatCurrency(recipe.totalCostPerServing) }}
              </td>
              <td class="px-4 py-3 text-right text-sm">
                {{ formatCurrency(recipe.sellingPrice) }}
              </td>
              <td
                class="px-4 py-3 text-right text-sm font-medium text-green-600"
              >
                {{ formatCurrency(recipe.profitPerServing) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="px-2 py-1 rounded-full text-xs font-bold"
                  :class="
                    getProfitBg(recipe.profitMargin) +
                    ' ' +
                    getProfitColor(recipe.profitMargin)
                  "
                >
                  {{ formatPercent(recipe.profitMargin) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div
          v-if="!recipesStore.activeRecipes.value.length"
          class="p-12 text-center"
        >
          <div class="text-6xl mb-4">📝</div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No recipes yet
          </h3>
          <p class="text-gray-500 dark:text-gray-400">
            Create recipes to see profit analysis
          </p>
          <NuxtLinkLocale
            to="/recipes"
            class="mt-4 inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Go to Recipes
          </NuxtLinkLocale>
        </div>
      </div>
    </div>

    <!-- Ingredient Stock Summary -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div
        class="p-4 border-b dark:border-gray-700 flex items-center justify-between"
      >
        <h3 class="font-semibold text-gray-900 dark:text-white">
          🧪 Ingredient Stock Status
        </h3>
        <NuxtLinkLocale
          to="/ingredients"
          class="text-sm text-primary-600 hover:text-primary-700"
        >
          View All →
        </NuxtLinkLocale>
      </div>
      <div class="p-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center"
          >
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              {{
                ingredientsStore.activeIngredients.value.length -
                ingredientsStore.lowStockIngredients.value.length
              }}
            </div>
            <div class="text-sm text-green-600 dark:text-green-400">
              In Stock
            </div>
          </div>
          <div
            class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center"
          >
            <div
              class="text-2xl font-bold text-yellow-600 dark:text-yellow-400"
            >
              {{ ingredientsStore.lowStockIngredients.value.length }}
            </div>
            <div class="text-sm text-yellow-600 dark:text-yellow-400">
              Low Stock
            </div>
          </div>
          <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-red-600 dark:text-red-400">
              {{ ingredientsStore.outOfStockIngredients.value.length }}
            </div>
            <div class="text-sm text-red-600 dark:text-red-400">
              Out of Stock
            </div>
          </div>
          <div
            class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center"
          >
            <div
              class="text-2xl font-bold text-orange-600 dark:text-orange-400"
            >
              {{ ingredientsStore.pendingAlerts.value.length }}
            </div>
            <div class="text-sm text-orange-600 dark:text-orange-400">
              Alerts
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
