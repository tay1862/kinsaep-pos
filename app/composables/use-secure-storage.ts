// ============================================
// 🔐 SECURE STORAGE COMPOSABLE
// Encrypted data storage wrapper for Dexie + localStorage
// Integrates with useEncryption module
// ============================================

import { db } from '~/db/db';

/**
 * Sensitivity levels for different data types
 */
export type DataSensitivity = 'public' | 'internal' | 'sensitive' | 'critical';

/**
 * Storage configuration for different data types
 */
export interface StorageConfig {
  sensitivity: DataSensitivity;
  encryptFields?: string[];
  encryptAll?: boolean;
  ttl?: number; // Time-to-live in milliseconds
}

/**
 * Default storage configs by data type
 */
const DATA_CONFIGS: Record<string, StorageConfig> = {
  // Products - internal, don't need encryption typically
  product: {
    sensitivity: 'internal',
    encryptFields: ['cost', 'margin', 'supplierPrice'], // Only encrypt cost/margin data
  },
  
  // Orders - sensitive, encrypt payment details
  order: {
    sensitivity: 'sensitive',
    encryptFields: [
      'customerEmail',
      'customerPhone',
      'paymentDetails',
      'preimage',
      'paymentHash',
      'bankAccount',
    ],
  },
  
  // Customers - sensitive PII
  customer: {
    sensitivity: 'sensitive',
    encryptFields: [
      'email',
      'phone',
      'address',
      'notes',
      'lud16',
      'taxId',
      'bankAccount',
    ],
  },
  
  // Inventory - internal
  inventory: {
    sensitivity: 'internal',
    encryptFields: ['cost', 'supplierPrice'],
  },
  
  // Staff/Users - critical (contains credentials)
  staff: {
    sensitivity: 'critical',
    encryptFields: [
      'email',
      'phone',
      'pin',
      'password',
      'permissions',
    ],
  },
  
  // Settings - sensitive (contains API keys, etc.)
  settings: {
    sensitivity: 'sensitive',
    encryptFields: [
      'lightningApiKey',
      'hasuraAdminSecret',
      'webhookSecret',
      'nostrPrivkey',
    ],
  },
  
  // Payment proofs - critical
  payment: {
    sensitivity: 'critical',
    encryptAll: true,
  },
  
  // Sessions - sensitive
  session: {
    sensitivity: 'sensitive',
    encryptFields: ['token', 'refreshToken'],
    ttl: 24 * 60 * 60 * 1000, // 24 hours
  },
};

/**
 * 🔐 SECURE STORAGE COMPOSABLE
 * Provides encrypted storage operations for sensitive data
 */
