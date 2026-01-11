<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <CommonPageHeader
      :title="$t('settings.lightning.title')"
      :subtitle="$t('settings.lightning.subtitle')"
    >
      <template #actions>
        <NuxtLinkLocale
          to="/settings"
          class="inline-flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
          {{ $t("common.back") }}
        </NuxtLinkLocale>
      </template>
    </CommonPageHeader>

    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <!-- Security Lock Warning -->
      <UAlert
        v-if="security.isEncryptionEnabled.value && security.isLocked.value"
        icon="i-heroicons-lock-closed"
        color="yellow"
        variant="subtle"
        class="mb-6"
        :title="$t('settings.lightning.securityLocked')"
        :description="$t('settings.lightning.securityLockedDescription')"
      >
        <template #actions>
          <UButton
            color="yellow"
            variant="solid"
            size="sm"
            @click="goToSecurity"
          >
            {{ $t("settings.security.unlock") }}
          </UButton>
        </template>
      </UAlert>

      <!-- API Key Protection Info -->
      <UAlert
        v-if="!security.isEncryptionEnabled.value && hasApiKeys"
        icon="i-heroicons-shield-exclamation"
        color="orange"
        variant="subtle"
        class="mb-6"
        :title="$t('settings.lightning.keysNotEncrypted')"
        :description="$t('settings.lightning.keysNotEncryptedDescription')"
      >
        <template #actions>
          <UButton
            color="orange"
            variant="solid"
            size="sm"
            @click="goToSecurity"
          >
            {{ $t("settings.lightning.enableEncryption") }}
          </UButton>
        </template>
      </UAlert>

      <!-- Connection Status Card -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'w-3 h-3 rounded-full',
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500',
                ]"
              />
              <span class="font-medium text-gray-900 dark:text-white">
                {{ $t("settings.lightning.connectionStatus") }}
              </span>
            </div>
            <UBadge
              :color="
                isConnected
                  ? 'green'
                  : settings?.isConfigured
                  ? 'yellow'
                  : 'red'
              "
              variant="subtle"
            >
              {{
                isConnected
                  ? $t("settings.lightning.connected")
                  : settings?.isConfigured
                  ? $t("settings.lightning.configured")
                  : $t("settings.lightning.notConfigured")
              }}
            </UBadge>
          </div>
        </template>

        <div
          v-if="settings?.lastTestedAt"
          class="text-sm text-gray-500 dark:text-gray-400"
        >
          {{ $t("settings.lightning.lastTested") }}:
          {{ formatDate(settings.lastTestedAt) }}
        </div>
      </UCard>

      <!-- Provider Selection -->
      <UCard class="mb-6">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ $t("settings.lightning.selectProvider") }}
          </h3>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            v-for="provider in providers"
            :key="provider.id"
            :class="[
              'p-4 rounded-xl border-2 transition-all duration-200 text-left',
              selectedProvider === provider.id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700',
            ]"
            @click="selectedProvider = provider.id"
          >
            <div class="flex items-center gap-3 mb-2">
              <UIcon :name="provider.icon" class="w-8 h-8 text-primary-500" />
              <span class="font-semibold text-gray-900 dark:text-white">{{
                provider.name
              }}</span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ provider.description }}
            </p>
          </button>
        </div>
      </UCard>

      <!-- Provider Configuration -->
      <UCard class="mb-6">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ $t("settings.lightning.configuration") }}
          </h3>
        </template>

        <!-- LNbits Configuration -->
        <div v-if="selectedProvider === 'lnbits'" class="space-y-4">
          <UFormField :label="$t('settings.lightning.lnbitsUrl')" required>
            <UInput
              v-model="form.nodeUrl"
              placeholder="https://legend.lnbits.com"
              icon="i-heroicons-globe-alt"
              class="w-full"
            />
            <template #hint>
              {{ $t("settings.lightning.lnbitsUrlHint") }}
            </template>
          </UFormField>

          <UFormField :label="$t('settings.lightning.apiKey')" required>
            <UInput
              v-model="form.apiKey"
              type="password"
              placeholder="Your Invoice/Admin key"
              icon="i-heroicons-key"
              class="w-full"
            />
            <template #hint>
              {{ $t("settings.lightning.apiKeyHint") }}
            </template>
          </UFormField>
        </div>

        <!-- Alby Hub API Configuration -->
        <div v-else-if="selectedProvider === 'alby-hub'" class="space-y-4">
          <UAlert
            icon="i-heroicons-information-circle"
            color="blue"
            variant="subtle"
            :title="$t('settings.lightning.albyHubInfo')"
            :description="$t('settings.lightning.albyHubInfoDescription')"
          />

          <UFormField :label="$t('settings.lightning.albyHubUrl')" required>
            <UInput
              v-model="form.nodeUrl"
              placeholder="https://your-alby-hub.com"
              icon="i-heroicons-globe-alt"
              class="w-full"
            />
            <template #hint>
              {{ $t("settings.lightning.albyHubUrlHint") }}
            </template>
          </UFormField>

          <UFormField :label="$t('settings.lightning.accessToken')" required>
            <UInput
              v-model="form.accessToken"
              type="password"
              placeholder="Your Alby Hub access token"
              icon="i-heroicons-key"
              class="w-full"
            />
            <template #hint>
              {{ $t("settings.lightning.accessTokenHint") }}
            </template>
          </UFormField>
        </div>

        <!-- Blink Configuration -->
        <div v-else-if="selectedProvider === 'blink'" class="space-y-4">
          <UAlert
            icon="i-heroicons-sparkles"
            color="purple"
            variant="subtle"
            :title="$t('settings.lightning.blinkInfo')"
            :description="$t('settings.lightning.blinkInfoDescription')"
          />

          <UFormField :label="$t('settings.lightning.blinkApiKey')" required>
            <UInput
              v-model="form.blinkApiKey"
              type="password"
              placeholder="blink_..."
              icon="i-heroicons-key"
              class="w-full"
            />
            <template #hint>
              {{ $t("settings.lightning.blinkApiKeyHint") }}
            </template>
          </UFormField>

          <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <h4 class="font-medium text-gray-900 dark:text-white mb-2">
              {{ $t("settings.lightning.blinkFeatures") }}
            </h4>
            <ul
              class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1"
            >
              <li>{{ $t("settings.lightning.blinkFeature1") }}</li>
              <li>{{ $t("settings.lightning.blinkFeature2") }}</li>
              <li>{{ $t("settings.lightning.blinkFeature3") }}</li>
            </ul>
          </div>
        </div>

        <!-- Alby WebLN Configuration -->
        <div v-else-if="selectedProvider === 'alby'" class="space-y-4">
          <UAlert
            icon="i-heroicons-information-circle"
            color="blue"
            variant="subtle"
            :title="$t('settings.lightning.albyInfo')"
            :description="$t('settings.lightning.albyInfoDescription')"
          />

          <div class="flex items-center gap-4">
            <UButton
              :loading="checkingAlby"
              variant="outline"
              @click="checkAlbyExtension"
            >
              <UIcon name="i-heroicons-puzzle-piece" class="w-5 h-5 mr-2" />
              {{ $t("settings.lightning.checkAlby") }}
            </UButton>

            <UBadge v-if="albyAvailable" color="green" variant="subtle">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4 mr-1" />
              {{ $t("settings.lightning.albyDetected") }}
            </UBadge>
          </div>
        </div>

        <!-- NWC Configuration -->
        <div v-else-if="selectedProvider === 'nwc'" class="space-y-4">
          <UFormField :label="$t('settings.lightning.nwcString')" required>
            <UTextarea
              v-model="form.nwcConnectionString"
              placeholder="nostr+walletconnect://..."
              :rows="3"
              class="w-full"
            />
            <template #hint>
              {{ $t("settings.lightning.nwcHint") }}
            </template>
          </UFormField>

          <UAlert
            icon="i-heroicons-light-bulb"
            color="yellow"
            variant="subtle"
            :title="$t('settings.lightning.nwcTip')"
            :description="$t('settings.lightning.nwcTipDescription')"
          />
        </div>

        <!-- Lightning Address (LNURL) Configuration -->
        <div v-else-if="selectedProvider === 'lnurl'" class="space-y-4">
          <UFormField
            :label="$t('settings.lightning.lightningAddress')"
            required
          >
            <UInput
              v-model="form.lightningAddress"
              placeholder="satoshi@walletofsatoshi.com"
              class="w-full"
              icon="i-heroicons-at-symbol"
            />
            <template #hint>
              {{ $t("settings.lightning.lnurlHint") }}
            </template>
          </UFormField>

          <UAlert
            icon="i-heroicons-information-circle"
            color="blue"
            variant="subtle"
            :title="$t('settings.lightning.lnurlInfo')"
            :description="$t('settings.lightning.lnurlInfoDescription')"
          />

          <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <h4 class="font-medium text-gray-900 dark:text-white mb-3">
              {{ $t("settings.lightning.supportedWallets") }}
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div
                v-for="wallet in supportedLNURLWallets"
                :key="wallet.name"
                class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <span>{{ wallet.icon }}</span>
                <span>{{ wallet.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Optional Settings -->
      <UCard class="mb-6">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ $t("settings.lightning.additionalSettings") }}
          </h3>
        </template>

        <div class="space-y-4">
          <UFormField :label="$t('settings.lightning.lightningAddress')">
            <UInput
              v-model="form.lightningAddress"
              placeholder="satoshi@getalby.com"
              icon="i-heroicons-at-symbol"
              class="w-full"
            />
            <template #hint>
              {{ $t("settings.lightning.lightningAddressHint") }}
            </template>
          </UFormField>

          <UFormField :label="$t('settings.lightning.bolt12Offer')">
            <UTextarea
              v-model="form.bolt12Offer"
              placeholder="lno1..."
              :rows="2"
              class="w-full"
            />
            <template #hint>
              {{ $t("settings.lightning.bolt12OfferHint") }}
            </template>
          </UFormField>
        </div>
      </UCard>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between gap-4">
        <UButton
          :loading="testing"
          variant="outline"
          size="lg"
          @click="testConnection"
        >
          <UIcon name="i-heroicons-signal" class="w-5 h-5 mr-2" />
          {{ $t("settings.lightning.testConnection") }}
        </UButton>

        <div class="flex items-center gap-4">
          <UButton variant="ghost" size="lg" @click="resetForm">
            {{ $t("common.reset") }}
          </UButton>

          <UButton
            :loading="saving"
            color="primary"
            size="lg"
            @click="saveConfiguration"
          >
            <UIcon name="i-heroicons-check" class="w-5 h-5 mr-2" />
            {{ $t("common.save") }}
          </UButton>
        </div>
      </div>

      <!-- Test Result Modal -->
      <UModal v-model:open="showTestResult">
        <template #content>
          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <UIcon
                  :name="
                    testResult?.success
                      ? 'i-heroicons-check-circle'
                      : 'i-heroicons-x-circle'
                  "
                  :class="[
                    'w-6 h-6',
                    testResult?.success ? 'text-green-500' : 'text-red-500',
                  ]"
                />
                <span class="font-semibold text-gray-900 dark:text-white">
                  {{ $t("settings.lightning.testResult") }}
                </span>
              </div>
            </template>

            <p class="text-gray-600 dark:text-gray-300">
              {{ testResult?.message }}
            </p>

            <template #footer>
              <div class="flex justify-end">
                <UButton @click="showTestResult = false">
                  {{ $t("common.close") }}
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LightningProvider } from "~/types";

