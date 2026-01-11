<!-- components/products/FormCardInventory.vue -->
<!-- Inventory Settings Form Card -->
<script setup lang="ts">
const { t } = useI18n();

interface FormData {
  stock: number;
  minStock: number;
  trackStock: boolean;
}

interface Props {
  unitSymbol?: string;
}

withDefaults(defineProps<Props>(), {
  unitSymbol: "units",
});

const form = defineModel<FormData>({ required: true });
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
          class="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-cube"
            class="w-5 h-5 text-cyan-600 dark:text-cyan-400"
          />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">
            {{ t("inventory.inventory", "Inventory") }}
          </h3>
          <p class="text-xs text-gray-500">
            {{ t("products.inventoryHint", "Stock levels and tracking") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6 space-y-4">
      <!-- Track Stock Toggle -->
      <div
        class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
      >
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-archive-box" class="w-5 h-5 text-gray-500" />
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ t("products.trackStock", "Track Stock") }}
            </p>
            <p class="text-xs text-gray-500">
              {{ t("products.trackStockHint", "Monitor inventory levels") }}
            </p>
          </div>
        </div>
        <USwitch v-model="form.trackStock" />
      </div>

      <!-- Stock Fields -->
      <div v-if="form.trackStock" class="grid grid-cols-2 gap-4 pt-2">
        <!-- Current Stock -->
        <UFormField
          :label="t('products.currentStock', 'Current Stock')"
          name="stock"
        >
          <UInput
            v-model.number="form.stock"
            type="number"
            placeholder="0"
            class="w-full"
          >
            <template #trailing>
              <span class="text-xs text-gray-500">{{ unitSymbol }}</span>
            </template>
          </UInput>
        </UFormField>

        <!-- Min Stock -->
        <UFormField
          :label="t('products.minStock', 'Minimum Stock')"
          name="minStock"
        >
          <UInput
            v-model.number="form.minStock"
            type="number"
            placeholder="0"
            class="w-full"
          >
            <template #trailing>
              <span class="text-xs text-gray-500">{{ unitSymbol }}</span>
            </template>
          </UInput>
          <template #hint>
            <span class="text-xs text-gray-500">
              {{
                t(
                  "products.minStockHint",
                  "Alert when stock falls below this level"
                )
              }}
            </span>
          </template>
        </UFormField>
      </div>
    </div>
  </div>
</template>
