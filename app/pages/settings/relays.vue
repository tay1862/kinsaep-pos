<template>
  <UContainer>
    <CommonPageHeader
      :title="$t('settings.relays.title')"
      :description="$t('settings.relays.description')"
    />

    <!-- Relay Status Overview -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold flex items-center gap-2">
            <UIcon name="i-heroicons-signal" class="text-primary" />
            {{ $t("settings.relays.connectionStatus") }}
          </h3>
          <UBadge
            :color="connectedCount > 0 ? 'success' : 'error'"
            variant="subtle"
          >
            {{ connectedCount }}/{{ relayInfoList.length }}
            {{ $t("settings.relays.connected") }}
          </UBadge>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UIcon
            name="i-heroicons-server-stack"
            class="text-3xl text-primary mb-2"
          />
          <p class="text-sm text-muted">
            {{ $t("settings.relays.totalRelays") }}
          </p>
          <p class="font-semibold text-xl">{{ relayInfoList.length }}</p>
        </div>
        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UIcon
            name="i-heroicons-check-circle"
            class="text-3xl text-green-600 mb-2"
          />
          <p class="text-sm text-muted">
            {{ $t("settings.relays.connected") }}
          </p>
          <p class="font-semibold text-xl text-green-600">
            {{ connectedCount }}
          </p>
        </div>
        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UIcon
            name="i-heroicons-clock"
            class="text-3xl text-amber-600 mb-2"
          />
          <p class="text-sm text-muted">
            {{ $t("settings.relays.avgLatency") }}
          </p>
          <p class="font-semibold text-xl">{{ avgLatency }}ms</p>
        </div>
        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UIcon
            name="i-heroicons-arrow-path"
            class="text-3xl text-violet-600 mb-2"
          />
          <p class="text-sm text-muted">{{ $t("settings.relays.lastSync") }}</p>
          <p class="font-semibold text-sm">{{ lastSyncFormatted }}</p>
        </div>
      </div>
    </UCard>

    <!-- Add Relay Section -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-plus-circle" class="text-primary" />
          {{ $t("settings.relays.addRelay") }}
        </h3>
      </template>

      <div class="flex gap-3">
        <UFormField class="flex-1" :label="$t('settings.relays.relayUrl')">
          <UInput
            v-model="newRelayUrl"
            placeholder="wss://relay.example.com"
            icon="i-heroicons-link"
            :color="urlError ? 'error' : undefined"
            class="w-full"
          />
          <p v-if="urlError" class="text-xs text-red-500 mt-1">
            {{ urlError }}
          </p>
        </UFormField>
        <div class="flex items-end">
          <UButton
            color="primary"
            :loading="addingRelay"
            :disabled="!newRelayUrl || !!urlError"
            @click="addNewRelay"
          >
            <UIcon name="i-heroicons-plus" class="mr-1" />
            {{ $t("common.add") }}
          </UButton>
        </div>
      </div>

      <!-- Quick Add Popular Relays -->
      <div class="mt-4">
        <p class="text-sm text-muted mb-2">
          {{ $t("settings.relays.popularRelays") }}
        </p>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="relay in popularRelays"
            :key="relay"
            size="xs"
            variant="outline"
            color="neutral"
            :disabled="isRelayAdded(relay)"
            @click="quickAddRelay(relay)"
          >
            <UIcon
              :name="
                isRelayAdded(relay)
                  ? 'i-heroicons-check'
                  : 'i-heroicons-plus-circle'
              "
              class="mr-1"
            />
            {{ formatRelayName(relay) }}
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Relay List -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold flex items-center gap-2">
            <UIcon name="i-heroicons-server-stack" class="text-violet-600" />
            {{ $t("settings.relays.configuredRelays") }}
          </h3>
          <div class="flex gap-2">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              :loading="refreshingAll"
              @click="refreshAllRelays"
            >
              <UIcon name="i-heroicons-arrow-path" class="mr-1" />
              {{ $t("settings.relays.refreshAll") }}
            </UButton>
            <UButton
              size="xs"
              variant="ghost"
              color="primary"
              @click="saveRelayConfig"
            >
              <UIcon name="i-heroicons-cloud-arrow-up" class="mr-1" />
              {{ $t("common.save") }}
            </UButton>
          </div>
        </div>
      </template>

      <div v-if="relayInfoList.length === 0" class="text-center py-8">
        <UIcon
          name="i-heroicons-server-stack"
          class="text-5xl text-gray-300 dark:text-gray-600 mx-auto mb-3"
        />
        <p class="text-muted">{{ $t("settings.relays.noRelays") }}</p>
        <p class="text-sm text-gray-400">
          {{ $t("settings.relays.addFirstRelay") }}
        </p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="relay in relayInfoList"
          :key="relay.url"
          class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
        >
          <div class="flex items-start justify-between">
            <!-- Relay Info -->
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <!-- Status Indicator -->
                <span
                  class="w-2.5 h-2.5 rounded-full"
                  :class="getStatusColor(relay.status)"
                />
                <span class="font-medium text-gray-900 dark:text-white">
                  {{ relay.url }}
                </span>
                <UBadge
                  v-if="relay.isPrimary"
                  size="xs"
                  color="primary"
                  variant="subtle"
                >
                  {{ $t("settings.relays.primary") }}
                </UBadge>
              </div>

              <!-- Relay Stats -->
              <div
                class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400"
              >
                <span class="flex items-center gap-1">
                  <UIcon name="i-heroicons-clock" />
                  {{ relay.latency > 0 ? `${relay.latency}ms` : "--" }}
                </span>
                <span
                  class="flex items-center gap-1"
                  :class="getStatusTextColor(relay.status)"
                >
                  <UIcon :name="getStatusIcon(relay.status)" />
                  {{ $t(`settings.relays.status.${relay.status}`) }}
                </span>
                <span
                  v-if="relay.lastSync"
                  class="flex items-center gap-1"
                  :title="relay.lastSync.toISOString()"
                >
                  <UIcon name="i-heroicons-arrow-path" />
                  {{ formatRelativeTime(relay.lastSync) }}
                </span>
              </div>

              <!-- Relay Role Toggles -->
              <div class="flex items-center gap-4 mt-3">
                <UCheckbox
                  v-model="relay.isRead"
                  :label="$t('settings.relays.readRelay')"
                  color="success"
                  size="sm"
                />
                <UCheckbox
                  v-model="relay.isWrite"
                  :label="$t('settings.relays.writeRelay')"
                  color="primary"
                  size="sm"
                />
                <UCheckbox
                  v-model="relay.isOutbox"
                  :label="$t('settings.relays.outboxRelay')"
                  color="warning"
                  size="sm"
                />
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1">
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                :loading="relay.testing"
                @click="testRelay(relay)"
              >
                <UIcon name="i-heroicons-play" />
              </UButton>
              <UButton
                v-if="!relay.isPrimary"
                size="xs"
                variant="ghost"
                color="primary"
                @click="setPrimaryRelay(relay.url)"
              >
                <UIcon name="i-heroicons-star" />
              </UButton>
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                @click="removeRelayFromList(relay.url)"
              >
                <UIcon name="i-heroicons-trash" />
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- NIP-65 Relay List Info -->
    <UCard class="mt-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-information-circle" class="text-blue-600" />
          {{ $t("settings.relays.nip65Info") }}
        </h3>
      </template>

      <p class="text-sm text-muted mb-4">
        {{ $t("settings.relays.nip65Description") }}
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-heroicons-arrow-down-tray" class="text-green-600" />
            <span class="font-medium text-green-800 dark:text-green-200">
              {{ $t("settings.relays.readRelays") }}
            </span>
          </div>
          <p class="text-xs text-green-700 dark:text-green-300">
            {{ $t("settings.relays.readRelaysDesc") }}
          </p>
        </div>
        <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-heroicons-arrow-up-tray" class="text-blue-600" />
            <span class="font-medium text-blue-800 dark:text-blue-200">
              {{ $t("settings.relays.writeRelays") }}
            </span>
          </div>
          <p class="text-xs text-blue-700 dark:text-blue-300">
            {{ $t("settings.relays.writeRelaysDesc") }}
          </p>
        </div>
        <div class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-heroicons-inbox-arrow-down" class="text-amber-600" />
            <span class="font-medium text-amber-800 dark:text-amber-200">
              {{ $t("settings.relays.outboxRelays") }}
            </span>
          </div>
          <p class="text-xs text-amber-700 dark:text-amber-300">
            {{ $t("settings.relays.outboxRelaysDesc") }}
          </p>
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <UButton
          color="primary"
          variant="soft"
          :loading="publishingRelayList"
          @click="publishRelayList"
        >
          <UIcon name="i-heroicons-globe-alt" class="mr-1" />
          {{ $t("settings.relays.publishRelayList") }}
        </UButton>
      </div>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { t } = useI18n();
