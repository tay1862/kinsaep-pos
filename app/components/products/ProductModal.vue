<!-- components/products/ProductModal.vue -->
<!-- Fullscreen Product Add/Edit Modal -->
<script setup lang="ts">
import { z } from "zod";
import type { Product, Category, Unit, Branch, ProductVariant } from "~/types";
import { shouldTrackStockByDefault } from "~/data/shop-templates";

// Props
interface Props {
  product?: Product | null;
  categories: Category[];
  units: Unit[];
  branches: Branch[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  product: null,
  loading: false,
});

// Emits
const emit = defineEmits<{
  save: [data: ProductFormData];
  cancel: [];
  "add-category": [];
  "add-unit": [];
}>();

// Model
const open = defineModel<boolean>("open", { default: false });

// i18n
const { t } = useI18n();

// Types
export interface ProductFormData {
  name: string;
  sku: string;
  barcode: string;
  barcodeType: "ean13" | "upca" | "code128" | "qr" | "custom" | undefined;
  description: string;
  categoryId: string;
  unitId: string;
  price: number;
  stock: number;
  minStock: number;
  branchId: string;
  status: "active" | "inactive";
  image: string;
  productType: "good" | "service" | "digital" | "subscription" | "bundle";
  trackStock: boolean;
  hasExpiry: boolean;
  defaultShelfLifeDays: number | undefined;
  trackLots: boolean;
  requiresExpiryDate: boolean;
  expiryWarningDays: number | undefined;
  storageType: "ambient" | "refrigerated" | "frozen" | "controlled" | undefined;
  isPublic: boolean; // Show on customer menu
  // Size variants
  hasVariants: boolean;
  variants: ProductVariant[];
}

// Validation Schema
const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  unitId: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  stock: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  branchId: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  barcode: z.string().optional(),
  barcodeType: z.enum(["ean13", "upca", "code128", "qr", "custom"]).optional(),
  productType: z
    .enum(["good", "service", "digital", "subscription", "bundle"])
    .optional(),
  trackStock: z.boolean().optional(),
  hasExpiry: z.boolean().optional(),
  defaultShelfLifeDays: z.number().optional(),
  trackLots: z.boolean().optional(),
  requiresExpiryDate: z.boolean().optional(),
  expiryWarningDays: z.number().optional(),
  storageType: z
    .enum(["ambient", "refrigerated", "frozen", "controlled"])
    .optional(),
});

// Options
const productTypeOptions = computed(() => [
  { value: "good", label: t("products.productTypes.good") },
  { value: "service", label: t("products.productTypes.service") },
  { value: "digital", label: t("products.productTypes.digital") },
  { value: "subscription", label: t("products.productTypes.subscription") },
  { value: "bundle", label: t("products.productTypes.bundle") },
]);

const storageTypeOptions = computed(() => [
  { value: "ambient", label: t("products.storageTypes.ambient") },
  { value: "refrigerated", label: t("products.storageTypes.refrigerated") },
  { value: "frozen", label: t("products.storageTypes.frozen") },
  { value: "controlled", label: t("products.storageTypes.controlled") },
]);

const productEmojis = [
  "📦",
  "🍹",
  "🍜",
  "🍰",
  "☕",
  "🍺",
  "🍔",
  "🛒",
  "🍕",
  "🌮",
  "🍣",
  "🥗",
  "🍪",
  "🎂",
  "🍦",
  "🧃",
  "🥤",
  "🍵",
  "🍿",
  "🥡",
  "🍱",
  "🍛",
  "🍝",
  "🥪",
  "🌭",
  "🍟",
  "🥐",
  "🧁",
  "🍩",
  "🥧",
  "🍫",
  "🍬",
];

// Shop composable to get shop type
const shop = useShop();

// Form State
const form = ref<ProductFormData>(getDefaultForm());

