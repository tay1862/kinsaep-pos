<!-- pages/customers/index.vue -->
<!-- 👥 Customer Management with Nostr + Dexie Integration -->
<script setup lang="ts">
import type { LoyaltyMember, PaymentTerm } from "~/types";

definePageMeta({
  middleware: ["auth"],
});

useHead({
  title: "Customer",
});

const { t } = useI18n();
const toast = useToast();
const nostrData = useNostrData();
const localePath = useLocalePath();
const router = useRouter();

// Permissions
const { canViewCustomers, canEditCustomers } = usePermissions();

// Redirect if no permission
if (!canViewCustomers.value) {
  navigateTo("/");
}

// Use the customers composable with Nostr/Dexie integration
const customersStore = useCustomers();

// Payment terms
const paymentTerms = ref<PaymentTerm[]>([]);
const loadingTerms = ref(false);

const loadPaymentTerms = async () => {
  loadingTerms.value = true;
  try {
    const settings = await nostrData.getSettings();
    if (settings?.general?.paymentTerms?.length) {
      paymentTerms.value = settings.general.paymentTerms;
    } else {
      paymentTerms.value = [
        { id: "1", name: "Cash", days: 0, description: "Payment on delivery" },
        {
          id: "2",
          name: "Net 7",
          days: 7,
          description: "Payment due within 7 days",
        },
        {
          id: "3",
          name: "Net 30",
          days: 30,
          description: "Payment due within 30 days",
        },
      ];
    }
  } catch {
    paymentTerms.value = [];
  } finally {
    loadingTerms.value = false;
  }
};

const paymentTermOptions = computed(() => [
  { value: "none", label: t("common.none", "None") },
  ...paymentTerms.value.map((term) => ({
    value: term.id,
    label: `${term.name} (${term.days} days)`,
  })),
]);

// Initialize on mount
onMounted(async () => {
  await Promise.all([customersStore.init(), loadPaymentTerms()]);
});

// Filters
const searchQuery = ref("");
const selectedTier = ref("all");
const selectedTag = ref("all");
const selectedTab = ref("all"); // Controls top tabs: all, members, vip

const tierOptions = [
  { value: "all", label: t("common.all", "All") },
  { value: "bronze", label: t("loyalty.bronze", "Bronze") },
  { value: "silver", label: t("loyalty.silver", "Silver") },
  { value: "gold", label: t("loyalty.gold", "Gold") },
  { value: "platinum", label: t("loyalty.platinum", "Platinum") },
];

const tagOptions = [
  { value: "all", label: t("common.allTags", "All Tags") },
  { value: "vip", label: "VIP" },
  { value: "regular", label: t("customers.regular", "Regular") },
  { value: "lightning", label: "Lightning" },
  { value: "bitcoin", label: "Bitcoin" },
  { value: "new", label: t("customers.new", "New") },
];

const filteredCustomers = computed(() => {
  return customersStore.customers.value.filter((customer) => {
    // Search filter
    const matchesSearch =
      (customer.name?.toLowerCase() || "").includes(
        searchQuery.value.toLowerCase()
      ) ||
      customer.nostrPubkey
        ?.toLowerCase()
        .includes(searchQuery.value.toLowerCase()) ||
      (customer.email?.toLowerCase() || "").includes(
        searchQuery.value.toLowerCase()
      ) ||
      customer.phone?.includes(searchQuery.value);

    // Tier filter
    const matchesTier =
      selectedTier.value === "all" || customer.tier === selectedTier.value;

    // Tag filter
    const matchesTag =
      selectedTag.value === "all" || customer.tags?.includes(selectedTag.value);

    // Tab filter (members = has points, vip = has vip tag)
    let matchesTab = true;
    if (selectedTab.value === "members") {
      matchesTab = (customer.points || 0) > 0 || customer.tier !== "bronze";
    } else if (selectedTab.value === "vip") {
      matchesTab =
        customer.tags?.includes("vip") ||
        customer.tier === "platinum" ||
        customer.tier === "gold";
    }

    return matchesSearch && matchesTier && matchesTag && matchesTab;
  });
});

// Modal states
const showCustomerModal = ref(false);
const showViewModal = ref(false);
const showDeleteModal = ref(false);
const selectedCustomer = ref<LoyaltyMember | null>(null);
const customerToDelete = ref<LoyaltyMember | null>(null);
const viewingCustomer = ref<LoyaltyMember | null>(null);
const saving = ref(false);
const deleting = ref(false);

