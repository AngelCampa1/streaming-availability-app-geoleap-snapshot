/**
 * Manual Fetch Mock for React Native Tests
 *
 * Alternative to MSW since MSW doesn't intercept in React Native + Node.js environment.
 * This provides a simpler, direct fetch mock that works with our test infrastructure.
 *
 * IMPORTANT: This file must be loaded AFTER polyfills but BEFORE app setup.
 *
 * Supports dynamic handler overrides similar to MSW's server.use() via mockServer.use()
 */

// Store original fetch for fallback
const originalFetch = global.fetch;

// Store dynamic handler overrides
let handlerOverrides = [];

// Import mock data from MSW handlers
const mockUserProfile = {
  id: 'user-123',
  email: 'test@geoleap.app',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  avatar: 'https://example.com/avatar.jpg',
  bio: 'Test user bio',
  location: 'Test City',
  emailVerified: true,
  biometricEnabled: false,
  twoFactorEnabled: false,
  createdAt: '2024-01-01T00:00:00Z',
  lastLoginAt: '2025-01-01T00:00:00Z',
};

const mockUserPreferences = {
  language: 'en',
  theme: 'light',
  notifications: {
    email: true,
    push: true,
    newReleases: true,
    recommendations: true,
    watchlistUpdates: true,
  },
  privacy: {
    profileVisibility: 'public',
    watchlistVisibility: 'friends',
    showActivity: true,
  },
  contentFilters: {
    preferredGenres: ['Action', 'Drama', 'Sci-Fi'],
    excludedGenres: ['Horror'],
    maturityRating: 'R',
  },
};

const mockUserStats = {
  totalWatchTime: 18720,  // Match test expectations (312 hours in minutes)
  moviesWatched: 150,     // Match test expectations
  episodesWatched: 0,     // Keep as 0
  averageRating: 4.2,
  favoriteGenres: ['Action', 'Drama', 'Sci-Fi'],
  watchStreak: 0,
  joinDate: '2024-01-01T00:00:00Z',
};

/**
 * Mock fetch implementation that intercepts API calls
 */
