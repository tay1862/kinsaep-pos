<!-- components/pos/ItemNotesModal.vue -->
<script setup lang="ts">
/**
 * Item Notes Modal
 * Allows adding special instructions/notes for cart items (e.g., "no onions", "extra spicy")
 */

interface Props {
  open: boolean;
  initialNotes?: string;
  itemName?: string;
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "save", notes: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialNotes: "",
  itemName: "",
});

const emit = defineEmits<Emits>();

// Local state for notes input
const notesValue = ref("");

// Quick note templates for common requests
const quickNotes = [
  "No ice",
  "Extra spicy",
  "Less sugar",
  "No onions",
  "Gluten free",
  "Vegan",
];

// Watch for modal open to sync initial notes
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      notesValue.value = props.initialNotes;
    }
  },
  { immediate: true }
);

// Add quick note to current notes
const addQuickNote = (quickNote: string) => {
  notesValue.value = notesValue.value
    ? `${notesValue.value}, ${quickNote}`
    : quickNote;
};

// Save notes and close modal
const handleSave = () => {
  emit("save", notesValue.value);
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
    title="Item Notes"
    description="Add special instructions for kitchen"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="p-6 bg-white dark:bg-gray-900">
        <h3
          class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
        >
          <span>📝</span> Item Notes
          <span v-if="itemName" class="text-sm font-normal text-gray-500">
            - {{ itemName }}
          </span>
        </h3>

        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Add special instructions for kitchen (e.g., "no onions", "extra
            spicy", "allergies")
          </p>

          <UTextarea
            v-model="notesValue"
            placeholder="Enter notes for this item..."
            :rows="3"
            autofocus
            class="w-full"
          />

          <!-- Quick Notes -->
          <div>
            <p class="text-xs text-gray-500 mb-2">Quick notes:</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="quickNote in quickNotes"
                :key="quickNote"
                class="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                @click="addQuickNote(quickNote)"
              >
                {{ quickNote }}
              </button>
            </div>
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
            <UButton color="primary" block @click="handleSave">
              Save Notes
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
