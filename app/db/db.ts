// db.ts
// 🗄️ IndexedDB Database for Offline-First POS
import Dexie from "dexie";
import type { Table } from "dexie";
import type { IngredientUnit } from "~/types";

// ============================================
// Database Types
// ============================================

export interface NostrEvent {
  id: string;
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string; // AES-encrypted JSON string
  sig: string;
  synced?: boolean;
}

export interface MetaEntry {
  id: string;
  type: "category" | "unit" | "term";
  name: string;
  description?: string;
  symbol?: string;
  days?: number;
  notes?: string;
  created_at: number;
}

export interface PendingSync {
  id?: number;
  event: NostrEvent;
  status: "pending" | "error" | "synced";
  lastAttempt?: number;
}

// New: Offline Payments
export interface OfflinePaymentRecord {
  id: string;
  orderId: string;
  paymentHash: string;
  preimage: string;
  amount: number;
  method: string;
  createdAt: number;
  syncStatus: "pending" | "synced" | "failed";
  syncAttempts: number;
  orderData: string; // JSON string of order
}

// Note: LoyaltyMemberRecord is deprecated - use CustomerRecord instead
// CustomerRecord includes all loyalty features (points, tiers, etc.)

// New: Local Orders (for offline support)
export interface LocalOrder {
  id: string;
  data: string; // JSON string of full order
  status: string;
  paymentMethod: string;
  total: number;
  totalSats: number;
  createdAt: number;
  syncedAt?: number;
  nostrEventId?: string;
}

// New: Exchange Rates Cache
export interface ExchangeRateCache {
  id: string; // e.g., "BTC-USD"
  from: string;
  to: string;
  rate: number;
  source: string;
  updatedAt: number;
}

// New: POS Sessions
export interface POSSessionRecord {
  id: string;
  branchId: string;
  staffId: string;
  startedAt: number;
  endedAt?: number;
  openingBalance: number;
  closingBalance?: number;
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  lightningSales: number;
  status: "active" | "closed";
}

