<!-- components/dashboard/DashboardLowStock.vue -->
<!-- ⚠️ Low Stock Alert List -->
<script setup lang="ts">
import type { Product } from "~/types";

defineProps<{
  products: Product[];
}>();

const { t } = useI18n();
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div
          class="w-6 h-6 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="w-3 h-3 text-amber-600 dark:text-amber-400"
          />
        </div>
        <h3 class="font-medium text-gray-900 dark:text-white text-sm">
          {{ t("dashboard.lowStock") }}
        </h3>
      </div>
      <NuxtLinkLocale
        to="/inventory"
        class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
      >
        {{ t("common.viewAll") }}
      </NuxtLinkLocale>
    </div>

    <div v-if="products.length === 0" class="text-center py-6">
      <div
        class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2"
      >
        <UIcon
          name="i-heroicons-check-circle"
          class="w-4 h-4 text-green-600 dark:text-green-400"
        />
      </div>
      <p class="text-xs text-green-600 dark:text-green-400">
        {{ t("dashboard.allStocked") }}
      </p>
    </div>
    <div v-else class="space-y-1.5">
      <div
        v-for="product in products"
        :key="product.id"
        class="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/10"
      >
        <div class="flex items-center gap-2">
          <div
            class="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-cube"
              class="w-3.5 h-3.5 text-red-600 dark:text-red-400"
            />
          </div>
          <p class="text-sm text-gray-900 dark:text-white">
            {{ product.name }}
          </p>
        </div>
        <div class="text-right">
          <p
            class="text-lg font-semibold text-red-600 dark:text-red-400 tabular-nums"
          >
            {{ product.stock }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
