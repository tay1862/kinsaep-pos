<!-- components/products/FormCardStatus.vue -->
<!-- Product Status Form Card -->
<script setup lang="ts">
const { t } = useI18n();

interface FormData {
  status: "active" | "inactive";
  isPublic?: boolean;
}

const form = defineModel<FormData>({ required: true });

const isActive = computed({
  get: () => form.value.status === "active",
  set: (val: boolean) => {
    form.value.status = val ? "active" : "inactive";
  },
});

const isPublic = computed({
  get: () => form.value.isPublic !== false,
  set: (val: boolean) => {
    form.value.isPublic = val;
  },
});
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
          class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-check-circle"
            class="w-5 h-5 text-emerald-600 dark:text-emerald-400"
          />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">
            {{ t("products.status", "Status") }}
          </h3>
          <p class="text-xs text-gray-500">
            {{ t("products.statusHint", "Product visibility") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6 space-y-4">
      <!-- Active/Inactive Toggle -->
      <div
        class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50"
      >
        <div class="flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
            :class="
              isActive
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-gray-200 dark:bg-gray-700'
            "
          >
            <UIcon
              :name="
                isActive ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'
              "
              class="w-6 h-6 transition-colors"
              :class="
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-500'
              "
            />
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{
                isActive
                  ? t("products.active", "Active")
                  : t("products.inactive", "Inactive")
              }}
            </p>
            <p class="text-sm text-gray-500">
              {{
                isActive
                  ? t("products.activeHint", "Product is visible and can be sold")
                  : t("products.inactiveHint", "Product is hidden from POS")
              }}
            </p>
          </div>
        </div>
        <USwitch
          v-model="isActive"
          :on-icon="'i-heroicons-check'"
          :off-icon="'i-heroicons-x-mark'"
        />
      </div>

      <!-- Public/Private Toggle -->
      <div
        class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50"
      >
        <div class="flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
            :class="
              isPublic
                ? 'bg-blue-100 dark:bg-blue-900/30'
                : 'bg-orange-100 dark:bg-orange-900/30'
            "
          >
            <UIcon
              :name="
                isPublic ? 'i-heroicons-globe-alt' : 'i-heroicons-lock-closed'
              "
              class="w-6 h-6 transition-colors"
              :class="
                isPublic
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-orange-600 dark:text-orange-400'
              "
            />
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{
                isPublic
                  ? t("products.public", "Public")
                  : t("products.private", "Private")
              }}
            </p>
            <p class="text-sm text-gray-500">
              {{
                isPublic
                  ? t("products.publicHint", "Visible on customer QR menu")
                  : t("products.privateHint", "Only visible to staff in POS")
              }}
            </p>
          </div>
        </div>
        <USwitch
          v-model="isPublic"
          :on-icon="'i-heroicons-eye'"
          :off-icon="'i-heroicons-eye-slash'"
        />
      </div>
    </div>
  </div>
</template>
