<!-- pages/auth/signup.vue -->
<!-- 📝 Create Account Page -->
<script setup lang="ts">
definePageMeta({
  layout: "blank",
});

const { t } = useI18n();

useHead({
  title: t("auth.signup.title") + " - bnos.space",
});

const auth = useAuth();
const router = useRouter();

// Form state
const formData = ref({
  displayName: "",
  email: "",
  password: "",
  confirmPassword: "",
});
const agreeTerms = ref(false);
const showPassword = ref(false);

// Validation
const passwordStrength = computed(() => {
  const password = formData.value.password;
  let strength = 0;

  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  return strength;
});

const passwordStrengthLabel = computed(() => {
  const labels = [
    t("auth.password.veryWeak"),
    t("auth.password.weak"),
    t("auth.password.fair"),
    t("auth.password.good"),
    t("auth.password.strong"),
  ];
  return labels[passwordStrength.value - 1] || "";
});

const passwordStrengthColor = computed(() => {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-400",
    "bg-green-500",
  ];
  return colors[passwordStrength.value - 1] || "bg-gray-700";
});

const isFormValid = computed(() => {
  return (
    formData.value.email &&
    formData.value.password.length >= 8 &&
    formData.value.password === formData.value.confirmPassword &&
    agreeTerms.value
  );
});

// Sign up
const handleSignUp = async () => {
  if (!isFormValid.value) return;

  const success = await auth.signUpWithEmail(
    formData.value.email,
    formData.value.password,
    formData.value.displayName
  );

  if (success) {
    // Show success message or redirect
    router.push("/auth/verify-email");
  }
};

// Sign up with Google
const handleGoogleSignUp = () => {
  auth.signInWithGoogle();
};

// Sign up with Nostr extension
const handleNostrSignUp = async () => {
  const success = await auth.signInWithNostr();
  if (success) {
    router.push("/");
  }
};

// Create new Nostr account (generate keys)
const nostrUser = useNostrUser();
const isCreatingNostr = ref(false);
const newAccountKeys = ref<{ npub: string; nsec: string } | null>(null);
const showKeysModal = ref(false);
const keysCopied = ref({ npub: false, nsec: false });

const handleCreateNostrAccount = async () => {
  isCreatingNostr.value = true;

  try {
    // Generate new Nostr keys
    const newUser = nostrUser.createUser();

    if (newUser) {
      // Show the keys to user before saving
      newAccountKeys.value = {
        npub: newUser.npub,
        nsec: newUser.nsec,
      };
      showKeysModal.value = true;
    }
  } catch (e) {
    auth.error.value =
      e instanceof Error ? e.message : "Failed to create account";
  } finally {
    isCreatingNostr.value = false;
  }
};

const confirmAccountCreation = async () => {
  if (!newAccountKeys.value) return;

  // Auto-login with the new account
  const nostrKey = useNostrKey();

  // Decode the nsec to get privkey
  const privkeyHex = nostrKey.decodePrivateKey(newAccountKeys.value.nsec);
  if (!privkeyHex) {
    auth.error.value = "Failed to decode private key";
    return;
  }

  // Get pubkey from privkey
  const pubkeyHex = nostrKey.getPublicKeyFromPrivate(privkeyHex);

  // Save to localStorage for persistent login
  const userData = {
    pubkey: pubkeyHex,
    privateKey: privkeyHex,
    npub: newAccountKeys.value.npub,
    nsec: newAccountKeys.value.nsec,
  };
  localStorage.setItem("nostrUser", JSON.stringify(userData));

  // Set the auth cookie so middleware allows access
  const nostrCookie = useCookie("nostr-pubkey", { maxAge: 60 * 60 * 24 * 30 }); // 30 days
  nostrCookie.value = pubkeyHex;

  console.log(
    "[Signup] Auto-logged in with new Nostr account:",
    pubkeyHex.slice(0, 8) + "..."
  );

  showKeysModal.value = false;
  router.push("/");
};

const copyToClipboard = async (text: string, type: "npub" | "nsec") => {
  await navigator.clipboard.writeText(text);
  keysCopied.value[type] = true;
  setTimeout(() => {
    keysCopied.value[type] = false;
  }, 2000);
};

// Check if already authenticated
onMounted(() => {
  if (auth.isAuthenticated.value) {
    router.push("/");
  }
});
</script>

