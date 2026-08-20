'use client';

import {
  StreamingOption as OfficialStreamingOption,
  Service as OfficialService,
  StreamingOptionType,
  StreamingOptionQualityEnum,
  Subtitle,
} from 'streaming-availability';

import { ApiClient } from '@/lib/api';
import { logger } from '@/lib/logger';
import { ContentRouteType } from '@/lib/types';

// Import our existing types to maintain compatibility
import {
  StreamingServiceCatalogDto,
  UserStreamingServiceDto,
  AddStreamingServiceRequest,
  UpdateStreamingServicePreferencesRequest,
  UserStreamingServicesResponse,
  StreamingServiceRecommendationRequest,
  StreamingServiceRecommendationResponse,
  StreamingServiceType,
} from '@/lib/api';

// Re-export our existing types to maintain compatibility
export type {
  StreamingServiceCatalogDto,
  UserStreamingServiceDto,
  AddStreamingServiceRequest,
  UpdateStreamingServicePreferencesRequest,
  UserStreamingServicesResponse,
  StreamingServiceRecommendationRequest,
  StreamingServiceRecommendationResponse,
  StreamingServiceType,
};

// Enhanced streaming option type that combines official library with our existing structure
export interface EnhancedStreamingOption {
  serviceId: string;
  serviceName: string;
  serviceLogoUrl?: string;
  type: 'subscription' | 'rental' | 'purchase' | 'free' | 'ads';
  price?: number;
  currency?: string;
  url: string;
  videoLink?: string;
  quality?: string[];
  audioLanguages?: string[];
  subtitleLanguages?: string[];
  expiresAt?: string;
  availableSince?: string;
  expiresSoon?: boolean;
  originalOption?: OfficialStreamingOption; // Make optional for backward compatibility
}

// Service information for catalog display
export interface StreamingServiceInfo {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  type: StreamingServiceType;
  category: string;
  isGlobal: boolean;
  isActive: boolean;
  sortOrder: number;
  availableRegions: string[];
  popularRegions: string[];
  themeColorCode?: string | undefined;
  homePage?: string | undefined;
}

// Streaming availability search parameters
export interface StreamingAvailabilitySearchParams {
  title: string;
  year?: number;
  type?: 'movie' | 'series';
  country?: string;
  lang?: string;
  showType?: 'all' | 'flatrate' | 'free' | 'ads' | 'rent' | 'buy' | 'cinema';
  showOriginalLanguage?: boolean;
}

// Country-specific streaming options
export interface CountryStreamingOptions {
  country: string;
  services: EnhancedStreamingOption[];
  totalCount: number;
}

// Streaming availability result for search
export interface StreamingAvailabilityResult {
  id: string;
  title: string;
  originalTitle?: string;
  year?: number;
  type: 'movie' | 'series';
  overview?: string;
  poster?: string;
  backdrop?: string;
  imdbRating?: number;
  imdbId?: string;
  tmdbRating?: number;
  tmdbId?: number;
  releaseDate?: string;
  genres?: string[];
  runtime?: number;
  countries?: string[];
  streamingOptions: EnhancedStreamingOption[];
  totalStreamingOptions: number;
}

class StreamingAvailabilityService {
  private apiClient: ApiClient;
  private readonly DEFAULT_COUNTRY = 'us';
  private readonly DEFAULT_LANGUAGE = 'en';

  constructor() {
    this.apiClient = new ApiClient();
  }

  /**
   * Convert official StreamingOption to our enhanced format
   */
  public convertStreamingOption(officialOption: OfficialStreamingOption): EnhancedStreamingOption {
    const quality = officialOption.quality ? [officialOption.quality] : [];
    const audioLanguages = officialOption.audios?.map(audio => audio.language) || [];
    const subtitleLanguages = officialOption.subtitles?.map((sub: Subtitle) => sub.locale.language || 'en') || [];

    // Map official type to our type format
    const mapType = (type: StreamingOptionType): 'subscription' | 'rental' | 'purchase' | 'free' | 'ads' => {
      switch (type) {
        case StreamingOptionType.Subscription:
          return 'subscription';
        case StreamingOptionType.Rent:
          return 'rental';
        case StreamingOptionType.Buy:
          return 'purchase';
        case StreamingOptionType.Free:
          return 'free';
        case StreamingOptionType.Addon:
          return 'ads'; // Treat addon as ads for our purposes
        default:
          return 'subscription';
      }
    };

    return {
      serviceId: officialOption.service.id,
      serviceName: officialOption.service.name,
      serviceLogoUrl: officialOption.service.imageSet?.lightThemeImage,
      type: mapType(officialOption.type),
      price: officialOption.price?.amount ? parseFloat(officialOption.price.amount.toString()) : undefined,
      currency: officialOption.price?.currency,
      url: officialOption.link,
      videoLink: officialOption.videoLink,
      quality,
      audioLanguages,
      subtitleLanguages,
      expiresAt: officialOption.expiresOn ? new Date(officialOption.expiresOn * 1000).toISOString() : undefined,
      availableSince: officialOption.availableSince
        ? new Date(officialOption.availableSince * 1000).toISOString()
        : undefined,
      expiresSoon: officialOption.expiresSoon,
      originalOption: officialOption,
    };
  }

