// Mobile-optimized Watchlist Components

'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { WatchlistItem, WatchlistCategory } from '@/types/watchlist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Filter,
  Plus,
  Star,
  Eye,
  EyeOff,
  Trash2,
  Share2,
  Grid,
  ChevronUp,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTouchGestures } from './WatchlistDragDrop';

interface MobileWatchlistHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCount: number;
  totalCount: number;
  onAddItem: () => void;
  onFilterToggle: () => void;
  onMenuToggle: () => void;
  hasActiveFilters: boolean;
}

export const MobileWatchlistHeader: React.FC<MobileWatchlistHeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedCount,
  totalCount,
  onAddItem,
  onFilterToggle,
  onMenuToggle,
  hasActiveFilters,
}) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <div className="bg-background border-b sticky top-0 z-10">
      {/* Top row */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onMenuToggle}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Watchlist</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsSearchExpanded(!isSearchExpanded)}>
            <Search className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="sm" onClick={onFilterToggle} className="relative">
            <Filter className="h-5 w-5" />
            {hasActiveFilters && <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />}
          </Button>

          <Button size="sm" onClick={onAddItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Search row (expandable) */}
      {isSearchExpanded && (
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search watchlist..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => {
                onSearchChange('');
                setIsSearchExpanded(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Status row */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 text-sm text-muted-foreground">
        <span>
          {selectedCount > 0 ? (
            <span className="font-medium text-foreground">
              {selectedCount} of {totalCount} selected
            </span>
          ) : (
            `${totalCount} items`
          )}
        </span>

        {selectedCount > 0 && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

interface SwipeableItemCardProps {
  item: WatchlistItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleWatched: (id: string) => void;
  onRemove: (id: string) => void;
  onShare: (id: string) => void;
}

export const SwipeableItemCard: React.FC<SwipeableItemCardProps> = ({
  item,
  isSelected,
  onSelect,
  onToggleWatched,
  onRemove,
  onShare,
}) => {
  const [swipeOffset, _setSwipeOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchGestures();

  const handleSwipe = useCallback(
    (direction: string | null) => {
      if (direction === 'swipe-right') {
        onToggleWatched(item.id);
      } else if (direction === 'swipe-left') {
        setIsRevealed(!isRevealed);
      }
    },
    [item.id, onToggleWatched, isRevealed]
  );

  const handleTouchEndWithSwipe = useCallback(
    (_e: React.TouchEvent) => {
      const direction = handleTouchEnd();
      if (direction) {
        handleSwipe(direction);
      }
    },
    [handleTouchEnd, handleSwipe]
  );

  return (
    <div className="relative overflow-hidden bg-background border-b">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        {/* Left action (watch/unwatch) */}
        <div className="flex-1 bg-success flex items-center justify-start px-4">
          <div className="text-primary-foreground flex flex-col items-center">
            {item.watched ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            <span className="text-xs mt-1">{item.watched ? 'Unwatch' : 'Watched'}</span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex">
          <div className="w-20 bg-primary flex items-center justify-center" onClick={() => onShare(item.id)}>
            <div className="text-primary-foreground flex flex-col items-center">
              <Share2 className="h-5 w-5" />
              <span className="text-xs mt-1">Share</span>
            </div>
          </div>
          <div className="w-20 bg-error flex items-center justify-center" onClick={() => onRemove(item.id)}>
            <div className="text-primary-foreground flex flex-col items-center">
              <Trash2 className="h-5 w-5" />
              <span className="text-xs mt-1">Delete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={cn(
          'bg-background transition-transform duration-200 relative',
          isRevealed && 'transform -translate-x-40'
        )}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEndWithSwipe}
        onClick={() => onSelect(item.id)}
      >
        <div className={cn('flex items-center p-4 space-x-3', isSelected && 'bg-primary/10')}>
          {/* Poster */}
          <div className="relative w-12 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
            {item.poster ? (
              <Image src={item.poster} alt={item.title} fill sizes="48px" className="object-cover" priority={false} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Grid className="h-4 w-4" />
              </div>
            )}

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-xs">✓</span>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{item.title}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              {item.year && <span>{item.year}</span>}
              {item.year && item.type && <span>•</span>}
              <span className="capitalize">{item.type.replace('_', ' ')}</span>
              {item.rating && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    <span>{item.rating.toFixed(1)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-1 mt-2">
              <Badge variant={item.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                {item.priority}
              </Badge>
              {item.watched && (
                <Badge variant="default" className="text-xs">
                  Watched
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {item.availability.filter(a => a.isAvailable).length}/{item.availability.length}
              </Badge>
            </div>
          </div>

          {/* Action hint */}
          <div className="text-muted-foreground">
            <ChevronUp className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: WatchlistCategory[];
  filters: any;
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
}

export const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  open,
  onOpenChange,
  categories,
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Filter & Sort</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Content Type */}
          <div>
            <h3 className="font-medium mb-3">Content Type</h3>
            <div className="flex flex-wrap gap-2">
              {['movie', 'tv_series', 'documentary', 'anime'].map(type => (
                <Button
                  key={type}
                  variant={filters.type?.includes(type) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const currentTypes = filters.type || [];
                    const updatedTypes = currentTypes.includes(type)
                      ? currentTypes.filter((t: string) => t !== type)
                      : [...currentTypes, type];
                    onFilterChange({ type: updatedTypes });
                  }}
                >
                  {type.replace('_', ' ').toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="font-medium mb-3">Watch Status</h3>
            <div className="flex gap-2">
              <Button
                variant={filters.watched === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFilterChange({ watched: filters.watched === true ? undefined : true })}
              >
                Watched
              </Button>
              <Button
                variant={filters.watched === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFilterChange({ watched: filters.watched === false ? undefined : false })}
              >
                Unwatched
              </Button>
            </div>
          </div>

          {/* Priority */}
          <div>
            <h3 className="font-medium mb-3">Priority</h3>
            <div className="flex gap-2">
              {['high', 'medium', 'low'].map(priority => (
                <Button
                  key={priority}
                  variant={filters.priority?.includes(priority) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const currentPriorities = filters.priority || [];
                    const updatedPriorities = currentPriorities.includes(priority)
                      ? currentPriorities.filter((p: string) => p !== priority)
                      : [...currentPriorities, priority];
                    onFilterChange({ priority: updatedPriorities });
                  }}
                >
                  {priority.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Categories</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {categories.map(category => (
                  <Button
                    key={category.id}
                    variant={filters.category?.includes(category.id) ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      const currentCategories = filters.category || [];
                      const updatedCategories = currentCategories.includes(category.id)
                        ? currentCategories.filter((c: string) => c !== category.id)
                        : [...currentCategories, category.id];
                      onFilterChange({ category: updatedCategories });
                    }}
                  >
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Sort */}
          <div>
            <h3 className="font-medium mb-3">Sort By</h3>
            <Select value={filters.sortBy} onValueChange={value => onFilterChange({ sortBy: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="addedDate">Date Added</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClearFilters} className="flex-1">
              Clear All
            </Button>
            <Button onClick={() => onOpenChange(false)} className="flex-1">
              Apply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Pull-to-refresh functionality
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTouchStart = useCallback((_e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isPulling && window.scrollY === 0) {
        const touch = e.touches[0];
        const startY = touch.clientY;
        setPullDistance(Math.max(0, Math.min(startY - 100, 100)));
      }
    },
    [isPulling]
  );

  const handleTouchEnd = useCallback(async () => {
    if (isPulling && pullDistance > 60) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setIsPulling(false);
    setPullDistance(0);
  }, [isPulling, pullDistance, onRefresh]);

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="relative">
      {/* Pull indicator */}
      {(isPulling || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-muted/80 transition-all duration-200"
          style={{ height: `${pullDistance}px` }}
        >
          {isRefreshing ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          ) : (
            <ChevronDown
              className={cn('h-6 w-6 text-muted-foreground transition-transform', pullDistance > 60 && 'rotate-180')}
            />
          )}
        </div>
      )}

      <div style={{ paddingTop: isPulling ? `${pullDistance}px` : 0 }}>{children}</div>
    </div>
  );
};
