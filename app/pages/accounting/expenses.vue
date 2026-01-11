<template>
  <UContainer>
    <CommonPageHeader
      :title="$t('accounting.expenses.title')"
      :description="$t('accounting.expenses.description')"
    >
      <template #actions>
        <UButton
          icon="i-heroicons-plus"
          @click="openExpenseModal()"
        >
          {{ $t('accounting.expenses.addExpense') }}
        </UButton>
      </template>
    </CommonPageHeader>

    <!-- Summary Stats -->
    <AccountingExpenseStats :stats="expensesStore.stats.value" class="mb-6" />

    <!-- Filters -->
    <AccountingExpenseFilters
      v-model:category="filters.category"
      v-model:start-date="filters.startDate"
      v-model:end-date="filters.endDate"
      v-model:search="filters.search"
      :categories="expensesStore.EXPENSE_CATEGORIES"
      class="mb-6"
    />

    <!-- Expense Chart -->
    <AccountingExpenseChart
      :data="expensesStore.expensesByCategory.value"
      :period="chartPeriod"
      @update:period="chartPeriod = $event"
      class="mb-6"
    />

    <!-- Expenses List -->
    <AccountingExpenseList
      :expenses="filteredExpenses"
      :total-count="expensesStore.expenses.value.length"
      :loading="expensesStore.isLoading.value"
      @edit="openExpenseModal"
      @delete="confirmDelete"
      @duplicate="duplicateExpense"
      @export="handleExport"
      @add="openExpenseModal()"
    />

    <!-- Add/Edit Expense Modal -->
    <AccountingExpenseFormModal
      v-model:open="showExpenseModal"
      :expense="editingExpense"
      :saving="savingExpense"
      :categories="expensesStore.EXPENSE_CATEGORIES"
      :payment-methods="expensesStore.PAYMENT_METHODS"
      @save="saveExpense"
    />

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="font-semibold text-error">{{ $t('accounting.expenses.deleteExpense') }}</h3>
      </template>
      <template #body>
        <p>{{ $t('accounting.expenses.deleteConfirm') }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showDeleteModal = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton
            color="error"
            :loading="deletingExpense"
            @click="deleteExpense"
          >
            {{ $t('common.delete') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
import type { Expense } from '~/composables/use-expenses'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'permission']
})

const { t } = useI18n()
const toast = useToast()

// Use the expenses composable
const expensesStore = useExpenses()

// State
const showExpenseModal = ref(false)
const showDeleteModal = ref(false)
const savingExpense = ref(false)
const deletingExpense = ref(false)
const editingExpense = ref<Expense | null>(null)
const expenseToDelete = ref<Expense | null>(null)
const chartPeriod = ref('month')

const filters = reactive({
  category: '',
  startDate: '',
  endDate: '',
  search: ''
})

// Computed
const filteredExpenses = computed(() => 
  expensesStore.filterExpenses(filters)
)

// Methods
function openExpenseModal(expense?: Expense) {
  editingExpense.value = expense || null
  showExpenseModal.value = true
}

function duplicateExpense(expense: Expense) {
  const duplicate = {
    ...expense,
    id: '',
    date: new Date().toISOString().split('T')[0]
  }
  openExpenseModal(duplicate as Expense)
}

function confirmDelete(expense: Expense) {
  expenseToDelete.value = expense
  showDeleteModal.value = true
}

async function saveExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'synced'>) {
  savingExpense.value = true
  
  try {
    if (editingExpense.value?.id) {
      await expensesStore.updateExpense(editingExpense.value.id, data)
      toast.add({
        title: t('accounting.expenses.expenseUpdated'),
        color: 'success'
      })
    } else {
      await expensesStore.createExpense(data)
      toast.add({
        title: t('accounting.expenses.expenseCreated'),
        color: 'success'
      })
    }
    showExpenseModal.value = false
  } catch (error) {
    console.error('Failed to save expense:', error)
    toast.add({
      title: t('accounting.expenses.saveFailed'),
      color: 'error'
    })
  } finally {
    savingExpense.value = false
  }
}

async function deleteExpense() {
  if (!expenseToDelete.value) return
  
  deletingExpense.value = true
  
  try {
    await expensesStore.deleteExpense(expenseToDelete.value.id)
    toast.add({
      title: t('accounting.expenses.expenseDeleted'),
      color: 'success'
    })
    showDeleteModal.value = false
  } catch (error) {
    console.error('Failed to delete expense:', error)
    toast.add({
      title: t('accounting.expenses.deleteFailed'),
      color: 'error'
    })
  } finally {
    deletingExpense.value = false
  }
}

function handleExport() {
  const csv = expensesStore.exportToCSV(filters)
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  
  toast.add({
    title: t('accounting.expenses.exportSuccess'),
    color: 'success'
  })
}

// Init
onMounted(() => {
  expensesStore.init()
})
</script>
