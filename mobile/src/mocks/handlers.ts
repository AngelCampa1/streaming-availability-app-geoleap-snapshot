/**
 * MSW (Mock Service Worker) Request Handlers
 *
 * Network-level API mocking for React Native Jest tests.
 * These handlers intercept HTTP requests and return mock responses,
 * allowing tests to exercise real code paths without hitting actual APIs.
 *
 * @see https://mswjs.io/docs/
 */

import { http, HttpResponse, delay } from 'msw';

// Base URL from config - for tests we use localhost
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

// ============================================================================
// Mock Data
// ============================================================================

export const mockUser = {
  id: 'user-123',
  email: 'test@geoleap.app',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  avatar: 'https://example.com/avatar.jpg',
  emailVerified: true,
  biometricEnabled: false,
  twoFactorEnabled: false,
  socialConnections: [],
  createdAt: '2024-01-01T00:00:00Z',
  lastLoginAt: '2025-01-01T00:00:00Z',
};

export const mockTokens = {
  accessToken: 'mock-access-token-jwt',
  refreshToken: 'mock-refresh-token',
  expiresAt: Date.now() + 3600000, // 1 hour from now
  tokenType: 'Bearer' as const,
};

export const mockSearchResults = [
  {
    content: {
      id: 'tt4574334',
      title: 'Stranger Things',
      description: 'When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces.',
      type: 'tv' as const,
      poster: 'https://image.tmdb.org/t/p/w500/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg',
      backdrop: 'https://image.tmdb.org/t/p/w1280/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
      releaseYear: 2016,
      rating: 8.7,
      genres: ['Drama', 'Fantasy', 'Horror'],
      seasons: 4,
      director: 'Matt Duffer, Ross Duffer',
      cast: ['Millie Bobby Brown', 'Finn Wolfhard', 'David Harbour'],
      language: 'en',
      imdbId: 'tt4574334',
      tmdbId: 66732,
    },
    availability: [
      {
        contentId: 'tt4574334',
        service: {
          id: 'netflix',
          name: 'Netflix',
          icon: 'https://images.justwatch.com/icon/207360008/s100/netflix.webp',
          type: 'subscription' as const,
          price: 15.99,
          currency: 'USD',
        },
        country: {
          code: 'US',
          name: 'United States',
          flag: 'us-flag',
        },
        available: true,
        quality: '4K' as const,
        subtitles: ['en', 'es', 'fr'],
        audioLanguages: ['en'],
        purchaseType: 'subscription' as const,
      },
    ],
    relevanceScore: 0.95,
    popularity: 95,
    userRating: 8.7,
    watchlistAdded: false,
  },
  {
    content: {
      id: 'tt3581920',
      title: 'The Last of Us',
      description: 'In a world devastated by a fungal infection, Joel is tasked with escorting Ellie across the country.',
      type: 'tv' as const,
      poster: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
      backdrop: 'https://image.tmdb.org/t/p/w1280/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
      releaseYear: 2023,
      rating: 8.8,
      genres: ['Drama', 'Action', 'Horror'],
      seasons: 2,
      director: 'Craig Mazin, Neil Druckmann',
      cast: ['Pedro Pascal', 'Bella Ramsey'],
      language: 'en',
      imdbId: 'tt3581920',
      tmdbId: 100088,
    },
    availability: [
      {
        contentId: 'tt3581920',
        service: {
          id: 'max',
          name: 'Max',
          icon: 'https://images.justwatch.com/icon/305458112/s100/max.webp',
          type: 'subscription' as const,
          price: 14.99,
          currency: 'USD',
        },
        country: {
          code: 'US',
          name: 'United States',
          flag: 'us-flag',
        },
        available: true,
        quality: '4K' as const,
        subtitles: ['en', 'es'],
        audioLanguages: ['en'],
        purchaseType: 'subscription' as const,
      },
    ],
    relevanceScore: 0.92,
    popularity: 88,
    userRating: 8.8,
    watchlistAdded: true,
  },
];

