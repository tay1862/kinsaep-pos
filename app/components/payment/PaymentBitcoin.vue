<!-- components/payment/PaymentBitcoin.vue -->
<!-- ₿ Bitcoin On-Chain Payment Component with QR Code -->
<script setup lang="ts">
import type { CurrencyCode } from "~/types";
import QrcodeVue from 'qrcode.vue';

const props = defineProps<{
  amount: number; // Fiat amount
  currency: CurrencyCode;
  orderId: string;
}>();

const emit = defineEmits<{
  paid: [data: { txid: string; address: string }];
  cancel: [];
}>();

const { t } = useI18n();
const crypto = useCrypto();
const currencyHelper = useCurrency();

// State
const paymentStep = ref<"generating" | "waiting" | "confirming" | "success" | "error">("generating");
const countdown = ref(1800); // 30 minutes in seconds
const successCountdown = ref(3);

// Generate invoice on mount
onMounted(async () => {
  await crypto.loadSettings();
  await generateInvoice();
});

const generateInvoice = async () => {
  paymentStep.value = "generating";

  const invoice = await crypto.createBitcoinInvoice(
    props.orderId,
    props.amount,
    props.currency,
    `Order ${props.orderId}`
  );

  if (invoice) {
    paymentStep.value = "waiting";
    startCountdown();
    watchForPayment();
  } else {
    paymentStep.value = "error";
  }
};

const watchForPayment = () => {
  if (!crypto.currentBitcoinPayment.value) return;

  crypto.watchBitcoinPayment(
    crypto.currentBitcoinPayment.value.id,
    () => {
      paymentStep.value = "success";
      startSuccessCountdown();
    }
  );
};

// Countdown timer
let countdownInterval: ReturnType<typeof setInterval>;

const startCountdown = () => {
  countdownInterval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownInterval);
      if (paymentStep.value === "waiting") {
        paymentStep.value = "error";
        crypto.error.value = t("payment.bitcoin.expired");
      }
    }
  }, 1000);
};

const formattedCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60);
  const seconds = countdown.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

// Success countdown
let successInterval: ReturnType<typeof setInterval>;

const startSuccessCountdown = () => {
  successInterval = setInterval(() => {
    successCountdown.value--;
    if (successCountdown.value <= 0) {
      clearInterval(successInterval);
      emit("paid", {
        txid: crypto.currentBitcoinPayment.value?.txid || "",
        address: crypto.currentBitcoinPayment.value?.address || "",
      });
    }
  }, 1000);
};

// Bitcoin URI for QR code
const bitcoinUri = computed(() => {
  const payment = crypto.currentBitcoinPayment.value;
  if (!payment) return "";
  return `bitcoin:${payment.address}?amount=${payment.amountBTC}`;
});

// Confirmation display
const confirmationText = computed(() => {
  const payment = crypto.currentBitcoinPayment.value;
  if (!payment) return "";
  return `${payment.confirmations}/${payment.requiredConfirmations}`;
});

const confirmationProgress = computed(() => {
  const payment = crypto.currentBitcoinPayment.value;
  if (!payment) return 0;
  return (payment.confirmations / payment.requiredConfirmations) * 100;
});

// Copy address
const copyAddress = async () => {
  const address = crypto.currentBitcoinPayment.value?.address;
  if (address) {
    await navigator.clipboard.writeText(address);
    // Could show toast here
  }
};

const handleCancel = () => {
  crypto.reset();
  emit("cancel");
};

const handleTryAgain = () => {
  crypto.reset();
  generateInvoice();
};

// Manual confirmation for when auto-detection fails
const confirmPaymentReceived = () => {
  paymentStep.value = "success";
  startSuccessCountdown();
};

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval);
  if (successInterval) clearInterval(successInterval);
});
</script>

