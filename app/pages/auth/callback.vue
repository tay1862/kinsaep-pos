<!-- pages/auth/callback.vue -->
<!-- 🔄 OAuth Callback Handler -->
<script setup lang="ts">
definePageMeta({
  layout: 'blank',
});

const auth = useAuth();
const router = useRouter();

const status = ref<'processing' | 'success' | 'error'>('processing');
const errorMessage = ref('');

onMounted(async () => {
  try {
    const success = await auth.handleOAuthCallback();
    
    if (success) {
      status.value = 'success';
      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } else {
      status.value = 'error';
      errorMessage.value = auth.error.value || 'Authentication failed';
    }
  } catch (e) {
    status.value = 'error';
    errorMessage.value = e instanceof Error ? e.message : 'Authentication failed';
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
    <div class="text-center">
      <!-- Processing -->
      <div v-if="status === 'processing'" class="space-y-4">
        <div class="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Completing sign in...</h2>
        <p class="text-gray-600 dark:text-gray-400">Please wait while we verify your credentials</p>
      </div>

      <!-- Success -->
      <div v-else-if="status === 'success'" class="space-y-4">
        <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
          <span class="text-3xl">✓</span>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Sign in successful!</h2>
        <p class="text-gray-600 dark:text-gray-400">Redirecting to dashboard...</p>
      </div>

      <!-- Error -->
      <div v-else class="space-y-4">
        <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
          <span class="text-3xl">✕</span>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Authentication Failed</h2>
        <p class="text-gray-600 dark:text-gray-400">{{ errorMessage }}</p>
        <UButton color="primary" to="/auth/signin">
          Try Again
        </UButton>
      </div>
    </div>
  </div>
</template>
