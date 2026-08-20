/**
 * MSW Request Handlers
 *
 * Network-level API mocking for tests. These handlers intercept HTTP requests
 * and return mock responses that match the actual API contracts.
 *
 * Usage:
 * - Import handlers in your test setup
 * - Use server.use() to override handlers for specific tests
 * - All handlers are designed to match the backend API structure
 */

import { http, HttpResponse, delay } from 'msw';
import {
  mockUser,
  mockAuthTokens,
  mockUserSubscription,
  mockSearchResults,
  mockContent,
  mockWatchlistItems,
  mockWatchlistStats,
  mockStreamingServices,
  mockUserSubscriptions,
  mockVpnCountries,
  mockVpnCountryRecommendations,
  mockPaywallInfo,
  mockSocialConnections,
  mockNotifications,
  mockErrorResponses,
} from './testData';

// Base API URL - matches the frontend configuration
// MSW intercepts both relative (/api/*) and absolute (http://localhost:8020/api/*) URLs
const API_BASE = '/api';

// Also handle requests to the full localhost URL (used in tests when API_BASE_URL is set)
const LOCALHOST_API_BASE = 'http://localhost:8020/api';

// Helper to create handlers for both relative and absolute URLs
// This ensures handlers work regardless of API_BASE_URL configuration
function createUrlPatterns(path: string): string[] {
  return [
    `${API_BASE}${path}`,
    `${LOCALHOST_API_BASE}${path}`,
  ];
}

// ============================================================================
// Authentication Handlers
// ============================================================================

// Handler implementations (shared between URL patterns)
const loginHandler = async ({ request }: { request: Request }) => {
  await delay(100);

  const body = (await request.json()) as { email?: string; password?: string; rememberMe?: boolean };

  if (!body.email || !body.password) {
    return HttpResponse.json(mockErrorResponses.validationError, { status: 400 });
  }

  if (body.email === 'invalid@test.com') {
    return HttpResponse.json(
      { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
      { status: 401 }
    );
  }

  if (body.email === 'network-error@test.com') {
    return HttpResponse.error();
  }

  return HttpResponse.json({
    user: {
      ...mockUser,
      email: body.email,
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      emailConfirmed: true,
      roles: ['user'],
      permissions: [],
      createdAt: mockUser.createdAt,
    },
    success: true,
    message: 'Login successful',
  });
};

// Register handler implementation
const registerHandler = async ({ request }: { request: Request }) => {
  await delay(100);

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    confirmPassword?: string;
    firstName?: string;
    lastName?: string;
  };

  if (!body.email || !body.password) {
    return HttpResponse.json(mockErrorResponses.validationError, { status: 400 });
  }

  if (body.email === 'existing@test.com') {
    return HttpResponse.json({ message: 'Email already registered', code: 'EMAIL_EXISTS' }, { status: 409 });
  }

  return HttpResponse.json(
    {
      user: {
        ...mockUser,
        email: body.email,
        firstName: body.firstName || 'New',
        lastName: body.lastName || 'User',
        name: `${body.firstName || 'New'} ${body.lastName || 'User'}`,
        displayName: `${body.firstName || 'New'} ${body.lastName || 'User'}`,
        isActive: true,
        emailConfirmed: false,
        roles: ['user'],
        permissions: [],
        createdAt: new Date().toISOString(),
      },
      success: true,
      message: 'Registration successful',
    },
    { status: 201 }
  );
};

// Auth/me handler implementation
const meHandler = async ({ request }: { request: Request }) => {
  await delay(50);

  const authHeader = request.headers.get('Authorization');
  const authMode = request.headers.get('X-Auth-Mode');

  if (authMode === 'cookie') {
    return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
  }

  return HttpResponse.json({
    ...mockUser,
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    emailConfirmed: true,
    roles: ['user'],
    permissions: [],
  });
};

// Logout handler implementation
const logoutHandler = async () => {
  await delay(50);
  return HttpResponse.json({ success: true });
};

// Refresh token handler implementation
const refreshTokenHandler = async () => {
  await delay(50);
  return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
};

