# Table Session / Tab System - Complete Guide

**Status:** ✅ Production Ready
**Last Updated:** 2026-01-03

## 📋 Overview

The Table Session system allows customers to make multiple orders throughout their dining experience and receive a single consolidated bill when they're ready to pay.

**Key Benefits:**
- ✅ Customers can order multiple times without calling waiter
- ✅ One consolidated receipt for entire table session
- ✅ Automatic tracking of all orders per table
- ✅ Easy bill processing for staff
- ✅ Better customer experience and faster service

---

## 🎯 Complete Workflow

### **Customer Side** ([order.vue](../app/pages/order.vue))

#### 1. Customer Arrives & Scans QR Code
```
Customer scans table QR → Loads menu page → Session created automatically
```
- Session tracks: Table ID, Table Number, Start Time, Currency
- Session stored in localStorage for persistence

#### 2. Customer Places First Order
```
Browse menu → Add items → Submit order → Order #1 added to session
```
- Order saved to IndexedDB
- Order published to Nostr
- Order ID added to session.orders array
- Session total updated

#### 3. Customer Orders More Items (Optional)
```
Browse menu → Add items → Submit order → Order #2 added to session
```
- Can repeat any number of times
- Each order tracked separately but linked to session
- Running total maintained

#### 4. Customer Views Current Tab
```
Click "Tab" button (top-right) → Modal shows all orders + total
```
**Displays:**
- Table name/number
- Session duration (e.g., "1h 23m")
- List of all orders with status
- Individual order totals
- **Grand total** for entire session

#### 5. Customer Requests Bill
```
Click "Request Bill" → Notification sent to staff
```
**What happens:**
- Session status changed to `requesting_bill`
- Bill request order created (total: 0, just a notification)
- Staff notification with session details:
  - Number of orders
  - Total amount
  - Session ID for reference

---

### **Staff Side** ([POS](../app/pages/pos/index.vue) + [Tables](../app/pages/pos/tables.vue))

#### 1. Staff Sees Pending Bill Request

**Automatic Alert Banner:**
```
🔔 [N] Tables Requesting Bill
┌─────────────────────────────┐
│ Table 5                     │
│ 3 orders · 1h 23m          │
│ Total: ₭158,000            │
│ [Process Payment] ────────►│
└─────────────────────────────┘
```

**Location:** Top of POS page ([PendingBillRequests.vue](../app/components/pos/PendingBillRequests.vue))

#### 2. Staff Clicks "Process Payment"

**Action Flow:**
```typescript
Click table card → Modal opens → Shows session details
                 ↓
        ┌────────────────────┐
        │ Session Bill       │
        │ Table 5            │
        ├────────────────────┤
        │ Orders: 3          │
        │ Duration: 1h 23m   │
        │ Status: Requesting │
        ├────────────────────┤
        │ Order #ORD-ABC     │
        │ 2x Coffee, 1x Cake │
        │ ₭58,000           │
        ├────────────────────┤
        │ Order #ORD-DEF     │
        │ 1x Sandwich        │
        │ ₭50,000           │
        ├────────────────────┤
        │ Order #ORD-GHI     │
        │ 2x Tea             │
        │ ₭50,000           │
        ├────────────────────┤
        │ TOTAL: ₭158,000   │
        └────────────────────┘
             ↓
        [Process Payment]
```

#### 3. Orders Loaded into POS

**Automatic Process:**
```
Session data → sessionStorage → POS reads on mount → Loads all items → Opens payment modal
```

**POS Cart Shows:**
- All items from all orders combined
- Correct quantities
- Table number pre-filled
- Order type set to "Dine In"

#### 4. Staff Processes Payment

**Normal POS Flow:**
```
Select payment method → Process payment → Payment complete
                                          ↓
                              ┌──────────────────────┐
                              │ Consolidated Receipt │
                              │ Generated            │
                              └──────────────────────┘
```

**Special Handling:**
- System detects this is a session payment
- Calls `createConsolidatedReceipt()` instead of regular receipt
- Merges ALL orders into one receipt
- Closes the session
- Generates single QR code

---

## 📁 File Structure

### Core Components

