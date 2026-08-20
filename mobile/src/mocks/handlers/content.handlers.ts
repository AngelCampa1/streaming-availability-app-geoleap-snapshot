/**
 * MSW Content Handlers
 *
 * Handles content-related API mocking:
 * - Search (movies, TV shows)
 * - Content details
 * - Streaming availability
 * - Recommendations
 */

import { http, HttpResponse, delay } from 'msw';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

/**
 * Helper to safely get URL search params
 * Works around TypeScript not recognizing polyfilled URLSearchParams.get()
 */
const getSearchParam = (url: URL, param: string): string | null => {
  return (url.searchParams as any).get(param);
};

// Mock content data
export const mockContent = {
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
};

export const mockAvailability = [
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
];

export const contentHandlers = [
  // GET /content/search - Search for content
  http.get(`${BASE_URL}/content/search`, async ({ request }) => {
    await delay(200);

    const url = new URL(request.url);
    const query = getSearchParam(url, 'q');
    const type = getSearchParam(url, 'type');

    // Simulate empty results
    if (query === 'nonexistent') {
      return HttpResponse.json({
        results: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });
    }

    // Simulate network error
    if (query === 'trigger-error') {
      return HttpResponse.json(
        { error: 'Search service unavailable', code: 'SERVICE_UNAVAILABLE' },
        { status: 503 }
      );
    }

    // Return mock results
    const results = [
      {
        content: mockContent,
        availability: mockAvailability,
        relevanceScore: 0.95,
        popularity: 95,
        userRating: 8.7,
        watchlistAdded: false,
      },
    ];

    return HttpResponse.json({
      results: type ? results.filter(r => r.content.type === type) : results,
      total: 1,
      page: 1,
      pageSize: 20,
    });
  }),

  // GET /content/:id - Get content details
  http.get(`${BASE_URL}/content/:id`, async ({ params }) => {
    await delay(100);

    const { id } = params;

    // Simulate not found
    if (id === 'not-found') {
      return HttpResponse.json(
        { error: 'Content not found', code: 'CONTENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      content: { ...mockContent, id },
      availability: mockAvailability,
    });
  }),

  // GET /content/:id/availability - Get streaming availability
  http.get(`${BASE_URL}/content/:id/availability`, async ({ params, request }) => {
    await delay(150);

    const { id } = params;
    const url = new URL(request.url);
    const country = getSearchParam(url, 'country') || 'US';

    // Simulate not available in country
    if (country === 'XX') {
      return HttpResponse.json({
        availability: [],
        country,
      });
    }

    return HttpResponse.json({
      availability: mockAvailability.map(a => ({ ...a, contentId: id })),
      country,
    });
  }),

  // GET /content/recommendations - Get content recommendations
  http.get(`${BASE_URL}/content/recommendations`, async ({ request }) => {
    await delay(200);

    const url = new URL(request.url);
    const limit = parseInt(getSearchParam(url, 'limit') || '10', 10);

    const recommendations = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
      content: { ...mockContent, id: `tt${i}`, title: `Recommended ${i + 1}` },
      availability: mockAvailability,
      score: 0.9 - (i * 0.05),
    }));

    return HttpResponse.json({ recommendations });
  }),

  // GET /content/popular - Get popular content
  http.get(`${BASE_URL}/content/popular`, async ({ request }) => {
    await delay(150);

    const url = new URL(request.url);
    const type = getSearchParam(url, 'type');
    const limit = parseInt(getSearchParam(url, 'limit') || '20', 10);

    const popular = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
      content: { ...mockContent, id: `popular-${i}`, title: `Popular ${i + 1}`, type: type || 'movie' },
      popularity: 100 - (i * 2),
    }));

    return HttpResponse.json({
      results: popular,
      total: popular.length,
      page: 1,
      pageSize: limit,
    });
  }),

  // GET /content/trending - Get trending content
  http.get(`${BASE_URL}/content/trending`, async ({ request }) => {
    await delay(150);

    const url = new URL(request.url);
    const timeWindow = getSearchParam(url, 'timeWindow') || 'week';
    const limit = parseInt(getSearchParam(url, 'limit') || '20', 10);

    const trending = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
      content: { ...mockContent, id: `trending-${i}`, title: `Trending ${i + 1}` },
      trendingScore: 100 - (i * 3),
      timeWindow,
    }));

    return HttpResponse.json({
      results: trending,
      total: trending.length,
      timeWindow,
    });
  }),
];
