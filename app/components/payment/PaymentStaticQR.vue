<!-- components/payment/PaymentStaticQR.vue -->
<!-- 📡 BOLT12 Static QR - One QR forever! -->
<script setup lang="ts">
import type { BOLT12Offer } from "~/types";
import QrcodeVue from 'qrcode.vue';

const props = defineProps<{
  offer?: BOLT12Offer;
  merchantName: string;
  description?: string;
}>();

const emit = defineEmits<{
  create: [];
}>();

// State
const showFullOffer = ref(false);

const qrData = computed(() => {
  if (props.offer?.offer) {
    return props.offer.offer;
  }
  return "";
});

const copyOffer = async () => {
  if (props.offer?.offer) {
    await navigator.clipboard.writeText(props.offer.offer);
  }
};
</script>

<template>
  <div class="bg-gray-800 rounded-2xl p-6 text-center">
    <!-- Header -->
    <div class="mb-4">
      <div class="flex items-center justify-center gap-2 mb-2">
        <span class="text-2xl">📡</span>
        <h3 class="text-lg font-bold">Static Payment QR</h3>
      </div>
      <p class="text-sm text-gray-400">
        BOLT12 - One QR code, unlimited payments!
      </p>
    </div>

    <!-- QR Display -->
    <div v-if="offer" class="space-y-4">
      <div class="bg-white p-4 rounded-xl inline-block">
        <QrcodeVue v-if="qrData" :value="qrData" :size="200" level="M" render-as="svg" background="#ffffff"
          foreground="#000000" />
      </div>

      <!-- Offer Info -->
      <div class="text-left bg-gray-900 rounded-xl p-4">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-400">Merchant</span>
          <span class="font-medium">{{ offer.merchantName }}</span>
        </div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-400">Description</span>
          <span class="text-sm">{{ offer.description }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-400">Accepts any amount</span>
          <UBadge :color="offer.allowsAnyAmount ? 'success' : 'warning'">
            {{ offer.allowsAnyAmount ? "Yes" : "No" }}
          </UBadge>
        </div>
      </div>

      <!-- Offer String (collapsible) -->
      <div>
        <button class="text-sm text-gray-400 hover:text-white" @click="showFullOffer = !showFullOffer">
          {{ showFullOffer ? "Hide" : "Show" }} offer string
        </button>
        <div v-if="showFullOffer"
          class="mt-2 p-3 bg-gray-900 rounded-lg text-xs font-mono text-gray-500 break-all max-h-24 overflow-auto">
          {{ offer.offer }}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 justify-center">
        <UButton color="neutral" variant="outline" icon="i-heroicons-clipboard-document" @click="copyOffer">
          Copy
        </UButton>
        <UButton color="primary" icon="i-heroicons-arrow-down-tray">
          Download QR
        </UButton>
      </div>
    </div>

    <!-- No Offer - Create One -->
    <div v-else class="py-8">
      <div class="text-5xl mb-4">🔮</div>
      <h4 class="font-medium mb-2">No Static QR Yet</h4>
      <p class="text-sm text-gray-400 mb-4">
        Create a BOLT12 offer for your store.<br />
        Customers can pay any amount, anytime!
      </p>
      <UButton color="primary" block @click="emit('create')">
        Create Static QR
      </UButton>
    </div>

    <!-- Benefits -->
    <div class="mt-6 p-4 bg-gray-900/50 rounded-xl text-left">
      <h4 class="font-medium text-sm mb-3">✨ Why BOLT12?</h4>
      <ul class="text-xs text-gray-400 space-y-2">
        <li class="flex items-center gap-2">
          <span class="text-green-400">✓</span>
          <span>Never expires - print once, use forever</span>
        </li>
        <li class="flex items-center gap-2">
          <span class="text-green-400">✓</span>
          <span>Customers choose amount (great for tips!)</span>
        </li>
        <li class="flex items-center gap-2">
          <span class="text-green-400">✓</span>
          <span>Works even when POS is offline</span>
        </li>
        <li class="flex items-center gap-2">
          <span class="text-green-400">✓</span>
          <span>Supports recurring payments</span>
        </li>
      </ul>
    </div>
  </div>
</template>
