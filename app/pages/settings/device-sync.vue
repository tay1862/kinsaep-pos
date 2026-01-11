<!-- ============================================
  📱 DEVICE SYNC SETTINGS PAGE
  Settings page for syncing staff data across devices
============================================ -->

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ t("auth.deviceSync.title") }}
      </h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">
        {{ t("auth.deviceSync.description") }}
      </p>
    </div>

    <!-- Device Info Card -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
            <UIcon :name="deviceIcon" class="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 class="font-semibold">{{ t("auth.deviceSync.currentDevice", "Current Device") }}</h3>
            <p class="text-sm text-gray-500">
              {{ deviceInfo.name }} • {{ deviceInfo.browser }}
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Device ID -->
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              {{ t("auth.deviceSync.deviceId", "Device ID") }}
            </p>
            <p class="font-mono text-sm">{{ deviceInfo.id }}</p>
          </div>
          <UButton variant="ghost" size="sm" icon="i-heroicons-clipboard-document" @click="copyDeviceId" />
        </div>

        <!-- Last Synced -->
        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <UIcon name="i-heroicons-clock" class="w-4 h-4" />
          <span v-if="lastSyncedAt">
            {{ t("auth.deviceSync.lastSynced") }}: {{ formattedLastSync }}
          </span>
          <span v-else>
            {{ t("auth.deviceSync.neverSynced", "Never synced") }}
          </span>
        </div>
      </div>
    </UCard>

    <!-- Company Code Connect Card -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <UIcon name="i-heroicons-building-office-2" class="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 class="font-semibold">{{ t("auth.company.connectTitle", "Connect to Company") }}</h3>
            <p class="text-sm text-gray-500">
              {{ t("auth.company.connectDescription", "Enter company code to sync data") }}
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Show current code if connected -->
        <div v-if="hasCompanyCode"
          class="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-green-700 dark:text-green-300">
                {{ t("auth.company.connected", "Connected to company") }}
              </p>
              <p class="font-mono text-2xl font-bold tracking-widest text-green-800 dark:text-green-200">
                {{ companyCode }}
              </p>
            </div>
            <UIcon name="i-heroicons-check-circle" class="w-8 h-8 text-green-600" />
          </div>
        </div>

        <!-- Enter code if not connected -->
        <div v-else class="space-y-3">
          <UInput v-model="companyCodeInput" placeholder="XXXX-XXXX-XXXX" icon="i-heroicons-key" size="lg"
            maxlength="14" class="w-full text-center font-mono text-xl tracking-widest"
            @input="formatCompanyCodeInput" />
          <UButton block size="lg" color="green" :loading="isConnecting" :disabled="!isValidCompanyCode"
            @click="handleConnectCompany">
            <UIcon name="i-heroicons-link" class="w-5 h-5 mr-2" />
            {{ t("auth.company.connect", "Connect") }}
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Sync Actions Card -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 class="font-semibold">{{ t("auth.deviceSync.syncActions", "Sync Actions") }}</h3>
            <p class="text-sm text-gray-500">
              {{ t("auth.deviceSync.syncDescription", "Manage your data synchronization") }}
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Nsec Input for Sync -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ t("auth.deviceSync.enterNsecToSync", "Enter your nsec to sync") }}
          </label>
          <UInput v-model="syncNsec" type="password" :placeholder="'nsec1...'" icon="i-heroicons-key" size="lg"
            class="w-full" />
          <p class="text-xs text-gray-500">
            {{ t("auth.deviceSync.nsecNote", "Your nsec is used only for this sync and is never stored permanently.")
            }}
          </p>
        </div>

        <!-- Sync Status -->
        <div v-if="syncError" class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
          <div class="flex items-center gap-2 text-red-600 dark:text-red-400">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
            <span>{{ syncError }}</span>
          </div>
        </div>

        <!-- Sync Now -->
        <UButton block size="lg" :loading="isSyncing" :disabled="!canSync" @click="handleSyncNow">
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 mr-2" />
          {{ isSyncing ? t("auth.deviceSync.syncing") : t("auth.deviceSync.syncNow") }}
        </UButton>

        <!-- Link Device QR -->
        <UButton block size="lg" variant="outline" :disabled="!canSync" @click="showLinkModal = true">
          <UIcon name="i-heroicons-qr-code" class="w-5 h-5 mr-2" />
          {{ t("auth.deviceSync.linkDevice") }}
        </UButton>
      </div>
    </UCard>

    <!-- How It Works Card -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">{{ t("auth.deviceSync.howItWorks", "How It Works") }}</h3>
      </template>

      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <div
            class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
            1
          </div>
          <div>
            <p class="font-medium">{{ t("auth.deviceSync.step1Title", "Login with Nostr") }}</p>
            <p class="text-sm text-gray-500">
              {{ t("auth.deviceSync.step1Desc", "Use your nsec or Nostr extension to authenticate") }}
            </p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div
            class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
            2
          </div>
          <div>
            <p class="font-medium">{{ t("auth.deviceSync.step2Title", "Data Syncs via Relays") }}</p>
            <p class="text-sm text-gray-500">
              {{ t("auth.deviceSync.step2Desc", "Your encrypted data is stored on Nostr relays") }}
            </p>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div
            class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
            3
          </div>
          <div>
            <p class="font-medium">{{ t("auth.deviceSync.step3Title", "Access on Any Device") }}</p>
            <p class="text-sm text-gray-500">
              {{ t("auth.deviceSync.step3Desc", "Login on a new device and your data syncs automatically") }}
            </p>
          </div>
        </div>
      </div>
    </UCard>
  </div>

  <!-- Link Device Modal -->
  <UModal v-model:open="showLinkModal">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-qr-code" class="w-5 h-5 text-primary" />
        <span>{{ t("auth.deviceSync.linkDevice") }}</span>
      </div>
    </template>

    <template #body>
      <div class="p-6 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ t("auth.deviceSync.scanQrDescription") }}
        </p>

        <!-- QR Code -->
        <div v-if="linkQrData" class="flex justify-center p-4 bg-white rounded-lg">
          <QrcodeVue :value="linkQrData.data" :size="200" level="M" />
        </div>

        <!-- Expiry Warning -->
        <div v-if="linkQrData" class="flex items-center gap-2 text-sm text-amber-600">
          <UIcon name="i-heroicons-clock" class="w-4 h-4" />
          <span>{{ t("auth.deviceSync.qrExpiry") }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="showLinkModal = false">
          {{ t("common.close") }}
        </UButton>
        <UButton @click="regenerateLink">
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-1" />
          {{ t("common.refresh") }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import QrcodeVue from "qrcode.vue";

definePageMeta({
  middleware: ["auth"],
});

useHead({
  title: "Device Sync",
});

// Composables
const { t } = useI18n();
const toast = useToast();
const staffSync = useStaffSync();
const auth = useAuth();
const company = useCompany();

// State
const showLinkModal = ref(false);
const linkQrData = ref<{ data: string; expiresAt: number } | null>(null);
const syncNsec = ref(""); // User enters nsec for sync
const companyCodeInput = ref(""); // User enters company code
const isConnecting = ref(false);

// Company code computed
const hasCompanyCode = computed(() => company.hasCompanyCode.value);
const companyCode = computed(() => company.companyCode.value);
const isValidCompanyCode = computed(() => company.isValidCompanyCode(companyCodeInput.value));

// Format company code input (auto-add dashes)
function formatCompanyCodeInput(event: Event) {
  const input = event.target as HTMLInputElement;
  let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (value.length > 4) value = value.slice(0, 4) + "-" + value.slice(4);
  if (value.length > 9) value = value.slice(0, 9) + "-" + value.slice(9);
  if (value.length > 14) value = value.slice(0, 14);

  companyCodeInput.value = value;
}

// Computed - Get current user info
const currentUser = computed(() => auth.user.value);

const isSyncing = staffSync.isSyncing;
const lastSyncedAt = staffSync.lastSyncedAt;
const syncError = staffSync.syncError;

const deviceInfo = computed(() => staffSync.getDeviceInfo());

const deviceIcon = computed(() => {
  const name = deviceInfo.value.name;
  if (name === "Android") return "i-heroicons-device-phone-mobile";
  if (name === "iOS") return "i-heroicons-device-phone-mobile";
  return "i-heroicons-computer-desktop";
});

// Can sync if we have nsec and not currently syncing
const canSync = computed(() => {
  const hasValidNsec = syncNsec.value.startsWith("nsec1") && syncNsec.value.length > 60;
  return hasValidNsec && !isSyncing.value;
});

const formattedLastSync = computed(() => {
  if (!lastSyncedAt.value) return "-";
  const date = new Date(lastSyncedAt.value);
  return date.toLocaleString();
});

// Methods
function copyDeviceId() {
  if (import.meta.client) {
    navigator.clipboard.writeText(deviceInfo.value.id);
    toast.add({
      title: t("common.copied", "Copied!"),
      icon: "i-heroicons-check",
      color: "success",
    });
  }
}

async function handleConnectCompany() {
  if (!isValidCompanyCode.value) return;

  isConnecting.value = true;

  try {
    // ═══════════════════════════════════════════════════════════
    // 🔑 ENSURE STAFF HAS NOSTR KEYS FOR PUBLISHING ALERTS
    // ═══════════════════════════════════════════════════════════
    const nostrUser = useNostrUser();
    const nostrKey = useNostrKey();
    const { $nostr } = useNuxtApp();

    // If no keys exist, generate them automatically
    if (!nostrKey.hasKey()) {
      console.log(
        "[DeviceSync] 🔑 No Nostr keys found - generating keys for staff..."
      );
      const newUser = $nostr.generateKeys();
      await nostrUser.setupUser(newUser.privateKey);
      console.log(
        "[DeviceSync] ✅ Keys generated! Pubkey:",
        newUser.publicKey.slice(0, 8) + "..."
      );

      toast.add({
        title: "Keys Generated",
        description:
          "Nostr keys created for this device. You can now publish kitchen alerts!",
        color: "green",
        icon: "i-heroicons-key",
        timeout: 3000,
      });
    } else {
      console.log("[DeviceSync] ✓ User already has Nostr keys");
    }

    // ═══════════════════════════════════════════════════════════
    // 🔍 DISCOVER OWNER PUBKEY BY COMPANY CODE
    // ═══════════════════════════════════════════════════════════
    const nostrData = useNostrData();
    let ownerPubkey: string | null = null;
    try {
      ownerPubkey = await nostrData.discoverOwnerByCompanyCode(companyCodeInput.value);
      console.log("[DeviceSync] Discovered owner:", ownerPubkey?.slice(0, 8) + "...");
    } catch (e) {
      console.warn("[DeviceSync] Could not discover owner:", e);
    }

    await company.setCompanyCode(companyCodeInput.value, ownerPubkey || undefined);
    company.toggleCompanyCode(true);

    // Show appropriate toast based on whether owner was found
    if (ownerPubkey) {
      toast.add({
        title: t("auth.company.connectSuccess", "Connected!"),
        description: t("auth.company.syncingData", "Syncing company data..."),
        icon: "i-heroicons-check-circle",
        color: "success",
      });
    } else {
      toast.add({
        title: "Connected with Limited Features",
        description:
          "Could not discover owner. You can still use company code features, but some cross-device notifications may not work. Ask owner to sign in at least once.",
        icon: "i-heroicons-exclamation-triangle",
        color: "amber",
        timeout: 8000,
      });
    }

    companyCodeInput.value = "";

    // Reload page to trigger data sync
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    toast.add({
      title: t("auth.company.connectError", "Failed to connect"),
      icon: "i-heroicons-exclamation-circle",
      color: "error",
    });
  } finally {
    isConnecting.value = false;
  }
}

async function handleSyncNow() {
  if (!syncNsec.value) {
    toast.add({
      title: t("auth.deviceSync.noNsec", "No private key"),
      description: t("auth.deviceSync.enterNsecToSync", "Please enter your nsec to sync"),
      icon: "i-heroicons-exclamation-circle",
      color: "warning",
    });
    return;
  }

  // Get pubkey from nsec using nostrKey
  const nostrKey = useNostrKey();
  const privateKeyHex = nostrKey.decodePrivateKey(syncNsec.value);
  if (!privateKeyHex) {
    toast.add({
      title: t("auth.errors.invalidNsec", "Invalid nsec"),
      icon: "i-heroicons-exclamation-circle",
      color: "error",
    });
    return;
  }

  const pubkeyHex = nostrKey.getPublicKeyFromPrivate(privateKeyHex);
  const npub = nostrKey.hexToNpub(pubkeyHex);

  // Create a StoreUser object for sync
  const storeUser = {
    id: currentUser.value?.id || `user_${pubkeyHex.slice(0, 8)}`,
    name: currentUser.value?.displayName || "User",
    npub: npub,
    pubkeyHex: pubkeyHex,
    role: (currentUser.value?.role || "staff") as "owner" | "admin" | "cashier" | "staff",
    permissions: {} as import("~/types").UserPermissions,
    isActive: true,
    authMethod: "nostr" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await staffSync.syncToRelays(storeUser, syncNsec.value);

  // Clear nsec after sync for security
  if (result.success) {
    syncNsec.value = "";
  }
}

function regenerateLink() {
  if (!syncNsec.value) return;

  const nostrKey = useNostrKey();
  const privateKeyHex = nostrKey.decodePrivateKey(syncNsec.value);
  if (!privateKeyHex) return;

  const pubkeyHex = nostrKey.getPublicKeyFromPrivate(privateKeyHex);
  const npub = nostrKey.hexToNpub(pubkeyHex);

  const storeUser = {
    id: currentUser.value?.id || `user_${pubkeyHex.slice(0, 8)}`,
    name: currentUser.value?.displayName || "User",
    npub: npub,
    role: (currentUser.value?.role || "staff") as "owner" | "admin" | "cashier" | "staff",
    permissions: {} as import("~/types").UserPermissions,
    isActive: true,
    authMethod: "nostr" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  linkQrData.value = staffSync.generateLinkData(storeUser, syncNsec.value);
}

// Generate QR on modal open
watch(showLinkModal, (isOpen: boolean) => {
  if (isOpen && syncNsec.value) {
    regenerateLink();
  }
});
</script>
