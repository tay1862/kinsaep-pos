<!-- pages/inventory/index.vue -->
<script setup lang="ts">
import type { SupplierFormData } from "~/components/inventory/SupplierModal.vue";
import type { POFormData } from "~/components/inventory/PurchaseOrderModal.vue";
import type { AddStockFormData } from "~/components/inventory/AddStockModal.vue";
import type { StockLot } from "~/types";

definePageMeta({
  middleware: ["auth"],
});

useHead({
  title: 'Inventory'
})

const { t } = useI18n();
const toast = useToast();

// ============================================
// 📦 INVENTORY PAGE - Connected to Dexie + Nostr
// With Stock Lot/Batch & Expiry Tracking
// ============================================

// Permissions
const { canEditInventory, canAdjustStock } = usePermissions();

// Use real inventory store with Nostr sync
const inventory = useInventory();

// Stock Lots composable
const stockLots = useStockLots();

// Get data from composable
const inventoryItems = computed(() => inventory.inventoryItems.value);
const stockMovements = computed(() => inventory.stockMovements.value);
const suppliers = computed(() => inventory.suppliers.value);
const purchaseOrders = computed(() => inventory.purchaseOrders.value);

// Stock Lot data
const stockLotSummary = computed(() => stockLots.summary.value);
const expiryAlertCount = computed(() => stockLots.expiryAlerts.value.length);

// Filters
const searchQuery = ref("");
const selectedBranch = ref("all");
const selectedStatus = ref("all");
const activeTab = ref("inventory");

// Dynamic branches from DB (with "All Branches" option)
const branches = computed(() => [
  { id: "all", name: t("common.allBranches", "All Branches") },
  ...inventory.branches.value.map((b) => ({ id: b.id, name: b.name })),
]);

const statusOptions = computed(() => [
  { value: "all", label: t("common.all", "All") },
  { value: "in-stock", label: t("inventory.inStock", "In Stock") },
  { value: "low-stock", label: t("inventory.lowStock", "Low Stock") },
  { value: "out-of-stock", label: t("inventory.outOfStock", "Out of Stock") },
]);

// Computed
const filteredInventory = computed(() => {
  return inventoryItems.value.filter((item) => {
    const matchesSearch =
      item.productName
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesBranch =
      selectedBranch.value === "all" || item.branchId === selectedBranch.value;
    const matchesStatus =
      selectedStatus.value === "all" || item.status === selectedStatus.value;
    return matchesSearch && matchesBranch && matchesStatus;
  });
});

// Stats from composable
const totalInventoryValue = computed(() => inventory.totalInventoryValue.value);
const lowStockCount = computed(() => inventory.lowStockCount.value);

// Modal states
const showAdjustModal = ref(false);
const showTransferModal = ref(false);
const showAddStockModal = ref(false);
const showSupplierModal = ref(false);
const showPurchaseOrderModal = ref(false);
const showReceiveStockModal = ref(false);

// Type from composable
type InventoryItem = (typeof inventoryItems.value)[number];
const selectedItem = ref<InventoryItem | null>(null);
const selectedLot = ref<StockLot | null>(null);
const adjusting = ref(false);
const editingSupplier = ref<(typeof suppliers.value)[number] | null>(null);
const editingPO = ref<(typeof purchaseOrders.value)[number] | null>(null);

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
  }).format(amount);
};

const getStatusColor = (
  status: string
): "green" | "yellow" | "red" | "blue" | "gray" => {
  const colors: Record<string, "green" | "yellow" | "red" | "blue" | "gray"> = {
    "in-stock": "green",
    "low-stock": "yellow",
    "out-of-stock": "red",
    overstocked: "blue",
  };
  return colors[status] || "gray";
};

const openAdjustModal = (item: InventoryItem) => {
  selectedItem.value = item;
  showAdjustModal.value = true;
};

const openTransferModal = (item: InventoryItem) => {
  selectedItem.value = item;
  showTransferModal.value = true;
};

// ============================================
// 📝 MODAL HANDLERS
// ============================================

