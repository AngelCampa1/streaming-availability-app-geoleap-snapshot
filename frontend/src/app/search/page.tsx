'use client';

import React, { useState, useEffect, Suspense, useCallback, lazy, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildSearchSections } from '@/lib/seo/related-links';
import { FilterState } from '@/components/search/AdvancedFilters';
import { SearchFilterManager } from '@/lib/search-filter-manager';
import { ContentType, GlobalSearchRequest, PaywalledSearchResult } from '@/lib/types/paywall';
import { AutocompleteSuggestion } from '@/lib/types/autocomplete';
import { useDebouncedCallback } from '@/lib/performance-utils';
import { UnifiedAnalytics } from '@/lib/analytics/unified-analytics';
import { buildContentPathFromResult } from '@/lib/search/content-navigation';
import { AVAILABLE_SEARCH_FILTERS } from '@/lib/searchFilters';

// Lazy load ALL heavy components for optimal initial page load (Bug #3 fix)
// Use OptimizedSearchResults with React Query caching for performance
// Pattern to filter out potentially malicious strings from search history
const SUSPICIOUS_SEARCH_PATTERN = /(?:alert\s*\(|javascript:|onerror\s*=|onload\s*=|<script|'\s*;\s*DROP\s|'\s*;\s*DELETE\s|'\s*;\s*INSERT\s|UNION\s+SELECT|'\s*OR\s+1\s*=\s*1)/i;

const SearchResults = lazy(() => import('@/components/search/OptimizedSearchResults'));
const EnhancedAutocomplete = lazy(() => import('@/components/search/EnhancedAutocomplete'));
const FilterSidebar = lazy(() => import('@/components/search/FilterSidebar'));
const SortDropdown = lazy(() => import('@/components/search/SortDropdown'));
const MobileFilterDrawer = lazy(() => import('@/components/search/MobileFilterDrawer'));
const ClearFiltersButton = lazy(() => import('@/components/search/ClearFiltersButton'));

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Partial<GlobalSearchRequest>>({});
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({});
  const [sortBy, setSortBy] = useState('relevance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  // UX Improvement: Track when filters are being applied
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  // BUG-E2E-002 FIX: Track search errors to clear loading state
  const [searchError, setSearchError] = useState<string | null>(null);
  // Memoize filter manager to prevent recreation on re-renders
  const filterManager = useMemo(() => new SearchFilterManager(), []);

  // BUG FIX: Sanitize existing search history on mount to clean up any XSS payloads
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const history: string[] = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      const sanitizedHistory = history
        .map(item => item.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim())
        .filter(item => item.length > 0 && item.length < 200)
        .filter(item => !SUSPICIOUS_SEARCH_PATTERN.test(item));

      // Only update if we actually cleaned something
      if (JSON.stringify(history) !== JSON.stringify(sanitizedHistory)) {
        localStorage.setItem('searchHistory', JSON.stringify(sanitizedHistory));
        // Search history cleaned of potential XSS entries
      }
    } catch {
      // If parsing fails, reset the history
      localStorage.setItem('searchHistory', '[]');
    }
  }, []);

  useEffect(() => {
    // Support both ?q= (preferred) and ?query= (from trending links) for URL query parameters
    const query = searchParams.get('q') || searchParams.get('query') || '';
    setSearchQuery(query);

    // Initialize filter manager from URL
    filterManager.fromURLSearchParams(searchParams);
    const managerFilters = filterManager.getFilters();

    setFilters(filterManager.getSearchRequest());
    setSortBy(managerFilters.sortBy || 'relevance');
    setSortDirection(managerFilters.sortDirection || 'desc');
  }, [searchParams, filterManager]);

  // BUG-E2E-002 FIX: Auto-clear loading state after timeout to prevent infinite loading
  useEffect(() => {
    if (!isFilterLoading) return;

    // Clear loading state after 5 seconds max to prevent indefinite loading
    const timeoutId = setTimeout(() => {
      setIsFilterLoading(false);
      setSearchError('Search is taking longer than expected. Please try again.');
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [isFilterLoading]);

  // Debounced URL update to prevent excessive router pushes
  const debouncedUpdateURL = useDebouncedCallback(
    () => {
      const params = filterManager.toURLSearchParams();
      router.push(`/search?${params.toString()}`);
      setSearchError(null); // Clear any previous errors
      // UX Improvement: Clear loading state after URL update
      setTimeout(() => setIsFilterLoading(false), 100);
    },
    400,
    [filterManager, router]
  );

  const updateSearchQuery = useCallback(
    (query: string) => {
      setSearchQuery(query);
      filterManager.updateFilter('query', query);
      debouncedUpdateURL();
    },
    [filterManager, debouncedUpdateURL]
  );

  const handleSearchSubmit = (query: string) => {
    updateSearchQuery(query);
    // UX Improvement: Save to search history
    saveSearchHistory(query);
  };

  // UX Improvement: Save search history to localStorage
  // BUG-F24: Check user preferences before saving search history
  // BUG FIX: Sanitize queries to prevent XSS payloads in Recent Searches
  const saveSearchHistory = useCallback((query: string) => {
    if (!query.trim() || typeof window === 'undefined') return;

    try {
      // Check if user has opted out of search history tracking
      const privacyPrefs = localStorage.getItem('privacyPreferences');
      if (privacyPrefs) {
        const prefs = JSON.parse(privacyPrefs);
        if (prefs.disableSearchHistory === true) return;
      }

      // BUG FIX: Sanitize query before saving to prevent XSS attacks
      const sanitizedQuery = query
        .replace(/<[^>]*>/g, '')  // Remove HTML tags
        .replace(/[<>]/g, '')     // Remove remaining angle brackets
        .trim();

      // Don't save if empty or matches suspicious XSS patterns
      if (!sanitizedQuery || SUSPICIOUS_SEARCH_PATTERN.test(sanitizedQuery)) return;

      const history: string[] = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      // Remove duplicate if exists, then add to front
      const filtered = history.filter(h => h.toLowerCase() !== sanitizedQuery.toLowerCase());
      const updated = [sanitizedQuery, ...filtered].slice(0, 10); // Keep last 10 searches
      localStorage.setItem('searchHistory', JSON.stringify(updated));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, []);

  const handleSuggestionSelected = (suggestion: AutocompleteSuggestion) => {
    updateSearchQuery(suggestion.text);
    // UX Improvement: Save to search history when selecting suggestion
    saveSearchHistory(suggestion.text);
  };

  const handleUpgradeClick = () => {
    router.push('/pricing');
  };

  const handleResultClick = useCallback((result: PaywalledSearchResult) => {
    UnifiedAnalytics.getInstance().trackEvent('search_result_click', {
      resultId: result.id,
      resultTitle: result.title,
      resultType: result.type,
      query: searchParams.get('q') || searchParams.get('query') || '',
    });
    router.push(buildContentPathFromResult(result));
  }, [router, searchParams]);

  // Handle filter changes through the filter manager
  const handleFilterChange = useCallback(
    (newFilters: Partial<GlobalSearchRequest>) => {
      // UX Improvement: Set loading state immediately for visual feedback
      setIsFilterLoading(true);
      filterManager.updateFilters(newFilters);
      setFilters(filterManager.getSearchRequest());
      debouncedUpdateURL();
    },
    [filterManager, debouncedUpdateURL]
  );

  // Handle sort changes
  const handleSortChange = useCallback(
    (newSortBy: string, direction: 'asc' | 'desc') => {
      // UX Improvement: Set loading state immediately for visual feedback
      setIsFilterLoading(true);
      setSortBy(newSortBy);
      setSortDirection(direction);
      filterManager.updateFilters({ sortBy: newSortBy, sortDirection: direction });
      debouncedUpdateURL();
    },
    [filterManager, debouncedUpdateURL]
  );

  // Clear filters handler
  const handleClearFilters = useCallback(() => {
    filterManager.clearFilters(true); // Keep query
    const clearedFilters = filterManager.getSearchRequest();
    setFilters(clearedFilters);
    setAdvancedFilters({});
    setSortBy('relevance');
    setSortDirection('desc');
    debouncedUpdateURL();
  }, [filterManager, debouncedUpdateURL]);

  // Memoize active filters count to prevent unnecessary recalculations
  const activeFiltersCount = useMemo(() => filterManager.getActiveFilterCount(), [filterManager]);

  // Memoize expensive filter conversion
  const convertFiltersToSearchRequest = useCallback((advancedFilters: FilterState): Partial<GlobalSearchRequest> => {
    const converted: Partial<GlobalSearchRequest> = {};

    if (advancedFilters.contentType && advancedFilters.contentType !== 'All') {
      if (advancedFilters.contentType === 'Movie') {
        converted.contentType = ContentType.Movie;
      } else if (advancedFilters.contentType === 'Show') {
        converted.contentType = ContentType.Show;
      }
    }

    if (advancedFilters.genres) converted.genres = advancedFilters.genres;
    if (advancedFilters.countries) converted.countries = advancedFilters.countries;
    if (advancedFilters.services) converted.services = advancedFilters.services;
    if (advancedFilters.yearFrom) converted.yearFrom = advancedFilters.yearFrom;
    if (advancedFilters.yearTo) converted.yearTo = advancedFilters.yearTo;
    if (advancedFilters.minRating) converted.minRating = advancedFilters.minRating;
    if (advancedFilters.maxRating) converted.maxRating = advancedFilters.maxRating;

    return converted;
  }, []);

  return (
    <AppLayout maxWidth="full">
      <h1 className="sr-only">Search Streaming Content</h1>
      {/* Search Controls Section */}
      <div className="bg-surface shadow-sm border-b -mx-4 px-4 py-4 sm:py-6 mb-4 sm:mb-6">
        {/* Enhanced Search Form */}
        <Suspense
              fallback={
                <div className="mb-3 sm:mb-4">
                  <div className="w-full h-12 bg-muted animate-pulse rounded-lg"></div>
                </div>
              }
            >
              <EnhancedAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                onSuggestionSelected={handleSuggestionSelected}
                onSubmit={handleSearchSubmit}
                placeholder="Search movies, shows, actors..."
                maxSuggestions={8}
                showVisualElements={true}
                includeHistory={true}
                includeTrending={true}
                autoFocus={!searchQuery}
                className="mb-3 sm:mb-4"
              />
            </Suspense>

            {/* Enhanced Filter Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-4 text-mobile-sm sm:text-sm overflow-x-auto mobile-scroll-smooth pb-2">
                <span className="font-medium text-foreground-muted whitespace-nowrap transition-colors duration-200">
                  Filters:
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full transition-all duration-200 hover:bg-primary/20 hover:scale-105 cursor-default">
                      {activeFiltersCount}
                    </span>
                  )}
                </span>

                {/* BUG-E2E-002 FIX: Filters remain interactive during loading */}
                <select
                  value={filters.contentType?.toString() || ''}
                  onChange={e =>
                    handleFilterChange({
                      contentType: e.target.value ? (parseInt(e.target.value) as ContentType) : undefined,
                    })
                  }
                  disabled={false}
                  className="border border-border bg-background text-foreground rounded-md px-2 sm:px-3 py-1 min-h-[44px] focus:ring-2 focus:ring-ring focus:border-transparent mobile-no-zoom touch-target transition-all duration-200 hover:border-primary/50 hover:shadow-sm motion-safe:hover:scale-105 motion-safe:focus:scale-105"
                >
                  <option value="">All Types</option>
                  <option value={ContentType.Movie}>Movies</option>
                  <option value={ContentType.Show}>TV Shows</option>
                  <option value={ContentType.Documentary}>Docs</option>
                  <option value={ContentType.Anime}>Anime</option>
                </select>

                <select
                  value={filters.yearFrom?.toString() || ''}
                  onChange={e =>
                    handleFilterChange({
                      yearFrom: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  disabled={false}
                  className="border border-border bg-background text-foreground rounded-md px-2 sm:px-3 py-1 min-h-[44px] focus:ring-2 focus:ring-ring focus:border-transparent mobile-no-zoom touch-target transition-all duration-200 hover:border-primary/50 hover:shadow-sm motion-safe:hover:scale-105 motion-safe:focus:scale-105"
                >
                  <option value="">Any Year</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2020">2020+</option>
                  <option value="2010">2010+</option>
                  <option value="2000">2000+</option>
                </select>

                {/* New Sort Dropdown (mobile inline) */}
                <Suspense fallback={<div className="w-24 h-8 bg-muted animate-pulse rounded"></div>}>
                  <div className="sm:hidden">
                    <SortDropdown
                      value={sortBy}
                      direction={sortDirection}
                      onValueChange={value => handleSortChange(value, sortDirection)}
                      onDirectionChange={direction => handleSortChange(sortBy, direction)}
                      options={[
                        { value: 'relevance', label: 'Relevance' },
                        { value: 'rating', label: 'Rating' },
                        { value: 'year', label: 'Year' },
                        { value: 'popularity', label: 'Popular' },
                      ]}
                      className="flex-shrink-0"
                    />
                  </div>
                </Suspense>

                {/* Clear filters button (mobile) */}
                {activeFiltersCount > 0 && (
                  <Suspense fallback={<div className="w-8 h-8 bg-muted animate-pulse rounded"></div>}>
                    <div className="sm:hidden">
                      <ClearFiltersButton
                        onClearFilters={handleClearFilters}
                        activeFiltersCount={activeFiltersCount}
                        showConfirmation={false}
                        iconOnly
                        variant="ghost"
                      />
                    </div>
                  </Suspense>
                )}
              </div>

              {/* Mobile Filter Drawer Trigger & Desktop Sort */}
              <div className="flex items-center gap-2">
                {/* Desktop Sort Dropdown */}
                <Suspense fallback={<div className="w-32 h-10 bg-muted animate-pulse rounded"></div>}>
                  <div className="hidden sm:flex">
                    <SortDropdown
                      value={sortBy}
                      direction={sortDirection}
                      onValueChange={value => handleSortChange(value, sortDirection)}
                      onDirectionChange={direction => handleSortChange(sortBy, direction)}
                      options={[
                        { value: 'relevance', label: 'Relevance', description: 'Best match' },
                        { value: 'popularity', label: 'Popularity', description: 'Most viewed' },
                        { value: 'rating', label: 'Rating', description: 'Highest rated' },
                        { value: 'year', label: 'Release Year', description: 'Most recent' },
                        { value: 'title', label: 'Title', description: 'A to Z' },
                        { value: 'availability', label: 'Availability', description: 'Most available' },
                      ]}
                    />
                  </div>
                </Suspense>

                {/* Desktop Clear Filters */}
                {activeFiltersCount > 0 && (
                  <Suspense fallback={<div className="w-24 h-10 bg-muted animate-pulse rounded"></div>}>
                    <div className="hidden sm:flex">
                      <ClearFiltersButton
                        onClearFilters={handleClearFilters}
                        activeFiltersCount={activeFiltersCount}
                        showConfirmation={true}
                        variant="outline"
                        size="sm"
                      />
                    </div>
                  </Suspense>
                )}

                {/* Mobile Filter Drawer */}
                <Suspense fallback={<div className="w-10 h-10 bg-muted animate-pulse rounded"></div>}>
                  <div className="lg:hidden">
                    <MobileFilterDrawer
                      filters={filters}
                      onFiltersChange={handleFilterChange}
                      onClearFilters={handleClearFilters}
                      activeFiltersCount={activeFiltersCount}
                      open={showMobileFilters}
                      onOpenChange={setShowMobileFilters}
                      availableFilters={AVAILABLE_SEARCH_FILTERS}
                    />
                  </div>
                </Suspense>
              </div>
            </div>
          </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Desktop Filter Sidebar - Lazy loaded for better performance */}
          <Suspense
            fallback={
              <div className="hidden lg:block lg:col-span-1">
                <div className="w-full h-96 bg-muted animate-pulse rounded-lg"></div>
              </div>
            }
          >
            <div className="hidden lg:block lg:col-span-1">
              <FilterSidebar
                filters={filters}
                onFiltersChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                availableFilters={AVAILABLE_SEARCH_FILTERS}
                className="sticky top-4"
              />
            </div>
          </Suspense>

          {/* Search Results */}
          <div className="lg:col-span-3 mobile-optimized relative">
            {/* BUG-E2E-002 FIX: Show error message instead of blocking overlay */}
            {searchError && (
              <div
                className="mb-4 p-4 bg-error/10 border border-error text-error rounded-lg flex items-start gap-3"
                role="alert"
              >
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">{searchError}</p>
                  <button
                    onClick={() => {
                      setSearchError(null);
                      setIsFilterLoading(false);
                    }}
                    className="mt-2 text-sm underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            {/* UX Improvement: Non-blocking loading indicator for filter changes */}
            {isFilterLoading && !searchError && (
              <div
                className="mb-4 p-3 bg-primary/10 border border-primary/20 text-primary rounded-lg flex items-center gap-3"
                role="status"
                aria-live="polite"
                aria-label="Updating search results"
              >
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <span className="text-sm">Updating results...</span>
              </div>
            )}
            <Suspense
              fallback={
                <div className="space-y-4" role="status" aria-label="Loading search results">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="bg-card rounded-lg p-4 shadow animate-pulse" aria-hidden="true">
                      <div className="flex gap-4">
                        <div className="w-24 h-36 bg-muted rounded"></div>
                        <div className="flex-1 space-y-3">
                          <div className="h-6 bg-muted rounded w-3/4"></div>
                          <div className="h-4 bg-muted rounded w-1/2"></div>
                          <div className="h-4 bg-muted rounded w-full"></div>
                          <div className="h-4 bg-muted rounded w-5/6"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <span className="sr-only">Loading search results, please wait...</span>
                </div>
              }
            >
              <SearchResults
                query={searchParams.get('q') || searchParams.get('query') || ''}
                searchRequest={{ ...filters, ...convertFiltersToSearchRequest(advancedFilters) }}
                onUpgradeClick={handleUpgradeClick}
                onResultClick={handleResultClick}
                showGlobalView={true}
                enableInfiniteScroll={true}
                compactMode={false}
              />
            </Suspense>
          </div>
        </div>

      <div className="mt-8">
        <RelatedLinks sections={buildSearchSections()} />
      </div>
    </AppLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-label="Loading search page">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-hidden="true"></div>
          <span className="sr-only">Loading search page, please wait...</span>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
