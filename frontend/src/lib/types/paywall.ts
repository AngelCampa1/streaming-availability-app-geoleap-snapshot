// Paywall and subscription types for frontend

export enum SubscriptionTier {
  Free = 0,
  Basic = 1,
  Premium = 2,
  Admin = 99,
}

export enum ContentType {
  All = 0,
  Movie = 1,
  Show = 2,        // Backend calls this TvSeries
  Documentary = 3,
  Anime = 4,
}

export interface PaywallInfo {
  userTier: SubscriptionTier;
  isPaywallActive: boolean;
  upgradeMessage?: string;
  remainingSearches?: number;
  remainingResults?: number;
  ctaText?: string;
  ctaUrl?: string;
}

export interface PaywalledSearchResult {
  id: string;
  title: string;
  type: ContentType;
  year?: number;
  description?: string;
  posterUrl?: string;
  imdbRating?: number;
  genres?: string[];
  cast?: string[];
  director?: string;
  availableCountries: number;
  streamingOptions?: StreamingOption[];
  relevanceScore: number;
  isPaywalled: boolean;
  previewData?: {
    shortDescription?: string;
    mainGenre?: string;
    popularityRank?: number;
  };
  // Subscription-based enrichment
  isOnUserService?: boolean;
  userServiceMatchCount?: number;
}

export interface StreamingOption {
  serviceId: string;
  serviceName: string;
  serviceLogoUrl?: string;
  type: 'subscription' | 'rent' | 'buy' | 'free';
  price?: number;
  currency?: string;
  url?: string;
  availableInCountries: string[];
  // Subscription-based enrichment
  isUserSubscription?: boolean;
}

export interface PaywalledSearchResponse {
  query: string;
  results: PaywalledSearchResult[];
  totalResults: number;
  page: number;
  pageSize: number;
  paywallInfo: PaywallInfo;
  suggestions?: string[];
  searchTime?: number;
}

export interface GlobalSearchRequest {
  query: string;
  contentType?: ContentType;
  page?: number;
  pageSize?: number;
  countries?: string[];
  services?: string[];
  minRating?: number;
  maxRating?: number;
  yearFrom?: number;
  yearTo?: number;
  genres?: string[];
  // Subscription-based filtering and ranking
  userSubscribedServices?: string[];
  onlyUserServices?: boolean;
  boostUserServices?: boolean;
}

// Legacy types for backward compatibility
export interface GlobalSearchResult {
  id: string;
  title: string;
  type: ContentType;
  year?: number;
  description?: string;
  posterUrl?: string;
  imdbRating?: number;
  genres?: string[];
  cast?: string[];
  director?: string;
  availableCountries: number;
  streamingOptions?: StreamingOption[];
  relevanceScore: number;
}

export interface GlobalSearchResponse {
  query: string;
  results: GlobalSearchResult[];
  totalResults: number;
  page: number;
  pageSize: number;
  suggestions?: string[];
  searchTime?: number;
}

// Subscription management types
export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  paymentMethodId?: string;
}

export interface SubscriptionLimits {
  tier: SubscriptionTier;
  maxSearchResultsPerQuery: number;
  maxDailySearches: number;
  canViewStreamingUrls: boolean;
  canViewPricing: boolean;
  canAccessPremiumContent: boolean;
  canExportResults: boolean;
  prioritySupport: boolean;
  adFree: boolean;
}

// Upgrade messaging types
export interface UpgradePrompt {
  title: string;
  message: string;
  ctaText: string;
  ctaUrl: string;
  benefits: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
  dismissible: boolean;
}

export interface PaywallAnalytics {
  userId: string;
  event: 'paywall_shown' | 'upgrade_clicked' | 'dismissed' | 'search_limited';
  tier: SubscriptionTier;
  context: {
    query?: string;
    resultCount?: number;
    paywallPosition?: string;
  };
  timestamp: string;
}
