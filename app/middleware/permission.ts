/**
 * 🛡️ Permission Middleware
 * 
 * Checks if the current user has permission to access a route.
 * Use definePageMeta({ permission: 'canViewProducts' }) on pages.
 * 
 * Supports:
 * - Staff users (via useUsers().currentUser)
 * - Nostr owners (via nostr-pubkey cookie - full access)
 */

import type { UserPermissions } from '~/types';

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Get required permission from page meta
  const requiredPermission = to.meta.permission as keyof UserPermissions | undefined;
  
  // If no permission required, allow access
  if (!requiredPermission) {
    return;
  }

  // Check if client-side
  if (!import.meta.client) {
    return;
  }

  // Get users composable for staff authentication
  const usersComposable = useUsers();
  
  // Check if user is Nostr owner (they have full access)
  const nostrPubkey = useCookie('nostr-pubkey');
  if (nostrPubkey.value) {
    // Ensure Nostr user is synced to staff system for proper permissions
    await usersComposable.initialize();
    await usersComposable.syncNostrOwner();
    // Nostr authenticated users are treated as owners with full permissions
    return;
  }
  
  // Ensure users are initialized
  await usersComposable.initialize();
  
  // If not logged in as a store user, check if they have the default owner role
  const currentUser = usersComposable.currentUser.value;
  
  if (!currentUser) {
    // No staff user and no Nostr auth - redirect to signin
    console.warn(`Permission denied: No authenticated user for ${to.path}`);
    return navigateTo({
      path: '/auth/signin',
      query: { 
        redirect: to.fullPath,
        reason: 'no-auth'
      },
    });
  }

  // Check permission
  const hasPermission = usersComposable.hasPermission(requiredPermission);

  if (!hasPermission) {
    // Redirect to home or show access denied
    console.warn(`Permission denied: ${requiredPermission} required for ${to.path}`);
    
    // Navigate to home with access denied message
    return navigateTo({
      path: '/',
      query: { 
        accessDenied: 'true',
        requiredPermission 
      },
    });
  }
});
