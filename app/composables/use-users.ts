// ============================================
// 👤 BITSPACE USERS COMPOSABLE
// User & Role Management with Hybrid Auth
// Supports: Nostr (npub/nsec) + Password + PIN
// ============================================

import type { StoreUser, UserRole, UserPermissions, AuthMethod } from "~/types";
import { DEFAULT_PERMISSIONS } from "~/types";

// ============================================
// 📦 STORAGE KEYS (Single Source of Truth)
// ============================================
const STORAGE_KEYS = {
  USERS: "bitspace_users", // All staff users with roles/permissions
  CURRENT_USER: "bitspace_current_user", // Current logged-in staff user
  NOSTR_PROFILE: "nostr_user_profile", // Nostr profile from relays (shared with use-nostr-storage)
} as const;

// Singleton state (shared across all composable instances)
const users = ref<StoreUser[]>([]);
const currentUser = ref<StoreUser | null>(null);
const isInitialized = ref(false);
let initPromise: Promise<void> | null = null;

export function useUsers() {
  const security = useSecurity();
  const staffAuth = useStaffAuth();

  // ============================================
  // 🆔 USER MANAGEMENT
  // ============================================

  function generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new user with hybrid auth support
   */
  async function createUser(userData: {
    name: string;
    email?: string;
    pin?: string;
    password?: string;
    role: UserRole;
    branchId?: string;
    npub?: string;
    avatar?: string;
    authMethod?: AuthMethod;
    expiresAt?: string;
  }): Promise<StoreUser | null> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error("Permission denied: Cannot manage users");
      return null;
    }

    try {
      // Determine auth method
      const authMethod: AuthMethod =
        userData.authMethod ||
        (userData.npub ? "nostr" : userData.password ? "password" : "pin");

      // Hash credentials based on auth method
      let hashedPin: string | undefined;
      let passwordHash: string | undefined;
      let pubkeyHex: string | undefined;

      if (userData.pin) {
        hashedPin = await staffAuth.hashPin(userData.pin);
      }

      if (userData.password && authMethod === "password") {
        passwordHash = await staffAuth.setUserPassword(userData.password);
      }

      // Convert npub to hex if provided
      if (userData.npub) {
        const nostrKey = useNostrKey();
        try {
          pubkeyHex = nostrKey.normalizeKey(userData.npub);
        } catch {
          console.error("Invalid npub format");
          return null;
        }
      }

      const newUser: StoreUser = {
        id: generateUserId(),
        name: userData.name.trim(),
        email: userData.email?.trim(),
        pin: hashedPin,
        role: userData.role,
        permissions: { ...DEFAULT_PERMISSIONS[userData.role] },
        branchId: userData.branchId,
        avatar: userData.avatar,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Hybrid auth fields
        authMethod,
        npub: userData.npub,
        pubkeyHex,
        passwordHash,
        // Access control
        grantedBy: currentUser.value?.npub,
        grantedAt: new Date().toISOString(),
        expiresAt: userData.expiresAt,
      };

      users.value.push(newUser);
      await saveUsers();

      await security.addAuditLog(
        "role_change",
        currentUser.value?.id || "system",
        `Created user: ${newUser.name} with role: ${newUser.role} (auth: ${authMethod})`,
        currentUser.value?.name
      );

      // Also log to centralized team audit log
      try {
        const { logActivity } = useAuditLog();
        await logActivity(
          "user_create",
          `Created employee: ${newUser.name} (${newUser.role})`,
          {
            resourceType: "user",
            resourceId: newUser.id,
            metadata: {
              role: newUser.role,
              authMethod,
            },
          }
        );
      } catch {
        // Don't block user creation if logging fails
      }

      return newUser;
    } catch (error) {
      console.error("Failed to create user:", error);
      return null;
    }
  }

  /**
   * Update user
   */
  async function updateUser(
    userId: string,
    updates: Partial<Omit<StoreUser, "id" | "createdAt">>
  ): Promise<boolean> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      // Allow users to update their own non-role fields
      if (userId !== currentUser.value.id) {
        console.error("Permission denied: Cannot manage users");
        return false;
      }
      // Can't change own role or permissions
      if (updates.role || updates.permissions) {
        console.error("Permission denied: Cannot change own role");
        return false;
      }
    }

    const index = users.value.findIndex((u) => u.id === userId);
    if (index === -1) return false;

    const user = users.value[index];
    if (!user) return false;

    // Hash PIN if updating
    if (updates.pin) {
      updates.pin = await staffAuth.hashPin(updates.pin);
    }

    // Hash password if updating
    if (updates.passwordHash && !updates.passwordHash.includes(":")) {
      // If it doesn't contain ':', it's a plain password
      updates.passwordHash = await staffAuth.setUserPassword(
        updates.passwordHash
      );
    }

    users.value[index] = {
      ...user,
      ...updates,
      name: updates.name ? updates.name.trim() : user.name,
      email:
        updates.email !== undefined
          ? updates.email
            ? updates.email.trim()
            : null
          : user.email,
      updatedAt: new Date().toISOString(),
    } as StoreUser;

    await saveUsers();

    // Update current user if it's the same
    if (currentUser.value?.id === userId) {
      currentUser.value = users.value[index] ?? null;
      saveCurrentUser(currentUser.value);
    }

    await security.addAuditLog(
      "role_change",
      currentUser.value?.id || "system",
      `Updated user: ${user.name}`,
      currentUser.value?.name
    );

    // Also log to centralized team audit log
    try {
      const { logActivity } = useAuditLog();
      await logActivity("user_update", `Updated employee: ${user.name}`, {
        resourceType: "user",
        resourceId: userId,
        metadata: {
          role: users.value[index]?.role,
        },
      });
    } catch {
      // Don't block user update if logging fails
    }

    return true;
  }

  /**
   * Delete user (Soft Delete)
   */
  async function deleteUser(userId: string): Promise<boolean> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error("Permission denied: Cannot manage users");
      return false;
    }

    // Cannot delete self
    if (currentUser.value?.id === userId) {
      console.error("Cannot delete current user");
      return false;
    }

    const user = users.value.find((u) => u.id === userId);
    if (!user) return false;

    // Soft Delete
    user.deletedAt = new Date().toISOString();
    user.isActive = false; // Also deactivate
    user.updatedAt = new Date().toISOString();

    await saveUsers();

    await security.addAuditLog(
      "role_change",
      currentUser.value?.id || "system",
      `Deleted user (soft): ${user.name}`,
      currentUser.value?.name
    );

    // Also log to centralized team audit log
    try {
      const { logActivity } = useAuditLog();
      await logActivity("user_delete", `Deleted employee: ${user.name}`, {
        resourceType: "user",
        resourceId: userId,
      });
    } catch {
      // Don't block user deletion if logging fails
    }

    return true;
  }

  /**
   * Restore deleted user
   */
  async function restoreDeletedUser(userId: string): Promise<boolean> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error("Permission denied: Cannot manage users");
      return false;
    }

    const user = users.value.find((u) => u.id === userId);
    if (!user) return false;

    user.deletedAt = undefined;
    user.isActive = true; // Reactivate
    user.updatedAt = new Date().toISOString();

    await saveUsers();

    await security.addAuditLog(
      "role_change",
      currentUser.value?.id || "system",
      `Restored deleted user: ${user.name}`,
      currentUser.value?.name
    );

    return true;
  }

  /**
   * Get user by ID
   */
  function getUser(userId: string): StoreUser | undefined {
    return users.value.find((u) => u.id === userId);
  }

  /**
   * Get users by role
   */
  function getUsersByRole(role: UserRole): StoreUser[] {
    return users.value.filter((u) => u.role === role && !u.deletedAt);
  }

  /**
   * Update user permissions
   */
  async function updateUserPermissions(
    userId: string,
    permissions: Partial<UserPermissions>
  ): Promise<boolean> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error("Permission denied: Cannot manage users");
      return false;
    }

    const index = users.value.findIndex((u) => u.id === userId);
    if (index === -1) return false;

    const user = users.value[index];
    if (!user) return false;

    user.permissions = {
      ...user.permissions,
      ...permissions,
    };
    user.updatedAt = new Date().toISOString();

    await saveUsers();

    await security.addAuditLog(
      "role_change",
      currentUser.value?.id || "system",
      `Updated permissions for: ${user.name}`,
      currentUser.value?.name
    );

    return true;
  }

  /**
   * Change user role (updates permissions to defaults)
   */
  async function changeUserRole(
    userId: string,
    newRole: UserRole
  ): Promise<boolean> {
    return updateUser(userId, {
      role: newRole,
      permissions: { ...DEFAULT_PERMISSIONS[newRole] },
    });
  }

  // ============================================
  // 🔐 AUTHENTICATION (Hybrid: Nostr + Password + PIN)
  // ============================================

  /**
   * Login with PIN (quick access)
   */
  async function loginWithPin(pin: string): Promise<StoreUser | null> {
    // Filter out deleted users before passing to auth
    const activeUsers = users.value.filter((u) => !u.deletedAt);
    const result = await staffAuth.loginWithPin(pin, activeUsers);

    if (result.success && result.user) {
      currentUser.value = result.user;
      result.user.lastLoginAt = new Date().toISOString();
      result.user.failedLoginAttempts = 0;
      await saveUsers();
      saveCurrentUser(result.user);

      await security.addAuditLog(
        "login",
        result.user.id,
        "PIN login",
        result.user.name
      );
      return result.user;
    }

    return null;
  }

  /**
   * Login with Nostr (nsec key)
   */
  async function loginWithNostr(
    nsec: string
  ): Promise<{ success: boolean; user?: StoreUser; error?: string }> {
    // Filter out deleted users before passing to auth
    const activeUsers = users.value.filter((u) => !u.deletedAt);
    const result = await staffAuth.loginWithNostr(nsec, activeUsers);

    if (result.success && result.user) {
      currentUser.value = result.user;
      result.user.lastLoginAt = new Date().toISOString();
      result.user.failedLoginAttempts = 0;
      await saveUsers();
      saveCurrentUser(result.user);

      await security.addAuditLog(
        "login",
        result.user.id,
        `Nostr login (${result.user.npub?.slice(0, 12)}...)`,
        result.user.name
      );
    }

    return result;
  }

  /**
   * Login with password (email/username + password)
   */
  async function loginWithPassword(
    identifier: string,
    password: string
  ): Promise<{ success: boolean; user?: StoreUser; error?: string }> {
    // Filter out deleted users before passing to auth
    const activeUsers = users.value.filter((u) => !u.deletedAt);
    const result = await staffAuth.loginWithPassword(
      identifier,
      password,
      activeUsers
    );

    if (result.success && result.user) {
      currentUser.value = result.user;
      result.user.lastLoginAt = new Date().toISOString();
      result.user.failedLoginAttempts = 0;
      await saveUsers();
      saveCurrentUser(result.user);

      await security.addAuditLog(
        "login",
        result.user.id,
        "Password login",
        result.user.name
      );
    } else if (result.user) {
      // Update failed attempts
      const index = users.value.findIndex((u) => u.id === result.user!.id);
      if (index !== -1) {
        users.value[index] = result.user;
        await saveUsers();
      }
    }

    return result;
  }

  /**
   * Login with user ID (for switching users - requires PIN verification)
   */
  async function loginAsUser(userId: string): Promise<StoreUser | null> {
    const user = users.value.find(
      (u) => u.id === userId && u.isActive && !u.deletedAt
    );

    if (user) {
      // Check if user is revoked or expired
      if (user.revokedAt) {
        console.error("User access has been revoked");
        return null;
      }
      if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
        console.error("User access has expired");
        return null;
      }

      currentUser.value = user;
      user.lastLoginAt = new Date().toISOString();
      await saveUsers();
      saveCurrentUser(user);

      await security.addAuditLog("login", user.id, "User switch", user.name);
      return user;
    }

    return null;
  }

  /**
   * Logout current user
   */
  async function logout(): Promise<void> {
    if (currentUser.value) {
      await security.addAuditLog(
        "logout",
        currentUser.value.id,
        "Logout",
        currentUser.value.name
      );
    }
    currentUser.value = null;
    staffAuth.endSession();
    saveCurrentUser(null);
  }

  /**
   * Set current user (for when login happens externally like StaffLogin component)
   */
  function setCurrentUser(user: StoreUser | null): void {
    currentUser.value = user;
    if (user) {
      saveCurrentUser(user);
    }
  }

  /**
   * Verify PIN for sensitive actions
   */
  async function verifyPin(pin: string): Promise<boolean> {
    if (!currentUser.value?.pin) return true; // No PIN set
    const hashedPin = await staffAuth.hashPin(pin);
    return currentUser.value.pin === hashedPin;
  }

  // ============================================
  // 🚫 ACCESS REVOCATION
  // ============================================

  /**
   * Revoke user's access (immediate termination)
   */
  async function revokeUserAccess(
    userId: string,
    reason?: string
  ): Promise<boolean> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error("Permission denied: Cannot manage users");
      return false;
    }

    const user = users.value.find((u) => u.id === userId);
    if (!user) return false;

    // Cannot revoke self
    if (currentUser.value?.id === userId) {
      console.error("Cannot revoke own access");
      return false;
    }

    user.revokedAt = new Date().toISOString();
    user.revocationReason = reason || "Access revoked by administrator";
    user.isActive = false;
    user.updatedAt = new Date().toISOString();

    await saveUsers();

    await security.addAuditLog(
      "permission_revoke",
      currentUser.value?.id || "system",
      `Revoked access for: ${user.name}${reason ? ` - ${reason}` : ""}`,
      currentUser.value?.name
    );

    return true;
  }

  /**
   * Restore user's access
   */
  async function restoreUserAccess(userId: string): Promise<boolean> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error("Permission denied: Cannot manage users");
      return false;
    }

    const user = users.value.find((u) => u.id === userId);
    if (!user) return false;

    user.revokedAt = undefined;
    user.revocationReason = undefined;
    user.isActive = true;
    user.grantedAt = new Date().toISOString();
    user.grantedBy = currentUser.value?.npub;
    user.updatedAt = new Date().toISOString();

    await saveUsers();

    await security.addAuditLog(
      "permission_grant",
      currentUser.value?.id || "system",
      `Restored access for: ${user.name}`,
      currentUser.value?.name
    );

    return true;
  }

  /**
   * Set access expiry for a user
   */
  async function setUserExpiry(
    userId: string,
    expiresAt: string | null
  ): Promise<boolean> {
    // Check permission
    if (currentUser.value && !currentUser.value.permissions.canManageUsers) {
      console.error("Permission denied: Cannot manage users");
      return false;
    }

    const user = users.value.find((u) => u.id === userId);
    if (!user) return false;

    user.expiresAt = expiresAt || undefined;
    user.updatedAt = new Date().toISOString();

    await saveUsers();

    await security.addAuditLog(
      "role_change",
      currentUser.value?.id || "system",
      `Set access expiry for: ${user.name} - ${expiresAt || "Never"}`,
      currentUser.value?.name
    );

    return true;
  }

  /**
   * Get user by npub
   */
  function getUserByNpub(npub: string): StoreUser | undefined {
    const nostrKey = useNostrKey();
    const pubkeyHex = nostrKey.normalizeKey(npub);
    return users.value.find(
      (u) => u.npub === npub || u.pubkeyHex === pubkeyHex
    );
  }

  // ============================================
  // 🛡️ PERMISSION CHECKS
  // ============================================

  /**
   * Check if current user has permission
   */
  function hasPermission(permission: keyof UserPermissions): boolean {
    if (!currentUser.value) return false;
    return currentUser.value.permissions[permission] === true;
  }

  /**
   * Check if current user is owner
   */
  function isOwner(): boolean {
    return currentUser.value?.role === "owner";
  }

  /**
   * Check if current user is admin or owner
   */
  function isAdminOrOwner(): boolean {
    return (
      currentUser.value?.role === "owner" || currentUser.value?.role === "admin"
    );
  }

  /**
   * Guard for routes/actions requiring permission
   */
  function requirePermission(permission: keyof UserPermissions): boolean {
    if (!hasPermission(permission)) {
      console.warn(`Permission denied: ${permission}`);
      return false;
    }
    return true;
  }

  // ============================================
  // 💾 STORAGE
  // ============================================

  /**
   * Save users to storage (local + Nostr sync)
   */
  async function saveUsers(): Promise<void> {
    // 1. Save to localStorage (always)
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users.value));

    // 2. Sync to Nostr relays (if owner is logged in with Nostr)
    try {
      const nostrData = useNostrData();
      let syncedCount = 0;
      for (const user of users.value) {
        const event = await nostrData.saveStaff(user);
        if (event) {
          syncedCount++;
        }
      }
    } catch (error) {
      console.warn(
        "[useUsers] Nostr sync failed (local save succeeded):",
        error
      );
      // Don't throw - local save succeeded, Nostr is optional
    }
  }

  /**
   * Load users from storage (local + Nostr sync)
   */
  async function loadUsers(): Promise<void> {
    // 1. Load from localStorage first (fast, offline-first)
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    if (stored) {
      try {
        users.value = JSON.parse(stored);
      } catch {
        /* continue to try other sources */
      }
    }

    // 2. Try to fetch from Nostr relays (for cross-device sync)
    try {
      const nostrData = useNostrData();
      const nostrUsers = await nostrData.getAllStaff();

      if (nostrUsers.length > 0) {
        // Merge Nostr users with local users (Nostr takes precedence for conflicts)
        const localMap = new Map(users.value.map((u) => [u.id, u]));

        for (const nostrUser of nostrUsers) {
          const local = localMap.get(nostrUser.id);
          if (!local) {
            // New user from Nostr - add to local
            console.log(
              "[useUsers] ➕ Adding new user from Nostr:",
              nostrUser.name
            );
            users.value.push(nostrUser);
          } else if (
            new Date(nostrUser.updatedAt || 0) > new Date(local.updatedAt || 0)
          ) {
            // Nostr version is newer - update local

            const index = users.value.findIndex((u) => u.id === nostrUser.id);
            if (index !== -1) {
              users.value[index] = nostrUser;
            }
          }
        }

        // Save merged result back to localStorage
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users.value));
      }
    } catch (error) {
      console.warn(
        "[useUsers] ❌ Nostr fetch failed (using local data):",
        error
      );
      // Don't throw - local data is still usable
    }

    // 3. Fallback to encrypted storage if nothing else worked
    if (users.value.length === 0) {
      const encrypted = await security.retrieveAndDecrypt<StoreUser[]>(
        STORAGE_KEYS.USERS
      );
      if (encrypted) {
        users.value = encrypted;
      }
    }
  }

  /**
   * Load users from localStorage only (safe for signin page)
   * Does NOT create default owner or sync to Nostr
   */
  function loadUsersOnly(): void {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    if (stored) {
      try {
        users.value = JSON.parse(stored);
      } catch {
        users.value = [];
      }
    }
  }

  /**
   * Save current user to storage and set auth cookie
   */
  function saveCurrentUser(user: StoreUser | null): void {
    const staffCookie = useCookie("staff-user-id", {
      maxAge: 60 * 60 * 24 * 30,
    }); // 30 days

    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      staffCookie.value = user.id; // Set cookie for auth middleware
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      staffCookie.value = null; // Clear cookie on logout
    }
  }

  /**
   * Refresh current user's profile from Nostr storage
   * Call this after profile is updated in account settings
   */
  function refreshCurrentUserProfile(): void {
    if (!currentUser.value) return;

    const profileData = getNostrProfileData();
    if (!profileData) return;

    // Only update if pubkeys match
    const profile = localStorage.getItem(STORAGE_KEYS.NOSTR_PROFILE);
    if (profile) {
      try {
        const data = JSON.parse(profile);
        if (data.pubkey && data.pubkey === currentUser.value.pubkeyHex) {
          // Update current user with new profile data
          if (profileData.name) currentUser.value.name = profileData.name;
          if (profileData.avatar) currentUser.value.avatar = profileData.avatar;

          // Save to storage and users list
          saveCurrentUser(currentUser.value);

          // Also update in users list
          const userIndex = users.value.findIndex(
            (u) => u.id === currentUser.value?.id
          );
          if (userIndex !== -1) {
            users.value[userIndex] = { ...currentUser.value };
            saveUsers();
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  /**
   * Get Nostr profile data from storage
   */
  function getNostrProfileData(): { name?: string; avatar?: string } | null {
    const profile = localStorage.getItem(STORAGE_KEYS.NOSTR_PROFILE);
    if (profile) {
      try {
        const data = JSON.parse(profile);
        return { name: data.name || data.display_name, avatar: data.picture };
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  /**
   * Create default owner if no users exist
   */
  async function ensureDefaultOwner(): Promise<void> {
    if (users.value.length > 0) return;

    const nostrPubkeyCookie = useCookie("nostr-pubkey");
    const nostrPubkey = nostrPubkeyCookie.value;

    let npub: string | undefined;
    let pubkeyHex: string | undefined;
    let ownerName = "Owner";
    let avatar: string | undefined;

    if (nostrPubkey) {
      const nostrKey = useNostrKey();
      try {
        npub = nostrKey.hexToNpub(nostrPubkey);
        pubkeyHex = nostrPubkey;
        const profileData = getNostrProfileData();
        if (profileData?.name) ownerName = profileData.name;
        if (profileData?.avatar) avatar = profileData.avatar;
      } catch (e) {
        console.error("Error converting pubkey:", e);
      }
    }

    const defaultOwner: StoreUser = {
      id: generateUserId(),
      name: ownerName,
      role: "owner",
      permissions: { ...DEFAULT_PERMISSIONS.owner },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authMethod: npub ? "nostr" : "pin",
      npub,
      pubkeyHex,
      avatar,
      grantedAt: new Date().toISOString(),
    };

    users.value.push(defaultOwner);
    currentUser.value = defaultOwner;
    await saveUsers();
    saveCurrentUser(defaultOwner);
  }

  /**
   * Sync Nostr owner - ensure logged-in Nostr user is linked to owner account
   */
  async function syncNostrOwner(): Promise<StoreUser | null> {
    const nostrPubkeyCookie = useCookie("nostr-pubkey");
    const nostrPubkey = nostrPubkeyCookie.value;

    if (!nostrPubkey) return null;

    const nostrKey = useNostrKey();
    let npub: string;
    try {
      npub = nostrKey.hexToNpub(nostrPubkey);
    } catch {
      return null;
    }

    // Check if user already exists with this npub
    const existingUser = users.value.find(
      (u) => u.pubkeyHex === nostrPubkey || u.npub === npub
    );

    if (existingUser) {
      currentUser.value = existingUser;
      saveCurrentUser(existingUser);
      return existingUser;
    }

    // Check if there's a default owner without npub that we can link
    const unlinkedOwner = users.value.find(
      (u) => u.role === "owner" && !u.npub && !u.pubkeyHex
    );

    if (unlinkedOwner) {
      const profileData = getNostrProfileData();

      unlinkedOwner.npub = npub;
      unlinkedOwner.pubkeyHex = nostrPubkey;
      unlinkedOwner.authMethod = "nostr";
      unlinkedOwner.updatedAt = new Date().toISOString();

      if (profileData?.name) unlinkedOwner.name = profileData.name;
      if (profileData?.avatar) unlinkedOwner.avatar = profileData.avatar;

      await saveUsers();
      currentUser.value = unlinkedOwner;
      saveCurrentUser(unlinkedOwner);
      return unlinkedOwner;
    }

    // Create new owner for this Nostr user
    const profileData = getNostrProfileData();

    const newOwner: StoreUser = {
      id: generateUserId(),
      name: profileData?.name || "Owner",
      role: "owner",
      permissions: { ...DEFAULT_PERMISSIONS.owner },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authMethod: "nostr",
      npub,
      pubkeyHex: nostrPubkey,
      avatar: profileData?.avatar,
      grantedAt: new Date().toISOString(),
    };

    users.value.push(newOwner);
    await saveUsers();
    currentUser.value = newOwner;
    saveCurrentUser(newOwner);

    return newOwner;
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  async function initialize(): Promise<void> {
    // Return existing promise if initialization is in progress
    if (initPromise) {
      return initPromise;
    }

    if (isInitialized.value) {
      return;
    }

    // Create and store the promise
    initPromise = (async () => {
      await loadUsers();
      await ensureDefaultOwner();

      // 1. Try to restore active session first (Staff or Owner)
      const storedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      let sessionRestored = false;

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          const user = users.value.find(
            (u) => u.id === parsed.id && u.isActive
          );
          if (user) {
            currentUser.value = user;
            sessionRestored = true;
          } else {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          }
        } catch {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
      }

      // 2. If no active session, check for Nostr Owner auto-login
      if (!sessionRestored) {
        const nostrPubkeyCookie = useCookie("nostr-pubkey");
        if (nostrPubkeyCookie.value) {
          await syncNostrOwner();
        }
      }

      isInitialized.value = true;
    })();

    return initPromise;
  }

  // NOTE: Auto-initialize removed to prevent creating default owner on signin page
  // Pages that need users should call initialize() explicitly after successful auth
  // The signin page should NOT initialize users - only authenticated pages should

  return {
    // State
    users: computed(() => users.value),
    currentUser: computed(() => currentUser.value),
    isLoggedIn: computed(() => currentUser.value !== null),
    isInitialized: computed(() => isInitialized.value),

    // User management
    createUser,
    updateUser,
    deleteUser,
    getUser,
    getUsersByRole,
    getUserByNpub,
    updateUserPermissions,
    changeUserRole,

    // Authentication (Hybrid: Nostr + Password + PIN)
    loginWithPin,
    loginWithNostr,
    loginWithPassword,
    loginAsUser,
    logout,
    verifyPin,
    setCurrentUser,

    // Access control
    revokeUserAccess,
    restoreUserAccess,
    restoreDeletedUser, // Soft delete restore
    setUserExpiry,

    // Permissions
    hasPermission,
    isOwner,
    isAdminOrOwner,
    requirePermission,

    // Profile sync
    refreshCurrentUserProfile,

    // Init & Sync
    initialize,
    syncNostrOwner,
    refreshFromNostr: loadUsers, // Force reload from Nostr (bypasses isInitialized)
    loadUsersOnly, // Safe load for signin page (no default owner creation)
  };
}
