<script setup lang="ts">
/**
 * 🚚 DELIVERY MANAGEMENT PAGE
 * Track deliveries with Kanban-style board
 */

import type { Delivery, Driver, DeliveryStatus } from "~/types";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const toast = useToast();
const delivery = useDelivery();
const ordersStore = useOrders();

// Initialize
onMounted(async () => {
  await Promise.all([delivery.init(), ordersStore.init()]);
});

// UI State
const activeTab = ref<"board" | "list" | "drivers">("board");
const showDeliveryModal = ref(false);
const showDriverModal = ref(false);
const showAssignModal = ref(false);
const selectedDelivery = ref<Delivery | null>(null);
const selectedDriver = ref<Driver | null>(null);
const saving = ref(false);

// Kanban columns
const kanbanColumns = computed(() => [
  {
    id: "pending",
    title: t("delivery.status.pending", "Pending"),
    icon: "📦",
    color: "yellow",
    items: delivery.deliveries.value.filter((d) => d.status === "pending"),
  },
  {
    id: "assigned",
    title: t("delivery.status.assigned", "Assigned"),
    icon: "👤",
    color: "blue",
    items: delivery.deliveries.value.filter((d) => d.status === "assigned"),
  },
  {
    id: "picked_up",
    title: t("delivery.status.pickedUp", "Picked Up"),
    icon: "📤",
    color: "indigo",
    items: delivery.deliveries.value.filter((d) => d.status === "picked_up"),
  },
  {
    id: "in_transit",
    title: t("delivery.status.inTransit", "In Transit"),
    icon: "🚚",
    color: "purple",
    items: delivery.deliveries.value.filter((d) => d.status === "in_transit"),
  },
  {
    id: "delivered",
    title: t("delivery.status.delivered", "Delivered"),
    icon: "✅",
    color: "green",
    items: delivery.deliveries.value
      .filter((d) => d.status === "delivered")
      .slice(0, 10),
  },
]);

// Driver form
const driverForm = ref({
  name: "",
  phone: "",
  email: "",
  vehicleType: "motorcycle" as "motorcycle" | "car" | "bicycle" | "walk",
  vehiclePlate: "",
});

// Get next status for bump action
function getNextStatus(current: DeliveryStatus): DeliveryStatus | null {
  const flow: Record<string, DeliveryStatus> = {
    pending: "assigned",
    assigned: "picked_up",
    picked_up: "in_transit",
    in_transit: "delivered",
  };
  return flow[current] || null;
}

// Actions
async function bumpDelivery(item: Delivery) {
  const nextStatus = getNextStatus(item.status);
  if (!nextStatus) return;

  if (nextStatus === "assigned" && !item.driverId) {
    // Open assign driver modal
    selectedDelivery.value = item;
    showAssignModal.value = true;
    return;
  }

  await delivery.updateDeliveryStatus(item.id, nextStatus);
  toast.add({
    title: t("common.success"),
    description: `Status updated to ${nextStatus}`,
    color: "success",
    icon: "i-heroicons-check-circle",
  });
}

