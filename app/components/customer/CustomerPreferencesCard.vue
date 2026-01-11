<script setup lang="ts">
/**
 * ⚙️ Customer Preferences Card Component
 * Displays customer preferences like payment method and favorite products
 */

interface Preferences {
  preferredPayment?: string;
  favoriteProducts?: string[];
}

interface Props {
  preferences?: Preferences;
}

defineProps<Props>();

const { t } = useI18n();
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        {{ t("customers.preferences", "Preferences") }}
      </h3>
    </template>

    <div class="space-y-3 text-sm">
      <!-- Payment Preference -->
      <div>
        <p class="text-gray-500 dark:text-gray-400">
          {{ t("customers.paymentPreference", "Payment Preference") }}
        </p>
        <p
          class="font-medium text-gray-900 dark:text-white flex items-center gap-1"
        >
          <UIcon
            v-if="preferences?.preferredPayment === 'lightning'"
            name="i-heroicons-bolt"
            class="text-amber-500"
          />
          {{ preferences?.preferredPayment || "-" }}
        </p>
      </div>

      <!-- Favorite Products -->
      <div v-if="preferences?.favoriteProducts?.length">
        <p class="text-gray-500 dark:text-gray-400">
          {{ t("customers.favoriteProducts", "Favorite Products") }}
        </p>
        <div class="flex flex-wrap gap-1 mt-1">
          <span
            v-for="product in preferences.favoriteProducts"
            :key="product"
            class="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs"
          >
            {{ product }}
          </span>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="
          !preferences?.preferredPayment &&
          !preferences?.favoriteProducts?.length
        "
        class="text-gray-400 dark:text-gray-500 italic"
      >
        {{ t("customers.noPreferences", "No preferences set") }}
      </div>
    </div>
  </UCard>
</template>
