// composables/use-tax.ts
// 💰 Tax Management Composable
// Shared tax settings and calculation logic for POS integration

import { ref, computed } from "vue";

// ============================================
// TYPES
// ============================================

export interface TaxRate {
  id: string;
  name: string;
  rate: number; // Percentage (e.g., 10 = 10%)
  description?: string;
  categories?: string[]; // Product categories this rate applies to
  isActive: boolean;
  isDefault: boolean;
}

export interface TaxSettings {
  taxEnabled: boolean;
  pricesIncludeTax: boolean; // If true, prices already include tax
  showTaxOnReceipt: boolean;
  roundingMethod: "round" | "floor" | "ceil";
}

// ============================================
// STORAGE KEYS
// ============================================

const TAX_SETTINGS_KEY = "taxSettings";
const TAX_RATES_KEY = "taxRates";

// ============================================
// SINGLETON STATE
// ============================================

const isInitialized = ref(false);

const taxSettings = ref<TaxSettings>({
  taxEnabled: true,
  pricesIncludeTax: false,
  showTaxOnReceipt: true,
  roundingMethod: "round",
});

const taxRates = ref<TaxRate[]>([]);

// ============================================
// COMPOSABLE
// ============================================

export function useTax() {
  // ============================================
  // INITIALIZATION
  // ============================================

  const loadSettings = () => {
    if (typeof window === "undefined") return;

    try {
      // Load tax settings
      const savedSettings = localStorage.getItem(TAX_SETTINGS_KEY);
      if (savedSettings) {
        taxSettings.value = {
          ...taxSettings.value,
          ...JSON.parse(savedSettings),
        };
      }

      // Load tax rates
      const savedRates = localStorage.getItem(TAX_RATES_KEY);
      if (savedRates) {
        taxRates.value = JSON.parse(savedRates);
      }

      isInitialized.value = true;
    } catch (e) {
      console.error("Failed to load tax settings:", e);
    }
  };

  const saveSettings = () => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(TAX_SETTINGS_KEY, JSON.stringify(taxSettings.value));
    } catch (e) {
      console.error("Failed to save tax settings:", e);
    }
  };

  const saveRates = () => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(TAX_RATES_KEY, JSON.stringify(taxRates.value));
    } catch (e) {
      console.error("Failed to save tax rates:", e);
    }
  };

  // Auto-initialize on first use
  if (!isInitialized.value && typeof window !== "undefined") {
    loadSettings();
  }

  // ============================================
  // COMPUTED
  // ============================================

  const isEnabled = computed(() => taxSettings.value.taxEnabled);

  const defaultTaxRate = computed<TaxRate | null>(() => {
    return taxRates.value.find((r) => r.isDefault && r.isActive) || null;
  });

  const defaultRate = computed<number>(() => {
    return defaultTaxRate.value?.rate || 0;
  });

  const activeTaxRates = computed(() => {
    return taxRates.value.filter((r) => r.isActive);
  });

  // ============================================
  // TAX RATE MANAGEMENT
  // ============================================

  const addTaxRate = (rate: Omit<TaxRate, "id">) => {
    // If setting as default, unset other defaults
    if (rate.isDefault) {
      taxRates.value.forEach((r) => (r.isDefault = false));
    }

    taxRates.value.push({
      ...rate,
      id: `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });

    saveRates();
  };

  const updateTaxRate = (id: string, updates: Partial<TaxRate>) => {
    const index = taxRates.value.findIndex((r) => r.id === id);
    if (index === -1) return;

    // If setting as default, unset other defaults
    if (updates.isDefault) {
      taxRates.value.forEach((r) => (r.isDefault = false));
    }

    taxRates.value[index] = { ...taxRates.value[index], ...updates };
    saveRates();
  };

  const deleteTaxRate = (id: string) => {
    const rate = taxRates.value.find((r) => r.id === id);
    if (rate?.isDefault) return; // Can't delete default rate

    taxRates.value = taxRates.value.filter((r) => r.id !== id);
    saveRates();
  };

  const updateSettings = (updates: Partial<TaxSettings>) => {
    taxSettings.value = { ...taxSettings.value, ...updates };
    saveSettings();
  };

  // ============================================
  // TAX CALCULATION
  // ============================================

  /**
   * Get tax rate for a specific category
   */
  const getTaxRateForCategory = (category?: string): number => {
    if (!taxSettings.value.taxEnabled) return 0;

    if (category) {
      // Find rate that applies to this category
      const categoryRate = taxRates.value.find(
        (r) => r.isActive && r.categories?.includes(category)
      );
      if (categoryRate) return categoryRate.rate;
    }

    // Fall back to default rate
    return defaultRate.value;
  };

  /**
   * Apply rounding based on settings
   */
  const applyRounding = (value: number): number => {
    switch (taxSettings.value.roundingMethod) {
      case "floor":
        return Math.floor(value);
      case "ceil":
        return Math.ceil(value);
      case "round":
      default:
        return Math.round(value);
    }
  };

  /**
   * Calculate tax for a single amount
   */
  const calculateTaxForAmount = (amount: number, category?: string): number => {
    if (!taxSettings.value.taxEnabled) return 0;

    const rate = getTaxRateForCategory(category);
    if (rate === 0) return 0;

    const taxAmount = amount * (rate / 100);
    return applyRounding(taxAmount);
  };

  /**
   * Calculate tax for cart items with category-aware rates
   * @param items - Array of items with { total, category? }
   * @returns Total tax amount
   */
  const calculateTax = (
    items: Array<{ total: number; category?: string }>
  ): number => {
    if (!taxSettings.value.taxEnabled) return 0;

    let totalTax = 0;

    for (const item of items) {
      const rate = getTaxRateForCategory(item.category);
      if (rate > 0) {
        totalTax += item.total * (rate / 100);
      }
    }

    return applyRounding(totalTax);
  };

  /**
   * Calculate tax for a subtotal using default rate
   * Simple version for when you don't have item-level categories
   */
  const calculateTaxSimple = (subtotal: number): number => {
    if (!taxSettings.value.taxEnabled) return 0;

    const rate = defaultRate.value;
    if (rate === 0) return 0;

    const taxAmount = subtotal * (rate / 100);
    return applyRounding(taxAmount);
  };

  /**
   * Extract tax from a tax-inclusive price
   * Use when pricesIncludeTax is true
   */
  const extractTaxFromPrice = (
    priceWithTax: number,
    category?: string
  ): number => {
    const rate = getTaxRateForCategory(category);
    if (rate === 0) return 0;

    // If price includes tax: taxAmount = price - (price / (1 + rate/100))
    const priceWithoutTax = priceWithTax / (1 + rate / 100);
    return applyRounding(priceWithTax - priceWithoutTax);
  };

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    settings: taxSettings,
    rates: taxRates,
    isInitialized,

    // Computed
    isEnabled,
    defaultTaxRate,
    defaultRate,
    activeTaxRates,

    // Settings Management
    loadSettings,
    saveSettings,
    updateSettings,

    // Rate Management
    addTaxRate,
    updateTaxRate,
    deleteTaxRate,
    saveRates,

    // Tax Calculation
    getTaxRateForCategory,
    calculateTax,
    calculateTaxSimple,
    calculateTaxForAmount,
    extractTaxFromPrice,
    applyRounding,
  };
}
