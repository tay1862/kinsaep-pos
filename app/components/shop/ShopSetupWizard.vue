<!-- components/shop/ShopSetupWizard.vue -->
<!-- 🏪 Unified Shop Setup Wizard - Works for initial setup & new workspace creation -->
<script setup lang="ts">
import type { ShopConfig } from "~/composables/use-shop";
import type { ShopType, ShopVisibility } from "~/types";
import {
  getShopTypeConfig,
  shouldTrackStockByDefault,
} from "~/data/shop-templates";
import { CURRENCY_OPTIONS } from "~/composables/use-currency";

// Props to control wizard behavior
const props = withDefaults(
  defineProps<{
    /** Mode: 'initial' for first-time setup, 'workspace' for adding new workspace */
    mode?: "initial" | "workspace";
    /** Show product templates step */
    showTemplates?: boolean;
    /** Show branch setup step */
    showBranch?: boolean;
    /** Show marketplace step */
    showMarketplace?: boolean;
    /** Default shop type */
    defaultShopType?: ShopType;
  }>(),
  {
    mode: "initial",
    showTemplates: true,
    showBranch: true,
    showMarketplace: true,
    defaultShopType: "cafe",
  }
);

const emit = defineEmits<{
  (e: "complete" | "cancel"): void;
}>();

const { t } = useI18n();
const toast = useToast();
const shop = useShop();
const company = useCompany();
const productsStore = useProductsStore();
const marketplace = useMarketplace();
const nostrUser = useNostrUser();
const offline = useOffline();

// ============ State ============
const currentStep = ref(0);
const isSubmitting = ref(false);
const direction = ref<"forward" | "backward">("forward");

// Form data
const shopForm = reactive({
  name: "",
  address: "",
  phone: "",
  currency: "LAK",
  timezone: "Asia/Vientiane",
  language: "en-US",
  visibility: "public" as ShopVisibility,
});

const shopType = ref<ShopType>(props.defaultShopType);

const branchForm = reactive({
  name: "",
  code: "",
  address: "",
});

const settingsForm = reactive({
  taxRate: 0,
  tipEnabled: false,
  receiptFooter: "",
});

const applyTemplates = ref(true);

const marketplaceForm = reactive({
  lud16: "",
  nip05: "",
  marketplaceDescription: "",
  services: [] as string[],
  acceptsLightning: true,
  acceptsBitcoin: false,
});

const generatedCompanyCode = ref("");

// Debug mode
const isWorkspaceMode = computed(() => props.mode === "workspace");

// ============ Steps Configuration ============
interface WizardStep {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  isValid: () => boolean;
}

const allSteps = computed<WizardStep[]>(() => {
  const steps: WizardStep[] = [
    {
      id: "type",
      title: t("shop.setup.step2.title", "Shop Type"),
      subtitle: t("shop.setup.step2.subtitle", "What kind of business?"),
      icon: "i-heroicons-squares-2x2",
      iconBg:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
      isValid: () => !!shopType.value,
    },
    {
      id: "info",
      title: t("shop.setup.step1.title", "Shop Info"),
      subtitle: t("shop.setup.step1.subtitle", "Basic details"),
      icon: "i-heroicons-building-storefront",
      iconBg:
        "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400",
      isValid: () => shopForm.name.trim().length > 0,
    },
  ];

  // Add branch step (for both initial and workspace mode)
  if (props.showBranch) {
    steps.push({
      id: "branch",
      title: t("shop.setup.step3.title", "Branch Setup"),
      subtitle: t("shop.setup.step3.subtitle", "First location"),
      icon: "i-heroicons-map",
      iconBg:
        "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
      isValid: () =>
        branchForm.name.trim().length > 0 && branchForm.code.trim().length > 0,
    });
  }

  // Add settings/templates step for initial setup
  if (props.showTemplates) {
    steps.push({
      id: "settings",
      title: t("shop.setup.step4.title", "Settings"),
      subtitle: t("shop.setup.step4.subtitle", "Configure options"),
      icon: "i-heroicons-cog-6-tooth",
      iconBg:
        "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
      isValid: () => true,
    });
  }

  // Add marketplace step if public
  if (props.showMarketplace && shopForm.visibility === "public") {
    steps.push({
      id: "marketplace",
      title: t("shop.setup.step5.title", "Marketplace"),
      subtitle: t("shop.setup.step5.subtitle", "Get discovered"),
      icon: "i-heroicons-globe-alt",
      iconBg:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
      isValid: () => true,
    });
  }

  // Add confirm step for initial setup (workspace mode already returns early with confirm)
  steps.push({
    id: "confirm",
    title: t("shop.setup.stepConfirm", "Confirm"),
    subtitle: t("shop.setup.confirmDesc", "Review & create"),
    icon: "i-heroicons-check-circle",
    iconBg:
      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    isValid: () => true,
  });

  return steps;
});

