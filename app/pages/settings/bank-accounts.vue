<template>
  <UContainer class="py-6 max-w-4xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          🏦 {{ $t("settings.bankAccounts.title") }}
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          {{ $t("settings.bankAccounts.description") }}
        </p>
      </div>
      <UButton color="primary" icon="i-heroicons-plus" @click="openAddModal">
        {{ $t("settings.bankAccounts.addAccount") }}
      </UButton>
    </div>

    <!-- Bank Accounts List -->
    <div v-if="bankAccounts.length > 0" class="space-y-4">
      <UCard v-for="account in bankAccounts" :key="account.id"
        :class="['transition-all', !account.isActive && 'opacity-60']">
        <div class="flex items-start gap-4">
          <!-- Bank Icon -->
          <div class="w-14 h-14 rounded-xl flex items-center justify-center text-3xl" :class="account.isActive
            ? 'bg-primary-100 dark:bg-primary-900/30'
            : 'bg-gray-100 dark:bg-gray-800'
            ">
            {{ getBankIcon(account.id) }}
          </div>

          <!-- Bank Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ account.bankName }}
              </h3>
              <UBadge v-if="account.isDefault" color="primary" variant="soft" size="xs">
                {{ $t("common.default") }}
              </UBadge>
              <UBadge v-if="!account.isActive" color="gray" variant="soft" size="xs">
                {{ $t("common.inactive") }}
              </UBadge>
            </div>
            <p class="font-mono text-sm text-gray-600 dark:text-gray-400">
              {{ account.accountNumber }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-500">
              {{ account.accountName }}
            </p>
          </div>

          <!-- QR Preview (if available) -->
          <div v-if="account.qrCode" class="hidden sm:block">
            <img :src="account.qrCode" :alt="`${account.bankName} QR`"
              class="w-16 h-16 rounded-lg border border-gray-200 dark:border-gray-700" />
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1">
            <UButton v-if="!account.isDefault && account.isActive" color="neutral" variant="ghost" size="sm"
              icon="i-heroicons-star" :title="$t('settings.bankAccounts.setDefault')"
              @click="setAsDefault(account.id)" />
            <UButton color="neutral" variant="ghost" size="sm" icon="i-heroicons-pencil" :title="$t('common.edit')"
              @click="openEditModal(account)" />
            <UButton color="neutral" variant="ghost" size="sm" :icon="account.isActive ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
              " :title="account.isActive
                ? $t('common.deactivate')
                : $t('common.activate')
                " @click="toggleAccountActive(account.id)" />
            <UButton color="red" variant="ghost" size="sm" icon="i-heroicons-trash" :title="$t('common.delete')"
              @click="confirmDelete(account)" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Empty State -->
    <UCard v-else class="text-center py-12">
      <div class="text-6xl mb-4">🏦</div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {{ $t("settings.bankAccounts.empty") }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">
        {{ $t("settings.bankAccounts.emptyDescription") }}
      </p>
      <UButton color="primary" @click="openAddModal">
        {{ $t("settings.bankAccounts.addFirstAccount") }}
      </UButton>
    </UCard>

    <!-- Add/Edit Modal -->
    <UModal v-model:open="showModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          {{
            editingAccount
              ? $t("settings.bankAccounts.editAccount")
              : $t("settings.bankAccounts.addAccount")
          }}
        </h3>
      </template>

      <template #body>
        <div class="space-y-4 p-4">
          <UFormField :label="$t('settings.bankAccounts.bankName')" required>
            <UInput v-model="form.bankName" :placeholder="$t('settings.bankAccounts.bankNamePlaceholder')"
              class="w-full" />
          </UFormField>

          <UFormField :label="$t('settings.bankAccounts.bankCode')">
            <UInput v-model="form.bankCode" :placeholder="$t('settings.bankAccounts.bankCodePlaceholder')"
              class="w-full" />
          </UFormField>

          <UFormField :label="$t('settings.bankAccounts.accountNumber')" required>
            <UInput v-model="form.accountNumber" :placeholder="$t('settings.bankAccounts.accountNumberPlaceholder')
              " class="font-mono w-full" />
          </UFormField>

          <UFormField :label="$t('settings.bankAccounts.accountName')" required>
            <UInput v-model="form.accountName" :placeholder="$t('settings.bankAccounts.accountNamePlaceholder')"
              class="w-full" />
          </UFormField>

          <!-- QR Code Upload -->
          <UFormField :label="$t('settings.bankAccounts.qrCode')">
            <div class="space-y-3">
              <div v-if="form.qrCode" class="flex items-center gap-3">
                <img :src="form.qrCode" alt="Bank QR"
                  class="w-24 h-24 rounded-lg border border-gray-200 dark:border-gray-700" />
                <UButton color="red" variant="outline" size="sm" icon="i-heroicons-trash" @click="form.qrCode = ''">
                  {{ $t("common.remove") }}
                </UButton>
              </div>
              <div v-else>
                <input ref="qrInput" type="file" accept="image/*" class="hidden" @change="handleQRUpload" />
                <UButton color="neutral" variant="outline" icon="i-heroicons-photo" @click="$refs.qrInput?.click()">
                  {{ $t("settings.bankAccounts.uploadQR") }}
                </UButton>
                <p class="text-xs text-gray-500 mt-1">
                  {{ $t("settings.bankAccounts.qrHint") }}
                </p>
              </div>
            </div>
          </UFormField>

          <div class="flex items-center gap-4">
            <UCheckbox v-model="form.isDefault" :label="$t('settings.bankAccounts.setAsDefault')" />
            <UCheckbox v-model="form.isActive" :label="$t('common.active')" />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton color="neutral" variant="outline" block @click="closeModal">
            {{ $t("common.cancel") }}
          </UButton>
          <UButton color="primary" :loading="saving" :disabled="!isFormValid" block @click="saveAccount">
            {{ editingAccount ? $t("common.save") : $t("common.add") }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" :title="$t('settings.bankAccounts.deleteConfirm')">
      <template #body>
        <div class="p-4">
          <p class="text-gray-600 dark:text-gray-400">
            {{
              $t("settings.bankAccounts.deleteWarning", {
                name: deletingAccount?.bankName,
              })
            }}
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="outline" @click="showDeleteModal = false">
            {{ $t("common.cancel") }}
          </UButton>
          <UButton color="red" @click="doDelete">
            {{ $t("common.delete") }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
import type { BankAccount } from "~/types";
useHead({
  title: "Bank Accounts",
});

const { t } = useI18n();
const toast = useToast();
const {
  bankAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  setDefault,
  toggleActive,
  getBankIcon,
} = useBankAccounts();

// Modal state
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingAccount = ref<BankAccount | null>(null);
const deletingAccount = ref<BankAccount | null>(null);
const saving = ref(false);

// Form state
const form = ref({
  bankName: "",
  bankCode: "",
  accountNumber: "",
  accountName: "",
  qrCode: "",
  isDefault: false,
  isActive: true,
});

const isFormValid = computed(() => {
  return (
    form.value.bankName.trim() &&
    form.value.accountNumber.trim() &&
    form.value.accountName.trim()
  );
});

const openAddModal = () => {
  editingAccount.value = null;
  form.value = {
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
    qrCode: "",
    isDefault: bankAccounts.value.length === 0,
    isActive: true,
  };
  showModal.value = true;
};

const openEditModal = (account: BankAccount) => {
  editingAccount.value = account;
  form.value = {
    bankName: account.bankName,
    bankCode: account.bankCode || "",
    accountNumber: account.accountNumber,
    accountName: account.accountName,
    qrCode: account.qrCode || "",
    isDefault: account.isDefault || false,
    isActive: account.isActive,
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingAccount.value = null;
};

const saveAccount = async () => {
  if (!isFormValid.value) return;

  saving.value = true;

  try {
    if (editingAccount.value) {
      updateAccount(editingAccount.value.id, {
        bankName: form.value.bankName,
        bankCode: form.value.bankCode || undefined,
        accountNumber: form.value.accountNumber,
        accountName: form.value.accountName,
        qrCode: form.value.qrCode || undefined,
        isDefault: form.value.isDefault,
        isActive: form.value.isActive,
      });
      toast.add({
        title: t("settings.bankAccounts.updated"),
        color: "success",
      });
    } else {
      addAccount({
        bankName: form.value.bankName,
        bankCode: form.value.bankCode || undefined,
        accountNumber: form.value.accountNumber,
        accountName: form.value.accountName,
        qrCode: form.value.qrCode || undefined,
        isDefault: form.value.isDefault,
        isActive: form.value.isActive,
      });
      toast.add({
        title: t("settings.bankAccounts.added"),
        color: "success",
      });
    }

    closeModal();
  } catch (error) {
    console.error("Failed to save account:", error);
    toast.add({
      title: t("common.error"),
      description: t("settings.bankAccounts.saveFailed"),
      color: "error",
    });
  } finally {
    saving.value = false;
  }
};

const setAsDefault = (id: string) => {
  setDefault(id);
  toast.add({
    title: t("settings.bankAccounts.defaultSet"),
    color: "success",
  });
};

const toggleAccountActive = (id: string) => {
  toggleActive(id);
};

const confirmDelete = (account: BankAccount) => {
  deletingAccount.value = account;
  showDeleteModal.value = true;
};

const doDelete = () => {
  if (deletingAccount.value) {
    deleteAccount(deletingAccount.value.id);
    toast.add({
      title: t("settings.bankAccounts.deleted"),
      color: "success",
    });
  }
  showDeleteModal.value = false;
  deletingAccount.value = null;
};

const handleQRUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    form.value.qrCode = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};
</script>
