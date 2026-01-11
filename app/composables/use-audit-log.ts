// ============================================
// 📋 AUDIT LOG COMPOSABLE
// Centralized audit logging with Nostr sync
// Encrypted with company code for team access
// ============================================

import { ref, computed } from "vue";
import type { Event, Filter } from "nostr-tools";

// ============================================
// 🔧 TYPES
// ============================================

export type AuditAction =
  | "login"
  | "logout"
  | "login_failed"
  | "order_create"
  | "order_update"
  | "order_void"
  | "refund"
  | "product_create"
  | "product_update"
  | "product_delete"
  | "user_create"
  | "user_update"
  | "user_delete"
  | "settings_change"
  | "shift_open"
  | "shift_close"
  | "inventory_adjust"
  | "payment_received"
  | "customer_create"
  | "customer_update"
  | "category_create"
  | "category_update"
  | "category_delete";

export interface AuditLog {
  id: string;
  action: AuditAction;
  userId: string;
  userName: string;
  timestamp: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  action?: AuditAction | null;
  userId?: string | null;
  startDate?: string;
  endDate?: string;
  resourceType?: string;
  limit?: number;
}

// ============================================
// 🔧 UTILITY FUNCTIONS
// ============================================

/**
 * Generate a UUID v4 compatible ID
 */
