<template>
  <div class="h-screen">
    <slot />
  </div>
</template>

<script setup lang="ts">
const { initPosAlerts } = useNotifications();
const company = useCompany();

onMounted(async () => {
  // Load company code first (required for POS alerts subscription)
  // This will auto-migrate old 8-char hashes to new 16-char format
  await company.loadCompanyCode();

  // Initialize POS alerts for cross-device notifications
  // Enables: kitchen status updates, waiter calls, bill requests via Nostr
  initPosAlerts();
});
</script>

<style scoped></style>
