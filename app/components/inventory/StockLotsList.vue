<!-- components/inventory/StockLotsList.vue -->
<!-- Production-ready Stock Lots List with FIFO/FEFO indicators -->
<template>
  <div class="space-y-4">
    <!-- Header with Filters -->
    <div class="flex flex-wrap items-center justify-between px-4 gap-3">
      <div class="flex items-center gap-3">
        <h3
          class="font-semibold text-gray-900 dark:text-white flex items-center gap-2"
        >
          <span class="text-lg">📦</span>
          {{ $t("inventory.stockLots", "Stock Lots") }}
          <UBadge color="primary" variant="subtle">
            {{ filteredLots.length }}
          </UBadge>
        </h3>
      </div>

      <div class="flex items-center gap-2">
        <!-- Status Filter -->
        <USelect
          v-model="statusFilter"
          :items="statusOptions"
          size="sm"
          class="w-36"
        />

        <!-- Search -->
        <UInput
          v-model="searchQuery"
          :placeholder="$t('common.search', 'Search...')"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-48"
        />
      </div>
    </div>

    <!-- Lots Table -->
    <div
      class=" border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr>
              <th
                class="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ $t("inventory.lotInfo", "Lot Info") }}
              </th>
              <th
                class="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ $t("products.name", "Product") }}
              </th>
              <th
                class="text-center py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ $t("inventory.quantity", "Qty") }}
              </th>
              <th
                class="text-center py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ $t("inventory.expiryDate", "Expiry") }}
              </th>
              <th
                class="text-center py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ $t("inventory.position", "Position") }}
              </th>
              <th
                class="text-center py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ $t("common.status", "Status") }}
              </th>
              <th
                class="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ $t("common.actions", "Actions") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(lot, index) in paginatedLots"
              :key="lot.id"
              class="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <!-- Lot Info -->
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <!-- FEFO indicator -->
                  <div
                    v-if="index === 0 && lot.expiryDate"
                    class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
                    :title="$t('inventory.fefoNext', 'Next to pick (FEFO)')"
                  >
                    <span class="text-sm">1️⃣</span>
                  </div>
                  <div
                    v-else
                    class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm text-gray-500"
                  >
                    {{ index + 1 }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">
                      {{ lot.lotNumber }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ lot.batchCode || formatDate(lot.receivedDate) }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Product -->
              <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                  <span class="text-xl">
                    <img
                      v-if="getProductImage(lot.productId).startsWith('http')"
                      :src="getProductImage(lot.productId)"
                      alt="Product Image"
                      class="w-8 h-8 rounded-md object-cover"
                    />
                    <span v-else>{{ getProductImage(lot.productId) }}</span>
                  </span>
                  <div>
                    <p
                      class="font-medium text-gray-900 dark:text-white text-sm"
                    >
                      {{ getProductName(lot.productId) }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ getProductSku(lot.productId) }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Quantity -->
              <td class="py-3 px-4 text-center">
                <div>
                  <p class="font-bold text-gray-900 dark:text-white">
                    {{ lot.currentQuantity }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    / {{ lot.initialQuantity }}
                  </p>
                </div>
              </td>

              <!-- Expiry -->
              <td class="py-3 px-4 text-center">
                <div v-if="lot.expiryDate">
                  <p
                    class="font-medium text-sm"
                    :class="getExpiryTextClass(lot.daysUntilExpiry)"
                  >
                    {{ formatDate(lot.expiryDate) }}
                  </p>
                  <p
                    class="text-xs"
                    :class="getExpiryTextClass(lot.daysUntilExpiry)"
                  >
                    {{
                      lot.daysUntilExpiry && lot.daysUntilExpiry <= 0
                        ? $t("inventory.expired", "Expired")
                        : `${lot.daysUntilExpiry} ${
                            $t("common.days", "days")
                          }`
                    }}
                  </p>
                </div>
                <span v-else class="text-gray-400 text-sm">—</span>
              </td>

              <!-- Position -->
              <td class="py-3 px-4 text-center">
                <UBadge
                  v-if="lot.positionCode"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  {{ lot.positionCode }}
                </UBadge>
                <span v-else class="text-gray-400 text-sm">—</span>
              </td>

              <!-- Status -->
              <td class="py-3 px-4 text-center">
                <UBadge :color="getStatusColor(lot.status)" size="sm">
                  {{ getStatusLabel(lot.status) }}
                </UBadge>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1">
                  <UTooltip
                    :text="$t('inventory.adjustQty', 'Adjust Quantity')"
                  >
                    <UButton
                      icon="i-heroicons-plus-minus"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      @click="$emit('adjust', lot)"
                    />
                  </UTooltip>
                  <UTooltip
                    :text="$t('inventory.movePosition', 'Move Position')"
                  >
                    <UButton
                      icon="i-heroicons-arrows-right-left"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      @click="$emit('move', lot)"
                    />
                  </UTooltip>
                  <UDropdownMenu :items="getLotActions(lot)" class="w-48">
                    <UButton
                      icon="i-heroicons-ellipsis-vertical"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                    />
                  </UDropdownMenu>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div
        v-if="filteredLots.length === 0"
        class="flex flex-col items-center justify-center py-16 text-gray-400"
      >
        <span class="text-4xl mb-3">📦</span>
        <p class="font-medium">
          {{ $t("inventory.noLots", "No stock lots found") }}
        </p>
        <p class="text-sm">
          {{
            $t("inventory.receiveStockToCreate","Receive stock to create lots")
          }}
        </p>
      </div>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ $t("common.showing", "Showing") }} {{ startIndex + 1 }}-{{
            endIndex
          }}
          {{ $t("common.of", "of") }} {{ filteredLots.length }}
        </p>
        <div class="flex gap-2">
          <UButton
            :disabled="currentPage === 1"
            icon="i-heroicons-chevron-left"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="currentPage--"
          />
          <span class="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <UButton
            :disabled="currentPage >= totalPages"
            icon="i-heroicons-chevron-right"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="currentPage++"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StockLot } from "~/types";

