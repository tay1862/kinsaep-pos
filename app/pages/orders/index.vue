<!-- pages/orders/index.vue -->
<!-- 🧾 Orders Management - Enterprise UI with Bulk Actions -->
<script setup lang="ts">
import type { Order } from "~/types";
import * as XLSX from "xlsx";
definePageMeta({
  middleware: ["auth"],
});

useHead({
  title: "Orders - Enterprise Order System",
});

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const currency = useCurrency();

// Use real orders store with Nostr sync
const ordersStore = useOrders();

// Permissions
const { canCreateOrders, canVoidOrders } = usePermissions();

// UI State
const searchQuery = ref("");
const statusFilter = ref("all");
const dateFilter = ref<"all" | "today" | "week" | "month">("all");
const currentPage = ref(1);
const itemsPerPage = 20;

// Bulk selection
const selectedOrders = ref<Set<string>>(new Set());
const selectAll = ref(false);

// Sorting
const sortKey = ref<string>("date");
const sortOrder = ref<"asc" | "desc">("desc");

// Mobile UI
const showFilters = ref(false);

const toggleSort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortOrder.value = key === "date" ? "desc" : "asc";
  }
  currentPage.value = 1;
};

// Status options
const statusOptions = [
  { value: "all", label: t("orders.status.all", "All Status") },
  { value: "pending", label: t("orders.status.pending", "Pending") },
  { value: "processing", label: t("orders.status.processing", "Processing") },
  { value: "completed", label: t("orders.status.completed", "Completed") },
  { value: "cancelled", label: t("orders.status.cancelled", "Cancelled") },
];

const dateFilterOptions = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

// Date filter logic
const getDateFilterStart = () => {
  const now = new Date();
  switch (dateFilter.value) {
    case "today":
      now.setHours(0, 0, 0, 0);
      return now;
    case "week":
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return weekStart;
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    default:
      return null;
  }
};

// Filtered orders
const filteredOrders = computed(() => {
  let result = [...ordersStore.orders.value];

  // Date filter
  const dateStart = getDateFilterStart();
  if (dateStart) {
    result = result.filter((order) => new Date(order.date) >= dateStart);
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (order) =>
        order.id.toLowerCase().includes(query) ||
        (order.customer && order.customer.toLowerCase().includes(query)) ||
        (order.customerName && order.customerName.toLowerCase().includes(query))
    );
  }

  // Status filter
  if (statusFilter.value !== "all") {
    result = result.filter((order) => order.status === statusFilter.value);
  }

  // Apply dynamic sorting
  result.sort((a, b) => {
    let aVal: string | number = "";
    let bVal: string | number = "";

    switch (sortKey.value) {
      case "id":
        aVal = a.id.toLowerCase();
        bVal = b.id.toLowerCase();
        break;
      case "date":
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
        break;
      case "customer":
        aVal = (a.customerName || a.customer || "").toLowerCase();
        bVal = (b.customerName || b.customer || "").toLowerCase();
        break;
      case "items":
        aVal = a.items?.length || 0;
        bVal = b.items?.length || 0;
        break;
      case "total":
        aVal = a.total;
        bVal = b.total;
        break;
      case "status":
        aVal = a.status;
        bVal = b.status;
        break;
      default:
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
    }

    if (aVal < bVal) return sortOrder.value === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder.value === "asc" ? 1 : -1;
    return 0;
  });

  return result;
});

// Paginated orders
const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredOrders.value.slice(start, start + itemsPerPage);
});

// Stats
const stats = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = ordersStore.orders.value.filter(
    (o) => new Date(o.date) >= today
  );

  const completedToday = todayOrders.filter((o) => o.status === "completed");

  return {
    total: ordersStore.orders.value.length,
    today: todayOrders.length,
    todayRevenue: completedToday.reduce((sum, o) => sum + o.total, 0),
    pending: ordersStore.pendingOrders.value.length,
  };
});

