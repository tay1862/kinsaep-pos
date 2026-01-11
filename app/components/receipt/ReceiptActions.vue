<!-- components/receipt/ReceiptActions.vue -->
<!-- 🧾 Post-Payment Receipt Options -->
<script setup lang="ts">
import type { Order, PaymentMethod } from "~/types";
import QRCodeVue3 from "qrcode.vue";

const props = defineProps<{
  order: Order;
  paymentMethod: PaymentMethod;
}>();

const emit = defineEmits<{
  close: [];
  done: [];
}>();

// Composables
const receipt = useReceipt();
const currency = useCurrency();
const { t } = useI18n();

// State
const showPreview = ref(false);
const showQRModal = ref(false);
const eBillUrl = ref("");
const qrCodeImage = ref("");
const receiptCode = ref("");
const isPrinting = ref(false);
const isSending = ref(false);
const countdown = ref(10);
const customerEmail = ref("");
const showEmailInput = ref(false);

// Check if order has new public receipt data
const orderWithReceipt = computed(() => {
  return props.order as Order & {
    receiptUrl?: string;
    receiptQR?: string;
    receiptCode?: string;
  };
});

// Generate receipt from order (for preview display)
const currentReceipt = computed(() => {
  return receipt.generateReceipt(props.order, props.order.paymentProof);
});

// Initialize receipt data on mount
onMounted(() => {
  if (orderWithReceipt.value.receiptUrl && orderWithReceipt.value.receiptQR) {
    // ✅ Use new public receipt data
    eBillUrl.value = orderWithReceipt.value.receiptUrl;
    qrCodeImage.value = orderWithReceipt.value.receiptQR;
    receiptCode.value = orderWithReceipt.value.receiptCode || "";
  } else {
    // ❌ Fallback: Generate legacy receipt URL
    receipt.storeEBill(currentReceipt.value);
    eBillUrl.value = receipt.generateEBillUrl(currentReceipt.value.id);
  }
});

// Auto-close countdown
let countdownInterval: ReturnType<typeof setInterval>;

onMounted(() => {
  countdownInterval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      handleSkip();
    }
  }, 1000);
});

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval);
});

// Stop countdown on any interaction
const stopCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdown.value = 0;
  }
};

// Print thermal receipt
const handlePrint = async () => {
  stopCountdown();
  isPrinting.value = true;

  try {
    // Store receipt first for e-bill access
    receipt.storeEBill(currentReceipt.value);

    // Generate HTML with QR code (async)
    const html = await receipt.generateHtmlReceipt(currentReceipt.value);

    // Try to print via browser
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  } catch (e) {
    console.error("Print error:", e);
    // Fall back to preview
    showPreview.value = true;
  } finally {
    isPrinting.value = false;
  }
};

// Generate and show e-bill QR
const handleEBill = () => {
  stopCountdown();

  // If no public receipt URL, generate legacy
  if (!eBillUrl.value) {
    receipt.storeEBill(currentReceipt.value);
    eBillUrl.value = receipt.generateEBillUrl(currentReceipt.value.id);
  }

  showQRModal.value = true;
};

// Copy e-bill link
const copyEBillLink = async () => {
  if (eBillUrl.value) {
    await navigator.clipboard.writeText(eBillUrl.value);
  }
};

// Send to email (placeholder)
const handleSendEmail = () => {
  stopCountdown();
  showEmailInput.value = true;
};

const sendEmail = async () => {
  if (!customerEmail.value) return;

  isSending.value = true;

  try {
    // Store receipt first
    receipt.storeEBill(currentReceipt.value);

    // Generate e-bill URL
    const url = receipt.generateEBillUrl(currentReceipt.value.id);

    // In production, send via API
    // For now, open mailto
    window.open(
      `mailto:${customerEmail.value}?subject=Receipt from BNOS&body=View your receipt here: ${url}`
    );

    showEmailInput.value = false;
    emit("done");
  } catch (e) {
    console.error("Email error:", e);
  } finally {
    isSending.value = false;
  }
};

// Skip receipt
const handleSkip = () => {
  emit("close");
  emit("done");
};

// Format payment method display
const paymentMethodDisplay = computed(() => {
  switch (props.paymentMethod) {
    case "lightning":
      return { icon: "⚡", name: t("payment.methods.lightning") };
    case "cash":
      return { icon: "💵", name: t("payment.methods.cash") };
    case "bank_transfer":
      return { icon: "🏦", name: t("payment.methods.bankTransfer") };
    case "external":
      return { icon: "💳", name: t("receipt.cardExternal") };
    case "qr_static":
      return { icon: "📱", name: t("payment.methods.staticQR") };
    default:
      return { icon: "💰", name: t("payment.title", "Payment") };
  }
});
</script>

