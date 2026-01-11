# 📐 bnos.space - Database Schema Documentation

> **Version:** 2.0  
> **Last Updated:** 2024  
> **Architecture:** Hybrid Storage (Nostr + Hasura SQL + IndexedDB)

## 🏗️ Architecture Overview

bnos.space uses a **hybrid data architecture** combining three storage layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                      bnos.space Data Layer                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │   IndexedDB   │  │    Hasura     │  │    Nostr      │       │
│  │   (Dexie)     │  │  PostgreSQL   │  │   Relays      │       │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘       │
│          │                   │                   │               │
│          │    Offline-       │   Real-time      │  Decentralized│
│          │    First Cache    │   GraphQL API    │  Event Store  │
│          │                   │                   │               │
│  ┌───────┴───────────────────┴───────────────────┴───────┐     │
│  │                   Sync Layer                           │     │
│  │  - Auto-sync when online                               │     │
│  │  - Conflict resolution (last-write-wins)               │     │
│  │  - Event-driven updates                                │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 IndexedDB Schema (Dexie)

Local offline-first storage using IndexedDB via Dexie.js.

### Database: `POSDatabase`

#### Table: `events` - Nostr Events Cache

```typescript
{
  id: string;           // Primary Key - Nostr event ID (32-byte hex)
  kind: number;         // Indexed - Nostr event kind (NIP-01)
  pubkey: string;       // Indexed - Author's public key
  created_at: number;   // Indexed - Unix timestamp
  tags: string[][];     // Event tags (e.g., ["p", "pubkey"], ["e", "eventId"])
  content: string;      // AES-encrypted JSON string
  sig: string;          // Schnorr signature
  synced?: boolean;     // Sync status with relays
}
```

**Indexes:** `id`, `kind`, `created_at`, `pubkey`

#### Table: `meta` - Categories, Units, Payment Terms

```typescript
{
  id: string;           // Primary Key - UUID
  type: "category" | "unit" | "term";
  name: string;
  description?: string;
  symbol?: string;      // For units (e.g., "kg", "pcs")
  days?: number;        // For payment terms
  notes?: string;
  created_at: number;   // Unix timestamp
}
```

**Indexes:** `id`, `type`

#### Table: `pendingSync` - Offline Sync Queue

```typescript
{
  id?: number;          // Auto-increment Primary Key
  event: NostrEvent;    // Full Nostr event object
  status: "pending" | "error" | "synced";
  lastAttempt?: number; // Unix timestamp of last sync attempt
}
```

**Indexes:** `id (auto)`, `status`

#### Table: `offlinePayments` - Offline Payment Records

```typescript
{
  id: string; // Primary Key - UUID
  orderId: string; // Indexed - Reference to order
  paymentHash: string; // Lightning payment hash
  preimage: string; // Payment proof
  amount: number; // Amount in sats
  method: string; // Payment method
  createdAt: number; // Indexed - Unix timestamp
  syncStatus: "pending" | "synced" | "failed"; // Indexed
  syncAttempts: number;
  orderData: string; // JSON string of full order
}
```

**Indexes:** `id`, `orderId`, `syncStatus`, `createdAt`

#### Table: `loyaltyMembers` - Customer Loyalty Program

```typescript
{
  id: string; // Primary Key - UUID
  nostrPubkey: string; // Indexed - Customer's Nostr pubkey
  points: number; // Indexed - Loyalty points balance
  tier: string; // Indexed - bronze | silver | gold | platinum
  totalSpent: number; // Lifetime spend amount
  visitCount: number; // Number of visits
  lastVisit: number; // Unix timestamp
  joinedAt: number; // Unix timestamp
  rewardsJson: string; // JSON array of ZapReward objects
}
```

**Indexes:** `id`, `nostrPubkey`, `tier`, `points`

#### Table: `localOrders` - Local Order Cache

