// types/table-session.ts
// 🍽️ Table Session Management - Track customer tabs for order consolidation

export interface TableSession {
  sessionId: string;
  tableId: string;
  tableNumber: string;
  tableName: string;
  startTime: string;
  orders: string[]; // Array of Order IDs
  status: "active" | "requesting_bill" | "closed";
  totalAmount: number;
  currency: string;
  lastUpdated: string;
}

export interface TableSessionSummary {
  sessionId: string;
  tableNumber: string;
  tableName: string;
  orderCount: number;
  totalAmount: number;
  currency: string;
  duration: string; // Human-readable duration
  status: "active" | "requesting_bill" | "closed";
}
