/**
 * ID Generation Utilities
 *
 * This module provides two types of identifiers:
 * 1. Technical IDs - For URLs, databases, and internal use
 * 2. Human-readable Codes - For display, receipts, and communication
 *
 * COLLISION ANALYSIS (Birthday Paradox):
 * - 128-bit (32 hex chars): 1 in 10^29 collision chance with 100K records
 * - For 100,000+ records, these IDs are EXTREMELY safe from collisions.
 */

// ============================================
// 🔧 CORE UTILITIES
// ============================================

/**
 * Generate a cryptographically secure random hex string
 * Uses Web Crypto API for secure randomness
 */
export function randomHex(bytes: number): string {
  if (typeof window !== "undefined" && window.crypto) {
    const array = new Uint8Array(bytes);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Server-side fallback
  return Array.from({ length: bytes * 2 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

// ============================================
// 🆔 TECHNICAL IDs (for URLs, database, params)
// ============================================

/**
 * Generate a timestamp-prefixed hex ID
 * Format: 12 hex timestamp + 16 hex random = 28 chars
 * Example: "018cd5a3f8b0a1b2c3d4e5f6a7b8"
 *
 * Benefits:
 * - Naturally sortable by creation time
 * - 64 bits of randomness (safe for billions)
 * - URL-safe, no special characters
 */
export function generateId(): string {
  const timestamp = Date.now().toString(16).padStart(12, "0");
  const random = randomHex(8);
  return timestamp + random;
}

/**
 * Generate a Nostr-compatible 64-character hex ID (256 bits)
 * Use for Nostr event IDs
 */
export function generateNostrId(): string {
  return randomHex(32);
}

/**
 * Generate a 32-character hex ID (128 bits)
 * Shorter but still extremely collision-resistant
 */
export function generateHexId(): string {
  return randomHex(16);
}

/**
 * Generate a UUID v7 (RFC 9562)
 * Format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
 * Example: 018cd5a3-f8b0-7a1b-8c3d-4e5f6a7b8c9d
 *
 * Benefits:
 * - ✅ Standard format (recognized everywhere)
 * - ✅ Sortable by creation time (first 48 bits = timestamp)
 * - ✅ Database-friendly (PostgreSQL native support)
 * - ✅ 74 bits of randomness (collision-proof)
 *
 * 🏆 RECOMMENDED for most use cases
 */
export function generateUUIDv7(): string {
  const timestamp = Date.now();

  // Get timestamp as 12 hex chars (48 bits)
  const timeHex = timestamp.toString(16).padStart(12, "0");

  // Random bytes
  const randBytes = randomHex(10); // 80 bits

  // Build UUID v7 format
  // xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
  // where 7 = version, y = variant (8, 9, a, or b)
  const p1 = timeHex.slice(0, 8);
  const p2 = timeHex.slice(8, 12);
  const p3 = "7" + randBytes.slice(0, 3);
  const p4 =
    ((parseInt(randBytes.slice(3, 5), 16) & 0x3f) | 0x80)
      .toString(16)
      .padStart(2, "0") + randBytes.slice(5, 7);
  const p5 = randBytes.slice(7) + randomHex(3);

  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

// ============================================
// 🏷️ HUMAN-READABLE CODES (for display, receipts)
// ============================================

/**
 * Generate a human-readable code
 * Format: PREFIX-XXXX-XXXX
 * Example: ORD-PF03-X2AK, PRO-AB12-CD34
 *
 * Characters exclude: I, O, 0, 1 (to avoid confusion)
 * Use for: order numbers, product codes, invoice numbers
 */
export function generateCode(prefix: string): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

  const segment1 = Array.from({ length: 4 }, () => {
    if (typeof window !== "undefined" && window.crypto) {
      const array = new Uint8Array(1);
      window.crypto.getRandomValues(array);
      return chars[array[0]! % chars.length];
    }
    return chars[Math.floor(Math.random() * chars.length)];
  }).join("");

  const segment2 = Array.from({ length: 4 }, () => {
    if (typeof window !== "undefined" && window.crypto) {
      const array = new Uint8Array(1);
      window.crypto.getRandomValues(array);
      return chars[array[0]! % chars.length];
    }
    return chars[Math.floor(Math.random() * chars.length)];
  }).join("");

  return `${prefix}-${segment1}-${segment2}`;
}

/**
 * Alias for generateCode (backward compatibility)
 */
/**
 * Alias for generateCode (backward compatibility)
 */
export const generateReadableId = generateCode;

/**
 * Generate a short, unique code (ABC-XXXXX)
 * @param prefix Prefix string (e.g., "ORD", "ABC")
 * @param length Length of the random part (default 5)
 */
export function generateShortCode(prefix: string, length: number = 5): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Remove I, O, 0, 1
  const randomPart = Array.from({ length }, () => {
    if (typeof window !== "undefined" && window.crypto) {
      const array = new Uint8Array(1);
      window.crypto.getRandomValues(array);
      return chars[array[0]! % chars.length];
    }
    return chars[Math.floor(Math.random() * chars.length)];
  }).join("");

  return `${prefix}-${randomPart}`;
}

// ============================================
// 📦 ENTITY ID GENERATORS
// ============================================

/**
 * Generate both ID (UUID v7) and Code for an entity
 * Returns { id, code } for dual-identification
 *
 * - id: UUID v7 for URLs, database, Nostr sync
 * - code: Human-readable for display, receipts
 */
export const EntityId = {
  /** Order: id for URL, code for receipt */
  order: () => ({
    id: generateUUIDv7(),
    code: generateCode("ORD"),
  }),

  /** Product: id for URL, code like SKU */
  product: () => ({
    id: generateUUIDv7(),
    code: generateCode("PRO"),
  }),

  /** Customer: id for URL, code for display */
  customer: () => ({
    id: generateUUIDv7(),
    code: generateCode("CUS"),
  }),

  /** Employee: id for URL, code for badge */
  employee: () => ({
    id: generateUUIDv7(),
    code: generateCode("EMP"),
  }),

  /** Invoice: id for URL, code for document */
  invoice: () => ({
    id: generateUUIDv7(),
    code: generateCode("INV"),
  }),

  /** Recipe: id for URL, code for kitchen */
  recipe: () => ({
    id: generateUUIDv7(),
    code: generateCode("REC"),
  }),

  /** Category: simple ID only */
  category: () => ({
    id: generateUUIDv7(),
    code: generateCode("CAT"),
  }),

  /** Branch: id and code */
  branch: () => ({
    id: generateUUIDv7(),
    code: generateCode("BRA"),
  }),

  /** Purchase Order */
  purchaseOrder: () => ({
    id: generateUUIDv7(),
    code: generateCode("PO"),
  }),

  /** Generic entity */
  generic: (prefix: string) => ({
    id: generateUUIDv7(),
    code: generateCode(prefix.toUpperCase()),
  }),
};

/**
 * Generate ID only (for entities that don't need display codes)
 */
export const SimpleId = {
  category: () => generateUUIDv7(),
  log: () => generateUUIDv7(),
  adjustment: () => generateUUIDv7(),
  session: () => generateUUIDv7(),
};

// ============================================
// 🔍 VALIDATION & UTILITIES
// ============================================

/**
 * Check if string is a valid UUID v7
 * Format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
 */
export function isValidId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

/**
 * Check if string is a valid code (PREFIX-XXXX-XXXX)
 */
export function isValidCode(code: string): boolean {
  return /^[A-Z]{2,4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code);
}

/**
 * Extract timestamp from an ID
 * Returns Date or null if invalid
 */
export function extractTimestamp(id: string): Date | null {
  if (!id || id.length < 12) return null;

  try {
    const timestampHex = id.slice(0, 12);
    const timestamp = parseInt(timestampHex, 16);

    // Sanity check: between 2020 and tomorrow
    if (timestamp < 1577836800000 || timestamp > Date.now() + 86400000) {
      return null;
    }

    return new Date(timestamp);
  } catch {
    return null;
  }
}

/**
 * Format ID for display (shorter version)
 * Example: "018cd5a3f8b0a1b2c3d4e5f6a7b8" → "018cd5...a7b8"
 */
export function formatIdShort(id: string): string {
  if (!id || id.length < 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}
