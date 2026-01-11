// composables/use-settings-sync.ts
// 🔄 Unified Settings Sync Manager
// Syncs Lightning, Receipt, Tax settings to Nostr with company code encryption

import { ref, computed } from "vue";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// Setting types for sync
import type { LightningProvider } from "~/types";

interface SyncedSettings {
  lightning?: {
    provider?: LightningProvider;
    nodeUrl?: string;
    apiKey?: string;
    accessToken?: string;
    blinkApiKey?: string;
    nwcConnectionString?: string;
    lightningAddress?: string;
    bolt12Offer?: string;
    isConfigured?: boolean;
  };
  receipt?: {
    logo?: string;
    showLogo?: boolean;
    header?: {
      businessName?: string;
      address?: string;
      phone?: string;
      email?: string;
      taxId?: string;
      customText?: string;
    };
    content?: {
      showOrderSequence?: boolean;
      showOrderNumber?: boolean;
      showDateTime?: boolean;
      showCashier?: boolean;
      showTax?: boolean;
    };
    footer?: {
      thankYouMessage?: string;
      returnPolicy?: string;
      customText?: string;
      showQrCode?: boolean;
      showBarcode?: boolean;
    };
    paper?: {
      width?: "58mm" | "80mm" | "112mm";
      fontSize?: number;
      copies?: number;
      autoPrint?: boolean;
    };
  };
  tax?: {
    settings?: {
      taxEnabled?: boolean;
      pricesIncludeTax?: boolean;
      showTaxOnReceipt?: boolean;
      roundingMethod?: "round" | "floor" | "ceil";
    };
    rates?: Array<{
      id: string;
      name: string;
      rate: number;
      description?: string;
      categories?: string[];
      isActive: boolean;
      isDefault: boolean;
    }>;
  };
  bankAccounts?: Array<{
    id: string;
    bankCode?: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    qrCode?: string;
    isActive: boolean;
    isDefault?: boolean;
  }>;
  cloudinary?: {
    cloudName?: string;
    uploadPreset?: string;
    apiKey?: string;
  };
  syncedAt?: string;
  version?: number;
}

// Nostr event kind for synced settings (using replaceable event)
const SETTINGS_IDENTIFIER = "bnos-settings-v1";

// Singleton state
const isSyncing = ref(false);
const lastSyncAt = ref<string | null>(null);
const syncError = ref<string | null>(null);
const isInitialized = ref(false);

