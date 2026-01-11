<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <CommonPageHeader
      :title="$t('settings.crypto.title')"
      :subtitle="$t('settings.crypto.subtitle')"
    >
      <template #actions>
        <NuxtLinkLocale
          to="/settings"
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-2"
        >
          <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
          {{ $t("common.back") }}
        </NuxtLinkLocale>
      </template>
    </CommonPageHeader>

    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <!-- Connection Status Card -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'w-3 h-3 rounded-full',
                  isConfigured ? 'bg-green-500' : 'bg-gray-400',
                ]"
              />
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{ $t("settings.crypto.connectionStatus") }}
                </h3>
                <p class="text-sm text-gray-500">
                  {{
                    isConfigured
                      ? $t("settings.crypto.configured")
                      : $t("settings.crypto.notConfigured")
                  }}
                </p>
              </div>
            </div>
            <UButton
              v-if="
                crypto.settings.value.bitcoinEnabled ||
                crypto.settings.value.usdtEnabled
              "
              color="primary"
              variant="soft"
              :loading="isTesting"
              @click="testConnection"
            >
              {{ $t("settings.crypto.testConnection") }}
            </UButton>
          </div>
        </template>
        <div
          v-if="crypto.settings.value.lastTestedAt"
          class="text-sm text-gray-500 dark:text-gray-400"
        >
          {{ $t("settings.crypto.lastTested") }}:
          {{ formatDate(crypto.settings.value.lastTestedAt) }}
        </div>
      </UCard>

      <!-- Bitcoin On-Chain Section -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-2xl">₿</span>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ $t("settings.crypto.bitcoin.title") }}
                </h3>
                <p class="text-sm text-gray-500">
                  {{ $t("settings.crypto.bitcoin.description") }}
                </p>
              </div>
            </div>
            <USwitch
              v-model="form.bitcoinEnabled"
              @update:modelValue="onBitcoinToggle"
            />
          </div>
        </template>

        <div v-if="form.bitcoinEnabled" class="space-y-4">
          <!-- Provider Selection -->
          <UFormField :label="$t('settings.crypto.bitcoin.provider')">
            <USelectMenu
              v-model="form.bitcoinProvider"
              :items="bitcoinProviders"
              value-key="id"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <!-- BTCPay Server Configuration -->
          <template v-if="form.bitcoinProvider === 'btcpay'">
            <UAlert
              icon="i-heroicons-information-circle"
              color="blue"
              variant="subtle"
              title="BTCPay Server"
              description="Self-hosted Bitcoin payment processor. Auto-generates unique addresses per payment."
            />

            <UFormField label="BTCPay Server URL" required>
              <UInput
                v-model="form.btcpayServerUrl"
                placeholder="https://your-btcpay.example.com"
                class="w-full"
                icon="i-heroicons-globe-alt"
              />
              <template #hint>
                The URL of your BTCPay Server instance
              </template>
            </UFormField>

            <UFormField label="API Key" required>
              <UInput
                v-model="form.btcpayApiKey"
                type="password"
                placeholder="BTCPay API Key"
                icon="i-heroicons-key"
                class="w-full"
              />
              <template #hint>
                Generate from BTCPay Server → Account → API Keys
              </template>
            </UFormField>

            <UFormField label="Store ID" required>
              <UInput
                v-model="form.btcpayStoreId"
                placeholder="Store ID"
                icon="i-heroicons-building-storefront"
                class="w-full"
              />
              <template #hint>
                Found in your BTCPay Server store settings
              </template>
            </UFormField>
          </template>

          <!-- Blockonomics Configuration -->
          <template v-else-if="form.bitcoinProvider === 'blockonomics'">
            <UAlert
              icon="i-heroicons-information-circle"
              color="purple"
              variant="subtle"
              title="Blockonomics"
              description="Cloud-based Bitcoin payment processor. Uses your xpub for address generation."
            />

            <UFormField label="Blockonomics API Key" required>
              <UInput
                v-model="form.blockonomicsApiKey"
                type="password"
                placeholder="API Key"
                icon="i-heroicons-key"
                class="w-full"
              />
              <template #hint>
                Get your API key from blockonomics.co/merchants
              </template>
            </UFormField>

            <UFormField label="xPub Key" required>
              <UTextarea
                v-model="form.bitcoinXpub"
                placeholder="xpub6..."
                :rows="2"
                class="w-full"
              />
              <template #hint>
                Extended public key from your wallet for address derivation
              </template>
            </UFormField>
          </template>

          <!-- Manual Address Configuration -->
          <template v-else-if="form.bitcoinProvider === 'manual'">
            <UAlert
              icon="i-heroicons-exclamation-triangle"
              color="amber"
              variant="subtle"
              title="Manual Address"
              description="Simple setup - uses a single static address. Less private but easier to configure."
            />

            <UFormField label="Bitcoin Receive Address" required>
              <UInput
                v-model="form.bitcoinAddress"
                placeholder="bc1q... or 1... or 3..."
                icon="i-heroicons-wallet"
                class="w-full"
              />
              <template #hint>
                Your Bitcoin address to receive payments. All payments will go
                to this address.
              </template>
            </UFormField>

            <UFormField label="xPub Key (Optional)">
              <UTextarea
                v-model="form.bitcoinXpub"
                placeholder="xpub6... (optional for unique addresses)"
                :rows="2"
                class="w-full"
              />
              <template #hint>
                If provided, unique addresses will be generated for each payment
              </template>
            </UFormField>

            <UAlert
              icon="i-heroicons-information-circle"
              color="green"
              variant="subtle"
              title="Auto-Detection Enabled"
              description="Payments are automatically detected via Mempool.space (free). You can also confirm manually if needed."
            />
          </template>

          <!-- Confirmation Requirements -->
          <UFormField :label="$t('settings.crypto.bitcoin.confirmations')">
            <USelectMenu
              v-model="form.bitcoinRequiredConfirmations"
              :items="confirmationOptions"
              value-key="value"
              class="w-full"
            />
            <template #hint>
              {{ $t("settings.crypto.bitcoin.confirmationsHint") }}
            </template>
          </UFormField>
        </div>
      </UCard>

      <!-- USDT Stablecoin Section -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-2xl">💎</span>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ $t("settings.crypto.usdt.title") }}
                </h3>
                <p class="text-sm text-gray-500">
                  {{ $t("settings.crypto.usdt.description") }}
                </p>
              </div>
            </div>
            <USwitch
              v-model="form.usdtEnabled"
              @update:modelValue="onUsdtToggle"
            />
          </div>
        </template>

        <div v-if="form.usdtEnabled" class="space-y-4">
          <!-- Default Network -->
          <UFormField :label="$t('settings.crypto.usdt.defaultNetwork')">
            <USelectMenu
              v-model="form.usdtDefaultNetwork"
              :items="usdtNetworks"
              value-key="id"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <!-- Network Addresses -->
          <div class="space-y-3">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ $t("settings.crypto.usdt.addresses") }}
            </p>

            <!-- Tron Address -->
            <UFormField label="Tron (TRC-20)">
              <UInput
                v-model="form.usdtAddresses.tron"
                placeholder="T..."
                icon="i-heroicons-wallet"
                class="w-full"
              />
            </UFormField>

            <!-- Polygon Address -->
            <UFormField label="Polygon">
              <UInput
                v-model="form.usdtAddresses.polygon"
                placeholder="0x..."
                icon="i-heroicons-wallet"
                class="w-full"
              />
            </UFormField>

            <!-- Ethereum Address -->
            <UFormField label="Ethereum (ERC-20)">
              <UInput
                v-model="form.usdtAddresses.ethereum"
                placeholder="0x..."
                icon="i-heroicons-wallet"
                class="w-full"
              />
            </UFormField>

            <!-- Arbitrum Address -->
            <UFormField label="Arbitrum">
              <UInput
                v-model="form.usdtAddresses.arbitrum"
                placeholder="0x..."
                icon="i-heroicons-wallet"
                class="w-full"
              />
            </UFormField>
          </div>

          <UAlert
            icon="i-heroicons-exclamation-triangle"
            color="amber"
            variant="subtle"
            :title="$t('settings.crypto.usdt.warning')"
            :description="$t('settings.crypto.usdt.warningDescription')"
          />
        </div>
      </UCard>

      <!-- Save Button -->
      <div class="flex justify-end gap-3">
        <UButton
          color="neutral"
          variant="outline"
          @click="navigateTo('/settings')"
        >
          {{ $t("common.cancel") }}
        </UButton>
        <UButton color="primary" :loading="isSaving" @click="saveSettings">
          {{ $t("common.save") }}
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { USDTNetwork, CryptoProvider } from "~/types";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const toast = useToast();
const crypto = useCrypto();

