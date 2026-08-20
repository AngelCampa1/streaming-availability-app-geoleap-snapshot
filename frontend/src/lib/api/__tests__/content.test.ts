/**
 * Content API Tests
 * Tests for content fetching, caching, and slug-based retrieval
 */

import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import {
  getContentBySlug,
  getRelatedContent,
  getStreamingOptions,
  generateContentUrl,
  type ContentData,
} from '../content';
import { parseContentSlug } from '@/lib/seo/url-generation';
import { streamingAvailabilityService } from '@/services/streamingAvailabilityService';

// Mock dependencies
jest.mock('@/lib/seo/url-generation');
jest.mock('@/services/streamingAvailabilityService');
jest.mock('@/config/api', () => ({
  SERVER_API_URL: 'http://localhost:8020',
  API_BASE_URL: 'http://localhost:8020',
}));

// Mock console methods to avoid noise
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

// Store original Date.now
const originalDateNow = Date.now;

describe('Content API', () => {
  const mockContentData: ContentData = {
    id: 'movie-123',
    title: 'Test Movie',
    originalTitle: 'Original Test Movie',
    overview: 'A test movie overview',
    releaseYear: 2024,
    rating: 8.5,
    voteCount: 1000,
    runtime: 120,
    genres: ['Action', 'Drama'],
    primaryGenre: 'Action',
    posterUrl: 'https://example.com/poster.jpg',
    cast: [
      {
        id: 1,
        name: 'Actor One',
        character: 'Main Character',
        order: 0,
      },
    ],
    crew: [
      {
        id: 1,
        name: 'Director One',
        job: 'Director',
        department: 'Directing',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Date.now to control cache behavior
    const mockTime = Date.now();
    Date.now = jest.fn(() => mockTime);

    (parseContentSlug as jest.Mock).mockReturnValue({
      id: 'movie-123',
      title: 'test-movie',
    });

    // Set up default MSW handler for content API
    server.use(
      http.get('http://localhost:8020/api/content/:type/:id', () => {
        return HttpResponse.json(mockContentData);
      }),
      http.get('http://localhost:8020/api/content/related', () => {
        return HttpResponse.json([
          { ...mockContentData, id: 'movie-456', title: 'Related Movie 1' },
          { ...mockContentData, id: 'movie-789', title: 'Related Movie 2' },
        ]);
      })
    );
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    Date.now = originalDateNow;
  });

  describe('getContentBySlug', () => {
    it('fetches content by slug', async () => {
      const result = await getContentBySlug('movie', 'test-movie-123');

      expect(result).toEqual(mockContentData);
      expect(parseContentSlug).toHaveBeenCalledWith('test-movie-123');
    });

    it('returns cached content on subsequent calls', async () => {
      (parseContentSlug as jest.Mock).mockReturnValue({
        id: 'cached-movie-999',
        title: 'cached-movie',
      });

      // Track how many times the handler is called
      let callCount = 0;
      server.use(
        http.get('http://localhost:8020/api/content/movie/cached-movie-999', () => {
          callCount++;
          return HttpResponse.json(mockContentData);
        })
      );

      // First call - should fetch
      const result1 = await getContentBySlug('movie', 'cached-movie-999');
      expect(result1).toEqual(mockContentData);
      expect(callCount).toBe(1);

      // Second call - should use cache
      const result2 = await getContentBySlug('movie', 'cached-movie-999');
      expect(result2).toEqual(mockContentData);
      expect(callCount).toBe(1); // Still 1, not 2
    });

    it('returns null for 404 responses', async () => {
      (parseContentSlug as jest.Mock).mockReturnValue({
        id: 'non-existent-123',
        title: 'non-existent',
      });

      server.use(
        http.get('http://localhost:8020/api/content/movie/non-existent-123', () => {
          return new HttpResponse(null, { status: 404, statusText: 'Not Found' });
        })
      );

      const result = await getContentBySlug('movie', 'non-existent-123');

      expect(result).toBeNull();
    });

    it('returns null and logs error for other errors', async () => {
      (parseContentSlug as jest.Mock).mockReturnValue({
        id: 'error-movie-123',
        title: 'error-movie',
      });

      server.use(
        http.get('http://localhost:8020/api/content/movie/error-movie-123', () => {
          return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
        })
      );

      const result = await getContentBySlug('movie', 'error-movie-123');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('handles network errors gracefully', async () => {
      (parseContentSlug as jest.Mock).mockReturnValue({
        id: 'network-error-123',
        title: 'network-error',
      });

      server.use(
        http.get('http://localhost:8020/api/content/movie/network-error-123', () => {
          return HttpResponse.error();
        })
      );

      const result = await getContentBySlug('movie', 'network-error-123');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching content by slug:',
        expect.any(Error)
      );
    });

    it('works with different content types', async () => {
      (parseContentSlug as jest.Mock).mockReturnValue({
        id: 'show-456',
        title: 'test-show',
      });

      const result = await getContentBySlug('tv-show', 'test-show-456');

      expect(result).toBeDefined();
      expect(result?.id).toBe('movie-123'); // From default handler
    });

    it('works with documentary type', async () => {
      (parseContentSlug as jest.Mock).mockReturnValue({
        id: 'doc-789',
        title: 'test-doc',
      });

      const result = await getContentBySlug('documentary', 'test-doc-789');

      expect(result).toBeDefined();
    });

    it('parses slug correctly', async () => {
      (parseContentSlug as jest.Mock).mockReturnValue({
        id: 'custom-id-999',
        title: 'custom-title',
      });

      server.use(
        http.get('http://localhost:8020/api/content/movie/custom-id-999', () => {
          return HttpResponse.json({ ...mockContentData, id: 'custom-id-999' });
        })
      );

      const result = await getContentBySlug('movie', 'custom-slug');

      expect(result?.id).toBe('custom-id-999');
      expect(parseContentSlug).toHaveBeenCalledWith('custom-slug');
    });
  });

  describe('getRelatedContent', () => {
    const mockRelatedContent: ContentData[] = [
      { ...mockContentData, id: 'movie-456', title: 'Related Movie 1' },
      { ...mockContentData, id: 'movie-789', title: 'Related Movie 2' },
    ];

    it('fetches related content', async () => {
      const result = await getRelatedContent('movie-123', 'movie', ['Action', 'Drama']);

      expect(result).toEqual(mockRelatedContent);
      expect(result.length).toBe(2);
    });

    it('includes all query parameters', async () => {
      // Use server.use to capture the request URL
      let capturedUrl = '';
      server.use(
        http.get('http://localhost:8020/api/content/related', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(mockRelatedContent);
        })
      );

      await getRelatedContent('movie-123', 'movie', ['Action', 'Drama'], 12);

      expect(capturedUrl).toContain('id=movie-123');
      expect(capturedUrl).toContain('type=movie');
      expect(capturedUrl).toContain('genres=Action,Drama');
      expect(capturedUrl).toContain('limit=12');
    });

    it('uses default limit of 12', async () => {
      let capturedUrl = '';
      server.use(
        http.get('http://localhost:8020/api/content/related', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(mockRelatedContent);
        })
      );

      await getRelatedContent('movie-123', 'movie', ['Action']);

      expect(capturedUrl).toContain('limit=12');
    });

    it('handles multiple genres', async () => {
      let capturedUrl = '';
      server.use(
        http.get('http://localhost:8020/api/content/related', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(mockRelatedContent);
        })
      );

      await getRelatedContent('movie-123', 'movie', ['Action', 'Drama', 'Thriller']);

      expect(capturedUrl).toContain('genres=Action,Drama,Thriller');
    });

    it('returns empty array on error', async () => {
      server.use(
        http.get('http://localhost:8020/api/content/related', () => {
          return new HttpResponse(null, { status: 500, statusText: 'Server Error' });
        })
      );

      const result = await getRelatedContent('movie-123', 'movie', ['Action']);

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('handles network errors', async () => {
      server.use(
        http.get('http://localhost:8020/api/content/related', () => {
          return HttpResponse.error();
        })
      );

      const result = await getRelatedContent('movie-123', 'movie', ['Action']);

      expect(result).toEqual([]);
    });
  });

  describe('getStreamingOptions', () => {
    const mockStreamingOptions = [
      {
        serviceId: 'netflix',
        serviceName: 'Netflix',
        type: 'subscription' as const,
        url: 'https://netflix.com/watch/123',
        videoLink: 'https://netflix.com/watch/123',
        link: 'https://netflix.com/watch/123',
        country: 'US',
        streamingType: 'subscription' as const,
      },
      {
        serviceId: 'amazon',
        serviceName: 'Amazon Prime',
        type: 'subscription' as const,
        url: 'https://amazon.com/watch/123',
        videoLink: 'https://amazon.com/watch/123',
        link: 'https://amazon.com/watch/123',
        country: 'US',
        streamingType: 'subscription' as const,
      },
    ];

    it('fetches streaming options from service', async () => {
      (streamingAvailabilityService.getStreamingOptionsById as jest.Mock).mockResolvedValue(
        mockStreamingOptions
      );

      const result = await getStreamingOptions('movie-123', 'movie');

      expect(result).toEqual(mockStreamingOptions);
      expect(streamingAvailabilityService.getStreamingOptionsById).toHaveBeenCalledWith(
        'movie-123',
        'movie'
      );
    });

    it('falls back to legacy API on service error', async () => {
      (streamingAvailabilityService.getStreamingOptionsById as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const legacyOptions = [
        {
          serviceId: 'netflix',
          serviceName: 'Netflix',
          type: 'subscription',
          url: 'https://netflix.com/watch/123',
        },
      ];

      server.use(
        http.get('http://localhost:8020/api/streaming/availability/movie-123', () => {
          return HttpResponse.json(legacyOptions);
        })
      );

      const result = await getStreamingOptions('movie-123', 'movie');

      expect(result).toHaveLength(1);
      expect(result[0].serviceId).toBe('netflix');
    });

    it('returns empty array on complete failure', async () => {
      (streamingAvailabilityService.getStreamingOptionsById as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      server.use(
        http.get('http://localhost:8020/api/streaming/availability/movie-123', () => {
          return HttpResponse.error();
        })
      );

      const result = await getStreamingOptions('movie-123', 'movie');

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('converts legacy format to enhanced format', async () => {
      (streamingAvailabilityService.getStreamingOptionsById as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const legacyOptions = [
        {
          serviceId: 'hulu',
          serviceName: 'Hulu',
          type: 'subscription',
          url: 'https://hulu.com/watch/456',
          quality: ['HD', '4K'],
          audioLanguages: ['en', 'es'],
        },
      ];

      server.use(
        http.get('http://localhost:8020/api/streaming/availability/movie-456', () => {
          return HttpResponse.json(legacyOptions);
        })
      );

      const result = await getStreamingOptions('movie-456', 'movie');

      expect(result[0]).toMatchObject({
        serviceId: 'hulu',
        serviceName: 'Hulu',
        type: 'subscription',
        url: 'https://hulu.com/watch/456',
        videoLink: 'https://hulu.com/watch/456',
        quality: ['HD', '4K'],
        audioLanguages: ['en', 'es'],
      });
    });

    it('includes country code in enhanced format', async () => {
      (streamingAvailabilityService.getStreamingOptionsById as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const legacyOptions = [
        {
          serviceId: 'netflix',
          serviceName: 'Netflix',
          type: 'subscription',
          url: 'https://netflix.com/watch/123',
        },
      ];

      server.use(
        http.get('http://localhost:8020/api/streaming/availability/movie-123', () => {
          return HttpResponse.json(legacyOptions);
        })
      );

      const result = await getStreamingOptions('movie-123', 'movie');

      expect(result[0]).toHaveProperty('videoLink');
      expect(result[0]).toHaveProperty('availableSince');
    });
  });

  describe('Cache Behavior', () => {
    it('caches content for 15 minutes', async () => {
      const startTime = Date.now();
      (Date.now as jest.Mock).mockReturnValue(startTime);

      (parseContentSlug as jest.Mock).mockReturnValue({
        id: 'cache-test-777',
        title: 'cache-test',
      });

      let callCount = 0;
      server.use(
        http.get('http://localhost:8020/api/content/movie/cache-test-777', () => {
          callCount++;
          return HttpResponse.json(mockContentData);
        })
      );

      // First call
      await getContentBySlug('movie', 'cache-test-777');
      expect(callCount).toBe(1);

      // Within cache TTL (10 minutes later)
      (Date.now as jest.Mock).mockReturnValue(startTime + 10 * 60 * 1000);
      await getContentBySlug('movie', 'cache-test-777');
      expect(callCount).toBe(1); // Still 1, using cache

      // After cache expiry (15 minutes + 1ms)
      (Date.now as jest.Mock).mockReturnValue(startTime + 15 * 60 * 1000 + 1);
      await getContentBySlug('movie', 'cache-test-777');
      expect(callCount).toBe(2); // Fetched again
    });

    it('maintains separate cache entries per content type', async () => {
      let movieCalls = 0;
      let tvCalls = 0;

      server.use(
        http.get('http://localhost:8020/api/content/movie/content-123', () => {
          movieCalls++;
          return HttpResponse.json(mockContentData);
        }),
        http.get('http://localhost:8020/api/content/tv-show/content-123', () => {
          tvCalls++;
          return HttpResponse.json(mockContentData);
        })
      );

      const slug = 'same-content-123';
      (parseContentSlug as jest.Mock).mockReturnValue({
        id: 'content-123',
        title: 'same-title',
      });

      // Call with movie type
      await getContentBySlug('movie', slug);
      expect(movieCalls).toBe(1);
      expect(tvCalls).toBe(0);

      // Call with tv-show type - should fetch again (different cache key)
      await getContentBySlug('tv-show', slug);
      expect(movieCalls).toBe(1);
      expect(tvCalls).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty genres array', async () => {
      const result = await getRelatedContent('movie-123', 'movie', []);

      expect(Array.isArray(result)).toBe(true);
    });

    it('handles malformed JSON responses', async () => {
      (parseContentSlug as jest.Mock).mockReturnValue({
        id: 'malformed-123',
        title: 'malformed',
      });

      server.use(
        http.get('http://localhost:8020/api/content/movie/malformed-123', () => {
          return new HttpResponse('Invalid JSON{', {
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      const result = await getContentBySlug('movie', 'malformed-123');

      expect(result).toBeNull();
    });

    it('handles missing optional fields in content data', async () => {
      const minimalContent = {
        id: 'minimal-123',
        title: 'Minimal Movie',
        genres: [],
      };

      (parseContentSlug as jest.Mock).mockReturnValue({
        id: 'minimal-123',
        title: 'minimal',
      });

      server.use(
        http.get('http://localhost:8020/api/content/movie/minimal-123', () => {
          return HttpResponse.json(minimalContent);
        })
      );

      const result = await getContentBySlug('movie', 'minimal-123');

      expect(result).toMatchObject(minimalContent);
    });
  });

  describe('anime content type', () => {
    const mockAnimeData: ContentData = {
      id: 'anime-456',
      title: 'Fullmetal Alchemist: Brotherhood',
      overview: 'Two brothers search for a Philosopher Stone.',
      releaseYear: 2009,
      rating: 9.1,
      voteCount: 1500000,
      genres: ['Animation', 'Action'],
    };

    it('fetches anime content by slug from the correct endpoint', async () => {
      (parseContentSlug as jest.Mock).mockReturnValue({
        id: 'anime-456',
        title: 'fullmetal-alchemist-brotherhood',
      });

      server.use(
        http.get('http://localhost:8020/api/content/anime/anime-456', () => {
          return HttpResponse.json(mockAnimeData);
        })
      );

      const result = await getContentBySlug('anime', 'anime-456-fullmetal-alchemist-brotherhood');

      expect(result).toMatchObject({ id: 'anime-456', title: 'Fullmetal Alchemist: Brotherhood' });
    });

    it('generateContentUrl returns correct anime URL', () => {
      const { generateContentSlug } = jest.requireMock('@/lib/seo/url-generation') as {
        generateContentSlug: jest.Mock;
      };
      generateContentSlug.mockReturnValue('anime-456-fullmetal-alchemist-brotherhood');

      const url = generateContentUrl(mockAnimeData, 'anime');

      expect(url).toBe('/content/anime/anime-456-fullmetal-alchemist-brotherhood');
    });
  });
});