const toast = useToast();
const nostrRelay = useNostrRelay();

// Relay Info Type
interface RelayInfo {
  url: string;
  status: "connected" | "connecting" | "disconnected" | "error";
  latency: number;
  lastSync: Date | null;
  isRead: boolean;
  isWrite: boolean;
  isOutbox: boolean;
  isPrimary: boolean;
  testing?: boolean;
}

// State
const newRelayUrl = ref("");
const addingRelay = ref(false);
const refreshingAll = ref(false);
const publishingRelayList = ref(false);
const lastSync = ref<Date | null>(null);

// Relay list with detailed info
const relayInfoList = ref<RelayInfo[]>([]);

// Popular relays for quick add
const popularRelays = [
  'wss://relay.bnos.space',
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://nostr-pub.wellorder.net",
  "wss://relay.snort.social",
  "wss://yabu.me",
];

// URL validation
const urlError = computed(() => {
  if (!newRelayUrl.value) return null;
  if (
    !newRelayUrl.value.startsWith("wss://") &&
    !newRelayUrl.value.startsWith("ws://")
  ) {
    return t("settings.relays.invalidUrl");
  }
  if (isRelayAdded(newRelayUrl.value)) {
    return t("settings.relays.alreadyAdded");
  }
  return null;
});

// Computed
const connectedCount = computed(() => {
  return relayInfoList.value.filter((r) => r.status === "connected").length;
});

