/**
 * Comprehensive timezone data based on IANA Time Zone Database
 * Includes timezones for all major regions with UTC offsets and descriptions
 */

export interface TimezoneInfo {
  code: string; // IANA timezone identifier (e.g., "Asia/Bangkok")
  name: string; // Display name
  offset: string; // UTC offset (e.g., "+07:00")
  offsetMinutes: number; // Offset in minutes for sorting
  region: string; // Region grouping
  countries?: string[]; // ISO country codes where primarily used
}

export const TIMEZONES: Record<string, TimezoneInfo> = {
  // ============================================
  // Asia
  // ============================================
  "Asia/Vientiane": {
    code: "Asia/Vientiane",
    name: "Vientiane (Laos)",
    offset: "+07:00",
    offsetMinutes: 420,
    region: "asia",
    countries: ["LA"],
  },
  "Asia/Bangkok": {
    code: "Asia/Bangkok",
    name: "Bangkok (Thailand)",
    offset: "+07:00",
    offsetMinutes: 420,
    region: "asia",
    countries: ["TH"],
  },
  "Asia/Ho_Chi_Minh": {
    code: "Asia/Ho_Chi_Minh",
    name: "Ho Chi Minh City (Vietnam)",
    offset: "+07:00",
    offsetMinutes: 420,
    region: "asia",
    countries: ["VN"],
  },
  "Asia/Phnom_Penh": {
    code: "Asia/Phnom_Penh",
    name: "Phnom Penh (Cambodia)",
    offset: "+07:00",
    offsetMinutes: 420,
    region: "asia",
    countries: ["KH"],
  },
  "Asia/Jakarta": {
    code: "Asia/Jakarta",
    name: "Jakarta (Indonesia)",
    offset: "+07:00",
    offsetMinutes: 420,
    region: "asia",
    countries: ["ID"],
  },
  "Asia/Singapore": {
    code: "Asia/Singapore",
    name: "Singapore",
    offset: "+08:00",
    offsetMinutes: 480,
    region: "asia",
    countries: ["SG"],
  },
  "Asia/Kuala_Lumpur": {
    code: "Asia/Kuala_Lumpur",
    name: "Kuala Lumpur (Malaysia)",
    offset: "+08:00",
    offsetMinutes: 480,
    region: "asia",
    countries: ["MY"],
  },
  "Asia/Manila": {
    code: "Asia/Manila",
    name: "Manila (Philippines)",
    offset: "+08:00",
    offsetMinutes: 480,
    region: "asia",
    countries: ["PH"],
  },
  "Asia/Hong_Kong": {
    code: "Asia/Hong_Kong",
    name: "Hong Kong",
    offset: "+08:00",
    offsetMinutes: 480,
    region: "asia",
    countries: ["HK"],
  },
  "Asia/Shanghai": {
    code: "Asia/Shanghai",
    name: "Shanghai (China)",
    offset: "+08:00",
    offsetMinutes: 480,
    region: "asia",
    countries: ["CN"],
  },
  "Asia/Taipei": {
    code: "Asia/Taipei",
    name: "Taipei (Taiwan)",
    offset: "+08:00",
    offsetMinutes: 480,
    region: "asia",
    countries: ["TW"],
  },
  "Asia/Tokyo": {
    code: "Asia/Tokyo",
    name: "Tokyo (Japan)",
    offset: "+09:00",
    offsetMinutes: 540,
    region: "asia",
    countries: ["JP"],
  },
  "Asia/Seoul": {
    code: "Asia/Seoul",
    name: "Seoul (South Korea)",
    offset: "+09:00",
    offsetMinutes: 540,
    region: "asia",
    countries: ["KR"],
  },
  "Asia/Yangon": {
    code: "Asia/Yangon",
    name: "Yangon (Myanmar)",
    offset: "+06:30",
    offsetMinutes: 390,
    region: "asia",
    countries: ["MM"],
  },
  "Asia/Dhaka": {
    code: "Asia/Dhaka",
    name: "Dhaka (Bangladesh)",
    offset: "+06:00",
    offsetMinutes: 360,
    region: "asia",
    countries: ["BD"],
  },
  "Asia/Kolkata": {
    code: "Asia/Kolkata",
    name: "Kolkata (India)",
    offset: "+05:30",
    offsetMinutes: 330,
    region: "asia",
    countries: ["IN"],
  },
  "Asia/Colombo": {
    code: "Asia/Colombo",
    name: "Colombo (Sri Lanka)",
    offset: "+05:30",
    offsetMinutes: 330,
    region: "asia",
    countries: ["LK"],
  },
  "Asia/Kathmandu": {
    code: "Asia/Kathmandu",
    name: "Kathmandu (Nepal)",
    offset: "+05:45",
    offsetMinutes: 345,
    region: "asia",
    countries: ["NP"],
  },
  "Asia/Karachi": {
    code: "Asia/Karachi",
    name: "Karachi (Pakistan)",
    offset: "+05:00",
    offsetMinutes: 300,
    region: "asia",
    countries: ["PK"],
  },
  "Asia/Tashkent": {
    code: "Asia/Tashkent",
    name: "Tashkent (Uzbekistan)",
    offset: "+05:00",
    offsetMinutes: 300,
    region: "asia",
    countries: ["UZ"],
  },
  "Asia/Dubai": {
    code: "Asia/Dubai",
    name: "Dubai (UAE)",
    offset: "+04:00",
    offsetMinutes: 240,
    region: "asia",
    countries: ["AE"],
  },
  "Asia/Muscat": {
    code: "Asia/Muscat",
    name: "Muscat (Oman)",
    offset: "+04:00",
    offsetMinutes: 240,
    region: "asia",
    countries: ["OM"],
  },
  "Asia/Riyadh": {
    code: "Asia/Riyadh",
    name: "Riyadh (Saudi Arabia)",
    offset: "+03:00",
    offsetMinutes: 180,
    region: "asia",
    countries: ["SA"],
  },
  "Asia/Kuwait": {
    code: "Asia/Kuwait",
    name: "Kuwait",
    offset: "+03:00",
    offsetMinutes: 180,
    region: "asia",
    countries: ["KW"],
  },
  "Asia/Qatar": {
    code: "Asia/Qatar",
    name: "Doha (Qatar)",
    offset: "+03:00",
    offsetMinutes: 180,
    region: "asia",
    countries: ["QA"],
  },
  "Asia/Bahrain": {
    code: "Asia/Bahrain",
    name: "Manama (Bahrain)",
    offset: "+03:00",
    offsetMinutes: 180,
    region: "asia",
    countries: ["BH"],
  },
  "Asia/Jerusalem": {
    code: "Asia/Jerusalem",
    name: "Jerusalem (Israel)",
    offset: "+02:00",
    offsetMinutes: 120,
    region: "asia",
    countries: ["IL"],
  },
  "Asia/Amman": {
    code: "Asia/Amman",
    name: "Amman (Jordan)",
    offset: "+03:00",
    offsetMinutes: 180,
    region: "asia",
    countries: ["JO"],
  },
  "Asia/Beirut": {
    code: "Asia/Beirut",
    name: "Beirut (Lebanon)",
    offset: "+02:00",
    offsetMinutes: 120,
    region: "asia",
    countries: ["LB"],
  },
  "Asia/Tehran": {
    code: "Asia/Tehran",
    name: "Tehran (Iran)",
    offset: "+03:30",
    offsetMinutes: 210,
    region: "asia",
    countries: ["IR"],
  },
  "Asia/Baghdad": {
    code: "Asia/Baghdad",
    name: "Baghdad (Iraq)",
    offset: "+03:00",
    offsetMinutes: 180,
    region: "asia",
    countries: ["IQ"],
  },
  "Asia/Brunei": {
    code: "Asia/Brunei",
    name: "Brunei",
    offset: "+08:00",
    offsetMinutes: 480,
    region: "asia",
    countries: ["BN"],
  },
  "Asia/Makassar": {
    code: "Asia/Makassar",
    name: "Makassar (Indonesia)",
    offset: "+08:00",
    offsetMinutes: 480,
    region: "asia",
    countries: ["ID"],
  },
  "Asia/Jayapura": {
    code: "Asia/Jayapura",
    name: "Jayapura (Indonesia)",
    offset: "+09:00",
    offsetMinutes: 540,
    region: "asia",
    countries: ["ID"],
  },

  // ============================================
  // Europe
  // ============================================
  "Europe/London": {
    code: "Europe/London",
    name: "London (UK)",
    offset: "+00:00",
    offsetMinutes: 0,
    region: "europe",
    countries: ["GB"],
  },
  "Europe/Paris": {
    code: "Europe/Paris",
    name: "Paris (France)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["FR"],
  },
  "Europe/Berlin": {
    code: "Europe/Berlin",
    name: "Berlin (Germany)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["DE"],
  },
  "Europe/Rome": {
    code: "Europe/Rome",
    name: "Rome (Italy)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["IT"],
  },
  "Europe/Madrid": {
    code: "Europe/Madrid",
    name: "Madrid (Spain)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["ES"],
  },
  "Europe/Amsterdam": {
    code: "Europe/Amsterdam",
    name: "Amsterdam (Netherlands)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["NL"],
  },
  "Europe/Brussels": {
    code: "Europe/Brussels",
    name: "Brussels (Belgium)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["BE"],
  },
  "Europe/Vienna": {
    code: "Europe/Vienna",
    name: "Vienna (Austria)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["AT"],
  },
  "Europe/Zurich": {
    code: "Europe/Zurich",
    name: "Zurich (Switzerland)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["CH"],
  },
  "Europe/Stockholm": {
    code: "Europe/Stockholm",
    name: "Stockholm (Sweden)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["SE"],
  },
  "Europe/Oslo": {
    code: "Europe/Oslo",
    name: "Oslo (Norway)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["NO"],
  },
  "Europe/Copenhagen": {
    code: "Europe/Copenhagen",
    name: "Copenhagen (Denmark)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["DK"],
  },
  "Europe/Helsinki": {
    code: "Europe/Helsinki",
    name: "Helsinki (Finland)",
    offset: "+02:00",
    offsetMinutes: 120,
    region: "europe",
    countries: ["FI"],
  },
  "Europe/Athens": {
    code: "Europe/Athens",
    name: "Athens (Greece)",
    offset: "+02:00",
    offsetMinutes: 120,
    region: "europe",
    countries: ["GR"],
  },
  "Europe/Bucharest": {
    code: "Europe/Bucharest",
    name: "Bucharest (Romania)",
    offset: "+02:00",
    offsetMinutes: 120,
    region: "europe",
    countries: ["RO"],
  },
  "Europe/Sofia": {
    code: "Europe/Sofia",
    name: "Sofia (Bulgaria)",
    offset: "+02:00",
    offsetMinutes: 120,
    region: "europe",
    countries: ["BG"],
  },
  "Europe/Warsaw": {
    code: "Europe/Warsaw",
    name: "Warsaw (Poland)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["PL"],
  },
  "Europe/Prague": {
    code: "Europe/Prague",
    name: "Prague (Czech Republic)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["CZ"],
  },
  "Europe/Budapest": {
    code: "Europe/Budapest",
    name: "Budapest (Hungary)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["HU"],
  },
  "Europe/Dublin": {
    code: "Europe/Dublin",
    name: "Dublin (Ireland)",
    offset: "+00:00",
    offsetMinutes: 0,
    region: "europe",
    countries: ["IE"],
  },
  "Europe/Lisbon": {
    code: "Europe/Lisbon",
    name: "Lisbon (Portugal)",
    offset: "+00:00",
    offsetMinutes: 0,
    region: "europe",
    countries: ["PT"],
  },
  "Europe/Moscow": {
    code: "Europe/Moscow",
    name: "Moscow (Russia)",
    offset: "+03:00",
    offsetMinutes: 180,
    region: "europe",
    countries: ["RU"],
  },
  "Europe/Kiev": {
    code: "Europe/Kiev",
    name: "Kyiv (Ukraine)",
    offset: "+02:00",
    offsetMinutes: 120,
    region: "europe",
    countries: ["UA"],
  },
  "Europe/Istanbul": {
    code: "Europe/Istanbul",
    name: "Istanbul (Turkey)",
    offset: "+03:00",
    offsetMinutes: 180,
    region: "europe",
    countries: ["TR"],
  },
  "Europe/Reykjavik": {
    code: "Europe/Reykjavik",
    name: "Reykjavik (Iceland)",
    offset: "+00:00",
    offsetMinutes: 0,
    region: "europe",
    countries: ["IS"],
  },
  "Europe/Zagreb": {
    code: "Europe/Zagreb",
    name: "Zagreb (Croatia)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "europe",
    countries: ["HR"],
  },

  // ============================================
  // Americas
  // ============================================
  "America/New_York": {
    code: "America/New_York",
    name: "New York (Eastern)",
    offset: "-05:00",
    offsetMinutes: -300,
    region: "americas",
    countries: ["US"],
  },
  "America/Chicago": {
    code: "America/Chicago",
    name: "Chicago (Central)",
    offset: "-06:00",
    offsetMinutes: -360,
    region: "americas",
    countries: ["US"],
  },
  "America/Denver": {
    code: "America/Denver",
    name: "Denver (Mountain)",
    offset: "-07:00",
    offsetMinutes: -420,
    region: "americas",
    countries: ["US"],
  },
  "America/Los_Angeles": {
    code: "America/Los_Angeles",
    name: "Los Angeles (Pacific)",
    offset: "-08:00",
    offsetMinutes: -480,
    region: "americas",
    countries: ["US"],
  },
  "America/Anchorage": {
    code: "America/Anchorage",
    name: "Anchorage (Alaska)",
    offset: "-09:00",
    offsetMinutes: -540,
    region: "americas",
    countries: ["US"],
  },
  "Pacific/Honolulu": {
    code: "Pacific/Honolulu",
    name: "Honolulu (Hawaii)",
    offset: "-10:00",
    offsetMinutes: -600,
    region: "americas",
    countries: ["US"],
  },
  "America/Toronto": {
    code: "America/Toronto",
    name: "Toronto (Canada)",
    offset: "-05:00",
    offsetMinutes: -300,
    region: "americas",
    countries: ["CA"],
  },
  "America/Vancouver": {
    code: "America/Vancouver",
    name: "Vancouver (Canada)",
    offset: "-08:00",
    offsetMinutes: -480,
    region: "americas",
    countries: ["CA"],
  },
  "America/Mexico_City": {
    code: "America/Mexico_City",
    name: "Mexico City",
    offset: "-06:00",
    offsetMinutes: -360,
    region: "americas",
    countries: ["MX"],
  },
  "America/Sao_Paulo": {
    code: "America/Sao_Paulo",
    name: "São Paulo (Brazil)",
    offset: "-03:00",
    offsetMinutes: -180,
    region: "americas",
    countries: ["BR"],
  },
  "America/Buenos_Aires": {
    code: "America/Buenos_Aires",
    name: "Buenos Aires (Argentina)",
    offset: "-03:00",
    offsetMinutes: -180,
    region: "americas",
    countries: ["AR"],
  },
  "America/Santiago": {
    code: "America/Santiago",
    name: "Santiago (Chile)",
    offset: "-04:00",
    offsetMinutes: -240,
    region: "americas",
    countries: ["CL"],
  },
  "America/Lima": {
    code: "America/Lima",
    name: "Lima (Peru)",
    offset: "-05:00",
    offsetMinutes: -300,
    region: "americas",
    countries: ["PE"],
  },
  "America/Bogota": {
    code: "America/Bogota",
    name: "Bogotá (Colombia)",
    offset: "-05:00",
    offsetMinutes: -300,
    region: "americas",
    countries: ["CO"],
  },
  "America/Caracas": {
    code: "America/Caracas",
    name: "Caracas (Venezuela)",
    offset: "-04:00",
    offsetMinutes: -240,
    region: "americas",
    countries: ["VE"],
  },
  "America/Montevideo": {
    code: "America/Montevideo",
    name: "Montevideo (Uruguay)",
    offset: "-03:00",
    offsetMinutes: -180,
    region: "americas",
    countries: ["UY"],
  },
  "America/Panama": {
    code: "America/Panama",
    name: "Panama City",
    offset: "-05:00",
    offsetMinutes: -300,
    region: "americas",
    countries: ["PA"],
  },
  "America/Guatemala": {
    code: "America/Guatemala",
    name: "Guatemala City",
    offset: "-06:00",
    offsetMinutes: -360,
    region: "americas",
    countries: ["GT"],
  },
  "America/Costa_Rica": {
    code: "America/Costa_Rica",
    name: "San José (Costa Rica)",
    offset: "-06:00",
    offsetMinutes: -360,
    region: "americas",
    countries: ["CR"],
  },
  "America/El_Salvador": {
    code: "America/El_Salvador",
    name: "San Salvador",
    offset: "-06:00",
    offsetMinutes: -360,
    region: "americas",
    countries: ["SV"],
  },
  "America/Tegucigalpa": {
    code: "America/Tegucigalpa",
    name: "Tegucigalpa (Honduras)",
    offset: "-06:00",
    offsetMinutes: -360,
    region: "americas",
    countries: ["HN"],
  },
  "America/Managua": {
    code: "America/Managua",
    name: "Managua (Nicaragua)",
    offset: "-06:00",
    offsetMinutes: -360,
    region: "americas",
    countries: ["NI"],
  },
  "America/Santo_Domingo": {
    code: "America/Santo_Domingo",
    name: "Santo Domingo",
    offset: "-04:00",
    offsetMinutes: -240,
    region: "americas",
    countries: ["DO"],
  },
  "America/Asuncion": {
    code: "America/Asuncion",
    name: "Asunción (Paraguay)",
    offset: "-04:00",
    offsetMinutes: -240,
    region: "americas",
    countries: ["PY"],
  },
  "America/La_Paz": {
    code: "America/La_Paz",
    name: "La Paz (Bolivia)",
    offset: "-04:00",
    offsetMinutes: -240,
    region: "americas",
    countries: ["BO"],
  },

  // ============================================
  // Africa
  // ============================================
  "Africa/Cairo": {
    code: "Africa/Cairo",
    name: "Cairo (Egypt)",
    offset: "+02:00",
    offsetMinutes: 120,
    region: "africa",
    countries: ["EG"],
  },
  "Africa/Johannesburg": {
    code: "Africa/Johannesburg",
    name: "Johannesburg (South Africa)",
    offset: "+02:00",
    offsetMinutes: 120,
    region: "africa",
    countries: ["ZA"],
  },
  "Africa/Lagos": {
    code: "Africa/Lagos",
    name: "Lagos (Nigeria)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "africa",
    countries: ["NG"],
  },
  "Africa/Nairobi": {
    code: "Africa/Nairobi",
    name: "Nairobi (Kenya)",
    offset: "+03:00",
    offsetMinutes: 180,
    region: "africa",
    countries: ["KE"],
  },
  "Africa/Casablanca": {
    code: "Africa/Casablanca",
    name: "Casablanca (Morocco)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "africa",
    countries: ["MA"],
  },
  "Africa/Accra": {
    code: "Africa/Accra",
    name: "Accra (Ghana)",
    offset: "+00:00",
    offsetMinutes: 0,
    region: "africa",
    countries: ["GH"],
  },
  "Africa/Dar_es_Salaam": {
    code: "Africa/Dar_es_Salaam",
    name: "Dar es Salaam (Tanzania)",
    offset: "+03:00",
    offsetMinutes: 180,
    region: "africa",
    countries: ["TZ"],
  },
  "Africa/Kampala": {
    code: "Africa/Kampala",
    name: "Kampala (Uganda)",
    offset: "+03:00",
    offsetMinutes: 180,
    region: "africa",
    countries: ["UG"],
  },
  "Africa/Tunis": {
    code: "Africa/Tunis",
    name: "Tunis (Tunisia)",
    offset: "+01:00",
    offsetMinutes: 60,
    region: "africa",
    countries: ["TN"],
  },
  "Africa/Addis_Ababa": {
    code: "Africa/Addis_Ababa",
    name: "Addis Ababa (Ethiopia)",
    offset: "+03:00",
    offsetMinutes: 180,
    region: "africa",
    countries: ["ET"],
  },

  // ============================================
  // Oceania
  // ============================================
  "Australia/Sydney": {
    code: "Australia/Sydney",
    name: "Sydney (Australia)",
    offset: "+11:00",
    offsetMinutes: 660,
    region: "oceania",
    countries: ["AU"],
  },
  "Australia/Melbourne": {
    code: "Australia/Melbourne",
    name: "Melbourne (Australia)",
    offset: "+11:00",
    offsetMinutes: 660,
    region: "oceania",
    countries: ["AU"],
  },
  "Australia/Brisbane": {
    code: "Australia/Brisbane",
    name: "Brisbane (Australia)",
    offset: "+10:00",
    offsetMinutes: 600,
    region: "oceania",
    countries: ["AU"],
  },
  "Australia/Perth": {
    code: "Australia/Perth",
    name: "Perth (Australia)",
    offset: "+08:00",
    offsetMinutes: 480,
    region: "oceania",
    countries: ["AU"],
  },
  "Australia/Adelaide": {
    code: "Australia/Adelaide",
    name: "Adelaide (Australia)",
    offset: "+10:30",
    offsetMinutes: 630,
    region: "oceania",
    countries: ["AU"],
  },
  "Pacific/Auckland": {
    code: "Pacific/Auckland",
    name: "Auckland (New Zealand)",
    offset: "+13:00",
    offsetMinutes: 780,
    region: "oceania",
    countries: ["NZ"],
  },
  "Pacific/Fiji": {
    code: "Pacific/Fiji",
    name: "Fiji",
    offset: "+12:00",
    offsetMinutes: 720,
    region: "oceania",
    countries: ["FJ"],
  },
  "Pacific/Guam": {
    code: "Pacific/Guam",
    name: "Guam",
    offset: "+10:00",
    offsetMinutes: 600,
    region: "oceania",
    countries: ["GU"],
  },
  "Pacific/Port_Moresby": {
    code: "Pacific/Port_Moresby",
    name: "Port Moresby (Papua New Guinea)",
    offset: "+10:00",
    offsetMinutes: 600,
    region: "oceania",
    countries: ["PG"],
  },

  // ============================================
  // UTC / Special
  // ============================================
  UTC: {
    code: "UTC",
    name: "UTC (Coordinated Universal Time)",
    offset: "+00:00",
    offsetMinutes: 0,
    region: "utc",
    countries: [],
  },
  "Etc/GMT": {
    code: "Etc/GMT",
    name: "GMT (Greenwich Mean Time)",
    offset: "+00:00",
    offsetMinutes: 0,
    region: "utc",
    countries: [],
  },
};