definePageMeta({
  middleware: ["auth"],
});

useHead({
  title: "Lightning Settings",
});

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const lightning = useLightning();
const users = useUsers();
const security = useSecurity();

// Check permission
const canManageLightning = computed(() =>
  users.hasPermission("canManageLightning")
);

// Check if has API keys configured
const hasApiKeys = computed(() => {
  return !!(
    form.apiKey ||
    form.accessToken ||
    form.blinkApiKey ||
    form.nwcConnectionString
  );
});

// State
const selectedProvider = ref<LightningProvider>("lnbits");
const testing = ref(false);
const saving = ref(false);
const checkingAlby = ref(false);
const albyAvailable = ref(false);
const showTestResult = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

// Form
const form = reactive({
  nodeUrl: "",
  apiKey: "",
  accessToken: "",
  blinkApiKey: "",
  nwcConnectionString: "",
  lightningAddress: "",
  bolt12Offer: "",
});

// Computed
const settings = computed(() => lightning.settings.value);
const isConnected = computed(() => lightning.isConnected.value);

// Navigation
const goToSecurity = () => {
  router.push("/settings/general?tab=security");
};

// Providers
const providers = [
  {
    id: "lnbits" as LightningProvider,
    name: "LNbits",
    icon: "i-heroicons-bolt",
    description: t("settings.lightning.lnbitsDescription"),
  },
  {
    id: "alby-hub" as LightningProvider,
    name: "Alby Hub",
    icon: "i-heroicons-server-stack",
    description: t("settings.lightning.albyHubDescription"),
  },
  {
    id: "blink" as LightningProvider,
    name: "Blink",
    icon: "i-heroicons-sparkles",
    description: t("settings.lightning.blinkDescription"),
  },
  {
    id: "alby" as LightningProvider,
    name: "Alby (WebLN)",
    icon: "i-heroicons-puzzle-piece",
    description: t("settings.lightning.albyDescription"),
  },
  {
    id: "nwc" as LightningProvider,
    name: "NWC",
    icon: "i-heroicons-link",
    description: t("settings.lightning.nwcDescription"),
  },
  {
    id: "lnurl" as LightningProvider,
    name: "Lightning Address",
    icon: "i-heroicons-at-symbol",
    description: t("settings.lightning.lnurlDescription"),
  },
];

