<template>
  <div >
    <!-- Header -->
    <div class=" border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-4xl mx-auto px-4 py-6">
        <div class="flex items-center gap-4">
          <NuxtLinkLocale
            to="/settings"
            class="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Icon
              name="i-heroicons-arrow-left"
              size="24"
              class="text-gray-600 dark:text-gray-400"
            />
          </NuxtLinkLocale>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ $t('shop.workspaces', 'Workspaces') }}
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ $t('shop.workspacesDescription', 'Manage your shops and switch between workspaces') }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-4 py-6">
      <!-- Current Workspace -->
      <div
        v-if="currentWorkspace"
        class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6"
      >
        <div class="flex items-start gap-4">
          <!-- Logo -->
          <div
            class="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 shadow-lg"
            :class="currentWorkspace.logo ? '' : getShopTypeGradient(currentWorkspace.shopType)"
          >
            <img
              v-if="currentWorkspace.logo"
              :src="currentWorkspace.logo"
              :alt="currentWorkspace.name"
              class="w-full h-full object-cover"
            >
            <Icon
              v-else
              :name="getShopTypeIcon(currentWorkspace.shopType)"
              size="32"
              class="text-white"
            />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-1">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white truncate">
                {{ currentWorkspace.name }}
              </h2>
              <UBadge color="primary" variant="subtle">
                {{ $t('common.current', 'Current') }}
              </UBadge>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 capitalize mb-2">
              {{ currentWorkspace.shopType }} • {{ currentWorkspace.currency || 'LAK' }}
            </p>
            
            <!-- Company Code Display -->
            <div 
              v-if="currentWorkspace.companyCode"
              class="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 rounded-lg mb-3"
            >
              <Icon name="i-heroicons-qr-code" size="16" class="text-primary-500" />
              <span class="font-mono text-sm font-semibold text-primary-700 dark:text-primary-300 tracking-wider">
                {{ showCompanyCode ? currentWorkspace.companyCode : '••••••••' }}
              </span>
              <button
                class="p-1 hover:bg-primary-100 dark:hover:bg-primary-800 rounded transition-colors"
                :title="showCompanyCode ? $t('common.hide', 'Hide') : $t('common.show', 'Show')"
                @click="showCompanyCode = !showCompanyCode"
              >
                <Icon :name="showCompanyCode ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" size="14" class="text-primary-500" />
              </button>
              <button
                class="p-1 hover:bg-primary-100 dark:hover:bg-primary-800 rounded transition-colors"
                :title="$t('common.copy', 'Copy')"
                @click="copyCompanyCode(currentWorkspace.companyCode)"
              >
                <Icon name="i-heroicons-clipboard-document" size="14" class="text-primary-500" />
              </button>
            </div>

            <div class="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
              <span class="flex items-center gap-1">
                <Icon name="i-heroicons-clock" size="14" />
                {{ $t('shop.lastSync', 'Last sync') }}: {{ formatDate(currentWorkspace.lastSyncAt) }}
              </span>
              <span class="flex items-center gap-1">
                <Icon name="i-heroicons-calendar" size="14" />
                {{ $t('shop.created', 'Created') }}: {{ formatDate(currentWorkspace.createdAt) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <UButton
              icon="i-heroicons-arrow-path"
              variant="outline"
              size="sm"
              :loading="isLoading"
              @click="handleSync"
            >
              {{ $t('common.sync', 'Sync') }}
            </UButton>
            <UDropdownMenu :items="currentWorkspaceActions">
              <UButton
                icon="i-heroicons-ellipsis-vertical"
                variant="ghost"
                size="sm"
              />
            </UDropdownMenu>
          </div>
        </div>
      </div>

      <!-- Other Workspaces -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ $t('shop.otherWorkspaces', 'Other Workspaces') }}
          </h3>
        </div>

        <!-- Workspace List -->
        <div class="divide-y divide-gray-100 dark:divide-gray-700">
          <div
            v-for="workspace in otherWorkspaces"
            :key="workspace.id"
            class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div class="flex items-center gap-4">
              <!-- Logo -->
              <div
                class="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow"
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
                  size="24"
                  class="text-white"
                />
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <h4 class="font-semibold text-gray-900 dark:text-white truncate">
                    {{ workspace.name }}
                  </h4>
                  <UBadge
                    v-if="workspace.isDefault"
                    color="gray"
                    variant="subtle"
                    size="xs"
                  >
                    {{ $t('common.default', 'Default') }}
                  </UBadge>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {{ workspace.shopType }} • {{ formatDate(workspace.lastAccessedAt) }}
                </p>
                <!-- Company Code -->
                <div 
                  v-if="workspace.companyCode"
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                >
                  <Icon name="i-heroicons-qr-code" size="12" class="text-gray-400" />
                  <span class="font-mono text-gray-600 dark:text-gray-300 tracking-wide">
                    {{ visibleCodes[workspace.id] ? workspace.companyCode : '••••••••' }}
                  </span>
                  <button
                    class="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    :title="visibleCodes[workspace.id] ? $t('common.hide', 'Hide') : $t('common.show', 'Show')"
                    @click.stop="visibleCodes[workspace.id] = !visibleCodes[workspace.id]"
                  >
                    <Icon :name="visibleCodes[workspace.id] ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" size="12" class="text-gray-400" />
                  </button>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2 shrink-0">
                <UButton
                  variant="outline"
                  size="sm"
                  :disabled="isSwitching"
                  @click="handleSwitch(workspace.id)"
                >
                  {{ $t('shop.switch', 'Switch') }}
                </UButton>
                <UDropdownMenu :items="getWorkspaceActions(workspace)">
                  <UButton
                    icon="i-heroicons-ellipsis-vertical"
                    variant="ghost"
                    size="sm"
                  />
                </UDropdownMenu>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="otherWorkspaces.length === 0"
            class="p-8 text-center"
          >
            <Icon
              name="i-heroicons-building-storefront"
              size="48"
              class="text-gray-300 dark:text-gray-600 mx-auto mb-4"
            />
            <p class="text-gray-500 dark:text-gray-400 mb-4">
              {{ $t('shop.noOtherWorkspaces', 'No other workspaces') }}
            </p>
            <UButton
              icon="i-heroicons-plus"
              variant="outline"
              @click="handleAddShop"
            >
              {{ $t('shop.addNew', 'Add New Shop') }}
            </UButton>
          </div>
        </div>
      </div>

      <!-- Add New Shop Card -->
      <div class="mt-6">
        <button
          class="w-full p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-all duration-200 group"
          @click="handleAddShop"
        >
          <div class="flex items-center justify-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors">
              <Icon
                name="i-heroicons-plus"
                size="28"
                class="text-gray-400 dark:text-gray-500 group-hover:text-primary-500 transition-colors"
              />
            </div>
            <div class="text-left">
              <h4 class="font-semibold text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                {{ $t('shop.createNew', 'Create New Workspace') }}
              </h4>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t('shop.createNewDescription', 'Set up another shop or business') }}
              </p>
            </div>
          </div>
        </button>
      </div>

      <!-- Danger Zone -->
      <div class="mt-8 p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/50">
        <h3 class="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
          {{ $t('common.dangerZone', 'Danger Zone') }}
        </h3>
        <p class="text-sm text-red-600/80 dark:text-red-400/80 mb-4">
          {{ $t('shop.logoutAllDescription', 'Sign out from all workspaces and clear all local data.') }}
        </p>
        <UButton
          icon="i-heroicons-arrow-right-on-rectangle"
          color="red"
          variant="outline"
          @click="handleFullLogout"
        >
          {{ $t('shop.logoutAll', 'Sign Out from All') }}
        </UButton>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Icon
                name="i-heroicons-exclamation-triangle"
                size="24"
                class="text-red-600 dark:text-red-400"
              />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ $t('shop.deleteWorkspace', 'Delete Workspace') }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ workspaceToDelete?.name }}
              </p>
            </div>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
            {{ $t('shop.deleteWarning', 'This will remove this workspace from your list. Your data on Nostr will remain intact and can be recovered by adding the shop again.') }}
          </p>
          <div class="flex justify-end gap-3">
            <UButton
              variant="outline"
              @click="showDeleteModal = false"
            >
              {{ $t('common.cancel', 'Cancel') }}
            </UButton>
            <UButton
              color="red"
              @click="confirmDelete"
            >
              {{ $t('common.delete', 'Delete') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Switch Workspace Modal (Reusable Component) -->
    <ShopWorkspaceSwitchModal
      v-model:open="showSwitchModal"
      :current-workspace="currentWorkspace"
      :target-workspace="workspaceToSwitch"
      :loading="isSwitching"
      @confirm="confirmSwitch"
    />
  </div>
</template>

<script setup lang="ts">
import { useShopManager, type ShopWorkspace } from '~/composables/use-shop-manager';
import { db } from '~/db/db';

definePageMeta({
  layout: 'default',
});

const { t } = useI18n();
const shopManager = useShopManager();
const auth = useAuth();
const toast = useToast();

// State
const {
  workspaces,
  currentWorkspace,
  isLoading,
  isSwitching,
} = shopManager;

const showDeleteModal = ref(false);
const workspaceToDelete = ref<ShopWorkspace | null>(null);
const showSwitchModal = ref(false);
const workspaceToSwitch = ref<ShopWorkspace | null>(null);
const showCompanyCode = ref(false);
const visibleCodes = ref<Record<string, boolean>>({});

// Computed
const otherWorkspaces = computed(() =>
  workspaces.value.filter((w: ShopWorkspace) => w.id !== currentWorkspace.value?.id)
);

// Helper functions (still needed for workspace list display)
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

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return t('common.never', 'Never');
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return t('time.today', 'Today');
  if (diffDays === 1) return t('time.yesterday', 'Yesterday');
  if (diffDays < 7) return t('time.daysAgo', { n: diffDays }) || `${diffDays} days ago`;
  return date.toLocaleDateString();
};

// Current workspace actions
const currentWorkspaceActions = computed(() => [
  [
    {
      label: t('shop.setDefault', 'Set as Default'),
      icon: 'i-heroicons-star',
      disabled: currentWorkspace.value?.isDefault,
      onClick: () => currentWorkspace.value && shopManager.setDefaultWorkspace(currentWorkspace.value.id),
    },
    {
      label: t('shop.editDetails', 'Edit Details'),
      icon: 'i-heroicons-pencil',
      onClick: () => navigateTo('/settings/general'),
    },
  ],
]);

// Get actions for other workspaces
const getWorkspaceActions = (workspace: ShopWorkspace) => [
  [
    {
      label: t('shop.setDefault', 'Set as Default'),
      icon: 'i-heroicons-star',
      disabled: workspace.isDefault,
      onClick: () => shopManager.setDefaultWorkspace(workspace.id),
    },
  ],
  [
    {
      label: t('common.delete', 'Delete'),
      icon: 'i-heroicons-trash',
      color: 'red' as const,
      onClick: () => {
        workspaceToDelete.value = workspace;
        showDeleteModal.value = true;
      },
    },
  ],
];

// Actions
const copyCompanyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    toast.add({
      title: t('common.copied', 'Copied!'),
      description: t('shop.companyCodeCopied', 'Company code copied to clipboard'),
      color: 'green',
    });
  } catch {
    toast.add({
      title: t('common.error', 'Error'),
      description: t('common.copyFailed', 'Failed to copy'),
      color: 'red',
    });
  }
};

