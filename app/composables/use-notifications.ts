// ============================================
// 🔔 NOTIFICATION SYSTEM
// Real-time notifications for POS events
// ============================================

import type { POSNotification, NotificationPriority } from "~/types";
import { db } from "~/db/db";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// Singleton state (shared across all composable instances)
const notifications = ref<POSNotification[]>([]);
const unreadCount = ref(0);
const isNotificationCenterOpen = ref(false);
const lastLowStockCheck = ref<number>(0);
const LOW_STOCK_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes between checks
let posAlertsInitialized = false; // Singleton guard for POS alerts subscription

// Browser Notification API state
const browserNotificationPermission = ref<
  NotificationPermission | "unsupported"
>("default");

// Initialize browser notification permission check
if (typeof window !== "undefined" && "Notification" in window) {
  browserNotificationPermission.value = Notification.permission;
} else if (typeof window !== "undefined") {
  browserNotificationPermission.value = "unsupported";
}

export const useNotifications = () => {
  const sound = useSound();
  const { t } = useI18n();
  const toast = useToast();

  // ============================================
  // 📋 NOTIFICATION MANAGEMENT
  // ============================================

  /**
   * Add a new notification
   * @param notification - The notification to add
   * @param options - Optional settings (skipToast: don't show toast, skipSound: don't play sound, skipBrowserNotification: don't show browser notification)
   */
  function addNotification(
    notification: Omit<POSNotification, "id" | "read" | "createdAt">,
    options?: {
      skipToast?: boolean;
      skipSound?: boolean;
      skipBrowserNotification?: boolean;
    }
  ): POSNotification {
    const newNotification: POSNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Add to beginning of array
    notifications.value.unshift(newNotification);
    unreadCount.value++;

    // Keep only last 100 notifications
    if (notifications.value.length > 100) {
      notifications.value = notifications.value.slice(0, 100);
    }

    // Play sound based on type and kitchen status (unless skipped)
    if (!options?.skipSound) {
      playNotificationSound(
        notification.type,
        notification.kitchenStatus,
        notification.persistent
      );
    }

    // Show toast notification (unless persistent or skipped)
    if (!notification.persistent && !options?.skipToast) {
      showToast(newNotification);
    }

    // Show browser notification for important alerts (unless skipped)
    if (!options?.skipBrowserNotification) {
      showBrowserNotification(newNotification);
    }

    // Save to localStorage
    saveNotifications();

    return newNotification;
  }

  /**
   * Play sound based on notification type and kitchen status
   */
  function playNotificationSound(
    type: POSNotification["type"],
    kitchenStatus?: string,
    persistent?: boolean
  ) {
    // Persistent/critical alerts use urgent sound
    if (persistent) {
      sound.playLowStockAlert();
      return;
    }

    // Kitchen-specific sounds
    if (type === "order" && kitchenStatus) {
      switch (kitchenStatus) {
        case "new":
          sound.playNotification();
          break;
        case "ready":
          sound.playSuccess(); // Different sound for ready orders
          break;
        case "served":
          sound.playNotification();
          break;
        default:
          sound.playNotification();
      }
      return;
    }

    // Default sound mapping
    switch (type) {
      case "payment":
        sound.playSuccess();
        break;
      case "order":
        sound.playNotification();
        break;
      case "stock":
      case "alert":
        sound.playLowStockAlert();
        break;
      case "loyalty":
        sound.playCashRegister();
        break;
      case "ai_insight":
      case "system":
        sound.playNotification();
        break;
      default:
        sound.playNotification();
    }
  }

  // ============================================
  // 🌐 BROWSER NOTIFICATION API
  // ============================================

  /**
   * Request permission for browser notifications
   * Shows a prompt to the user if permission hasn't been granted yet
   */
  async function requestBrowserNotificationPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      browserNotificationPermission.value = "unsupported";
      return false;
    }

    if (Notification.permission === "granted") {
      browserNotificationPermission.value = "granted";
      return true;
    }

    if (Notification.permission === "denied") {
      browserNotificationPermission.value = "denied";
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      browserNotificationPermission.value = permission;
      return permission === "granted";
    } catch (e) {
      console.error("[Notifications] Failed to request permission:", e);
      return false;
    }
  }

  /**
   * Show a native browser notification
   * Shows for ALL notifications when tab is not focused
   * Shows for important alerts even when tab is focused
   */
  function showBrowserNotification(notification: POSNotification): void {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    // Auto-request permission if not yet determined
    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        browserNotificationPermission.value = permission;
        if (permission === "granted") {
          // Retry showing the notification after permission granted
          showBrowserNotification(notification);
        }
      });
      return;
    }

    if (Notification.permission !== "granted") return;

    // Check if tab/window is currently focused
    const isTabFocused = document.hasFocus();

    // Determine if we should show browser notification:
    // 1. Always show for important alerts (high/critical priority, persistent, or alert type)
    // 2. Show for ALL notifications if tab is NOT focused (background)
    const isImportant =
      notification.priority === "high" ||
      notification.priority === "critical" ||
      notification.persistent ||
      notification.type === "alert";

    const shouldShowBrowser = isImportant || !isTabFocused;

    if (!shouldShowBrowser) return;

    try {
      // Map notification type to emoji for title
      const emojiMap: Record<POSNotification["type"], string> = {
        payment: "💰",
        order: "🍽️",
        stock: "📦",
        loyalty: "⭐",
        ai_insight: "✨",
        alert: "🔔",
        system: "⚙️",
        system_update: "🚀",
      };

      const emoji = emojiMap[notification.type] || "🔔";
      const title = `${emoji} ${notification.title}`;

      const browserNotif = new Notification(title, {
        body: notification.message,
        icon: "/favicon.ico", // Use app favicon
        badge: "/favicon.ico",
        tag: notification.id, // Prevents duplicate notifications
        requireInteraction: notification.persistent || false,
        silent: true, // We play our own sound
      });

      // Focus the window when notification is clicked
      browserNotif.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          navigateTo(notification.actionUrl);
        }
        isNotificationCenterOpen.value = true;
        browserNotif.close();
      };

      // Auto-close after 10 seconds for non-persistent notifications
      if (!notification.persistent) {
        setTimeout(() => browserNotif.close(), 10000);
      }
    } catch (e) {
      console.error("[Notifications] Failed to show browser notification:", e);
    }
  }

  // Type for toast colors
  type ToastColor =
    | "primary"
    | "red"
    | "gray"
    | "orange"
    | "amber"
    | "yellow"
    | "lime"
    | "green"
    | "emerald"
    | "teal"
    | "cyan"
    | "sky"
    | "blue"
    | "indigo"
    | "violet"
    | "purple"
    | "fuchsia"
    | "pink"
    | "rose";

  /**
   * Show toast notification
   */
  function showToast(notification: POSNotification) {
    const colorMap: Record<POSNotification["type"], ToastColor> = {
      payment: "green",
      order: "blue",
      stock: "yellow",
      loyalty: "purple",
      ai_insight: "cyan",
      alert: "orange",
      system: "gray",
      system_update: "indigo",
    };

    const iconMap: Record<POSNotification["type"], string> = {
      payment: "i-heroicons-bolt",
      order: "i-heroicons-shopping-bag",
      stock: "i-heroicons-archive-box",
      loyalty: "i-heroicons-star",
      ai_insight: "i-heroicons-sparkles",
      alert: "i-heroicons-exclamation-triangle",
      system: "i-heroicons-cog-6-tooth",
      system_update: "i-heroicons-megaphone",
    };

    // Use red for critical priority
    const color =
      notification.priority === "critical"
        ? "red"
        : colorMap[notification.type];

    // Truncate long messages for toast (max 120 characters)
    const maxLength = 120;
    let description = notification.message;
    let actions = undefined;

    if (notification.message.length > maxLength) {
      description = notification.message.slice(0, maxLength) + "...";
      // Add action to view full notification
      actions = [
        {
          label: "View More",
          onClick: () => {
            isNotificationCenterOpen.value = true;
          },
        },
      ];
    }

    toast.add({
      title: notification.title,
      description,
      color,
      icon: iconMap[notification.type] || "i-heroicons-bell",
      actions,
    });
  }

  /**
   * Mark notification as read
   */
  function markAsRead(id: string) {
    const notification = notifications.value.find((n) => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
      saveNotifications();
    }
  }

  /**
   * Mark all notifications as read
   */
  function markAllAsRead() {
    notifications.value.forEach((n) => {
      n.read = true;
    });
    unreadCount.value = 0;
    saveNotifications();
  }

  /**
   * Delete a notification
   */
  function deleteNotification(id: string) {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      const notification = notifications.value[index];
      if (!notification?.read) {
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
      notifications.value.splice(index, 1);
      saveNotifications();
    }
  }

  /**
   * Clear all notifications
   */
  function clearAll() {
    notifications.value = [];
    unreadCount.value = 0;
    saveNotifications();
  }

  // ============================================
  // 💾 PERSISTENCE
  // ============================================

  /**
   * Save notifications to localStorage
   */
  function saveNotifications() {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      "bnos_space_notifications",
      JSON.stringify(notifications.value)
    );
  }

  /**
   * Load notifications from localStorage
   */
  function loadNotifications() {
    if (typeof localStorage === "undefined") return;
    const saved = localStorage.getItem("bnos_space_notifications");
    if (saved) {
      try {
        notifications.value = JSON.parse(saved);
        unreadCount.value = notifications.value.filter((n) => !n.read).length;
      } catch {
        notifications.value = [];
        unreadCount.value = 0;
      }
    }
  }

  // ============================================
  // 🎯 CONVENIENCE METHODS
  // ============================================

  /**
   * Notify payment received
   */
  function notifyPaymentReceived(
    amount: number,
    currency: string,
    orderId?: string
  ) {
    addNotification({
      type: "payment",
      title: t("notifications.paymentReceived"),
      message: t("notifications.paymentReceivedMessage", {
        amount: `${amount} ${currency}`,
      }),
      data: { amount, currency, orderId },
    });
  }

  /**
   * Notify new order
   */
  function notifyNewOrder(orderId: string, customerName?: string) {
    addNotification({
      type: "order",
      title: t("notifications.newOrder"),
      message: customerName
        ? t("notifications.newOrderFromCustomer", { customer: customerName })
        : t("notifications.newOrderReceived"),
      data: { orderId, customerName },
    });
  }

  /**
   * Notify low stock (with priority)
   */
  function notifyLowStock(
    productName: string,
    currentStock: number,
    minStock: number,
    productId?: string,
    branchName?: string
  ) {
    // Calculate priority based on how low the stock is
    let priority: NotificationPriority = "medium";
    if (currentStock === 0) {
      priority = "critical";
    } else if (currentStock <= minStock * 0.25) {
      priority = "high";
    } else if (currentStock <= minStock * 0.5) {
      priority = "medium";
    } else {
      priority = "low";
    }

    const branchInfo = branchName ? ` (${branchName})` : "";

    addNotification({
      type: "stock",
      title:
        currentStock === 0
          ? t("notifications.outOfStock")
          : t("notifications.lowStock"),
      message:
        currentStock === 0
          ? t("notifications.outOfStockMessage", { product: productName }) +
            branchInfo
          : t("notifications.lowStockMessage", {
              product: productName,
              stock: currentStock,
            }) + branchInfo,
      data: { productName, currentStock, minStock, productId, branchName },
      priority,
      actionUrl: "/inventory",
    });
  }

  /**
   * Check all products for low stock and create notifications
   * Call this on app init and after stock changes
   */
  async function checkLowStock(force: boolean = false): Promise<number> {
    // Throttle checks to avoid spamming
    const now = Date.now();
    if (!force && now - lastLowStockCheck.value < LOW_STOCK_CHECK_INTERVAL) {
      return 0;
    }
    lastLowStockCheck.value = now;

    try {
      // Get all branch stock records
      const branchStocks = await db.branchStock.toArray();
      const products = await db.products.toArray();
      const branches = await db.branches.toArray();

      // Create maps for quick lookups (parse product data to check trackStock)
      const productMap = new Map<
        string,
        {
          id: string;
          name: string;
          trackStock: boolean;
          productType: string;
          stock: number;
        }
      >();
      for (const p of products) {
        try {
          const data = JSON.parse(p.data);
          productMap.set(p.id, {
            id: p.id,
            name: p.name,
            trackStock: data.trackStock !== false, // Default true if not set
            productType: data.productType || "good",
            stock: p.stock,
          });
        } catch {
          productMap.set(p.id, {
            id: p.id,
            name: p.name,
            trackStock: true,
            productType: "good",
            stock: p.stock,
          });
        }
      }
      const branchMap = new Map(branches.map((b) => [b.id, b.name]));

      // Track which products already have unread low stock notifications
      const existingAlerts = new Set(
        notifications.value
          .filter((n) => n.type === "stock" && !n.read && n.data?.productId)
          .map((n) => `${n.data?.productId}_${n.data?.branchName || ""}`)
      );

      let alertCount = 0;

      // Check branch-specific stock
      for (const bs of branchStocks) {
        if (bs.currentStock <= bs.minStock) {
          const alertKey = `${bs.productId}_${
            branchMap.get(bs.branchId) || ""
          }`;
          if (!existingAlerts.has(alertKey)) {
            const product = productMap.get(bs.productId);
            // Skip if product doesn't track stock or is a service/digital/subscription
            if (
              product &&
              product.trackStock &&
              product.productType !== "service" &&
              product.productType !== "digital" &&
              product.productType !== "subscription"
            ) {
              notifyLowStock(
                product.name,
                bs.currentStock,
                bs.minStock,
                bs.productId,
                branchMap.get(bs.branchId)
              );
              alertCount++;
            }
          }
        }
      }

      // Also check products without branch stock (legacy/main stock)
      for (const [productId, product] of productMap) {
        // Skip if product doesn't track stock
        if (
          !product.trackStock ||
          product.productType === "service" ||
          product.productType === "digital" ||
          product.productType === "subscription"
        ) {
          continue;
        }

        if (product.stock <= 0) {
          const alertKey = `${productId}_`;
          if (
            !existingAlerts.has(alertKey) &&
            !branchStocks.some((bs) => bs.productId === productId)
          ) {
            // Only notify if there's no branch stock tracking for this product
            notifyLowStock(product.name, product.stock, 1, productId);
            alertCount++;
          }
        }
      }

      return alertCount;
    } catch (e) {
      console.error("Failed to check low stock:", e);
      return 0;
    }
  }

  /**
   * Get low stock summary for quick stats (only for products that track stock)
   */
  async function getLowStockSummary(): Promise<{
    outOfStock: number;
    critical: number;
    low: number;
    total: number;
  }> {
    try {
      const branchStocks = await db.branchStock.toArray();
      const products = await db.products.toArray();

      // Build a set of products that track stock
      const trackedProducts = new Set<string>();
      for (const p of products) {
        try {
          const data = JSON.parse(p.data);
          const trackStock = data.trackStock !== false;
          const productType = data.productType || "good";
          if (
            trackStock &&
            productType !== "service" &&
            productType !== "digital" &&
            productType !== "subscription"
          ) {
            trackedProducts.add(p.id);
          }
        } catch {
          trackedProducts.add(p.id); // Default to tracked if parse fails
        }
      }

      let outOfStock = 0;
      let critical = 0;
      let low = 0;

      for (const bs of branchStocks) {
        // Skip products that don't track stock
        if (!trackedProducts.has(bs.productId)) continue;

        if (bs.currentStock === 0) {
          outOfStock++;
        } else if (bs.currentStock <= bs.minStock * 0.25) {
          critical++;
        } else if (bs.currentStock <= bs.minStock) {
          low++;
        }
      }

      return {
        outOfStock,
        critical,
        low,
        total: outOfStock + critical + low,
      };
    } catch {
      return { outOfStock: 0, critical: 0, low: 0, total: 0 };
    }
  }

  /**
   * Notify loyalty points earned
   */
  function notifyLoyaltyPoints(customerName: string, points: number) {
    addNotification({
      type: "loyalty",
      title: t("notifications.loyaltyPoints"),
      message: t("notifications.loyaltyPointsMessage", {
        customer: customerName,
        points,
      }),
      data: { customerName, points },
    });
  }

  /**
   * Notify AI insight
   */
  function notifyAIInsight(
    title: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    addNotification({
      type: "ai_insight",
      title,
      message,
      data,
    });
  }

  // ============================================
  // 👨‍🍳 KITCHEN NOTIFICATIONS
  // ============================================

  /**
   * Notify kitchen status change with quick actions
   */
  function notifyKitchenStatusChange(
    orderId: string,
    orderNumber: string,
    status: "new" | "preparing" | "ready" | "served",
    customer: string,
    tableName?: string,
    itemCount?: number
  ) {
    // Deduplicate: Check if we already have this notification (same order + status)
    const existingNotif = notifications.value.find(
      (n) => n.data?.orderId === orderId && n.data?.kitchenStatus === status
    );
    if (existingNotif) {
      return; // Skip duplicate
    }

    const statusConfig = {
      new: {
        emoji: "🆕",
        title: t("kitchen.newOrder", "New Order"),
        priority: "high" as NotificationPriority,
        groupKey: "kitchen-new",
      },
      preparing: {
        emoji: "👨‍🍳",
        title: t("kitchen.preparing", "Preparing"),
        priority: "medium" as NotificationPriority,
        groupKey: "kitchen-preparing",
      },
      ready: {
        emoji: "🔔",
        title: t("kitchen.orderReady", "Order Ready!"),
        priority: "high" as NotificationPriority,
        groupKey: "kitchen-ready",
      },
      served: {
        emoji: "✅",
        title: t("kitchen.orderServed", "Order Served"),
        priority: "low" as NotificationPriority,
        groupKey: "kitchen-served",
      },
    };

    const config = statusConfig[status];
    const tableInfo = tableName ? ` - ${tableName}` : "";
    const items = itemCount ? ` (${itemCount} items)` : "";

    addNotification({
      type: "order",
      title: `${config.emoji} ${config.title}${tableInfo}`,
      message: `Order #${orderNumber} - ${customer}${items}`,
      priority: config.priority,
      actionUrl: `/orders/${orderId}`,
      kitchenStatus: status,
      groupKey: config.groupKey,
      data: {
        orderId,
        orderNumber,
        status,
        customer,
        tableName,
        itemCount,
        kitchenStatus: status,
      },
    });
  }

  /**
   * Notify waiter call (persistent, requires acknowledgment)
   */
  function notifyWaiterCall(
    tableNumber: string,
    tableName?: string,
    sessionId?: string
  ) {
    const displayName = tableName || `Table ${tableNumber}`;

    addNotification({
      type: "alert",
      title: `🔔 ${displayName} needs assistance!`,
      message: t("notifications.waiterCall", "Customer called for waiter"),
      priority: "critical",
      persistent: true, // Don't auto-dismiss
      requiresAcknowledgment: true,
      actionUrl: "/tables",
      data: {
        tableNumber,
        tableName,
        sessionId,
        serviceType: "waiter_call",
      },
    });
  }

  /**
   * Notify bill request (persistent, high priority)
   */
  function notifyBillRequest(
    tableNumber: string,
    tableName?: string,
    sessionId?: string,
    total?: number,
    orderCount?: number
  ) {
    const displayName = tableName || `Table ${tableNumber}`;
    const totalInfo = total ? ` - Total: ${total}` : "";
    const ordersInfo = orderCount ? `${orderCount} orders` : "";

    addNotification({
      type: "alert",
      title: `💰 ${displayName} requesting bill!`,
      message: `${ordersInfo}${totalInfo}`,
      priority: "high",
      persistent: true,
      requiresAcknowledgment: true,
      actionUrl: "/pos",
      data: {
        tableNumber,
        tableName,
        sessionId,
        sessionTotal: total,
        orderCount,
        serviceType: "bill_request",
      },
    });
  }

  /**
   * Toggle notification center
   */
  function toggleNotificationCenter() {
    isNotificationCenterOpen.value = !isNotificationCenterOpen.value;
  }

  /**
   * Initialize system notifications from Nostr (announcements channel)
   */
  async function initSystemNotifications() {
    const { $nostr } = useNuxtApp();

    // Track processed event IDs to prevent duplicates from multiple relays
    const processedEventIds = new Set<string>();

    // Announcement tags to listen for
    const ANNOUNCEMENT_TAGS = [
      "bnos.space-announcement", // General announcements
      "bnos.space-update", // Version updates
      "bnos.space-feature", // New features
      "bnos.space-maintenance", // Scheduled maintenance
      "bnos.space-security", // Security alerts
      "bnos.space-bugfix", // Important bug fixes
      // for dev
      import.meta.env.DEV && "test-announcement",
    ];

    // Map announcement tags to notification properties
    const getAnnouncementConfig = (tags: string[]) => {
      // Check tag priority (security > maintenance > update > feature > bugfix > general)
      if (tags.some((t) => t === "bnos.space-security")) {
        return {
          type: "alert" as const,
          priority: "high" as NotificationPriority,
          icon: "🔒",
          defaultTitle: "Security Alert",
        };
      }
      if (tags.some((t) => t === "bnos.space-maintenance")) {
        return {
          type: "system" as const,
          priority: "medium" as NotificationPriority,
          icon: "🔧",
          defaultTitle: "Maintenance Notice",
        };
      }
      if (tags.some((t) => t === "bnos.space-update")) {
        return {
          type: "system_update" as const,
          priority: "medium" as NotificationPriority,
          icon: "🚀",
          defaultTitle: "System Update",
        };
      }
      if (tags.some((t) => t === "bnos.space-feature")) {
        return {
          type: "system_update" as const,
          priority: "low" as NotificationPriority,
          icon: "✨",
          defaultTitle: "New Feature",
        };
      }
      if (tags.some((t) => t === "bnos.space-bugfix")) {
        return {
          type: "system" as const,
          priority: "low" as NotificationPriority,
          icon: "🐛",
          defaultTitle: "Bug Fix",
        };
      }
      // Default for bnos.space-announcement or unknown
      return {
        type: "system_update" as const,
        priority: "medium" as NotificationPriority,
        icon: "📢",
        defaultTitle: "System Announcement",
      };
    };

    // Process incoming events with deduplication
    const processEvent = (event: any) => {
      if (processedEventIds.has(event.id)) return;
      processedEventIds.add(event.id);
      // Skip if already have this notification
      if (notifications.value.find((n) => n.data?.nostrEventId === event.id))
        return;
      const eventTags =
        event.tags
          ?.filter((t: string[]) => t[0] === "t")
          .map((t: string[]) => t[1]) || [];
      const config = getAnnouncementConfig(eventTags);
      const contentLines = event.content.split("\n");
      const title = contentLines[0]?.startsWith("#")
        ? contentLines[0].replace(/^#+\s*/, "")
        : `${config.icon} ${config.defaultTitle}`;
      const message = contentLines[0]?.startsWith("#")
        ? contentLines.slice(1).join("\n").trim()
        : event.content;

      addNotification({
        type: config.type,
        title,
        message: message || event.content,
        priority: config.priority,
        data: {
          nostrEventId: event.id,
          pubkey: event.pubkey,
          timestamp: event.created_at,
          tags: eventTags,
          category:
            eventTags.find((t: string) => t.startsWith("bnos.space-")) ||
            "announcement",
        },
      });
    };

    try {
      const filter = {
        kinds: [NOSTR_KINDS.TEXT_NOTE],
        "#t": ANNOUNCEMENT_TAGS,
        limit: 10,
      };

      // Get all relay URLs (deduplicated)
      const allRelays = [
        ...new Set([...useNostrRelay().DEFAULT_RELAYS.map((r) => r.url)]),
      ];

      if (allRelays.length === 0) {
        console.error("[Notifications] No relays configured");
        return;
      }

      // Initial fetch of recent announcements
      const events = await $nostr.pool.querySync(allRelays, filter);
      // Deduplicate and process events
      const uniqueEvents = new Map<string, any>();
      events.forEach(
        (e) => !uniqueEvents.has(e.id) && uniqueEvents.set(e.id, e)
      );
      Array.from(uniqueEvents.values())
        .sort((a, b) => b.created_at - a.created_at)
        .forEach(processEvent);
      // Real-time subscription for new announcements
      $nostr.pool.subscribeMany(
        allRelays.slice(0, 2),
        [
          {
            kinds: [NOSTR_KINDS.TEXT_NOTE],
            "#t": ANNOUNCEMENT_TAGS,
            since: Math.floor(Date.now() / 1000),
          },
        ],
        {
          onevent: processEvent,
        }
      );
    } catch (e) {
      console.error("Failed to initialize system notifications:", e);
    }
  }

  /**
   * Initialize POS alerts from Nostr
   * Subscribes to waiter calls, bill requests, and kitchen status alerts
   */
  async function initPosAlerts() {
    // Singleton guard - prevent multiple subscriptions
    if (posAlertsInitialized) return;
    posAlertsInitialized = true;

    const { $nostr } = useNuxtApp();
    const company = useCompany();

    const companyCodeHash = company.companyCodeHash.value;
    const ownerPubkey = company.ownerPubkey.value;

    if (!companyCodeHash && !ownerPubkey) {
      console.warn(
        "[POS Alerts] No company code or owner pubkey - alerts disabled"
      );
      return;
    }

    // Track processed event IDs to prevent duplicates
    const processedEventIds = new Set<string>();
    const sessionStartTime = Math.floor(Date.now() / 1000);

    // Process incoming POS_ALERT events
    // isHistorical = true for initial fetch or polling, false for real-time subscription
    const processAlert = (event: any, isHistorical = false) => {
      if (processedEventIds.has(event.id)) return;
      processedEventIds.add(event.id);

      // Only skip toast/sound for historical events (initial fetch or polling)
      // Real-time subscription events (isHistorical=false) should ALWAYS play sound
      // This ensures customer alerts like waiter calls trigger sounds immediately
      const skipNotify = isHistorical;

      try {
        const data = JSON.parse(event.content);

        const kitchenStatusMap: Record<
          string,
          "new" | "preparing" | "ready" | "served"
        > = {
          "new-order": "new",
          "order-preparing": "preparing",
          "order-ready": "ready",
          "order-served": "served",
        };

        if (data.type === "waiter-call") {
          notifyWaiterCallWithOptions(
            data.tableNumber,
            data.tableName,
            data.sessionId,
            skipNotify
          );
        } else if (data.type === "bill-request") {
          notifyBillRequestWithOptions(
            data.tableNumber,
            data.tableName,
            data.sessionId,
            data.total,
            data.orderCount,
            skipNotify
          );
        } else {
          const status = kitchenStatusMap[data.type];
          if (status) {
            notifyKitchenStatusChangeWithOptions(
              data.orderId,
              data.orderCode || data.orderNumber || data.orderId?.slice(-6),
              status,
              data.customer || "Customer",
              data.tableName,
              data.itemCount || data.items,
              skipNotify
            );
          }
        }
      } catch (e) {
        console.error("[POS Alerts] Failed to process alert:", e);
      }
    };

    // Helper functions that accept skipNotify option
    const notifyKitchenStatusChangeWithOptions = (
      orderId: string,
      orderNumber: string,
      status: "new" | "preparing" | "ready" | "served",
      customer: string,
      tableName?: string,
      itemCount?: number,
      skipNotify = false
    ) => {
      const existingNotif = notifications.value.find(
        (n) => n.data?.orderId === orderId && n.data?.kitchenStatus === status
      );
      if (existingNotif) return;

      const statusConfig = {
        new: {
          emoji: "🆕",
          title: t("kitchen.newOrder", "New Order"),
          priority: "high" as NotificationPriority,
          groupKey: "kitchen-new",
        },
        preparing: {
          emoji: "👨‍🍳",
          title: t("kitchen.preparing", "Preparing"),
          priority: "medium" as NotificationPriority,
          groupKey: "kitchen-preparing",
        },
        ready: {
          emoji: "🔔",
          title: t("kitchen.orderReady", "Order Ready!"),
          priority: "high" as NotificationPriority,
          groupKey: "kitchen-ready",
        },
        served: {
          emoji: "✅",
          title: t("kitchen.orderServed", "Order Served"),
          priority: "low" as NotificationPriority,
          groupKey: "kitchen-served",
        },
      };

      const config = statusConfig[status];
      const tableInfo = tableName ? ` - ${tableName}` : "";
      const items = itemCount ? ` (${itemCount} items)` : "";

      addNotification(
        {
          type: "order",
          title: `${config.emoji} ${config.title}${tableInfo}`,
          message: `Order #${orderNumber} - ${customer}${items}`,
          priority: config.priority,
          actionUrl: `/orders/${orderId}`,
          kitchenStatus: status,
          groupKey: config.groupKey,
          data: {
            orderId,
            orderNumber,
            status,
            customer,
            tableName,
            itemCount,
            kitchenStatus: status,
          },
        },
        { skipToast: skipNotify, skipSound: skipNotify }
      );
    };

    const notifyWaiterCallWithOptions = (
      tableNumber: string,
      tableName?: string,
      sessionId?: string,
      skipNotify = false
    ) => {
      const displayName = tableName || `Table ${tableNumber}`;
      addNotification(
        {
          type: "alert",
          title: `🔔 ${displayName} needs assistance!`,
          message: t("notifications.waiterCall", "Customer called for waiter"),
          priority: "critical",
          persistent: true,
          requiresAcknowledgment: true,
          actionUrl: "/tables",
          data: {
            tableNumber,
            tableName,
            sessionId,
            serviceType: "waiter_call",
          },
        },
        { skipToast: skipNotify, skipSound: skipNotify }
      );
    };

    const notifyBillRequestWithOptions = (
      tableNumber: string,
      tableName?: string,
      sessionId?: string,
      total?: number,
      orderCount?: number,
      skipNotify = false
    ) => {
      const displayName = tableName || `Table ${tableNumber}`;
      const totalInfo = total ? ` - Total: ${total}` : "";
      const ordersInfo = orderCount ? `${orderCount} orders` : "";
      addNotification(
        {
          type: "alert",
          title: `💰 ${displayName} requesting bill!`,
          message: `${ordersInfo}${totalInfo}`,
          priority: "high",
          persistent: true,
          requiresAcknowledgment: true,
          actionUrl: "/pos",
          data: {
            tableNumber,
            tableName,
            sessionId,
            sessionTotal: total,
            orderCount,
            serviceType: "bill_request",
          },
        },
        { skipToast: skipNotify, skipSound: skipNotify }
      );
    };

    try {
      // Use SAME relays as customer (from use-nostr-relay config)
      // This ensures customer publishes and POS subscribes to identical relay set
      const relayConfig = useNostrRelay();

      // CRITICAL: Initialize relays first to add them to the pool
      await relayConfig.init();

      // Use the ACTUAL configured relays (not static defaults)
      let allRelays = relayConfig.writeRelays.value;

      if (!allRelays || allRelays.length === 0) {
        allRelays = relayConfig.DEFAULT_RELAYS.map((r) => r.url);
      }

      const { NOSTR_KINDS } = await import("~/types/nostr-kinds");

      // Build filter - fetch ALL POS_ALERT events and filter client-side
      // Many relays don't support custom tag filtering (#c), so we filter after fetching
      const baseFilter = {
        kinds: [NOSTR_KINDS.POS_ALERT],
        limit: 50,
      };

      // Client-side filter function
      const matchesFilter = (event: any): boolean => {
        const tags = event.tags || [];

        // Check for company code hash match
        if (companyCodeHash) {
          const cTag = tags.find(
            (t: string[]) => t[0] === "c" && t[1] === companyCodeHash
          );
          if (cTag) return true;
        }

        // Check for owner pubkey match
        if (ownerPubkey) {
          const pTag = tags.find(
            (t: string[]) => t[0] === "p" && t[1] === ownerPubkey
          );
          if (pTag) return true;
        }

        return false;
      };

      // Initial fetch of existing events
      try {
        const allEvents = await $nostr.pool.querySync(allRelays, baseFilter);

        const matchingEvents = allEvents.filter(matchesFilter);

        // Deduplicate and process matching events
        const uniqueEvents = new Map<string, any>();
        for (const event of matchingEvents) {
          if (!uniqueEvents.has(event.id)) {
            uniqueEvents.set(event.id, event);
          }
        }

        // Process existing events (newest first) - mark as historical to skip toast/sound
        Array.from(uniqueEvents.values())
          .sort((a: any, b: any) => b.created_at - a.created_at)
          .forEach((e) => processAlert(e, true)); // isHistorical = true
      } catch (e) {
        console.error("[POS Alerts] Failed to fetch existing events:", e);
      }

      // Real-time subscription with multiple filters (OR relationship)
      // Each filter is checked independently - event matches if ANY filter matches
      // This ensures we receive alerts from:
      // 1. Staff (tagged with companyCodeHash)
      // 2. Customers (tagged with ownerPubkey)
      const realtimeFilters: Record<string, any>[] = [];

      // Filter for company code hash (staff-to-staff alerts)
      if (companyCodeHash) {
        realtimeFilters.push({
          kinds: [NOSTR_KINDS.POS_ALERT],
          "#c": [companyCodeHash],
        });
      }

      // Filter for owner pubkey (customer-to-staff alerts)
      // Customers tag alerts with ownerPubkey since they don't have companyCodeHash
      if (ownerPubkey) {
        realtimeFilters.push({
          kinds: [NOSTR_KINDS.POS_ALERT],
          "#p": [ownerPubkey],
        });
        // Also check #c with ownerPubkey (customer uses both tags)
        realtimeFilters.push({
          kinds: [NOSTR_KINDS.POS_ALERT],
          "#c": [ownerPubkey],
        });
      }

      console.log(
        "[POS Alerts] 🔌 Subscribing with",
        realtimeFilters.length,
        "filters"
      );

      // Real-time subscription with multiple filters
      const sub = $nostr.pool.subscribeMany(allRelays, realtimeFilters, {
        onevent(event: any) {
          console.log(
            "[POS Alerts] 📨 Received event:",
            event.id.slice(0, 8) + "..."
          );
          if (matchesFilter(event)) processAlert(event);
        },
      });

      // Polling fallback for relays that don't push via WebSocket
      const POLL_INTERVAL = 5000;
      const pollForEvents = async () => {
        try {
          const events = await $nostr.pool.querySync(allRelays, baseFilter);
          // Process as historical since these are fetched, not pushed
          events.filter(matchesFilter).forEach((e) => processAlert(e, true));
        } catch {
          // Silent fail
        }
      };
      const pollInterval = setInterval(pollForEvents, POLL_INTERVAL);

      // Cleanup on page unload
      if (import.meta.client) {
        window.addEventListener("beforeunload", () => {
          sub?.close();
          clearInterval(pollInterval);
        });
      }
    } catch (e) {
      console.error("[POS Alerts] ❌ Failed to initialize:", e);
    }
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  // Load saved notifications on mount
  if (typeof window !== "undefined") {
    loadNotifications();
  }

  return {
    // State
    notifications: computed(() => notifications.value),
    unreadCount: computed(() => unreadCount.value),
    isNotificationCenterOpen,

    // Methods
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    toggleNotificationCenter,

    // Convenience methods
    notifyPaymentReceived,
    notifyNewOrder,
    notifyLowStock,
    notifyLoyaltyPoints,
    notifyAIInsight,

    // Kitchen notifications
    notifyKitchenStatusChange,
    notifyWaiterCall,
    notifyBillRequest,

    // Low stock monitoring
    checkLowStock,
    getLowStockSummary,

    // System Announcements
    initSystemNotifications,
    initPosAlerts,

    // Browser notifications
    requestBrowserNotificationPermission,
    browserNotificationPermission: computed(
      () => browserNotificationPermission.value
    ),
  };
};
