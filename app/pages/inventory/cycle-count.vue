<!-- pages/inventory/cycle-count.vue -->
<!-- Enterprise Cycle Counting - Physical Inventory Management -->
<script setup lang="ts">
import type { CycleCount, CycleCountItem } from "~/composables/use-cycle-count";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const toast = useToast();
const router = useRouter();

// Composables
const cycleCountStore = useCycleCount();
const inventory = useInventory();
const shop = useShop();

// ============================================
// 📊 STATE
// ============================================

const loading = ref(true);
const showCreateModal = ref(false);
const showCountModal = ref(false);
const selectedCount = ref<CycleCount | null>(null);
const activeTab = ref("pending");

// Create form
const createForm = ref({
  name: "",
  branchId: "",
  scheduledDate: new Date().toISOString().split("T")[0],
  selectedProducts: [] as string[],
  notes: "",
});

// Count form
const countItem = ref<CycleCountItem | null>(null);
const countedQty = ref(0);
const countNotes = ref("");

// ============================================
// 🔄 INIT
// ============================================

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([
      cycleCountStore.init(),
      inventory.init(),
      shop.init(),
    ]);
  } finally {
    loading.value = false;
  }
});

// ============================================
// 📝 COMPUTED
// ============================================

const branches = computed(() => shop.branches.value || []);

const inventoryItems = computed(() => inventory.inventoryItems.value);

const pendingCounts = computed(() =>
  cycleCountStore.cycleCounts.value.filter((c) =>
    ["draft", "in_progress", "pending_review"].includes(c.status)
  )
);

const completedCounts = computed(() =>
  cycleCountStore.cycleCounts.value.filter((c) => c.status === "completed")
);

type BadgeColor = "gray" | "blue" | "yellow" | "green" | "red" | "primary";

const statusConfig: Record<
  string,
  { color: BadgeColor; icon: string; label: string }
> = {
  draft: { color: "gray", icon: "i-heroicons-pencil-square", label: "Draft" },
  in_progress: {
    color: "blue",
    icon: "i-heroicons-play",
    label: "In Progress",
  },
  pending_review: {
    color: "yellow",
    icon: "i-heroicons-clock",
    label: "Pending Review",
  },
  completed: {
    color: "green",
    icon: "i-heroicons-check-circle",
    label: "Completed",
  },
  cancelled: { color: "red", icon: "i-heroicons-x-circle", label: "Cancelled" },
};

// ============================================
// 🎯 HANDLERS
// ============================================

async function handleCreateCount() {
  if (
    !createForm.value.name ||
    !createForm.value.branchId ||
    createForm.value.selectedProducts.length === 0
  ) {
    toast.add({
      title: t("common.error"),
      description:
        t("cycleCount.fillRequired", "Please fill all required fields"),
      color: "error",
    });
    return;
  }

  // Get selected products info
  const items = inventoryItems.value
    .filter((item) => createForm.value.selectedProducts.includes(item.productId))
    .map((item) => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      expectedQty: item.currentStock,
      costPrice: item.costPrice,
    }));

  const result = await cycleCountStore.createCycleCount({
    name: createForm.value.name,
    branchId: createForm.value.branchId,
    scheduledDate: createForm.value.scheduledDate,
    items,
    notes: createForm.value.notes,
    createdBy: useUserIdentifier().getCurrentUserIdentifier(), // Use npub for decentralized identity
  });

  if (result) {
    toast.add({
      title: t("common.success"),
      description: t("cycleCount.created", "Cycle count created"),
      color: "success",
    });
    showCreateModal.value = false;
    resetCreateForm();
  }
}

function resetCreateForm() {
  createForm.value = {
    name: "",
    branchId: "",
    scheduledDate: new Date().toISOString().split("T")[0],
    selectedProducts: [],
    notes: "",
  };
}

async function handleStartCount(count: CycleCount) {
  const success = await cycleCountStore.startCounting(count.id, "staff_1");
  if (success) {
    selectedCount.value = cycleCountStore.getCycleCount(count.id) || null;
    toast.add({
      title: t("common.success"),
      description: t("cycleCount.started", "Counting started"),
      color: "success",
    });
  }
}

function openCountModal(count: CycleCount, item: CycleCountItem) {
  selectedCount.value = count;
  countItem.value = item;
  countedQty.value = item.countedQty ?? item.expectedQty;
  countNotes.value = item.notes || "";
  showCountModal.value = true;
}

