<template>
  <header
    class="sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl"
  >
    <!-- Left: Hamburger (mobile) + Logo + Shop Switcher -->
    <div class="flex items-center gap-1">
      <!-- Hamburger Menu (Mobile Only) - Hidden during setup -->
      <button
        v-if="showHeaderFeatures"
        class="lg:hidden p-2 -ml-2 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="$emit('toggle-sidebar')"
      >
        <Icon name="i-heroicons-bars-3" size="24" />
      </button>

      <!-- Logo -->
      <NuxtLinkLocale to="/" class="flex md:w-12 items-center justify-center gap-2">
        <div
          class="w-8 h-8 rounded-lg bg-linear-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow"
        >
          <span title="BNOS" class="text-white font-bold text-sm">⚡</span>
        </div>
      </NuxtLinkLocale>

      <!-- Shop Switcher (visible after setup) -->
      <div v-if="showHeaderFeatures" class="hidden md:block ml-2 pl-2 dark:border-gray-700">
        <ShopSwitcher />
      </div>
    </div>

    <!-- Right: Notifications + Profile -->
    <div class="flex items-center gap-1">
      <!-- Notification Center (includes announcements tab) -->
      <NotificationCenter v-if="showHeaderFeatures" />

      <!-- Chat Button (hidden during setup) -->
      <button
        v-if="chatSettings.enabled && showHeaderFeatures"
        class="relative p-2 rounded-xl size-10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        :title="$t('chat.title', 'Team Chat')"
        @click="chatStore.toggleChat()"
      >
        <Icon
          name="i-heroicons-chat-bubble-left-right"
          size="22"
          class="text-gray-600 dark:text-gray-400"
        />

        <span
          v-if="chatStore.unreadCount.value > 0"
          class="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-primary-500 rounded-full px-1"
        >
          {{
            chatStore.unreadCount.value > 99
              ? "99+"
              : chatStore.unreadCount.value
          }}
        </span>
      </button>

      <!-- Chat Center Slideover (hidden during setup) -->
      <ChatCenter v-if="chatSettings.enabled && showHeaderFeatures" />

      <!-- Help & Support Button (hidden during setup) -->
      <UDropdownMenu
        v-if="showHeaderFeatures"
        :items="helpMenuItems"
        :ui="{
          content: 'w-56',
        }"
      >
        <button
          class="p-2 rounded-xl size-10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          :title="$t('help.title', 'Help & Support')"
        >
          <Icon
            name="i-heroicons-question-mark-circle"
            size="22"
            class="text-gray-600 dark:text-gray-400"
          />
        </button>
      </UDropdownMenu>

      <!-- Profile Avatar -->
      <UPopover
        :ui="{
          content:
            'w-72 p-4 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl border-white/20 dark:border-gray-700/50',
        }"
      >
        <button
          class="p-1 overflow-hidden rounded-full hover:ring-2 hover:ring-primary-500/50 transition-all"
        >
          <div
            v-if="userAvatar"
            class="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-800"
          >
            <img
              :src="userAvatar"
              alt="Profile"
              class="w-full h-full object-cover"
            />
          </div>
          <div
            v-else
            class="w-8 h-8 rounded-full bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center ring-2 ring-primary-300 dark:ring-gray-800"
          >
            <Icon name="i-heroicons-user" size="16" class="text-white" />
          </div>
        </button>

        <template #content>
          <div class="overflow-y-auto max-h-[calc(100vh-10rem)]">
            <!-- User Info with linear accent -->
            <div
              class="relative px-3 py-3 mb-4 rounded-xl bg-linear-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 border border-primary-100 dark:border-primary-800/30"
            >
              <div class="flex items-center gap-3">
                <div
                  v-if="userAvatar"
                  class="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-800 shadow-md"
                >
                  <img
                    :src="userAvatar"
                    alt="Profile"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div
                  v-else
                  class="w-10 h-10 rounded-full bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center ring-2 ring-white dark:ring-gray-800 shadow-md"
                >
                  <Icon name="i-heroicons-user" size="20" class="text-white" />
                </div>
                <div class="flex-1 min-w-0">
                  <p
                    class="text-sm font-semibold text-gray-900 dark:text-white truncate"
                  >
                    {{ userDisplayName }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {{ userIdentifier }}
                  </p>
                </div>
              </div>
              <span
                class="inline-flex items-center mt-2 text-xs px-2.5 py-1 rounded-full font-medium shadow-sm"
                :class="providerBadgeClass"
              >
                {{
                  userProvider === "nostr"
                    ? "⚡ Nostr"
                    : userProvider === "password"
                    ? "🔑 Password"
                    : "🔢 PIN"
                }}
              </span>
            </div>

            <!-- Account Switcher Button -->
            <button
              class="flex w-full items-center gap-3 px-3 py-2.5 mb-4 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200"
              @click="openAccountSwitcher"
            >
              <Icon
                name="i-heroicons-arrows-right-left"
                size="18"
                class="text-primary-500"
              />
              {{ $t("account.switchAccount") }}
              <span
                class="ml-auto text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full"
              >
                {{ accountCount }}
              </span>
            </button>

            <!-- Quick Settings with glass cards -->
            <div class="space-y-4 mb-4">
              <!-- Dark Mode Toggle -->
              <div
                class="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-linear-to-br from-amber-400 to-orange-500 dark:from-indigo-500 dark:to-purple-600 flex items-center justify-center shadow-sm"
                  >
                    <Icon
                      :name="isDark ? 'i-heroicons-moon' : 'i-heroicons-sun'"
                      size="16"
                      class="text-white"
                    />
                  </div>
                  <span
                    class="text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {{ $t("account.dark_mode") }}
                  </span>
                </div>
                <USwitch v-model="isDark" size="sm" />
              </div>

              <!-- Theme Color Selector -->
              <div
                class="px-3 py-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50"
              >
                <div class="flex items-center gap-3 mb-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-linear-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-sm"
                  >
                    <Icon
                      name="i-heroicons-swatch"
                      size="16"
                      class="text-white"
                    />
                  </div>
                  <span
                    class="text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {{ $t("account.theme_color") }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-2 pl-11">
                  <button
                    v-for="color in themeColors"
                    :key="color.value"
                    :title="color.label"
                    :class="[
                      'w-6 h-6 rounded-full transition-all duration-200 shadow-sm',
                      color.class,
                      selectedColor === color.value
                        ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-gray-900 dark:ring-white scale-110 shadow-md'
                        : 'hover:scale-110 hover:shadow-md opacity-80 hover:opacity-100',
                    ]"
                    @click="setThemeColor(color.value)"
                  />
                </div>
              </div>
            </div>

            <!-- Language Selector -->
            <div>
              <div class="flex items-center gap-2 mb-2">
                <UIcon
                  name="i-heroicons-language"
                  class="w-5 h-5 text-gray-600 dark:text-gray-400"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">
                  {{ $t("account.language") }}
                </span>
              </div>
              <CommonSwitchLanguage />
            </div>

            <!-- Divider -->
            <div
              class="h-px bg-linear-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-3"
            />

            <!-- Menu Items -->
            <ul class="space-y-1">
              <li>
                <NuxtLinkLocale
                  to="/settings/account"
                  class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 rounded-xl transition-all duration-200"
                >
                  <Icon
                    name="i-heroicons-user-circle"
                    size="18"
                    class="text-gray-500 dark:text-gray-400"
                  />
                  {{ $t("settings.account.title") }}
                </NuxtLinkLocale>
              </li>
              <li>
                <NuxtLinkLocale
                  to="/settings"
                  class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 rounded-xl transition-all duration-200"
                >
                  <Icon
                    name="i-heroicons-cog-6-tooth"
                    size="18"
                    class="text-gray-500 dark:text-gray-400"
                  />
                  {{ $t("settings.general.title") }}
                </NuxtLinkLocale>
              </li>
              <li>
                <NuxtLinkLocale
                  to="/legal/privacy"
                  class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 rounded-xl transition-all duration-200"
                >
                  <Icon
                    name="i-heroicons-shield-check"
                    size="18"
                    class="text-gray-500 dark:text-gray-400"
                  />
                  {{ $t("legal.privacy.title") }}
                </NuxtLinkLocale>
              </li>
              <li>
                <NuxtLinkLocale
                  to="/legal/terms"
                  class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 rounded-xl transition-all duration-200"
                >
                  <Icon
                    name="i-heroicons-document-text"
                    size="18"
                    class="text-gray-500 dark:text-gray-400"
                  />
                  {{ $t("legal.terms.title") }}
                </NuxtLinkLocale>
              </li>
            </ul>

            <!-- Divider -->
            <div
              class="h-px bg-linear-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent my-3"
            />

            <!-- Sign Out -->
            <button
              class="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
              @click="handleLogout"
            >
              <Icon name="i-heroicons-arrow-right-on-rectangle" size="18" />
              {{ $t("common.signOut") }}
            </button>

            <!-- version and build time -->
            <div
              class="flex items-center pt-2 gap-1.5 font-sans text-gray-500 dark:text-gray-400 flex-col text-center text-xs"
            >
              <p>Version: v{{ version }}</p>
              <p>Build Time: {{ buildTime }}</p>
            </div>
          </div>
        </template>
      </UPopover>
    </div>
  </header>

  <!-- Account Switch Modal -->
  <AccountSwitchModal
    v-model:open="showAccountSwitcher"
    @switched="onAccountSwitched"
  />

  <!-- Help & Support Modals -->
  <CommonHelpDrawer />
  <CommonFeedbackModal />
  <CommonSupportModal v-model:open="showSupportModal" />