const totalSteps = computed(() => allSteps.value.length);
const currentStepData = computed(() => allSteps.value[currentStep.value]);
const isLastStep = computed(() => currentStep.value === totalSteps.value - 1);
const canProceed = computed(() => currentStepData.value?.isValid() ?? false);

// ============ Shop Types ============
const shopTypes = computed(() => [
  {
    id: "cafe" as ShopType,
    label: t("shop.types.cafe", "Cafe"),
    description: t("shop.types.cafeDesc", "Coffee & beverages"),
    icon: "i-heroicons-beaker",
    gradient: "from-amber-400 to-orange-500",
    emoji: "☕",
  },
  {
    id: "restaurant" as ShopType,
    label: t("shop.types.restaurant", "Restaurant"),
    description: t("shop.types.restaurantDesc", "Full service dining"),
    icon: "i-heroicons-cake",
    gradient: "from-red-400 to-pink-500",
    emoji: "🍽️",
  },
  {
    id: "retail" as ShopType,
    label: t("shop.types.retail", "Retail"),
    description: t("shop.types.retailDesc", "General store"),
    icon: "i-heroicons-shopping-bag",
    gradient: "from-blue-400 to-indigo-500",
    emoji: "🛍️",
  },
  {
    id: "grocery" as ShopType,
    label: t("shop.types.grocery", "Grocery"),
    description: t("shop.types.groceryDesc", "Food & essentials"),
    icon: "i-heroicons-shopping-cart",
    gradient: "from-green-400 to-emerald-500",
    emoji: "🥬",
  },
  {
    id: "noodles" as ShopType,
    label: t("shop.types.noodles", "Noodles"),
    description: t("shop.types.noodlesDesc", "Noodle shop"),
    icon: "i-heroicons-fire",
    gradient: "from-orange-400 to-red-500",
    emoji: "🍜",
  },
  {
    id: "service" as ShopType,
    label: t("shop.types.service", "Service"),
    description: t("shop.types.serviceDesc", "Service business"),
    icon: "i-heroicons-wrench-screwdriver",
    gradient: "from-gray-400 to-slate-500",
    emoji: "🔧",
  },
  {
    id: "pharmacy" as ShopType,
    label: t("shop.types.pharmacy", "Pharmacy"),
    description: t("shop.types.pharmacyDesc", "Health & medicine"),
    icon: "i-heroicons-heart",
    gradient: "from-teal-400 to-cyan-500",
    emoji: "💊",
  },
  {
    id: "gym" as ShopType,
    label: t("shop.types.gym", "Gym"),
    description: t("shop.types.gymDesc", "Fitness center"),
    icon: "i-heroicons-trophy",
    gradient: "from-purple-400 to-violet-500",
    emoji: "🏋️",
  },
  {
    id: "karaoke" as ShopType,
    label: t("shop.types.karaoke", "Karaoke"),
    description: t("shop.types.karaokeDesc", "Entertainment"),
    icon: "i-heroicons-microphone",
    gradient: "from-pink-400 to-rose-500",
    emoji: "🎤",
  },
  {
    id: "garage" as ShopType,
    label: t("shop.types.garage", "Garage"),
    description: t("shop.types.garageDesc", "Auto repair"),
    icon: "i-heroicons-wrench",
    gradient: "from-zinc-400 to-stone-500",
    emoji: "🔩",
  },
  {
    id: "dry_clean" as ShopType,
    label: t("shop.types.dry_clean", "Dry Clean"),
    description: t("shop.types.dry_cleanDesc", "Laundry services"),
    icon: "i-heroicons-sparkles",
    gradient: "from-sky-400 to-blue-500",
    emoji: "👔",
  },
  {
    id: "car_care" as ShopType,
    label: t("shop.types.car_care", "Car Care"),
    description: t("shop.types.car_careDesc", "Vehicle services"),
    icon: "i-heroicons-paint-brush",
    gradient: "from-cyan-400 to-teal-500",
    emoji: "🚗",
  },
  {
    id: "enterprise" as ShopType,
    label: t("shop.types.enterprise", "Enterprise"),
    description: t("shop.types.enterpriseDesc", "Large business"),
    icon: "i-heroicons-building-office-2",
    gradient: "from-indigo-400 to-purple-500",
    emoji: "🏢",
  },
  {
    id: "other" as ShopType,
    label: t("shop.types.other", "Other"),
    description: t("shop.types.otherDesc", "Custom business"),
    icon: "i-heroicons-squares-2x2",
    gradient: "from-slate-400 to-gray-500",
    emoji: "📦",
  },
]);

