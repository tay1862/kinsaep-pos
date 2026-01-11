/**
 * Comprehensive currency data based on ISO 4217
 * Includes major world currencies with symbols, decimals, and names
 */

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  countries?: string[]; // Countries where primarily used
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  // Cryptocurrencies
  BTC: {
    code: "BTC",
    name: "Bitcoin",
    symbol: "₿",
    decimals: 8,
    countries: ["Global"],
  },
  SATS: {
    code: "SATS",
    name: "Satoshis",
    symbol: "sats",
    decimals: 0,
    countries: ["Global"],
  },

  // Major World Currencies
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    decimals: 2,
    countries: ["US", "EC", "PA", "SV"],
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    decimals: 2,
    countries: ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "IE", "FI", "GR"],
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    decimals: 2,
    countries: ["GB"],
  },
  JPY: {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    decimals: 0,
    countries: ["JP"],
  },
  CNY: {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "¥",
    decimals: 2,
    countries: ["CN"],
  },

  // Asian Currencies
  THB: {
    code: "THB",
    name: "Thai Baht",
    symbol: "฿",
    decimals: 2,
    countries: ["TH"],
  },
  LAK: {
    code: "LAK",
    name: "Lao Kip",
    symbol: "₭",
    decimals: 0,
    countries: ["LA"],
  },
  INR: {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    decimals: 2,
    countries: ["IN"],
  },
  SGD: {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    decimals: 2,
    countries: ["SG"],
  },
  HKD: {
    code: "HKD",
    name: "Hong Kong Dollar",
    symbol: "HK$",
    decimals: 2,
    countries: ["HK"],
  },
  MYR: {
    code: "MYR",
    name: "Malaysian Ringgit",
    symbol: "RM",
    decimals: 2,
    countries: ["MY"],
  },
  PHP: {
    code: "PHP",
    name: "Philippine Peso",
    symbol: "₱",
    decimals: 2,
    countries: ["PH"],
  },
  IDR: {
    code: "IDR",
    name: "Indonesian Rupiah",
    symbol: "Rp",
    decimals: 0,
    countries: ["ID"],
  },
  VND: {
    code: "VND",
    name: "Vietnamese Dong",
    symbol: "₫",
    decimals: 0,
    countries: ["VN"],
  },
  KRW: {
    code: "KRW",
    name: "South Korean Won",
    symbol: "₩",
    decimals: 0,
    countries: ["KR"],
  },
  TWD: {
    code: "TWD",
    name: "Taiwan Dollar",
    symbol: "NT$",
    decimals: 2,
    countries: ["TW"],
  },
  PKR: {
    code: "PKR",
    name: "Pakistani Rupee",
    symbol: "₨",
    decimals: 2,
    countries: ["PK"],
  },
  BDT: {
    code: "BDT",
    name: "Bangladeshi Taka",
    symbol: "৳",
    decimals: 2,
    countries: ["BD"],
  },
  LKR: {
    code: "LKR",
    name: "Sri Lankan Rupee",
    symbol: "Rs",
    decimals: 2,
    countries: ["LK"],
  },
  NPR: {
    code: "NPR",
    name: "Nepalese Rupee",
    symbol: "Rs",
    decimals: 2,
    countries: ["NP"],
  },
  MMK: {
    code: "MMK",
    name: "Myanmar Kyat",
    symbol: "K",
    decimals: 0,
    countries: ["MM"],
  },
  KHR: {
    code: "KHR",
    name: "Cambodian Riel",
    symbol: "៛",
    decimals: 0,
    countries: ["KH"],
  },
  BND: {
    code: "BND",
    name: "Brunei Dollar",
    symbol: "B$",
    decimals: 2,
    countries: ["BN"],
  },
  MOP: {
    code: "MOP",
    name: "Macanese Pataca",
    symbol: "MOP$",
    decimals: 2,
    countries: ["MO"],
  },

  // Oceania
  AUD: {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    decimals: 2,
    countries: ["AU"],
  },
  NZD: {
    code: "NZD",
    name: "New Zealand Dollar",
    symbol: "NZ$",
    decimals: 2,
    countries: ["NZ"],
  },

  // Americas
  CAD: {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "C$",
    decimals: 2,
    countries: ["CA"],
  },
  MXN: {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "MX$",
    decimals: 2,
    countries: ["MX"],
  },
  BRL: {
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    decimals: 2,
    countries: ["BR"],
  },
  ARS: {
    code: "ARS",
    name: "Argentine Peso",
    symbol: "$",
    decimals: 2,
    countries: ["AR"],
  },
  CLP: {
    code: "CLP",
    name: "Chilean Peso",
    symbol: "$",
    decimals: 0,
    countries: ["CL"],
  },
  COP: {
    code: "COP",
    name: "Colombian Peso",
    symbol: "$",
    decimals: 0,
    countries: ["CO"],
  },
  PEN: {
    code: "PEN",
    name: "Peruvian Sol",
    symbol: "S/",
    decimals: 2,
    countries: ["PE"],
  },
  UYU: {
    code: "UYU",
    name: "Uruguayan Peso",
    symbol: "$U",
    decimals: 2,
    countries: ["UY"],
  },
  VES: {
    code: "VES",
    name: "Venezuelan Bolívar",
    symbol: "Bs.",
    decimals: 2,
    countries: ["VE"],
  },

  // Middle East
  AED: {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    decimals: 2,
    countries: ["AE"],
  },
  SAR: {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "﷼",
    decimals: 2,
    countries: ["SA"],
  },
  QAR: {
    code: "QAR",
    name: "Qatari Riyal",
    symbol: "﷼",
    decimals: 2,
    countries: ["QA"],
  },
  KWD: {
    code: "KWD",
    name: "Kuwaiti Dinar",
    symbol: "د.ك",
    decimals: 3,
    countries: ["KW"],
  },
  BHD: {
    code: "BHD",
    name: "Bahraini Dinar",
    symbol: "د.ب",
    decimals: 3,
    countries: ["BH"],
  },
  OMR: {
    code: "OMR",
    name: "Omani Rial",
    symbol: "﷼",
    decimals: 3,
    countries: ["OM"],
  },
  ILS: {
    code: "ILS",
    name: "Israeli Shekel",
    symbol: "₪",
    decimals: 2,
    countries: ["IL"],
  },
  JOD: {
    code: "JOD",
    name: "Jordanian Dinar",
    symbol: "د.ا",
    decimals: 3,
    countries: ["JO"],
  },
  LBP: {
    code: "LBP",
    name: "Lebanese Pound",
    symbol: "ل.ل",
    decimals: 0,
    countries: ["LB"],
  },
  IQD: {
    code: "IQD",
    name: "Iraqi Dinar",
    symbol: "ع.د",
    decimals: 0,
    countries: ["IQ"],
  },
  IRR: {
    code: "IRR",
    name: "Iranian Rial",
    symbol: "﷼",
    decimals: 0,
    countries: ["IR"],
  },
  TRY: {
    code: "TRY",
    name: "Turkish Lira",
    symbol: "₺",
    decimals: 2,
    countries: ["TR"],
  },

  // Europe (Non-Euro)
  CHF: {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    decimals: 2,
    countries: ["CH", "LI"],
  },
  NOK: {
    code: "NOK",
    name: "Norwegian Krone",
    symbol: "kr",
    decimals: 2,
    countries: ["NO"],
  },
  SEK: {
    code: "SEK",
    name: "Swedish Krona",
    symbol: "kr",
    decimals: 2,
    countries: ["SE"],
  },
  DKK: {
    code: "DKK",
    name: "Danish Krone",
    symbol: "kr",
    decimals: 2,
    countries: ["DK"],
  },
  PLN: {
    code: "PLN",
    name: "Polish Zloty",
    symbol: "zł",
    decimals: 2,
    countries: ["PL"],
  },
  CZK: {
    code: "CZK",
    name: "Czech Koruna",
    symbol: "Kč",
    decimals: 2,
    countries: ["CZ"],
  },
  HUF: {
    code: "HUF",
    name: "Hungarian Forint",
    symbol: "Ft",
    decimals: 0,
    countries: ["HU"],
  },
  RON: {
    code: "RON",
    name: "Romanian Leu",
    symbol: "lei",
    decimals: 2,
    countries: ["RO"],
  },
  BGN: {
    code: "BGN",
    name: "Bulgarian Lev",
    symbol: "лв",
    decimals: 2,
    countries: ["BG"],
  },
  HRK: {
    code: "HRK",
    name: "Croatian Kuna",
    symbol: "kn",
    decimals: 2,
    countries: ["HR"],
  },
  RUB: {
    code: "RUB",
    name: "Russian Ruble",
    symbol: "₽",
    decimals: 2,
    countries: ["RU"],
  },
  UAH: {
    code: "UAH",
    name: "Ukrainian Hryvnia",
    symbol: "₴",
    decimals: 2,
    countries: ["UA"],
  },
  ISK: {
    code: "ISK",
    name: "Icelandic Króna",
    symbol: "kr",
    decimals: 0,
    countries: ["IS"],
  },

  // Africa
  ZAR: {
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    decimals: 2,
    countries: ["ZA"],
  },
  NGN: {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    decimals: 2,
    countries: ["NG"],
  },
  EGP: {
    code: "EGP",
    name: "Egyptian Pound",
    symbol: "£",
    decimals: 2,
    countries: ["EG"],
  },
  KES: {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    decimals: 2,
    countries: ["KE"],
  },
  GHS: {
    code: "GHS",
    name: "Ghanaian Cedi",
    symbol: "₵",
    decimals: 2,
    countries: ["GH"],
  },
  TZS: {
    code: "TZS",
    name: "Tanzanian Shilling",
    symbol: "TSh",
    decimals: 0,
    countries: ["TZ"],
  },
  UGX: {
    code: "UGX",
    name: "Ugandan Shilling",
    symbol: "USh",
    decimals: 0,
    countries: ["UG"],
  },
  MAD: {
    code: "MAD",
    name: "Moroccan Dirham",
    symbol: "د.م.",
    decimals: 2,
    countries: ["MA"],
  },
  TND: {
    code: "TND",
    name: "Tunisian Dinar",
    symbol: "د.ت",
    decimals: 3,
    countries: ["TN"],
  },
  ETB: {
    code: "ETB",
    name: "Ethiopian Birr",
    symbol: "Br",
    decimals: 2,
    countries: ["ET"],
  },

  // Additional currencies
  NIO: {
    code: "NIO",
    name: "Nicaraguan Córdoba",
    symbol: "C$",
    decimals: 2,
    countries: ["NI"],
  },
  CRC: {
    code: "CRC",
    name: "Costa Rican Colón",
    symbol: "₡",
    decimals: 0,
    countries: ["CR"],
  },
  GTQ: {
    code: "GTQ",
    name: "Guatemalan Quetzal",
    symbol: "Q",
    decimals: 2,
    countries: ["GT"],
  },
  HNL: {
    code: "HNL",
    name: "Honduran Lempira",
    symbol: "L",
    decimals: 2,
    countries: ["HN"],
  },
  DOP: {
    code: "DOP",
    name: "Dominican Peso",
    symbol: "RD$",
    decimals: 2,
    countries: ["DO"],
  },
  BOB: {
    code: "BOB",
    name: "Bolivian Boliviano",
    symbol: "Bs.",
    decimals: 2,
    countries: ["BO"],
  },
  PYG: {
    code: "PYG",
    name: "Paraguayan Guaraní",
    symbol: "₲",
    decimals: 0,
    countries: ["PY"],
  },
};

