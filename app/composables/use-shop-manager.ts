// ============================================
// 🏪 MULTI-SHOP MANAGER COMPOSABLE
// Enables users to manage multiple shops/workspaces
// Switch between shops with clean data sync via Nostr
// Syncs workspace list to Nostr (encrypted with user's nsec)
// ============================================

import { ref, computed } from "vue";
import { finalizeEvent } from "nostr-tools/pure";
import { hexToBytes } from "@noble/hashes/utils";
import type { ShopConfig } from "./use-shop";
import type { Event } from "nostr-tools";
import { NOSTR_KINDS } from "~/types/nostr-kinds";
import type { ShopType } from "~/types";
import {
  getShopTypeConfig,
  shouldTrackStockByDefault,
} from "~/data/shop-templates";

// ============================================
// 📦 TYPES
// ============================================

/**
 * Shop workspace - represents a single shop/business
 */
export interface ShopWorkspace {
  id: string;
  name: string;
  logo?: string;
  shopType: string;
  ownerPubkey: string;
  companyCode?: string; // Store actual company code for switching
  companyCodeHash?: string;
  shopConfigJson?: string; // Store full shop config for restoration on switch
  createdAt: string;
  lastAccessedAt: string;
  isDefault: boolean;
  // Metadata for display
  currency?: string;
  address?: string;
  // Sync info
  lastSyncAt?: string;
  syncStatus?: "synced" | "pending" | "error";
}

/**
 * Shop manager state
 */
interface ShopManagerState {
  workspaces: ShopWorkspace[];
  currentWorkspaceId: string | null;
  isLoading: boolean;
  isSwitching: boolean;
}

// Storage keys
const STORAGE_KEYS = {
  WORKSPACES: "bitspace_workspaces",
  CURRENT_WORKSPACE: "bitspace_current_workspace",
} as const;

// ============================================
// 🔧 SINGLETON STATE
// ============================================

const state = ref<ShopManagerState>({
  workspaces: [],
  currentWorkspaceId: null,
  isLoading: false,
  isSwitching: false,
});

const isInitialized = ref(false);

