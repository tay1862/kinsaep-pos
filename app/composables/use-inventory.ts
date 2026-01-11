// ============================================
// 📦 INVENTORY COMPOSABLE
// Multi-Branch Stock Management with Dexie + Nostr Sync
// ============================================

import type { Product, Branch } from "~/types";
import {
  db,
  type StockAdjustmentRecord,
  type SupplierRecord,
  type BranchRecord,
  type PurchaseOrderRecord,
} from "~/db/db";

// ============================================
// 📋 TYPES
// ============================================

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  branchId: string;
  branchName: string;
  unitId: string;
  unitSymbol: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  reservedStock: number;
  availableStock: number;
  costPrice: number;
  lastRestocked: string;
  lastUpdated: string;
  status: "in-stock" | "low-stock" | "out-of-stock" | "overstocked";
  value: number;
  // Expiry tracking fields
  hasExpiry?: boolean;
  defaultShelfLifeDays?: number;
  trackLots?: boolean;
  requiresExpiryDate?: boolean;
}

export interface InventoryReservation {
  id: string;
  productId: string;
  quantity: number;
  customerId?: string;
  orderId: string;
  expiresAt: Date;
  createdAt: Date;
  status: 'active' | 'expired' | 'released' | 'converted';
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  branchId: string;
  branchName: string;
  type: "in" | "out" | "adjustment" | "transfer";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference?: string;
  branchFrom?: string;
  branchTo?: string;
  createdBy: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  taxId?: string;
  bankAccount?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  notes?: string;
  productIds: string[];
  lastOrderDate?: string;
  status: "active" | "inactive";
  synced: boolean;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  status: PurchaseOrderRecord["status"];
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    receivedQty: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  expectedDate?: string;
  receivedDate?: string;
  createdBy: string;
  createdAt: string;
}

// Singleton state
const inventoryItems = ref<InventoryItem[]>([]);
const stockMovements = ref<StockMovement[]>([]);
const suppliers = ref<Supplier[]>([]);
const branches = ref<Branch[]>([]);
const purchaseOrders = ref<PurchaseOrder[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);
const syncPending = ref(0);
const currentBranchId = ref<string>("all");

// Import centralized NOSTR_KINDS
import { NOSTR_KINDS } from "~/types/nostr-kinds";

