<script setup lang="ts">
/**
 * 🧾 Accounting Invoices Tab
 * Invoice list with overdue highlighting and quick Lightning payments
 */

interface Invoice {
  id: string;
  customer: string;
  amount: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
}

const props = defineProps<{
  invoices: Invoice[];
}>();

const emit = defineEmits<{
  add: [];
  "pay-lightning": [id: string];
}>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();

function getStatusColor(
  status: string
): "success" | "warning" | "error" | "info" {
  const colors: Record<string, "success" | "warning" | "error" | "info"> = {
    paid: "success",
    pending: "warning",
    overdue: "error",
    draft: "info",
  };
  return colors[status] || "info";
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

function isOverdue(invoice: Invoice): boolean {
  if (invoice.status === "paid") return false;
  return new Date(invoice.dueDate) < new Date();
}

function getDaysUntilDue(invoice: Invoice): number {
  const now = new Date();
  const due = new Date(invoice.dueDate);
  const diff = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

// Summary stats
const totalOutstanding = computed(() =>
  props.invoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + inv.amount, 0)
);

const overdueCount = computed(
  () => props.invoices.filter((inv) => isOverdue(inv)).length
);
</script>

<template>
  <div class="space-y-6">
    <!-- Quick Stats -->
    <div class="grid grid-cols-2 gap-4" v-if="invoices.length > 0">
      <div
        class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800"
      >
        <div class="flex items-center gap-3">
          <div class="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg">
            <UIcon
              name="i-heroicons-clock"
              class="w-5 h-5 text-amber-600 dark:text-amber-400"
            />
          </div>
          <div>
            <p class="text-sm text-amber-700 dark:text-amber-300">
              Outstanding
            </p>
            <p class="font-bold text-lg text-amber-800 dark:text-amber-200">
              {{ formatCurrency(totalOutstanding) }}
            </p>
          </div>
        </div>
      </div>
      <div
        class="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800"
      >
        <div class="flex items-center gap-3">
          <div class="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-5 h-5 text-red-600 dark:text-red-400"
            />
          </div>
          <div>
            <p class="text-sm text-red-700 dark:text-red-300">Overdue</p>
            <p class="font-bold text-lg text-red-800 dark:text-red-200">
              {{ overdueCount }} invoices
            </p>
          </div>
        </div>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-document-text"
                class="w-5 h-5 text-green-600 dark:text-green-400"
              />
            </div>
            <h3 class="text-lg font-semibold">
              {{ t("accounting.tabs.invoices") }}
            </h3>
          </div>
          <div class="flex gap-2">
            <NuxtLinkLocale to="/invoicing">
              <UButton
                variant="outline"
                icon="i-heroicons-arrow-top-right-on-square"
                size="sm"
              >
                {{ t("common.viewAll") }}
              </UButton>
            </NuxtLinkLocale>
            <UButton icon="i-heroicons-plus" size="sm" @click="emit('add')">
              {{ t("accounting.createInvoice") }}
            </UButton>
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div v-if="invoices.length === 0" class="text-center py-12">
        <div
          class="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center"
        >
          <UIcon name="i-heroicons-document-text" class="w-8 h-8 text-muted" />
        </div>
        <h4 class="font-medium mb-1">{{ t("accounting.noInvoices") }}</h4>
        <p class="text-sm text-muted mb-4">
          Create your first invoice to start tracking payments
        </p>
        <UButton icon="i-heroicons-plus" @click="emit('add')">
          {{ t("accounting.createFirstInvoice") }}
        </UButton>
      </div>

      <!-- Invoice List -->
      <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <div
          v-for="invoice in invoices.slice(0, 10)"
          :key="invoice.id"
          class="py-4 flex items-center justify-between rounded-lg transition-colors"
          :class="{
            'bg-red-50/50 dark:bg-red-900/10 -mx-4 px-4': isOverdue(invoice),
          }"
        >
          <div class="flex items-center gap-4">
            <div
              class="p-2 rounded-lg"
              :class="
                isOverdue(invoice)
                  ? 'bg-red-100 dark:bg-red-800/50'
                  : 'bg-gray-100 dark:bg-gray-800'
              "
            >
              <UIcon
                name="i-heroicons-document-text"
                class="w-5 h-5"
                :class="
                  isOverdue(invoice)
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                "
              />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <p class="font-medium">{{ invoice.id }}</p>
                <UBadge
                  v-if="isOverdue(invoice)"
                  color="error"
                  variant="subtle"
                  size="xs"
                >
                  <UIcon
                    name="i-heroicons-exclamation-circle"
                    class="w-3 h-3 mr-1"
                  />
                  {{ Math.abs(getDaysUntilDue(invoice)) }}d overdue
                </UBadge>
                <UBadge
                  v-else-if="
                    invoice.status !== 'paid' && getDaysUntilDue(invoice) <= 3
                  "
                  color="warning"
                  variant="subtle"
                  size="xs"
                >
                  Due in {{ getDaysUntilDue(invoice) }}d
                </UBadge>
              </div>
              <p class="text-sm text-muted">{{ invoice.customer }}</p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <p
                class="font-mono font-bold"
                :class="
                  isOverdue(invoice) ? 'text-red-600 dark:text-red-400' : ''
                "
              >
                {{ formatCurrency(invoice.amount) }}
              </p>
              <p class="text-xs text-muted">
                {{
                  invoice.paidDate
                    ? formatDate(invoice.paidDate)
                    : formatDate(invoice.dueDate)
                }}
              </p>
            </div>
            <UBadge :color="getStatusColor(invoice.status)" variant="subtle">
              {{ invoice.status }}
            </UBadge>
            <!-- Lightning Pay Button -->
            <UButton
              v-if="invoice.status !== 'paid'"
              variant="soft"
              icon="i-heroicons-bolt"
              size="xs"
              color="amber"
              class="hover:scale-110 transition-transform"
              @click.stop="emit('pay-lightning', invoice.id)"
            >
              Pay
            </UButton>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
