<script setup lang="ts">
/**
 * 🧾 INVOICING MANAGEMENT PAGE
 * Create, track, and manage invoices
 */

import type { Invoice, InvoiceItem, InvoiceStatus, PaymentMethod } from '~/types';

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});

const { t } = useI18n();
const toast = useToast();
const invoicesStore = useInvoices();
const customersStore = useCustomers();

// Initialize
onMounted(async () => {
  await Promise.all([
    invoicesStore.init(),
    customersStore.init(),
  ]);
});

// UI State
const activeTab = ref<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');
const showInvoiceModal = ref(false);
const showPaymentModal = ref(false);
const showDetailsModal = ref(false);
const selectedInvoice = ref<Invoice | null>(null);
const saving = ref(false);
const searchQuery = ref('');

// Form state
const invoiceForm = ref({
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAddress: '',
  items: [] as Omit<InvoiceItem, 'id'>[],
  taxRate: 0,
  dueDate: '',
  notes: '',
  terms: 'Payment due within 30 days.',
});

const paymentForm = ref({
  amount: 0,
  method: 'cash' as PaymentMethod,
  reference: '',
  notes: '',
});

// Computed
const filteredInvoices = computed(() => {
  let filtered = invoicesStore.invoices.value;

  // Tab filter
  switch (activeTab.value) {
    case 'draft':
      filtered = filtered.filter(i => i.status === 'draft');
      break;
    case 'sent':
      filtered = filtered.filter(i => ['sent', 'viewed'].includes(i.status));
      break;
    case 'paid':
      filtered = filtered.filter(i => i.status === 'paid');
      break;
    case 'overdue':
      filtered = invoicesStore.overdueInvoices.value;
      break;
  }

  // Search filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      i =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q)
    );
  }

  return filtered;
});

// Methods
function openInvoiceModal(invoice?: Invoice) {
  if (invoice) {
    selectedInvoice.value = invoice;
    invoiceForm.value = {
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail || '',
      customerPhone: invoice.customerPhone || '',
      customerAddress: invoice.customerAddress || '',
      items: invoice.items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
      taxRate: invoice.taxRate,
      dueDate: invoice.dueDate.split('T')[0],
      notes: invoice.notes || '',
      terms: invoice.terms || '',
    };
  } else {
    selectedInvoice.value = null;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    invoiceForm.value = {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
      taxRate: 0,
      dueDate: dueDate.toISOString().split('T')[0],
      notes: '',
      terms: 'Payment due within 30 days.',
    };
  }
  showInvoiceModal.value = true;
}

function openPaymentModal(invoice: Invoice) {
  selectedInvoice.value = invoice;
  paymentForm.value = {
    amount: invoice.amountDue,
    method: 'cash',
    reference: '',
    notes: '',
  };
  showPaymentModal.value = true;
}

function openDetailsModal(invoice: Invoice) {
  selectedInvoice.value = invoice;
  showDetailsModal.value = true;
}

function addItem() {
  invoiceForm.value.items.push({
    description: '',
    quantity: 1,
    unitPrice: 0,
    total: 0,
  });
}

function removeItem(index: number) {
  invoiceForm.value.items.splice(index, 1);
}

function updateItemTotal(index: number) {
  const item = invoiceForm.value.items[index];
  item.total = item.quantity * item.unitPrice;
}

const formSubtotal = computed(() =>
  invoiceForm.value.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0)
);

const formTaxAmount = computed(() =>
  Math.round(formSubtotal.value * (invoiceForm.value.taxRate / 100))
);

const formTotal = computed(() =>
  formSubtotal.value + formTaxAmount.value
);

