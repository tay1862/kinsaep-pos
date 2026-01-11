// ============================================
// 🏪 COMPANY CODE COMPOSABLE
// Enables cross-device staff login via simple 6-digit code
// ============================================

import { ref, computed } from "vue";

// Storage keys
const STORAGE_KEYS = {
  COMPANY_CODE: "bitspace_company_code",
  COMPANY_CODE_HASH: "bitspace_company_code_hash",
  COMPANY_OWNER_PUBKEY: "bitspace_company_owner_pubkey",
  IS_ENABLED: "bitspace_company_code_enabled",
} as const;

// Singleton state
const companyCode = ref<string | null>(null);
const companyCodeHash = ref<string | null>(null);
const ownerPubkey = ref<string | null>(null);
const isCompanyCodeEnabled = ref(false); // Default off
const isInitialized = ref(false);

export function useCompany() {
  // ============================================
  // 🔢 CODE GENERATION
  // ============================================

  /**
   * Generate a secure company code in format: XXXXX-XXXXX-XXXXX
   * Uses alphanumeric characters (no confusing ones like 0/O, 1/I/L)
   * Provides ~77 bits of entropy for strong security
   */
  function generateCompanyCode(): string {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 30 chars, no confusing 0/O/1/I/L
    const segments = 3;
    const segmentLength = 5;

    const generateSegment = () => {
      let segment = "";
      const randomBytes = crypto.getRandomValues(new Uint8Array(segmentLength));
      for (let i = 0; i < segmentLength; i++) {
        segment += chars.charAt(randomBytes[i]! % chars.length);
      }
      return segment;
    };

    const code = Array(segments)
      .fill(0)
      .map(() => generateSegment())
      .join("-");
    return code; // e.g., "A7K3X-BX9PM-M4NHY"
  }

  /**
   * Validate company code format (supports both old and new formats)
   */
  function isValidCompanyCode(code: string): boolean {
    // New format: XXXXX-XXXXX-XXXXX (15 chars + 2 dashes = 17 total)
    const newPattern = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
    // Old format: XXXX-XXXX-XXXX (12 chars + 2 dashes = 14 total) - for backward compatibility
    const oldPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    const upperCode = code.toUpperCase();
    return newPattern.test(upperCode) || oldPattern.test(upperCode);
  }

  /**
   * Simple fallback hash for insecure contexts (non-HTTPS)
   * Uses djb2 algorithm - not cryptographically secure but works for basic hashing
   */
  function fallbackHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return Math.abs(hash).toString(16).padStart(16, "0").slice(0, 16);
  }

  /**
   * Hash the company code for use in event tags
   * This allows querying without exposing the actual code
   */
  async function hashCompanyCode(code: string): Promise<string> {
    const input = `bitspace:company:${code}`;

    // Check if crypto.subtle is available (only in secure contexts)
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return hashHex.slice(0, 16); // Use first 16 chars for shorter tag
    }

    // Fallback for insecure contexts (e.g., HTTP on local network)
    console.warn("[Company] crypto.subtle not available, using fallback hash");
    return fallbackHash(input);
  }

  /**
   * Derive an encryption key from the company code
   * Used for encrypting/decrypting user data
   */
  async function deriveKeyFromCode(code: string): Promise<CryptoKey | null> {
    // Check if crypto.subtle is available
    if (typeof crypto === "undefined" || !crypto.subtle) {
      console.warn(
        "[Company] crypto.subtle not available - encryption disabled"
      );
      return null;
    }

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(code),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );

    // Use a fixed salt (since all devices need same key from same code)
    const salt = encoder.encode("bitspace-pos-company-v1");

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  // ============================================
  // 🔐 ENCRYPTION/DECRYPTION
  // ============================================

  /**
   * Encrypt data using company code
   */
  async function encryptWithCode<T>(
    data: T,
    code: string
  ): Promise<string | null> {
    const key = await deriveKeyFromCode(code);
    if (!key) {
      console.warn(
        "[Company] Encryption unavailable - crypto.subtle not available"
      );
      return null;
    }

    const encoder = new TextEncoder();
    const plaintext = JSON.stringify(data);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(plaintext)
    );

    // Combine IV + ciphertext and encode as base64
    const combined = new Uint8Array(
      iv.length + new Uint8Array(ciphertext).length
    );
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt data using company code
   */
  async function decryptWithCode<T>(
    encrypted: string,
    code: string
  ): Promise<T | null> {
    try {
      const key = await deriveKeyFromCode(code);
      if (!key) {
        console.warn(
          "[Company] Decryption unavailable - crypto.subtle not available"
        );
        return null;
      }

      const decoder = new TextDecoder();

      // Decode base64
      const combined = new Uint8Array(
        atob(encrypted)
          .split("")
          .map((c) => c.charCodeAt(0))
      );

      // Extract IV and ciphertext
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
      );

      return JSON.parse(decoder.decode(plaintext)) as T;
    } catch (error) {
      // This is expected when switching shops or trying to decrypt with wrong code
      // Only log at debug level, not as error
      if (import.meta.dev) {
        console.debug("[Company] Decryption failed (wrong code or corrupted data)");
      }
      return null;
    }
  }

  // ============================================
  // 💾 STORAGE
  // ============================================

  /**
   * Set and save the company code
   */
  async function setCompanyCode(code: string, pubkey?: string): Promise<void> {
    companyCode.value = code;
    companyCodeHash.value = await hashCompanyCode(code);
    if (pubkey) {
      ownerPubkey.value = pubkey;
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.COMPANY_CODE, code);
    localStorage.setItem(STORAGE_KEYS.COMPANY_CODE_HASH, companyCodeHash.value);
    if (pubkey) {
      localStorage.setItem(STORAGE_KEYS.COMPANY_OWNER_PUBKEY, pubkey);
    }
  }

  /**
   * Load company code from storage
   * Auto-migrates old 8-character hashes to new 16-character format
   */
  async function loadCompanyCode(): Promise<void> {
    if (!import.meta.client) return;

    const storedCode = localStorage.getItem(STORAGE_KEYS.COMPANY_CODE);
    const storedHash = localStorage.getItem(STORAGE_KEYS.COMPANY_CODE_HASH);
    const storedPubkey = localStorage.getItem(
      STORAGE_KEYS.COMPANY_OWNER_PUBKEY
    );
    const storedEnabled = localStorage.getItem(STORAGE_KEYS.IS_ENABLED);

    if (storedCode) companyCode.value = storedCode;
    if (storedPubkey) ownerPubkey.value = storedPubkey;

    // ============================================
    // 🔄 AUTO-MIGRATION: Fix old 8-char hashes
    // ============================================
    if (storedCode && storedHash) {
      // Check if hash is old format (8 chars) or mismatched
      const correctHash = await hashCompanyCode(storedCode);

      if (storedHash !== correctHash) {
        console.warn(
          `[Company] 🔄 Migrating company hash from ${storedHash.length} to ${correctHash.length} characters`
        );
        console.log(
          `[Company] Old hash: ${storedHash.slice(0, 8)}... → New hash: ${correctHash.slice(0, 8)}...`
        );

        // Update to correct hash
        companyCodeHash.value = correctHash;
        localStorage.setItem(STORAGE_KEYS.COMPANY_CODE_HASH, correctHash);

        console.log("[Company] ✅ Hash migration complete");
      } else {
        companyCodeHash.value = storedHash;
      }
    } else if (storedHash) {
      companyCodeHash.value = storedHash;
    }

    // Default to false if not set, otherwise parse value
    isCompanyCodeEnabled.value = storedEnabled === "true";

    isInitialized.value = true;
  }

  /**
   * Clear company code (for logout/reset)
   */
  function clearCompanyCode(): void {
    companyCode.value = null;
    companyCodeHash.value = null;
    ownerPubkey.value = null;

    localStorage.removeItem(STORAGE_KEYS.COMPANY_CODE);
    localStorage.removeItem(STORAGE_KEYS.COMPANY_CODE_HASH);
    localStorage.removeItem(STORAGE_KEYS.COMPANY_OWNER_PUBKEY);
  }

  /**
   * Check if a code is valid (matches stored hash)
   */
  async function validateCode(code: string): Promise<boolean> {
    if (!companyCodeHash.value) return false;
    const inputHash = await hashCompanyCode(code);
    return inputHash === companyCodeHash.value;
  }

  // ============================================
  // 🏪 COMPANY SETUP
  // ============================================

  /**
   * Initialize company for owner (generates new code if needed)
   */
  async function initializeCompany(ownerPubkeyHex: string): Promise<string> {
    // Check if already have a code
    if (companyCode.value) {
      return companyCode.value;
    }

    // Generate new code
    const newCode = generateCompanyCode();
    await setCompanyCode(newCode, ownerPubkeyHex);

    console.log("[Company] Initialized company with code:", newCode);
    return newCode;
  }

  // Auto-initialize
  if (typeof window !== "undefined") {
    loadCompanyCode();
  }

  /**
   * Toggle company code feature
   */
  function toggleCompanyCode(enabled: boolean): void {
    isCompanyCodeEnabled.value = enabled;
    localStorage.setItem(STORAGE_KEYS.IS_ENABLED, String(enabled));
  }

  return {
    // State
    companyCode: computed(() => companyCode.value),
    companyCodeHash: computed(() => companyCodeHash.value),
    ownerPubkey: computed(() => ownerPubkey.value),
    hasCompanyCode: computed(() => !!companyCode.value),
    isInitialized: computed(() => isInitialized.value),
    isCompanyCodeEnabled: computed(() => isCompanyCodeEnabled.value), // Export state

    // Code management
    generateCompanyCode,
    isValidCompanyCode,
    hashCompanyCode,
    setCompanyCode,
    loadCompanyCode,
    clearCompanyCode,
    validateCode,
    initializeCompany,
    toggleCompanyCode, // Export function

    // Encryption
    deriveKeyFromCode,
    encryptWithCode,
    decryptWithCode,
  };
}
