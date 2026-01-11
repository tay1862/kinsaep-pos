<template>
  <div class="p-3 sm:p-4 space-y-5 max-w-4xl mx-auto pb-24">
    <!-- Profile Header Card (YakiHonne-inspired) -->
    <div
      class="bg-linear-to-br from-primary-200 to-primary-600 rounded-2xl p-6 relative overflow-hidden"
    >
      <!-- Background Pattern -->
      <div
        class="absolute inset-0 opacity-20"
        style="
          background-image: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.3) 1px,
            transparent 1px
          );
          background-size: 20px 20px;
        "
      />

      <div class="relative flex items-center gap-6">
        <!-- Avatar -->
        <div class="relative">
          <img
            :src="userProfile.avatar || '/default-avatar.png'"
            :alt="userProfile.name"
            class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-primary-500 object-cover"
          >
          <div
            class="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-900"
          />
        </div>

        <!-- User Info -->
        <div class="flex-1">
          <h2 class="text-xl font-bold text-white">
            {{ userProfile.name || $t("account.noName") }}
          </h2>
          <p class="text-gray-400 text-sm font-mono">
            {{ userProfile.npub || "@anonymous" }}
          </p>
          <p
            v-if="userProfile.nip05"
            class="text-primary-400 text-sm flex items-center gap-1 mt-1"
          >
            <UIcon name="i-heroicons-check-badge-solid" />
            {{ userProfile.nip05 }}
          </p>
        </div>

        <!-- Action Buttons - Stack on mobile -->
        <div class="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
          <UButton
            color="primary"
            variant="solid"
            @click="navigateTo('/settings/account')"
          >
            {{ $t("common.view", "View profile") }}
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            @click="navigateTo('/settings/account#edit')"
          >
            {{ $t("common.edit", "Edit profile") }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Settings Grid - Single column on mobile, 2 on tablet+ -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
      <!-- Personal Settings -->
      <NuxtLinkLocale
        v-for="item in personalSettings"
        :key="item.id"
        :to="item.to"
        class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all"
        :class="getColorClasses(item.color as any).border"
      >
        <div
          class="p-4 sm:p-5 flex items-center gap-3 sm:gap-4 min-h-16 active:bg-gray-50 dark:active:bg-gray-800/50"
        >
          <div
            class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
            :class="getColorClasses(item.color as any).bg"
          >
            <UIcon
              :name="item.icon"
              class="w-5 h-5 sm:w-6 sm:h-6"
              :class="getColorClasses(item.color as any).text"
            />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              {{ $t(item.label, item.label.split('.').pop() || '') }}
            </h3>
            <p v-if="$t(item.label.replace('.title', '.subtitle'))" class="text-sm text-gray-500 dark:text-gray-400 truncate">
              {{ $t(item.label.replace('.title', '.subtitle')) }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="w-5 h-5 text-gray-400 shrink-0"
          />
        </div>
      </NuxtLinkLocale>
    </div>

    <!-- Business Settings Section -->
    <div>
      <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        {{ $t("settings.sectionBusiness") }}
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <NuxtLinkLocale
          v-for="item in businessSettings"
          :key="item.id"
          :to="item.to"
          class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all"
          :class="getColorClasses(item.color as any).border"
        >
          <div class="p-4 flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center"
              :class="getColorClasses(item.color as any).bg"
            >
              <UIcon
                :name="item.icon"
                class="w-6 h-6"
                :class="getColorClasses(item.color as any).text"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t(item.label, item.label.split('.').pop() || '') }}
              </h3>
              <p v-if="$t(item.label.replace('.title', '.subtitle')) || $t(item.label.replace('.title', '.description'))" class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ $t(item.label.replace('.title', '.subtitle')) || $t(item.label.replace('.title', '.description')) }}
              </p>
            </div>
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-5 h-5 text-gray-400 shrink-0"
            />
          </div>
        </NuxtLinkLocale>
      </div>
    </div>

    <!-- System Settings Section -->
    <div>
      <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        {{ $t("settings.sectionSystem") }}
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <NuxtLinkLocale
          v-for="item in systemSettings"
          :key="item.id"
          :to="item.to"
          class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all"
          :class="getColorClasses(item.color as any).border"
        >
          <div class="p-4 flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center"
              :class="getColorClasses(item.color as any).bg"
            >
              <UIcon
                :name="item.icon"
                class="w-6 h-6"
                :class="getColorClasses(item.color as any).text"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t(item.label, item.label.split('.').pop() || '') }}
              </h3>
              <p v-if="$t(item.label.replace('.title', '.subtitle'))" class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ $t(item.label.replace('.title', '.subtitle')) }}
              </p>
            </div>
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-5 h-5 text-gray-400 shrink-0"
            />
          </div>
        </NuxtLinkLocale>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  getPersonalSettings,
  getBusinessSettings,
  getSystemSettings,
  settingsColorClasses,
} from '~/config/settings-navigation';

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();

// User profile data
const userProfile = ref({
  name: "",
  avatar: "",
  npub: "",
  nip05: "",
});

// Load user profile
async function loadUserProfile() {
  try {
    // Try to get from localStorage first
    const storedProfile = localStorage.getItem("nostr_user_profile");
    if (storedProfile) {
      const profile = JSON.parse(storedProfile);
      userProfile.value = {
        name: profile.name || profile.display_name || "",
        avatar: profile.picture || "",
        npub: profile.npub || "",
        nip05: profile.nip05 || "",
      };
    }

    // Try to get npub from localStorage
    const npub = localStorage.getItem("nostr_npub");
    if (npub) {
      userProfile.value.npub = npub.slice(0, 16) + "..." + npub.slice(-8);
    }
  } catch (error) {
    console.error("Failed to load user profile:", error);
  }
}

// Get settings by section
const personalSettings = getPersonalSettings();
const businessSettings = getBusinessSettings();
const systemSettings = getSystemSettings();

// Helper to get color classes
function getColorClasses(color: keyof typeof settingsColorClasses) {
  return settingsColorClasses[color] || settingsColorClasses.gray;
}

// Initialize
onMounted(() => {
  loadUserProfile();
});

// Set page title
useHead({
  title: t("settings.title"),
});
</script>

<style scoped>
/* Italic serif font for settings title like YakiHonne */
.font-serif {
  font-family: Georgia, "Times New Roman", Times, serif;
}
</style>
