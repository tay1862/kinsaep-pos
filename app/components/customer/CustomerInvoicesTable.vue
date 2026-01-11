<script setup lang="ts">
/**
 * 🧾 Customer Invoices Table Component
 * Displays customer invoices with status and actions
 */

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: string;
  dueDate: string;
  paidDate?: string;
}

interface Props {
  invoices: Invoice[];
  customerId: string;
}

defineProps<Props>();

const emit = defineEmits<{
  createInvoice: [];
  viewInvoice: [id: string];
  printInvoice: [id: string];
  payInvoice: [id: string];
}>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();

// Status colors
const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ t("accounting.tabs.invoices", "Invoices") }}
        </h3>
        <UButton
          size="sm"
          icon="i-heroicons-plus"
          @click="emit('createInvoice')"
        >
          {{ t("accounting.createInvoice") }}
        </UButton>
      </div>
    </template>

    <!-- Empty State -->
    <div
      v-if="invoices.length === 0"
      class="text-center py-8 text-gray-500 dark:text-gray-400"
    >
      <UIcon
        name="i-heroicons-document-text"
        class="w-12 h-12 mx-auto mb-2 opacity-50"
      />
      <p>{{ t("accounting.noInvoices", "No invoices yet") }}</p>
    </div>

    <!-- Invoices Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr
            class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
          >
            <th class="pb-3 font-medium">
              {{ t("accounting.invoiceNumber") }}
            </th>
            <th class="pb-3 font-medium">{{ t("accounting.date") }}</th>
            <th class="pb-3 font-medium text-right">
              {{ t("accounting.amount") }}
            </th>
            <th class="pb-3 font-medium">{{ t("accounting.dueDate") }}</th>
            <th class="pb-3 font-medium">{{ t("accounting.status") }}</th>
            <th class="pb-3 font-medium text-right">
              {{ t("common.actions") }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
          <tr v-for="invoice in invoices" :key="invoice.id" class="text-sm">
            <td class="py-3 font-medium text-primary-600 dark:text-primary-400">
              {{ invoice.id }}
            </td>
            <td class="py-3 text-gray-600 dark:text-gray-400">
              {{ invoice.date }}
            </td>
            <td
              class="py-3 text-right font-medium text-gray-900 dark:text-white"
            >
              {{ formatCurrency(invoice.amount) }}
            </td>
            <td class="py-3 text-gray-600 dark:text-gray-400">
              {{ invoice.dueDate }}
            </td>
            <td class="py-3">
              <span
                :class="statusColors[invoice.status] || statusColors.pending"
                class="px-2 py-0.5 rounded-full text-xs font-medium"
              >
                {{ invoice.status }}
              </span>
            </td>
            <td class="py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <UButton
                  size="xs"
                  variant="ghost"
                  icon="i-heroicons-eye"
                  @click="emit('viewInvoice', invoice.id)"
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  icon="i-heroicons-printer"
                  @click="emit('printInvoice', invoice.id)"
                />
                <UButton
                  v-if="invoice.status !== 'paid'"
                  size="xs"
                  variant="ghost"
                  icon="i-heroicons-bolt"
                  color="amber"
                  @click="emit('payInvoice', invoice.id)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
