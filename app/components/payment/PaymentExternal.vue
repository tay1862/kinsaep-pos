<!-- components/payment/PaymentExternal.vue -->
<!-- 💳 External Payment Method Component -->
<script setup lang="ts">
import type { CurrencyCode, ExternalPaymentProvider } from "~/types";

const emit = defineEmits<{
  paid: [{ provider: string; reference?: string }];
  cancel: [];
}>();

const props = defineProps<{
  amount: number;
  currency: CurrencyCode;
  orderId: string;
}>();

// Composables
const currencyHelper = useCurrency();
const { t } = useI18n();
const pos = usePOS();

// State
const step = ref<"select" | "confirm" | "complete">("select");
const selectedProvider = ref<ExternalPaymentProvider | null>(null);
const paymentReference = ref("");
const isProcessing = ref(false);

// External payment providers
const externalProviders = ref<ExternalPaymentProvider[]>([
  {
    id: "promptpay",
    name: "PromptPay",
    icon: "🇹🇭",
    description: "Thai QR payment system",
    isActive: true,
  },
  {
    id: "wechat",
    name: "WeChat Pay",
    icon: "💚",
    description: "WeChat mobile payment",
    isActive: true,
  },
  {
    id: "alipay",
    name: "Alipay",
    icon: "🔵",
    description: "Alipay mobile payment",
    isActive: true,
  },
  {
    id: "grab",
    name: "GrabPay",
    icon: "🟢",
    description: "Grab e-wallet",
    isActive: true,
  },
  {
    id: "truemoney",
    name: "TrueMoney",
    icon: "🟠",
    description: "TrueMoney wallet",
    isActive: true,
  },
  {
    id: "other",
    name: "Other",
    icon: "💳",
    description: "Other external payment",
    isActive: true,
  },
]);

const selectProvider = (provider: ExternalPaymentProvider) => {
  selectedProvider.value = provider;
  step.value = "confirm";

  // Broadcast to customer display
  pos.setPaymentState({
    status: "pending",
    method: "external",
    amount: props.amount,
    externalMethod: provider.name,
  });
};

const confirmPayment = () => {
  isProcessing.value = true;
  step.value = "complete";

  // Emit IMMEDIATELY - don't wait, so modal close doesn't bypass
  emit("paid", {
    provider: selectedProvider.value?.id || "external",
    reference: paymentReference.value || undefined,
  });

  isProcessing.value = false;
};

const goBack = () => {
  if (step.value === "confirm") {
    step.value = "select";
    selectedProvider.value = null;
    paymentReference.value = "";
  } else {
    emit("cancel");
  }
};
</script>

<template>
  <div class="text-center max-h-[70vh] overflow-y-auto">
    <!-- Header -->
    <div class="mb-6">
      <h2
        class="text-2xl font-bold flex items-center justify-center gap-2 text-gray-900 dark:text-white"
      >
        <span class="text-3xl">💳</span>
        {{ t("payment.external.title") }}
      </h2>
    </div>

    <!-- Amount Due -->
    <div class="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
      <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">
        {{ t("payment.cash.amountDue") }}
      </div>
      <div class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ currencyHelper.format(amount, currency) }}
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
    </div>

    <!-- Step 1: Select Provider -->
    <div v-if="step === 'select'" class="space-y-4">
      <!-- Actions at Top -->
      <div class="flex gap-3 sticky top-0 bg-white dark:bg-gray-900 py-2 z-10">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          class="flex-1"
          @click="emit('cancel')"
        >
          {{ t("common.cancel") }}
        </UButton>
      </div>

      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {{ t("payment.external.selectProvider") }}
      </p>

      <!-- Provider Grid -->
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="provider in externalProviders.filter((p) => p.isActive)"
          :key="provider.id"
          class="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all text-center"
          @click="selectProvider(provider)"
        >
          <div class="text-3xl mb-2">{{ provider.icon }}</div>
          <p class="font-semibold text-gray-900 dark:text-white text-sm">
            {{ provider.name }}
          </p>
        </button>
      </div>
    </div>

    <!-- Step 2: Confirm Payment -->
    <div v-else-if="step === 'confirm'" class="space-y-4">
      <!-- Actions at Top -->
      <div class="flex gap-3 sticky top-0 bg-white dark:bg-gray-900 py-2 z-10">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          class="flex-1"
          block
          @click="goBack"
        >
          {{ t("common.back") }}
        </UButton>
        <UButton
          color="green"
          size="lg"
          class="flex-1"
          :loading="isProcessing"
          block
          icon="i-heroicons-check-circle"
          @click="confirmPayment"
        >
          {{ t("payment.external.confirmReceived") }}
        </UButton>
      </div>

      <!-- Selected Provider -->
      <div
        v-if="selectedProvider"
        class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
      >
        <div class="flex items-center justify-center gap-3">
          <span class="text-4xl">{{ selectedProvider.icon }}</span>
          <div class="text-left">
            <p class="font-semibold text-gray-900 dark:text-white">
              {{ selectedProvider.name }}
            </p>
            <p class="text-sm text-gray-500">
              {{ selectedProvider.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- Amount Confirmation -->
      <div
        class="p-4 bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 rounded-xl"
      >
        <p class="text-sm text-primary-600 dark:text-primary-400 mb-1">
          {{ t("payment.external.collectAmount") }}
        </p>
        <p class="text-3xl font-bold text-primary-600 dark:text-primary-400">
          {{ currencyHelper.format(amount, currency) }}
        </p>
      </div>

      <!-- Optional Reference -->
      <div class="text-left">
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {{ t("payment.external.reference") }}
          <span class="text-gray-400">({{ t("common.optional") }})</span>
        </label>
        <UInput
          v-model="paymentReference"
          :placeholder="t('payment.external.referencePlaceholder')"
          size="lg"
          class="w-full"
        />
      </div>

      <!-- Hint -->
      <div
        class="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left"
      >
        <p class="text-sm text-amber-700 dark:text-amber-400">
          ⚠️ {{ t("payment.external.confirmHint") }}
        </p>
      </div>
    </div>

    <!-- Step 3: Complete -->
    <div v-else-if="step === 'complete'" class="py-8">
      <div
        class="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce"
      >
        <span class="text-5xl text-white">✓</span>
      </div>
      <h3 class="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
        {{ t("payment.external.complete") }}
      </h3>

      <div
        v-if="selectedProvider"
        class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full"
      >
        <span class="text-xl">{{ selectedProvider.icon }}</span>
        <span class="font-medium text-gray-900 dark:text-white">{{
          selectedProvider.name
        }}</span>
      </div>
    </div>
  </div>
</template>
