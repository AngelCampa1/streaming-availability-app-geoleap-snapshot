import { SearchService, SearchResponse } from './SearchService';
import { ApiService } from '../api/ApiService';
import { SearchResult } from '../../screens/SearchScreen';
import { logger } from '../../utils/logger';

export interface UnifiedSearchConfig {
  enableStreamingSearch: boolean;
  enableVpnSearch: boolean;
  searchTimeout: number;
  maxResults: number;
}

export class UnifiedSearchService {
  private static instance: UnifiedSearchService;
  private config: UnifiedSearchConfig;
  private searchService: SearchService;

  private constructor(config: Partial<UnifiedSearchConfig> = {}) {
    this.config = {
      enableStreamingSearch: true,
      enableVpnSearch: true,
      searchTimeout: 8000,
      maxResults: 20,
      ...config,
    };
    this.searchService = SearchService.getInstance();
  }

  public static getInstance(config?: Partial<UnifiedSearchConfig>): UnifiedSearchService {
    if (!UnifiedSearchService.instance) {
      UnifiedSearchService.instance = new UnifiedSearchService(config);
    }
    return UnifiedSearchService.instance;
  }

  /**
   * Perform unified search across streaming content and VPN servers/locations/features
   */
  public async performUnifiedSearch(query: string): Promise<{
    streamingResults: SearchResult[];
    vpnResults: SearchResult[];
    combinedResults: SearchResult[];
  }> {
    if (!query.trim()) {
      return {
        streamingResults: [],
        vpnResults: [],
        combinedResults: [],
      };
    }

    const searchPromises: Promise<any>[] = [];

    // Add streaming search if enabled
    if (this.config.enableStreamingSearch) {
      searchPromises.push(this.performStreamingSearch(query));
    }

    // Add VPN search if enabled
    if (this.config.enableVpnSearch) {
      searchPromises.push(this.performVpnSearch(query));
    }

    try {
      const results = await Promise.allSettled(searchPromises);

      const streamingResults: SearchResult[] = [];
      const vpnResults: SearchResult[] = [];

      // Process streaming results
      if (this.config.enableStreamingSearch && results[0]?.status === 'fulfilled') {
        const streamingData = results[0].value;
        streamingResults.push(...this.transformStreamingResults(streamingData));
      }

      // Process VPN results
      const vpnResultIndex = this.config.enableStreamingSearch ? 1 : 0;
      if (this.config.enableVpnSearch && results[vpnResultIndex]?.status === 'fulfilled') {
        const vpnData = results[vpnResultIndex].value;
        vpnResults.push(...this.transformVpnResults(vpnData));
      }

      // Combine and sort results by relevance score
      const combinedResults = [...streamingResults, ...vpnResults]
        .sort((a, b) => b.score - a.score)
        .slice(0, this.config.maxResults);

      return {
        streamingResults,
        vpnResults,
        combinedResults,
      };

    } catch (error) {
      logger.error('[UnifiedSearchService] Unified search failed', error);
      // Fallback to basic search
      return this.performBasicSearch(query);
    }
  }

  /**
   * Perform streaming content search
   */
  private async performStreamingSearch(query: string): Promise<SearchResponse> {
    try {
      return await this.searchService.search({ query });
    } catch (error) {
      logger.warn('[UnifiedSearchService] Streaming search failed', error);
      throw error;
    }
  }

  /**
   * Perform VPN-related search (servers, locations, features)
   */
  private async performVpnSearch(query: string): Promise<{
    servers: any[];
    locations: any[];
    features: any[];
  }> {
    try {
      const apiService = new ApiService();
      const [serversResponse, locationsResponse, featuresResponse] = await Promise.allSettled([
        apiService.get<any[]>(`/api/search/servers?q=${encodeURIComponent(query)}`),
        apiService.get<any[]>(`/api/search/locations?q=${encodeURIComponent(query)}`),
        apiService.get<any[]>(`/api/search/features?q=${encodeURIComponent(query)}`),
      ]);

      const servers = serversResponse.status === 'fulfilled' && serversResponse.value.success ? serversResponse.value.data || [] : [];
      const locations = locationsResponse.status === 'fulfilled' && locationsResponse.value.success ? locationsResponse.value.data || [] : [];
      const features = featuresResponse.status === 'fulfilled' && featuresResponse.value.success ? featuresResponse.value.data || [] : [];

      return { servers, locations, features };
    } catch (error) {
      logger.warn('[UnifiedSearchService] VPN search failed', error);
      throw error;
    }
  }

