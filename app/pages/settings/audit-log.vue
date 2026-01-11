<template>
  <UContainer>
    <CommonPageHeader
      :title="$t('settings.auditLog.title')"
      :description="$t('settings.auditLog.description')"
    >
      <template #actions>
        <!-- Sync Status Badge -->
        <UBadge
          v-if="isCompanyCodeAvailable"
          :color="syncStatusColor"
          variant="subtle"
          class="mr-2"
        >
          <UIcon
            :name="syncStatusIcon"
            class="mr-1"
            :class="{ 'animate-spin': isSyncing }"
          />
          {{ $t(`settings.auditLog.${syncStatus}`) }}
        </UBadge>
        <UButton
          v-if="!isCompanyCodeAvailable"
          variant="outline"
          color="warning"
          size="sm"
          disabled
        >
          <UIcon name="i-heroicons-lock-closed" class="mr-1" />
          {{ $t("settings.auditLog.noCompanyCode") }}
        </UButton>
      </template>
    </CommonPageHeader>

    <!-- Filters -->
    <UCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UFormField :label="$t('settings.auditLog.filterByAction')">
          <USelect
            v-model="filters.action"
            :items="actionTypes"
            value-key="value"
            label-key="label"
            :placeholder="$t('common.all')"
          />
        </UFormField>

        <UFormField :label="$t('settings.auditLog.filterByUser')">
          <USelect
            v-model="filters.userId"
            :items="userOptions"
            value-key="value"
            label-key="label"
            :placeholder="$t('common.all')"
          />
        </UFormField>

        <UFormField :label="$t('settings.auditLog.startDate')">
          <UInput v-model="filters.startDate" type="date" />
        </UFormField>

        <UFormField :label="$t('settings.auditLog.endDate')">
          <UInput v-model="filters.endDate" type="date" />
        </UFormField>
      </div>

      <div class="flex justify-between items-center mt-4">
        <div class="flex gap-2">
          <UButton
            variant="ghost"
            icon="i-heroicons-arrow-path"
            @click="resetFilters"
          >
            {{ $t("settings.auditLog.resetFilters") }}
          </UButton>
          <UButton
            variant="ghost"
            icon="i-heroicons-arrow-path"
            :loading="isSyncing"
            @click="handleSync"
          >
            {{ $t("settings.auditLog.sync") }}
          </UButton>
        </div>

        <UButton icon="i-heroicons-arrow-down-tray" @click="exportLogs">
          {{ $t("settings.auditLog.exportLogs") }}
        </UButton>
      </div>
    </UCard>

    <!-- Statistics -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <UCard>
        <div class="text-center">
          <USkeleton v-if="isLoading" class="h-8 w-16 mx-auto mb-2" />
          <p v-else class="text-2xl font-bold text-primary">
            {{ stats.totalActions }}
          </p>
          <p class="text-sm text-muted">
            {{ $t("settings.auditLog.totalActions") }}
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <USkeleton v-if="isLoading" class="h-8 w-16 mx-auto mb-2" />
          <p v-else class="text-2xl font-bold text-blue-600">
            {{ stats.todayActions }}
          </p>
          <p class="text-sm text-muted">
            {{ $t("settings.auditLog.todayActions") }}
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <USkeleton v-if="isLoading" class="h-8 w-16 mx-auto mb-2" />
          <p v-else class="text-2xl font-bold text-orange-600">
            {{ stats.securityEvents }}
          </p>
          <p class="text-sm text-muted">
            {{ $t("settings.auditLog.securityEvents") }}
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <USkeleton v-if="isLoading" class="h-8 w-16 mx-auto mb-2" />
          <p v-else class="text-2xl font-bold text-green-600">
            {{ stats.activeUsers }}
          </p>
          <p class="text-sm text-muted">
            {{ $t("settings.auditLog.activeUsers") }}
          </p>
        </div>
      </UCard>
    </div>

    <!-- Audit Log Table -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold">
              {{ $t("settings.auditLog.activityLog") }}
            </h3>
            <UBadge
              v-if="isCompanyCodeAvailable"
              color="success"
              variant="subtle"
              size="xs"
            >
              <UIcon name="i-heroicons-lock-closed" class="mr-1" />
              {{ $t("settings.auditLog.encrypted") }}
            </UBadge>
          </div>
          <UInput
            v-model="searchQuery"
            :placeholder="$t('settings.auditLog.searchPlaceholder')"
            icon="i-heroicons-magnifying-glass"
            class="w-64"
          />
        </div>
      </template>

      <!-- Empty State -->
      <div
        v-if="!isLoading && filteredLogs.length === 0"
        class="text-center py-12"
      >
        <UIcon
          name="i-heroicons-document-text"
          class="text-4xl text-gray-400 mb-4"
        />
        <p class="text-lg font-medium text-gray-600 dark:text-gray-400">
          {{ $t("settings.auditLog.noLogs") }}
        </p>
        <p class="text-sm text-gray-500">
          {{ $t("settings.auditLog.noLogsDescription") }}
        </p>
      </div>

      <!-- Table -->
      <UTable
        v-else
        :data="paginatedLogs"
        :columns="columns"
        :loading="isLoading"
      >
        <template #action-cell="{ row }">
          <UBadge :color="getActionColor(row.original.action)" variant="subtle">
            <UIcon :name="getActionIcon(row.original.action)" class="mr-1" />
            {{ getActionLabel(row.original.action) }}
          </UBadge>
        </template>

        <template #user-cell="{ row }">
          <div class="flex items-center gap-2">
            <UAvatar :alt="row.original.userName" size="xs" />
            <span>{{ row.original.userName }}</span>
          </div>
        </template>

        <template #timestamp-cell="{ row }">
          <div>
            <p class="font-medium">{{ formatDate(row.original.timestamp) }}</p>
            <p class="text-sm text-muted">
              {{ formatTime(row.original.timestamp) }}
            </p>
          </div>
        </template>

        <template #details-cell="{ row }">
          <div class="max-w-md truncate">
            {{ row.original.details }}
          </div>
        </template>

        <template #ip-cell="{ row }">
          <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {{ row.original.ipAddress || "N/A" }}
          </code>
        </template>

        <template #actions-cell="{ row }">
          <UButton
            variant="ghost"
            icon="i-heroicons-eye"
            size="xs"
            @click="viewDetails(row.original)"
          />
        </template>
      </UTable>

      <!-- Pagination -->
      <div
        class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
      >
        <p class="text-sm text-muted">
          {{
            $t("settings.auditLog.showing", {
              from: pagination.from,
              to: pagination.to,
              total: pagination.total,
            })
          }}
        </p>
        <UPagination
          v-model:page="pagination.page"
          :items-per-page="pagination.perPage"
          :total="pagination.total"
        />
      </div>
    </UCard>

    <!-- Detail Modal -->
    <UModal v-model:open="showDetailModal">
      <template #header>
        <h3 class="font-semibold">{{ $t("settings.auditLog.logDetails") }}</h3>
      </template>

      <div v-if="selectedLog" class="p-4 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-muted">
              {{ $t("settings.auditLog.action") }}
            </p>
            <UBadge
              :color="getActionColor(selectedLog.action)"
              variant="subtle"
            >
              {{ getActionLabel(selectedLog.action) }}
            </UBadge>
          </div>

          <div>
            <p class="text-sm text-muted">{{ $t("settings.auditLog.user") }}</p>
            <p class="font-medium">{{ selectedLog.userName }}</p>
          </div>

          <div>
            <p class="text-sm text-muted">
              {{ $t("settings.auditLog.timestamp") }}
            </p>
            <p class="font-medium">
              {{ formatDateTime(selectedLog.timestamp) }}
            </p>
          </div>

          <div>
            <p class="text-sm text-muted">
              {{ $t("settings.auditLog.ipAddress") }}
            </p>
            <code class="text-sm">{{ selectedLog.ipAddress || "N/A" }}</code>
          </div>
        </div>

        <div>
          <p class="text-sm text-muted mb-2">
            {{ $t("settings.auditLog.details") }}
          </p>
          <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <p>{{ selectedLog.details }}</p>
          </div>
        </div>

        <div v-if="selectedLog.metadata">
          <p class="text-sm text-muted mb-2">
            {{ $t("settings.auditLog.metadata") }}
          </p>
          <pre
            class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-xs overflow-auto"
            >{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre
          >
        </div>

        <div v-if="selectedLog.resourceType">
          <p class="text-sm text-muted mb-2">
            {{ $t("settings.auditLog.affectedResource") }}
          </p>
          <div class="flex items-center gap-2">
            <UBadge variant="outline">{{ selectedLog.resourceType }}</UBadge>
            <code class="text-sm">{{ selectedLog.resourceId }}</code>
          </div>
        </div>
      </div>

      <template #footer>
        <UButton variant="ghost" @click="showDetailModal = false">
          {{ $t("common.close") }}
        </UButton>
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
import {
  useAuditLog,
  type AuditLog,
  type AuditAction,
} from "~/composables/use-audit-log";

definePageMeta({
  layout: "default",
  middleware: ["auth", "permission"],
});

useHead({
  title: "Settings - Audit Log",
});

const { t } = useI18n();

// Use the audit log composable
const auditLog = useAuditLog();
const {
  logs: auditLogs,
  isLoading,
  isSyncing,
  syncStatus,
  stats,
  isCompanyCodeAvailable,
  getLogs,
  syncLogs,
  subscribeToLogs,
} = auditLog;

// State
const searchQuery = ref("");
const showDetailModal = ref(false);
const selectedLog = ref<AuditLog | null>(null);

const filters = reactive({
  action: null as AuditAction | null,
  userId: null as string | null,
  startDate: "",
  endDate: "",
});

const pagination = reactive({
  page: 1,
  perPage: 20,
  total: 0,
  from: 1,
  to: 20,
});

// Sync status styling
const syncStatusColor = computed(() => {
  switch (syncStatus.value) {
    case "syncing":
      return "warning";
    case "synced":
      return "success";
    case "error":
      return "error";
    default:
      return "neutral";
  }
});

const syncStatusIcon = computed(() => {
  switch (syncStatus.value) {
    case "syncing":
      return "i-heroicons-arrow-path";
    case "synced":
      return "i-heroicons-check-circle";
    case "error":
      return "i-heroicons-exclamation-circle";
    default:
      return "i-heroicons-cloud";
  }
});

// Action types for filter dropdown
const actionTypes = computed(() => [
  { value: null, label: t("common.all") },
  { value: "login", label: t("settings.auditLog.actions.login") },
  { value: "logout", label: t("settings.auditLog.actions.logout") },
  { value: "login_failed", label: t("settings.auditLog.actions.login_failed") },
  { value: "order_create", label: t("settings.auditLog.actions.order_create") },
  { value: "order_update", label: t("settings.auditLog.actions.order_update") },
  { value: "refund", label: t("settings.auditLog.actions.refund") },
  {
    value: "product_create",
    label: t("settings.auditLog.actions.product_create"),
  },
  {
    value: "product_update",
    label: t("settings.auditLog.actions.product_update"),
  },
  {
    value: "product_delete",
    label: t("settings.auditLog.actions.product_delete"),
  },
  { value: "user_create", label: t("settings.auditLog.actions.user_create") },
  { value: "user_update", label: t("settings.auditLog.actions.user_update") },
  {
    value: "settings_change",
    label: t("settings.auditLog.actions.settings_change"),
  },
  { value: "shift_open", label: t("settings.auditLog.actions.shift_open") },
  { value: "shift_close", label: t("settings.auditLog.actions.shift_close") },
  {
    value: "inventory_adjust",
    label: t("settings.auditLog.actions.inventory_adjust"),
  },
]);

// User options for filter dropdown
const userOptions = computed(() => {
  const userIdSet = new Set<string>(auditLogs.value.map((log) => log.userId));
  const users = Array.from(userIdSet);
  return [
    { value: null as string | null, label: t("common.all") },
    ...users.map((userId) => {
      const log = auditLogs.value.find((l) => l.userId === userId);
      return {
        value: userId as string | null,
        label: log?.userName || userId.substring(0, 8) + "...",
      };
    }),
  ];
});

// Filtered logs
const filteredLogs = computed(() => {
  let logs = [...auditLogs.value];

  // Apply filters
  if (filters.action) {
    logs = logs.filter((log) => log.action === filters.action);
  }

  if (filters.userId) {
    logs = logs.filter((log) => log.userId === filters.userId);
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate);
    logs = logs.filter((log) => new Date(log.timestamp) >= start);
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    logs = logs.filter((log) => new Date(log.timestamp) <= end);
  }

  // Apply search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    logs = logs.filter(
      (log) =>
        log.details.toLowerCase().includes(query) ||
        log.userName.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query)
    );
  }

  return logs;
});

