<!-- components/payment/PaymentSelector.vue -->
<!-- 💳 Unified Payment Method Selector -->
<script setup lang="ts">
import type { CurrencyCode, PaymentMethod } from "~/types";

const props = defineProps<{
  amount: number; // Fiat amount
  satsAmount: number; // Sats amount
  currency: CurrencyCode;
  orderId: string;
  defaultMethod?: PaymentMethod; // Auto-select this method on mount
}>();

const emit = defineEmits<{
  paid: [method: PaymentMethod, proof: unknown];
  cancel: [];
}>();

// Composables
const lightning = useLightning();
const crypto = useCrypto();
const currencyHelper = useCurrency();
const { t } = useI18n();

// State
const selectedMethod = ref<PaymentMethod | null>(null);
const showMethodSelect = ref(true);

// Check Lightning configuration
const isLightningConfigured = computed(
  () => lightning.settings.value?.isConfigured
);
const lightningProvider = computed(() => lightning.settings.value?.provider);

// Check Crypto configuration
const isBitcoinConfigured = computed(() => crypto.isBitcoinConfigured.value);
const isUSDTConfigured = computed(() => crypto.isUSDTConfigured.value);

// Payment methods available
const paymentMethods = computed(() => [
  {
    id: "lightning" as PaymentMethod,
    name: t("payment.methods.lightning"),
    description: t("payment.methods.lightningDesc"),
    icon: "⚡",
    available: isLightningConfigured.value,
    badge:
      lightningProvider.value === "lnurl"
        ? "Lightning Address"
        : lightningProvider.value?.toUpperCase(),
  },
  {
    id: "cash" as PaymentMethod,
    name: t("payment.methods.cash"),
    description: t("payment.methods.cashDesc"),
    icon: "💵",
    available: true,
  },
  {
    id: "bank_transfer" as PaymentMethod,
    name: t("payment.methods.bankTransfer"),
    description: t("payment.methods.bankTransferDesc"),
    icon: "🏦",
    available: true,
  },
  {
    id: "external" as PaymentMethod,
    name: t("payment.methods.external"),
    description: t("payment.methods.externalDesc"),
    icon: "💳",
    available: true,
  },
  {
    id: "qr_static" as PaymentMethod,
    name: t("payment.methods.staticQR"),
    description: t("payment.methods.staticQRDesc"),
    icon: "📱",
    available:
      isLightningConfigured.value && !!lightning.settings.value?.bolt12Offer,
    badge: "BOLT12",
  },
  {
    id: "bitcoin" as PaymentMethod,
    name: t("payment.methods.bitcoin"),
    description: t("payment.methods.bitcoinDesc"),
    icon: "₿",
    available: isBitcoinConfigured.value,
    badge: "On-Chain",
  },
  {
    id: "usdt" as PaymentMethod,
    name: t("payment.methods.usdt"),
    description: t("payment.methods.usdtDesc"),
    icon: "💎",
    available: isUSDTConfigured.value,
    badge: crypto.settings.value.usdtDefaultNetwork?.toUpperCase(),
  },
]);

const selectMethod = (method: PaymentMethod) => {
  selectedMethod.value = method;
  showMethodSelect.value = false;
};

const goBack = () => {
  selectedMethod.value = null;
  showMethodSelect.value = true;
};

const handleLightningPaid = (preimage: string) => {
  emit("paid", "lightning", { preimage });
};

const handleCashPaid = (data: { amountTendered: number; change: number }) => {
  emit("paid", "cash", data);
};

const handleBankTransferPaid = (data: {
  reference: string;
  bankAccount: string;
}) => {
  emit("paid", "bank_transfer", data);
};

const handleExternalPaid = (data: { provider: string; reference?: string }) => {
  emit("paid", "external", data);
};

const handleStaticQRPaid = () => {
  emit("paid", "qr_static", { manual: true });
};

const handleBitcoinPaid = (data: { txid: string; address: string }) => {
  emit("paid", "bitcoin", data);
};

const handleUSDTPaid = (data: {
  txHash: string;
  network: string;
  address: string;
}) => {
  emit("paid", "usdt", data);
};

const handleCancel = () => {
  if (selectedMethod.value) {
    goBack();
  } else {
    emit("cancel");
  }
};

// Load settings on mount and auto-select method if provided
onMounted(async () => {
  await lightning.loadSettings();
  await crypto.loadSettings();

  // Auto-select default method if provided
  if (props.defaultMethod) {
    selectMethod(props.defaultMethod);
  }
});
</script>

