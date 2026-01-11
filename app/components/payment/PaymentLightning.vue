<!-- components/payment/PaymentLightning.vue -->
<!-- ⚡ Lightning Payment Component with QR Code -->
<script setup lang="ts">
import type { CurrencyCode } from "~/types";
import QrcodeVue from "qrcode.vue";

const props = defineProps<{
  amount: number; // in sats
  fiatAmount: number;
  currency: CurrencyCode;
  orderId: string;
}>();

const emit = defineEmits<{
  paid: [preimage: string];
  cancel: [];
}>();

// Composables
const lightning = useLightning();
const security = useSecurity();
const currencyHelper = useCurrency();
const sound = useSound();
const pos = usePOS();
const { t } = useI18n();

// State
const paymentStep = ref<
  "locked" | "generating" | "waiting" | "success" | "error"
>("generating");
const errorMessage = ref("");
const countdown = ref(600); // 10 minutes
const showBolt12 = ref(false);
const showErrorModal = ref(false);
const checkingPayment = ref(false);
const successCountdown = ref(3); // Auto-close after 3 seconds
const isFadingOut = ref(false);
const showManualApprove = ref(false); // Show manual approve after 30 seconds
const manualApproveTimer = ref(30); // Countdown to show manual approve option
const unlockPassword = ref("");
const unlockError = ref("");
const isUnlocking = ref(false);

// Computed
const isLNURLProvider = computed(
  () => lightning.settings.value?.provider === "lnurl"
);
const isWebLNProvider = computed(
  () => lightning.settings.value?.provider === "alby"
);
const needsManualConfirm = computed(
  () => isLNURLProvider.value || isWebLNProvider.value
);
const hasAutoDetection = computed(() => {
  const provider = lightning.settings.value?.provider;
  return (
    provider === "lnbits" || provider === "alby-hub" || provider === "blink"
  );
});
const lightningAddress = computed(
  () => lightning.settings.value?.lightningAddress || ""
);
const providerName = computed(() => {
  const provider = lightning.settings.value?.provider;
  switch (provider) {
    case "lnurl":
      return "Lightning Address";
    case "lnbits":
      return "LNbits";
    case "alby":
      return "Alby (WebLN)";
    case "alby-hub":
      return "Alby Hub";
    case "blink":
      return "Blink";
    case "nwc":
      return "NWC";
    default:
      return provider || "Unknown";
  }
});

// Payment status display
const paymentStatusDisplay = computed(() => {
  const status = lightning.paymentStatus.value;
  switch (status) {
    case "pending":
      return {
        text: t("payment.lightning.statusPending"),
        color: "amber",
        icon: "i-heroicons-clock",
      };
    case "processing":
      return {
        text: t("payment.lightning.statusProcessing"),
        color: "blue",
        icon: "i-heroicons-arrow-path",
      };
    case "completed":
      return {
        text: t("payment.lightning.statusCompleted"),
        color: "green",
        icon: "i-heroicons-check-circle",
      };
    case "failed":
      return {
        text: t("payment.lightning.statusFailed"),
        color: "red",
        icon: "i-heroicons-x-circle",
      };
    case "expired":
      return {
        text: t("payment.lightning.statusExpired"),
        color: "gray",
        icon: "i-heroicons-clock",
      };
    default:
      return {
        text: t("payment.lightning.statusWaiting"),
        color: "gray",
        icon: "i-heroicons-signal",
      };
  }
});

// Generate invoice on mount
onMounted(async () => {
  // Initialize security first
  security.initialize();

  // Load settings first to check configuration
  await lightning.loadSettings();

  // Check if we can access API keys (handles encrypted data case)
  if (!lightning.canAccessKeys()) {
    paymentStep.value = "locked";
    return;
  }

  // Generate invoice
  await generateInvoice();
});

// Handle unlock
const handleUnlock = async () => {
  if (!unlockPassword.value) {
    unlockError.value = t("settings.security.passwordRequired");
    return;
  }

  isUnlocking.value = true;
  unlockError.value = "";

  try {
    const success = await security.unlock(unlockPassword.value);
    if (success) {
      unlockPassword.value = "";
      // Now load settings and generate invoice
      await lightning.loadSettings();
      await generateInvoice();
    } else {
      unlockError.value = t("settings.security.wrongPassword");
    }
  } catch (e) {
    unlockError.value = e instanceof Error ? e.message : "Unlock failed";
  } finally {
    isUnlocking.value = false;
  }
};

