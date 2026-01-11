<script setup lang="ts">
/**
 * 📖 Accounting Journal Tab
 * Journal entries list with expandable lines and balance indicator
 */

interface JournalLine {
  account: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  date: string;
  description: string;
  status: string;
  lines: JournalLine[];
}

const props = defineProps<{
  entries: JournalEntry[];
}>();

const emit = defineEmits<{
  add: [];
}>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();

const expandedEntries = ref<Set<string>>(new Set());

function toggleEntry(id: string) {
  if (expandedEntries.value.has(id)) {
    expandedEntries.value.delete(id);
  } else {
    expandedEntries.value.add(id);
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

function getTotalDebit(entry: JournalEntry): number {
  return entry.lines.reduce((sum, l) => sum + l.debit, 0);
}

function getTotalCredit(entry: JournalEntry): number {
  return entry.lines.reduce((sum, l) => sum + l.credit, 0);
}

function isBalanced(entry: JournalEntry): boolean {
  return getTotalDebit(entry) === getTotalCredit(entry);
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-book-open"
                class="w-5 h-5 text-indigo-600 dark:text-indigo-400"
              />
            </div>
            <h3 class="text-lg font-semibold">
              {{ t("accounting.journalEntries") }}
            </h3>
          </div>
          <div class="flex gap-2">
            <NuxtLinkLocale to="/accounting/ledger">
              <UButton
                variant="outline"
                icon="i-heroicons-arrow-top-right-on-square"
                size="sm"
              >
                {{ t("common.viewAll") }}
              </UButton>
            </NuxtLinkLocale>
            <UButton icon="i-heroicons-plus" size="sm" @click="emit('add')">
              {{ t("accounting.createEntry") }}
            </UButton>
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div v-if="entries.length === 0" class="text-center py-12">
        <div
          class="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center"
        >
          <UIcon name="i-heroicons-book-open" class="w-8 h-8 text-muted" />
        </div>
        <h4 class="font-medium mb-1">{{ t("accounting.noEntries") }}</h4>
        <p class="text-sm text-muted mb-4">
          Start tracking your financial transactions
        </p>
        <UButton icon="i-heroicons-plus" @click="emit('add')">
          {{ t("accounting.createFirstEntry") }}
        </UButton>
      </div>

      <!-- Entries List -->
      <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <div v-for="entry in entries.slice(0, 10)" :key="entry.id" class="py-3">
          <!-- Entry Header (Clickable) -->
          <button
            class="w-full flex items-center justify-between cursor-pointer rounded-lg p-2 -m-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
            @click="toggleEntry(entry.id)"
          >
            <div class="flex items-center gap-4">
              <UIcon
                :name="
                  expandedEntries.has(entry.id)
                    ? 'i-heroicons-chevron-down'
                    : 'i-heroicons-chevron-right'
                "
                class="w-4 h-4 text-muted transition-transform duration-200"
                :class="{ 'rotate-0': !expandedEntries.has(entry.id) }"
              />
              <div>
                <div class="flex items-center gap-2">
                  <span
                    class="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded"
                  >
                    {{ entry.id }}
                  </span>
                  <span class="text-sm text-muted">{{
                    formatDate(entry.date)
                  }}</span>
                </div>
                <p class="text-sm mt-1">{{ entry.description }}</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right text-sm">
                <span class="text-green-600 dark:text-green-400 font-mono">{{
                  formatCurrency(getTotalDebit(entry))
                }}</span>
                <span class="mx-1 text-muted">/</span>
                <span class="text-red-600 dark:text-red-400 font-mono">{{
                  formatCurrency(getTotalCredit(entry))
                }}</span>
              </div>
              <!-- Balance Indicator -->
              <UBadge
                v-if="isBalanced(entry)"
                color="success"
                variant="subtle"
                size="xs"
                class="hidden sm:flex"
              >
                <UIcon name="i-heroicons-check-circle" class="w-3 h-3 mr-1" />
                Balanced
              </UBadge>
              <UBadge
                v-else
                color="error"
                variant="subtle"
                size="xs"
                class="hidden sm:flex"
              >
                <UIcon
                  name="i-heroicons-exclamation-circle"
                  class="w-3 h-3 mr-1"
                />
                Unbalanced
              </UBadge>
              <UBadge
                :color="entry.status === 'posted' ? 'success' : 'warning'"
                variant="subtle"
                size="xs"
              >
                {{ entry.status }}
              </UBadge>
            </div>
          </button>

          <!-- Expanded Lines (Animated) -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div
              v-if="expandedEntries.has(entry.id)"
              class="ml-8 mt-3 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
            >
              <table class="w-full text-sm">
                <thead>
                  <tr
                    class="text-left text-muted border-b border-gray-200 dark:border-gray-700"
                  >
                    <th class="pb-2 font-medium">
                      {{ t("accounting.account") }}
                    </th>
                    <th class="pb-2 text-right font-medium">
                      {{ t("accounting.debit") }}
                    </th>
                    <th class="pb-2 text-right font-medium">
                      {{ t("accounting.credit") }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(line, idx) in entry.lines"
                    :key="idx"
                    class="border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <td class="py-2">
                      <span class="text-gray-700 dark:text-gray-300">{{
                        line.account
                      }}</span>
                    </td>
                    <td class="py-2 text-right font-mono">
                      <span
                        v-if="line.debit > 0"
                        class="text-green-600 dark:text-green-400 font-medium"
                      >
                        {{ formatCurrency(line.debit) }}
                      </span>
                    </td>
                    <td class="py-2 text-right font-mono">
                      <span
                        v-if="line.credit > 0"
                        class="text-red-600 dark:text-red-400 font-medium"
                      >
                        {{ formatCurrency(line.credit) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr
                    class="border-t-2 border-gray-300 dark:border-gray-600 font-bold"
                  >
                    <td class="pt-2">{{ t("common.total") }}</td>
                    <td
                      class="pt-2 text-right font-mono text-green-600 dark:text-green-400"
                    >
                      {{ formatCurrency(getTotalDebit(entry)) }}
                    </td>
                    <td
                      class="pt-2 text-right font-mono text-red-600 dark:text-red-400"
                    >
                      {{ formatCurrency(getTotalCredit(entry)) }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Transition>
        </div>
      </div>
    </UCard>
  </div>
</template>
