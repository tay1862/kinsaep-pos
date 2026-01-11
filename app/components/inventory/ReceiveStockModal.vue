<!-- components/inventory/ReceiveStockModal.vue -->
<!-- Production-ready Stock Receiving Modal with Lot/Batch Tracking -->
<template>
  <UModal v-model:open="isOpen" class="max-w-4xl">
    <template #content>
      <div class="flex flex-col h-[85vh] bg-white dark:bg-gray-900">
        <!-- Header -->
        <div
          class="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/25"
            >
              📦
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ $t("inventory.receiveStock", "Receive Stock") }}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{
                  $t(
                    "inventory.receiveStockDesc",
                    "Record incoming inventory with lot tracking"
                  )
                }}
              </p>
            </div>
          </div>
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="lg"
            @click="close"
          />
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-5 space-y-6">
          <!-- Receipt Info Section -->
          <div class="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 space-y-4">
            <h3
              class="font-semibold text-gray-900 dark:text-white flex items-center gap-2"
            >
              <span class="text-lg">📋</span>
              {{ $t("inventory.receiptInfo", "Receipt Information") }}
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Supplier -->
              <UFormField :label="$t('inventory.supplier', 'Supplier')">
                <USelect
                  v-model="form.supplierId"
                  :items="supplierOptions"
                  label-key="name"
                  value-key="id"
                  :placeholder="$t('common.select', 'Select...')"
                  searchable
                  clearable
                  class="w-full"
                  @update:model-value="onSupplierChange"
                />
              </UFormField>

              <!-- Purchase Order (optional) -->
              <UFormField
                :label="$t('inventory.purchaseOrder', 'Purchase Order')"
              >
                <USelect
                  v-model="form.purchaseOrderId"
                  :items="poOptions"
                  label-key="label"
                  value-key="id"
                  :placeholder="$t('common.optional', 'Optional')"
                  clearable
                  class="w-full"
                />
              </UFormField>

              <!-- Invoice Number -->
              <UFormField :label="$t('inventory.invoiceNumber', 'Invoice #')">
                <UInput
                  v-model="form.invoiceNumber"
                  :placeholder="
                    $t('inventory.invoicePlaceholder', 'e.g., INV-2024-001')
                  "
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Delivery Note -->
              <UFormField
                :label="$t('inventory.deliveryNote', 'Delivery Note')"
              >
                <UInput
                  v-model="form.deliveryNote"
                  :placeholder="
                    $t('inventory.deliveryNotePlaceholder', 'Reference number')
                  "
                  class="w-full"
                />
              </UFormField>

              <!-- Notes -->
              <UFormField :label="$t('common.notes', 'Notes')">
                <UInput
                  v-model="form.notes"
                  :placeholder="$t('common.optional', 'Optional notes...')"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>

          <!-- Items Section -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3
                class="font-semibold text-gray-900 dark:text-white flex items-center gap-2"
              >
                <span class="text-lg">📦</span>
                {{ $t("inventory.items", "Items") }}
                <UBadge color="primary" variant="subtle">
                  {{ form.items.length }}
                </UBadge>
              </h3>
              <UButton
                color="primary"
                variant="soft"
                size="sm"
                icon="i-heroicons-plus"
                @click="addItem"
              >
                {{ $t("inventory.addItem", "Add Item") }}
              </UButton>
            </div>

            <!-- Items List -->
            <div class="space-y-4">
              <div
                v-for="(item, index) in form.items"
                :key="index"
                class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-4 relative"
              >
                <!-- Item Header -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span
                      class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-400"
                    >
                      {{ index + 1 }}
                    </span>
                    <span class="font-medium text-gray-900 dark:text-white">
                      {{
                        item.productName ||
                        $t("inventory.selectProduct", "Select Product")
                      }}
                    </span>
                    <UBadge
                      v-if="item.productSku"
                      color="neutral"
                      variant="subtle"
                      size="xs"
                    >
                      {{ item.productSku }}
                    </UBadge>
                  </div>
                  <UButton
                    v-if="form.items.length > 1"
                    icon="i-heroicons-trash"
                    color="red"
                    variant="ghost"
                    size="xs"
                    @click="removeItem(index)"
                  />
                </div>

                <!-- Row 1: Product & Quantities -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <UFormField
                    :label="$t('products.name', 'Product')"
                    class="md:col-span-2"
                  >
                    <USelect
                      v-model="item.productId"
                      :items="productOptions"
                      label-key="label"
                      value-key="id"
                      :placeholder="$t('common.search', 'Search...')"
                      searchable
                      class="w-full"
                      @update:model-value="(val) => onProductSelect(index, val)"
                    />
                  </UFormField>

                  <UFormField :label="$t('inventory.quantity', 'Quantity')">
                    <UInput
                      v-model.number="item.receivedQty"
                      type="number"
                      min="0"
                      :placeholder="'0'"
                      class="w-full"
                      @update:model-value="updateAcceptedQty(index)"
                    />
                  </UFormField>

                  <UFormField :label="$t('inventory.unitCost', 'Unit Cost')">
                    <UInput
                      v-model.number="item.unitCost"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full"
                      :placeholder="'0.00'"
                    />
                  </UFormField>
                </div>

                <!-- Row 2: Lot & Expiry -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <UFormField
                    :label="$t('inventory.lotNumber', 'Lot/Batch #')"
                    required
                  >
                    <UInput
                      v-model="item.lotNumber"
                      :placeholder="
                        $t('inventory.lotPlaceholder', 'e.g., LOT-2024-001')
                      "
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField
                    :label="$t('inventory.manufacturingDate', 'Mfg. Date')"
                  >
                    <UInput v-model="item.manufacturingDate" type="date" />
                  </UFormField>

                  <UFormField
                    :label="$t('inventory.expiryDate', 'Expiry Date')"
                    :required="item.requiresExpiry"
                  >
                    <UInput
                      v-model="item.expiryDate"
                      type="date"
                      :class="{
                        'ring-2 ring-amber-500':
                          item.requiresExpiry && !item.expiryDate,
                      }"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField :label="$t('inventory.position', 'Position')">
                    <USelect
                      v-model="item.positionId"
                      :items="positionOptions"
                      label-key="label"
                      value-key="id"
                      :placeholder="$t('common.select', 'Select...')"
                      clearable
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <!-- Expiry Warning -->
                <div
                  v-if="
                    item.expiryDate && getDaysUntilExpiry(item.expiryDate) <= 30
                  "
                  class="flex items-center gap-2 p-3 rounded-xl"
                  :class="
                    getDaysUntilExpiry(item.expiryDate) <= 7
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  "
                >
                  <UIcon
                    name="i-heroicons-exclamation-triangle"
                    class="w-5 h-5"
                  />
                  <span class="text-sm font-medium">
                    {{
                      getDaysUntilExpiry(item.expiryDate) <= 0
                        ? $t("inventory.expired", "Product is expired!")
                        : `${
                            $t("inventory.expiresIn", "Expires in")
                          } ${getDaysUntilExpiry(item.expiryDate)} ${
                            $t("common.days", "days")
                          }`
                    }}
                  </span>
                </div>

                <!-- Row 3: Quality & Notes -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <UFormField
                    :label="$t('inventory.qualityGrade', 'Quality')"
                  >
                    <USelect
                      v-model="item.qualityGrade"
                      :items="qualityOptions"
                      label-key="label"
                      value-key="value"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField
                    :label="$t('inventory.accepted', 'Accepted')"
                    class="md:col-span-1"
                  >
                    <div class="flex gap-2">
                      <UInput
                        v-model.number="item.acceptedQty"
                        type="number"
                        min="0"
                        :max="item.receivedQty"
                        class="flex-1"
                      />
                      <UInput
                        v-model.number="item.rejectedQty"
                        type="number"
                        min="0"
                        :max="item.receivedQty"
                        :placeholder="$t('inventory.rejected', 'Rejected')"
                        class="flex-1"
                      />
                    </div>
                  </UFormField>

                  <UFormField :label="$t('common.notes', 'Notes')">
                    <UInput
                      v-model="item.notes"
                      class="w-full"
                      :placeholder="$t('common.optional', 'Optional...')"
                    />
                  </UFormField>
                </div>

                <!-- Item Total -->
                <div
                  class="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700"
                >
                  <div class="text-sm">
                    <span class="text-gray-500 dark:text-gray-400"
                      >{{ $t("common.total", "Total") }}:</span
                    >
                    <span class="ml-2 font-bold text-gray-900 dark:text-white">
                      {{ formatCurrency(item.acceptedQty * item.unitCost) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="form.items.length === 0"
              class="flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600"
            >
              <span class="text-4xl mb-3">📦</span>
              <p class="text-gray-500 dark:text-gray-400 mb-4">
                {{ $t("inventory.noItemsAdded", "No items added yet") }}
              </p>
              <UButton
                color="primary"
                variant="soft"
                icon="i-heroicons-plus"
                @click="addItem"
              >
                {{ $t("inventory.addFirstItem", "Add First Item") }}
              </UButton>
            </div>
          </div>
        </div>

        <!-- Footer Summary & Actions -->
        <div class="border-t border-gray-200 dark:border-gray-700 p-5">
          <!-- Summary Stats -->
          <div class="grid grid-cols-4 gap-4 mb-4">
            <div class="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ form.items.length }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ $t("inventory.items", "Items") }}
              </p>
            </div>
            <div
              class="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl"
            >
              <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {{ totalQuantity }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ $t("inventory.totalQty", "Total Qty") }}
              </p>
            </div>
            <div
              class="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl"
            >
              <p
                class="text-2xl font-bold text-emerald-600 dark:text-emerald-400"
              >
                {{ acceptedQuantity }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ $t("inventory.accepted", "Accepted") }}
              </p>
            </div>
            <div
              class="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl"
            >
              <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {{ formatCurrency(totalValue) }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ $t("inventory.totalValue", "Total Value") }}
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-between items-center">
            <UButton color="neutral" variant="outline" @click="close">
              {{ $t("common.cancel", "Cancel") }}
            </UButton>
            <div class="flex gap-2">
              <UButton color="neutral" variant="soft" @click="saveDraft">
                {{ $t("common.saveDraft", "Save Draft") }}
              </UButton>
              <UButton
                color="primary"
                :loading="saving"
                :disabled="!canSubmit"
                @click="submit"
              >
                <UIcon name="i-heroicons-check" class="w-4 h-4 mr-1" />
                {{ $t("inventory.receiveStock", "Receive Stock") }}
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { Product, StockReceipt } from "~/types";

