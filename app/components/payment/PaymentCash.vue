<!-- components/payment/PaymentCash.vue -->
<!-- 💵 Cash Payment Component with Change Calculation -->
<script setup lang="ts">
import type { CurrencyCode } from "~/types";

const props = defineProps<{
  amount: number; // Total amount due in fiat
  currency: CurrencyCode;
  orderId: string;
}>();

const emit = defineEmits<{
  paid: [{ amountTendered: number; change: number }];
  cancel: [];
}>();

// Composables
const currencyHelper = useCurrency();
const sound = useSound();
const { t } = useI18n();
const pos = usePOS();

// State
// State
const amountTendered = ref(props.amount);
const step = ref<"input" | "confirm" | "complete">("input");

// Update amountTendered if props.amount changes and user hasn't typed anything
watch(
  () => props.amount,
  (newAmount) => {
    if (numpadValue.value === "") {
      amountTendered.value = newAmount;
    }
  }
);
const isProcessing = ref(false);

// Quick amount buttons based on currency
const quickAmounts = computed(() => {
  const baseAmount = props.amount;
  switch (props.currency) {
    case "LAK":
      // Lao Kip - round up to common denominations
      return [
        Math.ceil(baseAmount / 1000) * 1000,
        Math.ceil(baseAmount / 5000) * 5000,
        Math.ceil(baseAmount / 10000) * 10000,
        Math.ceil(baseAmount / 20000) * 20000,
        Math.ceil(baseAmount / 50000) * 50000,
        Math.ceil(baseAmount / 100000) * 100000,
      ]
        .filter((v, i, a) => v >= baseAmount && a.indexOf(v) === i)
        .slice(0, 6);
    case "THB":
      return [
        Math.ceil(baseAmount / 10) * 10,
        Math.ceil(baseAmount / 20) * 20,
        Math.ceil(baseAmount / 50) * 50,
        Math.ceil(baseAmount / 100) * 100,
        Math.ceil(baseAmount / 500) * 500,
        Math.ceil(baseAmount / 1000) * 1000,
      ]
        .filter((v, i, a) => v >= baseAmount && a.indexOf(v) === i)
        .slice(0, 6);
    case "USD":
      return [
        Math.ceil(baseAmount),
        Math.ceil(baseAmount / 5) * 5,
        Math.ceil(baseAmount / 10) * 10,
        Math.ceil(baseAmount / 20) * 20,
        Math.ceil(baseAmount / 50) * 50,
        Math.ceil(baseAmount / 100) * 100,
      ]
        .filter((v, i, a) => v >= baseAmount && a.indexOf(v) === i)
        .slice(0, 6);
    default:
      return [baseAmount];
  }
});

// Additive amounts (single bills/coins)
const addValues = computed(() => {
  switch (props.currency) {
    case "LAK":
      return [1000, 2000, 5000, 10000, 20000, 50000, 100000];
    case "THB":
      return [10, 20, 50, 100, 500, 1000];
    case "USD":
      return [1, 5, 10, 20, 50, 100];
    default:
      return [1, 5, 10, 20, 50, 100];
  }
});

// Change calculation
const change = computed(() => {
  return Math.max(0, amountTendered.value - props.amount);
});

const isValidPayment = computed(() => {
  return amountTendered.value >= props.amount;
});

// Numpad handling
const numpadValue = ref("");

const handleNumpad = (value: string) => {
  if (value === "clear") {
    numpadValue.value = "";
    amountTendered.value = 0;
  } else if (value === "backspace") {
    numpadValue.value = numpadValue.value.slice(0, -1);
    amountTendered.value = parseFloat(numpadValue.value) || 0;
  } else if (value === ".") {
    if (!numpadValue.value.includes(".")) {
      numpadValue.value += ".";
    }
  } else {
    numpadValue.value += value;
    amountTendered.value = parseFloat(numpadValue.value) || 0;
  }
};

const setQuickAmount = (amount: number) => {
  amountTendered.value = amount;
  numpadValue.value = amount.toString();
};

