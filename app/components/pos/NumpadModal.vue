<!-- components/pos/NumpadModal.vue -->
<script setup lang="ts">
/**
 * Numpad Modal
 * Numeric keypad for entering quantities in POS
 */

interface Props {
  open: boolean;
  initialValue?: number;
  title?: string;
  description?: string;
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "confirm", value: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialValue: 0,
  title: "Enter Quantity",
  description: "Enter the quantity of the item",
});

const emit = defineEmits<Emits>();

// Local state for numpad display value
const displayValue = ref("");

// Numpad keys layout
const numpadKeys = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "C",
  "0",
  "DEL",
];

// Watch for modal open to sync initial value
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      displayValue.value = props.initialValue.toString();
    }
  },
  { immediate: true }
);

// Handle numpad key press
const handleKeyPress = (key: string) => {
  if (key === "C") {
    // Clear all
    displayValue.value = "";
  } else if (key === "DEL") {
    // Delete last digit
    displayValue.value = displayValue.value.slice(0, -1);
  } else {
    // Append digit
    displayValue.value += key;
  }
};

// Confirm and emit the value
const handleConfirm = () => {
  const qty = parseInt(displayValue.value) || 0;
  emit("confirm", qty);
  emit("update:open", false);
};

// Get button styling based on key type
const getButtonClass = (key: string) => {
  if (key === "C") {
    return "bg-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-500/30";
  } else if (key === "DEL") {
    return "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600";
  } else {
    return "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700";
  }
};
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :description="description"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="p-6 bg-white dark:bg-gray-900">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {{ title }}
        </h3>

        <!-- Display -->
        <div
          class="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-4 text-center"
        >
          <span class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ displayValue || "0" }}
          </span>
        </div>

        <!-- Numpad Grid -->
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="key in numpadKeys"
            :key="key"
            class="h-14 rounded-xl font-bold text-lg transition-colors"
            :class="getButtonClass(key)"
            @click="handleKeyPress(key)"
          >
            {{ key }}
          </button>
        </div>

        <!-- Confirm Button -->
        <UButton
          block
          size="lg"
          color="primary"
          class="mt-4"
          @click="handleConfirm"
        >
          Confirm
        </UButton>
      </div>
    </template>
  </UModal>
</template>