// Customer form
const customerForm = ref({
  name: "",
  email: "",
  phone: "",
  nostrPubkey: "",
  lud16: "",
  address: "",
  notes: "",
  tags: [] as string[],
  tier: "bronze" as "bronze" | "silver" | "gold" | "platinum",
  defaultPaymentTermId: "",
  creditLimit: 0,
});

// Tier options for form selector (without 'all')
const formTierOptions = [
  { value: "bronze", label: t("loyalty.bronze", "Bronze") },
  { value: "silver", label: t("loyalty.silver", "Silver") },
  { value: "gold", label: t("loyalty.gold", "Gold") },
  { value: "platinum", label: t("loyalty.platinum", "Platinum") },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
  }).format(amount);
};

const getTierColor = (tier?: string) => {
  const colors = {
    bronze: "amber",
    silver: "neutral",
    gold: "yellow",
    platinum: "violet",
  } as const;
  return colors[tier as keyof typeof colors] || "neutral";
};

const openCustomerModal = (customer?: LoyaltyMember) => {
  if (customer) {
    selectedCustomer.value = customer;
    customerForm.value = {
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      nostrPubkey: customer.nostrPubkey,
      lud16: customer.lud16 || "",
      address: customer.address || "",
      notes: customer.notes || "",
      tags: customer.tags || [],
      tier: customer.tier || "bronze",
      defaultPaymentTermId: customer.defaultPaymentTermId || "",
      creditLimit: customer.creditLimit || 0,
    };
  } else {
    selectedCustomer.value = null;
    customerForm.value = {
      name: "",
      email: "",
      phone: "",
      nostrPubkey: "",
      lud16: "",
      address: "",
      notes: "",
      tags: [],
      tier: "bronze",
      defaultPaymentTermId: "",
      creditLimit: 0,
    };
  }
  showCustomerModal.value = true;
};

const viewCustomer = (customer: LoyaltyMember) => {
  viewingCustomer.value = customer;
  showViewModal.value = true;
};

const confirmDeleteCustomer = (customer: LoyaltyMember) => {
  customerToDelete.value = customer;
  showDeleteModal.value = true;
};

const saveCustomer = async () => {
  saving.value = true;
  try {
    if (selectedCustomer.value) {
      // Update existing customer
      await customersStore.updateCustomer(selectedCustomer.value.id, {
        name: customerForm.value.name,
        email: customerForm.value.email || undefined,
        phone: customerForm.value.phone || undefined,
        nostrPubkey: customerForm.value.nostrPubkey || undefined,
        lud16: customerForm.value.lud16 || undefined,
        address: customerForm.value.address || undefined,
        notes: customerForm.value.notes || undefined,
        tags: customerForm.value.tags,
        tier: customerForm.value.tier,
        defaultPaymentTermId:
          customerForm.value.defaultPaymentTermId &&
          customerForm.value.defaultPaymentTermId !== "none"
            ? customerForm.value.defaultPaymentTermId
            : undefined,
        creditLimit: customerForm.value.creditLimit || undefined,
      });
      toast.add({
        title: t("common.success"),
        description: t("customers.updated", "Customer updated"),
        color: "success",
      });
    } else {
      // Create new customer - nostrPubkey is now optional
      await customersStore.createCustomer({
        name: customerForm.value.name,
        email: customerForm.value.email || undefined,
        phone: customerForm.value.phone || undefined,
        nostrPubkey: customerForm.value.nostrPubkey || undefined,
        lud16: customerForm.value.lud16 || undefined,
        address: customerForm.value.address || undefined,
        notes: customerForm.value.notes || undefined,
        tags: customerForm.value.tags,
        tier: customerForm.value.tier,
        defaultPaymentTermId:
          customerForm.value.defaultPaymentTermId &&
          customerForm.value.defaultPaymentTermId !== "none"
            ? customerForm.value.defaultPaymentTermId
            : undefined,
        creditLimit: customerForm.value.creditLimit || undefined,
      });
      toast.add({
        title: t("common.success"),
        description: t("customers.created", "Customer created"),
        color: "success",
      });
    }
    showCustomerModal.value = false;
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "error",
    });
  } finally {
    saving.value = false;
  }
};

