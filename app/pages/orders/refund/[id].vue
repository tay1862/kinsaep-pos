<!-- pages/orders/refund/[id].vue -->
<!-- 💸 Refund/Return Management - Process refunds and voids -->
<script setup lang="ts">
import type { Order, PaymentMethod } from '~/types';

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const ordersStore = useOrders();
const currency = useCurrency();
const { canProcessRefunds, canVoidOrders } = usePermissions();

// ============================================
// State
// ============================================
const orderId = computed(() => route.params.id as string);
const order = ref<Order | null>(null);
const isLoading = ref(true);
const isProcessing = ref(false);
const showPinModal = ref(false);
const pinCode = ref('');

// Refund form
const refundType = ref<'full' | 'partial' | 'void'>('full');
const refundReason = ref('');
const customReason = ref('');
const selectedItems = ref<Map<number, { selected: boolean; quantity: number }>>(new Map());

// Refund reasons
const refundReasons = [
  { value: 'customer_request', label: t('refund.reasons.customerRequest') },
  { value: 'wrong_item', label: t('refund.reasons.wrongItem') },
  { value: 'quality_issue', label: t('refund.reasons.qualityIssue') },
  { value: 'damaged', label: t('refund.reasons.damaged') },
  { value: 'duplicate', label: t('refund.reasons.duplicate') },
  { value: 'other', label: t('refund.reasons.other') },
];

// ============================================
// Computed
// ============================================
const canProcess = computed(() => {
  if (refundType.value === 'void') return canVoidOrders.value;
  return canProcessRefunds.value;
});

const refundAmount = computed(() => {
  if (!order.value) return 0;
  
  if (refundType.value === 'full' || refundType.value === 'void') {
    return order.value.total;
  }
  
  // Calculate partial refund
  let amount = 0;
  selectedItems.value.forEach((item, index) => {
    if (item.selected && order.value?.items[index]) {
      const orderItem = order.value.items[index];
      const unitPrice = orderItem.total / orderItem.quantity;
      amount += unitPrice * item.quantity;
    }
  });
  
  return amount;
});

const refundItemsCount = computed(() => {
  if (refundType.value !== 'partial') return order.value?.items?.length || 0;
  
  let count = 0;
  selectedItems.value.forEach((item) => {
    if (item.selected) count += item.quantity;
  });
  return count;
});

const isValidRefund = computed(() => {
  if (!order.value) return false;
  if (!refundReason.value) return false;
  if (refundReason.value === 'other' && !customReason.value.trim()) return false;
  if (refundType.value === 'partial' && refundItemsCount.value === 0) return false;
  return true;
});

// ============================================
// Methods
// ============================================
const loadOrder = async () => {
  isLoading.value = true;
  try {
    const foundOrder = ordersStore.orders.value.find(o => o.id === orderId.value);
    if (foundOrder) {
      order.value = foundOrder;
      // Initialize selected items
      foundOrder.items?.forEach((item, index) => {
        selectedItems.value.set(index, { selected: false, quantity: item.quantity });
      });
    } else {
      toast.add({
        title: t('refund.orderNotFound'),
        color: 'red',
      });
      router.push('/orders');
    }
  } catch (error) {
    console.error('Error loading order:', error);
    toast.add({
      title: t('common.error'),
      description: String(error),
      color: 'red',
    });
  } finally {
    isLoading.value = false;
  }
};

const toggleItemSelection = (index: number) => {
  const item = selectedItems.value.get(index);
  if (item) {
    item.selected = !item.selected;
    selectedItems.value.set(index, item);
  }
};

const updateItemQuantity = (index: number, qty: number) => {
  const item = selectedItems.value.get(index);
  const orderItem = order.value?.items[index];
  if (item && orderItem) {
    item.quantity = Math.max(1, Math.min(qty, orderItem.quantity));
    selectedItems.value.set(index, item);
  }
};

const initiateRefund = () => {
  // Check if PIN is required
  // For now, directly process
  processRefund();
};