const setExactAmount = () => {
  amountTendered.value = props.amount;
  numpadValue.value = props.amount.toString();
};

const addToAmount = (value: number) => {
  amountTendered.value += value;
  numpadValue.value = amountTendered.value.toString();
};

const confirmPayment = () => {
  if (!isValidPayment.value) return;
  step.value = "confirm";

  // Broadcast to customer display
  pos.setPaymentState({
    status: "pending",
    method: "cash",
    amount: props.amount,
  });
};

const processPayment = () => {
  isProcessing.value = true;

  // Play sound
  sound.playCashRegister();
  step.value = "complete";

  // Emit IMMEDIATELY - don't wait, so modal close doesn't bypass
  emit("paid", {
    amountTendered: amountTendered.value,
    change: change.value,
  });

  isProcessing.value = false;
};

const goBack = () => {
  step.value = "input";
};

// Keyboard support
const handleKeyboardInput = (e: KeyboardEvent) => {
  if (step.value === "input") {
    if (e.key >= "0" && e.key <= "9") {
      handleNumpad(e.key);
    } else if (e.key === ".") {
      handleNumpad(".");
    } else if (e.key === "Backspace") {
      handleNumpad("backspace");
    } else if (e.key === "Delete") {
      handleNumpad("clear");
    } else if (e.key === "Enter") {
      if (isValidPayment.value) confirmPayment();
    } else if (e.key === "Escape") {
      if (numpadValue.value) {
        handleNumpad("clear");
      } else {
        emit("cancel");
      }
    }
  } else if (step.value === "confirm") {
    if (e.key === "Enter") {
      processPayment();
    } else if (e.key === "Escape") {
      goBack();
    }
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyboardInput);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyboardInput);
});
</script>

