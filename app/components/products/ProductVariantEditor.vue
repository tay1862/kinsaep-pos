<!-- components/products/ProductVariantEditor.vue -->
<!-- Inline Variant/Size Editor for ProductModal -->
<script setup lang="ts">
import type { ProductVariant } from "~/types";

// Props & Model
const variants = defineModel<ProductVariant[]>("variants", {
  default: () => [],
});
const hasVariants = defineModel<boolean>("hasVariants", { default: false });

// i18n
const { t } = useI18n();

// Currency
const { format: formatPrice } = useCurrency();

// Preset templates for quick setup
const presetTemplates = computed(() => [
  {
    name: "sizes",
    label: t("products.presets.sizes"),
    variants: [
      {
        id: "s",
        name: "Small",
        shortName: "S",
        priceModifier: 0,
        priceModifierType: "fixed" as const,
        sortOrder: 0,
        isDefault: true,
      },
      {
        id: "m",
        name: "Medium",
        shortName: "M",
        priceModifier: 5000,
        priceModifierType: "fixed" as const,
        sortOrder: 1,
      },
      {
        id: "l",
        name: "Large",
        shortName: "L",
        priceModifier: 10000,
        priceModifierType: "fixed" as const,
        sortOrder: 2,
      },
    ],
  },
  {
    name: "drinks",
    label: t("products.presets.drinks"),
    variants: [
      {
        id: "regular",
        name: "Regular",
        shortName: "R",
        priceModifier: 0,
        priceModifierType: "fixed" as const,
        sortOrder: 0,
        isDefault: true,
      },
      {
        id: "large",
        name: "Large",
        shortName: "L",
        priceModifier: 10000,
        priceModifierType: "fixed" as const,
        sortOrder: 1,
      },
    ],
  },
  {
    name: "coffee",
    label: t("products.presets.coffee"),
    variants: [
      {
        id: "hot",
        name: "Hot",
        shortName: "🔥",
        priceModifier: 0,
        priceModifierType: "fixed" as const,
        sortOrder: 0,
        isDefault: true,
      },
      {
        id: "iced",
        name: "Iced",
        shortName: "🧊",
        priceModifier: 5000,
        priceModifierType: "fixed" as const,
        sortOrder: 1,
      },
      {
        id: "frappe",
        name: "Frappe",
        shortName: "🥤",
        priceModifier: 15000,
        priceModifierType: "fixed" as const,
        sortOrder: 2,
      },
    ],
  },
  {
    name: "portions",
    label: t("products.presets.portions"),
    variants: [
      {
        id: "single",
        name: "Single",
        shortName: "1x",
        priceModifier: 0,
        priceModifierType: "fixed" as const,
        sortOrder: 0,
        isDefault: true,
      },
      {
        id: "double",
        name: "Double",
        shortName: "2x",
        priceModifier: 0,
        priceModifierType: "percentage" as const,
        sortOrder: 1,
      },
    ],
  },
]);

// State
const showAddForm = ref(false);
const editingVariant = ref<ProductVariant | null>(null);
const newVariant = ref<Partial<ProductVariant>>({
  name: "",
  shortName: "",
  priceModifier: 0,
  priceModifierType: "fixed",
  sortOrder: 0,
  isDefault: false,
});

// Methods
interface PresetVariant {
  id: string;
  name: string;
  shortName: string;
  priceModifier: number;
  priceModifierType: "fixed" | "percentage";
  sortOrder: number;
  isDefault?: boolean;
}

interface PresetTemplate {
  name: string;
  label: string;
  variants: PresetVariant[];
}

// Methods
const applyPreset = (preset: PresetTemplate) => {
  hasVariants.value = true;
  variants.value = preset.variants.map((v, index) => ({
    ...v,
    id: `var_${Date.now()}_${index}`,
    isDefault: v.isDefault || false,
  })) as ProductVariant[];
};