// Supported LNURL Wallets
const supportedLNURLWallets = [
  { name: "Wallet of Satoshi", icon: "⚡" },
  { name: "Blink", icon: "💫" },
  { name: "Alby", icon: "🐝" },
  { name: "Strike", icon: "⚡" },
  { name: "Phoenix", icon: "🔥" },
  { name: "Zeus", icon: "⚡" },
  { name: "Stacker News", icon: "📰" },
  { name: "Primal", icon: "🦣" },
];

// Methods
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const loadSettings = () => {
  if (settings.value) {
    selectedProvider.value = settings.value.provider || "lnbits";
    form.nodeUrl = settings.value.nodeUrl || "";
    form.apiKey = settings.value.apiKey || "";
    form.accessToken = settings.value.accessToken || "";
    form.blinkApiKey = settings.value.blinkApiKey || "";
    form.nwcConnectionString = settings.value.nwcConnectionString || "";
    form.lightningAddress = settings.value.lightningAddress || "";
    form.bolt12Offer = settings.value.bolt12Offer || "";
  }
};

const checkAlbyExtension = async () => {
  checkingAlby.value = true;
  try {
    if (typeof window !== "undefined" && "webln" in window) {
      const webln = window as unknown as {
        webln: { enable: () => Promise<void> };
      };
      await webln.webln.enable();
      albyAvailable.value = true;
      toast.add({
        title: t("settings.lightning.albyDetected"),
        color: "green",
      });
    } else {
      albyAvailable.value = false;
      toast.add({
        title: t("settings.lightning.albyNotFound"),
        description: t("settings.lightning.albyInstallHint"),
        color: "red",
      });
    }
  } catch {
    albyAvailable.value = false;
    toast.add({
      title: t("settings.lightning.albyError"),
      color: "red",
    });
  } finally {
    checkingAlby.value = false;
  }
};

