<!-- components/shop/ProductTemplatePreview.vue -->
<!-- 📦 Preview of Product Templates for Selected Shop Type -->
<script setup lang="ts">
import type { ShopType, CategoryTemplate, ProductTemplate } from '~/types';
import { getShopTypeConfig } from '~/data/shop-templates';

const props = defineProps<{
  shopType: ShopType;
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const { t, locale } = useI18n();
const currency = useCurrency();

// Check if current locale is Lao
const isLaoLocale = computed(() => locale.value.startsWith('lo'));

// Get template config for selected shop type
const templateConfig = computed(() => getShopTypeConfig(props.shopType));

// Get localized category name
const getCategoryName = (cat: CategoryTemplate) => {
  return isLaoLocale.value && cat.nameLao ? cat.nameLao : cat.name;
};

// Get localized product name
const getProductName = (prod: ProductTemplate) => {
  return isLaoLocale.value && prod.nameLao ? prod.nameLao : prod.name;
};

// Group products by category
const productsByCategory = computed(() => {
  if (!templateConfig.value) return {};
  
  const grouped: Record<string, ProductTemplate[]> = {};
  
  templateConfig.value.categories.forEach((cat) => {
    grouped[cat.id] = templateConfig.value!.products.filter(
      (p) => p.categoryId === cat.id
    );
  });
  
  return grouped;
});

// Stats
const stats = computed(() => {
  if (!templateConfig.value) return { categories: 0, products: 0 };
  return {
    categories: templateConfig.value.categories.length,
    products: templateConfig.value.products.length,
  };
});
</script>

<template>
  <div class="space-y-4">
    <!-- Enable Templates Toggle -->
    <div
      class="flex items-center justify-between p-4 rounded-xl border transition-colors"
      :class="[
        modelValue
          ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50',
      ]"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg flex items-center justify-center"
          :class="[
            modelValue
              ? 'bg-primary-100 dark:bg-primary-800/40'
              : 'bg-gray-100 dark:bg-gray-700/50',
          ]"
        >
          <UIcon
            name="i-heroicons-sparkles"
            class="w-5 h-5"
            :class="[
              modelValue ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500',
            ]"
          />
        </div>
        <div>
          <p class="font-semibold text-gray-900 dark:text-white text-sm">
            {{ t('shop.setup.applyTemplates') }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ t('shop.setup.applyTemplatesDesc', { categories: stats.categories, products: stats.products }) }}
          </p>
        </div>
      </div>
      <USwitch
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>

    <!-- Template Preview (shown when enabled) -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="modelValue && templateConfig" class="space-y-3">
        <!-- Categories Preview -->
        <div
          v-for="category in templateConfig.categories"
          :key="category.id"
          class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <!-- Category Header -->
          <div class="px-3 py-2 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <span v-if="category.icon" class="text-base">{{ category.icon }}</span>
              <span class="font-medium text-sm text-gray-900 dark:text-white">
                {{ getCategoryName(category) }}
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                {{ productsByCategory[category.id]?.length || 0 }} {{ t('common.items') }}
              </span>
            </div>
          </div>

          <!-- Products List -->
          <div v-if="productsByCategory[category.id]?.length" class="divide-y divide-gray-100 dark:divide-gray-700/50">
            <div
              v-for="product in productsByCategory[category.id]?.slice(0, 3)"
              :key="product.id"
              class="px-3 py-2 flex items-center justify-between"
            >
              <span class="text-sm text-gray-700 dark:text-gray-300">
                {{ getProductName(product) }}
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400 font-mono">
                {{ currency.format(product.price) }}
              </span>
            </div>
            <!-- More indicator -->
            <div
              v-if="(productsByCategory[category.id]?.length || 0) > 3"
              class="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500"
            >
              +{{ (productsByCategory[category.id]?.length || 0) - 3 }} {{ t('common.more') }}
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-else
            class="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 italic"
          >
            {{ t('shop.setup.noTemplateProducts') }}
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
