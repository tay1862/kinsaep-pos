// composables/use-memberships.ts
// 💳 Membership Management - Plans, Subscriptions, Check-ins
// With Dexie + Nostr Sync

import type { Membership, MembershipPlan, MembershipCheckIn, MembershipStatus } from '~/types';
import {
  db,
  type MembershipRecord,
  type MembershipPlanRecord,
  type MembershipCheckInRecord,
} from '~/db/db';
import { generateUUIDv7 } from '~/utils/id';

// Nostr Event Kinds for Memberships
const NOSTR_KINDS = {
  MEMBERSHIP_PLAN: 38001, // Business: Membership Plans
  MEMBERSHIP: 38002, // Business: Member Subscriptions
  MEMBERSHIP_CHECKIN: 38003, // Business: Check-ins
};

export function useMemberships() {
  const { t } = useI18n();
  const toast = useToast();
  const nostrData = useNostrData();
  const offline = useOffline();

  // State
  const memberships = ref<Membership[]>([]);
  const plans = ref<MembershipPlan[]>([]);
  const checkIns = ref<MembershipCheckIn[]>([]);
  const isLoading = ref(false);
  const isInitialized = ref(false);
  const syncPending = ref(0);
  const error = ref<string | null>(null);

  // Stats
  const activeMemberships = computed(() =>
    memberships.value.filter((m) => m.status === 'active')
  );

  const expiringSoon = computed(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return memberships.value.filter((m) => {
      if (m.status !== 'active') return false;
      const endDate = new Date(m.endDate);
      return endDate <= thirtyDaysFromNow && endDate > now;
    });
  });

  const expiredMemberships = computed(() =>
    memberships.value.filter((m) => m.status === 'expired')
  );

  // ============================================
  // 💾 LOCAL DB OPERATIONS
  // ============================================

  async function loadPlansFromLocal(): Promise<MembershipPlan[]> {
    try {
      const records = await db.membershipPlans.toArray();
      return records.map((r) => ({
        id: r.id,
        name: r.name,
        nameLao: r.nameLao,
        description: r.description,
        duration: r.duration,
        price: r.price,
        benefits: JSON.parse(r.benefits),
        benefitsLao: r.benefitsLao ? JSON.parse(r.benefitsLao) : undefined,
        isActive: r.isActive,
        sortOrder: r.sortOrder,
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString(),
      }));
    } catch (e) {
      console.error('Failed to load plans from local DB:', e);
      return [];
    }
  }

  async function loadMembershipsFromLocal(): Promise<Membership[]> {
    try {
      const records = await db.memberships.toArray();
      return records.map((r) => ({
        id: r.id,
        customerId: r.customerId,
        customerName: r.customerName,
        planId: r.planId,
        planName: r.planName,
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status as MembershipStatus,
        checkInCount: r.checkInCount,
        notes: r.notes,
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString(),
      }));
    } catch (e) {
      console.error('Failed to load memberships from local DB:', e);
      return [];
    }
  }

  async function loadCheckInsFromLocal(): Promise<MembershipCheckIn[]> {
    try {
      const records = await db.membershipCheckIns.toArray();
      return records.map((r) => ({
        id: r.id,
        membershipId: r.membershipId,
        customerId: r.customerId,
        customerName: r.customerName,
        timestamp: new Date(r.timestamp).toISOString(),
        notes: r.notes,
        staffId: r.staffId,
      }));
    } catch (e) {
      console.error('Failed to load check-ins from local DB:', e);
      return [];
    }
  }

  async function savePlanToLocal(plan: MembershipPlan): Promise<void> {
    const record: MembershipPlanRecord = {
      id: plan.id,
      name: plan.name,
      nameLao: plan.nameLao,
      description: plan.description,
      duration: plan.duration,
      price: plan.price,
      benefits: JSON.stringify(plan.benefits),
      benefitsLao: plan.benefitsLao ? JSON.stringify(plan.benefitsLao) : undefined,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      createdAt: new Date(plan.createdAt).getTime(),
      updatedAt: new Date(plan.updatedAt).getTime(),
      synced: false,
    };
    await db.membershipPlans.put(record);
  }

  async function saveMembershipToLocal(membership: Membership): Promise<void> {
    const record: MembershipRecord = {
      id: membership.id,
      customerId: membership.customerId,
      customerName: membership.customerName,
      planId: membership.planId,
      planName: membership.planName,
      startDate: membership.startDate,
      endDate: membership.endDate,
      status: membership.status,
      checkInCount: membership.checkInCount,
      notes: membership.notes,
      createdAt: new Date(membership.createdAt).getTime(),
      updatedAt: new Date(membership.updatedAt).getTime(),
      synced: false,
    };
    await db.memberships.put(record);
  }

  async function saveCheckInToLocal(checkIn: MembershipCheckIn): Promise<void> {
    const record: MembershipCheckInRecord = {
      id: checkIn.id,
      membershipId: checkIn.membershipId,
      customerId: checkIn.customerId,
      customerName: checkIn.customerName,
      timestamp: new Date(checkIn.timestamp).getTime(),
      notes: checkIn.notes,
      staffId: checkIn.staffId,
      synced: false,
    };
    await db.membershipCheckIns.put(record);
  }

  // ============================================
  // 🔄 NOSTR SYNC
  // ============================================

  async function syncPlanToNostr(plan: MembershipPlan): Promise<boolean> {
    try {
      const event = await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.MEMBERSHIP_PLAN,
        JSON.stringify({
          id: plan.id,
          name: plan.name,
          nameLao: plan.nameLao,
          description: plan.description,
          duration: plan.duration,
          price: plan.price,
          benefits: plan.benefits,
          benefitsLao: plan.benefitsLao,
          isActive: plan.isActive,
          sortOrder: plan.sortOrder,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        }),
        plan.id // dTag
      );

      if (event) {
        await db.membershipPlans.update(plan.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to sync plan to Nostr:', e);
      return false;
    }
  }

  async function syncMembershipToNostr(membership: Membership): Promise<boolean> {
    try {
      const event = await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.MEMBERSHIP,
        JSON.stringify({
          id: membership.id,
          customerId: membership.customerId,
          customerName: membership.customerName,
          planId: membership.planId,
          planName: membership.planName,
          startDate: membership.startDate,
          endDate: membership.endDate,
          status: membership.status,
          checkInCount: membership.checkInCount,
          notes: membership.notes,
          createdAt: membership.createdAt,
          updatedAt: membership.updatedAt,
        }),
        membership.id // dTag
      );

      if (event) {
        await db.memberships.update(membership.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to sync membership to Nostr:', e);
      return false;
    }
  }

  async function syncCheckInToNostr(checkIn: MembershipCheckIn): Promise<boolean> {
    try {
      const event = await nostrData.publishEvent(
        NOSTR_KINDS.MEMBERSHIP_CHECKIN,
        JSON.stringify({
          id: checkIn.id,
          membershipId: checkIn.membershipId,
          customerId: checkIn.customerId,
          customerName: checkIn.customerName,
          timestamp: checkIn.timestamp,
          notes: checkIn.notes,
          staffId: checkIn.staffId,
        })
      );

      if (event) {
        await db.membershipCheckIns.update(checkIn.id, {
          synced: true,
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to sync check-in to Nostr:', e);
      return false;
    }
  }

  async function syncPendingData(): Promise<{
    synced: number;
    failed: number;
  }> {
    let synced = 0;
    let failed = 0;

    if (!offline.isOnline.value) {
      return { synced, failed };
    }

    try {
      // Sync unsynced plans
      const unsyncedPlans = await db.membershipPlans
        .filter((p) => !p.synced)
        .toArray();
      for (const planRecord of unsyncedPlans) {
        const plan: MembershipPlan = {
          id: planRecord.id,
          name: planRecord.name,
          nameLao: planRecord.nameLao,
          description: planRecord.description,
          duration: planRecord.duration,
          price: planRecord.price,
          benefits: JSON.parse(planRecord.benefits),
          benefitsLao: planRecord.benefitsLao ? JSON.parse(planRecord.benefitsLao) : undefined,
          isActive: planRecord.isActive,
          sortOrder: planRecord.sortOrder,
          createdAt: new Date(planRecord.createdAt).toISOString(),
          updatedAt: new Date(planRecord.updatedAt).toISOString(),
        };
        const success = await syncPlanToNostr(plan);
        if (success) synced++;
        else failed++;
      }

      // Sync unsynced memberships
      const unsyncedMemberships = await db.memberships
        .filter((m) => !m.synced)
        .toArray();
      for (const membershipRecord of unsyncedMemberships) {
        const membership: Membership = {
          id: membershipRecord.id,
          customerId: membershipRecord.customerId,
          customerName: membershipRecord.customerName,
          planId: membershipRecord.planId,
          planName: membershipRecord.planName,
          startDate: membershipRecord.startDate,
          endDate: membershipRecord.endDate,
          status: membershipRecord.status as MembershipStatus,
          checkInCount: membershipRecord.checkInCount,
          notes: membershipRecord.notes,
          createdAt: new Date(membershipRecord.createdAt).toISOString(),
          updatedAt: new Date(membershipRecord.updatedAt).toISOString(),
        };
        const success = await syncMembershipToNostr(membership);
        if (success) synced++;
        else failed++;
      }

      // Sync unsynced check-ins
      const unsyncedCheckIns = await db.membershipCheckIns
        .filter((c) => !c.synced)
        .toArray();
      for (const checkInRecord of unsyncedCheckIns) {
        const checkIn: MembershipCheckIn = {
          id: checkInRecord.id,
          membershipId: checkInRecord.membershipId,
          customerId: checkInRecord.customerId,
          customerName: checkInRecord.customerName,
          timestamp: new Date(checkInRecord.timestamp).toISOString(),
          notes: checkInRecord.notes,
          staffId: checkInRecord.staffId,
        };
        const success = await syncCheckInToNostr(checkIn);
        if (success) synced++;
        else failed++;
      }

      syncPending.value = failed;
    } catch (e) {
      console.error('Failed to sync pending memberships:', e);
      error.value = `Sync failed: ${e}`;
    }

    return { synced, failed };
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  async function init() {
    if (isInitialized.value) return;
    isLoading.value = true;
    error.value = null;

    try {
      // Load from Dexie
      plans.value = await loadPlansFromLocal();
      memberships.value = await loadMembershipsFromLocal();
      checkIns.value = await loadCheckInsFromLocal();

      // Initialize with default plans if empty
      if (plans.value.length === 0) {
        plans.value = getDefaultPlans();
        for (const plan of plans.value) {
          await savePlanToLocal(plan);
        }
      }

      // Check for expired memberships
      await checkExpirations();

      // Count pending syncs
      const unsyncedPlans = await db.membershipPlans.filter((p) => !p.synced).count();
      const unsyncedMemberships = await db.memberships.filter((m) => !m.synced).count();
      const unsyncedCheckIns = await db.membershipCheckIns.filter((c) => !c.synced).count();
      syncPending.value = unsyncedPlans + unsyncedMemberships + unsyncedCheckIns;

      isInitialized.value = true;
    } catch (e) {
      error.value = `Failed to initialize memberships: ${e}`;
      console.error('Failed to initialize memberships:', e);
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 📋 DEFAULT PLANS
  // ============================================

  function getDefaultPlans(): MembershipPlan[] {
    return [
      {
        id: generateUUIDv7(),
        name: 'Day Pass',
        nameLao: 'ບັດມື້',
        description: 'Single day access',
        duration: 1,
        price: 50000,
        benefits: ['Full gym access', 'Locker usage'],
        benefitsLao: ['ເຂົ້າຢິມເຕັມ', 'ໃຊ້ຕູ້ເກັບເຄື່ອງ'],
        isActive: true,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateUUIDv7(),
        name: 'Monthly',
        nameLao: 'ລາຍເດືອນ',
        description: '30 days of unlimited access',
        duration: 30,
        price: 300000,
        benefits: ['Full gym access', 'Group classes', 'Locker'],
        benefitsLao: ['ເຂົ້າຢິມເຕັມ', 'ຫ້ອງຮຽນກຸ່ມ', 'ຕູ້ເກັບເຄື່ອງ'],
        isActive: true,
        sortOrder: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'plan-3month',
        name: '3 Months',
        nameLao: '3 ເດືອນ',
        description: '90 days - Save 15%',
        duration: 90,
        price: 750000,
        benefits: ['Full gym access', 'Group classes', 'Personal locker', '1 PT session'],
        benefitsLao: ['ເຂົ້າຢິມເຕັມ', 'ຫ້ອງຮຽນກຸ່ມ', 'ຕູ້ສ່ວນຕົວ', 'ຝຶກສ່ວນຕົວ 1 ຄັ້ງ'],
        isActive: true,
        sortOrder: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateUUIDv7(),
        name: 'Yearly',
        nameLao: 'ລາຍປີ',
        description: '365 days - Best value',
        duration: 365,
        price: 2500000,
        benefits: ['Full gym access', 'All classes', 'Personal locker', '5 PT sessions', 'Guest passes'],
        benefitsLao: ['ເຂົ້າຢິມເຕັມ', 'ທຸກຫ້ອງຮຽນ', 'ຕູ້ສ່ວນຕົວ', 'ຝຶກສ່ວນຕົວ 5 ຄັ້ງ', 'ບັດເຊີນແຂກ'],
        isActive: true,
        sortOrder: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  // ============================================
  // 💳 MEMBERSHIP CRUD
  // ============================================

  async function addMembership(data: Omit<Membership, 'id' | 'createdAt' | 'updatedAt' | 'checkInCount'>): Promise<Membership> {
    const now = new Date().toISOString();
    const membership: Membership = {
      ...data,
      id: generateUUIDv7(),
      checkInCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    memberships.value.push(membership);
    await saveMembershipToLocal(membership);

    if (offline.isOnline.value) {
      await syncMembershipToNostr(membership);
    } else {
      syncPending.value++;
    }

    toast.add({
      title: t('memberships.added', 'Membership Added'),
      icon: 'i-heroicons-check-circle',
      color: 'success',
    });

    return membership;
  }

  async function updateMembership(id: string, data: Partial<Membership>): Promise<Membership | null> {
    const index = memberships.value.findIndex((m) => m.id === id);
    if (index === -1) return null;

    memberships.value[index] = {
      ...memberships.value[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await saveMembershipToLocal(memberships.value[index]);

    if (offline.isOnline.value) {
      await syncMembershipToNostr(memberships.value[index]);
    } else {
      syncPending.value++;
    }

    return memberships.value[index];
  }

  async function deleteMembership(id: string): Promise<boolean> {
    const index = memberships.value.findIndex((m) => m.id === id);
    if (index === -1) return false;

    memberships.value.splice(index, 1);
    await db.memberships.delete(id);
    return true;
  }

  async function getMembershipByCustomer(customerId: string): Promise<Membership | null> {
    return memberships.value.find((m) => m.customerId === customerId && m.status === 'active') || null;
  }

  // ============================================
  // ✅ CHECK-IN
  // ============================================

  async function checkIn(membershipId: string, notes?: string): Promise<MembershipCheckIn | null> {
    const membership = memberships.value.find((m) => m.id === membershipId);
    if (!membership) return null;

    if (membership.status !== 'active') {
      toast.add({
        title: t('memberships.notActive', 'Membership Not Active'),
        description: t('memberships.cannotCheckIn', 'This membership is not active'),
        icon: 'i-heroicons-exclamation-circle',
        color: 'warning',
      });
      return null;
    }

    const now = new Date().toISOString();
    const checkIn: MembershipCheckIn = {
      id: generateUUIDv7(),
      membershipId,
      customerId: membership.customerId,
      customerName: membership.customerName,
      timestamp: now,
      notes,
    };

    checkIns.value.push(checkIn);
    await saveCheckInToLocal(checkIn);

    if (offline.isOnline.value) {
      await syncCheckInToNostr(checkIn);
    } else {
      syncPending.value++;
    }

    // Update membership check-in count
    membership.checkInCount++;
    membership.updatedAt = now;
    await updateMembership(membership.id, { checkInCount: membership.checkInCount });

    toast.add({
      title: t('memberships.checkedIn', 'Checked In! ✅'),
      description: membership.customerName || undefined,
      icon: 'i-heroicons-check-circle',
      color: 'success',
    });

    return checkIn;
  }

  // ============================================
  // 🔄 RENEWAL & EXPIRATION
  // ============================================

  async function renewMembership(id: string, planId?: string): Promise<Membership | null> {
    const membership = memberships.value.find((m) => m.id === id);
    if (!membership) return null;

    const newPlanId = planId || membership.planId;
    const plan = plans.value.find((p) => p.id === newPlanId);
    if (!plan) return null;

    const now = new Date();
    const currentEnd = new Date(membership.endDate);
    const startDate = currentEnd > now ? currentEnd : now;
    const endDate = new Date(startDate.getTime() + plan.duration * 24 * 60 * 60 * 1000);

    membership.planId = newPlanId;
    membership.planName = plan.name;
    membership.startDate = startDate.toISOString();
    membership.endDate = endDate.toISOString();
    membership.status = 'active';
    membership.updatedAt = new Date().toISOString();

    saveMemberships();

    toast.add({
      title: t('memberships.renewed', 'Membership Renewed'),
      icon: 'i-heroicons-arrow-path',
      color: 'success',
    });

    return membership;
  }

  // ============================================
  // Expiration Check
  // ============================================

  async function checkExpirations(): Promise<void> {
    const now = new Date();
    let updated = false;

    for (const membership of memberships.value) {
      if (membership.status === 'active') {
        const endDate = new Date(membership.endDate);
        if (endDate < now) {
          membership.status = 'expired';
          membership.updatedAt = now.toISOString();
          updated = true;
        }
      }
    }

    if (updated) {
      saveMemberships();
    }
  }

  // ============================================
  // 📋 PLAN CRUD
  // ============================================

  async function addPlan(data: Omit<MembershipPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<MembershipPlan> {
    const now = new Date().toISOString();
    const plan: MembershipPlan = {
      ...data,
      id: generateUUIDv7(),
      createdAt: now,
      updatedAt: now,
    };

    plans.value.push(plan);
    await savePlanToLocal(plan);

    if (offline.isOnline.value) {
      await syncPlanToNostr(plan);
    } else {
      syncPending.value++;
    }

    return plan;
  }

  async function updatePlan(id: string, data: Partial<MembershipPlan>): Promise<MembershipPlan | null> {
    const index = plans.value.findIndex((p) => p.id === id);
    if (index === -1) return null;

    plans.value[index] = {
      ...plans.value[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await savePlanToLocal(plans.value[index]);

    if (offline.isOnline.value) {
      await syncPlanToNostr(plans.value[index]);
    } else {
      syncPending.value++;
    }

    return plans.value[index];
  }

  async function deletePlan(id: string): Promise<boolean> {
    // Don't delete if memberships use this plan
    const usedBy = memberships.value.filter((m) => m.planId === id);
    if (usedBy.length > 0) {
      toast.add({
        title: t('memberships.planInUse', 'Plan In Use'),
        description: t('memberships.cannotDeletePlan', 'This plan has active memberships'),
        icon: 'i-heroicons-exclamation-triangle',
        color: 'warning',
      });
      return false;
    }

    const index = plans.value.findIndex((p) => p.id === id);
    if (index === -1) return false;

    plans.value.splice(index, 1);
    await db.membershipPlans.delete(id);
    return true;
  }

  // ============================================
  // 🔍 SEARCH
  // ============================================

  function searchMemberships(query: string): Membership[] {
    const q = query.toLowerCase();
    return memberships.value.filter((m) =>
      m.customerName?.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  }

  // ============================================
  // 📤 RETURN
  // ============================================

  return {
    // State
    memberships: readonly(memberships),
    plans: readonly(plans),
    checkIns: readonly(checkIns),
    isLoading: readonly(isLoading),
    isInitialized: readonly(isInitialized),
    syncPending: readonly(syncPending),
    error: readonly(error),

    // Stats
    activeMemberships,
    expiringSoon,
    expiredMemberships,

    // Methods
    init,
    addMembership,
    updateMembership,
    deleteMembership,
    getMembershipByCustomer,
    checkIn,
    renewMembership,
    checkExpirations,
    addPlan,
    updatePlan,
    deletePlan,
    searchMemberships,
    
    // Sync
    syncPendingData,
  };
}
