/**
 * Streaming Service - Backend API Integration
 * Routes all streaming availability requests through the GeoLeap backend
 * This keeps API keys server-side and provides a consistent interface
 */

import apiService from '../api/ApiService';
import {
  StreamingContent,
  StreamingAvailability as StreamingAvailabilityType,
  SearchResult,
  SearchFilters,
  SearchSuggestion,
  SearchResponse,
  PaginationInfo,
  StreamingService,
  Country,
} from '../../types/streaming';
import { logger as loggerImport } from '../../utils/logger';

// Safe logger wrapper that handles undefined cases in test environments
const logger = {
  debug: (...args: unknown[]) => loggerImport && typeof loggerImport.debug === 'function' ? loggerImport.debug(...(args as [any, ...any[]])) : undefined,
  info: (...args: unknown[]) => loggerImport && typeof loggerImport.info === 'function' ? loggerImport.info(...(args as [any, ...any[]])) : undefined,
  warn: (...args: unknown[]) => loggerImport && typeof loggerImport.warn === 'function' ? loggerImport.warn(...(args as [any, ...any[]])) : undefined,
  error: (...args: unknown[]) => loggerImport && typeof loggerImport.error === 'function' ? loggerImport.error(...(args as [any, ...any[]])) : console.error(...args),
};

/**
 * Extract poster URL from imageSet with fallback to different sizes
 */
const extractPosterUrl = (imageSet: any): string | undefined => {
  if (!imageSet) {return undefined;}

  // Try vertical poster first (standard movie poster format)
  const verticalPoster = imageSet.verticalPoster;
  if (verticalPoster) {
    // Prefer w480 for good quality on mobile, fallback to other sizes
    return verticalPoster.w480 || verticalPoster.w360 || verticalPoster.w600 || verticalPoster.w240 || verticalPoster.w720;
  }

  // Fallback to horizontal poster if vertical not available
  const horizontalPoster = imageSet.horizontalPoster;
  if (horizontalPoster) {
    return horizontalPoster.w480 || horizontalPoster.w360 || horizontalPoster.w720 || horizontalPoster.w1080 || horizontalPoster.w1440;
  }

  return undefined;
};

/**
 * Extract backdrop URL from imageSet with fallback to different sizes
 */
const extractBackdropUrl = (imageSet: any): string | undefined => {
  if (!imageSet) {return undefined;}

  // Try horizontal backdrop first (standard backdrop format)
  const horizontalBackdrop = imageSet.horizontalBackdrop;
  if (horizontalBackdrop) {
    // Prefer larger size for backdrop
    return horizontalBackdrop.w1080 || horizontalBackdrop.w720 || horizontalBackdrop.w1440 || horizontalBackdrop.w480 || horizontalBackdrop.w360;
  }

  // Fallback to horizontal poster if no backdrop available
  const horizontalPoster = imageSet.horizontalPoster;
  if (horizontalPoster) {
    return horizontalPoster.w1080 || horizontalPoster.w720 || horizontalPoster.w1440 || horizontalPoster.w480;
  }

  return undefined;
};

/**
 * Convert streaming-availability API response to our internal SearchResult format
 */