const handleAdjustment = async (data: {
  quantity: number;
  type: "in" | "out" | "adjustment";
  reason: string;
}) => {
  if (!selectedItem.value) return;

  adjusting.value = true;
  try {
    let adjustment = data.quantity;
    let reason:
      | "purchase"
      | "sale"
      | "adjustment"
      | "waste"
      | "return"
      | "count" = "adjustment";

    if (data.type === "in") {
      reason = "purchase";
    } else if (data.type === "out") {
      adjustment = -adjustment;
      reason = "sale";
    }

    const success = await inventory.adjustStock(
      selectedItem.value.productId,
      selectedItem.value.branchId,
      adjustment,
      reason,
      data.reason
    );

    if (success) {
      toast.add({
        title: t("inventory.stockAdjusted", "Stock Adjusted"),
        description: `${selectedItem.value.productName} stock updated`,
        icon: "i-heroicons-check-circle",
        color: "green",
      });
      showAdjustModal.value = false;
    } else {
      toast.add({
        title: t("common.error", "Error"),
        description: inventory.error.value || "Failed to adjust stock",
        icon: "i-heroicons-exclamation-circle",
        color: "red",
      });
    }
  } finally {
    adjusting.value = false;
  }
};

const handleTransfer = async (data: {
  quantity: number;
  toBranch: string;
  notes: string;
}) => {
  if (!selectedItem.value) return;

  adjusting.value = true;
  try {
    const success = await inventory.transferStock(
      selectedItem.value.productId,
      selectedItem.value.branchId,
      data.toBranch,
      data.quantity,
      data.notes
    );

    if (success) {
      toast.add({
        title: t("inventory.stockTransferred", "Stock Transferred"),
        description: `${data.quantity} units transferred`,
        icon: "i-heroicons-check-circle",
        color: "green",
      });
      showTransferModal.value = false;
    } else {
      toast.add({
        title: t("common.error", "Error"),
        description: inventory.error.value || "Failed to transfer stock",
        icon: "i-heroicons-exclamation-circle",
        color: "red",
      });
    }
  } finally {
    adjusting.value = false;
  }
};

const handleAddStock = async (data: AddStockFormData) => {
  if (!data.productId || data.quantity <= 0) {
    toast.add({
      title: t("common.error", "Error"),
      description:
        t("inventory.selectProductAndQuantity", "Please select a product and enter quantity"),
      icon: "i-heroicons-exclamation-circle",
      color: "red",
    });
    return;
  }

  adjusting.value = true;
  try {
    // Add stock to inventory
    const success = await inventory.addStock(
      data.productId,
      data.quantity,
      data.branchId,
      data.notes
    );

    if (success) {
      // If lot tracking info provided, create a stock lot
      if (data.lotNumber || data.expiryDate) {
        const product = inventoryItems.value.find(
          (item) => item.productId === data.productId
        );

        await stockLots.createStockLot({
          productId: data.productId,
          branchId: data.branchId || "main",
          lotNumber: data.lotNumber || `LOT-${Date.now()}`,
          quantity: data.quantity,
          costPrice: data.unitCost || product?.costPrice || 0,
          expiryDate: data.expiryDate,
          manufacturingDate: data.manufacturingDate,
          notes: data.notes,
          createdBy: useUserIdentifier().getCurrentUserIdentifier(), // Use npub for decentralized identity
        });
      }

      toast.add({
        title: t("inventory.stockAdded", "Stock Added"),
        description: data.lotNumber
          ? `Added ${data.quantity} units (Lot: ${data.lotNumber})`
          : `Added ${data.quantity} units`,
        icon: "i-heroicons-check-circle",
        color: "green",
      });
      showAddStockModal.value = false;
    } else {
      toast.add({
        title: t("common.error", "Error"),
        description: inventory.error.value || "Failed to add stock",
        icon: "i-heroicons-exclamation-circle",
        color: "red",
      });
    }
  } finally {
    adjusting.value = false;
  }
};

const handleSaveSupplier = async (data: SupplierFormData, isEdit: boolean) => {
  if (!data.name) {
    toast.add({
      title: t("common.error", "Error"),
      description:
        t("inventory.supplierNameRequired", "Supplier name is required"),
      icon: "i-heroicons-exclamation-circle",
      color: "red",
    });
    return;
  }

  adjusting.value = true;
  try {
    let success = false;
    if (isEdit && editingSupplier.value) {
      success = await inventory.updateSupplier(editingSupplier.value.id, {
        ...data,
        status: "active" as const,
        productIds: editingSupplier.value.productIds,
      });
    } else {
      const result = await inventory.addSupplier({
        ...data,
        status: "active" as const,
        productIds: [],
      });
      success = !!result;
    }

    if (success) {
      toast.add({
        title: isEdit
          ? t("inventory.supplierUpdated")
          : t("inventory.supplierAdded"),
        description: data.name,
        icon: "i-heroicons-check-circle",
        color: "green",
      });
      showSupplierModal.value = false;
    } else {
      toast.add({
        title: t("common.error", "Error"),
        description: inventory.error.value || "Failed to save supplier",
        icon: "i-heroicons-exclamation-circle",
        color: "red",
      });
    }
  } finally {
    adjusting.value = false;
  }
};

