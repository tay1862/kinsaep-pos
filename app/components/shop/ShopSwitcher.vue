<template>
  <!-- Shop Switcher Button - Shows in Header -->
  <div class="relative">
    <UPopover
      :ui="{
        content: 'w-80 p-0 backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50',
      }"
    >
      <!-- Trigger Button -->
      <button
        class="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
        :class="{
          'animate-pulse': isSwitching,
        }"
      >
        <!-- Shop Logo/Icon -->
        <div
          class="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 shadow-sm"
          :class="currentWorkspace?.logo ? '' : 'bg-linear-to-br from-primary-400 to-primary-600'"
        >
          <img
            v-if="currentWorkspace?.logo"
            :src="currentWorkspace.logo"
            :alt="currentWorkspace.name"
            class="w-full h-full object-cover"
          >
          <Icon
            v-else
            name="i-heroicons-building-storefront"
            size="16"
            class="text-white"
          />
        </div>

        <!-- Shop Name -->
        <div class="hidden sm:block text-left min-w-0 max-w-30">
          <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {{ currentWorkspace?.name || $t('shop.noShop') }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
            {{ currentWorkspace?.shopType || 'retail' }}
          </p>
        </div>

        <!-- Dropdown Arrow -->
        <Icon
          v-if="hasMultipleWorkspaces"
          name="i-heroicons-chevron-down"
          size="16"
          class="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
        />
      </button>

      <!-- Dropdown Content -->
      <template #content>
        <div class="p-2">
          <!-- Header -->
          <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ $t('shop.workspaces', 'Your Workspaces') }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {{ $t('shop.switchDescription', 'Switch between your shops') }}
            </p>
          </div>

          <!-- Workspaces List -->
          <div class="py-2 max-h-64 overflow-y-auto">
            <div
              v-for="workspace in workspaces"
              :key="workspace.id"
              class="group relative"
            >
              <button
                class="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                :class="{
                  'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800': workspace.id === currentWorkspace?.id,
                  'hover:bg-gray-50 dark:hover:bg-gray-800/50': workspace.id !== currentWorkspace?.id,
                }"
                :disabled="isSwitching"
                @click="handleSwitch(workspace.id)"
              >
                <!-- Shop Logo -->
                <div
                  class="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-sm"
                  :class="workspace.logo ? '' : getShopTypeGradient(workspace.shopType)"
                >
                  <img
                    v-if="workspace.logo"
                    :src="workspace.logo"
                    :alt="workspace.name"
                    class="w-full h-full object-cover"
                  >
                  <Icon
                    v-else
                    :name="getShopTypeIcon(workspace.shopType)"
                    size="20"
                    class="text-white"
                  />
                </div>

                <!-- Shop Info -->
                <div class="flex-1 min-w-0 text-left">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {{ workspace.name }}
                    </p>
                    <UBadge
                      v-if="workspace.isDefault"
                      color="primary"
                      variant="subtle"
                      size="xs"
                    >
                      {{ $t('common.default', 'Default') }}
                    </UBadge>
                  </div>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {{ workspace.shopType }}
                    </span>
                    <span class="text-xs text-gray-300 dark:text-gray-600">•</span>
                    <span class="text-xs text-gray-400 dark:text-gray-500">
                      {{ formatLastAccessed(workspace.lastAccessedAt) }}
                    </span>
                  </div>
                </div>

                <!-- Current Indicator -->
                <Icon
                  v-if="workspace.id === currentWorkspace?.id"
                  name="i-heroicons-check-circle-solid"
                  size="20"
                  class="text-primary-500 shrink-0"
                />

                <!-- Sync Status -->
                <div
                  v-else-if="workspace.syncStatus"
                  class="shrink-0"
                >
                  <Icon
                    v-if="workspace.syncStatus === 'synced'"
                    name="i-heroicons-cloud"
                    size="16"
                    class="text-green-500"
                  />
                  <Icon
                    v-else-if="workspace.syncStatus === 'pending'"
                    name="i-heroicons-cloud-arrow-up"
                    size="16"
                    class="text-amber-500"
                  />
                  <Icon
                    v-else
                    name="i-heroicons-exclamation-circle"
                    size="16"
                    class="text-red-500"
                  />
                </div>
              </button>
            </div>

            <!-- Empty State -->
            <div
              v-if="workspaces.length === 0"
              class="px-3 py-8 text-center"
            >
              <Icon
                name="i-heroicons-building-storefront"
                size="40"
                class="text-gray-300 dark:text-gray-600 mx-auto mb-3"
              />
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t('shop.noWorkspaces', 'No workspaces yet') }}
              </p>
            </div>
          </div>

          <!-- Divider -->
          <div class="h-px bg-gray-100 dark:bg-gray-800 my-1" />

          <!-- Actions -->
          <div class="py-2 space-y-1">
            <!-- Add New Shop -->
            <button
              class="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
              @click="handleAddShop"
            >
              <div class="w-10 h-10 rounded-xl bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                <Icon
                  name="i-heroicons-plus"
                  size="20"
                  class="text-gray-500 dark:text-gray-400"
                />
              </div>
              <span>{{ $t('shop.addNew', 'Add New Shop') }}</span>
            </button>

            <!-- Manage Workspaces -->
            <button
              v-if="workspaces.length > 0"
              class="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
              @click="handleManageWorkspaces"
            >
              <div class="w-10 h-10 rounded-xl bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                <Icon
                  name="i-heroicons-cog-6-tooth"
                  size="20"
                  class="text-gray-500 dark:text-gray-400"
                />
              </div>
              <span>{{ $t('shop.manage', 'Manage Workspaces') }}</span>
            </button>

            <!-- Show Company Code QR -->
            <button
              v-if="currentWorkspace?.companyCode"
              class="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
              @click="showQRModal = true"
            >
              <div class="w-10 h-10 rounded-xl bg-linear-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center">
                <Icon
                  name="i-heroicons-qr-code"
                  size="20"
                  class="text-primary-600 dark:text-primary-400"
                />
              </div>
              <span>{{ $t('shop.showQRCode', 'Show Company QR') }}</span>
            </button>
          </div>
        </div>
      </template>
    </UPopover>

    <!-- Switching Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isSwitching"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl text-center max-w-sm mx-4">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center animate-pulse">
            <Icon
              name="i-heroicons-arrow-path"
              size="32"
              class="text-white animate-spin"
            />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {{ $t('shop.switching', 'Switching Shop') }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('shop.syncingData', 'Syncing data from Nostr...') }}
          </p>
        </div>
      </div>
    </Transition>

    <!-- Switch Confirmation Modal (Reusable Component) -->
    <ShopWorkspaceSwitchModal
      v-model:open="showSwitchModal"
      :current-workspace="currentWorkspace"
      :target-workspace="workspaceToSwitch"
      :loading="isSwitching"
      @confirm="confirmSwitch"
    />

    <!-- QR Code Modal (Reusable Component) -->
    <ShopCompanyQRModal
      v-model:open="showQRModal"
      :company-code="currentWorkspace?.companyCode"
      :workspace="currentWorkspace"
    />
  </div>
