/**
 * TypeScript types for country-centric VPN recommendations
 *
 * This file defines the structure for the new country-first VPN UI
 * where countries are the primary focus and VPN providers are secondary.
 */

export type LanguageMatchQuality = 'Perfect' | 'Good' | 'Partial' | 'None';

/**
 * Summary information about a VPN provider for a specific country
 */
export interface VpnProviderSummary {
  vpnProviderId: string;
  vpnProviderName: string;
  vpnProviderLogoUrl?: string;
  rating: number;
  price?: number;
  currency?: string;
  serverCount?: number;
  affiliateLink?: string;
  speedMbps?: number;
  features?: string[];
}

/**
 * Comprehensive country recommendation with language support and VPN options
 */
export interface CountryRecommendation {
  countryCode: string;
  countryName: string;
  countryFlag: string;

  // Language support
  audioLanguages: string[];
  subtitleLanguages: string[];
  languageScore: number;
  languageMatchQuality: LanguageMatchQuality;
  languageHighlights: string[];

  // VPN availability
  availableVpnProviders: VpnProviderSummary[];

  // Streaming services
  streamingServices: string[];

  // Ranking
  rank: number;
}

/**
 * Response from the countries-for-content API endpoint
 */
export interface CountriesForContentResponse {
  contentId: string;
  contentTitle: string;
  userAudioLanguages: string[];
  userSubtitleLanguages: string[];
  countries: CountryRecommendation[];
  totalCountries: number;
  generatedAt: string;
}

/**
 * Grouped countries by match quality for the modal display
 */
export interface GroupedCountries {
  perfect: CountryRecommendation[];
  good: CountryRecommendation[];
  partial: CountryRecommendation[];
  other: CountryRecommendation[];
}
