// composables/use-currency.ts
// 💰 Multi-Currency System - LAK, THB, USD, BTC/SATS

import { ref, computed, watch } from "vue";
import { useStorage } from "@vueuse/core";
import type { Currency, CurrencyCode, ExchangeRate, MultiPrice } from "~/types";
// Import comprehensive currency data from data file
import {
  CURRENCIES as ALL_CURRENCIES,
  getCurrencyInfo,
  getSupportedCurrencies,
  getCurrenciesByRegion,
  type CurrencyInfo,
} from "~/data/currencies";

// Core currencies for POS operations (must support exchange rates)
const CURRENCIES: Record<CurrencyCode, Currency> = {
  LAK: { code: "LAK", name: "Lao Kip", symbol: "₭", decimals: 0 },
  THB: { code: "THB", name: "Thai Baht", symbol: "฿", decimals: 2 },
  USD: { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
  BTC: { code: "BTC", name: "Bitcoin", symbol: "₿", decimals: 8 },
  SATS: { code: "SATS", name: "Satoshis", symbol: "sats", decimals: 0 },
};

// Re-export data file utilities for convenience
export { getCurrencyInfo, getSupportedCurrencies, getCurrenciesByRegion };

// Currency codes for simple arrays (POS currency switcher) - now includes all
export const CURRENCY_CODES: CurrencyCode[] =
  getSupportedCurrencies() as CurrencyCode[];

// POS-specific currency options - now includes all
export const POS_CURRENCY_OPTIONS: CurrencyCode[] =
  getSupportedCurrencies() as CurrencyCode[];

// Popular currencies for quick access (extended list)
export const POPULAR_CURRENCY_CODES = [
  "SATS",
  "BTC",
  "LAK",
  "THB",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "SGD",
  "AUD",
  "CAD",
  "KRW",
  "VND",
  "IDR",
  "MYR",
  "PHP",
  "INR",
];

/**
 * Get currency info from comprehensive data or core currencies
 */
const getCurrencyData = (code: string): CurrencyInfo | Currency | undefined => {
  // First check comprehensive data
  const fullInfo = ALL_CURRENCIES[code];
  if (fullInfo) return fullInfo;
  // Fallback to core currencies
  return CURRENCIES[code as CurrencyCode];
};

/**
 * Get all currencies as select options (for comprehensive dropdowns)
 * Uses the full currency data from data/currencies.ts
 */
export const getAllCurrencySelectOptions = () => {
  return Object.values(ALL_CURRENCIES).map((curr) => ({
    value: curr.code,
    label: `${curr.symbol} ${curr.code} - ${curr.name}`,
  }));
};

/**
 * Get currency options formatted for USelect/USelectMenu dropdowns
 * @param codes - Optional array of currency codes to include. If not provided, uses POPULAR_CURRENCY_CODES
 */
export const getCurrencySelectOptions = (codes?: string[]) => {
  const targetCodes = codes || POPULAR_CURRENCY_CODES;
  return targetCodes.map((code) => {
    const curr = getCurrencyData(code);
    if (!curr) {
      return { value: code, label: code };
    }
    return {
      value: code,
      label: `${curr.symbol} ${code} - ${curr.name}`,
    };
  });
};

// Currency options for select dropdowns (with labels) - now includes all
export const CURRENCY_OPTIONS = getAllCurrencySelectOptions();

/**
 * Get POS currency options with labels (for quick settings)
 */
export const getPOSCurrencyOptions = () => {
  return getAllCurrencySelectOptions();
};

/**
 * Get currencies grouped by region for organized dropdowns
 */
export const getCurrencyOptionsByRegion = () => {
  const regions = getCurrenciesByRegion();
  const result: Record<string, Array<{ value: string; label: string }>> = {};

  for (const [region, codes] of Object.entries(regions)) {
    result[region] = codes.map((code) => {
      const curr = ALL_CURRENCIES[code];
      return {
        value: code,
        label: curr ? `${curr.symbol} ${code} - ${curr.name}` : code,
      };
    });
  }

  return result;
};

// Price API sources
const PRICE_APIS = {
  blockchain: "https://blockchain.info/ticker",
  fawazahmed:
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
  mempool: "https://mempool.space/api/v1/prices",
};

// ============================================
// SHARED STATE (Singleton pattern)
// All useCurrency() calls share the same state
// ============================================
const baseCurrency = ref<CurrencyCode>("LAK");
const displayCurrency = ref<CurrencyCode>("LAK");
const exchangeRates = ref<Map<string, ExchangeRate>>(new Map());

// Persistent storage for offline support
const persistentRates = useStorage<ExchangeRate[]>("pos-exchange-rates", []);
const persistentLastUpdate = useStorage<string | null>(
  "pos-rates-last-update",
  null
);

const btcPrice = ref<number>(0); // BTC price in USD
const btcPriceLAK = ref<number>(0); // BTC price in LAK
const btcPriceTHB = ref<number>(0); // BTC price in THB
const isLoading = ref(false);
const lastUpdate = ref<string | null>(null);
const error = ref<string | null>(null);
const isInitialized = ref(false);
const isOffline = ref(false);

// Auto-refresh interval (every 5 minutes)
let refreshInterval: ReturnType<typeof setInterval> | null = null;

export const useCurrency = () => {
  /**
   * Load rates from persistent cache
   */
  const loadFromCache = () => {
    if (persistentRates.value.length > 0) {
      // Clear current map
      exchangeRates.value.clear();

      // Load from storage
      persistentRates.value.forEach((rate) => {
        const key = `${rate.from}-${rate.to}`;
        exchangeRates.value.set(key, rate);
      });

      // Restore last update time
      lastUpdate.value = persistentLastUpdate.value;

      console.log(
        `📦 Loaded ${exchangeRates.value.size} exchange rates from cache`
      );
      return true;
    }
    return false;
  };

  /**
   * Save current rates to persistent cache
   */
  const saveToCache = () => {
    // Convert Map values to array for storage
    persistentRates.value = Array.from(exchangeRates.value.values());
    persistentLastUpdate.value = lastUpdate.value;
  };

  /**
   * Initialize currency system and fetch rates
   */
  const init = async (defaultCurrency: CurrencyCode = "LAK") => {
    // Skip if already initialized with rates
    if (isInitialized.value && exchangeRates.value.size > 0) {
      console.log("💱 Currency already initialized, skipping...");
      return;
    }

    baseCurrency.value = defaultCurrency;
    displayCurrency.value = defaultCurrency;

    // Try to load from cache first
    const loadedFromCache = loadFromCache();

    // Determine if we should fetch fresh rates
    // If we have cache, we can initially use it, but still try to refresh in background
    if (loadedFromCache) {
      // Recalculate BTC prices from cached rates
      updateBtcPricesFromRates();
    }

    // Try to fetch fresh rates (will fallback if offline)
    await refreshRates();

    startAutoRefresh();
    isInitialized.value = true;
  };

  /**
   * Recalculate component state (BTC prices) from generic rates map
   * This is needed after loading from cache
   */
  const updateBtcPricesFromRates = () => {
    const btcUsd = exchangeRates.value.get("BTC-USD")?.rate;
    const btcLak = exchangeRates.value.get("BTC-LAK")?.rate;
    const btcThb = exchangeRates.value.get("BTC-THB")?.rate;

    if (btcUsd) btcPrice.value = btcUsd;
    if (btcLak) btcPriceLAK.value = btcLak;
    if (btcThb) btcPriceTHB.value = btcThb;
  };

  /**
   * Fetch exchange rates from APIs
   */
  const refreshRates = async () => {
    isLoading.value = true;
    error.value = null;
    isOffline.value = !navigator.onLine;

    // If offline, try to rely on cache if available
    if (isOffline.value) {
      console.log("💱 Device is offline, using cached rates");
      if (exchangeRates.value.size === 0) {
        setFallbackRates();
      }
      isLoading.value = false;
      return;
    }

    try {
      // Fetch BTC prices from blockchain.info (has LAK and THB)
      const btcPrices = await fetchBTCPrices();

      // Fetch fiat exchange rates from fawazahmed API
      const fiatRates = await fetchFiatRates();

      const now = new Date().toISOString();

      // Set BTC price in various currencies
      btcPrice.value = btcPrices.USD || 100000;
      btcPriceLAK.value =
        btcPrices.LAK || btcPrice.value * (fiatRates.lak || 20500);
      btcPriceTHB.value =
        btcPrices.THB || btcPrice.value * (fiatRates.thb || 35);

      // BTC conversions
      setRate("BTC", "USD", btcPrice.value, "api");
      setRate("BTC", "LAK", btcPriceLAK.value, "api");
      setRate("BTC", "THB", btcPriceTHB.value, "api");
      setRate("BTC", "SATS", 100000000, "manual"); // 1 BTC = 100M sats

      // USD to fiat rates
      const usdToLak = fiatRates.lak || 20500;
      const usdToThb = fiatRates.thb || 35;

      setRate("USD", "LAK", usdToLak, "api");
      setRate("USD", "THB", usdToThb, "api");
      setRate("THB", "LAK", usdToLak / usdToThb, "api");

      // SATS to all currencies (1 sat = BTC / 100000000)
      const satsToUsd = btcPrice.value / 100000000;
      const satsToLak = btcPriceLAK.value / 100000000;
      const satsToThb = btcPriceTHB.value / 100000000;

      setRate("SATS", "USD", satsToUsd, "api");
      setRate("SATS", "LAK", satsToLak, "api");
      setRate("SATS", "THB", satsToThb, "api");
      setRate("SATS", "BTC", 1 / 100000000, "manual");

      // Fiat to SATS (inverse) - HOW MANY SATS PER 1 FIAT UNIT
      const lakToSats = 1 / satsToLak; // e.g., 1 LAK = 0.05 sats
      const thbToSats = 1 / satsToThb;
      const usdToSats = 1 / satsToUsd;

      setRate("LAK", "SATS", lakToSats, "api");
      setRate("THB", "SATS", thbToSats, "api");
      setRate("USD", "SATS", usdToSats, "api");

      lastUpdate.value = now;
      saveToCache(); // Save successful update to cache

      console.log("💱 Exchange rates updated:", {
        btcUsd: btcPrice.value,
        btcLak: btcPriceLAK.value,
        usdToLak,
        satsToLak: satsToLak.toFixed(6),
        lakToSats: lakToSats.toFixed(6),
        "47000 LAK in sats": Math.round(47000 * lakToSats),
      });
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to fetch rates";
      console.error("Currency refresh error:", e);

      // If API fails, check if we have data in cache/memory
      if (exchangeRates.value.size > 0) {
        console.log("Using existing rates due to API failure");
      } else {
        // Only set hardcoded fallback if we have ABSOLUTELY NOTHING
        setFallbackRates();
      }
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Set fallback rates when APIs fail
   */
  const setFallbackRates = () => {
    const fallbackBtcUsd = 100000;
    const fallbackUsdLak = 20500;
    const fallbackUsdThb = 35;

    btcPrice.value = fallbackBtcUsd;
    btcPriceLAK.value = fallbackBtcUsd * fallbackUsdLak;
    btcPriceTHB.value = fallbackBtcUsd * fallbackUsdThb;

    setRate("BTC", "USD", fallbackBtcUsd, "manual");
    setRate("BTC", "LAK", btcPriceLAK.value, "manual");
    setRate("BTC", "THB", btcPriceTHB.value, "manual");
    setRate("BTC", "SATS", 100000000, "manual");

    setRate("USD", "LAK", fallbackUsdLak, "manual");
    setRate("USD", "THB", fallbackUsdThb, "manual");
    setRate("THB", "LAK", fallbackUsdLak / fallbackUsdThb, "manual");

    const satsToLak = btcPriceLAK.value / 100000000;
    const satsToThb = btcPriceTHB.value / 100000000;
    const satsToUsd = fallbackBtcUsd / 100000000;

    setRate("SATS", "USD", satsToUsd, "manual");
    setRate("SATS", "LAK", satsToLak, "manual");
    setRate("SATS", "THB", satsToThb, "manual");
    setRate("SATS", "BTC", 1 / 100000000, "manual");

    setRate("LAK", "SATS", 1 / satsToLak, "manual");
    setRate("THB", "SATS", 1 / satsToThb, "manual");
    setRate("USD", "SATS", 1 / satsToUsd, "manual");
  };

  /**
   * Set exchange rate
   */
  const setRate = (
    from: CurrencyCode,
    to: CurrencyCode,
    rate: number,
    source: "api" | "manual" | "oracle"
  ) => {
    const key = `${from}-${to}`;
    exchangeRates.value.set(key, {
      from,
      to,
      rate,
      source,
      updatedAt: new Date().toISOString(),
    });

    // Also set inverse
    const inverseKey = `${to}-${from}`;
    if (!exchangeRates.value.has(inverseKey)) {
      exchangeRates.value.set(inverseKey, {
        from: to,
        to: from,
        rate: 1 / rate,
        source,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  /**
   * Get exchange rate between two currencies
   */
  const getRate = (from: CurrencyCode, to: CurrencyCode): number => {
    if (from === to) return 1;

    const key = `${from}-${to}`;
    const rate = exchangeRates.value.get(key);

    if (rate) return rate.rate;

    // Try to calculate through USD
    const fromUsd = exchangeRates.value.get(`${from}-USD`)?.rate;
    const usdTo = exchangeRates.value.get(`USD-${to}`)?.rate;

    if (fromUsd && usdTo) {
      return fromUsd * usdTo;
    }

    // Try through SATS
    const fromSats = exchangeRates.value.get(`${from}-SATS`)?.rate;
    const satsTo = exchangeRates.value.get(`SATS-${to}`)?.rate;

    if (fromSats && satsTo) {
      return fromSats * satsTo;
    }

    console.warn(
      `No rate found for ${from} to ${to}, using fallback calculation`
    );

    // Last resort: calculate through BTC
    const fromBtc =
      exchangeRates.value.get(`${from}-BTC`)?.rate ||
      1 / (exchangeRates.value.get(`BTC-${from}`)?.rate || 1);
    const btcTo = exchangeRates.value.get(`BTC-${to}`)?.rate || 1;

    return fromBtc * btcTo;
  };

  /**
   * Convert amount between currencies
   */
  const convert = (
    amount: number,
    from: CurrencyCode,
    to: CurrencyCode
  ): number => {
    const rate = getRate(from, to);
    return amount * rate;
  };

  /**
   * Convert amount to SATS (for Lightning payments)
   */
  const toSats = (amount: number, from: CurrencyCode): number => {
    if (from === "SATS") return Math.round(amount);
    if (from === "BTC") return Math.round(amount * 100000000);

    // If rates not loaded yet, use fallback calculation
    if (exchangeRates.value.size === 0) {
      console.warn("Exchange rates not loaded yet, using fallback for toSats");
      // Fallback rates: 1 BTC = $100,000, 1 USD = 20,500 LAK
      const fallbackBtcUsd = 100000;
      const fallbackUsdLak = 20500;
      const fallbackUsdThb = 35;
      const satsPerBtc = 100000000;

      if (from === "USD") {
        return Math.round((amount / fallbackBtcUsd) * satsPerBtc);
      } else if (from === "LAK") {
        const usd = amount / fallbackUsdLak;
        return Math.round((usd / fallbackBtcUsd) * satsPerBtc);
      } else if (from === "THB") {
        const usd = amount / fallbackUsdThb;
        return Math.round((usd / fallbackBtcUsd) * satsPerBtc);
      }
    }

    const rate = getRate(from, "SATS");
    return Math.round(amount * rate);
  };

  /**
   * Convert SATS to fiat
   */
  const fromSats = (sats: number, to: CurrencyCode): number => {
    if (to === "SATS") return sats;
    if (to === "BTC") return sats / 100000000;

    return convert(sats, "SATS", to);
  };

  /**
   * Format currency for display
   */
  const format = (
    amount: number,
    currency: CurrencyCode = displayCurrency.value,
    options?: { showSymbol?: boolean; showCode?: boolean }
  ): string => {
    const curr = CURRENCIES[currency];
    if (!curr) return `${amount}`;

    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: Math.min(curr.decimals, 2),
      maximumFractionDigits: curr.decimals,
    }).format(amount);

    if (options?.showCode) {
      return `${formatted} ${currency}`;
    }

    if (options?.showSymbol !== false) {
      return currency === "SATS"
        ? `${formatted} sats`
        : `${curr.symbol}${formatted}`;
    }

    return formatted;
  };

  /**
   * Format with both fiat and sats
   */
  const formatDual = (
    amount: number,
    currency: CurrencyCode
  ): { fiat: string; sats: string } => {
    const sats = toSats(amount, currency);
    return {
      fiat: format(amount, currency),
      sats: format(sats, "SATS"),
    };
  };

  /**
   * Create multi-price object for a product
   */
  const createMultiPrice = (
    baseAmount: number,
    baseCurrency: CurrencyCode
  ): MultiPrice => {
    return {
      LAK: Math.round(convert(baseAmount, baseCurrency, "LAK")),
      THB: Math.round(convert(baseAmount, baseCurrency, "THB") * 100) / 100,
      USD: Math.round(convert(baseAmount, baseCurrency, "USD") * 100) / 100,
      BTC: convert(baseAmount, baseCurrency, "BTC"),
      SATS: toSats(baseAmount, baseCurrency),
    };
  };

  /**
   * Get price in preferred currency from MultiPrice
   */
  const getPriceInCurrency = (
    prices: MultiPrice,
    currency: CurrencyCode
  ): number => {
    return prices[currency] || 0;
  };

  // ============================================
  // API Fetch Functions
  // ============================================

  /**
   * Fetch BTC prices from blockchain.info ticker
   * This API provides BTC price in multiple currencies including LAK and THB
   */
  const fetchBTCPrices = async (): Promise<Record<string, number>> => {
    try {
      const response = await fetch(PRICE_APIS.blockchain);
      if (response.ok) {
        const data = await response.json();
        // blockchain.info returns: { USD: { last: 100000 }, THB: { last: 3500000 }, ... }
        return {
          USD: data.USD?.last || 100000,
          THB: data.THB?.last || 3500000,
          // LAK is not directly available, we'll calculate it
        };
      }
    } catch (e) {
      console.warn("blockchain.info API failed:", e);
    }

    // Fallback to mempool.space
    try {
      const response = await fetch(PRICE_APIS.mempool);
      if (response.ok) {
        const data = await response.json();
        return { USD: data.USD || 100000 };
      }
    } catch (e) {
      console.warn("mempool.space API failed:", e);
    }

    return { USD: 100000 }; // Fallback
  };

  /**
   * Fetch fiat exchange rates from fawazahmed currency API
   * Returns rates relative to USD
   */
  const fetchFiatRates = async (): Promise<Record<string, number>> => {
    try {
      const response = await fetch(PRICE_APIS.fawazahmed);
      if (response.ok) {
        const data = await response.json();
        // API returns: { usd: { lak: 20500, thb: 35, ... } }
        return {
          lak: data.usd?.lak || 20500,
          thb: data.usd?.thb || 35,
          btc: data.usd?.btc || 0.00001, // USD to BTC rate
        };
      }
    } catch (e) {
      console.warn("fawazahmed currency API failed:", e);
    }

    // Return approximate rates
    return { lak: 20500, thb: 35 };
  };

  // ============================================
  // Auto-refresh
  // ============================================

  const startAutoRefresh = (intervalMs: number = 300000) => {
    // 5 minutes
    stopAutoRefresh();
    refreshInterval = setInterval(refreshRates, intervalMs);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  };

  // ============================================
  // Computed
  // ============================================

  const currencies = computed(() => Object.values(CURRENCIES));

  const currentCurrency = computed(() => CURRENCIES[displayCurrency.value]);

  const btcPriceFormatted = computed(() => format(btcPrice.value, "USD"));

  const satPriceInLak = computed(() => {
    const rate = getRate("SATS", "LAK");
    return format(rate, "LAK");
  });

  // Cleanup on unmount
  watch(
    () => {},
    () => {},
    {
      flush: "post",
      onTrigger: () => {
        stopAutoRefresh();
      },
    }
  );

  return {
    // State
    baseCurrency,
    displayCurrency,
    exchangeRates,
    btcPrice,
    btcPriceLAK,
    btcPriceTHB,
    isLoading,
    lastUpdate,
    error,
    isInitialized,

    // Computed
    currencies,
    currentCurrency,
    btcPriceFormatted,
    satPriceInLak,

    // Methods
    init,
    refreshRates,
    getRate,
    convert,
    toSats,
    fromSats,
    format,
    formatCurrency: format, // Alias for backward compatibility
    formatDual,
    createMultiPrice,
    getPriceInCurrency,
    setRate,
    startAutoRefresh,
    stopAutoRefresh,
  };
};
