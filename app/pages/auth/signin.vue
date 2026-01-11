<!-- pages/auth/signin.vue -->
<!-- 🔐 Sign In Page - Simplified Nostr-Only Auth -->
<script setup lang="ts">
definePageMeta({
  layout: "blank",
});

const { t } = useI18n();

useHead({
  title: t("auth.signin.title") + " - bnos.space",
});

const auth = useAuth();
const router = useRouter();
const toast = useToast();
const nostrUser = useNostrUser();
const usersComposable = useUsers();
const shopManager = useShopManager();
const { syncNostrOwner } = usersComposable;

// UI state
const hasNostr = ref(false);
const nostrConnecting = ref(false);
const showNsecInput = ref(false);
const manualNsec = ref("");
const detectedExtension = ref<"alby" | "nos2x" | "unknown" | null>(null);
const nostrError = ref<string | null>(null);

// Company code state (for cross-device sync)
const companyCodeInput = ref("");
const isLoadingCompanyCode = ref(false);
const companyCodeError = ref<string | null>(null);
const showCompanyCode = ref(false);
const company = useCompany();
const nostrData = useNostrData();

// Computed
const isValidCompanyCode = computed(() =>
  company.isValidCompanyCode(companyCodeInput.value)
);

// Format company code input with dashes
function formatCompanyCodeInput(event: Event) {
  const input = event.target as HTMLInputElement;
  let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Support format: XXXXX-XXXXX-XXXXX (5-5-5)
  if (value.length > 5) {
    value = value.slice(0, 5) + "-" + value.slice(5);
  }
  if (value.length > 11) {
    value = value.slice(0, 11) + "-" + value.slice(11);
  }
  if (value.length > 17) {
    value = value.slice(0, 17);
  }

  companyCodeInput.value = value;
}

// Handle Nostr extension sign in
const handleNostrSignIn = async () => {
  nostrConnecting.value = true;
  nostrError.value = null;

  try {
    const success = await auth.signInWithNostr();
    if (success) {
      await usersComposable.refreshFromNostr();

      const nostrPubkeyCookie = useCookie("nostr-pubkey");
      const existingUser = usersComposable.users.value.find(
        (u) => u.pubkeyHex === nostrPubkeyCookie.value
      );

      if (existingUser) {
        // Check if user is blocked or expired
        if (existingUser.revokedAt) {
          nostrError.value =
            t("auth.signin.accessRevoked", "🚫 Access has been revoked. Contact your manager.");
          return;
        }
        if (
          existingUser.expiresAt &&
          new Date(existingUser.expiresAt) < new Date()
        ) {
          nostrError.value =
            t("auth.signin.accessExpired", "⏰ Access has expired. Contact your manager.");
          return;
        }
        usersComposable.setCurrentUser(existingUser);
      } else {
        await syncNostrOwner();
      }

      // Try to load workspaces from Nostr (for new device login)
      await shopManager.loadWorkspacesFromNostr();

      router.push("/");
    }
  } catch (e) {
    nostrError.value = e instanceof Error ? e.message : "Connection failed";
  } finally {
    nostrConnecting.value = false;
  }
};