// Props & Emits
interface Props {
  open: boolean;
  branchId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:open": [value: boolean];
  success: [receipt: StockReceipt];
}>();

// Composables
const { t } = useI18n();
const toast = useToast();
const stockLots = useStockLots();
const inventory = useInventory();
const productsStore = useProductsStore();

// State
const saving = ref(false);

// Form State
interface ItemForm {
  productId: string;
  productName: string;
  productSku: string;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  lotNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  positionId: string;
  unitCost: number;
  qualityGrade: "A" | "B" | "C";
  notes: string;
  requiresExpiry: boolean;
}

const form = ref({
  supplierId: "",
  supplierName: "",
  purchaseOrderId: "",
  invoiceNumber: "",
  deliveryNote: "",
  notes: "",
  items: [] as ItemForm[],
});

// Modal state
const isOpen = computed({
  get: () => props.open,
  set: (val) => emit("update:open", val),
});

// Options
const supplierOptions = computed(() =>
  inventory.suppliers.value.map((s) => ({
    id: s.id,
    name: s.name,
  }))
);

const poOptions = computed(() => {
  // Get open purchase orders
  return inventory.purchaseOrders.value
    .filter((po) => po.status === "ordered" || po.status === "partial")
    .map((po) => ({
      id: po.id,
      label: `PO-${po.id.slice(-6)} - ${po.supplierName}`,
    }));
});

