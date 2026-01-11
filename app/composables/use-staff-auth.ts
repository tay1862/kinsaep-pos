// ============================================
// 🔐 BITSPACE STAFF AUTHENTICATION COMPOSABLE
// Hybrid Auth: Nostr (npub/nsec) + Password + PIN
// ============================================

import { getPublicKey, finalizeEvent, verifyEvent } from "nostr-tools/pure";
import { nip19 } from "nostr-tools";
import { hexToBytes } from "@noble/hashes/utils";
import type {
  StoreUser,
  AuthMethod,
  AuthSession,
  AuthChallenge,
} from "~/types";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// Singleton state
const authSession = ref<AuthSession | null>(null);
const authChallenge = ref<AuthChallenge | null>(null);
const isAuthenticating = ref(false);

// Constants
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
const CHALLENGE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export function useStaffAuth() {
  const nostrKey = useNostrKey();

  // ============================================
  // 🔑 PASSWORD HASHING (Argon2-like with PBKDF2)
  // ============================================

  /**
   * Hash password with salt using PBKDF2
   */
  async function hashPassword(
    password: string,
    salt?: string
  ): Promise<{ hash: string; salt: string }> {
    const useSalt = salt || generateRandomString(32);
    const encoder = new TextEncoder();

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    // Derive key using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: encoder.encode(useSalt),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );

    const hashArray = Array.from(new Uint8Array(derivedBits));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return { hash, salt: useSalt };
  }

  /**
   * Verify password against stored hash
   */
  async function verifyPassword(
    password: string,
    storedHash: string,
    salt: string
  ): Promise<boolean> {
    const { hash } = await hashPassword(password, salt);
    return hash === storedHash;
  }

  /**
   * Hash PIN (simpler hash for quick access)
   */
  async function hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + "bitspace_pin_salt");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ============================================
  // 🔐 NOSTR AUTHENTICATION
  // ============================================

  /**
   * Generate auth challenge for Nostr login
   */
  function generateAuthChallenge(npub: string): AuthChallenge {
    const challenge: AuthChallenge = {
      id: generateRandomString(16),
      challenge: `bitspace_auth_${Date.now()}_${generateRandomString(32)}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CHALLENGE_DURATION).toISOString(),
      npub,
      isUsed: false,
    };

    authChallenge.value = challenge;
    return challenge;
  }

  /**
   * Verify Nostr signature for auth challenge
   */
  async function verifyNostrSignature(
    npub: string,
    signature: string,
    challengeId: string
  ): Promise<boolean> {
    // Get the challenge
    if (!authChallenge.value || authChallenge.value.id !== challengeId) {
      console.error("Invalid or missing challenge");
      return false;
    }

    // Check expiry
    if (new Date(authChallenge.value.expiresAt) < new Date()) {
      console.error("Challenge expired");
      return false;
    }

    // Check if already used
    if (authChallenge.value.isUsed) {
      console.error("Challenge already used");
      return false;
    }

    try {
      // Convert npub to hex pubkey
      const pubkeyHex = nostrKey.normalizeKey(npub);

      // Parse the signature (expecting a signed Nostr event)
      const signedEvent = JSON.parse(signature);

      // Verify the event
      const isValid = verifyEvent(signedEvent);

      if (isValid && signedEvent.pubkey === pubkeyHex) {
        // Check that the challenge matches
        const challengeTag = signedEvent.tags.find(
          (t: string[]) => t[0] === "challenge"
        );
        if (challengeTag && challengeTag[1] === authChallenge.value.challenge) {
          authChallenge.value.isUsed = true;
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Failed to verify Nostr signature:", error);
      return false;
    }
  }

  /**
   * Sign auth challenge with nsec (client-side)
   */
  async function signAuthChallenge(
    nsec: string,
    challenge: AuthChallenge
  ): Promise<string | null> {
    try {
      // Decode nsec to hex
      const privateKeyHex = nostrKey.decodePrivateKey(nsec);
      const pubkeyHex = getPublicKey(hexToBytes(privateKeyHex));

      // Create auth event
      const unsignedEvent = {
        kind: NOSTR_KINDS.STAFF_AUTH,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["challenge", challenge.challenge]],
        content: "Authenticate to bnos.space",
        pubkey: pubkeyHex,
      };

      // Sign the event
      const signedEvent = finalizeEvent(
        unsignedEvent,
        hexToBytes(privateKeyHex)
      );

      return JSON.stringify(signedEvent);
    } catch (error) {
      console.error("Failed to sign auth challenge:", error);
      return null;
    }
  }

  /**
   * Get public key from nsec
   */
  function getNpubFromNsec(
    nsec: string
  ): { npub: string; pubkeyHex: string } | null {
    try {
      const privateKeyHex = nostrKey.decodePrivateKey(nsec);
      const pubkeyHex = getPublicKey(hexToBytes(privateKeyHex));
      const npub = nostrKey.hexToNpub(pubkeyHex);
      return { npub, pubkeyHex };
    } catch (error) {
      console.error("Failed to get npub from nsec:", error);
      return null;
    }
  }

  // ============================================
  // 🔓 LOGIN METHODS
  // ============================================

  /**
   * Login with Nostr (nsec)
   */
  async function loginWithNostr(
    nsec: string,
    users: StoreUser[]
  ): Promise<{ success: boolean; user?: StoreUser; error?: string }> {
    isAuthenticating.value = true;

    try {
      // Get pubkey from nsec
      const keyInfo = getNpubFromNsec(nsec);
      if (!keyInfo) {
        return { success: false, error: "Invalid nsec key" };
      }

      // Find user by npub
      const user = users.find(
        (u) => u.npub === keyInfo.npub || u.pubkeyHex === keyInfo.pubkeyHex
      );

      if (!user) {
        return { success: false, error: "User not found with this Nostr key" };
      }

      // Check if user is active
      if (!user.isActive) {
        return { success: false, error: "Account is deactivated" };
      }

      // Check if access is revoked
      if (user.revokedAt) {
        return {
          success: false,
          error: `Access revoked: ${
            user.revocationReason || "Contact administrator"
          }`,
        };
      }

      // Check expiry
      if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
        return {
          success: false,
          error: "Access has expired. Contact administrator.",
        };
      }

      // Check lockout
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remaining = Math.ceil(
          (new Date(user.lockedUntil).getTime() - Date.now()) / 60000
        );
        return {
          success: false,
          error: `Account locked. Try again in ${remaining} minutes.`,
        };
      }

      // Create session
      authSession.value = createSession(user, "nostr");

      return { success: true, user };
    } catch (error) {
      console.error("Nostr login failed:", error);
      return { success: false, error: "Authentication failed" };
    } finally {
      isAuthenticating.value = false;
    }
  }

  /**
   * Login with password
   */
  async function loginWithPassword(
    identifier: string, // email or username
    password: string,
    users: StoreUser[]
  ): Promise<{ success: boolean; user?: StoreUser; error?: string }> {
    isAuthenticating.value = true;

    try {
      // Find user by email or name
      const user = users.find(
        (u) =>
          u.email?.toLowerCase().trim() === identifier.toLowerCase().trim() ||
          u.name.toLowerCase().trim() === identifier.toLowerCase().trim()
      );

      if (!user) {
        return { success: false, error: "Invalid credentials" };
      }

      // Check if user uses password auth
      if (user.authMethod !== "password" || !user.passwordHash) {
        return {
          success: false,
          error: "This account does not use password authentication",
        };
      }

      // Check lockout
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remaining = Math.ceil(
          (new Date(user.lockedUntil).getTime() - Date.now()) / 60000
        );
        return {
          success: false,
          error: `Account locked. Try again in ${remaining} minutes.`,
        };
      }

      // Extract salt and hash (format: salt:hash)
      const [salt, storedHash] = user.passwordHash.split(":");
      if (!salt || !storedHash) {
        return { success: false, error: "Invalid password format" };
      }

      // Verify password
      const isValid = await verifyPassword(password, storedHash, salt);

      if (!isValid) {
        // Increment failed attempts
        const attempts = (user.failedLoginAttempts || 0) + 1;
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
          return {
            success: false,
            error: "Too many failed attempts. Account locked.",
            user: {
              ...user,
              failedLoginAttempts: attempts,
              lockedUntil: new Date(
                Date.now() + LOCKOUT_DURATION
              ).toISOString(),
            } as StoreUser,
          };
        }
        return {
          success: false,
          error: `Invalid credentials. ${
            MAX_LOGIN_ATTEMPTS - attempts
          } attempts remaining.`,
          user: { ...user, failedLoginAttempts: attempts } as StoreUser,
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return { success: false, error: "Account is deactivated" };
      }

      // Check revocation
      if (user.revokedAt) {
        return {
          success: false,
          error: `Access revoked: ${
            user.revocationReason || "Contact administrator"
          }`,
        };
      }

      // Check expiry
      if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
        return {
          success: false,
          error: "Access has expired. Contact administrator.",
        };
      }

      // Create session
      authSession.value = createSession(user, "password");

      return { success: true, user };
    } catch (error) {
      console.error("Password login failed:", error);
      return { success: false, error: "Authentication failed" };
    } finally {
      isAuthenticating.value = false;
    }
  }

  /**
   * Login with PIN (quick access)
   */
  async function loginWithPin(
    pin: string,
    users: StoreUser[]
  ): Promise<{ success: boolean; user?: StoreUser; error?: string }> {
    isAuthenticating.value = true;

    try {
      const hashedPin = await hashPin(pin);

      // Find user by PIN
      const user = users.find((u) => u.pin === hashedPin);

      if (!user) {
        return { success: false, error: "Invalid PIN" };
      }

      // Check if user is active
      if (!user.isActive) {
        return { success: false, error: "Account is deactivated" };
      }

      // Check revocation
      if (user.revokedAt) {
        return {
          success: false,
          error: `Access revoked: ${
            user.revocationReason || "Contact administrator"
          }`,
        };
      }

      // Check lockout
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remaining = Math.ceil(
          (new Date(user.lockedUntil).getTime() - Date.now()) / 60000
        );
        return {
          success: false,
          error: `Account locked. Try again in ${remaining} minutes.`,
        };
      }

      // Create session
      authSession.value = createSession(user, "pin");

      return { success: true, user };
    } catch (error) {
      console.error("PIN login failed:", error);
      return { success: false, error: "Authentication failed" };
    } finally {
      isAuthenticating.value = false;
    }
  }

  // ============================================
  // 🔒 SESSION MANAGEMENT
  // ============================================

  /**
   * Create auth session
   */
  function createSession(user: StoreUser, method: AuthMethod): AuthSession {
    return {
      userId: user.id,
      npub: user.npub,
      authMethod: method,
      loginAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_DURATION).toISOString(),
      isValid: true,
    };
  }

  /**
   * Check if session is valid
   */
  function isSessionValid(): boolean {
    if (!authSession.value) return false;
    if (!authSession.value.isValid) return false;
    if (new Date(authSession.value.expiresAt) < new Date()) {
      authSession.value.isValid = false;
      return false;
    }
    return true;
  }

  /**
   * End session (logout)
   */
  function endSession(): void {
    authSession.value = null;
    authChallenge.value = null;
  }

  /**
   * Extend session
   */
  function extendSession(): void {
    if (authSession.value && authSession.value.isValid) {
      authSession.value.expiresAt = new Date(
        Date.now() + SESSION_DURATION
      ).toISOString();
    }
  }

  // ============================================
  // 🛠️ USER CREDENTIAL MANAGEMENT
  // ============================================

  /**
   * Set password for a user
   */
  async function setUserPassword(password: string): Promise<string> {
    const { hash, salt } = await hashPassword(password);
    return `${salt}:${hash}`; // Store as salt:hash
  }

  /**
   * Set PIN for a user
   */
  async function setUserPin(pin: string): Promise<string> {
    return await hashPin(pin);
  }

  /**
   * Validate password strength
   */
  function validatePasswordStrength(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate PIN format
   */
  function validatePin(pin: string): { valid: boolean; error?: string } {
    if (!/^\d{4,6}$/.test(pin)) {
      return { valid: false, error: "PIN must be 4-6 digits" };
    }
    // Check for simple patterns
    if (/^(\d)\1+$/.test(pin)) {
      return { valid: false, error: "PIN cannot be all same digits" };
    }
    if (
      /^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)/.test(
        pin
      )
    ) {
      return { valid: false, error: "PIN cannot be a sequential pattern" };
    }
    return { valid: true };
  }

  // ============================================
  // 🔧 UTILITIES
  // ============================================

  /**
   * Generate random string
   */
  function generateRandomString(length: number): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => chars[byte % chars.length]).join("");
  }

  /**
   * Validate npub format
   */
  function validateNpub(npub: string): boolean {
    try {
      const decoded = nip19.decode(npub);
      return decoded.type === "npub";
    } catch {
      return false;
    }
  }

  /**
   * Validate nsec format
   */
  function validateNsec(nsec: string): boolean {
    try {
      const decoded = nip19.decode(nsec);
      return decoded.type === "nsec";
    } catch {
      return false;
    }
  }

  return {
    // State
    authSession: computed(() => authSession.value),
    authChallenge: computed(() => authChallenge.value),
    isAuthenticating: computed(() => isAuthenticating.value),
    isAuthenticated: computed(() => isSessionValid()),

    // Nostr auth
    generateAuthChallenge,
    verifyNostrSignature,
    signAuthChallenge,
    getNpubFromNsec,
    validateNpub,
    validateNsec,

    // Login methods
    loginWithNostr,
    loginWithPassword,
    loginWithPin,

    // Session management
    isSessionValid,
    endSession,
    extendSession,

    // Credential management
    setUserPassword,
    setUserPin,
    hashPin,
    validatePasswordStrength,
    validatePin,

    // Utilities
    generateRandomString,
  };
}
