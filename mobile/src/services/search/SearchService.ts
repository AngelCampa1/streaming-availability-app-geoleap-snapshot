export type { SearchResponse } from "../../types/streaming";
import { SearchResponse, SearchResult, SearchFilters, SearchSuggestion, PopularSearch } from '../../types/streaming';
import StreamingService from '../streaming/StreamingService';
import { logger } from '../../utils/logger';

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  page?: number;
  pageSize?: number;
}

export interface SearchServiceConfig {
  debounceMs: number;
  maxCacheSize: number;
  cacheTimeoutMs: number;
  enableAnalytics: boolean;
  enableOfflineCache: boolean;
}

export class SearchService {
  private static instance: SearchService;
  private config: SearchServiceConfig;
  private cache: Map<string, { data: SearchResponse; timestamp: number }>;
  private searchAbortController: AbortController | null = null;

  private constructor(config: Partial<SearchServiceConfig> = {}) {
    this.config = {
      debounceMs: 300,
      maxCacheSize: 100,
      cacheTimeoutMs: 5 * 60 * 1000, // 5 minutes
      enableAnalytics: true,
      enableOfflineCache: true,
      ...config,
    };
    this.cache = new Map();
  }

  public static getInstance(config?: Partial<SearchServiceConfig>): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService(config);
    }
    return SearchService.instance;
  }

  /**
   * Perform streaming content search using official streaming-availability API
   */
  public async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      // Cancel previous search if still running
      if (this.searchAbortController) {
        this.searchAbortController.abort();
      }

      this.searchAbortController = new AbortController();

      const cacheKey = this.generateCacheKey(query);

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTimeoutMs) {
        return cached.data;
      }

      // Use the official streaming-availability service
      const data = await StreamingService.searchContent(
        query.query,
        query.filters || {},
        query.page || 1,
        query.pageSize || 20,
      );

      // Add our queryTime tracking
      data.queryTime = Date.now() - startTime;

      // Cache results
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      // Clean cache if needed
      this.cleanCache();

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Search was cancelled');
      }

      // Fallback to mock data for development
      logger.warn('[SearchService] Streaming search failed, using mock data', error);
      return this.getMockSearchResults(query, Date.now() - startTime);
    }
  }

  /**
   * Get search suggestions and autocomplete using streaming-availability API
   */
  public async getSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    if (!query || query.length < 2) {
      return this.getTrendingSuggestions();
    }

    try {
      const suggestions = await StreamingService.getSearchSuggestions(query, limit);
      return suggestions;
    } catch (error) {
      logger.warn('[SearchService] Suggestions API failed, using mock data', error);
      return this.getMockSuggestions(query, limit);
    }
  }

  /**
   * Get trending/popular searches using streaming-availability API
   */
  public async getPopularSearches(limit: number = 10): Promise<PopularSearch[]> {
    try {
      // Get popular content and convert to popular searches format
      const popularContent = await StreamingService.getPopularContent('all', 'us', limit);

      return popularContent.map((result, index) => ({
        query: result.content.title,
        count: Math.floor(Math.random() * 10000) + 1000, // Mock count
        category: result.content.genres?.[0] || 'Entertainment',
        trending: index < 5, // Top 5 are trending
      }));
    } catch (error) {
      logger.warn('[SearchService] Popular searches API failed, using mock data', error);
      return this.getMockPopularSearches(limit);
    }
  }

  /**
   * Search by voice/text recognition
   */
  public async voiceSearch(transcript: string): Promise<SearchResponse> {
    // Process voice transcript and perform search
    const cleanedQuery = this.processVoiceTranscript(transcript);
    return this.search({ query: cleanedQuery });
  }

  /**
   * Clear search cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; totalMemoryUsage: number } {
    let totalMemory = 0;
    for (const { data } of this.cache.values()) {
      totalMemory += JSON.stringify(data).length;
    }

    return {
      size: this.cache.size,
      totalMemoryUsage: totalMemory,
    };
  }

  // Old API methods removed - now using StreamingService for all API operations

  private generateCacheKey(query: SearchQuery): string {
    return JSON.stringify({
      q: query.query,
      filters: query.filters,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    });
  }

  private cleanCache(): void {
    if (this.cache.size <= this.config.maxCacheSize) {
      return;
    }

    // Remove oldest entries
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, this.cache.size - this.config.maxCacheSize);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  private processVoiceTranscript(transcript: string): string {
    // Clean up voice transcript for search
    return transcript
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  private getTrendingSuggestions(): SearchSuggestion[] {
    return [
      {
        id: 'trending-1',
        text: 'Stranger Things',
        type: 'content',
        category: 'TV Series',
        image: 'https://example.com/stranger-things.jpg',
        count: 15000,
      },
      {
        id: 'trending-2',
        text: 'The Last of Us',
        type: 'content',
        category: 'TV Series',
        image: 'https://example.com/last-of-us.jpg',
        count: 12000,
      },
      {
        id: 'trending-3',
        text: 'Marvel Movies',
        type: 'genre',
        category: 'Action',
        count: 8000,
      },
      {
        id: 'trending-4',
        text: 'Netflix Originals',
        type: 'service',
        category: 'Subscription',
        count: 6000,
      },
    ];
  }

  private getMockSuggestions(query: string, limit: number): SearchSuggestion[] {
    const mockSuggestions = [
      {
        id: 'suggestion-1',
        text: 'The Mandalorian',
        type: 'content' as const,
        category: 'TV Series',
        image: 'https://example.com/mandalorian.jpg',
      },
      {
        id: 'suggestion-2',
        text: 'Tom Holland',
        type: 'actor' as const,
        category: 'Actor',
        count: 25,
      },
      {
        id: 'suggestion-3',
        text: 'Christopher Nolan',
        type: 'director' as const,
        category: 'Director',
        count: 12,
      },
      {
        id: 'suggestion-4',
        text: 'Action Movies',
        type: 'genre' as const,
        category: 'Genre',
        count: 500,
      },
    ];

    return mockSuggestions
      .filter(s => s.text.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
  }

  private getMockPopularSearches(limit: number): PopularSearch[] {
    return [
      { query: 'Stranger Things', count: 15000, trending: true },
      { query: 'The Last of Us', count: 12000, trending: true },
      { query: 'Wednesday', count: 10000, trending: true },
      { query: 'The Bear', count: 8500, trending: false },
      { query: 'House of the Dragon', count: 7500, trending: false },
    ].slice(0, limit);
  }

  private getMockSearchResults(query: SearchQuery, queryTime: number): SearchResponse {
    // Use real TMDB poster URLs for mock data
    const mockResults: SearchResult[] = [
      {
        content: {
          id: 'tt4574334',
          title: 'Stranger Things',
          description: 'When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces in order to get him back.',
          type: 'tv',
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
              type: 'subscription',
              price: 15.99,
              currency: 'USD',
            },
            country: {
              code: 'US',
              name: 'United States',
              flag: '🇺🇸',
            },
            available: true,
            quality: '4K',
            subtitles: ['en', 'es', 'fr'],
            audioLanguages: ['en'],
            purchaseType: 'subscription',
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
          description: 'In a world devastated by a fungal infection, Joel is tasked with escorting Ellie across the country to a potential cure.',
          type: 'tv',
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
              type: 'subscription',
              price: 14.99,
              currency: 'USD',
            },
            country: {
              code: 'US',
              name: 'United States',
              flag: '🇺🇸',
            },
            available: true,
            quality: '4K',
            subtitles: ['en', 'es'],
            audioLanguages: ['en'],
            purchaseType: 'subscription',
          },
        ],
        relevanceScore: 0.92,
        popularity: 88,
        userRating: 8.8,
        watchlistAdded: true,
      },
      {
        content: {
          id: 'tt15398776',
          title: 'Oppenheimer',
          description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
          type: 'movie',
          poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
          backdrop: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
          releaseYear: 2023,
          rating: 8.5,
          genres: ['Drama', 'History', 'Thriller'],
          duration: 180,
          director: 'Christopher Nolan',
          cast: ['Cillian Murphy', 'Emily Blunt', 'Robert Downey Jr.'],
          language: 'en',
          imdbId: 'tt15398776',
          tmdbId: 872585,
        },
        availability: [
          {
            contentId: 'tt15398776',
            service: {
              id: 'peacock',
              name: 'Peacock',
              icon: 'https://images.justwatch.com/icon/190848813/s100/peacock.webp',
              type: 'subscription',
              price: 5.99,
              currency: 'USD',
            },
            country: {
              code: 'US',
              name: 'United States',
              flag: '🇺🇸',
            },
            available: true,
            quality: '4K',
            subtitles: ['en', 'es'],
            audioLanguages: ['en'],
            purchaseType: 'subscription',
          },
        ],
        relevanceScore: 0.90,
        popularity: 92,
        userRating: 8.5,
        watchlistAdded: false,
      },
      {
        content: {
          id: 'tt9362722',
          title: 'Spider-Man: Across the Spider-Verse',
          description: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People.',
          type: 'movie',
          poster: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
          backdrop: 'https://image.tmdb.org/t/p/w1280/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg',
          releaseYear: 2023,
          rating: 8.6,
          genres: ['Animation', 'Action', 'Adventure'],
          duration: 140,
          director: 'Joaquim Dos Santos',
          cast: ['Shameik Moore', 'Hailee Steinfeld', 'Oscar Isaac'],
          language: 'en',
          imdbId: 'tt9362722',
          tmdbId: 569094,
        },
        availability: [
          {
            contentId: 'tt9362722',
            service: {
              id: 'netflix',
              name: 'Netflix',
              icon: 'https://images.justwatch.com/icon/207360008/s100/netflix.webp',
              type: 'subscription',
              price: 15.99,
              currency: 'USD',
            },
            country: {
              code: 'US',
              name: 'United States',
              flag: '🇺🇸',
            },
            available: true,
            quality: '4K',
            subtitles: ['en', 'es', 'fr'],
            audioLanguages: ['en', 'es'],
            purchaseType: 'subscription',
          },
        ],
        relevanceScore: 0.88,
        popularity: 90,
        userRating: 8.6,
        watchlistAdded: false,
      },
    ];

    // Filter results based on query - use more forgiving matching
    const searchTerms = query.query.toLowerCase().split(/\s+/).filter(term => term.length > 2);

    const filteredResults = mockResults.filter(result => {
      const titleLower = result.content.title.toLowerCase();
      const descLower = result.content.description?.toLowerCase() || '';
      const genresLower = result.content.genres?.map(g => g.toLowerCase()) || [];

      // Check if any search term matches
      return searchTerms.length === 0 || searchTerms.some(term =>
        titleLower.includes(term) ||
        descLower.includes(term) ||
        genresLower.some(genre => genre.includes(term))
      );
    });

    // If no matches found, return all mock results so user always sees something
    const resultsToReturn = filteredResults.length > 0 ? filteredResults : mockResults;

    return {
      results: resultsToReturn,
      pagination: {
        page: 1,
        totalPages: 1,
        totalResults: resultsToReturn.length,
        hasNextPage: false,
        hasPreviousPage: false,
        pageSize: 20,
      },
      queryTime,
    };
  }
}

// Export singleton instance
export const searchService = SearchService.getInstance();
