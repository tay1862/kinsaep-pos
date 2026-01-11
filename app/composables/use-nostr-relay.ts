// composables/nostr/useNostrRelay.ts

import { ref, computed } from "vue";
import type { Event, Filter } from "nostr-tools";
import type { RelayConfig } from "~/types";

// ============================================
// 🔧 CONSTANTS & STORAGE KEYS
// ============================================

const STORAGE_KEY = "bitspace_relays";

const {
  public: { devRelayUrl = "" },
} = useRuntimeConfig();

const _devRelays = devRelayUrl ? (JSON.parse(devRelayUrl) as string[]) : [];

// Default relay configurations
const _DEFAULT_DEV: RelayConfig[] = [
  // {
  //   url: "wss://relay.bnos.space",
  //   read: true,
  //   write: true,
  //   outbox: false,
  //   isPrimary: true,
  // },
  // Uncomment for local development:
  ...(_devRelays.map((url: string, i) => ({
    url,
    read: true,
    write: true,
    outbox: false,
    isPrimary: i === 0,
  })) || []),
];

const _DEFAULT_PROD: RelayConfig[] = [
  {
    url: "wss://relay.bnos.space",
    read: true,
    write: true,
    outbox: false,
    isPrimary: true,
  },
  {
    url: "wss://relay.damus.io",
    read: true,
    write: true,
    outbox: false,
    isPrimary: false,
  },
  {
    url: "wss://nos.lol",
    read: true,
    write: true,
    outbox: false,
    isPrimary: false,
  },
  {
    url: "wss://nostr-01.yakihonne.com",
    read: true,
    write: false,
    outbox: false,
    isPrimary: false,
  },
  {
    url: "wss://nostr-pub.wellorder.net",
    read: true,
    write: false,
    outbox: false,
    isPrimary: false,
  },
  {
    url: "wss://yabu.me",
    read: true,
    write: false,
    outbox: false,
    isPrimary: false,
  },
];

// Default relays - Use dev relays in development, prod relays in production
const DEFAULT_RELAYS: RelayConfig[] = import.meta.dev
  ? _DEFAULT_DEV
  : _DEFAULT_PROD;

// ============================================
// 🔄 SHARED STATE (singleton pattern)
// ============================================

const relayConfigs = ref<RelayConfig[]>([]);
const isInitialized = ref(false);
const isInitializing = ref(false); // Guard to prevent circular calls
const isConnected = ref<boolean>(false);
const error = ref<unknown>(null);