export function useShopManager() {
  // ============================================
  // 📊 COMPUTED
  // ============================================

  const workspaces = computed(() => state.value.workspaces);

  const currentWorkspace = computed(
    () =>
      state.value.workspaces.find(
        (w) => w.id === state.value.currentWorkspaceId
      ) || null
  );

  const hasMultipleWorkspaces = computed(
    () => state.value.workspaces.length > 1
  );

  const isLoading = computed(() => state.value.isLoading);
  const isSwitching = computed(() => state.value.isSwitching);

  // ============================================
  // 💾 PERSISTENCE
  // ============================================

  /**
   * Load workspaces from localStorage
   */
  function loadWorkspaces(): void {
    if (!import.meta.client) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
      if (stored) {
        state.value.workspaces = JSON.parse(stored);
      }

      const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_WORKSPACE);
      if (currentId) {
        state.value.currentWorkspaceId = currentId;
      }

      isInitialized.value = true;
    } catch (e) {
      console.error("[ShopManager] Failed to load workspaces:", e);
    }
  }

  /**
   * Save workspaces to localStorage and sync to Nostr
   */
  function saveWorkspaces(): void {
    if (!import.meta.client) return;

    try {
      localStorage.setItem(
        STORAGE_KEYS.WORKSPACES,
        JSON.stringify(state.value.workspaces)
      );

      if (state.value.currentWorkspaceId) {
        localStorage.setItem(
          STORAGE_KEYS.CURRENT_WORKSPACE,
          state.value.currentWorkspaceId
        );
      }

      // Sync to Nostr in background (don't await)
      syncWorkspacesToNostr().catch((e) => {
        console.debug("[ShopManager] Background sync failed:", e);
      });
    } catch (e) {
      console.error("[ShopManager] Failed to save workspaces:", e);
    }
  }

  /**
   * Sync workspace list to Nostr (encrypted with user's private key)
   */
  async function syncWorkspacesToNostr(): Promise<boolean> {
    if (!import.meta.client) return false;
    if (state.value.workspaces.length === 0) return false;

    try {
      const nostrRelay = useNostrRelay();
      const encryption = useEncryption();

      // Get user's keys from localStorage
      const nostrUser = localStorage.getItem("nostrUser");
      if (!nostrUser) {
        console.debug("[ShopManager] No nostrUser, skipping Nostr sync");
        return false;
      }

      const parsed = JSON.parse(nostrUser);
      const privkey = parsed.privkey || parsed.privateKey || parsed.seckey;
      const pubkey = parsed.pubkey || parsed.publicKey;

      if (!privkey || !pubkey) {
        console.debug("[ShopManager] No user keys, skipping Nostr sync");
        return false;
      }

      // Prepare workspace data (exclude sensitive shopConfigJson to reduce size)
      const workspaceData = state.value.workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        logo: w.logo,
        shopType: w.shopType,
        ownerPubkey: w.ownerPubkey,
        companyCode: w.companyCode,
        companyCodeHash: w.companyCodeHash,
        createdAt: w.createdAt,
        lastAccessedAt: w.lastAccessedAt,
        isDefault: w.isDefault,
        currency: w.currency,
        address: w.address,
      }));

      const payload = JSON.stringify({
        workspaces: workspaceData,
        currentWorkspaceId: state.value.currentWorkspaceId,
        updatedAt: new Date().toISOString(),
      });

      // Encrypt with user's own pubkey (NIP-04 self-encryption)
      const encrypted = await encryption.encryptToSelf(payload);
      if (!encrypted) {
        console.debug("[ShopManager] Failed to encrypt workspace data");
        return false;
      }

      // Create unsigned event
      const unsignedEvent = {
        kind: NOSTR_KINDS.USER_WORKSPACES,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["d", "workspaces"], // Replaceable event identifier
        ],
        content: encrypted,
        pubkey,
      };

      // Sign the event
      const signedEvent = finalizeEvent(unsignedEvent, hexToBytes(privkey));

      // Publish to Nostr
      const success = await nostrRelay.publishEvent(signedEvent);

      if (success) {
        console.log("[ShopManager] ✅ Synced workspaces to Nostr");
        return true;
      }
      return false;
    } catch (e) {
      console.debug("[ShopManager] Failed to sync workspaces to Nostr:", e);
      return false;
    }
  }

  /**
   * Load workspace list from Nostr (for new device login)
   */
  async function loadWorkspacesFromNostr(): Promise<boolean> {
    if (!import.meta.client) return false;

    try {
      const nostrRelay = useNostrRelay();
      const encryption = useEncryption();

      // Get user's pubkey from localStorage
      const nostrUser = localStorage.getItem("nostrUser");
      if (!nostrUser) {
        console.debug("[ShopManager] No nostrUser, skipping Nostr load");
        return false;
      }

      const parsed = JSON.parse(nostrUser);
      const pubkey = parsed.pubkey || parsed.publicKey;

      if (!pubkey) {
        console.debug("[ShopManager] No user pubkey, skipping Nostr load");
        return false;
      }

      // Fetch from Nostr using queryEvents
      const events = await nostrRelay.queryEvents({
        kinds: [NOSTR_KINDS.USER_WORKSPACES],
        authors: [pubkey],
        "#d": ["workspaces"],
      });

      if (!events || events.length === 0) {
        return false;
      }

      // Get most recent event
      const latestEvent = events.sort(
        (a: Event, b: Event) => b.created_at - a.created_at
      )[0];
      if (!latestEvent) return false;

      // Decrypt content
      const decrypted = await encryption.decryptFromSelf(latestEvent.content);
      if (!decrypted) {
        return false;
      }

      const data = JSON.parse(decrypted);
      if (data.workspaces && Array.isArray(data.workspaces)) {
        // Merge with existing workspaces (don't overwrite if local is newer)
        const existingIds = new Set(state.value.workspaces.map((w) => w.id));
        const newWorkspaces = data.workspaces.filter(
          (w: ShopWorkspace) => !existingIds.has(w.id)
        );

        if (newWorkspaces.length > 0) {
          state.value.workspaces = [
            ...state.value.workspaces,
            ...newWorkspaces,
          ];
          localStorage.setItem(
            STORAGE_KEYS.WORKSPACES,
            JSON.stringify(state.value.workspaces)
          );
        }

        // Restore current workspace ID if not set
        if (!state.value.currentWorkspaceId && data.currentWorkspaceId) {
          const exists = state.value.workspaces.some(
            (w) => w.id === data.currentWorkspaceId
          );
          if (exists) {
            state.value.currentWorkspaceId = data.currentWorkspaceId;
            localStorage.setItem(
              STORAGE_KEYS.CURRENT_WORKSPACE,
              data.currentWorkspaceId
            );
          }
        }

        return true;
      }

      return false;
    } catch (e) {
      console.debug("[ShopManager] Failed to load workspaces from Nostr:", e);
      return false;
    }
  }

  // ============================================
  // 🏪 WORKSPACE MANAGEMENT
  // ============================================

  /**
   * Generate unique workspace ID
   */
  function generateWorkspaceId(): string {
    return `ws_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  /**
   * Add a new workspace (shop)
   */
  function addWorkspace(
    workspace: Omit<ShopWorkspace, "id" | "createdAt" | "lastAccessedAt">
  ): ShopWorkspace {
    const newWorkspace: ShopWorkspace = {
      ...workspace,
      id: generateWorkspaceId(),
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };

    // If this is the first workspace or marked as default
    if (state.value.workspaces.length === 0 || workspace.isDefault) {
      // Clear default from other workspaces
      state.value.workspaces = state.value.workspaces.map((w) => ({
        ...w,
        isDefault: false,
      }));
      newWorkspace.isDefault = true;
    }

    state.value.workspaces.push(newWorkspace);
    saveWorkspaces();

    return newWorkspace;
  }

  /**
   * Create workspace from current shop config
   */
  function createWorkspaceFromShop(
    shopConfig: ShopConfig,
    ownerPubkey: string,
    companyCodeHash?: string,
    companyCode?: string,
    shopConfigJson?: string
  ): ShopWorkspace {
    return addWorkspace({
      name: shopConfig.name,
      logo: shopConfig.logo,
      shopType: shopConfig.shopType,
      ownerPubkey,
      companyCode,
      companyCodeHash,
      shopConfigJson,
      currency: shopConfig.currency,
      address: shopConfig.address,
      isDefault: state.value.workspaces.length === 0,
    });
  }

  /**
   * Update workspace
   */
  function updateWorkspace(
    workspaceId: string,
    updates: Partial<ShopWorkspace>
  ): boolean {
    const index = state.value.workspaces.findIndex((w) => w.id === workspaceId);
    if (index === -1) return false;

    const existing = state.value.workspaces[index];
    if (!existing) return false;

    state.value.workspaces[index] = {
      ...existing,
      ...updates,
    };
    saveWorkspaces();
    return true;
  }

  /**
   * Remove workspace
   */
  function removeWorkspace(workspaceId: string): boolean {
    const index = state.value.workspaces.findIndex((w) => w.id === workspaceId);
    if (index === -1) return false;

    const existing = state.value.workspaces[index];
    const wasDefault = existing?.isDefault ?? false;
    state.value.workspaces.splice(index, 1);

    // If removed the current workspace, switch to another
    if (state.value.currentWorkspaceId === workspaceId) {
      const nextWorkspace = state.value.workspaces[0];
      state.value.currentWorkspaceId = nextWorkspace?.id || null;
    }

    // If removed the default, set new default
    if (wasDefault && state.value.workspaces.length > 0) {
      const first = state.value.workspaces[0];
      if (first) first.isDefault = true;
    }

    saveWorkspaces();
    return true;
  }

  /**
   * Set default workspace
   */
  function setDefaultWorkspace(workspaceId: string): boolean {
    const exists = state.value.workspaces.some((w) => w.id === workspaceId);
    if (!exists) return false;

    state.value.workspaces = state.value.workspaces.map((w) => ({
      ...w,
      isDefault: w.id === workspaceId,
    }));
    saveWorkspaces();
    return true;
  }

  // ============================================
  // 🔄 SHOP SWITCHING
  // ============================================

  /**
   * Seed template products based on shop type after clearing data
   * Also syncs with Nostr to save templates to cloud
   */
  async function seedTemplatesAfterClear(
    shopType?: ShopType,
    syncToNostr = true
  ): Promise<void> {
    if (!import.meta.client) return;

    try {
      const productsStore = useProductsStore();
      const offline = useOffline();
      const nostrData = useNostrData();

      // Determine shop type from current config or default to 'cafe'
      const currentShopType =
        shopType || useShop().config.value?.shopType || "cafe";

      const config = getShopTypeConfig(currentShopType);
      if (!config) {
        console.warn(
          `[ShopManager] No template config found for ${currentShopType}`
        );
        return;
      }

      const trackStock = shouldTrackStockByDefault(currentShopType);

      // Create categories
      for (const cat of config.categories) {
        await productsStore.addCategory({
          name: cat.name,
          description: cat.nameLao,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
        });
      }

      // Wait a bit for categories to be created
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create products
      for (const prod of config.products) {
        const categoryId = productsStore.categories.value.find(
          (c) =>
            c.name ===
            config.categories.find((tc) => tc.id === prod.categoryId)?.name
        )?.id;

        if (categoryId) {
          await productsStore.addProduct({
            name: prod.name,
            description: prod.nameLao,
            sku: prod.id.toUpperCase(),
            categoryId,
            unitId: "default",
            price: prod.price,
            stock: 0,
            minStock: 0,
            branchId: "",
            status: "active",
            image: prod.image,
            trackStock,
          });
        }
      }

      console.log(`[ShopManager] ✅ Templates seeded successfully`);

      // Sync to Nostr if online and requested
      if (syncToNostr && offline.isOnline.value) {
        console.log("[ShopManager] 🔄 Syncing templates to Nostr...");
        try {
          await productsStore.syncToNostr();
          console.log("[ShopManager] ✅ Templates synced to Nostr");
        } catch (e) {
          console.warn("[ShopManager] Failed to sync templates to Nostr:", e);
        }
      }
    } catch (e) {
      console.error("[ShopManager] Failed to seed templates:", e);
    }
  }

  /**
   * Clear all local data for shop switch
   * Preserves workspace list and user authentication
   * Clears: Products, Categories, Orders, Customers, Inventory, Accounting, etc.
   */
  async function clearShopData(): Promise<void> {
    if (!import.meta.client) return;

    console.log("[ShopManager] 🧹 Clearing all shop data for switch...");
    console.log("[ShopManager] 📋 Data to be cleared:");
    console.log("  - Products, Categories, Units");
    console.log("  - Orders (local & pending)");
    console.log("  - Customers & Loyalty");
    console.log("  - Branches & Staff");
    console.log("  - Inventory (stock, lots, receipts)");
    console.log("  - Recipes & Ingredients");
    console.log("  - Accounting (accounts, expenses, journal entries)");
    console.log("  - Employees & Payroll");
    console.log("  - Chat Messages & Conversations");
    console.log("  - Promotions & Memberships");
    console.log("  - POS Sessions & Payments");

    // Keys to preserve (workspace & auth related)
    const keysToPreserve = [
      STORAGE_KEYS.WORKSPACES,
      STORAGE_KEYS.CURRENT_WORKSPACE,
      "bitspace_current_user",
      "nostrUser",
      "nostr_user_profile",
      "nostr-pubkey",
      "userList",
      "locale",
      "theme-color",
      "colorMode",
    ];

    // Collect keys to remove from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToPreserve.includes(key)) {
        keysToRemove.push(key);
      }
    }

    console.log(
      `[ShopManager] Removing ${keysToRemove.length} localStorage keys...`
    );
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Clear sessionStorage
    try {
      sessionStorage.clear();
      console.log("[ShopManager] ✅ SessionStorage cleared");
    } catch (e) {
      console.warn("[ShopManager] Failed to clear sessionStorage:", e);
    }

    // Clear entire IndexedDB (all tables)
    // This includes: products, categories, orders, customers, inventory,
    // accounting, employees, chat, promotions, memberships, and all other data
    try {
      const { db } = await import("~/db/db");

      console.log("[ShopManager] 🗄️ Deleting entire IndexedDB database...");
      await db.delete();
      console.log("[ShopManager] ✅ IndexedDB deleted (all tables cleared)");

      // Reopen the database after deletion
      // This recreates an empty database with the schema
      console.log("[ShopManager] 🔄 Reopening database...");
      await db.open();
      console.log("[ShopManager] ✅ Database reopened (ready for fresh data)");
    } catch (e) {
      console.error("[ShopManager] ❌ Failed to clear IndexedDB:", e);
      throw e; // Re-throw to prevent incomplete clearing
    }

    console.log("[ShopManager] ✅ All shop data cleared successfully");
    console.log("[ShopManager] 📝 Preserved: Workspace list & user auth");
  }

  /**
   * Switch to a different workspace/shop
   */
  async function switchWorkspace(workspaceId: string): Promise<boolean> {
    const workspace = state.value.workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      console.error("[ShopManager] Workspace not found:", workspaceId);
      return false;
    }

    if (state.value.currentWorkspaceId === workspaceId) {
      console.log("[ShopManager] Already on this workspace");
      return true;
    }

    state.value.isSwitching = true;

    try {
      console.log("[ShopManager] 🔄 Switching to workspace:", workspace.name);

      // Step 1: Clear current shop data
      await clearShopData();

      // Step 1.5: Seed template products for the workspace's shop type
      // This ensures users have starter data when switching workspaces
      if (workspace.shopType) {
        await seedTemplatesAfterClear(workspace.shopType as ShopType, false);
      }

      // Step 2: Set new current workspace
      state.value.currentWorkspaceId = workspaceId;

      // Step 3: Update last accessed
      updateWorkspace(workspaceId, {
        lastAccessedAt: new Date().toISOString(),
      });

      // Step 4: Restore company code for the new workspace
      if (workspace.companyCode) {
        localStorage.setItem("bitspace_company_code", workspace.companyCode);
        localStorage.setItem("bitspace_company_code_enabled", "true");
      }
      if (workspace.companyCodeHash) {
        localStorage.setItem(
          "bitspace_company_code_hash",
          workspace.companyCodeHash
        );
      }
      if (workspace.ownerPubkey) {
        localStorage.setItem(
          "bitspace_company_owner_pubkey",
          workspace.ownerPubkey
        );
      }

      // Step 5: Restore shopConfig if stored
      if (workspace.shopConfigJson) {
        localStorage.setItem("shopConfig", workspace.shopConfigJson);
        console.log("[ShopManager] Restored shopConfig for workspace");
      }

      saveWorkspaces();

      // Step 6: Mark setup as complete so navigation shows after reload
      const setupCheck = useSetupCheck();
      setupCheck.setSetupComplete(true);

      // Reload to sync new shop data from Nostr
      window.location.href = "/";
      return true;
    } catch (e) {
      console.error("[ShopManager] Failed to switch workspace:", e);
      return false;
    } finally {
      state.value.isSwitching = false;
    }
  }

  /**
   * Quick sync current workspace from Nostr
   */
  async function syncCurrentWorkspace(): Promise<boolean> {
    if (!currentWorkspace.value) return false;

    state.value.isLoading = true;

    try {
      const nostrData = useNostrData();
      await nostrData.fullSync();

      updateWorkspace(currentWorkspace.value.id, {
        lastSyncAt: new Date().toISOString(),
        syncStatus: "synced",
      });

      return true;
    } catch (e) {
      console.error("[ShopManager] Sync failed:", e);
      if (currentWorkspace.value) {
        updateWorkspace(currentWorkspace.value.id, {
          syncStatus: "error",
        });
      }
      return false;
    } finally {
      state.value.isLoading = false;
    }
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  /**
   * Initialize shop manager
   */
  function init(): void {
    if (isInitialized.value) return;
    loadWorkspaces();
  }

  /**
   * Register current shop as workspace (call after shop setup)
   */
  function registerCurrentShop(): ShopWorkspace | null {
    if (!import.meta.client) return null;

    try {
      // Get current shop config
      const shopConfigStr = localStorage.getItem("shopConfig");
      if (!shopConfigStr) return null;

      const shopConfig = JSON.parse(shopConfigStr);
      if (!shopConfig.name) return null;

      // Get owner pubkey
      let ownerPubkey: string | null = null;
      const nostrUser = localStorage.getItem("nostrUser");
      if (nostrUser) {
        const parsed = JSON.parse(nostrUser);
        ownerPubkey = parsed.pubkey || parsed.publicKey;
      }
      if (!ownerPubkey) return null;

      // Check if workspace already exists
      const existingWorkspace = state.value.workspaces.find(
        (w) => w.ownerPubkey === ownerPubkey && w.name === shopConfig.name
      );

      if (existingWorkspace) {
        // Get current company code if available
        const companyCode =
          localStorage.getItem("bitspace_company_code") || undefined;
        const companyCodeHash =
          localStorage.getItem("bitspace_company_code_hash") || undefined;

        // Update and set as current
        updateWorkspace(existingWorkspace.id, {
          lastAccessedAt: new Date().toISOString(),
          logo: shopConfig.logo,
          shopType: shopConfig.shopType,
          currency: shopConfig.currency,
          address: shopConfig.address,
          companyCode: companyCode || existingWorkspace.companyCode,
          companyCodeHash: companyCodeHash || existingWorkspace.companyCodeHash,
          shopConfigJson: shopConfigStr, // Store full config for restoration
        });
        state.value.currentWorkspaceId = existingWorkspace.id;
        saveWorkspaces();
        return existingWorkspace;
      }

      // Get company code and hash
      const companyCode =
        localStorage.getItem("bitspace_company_code") || undefined;
      const companyCodeHash =
        localStorage.getItem("bitspace_company_code_hash") || undefined;

      // Create new workspace with full shop config
      const workspace = createWorkspaceFromShop(
        shopConfig,
        ownerPubkey,
        companyCodeHash,
        companyCode,
        shopConfigStr // Store full config JSON for restoration on switch
      );

      state.value.currentWorkspaceId = workspace.id;
      saveWorkspaces();

      return workspace;
    } catch (e) {
      console.error("[ShopManager] Failed to register shop:", e);
      return null;
    }
  }

  /**
   * Clear all workspaces (for full logout)
   */
  function clearAllWorkspaces(): void {
    state.value.workspaces = [];
    state.value.currentWorkspaceId = null;
    localStorage.removeItem(STORAGE_KEYS.WORKSPACES);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKSPACE);
  }

  /**
   * 🔄 AUTO-MIGRATION: Migrate existing shop data to workspace
   * For users updating from old version without workspace list
   * Automatically creates a workspace from current shop config
   */
  function migrateExistingShopToWorkspace(): ShopWorkspace | null {
    if (!import.meta.client) return null;

    // Skip if already have workspaces
    if (state.value.workspaces.length > 0) {
      console.debug("[ShopManager] Workspaces exist, skip migration");
      return null;
    }

    try {
      // Check if shop is configured (old version data exists)
      const shopConfigStr = localStorage.getItem("shopConfig");
      if (!shopConfigStr) {
        console.debug("[ShopManager] No shopConfig found, skip migration");
        return null;
      }

      const shopConfig = JSON.parse(shopConfigStr);
      if (!shopConfig.name) {
        console.debug("[ShopManager] No shop name in config, skip migration");
        return null;
      }

      // Get owner pubkey from various sources
      let ownerPubkey: string | null = null;

      // Try nostrUser first
      const nostrUser = localStorage.getItem("nostrUser");
      if (nostrUser) {
        try {
          const parsed = JSON.parse(nostrUser);
          ownerPubkey = parsed.pubkey || parsed.publicKey;
        } catch {
          // Ignore parse errors
        }
      }

      // Try nostr-pubkey
      if (!ownerPubkey) {
        ownerPubkey = localStorage.getItem("nostr-pubkey");
      }

      // Try company owner pubkey
      if (!ownerPubkey) {
        ownerPubkey = localStorage.getItem("bitspace_company_owner_pubkey");
      }

      if (!ownerPubkey) {
        console.debug("[ShopManager] No owner pubkey found, skip migration");
        return null;
      }

      // Get company code if exists
      const companyCode =
        localStorage.getItem("bitspace_company_code") || undefined;
      const companyCodeHash =
        localStorage.getItem("bitspace_company_code_hash") || undefined;

      console.log(
        "[ShopManager] 🔄 AUTO-MIGRATION: Creating workspace from existing shop data"
      );

      // Create workspace from existing shop config
      const workspace = createWorkspaceFromShop(
        {
          name: shopConfig.name,
          logo: shopConfig.logo,
          shopType: shopConfig.shopType || "other",
          currency: shopConfig.currency || "LAK",
          address: shopConfig.address,
        } as ShopConfig,
        ownerPubkey,
        companyCodeHash,
        companyCode,
        shopConfigStr
      );

      // Set as current workspace
      state.value.currentWorkspaceId = workspace.id;
      saveWorkspaces();

      return workspace;
    } catch (e) {
      console.error("[ShopManager] Migration failed:", e);
      return null;
    }
  }

  // Auto-initialize
  if (import.meta.client) {
    init();

    // Run auto-migration for existing users after init
    migrateExistingShopToWorkspace();
  }

  return {
    // State
    workspaces,
    currentWorkspace,
    hasMultipleWorkspaces,
    isLoading,
    isSwitching,
    isInitialized: computed(() => isInitialized.value),

    // Workspace CRUD
    addWorkspace,
    createWorkspaceFromShop,
    updateWorkspace,
    removeWorkspace,
    setDefaultWorkspace,

    // Switching
    switchWorkspace,
    clearShopData,
    syncCurrentWorkspace,
    seedTemplatesAfterClear,

    // Nostr Sync
    syncWorkspacesToNostr,
    loadWorkspacesFromNostr,

    // Initialization & Migration
    init,
    registerCurrentShop,
    clearAllWorkspaces,
    migrateExistingShopToWorkspace,
  };
}
