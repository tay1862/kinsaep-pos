<!-- ============================================
  📱 DEVICE SYNC SETTINGS COMPONENT
  Sync staff data across devices using Nostr
============================================ -->

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="p-2 rounded-lg bg-primary/10 dark:bg-primary/20"
        >
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 class="text-lg font-semibold">{{ t("auth.deviceSync.title") }}</h3>
          <p class="text-sm text-gray-500">
            {{ t("auth.deviceSync.description") }}
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Device Info -->
      <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div class="flex items-center gap-3 mb-3">
          <UIcon
            :name="deviceIcon"
            class="w-8 h-8 text-gray-500"
          />
          <div>
            <p class="font-medium">{{ deviceInfo.name }}</p>
            <p class="text-sm text-gray-500">
              {{ deviceInfo.browser }} • ID: {{ deviceInfo.id }}
            </p>
          </div>
        </div>

        <!-- Last Synced -->
        <div
          v-if="lastSyncedAt"
          class="flex items-center gap-2 text-sm text-gray-600"
        >
          <UIcon name="i-heroicons-clock" class="w-4 h-4" />
          <span>{{ t("auth.deviceSync.lastSynced") }}: {{ formattedLastSync }}</span>
        </div>
      </div>

      <!-- Sync Status -->
      <div v-if="syncError" class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
        <div class="flex items-center gap-2 text-red-600 dark:text-red-400">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
          <span>{{ syncError }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-3">
        <!-- Sync Now Button -->
        <UButton
          block
          size="lg"
          :loading="isSyncing"
          :disabled="!canSync"
          @click="handleSyncNow"
        >
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 mr-2" />
          {{ isSyncing ? t("auth.deviceSync.syncing") : t("auth.deviceSync.syncNow") }}
        </UButton>

        <!-- Link New Device (QR) -->
        <UButton
          v-if="canGenerateLink"
          block
          size="lg"
          variant="outline"
          @click="showLinkModal = true"
        >
          <UIcon name="i-heroicons-qr-code" class="w-5 h-5 mr-2" />
          {{ t("auth.deviceSync.linkDevice") }}
        </UButton>
      </div>
    </div>
  </UCard>

  <!-- Link Device Modal -->
  <UModal v-model:open="showLinkModal">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-qr-code" class="w-5 h-5 text-primary" />
        <span>{{ t("auth.deviceSync.linkDevice") }}</span>
      </div>
    </template>

    <div class="p-4 space-y-4">
      <p class="text-sm text-gray-600">
        {{ t("auth.deviceSync.scanQrDescription") }}
      </p>

      <!-- QR Code -->
      <div
        v-if="linkQrData"
        class="flex justify-center p-4 bg-white rounded-lg"
      >
        <QrcodeVue
          :value="linkQrData.data"
          :size="200"
          level="M"
        />
      </div>

      <!-- Expiry Warning -->
      <div
        v-if="linkQrData"
        class="flex items-center gap-2 text-sm text-amber-600"
      >
        <UIcon name="i-heroicons-clock" class="w-4 h-4" />
        <span>{{ t("auth.deviceSync.qrExpiry") }}</span>
      </div>
    </div>

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
import type { StoreUser } from "~/types";

// Props
const props = defineProps<{
  user?: StoreUser;
  nsec?: string;
}>();

// Composables
const { t } = useI18n();
const staffSync = useStaffSync();

// State
const showLinkModal = ref(false);
const linkQrData = ref<{ data: string; expiresAt: number } | null>(null);

// Computed
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

const canSync = computed(() => {
  return props.user?.npub && props.nsec && !isSyncing.value;
});

const canGenerateLink = computed(() => {
  return props.user?.npub && props.nsec;
});

const formattedLastSync = computed(() => {
  if (!lastSyncedAt.value) return "-";
  const date = new Date(lastSyncedAt.value);
  return date.toLocaleString();
});

// Methods
async function handleSyncNow() {
  if (!props.user || !props.nsec) return;

  await staffSync.syncToRelays(props.user, props.nsec);
}

function regenerateLink() {
  if (!props.user || !props.nsec) return;

  linkQrData.value = staffSync.generateLinkData(props.user, props.nsec);
}

// Generate QR on modal open
watch(showLinkModal, (isOpen: boolean) => {
  if (isOpen && props.user && props.nsec) {
    regenerateLink();
  }
});
</script>