<template>
  <div class="text-center">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold flex items-center justify-center gap-2 text-gray-900 dark:text-white">
        <span class="text-3xl">₿</span>
        {{ t("payment.bitcoin.title") }}
      </h2>
      <div class="mt-2">
        <span class="text-3xl font-bold text-orange-600">
          {{ currencyHelper.format(amount, currency) }}
        </span>
      </div>
      <div v-if="crypto.currentBitcoinPayment.value" class="text-sm text-gray-500 mt-1">
        ≈ {{ crypto.currentBitcoinPayment.value.amountBTC }} BTC
        ({{ crypto.currentBitcoinPayment.value.amountSats.toLocaleString() }} sats)
      </div>
    </div>

    <!-- Generating State -->
    <div v-if="paymentStep === 'generating'" class="py-12">
      <div class="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto" />
      <p class="mt-4 text-gray-500 dark:text-gray-400">
        {{ t("payment.bitcoin.generating") }}
      </p>
    </div>

    <!-- Waiting for Payment -->
    <!-- Waiting for Payment -->
    <div v-else-if="paymentStep === 'waiting'" class="space-y-4">
      <!-- QR Code -->
      <div class="bg-white p-4 rounded-2xl inline-block shadow-lg">
        <QrcodeVue :value="bitcoinUri" :size="220" level="M" render-as="svg" background="#ffffff"
          foreground="#000000" />
      </div>

      <!-- Address Display -->
      <div class="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 mx-auto max-w-sm">
        <p class="text-xs text-gray-500 mb-1">{{ t("payment.bitcoin.sendTo") }}</p>
        <p class="font-mono text-xs break-all text-gray-900 dark:text-white">
          {{ crypto.currentBitcoinPayment.value?.address }}
        </p>
      </div>

      <!-- Timer -->
      <div class="text-sm text-gray-500">
        {{ t("payment.bitcoin.expiresIn") }}
        <span class="text-orange-600 font-mono">{{ formattedCountdown }}</span>
      </div>

      <!-- Actions -->
      <div class="flex justify-center gap-3">
        <UButton color="neutral" variant="outline" icon="i-heroicons-clipboard-document" @click="copyAddress">
          {{ t("payment.bitcoin.copyAddress") }}
        </UButton>
      </div>

      <!-- Confirmation Status -->
      <div
        v-if="crypto.currentBitcoinPayment.value?.confirmations && crypto.currentBitcoinPayment.value.confirmations > 0"
        class="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
        <div class="flex items-center justify-center gap-2 text-green-600">
          <UIcon name="i-heroicons-check-circle" class="w-5 h-5" />
          <span>{{ t("payment.bitcoin.txDetected") }}</span>
        </div>
        <div class="mt-2">
          <div class="text-sm text-gray-600">
            {{ t("payment.bitcoin.confirmations", { count: confirmationText }) }}
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
            <div class="bg-green-500 h-2 rounded-full transition-all duration-500"
              :style="{ width: `${confirmationProgress}%` }" />
          </div>
        </div>
      </div>

      <!-- Manual Confirm (fallback) -->
      <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p class="text-xs text-gray-500 mb-2">
          {{ t("payment.bitcoin.manualConfirmHint") }}
        </p>
        <UButton color="primary" variant="soft" size="sm" @click="confirmPaymentReceived">
          {{ t("payment.bitcoin.confirmReceived") }}
        </UButton>
      </div>

      <!-- Cancel -->
      <UButton color="neutral" variant="ghost" @click="handleCancel">
        {{ t("common.cancel") }}
      </UButton>
    </div>

    <!-- Success State -->
    <div v-else-if="paymentStep === 'success'" class="py-12 space-y-4">
      <div class="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
        <UIcon name="i-heroicons-check" class="w-10 h-10 text-green-500" />
      </div>
      <h3 class="text-xl font-bold text-green-600">
        {{ t("payment.bitcoin.success") }}
      </h3>
      <p class="text-gray-500">
        {{ t("payment.closingIn", { seconds: successCountdown }) }}
      </p>
    </div>

    <!-- Error State -->
    <div v-else-if="paymentStep === 'error'" class="py-12 space-y-4">
      <div class="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
        <UIcon name="i-heroicons-x-mark" class="w-10 h-10 text-red-500" />
      </div>
      <h3 class="text-xl font-bold text-red-600">
        {{ t("payment.bitcoin.error") }}
      </h3>
      <p class="text-gray-500">{{ crypto.error.value }}</p>
      <div class="flex justify-center gap-3">
        <UButton color="primary" @click="handleTryAgain">
          {{ t("common.tryAgain") }}
        </UButton>
        <UButton color="neutral" variant="ghost" @click="handleCancel">
          {{ t("common.cancel") }}
        </UButton>
      </div>
    </div>
  </div>
</template>
