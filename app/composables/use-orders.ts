// ============================================
// 🧾 ORDERS COMPOSABLE
// Order Management with Dexie + Nostr Sync
// + Auto Ingredient Deduction
// ============================================

import type {
  Order,
  PaymentStatus,
  PaymentMethod,
  CurrencyCode,
} from "~/types";
import { db, type LocalOrder } from "~/db/db";
import { generateUUIDv7 } from "~/utils/id";

// Singleton state
const orders = ref<Order[]>([]);
const isLoading = ref(false);
const isSyncing = ref(false); // NEW: Background sync indicator
const error = ref<string | null>(null);
const syncPending = ref(0);
const lastSyncAt = ref<number>(0);
let backgroundSyncInterval: ReturnType<typeof setInterval> | null = null;
let pendingOrdersPollingInterval: ReturnType<typeof setInterval> | null = null; // NEW: Aggressive polling for pending orders
let orderSubscription: { close: () => void } | null = null; // Real-time subscription
let isInitialized = false; // Session cache flag

// NEW: BroadcastChannel for same-browser instant sync
let orderBroadcastChannel: BroadcastChannel | null = null;

export function useOrders() {
  const nostrData = useNostrData();
  const offline = useOffline();

  // Lazy load recipes to avoid circular dependency
  const getRecipesStore = () => {
    try {
      return useRecipes();
    } catch {
      return null;
    }
  };

  // Lazy load POS settings
  const getPOSSettings = () => {
    try {
      return usePOSSettings();
    } catch {
      return null;
    }
  };

  // Get current user's pubkey for store order queries
  const getUserPubkey = (): string | null => {
    if (!import.meta.client) return null;
    const nostrPubkeyCookie = useCookie("nostr-pubkey");
    return nostrPubkeyCookie.value || null;
  };

  // ============================================
  // 📊 COMPUTED
  // ============================================

  const pendingOrders = computed(() =>
    orders.value.filter((o) => o.status === "pending")
  );

  const completedOrders = computed(() =>
    orders.value.filter((o) => o.status === "completed")
  );

  const todayOrders = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders.value.filter((o) => new Date(o.date) >= today);
  });

  const todayTotal = computed(() =>
    todayOrders.value.reduce((sum, o) => sum + o.total, 0)
  );

  const todayTotalSats = computed(() =>
    todayOrders.value.reduce((sum, o) => sum + (o.totalSats || 0), 0)
  );

  // ============================================
  // 📥 LOAD OPERATIONS
  // ============================================

  /**
   * Load orders from local DB
   */
  async function loadFromLocal(): Promise<Order[]> {
    try {
      const localOrders = await db.localOrders
        .orderBy("createdAt")
        .reverse()
        .limit(100) // Reduced from 500 for faster initial load
        .toArray();

      return localOrders.map((lo) => JSON.parse(lo.data) as Order);
    } catch (e) {
      console.error("Failed to load orders from local DB:", e);
      return [];
    }
  }

  /**
   * Load orders from Nostr
   */
  async function loadFromNostr(
    options: { since?: number; limit?: number } = {}
  ): Promise<Order[]> {
    try {
      return await nostrData.getAllOrders(options);
    } catch (e) {
      console.error("Failed to load orders from Nostr:", e);
      return [];
    }
  }

  /**
   * Fetch recent order updates from Nostr
   * Catches missed updates from offline period or late device startup
   */
  async function fetchRecentOrderUpdates(hoursBack: number = 24): Promise<number> {
    try {
      const sinceTimestamp = Math.floor(Date.now() / 1000) - (hoursBack * 3600);
      const recentOrders = await loadFromNostr({
        since: sinceTimestamp,
        limit: 100
      });

      let updatedCount = 0;
      let newCount = 0;

      for (const recentOrder of recentOrders) {
        const existingIndex = orders.value.findIndex((o) => o.id === recentOrder.id);

        if (existingIndex >= 0) {
          const existing = orders.value[existingIndex];
          const existingTime = existing?.updatedAt
            ? new Date(existing.updatedAt).getTime()
            : new Date(existing?.date || 0).getTime();
          const incomingTime = recentOrder.updatedAt
            ? new Date(recentOrder.updatedAt).getTime()
            : new Date(recentOrder.date).getTime();

          if (incomingTime > existingTime) {
            orders.value.splice(existingIndex, 1, recentOrder);
            await saveToLocal(recentOrder);
            updatedCount++;
            broadcastOrderUpdate(recentOrder);
            notifyOrderUpdated(recentOrder, existing);
          }
        } else {
          orders.value.unshift(recentOrder);
          await saveToLocal(recentOrder);
          newCount++;
          broadcastOrderUpdate(recentOrder);
        }
      }

      orders.value.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      if (updatedCount + newCount > 0) {
        console.log(`[Orders] Synced ${updatedCount} updates, ${newCount} new`);
      }

      return updatedCount + newCount;
    } catch (e) {
      console.error("[Orders] Sync failed:", e);
      return 0;
    }
  }

  /**
   * Notify UI components about order updates
   * Dispatches custom event for visual feedback (toasts, badges, etc.)
   */
  function notifyOrderUpdated(updatedOrder: Order, previousOrder: Order): void {
    if (!import.meta.client) return;

    // Emit custom event for UI components to listen to
    const event = new CustomEvent("bitspace-order-updated", {
      detail: {
        order: updatedOrder,
        previous: previousOrder,
        changes: {
          status: previousOrder.status !== updatedOrder.status,
          kitchenStatus: previousOrder.kitchenStatus !== updatedOrder.kitchenStatus,
          items: previousOrder.items.length !== updatedOrder.items.length,
        },
      },
    });
    window.dispatchEvent(event);
  }

  /**
   * Broadcast order update to other tabs/windows (same browser)
   */
  function broadcastOrderUpdate(order: Order): void {
    if (!import.meta.client) return;

    try {
      if (!orderBroadcastChannel) {
        orderBroadcastChannel = new BroadcastChannel("bitspace-order-sync");

        orderBroadcastChannel.onmessage = async (event) => {
          const { type, order: updatedOrder } = event.data;

          if (type === "order-update" && updatedOrder) {
            const existingIndex = orders.value.findIndex((o) => o.id === updatedOrder.id);

            if (existingIndex >= 0) {
              const existing = orders.value[existingIndex];
              const existingTime = existing?.updatedAt
                ? new Date(existing.updatedAt).getTime()
                : new Date(existing?.date || 0).getTime();
              const incomingTime = updatedOrder.updatedAt
                ? new Date(updatedOrder.updatedAt).getTime()
                : new Date(updatedOrder.date).getTime();

              if (incomingTime >= existingTime) {
                orders.value.splice(existingIndex, 1, updatedOrder);
                await saveToLocal(updatedOrder);
                notifyOrderUpdated(updatedOrder, existing);
              }
            } else {
              orders.value.unshift(updatedOrder);
              await saveToLocal(updatedOrder);
            }

            orders.value.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
          }
        };
      }

      orderBroadcastChannel.postMessage({
        type: "order-update",
        order,
      });
    } catch {
      // BroadcastChannel not supported - gracefully degrade
    }
  }

  /**
   * Initialize - OPTIMIZED: Show local first, sync in background
   * Uses session cache to skip re-init on page revisits
   */
  async function init(): Promise<void> {
    // Session cache: Skip re-init if already loaded
    if (isInitialized && orders.value.length > 0) {
      if (offline.isOnline.value && !isSyncing.value) {
        syncWithNostr({ batchSize: 50 });
        fetchRecentOrderUpdates(24);
      }
      return;
    }

    error.value = null;

    try {
      // Restore last sync timestamp
      if (import.meta.client) {
        const savedSyncAt = localStorage.getItem("bitspace_last_orders_sync");
        if (savedSyncAt) {
          lastSyncAt.value = parseInt(savedSyncAt, 10);
        }
      }

      // Load from local DB first (fast UI render)
      isLoading.value = true;
      orders.value = await loadFromLocal();
      isLoading.value = false;

      isInitialized = true;

      await pickupPendingCustomerOrders();

      const pending = await db.localOrders.where("syncedAt").equals(0).count();
      syncPending.value = pending;

      // Fetch recent updates in background
      if (offline.isOnline.value) {
        fetchRecentOrderUpdates(24);

        isSyncing.value = true;
        syncWithNostr({ batchSize: 50 })
          .catch((e) => console.warn("[Orders] Sync failed:", e))
          .finally(() => (isSyncing.value = false));
      }

      // Setup real-time sync
      if (import.meta.client) {
        window.addEventListener("storage", handleStorageEvent);
        window.addEventListener(
          "bitspace-new-order",
          handleNewOrderEvent as EventListener
        );

        subscribeToOrderUpdates();
        startPendingOrdersPolling(5000);
        startBackgroundSync(60000);
      }
    } catch (e) {
      error.value = `Failed to initialize orders: ${e}`;
      isLoading.value = false;
    }
  }

  /**
   * Pick up pending orders from localStorage (broadcast by customer order pages)
   */
  async function pickupPendingCustomerOrders(): Promise<void> {
    if (!import.meta.client) return;

    const PENDING_ORDERS_KEY = "bitspace_pending_orders";
    try {
      const stored = localStorage.getItem(PENDING_ORDERS_KEY);
      if (!stored) return;

      const pendingOrders: Order[] = JSON.parse(stored);
      let importedCount = 0;

      for (const order of pendingOrders) {
        // Check if order already exists
        const exists = orders.value.find((o) => o.id === order.id);
        if (!exists) {
          // Add to state and save to local DB
          orders.value.unshift(order);
          await saveToLocal(order);
          importedCount++;

          // Try to sync to Nostr
          if (offline.isOnline.value) {
            saveToNostr(order).catch(() => {});
          }
        }
      }

      // Clear pending orders after pickup
      if (importedCount > 0) {
        localStorage.removeItem(PENDING_ORDERS_KEY);
      }
    } catch (e) {
      console.error("Failed to pickup pending customer orders:", e);
    }
  }

  /**
   * Handle storage event from other tabs
   */
  function handleStorageEvent(event: StorageEvent): void {
    if (event.key === "bitspace_pending_orders" && event.newValue) {
      pickupPendingCustomerOrders();
    }
  }

  /**
   * Handle custom event from same tab
   */
  function handleNewOrderEvent(event: CustomEvent<Order>): void {
    const order = event.detail;
    const exists = orders.value.find((o) => o.id === order.id);
    if (!exists) {
      orders.value.unshift(order);
      saveToLocal(order);
    }
  }

  // ============================================
  // 💾 SAVE OPERATIONS
  // ============================================

  /**
   * Save order to local DB
   */
  async function saveToLocal(order: Order): Promise<void> {
    if (!order.id) return; // Skip invalid orders
    const localOrder: LocalOrder = {
      id: order.id,
      data: JSON.stringify(order),
      status: order.status,
      paymentMethod: order.paymentMethod || "unknown",
      total: order.total,
      totalSats: order.totalSats || 0,
      createdAt: new Date(order.date).getTime(),
      syncedAt: 0, // Not synced yet
    };

    await db.localOrders.put(localOrder);
  }

  /**
   * Save order to Nostr
   */
  async function saveToNostr(order: Order): Promise<boolean> {
    try {
      console.log(
        "[Orders] 📤 Publishing order to Nostr:",
        order.id.slice(-8),
        "status:",
        order.status,
        "kitchenStatus:",
        order.kitchenStatus
      );
      const event = await nostrData.saveOrder(order);
      if (event) {
        console.log(
          "[Orders] ✅ Order published successfully, event ID:",
          event.id.slice(0, 8) + "..."
        );
        // Update local record with nostr event ID
        await db.localOrders.update(order.id, {
          syncedAt: Date.now(),
          nostrEventId: event.id,
        });
        return true;
      }
      console.warn("[Orders] ⚠️ Order publish returned null event");
      return false;
    } catch (e) {
      console.error("[Orders] ❌ Failed to save order to Nostr:", e);
      return false;
    }
  }

  /**
   * Create new order
   * Local save is awaited (critical), Nostr sync is fire-and-forget (resilient)
   */
  async function createOrder(order: Order): Promise<Order> {
    // Assign daily order number if not present
    if (import.meta.client && !order.orderNumber) {
      const { getNextNumber } = useOrderNumber();
      order.orderNumber = getNextNumber();
    }

    // Add to state immediately
    orders.value.unshift(order);

    // Save to local DB first (critical - must complete)
    await saveToLocal(order);

    // NEW: Broadcast to other tabs for instant sync
    broadcastOrderUpdate(order);

    // Queue for Nostr sync (fire-and-forget - will retry if failed)
    syncPending.value++;

    // Trigger background sync without blocking
    if (offline.isOnline.value) {
      saveToNostr(order)
        .then((synced) => {
          if (synced) {
            syncPending.value = Math.max(0, syncPending.value - 1);
          }
        })
        .catch((e) => {
          console.warn("[Orders] Background sync failed, will retry:", e);
        });
    }

    // Log order creation
    try {
      const { logActivity } = useAuditLog();
      await logActivity(
        "order_create",
        `Created order #${order.orderNumber || order.id.slice(-8)}`,
        {
          resourceType: "order",
          resourceId: order.id,
          metadata: {
            total: order.total,
            itemCount: order.items.length,
            currency: order.currency,
          },
        }
      );
    } catch {
      // Don't block order creation if logging fails
    }

    return order;
  }

  /**
   * Update order status
   */
  async function updateOrderStatus(
    orderId: string,
    status: PaymentStatus,
    additionalData?: Partial<Order>
  ): Promise<Order | null> {
    const index = orders.value.findIndex((o) => o.id === orderId);
    if (index === -1) return null;

    const order = orders.value[index]!;
    const updatedOrder: Order = {
      ...order,
      ...additionalData,
      status,
      updatedAt: new Date().toISOString(), // Track update time for real-time sync
    };

    orders.value[index] = updatedOrder;

    // Update local DB
    await saveToLocal(updatedOrder);

    // NEW: Broadcast to other tabs for instant sync
    broadcastOrderUpdate(updatedOrder);

    // Sync to Nostr
    if (offline.isOnline.value) {
      await saveToNostr(updatedOrder);
    }

    return updatedOrder;
  }

  /**
   * Complete order with payment proof
   * Auto-deducts ingredients if recipe exists
   * Auto-creates accounting journal entry
   * Auto-closes kitchen status if setting is enabled
   */
  async function completeOrder(
    orderId: string,
    paymentMethod: PaymentMethod,
    paymentProof?: {
      paymentHash?: string;
      preimage?: string;
    }
  ): Promise<Order | null> {
    const order = orders.value.find((o) => o.id === orderId);
    if (!order) return null;

    // Try to deduct ingredients for items with recipes
    const recipesStore = getRecipesStore();
    if (recipesStore) {
      for (const item of order.items) {
        await recipesStore.deductIngredientsForSale(
          item.productId,
          item.quantity,
          orderId
        );
      }
    }

    // Auto-create accounting journal entry for the sale
    try {
      const accounting = useAccounting();
      const completedOrder = {
        ...order,
        paymentMethod,
        status: "completed" as const,
      };
      await accounting.createSalesJournalEntry(completedOrder);
    } catch (e) {
      console.warn("[Orders] Failed to create accounting entry:", e);
      // Don't block order completion if accounting fails
    }

    // Check if auto-close kitchen status is enabled
    const posSettings = getPOSSettings();
    const shouldAutoCloseKitchen =
      posSettings?.autoCloseKitchenStatusOnPayment.value || false;

    // Prepare update data
    const updateData: Partial<Order> = {
      paymentMethod,
      paymentProof: paymentProof
        ? {
            id: generateUUIDv7(),
            orderId,
            paymentHash: paymentProof.paymentHash || "",
            preimage: paymentProof.preimage || "",
            amount: 0,
            receivedAt: new Date().toISOString(),
            method: paymentMethod,
            isOffline: !offline.isOnline.value,
          }
        : undefined,
    };

    // Auto-close kitchen status if enabled and order has a kitchen status
    if (shouldAutoCloseKitchen && order.kitchenStatus) {
      updateData.kitchenStatus = "served";
      console.log(
        "[Orders] Auto-closing kitchen status for order:",
        orderId.slice(-8)
      );
    }

    const result = await updateOrderStatus(orderId, "completed", updateData);

    // Log order completion
    if (result) {
      try {
        const { logActivity } = useAuditLog();
        await logActivity(
          "payment_received",
          `Completed order #${
            order.orderNumber || orderId.slice(-8)
          } via ${paymentMethod}`,
          {
            resourceType: "order",
            resourceId: orderId,
            metadata: {
              total: order.total,
              paymentMethod,
            },
          }
        );
      } catch {
        // Silent fail
      }
    }

    return result;
  }

  /**
   * Void/cancel order
   */
  async function voidOrder(
    orderId: string,
    reason?: string
  ): Promise<Order | null> {
    const result = await updateOrderStatus(orderId, "failed", {
      notes: reason ? `Voided: ${reason}` : "Order voided",
    });

    // Log void action
    if (result) {
      try {
        const { logActivity } = useAuditLog();
        await logActivity(
          "order_void",
          `Voided order #${result.orderNumber || orderId.slice(-8)}${
            reason ? `: ${reason}` : ""
          }`,
          {
            resourceType: "order",
            resourceId: orderId,
            metadata: { reason },
          }
        );
      } catch {
        // Silent fail
      }
    }

    return result;
  }

  /**
   * Refund order
   */
  async function refundOrder(
    orderId: string,
    reason?: string
  ): Promise<Order | null> {
    const order = orders.value.find((o) => o.id === orderId);
    const result = await updateOrderStatus(orderId, "refunded", {
      notes: reason ? `Refunded: ${reason}` : "Order refunded",
    });

    // Log refund action
    if (result) {
      try {
        const { logActivity } = useAuditLog();
        await logActivity(
          "refund",
          `Refunded order #${result.orderNumber || orderId.slice(-8)}${
            reason ? `: ${reason}` : ""
          }`,
          {
            resourceType: "order",
            resourceId: orderId,
            metadata: {
              total: order?.total,
              reason,
            },
          }
        );
      } catch {
        // Silent fail
      }
    }

    return result;
  }

  /**
   * Delete order (local only, marks as deleted in Nostr)
   */
  async function deleteOrder(orderId: string): Promise<boolean> {
    const index = orders.value.findIndex((o) => o.id === orderId);
    if (index === -1) return false;

    // Remove from local state
    const order = orders.value[index];
    orders.value.splice(index, 1);

    // Remove from local DB
    await db.localOrders.delete(orderId);

    // Note: For Nostr, we would typically publish a deletion event (kind 5)
    // but since nostrData doesn't have deleteOrder yet, we skip this for now
    // The order is effectively soft-deleted from this client

    return true;
  }

  /**
   * Update full order details
   */
  async function updateOrder(
    orderId: string,
    updates: Partial<Order>
  ): Promise<Order | null> {
    const order = orders.value.find((o) => o.id === orderId);
    if (!order) return null;

    const updatedOrder: Order = {
      ...order,
      ...updates,
      updatedAt: new Date().toISOString(), // Track update time for real-time sync
    };

    // Calculate new total if items changed
    if (updates.items) {
      updatedOrder.total = updates.items.reduce(
        (sum, item) => sum + item.total,
        0
      );
    }

    // Update local state and DB
    const index = orders.value.findIndex((o) => o.id === orderId);
    if (index !== -1) orders.value[index] = updatedOrder;
    await saveToLocal(updatedOrder);

    // NEW: Broadcast to other tabs for instant sync
    broadcastOrderUpdate(updatedOrder);

    // Sync to Nostr
    if (offline.isOnline.value) {
      saveToNostr(updatedOrder); // Fire and forget
    }

    return updatedOrder;
  }

  /**
   * Merge two orders (combine items)
   * Source order is cancelled/deleted after merge
   */
  async function mergeOrders(
    sourceOrderId: string,
    targetOrderId: string
  ): Promise<Order | null> {
    const sourceOrder = orders.value.find((o) => o.id === sourceOrderId);
    const targetOrder = orders.value.find((o) => o.id === targetOrderId);

    if (!sourceOrder || !targetOrder) return null;

    // Clone items from source to avoid reference issues
    const newItems = sourceOrder.items.map((item) => ({
      ...item,
      id: generateUUIDv7(), // Generate new IDs
    }));

    // Combine items
    const combinedItems = [...targetOrder.items, ...newItems];

    // Calculate new totals
    const newTotal = combinedItems.reduce((sum, item) => sum + item.total, 0);
    const newTips = (targetOrder.tip || 0) + (sourceOrder.tip || 0);

    // Update target order
    const updatedTarget = await updateOrder(targetOrderId, {
      items: combinedItems,
      total: newTotal,
      tip: newTips,
      notes:
        (targetOrder.notes ? targetOrder.notes + "\n" : "") +
        (sourceOrder.notes
          ? `Merged from #${sourceOrder.id.slice(-4)}: ${sourceOrder.notes}`
          : `Merged from #${sourceOrder.id.slice(-4)}`),
    });

    // Delete source order
    await deleteOrder(sourceOrderId);

    return updatedTarget;
  }
  // ============================================
  // 🔄 SYNC OPERATIONS
  // ============================================

  /**
   * Sync local orders with Nostr
   * @param options.batchSize - Number of orders to fetch per batch (default: 50)
   * @param options.fullSync - Force full sync regardless of last sync time
   */
  async function syncWithNostr(
    options: { batchSize?: number; fullSync?: boolean } = {}
  ): Promise<number> {
    const batchSize = options.batchSize ?? 50;
    let synced = 0;

    try {
      // Get unsynced orders (limit batch to avoid blocking)
      const unsyncedOrders = await db.localOrders
        .filter((o) => !o.syncedAt || o.syncedAt === 0)
        .limit(batchSize)
        .toArray();

      for (const localOrder of unsyncedOrders) {
        const order = JSON.parse(localOrder.data) as Order;
        const success = await saveToNostr(order);
        if (success) {
          synced++;
        }
      }

      // Fetch new orders from Nostr with limit
      const since = options.fullSync
        ? undefined
        : lastSyncAt.value
        ? Math.floor(lastSyncAt.value / 1000) - 3600 // 1 hour buffer
        : undefined;

      const nostrOrders = await loadFromNostr({ since, limit: batchSize });

      // Merge with local
      for (const nostrOrder of nostrOrders) {
        const exists = orders.value.find((o) => o.id === nostrOrder.id);
        if (!exists) {
          orders.value.push(nostrOrder);
          await saveToLocal(nostrOrder);
        }
      }

      // Also fetch customer orders tagged to this store (via #p tag)
      // This gets orders from customers who scanned QR and used ephemeral keys
      const userPubkey = getUserPubkey();
      if (userPubkey) {
        const storeOrders = await nostrData.getOrdersForStore(userPubkey);
        for (const storeOrder of storeOrders) {
          const exists = orders.value.find((o) => o.id === storeOrder.id);
          if (!exists) {
            orders.value.push(storeOrder);
            await saveToLocal(storeOrder);
          }
        }
      }

      // Sort by date
      orders.value.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      syncPending.value = Math.max(0, syncPending.value - synced);
      lastSyncAt.value = Date.now();

      // Persist last sync time
      if (import.meta.client) {
        localStorage.setItem(
          "bitspace_last_orders_sync",
          lastSyncAt.value.toString()
        );
      }

      return synced;
    } catch (e) {
      console.error("Sync failed:", e);
      return 0;
    }
  }

  /**
   * Start background sync at specified interval
   * @param intervalMs - Sync interval in milliseconds (default: 30000 = 30 seconds)
   */
  function startBackgroundSync(intervalMs = 30000): void {
    if (backgroundSyncInterval) {
      clearInterval(backgroundSyncInterval);
    }

    backgroundSyncInterval = setInterval(async () => {
      if (offline.isOnline.value && !isLoading.value) {
        console.log("[Orders] Background sync triggered");
        await syncWithNostr({ batchSize: 50 });
      }
    }, intervalMs);

    console.log(
      `[Orders] Background sync started (every ${intervalMs / 1000}s)`
    );
  }

  /**
   * NEW: Start aggressive polling for pending orders
   * Similar to kitchen alerts - polls every 5 seconds to catch updates
   * Only polls for pending/preparing orders to minimize network usage
   * @param intervalMs - Polling interval in milliseconds (default: 5000 = 5 seconds)
   */
  function startPendingOrdersPolling(intervalMs = 5000): void {
    if (pendingOrdersPollingInterval) {
      clearInterval(pendingOrdersPollingInterval);
    }

    pendingOrdersPollingInterval = setInterval(async () => {
      if (!offline.isOnline.value || isLoading.value) return;

      // Only poll if we have active pending orders
      const hasPendingOrders = orders.value.some(
        (o) => o.status === "pending" || o.kitchenStatus === "new" || o.kitchenStatus === "preparing"
      );

      if (!hasPendingOrders) {
        // No active orders, skip this poll
        return;
      }

      try {
        // Fetch orders from last 6 hours (covers active orders)
        const recentOrders = await loadFromNostr({
          since: Math.floor(Date.now() / 1000) - (6 * 3600),
          limit: 50
        });

        // Update any pending/preparing orders that changed
        let updatedCount = 0;
        for (const recentOrder of recentOrders) {
          const existingIndex = orders.value.findIndex((o) => o.id === recentOrder.id);

          if (existingIndex >= 0) {
            const existing = orders.value[existingIndex];

            // Only update if this was a pending/preparing order
            const wasPending = existing.status === "pending" ||
                             existing.kitchenStatus === "new" ||
                             existing.kitchenStatus === "preparing";

            if (wasPending) {
              const existingTime = existing?.updatedAt
                ? new Date(existing.updatedAt).getTime()
                : new Date(existing?.date || 0).getTime();
              const incomingTime = recentOrder.updatedAt
                ? new Date(recentOrder.updatedAt).getTime()
                : new Date(recentOrder.date).getTime();

              if (incomingTime > existingTime) {
                orders.value.splice(existingIndex, 1, recentOrder);
                await saveToLocal(recentOrder);
                updatedCount++;
                broadcastOrderUpdate(recentOrder);
                notifyOrderUpdated(recentOrder, existing);
              }
            }
          }
        }

        if (updatedCount > 0) {
          orders.value.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        }
      } catch {
        // Polling failed - will retry on next interval
      }
    }, intervalMs);
  }

  /**
   * Stop background sync, polling, and real-time subscription
   */
  function stopBackgroundSync(): void {
    if (backgroundSyncInterval) {
      clearInterval(backgroundSyncInterval);
      backgroundSyncInterval = null;
    }
    if (pendingOrdersPollingInterval) {
      clearInterval(pendingOrdersPollingInterval);
      pendingOrdersPollingInterval = null;
    }
    if (orderSubscription) {
      orderSubscription.close();
      orderSubscription = null;
    }
    if (orderBroadcastChannel) {
      orderBroadcastChannel.close();
      orderBroadcastChannel = null;
    }
  }

  /**
   * Subscribe to real-time order updates from Nostr
   * This enables instant sync across multiple staff devices
   */
  function subscribeToOrderUpdates(): void {
    // Clean up existing subscription
    if (orderSubscription) {
      orderSubscription.close();
    }

    const sub = nostrData.subscribeToUpdates({
      onOrder: async (incomingOrder: Order) => {
        console.log(
          "[Orders] Real-time order update received:",
          incomingOrder.id
        );

        const existingIndex = orders.value.findIndex(
          (o) => o.id === incomingOrder.id
        );

        if (existingIndex >= 0) {
          // Update existing order - check if incoming is newer
          const existing = orders.value[existingIndex];
          const existingTime = existing?.updatedAt
            ? new Date(existing.updatedAt).getTime()
            : new Date(existing?.date || 0).getTime();
          const incomingTime = incomingOrder.updatedAt
            ? new Date(incomingOrder.updatedAt).getTime()
            : new Date(incomingOrder.date).getTime();

          console.log(
            "[Orders] ⚡ Comparing timestamps:",
            "local:",
            existingTime,
            "incoming:",
            incomingTime,
            "localKitchen:",
            existing?.kitchenStatus,
            "incomingKitchen:",
            incomingOrder.kitchenStatus
          );

          if (incomingTime >= existingTime) {
            // Incoming is same or newer - update
            // Use splice for Vue reactivity
            orders.value.splice(existingIndex, 1, incomingOrder);
            await saveToLocal(incomingOrder);
            console.log(
              "[Orders] ✅ Updated order from real-time sync:",
              incomingOrder.id.slice(-8),
              "status:",
              incomingOrder.status,
              "kitchenStatus:",
              incomingOrder.kitchenStatus
            );
          } else {
            console.log(
              "[Orders] ⏭️ Skipped older update for:",
              incomingOrder.id.slice(-8)
            );
          }
        } else {
          // New order - add to list
          orders.value.unshift(incomingOrder);
          await saveToLocal(incomingOrder);
          console.log(
            "[Orders] ➕ Added new order from real-time sync:",
            incomingOrder.id.slice(-8)
          );
        }

        // Re-sort orders by date
        orders.value.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      },
    });

    if (sub) {
      orderSubscription = sub;
      console.log("[Orders] Real-time subscription started");
    } else {
      console.warn("[Orders] Failed to start real-time subscription");
    }
  }

  /**
   * Force sync all pending orders
   */
  async function forceSyncAll(): Promise<{ synced: number; failed: number }> {
    isLoading.value = true;
    let synced = 0;
    let failed = 0;

    try {
      const unsyncedOrders = await db.localOrders
        .filter((o) => !o.syncedAt || o.syncedAt === 0)
        .toArray();

      for (const localOrder of unsyncedOrders) {
        const order = JSON.parse(localOrder.data) as Order;
        const success = await saveToNostr(order);
        if (success) {
          synced++;
        } else {
          failed++;
        }
      }

      syncPending.value = failed;
    } finally {
      isLoading.value = false;
    }

    return { synced, failed };
  }

  // ============================================
  // 🔍 QUERY OPERATIONS
  // ============================================

  /**
   * Get order by ID
   */
  function getOrder(id: string): Order | undefined {
    return orders.value.find((o) => o.id === id);
  }

  /**
   * Get order by ID with fallback to Nostr relay
   * Tries: 1) Memory cache → 2) Local DB → 3) Nostr relay
   * Use this for dynamic pages that need to load on refresh
   */
  async function getOrderById(id: string): Promise<Order | null> {
    // 1. Try memory cache first (fastest)
    const cached = orders.value.find((o) => o.id === id);
    if (cached) return cached;

    // 2. Try local Dexie DB
    try {
      const record = await db.localOrders.get(id);
      if (record) {
        const order = JSON.parse(record.data) as Order;
        // Add to memory cache for future use
        orders.value.push(order);
        return order;
      }
    } catch (e) {
      console.error("Failed to load order from local DB:", e);
    }

    // 3. Fallback to Nostr relay (slowest, but works for shared links)
    if (offline.isOnline.value) {
      try {
        const nostrOrder = await nostrData.getOrder(id);
        if (nostrOrder) {
          // Save to local DB for future use
          await saveToLocal(nostrOrder);
          // Add to memory cache
          orders.value.push(nostrOrder);
          return nostrOrder;
        }
      } catch (e) {
        console.error("Failed to load order from Nostr:", e);
      }
    }

    return null;
  }

  /**
   * Get orders by date range
   */
  function getOrdersByDateRange(startDate: Date, endDate: Date): Order[] {
    return orders.value.filter((o) => {
      const date = new Date(o.date);
      return date >= startDate && date <= endDate;
    });
  }

  /**
   * Get orders by customer
   */
  function getOrdersByCustomer(customerPubkey: string): Order[] {
    return orders.value.filter((o) => o.customerPubkey === customerPubkey);
  }

  /**
   * Get orders by payment method
   */
  function getOrdersByPaymentMethod(method: PaymentMethod): Order[] {
    return orders.value.filter((o) => o.paymentMethod === method);
  }

  /**
   * Search orders
   */
  function searchOrders(query: string): Order[] {
    const q = query.toLowerCase();
    return orders.value.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.items.some((i) => i.product.name.toLowerCase().includes(q))
    );
  }

  // ============================================
  // 📊 ANALYTICS
  // ============================================

  /**
   * Get sales summary for a period
   */
  function getSalesSummary(
    startDate: Date,
    endDate: Date
  ): {
    totalOrders: number;
    totalSales: number;
    totalSats: number;
    avgOrderValue: number;
    byPaymentMethod: Record<string, { count: number; total: number }>;
    byHour: Record<number, { count: number; total: number }>;
  } {
    const periodOrders = getOrdersByDateRange(startDate, endDate).filter(
      (o) => o.status === "completed"
    );

    const byPaymentMethod: Record<string, { count: number; total: number }> =
      {};
    const byHour: Record<number, { count: number; total: number }> = {};

    let totalSales = 0;
    let totalSats = 0;

    for (const order of periodOrders) {
      totalSales += order.total;
      totalSats += order.totalSats || 0;

      // By payment method
      const method = order.paymentMethod || "unknown";
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { count: 0, total: 0 };
      }
      byPaymentMethod[method].count++;
      byPaymentMethod[method].total += order.total;

      // By hour
      const hour = new Date(order.date).getHours();
      if (!byHour[hour]) {
        byHour[hour] = { count: 0, total: 0 };
      }
      byHour[hour].count++;
      byHour[hour].total += order.total;
    }

    return {
      totalOrders: periodOrders.length,
      totalSales,
      totalSats,
      avgOrderValue:
        periodOrders.length > 0 ? totalSales / periodOrders.length : 0,
      byPaymentMethod,
      byHour,
    };
  }

  /**
   * Get top selling products
   */
  function getTopProducts(
    startDate: Date,
    endDate: Date,
    limit = 10
  ): Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }> {
    const periodOrders = getOrdersByDateRange(startDate, endDate).filter(
      (o) => o.status === "completed"
    );

    const productStats: Record<
      string,
      { name: string; quantity: number; revenue: number }
    > = {};

    for (const order of periodOrders) {
      for (const item of order.items) {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[item.productId]!.quantity += item.quantity;
        productStats[item.productId]!.revenue += item.total;
      }
    }

    return Object.entries(productStats)
      .map(([productId, stats]) => ({
        productId,
        productName: stats.name,
        quantity: stats.quantity,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  // ============================================
  // 🖨️ RECEIPT GENERATION
  // ============================================

  /**
   * Generate receipt data for printing
   */
  function generateReceiptData(order: Order): {
    header: string[];
    items: Array<{ name: string; qty: number; price: string; total: string }>;
    footer: string[];
    totals: { subtotal: string; tax: string; tip?: string; total: string };
  } {
    const formatPrice = (amount: number, currency: CurrencyCode) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency === "SATS" ? "USD" : currency,
        minimumFractionDigits: currency === "LAK" ? 0 : 2,
      })
        .format(amount)
        .replace("$", currency === "SATS" ? "₿" : "");
    };

    const subtotal = order.items.reduce((sum, i) => sum + i.total, 0);
    const tax = 0; // TODO: Calculate from settings

    return {
      header: [
        order.id,
        new Date(order.date).toLocaleString(),
        `Customer: ${order.customer}`,
      ],
      items: order.items.map((item) => ({
        name:
          item.product.name +
          (item.selectedVariant ? ` (${item.selectedVariant.shortName})` : ""),
        qty: item.quantity,
        price: formatPrice(item.price, order.currency),
        total: formatPrice(item.total, order.currency),
      })),
      totals: {
        subtotal: formatPrice(subtotal, order.currency),
        tax: formatPrice(tax, order.currency),
        tip: order.tip ? formatPrice(order.tip, order.currency) : undefined,
        total: formatPrice(order.total, order.currency),
      },
      footer: [
        order.paymentMethod === "lightning"
          ? "⚡ Paid with Lightning"
          : `Paid with ${order.paymentMethod}`,
        order.totalSats ? `${order.totalSats.toLocaleString()} sats` : "",
        "Thank you for your purchase!",
      ].filter(Boolean),
    };
  }

  return {
    // State
    orders,
    isLoading,
    isSyncing, // NEW: Background sync indicator
    error,
    syncPending,

    // Computed
    pendingOrders,
    completedOrders,
    todayOrders,
    todayTotal,
    todayTotalSats,

    // Load
    init,
    loadFromLocal,
    loadFromNostr,

    // CRUD
    createOrder,
    updateOrderStatus,
    updateOrder, // Export updateOrder
    mergeOrders, // Export mergeOrders
    completeOrder,
    voidOrder,
    refundOrder,
    deleteOrder,

    // Sync
    syncWithNostr,
    forceSyncAll,
    startBackgroundSync,
    stopBackgroundSync,
    lastSyncAt,

    // Query
    getOrder,
    getOrderById,
    getOrdersByDateRange,
    getOrdersByCustomer,
    getOrdersByPaymentMethod,
    searchOrders,

    // Analytics
    getSalesSummary,
    getTopProducts,

    // Receipt
    generateReceiptData,
  };
}
