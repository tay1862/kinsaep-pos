<script setup lang="ts">
/**
 * 📋 CONTRACTS & RENTALS PAGE
 * Enterprise Contract and Asset Management
 */

import type {
  Contract,
  ContractType,
  ContractStatus,
  RentalAsset,
  AssetType,
  RentalBooking,
} from "~/types";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t, locale } = useI18n();
const toast = useToast();
const contractsStore = useContracts();
const customersStore = useCustomers();

const isLaoLocale = computed(() => locale.value.startsWith("lo"));

// Initialize
onMounted(async () => {
  await Promise.all([contractsStore.init(), customersStore.init()]);
});

// UI State
const activeTab = ref<"contracts" | "assets" | "bookings">("contracts");
const showContractModal = ref(false);
const showAssetModal = ref(false);
const showBookingModal = ref(false);
const selectedContract = ref<Contract | null>(null);
const selectedAsset = ref<RentalAsset | null>(null);
const selectedBooking = ref<RentalBooking | null>(null);
const saving = ref(false);
const searchQuery = ref("");
const filterStatus = ref<ContractStatus | "all">("all");

// Contract Form
const contractForm = ref({
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  type: "rental" as ContractType,
  assetId: "",
  startDate: "",
  endDate: "",
  amount: 0,
  paymentSchedule: "monthly" as Contract["paymentSchedule"],
  depositAmount: 0,
  autoRenew: false,
  notes: "",
});

// Asset Form
const assetForm = ref({
  name: "",
  nameLao: "",
  type: "room" as AssetType,
  description: "",
  hourlyRate: 0,
  dailyRate: 0,
  monthlyRate: 0,
  deposit: 0,
  location: "",
  capacity: 0,
});

// Booking Form
const bookingForm = ref({
  assetId: "",
  customerName: "",
  customerPhone: "",
  startTime: "",
  endTime: "",
  notes: "",
});

// Computed
const filteredContracts = computed(() => {
  let filtered = contractsStore.contracts.value;

  if (filterStatus.value !== "all") {
    filtered = filtered.filter((c) => c.status === filterStatus.value);
  }

  if (searchQuery.value) {
    filtered = contractsStore.searchContracts(searchQuery.value);
  }

  return filtered;
});

const assetOptions = computed(() =>
  contractsStore.assets.value
    .filter((a) => a.isActive)
    .map((a) => ({
      value: a.id,
      label: isLaoLocale.value && a.nameLao ? a.nameLao : a.name,
    }))
);

const contractTypeOptions = [
  { value: "rental", label: "🏠 Rental" },
  { value: "lease", label: "📜 Lease" },
  { value: "service", label: "🛠️ Service" },
  { value: "subscription", label: "💳 Subscription" },
];

const assetTypeOptions = [
  { value: "room", label: "🚪 Room" },
  { value: "equipment", label: "⚙️ Equipment" },
  { value: "vehicle", label: "🚗 Vehicle" },
  { value: "locker", label: "🔐 Locker" },
  { value: "space", label: "📍 Space" },
  { value: "other", label: "📦 Other" },
];

