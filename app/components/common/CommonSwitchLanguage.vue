<template>
  <USelectMenu
    v-model="selectedLocale"
    :items="availableLocales"
    value-key="code"
    label-key="name"
    class="w-full"
    @update:model-value="switchLocale"
  />
</template>

<script setup lang="ts">
// Locale selection
const { locale, locales } = useI18n();
const switchLocalePath = useSwitchLocalePath();

type LocaleCode = (typeof locales.value)[number]["code"];

const switchLocale = (newLocale: LocaleCode) => {
  const newPath = switchLocalePath(newLocale);
  navigateTo(newPath);
};
const availableLocales = computed(() => locales.value);
const selectedLocale = computed({
  get: () => locale.value,
  set: (value: LocaleCode) => {
    localStorage.setItem("locale", value);
  },
});
</script>

<style scoped></style>
