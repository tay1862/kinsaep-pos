# Marketplace Profile Implementation Guide

**Version:** 1.0
**Last Updated:** 2026-01-03

## Overview

This guide shows how to implement the three-tier marketplace profile system using:
- **STORE_PROFILE (30079)**: Basic identity - rare updates
- **MARKETPLACE_LISTING (30950)**: Dynamic data - frequent updates
- **PUBLIC_STORE_PROFILE (30954)**: Extended info - occasional updates

---

## Complete Implementation

### 1. Type Definitions

```typescript
// app/types/marketplace.ts
import type { NostrEvent } from "nostr-tools";

/**
 * Basic store identity (Kind 30079)
 * Published ONCE during setup, rarely updated
 */
export interface StoreProfile {
  name: string;
  description?: string;
  shopType: ShopType;
  nip05?: string;
  lud16?: string;
  acceptsLightning: boolean;
  acceptsBitcoin: boolean;
}

/**
 * Dynamic marketplace listing (Kind 30950)
 * Updated FREQUENTLY (hourly/daily)
 */
export interface MarketplaceListing {
  isOpen: boolean;
  currentWaitTime?: number;
  specialOffers?: string[];
  featuredProducts?: string[];
  lastUpdated: number;
  tags: string[];
}

/**
 * Extended store information (Kind 30954)
 * Updated OCCASIONALLY (weekly/monthly)
 */
export interface PublicStoreProfile {
  geolocation?: Geolocation;
  businessHours?: BusinessHours;
  services?: string[];
  paymentMethods?: string[];
  photos?: string[];
  social?: {
    website?: string;
    facebook?: string;
    instagram?: string;
  };
}

export type ShopType =
  | "cafe"
  | "restaurant"
  | "retail"
  | "grocery"
  | "service"
  | "other";

export interface Geolocation {
  lat: number;
  lng: number;
  geohash?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface BusinessHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
  timezone: string;
  holidays?: string[];
}
```

---

### 2. Composable Implementation