function getDefaultForm(): ProductFormData {
  // Determine trackStock default based on shop type
  const shopType = shop.shopConfig.value?.shopType || "other";
  const defaultTrackStock = shouldTrackStockByDefault(shopType);

  return {
    name: "",
    sku: "",
    barcode: "",
    barcodeType: undefined,
    description: "",
    categoryId: "",
    unitId: "",
    price: 0,
    stock: 0,
    minStock: 0,
    branchId: "",
    status: "active",
    image: "📦",
    productType: "good",
    trackStock: defaultTrackStock,
    hasExpiry: false,
    defaultShelfLifeDays: undefined,
    trackLots: false,
    requiresExpiryDate: false,
    expiryWarningDays: 7,
    storageType: "ambient",
    isPublic: true, // Default to public (show on menu)
    // Size variants
    hasVariants: false,
    variants: [],
  };
}

// Computed
const isEditing = computed(() => !!props.product?.id);

const categoryOptions = computed(() => [
  { id: "all", name: t("common.all", "All") },
  // Map categories without 'icon' property to prevent USelect from trying to render emoji as Icon
  ...props.categories.map((c) => ({ id: c.id, name: c.name })),
]);

const unitOptions = computed(() => props.units);

const branchOptions = computed(() => [
  { id: "all", name: t("common.allBranches", "All Branches") },
  ...props.branches,
]);

// Watch for product changes
watch(
  () => props.product,
  (product) => {
    if (product) {
      form.value = {
        name: product.name,
        sku: product.sku || "",
        barcode: product.barcode || "",
        barcodeType: product.barcodeType,
        description: product.description || "",
        categoryId: product.categoryId || "",
        unitId: product.unitId || "",
        price: product.price,
        stock: product.stock || 0,
        minStock: product.minStock || 0,
        branchId: product.branchId || "",
        status: product.status || "active",
        image: product.image || "📦",
        productType: product.productType || "good",
        trackStock: product.trackStock !== false,
        hasExpiry: product.hasExpiry || false,
        defaultShelfLifeDays: product.defaultShelfLifeDays,
        trackLots: product.trackLots || false,
        requiresExpiryDate: product.requiresExpiryDate || false,
        expiryWarningDays: product.expiryWarningDays || 7,
        storageType: product.storageType || "ambient",
        isPublic: product.isPublic !== false, // Default to true if not set
        // Size variants
        hasVariants: product.hasVariants || false,
        variants: product.variants || [],
      };
    } else {
      form.value = getDefaultForm();
    }
  },
  { immediate: true }
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    form.value = getDefaultForm();
  }
});

// Methods
function onProductTypeChange(type: string) {
  if (type === "service" || type === "digital" || type === "subscription") {
    form.value.trackStock = false;
    form.value.stock = 0;
    form.value.minStock = 0;
  } else {
    form.value.trackStock = true;
  }
}

function getUnitSymbol(unitId: string): string {
  const unit = props.units.find((u) => u.id === unitId);
  return unit?.symbol || "unit";
}

function handleSubmit() {
  emit("save", { ...form.value });
}

