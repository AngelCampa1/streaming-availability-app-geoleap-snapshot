/**
 * Filter Utilities - Helper functions for filter operations
 */

import {
  FilterOptions,
  SortOptions,
  FilterPreset,
  FilterSearchParams,
  ContentType,
  PriceType,
  DEFAULT_FILTERS,
  DEFAULT_SORT_OPTIONS,
} from '../types/filters';

/**
 * Compare two filter objects for equality
 */
export const areFiltersEqual = (filters1: FilterOptions, filters2: FilterOptions): boolean => {
  return (
    JSON.stringify(filters1.contentType.sort()) === JSON.stringify(filters2.contentType.sort()) &&
    JSON.stringify(filters1.genres.sort()) === JSON.stringify(filters2.genres.sort()) &&
    filters1.yearRange[0] === filters2.yearRange[0] &&
    filters1.yearRange[1] === filters2.yearRange[1] &&
    filters1.minRating === filters2.minRating &&
    JSON.stringify(filters1.countries.sort()) === JSON.stringify(filters2.countries.sort()) &&
    JSON.stringify(filters1.streamingServices.sort()) === JSON.stringify(filters2.streamingServices.sort()) &&
    JSON.stringify(filters1.priceType.sort()) === JSON.stringify(filters2.priceType.sort()) &&
    JSON.stringify(filters1.languages.sort()) === JSON.stringify(filters2.languages.sort()) &&
    JSON.stringify(filters1.contentRatings.sort()) === JSON.stringify(filters2.contentRatings.sort())
  );
};

/**
 * Compare two sort option objects for equality
 */
export const areSortOptionsEqual = (sort1: SortOptions, sort2: SortOptions): boolean => {
  return (
    sort1.field === sort2.field &&
    sort1.direction === sort2.direction &&
    sort1.secondaryField === sort2.secondaryField &&
    sort1.secondaryDirection === sort2.secondaryDirection
  );
};

/**
 * Check if filters are in default state
 */
export const isDefaultFilters = (filters: FilterOptions): boolean => {
  return areFiltersEqual(filters, DEFAULT_FILTERS);
};

/**
 * Check if sort options are in default state
 */
export const isDefaultSortOptions = (sortOptions: SortOptions): boolean => {
  return areSortOptionsEqual(sortOptions, DEFAULT_SORT_OPTIONS);
};

/**
 * Get filter summary text for display
 */
export const getFilterSummary = (filters: FilterOptions): string[] => {
  const summary: string[] = [];

  if (filters.contentType.length > 0) {
    const typeLabels = filters.contentType.map(type =>
      type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    );
    summary.push(`${typeLabels.join(', ')}`);
  }

  if (filters.genres.length > 0) {
    if (filters.genres.length === 1) {
      summary.push(`${filters.genres[0]}`);
    } else {
      summary.push(`${filters.genres.length} genres`);
    }
  }

  if (filters.yearRange[0] !== DEFAULT_FILTERS.yearRange[0] ||
      filters.yearRange[1] !== DEFAULT_FILTERS.yearRange[1]) {
    if (filters.yearRange[0] === filters.yearRange[1]) {
      summary.push(`${filters.yearRange[0]}`);
    } else {
      summary.push(`${filters.yearRange[0]}-${filters.yearRange[1]}`);
    }
  }

  if (filters.minRating > 0) {
    summary.push(`${filters.minRating}+ stars`);
  }

  if (filters.streamingServices.length > 0) {
    if (filters.streamingServices.length === 1) {
      summary.push(filters.streamingServices[0]);
    } else {
      summary.push(`${filters.streamingServices.length} services`);
    }
  }

  if (filters.countries.length > 0) {
    if (filters.countries.length === 1) {
      summary.push(filters.countries[0]);
    } else {
      summary.push(`${filters.countries.length} countries`);
    }
  }

  if (filters.priceType.length > 0) {
    const typeLabels = filters.priceType.map(type =>
      type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    );
    summary.push(typeLabels.join(', '));
  }

  if (filters.languages.length > 0) {
    if (filters.languages.length === 1) {
      summary.push(filters.languages[0]);
    } else {
      summary.push(`${filters.languages.length} languages`);
    }
  }

  if (filters.contentRatings.length > 0) {
    summary.push(`${filters.contentRatings.join(', ')}`);
  }

  return summary;
};

