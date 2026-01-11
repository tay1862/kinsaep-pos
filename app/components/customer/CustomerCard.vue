<script setup lang="ts">
/**
 * 👤 Customer Card Component
 * Displays customer avatar, name, tier badge, and tags
 * Reusable across list and detail pages
 */
import type { LoyaltyMember } from "~/types";

interface Props {
  customer: LoyaltyMember;
  size?: "sm" | "md" | "lg";
  showTags?: boolean;
  showTier?: boolean;
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  showTags: true,
  showTier: true,
  clickable: false,
});

const { t } = useI18n();

// Size classes for avatar
const avatarSizeClasses = computed(() => {
  const sizes = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-2xl",
  };
  return sizes[props.size];
});

// Tier colors mapping
const tierColors: Record<string, string> = {
  bronze:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  silver: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  gold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  platinum:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const tierBadgeClass = computed(() => {
  return tierColors[props.customer.tier || "bronze"] || tierColors.bronze;
});

// Get customer initials for avatar
const initials = computed(() => {
  if (!props.customer.name) return "?";
  return props.customer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
});
</script>

<template>
  <div
    class="flex items-center gap-3"
    :class="{ 'cursor-pointer hover:opacity-80 transition-opacity': clickable }"
  >
    <!-- Avatar -->
    <div
      class="rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0"
      :class="avatarSizeClasses"
    >
      <span class="font-semibold text-primary-600 dark:text-primary-400">
        {{ initials }}
      </span>
    </div>

    <!-- Info -->
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-medium text-gray-900 dark:text-white truncate">
          {{ customer.name || t("customers.unnamed") }}
        </span>

        <!-- Tier Badge -->
        <span
          v-if="showTier && customer.tier"
          class="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
          :class="tierBadgeClass"
        >
          {{ customer.tier }}
        </span>
      </div>

      <!-- Tags -->
      <div
        v-if="showTags && customer.tags?.length"
        class="flex flex-wrap gap-1 mt-1"
      >
        <span
          v-for="tag in customer.tags.slice(0, 3)"
          :key="tag"
          class="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
        >
          {{ tag }}
        </span>
        <span
          v-if="customer.tags.length > 3"
          class="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
        >
          +{{ customer.tags.length - 3 }}
        </span>
      </div>

      <!-- Secondary Info (email/phone) for larger sizes -->
      <p
        v-if="size !== 'sm' && (customer.email || customer.phone)"
        class="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5"
      >
        {{ customer.email || customer.phone }}
      </p>
    </div>
  </div>
</template>
