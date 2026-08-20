'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

export interface FilterState {
  contentType?: 'Movie' | 'Show' | 'All';
  genres?: string[];
  countries?: string[];
  services?: string[];
  contentRatings?: string[];
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  maxRating?: number;
  minRuntimeMinutes?: number;
  maxRuntimeMinutes?: number;
  audioLanguages?: string[];
  subtitleLanguages?: string[];
  minPrice?: number;
  maxPrice?: number;
  videoQualities?: string[];
  cast?: string[];
  directors?: string[];
  freeContentOnly?: boolean;
  subscriptionContentOnly?: boolean;
  platformExclusives?: boolean;
  popularityFilter?: 'Trending' | 'Popular' | 'HighlyRated' | 'HiddenGems' | 'AwardWinners' | 'CriticsPick';
}

export interface FilterOptions {
  genres: FilterOption[];
  contentRatings: FilterOption[];
  streamingServices: FilterOption[];
  countries: FilterOption[];
  videoQualities: FilterOption[];
  audioLanguages: FilterOption[];
  subtitleLanguages: FilterOption[];
  availableYearRange: YearRange;
  availableRuntimeRange: RuntimeRange;
  availablePriceRange: PriceRange;
}

interface FilterOption {
  value: string;
  displayName: string;
  count: number;
  isPopular: boolean;
  description?: string;
  iconUrl?: string;
}

interface YearRange {
  minYear: number;
  maxYear: number;
  mostCommonYear: number;
}

interface RuntimeRange {
  minRuntimeMinutes: number;
  maxRuntimeMinutes: number;
  averageRuntimeMinutes: number;
}

interface PriceRange {
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  currency: string;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  filterOptions?: FilterOptions;
  isLoading?: boolean;
  className?: string;
}