  /**
   * Transform streaming API results to mobile format
   */
  private transformStreamingResults(data: SearchResponse): SearchResult[] {
    return data.results.map((result) => ({
      id: `streaming-${result.content.id}`,
      title: result.content.title,
      description: result.content.description || 'No description available',
      type: 'content' as const,
      score: result.relevanceScore || 0.8,
    }));
  }

  /**
   * Transform VPN API results to mobile format
   */
  private transformVpnResults(vpnData: {
    servers: any[];
    locations: any[];
    features: any[];
  }): SearchResult[] {
    const results: SearchResult[] = [];

    // Transform server results
    vpnData.servers?.forEach((server: any) => {
      results.push({
        id: `server-${server.id}`,
        title: server.name || server.hostname,
        description: `${server.country} - ${server.city} | Load: ${server.load}%`,
        type: 'content' as const,
        score: this.calculateServerScore(server),
      });
    });

    // Transform location results
    vpnData.locations?.forEach((location: any) => {
      results.push({
        id: `location-${location.code}`,
        title: location.name,
        description: `${location.country} - ${location.serverCount} servers available`,
        type: 'content' as const,
        score: 0.85,
      });
    });

    // Transform feature results
    vpnData.features?.forEach((feature: any) => {
      results.push({
        id: `feature-${feature.id}`,
        title: feature.name,
        description: feature.description,
        type: 'content' as const,
        score: 0.75,
      });
    });

    return results;
  }

  /**
   * Calculate relevance score for VPN servers
   */
  private calculateServerScore(server: any): number {
    let score = 0.5; // Base score

    // Factor in server load (lower is better)
    if (server.load !== undefined) {
      score += (100 - server.load) / 200; // 0-0.5 points
    }

    // Factor in ping (lower is better)
    if (server.ping !== undefined) {
      score += Math.max(0, (200 - server.ping) / 400); // 0-0.5 points
    }

    // Factor in server type/premium status
    if (server.type === 'premium') {
      score += 0.2;
    }

    // Factor in recommended status
    if (server.recommended) {
      score += 0.3;
    }

    return Math.min(1.0, score);
  }

