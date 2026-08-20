/**
 * Utility functions for converting country codes to display names
 * Uses the Intl.DisplayNames API for localized country names
 */

// Cache the DisplayNames instance for better performance
let regionNamesCache: Intl.DisplayNames | null = null;

/**
 * Get the Intl.DisplayNames instance, creating it if needed
 */
function getRegionNames(): Intl.DisplayNames | null {
  if (regionNamesCache) {
    return regionNamesCache;
  }

  try {
    regionNamesCache = new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNamesCache;
  } catch {
    // Intl.DisplayNames not supported in this environment
    return null;
  }
}

/**
 * Convert a 2-letter country code to a full country name
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "AE")
 * @param fallbackName - Optional fallback name if conversion fails
 * @returns The full country name or the fallback/code if conversion fails
 *
 * @example
 * getCountryName("US") // "United States"
 * getCountryName("GB") // "United Kingdom"
 * getCountryName("AE") // "United Arab Emirates"
 * getCountryName("XX", "Unknown") // "Unknown"
 */
export function getCountryName(countryCode: string, fallbackName?: string): string {
  // If no code provided, use fallback
  if (!countryCode) {
    return fallbackName || 'Unknown';
  }

  // Normalize the code to uppercase
  const normalizedCode = countryCode.toUpperCase().trim();

  // If the input is already a full name (more than 3 characters), return it
  if (normalizedCode.length > 3 && fallbackName && fallbackName.length > 3) {
    return fallbackName;
  }

  const regionNames = getRegionNames();
  if (!regionNames) {
    return fallbackName || countryCode;
  }

  try {
    const displayName = regionNames.of(normalizedCode);
    // The API returns undefined for invalid codes
    if (displayName && displayName !== normalizedCode) {
      return displayName;
    }
    return fallbackName || countryCode;
  } catch {
    return fallbackName || countryCode;
  }
}

/**
 * Get a country flag emoji from a country code
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns The flag emoji or an empty string if invalid
 *
 * @example
 * getCountryFlag("US") // "🇺🇸"
 * getCountryFlag("GB") // "🇬🇧"
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return '';
  }

  const normalizedCode = countryCode.toUpperCase();

  // Convert country code to regional indicator symbols
  // Each letter A-Z maps to a regional indicator symbol A-Z (U+1F1E6 - U+1F1FF)
  const codePoints = [...normalizedCode].map(
    char => 0x1F1E6 + char.charCodeAt(0) - 65
  );

  return String.fromCodePoint(...codePoints);
}

/**
 * Get both country name and flag
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param fallbackName - Optional fallback name
 * @returns Object with name and flag
 */
export function getCountryDisplay(countryCode: string, fallbackName?: string): {
  name: string;
  flag: string;
} {
  return {
    name: getCountryName(countryCode, fallbackName),
    flag: getCountryFlag(countryCode),
  };
}

/**
 * Common country code mappings for quick lookup
 * Use this for server-side rendering or when Intl is not available
 */
export const COMMON_COUNTRY_NAMES: Record<string, string> = {
  AE: 'United Arab Emirates',
  AR: 'Argentina',
  AT: 'Austria',
  AU: 'Australia',
  BE: 'Belgium',
  BG: 'Bulgaria',
  BR: 'Brazil',
  CA: 'Canada',
  CH: 'Switzerland',
  CL: 'Chile',
  CO: 'Colombia',
  CZ: 'Czech Republic',
  DE: 'Germany',
  DK: 'Denmark',
  EE: 'Estonia',
  ES: 'Spain',
  FI: 'Finland',
  FR: 'France',
  GB: 'United Kingdom',
  GR: 'Greece',
  HK: 'Hong Kong',
  HR: 'Croatia',
  HU: 'Hungary',
  ID: 'Indonesia',
  IE: 'Ireland',
  IL: 'Israel',
  IN: 'India',
  IT: 'Italy',
  JP: 'Japan',
  KR: 'South Korea',
  LT: 'Lithuania',
  LV: 'Latvia',
  MX: 'Mexico',
  MY: 'Malaysia',
  NL: 'Netherlands',
  NO: 'Norway',
  NZ: 'New Zealand',
  PE: 'Peru',
  PH: 'Philippines',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  RU: 'Russia',
  SA: 'Saudi Arabia',
  SE: 'Sweden',
  SG: 'Singapore',
  SK: 'Slovakia',
  TH: 'Thailand',
  TR: 'Turkey',
  TW: 'Taiwan',
  UA: 'Ukraine',
  US: 'United States',
  VE: 'Venezuela',
  VN: 'Vietnam',
  ZA: 'South Africa',
};
