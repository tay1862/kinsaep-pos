<script setup lang="ts">
import { useNotifications } from "~/composables/use-notifications";
import { parseMarkdown } from "~/utils/markdown";
import type { POSNotification, NotificationPriority } from "~/types";

const notificationsStore = useNotifications();
const { t } = useI18n();

// Slideover state
const isOpen = ref(false);

// Filters
const searchQuery = ref("");
const categoryFilter = ref<"all" | "security" | "maintenance" | "update" | "feature" | "bugfix">("all");

// Only show announcements/system notifications
const announcements = computed(() => {
  return notificationsStore.notifications.value.filter(
    (n) => n.type === "system_update" || n.type === "system" || n.type === "alert"
  );
});

// Filtered announcements
const filteredAnnouncements = computed(() => {
  let list = announcements.value;

  // Filter by category
  if (categoryFilter.value !== "all") {
    list = list.filter((n) => {
      const category = n.data?.category || "";
      return category.includes(categoryFilter.value);
    });
  }

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    list = list.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
    );
  }

  return list;
});

// Group by date
const groupedAnnouncements = computed(() => {
  const groups: { label: string; announcements: POSNotification[] }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  const todayList: POSNotification[] = [];
  const yesterdayList: POSNotification[] = [];
  const thisWeekList: POSNotification[] = [];
  const olderList: POSNotification[] = [];

  for (const n of filteredAnnouncements.value) {
    const date = new Date(n.createdAt);
    if (date >= today) {
      todayList.push(n);
    } else if (date >= yesterday) {
      yesterdayList.push(n);
    } else if (date >= thisWeek) {
      thisWeekList.push(n);
    } else {
      olderList.push(n);
    }
  }

  if (todayList.length)
    groups.push({ label: t("notifications.today", "Today"), announcements: todayList });
  if (yesterdayList.length)
    groups.push({ label: t("notifications.yesterday", "Yesterday"), announcements: yesterdayList });
  if (thisWeekList.length)
    groups.push({ label: t("notifications.thisWeek", "This Week"), announcements: thisWeekList });
  if (olderList.length)
    groups.push({ label: t("notifications.older", "Older"), announcements: olderList });

  return groups;
});

// Unread count
const unreadCount = computed(() => {
  return announcements.value.filter((n) => !n.read).length;
});

// Category counts
const categoryCounts = computed(() => {
  const counts: Record<string, number> = {
    security: 0,
    maintenance: 0,
    update: 0,
    feature: 0,
    bugfix: 0,
  };

  announcements.value.forEach((n) => {
    const category = n.data?.category || "";
    if (category.includes("security")) counts.security++;
    else if (category.includes("maintenance")) counts.maintenance++;
    else if (category.includes("update")) counts.update++;
    else if (category.includes("feature")) counts.feature++;
    else if (category.includes("bugfix")) counts.bugfix++;
  });

  return counts;
});

// Category configuration
const categories = computed(() => [
  {
    value: "all",
    label: t("announcements.all", "All"),
    icon: "i-heroicons-megaphone",
    color: "gray",
    count: announcements.value.length,
  },
  {
    value: "security",
    label: t("announcements.security", "Security"),
    icon: "i-heroicons-shield-check",
    color: "red",
    count: categoryCounts.value.security,
  },
  {
    value: "maintenance",
    label: t("announcements.maintenance", "Maintenance"),
    icon: "i-heroicons-wrench-screwdriver",
    color: "orange",
    count: categoryCounts.value.maintenance,
  },
  {
    value: "update",
    label: t("announcements.update", "Updates"),
    icon: "i-heroicons-arrow-up-circle",
    color: "blue",
    count: categoryCounts.value.update,
  },
  {
    value: "feature",
    label: t("announcements.feature", "Features"),
    icon: "i-heroicons-sparkles",
    color: "purple",
    count: categoryCounts.value.feature,
  },
  {
    value: "bugfix",
    label: t("announcements.bugfix", "Bug Fixes"),
    icon: "i-heroicons-bug-ant",
    color: "green",
    count: categoryCounts.value.bugfix,
  },
]);

