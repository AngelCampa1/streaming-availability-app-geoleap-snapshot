export interface StreamingContent {
  id: string;
  title: string;
  description?: string;
  type: 'movie' | 'tv' | 'documentary' | 'anime' | 'series';
  poster?: string;
  backdrop?: string;
  releaseYear?: number;
  rating?: number;
  genres?: string[];
  duration?: number; // in minutes
  seasons?: number; // for TV series
  episodeCount?: number; // for TV series
  director?: string;
  cast?: string[];
  language?: string;
  imdbId?: string;
  tmdbId?: number;
}

export interface StreamingAvailability {
  contentId: string;
  service: StreamingService;
  country: Country;
  available: boolean;
  quality?: 'SD' | 'HD' | '4K';
  subtitles?: string[];
  audioLanguages?: string[];
  price?: number;
  currency?: string;
  purchaseType?: 'subscription' | 'rental' | 'purchase' | 'free';
  addedDate?: Date;
  leavingDate?: Date;
}

export interface StreamingService {
  id: string;
  name: string;
  icon?: string;
  type: 'subscription' | 'rental' | 'purchase' | 'free' | 'tv';
  baseUrl?: string;
  supportedCountries?: string[];
  price?: number;
  currency?: string;
}

export interface Country {
  code: string;
  name: string;
  flag?: string;
  region?: string;
}

export interface SearchResult {
  content: StreamingContent;
  availability: StreamingAvailability[];
  relevanceScore: number;
  popularity?: number;
  userRating?: number;
  watchlistAdded?: boolean;
}

export interface SearchFilters {
  type?: ('movie' | 'tv' | 'documentary' | 'anime' | 'series')[];
  genres?: string[];
  yearRange?: {
    min?: number;
    max?: number;
  };
  ratingRange?: {
    min?: number;
    max?: number;
  };
  countries?: string[];
  services?: string[];
  quality?: ('SD' | 'HD' | '4K')[];
  priceType?: ('subscription' | 'rental' | 'purchase' | 'free')[];
  language?: string;
  sortBy?: 'relevance' | 'popularity' | 'rating' | 'release_date' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'content' | 'actor' | 'director' | 'genre' | 'service' | 'country' | 'history' | 'trending';
  category?: string;
  image?: string;
  count?: number;
  metadata?: Record<string, any>;
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: number;
  filters?: SearchFilters;
  resultCount: number;
  clickedContentId?: string;
}

export interface VoiceSearchResult {
  text: string;
  confidence: number;
  alternatives?: Array<{
    text: string;
    confidence: number;
  }>;
}

export interface SearchAnalytics {
  queryId: string;
  query: string;
  timestamp: number;
  resultCount: number;
  clickedContent?: string;
  sessionDuration?: number;
  filtersUsed?: boolean;
}

export interface PopularSearch {
  query: string;
  count: number;
  category?: string;
  trending?: boolean;
}

export interface PaginationInfo {
  page: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageSize: number;
}

export interface SearchResponse {
  results: SearchResult[];
  pagination: PaginationInfo;
  suggestions?: SearchSuggestion[];
  analytics?: SearchAnalytics;
  queryTime: number;
}

// ===== USER STREAMING SUBSCRIPTION TYPES =====

/**
 * Represents a user's external streaming service subscription (Netflix, HBO, etc.)
 * for VPN-based content access functionality
 */
export interface UserStreamingSubscription {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  isActive: boolean;
  addedAt: string;
  removedAt?: string;
  subscriptionTier?: string;
  notes?: string;
}

/**
 * Request model for adding a streaming service subscription
 */
export interface AddSubscriptionRequest {
  serviceId: string;
  serviceName: string;
  subscriptionTier?: string;
  notes?: string;
}

/**
 * Request model for updating a streaming service subscription
 */
export interface UpdateSubscriptionRequest {
  subscriptionTier?: string;
  notes?: string;
}

/**
 * Streaming service availability details
 */
export interface ServiceAvailability {
  serviceId: string;
  serviceName: string;
  type: 'subscription' | 'rental' | 'purchase' | 'free' | 'ads';
  url: string;
  quality: string;
  audioLanguages: string[];
  subtitleLanguages: string[];
  price?: number;
  currency?: string;
  videoFormats?: string[];
  availableSince?: Date;
  leaveAt?: Date;
  isUserSubscription: boolean;
}

/**
 * Streaming availability information for a specific country
 */
export interface CountryStreamingInfo {
  countryCode: string;
  countryName: string;
  services: ServiceAvailability[];
  hasUserSubscriptions: boolean;
  userServicesCount: number;
}

/**
 * Detailed streaming availability for a specific show across all countries
 * Used for VPN-based content access feature
 */
export interface ShowStreamingDetails {
  id: string;
  title: string;
  originalTitle?: string;
  year?: number;
  overview?: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating?: number;
  availabilityByCountry: Record<string, CountryStreamingInfo>;
  totalCountries: number;
  countriesWithUserSubscriptions: number;
  userServicesWithContent: string[];
}

/**
 * User location response for country detection
 */
export interface UserLocationResponse {
  countryCode: string;
  countryName: string;
  autoDetected: boolean;
  detectionMethod?: string;
}

/**
 * Popular streaming services for quick selection
 */
export const POPULAR_SERVICES = [
  { id: 'netflix', name: 'Netflix', icon: '🎬', logoId: 'netflix', color: '#E50914' },
  { id: 'hbo', name: 'HBO Max', icon: '🎭', logoId: 'hbo', color: '#8B5CF6' },
  { id: 'disney', name: 'Disney+', icon: '🏰', logoId: 'disney', color: '#113CCF' },
  { id: 'amazon', name: 'Amazon Prime Video', icon: '📦', logoId: 'amazon', color: '#00A8E1' },
  { id: 'hulu', name: 'Hulu', icon: '🟢', logoId: 'hulu', color: '#1CE783' },
  { id: 'paramount', name: 'Paramount+', icon: '⛰️', logoId: 'paramount', color: '#0064FF' },
  { id: 'peacock', name: 'Peacock', icon: '🦚', logoId: 'peacock', color: '#000000' },
  { id: 'apple', name: 'Apple TV+', icon: '🍎', logoId: 'apple', color: '#000000' },
  { id: 'youtube', name: 'YouTube Premium', icon: '▶️', logoId: 'youtube', color: '#FF0000' },
  { id: 'max', name: 'Max', icon: '🎬', logoId: 'max', color: '#002BE7' },
  { id: 'showtime', name: 'Showtime', icon: '🎥', logoId: 'showtime', color: '#D2232A' },
  { id: 'starz', name: 'STARZ', icon: '⭐', logoId: 'starz', color: '#000000' },
] as const;

/**
 * Subscription tier options
 */
export const SUBSCRIPTION_TIERS = [
  { id: 'basic', name: 'Basic', description: 'Standard Definition' },
  { id: 'standard', name: 'Standard', description: 'High Definition' },
  { id: 'premium', name: 'Premium', description: 'Ultra HD + Multiple Screens' },
  { id: 'family', name: 'Family', description: 'Multiple Profiles' },
  { id: 'student', name: 'Student', description: 'Discounted Rate' },
] as const;