global.fetch = jest.fn(async (url, options = {}) => {
  // Handle Request object (used by axios fetch adapter)
  let urlString, method, hasAuth, body;

  if (url instanceof Request || (url && typeof url === 'object' && url.url && url.method)) {
    // axios passes a Request object
    urlString = url.url;
    method = url.method || 'GET';
    hasAuth = url.headers?.get?.('Authorization') || url.headers?.get?.('authorization');

    // CRITICAL: Read body from Request object if it's a stream
    if (url.body) {
      try {
        // Clone the request so body can be read
        const clonedRequest = url.clone?.() || url;
        body = await clonedRequest.text();
      } catch (e) {
        body = url.body; // Fallback if clone/text fails
      }
    }
  } else {
    // Standard fetch call with URL string
    urlString = typeof url === 'string' ? url : (url?.href || String(url));
    method = options.method || 'GET';
    hasAuth = options.headers?.Authorization || options.headers?.authorization;
    body = options.body;
  }

  // Check authorization header (fallback to options if not in Request)
  if (!hasAuth && options.headers) {
    hasAuth = options.headers.Authorization || options.headers.authorization;
  }

  // Check for handler overrides first (like MSW's server.use())
  for (const override of handlerOverrides) {
    if (override.matches(urlString, method)) {
      console.log(`[FETCH MOCK] Override match: ${method} ${urlString}`);
      // Create modified options with extracted body
      const modifiedOptions = { ...options, body, method };
      const result = await override.handler(url, modifiedOptions);
      console.log(`[FETCH MOCK] Override result:`, result?.status, result?.statusText);
      return result;
    }
  }

  // Helper to create mock response
  const createResponse = (data, status = 200, statusText = 'OK') => ({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Map([
      ['content-type', 'application/json'],
      ['x-mock', 'true'],
    ]),
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
  });

  // User Profile endpoints (uses /api/user-profile)
  if (urlString.includes('/api/user-profile') && method === 'GET') {
    if (!hasAuth) {
      return createResponse({ error: 'Unauthorized' }, 401, 'Unauthorized');
    }
    return createResponse({ profile: mockUserProfile });
  }

  if (urlString.includes('/api/user-profile') && method === 'PUT') {
    if (!hasAuth) {
      return createResponse({ error: 'Unauthorized' }, 401, 'Unauthorized');
    }
    const requestBody = JSON.parse(body || options.body || '{}');
    const updatedProfile = { ...mockUserProfile, ...requestBody };
    return createResponse({ profile: updatedProfile });
  }

  // User Preferences endpoints (uses /api/preferences)
  if (urlString.includes('/api/preferences') && method === 'GET') {
    if (!hasAuth) {
      return createResponse({ error: 'Unauthorized' }, 401, 'Unauthorized');
    }
    return createResponse({ preferences: mockUserPreferences });
  }

  if (urlString.includes('/api/preferences') && method === 'PUT') {
    if (!hasAuth) {
      return createResponse({ error: 'Unauthorized' }, 401, 'Unauthorized');
    }
    const requestBody = JSON.parse(body || options.body || '{}');
    const updatedPreferences = { ...mockUserPreferences, ...requestBody };
    return createResponse({ preferences: updatedPreferences });
  }

  // User Stats endpoint (uses /users/stats - NO /api/ prefix)
  if (urlString.includes('/users/stats') && method === 'GET') {
    if (!hasAuth) {
      return createResponse({ error: 'Unauthorized' }, 401, 'Unauthorized');
    }
    return createResponse({ stats: mockUserStats });
  }

  // User Activity endpoint (uses /users/activity - NO /api/ prefix)
  if (urlString.includes('/users/activity') && method === 'GET') {
    if (!hasAuth) {
      return createResponse({ error: 'Unauthorized' }, 401, 'Unauthorized');
    }
    return createResponse({
      activities: [
        {
          id: 'activity-1',
          type: 'watched',
          itemType: 'movie',
          itemId: 'movie-1',
          itemTitle: 'Test Movie 1',
          itemPoster: 'https://example.com/poster1.jpg',
          timestamp: '2025-01-01T12:00:00Z',
        },
        {
          id: 'activity-2',
          type: 'rated',
          itemType: 'movie',
          itemId: 'movie-2',
          itemTitle: 'Test Movie 2',
          itemPoster: 'https://example.com/poster2.jpg',
          rating: 5,
          timestamp: '2025-01-02T12:00:00Z',
        },
      ]
    });
  }

  // Avatar Upload endpoint (uses /users/avatar - NO /api/ prefix)
  if (urlString.includes('/users/avatar') && method === 'POST') {
    if (!hasAuth) {
      return createResponse({ error: 'Unauthorized' }, 401, 'Unauthorized');
    }
    return createResponse({
      avatarUrl: 'https://example.com/avatars/test-user-new.jpg'
    });
  }

  // Delete Account endpoint (uses /api/users/account)
  if (urlString.includes('/api/users/account') && method === 'DELETE') {
    if (!hasAuth) {
      return createResponse({ error: 'Unauthorized' }, 401, 'Unauthorized');
    }
    return createResponse({ success: true });
  }

  // Network quality test endpoints (used by NetworkService)
  if (urlString.includes('api.geoleap.com/health') || urlString.includes('api.geoleap.app/health')) {
    return createResponse({ status: 'ok', timestamp: new Date().toISOString() });
  }

  if (urlString.includes('httpbin.org/get')) {
    return createResponse({ origin: '127.0.0.1', url: urlString });
  }

  if (urlString.includes('jsonplaceholder.typicode.com')) {
    return createResponse({ id: 1, title: 'Test', body: 'Test content' });
  }

  // User preferences endpoints
  // NOTE: Return RAW data - ApiService wraps it in {success, data, status, ...}
  if (urlString.includes('/users/') && urlString.includes('/preferences')) {
    if (method === 'GET') {
      const mockPreferences = {
        genres: { 'Sci-Fi': 0.8, 'Drama': 0.6, 'Action': 0.7 },
        types: { 'tv_series': 0.7, 'movie': 0.3 },
        runtime: {
          preferred: 120, // Default runtime preference in minutes
          min: 60,
          max: 180,
        },
        streamingServices: { 'Netflix': 0.6, 'HBO Max': 0.4 },
      };
      return createResponse(mockPreferences);
    }
    if (method === 'PUT') {
      return createResponse({ message: 'Preferences updated' });
    }
  }

  // Recommendation feedback endpoint
  if (urlString.includes('/api/recommendations/feedback') && method === 'POST') {
    return createResponse({ message: 'Feedback recorded' });
  }

  // Recommendation refresh endpoint
  if (urlString.includes('/recommendations/refresh/') && method === 'POST') {
    return createResponse({ message: 'Refresh triggered' });
  }

  // Recommendation endpoints
  // NOTE: Return RAW data - ApiService wraps it in {success, data, status, ...}

  // Trending recommendations
  if (urlString.includes('/recommendations/trending') && method === 'GET') {
    const trendingRecs = [
      {
        id: 'trend-1',
        title: 'Wednesday',
        type: 'tv_series',
        rating: 8.1,
        year: 2022,
        availableOn: ['Netflix'],
        genres: ['Comedy', 'Mystery', 'Fantasy'],
        matchScore: 0.85,
        confidence: 0.80,
        source: 'trending',
        reason: 'Trending now',
        metadata: {},
        createdAt: new Date().toISOString(),
      },
      {
        id: 'trend-2',
        title: 'The Last of Us',
        type: 'tv_series',
        rating: 8.8,
        year: 2023,
        availableOn: ['HBO Max'],
        genres: ['Sci-Fi', 'Drama', 'Thriller'],
        matchScore: 0.90,
        confidence: 0.85,
        source: 'trending',
        reason: 'Trending now',
        metadata: {},
        createdAt: new Date().toISOString(),
      },
    ];

    // Filter by genre if specified
    try {
      const url = new URL(urlString);
      const genre = url.searchParams.get('genre');
      if (genre) {
        return createResponse(trendingRecs.filter(rec => rec.genres.includes(genre)));
      }
    } catch (e) {
      // URL parsing failed, return all
    }

    return createResponse(trendingRecs);
  }

  // Friend recommendations
  if (urlString.includes('/recommendations/friends/') && method === 'GET') {
    const userId = urlString.match(/\/recommendations\/friends\/([^/?]+)/)?.[1];
    if (userId === 'no-friends') {
      return createResponse([]);
    }

    const friendRecs = [
      {
        id: 'friend-1',
        title: 'Breaking Bad',
        type: 'tv_series',
        rating: 9.5,
        year: 2008,
        availableOn: ['Netflix'],
        genres: ['Drama', 'Crime', 'Thriller'],
        matchScore: 0.95,
        confidence: 0.90,
        source: 'friends',
        reason: 'Recommended by 3 friends',
        metadata: { friendCount: 3 },
        createdAt: new Date().toISOString(),
      },
    ];
    return createResponse(friendRecs);
  }

  // Similar content recommendations
  if (urlString.includes('/recommendations/similar/') && method === 'GET') {
    const contentId = urlString.match(/\/recommendations\/similar\/([^/?]+)/)?.[1];
    if (contentId === 'not-found') {
      return createResponse([]);
    }

    const similarRecs = [
      {
        id: 'similar-1',
        title: 'Interstellar',
        type: 'movie',
        rating: 8.6,
        year: 2014,
        availableOn: ['Netflix'],
        genres: ['Sci-Fi', 'Drama'],
        matchScore: 0.88,
        confidence: 0.85,
        source: 'content_based',
        reason: 'Similar themes and style',
        metadata: {},
        createdAt: new Date().toISOString(),
      },
    ];
    return createResponse(similarRecs);
  }

  // "Because you watched" recommendations
  if (urlString.includes('/recommendations/because-you-watched/') && method === 'GET') {
    const becauseYouWatched = [
      {
        id: 'byw-1',
        title: 'Arrival',
        type: 'movie',
        rating: 7.9,
        year: 2016,
        availableOn: ['Hulu'],
        genres: ['Sci-Fi', 'Drama'],
        matchScore: 0.86,
        confidence: 0.82,
        source: 'content_based',
        reason: 'Because you watched Inception',
        metadata: {},
        createdAt: new Date().toISOString(),
      },
    ];
    return createResponse(becauseYouWatched);
  }

  // Recommendation insights
  if (urlString.includes('/recommendations/insights/') && method === 'GET') {
    const insights = {
      accuracyRate: 0.75,
      clickThroughRate: 0.42,
      addToWatchlistRate: 0.35,
      topGenres: ['Sci-Fi', 'Drama', 'Action'],
      topSources: ['collaborative', 'content_based'],
      improvementSuggestions: [
        'Rate more content to improve recommendations',
        'Add more items to your watchlist',
      ],
    };
    return createResponse(insights);
  }

  // Main /recommendations endpoint with filtering support
  // Only match base /recommendations, not sub-routes like /recommendations/trending
  if (urlString.match(/\/recommendations(\?|$)/) && method === 'GET') {
    const allRecommendations = [
      {
        id: 'rec-1',
        title: 'Stranger Things',
        type: 'tv_series',
        rating: 8.7,
        year: 2016,
        availableOn: ['Netflix'],
        genres: ['Sci-Fi', 'Horror', 'Drama'],
        matchScore: 0.92,
        confidence: 0.88,
        source: 'collaborative',
        reason: 'Based on your watch history',
        metadata: {},
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec-2',
        title: 'The Witcher',
        type: 'tv_series',
        rating: 8.2,
        year: 2019,
        availableOn: ['Netflix'],
        genres: ['Fantasy', 'Adventure', 'Action'],
        matchScore: 0.85,
        confidence: 0.82,
        source: 'content_based',
        reason: 'Similar to shows you enjoyed',
        metadata: {},
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec-3',
        title: 'Inception',
        type: 'movie',
        rating: 8.8,
        year: 2010,
        availableOn: ['Netflix'],
        genres: ['Sci-Fi', 'Action', 'Thriller'],
        matchScore: 0.90,
        confidence: 0.85,
        source: 'collaborative',
        reason: 'Highly rated sci-fi',
        metadata: {},
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec-4',
        title: 'The Matrix',
        type: 'movie',
        rating: 8.7,
        year: 1999,
        availableOn: ['HBO Max'],
        genres: ['Sci-Fi', 'Action'],
        matchScore: 0.88,
        confidence: 0.83,
        source: 'content_based',
        reason: 'Classic sci-fi action',
        metadata: {},
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec-5',
        title: 'Dark',
        type: 'tv_series',
        rating: 8.8,
        year: 2017,
        availableOn: ['Netflix'],
        genres: ['Sci-Fi', 'Mystery', 'Thriller'],
        matchScore: 0.87,
        confidence: 0.80,
        source: 'collaborative',
        reason: 'Complex sci-fi narrative',
        metadata: {},
        createdAt: new Date().toISOString(),
      },
    ];

    // Parse filters from query string
    try {
      const url = new URL(urlString);
      const filtersParam = url.searchParams.get('filters');
      const countParam = url.searchParams.get('count');

      let filteredRecs = [...allRecommendations];

      if (filtersParam) {
        const filters = JSON.parse(filtersParam);

        // Apply genre filter
        if (filters.genres && Array.isArray(filters.genres)) {
          filteredRecs = filteredRecs.filter(rec =>
            filters.genres.some((g) => rec.genres.includes(g))
          );
        }

        // Apply type filter
        if (filters.types && Array.isArray(filters.types)) {
          filteredRecs = filteredRecs.filter(rec =>
            filters.types.includes(rec.type)
          );
        }

        // Apply minimum rating filter
        if (filters.minRating !== undefined) {
          filteredRecs = filteredRecs.filter(rec =>
            rec.rating >= filters.minRating
          );
        }
      }

      // Apply count limit
      const count = countParam ? parseInt(countParam, 10) : filteredRecs.length;
      filteredRecs = filteredRecs.slice(0, count);

      return createResponse(filteredRecs);
    } catch (e) {
      // If URL parsing fails, return all recommendations
      return createResponse(allRecommendations.slice(0, 20));
    }
  }

  // Streaming availability endpoints
  if (urlString.includes('/api/streaming-availability/search') && method === 'GET') {
    // NOTE: Return RAW data - ApiService wraps it in {success, data, status, ...}
    // Mock streaming content matching MSW handler data
    const url = new URL(urlString);
    const query = url.searchParams.get('query') || '';
    const type = url.searchParams.get('type'); // 'movie', 'series', null
    const year = url.searchParams.get('year');

    // Full mock data matching streaming.handlers.ts
    const allMockResults = [
      {
        id: 'movie-1',
        imdbId: 'tt0133093',
        title: 'The Matrix',
        type: 'movie',
        showType: 'movie',
        year: 1999,
        releaseYear: 1999,
        rating: 8.7,
        overview: 'A computer hacker learns about the true nature of reality',
        genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Sci-Fi' }],
        imageSet: {
          verticalPoster: { w480: 'https://example.com/matrix-poster.jpg' }
        }
      },
      {
        id: 'series-1',
        imdbId: 'tt0903747',
        title: 'Breaking Bad',
        type: 'series',
        showType: 'series',
        year: 2008,
        firstAirYear: 2008,
        rating: 9.5,
        overview: 'A chemistry teacher turned meth manufacturer',
        seasonCount: 5,
        episodeCount: 62,
        genres: [{ id: 3, name: 'Crime' }, { id: 4, name: 'Drama' }],
        imageSet: {
          verticalPoster: { w480: 'https://example.com/breaking-bad-poster.jpg' }
        }
      },
      {
        id: 'movie-2',
        imdbId: 'tt1375666',
        title: 'Inception',
        type: 'movie',
        showType: 'movie',
        year: 2010,
        releaseYear: 2010,
        rating: 8.8,
        overview: 'A thief who steals secrets through dream-sharing technology',
        runtime: 148,
        genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Sci-Fi' }, { id: 5, name: 'Thriller' }],
        imageSet: {
          verticalPoster: { w480: 'https://example.com/inception-poster.jpg' }
        }
      }
    ];

    // Apply filters (matching MSW handler logic)
    let results = allMockResults.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );

    // Apply type filter
    if (type) {
      results = results.filter(item => item.showType === type);
    }

    // Apply year filter
    if (year) {
      const yearNum = parseInt(year, 10);
      results = results.filter(item =>
        item.releaseYear === yearNum || item.firstAirYear === yearNum
      );
    }

    return createResponse({ results, total: results.length });
  }

  if (urlString.includes('/api/streaming-availability/by-id') && method === 'GET') {
    // Extract content ID from query params
    const url = new URL(urlString);
    const contentId = url.searchParams.get('id');

    // Mock content library matching search endpoint
    const mockContentLibrary = {
      'movie-1': {
        id: 'movie-1',
        imdbId: 'tt0133093',
        title: 'The Matrix',
        type: 'movie',
        showType: 'movie',
        year: 1999,
        releaseYear: 1999,
        rating: 8.7,
        overview: 'A computer hacker learns about the true nature of reality',
        genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Sci-Fi' }],
        imageSet: {
          verticalPoster: { w480: 'https://example.com/matrix-poster.jpg' },
          horizontalBackdrop: { w1080: 'https://example.com/matrix-backdrop.jpg' }
        }
      },
      'series-1': {
        id: 'series-1',
        imdbId: 'tt0903747',
        title: 'Breaking Bad',
        type: 'series',
        showType: 'series',
        year: 2008,
        firstAirYear: 2008,
        rating: 9.5,
        overview: 'A chemistry teacher turned meth manufacturer',
        seasonCount: 5,
        episodeCount: 62,
        genres: [{ id: 3, name: 'Crime' }, { id: 4, name: 'Drama' }],
        imageSet: {
          verticalPoster: { w480: 'https://example.com/breaking-bad-poster.jpg' },
          horizontalBackdrop: { w1080: 'https://example.com/breaking-bad-backdrop.jpg' }
        }
      },
      'movie-2': {
        id: 'movie-2',
        imdbId: 'tt1375666',
        title: 'Inception',
        type: 'movie',
        showType: 'movie',
        year: 2010,
        releaseYear: 2010,
        rating: 8.8,
        overview: 'A thief who steals secrets through dream-sharing technology',
        runtime: 148,
        genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Sci-Fi' }, { id: 5, name: 'Thriller' }],
        imageSet: {
          verticalPoster: { w480: 'https://example.com/inception-poster.jpg' },
          horizontalBackdrop: { w1080: 'https://example.com/inception-backdrop.jpg' }
        }
      },
      'tt0133093': {
        id: 'movie-1',
        imdbId: 'tt0133093',
        title: 'The Matrix',
        type: 'movie',
        showType: 'movie',
        year: 1999,
        releaseYear: 1999,
        rating: 8.7,
        overview: 'A computer hacker learns about the true nature of reality',
        genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Sci-Fi' }],
        imageSet: {
          verticalPoster: { w480: 'https://example.com/matrix-poster.jpg' },
          horizontalBackdrop: { w1080: 'https://example.com/matrix-backdrop.jpg' }
        }
      }
    };

    const content = mockContentLibrary[contentId];
    return createResponse(content || null);
  }

  if (urlString.includes('/api/content/recommendations') && method === 'GET') {
    const mockRecommendations = [
      {
        id: 'movie-2',
        imdbId: 'tt1375666',
        title: 'Inception',
        type: 'movie',
        showType: 'movie',
        overview: 'A thief who steals secrets through dream-sharing technology',
        releaseYear: 2010,
        rating: 8.8,
        genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Sci-Fi' }],
        imageSet: {
          verticalPoster: { w480: 'https://example.com/inception-poster.jpg' }
        }
      }
    ];
    return createResponse({ results: mockRecommendations });
  }

  if (urlString.includes('/api/content/popular') && method === 'GET') {
    const url = new URL(urlString);
    const type = url.searchParams.get('type');

    // Full mock popular content library
    const allPopularContent = [
      {
        id: 'movie-1',
        imdbId: 'tt0133093',
        title: 'The Matrix',
        type: 'movie',
        showType: 'movie',
        overview: 'A computer hacker learns about the true nature of reality',
        releaseYear: 1999,
        rating: 8.7,
        genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Sci-Fi' }],
        imageSet: {
          verticalPoster: { w480: 'https://example.com/matrix-poster.jpg' }
        }
      },
      {
        id: 'series-1',
        imdbId: 'tt0903747',
        title: 'Breaking Bad',
        type: 'series',
        showType: 'series',
        overview: 'A chemistry teacher turned meth manufacturer',
        firstAirYear: 2008,
        rating: 9.5,
        genres: [{ id: 3, name: 'Crime' }, { id: 4, name: 'Drama' }],
        imageSet: {
          verticalPoster: { w480: 'https://example.com/breaking-bad-poster.jpg' }
        }
      },
      {
        id: 'movie-2',
        imdbId: 'tt1375666',
        title: 'Inception',
        type: 'movie',
        showType: 'movie',
        overview: 'A thief who steals secrets through dream-sharing technology',
        releaseYear: 2010,
        rating: 8.8,
        genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Sci-Fi' }],
        imageSet: {
          verticalPoster: { w480: 'https://example.com/inception-poster.jpg' }
        }
      }
    ];

    // Filter by type if provided
    let results = allPopularContent;
    if (type && type !== 'all') {
      results = allPopularContent.filter(item => item.showType === type);
    }

    return createResponse({ results });
  }

  if (urlString.includes('/api/content/suggestions') && method === 'GET') {
    const url = new URL(urlString);
    const query = url.searchParams.get('query') || '';

    // Mock suggestions matching our content library
    const allSuggestions = [
      { title: 'The Matrix', id: 'movie-1' },
      { title: 'Breaking Bad', id: 'series-1' },
      { title: 'Inception', id: 'movie-2' }
    ];

    // Filter suggestions by query
    const matchingSuggestions = allSuggestions.filter(suggestion =>
      suggestion.title.toLowerCase().includes(query.toLowerCase())
    );

    return createResponse({ suggestions: matchingSuggestions });
  }

  // Legacy search endpoints (keeping for backward compatibility)
  if (urlString.includes('/api/streaming/search/suggest') && method === 'GET') {
    // NOTE: Return RAW data - ApiService wraps it in {success, data, status, ...}
    const mockSuggestions = {
      suggestions: ['us server', 'uk server', 'fast connection'],
      trending: ['fastest servers', 'secure vpn', 'streaming optimized'],
    };
    return createResponse(mockSuggestions);
  }

  if (urlString.includes('/api/streaming/search') && method === 'GET') {
    // NOTE: Return RAW data - ApiService wraps it in {success, data, status, ...}
    // VPN search results - servers, features, locations
    const mockVpnResults = {
      results: [
        {
          id: '1',
          title: 'US East Server',
          description: 'High-speed server located in New York',
          type: 'server',
          score: 0.95,
          metadata: { location: 'New York', country: 'US', ping: 15 },
        },
        {
          id: '2',
          title: 'UK London Server',
          description: 'Optimized server for streaming in London',
          type: 'server',
          score: 0.88,
          metadata: { location: 'London', country: 'UK', ping: 25 },
        },
        {
          id: '3',
          title: 'Kill Switch',
          description: 'Automatic connection protection feature',
          type: 'feature',
          score: 0.76,
          metadata: { category: 'security', available: true },
        },
      ],
      total: 3,
    };
    return createResponse(mockVpnResults);
  }

  // Watchlist endpoints
  // NOTE: Return RAW data - ApiService wraps it in {success, data, status, ...}
  if (urlString.match(/\/api\/watchlist\/[\w-]+$/) && method === 'PUT') {
    // PUT /api/watchlist/:id - Update watchlist
    const watchlistId = urlString.split('/').pop();
    const mockUpdatedWatchlist = {
      watchlist: {
        id: watchlistId,
        name: 'My Watchlist',
        description: 'New description', // Tests expect this to be updated
        isDefault: true,
        isPublic: false,
        items: [],
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    };
    return createResponse(mockUpdatedWatchlist);
  }

  if (urlString.match(/\/api\/streaming\/watchlist\/[\w-]+\/items\/[\w-]+$/) && method === 'PUT') {
    // PUT /api/streaming/watchlist/:watchlistId/items/:itemId - Update watchlist item
    const pathParts = urlString.split('/');
    const itemId = pathParts.pop();
    const watchlistId = pathParts[pathParts.indexOf('watchlist') + 1];

    const mockUpdatedItem = {
      item: {
        id: itemId,
        title: 'Updated Item',
        type: 'movie',
        rating: 8.5,
        year: 2023,
        availableOn: ['Netflix'],
        genres: ['Action', 'Sci-Fi'],
        status: 'watched', // Tests expect this to be updated
        priority: 'high',
        addedAt: new Date().toISOString(),
      }
    };
    return createResponse(mockUpdatedItem);
  }

  if (urlString.includes('/api/watchlists/search') && method === 'GET') {
    // GET /api/watchlists/search - Search watchlist items
    const url = new URL(urlString);
    const query = url.searchParams.get('query') || '';
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');

    // Mock searchable watchlist items
    let mockWatchlistItems = [
      {
        id: 'item-1',
        title: 'Inception',
        type: 'movie',
        rating: 8.8,
        year: 2010,
        availableOn: ['Netflix'],
        genres: ['Action', 'Sci-Fi', 'Thriller'],
        status: 'to_watch',
        priority: 'high',
        addedAt: new Date().toISOString(),
      },
      {
        id: 'item-2',
        title: 'The Matrix',
        type: 'movie',
        rating: 8.7,
        year: 1999,
        availableOn: ['HBO Max'],
        genres: ['Action', 'Sci-Fi'],
        status: 'watched',
        priority: 'medium',
        addedAt: new Date().toISOString(),
      },
      {
        id: 'item-3',
        title: 'Breaking Bad',
        type: 'tv_series',
        rating: 9.5,
        year: 2008,
        availableOn: ['Netflix'],
        genres: ['Crime', 'Drama'],
        status: 'watched',
        priority: 'high',
        addedAt: new Date().toISOString(),
      },
    ];

    // Apply filters
    if (query) {
      mockWatchlistItems = mockWatchlistItems.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase())
      );
    }
    if (type) {
      mockWatchlistItems = mockWatchlistItems.filter(item => item.type === type);
    }
    if (status) {
      mockWatchlistItems = mockWatchlistItems.filter(item => item.status === status);
    }

    return createResponse(mockWatchlistItems);
  }

  // === AUTH ENDPOINTS ===
  // NOTE: Return RAW data (not wrapped) - ApiService will handle wrapping

  // POST /api/auth/login - Email/password login
  if (urlString.includes('/api/auth/login') && method === 'POST') {
    const body = request._body || {};

    // Mock user data (from src/mocks/handlers/auth.handlers.ts)
    const mockUser = {
      id: 'user-123',
      email: body.email || 'test@geoleap.app',
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

    const mockTokens = {
      accessToken: 'mock-access-token-jwt',
      refreshToken: 'mock-refresh-token',
      expiresAt: Date.now() + 3600000, // 1 hour from now
      tokenType: 'Bearer',
    };

    // Return RAW data - ApiService wraps it
    return createResponse({ user: mockUser, tokens: mockTokens });
  }

  // POST /api/auth/register - User registration
  if (urlString.includes('/api/auth/register') && method === 'POST') {
    const body = request._body || {};

    const mockUser = {
      id: 'user-123',
      email: body.email || 'test@geoleap.app',
      username: body.username || 'testuser',
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

    const mockTokens = {
      accessToken: 'mock-access-token-jwt',
      refreshToken: 'mock-refresh-token',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
    };

    return createResponse({ user: mockUser, tokens: mockTokens });
  }

  // POST /api/auth/logout - Logout user
  if (urlString.includes('/api/auth/logout') && method === 'POST') {
    return createResponse({ success: true });
  }

  // POST /api/auth/refresh - Refresh access token
  if (urlString.includes('/api/auth/refresh') && method === 'POST') {
    const body = request._body || {};

    // Simulate expired refresh token
    if (body.refreshToken === 'expired-token') {
      return createResponse(
        { error: 'Refresh token expired', code: 'TOKEN_EXPIRED' },
        401,
        'Unauthorized'
      );
    }

    // Successful refresh
    return createResponse({
      accessToken: 'new-mock-access-token',
      expiresAt: Date.now() + 3600000,
    });
  }

  // GET /api/auth/me - Get current user
  if (urlString.includes('/api/auth/me') && method === 'GET') {
    const mockUser = {
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

    return createResponse({ user: mockUser });
  }

  // Fallback: Log unmocked request and return 404
  console.warn(`[FETCH MOCK] Unmocked request: ${method} ${urlString}`);
  return createResponse({ error: 'Not Found', path: urlString }, 404, 'Not Found');
});

/**
 * Helper to reset fetch mock between tests
 */
global.resetFetchMock = () => {
  global.fetch.mockClear();
};

/**
 * Helper to restore original fetch (for cleanup)
 */
global.restoreFetch = () => {
  global.fetch = originalFetch;
};

/**
 * Mock server object to mimic MSW's server API
 * Allows tests to use server.use() for dynamic handler overrides
 */
if (typeof global.server === 'undefined') {
  global.server = {
    use: (...handlers) => {
      // PREPEND handlers to override list so newer overrides take precedence
      handlers.forEach(handler => {
        if (handler && typeof handler === 'object') {
          handlerOverrides.unshift(handler); // Use unshift instead of push
        }
      });
    },
    resetHandlers: () => {
      handlerOverrides = [];
    },
    close: () => {
      handlerOverrides = [];
    },
    listen: () => {
      // No-op, already listening via global.fetch
    },
  };
}

/**
 * Helper to create a proper request object with .json() and .text() methods
 */
const createMockRequest = (url, options) => {
  // Extract body from Request object if present
  const requestBody = (url && typeof url === 'object' && url.body) ? url.body : options.body;

  return {
    url: (typeof url === 'string') ? url : url.url,
    method: (url && typeof url === 'object' && url.method) ? url.method : (options.method || 'GET'),
    headers: (url && url.headers) ? url.headers : new Map(Object.entries(options.headers || {})),
    body: requestBody,
    json: async () => {
      if (!requestBody) return {};
      // Handle both string body and already-parsed objects
      if (typeof requestBody === 'string') {
        return JSON.parse(requestBody);
      }
      return requestBody;
    },
    text: async () => {
      if (!requestBody) return '';
      if (typeof requestBody === 'string') {
        return requestBody;
      }
      return JSON.stringify(requestBody);
    },
    ...options,
  };
};

/**
 * Helper to create HTTP handler for server.use()
 * Usage: http.get(url, handler) or http.post(url, handler)
 */
if (typeof global.http === 'undefined') {
  global.http = {
    get: (urlPattern, handler) => ({
      matches: (url, method) => method === 'GET' && url.includes(urlPattern.replace(/https?:\/\/[^/]+/, '')),
      handler: async (url, options) => {
        const result = await handler({ request: createMockRequest(url, options) });
        return result;
      },
    }),
    post: (urlPattern, handler) => ({
      matches: (url, method) => method === 'POST' && url.includes(urlPattern.replace(/https?:\/\/[^/]+/, '')),
      handler: async (url, options) => {
        const result = await handler({ request: createMockRequest(url, options) });
        return result;
      },
    }),
    put: (urlPattern, handler) => ({
      matches: (url, method) => method === 'PUT' && url.includes(urlPattern.replace(/https?:\/\/[^/]+/, '')),
      handler: async (url, options) => {
        const result = await handler({ request: createMockRequest(url, options) });
        return result;
      },
    }),
    delete: (urlPattern, handler) => ({
      matches: (url, method) => method === 'DELETE' && url.includes(urlPattern.replace(/https?:\/\/[^/]+/, '')),
      handler: async (url, options) => {
        const result = await handler({ request: createMockRequest(url, options) });
        return result;
      },
    }),
    patch: (urlPattern, handler) => ({
      matches: (url, method) => method === 'PATCH' && url.includes(urlPattern.replace(/https?:\/\/[^/]+/, '')),
      handler: async (url, options) => {
        const result = await handler({ request: createMockRequest(url, options) });
        return result;
      },
    }),
    all: (urlPattern, handler) => ({
      matches: (url, method) => url.includes(urlPattern.replace(/https?:\/\/[^/]+/, '')),
      handler: async (url, options) => {
        const result = await handler({ request: createMockRequest(url, options) });
        return result;
      },
    }),
  };
}

/**
 * Helper to create HTTP responses (like MSW's HttpResponse)
 */
if (typeof global.HttpResponse === 'undefined') {
  global.HttpResponse = {
    json: (data, options = {}) => ({
      ok: (options.status || 200) >= 200 && (options.status || 200) < 300,
      status: options.status || 200,
      statusText: options.statusText || 'OK',
      headers: new Map([
        ['content-type', 'application/json'],
        ...(options.headers ? Object.entries(options.headers) : []),
      ]),
      json: async () => data,
      text: async () => JSON.stringify(data),
      blob: async () => new Blob([JSON.stringify(data)]),
    }),
    error: () => ({
      ok: false,
      status: 0,
      statusText: 'Network Error',
      headers: new Map(),
      json: async () => { throw new TypeError('Failed to fetch'); },
      text: async () => { throw new TypeError('Failed to fetch'); },
      blob: async () => { throw new TypeError('Failed to fetch'); },
    }),
  };
}

/**
 * Mock the MSW modules so tests can import from them
 * This allows existing MSW-based tests to work with our manual fetch mock
 */
jest.mock('msw', () => ({
  http: global.http,
  HttpResponse: global.HttpResponse,
}));

jest.mock('../../mocks/server', () => ({
  server: global.server,
  startServer: () => global.server.listen(),
  resetServer: () => global.server.resetHandlers(),
  stopServer: () => global.server.close(),
}));
