/**
 * TypeScript types for country-centric VPN recommendations (Mobile)
 *
 * This file defines the structure for the country-first VPN UI
 * where countries are the primary focus and VPN providers are secondary.
 */

export type LanguageMatchQuality = 'Perfect' | 'Good' | 'Partial' | 'Limited';

/**
 * Summary information about a VPN provider for a specific country
 */
export interface VpnProviderSummary {
  id: string;
  name: string;
  logoUrl?: string;
  serverCountInCountry: number;
  overallRating?: number;
  monthlyPrice: number;
  currency?: string;
  affiliateUrl?: string;
  worksWithNetflix: boolean;
  worksWithPrimeVideo: boolean;
  worksWithDisneyPlus: boolean;
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
  recommendedCountries: CountryRecommendation[];
  totalCountriesAnalyzed: number;
  countriesWithPerfectMatch: number;
  countriesWithGoodMatch: number;
  confidenceScore: number;
  dataSource: 'real_api' | 'fallback';
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

/**
 * Helper function to group countries by match quality
 */
export const groupCountriesByQuality = (
  countries: CountryRecommendation[],
): GroupedCountries => {
  return {
    perfect: countries.filter(c => c.languageMatchQuality === 'Perfect'),
    good: countries.filter(c => c.languageMatchQuality === 'Good'),
    partial: countries.filter(c => c.languageMatchQuality === 'Partial'),
    other: countries.filter(
      c => c.languageMatchQuality === 'Limited' || !c.languageMatchQuality,
    ),
  };
};

/**
 * Helper function to get badge color for match quality
 */
export const getMatchQualityColor = (quality: LanguageMatchQuality): string => {
  switch (quality) {
    case 'Perfect':
      return '#22c55e'; // Success Green 500 - unified palette
    case 'Good':
      return '#7c3aed'; // Primary Violet 500 - unified palette
    case 'Partial':
      return '#f59e0b'; // Warning Amber 500 - unified palette
    case 'Limited':
    default:
      return '#9ca3af'; // Gray 400 - unified palette
  }
};

/**
 * Helper function to get match quality description
 */
export const getMatchQualityDescription = (quality: LanguageMatchQuality): string => {
  switch (quality) {
    case 'Perfect':
      return 'All your preferred languages are available';
    case 'Good':
      return 'Most of your preferred languages are available';
    case 'Partial':
      return 'Some of your preferred languages are available';
    case 'Limited':
    default:
      return 'Limited language support for your preferences';
  }
};
