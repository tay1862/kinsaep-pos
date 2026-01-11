# Nostr Data Standards - Bitspace POS

**Version:** 1.0
**Last Updated:** 2026-01-03

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Event Kind Registry](#event-kind-registry)
- [Standard Nostr Kinds (NIPs)](#standard-nostr-kinds-nips)
- [Custom Event Kinds](#custom-event-kinds)
- [Event Structure Examples](#event-structure-examples)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

---

## Overview

Bitspace POS uses **Nostr (Notes and Other Stuff Transmitted by Relays)** as its decentralized data protocol. All business data — from products and orders to customer profiles and chat messages — is stored as Nostr events with specific `kind` numbers.

This document defines the **global data standard** for all Nostr event kinds used throughout the system.

### Why Nostr?

- **Decentralized**: No single point of failure
- **Censorship-resistant**: Data owned by users, not platforms
- **Interoperable**: Compatible with other Nostr clients and relays
- **Verifiable**: Cryptographic signatures ensure data integrity
- **Offline-capable**: Events can be created offline and synced later

---

## Architecture

### Event Kind Ranges

Nostr uses numeric `kind` values to categorize events. We follow the official NIP (Nostr Implementation Possibilities) specifications plus custom ranges:

| Range           | Purpose                          | Examples                            |
| --------------- | -------------------------------- | ----------------------------------- |
| **0-999**       | Standard Nostr kinds (NIPs)      | Profile (0), DMs (4), Reactions (7) |
| **1000-9999**   | Ephemeral events                 | Typing indicators (1040)            |
| **9700-9799**   | Payments & Zaps                  | Zap receipts (9735)                 |
| **20000-29999** | Regular events                   | Authentication events               |
| **30000-39999** | Parameterized replaceable events | Our custom business data            |

### Custom Business Data (30000-39999)

We use **parameterized replaceable events** for all business entities. This means:

- Each entity has a unique identifier (`d` tag)
- Newer versions replace older ones automatically
- Efficient storage and retrieval
- Natural versioning built-in

Our custom range allocation:

```
30078-30099: Store Configuration (30079 = STORE_PROFILE for marketplace)
30100-30199: Catalog Data (Products, Categories, Units)
30200-30299: Transactions (Orders, Payments, Refunds, Invoices)
30300-30399: Customers & Loyalty
30400-30499: Inventory Management
30500-30599: Staff & Access Control
30600-30699: Branch Management
30700-30799: Supply Chain (Suppliers, Purchase Orders)
30800-30899: Accounting
30850-30899: Help & Documentation
30900-30949: Team Chat & Messaging
30950-30959: Marketplace Integration (NEW)
31000-31999: Replaceable Receipts
39000-39999: Group Chat (NIP-29)
```

---

## Event Kind Registry

### Location

All event kinds are centrally defined in:

```typescript
/app/epsty / nostr - kinds.ts;
```

### Usage

```typescript
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// Create an event
const event = {
  kind: NOSTR_KINDS.PRODUCT, // ✅ Use constant
  // kind: 30100,             // ❌ Never hardcode
  content: JSON.stringify(productData),
  tags: [["d", productId]],
};
```

**CRITICAL**: Always use `NOSTR_KINDS` constants. Never hardcode kind numbers directly in your code.

---

## Standard Nostr Kinds (NIPs)

These are official Nostr protocol kinds that we use for standard features:

### Profile & Identity

| Kind | Constant  | NIP    | Description                               |
| ---- | --------- | ------ | ----------------------------------------- |
| 0    | `PROFILE` | NIP-01 | User profile metadata (name, avatar, bio) |

**Example:**

```json
{
  "kind": 0,
  "content": "{\"name\":\"John Doe\",\"picture\":\"https://example.com/avatar.jpg\",\"about\":\"POS Manager\"}",
  "tags": []
}
```

### Messaging

| Kind | Constant             | NIP    | Description                             |
| ---- | -------------------- | ------ | --------------------------------------- |
| 4    | `ENCRYPTED_DM`       | NIP-04 | Encrypted direct messages (1-to-1 chat) |
| 40   | `CHANNEL_CREATE`     | NIP-28 | Channel creation (legacy public chat)   |
| 42   | `CHANNEL_MESSAGE`    | NIP-28 | Channel message (legacy public chat)    |
| 9    | `GROUP_CHAT_MESSAGE` | NIP-29 | Group chat message (modern)             |

**Direct Message Example:**

```json
{
  "kind": 4,
  "content": "encrypted_content_here",
  "tags": [["p", "recipient_pubkey"]]
}
```

**Group Chat Example:**

```json
{
  "kind": 9,
  "content": "Hello team!",
  "tags": [
    ["h", "group_id"],
    ["c", "company_code_hash"]
  ]
}
```

### Reactions & Interactions

| Kind | Constant   | NIP    | Description                         |
| ---- | ---------- | ------ | ----------------------------------- |
| 7    | `REACTION` | NIP-25 | Reaction to a message/event (emoji) |

**Example:**

```json
{
  "kind": 7,
  "content": "👍",
  "tags": [
    ["e", "event_id_being_reacted_to"],
    ["p", "author_pubkey"]
  ]
}
```

### Ephemeral Events

| Kind | Constant           | NIP    | Description                            |
| ---- | ------------------ | ------ | -------------------------------------- |
| 1040 | `TYPING_INDICATOR` | Custom | Typing indicator for real-time chat UX |

**Example:**

```json
{
  "kind": 1040,
  "content": "{\"typing\":true,\"conversation\":\"conv_123\"}",
  "tags": [["c", "company_code"]]
}
```

### Payments

| Kind | Constant      | NIP    | Description                     |
| ---- | ------------- | ------ | ------------------------------- |
| 9735 | `ZAP_RECEIPT` | NIP-57 | Lightning payment receipt (zap) |

**Example:**

```json
{
  "kind": 9735,
  "content": "",
  "tags": [
    ["bolt11", "lnbc..."],
    ["description", "payment_for_order_123"],
    ["preimage", "proof_of_payment"]
  ]
}
```

### Authentication

| Kind  | Constant     | NIP    | Description                             |
| ----- | ------------ | ------ | --------------------------------------- |
| 22242 | `STAFF_AUTH` | Custom | Staff authentication challenge/response |
| 27235 | `HTTP_AUTH`  | NIP-98 | HTTP authentication event               |

**Staff Auth Example:**

```json
{
  "kind": 22242,
  "content": "Authenticate to bnos.space",
  "tags": [["challenge", "random_challenge_string"]]
}
```

---

## Custom Event Kinds

### Store Configuration (30078-30099)

| Kind  | Constant         | Description                                    |
| ----- | ---------------- | ---------------------------------------------- |
| 30078 | `STORE_SETTINGS` | Store settings, config, preferences (private)  |
| 30079 | `STORE_PROFILE`  | Public store profile for marketplace discovery |
| 30080 | `TABLE`          | Table/room layout and status                   |

**Store Settings Example:**

```json
{
  "kind": 30078,
  "content": "{\"name\":\"My Coffee Shop\",\"currency\":\"USD\",\"timezone\":\"America/New_York\"}",
  "tags": [
    ["d", "store_settings"],
    ["company", "company_code_hash"]
  ]
}
```

### Catalog Data (30100-30199)

| Kind  | Constant          | Description                              |
| ----- | ----------------- | ---------------------------------------- |
| 30100 | `PRODUCT`         | Individual product listing               |
| 30101 | `CATEGORY`        | Product category/group                   |
| 30102 | `UNIT`            | Unit of measurement (pc, kg, etc.)       |
| 30103 | `MODIFIER_GROUP`  | Product modifier groups (size, toppings) |
| 30104 | `INGREDIENT`      | Ingredient for recipes                   |
| 30105 | `RECIPE`          | Recipe (ingredients + instructions)      |
| 30106 | `RECIPE_CATEGORY` | Recipe category                          |

**Product Example:**

```json
{
  "kind": 30100,
  "content": "{\"name\":\"Cappuccino\",\"price\":4.50,\"category\":\"beverages\"}",
  "tags": [
    ["d", "product_abc123"],
    ["company", "company_code_hash"],
    ["category", "beverages"],
    ["price", "4.50"],
    ["currency", "USD"]
  ]
}
```

### Transactions (30200-30299)

| Kind  | Constant          | Description               |
| ----- | ----------------- | ------------------------- |
| 30200 | `ORDER`           | Order record              |
| 30201 | `PAYMENT`         | Payment proof/receipt     |
| 30202 | `REFUND`          | Refund record             |
| 30203 | `INVOICE`         | Invoice for customers     |
| 30204 | `INVOICE_PAYMENT` | Invoice payment record    |
| 30205 | `CONTRACT`        | Contract/rental agreement |

**Order Example:**

```json
{
  "kind": 30200,
  "content": "{\"items\":[...],\"total\":45.00,\"status\":\"completed\"}",
  "tags": [
    ["d", "order_xyz789"],
    ["company", "company_code_hash"],
    ["customer", "customer_pubkey"],
    ["total", "45.00"],
    ["status", "completed"],
    ["created_at", "1704240000"]
  ]
}
```

### Customers & Loyalty (30300-30399)

| Kind  | Constant                  | Description                |
| ----- | ------------------------- | -------------------------- |
| 30300 | `CUSTOMER`                | Customer profile           |
| 30301 | `LOYALTY_POINTS`          | Loyalty points transaction |
| 30302 | `LOYALTY_REWARD`          | Reward claim/redemption    |
| 30310 | `COUPON`                  | Coupon/discount code       |
| 30311 | `MEMBERSHIP`              | Membership tier/plan       |
| 30312 | `MEMBERSHIP_SUBSCRIPTION` | Membership subscription    |

**Customer Example:**

```json
{
  "kind": 30300,
  "content": "{\"name\":\"Jane Smith\",\"email\":\"jane@example.com\",\"phone\":\"+1234567890\"}",
  "tags": [
    ["d", "customer_jane_smith"],
    ["company", "company_code_hash"],
    ["pubkey", "customer_nostr_pubkey"]
  ]
}
```

### Inventory Management (30400-30499)

| Kind  | Constant           | Description             |
| ----- | ------------------ | ----------------------- |
| 30400 | `STOCK_ADJUSTMENT` | Stock adjustment record |
| 30401 | `INVENTORY_COUNT`  | Inventory count session |
| 30402 | `CYCLE_COUNT`      | Cycle count record      |

### Staff & Access Control (30500-30599)

| Kind  | Constant            | Description                         |
| ----- | ------------------- | ----------------------------------- |
| 30500 | `STAFF_MEMBER`      | Staff member profile                |
| 30501 | `POS_SESSION`       | POS session log                     |
| 30502 | `AUDIT_LOG`         | Audit trail entry                   |
| 30503 | `COMPANY_INDEX`     | Company code → owner pubkey mapping |
| 30510 | `PERMISSION_GRANT`  | Permission grant event              |
| 30511 | `PERMISSION_REVOKE` | Permission revoke event             |

**Staff Member Example:**

```json
{
  "kind": 30500,
  "content": "{\"name\":\"Bob Johnson\",\"role\":\"cashier\",\"pin\":\"hashed_pin\"}",
  "tags": [
    ["d", "staff_bob_johnson"],
    ["company", "company_code_hash"],
    ["pubkey", "staff_nostr_pubkey"],
    ["role", "cashier"]
  ]
}
```

### Branch Management (30600-30699)

| Kind  | Constant | Description             |
| ----- | -------- | ----------------------- |
| 30600 | `BRANCH` | Branch/location details |

### Supply Chain (30700-30799)

| Kind  | Constant         | Description                  |
| ----- | ---------------- | ---------------------------- |
| 30700 | `SUPPLIER`       | Supplier profile             |
| 30701 | `BRANCH_STOCK`   | Branch-specific stock levels |
| 30702 | `PURCHASE_ORDER` | Purchase order               |
| 30703 | `STOCK_TRANSFER` | Inter-branch stock transfer  |

### Accounting (30800-30899)

| Kind  | Constant           | Description                  |
| ----- | ------------------ | ---------------------------- |
| 30800 | `ACCOUNT`          | Chart of accounts entry      |
| 30801 | `JOURNAL_ENTRY`    | Journal entry (double-entry) |
| 30802 | `EXPENSE`          | Expense record               |
| 30803 | `FINANCIAL_REPORT` | Financial report snapshot    |

### Help & Documentation (30850-30899)

| Kind  | Constant       | Description                       |
| ----- | -------------- | --------------------------------- |
| 30850 | `HELP_ARTICLE` | Dynamic help article (wiki-style) |

### Team Chat & Messaging (30900-30949)

| Kind  | Constant       | Description                              |
| ----- | -------------- | ---------------------------------------- |
| 30900 | `CHAT_CHANNEL` | Team chat channel metadata (replaceable) |
| 1234  | `CHAT_MESSAGE` | Legacy chat message                      |

### Marketplace Integration (30950-30959)

| Kind  | Constant               | Description                                  |
| ----- | ---------------------- | -------------------------------------------- |
| 30950 | `MARKETPLACE_LISTING`  | Store listing for marketplace discovery      |
| 30951 | `MARKETPLACE_PRODUCT`  | Product listing for cross-store catalog sync |
| 30952 | `MARKETPLACE_ORDER`    | Cross-store order routing (multi-vendor)     |
| 30953 | `STORE_CONNECTION`     | Store-to-store connection/partnership        |
| 30954 | `PUBLIC_STORE_PROFILE` | Enhanced public store profile for discovery  |
| 30955 | `MARKETPLACE_REVIEW`   | Customer review/rating for a store           |

**Store Profile Example (Kind 30079):**

```json
{
  "kind": 30079,
  "content": "{\"name\":\"ร้านกาแฟ ABC\",\"shopType\":\"cafe\",\"acceptsLightning\":true}",
  "tags": [
    ["d", "store_profile"],
    ["nip05", "shop@bnos.space"],
    ["lud16", "shop@getalby.com"],
    ["g", "u4pruy"],
    ["t", "cafe"],
    ["t", "bitcoin-accepted"]
  ]
}
```

> See [Marketplace Integration Guide](./marketplace-integration.md) for complete documentation.

### Replaceable Receipts (31000-31999)

| Kind  | Constant  | Description                             |
| ----- | --------- | --------------------------------------- |
| 31111 | `RECEIPT` | Replaceable receipt event for customers |

**Receipt Example:**

```json
{
  "kind": 31111,
  "content": "{\"items\":[...],\"total\":45.00,\"receiptUrl\":\"https://...\"}",
  "tags": [
    ["d", "receipt_xyz789"],
    ["t", "receipt"],
    ["t", "public"],
    ["order", "order_xyz789"]
  ]
}
```

### Group Chat - NIP-29 (39000-39999)

| Kind  | Constant         | Description                             |
| ----- | ---------------- | --------------------------------------- |
| 39000 | `GROUP_METADATA` | Group metadata (name, avatar, settings) |
| 39001 | `GROUP_ADMINS`   | Group admins list                       |
| 39002 | `GROUP_MEMBERS`  | Group members list                      |

---

## Event Structure Examples

### Basic Event Structure

All Nostr events follow this structure:

```typescript
interface NostrEvent {
  id: string; // SHA-256 hash (auto-generated)
  pubkey: string; // Author's public key (hex)
  created_at: number; // Unix timestamp (seconds)
  kind: number; // Event kind (use NOSTR_KINDS)
  tags: string[][]; // Array of tag arrays
  content: string; // JSON string or plain text
  sig: string; // Signature (auto-generated)
}
```

### Replaceable Events (d tag)

For business data (kinds 30000-39999), always include a `d` tag with a unique identifier:

```json
{
  "kind": 30100,
  "tags": [
    ["d", "product_unique_id"], // Required for replaceable events
    ["company", "company_hash"]
  ]
}
```

### Company Code Filtering

All business events should include the company code hash for multi-tenant filtering:

```json
{
  "tags": [
    ["c", "sha256_hash_of_company_code"],
    ["company", "sha256_hash_of_company_code"]
  ]
}
```

---

## Best Practices

### 1. Always Use NOSTR_KINDS Constants

```typescript
// ✅ GOOD
const event = {
  kind: NOSTR_KINDS.PRODUCT,
  content: productData,
};

// ❌ BAD
const event = {
  kind: 30100, // Hardcoded magic number
  content: productData,
};
```

### 2. Validate Event Structure

```typescript
import { getKindName, isReplaceableKind } from "~/types/nostr-kinds";

if (isReplaceableKind(event.kind)) {
  // Ensure 'd' tag exists
  const dTag = event.tags.find((t) => t[0] === "d");
  if (!dTag) {
    throw new Error("Replaceable event must have a 'd' tag");
  }
}
```

### 3. Include Metadata Tags

```json
{
  "tags": [
    ["d", "unique_identifier"],
    ["company", "company_hash"],
    ["created_by", "staff_pubkey"],
    ["branch", "branch_id"],
    ["t", "searchable_keyword"]
  ]
}
```

### 4. Content Should Be Valid JSON

```typescript
// ✅ GOOD
content: JSON.stringify({
  name: "Product Name",
  price: 9.99,
});

// ❌ BAD
content: "name=Product&price=9.99"; // Not JSON
```

### 5. Use Descriptive Comments

```typescript
const event = {
  kind: NOSTR_KINDS.ORDER, // Order record (30200)
  content: JSON.stringify(orderData),
  tags: [
    ["d", orderId], // Unique order identifier
    ["customer", customerPubkey], // Link to customer
  ],
};
```

---

## Migration Guide

### Replacing Hardcoded Kinds

If you have hardcoded kind numbers in your code:

**Before:**

```typescript
const event = {
  kind: 4, // NIP-04 encrypted DM
  content: encryptedContent,
};

if (event.kind === 9) {
  // Handle group message
}
```

**After:**

```typescript
import { NOSTR_KINDS } from "~/types/nostr-kinds";

const event = {
  kind: NOSTR_KINDS.ENCRYPTED_DM,
  content: encryptedContent,
};

if (event.kind === NOSTR_KINDS.GROUP_CHAT_MESSAGE) {
  // Handle group message
}
```

### Finding Hardcoded Kinds

Use these patterns to search for hardcoded kinds:

```bash
# Find 'kind: number' patterns
grep -r "kind:\s*[0-9]" app/

# Find 'kind === number' patterns
grep -r "kind\s*===\s*[0-9]" app/

# Find 'kinds: [numbers]' patterns
grep -r "kinds:\s*\[[0-9]" app/
```

---

## Adding New Event Kinds

When adding a new business entity:

### 1. Choose the Right Range

Refer to the range allocation table and select an unused kind number within the appropriate range.

### 2. Update nostr-kinds.ts

```typescript
// In app/types/nostr-kinds.ts
export const NOSTR_KINDS = {
  // ...existing kinds...

  // Add your new kind in the appropriate section
  NEW_ENTITY: 30XXX, // Choose next available number
} as const;
```

### 3. Add Documentation Comment

```typescript
/** Short description of what this event stores */
NEW_ENTITY: 30XXX,
```

### 4. Update This Document

Add the new kind to the relevant section in this documentation file.

### 5. Create TypeScript Types

```typescript
// In app/types/index.ts
export interface NewEntity {
  id: string;
  kind: typeof NOSTR_KINDS.NEW_ENTITY;
  // ...other fields...
}
```

---

## Utility Functions

### getKindName(kind: number)

Returns the constant name for a kind number:

```typescript
import { getKindName } from "~/types/nostr-kinds";

getKindName(30100); // Returns "PRODUCT"
getKindName(4); // Returns "ENCRYPTED_DM"
```

### isReplaceableKind(kind: number)

Check if a kind is in the replaceable range (30000-39999):

```typescript
import { isReplaceableKind } from "~/types/nostr-kinds";

isReplaceableKind(30100); // true
isReplaceableKind(4); // false
```

---

## References

- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-04: Encrypted Direct Messages](https://github.com/nostr-protocol/nips/blob/master/04.md)
- [NIP-25: Reactions](https://github.com/nostr-protocol/nips/blob/master/25.md)
- [NIP-28: Public Chat](https://github.com/nostr-protocol/nips/blob/master/28.md)
- [NIP-29: Relay-based Groups](https://github.com/nostr-protocol/nips/blob/master/29.md)
- [NIP-57: Lightning Zaps](https://github.com/nostr-protocol/nips/blob/master/57.md)
- [NIP-98: HTTP Auth](https://github.com/nostr-protocol/nips/blob/master/98.md)

---

## Support

For questions or suggestions about the data standards:

- Create an issue in the GitHub repository
- Contact the development team
- Review the code in `/app/types/nostr-kinds.ts`

---

**Last Updated:** 2026-01-03
**Maintainers:** Bitspace POS Development Team
