<script setup lang="ts">
/**
 * 📋 Customer Activity Log Component
 * Displays customer activity timeline
 */

interface Activity {
  id: number | string;
  date: string;
  type: string;
  description: string;
  icon?: string;
}

interface Props {
  activities: Activity[];
}

defineProps<Props>();

const { t } = useI18n();

// Activity type to icon mapping
const typeIcons: Record<string, string> = {
  order: "i-heroicons-shopping-cart",
  payment: "i-heroicons-credit-card",
  loyalty: "i-heroicons-star",
  reward: "i-heroicons-gift",
  zap: "i-heroicons-bolt",
  visit: "i-heroicons-building-storefront",
  message: "i-heroicons-chat-bubble-left",
  default: "i-heroicons-clock",
};

// Activity type to color mapping
const typeColors: Record<string, string> = {
  order: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  payment:
    "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  loyalty:
    "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  reward:
    "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  zap: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
  visit: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  message:
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  default: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

const getIcon = (activity: Activity) => {
  return activity.icon || typeIcons[activity.type] || typeIcons.default;
};

const getColor = (type: string) => {
  return typeColors[type] || typeColors.default;
};
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        {{ t("customers.tabs.activity", "Activity") }}
      </h3>
    </template>

    <!-- Empty State -->
    <div
      v-if="activities.length === 0"
      class="text-center py-8 text-gray-500 dark:text-gray-400"
    >
      <UIcon
        name="i-heroicons-clock"
        class="w-12 h-12 mx-auto mb-2 opacity-50"
      />
      <p>{{ t("customers.noActivity", "No activity yet") }}</p>
    </div>

    <!-- Activity Timeline -->
    <div v-else class="space-y-4">
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="flex items-start gap-3"
      >
        <!-- Icon -->
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          :class="getColor(activity.type)"
        >
          <UIcon :name="getIcon(activity)" class="w-4 h-4" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-900 dark:text-white">
            {{ activity.description }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ activity.date }}
          </p>
        </div>
      </div>
    </div>

    <!-- Load More -->
    <div v-if="activities.length >= 10" class="mt-4 text-center">
      <UButton variant="ghost" size="sm">
        {{ t("common.loadMore", "Load more") }}
      </UButton>
    </div>
  </UCard>
</template>
