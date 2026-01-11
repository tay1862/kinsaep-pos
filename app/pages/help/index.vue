<script setup lang="ts">
// 📚 Community Help & Documentation
// Browse, search, and contribute documentation articles
import type { NostrHelpArticle } from "~/composables/use-nostr-help";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const nostrHelp = useNostrHelp();
const toast = useToast();

// UI State
const searchQuery = ref("");
const selectedLocale = ref<string>("all");
const selectedPage = ref<string>("all");
const sortBy = ref<"recent" | "title">("recent");

// Page options for filtering
const pageOptions = [
  { value: "all", label: t("help.allPages", "All Pages") },
  { value: "dashboard", label: "Dashboard" },
  { value: "pos", label: "Point of Sale" },
  { value: "products", label: t("products.title", "Products") },
  { value: "inventory", label: t("inventory.title", "Inventory") },
  { value: "orders", label: t("orders.title", "Orders") },
  { value: "customers", label: t("customers.title", "Customers") },
  { value: "reports", label: t("reports.title", "Reports") },
  { value: "settings", label: t("settings.title", "Settings") },
  { value: "accounting", label: t("accounting.title", "Accounting") },
  { value: "kitchen", label: t("kitchen.title", "Kitchen") },
];

const localeOptions = [
  { value: "all", label: t("help.allLanguages", "All Languages") },
  { value: "en-US", label: "🇺🇸 English" },
  { value: "lo-LA", label: "🇱🇦 ລາວ" },
];

// Check if user can write (logged in with Nostr)
const canWrite = computed(() => {
  if (!import.meta.client) return false;
  const stored = localStorage.getItem("nostrUser");
  return !!stored;
});

// Filtered articles
const filteredArticles = computed(() => {
  let articles = [...nostrHelp.articles.value];

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    articles = articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  // Locale filter
  if (selectedLocale.value !== "all") {
    articles = articles.filter((a) => a.locale === selectedLocale.value);
  }

  // Page filter
  if (selectedPage.value !== "all") {
    articles = articles.filter((a) => a.pageId === selectedPage.value);
  }

  // Sort
  if (sortBy.value === "recent") {
    articles.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } else {
    articles.sort((a, b) => a.title.localeCompare(b.title));
  }

  return articles;
});

// Group articles by page
const groupedArticles = computed(() => {
  const groups: Record<string, NostrHelpArticle[]> = {};
  for (const article of filteredArticles.value) {
    if (!groups[article.pageId]) {
      groups[article.pageId] = [];
    }
    groups[article.pageId].push(article);
  }
  return groups;
});

// Stats
const stats = computed(() => ({
  total: nostrHelp.articles.value.length,
  english: nostrHelp.articles.value.filter((a) => a.locale === "en-US").length,
  lao: nostrHelp.articles.value.filter((a) => a.locale === "lo-LA").length,
}));

// Format date
function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Get page label
function getPageLabel(pageId: string) {
  const option = pageOptions.find((p) => p.value === pageId);
  return option?.label || pageId;
}

// Open article for editing
function editArticle(article: NostrHelpArticle) {
  nostrHelp.openEditor(article);
}

// Create new article
function createNew() {
  nostrHelp.openEditor();
}

// Sync from Nostr
async function handleSync() {
  await nostrHelp.syncFromNostr();
  toast.add({
    title: t("help.syncComplete", "Sync Complete"),
    description: t("help.syncedFromNostr", "Articles synced from Nostr"),
    color: "green",
    icon: "i-heroicons-check-circle",
  });
}