<template>
  <div
    class="min-h-screen bg-linear-to-br py-6 from-gray-50 via-white to-amber-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col justify-center"
  >
    <!-- Background Pattern -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <!-- Top right glow -->
      <div
        class="absolute -top-40 -right-40 w-96 h-96 bg-linear-to-br from-amber-400/20 to-orange-500/10 dark:from-amber-500/10 dark:to-orange-500/5 rounded-full blur-3xl"
      />
      <!-- Bottom left glow -->
      <div
        class="absolute -bottom-40 -left-40 w-96 h-96 bg-linear-to-tr from-purple-400/15 to-pink-500/10 dark:from-purple-500/10 dark:to-pink-500/5 rounded-full blur-3xl"
      />
      <!-- Center subtle glow -->
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-linear-to-r from-amber-200/10 via-transparent to-purple-200/10 dark:from-amber-500/5 dark:via-transparent dark:to-purple-500/5 rounded-full blur-3xl"
      />
    </div>

    <div class="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
      <!-- Back to Home & Language Switcher -->
      <div class="mb-6 flex w-full gap-6 items-center justify-between">
        <NuxtLinkLocale
          to="/"
          class="inline-flex whitespace-nowrap items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
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
          {{ t("auth.signup.title") }}
        </h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          {{ t("auth.signup.subtitle") }}
        </p>
      </div>

      <!-- Sign Up Card -->
      <div
        class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        <div class="p-6">
          <!-- Error Message -->
          <div
            v-if="auth.error.value"
            class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
          >
            {{ auth.error.value }}
          </div>

          <!-- Primary: Create Nostr Account -->
          <div class="mb-6">
            <div class="text-center mb-4">
              <div
                class="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <span class="text-2xl">⚡</span>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t("auth.nostr.createAccount") }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ t("auth.nostr.noEmailRequired") }}
              </p>
            </div>

            <UButton
              block
              size="lg"
              color="primary"
              :loading="isCreatingNostr"
              @click="handleCreateNostrAccount"
            >
              <template #leading>
                <span class="text-lg">🔑</span>
              </template>
              {{ t("auth.nostr.generateKeys") }}
            </UButton>

            <p class="text-xs text-gray-500 text-center mt-2">
              ✨ {{ t("auth.nostr.description") }}
            </p>
          </div>

          <!-- Or connect with extension -->
          <USeparator
            :label="t('auth.signup.connectExisting', 'or connect existing')"
            class="my-4"
          />

          <!-- Secondary: Connect with Extension/Import -->
          <div class="space-y-3 mb-6">
            <UButton
              block
              size="lg"
              color="neutral"
              variant="outline"
              @click="handleNostrSignUp"
            >
              <template #leading>
                <span class="text-lg">🔌</span>
              </template>
              Connect with Nostr Extension
            </UButton>

            <UButton
              block
              size="lg"
              color="neutral"
              variant="outline"
              icon="material-icon-theme:google"
              class="hidden"
              @click="handleGoogleSignUp"
            >
              Continue with Google
            </UButton>
          </div>

          <div class="relative hidden mb-6">
            <div class="absolute inset-0 flex items-center">
              <div
                class="w-full border-t border-gray-200 dark:border-gray-800"
              />
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white dark:bg-gray-900 text-gray-500"
                >or create with email</span
              >
            </div>
          </div>

          <!-- Email Sign Up Form -->
          <form class="space-y-4 hidden" @submit.prevent="handleSignUp">
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >Display Name</label
              >
              <UInput
                v-model="formData.displayName"
                type="text"
                placeholder="John Doe"
                size="lg"
                class="w-full"
              />
            </div>

            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >Email</label
              >
              <UInput
                v-model="formData.email"
                type="email"
                placeholder="you@example.com"
                size="lg"
                required
                class="w-full"
              />
            </div>

            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >Password</label
              >
              <UInput
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Create a strong password"
                size="lg"
                required
                class="w-full"
              >
                <template #trailing>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :icon="
                      showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                    "
                    @click="showPassword = !showPassword"
                  />
                </template>
              </UInput>

              <!-- Password Strength Indicator -->
              <div v-if="formData.password" class="mt-2">
                <div class="flex gap-1 mb-1">
                  <div
                    v-for="i in 5"
                    :key="i"
                    class="h-1 flex-1 rounded-full transition-colors"
                    :class="
                      i <= passwordStrength
                        ? passwordStrengthColor
                        : 'bg-gray-700'
                    "
                  />
                </div>
                <p
                  class="text-xs"
                  :class="
                    passwordStrength >= 3 ? 'text-green-400' : 'text-gray-500'
                  "
                >
                  {{ passwordStrengthLabel }}
                </p>
              </div>
            </div>

            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >Confirm Password</label
              >
              <UInput
                v-model="formData.confirmPassword"
                type="password"
                placeholder="Confirm your password"
                size="lg"
                required
                class="w-full"
              />
              <p
                v-if="
                  formData.confirmPassword &&
                  formData.password !== formData.confirmPassword
                "
                class="mt-1 text-xs text-red-400"
              >
                Passwords do not match
              </p>
            </div>

            <label class="flex items-start gap-3 cursor-pointer">
              <UCheckbox v-model="agreeTerms" class="mt-0.5" />
              <span class="text-sm text-gray-600 dark:text-gray-400">
                I agree to the
                <NuxtLink
                  to="/legal/terms"
                  class="text-amber-500 hover:text-amber-400"
                  >Terms of Service</NuxtLink
                >
                and
                <NuxtLink
                  to="/legal/privacy"
                  class="text-amber-500 hover:text-amber-400"
                  >Privacy Policy</NuxtLink
                >
              </span>
            </label>

            <UButton
              type="submit"
              block
              size="lg"
              color="primary"
              :loading="auth.isLoading.value"
              :disabled="!isFormValid"
            >
              Create Account
            </UButton>
          </form>
        </div>

        <!-- Footer -->
        <div
          class="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-800 text-center"
        >
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t("auth.signup.hasAccount") }}
            <NuxtLink
              to="/auth/signin"
              class="text-amber-500 hover:text-amber-400 font-medium"
            >
              {{ t("auth.signup.signIn") }}
            </NuxtLink>
          </p>
        </div>
      </div>

      <!-- Features -->
      <div class="mt-8 grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-2xl mb-1">⚡</div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Lightning Payments
          </p>
        </div>
        <div>
          <div class="text-2xl mb-1">🔐</div>
          <p class="text-xs text-gray-500 dark:text-gray-400">Non-Custodial</p>
        </div>
        <div>
          <div class="text-2xl mb-1">🌐</div>
          <p class="text-xs text-gray-500 dark:text-gray-400">Decentralized</p>
        </div>
      </div>
    </div>

    <!-- New Account Keys Modal -->
    <UModal v-model:open="showKeysModal" :closeable="false">
      <template #content>
        <UCard>
          <template #header>
            <div class="text-center">
              <div
                class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <span class="text-3xl">🎉</span>
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                Account Created!
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Save your keys securely - you'll need them to recover your
                account
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <!-- Warning -->
            <div
              class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
            >
              <p
                class="text-sm text-amber-600 dark:text-amber-400 flex items-start gap-2"
              >
                <span class="text-lg">⚠️</span>
                <span>
                  <strong class="block">Save these keys now!</strong>
                  Your private key (nsec) will not be shown again. Store it
                  securely.
                </span>
              </p>
            </div>

            <!-- Public Key (npub) -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Public Key (npub) - Share this
              </label>
              <div class="flex gap-2">
                <UInput
                  :model-value="newAccountKeys?.npub"
                  readonly
                  class="flex-1 font-mono text-xs"
                />
                <UButton
                  :icon="
                    keysCopied.npub
                      ? 'i-heroicons-check'
                      : 'i-heroicons-clipboard'
                  "
                  :color="keysCopied.npub ? 'success' : 'neutral'"
                  variant="outline"
                  @click="copyToClipboard(newAccountKeys?.npub || '', 'npub')"
                />
              </div>
            </div>

            <!-- Private Key (nsec) -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Private Key (nsec) - Keep this secret!
              </label>
              <div class="flex gap-2">
                <UInput
                  :model-value="newAccountKeys?.nsec"
                  readonly
                  type="password"
                  class="flex-1 font-mono text-xs"
                />
                <UButton
                  :icon="
                    keysCopied.nsec
                      ? 'i-heroicons-check'
                      : 'i-heroicons-clipboard'
                  "
                  :color="keysCopied.nsec ? 'success' : 'neutral'"
                  variant="outline"
                  @click="copyToClipboard(newAccountKeys?.nsec || '', 'nsec')"
                />
              </div>
              <p class="text-xs text-red-400 mt-1">
                🔐 Never share your nsec with anyone!
              </p>
            </div>
          </div>

          <template #footer>
            <div class="space-y-3">
              <UButton
                block
                color="primary"
                size="lg"
                @click="confirmAccountCreation"
              >
                I've Saved My Keys - Continue
              </UButton>
              <p class="text-xs text-gray-500 text-center">
                You can find your keys later in Settings → Account
              </p>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