// Props & Emits
defineProps<{
  productId?: string;
  branchId?: string;
}>();

const emit = defineEmits<{
  adjust: [lot: StockLot];
  move: [lot: StockLot];
  quarantine: [lot: StockLot];
  view: [lot: StockLot];
}>();

// Composables
const { t } = useI18n();
const stockLots = useStockLots();
const productsStore = useProductsStore();

// State
const searchQuery = ref("");
const statusFilter = ref("all");
const currentPage = ref(1);
const itemsPerPage = 10;

// Options
const statusOptions = computed(() => [
  { value: "all", label: t('inventory.allStatus', 'All Status') },
  { value: "available", label: t('inventory.statusAvailable', '✅ Available') },
  { value: "low", label: t('inventory.statusLow', '📉 Low') },
  { value: "expiring", label: t('inventory.statusExpiring', '⏰ Expiring') },
  { value: "expired", label: t('inventory.statusExpired', '🚫 Expired') },
  { value: "quarantined", label: t('inventory.statusQuarantined', '⚠️ Quarantine') },
]);

// Computed
const filteredLots = computed(() => {
  let lots = stockLots.stockLots.value.filter((l) => l.status !== "depleted");

  // Filter by status
  if (statusFilter.value !== "all") {
    lots = lots.filter((l) => l.status === statusFilter.value);
  }

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    lots = lots.filter(
      (l) =>
        l.lotNumber.toLowerCase().includes(query) ||
        l.batchCode?.toLowerCase().includes(query) ||
        getProductName(l.productId).toLowerCase().includes(query)
    );
  }

  // Sort by expiry (FEFO)
  return lots.sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });
});

const totalPages = computed(() =>
  Math.ceil(filteredLots.value.length / itemsPerPage)
);
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage);
const endIndex = computed(() =>
  Math.min(startIndex.value + itemsPerPage, filteredLots.value.length)
);
const paginatedLots = computed(() =>
  filteredLots.value.slice(startIndex.value, endIndex.value)
);

// Methods
function getProductName(productId: string): string {
  const product = productsStore.products.value.find((p) => p.id === productId);
  return product?.name || "Unknown";
}

function getProductSku(productId: string): string {
  const product = productsStore.products.value.find((p) => p.id === productId);
  return product?.sku || "";
}

function getProductImage(productId: string): string {
  const product = productsStore.products.value.find((p) => p.id === productId);
  return product?.image || "📦";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getExpiryTextClass(daysUntil?: number): string {
  if (!daysUntil) return "text-gray-500 dark:text-gray-400";
  if (daysUntil <= 0) return "text-red-600 dark:text-red-400";
  if (daysUntil <= 3) return "text-orange-600 dark:text-orange-400";
  if (daysUntil <= 7) return "text-amber-600 dark:text-amber-400";
  if (daysUntil <= 30) return "text-yellow-600 dark:text-yellow-400";
  return "text-gray-600 dark:text-gray-400";
}

function getStatusColor(
  status: string
): "green" | "yellow" | "orange" | "red" | "gray" {
  switch (status) {
    case "available":
      return "green";
    case "low":
      return "yellow";
    case "expiring":
      return "orange";
    case "expired":
      return "red";
    case "quarantine":
      return "red";
    default:
      return "gray";
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    available: t("inventory.available", "Available"),
    low: t("inventory.low", "Low"),
    expiring: t("inventory.expiring", "Expiring"),
    expired: t("inventory.expired", "Expired"),
    quarantine: t("inventory.quarantine", "Quarantine"),
    depleted: t("inventory.depleted", "Depleted"),
  };
  return labels[status] || status;
}

function getLotActions(lot: StockLot) {
  return [
    [
      {
        label: t("common.viewDetails", "View Details"),
        icon: "i-heroicons-eye",
        onSelect: () => emit("view", lot),
      },
      {
        label: t("inventory.adjustStock", "Adjust Stock"),
        icon: "i-heroicons-plus-minus",
        onSelect: () => emit("adjust", lot),
      },
      {
        label: t("inventory.movePosition", "Move Position"),
        icon: "i-heroicons-arrows-right-left",
        onSelect: () => emit("move", lot),
      },
    ],
    [
      {
        label:
          lot.status === "quarantine"
            ? t("inventory.releaseFromQuarantine", "Release")
            : t("inventory.quarantine", "Quarantine"),
        icon: "i-heroicons-shield-exclamation",
        color: "amber" as const,
        onSelect: () => emit("quarantine", lot),
      },
    ],
  ];
}

// Watch for filter changes
watch([searchQuery, statusFilter], () => {
  currentPage.value = 1;
});
</script>
