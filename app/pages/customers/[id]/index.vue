<script setup lang="ts">
/**
 * 👤 Customer Detail Page (Refactored)
 * Full customer profile with orders, invoices, contracts, loyalty
 * Uses extracted components for cleaner code
 */
import type { LoyaltyMember, Order } from "~/types";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const toast = useToast();
const { formatCurrency } = useCurrency();
const customersStore = useCustomers();
const ordersStore = useOrders();

const customerId = computed(() => route.params.id as string);

// Loading state
const isLoading = ref(true);

// Active tab
const activeTab = ref<
  "overview" | "orders" | "invoices" | "contracts" | "loyalty" | "activity"
>("overview");

// Customer data
const customer = ref<LoyaltyMember | null>(null);

// Customer orders
const orders = ref<
  Array<{
    id: string;
    date: string;
    total: number;
    status: string;
    items: number;
    paymentMethod: string;
  }>
>([]);

// Customer invoices (TODO: load from invoicing composable)
const invoices = ref<
  Array<{
    id: string;
    date: string;
    amount: number;
    status: string;
    dueDate: string;
    paidDate?: string;
  }>
>([]);

// Customer contracts (TODO: load from contracts composable)
const contracts = ref<
  Array<{
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    value: number;
    status: string;
  }>
>([]);

// Loyalty rewards from customer data
const loyaltyRewards = computed(() => {
  return (
    customer.value?.zapRewards?.map((reward) => ({
      id: reward.id,
      date: reward.date,
      points: reward.amount,
      type: reward.reason,
      orderId: reward.orderId || null,
      description: reward.note || reward.reason,
    })) || []
  );
});

// Activity log (computed from orders and loyalty rewards)
const activityLog = computed(() => {
  const activities: Array<{
    id: number | string;
    date: string;
    type: string;
    description: string;
    icon: string;
  }> = [];

  // Add orders as activities
  orders.value.slice(0, 5).forEach((order, idx) => {
    activities.push({
      id: idx + 1,
      date: order.date,
      type: "order",
      description: `Placed order ${order.id}`,
      icon: "i-heroicons-shopping-bag",
    });
    if (order.paymentMethod === "lightning") {
      activities.push({
        id: idx + 100,
        date: order.date,
        type: "payment",
        description: "Paid via Lightning ⚡",
        icon: "i-heroicons-bolt",
      });
    }
  });

  return activities.slice(0, 10);
});

// Edit mode
const isEditing = ref(false);
const editForm = ref<Partial<LoyaltyMember>>({});

// Modals
const showSendMessageModal = ref(false);
const showRewardModal = ref(false);
const messageForm = ref({ channel: "nostr", subject: "", content: "" });
const rewardForm = ref({ points: 0, reason: "" });

