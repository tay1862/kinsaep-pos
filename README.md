# ⚡ BNOS - Business OS

> **Lightning-Powered Point of Sale System & Business OS**  
> Built on Nostr Protocol | Decentralized | Sovereign | Offline-First

![BNOS](https://img.shields.io/badge/Nuxt-4.2-00DC82?style=flat&logo=nuxt.js)
![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?style=flat&logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat&logo=typescript)
![Nostr](https://img.shields.io/badge/Nostr-Protocol-8B5CF6?style=flat)
![Lightning](https://img.shields.io/badge/Bitcoin-Lightning-F7931A?style=flat&logo=bitcoin)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat)

---

## 🌟 Overview

**BNOS** is a modern, decentralized Point of Sale (POS) system designed for sovereign businesses. Built on the **Nostr protocol** for data storage and **Bitcoin Lightning Network** for instant payments, it provides a privacy-focused alternative to traditional POS systems.

### Why BNOS?

- 🔐 **Data Sovereignty** - Your data stays on Nostr relays you control
- ⚡ **Instant Payments** - Accept Bitcoin via Lightning Network
- 📴 **Offline-First** - Works without internet using local storage & sync
- 🌍 **Decentralized** - No central server, no vendor lock-in
- 💰 **Zero Fees** - No monthly subscriptions or transaction fees
- 🔒 **End-to-End Encrypted** - NIP-04/44 encryption for sensitive data

---

## ✨ Features

### 🏪 Point of Sale

- **Product Grid** - Visual product selection with categories
- **Cart Management** - Add, remove, adjust quantities
- **Multiple Order Types** - Dine-in, takeout, delivery
- **Table Management** - Assign orders to tables
- **QR Code Ordering** - Customer self-ordering via QR scan
- **Multi-currency** - LAK, USD, THB, BTC, SATS

### 💳 Payment Processing

- **Cash Payments** - With change calculation
- **Bitcoin Lightning** - LNbits, Alby Hub, NWC, Blink
- **QR Payments** - Local bank QR codes (BCEL, LDB, etc.)
- **Split Payments** - Combine multiple payment methods

### 🧾 Orders & Kitchen

- **Order Queue** - Real-time kitchen display
- **Status Tracking** - Pending → Cooking → Ready → Served
- **Receipt Printing** - Thermal printer support
- **Order History** - Complete transaction logs

### 📦 Inventory Management

- **Stock Tracking** - Real-time inventory levels
- **Low Stock Alerts** - Automatic notifications
- **Purchase Orders** - Supplier management
- **Batch/Lot Tracking** - FIFO/LIFO inventory
- **Stock Adjustments** - Manual corrections with audit trail
- **Cycle Counts** - Physical inventory verification

### 🍳 Recipes & Ingredients

- **Recipe Builder** - Create recipes with ingredients
- **Cost Calculation** - Automatic food cost tracking
- **Ingredient Stock** - Auto-deduct on sale
- **Portion Control** - Standardized portions

### 👥 Customer Management

- **Customer Profiles** - Contact info, preferences
- **Order History** - Past purchases per customer
- **VIP Status** - Special customer designation
- **Loyalty Points** - Reward programs

### 💼 Memberships

- **Subscription Plans** - Day, monthly, yearly
- **Check-in System** - Quick member validation
- **Expiry Tracking** - Renewal notifications
- **Access Control** - Member-only features

### 📊 Reporting & Analytics

- **Sales Reports** - Daily, weekly, monthly
- **Product Performance** - Top sellers
- **AI Insights** - Smart business analytics
- **Export to Excel** - Data export

### 🏢 Multi-Business Types

Support for various business templates:

- 🍽️ Restaurant/Café
- 🎤 Karaoke/Entertainment
- 🏋️ Gym/Fitness
- 🔧 Auto Garage
- 🛒 Retail Store

---

## 🛠️ Tech Stack

| Technology       | Purpose                       |
| ---------------- | ----------------------------- |
| **Nuxt 4**       | Vue.js meta-framework         |
| **Vue 3.5**      | Reactive UI framework         |
| **TypeScript**   | Type-safe JavaScript          |
| **Nuxt UI v4**   | UI component library          |
| **Nostr**        | Decentralized data protocol   |
| **nostr-tools**  | Nostr client library          |
| **Dexie.js**     | IndexedDB wrapper for offline |
| **ECharts**      | Data visualization            |
| **Pinia**        | State management              |
| **@nuxtjs/i18n** | Internationalization          |
| **Vite PWA**     | Progressive Web App           |
| **Zod**          | Schema validation             |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **Yarn** (recommended) or npm
- A Nostr key pair (generated on first run)

### Installation

```bash
# Clone the repository
git clone https://github.com/bitspace/bitspace-pos.git
cd bitspace-pos

# Install dependencies
yarn install

# Start development server
yarn dev
```

The app will be running at `http://localhost:3002`

### Build for Production

```bash
# Build the application
yarn build

# Preview production build
yarn preview
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Cloudinary (optional - for image uploads)
NUXT_CLOUDINARY_CLOUD_NAME=your_cloud_name

# Custom relays (optional)
NUXT_PUBLIC_NOSTR_RELAYS=wss://relay.example.com,wss://relay2.example.com
```

### Lightning Wallet Setup

BNOS supports multiple Lightning backends:

| Provider              | Configuration                                   |
| --------------------- | ----------------------------------------------- |
| **LNbits**            | Node URL + Admin/Invoice Key                    |
| **Alby Hub**          | Access Token                                    |
| **NWC**               | Connection String (`nostr+walletconnect://...`) |
| **Blink**             | API Key + Wallet ID                             |
| **Lightning Address** | `name@domain.com`                               |

Configure in: **Settings → Lightning**

### Nostr Relay Configuration

Default relays are configured in `use-nostr-relay.ts`:

```typescript
const DEFAULT_RELAYS = [
  "wss://relay.bnos.space",
  "wss://relay.damus.io",
  "wss://nos.lol",
  // ...
];
```

Add/remove relays in: **Settings → Relays**

---

## 🌐 Internationalization

Currently supported languages:

| Language   | Code    | Status      |
| ---------- | ------- | ----------- |
| 🇱🇦 Lao     | `lo-LA` | ✅ Complete |
| 🇺🇸 English | `en-US` | ✅ Complete |

Language files are located in: `/i18n/locales/`

---

## 📁 Project Structure

```
bitspace-pos/
├── app/
│   ├── assets/          # CSS, images
│   ├── components/      # Vue components
│   ├── composables/     # Vue composables (56 modules)
│   ├── layouts/         # Page layouts
│   ├── middleware/      # Route middleware
│   ├── pages/           # Route pages
│   ├── plugins/         # Nuxt plugins
│   └── types/           # TypeScript types
├── docs/                # Documentation
├── i18n/
│   └── locales/         # Translation files
├── public/              # Static assets
├── server/              # Server routes (API)
├── tests/               # Unit & E2E tests
└── nuxt.config.ts       # Nuxt configuration
```

### Key Composables

| Composable        | Purpose                            |
| ----------------- | ---------------------------------- |
| `use-nostr-data`  | Nostr data storage with encryption |
| `use-nostr-relay` | Relay connection management        |
| `use-lightning`   | Lightning payment integration      |
| `use-products`    | Product CRUD operations            |
| `use-orders`      | Order management                   |
| `use-inventory`   | Inventory tracking                 |
| `use-customers`   | Customer management                |
| `use-pos`         | POS cart & checkout                |
| `use-auth`        | Authentication                     |
| `use-encryption`  | NIP-04/44 encryption               |

---

## 🧪 Testing

```bash
# Run unit tests
yarn test:unit

# Run E2E tests
yarn test:e2e

# Run all tests
yarn test
```

---

## 📱 PWA & Offline Support

bnos.space is a **Progressive Web App** with full offline support:

- ✅ Installable on mobile/desktop
- ✅ Works without internet
- ✅ Background sync when online
- ✅ Push notifications (planned)

### Install as App

1. Open in Chrome/Safari
2. Click "Install" or "Add to Home Screen"
3. Launch from your device

---

## 🔐 Security

### Data Encryption

- **NIP-44** encryption for sensitive data
- **Company Code** encryption for cross-device sync
- All data encrypted before publishing to relays

### Authentication

- **Nostr Keys** - Cryptographic authentication
- **NIP-07 Extensions** - Alby, nos2x, Nostr Connect
- **Staff PIN** - Quick cashier login
- **Password Auth** - Traditional option

---

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Nostr Protocol](https://nostr.com) - Decentralized social protocol
- [Bitcoin Lightning](https://lightning.network) - Instant Bitcoin payments
- [Nuxt](https://nuxt.com) - The Intuitive Vue Framework
- [Nuxt UI](https://ui.nuxt.com) - Beautiful UI Components

---

## 📞 Support

- 💬 Nostr: [Nostr bnos.space](https://yakihonne.com/profile/bnos@nostrcheck.me)
- ⚡ Lightning: `bnos@blink.sv`
- 📧 Discord: [Discord Server](https://discord.gg/aNwEQQF3w8)

---

<p align="center">
  <strong>Built with ⚡ by the BitSpace Team</strong>
  <br>
  <em>Sovereign Business. Decentralized Future.</em>
</p>
