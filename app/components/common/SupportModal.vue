<!-- components/common/SupportModal.vue -->
<!-- Enhanced with Nostr profile fetch and donation notifications -->
<script setup lang="ts">
import QRCodeVue from "qrcode.vue";
import { nip19 } from "nostr-tools";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

const config = useRuntimeConfig();
const { t } = useI18n();
const toast = useToast();
const relay = useNostrRelay();
const nostrData = useNostrData();

const open = defineModel<boolean>("open", { default: false });

// Developer's npub - hardcoded
const DEVELOPER_NPUB =
  "npub1e65vutc5cfgutyvjetu5wp3ael48asklchtrut8m2svtt4lxdp4sruf0pk";

// State
const isLoading = ref(true);
const selectedAmount = ref<number | null>(null);
const customAmount = ref<string>(""); // Custom amount input
const postToNostr = ref(true); // Checkbox for posting to Nostr
const donateMessage = ref("");
const isPosting = ref(false);
const activeTab = ref("lightning");

const profile = ref<{
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  lud16?: string;
  lud06?: string;
} | null>(null);

// Decode npub to hex
const developerPubkey = computed(() => {
  try {
    const decoded = nip19.decode(DEVELOPER_NPUB);
    if (decoded.type === "npub") {
      return decoded.data as string;
    }
  } catch (e) {
    console.error("Failed to decode npub:", e);
  }
  return null;
});

// Get developer Lightning address from profile
const lightningAddress = computed(() => {
  return profile.value?.lud16 || config.public?.developerLud16 || "";
});

const developerName = computed(() => {
  return (
    profile.value?.display_name ||
    profile.value?.name ||
    config.public?.developerName ||
    "BitSpace Developer"
  );
});

// Fetch profile from Nostr
async function fetchProfile() {
  if (!developerPubkey.value) {
    isLoading.value = false;
    return;
  }

  try {
    const events = await relay.queryEvents({
      kinds: [NOSTR_KINDS.PROFILE],
      authors: [developerPubkey.value],
      limit: 1,
    });

    if (events.length > 0 && events[0]) {
      const content = JSON.parse(events[0].content);
      profile.value = content;
    }
  } catch (e) {
    console.error("Failed to fetch profile:", e);
  } finally {
    isLoading.value = false;
  }
}

// Support options
const supportOptions = [
  { amount: "1,000", sats: 1000, label: "☕ Coffee" },
  { amount: "5,000", sats: 5000, label: "🍕 Pizza" },
  { amount: "10,000", sats: 10000, label: "🍺 Beer" },
  { amount: "50,000", sats: 50000, label: "🎉 Celebrate" },
];

const tabs = [
  { value: "lightning", label: "⚡ Lightning" },
  { value: "bank", label: "🏦 Fiat Money" },
];

// Copy address to clipboard
const copyAddress = async () => {
  if (!lightningAddress.value) return;

  try {
    await navigator.clipboard.writeText(lightningAddress.value);
    toast.add({
      title: t("common.support.copied", "Copied!"),
      description:
        t("common.support.addressCopied", "Lightning address copied to clipboard"),
      icon: "i-heroicons-clipboard-document-check",
      color: "green",
    });
  } catch {
    toast.add({
      title: t("common.error", "Error"),
      description: t("common.support.copyFailed", "Failed to copy"),
      icon: "i-heroicons-exclamation-circle",
      color: "red",
    });
  }
};

// Open Lightning wallet
const openWallet = () => {
  if (!lightningAddress.value) return;
  window.open(`lightning:${lightningAddress.value}`, "_blank");
};

