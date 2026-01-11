// ============================================
// 🍳 RECIPES COMPOSABLE
// Recipe Management with Cost & Profit Calculations
// ============================================

import type {
  Recipe,
  RecipeIngredient,
  RecipeStep,
  Product,
  ProductionPlan,
  ProductionPlanItem,
  MenuProfitAnalysis,
} from '~/types';
import {
  db,
  type RecipeRecord,
  type ProductionPlanRecord,
} from '~/db/db';

// Singleton state
const recipes = ref<Recipe[]>([]);
const productionPlans = ref<ProductionPlan[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);
const syncPending = ref(0);

// Filter state
const searchQuery = ref('');
const selectedCategory = ref<string>('all');

/**
 * 🍳 RECIPES STORE
 * Manages recipes, cost calculations, and production planning
 */
export function useRecipes() {
  const ingredientsStore = useIngredients();
  const productsStore = useProductsStore();
  const offline = useOffline();

  // ============================================
  // 📊 COMPUTED
  // ============================================

  const filteredRecipes = computed(() => {
    let result = [...recipes.value];

    // Category filter
    if (selectedCategory.value !== 'all') {
      result = result.filter(r => r.categoryId === selectedCategory.value);
    }

    // Search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim();
      result = result.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.nameTh?.toLowerCase().includes(query) ||
        r.product?.name.toLowerCase().includes(query)
      );
    }

    return result.filter(r => r.isActive);
  });

  const activeRecipes = computed(() =>
    recipes.value.filter(r => r.isActive)
  );

  const recipesWithProducts = computed(() =>
    recipes.value.filter(r => r.productId && r.isActive)
  );

  const highProfitRecipes = computed(() =>
    recipes.value
      .filter(r => r.isActive && r.profitMargin >= 50)
      .sort((a, b) => b.profitMargin - a.profitMargin)
  );

  const lowProfitRecipes = computed(() =>
    recipes.value
      .filter(r => r.isActive && r.profitMargin < 30)
      .sort((a, b) => a.profitMargin - b.profitMargin)
  );

  const averageProfitMargin = computed(() => {
    const active = activeRecipes.value;
    if (active.length === 0) return 0;
    return active.reduce((sum, r) => sum + r.profitMargin, 0) / active.length;
  });

  const activeProductionPlans = computed(() =>
    productionPlans.value.filter(p => p.status !== 'cancelled' && p.status !== 'completed')
  );

  // ============================================
  // 🔧 HELPER FUNCTIONS
  // ============================================

  function generateId(prefix = 'recipe'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================
  // 💰 COST CALCULATIONS
  // ============================================

  /**
   * Calculate ingredient cost for a recipe
   */
  function calculateIngredientCosts(ingredients: RecipeIngredient[]): RecipeIngredient[] {
    return ingredients.map(ing => {
      const cost = ingredientsStore.calculateCost(ing.ingredientId, ing.quantity, ing.unit);
      return {
        ...ing,
        cost,
        ingredient: ingredientsStore.getIngredient(ing.ingredientId),
      };
    });
  }

  /**
   * Calculate total ingredient cost
   */
  function calculateTotalIngredientCost(ingredients: RecipeIngredient[]): number {
    return ingredients.reduce((sum, ing) => sum + ing.cost, 0);
  }

  /**
   * Calculate recipe costs and profits
   */
  function calculateRecipeCosts(recipe: Partial<Recipe>): {
    totalIngredientCost: number;
    costPerServing: number;
    totalCostPerServing: number;
    profitPerServing: number;
    profitMargin: number;
  } {
    const ingredients = calculateIngredientCosts(recipe.ingredients || []);
    const totalIngredientCost = calculateTotalIngredientCost(ingredients);
    const servings = recipe.servings || 1;
    const sellingPrice = recipe.sellingPrice || 0;
    const overheadCost = recipe.overheadCost || 0;

    const costPerServing = totalIngredientCost / servings;
    const overheadPerServing = overheadCost / servings;
    const totalCostPerServing = costPerServing + overheadPerServing;
    const profitPerServing = sellingPrice - totalCostPerServing;
    const profitMargin = sellingPrice > 0 
      ? (profitPerServing / sellingPrice) * 100 
      : 0;

    return {
      totalIngredientCost,
      costPerServing,
      totalCostPerServing,
      profitPerServing,
      profitMargin: Math.round(profitMargin * 100) / 100,
    };
  }

  /**
   * Suggest selling price based on target profit margin
   */
  function suggestSellingPrice(recipe: Recipe, targetMargin: number = 60): number {
    const { totalCostPerServing } = calculateRecipeCosts(recipe);
    // Price = Cost / (1 - margin%)
    const suggestedPrice = totalCostPerServing / (1 - (targetMargin / 100));
    // Round to nearest 5
    return Math.ceil(suggestedPrice / 5) * 5;
  }

  /**
   * Calculate ingredients needed for X servings
   */
  function scaleRecipe(recipe: Recipe, targetServings: number): RecipeIngredient[] {
    const scaleFactor = targetServings / recipe.servings;
    return recipe.ingredients.map(ing => ({
      ...ing,
      quantity: ing.quantity * scaleFactor,
      cost: ing.cost * scaleFactor,
    }));
  }

  // ============================================
  // 💾 LOCAL DB OPERATIONS
  // ============================================

  async function loadFromLocal(): Promise<void> {
    try {
      const records = await db.recipes.where('isActive').equals(1).toArray();
      recipes.value = await Promise.all(records.map(r => recordToRecipe(r)));

      // Load production plans
      const planRecords = await db.productionPlans
        .orderBy('createdAt')
        .reverse()
        .limit(50)
        .toArray();
      productionPlans.value = planRecords.map(r => recordToPlan(r));
    } catch (e) {
      console.error('Failed to load recipes:', e);
      error.value = `Failed to load recipes: ${e}`;
    }
  }

  async function recordToRecipe(r: RecipeRecord): Promise<Recipe> {
    const ingredients: RecipeIngredient[] = JSON.parse(r.ingredientsJson || '[]');
    const steps: RecipeStep[] = r.stepsJson ? JSON.parse(r.stepsJson) : [];
    const tags: string[] = r.tagsJson ? JSON.parse(r.tagsJson) : [];

    // Populate ingredient references
    const populatedIngredients = ingredients.map(ing => ({
      ...ing,
      ingredient: ingredientsStore.getIngredient(ing.ingredientId),
    }));

    // Get product reference
    const product = productsStore.getProduct(r.productId);

    return {
      id: r.id,
      productId: r.productId,
      product,
      name: r.name,
      nameTh: r.nameTh,
      description: r.description,
      servings: r.servings,
      servingUnit: r.servingUnit,
      ingredients: populatedIngredients,
      steps,
      totalIngredientCost: r.totalIngredientCost,
      costPerServing: r.costPerServing,
      overheadCost: r.overheadCost,
      totalCostPerServing: r.totalCostPerServing,
      sellingPrice: r.sellingPrice,
      profitPerServing: r.profitPerServing,
      profitMargin: r.profitMargin,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      difficulty: r.difficulty,
      categoryId: r.categoryId,
      tags,
      isActive: r.isActive,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }

  function recipeToRecord(r: Recipe): RecipeRecord {
    return {
      id: r.id,
      productId: r.productId,
      name: r.name,
      nameTh: r.nameTh,
      description: r.description,
      servings: r.servings,
      servingUnit: r.servingUnit,
      ingredientsJson: JSON.stringify(r.ingredients.map(ing => ({
        ingredientId: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
        cost: ing.cost,
        notes: ing.notes,
      }))),
      stepsJson: r.steps ? JSON.stringify(r.steps) : undefined,
      totalIngredientCost: r.totalIngredientCost,
      costPerServing: r.costPerServing,
      overheadCost: r.overheadCost,
      totalCostPerServing: r.totalCostPerServing,
      sellingPrice: r.sellingPrice,
      profitPerServing: r.profitPerServing,
      profitMargin: r.profitMargin,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      difficulty: r.difficulty,
      categoryId: r.categoryId,
      tagsJson: r.tags ? JSON.stringify(r.tags) : undefined,
      isActive: r.isActive,
      createdAt: new Date(r.createdAt).getTime(),
      updatedAt: new Date(r.updatedAt).getTime(),
      synced: false,
    };
  }

  function recordToPlan(r: ProductionPlanRecord): ProductionPlan {
    const items: ProductionPlanItem[] = JSON.parse(r.itemsJson || '[]');
    return {
      id: r.id,
      date: r.date,
      items: items.map(item => ({
        ...item,
        recipe: recipes.value.find(rec => rec.id === item.recipeId),
      })),
      totalIngredientCost: r.totalIngredientCost,
      status: r.status,
      notes: r.notes,
      createdBy: r.createdBy,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }

  async function saveRecipeToLocal(recipe: Recipe): Promise<void> {
    await db.recipes.put(recipeToRecord(recipe));
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  async function init(): Promise<void> {
    if (isInitialized.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      // Make sure ingredients are loaded first
      await ingredientsStore.init();
      await productsStore.init();
      
      await loadFromLocal();
      isInitialized.value = true;
    } catch (e) {
      error.value = `Failed to initialize recipes: ${e}`;
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 🍳 RECIPE CRUD
  // ============================================

  async function addRecipe(
    data: Omit<Recipe, 'id' | 'totalIngredientCost' | 'costPerServing' | 'totalCostPerServing' | 'profitPerServing' | 'profitMargin' | 'createdAt' | 'updatedAt'>
  ): Promise<Recipe> {
    const now = new Date().toISOString();

    // Calculate costs
    const ingredients = calculateIngredientCosts(data.ingredients);
    const costs = calculateRecipeCosts({ ...data, ingredients });

    const recipe: Recipe = {
      ...data,
      id: generateId(),
      ingredients,
      ...costs,
      createdAt: now,
      updatedAt: now,
    };

    recipes.value.push(recipe);
    await saveRecipeToLocal(recipe);
    syncPending.value++;

    return recipe;
  }

  async function updateRecipe(
    id: string,
    updates: Partial<Recipe>
  ): Promise<Recipe | null> {
    const index = recipes.value.findIndex(r => r.id === id);
    if (index === -1) return null;

    const existing = recipes.value[index]!;

    // Recalculate costs if ingredients or servings changed
    let costUpdates = {};
    if (updates.ingredients || updates.servings || updates.overheadCost || updates.sellingPrice) {
      const newIngredients = updates.ingredients 
        ? calculateIngredientCosts(updates.ingredients)
        : existing.ingredients;
      
      costUpdates = calculateRecipeCosts({
        ...existing,
        ...updates,
        ingredients: newIngredients,
      });
      updates.ingredients = newIngredients;
    }

    const updated: Recipe = {
      ...existing,
      ...updates,
      ...costUpdates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    recipes.value[index] = updated;
    await saveRecipeToLocal(updated);

    return updated;
  }

  async function deleteRecipe(id: string): Promise<boolean> {
    const index = recipes.value.findIndex(r => r.id === id);
    if (index === -1) return false;

    const recipe = recipes.value[index]!;
    recipe.isActive = false;
    recipe.updatedAt = new Date().toISOString();

    await saveRecipeToLocal(recipe);
    recipes.value.splice(index, 1);

    return true;
  }

  function getRecipe(id: string): Recipe | undefined {
    return recipes.value.find(r => r.id === id);
  }

  function getRecipeByProductId(productId: string): Recipe | undefined {
    return recipes.value.find(r => r.productId === productId && r.isActive);
  }

  /**
   * Recalculate all recipe costs (when ingredient prices change)
   */
  async function recalculateAllCosts(): Promise<void> {
    for (const recipe of recipes.value) {
      const ingredients = calculateIngredientCosts(recipe.ingredients);
      const costs = calculateRecipeCosts({ ...recipe, ingredients });
      
      recipe.ingredients = ingredients;
      Object.assign(recipe, costs);
      recipe.updatedAt = new Date().toISOString();
      
      await saveRecipeToLocal(recipe);
    }
  }

  // ============================================
  // 📋 PRODUCTION PLANNING
  // ============================================

  /**
   * Create a production plan for a day
   */
  async function createProductionPlan(
    date: string,
    items: Array<{ recipeId: string; quantity: number }>
  ): Promise<ProductionPlan> {
    const planItems: ProductionPlanItem[] = items.map(item => {
      const recipe = getRecipe(item.recipeId);
      if (!recipe) throw new Error(`Recipe ${item.recipeId} not found`);

      return {
        recipeId: item.recipeId,
        recipe,
        quantity: item.quantity,
        totalServings: item.quantity * recipe.servings,
        ingredientCost: recipe.totalIngredientCost * item.quantity,
        status: 'pending',
      };
    });

    const totalCost = planItems.reduce((sum, item) => sum + item.ingredientCost, 0);

    const plan: ProductionPlan = {
      id: generateId('plan'),
      date,
      items: planItems,
      totalIngredientCost: totalCost,
      status: 'planned',
      createdBy: useUserIdentifier().getCurrentUserIdentifier(), // Use npub for decentralized identity
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to DB
    await db.productionPlans.put({
      id: plan.id,
      date: plan.date,
      itemsJson: JSON.stringify(planItems.map(item => ({
        recipeId: item.recipeId,
        quantity: item.quantity,
        totalServings: item.totalServings,
        ingredientCost: item.ingredientCost,
        status: item.status,
      }))),
      totalIngredientCost: plan.totalIngredientCost,
      status: plan.status,
      notes: plan.notes,
      createdBy: plan.createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      synced: false,
    });

    productionPlans.value.unshift(plan);
    return plan;
  }

  /**
   * Get required ingredients for a production plan
   */
  function getRequiredIngredients(plan: ProductionPlan): Array<{
    ingredientId: string;
    ingredientName: string;
    requiredQuantity: number;
    currentStock: number;
    deficit: number;
    cost: number;
  }> {
    const requirements: Record<string, {
      ingredientId: string;
      ingredientName: string;
      requiredQuantity: number;
      unit: string;
      cost: number;
    }> = {};

    for (const item of plan.items) {
      const recipe = item.recipe || getRecipe(item.recipeId);
      if (!recipe) continue;

      for (const ing of recipe.ingredients) {
        const key = ing.ingredientId;
        const ingredient = ingredientsStore.getIngredient(ing.ingredientId);
        
        if (!requirements[key]) {
          requirements[key] = {
            ingredientId: ing.ingredientId,
            ingredientName: ingredient?.name || 'Unknown',
            requiredQuantity: 0,
            unit: ing.unit,
            cost: 0,
          };
        }

        const scaledQty = ing.quantity * item.quantity;
        requirements[key]!.requiredQuantity += scaledQty;
        requirements[key]!.cost += ing.cost * item.quantity;
      }
    }

    return Object.values(requirements).map(req => {
      const ingredient = ingredientsStore.getIngredient(req.ingredientId);
      const currentStock = ingredient?.currentStock || 0;
      
      // Convert required quantity to base unit for comparison
      const requiredInBase = ingredientsStore.convertQuantity(
        req.requiredQuantity,
        req.unit as any,
        ingredient?.baseUnit || 'kg'
      );

      return {
        ...req,
        currentStock,
        deficit: Math.max(0, requiredInBase - currentStock),
      };
    });
  }

  /**
   * Execute production plan (deduct ingredients)
   */
  async function executeProductionPlan(planId: string): Promise<boolean> {
    const plan = productionPlans.value.find(p => p.id === planId);
    if (!plan) return false;

    try {
      // Get all required ingredients
      const requirements = getRequiredIngredients(plan);

      // Check if we have enough stock
      const shortages = requirements.filter(r => r.deficit > 0);
      if (shortages.length > 0) {
        error.value = `Insufficient stock for: ${shortages.map(s => s.ingredientName).join(', ')}`;
        return false;
      }

      // Deduct ingredients
      for (const req of requirements) {
        await ingredientsStore.useStock(
          req.ingredientId,
          req.requiredQuantity,
          planId,
          'production'
        );
      }

      // Update plan status
      plan.status = 'completed';
      plan.updatedAt = new Date().toISOString();

      await db.productionPlans.update(planId, {
        status: 'completed',
        updatedAt: Date.now(),
      });

      return true;
    } catch (e) {
      console.error('Failed to execute production plan:', e);
      error.value = `Failed to execute production: ${e}`;
      return false;
    }
  }

  // ============================================
  // 📊 SALES INTEGRATION
  // ============================================

  /**
   * Deduct ingredients when an order item with recipe is sold
   */
  async function deductIngredientsForSale(
    productId: string,
    quantity: number,
    orderId: string
  ): Promise<boolean> {
    const recipe = getRecipeByProductId(productId);
    if (!recipe) {
      // No recipe = no ingredient deduction needed
      return true;
    }

    try {
      // Scale ingredients for sold quantity (quantity = number of servings sold)
      const scaleFactor = quantity / recipe.servings;
      
      for (const ing of recipe.ingredients) {
        await ingredientsStore.useStock(
          ing.ingredientId,
          ing.quantity * scaleFactor,
          orderId,
          'order'
        );
      }

      return true;
    } catch (e) {
      console.error('Failed to deduct ingredients for sale:', e);
      return false;
    }
  }

  /**
   * Calculate ingredient requirements for an order
   */
  function getIngredientsForOrder(
    items: Array<{ productId: string; quantity: number }>
  ): Array<{
    ingredientId: string;
    ingredientName: string;
    requiredQuantity: number;
    available: boolean;
  }> {
    const requirements: Record<string, {
      ingredientId: string;
      ingredientName: string;
      requiredQuantity: number;
    }> = {};

    for (const item of items) {
      const recipe = getRecipeByProductId(item.productId);
      if (!recipe) continue;

      const scaleFactor = item.quantity;

      for (const ing of recipe.ingredients) {
        if (!requirements[ing.ingredientId]) {
          const ingredient = ingredientsStore.getIngredient(ing.ingredientId);
          requirements[ing.ingredientId] = {
            ingredientId: ing.ingredientId,
            ingredientName: ingredient?.name || 'Unknown',
            requiredQuantity: 0,
          };
        }

        requirements[ing.ingredientId]!.requiredQuantity += ing.quantity * scaleFactor / recipe.servings;
      }
    }

    return Object.values(requirements).map(req => {
      const ingredient = ingredientsStore.getIngredient(req.ingredientId);
      const available = ingredient 
        ? ingredient.currentStock >= req.requiredQuantity 
        : false;

      return {
        ...req,
        available,
      };
    });
  }

  // ============================================
  // 📊 PROFIT ANALYTICS
  // ============================================

  /**
   * Get profit analysis for a period
   */
  async function getProfitAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<MenuProfitAnalysis[]> {
    // This would typically join with orders data
    // For now, return recipe-based analysis
    return recipes.value
      .filter(r => r.isActive && r.productId)
      .map(recipe => ({
        productId: recipe.productId,
        productName: recipe.product?.name || recipe.name,
        recipeId: recipe.id,
        totalSold: 0, // TODO: Get from orders
        totalRevenue: 0,
        totalIngredientCost: 0,
        totalProfit: 0,
        profitMargin: recipe.profitMargin,
        avgCostPerUnit: recipe.totalCostPerServing,
        period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
      }));
  }

  /**
   * Get top profit margin recipes
   */
  function getTopProfitRecipes(limit = 10): Recipe[] {
    return [...recipes.value]
      .filter(r => r.isActive)
      .sort((a, b) => b.profitMargin - a.profitMargin)
      .slice(0, limit);
  }

  /**
   * Get recipes needing price review (low margin)
   */
  function getRecipesNeedingReview(minMargin = 30): Recipe[] {
    return recipes.value
      .filter(r => r.isActive && r.profitMargin < minMargin)
      .sort((a, b) => a.profitMargin - b.profitMargin);
  }

  // ============================================
  // 🔍 QUERIES & FILTERS
  // ============================================

  function setSearchQuery(query: string): void {
    searchQuery.value = query;
  }

  function setSelectedCategory(categoryId: string): void {
    selectedCategory.value = categoryId;
  }

  function getRecipesByCategory(categoryId: string): Recipe[] {
    if (categoryId === 'all') return activeRecipes.value;
    return activeRecipes.value.filter(r => r.categoryId === categoryId);
  }

  // ============================================
  // 📤 IMPORT/EXPORT
  // ============================================

  async function exportRecipes(): Promise<string> {
    return JSON.stringify({
      recipes: recipes.value,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  async function importRecipes(jsonData: string): Promise<{ imported: number; errors: number }> {
    let imported = 0;
    let errors = 0;

    try {
      const data = JSON.parse(jsonData);

      if (data.recipes) {
        for (const recipe of data.recipes) {
          try {
            if (!recipes.value.find(r => r.id === recipe.id)) {
              await addRecipe(recipe);
              imported++;
            }
          } catch {
            errors++;
          }
        }
      }
    } catch (e) {
      console.error('Failed to import recipes:', e);
      error.value = 'Failed to import recipes';
    }

    return { imported, errors };
  }

  return {
    // State
    recipes,
    productionPlans,
    isLoading,
    error,
    isInitialized,
    syncPending,

    // Filter state
    searchQuery,
    selectedCategory,

    // Computed
    filteredRecipes,
    activeRecipes,
    recipesWithProducts,
    highProfitRecipes,
    lowProfitRecipes,
    averageProfitMargin,
    activeProductionPlans,

    // Init
    init,

    // CRUD
    addRecipe,
    updateRecipe,
    deleteRecipe,
    getRecipe,
    getRecipeByProductId,
    recalculateAllCosts,

    // Cost Calculations
    calculateIngredientCosts,
    calculateTotalIngredientCost,
    calculateRecipeCosts,
    suggestSellingPrice,
    scaleRecipe,

    // Production Planning
    createProductionPlan,
    getRequiredIngredients,
    executeProductionPlan,

    // Sales Integration
    deductIngredientsForSale,
    getIngredientsForOrder,

    // Analytics
    getProfitAnalysis,
    getTopProfitRecipes,
    getRecipesNeedingReview,

    // Queries
    setSearchQuery,
    setSelectedCategory,
    getRecipesByCategory,

    // Import/Export
    exportRecipes,
    importRecipes,
  };
}
