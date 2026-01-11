// ============================================
// 🆔 USER IDENTIFIER UTILITY
// Get current user's npub or fallback identifiers
// Prioritizes Nostr npub for decentralized identity
// ============================================

/**
 * Get the current user's identifier
 * Priority: npub > user.npub > user.id > 'system'
 * 
 * @returns The user's npub (preferred) or fallback identifier
 */
export function useUserIdentifier() {
  
  /**
   * Get current user identifier for CRUD operations
   * This should be used consistently across all data creation/updates
   */
  function getCurrentUserIdentifier(): string {
    try {
      // First try to get Nostr npub from keys
      const nostrData = useNostrData();
      const keys = nostrData.getUserKeys();
      
      if (keys?.npub) {
        return keys.npub;
      }

      // Fallback to stored user data
      if (import.meta.client) {
        // Try bitspace current user
        const authState = localStorage.getItem("bitspace_current_user");
        if (authState) {
          const state = JSON.parse(authState);
          if (state.user?.npub) return state.user.npub;
          if (state.user?.id) return state.user.id;
        }

        // Try nostr user
        const nostrUser = localStorage.getItem("nostrUser");
        if (nostrUser) {
          const user = JSON.parse(nostrUser);
          if (user.npub) return user.npub;
          if (user.pubkey) {
            // Convert hex to npub if we have the function available
            try {
              const nostrKey = useNostrKey();
              return nostrKey.hexToNpub(user.pubkey);
            } catch {
              return user.pubkey;
            }
          }
        }

        // Try nostr pubkey cookie
        const nostrCookie = useCookie("nostr-pubkey");
        if (nostrCookie.value) {
          try {
            const nostrKey = useNostrKey();
            return nostrKey.hexToNpub(nostrCookie.value as string);
          } catch {
            return nostrCookie.value as string;
          }
        }
      }

      // Last resort fallback
      return 'system';
    } catch (e) {
      console.warn('[UserIdentifier] Error getting user identifier:', e);
      return 'system';
    }
  }

  /**
   * Get user name for display purposes
   * @returns The user's display name or identifier
   */
  function getCurrentUserName(): string {
    try {
      if (import.meta.client) {
        // Try nostr user first (most accurate)
        const nostrUser = localStorage.getItem("nostrUser");
        if (nostrUser) {
          const user = JSON.parse(nostrUser);
          if (user.name) return user.name;
          if (user.displayName) return user.displayName;
        }

        // Try bitspace user
        const authState = localStorage.getItem("bitspace_current_user");
        if (authState) {
          const state = JSON.parse(authState);
          if (state.user?.name) return state.user.name;
          if (state.user?.displayName) return state.user.displayName;
        }
      }

      return 'Unknown User';
    } catch (e) {
      console.warn('[UserIdentifier] Error getting user name:', e);
      return 'Unknown User';
    }
  }

  /**
   * Check if current user has a valid Nostr identity
   * @returns true if user has npub/pubkey
   */
  function hasNostrIdentity(): boolean {
    const nostrData = useNostrData();
    const keys = nostrData.getUserKeys();
    return !!keys?.npub || !!keys?.pubkey;
  }

  return {
    getCurrentUserIdentifier,
    getCurrentUserName,
    hasNostrIdentity,
  };
}
