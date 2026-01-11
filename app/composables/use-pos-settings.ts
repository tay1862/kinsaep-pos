/**
 * POS Settings Composable
 *
 * Centralized management of POS-specific settings with localStorage persistence.
 * Used for configuring POS behavior like auto-close kitchen status on payment.
 */

import { computed } from "vue";

// ============================================
// Types
// ============================================

export interface POSSettings {
  // Kitchen Management
  autoCloseKitchenStatusOnPayment: boolean; // Auto-close (serve) kitchen orders when payment is completed

  // Future settings can be added here
  // autoOpenCashDrawer?: boolean;
  // requireReceiptPrint?: boolean;
  // etc.
}

// ============================================
// Constants
// ============================================

const POS_SETTINGS_KEY = "pos_settings";

// Default settings
const defaultSettings: POSSettings = {
  autoCloseKitchenStatusOnPayment: false, // Default OFF for backward compatibility
};

// ============================================
// Composable
// ============================================

// Global state (singleton pattern)
const settings = useState<POSSettings>("pos-settings", () => ({
  ...defaultSettings,
}));
const isLoaded = useState<boolean>("pos-settings-loaded", () => false);

export function usePOSSettings() {
  /**
   * Load settings from localStorage
   */
  const loadSettings = (): POSSettings => {
    if (typeof window === "undefined") {
      return { ...defaultSettings };
    }

    try {
      const saved = localStorage.getItem(POS_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle missing properties
        settings.value = { ...defaultSettings, ...parsed };
      } else {
        settings.value = { ...defaultSettings };
      }
      isLoaded.value = true;
    } catch (error) {
      console.error("[POSSettings] Failed to load settings:", error);
      settings.value = { ...defaultSettings };
    }

    return settings.value;
  };

  /**
   * Save settings to localStorage
   */
  const saveSettings = (newSettings?: Partial<POSSettings>): boolean => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      if (newSettings) {
        settings.value = { ...settings.value, ...newSettings };
      }
      localStorage.setItem(POS_SETTINGS_KEY, JSON.stringify(settings.value));
      return true;
    } catch (error) {
      console.error("[POSSettings] Failed to save settings:", error);
      return false;
    }
  };

  /**
   * Update specific settings
   */
  const updateSettings = (updates: Partial<POSSettings>) => {
    settings.value = { ...settings.value, ...updates };
    saveSettings();
  };

  /**
   * Toggle auto-close kitchen status
   */
  const toggleAutoCloseKitchenStatus = () => {
    settings.value.autoCloseKitchenStatusOnPayment =
      !settings.value.autoCloseKitchenStatusOnPayment;
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
  const getDefaults = (): POSSettings => {
    return { ...defaultSettings };
  };

  // Computed helpers
  const autoCloseKitchenStatusOnPayment = computed(
    () => settings.value.autoCloseKitchenStatusOnPayment
  );

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
    updateSettings,
    toggleAutoCloseKitchenStatus,
    resetToDefaults,
    getDefaults,

    // Computed helpers
    autoCloseKitchenStatusOnPayment,
  };
}
