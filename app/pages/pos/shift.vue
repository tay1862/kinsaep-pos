<!-- pages/pos/shift.vue -->
<!-- 💰 Shift/Cash Register Management - Essential for Enterprise POS -->
<script setup lang="ts">
import type { POSSession, PaymentMethod } from '~/types';

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});

const { t } = useI18n();
const toast = useToast();
const router = useRouter();
const pos = usePOS();
const currency = useCurrency();
const ordersStore = useOrders();

// ============================================
// State
// ============================================
const activeShift = ref<POSSession | null>(null);
const shiftHistory = ref<POSSession[]>([]);
const isLoading = ref(false);
const showOpenShiftModal = ref(false);
const showCloseShiftModal = ref(false);
const showCashCountModal = ref(false);

// Open shift form
const openShiftForm = ref({
  openingBalance: 0,
  notes: '',
});

// Cash count form (denominations for LAK)
const cashDenominations = ref([
  { value: 100000, label: '100,000 ₭', count: 0 },
  { value: 50000, label: '50,000 ₭', count: 0 },
  { value: 20000, label: '20,000 ₭', count: 0 },
  { value: 10000, label: '10,000 ₭', count: 0 },
  { value: 5000, label: '5,000 ₭', count: 0 },
  { value: 2000, label: '2,000 ₭', count: 0 },
  { value: 1000, label: '1,000 ₭', count: 0 },
  { value: 500, label: '500 ₭', count: 0 },
]);

// Closing shift data
const closeShiftForm = ref({
  countedCash: 0,
  notes: '',
});

// ============================================
// Computed
// ============================================
const isShiftActive = computed(() => activeShift.value?.status === 'active');

const shiftDuration = computed(() => {
  if (!activeShift.value?.startedAt) return '0h 0m';
  const start = new Date(activeShift.value.startedAt);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
});

const expectedCash = computed(() => {
  if (!activeShift.value) return 0;
  return (activeShift.value.openingBalance || 0) + (activeShift.value.cashSales || 0);
});

const cashDifference = computed(() => {
  return closeShiftForm.value.countedCash - expectedCash.value;
});

const totalCashCount = computed(() => {
  return cashDenominations.value.reduce((sum, denom) => sum + (denom.value * denom.count), 0);
});

const shiftSummary = computed(() => {
  if (!activeShift.value) {
    return {
      totalSales: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      cashSales: 0,
      lightningSales: 0,
      cardSales: 0,
      otherSales: 0,
      voids: 0,
      refunds: 0,
      discounts: 0,
    };
  }

  // Get orders from current shift
  const shiftOrders = ordersStore.orders.value.filter(o => {
    if (!activeShift.value?.startedAt) return false;
    const orderDate = new Date(o.date);
    const shiftStart = new Date(activeShift.value.startedAt);
    return orderDate >= shiftStart && o.status === 'completed';
  });

  const totalSales = shiftOrders.reduce((sum, o) => sum + o.total, 0);
  const cashSales = shiftOrders
    .filter(o => o.paymentMethod === 'cash')
    .reduce((sum, o) => sum + o.total, 0);
  const lightningSales = shiftOrders
    .filter(o => ['lightning', 'bolt12', 'lnurl'].includes(o.paymentMethod || ''))
    .reduce((sum, o) => sum + o.total, 0);
  const cardSales = shiftOrders
    .filter(o => o.paymentMethod === 'card')
    .reduce((sum, o) => sum + o.total, 0);

  return {
    totalSales,
    totalOrders: shiftOrders.length,
    avgOrderValue: shiftOrders.length > 0 ? totalSales / shiftOrders.length : 0,
    cashSales,
    lightningSales,
    cardSales,
    otherSales: totalSales - cashSales - lightningSales - cardSales,
    voids: 0,
    refunds: 0,
    discounts: 0,
  };
});

