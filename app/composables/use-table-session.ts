// composables/use-table-session.ts
// 🍽️ Table Session Management - Track customer tabs for order consolidation

import type { TableSession, TableSessionSummary } from "~/types/table-session";
import { EntityId } from "~/utils/id";

export const useTableSession = () => {
  const STORAGE_KEY = "table-sessions";

  /**
   * Load all sessions from localStorage
   */
  const loadSessions = (): TableSession[] => {
    if (!import.meta.client) return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("[TableSession] Failed to load sessions:", error);
      return [];
    }
  };

  /**
   * Save sessions to localStorage
   */
  const saveSessions = (sessions: TableSession[]): void => {
    if (!import.meta.client) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("[TableSession] Failed to save sessions:", error);
    }
  };

  /**
   * Create new table session
   */
  const createSession = (
    tableId: string,
    tableNumber: string,
    tableName: string,
    currency: string = "LAK"
  ): TableSession => {
    const { id: sessionId } = EntityId.generic("SESSION");

    const session: TableSession = {
      sessionId,
      tableId,
      tableNumber,
      tableName,
      startTime: new Date().toISOString(),
      orders: [],
      status: "active",
      totalAmount: 0,
      currency,
      lastUpdated: new Date().toISOString(),
    };

    const sessions = loadSessions();
    sessions.push(session);
    saveSessions(sessions);

    return session;
  };

  /**
   * Get active session for a table (if exists)
   */
  const getActiveSession = (tableId: string): TableSession | null => {
    const sessions = loadSessions();
    return (
      sessions.find(
        (s) => s.tableId === tableId && s.status === "active"
      ) || null
    );
  };

  /**
   * Get or create session for a table
   */
  const getOrCreateSession = (
    tableId: string,
    tableNumber: string,
    tableName: string,
    currency: string = "LAK"
  ): TableSession => {
    const existing = getActiveSession(tableId);
    if (existing) {
      return existing;
    }
    return createSession(tableId, tableNumber, tableName, currency);
  };

  /**
   * Add order to session
   */
  const addOrderToSession = (
    sessionId: string,
    orderId: string,
    orderTotal: number
  ): boolean => {
    const sessions = loadSessions();
    const sessionIndex = sessions.findIndex((s) => s.sessionId === sessionId);

    if (sessionIndex === -1) {
      console.error("[TableSession] Session not found:", sessionId);
      return false;
    }

    const session = sessions[sessionIndex];
    if (!session) return false;

    // Add order ID if not already in session
    if (!session.orders.includes(orderId)) {
      session.orders.push(orderId);
      session.totalAmount += orderTotal;
      session.lastUpdated = new Date().toISOString();

      sessions[sessionIndex] = session;
      saveSessions(sessions);
      return true;
    }

    return false;
  };

  /**
   * Mark session as requesting bill
   */
  const requestBill = (sessionId: string): boolean => {
    const sessions = loadSessions();
    const sessionIndex = sessions.findIndex((s) => s.sessionId === sessionId);

    if (sessionIndex === -1) return false;

    const session = sessions[sessionIndex];
    if (!session) return false;

    session.status = "requesting_bill";
    session.lastUpdated = new Date().toISOString();

    sessions[sessionIndex] = session;
    saveSessions(sessions);
    return true;
  };

  /**
   * Close session after payment
   */
  const closeSession = (sessionId: string): boolean => {
    const sessions = loadSessions();
    const sessionIndex = sessions.findIndex((s) => s.sessionId === sessionId);

    if (sessionIndex === -1) return false;

    const session = sessions[sessionIndex];
    if (!session) return false;

    session.status = "closed";
    session.lastUpdated = new Date().toISOString();

    sessions[sessionIndex] = session;
    saveSessions(sessions);
    return true;
  };

  /**
   * Get session by ID
   */
  const getSession = (sessionId: string): TableSession | null => {
    const sessions = loadSessions();
    return sessions.find((s) => s.sessionId === sessionId) || null;
  };

  /**
   * Get all active sessions
   */
  const getActiveSessions = (): TableSession[] => {
    const sessions = loadSessions();
    return sessions.filter((s) => s.status === "active");
  };

  /**
   * Get all sessions requesting bill
   */
  const getSessionsRequestingBill = (): TableSession[] => {
    const sessions = loadSessions();
    return sessions.filter((s) => s.status === "requesting_bill");
  };

  /**
   * Calculate session duration
   */
  const calculateDuration = (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins}m`;
    }

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  /**
   * Get session summary for display
   */
  const getSessionSummary = (session: TableSession): TableSessionSummary => {
    return {
      sessionId: session.sessionId,
      tableNumber: session.tableNumber,
      tableName: session.tableName,
      orderCount: session.orders.length,
      totalAmount: session.totalAmount,
      currency: session.currency,
      duration: calculateDuration(session.startTime),
      status: session.status,
    };
  };

  /**
   * Update session total (recalculate from orders)
   */
  const updateSessionTotal = (sessionId: string, newTotal: number): boolean => {
    const sessions = loadSessions();
    const sessionIndex = sessions.findIndex((s) => s.sessionId === sessionId);

    if (sessionIndex === -1) return false;

    const session = sessions[sessionIndex];
    if (!session) return false;

    session.totalAmount = newTotal;
    session.lastUpdated = new Date().toISOString();

    sessions[sessionIndex] = session;
    saveSessions(sessions);
    return true;
  };

  /**
   * Clear old closed sessions (older than 7 days)
   */
  const clearOldSessions = (): void => {
    const sessions = loadSessions();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeSessions = sessions.filter((s) => {
      if (s.status === "closed") {
        const lastUpdated = new Date(s.lastUpdated);
        return lastUpdated > sevenDaysAgo;
      }
      return true; // Keep active sessions
    });

    saveSessions(activeSessions);
  };

  return {
    createSession,
    getActiveSession,
    getOrCreateSession,
    addOrderToSession,
    requestBill,
    closeSession,
    getSession,
    getActiveSessions,
    getSessionsRequestingBill,
    getSessionSummary,
    updateSessionTotal,
    clearOldSessions,
    calculateDuration,
  };
};