```typescript
// app/composables/use-marketplace-profile.ts
import { NOSTR_KINDS } from "~/types/nostr-kinds";
import type {
  StoreProfile,
  MarketplaceListing,
  PublicStoreProfile,
} from "~/types/marketplace";
import { usePool } from "./use-pool";
import { useAuth } from "./use-auth";

export function useMarketplaceProfile() {
  const pool = usePool();
  const auth = useAuth();

  // ============================================
  // 1️⃣ STORE_PROFILE (30079) - Basic Identity
  // ============================================
  /**
   * Publish basic store identity
   * Call this ONCE during initial setup
   * Only update when fundamental details change (name, type, payment methods)
   */
  async function publishStoreProfile(profile: StoreProfile) {
    const event = await pool.publish({
      kind: NOSTR_KINDS.STORE_PROFILE,
      content: JSON.stringify(profile),
      tags: [
        ["d", "store_profile"],
        ["name", profile.name],
        ["shop_type", profile.shopType],
        ...(profile.nip05 ? [["nip05", profile.nip05]] : []),
        ...(profile.lud16 ? [["lud16", profile.lud16]] : []),
        ...(profile.acceptsLightning ? [["t", "bitcoin-accepted"]] : []),
      ],
    });

    console.log("✅ Store profile published:", event.id);
    return event;
  }

  /**
   * Fetch store profile
   */
  async function fetchStoreProfile(pubkey: string): Promise<StoreProfile | null> {
    const events = await pool.querySync({
      kinds: [NOSTR_KINDS.STORE_PROFILE],
      authors: [pubkey],
      "#d": ["store_profile"],
      limit: 1,
    });

    if (events.length === 0) return null;
    return JSON.parse(events[0].content) as StoreProfile;
  }

  // ============================================
  // 2️⃣ MARKETPLACE_LISTING (30950) - Dynamic Data
  // ============================================
  /**
   * Publish marketplace listing
   * Call this FREQUENTLY (hourly, when status changes, new offers)
   * Updates store availability, wait times, special offers
   */
  async function publishMarketplaceListing(listing: MarketplaceListing) {
    const event = await pool.publish({
      kind: NOSTR_KINDS.MARKETPLACE_LISTING,
      content: JSON.stringify(listing),
      tags: [
        ["d", "marketplace_listing"],
        ["status", listing.isOpen ? "open" : "closed"],
        ...(listing.currentWaitTime
          ? [["wait_time", listing.currentWaitTime.toString()]]
          : []),
        ...(listing.tags?.map((t) => ["t", t]) || []),
        ["updated_at", listing.lastUpdated.toString()],
      ],
    });

    console.log("✅ Marketplace listing updated:", event.id);
    return event;
  }

  /**
   * Fetch marketplace listing
   */
  async function fetchMarketplaceListing(
    pubkey: string
  ): Promise<MarketplaceListing | null> {
    const events = await pool.querySync({
      kinds: [NOSTR_KINDS.MARKETPLACE_LISTING],
      authors: [pubkey],
      "#d": ["marketplace_listing"],
      limit: 1,
    });

    if (events.length === 0) return null;
    return JSON.parse(events[0].content) as MarketplaceListing;
  }

  // ============================================
  // 3️⃣ PUBLIC_STORE_PROFILE (30954) - Extended Info
  // ============================================
  /**
   * Publish extended store information
   * Call this OCCASIONALLY (when hours change, new services, photos)
   * Contains location, hours, services, photos
   */
  async function publishPublicStoreProfile(profile: PublicStoreProfile) {
    const event = await pool.publish({
      kind: NOSTR_KINDS.PUBLIC_STORE_PROFILE,
      content: JSON.stringify(profile),
      tags: [
        ["d", "public_store_profile"],
        ...(profile.geolocation
          ? [
              ["g", profile.geolocation.geohash!],
              ["location", `${profile.geolocation.lat},${profile.geolocation.lng}`],
            ]
          : []),
        ...(profile.services?.map((s) => ["service", s]) || []),
        ...(profile.paymentMethods?.map((p) => ["payment", p]) || []),
      ],
    });

    console.log("✅ Public store profile published:", event.id);
    return event;
  }

  /**
   * Fetch public store profile
   */
  async function fetchPublicStoreProfile(
    pubkey: string
  ): Promise<PublicStoreProfile | null> {
    const events = await pool.querySync({
      kinds: [NOSTR_KINDS.PUBLIC_STORE_PROFILE],
      authors: [pubkey],
      "#d": ["public_store_profile"],
      limit: 1,
    });

    if (events.length === 0) return null;
    return JSON.parse(events[0].content) as PublicStoreProfile;
  }

  // ============================================
  // 🔄 SMART UPDATE FUNCTIONS
  // ============================================
  /**
   * Update store open/closed status
   * This is called FREQUENTLY (every hour, or when manually toggling)
   */
  async function updateStoreStatus(isOpen: boolean) {
    const currentListing = await fetchMarketplaceListing(auth.userPubkey.value!);

    await publishMarketplaceListing({
      isOpen,
      specialOffers: currentListing?.specialOffers || [],
      featuredProducts: currentListing?.featuredProducts || [],
      lastUpdated: Date.now(),
      tags: currentListing?.tags || [],
    });
  }

  /**
   * Update business hours
   * This is called OCCASIONALLY (weekly/monthly)
   */
  async function updateBusinessHours(hours: BusinessHours) {
    const currentProfile = await fetchPublicStoreProfile(
      auth.userPubkey.value!
    );

    await publishPublicStoreProfile({
      ...currentProfile,
      businessHours: hours,
    });
  }

  /**
   * Complete marketplace setup
   * Call this once during onboarding
   */
  async function setupMarketplace(
    profile: StoreProfile,
    extendedProfile: PublicStoreProfile
  ) {
    console.log("🚀 Setting up marketplace profile...");

    // 1. Publish basic identity (30079)
    await publishStoreProfile(profile);

    // 2. Publish extended info (30954)
    await publishPublicStoreProfile(extendedProfile);

    // 3. Publish initial listing (30950)
    await publishMarketplaceListing({
      isOpen: false,
      specialOffers: [],
      featuredProducts: [],
      lastUpdated: Date.now(),
      tags: [profile.shopType],
    });

    console.log("✅ Marketplace setup complete!");
  }

  /**
   * Fetch complete store profile from marketplace
   */
  async function fetchCompleteProfile(pubkey: string) {
    const [basicProfile, listing, extendedProfile] = await Promise.all([
      fetchStoreProfile(pubkey),
      fetchMarketplaceListing(pubkey),
      fetchPublicStoreProfile(pubkey),
    ]);

    return {
      basic: basicProfile,
      listing,
      extended: extendedProfile,
    };
  }

  return {
    // Basic profile (30079)
    publishStoreProfile,
    fetchStoreProfile,

    // Dynamic listing (30950)
    publishMarketplaceListing,
    fetchMarketplaceListing,

    // Extended profile (30954)
    publishPublicStoreProfile,
    fetchPublicStoreProfile,

    // Smart updates
    updateStoreStatus,
    updateBusinessHours,
    setupMarketplace,
    fetchCompleteProfile,
  };
}
```

