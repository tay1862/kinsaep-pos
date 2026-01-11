<!-- components/payment/PaymentUSDT.vue -->
<!-- 💵 USDT Stablecoin Payment Component -->
<script setup lang="ts">
import type { CurrencyCode, USDTNetwork } from "~/types";
import QrcodeVue from "qrcode.vue";

const props = defineProps<{
  amount: number; // Fiat amount
  currency: CurrencyCode;
  orderId: string;
}>();

const emit = defineEmits<{
  paid: [data: { txHash: string; network: USDTNetwork; address: string }];
  cancel: [];
}>();

const { t } = useI18n();
const crypto = useCrypto();
const currencyHelper = useCurrency();

// State
const paymentStep = ref<"network" | "generating" | "waiting" | "success" | "error">("network");
const selectedNetwork = ref<USDTNetwork>("tron");
const countdown = ref(1800); // 30 minutes
const successCountdown = ref(3);

// Network options
const networks = computed(() => [
  {
    id: "tron" as USDTNetwork,
    name: "Tron (TRC-20)",
    icon: "💎",
    fee: crypto.getNetworkFee("tron"),
    available: !!crypto.settings.value.usdtAddresses.tron,
  },
  {
    id: "polygon" as USDTNetwork,
    name: "Polygon",
    icon: "🟣",
    fee: crypto.getNetworkFee("polygon"),
    available: !!crypto.settings.value.usdtAddresses.polygon,
  },
  {
    id: "ethereum" as USDTNetwork,
    name: "Ethereum (ERC-20)",
    icon: "⟠",
    fee: crypto.getNetworkFee("ethereum"),
    available: !!crypto.settings.value.usdtAddresses.ethereum,
  },
  {
    id: "arbitrum" as USDTNetwork,
    name: "Arbitrum",
    icon: "🔵",
    fee: crypto.getNetworkFee("arbitrum"),
    available: !!crypto.settings.value.usdtAddresses.arbitrum,
  },
]);

const availableNetworks = computed(() => networks.value.filter((n) => n.available));

onMounted(async () => {
  await crypto.loadSettings();

  // Skip network selection if only one available
  if (availableNetworks.value.length === 1 && availableNetworks.value[0]) {
    selectedNetwork.value = availableNetworks.value[0].id;
    await generateInvoice();
  } else if (availableNetworks.value.length === 0) {
    paymentStep.value = "error";
    crypto.error.value = t("payment.usdt.noNetworksConfigured");
  }
});

const selectNetwork = async (network: USDTNetwork) => {
  selectedNetwork.value = network;
  await generateInvoice();
};

const generateInvoice = async () => {
  paymentStep.value = "generating";

  const invoice = await crypto.createUSDTInvoice(
    props.orderId,
    props.amount,
    props.currency,
    selectedNetwork.value
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
  if (!crypto.currentUSDTPayment.value) return;

  crypto.watchUSDTPayment(crypto.currentUSDTPayment.value, (txHash: string) => {
    paymentStep.value = "success";
    startSuccessCountdown();
  });
};

// Countdown
let countdownInterval: ReturnType<typeof setInterval>;

const startCountdown = () => {
  countdownInterval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownInterval);
      if (paymentStep.value === "waiting") {
        paymentStep.value = "error";
        crypto.error.value = t("payment.usdt.expired");
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
        txHash: crypto.currentUSDTPayment.value?.txHash || "",
        network: selectedNetwork.value,
        address: crypto.currentUSDTPayment.value?.address || "",
      });
    }
  }, 1000);
};

// Copy address
const copyAddress = async () => {
  const address = crypto.currentUSDTPayment.value?.address;
  if (address) {
    await navigator.clipboard.writeText(address);
  }
};

const copyAmount = async () => {
  const amount = crypto.currentUSDTPayment.value?.amountUSDT;
  if (amount) {
    await navigator.clipboard.writeText(amount);
  }
};

const handleCancel = () => {
  crypto.reset();
  emit("cancel");
};

const handleTryAgain = () => {
  crypto.reset();
  paymentStep.value = "network";
};

