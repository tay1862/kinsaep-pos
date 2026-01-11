// composables/use-auth.ts
// 🔐 Hybrid Authentication - Hasura Auth + Nostr

import { ref, computed } from "vue";
import type { NostrUserKeys } from "~/types";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// Storage key - unified with use-users.ts
const AUTH_STORAGE_KEY = "bitspace_current_user";

// Types
export interface User {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  provider: "hasura" | "nostr" | "google";
  nostrPubkey?: string;
  role: "admin" | "manager" | "cashier" | "viewer";
  branchId?: string;
  createdAt: string;
  userKeys?: NostrUserKeys; // Optional - only for Nostr users
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Hasura Auth Configuration
interface HasuraAuthConfig {
  url: string; // e.g., https://your-project.hasura.app/v1/auth
  graphqlUrl: string; // e.g., https://your-project.hasura.app/v1/graphql
}

export const useAuth = () => {
  // Session tracking
  const sessionManager = useSessions();
  // State
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Config - set from environment or settings
  const config = ref<HasuraAuthConfig>({
    url: process.env.HASURA_AUTH_URL || "http://localhost:4000",
    graphqlUrl:
      process.env.HASURA_GRAPHQL_URL || "http://localhost:8080/v1/graphql",
  });

  // ============================================
  // Hasura Auth Methods
  // ============================================

  /**
   * Sign in with email/password
   */
  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `${config.value.url}/signin/email-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Sign in failed");
      }

      const data = await response.json();
      await handleAuthResponse(data, "hasura");

      // Log successful login
      try {
        const { logActivity } = useAuditLog();
        await logActivity("login", `User logged in via email: ${email}`);
      } catch {
        // Don't block login if logging fails
      }

      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Sign in failed";

      // Log failed login attempt
      try {
        const { logActivity } = useAuditLog();
        await logActivity(
          "login_failed",
          `Failed login attempt for email: ${email}`
        );
      } catch {
        // Silent fail
      }

      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Sign up with email/password
   */
  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `${config.value.url}/signup/email-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            options: {
              displayName,
              defaultRole: "cashier",
              allowedRoles: ["cashier", "viewer"],
            },
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Sign up failed");
      }

      const data = await response.json();

      // Some setups require email verification
      if (data.session) {
        await handleAuthResponse(data, "hasura");
      }

      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Sign up failed";
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Sign in with Google (OAuth)
   */
  const signInWithGoogle = async (): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      // Redirect to Hasura Auth Google OAuth
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const authUrl = `${
        config.value.url
      }/signin/provider/google?redirectTo=${encodeURIComponent(redirectUrl)}`;

