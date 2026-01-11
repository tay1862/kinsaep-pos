/**
 * Bank Accounts Composable
 *
 * Manages bank accounts for payment processing with localStorage persistence.
 * Used by PaymentBankTransfer component and settings page.
 */

import { ref, computed } from "vue";
import type { BankAccount } from "~/types";

// ============================================
// Constants
// ============================================

const BANK_ACCOUNTS_KEY = "pos_bank_accounts";

// Default bank icons by code
const BANK_ICONS: Record<string, string> = {
  bcel: "🏦",
  ldb: "🏛️",
  jdb: "💳",
  apb: "🌾",
  stb: "🏪",
  default: "🏦",
};

// ============================================
// State (Global Singleton)
// ============================================

const bankAccounts = ref<BankAccount[]>([]);
const isLoaded = ref(false);

// ============================================
// Composable
// ============================================

export function useBankAccounts() {
  /**
   * Load bank accounts from localStorage
   */
  const loadAccounts = (): BankAccount[] => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const saved = localStorage.getItem(BANK_ACCOUNTS_KEY);
      if (saved) {
        bankAccounts.value = JSON.parse(saved);
      }
      isLoaded.value = true;
    } catch (error) {
      console.error("[BankAccounts] Failed to load:", error);
      bankAccounts.value = [];
    }

    return bankAccounts.value;
  };

  /**
   * Save bank accounts to localStorage
   */
  const saveAccounts = (): boolean => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      localStorage.setItem(
        BANK_ACCOUNTS_KEY,
        JSON.stringify(bankAccounts.value)
      );
      return true;
    } catch (error) {
      console.error("[BankAccounts] Failed to save:", error);
      return false;
    }
  };

  /**
   * Add a new bank account
   */
  const addAccount = (account: Omit<BankAccount, "id">): BankAccount => {
    const newAccount: BankAccount = {
      ...account,
      id: `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // If this is the first account or marked as default, ensure it's the only default
    if (account.isDefault || bankAccounts.value.length === 0) {
      bankAccounts.value.forEach((acc) => (acc.isDefault = false));
      newAccount.isDefault = true;
    }

    bankAccounts.value.push(newAccount);
    saveAccounts();

    return newAccount;
  };

  /**
   * Update an existing bank account
   */
  const updateAccount = (
    id: string,
    updates: Partial<BankAccount>
  ): boolean => {
    const index = bankAccounts.value.findIndex((acc) => acc.id === id);
    if (index === -1) return false;

    // Handle default flag - only one can be default
    if (updates.isDefault) {
      bankAccounts.value.forEach((acc) => (acc.isDefault = false));
    }

    bankAccounts.value[index] = {
      ...bankAccounts.value[index],
      ...updates,
    } as BankAccount;
    saveAccounts();

    return true;
  };

  /**
   * Delete a bank account
   */
  const deleteAccount = (id: string): boolean => {
    const index = bankAccounts.value.findIndex((acc) => acc.id === id);
    if (index === -1) return false;

    const wasDefault = bankAccounts.value[index].isDefault;
    bankAccounts.value.splice(index, 1);

    // If deleted account was default, make first active account the new default
    if (wasDefault && bankAccounts.value.length > 0) {
      const firstActive = bankAccounts.value.find((acc) => acc.isActive);
      if (firstActive) {
        firstActive.isDefault = true;
      }
    }

    saveAccounts();
    return true;
  };

  /**
   * Set a bank account as default
   */
  const setDefault = (id: string): boolean => {
    const account = bankAccounts.value.find((acc) => acc.id === id);
    if (!account) return false;

    bankAccounts.value.forEach((acc) => (acc.isDefault = false));
    account.isDefault = true;
    saveAccounts();

    return true;
  };

  /**
   * Toggle account active status
   */
  const toggleActive = (id: string): boolean => {
    const account = bankAccounts.value.find((acc) => acc.id === id);
    if (!account) return false;

    account.isActive = !account.isActive;
    saveAccounts();

    return true;
  };

  /**
   * Get bank icon by ID or code
   */
  const getBankIcon = (bankIdOrCode?: string): string => {
    if (!bankIdOrCode) return BANK_ICONS.default;
    return BANK_ICONS[bankIdOrCode.toLowerCase()] || BANK_ICONS.default;
  };

  // Computed helpers
  const activeAccounts = computed(() =>
    bankAccounts.value.filter((acc) => acc.isActive)
  );

  const defaultAccount = computed(() =>
    bankAccounts.value.find((acc) => acc.isDefault && acc.isActive)
  );

  const hasAccounts = computed(() => bankAccounts.value.length > 0);

  const hasActiveAccounts = computed(() => activeAccounts.value.length > 0);

  // Auto-load on first use
  if (typeof window !== "undefined" && !isLoaded.value) {
    loadAccounts();
  }

  return {
    // State
    bankAccounts,
    isLoaded,

    // Computed
    activeAccounts,
    defaultAccount,
    hasAccounts,
    hasActiveAccounts,

    // Methods
    loadAccounts,
    saveAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    setDefault,
    toggleActive,
    getBankIcon,
    BANK_ICONS,
  };
}
