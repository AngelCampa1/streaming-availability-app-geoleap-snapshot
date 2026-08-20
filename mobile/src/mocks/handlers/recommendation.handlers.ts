/**
 * MSW Recommendation Handlers
 *
 * Handles recommendation-related API mocking:
 * - Personalized recommendations
 * - Trending recommendations
 * - Friend recommendations
 * - Similar content
 * - User preferences
 * - Feedback recording
 */

import { http, HttpResponse, delay } from 'msw';
import { Recommendation, UserPreferences } from '../../services/recommendations/RecommendationService';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

/**
 * Helper to safely get URL search params
 * Works around TypeScript not recognizing polyfilled URLSearchParams.get()
 */
const getSearchParam = (url: URL, param: string): string | null => {
  return (url.searchParams as any).get(param);
};

// Mock recommendation data
export const mockRecommendation: Recommendation = {
  id: 'rec-1',
  title: 'Inception',
  type: 'movie',
  rating: 8.8,
  year: 2010,
  availableOn: ['Netflix', 'Amazon Prime'],
  poster: 'https://image.tmdb.org/t/p/w500/inception.jpg',
  backdrop: 'https://image.tmdb.org/t/p/w1280/inception_backdrop.jpg',
  genres: ['Sci-Fi', 'Action', 'Thriller'],
  runtime: 148,
  synopsis: 'A thief who steals corporate secrets through dream-sharing technology.',
  cast: ['Leonardo DiCaprio', 'Ellen Page', 'Tom Hardy'],
  director: ['Christopher Nolan'],
  reason: 'Based on your preference for mind-bending sci-fi',
  matchScore: 0.95,
  confidence: 0.92,
  source: 'collaborative',
  metadata: {
    watchlistOverlap: 5,
    trendingRank: 12,
    popularityScore: 89,
  },
  createdAt: new Date().toISOString(),
};

export const mockUserPreferences: UserPreferences = {
  genres: { 'Sci-Fi': 0.9, 'Action': 0.8, 'Thriller': 0.75 },
  types: { movie: 0.85, tv_series: 0.6, documentary: 0.3 },
  ratings: { excellent: 0.9, very_good: 0.75 },
  decades: { '2010s': 0.85, '2000s': 0.7, '1990s': 0.5 },
  runtime: { min: 90, max: 180, preferred: 120 },
  streamingServices: { Netflix: 0.9, 'Amazon Prime': 0.7, Hulu: 0.5 },
  actors: { 'Leonardo DiCaprio': 0.95, 'Tom Hardy': 0.8 },
  directors: { 'Christopher Nolan': 0.98, 'Denis Villeneuve': 0.92 },
  keywords: { 'mind-bending': 0.9, thriller: 0.85, dystopian: 0.75 },
};

// Generate diverse recommendations
const generateRecommendations = (count: number, prefix: string = 'rec'): Recommendation[] => {
  const types: Array<'movie' | 'tv_series' | 'documentary' | 'anime' | 'other'> = ['movie', 'tv_series', 'documentary'];
  const genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller', 'Romance'];
  const sources: Array<'collaborative' | 'content_based' | 'trending' | 'popular' | 'friends' | 'similar_users'> =
    ['collaborative', 'content_based', 'trending', 'popular'];

  return Array.from({ length: count }, (_, i) => ({
    ...mockRecommendation,
    id: `${prefix}-${i + 1}`,
    title: `${prefix} Movie ${i + 1}`,
    type: types[i % types.length],
    genres: [genres[i % genres.length], genres[(i + 1) % genres.length]],
    rating: 7 + (Math.random() * 2),
    year: 2000 + Math.floor(Math.random() * 24),
    matchScore: 0.95 - (i * 0.02),
    confidence: 0.9 - (i * 0.01),
    source: sources[i % sources.length],
    reason: `Recommendation reason ${i + 1}`,
    metadata: {
      watchlistOverlap: Math.floor(Math.random() * 10),
      trendingRank: i + 1,
      popularityScore: 95 - i,
    },
  }));
};