const handleSync = async () => {
  try {
    await shopManager.syncCurrentWorkspace();
    toast.add({
      title: t('shop.syncSuccess', 'Sync Complete'),
      description: t('shop.syncSuccessDescription', 'Your data has been synced.'),
      color: 'green',
    });
  } catch (error) {
    toast.add({
      title: t('shop.syncError', 'Sync Failed'),
      description: String(error),
      color: 'red',
    });
  }
};

const handleSwitch = (workspaceId: string) => {
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
    console.log('[Workspaces] Clearing all local database data...');
    
    // Clear all main data tables (not workspaces/auth related)
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

    console.log('[Workspaces] All local data cleared successfully');
  } catch (error) {
    console.error('[Workspaces] Failed to clear local data:', error);
    throw error;
  }
};

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

const handleAddShop = () => {
  navigateTo('/setup?new=true');
};

const confirmDelete = () => {
  if (workspaceToDelete.value) {
    shopManager.removeWorkspace(workspaceToDelete.value.id);
    toast.add({
      title: t('shop.deleted', 'Workspace Removed'),
      description: t('shop.deletedDescription', 'The workspace has been removed from your list.'),
      color: 'green',
    });
  }
  showDeleteModal.value = false;
  workspaceToDelete.value = null;
};

const handleFullLogout = async () => {
  const confirmed = confirm(
    t('shop.confirmLogoutAll', 'Are you sure you want to sign out from all workspaces? This will clear all local data.')
  );

  if (!confirmed) return;

  await auth.signOut({ keepWorkspaces: false });
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