const generateInvoice = async () => {
  paymentStep.value = "generating";
  errorMessage.value = "";
  showErrorModal.value = false;

  try {
    // Check if we can access API keys (shouldn't happen but safety check)
    if (!lightning.canAccessKeys()) {
      paymentStep.value = "locked";
      return;
    }

    // Reload settings to ensure we have latest config
    await lightning.loadSettings();

    // Check if Lightning is configured
    if (!lightning.settings.value?.isConfigured) {
      throw new Error(t("payment.lightning.notConfigured"));
    }

    const invoice = await lightning.createInvoice(
      props.amount,
      `Order ${props.orderId}`,
      {
        orderId: props.orderId,
        fiatAmount: props.fiatAmount,
        currency: props.currency,
      }
    );

    if (invoice) {
      paymentStep.value = "waiting";
      startCountdown();
      watchForPayment();

      // Broadcast invoice to customer display
      pos.setPaymentState({
        status: "pending",
        method: "lightning",
        invoiceData: invoice.bolt11,
        amount: props.fiatAmount,
        satsAmount: props.amount,
      });
    } else {
      throw new Error(
        lightning.error.value || t("payment.lightning.invoiceFailed")
      );
    }
  } catch (e) {
    sound.playError();
    paymentStep.value = "error";
    errorMessage.value =
      e instanceof Error ? e.message : t("payment.lightning.invoiceFailed");
    showErrorModal.value = true;
  }
};

const watchForPayment = () => {
  // Watch for payment status changes
  watch(
    () => lightning.paymentStatus.value,
    (status) => {
      if (status === "completed") {
        sound.playLightningZap();
        paymentStep.value = "success";
        clearInterval(countdownInterval);
        startSuccessCountdown();
      }
    }
  );
};

let successInterval: ReturnType<typeof setInterval>;

const startSuccessCountdown = () => {
  // Emit IMMEDIATELY - save order first, then show countdown for UX
  emit("paid", lightning.currentInvoice.value?.preimage || "");

  // Countdown is just for display/animation, not blocking emit
  successCountdown.value = 3;
  successInterval = setInterval(() => {
    successCountdown.value--;
    if (successCountdown.value <= 0) {
      clearInterval(successInterval);
      isFadingOut.value = true;
    }
  }, 1000);
};

let countdownInterval: ReturnType<typeof setInterval>;
let manualApproveInterval: ReturnType<typeof setInterval>;

const startCountdown = () => {
  // Main countdown for invoice expiry
  countdownInterval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownInterval);
      paymentStep.value = "error";
      errorMessage.value = t("payment.lightning.invoiceExpired");
      showErrorModal.value = true;
    }
  }, 1000);

  // Manual approve countdown (show option after 30 seconds)
  manualApproveTimer.value = 30;
  manualApproveInterval = setInterval(() => {
    manualApproveTimer.value--;
    if (manualApproveTimer.value <= 0) {
      clearInterval(manualApproveInterval);
      showManualApprove.value = true;
    }
  }, 1000);
};

const formattedCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60);
  const seconds = countdown.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

const copyInvoice = async () => {
  if (lightning.invoiceQR.value) {
    await navigator.clipboard.writeText(lightning.invoiceQR.value);
    // Could show toast here
  }
};

const openWallet = () => {
  if (lightning.invoiceQR.value) {
    window.location.href = `lightning:${lightning.invoiceQR.value}`;
  }
};

const handleTryAgain = () => {
  showErrorModal.value = false;
  countdown.value = 600;
  generateInvoice();
};

const handleCancel = () => {
  showErrorModal.value = false;
  emit("cancel");
};

// Manual confirmation for LNURL (since we can't check payment status automatically)
const confirmPaymentReceived = () => {
  checkingPayment.value = true;
  // For LNURL, we trust the cashier's confirmation
  // In production, you might want to add additional verification
  setTimeout(() => {
    sound.playLightningZap();
    paymentStep.value = "success";
    checkingPayment.value = false;
    clearInterval(countdownInterval);
    if (manualApproveInterval) clearInterval(manualApproveInterval);
    startSuccessCountdown();
  }, 500);
};