export const authHandlers = [
  // Login - Both relative and localhost URLs
  http.post(`${API_BASE}/auth/login`, loginHandler),
  http.post(`${LOCALHOST_API_BASE}/auth/login`, loginHandler),

  // Register - Both relative and localhost URLs
  http.post(`${API_BASE}/auth/register`, registerHandler),
  http.post(`${LOCALHOST_API_BASE}/auth/register`, registerHandler),

  // Get current user - Both relative and localhost URLs
  http.get(`${API_BASE}/auth/me`, meHandler),
  http.get(`${LOCALHOST_API_BASE}/auth/me`, meHandler),

  // Logout - Both relative and localhost URLs
  http.post(`${API_BASE}/auth/logout`, logoutHandler),
  http.post(`${LOCALHOST_API_BASE}/auth/logout`, logoutHandler),
  http.post(`${API_BASE}/auth/logout-all`, logoutHandler),
  http.post(`${LOCALHOST_API_BASE}/auth/logout-all`, logoutHandler),

  // Refresh token - Both relative and localhost URLs
  http.post(`${API_BASE}/auth/refresh-token`, refreshTokenHandler),
  http.post(`${LOCALHOST_API_BASE}/auth/refresh-token`, refreshTokenHandler),

  // Legacy refresh endpoint with token body (JWT mode)
  http.post(`${API_BASE}/auth/refresh`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as { refreshToken?: string };

    if (!body.refreshToken) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    return HttpResponse.json(mockAuthTokens);
  }),

  // Refresh token (httpOnly cookie endpoint - used by AuthContext)
  // Default behavior: return 401 (simulates expired/no session)
  // Tests that need refresh to succeed should override this handler
  http.post(`${API_BASE}/auth/refresh-token`, async () => {
    await delay(50);
    // Default: simulate no valid session (anonymous user)
    return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
  }),

  // OAuth initiations
  http.get(`${API_BASE}/auth/google/initiate`, async () => {
    return HttpResponse.json({
      isSuccess: true,
      authorizationUrl: 'https://accounts.google.com/oauth/authorize?client_id=mock',
      state: 'mock-state-123',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    });
  }),

  http.get(`${API_BASE}/auth/apple/initiate`, async () => {
    return HttpResponse.json({
      isSuccess: true,
      authorizationUrl: 'https://appleid.apple.com/auth/authorize?client_id=mock',
      state: 'mock-state-456',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    });
  }),
];

// ============================================================================
// Search Handlers
// ============================================================================

export const searchHandlers = [
  // Global search
  http.get(`${API_BASE}/search`, async ({ request }) => {
    await delay(150);

    const url = new URL(request.url);
    const query = url.searchParams.get('q') || url.searchParams.get('query') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

    if (!query) {
      return HttpResponse.json({
        query: '',
        results: [],
        totalResults: 0,
        page: 1,
        pageSize,
        suggestions: ['shawshank', 'godfather', 'dark knight'],
        searchTime: 0,
      });
    }

    // Filter results based on query
    const filteredResults = mockSearchResults.filter(
      result =>
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.description?.toLowerCase().includes(query.toLowerCase())
    );

    return HttpResponse.json({
      query,
      results: filteredResults.slice((page - 1) * pageSize, page * pageSize),
      totalResults: filteredResults.length,
      page,
      pageSize,
      suggestions: query.length > 2 ? ['suggestion 1', 'suggestion 2'] : [],
      searchTime: Math.random() * 100 + 50,
    });
  }),

  // Paywalled search
  http.get(`${API_BASE}/search/paywalled`, async ({ request }) => {
    await delay(150);

    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

    const authHeader = request.headers.get('Authorization');
    const isAuthenticated = authHeader && authHeader.startsWith('Bearer ');

    // For unauthenticated users, limit results
    const effectivePageSize = isAuthenticated ? pageSize : Math.min(pageSize, 5);

    const filteredResults = mockSearchResults.filter(result =>
      result.title.toLowerCase().includes(query.toLowerCase())
    );

    return HttpResponse.json({
      query,
      results: filteredResults.slice(0, effectivePageSize).map((r, i) => ({
        ...r,
        isPaywalled: !isAuthenticated && i >= 3,
      })),
      totalResults: filteredResults.length,
      page,
      pageSize: effectivePageSize,
      paywallInfo: isAuthenticated
        ? { ...mockPaywallInfo, isPaywallActive: false }
        : mockPaywallInfo,
    });
  }),

  // Autocomplete
  http.get(`${API_BASE}/search/autocomplete`, async ({ request }) => {
    await delay(50);

    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    if (query.length < 2) {
      return HttpResponse.json({ suggestions: [] });
    }

    const suggestions = mockSearchResults
      .filter(r => r.title.toLowerCase().includes(query.toLowerCase()))
      .map(r => r.title)
      .slice(0, 5);

    return HttpResponse.json({ suggestions });
  }),
];

// ============================================================================
// Content Handlers
// ============================================================================

