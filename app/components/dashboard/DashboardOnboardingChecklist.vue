<!-- components/dashboard/DashboardOnboardingChecklist.vue -->
<!-- 🎯 Post-Setup Onboarding Checklist - Guides users through recommended next steps -->
<script setup lang="ts">
const { t } = useI18n();
const shop = useShop();
const company = useCompany();
const productsStore = useProductsStore();

const emit = defineEmits<{
  (e: "dismiss"): void;
}>();

// Track completion of recommended actions
const hasProducts = computed(() => productsStore.products.value.length > 0);
const hasTaxConfigured = computed(() => (shop.shopConfig.value?.taxRate || 0) > 0);
const hasCompanyCode = computed(() => company.hasCompanyCode.value);
const hasReceiptFooter = computed(() => !!shop.shopConfig.value?.receiptFooter);

// Checklist items
const coreItems = computed(() => [
  {
    id: "shop-config",
    label: t("shop.setup.step1.title", "Shop Information"),
    icon: "i-heroicons-check-circle",
    completed: true,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
  {
    id: "first-branch",
    label: t("shop.setup.step3.title", "First Branch"),
    icon: "i-heroicons-check-circle",
    completed: true,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
]);

const recommendedItems = computed(() => [
  {
    id: "add-products",
    label: t("onboarding.addProducts", "Add your first products"),
    description: t("onboarding.addProductsDesc", "Start building your product catalog"),
    icon: "i-heroicons-cube",
    completed: hasProducts.value,
    action: "/products",
    color: hasProducts.value ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400",
    bgColor: hasProducts.value ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    id: "configure-tax",
    label: t("onboarding.configureTax", "Configure tax settings"),
    description: t("onboarding.configureTaxDesc", "Set up tax rates for your business"),
    icon: "i-heroicons-receipt-percent",
    completed: hasTaxConfigured.value,
    action: "/settings",
    color: hasTaxConfigured.value ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400",
    bgColor: hasTaxConfigured.value ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    id: "invite-team",
    label: t("onboarding.inviteTeam", "Invite team members"),
    description: t("onboarding.inviteTeamDesc", "Share your company code with staff"),
    icon: "i-heroicons-users",
    completed: hasCompanyCode.value,
    action: "/settings/company",
    color: hasCompanyCode.value ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400",
    bgColor: hasCompanyCode.value ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    id: "receipt-template",
    label: t("onboarding.customizeReceipt", "Customize receipt template"),
    description: t("onboarding.customizeReceiptDesc", "Add your branding to receipts"),
    icon: "i-heroicons-document-text",
    completed: hasReceiptFooter.value,
    action: "/settings",
    color: hasReceiptFooter.value ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400",
    bgColor: hasReceiptFooter.value ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20",
  },
]);

// Calculate progress
const completedRecommended = computed(
  () => recommendedItems.value.filter((item) => item.completed).length
);
const totalRecommended = computed(() => recommendedItems.value.length);
const progressPercentage = computed(() =>
  Math.round((completedRecommended.value / totalRecommended.value) * 100)
);

// Dismiss checklist
const handleDismiss = () => {
  localStorage.setItem("bitspace_onboarding_checklist_dismissed", "true");
  emit("dismiss");
};

// Navigate to action
const router = useRouter();
const handleAction = (actionPath: string) => {
  router.push(actionPath);
};
</script>

<template>
  <div
    class="relative overflow-hidden rounded-2xl border border-primary-200 dark:border-primary-800 bg-linear-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/10"
  >
    <!-- Decorative gradient overlay -->
    <div
      class="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-primary-300/20 to-transparent dark:from-primary-600/10 rounded-full blur-3xl -mr-32 -mt-32"
    />

    <div class="relative p-6">
      <!-- Header -->
      <div class="flex items-start justify-between mb-6">
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-xl bg-linear-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg"
          >
            <span class="text-2xl">🚀</span>
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">
              {{ t("onboarding.getStarted", "Get Started with Your Shop") }}
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{
                t("onboarding.completeSetup", "Complete these steps to get the most out of Bitspace POS")
              }}
            </p>
          </div>
        </div>

        <!-- Dismiss button -->
        <button
          class="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
          :title="t('common.dismiss', 'Dismiss')"
          @click="handleDismiss"
        >
          <UIcon
            name="i-heroicons-x-mark"
            class="w-5 h-5 text-gray-500 dark:text-gray-400"
          />
        </button>
      </div>

      <!-- Progress Bar -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ t("onboarding.progress", "Setup Progress") }}
          </span>
          <span
            class="text-sm font-bold text-primary-600 dark:text-primary-400"
          >
            {{ progressPercentage }}%
          </span>
        </div>
        <div
          class="h-3 bg-white/60 dark:bg-gray-800/60 rounded-full overflow-hidden shadow-inner"
        >
          <div
            class="h-full bg-linear-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 shadow-md"
            :style="{ width: `${progressPercentage}%` }"
          />
        </div>
      </div>

      <!-- Core Setup (Completed) -->
      <div class="mb-6">
        <h3
          class="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"
        >
          <UIcon
            name="i-heroicons-check-badge"
            class="w-5 h-5 text-green-600 dark:text-green-400"
          />
          {{ t("onboarding.coreSetup", "Core Setup Complete") }}
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div
            v-for="item in coreItems"
            :key="item.id"
            class="flex items-center gap-3 p-3 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-green-200 dark:border-green-800/50 shadow-sm"
          >
            <div :class="['w-8 h-8 rounded-lg flex items-center justify-center', item.bgColor]">
              <UIcon :name="item.icon" :class="['w-5 h-5', item.color]" />
            </div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              {{ item.label }}
            </span>
          </div>
        </div>
      </div>

      <!-- Recommended Next Steps -->
      <div>
        <h3
          class="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"
        >
          <UIcon
            name="i-heroicons-sparkles"
            class="w-5 h-5 text-amber-600 dark:text-amber-400"
          />
          {{ t("onboarding.recommendedSteps", "Recommended Next Steps") }}
        </h3>
        <div class="space-y-2">
          <button
            v-for="item in recommendedItems"
            :key="item.id"
            class="w-full flex items-start gap-3 p-3 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all duration-200 text-left group"
            @click="handleAction(item.action)"
          >
            <div
              :class="[
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110',
                item.bgColor,
              ]"
            >
              <UIcon :name="item.icon" :class="['w-5 h-5', item.color]" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="text-sm font-medium text-gray-900 dark:text-white"
                >
                  {{ item.label }}
                </span>
                <UIcon
                  v-if="item.completed"
                  name="i-heroicons-check-circle-solid"
                  class="w-4 h-4 text-green-600 dark:text-green-400"
                />
              </div>
              <p class="text-xs text-gray-600 dark:text-gray-400">
                {{ item.description }}
              </p>
            </div>
            <UIcon
              name="i-heroicons-arrow-right"
              class="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all shrink-0 mt-2"
            />
          </button>
        </div>
      </div>

      <!-- Celebration message if all complete -->
      <div
        v-if="progressPercentage === 100"
        class="mt-4 p-4 rounded-lg bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800"
      >
        <div class="flex items-center gap-3">
          <span class="text-2xl">🎉</span>
          <div>
            <p class="text-sm font-semibold text-green-900 dark:text-green-100">
              {{
                t("onboarding.allComplete") ||
                "Congratulations! You're all set up!"
              }}
            </p>
            <p class="text-xs text-green-700 dark:text-green-300">
              {{
                t("onboarding.readyToSell", "Your shop is ready to start making sales.")
              }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