async function saveInvoice() {
  if (!invoiceForm.value.customerName || invoiceForm.value.items.length === 0) {
    toast.add({
      title: t('common.error'),
      description: 'Customer name and at least one item are required',
      color: 'error',
    });
    return;
  }

  saving.value = true;
  try {
    // Calculate item totals
    const items = invoiceForm.value.items.map(i => ({
      ...i,
      total: i.quantity * i.unitPrice,
    }));

    if (selectedInvoice.value) {
      await invoicesStore.updateInvoice(selectedInvoice.value.id, {
        customerName: invoiceForm.value.customerName,
        customerEmail: invoiceForm.value.customerEmail,
        customerPhone: invoiceForm.value.customerPhone,
        customerAddress: invoiceForm.value.customerAddress,
        items: items.map((item, idx) => ({ ...item, id: `item_${idx + 1}` })),
        taxRate: invoiceForm.value.taxRate,
        taxAmount: formTaxAmount.value,
        subtotal: formSubtotal.value,
        total: formTotal.value,
        amountDue: formTotal.value - (selectedInvoice.value.amountPaid || 0),
        dueDate: new Date(invoiceForm.value.dueDate).toISOString(),
        notes: invoiceForm.value.notes,
        terms: invoiceForm.value.terms,
      });
      toast.add({
        title: t('common.success'),
        description: 'Invoice updated',
        color: 'success',
        icon: 'i-heroicons-check-circle',
      });
    } else {
      await invoicesStore.createInvoice({
        customerName: invoiceForm.value.customerName,
        customerEmail: invoiceForm.value.customerEmail,
        customerPhone: invoiceForm.value.customerPhone,
        customerAddress: invoiceForm.value.customerAddress,
        items,
        taxRate: invoiceForm.value.taxRate,
        dueDate: new Date(invoiceForm.value.dueDate).toISOString(),
        notes: invoiceForm.value.notes,
        terms: invoiceForm.value.terms,
      });
      toast.add({
        title: t('common.success'),
        description: 'Invoice created',
        color: 'success',
        icon: 'i-heroicons-check-circle',
      });
    }
    showInvoiceModal.value = false;
  } catch (e) {
    toast.add({
      title: t('common.error'),
      description: String(e),
      color: 'error',
    });
  } finally {
    saving.value = false;
  }
}

async function recordPayment() {
  if (!selectedInvoice.value || paymentForm.value.amount <= 0) return;

  saving.value = true;
  try {
    await invoicesStore.recordPayment(
      selectedInvoice.value.id,
      paymentForm.value.amount,
      paymentForm.value.method,
      {
        reference: paymentForm.value.reference,
        notes: paymentForm.value.notes,
      }
    );
    toast.add({
      title: t('common.success'),
      description: 'Payment recorded',
      color: 'success',
      icon: 'i-heroicons-check-circle',
    });
    showPaymentModal.value = false;
  } catch (e) {
    toast.add({
      title: t('common.error'),
      description: String(e),
      color: 'error',
    });
  } finally {
    saving.value = false;
  }
}

async function sendInvoiceAction(invoice: Invoice) {
  await invoicesStore.sendInvoice(invoice.id);
  toast.add({
    title: t('common.success'),
    description: 'Invoice marked as sent',
    color: 'success',
    icon: 'i-heroicons-paper-airplane',
  });
}

async function deleteInvoiceAction(invoice: Invoice) {
  if (!confirm('Delete this invoice?')) return;
  
  await invoicesStore.deleteInvoice(invoice.id);
  toast.add({
    title: t('common.success'),
    description: 'Invoice deleted',
    color: 'warning',
  });
}

// Helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('lo-LA', {
    style: 'currency',
    currency: 'LAK',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type BadgeColor = 'red' | 'orange' | 'amber' | 'yellow' | 'green' | 'blue' | 'gray' | 'primary';

function getStatusColor(status: InvoiceStatus): BadgeColor {
  const colors: Record<string, BadgeColor> = {
    draft: 'gray',
    sent: 'blue',
    viewed: 'blue',
    paid: 'green',
    partial: 'yellow',
    overdue: 'red',
    cancelled: 'gray',
  };
  return colors[status] || 'gray';
}

