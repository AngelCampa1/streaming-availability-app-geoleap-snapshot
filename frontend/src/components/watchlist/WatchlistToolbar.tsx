// Watchlist Toolbar Component with Filters and Actions

'use client';

import React, { useState } from 'react';
import { WatchlistView, WatchlistFilter } from '@/types/watchlist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  Grid,
  List,
  Plus,
  MoreVertical,
  Download,
  Share2,
  Trash2,
  Eye,
  EyeOff,
  SortAsc,
  SortDesc,
  Menu,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WatchlistToolbarProps {
  currentView: WatchlistView;
  filters: WatchlistFilter;
  selectedCount: number;
  totalCount: number;
  onViewChange: (view: WatchlistView) => void;
  onFilterChange: (filters: Partial<WatchlistFilter>) => void;
  onAdd: () => void;
  onBulkOperation: (operation: string) => void;
  onSelectAll: () => void;
  onExport: () => void;
  onShare: () => void;
  onToggleSidebar: () => void;
  className?: string;
}

export const WatchlistToolbar: React.FC<WatchlistToolbarProps> = ({
  currentView,
  filters,
  selectedCount,
  totalCount,
  onViewChange,
  onFilterChange,
  onAdd,
  onBulkOperation,
  onSelectAll,
  onExport,
  onShare,
  onToggleSidebar,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onFilterChange({ searchQuery: value });
  };

  // Handle sort change
  const handleSortChange = (sortBy: 'title' | 'addedDate' | 'year' | 'rating' | 'lastChecked' | 'priority') => {
    const newSortOrder = filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    onFilterChange({ sortBy, sortOrder: newSortOrder });
  };

  // Handle view type change
  const handleViewTypeChange = (type: 'grid' | 'list' | 'compact') => {
    const updatedView = { ...currentView, type };
    onViewChange(updatedView);
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.type?.length) count++;
    if (filters.genre?.length) count++;
    if (filters.category?.length) count++;
    if (filters.watched !== undefined) count++;
    if (filters.priority?.length) count++;
    if (filters.availability !== undefined) count++;
    if (filters.year?.min || filters.year?.max) count++;
    if (filters.rating?.min || filters.rating?.max) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={cn('flex items-center justify-between p-4 bg-background border-b', className)}>
      {/* Left Section - Navigation and Search */}
      <div className="flex items-center gap-4 flex-1">
        {/* Sidebar Toggle */}
        <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="lg:hidden">
          <Menu className="h-4 w-4" />
        </Button>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search watchlist..."
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="start">
            <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Type Filter */}
            <DropdownMenuLabel className="text-xs">Content Type</DropdownMenuLabel>
            {['movie', 'tv_series', 'documentary', 'anime'].map(type => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={filters.type?.includes(type) || false}
                onCheckedChange={checked => {
                  const currentTypes = filters.type || [];
                  const updatedTypes = checked ? [...currentTypes, type] : currentTypes.filter(t => t !== type);
                  onFilterChange({ type: updatedTypes });
                }}
              >
                {type.replace('_', ' ').toUpperCase()}
              </DropdownMenuCheckboxItem>
            ))}

            <DropdownMenuSeparator />

            {/* Watched Status */}
            <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={filters.watched === true}
              onCheckedChange={checked => {
                onFilterChange({ watched: checked ? true : undefined });
              }}
            >
              Watched
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.watched === false}
              onCheckedChange={checked => {
                onFilterChange({ watched: checked ? false : undefined });
              }}
            >
              Unwatched
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />

            {/* Priority Filter */}
            <DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel>
            {['high', 'medium', 'low'].map(priority => (
              <DropdownMenuCheckboxItem
                key={priority}
                checked={filters.priority?.includes(priority) || false}
                onCheckedChange={checked => {
                  const currentPriorities = filters.priority || [];
                  const updatedPriorities = checked
                    ? [...currentPriorities, priority]
                    : currentPriorities.filter(p => p !== priority);
                  onFilterChange({ priority: updatedPriorities });
                }}
              >
                {priority.toUpperCase()}
              </DropdownMenuCheckboxItem>
            ))}

            <DropdownMenuSeparator />

            {/* Availability Filter */}
            <DropdownMenuCheckboxItem
              checked={filters.availability === true}
              onCheckedChange={checked => {
                onFilterChange({ availability: checked ? true : undefined });
              }}
            >
              Available for Download
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onFilterChange({})} className="text-muted-foreground">
              Clear All Filters
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {filters.sortOrder === 'desc' ? (
                <SortDesc className="h-4 w-4 mr-2" />
              ) : (
                <SortAsc className="h-4 w-4 mr-2" />
              )}
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleSortChange('title')}>
              Title {filters.sortBy === 'title' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('addedDate')}>
              Date Added {filters.sortBy === 'addedDate' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('year')}>
              Year {filters.sortBy === 'year' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('rating')}>
              Rating {filters.sortBy === 'rating' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('priority')}>
              Priority {filters.sortBy === 'priority' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center Section - View Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant={currentView.type === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewTypeChange('grid')}
        >
          <Grid className="h-4 w-4" />
        </Button>
        <Button
          variant={currentView.type === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewTypeChange('list')}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        {/* Results Count */}
        <div className="text-sm text-muted-foreground mr-4">
          {selectedCount > 0 ? (
            <span className="font-medium">
              {selectedCount} of {totalCount} selected
            </span>
          ) : (
            <span>{totalCount} items</span>
          )}
        </div>

        {/* Bulk Actions (shown when items selected) */}
        {selectedCount > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={() => onBulkOperation('mark_watched')}>
              <Eye className="h-4 w-4 mr-2" />
              Mark Watched
            </Button>
            <Button variant="outline" size="sm" onClick={() => onBulkOperation('mark_unwatched')}>
              <EyeOff className="h-4 w-4 mr-2" />
              Mark Unwatched
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkOperation('delete')}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </>
        )}

        {/* Add Button */}
        <Button onClick={onAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>

        {/* More Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSelectAll}>Select All</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export Watchlist
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share Watchlist
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
