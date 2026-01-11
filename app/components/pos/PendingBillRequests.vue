<!-- components/pos/PendingBillRequests.vue -->
<!-- 🔔 Pending Bill Requests - Show tables requesting payment -->
<script setup lang="ts">
const tableSession = useTableSession();
const ordersStore = useOrders();
const receiptGenerator = useReceiptGenerator();
const router = useRouter();
const toast = useToast();
const { format: formatPrice } = useCurrency();

// State
const pendingBills = ref<any[]>([]);
const showSessionModal = ref(false);
const selectedSession = ref<any>(null);
const processingPayment = ref(false);

// Load pending bill requests
const loadPendingBills = () => {
  const sessions = tableSession.getSessionsRequestingBill();

  pendingBills.value = sessions.map((session) => {
    // Get order count and total
    const orders = session.orders
      .map((orderId) => ordersStore.getOrder(orderId))
      .filter(Boolean);

    return {
      ...session,
      orderCount: orders.length,
      calculatedTotal: orders.reduce(
        (sum, order) => sum + (order?.total || 0),
        0
      ),
      duration: tableSession.calculateDuration(session.startTime),
    };
  });
};

// Open session bill modal
const viewSessionBill = (session: any) => {
  selectedSession.value = session;
  showSessionModal.value = true;
};

// Process payment for session
const handleProcessPayment = async (orders: any[], sessionInfo: any) => {
  processingPayment.value = true;

  try {
    // Store session info for POS to use
    if (import.meta.client) {
      sessionStorage.setItem(
        "pending-session-payment",
        JSON.stringify({
          orders,
          sessionInfo,
        })
      );

      // ALSO broadcast to the POS page in case we're already on it
      // This triggers the payment flow without needing page navigation/refresh
      const channel = new BroadcastChannel("bitspace-pos-commands");
      // Must serialize to plain objects (Vue reactive proxies can't be cloned)
      channel.postMessage({
        type: "process-session-payment",
        orders: JSON.parse(JSON.stringify(orders)),
        sessionInfo: JSON.parse(JSON.stringify(sessionInfo)),
      });
      channel.close();
    }

    // Check if we're already on POS page
    const currentPath = router.currentRoute.value.path;
    if (currentPath === "/pos" || currentPath.startsWith("/pos")) {
      // Already on POS - no need to navigate, just close modal
      // The BroadcastChannel message will handle the rest
      toast.add({
        title: "Payment Ready",
        description: `${orders.length} orders loaded. Select payment method.`,
        icon: "i-heroicons-credit-card",
        color: "primary",
      });
    } else {
      // Navigate to POS
      await router.push("/pos");

      toast.add({
        title: "Ready for Payment",
        description: `${orders.length} orders loaded. Total: ${formatPrice(
          orders.reduce((sum, o) => sum + o.total, 0)
        )}`,
        icon: "i-heroicons-credit-card",
        color: "primary",
      });
    }
  } catch (error) {
    console.error("Failed to process payment:", error);
    toast.add({
      title: "Error",
      description: "Failed to prepare payment",
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    processingPayment.value = false;
  }
};

// Refresh on mount and interval
let commandsChannel: BroadcastChannel | null = null;
const notificationsStore = useNotifications();

onMounted(() => {
  loadPendingBills();

  // Backup polling every 30 seconds (events are primary)
  const interval = setInterval(loadPendingBills, 30000);

  // Listen for real-time events
  if (import.meta.client) {
    commandsChannel = new BroadcastChannel("bitspace-pos-commands");
    commandsChannel.onmessage = (event) => {
      if (event.data?.type === "session-closed") {
        // Session paid - refresh immediately
        loadPendingBills();
      } else if (event.data?.type === "bill-requested") {
        // 🔔 New bill request - add notification (auto plays sound + shows toast)
        const tableName =
          event.data.tableName || `Table ${event.data.tableNumber}`;

        notificationsStore.addNotification({
          type: "alert",
          title: `💰 ${tableName} requesting bill!`,
          message: `${event.data.orderCount || 0} orders - Total: ${formatPrice(
            event.data.sessionTotal || 0
          )}`,
          priority: "high",
          actionUrl: "/pos",
          data: {
            tableNumber: event.data.tableNumber,
            tableName: event.data.tableName,
            sessionId: event.data.sessionId,
            sessionTotal: event.data.sessionTotal,
            orderCount: event.data.orderCount,
            serviceType: "bill_request",
          },
        });

        // Refresh to show new pending bill
        loadPendingBills();
      } else if (event.data?.type === "waiter-call") {
        // 🔔 Waiter call - add notification (auto plays sound + shows toast)
        const tableName =
          event.data.tableName || `Table ${event.data.tableNumber}`;

        notificationsStore.addNotification({
          type: "alert",
          title: `🔔 ${tableName} needs assistance!`,
          message: "Customer called for waiter",
          priority: "high",
          actionUrl: "/tables",
          data: {
            tableNumber: event.data.tableNumber,
            tableName: event.data.tableName,
            serviceType: "waiter_call",
          },
        });
      }
    };
  }

  onUnmounted(() => {
    clearInterval(interval);
    if (commandsChannel) commandsChannel.close();
  });
});
</script>

<template>
  <div v-if="pendingBills.length > 0" class="mb-6">
    <div
      class="bg-linear-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg p-4"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2 text-white">
          <UIcon name="i-heroicons-bell-alert" class="w-6 h-6 animate-bounce" />
          <h3 class="font-bold text-lg">
            {{ pendingBills.length }} Table{{
              pendingBills.length > 1 ? "s" : ""
            }}
            Requesting Bill
          </h3>
        </div>
      </div>

      <!-- Pending Bills List -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="bill in pendingBills"
          :key="bill.sessionId"
          class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md hover:shadow-xl transition-shadow cursor-pointer"
          @click="viewSessionBill(bill)"
        >
          <div class="flex items-center justify-between mb-2">
            <div>
              <h4 class="font-bold text-gray-900 dark:text-white">
                {{ bill.tableName || `Table ${bill.tableNumber}` }}
              </h4>
              <p class="text-xs text-gray-500">{{ bill.duration }} ago</p>
            </div>
            <UBadge color="emerald" size="sm">
              {{ bill.orderCount }} orders
            </UBadge>
          </div>

          <div class="flex items-center justify-between mt-3 pt-3 border-t">
            <span class="text-sm text-gray-500">Total:</span>
            <span class="text-xl font-bold text-primary-600">
              {{ formatPrice(bill.calculatedTotal) }}
            </span>
          </div>

          <UButton color="primary" variant="soft" size="xs" block class="mt-3">
            <UIcon name="i-heroicons-credit-card" class="w-4 h-4 mr-1" />
            Process Payment
          </UButton>
        </div>
      </div>
    </div>

    <!-- Session Bill Modal -->
    <TablesSessionBillModal
      v-model:open="showSessionModal"
      :session-id="selectedSession?.sessionId"
      :table-number="selectedSession?.tableNumber"
      :table-name="selectedSession?.tableName"
      @process-payment="handleProcessPayment"
    />
  </div>
</template>
