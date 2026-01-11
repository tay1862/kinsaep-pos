<script setup lang="ts">
/**
 * Employee POS Access Component
 * Manage POS access, Nostr keys, and create StoreUser account
 */
import type { Employee } from "~/types";

const props = defineProps<{
  employee: Employee;
}>();

const emit = defineEmits<{
  updated: [];
}>();

const { t } = useI18n();
const toast = useToast();
const employeesStore = useEmployeesStore();
const users = useUsers();

// State
const isLoading = ref(false);
const isSyncing = ref(false);
const canAccessPOS = ref(props.employee.canAccessPOS || false);
const pin = ref(props.employee.pin || "");
const npub = ref(props.employee.npub || "");

// Check if StoreUser exists
const storeUser = computed(() => {
  return users.users.value.find(
    (u) => u.id === props.employee.userId || u.npub === props.employee.npub
  );
});

// Check if synced to Nostr
const isSynced = computed(() => {
  // Check local DB sync status
  return props.employee.npub ? true : false;
});

// Enable/disable POS access
async function togglePOSAccess() {
  isLoading.value = true;
  try {
    await employeesStore.updateEmployee(props.employee.id, {
      canAccessPOS: canAccessPOS.value,
    });

    // If enabled, create StoreUser
    if (canAccessPOS.value) {
      await employeesStore.createStoreUserFromEmployee(props.employee.id);
    }

    toast.add({
      title: t("common.success"),
      description: canAccessPOS.value
        ? t('employees.posAccessEnabled', 'POS access enabled')
        : t('employees.posAccessDisabled', 'POS access disabled'),
      icon: "i-heroicons-check-circle",
      color: "green",
    });

    emit("updated");
  } catch (e) {
    toast.add({
      title: t("common.error"),
      description: String(e),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    isLoading.value = false;
  }
}

// Save POS credentials
async function savePOSCredentials() {
  isLoading.value = true;
  try {
    await employeesStore.updateEmployee(props.employee.id, {
      pin: pin.value || undefined,
      npub: npub.value || undefined,
    });

    toast.add({
      title: t("common.success"),
      description: t('employees.credentialsSaved', 'POS credentials saved'),
      icon: "i-heroicons-check-circle",
      color: "green",
    });

    emit("updated");
  } catch (e) {
    toast.add({
      title: t("common.error"),
      description: String(e),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    isLoading.value = false;
  }
}

// Sync to Nostr
async function syncToNostr() {
  isSyncing.value = true;
  try {
    const success = await employeesStore.syncEmployeeToNostr(props.employee);

    if (success) {
      toast.add({
        title: t('employees.syncedToNostr', 'Synced to Nostr'),
        description: t('employees.dataPublishedToRelays', 'Employee data published to relays'),
        icon: "i-heroicons-cloud-arrow-up",
        color: "green",
      });
    } else {
      throw new Error(t('employees.syncFailed', 'Sync failed'));
    }

    emit("updated");
  } catch (e) {
    toast.add({
      title: t('employees.syncFailed', 'Sync Failed'),
      description: String(e),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    isSyncing.value = false;
  }
}

// Create StoreUser account
async function createStoreUser() {
  isLoading.value = true;
  try {
    const user = await employeesStore.createStoreUserFromEmployee(
      props.employee.id
    );

    if (user) {
      toast.add({
        title: t('employees.userCreated', 'StoreUser Created'),
        description: t('employees.userCreatedWithRole', `User "${user.name}" created with role: ${user.role}`),
        icon: "i-heroicons-user-plus",
        color: "green",
      });
    } else {
      throw new Error(t('employees.failedCreateUser', 'Failed to create user'));
    }

    emit("updated");
  } catch (e) {
    toast.add({
      title: t('employees.creationFailed', 'Creation Failed'),
      description: String(e),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    isLoading.value = false;
  }
}

// Watch for prop changes
watch(
  () => props.employee,
  (newEmployee) => {
    canAccessPOS.value = newEmployee.canAccessPOS || false;
    pin.value = newEmployee.pin || "";
    npub.value = newEmployee.npub || "";
  },
  { immediate: true }
);
</script>

<template>
  <div class="space-y-6">
    <!-- POS Access Toggle -->
    <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-device-tablet" class="w-5 h-5 text-primary-500" />
            {{ t("employees.posAccess", "POS Access") }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ t('employees.posAccessDesc', 'Allow this employee to access the POS system and create orders') }}
          </p>
        </div>
        <USwitch
          v-model="canAccessPOS"
          :disabled="isLoading"
          @update:model-value="togglePOSAccess"
        />
      </div>

      <!-- StoreUser Status -->
      <div v-if="canAccessPOS" class="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ t('employees.storeUserAccount', 'StoreUser Account') }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              <template v-if="storeUser">
                ✅ {{ t('employees.linkedToUser', `Linked to user: ${storeUser.name} (${storeUser.role})`) }}
              </template>
              <template v-else>
                ⚠️ {{ t('employees.noUserLinked', 'No StoreUser account linked') }}
              </template>
            </p>
          </div>
          <UButton
            v-if="!storeUser"
            color="primary"
            size="sm"
            icon="i-heroicons-user-plus"
            :loading="isLoading"
            @click="createStoreUser"
          >
            {{ t('employees.createAccount', 'Create Account') }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- POS Credentials -->
    <div v-if="canAccessPOS" class="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-4">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        {{ t("employees.posCredentials", "POS Credentials") }}
      </h3>

      <UFormField :label="t('employees.pin', 'PIN (4-6 digits)')" :help="t('employees.pinHelp', 'Staff can login with PIN')">
        <UInput
          v-model="pin"
          type="password"
          :placeholder="t('employees.pinPlaceholder', '1234')"
          maxlength="6"
          icon="i-heroicons-lock-closed"
        />
      </UFormField>

      <UFormField :label="t('employees.npub', 'Nostr Public Key (npub)')" :help="t('employees.npubHelp', 'For Nostr-based authentication')">
        <UInput
          v-model="npub"
          type="text"
          :placeholder="t('employees.npubPlaceholder', 'npub1...')"
          icon="i-heroicons-key"
        />
      </UFormField>

      <div class="flex justify-end">
        <UButton
          color="primary"
          icon="i-heroicons-check"
          :loading="isLoading"
          @click="savePOSCredentials"
        >
          {{ t("common.save") }}
        </UButton>
      </div>
    </div>

    <!-- Nostr Sync -->
    <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-cloud-arrow-up" class="w-5 h-5 text-primary-500" />
            {{ t("employees.nostrSync", "Nostr Sync") }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ t('employees.nostrSyncDesc', 'Sync employee data to Nostr relays for cross-device access') }}
          </p>
        </div>
        <UBadge
          :color="isSynced ? 'green' : 'gray'"
          variant="subtle"
          :label="isSynced ? t('employees.synced', 'Synced') : t('employees.notSynced', 'Not synced')"
        />
      </div>

      <!-- Sync Info -->
      <div class="space-y-3 text-sm">
        <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <UIcon name="i-heroicons-shield-check" class="w-4 h-4" />
          <span>{{ t('employees.encryptedBeforeSync', 'Employee data is encrypted before syncing') }}</span>
        </div>
        <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
          <span>{{ t('employees.accessibleAnyDevice', 'Accessible from any device with company code') }}</span>
        </div>
        <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
          <span>{{ t('employees.autoSyncsOnUpdate', 'Auto-syncs on create and update') }}</span>
        </div>
      </div>

      <div class="flex justify-end mt-4">
        <UButton
          color="primary"
          icon="i-heroicons-cloud-arrow-up"
          :loading="isSyncing"
          @click="syncToNostr"
        >
          {{ t('employees.syncNow', 'Sync Now') }}
        </UButton>
      </div>
    </div>

    <!-- How to Login -->
    <div class="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-primary-500" />
        {{ t('employees.howToLogin', 'How Staff Can Login') }}
      </h3>
      <div class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
        <div class="flex items-start gap-2">
          <UIcon name="i-heroicons-1-circle" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
          <div>
            <strong>{{ t('employees.withPin', 'With PIN') }}:</strong> {{ t('employees.pinLoginInstructions', `Enter ${employee.employeeCode} or select staff name, then enter PIN`) }}
          </div>
        </div>
        <div v-if="npub" class="flex items-start gap-2">
          <UIcon name="i-heroicons-2-circle" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
          <div>
            <strong>{{ t('employees.withNsec', 'With nsec') }}:</strong> {{ t('employees.nsecLoginInstructions', 'Staff enters their Nostr private key (nsec1...) to login') }}
          </div>
        </div>
        <div v-if="npub" class="flex items-start gap-2">
          <UIcon name="i-heroicons-3-circle" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
          <div>
            <strong>{{ t('employees.withNIP07', 'With NIP-07') }}:</strong> {{ t('employees.nip07Instructions', 'Use Alby or nos2x browser extension for one-click login') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