const selectedShopType = computed(() =>
  shopTypes.value.find((s) => s.id === shopType.value)
);

// ============ Options ============
const currencyOptions = CURRENCY_OPTIONS;

const languageOptions = [
  { value: "en-US", label: "🇺🇸 English" },
  { value: "lo-LA", label: "🇱🇦 ລາວ" },
  { value: "th-TH", label: "🇹🇭 ไทย" },
];

const serviceOptions = [
  { value: "dine_in", label: "🍽️", name: "Dine-in" },
  { value: "takeaway", label: "🥡", name: "Takeaway" },
  { value: "delivery", label: "🚚", name: "Delivery" },
  { value: "pickup", label: "📦", name: "Pickup" },
  { value: "reservation", label: "📅", name: "Reservation" },
];

// ============ Navigation ============
const nextStep = () => {
  if (currentStep.value < totalSteps.value - 1 && canProceed.value) {
    direction.value = "forward";
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    direction.value = "backward";
    currentStep.value--;
  }
};

const goToStep = (index: number) => {
  if (index < currentStep.value) {
    direction.value = "backward";
    currentStep.value = index;
  }
};

// ============ Product Templates ============
const applyProductTemplates = async () => {
  if (!applyTemplates.value) return;

  const config = getShopTypeConfig(shopType.value);
  if (!config) return;

  const trackStock = shouldTrackStockByDefault(shopType.value);

  // Create categories
  for (const cat of config.categories) {
    await productsStore.addCategory({
      name: cat.name,
      description: cat.nameLao,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
    });
  }

  // Create products
  for (const prod of config.products) {
    const categoryId = productsStore.categories.value.find(
      (c) =>
        c.name ===
        config.categories.find((tc) => tc.id === prod.categoryId)?.name
    )?.id;

    if (categoryId) {
      await productsStore.addProduct({
        name: prod.name,
        description: prod.nameLao,
        sku: prod.id.toUpperCase(),
        categoryId,
        unitId: "default",
        price: prod.price,
        stock: 0,
        minStock: 0,
        branchId: "",
        status: "active",
        image: prod.image,
        trackStock,
      });
    }
  }
};

