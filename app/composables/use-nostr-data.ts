// ============================================
// 📡 NOSTR DATA LAYER - ENCRYPTED STORAGE
// Syncs POS data to Nostr relays with NIP-04/44 encryption
// Uses centralized useEncryption module for all crypto operations
// ============================================
import { nip19 } from "nostr-tools";
import { finalizeEvent, type UnsignedEvent, type Event } from "nostr-tools";
import type {
  Product,
  Category,
  Unit,
  Order,
  LoyaltyMember,
  Branch,
  StoreSettings,
  StoreUser,
} from "~/types";

// Import centralized NOSTR_KINDS
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// ============================================
// 🔧 UTILITY FUNCTIONS
// ============================================

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// ============================================
// 🔑 ENCRYPTION HELPERS
// ============================================

// Encryption payload structure for versioned encryption
interface _EncryptedPayload {
  v: number; // Version (1 = NIP-04, 2 = NIP-44, 3 = AES-256-GCM)
  ct: string; // Ciphertext
  iv?: string; // IV for NIP-04
}

export function useNostrData() {
  const relay = useNostrRelay();
  const encryption = useEncryption();
  // useSecurity() - for future encrypted local storage
  // useNuxtApp().$nostr - for direct nostr access

  // State
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const syncStatus = ref<"idle" | "syncing" | "synced" | "error">("idle");
  const lastSyncAt = ref<string | null>(null);

  // Get current user's keys (pubkey required, privkey optional for NIP-07 users)
  const getUserKeys = (): { pubkey: string; privkey: string | null } | null => {
    if (!import.meta.client) return null;

    // Helper to normalize private key to hex format
    const normalizePrivkey = (
      key: string | null | undefined
    ): string | null => {
      if (!key) return null;

      // If already hex (64 chars), return as-is
      if (/^[0-9a-f]{64}$/i.test(key)) {
        return key.toLowerCase();
      }

      // If nsec format, decode to hex
      if (key.startsWith("nsec1")) {
        try {
          const { data } = nip19.decode(key);
          return data as string;
        } catch (e) {
          console.error("[NostrData] Failed to decode nsec:", e);
          return null;
        }
      }

      return null;
    };

    // 1. Try nostrUser localStorage (users who logged in with nsec)
    const stored = localStorage.getItem("nostrUser");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        const pubkey = user.pubkey || user.publicKey || user.npub;
        const privkeyRaw = user.privateKey || user.privkey || user.nsec;
        const privkey = normalizePrivkey(privkeyRaw);
        if (pubkey) {
          return { pubkey, privkey };
        }
      } catch (e) {
        console.error("[NostrData] Failed to parse nostrUser:", e);
        // Continue to fallback
      }
    }

    // 2. Try nostr-pubkey cookie (for NIP-07 extension users)
    const nostrCookie = useCookie("nostr-pubkey");
    if (nostrCookie.value) {
      return { pubkey: nostrCookie.value, privkey: null };
    }

    // 3. Try auth state (bitspace_current_user)
    const authState = localStorage.getItem("bitspace_current_user");
    if (authState) {
      try {
        const state = JSON.parse(authState);
        const pubkey = state.user?.nostrPubkey;
        if (pubkey) {
          return { pubkey, privkey: null };
        }
      } catch {
        // Continue
      }
    }

    // 4. Try nostr_user_profile
    const profile = localStorage.getItem("nostr_user_profile");
    if (profile) {
      try {
        const parsed = JSON.parse(profile);
        if (parsed.pubkey) {
          return { pubkey: parsed.pubkey, privkey: null };
        }
      } catch {
        // Fall through
      }
    }

    return null;
  };

  // ============================================
  // 🔐 ENCRYPTION/DECRYPTION (Using centralized module)
  // ============================================

  /**
   * Encrypt data for Nostr storage (self-encryption using own keys)
   * Uses the centralized encryption module with NIP-44 preferred
   * For NIP-07 users (no privkey), falls back to NIP-07 extension or local AES
   * NEW: Also supports company code encryption (v4) for cross-device sync
   */
  async function encryptData(data: unknown): Promise<string> {
    const keys = getUserKeys();
    const company = useCompany();

    // PRIORITY 1: Use company code encryption if available (v4)
    // This allows any device with the company code to decrypt
    // BUT only if the feature is explicitly enabled
    if (company.isCompanyCodeEnabled.value && company.companyCode.value) {
      try {
        const encrypted = await company.encryptWithCode(
          data,
          company.companyCode.value
        );
        return JSON.stringify({ v: 4, cc: encrypted }); // v4 = company code encryption
      } catch (e) {
        console.warn("[NostrData] Company code encrypt failed:", e);
        // Fall through to other methods
      }
    }

    // No keys at all - use local AES encryption
    if (!keys) {
      const result = await encryption.encrypt(data, {
        algorithm: "aes-256-gcm",
      });
      if (result.success && result.data) {
        return JSON.stringify({ v: 3, ...result.data }); // v3 = local AES
      }
      return JSON.stringify(data);
    }

    // If we have privkey, use direct Nostr encryption
    if (keys.privkey) {
      // Try NIP-44 first (more secure)
      try {
        const result = await encryption.encrypt(data, {
          algorithm: "nip-44",
          nostrPrivkey: keys.privkey,
          nostrPubkey: keys.pubkey,
        });

        if (result.success && result.data) {
          return JSON.stringify({ v: 2, ct: result.data.ciphertext });
        }
      } catch {
        // Fall through to NIP-04
      }

      // Fallback to NIP-04
      try {
        const result = await encryption.encrypt(data, {
          algorithm: "nip-04",
          nostrPrivkey: keys.privkey,
          nostrPubkey: keys.pubkey,
        });

        if (result.success && result.data) {
          return JSON.stringify({ v: 1, ct: result.data.ciphertext });
        }
      } catch {
        // Last resort: plain JSON
      }
    }

    // NIP-07 users (have pubkey but no privkey) - try NIP-07 extension's encrypt
    if (keys.pubkey && !keys.privkey && import.meta.client) {
      const win = window as unknown as {
        nostr?: {
          nip04?: {
            encrypt: (pubkey: string, plaintext: string) => Promise<string>;
          };
        };
      };
      if (win.nostr?.nip04?.encrypt) {
        try {
          const plaintext = JSON.stringify(data);
          const ciphertext = await win.nostr.nip04.encrypt(
            keys.pubkey,
            plaintext
          );
          return JSON.stringify({ v: 1, ct: ciphertext }); // v1 = NIP-04 from extension
        } catch (e) {
          console.warn("[NostrData] NIP-07 encrypt failed:", e);
          // Fall through to unencrypted
        }
      }
    }

    // Fallback: store unencrypted (will be readable by everyone who knows the d-tag)
    return JSON.stringify(data);
  }

  /**
   * Decrypt data from Nostr storage
   * Supports all encryption versions:
   * - v1=NIP-04, v2=NIP-44, v3=AES-256-GCM, v4=Company Code
   * For NIP-07 users, uses the extension's decrypt method
   */
  async function decryptData<T>(encrypted: string): Promise<T | null> {
    const keys = getUserKeys();
    const company = useCompany();

    try {
      const payload = JSON.parse(encrypted);

      // Version 4: Company Code Encryption (cross-device sync)
      if (payload.v === 4 && payload.cc && company.companyCode.value) {
        try {
          const decrypted = await company.decryptWithCode<T>(
            payload.cc,
            company.companyCode.value
          );
          return decrypted;
        } catch {
          // Expected when switching shops or data from different company
          // Fall through to other methods
        }
      }

      // Version 3: Local AES-256-GCM (no Nostr keys needed)
      if (payload.v === 3 && payload.algorithm === "aes-256-gcm") {
        const result = await encryption.decrypt<T>(payload);
        return result.success ? result.data || null : null;
      }

      // Nostr encryption requires at least pubkey
      if (!keys) return null;

      // If we have privkey, use direct decryption
      if (keys.privkey) {
        // Version 2: NIP-44
        if (payload.v === 2) {
          const result = await encryption.decrypt<T>(
            {
              ciphertext: payload.ct,
              algorithm: "nip-44",
              version: 2,
              encryptedAt: "",
            },
            { nostrPrivkey: keys.privkey, nostrPubkey: keys.pubkey }
          );
          return result.success ? result.data || null : null;
        }

        // Version 1: NIP-04
        if (payload.v === 1 || payload.ct) {
          const result = await encryption.decrypt<T>(
            {
              ciphertext: payload.ct,
              algorithm: "nip-04",
              version: 1,
              encryptedAt: "",
            },
            { nostrPrivkey: keys.privkey, nostrPubkey: keys.pubkey }
          );
          return result.success ? result.data || null : null;
        }
      }

      // NIP-07 users (have pubkey but no privkey) - try extension's decrypt
      if (keys.pubkey && !keys.privkey && import.meta.client) {
        const win = window as unknown as {
          nostr?: {
            nip04?: {
              decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
            };
          };
        };
        if (win.nostr?.nip04?.decrypt && (payload.v === 1 || payload.ct)) {
          try {
            const plaintext = await win.nostr.nip04.decrypt(
              keys.pubkey,
              payload.ct
            );
            return JSON.parse(plaintext) as T;
          } catch (e) {
            console.warn("[NostrData] NIP-07 decrypt failed:", e);
            // Fall through
          }
        }
      }

      // Not encrypted, return as-is
      return payload as T;
    } catch {
      // Try parsing as plain JSON
      try {
        return JSON.parse(encrypted);
      } catch {
        return null;
      }
    }
  }

  // ============================================
  // 📤 PUBLISH EVENTS
  // ============================================

  /**
   * Create and sign a Nostr event
   * Supports both direct signing (with privkey) and NIP-07 extension signing
   */
  async function createEvent(
    kind: number,
    content: string,
    tags: string[][] = []
  ): Promise<Event | null> {
    const keys = getUserKeys();
    if (!keys) {
      error.value = "No Nostr keys available";
      return null;
    }

    const unsignedEvent: UnsignedEvent = {
      kind,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
      pubkey: keys.pubkey,
    };

    // If we have privkey, sign directly
    if (keys.privkey) {
      try {
        const privkeyBytes = hexToBytes(keys.privkey);
        const signedEvent = finalizeEvent(unsignedEvent, privkeyBytes);
        return signedEvent;
      } catch (e) {
        error.value = `Failed to sign event: ${e}`;
        console.error("[NostrData] Signing failed:", e);
        return null;
      }
    }

    // NIP-07: Use extension to sign
    if (import.meta.client) {
      const win = window as unknown as {
        nostr?: { signEvent: (event: UnsignedEvent) => Promise<Event> };
      };
      if (win.nostr?.signEvent) {
        try {
          const signedEvent = await win.nostr.signEvent(unsignedEvent);
          return signedEvent as Event;
        } catch (e) {
          error.value = `NIP-07 signing failed: ${e}`;
          console.error("[NostrData] NIP-07 signing failed:", e);
          return null;
        }
      } else {
        console.warn("[NostrData] ⚠️ No NIP-07 extension available");
      }
    }

    error.value =
      "No signing method available (no privkey and no NIP-07 extension)";
    console.error("[NostrData] ❌ No signing method available");
    return null;
  }

  /**
   * Publish a replaceable event (kind 30000+)
   */
  async function publishReplaceableEvent(
    kind: number,
    data: unknown,
    dTag: string,
    extraTags: string[][] = [],
    shouldEncrypt: boolean = true
  ): Promise<Event | null> {
    const content = shouldEncrypt
      ? await encryptData(data)
      : JSON.stringify(data);

    const tags = [
      ["d", dTag],
      ["encrypted", shouldEncrypt ? "true" : "false"],
      ...extraTags,
    ];

    const event = await createEvent(kind, content, tags);
    if (!event) return null;

    const success = await relay.publishEvent(event);
    if (!success) {
      error.value = "Failed to publish event";
      return null;
    }

    return event;
  }

  /**
   * Publish a regular event (append-only)
   */
  async function publishEvent(
    kind: number,
    data: unknown,
    tags: string[][] = [],
    shouldEncrypt: boolean = true
  ): Promise<Event | null> {
    const content = shouldEncrypt
      ? await encryptData(data)
      : JSON.stringify(data);

    const encryptedTag = [["encrypted", shouldEncrypt ? "true" : "false"]];

    const event = await createEvent(kind, content, [...tags, ...encryptedTag]);
    if (!event) return null;

    const success = await relay.publishEvent(event);
    if (!success) {
      error.value = "Failed to publish event";
      return null;
    }

    return event;
  }

  // ============================================
  // 📥 QUERY EVENTS
  // ============================================

  /**
   * Query events by kind and optional filters
   */
  async function queryEvents(
    kinds: number[],
    options: {
      authors?: string[];
      dTags?: string[];
      since?: number;
      until?: number;
      limit?: number;
    } = {}
  ): Promise<Event[]> {
    const keys = getUserKeys();
    const company = useCompany();

    // IMPORTANT: Always filter by current user's pubkey to avoid getting other users' data
    // If no keys available, return empty array instead of querying all authors
    if (!keys && !options.authors) {
      console.warn(
        "No user keys available and no authors specified - skipping query to avoid fetching other users data"
      );
      return [];
    }

    // Build authors list
    let authors = options.authors;
    if (!authors) {
      authors = [keys!.pubkey];

      // CRITICAL: Include team members in query when company code is enabled
      // IMPORTANT: We can't call useUsers() here as it creates infinite recursion
      // Instead, we only add owner pubkey for staff, and rely on company code hash tag
      if (company.hasCompanyCode.value && company.isCompanyCodeEnabled.value) {
        const ownerPubkey = company.ownerPubkey.value;

        // For STAFF: Add owner pubkey
        if (ownerPubkey && ownerPubkey !== keys!.pubkey) {
          if (!authors.includes(ownerPubkey)) {
            authors.push(ownerPubkey);
          }
        }
        // For OWNER: We can't fetch staff list here (circular dependency)
        // Instead, queries should use company code hash tag (#c) to filter
        // Or pass staff pubkeys explicitly when calling queryEvents
      }
    }

    const filter: Record<string, unknown> = {
      kinds,
      authors,
    };

    if (options.dTags) {
      filter["#d"] = options.dTags;
    }
    if (options.since) {
      filter.since = options.since;
    }
    if (options.until) {
      filter.until = options.until;
    }
    if (options.limit) {
      filter.limit = options.limit;
    }

    try {
      return await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0]
      );
    } catch (e) {
      error.value = `Query failed: ${e}`;
      return [];
    }
  }

  /**
   * Get single replaceable event by d-tag
   */
  async function getReplaceableEvent<T>(
    kind: number,
    dTag: string
  ): Promise<{ event: Event; data: T } | null> {
    const events = await queryEvents([kind], { dTags: [dTag], limit: 1 });

    if (events.length === 0) return null;

    const event = events[0]!;
    const isEncrypted =
      event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";

    const data = isEncrypted
      ? await decryptData<T>(event.content)
      : JSON.parse(event.content);

    if (!data) return null;

    return { event, data };
  }

  /**
   * Get all events of a kind
   */
  async function getAllEventsOfKind<T>(
    kind: number,
    options: { since?: number; limit?: number; authors?: string[] } = {}
  ): Promise<Array<{ event: Event; data: T }>> {
    const events = await queryEvents([kind], options);
    const results: Array<{ event: Event; data: T }> = [];

    for (const event of events) {
      try {
        const isEncrypted =
          event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";
        const data = isEncrypted
          ? await decryptData<T>(event.content)
          : JSON.parse(event.content);

        // Skip if no data or no id (required for DB storage)
        if (data && (data as { id?: string }).id) {
          results.push({ event, data });
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return results;
  }

  // ============================================
  // 🛍️ PRODUCT OPERATIONS
  // ============================================

  async function saveProduct(product: Product): Promise<Event | null> {
    // Products are saved UNENCRYPTED so customers can read them from public QR menu
    return publishReplaceableEvent(
      NOSTR_KINDS.PRODUCT,
      product,
      product.id,
      [
        ["name", product.name],
        ["sku", product.sku],
        ["category", product.categoryId],
        ["status", product.status],
        ["public", product.isPublic !== false ? "true" : "false"],
      ],
      false // DO NOT ENCRYPT - products need to be publicly readable
    );
  }

  async function getProduct(id: string): Promise<Product | null> {
    const result = await getReplaceableEvent<Product>(NOSTR_KINDS.PRODUCT, id);
    return result?.data || null;
  }

  async function getAllProducts(): Promise<Product[]> {
    const results = await getAllEventsOfKind<Product>(NOSTR_KINDS.PRODUCT);
    return results.map((r) => r.data);
  }

  /**
   * Get products for a specific owner (for public menu access)
   * This is used when a customer scans a QR code and needs to load the store's products
   */
  async function getProductsForOwner(ownerPubkey: string): Promise<Product[]> {
    const results = await getAllEventsOfKind<Product>(NOSTR_KINDS.PRODUCT, {
      authors: [ownerPubkey],
    });
    return results
      .map((r) => r.data)
      .filter((p) => p.status === "active" && p.isPublic !== false);
  }

  /**
   * Get categories for a specific owner (for public menu access)
   */
  async function getCategoriesForOwner(
    ownerPubkey: string
  ): Promise<Category[]> {
    const results = await getAllEventsOfKind<Category>(NOSTR_KINDS.CATEGORY, {
      authors: [ownerPubkey],
    });
    return results
      .map((r) => r.data)
      .filter((c) => !(c as Category & { deleted?: boolean }).deleted);
  }

  async function deleteProduct(id: string): Promise<boolean> {
    // Publish with empty content to mark as deleted
    const event = await publishReplaceableEvent(
      NOSTR_KINDS.PRODUCT,
      { deleted: true, deletedAt: new Date().toISOString() },
      id,
      [["deleted", "true"]]
    );
    return event !== null;
  }

  // ============================================
  // 📁 CATEGORY OPERATIONS
  // ============================================

  async function saveCategory(category: Category): Promise<Event | null> {
    // Categories are saved UNENCRYPTED so customers can read them from public QR menu
    return publishReplaceableEvent(
      NOSTR_KINDS.CATEGORY,
      category,
      category.id,
      [["name", category.name]],
      false // DO NOT ENCRYPT - categories need to be publicly readable
    );
  }

  async function getAllCategories(): Promise<Category[]> {
    const results = await getAllEventsOfKind<Category>(NOSTR_KINDS.CATEGORY);
    return results
      .map((r) => r.data)
      .filter((c) => !(c as Category & { deleted?: boolean }).deleted);
  }

  // ============================================
  // 📐 UNIT OPERATIONS
  // ============================================

  async function saveUnit(unit: Unit): Promise<Event | null> {
    return publishReplaceableEvent(NOSTR_KINDS.UNIT, unit, unit.id, [
      ["name", unit.name],
      ["symbol", unit.symbol],
    ]);
  }

  async function getAllUnits(): Promise<Unit[]> {
    const results = await getAllEventsOfKind<Unit>(NOSTR_KINDS.UNIT);
    return results
      .map((r) => r.data)
      .filter((u) => !(u as Unit & { deleted?: boolean }).deleted);
  }

  // ============================================
  // 🧾 ORDER OPERATIONS
  // ============================================

  async function saveOrder(order: Order): Promise<Event | null> {
    const company = useCompany();

    // IMPORTANT: Do NOT encrypt orders when company code is enabled
    // This allows owner and staff to see each other's orders
    // Orders without company code are encrypted for privacy
    const shouldEncrypt = !company.isCompanyCodeEnabled.value;

    return publishEvent(
      NOSTR_KINDS.ORDER,
      order,
      [
        ["d", order.id],
        ["status", order.status],
        ["method", order.paymentMethod || "unknown"],
        ["t", order.date],
        ["amount", order.total.toString()],
        order.customerPubkey ? ["p", order.customerPubkey] : [],
        // Add company code hash tag for team sync
        company.companyCodeHash.value
          ? ["c", company.companyCodeHash.value]
          : [],
      ].filter((t) => t.length > 0) as string[][],
      shouldEncrypt
    );
  }

  /**
   * Publish kitchen alert for cross-device notifications
   * Uses POS_ALERT kind (1050) for real-time propagation
   */
  async function publishKitchenAlert(
    alertData: {
      type: string;
      orderId: string;
      orderNumber?: string;
      status: string;
      customer?: string;
      total?: number;
      items?: number;
      timestamp: string;
    },
    companyCodeHash?: string | null
  ): Promise<Event | null> {
    try {
      const tags: string[][] = [
        ["type", alertData.type],
        ["order_id", alertData.orderId],
        ["status", alertData.status],
      ];

      // Add company tag for team-wide broadcast
      if (companyCodeHash) {
        tags.push(["c", companyCodeHash]);
      }

      // Add optional fields
      if (alertData.orderNumber) {
        tags.push(["order_num", String(alertData.orderNumber)]);
      }

      const event = await createEvent(
        NOSTR_KINDS.POS_ALERT,
        JSON.stringify(alertData),
        tags
      );

      if (!event) return null;

      const success = await relay.publishEvent(event);
      return success ? event : null;
    } catch (err) {
      console.error("[NostrData] Failed to publish kitchen alert:", err);
      return null;
    }
  }

  async function getOrder(id: string): Promise<Order | null> {
    const events = await queryEvents([NOSTR_KINDS.ORDER], {
      dTags: [id],
      limit: 1,
    });
    if (events.length === 0) return null;

    const event = events[0]!;
    const isEncrypted =
      event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";

    return isEncrypted
      ? await decryptData<Order>(event.content)
      : JSON.parse(event.content);
  }

  async function getAllOrders(
    options: { since?: number; limit?: number } = {}
  ): Promise<Order[]> {
    const company = useCompany();

    // If company code is enabled, query by company code hash tag instead of authors
    // This allows owner and staff to see all team orders without circular dependencies
    if (
      company.hasCompanyCode.value &&
      company.isCompanyCodeEnabled.value &&
      company.companyCodeHash.value
    ) {
      try {
        const filter: Record<string, unknown> = {
          kinds: [NOSTR_KINDS.ORDER],
          "#c": [company.companyCodeHash.value], // Query by company code tag
        };

        if (options.since) {
          filter.since = options.since;
        }
        if (options.limit) {
          filter.limit = options.limit;
        }

        const events = await relay.queryEvents(
          filter as Parameters<typeof relay.queryEvents>[0]
        );

        const orders: Order[] = [];
        for (const event of events) {
          try {
            const isEncrypted =
              event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";
            const data = isEncrypted
              ? await decryptData<Order>(event.content)
              : JSON.parse(event.content);

            if (data && data.id) {
              orders.push(data);
            }
          } catch {
            // Skip invalid events
          }
        }

        // Sort by date descending
        return orders.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      } catch (e) {
        console.warn(
          "[NostrData] Company code query failed, falling back to normal query:",
          e
        );
        // Fall through to normal query
      }
    }

    // Normal query by authors (for non-team mode)
    const results = await getAllEventsOfKind<Order>(NOSTR_KINDS.ORDER, options);
    // Sort by date descending
    return results
      .map((r) => r.data)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async function getOrdersByStatus(status: string): Promise<Order[]> {
    const allOrders = await getAllOrders();
    return allOrders.filter((o) => o.status === status);
  }

  async function getOrdersByCustomer(customerPubkey: string): Promise<Order[]> {
    const allOrders = await getAllOrders();
    return allOrders.filter((o) => o.customerPubkey === customerPubkey);
  }

  /**
   * Save order as anonymous customer using ephemeral keypair
   * This allows customers who scanned QR code (no login) to publish orders
   * The order is tagged with owner's pubkey so admin can subscribe to it
   */
  async function saveOrderAsAnonymous(
    order: Order,
    ownerPubkey: string
  ): Promise<Event | null> {
    if (!import.meta.client) return null;

    try {
      // Generate ephemeral keypair for this session
      const { $nostr } = useNuxtApp();
      const ephemeralKeys = $nostr.generateKeys();

      // Create order event with owner tag
      const content = JSON.stringify(order);
      const tags = [
        ["d", order.id],
        ["p", ownerPubkey], // Tag owner so they can subscribe
        ["status", order.status],
        ["table", order.tableNumber || ""],
        ["t", order.date],
        ["amount", order.total.toString()],
        ["type", "customer-order"], // Mark as customer order
        ["encrypted", "false"],
      ];

      const unsignedEvent: UnsignedEvent = {
        kind: NOSTR_KINDS.ORDER,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content,
        pubkey: ephemeralKeys.publicKey,
      };

      // Sign with ephemeral key
      const signedEvent = finalizeEvent(
        unsignedEvent,
        hexToBytes(ephemeralKeys.privateKey)
      );

      // Publish to relay
      const success = await relay.publishEvent(signedEvent);
      if (!success) {
        console.error("[NostrData] Failed to publish anonymous order");
        return null;
      }

      return signedEvent;
    } catch (e) {
      console.error("[NostrData] Failed to save anonymous order:", e);
      return null;
    }
  }

  /**
   * Get orders for a store (tagged with owner pubkey)
   * Used by admin/kitchen to fetch customer orders
   */
  async function getOrdersForStore(ownerPubkey: string): Promise<Order[]> {
    try {
      // Query for orders tagged with this owner's pubkey
      const filter = {
        kinds: [NOSTR_KINDS.ORDER],
        "#p": [ownerPubkey],
        limit: 100,
      };

      const events = await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0]
      );
      const orders: Order[] = [];

      for (const event of events) {
        try {
          const isEncrypted =
            event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";
          const data = isEncrypted
            ? await decryptData<Order>(event.content)
            : JSON.parse(event.content);

          if (data && data.id) {
            orders.push(data);
          }
        } catch {
          // Skip invalid events
        }
      }

      // Sort by date descending
      return orders.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (e) {
      console.error("[NostrData] Failed to get store orders:", e);
      return [];
    }
  }

  // ============================================
  // 👥 CUSTOMER/LOYALTY OPERATIONS
  // ============================================

  async function saveCustomer(customer: LoyaltyMember): Promise<Event | null> {
    return publishReplaceableEvent(
      NOSTR_KINDS.CUSTOMER,
      customer,
      customer.nostrPubkey,
      [
        ["p", customer.nostrPubkey],
        ["tier", customer.tier],
        ["points", customer.points.toString()],
      ]
    );
  }

  async function getCustomer(pubkey: string): Promise<LoyaltyMember | null> {
    const result = await getReplaceableEvent<LoyaltyMember>(
      NOSTR_KINDS.CUSTOMER,
      pubkey
    );
    return result?.data || null;
  }

  async function getAllCustomers(): Promise<LoyaltyMember[]> {
    const results = await getAllEventsOfKind<LoyaltyMember>(
      NOSTR_KINDS.CUSTOMER
    );
    return results.map((r) => r.data);
  }

  // ============================================
  // 💬 CHAT CONVERSATION OPERATIONS
  // ============================================

  /**
   * Save team chat conversation to Nostr
   * Only syncs team channels (not DMs which stay local)
   */
  async function saveConversation(conversation: {
    id: string;
    type: "direct" | "channel" | "group";
    groupName?: string;
    groupAvatar?: string;
    shopId?: string;
    scope?: "shop" | "company" | "department";
    tags?: string[];
    isReadOnly?: boolean;
    memberPubkeys?: string[];
    isPrivate?: boolean;
  }): Promise<Event | null> {
    const company = useCompany();

    // Build tags for conversation
    // Using BOTH standard #t tag (NIP-12) AND custom #c tag for maximum relay compatibility
    const companyHash = company.companyCodeHash.value;
    const teamTag = companyHash ? `team:${companyHash}` : null;

    const tags: string[][] = [
      ["type", conversation.type],
      conversation.scope ? ["scope", conversation.scope] : [],
      conversation.shopId ? ["shop", conversation.shopId] : [],
      conversation.groupName ? ["name", conversation.groupName] : [],
      conversation.isReadOnly ? ["read-only", "true"] : [],
      // Add standard #t tag for team sync (better relay support - NIP-12)
      teamTag ? ["t", teamTag] : [],
      // Add custom #c tag for backward compatibility
      companyHash ? ["c", companyHash] : [],
      // Add custom tags
      ...(conversation.tags || []).map((t) => ["t", t]),
      // Add member pubkeys for private channels
      ...(conversation.memberPubkeys || []).map((p) => ["p", p]),
    ].filter((t) => t.length > 0) as string[][];

    // Decide encryption: team channels are unencrypted for easy sync
    const shouldEncrypt =
      conversation.isPrivate ||
      !company.isCompanyCodeEnabled.value ||
      conversation.type === "direct";

    return publishReplaceableEvent(
      NOSTR_KINDS.CHAT_CHANNEL,
      conversation,
      conversation.id,
      tags,
      shouldEncrypt
    );
  }

  /**
   * Get all team conversations (channels) from Nostr
   * Filters by company code hash for team mode
   */
  async function getAllConversations(
    options: {
      companyCodeHash?: string;
      scope?: string;
      shopId?: string;
    } = {}
  ): Promise<
    Array<{
      id: string;
      type: "direct" | "channel" | "group";
      groupName?: string;
      groupAvatar?: string;
      shopId?: string;
      scope?: "shop" | "company" | "department";
      tags?: string[];
      isReadOnly?: boolean;
      memberPubkeys?: string[];
    }>
  > {
    try {
      // Build filter - using standard #t tag for better relay support
      const filter: Record<string, unknown> = {
        kinds: [NOSTR_KINDS.CHAT_CHANNEL],
      };

      if (options.companyCodeHash) {
        // Use standard #t tag format (NIP-12) for better relay support
        const teamTag = `team:${options.companyCodeHash}`;
        filter["#t"] = [teamTag];
      }

      if (options.scope) {
        filter["#scope"] = [options.scope];
      }

      if (options.shopId) {
        filter["#shop"] = [options.shopId];
      }

      // Query with #t tag first
      let events = await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0]
      );

      // Fallback: also query with #c tag for backward compatibility
      if (options.companyCodeHash && events.length === 0) {
        const fallbackFilter: Record<string, unknown> = {
          kinds: [NOSTR_KINDS.CHAT_CHANNEL],
          "#c": [options.companyCodeHash],
        };
        events = await relay.queryEvents(
          fallbackFilter as Parameters<typeof relay.queryEvents>[0]
        );
      }

      const conversations: Array<{
        id: string;
        type: "direct" | "channel" | "group";
        groupName?: string;
        groupAvatar?: string;
        shopId?: string;
        scope?: "shop" | "company" | "department";
        tags?: string[];
        isReadOnly?: boolean;
        memberPubkeys?: string[];
      }> = [];
      for (const event of events) {
        try {
          const isEncrypted =
            event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";
          const data = isEncrypted
            ? await decryptData<(typeof conversations)[0]>(event.content)
            : JSON.parse(event.content);

          if (data && data.id) {
            conversations.push(data);
          }
        } catch (e) {
          console.warn("[NostrData] Failed to parse conversation:", e);
        }
      }

      return conversations;
    } catch (e) {
      console.error("[NostrData] Failed to get conversations:", e);
      return [];
    }
  }

  /**
   * Get single conversation by ID
   */
  async function getConversationById(id: string): Promise<{
    id: string;
    type: "direct" | "channel" | "group";
    groupName?: string;
    shopId?: string;
    scope?: "shop" | "company" | "department";
    tags?: string[];
    memberPubkeys?: string[];
  } | null> {
    const result = await getReplaceableEvent<{
      id: string;
      type: "direct" | "channel" | "group";
      groupName?: string;
      shopId?: string;
      scope?: "shop" | "company" | "department";
      tags?: string[];
      memberPubkeys?: string[];
    }>(NOSTR_KINDS.CHAT_CHANNEL, id);
    return result?.data || null;
  }

  // ============================================
  // 👥 NIP-29 GROUP CHAT OPERATIONS
  // ============================================

  /**
   * Generate unique group ID
   */
  function generateGroupId(): string {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Publish group metadata (kind 39000)
   * Creates or updates a group's basic information
   */
  async function publishGroupMetadata(params: {
    groupId: string;
    name: string;
    about?: string;
    picture?: string;
    isPrivate?: boolean;
  }): Promise<Event | null> {
    const company = useCompany();

    const metadata = {
      id: params.groupId,
      name: params.name,
      about: params.about || "",
      picture: params.picture || "",
      isPrivate: params.isPrivate !== false,
      createdAt: new Date().toISOString(),
    };

    const tags: string[][] = [
      ["d", params.groupId],
      ["name", params.name],
      ["picture", params.picture || ""],
      ["about", params.about || ""],
      params.isPrivate ? ["private"] : ["public"],
      // Company code for team filtering
      company.companyCodeHash.value ? ["c", company.companyCodeHash.value] : [],
    ].filter((t) => t.length > 0 && t[1] !== "") as string[][];

    return publishReplaceableEvent(
      NOSTR_KINDS.GROUP_METADATA,
      metadata,
      params.groupId,
      tags,
      false // Unencrypted for team visibility
    );
  }

  /**
   * Publish group admins list (kind 39001)
   */
  async function publishGroupAdmins(
    groupId: string,
    adminPubkeys: string[]
  ): Promise<Event | null> {
    const company = useCompany();

    const tags: string[][] = [
      ["d", groupId],
      ...adminPubkeys.map((pubkey) => ["p", pubkey, "", "admin"]),
      company.companyCodeHash.value ? ["c", company.companyCodeHash.value] : [],
    ].filter((t) => t.length > 0) as string[][];

    return publishReplaceableEvent(
      NOSTR_KINDS.GROUP_ADMINS,
      { groupId, admins: adminPubkeys },
      groupId,
      tags,
      false
    );
  }

  /**
   * Publish group members list (kind 39002)
   */
  async function publishGroupMembers(
    groupId: string,
    memberPubkeys: string[]
  ): Promise<Event | null> {
    const company = useCompany();

    const tags: string[][] = [
      ["d", groupId],
      ...memberPubkeys.map((pubkey) => ["p", pubkey, "", "member"]),
      company.companyCodeHash.value ? ["c", company.companyCodeHash.value] : [],
    ].filter((t) => t.length > 0) as string[][];

    return publishReplaceableEvent(
      NOSTR_KINDS.GROUP_MEMBERS,
      { groupId, members: memberPubkeys },
      groupId,
      tags,
      false
    );
  }

  /**
   * Send group chat message (kind 9)
   */
  async function sendGroupMessage(params: {
    groupId: string;
    content: string;
    replyTo?: string;
  }): Promise<Event | null> {
    const company = useCompany();

    const tags: string[][] = [
      ["h", params.groupId], // NIP-29: group reference
      params.replyTo ? ["e", params.replyTo, "", "reply"] : [],
      company.companyCodeHash.value ? ["c", company.companyCodeHash.value] : [],
    ].filter((t) => t.length > 0) as string[][];

    return publishEvent(
      NOSTR_KINDS.GROUP_CHAT_MESSAGE,
      { content: params.content },
      tags,
      false // Plain text for now
    );
  }

  /**
   * Get group metadata
   */
  async function getGroupMetadata(groupId: string): Promise<{
    id: string;
    name: string;
    about: string;
    picture: string;
    isPrivate: boolean;
  } | null> {
    const result = await getReplaceableEvent<{
      id: string;
      name: string;
      about: string;
      picture: string;
      isPrivate: boolean;
    }>(NOSTR_KINDS.GROUP_METADATA, groupId);
    return result?.data || null;
  }

  /**
   * Get group admins
   */
  async function getGroupAdmins(groupId: string): Promise<string[]> {
    const result = await getReplaceableEvent<{
      groupId: string;
      admins: string[];
    }>(NOSTR_KINDS.GROUP_ADMINS, groupId);
    return result?.data?.admins || [];
  }

  /**
   * Get group members
   */
  async function getGroupMembers(groupId: string): Promise<string[]> {
    const result = await getReplaceableEvent<{
      groupId: string;
      members: string[];
    }>(NOSTR_KINDS.GROUP_MEMBERS, groupId);
    return result?.data?.members || [];
  }

  /**
   * Get all groups for current team
   */
  async function getAllGroups(): Promise<
    Array<{
      id: string;
      name: string;
      about: string;
      picture: string;
      isPrivate: boolean;
      memberCount?: number;
    }>
  > {
    const company = useCompany();

    if (!company.companyCodeHash.value) {
      return [];
    }

    try {
      const filter: Record<string, unknown> = {
        kinds: [NOSTR_KINDS.GROUP_METADATA],
        "#c": [company.companyCodeHash.value],
      };

      const events = await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0]
      );

      const groups: Array<{
        id: string;
        name: string;
        about: string;
        picture: string;
        isPrivate: boolean;
        memberCount?: number;
      }> = [];

      for (const event of events) {
        try {
          const data = JSON.parse(event.content);
          if (data && data.id) {
            groups.push(data);
          }
        } catch (e) {
          console.warn("[NostrData] Failed to parse group:", e);
        }
      }

      return groups;
    } catch (e) {
      console.error("[NostrData] Failed to get groups:", e);
      return [];
    }
  }

  // ============================================
  // ⚙️ SETTINGS OPERATIONS
  // ============================================

  async function saveSettings(settings: StoreSettings): Promise<Event | null> {
    return publishReplaceableEvent(
      NOSTR_KINDS.STORE_SETTINGS,
      settings,
      "store-settings",
      [],
      true // Always encrypt settings
    );
  }

  async function getSettings(): Promise<StoreSettings | null> {
    const result = await getReplaceableEvent<StoreSettings>(
      NOSTR_KINDS.STORE_SETTINGS,
      "store-settings"
    );
    return result?.data || null;
  }

  // ============================================
  // 🏪 BRANCH OPERATIONS
  // ============================================

  async function saveBranch(branch: Branch): Promise<Event | null> {
    return publishReplaceableEvent(NOSTR_KINDS.BRANCH, branch, branch.id, [
      ["name", branch.name],
      ["code", branch.code],
    ]);
  }

  async function getAllBranches(): Promise<Branch[]> {
    const results = await getAllEventsOfKind<Branch>(NOSTR_KINDS.BRANCH);
    return results.map((r) => r.data);
  }

  // ============================================
  // 👤 STAFF OPERATIONS
  // ============================================

  async function saveStaff(staff: StoreUser): Promise<Event | null> {
    // Get company code hash for tagging (if available)
    const company = useCompany();
    const companyTag = company.companyCodeHash.value
      ? ["c", company.companyCodeHash.value]
      : [];

    return publishReplaceableEvent(
      NOSTR_KINDS.STAFF_MEMBER,
      staff,
      staff.id,
      [
        ["name", staff.name],
        ["role", staff.role],
        staff.pubkeyHex ? ["p", staff.pubkeyHex] : [],
        companyTag,
      ].filter((t) => t.length > 0) as string[][]
    );
  }

  async function getAllStaff(): Promise<StoreUser[]> {
    const results = await getAllEventsOfKind<StoreUser>(
      NOSTR_KINDS.STAFF_MEMBER
    );
    return results.map((r) => r.data).filter((s) => s.isActive);
  }

  /**
   * Fetch staff by company code (for cross-device sync without owner nsec)
   * @param companyCode - The 6-digit company code
   * @param ownerPubkey - The owner's pubkey to query
   */
  async function fetchStaffByCompanyCode(
    companyCode: string,
    ownerPubkey: string
  ): Promise<StoreUser[]> {
    const company = useCompany();
    const codeHash = await company.hashCompanyCode(companyCode);

    // Query events with company code tag from specific owner
    const filter: Record<string, unknown> = {
      kinds: [NOSTR_KINDS.STAFF_MEMBER],
      authors: [ownerPubkey],
      "#c": [codeHash],
    };

    try {
      const events = await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0]
      );

      const results: StoreUser[] = [];

      for (const event of events) {
        try {
          const isEncrypted =
            event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";

          let data: StoreUser | null = null;

          if (isEncrypted) {
            // Try to decrypt with company code
            try {
              const payload = JSON.parse(event.content);
              // Check if it's company-code encrypted (v4)
              if (payload.v === 4) {
                data = await company.decryptWithCode<StoreUser>(
                  payload.ct,
                  companyCode
                );
              } else {
                // Fall back to standard decryption
                data = await decryptData<StoreUser>(event.content);
              }
            } catch {
              data = await decryptData<StoreUser>(event.content);
            }
          } else {
            data = JSON.parse(event.content);
          }

          if (data && data.id && data.isActive) {
            results.push(data);
          }
        } catch (e) {
          console.warn("[NostrData] Failed to parse staff event:", e);
        }
      }

      return results;
    } catch (e) {
      console.error("[NostrData] Failed to fetch staff by company code:", e);
      return [];
    }
  }

  // ============================================
  // 🏪 COMPANY INDEX OPERATIONS
  // ============================================

  /**
   * Publish company index for discovery (unencrypted, public)
   * This allows new devices to find owner pubkey by company code
   */
  async function publishCompanyIndex(
    companyCodeHash: string
  ): Promise<Event | null> {
    const keys = getUserKeys();
    if (!keys) {
      console.error("[NostrData] No keys available to publish company index");
      return null;
    }

    // Publish unencrypted, public event that maps company code hash → owner pubkey
    const content = JSON.stringify({
      type: "company-index",
      ownerPubkey: keys.pubkey,
      companyCodeHash,
      createdAt: new Date().toISOString(),
    });

    const tags = [
      ["d", companyCodeHash], // Use code hash as d-tag for replaceability
      ["c", companyCodeHash], // Also as c-tag for filtering
      ["client", "bnos.space"],
    ];

    const event = await createEvent(NOSTR_KINDS.COMPANY_INDEX, content, tags);
    if (!event) return null;

    const success = await relay.publishEvent(event);
    if (!success) {
      error.value = "Failed to publish company index";
      return null;
    }
    return event;
  }

  /**
   * Discover owner pubkey by company code (works without being logged in)
   * Queries public company index events by company code hash
   */
  async function discoverOwnerByCompanyCode(
    companyCode: string
  ): Promise<string | null> {
    const company = useCompany();
    const codeHash = await company.hashCompanyCode(companyCode);

    const filter = {
      kinds: [NOSTR_KINDS.COMPANY_INDEX],
      "#c": [codeHash],
      limit: 10,
    };

    try {
      const events = await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0]
      );

      if (events.length === 0) return null;

      const sortedEvents = events.sort((a, b) => b.created_at - a.created_at);
      const event = sortedEvents[0]!;
      const data = JSON.parse(event.content);

      return data.ownerPubkey || event.pubkey;
    } catch (e) {
      console.error("[NostrData] Failed to discover owner:", e);
      return null;
    }
  }

  // ============================================
  // 📦 INVENTORY OPERATIONS
  // ============================================

  interface StockAdjustment {
    id: string;
    productId: string;
    previousStock: number;
    newStock: number;
    adjustment: number;
    reason: "sale" | "purchase" | "adjustment" | "count" | "waste" | "return";
    notes?: string;
    staffId: string;
    createdAt: string;
  }

  async function recordStockAdjustment(
    adjustment: StockAdjustment
  ): Promise<Event | null> {
    return publishReplaceableEvent(
      NOSTR_KINDS.STOCK_ADJUSTMENT,
      adjustment,
      adjustment.id
    );
  }

  async function saveProductActivityLog(log: any): Promise<Event | null> {
    return publishReplaceableEvent(NOSTR_KINDS.AUDIT_LOG, log, log.id);
  }

  async function getStockHistory(
    productId: string,
    limit = 50
  ): Promise<StockAdjustment[]> {
    const allAdjustments = await getAllEventsOfKind<StockAdjustment>(
      NOSTR_KINDS.STOCK_ADJUSTMENT,
      { limit }
    );
    return allAdjustments
      .map((r) => r.data)
      .filter((a) => a.productId === productId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  // ============================================
  // 🔄 SYNC OPERATIONS
  // ============================================

  /**
   * Full sync - fetch all data from relays
   */
  async function fullSync(): Promise<{
    products: number;
    categories: number;
    orders: number;
    customers: number;
  }> {
    isLoading.value = true;
    syncStatus.value = "syncing";
    error.value = null;

    try {
      const [products, categories, orders, customers] = await Promise.all([
        getAllProducts(),
        getAllCategories(),
        getAllOrders({ limit: 1000 }),
        getAllCustomers(),
      ]);

      syncStatus.value = "synced";
      lastSyncAt.value = new Date().toISOString();

      return {
        products: products.length,
        categories: categories.length,
        orders: orders.length,
        customers: customers.length,
      };
    } catch (e) {
      syncStatus.value = "error";
      error.value = `Sync failed: ${e}`;
      return { products: 0, categories: 0, orders: 0, customers: 0 };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Subscribe to real-time updates
   * ENHANCED: Now supports team sync via company code hash tag
   * This allows all staff in the same company to receive each other's updates
   */
  function subscribeToUpdates(callbacks: {
    onProduct?: (product: Product) => void;
    onOrder?: (order: Order) => void;
    onCustomer?: (customer: LoyaltyMember) => void;
  }) {
    const keys = getUserKeys();
    if (!keys) return null;

    const company = useCompany();

    // Build filter based on company mode
    // If company code is enabled, filter by company tag to get ALL team updates
    // Otherwise, filter by author only (personal mode)
    const filter: Record<string, unknown> = {
      kinds: [NOSTR_KINDS.PRODUCT, NOSTR_KINDS.ORDER, NOSTR_KINDS.CUSTOMER],
      since: Math.floor(Date.now() / 1000),
    };

    if (company.isCompanyCodeEnabled.value && company.companyCodeHash.value) {
      // TEAM MODE: Subscribe to all events with the company code tag
      // This enables cross-device sync between all staff members
      filter["#c"] = [company.companyCodeHash.value];
      console.log(
        "[NostrData] Subscribing to team updates with company hash:",
        company.companyCodeHash.value.slice(0, 8) + "..."
      );
    } else {
      // PERSONAL MODE: Only subscribe to own events
      filter.authors = [keys.pubkey];
      console.log("[NostrData] Subscribing to personal updates only");
    }

    return relay.subscribeToEvents(
      filter as Parameters<typeof relay.subscribeToEvents>[0],
      {
        onevent: async (event) => {
          // In team mode, we process ALL events including our own
          // (staff may share same keys, and we want updates from all devices)
          // In personal mode, skip own events
          const isTeamMode = company.isCompanyCodeEnabled.value;
          if (!isTeamMode && event.pubkey === keys.pubkey) {
            return;
          }

          console.log(
            "[NostrData] 📥 Subscription received event:",
            event.kind,
            "from:",
            event.pubkey.slice(0, 8) + "...",
            "isOwn:",
            event.pubkey === keys.pubkey
          );

          try {
            const isEncrypted =
              event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";

            let data;
            if (isEncrypted) {
              // Try company code decryption first for team data
              if (company.isCompanyCodeEnabled.value) {
                try {
                  const payload = JSON.parse(event.content);
                  if (payload.v === 4) {
                    // Company-code encrypted
                    data = await company.decryptWithCode(
                      payload.ct,
                      company.companyCode.value || ""
                    );
                  } else {
                    data = await decryptData(event.content);
                  }
                } catch {
                  data = await decryptData(event.content);
                }
              } else {
                data = await decryptData(event.content);
              }
            } else {
              data = JSON.parse(event.content);
            }

            if (!data) return;

            switch (event.kind) {
              case NOSTR_KINDS.PRODUCT:
                callbacks.onProduct?.(data as Product);
                break;
              case NOSTR_KINDS.ORDER:
                console.log(
                  "[NostrData] 📨 Real-time order update received:",
                  (data as Order).id?.slice(-8)
                );
                callbacks.onOrder?.(data as Order);
                break;
              case NOSTR_KINDS.CUSTOMER:
                callbacks.onCustomer?.(data as LoyaltyMember);
                break;
            }
          } catch (e) {
            console.warn(
              "[NostrData] Failed to process subscription event:",
              e
            );
          }
        },
      }
    );
  }

  return {
    // State
    isLoading,
    error,
    syncStatus,
    lastSyncAt,

    // Core
    encryptData,
    decryptData,
    createEvent,
    publishEvent,
    publishReplaceableEvent,
    queryEvents,
    getReplaceableEvent,
    getAllEventsOfKind,
    getUserKeys,

    // Products
    saveProduct,
    getProduct,
    getAllProducts,
    getProductsForOwner,
    deleteProduct,

    // Categories
    saveCategory,
    getAllCategories,
    getCategoriesForOwner,

    // Units
    saveUnit,
    getAllUnits,

    // Orders
    saveOrder,
    saveOrderAsAnonymous,
    getOrder,
    getAllOrders,
    getOrdersByStatus,
    getOrdersByCustomer,
    getOrdersForStore,

    // Customers
    saveCustomer,
    getCustomer,
    getAllCustomers,

    // Chat Conversations (Legacy NIP-28)
    saveConversation,
    getAllConversations,
    getConversationById,

    // Group Chat (NIP-29)
    generateGroupId,
    publishGroupMetadata,
    publishGroupAdmins,
    publishGroupMembers,
    sendGroupMessage,
    getGroupMetadata,
    getGroupAdmins,
    getGroupMembers,
    getAllGroups,

    // Settings
    saveSettings,
    getSettings,

    // Branches
    saveBranch,
    getAllBranches,

    // Staff
    saveStaff,
    getAllStaff,
    fetchStaffByCompanyCode,

    // Company Index (for cross-device discovery)
    publishCompanyIndex,
    discoverOwnerByCompanyCode,

    // Inventory
    recordStockAdjustment,
    getStockHistory,
    saveProductActivityLog,

    // Kitchen Alerts
    publishKitchenAlert,

    // Sync
    fullSync,
    subscribeToUpdates,

    // Constants
    NOSTR_KINDS,
  };
}
