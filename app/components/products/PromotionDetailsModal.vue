<!-- components/products/PromotionDetailsModal.vue -->
<script setup lang="ts">
import type { Promotion } from "~/types";

interface Props {
  modelValue: boolean;
  promotion: Promotion | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const { t } = useI18n();
const { getStatusColor, getStatusText } = usePromotionHelpers();
const productsStore = useProductsStore();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// Type display info
const typeInfo = computed(() => {
  if (!props.promotion) return null;
  const types: Record<
    string,
    { icon: string; color: string; label: string; description: string }
  > = {
    bogo: {
      icon: "🎁",
      color: "green",
      label: "BOGO",
      description: "Buy One Get One promotion",
    },
    discount: {
      icon: "💰",
      color: "blue",
      label: "Discount",
      description: "Price discount promotion",
    },
    tiered: {
      icon: "📊",
      color: "purple",
      label: "Tiered",
      description: "Volume-based discount tiers",
    },
    bundle: {
      icon: "📦",
      color: "amber",
      label: "Bundle",
      description: "Bundle products together",
    },
    freebie: {
      icon: "🎀",
      color: "pink",
      label: "Free Gift",
      description: "Free product with purchase",
    },
  };
  return types[props.promotion.type] || types.bogo;
});

// Format date
function formatDate(dateString?: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString();
}

// Format days of week
function formatDaysOfWeek(days?: number[]): string {
  if (!days || days.length === 0) return "All days";
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.map((d) => dayNames[d]).join(", ");
}

// Get trigger products
const triggerProducts = computed(() => {
  if (!props.promotion) return [];
  return props.promotion.triggerProductIds
    .map((id) => productsStore.getProduct(id))
    .filter((p) => p !== undefined);
});

// Get reward products
const rewardProducts = computed(() => {
  if (!props.promotion) return [];
  return props.promotion.rewardProductIds
    .map((id) => productsStore.getProduct(id))
    .filter((p) => p !== undefined);
});

// Active tab for details vs usage history
const activeTab = ref<"details" | "usage">("details");

const tabs = [
  { key: "details", label: "Details", icon: "i-heroicons-information-circle" },
  { key: "usage", label: "Usage History", icon: "i-heroicons-chart-bar" },
];
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          v-if="typeInfo"
          class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          :class="`bg-${typeInfo.color}-100 dark:bg-${typeInfo.color}-900/20`"
        >
          {{ typeInfo.icon }}
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ promotion?.name || "Promotion Details" }}
          </h3>
          <p v-if="typeInfo" class="text-sm text-gray-500 dark:text-gray-400">
            {{ typeInfo.description }}
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <!-- Tabs -->
      <div class="border-b border-gray-200 dark:border-gray-800 mb-6">
        <nav class="flex space-x-8 px-1" aria-label="Tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="[
              activeTab == tab.key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
              'group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
            ]"
            @click="activeTab = tab.key"
          >
            <UIcon :name="tab.icon" class="w-5 h-5" />
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Details Tab -->
      <div v-if="promotion && activeTab == 'details'" class="space-y-6">
        <!-- Status & Priority -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {{ t("common.status", "Status") }}
            </label>
            <UBadge
              :color="getStatusColor(promotion.status)"
              :label="getStatusText(promotion.status)"
              size="lg"
            />
          </div>
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {{ t("promotions.priority", "Priority") }}
            </label>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ promotion.priority }}
            </div>
          </div>
        </div>

        <!-- Date Range -->
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {{ t("promotions.dateRange", "Date Range") }}
          </label>
          <div class="flex items-center gap-2 text-gray-900 dark:text-white">
            <span>{{ formatDate(promotion.startDate) }}</span>
            <UIcon
              name="i-heroicons-arrow-right"
              class="w-4 h-4 text-gray-400"
            />
            <span>{{ formatDate(promotion.endDate) }}</span>
          </div>
        </div>

        <!-- Days of Week -->
        <div v-if="promotion.daysOfWeek && promotion.daysOfWeek.length > 0">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {{ t("promotions.daysOfWeek", "Active Days") }}
          </label>
          <div class="text-gray-900 dark:text-white">
            {{ formatDaysOfWeek(promotion.daysOfWeek) }}
          </div>
        </div>

        <!-- Scope -->
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {{ t("promotions.scope", "Scope") }}
          </label>
          <UBadge
            :label="
              promotion.scope === 'all'
                ? 'All Products'
                : promotion.scope === 'products'
                ? 'Specific Products'
                : 'Categories'
            "
            variant="subtle"
          />
        </div>

        <!-- Trigger Products -->
        <div v-if="triggerProducts.length > 0">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {{ t("promotions.triggerProducts", "Trigger Products") }}
            <span class="text-xs text-gray-500">
              (Buy {{ promotion.triggerQuantity }}×)
            </span>
          </label>
          <div class="space-y-2">
            <div
              v-for="product in triggerProducts"
              :key="product.id"
              class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div class="text-2xl">
                <img
                  v-if="product.image && product.image.startsWith('http')"
                  :src="product.image"
                  :alt="product.name"
                  class="object-cover rounded-lg w-24 h-24"
                />
                <div
                  v-else
                  class="w-24 h-24 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg"
                >
                  <span class="text-3xl">
                    {{ "📦" }}
                  </span>
                </div>
              </div>
              <div class="flex-1">
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ product.name }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ product.sku }}
                </div>
              </div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ product.price }}
              </div>
            </div>
          </div>
        </div>

        <!-- Reward/Discount Details -->
        <div
          class="p-4 bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800"
        >
          <label
            class="block text-sm font-medium text-green-800 dark:text-green-300 mb-3"
          >
            {{ t("promotions.reward", "Reward") }}
          </label>

          <!-- BOGO/Freebie Reward -->
          <div v-if="promotion.type === 'bogo' || promotion.type === 'freebie'">
            <div
              class="text-lg font-semibold text-green-700 dark:text-green-300 mb-3"
            >
              Get {{ promotion.rewardQuantity }}× FREE
            </div>
            <div class="space-y-2">
              <div
                v-for="product in rewardProducts"
                :key="product.id"
                class="flex items-center gap-3 p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg"
              >
                <div class="text-2xl">
                  <div v-if="product.image && product.image.startsWith('http')">
                    <img
                      :src="product.image"
                      :alt="product.name"
                      class="object-cover rounded-lg w-24 h-24"
                    />
                  </div>
                  <span v-else>🎁</span>
                </div>
                <div class="flex-1">
                  <div class="font-medium text-gray-900 dark:text-white">
                    {{ product.name }}
                  </div>
                </div>
                <div
                  class="text-sm font-medium text-green-600 dark:text-green-400"
                >
                  FREE ({{ product.price }} value)
                </div>
              </div>
            </div>
          </div>

          <!-- Discount Reward -->
          <div v-else-if="promotion.type === 'discount'">
            <div class="text-2xl font-bold text-green-700 dark:text-green-300">
              <span v-if="promotion.discountType === 'percentage'">
                {{ promotion.discountValue }}% OFF
              </span>
              <span v-else> ฿{{ promotion.discountValue }} OFF </span>
            </div>
          </div>

          <!-- Tiered Reward -->
          <div v-else-if="promotion.type === 'tiered' && promotion.tiers">
            <div class="space-y-2">
              <div
                v-for="(tier, index) in promotion.tiers"
                :key="index"
                class="flex items-center justify-between p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg"
              >
                <div>
                  <span class="font-medium text-gray-900 dark:text-white">
                    Buy {{ tier.minQuantity }}+
                  </span>
                </div>
                <div
                  class="text-lg font-semibold text-green-600 dark:text-green-400"
                >
                  <span v-if="tier.discountType === 'percentage'">
                    {{ tier.discountValue }}% OFF
                  </span>
                  <span v-else> ฿{{ tier.discountValue }} OFF </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bundle Reward -->
          <div v-else-if="promotion.type === 'bundle'">
            <div class="text-2xl font-bold text-green-700 dark:text-green-300">
              {{ promotion.discountValue }}% OFF Bundle
            </div>
          </div>
        </div>

        <!-- Usage Limits -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {{ t("promotions.usageCount", "Times Used") }}
            </label>
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ promotion.usageCount }}
              <span v-if="promotion.maxUsesTotal" class="text-sm text-gray-400">
                / {{ promotion.maxUsesTotal }}
              </span>
            </div>
          </div>
          <div v-if="promotion.maxUsesPerOrder">
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {{ t("promotions.maxPerOrder", "Max Per Order") }}
            </label>
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ promotion.maxUsesPerOrder }}
            </div>
          </div>
        </div>

        <!-- Description -->
        <div v-if="promotion.description">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {{ t("common.description", "Description") }}
          </label>
          <div class="text-gray-700 dark:text-gray-300">
            {{ promotion.description }}
          </div>
        </div>

        <!-- Metadata -->
        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="flex flex-col">
              <span class="text-gray-500 dark:text-gray-400">Created:</span>
              <span class="text-gray-900 dark:text-white">
                {{ $d(new Date(promotion.createdAt || ""), "long") }}
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-gray-500 dark:text-gray-400">Updated:</span>
              <span class="text-gray-900 dark:text-white">
                {{ $d(new Date(promotion.updatedAt || ""), "long") }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Usage History Tab -->
      <div v-if="promotion && activeTab === 'usage'">
        <ProductsPromotionUsageHistory :promotion="promotion" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton
          color="gray"
          variant="outline"
          :label="t('common.close', 'Close')"
          @click="isOpen = false"
        />
      </div>
    </template>
  </UModal>
</template>