```typescript
{
  id: string;           // Primary Key - UUID
  data: string;         // JSON string of full Order object
  status: string;       // Indexed - Order status
  paymentMethod: string;
  total: number;
  totalSats: number;
  createdAt: number;    // Indexed - Unix timestamp
  syncedAt?: number;    // Indexed - When synced to server
}
```

**Indexes:** `id`, `status`, `createdAt`, `syncedAt`

#### Table: `exchangeRates` - Currency Exchange Rate Cache

```typescript
{
  id: string; // Primary Key - e.g., "BTC-USD"
  from: string; // Source currency code
  to: string; // Target currency code
  rate: number; // Exchange rate
  source: string; // Data source (api | manual | oracle)
  updatedAt: number; // Indexed - Unix timestamp
}
```

**Indexes:** `id`, `updatedAt`

#### Table: `posSessions` - POS Terminal Sessions

```typescript
{
  id: string;           // Primary Key - UUID
  branchId: string;     // Indexed - Branch reference
  staffId: string;      // Indexed - Staff reference
  startedAt: number;    // Indexed - Unix timestamp
  endedAt?: number;
  openingBalance: number;
  closingBalance?: number;
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  lightningSales: number;
  status: "active" | "closed";  // Indexed
}
```

**Indexes:** `id`, `branchId`, `staffId`, `status`, `startedAt`

---

## 🗄️ Hasura PostgreSQL Schema

Relational database for server-side persistence via Hasura GraphQL.

### Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   branches   │     │   products   │     │  categories  │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ name         │◄────│ branch_id    │     │ name         │
│ code         │     │ category_id  │────►│ description  │
│ nostr_pubkey │     │ unit_id      │────►│ created_at   │
│ bolt12_offer │     │ name         │     └──────────────┘
│ address      │     │ sku          │
│ created_at   │     │ price        │     ┌──────────────┐
│ updated_at   │     │ stock        │     │    units     │
└──────────────┘     │ min_stock    │     ├──────────────┤
        │            │ status       │     │ id (PK)      │
        │            │ image        │     │ name         │
        │            │ created_at   │     │ symbol       │
        │            │ updated_at   │     └──────────────┘
        │            └──────────────┘
        │                   │
        │                   │
        ▼                   ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    orders    │     │ order_items  │     │  customers   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │◄────│ order_id     │     │ id (PK)      │
│ branch_id    │     │ product_id   │────►│ name         │
│ customer_id  │────►│ quantity     │     │ nostr_pubkey │
│ total        │     │ price        │     │ email        │
│ total_sats   │     │ total        │     │ phone        │
│ currency     │     │ created_at   │     │ loyalty_tier │
│ status       │     │ updated_at   │     │ points       │
│ payment_method     └──────────────┘     │ created_at   │
│ payment_hash │                          │ updated_at   │
│ notes        │                          └──────────────┘
│ created_at   │
│ updated_at   │           ┌──────────────┐
└──────────────┘           │  inventory   │
        │                  ├──────────────┤
        │                  │ id (PK)      │
        ▼                  │ product_id   │
┌──────────────┐           │ branch_id    │
│  payments    │           │ quantity     │
├──────────────┤           │ movement_type│
│ id (PK)      │           │ reference_id │
│ order_id     │           │ notes        │
│ payment_hash │           │ created_at   │
│ preimage     │           │ created_by   │
│ amount       │           └──────────────┘
│ method       │
│ status       │           ┌──────────────┐
│ is_offline   │           │   receipts   │
│ synced_at    │           ├──────────────┤
│ nostr_event_id           │ id (PK)      │
│ created_at   │           │ order_id     │
└──────────────┘           │ nostr_event_id
                           │ signature    │
                           │ data         │
                           │ created_at   │
                           └──────────────┘
```

### Table Definitions

#### `branches` - Business Locations

```sql
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  nostr_pubkey VARCHAR(64),
  bolt12_offer TEXT,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_branches_code ON branches(code);
CREATE INDEX idx_branches_nostr_pubkey ON branches(nostr_pubkey);
```

#### `categories` - Product Categories

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
```

#### `units` - Measurement Units