// Manual confirmation
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
        <span class="text-3xl">💵</span>
        {{ t("payment.usdt.title") }}
      </h2>
      <div class="mt-2">
        <span class="text-3xl font-bold text-green-600">
          {{ currencyHelper.format(amount, currency) }}
        </span>
      </div>
    </div>

    <!-- Network Selection -->
    <div v-if="paymentStep === 'network'" class="space-y-4">
      <p class="text-gray-500">{{ t("payment.usdt.selectNetwork") }}</p>

      <div class="space-y-3 max-w-sm mx-auto">
        <button v-for="network in availableNetworks" :key="network.id"
          class="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-all flex items-center gap-4 group"
          @click="selectNetwork(network.id)">
          <div class="text-3xl">{{ network.icon }}</div>
          <div class="flex-1 text-left">
            <p class="font-medium text-gray-900 dark:text-white">
              {{ network.name }}
            </p>
            <p class="text-xs text-gray-500">
              {{ t("payment.usdt.networkFee") }}: {{ network.fee }}
            </p>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-400 group-hover:text-green-500" />
        </button>
      </div>

      <UButton color="neutral" variant="ghost" @click="handleCancel">
        {{ t("common.cancel") }}
      </UButton>
    </div>

    <!-- Generating State -->
    <div v-else-if="paymentStep === 'generating'" class="py-12">
      <div class="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
      <p class="mt-4 text-gray-500 dark:text-gray-400">
        {{ t("payment.usdt.generating") }}
      </p>
    </div>

    <!-- Waiting for Payment -->
    <div v-else-if="paymentStep === 'waiting'" class="space-y-4">
      <!-- Network Badge -->
      <div class="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">
        <span>{{networks.find(n => n.id === selectedNetwork)?.icon}}</span>
        <span>{{networks.find(n => n.id === selectedNetwork)?.name}}</span>
      </div>

      <!-- Amount to Send -->
      <div class="bg-green-500/10 border border-green-500/20 rounded-xl p-4 max-w-sm mx-auto">
        <p class="text-sm text-gray-500 mb-1">{{ t("payment.usdt.sendExactly") }}</p>
        <div class="flex items-center justify-center gap-2">
          <span class="text-3xl font-bold text-green-600">
            {{ crypto.currentUSDTPayment.value?.amountUSDT }} USDT
          </span>
          <UButton color="neutral" variant="ghost" size="xs" icon="i-heroicons-clipboard-document"
            @click="copyAmount" />
        </div>
        <p class="text-xs text-amber-600 mt-2">
          ⚠️ {{ t("payment.usdt.exactAmountWarning") }}
        </p>
      </div>

      <!-- QR Code -->
      <div class="bg-white p-4 rounded-2xl inline-block shadow-lg">
        <QrcodeVue :value="crypto.currentUSDTPayment.value?.address || ''" :size="200" level="M" render-as="svg"
          background="#ffffff" foreground="#000000" />
      </div>

      <!-- Address Display -->
      <div class="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 mx-auto max-w-sm">
        <p class="text-xs text-gray-500 mb-1">{{ t("payment.usdt.sendTo") }}</p>
        <p class="font-mono text-xs break-all text-gray-900 dark:text-white">
          {{ crypto.currentUSDTPayment.value?.address }}
        </p>
      </div>

      <!-- Timer -->
      <div class="text-sm text-gray-500">
        {{ t("payment.usdt.expiresIn") }}
        <span class="text-green-600 font-mono">{{ formattedCountdown }}</span>
      </div>

      <!-- Actions -->
      <div class="flex justify-center gap-3">
        <UButton color="neutral" variant="outline" icon="i-heroicons-clipboard-document" @click="copyAddress">
          {{ t("payment.usdt.copyAddress") }}
        </UButton>
      </div>

      <!-- Network Fee Note -->
      <p class="text-xs text-gray-400">
        {{ t("payment.usdt.networkFeeNote") }}: {{ crypto.currentUSDTPayment.value?.networkFee }}
      </p>

      <!-- Manual Confirm -->
      <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p class="text-xs text-gray-500 mb-2">
          {{ t("payment.usdt.manualConfirmHint") }}
        </p>
        <UButton color="primary" variant="soft" size="sm" @click="confirmPaymentReceived">
          {{ t("payment.usdt.confirmReceived") }}
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
        {{ t("payment.usdt.success") }}
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
        {{ t("payment.usdt.error") }}
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