const handleSavePurchaseOrder = async (data: POFormData) => {
  if (!data.supplierId || data.items.length === 0) {
    toast.add({
      title: t("common.error"),
      description: t("inventory.poRequiredFields"),
      icon: "i-heroicons-exclamation-circle",
      color: "red",
    });
    return;
  }

  adjusting.value = true;
  try {
    const items = data.items.map((item) => ({
      ...item,
      receivedQty: (item as { receivedQty?: number }).receivedQty || 0,
    }));

    // Check if we're editing or creating
    if (editingPO.value) {
      // Update existing PO
      const success = await inventory.updatePurchaseOrder(editingPO.value.id, {
        supplierId: data.supplierId,
        branchId: data.branchId,
        items,
        notes: data.notes,
      });

      if (success) {
        toast.add({
          title: t("inventory.poUpdated", "Purchase Order Updated"),
          description: `PO#${editingPO.value.id}`,
          icon: "i-heroicons-check-circle",
          color: "green",
        });
        showPurchaseOrderModal.value = false;
        editingPO.value = null;
      } else {
        toast.add({
          title: t("common.error"),
          description: inventory.error.value || t("inventory.poUpdateFailed"),
          icon: "i-heroicons-exclamation-circle",
          color: "red",
        });
      }
    } else {
      // Create new PO
      const result = await inventory.createPurchaseOrder(
        data.supplierId,
        data.branchId,
        items,
        data.notes
      );

      if (result) {
        toast.add({
          title: t("inventory.poCreated"),
          description: `PO#${result.id}`,
          icon: "i-heroicons-check-circle",
          color: "green",
        });
        showPurchaseOrderModal.value = false;
      }
    }
  } finally {
    adjusting.value = false;
  }
};

// ============================================
// 📦 PURCHASE ORDER MANAGEMENT
// ============================================

const handleEditPO = (po: (typeof purchaseOrders.value)[number]) => {
  editingPO.value = po;
  showPurchaseOrderModal.value = true;
};

const handleDeletePO = async (id: string) => {
  if (!confirm(t("inventory.confirmDeletePO", "Delete this purchase order?")))
    return;

  adjusting.value = true;
  try {
    const success = await inventory.deletePurchaseOrder(id);
    if (success) {
      toast.add({
        title: t("inventory.poDeleted", "Purchase Order Deleted"),
        icon: "i-heroicons-check-circle",
        color: "green",
      });
    } else {
      toast.add({
        title: t("common.error"),
        description: inventory.error.value || t("inventory.poDeleteFailed"),
        icon: "i-heroicons-exclamation-circle",
        color: "red",
      });
    }
  } finally {
    adjusting.value = false;
  }
};

// PO Status Handlers
const handleApprovePO = async (id: string) => {
  adjusting.value = true;
  try {
    const success = await inventory.updatePurchaseOrderStatus(id, "pending");
    if (success) {
      toast.add({
        title: t("inventory.poApproved", "Purchase Order Approved"),
        description: t("inventory.poNowPending", "Status changed to pending"),
        icon: "i-heroicons-check-circle",
        color: "green",
      });
    }
  } finally {
    adjusting.value = false;
  }
};

const handleMarkOrdered = async (id: string) => {
  adjusting.value = true;
  try {
    const success = await inventory.updatePurchaseOrderStatus(id, "ordered");
    if (success) {
      toast.add({
        title: t("inventory.poOrdered", "Marked as Ordered"),
        description:
          t("inventory.poNowOrdered", "Order has been placed with supplier"),
        icon: "i-heroicons-truck",
        color: "blue",
      });
    }
  } finally {
    adjusting.value = false;
  }
};