</template>

<script setup lang="ts">
import { useShopManager, type ShopWorkspace } from '~/composables/use-shop-manager';
import { db } from '~/db/db';

const { t } = useI18n();
const shopManager = useShopManager();
const toast = useToast();

// State
const {
  workspaces,
  currentWorkspace,
  hasMultipleWorkspaces,
  isSwitching,
} = shopManager;

// Modal states
const showSwitchModal = ref(false);
const showQRModal = ref(false);
const workspaceToSwitch = ref<ShopWorkspace | null>(null);

// Shop type icons (used in dropdown list)
const getShopTypeIcon = (shopType: string): string => {
  const icons: Record<string, string> = {
    cafe: 'i-heroicons-beaker',
    restaurant: 'i-heroicons-cake',
    retail: 'i-heroicons-shopping-bag',
    grocery: 'i-heroicons-shopping-cart',
    noodles: 'i-heroicons-fire',
    service: 'i-heroicons-wrench-screwdriver',
    pharmacy: 'i-heroicons-heart',
    gym: 'i-heroicons-trophy',
    karaoke: 'i-heroicons-musical-note',
    garage: 'i-heroicons-truck',
    dry_clean: 'i-heroicons-sparkles',
    car_care: 'i-heroicons-cog',
    enterprise: 'i-heroicons-building-office-2',
  };
  return icons[shopType] || 'i-heroicons-building-storefront';
};

