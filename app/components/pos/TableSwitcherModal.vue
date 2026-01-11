<!-- components/pos/TableSwitcherModal.vue -->
<script setup lang="ts">
/**
 * Table Switcher Modal
 * Switch between tables in the POS system
 */

interface Table {
  id: string;
  name: string;
  number?: string;
  status: "available" | "occupied" | "reserved" | "cleaning" | "unavailable";
  seats: number;
}

interface Props {
  open: boolean;
  tables: Table[];
  currentTableName?: string;
  tablesStore?: any; // For timer methods
  currentTime?: Date;
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "switch", table: Table): void;
  (e: "manage"): void;
}

const props = withDefaults(defineProps<Props>(), {
  currentTableName: "",
  currentTime: () => new Date(),
});

const emit = defineEmits<Emits>();

// Available tables (not occupied by others)
const availableTables = computed(() => {
  return props.tables.filter(
    (t) => t.status === "available" || t.name === props.currentTableName
  );
});

// Current table object
const currentTable = computed(() => {
  return props.tables.find((t) => t.name === props.currentTableName);
});

// Handle table selection
const handleSwitch = (table: Table) => {
  emit("switch", table);
};

// Navigate to manage tables
const handleManage = () => {
  emit("manage");
  emit("update:open", false);
};

// Close modal
const handleClose = () => {
  emit("update:open", false);
};

// Check if table is disabled
const isTableDisabled = (table: Table) => {
  return table.status === "occupied" && table.name !== props.currentTableName;
};

// Get table button classes
const getTableClasses = (table: Table) => {
  if (table.name === props.currentTableName) {
    return "bg-linear-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 ring-2 ring-amber-500/50";
  } else if (table.status === "available") {
    return "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-amber-500/50";
  } else if (table.status === "reserved") {
    return "bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-500/30";
  } else {
    return "bg-gray-100 dark:bg-gray-800/50 ring-1 ring-gray-200 dark:ring-gray-700";
  }
};

// Get table icon based on status
const getTableIcon = (table: Table) => {
  if (table.status === "reserved") return "📋";
  if (table.status === "occupied") return "🍽️";
  return "🪑";
};

// Get table name color
const getTableNameColor = (table: Table) => {
  return table.name === props.currentTableName
    ? "text-white"
    : "text-gray-900 dark:text-white";
};

// Get seats color
const getSeatsColor = (table: Table) => {
  return table.name === props.currentTableName
    ? "text-white/75"
    : "text-gray-500";
};

// Get timer color class
const getTimerColorClass = (minutes: number) => {
  if (minutes < 30) return "bg-green-500/90 text-white";
  if (minutes < 60) return "bg-yellow-500/90 text-white";
  return "bg-red-500/90 text-white";
};
</script>

<template>
  <UModal
    :open="open"
    title="Select Table"
    description="Select a table to switch to"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="p-6 max-h-[80vh] overflow-auto">
        <!-- Header -->
        <div class="flex items-center gap-3 mb-6">
          <div
            class="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center text-xl"
          >
            🍽️
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Select Table
            </h3>
            <p class="text-sm text-gray-500">
              {{ availableTables.length }} tables available
            </p>
          </div>
        </div>

        <!-- Current Table Badge -->
        <div
          v-if="currentTable"
          class="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/30"
        >
          <div
            class="flex items-center gap-2 text-emerald-700 dark:text-emerald-400"
          >
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5" />
            <span class="font-medium">Current: {{ currentTable.name }}</span>
            <span class="text-sm opacity-75"
              >({{ currentTable.seats }} seats)</span
            >
          </div>
        </div>

        <!-- Tables Grid -->
        <div
          v-if="tables.length > 0"
          class="grid grid-cols-3 sm:grid-cols-4 gap-3"
        >
          <button
            v-for="table in tables"
            :key="table.id"
            :disabled="isTableDisabled(table)"
            class="relative flex flex-col items-center gap-2 p-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            :class="getTableClasses(table)"
            @click="handleSwitch(table)"
          >
            <!-- Table Icon -->
            <div class="text-2xl">{{ getTableIcon(table) }}</div>

            <!-- Table Name -->
            <span class="font-semibold text-sm" :class="getTableNameColor(table)">
              {{ table.name }}
            </span>

            <!-- Seats -->
            <span class="text-xs" :class="getSeatsColor(table)">
              {{ table.seats }} seats
            </span>

            <!-- Status Badge -->
            <span
              v-if="
                table.status !== 'available' &&
                table.name !== currentTableName
              "
              class="absolute top-1 right-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              :class="
                table.status === 'reserved'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-500 text-white'
              "
            >
              {{ table.status === "reserved" ? "Reserved" : "In use" }}
            </span>

            <!-- Timer Badge (if tablesStore provided) -->
            <span
              v-if="
                tablesStore &&
                table.status === 'occupied' &&
                tablesStore.getTableOccupiedMinutes(table.id) > 0
              "
              class="absolute bottom-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
              :class="
                getTimerColorClass(
                  tablesStore.getTableOccupiedMinutes(table.id)
                )
              "
              :key="currentTime?.getTime()"
            >
              ⏱️
              {{ tablesStore.formatDuration(
                tablesStore.getTableOccupiedMinutes(table.id)
              ) }}
            </span>

            <!-- Current Indicator -->
            <span
              v-if="table.name === currentTableName"
              class="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg"
            >
              <UIcon name="i-heroicons-check" class="w-3 h-3" />
            </span>
          </button>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-8">
          <div class="text-4xl mb-3">🪑</div>
          <p class="text-gray-500 dark:text-gray-400 mb-2">
            No tables configured
          </p>
          <p class="text-sm text-gray-400 dark:text-gray-500">
            Go to Tables page to set up your floor plan
          </p>
          <UButton
            color="primary"
            variant="soft"
            class="mt-4"
            @click="handleManage"
          >
            Set up Tables
          </UButton>
        </div>

        <!-- Actions -->
        <div
          class="flex gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700"
        >
          <UButton
            color="neutral"
            variant="outline"
            class="flex-1"
            @click="handleClose"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            variant="soft"
            icon="i-heroicons-arrow-top-right-on-square"
            @click="handleManage"
          >
            Manage Tables
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