// Direct call to trigger nos2x popup
const triggerNos2xPopup = async () => {
  nostrConnecting.value = true;
  nostrError.value = null;

  try {
    if (typeof window === "undefined") return;

    const win = window as unknown as {
      nostr?: {
        getPublicKey: () => Promise<string>;
        signEvent: (event: object) => Promise<object>;
      };
    };

    if (!win.nostr) {
      nostrError.value = "Nostr extension not found. Please install nos2x.";
      return;
    }

    const pubkey = await win.nostr.getPublicKey();

    if (
      !pubkey ||
      pubkey === "null" ||
      (typeof pubkey === "string" && pubkey.length < 32)
    ) {
      nostrError.value =
        "⚠️ nos2x has no key configured!\n\n" +
        "👉 Click the nos2x icon in your browser toolbar\n" +
        "👉 Enter or generate a private key\n" +
        '👉 Click "save" then try again';
      return;
    }

    if (typeof pubkey === "string" && pubkey.length >= 32) {
      // Check if user exists and has access
      await usersComposable.refreshFromNostr();
      const existingUser = usersComposable.users.value.find(
        (u) => u.pubkeyHex === pubkey
      );

      if (existingUser) {
        if (existingUser.revokedAt) {
          nostrError.value =
            t("auth.signin.accessRevoked", "🚫 Access has been revoked. Contact your manager.");
          return;
        }
        if (
          existingUser.expiresAt &&
          new Date(existingUser.expiresAt) < new Date()
        ) {
          nostrError.value =
            t("auth.signin.accessExpired", "⏰ Access has expired. Contact your manager.");
          return;
        }
      }

      const success = await auth.signInWithNpub(pubkey);
      if (success) {
        // Try to load workspaces from Nostr (for new device login)
        await shopManager.loadWorkspacesFromNostr();
        router.push("/");
      }
    } else {
      nostrError.value = "Invalid public key format from extension";
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("rejected") || msg.includes("denied")) {
      nostrError.value =
        "Request was rejected. Please approve the permission in nos2x.";
    } else {
      nostrError.value = msg || "Failed to connect to nos2x";
    }
  } finally {
    nostrConnecting.value = false;
  }
};

// Sign in with nsec (private key) - Universal login for owner & staff
const handleNsecSignIn = async () => {
  if (!manualNsec.value.trim()) return;

  nostrConnecting.value = true;
  nostrError.value = null;

  try {
    const nsec = manualNsec.value.trim();

    const setupSuccess = await nostrUser.setupUser(nsec);
    if (!setupSuccess) {
      throw new Error(
        "Invalid private key format. Use nsec1... or 64-char hex."
      );
    }

    const nostrStorage = useNostrStorage();
    const { userInfo } = nostrStorage.loadCurrentUser();

    if (!userInfo?.pubkey) {
      throw new Error("Failed to derive public key");
    }

    const pubkeyHex = userInfo.pubkey;

    // Set cookie for middleware
    const nostrCookie = useCookie("nostr-pubkey", {
      maxAge: 60 * 60 * 24 * 30,
    });
    nostrCookie.value = pubkeyHex;

    // Fetch existing users to check if this is staff
    await usersComposable.refreshFromNostr();

    const existingUser = usersComposable.users.value.find(
      (u) => u.pubkeyHex === pubkeyHex
    );

    if (existingUser) {
      // Check access status
      if (existingUser.revokedAt) {
        nostrError.value =
          t("auth.signin.accessRevoked", "🚫 Access has been revoked. Contact your manager.");
        manualNsec.value = "";
        return;
      }
      if (
        existingUser.expiresAt &&
        new Date(existingUser.expiresAt) < new Date()
      ) {
        nostrError.value =
          t("auth.signin.accessExpired", "⏰ Access has expired. Contact your manager.");
        manualNsec.value = "";
        return;
      }

      usersComposable.setCurrentUser(existingUser);
      toast.add({
        title: t("auth.signin.welcomeBack", "Welcome back!"),
        description: existingUser.name,
        icon: "i-heroicons-check-circle",
        color: "green",
      });
    } else {
      // New user - create as owner
      await syncNostrOwner();
      const companyCode = await company.initializeCompany(pubkeyHex);
      const codeHash = await company.hashCompanyCode(companyCode);
      await nostrData.publishCompanyIndex(codeHash);

      toast.add({
        title: t("auth.signin.accountCreated", "Account created!"),
        description: t("auth.signin.ownerSetup", "You are now the owner"),
        icon: "i-heroicons-sparkles",
        color: "green",
      });
    }

    // Try to load workspaces from Nostr (for new device login)
    // This restores workspace list synced from other devices
    await shopManager.loadWorkspacesFromNostr();

    manualNsec.value = "";
    router.push("/");
  } catch (e) {
    nostrError.value = e instanceof Error ? e.message : "Invalid private key";
  } finally {
    nostrConnecting.value = false;
  }
};

