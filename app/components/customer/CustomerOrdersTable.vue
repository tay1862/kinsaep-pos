<script setup lang="ts">
/**
 * 🛒 Customer Orders Table Component
 * Displays customer order history with status badges
 */

interface Order {
  id: string;
  date: string;
  total: number;
  status: string;
  items: number;
  paymentMethod: string;
}

interface Props {
  orders: Order[];
  customerId: string;
}

defineProps<Props>();

const emit = defineEmits<{
  newOrder: [];
}>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();
const localePath = useLocalePath();

// Status colors
const statusColors: Record<string, string> = {
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  processing:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ t("orders.title") }}
        </h3>
        <UButton
          size="sm"
          icon="i-heroicons-plus"
          :to="localePath('/orders/create')"
          @click="emit('newOrder')"
        >
          {{ t("orders.newOrder") }}
        </UButton>
      </div>
    </template>

    <!-- Empty State -->
    <div
      v-if="orders.length === 0"
      class="text-center py-8 text-gray-500 dark:text-gray-400"
    >
      <UIcon
        name="i-heroicons-shopping-bag"
        class="w-12 h-12 mx-auto mb-2 opacity-50"
      />
      <p>{{ t("orders.noOrders", "No orders yet") }}</p>
    </div>

    <!-- Orders Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr
            class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
          >
            <th class="pb-3 font-medium">{{ t("orders.id") }}</th>
            <th class="pb-3 font-medium">{{ t("orders.date") }}</th>
            <th class="pb-3 font-medium text-center">{{ t("pos.items") }}</th>
            <th class="pb-3 font-medium text-right">{{ t("orders.total") }}</th>
            <th class="pb-3 font-medium">{{ t("pos.paymentMethod") }}</th>
            <th class="pb-3 font-medium">{{ t("orders.status") }}</th>
            <th class="pb-3 font-medium text-right">
              {{ t("common.actions") }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
          <tr v-for="order in orders" :key="order.id" class="text-sm">
            <td class="py-3 font-medium text-primary-600 dark:text-primary-400">
              <NuxtLinkLocale :to="`/orders/${order.id}`">
                {{ order.id }}
              </NuxtLinkLocale>
            </td>
            <td class="py-3 text-gray-600 dark:text-gray-400">
              {{ order.date }}
            </td>
            <td class="py-3 text-center">{{ order.items }}</td>
            <td
              class="py-3 text-right font-medium text-gray-900 dark:text-white"
            >
              {{ formatCurrency(order.total) }}
            </td>
            <td class="py-3">
              <span class="flex items-center gap-1">
                <UIcon
                  v-if="order.paymentMethod === 'lightning'"
                  name="i-heroicons-bolt"
                  class="text-amber-500"
                />
                {{ order.paymentMethod }}
              </span>
            </td>
            <td class="py-3">
              <span
                :class="statusColors[order.status] || statusColors.pending"
                class="px-2 py-0.5 rounded-full text-xs font-medium"
              >
                {{ order.status }}
              </span>
            </td>
            <td class="py-3 text-right">
              <UButton
                size="xs"
                variant="ghost"
                icon="i-heroicons-eye"
                :to="localePath(`/orders/${order.id}`)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
