/**
 * Centralized Test Data for MSW Handlers
 *
 * This file contains realistic mock data that matches the actual API contracts
 * from the backend. All types are aligned with the frontend type definitions.
 */

import { ContentType, SubscriptionTier } from '@/lib/types/paywall';

// ============================================================================
// User & Authentication Data
// ============================================================================

export const mockUser = {
  id: 'user-123',
  email: 'test@geoleap.com',
  name: 'Test User',
  displayName: 'Test User',
  profileImageUrl: 'https://example.com/avatar.jpg',
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
  preferences: {
    language: 'en',
    country: 'US',
    theme: 'light',
  },
};

export const mockAuthTokens = {
  accessToken: 'mock-jwt-access-token-12345',
  refreshToken: 'mock-refresh-token-67890',
  expiresIn: 3600,
  tokenType: 'Bearer',
};

export const mockUserSubscription = {
  id: 'sub-123',
  userId: mockUser.id,
  tier: SubscriptionTier.Premium,
  isActive: true,
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2025-01-01T00:00:00Z',
  autoRenew: true,
  paymentMethodId: 'pm-123',
};

// ============================================================================
// Content & Search Data
// ============================================================================

export const mockSearchResults = [
  {
    id: 'tt0111161',
    title: 'The Shawshank Redemption',
    type: ContentType.Movie,
    year: 1994,
    description:
      'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    posterUrl: 'https://example.com/posters/shawshank.jpg',
    imdbRating: 9.3,
    genres: ['Drama'],
    cast: ['Tim Robbins', 'Morgan Freeman'],
    director: 'Frank Darabont',
    availableCountries: 45,
    streamingOptions: [
      {
        serviceId: 'netflix',
        serviceName: 'Netflix',
        serviceLogoUrl: 'https://example.com/logos/netflix.png',
        type: 'subscription' as const,
        url: 'https://netflix.com/title/123',
        availableInCountries: ['US', 'UK', 'CA'],
      },
    ],
    relevanceScore: 0.95,
  },
  {
    id: 'tt0068646',
    title: 'The Godfather',
    type: ContentType.Movie,
    year: 1972,
    description:
      'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
    posterUrl: 'https://example.com/posters/godfather.jpg',
    imdbRating: 9.2,
    genres: ['Crime', 'Drama'],
    cast: ['Marlon Brando', 'Al Pacino'],
    director: 'Francis Ford Coppola',
    availableCountries: 52,
    streamingOptions: [
      {
        serviceId: 'prime',
        serviceName: 'Amazon Prime Video',
        serviceLogoUrl: 'https://example.com/logos/prime.png',
        type: 'subscription' as const,
        url: 'https://amazon.com/video/123',
        availableInCountries: ['US', 'UK', 'DE'],
      },
    ],
    relevanceScore: 0.92,
  },
  {
    id: 'tt0468569',
    title: 'The Dark Knight',
    type: ContentType.Movie,
    year: 2008,
    description:
      'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    posterUrl: 'https://example.com/posters/dark-knight.jpg',
    imdbRating: 9.0,
    genres: ['Action', 'Crime', 'Drama'],
    cast: ['Christian Bale', 'Heath Ledger'],
    director: 'Christopher Nolan',
    availableCountries: 60,
    streamingOptions: [
      {
        serviceId: 'hbo',
        serviceName: 'HBO Max',
        serviceLogoUrl: 'https://example.com/logos/hbo.png',
        type: 'subscription' as const,
        url: 'https://hbomax.com/title/456',
        availableInCountries: ['US'],
      },
    ],
    relevanceScore: 0.88,
  },
];

export const mockContent = {
  id: 'tt0111161',
  title: 'The Shawshank Redemption',
  originalTitle: 'The Shawshank Redemption',
  overview:
    'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
  tagline: 'Fear can hold you prisoner. Hope can set you free.',
  releaseYear: 1994,
  rating: 9.3,
  voteCount: 2500000,
  runtime: 142,
  contentRating: 'R',
  genres: ['Drama'],
  primaryGenre: 'Drama',
  posterUrl: 'https://example.com/posters/shawshank.jpg',
  backdropUrl: 'https://example.com/backdrops/shawshank.jpg',
  cast: [
    {
      id: 1,
      name: 'Tim Robbins',
      character: 'Andy Dufresne',
      profilePath: 'https://example.com/people/tim-robbins.jpg',
      order: 0,
    },
    {
      id: 2,
      name: 'Morgan Freeman',
      character: 'Ellis Boyd "Red" Redding',
      profilePath: 'https://example.com/people/morgan-freeman.jpg',
      order: 1,
    },
  ],
  crew: [
    {
      id: 3,
      name: 'Frank Darabont',
      job: 'Director',
      department: 'Directing',
      profilePath: 'https://example.com/people/frank-darabont.jpg',
    },
  ],
  productionCountries: ['US'],
  originalLanguage: 'en',
  status: 'Released',
  homepage: 'https://www.warnerbros.com/movies/shawshank-redemption',
  streamingOptions: [
    {
      serviceId: 'netflix',
      serviceName: 'Netflix',
      serviceLogoUrl: 'https://example.com/logos/netflix.png',
      type: 'subscription' as const,
      url: 'https://netflix.com/title/123',
      quality: ['HD', '4K'],
      audioLanguages: ['en', 'es', 'fr'],
      subtitleLanguages: ['en', 'es', 'fr', 'de'],
      videoLink: 'https://netflix.com/title/123',
      expiresSoon: false,
      availableSince: '2024-01-01T00:00:00Z',
    },
  ],
};

