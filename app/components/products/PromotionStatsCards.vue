<!-- components/products/PromotionStatsCards.vue -->
<script setup lang="ts">
import type { Promotion } from "~/types";

interface Props {
  promotions: Promotion[];
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const { t } = useI18n();

// Computed stats
const totalPromotions = computed(() => props.promotions.length);
const activePromotions = computed(
  () => props.promotions.filter((p) => p.status === "active").length
);
const totalUses = computed(() =>
  props.promotions.reduce((total, p) => total + p.usageCount, 0)
);
</script>

<template>
  <div class="px-4">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <!-- Total Promotions Card -->
      <CommonStatCard
        :icon="'i-heroicons-gift'"
        icon-color="blue"
        :label="t('common.total', 'Total')"
        :value="totalPromotions"
        :loading="isLoading"
      />

      <!-- Active Promotions Card -->
      <CommonStatCard
        :icon="'i-heroicons-check-circle'"
        icon-color="green"
        :label="t('common.active', 'Active')"
        :value="activePromotions"
        :loading="isLoading"
      />

      <!-- Total Uses Card -->
      <CommonStatCard
        :icon="'i-heroicons-chart-bar'"
        icon-color="purple"
        :label="t('promotions.totalUses', 'Uses')"
        :value="totalUses"
        :loading="isLoading"
      />
    </div>
  </div>
</template>