// ============================================
// Methods
// ============================================
const openShift = async () => {
  if (openShiftForm.value.openingBalance < 0) {
    toast.add({
      title: t('pos.shift.invalidAmount'),
      color: 'red',
    });
    return;
  }

  isLoading.value = true;

  try {
    const newShift: POSSession = {
      id: `SHIFT-${Date.now()}`,
      branchId: 'main',
      staffId: 'current-user', // TODO: Get from auth
      startedAt: new Date().toISOString(),
      openingBalance: openShiftForm.value.openingBalance,
      totalSales: 0,
      totalOrders: 0,
      cashSales: 0,
      lightningSales: 0,
      status: 'active',
    };

    activeShift.value = newShift;
    
    // Start POS session
    pos.startSession('main', 'current-user', openShiftForm.value.openingBalance);

    // Save to local storage
    localStorage.setItem('activeShift', JSON.stringify(newShift));

    showOpenShiftModal.value = false;
    openShiftForm.value = { openingBalance: 0, notes: '' };

    toast.add({
      title: t('pos.shift.opened'),
      description: t('pos.shift.openedDesc'),
      color: 'green',
    });
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: String(error),
      color: 'red',
    });
  } finally {
    isLoading.value = false;
  }
};

const closeShift = async () => {
  if (!activeShift.value) return;

  isLoading.value = true;

  try {
    const closedShift: POSSession = {
      ...activeShift.value,
      endedAt: new Date().toISOString(),
      closingBalance: closeShiftForm.value.countedCash,
      totalSales: shiftSummary.value.totalSales,
      totalOrders: shiftSummary.value.totalOrders,
      cashSales: shiftSummary.value.cashSales,
      lightningSales: shiftSummary.value.lightningSales,
      status: 'closed',
    };

    // Add to history
    shiftHistory.value.unshift(closedShift);

    // Save history
    const savedHistory = JSON.parse(localStorage.getItem('shiftHistory') || '[]');
    savedHistory.unshift(closedShift);
    localStorage.setItem('shiftHistory', JSON.stringify(savedHistory.slice(0, 100)));

    // Clear active shift
    activeShift.value = null;
    localStorage.removeItem('activeShift');

    // End POS session
    pos.endSession();

    showCloseShiftModal.value = false;
    closeShiftForm.value = { countedCash: 0, notes: '' };
    resetCashCount();

    toast.add({
      title: t('pos.shift.closed'),
      description: t('pos.shift.closedDesc'),
      color: 'green',
    });
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: String(error),
      color: 'red',
    });
  } finally {
    isLoading.value = false;
  }
};

const applyCashCount = () => {
  closeShiftForm.value.countedCash = totalCashCount.value;
  showCashCountModal.value = false;
};

const resetCashCount = () => {
  cashDenominations.value.forEach(d => d.count = 0);
};

const printShiftReport = () => {
  // TODO: Implement print
  window.print();
};

const goToPOS = () => {
  router.push('/pos');
};

// ============================================
// Lifecycle
// ============================================
onMounted(async () => {
  // Load active shift
  const savedShift = localStorage.getItem('activeShift');
  if (savedShift) {
    activeShift.value = JSON.parse(savedShift);
  }

  // Load shift history
  const savedHistory = localStorage.getItem('shiftHistory');
  if (savedHistory) {
    shiftHistory.value = JSON.parse(savedHistory);
  }

  // Initialize orders
  await ordersStore.init();
});
</script>

