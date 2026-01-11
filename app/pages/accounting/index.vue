<script setup lang="ts">
/**
 * 💰 Accounting Dashboard
 * Financial management hub using extracted tab components
 * Supports Global (IFRS) and Lao Country (LAO-GAAP) standards
 */
import type { AccountingStandard } from '~/types/accounting';

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const { formatCurrency } = useCurrency();

// Composables
const accounting = useAccounting();
const invoicesStore = useInvoices();
const expensesStore = useExpenses();

// Active tab state
const activeTab = ref<
  "overview" | "invoices" | "expenses" | "journal" | "reports" | "settings"
>("overview");

// Tab definitions for UTabs
const tabs = computed(() => [
  { label: t('accounting.tabs.overview'), icon: 'i-heroicons-chart-pie', value: 'overview', slot: 'overview' },
  { label: t('accounting.tabs.invoices'), icon: 'i-heroicons-document-text', value: 'invoices', slot: 'invoices' },
  { label: t('accounting.tabs.expenses'), icon: 'i-heroicons-credit-card', value: 'expenses', slot: 'expenses' },
  { label: t('accounting.tabs.journal'), icon: 'i-heroicons-book-open', value: 'journal', slot: 'journal' },
  { label: t('accounting.tabs.reports'), icon: 'i-heroicons-chart-bar', value: 'reports', slot: 'reports' },
  { label: t('accounting.tabs.settings'), icon: 'i-heroicons-cog-6-tooth', value: 'settings', slot: 'settings' },
]);

// Sync state
const syncingToNostr = ref(false);
const lastSyncTime = ref<Date | null>(null);

// Date range filter
const dateRange = ref({
  start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0],
  end: new Date().toISOString().split("T")[0],
});

// Settings state
const accountingEnabled = ref(true);
const selectedStandard = ref<AccountingStandard>('lao');
const vatRate = ref(10);
const autoPost = ref(true);

// Modals
const showInvoiceModal = ref(false);
const showExpenseModal = ref(false);
const showJournalModal = ref(false);

// ============================================
// 📊 COMPUTED DATA
// ============================================

const financialOverview = computed(() => {
  const pnl = accounting.getProfitAndLoss();
  const bs = accounting.getBalanceSheet();
  return {
    revenue: pnl.totalRevenue,
    expenses: pnl.totalExpenses,
    profit: pnl.netIncome,
    profitMargin: pnl.totalRevenue > 0 ? Math.round((pnl.netIncome / pnl.totalRevenue) * 100) : 0,
    accountsReceivable: accounting.getAccountBalance(accounting.accountMapping.value.accountsReceivable),
    accountsPayable: accounting.getAccountBalance(accounting.accountMapping.value.accountsPayable),
    cashBalance: accounting.getAccountBalance(accounting.accountMapping.value.cashLak),
    lightningBalance: accounting.getAccountBalance(accounting.accountMapping.value.lightning),
  };
});

const chartOfAccounts = computed(() =>
  accounting.activeAccounts.value.map(a => ({
    code: a.code,
    name: a.name,
    nameLao: a.nameLao,
    type: a.type,
    balance: accounting.getAccountBalance(a.code),
  }))
);

const invoices = computed(() => 
  invoicesStore.invoices.value.map(inv => ({
    id: inv.invoiceNumber || inv.id,
    customer: inv.customerName,
    amount: inv.total,
    status: inv.status,
    dueDate: inv.dueDate,
    paidDate: inv.paidDate || null,
  }))
);

const expenses = computed(() => 
  expensesStore.expenses.value.slice(0, 10).map(exp => ({
    id: exp.id,
    description: exp.description,
    category: exp.category,
    amount: exp.amount,
    date: exp.date,
    status: 'paid',
  }))
);

const journalEntries = computed(() =>
  accounting.journalEntries.value.slice(0, 10).map(entry => ({
    id: entry.entryNumber || entry.id,
    date: entry.date,
    description: entry.description,
    status: entry.status,
    lines: entry.lines.map(line => ({
      account: `${line.accountCode} - ${line.accountName}`,
      debit: line.debit,
      credit: line.credit,
    })),
  }))
);

// ============================================
// 🔧 ACTIONS
// ============================================

async function saveSettings() {
  await accounting.updateSettings({
    standard: selectedStandard.value,
    vatRate: vatRate.value / 100,
    autoPostJournals: autoPost.value,
  });
  
  if (selectedStandard.value !== accounting.currentStandard.value) {
    await accounting.switchStandard(selectedStandard.value);
  }
}

async function syncToNostr() {
  syncingToNostr.value = true;
  try {
    const journalEntries = accounting.journalEntries.value;
    const accounts = accounting.activeAccounts.value;
    
    localStorage.setItem('accounting_journal_entries', JSON.stringify(journalEntries));
    localStorage.setItem('accounting_accounts', JSON.stringify(accounts));
    localStorage.setItem('accounting_last_sync', new Date().toISOString());
    
    lastSyncTime.value = new Date();
    console.log(`[Accounting] Synced ${journalEntries.length} entries, ${accounts.length} accounts`);
  } catch (e) {
    console.error('[Accounting] Sync failed:', e);
  } finally {
    syncingToNostr.value = false;
  }
}

