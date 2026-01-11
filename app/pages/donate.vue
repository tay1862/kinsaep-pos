<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900"
  >
    <div class="container mx-auto px-4 py-12 max-w-2xl">
      <!-- Header -->
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold text-white mb-2">
          {{ t("donate.title", "Support the Developer") }}
        </h1>
        <p class="text-gray-400">
          {{
            t("donate.subtitle", "Help keep bnos.space free and open source")
          }}
        </p>
      </div>

      <!-- Developer Profile Card -->
      <div
        class="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 mb-8 shadow-2xl"
      >
        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <Icon
            name="i-heroicons-arrow-path"
            class="animate-spin text-3xl text-purple-400"
          />
        </div>

        <!-- Profile Info -->
        <div v-else class="flex flex-col sm:flex-row items-center gap-6">
          <!-- Avatar -->
          <div class="relative">
            <div
              class="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-1"
            >
              <img
                v-if="profile?.picture"
                :src="profile.picture"
                :alt="profile.name || 'Developer'"
                class="w-full h-full rounded-full object-cover"
              />
              <div
                v-else
                class="w-full h-full rounded-full bg-gray-800 flex items-center justify-center"
              >
                <Icon name="i-heroicons-user" class="text-3xl text-gray-500" />
              </div>
            </div>
            <!-- Verified Badge -->
            <div
              class="absolute -bottom-1 -right-1 w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center"
            >
              <Icon name="i-heroicons-bolt" class="text-white text-sm" />
            </div>
          </div>

          <!-- Info -->
          <div class="text-center sm:text-left flex-1">
            <h2 class="text-xl font-bold text-white">
              {{ profile?.display_name || profile?.name || "Developer" }}
            </h2>
            <p v-if="profile?.nip05" class="text-purple-400 text-sm">
              {{ profile.nip05 }}
            </p>
            <p
              v-if="profile?.about"
              class="text-gray-400 text-sm mt-2 line-clamp-2"
            >
              {{ profile.about }}
            </p>

            <!-- Lightning Address Badge -->
            <div
              v-if="lightningAddress"
              class="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full"
            >
              <Icon name="i-heroicons-bolt" class="text-amber-400" />
              <span class="text-amber-300 text-sm font-mono">{{
                lightningAddress
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Donation Options Tabs -->
      <UTabs v-model="activeTab" :items="tabs" class="mb-6" />

      <!-- Lightning Payment -->
      <div
        v-if="activeTab === 'lightning'"
        class="bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl rounded-2xl border border-amber-500/30 p-6"
      >
        <div class="text-center">
          <div class="flex items-center justify-center gap-2 mb-4">
            <Icon name="i-heroicons-bolt" class="text-2xl text-amber-400" />
            <h3 class="text-lg font-semibold text-white">
              {{ t("donate.lightning", "Bitcoin Lightning") }}
            </h3>
          </div>

          <!-- QR Code -->
          <div class="bg-white p-4 rounded-xl inline-block mb-4 shadow-lg">
            <QRCodeVue
              v-if="lightningAddress"
              :value="`lightning:${lightningAddress}`"
              :size="200"
              level="M"
            />
            <div
              v-else
              class="w-[200px] h-[200px] flex items-center justify-center text-gray-400"
            >
              {{ t("donate.noLightning", "No Lightning address") }}
            </div>
          </div>

          <!-- Address Display -->
          <div class="flex items-center justify-center gap-2 mb-4">
            <code
              class="text-amber-300 text-sm bg-gray-800/50 px-3 py-2 rounded-lg"
            >
              {{ lightningAddress || "Loading..." }}
            </code>
            <UButton
              color="amber"
              variant="ghost"
              icon="i-heroicons-clipboard-document"
              size="sm"
              @click="copyToClipboard(lightningAddress)"
            />
          </div>

          <p class="text-gray-400 text-sm">
            {{
              t("donate.lightningDesc", "Scan with any Lightning wallet or click to copy")
            }}
          </p>
        </div>
      </div>

      <!-- Bank QR Payment -->
      <div
        v-if="activeTab === 'bank'"
        class="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 backdrop-blur-xl rounded-2xl border border-blue-500/30 p-6"
      >
        <div class="text-center">
          <div class="flex items-center justify-center gap-2 mb-4">
            <Icon
              name="i-heroicons-building-library"
              class="text-2xl text-blue-400"
            />
            <h3 class="text-lg font-semibold text-white">
              {{ t("donate.bank", "Bank Transfer (BCEL)") }}
            </h3>
          </div>

          <!-- Bank QR Placeholder -->
          <div class="bg-white p-4 rounded-xl inline-block mb-4 shadow-lg">
            <!-- Replace with actual BCEL QR image -->
            <div
              class="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 rounded-lg"
            >
              <div class="text-center text-gray-500">
                <Icon name="i-heroicons-qr-code" class="text-5xl mb-2" />
                <p class="text-xs">BCEL QR</p>
                <p class="text-xs text-gray-400">Coming Soon</p>
              </div>
            </div>
          </div>

          <!-- Bank Info -->
          <div class="space-y-2 text-sm">
            <p class="text-gray-300">
              <span class="text-gray-500"
                >{{ t("donate.bankName", "Bank") }}:</span
              >
              BCEL (Banque pour le Commerce Extérieur Lao)
            </p>
            <p class="text-gray-400">
              {{
                t("donate.bankDesc", "Scan with BCEL One or any Lao banking app")
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- Thank You Message -->
      <div class="mt-8 text-center">
        <p class="text-gray-500 text-sm">
          {{
            t("donate.thanks", "Thank you for supporting open source software! ❤️")
          }}
        </p>
      </div>

      <!-- Back Button -->
      <div class="mt-8 text-center">
        <UButton
          color="gray"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          to="/"
        >
          {{ t("common.back", "Back") }}
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import QRCodeVue from "qrcode.vue";
import { nip19 } from "nostr-tools";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// Developer's npub
const DEVELOPER_NPUB =
  "npub1e65vutc5cfgutyvjetu5wp3ael48asklchtrut8m2svtt4lxdp4sruf0pk";

useHead({
  title: "Donate",
});

const { t } = useI18n();
const toast = useToast();
const relay = useNostrRelay();

// State
const isLoading = ref(true);
const profile = ref<{
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  lud16?: string;
  lud06?: string;
} | null>(null);

const activeTab = ref("lightning");

const tabs = [
  { key: "lightning", label: "⚡ Lightning", icon: "i-heroicons-bolt" },
  {
    key: "bank",
    label: "🏦 Bank (BCEL)",
    icon: "i-heroicons-building-library",
  },
];

// Decode npub to hex
const pubkeyHex = computed(() => {
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

// Extract lightning address
const lightningAddress = computed(() => {
  return profile.value?.lud16 || null;
});

// Fetch profile from Nostr
async function fetchProfile() {
  if (!pubkeyHex.value) {
    isLoading.value = false;
    return;
  }

  try {
    const events = await relay.queryEvents({
      kinds: [NOSTR_KINDS.PROFILE],
      authors: [pubkeyHex.value],
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

// Copy to clipboard
async function copyToClipboard(text: string | null) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.add({
      title: t("common.copied", "Copied!"),
      icon: "i-heroicons-clipboard-document-check",
      color: "green",
    });
  } catch {
    toast.add({
      title: t("common.error", "Failed to copy"),
      color: "red",
    });
  }
}

// Fetch on mount
onMounted(() => {
  fetchProfile();
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