const addVariant = () => {
  if (!newVariant.value.name || !newVariant.value.shortName) return;

  const variant: ProductVariant = {
    id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: newVariant.value.name || "",
    shortName: newVariant.value.shortName || "",
    priceModifier: newVariant.value.priceModifier || 0,
    priceModifierType: newVariant.value.priceModifierType || "fixed",
    sortOrder: variants.value.length,
    isDefault: variants.value.length === 0, // First one is default
  };

  variants.value = [...variants.value, variant];
  hasVariants.value = true;
  resetForm();
};

const updateVariant = () => {
  if (!editingVariant.value) return;

  const index = variants.value.findIndex(
    (v) => v.id === editingVariant.value?.id
  );
  if (index !== -1) {
    const updated = [...variants.value];
    updated[index] = { ...editingVariant.value };
    variants.value = updated;
  }

  editingVariant.value = null;
};

const removeVariant = (id: string) => {
  variants.value = variants.value.filter((v) => v.id !== id);
  if (variants.value.length === 0) {
    hasVariants.value = false;
  }
};

const setDefault = (id: string) => {
  variants.value = variants.value.map((v) => ({
    ...v,
    isDefault: v.id === id,
  }));
};

const moveVariant = (index: number, direction: "up" | "down") => {
  const newIndex = direction === "up" ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= variants.value.length) return;

  const updated = [...variants.value];
  const temp = updated[index]!;
  updated[index] = updated[newIndex]!;
  updated[newIndex] = temp;
  updated.forEach((v, i) => (v.sortOrder = i));
  variants.value = updated;
};

const startEdit = (variant: ProductVariant) => {
  editingVariant.value = { ...variant };
  showAddForm.value = false;
};

const cancelEdit = () => {
  editingVariant.value = null;
};

const resetForm = () => {
  newVariant.value = {
    name: "",
    shortName: "",
    priceModifier: 0,
    priceModifierType: "fixed",
    sortOrder: 0,
    isDefault: false,
  };
  showAddForm.value = false;
};

const clearAllVariants = () => {
  variants.value = [];
  hasVariants.value = false;
};
</script>