export function useSettingsSync() {
  const company = useCompany();
  const nostrData = useNostrData();
  const nostrRelay = useNostrRelay();

  // ============================================
  // 📤 SYNC TO NOSTR
  // ============================================

  /**
   * Sync all settings to Nostr (encrypted with company code)
   */
  async function syncAllSettings(): Promise<boolean> {
    const code = company.companyCode.value;
    if (!code) {
      syncError.value = "Company code not set";
      console.error("[SettingsSync] No company code available");
      return false;
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
      // Collect all settings
      const settings = await collectAllSettings();
      settings.syncedAt = new Date().toISOString();
      settings.version = 1;

      // Encrypt with company code
      const encrypted = await company.encryptWithCode(settings, code);
      if (!encrypted) {
        throw new Error("Encryption failed - crypto not available");
      }

      // Publish to Nostr
      const event = await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.STORE_SETTINGS,
        { ct: encrypted, v: 4 }, // v4 = company code encrypted
        SETTINGS_IDENTIFIER,
        [
          ["c", company.companyCodeHash.value || ""],
          ["type", "settings-sync"],
          ["client", "bnos.space"],
        ],
        false // Don't double encrypt
      );

      if (event) {
        lastSyncAt.value = settings.syncedAt;
        console.log("[SettingsSync] Settings synced to Nostr");

        // Log settings change to audit log
        try {
          const { logActivity } = useAuditLog();
          await logActivity(
            "settings_change",
            "Synced shop settings to cloud",
            {
              resourceType: "settings",
              metadata: {
                settingsVersion: settings.version,
              },
            }
          );
        } catch {
          // Don't block sync if logging fails
        }

        return true;
      }

      throw new Error("Failed to publish to Nostr");
    } catch (error) {
      syncError.value = error instanceof Error ? error.message : "Sync failed";
      console.error("[SettingsSync] Sync failed:", error);
      return false;
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * Collect settings from all composables
   */
  async function collectAllSettings(): Promise<SyncedSettings> {
    const settings: SyncedSettings = {};

    // Lightning settings
    try {
      const lightning = useLightning();
      const lightningSettings = await lightning.loadSettings();
      if (lightningSettings.isConfigured) {
        settings.lightning = {
          provider: lightningSettings.provider,
          nodeUrl: lightningSettings.nodeUrl,
          apiKey: lightningSettings.apiKey,
          accessToken: lightningSettings.accessToken,
          blinkApiKey: lightningSettings.blinkApiKey,
          nwcConnectionString: lightningSettings.nwcConnectionString,
          lightningAddress: lightningSettings.lightningAddress,
          bolt12Offer: lightningSettings.bolt12Offer,
          isConfigured: lightningSettings.isConfigured,
        };
      }
    } catch (e) {
      console.warn("[SettingsSync] Failed to collect Lightning settings:", e);
    }

    // Receipt settings
    try {
      const receiptSettings = useReceiptSettings();
      const current = receiptSettings.settings.value;
      if (current) {
        settings.receipt = {
          logo: current.logo,
          showLogo: current.showLogo,
          header: current.header,
          content: current.content,
          footer: current.footer,
          paper: current.paper,
        };
      }
    } catch (e) {
      console.warn("[SettingsSync] Failed to collect Receipt settings:", e);
    }

    // Tax settings and rates
    try {
      const tax = useTax();
      settings.tax = {
        settings: {
          taxEnabled: tax.settings.value.taxEnabled,
          pricesIncludeTax: tax.settings.value.pricesIncludeTax,
          showTaxOnReceipt: tax.settings.value.showTaxOnReceipt,
          roundingMethod: tax.settings.value.roundingMethod,
        },
        rates: tax.rates.value,
      };
    } catch (e) {
      console.warn("[SettingsSync] Failed to collect Tax settings:", e);
    }

    // Bank accounts
    try {
      const bankAccounts = useBankAccounts();
      if (bankAccounts.bankAccounts.value.length > 0) {
        settings.bankAccounts = bankAccounts.bankAccounts.value.map((acc) => ({
          id: acc.id,
          bankCode: acc.bankCode,
          bankName: acc.bankName,
          accountName: acc.accountName,
          accountNumber: acc.accountNumber,
          qrCode: acc.qrCode,
          isActive: acc.isActive,
          isDefault: acc.isDefault,
        }));
      }
    } catch (e) {
      console.warn("[SettingsSync] Failed to collect Bank accounts:", e);
    }

    // Cloudinary config
    try {
      const cloudinary = useCloudinary();
      const cloudConfig = cloudinary.getConfig();
      if (cloudConfig) {
        settings.cloudinary = {
          cloudName: cloudConfig.cloudName,
          uploadPreset: cloudConfig.uploadPreset,
          apiKey: cloudConfig.apiKey,
        };
      }
    } catch (e) {
      console.warn("[SettingsSync] Failed to collect Cloudinary config:", e);
    }

    return settings;
  }

  // ============================================
  // 📥 FETCH FROM NOSTR
  // ============================================

  /**
   * Fetch settings from Nostr (for staff login)
   */
  async function fetchSettingsFromNostr(
    companyCode: string
  ): Promise<SyncedSettings | null> {
    isSyncing.value = true;
    syncError.value = null;

    try {
      const codeHash = await company.hashCompanyCode(companyCode);

      // Query Nostr for settings with company code hash
      const filter = {
        kinds: [NOSTR_KINDS.STORE_SETTINGS],
        "#c": [codeHash],
        "#type": ["settings-sync"],
        limit: 1,
      };

      const events = await nostrRelay.queryEvents(filter as any);

      if (events.length === 0) {
        console.log("[SettingsSync] No synced settings found on Nostr");
        return null;
      }

      const event = events[0]!;
      const payload = JSON.parse(event.content);

      // Check if company code encrypted (v4)
      if (payload.v === 4 && payload.ct) {
        const decrypted = await company.decryptWithCode<SyncedSettings>(
          payload.ct,
          companyCode
        );
        if (decrypted) {
          lastSyncAt.value = decrypted.syncedAt || null;
          console.log("[SettingsSync] Settings fetched and decrypted");
          return decrypted;
        }
      }

      syncError.value = "Failed to decrypt settings";
      return null;
    } catch (error) {
      syncError.value = error instanceof Error ? error.message : "Fetch failed";
      console.error("[SettingsSync] Fetch failed:", error);
      return null;
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * Apply fetched settings to local composables
   */
  async function applySettings(settings: SyncedSettings): Promise<void> {
    // Apply Lightning settings
    if (settings.lightning) {
      try {
        const lightning = useLightning();
        await lightning.saveSettings(settings.lightning as any);
        console.log("[SettingsSync] Applied Lightning settings");
      } catch (e) {
        console.warn("[SettingsSync] Failed to apply Lightning settings:", e);
      }
    }

    // Apply Receipt settings
    if (settings.receipt) {
      try {
        const receiptSettings = useReceiptSettings();
        if (settings.receipt.header) {
          receiptSettings.updateHeader(settings.receipt.header);
        }
        if (settings.receipt.content) {
          receiptSettings.updateContent(settings.receipt.content);
        }
        if (settings.receipt.footer) {
          receiptSettings.updateFooter(settings.receipt.footer);
        }
        if (settings.receipt.paper) {
          receiptSettings.updatePaper(settings.receipt.paper);
        }
        if (settings.receipt.logo !== undefined) {
          receiptSettings.saveSettings({
            logo: settings.receipt.logo,
            showLogo: settings.receipt.showLogo,
          });
        }
        console.log("[SettingsSync] Applied Receipt settings");
      } catch (e) {
        console.warn("[SettingsSync] Failed to apply Receipt settings:", e);
      }
    }

    // Apply Tax settings
    if (settings.tax) {
      try {
        const tax = useTax();
        if (settings.tax.settings) {
          tax.updateSettings(settings.tax.settings);
        }
        if (settings.tax.rates && settings.tax.rates.length > 0) {
          // Replace tax rates
          tax.rates.value = settings.tax.rates;
          tax.saveRates();
        }
        console.log("[SettingsSync] Applied Tax settings");
      } catch (e) {
        console.warn("[SettingsSync] Failed to apply Tax settings:", e);
      }
    }

    // Apply Bank accounts
    if (settings.bankAccounts && settings.bankAccounts.length > 0) {
      try {
        const bankAccountsComposable = useBankAccounts();
        // Replace all bank accounts
        bankAccountsComposable.bankAccounts.value =
          settings.bankAccounts as any;
        bankAccountsComposable.saveAccounts();
        console.log("[SettingsSync] Applied Bank accounts");
      } catch (e) {
        console.warn("[SettingsSync] Failed to apply Bank accounts:", e);
      }
    }

    // Apply Cloudinary config
    if (settings.cloudinary && settings.cloudinary.cloudName) {
      try {
        const cloudinary = useCloudinary();
        cloudinary.saveConfig({
          cloudName: settings.cloudinary.cloudName,
          uploadPreset: settings.cloudinary.uploadPreset || "",
          apiKey: settings.cloudinary.apiKey,
        });
        console.log("[SettingsSync] Applied Cloudinary config");
      } catch (e) {
        console.warn("[SettingsSync] Failed to apply Cloudinary config:", e);
      }
    }
  }

  /**
   * Fetch and apply settings (for staff login flow)
   */
  async function fetchAndApplySettings(companyCode: string): Promise<boolean> {
    const settings = await fetchSettingsFromNostr(companyCode);
    if (settings) {
      await applySettings(settings);
      return true;
    }
    return false;
  }

  // ============================================
  // 📊 STATUS
  // ============================================

  const syncStatus = computed(() => {
    if (isSyncing.value) return "syncing";
    if (syncError.value) return "error";
    if (lastSyncAt.value) return "synced";
    return "not_synced";
  });

  return {
    // State
    isSyncing: computed(() => isSyncing.value),
    lastSyncAt: computed(() => lastSyncAt.value),
    syncError: computed(() => syncError.value),
    syncStatus,

    // Actions
    syncAllSettings,
    fetchSettingsFromNostr,
    applySettings,
    fetchAndApplySettings,
    collectAllSettings,
  };
}
