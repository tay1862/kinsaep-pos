// ============================================
// 📦 PRODUCTS COMPOSABLE
// Product & Category Management with Dexie + Nostr
// ============================================

import type { Product, Category, Unit, Branch } from "~/types";
import {
  db,
  type ProductRecord,
  type CategoryRecord,
  type UnitRecord,
  type BranchRecord,
} from "~/db/db";
import { EntityId, generateUUIDv7 } from "~/utils/id";

// ============================================
// 📋 DEFAULT DATA (Initial Seed)
// ============================================

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "all",
    name: "All Items",
    description: "All products",
    icon: "📦",
    sortOrder: 0,
  },
  {
    id: "drinks",
    name: "Drinks",
    description: "Beverages",
    icon: "🍹",
    sortOrder: 1,
  },
  {
    id: "food",
    name: "Food",
    description: "Main dishes",
    icon: "🍜",
    sortOrder: 2,
  },
  {
    id: "desserts",
    name: "Desserts",
    description: "Sweet treats",
    icon: "🍰",
    sortOrder: 3,
  },
  {
    id: "snacks",
    name: "Snacks",
    description: "Light bites",
    icon: "🍿",
    sortOrder: 4,
  },
  {
    id: "favorites",
    name: "Favorites",
    description: "Most popular items",
    icon: "⭐",
    sortOrder: 5,
  },
];

const DEFAULT_UNITS: Unit[] = [
  { id: "piece", name: "Piece", symbol: "pc" },
  { id: "cup", name: "Cup", symbol: "cup" },
  { id: "bottle", name: "Bottle", symbol: "btl" },
  { id: "glass", name: "Glass", symbol: "gl" },
  { id: "bowl", name: "Bowl", symbol: "bwl" },
  { id: "plate", name: "Plate", symbol: "plt" },
  { id: "basket", name: "Basket", symbol: "bsk" },
  { id: "scoop", name: "Scoop", symbol: "scp" },
  { id: "kg", name: "Kilogram", symbol: "kg" },
  { id: "g", name: "Gram", symbol: "g" },
  { id: "l", name: "Liter", symbol: "L" },
  { id: "ml", name: "Milliliter", symbol: "ml" },
];

const DEFAULT_BRANCHES: Branch[] = [
  { id: "main", name: "Main Branch", code: "MAIN" },
];

// Singleton state
const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const units = ref<Unit[]>([]);
const branches = ref<Branch[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);
const syncPending = ref(0);

// UI State
const searchQuery = ref("");
const selectedCategory = ref<string>("all");
const favoriteIds = ref<Set<string>>(new Set());

/**
 * 📦 PRODUCTS STORE (Production-ready with Dexie + Nostr sync)
 * Primary composable for product, category, and unit management
 */