<template>
  <div class="space-y-4">
    <!-- Enable Variants Toggle -->
    <div
      class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center"
        >
          <span class="text-xl">📏</span>
        </div>
        <div>
          <h4 class="font-semibold text-gray-900 dark:text-white">
            {{ t("products.enableVariants", "Enable Size Variants") }}
          </h4>
          <p class="text-sm text-gray-500">
            {{
              t("products.variantsDescription", "Add sizes like S, M, L with different prices")
            }}
          </p>
        </div>
      </div>
      <USwitch v-model="hasVariants" />
    </div>

    <!-- Variant Editor (when enabled) -->
    <template v-if="hasVariants">
      <!-- Quick Presets -->
      <div v-if="variants.length === 0" class="space-y-3">
        <p class="text-sm text-gray-500 font-medium">
          {{ t("products.quickPresets", "Quick presets:") }}
        </p>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="preset in presetTemplates"
            :key="preset.name"
            color="neutral"
            variant="soft"
            size="sm"
            @click="applyPreset(preset)"
          >
            {{ preset.label }}
          </UButton>
        </div>
      </div>

      <!-- Existing Variants List -->
      <div v-if="variants.length > 0" class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ t("products.variantsList", "Variants") }} ({{
              variants.length
            }})
          </p>
          <UButton
            color="red"
            variant="ghost"
            size="xs"
            @click="clearAllVariants"
          >
            {{ t("common.clearAll", "Clear All") }}
          </UButton>
        </div>

        <!-- Draggable Variant Items -->
        <div class="space-y-2">
          <div
            v-for="(variant, index) in variants"
            :key="variant.id"
            class="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg group hover:border-primary-300 transition-colors"
          >
            <!-- Reorder Buttons -->
            <div
              class="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-heroicons-chevron-up"
                :disabled="index === 0"
                @click="moveVariant(index, 'up')"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-heroicons-chevron-down"
                :disabled="index === variants.length - 1"
                @click="moveVariant(index, 'down')"
              />
            </div>

            <!-- Edit Mode -->
            <template v-if="editingVariant?.id === variant.id">
              <div class="flex-1 grid grid-cols-4 gap-2">
                <UInput
                  v-model="editingVariant.shortName"
                  :placeholder="t('products.shortName', 'S')"
                  size="sm"
                />
                <UInput
                  v-model="editingVariant.name"
                  :placeholder="t('products.variantName', 'Small')"
                  size="sm"
                  class="col-span-2"
                />
                <UInput
                  v-model.number="editingVariant.priceModifier"
                  type="number"
                  :placeholder="t('products.priceModifier', '+0')"
                  size="sm"
                />
              </div>
              <UButton
                color="primary"
                variant="soft"
                size="xs"
                icon="i-heroicons-check"
                @click="updateVariant"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-heroicons-x-mark"
                @click="cancelEdit"
              />
            </template>

            <!-- View Mode -->
            <template v-else>
              <!-- Variant Info -->
              <div class="flex-1 flex items-center gap-3">
                <div
                  class="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center font-bold text-primary-600 dark:text-primary-400"
                >
                  {{ variant.shortName }}
                </div>
                <div class="flex-1">
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ variant.name }}
                    <UBadge
                      v-if="variant.isDefault"
                      color="primary"
                      size="xs"
                      class="ml-2"
                    >
                      {{ t("common.default", "Default") }}
                    </UBadge>
                  </p>
                  <p class="text-sm text-gray-500">
                    <template v-if="variant.priceModifier === 0">
                      {{ t("products.basePrice", "Base price") }}
                    </template>
                    <template v-else>
                      {{ variant.priceModifier > 0 ? "+" : "" }}
                      {{
                        variant.priceModifierType === "percentage"
                          ? `${variant.priceModifier}%`
                          : formatPrice(variant.priceModifier)
                      }}
                    </template>
                  </p>
                </div>
              </div>

              <!-- Actions -->
              <UButton
                v-if="!variant.isDefault"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="setDefault(variant.id)"
              >
                {{ t("common.setDefault", "Set Default") }}
              </UButton>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-heroicons-pencil"
                @click="startEdit(variant)"
              />
              <UButton
                color="red"
                variant="ghost"
                size="xs"
                icon="i-heroicons-trash"
                @click="removeVariant(variant.id)"
              />
            </template>
          </div>
        </div>
      </div>

      <!-- Add Custom Variant Form -->
      <div
        v-if="showAddForm"
        class="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3"
      >
        <h5 class="font-semibold text-gray-900 dark:text-white text-sm">
          {{ t("products.addVariant", "Add Custom Variant") }}
        </h5>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <UInput
            v-model="newVariant.shortName"
            :placeholder="t('products.shortName', 'S, M, L...')"
            label="Short Name"
          />
          <UInput
            v-model="newVariant.name"
            :placeholder="t('products.variantName', 'Small, Medium...')"
            label="Full Name"
          />
          <UInput
            v-model.number="newVariant.priceModifier"
            type="number"
            :placeholder="t('products.priceModifier', '0')"
            label="Price +/-"
          />
          <USelect
            v-model="newVariant.priceModifierType"
            :items="[
              { value: 'fixed', label: t('products.fixed', 'Fixed') },
              {
                value: 'percentage',
                label: t('products.percentage', 'Percentage'),
              },
            ]"
            label="Type"
          />
        </div>
        <div class="flex gap-2">
          <UButton
            color="primary"
            size="sm"
            :disabled="!newVariant.name || !newVariant.shortName"
            @click="addVariant"
          >
            <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-1" />
            {{ t("common.add", "Add") }}
          </UButton>
          <UButton color="neutral" variant="ghost" size="sm" @click="resetForm">
            {{ t("common.cancel", "Cancel") }}
          </UButton>
        </div>
      </div>

      <!-- Add Variant Button -->
      <UButton
        v-if="!showAddForm"
        color="neutral"
        variant="soft"
        size="sm"
        block
        @click="showAddForm = true"
      >
        <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-1" />
        {{ t("products.addCustomVariant", "Add Custom Variant") }}
      </UButton>
    </template>
  </div>
</template>
