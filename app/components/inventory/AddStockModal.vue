<!-- components/inventory/AddStockModal.vue -->
<script setup lang="ts">
interface Branch {
  id: string;
  name: string;
}

interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  unitSymbol: string;
  hasExpiry?: boolean;
  defaultShelfLifeDays?: number;
}

export interface AddStockFormData {
  productId: string;
  branchId: string;
  quantity: number;
  notes: string;
  // New lot tracking fields
  lotNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  unitCost?: number;
}

interface Props {
  branches: Branch[];
  inventoryItems: InventoryItem[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  save: [data: AddStockFormData];
}>();

const { t } = useI18n();

const addStockForm = ref<AddStockFormData>({
  productId: "",
  branchId: "main",
  quantity: 0,
  notes: "",
  lotNumber: "",
  expiryDate: "",
  manufacturingDate: "",
  unitCost: undefined,
});

// Track if selected product requires expiry
const selectedProduct = computed(() =>
  props.inventoryItems.find(
    (item) => item.productId === addStockForm.value.productId
  )
);

const requiresExpiry = computed(
  () => selectedProduct.value?.hasExpiry || false
);

// Auto-generate lot number
const generateLotNumber = () => {
  const date = new Date();
  const prefix = "LOT";
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  addStockForm.value.lotNumber = `${prefix}-${dateStr}-${random}`;
};

// Auto-calculate expiry from shelf life
watch(
  () => addStockForm.value.productId,
  (productId) => {
    if (productId && selectedProduct.value?.defaultShelfLifeDays) {
      const expiry = new Date();
      expiry.setDate(
        expiry.getDate() + selectedProduct.value.defaultShelfLifeDays
      );
      addStockForm.value.expiryDate = expiry.toISOString().split("T")[0];
    }
  }
);

// Reset form when modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    addStockForm.value = {
      productId: "",
      branchId: "main",
      quantity: 0,
      notes: "",
      lotNumber: "",
      expiryDate: "",
      manufacturingDate: "",
      unitCost: undefined,
    };
  }
});

const handleSave = () => {
  emit("save", { ...addStockForm.value });
};

const productOptions = computed(() =>
  props.inventoryItems.map((item) => ({
    value: item.productId,
    label: `${item.productName} (${item.sku})`,
    stock: item.currentStock,
    unit: item.unitSymbol,
    hasExpiry: item.hasExpiry,
  }))
);

const branchOptions = computed(() =>
  props.branches.filter((b) => b.id !== "all")
);

// Get days until expiry for warning
const daysUntilExpiry = computed(() => {
  if (!addStockForm.value.expiryDate) return null;
  const expiry = new Date(addStockForm.value.expiryDate).getTime();
  const now = Date.now();
  return Math.ceil((expiry - now) / (24 * 60 * 60 * 1000));
});