/**
 * Get currency info by code
 */
export const getCurrencyInfo = (code: string): CurrencyInfo | undefined => {
  return CURRENCIES[code.toUpperCase()];
};

/**
 * Get all supported currency codes
 */
export const getSupportedCurrencies = (): string[] => {
  return Object.keys(CURRENCIES);
};

/**
 * Get currencies by region
 */
export const getCurrenciesByRegion = () => {
  return {
    crypto: ["BTC", "SATS"],
    asia: ["THB", "LAK", "INR", "SGD", "HKD", "MYR", "PHP", "IDR", "VND", "KRW", "TWD", "JPY", "CNY", "PKR", "BDT", "LKR", "NPR", "MMK", "KHR", "BND", "MOP"],
    europe: ["EUR", "GBP", "CHF", "NOK", "SEK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "UAH", "ISK"],
    americas: ["USD", "CAD", "MXN", "BRL", "ARS", "CLP", "COP", "PEN", "UYU", "VES", "NIO", "CRC", "GTQ", "HNL", "DOP", "BOB", "PYG"],
    middleEast: ["AED", "SAR", "QAR", "KWD", "BHD", "OMR", "ILS", "JOD", "LBP", "IQD", "IRR", "TRY"],
    africa: ["ZAR", "NGN", "EGP", "KES", "GHS", "TZS", "UGX", "MAD", "TND", "ETB"],
    oceania: ["AUD", "NZD"],
  };
};

/**
 * Detect currency from locale
 */
export const detectCurrencyFromLocale = (locale: string): string => {
  const localeMap: Record<string, string> = {
    "en-US": "USD",
    "en-GB": "GBP",
    "en-AU": "AUD",
    "en-CA": "CAD",
    "en-NZ": "NZD",
    "th-TH": "THB",
    "th": "THB",
    "lo-LA": "LAK",
    "lo": "LAK",
    "ja-JP": "JPY",
    "zh-CN": "CNY",
    "zh-TW": "TWD",
    "ko-KR": "KRW",
    "vi-VN": "VND",
    "id-ID": "IDR",
    "ms-MY": "MYR",
    "tl-PH": "PHP",
    "de-DE": "EUR",
    "fr-FR": "EUR",
    "it-IT": "EUR",
    "es-ES": "EUR",
    "pt-BR": "BRL",
    "ru-RU": "RUB",
    "ar-SA": "SAR",
    "ar-AE": "AED",
    "he-IL": "ILS",
    "tr-TR": "TRY",
    "pl-PL": "PLN",
    "cs-CZ": "CZK",
    "hu-HU": "HUF",
    "ro-RO": "RON",
    "sv-SE": "SEK",
    "no-NO": "NOK",
    "da-DK": "DKK",
    "fi-FI": "EUR",
    "nl-NL": "EUR",
    "pt-PT": "EUR",
    "el-GR": "EUR",
    "bg-BG": "BGN",
    "hr-HR": "HRK",
    "uk-UA": "UAH",
    "hi-IN": "INR",
    "bn-BD": "BDT",
    "ur-PK": "PKR",
  };

  return localeMap[locale] || "USD";
};
