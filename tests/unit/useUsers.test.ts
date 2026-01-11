import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUsers } from "../../app/composables/use-users";
import { setActivePinia, createPinia } from "pinia";

// Mock dependencies
vi.mock("../../app/composables/use-security", () => ({
  useSecurity: () => ({
    addAuditLog: vi.fn(),
    retrieveAndDecrypt: vi.fn().mockResolvedValue(null),
  }),
}));

// Mock Nuxt app to prevent "instance unavailable" errors
vi.mock("#app", () => ({
  useNuxtApp: () => ({
    $nostr: {
      publish: vi.fn(),
      subscribe: vi.fn(),
    },
  }),
}));

// Mock nostr composables
vi.mock("../../app/composables/use-nostr-relay", () => ({
  useNostrRelay: () => ({
    publishToRelays: vi.fn(),
    subscribeToRelays: vi.fn(),
  }),
}));

vi.mock("../../app/composables/use-nostr-data", () => ({
  useNostrData: () => ({
    saveUserToNostr: vi.fn(),
    fetchUsersFromNostr: vi.fn(),
    saveStaff: vi.fn(), // Added
    getAllStaff: vi.fn().mockReturnValue([]), // Added
  }),
}));

describe("useUsers", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should soft delete a user", async () => {
    const { users, createUser, deleteUser, currentUser } = useUsers();

    // 1. Create an admin user who will perform the action
    await createUser({
      name: "Admin User",
      role: "owner", // Needs permission
      authMethod: "pin",
      pin: "000000",
      permissions: { canManageUsers: true } as any,
    });
    const admin = users.value[0];
    currentUser.value = admin;

    // 2. Create the target user to delete
    await createUser({
      name: "Target User",
      role: "staff",
      authMethod: "pin",
      pin: "123456",
    });
    const targetUser = users.value.find((u) => u.name === "Target User");

    expect(targetUser).toBeDefined();
    expect(targetUser?.isActive).toBe(true);

    if (!targetUser) throw new Error("Target user not created");

    // 3. Delete target user
    const success = await deleteUser(targetUser.id);
    expect(success).toBe(true);

    // 4. Check soft delete state
    const deletedUser = users.value.find((u) => u.id === targetUser.id);
    expect(deletedUser).toBeDefined();
    expect(deletedUser?.isActive).toBe(false);
    expect(deletedUser?.deletedAt).toBeDefined();
  });

  it("should restore a deleted user", async () => {
    const { users, createUser, deleteUser, restoreDeletedUser, currentUser } =
      useUsers();

    // 1. Setup Admin
    await createUser({
      name: "Admin User",
      role: "owner",
      authMethod: "pin",
      pin: "000000",
      permissions: { canManageUsers: true } as any,
    });
    currentUser.value = users.value[0];

    // 2. Setup Target
    await createUser({
      name: "Restore Test",
      role: "staff",
      authMethod: "pin",
    });
    const targetUser = users.value.find((u) => u.name === "Restore Test");
    if (!targetUser) throw new Error("Target user not created");

    // 3. Delete
    await deleteUser(targetUser.id);

    // 4. Restore
    const success = await restoreDeletedUser(targetUser.id);
    expect(success).toBe(true);

    // 5. Verify
    const restoredUser = users.value.find((u) => u.id === targetUser.id);
    expect(restoredUser?.isActive).toBe(true);
    expect(restoredUser?.deletedAt).toBeUndefined();
  });
});