// NEW: Products (local cache)
export interface ProductRecord {
  id: string;
  data: string; // JSON string of full product
  sku: string;
  barcode?: string; // EAN-13, UPC-A, Code128, QR code
  name: string;
  categoryId: string;
  status: string;
  price: number;
  stock: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Product Activity Logs (audit trail)
export interface ProductActivityLogRecord {
  id: string;
  productId: string;
  action:
  | "create"
  | "update"
  | "delete"
  | "price_change"
  | "stock_adjust"
  | "status_change"
  | "restore";
  userId: string;
  userName?: string;
  userRole?: string;
  timestamp: number;
  changesJson?: string; // JSON array of { field, oldValue, newValue }
  stockBefore?: number;
  stockAfter?: number;
  stockReason?: string;
  priceBefore?: number;
  priceAfter?: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Categories (local cache)
export interface CategoryRecord {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  stationId?: string; // Link to KDS Station
  nostrEventId?: string;
  synced: boolean;
}

// NEW: KDS Stations
export interface StationRecord {
  id: string;
  name: string;
  description?: string;
  printerId?: string;
  isDefault?: boolean;
  synced: boolean;
  nostrEventId?: string;
}

// NEW: Units (local cache)
export interface UnitRecord {
  id: string;
  name: string;
  symbol: string;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Customers (local cache)
export interface CustomerRecord {
  id: string;
  nostrPubkey: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  lud16?: string;
  tags?: string; // JSON string array
  points: number;
  tier: string;
  totalSpent: number;
  visitCount: number;
  lastVisit: number;
  joinedAt: number;
  notes?: string;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Stock Adjustments (for offline tracking)
export interface StockAdjustmentRecord {
  id: string;
  productId: string;
  previousStock: number;
  newStock: number;
  adjustment: number;
  reason: string;
  notes?: string;
  staffId: string;
  createdAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Branches
export interface BranchRecord {
  id: string;
  name: string;
  code: string;
  address?: string;
  nostrPubkey?: string;
  bolt12Offer?: string;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Staff/Users
export interface StaffRecord {
  id: string;
  name: string;
  email?: string;
  pin?: string;
  role: string;
  permissions: string; // JSON string
  branchId?: string;
  isActive: boolean;
  nostrPubkey?: string;
  avatar?: string;
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// ============================================
// 🧪 RECIPE & INGREDIENT DATABASE TYPES
// ============================================

// Ingredient (Raw Material)
export interface IngredientRecord {
  id: string;
  code: string;
  name: string;
  nameTh?: string;
  unit: IngredientUnit;
  baseUnit: IngredientUnit;
  conversionFactor: number;
  costPerBaseUnit: number;
  costPerUnit: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  supplierId?: string;
  categoryId?: string;
  storageType: "ambient" | "refrigerated" | "frozen";
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// Ingredient Category
export interface IngredientCategoryRecord {
  id: string;
  name: string;
  nameTh?: string;
  icon?: string;
  sortOrder: number;
  nostrEventId?: string;
  synced: boolean;
}

// Recipe
export interface RecipeRecord {
  id: string;
  productId: string;
  name: string;
  nameTh?: string;
  description?: string;
  servings: number;
  servingUnit: string;
  ingredientsJson: string; // JSON of RecipeIngredient[]
  stepsJson?: string; // JSON of RecipeStep[]
  totalIngredientCost: number;
  costPerServing: number;
  overheadCost: number;
  totalCostPerServing: number;
  sellingPrice: number;
  profitPerServing: number;
  profitMargin: number;
  prepTime: number;
  cookTime: number;
  difficulty: "easy" | "medium" | "hard";
  categoryId?: string;
  tagsJson?: string; // JSON of string[]
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// Ingredient Stock Adjustment
export interface IngredientStockAdjustmentRecord {
  id: string;
  ingredientId: string;
  type: "purchase" | "usage" | "waste" | "return" | "adjustment" | "count";
  previousStock: number;
  adjustment: number;
  newStock: number;
  unitCost?: number;
  totalCost?: number;
  reason: string;
  referenceId?: string;
  referenceType?: "order" | "purchase" | "production" | "manual";
  notes?: string;
  staffId: string;
  createdAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// Production Plan
export interface ProductionPlanRecord {
  id: string;
  date: string;
  itemsJson: string; // JSON of ProductionPlanItem[]
  totalIngredientCost: number;
  status: "planned" | "in-progress" | "completed" | "cancelled";
  notes?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// Low Stock Alert
export interface LowStockAlertRecord {
  id: string;
  ingredientId: string;
  currentStock: number;
  minStock: number;
  deficitAmount: number;
  suggestedPurchaseQty: number;
  estimatedCost: number;
  priority: "low" | "medium" | "high" | "critical";
  createdAt: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  synced: boolean;
}

// NEW: Suppliers
export interface SupplierRecord {
  id: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  bankAccount?: string;
  paymentTerms?: string; // e.g., "NET30", "COD"
  leadTimeDays?: number;
  notes?: string;
  productIds: string[]; // Products supplied
  status: "active" | "inactive";
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Branch Stock (multi-branch stock tracking)
export interface BranchStockRecord {
  id: string; // format: `${productId}_${branchId}`
  productId: string;
  branchId: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  reservedStock: number; // Stock reserved for pending orders
  lastRestocked?: number;
  lastCountedAt?: number;
  costPrice: number; // Cost can differ per branch
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// NEW: Purchase Orders
export interface PurchaseOrderRecord {
  id: string;
  supplierId: string;
  branchId: string;
  status:
  | "draft"
  | "pending"
  | "approved"
  | "ordered"
  | "partial"
  | "received"
  | "cancelled";
  items: string; // JSON array of { productId, quantity, unitPrice, receivedQty }
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  expectedDate?: number;
  receivedDate?: number;
  createdBy: string;
  approvedBy?: string;
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// ============================================
// 📦 STOCK LOT/BATCH TRACKING RECORDS
// FIFO/FEFO Inventory Management with Expiry
// ============================================

// Storage Position (warehouse location)
export interface StoragePositionRecord {
  id: string;
  branchId: string;
  zone: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  fullCode: string;
  description?: string;
  capacity?: number;
  storageType: "ambient" | "refrigerated" | "frozen" | "controlled";
  temperatureMin?: number;
  temperatureMax?: number;
  isActive: boolean;
  nostrEventId?: string;
  synced: boolean;
}

// Stock Lot/Batch Record
export interface StockLotRecord {
  id: string;
  productId: string;
  branchId: string;
  // Lot/Batch Information
  lotNumber: string;
  batchCode?: string;
  // Quantity Tracking
  initialQuantity: number;
  currentQuantity: number;
  reservedQuantity: number;
  // Expiry & Dates (stored as timestamps)
  manufacturingDate?: number;
  expiryDate?: number;
  bestBeforeDate?: number;
  receivedDate: number;
  // Status
  status:
  | "available"
  | "low"
  | "expiring"
  | "expired"
  | "quarantine"
  | "depleted";
  expiryAlertSent?: boolean;
  // Storage Location
  positionId?: string;
  positionCode?: string;
  // Supplier & Cost
  supplierId?: string;
  supplierName?: string;
  purchaseOrderId?: string;
  costPrice: number;
  totalCost: number;
  // Quality
  qualityGrade?: "A" | "B" | "C";
  qualityNotes?: string;
  inspectedAt?: number;
  inspectedBy?: string;
  // Metadata
  notes?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// Stock Receipt (Goods Received Note)
export interface StockReceiptRecord {
  id: string;
  branchId: string;
  supplierId?: string;
  supplierName?: string;
  purchaseOrderId?: string;
  receiptNumber: string;
  receiptDate: number;
  deliveryNote?: string;
  invoiceNumber?: string;
  itemsJson: string; // JSON array of StockReceiptItem
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  status:
  | "draft"
  | "pending_inspection"
  | "inspected"
  | "completed"
  | "rejected";
  inspectionNotes?: string;
  receivedBy: string;
  inspectedBy?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// Lot Stock Movement Record
export interface LotStockMovementRecord {
  id: string;
  lotId: string;
  productId: string;
  branchId: string;
  type:
  | "receipt"
  | "sale"
  | "transfer_in"
  | "transfer_out"
  | "adjustment"
  | "waste"
  | "return"
  | "production";
  quantity: number;
  previousQty: number;
  newQty: number;
  referenceType?:
  | "order"
  | "purchase_order"
  | "transfer"
  | "production"
  | "manual";
  referenceId?: string;
  reason: string;
  notes?: string;
  unitCost?: number;
  totalCost?: number;
  fromPositionId?: string;
  toPositionId?: string;
  createdBy: string;
  createdAt: number;
  nostrEventId?: string;
  synced: boolean;
}

// Expiry Alert Record
export interface ExpiryAlertRecord {
  id: string;
  lotId: string;
  productId: string;
  branchId: string;
  lotNumber: string;
  productName: string;
  currentQuantity: number;
  expiryDate: number;
  daysUntilExpiry: number;
  alertLevel: "warning" | "critical" | "urgent" | "expired";
  acknowledged: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  actionTaken?: string;
  createdAt: number;
}

// ============================================
// 📋 CYCLE COUNT RECORDS
// Scheduled Physical Inventory Counts
// ============================================

export interface CycleCountRecord {
  id: string;
  name: string;
  branchId: string;
  status:
  | "draft"
  | "in_progress"
  | "pending_review"
  | "completed"
  | "cancelled";
  scheduledDate: number;
  startedAt?: number;
  completedAt?: number;
  // Items to count (JSON array of CycleCountItem)
  itemsJson: string;
  // Count results
  totalItems: number;
  countedItems: number;
  varianceCount: number;
  varianceValue: number;
  // Approvals
  createdBy: string;
  countedBy?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

// ============================================
// 👥 EMPLOYEE RECORDS
// ============================================

export interface EmployeeRecord {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: string;
  department?: string;
  position?: string;
  branchId?: string;
  employmentType: string;
  salaryType: string;
  baseSalary: number;
  currency: string;
  hireDate: string;
  terminationDate?: string;
  bankAccount?: string;
  lightningAddress?: string;
  preferredPaymentMethod: string;
  annualLeaveBalance: number;
  sickLeaveBalance: number;
  personalLeaveBalance: number;
  canAccessPOS: boolean;
  pin?: string;
  // Staff Product Assignment
  assignedProductIds?: string; // JSON array of product IDs
  assignmentMode?: string; // 'all' | 'assigned' | 'category'
  assignedCategoryIds?: string; // JSON array of category IDs
  commissionEnabled: boolean;
  commissionRate?: number;
  npub?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  nostrEventId?: string;
  synced: boolean;
}

// ============================================
// 💰 ACCOUNTING RECORDS
// ============================================

export interface AccountRecord {
  id: string;
  code: string;
  name: string;
  nameLao?: string;
  type: string;
  category: string;
  description?: string;
  parentAccount?: string;
  isSystem: boolean;
  isActive: boolean;
  normalBalance: "debit" | "credit";
  currency: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
  nostrEventId?: string;
  synced: boolean;
}

export interface JournalEntryRecord {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference?: string;
  status: "draft" | "posted" | "voided";
  sourceType?: string;
  sourceId?: string;
  linesJson: string; // JSON array of lines
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  createdAt: string;
  postedAt?: string;
  updatedAt?: string;
  nostrEventId?: string;
  synced: boolean;
}

export interface ExpenseRecord {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  vendor?: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  receipt?: string;
  accountCode?: string;
  createdAt: string;
  updatedAt: string;
  nostrEventId?: string;
  synced: boolean;
}

// ============================================
// 💬 CHAT/MESSAGING RECORDS
// Employee Communication System
// ============================================

// Chat Message Record
export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  senderPubkey: string;
  senderName: string;
  senderAvatar?: string;
  recipientPubkey: string;
  content: string;
  timestamp: number;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  replyToId?: string;
  nostrEventId?: string;
  isEncrypted: boolean;
  synced: boolean;
  reactions?: string; // JSON serialized Map<string, MessageReaction[]>
}

// Chat Conversation Record
export interface ChatConversationRecord {
  id: string;
  type: "direct" | "channel" | "group";
  participantPubkeys: string; // JSON array
  participantNames: string; // JSON array
  groupName?: string;
  groupAvatar?: string;
  lastMessageContent: string;
  lastMessageTime: number;
  lastMessageSenderName: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isPrivate?: boolean;
  key?: string; // AES key for private channels
  // NEW: Shop/Team Context
  shopId?: string; // Filter by specific shop
  scope?: string; // 'shop' | 'company' | 'department'
  tags?: string; // JSON array of tags
  isReadOnly?: boolean; // For announcement channels
  memberPubkeys?: string; // JSON array of member pubkeys
  createdAt: number;
  updatedAt: number;
  deletedAt?: number; // Soft delete timestamp
}

// Deleted Conversations (to remember what was deleted)
export interface DeletedConversationRecord {
  id: string; // conversation ID
  deletedAt: number;
}

// ============================================
// 🎁 PROMOTIONS RECORD
// ============================================

export interface PromotionRecord {
  id: string;
  name: string;
  description?: string;
  type: string; // 'bogo' | 'discount' | 'bundle' | 'freebie' | 'tiered'
  status: string; // 'active' | 'inactive' | 'scheduled' | 'expired'