export default function AdvancedFilters({
  filters,
  onFiltersChange,
  filterOptions,
  isLoading = false,
  className = '',
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Calculate active filters count
  useEffect(() => {
    const count = Object.entries(filters).reduce((acc, [key, value]) => {
      if (key === 'contentType' && value && value !== 'All') return acc + 1;
      if (Array.isArray(value) && value.length > 0) return acc + 1;
      if (typeof value === 'number' && value > 0) return acc + 1;
      if (typeof value === 'boolean' && value) return acc + 1;
      if (typeof value === 'string' && value.length > 0) return acc + 1;
      return acc;
    }, 0);
    setActiveFiltersCount(count);
  }, [filters]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleArrayToggle = (key: keyof FilterState, item: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(item) ? currentArray.filter(i => i !== item) : [...currentArray, item];
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const clearFilter = (key: keyof FilterState) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  return (
    <Card className={`p-4 sm:p-6 ${className} transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors"
            aria-expanded={isExpanded}
            aria-controls="advanced-filters-content"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="hidden sm:inline">Advanced Filters</span>
            <span className="sm:hidden">Filters</span>
          </button>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground text-xs sm:text-sm px-2 sm:px-3"
            >
              <span className="hidden sm:inline">Clear all</span>
              <span className="sm:hidden">Clear</span>
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {filters.contentType && filters.contentType !== 'All' && (
              <Badge variant="outline" className="flex items-center gap-1">
                Type: {filters.contentType}
                <button onClick={() => clearFilter('contentType')} className="ml-1 text-muted-foreground hover:text-foreground">
                  ×
                </button>
              </Badge>
            )}
            {filters.genres?.map(genre => (
              <Badge key={genre} variant="outline" className="flex items-center gap-1">
                {genre}
                <button
                  onClick={() => handleArrayToggle('genres', genre)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </Badge>
            ))}
            {filters.minRating && (
              <Badge variant="outline" className="flex items-center gap-1">
                Rating ≥ {filters.minRating}
                <button onClick={() => clearFilter('minRating')} className="ml-1 text-muted-foreground hover:text-foreground">
                  ×
                </button>
              </Badge>
            )}
            {filters.yearFrom && (
              <Badge variant="outline" className="flex items-center gap-1">
                From {filters.yearFrom}
                <button onClick={() => clearFilter('yearFrom')} className="ml-1 text-muted-foreground hover:text-foreground">
                  ×
                </button>
              </Badge>
            )}
            {filters.services?.map(service => (
              <Badge key={service} variant="outline" className="flex items-center gap-1">
                {service}
                <button
                  onClick={() => handleArrayToggle('services', service)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-top-2 duration-300">
          {/* Content Type */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Content Type</Label>
            <div className="flex gap-2">
              {['All', 'Movie', 'Show'].map(type => (
                <Button
                  key={type}
                  variant={filters.contentType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('contentType', type === 'All' ? undefined : type)}
                  disabled={isLoading}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Genres */}
          {filterOptions?.genres && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Genres ({filterOptions.genres.length} available)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {filterOptions.genres
                  .sort((a, b) => b.count - a.count)
                  .map(genre => (
                    <div
                      key={genre.value}
                      className={`
                        p-2 border rounded cursor-pointer transition-colors text-sm
                        ${
                          (filters.genres || []).includes(genre.value)
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-card border-border hover:border-border/80'
                        }
                      `}
                      onClick={() => handleArrayToggle('genres', genre.value)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="truncate">{genre.displayName}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {genre.count}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Streaming Services */}
          {filterOptions?.streamingServices && (
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Streaming Services ({filterOptions.streamingServices.length} available)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                {filterOptions.streamingServices
                  .sort((a, b) => b.count - a.count)
                  .map(service => (
                    <div
                      key={service.value}
                      className={`
                        p-2 border rounded cursor-pointer transition-colors text-sm
                        ${
                          (filters.services || []).includes(service.value)
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-card border-border hover:border-border/80'
                        }
                      `}
                      onClick={() => handleArrayToggle('services', service.value)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="truncate">{service.displayName}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {service.count}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Year Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="yearFrom" className="text-sm font-medium mb-2 block">
                From Year
              </Label>
              <Input
                type="number"
                placeholder={filterOptions?.availableYearRange?.minYear?.toString() || '1900'}
                value={filters.yearFrom || ''}
                onChange={e => handleFilterChange('yearFrom', e.target.value ? parseInt(e.target.value) : undefined)}
                min={filterOptions?.availableYearRange?.minYear || 1900}
                max={new Date().getFullYear()}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="yearTo" className="text-sm font-medium mb-2 block">
                To Year
              </Label>
              <Input
                type="number"
                placeholder={new Date().getFullYear().toString()}
                value={filters.yearTo || ''}
                onChange={e => handleFilterChange('yearTo', e.target.value ? parseInt(e.target.value) : undefined)}
                min={filters.yearFrom || filterOptions?.availableYearRange?.minYear || 1900}
                max={new Date().getFullYear()}
                disabled={isLoading}
              />
            </div>
          </div>

          <Separator />

          {/* Rating Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minRating" className="text-sm font-medium mb-2 block">
                Minimum Rating
              </Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="0.0"
                value={filters.minRating || ''}
                onChange={e => handleFilterChange('minRating', e.target.value ? parseFloat(e.target.value) : undefined)}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="maxRating" className="text-sm font-medium mb-2 block">
                Maximum Rating
              </Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="10.0"
                value={filters.maxRating || ''}
                onChange={e => handleFilterChange('maxRating', e.target.value ? parseFloat(e.target.value) : undefined)}
                disabled={isLoading}
              />
            </div>
          </div>

          <Separator />

          {/* Runtime Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minRuntime" className="text-sm font-medium mb-2 block">
                Min Runtime (minutes)
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={filters.minRuntimeMinutes || ''}
                onChange={e =>
                  handleFilterChange('minRuntimeMinutes', e.target.value ? parseInt(e.target.value) : undefined)
                }
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="maxRuntime" className="text-sm font-medium mb-2 block">
                Max Runtime (minutes)
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="300"
                value={filters.maxRuntimeMinutes || ''}
                onChange={e =>
                  handleFilterChange('maxRuntimeMinutes', e.target.value ? parseInt(e.target.value) : undefined)
                }
                disabled={isLoading}
              />
            </div>
          </div>

          <Separator />

          {/* Content Rating */}
          {filterOptions?.contentRatings && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Content Rating</Label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.contentRatings.map(rating => (
                  <Button
                    key={rating.value}
                    variant={(filters.contentRatings || []).includes(rating.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleArrayToggle('contentRatings', rating.value)}
                    disabled={isLoading}
                  >
                    {rating.displayName}
                    <Badge variant="secondary" className="ml-2">
                      {rating.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Cast and Crew */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cast" className="text-sm font-medium mb-2 block">
                Cast (comma-separated)
              </Label>
              <Input
                placeholder="Actor Name, Another Actor"
                value={filters.cast?.join(', ') || ''}
                onChange={e => {
                  const cast = e.target.value
                    .split(',')
                    .map(s => s.trim())
                    .filter(s => s.length > 0);
                  handleFilterChange('cast', cast.length > 0 ? cast : undefined);
                }}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="directors" className="text-sm font-medium mb-2 block">
                Directors (comma-separated)
              </Label>
              <Input
                placeholder="Director Name, Another Director"
                value={filters.directors?.join(', ') || ''}
                onChange={e => {
                  const directors = e.target.value
                    .split(',')
                    .map(s => s.trim())
                    .filter(s => s.length > 0);
                  handleFilterChange('directors', directors.length > 0 ? directors : undefined);
                }}
                disabled={isLoading}
              />
            </div>
          </div>

          <Separator />

          {/* Special Filters */}
          <div className="space-y-4">
            <Label className="text-sm font-medium block">Special Filters</Label>

            <div className="flex items-center justify-between">
              <Label htmlFor="freeOnly" className="text-sm cursor-pointer">
                Free content only
              </Label>
              <Switch
                checked={filters.freeContentOnly || false}
                onCheckedChange={checked => handleFilterChange('freeContentOnly', checked || undefined)}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="subscriptionOnly" className="text-sm cursor-pointer">
                Subscription content only
              </Label>
              <Switch
                checked={filters.subscriptionContentOnly || false}
                onCheckedChange={checked => handleFilterChange('subscriptionContentOnly', checked || undefined)}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="exclusives" className="text-sm cursor-pointer">
                Platform exclusives only
              </Label>
              <Switch
                checked={filters.platformExclusives || false}
                onCheckedChange={checked => handleFilterChange('platformExclusives', checked || undefined)}
                disabled={isLoading}
              />
            </div>
          </div>

          <Separator />

          {/* Popularity Filter */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Popularity</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'Trending', label: 'Trending' },
                { value: 'Popular', label: 'Popular' },
                { value: 'HighlyRated', label: 'Highly Rated' },
                { value: 'HiddenGems', label: 'Hidden Gems' },
                { value: 'AwardWinners', label: 'Award Winners' },
                { value: 'CriticsPick', label: "Critics' Pick" },
              ].map(option => (
                <Button
                  key={option.value}
                  variant={filters.popularityFilter === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    handleFilterChange(
                      'popularityFilter',
                      filters.popularityFilter === option.value ? undefined : option.value
                    )
                  }
                  disabled={isLoading}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Loading filter options...</span>
        </div>
      )}
    </Card>
  );
}