const handleReceivePO = (po: (typeof purchaseOrders.value)[number]) => {
  // Navigate to receive page or open receive modal
  navigateTo(`/inventory/po/${po.id}?action=receive`);
};

const handleCancelPO = async (id: string) => {
  if (!confirm(t("inventory.confirmCancelPO", "Cancel this purchase order?")))
    return;

  adjusting.value = true;
  try {
    const success = await inventory.updatePurchaseOrderStatus(id, "cancelled");
    if (success) {
      toast.add({
        title: t("inventory.poCancelled", "Purchase Order Cancelled"),
        icon: "i-heroicons-x-circle",
        color: "red",
      });
    }
  } finally {
    adjusting.value = false;
  }
};

// Get action menu items for a PO based on its status
const getPOActions = (po: (typeof purchaseOrders.value)[number]) => {
  const items: {
    label: string;
    icon: string;
    onClick: () => void;
    color?: string;
  }[][] = [
      // Always show view
      [
        {
          label: t("common.view", "View Details"),
          icon: "i-heroicons-eye",
          onClick: () => navigateTo(`/inventory/po/${po.id}`),
        },
      ],
    ];

  // Edit action for draft/pending
  if (canEditPO(po.status)) {
    items[0].push({
      label: t("common.edit", "Edit"),
      icon: "i-heroicons-pencil-square",
      onClick: () => handleEditPO(po),
    });
  }

  // Status workflow actions
  const statusActions: {
    label: string;
    icon: string;
    onClick: () => void;
    color?: string;
  }[] = [];

  if (po.status === "draft") {
    statusActions.push({
      label: t("inventory.approvePO", "Approve"),
      icon: "i-heroicons-check",
      onClick: () => handleApprovePO(po.id),
    });
  }

  if (po.status === "pending") {
    statusActions.push({
      label: t("inventory.markAsOrdered", "Mark as Ordered"),
      icon: "i-heroicons-truck",
      onClick: () => handleMarkOrdered(po.id),
    });
  }

  if (po.status === "ordered" || po.status === "partial") {
    statusActions.push({
      label: t("inventory.receivePO", "Receive Stock"),
      icon: "i-heroicons-archive-box-arrow-down",
      onClick: () => handleReceivePO(po),
    });
  }

  if (statusActions.length > 0) {
    items.push(statusActions);
  }

  // Destructive actions
  const destructiveActions: {
    label: string;
    icon: string;
    onClick: () => void;
    color?: string;
  }[] = [];

  if (po.status !== "received" && po.status !== "cancelled") {
    destructiveActions.push({
      label: t("inventory.cancelPO", "Cancel"),
      icon: "i-heroicons-x-circle",
      color: "red",
      onClick: () => handleCancelPO(po.id),
    });
  }

  if (canDeletePO(po.status)) {
    destructiveActions.push({
      label: t("common.delete", "Delete"),
      icon: "i-heroicons-trash",
      color: "red",
      onClick: () => handleDeletePO(po.id),
    });
  }

  if (destructiveActions.length > 0) {
    items.push(destructiveActions);
  }

  return items;
};

const canEditPO = (status: string) => {
  return ["draft", "pending"].includes(status);
};

const canDeletePO = (status: string) => {
  return ["draft", "pending", "cancelled"].includes(status);
};

// Reset editingPO when modal closes
watch(showPurchaseOrderModal, (isOpen) => {
  if (!isOpen) {
    editingPO.value = null;
  }
});

// ============================================
// 👥 SUPPLIER MANAGEMENT
// ============================================

const openSupplierModal = (supplier?: (typeof suppliers.value)[number]) => {
  editingSupplier.value = supplier || null;
  showSupplierModal.value = true;
};

const deleteSupplier = async (id: string) => {
  if (!confirm(t("inventory.confirmDeleteSupplier"))) return;

  const success = await inventory.deleteSupplier(id);
  if (success) {
    toast.add({
      title: t("inventory.supplierDeleted"),
      icon: "i-heroicons-check-circle",
      color: "green",
    });
  }
};

// Export inventory
const exportInventory = async () => {
  try {
    const data = await inventory.exportInventory();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split("T")[0]
      }.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.add({
      title: t("common.exported", "Exported"),
      description:
        t("inventory.exportSuccess", "Inventory data exported successfully"),
      icon: "i-heroicons-check-circle",
      color: "green",
    });
  } catch {
    toast.add({
      title: t("common.error", "Error"),
      description: "Failed to export inventory",
      icon: "i-heroicons-exclamation-circle",
      color: "red",
    });
  }
};

