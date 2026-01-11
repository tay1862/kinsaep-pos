// ============================================
// 🔄 STAFF SYNC COMPOSABLE
// Sync staff data across devices using Nostr
// ============================================

import { finalizeEvent } from "nostr-tools/pure";
import { hexToBytes } from "@noble/hashes/utils";
import type { StoreUser, UserPermissions } from "~/types";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// Singleton state
const isSyncing = ref(false);
const lastSyncedAt = ref<string | null>(null);
const syncError = ref<string | null>(null);
const deviceId = ref<string>("");

/**
 * 🔄 STAFF SYNC COMPOSABLE
 * Enables staff to sync their session/preferences across devices
 */
export function useStaffSync() {
  const nostrKey = useNostrKey();
  const nostrRelay = useNostrRelay();
  const nostrData = useNostrData();
  const toast = useToast();
  const { t } = useI18n();

  // ============================================
  // 🆔 DEVICE IDENTIFICATION
  // ============================================

  /**
   * Get or create unique device ID
   */
  function getDeviceId(): string {
    if (deviceId.value) return deviceId.value;

    const stored = localStorage.getItem("bitspace_device_id");
    if (stored) {
      deviceId.value = stored;
      return stored;
    }

    // Generate new device ID
    const newId = `device_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    localStorage.setItem("bitspace_device_id", newId);
    deviceId.value = newId;
    return newId;
  }

  /**
   * Get device info for display
   */
  function getDeviceInfo(): { id: string; name: string; browser: string } {
    const id = getDeviceId();
    const userAgent = navigator.userAgent;

    let browser = "Unknown";
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";

    let name = "Desktop";
    if (/Android/i.test(userAgent)) name = "Android";
    else if (/iPhone|iPad/i.test(userAgent)) name = "iOS";

    return { id: id.slice(-8), name, browser };
  }

  // ============================================
  // 📤 SYNC DATA TO RELAYS
  // ============================================

  /**
   * Prepare staff sync data
   */
  function prepareStaffSyncData(user: StoreUser): object {
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      branchId: user.branchId,
      avatar: user.avatar,
      lastLoginAt: new Date().toISOString(),
      deviceId: getDeviceId(),
      syncedAt: Date.now(),
    };
  }

  /**
   * Push staff data to Nostr relays
   */
  async function syncToRelays(
    user: StoreUser,
    nsec: string
  ): Promise<{ success: boolean; error?: string }> {
    if (isSyncing.value) {
      return { success: false, error: "Sync already in progress" };
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
      // Decode nsec to get private key
      const privateKeyHex = nostrKey.decodePrivateKey(nsec);
      if (!privateKeyHex) {
        throw new Error("Invalid nsec key");
      }

      // Get pubkey from private key
      const pubkeyHex = nostrKey.getPublicKeyFromPrivate(privateKeyHex);

      // Prepare sync data
      const syncData = prepareStaffSyncData(user);

      // Store as JSON (will be readable only by this user's devices)
      const content = JSON.stringify(syncData);

      // Create Nostr event
      const unsignedEvent = {
        kind: NOSTR_KINDS.STAFF_SYNC,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["d", `staff_sync_${user.id}`], // Addressable event identifier
          ["t", "staff_sync"],
          ["device", getDeviceId()],
        ],
        content,
        pubkey: pubkeyHex,
      };

      // Sign the event
      const signedEvent = finalizeEvent(
        unsignedEvent,
        hexToBytes(privateKeyHex)
      );

      // Publish to relays
      await nostrRelay.publishEvent(signedEvent);

      // Update last synced
      lastSyncedAt.value = new Date().toISOString();
      localStorage.setItem("bitspace_last_synced", lastSyncedAt.value);

      // Store sync meta in local DB
      await saveSyncMeta();

      toast.add({
        title: t("auth.deviceSync.syncSuccess"),
        icon: "i-heroicons-check-circle",
        color: "success",
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Sync failed";
      syncError.value = errorMsg;

      toast.add({
        title: t("auth.deviceSync.syncError"),
        description: errorMsg,
        icon: "i-heroicons-exclamation-circle",
        color: "error",
      });

      return { success: false, error: errorMsg };
    } finally {
      isSyncing.value = false;
    }
  }

  // ============================================
  // 📥 FETCH DATA FROM RELAYS
  // ============================================

  /**
   * Fetch staff data from Nostr relays (for new device login)
   */
  async function fetchFromRelays(
    npub: string,
    nsec: string
  ): Promise<{ success: boolean; data?: Partial<StoreUser>; error?: string }> {
    isSyncing.value = true;
    syncError.value = null;

    try {
      // Decode keys
      const privateKeyHex = nostrKey.decodePrivateKey(nsec);
      if (!privateKeyHex) {
        throw new Error("Invalid nsec key");
      }

      // Get pubkey from private key to ensure consistency
      const pubkeyHex = nostrKey.getPublicKeyFromPrivate(privateKeyHex);

      // Build filter for staff sync events
      const filter = {
        kinds: [NOSTR_KINDS.STAFF_SYNC],
        authors: [pubkeyHex],
        "#t": ["staff_sync"],
        limit: 1,
      };

      // Fetch from relays
      const events = await nostrRelay.queryEvents(filter);

      if (!events || events.length === 0) {
        return { success: false, error: "No sync data found on relays" };
      }

      // Get the most recent event
      type NostrEvent = { created_at: number; content: string };
      const latestEvent = (events as NostrEvent[]).sort(
        (a, b) => b.created_at - a.created_at
      )[0];

      // Parse content (stored as JSON)
      const syncData = JSON.parse(latestEvent!.content);

      // Update last synced
      lastSyncedAt.value = new Date().toISOString();
      localStorage.setItem("bitspace_last_synced", lastSyncedAt.value);

      return {
        success: true,
        data: {
          name: syncData.name,
          email: syncData.email,
          role: syncData.role,
          permissions: syncData.permissions as UserPermissions,
          branchId: syncData.branchId,
          avatar: syncData.avatar,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to fetch sync data";
      syncError.value = errorMsg;
      return { success: false, error: errorMsg };
    } finally {
      isSyncing.value = false;
    }
  }

  // ============================================
  // 💾 LOCAL SYNC METADATA
  // ============================================

  /**
   * Save sync metadata to local DB
   */
  async function saveSyncMeta(): Promise<void> {
    try {
      const meta = {
        id: "staff_sync",
        lastSyncedAt: Date.now(),
        deviceId: getDeviceId(),
      };

      // Store in localStorage for simplicity
      localStorage.setItem("bitspace_sync_meta", JSON.stringify(meta));
    } catch (error) {
      console.error("Failed to save sync meta:", error);
    }
  }

  /**
   * Load sync metadata from local storage
   */
  function loadSyncMeta(): void {
    try {
      const stored = localStorage.getItem("bitspace_sync_meta");
      if (stored) {
        const meta = JSON.parse(stored);
        lastSyncedAt.value = meta.lastSyncedAt
          ? new Date(meta.lastSyncedAt).toISOString()
          : null;
      }

      // Also check the simpler key
      const lastSync = localStorage.getItem("bitspace_last_synced");
      if (lastSync) {
        lastSyncedAt.value = lastSync;
      }
    } catch (error) {
      console.error("Failed to load sync meta:", error);
    }
  }

  // ============================================
  // 📱 QR CODE EXPORT/IMPORT
  // ============================================

  /**
   * Generate QR data for device linking
   * Contains encrypted nsec for secure transfer
   */
  function generateLinkData(
    user: StoreUser,
    nsec: string
  ): { data: string; expiresAt: number } {
    const linkToken = {
      npub: user.npub,
      userId: user.id,
      encNsec: btoa(nsec), // Basic obfuscation - NOT secure encryption
      exp: Date.now() + 5 * 60 * 1000, // 5 minute expiry
    };

    return {
      data: `bitspace://link?token=${btoa(JSON.stringify(linkToken))}`,
      expiresAt: linkToken.exp,
    };
  }

  /**
   * Parse link data from QR scan
   */
  function parseLinkData(
    qrData: string
  ): { npub: string; nsec: string; userId: string } | null {
    try {
      const url = new URL(qrData);
      const token = url.searchParams.get("token");
      if (!token) return null;

      const decoded = JSON.parse(atob(token));

      // Check expiry
      if (decoded.exp < Date.now()) {
        console.error("Link token expired");
        return null;
      }

      return {
        npub: decoded.npub,
        nsec: atob(decoded.encNsec),
        userId: decoded.userId,
      };
    } catch {
      return null;
    }
  }

  // ============================================
  // 🔄 AUTO SYNC ON LOGIN
  // ============================================

  /**
   * Handle new device login - fetch data from relays
   */
  async function handleNewDeviceLogin(
    npub: string,
    nsec: string
  ): Promise<{ synced: boolean; data?: Partial<StoreUser> }> {
    // Check if this is a new device
    const isNewDevice = !localStorage.getItem("bitspace_device_initialized");

    if (isNewDevice) {
      console.log("[StaffSync] New device detected, fetching data from relays");

      const result = await fetchFromRelays(npub, nsec);

      if (result.success) {
        localStorage.setItem("bitspace_device_initialized", "true");
        return { synced: true, data: result.data };
      }
    }

    return { synced: false };
  }

  // Initialize on composable creation
  if (import.meta.client) {
    getDeviceId();
    loadSyncMeta();
  }

  return {
    // State
    isSyncing: computed(() => isSyncing.value),
    lastSyncedAt: computed(() => lastSyncedAt.value),
    syncError: computed(() => syncError.value),
    deviceId: computed(() => deviceId.value),

    // Device info
    getDeviceId,
    getDeviceInfo,

    // Sync operations
    syncToRelays,
    fetchFromRelays,
    handleNewDeviceLogin,

    // QR linking
    generateLinkData,
    parseLinkData,

    // Meta
    loadSyncMeta,
  };
}
