/* eslint-disable @typescript-eslint/no-explicit-any */
import { FilterState } from '@/components/search/AdvancedFilters';
import { streamingAvailabilityService, EnhancedStreamingOption } from '@/services/streamingAvailabilityService';

export interface FilterOptionsRequest {
  contentType?: 'Movie' | 'Show' | 'All';
  language?: string;
  country?: string;
  maxResults?: number;
}

// Streaming availability search parameters
export interface StreamingAvailabilitySearchRequest {
  title: string;
  year?: number;
  type?: 'movie' | 'series';
  country?: string;
  lang?: string;
  showType?: 'all' | 'flatrate' | 'free' | 'ads' | 'rent' | 'buy' | 'cinema';
  showOriginalLanguage?: boolean;
}

// Enhanced streaming availability functions using the official library
export const streamingAvailabilityApi = {
  /**
   * Get streaming options for a specific title using the official API
   */
  async getStreamingOptionsByTitle(params: StreamingAvailabilitySearchRequest): Promise<EnhancedStreamingOption[]> {
    try {
      return await streamingAvailabilityService.getStreamingOptionsByTitle(params);
    } catch (error) {
      console.error('Failed to get streaming options by title:', error);
      return [];
    }
  },

  /**
   * Get streaming options for content by ID
   */
  async getStreamingOptionsById(
    contentId: string,
    contentType: 'movie' | 'tv-show' | 'documentary',
    country?: string
  ): Promise<EnhancedStreamingOption[]> {
    try {
      return await streamingAvailabilityService.getStreamingOptionsById(contentId, contentType, country);
    } catch (error) {
      console.error('Failed to get streaming options by ID:', error);
      return [];
    }
  },

  /**
   * Search for content with streaming availability
   */
  async searchContentWithAvailability(params: {
    query: string;
    type?: 'movie' | 'series';
    country?: string;
    year?: number;
    limit?: number;
  }) {
    try {
      return await streamingAvailabilityService.searchContentWithAvailability(params);
    } catch (error) {
      console.error('Failed to search content with availability:', error);
      return { results: [], total: 0 };
    }
  },

  /**
   * Get streaming options grouped by country
   */
  async getStreamingOptionsByCountry(contentId: string, contentType: 'movie' | 'tv-show', countries?: string[]) {
    try {
      return await streamingAvailabilityService.getStreamingOptionsByCountry(contentId, contentType, countries);
    } catch (error) {
      console.error('Failed to get streaming options by country:', error);
      return [];
    }
  },

  /**
   * Get availability changes for content
   */
  async getAvailabilityChanges(contentId: string, contentType: 'movie' | 'tv-show', country?: string) {
    try {
      return await streamingAvailabilityService.getAvailabilityChanges(contentId, contentType, country);
    } catch (error) {
      console.error('Failed to get availability changes:', error);
      return { expiringSoon: [], newlyAvailable: [] };
    }
  },
};

export interface FilterValidationRequest {
  query: string;
  contentType?: 'Movie' | 'Show' | 'All';
  genres?: string[];
  countries?: string[];
  services?: string[];
  contentRatings?: string[];
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  maxRating?: number;
  minRuntimeMinutes?: number;
  maxRuntimeMinutes?: number;
  audioLanguages?: string[];
  subtitleLanguages?: string[];
  minPrice?: number;
  maxPrice?: number;
  videoQualities?: string[];
  cast?: string[];
  directors?: string[];
  freeContentOnly?: boolean;
  subscriptionContentOnly?: boolean;
  platformExclusives?: boolean;
  popularityFilter?: 'Trending' | 'Popular' | 'HighlyRated' | 'HiddenGems' | 'AwardWinners' | 'CriticsPick';
}

export interface FilterValidationResponse {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: FilterSuggestion[];
}

export interface FilterSuggestion {
  filterName: string;
  suggestedValue: any;
  reason: string;
  estimatedResultsImprovement: number;
}

export interface FilterOptionsResponse {
  genres: FilterOption[];
  contentRatings: FilterOption[];
  streamingServices: FilterOption[];
  countries: FilterOption[];
  videoQualities: FilterOption[];
  audioLanguages: FilterOption[];
  subtitleLanguages: FilterOption[];
  availableYearRange: YearRange;
  availableRuntimeRange: RuntimeRange;
  availablePriceRange: PriceRange;
}

export interface FilterOption {
  value: string;
  displayName: string;
  count: number;
  isPopular: boolean;
  description?: string;
  iconUrl?: string;
}

export interface YearRange {
  minYear: number;
  maxYear: number;
  mostCommonYear: number;
}

export interface RuntimeRange {
  minRuntimeMinutes: number;
  maxRuntimeMinutes: number;
  averageRuntimeMinutes: number;
}

export interface PriceRange {
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  currency: string;
}

export interface FilterAnalysisResponse {
  complexity: 'Simple' | 'Moderate' | 'Complex';
  totalFiltersApplied: number;
  hasAdvancedFilters: boolean;
  filterSummary: string;
  estimatedPerformanceImpact: 'Low' | 'Medium' | 'High';
  optimizationSuggestions: string[];
}

const API_BASE = '/api/filters';

export const filterApi = {
  // Get filter options for dropdowns and UI
  async getFilterOptions(request: FilterOptionsRequest): Promise<FilterOptionsResponse> {
    const response = await fetch(`${API_BASE}/options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch filter options: ${response.statusText}`);
    }

    return response.json();
  },

  // Validate filter combination
  async validateFilters(request: FilterValidationRequest): Promise<FilterValidationResponse> {
    const response = await fetch(`${API_BASE}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to validate filters: ${response.statusText}`);
    }

    return response.json();
  },

  // Get filter suggestions based on results
  async getFilterSuggestions(request: FilterValidationRequest, resultCount: number): Promise<FilterSuggestion[]> {
    const response = await fetch(`${API_BASE}/suggestions?resultCount=${resultCount}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to get filter suggestions: ${response.statusText}`);
    }

    return response.json();
  },

  // Analyze applied filters
  async analyzeFilters(request: FilterValidationRequest): Promise<FilterAnalysisResponse> {
    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to analyze filters: ${response.statusText}`);
    }

    return response.json();
  },
};

// Helper function to convert FilterState to API request format
export function filterStateToRequest(filters: FilterState, query: string = ''): FilterValidationRequest {
  return {
    query,
    contentType: filters.contentType,
    genres: filters.genres,
    countries: filters.countries,
    services: filters.services,
    contentRatings: filters.contentRatings,
    yearFrom: filters.yearFrom,
    yearTo: filters.yearTo,
    minRating: filters.minRating,
    maxRating: filters.maxRating,
    minRuntimeMinutes: filters.minRuntimeMinutes,
    maxRuntimeMinutes: filters.maxRuntimeMinutes,
    audioLanguages: filters.audioLanguages,
    subtitleLanguages: filters.subtitleLanguages,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    videoQualities: filters.videoQualities,
    cast: filters.cast,
    directors: filters.directors,
    freeContentOnly: filters.freeContentOnly,
    subscriptionContentOnly: filters.subscriptionContentOnly,
    platformExclusives: filters.platformExclusives,
    popularityFilter: filters.popularityFilter,
  };
}
