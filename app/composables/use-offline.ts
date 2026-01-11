// composables/use-offline.ts
// 📴 Offline Payment System - Works without internet!

import { ref, computed, watch } from 'vue';
import { db, type NostrEvent } from '~/db/db';
import type {
  OfflineTransaction,
  PaymentProof,
  Order,
  SyncQueue
} from '~/types';
import { NOSTR_KINDS } from '~/types/nostr-kinds';

export const useOffline = () => {
  // State
  const isOnline = ref(navigator.onLine);
  const pendingTransactions = ref<OfflineTransaction[]>([]);
  const isSyncing = ref(false);
  const lastSyncTime = ref<string | null>(null);
  const syncError = ref<string | null>(null);

  // Network status listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      isOnline.value = true;
      // Auto-sync when back online
      syncPendingTransactions();
    });

    window.addEventListener('offline', () => {
      isOnline.value = false;
    });
  }

  /**
   * Initialize offline system - load pending transactions from IndexedDB
   */
  const init = async () => {
    try {
      const pending = await db.pendingSync.where('status').equals('pending').toArray();
      pendingTransactions.value = pending.map(p => ({
        id: p.id?.toString() || crypto.randomUUID(),
        orderId: p.event.id,
        paymentProof: JSON.parse(p.event.content),
        order: JSON.parse(p.event.content),
        createdAt: new Date(p.event.created_at * 1000).toISOString(),
        syncStatus: 'pending',
        syncAttempts: 0,
      }));
    } catch (e) {
      console.error('Failed to load pending transactions:', e);
    }
  };

  /**
   * Store payment for offline sync
   * เก็บ proof-of-payment ไว้ sync ทีหลังเมื่อออนไลน์
   */
  const storeOfflinePayment = async (
    order: Order,
    paymentProof: PaymentProof
  ): Promise<OfflineTransaction> => {
    const transaction: OfflineTransaction = {
      id: crypto.randomUUID(),
      orderId: order.id,
      paymentProof,
      order,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending',
      syncAttempts: 0,
    };

    // Store in IndexedDB
    await db.pendingSync.add({
      event: {
        id: transaction.id,
        kind: NOSTR_KINDS.ZAP_RECEIPT,
        pubkey: '',
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['order', order.id],
          ['amount', paymentProof.amount.toString()],
          ['preimage', paymentProof.preimage],
        ],
        content: JSON.stringify({ order, paymentProof }),
        sig: '',
      },
      status: 'pending',
      lastAttempt: Date.now(),
    });

    pendingTransactions.value.push(transaction);

    // Try to sync if online
    if (isOnline.value) {
      syncPendingTransactions();
    }

    return transaction;
  };

  /**
   * Sync pending transactions to Nostr/server
   */
  const syncPendingTransactions = async () => {
    if (isSyncing.value || !isOnline.value) return;

    isSyncing.value = true;
    syncError.value = null;

    try {
      const pending = await db.pendingSync.where('status').equals('pending').toArray();

      for (const item of pending) {
        try {
          // Try to publish to Nostr
          await syncToNostr(item.event);

          // Mark as synced
          await db.pendingSync.update(item.id!, { status: 'pending' });
          
          // Update local state
          const idx = pendingTransactions.value.findIndex(t => t.id === item.event.id);
          const found = pendingTransactions.value[idx];
          if (found) {
            found.syncStatus = 'synced';
            found.lastSyncAttempt = new Date().toISOString();
          }

          // Remove from pending after successful sync
          await db.pendingSync.delete(item.id!);
          pendingTransactions.value = pendingTransactions.value.filter(t => t.id !== item.event.id);

        } catch (e) {
          console.error('Failed to sync transaction:', item.event.id, e);
          
          // Update retry count
          const attempts = (item.lastAttempt || 0) + 1;
          await db.pendingSync.update(item.id!, { 
            status: attempts > 5 ? 'error' : 'pending',
            lastAttempt: Date.now(),
          });

          const idx = pendingTransactions.value.findIndex(t => t.id === item.event.id);
          const foundItem = pendingTransactions.value[idx];
          if (foundItem) {
            foundItem.syncAttempts = attempts;
            foundItem.syncStatus = attempts > 5 ? 'failed' : 'pending';
            foundItem.errorMessage = e instanceof Error ? e.message : 'Sync failed';
          }
        }
      }

      lastSyncTime.value = new Date().toISOString();
    } catch (e) {
      syncError.value = e instanceof Error ? e.message : 'Sync failed';
    } finally {
      isSyncing.value = false;
    }
  };

  /**
   * Sync transaction to Nostr relay
   */
  const syncToNostr = async (event: NostrEvent) => {
    // Use nostr relay to publish
    const _nostr = useNuxtApp().$nostr;
    
    // Sign and publish event
    // Implementation depends on nostr setup
    console.log('Syncing to Nostr:', event);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  };

  /**
   * Verify stored payment proof
   */
  const verifyStoredPayment = async (transactionId: string): Promise<boolean> => {
    const transaction = pendingTransactions.value.find(t => t.id === transactionId);
    if (!transaction) return false;

    const { paymentProof } = transaction;
    
    // Verify preimage matches payment hash
    // SHA256(preimage) should equal paymentHash
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(paymentProof.preimage);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex === paymentProof.paymentHash;
    } catch {
      return false;
    }
  };

  /**
   * Clear synced transactions
   */
  const clearSyncedTransactions = async () => {
    await db.pendingSync.where('status').equals('synced').delete();
    pendingTransactions.value = pendingTransactions.value.filter(
      t => t.syncStatus !== 'synced'
    );
  };

  /**
   * Retry failed transactions
   */
  const retryFailedTransactions = async () => {
    const failed = pendingTransactions.value.filter(t => t.syncStatus === 'failed');
    
    for (const transaction of failed) {
      transaction.syncStatus = 'pending';
      transaction.syncAttempts = 0;
      
      await db.pendingSync.where('id').equals(transaction.id).modify({
        status: 'pending',
      });
    }

    await syncPendingTransactions();
  };

  /**
   * Export pending transactions for backup
   */
  const exportPendingTransactions = (): string => {
    return JSON.stringify({
      transactions: pendingTransactions.value,
      exportedAt: new Date().toISOString(),
    });
  };

  /**
   * Import transactions from backup
   */
  const importTransactions = async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.transactions && Array.isArray(parsed.transactions)) {
        for (const transaction of parsed.transactions) {
          if (transaction.syncStatus !== 'synced') {
            await storeOfflinePayment(transaction.order, transaction.paymentProof);
          }
        }
      }
    } catch {
      throw new Error('Invalid backup data');
    }
  };

  // ============================================
  // Computed
  // ============================================

  const pendingCount = computed(() => 
    pendingTransactions.value.filter(t => t.syncStatus === 'pending').length
  );

  const failedCount = computed(() => 
    pendingTransactions.value.filter(t => t.syncStatus === 'failed').length
  );

  const syncedCount = computed(() => 
    pendingTransactions.value.filter(t => t.syncStatus === 'synced').length
  );

  const syncQueue = computed<SyncQueue>(() => ({
    transactions: pendingTransactions.value,
    lastSyncedAt: lastSyncTime.value || undefined,
    isOnline: isOnline.value,
  }));

  const hasOfflineData = computed(() => pendingTransactions.value.length > 0);

  // Watch for online status and auto-sync
  watch(isOnline, (online) => {
    if (online && pendingCount.value > 0) {
      console.log('Back online! Syncing pending transactions...');
      syncPendingTransactions();
    }
  });

  return {
    // State
    isOnline,
    pendingTransactions,
    isSyncing,
    lastSyncTime,
    syncError,

    // Computed
    pendingCount,
    failedCount,
    syncedCount,
    syncQueue,
    hasOfflineData,

    // Methods
    init,
    storeOfflinePayment,
    syncPendingTransactions,
    verifyStoredPayment,
    clearSyncedTransactions,
    retryFailedTransactions,
    exportPendingTransactions,
    importTransactions,
  };
};