/**
 * Get short filter summary for compact display
 */
export const getShortFilterSummary = (filters: FilterOptions): string => {
  const summary = getFilterSummary(filters);

  if (summary.length === 0) {
    return 'No filters';
  }

  if (summary.length <= 2) {
    return summary.join(' • ');
  }

  return `${summary.slice(0, 2).join(' •')} • +${summary.length - 2} more`;
};

/**
 * Validate search parameters
 */
export const validateSearchParams = (params: FilterSearchParams): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (params.yearFrom && params.yearTo && params.yearFrom > params.yearTo) {
    errors.push('Year from cannot be greater than year to');
  }

  if (params.minRating && (params.minRating < 0 || params.minRating > 10)) {
    errors.push('Minimum rating must be between 0 and 10');
  }

  const currentYear = new Date().getFullYear();
  if (params.yearTo && params.yearTo > currentYear + 10) {
    errors.push('Year to cannot be more than 10 years in the future');
  }

  if (params.yearFrom && params.yearFrom < 1900) {
    errors.push('Year from cannot be before 1900');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize filter options
 */
export const sanitizeFilters = (filters: FilterOptions): FilterOptions => {
  const currentYear = new Date().getFullYear();

  return {
    contentType: filters.contentType.filter(type => Object.values(ContentType).includes(type)),
    genres: filters.genres.filter(genre => typeof genre === 'string' && genre.length > 0),
    yearRange: [
      Math.max(1900, Math.min(currentYear + 5, filters.yearRange[0])),
      Math.max(1900, Math.min(currentYear + 5, filters.yearRange[1])),
    ],
    minRating: Math.max(0, Math.min(10, filters.minRating)),
    countries: filters.countries.filter(country => typeof country === 'string' && country.length === 2),
    streamingServices: filters.streamingServices.filter(service => typeof service === 'string' && service.length > 0),
    priceType: filters.priceType.filter(type => Object.values(PriceType).includes(type)),
    languages: filters.languages.filter(lang => typeof lang === 'string' && lang.length === 2),
    contentRatings: filters.contentRatings.filter(rating => typeof rating === 'string' && rating.length > 0),
  };
};

/**
 * Merge two filter objects
 */
export const mergeFilters = (baseFilters: FilterOptions, overrideFilters: Partial<FilterOptions>): FilterOptions => {
  return {
    contentType: overrideFilters.contentType ?? baseFilters.contentType,
    genres: overrideFilters.genres ?? baseFilters.genres,
    yearRange: overrideFilters.yearRange ?? baseFilters.yearRange,
    minRating: overrideFilters.minRating ?? baseFilters.minRating,
    countries: overrideFilters.countries ?? baseFilters.countries,
    streamingServices: overrideFilters.streamingServices ?? baseFilters.streamingServices,
    priceType: overrideFilters.priceType ?? baseFilters.priceType,
    languages: overrideFilters.languages ?? baseFilters.languages,
    contentRatings: overrideFilters.contentRatings ?? baseFilters.contentRatings,
  };
};

/**
 * Get popular filter combinations
 */
export const getPopularFilterCombinations = (): Array<{ name: string; filters: FilterOptions; description: string }> => {
  return [
    {
      name: 'New Movies',
      filters: {
        ...DEFAULT_FILTERS,
        contentType: [ContentType.MOVIE],
        yearRange: [new Date().getFullYear() - 2, new Date().getFullYear()],
        minRating: 6,
      },
      description: 'Popular movies from the last 2 years',
    },
    {
      name: 'Trending TV Shows',
      filters: {
        ...DEFAULT_FILTERS,
        contentType: [ContentType.TV_SERIES],
        minRating: 7,
      },
      description: 'Highly rated TV series',
    },
    {
      name: 'Family Friendly',
      filters: {
        ...DEFAULT_FILTERS,
        contentRatings: ['G', 'PG', 'TV-Y', 'TV-Y7', 'TV-G'],
        minRating: 6,
      },
      description: 'Content suitable for all ages',
    },
    {
      name: 'Action & Adventure',
      filters: {
        ...DEFAULT_FILTERS,
        genres: ['action', 'adventure'],
        minRating: 6,
      },
      description: 'Exciting action and adventure content',
    },
    {
      name: 'Free to Watch',
      filters: {
        ...DEFAULT_FILTERS,
        priceType: [PriceType.FREE, PriceType.ADS_SUPPORTED],
      },
      description: 'Content available at no cost',
    },
    {
      name: 'Award Winners',
      filters: {
        ...DEFAULT_FILTERS,
        minRating: 8,
        yearRange: [2015, new Date().getFullYear()],
      },
      description: 'Critically acclaimed content',
    },
  ];
};

/**
 * Create deep copy of filter options
 */
export const cloneFilters = (filters: FilterOptions): FilterOptions => {
  return JSON.parse(JSON.stringify(filters));
};

/**
 * Create deep copy of sort options
 */
export const cloneSortOptions = (sortOptions: SortOptions): SortOptions => {
  return JSON.parse(JSON.stringify(sortOptions));
};

/**
 * Create deep copy of filter preset
 */
export const clonePreset = (preset: FilterPreset): FilterPreset => {
  return {
    ...preset,
    filters: cloneFilters(preset.filters),
    sortOptions: cloneSortOptions(preset.sortOptions),
    createdAt: new Date(preset.createdAt),
    updatedAt: new Date(preset.updatedAt),
  };
};

/**
 * Get filter weight for sorting presets by relevance
 */
export const getFilterWeight = (filters: FilterOptions): number => {
  let weight = 0;

  // Weight different filter types
  weight += filters.contentType.length * 3;
  weight += filters.genres.length * 2;
  weight += filters.streamingServices.length * 2;
  weight += filters.countries.length * 2;
  weight += filters.priceType.length;
  weight += filters.languages.length;
  weight += filters.contentRatings.length;

  // Weight year range (non-default range)
  if (filters.yearRange[0] !== DEFAULT_FILTERS.yearRange[0] ||
      filters.yearRange[1] !== DEFAULT_FILTERS.yearRange[1]) {
    weight += 2;
  }

  // Weight minimum rating
  if (filters.minRating > 0) {
    weight += Math.floor(filters.minRating);
  }

  return weight;
};

/**
 * Sort presets by relevance and usage
 */
export const sortPresetsByRelevance = (presets: FilterPreset[]): FilterPreset[] => {
  return presets.sort((a, b) => {
    // System presets first
    if (a.isSystem && !b.isSystem) {return -1;}
    if (!a.isSystem && b.isSystem) {return 1;}

    // Then by usage count
    if (a.usageCount !== b.usageCount) {
      return b.usageCount - a.usageCount;
    }

    // Then by filter complexity (more filters = higher priority)
    const aWeight = getFilterWeight(a.filters);
    const bWeight = getFilterWeight(b.filters);
    if (aWeight !== bWeight) {
      return bWeight - aWeight;
    }

    // Finally by last updated
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
};

/**
 * Base64 encode polyfill for React Native
 */
function base64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let i = 0; i < str.length; i += 3) {
    const byte1 = str.charCodeAt(i);
    const byte2 = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const byte3 = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;

    const encoded1 = byte1 >> 2;
    const encoded2 = ((byte1 & 3) << 4) | (byte2 >> 4);
    const encoded3 = ((byte2 & 15) << 2) | (byte3 >> 6);
    const encoded4 = byte3 & 63;

    output += chars[encoded1] + chars[encoded2];
    output += i + 1 < str.length ? chars[encoded3] : '=';
    output += i + 2 < str.length ? chars[encoded4] : '=';
  }

  return output;
}

/**
 * Base64 decode polyfill for React Native
 */
function base64Decode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  str = str.replace(/=+$/, '');

  for (let i = 0; i < str.length; i += 4) {
    const encoded1 = chars.indexOf(str[i]);
    const encoded2 = chars.indexOf(str[i + 1]);
    const encoded3 = chars.indexOf(str[i + 2]);
    const encoded4 = chars.indexOf(str[i + 3]);

    const byte1 = (encoded1 << 2) | (encoded2 >> 4);
    const byte2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    const byte3 = ((encoded3 & 3) << 6) | encoded4;

    output += String.fromCharCode(byte1);
    if (encoded3 !== -1) output += String.fromCharCode(byte2);
    if (encoded4 !== -1) output += String.fromCharCode(byte3);
  }

  return output;
}