const paymentScheduleOptions = [
  { value: "once", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

// Methods
function openContractModal(contract?: Contract) {
  if (contract) {
    selectedContract.value = contract;
    contractForm.value = {
      customerName: contract.customerName,
      customerPhone: contract.customerPhone || "",
      customerEmail: contract.customerEmail || "",
      type: contract.type,
      assetId: contract.assetId || "",
      startDate: contract.startDate.split("T")[0],
      endDate: contract.endDate.split("T")[0],
      amount: contract.amount,
      paymentSchedule: contract.paymentSchedule,
      depositAmount: contract.depositAmount || 0,
      autoRenew: contract.autoRenew,
      notes: contract.notes || "",
    };
  } else {
    selectedContract.value = null;
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    contractForm.value = {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      type: "rental",
      assetId: "",
      startDate: today.toISOString().split("T")[0],
      endDate: nextMonth.toISOString().split("T")[0],
      amount: 0,
      paymentSchedule: "monthly",
      depositAmount: 0,
      autoRenew: false,
      notes: "",
    };
  }
  showContractModal.value = true;
}

function openAssetModal(asset?: RentalAsset) {
  if (asset) {
    selectedAsset.value = asset;
    assetForm.value = {
      name: asset.name,
      nameLao: asset.nameLao || "",
      type: asset.type,
      description: asset.description || "",
      hourlyRate: asset.hourlyRate || 0,
      dailyRate: asset.dailyRate || 0,
      monthlyRate: asset.monthlyRate || 0,
      deposit: asset.deposit || 0,
      location: asset.location || "",
      capacity: asset.capacity || 0,
    };
  } else {
    selectedAsset.value = null;
    assetForm.value = {
      name: "",
      nameLao: "",
      type: "room",
      description: "",
      hourlyRate: 0,
      dailyRate: 0,
      monthlyRate: 0,
      deposit: 0,
      location: "",
      capacity: 0,
    };
  }
  showAssetModal.value = true;
}

function openBookingModal(asset?: RentalAsset) {
  const now = new Date();
  const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  bookingForm.value = {
    assetId: asset?.id || "",
    customerName: "",
    customerPhone: "",
    startTime: now.toISOString().slice(0, 16),
    endTime: later.toISOString().slice(0, 16),
    notes: "",
  };
  showBookingModal.value = true;
}

async function saveContract() {
  if (!contractForm.value.customerName || !contractForm.value.amount) {
    toast.add({
      title: t("common.error"),
      description: t("contracts.validation.customerNameRequired"),
      color: "error",
    });
    return;
  }

  saving.value = true;
  try {
    if (selectedContract.value) {
      await contractsStore.updateContract(selectedContract.value.id, {
        ...contractForm.value,
        startDate: new Date(contractForm.value.startDate).toISOString(),
        endDate: new Date(contractForm.value.endDate).toISOString(),
      });
      toast.add({
        title: t("common.success"),
        description: t("contracts.messages.contractUpdated"),
        color: "success",
      });
    } else {
      await contractsStore.createContract({
        ...contractForm.value,
        startDate: new Date(contractForm.value.startDate).toISOString(),
        endDate: new Date(contractForm.value.endDate).toISOString(),
      });
      toast.add({
        title: t("common.success"),
        description: t("contracts.messages.contractCreated"),
        color: "success",
      });
    }
    showContractModal.value = false;
  } catch (e) {
    toast.add({
      title: t("common.error"),
      description: String(e),
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}

async function saveAsset() {
  if (!assetForm.value.name) {
    toast.add({
      title: t("common.error"),
      description: t("contracts.validation.assetNameRequired"),
      color: "error",
    });
    return;
  }

  saving.value = true;
  try {
    if (selectedAsset.value) {
      await contractsStore.updateAsset(selectedAsset.value.id, assetForm.value);
      toast.add({
        title: t("common.success"),
        description: t("contracts.messages.assetUpdated"),
        color: "success",
      });
    } else {
      await contractsStore.addAsset(assetForm.value);
      toast.add({
        title: t("common.success"),
        description: t("contracts.messages.assetAdded"),
        color: "success",
      });
    }
    showAssetModal.value = false;
  } catch (e) {
    toast.add({
      title: t("common.error"),
      description: String(e),
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}

async function saveBooking() {
  if (!bookingForm.value.assetId || !bookingForm.value.customerName) {
    toast.add({
      title: t("common.error"),
      description: t("contracts.validation.assetCustomerRequired"),
      color: "error",
    });
    return;
  }

  const asset = contractsStore.getAsset(bookingForm.value.assetId);
  const hours =
    (new Date(bookingForm.value.endTime).getTime() -
      new Date(bookingForm.value.startTime).getTime()) /
    (1000 * 60 * 60);
  const totalAmount = Math.round(hours * (asset?.hourlyRate || 0));

  saving.value = true;
  try {
    await contractsStore.createBooking({
      ...bookingForm.value,
      totalAmount,
      depositAmount: asset?.deposit,
    });
    toast.add({
      title: t("common.success"),
      description: t("contracts.messages.bookingCreated"),
      color: "success",
    });
    showBookingModal.value = false;
  } catch (e) {
    toast.add({
      title: t("common.error"),
      description: String(e),
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}

async function activateContract(contract: Contract) {
  await contractsStore.activateContract(contract.id);
  toast.add({
    title: t("common.success"),
    description: t("contracts.messages.contractActivated"),
    color: "success",
  });
}

async function terminateContract(contract: Contract) {
  if (!confirm(t("contracts.confirmations.terminateContract"))) return;
  await contractsStore.terminateContract(contract.id, "User terminated");
  toast.add({
    title: t("common.success"),
    description: t("contracts.messages.contractTerminated"),
    color: "warning",
  });
}

async function renewContract(contract: Contract) {
  await contractsStore.renewContract(contract.id);
  toast.add({
    title: t("common.success"),
    description: t("contracts.messages.contractRenewed"),
    color: "success",
  });
}

async function collectDeposit(contract: Contract) {
  await contractsStore.collectDeposit(contract.id);
  toast.add({
    title: t("common.success"),
    description: t("contracts.messages.depositCollected"),
    color: "success",
  });
}

async function deleteContractAction(contract: Contract) {
  if (!confirm(t("contracts.confirmations.deleteContract"))) return;
  await contractsStore.deleteContract(contract.id);
  toast.add({
    title: t("common.success"),
    description: t("contracts.messages.contractDeleted"),
    color: "warning",
  });
}

async function deleteAssetAction(asset: RentalAsset) {
  if (!confirm(t("contracts.confirmations.deleteAsset"))) return;
  await contractsStore.deleteAsset(asset.id);
  toast.add({
    title: t("common.success"),
    description: t("contracts.messages.assetDeleted"),
    color: "warning",
  });
}

async function checkOutBookingAction(booking: RentalBooking) {
  await contractsStore.checkOutBooking(booking.id);
  toast.add({
    title: t("common.success"),
    description: t("contracts.messages.checkedOut"),
    color: "success",
  });
}

async function returnBookingAction(booking: RentalBooking) {
  await contractsStore.returnBooking(booking.id);
  toast.add({
    title: t("common.success"),
    description: t("contracts.messages.assetReturned"),
    color: "success",
  });
}

// Helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type BadgeColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "gray"
  | "primary"
  | "purple";

function getStatusColor(status: ContractStatus): BadgeColor {
  const colors: Record<string, BadgeColor> = {
    draft: "gray",
    pending: "blue",
    active: "green",
    expired: "orange",
    terminated: "red",
    cancelled: "gray",
  };
  return colors[status] || "gray";
}

function getAssetTypeIcon(type: AssetType): string {
  const icons: Record<string, string> = {
    room: "🚪",
    equipment: "⚙️",
    vehicle: "🚗",
    locker: "🔐",
    space: "📍",
    other: "📦",
  };
  return icons[type] || "📦";
}

function getBookingStatusColor(status: string): BadgeColor {
  const colors: Record<string, BadgeColor> = {
    reserved: "blue",
    checked_out: "purple",
    returned: "green",
    cancelled: "gray",
    no_show: "red",
  };
  return colors[status] || "gray";
}

function getDaysUntil(date: string): number {
  return Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center px-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          📋 {{ t("contracts.title", "Contracts & Rentals") }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          {{
            t("contracts.description", "Manage contracts, assets, and bookings")
          }}
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          v-if="activeTab === 'contracts'"
          color="primary"
          icon="i-heroicons-plus"
          :label="t('contracts.newContract', 'New Contract')"
          @click="openContractModal()"
        />
        <UButton
          v-if="activeTab === 'assets'"
          color="primary"
          icon="i-heroicons-plus"
          :label="t('contracts.addAsset', 'Add Asset')"
          @click="openAssetModal()"
        />
        <UButton
          v-if="activeTab === 'bookings'"
          color="primary"
          icon="i-heroicons-plus"
          :label="t('contracts.newBooking', 'New Booking')"
          @click="openBookingModal()"
        />
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 px-4">
      <CommonStatCard
        icon="✅"
        icon-color="green"
        :label="t('contracts.stats.active')"
        :value="contractsStore.stats.value.activeCount"
        :loading="contractsStore.isLoading.value"
      />
      <CommonStatCard
        icon="⏰"
        icon-color="yellow"
        :label="t('contracts.stats.expiring')"
        :value="contractsStore.stats.value.expiringCount"
        :loading="contractsStore.isLoading.value"
      />
      <CommonStatCard
        icon="🏠"
        icon-color="blue"
        :label="t('contracts.stats.assets')"
        :value="contractsStore.stats.value.totalAssets"
        :loading="contractsStore.isLoading.value"
      />
      <CommonStatCard
        icon="📅"
        icon-color="purple"
        :label="t('contracts.stats.todayBookings')"
        :value="contractsStore.stats.value.todayBookings"
        :loading="contractsStore.isLoading.value"
      />
      <CommonStatCard
        icon="💰"
        icon-color="green"
        :label="t('contracts.stats.monthlyRevenue')"
        :value="formatCurrency(contractsStore.stats.value.monthlyRevenue)"
        :loading="contractsStore.isLoading.value"
      />
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 px-4">
      <UButton
        :color="activeTab === 'contracts' ? 'primary' : 'neutral'"
        :variant="activeTab === 'contracts' ? 'solid' : 'ghost'"
        icon="i-heroicons-document-text"
        :label="t('contracts.contracts', 'Contracts')"
        @click="activeTab = 'contracts'"
      />
      <UButton
        :color="activeTab === 'assets' ? 'primary' : 'neutral'"
        :variant="activeTab === 'assets' ? 'solid' : 'ghost'"
        icon="i-heroicons-cube"
        :label="t('contracts.assets', 'Assets')"
        @click="activeTab = 'assets'"
      />
      <UButton
        :color="activeTab === 'bookings' ? 'primary' : 'neutral'"
        :variant="activeTab === 'bookings' ? 'solid' : 'ghost'"
        icon="i-heroicons-calendar"
        :label="t('contracts.bookings', 'Bookings')"
        @click="activeTab = 'bookings'"
      />
    </div>

    <!-- Contracts Tab -->
    <template v-if="activeTab === 'contracts'">
      <!-- Filters -->
      <div class="flex gap-4 px-4">
        <UInput
          v-model="searchQuery"
          :placeholder="t('contracts.filters.searchPlaceholder')"
          icon="i-heroicons-magnifying-glass"
          class="w-64"
        />
        <USelect
          v-model="filterStatus"
          :items="[
            { value: 'all', label: t('contracts.filters.allStatus') },
            { value: 'draft', label: t('contracts.status.draft') },
            { value: 'active', label: t('contracts.status.active') },
            { value: 'expired', label: t('contracts.status.expired') },
            { value: 'terminated', label: t('contracts.status.terminated') },
          ]"
          value-key="value"
          label-key="label"
        />
      </div>

      <!-- Contracts List -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr
              class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
            >
              <th class="text-left py-3 px-4 font-medium text-gray-500">
                {{ t("contracts.table.contractNumber") }}
              </th>
              <th class="text-left py-3 px-4 font-medium text-gray-500">
                {{ t("contracts.table.customer") }}
              </th>
              <th class="text-left py-3 px-4 font-medium text-gray-500">
                {{ t("contracts.table.type") }}
              </th>
              <th class="text-left py-3 px-4 font-medium text-gray-500">
                {{ t("contracts.table.asset") }}
              </th>
              <th class="text-right py-3 px-4 font-medium text-gray-500">
                {{ t("contracts.table.amount") }}
              </th>
              <th class="text-center py-3 px-4 font-medium text-gray-500">
                {{ t("contracts.table.deposit") }}
              </th>
              <th class="text-center py-3 px-4 font-medium text-gray-500">
                {{ t("contracts.table.status") }}
              </th>
              <th class="text-right py-3 px-4 font-medium text-gray-500">
                {{ t("contracts.table.ends") }}
              </th>
              <th class="text-center py-3 px-4 font-medium text-gray-500">
                {{ t("contracts.table.actions") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="contract in filteredContracts"
              :key="contract.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              @click="navigateTo(`/contracts/${contract.id}`)"
            >
              <td class="py-3 px-4 font-mono text-sm text-primary-600">
                {{ contract.contractNumber }}
              </td>
              <td class="py-3 px-4">
                <div class="font-medium">{{ contract.customerName }}</div>
                <div class="text-sm text-gray-500">
                  {{ contract.customerPhone }}
                </div>
              </td>
              <td class="py-3 px-4 capitalize">{{ contract.type }}</td>
              <td class="py-3 px-4">
                <span v-if="contract.asset" class="flex items-center gap-1">
                  {{ getAssetTypeIcon(contract.asset.type) }}
                  {{ contract.asset.name }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="py-3 px-4 text-right font-medium">
                {{ formatCurrency(contract.amount) }}
                <span class="text-xs text-gray-500"
                  >/{{ contract.paymentSchedule }}</span
                >
              </td>
              <td class="py-3 px-4 text-center">
                <template v-if="contract.depositAmount">
                  <UBadge
                    :color="
                      contract.depositStatus === 'collected'
                        ? 'green'
                        : 'yellow'
                    "
                    :label="contract.depositStatus || 'pending'"
                    size="xs"
                  />
                </template>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="py-3 px-4 text-center">
                <UBadge
                  :color="getStatusColor(contract.status)"
                  :label="contract.status"
                  variant="subtle"
                />
              </td>
              <td class="py-3 px-4 text-right text-sm">
                <span
                  :class="
                    getDaysUntil(contract.endDate) < 7
                      ? 'text-orange-600 font-medium'
                      : 'text-gray-500'
                  "
                >
                  {{ formatDate(contract.endDate) }}
                </span>
              </td>
              <td class="py-3 px-4" @click.stop>
                <div class="flex items-center justify-center gap-1">
                  <UButton
                    v-if="contract.status === 'draft'"
                    color="green"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-play"
                    title="Activate"
                    @click="activateContract(contract)"
                  />
                  <UButton
                    v-if="
                      contract.status === 'active' &&
                      contract.depositStatus === 'pending'
                    "
                    color="yellow"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-banknotes"
                    title="Collect Deposit"
                    @click="collectDeposit(contract)"
                  />
                  <UButton
                    v-if="
                      contract.status === 'expired' ||
                      contract.status === 'active'
                    "
                    color="blue"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-arrow-path"
                    title="Renew"
                    @click="renewContract(contract)"
                  />
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-pencil"
                    @click="openContractModal(contract)"
                  />
                  <UButton
                    v-if="contract.status === 'active'"
                    color="red"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-x-circle"
                    title="Terminate"
                    @click="terminateContract(contract)"
                  />
                  <UButton
                    v-if="contract.status === 'draft'"
                    color="red"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-trash"
                    @click="deleteContractAction(contract)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="filteredContracts.length === 0" class="text-center py-12">
          <div class="text-6xl mb-4">📋</div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {{ t("contracts.empty.noContracts") }}
          </h3>
          <p class="text-gray-500 mb-4">
            {{ t("contracts.empty.createFirst") }}
          </p>
          <UButton
            color="primary"
            :label="t('contracts.newContract')"
            @click="openContractModal()"
          />
        </div>
      </div>
    </template>

    <!-- Assets Tab -->
    <template v-if="activeTab === 'assets'">
      <div class="px-4">
        <div
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <div
            v-for="asset in contractsStore.assets.value.filter(
              (a) => a.isActive
            )"
            :key="asset.id"
            class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  :class="
                    asset.isAvailable
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  "
                >
                  {{ getAssetTypeIcon(asset.type) }}
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-white">
                    {{
                      isLaoLocale && asset.nameLao ? asset.nameLao : asset.name
                    }}
                  </h3>
                  <p class="text-sm text-gray-500 capitalize">
                    {{ asset.type }}
                  </p>
                </div>
              </div>
              <UBadge
                :color="asset.isAvailable ? 'green' : 'red'"
                :label="
                  asset.isAvailable
                    ? t('contracts.assetCard.available')
                    : t('contracts.assetCard.inUse')
                "
                size="xs"
              />
            </div>

            <div
              class="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3"
            >
              <div v-if="asset.hourlyRate" class="flex justify-between">
                <span>{{ t("contracts.assetCard.hourly") }}</span>
                <span class="font-medium">{{
                  formatCurrency(asset.hourlyRate)
                }}</span>
              </div>
              <div v-if="asset.dailyRate" class="flex justify-between">
                <span>{{ t("contracts.assetCard.daily") }}</span>
                <span class="font-medium">{{
                  formatCurrency(asset.dailyRate)
                }}</span>
              </div>
              <div v-if="asset.monthlyRate" class="flex justify-between">
                <span>{{ t("contracts.assetCard.monthly") }}</span>
                <span class="font-medium">{{
                  formatCurrency(asset.monthlyRate)
                }}</span>
              </div>
              <div v-if="asset.deposit" class="flex justify-between">
                <span>{{ t("contracts.assetCard.deposit") }}</span>
                <span class="font-medium text-yellow-600">{{
                  formatCurrency(asset.deposit)
                }}</span>
              </div>
            </div>

            <div class="flex gap-2">
              <UButton
                v-if="asset.isAvailable"
                color="primary"
                size="xs"
                block
                icon="i-heroicons-calendar"
                :label="t('contracts.actions.book')"
                @click="openBookingModal(asset)"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-heroicons-pencil"
                @click="openAssetModal(asset)"
              />
              <UButton
                color="red"
                variant="ghost"
                size="xs"
                icon="i-heroicons-trash"
                @click="deleteAssetAction(asset)"
              />
            </div>
          </div>

          <div
            v-if="
              contractsStore.assets.value.filter((a) => a.isActive).length === 0
            "
            class="col-span-full text-center py-12"
          >
            <div class="text-6xl mb-4">🏠</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {{ t("contracts.empty.noAssets") }}
            </h3>
            <p class="text-gray-500 mb-4">
              {{ t("contracts.empty.addFirst") }}
            </p>
            <UButton
              color="primary"
              :label="t('contracts.addAsset')"
              @click="openAssetModal()"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Bookings Tab -->
    <template v-if="activeTab === 'bookings'">
      <div>
        <div class="overflow-hidden">
          <table class="w-full">
            <thead>
              <tr
                class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                <th class="text-left py-3 px-4 font-medium text-gray-500">
                  {{ t("contracts.booking.bookingNumber") }}
                </th>
                <th class="text-left py-3 px-4 font-medium text-gray-500">
                  {{ t("contracts.booking.asset") }}
                </th>
                <th class="text-left py-3 px-4 font-medium text-gray-500">
                  {{ t("contracts.booking.customer") }}
                </th>
                <th class="text-left py-3 px-4 font-medium text-gray-500">
                  {{ t("contracts.booking.start") }}
                </th>
                <th class="text-left py-3 px-4 font-medium text-gray-500">
                  {{ t("contracts.booking.end") }}
                </th>
                <th class="text-right py-3 px-4 font-medium text-gray-500">
                  {{ t("contracts.booking.amount") }}
                </th>
                <th class="text-center py-3 px-4 font-medium text-gray-500">
                  {{ t("contracts.booking.status") }}
                </th>
                <th class="text-center py-3 px-4 font-medium text-gray-500">
                  {{ t("contracts.booking.actions") }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="booking in contractsStore.bookings.value"
                :key="booking.id"
                class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="py-3 px-4 font-mono text-sm">
                  {{ booking.bookingNumber }}
                </td>
                <td class="py-3 px-4">
                  <span v-if="booking.asset" class="flex items-center gap-1">
                    {{ getAssetTypeIcon(booking.asset.type) }}
                    {{ booking.asset.name }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <div class="font-medium">{{ booking.customerName }}</div>
                  <div class="text-sm text-gray-500">
                    {{ booking.customerPhone }}
                  </div>
                </td>
                <td class="py-3 px-4 text-sm">
                  {{ formatDateTime(booking.startTime) }}
                </td>
                <td class="py-3 px-4 text-sm">
                  {{ formatDateTime(booking.endTime) }}
                </td>
                <td class="py-3 px-4 text-right font-medium">
                  {{ formatCurrency(booking.totalAmount) }}
                </td>
                <td class="py-3 px-4 text-center">
                  <UBadge
                    :color="getBookingStatusColor(booking.status)"
                    :label="booking.status.replace('_', ' ')"
                    variant="subtle"
                  />
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center justify-center gap-1">
                    <UButton
                      v-if="booking.status === 'reserved'"
                      color="purple"
                      variant="ghost"
                      size="xs"
                      icon="i-heroicons-arrow-right-on-rectangle"
                      title="Check Out"
                      @click="checkOutBookingAction(booking)"
                    />
                    <UButton
                      v-if="booking.status === 'checked_out'"
                      color="green"
                      variant="ghost"
                      size="xs"
                      icon="i-heroicons-arrow-left-on-rectangle"
                      title="Return"
                      @click="returnBookingAction(booking)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div
            v-if="contractsStore.bookings.value.length === 0"
            class="text-center py-12"
          >
            <div class="text-6xl mb-4">📅</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {{ t("contracts.empty.noBookings") }}
            </h3>
            <p class="text-gray-500 mb-4">
              {{ t("contracts.empty.bookFirst") }}
            </p>
            <UButton
              color="primary"
              :label="t('contracts.newBooking')"
              @click="openBookingModal()"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Contract Modal -->
    <UModal
      v-model:open="showContractModal"
      :overlay="true"
      title="Contract"
      description="Contract"
    >
      <template #content>
        <UCard class="max-w-xl">
          <template #header>
            <div class="flex items-center gap-3">
              <span class="text-2xl">📋</span>
              <h3 class="text-lg font-semibold">
                {{
                  selectedContract
                    ? t("contracts.editContract")
                    : t("contracts.newContract")
                }}
              </h3>
            </div>
          </template>

          <div class="space-y-4 max-h-[60vh] overflow-y-auto">
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('contracts.customerName')" required>
                <UInput v-model="contractForm.customerName" class="w-full" />
              </UFormField>
              <UFormField :label="t('contracts.customerPhone')">
                <UInput v-model="contractForm.customerPhone" class="w-full" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('contracts.type')">
                <USelect
                  v-model="contractForm.type"
                  :items="contractTypeOptions"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('contracts.asset')">
                <USelect
                  v-model="contractForm.assetId"
                  :items="[
                    { value: 'none', label: t('contracts.noAsset') },
                    ...assetOptions,
                  ]"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('contracts.startDate')" required>
                <UInput
                  v-model="contractForm.startDate"
                  type="date"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('contracts.endDate')" required>
                <UInput
                  v-model="contractForm.endDate"
                  type="date"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <UFormField :label="t('contracts.amount')" required>
                <UInput
                  v-model.number="contractForm.amount"
                  type="number"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('contracts.paymentSchedule')">
                <USelect
                  v-model="contractForm.paymentSchedule"
                  :items="paymentScheduleOptions"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('contracts.deposit')">
                <UInput
                  v-model.number="contractForm.depositAmount"
                  type="number"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField>
              <UCheckbox
                v-model="contractForm.autoRenew"
                :label="t('contracts.autoRenewDesc')"
              />
            </UFormField>

            <UFormField :label="t('contracts.notes')">
              <UTextarea
                v-model="contractForm.notes"
                :rows="2"
                class="w-full"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex w-full justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                :label="t('common.cancel')"
                @click="showContractModal = false"
              />
              <UButton
                color="primary"
                :label="t('contracts.modal.saveContract')"
                :loading="saving"
                @click="saveContract"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Asset Modal -->
    <UModal
      v-model:open="showAssetModal"
      :overlay="true"
      title="Asset"
      description="Asset"
    >
      <template #content>
        <UCard class="max-w-lg">
          <template #header>
            <div class="flex items-center gap-3">
              <span class="text-2xl">🏠</span>
              <h3 class="text-lg font-semibold">
                {{
                  selectedAsset
                    ? t("contracts.editAsset")
                    : t("contracts.addAsset")
                }}
              </h3>
            </div>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField
                :label="t('contracts.assetFields.nameEnglish')"
                required
              >
                <UInput v-model="assetForm.name" class="w-full" />
              </UFormField>
              <UFormField :label="t('contracts.assetFields.nameLao')">
                <UInput v-model="assetForm.nameLao" class="w-full" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('contracts.type')">
                <USelect
                  v-model="assetForm.type"
                  :items="assetTypeOptions"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('contracts.assetFields.capacity')">
                <UInput
                  v-model.number="assetForm.capacity"
                  type="number"
                  class="w-full"
                  :placeholder="t('contracts.assetFields.capacityPlaceholder')"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('contracts.assetFields.hourlyRate')">
                <UInput
                  v-model.number="assetForm.hourlyRate"
                  type="number"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('contracts.assetFields.dailyRate')">
                <UInput
                  v-model.number="assetForm.dailyRate"
                  type="number"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('contracts.assetFields.monthlyRate')">
                <UInput v-model.number="assetForm.monthlyRate" type="number" />
              </UFormField>
              <UFormField :label="t('contracts.deposit')">
                <UInput
                  v-model.number="assetForm.deposit"
                  type="number"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField :label="t('contracts.assetFields.location')">
              <UInput
                v-model="assetForm.location"
                class="w-full"
                :placeholder="t('contracts.assetFields.locationPlaceholder')"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                :label="t('common.cancel')"
                @click="showAssetModal = false"
              />
              <UButton
                color="primary"
                :label="t('contracts.modal.saveAsset')"
                :loading="saving"
                @click="saveAsset"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Booking Modal -->
    <UModal
      v-model:open="showBookingModal"
      :overlay="true"
      title="Booking"
      description="Booking"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <span class="text-2xl">📅</span>
              <h3 class="text-lg font-semibold">
                {{ t("contracts.newBooking") }}
              </h3>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField :label="t('contracts.asset')" required>
              <USelect
                v-model="bookingForm.assetId"
                :items="assetOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="t('contracts.customerName')" required>
              <UInput v-model="bookingForm.customerName" class="w-full" />
            </UFormField>

            <UFormField :label="t('contracts.customerPhone')">
              <UInput v-model="bookingForm.customerPhone" class="w-full" />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('contracts.booking.startTime')" required>
                <UInput
                  v-model="bookingForm.startTime"
                  type="datetime-local"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('contracts.booking.endTime')" required>
                <UInput
                  v-model="bookingForm.endTime"
                  type="datetime-local"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField :label="t('contracts.notes')">
              <UInput v-model="bookingForm.notes" class="w-full" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                :label="t('common.cancel')"
                @click="showBookingModal = false"
              />
              <UButton
                color="primary"
                :label="t('contracts.modal.createBooking')"
                :loading="saving"
                @click="saveBooking"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
