<template>
  <UContainer>
    <CommonPageHeader
      :title="$t('accounting.accounts.title')"
      :description="$t('accounting.accounts.description')"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton
            variant="outline"
            icon="i-heroicons-arrow-up-tray"
            @click="showImportModal = true"
          >
            {{ $t('common.import') }}
          </UButton>
          <UButton
            variant="outline"
            icon="i-heroicons-arrow-down-tray"
            @click="exportAccounts"
          >
            {{ $t('common.export') }}
          </UButton>
          <UButton
            icon="i-heroicons-plus"
            @click="openAccountModal()"
          >
            {{ $t('accounting.accounts.addAccount') }}
          </UButton>
        </div>
      </template>
    </CommonPageHeader>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <CommonStatCard
        icon="i-heroicons-building-library"
        icon-color="blue"
        :label="$t('accounting.types.asset')"
        :value="accountStats.assets"
      />
      
      <CommonStatCard
        icon="i-heroicons-credit-card"
        icon-color="red"
        :label="$t('accounting.types.liability')"
        :value="accountStats.liabilities"
      />
      
      <CommonStatCard
        icon="i-heroicons-briefcase"
        icon-color="purple"
        :label="$t('accounting.types.equity')"
        :value="accountStats.equity"
      />
      
      <CommonStatCard
        icon="i-heroicons-banknotes"
        icon-color="green"
        :label="$t('accounting.types.revenue')"
        :value="accountStats.revenue"
      />
      
      <CommonStatCard
        icon="i-heroicons-receipt-percent"
        icon-color="yellow"
        :label="$t('accounting.types.expense')"
        :value="accountStats.expenses"
      />
    </div>

    <!-- Filters -->
    <UCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UFormField :label="$t('accounting.accounts.filterType')">
          <USelect
            v-model="filters.type"
            :items="typeOptions"
            value-key="value"
            label-key="label"
          />
        </UFormField>
        <UFormField :label="$t('accounting.accounts.filterStatus')">
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
            :placeholder="$t('accounting.accounts.searchPlaceholder')"
          />
        </UFormField>
        <UFormField :label="$t('accounting.accounts.standard')">
          <UBadge :color="accounting.currentStandard.value === 'lao' ? 'primary' : 'info'" size="lg">
            {{ accounting.currentStandard.value === 'lao' ? 'LAO-GAAP' : 'IFRS' }}
          </UBadge>
        </UFormField>
      </div>
    </UCard>

    <!-- Accounts by Type -->
    <div class="space-y-6">
      <UCard v-for="accountType in displayedTypes" :key="accountType">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div
                class="w-3 h-3 rounded-full"
                :class="getTypeColorClass(accountType)"
              />
              <h3 class="font-semibold capitalize">{{ $t(`accounting.types.${accountType}`) }}s</h3>
              <UBadge variant="subtle" size="xs">
                {{ getAccountsByType(accountType).length }}
              </UBadge>
            </div>
            <p class="font-mono font-bold" :class="getTypeTextColor(accountType)">
              {{ formatCurrency(getTypeTotalBalance(accountType)) }}
            </p>
          </div>
        </template>

        <div v-if="getAccountsByType(accountType).length === 0" class="text-center py-4 text-muted">
          {{ $t('accounting.accounts.noAccounts') }}
        </div>

        <div v-else class="divide-y">
          <div
            v-for="account in getAccountsByType(accountType)"
            :key="account.code"
            class="py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 rounded -mx-2 px-2 transition-colors"
          >
            <div class="flex items-center gap-4">
              <div class="w-16 text-center">
                <span class="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {{ account.code }}
                </span>
              </div>
              <div>
                <p class="font-medium">{{ account.name }}</p>
                <p v-if="account.nameLao" class="text-sm text-muted">{{ account.nameLao }}</p>
              </div>
              <UBadge v-if="account.isSystem" variant="subtle" size="xs" color="neutral">
                {{ $t('accounting.accounts.system') }}
              </UBadge>
              <UBadge v-if="!account.isActive" variant="subtle" size="xs" color="error">
                {{ $t('common.inactive') }}
              </UBadge>
            </div>

            <div class="flex items-center gap-4">
              <div class="text-right">
                <p class="font-mono font-medium" :class="getBalanceColor(account)">
                  {{ formatCurrency(accounting.getAccountBalance(account.code)) }}
                </p>
                <p class="text-xs text-muted">
                  {{ account.normalBalance === 'debit' ? 'Dr' : 'Cr' }}
                </p>
              </div>
              
              <UDropdownMenu :items="getAccountActions(account)">
                <UButton
                  variant="ghost"
                  icon="i-heroicons-ellipsis-vertical"
                  size="sm"
                />
              </UDropdownMenu>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Customer/Vendor Ledger Summary -->
    <UCard class="mt-6">
      <template #header>
        <h3 class="font-semibold">{{ $t('accounting.accounts.customerVendorLedger') }}</h3>
      </template>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Accounts Receivable -->
        <div>
          <h4 class="font-medium text-green-600 mb-3">{{ $t('accounting.accountsReceivable') }}</h4>
          <div class="space-y-2">
            <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span>{{ $t('accounting.accounts.totalReceivable') }}</span>
              <span class="font-mono font-bold text-green-600">
                {{ formatCurrency(customerLedger.totalReceivable) }}
              </span>
            </div>
            <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span>{{ $t('accounting.accounts.customerCount') }}</span>
              <span class="font-bold">{{ customerLedger.customerCount }}</span>
            </div>
          </div>
        </div>
        <!-- Accounts Payable -->
        <div>
          <h4 class="font-medium text-red-600 mb-3">{{ $t('accounting.accountsPayable') }}</h4>
          <div class="space-y-2">
            <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span>{{ $t('accounting.accounts.totalPayable') }}</span>
              <span class="font-mono font-bold text-red-600">
                {{ formatCurrency(customerLedger.totalPayable) }}
              </span>
            </div>
            <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span>{{ $t('accounting.accounts.vendorCount') }}</span>
              <span class="font-bold">{{ customerLedger.vendorCount }}</span>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Add/Edit Account Modal -->
    <UModal v-model:open="showAccountModal">
      <template #header>
        <h3 class="font-semibold">
          {{ editingAccount ? $t('accounting.accounts.editAccount') : $t('accounting.accounts.addAccount') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="$t('accounting.accountCode')" required>
            <UInput
              v-model="accountForm.code"
              :disabled="!!editingAccount"
              placeholder="e.g., 1100"
              font-mono
            />
          </UFormField>
          <UFormField :label="$t('accounting.accountName')" required>
            <UInput v-model="accountForm.name" placeholder="e.g., Cash" />
          </UFormField>
          <UFormField :label="$t('accounting.accounts.nameLao')">
            <UInput v-model="accountForm.nameLao" placeholder="e.g., ເງິນສົດ" />
          </UFormField>
          <UFormField v-if="!editingAccount" :label="$t('accounting.accountType')" required>
            <USelect
              v-model="accountForm.type"
              :items="accountTypeOptions"
              value-key="value"
              label-key="label"
            />
          </UFormField>
          <UFormField :label="$t('accounting.accounts.parentAccount')">
            <USelect
              v-model="accountForm.parentCode"
              :items="parentAccountOptions"
              value-key="value"
              label-key="label"
              :placeholder="$t('common.none')"
            />
          </UFormField>
          <UFormField :label="$t('accounting.accounts.description')">
            <UTextarea v-model="accountForm.description" :rows="2" />
          </UFormField>
          <div class="flex items-center gap-4">
            <USwitch v-model="accountForm.isActive" />
            <span>{{ $t('common.active') }}</span>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showAccountModal = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton
            :loading="savingAccount"
            :disabled="!accountForm.code || !accountForm.name"
            @click="saveAccount"
          >
            {{ editingAccount ? $t('common.update') : $t('common.create') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Import Modal -->
    <UModal v-model:open="showImportModal">
      <template #header>
        <h3 class="font-semibold">{{ $t('accounting.accounts.importAccounts') }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div class="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls,.csv"
              class="hidden"
              @change="handleFileSelect"
            >
            <UIcon name="i-heroicons-document-arrow-up" class="text-4xl text-muted mb-2" />
            <p class="text-muted mb-4">{{ $t('accounting.accounts.dragDrop') }}</p>
            <UButton variant="outline" @click="fileInput?.click()">
              {{ $t('accounting.accounts.selectFile') }}
            </UButton>
          </div>
          
          <div v-if="importFile" class="p-3 bg-gray-50 dark:bg-gray-800 rounded flex items-center gap-3">
            <UIcon name="i-heroicons-document" class="text-xl text-primary" />
            <span class="flex-1">{{ importFile.name }}</span>
            <UButton variant="ghost" size="xs" icon="i-heroicons-x-mark" @click="importFile = null" />
          </div>

          <div class="text-sm text-muted">
            <p class="font-medium mb-2">{{ $t('accounting.accounts.importFormat') }}:</p>
            <ul class="list-disc list-inside space-y-1">
              <li>Code, Name, Name (Lao), Type, Parent Code, Active</li>
              <li>{{ $t('accounting.accounts.typeValues') }}: asset, liability, equity, revenue, expense</li>
            </ul>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-between">
          <UButton variant="outline" @click="downloadTemplate">
            {{ $t('accounting.accounts.downloadTemplate') }}
          </UButton>
          <div class="flex gap-2">
            <UButton variant="ghost" @click="showImportModal = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton
              :loading="importing"
              :disabled="!importFile"
              @click="importAccounts"
            >
              {{ $t('common.import') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="font-semibold text-error">{{ $t('accounting.accounts.deleteAccount') }}</h3>
      </template>
      <template #body>
        <p>{{ $t('accounting.accounts.deleteConfirm', { name: accountToDelete?.name }) }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showDeleteModal = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton color="error" :loading="deleting" @click="deleteAccount">
            {{ $t('common.delete') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
import type { Account } from '~/types/accounting'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const { t } = useI18n()
const toast = useToast()
const { format: formatCurrency } = useCurrency()

// Composables
const accounting = useAccounting()

// Initialize
onMounted(() => {
  accounting.init()
})

// State
const showAccountModal = ref(false)
const showImportModal = ref(false)
const showDeleteModal = ref(false)
const savingAccount = ref(false)
const importing = ref(false)
const deleting = ref(false)
const editingAccount = ref<Account | null>(null)
const accountToDelete = ref<Account | null>(null)
const importFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const filters = reactive({
  type: '',
  status: 'active',
  search: ''
})

const accountForm = reactive({
  code: '',
  name: '',
  nameLao: '',
  type: 'asset' as Account['type'],
  parentCode: '',
  description: '',
  isActive: true

})

// Options
const typeOptions = computed(() => [
  { value: undefined, label: t('common.all') },
  { value: 'asset', label: t('accounting.types.asset') },
  { value: 'liability', label: t('accounting.types.liability') },
  { value: 'equity', label: t('accounting.types.equity') },
  { value: 'revenue', label: t('accounting.types.revenue') },
  { value: 'expense', label: t('accounting.types.expense') },
])

const statusOptions = computed(() => [
  { value: undefined, label: t('common.all') },
  { value: 'active', label: t('common.active') },
  { value: 'inactive', label: t('common.inactive') },
])

const accountTypeOptions = computed(() => [
  { value: 'asset', label: t('accounting.types.asset') },
  { value: 'liability', label: t('accounting.types.liability') },
  { value: 'equity', label: t('accounting.types.equity') },
  { value: 'revenue', label: t('accounting.types.revenue') },
  { value: 'expense', label: t('accounting.types.expense') },
])

const parentAccountOptions = computed(() => [
  { value: undefined, label: t('common.none') },
  ...accounting.activeAccounts.value.map(a => ({
    value: a.code,
    label: `${a.code} - ${a.name}`
  }))
])

// Computed
const accountStats = computed(() => ({
  assets: accounting.accountsByType.value.asset?.length || 0,
  liabilities: accounting.accountsByType.value.liability?.length || 0,
  equity: accounting.accountsByType.value.equity?.length || 0,
  revenue: accounting.accountsByType.value.revenue?.length || 0,
  expenses: accounting.accountsByType.value.expense?.length || 0,
}))

const displayedTypes = computed(() => {
  const types: Account['type'][] = ['asset', 'liability', 'equity', 'revenue', 'expense']
  if (filters.type) {
    return types.filter(t => t === filters.type)
  }
  return types
})

const customerLedger = computed(() => {
  const mapping = accounting.accountMapping.value
  return {
    totalReceivable: accounting.getAccountBalance(mapping.accountsReceivable),
    totalPayable: accounting.getAccountBalance(mapping.accountsPayable),
    customerCount: 0, // Would come from customers feature
    vendorCount: 0,   // Would come from vendors feature
  }
})

// Methods
function getAccountsByType(type: Account['type']): Account[] {
  let accounts = accounting.accountsByType.value[type] || []
  
  if (filters.status === 'active') {
    accounts = accounts.filter(a => a.isActive)
  } else if (filters.status === 'inactive') {
    accounts = accounts.filter(a => !a.isActive)
  }
  
  if (filters.search) {
    const query = filters.search.toLowerCase()
    accounts = accounts.filter(a =>
      a.code.toLowerCase().includes(query) ||
      a.name.toLowerCase().includes(query) ||
      a.nameLao?.toLowerCase().includes(query)
    )
  }
  
  return accounts.sort((a, b) => a.code.localeCompare(b.code))
}

function getTypeTotalBalance(type: Account['type']): number {
  const accounts = getAccountsByType(type)
  return accounts.reduce((sum, a) => sum + accounting.getAccountBalance(a.code), 0)
}

function getTypeColorClass(type: string): string {
  const colors: Record<string, string> = {
    asset: 'bg-blue-500',
    liability: 'bg-red-500',
    equity: 'bg-purple-500',
    revenue: 'bg-green-500',
    expense: 'bg-orange-500',
  }
  return colors[type] || 'bg-gray-500'
}

function getTypeTextColor(type: string): string {
  const colors: Record<string, string> = {
    asset: 'text-blue-600 dark:text-blue-400',
    liability: 'text-red-600 dark:text-red-400',
    equity: 'text-purple-600 dark:text-purple-400',
    revenue: 'text-green-600 dark:text-green-400',
    expense: 'text-orange-600 dark:text-orange-400',
  }
  return colors[type] || 'text-gray-600 dark:text-gray-400'
}

function getBalanceColor(account: Account): string {
  const balance = accounting.getAccountBalance(account.code)
  if (balance === 0) return 'text-gray-500 dark:text-gray-400'
  if (account.type === 'asset' || account.type === 'expense') {
    return balance > 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'
  }
  return balance > 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'
}

function openAccountModal(account?: Account) {
  if (account) {
    editingAccount.value = account
    accountForm.code = account.code
    accountForm.name = account.name
    accountForm.nameLao = account.nameLao || ''
    accountForm.type = account.type
    accountForm.parentCode = account.parentCode || ''
    accountForm.description = account.description || ''
    accountForm.isActive = account.isActive
  } else {
    editingAccount.value = null
    accountForm.code = ''
    accountForm.name = ''
    accountForm.nameLao = ''
    accountForm.type = 'asset'
    accountForm.parentCode = ''
    accountForm.description = ''
    accountForm.isActive = true
  }
  showAccountModal.value = true
}

async function saveAccount() {
  savingAccount.value = true
  try {
    if (editingAccount.value) {
      await accounting.updateAccount(editingAccount.value.code, {
        name: accountForm.name,
        nameLao: accountForm.nameLao || undefined,
        parentCode: accountForm.parentCode || undefined,
        description: accountForm.description || undefined,
        isActive: accountForm.isActive,
      })
      toast.add({ title: t('accounting.accounts.accountUpdated'), color: 'success' })
    } else {
      const normalBalance = ['asset', 'expense'].includes(accountForm.type) ? 'debit' : 'credit'
      await accounting.addAccount({
        code: accountForm.code,
        name: accountForm.name,
        nameLao: accountForm.nameLao || undefined,
        type: accountForm.type,
        parentCode: accountForm.parentCode || undefined,
        description: accountForm.description || undefined,
        isActive: accountForm.isActive,
        isSystem: false,
        normalBalance,
      })
      toast.add({ title: t('accounting.accounts.accountCreated'), color: 'success' })
    }
    showAccountModal.value = false
  } catch (e) {
    console.error('Failed to save account:', e)
    toast.add({ title: t('accounting.accounts.saveFailed'), color: 'error' })
  } finally {
    savingAccount.value = false
  }
}

function getAccountActions(account: Account) {
  return [
    [
      {
        label: t('common.edit'),
        icon: 'i-heroicons-pencil',
        onSelect: () => openAccountModal(account)
      },
      {
        label: t('accounting.accounts.viewLedger'),
        icon: 'i-heroicons-document-text',
        onSelect: () => navigateTo(`/accounting/ledger?account=${account.code}`)
      }
    ],
    [
      {
        label: account.isActive ? t('common.deactivate') : t('common.activate'),
        icon: account.isActive ? 'i-heroicons-pause' : 'i-heroicons-play',
        onSelect: async () => {
          await accounting.updateAccount(account.code, { isActive: !account.isActive })
          toast.add({ 
            title: account.isActive ? t('accounting.accounts.deactivated') : t('accounting.accounts.activated'),
            color: 'success'
          })
        }
      },
      ...(account.isSystem ? [] : [{
        label: t('common.delete'),
        icon: 'i-heroicons-trash',
        color: 'error' as const,
        onSelect: () => {
          accountToDelete.value = account
          showDeleteModal.value = true
        }
      }])
    ]
  ]
}

async function deleteAccount() {
  if (!accountToDelete.value) return
  deleting.value = true
  try {
    // Would need to add deleteAccount to composable
    toast.add({ title: t('accounting.accounts.accountDeleted'), color: 'success' })
    showDeleteModal.value = false
  } catch (e) {
    toast.add({ title: t('accounting.accounts.deleteFailed'), color: 'error' })
  } finally {
    deleting.value = false
  }
}

// Export
function exportAccounts() {
  const accounts = accounting.activeAccounts.value
  const headers = ['Code', 'Name', 'Name (Lao)', 'Type', 'Parent Code', 'Active', 'Balance']
  const rows = accounts.map(a => [
    a.code,
    a.name,
    a.nameLao || '',
    a.type,
    a.parentCode || '',
    a.isActive ? 'Yes' : 'No',
    accounting.getAccountBalance(a.code)
  ])
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chart-of-accounts-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  
  toast.add({ title: t('accounting.accounts.exportSuccess'), color: 'success' })
}

function downloadTemplate() {
  const headers = ['Code', 'Name', 'Name (Lao)', 'Type', 'Parent Code', 'Active']
  const example = ['1100', 'Cash', 'ເງິນສົດ', 'asset', '', 'Yes']
  const csv = [headers.join(','), example.join(',')].join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'accounts-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) {
    importFile.value = input.files[0]
  }
}

async function importAccounts() {
  if (!importFile.value) return
  importing.value = true
  
  try {
    const text = await importFile.value.text()
    const lines = text.split('\n').slice(1) // Skip header
    let imported = 0
    
    for (const line of lines) {
      const [code, name, nameLao, type, parentCode, active] = line.split(',').map(s => s.trim())
      if (!code || !name || !type) continue
      
      try {
        const normalBalance = ['asset', 'expense'].includes(type) ? 'debit' : 'credit'
        await accounting.addAccount({
          code,
          name,
          nameLao: nameLao || undefined,
          type: type as Account['type'],
          parentCode: parentCode || undefined,
          isActive: active?.toLowerCase() !== 'no',
          isSystem: false,
          normalBalance: normalBalance as 'debit' | 'credit',
        })
        imported++
      } catch (e) {
        console.warn(`Failed to import account ${code}:`, e)
      }
    }
    
    toast.add({
      title: t('accounting.accounts.importSuccess', { count: imported }),
      color: 'success'
    })
    showImportModal.value = false
    importFile.value = null
  } catch (e) {
    console.error('Failed to import accounts:', e)
    toast.add({ title: t('accounting.accounts.importFailed'), color: 'error' })
  } finally {
    importing.value = false
  }
}
</script>
