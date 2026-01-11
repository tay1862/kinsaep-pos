<template>
  <UContainer>
    <CommonPageHeader
      :title="$t('settings.about.title')"
      :description="$t('settings.about.description')"
    />

    <!-- App Info Card -->
    <UCard class="mb-6">
      <div class="flex flex-col md:flex-row items-center gap-6">
        <!-- App Logo -->
        <div class="shrink-0">
          <div
            class="w-24 h-24 bg-linear-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg"
          >
            <UIcon name="i-heroicons-bolt" class="text-4xl text-white" />
          </div>
        </div>

        <!-- App Details -->
        <div class="flex-1 text-center md:text-left">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            bnos.space
          </h1>
          <p class="text-muted mt-1">
            {{ $t("settings.about.tagline") }}
          </p>
          <div
            class="flex flex-wrap gap-2 mt-3 justify-center md:justify-start"
          >
            <UBadge color="amber" variant="subtle" size="lg">
              <UIcon name="i-heroicons-tag" class="mr-1" />
              v{{ appVersion }}
            </UBadge>
            <UBadge color="emerald" variant="subtle" size="lg">
              <UIcon name="i-heroicons-cube" class="mr-1" />
              Nuxt 4
            </UBadge>
            <UBadge color="violet" variant="subtle" size="lg">
              <UIcon name="i-heroicons-signal" class="mr-1" />
              Nostr
            </UBadge>
            <UBadge color="orange" variant="subtle" size="lg">
              <UIcon name="i-heroicons-bolt" class="mr-1" />
              Lightning
            </UBadge>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Version & Build Info -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-information-circle" class="text-primary" />
          {{ $t("settings.about.versionInfo") }}
        </h3>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p class="text-sm text-muted">{{ $t("settings.about.version") }}</p>
          <p class="font-semibold text-lg">{{ appVersion }}</p>
        </div>
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p class="text-sm text-muted">{{ $t("settings.about.buildDate") }}</p>
          <p class="font-semibold text-lg">{{ formattedBuildTime }}</p>
        </div>
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p class="text-sm text-muted">{{ $t("settings.about.framework") }}</p>
          <p class="font-semibold text-lg">Nuxt 4 + Vue 3.5</p>
        </div>
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p class="text-sm text-muted">{{ $t("settings.about.platform") }}</p>
          <p class="font-semibold text-lg">{{ platform }}</p>
        </div>
      </div>
    </UCard>

    <!-- Features -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-sparkles" class="text-amber-500" />
          {{ $t("settings.about.keyFeatures") }}
        </h3>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div
            class="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            :class="feature.bgColor"
          >
            <UIcon
              :name="feature.icon"
              :class="feature.iconColor"
              class="text-xl"
            />
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ $t(feature.title) }}
            </p>
            <p class="text-sm text-muted">{{ $t(feature.description) }}</p>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Tech Stack -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-code-bracket" class="text-blue-500" />
          {{ $t("settings.about.techStack") }}
        </h3>
      </template>

      <div class="flex flex-wrap gap-2">
        <UBadge
          v-for="tech in techStack"
          :key="tech.name"
          :color="tech.color"
          variant="subtle"
          size="lg"
        >
          {{ tech.name }}
        </UBadge>
      </div>
    </UCard>

    <!-- Links & Resources -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-link" class="text-violet-500" />
          {{ $t("settings.about.links") }}
        </h3>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <UButton variant="soft" color="neutral" block @click="openHelpAction">
          <UIcon name="i-heroicons-question-mark-circle" class="mr-2" />
          {{ $t("settings.about.helpCenter") }}
        </UButton>

        <UButton
          variant="soft"
          color="neutral"
          block
          href="lightning:bnos@blink.sv"
        >
          <UIcon name="i-heroicons-heart" class="mr-2" />
          {{ $t("settings.about.supportProject") }}
        </UButton>

        <UButton
          variant="soft"
          color="neutral"
          block
          href="https://github.com/locobit-space/bitspace-pos"
          target="_blank"
        >
          <UIcon name="i-simple-icons-github" class="mr-2" />
          {{ $t("settings.about.github") }}
        </UButton>

        <UButton
          variant="soft"
          color="neutral"
          block
          href="https://nostr.com"
          target="_blank"
        >
          <UIcon name="i-heroicons-signal" class="mr-2" />
          {{ $t("settings.about.nostrProtocol") }}
        </UButton>
      </div>
    </UCard>

    <!-- Credits -->
    <UCard>
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-heart" class="text-pink-500" />
          {{ $t("settings.about.credits") }}
        </h3>
      </template>

      <div class="space-y-4">
        <div class="text-center py-4">
          <p class="text-muted mb-2">{{ $t("settings.about.builtWith") }}</p>
          <div class="flex items-center justify-center gap-2 text-lg">
            <span>⚡</span>
            <span class="font-semibold text-gray-900 dark:text-white">
              BitSpace Team
            </span>
            <span>⚡</span>
          </div>
          <p class="text-sm text-muted mt-2">
            {{ $t("settings.about.sovereignBusiness") }}
          </p>
        </div>

        <USeparator />

        <div class="text-center text-sm text-muted">
          <p>{{ $t("settings.about.openSource") }}</p>
          <p class="mt-1">
            {{ $t("settings.about.license") }}
          </p>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
});

