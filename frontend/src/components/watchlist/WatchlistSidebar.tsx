// Watchlist Sidebar with Categories and Views

'use client';

import React, { useState } from 'react';
import { WatchlistCategory, WatchlistView, WatchlistFilter, WatchlistStats } from '@/types/watchlist';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Grid,
  List,
  Star,
  Clock,
  TrendingUp,
  Calendar,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WatchlistSidebarProps {
  categories: WatchlistCategory[];
  views: WatchlistView[];
  currentView: WatchlistView;
  stats?: WatchlistStats;
  filters: WatchlistFilter;
  onViewChange: (view: WatchlistView) => void;
  onFilterChange: (filters: Partial<WatchlistFilter>) => void;
  onCategoryCreate: (category: Partial<WatchlistCategory>) => void;
  className?: string;
}

export const WatchlistSidebar: React.FC<WatchlistSidebarProps> = ({
  categories,
  views,
  currentView,
  stats,
  filters,
  onViewChange,
  onFilterChange,
  onCategoryCreate,
  className,
}) => {
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [viewsOpen, setViewsOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  // Handle category filter
  const handleCategoryFilter = (categoryId: string) => {
    const currentCategories = filters.category || [];
    const isSelected = currentCategories.includes(categoryId);

    const updatedCategories = isSelected
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];

    onFilterChange({ category: updatedCategories });
  };

  // Handle create category
  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      onCategoryCreate({
        name: newCategoryName.trim(),
        color: 'hsl(var(--primary))', // Use CSS variable for primary color
        isDefault: false,
        sortOrder: categories.length,
      });
      setNewCategoryName('');
      setShowCreateCategory(false);
    }
  };

  // Quick filter presets
  const quickFilters = [
    {
      name: 'Unwatched',
      icon: EyeOff,
      filter: { watched: false },
      count: stats ? stats.totalItems - stats.watchedItems : 0,
    },
    {
      name: 'Watched',
      icon: Eye,
      filter: { watched: true },
      count: stats?.watchedItems || 0,
    },
    {
      name: 'Available',
      icon: TrendingUp,
      filter: { availability: true },
      count: stats?.availableItems || 0,
    },
    {
      name: 'High Priority',
      icon: Star,
      filter: { priority: ['high'] },
      count: 0, // Would need to calculate from stats
    },
    {
      name: 'Recently Added',
      icon: Clock,
      filter: { sortBy: 'addedDate' as const, sortOrder: 'desc' as const },
      count: stats?.totalItems || 0,
    },
  ];

  return (
    <div className={cn('h-full bg-background border-r overflow-y-auto', className)}>
      <div className="p-4 space-y-6">
        {/* Stats Overview */}
        {stats && (
          <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-semibold">Overview</span>
                </div>
                {statsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-semibold text-lg">{stats.totalItems}</div>
                  <div className="text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-semibold text-lg">{stats.watchedItems}</div>
                  <div className="text-muted-foreground">Watched</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-semibold text-lg">{stats.availableItems}</div>
                  <div className="text-muted-foreground">Available</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-semibold text-lg">{stats.averageRating.toFixed(1)}</div>
                  <div className="text-muted-foreground">Avg Rating</div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Quick Filters */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Quick Filters
          </h3>
          <div className="space-y-1">
            {quickFilters.map(filter => {
              const Icon = filter.icon;
              const isActive =
                (filter.filter.watched !== undefined && filters.watched === filter.filter.watched) ||
                (filter.filter.availability !== undefined && filters.availability === filter.filter.availability) ||
                (filter.filter.priority && filters.priority?.includes(filter.filter.priority[0])) ||
                (filter.filter.sortBy && filters.sortBy === filter.filter.sortBy);

              return (
                <Button
                  key={filter.name}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-between h-auto p-2"
                  onClick={() => onFilterChange(filter.filter)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{filter.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {filter.count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Views */}
        <Collapsible open={viewsOpen} onOpenChange={setViewsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <Grid className="h-4 w-4" />
                <span className="font-semibold">Views</span>
              </div>
              {viewsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-3">
            {views.map(view => {
              const isActive = currentView.id === view.id;
              const ViewIcon = view.type === 'grid' ? Grid : List;

              return (
                <Button
                  key={view.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-between h-auto p-2"
                  onClick={() => onViewChange(view)}
                >
                  <div className="flex items-center gap-2">
                    <ViewIcon className="h-4 w-4" />
                    <span className="text-sm">{view.name}</span>
                  </div>
                  {view.isDefault && (
                    <Badge variant="outline" className="text-xs">
                      Default
                    </Badge>
                  )}
                </Button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Categories */}
        <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">Categories</span>
              </div>
              <div className="flex items-center gap-1">
                <Dialog open={showCreateCategory} onOpenChange={setShowCreateCategory}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={e => e.stopPropagation()}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Category</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Category name"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleCreateCategory()}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleCreateCategory}>Create</Button>
                        <Button variant="outline" onClick={() => setShowCreateCategory(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                {categoriesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-3">
            {categories.map(category => {
              const isSelected = filters.category?.includes(category.id) || false;

              return (
                <div key={category.id} className="flex items-center group">
                  <Button
                    variant={isSelected ? 'secondary' : 'ghost'}
                    className="flex-1 justify-start h-auto p-2"
                    onClick={() => handleCategoryFilter(category.id)}
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm truncate">{category.name}</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {!category.isDefault && (
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}

            {categories.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No categories yet. Create your first category to organize your watchlist.
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};
