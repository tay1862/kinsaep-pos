// ============================================
// 🚀 bnos.space - FUTURISTIC TYPE SYSTEM
// Lightning + Nostr + Decentralised Commerce
// ============================================
//
// 🆔 USER IDENTIFICATION PATTERN:
// All CRUD operations use npub (Nostr public key) for user identification
// instead of traditional user_id. This provides:
// - Decentralized identity (no central authority)
// - Privacy (no PII required)
// - Portability (works across relays and platforms)
// - Consistency (same identity everywhere)
//
// Use: useUserIdentifier().getCurrentUserIdentifier()
// Returns: npub1... (preferred) or fallback to legacy ID
// Fields: createdBy, updatedBy, userId, etc.
// ============================================

import type { NOSTR_KINDS } from "./nostr-kinds";

// ============================================
// 🏪 SHOP CONFIGURATION TYPES
// Visibility, Type & Templates for Easy Setup
// ============================================

/**
 * Shop visibility - determines if discoverable in marketplace
 */
export type ShopVisibility = "private" | "public";

/**
 * Shop type categories with associated product templates
 */
export type ShopType =
  | "cafe"
  | "restaurant"
  | "retail"
  | "grocery"
  | "noodles"
  | "service"
  | "pharmacy"
  | "gym"
  | "karaoke"
  | "garage"
  | "dry_clean"
  | "car_care"
  | "enterprise"
  | "other";

/**
 * Shop type metadata for UI display
 */
export interface ShopTypeMeta {
  type: ShopType;
  name: string;
  nameLao: string;
  icon: string;
  description: string;
  descriptionLao: string;
}

/**
 * Category template for quick store setup
 */
export interface CategoryTemplate {
  id: string;
  name: string;
  nameLao?: string;
  icon?: string;
  sortOrder: number;
}

/**
 * Product template for quick store setup
 */
export interface ProductTemplate {
  id: string;
  name: string;
  nameLao?: string;
  description?: string;
  categoryId: string;
  price: number;
  image?: string;
}

/**
 * Complete shop type configuration with templates
 */
export interface ShopTypeConfig {
  type: ShopType;
  meta: ShopTypeMeta;
  categories: CategoryTemplate[];
  products: ProductTemplate[];
}

// ============================================
// 🛒 MARKETPLACE INTEGRATION TYPES
// Decentralized Store Discovery & Inter-Store Commerce
// ============================================

/**
 * Geolocation for store discovery
 */
export interface Geolocation {
  lat: number;
  lng: number;
  geohash?: string; // For proximity search (NIP-52)
  address?: string;
  city?: string;
  country?: string;
}

/**
 * Business operating hours
 */
export interface BusinessHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
  timezone: string;
  holidays?: string[]; // ISO dates when closed
}

/**
 * Public marketplace profile for store discovery
 * Published as Kind 30079 (STORE_PROFILE)
 */
export interface MarketplaceProfile {
  // Identity
  pubkey: string; // Store owner's pubkey
  nip05?: string; // Nostr verification (e.g., "shop@bnos.space")
  lud16?: string; // Lightning address for payments

  // Basic Info
  name: string;
  description?: string;
  logo?: string;
  coverImage?: string;

  // Classification
  shopType: ShopType;
  categories?: string[]; // Business categories for search
  tags?: string[]; // Keywords for discovery

  // Location
  geolocation?: Geolocation;

  // Contact
  phone?: string;
  email?: string;
  website?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    line?: string;
  };

  // Operations
  businessHours?: BusinessHours;
  services?: string[]; // e.g., "dine-in", "takeaway", "delivery"
  paymentMethods?: string[]; // e.g., "cash", "lightning", "card"
  acceptsLightning: boolean;
  acceptsBitcoin: boolean;

  // Marketplace Settings
  isListed: boolean; // Visible in marketplace
  joinedAt: string; // When store was first published
  updatedAt: string;

  // Stats (optional, updated periodically)
  totalOrders?: number;
  averageRating?: number;
  reviewCount?: number;
}

/**
 * Store-to-store connection/partnership
 * Published as Kind 30951 (STORE_CONNECTION)
 */
export interface StoreConnection {
  id: string;
  fromPubkey: string; // Initiating store
  toPubkey: string; // Target store
  type: "follow" | "partner" | "supplier" | "customer";
  status: "pending" | "accepted" | "rejected" | "blocked";
  note?: string;
  createdAt: string;
  acceptedAt?: string;
}

/**
 * Customer review for a store
 * Published as Kind 30955 (MARKETPLACE_REVIEW)
 */
export interface MarketplaceReview {
  id: string;
  storePubkey: string; // Store being reviewed
  customerPubkey: string; // Reviewer's pubkey
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  orderId?: string; // Optional link to order
  photos?: string[]; // Review photos
  helpful: number; // Helpful votes count
  verified: boolean; // Verified purchase
  createdAt: string;
  updatedAt?: string;
}

/**
 * Product listing for cross-store discovery
 * Published as Kind 30951 (MARKETPLACE_PRODUCT)
 */
export interface MarketplaceProduct {
  id: string;
  storePubkey: string; // Store offering the product
  storeName: string;

  // Product info
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  category: string;
  tags?: string[];

  // Pricing
  price: number;
  currency: string;
  compareAtPrice?: number; // Original price for sales

  // Availability
  inStock: boolean;
  quantity?: number;

  // Delivery options
  services?: string[]; // dine-in, takeaway, delivery
  deliveryRadius?: number; // km for delivery

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Cross-store order for multi-vendor marketplace
 * Published as Kind 30952 (MARKETPLACE_ORDER)
 */
export interface MarketplaceOrder {
  id: string;
  customerPubkey: string;

  // Multi-vendor items
  items: {
    storePubkey: string;
    productId: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];

  // Totals
  subtotal: number;
  deliveryFee?: number;
  tax?: number;
  total: number;
  currency: string;

  // Payment
  paymentMethod: "lightning" | "bitcoin" | "cash";
  paymentStatus: "pending" | "paid" | "refunded";

  // Delivery
  deliveryType: "pickup" | "delivery" | "dine-in";
  deliveryAddress?: string;

