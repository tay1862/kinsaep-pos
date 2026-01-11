<script setup lang="ts">
/**
 * ⚙️ Accounting Settings Tab Component
 */
import type { AccountingStandard } from "~/types/accounting";

const props = defineProps<{
  accountingEnabled: boolean;
  selectedStandard: AccountingStandard;
  vatRate: number;
  autoPost: boolean;
  accountsCount: number;
}>();

const emit = defineEmits<{
  "update:accountingEnabled": [value: boolean];
  "update:selectedStandard": [value: AccountingStandard];
  "update:vatRate": [value: number];
  "update:autoPost": [value: boolean];
  save: [];
}>();

const { t } = useI18n();

const localEnabled = computed({
  get: () => props.accountingEnabled,
  set: (val: boolean) => emit("update:accountingEnabled", val),
});

const localStandard = computed({
  get: () => props.selectedStandard,
  set: (val: AccountingStandard) => emit("update:selectedStandard", val),
});

const localVatRate = computed({
  get: () => props.vatRate,
  set: (val: number) => emit("update:vatRate", val),
});

const localAutoPost = computed({
  get: () => props.autoPost,
  set: (val: boolean) => emit("update:autoPost", val),
});

const standardOptions = [
  { label: "Lao Country (LAO-GAAP)", value: "lao" },
  { label: "Global (IFRS)", value: "global" },
];
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5 text-gray-500" />
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Accounting Settings
          </h3>
        </div>
      </template>
      <div class="space-y-6">
        <!-- Auto Entries Toggle -->
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              Auto Journal Entries
            </p>
            <p class="text-sm text-gray-500">
              Automatically create journal entries from POS sales, stock
              adjustments, and memberships
            </p>
          </div>
          <USwitch v-model="localEnabled" />
        </div>

        <!-- Accounting Standard -->
        <UFormField label="Accounting Standard" hint="Select your preferred chart of accounts format">
          <USelectMenu v-model="localStandard" :items="standardOptions" value-key="value" class="w-full" />
        </UFormField>

        <div class="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div class="flex items-start gap-3">
            <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-500 mt-0.5" />
            <div class="text-sm">
              <p class="font-medium text-blue-700 dark:text-blue-300">
                {{
                  localStandard === "lao"
                    ? "Lao Country Standard (LAO-GAAP)"
                    : "Global Standard (IFRS)"
                }}
              </p>
              <ul class="mt-1 text-blue-600 dark:text-blue-400 space-y-1">
                <li v-if="localStandard === 'lao'">
                  • 4-digit account codes (1000-6000)
                </li>
                <li v-if="localStandard === 'lao'">
                  • LAK as primary currency
                </li>
                <li v-if="localStandard === 'lao'">
                  • Lao language account names (ບັນຊີ)
                </li>
                <li v-if="localStandard === 'global'">
                  • 5-digit account codes (10000-69000)
                </li>
                <li v-if="localStandard === 'global'">
                  • Multi-currency support
                </li>
                <li v-if="localStandard === 'global'">
                  • IFRS compliant structure
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- VAT Rate -->
        <UFormField label="VAT Rate (%)" hint="Value Added Tax rate for automatic calculations">
          <UInput v-model.number="localVatRate" type="number" min="0" max="100" step="0.5" placeholder="10">
            <template #trailing>
              <span class="text-gray-500">%</span>
            </template>
          </UInput>
        </UFormField>

        <!-- Auto Post Toggle -->
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              Auto-Post Journals
            </p>
            <p class="text-sm text-gray-500">
              Automatically post journal entries without manual approval
            </p>
          </div>
          <USwitch v-model="localAutoPost" />
        </div>

        <!-- Save Button -->
        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
          <UButton color="primary" icon="i-heroicons-check" @click="emit('save')">
            Save Settings
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Current Standard Info -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-gray-900 dark:text-white">
          Current Chart of Accounts
        </h3>
      </template>
      <div class="text-sm text-gray-600 dark:text-gray-400">
        <p>
          You have <strong>{{ accountsCount }}</strong> accounts loaded.
        </p>
        <p class="mt-2">
          Standard:
          <strong>{{
            localStandard === "lao" ? "Lao Country (LAO-GAAP)" : "Global (IFRS)"
            }}</strong>
        </p>
        <p>
          VAT Rate: <strong>{{ localVatRate }}%</strong>
        </p>
        <p>
          Auto-Post:
          <strong>{{ localAutoPost ? "Enabled" : "Disabled" }}</strong>
        </p>
      </div>
    </UCard>
  </div>
</template>
