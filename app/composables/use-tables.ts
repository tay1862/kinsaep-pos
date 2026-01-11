// composables/use-tables.ts
// 🍽️ Table Management for Dine-In Service
// Stores tables and reservations in Nostr relay

import { ref, computed } from "vue";

// ============================================
// TYPES
// ============================================

export type TableStatus =
  | "available"
  | "occupied"
  | "reserved"
  | "cleaning"
  | "unavailable";
export type TableShape = "square" | "round" | "rectangle" | "oval";

export interface Table {
  id: string;
  number: string;
  name?: string;
  capacity: number;
  minCapacity?: number;
  shape: TableShape;
  zone?: string; // e.g., 'indoor', 'outdoor', 'vip', 'bar'
  status: TableStatus;
  currentOrderId?: string;
  occupiedAt?: string;
  occupiedBy?: string; // staff name who seated the table
  guestCount?: number;
  notes?: string;
  position?: { x: number; y: number }; // for floor plan
  qrOrderingEnabled?: boolean; // Enable QR code ordering for this table
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Time-based billing (for Karaoke rooms)
  billingType?: 'per_order' | 'per_hour'; // Billing method
  hourlyRate?: number; // Price per hour
  minimumHours?: number; // Minimum billing hours (e.g., 1)
  expectedEndTime?: string; // Expected checkout time (for extend tracking)
}

export interface TableZone {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Reservation {
  id: string;
  tableId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNpub?: string;
  guestCount: number;
  reservedFor: string; // ISO date string
  duration: number; // in minutes
  notes?: string;
  status:
    | "pending"
    | "confirmed"
    | "seated"
    | "completed"
    | "cancelled"
    | "no_show";
  createdAt: string;
  updatedAt: string;
}

export interface TableSession {
  id: string;
  tableId: string;
  orderId?: string;
  guestCount: number;
  seatedAt: string;
  seatedBy?: string;
  closedAt?: string;
  closedBy?: string;
  duration?: number; // in minutes
  totalSpent?: number;
}

interface TableData {
  tables: Table[];
  zones: TableZone[];
  reservations: Reservation[];
  sessions: TableSession[];
}

// ============================================
// SINGLETON STATE
// ============================================

const tables = ref<Table[]>([]);
const zones = ref<TableZone[]>([]);
const reservations = ref<Reservation[]>([]);
const tableSessions = ref<TableSession[]>([]);
const isLoading = ref(false);
const lastSyncAt = ref<string | null>(null);

// Import centralized NOSTR_KINDS
import { NOSTR_KINDS } from "~/types/nostr-kinds";

export function useTables() {
  const nostrData = useNostrData();

  // ============================================
  // DATA OPERATIONS
  // ============================================

  /**
   * Load all table data from Nostr relay
   */
  const loadTables = async (): Promise<void> => {
    // Try to load from local storage first for immediate display
    if (import.meta.client) {
      const cached = localStorage.getItem("bitspace_tables_data");
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (tables.value.length === 0) tables.value = data.tables || [];
          if (zones.value.length === 0) zones.value = data.zones || [];
          if (reservations.value.length === 0)
            reservations.value = data.reservations || [];
          if (tableSessions.value.length === 0)
            tableSessions.value = data.sessions || [];
        } catch (e) {
          console.error("[Tables] Failed to load from cache:", e);
        }
      }
    }

    isLoading.value = true;
    try {
      const data = await nostrData.getReplaceableEvent<TableData>(
        NOSTR_KINDS.TABLE,
        "tables"
      );

      if (data?.data) {
        tables.value = data.data.tables || [];
        zones.value = data.data.zones || [];
        reservations.value = data.data.reservations || [];
        tableSessions.value = data.data.sessions || [];
        lastSyncAt.value = new Date().toISOString();

        // Save to local storage
        if (import.meta.client) {
          localStorage.setItem(
            "bitspace_tables_data",
            JSON.stringify(data.data)
          );
        }
      }
    } catch (error) {
      console.error("[Tables] Failed to load tables:", error);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Save all table data to Nostr relay
   */
  const saveTables = async (): Promise<void> => {
    try {
      await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.TABLE,
        {
          tables: tables.value,
          zones: zones.value,
          reservations: reservations.value,
          sessions: tableSessions.value,
        } as TableData,
        "tables",
        [],
        true // encrypt
      );
      lastSyncAt.value = new Date().toISOString();

      // Save to local storage
      if (import.meta.client) {
        localStorage.setItem(
          "bitspace_tables_data",
          JSON.stringify({
            tables: tables.value,
            zones: zones.value,
            reservations: reservations.value,
            sessions: tableSessions.value,
          })
        );
      }
    } catch (error) {
      console.error("[Tables] Failed to save tables:", error);
      throw error;
    }
  };