export const useNostrRelay = () => {
  const { $nostr } = useNuxtApp();
  const { pool } = $nostr;

  // ============================================
  // 📊 COMPUTED PROPERTIES
  // ============================================

  // Get all relay URLs (for backward compatibility)
  const relays = computed(() => relayConfigs.value.map((r) => r.url));

  // Get read relays only
  const readRelays = computed(() =>
    relayConfigs.value.filter((r) => r.read).map((r) => r.url)
  );

  // Get write relays only
  const writeRelays = computed(() =>
    relayConfigs.value.filter((r) => r.write).map((r) => r.url)
  );

  // Get outbox relays only
  const outboxRelays = computed(() =>
    relayConfigs.value.filter((r) => r.outbox).map((r) => r.url)
  );

  // Get primary relay
  const primaryRelay = computed(
    () =>
      relayConfigs.value.find((r) => r.isPrimary)?.url ||
      relayConfigs.value[0]?.url
  );

  // ============================================
  // 💾 LOCAL STORAGE FUNCTIONS
  // ============================================

  /**
   * Load relays from localStorage
   */
  function loadFromStorage(): RelayConfig[] {
    try {
      if (typeof window === "undefined") return [];
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as RelayConfig[];
      }
    } catch (e) {
      console.warn("[useNostrRelay] Failed to load from localStorage:", e);
    }
    return [];
  }

  /**
   * Save relays to localStorage
   */
  function saveToStorage(configs: RelayConfig[]): void {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    } catch (e) {
      console.warn("[useNostrRelay] Failed to save to localStorage:", e);
    }
  }

  // ============================================
  // 🔄 INITIALIZATION & MERGE FUNCTIONS
  // ============================================

  /**
   * Initialize relay configuration
   * 1. Load from localStorage for fast startup
   * 2. Connect immediately for fast availability
   * 3. Merge with Nostr settings AFTER initial connection (deferred)
   */
  async function init(): Promise<void> {
    if (isInitialized.value || isInitializing.value) return;

    isInitializing.value = true;

    try {
      // Step 1: Load from localStorage first (fast startup)
      const storedRelays = loadFromStorage();
      // unix url
      relayConfigs.value = [...storedRelays, ...DEFAULT_RELAYS].filter(
        (v, i, a) => a.findIndex((t) => t.url === v.url) === i
      )

      // Step 2: Connect to relays immediately (don't wait for Nostr settings)
      await connect();

      isInitialized.value = true;
      isInitializing.value = false;

      // Step 3: Try to load from Nostr settings and merge (deferred, non-blocking)
      // This prevents circular dependency since we're already initialized
      setTimeout(async () => {
        try {
          await mergeWithNostrSettings();
        } catch (e) {
          console.warn("[useNostrRelay] Failed to merge Nostr settings:", e);
        }
      }, 100);
    } catch (e) {
      console.error("[useNostrRelay] Init error:", e);
      error.value = e;
      // Fall back to defaults on error
      if (relayConfigs.value.length === 0) {
        relayConfigs.value = [...DEFAULT_RELAYS];
      }
      isInitialized.value = true;
      isInitializing.value = false;
    }
  }

  /**
   * Merge with settings from Nostr (kind 30078)
   * Settings from Nostr take priority for existing relays
   * New relays from Nostr are added
   */
  async function mergeWithNostrSettings(): Promise<void> {
    try {
      const nostrData = useNostrData();
      const settings = await nostrData.getSettings();

      if (!settings?.relays || settings.relays.length === 0) {
        return;
      }

      const nostrRelays = settings.relays;
      console.log(
        "[useNostrRelay] Found",
        nostrRelays.length,
        "relays in Nostr settings"
      );

      // Create a map of current relays
      const currentMap = new Map(relayConfigs.value.map((r) => [r.url, r]));

      // Merge: Nostr settings override local for existing, add new ones
      for (const nostrRelay of nostrRelays) {
        currentMap.set(nostrRelay.url, {
          ...nostrRelay,
          status: "disconnected",
        });
      }

      // Also ensure defaults are present (but don't override if already configured)
      for (const defaultRelay of DEFAULT_RELAYS) {
        if (!currentMap.has(defaultRelay.url)) {
          currentMap.set(defaultRelay.url, {
            ...defaultRelay,
            status: "disconnected",
          });
        }
      }

      relayConfigs.value = Array.from(currentMap.values());

      // Save merged result to localStorage
      saveToStorage(relayConfigs.value);
    } catch (e) {
      console.warn("[useNostrRelay] Failed to merge with Nostr settings:", e);
    }
  }

  // ============================================
  // 🔌 CONNECTION FUNCTIONS
  // ============================================

  /**
   * Connect to all configured relays
   */
  async function connect(customRelays?: string[]): Promise<boolean> {
    const urlsToConnect = customRelays || relays.value;

    try {
      urlsToConnect.forEach((url) => {
        pool.ensureRelay(url);
        // Update status
        const config = relayConfigs.value.find((r) => r.url === url);
        if (config) {
          config.status = "connected";
        }
      });
      isConnected.value = true;
      return true;
    } catch (e) {
      error.value = e;
      isConnected.value = false;
      return false;
    }
  }

  // ============================================
  // ✏️ RELAY MANAGEMENT FUNCTIONS
  // ============================================

  /**
   * Add a new relay to the list
   */
  function addRelay(url: string, config?: Partial<RelayConfig>): boolean {
    // Check if already exists
    if (relayConfigs.value.some((r) => r.url === url)) {
      return true;
    }

    const newRelay: RelayConfig = {
      url,
      read: config?.read ?? true,
      write: config?.write ?? true,
      outbox: config?.outbox ?? false,
      isPrimary: config?.isPrimary ?? relayConfigs.value.length === 0,
      status: "disconnected",
    };

    relayConfigs.value.push(newRelay);

    // Connect to the new relay
    try {
      pool.ensureRelay(url);
      newRelay.status = "connected";
    } catch (e) {
      error.value = e;
      newRelay.status = "error";
    }

    // Save to localStorage
    saveToStorage(relayConfigs.value);

    return true;
  }

  /**
   * Remove a relay from the list
   */
  function removeRelay(url: string): boolean {
    const index = relayConfigs.value.findIndex((r) => r.url === url);
    if (index !== -1) {
      const wasPrimary = relayConfigs.value[index].isPrimary;
      relayConfigs.value.splice(index, 1);

      // If removed relay was primary, set first relay as primary
      if (wasPrimary && relayConfigs.value.length > 0) {
        relayConfigs.value[0].isPrimary = true;
      }

      // Save to localStorage
      saveToStorage(relayConfigs.value);
    }
    return true;
  }

  /**
   * Update relay configuration
   */
  function updateRelay(url: string, updates: Partial<RelayConfig>): boolean {
    const relay = relayConfigs.value.find((r) => r.url === url);
    if (relay) {
      Object.assign(relay, updates);

      // If setting as primary, unset others
      if (updates.isPrimary) {
        relayConfigs.value.forEach((r) => {
          if (r.url !== url) r.isPrimary = false;
        });
      }

      // Save to localStorage
      saveToStorage(relayConfigs.value);
      return true;
    }
    return false;
  }

  /**
   * Set primary relay
   */
  function setPrimaryRelay(url: string): boolean {
    return updateRelay(url, { isPrimary: true });
  }

  /**
   * Save current relay config to Nostr settings
   */
  async function saveRelaysToNostr(): Promise<boolean> {
    try {
      const nostrData = useNostrData();
      const settings = (await nostrData.getSettings()) || {};

      settings.relays = relayConfigs.value.map((r) => ({
        url: r.url,
        read: r.read,
        write: r.write,
        outbox: r.outbox,
        isPrimary: r.isPrimary,
      }));

      await nostrData.saveSettings(settings);
      return true;
    } catch (e) {
      console.error("[useNostrRelay] Failed to save to Nostr:", e);
      return false;
    }
  }

  /**
   * Reset to default relays
   */
  function resetToDefaults(): void {
    relayConfigs.value = [...DEFAULT_RELAYS];
    saveToStorage(relayConfigs.value);
    connect();
  }

  // ============================================
  // 📡 QUERY & PUBLISH FUNCTIONS
  // ============================================

  /**
   * Generic function to query events from relays
   */
  async function queryEvents(
    filter: Filter,
    selectedRelays?: string[]
  ): Promise<Event[]> {
    // Initialize if not already done
    if (!isInitialized.value) {
      await init();
    }

    try {
      const useRelays = selectedRelays || readRelays.value;
      return await pool.querySync(useRelays, filter);
    } catch (e) {
      error.value = e;
      return [];
    }
  }

  /**
   * Subscribe to events from relays
   */
  function subscribeToEvents(
    filter: Filter,
    callbacks: {
      onevent: (event: Event) => void;
      oneose?: () => void;
    },
    selectedRelays?: string[]
  ) {
    try {
      const useRelays = selectedRelays || readRelays.value;
      const sub = pool.subscribeMany(useRelays, [filter], {
        onevent: (event) => {
          console.log(
            "[NostrRelay] 📨 Event received, kind:",
            event.kind,
            "id:",
            event.id.slice(0, 8) + "..."
          );
          callbacks.onevent(event);
        },
        oneose: () => {
          callbacks.oneose?.();
        },
      });
      return sub;
    } catch (e) {
      console.error("[NostrRelay] ❌ Subscription failed:", e);
      error.value = e;
      return null;
    }
  }

  /**
   * Publish an event to relays
   */
  async function publishEvent(
    event: Event,
    selectedRelays?: string[]
  ): Promise<boolean> {
    // Initialize if not already done
    if (!isInitialized.value) {
      await init();
    }

    try {
      const useRelays = selectedRelays || writeRelays.value;
      await Promise.any(pool.publish(useRelays, event));
      return true;
    } catch (e) {
      error.value = e;
      return false;
    }
  }

  // ============================================
  // 📤 EXPORTED API
  // ============================================

  return {
    // Constants
    DEFAULT_RELAYS,

    // State
    relayConfigs,
    relays, // Backward compatible: string[] of URLs
    readRelays,
    writeRelays,
    outboxRelays,
    primaryRelay,
    isConnected,
    isInitialized,
    error,

    // Lifecycle
    init,
    connect,
    resetToDefaults,

    // Relay Management
    addRelay,
    removeRelay,
    updateRelay,
    setPrimaryRelay,
    saveRelaysToNostr,
    mergeWithNostrSettings,

    // Query & Publish
    queryEvents,
    subscribeToEvents,
    publishEvent,
  };
};
