<!-- components/products/ProductVariantModal.vue -->
<!-- Beautiful Size/Variant Selection Modal with Notes -->
<script setup lang="ts">
import type { Product, ProductVariant, ProductModifier } from "~/types";

// Props
interface Props {
  product: Product | null;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  confirm: [
    data: {
      product: Product;
      variant?: ProductVariant;
      modifiers: ProductModifier[];
      notes: string;
      quantity: number;
    }
  ];
  cancel: [];
}>();

// Model
const open = defineModel<boolean>("open", { default: false });

// i18n
const { t } = useI18n();

// State
const selectedVariant = ref<ProductVariant | null>(null);
const selectedModifiers = ref<ProductModifier[]>([]);
const notes = ref("");
const quantity = ref(1);

// Computed
const hasVariants = computed(
  () => props.product?.hasVariants && props.product?.variants?.length
);
const hasModifiers = computed(() => props.product?.modifierGroups?.length);

const variants = computed(() => {
  if (!props.product?.variants) return [];
  return [...props.product.variants].sort((a, b) => a.sortOrder - b.sortOrder);
});

const modifierGroups = computed(() => {
  if (!props.product?.modifierGroups) return [];
  return props.product.modifierGroups;
});

// Calculate final price
const finalPrice = computed(() => {
  if (!props.product) return 0;

  let price = props.product.price;

  // Add variant price modifier
  if (selectedVariant.value) {
    if (selectedVariant.value.priceModifierType === "percentage") {
      price += price * (selectedVariant.value.priceModifier / 100);
    } else {
      price += selectedVariant.value.priceModifier;
    }
  }

  // Add modifiers price
  for (const modifier of selectedModifiers.value) {
    price += modifier.price;
  }

  return price * quantity.value;
});

// Format price
const { format: formatPrice } = useCurrency();

// Reset state when modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    // Set default variant if exists
    selectedVariant.value =
      variants.value.find((v) => v.isDefault) || variants.value[0] || null;
    selectedModifiers.value = [];
    notes.value = "";
    quantity.value = 1;

    // Set default modifiers
    for (const group of modifierGroups.value) {
      for (const modifier of group.modifiers) {
        if (modifier.isDefault) {
          selectedModifiers.value.push(modifier);
        }
      }
    }
  }
});

// Methods
const selectVariant = (variant: ProductVariant) => {
  selectedVariant.value = variant;
};

const toggleModifier = (
  modifier: ProductModifier,
  group: (typeof modifierGroups.value)[0]
) => {
  const index = selectedModifiers.value.findIndex((m) => m.id === modifier.id);

  if (group.type === "single") {
    // Remove other modifiers from this group
    selectedModifiers.value = selectedModifiers.value.filter(
      (m) => !group.modifiers.find((gm) => gm.id === m.id)
    );
    if (index === -1) {
      selectedModifiers.value.push(modifier);
    }
  } else {
    // Multiple selection
    if (index === -1) {
      // Check max selection
      const groupCount = selectedModifiers.value.filter((m) =>
        group.modifiers.find((gm) => gm.id === m.id)
      ).length;
      if (!group.maxSelect || groupCount < group.maxSelect) {
        selectedModifiers.value.push(modifier);
      }
    } else {
      selectedModifiers.value.splice(index, 1);
    }
  }
};

const isModifierSelected = (modifier: ProductModifier) => {
  return selectedModifiers.value.some((m) => m.id === modifier.id);
};

const decreaseQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--;
  }
};

const increaseQuantity = () => {
  quantity.value++;
};

const handleConfirm = () => {
  if (!props.product) return;

  emit("confirm", {
    product: props.product,
    variant: selectedVariant.value || undefined,
    modifiers: selectedModifiers.value,
    notes: notes.value,
    quantity: quantity.value,
  });

  open.value = false;
};

const handleCancel = () => {
  emit("cancel");
  open.value = false;
};
</script>