  // Scope
  scope?: string; // 'product' | 'category' | 'order'

  // Trigger
  triggerProductIds: string; // JSON array
  triggerQuantity: number;
  triggerCategoryIds?: string; // JSON array

  // Discount (for discount/tiered types)
  discountType?: string; // 'percentage' | 'fixed'
  discountValue?: number;
  tiers?: string; // JSON array of PromotionTier

  // Reward (for BOGO/freebie)
  rewardType: string;
  rewardProductIds: string; // JSON array
  rewardQuantity: number;
  rewardDiscount?: number;
  rewardPercentage?: number;

  // Conditions
  minOrderValue?: number;
  minQuantity?: number;
  customerTiers?: string; // JSON array
  firstOrderOnly?: boolean;
  maxItemsAffected?: number;

  // Time constraints
  startDate?: string;
  endDate?: string;
  daysOfWeek?: string; // JSON array of numbers
  startTime?: string;
  endTime?: string;

  // Usage limits
  maxUsesPerOrder?: number;
  maxUsesPerCustomer?: number;
  maxUsesTotal?: number;
  usageCount: number;

  // Stacking
  stackable?: boolean;
  excludePromotionIds?: string; // JSON array
  priority: number;

  // Display
  badgeText?: string;
  badgeColor?: string;
  highlightOnPOS?: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  nostrEventId?: string;
  synced: boolean;
}

// ============================================
// 💳 MEMBERSHIP RECORDS
// Membership Plans & Subscriptions
// ============================================

export interface MembershipPlanRecord {
  id: string;
  name: string;
  nameLao?: string;
  description?: string;
  duration: number; // days
  price: number;
  benefits: string; // JSON array
  benefitsLao?: string; // JSON array
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

export interface MembershipRecord {
  id: string;
  customerId: string;
  customerName: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "cancelled" | "suspended";
  checkInCount: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  nostrEventId?: string;
  synced: boolean;
}

export interface MembershipCheckInRecord {
  id: string;
  membershipId: string;
  customerId: string;
  customerName: string;
  timestamp: number;
  notes?: string;
  staffId?: string;
  nostrEventId?: string;
  synced: boolean;
}

// ============================================
// Database Class
// ============================================

export class POSDatabase extends Dexie {
  events!: Table<NostrEvent, string>;
  meta!: Table<MetaEntry, string>;
  pendingSync!: Table<PendingSync, number>;
  offlinePayments!: Table<OfflinePaymentRecord, string>;
  // Note: loyaltyMembers table is deprecated - use customers table instead
  localOrders!: Table<LocalOrder, string>;
  exchangeRates!: Table<ExchangeRateCache, string>;
  posSessions!: Table<POSSessionRecord, string>;
  // New tables
  products!: Table<ProductRecord, string>;
  categories!: Table<CategoryRecord, string>;
  units!: Table<UnitRecord, string>;
  customers!: Table<CustomerRecord, string>;
  stockAdjustments!: Table<StockAdjustmentRecord, string>;
  branches!: Table<BranchRecord, string>;
  staff!: Table<StaffRecord, string>;
  productActivityLogs!: Table<ProductActivityLogRecord, string>;
  // Recipe & Ingredient tables
  ingredients!: Table<IngredientRecord, string>;
  ingredientCategories!: Table<IngredientCategoryRecord, string>;
  recipes!: Table<RecipeRecord, string>;
  ingredientStockAdjustments!: Table<IngredientStockAdjustmentRecord, string>;
  productionPlans!: Table<ProductionPlanRecord, string>;
  lowStockAlerts!: Table<LowStockAlertRecord, string>;
  // Inventory & Supply Chain tables
  suppliers!: Table<SupplierRecord, string>;
  branchStock!: Table<BranchStockRecord, string>;
  purchaseOrders!: Table<PurchaseOrderRecord, string>;
  // Stock Lot/Batch Tracking tables
  storagePositions!: Table<StoragePositionRecord, string>;
  stockLots!: Table<StockLotRecord, string>;
  stockReceipts!: Table<StockReceiptRecord, string>;
  lotStockMovements!: Table<LotStockMovementRecord, string>;
  expiryAlerts!: Table<ExpiryAlertRecord, string>;
  // Cycle Counting tables
  cycleCounts!: Table<CycleCountRecord, string>;

