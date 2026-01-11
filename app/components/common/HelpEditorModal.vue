<!-- components/common/HelpEditorModal.vue -->
<!-- Admin modal for creating/editing help articles -->
<script setup lang="ts">
import type { NostrHelpArticle } from "~/composables/use-nostr-help";

const props = defineProps<{
  article?: NostrHelpArticle | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [article: NostrHelpArticle];
}>();

const nostrHelp = useNostrHelp();
const { t, locale, locales } = useI18n();
const toast = useToast();
const route = useRoute();

// Form state
const isSubmitting = useState("is-submitting", () => false)
const showPreview = useState("show-preview", () => false)

const form = reactive({
  pageId: props.article?.pageId || route.path.split("/")[1] || "dashboard",
  title: props.article?.title || "",
  description: props.article?.description || "",
  content: props.article?.content || "",
  locale: props.article?.locale || locale.value,
  tags: props.article?.tags?.join(", ") || "",
});

// Available pages for help
const pageOptions = [
  { value: "dashboard", label: "Dashboard" },
  { value: "pos", label: "Point of Sale" },
  { value: "products", label: "Products" },
  { value: "inventory", label: "Inventory" },
  { value: "orders", label: "Orders" },
  { value: "customers", label: "Customers" },
  { value: "reports", label: "Reports" },
  { value: "settings", label: "Settings" },
  { value: "accounting", label: "Accounting" },
  { value: "memberships", label: "Memberships" },
  { value: "kitchen", label: "Kitchen Display" },
];

// Available locales
const localeOptions = computed(() =>
  (locales.value as { code: string; name: string }[]).map((l) => ({
    value: l.code,
    label: l.name || l.code,
  }))
);

// Validation
const isValid = computed(() => {
  return (
    form.pageId.trim() !== "" &&
    form.title.trim() !== "" &&
    form.description.trim() !== ""
  );
});

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const article = await nostrHelp.publishHelpArticle({
      pageId: form.pageId,
      title: form.title,
      description: form.description,
      content: form.content,
      locale: form.locale,
      tags,
    });

    if (article) {
      toast.add({
        title: t("help.editor.publishSuccess", "Help published!"),
        description:
          t("help.editor.publishedToNostr", "Article saved to Nostr relays"),
        color: "green",
        icon: "i-heroicons-check-circle",
      });
      emit("saved", article);
      emit("close");
    } else {
      throw new Error(nostrHelp.error.value || "Unknown error");
    }
  } catch (e) {
    toast.add({
      title: t("common.error", "Error"),
      description: `${e}`,
      color: "red",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="nostrHelp.isEditorOpen.value" @update:model-value="emit('close')">
    <template #content>
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{
              article
                ? t("help.editor.editArticle", "Edit Help Article")
                : t("help.editor.createArticle", "Create Help Article")
            }}
          </h2>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="emit('close')"
          />
        </div>

        <!-- Form -->
        <form class="space-y-4 overflow-y-auto max-h-[70vh]" @submit.prevent="handleSubmit">
          <!-- Page and Locale Row -->
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('help.editor.page', 'Page')">
              <USelect
                v-model="form.pageId"
                :items="pageOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="t('help.editor.language', 'Language')">
              <USelect
                v-model="form.locale"
                :items="localeOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Title -->
          <UFormField :label="t('help.editor.title', 'Title')" required>
            <UInput
              v-model="form.title"
              :placeholder="t('help.editor.titlePlaceholder', 'e.g. How to use the POS')"
              class="w-full"
            />
          </UFormField>

          <!-- Description -->
          <UFormField
            :label="t('help.editor.description', 'Description')"
            required
          >
            <UInput
              v-model="form.description"
              :placeholder="t('help.editor.descriptionPlaceholder', 'Brief description of this help section')"
              class="w-full"
            />
          </UFormField>

          <!-- Content (Markdown) -->
          <UFormField :label="t('help.editor.content', 'Content (Markdown)')">
            <div class="flex gap-2 mb-2">
              <UButton
                type="button"
                size="xs"
                :variant="showPreview ? 'ghost' : 'soft'"
                @click="showPreview = false"
              >
                {{ t("help.editor.write", "Write") }}
              </UButton>
              <UButton
                type="button"
                size="xs"
                :variant="showPreview ? 'soft' : 'ghost'"
                @click="showPreview = true"
              >
                {{ t("help.editor.preview", "Preview") }}
              </UButton>
            </div>

            <UTextarea
              v-if="!showPreview"
              v-model="form.content"
              :placeholder="t('help.editor.contentPlaceholder', 'Write detailed help content here. Supports **markdown** formatting.')"
              :rows="8"
              class="font-mono w-full"
            />

            <!-- Preview -->
            <div
              v-else
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[200px] prose dark:prose-invert max-w-none"
            >
              <div v-if="form.content" v-html="form.content" />
              <p v-else class="text-gray-400 italic">
                {{ t("help.editor.noContent", "No content to preview") }}
              </p>
            </div>
          </UFormField>

          <!-- Tags -->
          <UFormField
            :label="t('help.editor.tags', 'Tags')"
            :description="t('help.editor.tagsDescription', 'Comma-separated tags for search')"
          >
            <UInput
              v-model="form.tags"
              :placeholder="t('help.editor.tagsPlaceholder', 'e.g. sales, checkout, payment')"
            />
          </UFormField>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <UButton
              type="button"
              color="gray"
              variant="ghost"
              @click="emit('close')"
            >
              {{ t("common.cancel", "Cancel") }}
            </UButton>
            <UButton
              type="submit"
              color="primary"
              icon="i-heroicons-paper-airplane"
              :loading="isSubmitting"
              :disabled="!isValid"
            >
              {{
                article
                  ? t("help.editor.update", "Update")
                  : t("help.editor.publish", "Publish to Nostr")
              }}
            </UButton>
          </div>
        </form>
      </div>
    </template>
  </UModal>
</template>
