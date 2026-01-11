// ============================================
// 🧪 INGREDIENTS COMPOSABLE
// Raw Material Management with Cost Tracking
// ============================================

import type { 
  Ingredient, 
  IngredientCategory,
  IngredientUnit,
  IngredientStockAdjustment,
  LowStockAlert
} from '~/types';
import { 
  db, 
  type IngredientRecord, 
  type IngredientCategoryRecord,
  type IngredientStockAdjustmentRecord,
  type LowStockAlertRecord
} from '~/db/db';

// ============================================
// 📋 DEFAULT DATA
// ============================================

const DEFAULT_INGREDIENT_CATEGORIES: IngredientCategory[] = [
  { id: 'dry', name: 'Dry Goods', nameTh: 'วัตถุดิบแห้ง', icon: '🌾', sortOrder: 1 },
  { id: 'dairy', name: 'Dairy', nameTh: 'นม/ผลิตภัณฑ์นม', icon: '🥛', sortOrder: 2 },
  { id: 'fresh', name: 'Fresh Produce', nameTh: 'ของสด', icon: '🥬', sortOrder: 3 },
  { id: 'meat', name: 'Meat & Protein', nameTh: 'เนื้อสัตว์', icon: '🥩', sortOrder: 4 },
  { id: 'frozen', name: 'Frozen', nameTh: 'ของแช่แข็ง', icon: '🧊', sortOrder: 5 },
  { id: 'spices', name: 'Spices & Seasonings', nameTh: 'เครื่องเทศ', icon: '🌶️', sortOrder: 6 },
  { id: 'beverages', name: 'Beverages', nameTh: 'เครื่องดื่ม', icon: '🍹', sortOrder: 7 },
  { id: 'packaging', name: 'Packaging', nameTh: 'บรรจุภัณฑ์', icon: '📦', sortOrder: 8 },
];

const UNIT_CONVERSIONS: Record<IngredientUnit, { toBase: IngredientUnit; factor: number }> = {
  'g': { toBase: 'kg', factor: 0.001 },
  'kg': { toBase: 'kg', factor: 1 },
  'ml': { toBase: 'l', factor: 0.001 },
  'l': { toBase: 'l', factor: 1 },
  'tsp': { toBase: 'ml', factor: 5 },
  'tbsp': { toBase: 'ml', factor: 15 },
  'cup': { toBase: 'ml', factor: 240 },
  'piece': { toBase: 'piece', factor: 1 },
  'pack': { toBase: 'pack', factor: 1 },
  'tray': { toBase: 'tray', factor: 1 },
  'bottle': { toBase: 'bottle', factor: 1 },
  'can': { toBase: 'can', factor: 1 },
};

// Singleton state
const ingredients = ref<Ingredient[]>([]);
const categories = ref<IngredientCategory[]>([]);
const stockAdjustments = ref<IngredientStockAdjustment[]>([]);
const lowStockAlerts = ref<LowStockAlert[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);
const syncPending = ref(0);

// Filter state
const searchQuery = ref('');
const selectedCategory = ref<string>('all');

/**
 * 🧪 INGREDIENTS STORE
 * Manages raw materials, costs, and stock for recipes
 */