const expiryWarningColor = computed(() => {
  if (!daysUntilExpiry.value) return "";
  if (daysUntilExpiry.value <= 0) return "text-red-600 dark:text-red-400";
  if (daysUntilExpiry.value <= 7) return "text-orange-600 dark:text-orange-400";
  if (daysUntilExpiry.value <= 30)
    return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
});
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-cube-transparent"
                class="w-5 h-5 text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <div>
              <h3 class="text-lg font-semibold">
                {{ t("inventory.addStock") }}
              </h3>
              <p class="text-sm text-gray-500">
                {{ t("inventory.addStockDesc", "Add stock to inventory") }}
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Product Selection -->
          <UFormField :label="t('products.product')" required>
            <USelectMenu
              v-model="addStockForm.productId"
              :items="productOptions"
              value-key="value"
              :placeholder="t('inventory.selectProduct')"
              searchable
              class="w-full"
            >
              <template #item="{ item }">
                <div class="flex items-center justify-between w-full">
                  <div class="flex items-center gap-2">
                    <span>{{ item.label }}</span>
                    <UBadge
                      v-if="item.hasExpiry"
                      color="amber"
                      size="xs"
                      variant="subtle"
                    >
                      {{ t("inventory.hasExpiry", "Expiry") }}
                    </UBadge>
                  </div>
                  <span class="text-xs text-gray-500"
                    >{{ item.stock }} {{ item.unit }}</span
                  >
                </div>
              </template>
            </USelectMenu>
          </UFormField>

          <!-- Branch -->
          <UFormField :label="t('common.branch')">
            <USelect
              v-model="addStockForm.branchId"
              :items="branchOptions"
              value-key="id"
              label-key="name"
              class="w-full"
            />
          </UFormField>

          <!-- Quantity & Cost Row -->
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('inventory.quantity')" required>
              <UInput
                v-model.number="addStockForm.quantity"
                type="number"
                min="1"
                class="w-full"
                :placeholder="t('inventory.enterQuantity')"
              />
            </UFormField>

            <UFormField :label="t('inventory.unitCost', 'Unit Cost')">
              <UInput
                v-model.number="addStockForm.unitCost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Lot Tracking Section -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <div class="flex items-center justify-between mb-3">
              <h4
                class="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
              >
                <UIcon name="i-heroicons-qr-code" class="w-4 h-4" />
                {{ t("inventory.lotTracking", "Lot Tracking") }}
              </h4>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-heroicons-sparkles"
                @click="generateLotNumber"
              >
                {{ t("inventory.generateLot", "Generate Lot Automatically") }}
              </UButton>
            </div>

            <!-- Lot Number -->
            <UFormField
              :label="t('inventory.lotNumber', 'Lot/Batch Number')"
              class="mb-3"
            >
              <UInput
                v-model="addStockForm.lotNumber"
                placeholder="e.g., LOT-20251206-AB12"
                class="w-full"
              />
            </UFormField>

            <!-- Dates Row -->
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('inventory.manufacturingDate', 'Mfg Date')">
                <CommonDatePicker
                  v-model="addStockForm.manufacturingDate"
                  class="w-full"
                />
              </UFormField>

              <UFormField :required="requiresExpiry">
                <template #label>
                  <span class="flex items-center gap-2">
                    {{ t("inventory.expiryDate", "Expiry Date") }}
                    <UBadge
                      v-if="requiresExpiry"
                      color="red"
                      size="xs"
                      variant="subtle"
                    >
                      {{ t("common.required", "Required") }}
                    </UBadge>
                  </span>
                </template>
                <CommonDatePicker
                  v-model="addStockForm.expiryDate"
                  class="w-full"
                />
                <!-- Expiry Warning -->
                <p
                  v-if="daysUntilExpiry !== null"
                  class="text-xs mt-1"
                  :class="expiryWarningColor"
                >
                  <template v-if="daysUntilExpiry <= 0">
                    ⚠️ {{ t("inventory.alreadyExpired", "Already expired!") }}
                  </template>
                  <template v-else-if="daysUntilExpiry <= 7">
                    ⚠️ {{ daysUntilExpiry }}
                    {{ t("inventory.daysUntilExpiry", "days until expiry") }}
                  </template>
                  <template v-else>
                    ✓ {{ daysUntilExpiry }}
                    {{ t("inventory.daysUntilExpiry", "days until expiry") }}
                  </template>
                </p>
              </UFormField>
            </div>
          </div>

          <!-- Notes -->
          <UFormField :label="t('common.notes')">
            <UTextarea
              v-model="addStockForm.notes"
              :rows="2"
              class="w-full"
              :placeholder="t('inventory.purchaseNotes')"
            />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="outline"
              :label="t('common.cancel', 'Cancel')"
              @click="open = false"
            />
            <UButton
              color="primary"
              :loading="loading"
              :disabled="
                !addStockForm.productId ||
                addStockForm.quantity <= 0 ||
                (requiresExpiry && !addStockForm.expiryDate)
              "
              :label="t('inventory.addStock')"
              @click="handleSave"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