// ============================================================================
// Watchlist Data
// ============================================================================

export const mockWatchlistItems = [
  {
    id: 'wl-item-1',
    title: 'The Shawshank Redemption',
    type: 'movie' as const,
    year: 1994,
    genre: ['Drama'],
    duration: 142,
    rating: 9.3,
    imdbId: 'tt0111161',
    poster: 'https://example.com/posters/shawshank.jpg',
    description:
      'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    availability: [],
    addedDate: new Date('2024-06-01'),
    lastChecked: new Date('2024-06-15'),
    priority: 'high' as const,
    watched: false,
    progress: 0,
  },
  {
    id: 'wl-item-2',
    title: 'Breaking Bad',
    type: 'tv_series' as const,
    year: 2008,
    genre: ['Drama', 'Crime', 'Thriller'],
    duration: 62,
    rating: 9.5,
    imdbId: 'tt0903747',
    poster: 'https://example.com/posters/breaking-bad.jpg',
    description:
      'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.',
    availability: [],
    addedDate: new Date('2024-05-15'),
    lastChecked: new Date('2024-06-14'),
    priority: 'medium' as const,
    watched: true,
    watchedDate: new Date('2024-06-10'),
    progress: 100,
  },
];

export const mockWatchlistStats = {
  totalItems: 25,
  watchedItems: 12,
  availableItems: 18,
  categorizedItems: 20,
  averageRating: 8.2,
  totalDuration: 3500,
  genreBreakdown: {
    Drama: 10,
    Action: 8,
    Comedy: 4,
    'Sci-Fi': 3,
  },
  typeBreakdown: {
    movie: 15,
    tv_series: 8,
    documentary: 2,
  },
  monthlyAdditions: {
    '2024-01': 3,
    '2024-02': 5,
    '2024-03': 2,
    '2024-04': 4,
    '2024-05': 6,
    '2024-06': 5,
  },
};

// ============================================================================
// Streaming & VPN Data
// ============================================================================

export const mockStreamingServices = [
  {
    id: 'netflix',
    name: 'Netflix',
    logoUrl: 'https://example.com/logos/netflix.png',
    type: 'subscription',
  },
  {
    id: 'prime',
    name: 'Amazon Prime Video',
    logoUrl: 'https://example.com/logos/prime.png',
    type: 'subscription',
  },
  {
    id: 'hbo',
    name: 'HBO Max',
    logoUrl: 'https://example.com/logos/hbo.png',
    type: 'subscription',
  },
  {
    id: 'disney',
    name: 'Disney+',
    logoUrl: 'https://example.com/logos/disney.png',
    type: 'subscription',
  },
  {
    id: 'hulu',
    name: 'Hulu',
    logoUrl: 'https://example.com/logos/hulu.png',
    type: 'subscription',
  },
];

export const mockUserSubscriptions = [
  {
    id: 'usub-1',
    userId: mockUser.id,
    serviceId: 'netflix',
    serviceName: 'Netflix',
    isActive: true,
    addedAt: '2024-01-01T00:00:00Z',
    subscriptionTier: 'Premium',
  },
  {
    id: 'usub-2',
    userId: mockUser.id,
    serviceId: 'prime',
    serviceName: 'Amazon Prime Video',
    isActive: true,
    addedAt: '2024-02-15T00:00:00Z',
  },
];

export const mockVpnCountries = [
  { code: 'US', name: 'United States', available: true },
  { code: 'UK', name: 'United Kingdom', available: true },
  { code: 'CA', name: 'Canada', available: true },
  { code: 'AU', name: 'Australia', available: true },
  { code: 'DE', name: 'Germany', available: true },
  { code: 'FR', name: 'France', available: true },
  { code: 'JP', name: 'Japan', available: true },
];