</template>

<script setup lang="ts">
defineEmits(["toggle-sidebar"]);

const {
  public: { version, buildTime },
} = useRuntimeConfig();

const colorMode = useColorMode();
const usersComposable = useUsers();
const nostrStorage = useNostrStorage();
const appConfig = useAppConfig();
const { t } = useI18n();
const help = useHelp();
const feedback = useFeedback();
const chatStore = useChat();
const { settings: chatSettings } = useChatSettings();
const setupCheck = useSetupCheck();

// Check if header features should be shown (after setup complete)
const showHeaderFeatures = computed(() => setupCheck.isSetupComplete.value);

// Help & Support
const showSupportModal = ref(false);

const helpMenuItems = computed(() => [
  [
    {
      label: t("help.title", "Help & Documentation"),
      icon: "i-heroicons-book-open",
      onClick: () => help.openHelp(),
    },
  ],
  [
    {
      label: t("common.feedback.reportBug", "Report a Bug"),
      icon: "i-heroicons-bug-ant",
      onClick: () => feedback.openFeedback("bug"),
    },
    {
      label: t("common.feedback.requestFeature", "Request Feature"),
      icon: "i-heroicons-light-bulb",
      onClick: () => feedback.openFeedback("feature"),
    },
  ],
  [
    {
      label: t("donate.title", "Support Development"),
      icon: "i-heroicons-heart",
      onClick: () => (showSupportModal.value = true),
    },
  ],
]);

