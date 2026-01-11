<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
  >
    <div class="text-center">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4"
      />
      <p class="text-gray-500">
        {{ $t("common.redirecting", "Redirecting...") }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Legacy menu page - redirects to new /order page with token
 * Old URL: /menu/[tableId]
 * New URL: /order?t=[encryptedToken]
 */
definePageMeta({
  layout: "blank",
  auth: false,
});

const route = useRoute();
const router = useRouter();
const tablesStore = useTables();

onMounted(async () => {
  const tableId = route.params.id as string;

  if (!tableId) {
    // No table ID - redirect to home
    await router.replace("/");
    return;
  }

  // Generate new secure token for this table
  const token = await tablesStore.generateTableToken(tableId);

  if (token) {
    // Redirect to new order page with token
    await router.replace(`/order?t=${token}`);
  } else {
    // Table not found or token generation failed
    await router.replace("/");
  }
});
</script>
