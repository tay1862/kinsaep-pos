/**
 * Settings Navigation Configuration
 * Shared between settings index page and sidebar navigation
 */

export interface SettingsNavItem {
  id: string;
  label: string;
  to: string;
  icon: string;
  color: string;
  section: 'personal' | 'business' | 'system';
  order: number;
}

export const settingsNavigation: SettingsNavItem[] = [
  // Personal Settings
  {
    id: 'account',
    label: 'settings.account.title',
    to: '/settings/account',
    icon: 'i-heroicons-user-circle',
    color: 'blue',
    section: 'personal',
    order: 1,
  },
  {
    id: 'security',
    label: 'settings.security.title',
    to: '/settings/security',
    icon: 'i-heroicons-key',
    color: 'red',
    section: 'personal',
    order: 2,
  },
  {
    id: 'relays',
    label: 'settings.relays.title',
    to: '/settings/relays',
    icon: 'i-heroicons-server-stack',
    color: 'violet',
    section: 'personal',
    order: 3,
  },
  {
    id: 'lightning',
    label: 'settings.lightning.title',
    to: '/settings/lightning',
    icon: 'i-heroicons-bolt',
    color: 'amber',
    section: 'personal',
    order: 4,
  },
  {
    id: 'crypto',
    label: 'settings.crypto.title',
    to: '/settings/crypto',
    icon: 'i-heroicons-currency-dollar',
    color: 'orange',
    section: 'personal',
    order: 5,
  },
  {
    id: 'customization',
    label: 'settings.customization.title',
    to: '/settings/customization',
    icon: 'i-heroicons-sparkles',
    color: 'teal',
    section: 'personal',
    order: 6,
  },
  {
    id: 'chat',
    label: 'settings.chat.title',
    to: '/settings/chat',
    icon: 'i-heroicons-chat-bubble-left-right',
    color: 'pink',
    section: 'personal',
    order: 7,
  },

  // Business Settings
  {
    id: 'general',
    label: 'settings.general.title',
    to: '/settings/general',
    icon: 'i-heroicons-building-storefront',
    color: 'gray',
    section: 'business',
    order: 10,
  },
  {
    id: 'marketplace',
    label: 'settings.marketplace.title',
    to: '/settings/marketplace',
    icon: 'i-heroicons-globe-alt',
    color: 'blue',
    section: 'business',
    order: 11,
  },
  {
    id: 'tax',
    label: 'settings.tax.title',
    to: '/settings/tax',
    icon: 'i-heroicons-receipt-percent',
    color: 'green',
    section: 'business',
    order: 12,
  },
  {
    id: 'receipt',
    label: 'settings.receipt.title',
    to: '/settings/receipt',
    icon: 'i-heroicons-document-text',
    color: 'indigo',
    section: 'business',
    order: 13,
  },
  {
    id: 'bank-accounts',
    label: 'settings.bankAccounts.title',
    to: '/settings/bank-accounts',
    icon: 'i-heroicons-building-library',
    color: 'emerald',
    section: 'business',
    order: 14,
  },
  {
    id: 'users',
    label: 'settings.users.title',
    to: '/settings/users',
    icon: 'i-heroicons-users',
    color: 'blue',
    section: 'business',
    order: 15,
  },
  {
    id: 'tables',
    label: 'tables.title',
    to: '/settings/tables',
    icon: 'i-heroicons-qr-code',
    color: 'purple',
    section: 'business',
    order: 16,
  },
  {
    id: 'kitchen',
    label: 'settings.kitchen.title',
    to: '/settings/kitchen',
    icon: 'i-heroicons-fire',
    color: 'orange',
    section: 'business',
    order: 17,
  },

  // System Settings
  {
    id: 'workspaces',
    label: 'shop.workspaces',
    to: '/settings/workspaces',
    icon: 'i-heroicons-building-storefront',
    color: 'violet',
    section: 'system',
    order: 19,
  },
  {
    id: 'backup',
    label: 'settings.backup.title',
    to: '/settings/backup',
    icon: 'i-heroicons-cloud-arrow-up',
    color: 'cyan',
    section: 'system',
    order: 20,
  },
  {
    id: 'device-sync',
    label: 'auth.deviceSync.title',
    to: '/settings/device-sync',
    icon: 'i-heroicons-arrow-path',
    color: 'sky',
    section: 'system',
    order: 21,
  },
  {
    id: 'audit-log',
    label: 'settings.auditLog.title',
    to: '/settings/audit-log',
    icon: 'i-heroicons-shield-check',
    color: 'rose',
    section: 'system',
    order: 22,
  },
  {
    id: 'features',
    label: 'settings.features.title',
    to: '/settings/features',
    icon: 'i-heroicons-squares-plus',
    color: 'orange',
    section: 'system',
    order: 23,
  },
  {
    id: 'integrations',
    label: 'settings.integrations.title',
    to: '/settings/integrations',
    icon: 'i-heroicons-puzzle-piece',
    color: 'sky',
    section: 'system',
    order: 24,
  },
  {
    id: 'about',
    label: 'settings.about.title',
    to: '/settings/about',
    icon: 'i-heroicons-information-circle',
    color: 'amber',
    section: 'system',
    order: 25,
  },
];

/**
 * Get settings items by section
 */
export function getSettingsBySection(section: 'personal' | 'business' | 'system') {
  return settingsNavigation
    .filter(item => item.section === section)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get all personal settings
 */
export function getPersonalSettings() {
  return getSettingsBySection('personal');
}

/**
 * Get all business settings
 */
export function getBusinessSettings() {
  return getSettingsBySection('business');
}

/**
 * Get all system settings
 */
export function getSystemSettings() {
  return getSettingsBySection('system');
}

/**
 * Color mapping for settings cards
 */
export const settingsColorClasses = {
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600',
    border: 'hover:border-red-300 dark:hover:border-red-700',
  },
  violet: {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-600',
    border: 'hover:border-violet-300 dark:hover:border-violet-700',
  },
  amber: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600',
    border: 'hover:border-amber-300 dark:hover:border-amber-700',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600',
    border: 'hover:border-orange-300 dark:hover:border-orange-700',
  },
  teal: {
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    text: 'text-teal-600',
    border: 'hover:border-teal-300 dark:hover:border-teal-700',
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600',
    border: 'hover:border-gray-400 dark:hover:border-gray-600',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600',
    border: 'hover:border-blue-300 dark:hover:border-blue-700',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600',
    border: 'hover:border-green-300 dark:hover:border-green-700',
  },
  indigo: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-600',
    border: 'hover:border-indigo-300 dark:hover:border-indigo-700',
  },
  emerald: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-600',
    border: 'hover:border-emerald-300 dark:hover:border-emerald-700',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600',
    border: 'hover:border-purple-300 dark:hover:border-purple-700',
  },
  cyan: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-600',
    border: 'hover:border-cyan-300 dark:hover:border-cyan-700',
  },
  sky: {
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    text: 'text-sky-600',
    border: 'hover:border-sky-300 dark:hover:border-sky-700',
  },
  rose: {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-600',
    border: 'hover:border-rose-300 dark:hover:border-rose-700',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-600',
    border: 'hover:border-pink-300 dark:hover:border-pink-700',
  },
} as const;