const convertToSearchResult = (item: any): SearchResult => {
  // Extract poster and backdrop from imageSet structure (streaming-availability API v4 format)
  const posterUrl = item.poster || extractPosterUrl(item.imageSet);
  const backdropUrl = item.backdrop || extractBackdropUrl(item.imageSet);

  // Map genres from API format (array of {id, name} objects) to string array
  const genreNames = item.genres?.map((g: any) => typeof g === 'string' ? g : g.name).filter(Boolean) || [];

  const content: StreamingContent = {
    id: item.id || item.imdbId,
    title: item.title,
    description: item.overview || item.description,
    type: item.showType || item.type || 'movie',
    poster: posterUrl,
    backdrop: backdropUrl,
    releaseYear: item.firstAirYear || item.releaseYear || item.year,
    rating: item.rating || item.voteAverage || item.imdbRating || item.tmdbRating,
    genres: genreNames,
    duration: item.runtime,
    seasons: item.seasonCount || item.seasons,
    episodeCount: item.episodeCount,
    director: item.directors?.[0] || item.director,
    cast: item.cast,
    language: item.originalLanguage,
    imdbId: item.imdbId,
    tmdbId: item.tmdbId,
  };

  const availability: StreamingAvailabilityType[] = [];

  // Convert streaming options to our availability format
  if (item.streamingInfo) {
    Object.entries(item.streamingInfo).forEach(([country, services]: [string, any]) => {
      Object.values(services).forEach((service: any) => {
        if (service.streamingService) {
          availability.push({
            contentId: content.id,
            service: {
              id: service.streamingService.id,
              name: service.streamingService.name,
              icon: service.streamingService.image,
              type: getServiceType(service.streamingService.type),
              baseUrl: service.streamingService.homePage,
              supportedCountries: [country],
              price: service.price?.amount,
              currency: service.price?.currency,
            } as StreamingService,
            country: {
              code: country.toUpperCase(),
              name: getCountryName(country.toUpperCase()),
              flag: getCountryFlag(country.toUpperCase()),
            } as Country,
            available: true,
            quality: getQualityFromFormats(service.formats)?.[0] || 'HD',
            subtitles: service.subtitles,
            audioLanguages: service.audioLanguages,
            price: service.price?.amount,
            currency: service.price?.currency,
            purchaseType: getPurchaseType(service.type),
            addedDate: service.addedAt ? new Date(service.addedAt) : undefined,
            leavingDate: service.leavingAt ? new Date(service.leavingAt) : undefined,
          });
        }
      });
    });
  }

  // Also handle streamingOptions array format from backend
  if (item.streamingOptions && Array.isArray(item.streamingOptions)) {
    item.streamingOptions.forEach((option: any) => {
      availability.push({
        contentId: content.id,
        service: {
          id: option.serviceId,
          name: option.serviceName,
          icon: option.serviceLogoUrl,
          type: getServiceType(option.type),
          price: option.price,
          currency: option.currency,
        } as StreamingService,
        country: {
          code: 'US',
          name: 'United States',
          flag: '🇺🇸',
        } as Country,
        available: true,
        quality: option.quality?.[0] || 'HD',
        subtitles: option.subtitleLanguages,
        audioLanguages: option.audioLanguages,
        price: option.price,
        currency: option.currency,
        purchaseType: option.type,
      });
    });
  }

  return {
    content,
    availability,
    relevanceScore: calculateRelevanceScore(item),
    popularity: item.popularity,
    userRating: item.voteAverage || item.imdbRating,
    watchlistAdded: false, // This would be determined by user data
  };
};

/**
 * Get service type from streaming service type
 */
const getServiceType = (type: string): StreamingService['type'] => {
  switch (type?.toLowerCase()) {
    case 'subscription':
    case 'flatrate':
      return 'subscription';
    case 'rent':
    case 'rental':
      return 'rental';
    case 'buy':
    case 'purchase':
      return 'purchase';
    case 'free':
      return 'free';
    case 'tv':
      return 'tv';
    case 'ads':
      return 'free';
    default:
      return 'subscription';
  }
};

/**
 * Get purchase type from service type
 */
const getPurchaseType = (type: string): StreamingAvailabilityType['purchaseType'] => {
  switch (type?.toLowerCase()) {
    case 'subscription':
    case 'flatrate':
      return 'subscription';
    case 'rent':
    case 'rental':
      return 'rental';
    case 'buy':
    case 'purchase':
      return 'purchase';
    case 'free':
    case 'ads':
      return 'free';
    default:
      return 'subscription';
  }
};

/**
 * Get quality options from formats
 */
