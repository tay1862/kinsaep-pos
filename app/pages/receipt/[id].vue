<!-- pages/receipt/[id].vue -->
<!-- 📱 E-Bill Public Page - Customer Digital Receipt -->
<script setup lang="ts">
import type { EReceipt } from "~/composables/use-receipt";

definePageMeta({
  layout: "blank",
});

useHead({
  title: "Digital Receipt - bnos.space",
});

const route = useRoute();
const receipt = useReceipt();
const receiptGenerator = useReceiptGenerator();
const currency = useCurrency();
const relay = useNostrRelay();

// State
const eBill = ref<EReceipt | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const canShare = ref(false);

// Load receipt
onMounted(async () => {
  // Check if Web Share API is supported
  canShare.value = typeof navigator !== "undefined" && !!navigator.share;

  // Initialize Nostr relay (required for fetching receipts)
  await relay.init();

  const receiptId = route.params.id as string;
  const receiptCode = route.query.code as string;

  if (!receiptId) {
    error.value = "Receipt ID not provided";
    loading.value = false;
    return;
  }

  // Try localStorage first (fast)
  const storedReceipt = receipt.retrieveEBill(receiptId);

  if (storedReceipt) {
    eBill.value = storedReceipt;
  } else {
    // Fetch from Nostr using receipt ID
    const fetchedReceipt = await receiptGenerator.fetchReceiptById(receiptId);

    if (fetchedReceipt) {
      eBill.value = fetchedReceipt;
    } else {
      error.value = "Receipt not found or expired";
    }
  }

  // Verify code matches (security check)
  if (eBill.value && receiptCode && eBill.value.code !== receiptCode) {
    error.value = "Invalid receipt code";
    eBill.value = null;
  }

  // Check expiration
  if (eBill.value?.expiresAt && new Date(eBill.value.expiresAt) < new Date()) {
    error.value = "Receipt expired (90 days retention)";
    eBill.value = null;
  }

  // Initialize currency from the receipt (use currency from event/receipt data)
  if (eBill.value?.currency) {
    await currency.init(eBill.value.currency);
  }

  loading.value = false;
});

// Format date
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Download receipt as image
const downloadReceipt = () => {
  // Could implement html2canvas here
  window.print();
};

// Share receipt
const shareReceipt = async () => {
  if (navigator.share && eBill.value) {
    try {
      await navigator.share({
        title: `Receipt from ${eBill.value.merchantName}`,
        text: `Order ${eBill.value.orderId} - ${currency.format(
          eBill.value.total,
          eBill.value.currency
        )}`,
        url: window.location.href,
      });
    } catch {
      // User cancelled or not supported
    }
  }
};
</script>

