import { GlobalSearchResult, ContentRouteType } from '@/lib/types';
import { generateContentSlug, parseContentSlug } from '@/lib/seo/url-generation';
import { streamingAvailabilityService } from '@/services/streamingAvailabilityService';
import { SERVER_API_URL } from '@/config/api';

// Use SERVER_API_URL for all server-side requests (SSR, SSG, build-time)
// This ensures we always have a valid full URL
const API_BASE_URL = SERVER_API_URL;

// Types for content data
export interface ContentData {
  id: string;
  title: string;
  originalTitle?: string;
  overview?: string;
  tagline?: string;
  releaseYear?: number;
  rating?: number;
  voteCount?: number;
  runtime?: number;
  contentRating?: string;
  genres: string[];
  primaryGenre?: string;
  posterUrl?: string;
  backdropUrl?: string;
  cast?: CastMember[];
  crew?: CrewMember[];
  productionCountries?: string[];
  originalLanguage?: string;
  status?: string;
  homepage?: string;
  streamingOptions?: StreamingOption[];
}

export interface CastMember {
  id: number;
  name: string;
  character?: string;
  profilePath?: string;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profilePath?: string;
}

// Re-export for global access
export type { CastMember as GlobalCastMember, CrewMember as GlobalCrewMember };

// Re-export our enhanced streaming option for backward compatibility
export type { EnhancedStreamingOption as StreamingOption } from '@/services/streamingAvailabilityService';

// Cache for content data
const contentCache = new Map<string, { data: ContentData; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

/**
 * Get content by slug (SEO-friendly URL)
 */
export async function getContentBySlug(
  type: ContentRouteType,
  slug: string
): Promise<ContentData | null> {
  try {
    // Parse the slug to get ID and title
    const { id, title: _title } = parseContentSlug(slug);

    // Check cache first
    const cacheKey = `${type}-${id}`;
    const cached = contentCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Fetch from API
    const response = await fetch(`${API_BASE_URL}/api/content/${type}/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 900 }, // Revalidate every 15 minutes
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch content: ${response.statusText}`);
    }

    const contentData: ContentData = await response.json();

    // Cache the result
    contentCache.set(cacheKey, {
      data: contentData,
      timestamp: Date.now(),
    });

    return contentData;
  } catch (error) {
    console.error('Error fetching content by slug:', error);
    return null;
  }
}

/**
 * Get related content based on genre and type
 */
