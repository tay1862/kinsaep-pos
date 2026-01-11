<template>
  <UContainer>
    <CommonPageHeader
      :title="$t('pos.tables.title')"
      :description="$t('pos.tables.description')"
    >
      <template #actions>
        <div class="flex gap-2">
          <UButton
            variant="outline"
            icon="i-heroicons-cog-6-tooth"
            :to="'/settings/tables'"
          >
            {{ $t("pos.tables.settings") }}
          </UButton>
          <UButton icon="i-heroicons-plus" @click="openTableModal()">
            {{ $t("pos.tables.addTable") }}
          </UButton>
        </div>
      </template>
    </CommonPageHeader>

    <!-- Floor Summary -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <CommonStatCard
        icon="i-heroicons-squares-2x2"
        icon-color="blue"
        :label="$t('pos.tables.totalTables')"
        :value="stats.total"
      />
      <CommonStatCard
        icon="i-heroicons-check-circle"
        icon-color="green"
        :label="$t('pos.tables.available')"
        :value="stats.available"
      />
      <CommonStatCard
        icon="i-heroicons-user-group"
        icon-color="blue"
        :label="$t('pos.tables.occupied')"
        :value="stats.occupied"
      />
      <CommonStatCard
        icon="i-heroicons-calendar"
        icon-color="yellow"
        :label="$t('pos.tables.reserved')"
        :value="stats.reserved"
      />
      <CommonStatCard
        icon="i-heroicons-users"
        icon-color="purple"
        :label="$t('pos.tables.totalSeats')"
        :value="stats.totalSeats"
      />
    </div>

    <!-- Floor Selector -->
    <div class="flex items-center gap-4 mb-6 overflow-x-auto pb-2">
      <UFieldGroup>
        <UButton
          :variant="!currentFloor ? 'solid' : 'outline'"
          @click="currentFloor = ''"
        >
          All
        </UButton>
        <UButton
          v-for="zone in activeZones"
          :key="zone.id"
          :variant="currentFloor === zone.id ? 'solid' : 'outline'"
          @click="currentFloor = zone.id"
        >
          {{ zone.name }}
        </UButton>
      </UFieldGroup>

      <div class="flex-1" />

      <UFieldGroup>
        <UButton
          :variant="viewMode === 'grid' ? 'solid' : 'outline'"
          icon="i-heroicons-squares-2x2"
          @click="viewMode = 'grid'"
        />
        <UButton
          :variant="viewMode === 'list' ? 'solid' : 'outline'"
          icon="i-heroicons-list-bullet"
          @click="viewMode = 'list'"
        />
      </UFieldGroup>
    </div>

    <!-- Grid View -->
    <div
      v-if="viewMode === 'grid'"
      class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
    >
      <UCard
        v-for="table in currentFloorTables"
        :key="table.id"
        class="cursor-pointer hover:shadow-lg transition-shadow relative !overflow-visible"
        :class="getTableCardClass(table)"
        @click="selectTable(table)"
      >
        <div class="text-center py-4">
          <div
            class="w-16 h-16 mx-auto rounded-lg flex items-center justify-center mb-3"
            :class="getTableIconClass(table)"
          >
            <UIcon :name="getTableIcon(table)" class="text-2xl" />
          </div>

          <!-- Actions Dropdown (Absolute Top Right) -->
          <div class="absolute top-2 right-2" @click.stop>
            <UDropdownMenu
              :items="getTableActions(table)"
              :ui="{ width: 'w-48' }"
            >
              <UButton
                variant="ghost"
                color="gray"
                icon="i-heroicons-ellipsis-vertical"
                size="xs"
                class="rounded-full"
              />
            </UDropdownMenu>
          </div>

          <p class="font-bold text-lg">{{ table.name || table.number }}</p>
          <p class="text-sm text-muted">
            {{ table.capacity }} {{ $t("pos.tables.seats") }}
          </p>

          <UBadge
            :color="getStatusColor(table.status)"
            variant="subtle"
            class="mt-2"
          >
            {{ $t(`pos.tables.status.${table.status}`) }}
          </UBadge>

          <div v-if="table.status === 'occupied'" class="mt-2">
            <!-- Timer Badge -->
            <div
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
              :class="{
                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400':
                  tablesStore.getTimerColor(
                    tablesStore.getTableOccupiedMinutes(table.id)
                  ) === 'green',
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400':
                  tablesStore.getTimerColor(
                    tablesStore.getTableOccupiedMinutes(table.id)
                  ) === 'yellow',
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400':
                  tablesStore.getTimerColor(
                    tablesStore.getTableOccupiedMinutes(table.id)
                  ) === 'red',
              }"
            >
              ⏱️
              {{
                tablesStore.formatDuration(
                  tablesStore.getTableOccupiedMinutes(table.id)
                ) || "0m"
              }}
            </div>
            <!-- Live Cost for Per-Hour Billing -->
            <div
              v-if="table.billingType === 'per_hour' && table.hourlyRate"
              class="mt-1"
            >
              <span
                class="text-sm font-bold text-primary-600 dark:text-primary-400"
              >
                💰 {{ formatRoomCost(table) }}
              </span>
            </div>
            <p v-if="table.currentOrderId" class="text-xs text-muted mt-1">
              Order #{{ table.currentOrderId.slice(-4) }}
            </p>
          </div>

          <div
            v-if="table.status === 'reserved'"
            class="mt-2 text-xs text-muted"
          >
            <p>{{ table.reservation?.customerName }}</p>
            <p>{{ formatTime(table.reservation?.time) }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- List View -->
    <UCard v-else>
      <div class="divide-y dark:divide-gray-700 divide-gray-200">
        <div
          v-for="table in currentFloorTables"
          :key="table.id"
          class="py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 px-4 -mx-4 cursor-pointer"
          @click="selectTable(table)"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg flex items-center justify-center"
              :class="getTableIconClass(table)"
            >
              <UIcon :name="getTableIcon(table)" class="text-xl" />
            </div>
            <div>
              <p class="font-medium">{{ table.name || table.number }}</p>
              <p class="text-sm text-muted">
                {{ table.capacity }} {{ $t("pos.tables.seats") }} ·
                {{ getFloorName(table.zone) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <UBadge :color="getStatusColor(table.status)" variant="subtle">
                {{ $t(`pos.tables.status.${table.status}`) }}
              </UBadge>
            </div>

            <UDropdownMenu :items="getTableActions(table)">
              <UButton variant="ghost" icon="i-heroicons-ellipsis-vertical" />
            </UDropdownMenu>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Table Detail Modal -->
    <UModal v-model:open="showDetailModal">
      <template #header>
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center"
            :class="selectedTable ? getTableIconClass(selectedTable) : ''"
          >
            <UIcon
              :name="
                selectedTable
                  ? getTableIcon(selectedTable)
                  : 'i-heroicons-squares-2x2'
              "
            />
          </div>
          <div>
            <h3 class="font-semibold">
              {{ selectedTable?.name || selectedTable?.number }}
            </h3>
            <p class="text-sm text-muted">
              {{ selectedTable?.capacity }} {{ $t("pos.tables.seats") }}
            </p>
          </div>
        </div>
      </template>
      <template #body>
        <div v-if="selectedTable" class="space-y-4">
          <!-- Status Actions -->
          <div class="flex flex-wrap gap-2">
            <UButton
              v-if="selectedTable.status === 'available'"
              color="primary"
              icon="i-heroicons-shopping-cart"
              @click="startOrder(selectedTable)"
            >
              {{ $t("pos.tables.startOrder") }}
            </UButton>

            <UButton
              v-if="selectedTable.status === 'available'"
              variant="outline"
              icon="i-heroicons-calendar"
              @click="makeReservation(selectedTable)"
            >
              {{ $t("pos.tables.reserve") }}
            </UButton>

            <UButton
              v-if="selectedTable.status === 'occupied'"
              variant="outline"
              icon="i-heroicons-plus"
              @click="addToOrder(selectedTable)"
            >
              {{ $t("pos.tables.addItems") }}
            </UButton>

            <!-- Room Checkout Button (for per-hour billing) -->
            <UButton
              v-if="
                selectedTable.status === 'occupied' &&
                selectedTable.billingType === 'per_hour'
              "
              color="purple"
              variant="soft"
              icon="i-heroicons-clock"
              @click="openCheckoutModal(selectedTable)"
            >
              {{ $t("pos.tables.checkout", "Room Checkout") }}
            </UButton>

            <UButton
              v-if="selectedTable.status === 'occupied'"
              color="success"
              icon="i-heroicons-banknotes"
              @click="processPayment(selectedTable)"
            >
              {{ $t("pos.tables.payment") }}
            </UButton>

            <!-- Simple free table action for development -->
            <UButton
              v-if="selectedTable.status !== 'available'"
              color="gray"
              variant="ghost"
              icon="i-heroicons-arrow-path"
              @click="tablesStore.freeTable(selectedTable.id)"
            >
              Free Table
            </UButton>

            <UButton
              v-if="selectedTable.status === 'reserved'"
              variant="outline"
              icon="i-heroicons-check"
              @click="seatGuests(selectedTable)"
            >
              {{ $t("pos.tables.seatGuests") }}
            </UButton>

            <UButton
              v-if="selectedTable.status === 'reserved'"
              variant="outline"
              color="error"
              icon="i-heroicons-x-mark"
              @click="cancelReservation(selectedTable)"
            >
              {{ $t("pos.tables.cancelReservation") }}
            </UButton>
          </div>

          <!-- Current Order Details -->
          <div v-if="selectedTable.currentOrder">
            <h4 class="font-medium mb-3">
              {{ $t("pos.tables.currentOrder") }}
            </h4>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-muted">{{ $t("pos.tables.customer") }}</span>
                <span>{{
                  selectedTable.currentOrder.customerName ||
                  $t("pos.tables.walkIn")
                }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">{{ $t("pos.tables.items") }}</span>
                <span>{{ selectedTable.currentOrder.items }} items</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">{{ $t("pos.tables.duration") }}</span>
                <span>{{ selectedTable.currentOrder.duration }}</span>
              </div>
              <div class="flex justify-between font-bold border-t pt-2 mt-2">
                <span>{{ $t("pos.tables.total") }}</span>
                <span>{{
                  formatCurrency(selectedTable.currentOrder.total)
                }}</span>
              </div>
            </div>
          </div>

          <!-- Reservation Details -->
          <div v-if="selectedTable.reservation">
            <h4 class="font-medium mb-3">
              {{ $t("pos.tables.reservationDetails") }}
            </h4>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-muted">{{ $t("pos.tables.customer") }}</span>
                <span>{{ selectedTable.reservation.customerName }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">{{ $t("pos.tables.phone") }}</span>
                <span>{{ selectedTable.reservation.phone }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">{{ $t("pos.tables.time") }}</span>
                <span>{{ formatTime(selectedTable.reservation.time) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">{{ $t("pos.tables.partySize") }}</span>
                <span
                  >{{ selectedTable.reservation.partySize }}
                  {{ $t("pos.tables.guests") }}</span
                >
              </div>
              <div v-if="selectedTable.reservation.notes" class="text-sm">
                <span class="text-muted">{{ $t("pos.tables.notes") }}:</span>
                <p class="mt-1">{{ selectedTable.reservation.notes }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-between">
          <div class="flex gap-2">
            <UButton
              variant="ghost"
              @click="openTableModal(selectedTable || undefined)"
            >
              {{ $t("common.edit") }}
            </UButton>
            <UButton
              v-if="selectedTable"
              variant="ghost"
              icon="i-heroicons-qr-code"
              @click="
                showQRModal = true;
                showDetailModal = false;
              "
            >
              {{ $t("pos.tables.printQR", "Print QR") }}
            </UButton>
          </div>
          <UButton variant="ghost" @click="showDetailModal = false">
            {{ $t("common.close") }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Add/Edit Table Modal -->
    <UModal v-model:open="showTableModal">
      <template #header>
        <h3 class="font-semibold">
          {{
            editingTable
              ? $t("pos.tables.editTable")
              : $t("pos.tables.addTable")
          }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="$t('pos.tables.tableNumber')">
            <UInput
              v-model="tableForm.number"
              placeholder="Auto-generated if empty"
            />
          </UFormField>

          <UFormField :label="$t('pos.tables.tableName')" required>
            <UInput
              v-model="tableForm.name"
              :placeholder="$t('pos.tables.tableNamePlaceholder')"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="$t('pos.tables.seats')" required>
              <UInput
                v-model.number="tableForm.seats"
                type="number"
                min="1"
                max="20"
              />
            </UFormField>

            <UFormField :label="$t('pos.tables.minSeats')">
              <UInput
                v-model.number="tableForm.minSeats"
                type="number"
                min="1"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="$t('pos.tables.billingType', 'Billing Type')">
              <USelect
                v-model="tableForm.billingType"
                :items="billingTypeOptions"
                value-key="value"
                label-key="label"
              />
            </UFormField>

            <UFormField
              v-if="tableForm.billingType === 'per_hour'"
              :label="$t('pos.tables.hourlyRate', 'Hourly Rate')"
            >
              <UInput
                v-model.number="tableForm.hourlyRate"
                type="number"
                min="0"
                step="1000"
              />
            </UFormField>
          </div>

          <UFormField :label="$t('pos.tables.floor')">
            <USelect
              v-model="tableForm.floorId"
              :items="activeZones"
              value-key="id"
              label-key="name"
              placeholder="Select Zone"
            />
          </UFormField>

          <UFormField :label="$t('pos.tables.shape')">
            <USelect
              v-model="tableForm.shape"
              :items="shapeOptions"
              value-key="value"
              label-key="label"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showTableModal = false">
            {{ $t("common.cancel") }}
          </UButton>
          <UButton :loading="savingTable" @click="saveTable">
            {{ editingTable ? $t("common.update") : $t("common.create") }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Reservation Modal -->
    <UModal v-model:open="showReservationModal">
      <template #header>
        <h3 class="font-semibold">
          {{ $t("pos.tables.makeReservation") }}
        </h3>
      </template>

      <template #body>
        <div class="space-y-4">
          <UFormField :label="$t('pos.tables.customer')" required>
            <UInput
              v-model="reservationForm.customerName"
              :placeholder="$t('pos.tables.customerNamePlaceholder')"
            />
          </UFormField>

          <UFormField :label="$t('pos.tables.phone')" required>
            <UInput
              v-model="reservationForm.phone"
              type="tel"
              :placeholder="$t('pos.tables.phonePlaceholder')"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="$t('pos.tables.date')" required>
              <UInput v-model="reservationForm.date" type="date" />
            </UFormField>

            <UFormField :label="$t('pos.tables.time')" required>
              <UInput v-model="reservationForm.time" type="time" />
            </UFormField>
          </div>

          <UFormField :label="$t('pos.tables.partySize')" required>
            <UInput
              v-model.number="reservationForm.partySize"
              type="number"
              min="1"
            />
          </UFormField>

          <UFormField :label="$t('pos.tables.notes')">
            <UTextarea
              v-model="reservationForm.notes"
              :placeholder="$t('pos.tables.notesPlaceholder')"
              :rows="2"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showReservationModal = false">
            {{ $t("common.cancel") }}
          </UButton>
          <UButton :loading="savingReservation" @click="saveReservation">
            {{ $t("pos.tables.confirmReservation") }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Settings Modal -->
    <UModal v-model:open="showSettingsModal">
      <template #header>
        <h3 class="font-semibold">{{ $t("pos.tables.floorSettings") }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <h4 class="font-medium">{{ $t("pos.tables.manageFloors") }}</h4>
          <div
            v-if="activeZones.length === 0"
            class="text-gray-500 text-sm italic"
          >
            No zones created yet.
          </div>
          <div
            v-for="zone in activeZones"
            :key="zone.id"
            class="flex items-center gap-2"
          >
            <UInput
              v-model="zone.name"
              class="flex-1"
              placeholder="Zone Name"
              @change="updateZoneName(zone)"
            />
            <UButton
              variant="ghost"
              color="error"
              icon="i-heroicons-trash"
              @click="removeFloor(zone.id)"
            />
          </div>

          <UButton
            variant="outline"
            icon="i-heroicons-plus"
            size="sm"
            @click="addFloor"
          >
            {{ $t("pos.tables.addFloor") }}
          </UButton>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton @click="showSettingsModal = false">
            {{ $t("common.done") }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- QR Code Modal -->
    <UModal v-model:open="showQRModal">
      <template #header>
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">
          📱 {{ selectedTable.name || selectedTable.number }} - QR Code
        </h3>
      </template>
      <template #body>
        <div class="text-center">
          <div class="bg-white p-6 rounded-xl inline-block shadow-lg mb-4">
            <img
              v-if="currentQRCodeUrl"
              :src="currentQRCodeUrl"
              :alt="`QR Code for ${selectedTable.name || selectedTable.number}`"
              class="w-64 h-64"
            />
            <div v-else class="w-64 h-64 flex items-center justify-center">
              <UIcon
                name="i-heroicons-arrow-path"
                class="w-8 h-8 animate-spin text-gray-400"
              />
            </div>
          </div>

          <p class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {{ selectedTable.name || selectedTable.number }}
          </p>
          <p class="text-sm text-gray-500 mb-4">
            {{ $t("tables.scanToOrder", "Scan to view menu & order") }}
          </p>

          <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
            <p class="text-xs text-gray-500 mb-1">
              {{ $t("tables.orderingUrl", "Menu URL") }}
            </p>
            <p
              class="text-sm font-mono text-gray-700 dark:text-gray-300 break-all"
            >
              {{ currentOrderingUrl || "Loading..." }}
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full gap-2">
          <UButton
            color="neutral"
            variant="outline"
            block
            icon="i-heroicons-clipboard-document"
            @click="copyQRUrl"
          >
            {{ $t("common.copyLink", "Copy Link") }}
          </UButton>
          <UButton
            color="primary"
            block
            icon="i-heroicons-printer"
            @click="printQR"
          >
            {{ $t("common.print", "Print") }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Room Checkout Modal -->
    <RoomCheckoutModal
      v-model:open="showCheckoutModal"
      :table="checkoutTable"
      @checkout="onRoomCheckout"
      @extend="onRoomExtend"
    />
  </UContainer>
</template>

<script setup lang="ts">

useHead({
  title: "POS Tables",
});

const ordersStore = useOrders();

// ... existing code ...

// Handlers
const openCheckoutModal = (table: any) => {
  checkoutTable.value = table;
  showCheckoutModal.value = true;
};

const onRoomCheckout = async ({
  tableId,
  roomCharge,
}: {
  tableId: string;
  roomCharge: number;
}) => {
  const table = tables.value.find((t) => t.id === tableId);
  if (!table) return;

  try {
    // 1. If no current order, create one
    let orderId = table.currentOrderId;

    if (!orderId) {
      const newOrder = await ordersStore.createOrder({
        tableId: table.id,
        tableNumber: table.number,
        type: "dine_in",
        status: "pending",
        items: [], // Will add room charge item next
      });
      orderId = newOrder.id;
      // Link order to table
      await tablesStore.linkOrder(table.id, orderId);
    }

    // 2. Add room charge as a line item
    if (orderId && roomCharge > 0) {
      await ordersStore.addOrderItem(orderId, {
        productId: "room_charge", // Special product ID for room charge
        name: t("pos.tables.roomCharge", "Room Charge"),
        price: roomCharge,
        quantity: 1,
        type: "service",
      });

      toast.add({
        title: t("common.success"),
        description: t("pos.tables.roomChargeAdded"),
        color: "green",
      });
    }

    // 3. Navigate to order for payment
    if (orderId) {
      router.push(`/orders/${orderId}`);
    }
  } catch (error) {
    console.error("Failed to checkout room:", error);
    toast.add({
      title: t("common.error"),
      description: "Failed to process room checkout",
      color: "red",
    });
  }

  showCheckoutModal.value = false;
};

const onRoomExtend = async ({
  tableId,
  minutes,
}: {
  tableId: string;
  minutes: number;
}) => {
  // Logic to extend time (could update expectedEndTime field on table)
  // For now just show a toast as the timer keeps running anyway
  toast.add({
    title: t("common.success"),
    description: `Added ${minutes} minutes to room time`,
    color: "green",
  });
};

const { t } = useI18n();
const toast = useToast();
const { format } = useCurrency();
const router = useRouter();

// Use tables composable
const tablesStore = useTables();
const { tables, activeZones } = tablesStore;

// State
const viewMode = ref<"grid" | "list">("grid");
const currentFloor = ref(""); // Now represents Zone ID
const showDetailModal = ref(false);
const showTableModal = ref(false);
const showReservationModal = ref(false);
const showSettingsModal = ref(false);
const showQRModal = ref(false);
const savingTable = ref(false);
const savingReservation = ref(false);
const selectedTable = ref<any | null>(null); // Using any safely for now as simple ref
const editingTable = ref<any | null>(null);
const reservingTable = ref<any | null>(null);
const showCheckoutModal = ref(false);
const checkoutTable = ref<any | null>(null); // Table being checked out

// Imports
import RoomCheckoutModal from "~/components/tables/RoomCheckoutModal.vue";

// Initialize
onMounted(async () => {
  await tablesStore.initialize();
  // Set default floor to first zone if available
  if (activeZones.value.length > 0 && !currentFloor.value) {
    currentFloor.value = activeZones.value[0].id;
  }
});

// Watch for zones to set initial floor
watch(
  activeZones,
  (newZones) => {
    if (newZones.length > 0 && !currentFloor.value) {
      currentFloor.value = newZones[0].id;
    }
  },
  { immediate: true }
);

// Form state
const tableForm = reactive({
  number: "",
  name: "",
  seats: 4,
  minSeats: 1,
  floorId: "",
  shape: "square" as "round" | "square" | "rectangle",
  billingType: "per_order" as "per_order" | "per_hour",
  hourlyRate: 0,
});

const reservationForm = reactive({
  customerName: "",
  phone: "",
  date: new Date().toISOString().slice(0, 10),
  time: "",
  partySize: 2,
  notes: "",
});

const shapeOptions = [
  { value: "square", label: t("tables.shapes.square", "Square") },
  { value: "round", label: t("tables.shapes.round", "Round") },
  { value: "rectangle", label: t("tables.shapes.rectangle", "Rectangle") },
  { value: "oval", label: t("tables.shapes.oval", "Oval") },
];

const billingTypeOptions = [
  { value: "per_order", label: t("pos.tables.perOrder", "Per Order") },
  { value: "per_hour", label: t("pos.tables.perHour", "Per Hour") },
];

// Computed
const currentFloorTables = computed(() => {
  // Start with all tables
  let filtered = tables.value.filter((t) => t.isActive);

  // Only filter by zone if a specific floor is selected (not empty/"all")
  if (currentFloor.value && currentFloor.value !== "") {
    filtered = filtered.filter((t) => t.zone === currentFloor.value);
  }

  return filtered.map((t) => {
    // Find active reservation
    const res = tablesStore.reservations.value.find(
      (r) =>
        r.tableId === t.id &&
        ["confirmed", "pending", "seated"].includes(r.status)
    );

    return {
      ...t,
      reservation: res
        ? {
            id: res.id,
            customerName: res.customerName,
            phone: res.customerPhone,
            time: res.reservedFor,
            partySize: res.guestCount,
            notes: res.notes,
          }
        : undefined,
      currentOrder: t.currentOrderId
        ? {
            id: t.currentOrderId,
            customerName: t.occupiedBy || "Guest",
            total: 0,
            items: 0,
            duration: t.occupiedAt
              ? Math.round(
                  (Date.now() - new Date(t.occupiedAt).getTime()) / 60000
                ) + "m"
              : "0m",
          }
        : undefined,
    };
  });
});

const stats = computed(() => ({
  total: tables.value.filter((t) => t.isActive).length,
  available: tables.value.filter((t) => t.isActive && t.status === "available")
    .length,
  occupied: tables.value.filter((t) => t.isActive && t.status === "occupied")
    .length,
  reserved: tables.value.filter((t) => t.isActive && t.status === "reserved")
    .length,
  totalSeats: tables.value
    .filter((t) => t.isActive)
    .reduce((sum, t) => sum + t.capacity, 0),
}));

// Methods
const getTableIcon = (table: any) => {
  if (table.shape === "round") return "i-heroicons-stop-circle";
  if (table.shape === "rectangle" || table.shape === "oval")
    return "i-heroicons-stop";
  return "i-heroicons-stop"; // Square default
};

const getTableIconClass = (table: any) => {
  const colors: Record<string, string> = {
    available:
      "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    occupied: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    reserved:
      "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    cleaning:
      "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
    unavailable:
      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return colors[table.status] || colors.available;
};

const getTableCardClass = (table: any) => {
  const borders: Record<string, string> = {
    available: "hover:ring-green-500",
    occupied: "ring-2 ring-red-500 hover:ring-red-600",
    reserved: "ring-1 ring-blue-500 hover:ring-blue-600",
    cleaning: "ring-1 ring-yellow-500 hover:ring-yellow-600",
    unavailable: "opacity-75",
  };
  return borders[table.status] || "";
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    available: "green",
    occupied: "red",
    reserved: "blue",
    cleaning: "yellow",
    unavailable: "gray",
  };
  return colors[status] || "gray";
};

const getFloorName = (zoneId: string) => {
  const zone = activeZones.value.find((z) => z.id === zoneId);
  return zone ? zone.name : "No Zone";
};

const formatCurrency = (value: number) => {
  return format(value);
};

// Calculate and format room cost based on occupied time and hourly rate
const formatRoomCost = (table: any) => {
  if (!table.occupiedAt || !table.hourlyRate) return format(0);

  const now = new Date();
  const startTime = new Date(table.occupiedAt);
  const hoursUsed = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  const minimumHours = table.minimumHours || 1;
  const billedHours = Math.max(Math.ceil(hoursUsed), minimumHours);
  const cost = billedHours * table.hourlyRate;

  return format(cost);
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return "";
  // Check if it's already a time string like "19:00"
  if (timeStr.includes(":") && timeStr.length <= 5) return timeStr;

  try {
    return new Date(timeStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timeStr;
  }
};

// Actions
const selectTable = (table: any) => {
  selectedTable.value = table;
  showDetailModal.value = true;
};

const openTableModal = (table?: any) => {
  editingTable.value = table || null;
  if (table) {
    tableForm.number = table.number;
    tableForm.name = table.name || "";
    tableForm.seats = table.capacity;
    tableForm.minSeats = table.minCapacity || 1;
    tableForm.shape = table.shape;
    tableForm.floorId = table.zone || "";
    tableForm.billingType = table.billingType || "per_order";
    tableForm.hourlyRate = table.hourlyRate || 0;
  } else {
    tableForm.number = "";
    tableForm.name = "";
    tableForm.seats = 4;
    tableForm.minSeats = 1;
    tableForm.shape = "square";
    tableForm.floorId = currentFloor.value || activeZones.value[0]?.id || "";
    tableForm.billingType = "per_order";
    tableForm.hourlyRate = 0;
  }
  showTableModal.value = true;
};

const saveTable = async () => {
  savingTable.value = true;
  try {
    const data = {
      number: tableForm.number || `T${tables.value.length + 1}`, // Fallback if number not manual
      name: tableForm.name,
      capacity: tableForm.seats,
      minCapacity: tableForm.minSeats,
      shape: tableForm.shape,
      zone: tableForm.floorId,
      isActive: true,
      qrOrderingEnabled: true,
      billingType: tableForm.billingType,
      hourlyRate: tableForm.hourlyRate,
      minimumHours: 1,
    };

    if (editingTable.value) {
      await tablesStore.updateTable(editingTable.value.id, data);
      toast.add({
        title: t("common.success"),
        description: t("pos.tables.updated", "Table updated"),
        color: "green",
      });
    } else {
      await tablesStore.createTable(data);
      toast.add({
        title: t("common.success"),
        description: t("pos.tables.created", "Table created"),
        color: "green",
      });
    }
    showTableModal.value = false;
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  } finally {
    savingTable.value = false;
  }
};

const deleteTable = async (table: any) => {
  if (!confirm(t("tables.confirmDelete", "Delete this table?"))) return;
  await tablesStore.deleteTable(table.id);
  toast.add({
    title: t("common.success"),
    description: t("tables.deleted", "Table deleted"),
    color: "green",
  });
};

// Status Actions
const startOrder = async (table: any) => {
  router.push(`/pos?orderType=dine_in&tableId=${table.id}`);
};

const addToOrder = async (table: any) => {
  router.push(
    `/pos?orderType=dine_in&tableId=${table.id}&orderId=${table.currentOrderId}&redirect=tables`
  );
};

const processPayment = async (table: any) => {
  // Logic to open payment modal or navigate
  toast.add({
    title: "Info",
    description: "Payment flow integration pending",
    color: "blue",
  });
};

// QR code reactive refs
const currentOrderingUrl = ref<string>("");
const currentQRCodeUrl = ref<string>("");

// Watch selected table and generate URLs
watch(
  () => selectedTable.value?.id,
  async (tableId) => {
    if (tableId) {
      currentOrderingUrl.value = await tablesStore.getTableOrderingUrl(tableId);
      currentQRCodeUrl.value = await tablesStore.generateTableQR(tableId, 250);
    } else {
      currentOrderingUrl.value = "";
      currentQRCodeUrl.value = "";
    }
  },
  { immediate: true }
);

const copyQRUrl = async () => {
  if (!selectedTable.value || !currentOrderingUrl.value) return;
  await navigator.clipboard.writeText(currentOrderingUrl.value);
  toast.add({
    title: t("common.success"),
    description: t("common.copied"),
    color: "green",
  });
};

const printQR = async () => {
  // Print logic using window.open like in settings/tables
  const table = selectedTable.value;
  if (!table) return;

  // Use cached URL or generate new one
  const qrUrl =
    currentQRCodeUrl.value ||
    (await tablesStore.generateTableQR(table.id, 400));
  const tableName = table.name || table.number;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <title>Table QR - ${tableName}</title>
        <style>
          body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: sans-serif; }
          .qr-code { width: 300px; height: 300px; }
          .table-name { font-size: 32px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <img class="qr-code" src="${qrUrl}" />
        <div class="table-name">${tableName}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
};

function makeReservation(table: any) {
  reservingTable.value = table;
  reservationForm.customerName = "";
  reservationForm.phone = "";
  reservationForm.date = new Date().toISOString().slice(0, 10);
  reservationForm.time = "";
  reservationForm.partySize = 2;
  reservationForm.notes = "";
  showDetailModal.value = false;
  showReservationModal.value = true;
}

async function saveReservation() {
  if (
    !reservationForm.customerName ||
    !reservationForm.phone ||
    !reservationForm.time
  ) {
    toast.add({ title: t("pos.tables.fillRequired"), color: "error" });
    return;
  }

  savingReservation.value = true;

  try {
    if (reservingTable.value) {
      const dateTime = new Date(
        `${reservationForm.date}T${reservationForm.time}`
      );
      await tablesStore.createReservation({
        tableId: reservingTable.value.id,
        customerName: reservationForm.customerName,
        customerPhone: reservationForm.phone,
        guestCount: reservationForm.partySize,
        reservedFor: dateTime.toISOString(),
        duration: 90,
        notes: reservationForm.notes,
      });
      // Optionally update table status if for now
      await tablesStore.reserveTable(reservingTable.value.id);
    }

    toast.add({ title: t("pos.tables.reservationCreated"), color: "success" });
    showReservationModal.value = false;
  } catch (error) {
    console.error("Failed to save reservation:", error);
    toast.add({ title: t("common.error"), color: "error" });
  } finally {
    savingReservation.value = false;
  }
}

async function seatGuests(table: any) {
  if (!table) return;
  try {
    await tablesStore.seatTable(table.id, table.reservation?.partySize || 2);
    toast.add({ title: t("pos.tables.guestsSeated"), color: "success" });
    showDetailModal.value = false;
  } catch (e) {
    toast.add({ title: t("common.error"), color: "error" });
  }
}

async function cancelReservation(table: any) {
  if (table.reservation?.id) {
    await tablesStore.cancelReservation(table.reservation.id);
    await tablesStore.updateTable(table.id, { status: "available" });
    toast.add({
      title: t("pos.tables.reservationCancelled"),
      color: "success",
    });
    showDetailModal.value = false;
  }
}

/*
 * Move / Merge Table Logic
 */
const showTableSelectionModal = ref(false);
const tableSelectionMode = ref<"move" | "merge">("move");
const sourceTableForAction = ref<any>(null);
const selectedTargetTableId = ref<string>("");

const targetTablesOptions = computed(() => {
  if (!sourceTableForAction.value) return [];

  if (tableSelectionMode.value === "move") {
    // For move, show all available tables
    return tablesStore.availableTables.value.map((t) => ({
      label: `${t.name || t.number} (${t.capacity} seats)`,
      value: t.id,
      description: t.zone
        ? tablesStore.activeZones.value.find((z) => z.id === t.zone)?.name
        : undefined,
    }));
  } else {
    // For merge, show all occupied tables except self
    return tablesStore.occupiedTables.value
      .filter((t) => t.id !== sourceTableForAction.value?.id)
      .map((t) => ({
        label: `${t.name || t.number} - Order #${
          t.currentOrderId?.slice(-4) || "??"
        }`,
        value: t.id,
        description: t.zone
          ? tablesStore.activeZones.value.find((z) => z.id === t.zone)?.name
          : undefined,
      }));
  }
});

const initiateMoveTable = (table: any) => {
  sourceTableForAction.value = table;
  tableSelectionMode.value = "move";
  selectedTargetTableId.value = "";
  showTableSelectionModal.value = true;
};

const initiateMergeBill = (table: any) => {
  sourceTableForAction.value = table;
  tableSelectionMode.value = "merge";
  selectedTargetTableId.value = "";
  showTableSelectionModal.value = true;
};

const confirmTableAction = async () => {
  if (!sourceTableForAction.value || !selectedTargetTableId.value) return;

  try {
    if (tableSelectionMode.value === "move") {
      await tablesStore.moveTable(
        sourceTableForAction.value.id,
        selectedTargetTableId.value
      );
      toast.add({
        title: t("common.success"),
        description: "Table moved successfully",
        color: "green",
      });
    } else {
      await tablesStore.mergeBill(
        sourceTableForAction.value.id,
        selectedTargetTableId.value
      );
      toast.add({
        title: t("common.success"),
        description: "Bill merged successfully",
        color: "green",
      });
    }
    showTableSelectionModal.value = false;
  } catch (e) {
    toast.add({
      title: t("common.error"),
      description: `Action failed: ${e}`,
      color: "red",
    });
  }
};

function getTableActions(table: any) {
  const actions = [];

  if (table.status === "available") {
    actions.push([
      {
        label: t("pos.tables.startOrder"),
        icon: "i-heroicons-shopping-cart",
        onSelect: () => startOrder(table),
      },
      {
        label: t("pos.tables.reserve"),
        icon: "i-heroicons-calendar",
        onSelect: () => makeReservation(table),
      },
    ]);
  }

  if (table.status === "occupied") {
    actions.push([
      {
        label: t("pos.tables.viewOrder"),
        icon: "i-heroicons-eye",
        onSelect: () => addToOrder(table),
      },
      {
        label: t("pos.tables.payment"),
        icon: "i-heroicons-banknotes",
        onSelect: () => processPayment(table),
      },
    ]);
    actions.push([
      {
        label: t("pos.tables.moveTable", "Move Table"),
        icon: "i-heroicons-arrow-right-circle",
        onSelect: () => initiateMoveTable(table),
      },
      {
        label: t("pos.tables.mergeBill", "Merge Bill"),
        icon: "i-heroicons-arrows-pointing-in",
        onSelect: () => initiateMergeBill(table),
      },
    ]);
    // Complete / Free table action
    actions.push([
      {
        label: t("pos.tables.completeOrder", "Complete Order"),
        icon: "i-heroicons-check-circle",
        color: "success" as const,
        onSelect: async () => {
          await tablesStore.freeTable(table.id);
          toast.add({
            title: t("common.success"),
            description: t("pos.tables.tableFreed", "Table is now available"),
            color: "green",
          });
        },
      },
    ]);
  }

  if (table.status === "reserved") {
    actions.push([
      {
        label: t("pos.tables.seatGuests"),
        icon: "i-heroicons-check",
        onSelect: () => seatGuests(table),
      },
      {
        label: t("pos.tables.cancelReservation"),
        icon: "i-heroicons-x-mark",
        color: "error" as const,
        onSelect: () => cancelReservation(table),
      },
    ]);
  }

  actions.push([
    {
      label: t("common.edit"),
      icon: "i-heroicons-pencil",
      onSelect: () => openTableModal(table),
    },
  ]);

  return actions;
}

async function addFloor() {
  await tablesStore.createZone({
    name: `Zone ${activeZones.value.length + 1}`,
    isActive: true,
    sortOrder: activeZones.value.length + 1,
  });
}

async function updateZoneName(zone: any) {
  if (zone && zone.id) {
    await tablesStore.updateZone(zone.id, { name: zone.name });
    toast.add({ title: t("common.success"), color: "success" });
  }
}

async function removeFloor(floorId: string) {
  if (confirm(t("common.confirmDelete"))) {
    await tablesStore.deleteZone(floorId);
  }
}

async function saveFloors() {
  toast.add({ title: t("pos.tables.floorsSaved"), color: "success" });
  showSettingsModal.value = false;
}
</script>
