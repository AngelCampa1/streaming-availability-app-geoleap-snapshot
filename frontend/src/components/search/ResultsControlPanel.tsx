'use client';

import React, { useState } from 'react';
import { ContentType, GlobalSearchRequest } from '@/lib/types/paywall';

interface ResultsControlPanelProps {
  totalResults?: number;
  currentFilters: Partial<GlobalSearchRequest>;
  onFiltersChange: (filters: Partial<GlobalSearchRequest>) => void;
  onViewModeChange?: (mode: 'list' | 'grid' | 'compact') => void;
  onSortChange?: (sortBy: string, direction: 'asc' | 'desc') => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRemoveFilter?: (filterType: string, value: any) => void;
  viewMode?: 'list' | 'grid' | 'compact';
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  searchTime?: number;
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

const ResultsControlPanel: React.FC<ResultsControlPanelProps> = ({
  totalResults = 0,
  currentFilters,
  onFiltersChange,
  onViewModeChange,
  onSortChange,
  onRemoveFilter,
  viewMode = 'list',
  sortBy: _sortBy = 'relevance',
  sortDirection: _sortDirection = 'desc',
  searchTime,
  hasMore,
  onLoadMore,
  className = '',
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFilterChange = (key: keyof GlobalSearchRequest, value: any) => {
    onFiltersChange({
      ...currentFilters,
      [key]: value,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      query: currentFilters.query || '',
    });
  };

  const _sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'popularity', label: 'Popularity' },
    { value: 'rating', label: 'Rating' },
    { value: 'year', label: 'Year' },
    { value: 'title', label: 'Title' },
    { value: 'availability', label: 'Global Availability' },
  ];

  const getActiveFiltersCount = () => {
    let count = 0;
    if (currentFilters.contentType !== undefined) count++;
    if (currentFilters.yearFrom) count++;
    if (currentFilters.yearTo) count++;
    if (currentFilters.minRating) count++;
    if (currentFilters.maxRating) count++;
    if (currentFilters.genres?.length) count++;
    if (currentFilters.countries?.length) count++;
    if (currentFilters.services?.length) count++;
    return count;
  };