const processRefund = async () => {
  if (!order.value || !isValidRefund.value) return;
  
  isProcessing.value = true;
  
  try {
    const reason = refundReason.value === 'other' ? customReason.value : refundReason.value;
    
    // Create refund record
    const refundData = {
      orderId: order.value.id,
      type: refundType.value,
      amount: refundAmount.value,
      reason,
      items: refundType.value === 'partial' 
        ? Array.from(selectedItems.value.entries())
            .filter(([_, item]) => item.selected)
            .map(([index, item]) => ({
              itemIndex: index,
              quantity: item.quantity,
              product: order.value!.items[index].product,
            }))
        : order.value.items,
      processedAt: new Date().toISOString(),
      processedBy: 'current-user', // TODO: Get from auth
    };

    // Update order status
    await ordersStore.updateOrder(order.value.id, {
      status: refundType.value === 'void' ? 'cancelled' : 'refunded',
      refundData,
    });

    // Log audit entry
    const auditLog = JSON.parse(localStorage.getItem('auditLog') || '[]');
    auditLog.unshift({
      id: `AUDIT-${Date.now()}`,
      action: refundType.value === 'void' ? 'void' : 'refund',
      orderId: order.value.id,
      amount: refundAmount.value,
      reason,
      userId: 'current-user',
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('auditLog', JSON.stringify(auditLog.slice(0, 1000)));

    toast.add({
      title: refundType.value === 'void' ? t('refund.voided') : t('refund.processed'),
      description: `${currency.format(refundAmount.value, 'LAK')} ${t('refund.refunded')}`,
      color: 'green',
    });

    router.push(`/orders/${order.value.id}`);
  } catch (error) {
    console.error('Error processing refund:', error);
    toast.add({
      title: t('common.error'),
      description: String(error),
      color: 'red',
    });
  } finally {
    isProcessing.value = false;
    showPinModal.value = false;
  }
};

const getPaymentMethodLabel = (method?: PaymentMethod) => {
  const labels: Record<string, string> = {
    cash: '💵 ' + t('payment.methods.cash'),
    lightning: '⚡ ' + t('payment.methods.lightning'),
    bolt12: '⚡ BOLT12',
    lnurl: '⚡ LNURL',
    card: '💳 ' + t('payment.methods.card'),
    qr_static: '📱 ' + t('payment.methods.staticQR'),
  };
  return labels[method || ''] || method || 'Unknown';
};

// ============================================
// Lifecycle
// ============================================
onMounted(async () => {
  await ordersStore.init();
  await loadOrder();
});
</script>

<template>
  <div class="space-y-6 p-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UButton
          icon="i-heroicons-arrow-left"
          color="neutral"
          variant="ghost"
          @click="router.back()"
        />
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>💸</span> {{ t('refund.title') }}
          </h1>
          <p class="text-sm text-gray-500">
            {{ t('refund.description') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Permission Denied -->
    <UAlert
      v-else-if="!canProcess"
      icon="i-heroicons-shield-exclamation"
      color="red"
      variant="subtle"
      :title="t('refund.noPermission')"
      :description="t('refund.noPermissionDesc')"
    />

    <!-- Refund Form -->
    <template v-else-if="order">
      <!-- Order Info Card -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl">
                🧾
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{ t('refund.order') }} #{{ order.id }}
                </h3>
                <p class="text-sm text-gray-500">
                  {{ new Date(order.date).toLocaleString() }}
                </p>
              </div>
            </div>
            <UBadge
              :color="order.status === 'completed' ? 'green' : order.status === 'refunded' ? 'orange' : 'gray'"
              variant="soft"
              size="lg"
            >
              {{ t(`orders.status.${order.status}`) }}
            </UBadge>
          </div>
        </template>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div class="text-sm text-gray-500">{{ t('refund.originalAmount') }}</div>
            <div class="text-xl font-bold text-gray-900 dark:text-white">
              {{ currency.format(order.total, 'LAK') }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">{{ t('refund.paymentMethod') }}</div>
            <div class="font-medium text-gray-900 dark:text-white">
              {{ getPaymentMethodLabel(order.paymentMethod) }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">{{ t('orders.customer') }}</div>
            <div class="font-medium text-gray-900 dark:text-white">
              {{ order.customerName || order.customer || '—' }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">{{ t('refund.items') }}</div>
            <div class="font-medium text-gray-900 dark:text-white">
              {{ order.items?.length || 0 }} {{ t('refund.itemsLabel') }}
            </div>
          </div>
        </div>
      </UCard>

      <!-- Already Refunded Warning -->
      <UAlert
        v-if="order.status === 'refunded' || order.status === 'cancelled'"
        icon="i-heroicons-exclamation-triangle"
        color="amber"
        variant="subtle"
        :title="t('refund.alreadyProcessed')"
        :description="t('refund.alreadyProcessedDesc')"
      />

      <!-- Refund Type Selection -->
      <UCard v-else>
        <template #header>
          <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('refund.refundType') }}</h3>
        </template>

        <div class="grid grid-cols-3 gap-3">
          <button
            class="p-4 rounded-xl border-2 text-center transition-all"
            :class="refundType === 'full' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
            @click="refundType = 'full'"
          >
            <div class="text-2xl mb-2">💯</div>
            <div class="font-medium text-gray-900 dark:text-white">{{ t('refund.fullRefund') }}</div>
            <div class="text-sm text-gray-500">{{ t('refund.fullRefundDesc') }}</div>
          </button>

          <button
            class="p-4 rounded-xl border-2 text-center transition-all"
            :class="refundType === 'partial' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
            @click="refundType = 'partial'"
          >
            <div class="text-2xl mb-2">📦</div>
            <div class="font-medium text-gray-900 dark:text-white">{{ t('refund.partialRefund') }}</div>
            <div class="text-sm text-gray-500">{{ t('refund.partialRefundDesc') }}</div>
          </button>

          <button
            v-if="canVoidOrders"
            class="p-4 rounded-xl border-2 text-center transition-all"
            :class="refundType === 'void' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
            @click="refundType = 'void'"
          >
            <div class="text-2xl mb-2">🚫</div>
            <div class="font-medium text-gray-900 dark:text-white">{{ t('refund.voidOrder') }}</div>
            <div class="text-sm text-gray-500">{{ t('refund.voidOrderDesc') }}</div>
          </button>
        </div>
      </UCard>

      <!-- Item Selection (for partial refund) -->
      <UCard v-if="refundType === 'partial' && order.status !== 'refunded'">
        <template #header>
          <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('refund.selectItems') }}</h3>
        </template>

        <div class="space-y-3">
          <div
            v-for="(item, index) in order.items"
            :key="index"
            class="flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all"
            :class="selectedItems.get(index)?.selected ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700'"
            @click="toggleItemSelection(index)"
          >
            <UCheckbox
              :model-value="selectedItems.get(index)?.selected"
              @click.stop
              @update:model-value="toggleItemSelection(index)"
            />
            
            <div class="flex-1">
              <div class="font-medium text-gray-900 dark:text-white">
                {{ item.product?.name || 'Unknown Item' }}
              </div>
              <div class="text-sm text-gray-500">
                {{ currency.format(item.total / item.quantity, 'LAK') }} × {{ item.quantity }}
              </div>
            </div>

            <div v-if="selectedItems.get(index)?.selected" class="flex items-center gap-2" @click.stop>
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                icon="i-heroicons-minus"
                :disabled="(selectedItems.get(index)?.quantity || 1) <= 1"
                @click="updateItemQuantity(index, (selectedItems.get(index)?.quantity || 1) - 1)"
              />
              <span class="w-8 text-center font-bold">
                {{ selectedItems.get(index)?.quantity }}
              </span>
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                icon="i-heroicons-plus"
                :disabled="(selectedItems.get(index)?.quantity || 1) >= item.quantity"
                @click="updateItemQuantity(index, (selectedItems.get(index)?.quantity || 1) + 1)"
              />
            </div>

            <div class="text-right">
              <div class="font-bold text-gray-900 dark:text-white">
                {{ currency.format(item.total, 'LAK') }}
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Refund Reason -->
      <UCard v-if="order.status !== 'refunded'">
        <template #header>
          <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('refund.reason') }}</h3>
        </template>

        <div class="space-y-4">
          <USelect
            v-model="refundReason"
            :items="refundReasons"
            value-key="value"
            label-key="label"
            :placeholder="t('refund.selectReason')"
          />

          <UTextarea
            v-if="refundReason === 'other'"
            v-model="customReason"
            :placeholder="t('refund.enterReason')"
            :rows="3"
          />
        </div>
      </UCard>

      <!-- Refund Summary -->
      <UCard v-if="order.status !== 'refunded'" class="bg-gray-50 dark:bg-gray-800/50">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('refund.refundAmount') }}</h3>
            <p class="text-sm text-gray-500">
              {{ refundType === 'void' ? t('refund.voidNote') : t('refund.refundNote') }}
            </p>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold text-red-600 dark:text-red-400">
              -{{ currency.format(refundAmount, 'LAK') }}
            </div>
            <div class="text-sm text-gray-500">
              {{ refundItemsCount }} {{ t('refund.itemsLabel') }}
            </div>
          </div>
        </div>
      </UCard>

      <!-- Action Buttons -->
      <div v-if="order.status !== 'refunded'" class="flex gap-3">
        <UButton
          color="neutral"
          variant="outline"
          class="flex-1"
          @click="router.back()"
        >
          {{ t('common.cancel') }}
        </UButton>
        <UButton
          :color="refundType === 'void' ? 'red' : 'primary'"
          class="flex-1"
          :disabled="!isValidRefund"
          :loading="isProcessing"
          @click="initiateRefund"
        >
          <UIcon :name="refundType === 'void' ? 'i-heroicons-x-circle' : 'i-heroicons-arrow-uturn-left'" class="w-5 h-5 mr-2" />
          {{ refundType === 'void' ? t('refund.confirmVoid') : t('refund.confirmRefund') }}
        </UButton>
      </div>
    </template>

    <!-- PIN Modal -->
    <UModal v-model:open="showPinModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
            {{ t('refund.enterPin') }}
          </h3>

          <div class="space-y-4">
            <UInput
              v-model="pinCode"
              type="password"
              maxlength="6"
              :placeholder="t('refund.pinPlaceholder')"
              class="text-center text-2xl"
              autofocus
            />

            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="outline"
                class="flex-1"
                @click="showPinModal = false"
              >
                {{ t('common.cancel') }}
              </UButton>
              <UButton
                color="primary"
                class="flex-1"
                :disabled="pinCode.length < 4"
                @click="processRefund"
              >
                {{ t('common.confirm') }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