// Get category config
function getCategoryConfig(announcement: POSNotification) {
  const category = announcement.data?.category || "";

  if (category.includes("security")) {
    return {
      icon: "i-heroicons-shield-check",
      color: "text-red-500 bg-red-50 dark:bg-red-900/20",
      badgeColor: "red",
      label: t("announcements.security", "Security"),
    };
  }
  if (category.includes("maintenance")) {
    return {
      icon: "i-heroicons-wrench-screwdriver",
      color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
      badgeColor: "orange",
      label: t("announcements.maintenance", "Maintenance"),
    };
  }
  if (category.includes("update")) {
    return {
      icon: "i-heroicons-arrow-up-circle",
      color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
      badgeColor: "blue",
      label: t("announcements.update", "Update"),
    };
  }
  if (category.includes("feature")) {
    return {
      icon: "i-heroicons-sparkles",
      color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
      badgeColor: "purple",
      label: t("announcements.feature", "Feature"),
    };
  }
  if (category.includes("bugfix")) {
    return {
      icon: "i-heroicons-bug-ant",
      color: "text-green-500 bg-green-50 dark:bg-green-900/20",
      badgeColor: "green",
      label: t("announcements.bugfix", "Bug Fix"),
    };
  }

  return {
    icon: "i-heroicons-megaphone",
    color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20",
    badgeColor: "indigo",
    label: t("announcements.general", "Announcement"),
  };
}

// Priority badge color
function getPriorityColor(priority?: NotificationPriority) {
  switch (priority) {
    case "critical":
      return "red";
    case "high":
      return "orange";
    case "medium":
      return "yellow";
    case "low":
      return "gray";
    default:
      return "gray";
  }
}

// Actions
function markAsRead(id: string) {
  notificationsStore.markAsRead(id);
}

function markAllAsRead() {
  const announcementIds = announcements.value.filter((n) => !n.read).map((n) => n.id);
  announcementIds.forEach((id) => notificationsStore.markAsRead(id));
}

function deleteAnnouncement(id: string) {
  notificationsStore.deleteNotification(id);
}

// Time formatting
const formatTime = (isoString: string) => {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return t("common.justNow");
    if (diff < 3600) {
      const n = Math.floor(diff / 60);
      return `${n}m ago`;
    }
    if (diff < 86400) {
      const n = Math.floor(diff / 3600);
      return `${n}h ago`;
    }
    const n = Math.floor(diff / 86400);
    return `${n}d ago`;
  } catch {
    return "";
  }
};

// Expose open method
defineExpose({
  open: () => {
    isOpen.value = true;
  },
});
</script>