const getQualityFromFormats = (formats: string[]): ('SD' | 'HD' | '4K')[] => {
  const qualities: ('SD' | 'HD' | '4K')[] = [];

  if (formats) {
    if (formats.includes('sd')) {qualities.push('SD');}
    if (formats.includes('hd')) {qualities.push('HD');}
    if (formats.includes('4k')) {qualities.push('4K');}
  }

  return qualities.length > 0 ? qualities : ['HD']; // Default to HD
};

/**
 * Get country name from code
 */
const getCountryName = (code: string): string => {
  const countryNames: Record<string, string> = {
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain',
    'JP': 'Japan',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'IN': 'India',
  };

  return countryNames[code] || code;
};

/**
 * Get country flag emoji from code
 */
const getCountryFlag = (code: string): string => {
  const flagMap: Record<string, string> = {
    'US': '🇺🇸',
    'GB': '🇬🇧',
    'CA': '🇨🇦',
    'AU': '🇦🇺',
    'DE': '🇩🇪',
    'FR': '🇫🇷',
    'IT': '🇮🇹',
    'ES': '🇪🇸',
    'JP': '🇯🇵',
    'BR': '🇧🇷',
    'MX': '🇲🇽',
    'IN': '🇮🇳',
  };

  return flagMap[code] || '🌍';
};

/**
 * Calculate relevance score based on multiple factors
 */
const calculateRelevanceScore = (item: any): number => {
  let score = 0.5; // Base score

  // Boost for popularity
  if (item.popularity) {
    score += Math.min(item.popularity / 100, 0.3);
  }

  // Boost for rating
  const rating = item.voteAverage || item.imdbRating || item.tmdbRating;
  if (rating) {
    score += (rating / 10) * 0.2;
  }

  // Boost for recent releases
  const currentYear = new Date().getFullYear();
  const releaseYear = item.firstAirYear || item.releaseYear || item.year;
  if (releaseYear && currentYear - releaseYear <= 2) {
    score += 0.1;
  }

  return Math.min(score, 1.0);
};

/**
 * Search for streaming content using the backend API
 */
export const searchContent = async (
  query: string,
  filters: SearchFilters = {},
  page: number = 1,
  pageSize: number = 20,
): Promise<SearchResponse> => {
  const startTime = Date.now();

  try {
    // Build query parameters for backend
    const params: Record<string, any> = {
      query: query.trim(),
      limit: pageSize,
      country: filters.countries?.[0] || 'us',
    };

    // Add filters
    if (filters.type?.length) {
      params.type = filters.type[0] === 'tv' ? 'series' : filters.type[0];
    }

    if (filters.yearRange?.min) {
      params.year = filters.yearRange.min;
    }

    logger.info('Searching content via backend:', { query, params });

    // Call backend API
    const response = await apiService.get<{
      results: any[];
      total: number;
    }>('/api/streaming-availability/search', { params, skipAuth: true });

    if (!response.success || !response.data) {
      logger.warn('Backend search returned no results, using fallback');
      return getMockSearchResponse(query, filters, page, pageSize, Date.now() - startTime);
    }

    // Convert results
    const results = response.data.results?.map(convertToSearchResult) || [];
    const total = response.data.total || results.length;

    // Build pagination
    const pagination: PaginationInfo = {
      page,
      totalPages: Math.ceil(total / pageSize),
      totalResults: total,
      hasNextPage: (page * pageSize) < total,
      hasPreviousPage: page > 1,
      pageSize,
    };

    const queryTime = Date.now() - startTime;

    logger.info('Streaming search completed:', {
      query,
      resultCount: results.length,
      queryTime,
    });

    return {
      results,
      pagination,
      queryTime,
    };

  } catch (error: any) {
    logger.error('Streaming search failed:', error);
    // Fallback to mock data on error
    return getMockSearchResponse(query, filters, page, pageSize, Date.now() - startTime);
  }
};

/**
 * Get detailed information about specific content
 */
