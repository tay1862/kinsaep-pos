<!-- components/pos/CustomerModal.vue -->
<script setup lang="ts">
/**
 * Customer Modal
 * Search and select customer for the current order
 */

interface Customer {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  tier?: string;
  nostrPubkey?: string;
}

interface Props {
  open: boolean;
  customers: Customer[];
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "select", customer: Customer): void;
  (e: "create-new"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Local search state
const searchQuery = ref("");

// Filter customers based on search
const filteredCustomers = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.customers.slice(0, 8);
  }

  const query = searchQuery.value.toLowerCase().trim();
  return props.customers
    .filter((customer) => {
      const name = customer.name?.toLowerCase() || "";
      const phone = customer.phone?.toLowerCase() || "";
      const email = customer.email?.toLowerCase() || "";
      return name.includes(query) || phone.includes(query) || email.includes(query);
    })
    .slice(0, 8);
});

// Reset search when modal opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      searchQuery.value = "";
    }
  }
);

// Handle customer selection
const handleSelect = (customer: Customer) => {
  emit("select", customer);
  emit("update:open", false);
};

// Handle new customer creation
const handleCreateNew = () => {
  emit("create-new");
};

// Close modal
const handleClose = () => {
  emit("update:open", false);
};

// Get customer initials for avatar
const getInitials = (name?: string) => {
  if (!name) return "C";
  return name.slice(0, 2).toUpperCase();
};
</script>

<template>
  <UModal
    :open="open"
    title="Customer Lookup"
    description="Search for a customer"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">
            Customer Lookup
          </h3>
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            color="gray"
            @click="handleClose"
          />
        </div>

        <!-- Search Input -->
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search customers..."
          size="lg"
          autofocus
          class="mb-4 w-full"
        />

        <!-- Customer List -->
        <div class="max-h-64 overflow-y-auto space-y-2">
          <div
            v-for="customer in filteredCustomers"
            :key="customer.id"
            class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            @click="handleSelect(customer)"
          >
            <!-- Avatar -->
            <div
              class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold"
            >
              {{ getInitials(customer.name) }}
            </div>

            <!-- Customer Info -->
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-white truncate">
                {{ customer.name || "Customer" }}
              </p>
              <p class="text-sm text-gray-500 truncate">
                {{ customer.phone || customer.email }}
              </p>
            </div>

            <!-- Tier Badge -->
            <span
              v-if="customer.tier"
              class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            >
              {{ customer.tier }}
            </span>
          </div>

          <!-- Empty State -->
          <div
            v-if="filteredCustomers.length === 0"
            class="text-center py-8 text-gray-500"
          >
            No customers found
          </div>
        </div>

        <!-- Actions -->
        <div
          class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3"
        >
          <UButton
            variant="outline"
            color="gray"
            block
            @click="handleClose"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            block
            icon="i-heroicons-plus"
            @click="handleCreateNew"
          >
            New Customer
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
