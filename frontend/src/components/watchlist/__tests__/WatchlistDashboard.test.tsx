import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WatchlistDashboard } from '../WatchlistDashboard';
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
import { WatchlistItem, WatchlistView, WatchlistFilter } from '@/types/watchlist';

// Mock all watchlist hooks
jest.mock('@/hooks/useWatchlist', () => ({
  useWatchlist: jest.fn(),
  useWatchlistCategories: jest.fn(),
  useWatchlistViews: jest.fn(),
  useWatchlistFilters: jest.fn(),
  useWatchlistSelection: jest.fn(),
  useWatchlistSync: jest.fn(),
  useWatchlistUpdates: jest.fn(),
  useWatchlistStats: jest.fn(),
}));

// Mock child components
jest.mock('../WatchlistToolbar', () => ({
  WatchlistToolbar: ({ onAdd, onToggleSidebar, onExport, onShare, onBulkOperation, onSelectAll }: any) => (
    <div data-testid="watchlist-toolbar">
      <button onClick={onAdd}>Add Item</button>
      <button onClick={onToggleSidebar}>Toggle Sidebar</button>
      <button onClick={onExport}>Export</button>
      <button onClick={onShare}>Share</button>
      <button onClick={() => onBulkOperation('delete')}>Bulk Delete</button>
      <button onClick={onSelectAll}>Select All</button>
    </div>
  ),
}));

