// ============================================
// 📦 STOCK LOT/BATCH COMPOSABLE
// FIFO/FEFO Inventory Management with Expiry Tracking
// ============================================

import type { 
  StockLot, 
  StoragePosition, 
  StockReceipt,
  LotStockMovement,
  ExpiryAlertConfig,
} from '~/types';
import { 
  db,
  type StockLotRecord,
  type StoragePositionRecord,
  type StockReceiptRecord,
  type LotStockMovementRecord,
} from '~/db/db';

// ============================================
// 📋 TYPES
// ============================================

export interface ExpiryAlert {
  id: string;
  lot: StockLot;
  productName: string;
  lotNumber: string;
  currentQuantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  alertLevel: 'warning' | 'critical' | 'urgent' | 'expired';
  acknowledged: boolean;
}

export interface StockLotSummary {
  totalLots: number;
  totalQuantity: number;
  totalValue: number;
  expiringCount: number;
  expiredCount: number;
  lotsByStatus: Record<string, number>;
}

// Singleton state
const stockLots = ref<StockLot[]>([]);
const storagePositions = ref<StoragePosition[]>([]);
const stockReceipts = ref<StockReceipt[]>([]);
const expiryAlerts = ref<ExpiryAlert[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);

// Default expiry alert configuration
const expiryConfig = ref<ExpiryAlertConfig>({
  warningDays: 30,
  criticalDays: 7,
  urgentDays: 3,
  autoQuarantine: true,
  notifyEmail: false,
  notifyPush: true,
});