// State
const isSaving = ref(false);
const isTesting = ref(false);

// Form data
const form = reactive({
  // Bitcoin
  bitcoinEnabled: false,
  bitcoinProvider: "btcpay" as CryptoProvider,
  // BTCPay
  btcpayServerUrl: "",
  btcpayApiKey: "",
  btcpayStoreId: "",
  // Blockonomics
  blockonomicsApiKey: "",
  // Manual / shared
  bitcoinAddress: "",
  bitcoinXpub: "",
  bitcoinRequiredConfirmations: 1,
  // USDT
  usdtEnabled: false,
  usdtDefaultNetwork: "tron" as USDTNetwork,
  usdtAddresses: {
    tron: "",
    polygon: "",
    ethereum: "",
    arbitrum: "",
  },
  usdtRequiredConfirmations: 1,
});

// Options
const bitcoinProviders = [
  { id: "btcpay", label: "BTCPay Server", icon: "🔷" },
  { id: "blockonomics", label: "Blockonomics", icon: "📊" },
  { id: "manual", label: "Manual", icon: "✋" },
];

const usdtNetworks = [
  { id: "tron", label: "Tron (TRC-20)", icon: "💎", fee: "~$0.10" },
  { id: "polygon", label: "Polygon", icon: "🟣", fee: "~$0.01" },
  { id: "ethereum", label: "Ethereum (ERC-20)", icon: "⟠", fee: "~$5-50" },
  { id: "arbitrum", label: "Arbitrum", icon: "🔵", fee: "~$0.10" },
];