// Handle company code submit (sync staff from another device)
const settingsSync = useSettingsSync();

const handleCompanyCodeSubmit = async () => {
  const codeValue = companyCodeInput.value.replace(/-/g, "");
  if (codeValue.length < 6) return;

  isLoadingCompanyCode.value = true;
  companyCodeError.value = null;

  try {
    let ownerPubkey = company.ownerPubkey.value;

    if (!ownerPubkey) {
      ownerPubkey = await nostrData.discoverOwnerByCompanyCode(
        companyCodeInput.value
      );
      if (!ownerPubkey) {
        companyCodeError.value =
          t("auth.signin.invalidCode", "Invalid code. Check with your manager.");
        return;
      }
    }

    const staff = await nostrData.fetchStaffByCompanyCode(
      companyCodeInput.value,
      ownerPubkey
    );

    if (staff.length === 0) {
      companyCodeError.value =
        t("auth.signin.noStaffFound", "Invalid code or no staff found.");
      return;
    }

    await company.setCompanyCode(companyCodeInput.value, ownerPubkey);

    // Merge fetched users
    const STORAGE_KEY = "bitspace_users";
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const existingIds = new Set(existing.map((u: { id: string }) => u.id));

    for (const user of staff) {
      if (!existingIds.has(user.id)) {
        existing.push(user);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    await usersComposable.refreshFromNostr();

    // Sync settings
    try {
      await settingsSync.fetchAndApplySettings(companyCodeInput.value);
    } catch (e) {
      console.warn("[Signin] Settings sync failed:", e);
    }

    toast.add({
      title: t("auth.signin.syncSuccess", "Synced!"),
      description: `${staff.length} ${
        t("auth.signin.staffSynced", "staff members synced")
      }`,
      icon: "i-heroicons-check-circle",
      color: "green",
    });

    companyCodeInput.value = "";
    showCompanyCode.value = false;
  } catch (e) {
    companyCodeError.value =
      t("auth.signin.syncFailed", "Failed to connect. Check code and try again.");
  } finally {
    isLoadingCompanyCode.value = false;
  }
};

// Check if already authenticated and check Nostr extension
onMounted(async () => {
  if (auth.isAuthenticated.value) {
    router.push("/");
  }

  // Load existing users from localStorage
  usersComposable.loadUsersOnly();

  // Check for Nostr extension after a short delay
  setTimeout(() => {
    hasNostr.value = auth.hasNostrExtension();

    if (hasNostr.value && typeof window !== "undefined") {
      const win = window as unknown as {
        nostr?: { _requests?: unknown; signSchnorr?: unknown };
        alby?: unknown;
      };

      if (win.alby || (win.nostr && "_requests" in win.nostr)) {
        detectedExtension.value = "alby";
      } else if (win.nostr && "signSchnorr" in win.nostr) {
        detectedExtension.value = "nos2x";
      } else {
        detectedExtension.value = "unknown";
      }
    }
  }, 500);
});
</script>

<template>
  <div
    class="min-h-screen bg-linear-to-br py-6 from-gray-50 via-white to-amber-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col justify-center"
  >
    <!-- Background Pattern -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute -top-40 -right-40 w-96 h-96 bg-linear-to-br from-amber-400/20 to-orange-500/10 dark:from-amber-500/10 dark:to-orange-500/5 rounded-full blur-3xl"
      />
      <div
        class="absolute -bottom-40 -left-40 w-96 h-96 bg-linear-to-tr from-purple-400/15 to-pink-500/10 dark:from-purple-500/10 dark:to-pink-500/5 rounded-full blur-3xl"
      />
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-linear-to-r from-amber-200/10 via-transparent to-purple-200/10 dark:from-amber-500/5 dark:via-transparent dark:to-purple-500/5 rounded-full blur-3xl"
      />
    </div>

    <div class="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
      <!-- Back to Home & Language Switcher -->
      <div class="mb-6 flex w-full gap-6 items-center justify-between">
        <NuxtLinkLocale
          to="/"
          class="inline-flex whitespace-nowrap flex-1 items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
          {{ t("common.back") }}
        </NuxtLinkLocale>
        <div class="max-w-sm">
          <CommonSwitchLanguage />
        </div>
      </div>

      <!-- Logo & Header -->
      <div class="text-center mb-8">
        <div class="flex justify-center mb-4">
          <div
            class="w-16 h-16 bg-linear-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20"
          >
            <span class="text-3xl">⚡</span>
          </div>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ t("app.name") }}
        </h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          {{ t("app.tagline") }}
        </p>
      </div>

      <!-- Sign In Card -->
      <div
        class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        <div class="p-6">
          <!-- Error Message -->
          <div
            v-if="nostrError"
            class="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 dark:text-red-400 text-sm whitespace-pre-line"
          >
            <div class="flex items-start gap-3">
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-5 h-5 flex-shrink-0 mt-0.5"
              />
              <span>{{ nostrError }}</span>
            </div>
          </div>

          <!-- Nostr Extension Login (if available) -->
          <template v-if="hasNostr && !showNsecInput && !showCompanyCode">
            <div class="text-center py-4">
              <div
                class="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <span class="text-3xl">🔑</span>
              </div>
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white mb-1"
              >
                {{ t("auth.nostr.signIn") }}
              </h3>
              <p class="text-gray-600 dark:text-gray-400 text-sm">
                {{ t("auth.nostr.description") }}
              </p>
            </div>

            <!-- Detected Extension Badge -->
            <div v-if="detectedExtension" class="flex justify-center mb-4">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                :class="{
                  'bg-amber-500/20 text-amber-600 dark:text-amber-400':
                    detectedExtension === 'alby',
                  'bg-purple-500/20 text-purple-600 dark:text-purple-400':
                    detectedExtension === 'nos2x',
                  'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400':
                    detectedExtension === 'unknown',
                }"
              >
                <span v-if="detectedExtension === 'alby'">🐝</span>
                <span v-else-if="detectedExtension === 'nos2x'">🔐</span>
                <span v-else>🔌</span>
                {{
                  detectedExtension === "alby"
                    ? t("auth.nostr.albyDetected")
                    : detectedExtension === "nos2x"
                    ? t("auth.nostr.nos2xDetected")
                    : t("auth.nostr.extensionDetected")
                }}
              </span>
            </div>

            <!-- Extension Connect Buttons -->
            <div class="space-y-2">
              <UButton
                block
                size="lg"
                :color="detectedExtension === 'alby' ? 'primary' : 'neutral'"
                :variant="detectedExtension === 'alby' ? 'solid' : 'outline'"
                :loading="nostrConnecting"
                @click="handleNostrSignIn"
              >
                <template #leading>
                  <span class="text-lg">🐝</span>
                </template>
                {{ t("auth.nostr.connectAlby") }}
              </UButton>

              <UButton
                block
                size="lg"
                :color="detectedExtension === 'nos2x' ? 'primary' : 'neutral'"
                :variant="detectedExtension === 'nos2x' ? 'solid' : 'outline'"
                :loading="nostrConnecting"
                @click="triggerNos2xPopup"
              >
                <template #leading>
                  <span class="text-lg">🔐</span>
                </template>
                {{ t("auth.nostr.connectNos2x") }}
              </UButton>
            </div>

            <!-- Divider -->
            <div class="relative my-6">
              <div class="absolute inset-0 flex items-center">
                <div
                  class="w-full border-t border-gray-200 dark:border-gray-700"
                />
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="bg-white dark:bg-gray-900 px-2 text-gray-500">
                  {{ t("common.or") }}
                </span>
              </div>
            </div>

            <!-- Alternative Login Options -->
            <div class="space-y-3">
              <UButton
                block
                color="neutral"
                variant="outline"
                @click="showNsecInput = true"
              >
                <template #leading>
                  <UIcon name="i-heroicons-key" class="w-5 h-5" />
                </template>
                {{ t("auth.signin.loginWithKey", "Login with Private Key") }}
              </UButton>

              <UButton
                block
                color="neutral"
                variant="ghost"
                size="sm"
                @click="showCompanyCode = true"
              >
                <template #leading>
                  <UIcon name="i-heroicons-building-office" class="w-4 h-4" />
                </template>
                {{
                  t("auth.signin.syncFromCompany", "Sync from Company Code")
                }}
              </UButton>
            </div>
          </template>

          <!-- No Extension - Show nsec input as primary -->
          <template v-else-if="!showCompanyCode">
            <div class="text-center py-4">
              <div
                class="w-16 h-16 bg-linear-to-br from-amber-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <span class="text-3xl">🔐</span>
              </div>
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white mb-1"
              >
                {{ t("auth.signin.title") }}
              </h3>
              <p class="text-gray-600 dark:text-gray-400 text-sm">
                {{
                  t("auth.signin.enterKeyDesc", "Enter your private key to sign in")
                }}
              </p>
            </div>

            <!-- nsec Input -->
            <div class="space-y-4">
              <UInput
                v-model="manualNsec"
                type="password"
                :placeholder="
                  t('auth.signin.nsecPlaceholder', 'nsec1... or hex private key')
                "
                size="lg"
                class="w-full"
                icon="i-heroicons-key"
              />

              <UButton
                block
                size="lg"
                color="primary"
                :loading="nostrConnecting"
                :disabled="!manualNsec.trim()"
                @click="handleNsecSignIn"
              >
                <template #leading>
                  <UIcon
                    name="i-heroicons-arrow-right-end-on-rectangle"
                    class="w-5 h-5"
                  />
                </template>
                {{ t("auth.signin.signIn") }}
              </UButton>

              <!-- Info box -->
              <div
                class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl"
              >
                <p
                  class="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2"
                >
                  <UIcon
                    name="i-heroicons-light-bulb"
                    class="w-4 h-4 flex-shrink-0 mt-0.5"
                  />
                  <span>
                    {{
                      t("auth.signin.keyInfo", "Your key is stored locally and never sent to servers. Use the same key on all devices.")
                    }}
                  </span>
                </p>
              </div>
            </div>

            <!-- Back button if coming from extension view -->
            <div v-if="hasNostr" class="mt-4">
              <UButton
                block
                color="neutral"
                variant="ghost"
                size="sm"
                @click="showNsecInput = false"
              >
                <template #leading>
                  <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
                </template>
                {{ t("auth.signin.useExtension", "Use Browser Extension") }}
              </UButton>
            </div>

            <!-- Sync from Company Code -->
            <div
              class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <UButton
                block
                color="neutral"
                variant="ghost"
                size="sm"
                @click="showCompanyCode = true"
              >
                <template #leading>
                  <UIcon name="i-heroicons-building-office" class="w-4 h-4" />
                </template>
                {{
                  t("auth.signin.syncFromCompany", "Sync from Company Code")
                }}
              </UButton>
            </div>

            <!-- Install Extension Links -->
            <div
              v-if="!hasNostr"
              class="mt-6 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl"
            >
              <h4
                class="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3"
              >
                {{
                  t("auth.signin.noExtension") ||
                  "Don't have a Nostr extension?"
                }}
              </h4>
              <div class="flex gap-2">
                <a
                  href="https://getalby.com"
                  target="_blank"
                  class="flex-1 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors text-center"
                >
                  <span class="text-xl">🐝</span>
                  <p class="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Alby
                  </p>
                </a>
                <a
                  href="https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp"
                  target="_blank"
                  class="flex-1 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition-colors text-center"
                >
                  <span class="text-xl">🔐</span>
                  <p class="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    nos2x
                  </p>
                </a>
              </div>
            </div>
          </template>

          <!-- Company Code Sync -->
          <template v-if="showCompanyCode">
            <div class="text-center py-4">
              <div
                class="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <UIcon
                  name="i-heroicons-building-office-2"
                  class="w-8 h-8 text-blue-500"
                />
              </div>
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white mb-1"
              >
                {{ t("auth.signin.syncTitle", "Sync Staff Data") }}
              </h3>
              <p class="text-gray-600 dark:text-gray-400 text-sm">
                {{
                  t("auth.signin.syncDesc", "Enter your company code to sync staff data")
                }}
              </p>
            </div>

            <div class="space-y-4">
              <UInput
                v-model="companyCodeInput"
                type="text"
                maxlength="17"
                size="lg"
                class="text-center text-xl tracking-widest font-mono w-full"
                placeholder="XXXXX-XXXXX-XXXXX"
                @input="formatCompanyCodeInput"
                @keyup.enter="handleCompanyCodeSubmit"
              />

              <div v-if="companyCodeError">
                <UAlert color="error" :title="companyCodeError" />
              </div>

              <UButton
                block
                size="lg"
                color="primary"
                :loading="isLoadingCompanyCode"
                :disabled="!isValidCompanyCode"
                @click="handleCompanyCodeSubmit"
              >
                <template #leading>
                  <UIcon name="i-heroicons-cloud-arrow-down" class="w-5 h-5" />
                </template>
                {{ t("auth.signin.syncNow", "Sync Now") }}
              </UButton>

              <UButton
                block
                color="neutral"
                variant="ghost"
                @click="showCompanyCode = false"
              >
                <template #leading>
                  <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
                </template>
                {{ t("common.back") }}
              </UButton>
            </div>

            <div class="mt-4 p-3 bg-gray-100 dark:bg-gray-800/50 rounded-xl">
              <p
                class="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2"
              >
                <UIcon
                  name="i-heroicons-information-circle"
                  class="w-4 h-4 flex-shrink-0 mt-0.5"
                />
                <span>
                  {{
                    t("auth.signin.syncInfo", "Get the company code from your manager. This will sync all staff data to your device.")
                  }}
                </span>
              </p>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div
          class="px-6 py-5 bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-800/50 border-t border-gray-200 dark:border-gray-800"
        >
          <div class="flex items-center justify-center gap-2 text-sm">
            <span class="text-gray-600 dark:text-gray-400">
              {{ t("auth.signin.noAccount") }}
            </span>
            <NuxtLinkLocale
              to="/auth/signup"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium rounded-full transition-all duration-200 hover:scale-105"
            >
              <UIcon name="i-heroicons-user-plus" class="w-4 h-4" />
              {{ t("auth.signin.createAccount") }}
            </NuxtLinkLocale>
          </div>
        </div>
      </div>

      <!-- Why Nostr Section -->
      <div
        class="mt-6 p-4 bg-white/50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700"
      >
        <h4
          class="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3 text-center"
        >
          {{ t("auth.signin.whyNostr", "Why Nostr?") }}
        </h4>
        <ul class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <li class="flex items-center gap-2">
            <span class="text-green-500">✓</span>
            {{ t("auth.signin.benefit1", "No email or password required") }}
          </li>
          <li class="flex items-center gap-2">
            <span class="text-green-500">✓</span>
            {{ t("auth.signin.benefit2", "You control your identity") }}
          </li>
          <li class="flex items-center gap-2">
            <span class="text-green-500">✓</span>
            {{ t("auth.signin.benefit3", "Works with Lightning payments") }}
          </li>
          <li class="flex items-center gap-2">
            <span class="text-green-500">✓</span>
            {{ t("auth.signin.benefit4", "Same key for all devices") }}
          </li>
        </ul>
      </div>

      <!-- Bottom Links -->
      <div class="mt-8 text-center">
        <div class="flex items-center justify-center gap-6">
          <a
            href="#"
            class="group inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <UIcon
              name="i-heroicons-shield-check"
              class="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors"
            />
            {{ t("app.privacyPolicy") }}
          </a>
          <span class="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          <a
            href="#"
            class="group inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <UIcon
              name="i-heroicons-document-text"
              class="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors"
            />
            {{ t("app.termsOfService") }}
          </a>
        </div>

        <p class="mt-4 text-xs text-gray-400 dark:text-gray-600">
          © {{ new Date().getFullYear() }} {{ t("app.copyright") }}
        </p>
      </div>
    </div>
  </div>
</template>
