<script setup lang="ts">
/**
 * 🏆 Customer Loyalty Card Component
 * Displays tier badge, points, and progress to next tier
 */

interface Props {
  tier: string;
  points: number;
  visitCount?: number;
  joinedAt?: string;
  lastVisit?: string;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  tier: "bronze",
  points: 0,
  visitCount: 0,
  compact: false,
});

const { t } = useI18n();

// Tier colors
const tierColors: Record<string, string> = {
  bronze:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  silver: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  gold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  platinum:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

// Tier thresholds for progress calculation
const tierThresholds = {
  bronze: { min: 0, max: 500 },
  silver: { min: 500, max: 1500 },
  gold: { min: 1500, max: 5000 },
  platinum: { min: 5000, max: Infinity },
};

const currentTier = computed(() => props.tier || "bronze");

const tierBadgeClass = computed(() => {
  return tierColors[currentTier.value] || tierColors.bronze;
});

// Calculate progress to next tier
const nextTierProgress = computed(() => {
  if (currentTier.value === "platinum") return 100;

  const nextThreshold: Record<string, number> = {
    bronze: tierThresholds.silver.min,
    silver: tierThresholds.gold.min,
    gold: tierThresholds.platinum.min,
    platinum: tierThresholds.platinum.min,
  };

  const threshold = nextThreshold[currentTier.value] || 500;
  return Math.min(100, Math.round((props.points / threshold) * 100));
});

// Points needed for next tier
const pointsToNextTier = computed(() => {
  if (currentTier.value === "platinum") return 0;

  const nextThreshold: Record<string, number> = {
    bronze: tierThresholds.silver.min,
    silver: tierThresholds.gold.min,
    gold: tierThresholds.platinum.min,
  };

  const threshold = nextThreshold[currentTier.value] || 500;
  return Math.max(0, threshold - props.points);
});

const nextTierName = computed(() => {
  const tiers: Record<string, string> = {
    bronze: "silver",
    silver: "gold",
    gold: "platinum",
    platinum: "platinum",
  };
  return tiers[currentTier.value] || "silver";
});
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        {{ t("loyalty.title") }}
      </h3>
    </template>

    <div class="space-y-4">
      <!-- Tier Badge -->
      <div class="text-center">
        <div
          class="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
          :class="tierBadgeClass"
        >
          <UIcon name="i-heroicons-star" class="w-10 h-10" />
        </div>
        <h4
          class="mt-2 text-lg font-bold text-gray-900 dark:text-white capitalize"
        >
          {{ currentTier }}
        </h4>
        <p class="text-2xl font-bold text-amber-600">
          {{ points.toLocaleString() }} {{ t("loyalty.points") }}
        </p>
      </div>

      <!-- Progress to Next Tier -->
      <div v-if="currentTier !== 'platinum'">
        <div class="flex justify-between text-sm mb-1">
          <span class="text-gray-500 dark:text-gray-400">
            {{ t("loyalty.progressToNext", "Progress to next tier") }}
          </span>
          <span class="font-medium text-gray-900 dark:text-white">
            {{ nextTierProgress }}%
          </span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            class="bg-amber-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${nextTierProgress}%` }"
          />
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ pointsToNextTier.toLocaleString() }}
          {{ t("loyalty.pointsToReach", "points to reach") }}
          <span class="capitalize font-medium">{{ nextTierName }}</span>
        </p>
      </div>

      <!-- Stats -->
      <div
        v-if="!compact"
        class="text-sm text-gray-500 dark:text-gray-400 space-y-1"
      >
        <p v-if="visitCount !== undefined">
          <span class="text-gray-700 dark:text-gray-300"
            >{{ t("customers.visits") }}:</span
          >
          {{ visitCount }}
        </p>
        <p v-if="joinedAt">
          <span class="text-gray-700 dark:text-gray-300"
            >{{ t("customers.joinedAt", "Joined") }}:</span
          >
          {{ joinedAt }}
        </p>
        <p v-if="lastVisit">
          <span class="text-gray-700 dark:text-gray-300"
            >{{ t("customers.lastVisit") }}:</span
          >
          {{ lastVisit }}
        </p>
      </div>
    </div>
  </UCard>
</template>