function getStatusLabel(status: InvoiceStatus): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    viewed: 'Viewed',
    paid: 'Paid',
    partial: 'Partial',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center px-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          🧾 {{ t('invoicing.title', 'Invoicing') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          {{ t('invoicing.description', 'Create and manage invoices') }}
        </p>
      </div>
      <UButton
        color="primary"
        size="lg"
        icon="i-heroicons-plus"
        :label="t('invoicing.createInvoice', 'Create Invoice')"
        @click="openInvoiceModal()"
      />
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 px-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl">
            📝
          </div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Draft</div>
            <div class="text-2xl font-bold text-gray-600">{{ invoicesStore.stats.value.draftCount }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl">
            📤
          </div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Sent</div>
            <div class="text-2xl font-bold text-blue-600">{{ invoicesStore.stats.value.sentCount }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xl">
            ✅
          </div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Paid</div>
            <div class="text-2xl font-bold text-green-600">{{ invoicesStore.stats.value.paidCount }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xl">
            ⚠️
          </div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Overdue</div>
            <div class="text-2xl font-bold text-red-600">{{ invoicesStore.stats.value.overdueCount }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xl">
            💰
          </div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Outstanding</div>
            <div class="text-lg font-bold text-purple-600">{{ formatCurrency(invoicesStore.stats.value.outstandingAmount) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-4 items-center px-4">
      <div class="flex gap-2">
        <UButton
          :color="activeTab === 'all' ? 'primary' : 'neutral'"
          :variant="activeTab === 'all' ? 'solid' : 'ghost'"
          label="All"
          @click="activeTab = 'all'"
        />
        <UButton
          :color="activeTab === 'draft' ? 'primary' : 'neutral'"
          :variant="activeTab === 'draft' ? 'solid' : 'ghost'"
          label="Draft"
          @click="activeTab = 'draft'"
        />
        <UButton
          :color="activeTab === 'sent' ? 'primary' : 'neutral'"
          :variant="activeTab === 'sent' ? 'solid' : 'ghost'"
          label="Sent"
          @click="activeTab = 'sent'"
        />
        <UButton
          :color="activeTab === 'paid' ? 'primary' : 'neutral'"
          :variant="activeTab === 'paid' ? 'solid' : 'ghost'"
          label="Paid"
          @click="activeTab = 'paid'"
        />
        <UButton
          :color="activeTab === 'overdue' ? 'primary' : 'neutral'"
          :variant="activeTab === 'overdue' ? 'solid' : 'ghost'"
          label="Overdue"
          @click="activeTab = 'overdue'"
        >
          <template v-if="invoicesStore.stats.value.overdueCount > 0" #trailing>
            <UBadge color="red" size="xs" :label="String(invoicesStore.stats.value.overdueCount)" />
          </template>
        </UButton>
      </div>

      <UInput
        v-model="searchQuery"
        placeholder="Search invoices..."
        icon="i-heroicons-magnifying-glass"
        class="w-64"
      />
    </div>

    <!-- Invoice Table -->
    <div class="overflow-x-auto">
      <div class="bg-white dark:bg-gray-800 overflow-hidden border-gray-200 dark:border-gray-700">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Invoice #</th>
              <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Customer</th>
              <th class="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
              <th class="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Paid</th>
              <th class="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Due</th>
              <th class="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th class="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Due Date</th>
              <th class="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="invoice in filteredInvoices"
              :key="invoice.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              @click="openDetailsModal(invoice)"
            >
              <td class="py-3 px-4">
                <span class="font-mono text-sm text-primary-600 dark:text-primary-400">
                  {{ invoice.invoiceNumber }}
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="font-medium text-gray-900 dark:text-white">{{ invoice.customerName }}</div>
                <div v-if="invoice.customerEmail" class="text-sm text-gray-500">{{ invoice.customerEmail }}</div>
              </td>
              <td class="py-3 px-4 text-right font-medium">
                {{ formatCurrency(invoice.total) }}
              </td>
              <td class="py-3 px-4 text-right text-green-600">
                {{ formatCurrency(invoice.amountPaid) }}
              </td>
              <td class="py-3 px-4 text-right" :class="invoice.amountDue > 0 ? 'text-red-600 font-medium' : 'text-gray-400'">
                {{ formatCurrency(invoice.amountDue) }}
              </td>
              <td class="py-3 px-4 text-center">
                <UBadge :color="getStatusColor(invoice.status)" :label="getStatusLabel(invoice.status)" variant="subtle" />
              </td>
              <td class="py-3 px-4 text-right text-sm text-gray-500">
                {{ formatDate(invoice.dueDate) }}
              </td>
              <td class="py-3 px-4" @click.stop>
                <div class="flex items-center justify-center gap-1">
                  <UButton
                    v-if="invoice.status === 'draft'"
                    color="blue"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-paper-airplane"
                    @click="sendInvoiceAction(invoice)"
                  />
                  <UButton
                    v-if="invoice.amountDue > 0"
                    color="green"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-banknotes"
                    @click="openPaymentModal(invoice)"
                  />
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-pencil"
                    @click="openInvoiceModal(invoice)"
                  />
                  <UButton
                    color="red"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-trash"
                    @click="deleteInvoiceAction(invoice)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div v-if="filteredInvoices.length === 0" class="text-center py-12">
          <div class="text-6xl mb-4">🧾</div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {{ t('invoicing.noInvoices', 'No invoices yet') }}
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-4">
            {{ t('invoicing.createFirst', 'Create your first invoice') }}
          </p>
          <UButton
            color="primary"
            :label="t('invoicing.createInvoice', 'Create Invoice')"
            @click="openInvoiceModal()"
          />
        </div>
      </div>
    </div>

    <!-- Create/Edit Invoice Modal -->
    <UModal v-model:open="showInvoiceModal" :overlay="true">
      <template #content>
        <UCard class="max-w-2xl">
          <template #header>
            <div class="flex items-center gap-3">
              <span class="text-2xl">🧾</span>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ selectedInvoice ? 'Edit Invoice' : 'Create Invoice' }}
              </h3>
            </div>
          </template>

          <div class="space-y-4 max-h-[60vh] overflow-y-auto">
            <!-- Customer Info -->
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Customer Name" required>
                <UInput v-model="invoiceForm.customerName" placeholder="Customer name" />
              </UFormField>
              <UFormField label="Email">
                <UInput v-model="invoiceForm.customerEmail" type="email" placeholder="Email" />
              </UFormField>
              <UFormField label="Phone">
                <UInput v-model="invoiceForm.customerPhone" placeholder="Phone" />
              </UFormField>
              <UFormField label="Due Date" required>
                <UInput v-model="invoiceForm.dueDate" type="date" />
              </UFormField>
            </div>

            <UFormField label="Address">
              <UTextarea v-model="invoiceForm.customerAddress" placeholder="Customer address" :rows="2" />
            </UFormField>

            <!-- Items -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Items</label>
                <UButton size="xs" color="primary" variant="ghost" icon="i-heroicons-plus" label="Add Item" @click="addItem" />
              </div>

              <div class="space-y-2">
                <div
                  v-for="(item, index) in invoiceForm.items"
                  :key="index"
                  class="grid grid-cols-12 gap-2 items-end"
                >
                  <div class="col-span-5">
                    <UInput v-model="item.description" placeholder="Description" size="sm" />
                  </div>
                  <div class="col-span-2">
                    <UInput v-model.number="item.quantity" type="number" placeholder="Qty" size="sm" @change="updateItemTotal(index)" />
                  </div>
                  <div class="col-span-2">
                    <UInput v-model.number="item.unitPrice" type="number" placeholder="Price" size="sm" @change="updateItemTotal(index)" />
                  </div>
                  <div class="col-span-2 text-right font-medium text-sm py-2">
                    {{ formatCurrency(item.quantity * item.unitPrice) }}
                  </div>
                  <div class="col-span-1">
                    <UButton
                      size="xs"
                      color="red"
                      variant="ghost"
                      icon="i-heroicons-x-mark"
                      :disabled="invoiceForm.items.length === 1"
                      @click="removeItem(index)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Totals -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-500">Subtotal</span>
                <span class="font-medium">{{ formatCurrency(formSubtotal) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-500">Tax Rate (%)</span>
                <UInput v-model.number="invoiceForm.taxRate" type="number" class="w-24" size="sm" />
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Tax Amount</span>
                <span>{{ formatCurrency(formTaxAmount) }}</span>
              </div>
              <div class="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span class="text-primary-600">{{ formatCurrency(formTotal) }}</span>
              </div>
            </div>

            <!-- Notes -->
            <UFormField label="Notes">
              <UTextarea v-model="invoiceForm.notes" placeholder="Additional notes" :rows="2" />
            </UFormField>

            <UFormField label="Payment Terms">
              <UInput v-model="invoiceForm.terms" placeholder="Payment terms" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" label="Cancel" @click="showInvoiceModal = false" />
              <UButton color="primary" label="Save Invoice" :loading="saving" @click="saveInvoice" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Payment Modal -->
    <UModal v-model:open="showPaymentModal" :overlay="true">
      <template #content>
        <UCard class="max-w-md">
          <template #header>
            <div class="flex items-center gap-3">
              <span class="text-2xl">💰</span>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Record Payment</h3>
            </div>
          </template>

          <div class="space-y-4">
            <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div class="text-sm text-gray-500">Invoice</div>
              <div class="font-medium">{{ selectedInvoice?.invoiceNumber }}</div>
              <div class="text-sm text-gray-500 mt-1">Amount Due: <span class="text-red-600 font-medium">{{ formatCurrency(selectedInvoice?.amountDue || 0) }}</span></div>
            </div>

            <UFormField label="Payment Amount" required>
              <UInput v-model.number="paymentForm.amount" type="number" :max="selectedInvoice?.amountDue" />
            </UFormField>

            <UFormField label="Payment Method">
              <USelect
                v-model="paymentForm.method"
                :items="[
                  { value: 'cash', label: '💵 Cash' },
                  { value: 'bank_transfer', label: '🏦 Bank Transfer' },
                  { value: 'lightning', label: '⚡ Lightning' },
                ]"
                value-key="value"
                label-key="label"
              />
            </UFormField>

            <UFormField label="Reference">
              <UInput v-model="paymentForm.reference" placeholder="Transaction reference" />
            </UFormField>

            <UFormField label="Notes">
              <UInput v-model="paymentForm.notes" placeholder="Payment notes" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" label="Cancel" @click="showPaymentModal = false" />
              <UButton color="green" label="Record Payment" :loading="saving" @click="recordPayment" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Invoice Details Modal -->
    <UModal v-model:open="showDetailsModal" :overlay="true">
      <template #content>
        <UCard v-if="selectedInvoice" class="max-w-2xl">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">🧾</span>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ selectedInvoice.invoiceNumber }}
                  </h3>
                  <UBadge :color="getStatusColor(selectedInvoice.status)" :label="getStatusLabel(selectedInvoice.status)" size="sm" />
                </div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-primary-600">{{ formatCurrency(selectedInvoice.total) }}</div>
                <div v-if="selectedInvoice.amountDue > 0" class="text-sm text-red-600">
                  Due: {{ formatCurrency(selectedInvoice.amountDue) }}
                </div>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <!-- Customer Info -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-sm text-gray-500">Customer</div>
                <div class="font-medium">{{ selectedInvoice.customerName }}</div>
                <div v-if="selectedInvoice.customerEmail" class="text-sm text-gray-500">{{ selectedInvoice.customerEmail }}</div>
                <div v-if="selectedInvoice.customerPhone" class="text-sm text-gray-500">{{ selectedInvoice.customerPhone }}</div>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500">Issue Date</div>
                <div>{{ formatDate(selectedInvoice.issueDate) }}</div>
                <div class="text-sm text-gray-500 mt-2">Due Date</div>
                <div>{{ formatDate(selectedInvoice.dueDate) }}</div>
              </div>
            </div>

            <!-- Items -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-gray-500">
                    <th class="text-left py-2">Description</th>
                    <th class="text-right py-2">Qty</th>
                    <th class="text-right py-2">Price</th>
                    <th class="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in selectedInvoice.items" :key="item.id" class="border-t border-gray-100 dark:border-gray-800">
                    <td class="py-2">{{ item.description }}</td>
                    <td class="py-2 text-right">{{ item.quantity }}</td>
                    <td class="py-2 text-right">{{ formatCurrency(item.unitPrice) }}</td>
                    <td class="py-2 text-right font-medium">{{ formatCurrency(item.total) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Totals -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-1">
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">Subtotal</span>
                <span>{{ formatCurrency(selectedInvoice.subtotal) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">Tax ({{ selectedInvoice.taxRate }}%)</span>
                <span>{{ formatCurrency(selectedInvoice.taxAmount) }}</span>
              </div>
              <div class="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>Total</span>
                <span>{{ formatCurrency(selectedInvoice.total) }}</span>
              </div>
            </div>

            <!-- Payments -->
            <div v-if="selectedInvoice.payments.length > 0" class="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 class="font-medium mb-2">Payment History</h4>
              <div class="space-y-2">
                <div
                  v-for="payment in selectedInvoice.payments"
                  :key="payment.id"
                  class="flex justify-between items-center text-sm p-2 bg-green-50 dark:bg-green-900/20 rounded"
                >
                  <div>
                    <span class="font-medium text-green-700 dark:text-green-400">{{ formatCurrency(payment.amount) }}</span>
                    <span class="text-gray-500 ml-2">via {{ payment.method }}</span>
                  </div>
                  <span class="text-gray-500">{{ formatDate(payment.paidAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-between">
              <div class="flex gap-2">
                <UButton
                  v-if="selectedInvoice.status === 'draft'"
                  color="blue"
                  variant="soft"
                  icon="i-heroicons-paper-airplane"
                  label="Send"
                  @click="sendInvoiceAction(selectedInvoice); showDetailsModal = false"
                />
                <UButton
                  v-if="selectedInvoice.amountDue > 0"
                  color="green"
                  variant="soft"
                  icon="i-heroicons-banknotes"
                  label="Record Payment"
                  @click="showDetailsModal = false; openPaymentModal(selectedInvoice)"
                />
              </div>
              <UButton color="neutral" variant="ghost" label="Close" @click="showDetailsModal = false" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
