// Main Watchlist Dashboard Component

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WatchlistItem, WatchlistView, WatchlistFilter } from '@/types/watchlist';
import {
  useWatchlist,
  useWatchlistCategories,
  useWatchlistViews,
  useWatchlistFilters,
  useWatchlistSelection,
  useWatchlistSync,
  useWatchlistUpdates,
  useWatchlistStats,
} from '@/hooks/useWatchlist';
import { WatchlistToolbar } from './WatchlistToolbar';
import { WatchlistGrid } from './WatchlistGrid';
import { WatchlistList } from './WatchlistList';
import { WatchlistSidebar } from './WatchlistSidebar';
import { WatchlistSyncIndicator } from './WatchlistSyncIndicator';
import { WatchlistAddDialog } from './WatchlistAddDialog';
import { WatchlistExportDialog } from './WatchlistExportDialog';
import { WatchlistShareDialog } from './WatchlistShareDialog';
import { cn } from '@/lib/utils';

interface WatchlistDashboardProps {
  className?: string;
}

export const WatchlistDashboard: React.FC<WatchlistDashboardProps> = ({ className }) => {
  // State management
  const [currentView, setCurrentView] = useState<WatchlistView | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // E2E BUG FIX: Track if we've initialized the view to prevent infinite loops
  const viewInitialized = useRef(false);

  // Filters and search
  const { filters, updateFilters, resetFilters: _resetFilters } = useWatchlistFilters();

  // Data hooks
  const {
    items,
    isLoading,
    addItem,
    updateItem: updateItemMutation,
    removeItem,
    bulkOperation,
  } = useWatchlist(filters);

  const handleItemUpdate = (item: WatchlistItem) => {
    updateItemMutation({ id: item.id, updates: item });
  };
  const { categories } = useWatchlistCategories();
  const { views } = useWatchlistViews();
  const { stats } = useWatchlistStats();

  // Real-time features
  const { syncStatus } = useWatchlistSync();
  useWatchlistUpdates(); // Enable real-time updates

  // Selection management
  const { selectedItems, selectedItemIds, selectedCount, toggleSelection, selectAll, clearSelection } =
    useWatchlistSelection();

  // E2E BUG FIX: Initialize view once when data is ready
  useEffect(() => {
    // Skip if already initialized
    if (viewInitialized.current) return;

    // Wait for queries to complete (not loading state)
    const viewsLoaded = views !== undefined;

    if (viewsLoaded && !currentView) {
      if (views.length > 0) {
        // Use backend-provided views
        const defaultView = views.find(v => v.isDefault) || views[0];
        setCurrentView(defaultView);
      } else {
        // Backend doesn't provide views - create default client-side view
        const defaultClientView: WatchlistView = {
          id: 'default-grid',
          name: 'All Items',
          type: 'grid',
          filter: {
            sortBy: 'addedDate',
            sortOrder: 'desc',
          },
          isDefault: true,
          isPublic: false,
        };
        setCurrentView(defaultClientView);
      }
      viewInitialized.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views]); // Only depend on views, not currentView - ref guard prevents re-runs

  // Apply view filters when view changes
  useEffect(() => {
    if (currentView) {
      updateFilters(currentView.filter);
    }
    // Only run when currentView changes, not when updateFilters changes
    // updateFilters is stable enough and including it causes infinite loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  // Filtered and sorted items
  const processedItems = useMemo(() => {
    let filtered = items;

    // Apply text search
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.genre?.some((g: string) => g.toLowerCase().includes(query)) ||
          item.tags?.some((t: string) => t.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (filters.type?.length) {
      filtered = filtered.filter(item => filters.type!.includes(item.type));
    }

    if (filters.genre?.length) {
      filtered = filtered.filter(item => item.genre?.some((g: string) => filters.genre!.includes(g)));
    }

    if (filters.category?.length) {
      filtered = filtered.filter(item => item.category && filters.category!.includes(item.category));
    }

    if (filters.watched !== undefined) {
      filtered = filtered.filter(item => item.watched === filters.watched);
    }

    if (filters.priority?.length) {
      filtered = filtered.filter(item => filters.priority!.includes(item.priority));
    }

    if (filters.availability !== undefined) {
      filtered = filtered.filter(item => item.availability.some((a: { isAvailable: boolean }) => a.isAvailable) === filters.availability);
    }

    // Apply date range
    if (filters.year?.min || filters.year?.max) {
      filtered = filtered.filter(item => {
        if (!item.year) return false;
        if (filters.year!.min && item.year < filters.year!.min) return false;
        if (filters.year!.max && item.year > filters.year!.max) return false;
        return true;
      });
    }

    // Apply rating range
    if (filters.rating?.min || filters.rating?.max) {
      filtered = filtered.filter(item => {
        if (!item.rating) return false;
        if (filters.rating!.min && item.rating < filters.rating!.min) return false;
        if (filters.rating!.max && item.rating > filters.rating!.max) return false;
        return true;
      });
    }

    // Sort items
    filtered.sort((a, b) => {
      const { sortBy, sortOrder } = filters;
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'addedDate':
          comparison = new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime();
          break;
        case 'year':
          comparison = (a.year || 0) - (b.year || 0);
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'lastChecked':
          comparison = new Date(a.lastChecked).getTime() - new Date(b.lastChecked).getTime();
          break;
        case 'priority':
          const priorityOrder: Record<string, number> = { low: 1, medium: 2, high: 3 };
          comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [items, filters]);

  // Event handlers
  const handleViewChange = (view: WatchlistView) => {
    setCurrentView(view);
  };

  const handleFilterChange = (newFilters: Partial<WatchlistFilter>) => {
    updateFilters(newFilters);
  };

  const handleBulkOperation = (operation: string) => {
    if (selectedCount === 0) return;

    switch (operation) {
      case 'delete':
        bulkOperation({
          itemIds: selectedItemIds,
          operation: 'delete',
        });
        break;
      case 'mark_watched':
        bulkOperation({
          itemIds: selectedItemIds,
          operation: 'mark_watched',
        });
        break;
      case 'mark_unwatched':
        bulkOperation({
          itemIds: selectedItemIds,
          operation: 'mark_unwatched',
        });
        break;
      case 'export':
        setShowExportDialog(true);
        break;
    }

    clearSelection();
  };

  const handleSelectAll = () => {
    if (selectedCount === processedItems.length) {
      clearSelection();
    } else {
      selectAll(processedItems.map(item => item.id));
    }
  };

  // BUG FIX: Better loading/empty state handling
  if (!currentView) {
    // If views are still loading, show a proper loading state
    if (views.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <div className="text-muted-foreground">Loading your watchlist...</div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading watchlist...</div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full bg-background', className)}>
      {/* Sidebar */}
      {sidebarOpen && (
        <WatchlistSidebar
          categories={categories}
          views={views}
          currentView={currentView}
          stats={stats}
          filters={filters}
          onViewChange={handleViewChange}
          onFilterChange={handleFilterChange}
          onCategoryCreate={() => {
            /* Handle category creation */
          }}
          className="w-64 border-r"
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Sync Indicator */}
        <WatchlistSyncIndicator syncStatus={syncStatus} className="border-b" />

        {/* Toolbar */}
        <WatchlistToolbar
          currentView={currentView}
          filters={filters}
          selectedCount={selectedCount}
          totalCount={processedItems.length}
          onViewChange={handleViewChange}
          onFilterChange={handleFilterChange}
          onAdd={() => setShowAddDialog(true)}
          onBulkOperation={handleBulkOperation}
          onSelectAll={handleSelectAll}
          onExport={() => setShowExportDialog(true)}
          onShare={() => setShowShareDialog(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          className="border-b"
        />

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {currentView.type === 'grid' ? (
            <WatchlistGrid
              items={processedItems}
              selectedItems={selectedItems}
              isLoading={isLoading}
              gridSize={currentView.gridSize || 'medium'}
              onItemSelect={toggleSelection}
              onItemUpdate={handleItemUpdate}
              onItemRemove={removeItem}
              className="h-full"
            />
          ) : (
            <WatchlistList
              items={processedItems}
              selectedItems={selectedItems}
              isLoading={isLoading}
              view={currentView.type}
              columnsVisible={currentView.columnsVisible}
              onItemSelect={toggleSelection}
              onItemUpdate={handleItemUpdate}
              onItemRemove={removeItem}
              className="h-full"
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <WatchlistAddDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        categories={categories}
        onAdd={addItem}
      />

      <WatchlistExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        selectedItems={selectedItemIds}
        categories={categories}
      />

      <WatchlistShareDialog open={showShareDialog} onOpenChange={setShowShareDialog} selectedItems={selectedItemIds} />
    </div>
  );
};