<template>
  <div class="text-center">
    <!-- Success Header -->
    <div class="mb-6">
      <!-- Animated Checkmark -->
      <div class="relative w-20 h-20 mx-auto mb-4">
        <div
          class="absolute inset-0 bg-green-500/20 rounded-full animate-ping"
        />
        <div
          class="relative w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30"
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

      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {{ t("payment.success") }}
      </h2>
      <p
        class="text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2"
      >
        <span>{{ paymentMethodDisplay.icon }}</span>
        <span>{{ paymentMethodDisplay.name }}</span>
      </p>
    </div>

    <!-- Order Summary -->
    <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
      <div class="font-bold font-mono text-2xl">
        <b>#{{ order?.orderNumber }}</b>
      </div>
      <div class="flex justify-between items-center mb-2">
        <span class="text-gray-500 dark:text-gray-400 text-sm">
          {{ t("orders.orderId") }}
        </span>
        <span class="font-mono text-sm text-gray-900 dark:text-white">
          {{ order?.code || order.id }}
        </span>
      </div>
      <div class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ currency.format(order.total, order.currency || "LAK") }}
      </div>
      <div
        v-if="order.totalSats"
        class="text-amber-600 dark:text-amber-400 text-sm mt-1"
      >
        ⚡ {{ currency.format(order.totalSats, "SATS") }}
      </div>
    </div>

    <!-- Receipt Actions -->
    <div class="space-y-3 mb-6">
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        🧾 {{ t("receipt.options") }}
      </h3>

      <div class="grid grid-cols-2 gap-3">
        <!-- Print Receipt -->
        <button
          class="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all group"
          :disabled="isPrinting"
          @click="handlePrint"
        >
          <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">
            🖨️
          </div>
          <div class="font-medium text-gray-900 dark:text-white text-sm">
            {{ isPrinting ? t("receipt.printing") : t("receipt.print") }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ t("receipt.thermalPaper") }}
          </div>
        </button>

        <!-- E-Bill QR -->
        <button
          class="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all group"
          @click="handleEBill"
        >
          <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">
            <Icon name="system-uicons:iphone-portrait" />
          </div>
          <div class="font-medium text-gray-900 dark:text-white text-sm">
            {{ t("receipt.eBill") }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ t("receipt.showQRToCustomer") }}
          </div>
        </button>

        <!-- Send Email -->
        <button
          class="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all group"
          @click="handleSendEmail"
        >
          <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">
            ✉️
          </div>
          <div class="font-medium text-gray-900 dark:text-white text-sm">
            {{ t("receipt.sendEmail") }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ t("receipt.sendToCustomer") }}
          </div>
        </button>

        <!-- Preview -->
        <button
          class="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all group"
          @click="
            showPreview = true;
            stopCountdown();
          "
        >
          <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">
            <Icon name="mynaui:eye" class="w-8 h-8 mx-auto" />
          </div>
          <div class="font-medium text-gray-900 dark:text-white text-sm">
            {{ t("receipt.preview") }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ t("receipt.viewReceipt") }}
          </div>
        </button>
      </div>
    </div>

    <!-- Email Input (when active) -->
    <div
      v-if="showEmailInput"
      class="mb-6 p-4 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/30"
    >
      <h4 class="font-medium text-gray-900 dark:text-white mb-3">
        {{ t("receipt.sendReceiptToEmail") }}
      </h4>
      <UInput
        v-model="customerEmail"
        type="email"
        placeholder="customer@email.com"
        icon="i-heroicons-envelope"
        class="mb-3"
      />
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="outline"
          class="flex-1"
          @click="showEmailInput = false"
        >
          {{ t("common.cancel") }}
        </UButton>
        <UButton
          color="green"
          class="flex-1"
          :loading="isSending"
          :disabled="!customerEmail"
          @click="sendEmail"
        >
          {{ t("common.send") }}
        </UButton>
      </div>
    </div>

    <!-- Skip / Done -->
    <div class="space-y-2">
      <UButton
        block
        size="lg"
        color="primary"
        class="bg-linear-to-r from-amber-500 to-orange-500"
        @click="handleSkip"
      >
        {{
          countdown > 0
            ? `${t("receipt.newOrder")} (${countdown}s)`
            : t("receipt.newOrder")
        }}
      </UButton>

      <p v-if="countdown > 0" class="text-xs text-gray-400">
        {{ t("receipt.autoContinuing", { seconds: countdown }) }}
      </p>
    </div>

    <!-- E-Bill QR Modal -->
    <UModal
      v-model:open="showQRModal"
      title="E-Bill"
      description="Scan QR code to view e-bill"
    >
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900 text-center">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">
            📱 {{ t("receipt.scanForEBill") }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {{ t("receipt.scanDescription") }}
          </p>

          <!-- QR Code - Use pre-generated if available -->
          <div class="bg-white p-4 rounded-xl inline-block shadow-lg mb-4">
            <img
              v-if="qrCodeImage"
              :src="qrCodeImage"
              alt="Receipt QR Code"
              class="w-48 h-48 mx-auto"
            />
            <QRCodeVue3
              v-else-if="eBillUrl"
              :value="eBillUrl"
              :size="192"
              level="M"
              render-as="svg"
            />
          </div>

          <!-- Receipt Code (if available) -->
          <div
            v-if="receiptCode"
            class="mb-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3"
          >
            <p class="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
              RECEIPT CODE
            </p>
            <p class="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono">
              {{ receiptCode }}
            </p>
          </div>

          <!-- URL Display -->
          <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {{ t("receipt.eBillLink") }}
            </p>
            <p
              class="text-sm font-mono text-gray-700 dark:text-gray-300 break-all"
            >
              {{ eBillUrl }}
            </p>
          </div>

          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="outline"
              block
              icon="i-heroicons-clipboard-document"
              @click="copyEBillLink"
            >
              {{ t("common.copyLink") }}
            </UButton>
            <UButton
              color="primary"
              block
              @click="showQRModal = false"
            >
              {{ t("common.done") }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Receipt Preview Modal -->
    <ReceiptPreview
      v-if="showPreview"
      :order="props.order"
      :payment-proof="props.order.paymentProof"
      :open="showPreview"
      @close="showPreview = false"
    />
  </div>
</template>