// Status badge styles
const getStatusStyle = (status: string) => {
  const styles: Record<string, string> = {
    pending:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    processing:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    refunded: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return styles[status] || "bg-gray-100 text-gray-600";
};

// Payment method icon
const getPaymentIcon = (method?: string) => {
  const icons: Record<string, string> = {
    lightning: "⚡",
    cash: "💵",
    qr_static: "📱",
    bolt12: "⚡",
    lnurl: "⚡",
    card: "💳",
    bank: "🏦",
    split: "✂️",
  };
  return icons[method || ""] || "💰";
};

// Format date
const formatDate = (date: string | Date) => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  // Show relative time for recent orders
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Bulk selection handlers
const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedOrders.value = new Set();
    selectAll.value = false;
  } else {
    selectedOrders.value = new Set(paginatedOrders.value.map((o) => o.id));
    selectAll.value = true;
  }
};

const toggleOrderSelection = (orderId: string) => {
  if (selectedOrders.value.has(orderId)) {
    selectedOrders.value.delete(orderId);
  } else {
    selectedOrders.value.add(orderId);
  }
  // Trigger reactivity
  selectedOrders.value = new Set(selectedOrders.value);
};

const isSelected = (orderId: string) => selectedOrders.value.has(orderId);

// Bulk actions
const bulkMarkAsPaid = async () => {
  const count = selectedOrders.value.size;
  if (!confirm(`Mark ${count} orders as paid?`)) return;

  for (const orderId of selectedOrders.value) {
    try {
      await ordersStore.completeOrder(orderId, "cash");
    } catch (e) {
      console.error(`Failed to complete order ${orderId}:`, e);
    }
  }

  toast.add({
    title: "Bulk Update Complete",
    description: `${count} orders marked as paid`,
    color: "green",
  });

  selectedOrders.value = new Set();
  selectAll.value = false;
};

const bulkDelete = async () => {
  const count = selectedOrders.value.size;
  if (!confirm(`Delete ${count} orders? This cannot be undone.`)) return;

  for (const orderId of selectedOrders.value) {
    try {
      await ordersStore.deleteOrder(orderId);
    } catch (e) {
      console.error(`Failed to delete order ${orderId}:`, e);
    }
  }

  toast.add({
    title: "Bulk Delete Complete",
    description: `${count} orders deleted`,
    color: "green",
  });

  selectedOrders.value = new Set();
  selectAll.value = false;
};

