import type { NostrUser, UserInfo } from "~/types";
import type { EncryptedEnvelope } from "~/composables/use-encryption";

// ============================================
// 📦 STORAGE KEYS (Aligned with use-users.ts)
// ============================================
const STORAGE_KEYS = {
  NOSTR_KEYS: "nostrUser", // Nostr private/public keys
  NOSTR_PROFILE: "nostr_user_profile", // Nostr profile data (name, picture, etc)
  ACCOUNTS_LIST: "userList", // List of all Nostr accounts
  CURRENT_USER: "bitspace_current_user", // Current logged-in staff user (shared with use-users.ts)
  ENCRYPTED_DATA_PREFIX: "encrypted:", // Prefix for encrypted data storage
} as const;

export const useNostrStorage = () => {
  const accounts = useState<UserInfo[]>("accounts", () => []);

  /**
   * Save user info to local storage
   * Also updates bitspace_current_user if the pubkey matches
   */
  const saveUser = (userInfo: UserInfo) => {
    if (!import.meta.client) return;

    // Save user keys
    if (userInfo.userKeys) {
      localStorage.setItem(
        STORAGE_KEYS.NOSTR_KEYS,
        JSON.stringify(userInfo.userKeys)
      );
    }

    // Save profile data (unified key)
    localStorage.setItem(
      STORAGE_KEYS.NOSTR_PROFILE,
      JSON.stringify({
        pubkey: userInfo.pubkey,
        name: userInfo.name,
        display_name: userInfo.displayName || userInfo.display_name,
        picture: userInfo.picture,
        about: userInfo.about,
        nip05: userInfo.nip05,
        banner: userInfo.banner,
        lud16: userInfo.lud16,
        website: userInfo.website,
      })
    );

    // Update bitspace_current_user if it exists and matches the pubkey
    updateCurrentUserProfile(userInfo);

    // Update accounts list
    updateAccountsList(userInfo);
  };

  /**
   * Update the current staff user's profile info when Nostr profile changes
   */
  const updateCurrentUserProfile = (userInfo: UserInfo) => {
    if (!import.meta.client) return;

    const currentUserData = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!currentUserData) return;

    try {
      const currentUser = JSON.parse(currentUserData);

      // Check if the current user matches by pubkey (user.nostrPubkey or nested user.user.nostrPubkey)
      const currentPubkey =
        currentUser.nostrPubkey || currentUser.user?.nostrPubkey;

      if (currentPubkey && currentPubkey === userInfo.pubkey) {
        // Update the staff user's name and avatar from Nostr profile
        if (currentUser.user) {
          // AuthState structure: { user: { ... }, accessToken, ... }
          currentUser.user.displayName =
            userInfo.displayName ||
            userInfo.display_name ||
            userInfo.name ||
            currentUser.user.displayName;
          if (userInfo.picture) {
            currentUser.user.avatar = userInfo.picture;
          }
        } else if (currentUser.name !== undefined) {
          // Direct StoreUser structure
          currentUser.name =
            userInfo.displayName ||
            userInfo.display_name ||
            userInfo.name ||
            currentUser.name;
          if (userInfo.picture) {
            currentUser.avatar = userInfo.picture;
          }
        }

        localStorage.setItem(
          STORAGE_KEYS.CURRENT_USER,
          JSON.stringify(currentUser)
        );
        console.log(
          "[NostrStorage] Updated bitspace_current_user with new profile:",
          userInfo.name
        );
      }
    } catch (e) {
      console.error("[NostrStorage] Failed to update current user profile:", e);
    }
  };

  /**
   * Update accounts list in local storage
   */
  const updateAccountsList = (userInfo: UserInfo) => {
    if (!import.meta.client) return;

    const storedList: UserInfo[] = accounts.value;

    const exists = storedList.find((item) => item.pubkey === userInfo.pubkey);

    if (!exists) {
      storedList.push({
        pubkey: userInfo.pubkey,
        displayName:
          userInfo.display_name || `Account ${storedList.length + 1}`,
        userKeys: userInfo.userKeys,
        name: userInfo.name || "",
      });
    }
    // Update accounts list
    const _items = storedList.map((item) => {
      return item.pubkey === userInfo.pubkey
        ? {
            ...item,
            ...userInfo,
            userKeys: item.userKeys,
          }
        : {
            ...item,
            display_name:
              item.display_name || `Account ${storedList.length + 1}`,
          };
    });

    localStorage.setItem(STORAGE_KEYS.ACCOUNTS_LIST, JSON.stringify(_items));
    accounts.value = storedList;
  };

  /**
   * Load user info from local storage
   */
  const loadUser = (pubkey: string): UserInfo | null => {
    if (!import.meta.client) return null;

    const storedList = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.ACCOUNTS_LIST) || "[]"
    );
    return storedList.find((item: UserInfo) => item.pubkey === pubkey) || null;
  };

  /**
   * Load current user from local storage
   */
  const loadCurrentUser = (): {
    userInfo: UserInfo | null;
    user: NostrUser | null;
  } => {
    if (!import.meta.client) return { userInfo: null, user: null };

    let userInfo = null;
    let user = null;

    const profileData = localStorage.getItem(STORAGE_KEYS.NOSTR_PROFILE);
    if (profileData) {
      userInfo = JSON.parse(profileData);
    }

    const userData = localStorage.getItem(STORAGE_KEYS.NOSTR_KEYS);
    if (userData) {
      user = JSON.parse(userData);
    }

    return { userInfo, user };
  };

  /**
   * Load all accounts from local storage
   */
  const loadAllAccounts = (): UserInfo[] => {
    if (!import.meta.client) return [];

    const items = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.ACCOUNTS_LIST) || "[]"
    );
    accounts.value = items;
    return items;
  };

  /**
   * Clear user data from local storage
   */
  const clearUserData = () => {
    if (!import.meta.client) return;

    localStorage.removeItem(STORAGE_KEYS.NOSTR_KEYS);
    localStorage.removeItem(STORAGE_KEYS.NOSTR_PROFILE);
  };

  // remove account
  const removeAccount = (pubkey: string) => {
    const storedList = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.ACCOUNTS_LIST) || "[]"
    );
    const _items = storedList.filter(
      (item: UserInfo) => item.pubkey !== pubkey
    );
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS_LIST, JSON.stringify(_items));
    accounts.value = _items;
  };

  // ============================================
  // 🔐 ENCRYPTED DATA STORAGE (for Nostr sync)
  // ============================================

  /**
   * Save encrypted data to local storage
   * In production, this would publish to Nostr relays
   * @param key - Unique identifier (e.g., 'company:encryption:key')
   * @param data - Encrypted envelope to store
   */
  const saveEncryptedData = async (
    key: string,
    data: EncryptedEnvelope
  ): Promise<boolean> => {
    if (!import.meta.client) return false;

    try {
      const storageKey = `${STORAGE_KEYS.ENCRYPTED_DATA_PREFIX}${key}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          data,
          savedAt: new Date().toISOString(),
          version: 1,
        })
      );

      // TODO: In production, also publish to Nostr relays as kind 30078 event
      // const event = {
      //   kind: 30078,
      //   tags: [['d', key], ['client', 'bnos.space']],
      //   content: JSON.stringify(data),
      // };
      // await publishToRelays(event);

      console.log(`[NostrStorage] Saved encrypted data: ${key}`);
      return true;
    } catch (error) {
      console.error("[NostrStorage] Failed to save encrypted data:", error);
      return false;
    }
  };

  /**
   * Load encrypted data from local storage
   * In production, this would fetch from Nostr relays
   * @param key - Unique identifier
   * @returns Encrypted envelope or null
   */
  const loadEncryptedData = async (
    key: string
  ): Promise<EncryptedEnvelope | null> => {
    if (!import.meta.client) return null;

    try {
      const storageKey = `${STORAGE_KEYS.ENCRYPTED_DATA_PREFIX}${key}`;
      const stored = localStorage.getItem(storageKey);

      if (!stored) {
        // TODO: In production, try fetching from Nostr relays
        // const event = await fetchFromRelays({ kinds: [30078], '#d': [key] });
        // if (event) return JSON.parse(event.content);
        return null;
      }

      const parsed = JSON.parse(stored);
      return parsed.data as EncryptedEnvelope;
    } catch (error) {
      console.error("[NostrStorage] Failed to load encrypted data:", error);
      return null;
    }
  };

  /**
   * Delete encrypted data from storage
   * @param key - Unique identifier
   */
  const deleteEncryptedData = (key: string): boolean => {
    if (!import.meta.client) return false;

    try {
      const storageKey = `${STORAGE_KEYS.ENCRYPTED_DATA_PREFIX}${key}`;
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error("[NostrStorage] Failed to delete encrypted data:", error);
      return false;
    }
  };

  return {
    accounts,
    saveUser,
    loadUser,
    loadCurrentUser,
    loadAllAccounts,
    clearUserData,
    updateAccountsList,
    removeAccount,
    // Encrypted data methods
    saveEncryptedData,
    loadEncryptedData,
    deleteEncryptedData,
  };
};
