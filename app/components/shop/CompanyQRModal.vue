<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="p-6 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg">
            <Icon name="i-heroicons-qr-code" size="32" class="text-white" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">
            {{ $t('shop.companyQRCode', 'Company Code') }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ $t('shop.scanToConnect', 'Scan to connect another device') }}
          </p>
        </div>

        <!-- QR Code Container -->
        <div class="flex flex-col items-center mb-6">
          <div class="p-4 bg-white rounded-2xl shadow-lg mb-4">
            <QrcodeVue 
              v-if="companyCode"
              :value="companyCode" 
              :size="192" 
              level="M"
              render-as="svg"
            />
          </div>
          
          <!-- Company Code Text -->
          <div class="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <span class="font-mono text-lg font-bold tracking-widest text-gray-800 dark:text-gray-200">
              {{ companyCode }}
            </span>
            <button
              class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              :title="$t('common.copy', 'Copy')"
              @click="copyCompanyCode"
            >
              <Icon name="i-heroicons-clipboard-document" size="18" class="text-gray-500" />
            </button>
          </div>
        </div>

        <!-- Shop Info -->
        <div 
          v-if="workspace"
          class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-6"
        >
          <div 
            class="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br"
            :class="getShopTypeGradient(workspace.shopType)"
          >
            <Icon :name="getShopTypeIcon(workspace.shopType)" size="20" class="text-white" />
          </div>
          <div class="flex-1">
            <p class="font-semibold text-gray-900 dark:text-white">{{ workspace.name }}</p>
            <p class="text-xs text-gray-500 capitalize">{{ workspace.shopType }}</p>
          </div>
        </div>

        <!-- Instructions -->
        <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 mb-6">
          <div class="flex items-start gap-3">
            <Icon name="i-heroicons-information-circle" size="20" class="text-blue-500 shrink-0 mt-0.5" />
            <div class="text-sm text-blue-700 dark:text-blue-300">
              <p class="font-semibold mb-1">{{ $t('shop.howToConnect', 'How to connect') }}</p>
              <ol class="list-decimal list-inside space-y-1 text-xs">
                <li>{{ $t('shop.connectStep1', 'Open bnos.space on another device') }}</li>
                <li>{{ $t('shop.connectStep2', 'Go to Settings → Company Code') }}</li>
                <li>{{ $t('shop.connectStep3', 'Scan this QR or enter the code') }}</li>
              </ol>
            </div>
          </div>
        </div>

        <!-- Close Button -->
        <UButton
          block
          size="lg"
          variant="outline"
          @click="isOpen = false"
        >
          {{ $t('common.close', 'Close') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import QrcodeVue from 'qrcode.vue';
import type { ShopWorkspace } from '~/composables/use-shop-manager';

// Props
const props = defineProps<{
  companyCode?: string;
  workspace?: ShopWorkspace | null;
}>();

// Model
const isOpen = defineModel<boolean>('open', { default: false });

// Toast
const toast = useToast();
const { t } = useI18n();

// Copy company code
const copyCompanyCode = async () => {
  if (!props.companyCode) return;
  try {
    await navigator.clipboard.writeText(props.companyCode);
    toast.add({
      title: t('common.copied', 'Copied!'),
      description: t('shop.companyCodeCopied', 'Company code copied to clipboard'),
      color: 'green',
    });
  } catch {
    toast.add({
      title: t('common.error', 'Error'),
      description: t('common.copyFailed', 'Failed to copy'),
      color: 'red',
    });
  }
};

// Shop type icons
const getShopTypeIcon = (shopType: string): string => {
  const icons: Record<string, string> = {
    cafe: 'i-heroicons-beaker',
    restaurant: 'i-heroicons-cake',
    retail: 'i-heroicons-shopping-bag',
    grocery: 'i-heroicons-shopping-cart',
    noodles: 'i-heroicons-fire',
    service: 'i-heroicons-wrench-screwdriver',
    pharmacy: 'i-heroicons-heart',
    gym: 'i-heroicons-trophy',
    karaoke: 'i-heroicons-musical-note',
    garage: 'i-heroicons-truck',
    dry_clean: 'i-heroicons-sparkles',
    car_care: 'i-heroicons-cog',
    enterprise: 'i-heroicons-building-office-2',
  };
  return icons[shopType] || 'i-heroicons-building-storefront';
};

// Shop type gradients
const getShopTypeGradient = (shopType: string): string => {
  const gradients: Record<string, string> = {
    cafe: 'from-amber-400 to-orange-500',
    restaurant: 'from-red-400 to-pink-500',
    retail: 'from-blue-400 to-indigo-500',
    grocery: 'from-green-400 to-emerald-500',
    noodles: 'from-orange-400 to-red-500',
    service: 'from-gray-400 to-slate-500',
    pharmacy: 'from-teal-400 to-cyan-500',
    gym: 'from-purple-400 to-violet-500',
    karaoke: 'from-pink-400 to-rose-500',
    garage: 'from-slate-400 to-gray-500',
    dry_clean: 'from-sky-400 to-blue-500',
    car_care: 'from-zinc-400 to-neutral-500',
    enterprise: 'from-indigo-400 to-purple-500',
  };
  return gradients[shopType] || 'from-primary-400 to-primary-600';
};
</script>