export function useStockLots() {
  const productsStore = useProductsStore();
  const _notifications = useNotifications();

  // ============================================
  // 📊 COMPUTED
  // ============================================

  // Get lots that are expiring within warning days
  const expiringLots = computed(() => {
    const now = Date.now();
    const warningMs = expiryConfig.value.warningDays * 24 * 60 * 60 * 1000;
    
    return stockLots.value.filter(lot => {
      if (!lot.expiryDate || lot.status === 'depleted' || lot.status === 'expired') return false;
      const expiryTime = new Date(lot.expiryDate).getTime();
      return expiryTime - now <= warningMs && expiryTime > now;
    }).sort((a, b) => {
      const aExpiry = new Date(a.expiryDate!).getTime();
      const bExpiry = new Date(b.expiryDate!).getTime();
      return aExpiry - bExpiry;
    });
  });

  // Get expired lots
  const expiredLots = computed(() => {
    const now = Date.now();
    return stockLots.value.filter(lot => {
      if (!lot.expiryDate || lot.status === 'depleted') return false;
      return new Date(lot.expiryDate).getTime() <= now;
    });
  });

  // Get available lots (for picking during sales)
  const availableLots = computed(() => {
    return stockLots.value.filter(lot => 
      lot.status === 'available' && lot.availableQuantity > 0
    );
  });

  // Summary statistics
  const summary = computed<StockLotSummary>(() => {
    const lots = stockLots.value.filter(l => l.status !== 'depleted');
    const statusCount: Record<string, number> = {};
    
    lots.forEach(lot => {
      statusCount[lot.status] = (statusCount[lot.status] || 0) + 1;
    });

    return {
      totalLots: lots.length,
      totalQuantity: lots.reduce((sum, lot) => sum + lot.currentQuantity, 0),
      totalValue: lots.reduce((sum, lot) => sum + (lot.currentQuantity * lot.costPrice), 0),
      expiringCount: expiringLots.value.length,
      expiredCount: expiredLots.value.length,
      lotsByStatus: statusCount,
    };
  });

  // ============================================
  // 🔄 INITIALIZATION
  // ============================================

  async function init() {
    if (isInitialized.value) return;
    
    isLoading.value = true;
    error.value = null;

    try {
      await Promise.all([
        loadStockLots(),
        loadStoragePositions(),
        loadStockReceipts(),
      ]);
      
      // Check for expiry alerts
      await checkExpiryAlerts();
      
      isInitialized.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize stock lots';
      console.error('Stock lots init error:', err);
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 📥 LOAD DATA
  // ============================================

  async function loadStockLots() {
    const records = await db.stockLots.toArray();
    stockLots.value = records.map(recordToLot);
  }

  async function loadStoragePositions() {
    const records = await db.storagePositions.toArray();
    storagePositions.value = records.map(recordToPosition);
  }

  async function loadStockReceipts() {
    const records = await db.stockReceipts
      .orderBy('receiptDate')
      .reverse()
      .limit(100)
      .toArray();
    stockReceipts.value = records.map(recordToReceipt);
  }

  // ============================================
  // 📦 STOCK LOT OPERATIONS
  // ============================================

  /**
   * Create a new stock lot when receiving inventory
   */
  async function createStockLot(data: {
    productId: string;
    branchId: string;
    lotNumber: string;
    quantity: number;
    costPrice: number;
    expiryDate?: string;
    manufacturingDate?: string;
    positionId?: string;
    supplierId?: string;
    supplierName?: string;
    purchaseOrderId?: string;
    qualityGrade?: 'A' | 'B' | 'C';
    notes?: string;
    createdBy: string; // npub or user identifier
  }): Promise<StockLot | null> {
    try {
      const now = Date.now();
      const id = `lot_${now}_${Math.random().toString(36).substr(2, 9)}`;
      const batchCode = generateBatchCode(data.productId, now);

      // Calculate status based on expiry
      let status: StockLot['status'] = 'available';
      if (data.expiryDate) {
        const expiryTime = new Date(data.expiryDate).getTime();
        const daysUntil = Math.ceil((expiryTime - now) / (24 * 60 * 60 * 1000));
        
        if (daysUntil <= 0) {
          status = 'expired';
        } else if (daysUntil <= expiryConfig.value.urgentDays) {
          status = 'expiring';
        }
      }

      // Get position code if position selected
      let positionCode: string | undefined;
      if (data.positionId) {
        const position = storagePositions.value.find(p => p.id === data.positionId);
        positionCode = position?.fullCode;
      }

      const record: StockLotRecord = {
        id,
        productId: data.productId,
        branchId: data.branchId,
        lotNumber: data.lotNumber,
        batchCode,
        initialQuantity: data.quantity,
        currentQuantity: data.quantity,
        reservedQuantity: 0,
        manufacturingDate: data.manufacturingDate ? new Date(data.manufacturingDate).getTime() : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate).getTime() : undefined,
        receivedDate: now,
        status,
        positionId: data.positionId,
        positionCode,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        purchaseOrderId: data.purchaseOrderId,
        costPrice: data.costPrice,
        totalCost: data.quantity * data.costPrice,
        qualityGrade: data.qualityGrade,
        notes: data.notes,
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now,
        synced: false,
      };

      await db.stockLots.put(record);
      
      const lot = recordToLot(record);
      stockLots.value.push(lot);

      // Record movement
      await recordMovement({
        lotId: id,
        productId: data.productId,
        branchId: data.branchId,
        type: 'receipt',
        quantity: data.quantity,
        previousQty: 0,
        newQty: data.quantity,
        reason: 'Stock received',
        referenceType: data.purchaseOrderId ? 'purchase_order' : 'manual',
        referenceId: data.purchaseOrderId,
        unitCost: data.costPrice,
        totalCost: data.quantity * data.costPrice,
        createdBy: data.createdBy,
      });

      // Update product total stock
      await updateProductTotalStock(data.productId, data.branchId);

      return lot;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create stock lot';
      console.error('Create stock lot error:', err);
      return null;
    }
  }

  /**
   * Consume stock from lots using FEFO (First Expired First Out)
   */
  async function consumeStock(
    productId: string,
    branchId: string,
    quantity: number,
    options: {
      reason: string;
      referenceType?: 'order' | 'production' | 'manual';
      referenceId?: string;
      createdBy: string;
      preferLotId?: string; // Specific lot to consume from
    }
  ): Promise<{ success: boolean; consumedFrom: Array<{ lotId: string; quantity: number }> }> {
    try {
      // Get available lots for this product, sorted by expiry (FEFO)
      const lots = stockLots.value
        .filter(lot => 
          lot.productId === productId && 
          lot.branchId === branchId &&
          lot.status !== 'depleted' &&
          lot.status !== 'expired' &&
          lot.availableQuantity > 0
        )
        .sort((a, b) => {
          // FEFO: First expired first out
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        });

      // If specific lot preferred, move it to front
      if (options.preferLotId) {
        const preferredIdx = lots.findIndex(l => l.id === options.preferLotId);
        if (preferredIdx > 0) {
          const preferred = lots.splice(preferredIdx, 1)[0];
          if (preferred) {
            lots.unshift(preferred);
          }
        }
      }

      let remaining = quantity;
      const consumedFrom: Array<{ lotId: string; quantity: number }> = [];

      for (const lot of lots) {
        if (remaining <= 0) break;

        const toConsume = Math.min(remaining, lot.availableQuantity);
        
        // Update lot
        const newQty = lot.currentQuantity - toConsume;
        const newStatus = newQty <= 0 ? 'depleted' : lot.status;

        await db.stockLots.update(lot.id, {
          currentQuantity: newQty,
          status: newStatus,
          updatedAt: Date.now(),
        });

        // Update local state
        const lotIdx = stockLots.value.findIndex(l => l.id === lot.id);
        if (lotIdx >= 0 && stockLots.value[lotIdx]) {
          stockLots.value[lotIdx] = {
            ...stockLots.value[lotIdx]!,
            currentQuantity: newQty,
            availableQuantity: newQty - lot.reservedQuantity,
            status: newStatus,
          };
        }

        // Record movement
        await recordMovement({
          lotId: lot.id,
          productId,
          branchId,
          type: options.referenceType === 'order' ? 'sale' : 'adjustment',
          quantity: -toConsume,
          previousQty: lot.currentQuantity,
          newQty,
          reason: options.reason,
          referenceType: options.referenceType,
          referenceId: options.referenceId,
          unitCost: lot.costPrice,
          totalCost: toConsume * lot.costPrice,
          createdBy: options.createdBy,
        });

        consumedFrom.push({ lotId: lot.id, quantity: toConsume });
        remaining -= toConsume;
      }

      if (remaining > 0) {
        console.warn(`Insufficient stock: ${remaining} units could not be consumed`);
      }

      // Update product total stock
      await updateProductTotalStock(productId, branchId);

      return { 
        success: remaining === 0, 
        consumedFrom 
      };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to consume stock';
      console.error('Consume stock error:', err);
      return { success: false, consumedFrom: [] };
    }
  }

  /**
   * Transfer lot to different position
   */
  async function transferLotPosition(
    lotId: string,
    toPositionId: string,
    createdBy: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const lot = stockLots.value.find(l => l.id === lotId);
      if (!lot) {
        error.value = 'Lot not found';
        return false;
      }

      const toPosition = storagePositions.value.find(p => p.id === toPositionId);
      if (!toPosition) {
        error.value = 'Position not found';
        return false;
      }

      const fromPositionId = lot.positionId;

      await db.stockLots.update(lotId, {
        positionId: toPositionId,
        positionCode: toPosition.fullCode,
        updatedAt: Date.now(),
      });

      // Update local state
      const lotIdx = stockLots.value.findIndex(l => l.id === lotId);
      if (lotIdx >= 0 && stockLots.value[lotIdx]) {
        stockLots.value[lotIdx] = {
          ...stockLots.value[lotIdx]!,
          positionId: toPositionId,
          positionCode: toPosition.fullCode,
          position: toPosition,
        };
      }

      // Record movement
      await recordMovement({
        lotId,
        productId: lot.productId,
        branchId: lot.branchId,
        type: 'adjustment',
        quantity: 0,
        previousQty: lot.currentQuantity,
        newQty: lot.currentQuantity,
        reason: `Position transfer: ${lot.positionCode || 'N/A'} → ${toPosition.fullCode}`,
        notes,
        fromPositionId,
        toPositionId,
        createdBy,
      });

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to transfer lot';
      console.error('Transfer lot error:', err);
      return false;
    }
  }

  /**
   * Mark lot as quarantined
   */
  async function quarantineLot(
    lotId: string,
    reason: string,
    _createdBy: string
  ): Promise<boolean> {
    try {
      await db.stockLots.update(lotId, {
        status: 'quarantine',
        qualityNotes: reason,
        updatedAt: Date.now(),
      });

      const lotIdx = stockLots.value.findIndex(l => l.id === lotId);
      if (lotIdx >= 0 && stockLots.value[lotIdx]) {
        stockLots.value[lotIdx] = {
          ...stockLots.value[lotIdx]!,
          status: 'quarantine',
          qualityNotes: reason,
        };
      }

      // Update product total stock (quarantined doesn't count)
      const lot = stockLots.value[lotIdx];
      if (lot) {
        await updateProductTotalStock(lot.productId, lot.branchId);
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to quarantine lot';
      return false;
    }
  }

  // ============================================
  // 📍 STORAGE POSITION OPERATIONS
  // ============================================

  async function createPosition(data: {
    branchId: string;
    zone: string;
    rack?: string;
    shelf?: string;
    bin?: string;
    description?: string;
    capacity?: number;
    storageType: StoragePosition['storageType'];
    temperature?: { min: number; max: number };
  }): Promise<StoragePosition | null> {
    try {
      const id = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fullCode = [data.zone, data.rack, data.shelf, data.bin]
        .filter(Boolean)
        .join('-');

      const record: StoragePositionRecord = {
        id,
        branchId: data.branchId,
        zone: data.zone,
        rack: data.rack,
        shelf: data.shelf,
        bin: data.bin,
        fullCode,
        description: data.description,
        capacity: data.capacity,
        storageType: data.storageType,
        temperatureMin: data.temperature?.min,
        temperatureMax: data.temperature?.max,
        isActive: true,
        synced: false,
      };

      await db.storagePositions.put(record);
      
      const position = recordToPosition(record);
      storagePositions.value.push(position);

      return position;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create position';
      return null;
    }
  }

  async function getPositionsByBranch(branchId: string): Promise<StoragePosition[]> {
    return storagePositions.value.filter(p => p.branchId === branchId && p.isActive);
  }

  // ============================================
  // 📋 STOCK RECEIPT OPERATIONS
  // ============================================

  async function createStockReceipt(data: {
    branchId: string;
    supplierId?: string;
    supplierName?: string;
    purchaseOrderId?: string;
    deliveryNote?: string;
    invoiceNumber?: string;
    items: Array<{
      productId: string;
      productName: string;
      productSku: string;
      receivedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      lotNumber: string;
      manufacturingDate?: string;
      expiryDate?: string;
      positionId?: string;
      unitCost: number;
      notes?: string;
      rejectionReason?: string;
    }>;
    receivedBy: string;
    notes?: string;
  }): Promise<StockReceipt | null> {
    try {
      const now = Date.now();
      const id = `rcpt_${now}_${Math.random().toString(36).substr(2, 9)}`;
      const receiptNumber = generateReceiptNumber(now);

      // Calculate totals
      const totalItems = data.items.length;
      const totalQuantity = data.items.reduce((sum, item) => sum + item.acceptedQty, 0);
      const totalValue = data.items.reduce((sum, item) => sum + (item.acceptedQty * item.unitCost), 0);

      const record: StockReceiptRecord = {
        id,
        branchId: data.branchId,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        purchaseOrderId: data.purchaseOrderId,
        receiptNumber,
        receiptDate: now,
        deliveryNote: data.deliveryNote,
        invoiceNumber: data.invoiceNumber,
        itemsJson: JSON.stringify(data.items),
        totalItems,
        totalQuantity,
        totalValue,
        status: 'completed',
        receivedBy: data.receivedBy,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
        synced: false,
      };

      await db.stockReceipts.put(record);

      // Create stock lots for each item
      for (const item of data.items) {
        if (item.acceptedQty > 0) {
          await createStockLot({
            productId: item.productId,
            branchId: data.branchId,
            lotNumber: item.lotNumber,
            quantity: item.acceptedQty,
            costPrice: item.unitCost,
            expiryDate: item.expiryDate,
            manufacturingDate: item.manufacturingDate,
            positionId: item.positionId,
            supplierId: data.supplierId,
            supplierName: data.supplierName,
            purchaseOrderId: data.purchaseOrderId,
            notes: item.notes,
            createdBy: data.receivedBy,
          });
        }
      }

      const receipt = recordToReceipt(record);
      stockReceipts.value.unshift(receipt);

      return receipt;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create stock receipt';
      return null;
    }
  }

  // ============================================
  // ⚠️ EXPIRY ALERT OPERATIONS
  // ============================================

  async function checkExpiryAlerts(): Promise<void> {
    const now = Date.now();
    const alerts: ExpiryAlert[] = [];

    for (const lot of stockLots.value) {
      if (!lot.expiryDate || lot.status === 'depleted' || lot.currentQuantity <= 0) continue;

      const expiryTime = new Date(lot.expiryDate).getTime();
      const daysUntil = Math.ceil((expiryTime - now) / (24 * 60 * 60 * 1000));
      
      let alertLevel: ExpiryAlert['alertLevel'] | null = null;

      if (daysUntil <= 0) {
        alertLevel = 'expired';
        // Auto-quarantine if configured
        if (expiryConfig.value.autoQuarantine && lot.status !== 'quarantine' && lot.status !== 'expired') {
          await db.stockLots.update(lot.id, { status: 'expired', updatedAt: now });
          const idx = stockLots.value.findIndex(l => l.id === lot.id);
          if (idx >= 0 && stockLots.value[idx]) {
            stockLots.value[idx] = { ...stockLots.value[idx]!, status: 'expired' };
          }
        }
      } else if (daysUntil <= expiryConfig.value.urgentDays) {
        alertLevel = 'urgent';
      } else if (daysUntil <= expiryConfig.value.criticalDays) {
        alertLevel = 'critical';
      } else if (daysUntil <= expiryConfig.value.warningDays) {
        alertLevel = 'warning';
      }

      if (alertLevel) {
        // Get product name
        const product = productsStore.products.value.find(p => p.id === lot.productId);
        
        alerts.push({
          id: `alert_${lot.id}`,
          lot,
          productName: product?.name || 'Unknown Product',
          lotNumber: lot.lotNumber,
          currentQuantity: lot.currentQuantity,
          expiryDate: lot.expiryDate,
          daysUntilExpiry: daysUntil,
          alertLevel,
          acknowledged: false,
        });
      }
    }

    // Sort by urgency
    expiryAlerts.value = alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }

  async function acknowledgeAlert(alertId: string, _actionTaken?: string): Promise<boolean> {
    const idx = expiryAlerts.value.findIndex(a => a.id === alertId);
    if (idx >= 0 && expiryAlerts.value[idx]) {
      expiryAlerts.value[idx] = { ...expiryAlerts.value[idx]!, acknowledged: true };
      return true;
    }
    return false;
  }

  // ============================================
  // 🔧 HELPER FUNCTIONS
  // ============================================

  async function recordMovement(data: {
    lotId: string;
    productId: string;
    branchId: string;
    type: LotStockMovement['type'];
    quantity: number;
    previousQty: number;
    newQty: number;
    reason: string;
    referenceType?: LotStockMovement['referenceType'];
    referenceId?: string;
    notes?: string;
    unitCost?: number;
    totalCost?: number;
    fromPositionId?: string;
    toPositionId?: string;
    createdBy: string;
  }): Promise<void> {
    const record: LotStockMovementRecord = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: Date.now(),
      synced: false,
    };

    await db.lotStockMovements.put(record);
  }

  async function updateProductTotalStock(productId: string, branchId: string): Promise<void> {
    // Sum all available lots for this product
    const totalStock = stockLots.value
      .filter(lot => 
        lot.productId === productId && 
        lot.branchId === branchId &&
        lot.status !== 'depleted' &&
        lot.status !== 'expired' &&
        lot.status !== 'quarantine'
      )
      .reduce((sum, lot) => sum + lot.currentQuantity, 0);

    // Update product stock via products store
    await productsStore.updateProduct(productId, { stock: totalStock });
  }

  function generateBatchCode(productId: string, timestamp: number): string {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${dateStr}-${suffix}`;
  }

  function generateReceiptNumber(timestamp: number): string {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `GRN-${dateStr}-${seq}`;
  }

  function recordToLot(record: StockLotRecord): StockLot {
    const position = record.positionId 
      ? storagePositions.value.find(p => p.id === record.positionId)
      : undefined;

    const daysUntilExpiry = record.expiryDate
      ? Math.ceil((record.expiryDate - Date.now()) / (24 * 60 * 60 * 1000))
      : undefined;

    return {
      id: record.id,
      productId: record.productId,
      branchId: record.branchId,
      lotNumber: record.lotNumber,
      batchCode: record.batchCode,
      initialQuantity: record.initialQuantity,
      currentQuantity: record.currentQuantity,
      reservedQuantity: record.reservedQuantity,
      availableQuantity: record.currentQuantity - record.reservedQuantity,
      manufacturingDate: record.manufacturingDate ? new Date(record.manufacturingDate).toISOString() : undefined,
      expiryDate: record.expiryDate ? new Date(record.expiryDate).toISOString() : undefined,
      bestBeforeDate: record.bestBeforeDate ? new Date(record.bestBeforeDate).toISOString() : undefined,
      receivedDate: new Date(record.receivedDate).toISOString(),
      status: record.status,
      daysUntilExpiry,
      expiryAlertSent: record.expiryAlertSent,
      positionId: record.positionId,
      position,
      positionCode: record.positionCode,
      supplierId: record.supplierId,
      supplierName: record.supplierName,
      purchaseOrderId: record.purchaseOrderId,
      costPrice: record.costPrice,
      totalCost: record.totalCost,
      qualityGrade: record.qualityGrade,
      qualityNotes: record.qualityNotes,
      inspectedAt: record.inspectedAt ? new Date(record.inspectedAt).toISOString() : undefined,
      inspectedBy: record.inspectedBy,
      notes: record.notes,
      createdBy: record.createdBy,
      createdAt: new Date(record.createdAt).toISOString(),
      updatedAt: new Date(record.updatedAt).toISOString(),
    };
  }

  function recordToPosition(record: StoragePositionRecord): StoragePosition {
    return {
      id: record.id,
      branchId: record.branchId,
      zone: record.zone,
      rack: record.rack,
      shelf: record.shelf,
      bin: record.bin,
      fullCode: record.fullCode,
      description: record.description,
      capacity: record.capacity,
      storageType: record.storageType,
      temperature: record.temperatureMin !== undefined && record.temperatureMax !== undefined
        ? { min: record.temperatureMin, max: record.temperatureMax }
        : undefined,
      isActive: record.isActive,
    };
  }

  function recordToReceipt(record: StockReceiptRecord): StockReceipt {
    return {
      id: record.id,
      branchId: record.branchId,
      supplierId: record.supplierId,
      supplierName: record.supplierName,
      purchaseOrderId: record.purchaseOrderId,
      receiptNumber: record.receiptNumber,
      receiptDate: new Date(record.receiptDate).toISOString(),
      deliveryNote: record.deliveryNote,
      invoiceNumber: record.invoiceNumber,
      items: JSON.parse(record.itemsJson || '[]'),
      totalItems: record.totalItems,
      totalQuantity: record.totalQuantity,
      totalValue: record.totalValue,
      status: record.status,
      inspectionNotes: record.inspectionNotes,
      receivedBy: record.receivedBy,
      inspectedBy: record.inspectedBy,
      approvedBy: record.approvedBy,
      notes: record.notes,
      createdAt: new Date(record.createdAt).toISOString(),
      updatedAt: new Date(record.updatedAt).toISOString(),
    };
  }

  // Get lots for a specific product
  function getLotsForProduct(productId: string, branchId?: string): StockLot[] {
    return stockLots.value.filter(lot => 
      lot.productId === productId &&
      (!branchId || lot.branchId === branchId) &&
      lot.status !== 'depleted'
    ).sort((a, b) => {
      // Sort by expiry (FEFO)
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    });
  }

  // ============================================
  // 🔄 NOSTR SYNC
  // ============================================

  const nostrData = useNostrData();
  const offline = useOffline();
  const syncPending = ref(0);

  // Nostr Event Kinds for Stock Lots
  const NOSTR_KINDS = {
    STOCK_LOT: 37001, // Business: Stock Lots/Batches
    STOCK_RECEIPT: 37002, // Business: Stock Receipts
    LOT_MOVEMENT: 37003, // Business: Lot Movements
  };

  async function syncStockLotToNostr(lot: StockLot): Promise<boolean> {
    try {
      const event = await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.STOCK_LOT,
        JSON.stringify({
          id: lot.id,
          productId: lot.productId,
          branchId: lot.branchId,
          lotNumber: lot.lotNumber,
          batchCode: lot.batchCode,
          initialQuantity: lot.initialQuantity,
          currentQuantity: lot.currentQuantity,
          reservedQuantity: lot.reservedQuantity,
          manufacturingDate: lot.manufacturingDate,
          expiryDate: lot.expiryDate,
          receivedDate: lot.receivedDate,
          status: lot.status,
          positionId: lot.positionId,
          positionCode: lot.positionCode,
          supplierId: lot.supplierId,
          supplierName: lot.supplierName,
          purchaseOrderId: lot.purchaseOrderId,
          costPrice: lot.costPrice,
          totalCost: lot.totalCost,
          qualityGrade: lot.qualityGrade,
          notes: lot.notes,
          createdBy: lot.createdBy,
          createdAt: lot.createdAt,
          updatedAt: lot.updatedAt,
        }),
        lot.id // dTag
      );

      if (event) {
        await db.stockLots.update(lot.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to sync stock lot to Nostr:', e);
      return false;
    }
  }

  async function syncStockReceiptToNostr(receipt: StockReceipt): Promise<boolean> {
    try {
      const event = await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.STOCK_RECEIPT,
        JSON.stringify({
          id: receipt.id,
          branchId: receipt.branchId,
          supplierId: receipt.supplierId,
          supplierName: receipt.supplierName,
          purchaseOrderId: receipt.purchaseOrderId,
          receiptNumber: receipt.receiptNumber,
          receiptDate: receipt.receiptDate,
          status: receipt.status,
          items: receipt.items,
          notes: receipt.notes,
          receivedBy: receipt.receivedBy,
          createdAt: receipt.createdAt,
          updatedAt: receipt.updatedAt,
        }),
        receipt.id // dTag
      );

      if (event) {
        await db.stockReceipts.update(receipt.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to sync stock receipt to Nostr:', e);
      return false;
    }
  }

  async function syncLotMovementToNostr(movement: LotStockMovement): Promise<boolean> {
    try {
      const event = await nostrData.publishEvent(
        NOSTR_KINDS.LOT_MOVEMENT,
        JSON.stringify({
          id: movement.id,
          lotId: movement.lotId,
          productId: movement.productId,
          branchId: movement.branchId,
          type: movement.type,
          quantity: movement.quantity,
          referenceId: movement.referenceId,
          referenceType: movement.referenceType,
          notes: movement.notes,
          createdBy: movement.createdBy,
          createdAt: movement.createdAt,
        })
      );

      if (event) {
        await db.lotStockMovements.update(movement.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to sync lot movement to Nostr:', e);
      return false;
    }
  }

  async function syncPendingData(): Promise<{
    synced: number;
    failed: number;
  }> {
    let synced = 0;
    let failed = 0;

    if (!offline.isOnline.value) {
      return { synced, failed };
    }

    try {
      // Sync unsynced stock lots
      const unsyncedLots = await db.stockLots.filter((l) => !l.synced).toArray();
      for (const lotRecord of unsyncedLots) {
        const lot: StockLot = {
          id: lotRecord.id,
          productId: lotRecord.productId,
          branchId: lotRecord.branchId,
          lotNumber: lotRecord.lotNumber,
          batchCode: lotRecord.batchCode,
          initialQuantity: lotRecord.initialQuantity,
          currentQuantity: lotRecord.currentQuantity,
          reservedQuantity: lotRecord.reservedQuantity,
          manufacturingDate: lotRecord.manufacturingDate ? new Date(lotRecord.manufacturingDate).toISOString() : undefined,
          expiryDate: lotRecord.expiryDate ? new Date(lotRecord.expiryDate).toISOString() : undefined,
          receivedDate: new Date(lotRecord.receivedDate).toISOString(),
          status: lotRecord.status as StockLot['status'],
          positionId: lotRecord.positionId,
          positionCode: lotRecord.positionCode,
          supplierId: lotRecord.supplierId,
          supplierName: lotRecord.supplierName,
          purchaseOrderId: lotRecord.purchaseOrderId,
          costPrice: lotRecord.costPrice,
          totalCost: lotRecord.totalCost,
          qualityGrade: lotRecord.qualityGrade as StockLot['qualityGrade'],
          notes: lotRecord.notes,
          createdBy: lotRecord.createdBy,
          createdAt: new Date(lotRecord.createdAt).toISOString(),
          updatedAt: new Date(lotRecord.updatedAt).toISOString(),
        };
        const success = await syncStockLotToNostr(lot);
        if (success) synced++;
        else failed++;
      }

      // Sync unsynced receipts
      const unsyncedReceipts = await db.stockReceipts.filter((r) => !r.synced).toArray();
      for (const receiptRecord of unsyncedReceipts) {
        const receipt: StockReceipt = {
          id: receiptRecord.id,
          branchId: receiptRecord.branchId,
          supplierId: receiptRecord.supplierId,
          supplierName: receiptRecord.supplierName,
          purchaseOrderId: receiptRecord.purchaseOrderId,
          receiptNumber: receiptRecord.receiptNumber,
          receiptDate: new Date(receiptRecord.receiptDate).toISOString(),
          status: receiptRecord.status as StockReceipt['status'],
          items: JSON.parse(receiptRecord.itemsJson),
          notes: receiptRecord.notes,
          receivedBy: receiptRecord.receivedBy,
          createdAt: new Date(receiptRecord.createdAt).toISOString(),
          updatedAt: new Date(receiptRecord.updatedAt).toISOString(),
        };
        const success = await syncStockReceiptToNostr(receipt);
        if (success) synced++;
        else failed++;
      }

      // Sync unsynced movements
      const unsyncedMovements = await db.lotStockMovements.filter((m) => !m.synced).toArray();
      for (const movementRecord of unsyncedMovements) {
        const movement: LotStockMovement = {
          id: movementRecord.id,
          lotId: movementRecord.lotId,
          productId: movementRecord.productId,
          branchId: movementRecord.branchId,
          type: movementRecord.type as LotStockMovement['type'],
          quantity: movementRecord.quantity,
          referenceId: movementRecord.referenceId,
          referenceType: movementRecord.referenceType,
          notes: movementRecord.notes,
          createdBy: movementRecord.createdBy,
          createdAt: new Date(movementRecord.createdAt).toISOString(),
        };
        const success = await syncLotMovementToNostr(movement);
        if (success) synced++;
        else failed++;
      }

      syncPending.value = failed;
    } catch (e) {
      console.error('Failed to sync pending stock lots:', e);
    }

    return { synced, failed };
  }

  return {
    // State
    stockLots,
    storagePositions,
    stockReceipts,
    expiryAlerts,
    expiryConfig,
    isLoading,
    error,
    isInitialized,
    syncPending,
    // Computed
    expiringLots,
    expiredLots,
    availableLots,
    summary,
    // Operations
    init,
    createStockLot,
    consumeStock,
    transferLotPosition,
    quarantineLot,
    createPosition,
    getPositionsByBranch,
    createStockReceipt,
    checkExpiryAlerts,
    acknowledgeAlert,
    getLotsForProduct,
    // Utilities
    loadStockLots,
    loadStoragePositions,
    // Sync
    syncPendingData,
  };
}
