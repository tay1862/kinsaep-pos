// composables/use-shop.ts
// 🏪 Shop & Branch Configuration Management
// Stores shop settings in Nostr (kind: 30078)

import type {
  Branch,
  StoreSettings,
  GeneralSettings,
  LightningSettings,
  SecuritySettings,
  ShopVisibility,
  ShopType,
  Geolocation,
  BusinessHours,
  MarketplaceProfile,
} from "~/types";

/**
 * Feature flags for enabling/disabling shop modules
 */
export interface EnabledFeatures {
  // Core (always on)
  products: boolean;
  orders: boolean;
  pos: boolean;
  reports: boolean;
  settings: boolean;
  // Optional features
  customers: boolean;
  inventory: boolean;
  kitchen: boolean;
  recipes: boolean;
  ingredients: boolean;
  memberships: boolean;
  accounting: boolean;
  invoicing: boolean;
  delivery: boolean;
  loyalty: boolean;
  contracts: boolean;
  employees: boolean;
  deviceSync: boolean;
}

/**
 * Get default features based on shop type
 */
export function getDefaultFeatures(shopType: ShopType): EnabledFeatures {
  const base: EnabledFeatures = {
    products: true,
    orders: true,
    pos: true,
    reports: true,
    settings: true,
    customers: true,
    inventory: true,
    kitchen: false,
    recipes: false,
    ingredients: false,
    memberships: false,
    accounting: false,
    invoicing: false,
    delivery: false,
    loyalty: false,
    contracts: false,
    employees: false,
    deviceSync: false,
  };

  // Customize based on shop type
  switch (shopType) {
    case "restaurant":
    case "cafe":
      return { ...base, kitchen: true, recipes: true, ingredients: true };
    case "gym":
      return { ...base, memberships: true, inventory: false, kitchen: false };
    case "karaoke":
      return { ...base, kitchen: false, loyalty: true };
    case "garage":
      return { ...base, invoicing: true, inventory: true };
    case "service":
    case "dry_clean":
    case "car_care":
      return { ...base, invoicing: true, inventory: false };
    case "enterprise":
      return {
        ...base,
        customers: true,
        inventory: true,
        kitchen: true,
        recipes: true,
        ingredients: true,
        memberships: true,
        accounting: true,
        invoicing: true,
        delivery: true,
        loyalty: true,
        contracts: true,
        deviceSync: false,
      };
    default:
      return base;
  }
}

export interface ChatSettings {
  enabled: boolean;
}

export interface ShopConfig {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  currency: string;
  timezone: string;
  language: string;
  defaultBranchId?: string;
  taxRate: number;
  tipEnabled: boolean;
  receiptFooter?: string;
  // Shop type & visibility
  visibility: ShopVisibility;
  shopType: ShopType;
  // Feature flags
  enabledFeatures: EnabledFeatures;
  // Chat settings
  chatSettings?: ChatSettings;
  // Marketplace fields
  marketplaceDescription?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    line?: string;
  };
  // Analytics & Tracking
  tags?: string[]; // Custom tags like "coffee", "thai-food", "retail"
  platformTag?: string; // Platform identifier, defaults to "bnos.space"

  // 🛒 MARKETPLACE INTEGRATION (new fields)
  nip05?: string; // Nostr verification (e.g., "shop@bnos.space")
  lud16?: string; // Lightning address for direct payments
  geolocation?: Geolocation; // Store location for map discovery
  businessHours?: BusinessHours; // Operating hours
  services?: string[]; // e.g., ["dine-in", "takeaway", "delivery"]
  paymentMethods?: string[]; // e.g., ["cash", "lightning", "card"]
  acceptsLightning?: boolean;
  acceptsBitcoin?: boolean;
  isListed?: boolean; // Whether store appears in marketplace
  marketplaceJoinedAt?: string; // When store was first published
}

// Singleton state
const shopConfig = useState<ShopConfig | null>("shop-config", () => null);
const currentBranch = useState<Branch | null>("current-branch", () => null);
const isLoading = useState("is-loading", () => false);
const isConfigured = useState("is-configured", () => false);
const error = useState<string | null>("error", () => null);

