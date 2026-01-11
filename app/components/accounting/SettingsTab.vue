<script setup lang="ts">
/**
 * ⚙️ Accounting Settings Tab
 * Configure accounting standards, VAT, and Nostr sync
 */
import type { AccountingStandard } from '~/types/accounting';

interface Props {
  accountingEnabled: boolean;
  selectedStandard: AccountingStandard;
  vatRate: number;
  autoPost: boolean;
  syncingToNostr: boolean;
  lastSyncTime: Date | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:accountingEnabled': [value: boolean];
  'update:selectedStandard': [value: AccountingStandard];
  'update:vatRate': [value: number];
  'update:autoPost': [value: boolean];
  'save': [];
  'sync': [];
}>();

const { t } = useI18n();

const standardOptions = [
  { label: 'Lao Country (LAO-GAAP)', value: 'lao' },
  { label: 'Global (IFRS)', value: 'global' },
];
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">{{ t('accounting.settings.title') }}</h3>
      </template>

      <div class="space-y-6">
        <!-- Enable Accounting -->
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p class="font-medium">{{ t('accounting.settings.enableAccounting') }}</p>
            <p class="text-sm text-muted">
              {{ t('accounting.settings.enableAccountingDesc') }}
            </p>
          </div>
          <USwitch
            :model-value="accountingEnabled"
            @update:model-value="emit('update:accountingEnabled', $event)"
          />
        </div>

        <!-- Accounting Standard -->
        <UFormField :label="t('accounting.settings.standard')">
          <USelect
            :model-value="selectedStandard"
            :items="standardOptions"
            value-key="value"
            label-key="label"
            @update:model-value="emit('update:selectedStandard', $event)"
          />
          <template #hint>
            <span v-if="selectedStandard === 'lao'">
              {{ t('accounting.settings.laoHint') }}
            </span>
            <span v-else>
              {{ t('accounting.settings.globalHint') }}
            </span>
          </template>
        </UFormField>

        <!-- VAT Rate -->
        <UFormField :label="t('accounting.settings.vatRate')">
          <UInput
            :model-value="vatRate"
            type="number"
            min="0"
            max="100"
            step="0.5"
            @update:model-value="emit('update:vatRate', Number($event))"
          >
            <template #trailing>
              <span class="text-muted">%</span>
            </template>
          </UInput>
        </UFormField>

        <!-- Auto Post Toggle -->
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p class="font-medium">{{ t('accounting.settings.autoPost') }}</p>
            <p class="text-sm text-muted">
              {{ t('accounting.settings.autoPostDesc') }}
            </p>
          </div>
          <USwitch
            :model-value="autoPost"
            @update:model-value="emit('update:autoPost', $event)"
          />
        </div>

        <!-- Nostr Sync -->
        <div class="p-4 border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-purple-200 dark:bg-purple-800 rounded-lg">
                <UIcon name="i-heroicons-cloud-arrow-up" class="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p class="font-medium text-purple-700 dark:text-purple-300">
                  {{ t('accounting.settings.nostrSync') }}
                </p>
                <p class="text-sm text-purple-600 dark:text-purple-400">
                  {{ lastSyncTime ? `${t('common.lastSync')}: ${lastSyncTime.toLocaleString()}` : t('common.notSyncedYet') }}
                </p>
              </div>
            </div>
            <UButton
              variant="outline"
              color="purple"
              :loading="syncingToNostr"
              icon="i-heroicons-arrow-path"
              @click="emit('sync')"
            >
              {{ t('common.syncNow') }}
            </UButton>
          </div>
        </div>

        <!-- Save Button -->
        <div class="pt-4 border-t">
          <UButton color="primary" icon="i-heroicons-check" @click="emit('save')">
            {{ t('common.saveSettings') }}
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