  // ============================================
  // TABLE CRUD OPERATIONS
  // ============================================

  /**
   * Create a new table
   */
  const createTable = async (
    tableData: Omit<Table, "id" | "status" | "createdAt" | "updatedAt">
  ): Promise<Table> => {
    const now = new Date().toISOString();
    const table: Table = {
      ...tableData,
      id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: "available",
      createdAt: now,
      updatedAt: now,
    };

    tables.value.push(table);
    await saveTables();
    return table;
  };

  /**
   * Update a table
   */
  const updateTable = async (
    id: string,
    updates: Partial<Table>
  ): Promise<Table | null> => {
    const index = tables.value.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const existingTable = tables.value[index];
    if (!existingTable) return null;

    const updatedTable: Table = {
      ...existingTable,
      ...updates,
      id: existingTable.id, // ensure id is not overwritten
      updatedAt: new Date().toISOString(),
    };

    tables.value[index] = updatedTable;
    await saveTables();
    return updatedTable;
  };

  /**
   * Delete a table
   */
  const deleteTable = async (id: string): Promise<boolean> => {
    const index = tables.value.findIndex((t) => t.id === id);
    if (index === -1) return false;

    tables.value.splice(index, 1);
    await saveTables();
    return true;
  };

  // ============================================
  // TABLE STATUS OPERATIONS
  // ============================================

  /**
   * Seat guests at a table (make it occupied)
   */
  const seatTable = async (
    tableId: string,
    guestCount: number,
    orderId?: string,
    staffName?: string
  ): Promise<Table | null> => {
    const table = tables.value.find((t) => t.id === tableId);
    if (!table || table.status !== "available") return null;

    const now = new Date().toISOString();

    // Create session
    const session: TableSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tableId,
      orderId,
      guestCount,
      seatedAt: now,
      seatedBy: staffName,
    };
    tableSessions.value.push(session);

