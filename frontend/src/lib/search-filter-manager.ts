/* eslint-disable @typescript-eslint/no-explicit-any */
import { GlobalSearchRequest, ContentType } from '@/lib/types/paywall';

export interface FilterState {
  query: string;
  contentType?: ContentType;
  page?: number;
  pageSize?: number;
  countries?: string[];
  services?: string[];
  minRating?: number;
  maxRating?: number;
  yearFrom?: number;
  yearTo?: number;
  genres?: string[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface FilterChangeEvent {
  filters: Partial<FilterState>;
  changedField: keyof FilterState;
  previousValue: any;
  newValue: any;
}

export interface SearchFilterManagerConfig {
  debounceMs?: number;
  persistToSessionStorage?: boolean;
  sessionKey?: string;
  onFilterChange?: (event: FilterChangeEvent) => void;
  onStateRestore?: (state: FilterState) => void;
}

export class SearchFilterManager {
  private filters: FilterState;
  private listeners: Set<(filters: FilterState) => void> = new Set();
  private config: Required<SearchFilterManagerConfig>;
  private debounceTimeouts: Map<keyof FilterState, NodeJS.Timeout> = new Map();

  constructor(initialFilters: Partial<FilterState> = {}, config: SearchFilterManagerConfig = {}) {
    this.config = {
      debounceMs: 300,
      persistToSessionStorage: true,
      sessionKey: 'geoleap_search_filters',
      onFilterChange: () => {},
      onStateRestore: () => {},
      ...config,
    };

    // Initialize filters with defaults
    this.filters = {
      query: '',
      page: 1,
      pageSize: 10,
      sortBy: 'relevance',
      sortDirection: 'desc',
      ...this.restoreFromStorage(),
      ...initialFilters,
    };

    // Notify about restored state
    if (this.config.onStateRestore && this.hasStoredFilters()) {
      this.config.onStateRestore(this.filters);
    }
  }

  /**
   * Get current filter state
   */
  getFilters(): FilterState {
    return { ...this.filters };
  }

  /**
   * Get filters in GlobalSearchRequest format
   */
  getSearchRequest(): GlobalSearchRequest {
    const { query, sortBy: _sortBy, sortDirection: _sortDirection, ...searchFilters } = this.filters;
    return {
      query,
      ...searchFilters,
    } as GlobalSearchRequest;
  }

  /**
   * Update a single filter with debouncing
   */
  updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K], immediate: boolean = false): void {
    const previousValue = this.filters[key];

    // Clear existing timeout for this field
    const existingTimeout = this.debounceTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const updateFn = () => {
      this.filters = { ...this.filters, [key]: value };

      // Reset page when filters change (except for page itself)
      if (key !== 'page' && key !== 'pageSize' && key !== 'sortBy' && key !== 'sortDirection') {
        this.filters.page = 1;
      }

      this.persistToStorage();
      this.notifyListeners();

      // Trigger change event
      if (this.config.onFilterChange) {
        this.config.onFilterChange({
          filters: this.getFilters(),
          changedField: key,
          previousValue,
          newValue: value,
        });
      }
    };

    if (immediate || this.config.debounceMs <= 0) {
      updateFn();
    } else {
      const timeout = setTimeout(updateFn, this.config.debounceMs);
      this.debounceTimeouts.set(key, timeout);
    }
  }

  /**
   * Update multiple filters at once
   */
  updateFilters(partialFilters: Partial<FilterState>, immediate: boolean = false): void {
    const keys = Object.keys(partialFilters) as Array<keyof FilterState>;

    // Clear all pending timeouts
    keys.forEach(key => {
      const existingTimeout = this.debounceTimeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
    });

    const updateFn = () => {
      const previousFilters = { ...this.filters };
      this.filters = {
        ...this.filters,
        ...partialFilters,
        // Reset page when non-pagination filters change, otherwise use new page if provided
        page: this.shouldResetPage(partialFilters) ? 1 : (partialFilters.page ?? this.filters.page),
      };

      this.persistToStorage();
      this.notifyListeners();

      // Trigger change events for each changed field
      if (this.config.onFilterChange) {
        keys.forEach(key => {
          if (previousFilters[key] !== partialFilters[key]) {
            this.config.onFilterChange!({
              filters: this.getFilters(),
              changedField: key,
              previousValue: previousFilters[key],
              newValue: partialFilters[key],
            });
          }
        });
      }
    };

    if (immediate || this.config.debounceMs <= 0) {
      updateFn();
    } else {
      // Use single timeout for batch update
      const timeout = setTimeout(updateFn, this.config.debounceMs);
      keys.forEach(key => this.debounceTimeouts.set(key, timeout));
    }
  }