async function assignDriverToDelivery(deliveryId: string, driverId: string) {
  saving.value = true;
  try {
    await delivery.assignDriver(deliveryId, driverId);
    showAssignModal.value = false;
    toast.add({
      title: t("common.success"),
      description:
        t("delivery.driverAssigned", "Driver assigned successfully"),
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (e) {
    toast.add({
      title: t("common.error"),
      description: String(e),
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}

async function cancelDeliveryAction(item: Delivery) {
  if (!confirm(t("delivery.confirmCancel", "Cancel this delivery?"))) return;

  await delivery.cancelDelivery(item.id, "Cancelled by user");
  toast.add({
    title: t("common.success"),
    description: t("delivery.cancelled", "Delivery cancelled"),
    color: "warning",
    icon: "i-heroicons-x-circle",
  });
}

function openDriverModal(driver?: Driver) {
  if (driver) {
    selectedDriver.value = driver;
    driverForm.value = {
      name: driver.name,
      phone: driver.phone,
      email: driver.email || "",
      vehicleType: driver.vehicleType || "motorcycle",
      vehiclePlate: driver.vehiclePlate || "",
    };
  } else {
    selectedDriver.value = null;
    driverForm.value = {
      name: "",
      phone: "",
      email: "",
      vehicleType: "motorcycle",
      vehiclePlate: "",
    };
  }
  showDriverModal.value = true;
}

async function saveDriver() {
  if (!driverForm.value.name || !driverForm.value.phone) {
    toast.add({
      title: t("common.error"),
      description: t("delivery.validation.namePhoneRequired", "Name and phone are required"),
      color: "error",
    });
    return;
  }

  saving.value = true;
  try {
    if (selectedDriver.value) {
      await delivery.updateDriver(selectedDriver.value.id, driverForm.value);
      toast.add({
        title: t("common.success"),
        description: t("delivery.driverUpdated", "Driver updated"),
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    } else {
      await delivery.addDriver(driverForm.value);
      toast.add({
        title: t("common.success"),
        description: t("delivery.driverAdded", "Driver added"),
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    }
    showDriverModal.value = false;
  } catch (e) {
    toast.add({
      title: t("common.error"),
      description: String(e),
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}

async function deleteDriverAction(driver: Driver) {
  if (!confirm(t("delivery.confirmDeleteDriver", "Delete this driver?")))
    return;

  await delivery.deleteDriver(driver.id);
  toast.add({
    title: t("common.success"),
    description: t("delivery.driverDeleted", "Driver removed"),
    color: "warning",
  });
}

// Helpers
function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getVehicleIcon(type?: string): string {
  switch (type) {
    case "motorcycle":
      return "🏍️";
    case "car":
      return "🚗";
    case "bicycle":
      return "🚲";
    case "walk":
      return "🚶";
    default:
      return "🚚";
  }
}

type BadgeColor =
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "green"
  | "blue"
  | "indigo"
  | "purple"
  | "gray"
  | "primary";

function getStatusColor(status: DeliveryStatus): BadgeColor {
  const colors: Record<string, BadgeColor> = {
    pending: "yellow",
    assigned: "blue",
    picked_up: "indigo",
    in_transit: "purple",
    delivered: "green",
    cancelled: "gray",
    failed: "red",
  };
  return colors[status] || "gray";
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center px-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          🚚 {{ t("delivery.title", "Delivery") }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          {{ t("delivery.description", "Track and manage deliveries") }}
        </p>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 px-4">
      <CommonStatCard
        icon="i-heroicons-inbox-stack"
        icon-color="yellow"
        :label="t('delivery.pending', 'Pending')"
        :value="delivery.stats.value.pending"
      />
      <CommonStatCard
        icon="i-heroicons-truck"
        icon-color="purple"
        :label="t('delivery.inTransit', 'In Transit')"
        :value="delivery.stats.value.inTransit"
      />
      <CommonStatCard
        icon="i-heroicons-check-circle"
        icon-color="green"
        :label="t('delivery.delivered', 'Delivered')"
        :value="delivery.stats.value.completed"
      />
      <CommonStatCard
        icon="i-heroicons-user-group"
        icon-color="blue"
        :label="t('delivery.drivers', 'Drivers')"
        :value="delivery.stats.value.totalDrivers"
      />
      <CommonStatCard
        icon="i-heroicons-user-plus"
        icon-color="green"
        :label="t('delivery.available', 'Available')"
        :value="delivery.stats.value.availableDrivers"
      />
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 px-4">
      <UButton
        :color="activeTab === 'board' ? 'primary' : 'neutral'"
        :variant="activeTab === 'board' ? 'solid' : 'ghost'"
        icon="i-heroicons-view-columns"
        :label="t('delivery.board', 'Board')"
        @click="activeTab = 'board'"
      />
      <UButton
        :color="activeTab === 'list' ? 'primary' : 'neutral'"
        :variant="activeTab === 'list' ? 'solid' : 'ghost'"
        icon="i-heroicons-list-bullet"
        :label="t('delivery.list', 'List')"
        @click="activeTab = 'list'"
      />
      <UButton
        :color="activeTab === 'drivers' ? 'primary' : 'neutral'"
        :variant="activeTab === 'drivers' ? 'solid' : 'ghost'"
        icon="i-heroicons-user-group"
        :label="t('delivery.drivers', 'Drivers')"
        @click="activeTab = 'drivers'"
      />
    </div>

    <!-- Kanban Board -->
    <template v-if="activeTab === 'board'">
      <div class="px-4 overflow-x-auto">
        <div class="flex gap-4 pb-4" style="min-width: max-content">
          <div
            v-for="column in kanbanColumns"
            :key="column.id"
            class="w-72 flex-shrink-0"
          >
            <!-- Column Header -->
            <div
              class="flex items-center gap-2 p-3 rounded-t-xl"
              :class="`bg-${column.color}-100 dark:bg-${column.color}-900/30`"
            >
              <span class="text-lg">{{ column.icon }}</span>
              <span class="font-semibold text-gray-900 dark:text-white">{{
                column.title
              }}</span>
              <UBadge
                :color="column.color as BadgeColor"
                size="sm"
                :label="String(column.items.length)"
              />
            </div>

            <!-- Column Items -->
            <div
              class="bg-gray-50 dark:bg-gray-900 rounded-b-xl p-2 space-y-2 min-h-[300px]"
            >
              <div
                v-for="item in column.items"
                :key="item.id"
                class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <!-- Order ID & Time -->
                <div class="flex justify-between items-start mb-2">
                  <span class="text-xs font-mono text-gray-500">
                    #{{ item.orderId?.slice(-6).toUpperCase() }}
                  </span>
                  <span class="text-xs text-gray-400">{{
                    formatTime(item.createdAt)
                  }}</span>
                </div>

                <!-- Customer -->
                <div class="font-medium text-gray-900 dark:text-white mb-1">
                  {{ item.customerName }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  📍 {{ item.address }}
                </div>

                <!-- Driver -->
                <div
                  v-if="item.driver"
                  class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2"
                >
                  <span>{{ getVehicleIcon(item.driver.vehicleType) }}</span>
                  <span>{{ item.driver.name }}</span>
                </div>

                <!-- Actions -->
                <div class="flex gap-1 mt-2">
                  <UButton
                    v-if="
                      item.status !== 'delivered' && item.status !== 'cancelled'
                    "
                    size="xs"
                    :color="
                      getStatusColor(getNextStatus(item.status) || item.status)
                    "
                    block
                    @click="bumpDelivery(item)"
                  >
                    {{
                      item.status === "pending"
                        ? "Assign"
                        : item.status === "assigned"
                        ? "Pick Up"
                        : item.status === "picked_up"
                        ? "Start"
                        : item.status === "in_transit"
                        ? "Complete"
                        : "Next"
                    }}
                  </UButton>
                  <UButton
                    v-if="
                      item.status !== 'delivered' && item.status !== 'cancelled'
                    "
                    size="xs"
                    color="red"
                    variant="ghost"
                    icon="i-heroicons-x-mark"
                    @click="cancelDeliveryAction(item)"
                  />
                </div>
              </div>

              <!-- Empty State -->
              <div
                v-if="column.items.length === 0"
                class="text-center py-8 text-gray-400"
              >
                <div class="text-2xl mb-1">{{ column.icon }}</div>
                <div class="text-sm">No deliveries</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- List View -->
    <template v-if="activeTab === 'list'">
      <div class="px-4">
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          <table class="w-full">
            <thead>
              <tr
                class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                <th
                  class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  Order
                </th>
                <th
                  class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  Customer
                </th>
                <th
                  class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  Address
                </th>
                <th
                  class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  Driver
                </th>
                <th
                  class="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  Status
                </th>
                <th
                  class="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400"
                >
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in delivery.deliveries.value"
                :key="item.id"
                class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="py-3 px-4 font-mono text-sm">
                  #{{ item.orderId?.slice(-6).toUpperCase() }}
                </td>
                <td class="py-3 px-4">
                  <div class="font-medium text-gray-900 dark:text-white">
                    {{ item.customerName }}
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ item.customerPhone }}
                  </div>
                </td>
                <td
                  class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate"
                >
                  {{ item.address }}
                </td>
                <td class="py-3 px-4">
                  <span v-if="item.driver" class="flex items-center gap-1">
                    {{ getVehicleIcon(item.driver.vehicleType) }}
                    {{ item.driver.name }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="py-3 px-4 text-center">
                  <UBadge
                    :color="getStatusColor(item.status)"
                    :label="item.status"
                    variant="subtle"
                  />
                </td>
                <td class="py-3 px-4 text-right text-sm text-gray-500">
                  {{ formatDate(item.createdAt) }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div
            v-if="delivery.deliveries.value.length === 0"
            class="text-center py-12"
          >
            <div class="text-6xl mb-4">🚚</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {{ t("delivery.noDeliveries", "No deliveries yet") }}
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
              {{
                t("delivery.noDeliveriesDesc", "Deliveries will appear when orders are placed for delivery")
              }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- Drivers Tab -->
    <template v-if="activeTab === 'drivers'">
      <div class="overflow-x-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ t("delivery.manageDrivers", "Manage Drivers") }}
          </h2>
          <UButton
            color="primary"
            icon="i-heroicons-plus"
            :label="t('delivery.addDriver', 'Add Driver')"
            @click="openDriverModal()"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="driver in delivery.activeDrivers.value"
            :key="driver.id"
            class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                :class="
                  driver.isAvailable
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-gray-100 dark:bg-gray-700'
                "
              >
                {{ getVehicleIcon(driver.vehicleType) }}
              </div>
              <div class="flex-1">
                <div class="font-semibold text-gray-900 dark:text-white">
                  {{ driver.name }}
                </div>
                <div class="text-sm text-gray-500">{{ driver.phone }}</div>
                <div class="flex items-center gap-2 mt-2">
                  <UBadge
                    :color="driver.isAvailable ? 'green' : 'gray'"
                    :label="driver.isAvailable ? 'Available' : 'Busy'"
                    size="xs"
                  />
                  <span class="text-xs text-gray-400">
                    {{ driver.totalDeliveries || 0 }} deliveries
                  </span>
                </div>
              </div>
              <div class="flex gap-1">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-pencil"
                  @click="openDriverModal(driver)"
                />
                <UButton
                  color="red"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-trash"
                  @click="deleteDriverAction(driver)"
                />
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="delivery.activeDrivers.value.length === 0"
            class="col-span-full text-center py-12"
          >
            <div class="text-6xl mb-4">👤</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {{ t("delivery.noDrivers", "No drivers yet") }}
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-4">
              {{
                t("delivery.addFirstDriver", "Add your first delivery driver")
              }}
            </p>
            <UButton
              color="primary"
              :label="t('delivery.addDriver', 'Add Driver')"
              @click="openDriverModal()"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Driver Modal -->
    <UModal v-model:open="showDriverModal" :overlay="true">
      <template #content>
        <UCard class="max-w-md">
          <template #header>
            <div class="flex items-center gap-3">
              <span class="text-2xl">👤</span>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{
                  selectedDriver
                    ? t("delivery.editDriver")
                    : t("delivery.addDriver", "Add Driver")
                }}
              </h3>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField :label="t('common.name', 'Name')" required>
              <UInput v-model="driverForm.name" placeholder="Driver name" />
            </UFormField>

            <UFormField :label="t('common.phone', 'Phone')" required>
              <UInput v-model="driverForm.phone" placeholder="Phone number" />
            </UFormField>

            <UFormField :label="t('common.email', 'Email')">
              <UInput
                v-model="driverForm.email"
                type="email"
                placeholder="Email address"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('delivery.vehicleType', 'Vehicle')">
                <USelect
                  v-model="driverForm.vehicleType"
                  :items="[
                    { value: 'motorcycle', label: '🏍️ Motorcycle' },
                    { value: 'car', label: '🚗 Car' },
                    { value: 'bicycle', label: '🚲 Bicycle' },
                    { value: 'walk', label: '🚶 Walk' },
                  ]"
                  value-key="value"
                  label-key="label"
                />
              </UFormField>

              <UFormField :label="t('delivery.vehiclePlate', 'Plate')">
                <UInput
                  v-model="driverForm.vehiclePlate"
                  placeholder="License plate"
                />
              </UFormField>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                :label="t('common.cancel')"
                @click="showDriverModal = false"
              />
              <UButton
                color="primary"
                :label="t('common.save')"
                :loading="saving"
                @click="saveDriver"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Assign Driver Modal -->
    <UModal v-model:open="showAssignModal" :overlay="true">
      <template #content>
        <UCard class="max-w-md">
          <template #header>
            <div class="flex items-center gap-3">
              <span class="text-2xl">👤</span>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t("delivery.assignDriver", "Assign Driver") }}
              </h3>
            </div>
          </template>

          <div class="space-y-3">
            <div
              v-for="driver in delivery.availableDrivers.value"
              :key="driver.id"
              class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
              @click="
                assignDriverToDelivery(selectedDelivery?.id || '', driver.id)
              "
            >
              <div
                class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xl"
              >
                {{ getVehicleIcon(driver.vehicleType) }}
              </div>
              <div class="flex-1">
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ driver.name }}
                </div>
                <div class="text-sm text-gray-500">{{ driver.phone }}</div>
              </div>
              <UIcon
                name="i-heroicons-chevron-right"
                class="w-5 h-5 text-gray-400"
              />
            </div>

            <div
              v-if="delivery.availableDrivers.value.length === 0"
              class="text-center py-8 text-gray-500"
            >
              {{ t("delivery.noAvailableDrivers", "No available drivers") }}
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                color="neutral"
                variant="ghost"
                :label="t('common.cancel')"
                @click="showAssignModal = false"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
