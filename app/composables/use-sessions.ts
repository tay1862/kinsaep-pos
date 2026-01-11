/**
 * Session management composable
 * Tracks user login sessions across devices
 * Stores locally and optionally syncs to Nostr (NIP-04 encrypted DM to self)
 */

export interface Session {
  id: string;
  deviceId: string;
  device: string; // "Chrome on Windows", "Safari on iPhone"
  browser: string;
  os: string;
  location?: string; // IP-based location (optional)
  ipAddress?: string;
  userAgent: string;
  createdAt: string; // First login
  lastActive: string; // Last activity
  current: boolean; // Is this the current session
}

const SESSIONS_KEY = "bitspace_sessions";
const DEVICE_ID_KEY = "bitspace_device_id";

/**
 * Generate a UUID v4
 */
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useSessions() {
  const sessions = ref<Session[]>([]);
  const currentDeviceId = ref<string>("");
  const isLoading = ref(false);

  /**
   * Get or create unique device ID for this browser
   */
  function getDeviceId(): string {
    if (import.meta.client) {
      let deviceId = localStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = generateId();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      currentDeviceId.value = deviceId;
      return deviceId;
    }
    return "";
  }

  /**
   * Parse user agent to get device info
   */
  function parseUserAgent(ua: string): {
    browser: string;
    os: string;
    device: string;
  } {
    let browser = "Unknown Browser";
    let os = "Unknown OS";

    // Detect browser
    if (ua.includes("Firefox")) {
      browser = "Firefox";
    } else if (ua.includes("Edg")) {
      browser = "Edge";
    } else if (ua.includes("Chrome")) {
      browser = "Chrome";
    } else if (ua.includes("Safari")) {
      browser = "Safari";
    } else if (ua.includes("Opera") || ua.includes("OPR")) {
      browser = "Opera";
    }

    // Detect OS
    if (ua.includes("Windows")) {
      os = "Windows";
    } else if (ua.includes("Mac OS")) {
      os = "macOS";
    } else if (ua.includes("Linux")) {
      os = "Linux";
    } else if (ua.includes("Android")) {
      os = "Android";
    } else if (ua.includes("iPhone") || ua.includes("iPad")) {
      os = "iOS";
    }

    const device = `${browser} on ${os}`;
    return { browser, os, device };
  }

  /**
   * Load sessions from localStorage
   */
  function loadSessions(): Session[] {
    if (!import.meta.client) return [];

    try {
      const saved = localStorage.getItem(SESSIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Session[];
        // Mark current session
        const deviceId = getDeviceId();
        return parsed.map((s) => ({
          ...s,
          current: s.deviceId === deviceId,
        }));
      }
    } catch (e) {
      console.error("[Sessions] Failed to load:", e);
    }
    return [];
  }

  /**
   * Save sessions to localStorage
   */
  function saveSessions(data: Session[]): void {
    if (!import.meta.client) return;

    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("[Sessions] Failed to save:", e);
    }
  }

  /**
   * Register current device login
   */
  function registerLogin(): Session {
    const deviceId = getDeviceId();
    const ua = navigator.userAgent;
    const { browser, os, device } = parseUserAgent(ua);
    const now = new Date().toISOString();

    // Load existing sessions
    const existing = loadSessions();

    // Check if this device already has a session
    const existingSession = existing.find((s) => s.deviceId === deviceId);

    if (existingSession) {
      // Update last active
      existingSession.lastActive = now;
      existingSession.current = true;
      saveSessions(existing);
      sessions.value = existing;
      return existingSession;
    }

    // Create new session
    const newSession: Session = {
      id: generateId(),
      deviceId,
      device,
      browser,
      os,
      userAgent: ua,
      createdAt: now,
      lastActive: now,
      current: true,
    };

    existing.push(newSession);
    saveSessions(existing);
    sessions.value = existing;

    console.log("[Sessions] New login registered:", device);
    return newSession;
  }

  /**
   * Update last active time for current session
   */
  function updateActivity(): void {
    const deviceId = getDeviceId();
    const existing = loadSessions();
    const session = existing.find((s) => s.deviceId === deviceId);

    if (session) {
      session.lastActive = new Date().toISOString();
      saveSessions(existing);
      sessions.value = existing;
    }
  }

  /**
   * Terminate a session (remove from list)
   */
  function terminateSession(sessionId: string): boolean {
    const existing = loadSessions();
    const index = existing.findIndex((s) => s.id === sessionId);

    if (index !== -1) {
      const removed = existing.splice(index, 1)[0];
      saveSessions(existing);
      sessions.value = existing;
      console.log("[Sessions] Terminated:", removed.device);
      return true;
    }
    return false;
  }

  /**
   * Get all sessions
   */
  function getSessions(): Session[] {
    sessions.value = loadSessions();
    return sessions.value;
  }

  /**
   * Clear all sessions except current
   */
  function clearOtherSessions(): number {
    const deviceId = getDeviceId();
    const existing = loadSessions();
    const current = existing.filter((s) => s.deviceId === deviceId);
    const removed = existing.length - current.length;

    saveSessions(current);
    sessions.value = current;

    console.log("[Sessions] Cleared", removed, "other sessions");
    return removed;
  }

  /**
   * Sync sessions to Nostr (NIP-04 encrypted DM to self)
   * This allows viewing sessions from other devices
   */
  async function syncToNostr(): Promise<boolean> {
    // TODO: Implement NIP-04 encrypted event to self
    // This would publish sessions list as encrypted DM
    // Other devices can read and merge sessions
    console.log("[Sessions] Nostr sync not yet implemented");
    return false;
  }

  /**
   * Load sessions from Nostr
   */
  async function loadFromNostr(): Promise<Session[]> {
    // TODO: Implement loading encrypted session events from Nostr
    console.log("[Sessions] Nostr load not yet implemented");
    return [];
  }

  // Initialize
  function init() {
    if (import.meta.client) {
      getDeviceId();
      getSessions();
    }
  }

  return {
    // State
    sessions,
    currentDeviceId,
    isLoading,

    // Methods
    init,
    registerLogin,
    updateActivity,
    terminateSession,
    getSessions,
    clearOtherSessions,
    getDeviceId,
    parseUserAgent,

    // Nostr sync (future)
    syncToNostr,
    loadFromNostr,
  };
}
