<!-- components/common/HelpDrawer.vue -->
<!-- Enhanced drawer with Nostr dynamic content support -->
<script setup lang="ts">
const help = useHelp();
const nostrHelp = useNostrHelp();
const feedback = useFeedback();
const { t } = useI18n();

// Use Nostr help with fallback to static
const currentHelp = computed(() => nostrHelp.currentPageHelp.value);

const searchQuery = ref("");
const searchResults = computed(() => {
  if (!searchQuery.value.trim()) return [];
  // Search both Nostr and static help
  const nostrResults = nostrHelp.searchHelp(searchQuery.value);
  const staticResults = help.searchHelp(searchQuery.value);
  return [
    ...nostrResults.map(
      (a: { id: string; title: string; description: string }) => ({
        id: a.id,
        title: a.title,
        content: a.description,
        icon: "i-heroicons-document-text",
      })
    ),
    ...staticResults,
  ];
});

const showSearch = computed(() => searchQuery.value.trim().length > 0);

// Check if user can edit (for now, anyone logged in can edit)
const canEdit = computed(() => {
  if (!import.meta.client) return false;
  const stored = localStorage.getItem("nostrUser");
  return !!stored;
});

function handleEdit() {
  // Open editor with current help article
  const article = nostrHelp.getHelpForPage();
  nostrHelp.openEditor(article);
}

function handleWriteNew() {
  nostrHelp.openEditor();
}
</script>

