<!-- components/inventory/StockTransferModal.vue -->
<script setup lang="ts">
interface Branch {
  id: string;
  name: string;
}

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
  branches: Branch[];
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
});

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  save: [data: { quantity: number; toBranch: string; notes: string }];
}>();

const { t } = useI18n();

const transferForm = ref({
  quantity: 0,
  toBranch: "",
  notes: "",
});

// Reset form when modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    transferForm.value = { quantity: 0, toBranch: "", notes: "" };
  }
});

const handleSave = () => {
  emit("save", { ...transferForm.value });
};
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard v-if="item">
        <template #header>
          <h3 class="text-lg font-medium">
            {{ t("inventory.transferStock") }}
          </h3>
        </template>

        <div class="space-y-4">
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p class="font-medium">{{ item.productName }}</p>
            <p class="text-sm text-gray-500">
              {{ t("inventory.from") }}: {{ item.branchName }}
            </p>
            <p class="text-sm text-gray-500">
              {{ t("inventory.available") }}: {{ item.currentStock }}
              {{ item.unitSymbol }}
            </p>
          </div>

          <UFormField :label="t('inventory.toBranch')">
            <USelect
              v-model="transferForm.toBranch"
              :items="branches.filter((b) => b.id && b.id !== item?.branchId)"
              value-key="id"
              label-key="name"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('inventory.quantity')">
            <UInput
              v-model.number="transferForm.quantity"
              type="number"
              min="0"
              :max="item.currentStock"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('common.notes')">
            <UTextarea v-model="transferForm.notes" :rows="2" class="w-full" />
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
              :label="t('inventory.transfer')"
              @click="handleSave"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