export function useIngredients() {
  const offline = useOffline();

  // ============================================
  // 📊 COMPUTED
  // ============================================

  const filteredIngredients = computed(() => {
    let result = [...ingredients.value];

    // Category filter
    if (selectedCategory.value !== 'all') {
      result = result.filter(i => i.categoryId === selectedCategory.value);
    }

    // Search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim();
      result = result.filter(i =>
        i.name.toLowerCase().includes(query) ||
        i.code.toLowerCase().includes(query) ||
        i.nameTh?.toLowerCase().includes(query)
      );
    }

    // Only active
    return result.filter(i => i.isActive);
  });

  const activeIngredients = computed(() =>
    ingredients.value.filter(i => i.isActive)
  );

  const lowStockIngredients = computed(() =>
    ingredients.value.filter(i => i.currentStock <= i.minStock && i.isActive)
  );

  const outOfStockIngredients = computed(() =>
    ingredients.value.filter(i => i.currentStock <= 0 && i.isActive)
  );

  const totalInventoryValue = computed(() =>
    ingredients.value.reduce((sum, i) => sum + (i.currentStock * i.costPerBaseUnit), 0)
  );

  const ingredientsByCategory = computed(() => {
    const grouped: Record<string, Ingredient[]> = {};
    for (const ingredient of activeIngredients.value) {
      const catId = ingredient.categoryId || 'uncategorized';
      if (!grouped[catId]) {
        grouped[catId] = [];
      }
      grouped[catId]!.push(ingredient);
    }
    return grouped;
  });

  const pendingAlerts = computed(() =>
    lowStockAlerts.value.filter(a => !a.acknowledgedAt)
  );

  // ============================================
  // 🔧 HELPER FUNCTIONS
  // ============================================

  function generateId(prefix = 'ing'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  function generateCode(categoryId?: string): string {
    const prefix = categoryId ? categoryId.substring(0, 1).toUpperCase() : 'I';
    const count = ingredients.value.filter(i => i.categoryId === categoryId).length + 1;
    return `${prefix}${String(count).padStart(3, '0')}`;
  }

  /**
   * Calculate cost per unit from base unit cost
   */
  function calculateCostPerUnit(costPerBaseUnit: number, unit: IngredientUnit, baseUnit: IngredientUnit): number {
    const conversion = UNIT_CONVERSIONS[unit];
    if (conversion.toBase === baseUnit) {
      return costPerBaseUnit * conversion.factor;
    }
    return costPerBaseUnit;
  }

  /**
   * Convert quantity between units
   */
  function convertQuantity(
    quantity: number,
    fromUnit: IngredientUnit,
    toUnit: IngredientUnit
  ): number {
    const from = UNIT_CONVERSIONS[fromUnit];
    const to = UNIT_CONVERSIONS[toUnit];

    if (from.toBase !== to.toBase) {
      console.warn(`Cannot convert between ${fromUnit} and ${toUnit}`);
      return quantity;
    }

    // Convert to base, then to target
    const inBase = quantity * from.factor;
    return inBase / to.factor;
  }

  /**
   * Get stock status
   */
  function getStockStatus(ingredient: Ingredient): 'ok' | 'low' | 'critical' | 'out' {
    if (ingredient.currentStock <= 0) return 'out';
    if (ingredient.currentStock <= ingredient.minStock * 0.2) return 'critical';
    if (ingredient.currentStock <= ingredient.minStock) return 'low';
    return 'ok';
  }

  // ============================================
  // 💾 LOCAL DB OPERATIONS
  // ============================================

  async function loadFromLocal(): Promise<void> {
    try {
      // Load ingredients
      const records = await db.ingredients.where('isActive').equals(1).toArray();
      ingredients.value = records.map(r => recordToIngredient(r));

      // Load categories
      const catRecords = await db.ingredientCategories.orderBy('sortOrder').toArray();
      if (catRecords.length === 0) {
        await seedDefaultCategories();
        categories.value = DEFAULT_INGREDIENT_CATEGORIES;
      } else {
        categories.value = catRecords.map(r => ({
          id: r.id,
          name: r.name,
          nameTh: r.nameTh,
          icon: r.icon,
          sortOrder: r.sortOrder,
        }));
      }

      // Load recent adjustments
      const adjRecords = await db.ingredientStockAdjustments
        .orderBy('createdAt')
        .reverse()
        .limit(100)
        .toArray();
      stockAdjustments.value = adjRecords.map(r => recordToAdjustment(r));

      // Load active alerts
      const alertRecords = await db.lowStockAlerts
        .filter(a => !a.acknowledgedAt)
        .toArray();
      lowStockAlerts.value = alertRecords.map(r => recordToAlert(r));
    } catch (e) {
      console.error('Failed to load ingredients:', e);
      error.value = `Failed to load ingredients: ${e}`;
    }
  }

  async function seedDefaultCategories(): Promise<void> {
    for (const cat of DEFAULT_INGREDIENT_CATEGORIES) {
      await db.ingredientCategories.put({
        id: cat.id,
        name: cat.name,
        nameTh: cat.nameTh,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        synced: false,
      });
    }
  }

  function recordToIngredient(r: IngredientRecord): Ingredient {
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      nameTh: r.nameTh,
      unit: r.unit,
      baseUnit: r.baseUnit,
      conversionFactor: r.conversionFactor,
      costPerBaseUnit: r.costPerBaseUnit,
      costPerUnit: r.costPerUnit,
      currentStock: r.currentStock,
      minStock: r.minStock,
      maxStock: r.maxStock,
      supplierId: r.supplierId,
      categoryId: r.categoryId,
      storageType: r.storageType,
      isActive: r.isActive,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }

  function ingredientToRecord(i: Ingredient): IngredientRecord {
    return {
      id: i.id,
      code: i.code,
      name: i.name,
      nameTh: i.nameTh,
      unit: i.unit,
      baseUnit: i.baseUnit,
      conversionFactor: i.conversionFactor,
      costPerBaseUnit: i.costPerBaseUnit,
      costPerUnit: i.costPerUnit,
      currentStock: i.currentStock,
      minStock: i.minStock,
      maxStock: i.maxStock,
      supplierId: i.supplierId,
      categoryId: i.categoryId,
      storageType: i.storageType,
      isActive: i.isActive,
      createdAt: new Date(i.createdAt).getTime(),
      updatedAt: new Date(i.updatedAt).getTime(),
      synced: false,
    };
  }

  function recordToAdjustment(r: IngredientStockAdjustmentRecord): IngredientStockAdjustment {
    const ingredient = ingredients.value.find(i => i.id === r.ingredientId);
    return {
      id: r.id,
      ingredientId: r.ingredientId,
      ingredient,
      type: r.type,
      previousStock: r.previousStock,
      adjustment: r.adjustment,
      newStock: r.newStock,
      unitCost: r.unitCost,
      totalCost: r.totalCost,
      reason: r.reason,
      referenceId: r.referenceId,
      referenceType: r.referenceType,
      notes: r.notes,
      staffId: r.staffId,
      createdAt: new Date(r.createdAt).toISOString(),
    };
  }

  function recordToAlert(r: LowStockAlertRecord): LowStockAlert {
    const ingredient = ingredients.value.find(i => i.id === r.ingredientId);
    return {
      id: r.id,
      ingredientId: r.ingredientId,
      ingredient: ingredient!,
      currentStock: r.currentStock,
      minStock: r.minStock,
      deficitAmount: r.deficitAmount,
      suggestedPurchaseQty: r.suggestedPurchaseQty,
      estimatedCost: r.estimatedCost,
      priority: r.priority,
      createdAt: new Date(r.createdAt).toISOString(),
      acknowledgedAt: r.acknowledgedAt ? new Date(r.acknowledgedAt).toISOString() : undefined,
      acknowledgedBy: r.acknowledgedBy,
    };
  }

  async function saveIngredientToLocal(ingredient: Ingredient): Promise<void> {
    await db.ingredients.put(ingredientToRecord(ingredient));
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  async function init(): Promise<void> {
    if (isInitialized.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      await loadFromLocal();
      
      // Check for low stock
      await checkLowStock();

      isInitialized.value = true;
    } catch (e) {
      error.value = `Failed to initialize ingredients: ${e}`;
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 🧪 INGREDIENT CRUD
  // ============================================

  async function addIngredient(
    data: Omit<Ingredient, 'id' | 'code' | 'costPerUnit' | 'createdAt' | 'updatedAt'>
  ): Promise<Ingredient> {
    const now = new Date().toISOString();
    const costPerUnit = calculateCostPerUnit(data.costPerBaseUnit, data.unit, data.baseUnit);

    const ingredient: Ingredient = {
      ...data,
      id: generateId(),
      code: generateCode(data.categoryId),
      costPerUnit,
      createdAt: now,
      updatedAt: now,
    };

    ingredients.value.push(ingredient);
    await saveIngredientToLocal(ingredient);
    syncPending.value++;

    return ingredient;
  }

  async function updateIngredient(
    id: string,
    updates: Partial<Ingredient>
  ): Promise<Ingredient | null> {
    const index = ingredients.value.findIndex(i => i.id === id);
    if (index === -1) return null;

    const existing = ingredients.value[index]!;
    
    // Recalculate cost per unit if relevant fields changed
    let costPerUnit = existing.costPerUnit;
    if (updates.costPerBaseUnit || updates.unit || updates.baseUnit) {
      costPerUnit = calculateCostPerUnit(
        updates.costPerBaseUnit ?? existing.costPerBaseUnit,
        updates.unit ?? existing.unit,
        updates.baseUnit ?? existing.baseUnit
      );
    }

    const updated: Ingredient = {
      ...existing,
      ...updates,
      costPerUnit,
      id: existing.id,
      code: existing.code,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    ingredients.value[index] = updated;
    await saveIngredientToLocal(updated);

    return updated;
  }

  async function deleteIngredient(id: string): Promise<boolean> {
    const index = ingredients.value.findIndex(i => i.id === id);
    if (index === -1) return false;

    // Soft delete
    const ingredient = ingredients.value[index]!;
    ingredient.isActive = false;
    ingredient.updatedAt = new Date().toISOString();

    await saveIngredientToLocal(ingredient);
    ingredients.value.splice(index, 1);

    return true;
  }

  function getIngredient(id: string): Ingredient | undefined {
    return ingredients.value.find(i => i.id === id);
  }

  function getIngredientByCode(code: string): Ingredient | undefined {
    return ingredients.value.find(i => i.code === code);
  }

  // ============================================
  // 📦 STOCK OPERATIONS
  // ============================================

  /**
   * Adjust stock for an ingredient
   */
  async function adjustStock(
    ingredientId: string,
    adjustment: number,
    type: IngredientStockAdjustment['type'],
    options: {
      reason?: string;
      referenceId?: string;
      referenceType?: IngredientStockAdjustment['referenceType'];
      unitCost?: number;
      notes?: string;
    } = {}
  ): Promise<boolean> {
    const ingredient = ingredients.value.find(i => i.id === ingredientId);
    if (!ingredient) {
      error.value = 'Ingredient not found';
      return false;
    }

    const previousStock = ingredient.currentStock;
    const newStock = Math.max(0, previousStock + adjustment);
    const totalCost = options.unitCost ? Math.abs(adjustment) * options.unitCost : undefined;

    // Update ingredient stock
    ingredient.currentStock = newStock;
    ingredient.updatedAt = new Date().toISOString();
    await saveIngredientToLocal(ingredient);

    // Record adjustment
    const adjustmentRecord: IngredientStockAdjustmentRecord = {
      id: generateId('adj'),
      ingredientId,
      type,
      previousStock,
      adjustment,
      newStock,
      unitCost: options.unitCost,
      totalCost,
      reason: options.reason || type,
      referenceId: options.referenceId,
      referenceType: options.referenceType,
      notes: options.notes,
      staffId: 'current_user', // TODO: Get from auth
      createdAt: Date.now(),
      synced: false,
    };

    await db.ingredientStockAdjustments.put(adjustmentRecord);
    stockAdjustments.value.unshift(recordToAdjustment(adjustmentRecord));

    // Check low stock
    await checkIngredientStock(ingredient);

    return true;
  }

  /**
   * Add stock (purchase)
   */
  async function addStock(
    ingredientId: string,
    quantity: number,
    unitCost?: number,
    notes?: string
  ): Promise<boolean> {
    return adjustStock(ingredientId, quantity, 'purchase', {
      reason: 'Stock purchase',
      referenceType: 'purchase',
      unitCost,
      notes,
    });
  }

  /**
   * Use stock (for production/recipes)
   */
  async function useStock(
    ingredientId: string,
    quantity: number,
    referenceId?: string,
    referenceType: 'order' | 'production' = 'production'
  ): Promise<boolean> {
    return adjustStock(ingredientId, -quantity, 'usage', {
      reason: `Used for ${referenceType}`,
      referenceId,
      referenceType,
    });
  }

  /**
   * Record waste
   */
  async function recordWaste(
    ingredientId: string,
    quantity: number,
    reason?: string
  ): Promise<boolean> {
    return adjustStock(ingredientId, -quantity, 'waste', {
      reason: reason || 'Waste/Spoilage',
      referenceType: 'manual',
    });
  }

  /**
   * Set stock to specific value (count)
   */
  async function setStock(
    ingredientId: string,
    newStock: number,
    notes?: string
  ): Promise<boolean> {
    const ingredient = ingredients.value.find(i => i.id === ingredientId);
    if (!ingredient) return false;

    const adjustment = newStock - ingredient.currentStock;
    return adjustStock(ingredientId, adjustment, 'count', {
      reason: 'Physical count',
      referenceType: 'manual',
      notes,
    });
  }

  /**
   * Batch use ingredients for a recipe/order
   */
  async function useIngredientsForOrder(
    ingredientUsages: Array<{ ingredientId: string; quantity: number }>,
    orderId: string
  ): Promise<boolean> {
    try {
      for (const usage of ingredientUsages) {
        await useStock(usage.ingredientId, usage.quantity, orderId, 'order');
      }
      return true;
    } catch (e) {
      console.error('Failed to use ingredients for order:', e);
      error.value = 'Failed to deduct ingredients';
      return false;
    }
  }

  // ============================================
  // ⚠️ LOW STOCK ALERTS
  // ============================================

  async function checkIngredientStock(ingredient: Ingredient): Promise<void> {
    if (ingredient.currentStock <= ingredient.minStock) {
      const deficitAmount = ingredient.minStock - ingredient.currentStock;
      const suggestedPurchaseQty = ingredient.maxStock - ingredient.currentStock;
      
      let priority: LowStockAlert['priority'] = 'low';
      if (ingredient.currentStock <= 0) {
        priority = 'critical';
      } else if (ingredient.currentStock <= ingredient.minStock * 0.2) {
        priority = 'high';
      } else if (ingredient.currentStock <= ingredient.minStock * 0.5) {
        priority = 'medium';
      }

      // Check if alert already exists
      const existingAlert = lowStockAlerts.value.find(
        a => a.ingredientId === ingredient.id && !a.acknowledgedAt
      );

      if (!existingAlert) {
        const alertRecord: LowStockAlertRecord = {
          id: generateId('alert'),
          ingredientId: ingredient.id,
          currentStock: ingredient.currentStock,
          minStock: ingredient.minStock,
          deficitAmount,
          suggestedPurchaseQty,
          estimatedCost: suggestedPurchaseQty * ingredient.costPerBaseUnit,
          priority,
          createdAt: Date.now(),
          synced: false,
        };

        await db.lowStockAlerts.put(alertRecord);
        lowStockAlerts.value.unshift(recordToAlert(alertRecord));
      }
    }
  }

  async function checkLowStock(): Promise<void> {
    for (const ingredient of ingredients.value) {
      await checkIngredientStock(ingredient);
    }
  }

  async function acknowledgeAlert(alertId: string): Promise<boolean> {
    const index = lowStockAlerts.value.findIndex(a => a.id === alertId);
    if (index === -1) return false;

    const now = Date.now();
    await db.lowStockAlerts.update(alertId, {
      acknowledgedAt: now,
      acknowledgedBy: 'current_user', // TODO: Get from auth
    });

    lowStockAlerts.value[index]!.acknowledgedAt = new Date(now).toISOString();
    lowStockAlerts.value[index]!.acknowledgedBy = 'current_user';

    return true;
  }

  // ============================================
  // 📁 CATEGORY OPERATIONS
  // ============================================

  async function addCategory(data: Omit<IngredientCategory, 'id'>): Promise<IngredientCategory> {
    const category: IngredientCategory = {
      ...data,
      id: generateId('cat'),
      sortOrder: categories.value.length,
    };

    categories.value.push(category);
    await db.ingredientCategories.put({
      id: category.id,
      name: category.name,
      nameTh: category.nameTh,
      icon: category.icon,
      sortOrder: category.sortOrder,
      synced: false,
    });

    return category;
  }

  function getCategory(id: string): IngredientCategory | undefined {
    return categories.value.find(c => c.id === id);
  }

  // ============================================
  // 💰 COST CALCULATIONS
  // ============================================

  /**
   * Calculate cost for a quantity of ingredient
   */
  function calculateCost(ingredientId: string, quantity: number, unit?: IngredientUnit): number {
    const ingredient = getIngredient(ingredientId);
    if (!ingredient) return 0;

    // If unit specified and different from ingredient unit, convert
    if (unit && unit !== ingredient.unit) {
      quantity = convertQuantity(quantity, unit, ingredient.unit);
    }

    return quantity * ingredient.costPerUnit;
  }

  /**
   * Get total value of current inventory
   */
  function getInventoryValue(): number {
    return ingredients.value.reduce((total, ing) => {
      return total + (ing.currentStock * ing.costPerBaseUnit);
    }, 0);
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

  function getIngredientsByCategory(categoryId: string): Ingredient[] {
    if (categoryId === 'all') return activeIngredients.value;
    return activeIngredients.value.filter(i => i.categoryId === categoryId);
  }

  function getStockHistory(ingredientId: string, limit = 50): IngredientStockAdjustment[] {
    return stockAdjustments.value
      .filter(a => a.ingredientId === ingredientId)
      .slice(0, limit);
  }

  // ============================================
  // 📊 ANALYTICS
  // ============================================

  function getIngredientStats(): {
    total: number;
    active: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
    pendingAlerts: number;
  } {
    return {
      total: ingredients.value.length,
      active: activeIngredients.value.length,
      lowStock: lowStockIngredients.value.length,
      outOfStock: outOfStockIngredients.value.length,
      totalValue: totalInventoryValue.value,
      pendingAlerts: pendingAlerts.value.length,
    };
  }

  /**
   * Get usage report for a period
   */
  async function getUsageReport(startDate: Date, endDate: Date): Promise<Array<{
    ingredientId: string;
    ingredientName: string;
    usedQuantity: number;
    wastedQuantity: number;
    purchasedQuantity: number;
    totalCost: number;
  }>> {
    const startTs = startDate.getTime();
    const endTs = endDate.getTime();

    const adjustments = await db.ingredientStockAdjustments
      .where('createdAt')
      .between(startTs, endTs)
      .toArray();

    const usage: Record<string, {
      usedQuantity: number;
      wastedQuantity: number;
      purchasedQuantity: number;
      totalCost: number;
    }> = {};

    for (const adj of adjustments) {
      if (!usage[adj.ingredientId]) {
        usage[adj.ingredientId] = {
          usedQuantity: 0,
          wastedQuantity: 0,
          purchasedQuantity: 0,
          totalCost: 0,
        };
      }

      if (adj.type === 'usage') {
        usage[adj.ingredientId]!.usedQuantity += Math.abs(adj.adjustment);
      } else if (adj.type === 'waste') {
        usage[adj.ingredientId]!.wastedQuantity += Math.abs(adj.adjustment);
      } else if (adj.type === 'purchase') {
        usage[adj.ingredientId]!.purchasedQuantity += adj.adjustment;
        usage[adj.ingredientId]!.totalCost += adj.totalCost || 0;
      }
    }

    return Object.entries(usage).map(([ingredientId, data]) => {
      const ingredient = getIngredient(ingredientId);
      return {
        ingredientId,
        ingredientName: ingredient?.name || 'Unknown',
        ...data,
      };
    });
  }

  // ============================================
  // 📤 IMPORT/EXPORT
  // ============================================

  async function exportIngredients(): Promise<string> {
    return JSON.stringify({
      ingredients: ingredients.value,
      categories: categories.value,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  async function importIngredients(jsonData: string): Promise<{ imported: number; errors: number }> {
    let imported = 0;
    let errors = 0;

    try {
      const data = JSON.parse(jsonData);

      // Import categories first
      if (data.categories) {
        for (const cat of data.categories) {
          if (!categories.value.find(c => c.id === cat.id)) {
            await addCategory(cat);
          }
        }
      }

      // Import ingredients
      if (data.ingredients) {
        for (const ing of data.ingredients) {
          try {
            if (!ingredients.value.find(i => i.id === ing.id || i.code === ing.code)) {
              await addIngredient(ing);
              imported++;
            }
          } catch {
            errors++;
          }
        }
      }
    } catch (e) {
      console.error('Failed to import ingredients:', e);
      error.value = 'Failed to import ingredients';
    }

    return { imported, errors };
  }

  return {
    // State
    ingredients,
    categories,
    stockAdjustments,
    lowStockAlerts,
    isLoading,
    error,
    isInitialized,
    syncPending,

    // Filter state
    searchQuery,
    selectedCategory,

    // Computed
    filteredIngredients,
    activeIngredients,
    lowStockIngredients,
    outOfStockIngredients,
    totalInventoryValue,
    ingredientsByCategory,
    pendingAlerts,

    // Init
    init,

    // CRUD
    addIngredient,
    updateIngredient,
    deleteIngredient,
    getIngredient,
    getIngredientByCode,

    // Stock Operations
    adjustStock,
    addStock,
    useStock,
    recordWaste,
    setStock,
    useIngredientsForOrder,

    // Alerts
    checkLowStock,
    acknowledgeAlert,

    // Categories
    addCategory,
    getCategory,

    // Cost Calculations
    calculateCost,
    getInventoryValue,
    convertQuantity,
    getStockStatus,

    // Queries
    setSearchQuery,
    setSelectedCategory,
    getIngredientsByCategory,
    getStockHistory,

    // Analytics
    getIngredientStats,
    getUsageReport,

    // Import/Export
    exportIngredients,
    importIngredients,
  };
}