export const contentHandlers = [
  // Get content by type and ID
  http.get(`${API_BASE}/content/:type/:id`, async ({ params }) => {
    await delay(100);

    const { id } = params;

    if (id === 'not-found') {
      return HttpResponse.json(mockErrorResponses.notFound, { status: 404 });
    }

    // Return the mock content, adjusting ID if needed
    return HttpResponse.json({
      ...mockContent,
      id: id as string,
    });
  }),

  // Get related content
  http.get(`${API_BASE}/content/related`, async ({ request }) => {
    await delay(100);

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '12');

    return HttpResponse.json(mockSearchResults.slice(0, limit).map(r => ({
      ...mockContent,
      id: r.id,
      title: r.title,
      genres: r.genres || [],
    })));
  }),

  // Get popular content
  http.get(`${API_BASE}/content/popular`, async ({ request }) => {
    await delay(100);

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    return HttpResponse.json(mockSearchResults.slice(0, limit));
  }),

  // Get streaming availability
  http.get(`${API_BASE}/streaming/availability/:id`, async () => {
    await delay(100);

    return HttpResponse.json(mockContent.streamingOptions);
  }),
];

// ============================================================================
// Watchlist Handlers
// ============================================================================

export const watchlistHandlers = [
  // Get user watchlists
  http.get(`${API_BASE}/Watchlist`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    return HttpResponse.json({
      success: true,
      data: mockWatchlistItems,
    });
  }),

  // Get watchlist items
  http.get(`${API_BASE}/Watchlist/:watchlistId/items`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    return HttpResponse.json({
      success: true,
      data: mockWatchlistItems,
      pagination: {
        page: 1,
        limit: 50,
        total: mockWatchlistItems.length,
        totalPages: 1,
      },
    });
  }),

  // Add watchlist item
  http.post(`${API_BASE}/Watchlist/:watchlistId/items`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    const body = await request.json() as Record<string, unknown>;

    return HttpResponse.json(
      {
        success: true,
        data: {
          id: `wl-item-${Date.now()}`,
          ...body,
          addedDate: new Date(),
          lastChecked: new Date(),
        },
      },
      { status: 201 }
    );
  }),

  // Update watchlist item
  http.put(`${API_BASE}/Watchlist/items/:itemId`, async ({ request, params }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    const body = await request.json() as Record<string, unknown>;
    const { itemId } = params;

    return HttpResponse.json({
      success: true,
      data: {
        ...mockWatchlistItems[0],
        ...body,
        id: itemId,
      },
    });
  }),

  // Delete watchlist item
  http.delete(`${API_BASE}/Watchlist/items/:itemId`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    return HttpResponse.json({
      success: true,
      data: true,
    });
  }),

  // Get watchlist analytics
  http.get(`${API_BASE}/Watchlist/analytics`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    return HttpResponse.json({
      success: true,
      data: mockWatchlistStats,
    });
  }),

  // Search watchlist
  http.get(`${API_BASE}/Watchlist/search`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('query') || '';

    const results = mockWatchlistItems.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );

    return HttpResponse.json({
      success: true,
      data: results,
    });
  }),
];

// ============================================================================
// Streaming & VPN Handlers
// ============================================================================

export const streamingHandlers = [
  // Get streaming services
  http.get(`${API_BASE}/streaming/services`, async () => {
    await delay(50);
    return HttpResponse.json(mockStreamingServices);
  }),

  // Get user streaming subscriptions
  http.get(`${API_BASE}/streaming/subscriptions`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    return HttpResponse.json(mockUserSubscriptions);
  }),

  // User streaming subscriptions (cookie-auth endpoint used by useSubscriptions hook)
  // Default: return the user's subscriptions successfully. This auto-fetch fires on mount
  // for any component using useSubscriptions; without a handler the request bypasses to the
  // real network and rejects AFTER the test tears down, leaking a console.error that jest
  // turns into a "Cannot log after tests are done" failure on an unrelated test.
  // Tests needing an error path override this via server.use().
  ...createUrlPatterns('/usersubscriptions').map(pattern =>
    http.get(pattern, async () => {
      return HttpResponse.json(mockUserSubscriptions);
    })
  ),

  // Add streaming subscription
  http.post(`${API_BASE}/streaming/subscriptions`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    const body = (await request.json()) as { serviceId: string; serviceName: string };

    return HttpResponse.json(
      {
        id: `usub-${Date.now()}`,
        userId: mockUser.id,
        ...body,
        isActive: true,
        addedAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // VPN countries
  http.get(`${API_BASE}/vpn/countries`, async () => {
    await delay(50);
    return HttpResponse.json(mockVpnCountries);
  }),

  // User location
  http.get(`${API_BASE}/vpn/location`, async () => {
    await delay(50);
    return HttpResponse.json({
      countryCode: 'US',
      countryName: 'United States',
      autoDetected: true,
      detectionMethod: 'ip',
    });
  }),
];

// ============================================================================
// Subscription Handlers
// ============================================================================

export const subscriptionHandlers = [
  // Get user subscription
  http.get(`${API_BASE}/subscription`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    return HttpResponse.json(mockUserSubscription);
  }),

  // Get subscription plans
  http.get(`${API_BASE}/subscription/plans`, async () => {
    await delay(50);

    return HttpResponse.json([
      {
        id: 'free',
        name: 'Free',
        tier: 0,
        price: 0,
        currency: 'USD',
        interval: 'month',
        features: ['5 searches per day', 'Basic results'],
      },
      {
        id: 'basic',
        name: 'Basic',
        tier: 1,
        price: 4.99,
        currency: 'USD',
        interval: 'month',
        features: ['50 searches per day', 'Streaming links', 'No ads'],
      },
      {
        id: 'premium',
        name: 'Premium',
        tier: 2,
        price: 9.99,
        currency: 'USD',
        interval: 'month',
        features: ['Unlimited searches', 'All features', 'Priority support'],
      },
    ]);
  }),

  // Create checkout session
  http.post(`${API_BASE}/subscription/checkout`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    return HttpResponse.json({
      sessionId: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
    });
  }),
];

