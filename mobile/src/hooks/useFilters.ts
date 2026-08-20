/**
 * useFilters Hook - State management for advanced filtering system
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';
import { useFocusEffect } from '@react-navigation/native';
import FilterService from '../services/filters/FilterService';
import {
  FilterOptions,
  SortOptions,
  FilterPreset,
  FilterAnalytics,
  FilterValidationResult,
  FilterSearchParams,
  DEFAULT_FILTERS,
  DEFAULT_SORT_OPTIONS,
} from '../types/filters';

interface UseFiltersOptions {
  autoSave?: boolean;
  debounceMs?: number;
  onFiltersChange?: (filters: FilterOptions) => void;
  onSortChange?: (sortOptions: SortOptions) => void;
  onError?: (error: Error) => void;
}

interface UseFiltersReturn {
  // State
  filters: FilterOptions;
  sortOptions: SortOptions;
  isFilterModalVisible: boolean;
  activePresetId?: string;
  quickFilters: string[];
  recentlyUsed: FilterPreset[];
  savedPresets: FilterPreset[];
  filterCount: number;
  isLoading: boolean;
  validation: FilterValidationResult;

  // Actions
  setFilters: (filters: FilterOptions) => void;
  setSortOptions: (sortOptions: SortOptions) => void;
  updateFilter: (key: keyof FilterOptions, value: any) => void;
  clearFilters: () => void;
  clearAll: () => void;

  // Modal
  showFilterModal: () => void;
  hideFilterModal: () => void;
  applyFilters: (filters: FilterOptions, sortOptions: SortOptions) => void;

  // Presets
  applyPreset: (presetId: string) => void;
  savePreset: (preset: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => Promise<FilterPreset>;
  updatePreset: (presetId: string, updates: Partial<FilterPreset>) => Promise<FilterPreset>;
  deletePreset: (presetId: string) => Promise<void>;

  // Quick Filters
  toggleQuickFilter: (value: string) => void;
  setQuickFilters: (filters: string[]) => void;

  // Utilities
  getSearchParams: () => FilterSearchParams;
  hasActiveFilters: () => boolean;
  isDefaultState: () => boolean;
  resetToDefaults: () => void;

  // Analytics
  recordAnalytics: (resultCount: number, executionTime: number) => void;
}

export const useFilters = (options: UseFiltersOptions = {}): UseFiltersReturn => {
  const {
    autoSave = true,
    debounceMs = 300,
    onFiltersChange,
    onSortChange,
    onError,
  } = options;

  // Initialize service
  const filterService = useRef(FilterService.getInstance({ debounceMs }));

  // Stabilize callback refs to avoid brittle dependencies
  const onFiltersChangeRef = useRef(onFiltersChange);
  const onSortChangeRef = useRef(onSortChange);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onFiltersChangeRef.current = onFiltersChange;
    onSortChangeRef.current = onSortChange;
    onErrorRef.current = onError;
  }, [onFiltersChange, onSortChange, onError]);

  // State
  const [filters, setFiltersState] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [sortOptions, setSortOptionsState] = useState<SortOptions>(DEFAULT_SORT_OPTIONS);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | undefined>();
  const [quickFilters, setQuickFiltersState] = useState<string[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<FilterPreset[]>([]);
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>([]);
  const [filterCount, setFilterCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [validation, setValidation] = useState<FilterValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
  });

  // Load initial state
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        setIsLoading(true);
        const state = await filterService.current.loadFilterState();

        if (state.activeFilters) {
          setFiltersState(state.activeFilters);
        }
        if (state.sortOptions) {
          setSortOptionsState(state.sortOptions);
        }
        if (state.recentlyUsed) {
          setRecentlyUsed(state.recentlyUsed);
        }
        if (state.savedPresets) {
          setSavedPresets(state.savedPresets);
        }

        // Load preferences
        const preferences = await filterService.current.getPreferences();
        if (preferences && preferences.showFilterCount) {
          setFilterCount(filterService.current.countActiveFilters(state.activeFilters || DEFAULT_FILTERS));
        }
      } catch (error) {
        logger.error('[useFilters] Error loading filter state', error);
        onErrorRef.current?.(error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialState();
  }, []); // Empty dependencies - refs are stable

  // Update filter count when filters change
  useEffect(() => {
    const count = filterService.current.countActiveFilters(filters);
    setFilterCount(count);
  }, [filters]);

  // Validate filters when they change
  useEffect(() => {
    const validation = filterService.current.validateFilters(filters);
    setValidation(validation);
  }, [filters]);

  // Auto-save when filters change
  useEffect(() => {
    if (autoSave && !isLoading) {
      filterService.current.debounce('autoSave', async () => {
        try {
          await filterService.current.saveFilterState({
            activeFilters: filters,
            sortOptions: sortOptions,
            recentlyUsed: recentlyUsed,
            savedPresets: savedPresets,
          });
        } catch (error) {
          logger.error('[useFilters] Error auto-saving filters', error);
          onErrorRef.current?.(error as Error);
        }
      });
    }
  }, [filters, sortOptions, recentlyUsed, savedPresets, autoSave, isLoading]); // Only data dependencies

  // Call change callbacks - only depend on data
  useEffect(() => {
    onFiltersChangeRef.current?.(filters);
  }, [filters]); // Only data dependency

  useEffect(() => {
    onSortChangeRef.current?.(sortOptions);
  }, [sortOptions]); // Only data dependency

  // Actions
  const setFilters = useCallback((newFilters: FilterOptions) => {
    setFiltersState(newFilters);
    setActivePresetId(undefined);
  }, []);

  const setSortOptions = useCallback((newSortOptions: SortOptions) => {
    setSortOptionsState(newSortOptions);
    setActivePresetId(undefined);
  }, []);

  const updateFilter = useCallback((key: keyof FilterOptions, value: any) => {
    setFiltersState(prev => ({
      ...prev,
      [key]: value,
    }));
    setActivePresetId(undefined);
  }, []);

  const clearFilters = useCallback(() => {
    const cleared = filterService.current.clearFilters();
    setFiltersState(cleared);
    setActivePresetId(undefined);
  }, []);

  const clearAll = useCallback(() => {
    setFiltersState(filterService.current.clearFilters());
    setSortOptionsState(filterService.current.clearSortOptions());
    setActivePresetId(undefined);
  }, []);

  // Modal actions
  const showFilterModal = useCallback(() => {
    setIsFilterModalVisible(true);
  }, []);

  const hideFilterModal = useCallback(() => {
    setIsFilterModalVisible(false);
  }, []);

  const applyFilters = useCallback((newFilters: FilterOptions, newSortOptions: SortOptions) => {
    const validation = filterService.current.validateFilters(newFilters);

    if (validation.isValid) {
      setFiltersState(newFilters);
      setSortOptionsState(newSortOptions);
      setActivePresetId(undefined);
      hideFilterModal();
    } else {
      // Handle validation errors
      logger.warn('[useFilters] Invalid filters applied', { errors: validation.errors });
      onError?.(new Error('Invalid filters: ' + validation.errors.map(e => e.message).join(', ')));
    }
  }, [hideFilterModal, onError]);

  // Preset actions
  const applyPreset = useCallback(async (presetId: string) => {
    try {
      const preset = await filterService.current.applyPreset(presetId);
      setFiltersState(preset.filters);
      setSortOptionsState(preset.sortOptions);
      setActivePresetId(presetId);

      // Update recently used
      setRecentlyUsed(prev => {
        const filtered = prev.filter(p => p.id !== presetId);
        return [preset, ...filtered].slice(0, 10);
      });
    } catch (error) {
      logger.error('[useFilters] Error applying preset', error);
      onError?.(error as Error);
    }
  }, [onError]);

  const savePreset = useCallback(async (presetData: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    try {
      const newPreset = await filterService.current.savePreset(presetData);
      setSavedPresets(prev => [...prev, newPreset]);
      return newPreset;
    } catch (error) {
      logger.error('[useFilters] Error saving preset', error);
      onError?.(error as Error);
      throw error;
    }
  }, [onError]);

  const updatePreset = useCallback(async (presetId: string, updates: Partial<FilterPreset>) => {
    try {
      const updatedPreset = await filterService.current.updatePreset(presetId, updates);
      setSavedPresets(prev => prev.map(p => p.id === presetId ? updatedPreset : p));

      // Update active preset if it's the one being updated
      if (activePresetId === presetId) {
        setFiltersState(updatedPreset.filters);
        setSortOptionsState(updatedPreset.sortOptions);
      }

      return updatedPreset;
    } catch (error) {
      logger.error('[useFilters] Error updating preset', error);
      onError?.(error as Error);
      throw error;
    }
  }, [activePresetId, onError]);

  const deletePreset = useCallback(async (presetId: string) => {
    try {
      await filterService.current.deletePreset(presetId);
      setSavedPresets(prev => prev.filter(p => p.id !== presetId));

      // Clear active preset if it was deleted
      if (activePresetId === presetId) {
        setActivePresetId(undefined);
      }
    } catch (error) {
      logger.error('[useFilters] Error deleting preset', error);
      onError?.(error as Error);
    }
  }, [activePresetId, onError]);

  // Quick filters
  const toggleQuickFilter = useCallback((value: string) => {
    setQuickFiltersState(prev => {
      if (prev.includes(value)) {
        return prev.filter(f => f !== value);
      } else {
        return [...prev, value];
      }
    });
  }, []);

  const setQuickFilters = useCallback((newQuickFilters: string[]) => {
    setQuickFiltersState(newQuickFilters);
  }, []);

  // Utilities
  const getSearchParams = useCallback((): FilterSearchParams => {
    return filterService.current.toSearchParams(filters, sortOptions);
  }, [filters, sortOptions]);

  const hasActiveFilters = useCallback((): boolean => {
    return filterCount > 0;
  }, [filterCount]);

  const isDefaultState = useCallback((): boolean => {
    return filterCount === 0 &&
           sortOptions.field === DEFAULT_SORT_OPTIONS.field &&
           sortOptions.direction === DEFAULT_SORT_OPTIONS.direction;
  }, [filterCount, sortOptions]);

  const resetToDefaults = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setSortOptionsState(DEFAULT_SORT_OPTIONS);
    setActivePresetId(undefined);
    setQuickFilters([]);
  }, []);

  // Analytics
  const recordAnalytics = useCallback((resultCount: number, executionTime: number) => {
    const analytics: FilterAnalytics = {
      presetId: activePresetId,
      filters,
      sortOptions,
      resultCount,
      executionTime,
      timestamp: new Date(),
    };

    filterService.current.recordAnalytics(analytics);
  }, [activePresetId, filters, sortOptions]);

  // Handle app focus to refresh data
  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        try {
          const state = await filterService.current.loadFilterState();

          // Only update if user hasn't made changes
          if (isDefaultState()) {
            if (state.activeFilters) {setFiltersState(state.activeFilters);}
            if (state.sortOptions) {setSortOptionsState(state.sortOptions);}
          }

          if (state.recentlyUsed) {setRecentlyUsed(state.recentlyUsed);}
          if (state.savedPresets) {setSavedPresets(state.savedPresets);}
        } catch (error) {
          logger.error('[useFilters] Error refreshing filter data', error);
        }
      };

      refreshData();
    }, [isDefaultState]),
  );

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      filterService.current.clearDebounceTimers();
    };
  }, []);

  return {
    // State
    filters,
    sortOptions,
    isFilterModalVisible,
    activePresetId,
    quickFilters,
    recentlyUsed,
    savedPresets,
    filterCount,
    isLoading,
    validation,

    // Actions
    setFilters,
    setSortOptions,
    updateFilter,
    clearFilters,
    clearAll,

    // Modal
    showFilterModal,
    hideFilterModal,
    applyFilters,

    // Presets
    applyPreset,
    savePreset,
    updatePreset,
    deletePreset,

    // Quick Filters
    toggleQuickFilter,
    setQuickFilters,

    // Utilities
    getSearchParams,
    hasActiveFilters,
    isDefaultState,
    resetToDefaults,

    // Analytics
    recordAnalytics,
  };
};

export default useFilters;