function exportReport(type: string) {
  let csv = '';
  let filename = '';
  const now = new Date().toISOString().split('T')[0];

  switch (type) {
    case 'income-statement': {
      const pnl = accounting.getProfitAndLoss();
      filename = `income-statement-${now}.csv`;
      csv = [
        'Income Statement / Profit & Loss',
        `Date: ${dateRange.value.start} to ${dateRange.value.end}`,
        '',
        'REVENUE',
        ...pnl.revenue.map(r => `"${r.code} - ${r.name}",${r.amount}`),
        `Total Revenue,${pnl.totalRevenue}`,
        '',
        'EXPENSES',
        ...pnl.expenses.map(e => `"${e.code} - ${e.name}",${e.amount}`),
        `Total Expenses,${pnl.totalExpenses}`,
        '',
        `Net Income,${pnl.netIncome}`,
      ].join('\n');
      break;
    }
    case 'balance-sheet': {
      const bs = accounting.getBalanceSheet();
      filename = `balance-sheet-${now}.csv`;
      csv = [
        'Balance Sheet',
        `Date: ${now}`,
        '',
        'ASSETS',
        ...bs.assets.map(a => `"${a.code} - ${a.name}",${a.balance}`),
        `Total Assets,${bs.totalAssets}`,
        '',
        'LIABILITIES',
        ...bs.liabilities.map(l => `"${l.code} - ${l.name}",${l.balance}`),
        `Total Liabilities,${bs.totalLiabilities}`,
        '',
        'EQUITY',
        ...bs.equity.map(e => `"${e.code} - ${e.name}",${e.balance}`),
        `Total Equity,${bs.totalEquity}`,
      ].join('\n');
      break;
    }
    case 'trial-balance': {
      const tb = accounting.getTrialBalance();
      filename = `trial-balance-${now}.csv`;
      const totalDebit = tb.reduce((sum, a) => sum + a.debit, 0);
      const totalCredit = tb.reduce((sum, a) => sum + a.credit, 0);
      csv = [
        'Trial Balance',
        `Date: ${now}`,
        '',
        'Account Code,Account Name,Debit,Credit',
        ...tb.map(a => 
          `${a.code},"${a.name}",${a.debit > 0 ? a.debit : ''},${a.credit > 0 ? a.credit : ''}`
        ),
        '',
        `TOTAL,,${totalDebit},${totalCredit}`,
        totalDebit === totalCredit ? 'Status: BALANCED' : 'Status: NOT BALANCED',
      ].join('\n');
      break;
    }
    case 'general-ledger': {
      filename = `general-ledger-${now}.csv`;
      const headers = ['Date', 'Entry #', 'Account', 'Description', 'Debit', 'Credit'];
      const rows = accounting.journalEntries.value.flatMap(entry =>
        entry.lines.map(line => [
          entry.date,
          entry.entryNumber,
          `${line.accountCode} - ${line.accountName}`,
          `"${entry.description}"`,
          line.debit || '',
          line.credit || '',
        ].join(','))
      );
      csv = [headers.join(','), ...rows].join('\n');
      break;
    }
    case 'cash-flow': {
      filename = `cash-flow-${now}.csv`;
      const cashAccount = accounting.accountMapping.value.cashLak;
      const cashEntries = accounting.journalEntries.value.filter(e =>
        e.lines.some(l => l.accountCode === cashAccount)
      );
      csv = [
        'Cash Flow Statement',
        `Date: ${dateRange.value.start} to ${dateRange.value.end}`,
        '',
        'Date,Description,Inflow,Outflow',
        ...cashEntries.flatMap(entry =>
          entry.lines.filter(l => l.accountCode === cashAccount).map(line => 
            `${entry.date},"${entry.description}",${line.debit || ''},${line.credit || ''}`
          )
        ),
      ].join('\n');
      break;
    }
    case 'tax-report': {
      filename = `tax-report-${now}.csv`;
      const isLao = accounting.currentStandard.value === 'lao';
      const vatOutputCode = isLao ? '2150' : '21500';
      const vatInputCode = isLao ? '1150' : '11500';
      const vatCollected = accounting.getAccountBalance(vatOutputCode);
      const vatPaid = accounting.getAccountBalance(vatInputCode);
      csv = [
        'Tax Report',
        `Period: ${dateRange.value.start} to ${dateRange.value.end}`,
        '',
        'Category,Amount',
        `VAT Collected (Output),${vatCollected}`,
        `VAT Paid (Input),${vatPaid}`,
        `VAT Payable,${vatCollected - vatPaid}`,
      ].join('\n');
      break;
    }
    default:
      return;
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Modal Forms
const newInvoice = ref({
  customer: '',
  amount: 0,
  dueDate: new Date().toISOString().split('T')[0] as string,
});

const newExpense = ref({
  description: '',
  category: 'other',
  amount: 0,
  date: new Date().toISOString().split('T')[0] as string,
  paymentMethod: 'cash',
});

const newJournalEntry = ref({
  date: new Date().toISOString().split('T')[0] as string,
  description: '',
  lines: [
    { account: '', debit: 0, credit: 0 },
    { account: '', debit: 0, credit: 0 },
  ],
});

// Handlers
async function handleCreateInvoice() {
  await invoicesStore.createInvoice({
    customerName: newInvoice.value.customer,
    items: [{
      description: 'Invoice Item',
      quantity: 1,
      unitPrice: newInvoice.value.amount,
      total: newInvoice.value.amount
    }],
    dueDate: (newInvoice.value.dueDate as string) || new Date().toISOString().split('T')[0]
  });
  showInvoiceModal.value = false;
  // Reset form
  newInvoice.value = {
    customer: '',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0] as string,
  };
}

async function handleCreateExpense() {
  await expensesStore.createExpense({
    description: newExpense.value.description,
    category: newExpense.value.category,
    amount: newExpense.value.amount,
    date: newExpense.value.date || new Date().toISOString().split('T')[0],
    paymentMethod: newExpense.value.paymentMethod,
  });
  showExpenseModal.value = false;
  // Reset form
  newExpense.value = {
    description: '',
    category: 'other',
    amount: 0,
    date: new Date().toISOString().split('T')[0] as string,
    paymentMethod: 'cash',
  };
}

async function handleCreateJournalEntry() {
  await accounting.createJournalEntry(
    newJournalEntry.value.description,
    newJournalEntry.value.lines.map(l => ({
      accountCode: l.account, 
      accountName: '', // Will be resolved by account code
      debit: l.debit,
      credit: l.credit,
      currencyCode: 'LAK', // Default currency
    })),
    {
      date: newJournalEntry.value.date || new Date().toISOString().split('T')[0]
    }
  );
  showJournalModal.value = false;
  // Reset form
  newJournalEntry.value = {
    date: new Date().toISOString().split('T')[0] as string,
    description: '',
    lines: [
      { account: '', debit: 0, credit: 0 },
      { account: '', debit: 0, credit: 0 },
    ],
  };
}

function addJournalLine() {
  newJournalEntry.value.lines.push({ account: '', debit: 0, credit: 0 });
}

function payWithLightning(invoiceId: string) {
  console.log("Pay invoice with Lightning:", invoiceId);
}
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6">
    <!-- Page Header -->
    <CommonPageHeader
      :title="t('accounting.title')"
      :description="t('accounting.subtitle')"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <UInput
            v-model="dateRange.start"
            type="date"
            size="sm"
            class="w-36"
          />
          <span class="text-muted">-</span>
          <UInput v-model="dateRange.end" type="date" size="sm" class="w-36" />
        </div>
      </template>
    </CommonPageHeader>

    <!-- Tab Navigation with Nuxt UI UTabs -->
    <UTabs
      v-model="activeTab"
      :items="tabs"
      variant="pill"
      class="w-full"
    >
      <!-- Overview Tab Content -->
      <template #overview>
        <div class="mt-4">
          <AccountingOverviewTab
            :financial-overview="financialOverview"
            :chart-of-accounts="chartOfAccounts"
          />
        </div>
      </template>

      <!-- Invoices Tab Content -->
      <template #invoices>
        <div class="mt-4">
          <AccountingInvoicesTab
            :invoices="invoices"
            @add="showInvoiceModal = true"
            @pay-lightning="payWithLightning"
          />
        </div>
      </template>

      <!-- Expenses Tab Content -->
      <template #expenses>
        <div class="mt-4">
          <AccountingExpensesTab
            :expenses="expenses"
            @add="showExpenseModal = true"
          />
        </div>
      </template>

      <!-- Journal Tab Content -->
      <template #journal>
        <div class="mt-4">
          <AccountingJournalTab
            :entries="journalEntries"
            @add="showJournalModal = true"
          />
        </div>
      </template>

      <!-- Reports Tab Content -->
      <template #reports>
        <div class="mt-4">
          <AccountingReportsTab
            @export="exportReport"
          />
        </div>
      </template>

      <!-- Settings Tab Content -->
      <template #settings>
        <div class="mt-4">
          <AccountingSettingsTab
            v-model:accounting-enabled="accountingEnabled"
            v-model:selected-standard="selectedStandard"
            v-model:vat-rate="vatRate"
            v-model:auto-post="autoPost"
            :syncing-to-nostr="syncingToNostr"
            :last-sync-time="lastSyncTime"
            @save="saveSettings"
            @sync="syncToNostr"
          />
        </div>
      </template>
    </UTabs>

    <!-- Modals -->
    <AccountingInvoiceModal 
      v-model:open="showInvoiceModal" 
      v-model:form="newInvoice"
      @create="handleCreateInvoice"
    />
    <AccountingExpenseModal 
      v-model:open="showExpenseModal" 
      v-model:form="newExpense"
      @create="handleCreateExpense"
    />
    <AccountingJournalEntryModal 
      v-model:open="showJournalModal" 
      v-model:form="newJournalEntry"
      @create="handleCreateJournalEntry"
      @add-line="addJournalLine"
    />
  </div>
</template>