  // Accounting tables
  accounts!: Table<AccountRecord, string>;
  journalEntries!: Table<JournalEntryRecord, string>;
  expenses!: Table<ExpenseRecord, string>;

  // Employee & Payroll tables
  employees!: Table<EmployeeRecord, string>;

  // Chat/Messaging tables
  chatMessages!: Table<ChatMessageRecord, string>;
  chatConversations!: Table<ChatConversationRecord, string>;

  // Promotions table
  promotions!: Table<PromotionRecord, string>;

  // Membership tables
  membershipPlans!: Table<MembershipPlanRecord, string>;
  memberships!: Table<MembershipRecord, string>;
  membershipCheckIns!: Table<MembershipCheckInRecord, string>;
  // New: Version 16
  stations!: Table<StationRecord, string>;

  constructor() {
    super("POSDatabase");

    this.version(1).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
    });

    // Version 2: Add new tables for futuristic POS (deprecated loyaltyMembers - use customers instead)
    this.version(2).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
    });

    // Version 3: Full product & order management
    this.version(3).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      // New in v3
      products:
        "id, sku, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
    });

    // Version 4: Recipe & Ingredient Management System
    this.version(4).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products:
        "id, sku, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      // New in v4 - Recipe & Ingredients
      ingredients:
        "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments:
        "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
    });

