<!-- components/pos/HeldOrdersModal.vue -->
<script setup lang="ts">
/**
 * Held Orders Modal
 * Display and manage orders that have been temporarily held (parked)
 */

interface HeldOrder {
  id: string;
  code?: string;
  orderNumber?: number;
  items: any[];
  total: number;
  createdAt: string;
  tableNumber?: string;
}

interface Props {
  open: boolean;
  orders: HeldOrder[];
  currency?: string;
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "recall", orderId: string): void;
  (e: "delete", orderId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  currency: "LAK",
});

const emit = defineEmits<Emits>();

const currency = useCurrency();

// Recall order (restore to cart)
const handleRecall = (orderId: string) => {
  emit("recall", orderId);
};

// Delete held order
const handleDelete = (orderId: string) => {
  emit("delete", orderId);
};

// Format time from ISO string
const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString();
};
</script>

<template>
  <UModal
    :open="open"
    title="Held Orders"
    description="Orders that are on hold"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="p-6 bg-white dark:bg-gray-900">
        <h3
          class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
        >
          <span>⏸️</span> Held Orders
        </h3>

        <!-- Empty State -->
        <div
          v-if="orders.length === 0"
          class="text-center py-8 text-gray-400 dark:text-gray-500"
        >
          <span class="text-4xl block mb-2">📋</span>
          No held orders
        </div>

        <!-- Orders List -->
        <div v-else class="space-y-3 max-h-96 overflow-auto">
          <div
            v-for="order in orders"
            :key="order.id"
            class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/30"
          >
            <div class="flex justify-between items-start mb-2">
              <div class="flex items-center gap-2">
                <span
                  v-if="order.orderNumber"
                  class="text-lg font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded"
                >
                  #{{ order.orderNumber }}
                </span>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ order.code || order.id }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ formatTime(order.createdAt) }}
                  </p>
                </div>
              </div>
              <p class="font-bold text-amber-600 dark:text-amber-400">
                {{ currency.format(order.total, props.currency) }}
              </p>
            </div>

            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {{ order.items.length }} items
              <span v-if="order.tableNumber" class="ml-2">
                • Table {{ order.tableNumber }}
              </span>
            </p>

            <div class="flex gap-2">
              <UButton
                size="sm"
                color="primary"
                block
                @click="handleRecall(order.id)"
              >
                Recall
              </UButton>
              <UButton
                size="sm"
                color="red"
                variant="ghost"
                @click="handleDelete(order.id)"
              >
                <UIcon name="i-heroicons-trash" class="w-4 h-4" />
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
