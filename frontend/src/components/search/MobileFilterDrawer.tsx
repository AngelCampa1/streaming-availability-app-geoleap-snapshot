'use client';

import React, { useEffect } from 'react';
import * as FocusScope from '@radix-ui/react-focus-scope';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, Settings2, X } from 'lucide-react';
import { FilterSidebar, FilterSidebarProps } from './FilterSidebar';
import ClearFiltersButton from './ClearFiltersButton';
import { ContentType } from '@/lib/types/paywall';

export interface MobileFilterDrawerProps extends Omit<FilterSidebarProps, 'className'> {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  activeFiltersCount?: number;
  className?: string;
  /** Show filter chips preview below the trigger */
  showFilterChips?: boolean;
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  filters,
  onFiltersChange,
  isLoading = false,
  onClearFilters,
  availableFilters,
  trigger,
  open,
  onOpenChange,
  activeFiltersCount = 0,
  className = '',
  showFilterChips = true,
}) => {
  // UX Fix: Lock body scroll when drawer is open (same pattern as MainNavigation)
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  // Helper to get human-readable content type label
  const getContentTypeLabel = (type: ContentType): string => {
    const labels: Record<ContentType, string> = {
      [ContentType.All]: 'All',
      [ContentType.Movie]: 'Movies',
      [ContentType.Show]: 'TV Shows',
      [ContentType.Documentary]: 'Docs',
      [ContentType.Anime]: 'Anime',
    };
    return labels[type] || 'Unknown';
  };

  // Generate active filter chips for preview
  const getActiveFilterChips = (): Array<{ key: string; label: string; onRemove: () => void }> => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

    // Content type
    if (filters.contentType !== undefined) {
      chips.push({
        key: 'contentType',
        label: getContentTypeLabel(filters.contentType),
        onRemove: () => {
          const newFilters = { ...filters };
          delete newFilters.contentType;
          onFiltersChange(newFilters);
        },
      });
    }

    // Year range
    if (filters.yearFrom || filters.yearTo) {
      const yearLabel = filters.yearFrom && filters.yearTo
        ? `${filters.yearFrom}-${filters.yearTo}`
        : filters.yearFrom
          ? `${filters.yearFrom}+`
          : `Until ${filters.yearTo}`;
      chips.push({
        key: 'year',
        label: yearLabel,
        onRemove: () => {
          const newFilters = { ...filters };
          delete newFilters.yearFrom;
          delete newFilters.yearTo;
          onFiltersChange(newFilters);
        },
      });
    }

    // Rating
    if (filters.minRating) {
      chips.push({
        key: 'rating',
        label: `${filters.minRating}+ ⭐`,
        onRemove: () => {
          const newFilters = { ...filters };
          delete newFilters.minRating;
          delete newFilters.maxRating;
          onFiltersChange(newFilters);
        },
      });
    }

    // Genres (show first 2)
    if (filters.genres && filters.genres.length > 0) {
      const genreLabel = filters.genres.length > 2
        ? `${filters.genres.slice(0, 2).join(', ')} +${filters.genres.length - 2}`
        : filters.genres.join(', ');
      chips.push({
        key: 'genres',
        label: genreLabel,
        onRemove: () => {
          const newFilters = { ...filters };
          delete newFilters.genres;
          onFiltersChange(newFilters);
        },
      });
    }

    // Services (show first 2)
    if (filters.services && filters.services.length > 0) {
      const serviceLabel = filters.services.length > 2
        ? `${filters.services.slice(0, 2).join(', ')} +${filters.services.length - 2}`
        : filters.services.join(', ');
      chips.push({
        key: 'services',
        label: serviceLabel,
        onRemove: () => {
          const newFilters = { ...filters };
          delete newFilters.services;
          onFiltersChange(newFilters);
        },
      });
    }

    // Countries (show first 2)
    if (filters.countries && filters.countries.length > 0) {
      const countryLabel = filters.countries.length > 2
        ? `${filters.countries.slice(0, 2).join(', ')} +${filters.countries.length - 2}`
        : filters.countries.join(', ');
      chips.push({
        key: 'countries',
        label: countryLabel,
        onRemove: () => {
          const newFilters = { ...filters };
          delete newFilters.countries;
          onFiltersChange(newFilters);
        },
      });
    }

    return chips;
  };

  const activeChips = getActiveFilterChips();

  const defaultTrigger = (
    <Button variant="outline" size="sm" className={`flex items-center gap-2 min-h-[44px] ${className}`}>
      <Filter className="h-4 w-4" />
      <span>Filters</span>
      {activeFiltersCount > 0 && (
        <Badge variant="secondary" className="ml-1 text-xs">
          {activeFiltersCount}
        </Badge>
      )}
    </Button>
  );

  const handleApplyFilters = () => {
    // Close the drawer when filters are applied
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleClearAll = () => {
    if (onClearFilters) {
      onClearFilters();
    }
    // Optionally close drawer after clearing
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  return (
    <div className="space-y-2">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
          <FocusScope.Root trapped={open} loop>
          <SheetHeader className="px-4 py-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                <div>
                  <SheetTitle>Search Filters</SheetTitle>
                  <SheetDescription>
                    Refine your search results
                    {activeFiltersCount > 0 && ` • ${activeFiltersCount} active`}
                  </SheetDescription>
                </div>
              </div>
              {activeFiltersCount > 0 && (
                <ClearFiltersButton
                  onClearFilters={handleClearAll}
                  activeFiltersCount={activeFiltersCount}
                  showConfirmation={false}
                  variant="ghost"
                  iconOnly
                  className="flex-shrink-0"
                />
              )}
            </div>
          </SheetHeader>

          {/* Filter Content - Mobile optimized with single accordion */}
          <div className="flex-1 overflow-hidden">
            <FilterSidebar
              filters={filters}
              onFiltersChange={onFiltersChange}
              isLoading={isLoading}
              onClearFilters={onClearFilters}
              availableFilters={availableFilters}
              className="border-0 shadow-none rounded-none h-full"
              singleAccordion={true}
            />
          </div>

          {/* Footer Actions */}
          <SheetFooter className="px-4 py-4 border-t bg-muted/20">
            <div className="flex items-center justify-between w-full gap-3">
              <div className="text-sm text-muted-foreground">
                {activeFiltersCount > 0
                  ? `${activeFiltersCount} filter${activeFiltersCount !== 1 ? 's' : ''} applied`
                  : 'No filters applied'}
              </div>
              <div className="flex gap-2">
                {activeFiltersCount > 0 && (
                  <ClearFiltersButton
                    onClearFilters={handleClearAll}
                    activeFiltersCount={activeFiltersCount}
                    showConfirmation={false}
                    variant="outline"
                    size="sm"
                  />
                )}
                <Button onClick={handleApplyFilters} size="sm" className="min-w-[80px] min-h-[44px]">
                  Apply
                </Button>
              </div>
            </div>
          </SheetFooter>
          </FocusScope.Root>
        </SheetContent>
      </Sheet>

      {/* UX Improvement: Filter Chips Preview - shows active filters below the trigger button */}
      {showFilterChips && activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {activeChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="flex items-center gap-1 pl-2 pr-1 py-1 text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
            >
              <span className="max-w-[120px] truncate">{chip.label}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  chip.onRemove();
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors"
                aria-label={`Remove ${chip.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileFilterDrawer;