const deleteCustomer = async () => {
  deleting.value = true;
  try {
    toast.add({
      title: t("common.info"),
      description: "Customer deletion not yet implemented",
      color: "warning",
    });
    showDeleteModal.value = false;
  } finally {
    deleting.value = false;
  }
};

// Pagination
const currentPage = ref(1);
const itemsPerPage = 10;
const paginatedCustomers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredCustomers.value.slice(start, start + itemsPerPage);
});

// Stats
const stats = computed(() => customersStore.getCustomerStats());

// Import functionality
const fileInputRef = ref<HTMLInputElement | null>(null);
const importing = ref(false);

const triggerFileUpload = () => {
  fileInputRef.value?.click();
};

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  importing.value = true;
  try {
    const content = await file.text();
    const result = await customersStore.importCustomers(content);

    if (result.success > 0) {
      toast.add({
        title: t("common.success"),
        description:
          t("customers.importSuccess", { count: result.success }) ||
          `Imported ${result.success} customers`,
        color: "success",
      });
    }

    if (result.errors.length > 0) {
      toast.add({
        title: t("common.warning", "Warning"),
        description: result.errors.slice(0, 3).join(", "),
        color: "warning",
      });
    }
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "error",
    });
  } finally {
    importing.value = false;
    // Reset file input
    if (target) target.value = "";
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader
      :title="t('customers.title')"
      :description="t('customers.description')"
    >
      <template #right>
        <UButton
          v-if="canEditCustomers"
          icon="i-heroicons-plus"
          color="primary"
          :label="t('customers.addCustomer')"
          @click="openCustomerModal()"
        />
      </template>

      <template #tabs>
        <UTabs
          v-model="selectedTab"
          variant="link"
          :items="[
            { label: t('customers.all'), value: 'all' },
            { label: t('loyalty.members'), value: 'members' },
            { label: 'VIP', value: 'vip' },
          ]"
        />
      </template>
    </CommonPageHeader>

    <!-- Loading State -->
    <div
      v-if="customersStore.isLoading.value"
      class="flex justify-center py-12"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin text-primary-500"
      />
    </div>

    <template v-else>
      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 px-4">
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          :placeholder="t('customers.searchPlaceholder')"
        />
        <USelect
          v-model="selectedTier"
          :items="tierOptions"
          value-key="value"
          label-key="label"
          :placeholder="t('loyalty.tier')"
        />
        <USelect
          v-model="selectedTag"
          :items="tagOptions"
          value-key="value"
          label-key="label"
          :placeholder="t('customers.filterByTag')"
        />
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-down-tray"
            :label="t('common.export')"
            @click="customersStore.exportCustomers()"
          />
          <UDropdownMenu
            :items="[
              [
                {
                  label: t('customers.downloadTemplate', 'Download Template'),
                  icon: 'i-heroicons-document-arrow-down',
                  onSelect: () => customersStore.downloadImportTemplate(),
                },
                {
                  label: t('customers.importFromCSV', 'Import from CSV'),
                  icon: 'i-heroicons-arrow-up-tray',
                  onSelect: () => triggerFileUpload(),
                },
              ],
            ]"
          >
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-arrow-up-tray"
              :label="t('common.import')"
            />
          </UDropdownMenu>
          <input
            ref="fileInputRef"
            type="file"
            accept=".csv,.xlsx,.xls"
            class="hidden"
            @change="handleFileUpload"
          />
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
        <CommonStatCard
          icon="i-heroicons-users"
          icon-color="blue"
          :label="t('customers.total')"
          :value="stats.total"
          :loading="customersStore.isLoading.value"
        />
        <CommonStatCard
          icon="i-heroicons-star"
          icon-color="yellow"
          :label="t('customers.goldMembers', 'Gold+ Members')"
          :value="(stats.byTier.gold || 0) + (stats.byTier.platinum || 0)"
          :loading="customersStore.isLoading.value"
        />
        <CommonStatCard
          icon="i-heroicons-bolt"
          icon-color="green"
          :label="t('customers.activeThisMonth', 'Active This Month')"
          :value="stats.activeThisMonth"
          :loading="customersStore.isLoading.value"
        />
        <CommonStatCard
          icon="i-heroicons-gift"
          icon-color="purple"
          :label="t('loyalty.totalPoints', 'Total Points')"
          :value="stats.totalPoints.toLocaleString()"
          :loading="customersStore.isLoading.value"
        />
      </div>

      <!-- Empty State -->
      <div v-if="filteredCustomers.length === 0" class="text-center py-12 px-4">
        <UIcon
          name="i-heroicons-users"
          class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
        />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {{ t("common.noData", "No customers found") }}
        </h3>
        <UButton
          v-if="canEditCustomers"
          icon="i-heroicons-plus"
          :label="t('customers.addCustomer')"
          @click="openCustomerModal()"
        />
      </div>

      <!-- Customers Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th
                class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
              >
                {{ t("customers.name") }}
              </th>
              <th
                class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
              >
                {{ t("customers.contact") }}
              </th>
              <th
                class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
              >
                {{ t("loyalty.tier") }}
              </th>
              <th
                class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
              >
                {{ t("loyalty.points") }}
              </th>
              <th
                class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
              >
                {{ t("customers.totalSpent") }}
              </th>
              <th
                class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
              >
                {{ t("customers.visits") }}
              </th>
              <th
                class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
              >
                {{ t("customers.lastVisit") }}
              </th>
              <th
                class="text-right py-3 px-4 font-medium text-gray-900 dark:text-white"
              >
                {{ t("common.actions") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="customer in paginatedCustomers"
              :key="customer.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              @click="router.push(localePath(`/customers/${customer.id}`))"
            >
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 bg-linear-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold"
                  >
                    {{
                      (customer.name || customer.nostrPubkey || "?")
                        .charAt(0)
                        .toUpperCase()
                    }}
                  </div>
                  <div>
                    <NuxtLinkLocale
                      :to="`/customers/${customer.id}`"
                      class="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                      @click.stop
                    >
                      {{
                        customer.name ||
                        `${customer.nostrPubkey?.slice(0, 8)}...`
                      }}
                    </NuxtLinkLocale>
                    <div class="flex gap-1 mt-1">
                      <UBadge
                        v-for="tag in (customer.tags || []).slice(0, 2)"
                        :key="tag"
                        size="xs"
                        :color="
                          tag === 'vip'
                            ? 'yellow'
                            : tag === 'lightning'
                            ? 'orange'
                            : 'neutral'
                        "
                        variant="subtle"
                      >
                        {{ tag }}
                      </UBadge>
                    </div>
                  </div>
                </div>
              </td>
              <td class="py-3 px-4">
                <div class="text-sm">
                  <p
                    v-if="customer.email"
                    class="text-gray-600 dark:text-gray-400"
                  >
                    {{ customer.email }}
                  </p>
                  <p v-if="customer.phone" class="text-gray-500">
                    {{ customer.phone }}
                  </p>
                  <p
                    v-if="customer.lud16"
                    class="text-orange-500 flex items-center gap-1"
                  >
                    <UIcon name="i-heroicons-bolt" class="w-3 h-3" />
                    {{ customer.lud16 }}
                  </p>
                </div>
              </td>
              <td class="py-3 px-4">
                <UBadge
                  v-if="customer.tier"
                  :color="getTierColor(customer.tier)"
                  :label="t(`loyalty.${customer.tier}`)"
                />
              </td>
              <td class="py-3 px-4">
                <span class="font-medium">{{
                  (customer.points || 0).toLocaleString()
                }}</span>
              </td>
              <td class="py-3 px-4">
                <span class="font-medium">{{
                  formatCurrency(customer.totalSpent)
                }}</span>
              </td>
              <td class="py-3 px-4">{{ customer.visitCount || 0 }}</td>
              <td class="py-3 px-4">
                <span class="text-gray-500 dark:text-gray-400">
                  {{
                    customer.lastVisit
                      ? new Date(customer.lastVisit).toLocaleDateString()
                      : "-"
                  }}
                </span>
              </td>
              <td class="py-3 px-4" @click.stop>
                <div class="flex justify-end gap-1">
                  <UButton
                    icon="i-heroicons-eye"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :to="localePath(`/customers/${customer.id}`)"
                  />
                  <UButton
                    v-if="canEditCustomers"
                    icon="i-heroicons-pencil"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    @click="openCustomerModal(customer)"
                  />
                  <UButton
                    v-if="canEditCustomers"
                    icon="i-heroicons-trash"
                    color="red"
                    variant="ghost"
                    size="sm"
                    @click="confirmDeleteCustomer(customer)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="filteredCustomers.length > 0"
        class="flex justify-between items-center px-4"
      >
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ t("common.showing") }} {{ paginatedCustomers.length }}
          {{ t("common.of") }} {{ filteredCustomers.length }}
          {{ t("common.entries") }}
        </span>
        <UPagination
          v-model="currentPage"
          :page-count="itemsPerPage"
          :total="filteredCustomers.length"
        />
      </div>
    </template>

    <!-- Add/Edit Customer Modal -->
    <UModal v-model:open="showCustomerModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-medium">
              {{
                selectedCustomer
                  ? t("customers.editCustomer")
                  : t("customers.addCustomer")
              }}
            </h3>
          </template>

          <form class="space-y-4" @submit.prevent="saveCustomer">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField
                :label="t('customers.name')"
                required
                class="md:col-span-2 w-full"
              >
                <UInput
                  v-model="customerForm.name"
                  :placeholder="t('customers.namePlaceholder')"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="t('customers.nostrPubkey')">
                <UInput
                  v-model="customerForm.nostrPubkey"
                  placeholder="npub1... or hex pubkey"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="t('customers.lightningAddress')">
                <UInput
                  v-model="customerForm.lud16"
                  placeholder="user@getalby.com"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="t('loyalty.tier')">
                <USelect
                  v-model="customerForm.tier"
                  :items="formTierOptions"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="t('customers.email')">
                <UInput
                  v-model="customerForm.email"
                  type="email"
                  :placeholder="t('customers.emailPlaceholder')"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="t('customers.phone')">
                <UInput
                  v-model="customerForm.phone"
                  :placeholder="t('customers.phonePlaceholder')"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="t('customers.address')" class="md:col-span-2">
                <UTextarea
                  v-model="customerForm.address"
                  :placeholder="t('customers.addressPlaceholder')"
                  :rows="2"
                  class="w-full"
                />
              </UFormField>

              <!-- Credit & Payment Terms Section -->
              <div
                class="md:col-span-2 pt-2 border-t border-gray-200 dark:border-gray-800"
              >
                <p
                  class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
                >
                  {{ t("customers.creditSettings", "Credit Settings") }}
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField
                    :label="t('settings.terms.title', 'Payment Terms')"
                  >
                    <USelect
                      v-model="customerForm.defaultPaymentTermId"
                      :items="paymentTermOptions"
                      value-key="value"
                      label-key="label"
                      :placeholder="t('common.select', 'Select')"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField
                    :label="t('customers.creditLimit', 'Credit Limit')"
                  >
                    <UInput
                      v-model.number="customerForm.creditLimit"
                      type="number"
                      :placeholder="'0'"
                      class="w-full"
                    >
                      <template #trailing>
                        <span class="text-xs text-gray-400">LAK</span>
                      </template>
                    </UInput>
                  </UFormField>
                </div>
              </div>

              <UFormField :label="t('customers.notes')" class="md:col-span-2">
                <UTextarea
                  v-model="customerForm.notes"
                  :placeholder="t('customers.notesPlaceholder')"
                  :rows="2"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <UButton
                color="neutral"
                variant="outline"
                :label="t('common.cancel')"
                @click="showCustomerModal = false"
              />
              <UButton
                type="submit"
                color="primary"
                :loading="saving"
                :label="
                  selectedCustomer ? t('common.update') : t('common.create')
                "
              />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- View Customer Modal -->
    <CustomerViewModal
      v-model:open="showViewModal"
      :customer="viewingCustomer"
    />

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-medium text-red-600 dark:text-red-400">
              {{ t("common.confirmDelete") }}
            </h3>
          </template>
          <p class="text-gray-600 dark:text-gray-400">
            {{
              t("customers.deleteConfirmation", {
                name:
                  customerToDelete?.name ||
                  customerToDelete?.nostrPubkey?.slice(0, 12),
              })
            }}
          </p>
          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="outline"
                :label="t('common.cancel')"
                @click="showDeleteModal = false"
              />
              <UButton
                color="red"
                :loading="deleting"
                :label="t('common.delete')"
                @click="deleteCustomer"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
