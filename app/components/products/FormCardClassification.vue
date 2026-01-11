<!-- components/products/FormCardClassification.vue -->
<!-- Classification Form Card -->
<script setup lang="ts">
const { t } = useI18n();

interface FormData {
  productType: string;
  categoryId: string;
  unitId: string;
  branchId: string;
}

interface Option {
  id?: string;
  value?: string;
  name?: string;
  label?: string;
}

interface Props {
  categoryOptions: Option[];
  unitOptions: Option[];
  branchOptions: Option[];
  productTypeOptions: Array<{ value: string; label: string }>;
}

defineProps<Props>();

const emit = defineEmits<{
  "product-type-change": [type: string];
  "add-category": [];
  "add-unit": [];
}>();

const form = defineModel<FormData>({ required: true });

function onTypeChange(value: string) {
  emit("product-type-change", value);
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
  >
    <!-- Header -->
    <div
      class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-tag"
            class="w-5 h-5 text-purple-600 dark:text-purple-400"
          />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">
            {{ t("products.classification", "Classification") }}
          </h3>
          <p class="text-xs text-gray-500">
            {{
              t("products.classificationHint", "Product type, category, and unit")
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Product Type -->
        <UFormField
          :label="t('products.productType', 'Product Type')"
          name="productType"
        >
          <USelect
            v-model="form.productType"
            :items="productTypeOptions"
            label-key="label"
            value-key="value"
            class="w-full"
            :placeholder="t('products.selectProductType', 'Select type')"
            @update:model-value="onTypeChange"
          />
        </UFormField>

        <!-- Category -->
        <UFormField :label="t('products.category')" name="categoryId">
          <div class="flex gap-1">
            <USelect
              v-model="form.categoryId"
              :items="categoryOptions"
              label-key="name"
              value-key="id"
              :placeholder="t('products.selectCategory')"
              class="w-full"
            />
            <UTooltip :text="t('common.add') + ' ' + t('products.category')">
              <UButton
                icon="i-heroicons-plus"
                color="neutral"
                variant="soft"
                @click="$emit('add-category')"
              />
            </UTooltip>
          </div>
        </UFormField>

        <!-- Unit -->
        <UFormField :label="t('products.unit')" name="unitId">
          <div class="flex gap-1">
            <USelect
              v-model="form.unitId"
              :items="unitOptions"
              label-key="name"
              value-key="id"
              :placeholder="t('common.select', { name: $t('products.unit') })"
              class="w-full"
            />
            <UTooltip :text="t('common.add') + ' ' + t('products.unit')">
              <UButton
                icon="i-heroicons-plus"
                color="neutral"
                variant="soft"
                @click="$emit('add-unit')"
              />
            </UTooltip>
          </div>
        </UFormField>

        <!-- Branch -->
        <UFormField :label="t('common.branch')" name="branchId">
          <USelect
            v-model="form.branchId"
            :items="branchOptions"
            label-key="name"
            value-key="id"
            :placeholder="t('common.selectBranch')"
            class="w-full"
          />
        </UFormField>
      </div>
    </div>
  </div>
</template>
