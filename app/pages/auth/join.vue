<template>
  <div
    class="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950 flex items-center justify-center p-4"
  >
    <!-- Loading State -->
    <div v-if="isLoading" class="text-center">
      <div
        class="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-10 h-10 text-primary-500 animate-spin"
        />
      </div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {{ t("auth.join.processing", "Processing Invite...") }}
      </h1>
      <p class="text-gray-500">
        {{ t("auth.join.pleaseWait", "Please wait") }}
      </p>
    </div>

    <!-- Error State -->
    <UCard v-else-if="error" class="max-w-md w-full">
      <div class="text-center py-6">
        <div
          class="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="w-10 h-10 text-red-500"
          />
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {{ t("auth.join.invalidInvite", "Invalid Invite") }}
        </h1>
        <p class="text-gray-500 mb-6">
          {{ error }}
        </p>
        <UButton color="primary" size="lg" to="/auth/signin">
          {{ t("auth.join.goToSignin", "Go to Sign In") }}
        </UButton>
      </div>
    </UCard>

    <!-- Success State -->
    <UCard v-else-if="inviteData" class="max-w-md w-full">
      <div class="text-center py-6">
        <div
          class="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-check-circle"
            class="w-10 h-10 text-green-500"
          />
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {{ t("auth.join.welcome", "Welcome!") }}
        </h1>
        <p class="text-gray-500 mb-6">
          {{ t("auth.join.accountReady", "Your account has been set up") }}
        </p>

        <!-- User Info -->
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
          <div class="flex items-center justify-center gap-3">
            <UAvatar
              :alt="inviteData.user.name"
              size="lg"
              class="ring-2 ring-primary-500"
            />
            <div class="text-left">
              <p class="font-semibold text-gray-900 dark:text-white">
                {{ inviteData.user.name }}
              </p>
              <UBadge
                :color="inviteData.user.role === 'admin' ? 'blue' : 'gray'"
                variant="subtle"
              >
                {{ inviteData.user.role }}
              </UBadge>
            </div>
          </div>
        </div>

        <UButton color="primary" size="lg" block @click="proceedToLogin">
          {{ t("auth.join.proceedToLogin", "Proceed to Login") }}
        </UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "blank",
  auth: false,
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const invite = useInvite();
const usersComposable = useUsers();

const isLoading = ref(true);
const error = ref<string | null>(null);
const inviteData = ref<
  Awaited<ReturnType<typeof invite.parseInviteLink>>["data"] | null
>(null);

onMounted(async () => {
  // Get the invite data from URL
  const dataParam = route.query.d as string;

  if (!dataParam) {
    error.value = t("auth.join.noInviteData", "No invite data provided");
    isLoading.value = false;
    return;
  }

  // Parse the invite
  const result = await invite.parseInviteLink(dataParam);

  if (!result.success || !result.data) {
    error.value = result.error || "Invalid invite";
    isLoading.value = false;
    return;
  }

  // Import the user
  const imported = await invite.importFromInvite(result.data);

  if (!imported) {
    error.value = t("auth.join.importFailed", "Failed to set up account");
    isLoading.value = false;
    return;
  }

  // Refresh users
  await usersComposable.refreshFromNostr();

  // Success!
  inviteData.value = result.data;
  isLoading.value = false;
});

const proceedToLogin = () => {
  router.push("/auth/signin");
};
</script>
