<!-- pages/kitchen/index.vue -->
<!-- 👨‍🍳 Kitchen Display System (KDS) - Real-time Order Queue -->
<script setup lang="ts">
import type { Order } from "~/types";
import { useKitchenStations } from "~/composables/use-kitchen-stations";
import { useProductsStore } from "~/composables/use-products";

definePageMeta({
  layout: "blank",
  middleware: ["auth"],
});

useHead({
  title: "Kitchen",
});

const { t } = useI18n();
const ordersStore = useOrders();
const toast = useToast();
const nostrData = useNostrData();
const company = useCompany();
const stationsStore = useKitchenStations();
const productsStore = useProductsStore();

// ============================================
// State
// ============================================
const selectedStationId = ref<string>("");
const currentTime = ref(new Date());
let timeInterval: ReturnType<typeof setInterval>;

const filterStatus = ref<"all" | "new" | "preparing" | "ready">("all");
const sortBy = ref<"time" | "priority">("time");
const soundEnabled = ref(true);
const autoRefresh = ref(true);

// ============================================
// Computed
// ============================================
// Get kitchen orders (orders that need to be prepared - NOT served/closed)
const kitchenOrders = computed(() => {
  let orders = ordersStore.orders.value.filter(
    (o) =>
      // Show orders that need kitchen attention:
      // - pending (customer QR orders waiting for payment)
      // - processing (payment in progress)
      // - completed (paid) but still in kitchen
      (o.status === "completed" ||
        o.status === "processing" ||
        o.status === "pending") &&
      // IMPORTANT: Exclude orders that have been served or picked up
      o.kitchenStatus !== "served"
  );

  // Filter by kitchen status
  if (filterStatus.value !== "all") {
    orders = orders.filter((o) => o.kitchenStatus === filterStatus.value);
  }

  // Sort
  // Sort
  if (sortBy.value === "time") {
    orders.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  // Station Filter
  if (selectedStationId.value) {
    // Filter items within orders
    orders = orders.map(order => {
        // Find items that belong to categories assigned to this station
        const stationItems = order.items.filter(item => {
            const category = productsStore.categories.value.find(c => c.id === item.categoryId);
            // If category has no station, it goes to Default station
            // If selected station is Default, show items with no station (or assigned to Default)
            
            const itemStationId = category?.stationId;
            const isDefaultStation = stationsStore.stations.find(s => s.id === selectedStationId.value)?.isDefault;

            if (itemStationId) {
                return itemStationId === selectedStationId.value;
            } else {
                // No station assigned -> show in Default station
               if (isDefaultStation) return true;
               // Also, if item has no category (rare), show in Default
               return false;
            }
        });

        // Return new order object with filtered items (shallow copy of other props)
        return {
            ...order,
            items: stationItems
        };
    }).filter(order => order.items.length > 0); // Remove empty orders
  }

  return orders;
});

const newOrdersCount = computed(
  () =>
    ordersStore.orders.value.filter(
      (o) =>
        (o.status === "completed" ||
          o.status === "processing" ||
          o.status === "pending") &&
        o.kitchenStatus === "new"
    ).length
);

const preparingOrdersCount = computed(
  () =>
    ordersStore.orders.value.filter(
      (o) =>
        (o.status === "completed" ||
          o.status === "processing" ||
          o.status === "pending") &&
        o.kitchenStatus === "preparing"
    ).length
);

const readyOrdersCount = computed(
  () =>
    ordersStore.orders.value.filter(
      (o) =>
        (o.status === "completed" ||
          o.status === "processing" ||
          o.status === "pending") &&
        o.kitchenStatus === "ready"
    ).length
);

// ============================================
// Methods
// ============================================
const getOrderAge = (date: string) => {
  const orderTime = new Date(date).getTime();
  const now = currentTime.value.getTime();
  const diff = Math.floor((now - orderTime) / 1000);

  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
};

const getAgeColor = (date: string) => {
  const orderTime = new Date(date).getTime();
  const now = currentTime.value.getTime();
  const diff = Math.floor((now - orderTime) / 1000 / 60); // minutes

  if (diff < 5) return "text-green-500";
  if (diff < 10) return "text-yellow-500";
  if (diff < 15) return "text-orange-500";
  return "text-red-500";
};

const getStatusColor = (status?: string) => {
  const colors: Record<string, string> = {
    new: "bg-blue-500",
    preparing: "bg-amber-500",
    ready: "bg-green-500",
    served: "bg-gray-500",
  };
  return colors[status || "new"] || "bg-gray-500";
};

const getStatusBgColor = (status?: string) => {
  const colors: Record<string, string> = {
    new: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    preparing:
      "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    ready:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    served: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
  };
  return colors[status || "new"] || "bg-gray-50 border-gray-200";
};

const updateKitchenStatus = async (
  orderId: string,
  kitchenStatus: "new" | "preparing" | "ready" | "served"
) => {
  try {
    // Find the order and update it via the ordersStore.updateOrderStatus
    // Pass the current payment status to keep it unchanged, but add kitchenStatus data
    const order = ordersStore.orders.value.find((o) => o.id === orderId);
    if (!order) return;

    await ordersStore.updateOrderStatus(orderId, order.status, {
      kitchenStatus,
      ...(kitchenStatus === "preparing"
        ? { preparedAt: new Date().toISOString() }
        : {}),
      ...(kitchenStatus === "served"
        ? { servedAt: new Date().toISOString() }
        : {}),
    });

    // ============================================
    // 🔔 MULTI-CHANNEL NOTIFICATION SYSTEM
    // ============================================
    // Publish ALL status changes to BroadcastChannel + Nostr
    // The Nostr subscription (initPosAlerts) creates notifications on ALL devices
    // This prevents duplicates and ensures all devices get notified
    // ============================================

    // Publish to BroadcastChannel + Nostr for ALL status changes
    await notifyKitchenStatusChange(order, kitchenStatus);

    // Play sound locally for instant feedback
    if (soundEnabled.value) {
      if (kitchenStatus === "ready") {
        playBellSound();
      } else {
        playClickSound();
      }
    }
  } catch (error) {
    console.error("Error updating kitchen status:", error);
  }
};

/**
 * Notify all devices about kitchen status change
 * Uses 2-tier system: BroadcastChannel + Nostr
 * Notifications are created by initPosAlerts subscription to avoid duplicates
 */
const notifyKitchenStatusChange = async (
  order: Order,
  status: "new" | "preparing" | "ready" | "served"
) => {
  try {
    // ─────────────────────────────────────────
    // 1️⃣ BROADCAST CHANNEL (Same Browser)
    // ─────────────────────────────────────────
    try {
      const readyChannel = new BroadcastChannel("bitspace-kitchen-ready");
      readyChannel.postMessage({
        type: "kitchen-status-change",
        status,
        order: JSON.parse(JSON.stringify({ ...order, kitchenStatus: status })),
        timestamp: new Date().toISOString(),
      });
      readyChannel.close();
    } catch (e) {
      console.warn("[Kitchen] BroadcastChannel not available:", e);
    }

    // ─────────────────────────────────────────
    // 2️⃣ NOSTR EVENT (Cross-Device)
    // ─────────────────────────────────────────
    // Publish kitchen alert to Nostr with company tag
    // This ensures ALL staff devices get notified via initPosAlerts
    try {
      // Map status to Nostr event type
      const eventTypeMap = {
        new: "new-order",
        preparing: "order-preparing",
        ready: "order-ready",
        served: "order-served",
      };

      const alertData = {
        type: eventTypeMap[status],
        orderId: order.id,
        orderNumber: order.orderNumber || order.id.slice(-6),
        orderCode: order.orderNumber || order.id.slice(-6),
        status,
        customer: order.customer || "Customer",
        tableName: order.tableName,
        total: order.total,
        items: order.items.length,
        itemCount: order.items.length,
        timestamp: new Date().toISOString(),
      };

      // Publish as POS_ALERT event with company tag for cross-device sync
      await nostrData.publishKitchenAlert(
        alertData,
        company.companyCodeHash.value
      );
    } catch (e) {
      console.error("[Kitchen] ❌ Failed to publish Nostr alert:", e);
    }

    // ─────────────────────────────────────────
    // 3️⃣ NOTIFICATION CENTER (UI)
    // ─────────────────────────────────────────
    // ✅ NO LOCAL NOTIFICATIONS - Let initPosAlerts handle ALL notifications
    // This prevents duplicates and ensures consistent cross-device notifications
    console.log(
      `[Kitchen] 📢 Notification will be created by initPosAlerts subscription for status: ${status}`
    );
  } catch (error) {
    console.error("[Kitchen] Failed to send notifications:", error);
  }
};

const bumpOrder = async (orderId: string, currentStatus?: string) => {
  const statusFlow: Record<string, "preparing" | "ready" | "served"> = {
    new: "preparing",
    preparing: "ready",
    ready: "served",
  };
  const nextStatus = statusFlow[currentStatus || "new"];
  if (nextStatus) {
    await updateKitchenStatus(orderId, nextStatus);
  }
};

const recallOrder = async (orderId: string) => {
  await updateKitchenStatus(orderId, "preparing");
};

// Sound effects
const playBellSound = () => {
  const audio = new Audio(
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGUxE0qGv+LrwHQvDTZ5oPXt1YdVJRY7l9bw5aFjQSgsZ7XV5beKfmhYR1BebZabrqKFXD85Pktbe"
  );
  audio.play().catch(() => {});
};

const playClickSound = () => {
  const audio = new Audio(
    "data:audio/wav;base64,UklGRl9vT19teleHRlbXQAAABXQVZFZm10IBAAAAABAAEAQB8AAEA..."
  );
  audio.play().catch(() => {});
};

const playNewOrderSound = () => {
  if (soundEnabled.value) {
    playBellSound();
  }
};

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// ============================================
// Lifecycle
// ============================================
let refreshInterval: ReturnType<typeof setInterval>;
let orderChannel: BroadcastChannel | null = null;

// Handle new order from BroadcastChannel (instant)
const handleNewOrder = (order: Order) => {
  const exists = ordersStore.orders.value.find((o) => o.id === order.id);
  if (!exists) {
    ordersStore.orders.value.unshift(order);
    if (soundEnabled.value) playBellSound();

    // Show toast notification
    toast.add({
      title: t("kitchen.newOrder", "🔔 New Order!"),
      description: `#${order.id.slice(-6).toUpperCase()} - ${
        order.tableNumber
          ? "Table " + order.tableNumber
          : t("orders.walkInCustomer", "Walk-in")
      }`,
      color: "blue",
      icon: "i-heroicons-bell-alert",
    });
  }
};

const checkPendingOrders = () => {
  const PENDING_ORDERS_KEY = "bitspace_pending_orders";
  try {
    const stored = localStorage.getItem(PENDING_ORDERS_KEY);
    if (!stored) return;

    const pendingOrders = JSON.parse(stored);
    let importedCount = 0;

    for (const order of pendingOrders) {
      const exists = ordersStore.orders.value.find((o) => o.id === order.id);
      if (!exists) {
        ordersStore.orders.value.unshift(order);
        importedCount++;
        if (soundEnabled.value) playBellSound();
      }
    }

    if (importedCount > 0) {
      localStorage.removeItem(PENDING_ORDERS_KEY);
    }
  } catch (e) {
    // Ignore errors
  }
};

// ============================================
// Batch Actions
// ============================================
const isSelectionMode = ref(false);
const selectedOrderIds = ref<Set<string>>(new Set());

const toggleSelectionMode = () => {
  isSelectionMode.value = !isSelectionMode.value;
  if (!isSelectionMode.value) {
    selectedOrderIds.value = new Set();
  }
};

const toggleOrderSelection = (orderId: string) => {
  if (!isSelectionMode.value) return;

  const newSet = new Set(selectedOrderIds.value);
  if (newSet.has(orderId)) {
    newSet.delete(orderId);
  } else {
    newSet.add(orderId);
  }
  selectedOrderIds.value = newSet;
};

const selectAll = () => {
  // Check if all CURRENTLY VISIBLE orders are selected
  const visibleOrders = kitchenOrders.value;
  if (visibleOrders.length === 0) return;

  const newSet = new Set(selectedOrderIds.value);
  const allVisibleSelected = visibleOrders.every((o) => newSet.has(o.id));

  if (allVisibleSelected) {
    // Deselect visible ones
    visibleOrders.forEach((o) => newSet.delete(o.id));
  } else {
    // Select all visible
    visibleOrders.forEach((o) => newSet.add(o.id));
  }

  selectedOrderIds.value = newSet;

  // Ensure we are in selection mode
  if (!isSelectionMode.value && newSet.size > 0) {
    isSelectionMode.value = true;
  }
};

const batchUpdateStatus = async (status: "preparing" | "ready" | "served") => {
  if (selectedOrderIds.value.size === 0) return;

  const count = selectedOrderIds.value.size;
  const ids = Array.from(selectedOrderIds.value);

  // Optimistic update / processing
  isSelectionMode.value = false; // Exit selection mode
  selectedOrderIds.value = new Set();

  toast.add({
    title: t("common.processing", "Processing..."),
    description: `Updating ${count} orders to ${status}...`,
    color: "blue",
    icon: "i-heroicons-arrow-path",
  });

  // Process sequentially to ensure stability
  for (const id of ids) {
    await updateKitchenStatus(id, status);
  }

  toast.add({
    title: t("common.success", "Success"),
    description: `Updated ${count} orders to ${status}`,
    color: "green",
    icon: "i-heroicons-check-circle",
  });
};

onMounted(async () => {
  await Promise.all([
    ordersStore.init(),
    stationsStore.loadStations(),
    productsStore.init() // Need categories for mapping
  ]);

  // Load saved station selection
  const savedStation = localStorage.getItem("bitspace_kds_station");
  if (savedStation) selectedStationId.value = savedStation;

  // Check for any pending orders on load
  checkPendingOrders();

  // Update time every second
  timeInterval = setInterval(() => {
    currentTime.value = new Date();
  }, 1000);

  // BroadcastChannel for INSTANT order notifications (same origin)
  orderChannel = new BroadcastChannel("bitspace-orders");

  orderChannel.onmessage = (event) => {
    if (event.data?.type === "new-order" && event.data?.order) {
      handleNewOrder(event.data.order);
    }
  };

  // Fallback: Check for new orders every 30 seconds (BroadcastChannel handles instant)
  refreshInterval = setInterval(async () => {
    checkPendingOrders();
    await ordersStore.init(); // This also fetches from Nostr for cross-device sync
  }, 30000);

  // Listen for storage events from customer order pages
  window.addEventListener("storage", (event) => {
    if (event.key === "bitspace_pending_orders") {
      checkPendingOrders();
    }
  });
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
  if (refreshInterval) clearInterval(refreshInterval);
  if (orderChannel) orderChannel.close();
});
</script>

<template>
  <div
    class="h-screen flex flex-col bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden"
  >
    <!-- Header Bar -->
    <header
      class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex-shrink-0"
    >
      <div class="flex items-center justify-between">
        <!-- Logo & Title -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-3">
            <div>
              <div
                class="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-xl shadow-lg"
              >
                <NuxtLinkLocale to="/">👨‍🍳</NuxtLinkLocale>
              </div>
            </div>
            <div>
              <h1 class="text-lg font-bold text-gray-900 dark:text-white">
                {{ t("kitchen.title") }}
              </h1>
              <p class="text-xs text-gray-500">Kitchen Display System</p>
            </div>
          </div>

          <!-- Status Counts -->
          <div class="hidden md:flex items-center gap-3 ml-6">
            <button
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
              :class="
                filterStatus === 'all'
                  ? 'bg-gray-200 dark:bg-gray-800'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              "
              @click="filterStatus = 'all'"
            >
              <span class="text-sm font-medium">{{ t("common.all") }}</span>
              <UBadge color="gray" variant="soft" size="xs">
                {{ kitchenOrders.length }}
              </UBadge>
            </button>
            <button
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
              :class="
                filterStatus === 'new'
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              "
              @click="filterStatus = 'new'"
            >
              <span class="w-2 h-2 rounded-full bg-blue-500" />
              <span class="text-sm font-medium">{{ t("kitchen.new") }}</span>
              <UBadge color="blue" variant="soft" size="xs">
                {{ newOrdersCount }}
              </UBadge>
            </button>
            <button
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
              :class="
                filterStatus === 'preparing'
                  ? 'bg-amber-100 dark:bg-amber-900/30'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              "
              @click="filterStatus = 'preparing'"
            >
              <span class="w-2 h-2 rounded-full bg-amber-500" />
              <span class="text-sm font-medium">{{
                t("kitchen.preparing")
              }}</span>
              <UBadge color="amber" variant="soft" size="xs">
                {{ preparingOrdersCount }}
              </UBadge>
            </button>
            <button
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
              :class="
                filterStatus === 'ready'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              "
              @click="filterStatus = 'ready'"
            >
              <span class="w-2 h-2 rounded-full bg-green-500" />
              <span class="text-sm font-medium">{{ t("kitchen.ready") }}</span>
              <UBadge color="green" variant="soft" size="xs">
                {{ readyOrdersCount }}
              </UBadge>
            </button>
          </div>
        </div>

        <!-- Right Side -->
        <div class="flex items-center gap-2">
          <!-- Batch Selection Controls -->
          <div class="flex items-center gap-2">
            <UButton
              v-if="kitchenOrders.length > 0"
              size="sm"
              color="gray"
              variant="soft"
              @click="selectAll"
            >
              {{
                kitchenOrders.length > 0 &&
                kitchenOrders.every((o) => selectedOrderIds.has(o.id))
                  ? t("common.deselectAll", "Deselect All")
                  : t("common.selectAll", "Select All")
              }}
            </UButton>

            <UButton
              :icon="
                isSelectionMode
                  ? 'i-heroicons-x-mark'
                  : 'i-heroicons-check-circle'
              "
              :color="isSelectionMode ? 'gray' : 'primary'"
              :variant="isSelectionMode ? 'ghost' : 'soft'"
              size="sm"
              @click="toggleSelectionMode"
            >
              {{
                isSelectionMode
                  ? t("common.cancel", "Cancel")
                  : t("common.select", "Select")
              }}
            </UButton>
          </div>

          <div class="h-8 w-px bg-gray-300 dark:bg-gray-700" />

          <!-- Settings -->
          <UTooltip :text="soundEnabled ? 'Sound On' : 'Sound Off'">
            <UButton
              :icon="
                soundEnabled
                  ? 'i-heroicons-speaker-wave'
                  : 'i-heroicons-speaker-x-mark'
              "
              :color="soundEnabled ? 'primary' : 'neutral'"
              variant="ghost"
              @click="soundEnabled = !soundEnabled"
            />
          </UTooltip>

          <!-- Station Selector -->
          <div class="w-40 hidden md:block">
            <USelectMenu
                v-model="selectedStationId"
                :options="[{ id: '', name: 'All Stations' }, ...stationsStore.stations]"
                option-attribute="name"
                value-attribute="id"
                placeholder="All Stations"
                @update:model-value="(val) => {
                    localStorage.setItem('bitspace_kds_station', val);
                }"
            >
                <template #leading>
                    <UIcon name="i-heroicons-server-stack" class="w-4 h-4 text-gray-500" />
                </template>
            </USelectMenu>
          </div>

          <UTooltip text="Refresh">
            <UButton
              icon="i-heroicons-arrow-path"
              color="neutral"
              variant="ghost"
              :loading="ordersStore.isLoading.value"
              @click="ordersStore.init()"
            />
          </UTooltip>

          <NuxtLinkLocale to="/pos">
            <UButton
              icon="i-heroicons-arrow-left"
              color="neutral"
              variant="ghost"
            >
              POS
            </UButton>
          </NuxtLinkLocale>

          <!-- Notification Center -->
          <NotificationCenter />
        </div>
      </div>
    </header>

    <!-- Mobile Status Tabs (visible on mobile only) -->
    <div
      class="md:hidden overflow-x-auto bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2"
    >
      <div class="flex items-center gap-2 min-w-max">
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap"
          :class="
            filterStatus === 'all'
              ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          "
          @click="filterStatus = 'all'"
        >
          {{ t("common.all") }}
          <span
            class="text-xs bg-gray-300 dark:bg-gray-700 px-1.5 py-0.5 rounded-full"
          >
            {{ kitchenOrders.length }}
          </span>
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap"
          :class="
            filterStatus === 'new'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          "
          @click="filterStatus = 'new'"
        >
          <span class="w-2 h-2 rounded-full bg-blue-500" />
          {{ t("kitchen.new") }}
          <span
            class="text-xs bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded-full"
          >
            {{ newOrdersCount }}
          </span>
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap"
          :class="
            filterStatus === 'preparing'
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          "
          @click="filterStatus = 'preparing'"
        >
          <span class="w-2 h-2 rounded-full bg-amber-500" />
          {{ t("kitchen.preparing") }}
          <span
            class="text-xs bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 rounded-full"
          >
            {{ preparingOrdersCount }}
          </span>
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap"
          :class="
            filterStatus === 'ready'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          "
          @click="filterStatus = 'ready'"
        >
          <span class="w-2 h-2 rounded-full bg-green-500" />
          {{ t("kitchen.ready") }}
          <span
            class="text-xs bg-green-200 dark:bg-green-800 px-1.5 py-0.5 rounded-full"
          >
            {{ readyOrdersCount }}
          </span>
        </button>
      </div>
    </div>

    <!-- Orders Grid -->
    <div class="flex-1 overflow-auto p-4">
      <!-- Empty State -->
      <div
        v-if="kitchenOrders.length === 0"
        class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500"
      >
        <div class="text-8xl mb-4">👨‍🍳</div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {{ t("kitchen.noOrders") }}
        </h2>
        <p class="text-gray-500">{{ t("kitchen.noOrdersDesc") }}</p>
      </div>

      <!-- Orders Grid -->
      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
      >
        <div
          v-for="order in kitchenOrders"
          :key="order.id"
          class="rounded-2xl border-2 overflow-hidden transition-all hover:shadow-lg"
          :class="[
            getStatusBgColor(order.kitchenStatus),
            isSelectionMode && selectedOrderIds.has(order.id)
              ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900 translate-y-[-2px]'
              : '',
          ]"
          @click="toggleOrderSelection(order.id)"
        >
          <!-- Selection Overlay (Clickable Area) -->
          <div
            v-if="isSelectionMode"
            class="absolute inset-0 z-10 cursor-pointer"
          />

          <!-- Order Header -->
          <div class="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <!-- Checkbox for Selection Mode -->
                <div
                  v-if="isSelectionMode"
                  class="flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors"
                  :class="
                    selectedOrderIds.has(order.id)
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  "
                >
                  <UIcon
                    v-if="selectedOrderIds.has(order.id)"
                    name="i-heroicons-check"
                    class="w-3.5 h-3.5"
                  />
                </div>

                <div class="flex items-center gap-2">
                  <span
                    class="w-3 h-3 rounded-full"
                    :class="getStatusColor(order.kitchenStatus)"
                  />
                  <span class="font-bold text-lg text-gray-900 dark:text-white">
                    #{{ order.orderNumber }}-{{
                      order?.code || order.id.slice(-4).toUpperCase()
                    }}
                  </span>
                </div>
              </div>
              <span
                class="text-sm font-bold tabular-nums"
                :class="getAgeColor(order.date)"
              >
                {{ getOrderAge(order.date) }}
              </span>
            </div>

            <div class="flex items-center justify-between text-sm pl-8">
              <span class="text-gray-500">{{ formatTime(order.date) }}</span>
              <UBadge
                :color="
                  order.kitchenStatus === 'new'
                    ? 'blue'
                    : order.kitchenStatus === 'preparing'
                    ? 'amber'
                    : 'green'
                "
                variant="soft"
                size="sm"
              >
                {{ t(`kitchen.${order.kitchenStatus || "new"}`) }}
              </UBadge>
            </div>

            <!-- Customer/Table Info -->
            <div class="mt-2 text-sm space-y-1">
              <div
                v-if="order.tableNumber || order.tableName"
                class="font-bold text-gray-900 dark:text-white flex items-center gap-1"
              >
                <span class="text-lg">🪑</span>
                <span>{{
                  order.tableName || `Table ${order.tableNumber}`
                }}</span>
              </div>

              <div
                v-if="order.customer"
                class="text-gray-600 dark:text-gray-400"
              >
                <span>👤 {{ order.customer }}</span>
              </div>
            </div>
          </div>

          <!-- Order Items -->
          <div class="p-4 max-h-64 overflow-auto">
            <div class="space-y-3">
              <div
                v-for="(item, idx) in order.items"
                :key="idx"
                class="flex items-start gap-3"
              >
                <span
                  class="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-900 dark:text-white"
                >
                  {{ item.quantity }}
                </span>
                <div class="flex-1 min-w-0">
                  <p
                    class="font-medium text-gray-900 dark:text-white leading-tight"
                  >
                    {{ item.product?.name || "Unknown Item" }}
                  </p>
                  <!-- Variant -->
                  <p
                    v-if="item.selectedVariant"
                    class="text-sm text-amber-600 dark:text-amber-400"
                  >
                    {{ item.selectedVariant.name }}
                  </p>
                  <!-- Modifiers -->
                  <div
                    v-if="
                      item.selectedModifiers &&
                      item.selectedModifiers.length > 0
                    "
                    class="flex flex-wrap gap-1 mt-1"
                  >
                    <span
                      v-for="mod in item.selectedModifiers"
                      :key="mod.id"
                      class="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    >
                      {{ mod.name }}
                    </span>
                  </div>
                  <!-- Notes -->
                  <p
                    v-if="item.notes"
                    class="text-sm text-red-600 dark:text-red-400 mt-1 font-medium"
                  >
                    ⚠️ {{ item.notes }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Kitchen Notes -->
            <div
              v-if="order.kitchenNotes"
              class="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg"
            >
              <p class="text-sm text-yellow-800 dark:text-yellow-200">
                📝 {{ order.kitchenNotes }}
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div
            class="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50"
          >
            <div class="flex gap-2">
              <!-- Recall Button (for ready orders) -->
              <UButton
                v-if="order.kitchenStatus === 'ready'"
                color="amber"
                variant="soft"
                size="sm"
                class="flex-1"
                @click="recallOrder(order.id)"
              >
                <UIcon
                  name="i-heroicons-arrow-uturn-left"
                  class="w-4 h-4 mr-1"
                />
                {{ t("kitchen.recall") }}
              </UButton>

              <!-- Bump Button -->
              <UButton
                :color="
                  order.kitchenStatus === 'ready'
                    ? 'green'
                    : order.kitchenStatus === 'preparing'
                    ? 'amber'
                    : 'blue'
                "
                size="sm"
                class="flex-1"
                block
                @click="bumpOrder(order.id, order.kitchenStatus)"
              >
                <template
                  v-if="order.kitchenStatus === 'new' || !order.kitchenStatus"
                >
                  <UIcon name="i-heroicons-fire" class="w-4 h-4 mr-1" />
                  {{ t("kitchen.start") }}
                </template>
                <template v-else-if="order.kitchenStatus === 'preparing'">
                  <UIcon name="i-heroicons-check" class="w-4 h-4 mr-1" />
                  {{ t("kitchen.ready") }}
                </template>
                <template v-else>
                  <UIcon name="i-heroicons-check-circle" class="w-4 h-4 mr-1" />
                  {{ t("kitchen.served") }}
                </template>
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Batch Action Bar -->
    <div
      v-if="isSelectionMode && selectedOrderIds.size > 0"
      class="fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 shadow-lg z-20"
    >
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <span
            class="font-bold text-xl text-primary-600 dark:text-primary-400"
            >{{ selectedOrderIds.size }}</span
          >
          <span class="text-gray-500">{{
            t("common.selected", "selected")
          }}</span>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            color="amber"
            size="lg"
            icon="i-heroicons-fire"
            @click="batchUpdateStatus('preparing')"
          >
            <span class="hidden sm:inline">{{
              t("kitchen.start", "Start")
            }}</span>
          </UButton>
          <UButton
            color="green"
            size="lg"
            icon="i-heroicons-check"
            @click="batchUpdateStatus('ready')"
          >
            <span class="hidden sm:inline">{{
              t("kitchen.ready", "Ready")
            }}</span>
          </UButton>
          <UButton
            color="gray"
            size="lg"
            icon="i-heroicons-check-circle"
            @click="batchUpdateStatus('served')"
          >
            <span class="hidden sm:inline">{{
              t("kitchen.served", "Served")
            }}</span>
          </UButton>
        </div>
      </div>
    </div>

    <!-- Footer Stats -->
    <footer
      class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 px-4 py-2 flex-shrink-0"
    >
      <div class="flex items-center justify-between text-sm">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-blue-500" />
            <span class="text-gray-600 dark:text-gray-400">
              {{ t("kitchen.new") }}: {{ newOrdersCount }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-amber-500" />
            <span class="text-gray-600 dark:text-gray-400"
              >{{ t("kitchen.preparing") }}: {{ preparingOrdersCount }}</span
            >
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-green-500" />
            <span class="text-gray-600 dark:text-gray-400"
              >{{ t("kitchen.ready") }}: {{ readyOrdersCount }}</span
            >
          </div>
        </div>
        <div class="text-gray-500">
          {{ t("kitchen.lastUpdate") }}: {{ currentTime.toLocaleTimeString() }}
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