```sql
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `products` - Product Catalog

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  unit_id UUID REFERENCES units(id),
  branch_id UUID NOT NULL REFERENCES branches(id),

  -- Pricing
  price DECIMAL(18, 8) NOT NULL,
  price_lak DECIMAL(18, 2),
  price_thb DECIMAL(18, 2),
  price_usd DECIMAL(18, 2),
  price_btc DECIMAL(18, 8),
  price_sats BIGINT,

  -- Inventory
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  track_inventory BOOLEAN DEFAULT true,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),

  -- Media
  image TEXT,
  images JSONB DEFAULT '[]',

  -- AI/Analytics
  upsell_products UUID[] DEFAULT '{}',
  complementary_products UUID[] DEFAULT '{}',
  popularity_score DECIMAL(5, 2) DEFAULT 0,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  attributes JSONB DEFAULT '{}',
  nostr_event_id VARCHAR(64),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_branch ON products(branch_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_name_search ON products USING GIN (to_tsvector('english', name));
```

#### `customers` - Customer CRM

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  nostr_pubkey VARCHAR(64) UNIQUE,
  npub VARCHAR(63),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,

  -- Loyalty
  loyalty_tier VARCHAR(20) DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  loyalty_points INTEGER DEFAULT 0,
  total_spent DECIMAL(18, 2) DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  last_visit TIMESTAMPTZ,

  -- Lightning
  lud16 VARCHAR(255),  -- Lightning address

  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_nostr_pubkey ON customers(nostr_pubkey);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_loyalty_tier ON customers(loyalty_tier);
```

#### `orders` - Sales Orders

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  branch_id UUID NOT NULL REFERENCES branches(id),
  customer_id UUID REFERENCES customers(id),
  staff_id UUID,
  session_id UUID,

  -- Totals
  subtotal DECIMAL(18, 8) NOT NULL,
  tax DECIMAL(18, 8) DEFAULT 0,
  discount DECIMAL(18, 8) DEFAULT 0,
  tip DECIMAL(18, 8) DEFAULT 0,
  total DECIMAL(18, 8) NOT NULL,
  total_sats BIGINT,
  currency VARCHAR(10) DEFAULT 'LAK',

  -- Payment
  payment_method VARCHAR(20) CHECK (payment_method IN ('lightning', 'bolt12', 'lnurl', 'onchain', 'cash', 'qr_static')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'expired', 'refunded', 'offline_pending')),
  payment_hash VARCHAR(64),

  -- Loyalty
  loyalty_points_earned INTEGER DEFAULT 0,
  loyalty_points_redeemed INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  notes TEXT,

  -- Offline Support
  is_offline BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ,

  -- Nostr
  nostr_event_id VARCHAR(64),
  e_receipt_id VARCHAR(64),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_branch ON orders(branch_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_payment_hash ON orders(payment_hash);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

#### `order_items` - Order Line Items

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(18, 8) NOT NULL,
  discount DECIMAL(18, 8) DEFAULT 0,
  total DECIMAL(18, 8) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

#### `payments` - Payment Records

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),

  -- Lightning Details
  payment_hash VARCHAR(64) UNIQUE,
  preimage VARCHAR(64),
  bolt11 TEXT,
  bolt12_offer TEXT,

  -- Amount
  amount BIGINT NOT NULL,  -- in sats
  amount_fiat DECIMAL(18, 2),
  currency VARCHAR(10),

  -- Method & Status
  method VARCHAR(20) NOT NULL CHECK (method IN ('lightning', 'bolt12', 'lnurl', 'onchain', 'cash', 'qr_static')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired', 'refunded')),

  -- Offline Support
  is_offline BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ,

  -- Nostr
  nostr_event_id VARCHAR(64),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  error_message TEXT,

  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_payment_hash ON payments(payment_hash);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);
```

#### `inventory` - Inventory Movements

```sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  branch_id UUID NOT NULL REFERENCES branches(id),

  -- Movement
  quantity INTEGER NOT NULL,  -- Positive = in, Negative = out
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'damage', 'expired')),

  -- Reference
  reference_id UUID,  -- Order ID, Transfer ID, etc.
  reference_type VARCHAR(50),

  -- Balance
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,

  -- Metadata
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_branch ON inventory(branch_id);
CREATE INDEX idx_inventory_movement_type ON inventory(movement_type);
CREATE INDEX idx_inventory_created_at ON inventory(created_at DESC);
```

#### `receipts` - E-Receipts

```sql
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),

  -- Nostr
  nostr_event_id VARCHAR(64) UNIQUE,
  merchant_pubkey VARCHAR(64),
  customer_pubkey VARCHAR(64),

  -- Data
  receipt_data JSONB NOT NULL,
  signature VARCHAR(128),

  -- Delivery
  sent_via VARCHAR(20),  -- nostr_dm, email, print
  sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipts_order ON receipts(order_id);
CREATE INDEX idx_receipts_nostr_event ON receipts(nostr_event_id);
CREATE INDEX idx_receipts_customer ON receipts(customer_pubkey);
```

#### `loyalty_rewards` - Loyalty Zap Rewards

```sql
CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),

  -- Reward
  amount BIGINT NOT NULL,  -- in sats
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('purchase', 'referral', 'loyalty', 'promotion', 'birthday')),

  -- Reference
  order_id UUID REFERENCES orders(id),

  -- Zap
  zap_event_id VARCHAR(64),
  zap_status VARCHAR(20) DEFAULT 'pending' CHECK (zap_status IN ('pending', 'sent', 'claimed', 'failed')),

  -- Metadata
  notes TEXT,
  expires_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_rewards_customer ON loyalty_rewards(customer_id);
CREATE INDEX idx_loyalty_rewards_order ON loyalty_rewards(order_id);
CREATE INDEX idx_loyalty_rewards_status ON loyalty_rewards(zap_status);
```

#### `pos_sessions` - POS Terminal Sessions

```sql
CREATE TABLE pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  staff_id UUID,
  terminal_id VARCHAR(50),

  -- Cash Drawer
  opening_balance DECIMAL(18, 2) NOT NULL,
  closing_balance DECIMAL(18, 2),

  -- Totals
  total_sales DECIMAL(18, 2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  cash_sales DECIMAL(18, 2) DEFAULT 0,
  lightning_sales BIGINT DEFAULT 0,  -- in sats

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'reconciled')),
  notes TEXT,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_pos_sessions_branch ON pos_sessions(branch_id);
CREATE INDEX idx_pos_sessions_staff ON pos_sessions(staff_id);
CREATE INDEX idx_pos_sessions_status ON pos_sessions(status);
CREATE INDEX idx_pos_sessions_started_at ON pos_sessions(started_at DESC);
```

#### `staff` - Staff/Employees

```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  nostr_pubkey VARCHAR(64),

  -- Role
  role VARCHAR(50) DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier', 'staff')),
  branch_id UUID REFERENCES branches(id),

  -- Authentication
  pin_hash VARCHAR(255),  -- Hashed PIN for quick POS login

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_branch ON staff(branch_id);
CREATE INDEX idx_staff_role ON staff(role);
```

#### `suppliers` - Supplier Management (ERP)

```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,

  -- Payment
  payment_terms INTEGER DEFAULT 30,  -- Days
  currency VARCHAR(10) DEFAULT 'LAK',

  -- Lightning
  nostr_pubkey VARCHAR(64),
  lud16 VARCHAR(255),

  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_code ON suppliers(code);
```

#### `purchase_orders` - Purchase Orders (ERP)

```sql
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  branch_id UUID NOT NULL REFERENCES branches(id),

  -- Totals
  subtotal DECIMAL(18, 2) NOT NULL,
  tax DECIMAL(18, 2) DEFAULT 0,
  total DECIMAL(18, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'LAK',

  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled')),

  -- Dates
  order_date DATE,
  expected_date DATE,
  received_date DATE,

  notes TEXT,
  created_by UUID REFERENCES staff(id),
  approved_by UUID REFERENCES staff(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_branch ON purchase_orders(branch_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
```

