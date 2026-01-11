<script setup lang="ts">
// pages/settings/tables.vue
// 🍽️ Table Management with QR Code Ordering

definePageMeta({
  middleware: ["auth"],
});

useHead({
  title: 'Settings - Tables',
});

const { t } = useI18n();
const toast = useToast();

// Tables composable
const tables = useTables();

// State
const showTableModal = ref(false);
const showQRModal = ref(false);
const showZoneModal = ref(false);
const selectedTable = ref<(typeof tables.tables.value)[number] | null>(null);
const selectedQRTable = ref<(typeof tables.tables.value)[number] | null>(null);
const selectedQRCodeUrl = ref<string>("");
const saving = ref(false);

// Form state
const tableForm = reactive({
  number: "",
  name: "",
  capacity: 4,
  minCapacity: 1,
  shape: "square" as "square" | "round" | "rectangle" | "oval",
  zone: "",
  qrOrderingEnabled: true,
  isActive: true,
});

const shapeOptions = [
  { value: "square", label: t("tables.shapes.square", "Square") },
  { value: "round", label: t("tables.shapes.round", "Round") },
  { value: "rectangle", label: t("tables.shapes.rectangle", "Rectangle") },
  { value: "oval", label: t("tables.shapes.oval", "Oval") },
];

// Initialize
onMounted(async () => {
  await tables.initialize();
});

// Open modal for new table
const openTableModal = (table?: (typeof tables.tables.value)[number]) => {
  if (table) {
    selectedTable.value = table;
    tableForm.number = table.number;
    tableForm.name = table.name || "";
    tableForm.capacity = table.capacity;
    tableForm.minCapacity = table.minCapacity || 1;
    tableForm.shape = table.shape;
    tableForm.zone = table.zone || "";
    tableForm.qrOrderingEnabled = table.qrOrderingEnabled ?? true;
    tableForm.isActive = table.isActive;
  } else {
    selectedTable.value = null;
    tableForm.number = `T${tables.tables.value.length + 1}`;
    tableForm.name = "";
    tableForm.capacity = 4;
    tableForm.minCapacity = 1;
    tableForm.shape = "square";
    tableForm.zone = "";
    tableForm.qrOrderingEnabled = true;
    tableForm.isActive = true;
  }
  showTableModal.value = true;
};