---

### 3. Usage Examples

#### Initial Setup (One-time)

```typescript
// app/pages/onboarding/marketplace.vue
<script setup lang="ts">
import { useMarketplaceProfile } from "~/composables/use-marketplace-profile";

const marketplace = useMarketplaceProfile();

async function completeSetup() {
  await marketplace.setupMarketplace(
    // Basic identity (30079)
    {
      name: "ร้านกาแฟ ABC",
      description: "Best coffee in Vientiane",
      shopType: "cafe",
      nip05: "shop@bnos.space",
      lud16: "shop@getalby.com",
      acceptsLightning: true,
      acceptsBitcoin: true,
    },
    // Extended info (30954)
    {
      geolocation: {
        lat: 17.9757,
        lng: 102.6331,
        geohash: "u4pruy",
        address: "123 Main St",
        city: "Vientiane",
        country: "Laos",
      },
      businessHours: {
        monday: { open: "08:00", close: "18:00" },
        tuesday: { open: "08:00", close: "18:00" },
        wednesday: { open: "08:00", close: "18:00" },
        thursday: { open: "08:00", close: "18:00" },
        friday: { open: "08:00", close: "18:00" },
        saturday: { open: "09:00", close: "17:00" },
        sunday: { open: "09:00", close: "17:00" },
        timezone: "Asia/Vientiane",
      },
      services: ["dine-in", "takeaway", "wifi"],
      paymentMethods: ["cash", "lightning", "bitcoin"],
      photos: [
        "https://cdn.example.com/storefront.jpg",
        "https://cdn.example.com/interior.jpg",
      ],
      social: {
        website: "https://abccafe.com",
        facebook: "abccafe",
        instagram: "abccafe_official",
      },
    }
  );
}
</script>
```

#### Daily Operations

```typescript
// app/components/pos/StatusToggle.vue
<script setup lang="ts">
import { useMarketplaceProfile } from "~/composables/use-marketplace-profile";

const marketplace = useMarketplaceProfile();
const isOpen = ref(false);

async function toggleStoreStatus() {
  isOpen.value = !isOpen.value;

  // Updates MARKETPLACE_LISTING (30950) ONLY
  await marketplace.updateStoreStatus(isOpen.value);
}
</script>

<template>
  <UButton @click="toggleStoreStatus">
    {{ isOpen ? "Close Store" : "Open Store" }}
  </UButton>
</template>
```

#### Update Business Hours (Occasional)

