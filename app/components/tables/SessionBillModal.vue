<!-- components/tables/SessionBillModal.vue -->
<!-- 💰 Session Bill Processing - Consolidate & Pay Multiple Orders -->
<script setup lang="ts">
import type { Order } from "~/types";

const props = defineProps<{
  open: boolean;
  sessionId?: string;
  tableNumber?: string;
  tableName?: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "process-payment": [orders: Order[], sessionInfo: any];
}>();

const tableSession = useTableSession();
const ordersStore = useOrders();
const { format: formatPrice } = useCurrency();

// State
const session = ref<ReturnType<typeof tableSession.getSession> | null>(null);
const sessionOrders = ref<Order[]>([]);
const loading = ref(false);

// Computed
const sessionTotal = computed(() => {
  return sessionOrders.value.reduce((sum, order) => sum + order.total, 0);
});

const sessionDuration = computed(() => {
  return session.value
    ? tableSession.calculateDuration(session.value.startTime)
    : "0m";
});

// Load session data
const loadSession = async () => {
  if (!props.sessionId) return;

  loading.value = true;
  try {
    session.value = tableSession.getSession(props.sessionId);

    if (session.value) {
      // Load all orders in session
      const orders: Order[] = [];
      for (const orderId of session.value.orders) {
        const order = ordersStore.getOrder(orderId);
        if (order) {
          orders.push(order);
        }
      }
      sessionOrders.value = orders;
    }
  } catch (error) {
    console.error("Failed to load session:", error);
  } finally {
    loading.value = false;
  }
};

// Process payment
const processPayment = () => {
  if (!session.value || sessionOrders.value.length === 0) return;

  emit("process-payment", sessionOrders.value, {
    sessionId: session.value.sessionId,
    tableName: session.value.tableName,
    tableNumber: session.value.tableNumber,
  });

  emit("update:open", false);
};

// Watch for modal open
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.sessionId) {
      loadSession();
    }
  },
  { immediate: true }
);
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold">💰 Session Bill</h3>
              <p class="text-sm text-gray-500">
                {{ tableName || `Table ${tableNumber}` }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-heroicons-x-mark"
              @click="emit('update:open', false)"
            />
          </div>
        </template>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-8 h-8 animate-spin text-primary-500 mx-auto mb-2"
          />
          <p class="text-gray-500">Loading session...</p>
        </div>

        <!-- Session Content -->
        <div v-else-if="session && sessionOrders.length > 0" class="space-y-4">
          <!-- Session Info -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <p class="text-xs text-gray-500">Orders</p>
                <p class="text-xl font-bold text-primary-600">
                  {{ sessionOrders.length }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Duration</p>
                <p class="text-xl font-bold text-gray-900 dark:text-white">
                  {{ sessionDuration }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Status</p>
                <UBadge
                  :color="
                    session.status === 'requesting_bill' ? 'emerald' : 'primary'
                  "
                  size="sm"
                >
                  {{
                    session.status === "requesting_bill"
                      ? "Bill Requested"
                      : "Active"
                  }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Orders List -->
          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="order in sessionOrders"
              :key="order.id"
              class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <!-- Order Header -->
              <div class="flex items-center justify-between mb-2">
                <div>
                  <span class="font-bold text-sm">
                    #{{ order.code || order.id.slice(-6) }}
                  </span>
                  <span class="text-xs text-gray-500 ml-2">
                    {{ new Date(order.date).toLocaleTimeString() }}
                  </span>
                </div>
                <span class="font-bold text-primary-600">
                  {{ formatPrice(order.total) }}
                </span>
              </div>

              <!-- Order Items -->
              <div class="text-sm text-gray-600 dark:text-gray-400">
                {{
                  order.items
                    .map((i) => `${i.quantity}x ${i.product.name}`)
                    .join(", ")
                }}
              </div>
            </div>
          </div>

          <!-- Total -->
          <div class="bg-gray-900 dark:bg-gray-950 rounded-2xl p-4">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-gray-400 text-sm">Total Amount</p>
                <p class="text-gray-500 text-xs">
                  {{ sessionOrders.length }} orders
                </p>
              </div>
              <span class="text-3xl font-bold text-white">
                {{ formatPrice(sessionTotal) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-8">
          <UIcon
            name="i-heroicons-receipt-percent"
            class="w-16 h-16 text-gray-300 mx-auto mb-4"
          />
          <p class="text-gray-500">No orders found in this session</p>
        </div>

        <template #footer v-if="sessionOrders.length > 0">
          <div class="flex gap-3">
            <UButton
              color="neutral"
              variant="soft"
              block
              @click="emit('update:open', false)"
            >
              Cancel
            </UButton>
            <UButton color="primary" block @click="processPayment">
              <UIcon name="i-heroicons-credit-card" class="w-5 h-5 mr-2" />
              Process Payment
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