<template>
  <div
    class="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900"
  >
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div
          class="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"
        />
        <p class="text-gray-500">Loading receipt...</p>
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="flex items-center justify-center min-h-screen p-6"
    >
      <div class="text-center max-w-md">
        <div class="text-6xl mb-6">📄</div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Receipt Not Found
        </h1>
        <p class="text-gray-500 mb-6">{{ error }}</p>
        <p class="text-sm text-gray-400">
          This receipt may have expired or the link is invalid. Please contact
          the merchant for assistance.
        </p>
      </div>
    </div>

    <!-- E-Bill Content -->
    <div v-else-if="eBill" class="max-w-lg mx-auto p-4 py-8">
      <!-- Receipt Card -->
      <div
        class="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden"
      >
        <!-- Header -->
        <div
          class="bg-linear-to-br from-amber-500 to-orange-500 p-6 text-center text-white"
        >
          <div class="text-5xl mb-3">
            {{ receipt.settings.value.logoEmoji || "☕" }}
          </div>
          <h1 class="text-2xl font-bold">
            {{ eBill.merchantName || "bnos.space" }}
          </h1>
          <p class="text-amber-100 text-sm mt-1">{{ eBill.merchantAddress }}</p>
        </div>

        <!-- Receipt Number -->
        <div class="bg-amber-50 dark:bg-amber-900/20 px-6 py-3 text-center">
          <p class="text-xs text-amber-600 dark:text-amber-400 font-medium">
            RECEIPT
          </p>
          <p class="font-mono text-sm text-amber-700 dark:text-amber-300">
            {{ eBill.code || eBill.id }}
          </p>
        </div>

        <!-- Order Info -->
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Order</span>
            <span class="font-semibold text-gray-900 dark:text-white">{{
              eBill.orderCode || eBill.orderNumber || eBill.orderId
            }}</span>
          </div>
          <div class="flex justify-between text-sm mt-2">
            <span class="text-gray-500">Date</span>
            <span class="text-gray-700 dark:text-gray-300">{{
              formatDate(eBill.createdAt)
            }}</span>
          </div>
        </div>

        <!-- Items -->
        <div class="px-6 py-4">
          <h3
            class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3"
          >
            Items
          </h3>
          <div class="space-y-3">
            <div
              v-for="(item, index) in eBill.items"
              :key="index"
              class="flex justify-between items-start"
            >
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span
                    class="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-xs flex items-center justify-center font-semibold"
                  >
                    {{ item.quantity }}
                  </span>
                  <span class="font-medium text-gray-900 dark:text-white">{{
                    item.name
                  }}</span>
                </div>
                <div
                  v-if="item.variant"
                  class="text-xs text-amber-600 dark:text-amber-400 ml-8 mt-0.5"
                >
                  {{ item.variant }}
                </div>
                <div
                  v-if="item.modifiers?.length"
                  class="text-xs text-gray-500 ml-8 mt-0.5"
                >
                  + {{ item.modifiers.join(", ") }}
                </div>
                <div
                  v-if="item.notes"
                  class="text-xs text-blue-500 ml-8 mt-0.5 italic"
                >
                  "{{ item.notes }}"
                </div>
              </div>
              <span class="font-semibold text-gray-900 dark:text-white">
                {{ currency.format(item.total, eBill.currency) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div
          class="mx-6 border-t-2 border-dashed border-gray-200 dark:border-gray-700"
        />

        <!-- Totals -->
        <div class="px-6 py-4 space-y-2">
          <div class="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{{ currency.format(eBill.subtotal, eBill.currency) }}</span>
          </div>
          <div
            v-if="eBill.discount && eBill.discount > 0"
            class="flex justify-between text-green-600 dark:text-green-400"
          >
            <span>Discount</span>
            <span>-{{ currency.format(eBill.discount, eBill.currency) }}</span>
          </div>
          <div v-if="eBill.tax > 0" class="flex justify-between text-gray-500">
            <span>Tax</span>
            <span>{{ currency.format(eBill.tax, eBill.currency) }}</span>
          </div>
          <div
            v-if="eBill.tip && eBill.tip > 0"
            class="flex justify-between text-gray-500"
          >
            <span>Tip</span>
            <span class="text-amber-600">{{
              currency.format(eBill.tip, eBill.currency)
            }}</span>
          </div>
        </div>

        <!-- Grand Total -->
        <div class="mx-6 bg-gray-900 dark:bg-gray-950 rounded-2xl p-4 mb-6">
          <div class="flex justify-between items-center">
            <span class="text-gray-400">Total</span>
            <span class="text-3xl font-bold text-white">
              {{ currency.format(eBill.total, eBill.currency) }}
            </span>
          </div>
          <div
            v-if="eBill.totalSats"
            class="flex justify-between items-center mt-2 pt-2 border-t border-gray-800"
          >
            <span class="text-gray-500">≈ Sats</span>
            <span class="text-xl font-semibold text-amber-500">
              ⚡ {{ eBill.totalSats.toLocaleString() }}
            </span>
          </div>
        </div>

        <!-- Payment Info -->
        <div class="px-6 pb-6">
          <div
            class="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center"
          >
            <div
              class="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-1"
            >
              <span class="text-xl">✓</span>
              <span class="font-semibold">Payment Verified</span>
            </div>
            <p class="text-sm text-green-700 dark:text-green-300">
              {{ receipt.getPaymentMethodLabel(eBill.paymentMethod) }}
            </p>
            <p
              v-if="eBill.paymentProof?.paymentHash"
              class="text-xs text-green-600/70 dark:text-green-400/70 mt-2 font-mono"
            >
              Hash: {{ eBill.paymentProof.paymentHash.slice(0, 16) }}...
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 text-center">
          <p class="text-sm text-gray-500 mb-2">
            {{ receipt.settings.value.footerMessage }}
          </p>
          <p class="text-xs text-gray-400">Powered by bnos.space ⚡</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="mt-6 flex gap-3 print:hidden">
        <UButton
          color="neutral"
          variant="soft"
          size="lg"
          icon="i-heroicons-arrow-down-tray"
          block
          @click="downloadReceipt"
        >
          Save / Print
        </UButton>
        <UButton
          v-if="canShare"
          color="neutral"
          variant="soft"
          size="lg"
          icon="i-heroicons-share"
          block
          @click="shareReceipt"
        >
          Share
        </UButton>
      </div>

      <!-- Branding -->
      <div class="mt-8 text-center print:hidden">
        <p class="text-xs text-gray-400">
          Digital receipt by
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-amber-500 hover:underline"
            >bnos.space</a
          >
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  body {
    background: white !important;
  }

  .print\\:hidden {
    display: none !important;
  }
}
</style>