<template>
  <div class="space-y-6 p-6">
    <!-- Header -->
    <CommonPageHeader
      :title="t('pos.shift.title')"
      :description="t('pos.shift.description')"
    >
      <template #right>
        <div class="flex gap-2">
          <UButton
            v-if="isShiftActive"
            icon="i-heroicons-shopping-cart"
            color="primary"
            @click="goToPOS"
          >
            {{ t('pos.shift.goToPOS') }}
          </UButton>
        </div>
      </template>
    </CommonPageHeader>

    <!-- Active Shift Status Card -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Shift Status -->
      <div class="lg:col-span-2">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  :class="isShiftActive ? 'bg-green-500/20' : 'bg-gray-200 dark:bg-gray-700'"
                >
                  {{ isShiftActive ? '🟢' : '⚪' }}
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ isShiftActive ? t('pos.shift.activeShift') : t('pos.shift.noActiveShift') }}
                  </h3>
                  <p v-if="isShiftActive && activeShift" class="text-sm text-gray-500">
                    {{ t('pos.shift.startedAt') }}: {{ new Date(activeShift.startedAt).toLocaleString() }}
                  </p>
                </div>
              </div>
              <UBadge
                :color="isShiftActive ? 'green' : 'gray'"
                variant="soft"
                size="lg"
              >
                {{ isShiftActive ? t('pos.shift.active') : t('pos.shift.closed') }}
              </UBadge>
            </div>
          </template>

          <!-- No Active Shift -->
          <div v-if="!isShiftActive" class="text-center py-12">
            <div class="text-6xl mb-4">🏪</div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {{ t('pos.shift.startDay') }}
            </h3>
            <p class="text-gray-500 mb-6 max-w-md mx-auto">
              {{ t('pos.shift.startDayDesc') }}
            </p>
            <UButton
              size="lg"
              color="primary"
              icon="i-heroicons-play"
              @click="showOpenShiftModal = true"
            >
              {{ t('pos.shift.openShift') }}
            </UButton>
          </div>

          <!-- Active Shift Summary -->
          <div v-else class="space-y-6">
            <!-- Shift Info -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                <div class="text-2xl mb-1">⏱️</div>
                <div class="text-xl font-bold text-gray-900 dark:text-white">{{ shiftDuration }}</div>
                <div class="text-sm text-gray-500">{{ t('pos.shift.duration') }}</div>
              </div>
              <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                <div class="text-2xl mb-1">📋</div>
                <div class="text-xl font-bold text-gray-900 dark:text-white">{{ shiftSummary.totalOrders }}</div>
                <div class="text-sm text-gray-500">{{ t('pos.shift.orders') }}</div>
              </div>
              <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                <div class="text-2xl mb-1">💰</div>
                <div class="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {{ currency.format(shiftSummary.totalSales, 'LAK') }}
                </div>
                <div class="text-sm text-gray-500">{{ t('pos.shift.totalSales') }}</div>
              </div>
              <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                <div class="text-2xl mb-1">📊</div>
                <div class="text-xl font-bold text-gray-900 dark:text-white">
                  {{ currency.format(shiftSummary.avgOrderValue, 'LAK') }}
                </div>
                <div class="text-sm text-gray-500">{{ t('pos.shift.avgOrder') }}</div>
              </div>
            </div>

            <!-- Payment Breakdown -->
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('pos.shift.paymentBreakdown') }}</h4>
              <div class="space-y-2">
                <div class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div class="flex items-center gap-2">
                    <span>💵</span>
                    <span class="text-gray-900 dark:text-white">{{ t('payment.methods.cash') }}</span>
                  </div>
                  <span class="font-bold text-green-600 dark:text-green-400">
                    {{ currency.format(shiftSummary.cashSales, 'LAK') }}
                  </span>
                </div>
                <div class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div class="flex items-center gap-2">
                    <span>⚡</span>
                    <span class="text-gray-900 dark:text-white">{{ t('payment.methods.lightning') }}</span>
                  </div>
                  <span class="font-bold text-amber-600 dark:text-amber-400">
                    {{ currency.format(shiftSummary.lightningSales, 'LAK') }}
                  </span>
                </div>
                <div class="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div class="flex items-center gap-2">
                    <span>💳</span>
                    <span class="text-gray-900 dark:text-white">{{ t('payment.methods.card') }}</span>
                  </div>
                  <span class="font-bold text-blue-600 dark:text-blue-400">
                    {{ currency.format(shiftSummary.cardSales, 'LAK') }}
                  </span>
                </div>
                <div v-if="shiftSummary.otherSales > 0" class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div class="flex items-center gap-2">
                    <span>📱</span>
                    <span class="text-gray-900 dark:text-white">{{ t('payment.methods.other') }}</span>
                  </div>
                  <span class="font-bold text-gray-600 dark:text-gray-400">
                    {{ currency.format(shiftSummary.otherSales, 'LAK') }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Cash Drawer -->
            <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <h4 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('pos.shift.cashDrawer') }}</h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <div class="text-sm text-gray-500">{{ t('pos.shift.openingBalance') }}</div>
                  <div class="text-lg font-bold text-gray-900 dark:text-white">
                    {{ currency.format(activeShift?.openingBalance || 0, 'LAK') }}
                  </div>
                </div>
                <div>
                  <div class="text-sm text-gray-500">{{ t('pos.shift.expectedCash') }}</div>
                  <div class="text-lg font-bold text-green-600 dark:text-green-400">
                    {{ currency.format(expectedCash, 'LAK') }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <UButton
                color="neutral"
                variant="soft"
                icon="i-heroicons-printer"
                @click="printShiftReport"
              >
                {{ t('pos.shift.printReport') }}
              </UButton>
              <UButton
                color="red"
                variant="soft"
                icon="i-heroicons-x-circle"
                @click="showCloseShiftModal = true"
              >
                {{ t('pos.shift.closeShift') }}
              </UButton>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Quick Actions -->
      <div class="space-y-4">
        <UCard>
          <template #header>
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('pos.shift.quickActions') }}</h3>
          </template>

          <div class="space-y-2">
            <UButton
              block
              color="neutral"
              variant="soft"
              icon="i-heroicons-calculator"
              :disabled="!isShiftActive"
              @click="showCashCountModal = true"
            >
              {{ t('pos.shift.countCash') }}
            </UButton>
            <UButton
              block
              color="neutral"
              variant="soft"
              icon="i-heroicons-document-text"
              :disabled="!isShiftActive"
              @click="printShiftReport"
            >
              {{ t('pos.shift.xReport') }}
            </UButton>
            <UButton
              block
              color="neutral"
              variant="soft"
              icon="i-heroicons-banknotes"
              :disabled="!isShiftActive"
            >
              {{ t('pos.shift.payIn') }}
            </UButton>
            <UButton
              block
              color="neutral"
              variant="soft"
              icon="i-heroicons-arrow-right-on-rectangle"
              :disabled="!isShiftActive"
            >
              {{ t('pos.shift.payOut') }}
            </UButton>
          </div>
        </UCard>

        <!-- Recent Shifts -->
        <UCard>
          <template #header>
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('pos.shift.recentShifts') }}</h3>
          </template>

          <div v-if="shiftHistory.length === 0" class="text-center py-4 text-gray-500">
            {{ t('pos.shift.noHistory') }}
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="shift in shiftHistory.slice(0, 5)"
              :key="shift.id"
              class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <div class="flex justify-between items-start mb-1">
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ new Date(shift.startedAt).toLocaleDateString() }}
                </span>
                <UBadge color="gray" variant="soft" size="xs">
                  {{ shift.totalOrders }} orders
                </UBadge>
              </div>
              <div class="text-sm text-amber-600 dark:text-amber-400 font-medium">
                {{ currency.format(shift.totalSales, 'LAK') }}
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Open Shift Modal -->
    <UModal v-model:open="showOpenShiftModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span>🏪</span> {{ t('pos.shift.openShift') }}
          </h3>

          <div class="space-y-4">
            <UFormField :label="t('pos.shift.openingBalance')" required>
              <UInput
                v-model.number="openShiftForm.openingBalance"
                type="number"
                :placeholder="t('pos.shift.enterAmount')"
                icon="i-heroicons-banknotes"
              />
              <template #hint>
                {{ t('pos.shift.openingBalanceHint') }}
              </template>
            </UFormField>

            <UFormField :label="t('pos.shift.notes')">
              <UTextarea
                v-model="openShiftForm.notes"
                :placeholder="t('pos.shift.notesPlaceholder')"
                :rows="2"
              />
            </UFormField>

            <div class="flex gap-2 pt-4">
              <UButton
                color="neutral"
                variant="outline"
                class="flex-1"
                @click="showOpenShiftModal = false"
              >
                {{ t('common.cancel') }}
              </UButton>
              <UButton
                color="primary"
                class="flex-1"
                :loading="isLoading"
                @click="openShift"
              >
                {{ t('pos.shift.startShift') }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Close Shift Modal -->
    <UModal v-model:open="showCloseShiftModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900 max-w-lg">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span>🔒</span> {{ t('pos.shift.closeShift') }}
          </h3>

          <div class="space-y-6">
            <!-- Shift Summary -->
            <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <h4 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('pos.shift.shiftSummary') }}</h4>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span class="text-gray-500">{{ t('pos.shift.totalSales') }}</span>
                  <div class="font-bold text-amber-600">{{ currency.format(shiftSummary.totalSales, 'LAK') }}</div>
                </div>
                <div>
                  <span class="text-gray-500">{{ t('pos.shift.totalOrders') }}</span>
                  <div class="font-bold text-gray-900 dark:text-white">{{ shiftSummary.totalOrders }}</div>
                </div>
                <div>
                  <span class="text-gray-500">{{ t('pos.shift.cashSales') }}</span>
                  <div class="font-bold text-green-600">{{ currency.format(shiftSummary.cashSales, 'LAK') }}</div>
                </div>
                <div>
                  <span class="text-gray-500">{{ t('pos.shift.expectedCash') }}</span>
                  <div class="font-bold text-gray-900 dark:text-white">{{ currency.format(expectedCash, 'LAK') }}</div>
                </div>
              </div>
            </div>

            <!-- Cash Count -->
            <UFormField :label="t('pos.shift.countedCash')" required>
              <div class="flex gap-2">
                <UInput
                  v-model.number="closeShiftForm.countedCash"
                  type="number"
                  :placeholder="t('pos.shift.enterAmount')"
                  class="flex-1"
                />
                <UButton
                  color="neutral"
                  variant="soft"
                  icon="i-heroicons-calculator"
                  @click="showCashCountModal = true"
                >
                  {{ t('pos.shift.count') }}
                </UButton>
              </div>
            </UFormField>

            <!-- Cash Difference -->
            <div
              v-if="closeShiftForm.countedCash > 0"
              class="p-4 rounded-xl"
              :class="cashDifference === 0 ? 'bg-green-50 dark:bg-green-900/20' : cashDifference > 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'"
            >
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-300">{{ t('pos.shift.difference') }}</span>
                <span
                  class="text-xl font-bold"
                  :class="cashDifference === 0 ? 'text-green-600' : cashDifference > 0 ? 'text-blue-600' : 'text-red-600'"
                >
                  {{ cashDifference >= 0 ? '+' : '' }}{{ currency.format(cashDifference, 'LAK') }}
                </span>
              </div>
              <p class="text-sm mt-1" :class="cashDifference === 0 ? 'text-green-600' : cashDifference > 0 ? 'text-blue-600' : 'text-red-600'">
                {{ cashDifference === 0 ? t('pos.shift.balanced') : cashDifference > 0 ? t('pos.shift.overage') : t('pos.shift.shortage') }}
              </p>
            </div>

            <UFormField :label="t('pos.shift.notes')">
              <UTextarea
                v-model="closeShiftForm.notes"
                :placeholder="t('pos.shift.closeNotesPlaceholder')"
                :rows="2"
              />
            </UFormField>

            <div class="flex gap-2 pt-4">
              <UButton
                color="neutral"
                variant="outline"
                class="flex-1"
                @click="showCloseShiftModal = false"
              >
                {{ t('common.cancel') }}
              </UButton>
              <UButton
                color="red"
                class="flex-1"
                :loading="isLoading"
                @click="closeShift"
              >
                {{ t('pos.shift.confirmClose') }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Cash Count Modal -->
    <UModal v-model:open="showCashCountModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span>🧮</span> {{ t('pos.shift.cashCount') }}
          </h3>

          <div class="space-y-3">
            <div
              v-for="denom in cashDenominations"
              :key="denom.value"
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <span class="font-medium text-gray-900 dark:text-white">{{ denom.label }}</span>
              <div class="flex items-center gap-3">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="soft"
                  icon="i-heroicons-minus"
                  :disabled="denom.count <= 0"
                  @click="denom.count--"
                />
                <span class="w-12 text-center font-bold text-gray-900 dark:text-white">
                  {{ denom.count }}
                </span>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="soft"
                  icon="i-heroicons-plus"
                  @click="denom.count++"
                />
                <span class="w-32 text-right text-gray-500">
                  = {{ currency.format(denom.value * denom.count, 'LAK') }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <div class="flex justify-between items-center">
              <span class="font-medium text-gray-900 dark:text-white">{{ t('pos.shift.total') }}</span>
              <span class="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {{ currency.format(totalCashCount, 'LAK') }}
              </span>
            </div>
          </div>

          <div class="flex gap-2 pt-6">
            <UButton
              color="neutral"
              variant="outline"
              class="flex-1"
              @click="resetCashCount"
            >
              {{ t('common.reset') }}
            </UButton>
            <UButton
              color="primary"
              class="flex-1"
              @click="applyCashCount"
            >
              {{ t('pos.shift.applyCount') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