// ============ Complete Setup ============
const completeSetup = async () => {
  isSubmitting.value = true;

  try {
    // 🧹 IMPORTANT: Clear all local data when creating new workspace
    // This prevents products/data from shop 1 appearing in shop 2
    if (props.mode === "workspace") {
      console.log("[ShopSetup] Clearing data for new workspace...");
      const shopManager = useShopManager();
      await shopManager.clearShopData();
      console.log("[ShopSetup] Data cleared successfully");

      // Seed template products if user wants them
      if (applyTemplates.value) {
        console.log("[ShopSetup] Seeding template products...");
        await shopManager.seedTemplatesAfterClear(shopType.value, false);
        console.log("[ShopSetup] Templates seeded successfully");
      }
    }

    const autoTags = [shopType.value.toLowerCase().replace(/_/g, "-")];

    let marketplaceDesc = marketplaceForm.marketplaceDescription;
    if (shopForm.visibility === "public" && !marketplaceDesc && shopForm.name) {
      const typeLabel = shopType.value.replace(/_/g, " ");
      marketplaceDesc = `Welcome to ${shopForm.name} - Your trusted ${typeLabel}`;
      if (shopForm.address) {
        marketplaceDesc += ` located at ${shopForm.address}`;
      }
    }

    // Build shop config
    const shopConfig: Partial<ShopConfig> = {
      name: shopForm.name,
      address: shopForm.address,
      phone: shopForm.phone,
      currency: shopForm.currency,
      timezone: shopForm.timezone,
      language: shopForm.language,
      visibility: shopForm.visibility,
      shopType: shopType.value,
      taxRate: settingsForm.taxRate,
      tipEnabled: settingsForm.tipEnabled,
      receiptFooter: settingsForm.receiptFooter,
      tags: autoTags,
      platformTag: "bnos.space",
      ...(shopForm.visibility === "public" && {
        lud16: marketplaceForm.lud16 || undefined,
        nip05: marketplaceForm.nip05 || undefined,
        marketplaceDescription: marketplaceDesc || undefined,
        services: marketplaceForm.services,
        acceptsLightning: marketplaceForm.acceptsLightning,
        acceptsBitcoin: marketplaceForm.acceptsBitcoin,
        isListed: true,
        marketplaceJoinedAt: new Date().toISOString(),
      }),
    };

    await shop.saveShopConfig(shopConfig);

    // Auto-populate receipt settings
    const receiptSettings = useReceiptSettings();
    receiptSettings.updateHeader({
      businessName: shopForm.name,
      phone: shopForm.phone,
      address: shopForm.address,
    });

    if (settingsForm.receiptFooter) {
      receiptSettings.updateFooter({
        thankYouMessage: settingsForm.receiptFooter,
      });
    }

    // Create first branch
    // For initial setup, create branch if configured
    // For workspace mode, always create a branch with default name
    const shouldCreateBranch =
      props.mode === "initial" ? props.showBranch : true;

    if (shouldCreateBranch) {
      const branchName = branchForm.name || shopForm.name;
      const branchCode =
        branchForm.code ||
        shopForm.name.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 8);

      const newBranch = await shop.createFirstBranch({
        name: branchName,
        code: branchCode,
        address: branchForm.address || shopForm.address || "",
      });

      // Auto-set current branch ID
      if (newBranch?.id) {
        shop.setCurrentBranch(newBranch.id);
        localStorage.setItem("currentBranchId", newBranch.id);
      }

      // Apply product templates for both initial and workspace modes
      if (applyTemplates.value && newBranch) {
        await applyProductTemplates();
      }
    }

    // Set up company code (for both initial and workspace modes)
    if (generatedCompanyCode.value) {
      let ownerPubkey = "";
      const storedNostrUser = localStorage.getItem("nostrUser");
      if (storedNostrUser) {
        try {
          const parsed = JSON.parse(storedNostrUser);
          ownerPubkey = parsed.pubkey || parsed.publicKey || "";
        } catch {
          console.warn("Failed to parse nostrUser");
        }
      }

      await company.setCompanyCode(generatedCompanyCode.value, ownerPubkey);
      company.toggleCompanyCode(true);

      if (ownerPubkey) {
        try {
          const nostrData = useNostrData();
          const codeHash = await company.hashCompanyCode(
            generatedCompanyCode.value
          );
          await nostrData.publishCompanyIndex(codeHash);
        } catch (e) {
          console.warn("[ShopSetup] Failed to publish company index:", e);
        }
      }
    }

    // Register this shop as a workspace with company code
    const shopManager = useShopManager();
    shopManager.registerCurrentShop();

    // Publish to marketplace if public
    if (shopForm.visibility === "public") {
      let hasNostrAuth: string | boolean | undefined =
        nostrUser.user.value?.publicKey;

      if (!hasNostrAuth && import.meta.client) {
        const storedNostrUser = localStorage.getItem("nostrUser");
        if (storedNostrUser) {
          try {
            const parsed = JSON.parse(storedNostrUser);
            hasNostrAuth = parsed.pubkey || parsed.publicKey || false;
          } catch {
            console.warn("Failed to parse nostrUser from localStorage");
          }
        }
      }

      if (hasNostrAuth) {
        try {
          await marketplace.publishStoreToMarketplace();
        } catch (e) {
          console.warn("[ShopSetup] Failed to publish to marketplace:", e);
        }
      }
    }

    // Sync products to Nostr if templates were applied
    if (applyTemplates.value && props.mode !== "workspace") {
      const offline = useOffline();
      if (offline.isOnline.value) {
        try {
          console.log("[ShopSetup] Syncing products to Nostr...");
          await productsStore.syncToNostr();
          console.log("[ShopSetup] Products synced to Nostr");
        } catch (e) {
          console.warn("[ShopSetup] Failed to sync products to Nostr:", e);
        }
      }
    }

    toast.add({
      title: t("shop.setup.success", "Setup Complete!"),
      description: t(
        "shop.setup.successDescription",
        "Your shop is ready to use."
      ),
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    emit("complete");
  } catch (error) {
    console.error("Setup error:", error);
    toast.add({
      title: t("common.error", "Error"),
      description: String(error),
      icon: "i-heroicons-exclamation-circle",
      color: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
};

// ============ Watchers ============
watch(
  () => branchForm.name,
  (name) => {
    if (!branchForm.code) {
      branchForm.code = name
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "-")
        .slice(0, 8);
    }
  }
);

// ============ Lifecycle ============
onMounted(() => {
  nostrUser.initializeUser();

  // Always generate new company code for new workspace
  // Or generate if initial setup has no code
  if (props.mode === "workspace") {
    // New workspace always gets a new company code
    generatedCompanyCode.value = company.generateCompanyCode();
  } else if (!company.hasCompanyCode.value) {
    // Initial setup without existing code
    generatedCompanyCode.value = company.generateCompanyCode();
  } else {
    // Initial setup with existing code (shouldn't happen but fallback)
    generatedCompanyCode.value = company.companyCode.value || "";
  }
});
</script>

<template>
  <div class="min-h-dvh bg-gray-50 dark:bg-gray-900 flex flex-col">
    <!-- Mobile Header -->
    <div
      class="sticky top-0 z-20 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 safe-area-inset-top"
    >
      <div class="flex items-center justify-between px-4 py-3">
        <button
          v-if="currentStep > 0"
          class="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all"
          @click="prevStep"
        >
          <Icon
            name="i-heroicons-arrow-left"
            size="24"
            class="text-gray-600 dark:text-gray-400"
          />
        </button>
        <button
          v-else
          class="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all"
          @click="emit('cancel')"
        >
          <Icon
            name="i-heroicons-x-mark"
            size="24"
            class="text-gray-600 dark:text-gray-400"
          />
        </button>

        <!-- Step Title -->
        <div class="text-center flex-1">
          <h1 class="font-semibold text-gray-900 dark:text-white">
            {{ currentStepData?.title }}
          </h1>
          <p class="text-xs text-gray-500">
            {{ currentStep + 1 }} / {{ totalSteps }}
          </p>
        </div>

        <div class="w-10" />
      </div>

      <!-- Progress Bar -->
      <div class="h-1 bg-gray-100 dark:bg-gray-700">
        <div
          class="h-full bg-primary-500 transition-all duration-500 ease-out"
          :style="{ width: `${((currentStep + 1) / totalSteps) * 100}%` }"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-lg mx-auto px-4 py-6 pb-32">
        <!-- Step: Shop Type -->
        <div v-show="currentStepData?.id === 'type'" class="space-y-4">
          <p class="text-center text-gray-600 dark:text-gray-400 mb-6">
            {{
              $t(
                "shop.setup.selectTypeDesc",
                "Choose what best describes your business"
              )
            }}
          </p>

          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="type in shopTypes"
              :key="type.id"
              class="relative p-4 rounded-2xl border-2 transition-all duration-200 text-left active:scale-[0.98]"
              :class="{
                'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg shadow-primary-500/20':
                  shopType === type.id,
                'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600':
                  shopType !== type.id,
              }"
              @click="shopType = type.id"
            >
              <!-- Selection Indicator -->
              <div
                v-if="shopType === type.id"
                class="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center"
              >
                <Icon name="i-heroicons-check" size="12" class="text-white" />
              </div>

              <!-- Icon -->
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-linear-to-br"
                :class="type.gradient"
              >
                <span class="text-2xl">{{ type.emoji }}</span>
              </div>

              <h3 class="font-semibold text-gray-900 dark:text-white text-sm">
                {{ type.label }}
              </h3>
              <p
                class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1"
              >
                {{ type.description }}
              </p>
            </button>
          </div>
        </div>

        <!-- Step: Shop Info -->
        <div v-show="currentStepData?.id === 'info'" class="space-y-4">
          <!-- Shop Type Preview -->
          <div
            v-if="selectedShopType"
            class="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 mb-6"
          >
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center bg-linear-to-br shrink-0"
              :class="selectedShopType.gradient"
            >
              <span class="text-lg">{{ selectedShopType.emoji }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ selectedShopType.label }}
              </p>
              <p class="text-xs text-gray-500 truncate">
                {{ selectedShopType.description }}
              </p>
            </div>
            <button
              class="text-xs text-primary-600 dark:text-primary-400 font-medium"
              @click="goToStep(0)"
            >
              {{ $t("common.change", "Change") }}
            </button>
          </div>

          <UFormField :label="$t('shop.name', 'Shop Name')" required>
            <UInput
              v-model="shopForm.name"
              :placeholder="$t('shop.namePlaceholder', 'My Coffee Shop')"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="$t('settings.general.currency', 'Currency')">
              <USelect
                v-model="shopForm.currency"
                :items="currencyOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('settings.general.language', 'Language')">
              <USelect
                v-model="shopForm.language"
                :items="languageOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField
            :label="$t('shop.address', 'Address')"
            :hint="$t('common.optional', 'optional')"
          >
            <UTextarea
              v-model="shopForm.address"
              :placeholder="
                $t('shop.addressPlaceholder', 'Enter your shop address')
              "
              :rows="2"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('shop.phone', 'Phone')"
            :hint="$t('common.optional', 'optional')"
          >
            <UInput
              v-model="shopForm.phone"
              :placeholder="$t('shop.phonePlaceholder', '+856 20 1234 5678')"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <!-- Visibility Toggle (for initial setup) -->
          <div v-if="mode === 'initial'" class="pt-4">
            <p class="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {{ $t("shop.setup.visibility", "Shop Visibility") }}
            </p>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                class="p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98]"
                :class="{
                  'border-primary-500 bg-primary-50 dark:bg-primary-900/20':
                    shopForm.visibility === 'private',
                  'border-gray-200 dark:border-gray-700':
                    shopForm.visibility !== 'private',
                }"
                @click="shopForm.visibility = 'private'"
              >
                <Icon
                  name="i-heroicons-lock-closed"
                  size="24"
                  class="mb-2"
                  :class="
                    shopForm.visibility === 'private'
                      ? 'text-primary-600'
                      : 'text-gray-400'
                  "
                />
                <p
                  class="font-medium text-sm"
                  :class="
                    shopForm.visibility === 'private'
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-gray-900 dark:text-white'
                  "
                >
                  {{ $t("shop.setup.private", "Private") }}
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  {{ $t("shop.setup.privateDesc", "Only you can see") }}
                </p>
              </button>
              <button
                type="button"
                class="p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98]"
                :class="{
                  'border-primary-500 bg-primary-50 dark:bg-primary-900/20':
                    shopForm.visibility === 'public',
                  'border-gray-200 dark:border-gray-700':
                    shopForm.visibility !== 'public',
                }"
                @click="shopForm.visibility = 'public'"
              >
                <Icon
                  name="i-heroicons-globe-alt"
                  size="24"
                  class="mb-2"
                  :class="
                    shopForm.visibility === 'public'
                      ? 'text-primary-600'
                      : 'text-gray-400'
                  "
                />
                <p
                  class="font-medium text-sm"
                  :class="
                    shopForm.visibility === 'public'
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-gray-900 dark:text-white'
                  "
                >
                  {{ $t("shop.setup.public", "Public") }}
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  {{ $t("shop.setup.publicDesc", "Listed on marketplace") }}
                </p>
              </button>
            </div>
          </div>
        </div>

        <!-- Step: Branch Setup -->
        <div v-show="currentStepData?.id === 'branch'" class="space-y-4">
          <div class="text-center mb-6">
            <div
              class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
            >
              <Icon
                name="i-heroicons-map-pin"
                size="32"
                class="text-green-600 dark:text-green-400"
              />
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              {{
                $t("shop.setup.step3.subtitle", "Set up your first location")
              }}
            </p>
          </div>

          <UFormField :label="$t('branch.name', 'Branch Name')" required>
            <UInput
              v-model="branchForm.name"
              :placeholder="$t('branch.namePlaceholder', 'Main Branch')"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('branch.code', 'Branch Code')" required>
            <UInput
              v-model="branchForm.code"
              :placeholder="$t('branch.codePlaceholder', 'MAIN')"
              class="w-full font-mono uppercase"
            />
            <template #hint>
              <span class="text-xs text-gray-500">{{
                $t("branch.codeHint", "Short code for this branch")
              }}</span>
            </template>
          </UFormField>

          <UFormField :label="$t('branch.address', 'Branch Address')">
            <UTextarea
              v-model="branchForm.address"
              :placeholder="$t('branch.addressPlaceholder', 'Branch location')"
              :rows="2"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Step: Settings -->
        <div v-show="currentStepData?.id === 'settings'" class="space-y-4">
          <UFormField :label="$t('settings.general.taxRate', 'Tax Rate')">
            <UInput
              v-model.number="settingsForm.taxRate"
              type="number"
              min="0"
              max="100"
              :placeholder="$t('settings.general.taxRatePlaceholder', '0')"
            >
              <template #trailing>
                <span class="text-gray-500">%</span>
              </template>
            </UInput>
          </UFormField>

          <div
            class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
          >
            <div>
              <p class="font-medium text-gray-900 dark:text-white text-sm">
                {{ $t("settings.general.enableTips", "Enable Tips") }}
              </p>
              <p class="text-xs text-gray-500">
                {{
                  $t(
                    "settings.general.enableTipsDescription",
                    "Allow customers to tip"
                  )
                }}
              </p>
            </div>
            <USwitch v-model="settingsForm.tipEnabled" />
          </div>

          <UFormField
            :label="$t('settings.general.receiptFooter', 'Receipt Footer')"
          >
            <UTextarea
              v-model="settingsForm.receiptFooter"
              :placeholder="
                $t('settings.general.receiptFooterPlaceholder', 'Thank you!')
              "
              :rows="2"
              class="w-full"
            />
          </UFormField>

          <!-- Product Templates -->
          <div class="pt-4">
            <ShopProductTemplatePreview
              v-model="applyTemplates"
              :shop-type="shopType"
            />
          </div>
        </div>

        <!-- Step: Marketplace -->
        <div v-show="currentStepData?.id === 'marketplace'" class="space-y-4">
          <div class="text-center mb-6">
            <div
              class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
            >
              <Icon
                name="i-heroicons-globe-alt"
                size="32"
                class="text-blue-600 dark:text-blue-400"
              />
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              {{
                $t("shop.setup.step5.subtitle", "Make your store discoverable")
              }}
            </p>
          </div>

          <UFormField
            :label="$t('shop.marketplace.lud16', 'Lightning Address')"
          >
            <UInput
              v-model="marketplaceForm.lud16"
              placeholder="shop@getalby.com"
              icon="i-heroicons-bolt"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('shop.marketplace.nip05', 'Nostr Verification')"
          >
            <UInput
              v-model="marketplaceForm.nip05"
              placeholder="shop@bnos.space"
              icon="i-heroicons-check-badge"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('shop.marketplace.description', 'Description')"
          >
            <UTextarea
              v-model="marketplaceForm.marketplaceDescription"
              :placeholder="
                $t(
                  'shop.marketplace.descriptionPlaceholder',
                  'Tell customers about your store...'
                )
              "
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <!-- Services -->
          <UFormField :label="$t('shop.marketplace.services', 'Services')">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="option in serviceOptions"
                :key="option.value"
                type="button"
                class="px-3 py-2 rounded-lg border-2 text-sm transition-all flex items-center gap-2 active:scale-95"
                :class="{
                  'border-primary-500 bg-primary-50 dark:bg-primary-900/20':
                    marketplaceForm.services.includes(option.value),
                  'border-gray-200 dark:border-gray-700':
                    !marketplaceForm.services.includes(option.value),
                }"
                @click="
                  marketplaceForm.services.includes(option.value)
                    ? (marketplaceForm.services =
                        marketplaceForm.services.filter(
                          (s) => s !== option.value
                        ))
                    : marketplaceForm.services.push(option.value)
                "
              >
                <span>{{ option.label }}</span>
                <span class="text-gray-700 dark:text-gray-300">{{
                  option.name
                }}</span>
              </button>
            </div>
          </UFormField>

          <!-- Payment Methods -->
          <div class="space-y-3 pt-2">
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ $t("shop.marketplace.payments", "Payment Methods") }}
            </p>

            <div
              class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800"
            >
              <div class="flex items-center gap-3">
                <span class="text-2xl">⚡</span>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white text-sm">
                    Lightning
                  </p>
                  <p class="text-xs text-gray-500">Fast payments</p>
                </div>
              </div>
              <USwitch v-model="marketplaceForm.acceptsLightning" />
            </div>

            <div
              class="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800"
            >
              <div class="flex items-center gap-3">
                <span class="text-2xl">₿</span>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white text-sm">
                    Bitcoin
                  </p>
                  <p class="text-xs text-gray-500">On-chain</p>
                </div>
              </div>
              <USwitch v-model="marketplaceForm.acceptsBitcoin" />
            </div>
          </div>
        </div>

        <!-- Step: Confirm -->
        <div v-show="currentStepData?.id === 'confirm'" class="space-y-4">
          <!-- Preview Card -->
          <div
            class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm"
          >
            <div class="flex items-start gap-4 mb-4">
              <div
                v-if="selectedShopType"
                class="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg bg-linear-to-br"
                :class="selectedShopType.gradient"
              >
                <span class="text-3xl">{{ selectedShopType.emoji }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <h3
                  class="text-xl font-bold text-gray-900 dark:text-white truncate"
                >
                  {{ shopForm.name }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ selectedShopType?.label }} • {{ shopForm.currency }}
                </p>
              </div>
            </div>

            <div
              class="space-y-2 border-t border-gray-100 dark:border-gray-700 pt-4"
            >
              <div v-if="shopForm.address" class="flex items-start gap-3">
                <Icon
                  name="i-heroicons-map-pin"
                  size="18"
                  class="text-gray-400 mt-0.5 shrink-0"
                />
                <span class="text-sm text-gray-600 dark:text-gray-300">{{
                  shopForm.address
                }}</span>
              </div>
              <div v-if="shopForm.phone" class="flex items-center gap-3">
                <Icon
                  name="i-heroicons-phone"
                  size="18"
                  class="text-gray-400 shrink-0"
                />
                <span class="text-sm text-gray-600 dark:text-gray-300">{{
                  shopForm.phone
                }}</span>
              </div>
              <div v-if="branchForm.name" class="flex items-center gap-3">
                <Icon
                  name="i-heroicons-building-office"
                  size="18"
                  class="text-gray-400 shrink-0"
                />
                <span class="text-sm text-gray-600 dark:text-gray-300"
                  >{{ branchForm.name }} ({{ branchForm.code }})</span
                >
              </div>
            </div>
          </div>

          <!-- Company Code -->
          <div
            v-if="generatedCompanyCode"
            class="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800"
          >
            <div class="flex items-center gap-2 mb-2">
              <Icon
                name="i-heroicons-qr-code"
                size="20"
                class="text-primary-600"
              />
              <p
                class="text-sm font-medium text-primary-900 dark:text-primary-100"
              >
                {{ $t("auth.company.connectTitle", "Company Code") }}
              </p>
            </div>
            <p
              class="font-mono text-2xl font-bold tracking-widest text-primary-700 dark:text-primary-300"
            >
              {{ generatedCompanyCode }}
            </p>
            <p class="text-xs text-primary-600 dark:text-primary-400 mt-2">
              {{
                $t(
                  "shop.setup.companyCodeHint",
                  "Share with staff to connect their devices"
                )
              }}
            </p>
          </div>

          <!-- What Happens Next -->
          <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex gap-3">
            <Icon
              name="i-heroicons-information-circle"
              size="20"
              class="text-blue-500 shrink-0 mt-0.5"
            />
            <div class="text-sm">
              <p class="font-medium text-blue-900 dark:text-blue-100 mb-2">
                {{ $t("shop.setup.whatHappens", "What happens next?") }}
              </p>
              <ul class="space-y-1 text-blue-700 dark:text-blue-300">
                <li class="flex items-center gap-2">
                  <Icon
                    name="i-heroicons-check"
                    size="14"
                    class="text-blue-500"
                  />
                  {{
                    $t(
                      "shop.setup.step1.description",
                      "Your shop will be created locally"
                    )
                  }}
                </li>
                <li class="flex items-center gap-2">
                  <Icon
                    name="i-heroicons-check"
                    size="14"
                    class="text-blue-500"
                  />
                  {{
                    $t(
                      "shop.setup.step2.description",
                      "Data will sync to Nostr relays"
                    )
                  }}
                </li>
                <li class="flex items-center gap-2">
                  <Icon
                    name="i-heroicons-check"
                    size="14"
                    class="text-blue-500"
                  />
                  {{
                    $t(
                      "shop.setup.step3.description",
                      "You can switch between workspaces anytime"
                    )
                  }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Action Bar -->
    <div
      class="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 safe-area-inset-bottom"
    >
      <div class="max-w-lg mx-auto px-4 py-4">
        <UButton
          block
          size="xl"
          :loading="isSubmitting"
          :disabled="!canProceed"
          @click="isLastStep ? completeSetup() : nextStep()"
        >
          <template v-if="isLastStep">
            <Icon name="i-heroicons-check" size="20" class="mr-2" />
            {{ $t("shop.setup.createShop", "Create Shop") }}
          </template>
          <template v-else>
            {{ $t("common.continue", "Continue") }}
            <Icon name="i-heroicons-arrow-right" size="20" class="ml-2" />
          </template>
        </UButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.safe-area-inset-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
