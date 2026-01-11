import { nip19 } from "nostr-tools";
import { hexToBytes } from "nostr-tools/utils";
import type { NostrUser, UserInfo } from "~/types";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

export const useNostrUser = () => {
  const user = useState<NostrUser | null>("nostrUser", () => null);
  const currentUserInfo = useState<UserInfo>("currentUserInfo");
  const isLoading = useState<boolean>("isLoading", () => false);
  const error = ref<unknown>(null);

  // Import other composables
  const { normalizeKey, decodePrivateKey, getPublicKeyFromPrivate } =
    useNostrKey();
  const { saveUser, loadUser, accounts, loadCurrentUser, loadAllAccounts } =
    useNostrStorage();
  const { queryEvents, publishEvent } = useNostrRelay();

  const { $nostr } = useNuxtApp();
  const { generateKeys } = $nostr;
  /**
   * Create a new user account
   */
  const createUser = () => {
    const newUser = generateKeys();
    user.value = newUser;

    // Set up the user
    setupUser(newUser.privateKey);

    return newUser;
  };

  /**
   * Set up user from a private key
   */
  const setupUser = async (inputKey: string) => {
    try {
      const privateKeyHex = decodePrivateKey(inputKey);
      const pubkey = getPublicKeyFromPrivate(privateKeyHex);

      const npub = nip19.npubEncode(pubkey);

      const userKey = {
        privateKey: privateKeyHex,
        publicKey: pubkey,
        nsec: inputKey.startsWith("nsec")
          ? inputKey.trim()
          : nip19.nsecEncode(hexToBytes(privateKeyHex)),
        npub,
      };

      const newUser: UserInfo = {
        pubkey,
        displayName: `Account ${accounts.value.length + 1}`,
        userKeys: userKey,
      };

      user.value = { ...userKey };

      if (import.meta.client) {
        // Check if user exists in localStorage
        const existingUser = loadUser(pubkey);

        if (existingUser) {
          currentUserInfo.value = existingUser;
          const data = await getUserInfo(pubkey);

          if (data) {
            currentUserInfo.value = {
              ...data,
              userKeys: userKey,
            };
          }
          saveUser(currentUserInfo.value);
        } else {
          // Fetch user info from relays
          currentUserInfo.value = newUser;

          const data = await getUserInfo(pubkey);

          if (data) {
            currentUserInfo.value = {
              ...data,
              userKeys: userKey,
            };
          }
          saveUser(currentUserInfo.value);
        }
      } else {
        currentUserInfo.value = newUser;
      }

      return true;
    } catch (e) {
      error.value = e;
      return false;
    }
  };

  /**
   * Get user profile information
   */
  const getUserInfo = async (
    _pubkey: string,
    debug: boolean = false
  ): Promise<UserInfo | null> => {
    const pubkey = normalizeKey(_pubkey);

    isLoading.value = true;

    try {
      // Query for user profile
      const events = await queryEvents({
        kinds: [NOSTR_KINDS.PROFILE],
        authors: [pubkey],
        limit: 1,
      });

      isLoading.value = false;

      if (!events || events.length === 0) {
        if (debug) console.log(`No profile data found for pubkey: ${pubkey}`);
        return null;
      }

      const event = events[0];

      // No data
      if (!event || !event.content) {
        if (debug) console.log(`Empty profile data for pubkey: ${pubkey}`);
        return null;
      }

      // Parse profile JSON
      try {
        const profile = JSON.parse(event.content);
        const verified = !!profile.nip05; // Simplified NIP-05 verification
        const userInfo: UserInfo = {
          pubkey,
          name: profile.name || "",
          displayName: profile.display_name || profile.name || "",
          about: profile.about || "",
          picture: profile.picture || "",
          nip05: profile.nip05 || "",
          banner: profile.banner || "",
          lud16: profile.lud16 || "",
          website: profile.website || "",
          lastUpdated: event.created_at || null,
          verified,
        };

        if (debug) console.log("✅ Loaded profile:", userInfo);
        return userInfo;
      } catch (parseError) {
        console.error("❌ Failed to parse profile JSON:", parseError);
        return null;
      }
    } catch (e) {
      isLoading.value = false;
      error.value = e;
      return null;
    }
  };

  /**
   * Get multiple user profiles at once
   */
  const getUserInfoBatch = async (
    pubkeys: string[]
  ): Promise<Record<string, UserInfo>> => {
    isLoading.value = true;

    try {
      // Normalize all pubkeys
      const normalizedPubkeys = pubkeys.map((pk) => normalizeKey(pk));

      // Query for user profiles
      const events = await queryEvents({
        kinds: [NOSTR_KINDS.PROFILE],
        authors: normalizedPubkeys,
      });

      isLoading.value = false;

      const result: Record<string, UserInfo> = {};

      // Process all events and create user info objects
      for (const event of events) {
        try {
          const profile = JSON.parse(event.content);
          const pubkey = event.pubkey;
          const verified = !!profile.nip05;

          result[pubkey] = {
            pubkey,
            name: profile.name || "",
            displayName: profile.display_name || profile.name || "",
            about: profile.about || "",
            picture: profile.picture || "",
            nip05: profile.nip05 || "",
            banner: profile.banner || "",
            lud16: profile.lud16 || "",
            website: profile.website || "",
            lastUpdated: event.created_at || null,
            verified,
          };
        } catch (parseError) {
          console.error(
            `Failed to parse profile for ${event.pubkey}:`,
            parseError
          );
        }
      }

      return result;
    } catch (e) {
      isLoading.value = false;
      error.value = e;
      return {};
    }
  };

  /**
   * Fetch user's follow list
   */
  const fetchFollowList = async (pubkey: string): Promise<string[]> => {
    try {
      // Fetch contact list for the user
      const events = await queryEvents({
        kinds: [NOSTR_KINDS.CONTACT_LIST],
        authors: [pubkey],
        limit: 1, // Get the most recent contact list
      });

      // If no contact list found, return empty array
      if (!events || events.length === 0) return [];

      // Get the most recent contact list event
      const latestContactList = events[0];
      if (!latestContactList) return [];

      // Extract followed pubkeys from tags
      return latestContactList.tags
        .filter((tag: string[]) => tag[0] === "p") // Filter person tags
        .map((tag: string[]) => tag[1]) as string[]; // Extract pubkey
    } catch (error) {
      console.error("Failed to fetch follow list:", error);
      return [];
    }
  };

  /**
   * Initialize the user from local storage
   */
  const initializeUser = () => {
    if (import.meta.client) {
      const { userInfo, user: savedUser } = loadCurrentUser();

      if (userInfo) {
        currentUserInfo.value = userInfo;
      }

      if (savedUser) {
        user.value = savedUser;
      }

      // Load all accounts
      loadAllAccounts();
    }
  };

  /**
   * Update user profile (Kind 0)
   */
  const updateUserProfile = async (
    profileData: Partial<UserInfo>
  ): Promise<boolean> => {
    isLoading.value = true;
    try {
      // Get current user keys
      const { userInfo, user: storedUser } = loadCurrentUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasNip07 = typeof window !== "undefined" && (window as any).nostr;

      if (!userInfo?.userKeys?.nsec && !storedUser?.nsec && !hasNip07) {
        throw new Error("No signing keys available");
      }

      const pubkey = userInfo?.pubkey || storedUser?.publicKey || "";
      if (!pubkey) throw new Error("No public key found");

      // Construct profile content
      const content = JSON.stringify({
        name: profileData.name,
        display_name: profileData.displayName,
        about: profileData.about,
        picture: profileData.picture,
        banner: profileData.banner,
        nip05: profileData.nip05,
        lud16: profileData.lud16,
        website: profileData.website,
      });

      const event = {
        kind: NOSTR_KINDS.PROFILE,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content,
        pubkey,
      };

      let signedEvent;

      // Try NIP-07 extension first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowNostr = (window as any).nostr;
      if (hasNip07 && windowNostr?.signEvent) {
        try {
          signedEvent = await windowNostr.signEvent(event);
        } catch (e) {
          console.warn("NIP-07 signing failed or rejected", e);
        }
      }

      // Fallback to stored private key if NIP-07 unavailable or failed
      if (!signedEvent) {
        const nsecKey = userInfo?.userKeys?.nsec || storedUser?.nsec;
        if (nsecKey) {
          const decoded = nip19.decode(nsecKey);
          if (decoded.type === "nsec") {
            const secKey = decoded.data as Uint8Array;
            signedEvent = $nostr.finalizeEvent(event, secKey);
          }
        }
      }

      if (!signedEvent) {
        throw new Error("Failed to sign event");
      }

      // Publish to relays
      const published = await publishEvent(signedEvent);

      if (!published) {
        throw new Error("Failed to publish to relays");
      }

      // Update local storage
      const userKeys = userInfo?.userKeys
        ? userInfo.userKeys
        : storedUser
        ? {
            pub: storedUser.publicKey,
            sec: storedUser.privateKey,
            npub: storedUser.npub,
            nsec: storedUser.nsec,
            publicKey: storedUser.publicKey,
            privateKey: storedUser.privateKey,
          }
        : undefined;

      const updatedUserInfo: UserInfo = {
        ...userInfo,
        ...profileData,
        pubkey,
        userKeys,
      };

      saveUser(updatedUserInfo);
      currentUserInfo.value = updatedUserInfo;

      return true;
    } catch (e) {
      console.error("Failed to update profile:", e);
      error.value = e;
      throw e; // Re-throw to let component handle specific error messages if needed
    } finally {
      isLoading.value = false;
    }
  };

  // Load user data on mount
  onMounted(() => {
    initializeUser();
  });

  return {
    user,
    currentUserInfo,
    isLoading,
    error,
    createUser,
    setupUser,
    getUserInfo,
    getUserInfoBatch,
    fetchFollowList,
    initializeUser,
    updateUserProfile,
  };
};