#### 1. **Types & Composables**
```
app/types/table-session.ts
├── TableSession interface
└── TableSessionSummary interface

app/composables/use-table-session.ts
├── createSession()
├── getOrCreateSession()
├── addOrderToSession()
├── requestBill()
├── closeSession()
├── getSessionsRequestingBill()
└── calculateDuration()
```

#### 2. **Receipt Generator**
```
app/composables/use-receipt-generator.ts
├── createReceiptFromOrder()      # Single order
└── createConsolidatedReceipt()   # Multiple orders ⭐ NEW
```

#### 3. **Customer UI**
```
app/pages/order.vue
├── Session creation on mount
├── Add orders to session
├── View Tab modal
└── Request Bill button
```

#### 4. **Staff UI**
```
app/components/pos/PendingBillRequests.vue
├── Shows tables requesting bill
├── Session summary cards
└── Opens SessionBillModal

app/components/tables/SessionBillModal.vue
├── Detailed session view
├── Order list
├── Total calculation
└── Process Payment button

app/pages/pos/index.vue
├── Shows PendingBillRequests
├── Loads session payment data
└── Generates consolidated receipt
```

---

## 🔧 Technical Details

### Session Data Structure

```typescript
interface TableSession {
  sessionId: string;           // "SESSION-019b..."
  tableId: string;             // Internal table ID
  tableNumber: string;         // "5"
  tableName: string;           // "Table 5" or "Patio A"
  startTime: string;           // ISO timestamp
  orders: string[];            // Array of order IDs
  status: "active" | "requesting_bill" | "closed";
  totalAmount: number;         // Running total
  currency: string;            // "LAK"
  lastUpdated: string;         // ISO timestamp
}
```

### Consolidated Receipt Structure

```typescript
{
  id: "REC-019b...",
  code: "REC-XXXX-XXXX",          // Human-readable
  orderId: sessionId,              // Links to session
  orderCode: "SESSION-5",          // Clear identifier
  orderNumber: 3,                  // Count of orders
  items: [                         // All items merged
    { name: "Coffee", quantity: 2, total: 28000 },
    { name: "Cake", quantity: 1, total: 30000 },
    { name: "Sandwich", quantity: 1, total: 50000 },
    { name: "Tea", quantity: 2, total: 50000 }
  ],
  total: 158000,                   // Sum of all orders
  // Nostr tags include:
  tags: [
    ["t", "consolidated"],         // Marks as consolidated
    ["session", sessionId],
    ["table", "5"],
    ["order_count", "3"]
  ]
}
```

### Storage Locations

**1. Session Data:** `localStorage` key: `"table-sessions"`
```json
[
  {
    "sessionId": "SESSION-019b...",
    "tableId": "table-5",
    "orders": ["ORD-ABC", "ORD-DEF", "ORD-GHI"],
    "status": "requesting_bill",
    "totalAmount": 158000
  }
]
```

**2. Pending Session Payment:** `sessionStorage` key: `"pending-session-payment"`
```json
{
  "orders": [/* Order objects */],
  "sessionInfo": {
    "sessionId": "SESSION-019b...",
    "tableName": "Table 5",
    "tableNumber": "5"
  }
}
```

**3. Active Session Info:** `sessionStorage` key: `"active-session-info"`
```json
{
  "sessionId": "SESSION-019b...",
  "tableName": "Table 5",
  "tableNumber": "5",
  "orderIds": ["ORD-ABC", "ORD-DEF", "ORD-GHI"]
}
```

---

## 🚀 Usage Examples

### For Staff: Manual Session Bill Processing

```typescript
// Get pending bill requests
const tableSession = useTableSession();
const sessions = tableSession.getSessionsRequestingBill();

// For each session requesting bill:
for (const session of sessions) {
  console.log(`Table ${session.tableName}:`);
  console.log(`- Orders: ${session.orders.length}`);
  console.log(`- Total: ${session.totalAmount}`);
  console.log(`- Duration: ${tableSession.calculateDuration(session.startTime)}`);
}

// Load orders for a session
const ordersStore = useOrders();
const sessionOrders = session.orders
  .map(orderId => ordersStore.getOrder(orderId))
  .filter(Boolean);

// Generate consolidated receipt
const receiptGenerator = useReceiptGenerator();
const { receipt, qrCode } = await receiptGenerator.createConsolidatedReceipt(
  sessionOrders,
  {
    sessionId: session.sessionId,
    tableName: session.tableName,
    tableNumber: session.tableNumber,
  },
  {
    method: "cash",
    paidAt: new Date().toISOString(),
  }
);

// Close session
tableSession.closeSession(session.sessionId);
```