useHead({
  title: "Settings - About",
});

const { t } = useI18n();
const runtimeConfig = useRuntimeConfig();

// App version from runtime config
const appVersion = computed(() => runtimeConfig.public.version || "1.0.0");

// Build time from runtime config
const formattedBuildTime = computed(() => {
  const buildTime = runtimeConfig.public.buildTime;
  if (!buildTime) return "Unknown";
  try {
    return new Date(buildTime).toLocaleString();
  } catch {
    return buildTime;
  }
});

// Detect platform
const platform = computed(() => {
  if (typeof window === "undefined") return "Server";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Web";
});

// Key features list
const features = [
  {
    icon: "i-heroicons-bolt",
    title: "settings.about.features.lightning",
    description: "settings.about.features.lightningDesc",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600",
  },
  {
    icon: "i-heroicons-signal",
    title: "settings.about.features.nostr",
    description: "settings.about.features.nostrDesc",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600",
  },
  {
    icon: "i-heroicons-cloud-arrow-down",
    title: "settings.about.features.offline",
    description: "settings.about.features.offlineDesc",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600",
  },
  {
    icon: "i-heroicons-lock-closed",
    title: "settings.about.features.encrypted",
    description: "settings.about.features.encryptedDesc",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600",
  },
  {
    icon: "i-heroicons-device-phone-mobile",
    title: "settings.about.features.pwa",
    description: "settings.about.features.pwaDesc",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    iconColor: "text-pink-600",
  },
  {
    icon: "i-heroicons-globe-alt",
    title: "settings.about.features.i18n",
    description: "settings.about.features.i18nDesc",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    iconColor: "text-cyan-600",
  },
];

// Tech stack badges
const techStack = [
  { name: "Vue 3.5", color: "success" as const },
  { name: "Nuxt 4", color: "success" as const },
  { name: "TypeScript", color: "primary" as const },
  { name: "Nuxt UI v4", color: "primary" as const },
  { name: "Nostr Protocol", color: "violet" as const },
  { name: "nostr-tools", color: "violet" as const },
  { name: "Dexie.js", color: "amber" as const },
  { name: "ECharts", color: "amber" as const },
  { name: "Pinia", color: "yellow" as const },
  { name: "PWA", color: "pink" as const },
  { name: "Zod", color: "neutral" as const },
];

// Help modal
const help = useHelp();
function openHelpAction() {
  help.openHelp();
}

// Set page title
useHead({
  title: t("settings.about.title"),
});
</script>
