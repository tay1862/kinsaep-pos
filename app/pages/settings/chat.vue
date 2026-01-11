<template>
  <UContainer>
    <CommonPageHeader
      :title="$t('settings.chat.title')"
      :description="$t('settings.chat.description')"
    />

    <!-- Chat Settings -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-chat-bubble-left-right" class="text-primary" />
          {{ $t('settings.chat.general') }}
        </h3>
      </template>

      <div class="space-y-6">
        <!-- Enable/Disable Chat -->
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ $t('settings.chat.enableChat') }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ $t('settings.chat.enableChatDescription') }}
            </p>
          </div>
          <USwitch v-model="chatEnabled" :disabled="isSaving" />
        </div>

        <!-- Info Alert -->
        <UAlert
          v-if="!chatEnabled"
          icon="i-heroicons-information-circle"
          color="primary"
          variant="soft"
          :title="$t('settings.chat.disabledNotice')"
          :description="$t('settings.chat.disabledNoticeDescription')"
        />
      </div>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});

const { t } = useI18n();
const toast = useToast();
const { settings, saveSettings } = useChatSettings();

// Loading state
const isSaving = ref(false);

// Reactive state
const chatEnabled = computed({
  get: () => settings.value.enabled,
  set: async (value: boolean) => {
    await handleToggleChat(value);
  }
});

// Handle toggle with feedback
async function handleToggleChat(value: boolean) {
  isSaving.value = true;
  try {
    await saveSettings({ enabled: value });

    const message = value
      ? t('settings.chat.enabled')
      : t('settings.chat.disabled');

    toast.add({
      title: t('common.success'),
      description: message,
      color: 'success',
    });
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: String(error),
      color: 'error',
    });
  } finally {
    isSaving.value = false;
  }
}

// Set page title
useHead({
  title: t('settings.chat.title'),
});
</script>
