<!-- components/pos/CustomItemModal.vue -->
<script setup lang="ts">
/**
 * Custom Item Modal
 * Allows adding custom-priced items to the cart that aren't in the product catalog
 */

interface Props {
  open: boolean;
  currency?: string;
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "add", item: { name: string; price: number }): void;
}

const props = withDefaults(defineProps<Props>(), {
  currency: "LAK",
});

const emit = defineEmits<Emits>();

// Local state for form inputs
const itemName = ref("");
const itemPrice = ref(0);

// Watch for modal open to reset form
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      itemName.value = "";
      itemPrice.value = 0;
    }
  }
);

// Form validation
const isValid = computed(() => {
  return itemName.value.trim().length > 0 && itemPrice.value > 0;
});

// Add custom item to cart
const handleAdd = () => {
  if (!isValid.value) return;

  emit("add", {
    name: itemName.value.trim(),
    price: itemPrice.value,
  });

  emit("update:open", false);
};

// Cancel and close modal
const handleCancel = () => {
  emit("update:open", false);
};
</script>

<template>
  <UModal
    :open="open"
    title="Add Custom Item"
    description="Add a custom item to the cart"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="p-6 bg-white dark:bg-gray-900">
        <h3
          class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
        >
          <span>📦</span> Add Custom Item
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-500 dark:text-gray-400 mb-2">
              Item Name
            </label>
            <UInput
              v-model="itemName"
              placeholder="e.g., Special Order"
              class="w-full"
              autofocus
            />
          </div>

          <div>
            <label class="block text-sm text-gray-500 dark:text-gray-400 mb-2">
              Price ({{ currency }})
            </label>
            <UInput
              v-model.number="itemPrice"
              type="number"
              placeholder="e.g., 50000"
            />
          </div>

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
              @click="handleAdd"
            >
              Add to Cart
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
