// composables/use-loyalty.ts
// 🎟️ Loyalty & Rewards System via Nostr Zaps

import { ref, computed } from 'vue';
import type { 
  LoyaltyMember, 
  LoyaltyProgram, 
  ZapReward,
  Order 
} from '~/types';

export const useLoyalty = () => {
  const _nostr = useNuxtApp().$nostr;

  // State
  const members = ref<Map<string, LoyaltyMember>>(new Map());
  const currentMember = ref<LoyaltyMember | null>(null);
  const program = ref<LoyaltyProgram | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Initialize loyalty program
   */
  const initProgram = (merchantPubkey: string) => {
    program.value = {
      id: 'default',
      merchantPubkey,
      name: 'BitSpace Rewards',
      pointsPerSat: 1, // 1 point per sat spent
      rewardTiers: [
        { name: 'Bronze', minPoints: 0, benefits: ['1% back in sats'], zapMultiplier: 1 },
        { name: 'Silver', minPoints: 10000, benefits: ['2% back in sats', 'Priority service'], zapMultiplier: 1.5 },
        { name: 'Gold', minPoints: 50000, benefits: ['3% back in sats', 'Exclusive offers', 'Free upgrades'], zapMultiplier: 2 },
        { name: 'Platinum', minPoints: 100000, benefits: ['5% back in sats', 'VIP access', 'Birthday bonus'], zapMultiplier: 3 },
      ],
      isActive: true,
    };
  };

  /**
   * Register or get member by Nostr pubkey
   */
  const getMember = async (nostrPubkey: string): Promise<LoyaltyMember> => {
    // Check cache
    if (members.value.has(nostrPubkey)) {
      const member = members.value.get(nostrPubkey)!;
      currentMember.value = member;
      return member;
    }

    // Check Nostr for existing membership (could query NIP-78 app data)
    // For now, create new member
    const member: LoyaltyMember = {
      id: crypto.randomUUID(),
      nostrPubkey,
      points: 0,
      tier: 'bronze',
      totalSpent: 0,
      visitCount: 0,
      lastVisit: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
      zapRewards: [],
    };

    members.value.set(nostrPubkey, member);
    currentMember.value = member;

    return member;
  };

  /**
   * Add points for order
   */
  const addPointsForOrder = async (
    member: LoyaltyMember, 
    order: Order
  ): Promise<{ points: number; newTier?: string }> => {
    if (!program.value) {
      return { points: 0 };
    }

    // Calculate points (based on sats spent)
    const satsSpent = order.totalSats || 0;
    const pointsEarned = Math.floor(satsSpent * program.value.pointsPerSat);

    // Update member
    member.points += pointsEarned;
    member.totalSpent += order.total;
    member.visitCount += 1;
    member.lastVisit = new Date().toISOString();

    // Check for tier upgrade
    const newTier = calculateTier(member.points);
    const tierChanged = newTier !== member.tier;
    
    if (tierChanged) {
      member.tier = newTier;
    }

    // Update cache
    members.value.set(member.nostrPubkey, member);

    return {
      points: pointsEarned,
      newTier: tierChanged ? newTier : undefined,
    };
  };

  /**
   * Calculate tier based on points
   */
  const calculateTier = (points: number): LoyaltyMember['tier'] => {
    if (!program.value) return 'bronze';

    const tiers = program.value.rewardTiers.slice().reverse();
    for (const tier of tiers) {
      if (points >= tier.minPoints) {
        return tier.name.toLowerCase() as LoyaltyMember['tier'];
      }
    }
    return 'bronze';
  };

  /**
   * Calculate zap reward for order
   */
  const calculateZapReward = (member: LoyaltyMember, order: Order): number => {
    if (!program.value) return 0;

    const tier = program.value.rewardTiers.find(
      t => t.name.toLowerCase() === member.tier
    );

    if (!tier) return 0;

    // Base reward percentage (1-5% based on tier)
    const basePercentage = tier.zapMultiplier; // 1, 1.5, 2, or 3
    const satsSpent = order.totalSats || 0;

    return Math.floor(satsSpent * (basePercentage / 100));
  };

  /**
   * Send zap reward to member
   */
  const sendZapReward = async (
    member: LoyaltyMember,
    amount: number,
    reason: ZapReward['reason'],
    orderId?: string
  ): Promise<ZapReward | null> => {
    if (amount <= 0) return null;

    isLoading.value = true;
    error.value = null;

    try {
      // Create zap reward record
      const reward: ZapReward = {
        id: crypto.randomUUID(),
        memberId: member.id,
        amount,
        reason,
        orderId,
        createdAt: new Date().toISOString(),
        claimed: false,
      };

      // In production, send actual zap via Lightning
      // This would use NIP-57 zap request
      console.log('Sending zap reward:', {
        to: member.nostrPubkey,
        amount,
        reason,
      });

      // Mock: Create zap event
      // const zapEvent = await createZapRequest(member.nostrPubkey, amount);
      // reward.zapEventId = zapEvent.id;

      // Add to member rewards
      member.zapRewards.push(reward);
      members.value.set(member.nostrPubkey, member);

      return reward;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to send reward';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Get member benefits
   */
  const getMemberBenefits = (member: LoyaltyMember): string[] => {
    if (!program.value) return [];

    const tier = program.value.rewardTiers.find(
      t => t.name.toLowerCase() === member.tier
    );

    return tier?.benefits || [];
  };

  /**
   * Get points until next tier
   */
  const getPointsToNextTier = (member: LoyaltyMember): { nextTier: string; pointsNeeded: number } | null => {
    if (!program.value) return null;

    const currentTierIndex = program.value.rewardTiers.findIndex(
      t => t.name.toLowerCase() === member.tier
    );

    if (currentTierIndex === program.value.rewardTiers.length - 1) {
      return null; // Already at highest tier
    }

    const nextTier = program.value.rewardTiers[currentTierIndex + 1];
    if (!nextTier) return null;
    
    return {
      nextTier: nextTier.name,
      pointsNeeded: nextTier.minPoints - member.points,
    };
  };

  /**
   * Login member via Nostr (NIP-07)
   */
  const loginWithNostr = async (): Promise<LoyaltyMember | null> => {
    try {
      // Check for NIP-07 extension
      if (typeof window !== 'undefined' && 'nostr' in window) {
        const nostr = window as unknown as { nostr: { getPublicKey: () => Promise<string> } };
        const pubkey = await nostr.nostr.getPublicKey();
        return await getMember(pubkey);
      }
      
      error.value = 'Nostr extension not found. Please install Alby or nos2x.';
      return null;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to login with Nostr';
      return null;
    }
  };

  /**
   * Get leaderboard
   */
  const getLeaderboard = (limit: number = 10): LoyaltyMember[] => {
    return Array.from(members.value.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  };

  // Computed
  const totalMembers = computed(() => members.value.size);

  const tierDistribution = computed(() => {
    const dist = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    members.value.forEach(m => {
      dist[m.tier]++;
    });
    return dist;
  });

  return {
    // State
    members,
    currentMember,
    program,
    isLoading,
    error,

    // Computed
    totalMembers,
    tierDistribution,

    // Methods
    initProgram,
    getMember,
    addPointsForOrder,
    calculateTier,
    calculateZapReward,
    sendZapReward,
    getMemberBenefits,
    getPointsToNextTier,
    loginWithNostr,
    getLeaderboard,
  };
};
