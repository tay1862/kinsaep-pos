<!-- components/products/PromotionTable.vue -->
<script setup lang="ts">
import type { Promotion } from "~/types";

interface Props {
  promotions: Promotion[];
  isLoading?: boolean;
}

withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  toggleStatus: [promotion: Promotion];
  delete: [promotion: Promotion];
  create: [];
  viewDetails: [promotion: Promotion];
}>();

const { t } = useI18n();
const { getProductName } = usePromotionHelpers();

// Get trigger description for mobile view
function getTriggerDescription(promotion: Promotion): string {
  switch (promotion.type) {
    case "bogo":
    case "freebie":
      const productName = getProductName(promotion.triggerProductIds[0] || "");
      const extra =
        promotion.triggerProductIds.length > 1
          ? ` +${promotion.triggerProductIds.length - 1}`
          : "";
      return `${t("common.buy", "Buy")} ${promotion.triggerQuantity}× ${productName}${extra}`;
    case "discount":
      if (promotion.triggerProductIds.length > 0) {
        return `${promotion.triggerProductIds.length} ${t("products.title", "products")}`;
      }
      return t("promotions.allProducts", "All products");
    case "tiered":
      return `${promotion.tiers?.length || 0} ${t("promotions.tiers", "tiers")}`;
    case "bundle":
      return `${promotion.triggerProductIds.length} ${t("products.title", "products")}`;
    default:
      return "-";
  }
}

// Get reward description for mobile view
function getRewardDescription(promotion: Promotion): string {
  switch (promotion.type) {
    case "bogo":
    case "freebie":
      const productName = getProductName(promotion.rewardProductIds[0] || "");
      return `${t("promotions.getFree", "Get")} ${promotion.rewardQuantity}× ${productName} ${t("promotions.free", "FREE")}`;
    case "discount":
      if (promotion.discountType === "percentage") {
        return `${promotion.discountValue}% ${t("common.off", "off")}`;
      }
      return `฿${promotion.discountValue} ${t("common.off", "off")}`;
    case "tiered":
      if (promotion.tiers && promotion.tiers.length > 0) {
        const firstTier = promotion.tiers[0];
        const lastTier = promotion.tiers[promotion.tiers.length - 1];
        if (firstTier && lastTier) {
          return `${firstTier.discountValue}% → ${lastTier.discountValue}%`;
        }
      }
      return "-";
    case "bundle":
      return `${promotion.discountValue || 0}% ${t("common.off", "off")}`;
    default:
      return "-";
  }
}

// Event handlers
function handleToggleStatus(promotion: Promotion) {
  emit("toggleStatus", promotion);
}

function handleDelete(promotion: Promotion) {
  emit("delete", promotion);
}

function handleViewDetails(promotion: Promotion) {
  emit("viewDetails", promotion);
}
</script>

