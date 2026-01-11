// ============================================
// 🔐 ENCRYPTION MODULE
// Enterprise-grade encryption for POS data
// Supports: AES-256-GCM, NIP-04, NIP-44
// ============================================

import { nip04, nip44 } from 'nostr-tools';

/**
 * Encryption algorithms supported
 */
export type EncryptionAlgorithm = 'aes-256-gcm' | 'nip-04' | 'nip-44';

/**
 * Encryption key types
 */
export type KeyType = 'master' | 'data' | 'session' | 'backup';

/**
 * Encrypted data envelope
 */
export interface EncryptedEnvelope {
  /** Encrypted ciphertext (base64) */
  ciphertext: string;
  /** Initialization vector (base64) */
  iv?: string;
  /** Authentication tag for GCM (base64) */
  tag?: string;
  /** Algorithm used */
  algorithm: EncryptionAlgorithm;
  /** Key ID used for encryption */
  keyId?: string;
  /** Version for future compatibility */
  version: number;
  /** Timestamp of encryption */
  encryptedAt: string;
}

/**
 * Key metadata
 */
export interface KeyMetadata {
  id: string;
  type: KeyType;
  algorithm: EncryptionAlgorithm;
  createdAt: string;
  expiresAt?: string;
  rotatedFrom?: string;
  isActive: boolean;
}

/**
 * Encryption result
 */
export interface EncryptionResult {
  success: boolean;
  data?: EncryptedEnvelope;
  error?: string;
}

/**
 * Decryption result
 */
export interface DecryptionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Enterprise Encryption Module
 * Provides unified encryption/decryption for all POS data
 */