export const mockVpnCountryRecommendations = {
  contentId: 'tt1234567',
  contentTitle: 'Breaking Bad',
  userAudioLanguages: ['en'],
  userSubtitleLanguages: ['en'],
  recommendedCountries: [
    {
      countryCode: 'US',
      countryName: 'United States',
      countryFlag: '🇺🇸',
      audioLanguages: ['en'],
      subtitleLanguages: ['en', 'es'],
      languageScore: 1.0,
      languageMatchQuality: 'Perfect' as const,
      streamingServices: ['netflix', 'prime'],
      rank: 1,
    },
    {
      countryCode: 'GB',
      countryName: 'United Kingdom',
      countryFlag: '🇬🇧',
      audioLanguages: ['en'],
      subtitleLanguages: ['en'],
      languageScore: 0.9,
      languageMatchQuality: 'Good' as const,
      streamingServices: ['netflix'],
      rank: 2,
    },
    {
      countryCode: 'DE',
      countryName: 'Germany',
      countryFlag: '🇩🇪',
      audioLanguages: ['de'],
      subtitleLanguages: ['en', 'de'],
      languageScore: 0.7,
      languageMatchQuality: 'Partial' as const,
      streamingServices: ['prime'],
      rank: 3,
    },
  ],
  totalCountriesAnalyzed: 50,
  countriesWithPerfectMatch: 5,
  countriesWithGoodMatch: 10,
  confidenceScore: 0.95,
  dataSource: 'real_api',
  generatedAt: new Date().toISOString(),
};

// ============================================================================
// Paywall Data
// ============================================================================

export const mockPaywallInfo = {
  userTier: SubscriptionTier.Free,
  isPaywallActive: true,
  upgradeMessage: 'Upgrade to Premium to see all results',
  remainingSearches: 5,
  remainingResults: 10,
  ctaText: 'Upgrade Now',
  ctaUrl: '/pricing',
};

export const mockSubscriptionLimits = {
  [SubscriptionTier.Free]: {
    tier: SubscriptionTier.Free,
    maxSearchResultsPerQuery: 5,
    maxDailySearches: 10,
    canViewStreamingUrls: false,
    canViewPricing: false,
    canAccessPremiumContent: false,
    canExportResults: false,
    prioritySupport: false,
    adFree: false,
  },
  [SubscriptionTier.Basic]: {
    tier: SubscriptionTier.Basic,
    maxSearchResultsPerQuery: 20,
    maxDailySearches: 50,
    canViewStreamingUrls: true,
    canViewPricing: true,
    canAccessPremiumContent: false,
    canExportResults: false,
    prioritySupport: false,
    adFree: false,
  },
  [SubscriptionTier.Premium]: {
    tier: SubscriptionTier.Premium,
    maxSearchResultsPerQuery: 100,
    maxDailySearches: -1, // unlimited
    canViewStreamingUrls: true,
    canViewPricing: true,
    canAccessPremiumContent: true,
    canExportResults: true,
    prioritySupport: true,
    adFree: true,
  },
};

// ============================================================================
// Social Data
// ============================================================================

export const mockSocialConnections = [
  {
    id: 'conn-1',
    userId: mockUser.id,
    platform: 'google',
    socialUserId: 'google-123',
    username: 'testuser',
    displayName: 'Test User',
    profileImageUrl: 'https://example.com/avatar.jpg',
    bio: '',
    connectedAt: '2024-01-01T00:00:00Z',
    isTokenValid: true,
    grantedScopes: 'email,profile',
    followersCount: 0,
    followingCount: 0,
    isVerified: false,
    updatedAt: '2024-06-01T00:00:00Z',
  },
];

// ============================================================================
// Notifications Data
// ============================================================================

export const mockNotifications = [
  {
    id: 'notif-1',
    type: 'availability_change' as const,
    itemId: 'wl-item-1',
    title: 'New Availability',
    message: 'The Shawshank Redemption is now available on Netflix',
    isRead: false,
    createdDate: new Date('2024-06-15T10:00:00Z'),
    actionUrl: '/content/movie/tt0111161',
  },
  {
    id: 'notif-2',
    type: 'reminder' as const,
    title: 'Weekly Reminder',
    message: 'Check out your watchlist for new content!',
    isRead: true,
    createdDate: new Date('2024-06-14T09:00:00Z'),
  },
];

// ============================================================================
// Error Responses
// ============================================================================

export const mockErrorResponses = {
  unauthorized: {
    status: 401,
    message: 'Authentication required',
    code: 'UNAUTHORIZED',
  },
  forbidden: {
    status: 403,
    message: 'Access forbidden',
    code: 'FORBIDDEN',
  },
  notFound: {
    status: 404,
    message: 'Resource not found',
    code: 'NOT_FOUND',
  },
  validationError: {
    status: 400,
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    errors: {
      email: ['Invalid email format'],
      password: ['Password must be at least 8 characters'],
    },
  },
  serverError: {
    status: 500,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
  },
  rateLimited: {
    status: 429,
    message: 'Rate limit exceeded',
    code: 'RATE_LIMITED',
    retryAfter: 60,
  },
};