    // Version 5: Multi-Branch Inventory & Supply Chain
    this.version(5).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products:
        "id, sku, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, branchId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      ingredients:
        "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments:
        "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
      // New in v5 - Supply Chain & Multi-Branch
      suppliers: "id, name, code, status, synced, updatedAt",
      branchStock: "id, productId, branchId, currentStock, synced, updatedAt",
      purchaseOrders: "id, supplierId, branchId, status, createdAt, synced",
    });

    // Version 6: Stock Lot/Batch Tracking with Expiry Management
    this.version(6).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products:
        "id, sku, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, branchId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      ingredients:
        "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments:
        "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
      suppliers: "id, name, code, status, synced, updatedAt",
      branchStock: "id, productId, branchId, currentStock, synced, updatedAt",
      purchaseOrders: "id, supplierId, branchId, status, createdAt, synced",
      // New in v6 - Stock Lot/Batch Tracking
      storagePositions:
        "id, branchId, zone, fullCode, storageType, isActive, synced",
      stockLots:
        "id, productId, branchId, lotNumber, status, expiryDate, positionId, supplierId, receivedDate, currentQuantity, synced, updatedAt",
      stockReceipts:
        "id, branchId, supplierId, purchaseOrderId, receiptNumber, status, receiptDate, synced",
      lotStockMovements:
        "id, lotId, productId, branchId, type, referenceId, createdAt, synced",
      expiryAlerts:
        "id, lotId, productId, branchId, alertLevel, expiryDate, acknowledged, createdAt",
    });

    // Version 7: Product Activity Logs & Barcode Support
    this.version(7).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products:
        "id, sku, barcode, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, branchId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      ingredients:
        "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments:
        "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
      suppliers: "id, name, code, status, synced, updatedAt",
      branchStock: "id, productId, branchId, currentStock, synced, updatedAt",
      purchaseOrders: "id, supplierId, branchId, status, createdAt, synced",
      storagePositions:
        "id, branchId, zone, fullCode, storageType, isActive, synced",
      stockLots:
        "id, productId, branchId, lotNumber, status, expiryDate, positionId, supplierId, receivedDate, currentQuantity, synced, updatedAt",
      stockReceipts:
        "id, branchId, supplierId, purchaseOrderId, receiptNumber, status, receiptDate, synced",
      lotStockMovements:
        "id, lotId, productId, branchId, type, referenceId, createdAt, synced",
      expiryAlerts:
        "id, lotId, productId, branchId, alertLevel, expiryDate, acknowledged, createdAt",
      // New in v7 - Product Activity Logs
      productActivityLogs:
        "id, productId, action, userId, timestamp, referenceType, referenceId, synced",
    });

    // Version 8: Cycle Counting for Physical Inventory
    this.version(8).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products:
        "id, sku, barcode, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, branchId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      ingredients:
        "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments:
        "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
      suppliers: "id, name, code, status, synced, updatedAt",
      branchStock: "id, productId, branchId, currentStock, synced, updatedAt",
      purchaseOrders: "id, supplierId, branchId, status, createdAt, synced",
      storagePositions:
        "id, branchId, zone, fullCode, storageType, isActive, synced",
      stockLots:
        "id, productId, branchId, lotNumber, status, expiryDate, positionId, supplierId, receivedDate, currentQuantity, synced, updatedAt",
      stockReceipts:
        "id, branchId, supplierId, purchaseOrderId, receiptNumber, status, receiptDate, synced",
      lotStockMovements:
        "id, lotId, productId, branchId, type, referenceId, createdAt, synced",
      expiryAlerts:
        "id, lotId, productId, branchId, alertLevel, expiryDate, acknowledged, createdAt",
      productActivityLogs:
        "id, productId, action, userId, timestamp, referenceType, referenceId, synced",
      // New in v8 - Cycle Counting
      cycleCounts:
        "id, branchId, status, scheduledDate, createdBy, completedAt, synced, updatedAt",
    });

    // Version 9: Accounting & Expenses
    this.version(9).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products:
        "id, sku, barcode, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, branchId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      ingredients:
        "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments:
        "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
      suppliers: "id, name, code, status, synced, updatedAt",
      branchStock: "id, productId, branchId, currentStock, synced, updatedAt",
      purchaseOrders: "id, supplierId, branchId, status, createdAt, synced",
      storagePositions:
        "id, branchId, zone, fullCode, storageType, isActive, synced",
      stockLots:
        "id, productId, branchId, lotNumber, status, expiryDate, positionId, supplierId, receivedDate, currentQuantity, synced, updatedAt",
      stockReceipts:
        "id, branchId, supplierId, purchaseOrderId, receiptNumber, status, receiptDate, synced",
      lotStockMovements:
        "id, lotId, productId, branchId, type, referenceId, createdAt, synced",
      expiryAlerts:
        "id, lotId, productId, branchId, alertLevel, expiryDate, acknowledged, createdAt",
      productActivityLogs:
        "id, productId, action, userId, timestamp, referenceType, referenceId, synced",
      cycleCounts:
        "id, branchId, status, scheduledDate, createdBy, completedAt, synced, updatedAt",
      // New in v9
      accounts: "id, code, name, type, category, isActive, synced, updatedAt",
      journalEntries: "id, entryNumber, date, status, synced, createdAt",
      expenses: "id, date, category, vendor, paymentMethod, synced, updatedAt",
    });