const confirmationOptions = [
  { value: 1, label: "1 confirmation (~10 min)" },
  { value: 3, label: "3 confirmations (~30 min)" },
  { value: 6, label: "6 confirmations (~60 min)" },
];

// Computed
const isConfigured = computed(() => {
  return crypto.isBitcoinConfigured.value || crypto.isUSDTConfigured.value;
});

// Methods
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const onBitcoinToggle = (enabled: boolean) => {
  if (!enabled) {
    // Reset bitcoin fields when disabled
    form.btcpayServerUrl = "";
    form.btcpayApiKey = "";
    form.btcpayStoreId = "";
  }
};

const onUsdtToggle = (enabled: boolean) => {
  if (!enabled) {
    // Reset USDT fields when disabled
    form.usdtAddresses = {
      tron: "",
      polygon: "",
      ethereum: "",
      arbitrum: "",
    };
  }
};

const testConnection = async () => {
  isTesting.value = true;

  try {
    if (form.bitcoinEnabled && form.bitcoinProvider === "btcpay") {
      // Save first to make settings available
      await crypto.saveSettings({
        bitcoinEnabled: form.bitcoinEnabled,
        bitcoinProvider: form.bitcoinProvider,
        btcpayServerUrl: form.btcpayServerUrl,
        btcpayApiKey: form.btcpayApiKey,
        btcpayStoreId: form.btcpayStoreId,
      });

      const result = await crypto.testBTCPayConnection();

      if (result.success) {
        toast.add({
          title: t("settings.crypto.testSuccess"),
          description: result.message,
          color: "success",
        });
      } else {
        toast.add({
          title: t("settings.crypto.testFailed"),
          description: result.message,
          color: "error",
        });
      }
    } else {
      toast.add({
        title: t("settings.crypto.noProviderToTest"),
        color: "warning",
      });
    }
  } catch (e) {
    toast.add({
      title: t("settings.crypto.testFailed"),
      description: e instanceof Error ? e.message : "Unknown error",
      color: "error",
    });
  } finally {
    isTesting.value = false;
  }
};

const saveSettings = async () => {
  isSaving.value = true;

  try {
    await crypto.saveSettings({
      // Bitcoin
      bitcoinEnabled: form.bitcoinEnabled,
      bitcoinProvider: form.bitcoinProvider,
      // BTCPay
      btcpayServerUrl: form.btcpayServerUrl,
      btcpayApiKey: form.btcpayApiKey,
      btcpayStoreId: form.btcpayStoreId,
      // Blockonomics
      blockonomicsApiKey: form.blockonomicsApiKey,
      // Manual / shared
      bitcoinAddress: form.bitcoinAddress,
      bitcoinXpub: form.bitcoinXpub,
      bitcoinRequiredConfirmations: form.bitcoinRequiredConfirmations,
      // USDT
      usdtEnabled: form.usdtEnabled,
      usdtDefaultNetwork: form.usdtDefaultNetwork,
      usdtAddresses: form.usdtAddresses,
      usdtRequiredConfirmations: form.usdtRequiredConfirmations,
      // General
      isConfigured: form.bitcoinEnabled || form.usdtEnabled,
    });

    toast.add({
      title: t("settings.crypto.saved"),
      color: "success",
    });
  } catch (e) {
    toast.add({
      title: t("settings.crypto.saveFailed"),
      description: e instanceof Error ? e.message : "Unknown error",
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
};

// Load settings on mount
onMounted(async () => {
  await crypto.loadSettings();

  const settings = crypto.settings.value;
  form.bitcoinEnabled = settings.bitcoinEnabled;
  form.bitcoinProvider = settings.bitcoinProvider;
  // BTCPay
  form.btcpayServerUrl = settings.btcpayServerUrl || "";
  form.btcpayApiKey = settings.btcpayApiKey || "";
  form.btcpayStoreId = settings.btcpayStoreId || "";
  // Blockonomics
  form.blockonomicsApiKey = settings.blockonomicsApiKey || "";
  // Manual / shared
  form.bitcoinAddress = settings.bitcoinAddress || "";
  form.bitcoinXpub = settings.bitcoinXpub || "";
  form.bitcoinRequiredConfirmations = settings.bitcoinRequiredConfirmations;
  // USDT
  form.usdtEnabled = settings.usdtEnabled;
  form.usdtDefaultNetwork = settings.usdtDefaultNetwork;
  form.usdtAddresses = {
    tron: settings.usdtAddresses.tron || "",
    polygon: settings.usdtAddresses.polygon || "",
    ethereum: settings.usdtAddresses.ethereum || "",
    arbitrum: settings.usdtAddresses.arbitrum || "",
  };
  form.usdtRequiredConfirmations = settings.usdtRequiredConfirmations;
});

// Page title
useHead({
  title: t("settings.crypto.title"),
});
</script>