// Emergency manual approval (for system errors, network issues, etc.)
const emergencyApprove = () => {
  checkingPayment.value = true;
  setTimeout(() => {
    sound.playLightningZap();
    paymentStep.value = "success";
    checkingPayment.value = false;
    clearInterval(countdownInterval);
    if (manualApproveInterval) clearInterval(manualApproveInterval);
    startSuccessCountdown();
  }, 500);
};

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  if (successInterval) {
    clearInterval(successInterval);
  }
  if (manualApproveInterval) {
    clearInterval(manualApproveInterval);
  }
});
</script>

<template>
  <div class="text-center">
    <!-- Header -->
    <div class="mb-6">
      <h2
        class="text-2xl font-bold flex items-center justify-center gap-2 text-gray-900 dark:text-white"
      >
        <span class="text-3xl">⚡</span>
        {{ t("payment.lightning.title") }}
      </h2>
      <p class="text-gray-500 dark:text-gray-400 mt-2">
        {{ t("payment.lightning.scanOrCopy") }}
      </p>
    </div>

    <!-- Amount Display -->
    <div class="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
      <div class="text-3xl font-bold text-amber-600 dark:text-amber-400">
        {{ currencyHelper.format(amount, "SATS") }}
      </div>
      <div class="text-gray-500 dark:text-gray-400 text-sm mt-1">
        ≈ {{ currencyHelper.format(fiatAmount, currency) }}
      </div>
      <div
        v-if="pos.discountAmount.value > 0"
        class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center"
      >
        <span class="text-sm text-green-600 dark:text-green-400"
          >Discount Applied</span
        >
        <span class="text-sm font-medium text-green-600 dark:text-green-400"
          >-{{
            currencyHelper.format(pos.discountAmount.value, currency)
          }}</span
        >
      </div>
      <!-- Show Lightning Address for LNURL provider -->
      <div
        v-if="isLNURLProvider && lightningAddress"
        class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
      >
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ t("payment.lightning.receivingTo") }}
        </div>
        <div
          class="text-sm font-medium text-gray-900 dark:text-white flex items-center justify-center gap-2"
        >
          <span>⚡</span>
          <span>{{ lightningAddress }}</span>
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {{ providerName }}
        </div>
      </div>
    </div>

    <!-- Locked State (need to unlock encryption) -->
    <div v-if="paymentStep === 'locked'" class="py-12 space-y-4">
      <div
        class="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto"
      >
        <UIcon
          name="i-heroicons-lock-closed"
          class="w-10 h-10 text-amber-500"
        />
      </div>
      <h3 class="text-xl font-bold text-gray-900 dark:text-white">
        {{ t("payment.lightning.unlockRequired", "Unlock Required") }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
        {{
          t("payment.lightning.unlockDescription", "Enter your master password to access encrypted API keys.")
        }}
      </p>

      <div class="max-w-xs mx-auto space-y-3">
        <UInput
          v-model="unlockPassword"
          type="password"
          :placeholder="t('settings.security.enterPassword')"
          class="w-full"
          @keyup.enter="handleUnlock"
        />
        <p v-if="unlockError" class="text-red-500 text-sm">{{ unlockError }}</p>
        <UButton
          color="primary"
          block
          :loading="isUnlocking"
          icon="i-heroicons-lock-open"
          @click="handleUnlock"
        >
          {{ t("settings.security.unlock", "Unlock") }}
        </UButton>
      </div>

      <UButton color="neutral" variant="ghost" @click="emit('cancel')">
        {{ t("common.cancel") }}
      </UButton>
    </div>

    <!-- Generating State -->
    <div v-else-if="paymentStep === 'generating'" class="py-12">
      <div
        class="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto"
      />
      <p class="mt-4 text-gray-500 dark:text-gray-400">
        {{ t("payment.lightning.generating") }}
      </p>
    </div>

    <!-- Waiting for Payment -->
    <div v-else-if="paymentStep === 'waiting'" class="space-y-4">
      <!-- QR Type Toggle -->
      <div class="flex justify-center gap-2 mb-4">
        <UButton
          :color="!showBolt12 ? 'primary' : 'neutral'"
          :variant="!showBolt12 ? 'solid' : 'outline'"
          size="sm"
          @click="showBolt12 = false"
        >
          BOLT11 (Standard)
        </UButton>
        <UButton
          :color="showBolt12 ? 'primary' : 'neutral'"
          :variant="showBolt12 ? 'solid' : 'outline'"
          size="sm"
          @click="showBolt12 = true"
        >
          BOLT12 (Static)
        </UButton>
      </div>

      <!-- QR Code -->
      <div class="bg-white p-4 rounded-2xl inline-block shadow-lg">
        <QrcodeVue
          v-if="lightning.invoiceQR.value"
          :value="lightning.invoiceQR.value"
          :size="250"
          level="M"
          render-as="svg"
          background="#ffffff"
          foreground="#000000"
        />
        <div
          v-else
          class="w-64 h-64 bg-gray-200 flex items-center justify-center"
        >
          <span class="text-gray-400">No QR</span>
        </div>
      </div>

      <!-- Countdown -->
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {{ t("payment.lightning.expiresIn") }}
        <span class="text-amber-600 dark:text-amber-400 font-mono">{{
          formattedCountdown
        }}</span>
      </div>

      <!-- Invoice Actions -->
      <div class="flex justify-center gap-3">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-clipboard-document"
          @click="copyInvoice"
        >
          {{ t("payment.lightning.copyInvoice") }}
        </UButton>
        <UButton color="primary" icon="i-heroicons-bolt" @click="openWallet">
          {{ t("payment.lightning.openWallet") }}
        </UButton>
      </div>

      <!-- Invoice String (truncated) -->
      <div
        class="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-mono text-gray-500 dark:text-gray-400 break-all max-h-20 overflow-hidden"
      >
        {{ lightning.invoiceQR.value?.slice(0, 100) }}...
      </div>

      <!-- Payment Status Indicator -->
      <div class="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <div class="flex items-center justify-center gap-3">
          <div
            class="w-3 h-3 rounded-full animate-pulse"
            :class="{
              'bg-amber-500': paymentStatusDisplay.color === 'amber',
              'bg-blue-500': paymentStatusDisplay.color === 'blue',
              'bg-green-500': paymentStatusDisplay.color === 'green',
              'bg-red-500': paymentStatusDisplay.color === 'red',
              'bg-gray-500': paymentStatusDisplay.color === 'gray',
            }"
          />
          <UIcon
            :name="paymentStatusDisplay.icon"
            class="w-5 h-5 text-gray-600 dark:text-gray-400"
          />
          <span class="font-medium text-gray-700 dark:text-gray-300">
            {{ paymentStatusDisplay.text }}
          </span>
        </div>

        <!-- Provider Info -->
        <div
          class="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2"
        >
          <span>{{ providerName }}</span>
          <span v-if="hasAutoDetection" class="text-green-500"
            >• {{ t("payment.lightning.autoDetection") }}</span
          >
        </div>
      </div>

      <!-- Auto-detection Badge -->
      <div v-if="hasAutoDetection" class="mt-3">
        <UBadge color="green" variant="subtle" class="text-xs">
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {{ t("payment.lightning.autoDetection") }}
          </span>
        </UBadge>
      </div>

      <!-- Manual Confirmation for LNURL/WebLN (no automatic callback) -->
      <div
        v-if="needsManualConfirm"
        class="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl"
      >
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {{ t("payment.lightning.lnurlManualConfirmHint") }}
        </p>
        <UButton
          color="green"
          size="lg"
          :loading="checkingPayment"
          icon="i-heroicons-check-circle"
          class="w-full"
          block
          @click="confirmPaymentReceived"
        >
          {{ t("payment.lightning.confirmReceived") }}
        </UButton>
      </div>

      <!-- Emergency Manual Approve (shows after 30 seconds for all providers) -->
      <div
        v-if="showManualApprove && !needsManualConfirm"
        class="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
      >
        <div
          class="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2"
        >
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
          <span class="font-semibold text-sm">{{
            t("payment.lightning.manualApproveTitle", "Manual Override")
          }}</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {{
            t("payment.lightning.manualApproveHint", "If customer has paid but auto-detection failed (network issue, system error), you can manually approve:")
          }}
        </p>
        <UButton
          color="red"
          variant="soft"
          size="lg"
          :loading="checkingPayment"
          icon="i-heroicons-shield-check"
          class="w-full"
          @click="emergencyApprove"
        >
          {{
            t("payment.lightning.manualApprove", "⚠️ Manually Approve Payment")
          }}
        </UButton>
        <p class="text-xs text-gray-400 mt-2">
          {{
            t("payment.lightning.manualApproveWarning", "Only use if you have confirmed payment was received.")
          }}
        </p>
      </div>

      <!-- Waiting for manual approve option -->
      <div
        v-else-if="
          !needsManualConfirm &&
          manualApproveTimer > 0 &&
          paymentStep === 'waiting'
        "
        class="mt-4 text-center"
      >
        <p class="text-xs text-gray-400">
          {{
            t("payment.lightning.manualApproveAvailableIn", "Manual override available in")
          }}
          {{ manualApproveTimer }}s
        </p>
      </div>
    </div>

    <!-- Success State -->
    <div
      v-else-if="paymentStep === 'success'"
      class="py-8 transition-all duration-500"
      :class="{
        'opacity-0 scale-95': isFadingOut,
        'opacity-100 scale-100': !isFadingOut,
      }"
    >
      <!-- Success Animation -->
      <div class="relative">
        <!-- Ripple Effect -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-32 h-32 bg-green-500/20 rounded-full animate-ping" />
        </div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-24 h-24 bg-green-500/30 rounded-full animate-pulse" />
        </div>

        <!-- Checkmark -->
        <div
          class="relative w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30 animate-bounce"
        >
          <svg
            class="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      <!-- Success Text -->
      <h3 class="text-2xl font-bold text-green-600 dark:text-green-400 mt-6">
        {{ t("payment.lightning.paymentReceived") }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mt-2">
        {{ t("payment.lightning.thankYou") }}
      </p>

      <!-- Amount Received -->
      <div
        class="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl"
      >
        <div class="text-2xl font-bold text-green-600 dark:text-green-400">
          ⚡ {{ currencyHelper.format(amount, "SATS") }}
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          ≈ {{ currencyHelper.format(fiatAmount, currency) }}
        </div>
      </div>

      <!-- Auto-close countdown -->
      <div class="mt-6 flex items-center justify-center gap-2 text-gray-400">
        <div
          class="w-8 h-8 rounded-full border-2 border-green-500 flex items-center justify-center"
        >
          <span class="text-sm font-bold text-green-500">{{
            successCountdown
          }}</span>
        </div>
        <span class="text-sm">{{ t("payment.lightning.closingIn") }}</span>
      </div>
    </div>

    <!-- Error State (inline, for when modal is closed) -->
    <div v-else-if="paymentStep === 'error' && !showErrorModal" class="py-8">
      <div
        class="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <span class="text-4xl">✕</span>
      </div>
      <h3 class="text-xl font-bold text-red-600 dark:text-red-400">
        {{ t("payment.lightning.paymentFailed") }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mt-2">{{ errorMessage }}</p>

      <div class="flex justify-center gap-3 mt-4">
        <UButton color="primary" @click="handleTryAgain">
          {{ t("common.tryAgain") }}
        </UButton>
        <UButton color="neutral" variant="outline" @click="handleCancel">
          {{ t("common.cancel") }}
        </UButton>
      </div>
    </div>

    <!-- Cancel Button (when not in error state) -->
    <div v-if="paymentStep !== 'error'" class="mt-6">
      <UButton color="neutral" variant="ghost" block @click="emit('cancel')">
        {{ t("payment.lightning.cancelPayment") }}
      </UButton>
    </div>

    <!-- Tips Section -->
    <div
      class="mt-6 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl text-left text-sm"
    >
      <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">
        💡 {{ t("payment.lightning.tips") }}
      </h4>
      <ul class="text-gray-500 dark:text-gray-400 space-y-1 text-xs">
        <li>• {{ t("payment.lightning.tip1") }}</li>
        <li>• {{ t("payment.lightning.tip2") }}</li>
        <li>• {{ t("payment.lightning.tip3") }}</li>
        <li>• {{ t("payment.lightning.tip4") }}</li>
      </ul>
    </div>

    <!-- Error Modal -->
    <UModal v-model:open="showErrorModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900 text-center">
          <div
            class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-8 h-8 text-red-500"
            />
          </div>

          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {{ t("payment.lightning.paymentFailed") }}
          </h3>

          <p class="text-gray-500 dark:text-gray-400 mb-6">
            {{ errorMessage }}
          </p>

          <!-- Error Details for Lightning Not Configured -->
          <div
            v-if="!lightning.settings.value?.isConfigured"
            class="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left"
          >
            <h4 class="font-medium text-amber-700 dark:text-amber-400 mb-2">
              ⚡ {{ t("payment.lightning.configureRequired") }}
            </h4>
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

          <div class="flex justify-center gap-3">
            <UButton color="primary" size="lg" block @click="handleTryAgain">
              {{ t("common.tryAgain") }}
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              size="lg"
              block
              @click="handleCancel"
            >
              {{ t("payment.lightning.cancelPayment") }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