#### `accounts` - Chart of Accounts (Accounting)

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_id UUID REFERENCES accounts(id),

  -- Balances
  balance DECIMAL(18, 2) DEFAULT 0,
  balance_sats BIGINT DEFAULT 0,

  -- Settings
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,

  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_code ON accounts(code);
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_parent ON accounts(parent_id);
```

#### `journal_entries` - Accounting Journal (Accounting)

```sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,

  -- Reference
  reference_type VARCHAR(50),  -- order, payment, adjustment
  reference_id UUID,

  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'void')),

  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES staff(id),
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
```

#### `journal_lines` - Journal Entry Lines

```sql
CREATE TABLE journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),

  -- Amounts
  debit DECIMAL(18, 2) DEFAULT 0,
  credit DECIMAL(18, 2) DEFAULT 0,

  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journal_lines_entry ON journal_lines(entry_id);
CREATE INDEX idx_journal_lines_account ON journal_lines(account_id);
```

---

## 📡 Nostr Event Schema

Nostr events for decentralized data storage following NIPs.

### Event Kinds Used

| Kind  | NIP    | Description                          |
| ----- | ------ | ------------------------------------ |
| 0     | NIP-01 | Metadata (Merchant Profile)          |
| 1     | NIP-01 | Short Text Note                      |
| 4     | NIP-04 | Encrypted Direct Message (E-Receipt) |
| 9734  | NIP-57 | Zap Request                          |
| 9735  | NIP-57 | Zap Receipt                          |
| 30017 | NIP-15 | Marketplace Stall                    |
| 30018 | NIP-15 | Marketplace Product                  |
| 30019 | Custom | Order Event                          |
| 30020 | Custom | E-Receipt Event                      |
| 30021 | Custom | Inventory Event                      |
| 30022 | Custom | Customer Loyalty Event               |

### Event Structures

#### Kind 0: Merchant Profile

```json
{
  "kind": 0,
  "pubkey": "merchant_hex_pubkey",
  "created_at": 1700000000,
  "tags": [],
  "content": "{\"name\":\"BitSpace Coffee\",\"picture\":\"https://...\",\"nip05\":\"shop@bitspace.la\",\"lud16\":\"shop@getalby.com\",\"about\":\"Lightning-powered coffee shop\",\"business_type\":\"restaurant\",\"bolt12_offer\":\"lno1...\"}"
}
```

#### Kind 30017: Marketplace Stall (Product Catalog)

```json
{
  "kind": 30017,
  "pubkey": "merchant_hex_pubkey",
  "created_at": 1700000000,
  "tags": [
    ["d", "stall_unique_id"],
    ["name", "BitSpace Coffee Shop"],
    ["currency", "LAK"],
    ["shipping", "{\"id\":\"pickup\",\"name\":\"Store Pickup\",\"cost\":0}"]
  ],
  "content": "{\"description\":\"Fresh coffee and pastries\",\"currency\":\"LAK\",\"shipping\":[{\"id\":\"pickup\",\"name\":\"Store Pickup\",\"cost\":0}]}"
}
```

#### Kind 30018: Marketplace Product

```json
{
  "kind": 30018,
  "pubkey": "merchant_hex_pubkey",
  "created_at": 1700000000,
  "tags": [
    ["d", "product_unique_id"],
    ["stall", "stall_unique_id"],
    ["name", "Latte"],
    ["price", "25000"],
    ["currency", "LAK"],
    ["t", "coffee"],
    ["t", "hot-drinks"],
    ["image", "https://..."]
  ],
  "content": "{\"id\":\"prod_123\",\"stall_id\":\"stall_001\",\"name\":\"Latte\",\"description\":\"Fresh brewed latte\",\"images\":[\"https://...\"],\"currency\":\"LAK\",\"price\":25000,\"quantity\":100}"
}
```

#### Kind 30019: Order Event (Custom)

```json
{
  "kind": 30019,
  "pubkey": "merchant_hex_pubkey",
  "created_at": 1700000000,
  "tags": [
    ["d", "order_unique_id"],
    ["p", "customer_pubkey"],
    ["e", "stall_event_id"],
    ["status", "completed"],
    ["payment", "lightning"],
    ["amount", "150000"],
    ["currency", "LAK"],
    ["payment_hash", "abc123..."]
  ],
  "content": "ENCRYPTED:{\"items\":[{\"product_id\":\"prod_123\",\"quantity\":2,\"price\":25000}],\"total\":50000,\"notes\":\"Extra hot\"}"
}
```

#### Kind 30020: E-Receipt Event (Custom)

```json
{
  "kind": 30020,
  "pubkey": "merchant_hex_pubkey",
  "created_at": 1700000000,
  "tags": [
    ["d", "receipt_unique_id"],
    ["e", "order_event_id"],
    ["p", "customer_pubkey"],
    ["payment_hash", "abc123..."],
    ["preimage", "def456..."]
  ],
  "content": "ENCRYPTED:{\"merchant\":{\"name\":\"BitSpace Coffee\",\"address\":\"123 Main St\"},\"items\":[{\"name\":\"Latte\",\"qty\":2,\"price\":25000,\"total\":50000}],\"subtotal\":50000,\"tax\":5000,\"total\":55000,\"payment\":{\"method\":\"lightning\",\"hash\":\"abc123...\",\"preimage\":\"def456...\"}}"
}
```

#### Kind 30022: Customer Loyalty Event (Custom)

```json
{
  "kind": 30022,
  "pubkey": "merchant_hex_pubkey",
  "created_at": 1700000000,
  "tags": [
    ["d", "loyalty_unique_id"],
    ["p", "customer_pubkey"],
    ["tier", "gold"],
    ["points", "1500"],
    ["e", "order_event_id"]
  ],
  "content": "ENCRYPTED:{\"action\":\"points_earned\",\"points\":50,\"balance\":1500,\"tier\":\"gold\",\"order_id\":\"order_123\"}"
}
```

#### Kind 4: E-Receipt DM (NIP-04)

```json
{
  "kind": 4,
  "pubkey": "merchant_hex_pubkey",
  "created_at": 1700000000,
  "tags": [["p", "customer_pubkey"]],
  "content": "NIP-04_ENCRYPTED_RECEIPT_DATA"
}
```

#### Kind 9735: Zap Receipt (Loyalty Reward)

```json
{
  "kind": 9735,
  "pubkey": "lnurl_server_pubkey",
  "created_at": 1700000000,
  "tags": [
    ["p", "customer_pubkey"],
    ["e", "loyalty_event_id"],
    ["bolt11", "lnbc..."],
    ["description", "{\"kind\":9734,...}"],
    ["preimage", "abc123..."]
  ],
  "content": ""
}
```

---

## 🔄 Data Sync Strategy

### Sync Priority Levels

| Priority | Data Type | Sync Frequency | Conflict Resolution |
| -------- | --------- | -------------- | ------------------- |
| Critical | Payments  | Real-time      | Server wins         |
| High     | Orders    | Real-time      | Last-write wins     |
| High     | Inventory | Real-time      | Sum conflicts       |
| Medium   | Products  | 5 min poll     | Last-write wins     |
| Medium   | Customers | 5 min poll     | Merge fields        |
| Low      | Analytics | Hourly         | Server aggregates   |

### Offline Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Offline Transaction                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Save to IndexedDB (localOrders, offlinePayments)        │
│  2. Generate temporary IDs                                   │
│  3. Mark syncStatus = 'pending'                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Network Restored                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Query pendingSync queue                                  │
│  2. For each pending item:                                   │
│     a. Push to Hasura (server-first)                        │
│     b. Publish to Nostr relays                               │
│     c. Update syncStatus = 'synced'                          │
│     d. Update syncedAt timestamp                             │
│  3. Pull latest from server                                  │
│  4. Resolve conflicts (last-write-wins)                      │
└─────────────────────────────────────────────────────────────┘
```