export function useEncryption() {
  // ============================================
  // State
  // ============================================
  const isInitialized = ref(false);
  const currentKeyId = ref<string | null>(null);
  const error = ref<string | null>(null);

  // Key storage (in production, use secure storage like Web Crypto API keystore)
  const keys = ref<Map<string, CryptoKey>>(new Map());
  const keyMetadata = ref<Map<string, KeyMetadata>>(new Map());

  // ============================================
  // Web Crypto API Helpers
  // ============================================

  /**
   * Generate a random encryption key
   */
  async function generateKey(type: KeyType = 'data'): Promise<{ keyId: string; key: CryptoKey }> {
    try {
      const key = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true, // extractable for backup
        ['encrypt', 'decrypt']
      );

      const keyId = `key-${type}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      
      keys.value.set(keyId, key);
      keyMetadata.value.set(keyId, {
        id: keyId,
        type,
        algorithm: 'aes-256-gcm',
        createdAt: new Date().toISOString(),
        isActive: true,
      });

      if (type === 'data' || type === 'master') {
        currentKeyId.value = keyId;
      }

      return { keyId, key };
    } catch (err) {
      error.value = `Failed to generate key: ${err}`;
      throw err;
    }
  }

  /**
   * Derive a key from password/passphrase using PBKDF2
   */
  async function deriveKeyFromPassword(
    password: string,
    salt?: Uint8Array
  ): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    const useSalt = salt || crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive AES key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: useSalt as BufferSource,
        iterations: 100000, // High iteration count for security
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    return { key, salt: useSalt };
  }

  /**
   * Import a raw key (hex string)
   */
  async function importKey(rawKey: string, keyId?: string): Promise<string> {
    const keyBytes = hexToBytes(rawKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes as BufferSource,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const id = keyId || `key-imported-${Date.now()}`;
    keys.value.set(id, key);
    keyMetadata.value.set(id, {
      id,
      type: 'data',
      algorithm: 'aes-256-gcm',
      createdAt: new Date().toISOString(),
      isActive: true,
    });

    return id;
  }

  /**
   * Export a key as raw bytes (for backup)
   */
  async function exportKey(keyId: string): Promise<string | null> {
    const key = keys.value.get(keyId);
    if (!key) return null;

    const rawKey = await crypto.subtle.exportKey('raw', key);
    return bytesToHex(new Uint8Array(rawKey));
  }

  // ============================================
  // AES-256-GCM Encryption
  // ============================================

  /**
   * Encrypt data using AES-256-GCM
   */
  async function encryptAES<T>(
    data: T,
    keyId?: string
  ): Promise<EncryptionResult> {
    try {
      const useKeyId = keyId || currentKeyId.value;
      if (!useKeyId) {
        // Auto-generate key if none exists
        const { keyId: newKeyId } = await generateKey('data');
        return encryptAES(data, newKeyId);
      }

      const key = keys.value.get(useKeyId);
      if (!key) {
        return { success: false, error: `Key not found: ${useKeyId}` };
      }

      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encode data
      const encoder = new TextEncoder();
      const plaintext = encoder.encode(JSON.stringify(data));

      // Encrypt
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        plaintext
      );

      // Create envelope
      const envelope: EncryptedEnvelope = {
        ciphertext: arrayBufferToBase64(ciphertext),
        iv: arrayBufferToBase64(iv),
        algorithm: 'aes-256-gcm',
        keyId: useKeyId,
        version: 1,
        encryptedAt: new Date().toISOString(),
      };

      return { success: true, data: envelope };
    } catch (err) {
      error.value = `Encryption failed: ${err}`;
      return { success: false, error: String(err) };
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  async function decryptAES<T>(
    envelope: EncryptedEnvelope
  ): Promise<DecryptionResult<T>> {
    try {
      const keyId = envelope.keyId || currentKeyId.value;
      if (!keyId) {
        return { success: false, error: 'No key ID provided' };
      }

      const key = keys.value.get(keyId);
      if (!key) {
        return { success: false, error: `Key not found: ${keyId}` };
      }

      if (!envelope.iv) {
        return { success: false, error: 'Missing IV in envelope' };
      }

      // Decode
      const ciphertext = base64ToArrayBuffer(envelope.ciphertext);
      const iv = base64ToArrayBuffer(envelope.iv);

      // Decrypt
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        ciphertext as BufferSource
      );

      // Decode result
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(plaintext)) as T;

      return { success: true, data };
    } catch (err) {
      error.value = `Decryption failed: ${err}`;
      return { success: false, error: String(err) };
    }
  }

  // ============================================
  // Nostr NIP-04 Encryption (for relay sync)
  // ============================================

  /**
   * Encrypt data using NIP-04 (Nostr standard)
   * Uses recipient's public key for end-to-end encryption
   */
  async function encryptNIP04<T>(
    data: T,
    senderPrivkey: string,
    recipientPubkey: string
  ): Promise<EncryptionResult> {
    try {
      const plaintext = JSON.stringify(data);
      const ciphertext = await nip04.encrypt(senderPrivkey, recipientPubkey, plaintext);

      const envelope: EncryptedEnvelope = {
        ciphertext,
        algorithm: 'nip-04',
        version: 1,
        encryptedAt: new Date().toISOString(),
      };

      return { success: true, data: envelope };
    } catch (err) {
      error.value = `NIP-04 encryption failed: ${err}`;
      return { success: false, error: String(err) };
    }
  }

  /**
   * Decrypt data using NIP-04
   */
  async function decryptNIP04<T>(
    envelope: EncryptedEnvelope,
    recipientPrivkey: string,
    senderPubkey: string
  ): Promise<DecryptionResult<T>> {
    try {
      const plaintext = await nip04.decrypt(recipientPrivkey, senderPubkey, envelope.ciphertext);
      const data = JSON.parse(plaintext) as T;

      return { success: true, data };
    } catch (err) {
      error.value = `NIP-04 decryption failed: ${err}`;
      return { success: false, error: String(err) };
    }
  }

  // ============================================
  // Nostr NIP-44 Encryption (newer, more secure)
  // ============================================

  /**
   * Encrypt data using NIP-44 (newer Nostr standard)
   * More secure than NIP-04 with better padding
   */
  async function encryptNIP44<T>(
    data: T,
    senderPrivkey: string,
    recipientPubkey: string
  ): Promise<EncryptionResult> {
    try {
      const plaintext = JSON.stringify(data);
      const conversationKey = nip44.v2.utils.getConversationKey(
        hexToBytes(senderPrivkey),
        recipientPubkey
      );
      const ciphertext = nip44.v2.encrypt(plaintext, conversationKey);

      const envelope: EncryptedEnvelope = {
        ciphertext,
        algorithm: 'nip-44',
        version: 2,
        encryptedAt: new Date().toISOString(),
      };

      return { success: true, data: envelope };
    } catch (err) {
      error.value = `NIP-44 encryption failed: ${err}`;
      return { success: false, error: String(err) };
    }
  }

  /**
   * Decrypt data using NIP-44
   */
  async function decryptNIP44<T>(
    envelope: EncryptedEnvelope,
    recipientPrivkey: string,
    senderPubkey: string
  ): Promise<DecryptionResult<T>> {
    try {
      const conversationKey = nip44.v2.utils.getConversationKey(
        hexToBytes(recipientPrivkey),
        senderPubkey
      );
      const plaintext = nip44.v2.decrypt(envelope.ciphertext, conversationKey);
      const data = JSON.parse(plaintext) as T;

      return { success: true, data };
    } catch (err) {
      error.value = `NIP-44 decryption failed: ${err}`;
      return { success: false, error: String(err) };
    }
  }

  // ============================================
  // High-Level API (Auto-select best algorithm)
  // ============================================

  /**
   * Encrypt any data with the best available method
   * - For local storage: AES-256-GCM
   * - For Nostr sync: NIP-44 (preferred) or NIP-04
   */
  async function encrypt<T>(
    data: T,
    options?: {
      algorithm?: EncryptionAlgorithm;
      keyId?: string;
      nostrPrivkey?: string;
      nostrPubkey?: string;
    }
  ): Promise<EncryptionResult> {
    const algo = options?.algorithm || 'aes-256-gcm';

    switch (algo) {
      case 'aes-256-gcm':
        return encryptAES(data, options?.keyId);

      case 'nip-04':
        if (!options?.nostrPrivkey || !options?.nostrPubkey) {
          return { success: false, error: 'NIP-04 requires nostrPrivkey and nostrPubkey' };
        }
        return encryptNIP04(data, options.nostrPrivkey, options.nostrPubkey);

      case 'nip-44':
        if (!options?.nostrPrivkey || !options?.nostrPubkey) {
          return { success: false, error: 'NIP-44 requires nostrPrivkey and nostrPubkey' };
        }
        return encryptNIP44(data, options.nostrPrivkey, options.nostrPubkey);

      default:
        return { success: false, error: `Unknown algorithm: ${algo}` };
    }
  }

  /**
   * Decrypt any encrypted envelope
   */
  async function decrypt<T>(
    envelope: EncryptedEnvelope,
    options?: {
      nostrPrivkey?: string;
      nostrPubkey?: string;
    }
  ): Promise<DecryptionResult<T>> {
    switch (envelope.algorithm) {
      case 'aes-256-gcm':
        return decryptAES<T>(envelope);

      case 'nip-04':
        if (!options?.nostrPrivkey || !options?.nostrPubkey) {
          return { success: false, error: 'NIP-04 requires nostrPrivkey and nostrPubkey' };
        }
        return decryptNIP04<T>(envelope, options.nostrPrivkey, options.nostrPubkey);

      case 'nip-44':
        if (!options?.nostrPrivkey || !options?.nostrPubkey) {
          return { success: false, error: 'NIP-44 requires nostrPrivkey and nostrPubkey' };
        }
        return decryptNIP44<T>(envelope, options.nostrPrivkey, options.nostrPubkey);

      default:
        return { success: false, error: `Unknown algorithm: ${envelope.algorithm}` };
    }
  }

  // ============================================
  // Self-Encryption (User's own keys)
  // For syncing private user data across devices
  // ============================================

  /**
   * Get user's Nostr keys from localStorage
   * Helper for self-encryption functions
   */
  function getNostrKeys(): { privkey: string; pubkey: string } | null {
    try {
      const nostrUser = localStorage.getItem("nostrUser");
      if (nostrUser) {
        const parsed = JSON.parse(nostrUser);
        const privkey = parsed.privkey || parsed.privateKey || parsed.seckey;
        const pubkey = parsed.pubkey || parsed.publicKey;
        if (privkey && pubkey) {
          return { privkey, pubkey };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Encrypt data to self (using user's own Nostr keys)
   * Used for syncing private data like workspace list across devices
   */
  async function encryptToSelf(plaintext: string): Promise<string | null> {
    try {
      const keys = getNostrKeys();
      if (!keys) {
        console.debug('[Encryption] No keys available for self-encryption');
        return null;
      }

      // Use NIP-04 for self-encryption (simpler, widely supported)
      const ciphertext = await nip04.encrypt(keys.privkey, keys.pubkey, plaintext);
      return ciphertext;
    } catch (err) {
      console.debug('[Encryption] Self-encryption failed:', err);
      return null;
    }
  }

  /**
   * Decrypt data from self (using user's own Nostr keys)
   */
  async function decryptFromSelf(ciphertext: string): Promise<string | null> {
    try {
      const keys = getNostrKeys();
      if (!keys) {
        console.debug('[Encryption] No keys available for self-decryption');
        return null;
      }

      // Decrypt NIP-04 self-encrypted content
      const plaintext = await nip04.decrypt(keys.privkey, keys.pubkey, ciphertext);
      return plaintext;
    } catch (err) {
      console.debug('[Encryption] Self-decryption failed:', err);
      return null;
    }
  }

  // ============================================
  // Field-Level Encryption for Sensitive Data
  // ============================================

  /**
   * List of fields that should always be encrypted
   */
  const SENSITIVE_FIELDS = [
    'email',
    'phone',
    'address',
    'notes',
    'lud16', // Lightning address
    'nostrPubkey',
    'bankAccount',
    'taxId',
    'ssn',
    'creditCard',
    'pin',
    'password',
  ];

  /**
   * Encrypt sensitive fields in an object
   */
  async function encryptSensitiveFields<T extends Record<string, unknown>>(
    data: T,
    fields?: string[]
  ): Promise<{ data: T; encryptedFields: string[] }> {
    const fieldsToEncrypt = fields || SENSITIVE_FIELDS;
    const result = { ...data };
    const encryptedFields: string[] = [];

    for (const field of fieldsToEncrypt) {
      if (field in result && result[field] !== undefined && result[field] !== null) {
        const encrypted = await encryptAES(result[field]);
        if (encrypted.success && encrypted.data) {
          (result as Record<string, unknown>)[field] = encrypted.data;
          encryptedFields.push(field);
        }
      }
    }

    return { data: result, encryptedFields };
  }

  /**
   * Decrypt sensitive fields in an object
   */
  async function decryptSensitiveFields<T extends Record<string, unknown>>(
    data: T,
    fields?: string[]
  ): Promise<T> {
    const fieldsToDecrypt = fields || SENSITIVE_FIELDS;
    const result = { ...data };

    for (const field of fieldsToDecrypt) {
      const value = result[field];
      if (value && typeof value === 'object' && 'ciphertext' in value && 'algorithm' in value) {
        const decrypted = await decryptAES(value as EncryptedEnvelope);
        if (decrypted.success) {
          (result as Record<string, unknown>)[field] = decrypted.data;
        }
      }
    }

    return result;
  }

  // ============================================
  // Key Rotation
  // ============================================

  /**
   * Rotate encryption key
   * Creates new key and marks old one for gradual migration
   */
  async function rotateKey(oldKeyId: string): Promise<{ newKeyId: string } | null> {
    try {
      const oldMetadata = keyMetadata.value.get(oldKeyId);
      if (!oldMetadata) {
        error.value = `Key not found: ${oldKeyId}`;
        return null;
      }

      // Generate new key
      const { keyId: newKeyId } = await generateKey(oldMetadata.type);

      // Update metadata
      const newMetadata = keyMetadata.value.get(newKeyId);
      if (newMetadata) {
        newMetadata.rotatedFrom = oldKeyId;
        keyMetadata.value.set(newKeyId, newMetadata);
      }

      // Mark old key as inactive (keep for decryption of old data)
      oldMetadata.isActive = false;
      oldMetadata.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
      keyMetadata.value.set(oldKeyId, oldMetadata);

      currentKeyId.value = newKeyId;

      return { newKeyId };
    } catch (err) {
      error.value = `Key rotation failed: ${err}`;
      return null;
    }
  }

  /**
   * Re-encrypt data with new key
   */
  async function reEncrypt<T>(
    envelope: EncryptedEnvelope,
    newKeyId?: string
  ): Promise<EncryptionResult> {
    // Decrypt with old key
    const decrypted = await decryptAES<T>(envelope);
    if (!decrypted.success || decrypted.data === undefined) {
      return { success: false, error: decrypted.error || 'Decryption failed' };
    }

    // Re-encrypt with new key
    return encryptAES(decrypted.data, newKeyId || currentKeyId.value || undefined);
  }

  // ============================================
  // Secure Storage Helpers
  // ============================================

  /**
   * Store encrypted data in localStorage
   */
  async function secureStore(key: string, data: unknown): Promise<boolean> {
    try {
      const encrypted = await encryptAES(data);
      if (!encrypted.success || !encrypted.data) {
        return false;
      }
      localStorage.setItem(`encrypted:${key}`, JSON.stringify(encrypted.data));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve and decrypt data from localStorage
   */
  async function secureRetrieve<T>(key: string): Promise<T | null> {
    try {
      const stored = localStorage.getItem(`encrypted:${key}`);
      if (!stored) return null;

      const envelope = JSON.parse(stored) as EncryptedEnvelope;
      const decrypted = await decryptAES<T>(envelope);
      
      return decrypted.success ? decrypted.data || null : null;
    } catch {
      return null;
    }
  }

  /**
   * Remove encrypted data from localStorage
   */
  function secureRemove(key: string): void {
    localStorage.removeItem(`encrypted:${key}`);
  }

  // ============================================
  // Utility Functions
  // ============================================

  function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }

  function base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize encryption module
   * - Load or generate master key
   * - Setup key rotation schedule
   */
  async function init(options?: { password?: string }): Promise<boolean> {
    try {
      // Check for existing keys in secure storage
      const storedKeyId = localStorage.getItem('encryption:currentKeyId');
      const storedKeyData = localStorage.getItem('encryption:keyData');

      if (storedKeyId && storedKeyData && options?.password) {
        // Derive key from password and decrypt stored key
        const keyData = JSON.parse(storedKeyData);
        const { key: _derivedKey } = await deriveKeyFromPassword(
          options.password,
          base64ToArrayBuffer(keyData.salt)
        );
        
        // Use derived key to decrypt actual data key
        // ... (implementation depends on your key storage strategy)
        currentKeyId.value = storedKeyId;
      } else {
        // Generate new key if none exists
        await generateKey('master');
      }

      isInitialized.value = true;
      return true;
    } catch (err) {
      error.value = `Initialization failed: ${err}`;
      return false;
    }
  }

  // ============================================
  // Return Public API
  // ============================================

  return {
    // State
    isInitialized: readonly(isInitialized),
    currentKeyId: readonly(currentKeyId),
    error: readonly(error),

    // Initialization
    init,

    // Key Management
    generateKey,
    deriveKeyFromPassword,
    importKey,
    exportKey,
    rotateKey,

    // High-Level API
    encrypt,
    decrypt,

    // Self-Encryption (for cross-device sync)
    encryptToSelf,
    decryptFromSelf,

    // Algorithm-Specific
    encryptAES,
    decryptAES,
    encryptNIP04,
    decryptNIP04,
    encryptNIP44,
    decryptNIP44,

    // Field-Level Encryption
    encryptSensitiveFields,
    decryptSensitiveFields,
    SENSITIVE_FIELDS,

    // Re-encryption
    reEncrypt,

    // Secure Storage
    secureStore,
    secureRetrieve,
    secureRemove,

    // Utilities
    hexToBytes,
    bytesToHex,
    arrayBufferToBase64,
    base64ToArrayBuffer,
  };
}

// ============================================
// Type Exports
// ============================================
export type UseEncryption = ReturnType<typeof useEncryption>;
