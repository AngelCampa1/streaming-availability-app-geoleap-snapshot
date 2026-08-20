/**
 * Test Data Factories
 *
 * Factory functions for generating mock data in tests.
 * Each factory creates realistic test data with sensible defaults and allows overrides.
 *
 * Usage:
 * ```typescript
 * import { createMockUser, createMockContent } from '@/__tests__/utils/test-data-factories';
 *
 * test('displays user name', () => {
 *   const user = createMockUser({ name: 'John Doe' });
 *   expect(user.name).toBe('John Doe');
 * });
 * ```
 *
 * Benefits:
 * - Consistent test data across all tests
 * - Easy to create variations with overrides
 * - Centralized data structure definitions
 * - Realistic mock data for better test coverage
 */

/**
 * Generate a unique ID for test data
 */
let idCounter = 0;
export function generateTestId(prefix = 'test'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

/**
 * Reset ID counter (useful in beforeEach)
 */
export function resetTestIdCounter(): void {
  idCounter = 0;
}

// ============================================================================
// User & Authentication
// ============================================================================

export interface MockUser {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  subscriptionTier?: 'free' | 'basic' | 'premium';
  preferences?: {
    language?: string;
    notifications?: boolean;
    autoPlay?: boolean;
  };
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const id = overrides.id || generateTestId('user');
  const username = overrides.username || `user${id}`;

  return {
    id,
    email: overrides.email || `${username}@test.geoleap.app`,
    username,
    displayName: overrides.displayName,
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    avatarUrl: overrides.avatarUrl,
    emailVerified: overrides.emailVerified ?? true,
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    subscriptionTier: overrides.subscriptionTier || 'free',
    preferences: {
      language: 'en',
      notifications: true,
      autoPlay: true,
      ...overrides.preferences,
    },
  };
}

export interface MockAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export function createMockAuthToken(overrides: Partial<MockAuthToken> = {}): MockAuthToken {
  return {
    accessToken: overrides.accessToken || `mock-access-token-${generateTestId()}`,
    refreshToken: overrides.refreshToken || `mock-refresh-token-${generateTestId()}`,
    expiresIn: overrides.expiresIn || 3600,
    tokenType: 'Bearer',
  };
}

// ============================================================================
// Content (Movies & TV Shows)
// ============================================================================

export type ContentType = 'movie' | 'series' | 'tv';
export type ContentGenre = 'Action' | 'Comedy' | 'Drama' | 'Horror' | 'Sci-Fi' | 'Romance' | 'Thriller' | 'Documentary';

export interface MockContent {
  id: string;
  imdbId?: string;
  tmdbId?: number;
  title: string;
  originalTitle?: string;
  type: ContentType;
  year?: number;
  releaseDate?: string;
  rating?: number;
  voteCount?: number;
  runtime?: number;
  genres: ContentGenre[];
  overview?: string;
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  cast?: string[];
  directors?: string[];
  availability?: MockStreamingAvailability[];
}

export function createMockContent(overrides: Partial<MockContent> = {}): MockContent {
  const id = overrides.id || generateTestId('tt');
  const isMovie = overrides.type !== 'series' && overrides.type !== 'tv';

  return {
    id,
    imdbId: overrides.imdbId || id,
    tmdbId: overrides.tmdbId || parseInt(id.replace(/\D/g, ''), 10) || 12345,
    title: overrides.title || 'Test Movie',
    originalTitle: overrides.originalTitle,
    type: overrides.type || 'movie',
    year: overrides.year || 2024,
    releaseDate: overrides.releaseDate || '2024-01-01',
    rating: overrides.rating ?? 7.5,
    voteCount: overrides.voteCount ?? 1000,
    runtime: overrides.runtime ?? (isMovie ? 120 : 45),
    genres: overrides.genres || ['Action', 'Drama'],
    overview: overrides.overview || 'A thrilling test movie that tests all the tests.',
    posterUrl: overrides.posterUrl || `https://image.tmdb.org/t/p/w500/test-poster-${id}.jpg`,
    backdropUrl: overrides.backdropUrl || `https://image.tmdb.org/t/p/original/test-backdrop-${id}.jpg`,
    trailerUrl: overrides.trailerUrl,
    cast: overrides.cast || ['Test Actor 1', 'Test Actor 2'],
    directors: overrides.directors || ['Test Director'],
    availability: overrides.availability,
  };
}

// ============================================================================
// Streaming Availability
// ============================================================================

export type StreamingProvider = 'Netflix' | 'Amazon Prime' | 'Disney+' | 'HBO Max' | 'Hulu' | 'Apple TV+';
export type StreamingType = 'subscription' | 'rent' | 'buy' | 'free';

export interface MockStreamingAvailability {
  provider: StreamingProvider;
  type: StreamingType;
  quality?: 'SD' | 'HD' | '4K';
  price?: number;
  currency?: string;
  url?: string;
  expiresAt?: string;
}

export function createMockStreamingAvailability(
  overrides: Partial<MockStreamingAvailability> = {}
): MockStreamingAvailability {
  const provider = overrides.provider || 'Netflix';
  const type = overrides.type || 'subscription';

  return {
    provider,
    type,
    quality: overrides.quality || 'HD',
    price: overrides.price ?? (type === 'subscription' ? 0 : 3.99),
    currency: overrides.currency || 'USD',
    url: overrides.url || `https://${provider.toLowerCase().replace(' ', '')}.com/watch/test`,
    expiresAt: overrides.expiresAt,
  };
}

// ============================================================================
// Watchlist
// ============================================================================

export interface MockWatchlistItem {
  id: string;
  userId: string;
  contentId: string;
  content?: MockContent;
  addedAt: string;
  notes?: string;
  watched?: boolean;
  watchedAt?: string;
}

export function createMockWatchlistItem(overrides: Partial<MockWatchlistItem> = {}): MockWatchlistItem {
  return {
    id: overrides.id || generateTestId('watchlist'),
    userId: overrides.userId || generateTestId('user'),
    contentId: overrides.contentId || generateTestId('tt'),
    content: overrides.content,
    addedAt: overrides.addedAt || new Date().toISOString(),
    notes: overrides.notes,
    watched: overrides.watched ?? false,
    watchedAt: overrides.watchedAt,
  };
}

// ============================================================================
// Search Results
// ============================================================================

export interface MockSearchResult {
  id: string;
  title: string;
  type: ContentType;
  year?: number;
  posterUrl?: string;
  rating?: number;
  overview?: string;
}

export function createMockSearchResult(overrides: Partial<MockSearchResult> = {}): MockSearchResult {
  const id = overrides.id || generateTestId('search');

  return {
    id,
    title: overrides.title || 'Test Search Result',
    type: overrides.type || 'movie',
    year: overrides.year || 2024,
    posterUrl: overrides.posterUrl || `https://image.tmdb.org/t/p/w200/test-${id}.jpg`,
    rating: overrides.rating ?? 7.0,
    overview: overrides.overview || 'A test search result.',
  };
}

// ============================================================================
// Filters
// ============================================================================

export interface MockContentFilters {
  genres?: ContentGenre[];
  yearMin?: number;
  yearMax?: number;
  ratingMin?: number;
  ratingMax?: number;
  type?: ContentType | 'all';
  streamingProviders?: StreamingProvider[];
  sortBy?: 'rating' | 'year' | 'title' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

export function createMockFilters(overrides: Partial<MockContentFilters> = {}): MockContentFilters {
  return {
    genres: overrides.genres,
    yearMin: overrides.yearMin,
    yearMax: overrides.yearMax,
    ratingMin: overrides.ratingMin,
    ratingMax: overrides.ratingMax,
    type: overrides.type || 'all',
    streamingProviders: overrides.streamingProviders,
    sortBy: overrides.sortBy || 'popularity',
    sortOrder: overrides.sortOrder || 'desc',
  };
}

// ============================================================================
// API Responses
// ============================================================================

export interface MockApiResponse<TData = unknown> {
  data: TData;
  status: number;
  statusText: string;
  headers?: Record<string, string>;
}

export function createMockApiResponse<TData = unknown>(
  data: TData,
  overrides: Partial<MockApiResponse<TData>> = {}
): MockApiResponse<TData> {
  return {
    data,
    status: overrides.status || 200,
    statusText: overrides.statusText || 'OK',
    headers: overrides.headers || {
      'Content-Type': 'application/json',
    },
  };
}

export interface MockApiError {
  message: string;
  code?: string;
  status: number;
  errors?: Record<string, string[]>;
}

export function createMockApiError(overrides: Partial<MockApiError> = {}): MockApiError {
  return {
    message: overrides.message || 'An error occurred',
    code: overrides.code || 'UNKNOWN_ERROR',
    status: overrides.status || 500,
    errors: overrides.errors,
  };
}

// ============================================================================
// Pagination
// ============================================================================

export interface MockPaginatedResponse<TData = unknown> {
  data: TData[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function createMockPaginatedResponse<TData = unknown>(
  data: TData[],
  overrides: Partial<MockPaginatedResponse<TData>> = {}
): MockPaginatedResponse<TData> {
  const page = overrides.page || 1;
  const pageSize = overrides.pageSize || 20;
  const totalItems = overrides.totalItems || data.length;
  const totalPages = overrides.totalPages || Math.ceil(totalItems / pageSize);

  return {
    data,
    page,
    pageSize,
    totalPages,
    totalItems,
    hasNextPage: overrides.hasNextPage ?? (page < totalPages),
    hasPreviousPage: overrides.hasPreviousPage ?? (page > 1),
  };
}

// ============================================================================
// Helper: Create Arrays of Mock Data
// ============================================================================

/**
 * Create an array of mock items using a factory function
 *
 * @param factory - Factory function to create each item
 * @param count - Number of items to create
 * @param baseOverrides - Base overrides applied to all items
 * @returns Array of mock items
 *
 * @example
 * ```typescript
 * const users = createMockArray(createMockUser, 5);
 * const actionMovies = createMockArray(createMockContent, 3, { genres: ['Action'] });
 * ```
 */
export function createMockArray<T>(
  factory: (overrides?: any) => T,
  count: number,
  baseOverrides: any = {}
): T[] {
  return Array.from({ length: count }, (_, index) =>
    factory({ ...baseOverrides, id: `${baseOverrides.id || 'item'}-${index}` })
  );
}