function handleCancel() {
  open.value = false;
  emit("cancel");
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Product"
    description="Add a new product or edit an existing one"
    fullscreen
  >
    <template #content>
      <div class="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
        <!-- Header -->
        <header
          class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 shrink-0"
        >
          <div class="flex items-center justify-between max-w-6xl mx-auto">
            <div class="flex items-center gap-4">
              <div
                class="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <img
                  v-if="form.image && form.image.startsWith('http')"
                  :src="form.image"
                  alt="Preview"
                  class="w-full h-full object-cover"
                />
                <span v-else-if="form.image" class="text-3xl">{{
                  form.image
                }}</span>
                <UIcon
                  v-else
                  name="i-heroicons-cube"
                  class="w-7 h-7 text-gray-400"
                />
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                  {{
                    isEditing
                      ? t("products.editProduct")
                      : t("products.addProduct")
                  }}
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{
                    form.name ||
                    t("products.newProductHint", "Fill in product details below")
                  }}
                </p>
              </div>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="lg"
              @click="handleCancel"
            />
          </div>
        </header>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto">
          <div class="max-w-6xl mx-auto p-6">
            <UForm :schema="productSchema" :state="form" @submit="handleSubmit">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Left Column -->
                <div class="lg:col-span-2 space-y-6">
                  <!-- Basic Info Card -->
                  <ProductsFormCardBasicInfo v-model="form" />

                  <!-- Classification Card -->
                  <ProductsFormCardClassification
                    v-model="form"
                    :category-options="categoryOptions"
                    :unit-options="unitOptions"
                    :branch-options="branchOptions"
                    :product-type-options="productTypeOptions"
                    @product-type-change="onProductTypeChange"
                    @add-category="$emit('add-category')"
                    @add-unit="$emit('add-unit')"
                  />

                  <!-- Inventory Card -->
                  <ProductsFormCardInventory
                    v-if="
                      form.productType === 'good' ||
                      form.productType === 'bundle'
                    "
                    v-model="form"
                    :unit-symbol="getUnitSymbol(form.unitId)"
                  />

                  <!-- Expiry Card -->
                  <ProductsFormCardExpiry
                    v-if="
                      (form.productType === 'good' ||
                        form.productType === 'bundle') &&
                      form.trackStock
                    "
                    v-model="form"
                    :storage-type-options="storageTypeOptions"
                  />

                  <!-- Size Variants Card -->
                  <div
                    class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
                  >
                    <div
                      class="px-6 py-4 border-b border-gray-200 dark:border-gray-800"
                    >
                      <h3 class="font-semibold text-gray-900 dark:text-white">
                        {{ t("products.sizeVariants") }}
                      </h3>
                      <p class="text-sm text-gray-500">
                        {{ t("products.sizeVariantsDesc") }}
                      </p>
                    </div>
                    <div class="p-6">
                      <ProductsProductVariantEditor
                        v-model:has-variants="form.hasVariants"
                        v-model:variants="form.variants"
                      />
                    </div>
                  </div>

                  <!-- No Stock Info -->
                  <div
                    v-if="
                      form.productType === 'service' ||
                      form.productType === 'digital' ||
                      form.productType === 'subscription'
                    "
                    class="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-6"
                  >
                    <div class="flex items-start gap-4">
                      <div
                        class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0"
                      >
                        <UIcon
                          name="i-heroicons-information-circle"
                          class="w-6 h-6 text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <div>
                        <h4
                          class="font-medium text-blue-900 dark:text-blue-100 mb-1"
                        >
                          {{ t("products.noStockTitle") }}
                        </h4>
                        <p class="text-sm text-blue-700 dark:text-blue-300">
                          {{ t("products.noStockTracking") }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Right Column -->
                <div class="space-y-6">
                  <!-- Image Card -->
                  <ProductsFormCardImage
                    v-model="form"
                    :emojis="productEmojis"
                  />

                  <!-- Status Card -->
                  <ProductsFormCardStatus v-model="form" />
                </div>
              </div>

              <!-- Footer -->
              <div
                class="mt-8 flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm"
              >
                <div class="text-sm text-gray-500">
                  <span v-if="isEditing && product">
                    {{ t("common.lastUpdated") }}:
                    <span v-if="product.updatedAt">
                      {{ $d(new Date(product.updatedAt), "long") }}
                    </span>
                  </span>
                  <span v-else>
                    {{ t("products.createNewHint") }}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <UButton
                    color="neutral"
                    variant="outline"
                    size="lg"
                    :label="t('common.cancel')"
                    @click="handleCancel"
                  />
                  <UButton
                    type="submit"
                    color="primary"
                    size="lg"
                    :loading="loading"
                    icon="i-heroicons-check"
                  >
                    {{ isEditing ? t("common.update") : t("common.create") }}
                  </UButton>
                </div>
              </div>
            </UForm>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
