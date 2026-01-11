<!-- components/common/HelpButton.vue -->
<!-- Floating help button that appears on all pages -->
<script setup lang="ts">
const help = useHelp();
const { t } = useI18n();

// Show pulse animation only on first visits
const hasSeenHelp = ref(true);

onMounted(() => {
  if (import.meta.client) {
    hasSeenHelp.value = localStorage.getItem("hasSeenHelpButton") === "true";
  }
});

function handleClick() {
  help.openHelp();
  if (!hasSeenHelp.value) {
    hasSeenHelp.value = true;
    localStorage.setItem("hasSeenHelpButton", "true");
  }
}

// Keyboard shortcut: ? or F1 to open help
function handleKeydown(e: KeyboardEvent) {
  if (
    (e.key === "?" && !e.ctrlKey && !e.metaKey) ||
    e.key === "F1"
  ) {
    // Don't trigger if user is typing in an input
    const activeEl = document.activeElement;
    if (
      activeEl?.tagName === "INPUT" ||
      activeEl?.tagName === "TEXTAREA" ||
      (activeEl as HTMLElement)?.isContentEditable
    ) {
      return;
    }
    e.preventDefault();
    handleClick();
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div class="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40">
    <!-- Pulse ring (only for first-time users) -->
    <div
      v-if="!hasSeenHelp"
      class="absolute inset-0 rounded-full bg-primary-500/30 animate-ping"
    />

    <!-- Main Button -->
    <UButton
      color="primary"
      variant="solid"
      size="lg"
      icon="i-heroicons-question-mark-circle"
      class="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
      :aria-label="t('help.openHelp', 'Open Help')"
      @click="handleClick"
    />

    <!-- Tooltip on hover (desktop only) -->
    <div
      class="absolute bottom-full right-0 mb-2 hidden lg:group-hover:block"
    >
      <div
        class="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
      >
        {{ t("help.pressQuestion", "Press ? for help") }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Pulse animation */
@keyframes ping {
  75%,
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.animate-ping {
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}
</style>
