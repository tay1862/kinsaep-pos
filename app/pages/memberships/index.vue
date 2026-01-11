<!-- pages/memberships/index.vue -->
<!-- 💳 Membership Management - User-Friendly Check-in & Management -->
<script setup lang="ts">
import type { Membership, MembershipPlan } from "~/types";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t, locale } = useI18n();
const membershipsStore = useMemberships();
const customersStore = useCustomers();
const invoicesStore = useInvoices();
const toast = useToast();
const { format: formatCurrency } = useCurrency();

const isLaoLocale = computed(() => locale.value.startsWith("lo"));

// State
const searchQuery = ref("");
const showAddModal = ref(false);
const showCheckInModal = ref(false);
const showPaymentModal = ref(false);
const showRenewModal = ref(false);
const selectedMembership = ref<Membership | null>(null);
const activeTab = ref<"members" | "plans">("members");
const isProcessingPayment = ref(false);
const pendingMembershipData = ref<{
  customer: any;
  plan: any;
  autoRenew: boolean;
  notes: string;
  isRenewal: boolean;
} | null>(null);

// Form
const memberForm = ref({
  customerId: "",
  planId: "",
  autoRenew: false,
  notes: "",
});

// Plan Form
const showPlanModal = ref(false);
const selectedPlan = ref<MembershipPlan | null>(null);
const planForm = ref({
  name: "",
  nameLao: "",
  description: "",
  duration: 30,
  price: 0,
  benefits: "",
  benefitsLao: "",
  maxCheckIns: 0,
  isActive: true,
});

// Initialize
onMounted(async () => {
  await membershipsStore.init();
  await customersStore.init();
});

// Computed
const filteredMemberships = computed(() => {
  if (!searchQuery.value) return membershipsStore.memberships.value;
  return membershipsStore.searchMemberships(searchQuery.value);
});

const customers = computed(() =>
  customersStore.customers.value.map((c) => ({
    value: c.id,
    label: c.name,
  }))
);

const planOptions = computed(() =>
  membershipsStore.plans.value.map((p) => ({
    value: p.id,
    label: isLaoLocale.value && p.nameLao ? p.nameLao : p.name,
  }))
);

// Status helpers
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    suspended:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    pending: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  };
  return colors[status] || colors.pending;
}