  // Status per store
  storeStatuses: {
    storePubkey: string;
    status:
    | "pending"
    | "accepted"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled";
    updatedAt: string;
  }[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Search filters for marketplace discovery
 */
export interface MarketplaceSearchFilters {
  query?: string;
  shopType?: ShopType;
  categories?: string[];
  tags?: string[];
  services?: string[]; // dine-in, takeaway, delivery
  acceptsLightning?: boolean;
  acceptsBitcoin?: boolean;
  geohash?: string; // For proximity search (NIP-52)
  maxDistance?: number; // km
  minRating?: number;
  sortBy?: "distance" | "rating" | "newest" | "name";
  limit?: number;
  offset?: number;
}

// ============================================
// 💳 MEMBERSHIP & SUBSCRIPTION TYPES
// For Gym, Clubs, and Subscription-Based Businesses
// ============================================

/**
 * Membership plan status
 */
export type MembershipStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "suspended"
  | "pending";

/**
 * Membership plan configuration
 */
export interface MembershipPlan {
  id: string;
  name: string;
  nameLao?: string;
  description?: string;
  descriptionLao?: string;
  duration: number; // days
  price: number;
  currency?: string;
  benefits: string[];
  benefitsLao?: string[];
  maxCheckIns?: number; // unlimited if not set
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Customer membership record
 */
export interface Membership {
  id: string;
  customerId: string;
  customerName?: string;
  planId: string;
  planName?: string;
  status: MembershipStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  checkInCount: number;
  lastCheckIn?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Check-in record for membership tracking
 */
export interface MembershipCheckIn {
  id: string;
  membershipId: string;
  customerId: string;
  checkInTime: string;
  checkOutTime?: string;
  notes?: string;
}

// ============================================
// 👥 EMPLOYEE & PAYROLL TYPES
// Enterprise HR, Time Tracking & Payroll
// ============================================

/**
 * Employment type classification
 */
export type EmploymentType =
  | "full-time"
  | "part-time"
  | "contract"
  | "intern"
  | "freelance";

/**
 * Employee status
 */
export type EmployeeStatus = "active" | "inactive" | "on-leave" | "terminated";

/**
 * Salary calculation method
 */
export type SalaryType = "hourly" | "daily" | "weekly" | "monthly";

/**
 * Attendance status for a day
 */
export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "leave"
  | "holiday"
  | "half-day";

/**
 * Leave type categories
 */
export type LeaveType =
  | "annual"
  | "sick"
  | "personal"
  | "maternity"
  | "paternity"
  | "unpaid"
  | "other";

/**
 * Payment method for payroll
 */
export type EmployeePaymentMethod = "cash" | "bank" | "lightning" | "check";

/**
 * Payment status
 */
export type EmployeePaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled";

/**
 * Employee profile with HR information
 */
export interface Employee {
  id: string;

  // Basic Info
  firstName: string;
  lastName: string;
  displayName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  nationalId?: string;

  // Address
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;

  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;

  // Employment Details
  employeeCode: string;
  department?: string;
  position?: string;
  employmentType: EmploymentType;
  hireDate: string;
  probationEndDate?: string;
  terminationDate?: string;
  terminationReason?: string;
  status: EmployeeStatus;
  branchId?: string;

  // Compensation
  salaryType: SalaryType;
  baseSalary: number;
  currency: string;
  overtimeRate?: number; // Multiplier (e.g., 1.5 for time-and-a-half)

  // Payment Info
  bankName?: string;
  bankAccount?: string;
  lightningAddress?: string;
  preferredPaymentMethod: EmployeePaymentMethod;

  // Deductions & Benefits
  socialSecurityNumber?: string;
  taxId?: string;
  insuranceNumber?: string;

  // Leave Balances
  annualLeaveBalance: number;
  sickLeaveBalance: number;
  personalLeaveBalance: number;

  // POS Access
  userId?: string;
  canAccessPOS: boolean;
  pin?: string;

  // Staff Product Assignment
  assignedProductIds?: string[]; // Product IDs this staff can sell (empty = all products)
  assignmentMode?: "all" | "assigned" | "category"; // How products are filtered
  assignedCategoryIds?: string[]; // Categories if mode = 'category'

  // Commission Settings
  commissionEnabled: boolean;
  commissionRate?: number; // Percentage of sales

  // Nostr Integration
  npub?: string;
  pubkeyHex?: string;

  // Access Control
  accessExpiresAt?: string; // When login access expires
  accessRevokedAt?: string; // If access was revoked
  accessRevokedReason?: string; // Why access was revoked

  // Metadata
  notes?: string;
  documents?: string[]; // URLs to uploaded documents
  createdAt: string;
  updatedAt: string;
}

/**
 * Daily attendance record
 */
export interface Attendance {
  id: string;
  employeeId: string;
  employeeName?: string;
  date: string;

  // Time Records
  clockIn?: string;
  clockInPhoto?: string;
  clockOut?: string;
  clockOutPhoto?: string;

  // Break Time
  breakStart?: string;
  breakEnd?: string;
  breakMinutes: number;

  // Calculated Hours
  scheduledHours?: number;
  workedHours: number;
  overtimeHours: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;

  // Status
  status: AttendanceStatus;
  leaveType?: LeaveType;

  // Location (if GPS tracking)
  clockInLocation?: { lat: number; lng: number };
  clockOutLocation?: { lat: number; lng: number };

  // Metadata
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Shift schedule assignment
 */
export interface Shift {
  id: string;
  employeeId: string;
  employeeName?: string;
  branchId?: string;

  // Schedule
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;

  // Details
  role?: string;
  color?: string;
  isPublished: boolean;

  // Swap/Cover
  originalEmployeeId?: string; // If shift was swapped
  swapRequestedAt?: string;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Leave request
 */
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;

  // Leave Details
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;

  // Approval
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  // Documents
  attachments?: string[];

  createdAt: string;
  updatedAt: string;
}

/**
 * Payroll run - batch processing for a pay period
 */
export interface PayrollRun {
  id: string;

  // Period
  periodStart: string;
  periodEnd: string;
  periodType: "weekly" | "bi-weekly" | "monthly";

  // Run Info
  runDate: string;
  runBy?: string;
  status:
  | "draft"
  | "calculating"
  | "review"
  | "approved"
  | "processing"
  | "completed"
  | "cancelled";

  // Totals
  employeeCount: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalCommissions: number;
  totalBonuses: number;
  currency: string;

  // Payment Breakdown
  cashPayments: number;
  bankPayments: number;
  lightningPayments: number;

  // Metadata
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual payslip for an employee
 */
export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;

  // Period
  periodStart: string;
  periodEnd: string;

  // Work Summary
  daysWorked: number;
  hoursWorked: number;
  overtimeHours: number;
  leaveDays: number;
  absentDays: number;

  // Earnings
  basePay: number;
  overtimePay: number;
  commission: number;
  tips: number;
  bonus: number;
  allowances: number;
  otherEarnings: number;
  grossPay: number;

  // Deductions
  incomeTax: number;
  socialSecurity: number;
  healthInsurance: number;
  loanRepayment: number;
  advances: number;
  otherDeductions: number;
  totalDeductions: number;

  // Net Pay
  netPay: number;
  currency: string;

  // Payment
  paymentMethod: EmployeePaymentMethod;
  paymentStatus: EmployeePaymentStatus;
  paymentReference?: string;
  paidAt?: string;

  // Lightning Payment
  lightningInvoice?: string;
  lightningPreimage?: string;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payroll deduction/addition template
 */
export interface PayrollItem {
  id: string;
  name: string;
  nameLao?: string;
  type: "earning" | "deduction";
  category:
  | "salary"
  | "overtime"
  | "commission"
  | "bonus"
  | "allowance"
  | "tax"
  | "insurance"
  | "loan"
  | "other";
  calculationType: "fixed" | "percentage" | "hourly" | "per-day";
  amount: number; // Fixed amount or percentage
  isDefault: boolean;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 🧪 RECIPE & INGREDIENT TYPES
// Cost Calculation + Stock Management
// ============================================

/**
 * Unit of measurement for ingredients
 */
export type IngredientUnit =
  | "g"
  | "kg"
  | "ml"
  | "l"
  | "piece"
  | "pack"
  | "tray"
  | "bottle"
  | "can"
  | "cup"
  | "tbsp"
  | "tsp";

/**
 * Raw ingredient/material used in recipes
 */
export interface Ingredient {
  id: string;
  code: string; // e.g., "F001", "C001"
  name: string;
  nameTh?: string; // Thai name (e.g., "แป้งเค้ก")
  unit: IngredientUnit;
  baseUnit: IngredientUnit; // Base unit for purchase (e.g., "kg")
  conversionFactor: number; // How many units in 1 base unit (e.g., 1000g = 1kg)
  costPerBaseUnit: number; // Cost per base unit (e.g., 40 THB/kg)
  costPerUnit: number; // Calculated: costPerBaseUnit / conversionFactor
  currentStock: number; // In base unit
  minStock: number; // Minimum stock level (in base unit)
  maxStock: number; // Maximum stock level (in base unit)
  supplierId?: string;
  lastPurchaseDate?: string;
  lastPurchasePrice?: number;
  categoryId?: string; // Ingredient category (e.g., "dry", "dairy", "fresh")
  expiryDays?: number; // Days until expiry
  storageType: "ambient" | "refrigerated" | "frozen";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Category for organizing ingredients
 */
export interface IngredientCategory {
  id: string;
  name: string;
  nameTh?: string;
  icon?: string;
  sortOrder: number;
}

/**
 * Ingredient used in a recipe
 */
export interface RecipeIngredient {
  ingredientId: string;
  ingredient?: Ingredient; // Populated reference
  quantity: number; // Amount needed
  unit: IngredientUnit; // Unit for this recipe
  cost: number; // Calculated cost for this quantity
  notes?: string; // e.g., "sifted", "room temperature"
}

/**
 * Production step in a recipe
 */
export interface RecipeStep {
  order: number;
  instruction: string;
  duration?: number; // Minutes
  temperature?: number; // Celsius
  notes?: string;
}

/**
 * Recipe for a menu item
 */
export interface Recipe {
  id: string;
  productId?: string; // Links to Product (optional - recipe can exist without product link)
  product?: Product; // Populated reference
  name: string;
  nameTh?: string;
  description?: string;
  servings: number; // How many portions this recipe makes (e.g., 8 slices for 1 pound cake)
  servingUnit: string; // e.g., "slice", "plate", "cup", "portion"
  ingredients: RecipeIngredient[];
  steps?: RecipeStep[];
  // Cost calculations
  totalIngredientCost: number; // Sum of all ingredient costs
  costPerServing: number; // totalIngredientCost / servings
  overheadCost: number; // Labor, utilities, etc.
  totalCostPerServing: number; // costPerServing + overhead allocation
  // Pricing
  sellingPrice: number; // Price per serving
  profitPerServing: number; // sellingPrice - totalCostPerServing
  profitMargin: number; // (profitPerServing / sellingPrice) * 100
  // Management
  prepTime: number; // Minutes
  cookTime: number; // Minutes
  difficulty: "easy" | "medium" | "hard";
  categoryId?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stock adjustment for ingredients
 */
export interface IngredientStockAdjustment {
  id: string;
  ingredientId: string;
  ingredient?: Ingredient;
  type: "purchase" | "usage" | "waste" | "return" | "adjustment" | "count";
  previousStock: number;
  adjustment: number; // Positive for increase, negative for decrease
  newStock: number;
  unitCost?: number; // Cost per unit at time of adjustment
  totalCost?: number; // Total cost of adjustment
  reason: string;
  referenceId?: string; // Order ID or Purchase ID
  referenceType?: "order" | "purchase" | "production" | "manual";
  notes?: string;
  staffId: string;
  createdAt: string;
}

/**
 * Low stock alert
 */
export interface LowStockAlert {
  id: string;
  ingredientId: string;
  ingredient: Ingredient;
  currentStock: number;
  minStock: number;
  deficitAmount: number;
  suggestedPurchaseQty: number;
  estimatedCost: number;
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

// ============================================
// 📦 STOCK LOT/BATCH TRACKING TYPES
// FIFO/FEFO Inventory Management with Expiry
// ============================================

/**
 * Storage location/position in warehouse
 */
export interface StoragePosition {
  id: string;
  branchId: string;
  zone: string; // e.g., "A", "B", "Cold Storage", "Freezer"
  rack?: string; // e.g., "R1", "R2"
  shelf?: string; // e.g., "S1", "S2"
  bin?: string; // e.g., "B01", "B02"
  fullCode: string; // Combined: "A-R1-S2-B01"
  description?: string;
  capacity?: number; // Optional capacity limit
  storageType: "ambient" | "refrigerated" | "frozen" | "controlled";
  temperature?: { min: number; max: number }; // Temperature range if applicable
  isActive: boolean;
}

/**
 * Stock Lot/Batch - Each received batch tracked separately
 * Enables FIFO (First In First Out) or FEFO (First Expired First Out)
 */
export interface StockLot {
  id: string;
  productId: string;
  product?: Product;
  branchId: string;
  // Lot/Batch Information
  lotNumber: string; // Supplier's batch number or internal
  batchCode?: string; // Internal batch code (auto-generated)
  // Quantity Tracking
  initialQuantity: number; // Original received quantity
  currentQuantity: number; // Current remaining quantity
  reservedQuantity: number; // Reserved for pending orders
  availableQuantity: number; // currentQuantity - reservedQuantity
  // Expiry & Dates
  manufacturingDate?: string; // When product was made
  expiryDate?: string; // Product expiration date
  bestBeforeDate?: string; // Best before (quality, not safety)
  receivedDate: string; // When received in warehouse
  // Status & Alerts
  status:
  | "available"
  | "low"
  | "expiring"
  | "expired"
  | "quarantine"
  | "depleted";
  daysUntilExpiry?: number; // Calculated field
  expiryAlertSent?: boolean;
  // Storage Location
  positionId?: string;
  position?: StoragePosition;
  positionCode?: string; // Quick reference: "A-R1-S2"
  // Supplier & Cost
  supplierId?: string;
  supplierName?: string;
  purchaseOrderId?: string;
  costPrice: number; // Cost per unit at time of receipt
  totalCost: number; // initialQuantity * costPrice
  // Quality
  qualityGrade?: "A" | "B" | "C";
  qualityNotes?: string;
  inspectedAt?: string;
  inspectedBy?: string;
  // Metadata
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stock Receipt/Goods Received - When receiving stock
 */
export interface StockReceipt {
  id: string;
  branchId: string;
  supplierId?: string;
  supplierName?: string;
  purchaseOrderId?: string;
  // Receipt Details
  receiptNumber: string; // GRN number (Goods Received Note)
  receiptDate: string;
  deliveryNote?: string;
  invoiceNumber?: string;
  // Items Received
  items: StockReceiptItem[];
  // Totals
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  // Status
  status:
  | "draft"
  | "pending_inspection"
  | "inspected"
  | "completed"
  | "rejected";
  inspectionNotes?: string;
  // Metadata
  receivedBy: string;
  inspectedBy?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual item in a stock receipt
 */
export interface StockReceiptItem {
  productId: string;
  productName: string;
  productSku: string;
  // Quantity
  orderedQty?: number; // From PO if linked
  receivedQty: number;
  acceptedQty: number; // After inspection
  rejectedQty: number;
  // Lot Details
  lotNumber: string;
  manufacturingDate?: string;
  expiryDate?: string;
  // Position
  positionId?: string;
  positionCode?: string;
  // Cost
  unitCost: number;
  totalCost: number;
  // Notes
  notes?: string;
  rejectionReason?: string;
}

/**
 * Expiry alert configuration
 */
export interface ExpiryAlertConfig {
  warningDays: number; // Alert when X days before expiry (e.g., 30)
  criticalDays: number; // Critical alert (e.g., 7)
  urgentDays: number; // Urgent/immediate action (e.g., 3)
  autoQuarantine: boolean; // Auto-quarantine expired items
  notifyEmail?: boolean;
  notifyPush?: boolean;
}

/**
 * Stock movement with lot tracking
 */
export interface LotStockMovement {
  id: string;
  lotId: string;
  lot?: StockLot;
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
  quantity: number; // Positive for in, negative for out
  previousQty: number;
  newQty: number;
  // Reference
  referenceType?:
  | "order"
  | "purchase_order"
  | "transfer"
  | "production"
  | "manual";
  referenceId?: string;
  reason: string;
  notes?: string;
  // Cost tracking
  unitCost?: number;
  totalCost?: number;
  // Position change
  fromPositionId?: string;
  toPositionId?: string;
  // Metadata
  createdBy: string;
  createdAt: string;
}

/**
 * Daily production plan
 */
export interface ProductionPlan {
  id: string;
  date: string;
  items: ProductionPlanItem[];
  totalIngredientCost: number;
  status: "planned" | "in-progress" | "completed" | "cancelled";
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionPlanItem {
  recipeId: string;
  recipe?: Recipe;
  quantity: number; // How many batches
  totalServings: number; // quantity * recipe.servings
  ingredientCost: number;
  status: "pending" | "in-progress" | "completed";
}

/**
 * Profit analytics for menu items
 */
export interface MenuProfitAnalysis {
  productId: string;
  productName: string;
  recipeId?: string;
  totalSold: number;
  totalRevenue: number;
  totalIngredientCost: number;
  totalProfit: number;
  profitMargin: number;
  avgCostPerUnit: number;
  period: string; // Date range
}

/**
 * Ingredient usage report
 */
export interface IngredientUsageReport {
  ingredientId: string;
  ingredientName: string;
  usedQuantity: number;
  unit: IngredientUnit;
  totalCost: number;
  usedInRecipes: Array<{
    recipeId: string;
    recipeName: string;
    quantity: number;
  }>;
  period: string;
}

// ============================================
// 💰 MULTI-CURRENCY TYPES
// ============================================

// Support for 100+ world currencies (ISO 4217)
// Common currencies: "LAK" | "THB" | "USD" | "BTC" | "SATS" | "EUR" | "GBP" | "JPY" | "CNY" | etc.
export type CurrencyCode = string;

// Legacy type for backward compatibility
export type LegacyCurrencyCode = "LAK" | "THB" | "USD" | "BTC" | "SATS";

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  isDefault?: boolean;
  countries?: string[]; // ISO country codes where currency is used
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  source: "api" | "manual" | "oracle";
  updatedAt: string;
}

// Multi-price with extended currency support
export interface MultiPrice {
  // Core currencies (backward compatibility)
  LAK?: number;
  THB?: number;
  USD?: number;
  BTC?: number;
  SATS?: number;

  // Additional currencies stored dynamically
  [currencyCode: string]: number | undefined;
}

// ============================================
// ⚡ LIGHTNING PAYMENT TYPES
// ============================================

export type PaymentMethod =
  | "lightning"
  | "bolt12"
  | "lnurl"
  | "onchain"
  | "bitcoin"
  | "usdt"
  | "cash"
  | "qr_static"
  | "bank_transfer"
  | "external"
  | "split";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "expired"
  | "refunded"
  | "offline_pending"
  | "cancelled"; // For offline mode

// USDT Network Types
export type USDTNetwork = "tron" | "polygon" | "ethereum" | "arbitrum";

// Crypto Provider Types
export type CryptoProvider = "btcpay" | "blockonomics" | "manual";

export interface LightningInvoice {
  id: string;
  bolt11: string;
  bolt12Offer?: string; // Static QR - BOLT12
  paymentHash: string;
  preimage?: string; // Proof of payment
  amount: number; // in sats
  amountFiat?: number;
  currency?: CurrencyCode;
  description: string;
  expiresAt: string;
  createdAt: string;
  status: PaymentStatus;
  metadata?: Record<string, unknown>;
}

export interface BOLT12Offer {
  id: string;
  offer: string; // BOLT12 offer string
  description: string;
  merchantName: string;
  merchantPubkey: string;
  allowsAnyAmount: boolean;
  minAmount?: number;
  maxAmount?: number;
  currency?: CurrencyCode;
  createdAt: string;
  isActive: boolean;
}

export interface PaymentProof {
  id: string;
  orderId: string;
  paymentHash: string;
  preimage: string;
  amount: number;
  receivedAt: string;
  method: PaymentMethod;
  isOffline: boolean;
  syncedAt?: string;
  nostrEventId?: string;
}

// ============================================
// ₿ BITCOIN ON-CHAIN PAYMENT TYPES
// ============================================

export interface BitcoinPayment {
  id: string;
  orderId: string;
  address: string; // BTC receiving address
  amountBTC: string; // Amount in BTC (string for precision)
  amountSats: number; // Amount in satoshis
  amountFiat: number; // Original fiat amount
  currency: CurrencyCode;
  exchangeRate: number; // BTC/fiat rate at time of creation
  txid?: string; // Transaction ID once detected
  confirmations: number; // Current confirmation count
  requiredConfirmations: number; // Required confirmations (1-6)
  status: PaymentStatus;
  expiresAt: string;
  createdAt: string;
  confirmedAt?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// 💵 USDT STABLECOIN PAYMENT TYPES
// ============================================

export interface USDTPayment {
  id: string;
  orderId: string;
  network: USDTNetwork; // Tron, Polygon, Ethereum
  address: string; // USDT receiving address
  amountUSDT: string; // Exact USDT amount (string for precision)
  amountFiat: number; // Original fiat amount
  currency: CurrencyCode;
  exchangeRate: number; // USD/fiat rate
  txHash?: string; // Transaction hash once detected
  confirmations: number;
  requiredConfirmations: number;
  status: PaymentStatus;
  networkFee?: string; // Estimated network fee
  expiresAt: string;
  createdAt: string;
  confirmedAt?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// ⚙️ CRYPTO SETTINGS TYPES
// ============================================

export interface CryptoSettings {
  // Bitcoin On-Chain
  bitcoinEnabled: boolean;
  bitcoinProvider: CryptoProvider;
  // BTCPay Server
  btcpayServerUrl?: string;
  btcpayApiKey?: string;
  btcpayStoreId?: string;
  // Blockonomics
  blockonomicsApiKey?: string;
  // Manual / Shared
  bitcoinAddress?: string; // Static receive address
  bitcoinXpub?: string; // xpub for address derivation
  bitcoinRequiredConfirmations: number; // 1, 3, or 6

  // USDT
  usdtEnabled: boolean;
  usdtDefaultNetwork: USDTNetwork;
  usdtAddresses: {
    tron?: string;
    polygon?: string;
    ethereum?: string;
    arbitrum?: string;
  };
  usdtRequiredConfirmations: number;

  // General
  isConfigured: boolean;
  lastTestedAt?: string;
  testStatus?: "success" | "failed";
}

// ============================================
// 📡 NOSTR INTEGRATION TYPES
// ============================================

export interface NostrProfile {
  pubkey: string;
  npub: string;
  name?: string;
  displayName?: string;
  picture?: string;
  nip05?: string;
  lud16?: string; // Lightning address
  about?: string;
}

export interface NostrMerchant extends NostrProfile {
  businessName: string;
  businessType: "restaurant" | "retail" | "service" | "other";
  branches: Branch[];
  bolt12Offer?: string;
  catalog?: ProductCatalog;
}

export interface ProductCatalog {
  id: string;
  merchantPubkey: string;
  products: Product[];
  categories: Category[];
  updatedAt: string;
  nostrEventId?: string;
}

// ============================================
// 🧾 E-RECEIPT TYPES
// ============================================

export interface EReceipt {
  id: string;
  orderId: string;
  merchantPubkey: string;
  customerPubkey?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
  currency: CurrencyCode;
  paymentProof: PaymentProof;
  createdAt: string;
  nostrEventId?: string; // Stored on Nostr
  signature?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ============================================
// 🎟️ LOYALTY & REWARDS TYPES
// ============================================

export interface LoyaltyMember {
  id: string;
  nostrPubkey: string;
  // Profile info (can be fetched from Nostr profile or manually entered)
  name?: string;
  email?: string;
  phone?: string;
  lud16?: string; // Lightning address
  address?: string;
  notes?: string;
  tags?: string[];
  // Credit/Payment terms
  defaultPaymentTermId?: string; // Reference to PaymentTerm
  creditLimit?: number; // Maximum credit allowed
  currentBalance?: number; // Outstanding balance
  // Loyalty data
  points: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  totalSpent: number;
  totalOrders?: number;
  visitCount: number;
  lastVisit: string;
  joinedAt: string;
  zapRewards: ZapReward[];
}

export interface ZapReward {
  id: string;
  memberId: string;
  amount: number; // in sats
  reason: "purchase" | "referral" | "loyalty" | "promotion";
  orderId?: string;
  zapEventId?: string;
  createdAt: string;
  claimed: boolean;
}

export interface LoyaltyProgram {
  id: string;
  merchantPubkey: string;
  name: string;
  pointsPerSat: number;
  rewardTiers: RewardTier[];
  isActive: boolean;
}

export interface RewardTier {
  name: string;
  minPoints: number;
  benefits: string[];
  zapMultiplier: number;
}

// ============================================
// 🎫 COUPON & DISCOUNT TYPES
// ============================================

export type CouponType = "percentage" | "fixed" | "free_item" | "buy_x_get_y";

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: CouponType;
  value: number; // percentage or fixed amount
  minOrderAmount?: number;
  maxDiscount?: number; // cap for percentage discounts
  freeItemId?: string; // for free_item type
  buyQuantity?: number; // for buy_x_get_y
  getQuantity?: number; // for buy_x_get_y
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usedCount: number;
  perCustomerLimit?: number;
  applicableProducts?: string[]; // product IDs, empty = all
  applicableCategories?: string[]; // category IDs, empty = all
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppliedCoupon {
  coupon: Coupon;
  discountAmount: number;
  appliedAt: string;
}

// ============================================
// 🏦 BANK TRANSFER TYPES
// ============================================

export interface BankAccount {
  id: string;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
  qrCode?: string; // QR code image URL or data
  isDefault?: boolean;
  isActive: boolean;
}

export interface ExternalPaymentProvider {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  isActive: boolean;
}

// ============================================
// 🧠 AI ANALYTICS TYPES
// ============================================

export interface SalesInsight {
  type: "upsell" | "trend" | "alert" | "recommendation";
  title: string;
  description: string;
  confidence: number;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface ProductRecommendation {
  productId: string;
  product: Product;
  reason: string;
  score: number;
  basedOn: "history" | "popular" | "complementary" | "seasonal";
}

export interface StaffPerformance {
  staffId: string;
  name: string;
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  topProducts: string[];
  rating: number;
}

// ============================================
// 📴 OFFLINE MODE TYPES
// ============================================

export interface OfflineTransaction {
  id: string;
  orderId: string;
  paymentProof: PaymentProof;
  order: Order;
  createdAt: string;
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  syncAttempts: number;
  lastSyncAttempt?: string;
  errorMessage?: string;
}

export interface SyncQueue {
  transactions: OfflineTransaction[];
  lastSyncedAt?: string;
  isOnline: boolean;
}

// ============================================
// 🛒 PRODUCT & ORDER TYPES (Enhanced)
// ============================================

// Product size/variant options
export interface ProductVariant {
  id: string;
  name: string; // e.g., "Small", "Medium", "Large"
  shortName: string; // e.g., "S", "M", "L"
  priceModifier: number; // Additional price (can be negative for discounts)
  priceModifierType: "fixed" | "percentage";
  sku?: string;
  stock?: number;
  isDefault?: boolean;
  sortOrder: number;
}

export interface ProductModifier {
  id: string;
  name: string; // e.g., "Extra Shot", "No Ice", "Less Sugar"
  price: number; // Additional price
  category: "addon" | "removal" | "preference";
  isDefault?: boolean;
}

export interface ProductModifierGroup {
  id: string;
  name: string; // e.g., "Size", "Sugar Level", "Ice Level", "Add-ons"
  type: "single" | "multiple"; // single = radio, multiple = checkbox
  required: boolean;
  minSelect?: number;
  maxSelect?: number;
  modifiers: ProductModifier[];
}

// Product Type - determines stock behavior
export type ProductType =
  | "good"
  | "service"
  | "digital"
  | "subscription"
  | "bundle";

/**
 * Product Activity Log - Track all changes to products
 */
export interface ProductActivityLog {
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
  timestamp: string;
  // Change details
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  // For stock adjustments
  stockBefore?: number;
  stockAfter?: number;
  stockReason?: string;
  // For price changes
  priceBefore?: number;
  priceAfter?: number;
  // Reference
  referenceType?: "order" | "purchase" | "adjustment" | "transfer" | "manual";
  referenceId?: string;
  // Metadata
  notes?: string;
  ipAddress?: string;
  deviceInfo?: string;
  // Nostr sync
  nostrEventId?: string;
  syncedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string; // EAN-13, UPC-A, Code128, QR code
  barcodeType?: "ean13" | "upca" | "code128" | "qr" | "custom";
  description?: string;
  categoryId: string;
  unitId: string;
  price: number;
  prices?: MultiPrice; // Multi-currency support
  costPrice?: number; // Cost price for inventory valuation
  stock: number;
  minStock: number;
  branchId: string;
  status: "active" | "inactive";
  image?: string;
  // Gallery images
  images?: string[];
  // Additional info
  brand?: string;
  manufacturer?: string;
  weight?: number;
  weightUnit?: "g" | "kg" | "oz" | "lb";
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: "cm" | "in";
  };
  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  // Product Type & Stock Tracking
  productType?: ProductType; // Default: 'good'
  trackStock?: boolean; // Default: true for 'good', false for 'service'/'digital'
  // Expiry & Lot Tracking
  hasExpiry?: boolean; // Does this product expire?
  defaultShelfLifeDays?: number; // Default shelf life in days (e.g., 30, 90, 365)
  trackLots?: boolean; // Enable lot/batch tracking (for FIFO/FEFO)
  requiresExpiryDate?: boolean; // Must enter expiry when receiving stock
  expiryWarningDays?: number; // Alert X days before expiry (default from system config)
  storageType?: "ambient" | "refrigerated" | "frozen" | "controlled";
  storageInstructions?: string;
  // Variants & Modifiers
  hasVariants?: boolean;
  variants?: ProductVariant[];
  modifierGroups?: ProductModifierGroup[];
  // AI enhancement
  upsellProducts?: string[];
  complementaryProducts?: string[];
  popularityScore?: number;
  // Tags for better search
  tags?: string[];
  // Tax
  taxable?: boolean;
  taxRate?: number;
  // Public menu visibility
  isPublic?: boolean; // If true, visible on customer menu (unencrypted)
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  stationId?: string; // KDS Station ID (e.g., 'bar', 'kitchen')
}

export interface Station {
  id: string;
  name: string;
  description?: string;
  printerId?: string; // Optional: Link to a specific printer
  isDefault?: boolean;
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  nostrPubkey?: string;
  bolt12Offer?: string;
  address?: string;
  status?: "active" | "inactive";
}

// Order Types (dine-in, take-away, delivery)
export type OrderType = "dine_in" | "take_away" | "delivery" | "pickup";

export interface Order {
  id: string;
  orderNumber?: number; // Daily sequential number (1, 2, 3...)
  code?: string; // Human-readable code (e.g., ABC-12345)
  customer: string;
  customerEmail?: string;
  customerPubkey?: string; // Nostr pubkey for loyalty
  branch: string;
  date: string;
  total: number;
  totalSats?: number;
  currency: CurrencyCode;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentProof?: PaymentProof;
  notes?: string;
  items: OrderItem[];
  tip?: number;
  tax?: number;
  discount?: number;
  appliedPromotions?: AppliedPromotion[]; // Promotions applied to this order
  loyaltyPointsEarned?: number;
  eReceiptId?: string;
  isOffline?: boolean;
  updatedAt?: string;
  // Order type
  orderType?: OrderType;
  tableNumber?: string; // For dine-in
  deliveryAddress?: string; // For delivery
  customerPhone?: string; // For delivery/pickup
  scheduledTime?: string; // For scheduled pickup/delivery
  // Kitchen display
  kitchenStatus?: "new" | "preparing" | "ready" | "served";
  kitchenNotes?: string;
  preparedAt?: string;
  servedAt?: string;
  // Enterprise features
  priority?: "low" | "normal" | "high" | "urgent";
  tags?: string[];
  assignedStaff?: string[]; // Array of employee IDs
  shippingInfo?: {
    senderName?: string;
    senderPhone?: string;
    recipientName?: string;
    recipientPhone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    deliveryNotes?: string;
    shippingMethod?: string;
    carrier?: string;
    trackingNumber?: string;
    requiresSignature?: boolean;
    insurance?: number;
  };
  customFields?: Array<{
    id: string;
    label: string;
    value: any;
    type: string;
  }>;
  fulfillment?: {
    scheduledDate?: string;
    scheduledTime?: string;
    notes?: string;
  };
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  product: Product;
  // Variant & modifier selections
  selectedVariant?: ProductVariant;
  selectedModifiers?: ProductModifier[];
  // Custom notes (e.g., "no onions", "extra spicy")
  notes?: string;
  // Kitchen tracking
  kitchenStatus?:
  | "new"
  | "pending"
  | "preparing"
  | "cooking"
  | "ready"
  | "served"
  | "cancelled";
}

// ============================================
// 📊 ANALYTICS TYPES
// ============================================

export interface SalesMetric {
  period: string;
  sales: number;
  salesSats?: number;
  orders: number;
  currency?: CurrencyCode;
}

export interface TopProduct {
  id: number | string;
  name: string;
  sales: number;
  revenue: number;
  revenueSats?: number;
}

export interface RecentOrder {
  id: string;
  customer: string;
  customerPubkey?: string;
  amount: number;
  amountSats?: number;
  status: PaymentStatus;
  time: string;
  paymentMethod?: PaymentMethod;
}

// ============================================
// 🏪 POS SESSION TYPES
// ============================================

export interface POSSession {
  id: string;
  branchId: string;
  staffId: string;
  startedAt: string;
  endedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  lightningSales: number;
  status: "active" | "closed";
}

export interface CartItem {
  id?: string; // Optional: ID from existing order (for editing)
  kitchenStatus?:
  | "new"
  | "pending"
  | "preparing"
  | "cooking"
  | "ready"
  | "served"
  | "cancelled";
  product: Product;
  quantity: number;
  price: number; // Base price + variant + modifiers
  total: number;
  // Variant & modifiers
  selectedVariant?: ProductVariant;
  selectedModifiers?: ProductModifier[];
  // Custom notes for kitchen
  notes?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  totalSats: number;
  currency: CurrencyCode;
}

// ============================================
// 🔔 NOTIFICATION TYPES
// ============================================

export type NotificationPriority = "low" | "medium" | "high" | "critical";

/**
 * Kitchen order status for enhanced tracking
 */
export type KitchenStatus = "new" | "preparing" | "ready" | "served";

/**
 * Quick action button for notifications
 */
export interface NotificationAction {
  label: string;
  variant?: "solid" | "outline" | "ghost" | "soft";
  color?: "primary" | "green" | "blue" | "red" | "orange" | "gray";
  icon?: string;
  onClick: () => void | Promise<void>;
  requiresConfirm?: boolean; // Show confirmation dialog before action
  confirmTitle?: string;
  confirmMessage?: string;
}

/**
 * Device role for filtering notifications
 */
export type DeviceRole = "all" | "pos" | "kitchen" | "waiter" | "manager";

/**
 * Device notification preferences
 */
export interface DeviceSettings {
  deviceRole: DeviceRole;
  deviceName?: string;
  notificationPreferences: {
    soundEnabled: boolean;
    vibrationEnabled: boolean;

    // Type filters
    showNewOrders: boolean;
    showKitchenReady: boolean;
    showKitchenServed: boolean;
    showWaiterCalls: boolean;
    showBillRequests: boolean;
    showPayments: boolean;
    showStockAlerts: boolean;
    showSystemUpdates: boolean;

    // Sound customization
    newOrderSound: "notification" | "bell" | "chime";
    readySound: "bell" | "ding" | "success";
    urgentSound: "alert" | "siren" | "alarm";

    // Display preferences
    autoMarkServedAsRead: boolean;
    groupSimilarNotifications: boolean;
    showNotificationDuration: number; // Toast duration in seconds
  };
}

export interface POSNotification {
  id: string;
  type:
  | "payment"
  | "order"
  | "stock"
  | "loyalty"
  | "ai_insight"
  | "alert"
  | "system"
  | "system_update"; // New type for global announcements
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  priority?: NotificationPriority;
  actionUrl?: string; // Link to navigate when clicked
  expiresAt?: string; // Auto-dismiss after this time
  nostrEventId?: string;

  // Enhanced features
  persistent?: boolean; // Don't auto-dismiss (for critical alerts like waiter calls)
  requiresAcknowledgment?: boolean; // Must be manually dismissed
  actions?: NotificationAction[]; // Quick action buttons
  kitchenStatus?: KitchenStatus; // Current kitchen status for order notifications
  groupKey?: string; // Group similar notifications together
  urgencyLevel?: "normal" | "warning" | "urgent" | "critical"; // Time-based urgency
}

// ============================================
// 👤 USER & ROLE MANAGEMENT TYPES
// ============================================

export type UserRole = "owner" | "admin" | "cashier" | "staff";

// Authentication method - supports hybrid auth
export type AuthMethod = "nostr" | "password" | "pin";

export interface UserPermissions {
  // POS Operations
  canCreateOrders: boolean;
  canVoidOrders: boolean;
  canApplyDiscounts: boolean;
  canProcessRefunds: boolean;
  // Product Management
  canViewProducts: boolean;
  canEditProducts: boolean;
  canDeleteProducts: boolean;
  // Customer Management
  canViewCustomers: boolean;
  canEditCustomers: boolean;
  // Reports & Analytics
  canViewReports: boolean;
  canExportReports: boolean;
  // Settings
  canViewSettings: boolean;
  canEditSettings: boolean;
  canManageLightning: boolean;
  canManageUsers: boolean;
  // Inventory
  canViewInventory: boolean;
  canEditInventory: boolean;
  canAdjustStock: boolean;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  owner: {
    canCreateOrders: true,
    canVoidOrders: true,
    canApplyDiscounts: true,
    canProcessRefunds: true,
    canViewProducts: true,
    canEditProducts: true,
    canDeleteProducts: true,
    canViewCustomers: true,
    canEditCustomers: true,
    canViewReports: true,
    canExportReports: true,
    canViewSettings: true,
    canEditSettings: true,
    canManageLightning: true,
    canManageUsers: true,
    canViewInventory: true,
    canEditInventory: true,
    canAdjustStock: true,
  },
  admin: {
    canCreateOrders: true,
    canVoidOrders: true,
    canApplyDiscounts: true,
    canProcessRefunds: true,
    canViewProducts: true,
    canEditProducts: true,
    canDeleteProducts: false,
    canViewCustomers: true,
    canEditCustomers: true,
    canViewReports: true,
    canExportReports: true,
    canViewSettings: true,
    canEditSettings: true,
    canManageLightning: false,
    canManageUsers: false,
    canViewInventory: true,
    canEditInventory: true,
    canAdjustStock: true,
  },
  cashier: {
    canCreateOrders: true,
    canVoidOrders: false,
    canApplyDiscounts: true,
    canProcessRefunds: false,
    canViewProducts: true,
    canEditProducts: false,
    canDeleteProducts: false,
    canViewCustomers: true,
    canEditCustomers: false,
    canViewReports: false,
    canExportReports: false,
    canViewSettings: false,
    canEditSettings: false,
    canManageLightning: false,
    canManageUsers: false,
    canViewInventory: true,
    canEditInventory: false,
    canAdjustStock: false,
  },
  staff: {
    canCreateOrders: true,
    canVoidOrders: false,
    canApplyDiscounts: false,
    canProcessRefunds: false,
    canViewProducts: true,
    canEditProducts: false,
    canDeleteProducts: false,
    canViewCustomers: false,
    canEditCustomers: false,
    canViewReports: false,
    canExportReports: false,
    canViewSettings: false,
    canEditSettings: false,
    canManageLightning: false,
    canManageUsers: false,
    canViewInventory: true,
    canEditInventory: false,
    canAdjustStock: false,
  },
};

export interface StoreUser {
  id: string;
  name: string;
  email?: string;
  pin?: string; // For quick POS login (hashed)
  role: UserRole;
  permissions: UserPermissions;
  branchId?: string; // Optional - restrict to specific branch
  isActive: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  deletedAt?: string; // For soft delete

  // ============================================
  // 🔐 HYBRID AUTHENTICATION FIELDS
  // ============================================

  // Primary authentication method
  authMethod: AuthMethod;

  // Nostr authentication (for tech-savvy users)
  npub?: string; // Nostr public key (npub format)
  pubkeyHex?: string; // Nostr public key (hex format)

  // Password authentication (for traditional users)
  passwordHash?: string; // Hashed password

  // ============================================
  // 🛡️ PERMISSION & ACCESS CONTROL
  // ============================================

  // Permission event tracking (for Nostr-based revocation)
  permissionGrantId?: string; // ID of the permission grant event
  grantedBy?: string; // npub of who granted access
  grantedAt?: string; // When permission was granted
  expiresAt?: string; // Auto-expiry date (optional)
  revokedAt?: string; // If access was revoked
  revocationReason?: string; // Why access was revoked

  // Security
  failedLoginAttempts?: number;
  lockedUntil?: string; // Account lockout
  mustChangePassword?: boolean;
  passwordChangedAt?: string;
}

// ============================================
// ⚙️ STORE SETTINGS TYPES
// ============================================

export type LightningProvider =
  | "lnbits"
  | "alby"
  | "alby-hub"
  | "blink"
  | "nwc"
  | "lnd"
  | "cln"
  | "lnurl";

export interface LightningSettings {
  provider: LightningProvider;
  nodeUrl?: string; // LNbits URL, LND REST, Alby Hub URL
  apiKey?: string; // LNbits Admin/Invoice key
  accessToken?: string; // Alby Hub access token
  blinkApiKey?: string; // Blink API key
  blinkWalletId?: string; // Blink wallet ID
  macaroon?: string; // LND macaroon (hex)
  rune?: string; // CLN rune
  nwcConnectionString?: string; // NWC connection string (nostr+walletconnect://...)
  lightningAddress?: string; // name@domain.com (for LNURL-pay)
  bolt12Offer?: string; // Static QR
  isConfigured: boolean;
  lastTestedAt?: string;
  testStatus?: "success" | "failed" | "pending";
}

export interface SecuritySettings {
  dataEncryption: boolean;
  encryptionKey?: string; // Encrypted with master password
  autoLockTimeout: number; // Minutes
  requirePinForRefunds: boolean;
  requirePinForVoids: boolean;
  requirePinForDiscounts: boolean;
  auditLogging: boolean;
}

export interface PaymentTerm {
  id: string;
  name: string;
  days: number;
  description: string;
}

export interface GeneralSettings {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  storeLogo?: string;
  defaultCurrency: CurrencyCode;
  taxRate: number; // Percentage
  tipEnabled: boolean;
  tipSuggestions: number[]; // e.g., [10, 15, 20]
  receiptFooter?: string;
  language: string;
  timezone: string;
  paymentTerms?: PaymentTerm[];
  enabledFeatures?: Record<string, boolean>; // Feature flags
}

export interface StoreSettings {
  // Company/Shop Info
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  taxNumber?: string;
  companyAddress?: string;

  // Regional Settings
  defaultCurrency?: string;
  defaultLanguage?: string;
  dateFormat?: string;
  timeFormat?: string;
  timezone?: string;
  decimalPlaces?: number;

  // Nested settings (legacy support)
  general?: GeneralSettings;
  lightning?: LightningSettings;
  security?: SecuritySettings;

  // New settings sections
  appearance?: AppearanceSettings;
  customization?: CustomizationSettings;
  notificationSettings?: NotificationPreferences;
  relays?: RelayConfig[];

  // 🛒 MARKETPLACE SETTINGS
  marketplace?: {
    visibility?: "public" | "private";
    shopType?: string;
    isListed?: boolean;
    marketplaceJoinedAt?: string;
    marketplaceDescription?: string;
    nip05?: string;
    lud16?: string;
    services?: string[];
    acceptsLightning?: boolean;
    acceptsBitcoin?: boolean;
    tags?: string[];
    platformTag?: string;
    geolocation?: {
      lat?: number;
      lng?: number;
      address?: string;
      city?: string;
      country?: string;
    };
    businessHours?: Record<string, { open: string; close: string }>;
  };

  // Accounting settings
  accounting?: {
    enabled: boolean; // ON/OFF toggle for auto journal entries
    standard: "global" | "lao"; // Accounting standard
    vatRate: number; // VAT rate (0.10 = 10%)
    autoPostJournals: boolean; // Auto-post or require approval
    fiscalYearStart: string; // "01-01" format
  };

  // Chat settings (synced across devices)
  chatSettings?: {
    enabled: boolean;
  };

  updatedAt?: string;
}

// ============================================
// 🎨 APPEARANCE SETTINGS
// ============================================

export interface AppearanceSettings {
  theme: "system" | "light" | "dark";
  accentColor: string;
  fontSize: "small" | "medium" | "large";
  fontFamily: string;
  compactMode: boolean;
  sidebarPosition: "left" | "right";
  highContrast: boolean;
  reduceMotion: boolean;
}

// ============================================
// ⚙️ CUSTOMIZATION SETTINGS
// ============================================

export interface CustomizationSettings {
  // Feed Display
  defaultView: "timeline" | "grid" | "compact";
  showReposts: boolean;
  showReplies: boolean;
  contentDensity: "compact" | "normal" | "comfortable";
  // UI Preferences
  animationSpeed: "fast" | "normal" | "slow";
  hapticFeedback: boolean;
  autoPlayMedia: boolean;
  imageQuality: "low" | "medium" | "high";
  // POS Settings
  gridColumns: number;
  cartPosition: "left" | "right" | "bottom";
  quickActions: QuickActionConfig[];
}

export interface QuickActionConfig {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
}

// ============================================
// 🔔 NOTIFICATION PREFERENCES
// ============================================

export interface NotificationPreferences {
  notifications: {
    // Orders
    newOrder: boolean;
    orderStatus: boolean;
    paymentReceived: boolean;
    // Nostr
    mentions: boolean;
    reactions: boolean;
    reposts: boolean;
    directMessages: boolean;
    // System
    backupReminders: boolean;
    lowStock: boolean;
    relayIssues: boolean;
  };
  delivery: {
    push: boolean;
    inApp: boolean;
    sound: boolean;
  };
}

// ============================================
// 📡 RELAY CONFIGURATION
// ============================================

export interface RelayConfig {
  url: string;
  read: boolean;
  write: boolean;
  outbox: boolean;
  isPrimary: boolean;
  status?: "connected" | "connecting" | "disconnected" | "error";
  latency?: number;
  lastConnectedAt?: string;
}

// ============================================
// 🔐 ENCRYPTION TYPES
// ============================================

export interface EncryptedData {
  iv: string; // Initialization vector (base64)
  data: string; // Encrypted data (base64)
  tag?: string; // Auth tag for GCM mode
}

export interface SecurityAuditLog {
  id: string;
  action:
  | "login"
  | "logout"
  | "settings_change"
  | "refund"
  | "void"
  | "role_change"
  | "permission_grant"
  | "permission_revoke";
  userId: string;
  userName: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

// ============================================
// 🎫 PERMISSION EVENT TYPES (Nostr-based)
// ============================================

export type PermissionEventKind = 30510 | 30511; // 30510 = grant, 30511 = revoke

export interface PermissionGrant {
  id: string;
  kind: typeof NOSTR_KINDS.PERMISSION_GRANT;
  storeId: string;
  storeName: string;
  granterPubkey: string; // Owner/Admin who granted
  granterNpub: string;
  granteePubkey: string; // Staff member receiving permission
  granteeNpub: string;
  role: UserRole;
  permissions: UserPermissions;
  createdAt: string;
  expiresAt?: string;
  signature?: string; // Nostr event signature
  nostrEventId?: string;
}

export interface PermissionRevocation {
  id: string;
  kind: typeof NOSTR_KINDS.PERMISSION_REVOKE;
  storeId: string;
  revokerPubkey: string; // Owner/Admin who revoked
  revokerNpub: string;
  revokeePubkey: string; // Staff member being revoked
  revokeeNpub: string;
  grantId: string; // Reference to the grant being revoked
  reason?: string;
  createdAt: string;
  signature?: string;
  nostrEventId?: string;
}

// ============================================
// 🏪 STORE IDENTITY TYPES
// ============================================

export interface StoreIdentity {
  id: string;
  name: string;
  npub: string; // Store's Nostr public key
  pubkeyHex: string;
  ownerNpub: string; // Owner's personal npub
  ownerPubkeyHex: string;
  createdAt: string;
  // Store key is used for data encryption
  // The actual nsec is encrypted with owner's master password
  encryptedStoreKey?: string;
}

// ============================================
// 🔑 AUTH SESSION TYPES
// ============================================

export interface AuthSession {
  userId: string;
  npub?: string;
  authMethod: AuthMethod;
  loginAt: string;
  expiresAt: string;
  isValid: boolean;
  deviceId?: string;
  ipAddress?: string;
}

export interface AuthChallenge {
  id: string;
  challenge: string; // Random string to sign
  createdAt: string;
  expiresAt: string;
  npub: string; // Who should sign this
  isUsed: boolean;
}

// ============================================
// 🔐 NOSTR USER & ACCOUNT TYPES
// ============================================

/**
 * Nostr user keys for authentication and signing
 */
export interface NostrUserKeys {
  pub: string; // Public key (hex format)
  sec: string; // Secret key / nsec (hex or nsec format)
  npub?: string; // npub encoded public key
  nsec?: string; // nsec encoded secret key
  privateKey?: string; // Alias for sec (hex format)
  publicKey?: string; // Alias for pub (hex format)
}

/**
 * Nostr user returned from key generation or extension
 */
export interface NostrUser {
  privateKey: string;
  publicKey: string;
  nsec: string;
  npub: string;
}

/**
 * User profile information stored in localStorage
 */
export interface UserInfo {
  pubkey: string; // Public key (hex format)
  name?: string; // Profile name
  displayName?: string; // Display name
  display_name?: string; // Alternative display name field
  about?: string; // Bio/description
  picture?: string; // Avatar URL
  banner?: string; // Banner image URL
  nip05?: string; // NIP-05 identifier
  lud16?: string; // Lightning address
  website?: string; // Website URL
  verified?: boolean; // NIP-05 verified
  lastUpdated?: number | null; // Last profile update timestamp
  userKeys?: NostrUserKeys; // User's cryptographic keys
}

// ============================================
// 🚚 DELIVERY TYPES
// Order Delivery Tracking & Driver Management
// ============================================

/**
 * Status of a delivery
 */
export type DeliveryStatus =
  | "pending"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "failed";

/**
 * Delivery driver
 */
export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType?: "motorcycle" | "car" | "bicycle" | "walk";
  vehiclePlate?: string;
  isAvailable: boolean;
  currentDeliveryId?: string;
  totalDeliveries?: number;
  rating?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Delivery record linked to an order
 */
export interface Delivery {
  id: string;
  orderId: string;
  order?: Order;
  driverId?: string;
  driver?: Driver;
  status: DeliveryStatus;
  // Customer details
  customerName: string;
  customerPhone: string;
  address: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
  // Times
  scheduledAt?: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  // Tracking
  estimatedMinutes?: number;
  actualMinutes?: number;
  distanceKm?: number;
  // Fee
  deliveryFee: number;
  tip?: number;
  // Metadata
  cancellationReason?: string;
  failureReason?: string;
  proofOfDelivery?: string; // Photo or signature
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 🧾 INVOICE TYPES
// Invoicing & Payment Tracking
// ============================================

/**
 * Invoice status
 */
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "paid"
  | "partial"
  | "overdue"
  | "cancelled"
  | "refunded";

/**
 * Invoice line item
 */
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: "fixed" | "percentage";
  taxRate?: number;
  total: number;
}

/**
 * Payment recorded against an invoice
 */
export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  paidAt: string;
  createdBy?: string;
}

/**
 * Invoice for customers
 */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  // Customer
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTaxId?: string;
  // Linked order
  orderId?: string;
  // Items
  items: InvoiceItem[];
  // Amounts
  subtotal: number;
  discountAmount?: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: CurrencyCode;
  // Dates
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  sentDate?: string;
  viewedDate?: string;
  // Status
  status: InvoiceStatus;
  // Content
  notes?: string;
  terms?: string;
  footerText?: string;
  // Payments
  payments: InvoicePayment[];
  // Metadata
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 📋 CONTRACT & RENTAL TYPES
// Contract Management & Asset Rentals
// ============================================

/**
 * Contract type
 */
export type ContractType = "rental" | "lease" | "service" | "subscription";

/**
 * Contract status
 */
export type ContractStatus =
  | "draft"
  | "pending"
  | "active"
  | "expired"
  | "terminated"
  | "cancelled";

/**
 * Rental asset type
 */
export type AssetType =
  | "room"
  | "equipment"
  | "vehicle"
  | "locker"
  | "space"
  | "other";

/**
 * Rental Asset (room, equipment, vehicle, locker, etc.)
 */
export interface RentalAsset {
  id: string;
  name: string;
  nameLao?: string;
  type: AssetType;
  category?: string;
  description?: string;
  image?: string;
  // Pricing
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  deposit?: number;
  currency?: CurrencyCode;
  // Availability
  isAvailable: boolean;
  isActive: boolean;
  // Details
  location?: string;
  capacity?: number;
  serialNumber?: string;
  // Metadata
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Contract for rentals, leases, or services
 */
export interface Contract {
  id: string;
  contractNumber: string;
  // Customer
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  // Type & Status
  type: ContractType;
  status: ContractStatus;
  // Asset (for rentals)
  assetId?: string;
  asset?: RentalAsset;
  // Period
  startDate: string;
  endDate: string;
  // Billing
  amount: number;
  paymentSchedule: "once" | "daily" | "weekly" | "monthly" | "yearly";
  currency: CurrencyCode;
  totalPaid?: number;
  // Deposit
  depositAmount?: number;
  depositStatus?:
  | "pending"
  | "collected"
  | "partial"
  | "returned"
  | "forfeited";
  depositPaidAt?: string;
  depositReturnedAt?: string;
  // Options
  autoRenew: boolean;
  renewalNotificationDays?: number;
  // Content
  description?: string;
  notes?: string;
  terms?: string;
  // Linked records
  invoiceIds?: string[];
  paymentIds?: string[];
  // Timestamps
  activatedAt?: string;
  terminatedAt?: string;
  terminationReason?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Rental booking for assets
 */
export interface RentalBooking {
  id: string;
  bookingNumber?: string;
  // Asset
  assetId: string;
  asset?: RentalAsset;
  // Customer
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  // Contract link
  contractId?: string;
  // Times
  startTime: string;
  endTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  // Status
  status: "reserved" | "checked_out" | "returned" | "cancelled" | "no_show";
  // Billing
  totalAmount: number;
  depositAmount?: number;
  lateFee?: number;
  currency?: CurrencyCode;
  isPaid?: boolean;
  // Notes
  notes?: string;
  returnCondition?: string;
  // Timestamps
  checkedOutAt?: string;
  returnedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// 📋 CONTRACT HISTORY TYPES
// Audit logging for contracts, assets, bookings
// ============================================

/**
 * Contract/Asset/Booking change history action types
 */
export type ContractHistoryAction =
  | "created"
  | "updated"
  | "activated"
  | "terminated"
  | "renewed"
  | "deleted"
  | "deposit_collected"
  | "deposit_returned"
  | "checked_out"
  | "returned";

/**
 * Contract/Asset/Booking change history entry
 * Used for audit logging and versioning
 */
export interface ContractHistoryEntry {
  id: string;
  /** Type of entity: contract, asset, or booking */
  entityType: "contract" | "asset" | "booking";
  /** ID of the contract/asset/booking */
  entityId: string;
  /** Action performed */
  action: ContractHistoryAction;
  /** ISO timestamp */
  timestamp: string;
  /** User who made the change (npub or staff ID) */
  userId: string;
  /** Display name of user */
  userName: string;
  /** Previous state (for updates) */
  previousData?: Record<string, unknown>;
  /** New state (for creates/updates) */
  newData?: Record<string, unknown>;
  /** Human-readable description */
  details: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Payment method for contract payments
 */
export type ContractPaymentMethod = "cash" | "card" | "bank" | "qr" | "crypto";

/**
 * Contract payment record
 * Tracks payments made against a contract
 */
export interface ContractPayment {
  id: string;
  /** Contract this payment belongs to */
  contractId: string;
  /** Payment amount */
  amount: number;
  /** Currency code */
  currency: CurrencyCode;
  /** How the payment was made */
  paymentMethod: ContractPaymentMethod;
  /** Date payment was received */
  paymentDate: string;
  /** For recurring payments - period start */
  periodStart?: string;
  /** For recurring payments - period end */
  periodEnd?: string;
  /** Payment reference number */
  reference?: string;
  /** Additional notes */
  notes?: string;
  /** User who recorded the payment */
  recordedBy: string;
  /** User name who recorded */
  recordedByName?: string;
  /** Creation timestamp */
  createdAt: string;
}

// ============================================
// 🎁 PROMOTION TYPES
// BOGO, Discounts, Bundles, Tiered
// ============================================

/**
 * Promotion type categories
 */
export type PromotionType =
  | "bogo"
  | "discount"
  | "bundle"
  | "freebie"
  | "tiered";

/**
 * Discount calculation type
 */
export type DiscountType = "percentage" | "fixed";

/**
 * What the promotion applies to
 * - all: Applies to all products in cart
 * - products: Applies to specific products
 * - categories: Applies to specific categories
 */
export type PromotionScope = "all" | "products" | "categories";

/**
 * Promotion status
 */
export type PromotionStatus = "active" | "inactive" | "scheduled" | "expired";

/**
 * Tiered discount level
 */
export interface PromotionTier {
  minQuantity: number; // Buy X or more
  discountType: DiscountType;
  discountValue: number; // % or fixed amount
}

/**
 * Promotion configuration
 */
export interface Promotion {
  id: string;
  name: string;
  description?: string;
  type: PromotionType;
  status: PromotionStatus;

  // === SCOPE ===
  scope: PromotionScope; // What this promo applies to

  // Trigger conditions (for BOGO/bundle/freebie)
  triggerProductIds: string[]; // Products that trigger this promotion
  triggerQuantity: number; // Qty needed to trigger (e.g., 1 for "buy 1")
  triggerCategoryIds?: string[]; // Or any product from these categories

  // === DISCOUNT (for discount/tiered types) ===
  discountType?: DiscountType; // percentage or fixed
  discountValue?: number; // The discount % or amount

  // Tiered discounts (for tiered type)
  tiers?: PromotionTier[]; // e.g., [{qty:2, discount:10}, {qty:3, discount:20}]

  // === REWARDS (for BOGO/freebie) ===
  rewardType: "free_product" | "discount" | "percentage_off";
  rewardProductIds: string[]; // Products given free (can differ from trigger)
  rewardQuantity: number; // Qty given free (e.g., 1 for "get 1 free")
  rewardDiscount?: number; // Fixed amount discount
  rewardPercentage?: number; // Percentage off

  // === CONDITIONS ===
  minOrderValue?: number; // Minimum cart total to qualify
  minQuantity?: number; // Minimum product quantity
  customerTiers?: string[]; // e.g., ["vip", "gold"] - limit to specific customer tiers
  firstOrderOnly?: boolean; // Only for new customers
  maxItemsAffected?: number; // Max items this promo can apply to

  // === TIME CONSTRAINTS ===
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[]; // 0-6 for specific days (0 = Sunday)
  startTime?: string; // Daily start time (HH:mm)
  endTime?: string; // Daily end time (HH:mm)

  // === USAGE LIMITS ===
  maxUsesPerOrder?: number; // Max times applied per order
  maxUsesPerCustomer?: number; // Max uses per customer
  maxUsesTotal?: number; // Total usage limit
  usageCount: number; // Current usage count

  // === STACKING ===
  stackable?: boolean; // Can combine with other promotions
  excludePromotionIds?: string[]; // Cannot combine with these promos
  priority: number; // Higher = applied first

  // === DISPLAY ===
  badgeText?: string; // e.g., "BUY 1 GET 1 FREE"
  badgeColor?: string;
  highlightOnPOS?: boolean; // Highlight in POS product grid

  // === METADATA ===
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Applied promotion in cart/order
 */
export interface AppliedPromotion {
  promotionId: string;
  promotionName: string;
  type: PromotionType;
  triggerItemIds: string[]; // Cart item IDs that triggered
  rewardItemIds: string[]; // Cart item IDs that are rewards (free)
  discountAmount: number; // Total discount value
  discountType?: DiscountType;
  timesApplied: number; // How many times applied in this order
  description?: string; // Human readable description of what was applied
}

/**
 * Promotion usage log entry
 */
export interface PromotionUsage {
  id: string;
  promotionId: string;
  promotionName: string;
  orderId: string;
  customerId?: string;
  customerPubkey?: string;
  usedAt: string;
  discountAmount: number;
  timesApplied: number;
  branch?: string;
}
