<template>
  <div class="min-h-screen">
    <!-- Page Header -->
    <CommonPageHeader
      :title="$t('notifications.title')"
      :description="$t('notifications.pageDescription')"
      icon="i-heroicons-bell"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <!-- Filter Dropdown -->
          <USelectMenu
            v-model="selectedFilter"
            :items="filterOptions"
            value-key="value"
            class="w-40"
          >
            <template #leading>
              <Icon name="i-heroicons-funnel" size="16" />
            </template>
          </USelectMenu>

          <!-- Mark All Read -->
          <UButton
            v-if="unreadCount > 0"
            icon="i-heroicons-check-circle"
            variant="soft"
            @click="markAllAsRead"
          >
            {{ $t("notifications.markAllRead") }}
          </UButton>

          <!-- Clear All -->
          <UButton
            v-if="notifications.length > 0"
            icon="i-heroicons-trash"
            variant="soft"
            color="error"
            @click="showClearConfirm = true"
          >
            {{ $t("notifications.clearAll") }}
          </UButton>
        </div>
      </template>
    </CommonPageHeader>

    <div class="p-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          class="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
            >
              <Icon
                name="i-heroicons-bell"
                size="24"
                class="text-primary-600 dark:text-primary-400"
              />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ notifications.length }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t("notifications.stats.total") }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
            >
              <Icon
                name="i-heroicons-envelope"
                size="24"
                class="text-red-600 dark:text-red-400"
              />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ unreadCount }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t("notifications.stats.unread") }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
            >
              <Icon
                name="i-heroicons-bolt"
                size="24"
                class="text-green-600 dark:text-green-400"
              />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ paymentCount }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t("notifications.stats.payments") }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center"
            >
              <Icon
                name="i-heroicons-archive-box"
                size="24"
                class="text-yellow-600 dark:text-yellow-400"
              />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stockAlertCount }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t("notifications.stats.stockAlerts") }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Notifications List -->
      <div
        class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <!-- Empty State -->
        <div v-if="filteredNotifications.length === 0" class="p-12 text-center">
          <div
            class="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
          >
            <Icon
              name="i-heroicons-bell-slash"
              size="40"
              class="text-gray-400 dark:text-gray-500"
            />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {{ $t("notifications.emptyTitle") }}
          </h3>
          <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {{ $t("notifications.emptyDescription") }}
          </p>
        </div>

        <!-- Grouped Notifications -->
        <div v-else>
          <div
            v-for="(group, date) in groupedNotifications"
            :key="date"
            class="border-b border-gray-100 dark:border-gray-700 last:border-0"
          >
            <!-- Date Header -->
            <div
              class="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10"
            >
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ formatDateHeader(date as string) }}
              </p>
            </div>

            <!-- Notifications for this date -->
            <div class="divide-y divide-gray-100 dark:divide-gray-700">
              <div
                v-for="notification in group"
                :key="notification.id"
                class="group p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all cursor-pointer"
                :class="{
                  'bg-primary-50/30 dark:bg-primary-900/10 border-l-4 border-l-primary-500':
                    !notification.read,
                }"
                @click="handleNotificationClick(notification)"
              >
                <div class="flex items-start gap-4">
                  <!-- Icon -->
                  <div
                    class="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    :class="getIconBgClass(notification.type)"
                  >
                    <Icon
                      :name="getIcon(notification.type)"
                      size="24"
                      :class="getIconClass(notification.type)"
                    />
                  </div>

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <div class="flex items-center gap-2 mb-1">
                          <p
                            class="font-semibold text-gray-900 dark:text-white"
                            :class="{
                              'text-primary-700 dark:text-primary-300':
                                !notification.read,
                            }"
                          >
                            {{ notification.title }}
                          </p>
                          <UBadge
                            :label="getTypeLabel(notification.type)"
                            size="xs"
                            :color="getTypeColor(notification.type)"
                            variant="subtle"
                          />
                        </div>
                        <p
                          class="text-gray-600 dark:text-gray-400 line-clamp-2"
                        >
                          {{ notification.message }}
                        </p>
                        <div
                          class="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-500"
                        >
                          <span class="flex items-center gap-1">
                            <Icon name="i-heroicons-clock" size="14" />
                            {{ formatTime(notification.createdAt) }}
                          </span>
                          <span
                            v-if="notification.read"
                            class="flex items-center gap-1 text-green-600 dark:text-green-400"
                          >
                            <Icon name="i-heroicons-check-circle" size="14" />
                            {{ $t("notifications.read") }}
                          </span>
                        </div>
                      </div>

                      <!-- Actions -->
                      <div
                        class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <UButton
                          v-if="!notification.read"
                          icon="i-heroicons-check"
                          variant="ghost"
                          size="sm"
                          :title="$t('notifications.markRead')"
                          @click.stop="markAsRead(notification.id)"
                        />
                        <UButton
                          icon="i-heroicons-trash"
                          variant="ghost"
                          size="sm"
                          color="error"
                          :title="$t('notifications.delete')"
                          @click.stop="deleteNotification(notification.id)"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Unread Indicator -->
                  <div
                    v-if="!notification.read"
                    class="shrink-0 w-3 h-3 rounded-full bg-primary-500 animate-pulse"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load More Button -->
      <div v-if="hasMore" class="mt-6 text-center">
        <UButton variant="soft" size="lg" @click="loadMore">
          {{ $t("common.loadMore") }}
        </UButton>
      </div>
    </div>

    <!-- Clear All Confirmation Modal -->
    <UModal v-model:open="showClearConfirm">
      <template #content>
        <div class="p-6 text-center">
          <div
            class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
          >
            <Icon
              name="i-heroicons-exclamation-triangle"
              size="32"
              class="text-red-600 dark:text-red-400"
            />
          </div>
          <h3
            class="text-lg font-semibold text-gray-900 dark:text-white mb-2"
          >
            {{ $t("notifications.clearConfirmTitle") }}
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-6">
            {{ $t("notifications.clearConfirmMessage") }}
          </p>
          <div class="flex items-center justify-center gap-3">
            <UButton variant="ghost" @click="showClearConfirm = false">
              {{ $t("common.cancel") }}
            </UButton>
            <UButton color="error" @click="handleClearAll">
              {{ $t("notifications.clearAll") }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { POSNotification } from "~/types";

definePageMeta({
  layout: "default",
});

const { t } = useI18n();
const router = useRouter();

const {
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
} = useNotifications();

// State
const showClearConfirm = ref(false);
const selectedFilter = ref("all");
const hasMore = ref(false);

// Filter options
const filterOptions = computed(() => [
  { label: t("notifications.filters.all"), value: "all" },
  { label: t("notifications.filters.unread"), value: "unread" },
  { label: t("notifications.filters.payments"), value: "payment" },
  { label: t("notifications.filters.orders"), value: "order" },
  { label: t("notifications.filters.stock"), value: "stock" },
  { label: t("notifications.filters.loyalty"), value: "loyalty" },
  { label: t("notifications.filters.ai"), value: "ai_insight" },
]);

// Stats
const paymentCount = computed(
  () => notifications.value.filter((n) => n.type === "payment").length
);
const stockAlertCount = computed(
  () => notifications.value.filter((n) => n.type === "stock").length
);

// Filtered notifications
const filteredNotifications = computed(() => {
  if (selectedFilter.value === "all") return notifications.value;
  if (selectedFilter.value === "unread")
    return notifications.value.filter((n) => !n.read);
  return notifications.value.filter((n) => n.type === selectedFilter.value);
});

// Group notifications by date
const groupedNotifications = computed(() => {
  const groups: Record<string, POSNotification[]> = {};

  filteredNotifications.value.forEach((notification) => {
    const date = new Date(notification.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
  });

  return groups;
});

// Format date header
function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return t("time.today");
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return t("time.yesterday");
  }

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format time
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 60) return t("time.minutesAgo", { count: minutes || 1 });
  if (hours < 24) return t("time.hoursAgo", { count: hours });

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Icon helpers
function getIcon(type: POSNotification["type"]): string {
  const icons: Record<POSNotification["type"], string> = {
    payment: "i-heroicons-bolt",
    order: "i-heroicons-shopping-bag",
    stock: "i-heroicons-archive-box",
    loyalty: "i-heroicons-star",
    ai_insight: "i-heroicons-sparkles",
    alert: "i-heroicons-exclamation-triangle",
    system: "i-heroicons-cog-6-tooth",
  };
  return icons[type] || "i-heroicons-bell";
}