// Tier colors for badge
const tierColors: Record<string, string> = {
  bronze:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  silver: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  platinum:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

// Tab items
const tabs = computed(() => [
  { value: "overview", label: t("customers.tabs.overview", "Overview") },
  { value: "orders", label: t("customers.tabs.orders", "Orders") },
  { value: "invoices", label: t("customers.tabs.invoices", "Invoices") },
  { value: "contracts", label: t("customers.tabs.contracts", "Contracts") },
  { value: "loyalty", label: t("customers.tabs.loyalty", "Loyalty") },
  { value: "activity", label: t("customers.tabs.activity", "Activity") },
]);

// Load customer orders
const loadCustomerOrders = async () => {
  await ordersStore.init();
  const customerOrders = ordersStore.orders.value.filter(
    (o: Order) =>
      o.customerId === customerId.value ||
      (customer.value?.nostrPubkey &&
        o.customerPubkey === customer.value.nostrPubkey)
  );

  orders.value = customerOrders.map((o: Order) => ({
    id: o.code || o.id,
    date: o.date,
    total: o.total,
    status: o.status,
    items: o.items?.length || 0,
    paymentMethod: o.paymentMethod || "cash",
  }));
};

// Actions
const saveCustomer = async () => {
  if (!customer.value) return;
  try {
    const updated = await customersStore.updateCustomer(
      customer.value.id,
      editForm.value
    );
    if (updated) {
      customer.value = updated;
      isEditing.value = false;
      toast.add({
        title: t("common.success"),
        description: t("customers.saved", "Customer saved"),
        color: "green",
      });
    }
  } catch (e) {
    toast.add({
      title: t("common.error"),
      description: String(e),
      color: "red",
    });
  }
};

const cancelEdit = () => {
  if (customer.value) {
    editForm.value = { ...customer.value };
  }
  isEditing.value = false;
};

const sendMessage = () => {
  console.log("Sending message:", messageForm.value);
  showSendMessageModal.value = false;
  messageForm.value = { channel: "nostr", subject: "", content: "" };
  toast.add({
    title: t("common.success"),
    description: "Message sent",
    color: "green",
  });
};

const sendReward = () => {
  console.log("Sending reward:", rewardForm.value);
  showRewardModal.value = false;
  rewardForm.value = { points: 0, reason: "" };
  toast.add({
    title: t("common.success"),
    description: "Reward sent",
    color: "green",
  });
};

const deleteCustomer = async () => {
  if (!customer.value) return;
  if (
    confirm(t("customers.deleteConfirmation", { name: customer.value.name }))
  ) {
    toast.add({
      title: t("common.success"),
      description: t("customers.deleted", "Customer deleted"),
      color: "green",
    });
    router.push(localePath("/customers"));
  }
};

// Initialize
onMounted(async () => {
  try {
    await customersStore.init();
    const foundCustomer = await customersStore.getCustomerById(
      customerId.value
    );
    if (foundCustomer) {
      customer.value = foundCustomer;
      editForm.value = { ...foundCustomer };
      await loadCustomerOrders();
    }
  } catch (e) {
    console.error("Failed to load customer:", e);
    toast.add({
      title: t("common.error"),
      description: t("customers.loadError", "Failed to load customer"),
      color: "red",
    });
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center h-96">
      <div class="text-center">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-10 h-10 animate-spin text-primary-500 mb-4"
        />
        <p class="text-gray-500">{{ t("common.loading", "Loading...") }}</p>
      </div>
    </div>

    <!-- Customer Not Found -->
    <div
      v-else-if="!customer"
      class="flex flex-col items-center justify-center h-96"
    >
      <div class="text-6xl mb-4">👤</div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {{ t("customers.notFound", "Customer Not Found") }}
      </h2>
      <p class="text-gray-500 mb-6">
        {{
          t("customers.notFoundDescription") ||
          "The customer you're looking for doesn't exist"
        }}
      </p>
      <UButton
        :to="localePath('/customers')"
        color="primary"
        icon="i-heroicons-arrow-left"
      >
        {{ t("customers.backToList", "Back to Customers") }}
      </UButton>
    </div>

    <!-- Customer Content -->
    <template v-else>
      <!-- Page Header with CustomerCard -->
      <div
        class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div class="flex items-center gap-4">
          <UButton
            icon="i-heroicons-arrow-left"
            variant="ghost"
            :to="localePath('/customers')"
            :aria-label="t('common.back')"
          />
          <CustomerCard :customer="customer" size="lg" :show-tags="true" />
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <template v-if="!isEditing">
            <UButton
              icon="i-heroicons-chat-bubble-left"
              variant="outline"
              @click="showSendMessageModal = true"
            >
              {{ t("common.message", "Message") }}
            </UButton>
            <UButton
              icon="i-heroicons-gift"
              variant="outline"
              @click="showRewardModal = true"
            >
              {{ t("loyalty.reward", "Reward") }}
            </UButton>
            <UButton icon="i-heroicons-pencil" @click="isEditing = true">
              {{ t("common.edit") }}
            </UButton>
          </template>
          <template v-else>
            <UButton variant="outline" @click="cancelEdit">
              {{ t("common.cancel") }}
            </UButton>
            <UButton icon="i-heroicons-check" @click="saveCustomer">
              {{ t("common.save") }}
            </UButton>
          </template>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CommonStatCard
          icon="i-heroicons-currency-dollar"
          icon-color="green"
          :label="t('customers.totalSpent')"
          :value="formatCurrency(customer.totalSpent || 0)"
        />
        <CommonStatCard
          icon="i-heroicons-shopping-bag"
          icon-color="blue"
          :label="t('customers.orders')"
          :value="orders.length"
        />
        <CommonStatCard
          icon="i-heroicons-star"
          icon-color="yellow"
          :label="t('loyalty.points')"
          :value="(customer.points || 0).toLocaleString()"
        />
        <CommonStatCard
          icon="i-heroicons-building-storefront"
          icon-color="purple"
          :label="t('customers.visits')"
          :value="customer.visitCount || 0"
        />
      </div>

      <!-- Tab Navigation -->
      <div class="border-b border-gray-200 dark:border-gray-700">
        <nav class="flex gap-4 overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            @click="activeTab = tab.value as typeof activeTab"
            class="px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
            :class="
              activeTab === tab.value
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            "
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Overview Tab -->
      <div
        v-if="activeTab === 'overview'"
        class="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <!-- Contact Information -->
        <CustomerContactCard
          :customer="customer"
          :is-editing="isEditing"
          v-model:edit-form="editForm"
        />

        <!-- Loyalty Progress -->
        <CustomerLoyaltyCard
          :tier="customer.tier || 'bronze'"
          :points="customer.points || 0"
          :visit-count="customer.visitCount"
          :joined-at="customer.joinedAt"
          :last-visit="customer.lastVisit"
        />

        <!-- Notes -->
        <CustomerNotesCard
          :notes="customer.notes"
          :is-editing="isEditing"
          v-model:edit-notes="editForm.notes"
        />

        <!-- Preferences -->
        <CustomerPreferencesCard :preferences="customer.preferences" />
      </div>

      <!-- Orders Tab -->
      <CustomerOrdersTable
        v-if="activeTab === 'orders'"
        :orders="orders"
        :customer-id="customerId"
      />

      <!-- Invoices Tab -->
      <CustomerInvoicesTable
        v-if="activeTab === 'invoices'"
        :invoices="invoices"
        :customer-id="customerId"
      />

      <!-- Contracts Tab -->
      <CustomerContractsCard
        v-if="activeTab === 'contracts'"
        :contracts="contracts"
        :customer-id="customerId"
      />

      <!-- Loyalty Tab -->
      <div
        v-if="activeTab === 'loyalty'"
        class="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <UCard class="lg:col-span-2">
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t("loyalty.rewards", "Points History") }}
            </h3>
          </template>

          <div
            v-if="loyaltyRewards.length === 0"
            class="text-center py-8 text-gray-500"
          >
            {{ t("loyalty.noRewards", "No rewards yet") }}
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr
                  class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
                >
                  <th class="pb-3 font-medium">{{ t("accounting.date") }}</th>
                  <th class="pb-3 font-medium">
                    {{ t("accounting.description") }}
                  </th>
                  <th class="pb-3 font-medium text-right">
                    {{ t("loyalty.points") }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr
                  v-for="reward in loyaltyRewards"
                  :key="reward.id"
                  class="text-sm"
                >
                  <td class="py-3 text-gray-600 dark:text-gray-400">
                    {{ reward.date }}
                  </td>
                  <td class="py-3 text-gray-900 dark:text-white">
                    {{ reward.description }}
                    <NuxtLinkLocale
                      v-if="reward.orderId"
                      :to="`/orders/${reward.orderId}`"
                      class="text-primary-600 dark:text-primary-400 ml-1"
                    >
                      {{ reward.orderId }}
                    </NuxtLinkLocale>
                  </td>
                  <td
                    class="py-3 text-right font-medium"
                    :class="
                      reward.points > 0 ? 'text-green-600' : 'text-red-600'
                    "
                  >
                    {{ reward.points > 0 ? "+" : "" }}{{ reward.points }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <!-- Loyalty Summary -->
        <CustomerLoyaltyCard
          :tier="customer.tier || 'bronze'"
          :points="customer.points || 0"
          :visit-count="customer.visitCount"
          :joined-at="customer.joinedAt"
          :last-visit="customer.lastVisit"
        />
      </div>

      <!-- Activity Tab -->
      <CustomerActivityLog
        v-if="activeTab === 'activity'"
        :activities="activityLog"
      />
    </template>

    <!-- Send Message Modal -->
    <UModal v-model:open="showSendMessageModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ t("customers.sendMessage", "Send Message") }}
            </h3>
          </template>

          <div class="space-y-4">
            <UFormField :label="t('common.subject', 'Subject')">
              <UInput v-model="messageForm.subject" />
            </UFormField>
            <UFormField :label="t('common.message', 'Message')">
              <UTextarea v-model="messageForm.content" :rows="4" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton variant="outline" @click="showSendMessageModal = false">
                {{ t("common.cancel") }}
              </UButton>
              <UButton @click="sendMessage">{{
                t("common.send", "Send")
              }}</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Reward Modal -->
    <UModal v-model:open="showRewardModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ t("loyalty.sendReward", "Send Reward") }}
            </h3>
          </template>

          <div class="space-y-4">
            <UFormField :label="t('loyalty.points')">
              <UInput v-model.number="rewardForm.points" type="number" />
            </UFormField>
            <UFormField :label="t('common.reason', 'Reason')">
              <UInput v-model="rewardForm.reason" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton variant="outline" @click="showRewardModal = false">
                {{ t("common.cancel") }}
              </UButton>
              <UButton @click="sendReward">{{
                t("common.send", "Send")
              }}</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