// Save table
const saveTable = async () => {
  if (!tableForm.number) {
    toast.add({
      title: t("common.error"),
      description: t("tables.numberRequired", "Table number is required"),
      color: "red",
    });
    return;
  }

  saving.value = true;
  try {
    if (selectedTable.value) {
      await tables.updateTable(selectedTable.value.id, {
        number: tableForm.number,
        name: tableForm.name || undefined,
        capacity: tableForm.capacity,
        minCapacity: tableForm.minCapacity,
        shape: tableForm.shape,
        zone: tableForm.zone || undefined,
        qrOrderingEnabled: tableForm.qrOrderingEnabled,
        isActive: tableForm.isActive,
      });
      toast.add({
        title: t("common.success"),
        description: t("tables.updated", "Table updated"),
        color: "green",
      });
    } else {
      await tables.createTable({
        number: tableForm.number,
        name: tableForm.name || undefined,
        capacity: tableForm.capacity,
        minCapacity: tableForm.minCapacity,
        shape: tableForm.shape,
        zone: tableForm.zone || undefined,
        qrOrderingEnabled: tableForm.qrOrderingEnabled,
        isActive: tableForm.isActive,
      });
      toast.add({
        title: t("common.success"),
        description: t("tables.created", "Table created"),
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
    saving.value = false;
  }
};

// Delete table
const deleteTable = async (table: (typeof tables.tables.value)[number]) => {
  if (!confirm(t("tables.confirmDelete", "Delete this table?"))) return;

  await tables.deleteTable(table.id);
  toast.add({
    title: t("common.success"),
    description: t("tables.deleted", "Table deleted"),
    color: "green",
  });
};

// Show QR code
const showQR = async (table: (typeof tables.tables.value)[number]) => {
  selectedQRTable.value = table;
  // Generate QR code data URL
  selectedQRCodeUrl.value = await tables.generateTableQR(table.id, 250);
  showQRModal.value = true;
};

// Copy QR URL
const copyQRUrl = async () => {
  if (!selectedQRTable.value) return;
  const url = tables.getTableOrderingUrl(selectedQRTable.value.id);
  await navigator.clipboard.writeText(url);
  toast.add({
    title: t("common.success"),
    description: t("common.copied", "Copied to clipboard"),
    color: "green",
  });
};

// Print QR code
const printQR = async () => {
  if (!selectedQRTable.value) return;
  const qrUrl = await tables.generateTableQR(selectedQRTable.value.id, 400);
  const tableName = selectedQRTable.value.name || selectedQRTable.value.number;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Table QR - ${tableName}</title>
        <style>
          body { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            margin: 0; 
            font-family: system-ui, sans-serif;
          }
          .qr-container {
            text-align: center;
            padding: 40px;
          }
          .qr-code { 
            width: 300px; 
            height: 300px; 
          }
          .table-name {
            font-size: 32px;
            font-weight: bold;
            margin-top: 20px;
          }
          .instructions {
            font-size: 18px;
            color: #666;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <img class="qr-code" src="${qrUrl}" alt="Table QR Code" />
          <div class="table-name">${tableName}</div>
          <div class="instructions">${t("tables.scanToOrder", "Scan to view menu & order")
      }</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
};

// Toggle QR ordering
const toggleQROrdering = async (
  table: (typeof tables.tables.value)[number]
) => {
  await tables.toggleTableQROrdering(table.id, !table.qrOrderingEnabled);
};

// Create demo data
const createDemoTables = async () => {
  await tables.createDemoData();
  toast.add({
    title: t("common.success"),
    description: t("tables.demoCreated", "Demo tables created"),
    color: "green",
  });
};

// Status badge color
type BadgeColor = "red" | "gray" | "yellow" | "green" | "blue";
const getStatusColor = (status: string): BadgeColor => {
  const colors: Record<string, BadgeColor> = {
    available: "green",
    occupied: "red",
    reserved: "blue",
    cleaning: "yellow",
    unavailable: "gray",
  };
  return colors[status] || "gray";
};

// Zone Management
const addZone = async () => {
  await tables.createZone({
    name: `Zone ${tables.activeZones.value.length + 1}`,
    isActive: true,
    sortOrder: tables.activeZones.value.length + 1,
  });
};

const updateZoneName = async (zone: any) => {
  if (zone && zone.id) {
    await tables.updateZone(zone.id, { name: zone.name });
    toast.add({ title: t("common.success"), color: "green" });
  }
};

const removeZone = async (zoneId: string) => {
  if (confirm(t("common.confirmDelete"))) {
    await tables.deleteZone(zoneId);
    toast.add({ title: t("common.success"), color: "green" });
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader :title="t('tables.title', 'Table Management')" :description="t('tables.description', 'Manage tables and QR code ordering')
      ">
      <template #right>
        <div class="flex gap-2">
          <UButton v-if="!tables.tables.value.length" color="neutral" variant="outline" icon="i-heroicons-sparkles"
            @click="createDemoTables">
            {{ t("tables.createDemo", "Create Demo Tables") }}
          </UButton>
          <UButton color="neutral" variant="outline" icon="i-heroicons-map" @click="showZoneModal = true">
            {{ t("tables.manageZones", "Manage Zones") }}
          </UButton>
          <UButton color="primary" icon="i-heroicons-plus" @click="openTableModal()">
            {{ t("tables.addTable", "Add Table") }}
          </UButton>
        </div>
      </template>
    </CommonPageHeader>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4">
      <CommonStatCard icon="i-heroicons-table-cells" icon-color="blue"
        :label="t('tables.totalTables', 'Total Tables')" :value="tables.activeTables.value.length" />
      <CommonStatCard icon="i-heroicons-users" icon-color="green" :label="t('tables.totalCapacity', 'Total Capacity')"
        :value="tables.totalCapacity.value" />
      <CommonStatCard icon="i-heroicons-qr-code" icon-color="purple" :label="t('tables.qrEnabled', 'QR Enabled')"
        :value="tables.tables.value.filter((t) => t.qrOrderingEnabled).length" />
      <CommonStatCard icon="i-heroicons-chart-bar" icon-color="yellow" :label="t('tables.occupancy', 'Occupancy')"
        :value="`${tables.occupancyRate.value}%`" />
    </div>

    <!-- Tables Grid -->
    <div class="px-4">
      <div v-if="tables.tables.value.length"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <UCard v-for="table in tables.tables.value" :key="table.id" :class="{ 'opacity-50': !table.isActive }">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-bold text-lg text-gray-900 dark:text-white">
                {{ table.name || table.number }}
              </h3>
              <p v-if="table.name" class="text-sm text-gray-500">
                {{ table.number }}
              </p>
            </div>
            <UBadge :color="getStatusColor(table.status)" :label="t(`tables.status.${table.status}`) || table.status" />
          </div>

          <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <div class="flex items-center gap-2">
              <Icon name="i-heroicons-users" class="w-4 h-4" />
              <span>{{ t("tables.capacity", "Capacity") }}:
                {{ table.capacity }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Icon name="i-heroicons-square-3-stack-3d" class="w-4 h-4" />
              <span>{{ t("tables.shape", "Shape") }}:
                {{ t(`tables.shapes.${table.shape}`) || table.shape }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Icon name="i-heroicons-qr-code" class="w-4 h-4" />
              <span>{{ t("tables.qrOrdering", "QR Ordering") }}:
                <span :class="table.qrOrderingEnabled ? 'text-green-500' : 'text-gray-400'
                  ">
                  {{
                    table.qrOrderingEnabled
                      ? t("common.enabled", "Enabled")
                      : t("common.disabled", "Disabled")
                  }}
                </span>
              </span>
            </div>
          </div>

          <div class="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            <UButton color="purple" variant="soft" size="sm" icon="i-heroicons-qr-code" @click="showQR(table)" />
            <UButton color="neutral" variant="ghost" size="sm" icon="i-heroicons-pencil"
              @click="openTableModal(table)" />
            <UButton color="red" variant="ghost" size="sm" icon="i-heroicons-trash" @click="deleteTable(table)" />
            <div class="flex-1" />
            <USwitch :model-value="table.qrOrderingEnabled" size="sm" @update:model-value="toggleQROrdering(table)" />
          </div>
        </UCard>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <div class="text-6xl mb-4">🍽️</div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {{ t("tables.noTables", "No tables yet") }}
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          {{
            t("tables.noTablesDesc", "Create tables to enable QR code ordering")
          }}
        </p>
        <div class="flex gap-2 justify-center">
          <UButton color="primary" @click="openTableModal()">
            {{ t("tables.addTable", "Add Table") }}
          </UButton>
          <UButton color="neutral" variant="outline" @click="createDemoTables">
            {{ t("tables.createDemo", "Create Demo Tables") }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Table Modal -->
    <UModal v-model:open="showTableModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              {{
                selectedTable
                  ? t("tables.editTable", "Edit Table")
                  : t("tables.addTable", "Add Table")
              }}
            </h3>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('tables.tableNumber', 'Table Number')" required>
                <UInput v-model="tableForm.number" placeholder="T1" />
              </UFormField>
              <UFormField :label="t('tables.tableName', 'Name (optional)')">
                <UInput v-model="tableForm.name" :placeholder="t('tables.namePlaceholder', 'e.g. Window Seat')
                  " />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('tables.capacity', 'Capacity')">
                <UInput v-model.number="tableForm.capacity" type="number" min="1" max="50" />
              </UFormField>
              <UFormField :label="t('tables.minCapacity', 'Min Capacity')">
                <UInput v-model.number="tableForm.minCapacity" type="number" min="1" :max="tableForm.capacity" />
              </UFormField>
            </div>

            <UFormField :label="t('tables.shape', 'Shape')">
              <USelect v-model="tableForm.shape" :items="shapeOptions" value-key="value" label-key="label" />
            </UFormField>
            <UFormField :label="t('tables.zone', 'Zone')">
              <USelect v-model="tableForm.zone" :items="[
                { id: '-', name: t('common.none', 'None') },
                ...tables.activeZones.value,
              ]" value-key="id" label-key="name" class="w-full" />
            </UFormField>

            <div class="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
              <div>
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ t("tables.qrOrdering", "QR Code Ordering") }}
                </div>
                <div class="text-sm text-gray-500">
                  {{
                    t("tables.qrOrderingDesc", "Allow customers to order by scanning QR")
                  }}
                </div>
              </div>
              <USwitch v-model="tableForm.qrOrderingEnabled" />
            </div>

            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ t("tables.active", "Active") }}
                </div>
                <div class="text-sm text-gray-500">
                  {{
                    t("tables.activeDesc", "Inactive tables are hidden from floor plan")
                  }}
                </div>
              </div>
              <USwitch v-model="tableForm.isActive" />
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="neutral" variant="outline" @click="showTableModal = false">
                {{ t("common.cancel") }}
              </UButton>
              <UButton color="primary" :loading="saving" @click="saveTable">
                {{ selectedTable ? t("common.update") : t("common.create") }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- QR Code Modal -->
    <UModal v-model:open="showQRModal">
      <template #content>
        <UCard v-if="selectedQRTable">
          <template #header>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              📱 {{ selectedQRTable.name || selectedQRTable.number }} - QR Code
            </h3>
          </template>

          <div class="text-center">
            <div class="bg-white p-6 rounded-xl inline-block shadow-lg mb-4">
              <img :src="selectedQRCodeUrl" :alt="`QR Code for ${selectedQRTable.number}`"
                class="w-64 h-64" />
            </div>

            <p class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {{ selectedQRTable.name || selectedQRTable.number }}
            </p>
            <p class="text-sm text-gray-500 mb-4">
              {{ t("tables.scanToOrder", "Scan to view menu & order") }}
            </p>

            <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
              <p class="text-xs text-gray-500 mb-1">
                {{ t("tables.orderingUrl", "Menu URL") }}
              </p>
              <p class="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
                {{ tables.getTableOrderingUrl(selectedQRTable.id) }}
              </p>
            </div>
          </div>

          <template #footer>
            <div class="flex gap-2">
              <UButton color="neutral" variant="outline" class="flex-1" icon="i-heroicons-clipboard-document"
                @click="copyQRUrl">
                {{ t("common.copyLink") }}
              </UButton>
              <UButton color="primary" class="flex-1" icon="i-heroicons-printer" @click="printQR">
                {{ t("common.print") }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Zone Management Modal -->
    <UModal v-model:open="showZoneModal">
      <template #header>
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">
          {{ t("tables.floorSettings", "Zone Settings") }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <h4 class="font-medium">
            {{ t("pos.tables.manageFloors", "Manage Zones") }}
          </h4>
          <div v-if="tables.activeZones.value.length === 0" class="text-gray-500 text-sm italic">
            No zones created yet.
          </div>
          <div v-for="zone in tables.activeZones.value" :key="zone.id" class="flex items-center gap-2">
            <UInput v-model="zone.name" class="flex-1" @change="updateZoneName(zone)" placeholder="Zone Name" />
            <UButton variant="ghost" color="error" icon="i-heroicons-trash" @click="removeZone(zone.id)" />
          </div>

          <UButton variant="outline" icon="i-heroicons-plus" size="sm" @click="addZone">
            {{ t("pos.tables.addFloor", "Add Zone") }}
          </UButton>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton @click="showZoneModal = false">
            {{ t("common.done") }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
