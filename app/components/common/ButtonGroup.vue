<!-- components/common/ButtonGroup.vue -->
<script setup lang="ts">
interface ButtonItem {
  value: string;
  label: string;
  icon?: string;
  indicator?: {
    show: boolean;
    activeClass?: string;
    inactiveClass?: string;
  };
}

interface Props {
  items: ButtonItem[];
  size?: 'xs' | 'sm' | 'md';
}

withDefaults(defineProps<Props>(), {
  size: 'xs',
});

const modelValue = defineModel<string>({ required: true });

const sizeClasses = {
  xs: 'px-3 py-1.5 text-xs',
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-base',
};
</script>

<template>
  <div class="flex p-1 rounded-lg bg-gray-100 dark:bg-gray-800 gap-1">
    <button
      v-for="item in items"
      :key="item.value"
      :class="[
        sizeClasses[size],
        'font-medium rounded-md transition-all relative',
        modelValue === item.value
          ? 'bg-primary-500 text-white shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
      ]"
      @click="modelValue = item.value"
    >
      <span class="flex items-center gap-1">
        <!-- Handle emoji vs icon identifiers -->
        <span v-if="item.icon && !item.icon.startsWith('i-')" class="text-sm">{{ item.icon }}</span>
        <Icon v-else-if="item.icon" :name="item.icon" class="w-4 h-4" />
        <span
          v-if="item.indicator?.show"
          class="w-1.5 h-1.5 rounded-full"
          :class="modelValue === item.value 
            ? (item.indicator.activeClass || 'bg-white') 
            : (item.indicator.inactiveClass || 'bg-green-500')"
        />
        {{ item.label }}
      </span>
    </button>
  </div>
</template>
