<template>
  <ShopSetupWizard
    :mode="isNewWorkspace ? 'workspace' : 'initial'"
    :show-templates="true"
    :show-branch="true"
    :show-marketplace="true"
    @complete="handleComplete"
    @cancel="handleCancel"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'blank',
});

const router = useRouter();
const route = useRoute();
const setupCheck = useSetupCheck();

const isNewWorkspace = computed(() => route.query.new === 'true');

const handleComplete = () => {
  // Mark setup as complete so navigation shows
  setupCheck.setSetupComplete(true);
  
  if (isNewWorkspace.value) {
    router.push('/settings/workspaces');
  } else {
    router.push('/');
  }
};

const handleCancel = () => {
  if (isNewWorkspace.value) {
    router.push('/settings/workspaces');
  } else {
    router.push('/');
  }
};
</script>
