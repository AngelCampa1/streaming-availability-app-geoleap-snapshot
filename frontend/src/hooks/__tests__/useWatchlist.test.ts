/**
 * Comprehensive tests for useWatchlist.ts hooks
 *
 * Coverage Target: 85%+
 * Strategy: Test all 10 hooks covering auth-aware queries, mutations, real-time updates, and state management
 *
 * Hooks tested:
 * 1. useWatchlist - Main CRUD operations with React Query
 * 2. useWatchlistCategories - Categories management
 * 3. useWatchlistViews - Views management
 * 4. useWatchlistSync - Real-time sync status
 * 5. useWatchlistUpdates - Event listeners
 * 6. useWatchlistStats - Statistics
 * 7. useWatchlistSearch - Search functionality
 * 8. useWatchlistNotifications - Notifications
 * 9. useWatchlistFilters - localStorage filters
 * 10. useWatchlistSelection - Bulk selection state
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  useWatchlist,
  useWatchlistCategories,
  useWatchlistViews,
  useWatchlistSync,
  useWatchlistUpdates,
  useWatchlistStats,
  useWatchlistSearch,
  useWatchlistNotifications,
  useWatchlistFilters,
  useWatchlistSelection,
} from '../useWatchlist';
import { useAuth } from '@/contexts/AuthContext';
import watchlistApi from '@/services/watchlistApi';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/services/watchlistApi');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockWatchlistApi = watchlistApi as jest.Mocked<typeof watchlistApi>;

// Mock localStorage for Jest environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Save original localStorage for restoration
const originalLocalStorage = global.localStorage;

beforeAll(() => {
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
});

afterAll(() => {
  Object.defineProperty(global, 'localStorage', {
    value: originalLocalStorage,
    configurable: true,
  });
});

// Helper to create QueryClient wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  // Use createElement instead of JSX to avoid .tsx requirement
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

// Default watchlist ID returned by getUserWatchlists mock
const DEFAULT_WATCHLIST_ID = 'watchlist-1';

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();

  // Default auth mock - authenticated
  mockUseAuth.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
  } as any);

  // Default getUserWatchlists mock - returns a default watchlist
  // This is required because useWatchlist calls useUserWatchlists to get the watchlist ID
  mockWatchlistApi.getUserWatchlists.mockResolvedValue([
    { id: DEFAULT_WATCHLIST_ID, name: 'My Watchlist', isDefault: true },
  ] as any);
});

describe('useWatchlist - Main Hook', () => {
  it('should fetch watchlist items when authenticated', async () => {
    const mockItems = [
      { id: '1', title: 'Movie 1', contentId: 'content-1' },
      { id: '2', title: 'Show 1', contentId: 'content-2' },
    ];

    mockWatchlistApi.getWatchlistItems.mockResolvedValue({
      success: true,
      data: mockItems,
    } as any);

    const { result } = renderHook(() => useWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual(mockItems);
    expect(mockWatchlistApi.getWatchlistItems).toHaveBeenCalledWith(DEFAULT_WATCHLIST_ID, undefined);
  });

  it('should not fetch when unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    } as any);

    renderHook(() => useWatchlist(), {
      wrapper: createWrapper(),
    });

    expect(mockWatchlistApi.getWatchlistItems).not.toHaveBeenCalled();
  });

  it('should not fetch while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    } as any);

    renderHook(() => useWatchlist(), {
      wrapper: createWrapper(),
    });

    expect(mockWatchlistApi.getWatchlistItems).not.toHaveBeenCalled();
  });

  it('should apply filters when provided', async () => {
    const mockFilter = { category: ['movies'], sortBy: 'title' as const, sortOrder: 'asc' as const };

    mockWatchlistApi.getWatchlistItems.mockResolvedValue({
      success: true,
      data: [],
    } as any);

    renderHook(() => useWatchlist(mockFilter), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockWatchlistApi.getWatchlistItems).toHaveBeenCalledWith(DEFAULT_WATCHLIST_ID, mockFilter);
    });
  });

  it('should add item via mutation', async () => {
    mockWatchlistApi.getWatchlistItems.mockResolvedValue({
      success: true,
      data: [],
    } as any);

    mockWatchlistApi.addWatchlistItem.mockResolvedValue({
      success: true,
      data: { id: '1', title: 'New Item' },
    } as any);

    const { result } = renderHook(() => useWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addItem({ title: 'New Item', type: 'movie' });
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(mockWatchlistApi.addWatchlistItem).toHaveBeenCalledWith(DEFAULT_WATCHLIST_ID, {
        title: 'New Item',
        type: 'movie',
      });
    });
  });

  it('should update item via mutation', async () => {
    mockWatchlistApi.getWatchlistItems.mockResolvedValue({
      success: true,
      data: [],
    } as any);

    mockWatchlistApi.updateWatchlistItem.mockResolvedValue({
      success: true,
      data: { id: '1', title: 'Updated Item' },
    } as any);

    const { result } = renderHook(() => useWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateItem({ id: '1', updates: { title: 'Updated Item' } });
    });

    await waitFor(() => {
      expect(mockWatchlistApi.updateWatchlistItem).toHaveBeenCalledWith('1', {
        title: 'Updated Item',
      });
    });
  });

  it('should remove item via mutation', async () => {
    mockWatchlistApi.getWatchlistItems.mockResolvedValue({
      success: true,
      data: [],
    } as any);

    mockWatchlistApi.removeWatchlistItem.mockResolvedValue({
      success: true,
    } as any);

    const { result } = renderHook(() => useWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.removeItem('1');
    });

    await waitFor(() => {
      expect(mockWatchlistApi.removeWatchlistItem).toHaveBeenCalledWith('1');
    });
  });

  it('should perform bulk operation', async () => {
    mockWatchlistApi.getWatchlistItems.mockResolvedValue({
      success: true,
      data: [],
    } as any);

    mockWatchlistApi.bulkOperation.mockResolvedValue({
      success: true,
    } as any);

    const { result } = renderHook(() => useWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const bulkOp = {
      operation: 'delete' as const,
      itemIds: ['1', '2', '3'],
    };

    act(() => {
      result.current.bulkOperation(bulkOp);
    });

    await waitFor(() => {
      expect(mockWatchlistApi.bulkOperation).toHaveBeenCalledWith(bulkOp);
    });
  });

  it('should handle custom watchlist ID', async () => {
    mockWatchlistApi.getWatchlistItems.mockResolvedValue({
      success: true,
      data: [],
    } as any);

    renderHook(() => useWatchlist(undefined, 'custom-watchlist'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockWatchlistApi.getWatchlistItems).toHaveBeenCalledWith(
        'custom-watchlist',
        undefined
      );
    });
  });
});

describe('useWatchlistCategories', () => {
  it('should fetch categories when authenticated', async () => {
    const mockCategories = [
      { id: '1', name: 'Action' },
      { id: '2', name: 'Comedy' },
    ];

    mockWatchlistApi.getCategories.mockResolvedValue({
      success: true,
      data: mockCategories,
    } as any);

    const { result } = renderHook(() => useWatchlistCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.categories).toEqual(mockCategories);
  });

  it('should not fetch when unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    } as any);

    renderHook(() => useWatchlistCategories(), {
      wrapper: createWrapper(),
    });

    expect(mockWatchlistApi.getCategories).not.toHaveBeenCalled();
  });

  it('should create category', async () => {
    mockWatchlistApi.getCategories.mockResolvedValue({
      success: true,
      data: [],
    } as any);

    mockWatchlistApi.createCategory.mockResolvedValue({
      success: true,
      data: { id: '1', name: 'New Category' },
    } as any);

    const { result } = renderHook(() => useWatchlistCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.createCategory({ name: 'New Category' });
    });

    await waitFor(() => {
      expect(mockWatchlistApi.createCategory).toHaveBeenCalledWith({
        name: 'New Category',
      });
    });
  });

  it('should update category', async () => {
    mockWatchlistApi.getCategories.mockResolvedValue({
      success: true,
      data: [],
    } as any);

    mockWatchlistApi.updateCategory.mockResolvedValue({
      success: true,
    } as any);

    const { result } = renderHook(() => useWatchlistCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateCategory({ id: '1', updates: { name: 'Updated' } });
    });

    await waitFor(() => {
      expect(mockWatchlistApi.updateCategory).toHaveBeenCalledWith('1', { name: 'Updated' });
    });
  });

  it('should delete category', async () => {
    mockWatchlistApi.getCategories.mockResolvedValue({
      success: true,
      data: [],
    } as any);

    mockWatchlistApi.deleteCategory.mockResolvedValue({
      success: true,
    } as any);

    const { result } = renderHook(() => useWatchlistCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.deleteCategory('1');
    });

    await waitFor(() => {
      expect(mockWatchlistApi.deleteCategory).toHaveBeenCalledWith('1');
    });
  });
});

describe('useWatchlistViews', () => {
  it('should fetch views when authenticated', async () => {
    const mockViews = [
      { id: '1', name: 'All Items' },
      { id: '2', name: 'Recently Added' },
    ];

    mockWatchlistApi.getViews.mockResolvedValue({
      success: true,
      data: mockViews,
    } as any);

    const { result } = renderHook(() => useWatchlistViews(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.views).toEqual(mockViews);
  });

  it('should create view', async () => {
    mockWatchlistApi.getViews.mockResolvedValue({
      success: true,
      data: [],
    } as any);

    mockWatchlistApi.createView.mockResolvedValue({
      success: true,
      data: { id: '1', name: 'New View' },
    } as any);

    const { result } = renderHook(() => useWatchlistViews(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.createView({ name: 'New View' });
    });

    await waitFor(() => {
      expect(mockWatchlistApi.createView).toHaveBeenCalledWith({ name: 'New View' });
    });
  });

  it('should update view', async () => {
    mockWatchlistApi.getViews.mockResolvedValue({
      success: true,
      data: [],
    } as any);

    mockWatchlistApi.updateView.mockResolvedValue({
      success: true,
    } as any);

    const { result } = renderHook(() => useWatchlistViews(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateView({ id: '1', updates: { name: 'Updated' } });
    });

    await waitFor(() => {
      expect(mockWatchlistApi.updateView).toHaveBeenCalledWith('1', { name: 'Updated' });
    });
  });
});

describe('useWatchlistSync', () => {
  it('should initialize with current sync status', () => {
    const mockSyncStatus = {
      isConnected: true,
      lastSync: new Date(),
      pendingChanges: 0,
      syncInProgress: false,
      connectionQuality: 'excellent' as const,
    };

    mockWatchlistApi.getSyncStatus.mockReturnValue(mockSyncStatus);

    const { result } = renderHook(() => useWatchlistSync());

    expect(result.current.syncStatus).toEqual(mockSyncStatus);
  });

  it('should update sync status when event fires', () => {
    mockWatchlistApi.getSyncStatus.mockReturnValue({
      isConnected: true,
      lastSync: new Date(),
      pendingChanges: 0,
      syncInProgress: false,
      connectionQuality: 'excellent' as const,
    });

    mockWatchlistApi.on = jest.fn();
    mockWatchlistApi.off = jest.fn();

    const { result } = renderHook(() => useWatchlistSync());

    const syncStatusChangedHandler = (mockWatchlistApi.on as jest.Mock).mock.calls.find(
      call => call[0] === 'syncStatusChanged'
    )?.[1];

    const newStatus = {
      isConnected: true,
      lastSync: new Date(),
      pendingChanges: 5,
      syncInProgress: true,
      connectionQuality: 'good' as const,
    };

    act(() => {
      syncStatusChangedHandler(newStatus);
    });

    expect(result.current.syncStatus).toEqual(newStatus);
  });

  it('should force sync when requested', async () => {
    mockWatchlistApi.getSyncStatus.mockReturnValue({
      isConnected: true,
      lastSync: new Date(),
      pendingChanges: 0,
      syncInProgress: false,
      connectionQuality: 'excellent' as const,
    });

    mockWatchlistApi.forcSync.mockResolvedValue(undefined);

    const { result } = renderHook(() => useWatchlistSync());

    await act(async () => {
      await result.current.forceSync();
    });

    expect(mockWatchlistApi.forcSync).toHaveBeenCalled();
  });

  it('should cleanup event listeners on unmount', () => {
    mockWatchlistApi.getSyncStatus.mockReturnValue({
      isConnected: true,
      lastSync: new Date(),
      pendingChanges: 0,
      syncInProgress: false,
      connectionQuality: 'excellent' as const,
    });

    mockWatchlistApi.on = jest.fn();
    mockWatchlistApi.off = jest.fn();

    const { unmount } = renderHook(() => useWatchlistSync());

    unmount();

    expect(mockWatchlistApi.off).toHaveBeenCalledWith('syncStatusChanged', expect.any(Function));
  });
});

describe('useWatchlistUpdates', () => {
  it('should set up event listeners on mount', () => {
    mockWatchlistApi.on = jest.fn();
    mockWatchlistApi.off = jest.fn();

    renderHook(() => useWatchlistUpdates(), {
      wrapper: createWrapper(),
    });

    expect(mockWatchlistApi.on).toHaveBeenCalledWith('itemUpdated', expect.any(Function));
    expect(mockWatchlistApi.on).toHaveBeenCalledWith(
      'availabilityChanged',
      expect.any(Function)
    );
  });

  it('should cleanup event listeners on unmount', () => {
    mockWatchlistApi.on = jest.fn();
    mockWatchlistApi.off = jest.fn();

    const { unmount } = renderHook(() => useWatchlistUpdates(), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(mockWatchlistApi.off).toHaveBeenCalledWith('itemUpdated', expect.any(Function));
    expect(mockWatchlistApi.off).toHaveBeenCalledWith(
      'availabilityChanged',
      expect.any(Function)
    );
  });
});

describe('useWatchlistStats', () => {
  it('should fetch stats when authenticated', async () => {
    const mockStats = {
      totalItems: 42,
      recentlyAdded: 5,
      availableNow: 30,
    };

    mockWatchlistApi.getStats.mockResolvedValue({
      success: true,
      data: mockStats,
    } as any);

    const { result } = renderHook(() => useWatchlistStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual(mockStats);
  });

  it('should not fetch when unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    } as any);

    renderHook(() => useWatchlistStats(), {
      wrapper: createWrapper(),
    });

    expect(mockWatchlistApi.getStats).not.toHaveBeenCalled();
  });
});

describe('useWatchlistSearch', () => {
  it('should initialize with empty search query', () => {
    const { result } = renderHook(() => useWatchlistSearch(), {
      wrapper: createWrapper(),
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.results).toEqual([]);
  });

  it('should not search with less than 3 characters', () => {
    const { result } = renderHook(() => useWatchlistSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSearchQuery('ab');
    });

    expect(mockWatchlistApi.searchContent).not.toHaveBeenCalled();
  });

  it('should search with 3+ characters', async () => {
    const mockResults = [
      { id: '1', title: 'Movie 1' },
      { id: '2', title: 'Movie 2' },
    ];

    mockWatchlistApi.searchContent.mockResolvedValue({
      success: true,
      data: mockResults,
    } as any);

    const { result } = renderHook(() => useWatchlistSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSearchQuery('action');
    });

    await waitFor(() => {
      expect(mockWatchlistApi.searchContent).toHaveBeenCalledWith('action', undefined);
    });

    await waitFor(() => {
      expect(result.current.results).toEqual(mockResults);
    });
  });

  it('should include search type when provided', async () => {
    mockWatchlistApi.searchContent.mockResolvedValue({
      success: true,
      data: [],
    } as any);

    const { result } = renderHook(() => useWatchlistSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSearchType('movie');
      result.current.setSearchQuery('action');
    });

    await waitFor(() => {
      expect(mockWatchlistApi.searchContent).toHaveBeenCalledWith('action', 'movie');
    });
  });
});

describe('useWatchlistNotifications', () => {
  it('should fetch notifications', async () => {
    const mockNotifications = [
      { id: '1', message: 'New item added', isRead: false },
      { id: '2', message: 'Item available', isRead: true },
    ];

    mockWatchlistApi.getNotifications.mockResolvedValue({
      success: true,
      data: mockNotifications,
    } as any);

    const { result } = renderHook(() => useWatchlistNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notifications).toEqual(mockNotifications);
    expect(result.current.unreadCount).toBe(1);
  });

  it('should mark notification as read', async () => {
    mockWatchlistApi.getNotifications.mockResolvedValue({
      success: true,
      data: [],
    } as any);

    mockWatchlistApi.markNotificationRead.mockResolvedValue({
      success: true,
    } as any);

    const { result } = renderHook(() => useWatchlistNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.markAsRead('1');
    });

    await waitFor(() => {
      expect(mockWatchlistApi.markNotificationRead).toHaveBeenCalledWith('1');
    });
  });
});

describe('useWatchlistFilters', () => {
  it('should initialize with default filters', () => {
    const { result } = renderHook(() => useWatchlistFilters());

    expect(result.current.filters).toEqual({
      sortBy: 'addedDate',
      sortOrder: 'desc',
    });
  });

  it('should load filters from localStorage', () => {
    const savedFilters = {
      sortBy: 'title' as const,
      sortOrder: 'asc' as const,
      category: ['movies'],
    };

    localStorage.setItem('watchlist-filters', JSON.stringify(savedFilters));

    const { result } = renderHook(() => useWatchlistFilters());

    expect(result.current.filters).toEqual(savedFilters);
  });

  it('should handle corrupted localStorage data', () => {
    localStorage.setItem('watchlist-filters', 'invalid-json');

    const { result } = renderHook(() => useWatchlistFilters());

    expect(result.current.filters).toEqual({
      sortBy: 'addedDate',
      sortOrder: 'desc',
    });
    expect(localStorage.getItem('watchlist-filters')).toBeNull();
  });

  it('should update filters and save to localStorage', () => {
    const { result } = renderHook(() => useWatchlistFilters());

    act(() => {
      result.current.updateFilters({ category: ['movies'], sortBy: 'title' as const });
    });

    expect(result.current.filters).toEqual({
      sortBy: 'title',
      sortOrder: 'desc',
      category: ['movies'],
    });

    const saved = JSON.parse(localStorage.getItem('watchlist-filters')!);
    expect(saved).toEqual(result.current.filters);
  });

  it('should reset filters to defaults', () => {
    const { result } = renderHook(() => useWatchlistFilters());

    act(() => {
      result.current.updateFilters({ category: ['movies'], sortBy: 'title' as const });
    });

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters).toEqual({
      sortBy: 'addedDate',
      sortOrder: 'desc',
    });
  });
});

describe('useWatchlistSelection', () => {
  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => useWatchlistSelection());

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedItemIds).toEqual([]);
  });

  it('should toggle item selection', () => {
    const { result } = renderHook(() => useWatchlistSelection());

    act(() => {
      result.current.toggleSelection('item-1');
    });

    expect(result.current.selectedCount).toBe(1);
    expect(result.current.selectedItemIds).toContain('item-1');

    act(() => {
      result.current.toggleSelection('item-1');
    });

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedItemIds).not.toContain('item-1');
  });

  it('should select all items', () => {
    const { result } = renderHook(() => useWatchlistSelection());

    act(() => {
      result.current.selectAll(['item-1', 'item-2', 'item-3']);
    });

    expect(result.current.selectedCount).toBe(3);
    expect(result.current.selectedItemIds).toEqual(['item-1', 'item-2', 'item-3']);
  });

  it('should clear selection', () => {
    const { result } = renderHook(() => useWatchlistSelection());

    act(() => {
      result.current.selectAll(['item-1', 'item-2']);
    });

    expect(result.current.selectedCount).toBe(2);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedItemIds).toEqual([]);
  });

  it('should handle multiple toggles correctly', () => {
    const { result } = renderHook(() => useWatchlistSelection());

    act(() => {
      result.current.toggleSelection('item-1');
      result.current.toggleSelection('item-2');
      result.current.toggleSelection('item-3');
    });

    expect(result.current.selectedCount).toBe(3);

    act(() => {
      result.current.toggleSelection('item-2');
    });

    expect(result.current.selectedCount).toBe(2);
    expect(result.current.selectedItemIds).toContain('item-1');
    expect(result.current.selectedItemIds).not.toContain('item-2');
    expect(result.current.selectedItemIds).toContain('item-3');
  });
});
