<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="p-6">
        <!-- Animated Header -->
        <div class="text-center mb-6">
          <!-- Shop Icon with Glow Effect -->
          <div class="relative inline-block mb-4">
            <div
              v-if="targetWorkspace"
              class="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl bg-linear-to-br animate-pulse-slow relative z-10"
              :class="getShopTypeGradient(targetWorkspace.shopType)"
            >
              <Icon
                :name="getShopTypeIcon(targetWorkspace.shopType)"
                size="40"
                class="text-white"
              />
            </div>
            <!-- Glow Effect -->
            <div
              class="absolute inset-0 rounded-3xl blur-xl opacity-40 bg-linear-to-br -z-10 scale-110"
              :class="getShopTypeGradient(targetWorkspace?.shopType || 'cafe')"
            />
          </div>

          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {{ $t("shop.switchTo", "Switch to") }}
          </h3>
          <p class="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {{ targetWorkspace?.name }}
          </p>
        </div>

        <!-- Info Cards -->
        <div class="space-y-3 mb-6">
          <!-- Current → New Shop Indicator -->
          <div class="flex items-center justify-center gap-3 py-3">
            <div
              class="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl"
            >
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center bg-linear-to-br"
                :class="
                  getShopTypeGradient(currentWorkspace?.shopType || 'cafe')
                "
              >
                <Icon
                  :name="getShopTypeIcon(currentWorkspace?.shopType || 'cafe')"
                  size="16"
                  class="text-white"
                />
              </div>
              <span
                class="text-sm font-medium text-gray-600 dark:text-gray-300 max-w-20 truncate"
              >
                {{ currentWorkspace?.name }}
              </span>
            </div>

            <Icon
              name="i-heroicons-arrow-right"
              size="20"
              class="text-gray-400"
            />

            <div
              class="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/30 rounded-xl ring-2 ring-primary-500/30"
            >
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center bg-linear-to-br"
                :class="
                  getShopTypeGradient(targetWorkspace?.shopType || 'cafe')
                "
              >
                <Icon
                  :name="getShopTypeIcon(targetWorkspace?.shopType || 'cafe')"
                  size="16"
                  class="text-white"
                />
              </div>
              <span
                class="text-sm font-semibold text-primary-700 dark:text-primary-300 max-w-20 truncate"
              >
                {{ targetWorkspace?.name }}
              </span>
            </div>
          </div>

          <!-- Warning -->
          <div
            class="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800"
          >
            <div
              class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800 flex items-center justify-center shrink-0"
            >
              <Icon
                name="i-heroicons-exclamation-triangle"
                size="20"
                class="text-amber-600 dark:text-amber-400"
              />
            </div>
            <div>
              <p
                class="font-semibold text-amber-800 dark:text-amber-200 text-sm"
              >
                {{ $t("shop.switchWarningTitle", "Data will be cleared") }}
              </p>
              <p
                class="text-amber-700 dark:text-amber-300 text-xs mt-1 leading-relaxed"
              >
                {{
                  $t(
                    "shop.switchWarningDesc",
                    "Local data from current shop will be cleared and replaced with data from the new shop."
                  )
                }}
              </p>
            </div>
          </div>

          <!-- Sync Info -->
          <div
            class="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800"
          >
            <div
              class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-800 flex items-center justify-center shrink-0"
            >
              <Icon
                name="i-heroicons-cloud-arrow-down"
                size="20"
                class="text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <p class="font-semibold text-blue-800 dark:text-blue-200 text-sm">
                {{ $t("shop.syncFromNostr", "Sync from Nostr") }}
              </p>
              <p
                class="text-blue-700 dark:text-blue-300 text-xs mt-1 leading-relaxed"
              >
                {{
                  $t(
                    "shop.syncFromNostrDesc",
                    "Products, orders, and settings will be synced from Nostr relays."
                  )
                }}
              </p>
            </div>
          </div>
        </div>

        <!-- Company Code Preview -->
        <div
          v-if="targetWorkspace?.companyCode"
          class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl mb-6"
        >
          <div
            class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center"
          >
            <Icon
              name="i-heroicons-qr-code"
              size="20"
              class="text-primary-600 dark:text-primary-400"
            />
          </div>
          <div class="flex-1">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ $t("auth.company.connectTitle", "Company Code") }}
            </p>
            <p
              class="font-mono text-base font-bold text-gray-800 dark:text-gray-200 tracking-widest"
            >
              {{ targetWorkspace.companyCode }}
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <UButton variant="outline" size="lg" block @click="handleCancel">
            {{ $t("common.cancel", "Cancel") }}
          </UButton>
          <UButton
            color="primary"
            size="lg"
            block
            :loading="loading"
            @click="handleConfirm"
          >
            <Icon name="i-heroicons-arrow-path" size="18" class="mr-2" />
            {{ $t("shop.switch", "Switch") }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ShopWorkspace } from "~/composables/use-shop-manager";

// Props
defineProps<{
  currentWorkspace?: ShopWorkspace | null;
  targetWorkspace?: ShopWorkspace | null;
  loading?: boolean;
}>();

// Model
const isOpen = defineModel<boolean>("open", { default: false });

// Emits
const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

// Shop type icons
const getShopTypeIcon = (shopType: string): string => {
  const icons: Record<string, string> = {
    cafe: "i-heroicons-beaker",
    restaurant: "i-heroicons-cake",
    retail: "i-heroicons-shopping-bag",
    grocery: "i-heroicons-shopping-cart",
    noodles: "i-heroicons-fire",
    service: "i-heroicons-wrench-screwdriver",
    pharmacy: "i-heroicons-heart",
    gym: "i-heroicons-trophy",
    karaoke: "i-heroicons-musical-note",
    garage: "i-heroicons-truck",
    dry_clean: "i-heroicons-sparkles",
    car_care: "i-heroicons-cog",
    enterprise: "i-heroicons-building-office-2",
  };
  return icons[shopType] || "i-heroicons-building-storefront";
};

// Shop type gradients
const getShopTypeGradient = (shopType: string): string => {
  const gradients: Record<string, string> = {
    cafe: "from-amber-400 to-orange-500",
    restaurant: "from-red-400 to-pink-500",
    retail: "from-blue-400 to-indigo-500",
    grocery: "from-green-400 to-emerald-500",
    noodles: "from-orange-400 to-red-500",
    service: "from-gray-400 to-slate-500",
    pharmacy: "from-teal-400 to-cyan-500",
    gym: "from-purple-400 to-violet-500",
    karaoke: "from-pink-400 to-rose-500",
    garage: "from-slate-400 to-gray-500",
    dry_clean: "from-sky-400 to-blue-500",
    car_care: "from-zinc-400 to-neutral-500",
    enterprise: "from-indigo-400 to-purple-500",
  };
  return gradients[shopType] || "from-primary-400 to-primary-600";
};

// Handlers
const handleConfirm = () => {
  emit("confirm");
};

const handleCancel = () => {
  isOpen.value = false;
  emit("cancel");
};
</script>

<style scoped>
@keyframes pulse-slow {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.02);
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}
</style>