function getIconClass(type: POSNotification["type"]): string {
  const classes: Record<POSNotification["type"], string> = {
    payment: "text-green-600 dark:text-green-400",
    order: "text-blue-600 dark:text-blue-400",
    stock: "text-yellow-600 dark:text-yellow-400",
    loyalty: "text-purple-600 dark:text-purple-400",
    ai_insight: "text-cyan-600 dark:text-cyan-400",
    alert: "text-orange-600 dark:text-orange-400",
    system: "text-gray-600 dark:text-gray-400",
  };
  return classes[type] || "text-gray-600 dark:text-gray-400";
}

function getIconBgClass(type: POSNotification["type"]): string {
  const classes: Record<POSNotification["type"], string> = {
    payment: "bg-green-100 dark:bg-green-900/30",
    order: "bg-blue-100 dark:bg-blue-900/30",
    stock: "bg-yellow-100 dark:bg-yellow-900/30",
    loyalty: "bg-purple-100 dark:bg-purple-900/30",
    ai_insight: "bg-cyan-100 dark:bg-cyan-900/30",
    alert: "bg-orange-100 dark:bg-orange-900/30",
    system: "bg-gray-100 dark:bg-gray-800",
  };
  return classes[type] || "bg-gray-100 dark:bg-gray-800";
}

function getTypeLabel(type: POSNotification["type"]): string {
  const labels: Record<POSNotification["type"], string> = {
    payment: t("notifications.types.payment"),
    order: t("notifications.types.order"),
    stock: t("notifications.types.stock"),
    loyalty: t("notifications.types.loyalty"),
    ai_insight: t("notifications.types.ai"),
    alert: t("notifications.types.alert", "Alert"),
    system: t("notifications.types.system", "System"),
  };
  return labels[type] || type;
}

function getTypeColor(
  type: POSNotification["type"]
): "green" | "blue" | "yellow" | "purple" | "cyan" | "orange" | "gray" {
  const colors: Record<
    POSNotification["type"],
    "green" | "blue" | "yellow" | "purple" | "cyan" | "orange" | "gray"
  > = {
    payment: "green",
    order: "blue",
    stock: "yellow",
    loyalty: "purple",
    ai_insight: "cyan",
    alert: "orange",
    system: "gray",
  };
  return colors[type] || "cyan";
}

// Handle notification click
function handleNotificationClick(notification: POSNotification) {
  markAsRead(notification.id);

  // Navigate based on notification type and data
  const actionUrl = (notification as POSNotification & { actionUrl?: string }).actionUrl;
  if (actionUrl) {
    router.push(actionUrl);
  }
}

// Handle clear all
function handleClearAll() {
  clearAll();
  showClearConfirm.value = false;
}

// Load more (placeholder)
function loadMore() {
  // Implement pagination if needed
}
</script>