### Real-time Subscriptions (Hasura)

```graphql
subscription OrderUpdates($branchId: uuid!) {
  orders(
    where: { branch_id: { _eq: $branchId } }
    order_by: { created_at: desc }
    limit: 10
  ) {
    id
    order_number
    status
    payment_status
    total
    created_at
  }
}

subscription InventoryAlerts($branchId: uuid!) {
  products(
    where: { branch_id: { _eq: $branchId }, stock: { _lt: min_stock } }
  ) {
    id
    name
    stock
    min_stock
  }
}
```

---

## 🔐 Security Considerations

### Data Encryption

- **IndexedDB:** AES-256-GCM encryption for sensitive fields (content)
- **Nostr:** NIP-04 encryption for DMs, NIP-44 for newer events
- **Hasura:** TLS 1.3 for transport, row-level security (RLS)

### Access Control

```sql
-- Hasura Row Level Security Example
CREATE POLICY branch_isolation ON orders
  USING (branch_id IN (
    SELECT branch_id FROM staff
    WHERE id = current_user_id()
  ));
```

### Key Management

- Nostr private keys: NIP-07 browser extension (Alby, nos2x)
- API keys: Environment variables, rotated quarterly
- Encryption keys: Derived from user password + device salt

---

## 📊 Analytics Views

