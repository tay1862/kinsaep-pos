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
            class="w-12 h-12 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-document-text"
              class="text-2xl text-white"
            />
          </div>
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              {{ $t("legal.terms.title") }}
            </h1>
            <p v-if="lastUpdated" class="text-gray-600 dark:text-gray-400">
              {{ $t("legal.terms.lastUpdated") }}:
              {{ $d(new Date(lastUpdated), "long") }}
            </p>
          </div>
        </div>

        <!-- Content -->
        <UCard class="prose dark:prose-invert max-w-none">
          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.terms.acceptance.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t("legal.terms.acceptance.content") }}
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.terms.license.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t("legal.terms.license.content") }}
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.terms.userResponsibilities.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300 mb-4">
              {{ $t("legal.terms.userResponsibilities.content") }}
            </p>
            <ul
              class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300"
            >
              <li>{{ $t("legal.terms.userResponsibilities.item1") }}</li>
              <li>{{ $t("legal.terms.userResponsibilities.item2") }}</li>
              <li>{{ $t("legal.terms.userResponsibilities.item3") }}</li>
              <li>{{ $t("legal.terms.userResponsibilities.item4") }}</li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.terms.payments.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t("legal.terms.payments.content") }}
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.terms.disclaimer.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t("legal.terms.disclaimer.content") }}
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.terms.limitation.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t("legal.terms.limitation.content") }}
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.terms.modifications.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t("legal.terms.modifications.content") }}
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold mb-4">
              {{ $t("legal.terms.contact.title") }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t("legal.terms.contact.content") }}
            </p>
          </section>
        </UCard>

        <!-- Related Links -->
        <div class="mt-8 flex gap-4">
          <UButton variant="soft" color="neutral" to="/legal/privacy">
            <UIcon name="i-heroicons-shield-check" class="mr-2" />
            {{ $t("legal.privacy.title") }}
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

const lastUpdated = new Date("2026-01-01T09:09:09").toISOString();

useHead({
  title: t("legal.terms.title"),
});
</script>