<template>
  <UModal
    v-model:open="open"
    title="Product Variant"
    description="Add a new variant or edit an existing one"
  >
    <template #content>
      <UCard v-if="product" class="max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header with Product Info -->
        <template #header>
          <div class="flex items-start gap-4">
            <!-- Product Image -->
            <div
              class="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-0 shadow-md"
            >
              <img
                v-if="product.image"
                :src="product.image"
                :alt="product.name"
                class="w-full h-full object-cover"
              >
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-3xl"
              >
                🍽️
              </div>
            </div>

            <!-- Product Details -->
            <div class="flex-1 min-w-0">
              <h3
                class="text-lg font-bold text-gray-900 dark:text-white truncate"
              >
                {{ product.name }}
              </h3>
              <p
                v-if="product.description"
                class="text-sm text-gray-500 line-clamp-2 mt-1"
              >
                {{ product.description }}
              </p>
              <p
                class="text-lg font-bold text-primary-600 dark:text-primary-400 mt-2"
              >
                {{ formatPrice(product.price) }}
              </p>
            </div>

            <!-- Close Button -->
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="handleCancel"
            />
          </div>
        </template>

        <!-- Body - Scrollable -->
        <div class="overflow-y-auto max-h-[50vh] -mx-4 px-4 py-2">
          <!-- Size/Variant Selection -->
          <div v-if="hasVariants" class="mb-6">
            <h4
              class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"
            >
              <span class="text-lg">📏</span>
              {{ t("products.selectSize", "Select Size") }}
              <span class="text-red-500">*</span>
            </h4>

            <!-- Size Pills - Beautiful Design -->
            <div class="flex flex-wrap gap-2">
              <button
                v-for="variant in variants"
                :key="variant.id"
                type="button"
                class="relative px-4 py-3 rounded-xl font-medium transition-all duration-200 min-w-[80px] text-center border-2"
                :class="[
                  selectedVariant?.id === variant.id
                    ? 'bg-primary-500 text-white border-primary-500 shadow-lg shadow-primary-500/30 scale-105'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20',
                ]"
                @click="selectVariant(variant)"
              >
                <!-- Size Label -->
                <span class="block text-base font-bold">{{
                  variant.shortName
                }}</span>
                <span class="block text-xs opacity-75 mt-0.5">{{
                  variant.name
                }}</span>

                <!-- Price Modifier Badge -->
                <span
                  v-if="variant.priceModifier !== 0"
                  class="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs font-bold rounded-full"
                  :class="[
                    variant.priceModifier > 0
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
                  ]"
                >
                  {{ variant.priceModifier > 0 ? "+" : ""
                  }}{{ formatPrice(variant.priceModifier) }}
                </span>
              </button>
            </div>
          </div>

          <!-- Modifier Groups (Add-ons, Sugar Level, etc.) -->
          <div v-if="hasModifiers" class="space-y-5">
            <div v-for="group in modifierGroups" :key="group.id">
              <h4
                class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"
              >
                <span class="text-lg">{{
                  group.type === "single" ? "🔘" : "☑️"
                }}</span>
                {{ group.name }}
                <span v-if="group.required" class="text-red-500">*</span>
                <span v-if="group.maxSelect" class="text-xs text-gray-400"
                  >(max {{ group.maxSelect }})</span
                >
              </h4>

              <!-- Modifier Options -->
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="modifier in group.modifiers"
                  :key="modifier.id"
                  type="button"
                  class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border"
                  :class="[
                    isModifierSelected(modifier)
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-300 dark:border-primary-700'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary-300',
                  ]"
                  @click="toggleModifier(modifier, group)"
                >
                  <span>{{ modifier.name }}</span>
                  <span
                    v-if="modifier.price > 0"
                    class="ml-1 text-xs text-primary-600"
                  >
                    +{{ formatPrice(modifier.price) }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- Notes Input -->
          <div class="mt-5">
            <h4
              class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
            >
              <span class="text-lg">📝</span>
              {{ t("products.specialInstructions", "Special Instructions") }}
            </h4>
            <UTextarea
              v-model="notes"
              :placeholder="
                t('products.notesPlaceholder', 'E.g., Less ice, no sugar, extra spicy...')
              "
              :rows="2"
              autoresize
              class="w-full"
            />
          </div>
        </div>

        <!-- Footer with Quantity and Add Button -->
        <template #footer>
          <div class="space-y-4">
            <!-- Quantity Selector -->
            <div class="flex items-center justify-center gap-4">
              <UButton
                color="neutral"
                variant="soft"
                size="lg"
                icon="i-heroicons-minus"
                :disabled="quantity <= 1"
                class="w-12 h-12"
                @click="decreaseQuantity"
              />
              <span class="text-2xl font-bold w-12 text-center">{{
                quantity
              }}</span>
              <UButton
                color="primary"
                variant="soft"
                size="lg"
                icon="i-heroicons-plus"
                class="w-12 h-12"
                @click="increaseQuantity"
              />
            </div>

            <!-- Add to Cart Button -->
            <UButton
              color="primary"
              size="xl"
              block
              class="min-h-[56px] text-lg font-bold shadow-lg shadow-primary-500/20"
              :disabled="hasVariants && !selectedVariant"
              @click="handleConfirm"
            >
              <div class="flex items-center justify-between w-full px-2">
                <span class="flex items-center gap-2">
                  <UIcon name="i-heroicons-shopping-cart" class="w-5 h-5" />
                  {{ t("products.addToCart", "Add to Cart") }}
                </span>
                <span>{{ formatPrice(finalPrice) }}</span>
              </div>
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<style scoped>
/* Smooth animations for size selection */
button {
  touch-action: manipulation;
}
</style>