// Post donation notification to Nostr
async function postDonationToNostr() {
  if (!postToNostr.value || !developerPubkey.value) return;

  isPosting.value = true;

  try {
    const amount = selectedAmount.value
      ? `${selectedAmount.value.toLocaleString()} sats`
      : "some sats";
    const message =
      donateMessage.value.trim() || "Thank you for building great software! 🙏";

    // Create a human-readable note (standard Nostr format)
    const developerHandle = profile.value?.nip05 || developerName.value;
    const content = `⚡ Just supported ${developerHandle} with ${amount}!

💬 "${message}"

---
🔗 bnos.space - Open Source Point of Sale
#BitSpacePOS #OpenSource #Lightning #Bitcoin #BitSpace`;

    const tags = [
      ["p", developerPubkey.value], // Tag the developer
      ["t", "BitSpacePOS"],
      ["t", "OpenSource"],
      ["t", "Lightning"],
      ["t", "Bitcoin"],
      ["t", "BitSpace"],
    ];

    const event = await nostrData.publishEvent(1, content, tags, false);

    if (event) {
      toast.add({
        title: t("common.support.postedToNostr", "Posted to Nostr!"),
        description:
          t("common.support.thankYouShared", "Your support message was shared"),
        icon: "i-heroicons-megaphone",
        color: "green",
      });
    }
  } catch (e) {
    console.error("Failed to post to Nostr:", e);
    // Silent fail - don't block the donation flow
  } finally {
    isPosting.value = false;
  }
}

// Lightning Address QR value (just the address - fallback)
const lightningQrValue = computed(() => {
  // If we have a dynamic invoice, use that
  if (dynamicInvoice.value) {
    return dynamicInvoice.value;
  }
  // Fallback to just the address
  return lightningAddress.value || "";
});

// Dynamic invoice state
const dynamicInvoice = ref<string | null>(null);
const isGeneratingInvoice = ref(false);
const invoiceError = ref<string | null>(null);

// Lightning URI for opening wallet (includes amount if selected)
const lightningUri = computed(() => {
  // If we have a dynamic invoice, use that
  if (dynamicInvoice.value) {
    return `lightning:${dynamicInvoice.value}`;
  }
  if (!lightningAddress.value) return "";
  return `lightning:${lightningAddress.value}`;
});

// Fetch BOLT11 invoice from Lightning Address (LNURL-pay)
async function fetchInvoiceFromLightningAddress(amountSats: number) {
  if (!lightningAddress.value) return;

  isGeneratingInvoice.value = true;
  invoiceError.value = null;
  dynamicInvoice.value = null;

  try {
    // Parse Lightning Address (user@domain.com -> https://domain.com/.well-known/lnurlp/user)
    const [user, domain] = lightningAddress.value.split("@");
    if (!user || !domain) {
      throw new Error("Invalid Lightning Address format");
    }

    // Step 1: Get LNURL-pay metadata
    const lnurlEndpoint = `https://${domain}/.well-known/lnurlp/${user}`;
    const metaResponse = await $fetch<{
      callback: string;
      minSendable: number;
      maxSendable: number;
      metadata: string;
      tag: string;
    }>(lnurlEndpoint);

    if (metaResponse.tag !== "payRequest") {
      throw new Error("Invalid LNURL-pay response");
    }

    // Convert sats to millisats
    const amountMsats = amountSats * 1000;

    // Check min/max
    if (
      amountMsats < metaResponse.minSendable ||
      amountMsats > metaResponse.maxSendable
    ) {
      throw new Error(
        `Amount must be between ${metaResponse.minSendable / 1000} and ${
          metaResponse.maxSendable / 1000
        } sats`
      );
    }

    // Step 2: Request invoice with amount
    const invoiceUrl = `${metaResponse.callback}${
      metaResponse.callback.includes("?") ? "&" : "?"
    }amount=${amountMsats}`;
    const invoiceResponse = await $fetch<{
      pr: string;
      routes?: unknown[];
    }>(invoiceUrl);

    if (!invoiceResponse.pr) {
      throw new Error("No invoice returned");
    }

    dynamicInvoice.value = invoiceResponse.pr;
    console.log(
      "[Support] Generated invoice:",
      invoiceResponse.pr.slice(0, 50) + "..."
    );
  } catch (e) {
    console.error("[Support] Failed to generate invoice:", e);
    invoiceError.value =
      e instanceof Error ? e.message : "Failed to generate invoice";
    // Fall back to static address
    dynamicInvoice.value = null;
  } finally {
    isGeneratingInvoice.value = false;
  }
}

// Select amount and generate dynamic invoice
async function selectAmount(sats: number) {
  selectedAmount.value = sats;
  await fetchInvoiceFromLightningAddress(sats);
}

// Open wallet with current amount
function openWalletWithAmount() {
  if (lightningUri.value) {
    window.open(lightningUri.value, "_blank");
  }
  // Post to Nostr if checked
  if (postToNostr.value) {
    setTimeout(() => {
      postDonationToNostr();
    }, 2000);
  }
}

