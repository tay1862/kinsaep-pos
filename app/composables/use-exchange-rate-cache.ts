/**
 * Exchange Rate Caching System
 * Caches exchange rates in localStorage to reduce API calls
 */

export interface CachedExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
  source: "api" | "manual" | "oracle";
}

export interface ExchangeRateCache {
  rates: Record<string, CachedExchangeRate>;
  lastUpdated: number;
}

const CACHE_KEY = "bitspace_exchange_rates";
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const FALLBACK_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for fallback

export const useExchangeRateCache = () => {
  /**
   * Check if running in browser
   */
  const isBrowser = () => typeof window !== "undefined";

  /**
   * Generate cache key for a currency pair
   */
  const getCacheKey = (from: string, to: string): string => {
    return `${from.toUpperCase()}-${to.toUpperCase()}`;
  };

  /**
   * Load cache from localStorage
   */
  const loadCache = (): ExchangeRateCache => {
    if (!isBrowser()) {
      return { rates: {}, lastUpdated: 0 };
    }

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as ExchangeRateCache;
      }
    } catch (error) {
      console.error("Error loading exchange rate cache:", error);
    }

    return { rates: {}, lastUpdated: 0 };
  };

  /**
   * Save cache to localStorage
   */
  const saveCache = (cache: ExchangeRateCache): void => {
    if (!isBrowser()) return;

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error("Error saving exchange rate cache:", error);
    }
  };

  /**
   * Check if a cached rate is still valid
   */
  const isCacheValid = (timestamp: number, maxAge: number = CACHE_DURATION): boolean => {
    const now = Date.now();
    return now - timestamp < maxAge;
  };

  /**
   * Get exchange rate from cache
   */
  const getCachedRate = (from: string, to: string): number | null => {
    const cache = loadCache();
    const key = getCacheKey(from, to);
    const cached = cache.rates[key];

    if (cached && isCacheValid(cached.timestamp)) {
      return cached.rate;
    }

    // Check inverse rate
    const inverseKey = getCacheKey(to, from);
    const inverseCached = cache.rates[inverseKey];

    if (inverseCached && isCacheValid(inverseCached.timestamp)) {
      return 1 / inverseCached.rate;
    }

    return null;
  };

  /**
   * Set exchange rate in cache
   */
  const setCachedRate = (
    from: string,
    to: string,
    rate: number,
    source: "api" | "manual" | "oracle" = "api"
  ): void => {
    const cache = loadCache();
    const key = getCacheKey(from, to);
    const now = Date.now();

    cache.rates[key] = {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate,
      timestamp: now,
      source,
    };

    cache.lastUpdated = now;
    saveCache(cache);
  };

  /**
   * Set multiple exchange rates at once
   */
  const setCachedRates = (
    rates: Array<{ from: string; to: string; rate: number; source?: "api" | "manual" | "oracle" }>
  ): void => {
    const cache = loadCache();
    const now = Date.now();

    rates.forEach(({ from, to, rate, source = "api" }) => {
      const key = getCacheKey(from, to);
      cache.rates[key] = {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate,
        timestamp: now,
        source,
      };
    });

    cache.lastUpdated = now;
    saveCache(cache);
  };

  /**
   * Clear expired rates from cache
   */
  const clearExpiredRates = (maxAge: number = CACHE_DURATION): void => {
    const cache = loadCache();
    const now = Date.now();
    let hasChanges = false;

    Object.keys(cache.rates).forEach((key) => {
      if (now - cache.rates[key].timestamp > maxAge) {
        delete cache.rates[key];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      saveCache(cache);
    }
  };

  /**
   * Clear all cached rates
   */
  const clearCache = (): void => {
    if (!isBrowser()) return;

    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error("Error clearing exchange rate cache:", error);
    }
  };

  /**
   * Get all cached rates (for debugging/display)
   */
  const getAllCachedRates = (): CachedExchangeRate[] => {
    const cache = loadCache();
    return Object.values(cache.rates);
  };

  /**
   * Get cache statistics
   */
  const getCacheStats = () => {
    const cache = loadCache();
    const rates = Object.values(cache.rates);
    const now = Date.now();

    const valid = rates.filter((r) => isCacheValid(r.timestamp));
    const expired = rates.filter((r) => !isCacheValid(r.timestamp));

    return {
      total: rates.length,
      valid: valid.length,
      expired: expired.length,
      lastUpdated: cache.lastUpdated,
      age: cache.lastUpdated ? now - cache.lastUpdated : null,
    };
  };

  /**
   * Warm up cache with fallback rates for offline support
   */
  const warmupCache = (fallbackRates: Array<{ from: string; to: string; rate: number }>) => {
    const cache = loadCache();

    fallbackRates.forEach(({ from, to, rate }) => {
      const key = getCacheKey(from, to);

      // Only add fallback if we don't have a recent rate
      if (!cache.rates[key] || !isCacheValid(cache.rates[key].timestamp, FALLBACK_CACHE_DURATION)) {
        cache.rates[key] = {
          from: from.toUpperCase(),
          to: to.toUpperCase(),
          rate,
          timestamp: Date.now(),
          source: "manual",
        };
      }
    });

    saveCache(cache);
  };

  return {
    getCachedRate,
    setCachedRate,
    setCachedRates,
    clearExpiredRates,
    clearCache,
    getAllCachedRates,
    getCacheStats,
    warmupCache,
    CACHE_DURATION,
  };
};
