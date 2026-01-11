import type { UserPermissions } from "~/types";

export interface PermissionDefinition {
  key: keyof UserPermissions;
  label: string; // i18n key or text
  description?: string; // i18n key or text
}

export interface PermissionGroup {
  id: string;
  label: string; // i18n key
  permissions: PermissionDefinition[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "pos",
    label: "settings.users.permissions.pos",
    permissions: [
      {
        key: "canCreateOrders",
        label: "settings.users.permissions.canCreateOrders",
      },
      {
        key: "canVoidOrders",
        label: "settings.users.permissions.canVoidOrders",
      },
      {
        key: "canApplyDiscounts",
        label: "settings.users.permissions.canApplyDiscounts",
      },
      {
        key: "canProcessRefunds",
        label: "settings.users.permissions.canProcessRefunds",
      },
    ],
  },
  {
    id: "products",
    label: "settings.users.permissions.products",
    permissions: [
      {
        key: "canViewProducts",
        label: "settings.users.permissions.canViewProducts",
      },
      {
        key: "canEditProducts",
        label: "settings.users.permissions.canEditProducts",
      },
      {
        key: "canDeleteProducts",
        label: "settings.users.permissions.canDeleteProducts",
      },
    ],
  },
  {
    id: "inventory",
    label: "settings.users.permissions.inventory",
    permissions: [
      {
        key: "canViewInventory",
        label: "settings.users.permissions.canViewInventory",
      },
      {
        key: "canEditInventory",
        label: "settings.users.permissions.canEditInventory",
      },
      {
        key: "canAdjustStock",
        label: "settings.users.permissions.canAdjustStock",
      },
    ],
  },
  {
    id: "customers",
    label: "settings.users.permissions.customers",
    permissions: [
      {
        key: "canViewCustomers",
        label: "settings.users.permissions.canViewCustomers",
      },
      {
        key: "canEditCustomers",
        label: "settings.users.permissions.canEditCustomers",
      },
    ],
  },
  {
    id: "reports",
    label: "settings.users.permissions.reports",
    permissions: [
      {
        key: "canViewReports",
        label: "settings.users.permissions.canViewReports",
      },
      {
        key: "canExportReports",
        label: "settings.users.permissions.canExportReports",
      },
    ],
  },
  {
    id: "settings",
    label: "settings.users.permissions.settings",
    permissions: [
      {
        key: "canViewSettings",
        label: "settings.users.permissions.canViewSettings",
      },
      {
        key: "canEditSettings",
        label: "settings.users.permissions.canEditSettings",
      },
      {
        key: "canManageLightning",
        label: "settings.users.permissions.canManageLightning",
      },
      {
        key: "canManageUsers",
        label: "settings.users.permissions.canManageUsers",
      },
    ],
  },
];