    // Update table status
    return updateTable(tableId, {
      status: "occupied",
      currentOrderId: orderId,
      occupiedAt: now,
      occupiedBy: staffName,
      guestCount,
    });
  };

  /**
   * Free a table (make it available after cleaning)
   */
  const freeTable = async (
    tableId: string,
    staffName?: string
  ): Promise<Table | null> => {
    const table = tables.value.find((t) => t.id === tableId);
    if (!table) return null;

    // Close the current session if any
    const currentSession = tableSessions.value.find(
      (s) => s.tableId === tableId && !s.closedAt
    );
    if (currentSession) {
      const now = new Date();
      currentSession.closedAt = now.toISOString();
      currentSession.closedBy = staffName;
      currentSession.duration = Math.round(
        (now.getTime() - new Date(currentSession.seatedAt).getTime()) / 60000
      );
    }

    return updateTable(tableId, {
      status: "available",
      currentOrderId: undefined,
      occupiedAt: undefined,
      occupiedBy: undefined,
      guestCount: undefined,
      notes: undefined,
    });
  };

  /**
   * Set table to cleaning status
   */
  const setTableCleaning = async (tableId: string): Promise<Table | null> => {
    return updateTable(tableId, { status: "cleaning" });
  };

  /**
   * Reserve a table
   */
  const reserveTable = async (tableId: string): Promise<Table | null> => {
    return updateTable(tableId, { status: "reserved" });
  };

  /**
   * Set table as unavailable
   */
  const setTableUnavailable = async (
    tableId: string,
    notes?: string
  ): Promise<Table | null> => {
    return updateTable(tableId, { status: "unavailable", notes });
  };

  /**
   * Link an order to a table
   */
  const linkOrder = async (
    tableId: string,
    orderId: string
  ): Promise<Table | null> => {
    // Update current session with order ID
    const currentSession = tableSessions.value.find(
      (s) => s.tableId === tableId && !s.closedAt
    );
    if (currentSession) {
      currentSession.orderId = orderId;
    }

    return updateTable(tableId, { currentOrderId: orderId });
  };

  /**
   * Move table (transfer order and status)
   */
  const moveTable = async (fromTableId: string, toTableId: string): Promise<boolean> => {
    const fromTable = tables.value.find(t => t.id === fromTableId);
    const toTable = tables.value.find(t => t.id === toTableId);
    
    if (!fromTable || !toTable) return false;
    if (toTable.status !== 'available') return false; // Target must be available
    
    // Update target table with source info
    await updateTable(toTableId, {
      status: fromTable.status,
      currentOrderId: fromTable.currentOrderId,
      occupiedAt: fromTable.occupiedAt,
      occupiedBy: fromTable.occupiedBy,
      guestCount: fromTable.guestCount,
      notes: fromTable.notes,
    });
    
    // Update linked order with new table number if order exists
    if (fromTable.currentOrderId) {
      const ordersStore = useOrders(); // Lazy load
      // We assume ordersStore has updateOrder
      await ordersStore.updateOrder(fromTable.currentOrderId, {
        tableNumber: toTable.number 
      });
    }
    
    // Reset source table
    await updateTable(fromTableId, {
      status: 'available',
      currentOrderId: undefined,
      occupiedAt: undefined,
      occupiedBy: undefined,
      guestCount: undefined,
      notes: undefined,
    });
    
    return true;
  };

  /**
   * Merge bill (transfer items from source to target)
   */
  const mergeBill = async (fromTableId: string, toTableId: string): Promise<boolean> => {
    const fromTable = tables.value.find(t => t.id === fromTableId);
    const toTable = tables.value.find(t => t.id === toTableId);
    
    if (!fromTable || !toTable) return false;
    if (!fromTable.currentOrderId || !toTable.currentOrderId) return false; // Both must have orders
    
    // Perform order merge
    const ordersStore = useOrders();
    const result = await ordersStore.mergeOrders(fromTable.currentOrderId, toTable.currentOrderId);
    
    if (result) {
      // Free the source table
      await updateTable(fromTableId, {
        status: 'available',
        currentOrderId: undefined,
        occupiedAt: undefined,
        occupiedBy: undefined,
        guestCount: undefined,
        notes: undefined,
      });
      return true;
    }
    
    return false;
  };

  // ============================================
  // ZONE OPERATIONS
  // ============================================

  /**
   * Create a zone
   */
  const createZone = async (
    zoneData: Omit<TableZone, "id">
  ): Promise<TableZone> => {
    const zone: TableZone = {
      ...zoneData,
      id: `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    zones.value.push(zone);
    await saveTables();
    return zone;
  };

  /**
   * Update a zone
   */
  const updateZone = async (
    id: string,
    updates: Partial<TableZone>
  ): Promise<TableZone | null> => {
    const index = zones.value.findIndex((z) => z.id === id);
    if (index === -1) return null;

    const existingZone = zones.value[index];
    if (!existingZone) return null;

    const updatedZone: TableZone = {
      ...existingZone,
      ...updates,
      id: existingZone.id, // ensure id is not overwritten
    };

    zones.value[index] = updatedZone;
    await saveTables();
    return updatedZone;
  };

  /**
   * Delete a zone
   */
  const deleteZone = async (id: string): Promise<boolean> => {
    const index = zones.value.findIndex((z) => z.id === id);
    if (index === -1) return false;

    zones.value.splice(index, 1);
    await saveTables();
    return true;
  };

  // ============================================
  // RESERVATION OPERATIONS
  // ============================================

  /**
   * Create a reservation
   */
  const createReservation = async (
    reservationData: Omit<
      Reservation,
      "id" | "status" | "createdAt" | "updatedAt"
    >
  ): Promise<Reservation> => {
    const now = new Date().toISOString();
    const reservation: Reservation = {
      ...reservationData,
      id: `reservation_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    reservations.value.push(reservation);
    await saveTables();
    return reservation;
  };

  /**
   * Update reservation
   */
  const updateReservation = async (
    id: string,
    updates: Partial<Reservation>
  ): Promise<Reservation | null> => {
    const index = reservations.value.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const existingReservation = reservations.value[index];
    if (!existingReservation) return null;

    const updatedReservation: Reservation = {
      ...existingReservation,
      ...updates,
      id: existingReservation.id, // ensure id is not overwritten
      updatedAt: new Date().toISOString(),
    };

    reservations.value[index] = updatedReservation;
    await saveTables();
    return updatedReservation;
  };

  /**
   * Cancel reservation
   */
  const cancelReservation = async (id: string): Promise<Reservation | null> => {
    return updateReservation(id, { status: "cancelled" });
  };

  /**
   * Confirm reservation
   */
  const confirmReservation = async (
    id: string
  ): Promise<Reservation | null> => {
    return updateReservation(id, { status: "confirmed" });
  };

  /**
   * Mark reservation as seated
   */
  const seatReservation = async (id: string): Promise<Reservation | null> => {
    const reservation = reservations.value.find((r) => r.id === id);
    if (!reservation) return null;

    // Seat the table
    await seatTable(reservation.tableId, reservation.guestCount);

    return updateReservation(id, { status: "seated" });
  };

  /**
   * Mark reservation as no-show
   */
  const markNoShow = async (id: string): Promise<Reservation | null> => {
    return updateReservation(id, { status: "no_show" });
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  /**
   * Active tables only
   */
  const activeTables = computed(() => {
    return tables.value.filter((t) => t.isActive);
  });

  /**
   * Available tables
   */
  const availableTables = computed(() => {
    return activeTables.value.filter((t) => t.status === "available");
  });

  /**
   * Occupied tables
   */
  const occupiedTables = computed(() => {
    return activeTables.value.filter((t) => t.status === "occupied");
  });

  /**
   * Tables by status
   */
  const tablesByStatus = computed(() => {
    const result: Record<TableStatus, Table[]> = {
      available: [],
      occupied: [],
      reserved: [],
      cleaning: [],
      unavailable: [],
    };

    for (const table of activeTables.value) {
      result[table.status].push(table);
    }

    return result;
  });

  /**
   * Tables by zone
   */
  const tablesByZone = computed(() => {
    const result: Record<string, Table[]> = { "": [] }; // '' for tables with no zone

    for (const zone of zones.value) {
      result[zone.id] = [];
    }

    for (const table of activeTables.value) {
      const zoneId = table.zone || "";
      if (!result[zoneId]) result[zoneId] = [];
      result[zoneId].push(table);
    }

    return result;
  });

  /**
   * Active zones
   */
  const activeZones = computed(() => {
    return zones.value
      .filter((z) => z.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  });

  /**
   * Today's reservations
   */
  const todayReservations = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return reservations.value.filter((r) => {
      const reservedFor = new Date(r.reservedFor);
      return reservedFor >= today && reservedFor < tomorrow;
    });
  });

  /**
   * Upcoming reservations (next 24 hours)
   */
  const upcomingReservations = computed(() => {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return reservations.value
      .filter((r) => {
        const reservedFor = new Date(r.reservedFor);
        return (
          reservedFor >= now &&
          reservedFor <= in24Hours &&
          ["pending", "confirmed"].includes(r.status)
        );
      })
      .sort(
        (a, b) =>
          new Date(a.reservedFor).getTime() - new Date(b.reservedFor).getTime()
      );
  });

  /**
   * Table occupancy rate
   */
  const occupancyRate = computed(() => {
    if (activeTables.value.length === 0) return 0;
    return Math.round(
      (occupiedTables.value.length / activeTables.value.length) * 100
    );
  });

  /**
   * Total seating capacity
   */
  const totalCapacity = computed(() => {
    return activeTables.value.reduce((sum, t) => sum + t.capacity, 0);
  });

  /**
   * Current guest count
   */
  const currentGuestCount = computed(() => {
    return occupiedTables.value.reduce(
      (sum, t) => sum + (t.guestCount || 0),
      0
    );
  });

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Get table by ID
   */
  const getTable = (id: string): Table | undefined => {
    return tables.value.find((t) => t.id === id);
  };

  /**
   * Get table by number
   */
  const getTableByNumber = (number: string): Table | undefined => {
    return tables.value.find((t) => t.number === number);
  };

  /**
   * Get available tables for a given guest count
   */
  const getAvailableTablesForParty = (guestCount: number): Table[] => {
    return availableTables.value.filter((t) => {
      const min = t.minCapacity || 1;
      return guestCount >= min && guestCount <= t.capacity;
    });
  };

  /**
   * Check if a table is available at a specific time
   */
  const isTableAvailableAt = (
    tableId: string,
    dateTime: Date,
    duration: number = 90
  ): boolean => {
    const endTime = new Date(dateTime.getTime() + duration * 60000);

    // Check for overlapping reservations
    const overlapping = reservations.value.find((r) => {
      if (r.tableId !== tableId) return false;
      if (["cancelled", "no_show", "completed"].includes(r.status))
        return false;

      const resStart = new Date(r.reservedFor);
      const resEnd = new Date(resStart.getTime() + r.duration * 60000);

      // Check for overlap
      return dateTime < resEnd && endTime > resStart;
    });

    return !overlapping;
  };

  // ============================================
  // QR CODE ORDERING
  // ============================================

  // Secret for table token encryption (derived from owner pubkey)
  const TABLE_TOKEN_SECRET = "bitspace-table-token-v1";

  /**
   * Generate an encrypted table token for secure QR ordering
   */
  const generateTableToken = async (tableId: string): Promise<string> => {
    const table = tables.value.find((t) => t.id === tableId);
    if (!table) {
      console.warn(
        "[Tables] generateTableToken: Table not found:",
        tableId,
        "Available tables:",
        tables.value.map((t) => t.id)
      );
      return "";
    }

    // Get owner pubkey from Nostr store or localStorage legacy key
    const nostrData = useNostrData();
    const keys = nostrData.getUserKeys();
    let ownerPubkey =
      keys?.pubkey || localStorage.getItem("nostr_pubkey") || "";

    // Fallback: check nostrUser storage key directly
    if (!ownerPubkey) {
      try {
        const nostrUser = localStorage.getItem("nostrUser");
        if (nostrUser) {
          const parsed = JSON.parse(nostrUser);
          if (parsed.pubkey) ownerPubkey = parsed.pubkey;
        }
      } catch (e) {
        // ignore
      }
    }

    if (!ownerPubkey) {
      console.warn(
        "[Tables] generateTableToken: No owner pubkey found (checked useNostrData, nostr_pubkey, nostrUser)"
      );
    }

    // Token data
    const tokenData = {
      tid: tableId,
      tnum: table.number,
      tname: table.name || "",
      opk: ownerPubkey, // Full owner pubkey for Nostr queries
      iat: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    try {
      // Check if crypto.subtle is available (requires HTTPS or localhost)
      if (!crypto?.subtle) {
        console.warn(
          "[Tables] crypto.subtle not available - using base64 fallback (development mode)"
        );
        // Fallback: base64 encode the token data (NOT SECURE - only for development)
        const fallbackToken = btoa(JSON.stringify(tokenData))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");
        return `dev_${fallbackToken}`;
      }

      // Derive key (use static secret only so customers can decrypt without knowing owner pubkey)
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(TABLE_TOKEN_SECRET),
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"]
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: encoder.encode("table-token-salt"),
          iterations: 10000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
      );

      // Encrypt
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encoder.encode(JSON.stringify(tokenData))
      );

      // Combine IV + ciphertext and encode as base64url
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(ciphertext), iv.length);

      return btoa(String.fromCharCode(...combined))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
    } catch (e) {
      console.error("[Tables] Token generation failed:", e);
      return "";
    }
  };

  /**
   * Validate and decrypt a table token
   */
  const validateTableToken = async (
    token: string
  ): Promise<{
    valid: boolean;
    tableId?: string;
    tableNumber?: string;
    tableName?: string;
    ownerPubkey?: string;
    error?: string;
  }> => {
    try {
      // Handle development fallback tokens (dev_ prefix)
      if (token.startsWith("dev_")) {
        const base64Data = token.slice(4).replace(/-/g, "+").replace(/_/g, "/");
        let padded = base64Data;
        while (padded.length % 4) padded += "=";
        const tokenData = JSON.parse(atob(padded));

        // Check expiration
        if (tokenData.exp && tokenData.exp < Date.now()) {
          return { valid: false, error: "Token expired" };
        }

        return {
          valid: true,
          tableId: tokenData.tid,
          tableNumber: tokenData.tnum,
          tableName: tokenData.tname,
          ownerPubkey: tokenData.opk,
        };
      }

      // Check if crypto.subtle is available
      if (!crypto?.subtle) {
        return { valid: false, error: "Crypto not available" };
      }

      // Derive key (use static secret only so customers can decrypt without knowing owner pubkey)
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(TABLE_TOKEN_SECRET),
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"]
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: encoder.encode("table-token-salt"),
          iterations: 10000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );

      // Decode base64url
      let base64 = token.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) base64 += "=";
      const combined = new Uint8Array(
        atob(base64)
          .split("")
          .map((c) => c.charCodeAt(0))
      );

      // Extract IV and ciphertext
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
      );

      const tokenData = JSON.parse(new TextDecoder().decode(decrypted));

      // Check expiration
      if (tokenData.exp && tokenData.exp < Date.now()) {
        return { valid: false, error: "Token expired" };
      }

      return {
        valid: true,
        tableId: tokenData.tid,
        tableNumber: tokenData.tnum,
        tableName: tokenData.tname,
        ownerPubkey: tokenData.opk,
      };
    } catch (e) {
      console.error("[Tables] Token validation failed:", e);
      return { valid: false, error: "Invalid token" };
    }
  };

  /**
   * Get the table ordering URL for customers (with encrypted token)
   */
  const getTableOrderingUrl = async (tableId: string): Promise<string> => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const token = await generateTableToken(tableId);
    return `${baseUrl}/order?t=${token}`;
  };

  /**
   * Generate QR code image URL for a table
   * Uses native qrcode package (no external API required)
   */
  const generateTableQR = async (
    tableId: string,
    size: number = 200
  ): Promise<string> => {
    const url = await getTableOrderingUrl(tableId);

    // Use native qrcode package instead of external API
    const QRCode = await import('qrcode');
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrDataUrl; // Returns data:image/png;base64,...
  };

  /**
   * Toggle QR ordering for a table
   */
  const toggleTableQROrdering = async (
    tableId: string,
    enabled: boolean
  ): Promise<Table | null> => {
    return updateTable(tableId, { qrOrderingEnabled: enabled });
  };

  // ============================================
  // DEMO DATA
  // ============================================

  /**
   * Create demo tables and zones
   */
  const createDemoData = async (): Promise<void> => {
    // Create zones if none exist
    if (zones.value.length === 0) {
      await createZone({
        name: "Indoor",
        description: "Main dining area",
        color: "#3B82F6",
        isActive: true,
        sortOrder: 1,
      });
      await createZone({
        name: "Outdoor",
        description: "Patio seating",
        color: "#10B981",
        isActive: true,
        sortOrder: 2,
      });
      await createZone({
        name: "Bar",
        description: "Bar counter",
        color: "#F59E0B",
        isActive: true,
        sortOrder: 3,
      });
      await createZone({
        name: "VIP",
        description: "Private dining",
        color: "#8B5CF6",
        isActive: true,
        sortOrder: 4,
      });
    }

    // Create tables if none exist
    if (tables.value.length === 0) {
      const indoorZone = zones.value.find((z) => z.name === "Indoor");
      const outdoorZone = zones.value.find((z) => z.name === "Outdoor");
      const barZone = zones.value.find((z) => z.name === "Bar");
      const vipZone = zones.value.find((z) => z.name === "VIP");

      // Indoor tables
      for (let i = 1; i <= 8; i++) {
        await createTable({
          number: `T${i}`,
          name: `Table ${i}`,
          capacity: i <= 4 ? 4 : 6,
          shape: "square",
          zone: indoorZone?.id,
          position: {
            x: ((i - 1) % 4) * 100,
            y: Math.floor((i - 1) / 4) * 100,
          },
          isActive: true,
        });
      }

      // Outdoor tables
      for (let i = 9; i <= 12; i++) {
        await createTable({
          number: `T${i}`,
          name: `Patio ${i - 8}`,
          capacity: 4,
          shape: "round",
          zone: outdoorZone?.id,
          isActive: true,
        });
      }

      // Bar seats
      for (let i = 1; i <= 6; i++) {
        await createTable({
          number: `B${i}`,
          name: `Bar Seat ${i}`,
          capacity: 2,
          minCapacity: 1,
          shape: "round",
          zone: barZone?.id,
          isActive: true,
        });
      }

      // VIP tables
      await createTable({
        number: "VIP1",
        name: "VIP Room 1",
        capacity: 10,
        minCapacity: 6,
        shape: "rectangle",
        zone: vipZone?.id,
        isActive: true,
      });

      await createTable({
        number: "VIP2",
        name: "VIP Room 2",
        capacity: 8,
        minCapacity: 4,
        shape: "oval",
        zone: vipZone?.id,
        isActive: true,
      });
    }
  };

  // ============================================
  // INITIALIZE
  // ============================================

  const initialize = async (): Promise<void> => {
    await loadTables();
  };

  // ============================================
  // TABLE TIMER HELPERS
  // ============================================

  /**
   * Get how many minutes a table has been occupied
   */
  const getTableOccupiedMinutes = (tableId: string): number => {
    const table = tables.value.find((t) => t.id === tableId);
    if (!table || table.status !== "occupied" || !table.occupiedAt) {
      return 0;
    }
    const occupiedTime = new Date(table.occupiedAt).getTime();
    return Math.floor((Date.now() - occupiedTime) / 60000);
  };

  /**
   * Get timer color based on duration thresholds
   * Green: 0-30 min, Yellow: 30-60 min, Red: 60+ min
   */
  const getTimerColor = (minutes: number): "green" | "yellow" | "red" => {
    if (minutes >= 60) return "red";
    if (minutes >= 30) return "yellow";
    return "green";
  };

  /**
   * Format duration in minutes to readable string
   * e.g., "5m", "45m", "1h 15m"
   */
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    tables,
    zones,
    reservations,
    tableSessions,
    isLoading,
    lastSyncAt,

    // Computed
    activeTables,
    availableTables,
    occupiedTables,
    tablesByStatus,
    tablesByZone,
    activeZones,
    todayReservations,
    upcomingReservations,
    occupancyRate,
    totalCapacity,
    currentGuestCount,

    // Actions
    initialize,
    loadTables,
    saveTables,

    // Table CRUD
    createTable,
    updateTable,
    deleteTable,

    // Table Status
    seatTable,
    freeTable,
    setTableCleaning,
    reserveTable,
    setTableUnavailable,
    linkOrder,
    moveTable,
    mergeBill,

    // Zones
    createZone,
    updateZone,
    deleteZone,

    // Reservations
    createReservation,
    updateReservation,
    cancelReservation,
    confirmReservation,
    seatReservation,
    markNoShow,

    // Utilities
    getTable,
    getTableByNumber,
    getAvailableTablesForParty,
    isTableAvailableAt,

    // QR Ordering
    generateTableToken,
    validateTableToken,
    getTableOrderingUrl,
    generateTableQR,
    toggleTableQROrdering,

    // Demo
    createDemoData,

    // Timer Helpers
    getTableOccupiedMinutes,
    getTimerColor,
    formatDuration,
  };
}
