<!-- components/products/PromotionDeleteModal.vue -->
<script setup lang="ts">
import type { Promotion } from "~/types";

interface Props {
  modelValue: boolean;
  promotion: Promotion | null;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  confirm: [promotion: Promotion];
}>();

const { t } = useI18n();

// Computed for v-model binding
const isVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

// Confirmation handler
function handleConfirm() {
  if (props.promotion) {
    emit("confirm", props.promotion);
  }
}

// Cancel handler
function handleCancel() {
  isVisible.value = false;
}
</script>

<template>
  <UModal v-model:open="isVisible" @update:model-value="handleCancel">
    <template #header>
      <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">
        {{ t("common.confirmDelete") }}
      </h3>
    </template>

    <template #body>
      <p class="text-gray-600 dark:text-gray-400">
        {{
          t("promotions.deleteConfirmation", {
            name: promotion?.name || t("common.unnamed", "Unnamed Promotion"),
          })
        }}
      </p>

      <!-- Warning details -->
      <div
        v-if="promotion"
        class="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
      >
        <div class="flex items-start gap-2">
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5"
          />
          <div class="text-sm text-yellow-800 dark:text-yellow-200">
            <p class="font-medium">{{ t("common.warning", "Warning") }}</p>
            <p>
              {{
                t(
                  "promotions.deleteWarning",
                  "This action cannot be undone. This will permanently remove the promotion and all its usage data."
                )
              }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          color="gray"
          variant="outline"
          :label="t('common.cancel')"
          :disabled="isLoading"
          @click="handleCancel"
        />
        <UButton
          color="red"
          :label="t('common.delete')"
          :loading="isLoading"
          @click="handleConfirm"
        />
      </div>
    </template>
  </UModal>
</template>
