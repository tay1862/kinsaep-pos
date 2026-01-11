<script setup lang="ts">
/**
 * 📇 Customer Contact Card Component
 * Displays contact information with view/edit modes
 */
import type { LoyaltyMember } from "~/types";

interface Props {
  customer: LoyaltyMember;
  isEditing: boolean;
}

const props = defineProps<Props>();

const editForm = defineModel<Partial<LoyaltyMember>>("editForm", {
  required: true,
});

const { t } = useI18n();
</script>

<template>
  <UCard class="lg:col-span-2">
    <template #header>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        {{ t("customers.contactInfo") }}
      </h3>
    </template>

    <!-- View Mode -->
    <div v-if="!isEditing" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t("customers.email") }}
          </p>
          <p class="font-medium text-gray-900 dark:text-white">
            {{ customer.email || "-" }}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t("customers.phone") }}
          </p>
          <p class="font-medium text-gray-900 dark:text-white">
            {{ customer.phone || "-" }}
          </p>
        </div>
        <div class="md:col-span-2">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t("customers.address") }}
          </p>
          <p class="font-medium text-gray-900 dark:text-white">
            {{ customer.address || "-" }}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t("customers.nostrPubkey") }}
          </p>
          <p class="font-mono text-sm text-gray-900 dark:text-white truncate">
            {{ customer.nostrPubkey || "-" }}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t("customers.lightningAddress") }}
          </p>
          <p class="font-medium text-primary-600 dark:text-primary-400">
            {{ customer.lightningAddress || "-" }}
          </p>
        </div>
      </div>
    </div>

    <!-- Edit Mode -->
    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField :label="t('customers.name')">
          <UInput v-model="editForm.name" />
        </UFormField>
        <UFormField :label="t('customers.email')">
          <UInput v-model="editForm.email" type="email" />
        </UFormField>
        <UFormField :label="t('customers.phone')">
          <UInput v-model="editForm.phone" />
        </UFormField>
        <UFormField :label="t('customers.lightningAddress')">
          <UInput v-model="editForm.lightningAddress" />
        </UFormField>
        <UFormField :label="t('customers.address')" class="md:col-span-2">
          <UTextarea v-model="editForm.address" :rows="2" />
        </UFormField>
      </div>
    </div>
  </UCard>
</template>