export function useShop() {
  const nostrData = useNostrData();
  const productsStore = useProductsStore();

  // NOTE: Don't call useMarketplace() here - circular dependency!
  // useMarketplace calls useShop, so we lazy-load it in publishToMarketplace()

  // Check if shop is configured
  const hasShopConfig = computed(() => !!shopConfig.value?.name);
  const hasBranches = computed(() => productsStore.branches.value.length > 0);
  const isSetupComplete = computed(
    () => hasShopConfig.value && hasBranches.value
  );

  // Get all branches from products store
  const branches = computed(() => productsStore.branches.value);

  // Convert StoreSettings to ShopConfig
  function storeSettingsToShopConfig(settings: StoreSettings): ShopConfig {
    const shopType: ShopType =
      (settings.marketplace?.shopType as ShopType) || "other";
    const mp = settings.marketplace;
    return {
      name: settings.general?.storeName || "",
      address: settings.general?.storeAddress,
      phone: settings.general?.storePhone,
      email: settings.general?.storeEmail,
      logo: settings.general?.storeLogo,
      currency: settings.general?.defaultCurrency || "LAK",
      timezone: settings.general?.timezone || "Asia/Vientiane",
      language: settings.general?.language || "en-US",
      taxRate: settings.general?.taxRate || 0,
      tipEnabled: settings.general?.tipEnabled || false,
      receiptFooter: settings.general?.receiptFooter,
      // Shop type & visibility from marketplace settings
      visibility: mp?.visibility || "private",
      shopType,
      enabledFeatures:
        (settings.general?.enabledFeatures as unknown as EnabledFeatures) ||
        getDefaultFeatures(shopType),
      // Marketplace fields
      isListed: mp?.isListed ?? false,
      marketplaceJoinedAt: mp?.marketplaceJoinedAt,
      marketplaceDescription: mp?.marketplaceDescription,
      nip05: mp?.nip05,
      lud16: mp?.lud16,
      services: mp?.services,
      acceptsLightning: mp?.acceptsLightning ?? false,
      acceptsBitcoin: mp?.acceptsBitcoin ?? false,
      tags: mp?.tags,
      platformTag: mp?.platformTag || "bnos.space",
      geolocation: {
        lat: mp?.geolocation?.lat || 0,
        lng: mp?.geolocation?.lng || 0,
        address: mp?.geolocation?.address || "",
        city: mp?.geolocation?.city || "",
        country: mp?.geolocation?.country || "",
      },
      businessHours: {
        monday: { open: "08:00", close: "18:00" },
        tuesday: { open: "08:00", close: "18:00" },
        wednesday: { open: "08:00", close: "18:00" },
        thursday: { open: "08:00", close: "18:00" },
        friday: { open: "08:00", close: "18:00" },
        saturday: { open: "08:00", close: "18:00" },
        sunday: { open: "08:00", close: "18:00" },
        holidays: [],
        timezone: "Asia/Bangkok",
      },
      // Chat settings from Nostr
      chatSettings: settings.chatSettings || { enabled: false },
    };
  }

  // Convert ShopConfig to GeneralSettings
  function shopConfigToGeneralSettings(config: ShopConfig): GeneralSettings {
    return {
      storeName: config.name,
      storeAddress: config.address,
      storePhone: config.phone,
      storeEmail: config.email,
      storeLogo: config.logo,
      defaultCurrency: config.currency as
        | "LAK"
        | "USD"
        | "THB"
        | "BTC"
        | "SATS",
      timezone: config.timezone,
      language: config.language,
      taxRate: config.taxRate,
      tipEnabled: config.tipEnabled,
      tipSuggestions: [10, 15, 20],
      receiptFooter: config.receiptFooter,
      // @ts-ignore - Record<string, boolean> vs EnabledFeatures match
      enabledFeatures: config.enabledFeatures,
    };
  }

  // Default lightning settings
  const defaultLightningSettings: LightningSettings = {
    provider: "lnbits",
    isConfigured: false,
  };

  // Default security settings
  const defaultSecuritySettings: SecuritySettings = {
    dataEncryption: true,
    autoLockTimeout: 30,
    requirePinForRefunds: true,
    requirePinForVoids: true,
    requirePinForDiscounts: false,
    auditLogging: true,
  };

  function loadShopConfigCache(): ShopConfig | null {
    if (import.meta.client) {
      const stored = localStorage.getItem("shopConfig");
      if (stored) {
        shopConfig.value = JSON.parse(stored);
        return shopConfig.value;
      }
    }
    return shopConfig.value;
  }

  // Load shop config from Nostr
  async function loadShopConfig(): Promise<ShopConfig | null> {
    isLoading.value = true;
    error.value = null;

    try {
      // Check localStorage fallback
      if (import.meta.client) {
        const stored = localStorage.getItem("shopConfig");
        if (stored) {
          shopConfig.value = JSON.parse(stored);
          isConfigured.value = true;
          if (!navigator.onLine) {
            return shopConfig.value;
          }
        }
      }

      // Try to get from Nostr (STORE_SETTINGS kind)
      const settings = await nostrData.getSettings();

      if (settings) {
        shopConfig.value = storeSettingsToShopConfig(settings);
        isConfigured.value = true;

        // Set current branch from localStorage or first available
        if (branches.value.length > 0) {
          const storedBranchId = import.meta.client
            ? localStorage.getItem("currentBranchId")
            : null;
          currentBranch.value =
            branches.value.find((b) => b.id === storedBranchId) ||
            branches.value[0] ||
            null;
        }

        return shopConfig.value;
      }

      return null;
    } catch (e) {
      error.value = `Failed to load shop config: ${e}`;
      console.error(error.value);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // Save shop config
  async function saveShopConfig(config: Partial<ShopConfig>): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const shopType = config.shopType ?? shopConfig.value?.shopType ?? "other";
      const newConfig: ShopConfig = {
        name: config.name || shopConfig.value?.name || "",
        address: config.address ?? shopConfig.value?.address,
        phone: config.phone ?? shopConfig.value?.phone,
        email: config.email ?? shopConfig.value?.email,
        logo: config.logo ?? shopConfig.value?.logo,
        currency: config.currency || shopConfig.value?.currency || "LAK",
        timezone:
          config.timezone || shopConfig.value?.timezone || "Asia/Vientiane",
        language: config.language || shopConfig.value?.language || "en-US",
        defaultBranchId:
          config.defaultBranchId ?? shopConfig.value?.defaultBranchId,
        taxRate: config.taxRate ?? shopConfig.value?.taxRate ?? 0,
        tipEnabled: config.tipEnabled ?? shopConfig.value?.tipEnabled ?? false,
        receiptFooter: config.receiptFooter ?? shopConfig.value?.receiptFooter,
        // Shop type & visibility
        visibility:
          config.visibility ?? shopConfig.value?.visibility ?? "private",
        shopType,
        enabledFeatures:
          config.enabledFeatures ??
          shopConfig.value?.enabledFeatures ??
          getDefaultFeatures(shopType),
        chatSettings: config.chatSettings ??
          shopConfig.value?.chatSettings ?? { enabled: false },
        marketplaceDescription:
          config.marketplaceDescription ??
          shopConfig.value?.marketplaceDescription,
        socialLinks: config.socialLinks ?? shopConfig.value?.socialLinks,
        // Analytics & Tracking
        tags: config.tags ?? shopConfig.value?.tags ?? [],
        platformTag:
          config.platformTag ?? shopConfig.value?.platformTag ?? "bnos.space",
        // Marketplace fields (preserve these!)
        nip05: config.nip05 ?? shopConfig.value?.nip05,
        lud16: config.lud16 ?? shopConfig.value?.lud16,
        geolocation: config.geolocation ?? shopConfig.value?.geolocation,
        businessHours: config.businessHours ?? shopConfig.value?.businessHours,
        services: config.services ?? shopConfig.value?.services,
        paymentMethods:
          config.paymentMethods ?? shopConfig.value?.paymentMethods,
        acceptsLightning:
          config.acceptsLightning ??
          shopConfig.value?.acceptsLightning ??
          false,
        acceptsBitcoin:
          config.acceptsBitcoin ?? shopConfig.value?.acceptsBitcoin ?? false,
        isListed: config.isListed ?? shopConfig.value?.isListed ?? false,
        marketplaceJoinedAt:
          config.marketplaceJoinedAt ?? shopConfig.value?.marketplaceJoinedAt,
      };

      // Get existing settings or create new
      const existingSettings = await nostrData.getSettings();
      const updatedSettings: StoreSettings = {
        general: shopConfigToGeneralSettings(newConfig),
        lightning: existingSettings?.lightning || defaultLightningSettings,
        security: existingSettings?.security || defaultSecuritySettings,
        // Save marketplace settings to Nostr!
        marketplace: {
          visibility: newConfig.visibility,
          shopType: newConfig.shopType,
          isListed: newConfig.isListed,
          marketplaceJoinedAt: newConfig.marketplaceJoinedAt,
          marketplaceDescription: newConfig.marketplaceDescription,
          nip05: newConfig.nip05,
          lud16: newConfig.lud16,
          services: newConfig.services,
          acceptsLightning: newConfig.acceptsLightning,
          acceptsBitcoin: newConfig.acceptsBitcoin,
          tags: newConfig.tags,
          platformTag: newConfig.platformTag,
          geolocation: newConfig.geolocation,
          businessHours: newConfig.businessHours,
        },
        // Chat settings (synced across devices for all staff)
        chatSettings: newConfig.chatSettings || { enabled: false },
        updatedAt: new Date().toISOString(),
      };

      // Save to Nostr
      await nostrData.saveSettings(updatedSettings);

      // Also save to localStorage as fallback
      if (import.meta.client) {
        localStorage.setItem("shopConfig", JSON.stringify(newConfig));
      }

      shopConfig.value = newConfig;
      isConfigured.value = true;

      return true;
    } catch (e) {
      error.value = `Failed to save shop config: ${e}`;
      console.error(error.value);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Create first branch
  async function createFirstBranch(
    branch: Omit<Branch, "id">
  ): Promise<Branch | null> {
    try {
      const newBranch = await productsStore.addBranch(branch);
      currentBranch.value = newBranch;

      // Update shop config with default branch
      if (shopConfig.value) {
        await saveShopConfig({ defaultBranchId: newBranch.id });
      }

      return newBranch;
    } catch (e) {
      error.value = `Failed to create branch: ${e}`;
      return null;
    }
  }

  // Set current branch
  function setCurrentBranch(branchId: string): void {
    const branch = branches.value.find((b) => b.id === branchId);
    if (branch) {
      currentBranch.value = branch;
      if (import.meta.client) {
        localStorage.setItem("currentBranchId", branchId);
      }
    }
  }

  // Initialize
  async function init(): Promise<void> {
    // Load products store first (includes branches)
    await productsStore.init();

    // Then load shop config
    await loadShopConfig();
    const storedBranchId = localStorage.getItem("currentBranchId");
    // Try to restore current branch from localStorage
    if (import.meta.client && !currentBranch.value) {
      if (storedBranchId) {
        setCurrentBranch(storedBranchId);
      } else if (branches.value.length > 0) {
        currentBranch.value = branches.value[0] || null;
        localStorage.setItem("currentBranchId", currentBranch.value?.id || "");
      }
    }

    if (!storedBranchId && branches.value.length > 0) {
      currentBranch.value = branches.value[0] || null;
      localStorage.setItem("currentBranchId", currentBranch.value?.id || "");
    }

    // Register shop as workspace for multi-shop support
    if (import.meta.client && shopConfig.value?.name) {
      try {
        const shopManager = useShopManager();
        shopManager.registerCurrentShop();
      } catch (e) {
        console.warn("[Shop] Failed to register workspace:", e);
      }
    }
  }

  // ─────────────────────────────────────────
  // 🛒 MARKETPLACE INTEGRATION FUNCTIONS
  // ─────────────────────────────────────────

  /**
   * Publish store to marketplace for discovery
   * Creates a PUBLIC_STORE_PROFILE event (Kind 30954)
   */
  async function publishToMarketplace(): Promise<boolean> {
    if (!shopConfig.value) {
      error.value = "Shop config not loaded";
      return false;
    }

    try {
      isLoading.value = true;

      // First update the shop config to public
      await saveShopConfig({
        isListed: true,
        visibility: "public",
        marketplaceJoinedAt:
          shopConfig.value.marketplaceJoinedAt || new Date().toISOString(),
      });

      // Get pubkey from localStorage (avoid circular dependency with useMarketplace)
      let pubkey: string | null = null;
      if (import.meta.client) {
        const nostrUser = localStorage.getItem("nostrUser");
        if (nostrUser) {
          try {
            const parsed = JSON.parse(nostrUser);
            pubkey = parsed.pubkey || parsed.publicKey || null;
          } catch {
            console.warn("Failed to parse nostrUser");
          }
        }
      }

      if (!pubkey) {
        console.log(
          "[Shop] No Nostr pubkey found, skipping marketplace publish"
        );
        return true; // Don't fail, just skip Nostr publish
      }

      // Build marketplace profile from shop config
      const config = shopConfig.value;
      const profile: Partial<MarketplaceProfile> = {
        name: config.name || "",
        description: config.marketplaceDescription || config.address || "",
        logo: config.logo,
        shopType: config.shopType || "retail",
        nip05: config.nip05,
        lud16: config.lud16,
        phone: config.phone,
        services: config.services ? [...config.services] : [],
        acceptsLightning: config.acceptsLightning ?? true,
        acceptsBitcoin: config.acceptsBitcoin ?? false,
        isListed: true,
        joinedAt: config.marketplaceJoinedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add geolocation if available
      if (config.geolocation) {
        profile.geolocation = config.geolocation;
      }

      // Add business hours if available
      if (config.businessHours) {
        profile.businessHours = config.businessHours;
      }

      // Build tags for the event
      const tags: string[][] = [
        ["d", pubkey], // Unique identifier
        ["t", config.shopType || "retail"], // Shop type tag
      ];

      // Add service tags
      if (config.services) {
        for (const service of config.services) {
          tags.push(["s", service]);
        }
      }

      // Publish to Nostr using kind 30954 (PUBLIC_STORE_PROFILE)
      const success = await nostrData.publishEvent(
        30954, // NOSTR_KINDS.PUBLIC_STORE_PROFILE
        JSON.stringify(profile),
        tags
      );

      if (success) {
        console.log("✅ Published to marketplace");
        return true;
      } else {
        throw new Error("Failed to publish to Nostr marketplace");
      }
    } catch (e) {
      error.value = `Failed to publish to marketplace: ${e}`;
      console.error(error.value);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Remove store from marketplace discovery
   */
  async function unpublishFromMarketplace(): Promise<boolean> {
    try {
      isLoading.value = true;

      await saveShopConfig({
        isListed: false,
        visibility: "private",
      });

      console.log("🔒 Unpublished from marketplace");
      return true;
    } catch (e) {
      error.value = `Failed to unpublish from marketplace: ${e}`;
      console.error(error.value);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Check if store is currently listed on marketplace
   */
  const isMarketplaceListed = computed(
    () =>
      shopConfig.value?.isListed === true &&
      shopConfig.value?.visibility === "public"
  );

  return {
    // State
    shopConfig: readonly(shopConfig),
    currentBranch: readonly(currentBranch),
    branches,
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
    hasShopConfig,
    hasBranches,
    isSetupComplete,
    isMarketplaceListed,

    // Methods
    init,
    loadShopConfig,
    loadShopConfigCache,
    saveShopConfig,
    createFirstBranch,
    setCurrentBranch,

    // Marketplace Methods
    publishToMarketplace,
    unpublishFromMarketplace,
  };
}