/**
 * Generate filter hash for caching
 */
export const generateFilterHash = (filters: FilterOptions, sortOptions: SortOptions): string => {
  const data = { filters, sortOptions };
  return base64Encode(JSON.stringify(data)).replace(/[+/=]/g, '').substring(0, 16);
};

/**
 * Parse filter hash back to object
 */
export const parseFilterHash = (hash: string): { filters: FilterOptions; sortOptions: SortOptions } | null => {
  try {
    const padded = hash + '=='.substring(0, (3 - hash.length % 3) % 3);
    const json = base64Decode(padded);
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
};

/**
 * Check if two filter states have meaningful differences
 */
export const hasFilterChanges = (filters1: FilterOptions, filters2: FilterOptions): boolean => {
  return !areFiltersEqual(filters1, filters2);
};

/**
 * Get recommended filters based on user behavior
 */
export const getRecommendedFilters = (userHistory: FilterPreset[]): FilterOptions => {
  if (userHistory.length === 0) {
    return DEFAULT_FILTERS;
  }

  // Analyze user's filter patterns
  const contentTypeCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};
  const serviceCounts: Record<string, number> = {};
  let totalMinRating = 0;
  let ratingCount = 0;

  userHistory.forEach(preset => {
    preset.filters.contentType.forEach(type => {
      contentTypeCounts[type] = (contentTypeCounts[type] || 0) + 1;
    });

    preset.filters.genres.forEach(genre => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });

    preset.filters.streamingServices.forEach(service => {
      serviceCounts[service] = (serviceCounts[service] || 0) + 1;
    });

    if (preset.filters.minRating > 0) {
      totalMinRating += preset.filters.minRating;
      ratingCount++;
    }
  });

  // Build recommended filters based on patterns
  const recommendedFilters: FilterOptions = { ...DEFAULT_FILTERS };

  // Add top content types (used in >50% of presets)
  const threshold = userHistory.length / 2;
  recommendedFilters.contentType = Object.entries(contentTypeCounts)
    .filter(([_, count]) => count > threshold)
    .map(([type]) => type as ContentType);

  // Add top genres (used in >30% of presets)
  const genreThreshold = userHistory.length * 0.3;
  recommendedFilters.genres = Object.entries(genreCounts)
    .filter(([_, count]) => count > genreThreshold)
    .map(([genre]) => genre)
    .slice(0, 5); // Limit to top 5

  // Add top streaming services
  const serviceThreshold = userHistory.length * 0.4;
  recommendedFilters.streamingServices = Object.entries(serviceCounts)
    .filter(([_, count]) => count > serviceThreshold)
    .map(([service]) => service)
    .slice(0, 3); // Limit to top 3

  // Set average minimum rating
  if (ratingCount > 0) {
    recommendedFilters.minRating = Math.round((totalMinRating / ratingCount) * 10) / 10;
  }

  return recommendedFilters;
};

/**
 * Optimize filter combinations for API calls
 */
export const optimizeFiltersForAPI = (filters: FilterOptions): FilterOptions => {
  const optimized = { ...filters };

  // Remove redundant filters
  if (optimized.contentType.length === Object.values(ContentType).length) {
    optimized.contentType = [];
  }

  if (optimized.genres.length > 10) {
    // Keep only top 10 most common genres
    const commonGenres = ['action', 'comedy', 'drama', 'thriller', 'romance',
                         'horror', 'sci-fi', 'fantasy', 'animation', 'documentary'];
    optimized.genres = optimized.genres.filter(genre =>
      commonGenres.includes(genre.toLowerCase()),
    ).slice(0, 10);
  }

  // Normalize year range
  const currentYear = new Date().getFullYear();
  if (optimized.yearRange[0] < 1900) {
    optimized.yearRange[0] = 1900;
  }
  if (optimized.yearRange[1] > currentYear + 5) {
    optimized.yearRange[1] = currentYear + 5;
  }

  return optimized;
};

/**
 * Debounce function for filter applications
 */
export const debounceFilterApplication = (
  func: () => void,
  delay: number,
): (() => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;

  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(func, delay);
  };
};