export async function getRelatedContent(
  contentId: string,
  contentType: ContentRouteType,
  genres: string[],
  limit: number = 12
): Promise<ContentData[]> {
  try {
    const genresParam = genres.join(',');

    const response = await fetch(
      `${API_BASE_URL}/api/content/related?id=${contentId}&type=${contentType}&genres=${genresParam}&limit=${limit}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 3600 }, // Revalidate every hour
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch related content: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching related content:', error);
    return [];
  }
}

/**
 * Get streaming options for specific content using the official streaming-availability library
 */
export async function getStreamingOptions(
  contentId: string,
  contentType: ContentRouteType
): Promise<StreamingOption[]> {
  try {
    // Use the official streaming availability service
    return await streamingAvailabilityService.getStreamingOptionsById(contentId, contentType);
  } catch (error) {
    console.error('Error fetching streaming options:', error);

    // Fallback to the old API method if the new service fails
    try {
      const response = await fetch(`${API_BASE_URL}/api/streaming/availability/${contentId}?type=${contentType}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 1800 }, // Revalidate every 30 minutes
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch streaming options: ${response.statusText}`);
      }

      const legacyOptions = await response.json();

      // Legacy streaming option type
      interface LegacyStreamingOption {
        serviceId: string;
        serviceName: string;
        serviceLogoUrl?: string;
        type: string;
        price?: number;
        currency?: string;
        url: string;
        quality?: string[];
        audioLanguages?: string[];
        subtitleLanguages?: string[];
        expiresAt?: string;
      }

      // Convert legacy options to our enhanced format
      return (legacyOptions as LegacyStreamingOption[]).map(option => ({
        serviceId: option.serviceId,
        serviceName: option.serviceName,
        serviceLogoUrl: option.serviceLogoUrl,
        type: option.type as 'subscription' | 'rental' | 'purchase' | 'free' | 'ads',
        price: option.price,
        currency: option.currency,
        url: option.url,
        quality: option.quality,
        audioLanguages: option.audioLanguages,
        subtitleLanguages: option.subtitleLanguages,
        expiresAt: option.expiresAt,
        // Add required fields for enhanced format
        videoLink: option.url,
        expiresSoon: option.expiresAt
          ? new Date(option.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : false,
        availableSince: new Date().toISOString(),
        originalOption: undefined, // Keep as reference but optional
      }));
    } catch (fallbackError) {
      console.error('Error with fallback streaming options API:', fallbackError);
      return [];
    }
  }
}

/**
 * Get streaming options for specific content in a specific country
 */
export async function getStreamingOptionsForCountry(
  contentId: string,
  contentType: 'movie' | 'tv-show' | 'documentary',
  countryIso: string
): Promise<StreamingOption[]> {
  try {
    return await streamingAvailabilityService.getStreamingOptionsById(contentId, contentType, countryIso);
  } catch (error) {
    console.error('Error fetching country streaming options:', error);
    return [];
  }
}

/**
 * Extended GlobalSearchResult type with optional fields
 */
interface ExtendedGlobalSearchResult extends GlobalSearchResult {
  originalTitle?: string;
  runtimeMinutes?: number;
  contentRating?: string;
  backdropUrl?: string;
}

/**
 * Extended streaming option from search results
 */
interface ExtendedStreamingOption {
  serviceId: string;
  serviceName: string;
  serviceLogoUrl?: string;
  type: string;
  url?: string;
  price?: number;
  currency?: string;
  videoQuality?: string;
  audioLanguages?: string[];
  subtitleLanguages?: string[];
  earliestExpiration?: string;
}

/**
 * Convert GlobalSearchResult to ContentData
 */
export function convertSearchResultToContent(
  result: GlobalSearchResult,
  _type: ContentRouteType
): ContentData {
  const extended = result as ExtendedGlobalSearchResult;

  return {
    id: result.id,
    title: result.title,
    originalTitle: extended.originalTitle || result.title,
    overview: result.description,
    releaseYear: result.year,
    rating: result.imdbRating,
    runtime: extended.runtimeMinutes,
    contentRating: extended.contentRating,
    genres: result.genres || [],
    primaryGenre: result.genres?.[0],
    posterUrl: result.posterUrl,
    backdropUrl: extended.backdropUrl,
    streamingOptions:
      result.streamingOptions?.map(option => {
        const extendedOption = option as unknown as ExtendedStreamingOption;
        return {
          serviceId: option.serviceId,
          serviceName: option.serviceName,
          serviceLogoUrl: option.serviceLogoUrl,
          type: option.type as 'subscription' | 'rental' | 'purchase' | 'free' | 'ads',
          url: option.url || '',
          quality: extendedOption.videoQuality ? [extendedOption.videoQuality] : undefined,
          audioLanguages: extendedOption.audioLanguages,
          subtitleLanguages: extendedOption.subtitleLanguages,
          price: option.price,
          currency: option.currency,
          expiresAt: extendedOption.earliestExpiration,
        };
      }) || [],
  };
}

/**
 * Generate content URL for internal linking
 */
export function generateContentUrl(content: ContentData, type: ContentRouteType): string {
  const slug = generateContentSlug(content.id, content.title);
  return `/content/${type}/${slug}`;
}

/**
 * Get popular content for pregeneration
 */
export async function getPopularContent(
  type: ContentRouteType,
  limit: number = 50
): Promise<ContentData[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/content/popular?type=${type}&limit=${limit}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 86400 }, // Revalidate daily
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch popular content: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching popular content:', error);
    return [];
  }
}