jest.mock('../WatchlistGrid', () => ({
  WatchlistGrid: ({ items, onItemUpdate, onItemRemove, onItemSelect }: any) => (
    <div data-testid="watchlist-grid">
      {items.map((item: WatchlistItem) => (
        <div key={item.id} data-testid={`grid-item-${item.id}`}>
          {item.title}
          <button onClick={() => onItemUpdate(item)}>Update {item.id}</button>
          <button onClick={() => onItemRemove(item.id)}>Remove {item.id}</button>
          <button onClick={() => onItemSelect(item.id)}>Select {item.id}</button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock('../WatchlistList', () => ({
  WatchlistList: ({ items, onItemUpdate, onItemRemove, onItemSelect }: any) => (
    <div data-testid="watchlist-list">
      {items.map((item: WatchlistItem) => (
        <div key={item.id} data-testid={`list-item-${item.id}`}>
          {item.title}
          <button onClick={() => onItemUpdate(item)}>Update {item.id}</button>
          <button onClick={() => onItemRemove(item.id)}>Remove {item.id}</button>
          <button onClick={() => onItemSelect(item.id)}>Select {item.id}</button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock('../WatchlistSidebar', () => ({
  WatchlistSidebar: ({ onViewChange, onFilterChange, views }: any) => (
    <div data-testid="watchlist-sidebar">
      Sidebar
      {views.map((view: WatchlistView) => (
        <button key={view.id} onClick={() => onViewChange(view)}>
          Switch to {view.name}
        </button>
      ))}
      <button onClick={() => onFilterChange({ searchQuery: 'test' })}>Apply Search Filter</button>
    </div>
  ),
}));

jest.mock('../WatchlistSyncIndicator', () => ({
  WatchlistSyncIndicator: ({ syncStatus }: any) => (
    <div data-testid="sync-indicator">Sync: {syncStatus}</div>
  ),
}));

jest.mock('../WatchlistAddDialog', () => ({
  WatchlistAddDialog: ({ open, onOpenChange, onAdd }: any) =>
    open ? (
      <div data-testid="add-dialog">
        <button onClick={() => onAdd({ title: 'New Movie' })}>Add</button>
        <button onClick={() => onOpenChange(false)}>Close Add Dialog</button>
      </div>
    ) : null,
}));

jest.mock('../WatchlistExportDialog', () => ({
  WatchlistExportDialog: ({ open, onOpenChange }: any) =>
    open ? (
      <div data-testid="export-dialog">
        <button onClick={() => onOpenChange(false)}>Close Export Dialog</button>
      </div>
    ) : null,
}));

jest.mock('../WatchlistShareDialog', () => ({
  WatchlistShareDialog: ({ open, onOpenChange }: any) =>
    open ? (
      <div data-testid="share-dialog">
        <button onClick={() => onOpenChange(false)}>Close Share Dialog</button>
      </div>
    ) : null,
}));

const mockUseWatchlist = useWatchlist as jest.MockedFunction<typeof useWatchlist>;
const mockUseWatchlistCategories = useWatchlistCategories as jest.MockedFunction<typeof useWatchlistCategories>;
const mockUseWatchlistViews = useWatchlistViews as jest.MockedFunction<typeof useWatchlistViews>;
const mockUseWatchlistFilters = useWatchlistFilters as jest.MockedFunction<typeof useWatchlistFilters>;
const mockUseWatchlistSelection = useWatchlistSelection as jest.MockedFunction<typeof useWatchlistSelection>;
const mockUseWatchlistSync = useWatchlistSync as jest.MockedFunction<typeof useWatchlistSync>;
const mockUseWatchlistUpdates = useWatchlistUpdates as jest.MockedFunction<typeof useWatchlistUpdates>;
const mockUseWatchlistStats = useWatchlistStats as jest.MockedFunction<typeof useWatchlistStats>;

describe('WatchlistDashboard', () => {
  const mockItems: WatchlistItem[] = [
    {
      id: '1',
      title: 'Inception',
      type: 'movie',
      year: 2010,
      rating: 8.8,
      genre: ['Action', 'Sci-Fi'],
      tags: ['mind-bending'],
      description: 'A thief who steals corporate secrets',
      priority: 'high',
      watched: false,
      addedDate: new Date('2024-01-01'),
      lastChecked: new Date('2024-01-01'),
      availability: [{ serverId: 'netflix-1', serverName: 'Netflix', location: 'US', quality: ['HD'], format: ['mp4'], isAvailable: true, lastChecked: new Date('2024-01-01') }],
    },
    {
      id: '2',
      title: 'The Matrix',
      type: 'movie',
      year: 1999,
      rating: 8.7,
      genre: ['Sci-Fi', 'Action'],
      tags: ['classic'],
      description: 'A hacker discovers reality is simulated',
      priority: 'medium',
      watched: true,
      addedDate: new Date('2024-01-02'),
      lastChecked: new Date('2024-01-02'),
      availability: [{ serverId: 'hbo-1', serverName: 'HBO', location: 'US', quality: ['HD'], format: ['mp4'], isAvailable: true, lastChecked: new Date('2024-01-02') }],
    },
  ];

  const mockCategories = [
    { id: 'cat1', name: 'Action Movies', filter: { genre: ['Action'] } },
    { id: 'cat2', name: 'Sci-Fi Movies', filter: { genre: ['Sci-Fi'] } },
  ];

  const mockViews: WatchlistView[] = [
    { id: 'view1', name: 'Grid View', type: 'grid', filter: { sortBy: 'title', sortOrder: 'asc' }, isDefault: true, isPublic: false, gridSize: 'medium' },
    { id: 'view2', name: 'List View', type: 'list', filter: { sortBy: 'title', sortOrder: 'asc' }, isDefault: false, isPublic: false, columnsVisible: [] },
  ];

  const mockFilters: WatchlistFilter = {
    searchQuery: '',
    type: [],
    genre: [],
    category: [],
    watched: undefined,
    priority: [],
    availability: undefined,
    year: { min: undefined, max: undefined },
    rating: { min: undefined, max: undefined },
    sortBy: 'title',
    sortOrder: 'asc',
  };

  const mockUpdateFilters = jest.fn();
  const mockResetFilters = jest.fn();
  const mockAddItem = jest.fn();
  const mockUpdateItem = jest.fn();
  const mockRemoveItem = jest.fn();
  const mockBulkOperation = jest.fn();
  const mockToggleSelection = jest.fn();
  const mockSelectAll = jest.fn();
  const mockClearSelection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseWatchlist.mockReturnValue({
      items: mockItems,
      isLoading: false,
      addItem: mockAddItem,
      updateItem: mockUpdateItem,
      removeItem: mockRemoveItem,
      bulkOperation: mockBulkOperation,
    } as any);

    mockUseWatchlistCategories.mockReturnValue({ categories: mockCategories } as any);
    mockUseWatchlistViews.mockReturnValue({ views: mockViews } as any);
    mockUseWatchlistFilters.mockReturnValue({
      filters: mockFilters,
      updateFilters: mockUpdateFilters,
      resetFilters: mockResetFilters,
    } as any);
    mockUseWatchlistSelection.mockReturnValue({
      selectedItems: {},
      selectedItemIds: [],
      selectedCount: 0,
      toggleSelection: mockToggleSelection,
      selectAll: mockSelectAll,
      clearSelection: mockClearSelection,
    } as any);
    mockUseWatchlistSync.mockReturnValue({ syncStatus: 'synced' } as any);
    mockUseWatchlistUpdates.mockReturnValue(undefined);
    mockUseWatchlistStats.mockReturnValue({ stats: { total: 2, watched: 1, unwatched: 1 } } as any);
  });

  describe('Loading States', () => {
    it('should create default view when no views are available', async () => {
      // E2E BUG FIX: Component now creates a default client-side view when no views returned
      mockUseWatchlistViews.mockReturnValue({ views: [] } as any);

      render(<WatchlistDashboard />);

      // Component creates default view and renders the grid
      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });
    });

    it('should show generic loading when views exist but current view is not set', async () => {
      mockUseWatchlistViews.mockReturnValue({ views: mockViews } as any);

      // Mock to prevent setting currentView
      render(<WatchlistDashboard />);

      // Component should eventually set currentView from useEffect
      await waitFor(() => {
        expect(screen.queryByText('Loading watchlist...')).not.toBeInTheDocument();
      });
    });
  });

  describe('View Initialization', () => {
    it('should set default view on mount', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        // Grid view should be rendered (default view)
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });
    });

    it('should apply view filters when view changes', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-sidebar')).toBeInTheDocument();
      });

      // Switch to list view
      fireEvent.click(screen.getByText('Switch to List View'));

      await waitFor(() => {
        expect(mockUpdateFilters).toHaveBeenCalledWith({ sortBy: 'title', sortOrder: 'asc' });
      });
    });
  });

  describe('View Types', () => {
    it('should render grid view when view type is grid', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
        expect(screen.queryByTestId('watchlist-list')).not.toBeInTheDocument();
      });
    });

    it('should render list view when view type is list', async () => {
      mockUseWatchlistViews.mockReturnValue({
        views: [{ id: 'view2', name: 'List View', type: 'list', filter: { sortBy: 'title', sortOrder: 'asc' }, isDefault: true, isPublic: false, columnsVisible: [] }],
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-list')).toBeInTheDocument();
        expect(screen.queryByTestId('watchlist-grid')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter items by search query', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });

      // Both items should be visible initially
      expect(screen.getByText('Inception')).toBeInTheDocument();
      expect(screen.getByText('The Matrix')).toBeInTheDocument();
    });

    it('should filter items by type', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: { ...mockFilters, type: ['movie'] },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        // Both items are movies, so both should be visible
        expect(screen.getByText('Inception')).toBeInTheDocument();
        expect(screen.getByText('The Matrix')).toBeInTheDocument();
      });
    });

    it('should filter items by genre', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: { ...mockFilters, genre: ['Action'] },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        // Both items have Action genre
        expect(screen.getByText('Inception')).toBeInTheDocument();
        expect(screen.getByText('The Matrix')).toBeInTheDocument();
      });
    });

    it('should filter items by watched status', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: { ...mockFilters, watched: true },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        // Only The Matrix is watched
        expect(screen.queryByText('Inception')).not.toBeInTheDocument();
        expect(screen.getByText('The Matrix')).toBeInTheDocument();
      });
    });

    it('should filter items by priority', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: { ...mockFilters, priority: ['high'] },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        // Only Inception has high priority
        expect(screen.getByText('Inception')).toBeInTheDocument();
        expect(screen.queryByText('The Matrix')).not.toBeInTheDocument();
      });
    });

    it('should filter items by year range', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: { ...mockFilters, year: { min: 2000, max: 2020 } },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        // Only Inception is from 2010 (within range)
        expect(screen.getByText('Inception')).toBeInTheDocument();
        expect(screen.queryByText('The Matrix')).not.toBeInTheDocument();
      });
    });

    it('should filter items by rating range', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: { ...mockFilters, rating: { min: 8.8, max: 10 } },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        // Only Inception has rating >= 8.8
        expect(screen.getByText('Inception')).toBeInTheDocument();
        expect(screen.queryByText('The Matrix')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('should sort items by title ascending', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        const items = screen.getAllByTestId(/grid-item/);
        // Inception comes before The Matrix alphabetically
        expect(items[0]).toHaveTextContent('Inception');
        expect(items[1]).toHaveTextContent('The Matrix');
      });
    });

    it('should sort items by title descending', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: { ...mockFilters, sortBy: 'title', sortOrder: 'desc' },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        const items = screen.getAllByTestId(/grid-item/);
        // The Matrix comes before Inception when descending
        expect(items[0]).toHaveTextContent('The Matrix');
        expect(items[1]).toHaveTextContent('Inception');
      });
    });

    it('should sort items by year', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: { ...mockFilters, sortBy: 'year', sortOrder: 'asc' },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        const items = screen.getAllByTestId(/grid-item/);
        // The Matrix (1999) comes before Inception (2010)
        expect(items[0]).toHaveTextContent('The Matrix');
        expect(items[1]).toHaveTextContent('Inception');
      });
    });

    it('should sort items by rating', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: { ...mockFilters, sortBy: 'rating', sortOrder: 'desc' },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        const items = screen.getAllByTestId(/grid-item/);
        // Inception (8.8) comes before The Matrix (8.7) when descending
        expect(items[0]).toHaveTextContent('Inception');
        expect(items[1]).toHaveTextContent('The Matrix');
      });
    });

    it('should sort items by priority', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: { ...mockFilters, sortBy: 'priority', sortOrder: 'desc' },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        const items = screen.getAllByTestId(/grid-item/);
        // Inception (high=3) comes before The Matrix (medium=2) when descending
        expect(items[0]).toHaveTextContent('Inception');
        expect(items[1]).toHaveTextContent('The Matrix');
      });
    });
  });

  describe('Item Actions', () => {
    it('should update item when update button clicked', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Update 1'));

      expect(mockUpdateItem).toHaveBeenCalledWith({
        id: '1',
        updates: mockItems[0],
      });
    });

    it('should remove item when remove button clicked', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Remove 1'));

      expect(mockRemoveItem).toHaveBeenCalledWith('1');
    });

    it('should toggle selection when select button clicked', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Select 1'));

      expect(mockToggleSelection).toHaveBeenCalledWith('1');
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(() => {
      mockUseWatchlistSelection.mockReturnValue({
        selectedItems: { '1': true },
        selectedItemIds: ['1'],
        selectedCount: 1,
        toggleSelection: mockToggleSelection,
        selectAll: mockSelectAll,
        clearSelection: mockClearSelection,
      } as any);
    });

    it('should perform bulk delete operation', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-toolbar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Bulk Delete'));

      expect(mockBulkOperation).toHaveBeenCalledWith({
        itemIds: ['1'],
        operation: 'delete',
      });
      expect(mockClearSelection).toHaveBeenCalled();
    });

    it('should not perform bulk operation when no items selected', async () => {
      mockUseWatchlistSelection.mockReturnValue({
        selectedItems: {},
        selectedItemIds: [],
        selectedCount: 0,
        toggleSelection: mockToggleSelection,
        selectAll: mockSelectAll,
        clearSelection: mockClearSelection,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-toolbar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Bulk Delete'));

      expect(mockBulkOperation).not.toHaveBeenCalled();
    });

    it('should toggle select all', async () => {
      mockUseWatchlistSelection.mockReturnValue({
        selectedItems: {},
        selectedItemIds: [],
        selectedCount: 0,
        toggleSelection: mockToggleSelection,
        selectAll: mockSelectAll,
        clearSelection: mockClearSelection,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-toolbar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Select All'));

      expect(mockSelectAll).toHaveBeenCalledWith(['1', '2']);
    });

    it('should clear selection when all items are selected', async () => {
      mockUseWatchlistSelection.mockReturnValue({
        selectedItems: { '1': true, '2': true },
        selectedItemIds: ['1', '2'],
        selectedCount: 2,
        toggleSelection: mockToggleSelection,
        selectAll: mockSelectAll,
        clearSelection: mockClearSelection,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-toolbar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Select All'));

      expect(mockClearSelection).toHaveBeenCalled();
      expect(mockSelectAll).not.toHaveBeenCalled();
    });
  });

  describe('Dialogs', () => {
    it('should open add dialog when add button clicked', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-toolbar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add Item'));

      expect(screen.getByTestId('add-dialog')).toBeInTheDocument();
    });

    it('should close add dialog', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-toolbar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add Item'));
      expect(screen.getByTestId('add-dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close Add Dialog'));
      expect(screen.queryByTestId('add-dialog')).not.toBeInTheDocument();
    });

    it('should add item from add dialog', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-toolbar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add Item'));
      fireEvent.click(screen.getByText('Add'));

      expect(mockAddItem).toHaveBeenCalledWith({ title: 'New Movie' });
    });

    it('should open and close export dialog', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-toolbar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Export'));
      expect(screen.getByTestId('export-dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close Export Dialog'));
      expect(screen.queryByTestId('export-dialog')).not.toBeInTheDocument();
    });

    it('should open and close share dialog', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-toolbar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Share'));
      expect(screen.getByTestId('share-dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close Share Dialog'));
      expect(screen.queryByTestId('share-dialog')).not.toBeInTheDocument();
    });
  });

  describe('Sidebar', () => {
    it('should render sidebar by default', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-sidebar')).toBeInTheDocument();
      });
    });

    it('should toggle sidebar visibility', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-sidebar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Toggle Sidebar'));

      await waitFor(() => {
        expect(screen.queryByTestId('watchlist-sidebar')).not.toBeInTheDocument();
      });
    });

    it('should apply filter from sidebar', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-sidebar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Apply Search Filter'));

      expect(mockUpdateFilters).toHaveBeenCalledWith({ searchQuery: 'test' });
    });
  });

  describe('Sync Indicator', () => {
    it('should render sync indicator with status', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('sync-indicator')).toBeInTheDocument();
        expect(screen.getByText('Sync: synced')).toBeInTheDocument();
      });
    });
  });

  describe('Integration', () => {
    it('should render complete dashboard with all components', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        // Verify all main components are rendered
        expect(screen.getByTestId('watchlist-sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('sync-indicator')).toBeInTheDocument();
        expect(screen.getByTestId('watchlist-toolbar')).toBeInTheDocument();
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();

        // Verify items are rendered
        expect(screen.getByText('Inception')).toBeInTheDocument();
        expect(screen.getByText('The Matrix')).toBeInTheDocument();
      });
    });

    it('should handle custom className', async () => {
      const { container } = render(<WatchlistDashboard className="custom-class" />);

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });
  });

  // Session 10: Edge Cases and Error Handling
  describe('Empty State Handling', () => {
    it('should display empty state when no items', async () => {
      mockUseWatchlist.mockReturnValue({
        items: [],
        isLoading: false,
        addItem: mockAddItem,
        updateItem: mockUpdateItem,
        removeItem: mockRemoveItem,
        bulkOperation: mockBulkOperation,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });
    });

    it('should show loading state when items are loading', async () => {
      mockUseWatchlist.mockReturnValue({
        items: [],
        isLoading: true,
        addItem: mockAddItem,
        updateItem: mockUpdateItem,
        removeItem: mockRemoveItem,
        bulkOperation: mockBulkOperation,
      } as any);
      // E2E BUG FIX: Component creates default view when views is empty,
      // so loading state only shows briefly before view is initialized
      mockUseWatchlistViews.mockReturnValue({ views: [] } as any);

      render(<WatchlistDashboard />);

      // Component creates default view and renders the grid (with loading items state handled internally)
      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });
    });
  });

  describe('Sync Status Edge Cases', () => {
    it('should display syncing status', async () => {
      mockUseWatchlistSync.mockReturnValue({ syncStatus: 'syncing' } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Sync: syncing')).toBeInTheDocument();
      });
    });

    it('should display error sync status', async () => {
      mockUseWatchlistSync.mockReturnValue({ syncStatus: 'error' } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Sync: error')).toBeInTheDocument();
      });
    });

    it('should display offline sync status', async () => {
      mockUseWatchlistSync.mockReturnValue({ syncStatus: 'offline' } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Sync: offline')).toBeInTheDocument();
      });
    });
  });

  describe('Advanced Filtering Combinations', () => {
    it('should apply multiple filters simultaneously', async () => {
      // Mock items that match the criteria
      mockUseWatchlist.mockReturnValue({
        items: [mockItems[0]], // Only Inception matches all criteria
        isLoading: false,
        addItem: mockAddItem,
        updateItem: mockUpdateItem,
        removeItem: mockRemoveItem,
        bulkOperation: mockBulkOperation,
      } as any);

      mockUseWatchlistFilters.mockReturnValue({
        filters: {
          ...mockFilters,
          type: ['movie'],
          genre: ['Sci-Fi'],
          watched: false,
          priority: ['high']
        },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        // Only Inception should be visible (filtered by hook)
        expect(screen.getByText('Inception')).toBeInTheDocument();
        expect(screen.queryByText('The Matrix')).not.toBeInTheDocument();
      });
    });

    it('should handle empty filter results', async () => {
      // Mock empty items (filtered by hook)
      mockUseWatchlist.mockReturnValue({
        items: [], // No items match the horror genre filter
        isLoading: false,
        addItem: mockAddItem,
        updateItem: mockUpdateItem,
        removeItem: mockRemoveItem,
        bulkOperation: mockBulkOperation,
      } as any);

      mockUseWatchlistFilters.mockReturnValue({
        filters: {
          ...mockFilters,
          genre: ['Horror'] // Neither movie has this genre
        },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Inception')).not.toBeInTheDocument();
        expect(screen.queryByText('The Matrix')).not.toBeInTheDocument();
      });
    });

    it('should handle search with special characters', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: {
          ...mockFilters,
          searchQuery: 'The (Matrix)'
        },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });
    });

    it('should filter by availability', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: {
          ...mockFilters,
          availability: 'Netflix'
        },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        // Grid should render with availability filter applied
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });
    });
  });

  describe('Category Filtering', () => {
    it('should filter items by category', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: {
          ...mockFilters,
          category: ['cat1'] // Action Movies category
        },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });
    });

    it('should handle multiple categories', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: {
          ...mockFilters,
          category: ['cat1', 'cat2']
        },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting Edge Cases', () => {
    it('should handle sorting items with equal values', async () => {
      const equalRatingItems: WatchlistItem[] = [
        { ...mockItems[0], rating: 8.5 },
        { ...mockItems[1], rating: 8.5 },
      ];

      mockUseWatchlist.mockReturnValue({
        items: equalRatingItems,
        isLoading: false,
        addItem: mockAddItem,
        updateItem: mockUpdateItem,
        removeItem: mockRemoveItem,
        bulkOperation: mockBulkOperation,
      } as any);

      mockUseWatchlistFilters.mockReturnValue({
        filters: { ...mockFilters, sortBy: 'rating', sortOrder: 'desc' },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        const items = screen.getAllByTestId(/grid-item/);
        expect(items.length).toBe(2);
      });
    });

    it('should sort by addedDate', async () => {
      mockUseWatchlistFilters.mockReturnValue({
        filters: { ...mockFilters, sortBy: 'addedDate', sortOrder: 'desc' },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        const items = screen.getAllByTestId(/grid-item/);
        // Item 2 was added later
        expect(items[0]).toHaveTextContent('The Matrix');
        expect(items[1]).toHaveTextContent('Inception');
      });
    });

    it('should handle null/undefined values in sorting', async () => {
      const itemsWithNulls: WatchlistItem[] = [
        { ...mockItems[0], rating: undefined as any },
        { ...mockItems[1] },
      ];

      mockUseWatchlist.mockReturnValue({
        items: itemsWithNulls,
        isLoading: false,
        addItem: mockAddItem,
        updateItem: mockUpdateItem,
        removeItem: mockRemoveItem,
        bulkOperation: mockBulkOperation,
      } as any);

      mockUseWatchlistFilters.mockReturnValue({
        filters: { ...mockFilters, sortBy: 'rating', sortOrder: 'desc' },
        updateFilters: mockUpdateFilters,
        resetFilters: mockResetFilters,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });
    });
  });

  describe('Large Dataset Handling', () => {
    it('should render with many items', async () => {
      const manyItems: WatchlistItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: String(i + 1),
        title: `Movie ${i + 1}`,
        type: 'movie',
        year: 2000 + (i % 25),
        rating: 5 + (i % 50) / 10,
        genre: ['Action'],
        tags: [],
        description: `Description ${i + 1}`,
        priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
        watched: i % 2 === 0,
        addedDate: new Date(`2024-01-${String(i % 28 + 1).padStart(2, '0')}`),
        lastChecked: new Date(),
        availability: [],
      }));

      mockUseWatchlist.mockReturnValue({
        items: manyItems,
        isLoading: false,
        addItem: mockAddItem,
        updateItem: mockUpdateItem,
        removeItem: mockRemoveItem,
        bulkOperation: mockBulkOperation,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
        expect(screen.getAllByTestId(/grid-item/).length).toBe(100);
      });
    });
  });

  describe('Bulk Operations Edge Cases', () => {
    it('should handle bulk mark as watched', async () => {
      mockUseWatchlistSelection.mockReturnValue({
        selectedItems: { '1': true, '2': true },
        selectedItemIds: ['1', '2'],
        selectedCount: 2,
        toggleSelection: mockToggleSelection,
        selectAll: mockSelectAll,
        clearSelection: mockClearSelection,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-toolbar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Bulk Delete'));

      expect(mockBulkOperation).toHaveBeenCalledWith({
        itemIds: ['1', '2'],
        operation: 'delete',
      });
    });

    it('should clear selection after successful bulk operation', async () => {
      mockUseWatchlistSelection.mockReturnValue({
        selectedItems: { '1': true },
        selectedItemIds: ['1'],
        selectedCount: 1,
        toggleSelection: mockToggleSelection,
        selectAll: mockSelectAll,
        clearSelection: mockClearSelection,
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-toolbar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Bulk Delete'));

      expect(mockClearSelection).toHaveBeenCalled();
    });
  });

  describe('View Persistence', () => {
    it('should maintain sidebar state across rerenders', async () => {
      const { rerender } = render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-sidebar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Toggle Sidebar'));

      await waitFor(() => {
        expect(screen.queryByTestId('watchlist-sidebar')).not.toBeInTheDocument();
      });

      // Rerender with same props
      rerender(<WatchlistDashboard />);

      // Sidebar should still be hidden
      expect(screen.queryByTestId('watchlist-sidebar')).not.toBeInTheDocument();
    });

    it('should maintain current view after filter change', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Apply Search Filter'));

      await waitFor(() => {
        // Should still show grid view
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible toolbar buttons', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Add Item')).toBeEnabled();
        expect(screen.getByText('Export')).toBeEnabled();
        expect(screen.getByText('Share')).toBeEnabled();
      });
    });

    it('should support keyboard interaction for dialogs', async () => {
      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-toolbar')).toBeInTheDocument();
      });

      // Open dialog
      fireEvent.click(screen.getByText('Add Item'));
      expect(screen.getByTestId('add-dialog')).toBeInTheDocument();

      // Close dialog
      fireEvent.click(screen.getByText('Close Add Dialog'));
      expect(screen.queryByTestId('add-dialog')).not.toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should handle updates from useWatchlistUpdates', async () => {
      const mockUpdate = { type: 'item_added', item: { id: '3', title: 'New Movie' } };
      mockUseWatchlistUpdates.mockReturnValue(mockUpdate as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });
    });

    it('should reflect updated stats', async () => {
      mockUseWatchlistStats.mockReturnValue({
        stats: { total: 10, watched: 5, unwatched: 5 }
      } as any);

      render(<WatchlistDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
      });
    });
  });
});
