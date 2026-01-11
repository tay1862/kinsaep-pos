<template>
  <UContainer>
    <CommonPageHeader
      :title="$t('accounting.ledger.title')"
      :description="$t('accounting.ledger.description')"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton
            variant="outline"
            icon="i-heroicons-arrow-down-tray"
            @click="exportLedger"
          >
            {{ $t('common.export') }}
          </UButton>
          <UButton
            icon="i-heroicons-plus"
            @click="navigateTo('/accounting')"
          >
            {{ $t('accounting.ledger.newEntry') }}
          </UButton>
        </div>
      </template>
    </CommonPageHeader>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary">{{ stats.totalEntries }}</p>
          <p class="text-sm text-muted">{{ $t('accounting.ledger.totalEntries') }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-green-600">{{ formatCurrency(stats.totalDebits) }}</p>
          <p class="text-sm text-muted">{{ $t('accounting.ledger.totalDebits') }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-red-600">{{ formatCurrency(stats.totalCredits) }}</p>
          <p class="text-sm text-muted">{{ $t('accounting.ledger.totalCredits') }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold" :class="stats.balance >= 0 ? 'text-blue-600' : 'text-error'">
            {{ formatCurrency(stats.balance) }}
          </p>
          <p class="text-sm text-muted">{{ $t('accounting.ledger.netBalance') }}</p>
        </div>
      </UCard>
    </div>

    <!-- Filters -->
    <UCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <UFormField :label="$t('accounting.ledger.filterAccount')">
          <USelect
            v-model="filters.accountCode"
            :items="accountOptions"
            value-key="value"
            label-key="label"
            :placeholder="$t('common.all')"
          />
        </UFormField>
        <UFormField :label="$t('accounting.ledger.startDate')">
          <UInput v-model="filters.startDate" type="date" />
        </UFormField>
        <UFormField :label="$t('accounting.ledger.endDate')">
          <UInput v-model="filters.endDate" type="date" />
        </UFormField>
        <UFormField :label="$t('accounting.ledger.status')">
          <USelect
            v-model="filters.status"
            :items="statusOptions"
            value-key="value"
            label-key="label"
          />
        </UFormField>
        <UFormField :label="$t('common.search')">
          <UInput
            v-model="filters.search"
            icon="i-heroicons-magnifying-glass"
            :placeholder="$t('accounting.ledger.searchPlaceholder')"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Selected Account Details -->
    <UCard v-if="selectedAccount" class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold">{{ selectedAccount.code }} - {{ selectedAccount.name }}</h3>
          <p v-if="selectedAccount.nameLao" class="text-muted">{{ selectedAccount.nameLao }}</p>
        </div>
        <div class="text-right">
          <p class="text-sm text-muted">{{ $t('accounting.ledger.currentBalance') }}</p>
          <p
            class="text-2xl font-bold"
            :class="accountBalance >= 0 ? 'text-blue-600' : 'text-error'"
          >
            {{ formatCurrency(accountBalance) }}
          </p>
        </div>
      </div>
    </UCard>

    <!-- Ledger Entries Table -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ $t('accounting.ledger.entries') }}</h3>
          <UBadge variant="subtle">
            {{ filteredEntries.length }} {{ $t('accounting.ledger.entriesCount') }}
          </UBadge>
        </div>
      </template>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="flex gap-4 items-center py-3">
          <USkeleton class="h-4 w-24" />
          <USkeleton class="h-4 w-32" />
          <USkeleton class="h-4 flex-1" />
          <USkeleton class="h-4 w-20" />
          <USkeleton class="h-4 w-20" />
        </div>
      </div>

      <div v-else-if="filteredEntries.length === 0" class="text-center py-8">
        <UIcon name="i-heroicons-document-text" class="text-4xl text-muted mb-2" />
        <p class="text-muted">{{ $t('accounting.ledger.noEntries') }}</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-sm text-muted border-b border-gray-200 dark:border-gray-700">
              <th class="pb-3 font-medium">{{ $t('accounting.ledger.date') }}</th>
              <th class="pb-3 font-medium">{{ $t('accounting.ledger.entryNumber') }}</th>
              <th class="pb-3 font-medium">{{ $t('accounting.ledger.account') }}</th>
              <th class="pb-3 font-medium">{{ $t('accounting.ledger.description') }}</th>
              <th class="pb-3 font-medium text-right">{{ $t('accounting.debit') }}</th>
              <th class="pb-3 font-medium text-right">{{ $t('accounting.credit') }}</th>
              <th class="pb-3 font-medium text-center">{{ $t('common.status') }}</th>
              <th class="pb-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <template v-for="entry in filteredEntries" :key="entry.id">
              <tr
                v-for="(line, idx) in entry.lines"
                :key="`${entry.id}-${idx}`"
                class="text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td class="py-3">
                  <span v-if="idx === 0">{{ formatDate(entry.date) }}</span>
                </td>
                <td class="py-3">
                  <span v-if="idx === 0" class="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {{ entry.entryNumber }}
                  </span>
                </td>
                <td class="py-3">
                  <span class="font-mono">{{ line.accountCode }}</span>
                  <span class="text-muted ml-2">{{ line.accountName }}</span>
                </td>
                <td class="py-3 max-w-xs truncate" :title="line.description">
                  {{ line.description || entry.description }}
                </td>
                <td class="py-3 text-right font-mono">
                  <span v-if="line.debit > 0" class="text-green-600">
                    {{ formatCurrency(line.debit) }}
                  </span>
                </td>
                <td class="py-3 text-right font-mono">
                  <span v-if="line.credit > 0" class="text-red-600">
                    {{ formatCurrency(line.credit) }}
                  </span>
                </td>
                <td class="py-3 text-center">
                  <UBadge
                    v-if="idx === 0"
                    :color="entry.status === 'posted' ? 'success' : 'warning'"
                    variant="subtle"
                    size="xs"
                  >
                    {{ entry.status }}
                  </UBadge>
                </td>
                <td class="py-3">
                  <UButton
                    v-if="idx === 0"
                    variant="ghost"
                    icon="i-heroicons-eye"
                    size="xs"
                    @click="viewEntry(entry)"
                  />
                </td>
              </tr>
            </template>
          </tbody>
          <tfoot class="border-t-2 border-gray-300 dark:border-gray-600">
            <tr class="font-bold">
              <td colspan="4" class="py-3 text-right">{{ $t('common.total') }}:</td>
              <td class="py-3 text-right font-mono text-green-600">{{ formatCurrency(stats.totalDebits) }}</td>
              <td class="py-3 text-right font-mono text-red-600">{{ formatCurrency(stats.totalCredits) }}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </UCard>

    <!-- Entry Detail Modal -->
    <UModal v-model:open="showDetailModal">
      <template #header>
        <h3 class="font-semibold">
          {{ $t('accounting.ledger.entryDetail') }} - {{ selectedEntry?.entryNumber }}
        </h3>
      </template>
      <template #body>
        <div v-if="selectedEntry" class="space-y-4">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted">{{ $t('accounting.ledger.date') }}:</span>
              <span class="ml-2 font-medium">{{ formatDate(selectedEntry.date) }}</span>
            </div>
            <div>
              <span class="text-muted">{{ $t('common.status') }}:</span>
              <UBadge
                :color="selectedEntry.status === 'posted' ? 'success' : 'warning'"
                variant="subtle"
                size="xs"
                class="ml-2"
              >
                {{ selectedEntry.status }}
              </UBadge>
            </div>
            <div class="col-span-2">
              <span class="text-muted">{{ $t('accounting.description') }}:</span>
              <span class="ml-2">{{ selectedEntry.description }}</span>
            </div>
          </div>

          <div class="border-t pt-4">
            <h4 class="font-medium mb-3">{{ $t('accounting.journalLines') }}</h4>
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-muted border-b">
                  <th class="pb-2">{{ $t('accounting.account') }}</th>
                  <th class="pb-2 text-right">{{ $t('accounting.debit') }}</th>
                  <th class="pb-2 text-right">{{ $t('accounting.credit') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr v-for="line in selectedEntry.lines" :key="line.id">
                  <td class="py-2">
                    <span class="font-mono">{{ line.accountCode }}</span>
                    {{ line.accountName }}
                  </td>
                  <td class="py-2 text-right font-mono">
                    <span v-if="line.debit > 0" class="text-green-600">{{ formatCurrency(line.debit) }}</span>
                  </td>
                  <td class="py-2 text-right font-mono">
                    <span v-if="line.credit > 0" class="text-red-600">{{ formatCurrency(line.credit) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton @click="showDetailModal = false">{{ $t('common.close') }}</UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
import type { JournalEntry } from '~/types/accounting'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const { format: formatCurrency } = useCurrency()

const accounting = useAccounting()

// Initialize
const loading = ref(true)
onMounted(async () => {
  await accounting.init()
  // Set account filter from query param
  if (route.query.account) {
    filters.accountCode = route.query.account as string
  }
  loading.value = false
})

// State
const showDetailModal = ref(false)
const selectedEntry = ref<JournalEntry | null>(null)

const filters = reactive({
  accountCode: '',
  startDate: '',
  endDate: '',
  status: '',
  search: ''
})

// Options
const accountOptions = computed(() => [
  { value: '', label: t('common.all') },
  ...accounting.activeAccounts.value.map(a => ({
    value: a.code,
    label: `${a.code} - ${a.name}`
  }))
])

const statusOptions = computed(() => [
  { value: '', label: t('common.all') },
  { value: 'posted', label: t('accounting.ledger.posted') },
  { value: 'draft', label: t('accounting.ledger.draft') },
])

// Computed
const selectedAccount = computed(() => {
  if (!filters.accountCode) return null
  return accounting.activeAccounts.value.find(a => a.code === filters.accountCode)
})

const accountBalance = computed(() => {
  if (!filters.accountCode) return 0
  return accounting.getAccountBalance(filters.accountCode)
})

const filteredEntries = computed(() => {
  let entries = [...accounting.journalEntries.value]

  // Filter by account
  if (filters.accountCode) {
    entries = entries.filter(e =>
      e.lines.some(l => l.accountCode === filters.accountCode)
    )
  }

  // Filter by date
  if (filters.startDate) {
    entries = entries.filter(e => e.date >= filters.startDate)
  }
  if (filters.endDate) {
    entries = entries.filter(e => e.date <= filters.endDate)
  }

  // Filter by status
  if (filters.status) {
    entries = entries.filter(e => e.status === filters.status)
  }

  // Search
  if (filters.search) {
    const query = filters.search.toLowerCase()
    entries = entries.filter(e =>
      e.description.toLowerCase().includes(query) ||
      e.entryNumber.toLowerCase().includes(query) ||
      e.lines.some(l =>
        l.accountCode.toLowerCase().includes(query) ||
        l.accountName.toLowerCase().includes(query)
      )
    )
  }

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const stats = computed(() => {
  let totalDebits = 0
  let totalCredits = 0

  for (const entry of filteredEntries.value) {
    // If filtering by account, only count that account's lines
    const lines = filters.accountCode
      ? entry.lines.filter(l => l.accountCode === filters.accountCode)
      : entry.lines

    for (const line of lines) {
      totalDebits += line.debit
      totalCredits += line.credit
    }
  }

  return {
    totalEntries: filteredEntries.value.length,
    totalDebits,
    totalCredits,
    balance: totalDebits - totalCredits
  }
})

// Methods
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString()
}

function viewEntry(entry: JournalEntry) {
  selectedEntry.value = entry
  showDetailModal.value = true
}

function exportLedger() {
  const headers = ['Date', 'Entry #', 'Account Code', 'Account Name', 'Description', 'Debit', 'Credit', 'Status']
  const rows: string[][] = []

  for (const entry of filteredEntries.value) {
    for (const line of entry.lines) {
      rows.push([
        entry.date,
        entry.entryNumber,
        line.accountCode,
        line.accountName,
        `"${line.description || entry.description}"`,
        line.debit.toString(),
        line.credit.toString(),
        entry.status
      ])
    }
  }

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ledger-entries-${filters.accountCode || 'all'}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)

  toast.add({ title: t('accounting.ledger.exportSuccess'), color: 'success' })
}
</script>