const avgLatency = computed(() => {
  const connected = relayInfoList.value.filter((r) => r.latency > 0);
  if (connected.length === 0) return 0;
  const total = connected.reduce((sum, r) => sum + r.latency, 0);
  return Math.round(total / connected.length);
});

const lastSyncFormatted = computed(() => {
  if (!lastSync.value) return "--";
  return formatRelativeTime(lastSync.value);
});

// Methods
function isRelayAdded(url: string): boolean {
  return relayInfoList.value.some((r) => r.url === url);
}

function formatRelayName(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return t("common.justNow");
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function getStatusColor(status: string): string {
  switch (status) {
    case "connected":
      return "bg-green-500";
    case "connecting":
      return "bg-amber-500 animate-pulse";
    case "disconnected":
      return "bg-gray-400";
    case "error":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

function getStatusTextColor(status: string): string {
  switch (status) {
    case "connected":
      return "text-green-600";
    case "connecting":
      return "text-amber-600";
    case "error":
      return "text-red-600";
    default:
      return "text-gray-500";
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "connected":
      return "i-heroicons-check-circle";
    case "connecting":
      return "i-heroicons-arrow-path";
    case "error":
      return "i-heroicons-exclamation-triangle";
    default:
      return "i-heroicons-minus-circle";
  }
}

async function addNewRelay() {
  if (!newRelayUrl.value || urlError.value) return;

  addingRelay.value = true;
  try {
    const url = newRelayUrl.value.trim();

    // Add to list with initial state
    const newRelay: RelayInfo = {
      url,
      status: "connecting",
      latency: 0,
      lastSync: null,
      isRead: true,
      isWrite: true,
      isOutbox: false,
      isPrimary: relayInfoList.value.length === 0,
    };

    relayInfoList.value.push(newRelay);
    newRelayUrl.value = "";

    // Test the connection
    await testRelay(newRelay);

    // Add to nostr relay composable with full config
    nostrRelay.addRelay(url, {
      read: newRelay.isRead,
      write: newRelay.isWrite,
      outbox: newRelay.isOutbox,
      isPrimary: newRelay.isPrimary,
    });

    toast.add({
      title: t("common.success"),
      description: t("settings.relays.relayAdded"),
      color: "success",
    });
  } finally {
    addingRelay.value = false;
  }
}

function quickAddRelay(url: string) {
  newRelayUrl.value = url;
  addNewRelay();
}

async function testRelay(relay: RelayInfo) {
  relay.testing = true;
  relay.status = "connecting";

  try {
    const startTime = Date.now();

    // Try to connect and measure latency
    const ws = new WebSocket(relay.url);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Connection timeout"));
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        relay.latency = Date.now() - startTime;
        relay.status = "connected";
        relay.lastSync = new Date();
        ws.close();
        resolve();
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Connection failed"));
      };
    });
  } catch {
    relay.status = "error";
    relay.latency = 0;
  } finally {
    relay.testing = false;
  }
}

