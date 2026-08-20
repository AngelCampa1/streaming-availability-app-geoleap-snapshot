import { useState, useEffect, useCallback, useMemo } from 'react';
import { FilterState } from '@/components/search/AdvancedFilters';
import {
  filterApi,
  FilterOptionsResponse,
  FilterValidationResponse,
  FilterSuggestion,
  FilterAnalysisResponse,
  filterStateToRequest,
  FilterOptionsRequest,
} from '@/lib/streaming-service-api';

interface UseAdvancedFiltersProps {
  initialFilters?: FilterState;
  query?: string;
  onFiltersChange?: (filters: FilterState) => void;
  persistFilters?: boolean;
  storageKey?: string;
}

interface UseAdvancedFiltersReturn {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  clearFilters: () => void;
  clearFilter: (key: keyof FilterState) => void;

  // Filter options
  filterOptions: FilterOptionsResponse | null;
  loadingOptions: boolean;
  optionsError: string | null;
  refreshOptions: () => Promise<void>;

  // Filter validation
  validation: FilterValidationResponse | null;
  validating: boolean;
  validationError: string | null;
  validateFilters: () => Promise<void>;

  // Filter suggestions
  suggestions: FilterSuggestion[];
  loadingSuggestions: boolean;
  getSuggestions: (resultCount: number) => Promise<void>;

  // Filter analysis
  analysis: FilterAnalysisResponse | null;
  analyzing: boolean;
  analyzeFilters: () => Promise<void>;

  // Utilities
  hasActiveFilters: boolean;
  activeFilterCount: number;
  isFiltersValid: boolean;
  getFilterSummary: () => string;
}

const STORAGE_PREFIX = 'geoleap_filters_';

export function useAdvancedFilters({
  initialFilters = {},
  query = '',
  onFiltersChange,
  persistFilters = false,
  storageKey = 'default',
}: UseAdvancedFiltersProps = {}): UseAdvancedFiltersReturn {
  // Load initial filters from localStorage if persistence is enabled
  const loadPersistedFilters = useCallback((): FilterState => {
    if (!persistFilters || typeof window === 'undefined') return initialFilters;

    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...initialFilters, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load persisted filters:', error);
    }

    return initialFilters;
  }, [initialFilters, persistFilters, storageKey]);

  // State management
  const [filters, setFiltersState] = useState<FilterState>(loadPersistedFilters);
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [validation, setValidation] = useState<FilterValidationResponse | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<FilterSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [analysis, setAnalysis] = useState<FilterAnalysisResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Persist filters to localStorage
  const persistFiltersToStorage = useCallback(
    (newFilters: FilterState) => {
      if (!persistFilters || typeof window === 'undefined') return;

      try {
        localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(newFilters));
      } catch (error) {
        console.warn('Failed to persist filters:', error);
      }
    },
    [persistFilters, storageKey]
  );

  // Update filters with persistence and callbacks
  const setFilters = useCallback(
    (newFilters: FilterState) => {
      setFiltersState(newFilters);
      persistFiltersToStorage(newFilters);
      onFiltersChange?.(newFilters);
    },
    [persistFiltersToStorage, onFiltersChange]
  );

  // Update individual filter
  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      const newFilters = { ...filters, [key]: value };
      // Remove undefined values
      if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
        delete newFilters[key];
      }
      setFilters(newFilters);
    },
    [filters, setFilters]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, [setFilters]);

  // Clear individual filter
  const clearFilter = useCallback(
    (key: keyof FilterState) => {
      const newFilters = { ...filters };
      delete newFilters[key];
      setFilters(newFilters);
    },
    [filters, setFilters]
  );

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).reduce((count, [key, value]) => {
      if (key === 'contentType' && value === 'All') return count;
      if (Array.isArray(value) && value.length > 0) return count + 1;
      if (typeof value === 'boolean' && value) return count + 1;
      if (typeof value === 'number' && value > 0) return count + 1;
      if (typeof value === 'string' && value.length > 0) return count + 1;
      return count;
    }, 0);
  }, [filters]);

  // Load filter options
  const refreshOptions = useCallback(async () => {
    setLoadingOptions(true);
    setOptionsError(null);

    try {
      const request: FilterOptionsRequest = {
        contentType: filters.contentType || 'All',
        language: 'en-US',
      };

      const options = await filterApi.getFilterOptions(request);
      setFilterOptions(options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load filter options';
      setOptionsError(errorMessage);
      console.error('Filter options error:', error);
    } finally {
      setLoadingOptions(false);
    }
  }, [filters.contentType]);

  // Validate current filters
  const validateFilters = useCallback(async () => {
    if (!query && activeFilterCount === 0) return;

    setValidating(true);
    setValidationError(null);

    try {
      const request = filterStateToRequest(filters, query);
      const validationResult = await filterApi.validateFilters(request);
      setValidation(validationResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate filters';
      setValidationError(errorMessage);
      console.error('Filter validation error:', error);
    } finally {
      setValidating(false);
    }
  }, [filters, query, activeFilterCount]);

  // Get filter suggestions
  const getSuggestions = useCallback(
    async (resultCount: number) => {
      if (!query && activeFilterCount === 0) return;

      setLoadingSuggestions(true);

      try {
        const request = filterStateToRequest(filters, query);
        const filterSuggestions = await filterApi.getFilterSuggestions(request, resultCount);
        setSuggestions(filterSuggestions);
      } catch (error) {
        console.error('Filter suggestions error:', error);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    },
    [filters, query, activeFilterCount]
  );

  // Analyze current filters
  const analyzeFilters = useCallback(async () => {
    if (!query && activeFilterCount === 0) return;

    setAnalyzing(true);

    try {
      const request = filterStateToRequest(filters, query);
      const analysisResult = await filterApi.analyzeFilters(request);
      setAnalysis(analysisResult);
    } catch (error) {
      console.error('Filter analysis error:', error);
      setAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  }, [filters, query, activeFilterCount]);

  // Computed values
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'contentType' && value === 'All') return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value > 0;
      if (typeof value === 'string') return value.length > 0;
      return value != null;
    });
  }, [filters]);

  const isFiltersValid = useMemo(() => {
    return validation?.isValid !== false;
  }, [validation]);

  const getFilterSummary = useCallback((): string => {
    if (activeFilterCount === 0) return 'No filters applied';
    if (activeFilterCount === 1) return '1 filter applied';
    return `${activeFilterCount} filters applied`;
  }, [activeFilterCount]);

  // Auto-load filter options on mount and when content type changes
  useEffect(() => {
    refreshOptions();
  }, [refreshOptions]);

  // Auto-validate filters when they change
  useEffect(() => {
    if (hasActiveFilters || query) {
      const debounceTimer = setTimeout(() => {
        validateFilters();
      }, 500); // Debounce validation calls

      return () => clearTimeout(debounceTimer);
    } else {
      setValidation(null);
    }
  }, [filters, query, hasActiveFilters, validateFilters]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    clearFilter,

    filterOptions,
    loadingOptions,
    optionsError,
    refreshOptions,

    validation,
    validating,
    validationError,
    validateFilters,

    suggestions,
    loadingSuggestions,
    getSuggestions,

    analysis,
    analyzing,
    analyzeFilters,

    hasActiveFilters,
    activeFilterCount,
    isFiltersValid,
    getFilterSummary,
  };
}