<template>
  <div>
    <!-- Trigger Button (Megaphone) -->
    <UButton
      variant="ghost"
      color="gray"
      class="relative"
      @click="isOpen = true"
    >
      <UIcon name="i-heroicons-megaphone" class="w-6 h-6" />

      <!-- Unread Badge -->
      <span
        v-if="unreadCount > 0"
        class="absolute top-0 right-0 -mt-1 -mr-1 flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-indigo-500 rounded-full ring-2 ring-white dark:ring-gray-900"
      >
        {{ unreadCount > 99 ? "99+" : unreadCount }}
      </span>
    </UButton>

    <!-- Slideover -->
    <USlideover
      v-model:open="isOpen"
      :title="t('announcements.title', 'Announcements')"
      :description="t('announcements.description', 'System updates and announcements')"
    >
      <template #content>
        <div class="flex flex-col h-full bg-white dark:bg-gray-900">
          <!-- Header -->
          <div
            class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-megaphone" class="w-5 h-5 text-indigo-500" />
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">
                {{ t("announcements.title", "Announcements") }}
              </h2>
              <UBadge
                v-if="unreadCount > 0"
                size="xs"
                color="indigo"
                variant="solid"
              >
                {{ unreadCount }}
              </UBadge>
            </div>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="isOpen = false"
            />
          </div>

          <!-- Category Filter -->
          <div
            class="p-4 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800"
          >
            <div class="flex flex-wrap gap-2">
              <button
                v-for="category in categories"
                :key="category.value"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                :class="
                  categoryFilter === category.value
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                "
                @click="categoryFilter = category.value as typeof categoryFilter"
              >
                <UIcon :name="category.icon" class="w-3.5 h-3.5" />
                <span>{{ category.label }}</span>
                <span
                  v-if="category.count > 0"
                  class="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  :class="
                    categoryFilter === category.value
                      ? 'bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  "
                >
                  {{ category.count }}
                </span>
              </button>
            </div>

            <!-- Search -->
            <div class="mt-3">
              <UInput
                v-model="searchQuery"
                icon="i-heroicons-magnifying-glass"
                :placeholder="t('announcements.search', 'Search announcements...')"
                size="sm"
              >
                <template #trailing>
                  <UButton
                    v-if="searchQuery !== ''"
                    color="gray"
                    variant="link"
                    icon="i-heroicons-x-mark"
                    :padded="false"
                    @click="searchQuery = ''"
                  />
                </template>
              </UInput>
            </div>
          </div>

          <!-- Announcement List (Grouped by Date) -->
          <div class="flex-1 overflow-y-auto">
            <!-- Empty State -->
            <div
              v-if="filteredAnnouncements.length === 0"
              class="flex flex-col items-center justify-center h-full text-gray-400 py-12 px-4"
            >
              <div
                class="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4"
              >
                <UIcon
                  name="i-heroicons-megaphone"
                  class="w-10 h-10 opacity-50"
                />
              </div>
              <p class="text-sm font-medium">
                {{ t("announcements.noAnnouncements", "No announcements") }}
              </p>
              <p class="text-xs opacity-70 mt-1 text-center">
                {{ t("announcements.checkBackLater", "Check back later for updates") }}
              </p>
            </div>

            <!-- Grouped Announcements -->
            <div v-else>
              <div
                v-for="group in groupedAnnouncements"
                :key="group.label"
                class="mb-2"
              >
                <!-- Date Group Header -->
                <div
                  class="sticky top-0 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider z-10"
                >
                  {{ group.label }}
                </div>

                <!-- Announcements in Group -->
                <TransitionGroup name="list">
                  <div
                    v-for="announcement in group.announcements"
                    :key="announcement.id"
                    class="group relative bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    :class="[
                      !announcement.read &&
                        'bg-indigo-50/30 dark:bg-indigo-900/10 border-l-4 border-l-indigo-500',
                    ]"
                    @click="markAsRead(announcement.id)"
                  >
                    <div class="flex gap-3">
                      <!-- Icon -->
                      <div
                        class="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
                        :class="getCategoryConfig(announcement).color"
                      >
                        <UIcon
                          :name="getCategoryConfig(announcement).icon"
                          class="w-6 h-6"
                        />
                      </div>

                      <!-- Content -->
                      <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start gap-2 mb-2">
                          <div class="flex items-center gap-2 flex-wrap">
                            <h3
                              class="text-sm font-semibold text-gray-900 dark:text-gray-100"
                              :class="{ 'font-bold': !announcement.read }"
                            >
                              {{ announcement.title }}
                            </h3>
                            <!-- Category Badge -->
                            <UBadge
                              size="xs"
                              :color="getCategoryConfig(announcement).badgeColor"
                              variant="subtle"
                            >
                              {{ getCategoryConfig(announcement).label }}
                            </UBadge>
                            <!-- Priority Badge -->
                            <UBadge
                              v-if="
                                announcement.priority &&
                                announcement.priority !== 'low'
                              "
                              size="xs"
                              :color="getPriorityColor(announcement.priority)"
                              variant="subtle"
                            >
                              {{ announcement.priority }}
                            </UBadge>
                          </div>
                          <span
                            class="text-[10px] uppercase font-medium text-gray-400 whitespace-nowrap"
                          >
                            {{ formatTime(announcement.createdAt) }}
                          </span>
                        </div>

                        <!-- Message (Markdown support) -->
                        <div
                          class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                          v-html="parseMarkdown(announcement.message)"
                        />

                        <!-- Nostr Badge -->
                        <div class="mt-3 flex items-center gap-2">
                          <UBadge
                            size="xs"
                            color="violet"
                            variant="subtle"
                            class="rounded-full"
                          >
                            <UIcon
                              name="i-heroicons-shield-check"
                              class="w-3 h-3 mr-1"
                            />
                            {{
                              t(
                                "announcements.verifiedOnNostr",
                                "Verified on Nostr"
                              )
                            }}
                          </UBadge>
                        </div>
                      </div>

                      <!-- Unread Indicator -->
                      <div
                        v-if="!announcement.read"
                        class="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2"
                      />
                    </div>

                    <!-- Delete Action (On Hover) -->
                    <div
                      class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <UButton
                        color="gray"
                        variant="ghost"
                        icon="i-heroicons-trash"
                        size="xs"
                        @click.stop="deleteAnnouncement(announcement.id)"
                      />
                    </div>
                  </div>
                </TransitionGroup>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div
            v-if="announcements.length > 0"
            class="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          >
            <UButton
              block
              variant="soft"
              color="indigo"
              size="sm"
              icon="i-heroicons-check-circle"
              :disabled="unreadCount === 0"
              @click="markAllAsRead"
            >
              {{ t("announcements.markAllRead", "Mark all read") }}
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