      window.location.href = authUrl;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Google sign in failed";
      isLoading.value = false;
    }
  };

  /**
   * Handle OAuth callback
   */
  const handleOAuthCallback = async (): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      // Get tokens from URL hash or query params
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      const token =
        urlParams.get("refreshToken") || hashParams.get("refreshToken");

      if (token) {
        // Exchange refresh token for session
        const response = await fetch(`${config.value.url}/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: token }),
        });

        if (!response.ok) {
          throw new Error("Failed to exchange token");
        }

        const data = await response.json();
        await handleAuthResponse(data, "google");
        return true;
      }

      return false;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "OAuth callback failed";
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // ============================================
  // Nostr Auth Methods (NIP-07)
  // ============================================

  /**
   * Check if Nostr extension is available
   */
  const hasNostrExtension = (): boolean => {
    if (typeof window === "undefined") return false;
    return !!(window as unknown as { nostr?: object }).nostr;
  };

  /**
   * Sign in with Nostr extension (Alby, nos2x, etc.)
   */
  const signInWithNostr = async (): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      // Check for NIP-07 extension
      if (typeof window === "undefined") {
        throw new Error("Window not available");
      }

      const win = window as unknown as {
        nostr?: {
          getPublicKey: () => Promise<string | null> | string | null;
          signEvent: (event: object) => Promise<object>;
          // Alby specific
          enable?: () => Promise<{ enabled: boolean }>;
        };
      };

      if (!win.nostr) {
        throw new Error(
          "Nostr extension not found. Please install Alby or nos2x."
        );
      }

      console.log("[Nostr Auth] Nostr extension detected:", win.nostr);
      console.log("[Nostr Auth] Available methods:", Object.keys(win.nostr));

      // For Alby: Try to enable/request permission first
      if (typeof win.nostr.enable === "function") {
        console.log("[Nostr Auth] Detected Alby, requesting permission...");
        try {
          const enableResult = await win.nostr.enable();
          console.log("[Nostr Auth] Alby enable result:", enableResult);
        } catch (enableErr) {
          console.warn(
            "[Nostr Auth] Alby enable failed, continuing anyway:",
            enableErr
          );
        }
      }

      // Get public key - handle both sync and async returns
      let pubkey: string | null = null;

      console.log("[Nostr Auth] Calling getPublicKey...");

      try {
        const result = win.nostr.getPublicKey();
        console.log(
          "[Nostr Auth] getPublicKey raw result:",
          result,
          "type:",
          typeof result
        );

        // Handle Promise
        if (result && typeof result === "object" && "then" in result) {
          console.log("[Nostr Auth] Result is a Promise, awaiting...");
          const awaited = await result;
          console.log(
            "[Nostr Auth] Awaited result:",
            awaited,
            "type:",
            typeof awaited
          );

          if (typeof awaited === "string" && awaited.length > 0) {
            pubkey = awaited;
          }
        }
        // Handle direct string return
        else if (typeof result === "string" && result.length > 0) {
          pubkey = result;
        }
      } catch (err) {
        console.error("[Nostr Auth] getPublicKey error:", err);

        // nos2x may throw if user rejects or extension is locked
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (
          errorMessage.includes("reject") ||
          errorMessage.includes("denied")
        ) {
          throw new Error(
            "Permission denied. Please approve the request in your Nostr extension."
          );
        }
        throw new Error(
          "Failed to get public key. Please make sure your Nostr extension is unlocked."
        );
      }

      console.log("[Nostr Auth] Final pubkey:", pubkey);

      if (!pubkey || typeof pubkey !== "string" || pubkey.length < 32) {
        throw new Error(
          "Could not get public key from Nostr extension.\n\n" +
            "💡 Troubleshooting:\n" +
            "• nos2x: Click the extension icon and make sure you have a key\n" +
            "• Alby: Go to Settings → Nostr → Enable Nostr\n" +
            "• Try refreshing the page after setup"
        );
      }

      console.log("[Nostr Auth] Got pubkey:", pubkey.slice(0, 16) + "...");

      // Create challenge for verification
      const challenge = crypto.randomUUID();
      const timestamp = Math.floor(Date.now() / 1000);

      // Sign a NIP-98 style auth event
      const authEvent = {
        kind: NOSTR_KINDS.HTTP_AUTH,
        created_at: timestamp,
        tags: [
          ["challenge", challenge],
          ["method", "GET"],
          ["u", window.location.origin],
        ],
        content: "BNOS Login",
      };

      let signedEvent: object;
      try {
        signedEvent = await win.nostr.signEvent(authEvent);
      } catch {
        throw new Error(
          "Failed to sign event. Please approve the signature request."
        );
      }

      // Create user from Nostr pubkey
      const shortPubkey = pubkey.slice(0, 8);
      const nostrUser: User = {
        id: `nostr_${pubkey.slice(0, 16)}`,
        displayName: `nostr:${shortPubkey}...`,
        provider: "nostr",
        nostrPubkey: pubkey,
        role: "cashier",
        createdAt: new Date().toISOString(),
      };

      user.value = nostrUser;
      accessToken.value = JSON.stringify(signedEvent); // Store signed event as token

      // Save to cookie for middleware
      const nostrCookie = useCookie("nostr-pubkey", {
        maxAge: 60 * 60 * 24 * 30,
      }); // 30 days
      nostrCookie.value = pubkey;

      // Save to localStorage
      saveAuthState();

      // Log successful Nostr login
      try {
        const { logActivity } = useAuditLog();
        await logActivity("login", `User logged in via Nostr extension`);
      } catch {
        // Don't block login if logging fails
      }

      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Nostr sign in failed";

      // Log failed login attempt
      try {
        const { logActivity } = useAuditLog();
        await logActivity(
          "login_failed",
          `Failed Nostr login: ${
            e instanceof Error ? e.message : "Unknown error"
          }`
        );
      } catch {
        // Silent fail
      }

      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Sign in with npub (read-only mode, no signing capability)
   * This is useful when extension is not working properly
   */
  const signInWithNpub = async (npubOrHex: string): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      let pubkey = npubOrHex.trim();

      // Convert npub to hex if needed
      if (pubkey.startsWith("npub1")) {
        // Simple bech32 decode - npub1 prefix
        // For production, use a proper bech32 library
        // This is a simplified version that works for most cases
        const { decode } = await import("nostr-tools/nip19");
        const decoded = decode(pubkey);
        if (decoded.type !== "npub") {
          throw new Error("Invalid npub format");
        }
        pubkey = decoded.data;
      }

      // Validate hex pubkey (64 characters, hex only)
      if (!/^[0-9a-f]{64}$/i.test(pubkey)) {
        throw new Error(
          "Invalid public key format. Please enter a valid npub or hex pubkey."
        );
      }

      console.log(
        "[Nostr Auth] Manual login with pubkey:",
        pubkey.slice(0, 16) + "..."
      );

      // Create user (read-only mode - no signed event)
      const shortPubkey = pubkey.slice(0, 8);
      const nostrUser: User = {
        id: `nostr_${pubkey.slice(0, 16)}`,
        displayName: `nostr:${shortPubkey}...`,
        provider: "nostr",
        nostrPubkey: pubkey,
        role: "viewer", // Read-only role since we can't sign
        createdAt: new Date().toISOString(),
      };

      user.value = nostrUser;
      accessToken.value = `npub_readonly_${pubkey}`; // Mark as read-only

      // Save to cookie for middleware
      const nostrCookie = useCookie("nostr-pubkey", {
        maxAge: 60 * 60 * 24 * 30,
      });
      nostrCookie.value = pubkey;

      // Save to localStorage
      saveAuthState();

      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Invalid npub";
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Link Nostr to existing Hasura account
   */
  const linkNostrToAccount = async (): Promise<boolean> => {
    if (!user.value || !accessToken.value) {
      error.value = "Must be logged in to link Nostr";
      return false;
    }

    try {
      if (typeof window === "undefined" || !("nostr" in window)) {
        throw new Error("Nostr extension not found");
      }

      const nostr = window as unknown as {
        nostr: { getPublicKey: () => Promise<string> };
      };
      const pubkey = await nostr.nostr.getPublicKey();

      // Update user metadata in Hasura
      const response = await fetch(config.value.graphqlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken.value}`,
        },
        body: JSON.stringify({
          query: `
            mutation UpdateUserNostr($userId: uuid!, $nostrPubkey: String!) {
              update_users_by_pk(
                pk_columns: { id: $userId }
                _set: { nostr_pubkey: $nostrPubkey }
              ) {
                id
                nostr_pubkey
              }
            }
          `,
          variables: {
            userId: user.value.id,
            nostrPubkey: pubkey,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to link Nostr");
      }

      user.value.nostrPubkey = pubkey;
      saveAuthState();

      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to link Nostr";
      return false;
    }
  };

  // ============================================
  // Common Methods
  // ============================================

  /**
   * Handle auth response from Hasura
   */
  const handleAuthResponse = async (
    data: {
      session?: {
        accessToken: string;
        refreshToken: string;
        user: Record<string, unknown>;
      };
    },
    provider: "hasura" | "google"
  ) => {
    if (data.session) {
      accessToken.value = data.session.accessToken;
      refreshToken.value = data.session.refreshToken;

      const userData = data.session.user;
      user.value = {
        id: userData.id as string,
        email: userData.email as string,
        displayName: (userData.displayName || userData.email) as string,
        avatarUrl: userData.avatarUrl as string | undefined,
        provider,
        nostrPubkey: userData.nostrPubkey as string | undefined,
        role: (userData.defaultRole || "cashier") as User["role"],
        branchId: userData.branchId as string | undefined,
        createdAt: userData.createdAt as string,
      };

      saveAuthState();
    }
  };

  /**
   * Refresh access token
   */
  const refreshAccessToken = async (): Promise<boolean> => {
    if (!refreshToken.value) return false;

    try {
      const response = await fetch(`${config.value.url}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshToken.value }),
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await response.json();
      accessToken.value = data.accessToken;

      if (data.refreshToken) {
        refreshToken.value = data.refreshToken;
      }

      saveAuthState();
      return true;
    } catch {
      // Token expired, sign out
      signOut();
      return false;
    }
  };

  /**
   * Sign out - clears ALL application data for a clean slate
   * @param options.keepWorkspaces - If true, preserves workspace list for quick re-login
   * @param options.redirectTo - Custom redirect path after logout
   */
  const signOut = async (options?: { 
    keepWorkspaces?: boolean;
    redirectTo?: string;
  }) => {
    const { keepWorkspaces = false, redirectTo = "/auth/signin" } = options || {};

    // Log logout before clearing data
    try {
      const { logActivity } = useAuditLog();
      await logActivity("logout", `User logged out`);
    } catch {
      // Don't block logout if logging fails
    }

    // Call Hasura signout if we have a token
    if (accessToken.value && user.value?.provider !== "nostr") {
      try {
        await fetch(`${config.value.url}/signout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken.value}`,
          },
        });
      } catch {
        // Ignore errors on signout
      }
    }

    // Clear state
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;

    // Keys to preserve (only theme/locale preferences if not keeping workspaces)
    const keysToPreserve = [
      "locale",
      "theme-color",
      "colorMode",
    ];

    // If keeping workspaces, preserve those too
    if (keepWorkspaces) {
      keysToPreserve.push(
        "bitspace_workspaces",
        "bitspace_current_workspace",
        "userList" // Account list for quick switch
      );
    }

    // Clear ALL localStorage data except preserved keys
    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      if (!keysToPreserve.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage completely
    try {
      sessionStorage.clear();
      console.log("[Auth] Cleared sessionStorage");
    } catch (e) {
      console.warn("[Auth] Failed to clear sessionStorage:", e);
    }

    // Clear all auth cookies
    const cookiesToClear = [
      "nostr-pubkey",
      "staff-user-id",
      "auth-token",
      "refresh-token",
    ];
    cookiesToClear.forEach((cookieName) => {
      try {
        const cookie = useCookie(cookieName);
        cookie.value = null;
      } catch {
        // Cookie may not exist
      }
    });

    // Clear IndexedDB (Dexie database) for complete data cleanup
    try {
      const { db } = await import("~/db/db");
      await db.delete();
      console.log("[Auth] Cleared IndexedDB");
    } catch (e) {
      console.warn("[Auth] Failed to clear IndexedDB:", e);
    }

    // Clear shop manager workspaces if not keeping them
    if (!keepWorkspaces) {
      try {
        const { clearAllWorkspaces } = useShopManager();
        clearAllWorkspaces();
      } catch {
        // Shop manager may not be initialized
      }
    }

    console.log("[Auth] Signed out - all data, cookies, and storage cleared");
    console.log("[Auth] Preserved keys:", keysToPreserve);

    // Redirect to login
    navigateTo(redirectTo);
  };

  /**
   * Save auth state to localStorage
   */
  const saveAuthState = () => {
    const state: AuthState = {
      user: user.value,
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
      isAuthenticated: !!user.value,
      isLoading: false,
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));

    // Register device login session
    if (user.value) {
      sessionManager.registerLogin();
    }
  };

  /**
   * Restore auth state from localStorage
   */
  const restoreAuthState = () => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const state: AuthState = JSON.parse(stored);
        user.value = state.user;
        accessToken.value = state.accessToken;
        refreshToken.value = state.refreshToken;

        // Update session activity
        if (state.user) {
          sessionManager.registerLogin();
        }

        // Refresh token if Hasura auth
        if (state.user?.provider !== "nostr" && state.refreshToken) {
          refreshAccessToken();
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  };

  /**
   * Check if user has permission
   */
  const hasPermission = (requiredRole: User["role"]): boolean => {
    if (!user.value) return false;

    const roleHierarchy: Record<User["role"], number> = {
      admin: 4,
      manager: 3,
      cashier: 2,
      viewer: 1,
    };

    return roleHierarchy[user.value.role] >= roleHierarchy[requiredRole];
  };

  // Computed
  const isAuthenticated = computed(() => !!user.value);
  const isNostrUser = computed(() => user.value?.provider === "nostr");
  const userDisplayName = computed(
    () => user.value?.displayName || user.value?.email || "User"
  );

  // Initialize
  if (typeof window !== "undefined") {
    restoreAuthState();
  }

  return {
    // State
    user,
    accessToken,
    refreshToken,
    isLoading,
    error,
    config,

    // Computed
    isAuthenticated,
    isNostrUser,
    userDisplayName,

    // Methods
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithNostr,
    signInWithNpub,
    handleOAuthCallback,
    linkNostrToAccount,
    refreshAccessToken,
    signOut,
    hasPermission,
    hasNostrExtension,
    restoreAuthState,
  };
};