<template>
  <USlideover v-model:open="help.isDrawerOpen.value" side="right">
    <template #content>
      <div class="flex flex-col h-full">
        <!-- Header -->
        <div class="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between mb-3 sm:mb-4">
            <div class="flex items-center gap-2">
              <Icon
                name="i-heroicons-question-mark-circle"
                class="text-lg sm:text-xl text-primary-500"
              />
              <h2
                class="text-base sm:text-lg font-semibold text-gray-900 dark:text-white"
              >
                {{ t("help.title", "Help") }}
              </h2>
            </div>
            <div class="flex items-center gap-1 sm:gap-2">
              <UButton
                to="https://discord.gg/aNwEQQF3w8"
                color="gray"
                variant="ghost"
                size="sm"
                icon="skill-icons:discord"
                target="_blank"
                class="min-h-[40px] min-w-[40px]"
              >
                <span class="hidden sm:inline">{{
                  t("help.joinDiscord", "Join Discord")
                }}</span>
              </UButton>
              <!-- Sync Status -->
              <UButton
                v-if="nostrHelp.isSyncing.value"
                color="gray"
                variant="ghost"
                size="sm"
                loading
                disabled
                class="hidden sm:flex"
              >
                {{ t("help.syncing", "Syncing...") }}
              </UButton>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-x-mark"
                class="min-h-[40px] min-w-[40px]"
                @click="help.closeHelp()"
              />
            </div>
          </div>

          <!-- Search -->
          <UInput
            v-model="searchQuery"
            :placeholder="t('help.searchPlaceholder', 'Search help...')"
            icon="i-heroicons-magnifying-glass"
            class="w-full"
            size="lg"
          />
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Loading State -->
          <div
            v-if="nostrHelp.isLoading.value"
            class="flex items-center justify-center py-8"
          >
            <Icon
              name="i-heroicons-arrow-path"
              class="animate-spin text-2xl text-gray-400"
            />
          </div>

          <!-- Search Results -->
          <div v-else-if="showSearch" class="space-y-3">
            <p class="text-sm text-gray-500">
              {{ searchResults.length }}
              {{ t("help.resultsFound", "results found") }}
            </p>
            <div
              v-for="result in searchResults"
              :key="result.id"
              class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div class="flex items-start gap-2">
                <Icon
                  v-if="result.icon"
                  :name="result.icon"
                  class="text-primary-500 mt-0.5"
                />
                <div>
                  <h4 class="font-medium text-gray-900 dark:text-white">
                    {{ result.title }}
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ result.content }}
                  </p>
                </div>
              </div>
            </div>
            <div v-if="searchResults.length === 0" class="text-center py-8">
              <Icon
                name="i-heroicons-magnifying-glass"
                class="text-4xl text-gray-400 mb-2"
              />
              <p class="text-gray-500">
                {{ t("help.noResults", "No results found") }}
              </p>
            </div>
          </div>

          <!-- Page Help Content (Dynamic from Nostr or Static fallback) -->
          <div v-else-if="currentHelp" class="space-y-6">
            <!-- Header with Edit Button -->
            <div class="flex items-start justify-between">
              <UButton
                v-if="canEdit"
                color="gray"
                variant="ghost"
                icon="i-heroicons-pencil-square"
                size="xs"
                @click="handleEdit"
              >
                {{ t("help.edit", "Edit") }}
              </UButton>
            </div>

            <!-- Markdown Content (if available) -->
            <div
              v-if="currentHelp.content"
              class="prose dark:prose-invert prose-sm max-w-none p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              v-html="currentHelp.content"
            />

            <!-- Nostr Meta Info -->
            <div
              v-if="
                currentHelp.updatedAt && !currentHelp.id.startsWith('static_')
              "
              class="text-xs text-gray-400 flex items-center gap-1"
            >
              <Icon name="i-heroicons-cloud" class="text-sm" />
              {{ t("help.fromNostr", "Synced from Nostr") }}
              · v{{ currentHelp.version }}
            </div>
          </div>

          <!-- No Help Available - Option to Write -->
          <div v-else class="text-center py-12">
            <Icon
              name="i-heroicons-document-text"
              class="text-5xl text-gray-400 mb-4"
            />
            <h3 class="font-medium text-gray-900 dark:text-white mb-2">
              {{ t("help.noHelpAvailable", "No help available") }}
            </h3>
            <p class="text-sm text-gray-500 mb-4">
              {{
                t("help.noHelpDesc", "Help content for this page is coming soon.")
              }}
            </p>
            <UButton
              v-if="canEdit"
              color="primary"
              variant="soft"
              icon="i-heroicons-pencil-square"
              @click="handleWriteNew"
            >
              {{ t("help.writeHelp", "Write Help Article") }}
            </UButton>
          </div>
        </div>

        <!-- Footer Actions -->
        <div
          class="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
        >
          <!-- Browse All Community Docs -->
          <NuxtLinkLocale to="/help" @click="help.closeHelp()">
            <UButton
              color="primary"
              variant="soft"
              icon="i-heroicons-book-open"
              size="lg"
              block
              class="mb-3 min-h-[44px]"
            >
              {{ t("help.browseCommunityDocs", "Browse All Community Docs") }}
            </UButton>
          </NuxtLinkLocale>

          <p class="text-xs text-gray-500 mb-3 text-center">
            {{ t("help.needMoreHelp", "Need more help?") }}
          </p>
          <div class="grid grid-cols-2 gap-2">
            <UButton
              color="gray"
              variant="soft"
              icon="i-heroicons-bug-ant"
              size="lg"
              block
              class="min-h-[44px]"
              @click="
                feedback.openFeedback('bug');
                help.closeHelp();
              "
            >
              {{ t("help.reportBug", "Report Bug") }}
            </UButton>
            <UButton
              color="primary"
              variant="soft"
              icon="i-heroicons-light-bulb"
              size="lg"
              block
              class="min-h-[44px]"
              @click="
                feedback.openFeedback('feature');
                help.closeHelp();
              "
            >
              {{ t("help.requestFeature", "Request Feature") }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>

  <!-- Help Editor Modal (for admins) -->
  <CommonHelpEditorModal
    v-if="nostrHelp.isEditorOpen.value"
    :article="nostrHelp.editingArticle.value"
    @close="nostrHelp.closeEditor()"
    @saved="nostrHelp.closeEditor()"
  />
</template>
