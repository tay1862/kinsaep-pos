<!-- pages/inventory/po/[id].vue -->
<!-- Purchase Order Detail Page -->
<script setup lang="ts">
import type { PurchaseOrder } from "~/composables/use-inventory";

definePageMeta({
  layout: "default",
});

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const inventory = useInventory();

// Get PO ID from route
const poId = computed(() => route.params.id as string);

// Find the purchase order
const purchaseOrder = computed<PurchaseOrder | undefined>(() => {
  return inventory.purchaseOrders.value.find((po) => po.id === poId.value);
});

// Loading state
const isLoading = ref(true);
const isReceiving = ref(false);
const showReceiveModal = ref(false);

// Initialize
onMounted(async () => {
  if (!inventory.purchaseOrders.value.length) {
    await inventory.init();
  }
  isLoading.value = false;
});

// Status config
const statusConfig = computed(() => {
  const status = purchaseOrder.value?.status || "pending";
  const configs: Record<
    string,
    { color: string; icon: string; label: string; bgClass: string }
  > = {
    pending: {
      color: "blue",
      icon: "i-heroicons-clock",
      label: t("inventory.status.pending", "Pending"),
      bgClass: "bg-blue-100 dark:bg-blue-900/30",
    },
    approved: {
      color: "indigo",
      icon: "i-heroicons-check-badge",
      label: t("inventory.status.approved", "Approved"),
      bgClass: "bg-indigo-100 dark:bg-indigo-900/30",
    },
    ordered: {
      color: "amber",
      icon: "i-heroicons-truck",
      label: t("inventory.status.ordered", "Ordered"),
      bgClass: "bg-amber-100 dark:bg-amber-900/30",
    },
    partial: {
      color: "yellow",
      icon: "i-heroicons-cube",
      label: t("inventory.status.partial", "Partially Received"),
      bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    received: {
      color: "green",
      icon: "i-heroicons-check-circle",
      label: t("inventory.status.received", "Received"),
      bgClass: "bg-green-100 dark:bg-green-900/30",
    },
    cancelled: {
      color: "red",
      icon: "i-heroicons-x-circle",
      label: t("inventory.status.cancelled", "Cancelled"),
      bgClass: "bg-red-100 dark:bg-red-900/30",
    },
  };
  return configs[status] || configs.pending;
});

// Calculate totals
const itemsReceived = computed(() => {
  if (!purchaseOrder.value) return 0;
  return purchaseOrder.value.items.reduce(
    (sum, item) => sum + (item.receivedQty || 0),
    0
  );
});

const itemsTotal = computed(() => {
  if (!purchaseOrder.value) return 0;
  return purchaseOrder.value.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
});

const receiveProgress = computed(() => {
  if (itemsTotal.value === 0) return 0;
  return Math.round((itemsReceived.value / itemsTotal.value) * 100);
});

// Actions
async function approveOrder() {
  if (!purchaseOrder.value) return;
  const success = await inventory.updatePurchaseOrderStatus(
    poId.value,
    "approved"
  );
  if (success) {
    toast.add({
      title: t("common.success", "Success"),
      description: t("inventory.poApproved", "Purchase order approved"),
      icon: "i-heroicons-check-circle",
      color: "green",
    });
  }
}

async function markAsOrdered() {
  if (!purchaseOrder.value) return;
  const success = await inventory.updatePurchaseOrderStatus(
    poId.value,
    "ordered"
  );
  if (success) {
    toast.add({
      title: t("common.success", "Success"),
      description: t("inventory.poOrdered", "Order sent to supplier"),
      icon: "i-heroicons-truck",
      color: "amber",
    });
  }
}

async function cancelOrder() {
  if (!purchaseOrder.value) return;
  const success = await inventory.updatePurchaseOrderStatus(
    poId.value,
    "cancelled"
  );
  if (success) {
    toast.add({
      title: t("common.success", "Success"),
      description: t("inventory.poCancelled", "Purchase order cancelled"),
      icon: "i-heroicons-x-circle",
      color: "red",
    });
  }
}

// Receive stock for an item
const receiveQuantities = ref<Record<string, number>>({});

function initReceiveQuantities() {
  if (!purchaseOrder.value) return;
  receiveQuantities.value = {};
  for (const item of purchaseOrder.value.items) {
    const remaining = item.quantity - (item.receivedQty || 0);
    receiveQuantities.value[item.productId] = remaining;
  }
  showReceiveModal.value = true;
}

async function confirmReceiveStock() {
  if (!purchaseOrder.value) return;
  isReceiving.value = true;

  try {
    // Build received items array
    const receivedItems = purchaseOrder.value.items
      .map((item) => ({
        productId: item.productId,
        receivedQty: receiveQuantities.value[item.productId] || 0,
      }))
      .filter((item) => item.receivedQty > 0);

    // Use inventory composable to receive PO
    const success = await inventory.receivePurchaseOrder(
      poId.value,
      receivedItems
    );

    if (success) {
      toast.add({
        title: t("common.success", "Success"),
        description:
          t("inventory.stockReceived", "Stock received successfully"),
        icon: "i-heroicons-check-circle",
        color: "green",
      });
      showReceiveModal.value = false;
    } else {
      toast.add({
        title: t("common.error", "Error"),
        description: inventory.error.value || "Failed to receive stock",
        icon: "i-heroicons-exclamation-circle",
        color: "red",
      });
    }
  } catch (e) {
    toast.add({
      title: t("common.error", "Error"),
      description: String(e),
      icon: "i-heroicons-exclamation-circle",
      color: "red",
    });
  } finally {
    isReceiving.value = false;
  }
}

function printPO() {
  window.print();
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin text-primary-500"
      />
    </div>

    <!-- Not Found -->
    <div
      v-else-if="!purchaseOrder"
      class="flex flex-col items-center justify-center py-20 text-gray-500"
    >
      <UIcon
        name="i-heroicons-document-magnifying-glass"
        class="w-16 h-16 mb-4"
      />
      <p class="text-lg font-medium">
        {{ t("inventory.poNotFound", "Purchase Order not found") }}
      </p>
      <UButton class="mt-4" color="primary" @click="router.push('/inventory')">
        {{ t("common.back", "Back to Inventory") }}
      </UButton>
    </div>

    <!-- PO Detail -->
    <div v-else>
      <!-- Header -->
      <CommonPageHeader
        :title="`PO #${purchaseOrder.id.slice(-8).toUpperCase()}`"
        :description="purchaseOrder.supplierName"
      >
        <template #left>
          <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            @click="router.push('/inventory?tab=purchaseOrders')"
          />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <!-- Print -->
            <UButton
              icon="i-heroicons-printer"
              color="neutral"
              variant="outline"
              @click="printPO"
            />

            <!-- Status Actions -->
            <template v-if="purchaseOrder.status === 'pending'">
              <UButton color="red" variant="soft" @click="cancelOrder">
                {{ t("common.cancel", "Cancel") }}
              </UButton>
              <UButton color="primary" @click="approveOrder">
                {{ t("inventory.approve", "Approve") }}
              </UButton>
            </template>

            <template v-else-if="purchaseOrder.status === 'approved'">
              <UButton color="amber" @click="markAsOrdered">
                <UIcon name="i-heroicons-truck" class="mr-1" />
                {{ t("inventory.markOrdered", "Mark as Ordered") }}
              </UButton>
            </template>

            <template
              v-else-if="['ordered', 'partial'].includes(purchaseOrder.status)"
            >
              <UButton color="green" @click="initReceiveQuantities">
                <UIcon name="i-heroicons-inbox-arrow-down" class="mr-1" />
                {{ t("inventory.receiveStock", "Receive Stock") }}
              </UButton>
            </template>
          </div>
        </template>
      </CommonPageHeader>

      <!-- Content -->
      <div class="p-4 space-y-6">
        <!-- Status & Info Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Status Card -->
          <div class="p-4 rounded-2xl" :class="statusConfig.bgClass">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center"
                :class="`bg-${statusConfig.color}-500 text-white`"
              >
                <UIcon :name="statusConfig.icon" class="w-6 h-6" />
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ t("common.status", "Status") }}
                </p>
                <p
                  class="text-lg font-bold"
                  :class="`text-${statusConfig.color}-600 dark:text-${statusConfig.color}-400`"
                >
                  {{ statusConfig.label }}
                </p>
              </div>
            </div>
          </div>

          <!-- Total Card -->
          <div class="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-xl bg-primary-500 text-white flex items-center justify-center"
              >
                <UIcon name="i-heroicons-currency-dollar" class="w-6 h-6" />
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ t("common.total", "Total") }}
                </p>
                <p class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ formatCurrency(purchaseOrder.total) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Progress Card -->
          <div class="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center"
              >
                <UIcon name="i-heroicons-cube" class="w-6 h-6" />
              </div>
              <div class="flex-1">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ t("inventory.received", "Received") }}
                </p>
                <p class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ itemsReceived }} / {{ itemsTotal }}
                </p>
                <div
                  class="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-emerald-500 rounded-full transition-all"
                    :style="{ width: `${receiveProgress}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Details Grid -->
        <div
          class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700"
        >
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {{ t("inventory.supplier", "Supplier") }}
            </p>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ purchaseOrder.supplierName }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {{ t("common.branch", "Branch") }}
            </p>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ purchaseOrder.branchName }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {{ t("common.createdAt", "Created") }}
            </p>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ formatDate(purchaseOrder.createdAt) }}
            </p>
          </div>
          <div v-if="purchaseOrder.expectedDate">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {{ t("inventory.expectedDate", "Expected") }}
            </p>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ formatDate(purchaseOrder.expectedDate) }}
            </p>
          </div>
        </div>

        <!-- Items Table -->
        <div
          class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3
              class="font-semibold text-gray-900 dark:text-white flex items-center gap-2"
            >
              <UIcon
                name="i-heroicons-shopping-cart"
                class="w-5 h-5 text-primary-500"
              />
              {{ t("inventory.items", "Items") }}
              <UBadge color="primary" variant="subtle">
                {{ purchaseOrder.items.length }}
              </UBadge>
            </h3>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-900/50">
                  <th
                    class="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase"
                  >
                    {{ t("products.name", "Product") }}
                  </th>
                  <th
                    class="text-center py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase"
                  >
                    {{ t("inventory.quantity", "Qty") }}
                  </th>
                  <th
                    class="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase"
                  >
                    {{ t("inventory.unitPrice", "Unit Price") }}
                  </th>
                  <th
                    class="text-center py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase"
                  >
                    {{ t("inventory.received", "Received") }}
                  </th>
                  <th
                    class="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase"
                  >
                    {{ t("common.subtotal", "Subtotal") }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in purchaseOrder.items"
                  :key="item.productId"
                  class="border-b border-gray-100 dark:border-gray-800"
                >
                  <td class="py-3 px-4">
                    <p class="font-medium text-gray-900 dark:text-white">
                      {{ item.productName }}
                    </p>
                  </td>
                  <td class="py-3 px-4 text-center">
                    {{ item.quantity }}
                  </td>
                  <td class="py-3 px-4 text-right">
                    {{ formatCurrency(item.unitPrice) }}
                  </td>
                  <td class="py-3 px-4 text-center">
                    <UBadge
                      :color="
                        (item.receivedQty || 0) >= item.quantity
                          ? 'green'
                          : (item.receivedQty || 0) > 0
                          ? 'yellow'
                          : 'gray'
                      "
                      variant="subtle"
                    >
                      {{ item.receivedQty || 0 }} / {{ item.quantity }}
                    </UBadge>
                  </td>
                  <td class="py-3 px-4 text-right font-medium">
                    {{ formatCurrency(item.quantity * item.unitPrice) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-gray-50 dark:bg-gray-900/50">
                  <td
                    colspan="4"
                    class="py-3 px-4 text-right font-semibold text-gray-900 dark:text-white"
                  >
                    {{ t("common.total", "Total") }}
                  </td>
                  <td
                    class="py-3 px-4 text-right font-bold text-lg text-primary-600 dark:text-primary-400"
                  >
                    {{ formatCurrency(purchaseOrder.total) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Notes -->
        <div
          v-if="purchaseOrder.notes"
          class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-800"
        >
          <p
            class="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex items-center gap-2 mb-2"
          >
            <UIcon name="i-heroicons-document-text" class="w-4 h-4" />
            {{ t("common.notes", "Notes") }}
          </p>
          <p class="text-yellow-700 dark:text-yellow-300">
            {{ purchaseOrder.notes }}
          </p>
        </div>
      </div>
    </div>

    <!-- Receive Stock Modal -->
    <UModal v-model:open="showReceiveModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-medium flex items-center gap-2">
              <UIcon
                name="i-heroicons-inbox-arrow-down"
                class="text-green-500"
              />
              {{ t("inventory.receiveStock", "Receive Stock") }}
            </h3>
          </template>

          <div v-if="purchaseOrder" class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{
                t("inventory.receiveStockDesc", "Enter the quantities received for each item.")
              }}
            </p>

            <div class="space-y-3">
              <div
                v-for="item in purchaseOrder.items"
                :key="item.productId"
                class="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
              >
                <div class="flex-1">
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ item.productName }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ t("inventory.ordered", "Ordered") }}:
                    {{ item.quantity }} |
                    {{ t("inventory.received", "Received") }}:
                    {{ item.receivedQty || 0 }}
                  </p>
                </div>
                <div class="w-24">
                  <UInput
                    v-model.number="receiveQuantities[item.productId]"
                    type="number"
                    min="0"
                    :max="item.quantity - (item.receivedQty || 0)"
                  />
                </div>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="outline"
                @click="showReceiveModal = false"
              >
                {{ t("common.cancel", "Cancel") }}
              </UButton>
              <UButton
                color="green"
                :loading="isReceiving"
                @click="confirmReceiveStock"
              >
                <UIcon name="i-heroicons-check" class="mr-1" />
                {{ t("inventory.confirmReceive", "Confirm Receive") }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
@media print {
  .no-print {
    display: none !important;
  }
}
</style>