  /**
   * Clear all filters except query
   */
  clearFilters(keepQuery: boolean = true): void {
    const clearedFilters: FilterState = {
      query: keepQuery ? this.filters.query : '',
      page: 1,
      pageSize: this.filters.pageSize,
      sortBy: 'relevance',
      sortDirection: 'desc',
    };

    this.filters = clearedFilters;
    this.persistToStorage();
    this.notifyListeners();
  }

  /**
   * Get count of active filters (excluding query, page, pageSize, sort)
   */
  getActiveFilterCount(): number {
    return Object.entries(this.filters).reduce((count, [key, value]) => {
      if (['query', 'page', 'pageSize', 'sortBy', 'sortDirection'].includes(key)) {
        return count;
      }
      if (value === undefined || value === null) return count;
      if (Array.isArray(value) && value.length === 0) return count;
      if (typeof value === 'string' && value.trim() === '') return count;
      return count + 1;
    }, 0);
  }

  /**
   * Get active filters as display-friendly array
   */
  getActiveFiltersList(): Array<{ key: string; label: string; value: string }> {
    const filters: Array<{ key: string; label: string; value: string }> = [];

    if (this.filters.contentType !== undefined) {
      const typeLabels: Record<ContentType, string> = {
        [ContentType.All]: 'All Types',
        [ContentType.Movie]: 'Movies',
        [ContentType.Show]: 'TV Shows',
        [ContentType.Documentary]: 'Documentaries',
        [ContentType.Anime]: 'Anime',
      };
      filters.push({
        key: 'contentType',
        label: 'Type',
        value: typeLabels[this.filters.contentType] || 'Unknown',
      });
    }

    if (this.filters.yearFrom) {
      filters.push({
        key: 'yearFrom',
        label: 'From Year',
        value: this.filters.yearFrom.toString(),
      });
    }

    if (this.filters.yearTo) {
      filters.push({
        key: 'yearTo',
        label: 'To Year',
        value: this.filters.yearTo.toString(),
      });
    }

    if (this.filters.minRating) {
      filters.push({
        key: 'minRating',
        label: 'Min Rating',
        value: `${this.filters.minRating}+ ⭐`,
      });
    }

    if (this.filters.maxRating) {
      filters.push({
        key: 'maxRating',
        label: 'Max Rating',
        value: `${this.filters.maxRating} ⭐`,
      });
    }

    if (this.filters.genres && this.filters.genres.length > 0) {
      filters.push({
        key: 'genres',
        label: 'Genres',
        value: this.filters.genres.join(', '),
      });
    }

    if (this.filters.services && this.filters.services.length > 0) {
      filters.push({
        key: 'services',
        label: 'Services',
        value: this.filters.services.join(', '),
      });
    }

    if (this.filters.countries && this.filters.countries.length > 0) {
      filters.push({
        key: 'countries',
        label: 'Countries',
        value: this.filters.countries.join(', '),
      });
    }

    return filters;
  }

