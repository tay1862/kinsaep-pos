<!-- components/tables/RoomCheckoutModal.vue -->
<!-- 🚪 Room Checkout - Calculate billing and close room session -->
<script setup lang="ts">
import type { Table } from '~/composables/use-tables';

const props = defineProps<{
  table: Table | null;
}>();

const emit = defineEmits<{
  (e: 'checkout', data: { tableId: string; roomCharge: number }): void;
  (e: 'extend', data: { tableId: string; minutes: number }): void;
}>();

const open = defineModel<boolean>('open', { default: false });

const { t, locale } = useI18n();
const roomTimer = useRoomTimer();
const { format: formatCurrency } = useCurrency();

const isLaoLocale = computed(() => locale.value.startsWith('lo'));

// Calculate checkout data
const checkoutData = computed(() => {
  if (!props.table) return null;
  return roomTimer.calculateCheckout(props.table);
});

// Format start time
const startTime = computed(() => {
  if (!props.table?.occupiedAt) return '--:--';
  return roomTimer.formatTime(props.table.occupiedAt);
});

// Current time
const currentTime = computed(() => {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});

// Handle checkout
function handleCheckout() {
  if (!props.table || !checkoutData.value) return;
  
  emit('checkout', {
    tableId: props.table.id,
    roomCharge: checkoutData.value.roomCharge,
  });
  
  open.value = false;
}

// Handle extend time
function handleExtend(minutes: number) {
  if (!props.table) return;
  
  emit('extend', {
    tableId: props.table.id,
    minutes,
  });
}
</script>

<template>
  <UModal v-model:open="open">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <span class="text-2xl">🚪</span>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ table?.name || `${t('pos.tables.room')} ${table?.number}` }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('pos.tables.checkout', 'Room Checkout') }}
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div v-if="table && checkoutData" class="space-y-6">
        <!-- Time Info -->
        <div class="grid grid-cols-3 gap-4 text-center">
          <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ t('pos.tables.startTime', 'Start') }}
            </p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">
              {{ startTime }}
            </p>
          </div>
          <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ t('pos.tables.endTime', 'End') }}
            </p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">
              {{ currentTime }}
            </p>
          </div>
          <div class="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
            <p class="text-xs text-primary-600 dark:text-primary-400">
              {{ t('pos.tables.duration', 'Duration') }}
            </p>
            <p class="text-lg font-bold text-primary-700 dark:text-primary-300">
              {{ checkoutData.durationFormatted }}
            </p>
          </div>
        </div>

        <!-- Extend Time Buttons -->
        <div class="flex gap-2">
          <UButton
            variant="soft"
            color="primary"
            size="sm"
            icon="i-heroicons-plus"
            @click="handleExtend(30)"
          >
            +30m
          </UButton>
          <UButton
            variant="soft"
            color="primary"
            size="sm"
            icon="i-heroicons-plus"
            @click="handleExtend(60)"
          >
            +1hr
          </UButton>
          <UButton
            variant="soft"
            color="primary"
            size="sm"
            icon="i-heroicons-plus"
            @click="handleExtend(120)"
          >
            +2hr
          </UButton>
        </div>

        <!-- Billing Breakdown -->
        <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500 dark:text-gray-400">
              {{ t('pos.tables.hourlyRate', 'Rate per hour') }}
            </span>
            <span class="text-gray-900 dark:text-white">
              {{ formatCurrency(checkoutData.hourlyRate) }}
            </span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500 dark:text-gray-400">
              {{ t('pos.tables.minimumHours', 'Minimum') }}
            </span>
            <span class="text-gray-900 dark:text-white">
              {{ checkoutData.minimumHours }} {{ t('common.hours', 'hours') }}
            </span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500 dark:text-gray-400">
              {{ t('pos.tables.billedHours', 'Billed hours') }}
            </span>
            <span class="text-gray-900 dark:text-white font-medium">
              {{ checkoutData.billedHours }} {{ t('common.hours', 'hours') }}
            </span>
          </div>
          <div class="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
            <span class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('pos.tables.roomCharge', 'Room Charge') }}
            </span>
            <span class="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {{ formatCurrency(checkoutData.roomCharge) }}
            </span>
          </div>
        </div>

        <!-- Note -->
        <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <p class="text-sm text-blue-700 dark:text-blue-300">
            <UIcon name="i-heroicons-information-circle" class="w-4 h-4 inline mr-1" />
            {{ t('pos.tables.checkoutNote', 'Room charge will be added to the order.') }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton variant="ghost" @click="open = false">
          {{ t('common.cancel') }}
        </UButton>
        <UButton
          color="primary"
          icon="i-heroicons-check"
          size="lg"
          @click="handleCheckout"
        >
          {{ t('pos.tables.confirmCheckout', 'Checkout & Add to Bill') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