```typescript
// app/pages/settings/business-hours.vue
<script setup lang="ts">
import { useMarketplaceProfile } from "~/composables/use-marketplace-profile";

const marketplace = useMarketplaceProfile();

async function saveBusinessHours(hours: BusinessHours) {
  // Updates PUBLIC_STORE_PROFILE (30954) ONLY
  await marketplace.updateBusinessHours(hours);
}
</script>
```

#### Marketplace Discovery (Customer View)

```typescript
// app/pages/marketplace/index.vue
<script setup lang="ts">
import { useMarketplaceProfile } from "~/composables/use-marketplace-profile";
import { usePool } from "~/composables/use-pool";

const marketplace = useMarketplaceProfile();
const pool = usePool();

// Search for stores near me
async function searchNearbyStores(lat: number, lng: number) {
  const geohash = encodeGeohash(lat, lng, 6);

  // Query MARKETPLACE_LISTING for currently open stores
  const listings = await pool.querySync({
    kinds: [NOSTR_KINDS.MARKETPLACE_LISTING],
    "#status": ["open"],
    "#t": ["cafe", "restaurant"],
    limit: 50,
  });

  // For each listing, fetch complete profile
  const stores = await Promise.all(
    listings.map(async (event) => {
      const profile = await marketplace.fetchCompleteProfile(event.pubkey);
      return {
        pubkey: event.pubkey,
        ...profile,
      };
    })
  );

  // Filter by distance
  return stores.filter((store) => {
    if (!store.extended?.geolocation) return false;
    const distance = calculateDistance(
      lat,
      lng,
      store.extended.geolocation.lat,
      store.extended.geolocation.lng
    );
    return distance < 5; // 5km radius
  });
}
</script>
```

---

## Relay Strategy

### Where to Publish Each Kind

```typescript
// app/composables/use-marketplace-relays.ts
export function useMarketplaceRelays() {
  return {
    // Basic profile (30079) - Identity relays
    profileRelays: [
      "wss://relay.damus.io",
      "wss://nos.lol",
      "wss://relay.nostr.band",
    ],

    // Marketplace listing (30950) - Marketplace relays
    marketplaceRelays: [
      "wss://relay.nostr.band", // Marketplace aggregator
      "wss://nostr.mom", // Commerce-focused
      "wss://relay.snort.social",
    ],

    // Extended profile (30954) - General relays
    generalRelays: [
      "wss://relay.damus.io",
      "wss://nos.lol",
      "wss://relay.nostr.band",
    ],
  };
}
```

---

## Update Triggers

| Event                       | Updates Kind | Frequency    |
| --------------------------- | ------------ | ------------ |
| Store name changed          | 30079        | Rare         |
| Payment methods changed     | 30079        | Rare         |
| Store opened/closed         | 30950        | Hourly       |
| New special offer           | 30950        | Daily        |
| Featured products changed   | 30950        | Daily        |
| Business hours changed      | 30954        | Weekly       |
| New service added           | 30954        | Monthly      |
| Photos updated              | 30954        | Monthly      |
| Location changed (moved)    | 30954        | Rare         |
| Social media links updated  | 30954        | Occasional   |

---

## Decision Matrix

```
┌────────────────────────────────────────────────────────────────┐
│  WHAT CHANGED?              │  UPDATE WHICH KIND?              │
├────────────────────────────────────────────────────────────────┤
│  Store name                 │  30079 (STORE_PROFILE)           │
│  Shop type                  │  30079 (STORE_PROFILE)           │
│  Lightning address          │  30079 (STORE_PROFILE)           │
│  NIP-05 verification        │  30079 (STORE_PROFILE)           │
├────────────────────────────────────────────────────────────────┤
│  Open/closed status         │  30950 (MARKETPLACE_LISTING)     │
│  Current wait time          │  30950 (MARKETPLACE_LISTING)     │
│  Special offers             │  30950 (MARKETPLACE_LISTING)     │
│  Featured products          │  30950 (MARKETPLACE_LISTING)     │
│  Daily tags/keywords        │  30950 (MARKETPLACE_LISTING)     │
├────────────────────────────────────────────────────────────────┤
│  Business hours             │  30954 (PUBLIC_STORE_PROFILE)    │
│  Services offered           │  30954 (PUBLIC_STORE_PROFILE)    │
│  Payment methods list       │  30954 (PUBLIC_STORE_PROFILE)    │
│  Store photos               │  30954 (PUBLIC_STORE_PROFILE)    │
│  Geolocation                │  30954 (PUBLIC_STORE_PROFILE)    │
│  Social media links         │  30954 (PUBLIC_STORE_PROFILE)    │
└────────────────────────────────────────────────────────────────┘
```

