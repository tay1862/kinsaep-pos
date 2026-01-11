<!-- components/products/PromotionTableRow.vue -->
<script setup lang="ts">
import type { Promotion } from "~/types";

interface Props {
  promotion: Promotion;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  toggleStatus: [promotion: Promotion];
  delete: [promotion: Promotion];
  viewDetails: [promotion: Promotion];
}>();

const { t } = useI18n();
const { getProductName, getStatusColor, getStatusText } = usePromotionHelpers();

// Type display info
const typeInfo = computed(() => {
  const types: Record<string, { icon: string; color: string; label: string }> =
    {
      bogo: { icon: "🎁", color: "green", label: "BOGO" },
      discount: { icon: "💰", color: "blue", label: "Discount" },
      tiered: { icon: "📊", color: "purple", label: "Tiered" },
      bundle: { icon: "📦", color: "amber", label: "Bundle" },
      freebie: { icon: "🎀", color: "pink", label: "Free Gift" },
    };
  return types[props.promotion.type] || types.bogo;
});

// Get promotion description based on type
const triggerDescription = computed(() => {
  const p = props.promotion;
  switch (p.type) {
    case "bogo":
    case "freebie":
      const productName = getProductName(p.triggerProductIds[0] || "");
      const extra =
        p.triggerProductIds.length > 1
          ? ` +${p.triggerProductIds.length - 1}`
          : "";
      return `Buy ${p.triggerQuantity}× ${productName}${extra}`;
    case "discount":
      if (p.triggerProductIds.length > 0) {
        return `${p.triggerProductIds.length} product(s)`;
      }
      return "All products";
    case "tiered":
      return `${p.tiers?.length || 0} tier levels`;
    case "bundle":
      return `${p.triggerProductIds.length} products`;
    default:
      return "-";
  }
});

const rewardDescription = computed(() => {
  const p = props.promotion;
  switch (p.type) {
    case "bogo":
    case "freebie":
      const productName = getProductName(p.rewardProductIds[0] || "");
      return `Get ${p.rewardQuantity}× ${productName} FREE`;
    case "discount":
      if (p.discountType === "percentage") {
        return `${p.discountValue}% off`;
      }
      return `฿${p.discountValue} off`;
    case "tiered":
      if (p.tiers && p.tiers.length > 0) {
        const firstTier = p.tiers[0];
        const lastTier = p.tiers[p.tiers.length - 1];
        if (firstTier && lastTier) {
          return `${firstTier.discountValue}% → ${lastTier.discountValue}%`;
        }
      }
      return "-";
    case "bundle":
      return `${p.discountValue || 0}% off bundle`;
    default:
      return "-";
  }
});

const statusColor = computed(() => getStatusColor(props.promotion.status));
const statusText = computed(() => getStatusText(props.promotion.status));

// Check if promotion has time restrictions
const hasRestrictions = computed(() => {
  const p = props.promotion;
  return (
    p.startDate ||
    p.endDate ||
    (p.daysOfWeek && p.daysOfWeek.length > 0) ||
    p.maxUsesTotal
  );
});

// Event handlers
function handleToggleStatus() {
  emit("toggleStatus", props.promotion);
}

function handleDelete() {
  emit("delete", props.promotion);
}

function handleViewDetails() {
  emit("viewDetails", props.promotion);
}
</script>

<template>
  <tr
    class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
  >
    <!-- Name & Type Column -->
    <td class="py-3 px-4">
      <div class="flex items-start gap-3">
        <div
          class="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          :class="`bg-${typeInfo.color}-100 dark:bg-${typeInfo.color}-900/20`"
        >
          {{ typeInfo.icon }}
        </div>
        <div>
          <div class="font-medium text-gray-900 dark:text-white">
            {{ promotion.name }}
          </div>
          <div class="flex items-center gap-2 mt-0.5">
            <UBadge :color="typeInfo.color" variant="subtle" size="xs">
              {{ typeInfo.label }}
            </UBadge>
            <span v-if="hasRestrictions" class="text-xs text-gray-400">
              <UIcon name="i-heroicons-clock" class="w-3 h-3 inline" />
            </span>
          </div>
        </div>
      </div>
    </td>

    <!-- Trigger Column -->
    <td class="py-3 px-4">
      <div class="text-sm text-gray-700 dark:text-gray-300">
        {{ triggerDescription }}
      </div>
    </td>

    <!-- Reward/Discount Column -->
    <td class="py-3 px-4">
      <div class="text-sm">
        <span
          v-if="promotion.type === 'bogo' || promotion.type === 'freebie'"
          class="text-green-600 dark:text-green-400 font-medium"
        >
          {{ rewardDescription }}
        </span>
        <span v-else class="text-blue-600 dark:text-blue-400 font-medium">
          {{ rewardDescription }}
        </span>
      </div>
    </td>

    <!-- Status Column -->
    <td class="py-3 px-4">
      <UBadge :color="statusColor" :label="statusText" />
    </td>

    <!-- Uses Column -->
    <td class="py-3 px-4">
      <div class="text-sm">
        <span class="font-medium text-gray-900 dark:text-white">
          {{ promotion.usageCount }}
        </span>
        <span v-if="promotion.maxUsesTotal" class="text-gray-400">
          / {{ promotion.maxUsesTotal }}
        </span>
      </div>
    </td>

    <!-- Actions Column -->
    <td class="py-3 px-4">
      <div class="flex items-center gap-2">
        <UButton
          color="gray"
          variant="ghost"
          size="sm"
          icon="i-heroicons-eye"
          :disabled="isLoading"
          @click="handleViewDetails"
        />
        <USwitch
          :model-value="promotion.status === 'active'"
          size="sm"
          :disabled="isLoading"
          @update:model-value="handleToggleStatus"
        />
        <UButton
          color="red"
          variant="ghost"
          size="sm"
          icon="i-heroicons-trash"
          :disabled="isLoading"
          @click="handleDelete"
        />
      </div>
    </td>
  </tr>
</template>