// ============================================
// 📦 STOCK LOT HANDLERS
// ============================================

const handleReceiveStockSuccess = async (_receipt: unknown) => {
  // Refresh inventory data
  await inventory.init();
  await stockLots.loadStockLots();

  toast.add({
    title: t("inventory.stockReceived", "Stock Received"),
    description:
      t("inventory.stockLotsCreated", "Stock lots created successfully"),
    icon: "i-heroicons-check-circle",
    color: "green",
  });
};

const handleLotAdjust = (lot: StockLot) => {
  selectedLot.value = lot;
  // Find the inventory item for this product
  const item = inventoryItems.value.find((i) => i.productId === lot.productId);
  if (item) {
    selectedItem.value = item;
    showAdjustModal.value = true;
  }
};

const handleLotMove = async (_lot: StockLot) => {
  // TODO: Implement position transfer modal
  toast.add({
    title: t("common.info", "Info"),
    description:
      t("inventory.positionTransferComingSoon", "Position transfer coming soon"),
    icon: "i-heroicons-information-circle",
    color: "blue",
  });
};

const handleLotQuarantine = async (lot: StockLot) => {
  const confirmed = confirm(
    lot.status === "quarantine"
      ? t("inventory.confirmReleaseQuarantine", "Release this lot from quarantine?")
      : t("inventory.confirmQuarantine", "Quarantine this lot?")
  );

  if (!confirmed) return;

  if (lot.status !== "quarantine") {
    const success = await stockLots.quarantineLot(
      lot.id,
      "Manual quarantine",
      "staff_1" // TODO: Get from auth
    );

    if (success) {
      toast.add({
        title: t("inventory.lotQuarantined", "Lot Quarantined"),
        description: lot.lotNumber,
        icon: "i-heroicons-shield-exclamation",
        color: "amber",
      });
    }
  }
};

const handleLotView = (lot: StockLot) => {
  selectedLot.value = lot;
  // TODO: Open lot details modal
  console.log("View lot:", lot);
};

// Initialize inventory on mount
onMounted(async () => {
  await inventory.init();
  await stockLots.init();
});
</script>

