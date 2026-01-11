<!-- components/products/FormCardExpiry.vue -->
<!-- Expiry Settings Form Card -->
<script setup lang="ts">
const { t } = useI18n();

interface FormData {
  hasExpiry: boolean;
  trackLots: boolean;
  requiresExpiryDate: boolean;
  defaultShelfLifeDays: number | undefined;
  expiryWarningDays: number | undefined;
  storageType: string | undefined;
}

const form = defineModel<FormData>({ required: true });

const storageTypeOptions = computed(() => [
  {
    value: "ambient",
    label: t("products.storageTypes.ambient"),
    icon: "i-heroicons-sun",
  },
  {
    value: "refrigerated",
    label: t("products.storageTypes.refrigerated"),
    icon: "i-heroicons-snowflake",
  },
  {
    value: "frozen",
    label: t("products.storageTypes.frozen"),
    icon: "i-heroicons-cube",
  },
  {
    value: "controlled",
    label: t("products.storageTypes.controlled"),
    icon: "i-heroicons-shield-check",
  },
]);
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <UIcon name="i-heroicons-clock" class="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">
            {{ t("products.expirySettings", "Expiry & Lot Tracking") }}
          </h3>
          <p class="text-xs text-gray-500">
            {{
              t("products.expirySettingsHint", "Shelf life and batch management")
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6 space-y-4">
      <!-- Has Expiry Toggle -->
      <div class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-calendar" class="w-5 h-5 text-gray-500" />
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ t("products.hasExpiry", "Has Expiry Date") }}
            </p>
            <p class="text-xs text-gray-500">
              {{ t("products.hasExpiryHint", "Product can expire") }}
            </p>
          </div>
        </div>
        <USwitch v-model="form.hasExpiry" />
      </div>

      <!-- Expiry Settings (shown when hasExpiry is true) -->
      <template v-if="form.hasExpiry">
        <!-- Track Lots Toggle -->
        <div class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-queue-list" class="w-5 h-5 text-gray-500" />
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ t("products.trackLots", "Track Lots/Batches") }}
              </p>
              <p class="text-xs text-gray-500">
                {{ t("products.trackLotsHint", "Enable FIFO/FEFO tracking") }}
              </p>
            </div>
          </div>
          <USwitch v-model="form.trackLots" />
        </div>

        <!-- Requires Expiry Date Toggle -->
        <div class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-gray-500" />
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ t("products.requiresExpiryDate", "Require Expiry Date") }}
              </p>
              <p class="text-xs text-gray-500">
                {{
                  t(
                    "products.requiresExpiryDateHint",
                    "Must enter expiry when receiving stock"
                  )
                }}
              </p>
            </div>
          </div>
          <USwitch v-model="form.requiresExpiryDate" />
        </div>

        <!-- Shelf Life and Warning Days -->
        <div class="grid grid-cols-2 gap-4 pt-2">
          <UFormField :label="t('products.defaultShelfLifeDays', 'Shelf Life (days)')" name="defaultShelfLifeDays">
            <UInput v-model.number="form.defaultShelfLifeDays" type="number" placeholder="30">
              <template #trailing>
                <span class="text-xs text-gray-500">{{
                  t("common.days", "days")
                  }}</span>
              </template>
            </UInput>
          </UFormField>

          <UFormField :label="t('products.expiryWarningDays', 'Warning Before (days)')" name="expiryWarningDays">
            <UInput v-model.number="form.expiryWarningDays" type="number" placeholder="7">
              <template #trailing>
                <span class="text-xs text-gray-500">
                  {{ t("common.days", "days") }}
                </span>
              </template>
            </UInput>
          </UFormField>
        </div>

        <!-- Storage Type -->
        <UFormField :label="t('products.storageType', 'Storage Type')" name="storageType">
          <USelect v-model="form.storageType" :items="storageTypeOptions" label-key="label" value-key="value"
            :placeholder="t('products.selectStorageType', 'Select storage type')
              " />
        </UFormField>
      </template>
    </div>
  </div>
</template>