const testConnection = async () => {
  if (!canManageLightning.value) {
    toast.add({
      title: t("common.permissionDenied"),
      color: "red",
    });
    return;
  }

  testing.value = true;

  // First save the form values
  await lightning.saveSettings({
    provider: selectedProvider.value,
    nodeUrl: form.nodeUrl,
    apiKey: form.apiKey,
    accessToken: form.accessToken,
    blinkApiKey: form.blinkApiKey,
    nwcConnectionString: form.nwcConnectionString,
    lightningAddress: form.lightningAddress,
    bolt12Offer: form.bolt12Offer,
  });

  // Then test
  const result = await lightning.testConnection();
  testResult.value = result;
  showTestResult.value = true;
  testing.value = false;
};

const saveConfiguration = async () => {
  if (!canManageLightning.value) {
    toast.add({
      title: t("common.permissionDenied"),
      color: "red",
    });
    return;
  }

  saving.value = true;

  const success = await lightning.updateConfig({
    provider: selectedProvider.value,
    nodeUrl: form.nodeUrl,
    apiKey: form.apiKey,
    accessToken: form.accessToken,
    blinkApiKey: form.blinkApiKey,
    nwcConnectionString: form.nwcConnectionString,
    lightningAddress: form.lightningAddress,
    bolt12Offer: form.bolt12Offer,
  });

  if (success) {
    toast.add({
      title: t("settings.lightning.saveSuccess"),
      icon: "i-heroicons-check-circle",
      color: "green",
    });
  } else {
    toast.add({
      title: t("settings.lightning.saveFailed"),
      description: lightning.error.value || "",
      color: "red",
    });
  }

  saving.value = false;
};

const resetForm = () => {
  loadSettings();
};

// Initialize
onMounted(async () => {
  await lightning.loadSettings(); // Wait for settings to load (including sensitive keys)
  loadSettings(); // Now populate form with loaded settings
});

// Watch for settings changes
watch(
  settings,
  () => {
    loadSettings();
  },
  { deep: true }
);
</script>
