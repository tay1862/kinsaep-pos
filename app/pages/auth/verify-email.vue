<!-- pages/auth/verify-email.vue -->
<!-- ✉️ Email Verification Page -->
<script setup lang="ts">
definePageMeta({
  layout: "blank",
});

const router = useRouter();

const resendCooldown = ref(0);
const isResending = ref(false);

const resendEmail = async () => {
  if (resendCooldown.value > 0) return;

  isResending.value = true;

  try {
    // Call resend verification email API
    // await auth.resendVerificationEmail();

    // Start cooldown
    resendCooldown.value = 60;
    const interval = setInterval(() => {
      resendCooldown.value--;
      if (resendCooldown.value <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  } catch {
    // Handle error
  } finally {
    isResending.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col justify-center"
  >
    <div class="sm:mx-auto sm:w-full sm:max-w-md px-4">
      <!-- Illustration -->
      <div class="text-center mb-8">
        <div
          class="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <span class="text-5xl">✉️</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Check your email
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          We've sent a verification link to your email address. Please click the
          link to verify your account.
        </p>
      </div>

      <!-- Card -->
      <div
        class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6"
      >
        <div class="space-y-4">
          <!-- Instructions -->
          <div class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>📧 Check your inbox (and spam folder)</p>
            <p>🔗 Click the verification link</p>
            <p>✅ Come back here to sign in</p>
          </div>

          <div class="border-t border-gray-200 dark:border-gray-800 pt-4">
            <p class="text-sm text-gray-500 mb-3">Didn't receive the email?</p>
            <UButton
              block
              color="neutral"
              variant="outline"
              :loading="isResending"
              :disabled="resendCooldown > 0"
              @click="resendEmail"
            >
              {{
                resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend verification email"
              }}
            </UButton>
          </div>
        </div>
      </div>

      <!-- Back to Sign In -->
      <div class="mt-6 text-center">
        <NuxtLinkLocale
          to="/auth/signin"
          class="text-amber-500 hover:text-amber-400 text-sm"
        >
          ← Back to Sign In
        </NuxtLinkLocale>
      </div>
    </div>
  </div>
</template>
