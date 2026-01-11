// ============================================
// 💰 ACCOUNTING TYPES
// Double-Entry Accounting with Global & Lao Standards
// ============================================

/**
 * Supported accounting standards
 */
export type AccountingStandard = 'global' | 'lao';

/**
 * Account types for chart of accounts
 */
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

/**
 * Journal entry status
 */
export type JournalEntryStatus = 'draft' | 'posted' | 'voided';

/**
 * Account in Chart of Accounts
 */
export interface Account {
  code: string;           // "1100" (Lao) or "10100" (Global)
  name: string;           // English name
  nameLao?: string;       // Lao name (ຊື່ລາວ)
  type: AccountType;
  parentCode?: string;    // For hierarchical accounts
  isActive: boolean;
  isSystem: boolean;      // System accounts can't be deleted
  description?: string;
  normalBalance: 'debit' | 'credit';
  currencyCode?: string;  // Optional currency restriction
  createdAt: string;
  updatedAt: string;
}

/**
 * Single line in a journal entry
 */
export interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
  currencyCode: string;
  exchangeRate?: number;  // For multi-currency
}

/**
 * Complete journal entry (double-entry)
 */
export interface JournalEntry {
  id: string;
  entryNumber: string;    // Auto-generated: "JE-2024-0001"
  date: string;
  description: string;
  lines: JournalEntryLine[];
  status: JournalEntryStatus;
  // Source reference
  sourceType?: 'order' | 'stock_adjustment' | 'membership' | 'expense' | 'manual' | 'invoice' | 'payment';
  sourceId?: string;      // Order ID, adjustment ID, etc.
  // Metadata
  createdBy?: string;
  createdAt: string;
  postedAt?: string;
  voidedAt?: string;
  voidReason?: string;
  // Totals (for validation)
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

/**
 * Accounting period (fiscal month/year)
 */
export interface AccountingPeriod {
  id: string;
  name: string;           // "January 2024"
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'locked';
  closedAt?: string;
  closedBy?: string;
}

/**
 * Accounting settings
 */
export interface AccountingSettings {
  standard: AccountingStandard;
  fiscalYearStart: string;  // "01-01" for Jan 1
  defaultCurrency: string;
  vatRate: number;          // 0.10 for 10%
  vatAccountCode: string;   // VAT payable account
  retainedEarningsCode: string;
  autoPostJournals: boolean;
  requireApproval: boolean;
}

// ============================================
// 📊 DEFAULT CHART OF ACCOUNTS - LAO STYLE
// ============================================

export const LAO_CHART_OF_ACCOUNTS: Omit<Account, 'createdAt' | 'updatedAt'>[] = [
  // ASSETS (1000-1999)
  { code: '1100', name: 'Cash', nameLao: 'ເງິນສົດ', type: 'asset', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '1110', name: 'Cash - LAK', nameLao: 'ເງິນສົດ - ກີບ', type: 'asset', parentCode: '1100', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '1120', name: 'Cash - USD', nameLao: 'ເງິນສົດ - ໂດລາ', type: 'asset', parentCode: '1100', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '1130', name: 'Cash - THB', nameLao: 'ເງິນສົດ - ບາດ', type: 'asset', parentCode: '1100', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '1150', name: 'Lightning Wallet', nameLao: 'ກະເປົາ Lightning', type: 'asset', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '1200', name: 'Bank - BCEL', nameLao: 'ບັນຊີ BCEL', type: 'asset', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '1210', name: 'Bank - LDB', nameLao: 'ບັນຊີ LDB', type: 'asset', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '1220', name: 'Bank - JDB', nameLao: 'ບັນຊີ JDB', type: 'asset', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '1300', name: 'Inventory', nameLao: 'ສິນຄ້າຄົງຄັງ', type: 'asset', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '1400', name: 'Accounts Receivable', nameLao: 'ລູກໜີ້ການຄ້າ', type: 'asset', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '1500', name: 'Prepaid Expenses', nameLao: 'ຄ່າໃຊ້ຈ່າຍລ່ວງໜ້າ', type: 'asset', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '1600', name: 'Fixed Assets', nameLao: 'ຊັບສິນຖາວອນ', type: 'asset', isActive: true, isSystem: false, normalBalance: 'debit' },
  
  // LIABILITIES (2000-2999)
  { code: '2100', name: 'Accounts Payable', nameLao: 'ເຈົ້າໜີ້ການຄ້າ', type: 'liability', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '2200', name: 'VAT Payable', nameLao: 'ອາກອນມູນຄ່າເພີ່ມ', type: 'liability', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '2300', name: 'Accrued Expenses', nameLao: 'ຄ່າໃຊ້ຈ່າຍຄ້າງຈ່າຍ', type: 'liability', isActive: true, isSystem: false, normalBalance: 'credit' },
  { code: '2400', name: 'Deferred Revenue', nameLao: 'ລາຍຮັບລ່ວງໜ້າ', type: 'liability', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '2500', name: 'Loans Payable', nameLao: 'ເງິນກູ້', type: 'liability', isActive: true, isSystem: false, normalBalance: 'credit' },
  
  // EQUITY (3000-3999)
  { code: '3100', name: "Owner's Equity", nameLao: 'ທຶນເຈົ້າຂອງ', type: 'equity', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '3200', name: 'Retained Earnings', nameLao: 'ກຳໄລສະສົມ', type: 'equity', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '3300', name: 'Current Year Earnings', nameLao: 'ກຳໄລປີປັດຈຸບັນ', type: 'equity', isActive: true, isSystem: true, normalBalance: 'credit' },
  
  // REVENUE (4000-4999)
  { code: '4100', name: 'Sales Revenue', nameLao: 'ລາຍຮັບຈາກການຂາຍ', type: 'revenue', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '4110', name: 'Food Sales', nameLao: 'ລາຍຮັບອາຫານ', type: 'revenue', parentCode: '4100', isActive: true, isSystem: false, normalBalance: 'credit' },
  { code: '4120', name: 'Beverage Sales', nameLao: 'ລາຍຮັບເຄື່ອງດື່ມ', type: 'revenue', parentCode: '4100', isActive: true, isSystem: false, normalBalance: 'credit' },
  { code: '4200', name: 'Membership Revenue', nameLao: 'ລາຍຮັບສະມາຊິກ', type: 'revenue', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '4300', name: 'Service Revenue', nameLao: 'ລາຍຮັບບໍລິການ', type: 'revenue', isActive: true, isSystem: false, normalBalance: 'credit' },
  { code: '4400', name: 'Room/Table Revenue', nameLao: 'ລາຍຮັບຫ້ອງ/ໂຕະ', type: 'revenue', isActive: true, isSystem: false, normalBalance: 'credit' },
  { code: '4900', name: 'Other Revenue', nameLao: 'ລາຍຮັບອື່ນໆ', type: 'revenue', isActive: true, isSystem: false, normalBalance: 'credit' },
  
  // EXPENSES (5000-9999)
  { code: '5100', name: 'Cost of Goods Sold', nameLao: 'ຕົ້ນທຶນສິນຄ້າຂາຍ', type: 'expense', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '5200', name: 'Inventory Loss', nameLao: 'ການສູນເສຍສິນຄ້າ', type: 'expense', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '5300', name: 'Salary Expense', nameLao: 'ຄ່າແຮງງານ', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '5400', name: 'Rent Expense', nameLao: 'ຄ່າເຊົ່າ', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '5500', name: 'Utilities Expense', nameLao: 'ຄ່ານ້ຳຄ່າໄຟ', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '5600', name: 'Marketing Expense', nameLao: 'ຄ່າໂຄສະນາ', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '5700', name: 'Supplies Expense', nameLao: 'ຄ່າອຸປະກອນ', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '5800', name: 'Depreciation Expense', nameLao: 'ຄ່າເສື່ອມລາຄາ', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '5900', name: 'Bank Fees', nameLao: 'ຄ່າທຳນຽມທະນາຄານ', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '6000', name: 'Other Expenses', nameLao: 'ຄ່າໃຊ້ຈ່າຍອື່ນໆ', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
];

// ============================================
// 📊 DEFAULT CHART OF ACCOUNTS - GLOBAL (IFRS)
// ============================================

export const GLOBAL_CHART_OF_ACCOUNTS: Omit<Account, 'createdAt' | 'updatedAt'>[] = [
  // ASSETS (10000-19999)
  { code: '10100', name: 'Cash and Cash Equivalents', type: 'asset', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '10110', name: 'Petty Cash', type: 'asset', parentCode: '10100', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '10120', name: 'Cash in Bank', type: 'asset', parentCode: '10100', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '10150', name: 'Digital Wallet - Lightning', type: 'asset', parentCode: '10100', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '11000', name: 'Accounts Receivable', type: 'asset', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '12000', name: 'Inventory', type: 'asset', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '13000', name: 'Prepaid Expenses', type: 'asset', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '15000', name: 'Property, Plant & Equipment', type: 'asset', isActive: true, isSystem: false, normalBalance: 'debit' },
  
  // LIABILITIES (20000-29999)
  { code: '20100', name: 'Accounts Payable', type: 'liability', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '21000', name: 'VAT Payable', type: 'liability', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '22000', name: 'Accrued Liabilities', type: 'liability', isActive: true, isSystem: false, normalBalance: 'credit' },
  { code: '24000', name: 'Deferred Revenue', type: 'liability', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '25000', name: 'Long-term Debt', type: 'liability', isActive: true, isSystem: false, normalBalance: 'credit' },
  
  // EQUITY (30000-39999)
  { code: '30100', name: 'Share Capital', type: 'equity', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '32000', name: 'Retained Earnings', type: 'equity', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '33000', name: 'Current Year Profit/Loss', type: 'equity', isActive: true, isSystem: true, normalBalance: 'credit' },
  
  // REVENUE (40000-49999)
  { code: '40100', name: 'Sales Revenue', type: 'revenue', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '40200', name: 'Service Revenue', type: 'revenue', isActive: true, isSystem: false, normalBalance: 'credit' },
  { code: '40300', name: 'Membership Revenue', type: 'revenue', isActive: true, isSystem: true, normalBalance: 'credit' },
  { code: '49000', name: 'Other Income', type: 'revenue', isActive: true, isSystem: false, normalBalance: 'credit' },
  
  // EXPENSES (50000-99999)
  { code: '50100', name: 'Cost of Goods Sold', type: 'expense', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '50200', name: 'Inventory Write-off', type: 'expense', isActive: true, isSystem: true, normalBalance: 'debit' },
  { code: '60100', name: 'Salaries and Wages', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '60200', name: 'Rent Expense', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '60300', name: 'Utilities Expense', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '60400', name: 'Marketing and Advertising', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '60500', name: 'Depreciation Expense', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '60600', name: 'Bank Charges', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
  { code: '69000', name: 'Other Expenses', type: 'expense', isActive: true, isSystem: false, normalBalance: 'debit' },
];

// ============================================
// 🔧 ACCOUNT CODE MAPPING
// Maps transaction types to account codes
// ============================================

export interface AccountCodeMapping {
  // Cash accounts by payment method
  cashLak: string;
  cashUsd: string;
  cashThb: string;
  lightning: string;
  bankBcel: string;
  bankLdb: string;
  bankJdb: string;
  // Revenue accounts
  salesRevenue: string;
  membershipRevenue: string;
  serviceRevenue: string;
  // Liability accounts
  vatPayable: string;
  deferredRevenue: string;
  accountsPayable: string;
  // Asset accounts
  inventory: string;
  accountsReceivable: string;
  // Expense accounts
  cogs: string;
  inventoryLoss: string;
  // Equity
  retainedEarnings: string;
}

export const LAO_ACCOUNT_MAPPING: AccountCodeMapping = {
  cashLak: '1110',
  cashUsd: '1120',
  cashThb: '1130',
  lightning: '1150',
  bankBcel: '1200',
  bankLdb: '1210',
  bankJdb: '1220',
  salesRevenue: '4100',
  membershipRevenue: '4200',
  serviceRevenue: '4300',
  vatPayable: '2200',
  deferredRevenue: '2400',
  accountsPayable: '2100',
  inventory: '1300',
  accountsReceivable: '1400',
  cogs: '5100',
  inventoryLoss: '5200',
  retainedEarnings: '3200',
};

export const GLOBAL_ACCOUNT_MAPPING: AccountCodeMapping = {
  cashLak: '10110',
  cashUsd: '10110',
  cashThb: '10110',
  lightning: '10150',
  bankBcel: '10120',
  bankLdb: '10120',
  bankJdb: '10120',
  salesRevenue: '40100',
  membershipRevenue: '40300',
  serviceRevenue: '40200',
  vatPayable: '21000',
  deferredRevenue: '24000',
  accountsPayable: '20100',
  inventory: '12000',
  accountsReceivable: '11000',
  cogs: '50100',
  inventoryLoss: '50200',
  retainedEarnings: '32000',
};

/**
 * Get account mapping for a standard
 */
export function getAccountMapping(standard: AccountingStandard): AccountCodeMapping {
  return standard === 'lao' ? LAO_ACCOUNT_MAPPING : GLOBAL_ACCOUNT_MAPPING;
}

/**
 * Get chart of accounts for a standard
 */
export function getDefaultChartOfAccounts(standard: AccountingStandard): Omit<Account, 'createdAt' | 'updatedAt'>[] {
  return standard === 'lao' ? LAO_CHART_OF_ACCOUNTS : GLOBAL_CHART_OF_ACCOUNTS;
}
