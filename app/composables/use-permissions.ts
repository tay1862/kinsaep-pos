// ============================================
// 🔐 PERMISSION COMPOSABLE
// Utility functions for role-based access control
// ============================================

import type { UserPermissions, UserRole } from '~/types';

/**
 * Provides permission checking utilities for components
 */
export function usePermissions() {
  const usersComposable = useUsers();
  const toast = useToast();
  const { t } = useI18n();

  // Current user
  const currentUser = computed(() => usersComposable.currentUser.value);
  const currentRole = computed(() => currentUser.value?.role || null);
  const isLoggedIn = computed(() => usersComposable.isLoggedIn.value);

  /**
   * Check if current user has a specific permission
   */
  function can(permission: keyof UserPermissions): boolean {
    return usersComposable.hasPermission(permission);
  }

  /**
   * Check if current user has ANY of the specified permissions
   */
  function canAny(...permissions: (keyof UserPermissions)[]): boolean {
    return permissions.some(p => can(p));
  }

  /**
   * Check if current user has ALL of the specified permissions
   */
  function canAll(...permissions: (keyof UserPermissions)[]): boolean {
    return permissions.every(p => can(p));
  }

  /**
   * Check if current user has a specific role or higher
   */
  function hasRole(role: UserRole): boolean {
    if (!currentUser.value) return false;
    
    const roleHierarchy: Record<UserRole, number> = {
      owner: 4,
      admin: 3,
      cashier: 2,
      staff: 1,
    };

    return roleHierarchy[currentUser.value.role] >= roleHierarchy[role];
  }

  /**
   * Check if current user is an owner
   */
  function isOwner(): boolean {
    return currentUser.value?.role === 'owner';
  }

  /**
   * Check if current user is an admin or owner
   */
  function isAdmin(): boolean {
    return currentUser.value?.role === 'admin' || currentUser.value?.role === 'owner';
  }

  /**
   * Guard function - throws error if no permission
   * Use in action handlers before performing sensitive operations
   */
  function require(permission: keyof UserPermissions, showToast = true): boolean {
    const hasPermission = can(permission);
    
    if (!hasPermission && showToast) {
      toast.add({
        title: t('common.accessDenied', 'Access Denied'),
        description: t('common.noPermission', 'You do not have permission to perform this action'),
        icon: 'i-heroicons-shield-exclamation',
        color: 'red',
      });
    }

    return hasPermission;
  }

  /**
   * Guard function that requires any of the permissions
   */
  function requireAny(...permissions: (keyof UserPermissions)[]): boolean {
    const hasAny = canAny(...permissions);
    
    if (!hasAny) {
      toast.add({
        title: t('common.accessDenied', 'Access Denied'),
        description: t('common.noPermission', 'You do not have permission to perform this action'),
        icon: 'i-heroicons-shield-exclamation',
        color: 'red',
      });
    }

    return hasAny;
  }

  // ============================================
  // 🔒 SPECIFIC PERMISSION CHECKS (convenience)
  // ============================================

  // POS Operations
  const canCreateOrders = computed(() => can('canCreateOrders'));
  const canVoidOrders = computed(() => can('canVoidOrders'));
  const canApplyDiscounts = computed(() => can('canApplyDiscounts'));
  const canProcessRefunds = computed(() => can('canProcessRefunds'));

  // Products
  const canViewProducts = computed(() => can('canViewProducts'));
  const canEditProducts = computed(() => can('canEditProducts'));
  const canDeleteProducts = computed(() => can('canDeleteProducts'));

  // Customers
  const canViewCustomers = computed(() => can('canViewCustomers'));
  const canEditCustomers = computed(() => can('canEditCustomers'));

  // Reports
  const canViewReports = computed(() => can('canViewReports'));
  const canExportReports = computed(() => can('canExportReports'));

  // Settings
  const canViewSettings = computed(() => can('canViewSettings'));
  const canEditSettings = computed(() => can('canEditSettings'));
  const canManageLightning = computed(() => can('canManageLightning'));
  const canManageUsers = computed(() => can('canManageUsers'));

  // Inventory
  const canViewInventory = computed(() => can('canViewInventory'));
  const canEditInventory = computed(() => can('canEditInventory'));
  const canAdjustStock = computed(() => can('canAdjustStock'));

  return {
    // User info
    currentUser,
    currentRole,
    isLoggedIn,

    // Generic permission checks
    can,
    canAny,
    canAll,
    hasRole,
    isOwner,
    isAdmin,
    require,
    requireAny,

    // Specific permission flags (reactive)
    canCreateOrders,
    canVoidOrders,
    canApplyDiscounts,
    canProcessRefunds,
    canViewProducts,
    canEditProducts,
    canDeleteProducts,
    canViewCustomers,
    canEditCustomers,
    canViewReports,
    canExportReports,
    canViewSettings,
    canEditSettings,
    canManageLightning,
    canManageUsers,
    canViewInventory,
    canEditInventory,
    canAdjustStock,
  };
}