export const getContentDetails = async (contentId: string, country: string = 'us'): Promise<SearchResult | null> => {
  try {
    const params = {
      id: contentId,
      country,
    };

    logger.info('Getting content details via backend:', { contentId, country });

    const response = await apiService.get<any>('/api/streaming-availability/by-id', { params, skipAuth: true });

    if (!response.success || !response.data) {
      // Return mock data when backend request fails
      const mockResponse = getMockSearchResponse('', {}, 1, 1, 0);
      return mockResponse.results.find(r => r.content.id === contentId) || null;
    }

    return convertToSearchResult(response.data);

  } catch (error: any) {
    logger.error('Failed to get content details:', error);
    return null;
  }
};

/**
 * Get content recommendations
 */
export const getRecommendations = async (
  contentId: string,
  country: string = 'us',
  limit: number = 10,
): Promise<SearchResult[]> => {
  try {
    const params = {
      id: contentId,
      country,
      limit,
    };

    logger.info('Getting recommendations via backend:', { contentId, country, limit });

    const response = await apiService.get<{
      results: any[];
    }>('/api/content/recommendations', { params, skipAuth: true });

    if (!response.success || !response.data?.results) {
      return getMockRecommendations(limit);
    }

    return response.data.results.map(convertToSearchResult);

  } catch (error: any) {
    logger.error('Failed to get recommendations:', error);
    return getMockRecommendations(limit);
  }
};

/**
 * Get popular/trending content
 */
export const getPopularContent = async (
  type: 'movie' | 'tv' | 'all' = 'all',
  country: string = 'us',
  limit: number = 20,
): Promise<SearchResult[]> => {
  try {
    const params: Record<string, any> = {
      country,
      limit,
    };

    if (type !== 'all') {
      params.type = type === 'tv' ? 'series' : type;
    }

    logger.info('Getting popular content via backend:', { type, country, limit });

    const response = await apiService.get<{
      results: any[];
    }>('/api/content/popular', { params, skipAuth: true });

    if (!response.success || !response.data?.results) {
      return getMockPopularContent(type, limit);
    }

    return response.data.results.map(convertToSearchResult);

  } catch (error: any) {
    logger.error('Failed to get popular content:', error);
    return getMockPopularContent(type, limit);
  }
};

/**
 * Get search suggestions
 */
export const getSearchSuggestions = async (
  query: string,
  limit: number = 10,
): Promise<SearchSuggestion[]> => {
  if (query.length < 2) {
    return [];
  }

  try {
    const params = {
      query,
      limit,
    };

    logger.info('Getting search suggestions via backend:', { query, limit });

    const response = await apiService.get<{
      suggestions: any[];
    }>('/api/content/suggestions', { params, skipAuth: true });

    if (!response.success || !response.data?.suggestions) {
      return getMockSearchSuggestions(query, limit);
    }

    return response.data.suggestions.map((item: any, index: number) => ({
      id: `suggestion-${index}`,
      text: item.title || item.name,
      type: item.type === 'movie' ? 'content' :
            item.type === 'series' ? 'content' :
            item.type || 'content',
      category: item.type,
      image: item.poster || item.posterPath,
    }));

  } catch (error: any) {
    logger.error('Failed to get search suggestions:', error);
    return getMockSearchSuggestions(query, limit);
  }
};

/**
 * Search content by title with streaming availability
 */
export const searchByTitle = async (
  title: string,
  year?: number,
  type?: 'movie' | 'series',
  country: string = 'us',
): Promise<SearchResult[]> => {
  try {
    const params: Record<string, any> = {
      title,
      country,
    };

    if (year) {
      params.year = year;
    }

    if (type) {
      // Type is already 'movie' or 'series', no conversion needed
      params.type = type;
    }

    logger.info('Searching by title via backend:', { title, year, type, country });

    const response = await apiService.get<{
      results: any[];
    }>('/api/streaming-availability/search/by-title', { params, skipAuth: true });

    if (!response.success || !response.data?.results) {
      return [];
    }

    return response.data.results.map(convertToSearchResult);

  } catch (error: any) {
    logger.error('Failed to search by title:', error);
    return [];
  }
};