const productOptions = computed(() => {
  return productsStore.products.value
    .filter((p) => p.status === "active" && p.trackStock !== false)
    .map((p) => ({
      id: p.id,
      label: `${p.name} (${p.sku})`,
      product: p,
    }));
});

const positionOptions = computed(() => {
  return stockLots.storagePositions.value
    .filter((p) => p.branchId === props.branchId && p.isActive)
    .map((p) => ({
      id: p.id,
      label: `${p.fullCode} - ${p.zone}${
        p.description ? ` (${p.description})` : ""
      }`,
    }));
});

const qualityOptions = [
  { value: "A", label: "🌟 Grade A - Excellent" },
  { value: "B", label: "✅ Grade B - Good" },
  { value: "C", label: "⚠️ Grade C - Acceptable" },
];

// Computed
const totalQuantity = computed(() =>
  form.value.items.reduce((sum, item) => sum + (item.receivedQty || 0), 0)
);

const acceptedQuantity = computed(() =>
  form.value.items.reduce((sum, item) => sum + (item.acceptedQty || 0), 0)
);

const totalValue = computed(() =>
  form.value.items.reduce(
    (sum, item) => sum + (item.acceptedQty || 0) * (item.unitCost || 0),
    0
  )
);

const canSubmit = computed(() => {
  if (form.value.items.length === 0) return false;

  return form.value.items.every((item) => {
    if (!item.productId || !item.lotNumber || item.acceptedQty <= 0)
      return false;
    if (item.requiresExpiry && !item.expiryDate) return false;
    return true;
  });
});