// Shop type gradients (used in dropdown list)
const getShopTypeGradient = (shopType: string): string => {
  const gradients: Record<string, string> = {
    cafe: 'bg-linear-to-br from-amber-400 to-orange-500',
    restaurant: 'bg-linear-to-br from-red-400 to-pink-500',
    retail: 'bg-linear-to-br from-blue-400 to-indigo-500',
    grocery: 'bg-linear-to-br from-green-400 to-emerald-500',
    noodles: 'bg-linear-to-br from-orange-400 to-red-500',
    service: 'bg-linear-to-br from-gray-400 to-slate-500',
    pharmacy: 'bg-linear-to-br from-teal-400 to-cyan-500',
    gym: 'bg-linear-to-br from-purple-400 to-violet-500',
    karaoke: 'bg-linear-to-br from-pink-400 to-rose-500',
    garage: 'bg-linear-to-br from-slate-400 to-gray-500',
    dry_clean: 'bg-linear-to-br from-sky-400 to-blue-500',
    car_care: 'bg-linear-to-br from-zinc-400 to-neutral-500',
    enterprise: 'bg-linear-to-br from-indigo-400 to-purple-500',
  };
  return gradients[shopType] || 'bg-linear-to-br from-primary-400 to-primary-600';
};

// Format last accessed date
const formatLastAccessed = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('time.justNow', 'Just now');
  if (diffMins < 60) return t('time.minsAgo', { n: diffMins }) || `${diffMins}m ago`;
  if (diffHours < 24) return t('time.hoursAgo', { n: diffHours }) || `${diffHours}h ago`;
  if (diffDays < 7) return t('time.daysAgo', { n: diffDays }) || `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Handle shop switch - show modal instead of browser confirm
const handleSwitch = (workspaceId: string) => {
  if (workspaceId === currentWorkspace.value?.id) return;

  const workspace = workspaces.value.find((w: ShopWorkspace) => w.id === workspaceId);
  if (!workspace) return;

  workspaceToSwitch.value = workspace;
  showSwitchModal.value = true;
};

/**
 * Clear all local database tables before switching workspace
 */
const clearAllLocalData = async () => {
  try {
    console.log('[ShopSwitcher] Clearing all local database data...');
    
    await Promise.all([
      db.products.clear(),
      db.categories.clear(),
      db.units.clear(),
      db.localOrders.clear(),
      db.customers.clear(),
      db.branches.clear(),
      db.staff.clear(),
      db.stockAdjustments.clear(),
      db.branchStock.clear(),
      db.ingredients.clear(),
      db.ingredientCategories.clear(),
      db.recipes.clear(),
      db.ingredientStockAdjustments.clear(),
      db.productionPlans.clear(),
      db.lowStockAlerts.clear(),
      db.suppliers.clear(),
      db.purchaseOrders.clear(),
      db.storagePositions.clear(),
      db.stockLots.clear(),
      db.stockReceipts.clear(),
      db.lotStockMovements.clear(),
      db.expiryAlerts.clear(),
      db.productActivityLogs.clear(),
      db.cycleCounts.clear(),
      db.accounts.clear(),
      db.journalEntries.clear(),
      db.expenses.clear(),
      db.employees.clear(),
      db.chatMessages.clear(),
      db.chatConversations.clear(),
      db.promotions.clear(),
      db.membershipPlans.clear(),
      db.memberships.clear(),
      db.membershipCheckIns.clear(),
      db.posSessions.clear(),
      db.offlinePayments.clear(),
      db.events.clear(),
      db.meta.clear(),
      db.pendingSync.clear(),
    ]);

    console.log('[ShopSwitcher] All local data cleared successfully');
  } catch (error) {
    console.error('[ShopSwitcher] Failed to clear local data:', error);
    throw error;
  }
};

// Confirm switch from modal
const confirmSwitch = async () => {
  if (!workspaceToSwitch.value) return;

  try {
    // Clear all local data before switching
    await clearAllLocalData();

    // Now switch workspace
    await shopManager.switchWorkspace(workspaceToSwitch.value.id);
    
    // Modal will close when page reloads
  } catch (error) {
    toast.add({
      title: t('shop.switchError', 'Switch Failed'),
      description: String(error),
      color: 'red',
    });
    showSwitchModal.value = false;
    workspaceToSwitch.value = null;
  }
};

// Handle add new shop
const handleAddShop = () => {
  // Navigate to shop setup for new workspace
  navigateTo('/setup?new=true');
};

// Handle manage workspaces
const handleManageWorkspaces = () => {
  navigateTo('/settings/workspaces');
};
</script>

<style scoped>
@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.02);
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}
</style>