export const mockWatchlist = {
  id: 'watchlist-123',
  name: 'My Watchlist',
  description: 'Movies and shows to watch',
  isDefault: true,
  isPublic: false,
  items: [],
  color: '#7c3aed',
  icon: 'bookmark',
  createdBy: 'user-123',
  collaborators: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

export const mockRecommendations = [
  {
    id: 'rec-1',
    title: 'Wednesday',
    type: 'tv_series' as const,
    rating: 8.1,
    year: 2022,
    availableOn: ['netflix'],
    poster: 'https://image.tmdb.org/t/p/w500/wednesday.jpg',
    genres: ['Comedy', 'Crime', 'Fantasy'],
    seasons: 1,
    synopsis: 'Smart, sarcastic and a little dead inside, Wednesday Addams investigates a murder spree.',
    reason: 'Because you watched Stranger Things',
    matchScore: 0.89,
    confidence: 0.92,
    source: 'content_based' as const,
    metadata: {},
    createdAt: '2025-01-01T00:00:00Z',
  },
];

export const mockUserPreferences = {
  genres: { Drama: 0.8, Horror: 0.6, 'Sci-Fi': 0.5 },
  types: { tv: 0.7, movie: 0.3 },
  ratings: { excellent: 0.5, very_good: 0.3 },
  decades: { '2020s': 0.6, '2010s': 0.4 },
  runtime: { min: 30, max: 180, preferred: 90 },
  streamingServices: { netflix: 0.8, max: 0.5 },
  actors: {},
  directors: {},
  keywords: {},
};

// ============================================================================
// API Handlers
// ============================================================================

export const handlers = [
  // --------------------------------------------------------------------------
  // Authentication Endpoints
  // --------------------------------------------------------------------------

  // Login
  http.post(`${BASE_URL}/api/auth/login`, async ({ request }) => {
    await delay(100); // Simulate network latency

    const body = await request.json() as { email?: string; password?: string };

    if (!body.email || !body.password) {
      return HttpResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    if (body.email === 'invalid@test.com') {
      return HttpResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_ERROR', message: 'Invalid credentials' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        user: { ...mockUser, email: body.email },
        tokens: mockTokens,
      },
    });
  }),

  // Register
  http.post(`${BASE_URL}/api/auth/register`, async ({ request }) => {
    await delay(100);

    const body = await request.json() as { email?: string; password?: string; confirmPassword?: string };

    if (!body.email || !body.password) {
      return HttpResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'All fields are required' } },
        { status: 400 }
      );
    }

    if (body.email === 'existing@test.com') {
      return HttpResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email already exists' } },
        { status: 422 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        user: { ...mockUser, email: body.email },
        tokens: mockTokens,
      },
    }, { status: 201 });
  }),

  // Logout
  http.post(`${BASE_URL}/api/auth/logout`, async () => {
    await delay(50);
    return HttpResponse.json({ success: true });
  }),

  // Token Refresh - Always succeeds for testing (unless explicitly expired-token)
  http.post(`${BASE_URL}/api/auth/refresh`, async () => {
    await delay(50);

    // Always return success (simplified for testing)
    return HttpResponse.json({
      success: true,
      data: {
        ...mockTokens,
        accessToken: 'new-access-token-jwt',
        refreshToken: 'new-refresh-token',
        expiresAt: Date.now() + 3600000,
      },
    });
  }),

  // Forgot Password
  http.post(`${BASE_URL}/api/auth/forgot-password`, async ({ request }) => {
    await delay(100);

    const body = await request.json() as { email?: string };

    if (!body.email) {
      return HttpResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is required' } },
        { status: 400 }
      );
    }

    return HttpResponse.json({ success: true, message: 'Password reset email sent' });
  }),

  // Reset Password
  http.post(`${BASE_URL}/api/auth/reset-password`, async ({ request }) => {
    await delay(100);

    const body = await request.json() as { token?: string; newPassword?: string };

    if (!body.token || !body.newPassword) {
      return HttpResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Token and password are required' } },
        { status: 400 }
      );
    }

    if (body.token === 'invalid-token') {
      return HttpResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid or expired token' } },
        { status: 400 }
      );
    }

    return HttpResponse.json({ success: true, message: 'Password reset successful' });
  }),

  // Get User Profile
  http.get(`${BASE_URL}/api/auth/profile`, async () => {
    await delay(50);
    return HttpResponse.json({ success: true, data: mockUser });
  }),

  // Update User Profile
  http.patch(`${BASE_URL}/api/auth/profile`, async ({ request }) => {
    await delay(100);

    const updates = await request.json() as Partial<typeof mockUser>;

    return HttpResponse.json({
      success: true,
      data: { ...mockUser, ...updates },
    });
  }),

  // --------------------------------------------------------------------------
  // Social Auth Endpoints
  // --------------------------------------------------------------------------

  http.post(`${BASE_URL}/api/socialauth/authenticate`, async ({ request }) => {
    await delay(100);

    const body = await request.json() as { provider?: string; token?: string };

    if (!body.provider || !body.token) {
      return HttpResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Provider and token are required' } },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        user: {
          ...mockUser,
          socialConnections: [{ provider: body.provider, providerId: 'social-123', connectedAt: new Date().toISOString() }],
        },
        tokens: mockTokens,
      },
    });
  }),

  http.post(`${BASE_URL}/api/socialauth/google`, async () => {
    await delay(100);
    return HttpResponse.json({ success: true, data: { user: mockUser, tokens: mockTokens } });
  }),

  http.post(`${BASE_URL}/api/socialauth/apple`, async () => {
    await delay(100);
    return HttpResponse.json({ success: true, data: { user: mockUser, tokens: mockTokens } });
  }),

  // --------------------------------------------------------------------------
  // Search Endpoints
  // --------------------------------------------------------------------------

  http.get(`${BASE_URL}/api/streaming/search`, async ({ request }) => {
    await delay(150);

    const url = new URL(request.url);
    const params = url.searchParams as any; // Type assertion for mock environment
    const query = params.get('q') || params.get('query') || '';
    const page = parseInt(params.get('page') ?? '1');
    const pageSize = parseInt(params.get('pageSize') ?? '20');

    // Filter results based on query
    let results = mockSearchResults;
    if (query) {
      results = mockSearchResults.filter(r =>
        r.content.title.toLowerCase().includes(query.toLowerCase()) ||
        r.content.genres.some(g => g.toLowerCase().includes(query.toLowerCase()))
      );
    }

    return HttpResponse.json({
      results,
      pagination: {
        page,
        totalPages: Math.ceil(results.length / pageSize),
        totalResults: results.length,
        hasNextPage: false,
        hasPreviousPage: page > 1,
        pageSize,
      },
      queryTime: 120,
    });
  }),

  // --------------------------------------------------------------------------
  // Watchlist Endpoints
  // --------------------------------------------------------------------------

  http.get(`${BASE_URL}/api/watchlist`, async () => {
    await delay(100);
    return HttpResponse.json({
      success: true,
      data: { watchlists: [mockWatchlist] },
    });
  }),

  http.get(`${BASE_URL}/api/watchlist/:id`, async ({ params }) => {
    await delay(100);

    if (params.id === 'not-found') {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Watchlist not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: { watchlist: { ...mockWatchlist, id: params.id } },
    });
  }),

  http.post(`${BASE_URL}/api/watchlist`, async ({ request }) => {
    await delay(100);

    const body = await request.json() as Partial<typeof mockWatchlist>;

    return HttpResponse.json({
      success: true,
      data: {
        watchlist: {
          ...mockWatchlist,
          ...body,
          id: `watchlist-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    }, { status: 201 });
  }),

  http.put(`${BASE_URL}/api/watchlist/:id`, async ({ params, request }) => {
    await delay(100);

    const body = await request.json() as Partial<typeof mockWatchlist>;

    return HttpResponse.json({
      success: true,
      data: {
        watchlist: {
          ...mockWatchlist,
          ...body,
          id: params.id,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  }),

  http.delete(`${BASE_URL}/api/watchlist/:id`, async () => {
    await delay(100);
    return HttpResponse.json({ success: true });
  }),

  // Watchlist Items
  http.post(`${BASE_URL}/api/streaming/watchlist/:watchlistId/items`, async ({ params, request }) => {
    await delay(100);

    const body = await request.json() as Record<string, unknown>;

    return HttpResponse.json({
      success: true,
      data: {
        item: {
          ...body,
          id: `item-${Date.now()}`,
          addedAt: new Date().toISOString(),
        },
      },
    }, { status: 201 });
  }),

  http.put(`${BASE_URL}/api/streaming/watchlist/:watchlistId/items/:itemId`, async ({ params, request }) => {
    await delay(100);

    const body = await request.json() as Record<string, unknown>;

    return HttpResponse.json({
      success: true,
      data: {
        item: {
          ...body,
          id: params.itemId,
        },
      },
    });
  }),

  http.delete(`${BASE_URL}/api/streaming/watchlist/:watchlistId/items/:itemId`, async () => {
    await delay(100);
    return HttpResponse.json({ success: true });
  }),

  // --------------------------------------------------------------------------
  // Recommendations Endpoints
  // --------------------------------------------------------------------------

  http.get(`${BASE_URL}/recommendations`, async ({ request }) => {
    await delay(150);

    const url = new URL(request.url);
    const params = url.searchParams as any; // Type assertion for mock environment
    const count = parseInt(params.get('count') ?? '20');

    return HttpResponse.json({
      success: true,
      data: mockRecommendations.slice(0, count),
    });
  }),

  http.get(`${BASE_URL}/recommendations/trending`, async () => {
    await delay(100);
    return HttpResponse.json({
      success: true,
      data: mockRecommendations,
    });
  }),

  http.get(`${BASE_URL}/recommendations/friends/:userId`, async () => {
    await delay(100);
    return HttpResponse.json({
      success: true,
      data: mockRecommendations,
    });
  }),

  http.get(`${BASE_URL}/recommendations/similar/:contentId`, async () => {
    await delay(100);
    return HttpResponse.json({
      success: true,
      data: mockRecommendations,
    });
  }),

  http.get(`${BASE_URL}/recommendations/because-you-watched/:contentId`, async () => {
    await delay(100);
    return HttpResponse.json({
      success: true,
      data: mockRecommendations,
    });
  }),

  http.post(`${BASE_URL}/recommendations/feedback`, async () => {
    await delay(50);
    return HttpResponse.json({ success: true });
  }),

  http.post(`${BASE_URL}/recommendations/refresh/:userId`, async () => {
    await delay(150);
    return HttpResponse.json({ success: true });
  }),

  http.get(`${BASE_URL}/recommendations/insights/:userId`, async () => {
    await delay(100);
    return HttpResponse.json({
      success: true,
      data: {
        accuracyRate: 0.78,
        clickThroughRate: 0.45,
        addToWatchlistRate: 0.32,
        topGenres: ['Drama', 'Sci-Fi', 'Horror'],
        topSources: ['content_based', 'collaborative'],
        improvementSuggestions: ['Rate more content', 'Add more to watchlist'],
      },
    });
  }),

  // --------------------------------------------------------------------------
  // User Preferences Endpoints
  // --------------------------------------------------------------------------

  http.get(`${BASE_URL}/users/:userId/preferences`, async () => {
    await delay(100);
    return HttpResponse.json({
      success: true,
      data: mockUserPreferences,
    });
  }),

  http.put(`${BASE_URL}/users/:userId/preferences`, async ({ request }) => {
    await delay(100);

    const body = await request.json() as Partial<typeof mockUserPreferences>;

    return HttpResponse.json({
      success: true,
      data: { ...mockUserPreferences, ...body },
    });
  }),

  // --------------------------------------------------------------------------
  // User Profile Endpoints (alternate paths)
  // --------------------------------------------------------------------------

  http.get(`${BASE_URL}/api/user-profile`, async () => {
    await delay(50);
    return HttpResponse.json({ success: true, data: mockUser });
  }),

  http.get(`${BASE_URL}/api/preferences`, async () => {
    await delay(50);
    return HttpResponse.json({ success: true, data: mockUserPreferences });
  }),

  // --------------------------------------------------------------------------
  // Analytics Endpoints
  // --------------------------------------------------------------------------

  http.post(`${BASE_URL}/api/userbehavioranalytics/events/batch`, async ({ request }) => {
    await delay(100);

    const body = await request.json() as Array<Record<string, unknown>>;

    // Validate batch structure
    if (!Array.isArray(body)) {
      return HttpResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Expected array of events' } },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        processed: body.length,
        timestamp: new Date().toISOString(),
      },
    });
  }),

  http.post(`${BASE_URL}/api/analytics/events`, async ({ request }) => {
    await delay(50);

    return HttpResponse.json({
      success: true,
      data: { eventId: `event-${Date.now()}` },
    });
  }),

  // --------------------------------------------------------------------------
  // Health Check
  // --------------------------------------------------------------------------

  http.get(`${BASE_URL}/health`, async () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  }),

  // --------------------------------------------------------------------------
  // Content Details
  // --------------------------------------------------------------------------

  http.get(`${BASE_URL}/api/streaming/details/:id`, async ({ params }) => {
    await delay(100);

    const result = mockSearchResults.find(r => r.content.id === params.id);

    if (!result) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: result,
    });
  }),

  // --------------------------------------------------------------------------
  // Streaming Recommendations
  // --------------------------------------------------------------------------

  http.get(`${BASE_URL}/api/streaming/recommendations`, async () => {
    await delay(100);
    return HttpResponse.json({
      success: true,
      data: mockSearchResults,
    });
  }),
];

export default handlers;
