<!-- components/inventory/InventoryFilters.vue -->
<script setup lang="ts">
interface Branch {
  id: string;
  name: string;
}

interface StatusOption {
  value: string;
  label: string;
}

interface Props {
  branches: Branch[];
  statusOptions: StatusOption[];
  showMoreFilters?: boolean;
}

withDefaults(defineProps<Props>(), {
  showMoreFilters: true,
});

const searchQuery = defineModel<string>('search', { default: '' });
const selectedBranch = defineModel<string>('branch', { default: 'all' });
const selectedStatus = defineModel<string>('status', { default: 'all' });

const emit = defineEmits<{
  moreFilters: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 px-4">
    <UInput
      v-model="searchQuery"
      icon="i-heroicons-magnifying-glass"
      :placeholder="t('inventory.searchPlaceholder')"
    />
    <USelect
      v-model="selectedBranch"
      :items="branches"
      value-key="id"
      label-key="name"
    />
    <USelect
      v-model="selectedStatus"
      :items="statusOptions"
      value-key="value"
      label-key="label"
    />
    <UButton
      v-if="showMoreFilters"
      color="gray"
      variant="ghost"
      icon="i-heroicons-funnel"
      :label="t('common.moreFilters')"
      @click="emit('moreFilters')"
    />
    <slot v-else />
  </div>
</template>
