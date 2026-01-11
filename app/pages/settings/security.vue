<template>
  <UContainer>
    <CommonPageHeader :title="$t('settings.security.title')" :description="$t('settings.security.description')" />

    <!-- Encryption Status -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold flex items-center gap-2">
            <UIcon name="i-heroicons-shield-check" class="text-primary" />
            {{ $t('settings.security.encryptionStatus') }}
          </h3>
          <UBadge v-if="isEncryptionInitialized" color="success" variant="subtle">
            <UIcon name="i-heroicons-lock-closed" class="mr-1" />
            {{ $t('settings.security.encrypted') }}
          </UBadge>
          <UBadge v-else color="error" variant="subtle">
            <UIcon name="i-heroicons-lock-open" class="mr-1" />
            {{ $t('settings.security.notEncrypted') }}
          </UBadge>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UIcon name="i-heroicons-key" class="text-3xl text-primary mb-2" />
          <p class="text-sm text-muted">{{ $t('settings.security.algorithm') }}</p>
          <p class="font-semibold">AES-256-GCM</p>
        </div>

        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UIcon name="i-heroicons-finger-print" class="text-3xl text-blue-600 mb-2" />
          <p class="text-sm text-muted">{{ $t('settings.security.keyId') }}</p>
          <p class="font-semibold font-mono text-xs">{{ truncateKeyId(currentKeyId) }}</p>
        </div>

        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UIcon name="i-heroicons-clock" class="text-3xl text-green-600 mb-2" />
          <p class="text-sm text-muted">{{ $t('settings.security.keyAge') }}</p>
          <p class="font-semibold">{{ keyAge }}</p>
        </div>
      </div>
    </UCard>

    <!-- Key Management (Owner Only) -->
    <UCard v-if="isOwner" class="mb-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-key" class="text-amber-600" />
          {{ $t('settings.security.keyManagement') }}
        </h3>
      </template>

      <UAlert icon="i-heroicons-exclamation-triangle" color="warning" :title="$t('settings.security.keyWarning')"
        :description="$t('settings.security.keyWarningDesc')" class="mb-6" />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- View Current Key -->
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 class="font-medium mb-3 flex items-center gap-2">
            <UIcon name="i-heroicons-eye" class="text-blue-600" />
            {{ $t('settings.security.viewKey') }}
          </h4>

          <p class="text-sm text-muted mb-4">{{ $t('settings.security.viewKeyDesc') }}</p>

          <div v-if="showKey" class="mb-4">
            <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 font-mono text-xs break-all">
              {{ exportedKey }}
            </div>
            <div class="flex gap-2 mt-2">
              <UButton size="xs" variant="outline" icon="i-heroicons-clipboard" @click="copyKey">
                {{ $t('common.copy') }}
              </UButton>
              <UButton size="xs" variant="outline" icon="i-heroicons-eye-slash" @click="hideKey">
                {{ $t('settings.security.hideKey') }}
              </UButton>
            </div>
          </div>

          <UButton v-else variant="soft" icon="i-heroicons-eye" :loading="loadingKey" @click="viewCurrentKey">
            {{ $t('settings.security.revealKey') }}
          </UButton>
        </div>

        <!-- Rotate Key -->
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 class="font-medium mb-3 flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-path" class="text-purple-600" />
            {{ $t('settings.security.rotateKey') }}
          </h4>

          <p class="text-sm text-muted mb-4">{{ $t('settings.security.rotateKeyDesc') }}</p>

          <UButton color="warning" variant="soft" icon="i-heroicons-arrow-path" :loading="rotatingKey"
            @click="confirmRotateKey">
            {{ $t('settings.security.rotateNow') }}
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Nostr Key Backup (Owner Only) -->
    <UCard v-if="isOwner" class="mb-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-cloud-arrow-up" class="text-purple-600" />
          {{ $t('settings.security.nostrKeyBackup') }}
        </h3>
      </template>

      <p class="text-muted mb-4">{{ $t('settings.security.nostrKeyBackupDesc') }}</p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Backup to Nostr -->
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 class="font-medium mb-3 flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-up-on-square" class="text-blue-600" />
            {{ $t('settings.security.backupToNostr') }}
          </h4>

          <div class="space-y-3 mb-4">
            <UFormField :label="$t('settings.security.relays')">
              <UTextarea v-model="nostrRelays" placeholder="wss://relay.damus.io&#10;wss://nos.lol" class="w-full"
                :rows="3" />
            </UFormField>
          </div>

          <div class="flex items-center justify-between">
            <span v-if="lastNostrBackup" class="text-sm text-muted">
              {{ $t('settings.security.lastBackup') }}: {{ formatDate(lastNostrBackup) }}
            </span>
            <UButton icon="i-heroicons-cloud-arrow-up" :loading="backingUpToNostr" @click="backupKeyToNostr">
              {{ $t('settings.security.backupNow') }}
            </UButton>
          </div>
        </div>

        <!-- Restore from Nostr -->
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 class="font-medium mb-3 flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-down-on-square" class="text-green-600" />
            {{ $t('settings.security.restoreFromNostr') }}
          </h4>

          <p class="text-sm text-muted mb-4">{{ $t('settings.security.restoreFromNostrDesc') }}</p>

          <UButton variant="outline" icon="i-heroicons-cloud-arrow-down" :loading="restoringFromNostr"
            @click="restoreKeyFromNostr">
            {{ $t('settings.security.restoreKey') }}
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Encryption Algorithms Info -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-information-circle" class="text-blue-600" />
          {{ $t('settings.security.algorithmsInfo') }}
        </h3>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- AES-256-GCM -->
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <UIcon name="i-heroicons-lock-closed" class="text-green-600" />
            <h4 class="font-medium">AES-256-GCM</h4>
          </div>
          <p class="text-sm text-muted mb-2">{{ $t('settings.security.aesDesc') }}</p>
          <UBadge color="success" variant="subtle">{{ $t('settings.security.localData') }}</UBadge>
        </div>

        <!-- NIP-44 -->
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <UIcon name="i-heroicons-globe-alt" class="text-purple-600" />
            <h4 class="font-medium">NIP-44</h4>
          </div>
          <p class="text-sm text-muted mb-2">{{ $t('settings.security.nip44Desc') }}</p>
          <UBadge color="purple" variant="subtle">{{ $t('settings.security.nostrSync') }}</UBadge>
        </div>

        <!-- NIP-04 -->
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <UIcon name="i-heroicons-clock" class="text-amber-600" />
            <h4 class="font-medium">NIP-04</h4>
          </div>
          <p class="text-sm text-muted mb-2">{{ $t('settings.security.nip04Desc') }}</p>
          <UBadge color="warning" variant="subtle">{{ $t('settings.security.legacy') }}</UBadge>
        </div>
      </div>
    </UCard>

    <!-- Sensitive Fields -->
    <UCard>
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-shield-exclamation" class="text-red-600" />
          {{ $t('settings.security.sensitiveFields') }}
        </h3>
      </template>

      <p class="text-muted mb-4">{{ $t('settings.security.sensitiveFieldsDesc') }}</p>

      <div class="flex flex-wrap gap-2">
        <UBadge v-for="field in sensitiveFields" :key="field" color="neutral" variant="subtle">
          <UIcon name="i-heroicons-lock-closed" class="mr-1 text-xs" />
          {{ field }}
        </UBadge>
      </div>
    </UCard>

    <!-- Rotate Key Confirmation Modal -->
    <UModal v-model:open="showRotateModal">
      <template #header>
        <div class="flex items-center gap-2 text-warning">
          <UIcon name="i-heroicons-exclamation-triangle" />
          {{ $t('settings.security.rotateConfirm') }}
        </div>
      </template>

      <template #body>
        <div class="py-4">
          <p class="mb-4">{{ $t('settings.security.rotateConfirmDesc') }}</p>

          <UAlert icon="i-heroicons-information-circle" color="info" class="mb-4">
            <template #description>
              <ul class="list-disc list-inside text-sm">
                <li>{{ $t('settings.security.rotateNote1') }}</li>
                <li>{{ $t('settings.security.rotateNote2') }}</li>
                <li>{{ $t('settings.security.rotateNote3') }}</li>
              </ul>
            </template>
          </UAlert>

          <UFormField :label="$t('settings.security.confirmPassword')">
            <UInput v-model="confirmPassword" class="w-full" type="password"
              :placeholder="$t('settings.security.enterPassword')" />
          </UFormField>
        </div>

      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showRotateModal = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton color="warning" :loading="rotatingKey" :disabled="!confirmPassword" @click="rotateKey">
            {{ $t('settings.security.rotateKey') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'permission'],
  permission: 'canViewSettings',
});

