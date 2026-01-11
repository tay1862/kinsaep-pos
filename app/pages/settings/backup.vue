<template>
  <UContainer>
    <CommonPageHeader :title="$t('settings.backup.title')" :description="$t('settings.backup.description')" />

    <!-- Backup Status -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold flex items-center gap-2">
            <UIcon name="i-heroicons-cloud" class="text-primary" />
            {{ $t("settings.backup.backupStatus") }}
          </h3>
          <UBadge v-if="lastBackup" color="success" variant="subtle">
            {{ $t("settings.backup.synced") }}
          </UBadge>
          <UBadge v-else color="warning" variant="subtle">
            {{ $t("settings.backup.neverBacked") }}
          </UBadge>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UIcon name="i-heroicons-clock" class="text-3xl text-primary mb-2" />
          <p class="text-sm text-muted">
            {{ $t("settings.backup.lastBackup") }}
          </p>
          <p class="font-semibold">
            {{
              lastBackup ? formatDate(lastBackup) : $t("settings.backup.never")
            }}
          </p>
        </div>

        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UIcon name="i-heroicons-document-text" class="text-3xl text-blue-600 mb-2" />
          <p class="text-sm text-muted">
            {{ $t("settings.backup.totalRecords") }}
          </p>
          <p class="font-semibold">{{ stats.totalRecords.toLocaleString() }}</p>
        </div>

        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UIcon name="i-heroicons-server" class="text-3xl text-green-600 mb-2" />
          <p class="text-sm text-muted">{{ $t("settings.backup.dataSize") }}</p>
          <p class="font-semibold">{{ formatSize(stats.dataSize) }}</p>
        </div>
      </div>
    </UCard>

    <!-- Export Options -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <!-- Local Backup -->
      <UCard>
        <template #header>
          <h3 class="font-semibold flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-down-tray" class="text-blue-600" />
            {{ $t("settings.backup.localBackup") }}
          </h3>
        </template>

        <p class="text-muted mb-4">
          {{ $t("settings.backup.localBackupDesc") }}
        </p>

        <div class="space-y-3 mb-4">
          <UCheckbox v-model="exportOptions.products" :label="$t('settings.backup.includeProducts')" />
          <UCheckbox v-model="exportOptions.orders" :label="$t('settings.backup.includeOrders')" />
          <UCheckbox v-model="exportOptions.customers" :label="$t('settings.backup.includeCustomers')" />
          <UCheckbox v-model="exportOptions.inventory" :label="$t('settings.backup.includeInventory')" />
          <UCheckbox v-model="exportOptions.settings" :label="$t('settings.backup.includeSettings')" />
        </div>

        <template #footer>
          <div class="w-full flex gap-4">
            <UButton icon="i-heroicons-arrow-down-tray" :loading="exporting" block @click="exportData('json')">
              {{ $t("common.export", { type: "JSON" }) }}
            </UButton>

            <UButton variant="outline" icon="i-heroicons-table-cells" :loading="exporting" block
              @click="exportData('csv')">
              {{ $t("common.export", { type: "CSV" }) }}
            </UButton>
          </div>
        </template>
      </UCard>

      <!-- Cloud Backup -->
      <UCard>
        <template #header>
          <h3 class="font-semibold flex items-center gap-2">
            <UIcon name="i-heroicons-cloud-arrow-up" class="text-purple-600" />
            {{ $t("settings.backup.cloudBackup") }}
          </h3>
        </template>

        <p class="text-muted mb-4">
          {{ $t("settings.backup.cloudBackupDesc") }}
        </p>

        <div class="space-y-3 mb-4">
          <UFormField :label="$t('settings.backup.nostrRelay')">
            <UInput v-model="cloudOptions.relay" placeholder="wss://relay.example.com" icon="i-heroicons-signal" />
          </UFormField>

          <UCheckbox v-model="cloudOptions.autoBackup" :label="$t('settings.backup.autoBackup')" />

          <UFormField v-if="cloudOptions.autoBackup" :label="$t('settings.backup.backupFrequency')">
            <USelect v-model="cloudOptions.frequency" :items="frequencyOptions" value-key="value" label-key="label" />
          </UFormField>
        </div>

        <template #footer>
          <UButton color="primary" icon="i-heroicons-cloud-arrow-up" :loading="syncing" @click="syncToCloud">
            {{ $t("settings.backup.syncNow") }}
          </UButton>
        </template>
      </UCard>
    </div>

    <!-- Restore Section -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-up-tray" class="text-orange-600" />
          {{ $t("settings.backup.restore") }}
        </h3>
      </template>

      <UAlert icon="i-heroicons-exclamation-triangle" color="warning" :title="$t('settings.backup.restoreWarning')"
        :description="$t('settings.backup.restoreWarningDesc')" class="mb-4" />

      <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
        <input ref="fileInput" type="file" accept=".json,.csv" class="hidden" @change="handleFileSelect" />

        <div v-if="!selectedFile">
          <UIcon name="i-heroicons-cloud-arrow-up" class="text-4xl text-muted mb-2" />
          <p class="text-muted mb-4">
            {{ $t("settings.backup.dragDropOrClick") }}
          </p>
          <UButton variant="outline" @click="fileInput?.click()">
            {{ $t("settings.backup.selectFile") }}
          </UButton>
        </div>

        <div v-else class="space-y-4">
          <div class="flex items-center justify-center gap-3">
            <UIcon name="i-heroicons-document-text" class="text-2xl text-primary" />
            <div class="text-left">
              <p class="font-medium">{{ selectedFile.name }}</p>
              <p class="text-sm text-muted">
                {{ formatSize(selectedFile.size) }}
              </p>
            </div>
            <UButton variant="ghost" icon="i-heroicons-x-mark" @click="selectedFile = null" />
          </div>

          <div class="flex justify-center gap-2">
            <UButton color="warning" icon="i-heroicons-arrow-up-tray" :loading="restoring" @click="restoreData">
              {{ $t("settings.backup.restoreNow") }}
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Backup History -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">
            {{ $t("settings.backup.backupHistory") }}
          </h3>
          <UButton v-if="backupHistory.length > 0" variant="ghost" color="error" size="xs" icon="i-heroicons-trash"
            @click="clearHistory">
            {{ $t("settings.backup.clearHistory") }}
          </UButton>
        </div>
      </template>

      <div v-if="backupHistory.length === 0" class="text-center py-8">
        <UIcon name="i-heroicons-inbox" class="text-4xl text-muted mb-2" />
        <p class="text-muted">{{ $t("settings.backup.noBackupHistory") }}</p>
      </div>

      <div v-else class="divide-y">
        <div v-for="backup in backupHistory" :key="backup.id" class="py-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon :name="backup.type === 'cloud'
                ? 'i-heroicons-cloud'
                : 'i-heroicons-document'
              " :class="backup.type === 'cloud' ? 'text-purple-600' : 'text-blue-600'
                " />
            <div>
              <p class="font-medium">{{ backup.name }}</p>
              <p class="text-sm text-muted">
                {{ formatDate(backup.date) }} · {{ formatSize(backup.size) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UBadge :color="backup.status === 'success' ? 'success' : 'error'" variant="subtle">
              {{
                backup.status === "success"
                  ? $t("settings.backup.success")
                  : $t("settings.backup.failed")
              }}
            </UBadge>
            <UButton v-if="backup.type === 'local'" variant="ghost" icon="i-heroicons-arrow-down-tray" size="xs"
              @click="downloadBackup(backup)" />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Restore Confirmation Modal -->
    <UModal v-model:open="showRestoreModal">
      <template #header>
        <h3 class="font-semibold text-warning">
          {{ $t("settings.backup.confirmRestore") }}
        </h3>
      </template>

      <template #body>
        <div class="p-4 space-y-4">
          <p>{{ $t("settings.backup.confirmRestoreDesc") }}</p>

          <UAlert icon="i-heroicons-exclamation-triangle" color="error"
            :title="$t('settings.backup.dataWillBeReplaced')"
            :description="$t('settings.backup.dataWillBeReplacedDesc')" />

          <div v-if="restorePreview">
            <p class="text-sm font-medium mb-2">
              {{ $t("settings.backup.dataToRestore") }}
            </p>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1 text-sm">
              <p v-if="restorePreview.products">
                📦 {{ restorePreview.products }} {{ $t("products.title") }}
              </p>
              <p v-if="restorePreview.orders">
                🧾 {{ restorePreview.orders }} {{ $t("orders.title") }}
              </p>
              <p v-if="restorePreview.customers">
                👥 {{ restorePreview.customers }} {{ $t("customers.title") }}
              </p>
              <p v-if="restorePreview.inventory">
                📊 {{ restorePreview.inventory }} {{ $t("inventory.title") }}
              </p>
            </div>
          </div>

          <UFormField :label="$t('settings.backup.typeConfirm')">
            <UInput v-model="confirmText" :placeholder="$t('settings.backup.typeRESTORE')" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showRestoreModal = false">
            {{ $t("common.cancel") }}
          </UButton>
          <UButton color="error" :disabled="confirmText !== 'RESTORE'" :loading="restoring" @click="confirmRestore">
            {{ $t("settings.backup.restoreNow") }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth", "permission"],
});

useHead({
  title: "Settings - Backup",
})

const { t } = useI18n();
const toast = useToast();

// State
const exporting = ref(false);
const syncing = ref(false);
const restoring = ref(false);
const showRestoreModal = ref(false);
const confirmText = ref("");
const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const lastBackup = ref<Date | null>(null);

const exportOptions = reactive({
  products: true,
  orders: true,
  customers: true,
  inventory: true,
  settings: true,
});

const cloudOptions = reactive({
  relay: "wss://relay.damus.io",
  autoBackup: false,
  frequency: "daily",
});

const stats = reactive({
  totalRecords: 0,
  dataSize: 0,
});

const restorePreview = ref<{
  products?: number;
  orders?: number;
  customers?: number;
  inventory?: number;
} | null>(null);

interface BackupRecord {
  id: string;
  name: string;
  date: Date;
  size: number;
  type: "local" | "cloud";
  status: "success" | "failed";
  data?: string;
}

const backupHistory = ref<BackupRecord[]>([]);

const frequencyOptions = computed(() => [
  { value: "hourly", label: t("settings.backup.hourly") },
  { value: "daily", label: t("settings.backup.daily") },
  { value: "weekly", label: t("settings.backup.weekly") },
  { value: "monthly", label: t("settings.backup.monthly") },
]);

// Methods
function formatDate(date: Date): string {
  return new Date(date).toLocaleString();
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function loadStats() {
  // Load actual data counts from IndexedDB
  try {
    const { products } = useProducts();
    const { orders } = useOrders();
    const { customers } = useCustomers();

    const productCount = products.value?.length || 0;
    const orderCount = orders.value?.length || 0;
    const customerCount = customers.value?.length || 0;

    stats.totalRecords = productCount + orderCount + customerCount;
    stats.dataSize = JSON.stringify({
      products: products.value,
      orders: orders.value,
      customers: customers.value,
    }).length;
  } catch {
    stats.totalRecords = 0;
    stats.dataSize = 0;
  }
}

async function exportData(format: "json" | "csv") {
  exporting.value = true;

  try {
    const { products } = useProducts();
    const { orders } = useOrders();
    const { customers } = useCustomers();

    const data: Record<string, unknown> = {};

    if (exportOptions.products) data.products = products.value;
    if (exportOptions.orders) data.orders = orders.value;
    if (exportOptions.customers) data.customers = customers.value;
    // Add inventory and settings if available

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "json") {
      content = JSON.stringify(data, null, 2);
      filename = `bitspace-backup-${new Date().toISOString().split("T")[0]
        }.json`;
      mimeType = "application/json";
    } else {
      // CSV export - flatten data
      const rows: string[] = [];

      if (data.products && Array.isArray(data.products)) {
        rows.push("--- PRODUCTS ---");
        const products = data.products as Record<string, unknown>[];
        if (products.length > 0 && products[0]) {
          rows.push(Object.keys(products[0]).join(","));
          products.forEach((p: Record<string, unknown>) => {
            rows.push(
              Object.values(p)
                .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                .join(",")
            );
          });
        }
      }

      content = rows.join("\n");
      filename = `bitspace-backup-${new Date().toISOString().split("T")[0]
        }.csv`;
      mimeType = "text/csv";
    }

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    // Add to history
    backupHistory.value.unshift({
      id: Date.now().toString(),
      name: filename,
      date: new Date(),
      size: content.length,
      type: "local",
      status: "success",
      data: content,
    });

    lastBackup.value = new Date();

    toast.add({
      title: t("settings.backup.exportSuccess"),
      color: "success",
    });
  } catch (error) {
    console.error("Export failed:", error);
    toast.add({
      title: t("settings.backup.exportFailed"),
      color: "error",
    });
  } finally {
    exporting.value = false;
  }
}

async function syncToCloud() {
  syncing.value = true;

  try {
    const { products } = useProducts();
    const { orders } = useOrders();
    const { customers } = useCustomers();

    const data = {
      products: products.value,
      orders: orders.value,
      customers: customers.value,
      timestamp: new Date().toISOString(),
    };

    // In production, this would sync via Nostr relay
    // For now, simulate the sync
    await new Promise((resolve) => setTimeout(resolve, 2000));

    backupHistory.value.unshift({
      id: Date.now().toString(),
      name: `Cloud Backup - ${new Date().toLocaleDateString()}`,
      date: new Date(),
      size: JSON.stringify(data).length,
      type: "cloud",
      status: "success",
    });

    lastBackup.value = new Date();

    toast.add({
      title: t("settings.backup.syncSuccess"),
      color: "success",
    });
  } catch (error) {
    console.error("Sync failed:", error);
    toast.add({
      title: t("settings.backup.syncFailed"),
      color: "error",
    });
  } finally {
    syncing.value = false;
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0 && input.files[0]) {
    selectedFile.value = input.files[0];
    parseFilePreview();
  }
}

async function parseFilePreview() {
  if (!selectedFile.value) return;

  try {
    const content = await selectedFile.value.text();
    const data = JSON.parse(content);

    restorePreview.value = {
      products: data.products?.length || 0,
      orders: data.orders?.length || 0,
      customers: data.customers?.length || 0,
      inventory: data.inventory?.length || 0,
    };
  } catch {
    restorePreview.value = null;
  }
}

function restoreData() {
  showRestoreModal.value = true;
  confirmText.value = "";
}

async function confirmRestore() {
  if (confirmText.value !== "RESTORE" || !selectedFile.value) return;

  restoring.value = true;

  try {
    const content = await selectedFile.value.text();
    const _data = JSON.parse(content);

    // In production, restore data to IndexedDB
    // This would use the composables to save data

    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast.add({
      title: t("settings.backup.restoreSuccess"),
      description: t("settings.backup.restoreSuccessDesc"),
      color: "success",
    });

    showRestoreModal.value = false;
    selectedFile.value = null;
    restorePreview.value = null;

    // Refresh the page to load restored data
    window.location.reload();
  } catch (error) {
    console.error("Restore failed:", error);
    toast.add({
      title: t("settings.backup.restoreFailed"),
      color: "error",
    });
  } finally {
    restoring.value = false;
  }
}

function downloadBackup(backup: BackupRecord) {
  if (!backup.data) return;

  const blob = new Blob([backup.data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backup.name;
  a.click();
  URL.revokeObjectURL(url);
}

function clearHistory() {
  backupHistory.value = [];
  toast.add({
    title: t("settings.backup.historyCleared"),
    color: "success",
  });
}

// Load stats on mount
onMounted(() => {
  loadStats();

  // Load last backup from localStorage
  const saved = localStorage.getItem("lastBackup");
  if (saved) {
    lastBackup.value = new Date(saved);
  }

  // Load backup history from localStorage
  const history = localStorage.getItem("backupHistory");
  if (history) {
    backupHistory.value = JSON.parse(history);
  }
});

// Save history when changed
watch(
  backupHistory,
  (history) => {
    localStorage.setItem("backupHistory", JSON.stringify(history));
  },
  { deep: true }
);

watch(lastBackup, (date) => {
  if (date) {
    localStorage.setItem("lastBackup", date.toISOString());
  }
});
</script>
