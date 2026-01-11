# BNOS User Manual

> **Business Operating System - Lightning-Powered Point of Sale**

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Account Setup](#account-setup)
4. [Shop Configuration](#shop-configuration)
5. [Product Management](#product-management)
6. [Point of Sale](#point-of-sale)
7. [Payments](#payments)
8. [Inventory Management](#inventory-management)
9. [Reports & Analytics](#reports--analytics)
10. [Settings](#settings)
11. [FAQ](#faq)
12. [Support](#support)

---

## Introduction

**BNOS (Business Operating System)** is a next-generation Point of Sale system built on decentralized technologies. Powered by the Lightning Network for instant Bitcoin payments and the Nostr Protocol for secure, censorship-resistant data management.

### Key Features

| Feature                   | Description                                  |
| ------------------------- | -------------------------------------------- |
| ⚡ **Lightning Payments** | Instant Bitcoin payments with near-zero fees |
| 🔐 **Non-Custodial**      | You control your keys and funds              |
| 🌐 **Decentralized**      | Built on Nostr Protocol - no central servers |
| 📱 **Offline First**      | Works without internet, syncs when online    |
| 📊 **Analytics**          | Real-time business insights                  |
| 👥 **Team Management**    | Multi-user with role-based access            |

---

## Getting Started

### System Requirements

- **Browser**: Chrome, Firefox, Safari, or Edge (latest version)
- **Internet**: Required for initial setup and syncing
- **Device**: Desktop, laptop, tablet, or smartphone

### Quick Start

1. Visit [bnos.space](https://bnos.space)
2. Click **"Get Started"**
3. Create or import your Nostr keys
4. Configure your shop
5. Start selling!

---

## Account Setup

### Creating a New Account

1. Click **"Create New Account"**
2. Your private key (nsec) will be generated automatically
3. **🔴 IMPORTANT: Save your private key securely!**
   - Write it down on paper
   - Store it in a password manager
   - Never share it with anyone
4. Complete your profile (optional)

### Importing Existing Keys

If you already have Nostr keys:

1. Click **"Import Keys"**
2. Enter your private key (nsec) or use a browser extension (nos2x, Alby)
3. Your account will be restored

### Security Best Practices

> ⚠️ **Warning**: Your private key is the only way to access your account. If lost, your data cannot be recovered.

- ✅ Store private key in multiple secure locations
- ✅ Use a hardware security key when possible
- ✅ Enable browser extension for key management
- ❌ Never share your private key
- ❌ Never store keys in plain text files

---

## Shop Configuration

### Initial Setup

After creating your account, you'll be guided through shop setup:

#### Step 1: Shop Type

Select your business type:

- 🛒 **Retail** - Physical goods
- 🍽️ **Restaurant** - Food & beverages
- 💈 **Service** - Service-based business
- 🏪 **General** - Multi-purpose

#### Step 2: Shop Details

| Field       | Description                               | Required |
| ----------- | ----------------------------------------- | -------- |
| Shop Name   | Your business name                        | ✅       |
| Description | Brief description of your business        |          |
| Logo        | Upload your logo (recommended: 512x512px) |          |
| Currency    | Primary display currency                  | ✅       |
| Tax Rate    | Default tax percentage                    |          |

#### Step 3: Payment Setup

Configure your Lightning wallet:

1. **Connect Lightning Wallet**

   - Enter your Lightning Address (e.g., `shop@getalby.com`)
   - Or connect via LNUrl

2. **Test Connection**
   - Click "Test Payment" to verify setup
   - A small test invoice will be generated

---

## Product Management

### Adding Products

1. Navigate to **Products** from the menu
2. Click **"+ Add Product"**
3. Fill in product details:

| Field       | Description                                  |
| ----------- | -------------------------------------------- |
| Name        | Product name                                 |
| SKU         | Stock Keeping Unit (auto-generated if blank) |
| Price       | Selling price                                |
| Cost        | Purchase cost (for profit calculation)       |
| Category    | Product category                             |
| Description | Product details                              |
| Image       | Product photo                                |
| Inventory   | Enable stock tracking                        |

### Product Variants

For products with multiple options (size, color):

1. Enable **"Has Variants"** toggle
2. Add variant options:
   ```
   Size: Small, Medium, Large
   Color: Red, Blue, Green
   ```
3. Set individual prices and stock for each variant

### Categories

Organize products with categories:

1. Go to **Products > Categories**
2. Click **"+ Add Category"**
3. Enter category name and optional icon
4. Drag products to reorder

### Bulk Import

Import multiple products via CSV:

1. Download template: **Products > Import > Download Template**
2. Fill in the CSV file
3. Upload: **Products > Import > Upload CSV**

---

## Point of Sale

### Making a Sale

1. Open **POS** from the main menu
2. Add products to cart:
   - Search by name or scan barcode
   - Click product tile
   - Adjust quantity with +/- buttons
3. Review cart
4. Click **"Charge"** or **"Pay"**

### Payment Methods

| Method       | Description                      |
| ------------ | -------------------------------- |
| ⚡ Lightning | Scan QR code for instant payment |
| 💵 Cash      | Enter amount received            |
| 💳 Card      | External terminal integration    |
| 📝 Credit    | Record payment on account        |

### Discounts

Apply discounts during checkout:

1. Click **"Discount"** in cart
2. Choose type:
   - **Percentage**: 10%, 20%, etc.
   - **Fixed Amount**: $5, $10, etc.
3. Apply to entire cart or single item

### Receipts

After payment:

1. **Print** - Send to connected printer
2. **Email** - Send to customer email
3. **Copy Link** - Share receipt link
4. **Download** - Save as PDF

---

## Payments

### Lightning Network

BNOS uses the Lightning Network for instant Bitcoin payments:

1. Customer scans QR code
2. Payment confirms in ~1 second
3. Funds arrive in your wallet immediately

### Wallet Management

View your payment history:

1. Go to **Payments** from menu
2. See all transactions with:
   - Amount
   - Time
   - Status
   - Invoice details

### Withdrawals

Funds are deposited directly to your connected Lightning wallet. No withdrawal action needed - you already control the funds!

---

## Inventory Management

### Stock Tracking

Enable inventory tracking per product:

1. Edit product
2. Enable **"Track Inventory"**
3. Set **"Stock Quantity"**

### Low Stock Alerts

Configure alerts for low inventory:

1. Go to **Settings > Inventory**
2. Set **"Low Stock Threshold"** (e.g., 10 units)
3. Enable notifications

### Stock Adjustments

Manually adjust stock:

1. Go to **Inventory**
2. Click on product
3. Click **"Adjust Stock"**
4. Enter quantity and reason:
   - Received shipment
   - Damaged goods
   - Stock count correction
   - Other

### Purchase Orders

Create orders for suppliers:

1. Go to **Inventory > Purchase Orders**
2. Click **"+ New Order"**
3. Select supplier
4. Add products and quantities
5. Submit order

---

## Reports & Analytics

### Dashboard

The main dashboard shows:

- 📈 Today's sales
- 💰 Revenue trends
- 🛒 Recent transactions
- 📦 Low stock alerts
- 👥 Top customers

### Available Reports

| Report                  | Description                      |
| ----------------------- | -------------------------------- |
| **Sales Report**        | Sales by date, product, category |
| **Product Performance** | Best/worst sellers               |
| **Inventory Report**    | Stock levels, valuations         |
| **Customer Report**     | Purchase history, loyalty        |
| **Staff Report**        | Sales by employee                |

### Exporting Data

Export any report:

1. Open desired report
2. Click **"Export"**
3. Choose format:
   - 📄 PDF
   - 📊 Excel (XLSX)
   - 📋 CSV

---

## Settings

### General Settings

| Setting     | Description         |
| ----------- | ------------------- |
| Language    | Interface language  |
| Currency    | Display currency    |
| Timezone    | Local timezone      |
| Date Format | Date display format |

### Receipt Settings

Customize receipts:

- Header text
- Footer text
- Logo
- Show/hide tax details
- QR code for returns

### Notification Settings

Configure alerts:

- Low stock notifications
- Daily sales summary
- Payment alerts

### Security Settings

- Change password
- View login history
- Connected devices
- API keys

---

## FAQ

### General

**Q: Is BNOS free to use?**

> A: BNOS offers a free tier with basic features. Premium features are available through subscription.

**Q: Do I need Bitcoin to use BNOS?**

> A: You can accept Lightning payments without holding Bitcoin yourself. Payments can be converted to your preferred currency.

### Technical

**Q: What happens if I lose internet?**

> A: BNOS works offline. Transactions are saved locally and synced when you're back online.

**Q: How secure is my data?**

> A: Your data is encrypted and stored using the Nostr Protocol. Only you can access it with your private key.

**Q: Can I use BNOS on multiple devices?**

> A: Yes! Log in with your Nostr keys on any device to access your shop.

### Payments

**Q: How fast are Lightning payments?**

> A: Lightning payments confirm in ~1 second.

**Q: What are the payment fees?**

> A: Lightning Network fees are typically less than 1% (often just a few sats).

---

## Support

### Getting Help

- 📖 **Documentation**: [docs.bnos.space](https://docs.bnos.space)
- 💬 **Community**: Join our Nostr community
- 📧 **Email**: support@bnos.space
- 🐛 **Bug Reports**: [github.com/locobit-space/bitspace-pos/issues](https://github.com/locobit-space/bitspace-pos/issues)

### Feature Requests

Have an idea? We'd love to hear it!

1. Go to **Help > Feature Request**
2. Describe your idea
3. Submit

### Reporting Issues

If you encounter a problem:

1. Go to **Help > Report a Bug**
2. Describe the issue
3. Include screenshots if possible
4. Submit

---

## Version History

| Version | Date        | Notes           |
| ------- | ----------- | --------------- |
| 1.0.0   | Jan 1, 2026 | Initial release |

---

<p align="center">
  <strong>⚡ BNOS - Business Operating System</strong><br>
  Built with ❤️ on Nostr & Lightning Network<br>
  <a href="https://github.com/locobit-space">GitHub</a> •
  <a href="https://bnos.space">Website</a>
</p>