  return (
    <div className={`bg-card border-b border-border ${className}`}>
      <div className="px-4 py-3">
        {/* Top Row - Results Count and View Controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <div>{totalResults.toLocaleString()} results</div>
            {searchTime && <div>in {(searchTime / 1000).toFixed(2)} seconds</div>}

            {getActiveFiltersCount() > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-xs sm:text-sm text-primary hover:text-primary/80 font-medium flex items-center whitespace-nowrap"
              >
                <svg className="w-3 sm:w-4 h-3 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="hidden sm:inline">Clear {getActiveFiltersCount()} filters</span>
                <span className="sm:hidden">Clear</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {/* View Mode Toggle */}
            {onViewModeChange && (
              <div className="flex border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => onViewModeChange('list')}
                  className={`p-1 sm:p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                  title="List view"
                >
                  <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={`p-1 sm:p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                  title="Grid view"
                >
                  <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => onViewModeChange('compact')}
                  className={`p-1 sm:p-2 ${viewMode === 'compact' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                  title="Compact view"
                >
                  <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16" />
                  </svg>
                </button>
              </div>
            )}

            {/* Sort Controls */}
            {onSortChange && (
              <select
                data-testid="sort-select"
                onChange={e => {
                  const [sortByValue, order] = e.target.value.split('-');
                  onSortChange(sortByValue, order as 'asc' | 'desc');
                }}
                className="text-xs sm:text-sm border border-border rounded-md px-2 sm:px-3 py-1 bg-card focus:ring-2 focus:ring-primary focus:border-transparent min-w-0"
              >
                <option value="rating-desc">Rating (High to Low)</option>
                <option value="rating-asc">Rating (Low to High)</option>
                <option value="releaseYear-desc">Year (Newest)</option>
                <option value="year-desc">Year (Newest)</option>
                <option value="popularity-desc">Popularity</option>
                <option value="title-asc">Title (A-Z)</option>
              </select>
            )}

            {/* Active Filter Badges */}
            {currentFilters.genres?.map((genre: string) => (
              <span key={genre} className="badge filter-badge">
                {genre} <button onClick={() => onRemoveFilter?.('genres', genre)}>×</button>
              </span>
            ))}
            {currentFilters.minRating && (
              <span className="badge filter-badge">
                Rating ≥ {currentFilters.minRating}
                <button onClick={() => onRemoveFilter?.('minRating', null)}>×</button>
              </span>
            )}

            {/* Load More Button */}
            {hasMore && onLoadMore && <button onClick={onLoadMore}>Load More Results</button>}

            {/* Grid element for mobile-optimized layout */}
            <div className="grid"></div>
          </div>
        </div>

        {/* Quick Filters Row */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-sm">
          <span className="font-medium text-foreground hidden sm:block">Quick filters:</span>
          <span className="font-medium text-foreground sm:hidden">Filters:</span>

          {/* Content Type */}
          <select
            value={currentFilters.contentType?.toString() || ''}
            onChange={e =>
              handleFilterChange('contentType', e.target.value ? (parseInt(e.target.value) as ContentType) : undefined)
            }
            className="border border-border rounded-md px-2 sm:px-3 py-1 text-xs sm:text-sm focus:ring-2 focus:ring-primary focus:border-transparent min-w-0 flex-shrink bg-card"
            aria-label="Filter by content type"
          >
            <option value="">All Types</option>
            <option value={ContentType.Movie}>Movies</option>
            <option value={ContentType.Show}>TV Shows</option>
            <option value={ContentType.Documentary}>Documentaries</option>
            <option value={ContentType.Anime}>Anime</option>
          </select>

          {/* Year Range */}
          <select
            value={currentFilters.yearFrom?.toString() || ''}
            onChange={e => handleFilterChange('yearFrom', e.target.value ? parseInt(e.target.value) : undefined)}
            className="border border-border rounded-md px-2 sm:px-3 py-1 text-xs sm:text-sm focus:ring-2 focus:ring-primary focus:border-transparent min-w-0 flex-shrink bg-card"
            aria-label="Filter by release year"
          >
            <option value="">Any Year</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2020">2020 and later</option>
            <option value="2010">2010 and later</option>
            <option value="2000">2000 and later</option>
            <option value="1990">1990 and later</option>
          </select>

          {/* Rating */}
          <select
            value={currentFilters.minRating?.toString() || ''}
            onChange={e => handleFilterChange('minRating', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="border border-border rounded-md px-2 sm:px-3 py-1 text-xs sm:text-sm focus:ring-2 focus:ring-primary focus:border-transparent min-w-0 flex-shrink bg-card"
            aria-label="Filter by minimum rating"
          >
            <option value="">Any Rating</option>
            <option value="8.5">8.5 stars and above</option>
            <option value="8.0">8.0 stars and above</option>
            <option value="7.0">7.0 stars and above</option>
            <option value="6.0">6.0 stars and above</option>
          </select>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              showAdvanced ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
              />
            </svg>
            Advanced
            {getActiveFiltersCount() > 3 && (
              <span className="ml-1 bg-warning text-warning-foreground rounded-full text-xs px-1">
                {getActiveFiltersCount() - 3}
              </span>
            )}
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Year Range */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Release Year</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="From"
                    value={currentFilters.yearFrom || ''}
                    onChange={e =>
                      handleFilterChange('yearFrom', e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    className="flex-1 text-sm border border-border rounded-md px-2 py-1 bg-card"
                    min="1900"
                    max="2030"
                  />
                  <input
                    type="number"
                    placeholder="To"
                    value={currentFilters.yearTo || ''}
                    onChange={e => handleFilterChange('yearTo', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="flex-1 text-sm border border-border rounded-md px-2 py-1 bg-card"
                    min="1900"
                    max="2030"
                  />
                </div>
              </div>

              {/* Rating Range */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Rating Range</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    step="0.1"
                    min="0"
                    max="10"
                    value={currentFilters.minRating || ''}
                    onChange={e =>
                      handleFilterChange('minRating', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="flex-1 text-sm border border-border rounded-md px-2 py-1 bg-card"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    step="0.1"
                    min="0"
                    max="10"
                    value={currentFilters.maxRating || ''}
                    onChange={e =>
                      handleFilterChange('maxRating', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="flex-1 text-sm border border-border rounded-md px-2 py-1 bg-card"
                  />
                </div>
              </div>

              {/* Genres (placeholder - would need to be populated from API) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Genres</label>
                <select
                  multiple
                  value={currentFilters.genres || []}
                  onChange={e => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    handleFilterChange('genres', values.length > 0 ? values : undefined);
                  }}
                  className="w-full text-sm border border-border rounded-md px-2 py-1 h-20 bg-card"
                >
                  <option value="Action">Action</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Drama">Drama</option>
                  <option value="Horror">Horror</option>
                  <option value="Romance">Romance</option>
                  <option value="Sci-Fi">Sci-Fi</option>
                  <option value="Thriller">Thriller</option>
                  <option value="Documentary">Documentary</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsControlPanel;