---

## Complete Event Examples

### Example 1: STORE_PROFILE (30079)

```json
{
  "kind": 30079,
  "pubkey": "store_owner_pubkey",
  "created_at": 1735920000,
  "content": "{\"name\":\"ร้านกาแฟ ABC\",\"description\":\"Best coffee in Vientiane\",\"shopType\":\"cafe\",\"nip05\":\"shop@bnos.space\",\"lud16\":\"shop@getalby.com\",\"acceptsLightning\":true,\"acceptsBitcoin\":true}",
  "tags": [
    ["d", "store_profile"],
    ["name", "ร้านกาแฟ ABC"],
    ["shop_type", "cafe"],
    ["nip05", "shop@bnos.space"],
    ["lud16", "shop@getalby.com"],
    ["t", "bitcoin-accepted"]
  ],
  "id": "...",
  "sig": "..."
}
```

### Example 2: MARKETPLACE_LISTING (30950)

```json
{
  "kind": 30950,
  "pubkey": "store_owner_pubkey",
  "created_at": 1735923600,
  "content": "{\"isOpen\":true,\"currentWaitTime\":15,\"specialOffers\":[\"Happy Hour: 2-for-1 coffee 14:00-16:00\"],\"featuredProducts\":[\"product_id_123\",\"product_id_456\"],\"lastUpdated\":1735923600000,\"tags\":[\"cafe\",\"coffee\",\"wifi\"]}",
  "tags": [
    ["d", "marketplace_listing"],
    ["status", "open"],
    ["wait_time", "15"],
    ["t", "cafe"],
    ["t", "coffee"],
    ["t", "wifi"],
    ["updated_at", "1735923600000"]
  ],
  "id": "...",
  "sig": "..."
}
```

### Example 3: PUBLIC_STORE_PROFILE (30954)

```json
{
  "kind": 30954,
  "pubkey": "store_owner_pubkey",
  "created_at": 1735920000,
  "content": "{\"geolocation\":{\"lat\":17.9757,\"lng\":102.6331,\"geohash\":\"u4pruy\",\"address\":\"123 Main St\",\"city\":\"Vientiane\",\"country\":\"Laos\"},\"businessHours\":{\"monday\":{\"open\":\"08:00\",\"close\":\"18:00\"},\"tuesday\":{\"open\":\"08:00\",\"close\":\"18:00\"},\"wednesday\":{\"open\":\"08:00\",\"close\":\"18:00\"},\"thursday\":{\"open\":\"08:00\",\"close\":\"18:00\"},\"friday\":{\"open\":\"08:00\",\"close\":\"18:00\"},\"saturday\":{\"open\":\"09:00\",\"close\":\"17:00\"},\"sunday\":{\"open\":\"09:00\",\"close\":\"17:00\"},\"timezone\":\"Asia/Vientiane\"},\"services\":[\"dine-in\",\"takeaway\",\"wifi\"],\"paymentMethods\":[\"cash\",\"lightning\",\"bitcoin\"],\"photos\":[\"https://cdn.example.com/storefront.jpg\",\"https://cdn.example.com/interior.jpg\"],\"social\":{\"website\":\"https://abccafe.com\",\"facebook\":\"abccafe\",\"instagram\":\"abccafe_official\"}}",
  "tags": [
    ["d", "public_store_profile"],
    ["g", "u4pruy"],
    ["location", "17.9757,102.6331"],
    ["service", "dine-in"],
    ["service", "takeaway"],
    ["service", "wifi"],
    ["payment", "cash"],
    ["payment", "lightning"],
    ["payment", "bitcoin"]
  ],
  "id": "...",
  "sig": "..."
}
```

