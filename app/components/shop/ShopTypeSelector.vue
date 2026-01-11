<!-- components/shop/ShopTypeSelector.vue -->
<!-- 🏪 Shop Type Selection Grid with Icons & Descriptions -->
<script setup lang="ts">
import type { ShopType, ShopTypeMeta } from '~/types';
import { SHOP_TYPE_META } from '~/data/shop-templates';

const props = defineProps<{
  modelValue: ShopType;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: ShopType): void;
}>();

const { locale } = useI18n();

// Check if current locale is Lao
const isLaoLocale = computed(() => locale.value.startsWith('lo'));

// Get localized name
const getLocalizedName = (meta: ShopTypeMeta) => {
  return isLaoLocale.value ? meta.nameLao : meta.name;
};

// Get localized description
const getLocalizedDescription = (meta: ShopTypeMeta) => {
  return isLaoLocale.value ? meta.descriptionLao : meta.description;
};

// Handle selection
const selectType = (type: ShopType) => {
  emit('update:modelValue', type);
};
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
    <button
      v-for="meta in SHOP_TYPE_META"
      :key="meta.type"
      type="button"
      class="relative group p-4 rounded-xl border-2 transition-all duration-200 text-left"
      :class="[
        modelValue === meta.type
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500/30'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 bg-white dark:bg-gray-800/50',
      ]"
      @click="selectType(meta.type)"
    >
      <!-- Selected Check -->
      <div
        v-if="modelValue === meta.type"
        class="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center"
      >
        <UIcon name="i-heroicons-check" class="w-3 h-3 text-white" />
      </div>

      <!-- Icon -->
      <div
        class="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors"
        :class="[
          modelValue === meta.type
            ? 'bg-primary-100 dark:bg-primary-800/40'
            : 'bg-gray-100 dark:bg-gray-700/50 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20',
        ]"
      >
        <UIcon
          :name="meta.icon"
          class="w-6 h-6 transition-colors"
          :class="[
            modelValue === meta.type
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400 group-hover:text-primary-500',
          ]"
        />
      </div>

      <!-- Name -->
      <h3
        class="font-semibold text-sm mb-1 transition-colors"
        :class="[
          modelValue === meta.type
            ? 'text-primary-700 dark:text-primary-300'
            : 'text-gray-900 dark:text-white',
        ]"
      >
        {{ getLocalizedName(meta) }}
      </h3>

      <!-- Description -->
      <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
        {{ getLocalizedDescription(meta) }}
      </p>
    </button>
  </div>
</template>
