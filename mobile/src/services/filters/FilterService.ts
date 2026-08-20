/**
 * Filter Service - Core logic for filter management and persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';

import {
  FilterOptions,
  SortOptions,
  FilterPreset,
  FilterState,
  FilterPreferences,
  FilterServiceOptions,
  FilterAnalytics,
  FilterValidationResult,
  FilterSearchParams,
  FilterExport,
  DEFAULT_FILTERS,
  DEFAULT_SORT_OPTIONS,
  FILTER_PRESETS
,
  ContentType,
  PriceType,
  SortField,
  SortDirection,
} from '../../types/filters';

class FilterService {
  private static instance: FilterService;
  private readonly STORAGE_KEYS = {
    FILTERS: '@geoleap_filters',
    SORT_OPTIONS: '@geoleap_sort_options',
    PRESETS: '@geoleap_presets',
    PREFERENCES: '@geoleap_filter_preferences',
    RECENT_PRESETS: '@geoleap_recent_presets',
    ANALYTICS: '@geoleap_filter_analytics',
  };

  private readonly DEFAULT_OPTIONS: Required<FilterServiceOptions> = {
    persistToStorage: true,
    debounceMs: 300,
    maxRecentPresets: 10,
  };

  private options: Required<FilterServiceOptions>;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private constructor(options: FilterServiceOptions = {}) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
  }

  public static getInstance(options?: FilterServiceOptions): FilterService {
    if (!FilterService.instance) {
      FilterService.instance = new FilterService(options);
    }
    return FilterService.instance;
  }

  /**
   * Convert filter options to search parameters for API
   */
  public toSearchParams(filters: FilterOptions, sortOptions: SortOptions): FilterSearchParams {
    return {
      contentType: filters.contentType.length > 0 ? filters.contentType : undefined,
      genres: filters.genres.length > 0 ? filters.genres : undefined,
      yearFrom: filters.yearRange[0] !== DEFAULT_FILTERS.yearRange[0] ? filters.yearRange[0] : undefined,
      yearTo: filters.yearRange[1] !== DEFAULT_FILTERS.yearRange[1] ? filters.yearRange[1] : undefined,
      minRating: filters.minRating > 0 ? filters.minRating : undefined,
      countries: filters.countries.length > 0 ? filters.countries : undefined,
      streamingServices: filters.streamingServices.length > 0 ? filters.streamingServices : undefined,
      priceType: filters.priceType.length > 0 ? filters.priceType : undefined,
      languages: filters.languages.length > 0 ? filters.languages : undefined,
      contentRatings: filters.contentRatings.length > 0 ? filters.contentRatings : undefined,
      sortBy: sortOptions.field,
      sortOrder: sortOptions.direction,
    };
  }

  /**
   * Parse search parameters back to filter options
   */
  public fromSearchParams(params: FilterSearchParams): { filters: FilterOptions; sortOptions: SortOptions } {
    const filters: FilterOptions = {
      contentType: (params.contentType as ContentType[]) || [],
      genres: params.genres || [],
      yearRange: [
        params.yearFrom || DEFAULT_FILTERS.yearRange[0],
        params.yearTo || DEFAULT_FILTERS.yearRange[1],
      ],
      minRating: params.minRating || DEFAULT_FILTERS.minRating,
      countries: params.countries || [],
      streamingServices: params.streamingServices || [],
      priceType: (params.priceType as PriceType[]) || [],
      languages: params.languages || [],
      contentRatings: params.contentRatings || [],
    };

    const sortOptions: SortOptions = {
      field: (params.sortBy as SortField) || DEFAULT_SORT_OPTIONS.field,
      direction: (params.sortOrder as SortDirection) || DEFAULT_SORT_OPTIONS.direction,
    };

    return { filters, sortOptions };
  }

  /**
   * Count active filters
   */
  public countActiveFilters(filters: FilterOptions): number {
    let count = 0;

    if (filters.contentType.length > 0) {count++;}
    if (filters.genres.length > 0) {count++;}
    if (filters.yearRange[0] !== DEFAULT_FILTERS.yearRange[0] ||
        filters.yearRange[1] !== DEFAULT_FILTERS.yearRange[1]) {count++;}
    if (filters.minRating > DEFAULT_FILTERS.minRating) {count++;}
    if (filters.countries.length > 0) {count++;}
    if (filters.streamingServices.length > 0) {count++;}
    if (filters.priceType.length > 0) {count++;}
    if (filters.languages.length > 0) {count++;}
    if (filters.contentRatings.length > 0) {count++;}

    return count;
  }

  /**
   * Validate filter options
   */
  public validateFilters(filters: FilterOptions): FilterValidationResult {
    const errors = [];
    const warnings = [];

    // Year range validation
    const currentYear = new Date().getFullYear();
    if (filters.yearRange[0] < 1900) {
      errors.push({
        field: 'yearRange',
        message: 'Minimum year cannot be before 1900',
        code: 'INVALID_MIN_YEAR',
      });
    }
    if (filters.yearRange[1] > currentYear + 5) {
      warnings.push({
        field: 'yearRange',
        message: 'Maximum year exceeds current year significantly',
        code: 'FUTURE_YEAR',
      });
    }
    if (filters.yearRange[0] > filters.yearRange[1]) {
      errors.push({
        field: 'yearRange',
        message: 'Minimum year cannot be greater than maximum year',
        code: 'INVALID_YEAR_RANGE',
      });
    }

    // Rating validation
    if (filters.minRating < 0 || filters.minRating > 10) {
      errors.push({
        field: 'minRating',
        message: 'Rating must be between 0 and 10',
        code: 'INVALID_RATING_RANGE',
      });
    }

    // Array length validations
    const maxArrayLength = 50;
    if (filters.genres.length > maxArrayLength) {
      warnings.push({
        field: 'genres',
        message: `Too many genres selected (max ${maxArrayLength})`,
        code: 'TOO_MANY_GENRES',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Clear all filters to default values
   */
  public clearFilters(): FilterOptions {
    return { ...DEFAULT_FILTERS };
  }

  /**
   * Clear sort options to default values
   */
  public clearSortOptions(): SortOptions {
    return { ...DEFAULT_SORT_OPTIONS };
  }

  /**
   * Save filter state to persistent storage
   */
  public async saveFilterState(state: Partial<FilterState>): Promise<void> {
    if (!this.options.persistToStorage) {return;}

    try {
      const operations = [];

      if (state.activeFilters) {
        operations.push(
          AsyncStorage.setItem(this.STORAGE_KEYS.FILTERS, JSON.stringify(state.activeFilters)),
        );
      }

      if (state.sortOptions) {
        operations.push(
          AsyncStorage.setItem(this.STORAGE_KEYS.SORT_OPTIONS, JSON.stringify(state.sortOptions)),
        );
      }

      if (state.savedPresets) {
        operations.push(
          AsyncStorage.setItem(this.STORAGE_KEYS.PRESETS, JSON.stringify(state.savedPresets)),
        );
      }

      if (state.recentlyUsed) {
        const limited = state.recentlyUsed.slice(0, this.options.maxRecentPresets);
        operations.push(
          AsyncStorage.setItem(this.STORAGE_KEYS.RECENT_PRESETS, JSON.stringify(limited)),
        );
      }

      await Promise.all(operations);
    } catch (error) {
      logger.error('[FilterService] Error saving filter state', error);
      throw new Error('Failed to save filter state');
    }
  }

  /**
   * Load filter state from persistent storage
   */
  public async loadFilterState(): Promise<Partial<FilterState>> {
    if (!this.options.persistToStorage) {
      return {};
    }

    try {
      const [
        filtersData,
        sortOptionsData,
        presetsData,
        recentPresetsData,
        _preferencesData,
      ] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.FILTERS),
        AsyncStorage.getItem(this.STORAGE_KEYS.SORT_OPTIONS),
        AsyncStorage.getItem(this.STORAGE_KEYS.PRESETS),
        AsyncStorage.getItem(this.STORAGE_KEYS.RECENT_PRESETS),
        AsyncStorage.getItem(this.STORAGE_KEYS.PREFERENCES),
      ]);

      return {
        activeFilters: filtersData ? JSON.parse(filtersData) : DEFAULT_FILTERS,
        sortOptions: sortOptionsData ? JSON.parse(sortOptionsData) : DEFAULT_SORT_OPTIONS,
        savedPresets: presetsData ? JSON.parse(presetsData) : FILTER_PRESETS,
        recentlyUsed: recentPresetsData ? JSON.parse(recentPresetsData) : [],
      };
    } catch (error) {
      logger.error('[FilterService] Error loading filter state', error);
      return {
        activeFilters: DEFAULT_FILTERS,
        sortOptions: DEFAULT_SORT_OPTIONS,
        savedPresets: FILTER_PRESETS,
        recentlyUsed: [],
      };
    }
  }

  /**
   * Save filter preset
   */
  public async savePreset(preset: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<FilterPreset> {
    const newPreset: FilterPreset = {
      ...preset,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
    };

    const savedPresets = await this.getPresets();
    const updatedPresets = [...savedPresets, newPreset];

    await this.saveFilterState({ savedPresets: updatedPresets });
    return newPreset;
  }

  /**
   * Update existing preset
   */
  public async updatePreset(presetId: string, updates: Partial<FilterPreset>): Promise<FilterPreset> {
    const presets = await this.getPresets();
    const presetIndex = presets.findIndex(p => p.id === presetId);

    if (presetIndex === -1) {
      throw new Error('Preset not found');
    }

    const updatedPreset = {
      ...presets[presetIndex],
      ...updates,
      updatedAt: new Date(),
    };

    presets[presetIndex] = updatedPreset;
    await this.saveFilterState({ savedPresets: presets });

    return updatedPreset;
  }

  /**
   * Delete preset
   */
  public async deletePreset(presetId: string): Promise<void> {
    const presets = await this.getPresets();
    const filteredPresets = presets.filter(p => p.id !== presetId && !p.isSystem);

    await this.saveFilterState({ savedPresets: filteredPresets });
  }

  /**
   * Get all presets
   */
  public async getPresets(): Promise<FilterPreset[]> {
    const state = await this.loadFilterState();
    return state.savedPresets || FILTER_PRESETS;
  }

  /**
   * Get preset by ID
   */
  public async getPreset(presetId: string): Promise<FilterPreset | null> {
    const presets = await this.getPresets();
    return presets.find(p => p.id === presetId) || null;
  }

  /**
   * Apply preset and update usage count
   */
  public async applyPreset(presetId: string): Promise<FilterPreset> {
    const preset = await this.getPreset(presetId);
    if (!preset) {
      throw new Error('Preset not found');
    }

    // Update usage count
    const updatedPreset = await this.updatePreset(presetId, {
      usageCount: preset.usageCount + 1,
    });

    // Add to recently used
    await this.addToRecentlyUsed(updatedPreset);

    return updatedPreset;
  }

  /**
   * Add preset to recently used
   */
  public async addToRecentlyUsed(preset: FilterPreset): Promise<void> {
    const state = await this.loadFilterState();
    const recentlyUsed = state.recentlyUsed || [];

    // Remove if already exists
    const filtered = recentlyUsed.filter(p => p.id !== preset.id);

    // Add to beginning
    const updated = [preset, ...filtered].slice(0, this.options.maxRecentPresets);

    await this.saveFilterState({ recentlyUsed: updated });
  }

  /**
   * Get recently used presets
   */
  public async getRecentlyUsed(): Promise<FilterPreset[]> {
    const state = await this.loadFilterState();
    return state.recentlyUsed || [];
  }

  /**
   * Export presets and preferences
   */
  public async exportData(): Promise<FilterExport> {
    const state = await this.loadFilterState();
    const preferences = await this.getPreferences();

    return {
      version: '1.0.0',
      presets: state.savedPresets || FILTER_PRESETS,
      preferences,
      exportedAt: new Date(),
    };
  }

  /**
   * Import presets and preferences
   */
  public async importData(data: FilterExport): Promise<void> {
    try {
      await this.saveFilterState({
        savedPresets: data.presets,
      });

      if (data.preferences) {
        await this.savePreferences(data.preferences);
      }
    } catch (error) {
      logger.error('[FilterService] Error importing filter data', error);
      throw new Error('Failed to import filter data');
    }
  }

  /**
   * Get filter preferences
   */
  public async getPreferences(): Promise<FilterPreferences> {
    if (!this.options.persistToStorage) {
      return this.getDefaultPreferences();
    }

    try {
      const preferencesData = await AsyncStorage.getItem(this.STORAGE_KEYS.PREFERENCES);
      return preferencesData ? JSON.parse(preferencesData) : this.getDefaultPreferences();
    } catch (error) {
      logger.error('[FilterService] Error loading filter preferences', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Save filter preferences
   */
  public async savePreferences(preferences: Partial<FilterPreferences>): Promise<void> {
    if (!this.options.persistToStorage) {return;}

    try {
      const currentPreferences = await this.getPreferences();
      const updatedPreferences = { ...currentPreferences, ...preferences };
      await AsyncStorage.setItem(this.STORAGE_KEYS.PREFERENCES, JSON.stringify(updatedPreferences));
    } catch (error) {
      logger.error('[FilterService] Error saving filter preferences', error);
      throw new Error('Failed to save filter preferences');
    }
  }

  /**
   * Record filter analytics
   */
  public async recordAnalytics(analytics: FilterAnalytics): Promise<void> {
    if (!this.options.persistToStorage) {return;}

    try {
      const analyticsData = await AsyncStorage.getItem(this.STORAGE_KEYS.ANALYTICS);
      const allAnalytics: FilterAnalytics[] = analyticsData ? JSON.parse(analyticsData) : [];

      // Keep only last 1000 records
      const updatedAnalytics = [...allAnalytics, analytics].slice(-1000);

      await AsyncStorage.setItem(this.STORAGE_KEYS.ANALYTICS, JSON.stringify(updatedAnalytics));
    } catch (error) {
      logger.error('[FilterService] Error recording filter analytics', error);
    }
  }

  /**
   * Get filter analytics
   */
  public async getAnalytics(limit: number = 100): Promise<FilterAnalytics[]> {
    if (!this.options.persistToStorage) {return [];}

    try {
      const analyticsData = await AsyncStorage.getItem(this.STORAGE_KEYS.ANALYTICS);
      const allAnalytics: FilterAnalytics[] = analyticsData ? JSON.parse(analyticsData) : [];
      return allAnalytics.slice(-limit);
    } catch (error) {
      logger.error('[FilterService] Error loading filter analytics', error);
      return [];
    }
  }

  /**
   * Debounced function execution
   */
  public debounce(key: string, fn: () => void): void {
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      fn();
      this.debounceTimers.delete(key);
    }, this.options.debounceMs);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Clear all debounce timers
   */
  public clearDebounceTimers(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): FilterPreferences {
    return {
      defaultSortOptions: DEFAULT_SORT_OPTIONS,
      autoApplyFilters: false,
      showFilterCount: true,
      compactView: false,
      animationsEnabled: true,
    };
  }

  /**
   * Clear all stored data
   */
  public async clearAllData(): Promise<void> {
    if (!this.options.persistToStorage) {return;}

    try {
      await Promise.all([
        AsyncStorage.removeItem(this.STORAGE_KEYS.FILTERS),
        AsyncStorage.removeItem(this.STORAGE_KEYS.SORT_OPTIONS),
        AsyncStorage.removeItem(this.STORAGE_KEYS.PRESETS),
        AsyncStorage.removeItem(this.STORAGE_KEYS.PREFERENCES),
        AsyncStorage.removeItem(this.STORAGE_KEYS.RECENT_PRESETS),
        AsyncStorage.removeItem(this.STORAGE_KEYS.ANALYTICS),
      ]);
    } catch (error) {
      logger.error('[FilterService] Error clearing filter data', error);
      throw new Error('Failed to clear filter data');
    }
  }
}

export default FilterService;
