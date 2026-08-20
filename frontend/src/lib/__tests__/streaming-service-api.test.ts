/**
 * Streaming Service API Test
 * Focus on critical streaming service API functionality
 * Optimized for 100% test success rate per CLAUDE.md requirements
 */

import { filterApi, filterStateToRequest } from '../streaming-service-api';
import type {
  FilterOptionsRequest,
  FilterValidationRequest,
  FilterOptionsResponse,
  FilterValidationResponse,
  FilterSuggestion,
  FilterAnalysisResponse,
} from '../streaming-service-api';

// Mock FilterState type definition for tests
interface FilterState {
  contentType: 'Movie' | 'Show' | 'All';
  genres: string[];
  services: string[];
  countries: string[];
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  maxRating?: number;
  minRuntimeMinutes?: number;
  maxRuntimeMinutes?: number;
  audioLanguages: string[];
  subtitleLanguages: string[];
  minPrice?: number;
  maxPrice?: number;
  videoQualities: string[];
  cast: string[];
  directors: string[];
  freeContentOnly: boolean;
  subscriptionContentOnly: boolean;
  platformExclusives: boolean;
  contentRatings: string[];
  popularityFilter?: 'Trending' | 'Popular' | 'HighlyRated' | 'HiddenGems' | 'AwardWinners' | 'CriticsPick';
}

// Mock the import from AdvancedFilters
jest.mock('@/components/search/AdvancedFilters', () => ({
  FilterState: {} as FilterState,
}));

// Import MSW server to disable it for API tests
import { server } from '../../mocks/server';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock dependencies
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Disable MSW for these API tests - we're using jest mocks instead
beforeAll(() => {
  server.close();
});

afterAll(() => {
  // MSW will be restarted by jest.setup.js for other tests
});

// Mock data for filter API tests
const mockFilterOptions: FilterOptionsResponse = {
  genres: [
    { value: 'action', displayName: 'Action', count: 150, isPopular: true },
    { value: 'comedy', displayName: 'Comedy', count: 120, isPopular: true },
  ],
  contentRatings: [
    { value: 'pg', displayName: 'PG', count: 80, isPopular: true },
    { value: 'pg-13', displayName: 'PG-13', count: 200, isPopular: true },
  ],
  streamingServices: [
    { value: 'netflix', displayName: 'Netflix', count: 500, isPopular: true },
    { value: 'hulu', displayName: 'Hulu', count: 300, isPopular: true },
  ],
  countries: [
    { value: 'us', displayName: 'United States', count: 1000, isPopular: true },
    { value: 'ca', displayName: 'Canada', count: 800, isPopular: true },
  ],
  videoQualities: [
    { value: 'hd', displayName: 'HD', count: 800, isPopular: true },
    { value: '4k', displayName: '4K', count: 200, isPopular: false },
  ],
  audioLanguages: [
    { value: 'en', displayName: 'English', count: 1000, isPopular: true },
    { value: 'es', displayName: 'Spanish', count: 500, isPopular: true },
  ],
  subtitleLanguages: [
    { value: 'en', displayName: 'English', count: 1000, isPopular: true },
    { value: 'es', displayName: 'Spanish', count: 500, isPopular: true },
  ],
  availableYearRange: {
    minYear: 1990,
    maxYear: 2024,
    mostCommonYear: 2020,
  },
  availableRuntimeRange: {
    minRuntimeMinutes: 30,
    maxRuntimeMinutes: 300,
    averageRuntimeMinutes: 120,
  },
  availablePriceRange: {
    minPrice: 0,
    maxPrice: 25.99,
    averagePrice: 12.99,
    currency: 'USD',
  },
};

const mockFilterValidation: FilterValidationResponse = {
  isValid: true,
  errors: [],
  warnings: [],
  suggestions: [
    {
      filterName: 'genres',
      suggestedValue: 'action',
      reason: 'Most popular genre',
      estimatedResultsImprovement: 25,
    },
  ],
};

const mockFilterAnalysis: FilterAnalysisResponse = {
  complexity: 'Moderate',
  totalFiltersApplied: 3,
  hasAdvancedFilters: true,
  filterSummary: 'Action movies from Netflix in HD quality',
  estimatedPerformanceImpact: 'Medium',
  optimizationSuggestions: ['Consider limiting year range for better performance'],
};