  /**
   * Subscribe to filter changes
   */
  subscribe(listener: (filters: FilterState) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Generate URL query params from current filters
   */
  toURLSearchParams(): URLSearchParams {
    const params = new URLSearchParams();

    if (this.filters.query) params.set('q', this.filters.query);
    if (this.filters.contentType !== undefined) params.set('type', this.filters.contentType.toString());
    if (this.filters.page && this.filters.page > 1) params.set('page', this.filters.page.toString());
    if (this.filters.yearFrom) params.set('yearFrom', this.filters.yearFrom.toString());
    if (this.filters.yearTo) params.set('yearTo', this.filters.yearTo.toString());
    if (this.filters.minRating) params.set('minRating', this.filters.minRating.toString());
    if (this.filters.maxRating) params.set('maxRating', this.filters.maxRating.toString());
    if (this.filters.sortBy && this.filters.sortBy !== 'relevance') params.set('sort', this.filters.sortBy);
    if (this.filters.sortDirection && this.filters.sortDirection !== 'desc')
      params.set('order', this.filters.sortDirection);

    if (this.filters.genres && this.filters.genres.length > 0) {
      params.set('genres', this.filters.genres.join(','));
    }
    if (this.filters.services && this.filters.services.length > 0) {
      params.set('services', this.filters.services.join(','));
    }
    if (this.filters.countries && this.filters.countries.length > 0) {
      params.set('countries', this.filters.countries.join(','));
    }

    return params;
  }

  /**
   * Load filters from URL search params
   * FIX: Now REPLACES filters with defaults + URL params instead of merging with stale sessionStorage state
   */
  fromURLSearchParams(searchParams: URLSearchParams): void {
    const filters: Partial<FilterState> = {};

    const query = searchParams.get('q');
    if (query) filters.query = query;

    const type = searchParams.get('type');
    if (type) filters.contentType = parseInt(type) as ContentType;

    const page = searchParams.get('page');
    if (page) filters.page = parseInt(page);

    const yearFrom = searchParams.get('yearFrom');
    if (yearFrom) filters.yearFrom = parseInt(yearFrom);

    const yearTo = searchParams.get('yearTo');
    if (yearTo) filters.yearTo = parseInt(yearTo);

    const minRating = searchParams.get('minRating');
    if (minRating) filters.minRating = parseFloat(minRating);

    const maxRating = searchParams.get('maxRating');
    if (maxRating) filters.maxRating = parseFloat(maxRating);

    const sortBy = searchParams.get('sort');
    if (sortBy) filters.sortBy = sortBy;

    const sortDirection = searchParams.get('order');
    if (sortDirection && (sortDirection === 'asc' || sortDirection === 'desc')) {
      filters.sortDirection = sortDirection;
    }

    const genres = searchParams.get('genres');
    if (genres) filters.genres = genres.split(',').filter(g => g.trim());

    const services = searchParams.get('services');
    if (services) filters.services = services.split(',').filter(s => s.trim());

    const countries = searchParams.get('countries');
    if (countries) filters.countries = countries.split(',').filter(c => c.trim());

    // FIX: REPLACE with defaults + URL params instead of merging with old sessionStorage state
    // This ensures navigating to clean /search URL clears all filters
    const defaultFilters: FilterState = {
      query: '',
      page: 1,
      pageSize: this.filters.pageSize || 10,
      sortBy: 'relevance',
      sortDirection: 'desc',
    };

    this.filters = { ...defaultFilters, ...filters };
    this.persistToStorage();
    this.notifyListeners();
  }

  /**
   * Dispose of the manager (cleanup timers)
   */
  dispose(): void {
    // Clear all debounce timeouts
    this.debounceTimeouts.forEach(timeout => clearTimeout(timeout));
    this.debounceTimeouts.clear();

    // Clear listeners
    this.listeners.clear();
  }

  private shouldResetPage(partialFilters: Partial<FilterState>): boolean {
    const keys = Object.keys(partialFilters) as Array<keyof FilterState>;
    return keys.some(key => !['page', 'pageSize', 'sortBy', 'sortDirection'].includes(key));
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getFilters());
      } catch (error) {
        console.error('Error in filter change listener:', error);
      }
    });
  }

  private persistToStorage(): void {
    if (!this.config.persistToSessionStorage) return;

    // Defer storage to avoid SSR/hydration issues
    if (typeof window === 'undefined') return;

    try {
      // Only persist non-default values
      const toPersist = Object.entries(this.filters).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value) && value.length > 0) {
              acc[key] = value;
            } else if (!Array.isArray(value) && value !== '') {
              // Don't persist defaults
              if (key === 'page' && value === 1) return acc;
              if (key === 'pageSize' && value === 10) return acc;
              if (key === 'sortBy' && value === 'relevance') return acc;
              if (key === 'sortDirection' && value === 'desc') return acc;
              acc[key] = value;
            }
          }
          return acc;
        },
        {} as Record<string, any>
      );

      // Use requestIdleCallback for non-blocking storage
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          try {
            sessionStorage.setItem(this.config.sessionKey, JSON.stringify(toPersist));
          } catch (_error) {
            // Silent fail - storage is optional
          }
        });
      } else {
        sessionStorage.setItem(this.config.sessionKey, JSON.stringify(toPersist));
      }
    } catch (error) {
      console.warn('Failed to persist filters to session storage:', error);
    }
  }

  private restoreFromStorage(): Partial<FilterState> {
    if (!this.config.persistToSessionStorage) return {};

    // Skip during SSR to prevent hydration mismatches
    if (typeof window === 'undefined') return {};

    try {
      const stored = sessionStorage.getItem(this.config.sessionKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to restore filters from session storage:', error);
    }

    return {};
  }

  private hasStoredFilters(): boolean {
    if (!this.config.persistToSessionStorage) return false;

    // Skip during SSR
    if (typeof window === 'undefined') return false;

    try {
      const stored = sessionStorage.getItem(this.config.sessionKey);
      return stored !== null && stored !== '{}';
    } catch {
      return false;
    }
  }
}
