<script setup lang="ts">
/**
 * 📝 Customer Notes Card Component
 * Displays customer notes with view/edit modes
 */

interface Props {
  notes?: string;
  isEditing: boolean;
}

defineProps<Props>();

const editNotes = defineModel<string>("editNotes", { default: "" });

const { t } = useI18n();
</script>

<template>
  <UCard class="lg:col-span-2">
    <template #header>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        {{ t("common.notes") }}
      </h3>
    </template>

    <!-- View Mode -->
    <div v-if="!isEditing">
      <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
        {{ notes || t("customers.noNotes", "No notes") }}
      </p>
    </div>

    <!-- Edit Mode -->
    <div v-else>
      <UTextarea
        v-model="editNotes"
        :rows="4"
        :placeholder="t('customers.notesPlaceholder', 'Add notes...')"
      />
    </div>
  </UCard>
</template>
