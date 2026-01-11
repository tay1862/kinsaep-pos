<!-- components/inventory/PurchaseOrderModal.vue -->
<script setup lang="ts">
interface Branch {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
  status: string;
}

interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
}

export interface POItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface POFormData {
  supplierId: string;
  branchId: string;
  items: POItem[];
  notes: string;
}

interface EditingPO {
  id: string;
  supplierId: string;
  branchId: string;
  items: POItem[];
  notes?: string;
  status: string;
}

interface Props {
  suppliers: Supplier[];
  branches: Branch[];
  inventoryItems: InventoryItem[];
  loading?: boolean;
  editingPO?: EditingPO | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  editingPO: null,
});

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  save: [data: POFormData];
}>();

const { t } = useI18n();

const poForm = ref<POFormData>({
  supplierId: "",
  branchId: "main",
  items: [],
  notes: "",
});

// Computed for edit mode
const isEditing = computed(() => !!props.editingPO);

const modalTitle = computed(() =>
  isEditing.value
    ? t("inventory.editPO", "Edit Purchase Order")
    : t("inventory.createPO")
);

const saveButtonLabel = computed(() =>
  isEditing.value ? t("common.save", "Save") : t("inventory.createPO")
);

// Reset or populate form when modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    if (props.editingPO) {
      // Edit mode - populate with existing data
      poForm.value = {
        supplierId: props.editingPO.supplierId,
        branchId: props.editingPO.branchId,
        items: props.editingPO.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        notes: props.editingPO.notes || "",
      };
    } else {
      // Create mode - reset form
      poForm.value = {
        supplierId: "",
        branchId: "main",
        items: [],
        notes: "",
      };
    }
  }
});

// Also watch editingPO changes in case modal is already open
watch(
  () => props.editingPO,
  (newPO) => {
    if (newPO && open.value) {
      poForm.value = {
        supplierId: newPO.supplierId,
        branchId: newPO.branchId,
        items: newPO.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        notes: newPO.notes || "",
      };
    }
  },
  { immediate: true }
);

const addItem = () => {
  poForm.value.items.push({
    productId: "",
    productName: "",
    quantity: 1,
    unitPrice: 0,
  });
};

const removeItem = (index: number) => {
  poForm.value.items.splice(index, 1);
};

const handleSave = () => {
  emit("save", { ...poForm.value });
};

const activeSuppliers = computed(() =>
  props.suppliers
    .filter((s) => s.status === "active")
    .map((s) => ({ value: s.id, label: s.name }))
);

const branchOptions = computed(() =>
  props.branches.filter((b) => b.id !== "all")
);

const productOptions = computed(() =>
  props.inventoryItems.map((i) => ({
    value: i.productId,
    label: `${i.productName} (${i.sku})`,
  }))
);

const updateProductName = (index: number, productId: string) => {
  const item = props.inventoryItems.find((i) => i.productId === productId);
  if (item && poForm.value.items[index]) {
    poForm.value.items[index].productName = item.productName;
  }
};

// Calculate total for display
const calculatedTotal = computed(() => {
  return poForm.value.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
});

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
  }).format(amount);
};
</script>

<template>
  <UModal v-model:open="open" fullscreen>
    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-lg font-medium">{{ modalTitle }}</h3>
        </template>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('inventory.supplier')" required>
              <USelectMenu
                v-model="poForm.supplierId"
                :items="activeSuppliers"
                value-key="value"
                label-key="label"
                :placeholder="t('inventory.selectSupplier')"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('common.branch')" required>
              <USelectMenu
                v-model="poForm.branchId"
                :items="branchOptions"
                value-key="id"
                label-key="name"
                :placeholder="t('common.selectBranch', 'Select branch')"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- PO Items -->
          <div
            class="border rounded-lg p-4 border-slate-200 dark:border-gray-700"
          >
            <div class="flex justify-between items-center mb-4">
              <h4 class="font-medium">{{ t("inventory.items") }}</h4>
              <UButton
                size="sm"
                color="primary"
                variant="ghost"
                icon="i-heroicons-plus"
                @click="addItem"
              >
                {{ t("inventory.addItem") }}
              </UButton>
            </div>

            <div
              v-for="(item, index) in poForm.items"
              :key="index"
              class="flex gap-4 items-center mb-2"
            >
              <div class="flex-1">
                <USelectMenu
                  v-model="item.productId"
                  :items="productOptions"
                  value-key="value"
                  label-key="label"
                  searchable
                  :placeholder="t('inventory.selectProduct')"
                  @update:model-value="(val) => updateProductName(index, val as string)"
                />
              </div>
              <div class="w-24">
                <UInput
                  v-model.number="item.quantity"
                  type="number"
                  min="1"
                  placeholder="Qty"
                />
              </div>
              <div class="w-32">
                <UInput
                  v-model.number="item.unitPrice"
                  type="number"
                  min="0"
                  placeholder="Price"
                />
              </div>
              <div
                class="w-24 text-right text-sm text-gray-600 dark:text-gray-400"
              >
                {{ formatCurrency(item.quantity * item.unitPrice) }}
              </div>
              <UButton
                color="red"
                variant="ghost"
                size="sm"
                icon="i-heroicons-trash"
                @click="removeItem(index)"
              />
            </div>

            <div
              v-if="poForm.items.length === 0"
              class="text-center py-4 text-gray-500"
            >
              {{ t("inventory.noItemsAdded") }}
            </div>

            <!-- Total -->
            <div
              v-if="poForm.items.length > 0"
              class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end"
            >
              <div class="text-right">
                <span class="text-sm text-gray-600 dark:text-gray-400"
                  >{{ t("common.total") }}:
                </span>
                <span class="font-bold text-lg">{{
                  formatCurrency(calculatedTotal)
                }}</span>
              </div>
            </div>
          </div>

          <UFormField :label="t('common.notes')">
            <UTextarea v-model="poForm.notes" class="w-full" :rows="2" />
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
              :disabled="!poForm.supplierId || poForm.items.length === 0"
              :label="saveButtonLabel"
              @click="handleSave"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