export function useProductsStore() {
  const nostrData = useNostrData();
  const offline = useOffline();

  // ============================================
  // 📊 COMPUTED
  // ============================================

  const filteredProducts = computed(() => {
    let result = [...products.value];

    // Staff Product Assignment Filter
    // If current user is staff, filter products based on assignment
    const auth = useAuth();
    const currentUser = auth.user.value;

    if (currentUser && currentUser.role === "staff") {
      const employeesStore = useEmployeesStore();

      // Find employee record for current staff user
      const employee = employeesStore.employees.value.find(
        (e) => e.userId === currentUser.id || e.npub === currentUser.npub
      );

      if (employee) {
        const mode = employee.assignmentMode || "all";

        // Filter based on assignment mode
        if (mode === "assigned" && employee.assignedProductIds?.length) {
          // Only assigned products
          result = result.filter((p) =>
            employee.assignedProductIds?.includes(p.id)
          );
        } else if (mode === "category" && employee.assignedCategoryIds?.length) {
          // Only products from assigned categories
          result = result.filter((p) =>
            employee.assignedCategoryIds?.includes(p.categoryId)
          );
        }
        // mode === "all" - no filtering needed
      }
    }

    // Category filter
    if (selectedCategory.value === "favorites") {
      result = result.filter((p) => favoriteIds.value.has(p.id));
    } else if (selectedCategory.value !== "all") {
      result = result.filter((p) => p.categoryId === selectedCategory.value);
    }

    // Search filter (includes barcode search)
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Only active products
    result = result.filter((p) => p.status === "active");

    return result;
  });

  const activeProducts = computed(() =>
    products.value.filter((p) => p.status === "active")
  );

  const lowStockProducts = computed(() =>
    products.value.filter(
      (p) =>
        p.stock <= p.minStock && p.status === "active" && p.trackStock !== false // Exclude products with stock tracking disabled
    )
  );

  const outOfStockProducts = computed(() =>
    products.value.filter(
      (p) => p.stock <= 0 && p.status === "active" && p.trackStock !== false // Exclude products with stock tracking disabled
    )
  );

  const productsByCategory = computed(() => {
    const grouped: Record<string, Product[]> = {};
    for (const product of activeProducts.value) {
      if (!grouped[product.categoryId]) {
        grouped[product.categoryId] = [];
      }
      grouped[product.categoryId]!.push(product);
    }
    return grouped;
  });

  // Public products for customer menu (visible to customers)
  const publicProducts = computed(() =>
    products.value.filter((p) => p.status === "active" && p.isPublic !== false)
  );

  // Public products grouped by category
  const publicProductsByCategory = computed(() => {
    const grouped: Record<string, Product[]> = {};
    for (const product of publicProducts.value) {
      if (!grouped[product.categoryId]) {
        grouped[product.categoryId] = [];
      }
      grouped[product.categoryId]!.push(product);
    }
    return grouped;
  });

  // ============================================
  // 💾 LOCAL DB OPERATIONS
  // ============================================

  async function loadProductsFromLocal(): Promise<Product[]> {
    try {
      // Debug: First check all products in DB
      const allRecords = await db.products.toArray();

      const records = await db.products
        .where("status")
        .equals("active")
        .toArray();

      return records.map((r) => JSON.parse(r.data) as Product);
    } catch (e) {
      console.error("Failed to load products from local DB:", e);
      return [];
    }
  }

  async function loadCategoriesFromLocal(): Promise<Category[]> {
    try {
      const records = await db.categories.orderBy("sortOrder").toArray();
      if (records.length === 0) {
        // Seed default categories
        await seedDefaultCategories();
        return DEFAULT_CATEGORIES;
      }
      return records.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        icon: r.icon,
        sortOrder: r.sortOrder,
      }));
    } catch (e) {
      console.error("Failed to load categories:", e);
      return DEFAULT_CATEGORIES;
    }
  }

  async function loadUnitsFromLocal(): Promise<Unit[]> {
    try {
      const records = await db.units.toArray();
      if (records.length === 0) {
        // Seed default units
        await seedDefaultUnits();
        return DEFAULT_UNITS;
      }
      return records.map((r) => ({
        id: r.id,
        name: r.name,
        symbol: r.symbol,
      }));
    } catch (e) {
      console.error("Failed to load units:", e);
      return DEFAULT_UNITS;
    }
  }

  async function seedDefaultCategories(): Promise<void> {
    for (const cat of DEFAULT_CATEGORIES) {
      await db.categories.put({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder || 0,
        synced: false,
      });
    }
  }

  async function seedDefaultUnits(): Promise<void> {
    for (const unit of DEFAULT_UNITS) {
      await db.units.put({
        id: unit.id,
        name: unit.name,
        symbol: unit.symbol,
        synced: false,
      });
    }
  }

  async function saveProductToLocal(product: Product): Promise<void> {
    if (!product.id) return; // Skip invalid products
    const record: ProductRecord = {
      id: product.id,
      data: JSON.stringify(product),
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      categoryId: product.categoryId,
      status: product.status,
      price: product.price,
      stock: product.stock,
      updatedAt: Date.now(),
      synced: false,
    };
    await db.products.put(record);
  }

  async function saveCategoryToLocal(category: Category): Promise<void> {
    if (!category.id) return; // Skip invalid categories
    const record: CategoryRecord = {
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder || 0,
      synced: false,
    };
    await db.categories.put(record);
  }

  async function saveUnitToLocal(unit: Unit): Promise<void> {
    if (!unit.id) return; // Skip invalid units
    const record: UnitRecord = {
      id: unit.id,
      name: unit.name,
      symbol: unit.symbol,
      synced: false,
    };
    await db.units.put(record);
  }

  async function loadBranchesFromLocal(): Promise<Branch[]> {
    try {
      const records = await db.branches.toArray();
      if (records.length === 0) {
        // Don't seed default branches automatically
        // Let shop setup wizard create the first branch to avoid duplicates
        return [];
      }
      return records.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        address: r.address,
        nostrPubkey: r.nostrPubkey,
        bolt12Offer: r.bolt12Offer,
      }));
    } catch (e) {
      console.error("Failed to load branches:", e);
      return [];
    }
  }

  async function seedDefaultBranches(): Promise<void> {
    for (const branch of DEFAULT_BRANCHES) {
      await db.branches.put({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        nostrPubkey: branch.nostrPubkey,
        bolt12Offer: branch.bolt12Offer,
        synced: false,
      });
    }
  }

  async function saveBranchToLocal(branch: Branch): Promise<void> {
    if (!branch.id) return; // Skip invalid branches
    const record: BranchRecord = {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      nostrPubkey: branch.nostrPubkey,
      bolt12Offer: branch.bolt12Offer,
      synced: false,
    };
    await db.branches.put(record);
  }

  // ============================================
  // 📡 NOSTR SYNC
  // ============================================

  async function syncProductToNostr(product: Product): Promise<boolean> {
    try {
      const event = await nostrData.saveProduct(product);
      if (event) {
        await db.products.update(product.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to sync product to Nostr:", e);
      return false;
    }
  }

  async function syncCategoryToNostr(category: Category): Promise<boolean> {
    try {
      const event = await nostrData.saveCategory(category);
      if (event) {
        await db.categories.update(category.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to sync category to Nostr:", e);
      return false;
    }
  }

  async function syncBranchToNostr(branch: Branch): Promise<boolean> {
    try {
      const event = await nostrData.saveBranch(branch);
      if (event) {
        await db.branches.update(branch.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to sync branch to Nostr:", e);
      return false;
    }
  }

  async function loadFromNostr(): Promise<void> {
    try {
      const [nostrProducts, nostrCategories, nostrUnits, nostrBranches] =
        await Promise.all([
          nostrData.getAllProducts(),
          nostrData.getAllCategories(),
          nostrData.getAllUnits(),
          nostrData.getAllBranches(),
        ]);

      // Merge with local - preserve local stock if we have local adjustments
      for (const product of nostrProducts) {
        const existingRecord = await db.products.get(product.id);
        if (existingRecord) {
          // Check if local has unsynced stock changes
          const localProduct = JSON.parse(existingRecord.data) as Product;

          // If local stock differs from Nostr and local is not synced,
          // preserve local stock (it's more recent)
          if (
            !existingRecord.synced ||
            existingRecord.stock !== product.stock
          ) {
            // Keep local stock value - it may have been adjusted locally
            product.stock = existingRecord.stock ?? localProduct.stock;
          }
        }
        await saveProductToLocal(product);
      }
      for (const category of nostrCategories) {
        await saveCategoryToLocal(category);
      }
      for (const unit of nostrUnits) {
        await saveUnitToLocal(unit);
      }
      for (const branch of nostrBranches) {
        await saveBranchToLocal(branch);
      }

      // Reload from local
      products.value = await loadProductsFromLocal();
      categories.value = await loadCategoriesFromLocal();
      units.value = await loadUnitsFromLocal();
      branches.value = await loadBranchesFromLocal();
    } catch (e) {
      console.error("Failed to load from Nostr:", e);
    }
  }

  async function syncAllToNostr(): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    // Sync unsynced products
    const unsyncedProducts = await db.products
      .filter((p) => !p.synced)
      .toArray();
    for (const record of unsyncedProducts) {
      const product = JSON.parse(record.data) as Product;
      if (await syncProductToNostr(product)) {
        synced++;
      } else {
        failed++;
      }
    }

    // Sync unsynced categories
    const unsyncedCategories = await db.categories
      .filter((c) => !c.synced)
      .toArray();
    for (const record of unsyncedCategories) {
      const category: Category = {
        id: record.id,
        name: record.name,
        description: record.description,
        icon: record.icon,
        sortOrder: record.sortOrder,
      };
      if (await syncCategoryToNostr(category)) {
        synced++;
      } else {
        failed++;
      }
    }

    syncPending.value = failed;
    return { synced, failed };
  }

  // ============================================
  // 🔄 REFRESH
  // ============================================

  /**
   * Refresh products from local database
   * Called when stock is updated from inventory page
   */
  async function refreshProducts(): Promise<void> {
    products.value = await loadProductsFromLocal();
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  async function init(): Promise<void> {
    if (isInitialized.value) {
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // Load from local DB first (fast)
      await refreshProducts();
      categories.value = await loadCategoriesFromLocal();
      units.value = await loadUnitsFromLocal();
      branches.value = await loadBranchesFromLocal();

      // Load favorites
      loadFavorites();

      // Sync with Nostr if online
      if (offline.isOnline.value) {
        await loadFromNostr();
      }

      // Count pending syncs
      const unsyncedCount = await db.products.filter((p) => !p.synced).count();
      syncPending.value = unsyncedCount;

      isInitialized.value = true;
    } catch (e) {
      error.value = `Failed to initialize products: ${e}`;
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 🛍️ PRODUCT CRUD
  // ============================================

  async function addProduct(
    productData: Omit<Product, "id" | "createdAt" | "updatedAt">
  ): Promise<Product> {
    const { getCurrentUserIdentifier } = useUserIdentifier();
    const { id, code } = EntityId.product();
    const product: Product = {
      ...productData,
      id,
      sku: productData.sku || code, // Use code as SKU if not provided
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: getCurrentUserIdentifier(), // Use npub for decentralized identity
    };

    // Add to state
    products.value.push(product);

    // Save to local DB
    await saveProductToLocal(product);

    // Log activity
    await logProductActivity({
      productId: product.id,
      action: "create",
      notes: `Product "${product.name}" created`,
    });

    // Sync to Nostr
    if (offline.isOnline.value) {
      const synced = await syncProductToNostr(product);
      if (!synced) syncPending.value++;
    } else {
      syncPending.value++;
    }

    return product;
  }

  async function updateProduct(
    id: string,
    updates: Partial<Product>
  ): Promise<Product | null> {
    const index = products.value.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = products.value[index]!;
    const { getCurrentUserIdentifier } = useUserIdentifier();

    // Track changes for logging
    const changes: { field: string; oldValue: unknown; newValue: unknown }[] =
      [];
    for (const key of Object.keys(updates) as (keyof Product)[]) {
      if (existing[key] !== updates[key]) {
        changes.push({
          field: key,
          oldValue: existing[key],
          newValue: updates[key],
        });
      }
    }

    const updatedProduct: Product = {
      ...existing,
      ...updates,
      id: existing.id, // Ensure ID doesn't change
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      updatedBy: getCurrentUserIdentifier(), // Use npub for decentralized identity
    };

    products.value[index] = updatedProduct;

    // Save to local DB
    await saveProductToLocal(updatedProduct);

    // Log activity
    if (changes.length > 0) {
      // Check for specific change types
      const priceChange = changes.find((c) => c.field === "price");
      const statusChange = changes.find((c) => c.field === "status");
      const stockChange = changes.find((c) => c.field === "stock");

      if (priceChange) {
        await logProductActivity({
          productId: id,
          action: "price_change",
          priceBefore: priceChange.oldValue as number,
          priceAfter: priceChange.newValue as number,
          changes,
        });
      } else if (statusChange) {
        await logProductActivity({
          productId: id,
          action: "status_change",
          changes,
          notes: `Status changed from "${statusChange.oldValue}" to "${statusChange.newValue}"`,
        });
      } else if (stockChange) {
        await logProductActivity({
          productId: id,
          action: "stock_adjust",
          stockBefore: stockChange.oldValue as number,
          stockAfter: stockChange.newValue as number,
          changes,
        });
      } else {
        await logProductActivity({
          productId: id,
          action: "update",
          changes,
        });
      }
    }

    // Sync to Nostr
    if (offline.isOnline.value) {
      await syncProductToNostr(updatedProduct);
    }

    return updatedProduct;
  }

  async function deleteProduct(id: string): Promise<boolean> {
    const index = products.value.findIndex((p) => p.id === id);
    if (index === -1) return false;

    // Soft delete - mark as inactive
    const product = products.value[index]!;
    const previousStatus = product.status;
    product.status = "inactive";
    product.updatedAt = new Date().toISOString();

    // Update local DB
    await saveProductToLocal(product);

    // Log activity
    await logProductActivity({
      productId: id,
      action: "delete",
      notes: `Product "${product.name}" deleted (soft delete)`,
      changes: [
        { field: "status", oldValue: previousStatus, newValue: "inactive" },
      ],
    });

    // Remove from active list
    products.value.splice(index, 1);

    // Sync to Nostr
    if (offline.isOnline.value) {
      await nostrData.deleteProduct(id);
    }

    return true;
  }

  /**
   * Delete all products (useful for clearing old/template products)
   * @param syncToNostr - Whether to sync deletions to Nostr (default: true)
   */
  async function deleteAllProducts(syncToNostr = true): Promise<number> {
    const deletedCount = products.value.length;
    const productIds = products.value.map(p => p.id);

    console.log(`[Products] Deleting ${deletedCount} products...`);

    // Clear local DB
    await db.products.clear();
    
    // Clear in-memory array
    products.value = [];

    console.log(`[Products] ✅ Deleted ${deletedCount} products from local DB`);

    // Sync to Nostr
    if (syncToNostr && offline.isOnline.value) {
      try {
        console.log('[Products] Syncing deletions to Nostr...');
        for (const id of productIds) {
          await nostrData.deleteProduct(id);
        }
        console.log('[Products] ✅ Deletions synced to Nostr');
      } catch (e) {
        console.warn('[Products] Failed to sync deletions to Nostr:', e);
      }
    }

    return deletedCount;
  }

  /**
   * Delete multiple products by IDs
   * @param ids - Array of product IDs to delete
   * @param syncToNostr - Whether to sync deletions to Nostr (default: true)
   */
  async function bulkDeleteProducts(ids: string[], syncToNostr = true): Promise<number> {
    let deletedCount = 0;

    console.log(`[Products] Bulk deleting ${ids.length} products...`);

    for (const id of ids) {
      const success = await deleteProduct(id);
      if (success) deletedCount++;
    }

    console.log(`[Products] ✅ Deleted ${deletedCount} products`);
    return deletedCount;
  }

  function getProduct(id: string): Product | undefined {
    return products.value.find((p) => p.id === id);
  }

  function getProductBySku(sku: string): Product | undefined {
    return products.value.find((p) => p.sku === sku);
  }

  function getProductByBarcode(barcode: string): Product | undefined {
    return products.value.find((p) => p.barcode === barcode);
  }

  /**
   * Find product by SKU or Barcode (for barcode scanner)
   * Returns product if found by either field
   */
  function findProductByCode(code: string): Product | undefined {
    const trimmedCode = code.trim();
    // First check barcode (exact match)
    let product = products.value.find((p) => p.barcode === trimmedCode);
    // Then check SKU
    if (!product) {
      product = products.value.find((p) => p.sku === trimmedCode);
    }
    return product;
  }

  function getProductsByCategory(categoryId: string): Product[] {
    if (categoryId === "all") return activeProducts.value;
    return activeProducts.value.filter((p) => p.categoryId === categoryId);
  }

  /**
   * Get a product by ID with fallback to Nostr relay
   * Tries: 1) Memory cache → 2) Local DB → 3) Nostr relay
   * Use this for dynamic pages that need to load on refresh
   */
  async function getProductById(id: string): Promise<Product | null> {
    // 1. Try memory cache first (fastest)
    const cached = products.value.find((p) => p.id === id);
    if (cached) return cached;

    // 2. Try local Dexie DB
    try {
      const record = await db.products.get(id);
      if (record) {
        const product = JSON.parse(record.data) as Product;
        // Add to memory cache for future use
        products.value.push(product);
        return product;
      }
    } catch (e) {
      console.error("Failed to load product from local DB:", e);
    }

    // 3. Fallback to Nostr relay (slowest, but works for shared links)
    if (offline.isOnline.value) {
      try {
        const nostrProduct = await nostrData.getProduct(id);
        if (nostrProduct) {
          // Save to local DB for future use
          await saveProductToLocal(nostrProduct);
          // Add to memory cache
          products.value.push(nostrProduct);
          return nostrProduct;
        }
      } catch (e) {
        console.error("Failed to load product from Nostr:", e);
      }
    }

    return null;
  }

  // ============================================
  // 📁 CATEGORY CRUD
  // ============================================

  async function addCategory(
    categoryData: Omit<Category, "id">
  ): Promise<Category> {
    const { id } = EntityId.category();
    const category: Category = {
      ...categoryData,
      id,
      sortOrder: categories.value.length,
    };

    categories.value.push(category);
    await saveCategoryToLocal(category);

    if (offline.isOnline.value) {
      await syncCategoryToNostr(category);
    }

    return category;
  }

  async function updateCategory(
    id: string,
    updates: Partial<Category>
  ): Promise<Category | null> {
    const index = categories.value.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = categories.value[index]!;
    const updatedCategory: Category = {
      ...existing,
      ...updates,
      id: existing.id,
    };

    categories.value[index] = updatedCategory;
    await saveCategoryToLocal(updatedCategory);

    if (offline.isOnline.value) {
      await syncCategoryToNostr(updatedCategory);
    }

    return updatedCategory;
  }

  async function deleteCategory(id: string): Promise<boolean> {
    // Don't delete built-in categories
    if (["all", "favorites"].includes(id)) return false;

    const index = categories.value.findIndex((c) => c.id === id);
    if (index === -1) return false;

    // Check if category has products
    const hasProducts = products.value.some((p) => p.categoryId === id);
    if (hasProducts) {
      error.value = "Cannot delete category with products";
      return false;
    }

    categories.value.splice(index, 1);
    await db.categories.delete(id);

    return true;
  }

  function getCategory(id: string): Category | undefined {
    return categories.value.find((c) => c.id === id);
  }

  // ============================================
  // 📐 UNIT CRUD
  // ============================================

  async function addUnit(unitData: Omit<Unit, "id">): Promise<Unit> {
    const unit: Unit = {
      ...unitData,
      id: generateUUIDv7(),
    };

    units.value.push(unit);
    await saveUnitToLocal(unit);

    return unit;
  }

  async function updateUnit(
    id: string,
    updates: Partial<Unit>
  ): Promise<Unit | null> {
    const index = units.value.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const existing = units.value[index]!;
    const updatedUnit: Unit = {
      ...existing,
      ...updates,
      id: existing.id,
    };

    units.value[index] = updatedUnit;
    await saveUnitToLocal(updatedUnit);

    return updatedUnit;
  }

  function getUnit(id: string): Unit | undefined {
    return units.value.find((u) => u.id === id);
  }

  // ============================================
  // 🏪 BRANCH CRUD
  // ============================================

  async function addBranch(branchData: Omit<Branch, "id">): Promise<Branch> {
    const { id } = EntityId.branch();
    const branch: Branch = {
      ...branchData,
      id,
    };

    branches.value.push(branch);
    await saveBranchToLocal(branch);

    // Sync to Nostr
    if (offline.isOnline.value) {
      await syncBranchToNostr(branch);
    }

    return branch;
  }

  async function updateBranch(
    id: string,
    updates: Partial<Branch>
  ): Promise<Branch | null> {
    const index = branches.value.findIndex((b) => b.id === id);
    if (index === -1) return null;

    const existing = branches.value[index]!;
    const updatedBranch: Branch = {
      ...existing,
      ...updates,
      id: existing.id,
    };

    branches.value[index] = updatedBranch;
    await saveBranchToLocal(updatedBranch);

    // Sync to Nostr
    if (offline.isOnline.value) {
      await syncBranchToNostr(updatedBranch);
    }

    return updatedBranch;
  }

  async function deleteBranch(id: string): Promise<boolean> {
    // Prevent deleting the main branch
    if (id === "main") {
      error.value = "Cannot delete the main branch";
      return false;
    }

    const index = branches.value.findIndex((b) => b.id === id);
    if (index === -1) return false;

    // Check if any products use this branch
    const productsInBranch = products.value.filter((p) => p.branchId === id);
    if (productsInBranch.length > 0) {
      error.value = `Cannot delete branch: ${productsInBranch.length} products are assigned to it`;
      return false;
    }

    branches.value.splice(index, 1);
    await db.branches.delete(id);

    return true;
  }

  function getBranch(id: string): Branch | undefined {
    return branches.value.find((b) => b.id === id);
  }

  // ============================================
  // 📦 STOCK MANAGEMENT
  // ============================================

  async function updateStock(
    productId: string,
    adjustment: number,
    reason:
      | "sale"
      | "purchase"
      | "adjustment"
      | "count"
      | "waste"
      | "return" = "adjustment",
    notes?: string
  ): Promise<boolean> {
    const product = products.value.find((p) => p.id === productId);
    if (!product) return false;

    const previousStock = product.stock;
    const newStock = previousStock + adjustment;

    // Update product
    await updateProduct(productId, { stock: newStock });

    // Record stock adjustment
    const adjustmentRecord = {
      id: generateUUIDv7(),
      productId,
      previousStock,
      newStock,
      adjustment,
      reason,
      notes,
      staffId: "current_user", // TODO: Get from auth
      createdAt: new Date().toISOString(),
    };

    await db.stockAdjustments.put({
      ...adjustmentRecord,
      createdAt: Date.now(),
      synced: false,
    });

    // Sync to Nostr
    if (offline.isOnline.value) {
      await nostrData.recordStockAdjustment(adjustmentRecord);
    }

    return true;
  }

  async function decreaseStock(
    productId: string,
    quantity: number
  ): Promise<boolean> {
    return updateStock(productId, -quantity, "sale");
  }

  async function increaseStock(
    productId: string,
    quantity: number,
    reason: "purchase" | "return" = "purchase"
  ): Promise<boolean> {
    return updateStock(productId, quantity, reason);
  }

  async function setStock(
    productId: string,
    newStock: number,
    notes?: string
  ): Promise<boolean> {
    const product = products.value.find((p) => p.id === productId);
    if (!product) return false;

    const adjustment = newStock - product.stock;
    return updateStock(productId, adjustment, "count", notes);
  }

  async function getStockHistory(
    productId: string,
    limit = 50
  ): Promise<
    Array<{
      id: string;
      adjustment: number;
      reason: string;
      notes?: string;
      createdAt: string;
    }>
  > {
    const records = await db.stockAdjustments
      .where("productId")
      .equals(productId)
      .reverse()
      .limit(limit)
      .toArray();

    return records.map((r) => ({
      id: r.id,
      adjustment: r.adjustment,
      reason: r.reason,
      notes: r.notes,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  }

  // ============================================
  // 📝 PRODUCT ACTIVITY LOGGING
  // ============================================

  interface ActivityLogOptions {
    productId: string;
    action:
      | "create"
      | "update"
      | "delete"
      | "price_change"
      | "stock_adjust"
      | "status_change"
      | "restore";
    changes?: { field: string; oldValue: unknown; newValue: unknown }[];
    stockBefore?: number;
    stockAfter?: number;
    stockReason?: string;
    priceBefore?: number;
    priceAfter?: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
  }

  /**
   * Log a product activity (audit trail)
   */
  async function logProductActivity(
    options: ActivityLogOptions
  ): Promise<void> {
    const currentUser = getCurrentUser();

    const log = {
      id: generateUUIDv7(),
      productId: options.productId,
      action: options.action,
      userId: currentUser?.id || "system",
      userName: currentUser?.name || "System",
      userRole: currentUser?.role || "system",
      timestamp: Date.now(),
      changesJson: options.changes
        ? JSON.stringify(options.changes)
        : undefined,
      stockBefore: options.stockBefore,
      stockAfter: options.stockAfter,
      stockReason: options.stockReason,
      priceBefore: options.priceBefore,
      priceAfter: options.priceAfter,
      referenceType: options.referenceType,
      referenceId: options.referenceId,
      notes: options.notes,
      synced: false,
    };

    await db.productActivityLogs.put(log);

    // Sync to Nostr if online
    if (offline.isOnline.value) {
      try {
        await nostrData.saveProductActivityLog?.(log);
      } catch (e) {
        console.error("Failed to sync activity log to Nostr:", e);
      }
    }

    // Also log to centralized team audit log
    try {
      const { logActivity } = useAuditLog();
      const product = products.value.find((p) => p.id === options.productId);
      const productName = product?.name || options.productId.slice(-8);

      // Map product action to audit action
      const auditActionMap: Record<
        string,
        | "product_create"
        | "product_update"
        | "product_delete"
        | "inventory_adjust"
      > = {
        create: "product_create",
        update: "product_update",
        delete: "product_delete",
        price_change: "product_update",
        stock_adjust: "inventory_adjust",
        status_change: "product_update",
        restore: "product_update",
      };

      const auditAction = auditActionMap[options.action];
      if (auditAction) {
        await logActivity(
          auditAction,
          options.notes || `${options.action} product "${productName}"`,
          {
            resourceType: "product",
            resourceId: options.productId,
            metadata: {
              action: options.action,
              stockBefore: options.stockBefore,
              stockAfter: options.stockAfter,
              priceBefore: options.priceBefore,
              priceAfter: options.priceAfter,
            },
          }
        );
      }
    } catch {
      // Don't block product operations if audit logging fails
    }
  }

  /**
   * Get activity logs for a product
   */
  async function getProductActivityLogs(
    productId: string,
    limit = 100
  ): Promise<
    Array<{
      id: string;
      action: string;
      userName?: string;
      userRole?: string;
      timestamp: string;
      changes?: { field: string; oldValue: unknown; newValue: unknown }[];
      stockBefore?: number;
      stockAfter?: number;
      stockReason?: string;
      priceBefore?: number;
      priceAfter?: number;
      notes?: string;
    }>
  > {
    const records = await db.productActivityLogs
      .where("productId")
      .equals(productId)
      .reverse()
      .limit(limit)
      .toArray();

    return records.map((r) => ({
      id: r.id,
      action: r.action,
      userName: r.userName,
      userRole: r.userRole,
      timestamp: new Date(r.timestamp).toISOString(),
      changes: r.changesJson ? JSON.parse(r.changesJson) : undefined,
      stockBefore: r.stockBefore,
      stockAfter: r.stockAfter,
      stockReason: r.stockReason,
      priceBefore: r.priceBefore,
      priceAfter: r.priceAfter,
      notes: r.notes,
    }));
  }

  /**
   * Get current user from auth (placeholder - integrate with actual auth)
   */
  function getCurrentUser(): { id: string; name: string; role: string } | null {
    // TODO: Integrate with use-users or use-staff-auth
    try {
      const stored = localStorage.getItem("bitspace_current_user");
      if (stored) {
        const user = JSON.parse(stored);
        return {
          id: user.id || user.user?.id || "unknown",
          name: user.name || user.user?.name || "Unknown User",
          role: user.role || user.user?.role || "staff",
        };
      }
    } catch {
      // Ignore
    }
    return null;
  }

  // ============================================
  // ⭐ FAVORITES
  // ============================================

  function toggleFavorite(id: string): void {
    if (favoriteIds.value.has(id)) {
      favoriteIds.value.delete(id);
    } else {
      favoriteIds.value.add(id);
    }
    saveFavorites();
  }

  function isFavorite(id: string): boolean {
    return favoriteIds.value.has(id);
  }

  function saveFavorites(): void {
    localStorage.setItem(
      "pos_favorites",
      JSON.stringify([...favoriteIds.value])
    );
  }

  function loadFavorites(): void {
    const stored = localStorage.getItem("pos_favorites");
    if (stored) {
      try {
        favoriteIds.value = new Set(JSON.parse(stored));
      } catch {
        favoriteIds.value = new Set();
      }
    }
  }

  // ============================================
  // 🔍 SEARCH & FILTER
  // ============================================

  function searchProducts(query: string): Product[] {
    const q = query.toLowerCase();
    return activeProducts.value.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }

  function setSearchQuery(query: string): void {
    searchQuery.value = query;
  }

  function setSelectedCategory(categoryId: string): void {
    selectedCategory.value = categoryId;
  }

  // ============================================
  // 📊 IMPORT/EXPORT
  // ============================================

  async function exportProducts(): Promise<string> {
    const data = {
      products: products.value,
      categories: categories.value,
      units: units.value,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  async function importProducts(jsonData: string): Promise<{
    products: number;
    categories: number;
    units: number;
  }> {
    const data = JSON.parse(jsonData);
    let productCount = 0;
    let categoryCount = 0;
    let unitCount = 0;

    // Import categories first
    if (data.categories) {
      for (const cat of data.categories) {
        if (!categories.value.find((c) => c.id === cat.id)) {
          await addCategory(cat);
          categoryCount++;
        }
      }
    }

    // Import units
    if (data.units) {
      for (const unit of data.units) {
        if (!units.value.find((u) => u.id === unit.id)) {
          await addUnit(unit);
          unitCount++;
        }
      }
    }

    // Import products
    if (data.products) {
      for (const prod of data.products) {
        if (!products.value.find((p) => p.id === prod.id)) {
          await addProduct(prod);
          productCount++;
        }
      }
    }

    return {
      products: productCount,
      categories: categoryCount,
      units: unitCount,
    };
  }

  return {
    // State
    products,
    categories,
    units,
    branches,
    isLoading,
    error,
    isInitialized,
    syncPending,

    // UI State
    searchQuery,
    selectedCategory,
    favoriteIds,

    // Computed
    filteredProducts,
    activeProducts,
    lowStockProducts,
    outOfStockProducts,
    productsByCategory,
    publicProducts,
    publicProductsByCategory,

    // Init
    init,
    refreshProducts,

    // Product CRUD
    addProduct,
    updateProduct,
    deleteProduct,
    bulkDeleteProducts,
    deleteAllProducts,
    getProduct,
    getProductById,
    getProductBySku,
    getProductByBarcode,
    findProductByCode,
    getProductsByCategory,

    // Category CRUD
    addCategory,
    updateCategory,
    deleteCategory,
    getCategory,

    // Unit CRUD
    addUnit,
    updateUnit,
    getUnit,

    // Branch CRUD
    addBranch,
    updateBranch,
    deleteBranch,
    getBranch,

    // Stock
    updateStock,
    decreaseStock,
    increaseStock,
    setStock,
    getStockHistory,

    // Activity Logs
    logProductActivity,
    getProductActivityLogs,

    // Favorites
    toggleFavorite,
    isFavorite,

    // Search
    searchProducts,
    setSearchQuery,
    setSelectedCategory,

    // Sync
    syncAllToNostr,
    loadFromNostr,

    // Import/Export
    exportProducts,
    importProducts,
  };
}

/**
 * Alias for backward compatibility
 * @deprecated Use useProductsStore() instead
 */
export const useProducts = useProductsStore;
