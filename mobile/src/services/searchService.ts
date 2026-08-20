import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './api/ApiService';
import { endpoints } from '../config/api';
import { logger } from '../utils/logger';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'server' | 'location' | 'feature';
  score: number;
  metadata?: Record<string, any>;
}

export interface SearchQuery {
  query: string;
  filters?: {
    type?: string[];
    minScore?: number;
    limit?: number;
  };
  sortBy?: 'relevance' | 'alphabetical' | 'score';
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'history' | 'autocomplete' | 'trending';
  count?: number;
}

export interface SearchServiceConfig {
  maxHistoryItems: number;
  cacheTimeout: number;
  enableAnalytics: boolean;
  apiEndpoint?: string;
}

export class SearchService {
  private static instance: SearchService;
  private config: SearchServiceConfig;
  private cache: Map<string, { results: SearchResult[]; timestamp: number }>;
  private searchHistory: SearchHistory[];

  private constructor(config: Partial<SearchServiceConfig> = {}) {
    this.config = {
      maxHistoryItems: 50,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      enableAnalytics: true,
      ...config,
    };
    this.cache = new Map();
    this.searchHistory = [];
    this.loadSearchHistory();
  }

  public static getInstance(config?: Partial<SearchServiceConfig>): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService(config);
    }
    return SearchService.instance;
  }

  /**
   * Perform a search with the given query and filters
   */
  public async search(searchQuery: SearchQuery): Promise<SearchResult[]> {
    try {
      logger.info('Performing search:', { query: searchQuery.query, filters: searchQuery.filters });

      const cacheKey = this.generateCacheKey(searchQuery);

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
        logger.debug('Returning cached search results for:', searchQuery.query);
        return cached.results;
      }

      // Perform search via API
      const results = await this.performSearch(searchQuery);

      // Cache results
      this.cache.set(cacheKey, {
        results,
        timestamp: Date.now(),
      });

      // Add to search history
      await this.addToSearchHistory(searchQuery.query, results.length);

      logger.info('Search completed:', { query: searchQuery.query, resultCount: results.length });
      return results;
    } catch (error: any) {
      logger.error('Search failed:', { query: searchQuery.query, error: error.message });

      // Return cached results if available on error
      const cacheKey = this.generateCacheKey(searchQuery);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.info('Returning stale cached results due to search error');
        return cached.results;
      }

      throw new Error(error instanceof Error ? error.message : 'Search failed');
    }
  }

  /**
   * Get search suggestions based on input
   */
  public async getSuggestions(input: string): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    if (!input || input.length < 2) {
      return this.getTrendingSuggestions();
    }

    try {
      logger.debug('Getting search suggestions for:', input);

      // Get autocomplete suggestions from API
      const response = await ApiService.get<{ suggestions: string[]; trending: string[] }>(
        `${endpoints.streaming.search}/suggest`,
        {
          params: { q: input, limit: 10 },
          cacheTTL: 60000, // 1 minute cache for suggestions
        },
      );

      if (response.success && response.data) {
        const autocompleteSuggestions = response.data.suggestions.map((suggestion, index) => ({
          id: `autocomplete-${index}`,
          text: suggestion,
          type: 'autocomplete' as const,
        }));

        suggestions.push(...autocompleteSuggestions);
      }

      // Get history-based suggestions
      const historySuggestions = this.searchHistory
        .filter(item => item.query.toLowerCase().includes(input.toLowerCase()))
        .slice(0, 5)
        .map(item => ({
          id: `history-${item.id}`,
          text: item.query,
          type: 'history' as const,
          count: item.resultCount,
        }));

      suggestions.push(...historySuggestions);

      logger.debug('Generated suggestions:', { count: suggestions.length });
      return suggestions;

    } catch (error: any) {
      logger.error('Failed to get suggestions:', error);

      // Fallback to history-based suggestions
      const historySuggestions = this.searchHistory
        .filter(item => item.query.toLowerCase().includes(input.toLowerCase()))
        .slice(0, 5)
        .map(item => ({
          id: `history-${item.id}`,
          text: item.query,
          type: 'history' as const,
          count: item.resultCount,
        }));

      return historySuggestions;
    }
  }

  /**
   * Get search history
   */
  public async getSearchHistory(): Promise<SearchHistory[]> {
    return [...this.searchHistory].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear search history
   */
  public async clearSearchHistory(): Promise<void> {
    this.searchHistory = [];
    await AsyncStorage.removeItem('search_history');
  }

  /**
   * Remove specific item from search history
   */
  public async removeFromSearchHistory(id: string): Promise<void> {
    this.searchHistory = this.searchHistory.filter(item => item.id !== id);
    await this.saveSearchHistory();
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
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  private async performSearch(searchQuery: SearchQuery): Promise<SearchResult[]> {
    // Handle empty query
    if (!searchQuery.query || !searchQuery.query.trim()) {
      return [];
    }

    try {
      logger.debug('Calling search API:', { query: searchQuery.query, filters: searchQuery.filters });

      const response = await ApiService.get<{ results: SearchResult[]; total: number }>(
        endpoints.streaming.search,
        {
          params: {
            q: searchQuery.query,
            types: searchQuery.filters?.type?.join(','),
            minScore: searchQuery.filters?.minScore,
            limit: searchQuery.filters?.limit || 20,
            sortBy: searchQuery.sortBy || 'relevance',
          },
          cacheTTL: this.config.cacheTimeout,
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Search API failed');
      }

      logger.debug('Search API response:', { resultCount: response.data.results.length });
      return response.data.results;

    } catch (error: any) {
      logger.error('Search API call failed:', error);

      // Fallback to mock data for demo purposes
      logger.warn('Falling back to mock search results');
      return this.getMockSearchResults(searchQuery);
    }
  }

  /**
   * Get mock search results for fallback/demo purposes
   */
  private getMockSearchResults(searchQuery: SearchQuery): SearchResult[] {
    const mockResults: SearchResult[] = [
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
        title: 'Tokyo Server',
        description: 'Fast Asia-Pacific server in Tokyo',
        type: 'server',
        score: 0.82,
        metadata: { location: 'Tokyo', country: 'JP', ping: 45 },
      },
      {
        id: '4',
        title: 'Kill Switch',
        description: 'Automatic connection protection feature',
        type: 'feature',
        score: 0.76,
        metadata: { category: 'security', available: true },
      },
      {
        id: '5',
        title: 'Split Tunneling',
        description: 'Route specific apps through VPN',
        type: 'feature',
        score: 0.71,
        metadata: { category: 'advanced', available: true },
      },
      {
        id: '6',
        title: 'United States',
        description: 'Multiple server locations in the US',
        type: 'location',
        score: 0.90,
        metadata: { serverCount: 50, country: 'US' },
      },
    ];

    // Filter by query
    let filteredResults = mockResults.filter(result => {
      const queryLower = searchQuery.query.toLowerCase();
      return (
        result.title.toLowerCase().includes(queryLower) ||
        result.description.toLowerCase().includes(queryLower) ||
        (result.metadata &&
         Object.values(result.metadata).some(value =>
           String(value).toLowerCase().includes(queryLower),
         ))
      );
    });

    // Apply filters
    if (searchQuery.filters?.type) {
      filteredResults = filteredResults.filter(result =>
        searchQuery.filters!.type!.includes(result.type),
      );
    }

    if (searchQuery.filters?.minScore) {
      filteredResults = filteredResults.filter(result =>
        result.score >= searchQuery.filters!.minScore!,
      );
    }

    // Sort results
    switch (searchQuery.sortBy) {
      case 'alphabetical':
        filteredResults.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'score':
        filteredResults.sort((a, b) => b.score - a.score);
        break;
      case 'relevance':
      default:
        // Results are already ordered by relevance
        break;
    }

    // Apply limit
    if (searchQuery.filters?.limit) {
      filteredResults = filteredResults.slice(0, searchQuery.filters.limit);
    }

    return filteredResults;
  }

  private async getAutocompleteSuggestions(input: string): Promise<SearchSuggestion[]> {
    // Mock autocomplete suggestions
    const suggestions = [
      'server',
      'location',
      'feature',
      'united states',
      'united kingdom',
      'kill switch',
      'split tunneling',
      'streaming',
      'security',
      'speed test',
    ];

    return suggestions
      .filter(suggestion => suggestion.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 5)
      .map((suggestion, index) => ({
        id: `autocomplete-${index}`,
        text: suggestion,
        type: 'autocomplete' as const,
      }));
  }

  private getTrendingSuggestions(): SearchSuggestion[] {
    // Mock trending suggestions
    return [
      {
        id: 'trending-1',
        text: 'fastest servers',
        type: 'trending',
      },
      {
        id: 'trending-2',
        text: 'streaming servers',
        type: 'trending',
      },
      {
        id: 'trending-3',
        text: 'kill switch',
        type: 'trending',
      },
    ];
  }

  private generateCacheKey(searchQuery: SearchQuery): string {
    return JSON.stringify(searchQuery);
  }

  private async addToSearchHistory(query: string, resultCount: number): Promise<void> {
    if (!query.trim()) {return;}

    // Remove existing entry with same query
    this.searchHistory = this.searchHistory.filter(item => item.query !== query);

    // Add new entry
    const historyItem: SearchHistory = {
      id: Date.now().toString(),
      query,
      timestamp: Date.now(),
      resultCount,
    };

    this.searchHistory.unshift(historyItem);

    // Limit history size
    if (this.searchHistory.length > this.config.maxHistoryItems) {
      this.searchHistory = this.searchHistory.slice(0, this.config.maxHistoryItems);
    }

    await this.saveSearchHistory();
  }

  private async loadSearchHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('search_history');
      if (stored) {
        this.searchHistory = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('[SearchService] Failed to load search history', error);
      this.searchHistory = [];
    }
  }

  private async saveSearchHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem('search_history', JSON.stringify(this.searchHistory));
    } catch (error) {
      logger.error('[SearchService] Failed to save search history', error);
    }
  }
}

// Export singleton instance
export const searchService = SearchService.getInstance();