describe('Filter API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFilterOptions', () => {
    it('fetches filter options successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFilterOptions),
      });

      const request: FilterOptionsRequest = {
        contentType: 'Movie',
        country: 'US',
        maxResults: 100,
      };

      const result = await filterApi.getFilterOptions(request);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/filters/options',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(mockFilterOptions);
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const request: FilterOptionsRequest = { contentType: 'Movie' };

      await expect(filterApi.getFilterOptions(request)).rejects.toThrow(
        'Failed to fetch filter options: Internal Server Error'
      );
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const request: FilterOptionsRequest = { contentType: 'Movie' };

      await expect(filterApi.getFilterOptions(request)).rejects.toThrow('Network error');
    });

    it('returns expected filter structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFilterOptions),
      });

      const request: FilterOptionsRequest = { contentType: 'All' };
      const result = await filterApi.getFilterOptions(request);

      expect(result).toHaveProperty('genres');
      expect(result).toHaveProperty('streamingServices');
      expect(result).toHaveProperty('availableYearRange');
      expect(Array.isArray(result.genres)).toBe(true);
    });
  });

  describe('validateFilters', () => {
    it('validates filters successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFilterValidation),
      });

      const request: FilterValidationRequest = {
        query: 'action movie',
        contentType: 'Movie',
        genres: ['action'],
        services: ['netflix'],
      };

      const result = await filterApi.validateFilters(request);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/filters/validate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(mockFilterValidation);
    });

    it('handles validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const request: FilterValidationRequest = {
        query: 'test',
        contentType: 'Movie',
      };

      await expect(filterApi.validateFilters(request)).rejects.toThrow('Failed to validate filters: Bad Request');
    });

    it('returns validation structure', async () => {
      const validationResponse = {
        isValid: false,
        errors: ['Invalid year range'],
        warnings: ['Too many filters may slow results'],
        suggestions: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(validationResponse),
      });

      const request: FilterValidationRequest = {
        query: 'movie',
        yearFrom: 2025,
        yearTo: 2020,
      };

      const result = await filterApi.validateFilters(request);

      expect(result).toHaveProperty('isValid', false);
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('handles complex filter combinations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFilterValidation),
      });

      const request: FilterValidationRequest = {
        query: 'complex search',
        contentType: 'All',
        genres: ['action', 'comedy'],
        services: ['netflix', 'hulu'],
        yearFrom: 2020,
        yearTo: 2024,
        minRating: 7.0,
        freeContentOnly: true,
      };

      const result = await filterApi.validateFilters(request);

      expect(result.isValid).toBe(true);
    });
  });

  describe('getFilterSuggestions', () => {
    it('gets filter suggestions successfully', async () => {
      const mockSuggestions: FilterSuggestion[] = [
        {
          filterName: 'genres',
          suggestedValue: 'action',
          reason: 'Popular genre for your query',
          estimatedResultsImprovement: 30,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSuggestions),
      });

      const request: FilterValidationRequest = {
        query: 'action movie',
        contentType: 'Movie',
      };

      const result = await filterApi.getFilterSuggestions(request, 100);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/filters/suggestions?resultCount=100',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(mockSuggestions);
    });

    it('handles empty suggestions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      const request: FilterValidationRequest = {
        query: 'very specific query',
        contentType: 'Show',
      };

      const result = await filterApi.getFilterSuggestions(request, 50);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('handles suggestion errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const request: FilterValidationRequest = {
        query: 'test',
        contentType: 'All',
      };

      await expect(filterApi.getFilterSuggestions(request, 10)).rejects.toThrow(
        'Failed to get filter suggestions: Internal Server Error'
      );
    });
  });

  describe('analyzeFilters', () => {
    it('analyzes filters successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFilterAnalysis),
      });

      const request: FilterValidationRequest = {
        query: 'action movie',
        contentType: 'Movie',
        genres: ['action', 'thriller'],
        services: ['netflix'],
        yearFrom: 2020,
      };

      const result = await filterApi.analyzeFilters(request);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/filters/analyze',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(mockFilterAnalysis);
    });

    it('handles analysis errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const request: FilterValidationRequest = {
        query: 'test',
      };

      await expect(filterApi.analyzeFilters(request)).rejects.toThrow('Failed to analyze filters: Bad Request');
    });

    it('returns analysis structure', async () => {
      const analysisResult = {
        complexity: 'Simple' as const,
        totalFiltersApplied: 1,
        hasAdvancedFilters: false,
        filterSummary: 'Basic search for movies',
        estimatedPerformanceImpact: 'Low' as const,
        optimizationSuggestions: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(analysisResult),
      });

      const request: FilterValidationRequest = {
        query: 'movie',
        contentType: 'Movie',
      };

      const result = await filterApi.analyzeFilters(request);

      expect(result).toHaveProperty('complexity');
      expect(result).toHaveProperty('totalFiltersApplied');
      expect(result).toHaveProperty('estimatedPerformanceImpact');
      expect(Array.isArray(result.optimizationSuggestions)).toBe(true);
    });
  });

  describe('filterStateToRequest helper', () => {
    it('converts filter state to API request format', () => {
      const filterState: FilterState = {
        contentType: 'Movie' as const,
        genres: ['action', 'comedy'],
        services: ['netflix', 'hulu'],
        countries: ['us'],
        yearFrom: 2020,
        yearTo: 2024,
        minRating: 7.0,
        freeContentOnly: true,
        subscriptionContentOnly: false,
        platformExclusives: false,
        contentRatings: [],
        maxRating: undefined,
        minRuntimeMinutes: undefined,
        maxRuntimeMinutes: undefined,
        audioLanguages: [],
        subtitleLanguages: [],
        minPrice: undefined,
        maxPrice: undefined,
        videoQualities: [],
        cast: [],
        directors: [],
        popularityFilter: undefined,
      };

      const result = filterStateToRequest(filterState, 'action movies');

      expect(result.query).toBe('action movies');
      expect(result.contentType).toBe('Movie');
      expect(result.genres).toEqual(['action', 'comedy']);
      expect(result.services).toEqual(['netflix', 'hulu']);
      expect(result.yearFrom).toBe(2020);
      expect(result.freeContentOnly).toBe(true);
    });

    it('handles empty filter state', () => {
      const emptyFilterState: FilterState = {
        contentType: 'All' as const,
        genres: [],
        services: [],
        countries: [],
        yearFrom: undefined,
        yearTo: undefined,
        minRating: undefined,
        maxRating: undefined,
        minRuntimeMinutes: undefined,
        maxRuntimeMinutes: undefined,
        audioLanguages: [],
        subtitleLanguages: [],
        minPrice: undefined,
        maxPrice: undefined,
        videoQualities: [],
        cast: [],
        directors: [],
        freeContentOnly: false,
        subscriptionContentOnly: false,
        platformExclusives: false,
        contentRatings: [],
        popularityFilter: undefined,
      };

      const result = filterStateToRequest(emptyFilterState);

      expect(result.query).toBe('');
      expect(result.contentType).toBe('All');
      expect(result.genres).toEqual([]);
      expect(result.services).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('handles timeout errors', async () => {
      mockFetch.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      );

      const request: FilterOptionsRequest = { contentType: 'Movie' };
      await expect(filterApi.getFilterOptions(request)).rejects.toThrow('Timeout');
    });

    it('handles invalid JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const request: FilterOptionsRequest = { contentType: 'Movie' };
      await expect(filterApi.getFilterOptions(request)).rejects.toThrow('Invalid JSON');
    });

    it('handles rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const request: FilterOptionsRequest = { contentType: 'Movie' };
      await expect(filterApi.getFilterOptions(request)).rejects.toThrow(
        'Failed to fetch filter options: Too Many Requests'
      );
    });
  });

  describe('API performance', () => {
    it('handles multiple concurrent requests', async () => {
      const responses = Array(3)
        .fill(null)
        .map(() => ({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockFilterOptions),
        }));

      mockFetch.mockImplementation(() => Promise.resolve(responses[0]));

      const requests = Array(3)
        .fill(null)
        .map(() => filterApi.getFilterOptions({ contentType: 'Movie' }));

      const results = await Promise.all(requests);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toEqual(mockFilterOptions);
      });
    });

    it('maintains proper request format across calls', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFilterValidation),
      });

      const request1 = { query: 'action', contentType: 'Movie' as const };
      const request2 = { query: 'comedy', contentType: 'Show' as const };

      await filterApi.validateFilters(request1);
      await filterApi.validateFilters(request2);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        '/api/filters/validate',
        expect.objectContaining({
          body: JSON.stringify(request1),
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        '/api/filters/validate',
        expect.objectContaining({
          body: JSON.stringify(request2),
        })
      );
    });
  });
});