    // Version 10: Employee & Payroll Management
    this.version(10).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products:
        "id, sku, barcode, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, branchId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      ingredients:
        "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments:
        "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
      suppliers: "id, name, code, status, synced, updatedAt",
      branchStock: "id, productId, branchId, currentStock, synced, updatedAt",
      purchaseOrders: "id, supplierId, branchId, status, createdAt, synced",
      storagePositions:
        "id, branchId, zone, fullCode, storageType, isActive, synced",
      stockLots:
        "id, productId, branchId, lotNumber, status, expiryDate, positionId, supplierId, receivedDate, currentQuantity, synced, updatedAt",
      stockReceipts:
        "id, branchId, supplierId, purchaseOrderId, receiptNumber, status, receiptDate, synced",
      lotStockMovements:
        "id, lotId, productId, branchId, type, referenceId, createdAt, synced",
      expiryAlerts:
        "id, lotId, productId, branchId, alertLevel, expiryDate, acknowledged, createdAt",
      productActivityLogs:
        "id, productId, action, userId, timestamp, referenceType, referenceId, synced",
      cycleCounts:
        "id, branchId, status, scheduledDate, createdBy, completedAt, synced, updatedAt",
      accounts: "id, code, name, type, category, isActive, synced, updatedAt",
      journalEntries: "id, entryNumber, date, status, synced, createdAt",
      expenses: "id, date, category, vendor, paymentMethod, synced, updatedAt",
      // New in v10 - Employee & Payroll
      employees:
        "id, employeeCode, firstName, lastName, status, branchId, department, position, synced, updatedAt",
    });

    // Version 11: Chat/Messaging System
    this.version(11).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products:
        "id, sku, barcode, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, branchId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      ingredients:
        "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments:
        "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
      suppliers: "id, name, code, status, synced, updatedAt",
      branchStock: "id, productId, branchId, currentStock, synced, updatedAt",
      purchaseOrders: "id, supplierId, branchId, status, createdAt, synced",
      storagePositions:
        "id, branchId, zone, fullCode, storageType, isActive, synced",
      stockLots:
        "id, productId, branchId, lotNumber, status, expiryDate, positionId, supplierId, receivedDate, currentQuantity, synced, updatedAt",
      stockReceipts:
        "id, branchId, supplierId, purchaseOrderId, receiptNumber, status, receiptDate, synced",
      lotStockMovements:
        "id, lotId, productId, branchId, type, referenceId, createdAt, synced",
      expiryAlerts:
        "id, lotId, productId, branchId, alertLevel, expiryDate, acknowledged, createdAt",
      productActivityLogs:
        "id, productId, action, userId, timestamp, referenceType, referenceId, synced",
      cycleCounts:
        "id, branchId, status, scheduledDate, createdBy, completedAt, synced, updatedAt",
      accounts: "id, code, name, type, category, isActive, synced, updatedAt",
      journalEntries: "id, entryNumber, date, status, synced, createdAt",
      expenses: "id, date, category, vendor, paymentMethod, synced, updatedAt",
      employees:
        "id, employeeCode, firstName, lastName, status, branchId, department, position, synced, updatedAt",
      // New in v11 - Chat/Messaging
      chatMessages:
        "id, conversationId, senderPubkey, recipientPubkey, timestamp, status, synced",
      chatConversations:
        "id, type, lastMessageTime, unreadCount, isPinned, updatedAt",
    });
    // Version 12: Add index for nostrEventId in chatMessages
    this.version(12).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products:
        "id, sku, barcode, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, branchId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      ingredients:
        "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments:
        "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
      suppliers: "id, name, code, status, synced, updatedAt",
      branchStock: "id, productId, branchId, currentStock, synced, updatedAt",
      purchaseOrders: "id, supplierId, branchId, status, createdAt, synced",
      storagePositions:
        "id, branchId, zone, fullCode, storageType, isActive, synced",
      stockLots:
        "id, productId, branchId, lotNumber, status, expiryDate, positionId, supplierId, receivedDate, currentQuantity, synced, updatedAt",
      stockReceipts:
        "id, branchId, supplierId, purchaseOrderId, receiptNumber, status, receiptDate, synced",
      lotStockMovements:
        "id, lotId, productId, branchId, type, referenceId, createdAt, synced",
      expiryAlerts:
        "id, lotId, productId, branchId, alertLevel, expiryDate, acknowledged, createdAt",
      productActivityLogs:
        "id, productId, action, userId, timestamp, referenceType, referenceId, synced",
      cycleCounts:
        "id, branchId, status, scheduledDate, createdBy, completedAt, synced, updatedAt",
      accounts: "id, code, name, type, category, isActive, synced, updatedAt",
      journalEntries: "id, entryNumber, date, status, synced, createdAt",
      expenses: "id, date, category, vendor, paymentMethod, synced, updatedAt",
      employees:
        "id, employeeCode, firstName, lastName, status, branchId, department, position, synced, updatedAt",
      chatMessages:
        "id, conversationId, senderPubkey, recipientPubkey, timestamp, status, nostrEventId, synced",
      chatConversations:
        "id, type, lastMessageTime, unreadCount, isPinned, updatedAt",
    });
    // Version 13: Add private channel support
    this.version(13).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products:
        "id, sku, barcode, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, branchId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      ingredients:
        "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments:
        "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
      suppliers: "id, name, code, status, synced, updatedAt",
      branchStock: "id, productId, branchId, currentStock, synced, updatedAt",
      purchaseOrders: "id, supplierId, branchId, status, createdAt, synced",
      storagePositions:
        "id, branchId, zone, fullCode, storageType, isActive, synced",
      stockLots:
        "id, productId, branchId, lotNumber, status, expiryDate, positionId, supplierId, receivedDate, currentQuantity, synced, updatedAt",
      stockReceipts:
        "id, branchId, supplierId, purchaseOrderId, receiptNumber, status, receiptDate, synced",
      lotStockMovements:
        "id, lotId, productId, branchId, type, referenceId, createdAt, synced",
      expiryAlerts:
        "id, lotId, productId, branchId, alertLevel, expiryDate, acknowledged, createdAt",
      productActivityLogs:
        "id, productId, action, userId, timestamp, referenceType, referenceId, synced",
      cycleCounts:
        "id, branchId, status, scheduledDate, createdBy, completedAt, synced, updatedAt",
      accounts: "id, code, name, type, category, isActive, synced, updatedAt",
      journalEntries: "id, entryNumber, date, status, synced, createdAt",
      expenses: "id, date, category, vendor, paymentMethod, synced, updatedAt",
      employees:
        "id, employeeCode, firstName, lastName, status, branchId, department, position, synced, updatedAt",
      chatMessages:
        "id, conversationId, senderPubkey, recipientPubkey, timestamp, status, nostrEventId, synced",
      chatConversations:
        "id, type, lastMessageTime, unreadCount, isPinned, isPrivate, updatedAt",
    });

    // Version 14: Promotions (BOGO, Discounts, Bundles)
    this.version(14).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products:
        "id, sku, barcode, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, branchId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      ingredients:
        "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments:
        "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
      suppliers: "id, name, code, status, synced, updatedAt",
      branchStock: "id, productId, branchId, currentStock, synced, updatedAt",
      purchaseOrders: "id, supplierId, branchId, status, createdAt, synced",
      storagePositions:
        "id, branchId, zone, fullCode, storageType, isActive, synced",
      stockLots:
        "id, productId, branchId, lotNumber, status, expiryDate, positionId, supplierId, receivedDate, currentQuantity, synced, updatedAt",
      stockReceipts:
        "id, branchId, supplierId, purchaseOrderId, receiptNumber, status, receiptDate, synced",
      lotStockMovements:
        "id, lotId, productId, branchId, type, referenceId, createdAt, synced",
      expiryAlerts:
        "id, lotId, productId, branchId, alertLevel, expiryDate, acknowledged, createdAt",
      productActivityLogs:
        "id, productId, action, userId, timestamp, referenceType, referenceId, synced",
      cycleCounts:
        "id, branchId, status, scheduledDate, createdBy, completedAt, synced, updatedAt",
      accounts: "id, code, name, type, category, isActive, synced, updatedAt",
      journalEntries: "id, entryNumber, date, status, synced, createdAt",
      expenses: "id, date, category, vendor, paymentMethod, synced, updatedAt",
      employees:
        "id, employeeCode, firstName, lastName, status, branchId, department, position, synced, updatedAt",
      chatMessages:
        "id, conversationId, senderPubkey, recipientPubkey, timestamp, status, nostrEventId, synced",
      chatConversations:
        "id, type, lastMessageTime, unreadCount, isPinned, isPrivate, updatedAt",
      // NEW: Promotions
      promotions:
        "id, name, type, status, startDate, endDate, priority, usageCount, synced, updatedAt",
    });

    // Version 15: Membership Plans & Subscriptions
    this.version(15).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products:
        "id, sku, barcode, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, branchId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      ingredients:
        "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments:
        "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
      suppliers: "id, name, code, status, synced, updatedAt",
      branchStock: "id, productId, branchId, currentStock, synced, updatedAt",
      purchaseOrders: "id, supplierId, branchId, status, createdAt, synced",
      storagePositions:
        "id, branchId, zone, fullCode, storageType, isActive, synced",
      stockLots:
        "id, productId, branchId, lotNumber, status, expiryDate, positionId, supplierId, receivedDate, currentQuantity, synced, updatedAt",
      stockReceipts:
        "id, branchId, supplierId, purchaseOrderId, receiptNumber, status, receiptDate, synced",
      lotStockMovements:
        "id, lotId, productId, branchId, type, referenceId, createdAt, synced",
      expiryAlerts:
        "id, lotId, productId, branchId, alertLevel, expiryDate, acknowledged, createdAt",
      productActivityLogs:
        "id, productId, action, userId, timestamp, referenceType, referenceId, synced",
      cycleCounts:
        "id, branchId, status, scheduledDate, createdBy, completedAt, synced, updatedAt",
      accounts: "id, code, name, type, category, isActive, synced, updatedAt",
      journalEntries: "id, entryNumber, date, status, synced, createdAt",
      expenses: "id, date, category, vendor, paymentMethod, synced, updatedAt",
      employees:
        "id, employeeCode, firstName, lastName, status, branchId, department, position, synced, updatedAt",
      chatMessages:
        "id, conversationId, senderPubkey, recipientPubkey, timestamp, status, nostrEventId, synced",
      chatConversations:
        "id, type, lastMessageTime, unreadCount, isPinned, isPrivate, updatedAt, deletedAt",
      deletedConversations: "id, deletedAt",
      promotions:
        "id, name, type, status, startDate, endDate, priority, usageCount, synced, updatedAt",
      // NEW: Membership tables
      membershipPlans:
        "id, name, duration, price, isActive, sortOrder, synced, updatedAt",
      memberships:
        "id, customerId, planId, status, startDate, endDate, checkInCount, synced, updatedAt",
      membershipCheckIns:
        "id, membershipId, customerId, timestamp, staffId, synced",
    });

    // Version 16: KDS Stations
    this.version(16).stores({
      events: "id, kind, created_at, pubkey",
      meta: "id, type",
      pendingSync: "++id, status",
      offlinePayments: "id, orderId, syncStatus, createdAt",
      localOrders: "id, status, paymentMethod, createdAt, syncedAt",
      exchangeRates: "id, updatedAt",
      posSessions: "id, branchId, staffId, status, startedAt",
      products:
        "id, sku, barcode, name, categoryId, status, price, stock, updatedAt, synced",
      categories: "id, name, sortOrder, synced",
      units: "id, name, symbol, synced",
      customers:
        "id, nostrPubkey, name, phone, tier, points, lastVisit, synced",
      stockAdjustments: "id, productId, branchId, reason, createdAt, synced",
      branches: "id, name, code, synced",
      staff: "id, name, role, branchId, isActive, synced",
      ingredients:
        "id, code, name, categoryId, currentStock, minStock, isActive, synced, updatedAt",
      ingredientCategories: "id, name, sortOrder, synced",
      recipes: "id, productId, name, categoryId, isActive, synced, updatedAt",
      ingredientStockAdjustments:
        "id, ingredientId, type, referenceId, createdAt, synced",
      productionPlans: "id, date, status, createdAt, synced",
      lowStockAlerts: "id, ingredientId, priority, createdAt, acknowledgedAt",
      suppliers: "id, name, code, status, synced, updatedAt",
      branchStock: "id, productId, branchId, currentStock, synced, updatedAt",
      purchaseOrders: "id, supplierId, branchId, status, createdAt, synced",
      storagePositions:
        "id, branchId, zone, fullCode, storageType, isActive, synced",
      stockLots:
        "id, productId, branchId, lotNumber, status, expiryDate, positionId, supplierId, receivedDate, currentQuantity, synced, updatedAt",
      stockReceipts:
        "id, branchId, supplierId, purchaseOrderId, receiptNumber, status, receiptDate, synced",
      lotStockMovements:
        "id, lotId, productId, branchId, type, referenceId, createdAt, synced",
      expiryAlerts:
        "id, lotId, productId, branchId, alertLevel, expiryDate, acknowledged, createdAt",
      productActivityLogs:
        "id, productId, action, userId, timestamp, referenceType, referenceId, synced",
      cycleCounts:
        "id, branchId, status, scheduledDate, createdBy, completedAt, synced, updatedAt",
      accounts: "id, code, name, type, category, isActive, synced, updatedAt",
      journalEntries: "id, entryNumber, date, status, synced, createdAt",
      expenses: "id, date, category, vendor, paymentMethod, synced, updatedAt",
      employees:
        "id, employeeCode, firstName, lastName, status, branchId, department, position, synced, updatedAt",
      chatMessages:
        "id, conversationId, senderPubkey, recipientPubkey, timestamp, status, nostrEventId, synced",
      chatConversations:
        "id, type, lastMessageTime, unreadCount, isPinned, isPrivate, updatedAt, deletedAt",
      deletedConversations: "id, deletedAt",
      promotions:
        "id, name, type, status, startDate, endDate, priority, usageCount, synced, updatedAt",
      membershipPlans:
        "id, name, duration, price, isActive, sortOrder, synced, updatedAt",
      memberships:
        "id, customerId, planId, status, startDate, endDate, checkInCount, synced, updatedAt",
      membershipCheckIns:
        "id, membershipId, customerId, timestamp, staffId, synced",
      // New: Version 16
      stations: "id, name, isDefault, synced",
    });
  }
}

export const db = new POSDatabase();
