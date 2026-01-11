<!-- components/common/FeedbackModal.vue -->
<script setup lang="ts">
import type {
  FeedbackType,
  FeedbackPriority,
} from "~/composables/use-feedback";

const feedback = useFeedback();
const { t } = useI18n();

const formData = reactive({
  title: "",
  description: "",
  priority: "medium" as FeedbackPriority,
});

const typeOptions = computed(() => [
  {
    value: "bug",
    label: t("common.feedback.bugReport", "Bug Report"),
    icon: "i-heroicons-bug-ant",
  },
  {
    value: "feature",
    label: t("common.feedback.featureRequest", "Feature Request"),
    icon: "i-heroicons-light-bulb",
  },
  {
    value: "question",
    label: t("common.feedback.question", "Question"),
    icon: "i-heroicons-question-mark-circle",
  },
]);

const priorityOptions = computed(() => [
  { value: "low", label: t("common.feedback.priorityLow", "Low"), color: "gray" },
  {
    value: "medium",
    label: t("common.feedback.priorityMedium", "Medium"),
    color: "yellow",
  },
  {
    value: "high",
    label: t("common.feedback.priorityHigh", "High"),
    color: "orange",
  },
  {
    value: "critical",
    label: t("common.feedback.priorityCritical", "Critical"),
    color: "red",
  },
]);

const isFormValid = computed(() => {
  return (
    formData.title.trim().length > 0 && formData.description.trim().length > 0
  );
});

const modalTitle = computed(() => {
  const type = feedback.feedbackType.value;
  if (type === "bug") return t("common.feedback.reportBug", "Report a Bug");
  if (type === "feature")
    return t("common.feedback.requestFeature", "Request a Feature");
  return t("common.feedback.askQuestion", "Ask a Question");
});

const modalIcon = computed(() => {
  const type = feedback.feedbackType.value;
  if (type === "bug") return "i-heroicons-bug-ant";
  if (type === "feature") return "i-heroicons-light-bulb";
  return "i-heroicons-question-mark-circle";
});

const handleSubmit = async () => {
  const success = await feedback.submitFeedback({
    type: feedback.feedbackType.value,
    title: formData.title,
    description: formData.description,
    priority:
      feedback.feedbackType.value === "bug" ? formData.priority : undefined,
  });

  if (success) {
    // Reset form
    formData.title = "";
    formData.description = "";
    formData.priority = "medium";
    feedback.closeFeedback();
  }
};

// Reset form when modal opens
watch(
  () => feedback.isModalOpen.value,
  (isOpen) => {
    if (isOpen) {
      formData.title = "";
      formData.description = "";
      formData.priority = "medium";
    }
  }
);
</script>

<template>
  <UModal v-model:open="feedback.isModalOpen.value">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center"
              :class="
                feedback.feedbackType.value === 'bug'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-primary-100 dark:bg-primary-900/30'
              "
            >
              <Icon
                :name="modalIcon"
                class="text-xl"
                :class="
                  feedback.feedbackType.value === 'bug'
                    ? 'text-red-500'
                    : 'text-primary-500'
                "
              />
            </div>
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                {{ modalTitle }}
              </h3>
              <p class="text-sm text-gray-500">
                {{
                  t("common.feedback.sendToDevTeam", "Send directly to development team")
                }}
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Type Selector -->
          <UFormField :label="t('common.feedback.type', 'Type')">
            <div class="flex gap-2">
              <UButton
                v-for="opt in typeOptions"
                :key="opt.value"
                :color="
                  feedback.feedbackType.value === opt.value ? 'primary' : 'gray'
                "
                :variant="
                  feedback.feedbackType.value === opt.value
                    ? 'solid'
                    : 'outline'
                "
                size="sm"
                :icon="opt.icon"
                @click="feedback.feedbackType.value = opt.value as FeedbackType"
              >
                {{ opt.label }}
              </UButton>
            </div>
          </UFormField>

          <!-- Title -->
          <UFormField :label="t('common.feedback.title', 'Title')" required>
            <UInput
              v-model="formData.title"
              :placeholder="
                feedback.feedbackType.value === 'bug'
                  ? t('common.feedback.bugTitlePlaceholder', 'Briefly describe the issue')
                  : t('common.feedback.featureTitlePlaceholder', 'Briefly describe your idea')
              "
              class="w-full"
            />
          </UFormField>

          <!-- Description -->
          <UFormField
            :label="t('common.feedback.description', 'Description')"
            required
          >
            <UTextarea
              v-model="formData.description"
              :placeholder="
                feedback.feedbackType.value === 'bug'
                  ? t('common.feedback.bugDescPlaceholder', 'What happened? What did you expect?')
                  : t('common.feedback.featureDescPlaceholder', 'Describe your idea in detail')
              "
              class="w-full"
              :rows="4"
            />
          </UFormField>

          <!-- Priority (only for bugs) -->
          <UFormField
            v-if="feedback.feedbackType.value === 'bug'"
            :label="t('common.feedback.priority', 'Priority')"
          >
            <div class="flex gap-2">
              <UButton
                v-for="opt in priorityOptions"
                :key="opt.value"
                :color="formData.priority === opt.value ? opt.color : 'gray'"
                :variant="formData.priority === opt.value ? 'solid' : 'outline'"
                size="sm"
                @click="formData.priority = opt.value as FeedbackPriority"
              >
                {{ opt.label }}
              </UButton>
            </div>
          </UFormField>

          <!-- Context Info -->
          <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
            <p class="text-gray-500 mb-2">
              {{ t("common.feedback.autoAttached", "Auto-attached information:") }}
            </p>
            <div class="flex flex-wrap gap-2">
              <UBadge color="gray" size="xs">
                📱 {{ feedback.getDeviceInfo() }}
              </UBadge>
              <UBadge color="gray" size="xs"> 📍 {{ $route.path }} </UBadge>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="gray"
              variant="outline"
              :label="t('common.cancel', 'Cancel')"
              @click="feedback.closeFeedback()"
            />
            <UButton
              color="primary"
              :loading="feedback.isSubmitting.value"
              :disabled="!isFormValid"
              :label="t('common.feedback.submit', 'Submit')"
              icon="i-heroicons-paper-airplane"
              @click="handleSubmit"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
