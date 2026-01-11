<!-- components/pos/DiscountModal.vue -->
<script setup lang="ts">
/**
 * Discount Modal
 * Allows applying percentage or fixed amount discounts to the order
 */

type DiscountType = "percentage" | "fixed";

interface Props {
  open: boolean;
  currentType?: DiscountType;
  currentValue?: number;
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "apply", type: DiscountType, value: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  currentType: "percentage",
  currentValue: 0,
});

const emit = defineEmits<Emits>();

// Local state for discount form
const discountType = ref<DiscountType>("percentage");
const discountValue = ref(0);

// Watch for modal open to sync current values
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      discountType.value = props.currentType;
      discountValue.value = props.currentValue;
    }
  },
  { immediate: true }
);

// Validation
const isValid = computed(() => discountValue.value > 0);

// Apply discount
const handleApply = () => {
  if (!isValid.value) return;

  emit("apply", discountType.value, discountValue.value);
  emit("update:open", false);

  // Reset form
  discountValue.value = 0;
};

// Cancel
const handleCancel = () => {
  emit("update:open", false);
  // Reset form
  discountValue.value = 0;
};

// Get placeholder text based on type
const placeholderText = computed(() => {
  return discountType.value === "percentage" ? "e.g., 10" : "e.g., 5000";
});

// Get label text based on type
const labelText = computed(() => {
  return discountType.value === "percentage" ? "Discount %" : "Discount Amount";
});
</script>

<template>
  <UModal
    :open="open"
    title="Apply Discount"
    description="Apply a discount to the order"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="p-6 bg-white dark:bg-gray-900">
        <h3
          class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
        >
          <span>🏷️</span> Apply Discount
        </h3>

        <div class="space-y-4">
          <!-- Discount Type Selector -->
          <div>
            <label class="block text-sm text-gray-500 dark:text-gray-400 mb-2">
              Discount Type
            </label>
            <div class="flex gap-2">
              <UButton
                :color="discountType === 'percentage' ? 'primary' : 'neutral'"
                :variant="discountType === 'percentage' ? 'solid' : 'outline'"
                block
                @click="discountType = 'percentage'"
              >
                % Percentage
              </UButton>
              <UButton
                :color="discountType === 'fixed' ? 'primary' : 'neutral'"
                :variant="discountType === 'fixed' ? 'solid' : 'outline'"
                block
                @click="discountType = 'fixed'"
              >
                Fixed Amount
              </UButton>
            </div>
          </div>

          <!-- Discount Value Input -->
          <div>
            <label class="block text-sm text-gray-500 dark:text-gray-400 mb-2">
              {{ labelText }}
            </label>
            <UInput
              v-model.number="discountValue"
              type="number"
              :placeholder="placeholderText"
              autofocus
            />
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2 pt-2">
            <UButton
              color="neutral"
              variant="outline"
              block
              @click="handleCancel"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              block
              :disabled="!isValid"
              @click="handleApply"
            >
              Apply
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