useHead({
  title: 'Settings - Security',
});

const { t } = useI18n();
const toast = useToast();
const encryption = useEncryption();
const permissions = usePermissions();
const nostrStorage = useNostrStorage();

// Permission check
const isOwner = computed(() => permissions.isOwner());

// Encryption state
const isEncryptionInitialized = computed(() => encryption.isInitialized.value);
const currentKeyId = computed(() => encryption.currentKeyId.value || 'Not set');

// Key management state
const showKey = ref(false);
const exportedKey = ref('');
const loadingKey = ref(false);
const rotatingKey = ref(false);
const showRotateModal = ref(false);
const confirmPassword = ref('');

// Nostr backup state
const nostrRelays = ref('wss://bnos.space\nwss://relay.damus.io\nwss://nos.lol\nwss://relay.nostr.band');
const backingUpToNostr = ref(false);
const restoringFromNostr = ref(false);
const lastNostrBackup = ref<string | null>(null);

// Sensitive fields list
const sensitiveFields = computed(() => encryption.SENSITIVE_FIELDS);

// Key age calculation
const keyAge = computed(() => {
  if (!currentKeyId.value || currentKeyId.value === 'Not set') return t('settings.security.unknown');

  // Extract timestamp from key ID format: key-type-timestamp-uuid
  const parts = currentKeyId.value.split('-');
  if (parts.length >= 3) {
    const timestamp = parseInt(parts[2] || '0');
    if (timestamp > 0) {
      const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
      if (days === 0) return t('settings.security.today');
      if (days === 1) return t('settings.security.yesterday');
      return t('settings.security.daysAgo', { days });
    }
  }
  return t('settings.security.unknown');
});

