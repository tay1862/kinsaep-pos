// ============================================
// 🔄 ORDER SYNC NOTIFICATIONS
// Visual feedback for multi-device order updates
// ============================================

// Global flag to prevent duplicate listener registration
let isListenerInitialized = false;

// Track recent notifications to prevent duplicates (orderId -> timestamp)
const recentNotifications = new Map<string, number>();
const NOTIFICATION_DEDUP_WINDOW = 3000; // 3 seconds

export const useOrderSyncNotifications = () => {
  const { t } = useI18n();
  const notifications = useNotifications();

  /**
   * Initialize order sync notifications
   * Listens for order update events and shows user-friendly toasts
   */
  function initOrderSyncNotifications() {
    if (!import.meta.client) return;

    // Prevent duplicate listeners
    if (isListenerInitialized) return;
    isListenerInitialized = true;

    window.addEventListener("bitspace-order-updated", ((event: CustomEvent) => {
      const { order, previous, changes } = event.detail;

      // Deduplication: Check if we recently showed a notification for this order
      const now = Date.now();
      const notificationKey = `${order.id}-${order.status}`;
      const lastNotification = recentNotifications.get(notificationKey);

      if (lastNotification && now - lastNotification < NOTIFICATION_DEDUP_WINDOW) {
        // Skip duplicate notification
        return;
      }

      // Record this notification
      recentNotifications.set(notificationKey, now);

      // Clean up old entries (older than dedup window)
      for (const [key, timestamp] of recentNotifications.entries()) {
        if (now - timestamp > NOTIFICATION_DEDUP_WINDOW) {
          recentNotifications.delete(key);
        }
      }

      // Determine what changed and show appropriate notification
      if (changes.status && order.status === "completed") {
        // Order was paid/closed by another device
        notifications.addNotification({
          type: "order",
          title: t("notifications.order_completed_elsewhere"),
          message: t("notifications.order_completed_elsewhere_desc", {
            orderNumber: order.orderNumber || order.id.slice(-8),
          }),
          priority: "high",
          action: {
            label: t("common.view"),
            onClick: () => {
              navigateTo("/orders");
            },
          },
        });
      } else if (changes.status && order.status === "failed") {
        // Order was cancelled/voided
        notifications.addNotification({
          type: "alert",
          title: t("notifications.order_cancelled"),
          message: t("notifications.order_cancelled_desc", {
            orderNumber: order.orderNumber || order.id.slice(-8),
          }),
          priority: "high",
          urgencyLevel: "warning",
          action: {
            label: t("common.dismiss"),
            onClick: () => {
              // Just close the notification
            },
          },
        });
      } else if (changes.status && order.status === "refunded") {
        // Order was refunded
        notifications.addNotification({
          type: "alert",
          title: t("notifications.order_refunded"),
          message: t("notifications.order_refunded_desc", {
            orderNumber: order.orderNumber || order.id.slice(-8),
          }),
          priority: "high",
          urgencyLevel: "warning",
          action: {
            label: t("common.view"),
            onClick: () => {
              navigateTo("/orders");
            },
          },
        });
      } else if (changes.kitchenStatus) {
        // Kitchen status changed
        const statusMessages: Record<string, string> = {
          preparing: t("notifications.order_preparing"),
          ready: t("notifications.order_ready"),
          served: t("notifications.order_served"),
        };

        const message = statusMessages[order.kitchenStatus || ""];
        if (message) {
          notifications.addNotification({
            type: "order",
            title: message,
            message: `#${order.orderNumber || order.id.slice(-8)}`,
            priority: order.kitchenStatus === "ready" ? "high" : "medium",
            kitchenStatus: order.kitchenStatus,
            urgencyLevel: order.kitchenStatus === "ready" ? "urgent" : "normal",
          });
        }
      } else if (changes.items) {
        // Items were added/removed
        notifications.addNotification({
          type: "order",
          title: t("notifications.order_updated"),
          message: t("notifications.order_items_changed", {
            orderNumber: order.orderNumber || order.id.slice(-8),
          }),
          priority: "medium",
        });
      }
    }) as EventListener);
  }

  /**
   * Show a simple sync status indicator
   */
  function showSyncSuccess(count: number) {
    if (count > 0 && import.meta.client) {
      notifications.addNotification(
        {
          type: "system",
          title: t("notifications.orders_synced"),
          message: t("notifications.orders_synced_desc", { count }),
          priority: "low",
        },
        { skipSound: true } // Don't play sound for background syncs
      );
    }
  }

  return {
    initOrderSyncNotifications,
    showSyncSuccess,
  };
};
