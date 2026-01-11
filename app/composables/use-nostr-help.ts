// ============================================
// 📚 NOSTR HELP SYSTEM - DYNAMIC DOCUMENTATION
// Wiki-style help articles stored on Nostr relays
// Supports markdown content, multi-language, and offline caching
// ============================================

import { NOSTR_KINDS } from "~/types/nostr-kinds";

// ============================================
// 📝 TYPES
// ============================================

export interface NostrHelpSection {
  id: string;
  title: string;
  content: string;
  icon?: string;
}

export interface NostrHelpArticle {
  id: string;
  pageId: string; // Route path like 'pos', 'products', 'settings'
  title: string;
  description: string;
  content: string; // Markdown content
  sections?: NostrHelpSection[];
  locale: string; // 'en-US', 'lo-LA'
  tags: string[]; // Searchable tags
  version: number;
  authorPubkey?: string;
  createdAt: string;
  updatedAt: string;
}

interface CachedArticle extends NostrHelpArticle {
  cachedAt: number;
  eventId?: string;
}

// ============================================
// 🔧 COMPOSABLE
// ============================================

export function useNostrHelp() {
  const nostrData = useNostrData();
  const route = useRoute();
  const { locale } = useI18n();
  const staticHelp = useHelp(); // Fallback to static i18n content

  // State
  const articles = useState<NostrHelpArticle[]>(
    "nostr_help_articles",
    () => []
  );
  const isLoading = useState("help-loading", () => false);
  const isSyncing = useState<boolean>("help-syncing", () => false);
  const error = useState<string | null>("help-error", () => null);
  const lastSyncAt = useState<string | null>("help-last-sync", () => null);
  const isEditorOpen = useState<boolean>("help-editor-open", () => false);
  const editingArticle = useState<NostrHelpArticle | null>(
    "help-editing-article",
    () => null
  );

  // Cache key prefix
  const CACHE_KEY = "nostr_help_articles";
  const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

  // ============================================
  // 💾 LOCAL CACHE (localStorage based)
  // ============================================

  function getCachedArticles(): CachedArticle[] {
    if (!import.meta.client) return [];
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return [];
      return JSON.parse(cached) as CachedArticle[];
    } catch {
      return [];
    }
  }

  function setCachedArticles(articles: CachedArticle[]): void {
    if (!import.meta.client) return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(articles));
    } catch (e) {
      console.warn("[NostrHelp] Cache write failed:", e);
    }
  }

  function isCacheValid(): boolean {
    const cached = getCachedArticles();
    if (cached.length === 0) return false;
    const oldest = Math.min(...cached.map((a) => a.cachedAt));
    return Date.now() - oldest < CACHE_TTL;
  }

  // ============================================
  // 📤 PUBLISH OPERATIONS
  // ============================================

  /**
   * Create or update a help article on Nostr
   */
  async function publishHelpArticle(
    article: Omit<
      NostrHelpArticle,
      "id" | "createdAt" | "updatedAt" | "version"
    >
  ): Promise<NostrHelpArticle | null> {
    isLoading.value = true;
    error.value = null;

    try {
      const now = new Date().toISOString();
      const existing = articles.value.find(
        (a) => a.pageId === article.pageId && a.locale === article.locale
      );

      const fullArticle: NostrHelpArticle = {
        id:
          existing?.id ||
          `help_${article.pageId}_${article.locale}_${Date.now()}`,
        ...article,
        version: (existing?.version || 0) + 1,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      // Publish to Nostr as replaceable event
      const event = await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.HELP_ARTICLE,
        fullArticle,
        `${article.pageId}:${article.locale}`, // d-tag for deduplication
        [
          ["page", article.pageId],
          ["l", article.locale],
          ...article.tags.map((tag) => ["t", tag]),
        ],
        false // Don't encrypt - help should be public
      );

      if (!event) {
        throw new Error("Failed to publish help article");
      }

      // Update local state
      const idx = articles.value.findIndex((a) => a.id === fullArticle.id);
      if (idx >= 0) {
        articles.value[idx] = fullArticle;
      } else {
        articles.value.push(fullArticle);
      }

      // Update cache
      const cached = getCachedArticles();
      const cachedIdx = cached.findIndex((a) => a.id === fullArticle.id);
      const cachedArticle: CachedArticle = {
        ...fullArticle,
        cachedAt: Date.now(),
        eventId: event.id,
      };
      if (cachedIdx >= 0) {
        cached[cachedIdx] = cachedArticle;
      } else {
        cached.push(cachedArticle);
      }
      setCachedArticles(cached);

      return fullArticle;
    } catch (e) {
      error.value = `Failed to publish: ${e}`;
      console.error("[NostrHelp] Publish failed:", e);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Delete a help article (mark as deleted)
   */
  async function deleteHelpArticle(articleId: string): Promise<boolean> {
    const article = articles.value.find((a) => a.id === articleId);
    if (!article) return false;

    try {
      await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.HELP_ARTICLE,
        { deleted: true, deletedAt: new Date().toISOString() },
        `${article.pageId}:${article.locale}`,
        [["deleted", "true"]],
        false
      );

      // Remove from local state
      articles.value = articles.value.filter((a) => a.id !== articleId);

      // Update cache
      const cached = getCachedArticles().filter((a) => a.id !== articleId);
      setCachedArticles(cached);

      return true;
    } catch (e) {
      error.value = `Failed to delete: ${e}`;
      return false;
    }
  }

  // ============================================
  // 📥 FETCH OPERATIONS
  // ============================================

  /**
   * Sync help articles from Nostr relays
   */
  async function syncFromNostr(): Promise<void> {
    if (isSyncing.value) return;

    isSyncing.value = true;
    error.value = null;

    try {
      const events = await nostrData.queryEvents([NOSTR_KINDS.HELP_ARTICLE], {
        limit: 100,
      });

      const fetchedArticles: CachedArticle[] = [];

      for (const event of events) {
        try {
          // Skip deleted articles
          if (event.tags.find((t) => t[0] === "deleted")?.[1] === "true") {
            continue;
          }

          const data = JSON.parse(event.content) as NostrHelpArticle;
          if (data.id && data.pageId) {
            fetchedArticles.push({
              ...data,
              cachedAt: Date.now(),
              eventId: event.id,
            });
          }
        } catch {
          // Skip invalid events
        }
      }

      // Update state and cache
      articles.value = fetchedArticles;
      setCachedArticles(fetchedArticles);
      lastSyncAt.value = new Date().toISOString();
    } catch (e) {
      error.value = `Sync failed: ${e}`;
      console.error("[NostrHelp] Sync failed:", e);
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * Load articles from cache or fetch from Nostr
   */
  async function loadArticles(): Promise<void> {
    // Try cache first
    if (isCacheValid()) {
      articles.value = getCachedArticles();
      // Background sync
      syncFromNostr();
      return;
    }

    // Fetch from Nostr
    await syncFromNostr();
  }

  // ============================================
  // 🔍 QUERY OPERATIONS
  // ============================================

  /**
   * Get help content for a specific page
   * Falls back to static i18n content if no Nostr article exists
   */
  function getHelpForPage(
    pageId?: string,
    localeOverride?: string
  ): NostrHelpArticle | null {
    const targetPage = pageId || route.path.split("/")[1] || "dashboard";
    const targetLocale = localeOverride || locale.value;

    // Try exact locale match first
    let article = articles.value.find(
      (a) => a.pageId === targetPage && a.locale === targetLocale
    );

    // Try English fallback
    if (!article && targetLocale !== "en-US") {
      article = articles.value.find(
        (a) => a.pageId === targetPage && a.locale === "en-US"
      );
    }

    // Try any locale
    if (!article) {
      article = articles.value.find((a) => a.pageId === targetPage);
    }

    return article || null;
  }

  /**
   * Get help for current route (computed)
   */
  const currentPageHelp = computed(() => {
    const nostrHelp = getHelpForPage();
    if (nostrHelp) return nostrHelp;

    // Fallback to static help
    const staticContent = staticHelp.getHelpForCurrentPage();
    if (staticContent) {
      // Convert static format to NostrHelpArticle format
      return {
        id: `static_${staticContent.id}`,
        pageId: staticContent.id,
        title: staticContent.title,
        description: staticContent.description,
        content: "",
        sections: staticContent.sections,
        locale: locale.value,
        tags: [],
        version: 0,
        createdAt: "",
        updatedAt: "",
      } as NostrHelpArticle;
    }

    return null;
  });

  /**
   * Search help articles
   */
  function searchHelp(query: string): NostrHelpArticle[] {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return articles.value.filter(
      (a) =>
        a.title.toLowerCase().includes(lowerQuery) ||
        a.description.toLowerCase().includes(lowerQuery) ||
        a.content.toLowerCase().includes(lowerQuery) ||
        a.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
        a.sections?.some(
          (s: NostrHelpSection) =>
            s.title.toLowerCase().includes(lowerQuery) ||
            s.content.toLowerCase().includes(lowerQuery)
        )
    );
  }

  /**
   * Get all articles for a locale
   */
  function getArticlesByLocale(loc?: string): NostrHelpArticle[] {
    const targetLocale = loc || locale.value;
    return articles.value.filter((a) => a.locale === targetLocale);
  }

  // ============================================
  // ✏️ EDITOR OPERATIONS
  // ============================================

  function openEditor(article?: NostrHelpArticle): void {
    editingArticle.value = article || null;
    isEditorOpen.value = true;
  }

  function closeEditor(): void {
    isEditorOpen.value = false;
    editingArticle.value = null;
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  // Auto-load on mount
  if (import.meta.client) {
    onMounted(() => {
      loadArticles();
    });
  }

  return {
    // State
    articles,
    isLoading,
    isSyncing,
    error,
    lastSyncAt,
    currentPageHelp,
    isEditorOpen,
    editingArticle,

    // Operations
    publishHelpArticle,
    deleteHelpArticle,
    syncFromNostr,
    loadArticles,
    getHelpForPage,
    searchHelp,
    getArticlesByLocale,

    // Editor
    openEditor,
    closeEditor,
  };
}
