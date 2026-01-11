# Marketplace Integration Guide

**Version:** 1.0  
**Last Updated:** 2026-01-03

## Overview

Bitspace POS supports decentralized marketplace integration using Nostr protocol. This enables:

- **Store Discovery**: Publicly list your store for customers to find
- **Cross-Store Commerce**: Connect with other stores (suppliers, partners)
- **Customer Reviews**: Receive verified reviews from customers
- **Lightning Payments**: Accept Bitcoin/Lightning payments directly

---

## Pubkey Hierarchy

Each entity in the system has its own Nostr identity (pubkey):

```
┌──────────────────────────────────────────────────────────────┐
│  ร้าน (Store)   → Owner's main npub (Kind: 30078, 30079)     │
│       │                                                       │
│       ├── สาขา (Branch)  → Derived/separate pubkey (30600)   │
│       │       │                                               │
│       │       └── พนักงาน (Staff) → Individual npub (30500)  │
│       │                                                       │
│       └── ลูกค้า (Customer) → Customer npub (30300)          │
└──────────────────────────────────────────────────────────────┘
```

| Entity           | Thai    | Event Kind | Pubkey Type              |
| ---------------- | ------- | ---------- | ------------------------ |
| Store (Settings) | ร้าน    | `30078`    | Owner's main npub        |
| Store (Profile)  | ร้าน    | `30079`    | Owner's main npub        |
| Branch           | สาขา    | `30600`    | Derived or separate npub |
| Staff            | พนักงาน | `30500`    | Individual staff npub    |
| Customer         | ลูกค้า  | `30300`    | Customer's npub          |

---

## Event Kinds

### Store Profile (Kind: 30079)

Public store information for marketplace discovery.

```json
{
  "kind": 30079,
  "content": "{
    \"name\": \"ร้านกาแฟ ABC\",
    \"description\": \"Best coffee in Vientiane\",
    \"shopType\": \"cafe\",
    \"acceptsLightning\": true,
    \"services\": [\"dine-in\", \"takeaway\"]
  }",
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

### Marketplace Listing (Kind: 30950)

Store listing on decentralized marketplace.

```json
{
  "kind": 30950,
  "content": "{...marketplace listing data...}",
  "tags": [
    ["d", "marketplace_listing"],
    ["category", "food-beverage"],
    ["location", "vientiane"]
  ]
}
```

### Store Connection (Kind: 30951)

Store-to-store partnerships.

```json
{
  "kind": 30951,
  "content": "{\"type\": \"partner\", \"note\": \"Supplier relationship\"}",
  "tags": [
    ["d", "connection_id"],
    ["p", "target_store_pubkey"]
  ]
}
```

### Customer Review (Kind: 30952)

Verified customer reviews.

```json
{
  "kind": 30952,
  "content": "{\"rating\": 5, \"comment\": \"Great coffee!\"}",
  "tags": [
    ["d", "review_id"],
    ["p", "store_pubkey"],
    ["e", "order_event_id"]
  ]
}
```

---

## Usage

### Publishing to Marketplace

```typescript
import { useShop } from "~/composables/use-shop";

const shop = useShop();

// Publish your store
await shop.publishToMarketplace();

// Check if listed
console.log(shop.isMarketplaceListed.value); // true

// Remove from marketplace
await shop.unpublishFromMarketplace();
```

### ShopConfig Fields

| Field              | Type            | Description                                  |
| ------------------ | --------------- | -------------------------------------------- |
| `nip05`            | `string`        | Nostr verification (e.g., "shop@bnos.space") |
| `lud16`            | `string`        | Lightning address for payments               |
| `geolocation`      | `Geolocation`   | Store location for map discovery             |
| `businessHours`    | `BusinessHours` | Operating hours                              |
| `services`         | `string[]`      | Services offered (dine-in, delivery, etc.)   |
| `paymentMethods`   | `string[]`      | Accepted payment methods                     |
| `acceptsLightning` | `boolean`       | Accepts Lightning payments                   |
| `acceptsBitcoin`   | `boolean`       | Accepts on-chain Bitcoin                     |
| `isListed`         | `boolean`       | Visible in marketplace                       |

---

## Type Definitions

### Geolocation

```typescript
interface Geolocation {
  lat: number;
  lng: number;
  geohash?: string; // For proximity search (NIP-52)
  address?: string;
  city?: string;
  country?: string;
}
```

### BusinessHours

```typescript
interface BusinessHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  // ... other days
  timezone: string;
  holidays?: string[];
}
```

### MarketplaceProfile

```typescript
interface MarketplaceProfile {
  pubkey: string;
  nip05?: string;
  lud16?: string;
  name: string;
  description?: string;
  shopType: ShopType;
  geolocation?: Geolocation;
  businessHours?: BusinessHours;
  acceptsLightning: boolean;
  acceptsBitcoin: boolean;
  isListed: boolean;
  // ... more fields
}
```

---

## Best Practices

1. **Always set `nip05`** for verified store identity
2. **Include `lud16`** for Lightning payment discovery
3. **Set accurate `geolocation`** for map-based discovery
4. **Keep `businessHours`** updated for customer convenience
5. **Use descriptive `tags`** for better search visibility

---

## Migration from Private to Public

Stores can switch between private and public modes:

```typescript
// Go public
await shop.saveShopConfig({
  visibility: "public",
  isListed: true,
  marketplaceDescription: "Your public description",
  geolocation: { lat: 17.9757, lng: 102.6331 },
});

// Go private
await shop.saveShopConfig({
  visibility: "private",
  isListed: false,
});
```

---

## References

- [NIP-05: DNS-Based Verification](https://github.com/nostr-protocol/nips/blob/master/05.md)
- [NIP-52: Calendar Events (Geospatial)](https://github.com/nostr-protocol/nips/blob/master/52.md)
- [NIP-57: Lightning Zaps](https://github.com/nostr-protocol/nips/blob/master/57.md)
- [Internal: nostr-kinds.ts](./nostr-data-standards.md)

---

**Maintainers:** Bitspace POS Development Team