/**
 * Get timezone info by code
 */
export const getTimezoneInfo = (code: string): TimezoneInfo | undefined => {
  return TIMEZONES[code];
};

/**
 * Get all supported timezone codes
 */
export const getSupportedTimezones = (): string[] => {
  return Object.keys(TIMEZONES);
};

/**
 * Get all timezones as array
 */
export const getAllTimezones = (): TimezoneInfo[] => {
  return Object.values(TIMEZONES);
};

/**
 * Get timezones grouped by region
 */
export const getTimezonesByRegion = () => {
  const grouped: Record<string, TimezoneInfo[]> = {
    asia: [],
    europe: [],
    americas: [],
    africa: [],
    oceania: [],
    utc: [],
  };

  Object.values(TIMEZONES).forEach((tz) => {
    const regionArray = grouped[tz.region];
    if (regionArray) {
      regionArray.push(tz);
    }
  });

  // Sort each region by offset
  Object.keys(grouped).forEach((region) => {
    const regionArray = grouped[region];
    if (regionArray) {
      regionArray.sort((a, b) => a.offsetMinutes - b.offsetMinutes);
    }
  });

  return grouped;
};

/**
 * Get timezones for dropdown options (formatted for USelect)
 */
export const getTimezoneOptions = () => {
  return getAllTimezones()
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
    .map((tz) => ({
      value: tz.code,
      label: `(UTC${tz.offset}) ${tz.name}`,
    }));
};

/**
 * Get popular timezones (commonly used)
 */
export const POPULAR_TIMEZONES = [
  "Asia/Vientiane",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

/**
 * Detect timezone from browser
 */
export const detectTimezone = (): string => {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Return detected if we have it in our list, otherwise fallback
    return TIMEZONES[detected] ? detected : "UTC";
  } catch {
    return "UTC";
  }
};

/**
 * Get timezone for a country code
 */
export const getTimezoneByCountry = (
  countryCode: string
): TimezoneInfo | undefined => {
  const code = countryCode.toUpperCase();
  return Object.values(TIMEZONES).find((tz) => tz.countries?.includes(code));
};
