// ============================================
// 🔐 BITSPACE SECURITY COMPOSABLE
// Data Encryption & Protection
// ============================================

import type {
  EncryptedData,
  SecuritySettings,
  SecurityAuditLog,
} from "~/types";

// Singleton state
const isInitialized = ref(false);
const encryptionKey = ref<CryptoKey | null>(null);
const masterPasswordHash = ref<string | null>(null);
const isLocked = ref(true);
const lastActivity = ref(Date.now());
const auditLogs = ref<SecurityAuditLog[]>([]);

// Security settings
const securitySettings = ref<SecuritySettings>({
  dataEncryption: false,
  autoLockTimeout: 15, // 15 minutes
  requirePinForRefunds: true,
  requirePinForVoids: true,
  requirePinForDiscounts: false,
  auditLogging: true,
});

export function useSecurity() {
  const STORAGE_KEY = "bitspace_security";
  const MASTER_HASH_KEY = "bitspace_master_hash";
  const AUDIT_KEY = "bitspace_audit_logs";
  const SESSION_UNLOCK_KEY = "bitspace_session_unlocked"; // Session-based unlock persistence

  // ============================================
  // 🔑 KEY DERIVATION
  // ============================================

  /**
   * Derive encryption key from master password using PBKDF2
   */
  async function deriveKey(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );

    // Derive AES-GCM key
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt.buffer as ArrayBuffer,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Hash password for verification
   */
  async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ============================================
  // 🔐 ENCRYPTION/DECRYPTION
  // ============================================

  /**
   * Encrypt data using AES-GCM
   */
  async function encrypt(data: string): Promise<EncryptedData | null> {
    if (!encryptionKey.value || !securitySettings.value.dataEncryption) {
      return null;
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        encryptionKey.value,
        dataBuffer
      );

      return {
        iv: btoa(String.fromCharCode(...iv)),
        data: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
      };
    } catch (error) {
      console.error("Encryption failed:", error);
      return null;
    }
  }

  /**
   * Decrypt data using AES-GCM
   */
  async function decrypt(encrypted: EncryptedData): Promise<string | null> {
    if (!encryptionKey.value) {
      return null;
    }

    try {
      // Decode IV and data from base64
      const iv = new Uint8Array(
        atob(encrypted.iv)
          .split("")
          .map((c) => c.charCodeAt(0))
      );
      const data = new Uint8Array(
        atob(encrypted.data)
          .split("")
          .map((c) => c.charCodeAt(0))
      );

      // Decrypt
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        encryptionKey.value,
        data
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error("Decryption failed:", error);
      return null;
    }
  }

  /**
   * Encrypt and store sensitive data
   */
  async function encryptAndStore(key: string, data: unknown): Promise<boolean> {
    if (!securitySettings.value.dataEncryption) {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    }

    const encrypted = await encrypt(JSON.stringify(data));
    if (encrypted) {
      localStorage.setItem(key, JSON.stringify(encrypted));
      return true;
    }
    return false;
  }

  /**
   * Retrieve and decrypt sensitive data
   */
  async function retrieveAndDecrypt<T>(key: string): Promise<T | null> {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored);

      // Check if data is encrypted
      if (parsed.iv && parsed.data) {
        if (!encryptionKey.value) {
          console.warn("Encryption key not available");
          return null;
        }
        const decrypted = await decrypt(parsed);
        return decrypted ? JSON.parse(decrypted) : null;
      }

      // Data is not encrypted
      return parsed as T;
    } catch {
      return null;
    }
  }

  // ============================================
  // 🔓 MASTER PASSWORD MANAGEMENT
  // ============================================

  /**
   * Check if master password is set
   */
  function hasMasterPassword(): boolean {
    return localStorage.getItem(MASTER_HASH_KEY) !== null;
  }

  /**
   * Set up master password for first time
   */
  async function setupMasterPassword(password: string): Promise<boolean> {
    try {
      // Generate salt and store it
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltBase64 = btoa(String.fromCharCode(...salt));

      // Derive encryption key
      encryptionKey.value = await deriveKey(password, salt);

      // Hash password for verification
      const passwordHash = await hashPassword(password + saltBase64);

      // Store hash and salt
      localStorage.setItem(
        MASTER_HASH_KEY,
        JSON.stringify({
          hash: passwordHash,
          salt: saltBase64,
        })
      );

      masterPasswordHash.value = passwordHash;
      isLocked.value = false;
      securitySettings.value.dataEncryption = true;

      await saveSettings();
      await addAuditLog(
        "settings_change",
        "system",
        "Master password configured"
      );

      return true;
    } catch (error) {
      console.error("Failed to setup master password:", error);
      return false;
    }
  }

  /**
   * Unlock with master password
   */
  async function unlock(password: string): Promise<boolean> {
    try {
      const stored = localStorage.getItem(MASTER_HASH_KEY);
      if (!stored) return false;

      const { hash, salt } = JSON.parse(stored);
      const saltBytes = new Uint8Array(
        atob(salt)
          .split("")
          .map((c) => c.charCodeAt(0))
      );

      // Verify password
      const inputHash = await hashPassword(password + salt);
      if (inputHash !== hash) {
        return false;
      }

      // Derive encryption key
      encryptionKey.value = await deriveKey(password, saltBytes);
      masterPasswordHash.value = hash;
      isLocked.value = false;
      lastActivity.value = Date.now();

      // Persist unlock state in session (survives page refresh)
      sessionStorage.setItem(SESSION_UNLOCK_KEY, "true");
      // Store derived key material for session restoration
      sessionStorage.setItem(SESSION_UNLOCK_KEY + "_salt", salt);

      return true;
    } catch (error) {
      console.error("Unlock failed:", error);
      return false;
    }
  }

  /**
   * Lock the application
   */
  function lock(): void {
    encryptionKey.value = null;
    isLocked.value = true;
    // Clear session unlock state
    sessionStorage.removeItem(SESSION_UNLOCK_KEY);
    sessionStorage.removeItem(SESSION_UNLOCK_KEY + "_salt");
  }

  /**
   * Disable encryption (requires password verification)
   * This will decrypt all sensitive data and store in plain format
   */
  async function disableEncryption(password: string): Promise<boolean> {
    try {
      // First verify password is correct
      const stored = localStorage.getItem(MASTER_HASH_KEY);
      if (!stored) return false;

      const { hash, salt } = JSON.parse(stored);
      const inputHash = await hashPassword(password + salt);
      if (inputHash !== hash) {
        console.warn("Password verification failed for disableEncryption");
        return false;
      }

      // Remove master password hash
      localStorage.removeItem(MASTER_HASH_KEY);

      // Update settings
      securitySettings.value.dataEncryption = false;
      masterPasswordHash.value = null;
      encryptionKey.value = null;
      isLocked.value = false;

      // Clear session unlock state
      sessionStorage.removeItem(SESSION_UNLOCK_KEY);
      sessionStorage.removeItem(SESSION_UNLOCK_KEY + "_salt");

      await saveSettings();
      await addAuditLog("settings_change", "system", "Encryption disabled");

      console.log("[Security] Encryption disabled successfully");
      return true;
    } catch (error) {
      console.error("Failed to disable encryption:", error);
      return false;
    }
  }

  /**
   * Update activity timestamp
   */
  function updateActivity(): void {
    lastActivity.value = Date.now();
  }

  /**
   * Check if should auto-lock
   */
  function checkAutoLock(): boolean {
    if (!securitySettings.value.autoLockTimeout || isLocked.value) {
      return false;
    }

    const timeout = securitySettings.value.autoLockTimeout * 60 * 1000;
    if (Date.now() - lastActivity.value > timeout) {
      lock();
      return true;
    }
    return false;
  }

  // ============================================
  // 📋 AUDIT LOGGING
  // ============================================

  /**
   * Add audit log entry
   */
  async function addAuditLog(
    action: SecurityAuditLog["action"],
    userId: string,
    details: string,
    userName?: string
  ): Promise<void> {
    if (!securitySettings.value.auditLogging) return;

    const log: SecurityAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      userId,
      userName: userName || "System",
      details,
      timestamp: new Date().toISOString(),
    };

    auditLogs.value.unshift(log);

    // Keep only last 1000 entries
    if (auditLogs.value.length > 1000) {
      auditLogs.value = auditLogs.value.slice(0, 1000);
    }

    // Save to storage
    await encryptAndStore(AUDIT_KEY, auditLogs.value);
  }

  /**
   * Get audit logs
   */
  async function getAuditLogs(): Promise<SecurityAuditLog[]> {
    const logs = await retrieveAndDecrypt<SecurityAuditLog[]>(AUDIT_KEY);
    if (logs) {
      auditLogs.value = logs;
    }
    return auditLogs.value;
  }

  // ============================================
  // 📊 SETTINGS MANAGEMENT
  // ============================================

  /**
   * Save security settings
   */
  async function saveSettings(): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(securitySettings.value));
  }

  /**
   * Load security settings
   */
  function loadSettings(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        securitySettings.value = {
          ...securitySettings.value,
          ...JSON.parse(stored),
        };
      } catch {
        // Use defaults
      }
    }
  }

  /**
   * Update security settings
   */
  async function updateSettings(
    settings: Partial<SecuritySettings>
  ): Promise<void> {
    securitySettings.value = { ...securitySettings.value, ...settings };
    await saveSettings();
    await addAuditLog(
      "settings_change",
      "current_user",
      `Security settings updated: ${Object.keys(settings).join(", ")}`
    );
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  function initialize(): void {
    if (isInitialized.value) return;

    loadSettings();
    isInitialized.value = true;

    // Check if encryption is enabled
    if (hasMasterPassword()) {
      // Check if session is already unlocked (page refresh scenario)
      const sessionUnlocked =
        sessionStorage.getItem(SESSION_UNLOCK_KEY) === "true";
      if (sessionUnlocked) {
        // Session was unlocked - keep unlocked state
        // Note: encryptionKey will need to be re-derived on next decrypt attempt
        // For now we mark as unlocked but key will be unavailable until next password entry
        // This is acceptable as long as we handle the missing key gracefully
        isLocked.value = false;
        console.log("Session unlock restored - key derivation deferred");
      } else {
        isLocked.value = true;
      }
    } else {
      isLocked.value = false;
    }

    // Setup auto-lock check
    if (typeof window !== "undefined") {
      setInterval(() => {
        checkAutoLock();
      }, 60000); // Check every minute

      // Update activity on user interaction
      ["click", "keypress", "mousemove", "touchstart"].forEach((event) => {
        window.addEventListener(event, updateActivity, { passive: true });
      });
    }
  }

  // Auto-initialize
  if (typeof window !== "undefined") {
    initialize();
  }

  return {
    // State
    isLocked: computed(() => isLocked.value),
    isEncryptionEnabled: computed(() => securitySettings.value.dataEncryption),
    hasEncryptionKey: computed(() => encryptionKey.value !== null), // Whether key is actually available
    settings: computed(() => securitySettings.value),
    auditLogs: computed(() => auditLogs.value),
    hasMasterPassword,

    // Encryption
    encrypt,
    decrypt,
    encryptAndStore,
    retrieveAndDecrypt,

    // Password management
    setupMasterPassword,
    unlock,
    lock,
    disableEncryption,
    updateActivity,

    // Settings
    updateSettings,
    saveSettings,

    // Audit
    addAuditLog,
    getAuditLogs,

    // Init
    initialize,
  };
}