---

## Performance Optimization

### Caching Strategy

```typescript
// app/composables/use-marketplace-cache.ts
export function useMarketplaceCache() {
  const cache = {
    storeProfile: new Map<string, { data: StoreProfile; expires: number }>(),
    marketplaceListing: new Map<
      string,
      { data: MarketplaceListing; expires: number }
    >(),
    publicProfile: new Map<
      string,
      { data: PublicStoreProfile; expires: number }
    >(),
  };

  const TTL = {
    STORE_PROFILE: 24 * 60 * 60 * 1000, // 24 hours (rarely changes)
    MARKETPLACE_LISTING: 5 * 60 * 1000, // 5 minutes (frequently changes)
    PUBLIC_PROFILE: 60 * 60 * 1000, // 1 hour (occasionally changes)
  };

  async function getCachedStoreProfile(
    pubkey: string
  ): Promise<StoreProfile | null> {
    const cached = cache.storeProfile.get(pubkey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const marketplace = useMarketplaceProfile();
    const fresh = await marketplace.fetchStoreProfile(pubkey);
    if (fresh) {
      cache.storeProfile.set(pubkey, {
        data: fresh,
        expires: Date.now() + TTL.STORE_PROFILE,
      });
    }
    return fresh;
  }

  // Similar for other kinds...

  return {
    getCachedStoreProfile,
    // ... other cached getters
  };
}
```

---

## Migration from Single Profile

If you currently use only `STORE_PROFILE (30079)`, here's how to migrate:

```typescript
// Migration script
async function migrateToThreeTierSystem() {
  const marketplace = useMarketplaceProfile();

  // 1. Fetch existing profile
  const existing = await marketplace.fetchStoreProfile(auth.userPubkey.value!);

  if (!existing) {
    console.error("No existing profile found");
    return;
  }

  // 2. Split data into three events
  const basicProfile: StoreProfile = {
    name: existing.name,
    description: existing.description,
    shopType: existing.shopType,
    nip05: existing.nip05,
    lud16: existing.lud16,
    acceptsLightning: existing.acceptsLightning,
    acceptsBitcoin: existing.acceptsBitcoin,
  };

  const extendedProfile: PublicStoreProfile = {
    geolocation: existing.geolocation,
    businessHours: existing.businessHours,
    services: existing.services,
    paymentMethods: existing.paymentMethods,
    photos: existing.photos,
    social: existing.social,
  };

  const initialListing: MarketplaceListing = {
    isOpen: false,
    lastUpdated: Date.now(),
    tags: [existing.shopType],
  };

  // 3. Publish all three
  await marketplace.publishStoreProfile(basicProfile);
  await marketplace.publishPublicStoreProfile(extendedProfile);
  await marketplace.publishMarketplaceListing(initialListing);

  console.log("✅ Migration complete!");
}
```

---

## Best Practices

1. **Update Frequency**
   - 30079: Once per month or less
   - 30950: Multiple times per day
   - 30954: Once per week

2. **Data Size**
   - Keep 30079 minimal (< 1KB)
   - Keep 30950 dynamic but small (< 2KB)
   - 30954 can be larger (< 10KB)

3. **Relay Selection**
   - Publish 30079 to identity relays
   - Publish 30950 to marketplace relays
   - Publish 30954 to general relays

4. **Error Handling**
   - Always validate data before publishing
   - Handle relay failures gracefully
   - Implement retry logic for critical updates

---

## References

- [nostr-kinds.ts](../app/types/nostr-kinds.ts)
- [marketplace-integration.md](./marketplace-integration.md)
- [multi-pubkey-architecture.md](./multi-pubkey-architecture.md)
- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md)

---

**Maintainers:** Bitspace POS Development Team
