/**
 * Comprehensive tests for StreamingService
 * Tests backend API integration, data transformation, and fallback behavior
 */

import StreamingService, {
  searchContent,
  getContentDetails,
  getRecommendations,
  getPopularContent,
  getSearchSuggestions,
  searchByTitle,
} from '../StreamingService';

// Mock apiService
const mockGet = jest.fn();
jest.mock('../../api/ApiService', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockGet(...args),
  },
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('StreamingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Helper Functions', () => {
    describe('Image extraction', () => {
      it('should extract poster URL from verticalPoster', () => {
        const mockApiResponse = {
          id: 'test1',
          title: 'Test Movie',
          imageSet: {
            verticalPoster: {
              w480: 'https://test.com/poster480.jpg',
              w360: 'https://test.com/poster360.jpg',
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test1').then(result => {
          expect(result?.content.poster).toBe('https://test.com/poster480.jpg');
        });
      });

      it('should fallback to horizontalPoster if no verticalPoster', () => {
        const mockApiResponse = {
          id: 'test2',
          title: 'Test Movie',
          imageSet: {
            horizontalPoster: {
              w480: 'https://test.com/horizontal480.jpg',
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test2').then(result => {
          expect(result?.content.poster).toBe('https://test.com/horizontal480.jpg');
        });
      });

      it('should extract backdrop URL from horizontalBackdrop', () => {
        const mockApiResponse = {
          id: 'test3',
          title: 'Test Movie',
          imageSet: {
            horizontalBackdrop: {
              w1080: 'https://test.com/backdrop1080.jpg',
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test3').then(result => {
          expect(result?.content.backdrop).toBe('https://test.com/backdrop1080.jpg');
        });
      });

      it('should handle missing imageSet gracefully', () => {
        const mockApiResponse = {
          id: 'test4',
          title: 'Test Movie',
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test4').then(result => {
          expect(result?.content.poster).toBeUndefined();
          expect(result?.content.backdrop).toBeUndefined();
        });
      });
    });

    describe('Data conversion', () => {
      it('should convert API response with streamingInfo to SearchResult', () => {
        const mockApiResponse = {
          id: 'tt123456',
          title: 'Test Movie',
          overview: 'Test description',
          showType: 'movie',
          releaseYear: 2023,
          rating: 8.5,
          genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Drama' }],
          streamingInfo: {
            us: {
              netflix: {
                streamingService: {
                  id: 'netflix',
                  name: 'Netflix',
                  image: 'netflix-icon.png',
                  type: 'subscription',
                  homePage: 'https://netflix.com',
                },
                formats: ['hd', '4k'],
                subtitles: ['en', 'es'],
                audioLanguages: ['en'],
              },
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('tt123456').then(result => {
          expect(result).toBeDefined();
          expect(result?.content.id).toBe('tt123456');
          expect(result?.content.title).toBe('Test Movie');
          expect(result?.content.description).toBe('Test description');
          expect(result?.content.type).toBe('movie');
          expect(result?.content.rating).toBe(8.5);
          expect(result?.content.genres).toEqual(['Action', 'Drama']);
          expect(result?.availability.length).toBeGreaterThan(0);
          expect(result?.availability[0].service.name).toBe('Netflix');
        });
      });

      it('should convert API response with streamingOptions to SearchResult', () => {
        const mockApiResponse = {
          id: 'tt789',
          title: 'Test Show',
          streamingOptions: [
            {
              serviceId: 'hulu',
              serviceName: 'Hulu',
              serviceLogoUrl: 'hulu-logo.png',
              type: 'subscription',
              quality: ['HD', '4K'],
              subtitleLanguages: ['en'],
              audioLanguages: ['en'],
            },
          ],
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('tt789').then(result => {
          expect(result?.availability.length).toBe(1);
          expect(result?.availability[0].service.id).toBe('hulu');
          expect(result?.availability[0].service.name).toBe('Hulu');
        });
      });

      it('should handle string genres correctly', () => {
        const mockApiResponse = {
          id: 'test5',
          title: 'Test Movie',
          genres: ['Action', 'Drama'],
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test5').then(result => {
          expect(result?.content.genres).toEqual(['Action', 'Drama']);
        });
      });
    });

    describe('Service type mapping', () => {
      it('should map subscription types correctly', () => {
        const mockApiResponse = {
          id: 'test6',
          title: 'Test Movie',
          streamingInfo: {
            us: {
              service1: {
                streamingService: {
                  id: 'test',
                  name: 'Test Service',
                  type: 'subscription',
                },
              },
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test6').then(result => {
          expect(result?.availability[0].service.type).toBe('subscription');
          expect(result?.availability[0].purchaseType).toBe('subscription');
        });
      });

      it('should map rental types correctly', () => {
        const mockApiResponse = {
          id: 'test7',
          title: 'Test Movie',
          streamingInfo: {
            us: {
              service1: {
                streamingService: {
                  id: 'test',
                  name: 'Test Service',
                  type: 'rent',
                },
                type: 'rental',
              },
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test7').then(result => {
          expect(result?.availability[0].service.type).toBe('rental');
          expect(result?.availability[0].purchaseType).toBe('rental');
        });
      });

      it('should map purchase types correctly', () => {
        const mockApiResponse = {
          id: 'test8',
          title: 'Test Movie',
          streamingInfo: {
            us: {
              service1: {
                streamingService: {
                  id: 'test',
                  name: 'Test Service',
                  type: 'buy',
                },
                type: 'purchase',
              },
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test8').then(result => {
          expect(result?.availability[0].service.type).toBe('purchase');
          expect(result?.availability[0].purchaseType).toBe('purchase');
        });
      });

      it('should map free types correctly', () => {
        const mockApiResponse = {
          id: 'test9',
          title: 'Test Movie',
          streamingInfo: {
            us: {
              service1: {
                streamingService: {
                  id: 'test',
                  name: 'Test Service',
                  type: 'free',
                },
                type: 'ads',
              },
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test9').then(result => {
          expect(result?.availability[0].service.type).toBe('free');
          expect(result?.availability[0].purchaseType).toBe('free');
        });
      });

      it('should default to subscription for unknown types', () => {
        const mockApiResponse = {
          id: 'test10',
          title: 'Test Movie',
          streamingInfo: {
            us: {
              service1: {
                streamingService: {
                  id: 'test',
                  name: 'Test Service',
                  type: 'unknown',
                },
              },
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test10').then(result => {
          expect(result?.availability[0].service.type).toBe('subscription');
        });
      });

      it('should map tv service type correctly', () => {
        const mockApiResponse = {
          id: 'test-tv',
          title: 'Test Show',
          streamingInfo: {
            us: {
              service1: {
                streamingService: {
                  id: 'test',
                  name: 'Test Service',
                  type: 'tv',
                },
              },
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test-tv').then(result => {
          expect(result?.availability[0].service.type).toBe('tv');
        });
      });

      it('should map ads service type to free', () => {
        const mockApiResponse = {
          id: 'test-ads',
          title: 'Test Movie',
          streamingInfo: {
            us: {
              service1: {
                streamingService: {
                  id: 'test',
                  name: 'Test Service',
                  type: 'ads',
                },
              },
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test-ads').then(result => {
          expect(result?.availability[0].service.type).toBe('free');
        });
      });
    });

    describe('Quality extraction', () => {
      it('should extract quality from formats', () => {
        const mockApiResponse = {
          id: 'test11',
          title: 'Test Movie',
          streamingInfo: {
            us: {
              service1: {
                streamingService: {
                  id: 'test',
                  name: 'Test Service',
                },
                formats: ['sd', 'hd', '4k'],
              },
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test11').then(result => {
          expect(result?.availability[0].quality).toEqual('SD');
        });
      });

      it('should default to HD when no formats provided', () => {
        const mockApiResponse = {
          id: 'test12',
          title: 'Test Movie',
          streamingInfo: {
            us: {
              service1: {
                streamingService: {
                  id: 'test',
                  name: 'Test Service',
                },
                formats: [],
              },
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test12').then(result => {
          expect(result?.availability[0].quality).toBe('HD');
        });
      });
    });

    describe('Country mapping', () => {
      it('should map country codes to names', () => {
        const mockApiResponse = {
          id: 'test13',
          title: 'Test Movie',
          streamingInfo: {
            gb: {
              service1: {
                streamingService: {
                  id: 'test',
                  name: 'Test Service',
                },
              },
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test13').then(result => {
          expect(result?.availability[0].country.code).toBe('GB');
          expect(result?.availability[0].country.name).toBe('United Kingdom');
          expect(result?.availability[0].country.flag).toBe('🇬🇧');
        });
      });

      it('should handle unknown country codes', () => {
        const mockApiResponse = {
          id: 'test14',
          title: 'Test Movie',
          streamingInfo: {
            xy: {
              service1: {
                streamingService: {
                  id: 'test',
                  name: 'Test Service',
                },
              },
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test14').then(result => {
          expect(result?.availability[0].country.code).toBe('XY');
          expect(result?.availability[0].country.name).toBe('XY');
          expect(result?.availability[0].country.flag).toBe('🌍');
        });
      });
    });

    describe('Relevance score calculation', () => {
      it('should calculate relevance score with all factors', () => {
        const currentYear = new Date().getFullYear();
        const mockApiResponse = {
          id: 'test15',
          title: 'Recent Hit',
          popularity: 100,
          voteAverage: 9.0,
          releaseYear: currentYear,
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test15').then(result => {
          expect(result?.relevanceScore).toBeGreaterThan(0.8);
          expect(result?.relevanceScore).toBeLessThanOrEqual(1.0);
        });
      });

      it('should calculate lower relevance for old content', () => {
        const mockApiResponse = {
          id: 'test16',
          title: 'Old Movie',
          popularity: 10,
          voteAverage: 5.0,
          releaseYear: 1990,
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test16').then(result => {
          expect(result?.relevanceScore).toBeLessThanOrEqual(0.7);
        });
      });

      it('should handle content without popularity or rating', () => {
        const mockApiResponse = {
          id: 'test17',
          title: 'Minimal Content',
          releaseYear: 2000,
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockApiResponse,
        });

        return getContentDetails('test17').then(result => {
          expect(result?.relevanceScore).toBe(0.5); // Base score
        });
      });
    });
  });

  describe('Main API Functions', () => {
    describe('searchContent', () => {
      it('should search content successfully', async () => {
        const mockResults = [
          {
            id: 'result1',
            title: 'Test Result',
            overview: 'Test description',
          },
        ];

        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: mockResults,
            total: 1,
          },
        });

        const result = await searchContent('test query');

        expect(mockGet).toHaveBeenCalledWith(
          '/api/streaming-availability/search',
          expect.objectContaining({
            params: expect.objectContaining({
              query: 'test query',
            }),
            skipAuth: true,
          }),
        );
        expect(result.results.length).toBe(1);
        expect(result.results[0].content.title).toBe('Test Result');
      });

      it('should handle filters correctly', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: [],
            total: 0,
          },
        });

        const filters = {
          type: ['movie' as const],
          countries: ['us'],
          yearRange: { min: 2020 },
        };

        await searchContent('action', filters);

        expect(mockGet).toHaveBeenCalledWith(
          '/api/streaming-availability/search',
          expect.objectContaining({
            params: expect.objectContaining({
              type: 'movie',
              country: 'us',
              year: 2020,
            }),
          }),
        );
      });

      it('should convert tv type to series', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: [],
            total: 0,
          },
        });

        const filters = {
          type: ['tv' as const],
        };

        await searchContent('drama', filters);

        expect(mockGet).toHaveBeenCalledWith(
          '/api/streaming-availability/search',
          expect.objectContaining({
            params: expect.objectContaining({
              type: 'series',
            }),
          }),
        );
      });

      it('should handle pagination correctly', async () => {
        const mockResults = Array.from({ length: 20 }, (_, i) => ({
          id: `result${i}`,
          title: `Result ${i}`,
        }));

        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: mockResults,
            total: 100,
          },
        });

        const result = await searchContent('test', {}, 2, 20);

        expect(result.pagination.page).toBe(2);
        expect(result.pagination.pageSize).toBe(20);
        expect(result.pagination.totalPages).toBe(5);
        expect(result.pagination.hasNextPage).toBe(true);
        expect(result.pagination.hasPreviousPage).toBe(true);
      });

      it('should fallback to mock data on API failure', async () => {
        mockGet.mockRejectedValueOnce(new Error('API error'));

        const result = await searchContent('oppenheimer');

        expect(result).toBeDefined();
        expect(result.results).toBeDefined();
      });

      it('should fallback to mock data when response is not successful', async () => {
        mockGet.mockResolvedValueOnce({
          success: false,
          data: null,
        });

        const result = await searchContent('test');

        expect(result).toBeDefined();
        expect(result.results).toBeDefined();
      });

      it('should include queryTime in response', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: [],
            total: 0,
          },
        });

        const result = await searchContent('test');

        expect(result.queryTime).toBeDefined();
        expect(typeof result.queryTime).toBe('number');
      });
    });

    describe('getContentDetails', () => {
      it('should get content details successfully', async () => {
        const mockContent = {
          id: 'tt123',
          title: 'Test Movie',
          overview: 'Test description',
        };

        mockGet.mockResolvedValueOnce({
          success: true,
          data: mockContent,
        });

        const result = await getContentDetails('tt123');

        expect(mockGet).toHaveBeenCalledWith(
          '/api/streaming-availability/by-id',
          expect.objectContaining({
            params: {
              id: 'tt123',
              country: 'us',
            },
            skipAuth: true,
          }),
        );
        expect(result).toBeDefined();
        expect(result?.content.id).toBe('tt123');
      });

      it('should support custom country parameter', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'tt456',
            title: 'Test',
          },
        });

        await getContentDetails('tt456', 'gb');

        expect(mockGet).toHaveBeenCalledWith(
          '/api/streaming-availability/by-id',
          expect.objectContaining({
            params: {
              id: 'tt456',
              country: 'gb',
            },
          }),
        );
      });

      it('should return null on API failure', async () => {
        mockGet.mockRejectedValueOnce(new Error('API error'));

        const result = await getContentDetails('nonexistent');

        expect(result).toBeNull();
      });

      it('should return null when response is not successful', async () => {
        mockGet.mockResolvedValueOnce({
          success: false,
          data: null,
        });

        const result = await getContentDetails('test');

        expect(result).toBeNull();
      });
    });

    describe('getRecommendations', () => {
      it('should get recommendations successfully', async () => {
        const mockRecommendations = [
          { id: 'rec1', title: 'Recommendation 1' },
          { id: 'rec2', title: 'Recommendation 2' },
        ];

        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: mockRecommendations,
          },
        });

        const result = await getRecommendations('tt123');

        expect(mockGet).toHaveBeenCalledWith(
          '/api/content/recommendations',
          expect.objectContaining({
            params: {
              id: 'tt123',
              country: 'us',
              limit: 10,
            },
            skipAuth: true,
          }),
        );
        expect(result.length).toBe(2);
      });

      it('should support custom parameters', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: [],
          },
        });

        await getRecommendations('tt456', 'ca', 20);

        expect(mockGet).toHaveBeenCalledWith(
          '/api/content/recommendations',
          expect.objectContaining({
            params: {
              id: 'tt456',
              country: 'ca',
              limit: 20,
            },
          }),
        );
      });

      it('should fallback to mock data on API failure', async () => {
        mockGet.mockRejectedValueOnce(new Error('API error'));

        const result = await getRecommendations('tt123');

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should fallback when response has no results', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {},
        });

        const result = await getRecommendations('tt123');

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('getPopularContent', () => {
      it('should get popular content successfully', async () => {
        const mockPopular = [
          { id: 'pop1', title: 'Popular 1' },
          { id: 'pop2', title: 'Popular 2' },
        ];

        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: mockPopular,
          },
        });

        const result = await getPopularContent();

        expect(mockGet).toHaveBeenCalledWith(
          '/api/content/popular',
          expect.objectContaining({
            params: {
              country: 'us',
              limit: 20,
            },
            skipAuth: true,
          }),
        );
        expect(result.length).toBe(2);
      });

      it('should filter by movie type', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: [],
          },
        });

        await getPopularContent('movie');

        expect(mockGet).toHaveBeenCalledWith(
          '/api/content/popular',
          expect.objectContaining({
            params: expect.objectContaining({
              type: 'movie',
            }),
          }),
        );
      });

      it('should convert tv type to series', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: [],
          },
        });

        await getPopularContent('tv');

        expect(mockGet).toHaveBeenCalledWith(
          '/api/content/popular',
          expect.objectContaining({
            params: expect.objectContaining({
              type: 'series',
            }),
          }),
        );
      });

      it('should not include type param for "all" type', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: [],
          },
        });

        await getPopularContent('all');

        const callArgs = mockGet.mock.calls[0][1];
        expect(callArgs.params.type).toBeUndefined();
      });

      it('should support custom parameters', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: [],
          },
        });

        await getPopularContent('movie', 'gb', 50);

        expect(mockGet).toHaveBeenCalledWith(
          '/api/content/popular',
          expect.objectContaining({
            params: {
              country: 'gb',
              limit: 50,
              type: 'movie',
            },
          }),
        );
      });

      it('should fallback to mock data on API failure', async () => {
        mockGet.mockRejectedValueOnce(new Error('API error'));

        const result = await getPopularContent();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should fallback when response has no results', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {},
        });

        const result = await getPopularContent();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('getSearchSuggestions', () => {
      it('should return empty array for queries less than 2 characters', async () => {
        const result = await getSearchSuggestions('a');

        expect(result).toEqual([]);
        expect(mockGet).not.toHaveBeenCalled();
      });

      it('should get suggestions successfully', async () => {
        const mockSuggestions = [
          { title: 'Stranger Things', type: 'series' },
          { title: 'Strange World', type: 'movie' },
        ];

        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            suggestions: mockSuggestions,
          },
        });

        const result = await getSearchSuggestions('strange');

        expect(mockGet).toHaveBeenCalledWith(
          '/api/content/suggestions',
          expect.objectContaining({
            params: {
              query: 'strange',
              limit: 10,
            },
            skipAuth: true,
          }),
        );
        expect(result.length).toBe(2);
        expect(result[0].text).toBe('Stranger Things');
        expect(result[0].type).toBe('content');
      });

      it('should support custom limit', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            suggestions: [],
          },
        });

        await getSearchSuggestions('test', 5);

        expect(mockGet).toHaveBeenCalledWith(
          '/api/content/suggestions',
          expect.objectContaining({
            params: {
              query: 'test',
              limit: 5,
            },
          }),
        );
      });

      it('should map movie and series types to content', async () => {
        const mockSuggestions = [
          { title: 'Movie Title', type: 'movie', poster: 'poster.jpg' },
          { title: 'Series Title', type: 'series' },
        ];

        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            suggestions: mockSuggestions,
          },
        });

        const result = await getSearchSuggestions('title');

        expect(result[0].type).toBe('content');
        expect(result[0].category).toBe('movie');
        expect(result[0].image).toBe('poster.jpg');
        expect(result[1].type).toBe('content');
        expect(result[1].category).toBe('series');
      });

      it('should fallback to mock data on API failure', async () => {
        mockGet.mockRejectedValueOnce(new Error('API error'));

        const result = await getSearchSuggestions('stranger');

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should fallback when response has no suggestions', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {},
        });

        const result = await getSearchSuggestions('test');

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('searchByTitle', () => {
      it('should search by title successfully', async () => {
        const mockResults = [
          { title: 'The Matrix', year: 1999, type: 'movie' },
        ];

        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: mockResults,
          },
        });

        const result = await searchByTitle('The Matrix');

        expect(mockGet).toHaveBeenCalledWith(
          '/api/streaming-availability/search/by-title',
          expect.objectContaining({
            params: {
              title: 'The Matrix',
              country: 'us',
            },
            skipAuth: true,
          }),
        );
        expect(result.length).toBe(1);
      });

      it('should include optional parameters', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: [],
          },
        });

        await searchByTitle('Test', 2020, 'movie', 'gb');

        expect(mockGet).toHaveBeenCalledWith(
          '/api/streaming-availability/search/by-title',
          expect.objectContaining({
            params: {
              title: 'Test',
              year: 2020,
              type: 'movie',
              country: 'gb',
            },
          }),
        );
      });

      it('should handle series type', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {
            results: [],
          },
        });

        await searchByTitle('Test Show', undefined, 'series');

        expect(mockGet).toHaveBeenCalledWith(
          '/api/streaming-availability/search/by-title',
          expect.objectContaining({
            params: expect.objectContaining({
              type: 'series',
            }),
          }),
        );
      });

      it('should return empty array on API failure', async () => {
        mockGet.mockRejectedValueOnce(new Error('API error'));

        const result = await searchByTitle('Test');

        expect(result).toEqual([]);
      });

      it('should return empty array when response has no results', async () => {
        mockGet.mockResolvedValueOnce({
          success: true,
          data: {},
        });

        const result = await searchByTitle('Test');

        expect(result).toEqual([]);
      });
    });
  });

  describe('Mock Data Fallbacks', () => {
    it('should return mock data with proper structure', async () => {
      mockGet.mockRejectedValueOnce(new Error('API error'));

      const result = await searchContent('oppenheimer');

      expect(result.results.length).toBeGreaterThan(0);
      const item = result.results[0];
      expect(item.content).toBeDefined();
      expect(item.content.title).toBe('Oppenheimer');
      expect(item.availability).toBeDefined();
      expect(item.availability.length).toBeGreaterThan(0);
    });

    it('should filter mock data by query', async () => {
      mockGet.mockRejectedValueOnce(new Error('API error'));

      const result = await searchContent('game of thrones');

      expect(result.results.some(r => r.content.title === 'Game of Thrones')).toBe(true);
    });

    it('should filter mock data by type', async () => {
      mockGet.mockRejectedValueOnce(new Error('API error'));

      const filters = { type: ['movie' as const] };
      const result = await searchContent('', filters);

      result.results.forEach(item => {
        expect(item.content.type).toBe('movie');
      });
    });

    it('should filter mock data by year range (min)', async () => {
      mockGet.mockRejectedValueOnce(new Error('API error'));

      const filters = { yearRange: { min: 2020 } };
      const result = await searchContent('', filters);

      result.results.forEach(item => {
        if (item.content.releaseYear) {
          expect(item.content.releaseYear).toBeGreaterThanOrEqual(2020);
        }
      });
    });

    it('should filter mock data by year range (max)', async () => {
      mockGet.mockRejectedValueOnce(new Error('API error'));

      const filters = { yearRange: { max: 2015 } };
      const result = await searchContent('', filters);

      result.results.forEach(item => {
        if (item.content.releaseYear) {
          expect(item.content.releaseYear).toBeLessThanOrEqual(2015);
        }
      });
    });

    it('should filter mock data by genres', async () => {
      mockGet.mockRejectedValueOnce(new Error('API error'));

      const filters = { genres: ['Drama'] };
      const result = await searchContent('', filters);

      result.results.forEach(item => {
        expect(item.content.genres).toBeDefined();
        expect(item.content.genres?.some(g => g === 'Drama')).toBe(true);
      });
    });

    it('should handle mock pagination correctly', async () => {
      mockGet.mockRejectedValueOnce(new Error('API error'));

      const result = await searchContent('', {}, 1, 5);

      expect(result.results.length).toBeLessThanOrEqual(5);
      expect(result.pagination.pageSize).toBe(5);
    });

    it('should return mock recommendations', async () => {
      mockGet.mockRejectedValueOnce(new Error('API error'));

      const result = await getRecommendations('any-id', 'us', 5);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should return mock popular content with type filtering', async () => {
      mockGet.mockRejectedValueOnce(new Error('API error'));

      const result = await getPopularContent('tv', 'us', 10);

      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item.content.type).toBe('tv');
      });
    });

    it('should return mock search suggestions', async () => {
      mockGet.mockRejectedValueOnce(new Error('API error'));

      const result = await getSearchSuggestions('stranger');

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(s => s.text.toLowerCase().includes('stranger'))).toBe(true);
    });
  });

  describe('Default export', () => {
    it('should export all functions', () => {
      expect(StreamingService.searchContent).toBeDefined();
      expect(StreamingService.getContentDetails).toBeDefined();
      expect(StreamingService.getRecommendations).toBeDefined();
      expect(StreamingService.getPopularContent).toBeDefined();
      expect(StreamingService.getSearchSuggestions).toBeDefined();
      expect(StreamingService.searchByTitle).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search query', async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: {
          results: [],
          total: 0,
        },
      });

      const result = await searchContent('');

      expect(result.results).toEqual([]);
    });

    it('should handle missing optional fields', async () => {
      const mockMinimalContent = {
        id: 'minimal',
        title: 'Minimal Content',
      };

      mockGet.mockResolvedValueOnce({
        success: true,
        data: mockMinimalContent,
      });

      const result = await getContentDetails('minimal');

      expect(result).toBeDefined();
      expect(result?.content.id).toBe('minimal');
      expect(result?.content.description).toBeUndefined();
    });

    it('should handle price and currency in availability', async () => {
      const mockApiResponse = {
        id: 'test-price',
        title: 'Test Movie',
        streamingInfo: {
          us: {
            service1: {
              streamingService: {
                id: 'test',
                name: 'Test Service',
              },
              price: {
                amount: 9.99,
                currency: 'USD',
              },
            },
          },
        },
      };

      mockGet.mockResolvedValueOnce({
        success: true,
        data: mockApiResponse,
      });

      const result = await getContentDetails('test-price');

      expect(result?.availability[0].service.price).toBe(9.99);
      expect(result?.availability[0].service.currency).toBe('USD');
      expect(result?.availability[0].price).toBe(9.99);
      expect(result?.availability[0].currency).toBe('USD');
    });

    it('should handle dates in availability', async () => {
      const addedDate = new Date('2024-01-01');
      const leavingDate = new Date('2024-12-31');

      const mockApiResponse = {
        id: 'test-dates',
        title: 'Test Movie',
        streamingInfo: {
          us: {
            service1: {
              streamingService: {
                id: 'test',
                name: 'Test Service',
              },
              addedAt: addedDate.toISOString(),
              leavingAt: leavingDate.toISOString(),
            },
          },
        },
      };

      mockGet.mockResolvedValueOnce({
        success: true,
        data: mockApiResponse,
      });

      const result = await getContentDetails('test-dates');

      expect(result?.availability[0].addedDate).toEqual(addedDate);
      expect(result?.availability[0].leavingDate).toEqual(leavingDate);
    });

    it('should trim search query', async () => {
      mockGet.mockResolvedValueOnce({
        success: true,
        data: {
          results: [],
          total: 0,
        },
      });

      await searchContent('  test query  ');

      expect(mockGet).toHaveBeenCalledWith(
        '/api/streaming-availability/search',
        expect.objectContaining({
          params: expect.objectContaining({
            query: 'test query',
          }),
        }),
      );
    });
  });
});