  /**
   * Convert official Service to our catalog format
   */
  public convertServiceToCatalog(officialService: OfficialService): StreamingServiceInfo {
    // Determine service type based on streaming option types
    const getServiceType = (types: Record<string, boolean>): StreamingServiceType => {
      if (types.subscription) return StreamingServiceType.Subscription;
      if (types.free) return StreamingServiceType.Free;
      if (types.addon) return StreamingServiceType.AdSupported;
      if (types.rent) return StreamingServiceType.Rental;
      if (types.buy) return StreamingServiceType.Purchase;
      return StreamingServiceType.Subscription; // Default
    };

    return {
      id: officialService.id,
      name: officialService.name,
      displayName: officialService.name,
      logoUrl: officialService.imageSet.lightThemeImage || undefined,
      websiteUrl: officialService.homePage || undefined,
      type: getServiceType(officialService.streamingOptionTypes as unknown as Record<string, boolean>),
      category: 'streaming', // Default category
      isGlobal: true, // Assume all official services are global
      isActive: true,
      sortOrder: 0,
      availableRegions: [], // Would need to be populated from additional data
      popularRegions: [],
      themeColorCode: officialService.themeColorCode || undefined,
      homePage: officialService.homePage || undefined,
    };
  }

  /**
   * Get streaming options for a specific title using the official API
   */
  async getStreamingOptionsByTitle(params: StreamingAvailabilitySearchParams): Promise<EnhancedStreamingOption[]> {
    try {
      // For now, we'll use our backend API which integrates with the official library
      // In the future, we could call the official API directly if we have an API key
      const backendParams: Record<string, string> = {
        title: params.title,
        country: params.country || this.DEFAULT_COUNTRY,
        language: params.lang || this.DEFAULT_LANGUAGE,
      };

      // Add optional parameters only if they have values
      if (params.year !== undefined) {
        backendParams.year = String(params.year);
      }
      if (params.type) {
        backendParams.type = params.type === 'series' ? 'tv-show' : params.type;
      }

      // Call our backend which uses the official API
      const response = await this.apiClient.get<{
        streamingOptions: OfficialStreamingOption[];
      }>(`/api/streaming-availability/search/by-title?${new URLSearchParams(backendParams).toString()}`);

      const options = response.streamingOptions || [];
      return options.map(option => this.convertStreamingOption(option));
    } catch (error) {
      logger.error('Failed to fetch streaming options by title', { error, params });
      return [];
    }
  }

  /**
   * Get streaming options for content by ID
   */
  async getStreamingOptionsById(
    contentId: string,
    contentType: ContentRouteType,
    country?: string
  ): Promise<EnhancedStreamingOption[]> {
    try {
      const params = new URLSearchParams({
        id: contentId,
        type: contentType,
        country: country || this.DEFAULT_COUNTRY,
      });

      const response = await this.apiClient.get<{
        streamingOptions: OfficialStreamingOption[];
      }>(`/api/streaming-availability/by-id?${params.toString()}`);

      const options = response.streamingOptions || [];
      return options.map(option => this.convertStreamingOption(option));
    } catch (error) {
      logger.error('Failed to fetch streaming options by ID', { error, contentId, contentType, country });
      return [];
    }
  }

  /**
   * Get available streaming services catalog
   */
  async getStreamingServicesCatalog(country?: string): Promise<StreamingServiceInfo[]> {
    try {
      // First try to get from our existing backend API
      const existingServices = await this.apiClient.get<
        Array<{
          id: string;
          name: string;
          displayName?: string;
          description?: string;
          logoUrl?: string;
          websiteUrl?: string;
          type: StreamingServiceType;
          category: string;
          isGlobal: boolean;
          isActive: boolean;
          sortOrder: number;
          availableRegions?: string[];
          popularRegions?: string[];
        }>
      >(`/api/streaming-services${country ? `?countryCode=${country}` : ''}`);

      // If we have existing services, convert them to our format
      if (existingServices && existingServices.length > 0) {
        return existingServices.map(service => ({
          id: service.id,
          name: service.name,
          displayName: service.displayName || service.name,
          description: service.description,
          logoUrl: service.logoUrl,
          websiteUrl: service.websiteUrl,
          type: service.type as StreamingServiceType,
          category: service.category,
          isGlobal: service.isGlobal,
          isActive: service.isActive,
          sortOrder: service.sortOrder,
          availableRegions: service.availableRegions || [],
          popularRegions: service.popularRegions || [],
        }));
      }

      // Fallback to official API for services (if we have direct access)
      return [];
    } catch (error) {
      logger.error('Failed to fetch streaming services catalog', { error, country });
      return [];
    }
  }