function generateId(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Fallback to manual generation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// 🗄️ STATE (Singleton)
// ============================================

const logs = ref<AuditLog[]>([]);
const isLoading = ref(false);
const isSyncing = ref(false);
const lastSyncAt = ref<string | null>(null);
const syncError = ref<string | null>(null);
const isInitialized = ref(false);

// Subscription handle for cleanup
let subscriptionHandle: { close: () => void } | null = null;

// ============================================
// 📋 COMPOSABLE
// ============================================

export function useAuditLog() {
  const nostrData = useNostrData();
  const company = useCompany();

  // ============================================
  // 🔍 COMPUTED
  // ============================================

  const isCompanyCodeAvailable = computed(() => {
    return company.hasCompanyCode.value && company.isCompanyCodeEnabled.value;
  });

  const syncStatus = computed(() => {
    if (isSyncing.value) return "syncing";
    if (syncError.value) return "error";
    if (lastSyncAt.value) return "synced";
    return "idle";
  });

  // ============================================
  // 📤 LOG ACTIVITY
  // ============================================

  /**
   * Log an activity to Nostr
   * Encrypts with company code for team-wide access
   */
  async function logActivity(
    action: AuditAction,
    details: string,
    options?: {
      resourceType?: string;
      resourceId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<AuditLog | null> {
    // Get current user info using new utility
    const { getCurrentUserIdentifier, getCurrentUserName } = useUserIdentifier();
    const userId = getCurrentUserIdentifier();
    const userName = getCurrentUserName();

    if (userId === 'system') {
      console.warn("[AuditLog] No user identity available, logging as system");
    }

    // Get IP and user agent (client-side only)
    let ipAddress: string | undefined;
    let userAgent: string | undefined;
    if (import.meta.client) {
      userAgent = navigator.userAgent;
      // IP would need a service call, skip for now
    }

    // Create log entry
    const log: AuditLog = {
      id: generateId(),
      action,
      userId, // Uses npub from useUserIdentifier for decentralized identity
      userName,
      timestamp: new Date().toISOString(),
      details,
      ipAddress,
      userAgent,
      resourceType: options?.resourceType,
      resourceId: options?.resourceId,
      metadata: options?.metadata,
    };

    // Add to local state immediately
    logs.value.unshift(log);

    // Publish to Nostr
    try {
      await saveAuditLog(log);
    } catch (e) {
      console.error("[AuditLog] Failed to publish log:", e);
      syncError.value = "Failed to publish log";
    }

    return log;
  }

  // ============================================
  // 💾 SAVE TO NOSTR
  // ============================================

  /**
   * Save an audit log to Nostr
   * Uses company code encryption (v4) when available
   */
  async function saveAuditLog(log: AuditLog): Promise<boolean> {
    const keys = nostrData.getUserKeys();
    if (!keys) return false;

    // Build tags for efficient querying
    const tags: string[][] = [
      ["d", log.id],
      ["action", log.action],
      ["user", log.userId],
      ["t", Math.floor(new Date(log.timestamp).getTime() / 1000).toString()],
    ];

    // Add resource tag if present
    if (log.resourceType && log.resourceId) {
      tags.push(["resource", `${log.resourceType}:${log.resourceId}`]);
    }

    // Add company code hash tag for team filtering
    if (company.companyCodeHash.value) {
      tags.push(["c", company.companyCodeHash.value]);
    }

    // Publish as replaceable event (Kind 30502)
    // Encryption is handled automatically by publishReplaceableEvent
    // when company code is enabled
    const event = await nostrData.publishReplaceableEvent(
      nostrData.NOSTR_KINDS.AUDIT_LOG,
      log,
      log.id,
      tags,
      true // Always encrypt audit logs
    );

    return event !== null;
  }

  // ============================================
  // 📥 GET LOGS
  // ============================================

  /**
   * Fetch audit logs from Nostr
   * Uses company code hash tag for team filtering
   */
  async function getLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
    isLoading.value = true;
    syncError.value = null;

    try {
      const relay = useNostrRelay();
      const keys = nostrData.getUserKeys();
      if (!keys) {
        isLoading.value = false;
        return [];
      }

      // Build query filter
      const queryFilter: Filter = {
        kinds: [nostrData.NOSTR_KINDS.AUDIT_LOG],
      };

      // Query by company code hash if available (team mode)
      if (company.companyCodeHash.value && company.isCompanyCodeEnabled.value) {
        queryFilter["#c"] = [company.companyCodeHash.value];
      } else {
        // Personal mode - only query own logs
        queryFilter.authors = [keys.pubkey];
      }

      // Apply action filter
      if (filters?.action) {
        queryFilter["#action"] = [filters.action];
      }

      // Apply user filter
      if (filters?.userId) {
        queryFilter["#user"] = [filters.userId];
      }

      // Apply date filters
      if (filters?.startDate) {
        queryFilter.since = Math.floor(
          new Date(filters.startDate).getTime() / 1000
        );
      }
      if (filters?.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        queryFilter.until = Math.floor(endDate.getTime() / 1000);
      }

      // Apply limit
      if (filters?.limit) {
        queryFilter.limit = filters.limit;
      } else {
        queryFilter.limit = 500; // Default limit
      }

      // Query events
      const events = await relay.queryEvents(queryFilter);

      // Decrypt and parse logs
      const fetchedLogs: AuditLog[] = [];

      for (const event of events) {
        try {
          const isEncrypted =
            event.tags.find((t: string[]) => t[0] === "encrypted")?.[1] ===
            "true";

          let data: AuditLog | null = null;

          if (isEncrypted) {
            data = await nostrData.decryptData<AuditLog>(event.content);
          } else {
            data = JSON.parse(event.content);
          }

          if (data && data.id) {
            fetchedLogs.push(data);
          }
        } catch (e) {
          console.warn("[AuditLog] Failed to parse log event:", e);
        }
      }

      // Sort by timestamp descending
      fetchedLogs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Update local state
      logs.value = fetchedLogs;
      lastSyncAt.value = new Date().toISOString();

      return fetchedLogs;
    } catch (e) {
      console.error("[AuditLog] Failed to fetch logs:", e);
      syncError.value = "Failed to fetch logs";
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 🔄 SYNC
  // ============================================

  /**
   * Force sync logs from Nostr
   */
  async function syncLogs(): Promise<void> {
    isSyncing.value = true;
    syncError.value = null;

    try {
      await getLogs();
    } finally {
      isSyncing.value = false;
    }
  }

  // ============================================
  // 📡 REAL-TIME SUBSCRIPTION
  // ============================================

  /**
   * Subscribe to real-time audit log updates
   */
  function subscribeToLogs(callback?: (log: AuditLog) => void): () => void {
    const relay = useNostrRelay();
    const keys = nostrData.getUserKeys();

    if (!keys) {
      console.warn("[AuditLog] No keys for subscription");
      return () => {};
    }

    // Build subscription filter
    const subFilter: Filter = {
      kinds: [nostrData.NOSTR_KINDS.AUDIT_LOG],
      since: Math.floor(Date.now() / 1000),
    };

    // Team mode or personal mode
    if (company.companyCodeHash.value && company.isCompanyCodeEnabled.value) {
      subFilter["#c"] = [company.companyCodeHash.value];
    } else {
      subFilter.authors = [keys.pubkey];
    }

    // Subscribe using subscribeToEvents
    subscriptionHandle = relay.subscribeToEvents(subFilter, {
      onevent: async (event: Event) => {
        try {
          const isEncrypted =
            event.tags.find((t: string[]) => t[0] === "encrypted")?.[1] ===
            "true";

          let data: AuditLog | null = null;

          if (isEncrypted) {
            data = await nostrData.decryptData<AuditLog>(event.content);
          } else {
            data = JSON.parse(event.content);
          }

          if (data && data.id) {
            // Check if already exists
            const existingIndex = logs.value.findIndex(
              (l) => l.id === data!.id
            );
            if (existingIndex === -1) {
              // Add new log at the beginning
              logs.value.unshift(data);
              callback?.(data);
            }
          }
        } catch (e) {
          console.warn("[AuditLog] Failed to process subscription event:", e);
        }
      },
    });

    // Return unsubscribe function
    return () => {
      if (subscriptionHandle) {
        subscriptionHandle.close();
        subscriptionHandle = null;
      }
    };
  }

  // ============================================
  // 🚀 INITIALIZE
  // ============================================

  /**
   * Initialize audit log system
   */
  async function initialize(): Promise<void> {
    if (isInitialized.value) return;

    // Load from storage if available (with auto-migration)
    await company.loadCompanyCode();

    // Fetch logs
    await getLogs({ limit: 100 });

    isInitialized.value = true;
  }

  // ============================================
  // 📊 STATS
  // ============================================

  const stats = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const securityActions = [
      "login",
      "logout",
      "login_failed",
      "settings_change",
      "user_create",
      "user_update",
      "user_delete",
    ];

    return {
      totalActions: logs.value.length,
      todayActions: logs.value.filter((log) => new Date(log.timestamp) >= today)
        .length,
      securityEvents: logs.value.filter((log) =>
        securityActions.includes(log.action)
      ).length,
      activeUsers: new Set(
        logs.value
          .filter((log) => log.action === "login")
          .map((log) => log.userId)
      ).size,
    };
  });

  // ============================================
  // 📤 RETURN
  // ============================================

  return {
    // State
    logs,
    isLoading,
    isSyncing,
    lastSyncAt,
    syncError,
    syncStatus,
    stats,
    isCompanyCodeAvailable,

    // Methods
    logActivity,
    getLogs,
    syncLogs,
    subscribeToLogs,
    initialize,
  };
}