async function handleSaveCount() {
  if (!selectedCount.value || !countItem.value) return;

  const success = await cycleCountStore.updateItemCount(
    selectedCount.value.id,
    countItem.value.productId,
    countedQty.value,
    countNotes.value || undefined
  );

  if (success) {
    // Refresh selected count
    selectedCount.value =
      cycleCountStore.getCycleCount(selectedCount.value.id) || null;
    showCountModal.value = false;
    toast.add({
      title: t("common.saved"),
      description: countItem.value.productName,
      color: "success",
    });
  }
}

async function handleSubmitForReview() {
  if (!selectedCount.value) return;

  const success = await cycleCountStore.submitForReview(selectedCount.value.id);
  if (success) {
    selectedCount.value =
      cycleCountStore.getCycleCount(selectedCount.value.id) || null;
    toast.add({
      title: t("common.success"),
      description: t("cycleCount.submitted", "Submitted for review"),
      color: "success",
    });
  }
}

async function handleApprove() {
  if (!selectedCount.value) return;

  const success = await cycleCountStore.approveCount(
    selectedCount.value.id,
    "staff_1",
    true
  );

  if (success) {
    selectedCount.value = null;
    toast.add({
      title: t("common.success"),
      description:
        t("cycleCount.approved", "Count approved and stock adjusted"),
      color: "success",
    });
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
  }).format(amount);
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Header -->
    <CommonPageHeader
      :title="t('cycleCount.title', 'Cycle Counting')"
      :description="t('cycleCount.description', 'Physical inventory verification')"
    >
      <template #left>
        <UButton
          icon="i-heroicons-arrow-left"
          color="neutral"
          variant="ghost"
          @click="router.push('/inventory')"
        />
      </template>
      <template #right>
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          :label="t('cycleCount.newCount', 'New Count')"
          @click="showCreateModal = true"
        />
      </template>
      <template #tabs>
        <UTabs
          v-model="activeTab"
          variant="link"
          :items="[
            {
              label: t('cycleCount.pending', 'Pending'),
              value: 'pending',
              icon: 'i-heroicons-clock',
            },
            {
              label: t('cycleCount.completed', 'Completed'),
              value: 'completed',
              icon: 'i-heroicons-check-circle',
            },
          ]"
        />
      </template>
    </CommonPageHeader>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <div v-else class="p-4 space-y-6">
      <!-- Selected Count Detail -->
      <div v-if="selectedCount" class="space-y-4">
        <!-- Count Header -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ selectedCount.name }}
                </h3>
                <UBadge
                  :color="statusConfig[selectedCount.status]?.color || 'gray'"
                  variant="subtle"
                >
                  {{ statusConfig[selectedCount.status]?.label }}
                </UBadge>
              </div>
              <p class="text-sm text-gray-500">
                {{ formatDate(selectedCount.scheduledDate) }} •
                {{ selectedCount.totalItems }} items
              </p>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="selectedCount = null"
            />
          </div>

          <!-- Progress -->
          <div class="mt-4">
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-600 dark:text-gray-400">
                {{ t("cycleCount.progress", "Progress") }}
              </span>
              <span class="font-medium">
                {{ selectedCount.countedItems }} / {{ selectedCount.totalItems }}
              </span>
            </div>
            <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-primary-500 rounded-full transition-all"
                :style="{
                  width: `${
                    selectedCount.totalItems > 0
                      ? (selectedCount.countedItems / selectedCount.totalItems) * 100
                      : 0
                  }%`,
                }"
              />
            </div>
          </div>

          <!-- Variance Summary -->
          <div
            v-if="selectedCount.varianceCount > 0"
            class="mt-4 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-exclamation-triangle" class="text-yellow-500" />
              <span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {{ selectedCount.varianceCount }} {{ t("cycleCount.itemsWithVariance", "items with variance") }}
              </span>
              <span class="ml-auto font-bold text-yellow-600 dark:text-yellow-400">
                {{ formatCurrency(Math.abs(selectedCount.varianceValue)) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-4 flex gap-2">
            <UButton
              v-if="selectedCount.status === 'draft'"
              color="blue"
              class="flex-1"
              @click="handleStartCount(selectedCount)"
            >
              <UIcon name="i-heroicons-play" class="mr-1" />
              {{ t("cycleCount.startCounting", "Start Counting") }}
            </UButton>
            <UButton
              v-if="selectedCount.status === 'in_progress' &&
                selectedCount.countedItems === selectedCount.totalItems"
              color="yellow"
              class="flex-1"
              @click="handleSubmitForReview"
            >
              <UIcon name="i-heroicons-paper-airplane" class="mr-1" />
              {{ t("cycleCount.submitReview", "Submit for Review") }}
            </UButton>
            <UButton
              v-if="selectedCount.status === 'pending_review'"
              color="green"
              class="flex-1"
              @click="handleApprove"
            >
              <UIcon name="i-heroicons-check" class="mr-1" />
              {{ t("cycleCount.approve", "Approve & Adjust Stock") }}
            </UButton>
          </div>
        </div>

        <!-- Count Items -->
        <div class="space-y-2">
          <div
            v-for="item in selectedCount.items"
            :key="item.productId"
            class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-primary-500 transition-colors"
            :class="{
              'border-green-500 bg-green-50 dark:bg-green-900/10':
                item.countedQty !== undefined && item.varianceQty === 0,
              'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10':
                item.varianceQty !== undefined && item.varianceQty !== 0,
            }"
            @click="
              ['in_progress'].includes(selectedCount?.status || '')
                ? openCountModal(selectedCount!, item)
                : null
            "
          >
            <div class="flex items-center gap-4">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center"
                :class="
                  item.countedQty !== undefined
                    ? item.varianceQty === 0
                      ? 'bg-green-500 text-white'
                      : 'bg-yellow-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                "
              >
                <UIcon
                  :name="
                    item.countedQty !== undefined
                      ? 'i-heroicons-check'
                      : 'i-heroicons-cube'
                  "
                  class="w-5 h-5"
                />
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 dark:text-white truncate">
                  {{ item.productName }}
                </p>
                <p class="text-xs text-gray-500">{{ item.sku }}</p>
              </div>

              <div class="text-right">
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-500">
                    {{ t("cycleCount.expected", "Expected") }}: {{ item.expectedQty }}
                  </span>
                  <span
                    v-if="item.countedQty !== undefined"
                    class="font-bold"
                    :class="
                      item.varianceQty === 0
                        ? 'text-green-600'
                        : 'text-yellow-600'
                    "
                  >
                    → {{ item.countedQty }}
                  </span>
                </div>
                <p
                  v-if="item.varianceQty !== undefined && item.varianceQty !== 0"
                  class="text-xs"
                  :class="item.varianceQty > 0 ? 'text-green-600' : 'text-red-600'"
                >
                  {{ item.varianceQty > 0 ? "+" : "" }}{{ item.varianceQty }} ({{
                    formatCurrency(item.varianceValue || 0)
                  }})
                </p>
              </div>

              <UIcon
                v-if="['in_progress'].includes(selectedCount?.status || '')"
                name="i-heroicons-chevron-right"
                class="text-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Count List -->
      <div v-else>
        <!-- Pending Tab -->
        <template v-if="activeTab === 'pending'">
          <div v-if="pendingCounts.length === 0" class="text-center py-12">
            <UIcon name="i-heroicons-clipboard-document-list" class="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p class="text-gray-500">
              {{ t("cycleCount.noPending", "No pending counts") }}
            </p>
            <UButton
              class="mt-4"
              color="primary"
              @click="showCreateModal = true"
            >
              {{ t("cycleCount.createFirst", "Create First Count") }}
            </UButton>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="count in pendingCounts"
              :key="count.id"
              class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-primary-500 transition-colors"
              @click="selectedCount = count"
            >
              <div class="flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="font-medium text-gray-900 dark:text-white">
                      {{ count.name }}
                    </h4>
                    <UBadge
                      :color="statusConfig[count.status]?.color || 'gray'"
                      variant="subtle"
                      size="xs"
                    >
                      {{ statusConfig[count.status]?.label }}
                    </UBadge>
                  </div>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ formatDate(count.scheduledDate) }} •
                    {{ count.totalItems }} items
                  </p>
                </div>
                <UIcon name="i-heroicons-chevron-right" class="text-gray-400" />
              </div>
            </div>
          </div>
        </template>

        <!-- Completed Tab -->
        <template v-if="activeTab === 'completed'">
          <div v-if="completedCounts.length === 0" class="text-center py-12">
            <UIcon name="i-heroicons-check-circle" class="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p class="text-gray-500">
              {{ t("cycleCount.noCompleted", "No completed counts") }}
            </p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="count in completedCounts"
              :key="count.id"
              class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-medium text-gray-900 dark:text-white">
                    {{ count.name }}
                  </h4>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ formatDate(count.completedAt || count.scheduledDate) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ count.varianceCount }} variances
                  </p>
                  <p
                    v-if="count.varianceValue !== 0"
                    class="font-bold"
                    :class="
                      count.varianceValue > 0 ? 'text-green-600' : 'text-red-600'
                    "
                  >
                    {{ formatCurrency(count.varianceValue) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-clipboard-document-list" class="text-primary-500" />
                {{ t("cycleCount.newCount", "New Cycle Count") }}
              </h3>
              <UButton
                icon="i-heroicons-x-mark"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="showCreateModal = false"
              />
            </div>
          </template>

          <div class="space-y-4">
            <UFormField :label="t('cycleCount.countName', 'Count Name')" required>
              <UInput
                v-model="createForm.name"
                :placeholder="t('cycleCount.countNamePlaceholder', 'e.g. Q1 2024 Count')"
              />
            </UFormField>

            <UFormField :label="t('common.branch', 'Branch')" required>
              <USelect
                v-model="createForm.branchId"
                :items="branches.map((b) => ({ value: b.id, label: b.name }))"
                :placeholder="t('common.selectBranch', 'Select branch')"
              />
            </UFormField>

            <UFormField :label="t('cycleCount.scheduledDate', 'Scheduled Date')">
              <UInput v-model="createForm.scheduledDate" type="date" />
            </UFormField>

            <UFormField :label="t('cycleCount.selectProducts', 'Select Products')" required>
              <div class="max-h-48 overflow-y-auto space-y-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                <label
                  v-for="item in inventoryItems"
                  :key="item.productId"
                  class="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                >
                  <input
                    v-model="createForm.selectedProducts"
                    type="checkbox"
                    :value="item.productId"
                    class="rounded border-gray-300"
                  />
                  <span class="flex-1 text-sm">{{ item.productName }}</span>
                  <span class="text-xs text-gray-500">{{ item.currentStock }}</span>
                </label>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                {{ createForm.selectedProducts.length }} selected
              </p>
            </UFormField>

            <UFormField :label="t('common.notes', 'Notes')">
              <UTextarea
                v-model="createForm.notes"
                :placeholder="t('cycleCount.notesPlaceholder', 'Additional notes...')"
                :rows="2"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="neutral" variant="outline" @click="showCreateModal = false">
                {{ t("common.cancel") }}
              </UButton>
              <UButton color="primary" :loading="cycleCountStore.isLoading.value" @click="handleCreateCount">
                {{ t("common.create") }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Count Item Modal -->
    <UModal v-model:open="showCountModal">
      <template #content>
        <UCard v-if="countItem">
          <template #header>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-primary-500 text-white flex items-center justify-center">
                <UIcon name="i-heroicons-calculator" />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{ countItem.productName }}
                </h3>
                <p class="text-sm text-gray-500">{{ countItem.sku }}</p>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {{ t("cycleCount.expected", "Expected Quantity") }}
              </p>
              <p class="text-3xl font-bold text-gray-900 dark:text-white">
                {{ countItem.expectedQty }}
              </p>
            </div>

            <UFormField :label="t('cycleCount.actualCount', 'Actual Count')" required>
              <UInput
                v-model.number="countedQty"
                type="number"
                min="0"
                size="lg"
                class="text-center text-2xl font-bold"
              />
            </UFormField>

            <!-- Variance Preview -->
            <div
              v-if="countedQty !== countItem.expectedQty"
              class="p-3 rounded-xl"
              :class="
                countedQty > countItem.expectedQty
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              "
            >
              <div class="flex justify-between items-center">
                <span
                  class="text-sm"
                  :class="
                    countedQty > countItem.expectedQty
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  "
                >
                  {{ t("cycleCount.variance", "Variance") }}
                </span>
                <span
                  class="font-bold"
                  :class="
                    countedQty > countItem.expectedQty
                      ? 'text-green-600'
                      : 'text-red-600'
                  "
                >
                  {{ countedQty > countItem.expectedQty ? "+" : "" }}{{
                    countedQty - countItem.expectedQty
                  }}
                </span>
              </div>
            </div>

            <UFormField :label="t('common.notes', 'Notes')">
              <UTextarea
                v-model="countNotes"
                :placeholder="t('cycleCount.countNotesPlaceholder', 'Reason for variance...')"
                :rows="2"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="neutral" variant="outline" @click="showCountModal = false">
                {{ t("common.cancel") }}
              </UButton>
              <UButton color="primary" :loading="cycleCountStore.isLoading.value" @click="handleSaveCount">
                <UIcon name="i-heroicons-check" class="mr-1" />
                {{ t("common.save") }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