export function useInventory() {
  const nostrData = useNostrData();
  const offline = useOffline();
  const productsStore = useProductsStore();
  const notifications = useNotifications();

  // ============================================
  // 📊 COMPUTED
  // ============================================

  const totalInventoryValue = computed(() =>
    inventoryItems.value.reduce((sum, item) => sum + item.value, 0)
  );

  const lowStockCount = computed(
    () =>
      inventoryItems.value.filter(
        (item) => item.status === "low-stock" || item.status === "out-of-stock"
      ).length
  );

  const outOfStockCount = computed(
    () =>
      inventoryItems.value.filter((item) => item.status === "out-of-stock")
        .length
  );

  const totalProducts = computed(() => {
    const uniqueProducts = new Set(
      inventoryItems.value.map((i) => i.productId)
    );
    return uniqueProducts.size;
  });

  const activeSuppliers = computed(() =>
    suppliers.value.filter((s) => s.status === "active")
  );

  const activeBranches = computed(() =>
    branches.value.filter((b) => b.status !== "inactive")
  );

  const filteredInventory = computed(() => {
    if (currentBranchId.value === "all") return inventoryItems.value;
    return inventoryItems.value.filter(
      (item) => item.branchId === currentBranchId.value
    );
  });

  const pendingOrders = computed(() =>
    purchaseOrders.value.filter((o) =>
      ["pending", "approved", "ordered", "partial"].includes(o.status)
    )
  );

  // ============================================
  // 🔧 HELPER FUNCTIONS
  // ============================================

  function calculateStockStatus(
    currentStock: number,
    minStock: number,
    maxStock: number
  ): InventoryItem["status"] {
    if (currentStock <= 0) return "out-of-stock";
    if (currentStock <= minStock) return "low-stock";
    if (currentStock > maxStock) return "overstocked";
    return "in-stock";
  }

  function generateId(prefix: string = "INV"): string {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const dd = now.getDate().toString().padStart(2, "0");
    const seq = Math.floor(Math.random() * 10); // 0-9
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // No I, O (avoid confusion)
    const rnd =
      chars.charAt(Math.floor(Math.random() * chars.length)) +
      chars.charAt(Math.floor(Math.random() * chars.length));
    return `${prefix}-${yy}${mm}${dd}-${seq}${rnd}`.toLocaleUpperCase();
  }

  // ============================================
  // 🏢 BRANCH OPERATIONS
  // ============================================

  async function loadBranches(): Promise<void> {
    try {
      const branchRecords = await db.branches.toArray();

      if (branchRecords.length === 0) {
        // Create default branch if none exist
        const defaultBranch: BranchRecord = {
          id: "main",
          name: "Main Branch",
          code: "MAIN",
          synced: false,
        };
        await db.branches.put(defaultBranch);
        branches.value = [
          {
            id: defaultBranch.id,
            name: defaultBranch.name,
            code: defaultBranch.code,
          },
        ];
      } else {
        branches.value = branchRecords.map((b) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          address: b.address,
          nostrPubkey: b.nostrPubkey,
          bolt12Offer: b.bolt12Offer,
          status: "active" as const,
        }));
      }
    } catch (e) {
      console.error("Failed to load branches:", e);
    }
  }

  async function addBranch(branch: Omit<Branch, "id">): Promise<Branch | null> {
    try {
      const newBranch: BranchRecord = {
        id: generateId("branch"),
        name: branch.name,
        code: branch.code || branch.name.toUpperCase().substring(0, 4),
        address: branch.address,
        nostrPubkey: branch.nostrPubkey,
        bolt12Offer: branch.bolt12Offer,
        synced: false,
      };

      await db.branches.put(newBranch);

      // Sync to Nostr
      if (offline.isOnline.value) {
        await syncBranchToNostr(newBranch);
      }

      await loadBranches();
      return branches.value.find((b) => b.id === newBranch.id) || null;
    } catch (e) {
      error.value = `Failed to add branch: ${e}`;
      return null;
    }
  }

  async function syncBranchToNostr(branch: BranchRecord): Promise<boolean> {
    try {
      const event = await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.BRANCH,
        JSON.stringify({
          id: branch.id,
          name: branch.name,
          code: branch.code,
          address: branch.address,
          nostrPubkey: branch.nostrPubkey,
          bolt12Offer: branch.bolt12Offer,
        }),
        branch.id // dTag
      );

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

  // ============================================
  // 📦 MULTI-BRANCH STOCK OPERATIONS
  // ============================================

  async function loadFromLocal(): Promise<void> {
    try {
      // Load products from products table
      const productRecords = await db.products.toArray();
      const categoryRecords = await db.categories.toArray();
      const unitRecords = await db.units.toArray();
      const branchStockRecords = await db.branchStock.toArray();

      // Create lookup maps
      const categoryMap = new Map(categoryRecords.map((c) => [c.id, c.name]));
      const unitMap = new Map(unitRecords.map((u) => [u.id, u.symbol]));
      const branchMap = new Map(branches.value.map((b) => [b.id, b.name]));

      // Build inventory items (one per product per branch)
      const items: InventoryItem[] = [];

      for (const record of productRecords) {
        const product: Product = JSON.parse(record.data);

        // If no branch stock exists, create from product defaults
        const productBranchStocks = branchStockRecords.filter(
          (bs) => bs.productId === product.id
        );

        if (productBranchStocks.length === 0) {
          // Create default branch stock for main branch
          const maxStock = product.minStock ? product.minStock * 5 : 100;
          items.push({
            id: `inv_${product.id}_main`,
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            categoryId: product.categoryId,
            categoryName:
              categoryMap.get(product.categoryId) || "Uncategorized",
            branchId: product.branchId || "main",
            branchName:
              branchMap.get(product.branchId || "main") || "Main Branch",
            unitId: product.unitId,
            unitSymbol: unitMap.get(product.unitId) || "pc",
            currentStock: product.stock,
            minStock: product.minStock,
            maxStock,
            reorderPoint: Math.ceil(product.minStock * 1.5),
            reservedStock: 0,
            availableStock: product.stock,
            costPrice: product.costPrice || product.price * 0.6,
            lastRestocked: product.updatedAt,
            lastUpdated: product.updatedAt,
            status: calculateStockStatus(
              product.stock,
              product.minStock,
              maxStock
            ),
            value: product.stock * (product.costPrice || product.price * 0.6),
            // Expiry tracking from product settings
            hasExpiry: product.hasExpiry,
            defaultShelfLifeDays: product.defaultShelfLifeDays,
            trackLots: product.trackLots,
            requiresExpiryDate: product.requiresExpiryDate,
          });
        } else {
          // Create inventory item for each branch stock
          for (const bs of productBranchStocks) {
            const availableStock = bs.currentStock - bs.reservedStock;
            items.push({
              id: bs.id,
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              categoryId: product.categoryId,
              categoryName:
                categoryMap.get(product.categoryId) || "Uncategorized",
              branchId: bs.branchId,
              branchName: branchMap.get(bs.branchId) || "Unknown Branch",
              unitId: product.unitId,
              unitSymbol: unitMap.get(product.unitId) || "pc",
              currentStock: bs.currentStock,
              minStock: bs.minStock,
              maxStock: bs.maxStock,
              reorderPoint: bs.reorderPoint,
              reservedStock: bs.reservedStock,
              availableStock,
              costPrice: bs.costPrice,
              lastRestocked: bs.lastRestocked
                ? new Date(bs.lastRestocked).toISOString()
                : "",
              lastUpdated: new Date(bs.updatedAt).toISOString(),
              status: calculateStockStatus(
                bs.currentStock,
                bs.minStock,
                bs.maxStock
              ),
              value: bs.currentStock * bs.costPrice,
              // Expiry tracking from product settings
              hasExpiry: product.hasExpiry,
              defaultShelfLifeDays: product.defaultShelfLifeDays,
              trackLots: product.trackLots,
              requiresExpiryDate: product.requiresExpiryDate,
            });
          }
        }
      }

      inventoryItems.value = items;

      // Load stock movements
      const adjustments = await db.stockAdjustments
        .orderBy("createdAt")
        .reverse()
        .limit(100)
        .toArray();

      stockMovements.value = adjustments.map((adj) => ({
        id: adj.id,
        productId: adj.productId,
        productName:
          productRecords.find((p) => p.id === adj.productId)?.name || "Unknown",
        branchId:
          (adj as StockAdjustmentRecord & { branchId?: string }).branchId ||
          "main",
        branchName:
          branchMap.get(
            (adj as StockAdjustmentRecord & { branchId?: string }).branchId ||
              "main"
          ) || "Main Branch",
        type:
          adj.adjustment > 0 ? "in" : adj.adjustment < 0 ? "out" : "adjustment",
        quantity: Math.abs(adj.adjustment),
        previousStock: adj.previousStock,
        newStock: adj.newStock,
        reason: adj.reason,
        reference: adj.notes,
        createdBy: adj.staffId,
        createdAt: new Date(adj.createdAt).toISOString(),
      }));

      // Load suppliers from DB
      await loadSuppliers();

      // Load purchase orders
      await loadPurchaseOrders();
    } catch (e) {
      console.error("Failed to load inventory from local DB:", e);
      error.value = `Failed to load inventory: ${e}`;
    }
  }

  // ============================================
  // 👥 SUPPLIER OPERATIONS (with Nostr)
  // ============================================

  async function loadSuppliers(): Promise<void> {
    try {
      const supplierRecords = await db.suppliers.toArray();
      suppliers.value = supplierRecords.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        contactPerson: s.contactPerson || "",
        email: s.email || "",
        phone: s.phone || "",
        address: s.address || "",
        taxId: s.taxId,
        bankAccount: s.bankAccount,
        paymentTerms: s.paymentTerms,
        leadTimeDays: s.leadTimeDays,
        notes: s.notes,
        productIds: s.productIds || [],
        lastOrderDate: s.updatedAt
          ? new Date(s.updatedAt).toISOString()
          : undefined,
        status: s.status,
        synced: s.synced,
      }));
    } catch (e) {
      console.error("Failed to load suppliers:", e);
    }
  }

  async function addSupplier(
    supplier: Omit<Supplier, "id" | "synced">
  ): Promise<Supplier | null> {
    try {
      const newSupplier: SupplierRecord = {
        id: generateId("sup"),
        name: supplier.name,
        code: supplier.code || supplier.name.toUpperCase().substring(0, 4),
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        taxId: supplier.taxId,
        bankAccount: supplier.bankAccount,
        paymentTerms: supplier.paymentTerms,
        leadTimeDays: supplier.leadTimeDays,
        notes: supplier.notes,
        productIds: supplier.productIds || [],
        status: supplier.status || "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        synced: false,
      };

      await db.suppliers.put(newSupplier);

      // Sync to Nostr
      if (offline.isOnline.value) {
        const synced = await syncSupplierToNostr(newSupplier);
        if (!synced) {
          syncPending.value++;
        }
      } else {
        syncPending.value++;
      }

      await loadSuppliers();
      return suppliers.value.find((s) => s.id === newSupplier.id) || null;
    } catch (e) {
      error.value = `Failed to add supplier: ${e}`;
      return null;
    }
  }

  async function updateSupplier(
    id: string,
    updates: Partial<Supplier>
  ): Promise<boolean> {
    try {
      const existing = await db.suppliers.get(id);
      if (!existing) {
        error.value = "Supplier not found";
        return false;
      }

      const updated: SupplierRecord = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
        synced: false,
      };

      await db.suppliers.put(updated);

      // Sync to Nostr
      if (offline.isOnline.value) {
        await syncSupplierToNostr(updated);
      } else {
        syncPending.value++;
      }

      await loadSuppliers();
      return true;
    } catch (e) {
      error.value = `Failed to update supplier: ${e}`;
      return false;
    }
  }

  async function deleteSupplier(id: string): Promise<boolean> {
    try {
      await db.suppliers.delete(id);
      await loadSuppliers();
      return true;
    } catch (e) {
      error.value = `Failed to delete supplier: ${e}`;
      return false;
    }
  }

  async function syncSupplierToNostr(
    supplier: SupplierRecord
  ): Promise<boolean> {
    try {
      const event = await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.SUPPLIER,
        JSON.stringify({
          id: supplier.id,
          name: supplier.name,
          code: supplier.code,
          contactPerson: supplier.contactPerson,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          taxId: supplier.taxId,
          bankAccount: supplier.bankAccount,
          paymentTerms: supplier.paymentTerms,
          leadTimeDays: supplier.leadTimeDays,
          notes: supplier.notes,
          productIds: supplier.productIds,
          status: supplier.status,
        }),
        supplier.id // dTag
      );

      if (event) {
        await db.suppliers.update(supplier.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to sync supplier to Nostr:", e);
      return false;
    }
  }

  function getSupplier(id: string): Supplier | undefined {
    return suppliers.value.find((s) => s.id === id);
  }

  // ============================================
  // 📦 STOCK OPERATIONS
  // ============================================

  async function adjustStock(
    productId: string,
    branchId: string,
    adjustment: number,
    reason:
      | "sale"
      | "purchase"
      | "adjustment"
      | "count"
      | "waste"
      | "return"
      | "transfer",
    notes?: string
  ): Promise<boolean> {
    try {
      const branchStockId = `${productId}_${branchId}`;
      let branchStock = await db.branchStock.get(branchStockId);

      // If no branch stock exists, create from product
      if (!branchStock) {
        const productRecord = await db.products.get(productId);
        if (!productRecord) {
          error.value = "Product not found";
          return false;
        }
        const product: Product = JSON.parse(productRecord.data);

        branchStock = {
          id: branchStockId,
          productId,
          branchId,
          currentStock: product.stock,
          minStock: product.minStock,
          maxStock: product.minStock * 5 || 100,
          reorderPoint: Math.ceil(product.minStock * 1.5),
          reservedStock: 0,
          costPrice: product.costPrice || product.price * 0.6,
          updatedAt: Date.now(),
          synced: false,
        };
        await db.branchStock.put(branchStock);
      }

      const previousStock = branchStock.currentStock;
      const newStock = Math.max(0, previousStock + adjustment);

      // Update branch stock
      await db.branchStock.update(branchStockId, {
        currentStock: newStock,
        updatedAt: Date.now(),
        synced: false,
        ...(reason === "purchase" ? { lastRestocked: Date.now() } : {}),
        ...(reason === "count" ? { lastCountedAt: Date.now() } : {}),
      });

      // Also update main product stock (sum of all branches)
      await updateProductTotalStock(productId);

      // Create stock adjustment record
      const adjustmentRecord: StockAdjustmentRecord & { branchId: string } = {
        id: generateId("adj"),
        productId,
        branchId,
        previousStock,
        newStock,
        adjustment,
        reason,
        notes,
        staffId: "current_user", // TODO: Get from auth
        createdAt: Date.now(),
        synced: false,
      };

      await db.stockAdjustments.put(adjustmentRecord);

      // Sync to Nostr if online
      if (offline.isOnline.value) {
        const synced = await syncStockAdjustmentToNostr(adjustmentRecord);
        if (!synced) {
          syncPending.value++;
        }
      } else {
        syncPending.value++;
      }

      // Auto-create accounting journal entry for stock adjustments (loss/waste/count)
      if (reason === "waste" || reason === "adjustment" || reason === "count") {
        try {
          const accounting = useAccounting();
          const productRecord = await db.products.get(productId);
          const productName = productRecord?.name || "Unknown Product";
          const costPrice = branchStock.costPrice || 0;

          if (adjustment < 0 && costPrice > 0) {
            // Stock loss/write-off
            await accounting.createStockAdjustmentEntry(
              productName,
              Math.abs(adjustment),
              costPrice,
              reason === "waste" ? "write_off" : "loss",
              adjustmentRecord.id
            );
          } else if (adjustment > 0 && costPrice > 0) {
            // Stock found/gain
            await accounting.createStockAdjustmentEntry(
              productName,
              adjustment,
              costPrice,
              "gain",
              adjustmentRecord.id
            );
          }
        } catch (e) {
          console.warn("[Inventory] Failed to create accounting entry:", e);
          // Don't block stock adjustment if accounting fails
        }
      }

      // Reload inventory
      await loadFromLocal();

      // Also refresh products store so stock is updated everywhere
      await productsStore.refreshProducts();

      // Check if this product is now low stock and notify
      const updatedBranchStock = await db.branchStock.get(branchStockId);
      if (
        updatedBranchStock &&
        updatedBranchStock.currentStock <= updatedBranchStock.minStock
      ) {
        const productRecord = await db.products.get(productId);
        const branchRecord = await db.branches.get(branchId);
        if (productRecord) {
          notifications.notifyLowStock(
            productRecord.name,
            updatedBranchStock.currentStock,
            updatedBranchStock.minStock,
            productId,
            branchRecord?.name
          );
        }
      }

      // Log to centralized audit log
      try {
        const { logActivity } = useAuditLog();
        const productRecord = await db.products.get(productId);
        const productName = productRecord?.name || productId.slice(-8);
        await logActivity(
          "inventory_adjust",
          `${reason}: ${
            adjustment > 0 ? "+" : ""
          }${adjustment} units of "${productName}"`,
          {
            resourceType: "inventory",
            resourceId: productId,
            metadata: {
              reason,
              adjustment,
              previousStock,
              newStock,
              branchId,
            },
          }
        );
      } catch {
        // Don't block inventory operations if logging fails
      }

      return true;
    } catch (e) {
      console.error("Failed to adjust stock:", e);
      error.value = `Failed to adjust stock: ${e}`;
      return false;
    }
  }

  async function updateProductTotalStock(productId: string): Promise<void> {
    const allBranchStocks = await db.branchStock
      .where("productId")
      .equals(productId)
      .toArray();

    const totalStock = allBranchStocks.reduce(
      (sum, bs) => sum + bs.currentStock,
      0
    );

    const productRecord = await db.products.get(productId);
    if (productRecord) {
      const product: Product = JSON.parse(productRecord.data);
      product.stock = totalStock;
      product.updatedAt = new Date().toISOString();

      await db.products.update(productId, {
        data: JSON.stringify(product),
        stock: totalStock,
        updatedAt: Date.now(),
        synced: false,
      });

      // Sync updated product to Nostr to persist stock change
      if (offline.isOnline.value) {
        try {
          await nostrData.saveProduct(product);
          await db.products.update(productId, { synced: true });
        } catch (e) {
          console.error("Failed to sync product stock to Nostr:", e);
        }
      }
    }
  }

  async function syncStockAdjustmentToNostr(
    adjustment: StockAdjustmentRecord & { branchId?: string }
  ): Promise<boolean> {
    try {
      const event = await nostrData.recordStockAdjustment({
        id: adjustment.id,
        productId: adjustment.productId,
        previousStock: adjustment.previousStock,
        newStock: adjustment.newStock,
        adjustment: adjustment.adjustment,
        reason: adjustment.reason as
          | "sale"
          | "purchase"
          | "adjustment"
          | "count"
          | "waste"
          | "return",
        notes: `Branch: ${adjustment.branchId || "main"}${
          adjustment.notes ? ` - ${adjustment.notes}` : ""
        }`,
        staffId: adjustment.staffId,
        createdAt: new Date(adjustment.createdAt).toISOString(),
      });

      if (event) {
        await db.stockAdjustments.update(adjustment.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to sync stock adjustment to Nostr:", e);
      return false;
    }
  }

  /**
   * Add stock (purchase/restock)
   */
  async function addStock(
    productId: string,
    quantity: number,
    branchId: string = "main",
    notes?: string
  ): Promise<boolean> {
    return adjustStock(productId, branchId, quantity, "purchase", notes);
  }

  /**
   * Remove stock (sale/waste)
   */
  async function removeStock(
    productId: string,
    quantity: number,
    branchId: string = "main",
    reason: "sale" | "waste" | "return" = "sale",
    notes?: string
  ): Promise<boolean> {
    return adjustStock(productId, branchId, -quantity, reason, notes);
  }

  /**
   * Transfer stock between branches
   */
  async function transferStock(
    productId: string,
    fromBranchId: string,
    toBranchId: string,
    quantity: number,
    notes?: string
  ): Promise<boolean> {
    try {
      // Verify source has enough stock
      const fromBranchStockId = `${productId}_${fromBranchId}`;
      const fromStock = await db.branchStock.get(fromBranchStockId);

      if (!fromStock || fromStock.currentStock < quantity) {
        error.value = "Insufficient stock for transfer";
        return false;
      }

      // Remove from source branch
      const removeSuccess = await adjustStock(
        productId,
        fromBranchId,
        -quantity,
        "transfer",
        `Transfer to ${toBranchId}: ${notes || ""}`
      );

      if (!removeSuccess) return false;

      // Add to destination branch
      const addSuccess = await adjustStock(
        productId,
        toBranchId,
        quantity,
        "transfer",
        `Transfer from ${fromBranchId}: ${notes || ""}`
      );

      return addSuccess;
    } catch (e) {
      error.value = `Failed to transfer stock: ${e}`;
      return false;
    }
  }

  /**
   * Set stock to specific value (count/adjustment)
   */
  async function setStock(
    productId: string,
    newStock: number,
    branchId: string = "main",
    notes?: string
  ): Promise<boolean> {
    const branchStockId = `${productId}_${branchId}`;
    const branchStock = await db.branchStock.get(branchStockId);
    const currentStock = branchStock?.currentStock || 0;
    const adjustment = newStock - currentStock;

    return adjustStock(productId, branchId, adjustment, "count", notes);
  }

  // ============================================
  // 📋 PURCHASE ORDER OPERATIONS
  // ============================================

  async function loadPurchaseOrders(): Promise<void> {
    try {
      const poRecords = await db.purchaseOrders.toArray();

      purchaseOrders.value = poRecords
        .map((po) => {
          const supplier = suppliers.value.find((s) => s.id === po.supplierId);
          const branch = branches.value.find((b) => b.id === po.branchId);

          return {
            id: po.id,
            supplierId: po.supplierId,
            supplierName: supplier?.name || "Unknown",
            branchId: po.branchId,
            branchName: branch?.name || "Unknown",
            status: po.status,
            items: JSON.parse(po.items || "[]"),
            subtotal: po.subtotal,
            tax: po.tax,
            total: po.total,
            notes: po.notes,
            expectedDate: po.expectedDate
              ? new Date(po.expectedDate).toISOString()
              : undefined,
            receivedDate: po.receivedDate
              ? new Date(po.receivedDate).toISOString()
              : undefined,
            createdBy: po.createdBy,
            createdAt: new Date(po.createdAt).toISOString(),
          };
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } catch (e) {
      console.error("Failed to load purchase orders:", e);
    }
  }

  async function createPurchaseOrder(
    supplierId: string,
    branchId: string,
    items: PurchaseOrder["items"],
    notes?: string
  ): Promise<PurchaseOrder | null> {
    try {
      const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const tax = subtotal * 0.1; // 10% tax

      const po: PurchaseOrderRecord = {
        id: generateId("po"),
        supplierId,
        branchId,
        status: "draft",
        items: JSON.stringify(items),
        subtotal,
        tax,
        total: subtotal + tax,
        notes,
        createdBy: "current_user", // TODO: Get from auth
        createdAt: Date.now(),
        updatedAt: Date.now(),
        synced: false,
      };

      await db.purchaseOrders.put(po);

      // Sync to Nostr
      if (offline.isOnline.value) {
        await syncPurchaseOrderToNostr(po);
      } else {
        syncPending.value++;
      }

      await loadPurchaseOrders();
      return purchaseOrders.value.find((p) => p.id === po.id) || null;
    } catch (e) {
      error.value = `Failed to create purchase order: ${e}`;
      return null;
    }
  }

  async function receivePurchaseOrder(
    poId: string,
    receivedItems: { productId: string; receivedQty: number }[]
  ): Promise<boolean> {
    try {
      const po = await db.purchaseOrders.get(poId);
      if (!po) {
        error.value = "Purchase order not found";
        return false;
      }

      const items: PurchaseOrder["items"] = JSON.parse(po.items);
      let allReceived = true;

      for (const receivedItem of receivedItems) {
        const item = items.find((i) => i.productId === receivedItem.productId);
        if (item) {
          item.receivedQty = (item.receivedQty || 0) + receivedItem.receivedQty;
          if (item.receivedQty < item.quantity) {
            allReceived = false;
          }

          // Add stock for received quantity
          await addStock(
            receivedItem.productId,
            receivedItem.receivedQty,
            po.branchId,
            `PO#${poId}`
          );
        }
      }

      await db.purchaseOrders.update(poId, {
        items: JSON.stringify(items),
        status: allReceived ? "received" : "partial",
        receivedDate: allReceived ? Date.now() : undefined,
        updatedAt: Date.now(),
        synced: false,
      });

      await loadPurchaseOrders();
      return true;
    } catch (e) {
      error.value = `Failed to receive purchase order: ${e}`;
      return false;
    }
  }

  async function updatePurchaseOrderStatus(
    poId: string,
    status: PurchaseOrderRecord["status"]
  ): Promise<boolean> {
    try {
      const po = await db.purchaseOrders.get(poId);
      if (!po) {
        error.value = "Purchase order not found";
        return false;
      }

      const updates: Partial<PurchaseOrderRecord> = {
        status,
        updatedAt: Date.now(),
        synced: false,
      };

      // Set receivedDate if status is received
      if (status === "received") {
        updates.receivedDate = Date.now();
      }

      await db.purchaseOrders.update(poId, updates);

      // Sync to Nostr if online
      if (offline.isOnline.value) {
        const updatedPo = await db.purchaseOrders.get(poId);
        if (updatedPo) {
          await syncPurchaseOrderToNostr(updatedPo);
        }
      } else {
        syncPending.value++;
      }

      await loadPurchaseOrders();
      return true;
    } catch (e) {
      error.value = `Failed to update purchase order status: ${e}`;
      return false;
    }
  }

  async function deletePurchaseOrder(poId: string): Promise<boolean> {
    try {
      const po = await db.purchaseOrders.get(poId);
      if (!po) {
        error.value = "Purchase order not found";
        return false;
      }

      // Only allow deletion for draft, pending, or cancelled POs
      if (!["draft", "pending", "cancelled"].includes(po.status)) {
        error.value =
          "Cannot delete a purchase order that is in progress or completed";
        return false;
      }

      await db.purchaseOrders.delete(poId);
      await loadPurchaseOrders();
      return true;
    } catch (e) {
      error.value = `Failed to delete purchase order: ${e}`;
      return false;
    }
  }

  async function updatePurchaseOrder(
    poId: string,
    updates: {
      supplierId?: string;
      branchId?: string;
      items?: PurchaseOrder["items"];
      notes?: string;
      expectedDate?: string;
    }
  ): Promise<boolean> {
    try {
      const po = await db.purchaseOrders.get(poId);
      if (!po) {
        error.value = "Purchase order not found";
        return false;
      }

      // Only allow editing for draft or pending POs
      if (!["draft", "pending"].includes(po.status)) {
        error.value =
          "Cannot edit a purchase order that is already in progress";
        return false;
      }

      // Build update object
      const dbUpdates: Partial<PurchaseOrderRecord> = {
        updatedAt: Date.now(),
        synced: false,
      };

      if (updates.supplierId) dbUpdates.supplierId = updates.supplierId;
      if (updates.branchId) dbUpdates.branchId = updates.branchId;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.expectedDate)
        dbUpdates.expectedDate = new Date(updates.expectedDate).getTime();

      // Recalculate totals if items changed
      if (updates.items) {
        const subtotal = updates.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );
        const tax = subtotal * 0.1; // 10% tax
        dbUpdates.items = JSON.stringify(updates.items);
        dbUpdates.subtotal = subtotal;
        dbUpdates.tax = tax;
        dbUpdates.total = subtotal + tax;
      }

      await db.purchaseOrders.update(poId, dbUpdates);

      // Sync to Nostr if online
      if (offline.isOnline.value) {
        const updatedPo = await db.purchaseOrders.get(poId);
        if (updatedPo) {
          await syncPurchaseOrderToNostr(updatedPo);
        }
      } else {
        syncPending.value++;
      }

      await loadPurchaseOrders();
      return true;
    } catch (e) {
      error.value = `Failed to update purchase order: ${e}`;
      return false;
    }
  }

  function getPurchaseOrder(poId: string): PurchaseOrder | undefined {
    return purchaseOrders.value.find((po) => po.id === poId);
  }

  async function syncPurchaseOrderToNostr(
    po: PurchaseOrderRecord
  ): Promise<boolean> {
    try {
      const event = await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.PURCHASE_ORDER,
        JSON.stringify({
          id: po.id,
          supplierId: po.supplierId,
          branchId: po.branchId,
          status: po.status,
          items: po.items,
          subtotal: po.subtotal,
          tax: po.tax,
          total: po.total,
          notes: po.notes,
          expectedDate: po.expectedDate,
          receivedDate: po.receivedDate,
          createdBy: po.createdBy,
        }),
        po.id // dTag
      );

      if (event) {
        await db.purchaseOrders.update(po.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to sync purchase order to Nostr:", e);
      return false;
    }
  }

  // ============================================
  // 🔍 QUERY OPERATIONS
  // ============================================

  function getInventoryItem(
    productId: string,
    branchId?: string
  ): InventoryItem | undefined {
    if (branchId) {
      return inventoryItems.value.find(
        (item) => item.productId === productId && item.branchId === branchId
      );
    }
    return inventoryItems.value.find((item) => item.productId === productId);
  }

  function getInventoryByBranch(branchId: string): InventoryItem[] {
    return inventoryItems.value.filter((item) => item.branchId === branchId);
  }

  function getInventoryByCategory(categoryId: string): InventoryItem[] {
    return inventoryItems.value.filter(
      (item) => item.categoryId === categoryId
    );
  }

  function getInventoryByStatus(
    status: InventoryItem["status"]
  ): InventoryItem[] {
    return inventoryItems.value.filter((item) => item.status === status);
  }

  function getLowStockItems(branchId?: string): InventoryItem[] {
    let items = inventoryItems.value.filter(
      (item) => item.status === "low-stock" || item.status === "out-of-stock"
    );
    if (branchId) {
      items = items.filter((item) => item.branchId === branchId);
    }
    return items;
  }

  function getStockMovements(
    productId?: string,
    branchId?: string,
    limit = 50
  ): StockMovement[] {
    let movements = stockMovements.value;

    if (productId) {
      movements = movements.filter((m) => m.productId === productId);
    }
    if (branchId) {
      movements = movements.filter((m) => m.branchId === branchId);
    }

    return movements.slice(0, limit);
  }

  // ============================================
  // 📊 ANALYTICS
  // ============================================

  function getInventoryStats(branchId?: string): {
    totalProducts: number;
    totalValue: number;
    lowStock: number;
    outOfStock: number;
    overstocked: number;
    inStock: number;
  } {
    let items = inventoryItems.value;
    if (branchId) {
      items = items.filter((i) => i.branchId === branchId);
    }

    return {
      totalProducts: items.length,
      totalValue: items.reduce((sum, i) => sum + i.value, 0),
      lowStock: items.filter((i) => i.status === "low-stock").length,
      outOfStock: items.filter((i) => i.status === "out-of-stock").length,
      overstocked: items.filter((i) => i.status === "overstocked").length,
      inStock: items.filter((i) => i.status === "in-stock").length,
    };
  }

  function getBranchStats(): {
    branchId: string;
    branchName: string;
    stats: ReturnType<typeof getInventoryStats>;
  }[] {
    return branches.value.map((branch) => ({
      branchId: branch.id,
      branchName: branch.name,
      stats: getInventoryStats(branch.id),
    }));
  }

  // ============================================
  // 🔄 SYNC OPERATIONS
  // ============================================

  async function syncPendingData(): Promise<{
    synced: number;
    failed: number;
  }> {
    let synced = 0;
    let failed = 0;

    // Sync pending stock adjustments
    const unsyncedAdjustments = await db.stockAdjustments
      .filter((a) => !a.synced)
      .toArray();
    for (const adjustment of unsyncedAdjustments) {
      const success = await syncStockAdjustmentToNostr(
        adjustment as StockAdjustmentRecord & { branchId?: string }
      );
      if (success) synced++;
      else failed++;
    }

    // Sync pending suppliers
    const unsyncedSuppliers = await db.suppliers
      .filter((s) => !s.synced)
      .toArray();
    for (const supplier of unsyncedSuppliers) {
      const success = await syncSupplierToNostr(supplier);
      if (success) synced++;
      else failed++;
    }

    // Sync pending purchase orders
    const unsyncedPOs = await db.purchaseOrders
      .filter((po) => !po.synced)
      .toArray();
    for (const po of unsyncedPOs) {
      const success = await syncPurchaseOrderToNostr(po);
      if (success) synced++;
      else failed++;
    }

    syncPending.value = failed;
    return { synced, failed };
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  async function init(): Promise<void> {
    if (isInitialized.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      // Initialize products store first
      await productsStore.init();

      // Load branches
      await loadBranches();

      // Load inventory data
      await loadFromLocal();

      // Count pending syncs
      const unsyncedAdjustments = await db.stockAdjustments
        .filter((a) => !a.synced)
        .count();
      const unsyncedSuppliers = await db.suppliers
        .filter((s) => !s.synced)
        .count();
      const unsyncedPOs = await db.purchaseOrders
        .filter((po) => !po.synced)
        .count();
      syncPending.value = unsyncedAdjustments + unsyncedSuppliers + unsyncedPOs;

      isInitialized.value = true;

      // Check for low stock and create notifications
      await notifications.checkLowStock();
    } catch (e) {
      error.value = `Failed to initialize inventory: ${e}`;
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 📤 EXPORT
  // ============================================

  async function exportInventory(): Promise<string> {
    return JSON.stringify(
      {
        inventory: inventoryItems.value,
        movements: stockMovements.value,
        suppliers: suppliers.value,
        branches: branches.value,
        purchaseOrders: purchaseOrders.value,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  return {
    // State
    inventoryItems,
    stockMovements,
    suppliers,
    branches,
    purchaseOrders,
    isLoading,
    error,
    isInitialized,
    syncPending,
    currentBranchId,

    // Computed
    totalInventoryValue,
    lowStockCount,
    outOfStockCount,
    totalProducts,
    activeSuppliers,
    activeBranches,
    filteredInventory,
    pendingOrders,

    // Init
    init,

    // Branch Operations
    loadBranches,
    addBranch,

    // Stock Operations
    adjustStock,
    addStock,
    removeStock,
    setStock,
    transferStock,

    // Supplier Operations
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplier,
    loadSuppliers,

    // Purchase Order Operations
    createPurchaseOrder,
    receivePurchaseOrder,
    updatePurchaseOrderStatus,
    updatePurchaseOrder,
    deletePurchaseOrder,
    getPurchaseOrder,
    loadPurchaseOrders,

    // Query
    getInventoryItem,
    getInventoryByBranch,
    getInventoryByCategory,
    getInventoryByStatus,
    getLowStockItems,
    getStockMovements,

    // Analytics
    getInventoryStats,
    getBranchStats,

    // Sync
    syncPendingData,

    // Export
    exportInventory,
    
    // Reservations
    reserveStock,
    releaseReservation,
    getInventoryReservations,
    cleanupExpiredReservations,
  };
  
  // ============================================
  // 🔒 INVENTORY RESERVATION FUNCTIONS
  // ============================================
  
  const reservations = ref<InventoryReservation[]>([]);
  
  // Load reservations from localStorage
  function loadReservations() {
    try {
      const stored = localStorage.getItem('inventory_reservations');
      if (stored) {
        const data = JSON.parse(stored);
        reservations.value = data.map((r: any) => ({
          ...r,
          expiresAt: new Date(r.expiresAt),
          createdAt: new Date(r.createdAt),
        }));
      }
      cleanupExpiredReservations();
    } catch (error) {
      console.error('Failed to load reservations:', error);
    }
  }
  
  // Save reservations
  function saveReservations() {
    try {
      localStorage.setItem('inventory_reservations', JSON.stringify(reservations.value));
    } catch (error) {
      console.error('Failed to save reservations:', error);
    }
  }
  
  // Reserve stock for order
  async function reserveStock(params: {
    items: Array<{ productId: string; quantity: number }>;
    customerId?: string;
    orderId: string;
    expiresIn: number;
  }) {
    const baseId = `RES-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const reservationGroup: InventoryReservation[] = [];
    
    for (const item of params.items) {
      const reservation: InventoryReservation = {
        id: `${baseId}-${item.productId}`,
        productId: item.productId,
        quantity: item.quantity,
        customerId: params.customerId,
        orderId: params.orderId,
        expiresAt: new Date(Date.now() + params.expiresIn),
        createdAt: new Date(),
        status: 'active',
      };
      reservations.value.push(reservation);
      reservationGroup.push(reservation);
    }
    
    saveReservations();
    
    return {
      id: baseId,
      expiresAt: reservationGroup[0].expiresAt,
      items: reservationGroup,
    };
  }
  
  // Release reservation
  async function releaseReservation(reservationId: string) {
    reservations.value.forEach(r => {
      if (r.id.startsWith(reservationId) || r.id === reservationId) {
        r.status = 'released';
      }
    });
    saveReservations();
  }
  
  // Get active reservations for product
  function getInventoryReservations(productId: string): InventoryReservation[] {
    const now = new Date();
    return reservations.value.filter(
      r => r.productId === productId && 
      r.status === 'active' && 
      r.expiresAt > now
    );
  }
  
  // Clean up expired reservations
  function cleanupExpiredReservations() {
    const now = new Date();
    reservations.value.forEach(r => {
      if (r.expiresAt < now && r.status === 'active') {
        r.status = 'expired';
      }
    });
    // Remove old expired reservations (older than 24 hours)
    reservations.value = reservations.value.filter(
      r => r.status !== 'expired' || 
      (Date.now() - r.createdAt.getTime()) < 24 * 60 * 60 * 1000
    );
    saveReservations();
  }
  
  // Initialize reservations
  if (process.client) {
    loadReservations();
    setInterval(cleanupExpiredReservations, 60000); // Cleanup every minute
  }
}