// Account switcher state
const showAccountSwitcher = ref(false);
const allAccounts = ref<
  Array<{
    pubkey: string;
    displayName?: string;
    name?: string;
    picture?: string;
  }>
>([]);

// User data
const currentUserInfo = ref<{
  pubkey?: string;
  displayName?: string;
  name?: string;
  picture?: string;
} | null>(null);

onMounted(async () => {
  await usersComposable.initialize();
  allAccounts.value = nostrStorage.loadAllAccounts();
  const { userInfo } = nostrStorage.loadCurrentUser();
  if (userInfo) {
    currentUserInfo.value = userInfo;
  }
});

const userDisplayName = computed(() => {
  return (
    currentUserInfo.value?.displayName ||
    currentUserInfo.value?.name ||
    usersComposable.currentUser.value?.name ||
    "User"
  );
});

const userAvatar = computed(() => {
  return (
    currentUserInfo.value?.picture || usersComposable.currentUser.value?.avatar
  );
});

const userIdentifier = computed(() => {
  const pubkey =
    currentUserInfo.value?.pubkey || usersComposable.currentUser.value?.npub;
  if (!pubkey) return "";
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
});

// Determine user provider
const userProvider = computed(() => {
  if (currentUserInfo.value?.pubkey) return "nostr";
  return usersComposable.currentUser.value?.authMethod || "nostr";
});

// Computed for account switcher
const accountCount = computed(() => allAccounts.value.length);

// Methods for account switcher
const openAccountSwitcher = () => {
  showAccountSwitcher.value = true;
};

const onAccountSwitched = (pubkey: string) => {
  console.log("Switched to account:", pubkey);
};

// Dark mode
const isDark = computed({
  get: () => colorMode.value === "dark",
  set: (value: boolean) => {
    colorMode.preference = value ? "dark" : "light";
  },
});

// Theme colors
const themeColors = [
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "amber", label: "Amber", class: "bg-amber-500" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
  { value: "lime", label: "Lime", class: "bg-lime-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "emerald", label: "Emerald", class: "bg-emerald-500" },
  { value: "teal", label: "Teal", class: "bg-teal-500" },
  { value: "cyan", label: "Cyan", class: "bg-cyan-500" },
  { value: "sky", label: "Sky", class: "bg-sky-500" },
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "indigo", label: "Indigo", class: "bg-indigo-500" },
  { value: "violet", label: "Violet", class: "bg-violet-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "fuchsia", label: "Fuchsia", class: "bg-fuchsia-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "rose", label: "Rose", class: "bg-rose-500" },
];

const selectedColor = ref(appConfig.ui?.colors?.primary || "purple");

const setThemeColor = (color: string) => {
  selectedColor.value = color;
  appConfig.ui.colors.primary = color;
  localStorage.setItem("theme-color", color);
};

// Load saved color on mount
onMounted(() => {
  const savedColor = localStorage.getItem("theme-color");
  if (savedColor) {
    selectedColor.value = savedColor;
    appConfig.ui.colors.primary = savedColor;
  }
});

// Provider badge styling
const providerBadgeClass = computed(() => {
  switch (userProvider.value) {
    case "nostr":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "password":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "pin":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400";
  }
});

// Logout - use improved auth signOut that cleans all data
const handleLogout = async () => {
  const auth = useAuth();
  await auth.signOut({ keepWorkspaces: true }); // Keep workspaces for quick re-login
};
</script>
