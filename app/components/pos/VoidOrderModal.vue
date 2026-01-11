<!-- components/pos/VoidOrderModal.vue -->
<script setup lang="ts">
/**
 * Void/Cancel Order Modal
 * Allows cancelling orders with optional reason
 * Syncs cancellation across all devices
 */

interface Props {
  open: boolean;
  orderId?: string;
  orderNumber?: string | number;
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "confirm", orderId: string, reason: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();

// Local state
const reason = ref("");
const isProcessing = ref(false);

// Predefined reasons
const commonReasons = [
  { label: t("pos.void_reasons.customer_request"), value: "customer_request" },
  { label: t("pos.void_reasons.wrong_order"), value: "wrong_order" },
  { label: t("pos.void_reasons.duplicate"), value: "duplicate" },
  { label: t("pos.void_reasons.kitchen_error"), value: "kitchen_error" },
  { label: t("pos.void_reasons.out_of_stock"), value: "out_of_stock" },
  { label: t("pos.void_reasons.other"), value: "other" },
];

// Reset when modal opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      reason.value = "";
      isProcessing.value = false;
    }
  }
);

// Handle confirmation
const handleConfirm = async () => {
  if (!props.orderId) return;

  isProcessing.value = true;

  try {
    emit("confirm", props.orderId, reason.value || "No reason provided");
    emit("update:open", false);
  } finally {
    isProcessing.value = false;
  }
};

// Handle cancel
const handleCancel = () => {
  emit("update:open", false);
  reason.value = "";
};

// Quick select reason
const selectReason = (reasonValue: string) => {
  const selected = commonReasons.find((r) => r.value === reasonValue);
  if (selected) {
    reason.value = selected.label;
  }
};
</script>

<template>
  <UModal
    :open="open"
    :title="t('pos.void_order')"
    :description="
      t('pos.void_order_desc', {
        orderNumber: orderNumber || orderId?.slice(-8),
      })
    "
    @update:open="(val) => emit('update:open', val)"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Warning Message -->
        <div
          class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800"
        >
          <div class="flex items-start gap-3">
            <Icon
              name="heroicons:exclamation-triangle"
              class="w-5 h-5 text-red-600 dark:text-red-400 flex-0 mt-0.5"
            />
            <div class="flex-1">
              <p class="text-sm font-medium text-red-800 dark:text-red-200">
                {{ t("pos.void_order_warning") }}
              </p>
              <p class="text-xs text-red-600 dark:text-red-300 mt-1">
                {{ t("pos.void_order_warning_desc") }}
              </p>
            </div>
          </div>
        </div>

        <!-- Quick Reason Selection -->
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {{ t("pos.void_reason") }}
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="r in commonReasons"
              :key="r.value"
              type="button"
              :class="[
                'px-3 py-2 text-sm rounded-lg border transition-colors text-left',
                reason === r.label
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
              ]"
              @click="selectReason(r.value)"
            >
              {{ r.label }}
            </button>
          </div>
        </div>

        <!-- Custom Reason Input -->
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {{ t("pos.custom_reason") }} {{ t("common.optional") }}
          </label>
          <UTextarea
            v-model="reason"
            :placeholder="t('pos.void_reason_placeholder')"
            :rows="3"
            class="w-full"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex w-full gap-3 pt-4">
          <UButton
            variant="outline"
            color="gray"
            block
            :disabled="isProcessing"
            @click="handleCancel"
          >
            {{ t("common.cancel") }}
          </UButton>
          <UButton
            color="red"
            block
            :loading="isProcessing"
            @click="handleConfirm"
          >
            <Icon name="heroicons:trash" class="w-4 h-4 mr-2" />
            {{ t("pos.void_order") }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