function getDaysLeft(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

// Actions
async function handleCheckIn(membership: Membership) {
  await membershipsStore.checkIn(membership.id);
}

async function handleAddMembership() {
  if (!memberForm.value.customerId || !memberForm.value.planId) {
    toast.add({
      title: t("common.error"),
      description:
        t("memberships.selectCustomerAndPlan", "Please select customer and plan"),
      color: "warning",
    });
    return;
  }

  const customer = customersStore.customers.value.find(
    (c) => c.id === memberForm.value.customerId
  );
  const plan = membershipsStore.plans.value.find(
    (p) => p.id === memberForm.value.planId
  );

  if (!customer || !plan) return;

  // Store pending data and show payment modal
  pendingMembershipData.value = {
    customer,
    plan,
    autoRenew: memberForm.value.autoRenew,
    notes: memberForm.value.notes,
    isRenewal: false,
  };

  showAddModal.value = false;
  showPaymentModal.value = true;
}

async function handleRenew(membership: Membership) {
  const plan = membershipsStore.plans.value.find(
    (p) => p.id === membership.planId
  );
  const customer = customersStore.customers.value.find(
    (c) => c.id === membership.customerId
  );

  if (!plan) {
    toast.add({
      title: t("common.error"),
      description: "Plan not found",
      color: "error",
    });
    return;
  }

  // Store pending data and show payment modal
  pendingMembershipData.value = {
    customer: customer || {
      id: membership.customerId,
      name: membership.customerName,
    },
    plan,
    autoRenew: membership.autoRenew || false,
    notes: "",
    isRenewal: true,
  };
  selectedMembership.value = membership;
  showPaymentModal.value = true;
}

async function processPayment(method: "cash" | "lightning" | "bank_transfer") {
  if (!pendingMembershipData.value) return;

  isProcessingPayment.value = true;
  const { customer, plan, autoRenew, notes, isRenewal } =
    pendingMembershipData.value;

  try {
    // Create invoice for the membership
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days to pay

    const invoice = await invoicesStore.createInvoice({
      customerName: customer.name || "Member",
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerId: customer.id,
      items: [
        {
          description: `${plan.name} Membership${
            isRenewal ? " (Renewal)" : ""
          }`,
          quantity: 1,
          unitPrice: plan.price,
          total: plan.price,
        },
      ],
      dueDate: dueDate.toISOString(),
      notes: `Membership: ${plan.name}`,
    });

    // Record payment immediately (assuming paid at counter)
    await invoicesStore.recordPayment(invoice.id, plan.price, method);

    if (isRenewal && selectedMembership.value) {
      // Renew existing membership
      await membershipsStore.renewMembership(selectedMembership.value.id);
    } else {
      // Create new membership
      const now = new Date();
      const endDate = new Date(
        now.getTime() + plan.duration * 24 * 60 * 60 * 1000
      );

      await membershipsStore.addMembership({
        customerId: customer.id,
        customerName: customer.name,
        planId: plan.id,
        planName: plan.name,
        status: "active",
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        autoRenew,
        notes,
      });
    }

    toast.add({
      title: t("common.success"),
      description: isRenewal
        ? t("memberships.renewed", "Membership renewed!")
        : t("memberships.added", "Membership created!"),
      color: "success",
    });

    // Reset state
    showPaymentModal.value = false;
    pendingMembershipData.value = null;
    selectedMembership.value = null;
    memberForm.value = {
      customerId: "",
      planId: "",
      autoRenew: false,
      notes: "",
    };
  } catch (error) {
    console.error("Payment failed:", error);
    toast.add({
      title: t("common.error"),
      description: "Payment failed. Please try again.",
      color: "error",
    });
  } finally {
    isProcessingPayment.value = false;
  }
}

function cancelPayment() {
  showPaymentModal.value = false;
  pendingMembershipData.value = null;
  selectedMembership.value = null;
}

function openCheckIn() {
  showCheckInModal.value = true;
}

async function quickCheckIn() {
  if (!searchQuery.value) return;

  const results = membershipsStore.searchMemberships(searchQuery.value);
  const firstResult = results[0];
  if (results.length === 1 && firstResult?.status === "active") {
    await membershipsStore.checkIn(firstResult.id);
    searchQuery.value = "";
  }
}

// Plan Management
function openPlanModal(plan?: MembershipPlan) {
  if (plan) {
    selectedPlan.value = plan;
    planForm.value = {
      name: plan.name,
      nameLao: plan.nameLao || "",
      description: plan.description || "",
      duration: plan.duration,
      price: plan.price,
      benefits: plan.benefits?.join("\n") || "",
      benefitsLao: plan.benefitsLao?.join("\n") || "",
      maxCheckIns: plan.maxCheckIns || 0,
      isActive: plan.isActive ?? true,
    };
  } else {
    selectedPlan.value = null;
    planForm.value = {
      name: "",
      nameLao: "",
      description: "",
      duration: 30,
      price: 0,
      benefits: "",
      benefitsLao: "",
      maxCheckIns: 0,
      isActive: true,
    };
  }
  showPlanModal.value = true;
}

async function savePlan() {
  const benefits = planForm.value.benefits.split("\n").filter((b) => b.trim());
  const benefitsLao = planForm.value.benefitsLao
    .split("\n")
    .filter((b) => b.trim());

  try {
    if (selectedPlan.value) {
      // Update existing
      await membershipsStore.updatePlan(selectedPlan.value.id, {
        name: planForm.value.name,
        nameLao: planForm.value.nameLao || undefined,
        description: planForm.value.description || undefined,
        duration: planForm.value.duration,
        price: planForm.value.price,
        benefits,
        benefitsLao: benefitsLao.length ? benefitsLao : undefined,
        maxCheckIns: planForm.value.maxCheckIns || undefined,
        isActive: planForm.value.isActive,
      });
      toast.add({
        title: t("common.success"),
        description: "Plan updated",
        color: "success",
      });
    } else {
      // Create new
      await membershipsStore.addPlan({
        name: planForm.value.name,
        nameLao: planForm.value.nameLao || undefined,
        description: planForm.value.description || undefined,
        duration: planForm.value.duration,
        price: planForm.value.price,
        benefits,
        benefitsLao: benefitsLao.length ? benefitsLao : undefined,
        maxCheckIns: planForm.value.maxCheckIns || undefined,
        isActive: planForm.value.isActive,
        sortOrder: membershipsStore.plans.value.length + 1,
      });
      toast.add({
        title: t("common.success"),
        description: "Plan created",
        color: "success",
      });
    }
    showPlanModal.value = false;
  } catch (error) {
    console.error("Failed to save plan:", error);
    toast.add({
      title: t("common.error"),
      description: "Failed to save plan",
      color: "error",
    });
  }
}

async function deletePlan(planId: string) {
  if (!confirm("Are you sure you want to delete this plan?")) return;

  const success = await membershipsStore.deletePlan(planId);
  if (success) {
    toast.add({
      title: t("common.success"),
      description: "Plan deleted",
      color: "success",
    });
  }
}
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
    >
      <div>
        <h1
          class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
        >
          💳 {{ t("memberships.title", "Memberships") }}
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          {{
            t("memberships.subtitle", "Manage member subscriptions and check-ins")
          }}
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          size="lg"
          color="primary"
          variant="soft"
          icon="i-heroicons-qr-code"
          @click="openCheckIn"
        >
          {{ t("memberships.quickCheckIn", "Quick Check-in") }}
        </UButton>
        <UButton
          size="lg"
          color="primary"
          icon="i-heroicons-plus"
          @click="showAddModal = true"
        >
          {{ t("memberships.addMember", "Add Member") }}
        </UButton>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <CommonStatCard
        icon="i-heroicons-check-circle"
        icon-color="green"
        :label="t('memberships.active', 'Active')"
        :value="membershipsStore.activeMemberships.value.length"
      />
      <CommonStatCard
        icon="i-heroicons-clock"
        icon-color="yellow"
        :label="t('memberships.expiringSoon', 'Expiring Soon')"
        :value="membershipsStore.expiringSoon.value.length"
      />
      <CommonStatCard
        icon="i-heroicons-x-circle"
        icon-color="red"
        :label="t('memberships.expired', 'Expired')"
        :value="membershipsStore.expiredMemberships.value.length"
      />
      <CommonStatCard
        icon="i-heroicons-user-group"
        icon-color="gray"
        :label="t('memberships.total', 'Total')"
        :value="membershipsStore.memberships.value.length"
      />
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <nav class="flex gap-4">
        <button
          v-for="tab in [
            {
              id: 'members',
              label: t('memberships.members', 'Members'),
              icon: '👥',
            },
            {
              id: 'plans',
              label: t('memberships.plans', 'Plans'),
              icon: '📋',
            },
          ]"
          :key="tab.id"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="
            activeTab === tab.id
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          "
          @click="activeTab = tab.id as typeof activeTab"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Members Tab -->
    <div v-if="activeTab === 'members'" class="space-y-4">
      <!-- Search -->
      <UInput
        v-model="searchQuery"
        :placeholder="t('memberships.searchPlaceholder', 'Search by name...')"
        icon="i-heroicons-magnifying-glass"
        size="lg"
        @keyup.enter="quickCheckIn"
      />

      <!-- Members List -->
      <div v-if="filteredMemberships.length > 0" class="space-y-3">
        <div
          v-for="member in filteredMemberships"
          :key="member.id"
          class="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <!-- Avatar -->
          <div
            class="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0"
          >
            <span
              class="text-2xl font-bold text-primary-600 dark:text-primary-400"
            >
              {{ (member.customerName || "M").charAt(0).toUpperCase() }}
            </span>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-gray-900 dark:text-white truncate">
              {{ member.customerName || t("common.unknown") }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ member.planName }} • {{ member.checkInCount }}
              {{ t("memberships.checkIns", "check-ins") }}
            </p>
            <div class="flex items-center gap-2 mt-1">
              <span
                :class="getStatusColor(member.status)"
                class="px-2 py-0.5 rounded-full text-xs font-medium"
              >
                {{ t(`memberships.status.${member.status}`) || member.status }}
              </span>
              <span
                v-if="member.status === 'active'"
                class="text-xs"
                :class="
                  getDaysLeft(member.endDate) <= 7
                    ? 'text-yellow-600'
                    : 'text-gray-400'
                "
              >
                {{ getDaysLeft(member.endDate) }}
                {{ t("memberships.daysLeft", "days left") }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <UButton
              v-if="member.status === 'active'"
              size="lg"
              color="success"
              icon="i-heroicons-check-circle"
              variant="soft"
              @click="handleCheckIn(member)"
            >
              {{ t("memberships.checkIn", "Check In") }}
            </UButton>
            <UButton
              v-if="member.status === 'expired'"
              size="sm"
              color="primary"
              icon="i-heroicons-arrow-path"
              variant="soft"
              @click="handleRenew(member)"
            >
              {{ t("memberships.renew", "Renew") }}
            </UButton>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <div class="text-6xl mb-4">💳</div>
        <p class="text-gray-500 dark:text-gray-400">
          {{ t("memberships.noMembers", "No members yet") }}
        </p>
        <UButton class="mt-4" color="primary" @click="showAddModal = true">
          {{ t("memberships.addFirstMember", "Add Your First Member") }}
        </UButton>
      </div>
    </div>

    <!-- Plans Tab -->
    <div v-if="activeTab === 'plans'" class="space-y-4">
      <!-- Add Plan Button -->
      <div class="flex justify-end">
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          @click="openPlanModal()"
        >
          {{ t("common.add", "Add") }} {{ t("memberships.plan", "Plan") }}
        </UButton>
      </div>

      <!-- Plans Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard
          v-for="plan in membershipsStore.plans.value"
          :key="plan.id"
          class="relative overflow-hidden"
        >
          <!-- Edit/Delete Actions -->
          <div class="absolute top-2 right-2 flex gap-1">
            <UButton
              icon="i-heroicons-pencil"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="openPlanModal(plan)"
            />
            <UButton
              icon="i-heroicons-trash"
              size="xs"
              color="error"
              variant="ghost"
              @click="deletePlan(plan.id)"
            />
          </div>

          <div class="text-center space-y-3 pt-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">
              {{ isLaoLocale && plan.nameLao ? plan.nameLao : plan.name }}
            </h3>
            <p
              class="text-3xl font-bold text-primary-600 dark:text-primary-400"
            >
              {{ formatCurrency(plan.price) }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ plan.duration }} {{ t("common.days", "days") }}
            </p>
            <ul class="text-sm text-left space-y-1">
              <li
                v-for="(benefit, i) in isLaoLocale && plan.benefitsLao
                  ? plan.benefitsLao
                  : plan.benefits"
                :key="i"
                class="flex items-center gap-2 text-gray-600 dark:text-gray-400"
              >
                <UIcon
                  name="i-heroicons-check"
                  class="w-4 h-4 text-green-500"
                />
                {{ benefit }}
              </li>
            </ul>
            <UBadge v-if="!plan.isActive" color="warning">Inactive</UBadge>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Plan Modal -->
    <UModal v-model:open="showPlanModal">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{
            selectedPlan ? t("common.edit", "Edit") : t("common.add", "Add")
          }}
          {{ t("memberships.plan", "Plan") }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField
              :label="(t('products.name', 'Name')) + ' (EN)'"
              required
            >
              <UInput v-model="planForm.name" placeholder="e.g. Monthly Pass" />
            </UFormField>
            <UFormField :label="(t('products.name', 'Name')) + ' (ລາວ)'">
              <UInput
                v-model="planForm.nameLao"
                placeholder="ເຊັ່ນ: ບັດເດືອນ"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField :label="t('products.price', 'Price')" required>
              <UInput
                v-model.number="planForm.price"
                type="number"
                placeholder="300000"
              >
                <template #trailing>
                  <span class="text-xs text-gray-400">LAK</span>
                </template>
              </UInput>
            </UFormField>
            <UFormField
              :label="
                (t('products.duration', 'Duration')) +
                ' (' +
                (t('common.days', 'days')) +
                ')'
              "
              required
            >
              <UInput
                v-model.number="planForm.duration"
                type="number"
                placeholder="30"
              />
            </UFormField>
          </div>

          <UFormField :label="t('products.description', 'Description')">
            <UTextarea
              v-model="planForm.description"
              placeholder="Optional description..."
              :rows="2"
            />
          </UFormField>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Benefits (EN) - one per line">
              <UTextarea
                v-model="planForm.benefits"
                placeholder="Full gym access&#10;Group classes&#10;Locker"
                :rows="4"
              />
            </UFormField>
            <UFormField label="Benefits (ລາວ) - ໜຶ່ງຕໍ່ແຖວ">
              <UTextarea
                v-model="planForm.benefitsLao"
                placeholder="ເຂົ້າຢิມເຕັມ&#10;ຫ້ອງຮຽນກຸ່ມ&#10;ຕູ້ເກັບເຄື່ອງ"
                :rows="4"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Max Check-ins (0 = unlimited)">
              <UInput
                v-model.number="planForm.maxCheckIns"
                type="number"
                placeholder="0"
              />
            </UFormField>
            <UFormField label="Status">
              <USwitch
                v-model="planForm.isActive"
                :label="planForm.isActive ? 'Active' : 'Inactive'"
              />
            </UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showPlanModal = false">
            {{ t("common.cancel") }}
          </UButton>
          <UButton color="primary" @click="savePlan">
            {{ selectedPlan ? t("common.update") : t("common.create") }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Add Member Modal -->
    <UModal v-model:open="showAddModal">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ t("memberships.addMember", "Add Member") }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('customers.customer', 'Customer')">
            <USelect
              v-model="memberForm.customerId"
              :items="customers"
              :placeholder="
                t('memberships.selectCustomer', 'Select customer')
              "
            />
          </UFormField>
          <UFormField :label="t('memberships.plan', 'Plan')">
            <USelect
              v-model="memberForm.planId"
              :items="planOptions"
              :placeholder="t('memberships.selectPlan', 'Select plan')"
            />
          </UFormField>
          <UFormField :label="t('orders.notes', 'Notes')">
            <UTextarea
              v-model="memberForm.notes"
              :placeholder="
                t('memberships.notesPlaceholder', 'Optional notes...')
              "
              :rows="2"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showAddModal = false">
            {{ t("common.cancel") }}
          </UButton>
          <UButton color="primary" @click="handleAddMembership">
            {{ t("memberships.addMember", "Add Member") }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Quick Check-in Modal -->
    <UModal v-model:open="showCheckInModal">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          ✅ {{ t("memberships.quickCheckIn", "Quick Check-in") }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UInput
            v-model="searchQuery"
            :placeholder="
              t('memberships.searchToCheckIn', 'Search member name...')
            "
            icon="i-heroicons-magnifying-glass"
            size="lg"
            autofocus
          />

          <div
            v-if="filteredMemberships.length > 0"
            class="space-y-2 max-h-64 overflow-y-auto"
          >
            <button
              v-for="member in filteredMemberships.filter(
                (m) => m.status === 'active'
              )"
              :key="member.id"
              class="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
              @click="
                handleCheckIn(member);
                showCheckInModal = false;
                searchQuery = '';
              "
            >
              <div
                class="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
              >
                <span class="text-xl font-bold text-primary-600">
                  {{ (member.customerName || "M").charAt(0) }}
                </span>
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ member.customerName }}
                </p>
                <p class="text-sm text-gray-500">{{ member.planName }}</p>
              </div>
              <UIcon
                name="i-heroicons-arrow-right-circle"
                class="w-8 h-8 text-green-500"
              />
            </button>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Payment Modal -->
    <UModal v-model:open="showPaymentModal">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          💳 {{ t("payment.selectMethod", "Select Payment Method") }}
        </h3>
      </template>
      <template #body>
        <div v-if="pendingMembershipData" class="space-y-6">
          <!-- Order Summary -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div class="flex justify-between items-center mb-2">
              <span class="text-gray-600 dark:text-gray-400">{{
                pendingMembershipData.isRenewal ? "Renewal" : "New Membership"
              }}</span>
              <UBadge color="primary">{{
                pendingMembershipData.plan.name
              }}</UBadge>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600 dark:text-gray-400">{{
                t("customers.name", "Customer")
              }}</span>
              <span class="font-medium text-gray-900 dark:text-white">{{
                pendingMembershipData.customer.name
              }}</span>
            </div>
            <div class="flex justify-between items-center mt-2">
              <span class="text-gray-600 dark:text-gray-400">{{
                t("products.duration", "Duration")
              }}</span>
              <span class="font-medium text-gray-900 dark:text-white"
                >{{ pendingMembershipData.plan.duration }}
                {{ t("common.days", "days") }}</span
              >
            </div>
            <div
              class="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4"
            >
              <div class="flex justify-between items-center">
                <span
                  class="text-lg font-semibold text-gray-900 dark:text-white"
                  >{{ t("pos.total", "Total") }}</span
                >
                <span
                  class="text-2xl font-bold text-primary-600 dark:text-primary-400"
                  >{{ formatCurrency(pendingMembershipData.plan.price) }}</span
                >
              </div>
            </div>
          </div>

          <!-- Payment Methods -->
          <div class="space-y-3">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t("payment.selectMethod", "Choose payment method") }}:
            </p>

            <button
              class="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
              :disabled="isProcessingPayment"
              @click="processPayment('cash')"
            >
              <div
                class="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
              >
                <span class="text-2xl">💵</span>
              </div>
              <div class="flex-1 text-left">
                <p class="font-semibold text-gray-900 dark:text-white">
                  {{ t("payment.methods.cash", "Cash") }}
                </p>
                <p class="text-sm text-gray-500">
                  {{ t("payment.methods.cashDesc", "Pay with cash") }}
                </p>
              </div>
              <UIcon
                name="i-heroicons-chevron-right"
                class="w-5 h-5 text-gray-400"
              />
            </button>

            <button
              class="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-yellow-500 dark:hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all"
              :disabled="isProcessingPayment"
              @click="processPayment('lightning')"
            >
              <div
                class="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center"
              >
                <span class="text-2xl">⚡</span>
              </div>
              <div class="flex-1 text-left">
                <p class="font-semibold text-gray-900 dark:text-white">
                  {{ t("payment.methods.lightning", "Lightning") }}
                </p>
                <p class="text-sm text-gray-500">
                  {{
                    t("payment.methods.lightningDesc", "Pay with Bitcoin Lightning")
                  }}
                </p>
              </div>
              <UIcon
                name="i-heroicons-chevron-right"
                class="w-5 h-5 text-gray-400"
              />
            </button>

            <button
              class="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              :disabled="isProcessingPayment"
              @click="processPayment('bank_transfer')"
            >
              <div
                class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
              >
                <span class="text-2xl">🏦</span>
              </div>
              <div class="flex-1 text-left">
                <p class="font-semibold text-gray-900 dark:text-white">
                  {{ t("payment.methods.bankTransfer", "Bank Transfer") }}
                </p>
                <p class="text-sm text-gray-500">
                  {{
                    t("payment.methods.bankTransferDesc", "Pay via bank account")
                  }}
                </p>
              </div>
              <UIcon
                name="i-heroicons-chevron-right"
                class="w-5 h-5 text-gray-400"
              />
            </button>
          </div>

          <!-- Processing Indicator -->
          <div
            v-if="isProcessingPayment"
            class="flex items-center justify-center gap-3 py-4"
          >
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-6 h-6 animate-spin text-primary-500"
            />
            <span class="text-gray-600 dark:text-gray-400">{{
              t("pos.processing", "Processing...")
            }}</span>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            variant="ghost"
            :disabled="isProcessingPayment"
            @click="cancelPayment"
          >
            {{ t("common.cancel") }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