// Load on mount
onMounted(() => {
  nostrHelp.loadArticles();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Header -->
    <div
      class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10"
    >
      <div class="max-w-6xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              📚 {{ t("help.communityDocs", "Community Documentation") }}
            </h1>
            <p class="mt-1 text-gray-500 dark:text-gray-400">
              {{
                t("help.communityDocsDesc", "Browse and contribute documentation written by the community")
              }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-heroicons-arrow-path"
              :loading="nostrHelp.isSyncing.value"
              @click="handleSync"
            >
              {{ t("common.sync", "Sync") }}
            </UButton>
            <UButton
              v-if="canWrite"
              color="primary"
              icon="i-heroicons-plus"
              @click="createNew"
            >
              {{ t("help.writeArticle", "Write Article") }}
            </UButton>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4 mt-6">
          <div
            class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center"
          >
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {{ stats.total }}
            </p>
            <p class="text-sm text-gray-500">
              {{ t("help.totalArticles", "Total Articles") }}
            </p>
          </div>
          <div
            class="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center"
          >
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">
              🇺🇸 {{ stats.english }}
            </p>
            <p class="text-sm text-gray-500">English</p>
          </div>
          <div
            class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center"
          >
            <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">
              🇱🇦 {{ stats.lao }}
            </p>
            <p class="text-sm text-gray-500">ລາວ</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="max-w-6xl mx-auto px-4 py-4">
      <div
        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
      >
        <div class="flex flex-col md:flex-row gap-4">
          <div class="flex-1">
            <UInput
              v-model="searchQuery"
              :placeholder="t('help.searchArticles', 'Search articles...')"
              icon="i-heroicons-magnifying-glass"
              size="lg"
              class="w-full"
            />
          </div>
          <div class="flex gap-3">
            <USelect
              v-model="selectedPage"
              :items="pageOptions"
              value-key="value"
              label-key="label"
              class="w-40"
            />
            <USelect
              v-model="selectedLocale"
              :items="localeOptions"
              value-key="value"
              label-key="label"
              class="w-40"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-6xl mx-auto px-4 pb-8">
      <!-- Loading -->
      <div v-if="nostrHelp.isLoading.value" class="text-center py-16">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-10 h-10 animate-spin text-gray-400 mb-4"
        />
        <p class="text-gray-500">
          {{ t("common.loading", "Loading...") }}
        </p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredArticles.length === 0"
        class="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800"
      >
        <div class="text-6xl mb-4">📝</div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {{
            searchQuery
              ? t("help.noResults", "No results found")
              : t("help.noArticlesYet", "No articles yet")
          }}
        </h3>
        <p class="text-gray-500 mb-6 max-w-md mx-auto">
          {{
            searchQuery
              ? t("help.tryDifferentSearch", "Try a different search term")
              : t("help.beFirstToWrite", "Be the first to write a help article for the community!")
          }}
        </p>
        <UButton
          v-if="canWrite && !searchQuery"
          color="primary"
          icon="i-heroicons-pencil-square"
          @click="createNew"
        >
          {{ t("help.writeFirst", "Write First Article") }}
        </UButton>
      </div>

      <!-- Articles Grid -->
      <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="article in filteredArticles"
          :key="article.id"
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-shadow cursor-pointer group"
          @click="editArticle(article)"
        >
          <!-- Header -->
          <div class="flex items-start justify-between mb-3">
            <UBadge color="primary" variant="subtle" size="xs">
              {{ getPageLabel(article.pageId) }}
            </UBadge>
            <UBadge
              :color="article.locale === 'en-US' ? 'blue' : 'amber'"
              variant="soft"
              size="xs"
            >
              {{ article.locale === "en-US" ? "🇺🇸" : "🇱🇦" }}
              {{ article.locale }}
            </UBadge>
          </div>

          <!-- Title & Description -->
          <h3
            class="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600"
          >
            {{ article.title }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
            {{ article.description }}
          </p>

          <!-- Tags -->
          <div v-if="article.tags.length" class="flex flex-wrap gap-1 mb-4">
            <UBadge
              v-for="tag in article.tags.slice(0, 3)"
              :key="tag"
              color="neutral"
              variant="subtle"
              size="xs"
            >
              {{ tag }}
            </UBadge>
            <UBadge
              v-if="article.tags.length > 3"
              color="neutral"
              variant="subtle"
              size="xs"
            >
              +{{ article.tags.length - 3 }}
            </UBadge>
          </div>

          <!-- Footer -->
          <div
            class="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-800"
          >
            <span class="flex items-center gap-1">
              <UIcon name="i-heroicons-clock" class="w-3 h-3" />
              {{ formatDate(article.updatedAt) }}
            </span>
            <span>v{{ article.version }}</span>
          </div>
        </div>
      </div>

      <!-- Contribute Banner -->
      <div
        v-if="canWrite && filteredArticles.length > 0"
        class="mt-8 bg-linear-to-r from-primary-500 to-purple-500 rounded-xl p-6 text-center text-white"
      >
        <h3 class="text-xl font-bold mb-2">
          {{ t("help.contributeTitle", "Help the Community!") }}
        </h3>
        <p class="opacity-90 mb-4 max-w-lg mx-auto">
          {{
            t("help.contributeDesc", "Your knowledge can help other users. Write documentation in your language and share it via Nostr.")
          }}
        </p>
        <UButton
          color="white"
          icon="i-heroicons-pencil-square"
          @click="createNew"
        >
          {{ t("help.writeNew", "Write New Article") }}
        </UButton>
      </div>

      <!-- Nostr Info -->
      <div class="mt-8 text-center text-sm text-gray-400">
        <p class="flex items-center justify-center gap-2">
          <UIcon name="i-heroicons-cloud" class="w-4 h-4" />
          {{
            t("help.poweredByNostr", "Powered by Nostr - Decentralized & Censorship-Resistant")
          }}
        </p>
      </div>
    </div>


    <!-- Help Editor Modal -->
    <CommonHelpEditorModal
      :article="nostrHelp.editingArticle.value"
      @close="nostrHelp.closeEditor()"
      @saved="nostrHelp.closeEditor()"
    />
  </div>
</template>