// Copy lightning URI
async function copyLightningUri() {
  if (!lightningUri.value) return;
  try {
    await navigator.clipboard.writeText(lightningUri.value);
    toast.add({
      title: t("common.support.copied", "Copied!"),
      description: "Lightning link copied to clipboard",
      icon: "i-heroicons-clipboard-document-check",
      color: "green",
    });
  } catch {
    toast.add({
      title: t("common.error", "Error"),
      description: t("common.support.copyFailed", "Failed to copy"),
      color: "red",
    });
  }
}

// Fetch on open
watch(open, (isOpen) => {
  if (isOpen && !profile.value) {
    fetchProfile();
  }
});
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <!-- Developer Avatar -->
            <div class="relative">
              <div
                class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-0.5"
              >
                <img
                  v-if="profile?.picture"
                  :src="profile.picture"
                  :alt="developerName"
                  class="w-full h-full rounded-full object-cover"
                />
                <div
                  v-else
                  class="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-2xl"
                >
                  ☕
                </div>
              </div>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t("common.support.title", "Support Development") }}
              </h3>
              <p class="text-sm text-gray-500">
                {{ developerName }}
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-5 overflow-y-auto max-h-[60vh]">
          <!-- Loading -->
          <div v-if="isLoading" class="flex items-center justify-center py-4">
            <Icon
              name="i-heroicons-arrow-path"
              class="animate-spin text-2xl text-amber-400"
            />
          </div>

          <template v-else>
            <!-- Thank You Message -->
            <div class="text-center">
              <p class="text-gray-600 dark:text-gray-400 text-sm">
                {{
                  t("common.support.message", "Thank you for using bnos.space! Your support helps us build better software.")
                }}
              </p>
            </div>

            <!-- Tabs -->
            <UTabs v-model="activeTab" :items="tabs" />

            <!-- Lightning Tab -->
            <div v-if="activeTab === 'lightning'" class="space-y-4">
              <!-- Support Options -->
              <div class="grid grid-cols-2 gap-3">
                <div
                  v-for="opt in supportOptions"
                  :key="opt.sats"
                  :class="[
                    'p-4 border rounded-xl text-center cursor-pointer transition-all',
                    selectedAmount === opt.sats
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20',
                  ]"
                  @click="selectAmount(opt.sats)"
                >
                  <p class="text-2xl mb-1">{{ opt.label.split(" ")[0] }}</p>
                  <p class="font-semibold text-gray-900 dark:text-white">
                    {{ opt.amount }} sats
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ opt.label.split(" ")[1] }}
                  </p>
                </div>
              </div>

              <!-- Custom Amount Input -->
              <div class="flex items-center gap-2 mt-2">
                <UInput
                  v-model="customAmount"
                  type="number"
                  placeholder="Custom sats"
                  size="sm"
                  class="flex-1"
                />
                <UButton
                  color="amber"
                  variant="soft"
                  size="sm"
                  :disabled="!customAmount || parseInt(customAmount) < 1"
                  @click="selectAmount(parseInt(customAmount))"
                >
                  ⚡ Generate
                </UButton>
              </div>

              <!-- QR Code with Amount -->
              <div
                v-if="lightningAddress"
                class="flex flex-col items-center gap-3"
              >
                <!-- QR Container with loading overlay -->
                <div class="relative bg-white p-3 rounded-xl shadow-md">
                  <!-- Loading overlay -->
                  <div
                    v-if="isGeneratingInvoice"
                    class="absolute inset-0 bg-white/90 flex items-center justify-center rounded-xl z-10"
                  >
                    <div class="text-center">
                      <Icon
                        name="i-heroicons-arrow-path"
                        class="animate-spin text-2xl text-amber-500"
                      />
                      <p class="text-xs text-gray-500 mt-1">
                        Generating invoice...
                      </p>
                    </div>
                  </div>
                  <QRCodeVue :value="lightningQrValue" :size="150" level="M" />
                </div>

                <!-- Invoice type indicator -->
                <div
                  v-if="dynamicInvoice && selectedAmount"
                  class="flex items-center gap-1 text-green-600 text-xs"
                >
                  <Icon name="i-heroicons-check-circle" size="14" />
                  <span
                    >BOLT11 Invoice ({{
                      selectedAmount.toLocaleString()
                    }}
                    sats)</span
                  >
                </div>
                <p
                  v-else-if="selectedAmount && !isGeneratingInvoice"
                  class="text-amber-500 font-semibold text-sm"
                >
                  ⚡ {{ selectedAmount.toLocaleString() }} sats
                </p>
                <p v-else class="text-gray-400 text-xs">
                  Select amount to generate invoice
                </p>

                <!-- Error message -->
                <p v-if="invoiceError" class="text-red-500 text-xs">
                  {{ invoiceError }}
                </p>
                <!-- Action buttons -->
                <div class="flex gap-2">
                  <UButton
                    color="amber"
                    variant="soft"
                    icon="i-heroicons-clipboard-document"
                    size="sm"
                    @click="copyLightningUri"
                  >
                    Copy
                  </UButton>
                  <UButton
                    color="amber"
                    variant="solid"
                    icon="emojione-v1:lightning-mood"
                    size="sm"
                    @click="openWalletWithAmount"
                  >
                    Open Wallet
                  </UButton>
                </div>
              </div>

              <!-- Lightning Address -->
              <div v-if="lightningAddress" class="space-y-3">
                <p class="text-sm text-gray-500 text-center">
                  {{
                    t("common.support.orSendDirectly", "Or send directly to:")
                  }}
                </p>
                <div
                  class="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"
                >
                  <Icon
                    name="emojione-v1:lightning-mood"
                    class="text-xl text-amber-500"
                  />
                  <code
                    class="flex-1 text-sm text-gray-900 dark:text-white truncate"
                  >
                    {{ lightningAddress }}
                  </code>
                  <UButton
                    color="gray"
                    variant="ghost"
                    size="sm"
                    icon="i-heroicons-clipboard-document"
                    @click="copyAddress"
                  />
                </div>
              </div>

              <!-- No Address Configured -->
              <div v-else class="text-center py-4">
                <Icon
                  name="i-heroicons-exclamation-circle"
                  class="text-4xl text-gray-400 mb-2"
                />
                <p class="text-sm text-gray-500">
                  {{
                    t("common.support.noAddressConfigured", "Lightning address not configured")
                  }}
                </p>
              </div>
            </div>

            <!-- Bank Tab -->
            <div v-if="activeTab === 'bank'" class="space-y-4">
              <div class="text-center py-6">
                <div class="bg-white p-4 rounded-xl inline-block shadow-md">
                  <div
                    class="w-[150px] h-[150px] flex items-center justify-center bg-gray-100 rounded-lg"
                  >
                    <div class="text-center text-gray-500">
                      <img src="/bank-qr.jpeg" alt="" />
                    </div>
                  </div>
                </div>
                <p class="text-sm text-gray-500 mt-3">
                  {{
                    t("common.support.bankDesc", "Scan with BCEL One or any Lao banking app")
                  }}
                </p>
              </div>
            </div>

            <!-- Post to Nostr Option -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div class="flex items-center gap-3">
                <UCheckbox v-model="postToNostr" name="postToNostr" />
                <label
                  for="postToNostr"
                  class="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
                >
                  {{
                    t("common.support.postToNostr", "Share my support on Nostr")
                  }}
                  <span class="text-gray-400"
                    >({{
                      t("common.support.notifyDeveloper", "notifies developer")
                    }})</span
                  >
                </label>
              </div>

              <!-- Optional Message -->
              <div v-if="postToNostr" class="mt-3">
                <UInput
                  v-model="donateMessage"
                  :placeholder="
                    t('common.support.messagePlaceholder', 'Add a message (optional)')
                  "
                  size="sm"
                  class="w-full"
                />
              </div>
            </div>
          </template>
        </div>

        <template #footer>
          <div class="flex justify-between items-center">
            <p class="text-xs text-gray-500">
              ⚡
              {{
                t("common.support.lightningTip", "Powered by Lightning Network")
              }}
            </p>
            <div class="flex gap-2">
              <UButton
                color="amber"
                variant="soft"
                icon="emojione-v1:lightning-mood"
                :loading="isPosting"
                @click="openWallet"
              >
                {{ t("common.support.openWallet", "Open Wallet") }}
              </UButton>
              <UButton
                color="gray"
                variant="outline"
                :label="t('common.close', 'Close')"
                @click="open = false"
              />
            </div>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
