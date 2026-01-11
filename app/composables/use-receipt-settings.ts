/**
 * Receipt Settings Composable
 *
 * Centralized management of receipt settings with localStorage persistence.
 * Used by both the settings page and the receipt generation composable.
 */

import { computed } from "vue";

// ============================================
// Types
// ============================================

export interface ReceiptHeaderSettings {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  customText: string;
}

export interface ReceiptContentSettings {
  showOrderSequence: boolean;
  showOrderNumber: boolean;
  showDateTime: boolean;
  showCashier: boolean;
  showCustomer: boolean;
  showItemSku: boolean;
  showItemPrice: boolean;
  showSubtotal: boolean;
  showDiscount: boolean;
  showTax: boolean;
  showTaxBreakdown: boolean;
  showPaymentMethod: boolean;
  showChange: boolean;
  showPromotionDetails: boolean; // Show detailed promotions section (hide to save paper)
}

export interface ReceiptFooterSettings {
  thankYouMessage: string;
  returnPolicy: string;
  customText: string;
  showQrCode: boolean;
  showBarcode: boolean;
  showSocialMedia: boolean;
  showWebsite: boolean;
  websiteUrl: string;
}

export interface ReceiptPaperSettings {
  width: "58mm" | "80mm" | "112mm";
  fontSize: number;
  copies: number;
  autoPrint: boolean;
}

export type LogoStorageType = "local" | "cloudinary";

export interface SavedReceiptSettings {
  // Logo
  logo: string;
  logoStorageType: LogoStorageType;
  showLogo: boolean;

  // E-Bill Settings
  eBillBaseUrl: string; // Custom base URL for QR codes (e.g., http://192.168.1.100:3000)

  // Sections
  header: ReceiptHeaderSettings;
  content: ReceiptContentSettings;
  footer: ReceiptFooterSettings;
  paper: ReceiptPaperSettings;
}

// ============================================
// Constants
// ============================================

const RECEIPT_SETTINGS_KEY = "pos_receipt_settings";

// Default settings
const defaultSettings: SavedReceiptSettings = {
  logo: "",
  logoStorageType: "local",
  showLogo: true,
  eBillBaseUrl: "", // Empty = auto-detect from window.location
  header: {
    businessName: "Bit Space",
    address: "",
    phone: "",
    email: "",
    taxId: "",
    customText: "",
  },
  content: {
    showOrderSequence: true,
    showOrderNumber: true,
    showDateTime: true,
    showCashier: true,
    showCustomer: true,
    showItemSku: false,
    showItemPrice: true,
    showSubtotal: true,
    showDiscount: true,
    showTax: true,
    showTaxBreakdown: false,
    showPaymentMethod: true,
    showChange: true,
    showPromotionDetails: false, // Default: hide to save paper
  },
  footer: {
    thankYouMessage: "🥰 ຂອບມຸກຄອບຫໍ່ 🙏 !",
    returnPolicy: "",
    customText: "",
    showQrCode: false,
    showBarcode: false,
    showSocialMedia: false,
    showWebsite: false,
    websiteUrl: "",
  },
  paper: {
    width: "80mm",
    fontSize: 12,
    copies: 1,
    autoPrint: false,
  },
};

// ============================================
// Composable
// ============================================

// Global state (singleton pattern)
const settings = useState<SavedReceiptSettings>("receipt-settings", () => ({
  ...defaultSettings,
}));
const isLoaded = useState<boolean>("receipt-settings-loaded", () => false);

export function useReceiptSettings() {
  /**
   * Load settings from localStorage
   */
  const loadSettings = (): SavedReceiptSettings => {
    if (typeof window === "undefined") {
      return { ...defaultSettings };
    }

    try {
      const saved = localStorage.getItem(RECEIPT_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Deep merge with defaults to handle missing properties
        settings.value = deepMerge(defaultSettings, parsed);
      } else {
        settings.value = { ...defaultSettings };
      }
      isLoaded.value = true;
    } catch (error) {
      console.error("[ReceiptSettings] Failed to load settings:", error);
      settings.value = { ...defaultSettings };
    }

    return settings.value;
  };

  /**
   * Save settings to localStorage
   */
  const saveSettings = (
    newSettings?: Partial<SavedReceiptSettings>
  ): boolean => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      if (newSettings) {
        settings.value = { ...settings.value, ...newSettings };
      }
      localStorage.setItem(
        RECEIPT_SETTINGS_KEY,
        JSON.stringify(settings.value)
      );
      return true;
    } catch (error) {
      console.error("[ReceiptSettings] Failed to save settings:", error);
      return false;
    }
  };

  /**
   * Update a specific section of settings
   */
  const updateHeader = (header: Partial<ReceiptHeaderSettings>) => {
    settings.value.header = { ...settings.value.header, ...header };
    saveSettings();
  };

  const updateContent = (content: Partial<ReceiptContentSettings>) => {
    settings.value.content = { ...settings.value.content, ...content };
    saveSettings();
  };

  const updateFooter = (footer: Partial<ReceiptFooterSettings>) => {
    settings.value.footer = { ...settings.value.footer, ...footer };
    saveSettings();
  };

  const updatePaper = (paper: Partial<ReceiptPaperSettings>) => {
    settings.value.paper = { ...settings.value.paper, ...paper };
    saveSettings();
  };

  /**
   * Update logo with storage type
   */
  const setLogo = (
    logoData: string,
    storageType: LogoStorageType = "local"
  ) => {
    settings.value.logo = logoData;
    settings.value.logoStorageType = storageType;
    saveSettings();
  };

  /**
   * Clear logo
   */
  const clearLogo = () => {
    settings.value.logo = "";
    saveSettings();
  };

  /**
   * Reset to defaults
   */
  const resetToDefaults = () => {
    settings.value = { ...defaultSettings };
    saveSettings();
  };

  /**
   * Get defaults for reference
   */
  const getDefaults = (): SavedReceiptSettings => {
    return { ...defaultSettings };
  };

  // Computed helpers for receipt generation
  const merchantName = computed(() => settings.value.header.businessName);
  const merchantAddress = computed(() => settings.value.header.address);
  const merchantPhone = computed(() => settings.value.header.phone);
  const merchantEmail = computed(() => settings.value.header.email);
  const logoUrl = computed(() => settings.value.logo);
  const showLogo = computed(
    () => settings.value.showLogo && !!settings.value.logo
  );
  const footerMessage = computed(() => settings.value.footer.thankYouMessage);
  const paperWidth = computed(() => settings.value.paper.width);
  const fontSize = computed(() => settings.value.paper.fontSize);
  const autoPrint = computed(() => settings.value.paper.autoPrint);
  const copies = computed(() => settings.value.paper.copies);

  // Auto-load on first use (client-side only)
  if (typeof window !== "undefined" && !isLoaded.value) {
    loadSettings();
  }

  return {
    // State
    settings,
    isLoaded,

    // Methods
    loadSettings,
    saveSettings,
    updateHeader,
    updateContent,
    updateFooter,
    updatePaper,
    setLogo,
    clearLogo,
    resetToDefaults,
    getDefaults,

    // Computed helpers
    merchantName,
    merchantAddress,
    merchantPhone,
    merchantEmail,
    logoUrl,
    showLogo,
    footerMessage,
    paperWidth,
    fontSize,
    autoPrint,
    copies,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === "object" &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === "object" &&
        target[key] !== null
      ) {
        result[key] = deepMerge(target[key], source[key] as any);
      } else {
        result[key] = source[key] as any;
      }
    }
  }

  return result;
}
