# bnos.space - Features Documentation

> **Last Updated:** 2023-12-23  
> **Version:** 1.0.0

---

## Feature Status Legend

| Status         | Meaning                                     |
| -------------- | ------------------------------------------- |
| ✅ Production  | Fully tested, ready for production use      |
| 🔧 Beta        | Functional but may have minor issues        |
| 🚧 Development | In progress, not recommended for production |
| 📋 Planned     | Not yet implemented                         |

---

## Core Features

### ⚡ Point of Sale (POS)

| Status | Feature            | Description                             |
| ------ | ------------------ | --------------------------------------- |
| ✅     | Product Grid       | Browse products by category with images |
| ✅     | Cart Management    | Add, remove, adjust quantities          |
| ✅     | Order Types        | Dine-in, takeout, delivery              |
| ✅     | Table Selection    | For dine-in orders                      |
| ✅     | Customer Selection | Link orders to customers                |
| ✅     | Payment Methods    | Cash, QR, Lightning, card               |
| ✅     | Receipt Printing   | Print thermal receipts                  |
| ✅     | Discounts          | Order-level discounts                   |

### 📦 Products

| Status | Feature               | Description                         |
| ------ | --------------------- | ----------------------------------- |
| ✅     | Product CRUD          | Create, edit, delete products       |
| ✅     | Categories            | Organize products by category       |
| ✅     | Variants              | Size, color, modifiers              |
| ✅     | Pricing               | Multiple currencies (LAK, USD, THB) |
| ✅     | Images                | Product photos                      |
| ✅     | Barcode/SKU           | Product identification              |
| 🔧     | Public Product Lookup | Search Open Food Facts API          |

### 🧾 Orders

| Status | Feature        | Description                  |
| ------ | -------------- | ---------------------------- |
| ✅     | Order List     | View all orders with filters |
| ✅     | Order Detail   | View full order information  |
| ✅     | Status Updates | Pending → Completed → Paid   |
| ✅     | Kitchen Status | Track cooking progress       |
| ✅     | Print Invoice  | Generate printable bills     |
| ✅     | Order History  | Timeline of order changes    |

### 👥 Customers

| Status | Feature        | Description                    |
| ------ | -------------- | ------------------------------ |
| ✅     | Customer CRUD  | Create, edit, delete customers |
| ✅     | Contact Info   | Phone, email, address          |
| ✅     | Order History  | View customer's past orders    |
| ✅     | VIP Status     | Special customer designation   |
| 📋     | Loyalty Points | Reward system                  |

---

## Shop Type Features

### 🏋️ Gym & Fitness (`gym`)

| Status | Feature       | Description               |
| ------ | ------------- | ------------------------- |
| 🔧     | Memberships   | Subscription management   |
| 🔧     | Check-in      | Member check-in system    |
| 🔧     | Plans         | Day pass, monthly, yearly |
| 📋     | Class Booking | Schedule fitness classes  |

### 🎤 Karaoke (`karaoke`)

| Status | Feature            | Description                     |
| ------ | ------------------ | ------------------------------- |
| ✅     | Room Products      | Hourly room rates               |
| ✅     | Packages           | Happy hour bundles              |
| 🔧     | Time-Based Billing | Auto-calculate room charges     |
| 🔧     | Live Cost Display  | Show running cost on room cards |

### 🔧 Garage (`garage`)

| Status | Feature           | Description                  |
| ------ | ----------------- | ---------------------------- |
| ✅     | Repair Services   | Engine, brake, tire repair   |
| ✅     | Parts Catalog     | Oil, filters, batteries      |
| ✅     | Discount Packages | Service bundles with savings |
| 📋     | Job Tracking      | Track repair progress        |

---

## Advanced Features

### 🍳 Kitchen Display

| Status | Feature         | Description                   |
| ------ | --------------- | ----------------------------- |
| ✅     | Order Queue     | View pending orders           |
| ✅     | Status Updates  | Mark items as cooking/ready   |
| ✅     | Priority Alerts | Highlight urgent orders       |
| 📋     | Multi-station   | Separate displays per station |

### 📖 Recipes & Ingredients

| Status | Feature           | Description                     |
| ------ | ----------------- | ------------------------------- |
| 🔧     | Recipe Management | Create recipes with ingredients |
| 🔧     | Cost Calculation  | Auto-calculate food cost        |
| 🔧     | Ingredient Stock  | Track ingredient levels         |

### 📦 Inventory

| Status | Feature           | Description            |
| ------ | ----------------- | ---------------------- |
| ✅     | Stock Levels      | View current stock     |
| ✅     | Low Stock Alerts  | Notifications when low |
| 🔧     | Stock Adjustments | Manual corrections     |
| 📋     | Purchase Orders   | Order from suppliers   |

### 💳 Memberships

| Status | Feature         | Description                    |
| ------ | --------------- | ------------------------------ |
| 🔧     | Member List     | View all members               |
| 🔧     | Plans           | Day, monthly, yearly options   |
| 🔧     | Check-in        | Quick member check-in          |
| 🔧     | Expiry Tracking | Alert for expiring members     |
| 📋     | Auto-renewal    | Automatic subscription renewal |

### ⚙️ Feature Toggle System

| Status | Feature            | Description                     |
| ------ | ------------------ | ------------------------------- |
| 🔧     | Enable/Disable     | Turn features on/off            |
| 🔧     | Shop Type Defaults | Auto-configure by business type |
| 🔧     | Dynamic Navigation | Hide disabled features          |

---

## Settings & Configuration

### 🏪 Shop Settings

| Status | Feature          | Description                 |
| ------ | ---------------- | --------------------------- |
| ✅     | General Settings | Name, address, logo         |
| ✅     | Tax Settings     | Tax rate configuration      |
| ✅     | Currency         | LAK, USD, THB, BTC, SATS    |
| 🔧     | Shop Type        | Cafe, restaurant, gym, etc. |
| 🔧     | Feature Toggles  | Enable/disable modules      |

### ⚡ Lightning Settings

| Status | Feature              | Description               |
| ------ | -------------------- | ------------------------- |
| ✅     | Node Connection      | Connect to Lightning node |
| ✅     | Invoice Generation   | Create payment invoices   |
| 🔧     | Payment Verification | Confirm payments          |

### 🔐 Security

| Status | Feature          | Description                   |
| ------ | ---------------- | ----------------------------- |
| ✅     | PIN Login        | Staff PIN authentication      |
| ✅     | Nostr Login      | Cryptographic auth            |
| 📋     | Role Permissions | Admin, cashier, kitchen roles |

---

## Internationalization (i18n)

| Language        | Status | Notes    |
| --------------- | ------ | -------- |
| English (en-US) | ✅     | Complete |
| Lao (lo-LA)     | ✅     | Complete |
| Thai (th-TH)    | 📋     | Planned  |

---

## Recent Additions (December 2023)

| Date       | Feature                   | Status        |
| ---------- | ------------------------- | ------------- |
| 2023-12-23 | Gym Shop Template         | 🔧 Beta       |
| 2023-12-23 | Karaoke Shop Template     | ✅ Production |
| 2023-12-23 | Garage Shop Template      | ✅ Production |
| 2023-12-23 | Membership System         | 🔧 Beta       |
| 2023-12-23 | Feature Toggle System     | 🔧 Beta       |
| 2023-12-23 | Public Product Lookup     | 🔧 Beta       |
| 2023-12-23 | Order Print Dark Mode Fix | ✅ Production |

---

## Notes for Developers

When adding new features:

1. Add entry to this documentation
2. Set appropriate status (🚧 Development initially)
3. Update status when feature is tested
4. Include Lao translations
