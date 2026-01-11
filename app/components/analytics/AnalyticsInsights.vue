<!-- components/analytics/AnalyticsInsights.vue -->
<!-- 🧠 AI-Powered Insights Dashboard -->
<script setup lang="ts">
import type { SalesInsight } from '~/types';

defineProps<{
  insights: SalesInsight[];
  isLoading?: boolean;
}>();

const getInsightIcon = (type: SalesInsight['type']): string => {
  switch (type) {
    case 'upsell': return '💡';
    case 'trend': return '📈';
    case 'alert': return '⚠️';
    case 'recommendation': return '🎯';
    default: return '📊';
  }
};

const getInsightColor = (type: SalesInsight['type']): string => {
  switch (type) {
    case 'upsell': return 'bg-purple-500/20 border-purple-500/30 text-purple-400';
    case 'trend': return 'bg-green-500/20 border-green-500/30 text-green-400';
    case 'alert': return 'bg-red-500/20 border-red-500/30 text-red-400';
    case 'recommendation': return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
    default: return 'bg-gray-500/20 border-gray-500/30 text-gray-400';
  }
};

const formatConfidence = (confidence: number): string => {
  return `${Math.round(confidence * 100)}%`;
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <span>🧠</span>
        AI Insights
      </h3>
      <UBadge v-if="insights.length" color="primary" variant="subtle">
        {{ insights.length }} insights
      </UBadge>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse bg-gray-800 rounded-xl p-4 h-24" />
    </div>

    <!-- Empty State -->
    <div v-else-if="!insights.length" class="text-center py-8 text-gray-500">
      <span class="text-4xl block mb-3">📊</span>
      <p>No insights yet</p>
      <p class="text-sm mt-1">Insights will appear as you make more sales</p>
    </div>

    <!-- Insights List -->
    <div v-else class="space-y-3">
      <div
        v-for="insight in insights"
        :key="insight.createdAt"
        class="rounded-xl p-4 border transition-all hover:scale-[1.02]"
        :class="getInsightColor(insight.type)"
      >
        <div class="flex items-start gap-3">
          <span class="text-2xl">{{ getInsightIcon(insight.type) }}</span>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold">{{ insight.title }}</h4>
              <span class="text-xs opacity-60">
                {{ formatConfidence(insight.confidence) }} confidence
              </span>
            </div>
            <p class="text-sm mt-1 opacity-80">{{ insight.description }}</p>
            
            <!-- Action button for certain types -->
            <div class="mt-3">
              <UButton
                v-if="insight.type === 'alert'"
                size="xs"
                color="neutral"
                variant="soft"
              >
                View Details
              </UButton>
              <UButton
                v-if="insight.type === 'upsell'"
                size="xs"
                color="primary"
                variant="soft"
              >
                Create Combo
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 gap-3 mt-6">
      <div class="bg-gray-800 rounded-xl p-4 text-center">
        <div class="text-2xl font-bold text-green-400">
          {{ insights.filter(i => i.type === 'trend').length }}
        </div>
        <div class="text-xs text-gray-400 mt-1">Positive Trends</div>
      </div>
      <div class="bg-gray-800 rounded-xl p-4 text-center">
        <div class="text-2xl font-bold text-red-400">
          {{ insights.filter(i => i.type === 'alert').length }}
        </div>
        <div class="text-xs text-gray-400 mt-1">Alerts</div>
      </div>
    </div>
  </div>
</template>
