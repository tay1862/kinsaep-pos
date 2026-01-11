<!-- components/dashboard/DashboardShopSetup.vue -->
<!-- 🏪 Shop Setup Wizard for New Users - Using unified ShopSetupWizard component -->
<script setup lang="ts">
const emit = defineEmits<{
  (e: 'complete'): void;
}>();

const handleComplete = () => {
  emit('complete');
};

const handleCancel = () => {
  // In dashboard context, cancel just completes (no navigation away)
  emit('complete');
};
</script>

<template>
  <ShopSetupWizard
    mode="initial"
    :show-templates="true"
    :show-branch="true"
    :show-marketplace="true"
    @complete="handleComplete"
    @cancel="handleCancel"
  />
</template>