### Sales Summary View

```sql
CREATE VIEW sales_summary AS
SELECT
  DATE(created_at) as date,
  branch_id,
  COUNT(*) as order_count,
  SUM(total) as total_sales,
  SUM(total_sats) as total_sats,
  AVG(total) as avg_order_value,
  SUM(CASE WHEN payment_method = 'lightning' THEN 1 ELSE 0 END) as lightning_orders,
  SUM(CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END) as cash_orders
FROM orders
WHERE payment_status = 'completed'
GROUP BY DATE(created_at), branch_id;
```

### Product Performance View

```sql
CREATE VIEW product_performance AS
SELECT
  p.id,
  p.name,
  p.category_id,
  COUNT(DISTINCT oi.order_id) as order_count,
  SUM(oi.quantity) as units_sold,
  SUM(oi.total) as revenue,
  AVG(oi.quantity) as avg_quantity_per_order
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = 'completed'
GROUP BY p.id, p.name, p.category_id;
```

### Customer Lifetime Value View

```sql
CREATE VIEW customer_ltv AS
SELECT
  c.id,
  c.name,
  c.loyalty_tier,
  c.loyalty_points,
  COUNT(o.id) as order_count,
  SUM(o.total) as lifetime_value,
  AVG(o.total) as avg_order_value,
  MAX(o.created_at) as last_order,
  MIN(o.created_at) as first_order
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id AND o.payment_status = 'completed'
GROUP BY c.id, c.name, c.loyalty_tier, c.loyalty_points;
```

---

## 🚀 Migration Scripts

### Initial Setup

```sql
-- Run these in order
\i 01_branches.sql
\i 02_categories_units.sql
\i 03_products.sql
\i 04_customers.sql
\i 05_orders.sql
\i 06_payments.sql
\i 07_inventory.sql
\i 08_accounting.sql
\i 09_views.sql
\i 10_seed_data.sql
```

### Hasura Metadata

```yaml
# hasura/metadata/tables.yaml
- table:
    schema: public
    name: orders
  select_permissions:
    - role: user
      permission:
        columns: "*"
        filter:
          branch_id:
            _eq: X-Hasura-Branch-Id
  insert_permissions:
    - role: user
      permission:
        columns: [customer_id, items, total, payment_method]
        check:
          branch_id:
            _eq: X-Hasura-Branch-Id
```

---

> **Note:** This schema is designed for a hybrid architecture. Choose storage based on data sensitivity and sync requirements. Critical financial data should always sync to Hasura first, with Nostr serving as a decentralized backup and customer-facing receipt system.