  /**
   * Fallback basic search for offline/error scenarios
   */
  private performBasicSearch(query: string): {
    streamingResults: SearchResult[];
    vpnResults: SearchResult[];
    combinedResults: SearchResult[];
  } {
    const queryLower = query.toLowerCase();
    const searchTerms = queryLower.split(/\s+/).filter(term => term.length > 2);

    // Mock streaming content results for fallback
    const basicStreamingResults: SearchResult[] = [
      {
        id: 'streaming-stranger-things',
        title: 'Stranger Things',
        description: 'A supernatural mystery series set in the 1980s',
        type: 'show' as const,
        score: 0.95,
        year: 2016,
        rating: 8.7,
        streamingServices: ['Netflix'],
        genres: ['Drama', 'Fantasy', 'Horror'],
      },
      {
        id: 'streaming-last-of-us',
        title: 'The Last of Us',
        description: 'Post-apocalyptic drama based on the video game',
        type: 'show' as const,
        score: 0.93,
        year: 2023,
        rating: 8.8,
        streamingServices: ['Max'],
        genres: ['Drama', 'Action', 'Horror'],
      },
      {
        id: 'streaming-oppenheimer',
        title: 'Oppenheimer',
        description: 'The story of the atomic bomb development',
        type: 'movie' as const,
        score: 0.90,
        year: 2023,
        rating: 8.5,
        streamingServices: ['Peacock'],
        genres: ['Drama', 'History', 'Thriller'],
      },
      {
        id: 'streaming-spider-verse',
        title: 'Spider-Man: Across the Spider-Verse',
        description: 'Animated multiverse adventure',
        type: 'movie' as const,
        score: 0.88,
        year: 2023,
        rating: 8.6,
        streamingServices: ['Netflix'],
        genres: ['Animation', 'Action', 'Adventure'],
      },
    ];

    const basicVpnResults: SearchResult[] = [
      {
        id: 'server-us-east',
        title: 'US East Server',
        description: 'High-speed server in New York',
        type: 'content' as const,
        score: 0.85,
      },
      {
        id: 'server-uk-london',
        title: 'UK London Server',
        description: 'Optimized for streaming in London',
        type: 'content' as const,
        score: 0.82,
      },
    ];

    // Filter with forgiving matching
    const filterResults = (results: SearchResult[]) => {
      if (searchTerms.length === 0) return results;

      const filtered = results.filter(result =>
        searchTerms.some(term =>
          result.title.toLowerCase().includes(term) ||
          result.description.toLowerCase().includes(term) ||
          result.genres?.some(g => g.toLowerCase().includes(term))
        )
      );

      // Return all results if nothing matches specifically
      return filtered.length > 0 ? filtered : results;
    };

    const filteredStreaming = filterResults(basicStreamingResults);
    const filteredVpn = filterResults(basicVpnResults);

    const combinedResults = [...filteredStreaming, ...filteredVpn]
      .sort((a, b) => b.score - a.score);

    return {
      streamingResults: filteredStreaming,
      vpnResults: filteredVpn,
      combinedResults,
    };
  }

  /**
   * Get search suggestions
   */
  public async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    try {
      const apiService = new ApiService();
      const streamingSuggestions = await this.searchService.getSuggestions(query, Math.ceil(limit / 2));
      const vpnSuggestionsResponse = await apiService.get<string[]>(
        `/api/search/suggestions?q=${encodeURIComponent(query)}&limit=${Math.floor(limit / 2)}`,
      );

      const vpnSuggestions = vpnSuggestionsResponse.success && vpnSuggestionsResponse.data ? vpnSuggestionsResponse.data : [];

      const combinedSuggestions = [
        ...streamingSuggestions.map(s => s.text),
        ...vpnSuggestions,
      ].slice(0, limit);

      return combinedSuggestions;
    } catch (error) {
      logger.warn('[UnifiedSearchService] Search suggestions failed', error);
      return [];
    }
  }

  /**
   * Get popular searches
   */
  public async getPopularSearches(limit: number = 10): Promise<string[]> {
    try {
      const apiService = new ApiService();
      const streamingPopular = await this.searchService.getPopularSearches(Math.ceil(limit / 2));
      const vpnPopularResponse = await apiService.get<string[]>(
        `/api/search/popular?limit=${Math.floor(limit / 2)}`,
      );

      const vpnPopular = vpnPopularResponse.success && vpnPopularResponse.data ? vpnPopularResponse.data : [];

      const combinedPopular = [
        ...streamingPopular.map(p => p.query),
        ...vpnPopular,
      ].slice(0, limit);

      return combinedPopular;
    } catch (error) {
      logger.warn('[UnifiedSearchService] Popular searches failed', error);
      return [
        'Stranger Things',
        'The Last of Us',
        'US Servers',
        'Netflix',
        'UK Servers',
        'Wednesday',
        'Gaming VPN',
        'Marvel Movies',
      ].slice(0, limit);
    }
  }

  /**
   * Clear search cache
   */
  public clearCache(): void {
    this.searchService.clearCache();
  }

  /**
   * Get service statistics
   */
  public getStats(): {
    streamingCache: { size: number; totalMemoryUsage: number };
    config: UnifiedSearchConfig;
  } {
    return {
      streamingCache: this.searchService.getCacheStats(),
      config: this.config,
    };
  }
}

// Export singleton instance
export const unifiedSearchService = UnifiedSearchService.getInstance();
