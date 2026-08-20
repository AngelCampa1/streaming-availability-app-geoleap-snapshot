'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContentType, GlobalSearchRequest } from '@/lib/types/paywall';
import { ChevronDown, ChevronRight, Filter, RotateCcw } from 'lucide-react';

export interface FilterSidebarProps {
  filters: Partial<GlobalSearchRequest>;
  onFiltersChange: (filters: Partial<GlobalSearchRequest>) => void;
  className?: string;
  isLoading?: boolean;
  onClearFilters?: () => void;
  availableFilters?: {
    genres: string[];
    countries: string[];
    services: string[];
  };
  /** Mobile optimization: only allow one section to be expanded at a time */
  singleAccordion?: boolean;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFiltersChange,
  className = '',
  isLoading = false,
  onClearFilters,
  availableFilters,
  singleAccordion = false,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['type', 'year', 'rating']));

  const toggleSection = (section: string) => {
    if (singleAccordion) {
      // Mobile optimization: only one section open at a time
      if (expandedSections.has(section)) {
        setExpandedSections(new Set());
      } else {
        setExpandedSections(new Set([section]));
      }
    } else {
      // Desktop: multiple sections can be open
      const newExpanded = new Set(expandedSections);
      if (newExpanded.has(section)) {
        newExpanded.delete(section);
      } else {
        newExpanded.add(section);
      }
      setExpandedSections(newExpanded);
    }
  };

  const handleFilterChange = (key: keyof GlobalSearchRequest, value: unknown) => {
    // Bug 6-7 fix: Validate year and rating inputs
    if ((key === 'yearFrom' || key === 'yearTo') && typeof value === 'number') {
      const currentYear = new Date().getFullYear();
      if (value < 1900 || value > currentYear + 1) {
        return; // Reject invalid years
      }
    }
    if ((key === 'minRating' || key === 'maxRating') && typeof value === 'number') {
      if (value < 0 || value > 10) {
        return; // Reject invalid ratings
      }
    }

    const newFilters = { ...filters };
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[key];
    } else {
      // Type-safe assignment based on key
      (newFilters as Record<string, unknown>)[key] = value;
    }
    onFiltersChange(newFilters);
  };

  const handleArrayToggle = (key: keyof GlobalSearchRequest, item: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(item) ? currentArray.filter(i => i !== item) : [...currentArray, item];
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined);
  };

  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).reduce((count, [key, value]) => {
      if (key === 'query' || key === 'page' || key === 'pageSize') return count;
      if (value === undefined || value === null) return count;
      if (Array.isArray(value) && value.length === 0) return count;
      if (typeof value === 'string' && value.trim() === '') return count;
      return count + 1;
    }, 0);
  }, [filters]);

  const clearAllFilters = () => {
    onFiltersChange({ query: filters.query });
    if (onClearFilters) {
      onClearFilters();
    }
  };

  const renderCollapsibleSection = (
    id: string,
    title: string,
    icon: React.ReactNode,
    children: React.ReactNode,
    activeCount?: number
  ) => (
    <Collapsible open={expandedSections.has(id)} onOpenChange={() => toggleSection(id)}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between h-auto p-3 hover:bg-muted/50">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{title}</span>
            {activeCount && activeCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {activeCount}
              </Badge>
            )}
          </div>
          {expandedSections.has(id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">{children}</CollapsibleContent>
    </Collapsible>
  );

  const popularGenres = availableFilters?.genres?.slice(0, 12) || [
    'Action',
    'Adventure',
    'Comedy',
    'Drama',
    'Horror',
    'Romance',
    'Sci-Fi',
    'Thriller',
    'Mystery',
    'Fantasy',
    'Animation',
    'Documentary',
  ];

  const popularServices = availableFilters?.services?.slice(0, 10) || [
    'Netflix',
    'Amazon Prime',
    'Disney Plus',
    'Hulu',
    'HBO Max',
    'Apple TV+',
    'Paramount+',
    'Peacock',
    'Crunchyroll',
    'YouTube',
  ];

  const topCountries = availableFilters?.countries?.slice(0, 8) || [
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
    'Japan',
    'South Korea',
  ];

  return (
    <Card className={`h-fit sticky top-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-semibold">Filters</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {activeFiltersCount} active
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-1">
          {/* Content Type */}
          {renderCollapsibleSection(
            'type',
            'Content Type',
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10l1 13H6L7 4z"
              />
            </svg>,
            <div className="space-y-2">
              {Object.entries({
                [ContentType.Movie]: 'Movies',
                [ContentType.Show]: 'TV Shows',
                [ContentType.Documentary]: 'Documentaries',
                [ContentType.Anime]: 'Anime',
              }).map(([value, label]) => {
                const contentType = parseInt(value) as ContentType;
                const isSelected = filters.contentType === contentType;
                return (
                  <Button
                    key={value}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleFilterChange('contentType', isSelected ? undefined : contentType)}
                    disabled={isLoading}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>,
            filters.contentType !== undefined ? 1 : 0
          )}

          <Separator />

          {/* Year Range */}
          {renderCollapsibleSection(
            'year',
            'Release Year',
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>,
            <div className="space-y-3">
              <div>
                <Label htmlFor="yearFrom" className="text-sm">
                  From Year
                </Label>
                <Input
                  id="yearFrom"
                  type="number"
                  placeholder="e.g., 2010"
                  value={filters.yearFrom || ''}
                  onChange={e => handleFilterChange('yearFrom', e.target.value ? parseInt(e.target.value) : undefined)}
                  min="1900"
                  max={new Date().getFullYear()}
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="yearTo" className="text-sm">
                  To Year
                </Label>
                <Input
                  id="yearTo"
                  type="number"
                  placeholder={new Date().getFullYear().toString()}
                  value={filters.yearTo || ''}
                  onChange={e => handleFilterChange('yearTo', e.target.value ? parseInt(e.target.value) : undefined)}
                  min={filters.yearFrom || 1900}
                  max={new Date().getFullYear()}
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>
              {/* Quick year filters */}
              <div className="flex flex-wrap gap-1">
                {[2024, 2023, 2020, 2010, 2000].map(year => (
                  <Button
                    key={year}
                    variant={filters.yearFrom === year ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs px-2"
                    onClick={() => handleFilterChange('yearFrom', filters.yearFrom === year ? undefined : year)}
                  >
                    {year}+
                  </Button>
                ))}
              </div>
            </div>,
            filters.yearFrom || filters.yearTo ? 1 : 0
          )}

          <Separator />

          {/* Rating */}
          {renderCollapsibleSection(
            'rating',
            'Rating',
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              />
            </svg>,
            <div className="space-y-3">
              <div>
                <Label htmlFor="minRating" className="text-sm">
                  Minimum Rating
                </Label>
                <Input
                  id="minRating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder="0.0"
                  value={filters.minRating || ''}
                  onChange={e =>
                    handleFilterChange('minRating', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="maxRating" className="text-sm">
                  Maximum Rating
                </Label>
                <Input
                  id="maxRating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder="10.0"
                  value={filters.maxRating || ''}
                  onChange={e =>
                    handleFilterChange('maxRating', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>
              {/* Quick rating filters */}
              <div className="flex flex-wrap gap-1">
                {[8.0, 7.0, 6.0, 5.0].map(rating => (
                  <Button
                    key={rating}
                    variant={filters.minRating === rating ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs px-2"
                    onClick={() => handleFilterChange('minRating', filters.minRating === rating ? undefined : rating)}
                  >
                    {rating}+ ⭐
                  </Button>
                ))}
              </div>
            </div>,
            filters.minRating || filters.maxRating ? 1 : 0
          )}

          <Separator />

          {/* Genres */}
          {renderCollapsibleSection(
            'genres',
            'Genres',
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4L5.5 21h13L17 4M9 9h6m-6 4h6m-6 4h6"
              />
            </svg>,
            <div className="grid grid-cols-2 gap-2">
              {popularGenres.map(genre => {
                const isSelected = (filters.genres || []).includes(genre);
                return (
                  <Button
                    key={genre}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs justify-start"
                    onClick={() => handleArrayToggle('genres', genre)}
                    disabled={isLoading}
                  >
                    {genre}
                  </Button>
                );
              })}
            </div>,
            filters.genres?.length || 0
          )}

          <Separator />

          {/* Streaming Services */}
          {renderCollapsibleSection(
            'services',
            'Streaming Services',
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                x="2"
                y="3"
                width="20"
                height="14"
                rx="2"
                ry="2"
              />
              <line strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} x1="8" y1="21" x2="16" y2="21" />
              <line strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} x1="12" y1="17" x2="12" y2="21" />
            </svg>,
            <div className="space-y-2">
              {popularServices.map(service => {
                const isSelected = (filters.services || []).includes(service);
                return (
                  <Button
                    key={service}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => handleArrayToggle('services', service)}
                    disabled={isLoading}
                  >
                    {service}
                  </Button>
                );
              })}
            </div>,
            filters.services?.length || 0
          )}

          <Separator />

          {/* Countries */}
          {renderCollapsibleSection(
            'countries',
            'Countries',
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} cx="12" cy="12" r="10" />
              <line strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} x1="2" y1="12" x2="22" y2="12" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
              />
            </svg>,
            <div className="grid grid-cols-1 gap-2">
              {topCountries.map(country => {
                const isSelected = (filters.countries || []).includes(country);
                return (
                  <Button
                    key={country}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start text-xs"
                    onClick={() => handleArrayToggle('countries', country)}
                    disabled={isLoading}
                  >
                    {country}
                  </Button>
                );
              })}
            </div>,
            filters.countries?.length || 0
          )}
        </div>
      </ScrollArea>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span className="text-sm">Updating filters...</span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default FilterSidebar;
