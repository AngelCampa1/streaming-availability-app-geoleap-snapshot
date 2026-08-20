export * from './autocomplete';
export * from './payment';
export * from './paywall';
export * from './promotion';

// Re-export search types from paywall.ts
export type {
  GlobalSearchRequest,
  GlobalSearchResponse,
  GlobalSearchResult as SearchResult,
  StreamingOption as StreamingAvailability,
} from './paywall';

// Re-export content types from API
export type {
  ContentData,
  CastMember,
  CrewMember,
  StreamingOption,
  GlobalCastMember,
  GlobalCrewMember,
} from '@/lib/api/content';

// Re-export enhanced streaming types from the official library integration
export type {
  EnhancedStreamingOption,
  StreamingServiceInfo,
  CountryStreamingOptions,
  StreamingAvailabilitySearchParams,
  StreamingAvailabilityResult,
} from '@/services/streamingAvailabilityService';

// Export ContentType if it exists elsewhere
export type ContentType = 'movie' | 'tv' | 'documentary' | 'anime';

/** URL path segment used by the /content/[type]/[slug] route (differs from the ContentType enum: 'tv-show' vs 'tv'). */
export type ContentRouteType = 'movie' | 'tv-show' | 'documentary' | 'anime';

// Additional content-related types for SEO pages
export interface ContentMetadata {
  id: string;
  title: string;
  originalTitle?: string;
  overview?: string;
  tagline?: string;
  releaseYear?: number;
  rating?: number;
  voteCount?: number;
  runtime?: number;
  contentRating?: string;
  genres: string[];
  primaryGenre?: string;
  posterUrl?: string;
  backdropUrl?: string;
  status?: string;
  homepage?: string;
  originalLanguage?: string;
  productionCountries?: string[];
}

export interface ExternalId {
  source: string;
  value: string;
  url?: string;
}

export enum StreamingType {
  Subscription = 'subscription',
  Rental = 'rental',
  Purchase = 'purchase',
  Free = 'free',
  Ads = 'ads',
}

// Enhanced streaming availability types for official library integration
export interface StreamingAvailabilityFilters {
  showType?: 'all' | 'flatrate' | 'free' | 'ads' | 'rent' | 'buy' | 'cinema';
  sortBy?: 'popularity' | 'rating' | 'release_year' | 'title' | 'price';
  sortOrder?: 'asc' | 'desc';
  language?: string;
  country?: string;
}

// Define this interface inline since StreamingAvailabilityResult is exported later
export interface StreamingAvailabilitySearchResponse {
  results: import('@/services/streamingAvailabilityService').StreamingAvailabilityResult[];
  total: number;
  page: number;
  totalPages: number;
}

// Quality and language preferences
export interface StreamingPreferences {
  videoQuality?: 'sd' | 'hd' | 'qhd' | 'uhd';
  audioLanguages?: string[];
  subtitleLanguages?: string[];
  preferredServices?: string[];
  maxPrice?: number;
  currency?: string;
  includeFree?: boolean;
  includePaid?: boolean;
  showExpiringSoon?: boolean;
}

// Availability notification types
export interface AvailabilityNotification {
  contentId: string;
  contentTitle: string;
  contentType: 'movie' | 'series';
  notificationType: 'expiring_soon' | 'newly_available' | 'price_change';
  services: string[];
  expiresAt?: string;
  availableFrom?: string;
  oldPrice?: number;
  newPrice?: number;
}
