/**
 * MSW Streaming Handlers
 *
 * Handles streaming content search and discovery API mocking:
 * - Content search with filters
 * - Content details and metadata
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

// Mock content data - Streaming Availability API v4 format
// Format matches what convertToSearchResult() expects
export const mockSearchResults = [
  {
    id: 'movie-1',
    imdbId: 'tt0133093',
    title: 'The Matrix',
    type: 'movie',
    showType: 'movie',
    year: 1999,
    releaseYear: 1999,
    genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Sci-Fi' }],
    rating: 8.7,
    overview: 'A computer hacker learns about the true nature of reality',
    poster: 'https://example.com/matrix-poster.jpg',
    imageSet: {
      verticalPoster: {
        w480: 'https://example.com/matrix-poster.jpg',
        w720: 'https://example.com/matrix-poster-hd.jpg'
      },
      horizontalBackdrop: {
        w1080: 'https://example.com/matrix-backdrop.jpg'
      }
    },
    streamingAvailability: [
      { platform: 'Netflix', country: 'US', quality: 'HD' },
      { platform: 'HBO Max', country: 'US', quality: '4K' },
    ],
  },
  {
    id: 'series-1',
    imdbId: 'tt0903747',
    title: 'Breaking Bad',
    type: 'series',
    showType: 'series',
    year: 2008,
    firstAirYear: 2008,
    genres: [{ id: 3, name: 'Crime' }, { id: 4, name: 'Drama' }],
    rating: 9.5,
    overview: 'A chemistry teacher turned meth manufacturer',
    seasonCount: 5,
    episodeCount: 62,
    poster: 'https://example.com/breaking-bad-poster.jpg',
    imageSet: {
      verticalPoster: {
        w480: 'https://example.com/breaking-bad-poster.jpg'
      }
    },
    streamingAvailability: [
      { platform: 'Netflix', country: 'US', quality: '4K' },
    ],
  },
  {
    id: 'movie-2',
    imdbId: 'tt1375666',
    title: 'Inception',
    type: 'movie',
    showType: 'movie',
    year: 2010,
    releaseYear: 2010,
    genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Sci-Fi' }, { id: 5, name: 'Thriller' }],
    rating: 8.8,
    overview: 'A thief who steals secrets through dream-sharing technology',
    runtime: 148,
    poster: 'https://example.com/inception-poster.jpg',
    imageSet: {
      verticalPoster: {
        w480: 'https://example.com/inception-poster.jpg'
      },
      horizontalBackdrop: {
        w1080: 'https://example.com/inception-backdrop.jpg'
      }
    },
    streamingAvailability: [
      { platform: 'Amazon Prime', country: 'US', quality: 'HD' },
    ],
  },
];

export const streamingHandlers = [
  // GET /api/streaming-availability/search - Search for streaming content (used by StreamingService)
  http.get(`${BASE_URL}/api/streaming-availability/search`, async ({ request }) => {
    // Note: No delay() to avoid conflicts with jest.useFakeTimers()

    const url = new URL(request.url);
    const query = getSearchParam(url, 'query') || '';
    const type = getSearchParam(url, 'type'); // 'movie', 'series', null
    const country = getSearchParam(url, 'country') || 'us';
    const year = getSearchParam(url, 'year');
    const limit = parseInt(getSearchParam(url, 'limit') || '20', 10);

    // Simulate empty query (for validation tests)
    if (!query) {
      return HttpResponse.json(
        { error: 'Search query is required', code: 'MISSING_QUERY' },
        { status: 400 }
      );
    }

    // Simulate service error for specific query
    if (query === 'trigger-error') {
      return HttpResponse.json(
        { error: 'Search service unavailable', code: 'SERVICE_UNAVAILABLE' },
        { status: 503 }
      );
    }

    // Filter results based on query
    let results = mockSearchResults.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );

    // Apply type filter (convert 'series' to match API format)
    if (type) {
      results = results.filter(item => item.showType === type || (type === 'series' && item.showType === 'series'));
    }

    // Apply year filter (check both releaseYear and firstAirYear)
    if (year) {
      const yearNum = parseInt(year, 10);
      results = results.filter(item =>
        item.releaseYear === yearNum || item.firstAirYear === yearNum
      );
    }

    // Limit results
    const limitedResults = results.slice(0, limit);

    return HttpResponse.json({
      results: limitedResults,
      total: results.length,
    });
  }),

  // GET /search - Search for content
  http.get(`${BASE_URL}/search`, async ({ request }) => {
    await delay(100);

    const url = new URL(request.url);
    const query = getSearchParam(url, 'q') || '';
    const type = getSearchParam(url, 'type'); // 'movie', 'series', null
    const genre = getSearchParam(url, 'genre');
    const minRating = getSearchParam(url, 'minRating');
    const page = parseInt(getSearchParam(url, 'page') || '1', 10);
    const limit = parseInt(getSearchParam(url, 'limit') || '10', 10);

    // Simulate empty query error
    if (!query) {
      return HttpResponse.json(
        { error: 'Search query is required', code: 'MISSING_QUERY' },
        { status: 400 }
      );
    }

    // Filter results
    let results = mockSearchResults.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );

    // Apply type filter
    if (type) {
      results = results.filter(item => item.type === type);
    }

    // Apply genre filter
    if (genre) {
      results = results.filter(item => item.genres.some(g => g.name === genre));
    }

    // Apply rating filter
    if (minRating) {
      const minRatingNum = parseFloat(minRating);
      results = results.filter(item => item.rating >= minRatingNum);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedResults = results.slice(startIndex, startIndex + limit);

    return HttpResponse.json({
      results: paginatedResults,
      total: results.length,
      page,
      limit,
      hasMore: startIndex + limit < results.length,
    });
  }),

  // GET /content/:id - Get content details
  http.get(`${BASE_URL}/content/:contentId`, async ({ params }) => {
    await delay(100);

    const { contentId } = params;
    const content = mockSearchResults.find(item => item.id === contentId);

    if (!content) {
      return HttpResponse.json(
        { error: 'Content not found', code: 'CONTENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      ...content,
      description: `Description for ${content.title}`,
      cast: ['Actor 1', 'Actor 2'],
      director: 'Director Name',
      runtime: 120,
    });
  }),

  // GET /content/:id/availability - Get streaming availability
  http.get(`${BASE_URL}/content/:contentId/availability`, async ({ params, request }) => {
    await delay(100);

    const { contentId } = params;
    const url = new URL(request.url);
    const country = getSearchParam(url, 'country') || 'US';

    const content = mockSearchResults.find(item => item.id === contentId);

    if (!content) {
      return HttpResponse.json(
        { error: 'Content not found', code: 'CONTENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Filter availability by country
    const availability = content.streamingAvailability.filter(
      a => a.country === country
    );

    return HttpResponse.json({
      contentId,
      country,
      availability,
      lastUpdated: new Date().toISOString(),
    });
  }),

  // GET /recommendations - Get personalized recommendations
  http.get(`${BASE_URL}/recommendations`, async ({ request }) => {
    await delay(150);

    const url = new URL(request.url);
    const limit = parseInt(getSearchParam(url, 'limit') || '5', 10);

    const authHeader = request.headers.get('Authorization');

    // Simulate unauthorized
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Return first N results as recommendations
    const recommendations = mockSearchResults.slice(0, limit);

    return HttpResponse.json({
      recommendations,
      total: recommendations.length,
    });
  }),

  // GET /trending - Get trending content
  http.get(`${BASE_URL}/trending`, async ({ request }) => {
    await delay(100);

    const url = new URL(request.url);
    const type = getSearchParam(url, 'type');
    const timeWindow = getSearchParam(url, 'timeWindow') || 'week'; // 'day', 'week'

    let trending = [...mockSearchResults];

    // Apply type filter
    if (type) {
      trending = trending.filter(item => item.type === type);
    }

    return HttpResponse.json({
      trending,
      timeWindow,
      total: trending.length,
    });
  }),

  // GET /api/streaming-availability/by-id - Get content by ID (used by getContentDetails)
  http.get(`${BASE_URL}/api/streaming-availability/by-id`, async ({ request }) => {
    await delay(100);

    const url = new URL(request.url);
    const id = getSearchParam(url, 'id');
    const country = getSearchParam(url, 'country') || 'us';

    if (!id) {
      return HttpResponse.json(
        { error: 'Content ID is required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }

    const content = mockSearchResults.find(item => item.id === id);

    if (!content) {
      return HttpResponse.json(
        { error: 'Content not found', code: 'CONTENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Return detailed content with streaming info
    return HttpResponse.json({
      ...content,
      description: `Description for ${content.title}`,
      overview: `Overview for ${content.title}`,
      cast: ['Actor 1', 'Actor 2'],
      directors: ['Director Name'],
      runtime: 120,
      voteAverage: content.rating,
      imageSet: {
        verticalPoster: {
          w480: content.poster,
        },
      },
      streamingInfo: {
        [country]: {
          netflix: {
            streamingService: {
              id: 'netflix',
              name: 'Netflix',
              image: 'https://images.justwatch.com/icon/207360008/s100/netflix.webp',
              type: 'subscription',
              homePage: 'https://www.netflix.com',
            },
            type: 'subscription',
            formats: ['hd', '4k'],
            subtitles: ['en', 'es', 'fr'],
            audioLanguages: ['en'],
          },
        },
      },
    });
  }),

  // GET /api/content/recommendations - Get content recommendations (used by getRecommendations)
  http.get(`${BASE_URL}/api/content/recommendations`, async ({ request }) => {
    await delay(120);

    const url = new URL(request.url);
    const id = getSearchParam(url, 'id');
    const limit = parseInt(getSearchParam(url, 'limit') || '10', 10);

    if (!id) {
      return HttpResponse.json(
        { error: 'Content ID is required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }

    // Return mock recommendations (all results except the requested one)
    const recommendations = mockSearchResults
      .filter(item => item.id !== id)
      .slice(0, limit)
      .map(item => ({
        ...item,
        overview: `Overview for ${item.title}`,
        voteAverage: item.rating,
      }));

    return HttpResponse.json({
      results: recommendations,
    });
  }),

  // GET /api/content/popular - Get popular content (used by getPopularContent)
  http.get(`${BASE_URL}/api/content/popular`, async ({ request }) => {
    await delay(100);

    const url = new URL(request.url);
    const type = getSearchParam(url, 'type'); // 'movie', 'series', null
    const limit = parseInt(getSearchParam(url, 'limit') || '20', 10);

    let popular = [...mockSearchResults];

    // Apply type filter
    if (type) {
      popular = popular.filter(item => item.type === type);
    }

    // Sort by rating (popular)
    popular.sort((a, b) => b.rating - a.rating);

    const results = popular.slice(0, limit).map(item => ({
      ...item,
      overview: `Overview for ${item.title}`,
      voteAverage: item.rating,
      popularity: 100 - popular.indexOf(item),
    }));

    return HttpResponse.json({
      results,
    });
  }),

  // GET /api/content/suggestions - Get search suggestions (used by getSearchSuggestions)
  http.get(`${BASE_URL}/api/content/suggestions`, async ({ request }) => {
    await delay(80);

    const url = new URL(request.url);
    const query = getSearchParam(url, 'query') || '';
    const limit = parseInt(getSearchParam(url, 'limit') || '10', 10);

    if (query.length < 2) {
      return HttpResponse.json({
        suggestions: [],
      });
    }

    // Filter results by query
    const suggestions = mockSearchResults
      .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit)
      .map(item => ({
        title: item.title,
        type: item.type,
        poster: item.poster,
        year: item.year,
      }));

    return HttpResponse.json({
      suggestions,
    });
  }),

  // GET /api/streaming-availability/search/by-title - Search by title (used by searchByTitle)
  http.get(`${BASE_URL}/api/streaming-availability/search/by-title`, async ({ request }) => {
    await delay(100);

    const url = new URL(request.url);
    const title = getSearchParam(url, 'title') || '';
    const year = getSearchParam(url, 'year');
    const type = getSearchParam(url, 'type');

    if (!title) {
      return HttpResponse.json(
        { error: 'Title is required', code: 'MISSING_TITLE' },
        { status: 400 }
      );
    }

    // Filter by title (exact or partial match)
    let results = mockSearchResults.filter(item =>
      item.title.toLowerCase() === title.toLowerCase() ||
      item.title.toLowerCase().includes(title.toLowerCase())
    );

    // Apply year filter
    if (year) {
      const yearNum = parseInt(year, 10);
      results = results.filter(item => item.year === yearNum);
    }

    // Apply type filter
    if (type) {
      results = results.filter(item => item.type === type);
    }

    const mappedResults = results.map(item => ({
      ...item,
      overview: `Overview for ${item.title}`,
      voteAverage: item.rating,
    }));

    return HttpResponse.json({
      results: mappedResults,
    });
  }),
];

// Mock data is already exported at the top of the file
