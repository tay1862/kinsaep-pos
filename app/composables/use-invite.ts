// ============================================
// 📎 STAFF INVITE LINK COMPOSABLE
// Enables sharing invite links for staff to join
// ============================================

import type { StoreUser } from "~/types";

// Invite data structure
interface InviteData {
  user: Partial<StoreUser>;
  companyCode?: string;
  ownerPubkey?: string;
  expiresAt: string;
  createdAt: string;
  version: number;
}

// Secret key for encrypting invite links (should be consistent)
const INVITE_SECRET = "bitspace-invite-v1";

export function useInvite() {
  const company = useCompany();

  // ============================================
  // 🔐 ENCRYPTION
  // ============================================

  /**
   * Derive key from secret for invite encryption
   */
  async function deriveInviteKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(INVITE_SECRET),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );

    const salt = encoder.encode("bitspace-invite-salt-v1");

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 50000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypt invite data
   */
  async function encryptInviteData(data: InviteData): Promise<string> {
    const key = await deriveInviteKey();
    const encoder = new TextEncoder();
    const plaintext = JSON.stringify(data);

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(plaintext)
    );

    // Combine IV + ciphertext
    const combined = new Uint8Array(
      iv.length + new Uint8Array(ciphertext).length
    );
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Base64 URL-safe encoding
    return btoa(String.fromCharCode(...combined))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  /**
   * Decrypt invite data
   */
  async function decryptInviteData(
    encrypted: string
  ): Promise<InviteData | null> {
    try {
      const key = await deriveInviteKey();
      const decoder = new TextDecoder();

      // Restore base64 padding and decode
      let base64 = encrypted.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) base64 += "=";

      const combined = new Uint8Array(
        atob(base64)
          .split("")
          .map((c) => c.charCodeAt(0))
      );

      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
      );

      return JSON.parse(decoder.decode(plaintext)) as InviteData;
    } catch (error) {
      console.error("[Invite] Decryption failed:", error);
      return null;
    }
  }

  // ============================================
  // 📎 LINK GENERATION
  // ============================================

  /**
   * Generate an invite link for a user
   * @param user - The user to create invite for
   * @param expiryDays - Days until link expires (default: 7)
   */
  async function generateInviteLink(
    user: StoreUser,
    expiryDays: number = 7
  ): Promise<string> {
    // Create invite data (exclude sensitive fields)
    // Get owner pubkey from company or localStorage (for when company code is disabled)
    const ownerPubkeyValue =
      company.ownerPubkey.value ||
      localStorage.getItem("nostr_pubkey") ||
      undefined;

    const inviteData: InviteData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        authMethod: user.authMethod,
        pin: user.pin, // Hashed PIN
        passwordHash: user.passwordHash,
        isActive: user.isActive,
        avatar: user.avatar,
      },
      companyCode: company.companyCode.value || undefined,
      ownerPubkey: ownerPubkeyValue,
      expiresAt: new Date(
        Date.now() + expiryDays * 24 * 60 * 60 * 1000
      ).toISOString(),
      createdAt: new Date().toISOString(),
      version: 1,
    };

    // Encrypt the data
    const encrypted = await encryptInviteData(inviteData);

    // Build the URL
    const baseUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/join`
        : "/auth/join";

    return `${baseUrl}?d=${encrypted}`;
  }

  /**
   * Parse an invite link and extract data
   * @param url - The invite URL or just the data parameter
   */
  async function parseInviteLink(url: string): Promise<{
    success: boolean;
    data?: InviteData;
    error?: string;
  }> {
    try {
      // Extract the data parameter
      let encrypted: string;

      if (url.includes("?d=")) {
        const urlObj = new URL(url, "http://localhost");
        encrypted = urlObj.searchParams.get("d", "");
      } else {
        encrypted = url;
      }

      if (!encrypted) {
        return { success: false, error: "No invite data found" };
      }

      // Decrypt
      const data = await decryptInviteData(encrypted);

      if (!data) {
        return { success: false, error: "Invalid or corrupted invite" };
      }

      // Check expiry
      if (new Date(data.expiresAt) < new Date()) {
        return { success: false, error: "Invite link has expired" };
      }

      return { success: true, data };
    } catch (error) {
      console.error("[Invite] Parse error:", error);
      return { success: false, error: "Failed to process invite" };
    }
  }

  /**
   * Import user from invite data
   */
  async function importFromInvite(data: InviteData): Promise<boolean> {
    try {
      const STORAGE_KEY = "bitspace_users";

      // Load existing users
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const existingIds = new Set(existing.map((u: StoreUser) => u.id));

      // Check if user already exists
      if (existingIds.has(data.user.id)) {
        console.log("[Invite] User already exists, updating...");
        const index = existing.findIndex(
          (u: StoreUser) => u.id === data.user.id
        );
        if (index !== -1) {
          existing[index] = { ...existing[index], ...data.user };
        }
      } else {
        // Add new user
        const newUser: StoreUser = {
          ...data.user,
          createdAt: data.createdAt,
          updatedAt: new Date().toISOString(),
        } as StoreUser;

        existing.push(newUser);
      }

      // Save
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

      // Save company code if provided (optional)
      if (data.companyCode && data.ownerPubkey) {
        await company.setCompanyCode(data.companyCode, data.ownerPubkey);
      }

      // Always save owner pubkey for Nostr sync (even without company code)
      if (data.ownerPubkey) {
        localStorage.setItem("nostr_pubkey", data.ownerPubkey);
        localStorage.setItem("nostr_owner_pubkey", data.ownerPubkey);
      }

      console.log("[Invite] User imported successfully:", data.user.name);
      return true;
    } catch (error) {
      console.error("[Invite] Import failed:", error);
      return false;
    }
  }

  return {
    generateInviteLink,
    parseInviteLink,
    importFromInvite,
    encryptInviteData,
    decryptInviteData,
  };
}
