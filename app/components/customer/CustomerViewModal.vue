<script setup lang="ts">
/**
 * 👁️ Customer View Modal Component
 * Quick view modal for customer details from list page
 */
import type { LoyaltyMember } from "~/types";

interface Props {
  customer: LoyaltyMember | null;
}

defineProps<Props>();

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  edit: [customer: LoyaltyMember];
  delete: [customer: LoyaltyMember];
}>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();
const localePath = useLocalePath();

// Tier colors
const getTierColor = (tier?: string) => {
  const colors: Record<string, "orange" | "gray" | "yellow" | "purple"> = {
    bronze: "orange",
    silver: "gray",
    gold: "yellow",
    platinum: "purple",
  };
  return colors[tier || "bronze"] || "orange";
};

// Get initials for avatar
const getInitials = (customer: LoyaltyMember) => {
  if (!customer.name && !customer.nostrPubkey) return "?";
  return (customer.name || customer.nostrPubkey || "?").charAt(0).toUpperCase();
};
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard v-if="customer">
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl"
            >
              {{ getInitials(customer) }}
            </div>
            <div>
              <h3 class="text-lg font-medium">
                {{
                  customer.name || `${customer.nostrPubkey?.slice(0, 12)}...`
                }}
              </h3>
              <UBadge
                :color="getTierColor(customer.tier)"
                :label="t(`loyalty.${customer.tier || 'bronze'}`)"
              />
            </div>
          </div>
        </template>

        <div class="space-y-6">
          <!-- Contact Info -->
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white mb-3">
              {{ t("customers.contactInfo") }}
            </h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div v-if="customer.email">
                <p class="text-gray-500 dark:text-gray-400">
                  {{ t("customers.email") }}
                </p>
                <p class="font-medium">{{ customer.email }}</p>
              </div>
              <div v-if="customer.phone">
                <p class="text-gray-500 dark:text-gray-400">
                  {{ t("customers.phone") }}
                </p>
                <p class="font-medium">{{ customer.phone }}</p>
              </div>
              <div
                v-if="customer.lud16 || customer.lightningAddress"
                class="col-span-2"
              >
                <p class="text-gray-500 dark:text-gray-400">
                  {{ t("customers.lightningAddress") }}
                </p>
                <p class="font-medium text-orange-500">
                  ⚡ {{ customer.lud16 || customer.lightningAddress }}
                </p>
              </div>
              <div v-if="customer.nostrPubkey" class="col-span-2">
                <p class="text-gray-500 dark:text-gray-400">Nostr Pubkey</p>
                <p class="font-mono text-xs break-all">
                  {{ customer.nostrPubkey }}
                </p>
              </div>
            </div>
          </div>

          <!-- Loyalty Stats -->
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white mb-3">
              {{ t("loyalty.stats") }}
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center"
              >
                <p class="text-2xl font-bold text-primary-500">
                  {{ customer.points?.toLocaleString() || 0 }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ t("loyalty.points") }}
                </p>
              </div>
              <div
                class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center"
              >
                <p class="text-2xl font-bold text-green-500">
                  {{ customer.totalOrders || 0 }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ t("customers.orders") }}
                </p>
              </div>
              <div
                class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center"
              >
                <p class="text-2xl font-bold text-blue-500">
                  {{ customer.visitCount || 0 }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ t("customers.visits") }}
                </p>
              </div>
              <div
                class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center"
              >
                <p class="text-lg font-bold text-purple-500">
                  {{ formatCurrency(customer.totalSpent || 0) }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ t("customers.totalSpent") }}
                </p>
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div v-if="customer.tags?.length">
            <h4 class="font-medium text-gray-900 dark:text-white mb-3">
              {{ t("customers.tags") }}
            </h4>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="tag in customer.tags"
                :key="tag"
                :color="
                  tag === 'vip'
                    ? 'yellow'
                    : tag === 'lightning'
                    ? 'orange'
                    : 'neutral'
                "
              >
                {{ tag }}
              </UBadge>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="customer.notes">
            <h4 class="font-medium text-gray-900 dark:text-white mb-3">
              {{ t("customers.notes") }}
            </h4>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              {{ customer.notes }}
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-between">
            <UButton
              color="neutral"
              variant="ghost"
              :label="t('customers.viewOrders')"
              icon="i-heroicons-shopping-bag"
              :to="localePath(`/orders?customer=${customer.id}`)"
            />
            <UButton
              color="neutral"
              variant="outline"
              :label="t('common.close')"
              @click="open = false"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