<template>
  <div class="text-center max-h-[70vh] overflow-y-auto">
    <!-- Header -->
    <div class="mb-6">
      <h2
        class="text-2xl font-bold flex items-center justify-center gap-2 text-gray-900 dark:text-white"
      >
        <span class="text-3xl">💵</span>
        {{ t("payment.cash.title") }}
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
    </div>

    <!-- Step 1: Input Amount -->
    <div v-if="step === 'input'" class="space-y-4">
      <!-- Amount Tendered Display -->
      <div
        class="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl relative"
      >
        <div class="text-sm text-amber-600 dark:text-amber-400 mb-1">
          {{ t("payment.cash.amountTendered") }}
        </div>
        <div
          class="text-4xl font-bold text-amber-600 dark:text-amber-400 font-mono"
        >
          {{ currencyHelper.format(amountTendered, currency) }}
        </div>
      </div>

      <!-- Change Preview -->
      <div
        v-if="isValidPayment && change > 0"
        class="p-4 bg-green-500/10 border border-green-500/20 rounded-xl"
      >
        <div class="text-sm text-green-600 dark:text-green-400 mb-1">
          {{ t("payment.cash.change") }}
        </div>
        <div class="text-3xl font-bold text-green-600 dark:text-green-400">
          {{ currencyHelper.format(change, currency) }}
        </div>
      </div>

      <div>
        <!-- Actions at Top -->
        <div
          class="flex gap-3 sticky top-0 bg-white dark:bg-gray-900 py-2 z-10"
        >
          <!-- Clear Button -->
          <UButton
            v-if="amountTendered > 0"
            color="red"
            variant="soft"
            class="w-full"
            icon="i-heroicons-x-mark"
            block
            @click="handleNumpad('clear')"
          >
            {{ t("common.clear") }}
          </UButton>
          <!-- Exact Amount Button -->
          <UButton
            color="primary"
            variant="outline"
            class="w-full"
            block
            @click="setExactAmount"
          >
            {{ t("payment.cash.exactAmount") }}
          </UButton>
          <UButton
            color="primary"
            size="lg"
            class="flex-1 text-nowrap"
            :disabled="!isValidPayment"
            block
            @click="confirmPayment"
          >
            {{ t("payment.cash.confirm") }}
          </UButton>
        </div>
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          class="flex-1"
          block
          @click="emit('cancel')"
        >
          {{ t("common.cancel") }}
        </UButton>
      </div>

      <!-- Quick Amount Buttons (Presets) -->
      <div v-if="quickAmounts.length > 0" class="space-y-2">
        <label class="text-xs font-bold text-gray-500 uppercase">{{
          t("payment.cash.presets")
        }}</label>
        <div class="grid grid-cols-3 mt-1 gap-2">
          <UButton
            v-for="quickAmt in quickAmounts"
            :key="quickAmt"
            color="neutral"
            variant="soft"
            size="md"
            class="font-mono"
            block
            @click="setQuickAmount(quickAmt)"
          >
            {{ currencyHelper.format(quickAmt, currency) }}
          </UButton>
        </div>
      </div>

      <!-- Add Bill Buttons -->
      <div class="space-y-2">
        <label class="text-xs font-bold text-gray-500 uppercase">{{
          t("payment.cash.add")
        }}</label>
        <div class="grid grid-cols-4 gap-2">
          <UButton
            v-for="val in addValues"
            :key="val"
            color="primary"
            variant="ghost"
            size="md"
            class="font-mono text-xs px-1"
            block
            @click="addToAmount(val)"
          >
            +{{
              currencyHelper.format(val, currency).replace(currency, "").trim()
            }}
          </UButton>
        </div>
      </div>

      <!-- Numpad -->
      <div class="grid grid-cols-3 gap-2 mt-4">
        <UButton
          v-for="num in [
            '7',
            '8',
            '9',
            '4',
            '5',
            '6',
            '1',
            '2',
            '3',
            '.',
            '0',
            '⌫',
          ]"
          :key="num"
          color="neutral"
          variant="outline"
          size="xl"
          class="h-14 text-xl font-mono"
          block
          @click="handleNumpad(num === '⌫' ? 'backspace' : num)"
        >
          {{ num }}
        </UButton>
      </div>
    </div>

    <!-- Step 2: Confirm -->
    <div v-else-if="step === 'confirm'" class="space-y-6">
      <div class="p-6 bg-gray-100 dark:bg-gray-800 rounded-xl space-y-4">
        <div class="flex justify-between items-center">
          <span class="text-gray-500 dark:text-gray-400">{{
            t("payment.cash.amountDue")
          }}</span>
          <span class="text-xl font-bold text-gray-900 dark:text-white">{{
            currencyHelper.format(amount, currency)
          }}</span>
        </div>
        <div
          v-if="pos.discountAmount.value > 0"
          class="flex justify-between items-center"
        >
          <span class="text-green-600 dark:text-green-400">Discount</span>
          <span class="text-lg font-medium text-green-600 dark:text-green-400"
            >-{{
              currencyHelper.format(pos.discountAmount.value, currency)
            }}</span
          >
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500 dark:text-gray-400">{{
            t("payment.cash.amountTendered")
          }}</span>
          <span class="text-xl font-bold text-amber-600 dark:text-amber-400">{{
            currencyHelper.format(amountTendered, currency)
          }}</span>
        </div>
        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div class="flex justify-between items-center">
            <span class="text-lg font-medium text-gray-900 dark:text-white">{{
              t("payment.cash.change")
            }}</span>
            <span
              class="text-2xl font-bold text-green-600 dark:text-green-400"
              >{{ currencyHelper.format(change, currency) }}</span
            >
          </div>
        </div>
      </div>

      <div class="flex gap-3">
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
          icon="i-heroicons-check-circle"
          block
          @click="processPayment"
        >
          {{ t("payment.cash.complete") }}
        </UButton>
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
        {{ t("payment.cash.received") }}
      </h3>

      <div
        v-if="change > 0"
        class="mt-4 p-6 bg-amber-500/10 border border-amber-500/20 rounded-xl"
      >
        <div class="text-sm text-amber-600 dark:text-amber-400 mb-2">
          {{ t("payment.cash.giveChange") }}
        </div>
        <div class="text-4xl font-bold text-amber-600 dark:text-amber-400">
          {{ currencyHelper.format(change, currency) }}
        </div>
      </div>
    </div>
  </div>
</template>