// Mock data functions for fallback

const getMockSearchResponse = (
  query: string,
  filters: SearchFilters,
  page: number,
  pageSize: number,
  queryTime: number,
): SearchResponse => {
  const mockResults = getMockPopularContent('all', 50);

  // Filter by query
  let filteredResults = mockResults.filter(result =>
    result.content.title.toLowerCase().includes(query.toLowerCase()) ||
    result.content.description?.toLowerCase().includes(query.toLowerCase()) ||
    result.content.genres?.some(genre => genre.toLowerCase().includes(query.toLowerCase())),
  );

  // Apply filters
  if (filters.type?.length) {
    filteredResults = filteredResults.filter(result =>
      filters.type!.includes(result.content.type as any),
    );
  }

  if (filters.genres?.length) {
    filteredResults = filteredResults.filter(result =>
      result.content.genres?.some(genre => filters.genres!.includes(genre)),
    );
  }

  if (filters.yearRange?.min) {
    filteredResults = filteredResults.filter(result =>
      result.content.releaseYear && result.content.releaseYear >= filters.yearRange!.min!,
    );
  }

  if (filters.yearRange?.max) {
    filteredResults = filteredResults.filter(result =>
      result.content.releaseYear && result.content.releaseYear <= filters.yearRange!.max!,
    );
  }

  // Pagination
  const startIndex = (page - 1) * pageSize;
  const paginatedResults = filteredResults.slice(startIndex, startIndex + pageSize);

  return {
    results: paginatedResults,
    pagination: {
      page,
      totalPages: Math.ceil(filteredResults.length / pageSize),
      totalResults: filteredResults.length,
      hasNextPage: startIndex + pageSize < filteredResults.length,
      hasPreviousPage: page > 1,
      pageSize,
    },
    queryTime,
  };
};

const getMockRecommendations = (limit: number): SearchResult[] => {
  return getMockPopularContent('all', limit);
};

