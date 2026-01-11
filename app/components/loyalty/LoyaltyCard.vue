<!-- components/loyalty/LoyaltyCard.vue -->
<!-- 🎟️ Member Loyalty Card Component -->
<script setup lang="ts">
import type { LoyaltyMember } from '~/types';

const props = defineProps<{
  member: LoyaltyMember;
  showActions?: boolean;
}>();

const emit = defineEmits<{
  sendReward: [memberId: string];
}>();

const getTierColor = (tier: LoyaltyMember['tier']): string => {
  switch (tier) {
    case 'bronze': return 'from-orange-700 to-orange-900';
    case 'silver': return 'from-gray-400 to-gray-600';
    case 'gold': return 'from-yellow-500 to-yellow-700';
    case 'platinum': return 'from-purple-400 to-purple-600';
    default: return 'from-gray-600 to-gray-800';
  }
};

const getTierIcon = (tier: LoyaltyMember['tier']): string => {
  switch (tier) {
    case 'bronze': return '🥉';
    case 'silver': return '🥈';
    case 'gold': return '🥇';
    case 'platinum': return '💎';
    default: return '🎫';
  }
};

const formatPoints = (points: number): string => {
  if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`;
  if (points >= 1000) return `${(points / 1000).toFixed(1)}K`;
  return points.toString();
};

const shortPubkey = computed(() => {
  const pk = props.member.nostrPubkey;
  return `${pk.slice(0, 8)}...${pk.slice(-8)}`;
});

const pendingRewards = computed(() => 
  props.member.zapRewards.filter(r => !r.claimed).reduce((sum, r) => sum + r.amount, 0)
);
</script>

<template>
  <div 
    class="rounded-2xl p-1 overflow-hidden"
    :class="`bg-gradient-to-br ${getTierColor(member.tier)}`"
  >
    <div class="bg-gray-900/95 rounded-xl p-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <span class="text-3xl">{{ getTierIcon(member.tier) }}</span>
          <div>
            <div class="font-bold capitalize">{{ member.tier }} Member</div>
            <div class="text-xs text-gray-400 font-mono">{{ shortPubkey }}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold text-amber-400">
            {{ formatPoints(member.points) }}
          </div>
          <div class="text-xs text-gray-400">points</div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="bg-gray-800 rounded-lg p-2 text-center">
          <div class="text-lg font-bold">{{ member.visitCount }}</div>
          <div class="text-xs text-gray-400">Visits</div>
        </div>
        <div class="bg-gray-800 rounded-lg p-2 text-center">
          <div class="text-lg font-bold">₭{{ (member.totalSpent / 1000).toFixed(0) }}K</div>
          <div class="text-xs text-gray-400">Total Spent</div>
        </div>
        <div class="bg-gray-800 rounded-lg p-2 text-center">
          <div class="text-lg font-bold text-amber-400">{{ pendingRewards }}</div>
          <div class="text-xs text-gray-400">Sats Pending</div>
        </div>
      </div>

      <!-- Progress to Next Tier -->
      <div class="mb-4">
        <div class="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progress to next tier</span>
          <span>{{ formatPoints(member.points) }} / 10K</span>
        </div>
        <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
            :style="{ width: `${Math.min(member.points / 100, 100)}%` }"
          />
        </div>
      </div>

      <!-- Recent Rewards -->
      <div v-if="member.zapRewards.length > 0" class="mb-4">
        <div class="text-xs text-gray-400 mb-2">Recent Rewards</div>
        <div class="space-y-1">
          <div 
            v-for="reward in member.zapRewards.slice(-3)" 
            :key="reward.id"
            class="flex items-center justify-between text-sm bg-gray-800 rounded-lg px-3 py-2"
          >
            <span class="flex items-center gap-2">
              <span>⚡</span>
              <span>{{ reward.reason }}</span>
            </span>
            <span class="text-amber-400 font-medium">+{{ reward.amount }} sats</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="showActions" class="flex gap-2">
        <UButton
          block
          size="sm"
          color="primary"
          @click="emit('sendReward', member.id)"
        >
          ⚡ Send Reward
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
        >
          View History
        </UButton>
      </div>

      <!-- Last Visit -->
      <div class="text-center text-xs text-gray-500 mt-3">
        Last visit: {{ new Date(member.lastVisit).toLocaleDateString() }}
      </div>
    </div>
  </div>
</template>
