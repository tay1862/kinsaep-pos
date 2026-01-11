<!-- components/dashboard/DashboardMarketplaceSetup.vue -->
<!-- 🌐 Marketplace Setup Notification Widget -->
<script setup lang="ts">
const { t } = useI18n();
const shop = useShop();

// Check what marketplace fields are missing
const missingFields = computed(() => {
  const config = shop.shopConfig.value;
  if (!config) return [];

  const missing: Array<{ key: string; label: string; icon: string }> = [];

  // Only check if shop is public
  if (config.visibility !== "public") return missing;

  // Check location
  if (!config.geolocation) {
    missing.push({
      key: "location",
      label: t("marketplace.setup.location", "Location"),
      icon: "i-heroicons-map-pin",
    });
  }

  // Check business hours
  if (!config.businessHours) {
    missing.push({
      key: "hours",
      label: t("marketplace.setup.hours", "Business Hours"),
      icon: "i-heroicons-clock",
    });
  }

  // Check services
  if (!config.services || config.services.length === 0) {
    missing.push({
      key: "services",
      label: t("shop.services", "Services"),
      icon: "i-heroicons-cube",
    });
  }

  // Check description
  if (!config.marketplaceDescription) {
    missing.push({
      key: "description",
      label: t("common.description", "Description"),
      icon: "i-heroicons-document-text",
    });
  }

  // Check Lightning address
  if (!config.lud16) {
    missing.push({
      key: "lightning",
      label: t("setting.lightning", "Lightning Address"),
      icon: "i-heroicons-bolt",
    });
  }

  // Check phone
  if (!config.phone) {
    missing.push({
      key: "phone",
      label: t("common.phone", "Phone"),
      icon: "i-heroicons-phone",
    });
  }

  return missing;
});

// Show widget if public and has missing fields
const shouldShow = computed(() => {
  const config = shop.shopConfig.value;
  return (
    config?.visibility === "public" &&
    config?.isListed &&
    missingFields.value.length > 0
  );
});

// Completion percentage
const completionPercent = computed(() => {
  const totalFields = 6; // location, hours, services, description, lightning, phone
  const completedFields = totalFields - missingFields.value.length;
  return Math.round((completedFields / totalFields) * 100);
});

// Dismiss state
const isDismissed = ref(false);
const dismissKey = "marketplace-setup-dismissed";

// Check if dismissed
onMounted(() => {
  if (import.meta.client) {
    isDismissed.value = localStorage.getItem(dismissKey) === "true";
  }
});

const dismiss = () => {
  isDismissed.value = true;
  if (import.meta.client) {
    localStorage.setItem(dismissKey, "true");
  }
};

const goToSettings = () => {
  navigateTo("/settings/marketplace");
};
</script>

<template>
  <div
    v-if="shouldShow && !isDismissed"
    class="bg-linear-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-6 relative overflow-hidden"
  >
    <!-- Background decoration -->
    <div
      class="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"
    />

    <!-- Close button -->
    <button
      type="button"
      class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
      @click="dismiss"
    >
      <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
    </button>

    <div class="relative">
      <!-- Header -->
      <div class="flex items-start gap-4 mb-4">
        <div
          class="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0"
        >
          <UIcon name="i-heroicons-globe-alt" class="w-6 h-6 text-white" />
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {{
              t("marketplace.setup.title", "Complete Your Marketplace Profile")
            }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{
              t(
                "marketplace.setup.subtitle",
                "Help customers discover your store by completing these details"
              )
            }}
          </p>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
            {{ t("marketplace.setup.progress", "Profile Completion") }}
          </span>
          <span class="text-xs font-bold text-blue-600 dark:text-blue-400">
            {{ completionPercent }}%
          </span>
        </div>
        <div
          class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        >
          <div
            class="h-full bg-linear-to-r from-blue-500 to-purple-500 transition-all duration-500"
            :style="{ width: `${completionPercent}%` }"
          />
        </div>
      </div>

      <!-- Missing fields -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        <div
          v-for="field in missingFields.slice(0, 6)"
          :key="field.key"
          class="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <UIcon :name="field.icon" class="w-4 h-4 text-blue-500" />
          <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
            {{ field.label }}
          </span>
        </div>
      </div>

      <!-- Action button -->
      <UButton
        color="primary"
        size="lg"
        icon="i-heroicons-arrow-right"
        trailing
        @click="goToSettings"
      >
        {{ t("marketplace.setup.action", "Complete Profile") }}
      </UButton>
    </div>
  </div>
</template>