<template>
  <div>
    <!-- Header -->
    <CommonPageHeader :title="t('inventory.title')" :description="t('inventory.description')">
      <template #right>
        <div class="flex gap-2">
          <UButton color="gray" variant="outline" icon="i-heroicons-arrow-down-tray" :label="t('common.export')"
            @click="exportInventory" />
          <UButton v-if="canEditInventory" color="primary" icon="i-heroicons-plus" :label="t('inventory.addStock')"
            @click="showAddStockModal = true" />
        </div>
      </template>

      <template #tabs>
        <UTabs v-model="activeTab" variant="link" :items="[
          { label: t('inventory.inventory'), value: 'inventory' },
          {
            label: t('inventory.stockLots'),
            value: 'lots',
            icon: 'i-heroicons-archive-box',
          },
          {
            label: t('inventory.expiryAlerts'),
            value: 'expiry',
            icon: 'i-heroicons-clock',
          },
          { label: t('inventory.movements'), value: 'movements' },
          { label: t('inventory.suppliers'), value: 'suppliers' },
          { label: t('inventory.purchaseOrders'), value: 'purchaseOrders' },
        ]" />
      </template>
    </CommonPageHeader>

    <!-- Expiry Alert Banner (shown when there are critical alerts) -->
    <div v-if="expiryAlertCount > 0 && activeTab !== 'expiry'"
      class="mx-4 p-4 bg-linear-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <span class="text-xl">⚠️</span>
        </div>
        <div>
          <p class="font-medium text-amber-700 dark:text-amber-400">
            {{ expiryAlertCount }} {{ t("inventory.stockExpiryWarning") }}
          </p>
          <p class="text-sm text-amber-600/75 dark:text-amber-500/75">
            {{ t("inventory.reviewExpiryAlerts") }}
          </p>
        </div>
      </div>
      <UButton color="amber" variant="soft" @click="activeTab = 'expiry'">
        {{ t("inventory.viewAlerts") }}
      </UButton>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 mt-4 sm:grid-cols-2 lg:grid-cols-5 gap-4 px-4">
      <CommonStatCard icon="i-heroicons-cube" icon-color="blue" :label="t('inventory.totalProducts')"
        :value="inventoryItems.length" />
      <CommonStatCard icon="i-heroicons-currency-dollar" icon-color="green" :label="t('inventory.totalValue')"
        :value="formatCurrency(totalInventoryValue)" />
      <CommonStatCard icon="i-heroicons-exclamation-triangle" icon-color="yellow" :label="t('inventory.lowStockItems')"
        :value="lowStockCount" />
      <CommonStatCard icon="i-heroicons-clock" icon-color="yellow" :label="t('inventory.expiringStock')"
        :value="stockLotSummary.expiringCount" />
      <CommonStatCard icon="i-heroicons-truck" icon-color="purple" :label="t('inventory.activeSuppliers')"
        :value="suppliers.filter((s) => s.status === 'active').length" />
    </div>

    <!-- Inventory Tab -->
    <template v-if="activeTab === 'inventory'">
      <!-- Filters -->
      <InventoryFilters v-model:search="searchQuery" v-model:branch="selectedBranch" v-model:status="selectedStatus"
        :branches="branches" :status-options="statusOptions" class="my-6" />

      <!-- Inventory Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="text-left py-3 px-4 font-medium">
                {{ t("products.name") }}
              </th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("products.sku") }}
              </th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("common.branch") }}
              </th>
              <th class="text-center py-3 px-4 font-medium">
                {{ t("inventory.currentStock") }}
              </th>
              <th class="text-center py-3 px-4 font-medium">
                {{ t("inventory.minMax") }}
              </th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("common.status") }}
              </th>
              <th class="text-right py-3 px-4 font-medium">
                {{ t("inventory.value") }}
              </th>
              <th class="text-right py-3 px-4 font-medium">
                {{ t("common.actions") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredInventory" :key="item.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td class="py-3 px-4">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ item.productName }}
                  </p>
                  <p class="text-xs text-gray-500">{{ item.categoryName }}</p>
                </div>
              </td>
              <td class="py-3 px-4">
                <code class="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ item.sku }}</code>
              </td>
              <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {{ item.branchName }}
              </td>
              <td class="py-3 px-4 text-center">
                <span class="text-lg font-bold" :class="{
                  'text-red-500': item.status === 'out-of-stock',
                  'text-yellow-500': item.status === 'low-stock',
                  'text-green-500': item.status === 'in-stock',
                }">
                  {{ item.currentStock }}
                </span>
                <span class="text-xs text-gray-500 ml-1">{{
                  item.unitSymbol
                }}</span>
              </td>
              <td class="py-3 px-4 text-center text-sm text-gray-500">
                {{ item.minStock }} / {{ item.maxStock }}
              </td>
              <td class="py-3 px-4">
                <UBadge :color="getStatusColor(item.status)" :label="t(`inventory.${item.status.replace('-', '')}`)" />
              </td>
              <td class="py-3 px-4 text-right font-medium">
                {{ formatCurrency(item.value) }}
              </td>
              <td class="py-3 px-4">
                <div class="flex justify-end gap-1">
                  <UButton v-if="canAdjustStock" color="gray" variant="ghost" size="sm" icon="i-heroicons-pencil-square"
                    @click="openAdjustModal(item)" />
                  <UButton v-if="canAdjustStock" color="gray" variant="ghost" size="sm"
                    icon="i-heroicons-arrows-right-left" @click="openTransferModal(item)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Movements Tab -->
    <template v-if="activeTab === 'movements'">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="text-left py-3 px-4 font-medium">
                {{ t("common.date") }}
              </th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("products.product") }}
              </th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("inventory.movementType") }}
              </th>
              <th class="text-center py-3 px-4 font-medium">
                {{ t("inventory.quantity") }}
              </th>
              <th class="text-center py-3 px-4 font-medium">
                {{ t("inventory.stockChange") }}
              </th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("inventory.reason") }}
              </th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("common.createdBy") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="movement in stockMovements" :key="movement.id"
              class="border-b border-gray-100 dark:border-gray-800">
              <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {{ new Date(movement.createdAt).toLocaleDateString() }}
              </td>
              <td class="py-3 px-4 font-medium">{{ movement.productName }}</td>
              <td class="py-3 px-4">
                <UBadge :color="movement.type === 'in'
                  ? 'green'
                  : movement.type === 'out'
                    ? 'red'
                    : 'blue'
                  " :label="t(`inventory.${movement.type}`)" />
              </td>
              <td class="py-3 px-4 text-center font-bold" :class="movement.type === 'in' ? 'text-green-500' : 'text-red-500'
                ">
                {{ movement.type === "in" ? "+" : "-" }}{{ movement.quantity }}
              </td>
              <td class="py-3 px-4 text-center text-sm">
                {{ movement.previousStock }} → {{ movement.newStock }}
              </td>
              <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {{ movement.reason }}
              </td>
              <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {{ movement.createdBy }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Suppliers Tab -->
    <template v-if="activeTab === 'suppliers'">
      <div class="px-4 mb-4 flex my-6 gap-2">
        <UButton color="primary" icon="i-heroicons-plus" :label="t('inventory.addSupplier')"
          @click="openSupplierModal()" />
        <UButton color="gray" variant="outline" icon="i-heroicons-arrow-path" :label="t('common.sync')"
          @click="inventory.syncPendingData()" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
        <UCard v-for="supplier in suppliers" :key="supplier.id">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white">
                {{ supplier.name }}
              </h3>
              <p class="text-sm text-gray-500">{{ supplier.contactPerson }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UBadge v-if="!supplier.synced" color="yellow" :label="t('inventory.pendingSync')" size="xs" />
              <UBadge :color="supplier.status === 'active' ? 'green' : 'gray'"
                :label="t(`common.${supplier.status}`)" />
            </div>
          </div>

          <div class="space-y-2 text-sm">
            <div v-if="supplier.email" class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Icon name="i-heroicons-envelope" class="w-4 h-4" />
              {{ supplier.email }}
            </div>
            <div v-if="supplier.phone" class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Icon name="i-heroicons-phone" class="w-4 h-4" />
              {{ supplier.phone }}
            </div>
            <div v-if="supplier.address" class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Icon name="i-heroicons-map-pin" class="w-4 h-4" />
              {{ supplier.address }}
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span class="text-xs text-gray-500">
              {{ t("inventory.lastOrder") }}:
              {{
                supplier.lastOrderDate
                  ? new Date(supplier.lastOrderDate).toLocaleDateString()
                  : "-"
              }}
            </span>
            <div class="flex gap-1">
              <UButton color="gray" variant="ghost" size="xs" icon="i-heroicons-pencil"
                @click="openSupplierModal(supplier)" />
              <UButton color="red" variant="ghost" size="xs" icon="i-heroicons-trash"
                @click="deleteSupplier(supplier.id)" />
              <UButton color="primary" variant="ghost" size="xs" icon="i-heroicons-shopping-cart"
                @click="showPurchaseOrderModal = true" />
            </div>
          </div>
        </UCard>

        <!-- Empty State -->
        <UCard v-if="suppliers.length === 0" class="col-span-full">
          <div class="text-center py-8">
            <Icon name="i-heroicons-user-group" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p class="text-gray-500">{{ t("inventory.noSuppliers") }}</p>
            <UButton color="primary" class="mt-4" @click="openSupplierModal()">
              {{ t("inventory.addFirstSupplier") }}
            </UButton>
          </div>
        </UCard>
      </div>
    </template>

    <!-- Purchase Orders Tab -->
    <template v-if="activeTab === 'purchaseOrders'">
      <div class="px-4 my-4">
        <UButton color="primary" icon="i-heroicons-plus" :label="t('inventory.createPO')"
          @click="showPurchaseOrderModal = true" />
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="text-left py-3 px-4 font-medium">
                {{ t("inventory.poNumber") }}
              </th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("inventory.supplier") }}
              </th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("common.branch") }}
              </th>
              <th class="text-center py-3 px-4 font-medium">
                {{ t("inventory.items") }}
              </th>
              <th class="text-right py-3 px-4 font-medium">
                {{ t("common.total") }}
              </th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("common.status") }}
              </th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("common.date") }}
              </th>
              <th class="text-right py-3 px-4 font-medium">
                {{ t("common.actions") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="po in purchaseOrders" :key="po.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td class="py-3 px-4">
                <code
                  class="text-sm bg-gray-100 uppercase dark:bg-gray-800 px-2 py-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  @click="navigateTo(`/inventory/po/${po.id}`)">
                  {{ po.id }}
                </code>
              </td>
              <td class="py-3 px-4 font-medium">{{ po.supplierName }}</td>
              <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {{ po.branchName }}
              </td>
              <td class="py-3 px-4 text-center">{{ po.items.length }}</td>
              <td class="py-3 px-4 text-right font-medium">
                {{ formatCurrency(po.total) }}
              </td>
              <td class="py-3 px-4">
                <UBadge :color="po.status === 'received'
                  ? 'green'
                  : po.status === 'cancelled'
                    ? 'red'
                    : po.status === 'partial'
                      ? 'yellow'
                      : po.status === 'draft'
                        ? 'gray'
                        : 'blue'
                  " :label="t(
                    `inventory.po${po.status.charAt(0).toUpperCase() + po.status.slice(1)
                    }`
                  )
                    " />
              </td>
              <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {{ new Date(po.createdAt).toLocaleDateString() }}
              </td>
              <td class="py-3 px-4">
                <div class="flex justify-end">
                  <UDropdownMenu :items="getPOActions(po)">
                    <UButton color="gray" variant="ghost" size="sm" icon="i-heroicons-ellipsis-vertical" @click.stop />
                  </UDropdownMenu>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div v-if="purchaseOrders.length === 0" class="text-center py-12">
          <Icon name="i-heroicons-document-text" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p class="text-gray-500">{{ t("inventory.noPurchaseOrders") }}</p>
        </div>
      </div>
    </template>

    <!-- Stock Lots Tab -->
    <template v-if="activeTab === 'lots'">
      <div class="space-y-4">
        <!-- Quick Actions -->
        <div class="flex items-center justify-between p-4">
          <div class="flex items-center gap-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t("inventory.stockLots") }}
            </h3>
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <span>{{ stockLotSummary.totalLots }} {{ t("common.lots") }}</span>
              <span>•</span>
              <span>{{ stockLotSummary.totalQuantity }}
                {{ t("common.units") }}</span>
              <span>•</span>
              <span>{{ formatCurrency(stockLotSummary.totalValue) }}</span>
            </div>
          </div>
          <UButton v-if="canEditInventory" color="primary" icon="i-heroicons-plus"
            @click="showReceiveStockModal = true">
            {{ t("inventory.receiveStock") }}
          </UButton>
        </div>

        <!-- Stock Lots List Component -->
        <InventoryStockLotsList :branch-id="selectedBranch !== 'all' ? selectedBranch : undefined"
          @adjust="handleLotAdjust" @move="handleLotMove" @quarantine="handleLotQuarantine" @view="handleLotView" />
      </div>
    </template>

    <!-- Expiry Alerts Tab -->
    <template v-if="activeTab === 'expiry'">
      <div class="">
        <InventoryStockExpiryAlerts @view-lot="handleLotView" @quarantine="handleLotQuarantine" />
      </div>
    </template>

    <!-- Stock Adjustment Modal -->
    <InventoryStockAdjustmentModal v-model:open="showAdjustModal" :item="selectedItem" :loading="adjusting"
      @save="handleAdjustment" />

    <!-- Stock Transfer Modal -->
    <InventoryStockTransferModal v-model:open="showTransferModal" :item="selectedItem" :branches="branches"
      :loading="adjusting" @save="handleTransfer" />

    <!-- Add Stock Modal -->
    <InventoryAddStockModal v-model:open="showAddStockModal" :branches="branches" :inventory-items="inventoryItems"
      :loading="adjusting" @save="handleAddStock" />

    <!-- Supplier Modal -->
    <InventorySupplierModal v-model:open="showSupplierModal" :supplier="editingSupplier" :loading="adjusting"
      @save="handleSaveSupplier" />

    <!-- Purchase Order Modal -->
    <InventoryPurchaseOrderModal v-model:open="showPurchaseOrderModal" :suppliers="suppliers" :branches="branches"
      :inventory-items="inventoryItems" :editing-p-o="editingPO" :loading="adjusting" @save="handleSavePurchaseOrder" />

    <!-- Receive Stock Modal (with Lot Tracking) -->
    <InventoryReceiveStockModal v-model:open="showReceiveStockModal"
      :branch-id="selectedBranch !== 'all' ? selectedBranch : 'main'" @success="handleReceiveStockSuccess" />
  </div>
</template>