// ============================================================================
// Social Handlers
// ============================================================================

export const socialHandlers = [
  // Get social connections
  http.get(`${API_BASE}/social/connections`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    return HttpResponse.json(mockSocialConnections);
  }),

  // Disconnect social platform
  http.delete(`${API_BASE}/social/connections/:platform`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    return HttpResponse.json({ success: true });
  }),
];

// ============================================================================
// Notification Handlers
// ============================================================================

export const notificationHandlers = [
  // Get notifications
  http.get(`${API_BASE}/Watchlist/notifications/settings`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json(mockErrorResponses.unauthorized, { status: 401 });
    }

    return HttpResponse.json({
      success: true,
      data: mockNotifications,
    });
  }),
];

// ============================================================================
// Health Check Handler
// ============================================================================

export const healthHandlers = [
  http.get(`${API_BASE}/health`, async () => {
    return HttpResponse.json({
      status: 'healthy',
      checks: {
        database: { status: 'healthy', duration: 5 },
        cache: { status: 'healthy', duration: 2 },
        api: { status: 'healthy', duration: 1 },
      },
      totalDuration: 8,
      timestamp: new Date().toISOString(),
    });
  }),
];

// ============================================================================
// VPN Guidance Handlers
// ============================================================================

export const vpnGuidanceHandlers = [
  // Get country recommendations for specific content
  ...createUrlPatterns('/vpnguidance/countries-for-content/:contentId').map(pattern =>
    http.get(pattern, async ({ params: _params }) => {
      await delay(100);

      return HttpResponse.json(mockVpnCountryRecommendations);
    })
  ),
];

// ============================================================================
// ASO Analytics Handlers
// ============================================================================

// ASOAnalyticsDashboard fires three independent auto-fetches on mount
// (keywords, abtest, reviews). The abtest/reviews catch blocks log console.warn,
// so without default handlers an incidental mount bypasses to the real network and
// leaks a "Cannot log after tests are done" failure. Tests override via server.use().
export const asoHandlers = [
  http.get(`${API_BASE}/aso/keywords`, async () => {
    return HttpResponse.json({
      keywords: [],
      totalKeywords: 0,
      averageRanking: 0,
      totalSearchVolume: 0,
    });
  }),
  http.get(`${API_BASE}/aso/abtest`, async () => {
    return HttpResponse.json({});
  }),
  http.get(`${API_BASE}/aso/reviews`, async () => {
    return HttpResponse.json({});
  }),
];

// ============================================================================
// Geolocation Handlers (external third-party boundary)
// ============================================================================

export const geoHandlers = [
  // IP geolocation used by useUserCountry hook. This fires on mount for any component
  // using the hook; without a handler the request bypasses to the real ipapi.co endpoint
  // and rejects AFTER the test tears down, leaking a console.warn that jest turns into a
  // "Cannot log after tests are done" failure on an unrelated test.
  http.get('https://ipapi.co/json/', async () => {
    return HttpResponse.json({
      country_code: 'US',
      country_name: 'United States',
    });
  }),
];

// ============================================================================
// Combined Handlers Export
// ============================================================================

export const handlers = [
  ...authHandlers,
  ...searchHandlers,
  ...contentHandlers,
  ...watchlistHandlers,
  ...streamingHandlers,
  ...subscriptionHandlers,
  ...socialHandlers,
  ...notificationHandlers,
  ...healthHandlers,
  ...vpnGuidanceHandlers,
  ...asoHandlers,
  ...geoHandlers,
];

// Export individual handler groups for selective use
export {
  authHandlers as auth,
  searchHandlers as search,
  contentHandlers as content,
  watchlistHandlers as watchlist,
  streamingHandlers as streaming,
  subscriptionHandlers as subscription,
  socialHandlers as social,
  notificationHandlers as notifications,
  healthHandlers as health,
  vpnGuidanceHandlers as vpnGuidance,
  asoHandlers as aso,
  geoHandlers as geo,
};
