<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <UContainer class="py-12">
      <!-- Header -->
      <div class="max-w-3xl mx-auto">
        <NuxtLinkLocale
          to="/"
          class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary mb-8"
        >
          <UIcon name="i-heroicons-arrow-left" />
          {{ $t("common.back") }}
        </NuxtLinkLocale>

        <div class="flex items-center gap-4 mb-8">
          <div
            class="w-12 h-12 bg-linear-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-shield-check"
              class="text-2xl text-white"
            />
          </div>
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              {{ $t("legal.privacy.title") }}
            </h1>
            <p class="text-gray-600 dark:text-gray-400">
              {{ $t("legal.privacy.lastUpdated") }}:
              {{ $d(new Date(lastUpdated), "long") }}
            </p>
          </div>
        </div>

        <!-- Content -->
        <UCard class="prose dark:prose-invert max-w-none">
          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.privacy.intro.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t("legal.privacy.intro.content") }}
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.privacy.dataCollection.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300 mb-4">
              {{ $t("legal.privacy.dataCollection.content") }}
            </p>
            <ul
              class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300"
            >
              <li>{{ $t("legal.privacy.dataCollection.item1") }}</li>
              <li>{{ $t("legal.privacy.dataCollection.item2") }}</li>
              <li>{{ $t("legal.privacy.dataCollection.item3") }}</li>
              <li>{{ $t("legal.privacy.dataCollection.item4") }}</li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.privacy.localStorage.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t("legal.privacy.localStorage.content") }}
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.privacy.nostr.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t("legal.privacy.nostr.content") }}
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.privacy.encryption.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t("legal.privacy.encryption.content") }}
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.privacy.thirdParty.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t("legal.privacy.thirdParty.content") }}
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.privacy.rights.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300 mb-4">
              {{ $t("legal.privacy.rights.content") }}
            </p>
            <ul
              class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300"
            >
              <li>{{ $t("legal.privacy.rights.item1") }}</li>
              <li>{{ $t("legal.privacy.rights.item2") }}</li>
              <li>{{ $t("legal.privacy.rights.item3") }}</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.privacy.contact.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t("legal.privacy.contact.content") }}
            </p>
          </section>
        </UCard>

        <!-- Related Links -->
        <div class="mt-8 flex gap-4">
          <UButton variant="soft" color="neutral" to="/legal/terms">
            <UIcon name="i-heroicons-document-text" class="mr-2" />
            {{ $t("legal.terms.title") }}
          </UButton>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "blank",
});

const { t } = useI18n();

const lastUpdated = new Date("2026-01-01T09:09:09");

useHead({
  title: t("legal.privacy.title"),
});
</script>
