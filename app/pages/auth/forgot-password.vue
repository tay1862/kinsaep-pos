<!-- pages/auth/forgot-password.vue -->
<!-- 🔑 Forgot Password Page -->
<script setup lang="ts">
definePageMeta({
  layout: "blank",
});

const email = ref("");
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const error = ref("");

const handleSubmit = async () => {
  if (!email.value) return;

  isSubmitting.value = true;
  error.value = "";

  try {
    // Call Hasura Auth password reset endpoint
    const response = await fetch(
      `${
        process.env.HASURA_AUTH_URL || "http://localhost:4000"
      }/user/password/reset`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.value }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Failed to send reset email");
    }

    isSubmitted.value = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Failed to send reset email";
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col justify-center"
  >
    <div class="sm:mx-auto sm:w-full sm:max-w-md px-4">
      <!-- Header -->
      <div class="text-center mb-8">
        <div
          class="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <span class="text-3xl">🔑</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Forgot Password?
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          No worries! Enter your email and we'll send you a reset link.
        </p>
      </div>

      <!-- Card -->
      <div
        class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6"
      >
        <!-- Success State -->
        <div v-if="isSubmitted" class="text-center py-4">
          <div
            class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <span class="text-3xl">✅</span>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Check your email
          </h3>
          <p class="text-gray-600 dark:text-gray-400 text-sm mb-4">
            We've sent a password reset link to<br />
            <strong class="text-gray-900 dark:text-white">{{ email }}</strong>
          </p>
          <NuxtLinkLocale to="/auth/signin">
            <UButton color="primary"> Back to Sign In </UButton>
          </NuxtLinkLocale>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Error -->
          <div
            v-if="error"
            class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
          >
            {{ error }}
          </div>

          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >Email address</label
            >
            <UInput
              v-model="email"
              type="email"
              placeholder="you@example.com"
              size="lg"
              required
            />
          </div>

          <UButton
            type="submit"
            block
            size="lg"
            color="primary"
            :loading="isSubmitting"
          >
            Send Reset Link
          </UButton>
        </form>
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