<template>
  <div class="px-4">
    <!-- Desktop Table View -->
    <div class="hidden lg:block overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ t("common.name", "Name") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ t("promotions.trigger", "Trigger") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ t("promotions.reward", "Reward") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ t("common.status", "Status") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ t("promotions.uses", "Uses") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ t("common.actions", "Actions") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Empty State -->
          <tr v-if="promotions.length === 0 && !isLoading">
            <td colspan="6" class="py-16 text-center">
              <div class="flex flex-col items-center">
                <div
                  class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4"
                >
                  <UIcon name="i-heroicons-gift" class="w-8 h-8 text-gray-400" />
                </div>
                <h3
                  class="text-lg font-medium text-gray-900 dark:text-white mb-2"
                >
                  {{ t("promotions.noPromotions", "No Promotions Yet") }}
                </h3>
                <p class="text-gray-500 mb-4">
                  {{
                    t(
                      "promotions.noPromotionsDescription",
                      "Create your first BOGO promotion to get started"
                    )
                  }}
                </p>
                <UButton
                  color="primary"
                  icon="i-heroicons-plus"
                  @click="emit('create')"
                >
                  {{ t("promotions.create", "Create Promotion") }}
                </UButton>
              </div>
            </td>
          </tr>

          <!-- Loading State -->
          <tr v-if="isLoading && promotions.length === 0">
            <td colspan="6" class="py-8">
              <div class="flex justify-center">
                <div
                  class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
                />
              </div>
            </td>
          </tr>

          <!-- Promotion Rows -->
          <ProductsPromotionTableRow
            v-for="promotion in promotions"
            :key="promotion.id"
            :promotion="promotion"
            :is-loading="isLoading"
            @toggle-status="handleToggleStatus"
            @delete="handleDelete"
            @view-details="handleViewDetails"
          />
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View -->
    <div class="lg:hidden space-y-3">
      <!-- Empty State -->
      <div v-if="promotions.length === 0 && !isLoading" class="py-16 text-center">
        <div class="flex flex-col items-center">
          <div
            class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4"
          >
            <UIcon name="i-heroicons-gift" class="w-8 h-8 text-gray-400" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {{ t("promotions.noPromotions", "No Promotions Yet") }}
          </h3>
          <p class="text-sm text-gray-500 mb-4 px-4">
            {{
              t(
                "promotions.noPromotionsDescription",
                "Create your first BOGO promotion to get started"
              )
            }}
          </p>
          <UButton
            color="primary"
            icon="i-heroicons-plus"
            @click="emit('create')"
          >
            {{ t("promotions.create", "Create Promotion") }}
          </UButton>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && promotions.length === 0" class="py-8">
        <div class="flex justify-center">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
          />
        </div>
      </div>

      <!-- Promotion Cards -->
      <div
        v-for="promotion in promotions"
        :key="promotion.id"
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <UIcon name="i-heroicons-gift" class="w-5 h-5 text-amber-500" />
              <h3 class="font-semibold text-gray-900 dark:text-white truncate">
                {{ promotion.name }}
              </h3>
            </div>
            <p v-if="promotion.description" class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {{ promotion.description }}
            </p>
          </div>
          <UBadge
            :color="promotion.status === 'active' ? 'green' : 'gray'"
            size="sm"
          >
            {{ t(`common.${promotion.status}`, promotion.status) }}
          </UBadge>
        </div>

        <!-- Details -->
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span class="text-gray-500 dark:text-gray-400">{{ t('promotions.trigger', 'Trigger') }}:</span>
            <p class="font-medium text-gray-900 dark:text-white mt-1">
              {{ getTriggerDescription(promotion) }}
            </p>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">{{ t('promotions.reward', 'Reward') }}:</span>
            <p class="font-medium text-gray-900 dark:text-white mt-1">
              {{ getRewardDescription(promotion) }}
            </p>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">{{ t('promotions.uses', 'Uses') }}:</span>
            <p class="font-medium text-gray-900 dark:text-white mt-1">
              {{ promotion.usageCount }}
              <span v-if="promotion.maxUsesTotal" class="text-gray-500">/ {{ promotion.maxUsesTotal }}</span>
            </p>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">{{ t('promotions.type', 'Type') }}:</span>
            <p class="font-medium text-gray-900 dark:text-white mt-1 capitalize">
              {{ promotion.type }}
            </p>
          </div>
        </div>

        <!-- Date Range -->
        <div v-if="promotion.startDate || promotion.endDate" class="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span v-if="promotion.startDate">{{ new Date(promotion.startDate).toLocaleDateString() }}</span>
          <span v-if="promotion.startDate && promotion.endDate"> - </span>
          <span v-if="promotion.endDate">{{ new Date(promotion.endDate).toLocaleDateString() }}</span>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <UButton
            color="primary"
            variant="soft"
            size="sm"
            icon="i-heroicons-eye"
            @click="emit('viewDetails', promotion)"
            block
          >
            {{ t('common.view', 'View') }}
          </UButton>
          <UButton
            :color="promotion.status === 'active' ? 'amber' : 'green'"
            variant="soft"
            size="sm"
            :icon="promotion.status === 'active' ? 'i-heroicons-pause' : 'i-heroicons-play'"
            @click="emit('toggleStatus', promotion)"
            block
          >
            {{ promotion.status === 'active' ? t('common.pause', 'Pause') : t('common.activate', 'Activate') }}
          </UButton>
          <UButton
            color="red"
            variant="soft"
            size="sm"
            icon="i-heroicons-trash"
            @click="emit('delete', promotion)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