---

## 🐛 Troubleshooting

### Issue 1: "Total shows ₭0 when bill requested"
**Cause:** Bill request notification is just an alert (not actual bill)
**Solution:** This is expected - staff processes actual payment in POS with real totals

### Issue 2: "Session not showing in pending bills"
**Cause:** Session status not set to `requesting_bill`
**Solution:**
1. Check customer clicked "Request Bill" button
2. Verify session status: `tableSession.getSession(sessionId).status`
3. Check notification was created in orders store

### Issue 3: "Items not loading in POS cart"
**Cause:** sessionStorage data cleared or corrupted
**Solution:**
1. Check browser console for errors
2. Verify sessionStorage has `pending-session-payment` key
3. Re-click "Process Payment" from pending bills list

### Issue 4: "Consolidated receipt missing items"
**Cause:** Orders not properly loaded from store
**Solution:**
1. Verify all order IDs exist in IndexedDB
2. Check orders are not filtered out by status
3. Ensure `ordersStore.init()` completed before querying

---

## ✅ Testing Checklist

### Customer Experience
- [ ] Scan QR code → Session created
- [ ] Place order #1 → Added to session
- [ ] Place order #2 → Added to session
- [ ] Click "Tab" button → See both orders
- [ ] See correct total → Sum of all orders
- [ ] Click "Request Bill" → Status changes
- [ ] See "Bill Requested" badge

### Staff Experience
- [ ] See pending bill alert banner
- [ ] Click table card → Modal opens
- [ ] See all orders listed
- [ ] See correct grand total
- [ ] Click "Process Payment" → POS loads
- [ ] All items in cart → Correct quantities
- [ ] Process payment → Success
- [ ] Receipt shows all items → One QR code
- [ ] Session closed → No longer in pending

---

## 📊 Analytics & Insights

### Session Metrics

```typescript
// Average session duration
const sessions = tableSession.loadSessions();
const avgDuration = sessions.reduce((sum, s) => {
  const duration = Date.now() - new Date(s.startTime).getTime();
  return sum + duration;
}, 0) / sessions.length;

// Average orders per session
const avgOrders = sessions.reduce((sum, s) => sum + s.orders.length, 0) / sessions.length;

// Average spend per session
const avgSpend = sessions.reduce((sum, s) => sum + s.totalAmount, 0) / sessions.length;
```

### Business Insights
- Track peak dining times (session start times)
- Analyze table turnover (session duration)
- Identify high-value tables (session totals)
- Monitor ordering patterns (orders per session)

---

## 🔮 Future Enhancements

### Potential Improvements
1. **Split Bills** - Allow customers to split total among multiple payments
2. **Table Transfers** - Move session to different table
3. **Session Pause** - Pause session if table temporarily empty
4. **Item-Level Split** - Split specific items instead of total
5. **Tip Distribution** - Track tips per order vs. per session
6. **Session History** - View past sessions for repeat customers
7. **Auto-Close** - Auto-close sessions after 4+ hours of inactivity

### Advanced Features
- **Multi-Device Ordering** - Multiple phones order to same session
- **Course Timing** - Track when each order was placed/served
- **Menu Recommendations** - Suggest items based on session history
- **Loyalty Integration** - Link sessions to customer accounts

---

## 📞 Support

**Documentation:**
- [E-Bill System](./E-BILL-SYSTEM.md)
- [Nostr Integration](./NOSTR-INTEGRATION.md)

**Code References:**
- Session Types: [app/types/table-session.ts](../app/types/table-session.ts)
- Session Composable: [app/composables/use-table-session.ts](../app/composables/use-table-session.ts)
- Receipt Generator: [app/composables/use-receipt-generator.ts](../app/composables/use-receipt-generator.ts)

**Last Updated:** 2026-01-03
**Author:** Claude Code
**Version:** 1.0.0