// Paginated logs
const paginatedLogs = computed(() => {
  const logs = filteredLogs.value;
  const start = (pagination.page - 1) * pagination.perPage;
  return logs.slice(start, start + pagination.perPage);
});

// Watch filtered logs to update pagination
watch(
  filteredLogs,
  (logs) => {
    pagination.total = logs.length;
    pagination.from = Math.min(
      (pagination.page - 1) * pagination.perPage + 1,
      logs.length
    );
    pagination.to = Math.min(pagination.page * pagination.perPage, logs.length);
  },
  { immediate: true }
);

// Table columns
const columns = [
  { id: "action", key: "action", header: t("settings.auditLog.action") },
  { id: "user", key: "user", header: t("settings.auditLog.user") },
  {
    id: "timestamp",
    key: "timestamp",
    header: t("settings.auditLog.timestamp"),
  },
  { id: "details", key: "details", header: t("settings.auditLog.details") },
  { id: "ip", key: "ip", header: t("settings.auditLog.ipAddress") },
  { id: "actions", key: "actions", header: "" },
];

// Methods
function getActionColor(
  action: string
): "primary" | "success" | "warning" | "error" | "info" | "neutral" {
  const colors: Record<
    string,
    "primary" | "success" | "warning" | "error" | "info" | "neutral"
  > = {
    login: "success",
    logout: "neutral",
    login_failed: "error",
    order_create: "primary",
    order_update: "info",
    order_void: "warning",
    refund: "warning",
    product_create: "success",
    product_update: "info",
    product_delete: "error",
    user_create: "success",
    user_update: "info",
    user_delete: "error",
    settings_change: "warning",
    shift_open: "success",
    shift_close: "neutral",
    inventory_adjust: "info",
    payment_received: "success",
    customer_create: "success",
    customer_update: "info",
    category_create: "success",
    category_update: "info",
    category_delete: "error",
  };
  return colors[action] || "neutral";
}

