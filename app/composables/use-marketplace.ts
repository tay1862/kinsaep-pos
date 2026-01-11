/**
 * use-marketplace.ts - Enterprise Marketplace Integration
 *
 * Decentralized store discovery & inter-store commerce using Nostr
 *
 * Event Kinds:
 * - 30950: MARKETPLACE_LISTING - Store listing for discovery
 * - 30951: MARKETPLACE_PRODUCT - Product sync across stores
 * - 30952: MARKETPLACE_ORDER - Cross-store order routing
 * - 30953: STORE_CONNECTION - Store partnerships
 * - 30954: PUBLIC_STORE_PROFILE - Enhanced store profile
 * - 30955: MARKETPLACE_REVIEW - Customer reviews
 */

import type { Event, Filter } from "nostr-tools";
import type {
  MarketplaceProfile,
  MarketplaceProduct,
  MarketplaceReview,
  MarketplaceSearchFilters,
  StoreConnection,
  Product,
} from "~/types";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

export function useMarketplace() {
  const nostrRelay = useNostrRelay();
  const nostrData = useNostrData();
  const auth = useAuth();
  const shop = useShop();
  const toast = useToast();
  const { t } = useI18n();

  // ─────────────────────────────────────────
  // State
  // ─────────────────────────────────────────
  const stores = ref<MarketplaceProfile[]>([]);
  const products = ref<MarketplaceProduct[]>([]);
  const connections = ref<StoreConnection[]>([]);
  const reviews = ref<MarketplaceReview[]>([]);
  const isLoading = ref(false);
  const isInitialized = ref(false);

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────

  function getPubkey(): string | null {
    // First check auth state
    if (auth.user.value?.nostrPubkey) {
      return auth.user.value.nostrPubkey;
    }

    // Fallback: check localStorage (same as company code section)
    if (import.meta.client) {
      const nostrUser = localStorage.getItem("nostrUser");
      if (nostrUser) {
        try {
          const parsed = JSON.parse(nostrUser);
          return parsed.pubkey || parsed.publicKey || null;
        } catch {
          console.warn("Failed to parse nostrUser from localStorage");
        }
      }
    }

    return null;
  }

  // ─────────────────────────────────────────
  // Store Discovery
  // ─────────────────────────────────────────

  /**
   * Search for stores in the marketplace
   */
  async function searchStores(
    filters: MarketplaceSearchFilters = {}
  ): Promise<MarketplaceProfile[]> {
    isLoading.value = true;

    try {
      // Build Nostr filter
      const nostrFilter: Filter = {
        kinds: [NOSTR_KINDS.PUBLIC_STORE_PROFILE],
        limit: filters.limit || 50,
      };

      // Add tag filters
      if (filters.shopType) {
        nostrFilter["#t"] = [filters.shopType];
      }
      if (filters.categories?.length) {
        nostrFilter["#c"] = filters.categories;
      }
      if (filters.geohash) {
        // NIP-52 geohash proximity search (4-char precision)
        nostrFilter["#g"] = [filters.geohash.slice(0, 4)];
      }

      const events = await nostrRelay.queryEvents(nostrFilter);

      // Parse events into MarketplaceProfile
      const results = events
        .map((event: Event) => {
          try {
            const content = JSON.parse(event.content);
            return {
              pubkey: event.pubkey,
              ...content,
            } as MarketplaceProfile;
          } catch {
            return null;
          }
        })
        .filter((s): s is MarketplaceProfile => s !== null);

      // Apply local filters
      let filtered = results;

      if (filters.query) {
        const query = filters.query.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(query) ||
            s.description?.toLowerCase().includes(query)
        );
      }

      if (filters.acceptsLightning) {
        filtered = filtered.filter((s) => s.acceptsLightning);
      }

      if (filters.acceptsBitcoin) {
        filtered = filtered.filter((s) => s.acceptsBitcoin);
      }

      if (filters.services?.length) {
        filtered = filtered.filter((s) =>
          filters.services?.some((svc) => s.services?.includes(svc))
        );
      }

      if (filters.minRating) {
        filtered = filtered.filter(
          (s) => (s.averageRating || 0) >= (filters.minRating || 0)
        );
      }

      // Sort results
      if (filters.sortBy === "rating") {
        filtered.sort(
          (a, b) => (b.averageRating || 0) - (a.averageRating || 0)
        );
      } else if (filters.sortBy === "name") {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      } else if (filters.sortBy === "newest") {
        filtered.sort(
          (a, b) =>
            new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
        );
      }

      stores.value = filtered;
      return filtered;
    } catch (error) {
      console.error("Failed to search stores:", error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Get a single store profile by pubkey
   */
  async function getStoreProfile(
    pubkey: string
  ): Promise<MarketplaceProfile | null> {
    try {
      const events = await nostrRelay.queryEvents({
        kinds: [NOSTR_KINDS.PUBLIC_STORE_PROFILE],
        authors: [pubkey],
        limit: 1,
      });

      if (events.length === 0) return null;

      const content = JSON.parse(events[0].content);
      return {
        pubkey: events[0].pubkey,
        ...content,
      } as MarketplaceProfile;
    } catch (error) {
      console.error("Failed to get store profile:", error);
      return null;
    }
  }

  // ─────────────────────────────────────────
  // Store Listing (Publish/Update)
  // ─────────────────────────────────────────

  /**
   * Publish store to marketplace
   */
  async function publishStoreToMarketplace(): Promise<boolean> {
    try {
      const pubkey = getPubkey();
      if (!pubkey) throw new Error("Not authenticated with Nostr");

      const config = shop.shopConfig.value;
      if (!config) throw new Error("Shop not configured");

      // Build marketplace profile from shop config
      const profile: Partial<MarketplaceProfile> = {
        name: config.name || "",
        description: config.marketplaceDescription || config.address || "",
        logo: config.logo,
        shopType: config.shopType || "retail",
        nip05: config.nip05,
        lud16: config.lud16,
        phone: config.phone,
        services: config.services ? [...config.services] : [],
        acceptsLightning: config.acceptsLightning ?? true,
        acceptsBitcoin: config.acceptsBitcoin ?? false,
        isListed: true,
        joinedAt: config.marketplaceJoinedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add geolocation if available
      if (config.geolocation) {
        profile.geolocation = {
          lat: config.geolocation.lat,
          lng: config.geolocation.lng,
          geohash: config.geolocation.geohash,
          address: config.geolocation.address,
          city: config.geolocation.city,
          country: config.geolocation.country,
        };
      }

      // Add business hours if available
      if (config.businessHours) {
        profile.businessHours = {
          ...config.businessHours,
          timezone: config.businessHours.timezone,
          holidays: config.businessHours.holidays
            ? [...config.businessHours.holidays]
            : undefined,
        };
      }

      // Build tags for the event
      const tags: string[][] = [
        ["d", pubkey], // Unique identifier
        ["t", config.shopType || "retail"], // Shop type tag
      ];

      // Add service tags
      if (config.services) {
        for (const service of config.services) {
          tags.push(["s", service]);
        }
      }

      // Add geohash tag for proximity search
      if (config.geolocation?.geohash) {
        tags.push(["g", config.geolocation.geohash]);
      }

      // Create and publish event using nostrData
      const success = await nostrData.publishEvent(
        NOSTR_KINDS.PUBLIC_STORE_PROFILE,
        JSON.stringify(profile),
        tags
      );

      if (!success) throw new Error("Failed to publish event");

      // Update local config
      await shop.saveShopConfig({
        visibility: "public",
        isListed: true,
        marketplaceJoinedAt: profile.joinedAt,
      });

      toast.add({
        title: t("marketplace.published", "Published!"),
        description: t(
          "marketplace.publishedDesc",
          "Your store is now discoverable"
        ),
        icon: "i-heroicons-check-circle",
        color: "success",
      });

      return true;
    } catch (error) {
      console.error("Failed to publish store:", error);
      toast.add({
        title: t("common.error"),
        description: String(error),
        color: "error",
      });
      return false;
    }
  }

  /**
   * Unpublish store from marketplace
   */
  async function unpublishFromMarketplace(): Promise<boolean> {
    try {
      // Update local config to private
      await shop.saveShopConfig({
        visibility: "private",
        isListed: false,
      });

      toast.add({
        title: t("marketplace.unpublished", "Private Mode"),
        description: t(
          "marketplace.unpublishedDesc",
          "Your store is now private"
        ),
        icon: "i-heroicons-lock-closed",
        color: "neutral",
      });

      return true;
    } catch (error) {
      console.error("Failed to unpublish store:", error);
      return false;
    }
  }

  // ─────────────────────────────────────────
  // Product Marketplace Sync
  // ─────────────────────────────────────────

  /**
   * Sync products to marketplace for cross-store discovery
   */
  async function syncProductsToMarketplace(
    productsToSync: Product[],
    productIds?: string[]
  ): Promise<number> {
    const pubkey = getPubkey();
    if (!pubkey) throw new Error("Not authenticated");

    const config = shop.shopConfig.value;
    if (!config) throw new Error("Shop not configured");

    // Filter by IDs if provided
    let filtered = productsToSync;
    if (productIds?.length) {
      filtered = productsToSync.filter((p) => productIds.includes(p.id));
    }

    let syncedCount = 0;

    for (const product of filtered) {
      if (!product.active) continue;

      try {
        const marketplaceProduct: Partial<MarketplaceProduct> = {
          id: product.id,
          storePubkey: pubkey,
          storeName: config.name || "",
          name: product.name,
          description: product.description,
          image: product.image,
          category: product.categoryId || "general",
          price: product.price,
          currency: config.currency || "USD",
          inStock: (product.stock ?? 0) > 0,
          quantity: product.stock,
          services: config.services ? [...config.services] : undefined,
          createdAt: product.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const tags: string[][] = [
          ["d", product.id], // Unique identifier
          ["p", pubkey], // Store pubkey
          ["c", product.categoryId || "general"], // Category
          ["price", String(product.price)], // Price for filtering
        ];

        const success = await nostrData.publishEvent(
          NOSTR_KINDS.MARKETPLACE_PRODUCT,
          JSON.stringify(marketplaceProduct),
          tags
        );

        if (success) {
          syncedCount++;
        }
      } catch (error) {
        console.error(`Failed to sync product ${product.id}:`, error);
      }
    }

    return syncedCount;
  }

  /**
   * Search products across marketplace stores
   */
  async function searchMarketplaceProducts(
    query: string,
    options: { category?: string; maxPrice?: number; limit?: number } = {}
  ): Promise<MarketplaceProduct[]> {
    try {
      const filter: Filter = {
        kinds: [NOSTR_KINDS.MARKETPLACE_PRODUCT],
        limit: options.limit || 50,
      };

      if (options.category) {
        filter["#c"] = [options.category];
      }

      const events = await nostrRelay.queryEvents(filter);

      let results = events
        .map((event: Event) => {
          try {
            const content = JSON.parse(event.content);
            return {
              storePubkey: event.pubkey,
              ...content,
            } as MarketplaceProduct;
          } catch {
            return null;
          }
        })
        .filter((p): p is MarketplaceProduct => p !== null);

      // Apply local filters
      if (query) {
        const q = query.toLowerCase();
        results = results.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q)
        );
      }

      if (options.maxPrice) {
        results = results.filter(
          (p) => p.price <= (options.maxPrice || Infinity)
        );
      }

      products.value = results;
      return results;
    } catch (error) {
      console.error("Failed to search marketplace products:", error);
      return [];
    }
  }

  // ─────────────────────────────────────────
  // Store Connections (Partnerships)
  // ─────────────────────────────────────────

  /**
   * Request connection with another store
   */
  async function requestStoreConnection(
    toPubkey: string,
    type: StoreConnection["type"] = "follow",
    note?: string
  ): Promise<boolean> {
    try {
      const pubkey = getPubkey();
      if (!pubkey) throw new Error("Not authenticated");

      const connection: Omit<StoreConnection, "id"> = {
        fromPubkey: pubkey,
        toPubkey,
        type,
        status: "pending",
        note,
        createdAt: new Date().toISOString(),
      };

      const tags: string[][] = [
        ["d", `${pubkey}:${toPubkey}`], // Unique identifier
        ["p", toPubkey], // Target store
        ["t", type], // Connection type
      ];

      const success = await nostrData.publishEvent(
        NOSTR_KINDS.STORE_CONNECTION,
        JSON.stringify(connection),
        tags
      );

      if (!success) throw new Error("Failed to publish event");

      toast.add({
        title: t("marketplace.connectionSent", "Request Sent"),
        icon: "i-heroicons-check",
        color: "success",
      });

      return true;
    } catch (error) {
      console.error("Failed to request connection:", error);
      return false;
    }
  }

  /**
   * Get connected stores
   */
  async function getConnectedStores(): Promise<StoreConnection[]> {
    try {
      const pubkey = getPubkey();
      if (!pubkey) return [];

      const events = await nostrRelay.queryEvents({
        kinds: [NOSTR_KINDS.STORE_CONNECTION],
        "#p": [pubkey], // Connections involving this store
      });

      const result = events
        .map((event: Event) => {
          try {
            const content = JSON.parse(event.content);
            return {
              id: event.id,
              ...content,
            } as StoreConnection;
          } catch {
            return null;
          }
        })
        .filter((c): c is StoreConnection => c !== null);

      connections.value = result.filter((c) => c.status === "accepted");
      return connections.value;
    } catch (error) {
      console.error("Failed to get connected stores:", error);
      return [];
    }
  }

  // ─────────────────────────────────────────
  // Reviews
  // ─────────────────────────────────────────

  /**
   * Submit a review for a store
   */
  async function submitReview(
    storePubkey: string,
    rating: 1 | 2 | 3 | 4 | 5,
    comment?: string,
    orderId?: string
  ): Promise<boolean> {
    try {
      const pubkey = getPubkey();
      if (!pubkey) throw new Error("Not authenticated");

      const review: Omit<MarketplaceReview, "id"> = {
        storePubkey,
        customerPubkey: pubkey,
        rating,
        comment,
        orderId,
        helpful: 0,
        verified: !!orderId,
        createdAt: new Date().toISOString(),
      };

      const tags: string[][] = [
        ["d", `${pubkey}:${storePubkey}`], // One review per store per customer
        ["p", storePubkey], // Store being reviewed
        ["rating", String(rating)],
      ];

      const success = await nostrData.publishEvent(
        NOSTR_KINDS.MARKETPLACE_REVIEW,
        JSON.stringify(review),
        tags
      );

      if (!success) throw new Error("Failed to publish event");

      toast.add({
        title: t("marketplace.reviewSubmitted", "Review Submitted"),
        icon: "i-heroicons-star",
        color: "success",
      });

      return true;
    } catch (error) {
      console.error("Failed to submit review:", error);
      return false;
    }
  }

  /**
   * Get reviews for a store
   */
  async function getStoreReviews(
    storePubkey: string
  ): Promise<MarketplaceReview[]> {
    try {
      const events = await nostrRelay.queryEvents({
        kinds: [NOSTR_KINDS.MARKETPLACE_REVIEW],
        "#p": [storePubkey],
        limit: 100,
      });

      const result = events
        .map((event: Event) => {
          try {
            const content = JSON.parse(event.content);
            return {
              id: event.id,
              ...content,
            } as MarketplaceReview;
          } catch {
            return null;
          }
        })
        .filter((r): r is MarketplaceReview => r !== null);

      // Sort by newest first
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      reviews.value = result;
      return result;
    } catch (error) {
      console.error("Failed to get store reviews:", error);
      return [];
    }
  }

  // ─────────────────────────────────────────
  // Computed Properties
  // ─────────────────────────────────────────

  const isStoreListed = computed(
    () => shop.shopConfig.value?.isListed ?? false
  );
  const storeVisibility = computed(
    () => shop.shopConfig.value?.visibility ?? "private"
  );

  // ─────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────
  return {
    // State
    stores,
    products,
    connections,
    reviews,
    isLoading,
    isInitialized,

    // Computed
    isStoreListed,
    storeVisibility,

    // Discovery
    searchStores,
    getStoreProfile,

    // Listing
    publishStoreToMarketplace,
    unpublishFromMarketplace,

    // Products
    syncProductsToMarketplace,
    searchMarketplaceProducts,

    // Connections
    requestStoreConnection,
    getConnectedStores,

    // Reviews
    submitReview,
    getStoreReviews,
  };
}