  /**
   * Get popular streaming services
   */
  async getPopularStreamingServices(country?: string, limit?: number): Promise<StreamingServiceInfo[]> {
    try {
      const params = new URLSearchParams();
      if (country) params.append('countryCode', country);
      if (limit) params.append('limit', limit.toString());

      const response = await this.apiClient.get<
        Array<{
          id: string;
          name: string;
          displayName?: string;
          description?: string;
          logoUrl?: string;
          websiteUrl?: string;
          type: StreamingServiceType;
          category: string;
          isGlobal: boolean;
          isActive: boolean;
          sortOrder: number;
          availableRegions?: string[];
          popularRegions?: string[];
        }>
      >(`/api/streaming-services/popular?${params.toString()}`);

      return response.map(service => ({
        id: service.id,
        name: service.name,
        displayName: service.displayName || service.name,
        description: service.description,
        logoUrl: service.logoUrl,
        websiteUrl: service.websiteUrl,
        type: service.type as StreamingServiceType,
        category: service.category,
        isGlobal: service.isGlobal,
        isActive: service.isActive,
        sortOrder: service.sortOrder,
        availableRegions: service.availableRegions || [],
        popularRegions: service.popularRegions || [],
      }));
    } catch (error) {
      logger.error('Failed to fetch popular streaming services', { error, country, limit });
      return [];
    }
  }

  /**
   * Get streaming options grouped by country
   */
  async getStreamingOptionsByCountry(
    contentId: string,
    contentType: 'movie' | 'tv-show',
    countries: string[] = ['us', 'gb', 'ca', 'au', 'de', 'fr', 'jp', 'br', 'mx', 'es']
  ): Promise<CountryStreamingOptions[]> {
    try {
      const results: CountryStreamingOptions[] = [];

      for (const country of countries) {
        const options = await this.getStreamingOptionsById(contentId, contentType, country);
        results.push({
          country,
          services: options,
          totalCount: options.length,
        });
      }

      return results;
    } catch (error) {
      logger.error('Failed to fetch streaming options by country', { error, contentId, contentType });
      return [];
    }
  }

  /**
   * Search for content with streaming availability
   */
  async searchContentWithAvailability(params: {
    query: string;
    type?: 'movie' | 'series';
    country?: string;
    year?: number;
    limit?: number;
  }): Promise<{
    results: Array<{
      id: string;
      title: string;
      year?: number;
      type: 'movie' | 'series';
      streamingOptions: EnhancedStreamingOption[];
    }>;
    total: number;
  }> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('query', params.query);
      if (params.type) searchParams.append('type', params.type);
      if (params.country) searchParams.append('country', params.country);
      if (params.year) searchParams.append('year', params.year.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());

      const response = await this.apiClient.get<{
        results: Array<{
          id: string;
          title: string;
          originalTitle?: string;
          year?: number;
          type: 'movie' | 'series';
          overview?: string;
          poster?: string;
          backdrop?: string;
          imdbRating?: number;
          imdbId?: string;
          tmdbRating?: number;
          tmdbId?: number;
          releaseDate?: string;
          genres?: string[];
          runtime?: number;
          countries?: string[];
          streamingOptions?: EnhancedStreamingOption[];
        }>;
        total: number;
      }>(`/api/streaming-availability/search?${searchParams.toString()}`);

      const results = response.results.map(result => ({
        id: result.id,
        title: result.title,
        originalTitle: result.originalTitle,
        year: result.year,
        type: result.type,
        overview: result.overview,
        poster: result.poster,
        backdrop: result.backdrop,
        imdbRating: result.imdbRating,
        imdbId: result.imdbId,
        tmdbRating: result.tmdbRating,
        tmdbId: result.tmdbId,
        releaseDate: result.releaseDate,
        genres: result.genres,
        runtime: result.runtime,
        countries: result.countries,
        streamingOptions: result.streamingOptions || [],
        totalStreamingOptions: result.streamingOptions?.length || 0,
      }));

      return {
        results,
        total: response.total || 0,
      };
    } catch (error) {
      logger.error('Failed to search content with availability', { error, params });
      return { results: [], total: 0 };
    }
  }

  /**
   * Get availability changes for a title (if content is expiring soon or newly available)
   */
  async getAvailabilityChanges(
    contentId: string,
    contentType: 'movie' | 'tv-show',
    country?: string
  ): Promise<{
    expiringSoon: EnhancedStreamingOption[];
    newlyAvailable: EnhancedStreamingOption[];
  }> {
    try {
      const options = await this.getStreamingOptionsById(contentId, contentType, country);

      const expiringSoon = options.filter(option => option.expiresSoon);
      const newlyAvailable = options.filter(option => {
        if (!option.availableSince) return false;
        const availableDate = new Date(option.availableSince);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return availableDate > weekAgo;
      });

      return { expiringSoon, newlyAvailable };
    } catch (error) {
      logger.error('Failed to get availability changes', { error, contentId, contentType });
      return { expiringSoon: [], newlyAvailable: [] };
    }
  }
}

// Export singleton instance
export const streamingAvailabilityService = new StreamingAvailabilityService();

// Export types for backward compatibility
export type { OfficialStreamingOption, OfficialService, StreamingOptionType, StreamingOptionQualityEnum };