export const recommendationHandlers = [
  // GET /recommendations - Main recommendations endpoint
  http.get(`${BASE_URL}/recommendations`, async ({ request }) => {
    await delay(150);

    const url = new URL(request.url);
    const userId = getSearchParam(url, 'userId');
    const count = parseInt(getSearchParam(url, 'count') || '20', 10);
    const filters = getSearchParam(url, 'filters');
    const context = getSearchParam(url, 'context');

    // Simulate error for specific user
    if (userId === 'error-user') {
      return HttpResponse.json(
        { error: { message: 'Failed to fetch recommendations' } },
        { status: 500 }
      );
    }

    let recommendations = generateRecommendations(Math.min(count, 50), 'main');

    // Apply filters if provided
    if (filters) {
      try {
        const parsedFilters = JSON.parse(filters);
        if (parsedFilters.genres) {
          recommendations = recommendations.filter(rec =>
            parsedFilters.genres.some((g: string) => rec.genres.includes(g))
          );
        }
        if (parsedFilters.types) {
          recommendations = recommendations.filter(rec =>
            parsedFilters.types.includes(rec.type)
          );
        }
        if (parsedFilters.minRating) {
          recommendations = recommendations.filter(rec =>
            rec.rating >= parsedFilters.minRating
          );
        }
      } catch (_err) {
        // Ignore filter parsing errors
      }
    }

    return HttpResponse.json(recommendations.slice(0, count));
  }),

  // GET /recommendations/trending - Trending recommendations
  http.get(`${BASE_URL}/recommendations/trending`, async ({ request }) => {
    await delay(120);

    const url = new URL(request.url);
    const genre = getSearchParam(url, 'genre');

    let trending = generateRecommendations(15, 'trending');

    if (genre) {
      trending = trending.filter(rec => rec.genres.includes(genre));
    }

    return HttpResponse.json(trending);
  }),

  // GET /recommendations/friends/:userId - Friend recommendations
  http.get(`${BASE_URL}/recommendations/friends/:userId`, async ({ params }) => {
    await delay(180);

    const { userId } = params;

    if (userId === 'no-friends') {
      return HttpResponse.json([]);
    }

    const friendRecs = generateRecommendations(8, 'friend').map(rec => ({
      ...rec,
      source: 'friends' as const,
      reason: 'Your friends loved this',
      metadata: {
        ...rec.metadata,
        friendRecommendations: Math.floor(Math.random() * 5) + 1,
      },
    }));

    return HttpResponse.json(friendRecs);
  }),

  // GET /recommendations/similar/:contentId - Similar content
  http.get(`${BASE_URL}/recommendations/similar/:contentId`, async ({ params }) => {
    await delay(140);

    const { contentId } = params;

    if (contentId === "not-found") { return HttpResponse.json([]);
    }

    const similar = generateRecommendations(10, 'similar').map(rec => ({
      ...rec,
      source: 'content_based' as const,
      reason: `Similar to ${contentId}`,
    }));

    return HttpResponse.json(similar);
  }),

  // GET /recommendations/because-you-watched/:contentId
  http.get(`${BASE_URL}/recommendations/because-you-watched/:contentId`, async ({ params }) => {
    await delay(160);

    const { contentId } = params;

    const becauseYouWatched = generateRecommendations(12, 'watched').map(rec => ({
      ...rec,
      source: 'content_based' as const,
      reason: `Because you watched ${contentId}`,
    }));

    return HttpResponse.json(becauseYouWatched);
  }),

  // GET /users/:userId/preferences - Get user preferences
  http.get(`${BASE_URL}/users/:userId/preferences`, async ({ params }) => {
    await delay(100);

    const { userId } = params;

    if (userId === 'no-prefs') {
      return HttpResponse.json(
        { error: { message: 'No preferences found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json(mockUserPreferences);
  }),

  // PUT /users/:userId/preferences - Update user preferences
  http.put(`${BASE_URL}/users/:userId/preferences`, async ({ params, request }) => {
    await delay(120);

    const { userId } = params;

    if (userId === 'error-user') {
      return HttpResponse.json(
        { error: { message: 'Failed to update preferences' } },
        { status: 500 }
      );
    }

    return HttpResponse.json({ message: "Preferences updated successfully" });
  }),

  // POST /api/recommendations/feedback - Record feedback
  http.post(`${BASE_URL}/api/recommendations/feedback`, async ({ request }) => {
    await delay(80);

    const body = await request.json() as any;

    if (body.userId === 'error-user') {
      return HttpResponse.json(
        { error: { message: 'Failed to record feedback' } },
        { status: 500 }
      );
    }

    return HttpResponse.json({ message: "Feedback recorded successfully" });
  }),

  // POST /recommendations/refresh/:userId - Refresh recommendations
  http.post(`${BASE_URL}/recommendations/refresh/:userId`, async ({ params }) => {
    await delay(200);

    const { userId } = params;

    if (userId === 'error-user') {
      return HttpResponse.json(
        { error: { message: 'Failed to refresh recommendations' } },
        { status: 500 }
      );
    }

    return HttpResponse.json(generateRecommendations(10, "refreshed"));
  }),

  // GET /recommendations/insights/:userId - Get recommendation insights
  http.get(`${BASE_URL}/recommendations/insights/:userId`, async ({ params }) => {
    await delay(150);

    const { userId } = params;

    if (userId === 'no-insights') {
      return HttpResponse.json(
        { error: { message: 'No insights available' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      accuracyRate: 0.87,
      clickThroughRate: 0.42,
      addToWatchlistRate: 0.31,
      topGenres: ["Sci-Fi", "Thriller", "Action"],
      topSources: ["collaborative", "content_based", "trending"],
      improvementSuggestions: [
        "Rate more content to improve recommendations",
        "Add more items to your watchlist",
        "Provide feedback on recommendations",
      ],
    });
  }),
];

/**
 * Helper to reset recommendation state between tests
 */
export const resetRecommendationState = () => {
  // No state to reset for now, but keep for consistency
};