function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    login: "i-heroicons-arrow-right-on-rectangle",
    logout: "i-heroicons-arrow-left-on-rectangle",
    login_failed: "i-heroicons-exclamation-triangle",
    order_create: "i-heroicons-shopping-cart",
    order_update: "i-heroicons-pencil",
    order_void: "i-heroicons-x-circle",
    refund: "i-heroicons-receipt-refund",
    product_create: "i-heroicons-plus-circle",
    product_update: "i-heroicons-pencil-square",
    product_delete: "i-heroicons-trash",
    user_create: "i-heroicons-user-plus",
    user_update: "i-heroicons-user",
    user_delete: "i-heroicons-user-minus",
    settings_change: "i-heroicons-cog-6-tooth",
    shift_open: "i-heroicons-play",
    shift_close: "i-heroicons-stop",
    inventory_adjust: "i-heroicons-cube",
    payment_received: "i-heroicons-banknotes",
    customer_create: "i-heroicons-user-plus",
    customer_update: "i-heroicons-user",
    category_create: "i-heroicons-folder-plus",
    category_update: "i-heroicons-folder",
    category_delete: "i-heroicons-folder-minus",
  };
  return icons[action] || "i-heroicons-document";
}

function getActionLabel(action: string): string {
  // Try to get the translation, fallback to action name
  const key = `settings.auditLog.actions.${action}`;
  const translated = t(key);
  return translated !== key
    ? translated
    : action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString();
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString();
}

function resetFilters() {
  filters.action = null;
  filters.userId = null;
  filters.startDate = "";
  filters.endDate = "";
  searchQuery.value = "";
  pagination.page = 1;
}

function viewDetails(log: AuditLog) {
  selectedLog.value = log;
  showDetailModal.value = true;
}

async function handleSync() {
  await syncLogs();
}

function exportLogs() {
  const logs = filteredLogs.value;
  const csv = [
    [
      "ID",
      "Action",
      "User",
      "Timestamp",
      "Details",
      "IP Address",
      "Resource Type",
      "Resource ID",
    ].join(","),
    ...logs.map((log) =>
      [
        log.id,
        log.action,
        log.userName,
        new Date(log.timestamp).toISOString(),
        `"${log.details.replace(/"/g, '""')}"`,
        log.ipAddress || "",
        log.resourceType || "",
        log.resourceId || "",
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Initialize on mount
let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  // Fetch logs from Nostr
  await getLogs({
    limit: 500,
  });

  // Subscribe to real-time updates
  unsubscribe = subscribeToLogs();
});

onUnmounted(() => {
  // Clean up subscription
  if (unsubscribe) {
    unsubscribe();
  }
});
</script>