const getMockPopularContent = (type: 'movie' | 'tv' | 'all', limit: number): SearchResult[] => {
  // Use real TMDB image URLs for mock data (these are actual working poster URLs)
  const mockContent = [
    {
      id: 'tt15398776',
      title: 'Oppenheimer',
      description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
      type: 'movie' as const,
      poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      backdrop: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
      releaseYear: 2023,
      rating: 8.5,
      genres: ['Drama', 'History', 'Thriller'],
      imdbId: 'tt15398776',
      tmdbId: 872585,
      duration: 180,
    },
    {
      id: 'tt0944947',
      title: 'Game of Thrones',
      description: 'Nine noble families fight for control over the lands of Westeros.',
      type: 'tv' as const,
      poster: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
      backdrop: 'https://image.tmdb.org/t/p/w1280/suopoADq0k8YZr4dQXcU6pToj6s.jpg',
      releaseYear: 2011,
      rating: 9.2,
      genres: ['Action', 'Adventure', 'Drama'],
      seasons: 8,
      language: 'en',
      imdbId: 'tt0944947',
      tmdbId: 1399,
    },
    {
      id: 'tt1856010',
      title: 'House of Cards',
      description: 'A Congressman works with his equally conniving wife to exact revenge on the people who betrayed him.',
      type: 'tv' as const,
      poster: 'https://image.tmdb.org/t/p/w500/hKWxWjFwnMvkWQawbhvC0Y7ygQ8.jpg',
      backdrop: 'https://image.tmdb.org/t/p/w1280/kxk1kpsmZkV4LzgnFw4J7xAkAJG.jpg',
      releaseYear: 2013,
      rating: 8.8,
      genres: ['Drama'],
      seasons: 6,
      language: 'en',
      imdbId: 'tt1856010',
      tmdbId: 1425,
    },
    {
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
      language: 'en',
      imdbId: 'tt4574334',
      tmdbId: 66732,
    },
    {
      id: 'tt1190634',
      title: 'The Boys',
      description: 'A group of vigilantes set out to take down corrupt superheroes who abuse their superpowers.',
      type: 'tv' as const,
      poster: 'https://image.tmdb.org/t/p/w500/stTEycfG9928HYGEISBFaG1ngjM.jpg',
      backdrop: 'https://image.tmdb.org/t/p/w1280/7cqKGQMnNabzOpi7qaIgZvQ7NGV.jpg',
      releaseYear: 2019,
      rating: 8.7,
      genres: ['Action', 'Comedy', 'Drama'],
      seasons: 4,
      language: 'en',
      imdbId: 'tt1190634',
      tmdbId: 76479,
    },
    {
      id: 'tt9362722',
      title: 'Spider-Man: Across the Spider-Verse',
      description: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People.',
      type: 'movie' as const,
      poster: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
      backdrop: 'https://image.tmdb.org/t/p/w1280/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg',
      releaseYear: 2023,
      rating: 8.6,
      genres: ['Animation', 'Action', 'Adventure'],
      duration: 140,
      imdbId: 'tt9362722',
      tmdbId: 569094,
    },
    {
      id: 'tt2906216',
      title: 'Dune',
      description: 'Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding.',
      type: 'movie' as const,
      poster: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
      backdrop: 'https://image.tmdb.org/t/p/w1280/lzWHmYdfeFiMIY4JaMmtR7GEli3.jpg',
      releaseYear: 2021,
      rating: 8.0,
      genres: ['Science Fiction', 'Adventure', 'Drama'],
      duration: 155,
      imdbId: 'tt1160419',
      tmdbId: 438631,
    },
    {
      id: 'tt8111088',
      title: 'The Mandalorian',
      description: 'The travels of a lone bounty hunter in the outer reaches of the galaxy.',
      type: 'tv' as const,
      poster: 'https://image.tmdb.org/t/p/w500/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg',
      backdrop: 'https://image.tmdb.org/t/p/w1280/9ijMGlJKqcslswWUzTEwScm82Gs.jpg',
      releaseYear: 2019,
      rating: 8.7,
      genres: ['Action', 'Adventure', 'Science Fiction'],
      seasons: 3,
      language: 'en',
      imdbId: 'tt8111088',
      tmdbId: 82856,
    },
  ];

  const filteredContent = type === 'all' ? mockContent : mockContent.filter(item => item.type === type);

  return filteredContent.slice(0, limit).map(content => ({
    content,
    availability: [
      {
        contentId: content.id,
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
          flag: '🇺🇸',
        },
        available: true,
        quality: '4K' as const,
        subtitles: ['en', 'es', 'fr'],
        audioLanguages: ['en'],
        purchaseType: 'subscription' as const,
      },
    ],
    relevanceScore: 0.9,
    popularity: 95,
    userRating: content.rating,
    watchlistAdded: false,
  }));
};

const getMockSearchSuggestions = (query: string, limit: number): SearchSuggestion[] => {
  const suggestions = [
    'Stranger Things',
    'Game of Thrones',
    'The Last of Us',
    'House of Cards',
    'Wednesday',
    'The Mandalorian',
    'Breaking Bad',
    'The Crown',
  ];

  return suggestions
    .filter(suggestion => suggestion.toLowerCase().includes(query.toLowerCase()))
    .slice(0, limit)
    .map((text, index) => ({
      id: `suggestion-${index}`,
      text,
      type: 'content' as const,
      category: 'TV Series',
    }));
};

export default {
  searchContent,
  getContentDetails,
  getRecommendations,
  getPopularContent,
  getSearchSuggestions,
  searchByTitle,
};
