<script setup lang="ts">
/**
 * 📄 Customer Contracts Card Component
 * Displays customer contracts with status and details
 */

interface Contract {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  value: number;
  status: string;
}

interface Props {
  contracts: Contract[];
  customerId: string;
}

defineProps<Props>();

const emit = defineEmits<{
  addContract: [];
  viewContract: [id: string];
  downloadContract: [id: string];
}>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();

// Status colors
const statusColors: Record<string, string> = {
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ t("customers.contracts", "Contracts") }}
        </h3>
        <UButton size="sm" icon="i-heroicons-plus" @click="emit('addContract')">
          {{ t("customers.addContract", "Add Contract") }}
        </UButton>
      </div>
    </template>

    <!-- Empty State -->
    <div
      v-if="contracts.length === 0"
      class="text-center py-8 text-gray-500 dark:text-gray-400"
    >
      <UIcon
        name="i-heroicons-document-duplicate"
        class="w-12 h-12 mx-auto mb-2 opacity-50"
      />
      <p>{{ t("customers.noContracts", "No contracts yet") }}</p>
    </div>

    <!-- Contracts List -->
    <div v-else class="space-y-4">
      <div
        v-for="contract in contracts"
        :key="contract.id"
        class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ contract.title }}
              </h4>
              <span
                :class="statusColors[contract.status] || statusColors.draft"
                class="px-2 py-0.5 rounded-full text-xs font-medium"
              >
                {{ contract.status }}
              </span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ contract.id }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-lg font-bold text-primary-600 dark:text-primary-400">
              {{ formatCurrency(contract.value) }}
            </p>
          </div>
        </div>

        <div
          class="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
        >
          <span>
            {{ t("customers.startDate", "Start") }}: {{ contract.startDate }}
          </span>
          <span>
            {{ t("customers.endDate", "End") }}: {{ contract.endDate }}
          </span>
        </div>

        <div class="mt-3 flex gap-2">
          <UButton
            size="xs"
            variant="outline"
            icon="i-heroicons-eye"
            @click="emit('viewContract', contract.id)"
          >
            {{ t("common.view", "View") }}
          </UButton>
          <UButton
            size="xs"
            variant="outline"
            icon="i-heroicons-document-arrow-down"
            @click="emit('downloadContract', contract.id)"
          >
            {{ t("common.download", "Download") }}
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