const bulkExport = () => {
  const selectedData = filteredOrders.value
    .filter((o) => selectedOrders.value.has(o.id))
    .map((order) => ({
      "Order ID": order.id,
      Date: formatDate(order.date),
      Customer: order.customerName || order.customer || "-",
      Items: order.items?.length || 0,
      "Payment Method": order.paymentMethod || "-",
      "Total (LAK)": order.total,
      "Total (Sats)": order.totalSats || "-",
      Status: order.status,
      Notes: order.notes || "",
    }));

  const ws = XLSX.utils.json_to_sheet(selectedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(
    wb,
    `Orders_Selected_${new Date().toISOString().split("T")[0]}.xlsx`
  );

  toast.add({
    title: "Export Complete",
    description: `${selectedData.length} orders exported`,
    color: "green",
  });
};

// Export all orders
const exportAllOrders = () => {
  const data = filteredOrders.value.map((order) => ({
    "Order ID": order.id,
    Date: formatDate(order.date),
    Customer: order.customerName || order.customer || "-",
    Items: order.items?.length || 0,
    "Payment Method": order.paymentMethod || "-",
    "Total (LAK)": order.total,
    "Total (Sats)": order.totalSats || "-",
    Status: order.status,
    Notes: order.notes || "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, `Orders_${new Date().toISOString().split("T")[0]}.xlsx`);
};

// Delete order
const deleteOrder = async (id: string) => {
  if (confirm(t("orders.confirmDelete", "Delete this order?"))) {
    await ordersStore.deleteOrder(id);
    toast.add({
      title: "Order Deleted",
      color: "green",
    });
  }
};

// Sync orders
const handleSync = async () => {
  await ordersStore.syncWithNostr();
  toast.add({
    title: "Sync Complete",
    description: "Orders synced with Nostr relays",
    color: "green",
  });
};

// Initialize
onMounted(async () => {
  await ordersStore.init();
});
</script>

<template>
  <div>
    <!-- Header -->
    <div
      class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10"
    >
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div
          class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ t("orders.title", "Orders") }}
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t("orders.description", "Manage all your orders") }}
            </p>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <!-- Sync Status -->
            <UButton
              v-if="ordersStore.syncPending.value > 0"
              icon="i-heroicons-arrow-path"
              color="amber"
              variant="soft"
              size="sm"
              :loading="ordersStore.isLoading.value"
              @click="handleSync"
            >
              {{ ordersStore.syncPending.value }} pending
            </UButton>

            <!-- Export Button -->
            <UButton
              icon="i-heroicons-arrow-down-tray"
              variant="outline"
              color="gray"
              @click="exportAllOrders"
            >
              {{ t("common.export", "Export") }}
            </UButton>

            <!-- Create Order Button -->
            <UButton
              v-if="canCreateOrders"
              icon="i-heroicons-plus"
              color="primary"
              to="/orders/create"
            >
              {{ t("orders.newOrder", "New Order") }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <div class="py-6 space-y-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 px-4 gap-4">
        <div
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-clipboard-document-list"
                class="w-5 h-5 text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.total }}
              </p>
              <p class="text-xs text-gray-500">Total Orders</p>
            </div>
          </div>
        </div>

        <div
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-calendar-days"
                class="w-5 h-5 text-green-600 dark:text-green-400"
              />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.today }}
              </p>
              <p class="text-xs text-gray-500">Today's Orders</p>
            </div>
          </div>
        </div>

        <div
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-banknotes"
                class="w-5 h-5 text-amber-600 dark:text-amber-400"
              />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ currency.format(stats.todayRevenue, "LAK") }}
              </p>
              <p class="text-xs text-gray-500">Today's Revenue</p>
            </div>
          </div>
        </div>

        <div
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-clock"
                class="w-5 h-5 text-yellow-600 dark:text-yellow-400"
              />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.pending }}
              </p>
              <p class="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters Bar -->
      <div class="px-4">
        <div
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
        >
          <!-- Search + Mobile Filter Toggle -->
          <div class="flex gap-3">
            <div class="flex-1">
              <UInput
                v-model="searchQuery"
                icon="i-heroicons-magnifying-glass"
                :placeholder="t('common.search', 'Search orders...')"
                size="lg"
              />
            </div>
            <!-- Mobile Filter Toggle -->
            <UButton
              class="lg:hidden"
              :icon="
                showFilters ? 'i-heroicons-funnel-solid' : 'i-heroicons-funnel'
              "
              :color="showFilters ? 'primary' : 'gray'"
              variant="soft"
              size="lg"
              @click="showFilters = !showFilters"
            />
          </div>

          <!-- Filters (collapsible on mobile) -->
          <div
            class="lg:flex gap-3 flex-wrap mt-4"
            :class="{ hidden: !showFilters, flex: showFilters }"
          >
            <USelect
              v-model="dateFilter"
              :items="dateFilterOptions"
              value-key="value"
              label-key="label"
              class="w-full sm:w-36"
            />
            <USelect
              v-model="statusFilter"
              :items="statusOptions"
              value-key="value"
              label-key="label"
              class="w-full sm:w-36 mt-3 sm:mt-0"
            />
            <UButton
              icon="i-heroicons-arrow-path"
              variant="soft"
              color="gray"
              :loading="ordersStore.isLoading.value"
              class="mt-3 sm:mt-0"
              @click="ordersStore.init()"
            >
              Refresh
            </UButton>
          </div>
        </div>
      </div>

      <!-- Bulk Actions Bar (appears when items selected) -->
      <Transition
        enter-active-class="transition-all duration-200"
        leave-active-class="transition-all duration-200"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-if="selectedOrders.size > 0"
          class="fixed bottom-0 inset-x-0 md:relative md:bottom-auto md:inset-x-auto px-4 pb-4 md:pb-0 z-20"
        >
          <div
            class="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4 shadow-lg md:shadow-none flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
          >
            <div class="flex items-center gap-3">
              <span
                class="font-bold text-lg text-primary-700 dark:text-primary-300"
              >
                {{ selectedOrders.size }}
              </span>
              <span class="text-primary-600 dark:text-primary-400">
                orders selected
              </span>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <UButton
                icon="i-heroicons-check-circle"
                variant="soft"
                color="green"
                class="flex-1 md:flex-none"
                @click="bulkMarkAsPaid"
              >
                Mark Paid
              </UButton>
              <UButton
                icon="i-heroicons-arrow-down-tray"
                variant="soft"
                color="gray"
                class="flex-1 md:flex-none"
                @click="bulkExport"
              >
                Export
              </UButton>
              <UButton
                v-if="canVoidOrders"
                icon="i-heroicons-trash"
                variant="soft"
                color="red"
                class="flex-1 md:flex-none"
                @click="bulkDelete"
              >
                Delete
              </UButton>
              <UButton
                icon="i-heroicons-x-mark"
                variant="ghost"
                color="gray"
                @click="
                  selectedOrders = new Set();
                  selectAll = false;
                "
              >
                Clear
              </UButton>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Loading State (initial load only) -->
      <div
        v-if="
          ordersStore.isLoading.value && ordersStore.orders.value.length === 0
        "
        class="flex justify-center py-16"
      >
        <div class="text-center">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-10 h-10 animate-spin text-primary-500 mb-4"
          />
          <p class="text-gray-500">Loading orders...</p>
        </div>
      </div>

      <!-- Syncing Indicator (background sync) -->
      <div v-if="ordersStore.isSyncing?.value" class="px-4 mb-4">
        <div
          class="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400"
        >
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
          <span>Syncing with Nostr...</span>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredOrders.length === 0"
        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-16 text-center"
      >
        <div class="text-6xl mb-4">📋</div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No orders yet
        </h3>
        <p class="text-gray-500 mb-6 max-w-md mx-auto">
          Create your first order to start tracking sales and managing your
          business.
        </p>
        <UButton
          to="/orders/create"
          color="primary"
          size="lg"
          icon="i-heroicons-plus"
        >
          Create First Order
        </UButton>
      </div>

      <!-- Orders Mobile Card View (visible on mobile/tablet) -->
      <div v-else class="md:hidden px-4 space-y-3">
        <div
          v-for="order in paginatedOrders"
          :key="order.id"
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 active:scale-[0.99] transition-transform"
          :class="{
            'ring-2 ring-primary-500': isSelected(order.id),
          }"
          @click="router.push(`/orders/${order.id}`)"
        >
          <!-- Header Row -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <UCheckbox
                :model-value="isSelected(order.id)"
                @click.stop
                @update:model-value="toggleOrderSelection(order.id)"
              />
              <div>
                <span
                  class="font-mono text-sm font-bold text-gray-900 dark:text-white"
                >
                  #{{ order?.code || order.id.slice(-6).toUpperCase() }}
                </span>
                <p class="text-xs text-gray-500">
                  {{ formatDate(order.date) }}
                </p>
              </div>
            </div>
            <span
              :class="getStatusStyle(order.status)"
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            >
              {{ t(`orders.status.${order.status}`) || order.status }}
            </span>
          </div>

          <!-- Details Row -->
          <div class="flex items-center justify-between">
            <div
              class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <span>{{ getPaymentIcon(order.paymentMethod) }}</span>
              <span>{{ order.items?.length || 0 }} items</span>
              <span
                v-if="order.orderType"
                class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded"
              >
                {{ order.orderType }}
              </span>
            </div>
            <div class="text-right">
              <p class="font-semibold text-gray-900 dark:text-white">
                {{ currency.format(order.total, "LAK") }}
              </p>
              <p v-if="order.totalSats" class="text-xs text-amber-600">
                ⚡ {{ order.totalSats.toLocaleString() }} sats
              </p>
            </div>
          </div>

          <!-- Customer Row -->
          <div
            v-if="order.customer"
            class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800"
          >
            <span class="text-sm text-gray-600 dark:text-gray-400">
              👤 {{ order.customer }}
            </span>
          </div>
        </div>
      </div>

      <!-- Orders Table (hidden on mobile, visible on md+) -->
      <div
        v-if="filteredOrders.length > 0"
        class="hidden md:block bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr
                class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
              >
                <!-- Select All Checkbox -->
                <th class="py-3 px-4 w-12">
                  <UCheckbox
                    :model-value="selectAll"
                    @update:model-value="toggleSelectAll"
                  />
                </th>

                <th
                  class="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  @click="toggleSort('id')"
                >
                  <div class="flex items-center gap-1">
                    Order
                    <UIcon
                      v-if="sortKey === 'id'"
                      :name="
                        sortOrder === 'asc'
                          ? 'i-heroicons-chevron-up'
                          : 'i-heroicons-chevron-down'
                      "
                      class="w-4 h-4"
                    />
                  </div>
                </th>
                <th
                  class="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  @click="toggleSort('date')"
                >
                  <div class="flex items-center gap-1">
                    Date
                    <UIcon
                      v-if="sortKey === 'date'"
                      :name="
                        sortOrder === 'asc'
                          ? 'i-heroicons-chevron-up'
                          : 'i-heroicons-chevron-down'
                      "
                      class="w-4 h-4"
                    />
                  </div>
                </th>
                <!-- Order Type -->
                <th
                  class="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  @click="toggleSort('orderType')"
                >
                  Order Type
                  <UIcon
                    v-if="sortKey === 'orderType'"
                    :name="
                      sortOrder === 'asc'
                        ? 'i-heroicons-chevron-up'
                        : 'i-heroicons-chevron-down'
                    "
                    class="w-4 h-4"
                  />
                </th>
                <th
                  class="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  @click="toggleSort('customer')"
                >
                  <div class="flex items-center gap-1">
                    Customer
                    <UIcon
                      v-if="sortKey === 'customer'"
                      :name="
                        sortOrder === 'asc'
                          ? 'i-heroicons-chevron-up'
                          : 'i-heroicons-chevron-down'
                      "
                      class="w-4 h-4"
                    />
                  </div>
                </th>
                <th
                  class="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm"
                >
                  Items
                </th>
                <th
                  class="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm"
                >
                  Payment
                </th>
                <th
                  class="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  @click="toggleSort('total')"
                >
                  <div class="flex items-center gap-1 justify-end">
                    Total
                    <UIcon
                      v-if="sortKey === 'total'"
                      :name="
                        sortOrder === 'asc'
                          ? 'i-heroicons-chevron-up'
                          : 'i-heroicons-chevron-down'
                      "
                      class="w-4 h-4"
                    />
                  </div>
                </th>
                <th
                  class="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  @click="toggleSort('status')"
                >
                  <div class="flex items-center gap-1">
                    Status
                    <UIcon
                      v-if="sortKey === 'status'"
                      :name="
                        sortOrder === 'asc'
                          ? 'i-heroicons-chevron-up'
                          : 'i-heroicons-chevron-down'
                      "
                      class="w-4 h-4"
                    />
                  </div>
                </th>
                <th class="py-3 px-4 w-24"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="order in paginatedOrders"
                :key="order.id"
                class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                :class="{
                  'bg-primary-50 dark:bg-primary-900/10': isSelected(order.id),
                }"
                @click="router.push(`/orders/${order.id}`)"
              >
                <!-- Checkbox -->
                <td class="py-4 px-4" @click.stop>
                  <UCheckbox
                    :model-value="isSelected(order.id)"
                    @update:model-value="toggleOrderSelection(order.id)"
                  />
                </td>

                <!-- Order ID -->
                <td class="py-4 px-4">
                  <span
                    class="font-mono text-sm font-medium text-gray-900 dark:text-white"
                  >
                    #{{ order?.code || order.id.slice(-6).toUpperCase() }}
                  </span>
                </td>

                <!-- Date -->
                <td class="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                  {{ formatDate(order.date) }}
                </td>

                <!-- Order Type -->
                <td class="py-4 px-4">
                  <span
                    class="font-mono text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {{ order.orderType || "Unknown" }}
                  </span>
                </td>

                <!-- Customer -->
                <td class="py-4 px-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300"
                    >
                      {{ `${order.customer || "W"}`[0].toUpperCase() }}
                    </div>
                    <span class="text-sm text-gray-900 dark:text-white">
                      {{ order.customer || "Walk-in" }}
                    </span>
                  </div>
                </td>

                <!-- Items -->
                <td class="py-4 px-4">
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {{ order.items?.length || 0 }} items
                  </span>
                </td>

                <!-- Payment -->
                <td class="py-4 px-4">
                  <span class="inline-flex items-center gap-1.5 text-sm">
                    <span>{{ getPaymentIcon(order.paymentMethod) }}</span>
                    <span class="text-gray-600 dark:text-gray-400 capitalize">
                      {{ order.paymentMethod || "—" }}
                    </span>
                  </span>
                </td>

                <!-- Total -->
                <td class="py-4 px-4 text-right">
                  <div class="font-semibold text-gray-900 dark:text-white">
                    {{ currency.format(order.total, "LAK") }}
                  </div>
                  <div
                    v-if="order.totalSats"
                    class="text-xs text-amber-600 dark:text-amber-400"
                  >
                    ⚡ {{ order.totalSats.toLocaleString() }} sats
                  </div>
                </td>

                <!-- Status -->
                <td class="py-4 px-4">
                  <span
                    :class="getStatusStyle(order.status)"
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  >
                    {{ t(`orders.status.${order.status}`) || order.status }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="py-4 px-4" @click.stop>
                  <div class="flex justify-end gap-1">
                    <UButton
                      icon="i-heroicons-eye"
                      variant="ghost"
                      color="gray"
                      size="xs"
                      :to="`/orders/${order.id}`"
                    />
                    <UButton
                      icon="i-heroicons-printer"
                      variant="ghost"
                      color="gray"
                      size="xs"
                      :to="`/orders/${order.id}/print`"
                    />
                    <UButton
                      v-if="canVoidOrders"
                      icon="i-heroicons-trash"
                      variant="ghost"
                      color="red"
                      size="xs"
                      @click="deleteOrder(order.id)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Table Footer with Pagination -->
        <div
          class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Showing {{ paginatedOrders.length }} of
            {{ filteredOrders.length }} orders
          </span>
          <UPagination
            v-model:page="currentPage"
            :items-per-page="itemsPerPage"
            :total="filteredOrders.length"
          />
        </div>
      </div>

      <!-- Sync Info Footer -->
      <div class="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
        📡 Orders synced with Nostr relays
        <UBadge
          v-if="ordersStore.syncPending.value > 0"
          color="amber"
          variant="soft"
          size="xs"
          class="ml-2"
        >
          {{ ordersStore.syncPending.value }} pending sync
        </UBadge>
      </div>
    </div>
  </div>
</template>