<template>
  <div class="min-h-[300px]">
    <!-- Method Selection -->
    <div v-if="showMethodSelect" class="space-y-4">
      <!-- Header -->
      <div class="text-center mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ t("payment.selectMethod") }}
        </h2>
        <div
          class="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl inline-block"
        >
          <span class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ currencyHelper.format(amount, currency) }}
          </span>
          <span class="text-gray-500 dark:text-gray-400 text-sm ml-2">
            ≈ {{ currencyHelper.format(satsAmount, "SATS") }}
          </span>
        </div>
      </div>

      <!-- Payment Method Cards -->
      <div class="space-y-3">
        <button
          v-for="method in paymentMethods"
          :key="method.id"
          :disabled="!method.available"
          class="w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 group"
          :class="[
            method.available
              ? 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 cursor-pointer'
              : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-50 cursor-not-allowed',
          ]"
          @click="method.available && selectMethod(method.id)"
        >
          <div
            class="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform"
          >
            {{ method.icon }}
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-900 dark:text-white">{{
                method.name
              }}</span>
              <UBadge
                v-if="method.badge"
                color="primary"
                variant="soft"
                size="xs"
              >
                {{ method.badge }}
              </UBadge>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ method.description }}
            </p>
            <p
              v-if="!method.available && method.id === 'lightning'"
              class="text-xs text-amber-600 dark:text-amber-400 mt-1"
            >
              {{ t("payment.lightning.notConfigured") }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors"
          />
        </button>
      </div>

      <!-- Configure Lightning Link -->
      <div
        v-if="!isLightningConfigured"
        class="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center"
      >
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {{ t("payment.lightning.configureDescription") }}
        </p>
        <NuxtLinkLocale to="/settings/lightning">
          <UButton
            color="amber"
            variant="soft"
            icon="i-heroicons-cog-6-tooth"
            size="sm"
          >
            {{ t("payment.lightning.goToSettings") }}
          </UButton>
        </NuxtLinkLocale>
      </div>

      <!-- Cancel -->
      <div class="text-center pt-4">
        <UButton color="neutral" variant="ghost" @click="emit('cancel')">
          {{ t("common.cancel") }}
        </UButton>
      </div>
    </div>

    <!-- Payment Components -->
    <div v-else>
      <!-- Back Button -->
      <button
        class="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
        @click="goBack"
      >
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
        <span class="text-sm">{{ t("payment.changeMethod") }}</span>
      </button>

      <!-- Lightning Payment -->
      <PaymentLightning
        v-if="selectedMethod === 'lightning'"
        :amount="satsAmount"
        :fiat-amount="amount"
        :currency="currency"
        :order-id="orderId"
        @paid="handleLightningPaid"
        @cancel="handleCancel"
      />

      <!-- Cash Payment -->
      <PaymentCash
        v-else-if="selectedMethod === 'cash'"
        :amount="amount"
        :currency="currency"
        :order-id="orderId"
        @paid="handleCashPaid"
        @cancel="handleCancel"
      />

      <!-- Bank Transfer Payment -->
      <PaymentBankTransfer
        v-else-if="selectedMethod === 'bank_transfer'"
        :amount="amount"
        :currency="currency"
        :order-id="orderId"
        @paid="handleBankTransferPaid"
        @cancel="handleCancel"
      />

      <!-- External Payment -->
      <PaymentExternal
        v-else-if="selectedMethod === 'external'"
        :amount="amount"
        :currency="currency"
        :order-id="orderId"
        @paid="handleExternalPaid"
        @cancel="handleCancel"
      />

      <!-- Static QR Payment -->
      <div
        v-else-if="selectedMethod === 'qr_static'"
        class="text-center space-y-4"
      >
        <PaymentStaticQR
          :offer="lightning.staticOffers.value[0]"
          :merchant-name="'bnos.space'"
          :description="'Payment for order ' + orderId"
        />

        <!-- Manual Confirmation for Static QR -->
        <div class="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {{ t("payment.staticQR.confirmHint") }}
          </p>
          <UButton
            color="green"
            size="lg"
            icon="i-heroicons-check-circle"
            class="w-full"
            block
            @click="handleStaticQRPaid"
          >
            {{ t("payment.lightning.confirmReceived") }}
          </UButton>
        </div>

        <UButton color="neutral" variant="ghost" @click="handleCancel">
          {{ t("common.cancel") }}
        </UButton>
      </div>

      <!-- Bitcoin On-Chain Payment -->
      <PaymentBitcoin
        v-else-if="selectedMethod === 'bitcoin'"
        :amount="amount"
        :currency="currency"
        :order-id="orderId"
        @paid="handleBitcoinPaid"
        @cancel="handleCancel"
      />

      <!-- USDT Payment -->
      <PaymentUSDT
        v-else-if="selectedMethod === 'usdt'"
        :amount="amount"
        :currency="currency"
        :order-id="orderId"
        @paid="handleUSDTPaid"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>
