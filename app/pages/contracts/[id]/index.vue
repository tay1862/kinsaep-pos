<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4"
    >
      <div class="flex items-center gap-4">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          @click="navigateTo('/contracts')"
        />
        <div v-if="contract" class="flex items-center gap-4">
          <div
            class="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
            :class="getStatusBgClass(contract.status)"
          >
            {{ getContractIcon(contract.type) }}
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">
              {{ contract.contractNumber }}
            </h1>
            <div class="flex items-center gap-2 text-sm">
              <UBadge :color="getStatusColor(contract.status)" variant="subtle">
                {{ t(`contracts.status.${contract.status}`) }}
              </UBadge>
              <span class="text-gray-500">•</span>
              <span class="text-gray-500">{{ contract.customerName }}</span>
            </div>
          </div>
        </div>
        <div v-else class="flex items-center gap-4">
          <USkeleton class="w-14 h-14 rounded-xl" />
          <div>
            <USkeleton class="h-6 w-48 mb-2" />
            <USkeleton class="h-4 w-32" />
          </div>
        </div>
      </div>
      <div v-if="contract" class="flex items-center gap-2">
        <UButton
          v-if="contract.status === 'active'"
          color="primary"
          variant="soft"
          icon="i-heroicons-arrow-path"
          :label="t('contracts.detail.renewNow')"
          @click="handleRenew"
        />
        <UButton
          color="neutral"
          variant="soft"
          icon="i-heroicons-printer"
          :label="t('contracts.detail.print')"
          @click="handlePrint"
        />
      </div>
    </div>

    <!-- Stats Cards -->
    <div
      v-if="contract"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4"
    >
      <CommonStatCard
        :label="t('contracts.detail.balance')"
        :value="formatCurrency(balance)"
        :icon="
          balance > 0
            ? 'i-heroicons-exclamation-circle'
            : 'i-heroicons-check-circle'
        "
        :icon-color="balance > 0 ? 'red' : 'green'"
      />
      <CommonStatCard
        :label="t('contracts.detail.totalPaid')"
        :value="formatCurrency(totalPaid)"
        icon="i-heroicons-banknotes"
        icon-color="green"
      />
      <CommonStatCard
        :label="
          daysRemaining >= 0
            ? t('contracts.detail.daysRemaining')
            : t('contracts.detail.daysOverdue')
        "
        :value="Math.abs(daysRemaining).toString()"
        :icon="
          daysRemaining >= 0 ? 'i-heroicons-calendar' : 'i-heroicons-clock'
        "
        :icon-color="daysRemaining >= 0 ? 'blue' : 'red'"
      />
      <CommonStatCard
        :label="t('contracts.depositAmount')"
        :value="formatCurrency(contract.depositAmount || 0)"
        icon="i-heroicons-shield-check"
        :icon-color="
          contract.depositStatus === 'collected' ? 'green' : 'yellow'
        "
      />
    </div>

    <!-- Tabs -->
    <div v-if="contract" class="px-4">
      <UTabs v-model="activeTab" :items="tabs">
        <template #content="{ item }">
          <!-- Overview Tab -->
          <div v-if="item.value === 'overview'" class="pt-6 space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Contract Info -->
              <div
                class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
              >
                <h3 class="font-semibold text-gray-900 dark:text-white mb-4">
                  {{ t("contracts.detail.contractInfo") }}
                </h3>
                <dl class="space-y-3">
                  <div class="flex justify-between">
                    <dt class="text-gray-500">
                      {{ t("contracts.contractType", "Contract Type") }}
                    </dt>
                    <dd class="font-medium text-gray-900 dark:text-white">
                      {{ t(`contracts.types.${contract.type}`) }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-gray-500">
                      {{ t("contracts.startDate") }}
                    </dt>
                    <dd class="font-medium text-gray-900 dark:text-white">
                      {{ formatDate(contract.startDate) }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-gray-500">{{ t("contracts.endDate") }}</dt>
                    <dd class="font-medium text-gray-900 dark:text-white">
                      {{ formatDate(contract.endDate) }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-gray-500">{{ t("contracts.amount") }}</dt>
                    <dd class="font-medium text-gray-900 dark:text-white">
                      {{ formatCurrency(contract.amount) }}/{{
                        t(`contracts.schedules.${contract.paymentSchedule}`)
                      }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-gray-500">
                      {{ t("contracts.renewal.autoRenew") }}
                    </dt>
                    <dd class="font-medium">
                      <UBadge
                        :color="contract.autoRenew ? 'green' : 'gray'"
                        variant="subtle"
                      >
                        {{
                          contract.autoRenew ? t("common.yes") : t("common.no")
                        }}
                      </UBadge>
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Customer Info -->
              <div
                class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
              >
                <h3 class="font-semibold text-gray-900 dark:text-white mb-4">
                  {{ t("contracts.detail.customerInfo") }}
                </h3>
                <dl class="space-y-3">
                  <div class="flex justify-between">
                    <dt class="text-gray-500">
                      {{ t("contracts.customerName") }}
                    </dt>
                    <dd class="font-medium text-gray-900 dark:text-white">
                      {{ contract.customerName }}
                    </dd>
                  </div>
                  <div
                    v-if="contract.customerPhone"
                    class="flex justify-between"
                  >
                    <dt class="text-gray-500">{{ t("common.phone") }}</dt>
                    <dd class="font-medium text-gray-900 dark:text-white">
                      {{ contract.customerPhone }}
                    </dd>
                  </div>
                  <div
                    v-if="contract.customerEmail"
                    class="flex justify-between"
                  >
                    <dt class="text-gray-500">{{ t("common.email") }}</dt>
                    <dd class="font-medium text-gray-900 dark:text-white">
                      {{ contract.customerEmail }}
                    </dd>
                  </div>
                  <div v-if="contract.customerAddress" class="pt-2">
                    <dt class="text-gray-500 mb-1">
                      {{ t("contracts.address") }}
                    </dt>
                    <dd class="text-gray-900 dark:text-white text-sm">
                      {{ contract.customerAddress }}
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Asset Info (if applicable) -->
              <div
                v-if="contract.asset"
                class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
              >
                <h3 class="font-semibold text-gray-900 dark:text-white mb-4">
                  {{ t("contracts.detail.assetInfo") }}
                </h3>
                <div class="flex items-center gap-4 mb-4">
                  <div
                    class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl"
                  >
                    {{ getAssetIcon(contract.asset.type) }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">
                      {{ contract.asset.name }}
                    </p>
                    <p class="text-sm text-gray-500">
                      {{ t(`contracts.assetTypes.${contract.asset.type}`) }}
                    </p>
                  </div>
                </div>
                <dl class="space-y-2 text-sm">
                  <div
                    v-if="contract.asset.location"
                    class="flex justify-between"
                  >
                    <dt class="text-gray-500">{{ t("contracts.location") }}</dt>
                    <dd class="text-gray-900 dark:text-white">
                      {{ contract.asset.location }}
                    </dd>
                  </div>
                  <div
                    v-if="contract.asset.dailyRate"
                    class="flex justify-between"
                  >
                    <dt class="text-gray-500">
                      {{ t("contracts.assetFields.dailyRate") }}
                    </dt>
                    <dd class="text-gray-900 dark:text-white">
                      {{ formatCurrency(contract.asset.dailyRate) }}
                    </dd>
                  </div>
                  <div
                    v-if="contract.asset.monthlyRate"
                    class="flex justify-between"
                  >
                    <dt class="text-gray-500">
                      {{ t("contracts.assetFields.monthlyRate") }}
                    </dt>
                    <dd class="text-gray-900 dark:text-white">
                      {{ formatCurrency(contract.asset.monthlyRate) }}
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Notes -->
              <div
                v-if="contract.notes || contract.terms"
                class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
              >
                <h3 class="font-semibold text-gray-900 dark:text-white mb-4">
                  {{ t("contracts.notes") }}
                </h3>
                <div v-if="contract.notes" class="mb-4">
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ contract.notes }}
                  </p>
                </div>
                <div v-if="contract.terms">
                  <p class="text-xs text-gray-500 font-medium mb-1">
                    {{ t("contracts.terms") }}
                  </p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ contract.terms }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Payments Tab -->
          <div v-if="item.value === 'payments'" class="pt-6 space-y-6">
            <div class="flex justify-between items-center">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ t("contracts.detail.payments") }}
              </h3>
              <UButton
                color="primary"
                icon="i-heroicons-plus"
                :label="t('contracts.detail.recordPayment')"
                @click="showPaymentModal = true"
              />
            </div>

            <!-- Payments Table -->
            <div
              v-if="contractPayments.length > 0"
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <table class="w-full">
                <thead class="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th
                      class="text-left py-3 px-4 font-medium text-gray-500 text-sm"
                    >
                      {{ t("contracts.payment.date") }}
                    </th>
                    <th
                      class="text-left py-3 px-4 font-medium text-gray-500 text-sm"
                    >
                      {{ t("contracts.payment.amount") }}
                    </th>
                    <th
                      class="text-left py-3 px-4 font-medium text-gray-500 text-sm"
                    >
                      {{ t("contracts.payment.method") }}
                    </th>
                    <th
                      class="text-left py-3 px-4 font-medium text-gray-500 text-sm"
                    >
                      {{ t("contracts.payment.reference") }}
                    </th>
                    <th
                      class="text-left py-3 px-4 font-medium text-gray-500 text-sm"
                    >
                      {{ t("common.recordedBy") }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr
                    v-for="payment in contractPayments"
                    :key="payment.id"
                    class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td class="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {{ formatDate(payment.paymentDate) }}
                    </td>
                    <td
                      class="py-3 px-4 text-sm font-medium text-green-600 dark:text-green-400"
                    >
                      +{{ formatCurrency(payment.amount) }}
                    </td>
                    <td
                      class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400"
                    >
                      {{
                        t(`contracts.payment.methods.${payment.paymentMethod}`)
                      }}
                    </td>
                    <td class="py-3 px-4 text-sm text-gray-500">
                      {{ payment.reference || "-" }}
                    </td>
                    <td class="py-3 px-4 text-sm text-gray-500">
                      {{ payment.recordedByName || payment.recordedBy }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Empty State -->
            <div
              v-else
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center"
            >
              <div class="text-4xl mb-4">💳</div>
              <p class="text-gray-500 mb-4">
                {{ t("contracts.detail.noPayments") }}
              </p>
              <UButton
                color="primary"
                icon="i-heroicons-plus"
                :label="t('contracts.detail.recordPayment')"
                @click="showPaymentModal = true"
              />
            </div>
          </div>

          <!-- Renewals Tab -->
          <div v-if="item.value === 'renewals'" class="pt-6 space-y-6">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              {{ t("contracts.renewal.title") }}
            </h3>

            <!-- Renewal Info -->
            <div
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
            >
              <dl class="space-y-4">
                <div class="flex justify-between items-center">
                  <dt class="text-gray-500">
                    {{ t("contracts.renewal.autoRenew") }}
                  </dt>
                  <dd>
                    <UBadge
                      :color="contract.autoRenew ? 'green' : 'gray'"
                      variant="subtle"
                      size="lg"
                    >
                      {{
                        contract.autoRenew ? t("common.yes") : t("common.no")
                      }}
                    </UBadge>
                  </dd>
                </div>
                <div class="flex justify-between items-center">
                  <dt class="text-gray-500">
                    {{ t("contracts.renewal.nextRenewal") }}
                  </dt>
                  <dd class="font-medium text-gray-900 dark:text-white">
                    {{ formatDate(contract.endDate) }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Renewal History from History -->
            <div
              v-if="renewalHistory.length > 0"
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div class="divide-y divide-gray-200 dark:divide-gray-700">
                <div
                  v-for="entry in renewalHistory"
                  :key="entry.id"
                  class="p-4 flex items-center gap-4"
                >
                  <div
                    class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                  >
                    <UIcon
                      name="i-heroicons-arrow-path"
                      class="text-green-600"
                    />
                  </div>
                  <div class="flex-1">
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      {{ entry.details }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ formatDateTime(entry.timestamp) }} •
                      {{ entry.userName }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-else
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center"
            >
              <div class="text-4xl mb-4">🔄</div>
              <p class="text-gray-500">
                {{ t("contracts.renewal.noRenewals") }}
              </p>
            </div>
          </div>

          <!-- History Tab -->
          <div v-if="item.value === 'history'" class="pt-6 space-y-6">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              {{ t("contracts.history.title") }}
            </h3>

            <!-- History Timeline -->
            <div
              v-if="contractHistory.length > 0"
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div class="divide-y divide-gray-200 dark:divide-gray-700">
                <div
                  v-for="entry in contractHistory"
                  :key="entry.id"
                  class="p-4 flex items-start gap-4"
                >
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center"
                    :class="getHistoryIconClass(entry.action)"
                  >
                    <UIcon :name="getHistoryIcon(entry.action)" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <UBadge
                        :color="getHistoryColor(entry.action)"
                        variant="subtle"
                        size="sm"
                      >
                        {{ t(`contracts.history.${entry.action}`) }}
                      </UBadge>
                    </div>
                    <p class="text-sm text-gray-900 dark:text-white">
                      {{ entry.details }}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                      {{ formatDateTime(entry.timestamp) }}
                      {{ t("contracts.history.by") }} {{ entry.userName }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-else
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center"
            >
              <div class="text-4xl mb-4">📋</div>
              <p class="text-gray-500">
                {{ t("contracts.history.noHistory") }}
              </p>
            </div>
          </div>
        </template>
      </UTabs>
    </div>

    <!-- Loading State -->
    <div v-if="!contract && isLoading" class="px-4 space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <USkeleton v-for="i in 4" :key="i" class="h-24 rounded-xl" />
      </div>
      <USkeleton class="h-12 w-full rounded-lg" />
      <USkeleton class="h-96 w-full rounded-xl" />
    </div>

    <!-- Not Found -->
    <div v-if="!contract && !isLoading" class="px-4 py-12 text-center">
      <div class="text-6xl mb-4">📄</div>
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Contract Not Found
      </h2>
      <p class="text-gray-500 mb-6">
        The contract you're looking for doesn't exist.
      </p>
      <UButton
        color="primary"
        :label="t('contracts.detail.backToList')"
        @click="navigateTo('/contracts')"
      />
    </div>

    <!-- Payment Modal -->
    <UModal v-model:open="showPaymentModal">
      <template #content>
        <div class="p-6">
          <div class="mb-6 space-y-2">
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              {{ t("contracts.payment.enterAmount") }}
            </label>
            <div class="flex gap-2">
              <UInput
                v-model="paymentAmount"
                type="number"
                icon="i-heroicons-banknotes"
                :placeholder="t('contracts.payment.amount')"
                class="flex-1"
                min="0"
                step="any"
              />
              <UButton
                v-if="balance > 0"
                color="gray"
                variant="soft"
                size="sm"
                :label="t('contracts.payment.fullBalance')"
                @click="paymentAmount = balance"
              />
            </div>
          </div>

          <PaymentSelector
            :amount="paymentAmount"
            :sats-amount="
              currency.toSats(paymentAmount, contract?.currency || 'LAK')
            "
            :currency="contract?.currency || 'LAK'"
            :order-id="`CTR-${contract?.contractNumber}-${Date.now()}`"
            @paid="handlePaymentComplete"
            @cancel="showPaymentModal = false"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ContractPaymentMethod, PaymentMethod } from "~/types";

const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const contractsStore = useContracts();

// Get contract ID from route
const contractId = computed(() => route.params.id as string);

// Initialize data
await contractsStore.init();

const isLoading = computed(() => contractsStore.isLoading.value);

// Get contract
// Get contract
const contract = computed(() => {
  const allContracts = contractsStore.contracts.value;
  const idOrNumber = contractId.value;
  return (
    allContracts.find((c) => c.id === idOrNumber) ||
    allContracts.find((c) => c.contractNumber === idOrNumber)
  );
});

// Refresh data on mount or when ID changes
watch(
  contractId,
  async (id) => {
    if (id) {
      // If we found the contract locally, use its ID for refresh
      // If not found, use the ID from route (which might be the UUID or Number)
      // Ideally we need the UUID for Nostr refresh.
      // If we only have Contract Number, we can't easily refresh specific ID unless we query by tag?
      // Actually `refreshContract` expects UUID.
      const uuid = contract.value?.id || id;
      // If it looks like a UUID (not starting with CTR-), try refresh
      if (!uuid.startsWith("CTR-")) {
        await contractsStore.refreshContract(uuid);
      }
    }
  },
  { immediate: true }
);

// Tabs
const activeTab = ref("overview");
const tabs = computed(() => [
  { value: "overview", label: t("contracts.detail.overview") },
  { value: "payments", label: t("contracts.detail.payments") },
  { value: "renewals", label: t("contracts.detail.renewals") },
  { value: "history", label: t("contracts.detail.history") },
]);

const currency = useCurrency(); // Use global currency helper

// Payment modal
const showPaymentModal = ref(false);
const savingPayment = ref(false);
const paymentAmount = ref(0);

// Reset amount when modal opens
watch(showPaymentModal, (open) => {
  if (open && contract.value) {
    // Default to full balance if positive, otherwise 0
    const bal = contractsStore.getContractBalance(contract.value.id);
    paymentAmount.value = bal > 0 ? bal : 0;
  }
});

const handlePaymentComplete = async (method: PaymentMethod, proof: any) => {
  savingPayment.value = true;
  try {
    let paymentMethod: ContractPaymentMethod = "cash";
    let notes = `Paid via ${method}`;
    let reference = "";

    // Map methods and extract proof details
    switch (method) {
      case "lightning":
      case "bitcoin":
      case "usdt":
        paymentMethod = "crypto";
        reference = proof.preimage || proof.txid || proof.txHash || "";
        if (reference) notes += `\nRef: ${reference}`;
        break;
      case "bank_transfer":
        paymentMethod = "bank";
        reference = proof.reference || "";
        if (proof.bankAccount) notes += `\nBank: ${proof.bankAccount}`;
        break;
      case "qr_static":
        paymentMethod = "qr";
        notes += "\nVerified manually via static QR";
        break;
      case "external":
        paymentMethod = "card";
        reference = proof.reference || "";
        if (proof.provider) notes += `\nProvider: ${proof.provider}`;
        break;
      case "cash":
      default:
        paymentMethod = "cash";
        if (proof.amountTendered) {
          notes += `\nTendered: ${currency.format(
            proof.amountTendered,
            contract.value?.currency || "LAK"
          )}`;
          notes += `\nChange: ${currency.format(
            proof.change,
            contract.value?.currency || "LAK"
          )}`;
        }
        break;
    }

    await contractsStore.recordPayment({
      contractId: contract.value?.id || contractId.value,
      amount: paymentAmount.value,
      paymentMethod,
      reference,
      notes,
    });

    toast.add({
      title: t("common.success"),
      description: t(
        "contracts.payment.recorded",
        "Payment recorded successfully"
      ),
      color: "green",
    });

    showPaymentModal.value = false;
  } catch (error) {
    console.error("Payment failed:", error);
    toast.add({
      title: t("common.error"),
      description: "Failed to record payment",
      color: "red",
    });
  } finally {
    savingPayment.value = false;
  }
};

// Computed data
const contractPayments = computed(() => {
  if (!contract.value) return [];
  return contractsStore.getPaymentsByContract(contract.value.id);
});

const totalPaid = computed(() => {
  if (!contract.value) return 0;
  return contractsStore.getTotalPaymentsByContract(contract.value.id);
});

const balance = computed(() => {
  if (!contract.value) return 0;
  return contractsStore.getContractBalance(contract.value.id);
});

const daysRemaining = computed(() => {
  if (!contract.value) return 0;
  const end = new Date(contract.value.endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
});

const contractHistory = computed(() => {
  if (!contract.value) return [];
  return contractsStore.getHistoryByEntity("contract", contract.value.id);
});

const renewalHistory = computed(() =>
  contractHistory.value.filter((h) => h.action === "renewed")
);

// Helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: contract.value?.currency || "LAK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function getStatusColor(status: string): any {
  const colors: Record<string, string> = {
    draft: "gray",
    active: "green",
    expired: "red",
    terminated: "red",
    suspended: "yellow",
  };
  return colors[status] || "gray";
}

function getStatusBgClass(status: string): string {
  const classes: Record<string, string> = {
    draft: "bg-gray-100 dark:bg-gray-800",
    active: "bg-green-100 dark:bg-green-900/30",
    expired: "bg-red-100 dark:bg-red-900/30",
    terminated: "bg-red-100 dark:bg-red-900/30",
    suspended: "bg-yellow-100 dark:bg-yellow-900/30",
  };
  return classes[status] || "bg-gray-100 dark:bg-gray-800";
}

function getContractIcon(type: string): string {
  const icons: Record<string, string> = {
    rental: "🏠",
    lease: "📄",
    service: "🛠️",
    subscription: "🔄",
  };
  return icons[type] || "📋";
}

function getAssetIcon(type: string): string {
  const icons: Record<string, string> = {
    room: "🏠",
    vehicle: "🚗",
    equipment: "🔧",
    other: "📦",
  };
  return icons[type] || "📦";
}

function getHistoryIcon(action: string): string {
  const icons: Record<string, string> = {
    created: "i-heroicons-plus-circle",
    updated: "i-heroicons-pencil",
    activated: "i-heroicons-check-circle",
    terminated: "i-heroicons-x-circle",
    renewed: "i-heroicons-arrow-path",
    deleted: "i-heroicons-trash",
    deposit_collected: "i-heroicons-banknotes",
    deposit_returned: "i-heroicons-arrow-uturn-left",
  };
  return icons[action] || "i-heroicons-information-circle";
}

function getHistoryIconClass(action: string): string {
  const classes: Record<string, string> = {
    created: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
    updated: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600",
    activated: "bg-green-100 dark:bg-green-900/30 text-green-600",
    terminated: "bg-red-100 dark:bg-red-900/30 text-red-600",
    renewed: "bg-green-100 dark:bg-green-900/30 text-green-600",
    deleted: "bg-red-100 dark:bg-red-900/30 text-red-600",
    deposit_collected: "bg-green-100 dark:bg-green-900/30 text-green-600",
    deposit_returned: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
  };
  return classes[action] || "bg-gray-100 dark:bg-gray-800 text-gray-600";
}

function getHistoryColor(action: string): any {
  const colors: Record<string, string> = {
    created: "blue",
    updated: "yellow",
    activated: "green",
    terminated: "red",
    renewed: "green",
    deleted: "red",
    deposit_collected: "green",
    deposit_returned: "blue",
  };
  return colors[action] || "gray";
}

// Actions
async function handleRenew() {
  if (!contract.value) return;
  await contractsStore.renewContract(contract.value.id);
  toast.add({
    title: t("contracts.toast.renewed"),
    color: "green",
  });
}

function handlePrint() {
  window.print();
}

// Page meta
definePageMeta({
  layout: "default",
});

useSeoMeta({
  title: () => contract.value?.contractNumber || "Contract Details",
});
</script>