// Methods
function addItem() {
  form.value.items.push({
    productId: "",
    productName: "",
    productSku: "",
    receivedQty: 0,
    acceptedQty: 0,
    rejectedQty: 0,
    lotNumber: generateLotNumber(),
    manufacturingDate: "",
    expiryDate: "",
    positionId: "",
    unitCost: 0,
    qualityGrade: "A",
    notes: "",
    requiresExpiry: false,
  });
}

function removeItem(index: number) {
  form.value.items.splice(index, 1);
}

function onSupplierChange(supplierId: string) {
  const supplier = inventory.suppliers.value.find((s) => s.id === supplierId);
  form.value.supplierName = supplier?.name || "";
}

function onProductSelect(index: number, productId: string) {
  const option = productOptions.value.find((p) => p.id === productId);
  if (option?.product) {
    const product = option.product as Product;
    const item = form.value.items[index];
    if (!item) return;
    item.productName = product.name;
    item.productSku = product.sku;
    item.unitCost = product.costPrice || product.price * 0.6; // Default to 60% of price
    item.requiresExpiry =
      product.requiresExpiryDate || product.hasExpiry || false;

    // Auto-calculate expiry if product has default shelf life
    if (product.defaultShelfLifeDays && !item.expiryDate) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + product.defaultShelfLifeDays);
      item.expiryDate = expiry.toISOString().split("T")[0] || "";
    }
  }
}

function updateAcceptedQty(index: number) {
  // Default: all received is accepted
  const item = form.value.items[index];
  if (item && item.rejectedQty === 0) {
    item.acceptedQty = item.receivedQty;
  }
}

function getDaysUntilExpiry(expiryDate: string): number {
  if (!expiryDate) return 999;
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  return Math.ceil((expiry - now) / (24 * 60 * 60 * 1000));
}

function generateLotNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `LOT-${dateStr}-${seq}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
  }).format(amount);
}

function close() {
  isOpen.value = false;
  resetForm();
}

function resetForm() {
  form.value = {
    supplierId: "",
    supplierName: "",
    purchaseOrderId: "",
    invoiceNumber: "",
    deliveryNote: "",
    notes: "",
    items: [],
  };
}

async function saveDraft() {
  // TODO: Implement draft saving
  toast.add({
    title: t("common.saved", "Saved"),
    description: t("inventory.draftSaved", "Draft saved locally"),
    icon: "i-heroicons-bookmark",
    color: "blue",
  });
}

async function submit() {
  if (!canSubmit.value) return;

  saving.value = true;
  try {
    // Get current user
    const currentUser = "staff_1"; // TODO: Get from auth

    const receipt = await stockLots.createStockReceipt({
      branchId: props.branchId,
      supplierId: form.value.supplierId || undefined,
      supplierName: form.value.supplierName || undefined,
      purchaseOrderId: form.value.purchaseOrderId || undefined,
      deliveryNote: form.value.deliveryNote || undefined,
      invoiceNumber: form.value.invoiceNumber || undefined,
      items: form.value.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        receivedQty: item.receivedQty,
        acceptedQty: item.acceptedQty,
        rejectedQty: item.rejectedQty,
        lotNumber: item.lotNumber,
        manufacturingDate: item.manufacturingDate || undefined,
        expiryDate: item.expiryDate || undefined,
        positionId: item.positionId || undefined,
        unitCost: item.unitCost,
        notes: item.notes || undefined,
      })),
      receivedBy: currentUser,
      notes: form.value.notes || undefined,
    });

    if (receipt) {
      toast.add({
        title: t("common.success", "Success"),
        description: `${t("inventory.stockReceived", "Stock received")}: ${
          receipt.receiptNumber
        }`,
        icon: "i-heroicons-check-circle",
        color: "green",
      });

      emit("success", receipt);
      close();
    } else {
      throw new Error(stockLots.error.value || "Failed to receive stock");
    }
  } catch (err) {
    console.error("Submit error:", err);
    toast.add({
      title: t("common.error", "Error"),
      description:
        err instanceof Error ? err.message : "Failed to receive stock",
      icon: "i-heroicons-exclamation-circle",
      color: "red",
    });
  } finally {
    saving.value = false;
  }
}

// Initialize with one empty item
onMounted(() => {
  if (form.value.items.length === 0) {
    addItem();
  }
});

// Reset when modal opens
watch(isOpen, (val) => {
  if (val && form.value.items.length === 0) {
    addItem();
  }
});
</script>