// Helpers
function truncateKeyId(keyId: string | null) {
  if (!keyId) return 'N/A';
  if (keyId.length <= 24) return keyId;
  return `${keyId.slice(0, 12)}...${keyId.slice(-8)}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

// View current key (owner only)
async function viewCurrentKey() {
  if (!isOwner.value) {
    toast.add({
      title: t('common.accessDenied'),
      description: t('settings.security.ownerOnly'),
      color: 'error',
      icon: 'i-heroicons-shield-exclamation',
    });
    return;
  }

  loadingKey.value = true;
  try {
    const keyId = encryption.currentKeyId.value;
    if (!keyId) {
      toast.add({
        title: t('common.error'),
        description: t('settings.security.noKeyFound'),
        color: 'error',
      });
      return;
    }

    const key = await encryption.exportKey(keyId);
    if (key) {
      exportedKey.value = key;
      showKey.value = true;
    } else {
      toast.add({
        title: t('common.error'),
        description: t('settings.security.keyExportFailed'),
        color: 'error',
      });
    }
  } catch (error) {
    console.error('Failed to export key:', error);
    toast.add({
      title: t('common.error'),
      description: String(error),
      color: 'error',
    });
  } finally {
    loadingKey.value = false;
  }
}

function hideKey() {
  showKey.value = false;
  exportedKey.value = '';
}

async function copyKey() {
  try {
    await navigator.clipboard.writeText(exportedKey.value);
    toast.add({
      title: t('common.copied'),
      description: t('settings.security.keyCopied'),
      color: 'success',
      icon: 'i-heroicons-clipboard-document-check',
    });
  } catch {
    toast.add({
      title: t('common.error'),
      description: t('settings.security.copyFailed'),
      color: 'error',
    });
  }
}

// Key rotation
function confirmRotateKey() {
  if (!isOwner.value) return;
  showRotateModal.value = true;
  confirmPassword.value = '';
}

async function rotateKey() {
  if (!confirmPassword.value) return;

  rotatingKey.value = true;
  try {
    const oldKeyId = encryption.currentKeyId.value;
    if (!oldKeyId) {
      toast.add({
        title: t('common.error'),
        description: t('settings.security.noKeyToRotate'),
        color: 'error',
      });
      return;
    }

    const result = await encryption.rotateKey(oldKeyId);
    if (result) {
      toast.add({
        title: t('common.success'),
        description: t('settings.security.keyRotated'),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      });
      showRotateModal.value = false;
    } else {
      toast.add({
        title: t('common.error'),
        description: t('settings.security.rotationFailed'),
        color: 'error',
      });
    }
  } catch (error) {
    console.error('Key rotation failed:', error);
    toast.add({
      title: t('common.error'),
      description: String(error),
      color: 'error',
    });
  } finally {
    rotatingKey.value = false;
  }
}

// Nostr key backup
async function backupKeyToNostr() {
  if (!isOwner.value) return;

  backingUpToNostr.value = true;
  try {
    const keyId = encryption.currentKeyId.value;
    if (!keyId) {
      toast.add({
        title: t('common.error'),
        description: t('settings.security.noKeyFound'),
        color: 'error',
      });
      return;
    }

    // Export the key
    const keyHex = await encryption.exportKey(keyId);
    if (!keyHex) {
      toast.add({
        title: t('common.error'),
        description: t('settings.security.keyExportFailed'),
        color: 'error',
      });
      return;
    }

    // Get Nostr keys from storage
    const { user: nostrUserData } = nostrStorage.loadCurrentUser();

    if (!nostrUserData?.publicKey || !nostrUserData?.privateKey) {
      toast.add({
        title: t('common.error'),
        description: t('settings.security.noNostrKey'),
        color: 'error',
      });
      return;
    }

    // Encrypt with NIP-44 (to self)
    const encryptedKey = await encryption.encrypt(
      { keyId, keyHex, createdAt: new Date().toISOString() },
      {
        algorithm: 'nip-44',
        nostrPrivkey: nostrUserData.privateKey,
        nostrPubkey: nostrUserData.publicKey,
      }
    );

    if (!encryptedKey.success || !encryptedKey.data) {
      toast.add({
        title: t('common.error'),
        description: t('settings.security.encryptionFailed'),
        color: 'error',
      });
      return;
    }

    // Store on Nostr
    await nostrStorage.saveEncryptedData('company:encryption:key', encryptedKey.data);

    lastNostrBackup.value = new Date().toISOString();

    // Also save backup timestamp
    await encryption.secureStore('lastNostrKeyBackup', lastNostrBackup.value);

    toast.add({
      title: t('common.success'),
      description: t('settings.security.backupSuccess'),
      color: 'success',
      icon: 'i-heroicons-cloud-arrow-up',
    });
  } catch (error) {
    console.error('Nostr backup failed:', error);
    toast.add({
      title: t('common.error'),
      description: String(error),
      color: 'error',
    });
  } finally {
    backingUpToNostr.value = false;
  }
}

async function restoreKeyFromNostr() {
  if (!isOwner.value) return;

  restoringFromNostr.value = true;
  try {
    // Get Nostr keys from storage
    const { user: nostrUserData } = nostrStorage.loadCurrentUser();

    if (!nostrUserData?.publicKey || !nostrUserData?.privateKey) {
      toast.add({
        title: t('common.error'),
        description: t('settings.security.noNostrKey'),
        color: 'error',
      });
      return;
    }

    // Fetch from Nostr
    const encryptedKey = await nostrStorage.loadEncryptedData('company:encryption:key');

    if (!encryptedKey) {
      toast.add({
        title: t('common.error'),
        description: t('settings.security.noBackupFound'),
        color: 'error',
      });
      return;
    }

    // Decrypt with NIP-44
    const decrypted = await encryption.decrypt<{ keyId: string; keyHex: string }>(encryptedKey, {
      nostrPrivkey: nostrUserData.privateKey,
      nostrPubkey: nostrUserData.publicKey,
    });

    if (!decrypted.success || !decrypted.data) {
      toast.add({
        title: t('common.error'),
        description: t('settings.security.decryptionFailed'),
        color: 'error',
      });
      return;
    }

    // Import key
    const { keyId, keyHex } = decrypted.data;
    await encryption.importKey(keyHex, keyId);

    toast.add({
      title: t('common.success'),
      description: t('settings.security.restoreSuccess'),
      color: 'success',
      icon: 'i-heroicons-cloud-arrow-down',
    });
  } catch (error) {
    console.error('Nostr restore failed:', error);
    toast.add({
      title: t('common.error'),
      description: String(error),
      color: 'error',
    });
  } finally {
    restoringFromNostr.value = false;
  }
}

// Load last backup date
onMounted(async () => {
  // Try to load last backup timestamp from storage
  const lastBackup = await encryption.secureRetrieve<string>('lastNostrKeyBackup');
  if (lastBackup) {
    lastNostrBackup.value = lastBackup;
  }
});
</script>
