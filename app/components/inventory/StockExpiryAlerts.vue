<!-- components/inventory/StockExpiryAlerts.vue -->
<!-- Production-ready Stock Expiry Alerts Dashboard Widget -->
<template>
  <div class="space-y-2">
    <!-- Alert Summary Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 p-4 gap-3">
      <!-- Expired -->
      <div
        class="p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.02]"
        :class="
          selectedFilter === 'expired'
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        "
        @click="
          selectedFilter = selectedFilter === 'expired' ? 'all' : 'expired'
        "
      >
        <div class="flex items-center gap-3">
          <span class="text-2xl">🚫</span>
          <div>
            <p class="text-2xl font-bold">{{ expiredCount }}</p>
            <p class="text-xs opacity-75">
              {{ $t("inventory.expired", "Expired") }}
            </p>
          </div>
        </div>
      </div>

      <!-- Urgent (≤3 days) -->
      <div
        class="p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.02]"
        :class="
          selectedFilter === 'urgent'
            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
        "
        @click="selectedFilter = selectedFilter === 'urgent' ? 'all' : 'urgent'"
      >
        <div class="flex items-center gap-3">
          <span class="text-2xl">🔥</span>
          <div>
            <p class="text-2xl font-bold">{{ urgentCount }}</p>
            <p class="text-xs opacity-75">
              {{ $t("inventory.urgentExpiry", "≤3 days") }}
            </p>
          </div>
        </div>
      </div>

      <!-- Critical (≤7 days) -->
      <div
        class="p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.02]"
        :class="
          selectedFilter === 'critical'
            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
        "
        @click="
          selectedFilter = selectedFilter === 'critical' ? 'all' : 'critical'
        "
      >
        <div class="flex items-center gap-3">
          <span class="text-2xl">⚠️</span>
          <div>
            <p class="text-2xl font-bold">{{ criticalCount }}</p>
            <p class="text-xs opacity-75">
              {{ $t("inventory.criticalExpiry", "≤7 days") }}
            </p>
          </div>
        </div>
      </div>

      <!-- Warning (≤30 days) -->
      <div
        class="p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.02]"
        :class="
          selectedFilter === 'warning'
            ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/25'
            : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
        "
        @click="
          selectedFilter = selectedFilter === 'warning' ? 'all' : 'warning'
        "
      >
        <div class="flex items-center gap-3">
          <span class="text-2xl">⏰</span>
          <div>
            <p class="text-2xl font-bold">{{ warningCount }}</p>
            <p class="text-xs opacity-75">
              {{ $t("inventory.warningExpiry", "≤30 days") }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Alerts List -->
    <div
      class="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
      >
        <h3
          class="font-semibold text-gray-900 dark:text-white flex items-center gap-2"
        >
          <UIcon name="i-heroicons-clock" class="w-5 h-5 text-amber-500" />
          {{ $t("inventory.expiryAlerts", "Expiry Alerts") }}
          <UBadge
            v-if="filteredAlerts.length > 0"
            :color="getBadgeColor"
            variant="subtle"
          >
            {{ filteredAlerts.length }}
          </UBadge>
        </h3>
        <div class="flex items-center gap-2">
          <UButton
            v-if="filteredAlerts.some((a) => !a.acknowledged)"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="acknowledgeAll"
          >
            {{ $t("inventory.acknowledgeAll", "Acknowledge All") }}
          </UButton>
          <UButton
            icon="i-heroicons-arrow-path"
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="refreshing"
            @click="refresh"
          />
        </div>
      </div>

      <!-- Alert Items -->
      <div class="max-h-[400px] overflow-y-auto">
        <div
          v-for="alert in filteredAlerts"
          :key="alert.id"
          class="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          :class="{ 'opacity-50': alert.acknowledged }"
        >
          <!-- Alert Level Icon -->
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            :class="getAlertBgClass(alert.alertLevel)"
          >
            {{ getAlertIcon(alert.alertLevel) }}
          </div>

          <!-- Alert Details -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <p class="font-medium text-gray-900 dark:text-white truncate">
                {{ alert.productName }}
              </p>
              <UBadge color="neutral" variant="subtle" size="xs">
                {{ alert.lotNumber }}
              </UBadge>
            </div>
            <div
              class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400"
            >
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-cube" class="w-3.5 h-3.5" />
                {{ alert.currentQuantity }} {{ $t("common.units", "units") }}
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
                {{ formatDate(alert.expiryDate) }}
              </span>
            </div>
          </div>

          <!-- Days Until Expiry -->
          <div class="text-center shrink-0">
            <p
              class="text-lg font-bold"
              :class="getAlertTextClass(alert.alertLevel)"
            >
              {{ alert.daysUntilExpiry <= 0 ? "EXP" : alert.daysUntilExpiry }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{
                alert.daysUntilExpiry <= 0
                  ? $t("inventory.expired", "Expired")
                  : $t("common.days", "days")
              }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0">
            <UTooltip :text="$t('inventory.viewLot', 'View Lot')">
              <UButton
                icon="i-heroicons-eye"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="$emit('view-lot', alert.lot)"
              />
            </UTooltip>
            <UTooltip :text="$t('inventory.quarantine', 'Quarantine')">
              <UButton
                icon="i-heroicons-shield-exclamation"
                color="amber"
                variant="ghost"
                size="xs"
                @click="$emit('quarantine', alert.lot)"
              />
            </UTooltip>
            <UTooltip
              v-if="!alert.acknowledged"
              :text="$t('inventory.acknowledge', 'Acknowledge')"
            >
              <UButton
                icon="i-heroicons-check"
                color="green"
                variant="ghost"
                size="xs"
                @click="acknowledge(alert.id)"
              />
            </UTooltip>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="filteredAlerts.length === 0"
          class="flex flex-col items-center justify-center py-12 text-gray-400"
        >
          <span class="text-4xl mb-3">✅</span>
          <p class="font-medium">
            {{
              selectedFilter === "all"
                ? $t("inventory.noExpiryAlerts", "No expiry alerts")
                : $t(
                    "inventory.noAlertsInCategory",
                    "No alerts in this category"
                  )
            }}
          </p>
          <p class="text-sm">
            {{
              $t(
                "inventory.stockHealthy",
                "All stock is within acceptable expiry dates"
              )
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Lot Details Modal -->
    <UModal v-model:open="showLotModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3
            class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
          >
            <span>📦</span>
            {{ $t("inventory.lotDetails", "Lot Details") }}
          </h3>

          <div v-if="selectedLot" class="space-y-4">
            <!-- Lot Info Grid -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {{ $t("inventory.lotNumber", "Lot Number") }}
                </p>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ selectedLot.lotNumber }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {{ $t("inventory.batchCode", "Batch Code") }}
                </p>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ selectedLot.batchCode || "-" }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {{ $t("inventory.currentQty", "Current Qty") }}
                </p>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ selectedLot.currentQuantity }} /
                  {{ selectedLot.initialQuantity }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {{ $t("common.status", "Status") }}
                </p>
                <UBadge :color="getLotStatusColor(selectedLot.status)">
                  {{ selectedLot.status }}
                </UBadge>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {{ $t("inventory.expiryDate", "Expiry Date") }}
                </p>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{
                    selectedLot.expiryDate
                      ? formatDate(selectedLot.expiryDate)
                      : "-"
                  }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {{ $t("inventory.position", "Position") }}
                </p>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ selectedLot.positionCode || "-" }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {{ $t("inventory.supplier", "Supplier") }}
                </p>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ selectedLot.supplierName || "-" }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {{ $t("inventory.costPrice", "Cost Price") }}
                </p>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency(selectedLot.costPrice) }}
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div
              class="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <UButton
                color="neutral"
                variant="outline"
                class="flex-1"
                @click="showLotModal = false"
              >
                {{ $t("common.close", "Close") }}
              </UButton>
              <UButton
                v-if="selectedLot.status !== 'quarantine'"
                color="amber"
                class="flex-1"
                @click="quarantineLot"
              >
                {{ $t("inventory.quarantine", "Quarantine") }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { StockLot } from "~/types";

// Props & Emits
defineProps<{
  compact?: boolean;
}>();

const _emit = defineEmits<{
  "view-lot": [lot: StockLot];
  quarantine: [lot: StockLot];
}>();

// Composables
const { t } = useI18n();
const toast = useToast();
const stockLots = useStockLots();

// State
const selectedFilter = ref<
  "all" | "expired" | "urgent" | "critical" | "warning"
>("all");
const refreshing = ref(false);
const showLotModal = ref(false);
const selectedLot = ref<StockLot | null>(null);

// Computed
const expiryAlerts = computed(() => stockLots.expiryAlerts.value);

const expiredCount = computed(
  () => expiryAlerts.value.filter((a) => a.alertLevel === "expired").length
);

const urgentCount = computed(
  () => expiryAlerts.value.filter((a) => a.alertLevel === "urgent").length
);

const criticalCount = computed(
  () => expiryAlerts.value.filter((a) => a.alertLevel === "critical").length
);

const warningCount = computed(
  () => expiryAlerts.value.filter((a) => a.alertLevel === "warning").length
);

const filteredAlerts = computed(() => {
  if (selectedFilter.value === "all") {
    return expiryAlerts.value;
  }
  return expiryAlerts.value.filter(
    (a) => a.alertLevel === selectedFilter.value
  );
});

const getBadgeColor = computed(() => {
  switch (selectedFilter.value) {
    case "expired":
      return "red";
    case "urgent":
      return "orange";
    case "critical":
      return "amber";
    case "warning":
      return "yellow";
    default:
      return "neutral";
  }
});

// Methods
function getAlertIcon(level: string): string {
  switch (level) {
    case "expired":
      return "🚫";
    case "urgent":
      return "🔥";
    case "critical":
      return "⚠️";
    case "warning":
      return "⏰";
    default:
      return "📦";
  }
}

function getAlertBgClass(level: string): string {
  switch (level) {
    case "expired":
      return "bg-red-100 dark:bg-red-900/30";
    case "urgent":
      return "bg-orange-100 dark:bg-orange-900/30";
    case "critical":
      return "bg-amber-100 dark:bg-amber-900/30";
    case "warning":
      return "bg-yellow-100 dark:bg-yellow-900/30";
    default:
      return "bg-gray-100 dark:bg-gray-800";
  }
}

function getAlertTextClass(level: string): string {
  switch (level) {
    case "expired":
      return "text-red-600 dark:text-red-400";
    case "urgent":
      return "text-orange-600 dark:text-orange-400";
    case "critical":
      return "text-amber-600 dark:text-amber-400";
    case "warning":
      return "text-yellow-600 dark:text-yellow-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

function getLotStatusColor(
  status: string
): "green" | "yellow" | "red" | "orange" | "gray" {
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
    case "depleted":
      return "gray";
    default:
      return "gray";
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
  }).format(amount);
}

async function refresh() {
  refreshing.value = true;
  try {
    await stockLots.checkExpiryAlerts();
  } finally {
    refreshing.value = false;
  }
}

async function acknowledge(alertId: string) {
  await stockLots.acknowledgeAlert(alertId);
  toast.add({
    title: t("common.success", "Success"),
    description: t("inventory.alertAcknowledged", "Alert acknowledged"),
    icon: "i-heroicons-check-circle",
    color: "green",
  });
}

async function acknowledgeAll() {
  for (const alert of filteredAlerts.value.filter((a) => !a.acknowledged)) {
    await stockLots.acknowledgeAlert(alert.id);
  }
  toast.add({
    title: t("common.success", "Success"),
    description:
      t("inventory.allAlertsAcknowledged", "All alerts acknowledged"),
    icon: "i-heroicons-check-circle",
    color: "green",
  });
}

async function quarantineLot() {
  if (!selectedLot.value) return;

  const success = await stockLots.quarantineLot(
    selectedLot.value.id,
    "Quarantined due to expiry",
    "staff_1" // TODO: Get from auth
  );

  if (success) {
    toast.add({
      title: t("common.success", "Success"),
      description: t("inventory.lotQuarantined", "Lot quarantined"),
      icon: "i-heroicons-shield-check",
      color: "amber",
    });
    showLotModal.value = false;
  }
}

// Initialize
onMounted(() => {
  stockLots.checkExpiryAlerts();
});
</script>