export function useSecureStorage() {
  const encryption = useEncryption();
  const isInitialized = ref(false);
  const error = ref<string | null>(null);

  // ============================================
  // 🔧 INITIALIZATION
  // ============================================

  /**
   * Initialize secure storage with encryption keys
   */
  async function init(): Promise<boolean> {
    try {
      // Initialize encryption module
      await encryption.init();
      isInitialized.value = true;
      return true;
    } catch (err) {
      error.value = `Failed to initialize secure storage: ${err}`;
      return false;
    }
  }

  // ============================================
  // 🔐 ENCRYPTION HELPERS
  // ============================================

  /**
   * Encrypt specific fields in an object based on config
   */
  async function encryptObject<T extends Record<string, unknown>>(
    data: T,
    config: StorageConfig
  ): Promise<T> {
    if (config.encryptAll) {
      // Encrypt entire object
      const result = await encryption.encrypt(data);
      if (result.success && result.data) {
        return { __encrypted: true, data: result.data } as unknown as T;
      }
      return data;
    }

    if (!config.encryptFields?.length) {
      return data;
    }

    // Encrypt specific fields
    const encrypted = { ...data };
    for (const field of config.encryptFields) {
      if (field in encrypted && encrypted[field] !== undefined && encrypted[field] !== null) {
        const result = await encryption.encrypt(encrypted[field]);
        if (result.success && result.data) {
          (encrypted as Record<string, unknown>)[field] = {
            __encrypted: true,
            ...result.data,
          };
        }
      }
    }
    return encrypted;
  }

  /**
   * Decrypt specific fields in an object
   */
  async function decryptObject<T extends Record<string, unknown>>(
    data: T,
    config: StorageConfig
  ): Promise<T> {
    // Check if entire object is encrypted
    if ((data as Record<string, unknown>).__encrypted && (data as Record<string, unknown>).data) {
      const result = await encryption.decrypt<T>(
        (data as Record<string, unknown>).data as Parameters<typeof encryption.decrypt>[0]
      );
      return result.success && result.data ? result.data : data;
    }

    if (!config.encryptFields?.length) {
      return data;
    }

    // Decrypt specific fields
    const decrypted = { ...data };
    for (const field of config.encryptFields) {
      const value = decrypted[field];
      if (
        value &&
        typeof value === 'object' &&
        (value as Record<string, unknown>).__encrypted
      ) {
        const { __encrypted: _, ...envelope } = value as Record<string, unknown>;
        const result = await encryption.decrypt(envelope as unknown as Parameters<typeof encryption.decrypt>[0]);
        if (result.success) {
          (decrypted as Record<string, unknown>)[field] = result.data;
        }
      }
    }
    return decrypted;
  }

  // ============================================
  // 💾 DEXIE OPERATIONS (Encrypted)
  // ============================================

  /**
   * Save data to Dexie with encryption
   */
  async function saveToDb<T extends Record<string, unknown>>(
    table: string,
    id: string,
    data: T,
    dataType?: string
  ): Promise<boolean> {
    try {
      const config = DATA_CONFIGS[dataType || table] || { sensitivity: 'internal' };
      const encrypted = await encryptObject(data, config);
      
      const record = {
        id,
        data: JSON.stringify(encrypted),
        updatedAt: Date.now(),
        synced: false,
      };

      // Get the Dexie table dynamically
      const dbTable = (db as unknown as Record<string, { put: (record: unknown) => Promise<unknown> }>)[table];
      if (!dbTable) {
        error.value = `Table ${table} not found`;
        return false;
      }

      await dbTable.put(record);
      return true;
    } catch (err) {
      error.value = `Failed to save to ${table}: ${err}`;
      return false;
    }
  }

  /**
   * Load data from Dexie with decryption
   */
  async function loadFromDb<T extends Record<string, unknown>>(
    table: string,
    id: string,
    dataType?: string
  ): Promise<T | null> {
    try {
      const config = DATA_CONFIGS[dataType || table] || { sensitivity: 'internal' };
      
      const dbTable = (db as unknown as Record<string, { get: (id: string) => Promise<{ data: string } | undefined> }>)[table];
      if (!dbTable) {
        error.value = `Table ${table} not found`;
        return null;
      }

      const record = await dbTable.get(id);
      if (!record) return null;

      const data = JSON.parse(record.data) as T;
      return await decryptObject(data, config);
    } catch (err) {
      error.value = `Failed to load from ${table}: ${err}`;
      return null;
    }
  }

  /**
   * Load all records from a table with decryption
   */
  async function loadAllFromDb<T extends Record<string, unknown>>(
    table: string,
    dataType?: string
  ): Promise<T[]> {
    try {
      const config = DATA_CONFIGS[dataType || table] || { sensitivity: 'internal' };
      
      const dbTable = (db as unknown as Record<string, { toArray: () => Promise<{ data: string }[]> }>)[table];
      if (!dbTable) {
        error.value = `Table ${table} not found`;
        return [];
      }

      const records = await dbTable.toArray();
      const decrypted: T[] = [];
      
      for (const record of records) {
        try {
          const data = JSON.parse(record.data) as T;
          decrypted.push(await decryptObject(data, config));
        } catch {
          // Skip invalid records
        }
      }
      
      return decrypted;
    } catch (err) {
      error.value = `Failed to load all from ${table}: ${err}`;
      return [];
    }
  }

  // ============================================
  // 🌐 LOCALSTORAGE OPERATIONS (Encrypted)
  // ============================================

  /**
   * Save to localStorage with encryption
   */
  async function saveToLocal(
    key: string,
    data: unknown,
    dataType?: string
  ): Promise<boolean> {
    try {
      const config = DATA_CONFIGS[dataType || 'settings'] || { sensitivity: 'internal' };
      
      if (config.sensitivity === 'critical' || config.sensitivity === 'sensitive') {
        // Use encrypted storage
        return await encryption.secureStore(key, data);
      }
      
      // Plain storage for non-sensitive data
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (err) {
      error.value = `Failed to save to localStorage: ${err}`;
      return false;
    }
  }

  /**
   * Load from localStorage with decryption
   */
  async function loadFromLocal<T>(
    key: string,
    dataType?: string
  ): Promise<T | null> {
    try {
      const config = DATA_CONFIGS[dataType || 'settings'] || { sensitivity: 'internal' };
      
      if (config.sensitivity === 'critical' || config.sensitivity === 'sensitive') {
        // Use encrypted storage
        return await encryption.secureRetrieve<T>(key);
      }
      
      // Plain storage for non-sensitive data
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      error.value = `Failed to load from localStorage: ${err}`;
      return null;
    }
  }

  /**
   * Remove from localStorage
   */
  function removeFromLocal(key: string): void {
    localStorage.removeItem(key);
    localStorage.removeItem(`encrypted:${key}`);
  }

  // ============================================
  // 🔄 BATCH OPERATIONS
  // ============================================

  /**
   * Encrypt and export all data for backup
   */
  async function exportEncrypted(tables: string[] = ['products', 'orders', 'customers']): Promise<string> {
    const exportData: Record<string, unknown[]> = {};
    
    for (const table of tables) {
      exportData[table] = await loadAllFromDb(table);
    }

    // Encrypt entire export
    const result = await encryption.encrypt(exportData);
    if (result.success && result.data) {
      return JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        encrypted: true,
        data: result.data,
      });
    }

    throw new Error('Failed to encrypt export data');
  }

  /**
   * Decrypt and import data from backup
   */
  async function importEncrypted(encryptedBackup: string): Promise<{ success: boolean; imported: Record<string, number> }> {
    try {
      const backup = JSON.parse(encryptedBackup);
      
      if (!backup.encrypted || !backup.data) {
        throw new Error('Invalid backup format');
      }

      const result = await encryption.decrypt<Record<string, unknown[]>>(backup.data);
      if (!result.success || !result.data) {
        throw new Error('Failed to decrypt backup');
      }

      const imported: Record<string, number> = {};
      
      for (const [table, records] of Object.entries(result.data)) {
        let count = 0;
        for (const record of records) {
          const success = await saveToDb(
            table,
            (record as Record<string, unknown>).id as string,
            record as Record<string, unknown>
          );
          if (success) count++;
        }
        imported[table] = count;
      }

      return { success: true, imported };
    } catch (err) {
      error.value = `Import failed: ${err}`;
      return { success: false, imported: {} };
    }
  }

  // ============================================
  // 🧹 CLEANUP
  // ============================================

  /**
   * Clear all encrypted data (for logout/reset)
   */
  async function clearAll(): Promise<void> {
    // Clear Dexie
    await db.delete();
    await db.open();
    
    // Clear encrypted localStorage items
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('encrypted:') || key?.startsWith('pos:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Re-encrypt all data with new key (for key rotation)
   */
  async function reEncryptAll(newKeyId?: string): Promise<boolean> {
    try {
      // TODO: Implement bulk re-encryption
      // This would iterate through all tables and re-encrypt with new key
      console.log('Re-encryption with new key:', newKeyId);
      return true;
    } catch (err) {
      error.value = `Re-encryption failed: ${err}`;
      return false;
    }
  }

  // ============================================
  // 📊 RETURN
  // ============================================

  return {
    // State
    isInitialized: readonly(isInitialized),
    error: readonly(error),

    // Initialization
    init,

    // Dexie operations
    saveToDb,
    loadFromDb,
    loadAllFromDb,

    // localStorage operations
    saveToLocal,
    loadFromLocal,
    removeFromLocal,

    // Batch operations
    exportEncrypted,
    importEncrypted,

    // Cleanup
    clearAll,
    reEncryptAll,

    // Config
    DATA_CONFIGS,
  };
}
