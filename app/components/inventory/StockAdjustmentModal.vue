<!-- components/inventory/StockAdjustmentModal.vue -->
<script setup lang="ts">
interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  unitSymbol: string;
  branchId: string;
  branchName: string;
}

interface Props {
  item: InventoryItem | null;
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
});

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  save: [
    data: {
      quantity: number;
      type: "in" | "out" | "adjustment";
      reason: string;
    }
  ];
}>();

const { t } = useI18n();

const adjustmentForm = ref({
  quantity: 0,
  type: "adjustment" as "in" | "out" | "adjustment",
  reason: "",
});

// Reset form when modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    adjustmentForm.value = { quantity: 0, type: "adjustment", reason: "" };
  }
});

const handleSave = () => {
  emit("save", { ...adjustmentForm.value });
};

const adjustmentTypeOptions = computed(() => [
  { value: "in", label: t("inventory.stockIn") },
  { value: "out", label: t("inventory.stockOut") },
  { value: "adjustment", label: t("inventory.adjustment") },
]);
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard v-if="item">
        <template #header>
          <h3 class="text-lg font-medium">{{ t("inventory.adjustStock") }}</h3>
        </template>

        <div class="space-y-4">
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p class="font-medium">{{ item.productName }}</p>
            <p class="text-sm text-gray-500">
              {{ t("inventory.currentStock") }}: {{ item.currentStock }}
              {{ item.unitSymbol }}
            </p>
          </div>

          <UFormField :label="t('inventory.adjustmentType')">
            <USelect
              v-model="adjustmentForm.type"
              :items="adjustmentTypeOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('inventory.quantity')">
            <UInput
              v-model.number="adjustmentForm.quantity"
              type="number"
              min="0"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('inventory.reason')">
            <UTextarea
              v-model="adjustmentForm.reason"
              :rows="2"
              class="w-full"
            />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="gray"
              variant="outline"
              :label="t('common.cancel')"
              @click="open = false"
            />
            <UButton
              color="primary"
              :loading="loading"
              :label="t('common.save')"
              @click="handleSave"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