function removeRelayFromList(url: string) {
  const index = relayInfoList.value.findIndex((r) => r.url === url);
  if (index !== -1) {
    const wasPrimary = relayInfoList.value[index].isPrimary;
    relayInfoList.value.splice(index, 1);

    // If removed relay was primary, set first relay as primary
    if (wasPrimary && relayInfoList.value.length > 0) {
      relayInfoList.value[0].isPrimary = true;
    }

    nostrRelay.removeRelay(url);

    toast.add({
      title: t("common.success"),
      description: t("settings.relays.relayRemoved"),
      color: "success",
    });
  }
}

function setPrimaryRelay(url: string) {
  relayInfoList.value.forEach((r) => {
    r.isPrimary = r.url === url;
  });
}

async function refreshAllRelays() {
  refreshingAll.value = true;
  try {
    await Promise.all(relayInfoList.value.map((relay) => testRelay(relay)));
    lastSync.value = new Date();
  } finally {
    refreshingAll.value = false;
  }
}

async function saveRelayConfig() {
  try {
    // Sync UI state back to composable
    relayInfoList.value.forEach((r) => {
      nostrRelay.updateRelay(r.url, {
        read: r.isRead,
        write: r.isWrite,
        outbox: r.isOutbox,
        isPrimary: r.isPrimary,
      });
    });

    // Save to Nostr (also saves to localStorage via composable)
    await nostrRelay.saveRelaysToNostr();

    toast.add({
      title: t("common.success"),
      description: t("settings.relays.configSaved"),
      color: "success",
    });
  } catch (error) {
    console.error("Failed to save relay config:", error);
    toast.add({
      title: t("common.error"),
      description: t("settings.relays.saveFailed"),
      color: "error",
    });
  }
}

async function publishRelayList() {
  publishingRelayList.value = true;
  try {
    // TODO: Implement NIP-65 relay list publishing
    // This would create a kind 10002 event with the relay list

    toast.add({
      title: t("common.success"),
      description: t("settings.relays.relayListPublished"),
      color: "success",
    });
  } catch (error) {
    console.error("Failed to publish relay list:", error);
    toast.add({
      title: t("common.error"),
      description: t("settings.relays.publishFailed"),
      color: "error",
    });
  } finally {
    publishingRelayList.value = false;
  }
}

// Load saved relay config
async function loadRelayConfig() {
  try {
    // Initialize the composable (loads from localStorage + Nostr settings)
    await nostrRelay.init();

    // Get the merged relay configs from composable
    const relayConfigs = nostrRelay.relayConfigs.value;

    // Convert to RelayInfo format for UI
    relayInfoList.value = relayConfigs.map((r, index) => ({
      url: r.url,
      status: (r.status || "disconnected") as
        | "connected"
        | "connecting"
        | "disconnected"
        | "error",
      latency: r.latency || 0,
      lastSync: r.lastConnectedAt ? new Date(r.lastConnectedAt) : null,
      isRead: r.read,
      isWrite: r.write,
      isOutbox: r.outbox,
      isPrimary: r.isPrimary ?? index === 0,
    }));

    // Test all relays to get accurate status
    await refreshAllRelays();
  } catch (error) {
    console.error("Failed to load relay config:", error);
  }
}

// Initialize
onMounted(() => {
  loadRelayConfig();
});

// Set page title
useHead({
  title: t("settings.relays.title"),
});
</script>
