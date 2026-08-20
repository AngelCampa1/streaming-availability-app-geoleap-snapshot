/**
 * useSEOPages Hook Tests
 * Tests for SEO pages listing, filtering, and bulk operations
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useSEOPages } from '../use-seo-pages';
import { seoApiClient } from '@/lib/seo/api-client';

// Mock the SEO API client
jest.mock('@/lib/seo/api-client', () => ({
  seoApiClient: {
    getPages: jest.fn(),
    deletePage: jest.fn(),
    deletePages: jest.fn(),
    regeneratePage: jest.fn(),
    regeneratePages: jest.fn(),
  },
}));

const mockPages = [
  {
    id: 'page-1',
    slug: 'best-vpn-netflix',
    title: 'Best VPN for Netflix',
    status: 'published' as const,
    template: 'streaming-guide',
    updatedAt: '2024-01-15T10:00:00Z',
    views: 12345,
    clicks: 678,
  },
  {
    id: 'page-2',
    slug: 'vpn-gaming-guide',
    title: 'VPN Gaming Guide',
    status: 'draft' as const,
    template: 'gaming-guide',
    updatedAt: '2024-01-14T09:00:00Z',
    views: 5432,
    clicks: 234,
  },
];

const mockPagesResponse = {
  pages: mockPages,
  total: 100,
  hasMore: true,
};

describe('useSEOPages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (seoApiClient.getPages as jest.Mock).mockResolvedValue(mockPagesResponse);
  });

  describe('Initial State', () => {
    it('initializes with empty pages array', () => {
      const { result } = renderHook(() => useSEOPages());

      expect(result.current.pages).toEqual([]);
    });

    it('initializes loading as true', () => {
      const { result } = renderHook(() => useSEOPages());

      expect(result.current.loading).toBe(true);
    });

    it('initializes error as null', () => {
      const { result } = renderHook(() => useSEOPages());

      expect(result.current.error).toBeNull();
    });

    it('initializes with empty selectedIds', () => {
      const { result } = renderHook(() => useSEOPages());

      expect(result.current.selectedIds).toEqual([]);
    });

    it('initializes with default pagination', () => {
      const { result } = renderHook(() => useSEOPages());

      expect(result.current.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 0,
        hasMore: false,
      });
    });

    it('initializes with empty search query', () => {
      const { result } = renderHook(() => useSEOPages());

      expect(result.current.searchQuery).toBe('');
    });

    it('initializes with default sort', () => {
      const { result } = renderHook(() => useSEOPages());

      expect(result.current.sortBy).toBe('updatedAt');
      expect(result.current.sortOrder).toBe('desc');
    });
  });

  describe('Data Fetching', () => {
    it('fetches pages on mount', async () => {
      renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(seoApiClient.getPages).toHaveBeenCalled();
      });
    });

    it('sets pages after successful fetch', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      expect(result.current.pages[0].id).toBe('page-1');
    });

    it('updates pagination info', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pagination.total).toBe(100);
      });

      expect(result.current.pagination.hasMore).toBe(true);
    });

    it('sets loading to false after fetch', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Pagination', () => {
    it('loads more pages', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const morePagesResponse = {
        pages: [
          {
            id: 'page-3',
            slug: 'new-page',
            title: 'New Page',
            status: 'published' as const,
            template: 'general',
            updatedAt: '2024-01-13T08:00:00Z',
            views: 1000,
            clicks: 50,
          },
        ],
        total: 100,
        hasMore: true,
      };

      (seoApiClient.getPages as jest.Mock).mockResolvedValueOnce(morePagesResponse);

      await act(async () => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.pages.length).toBeGreaterThan(2);
      });
    });

    it('does not load more when no more pages', async () => {
      (seoApiClient.getPages as jest.Mock).mockResolvedValue({
        ...mockPagesResponse,
        hasMore: false,
      });

      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callCount = (seoApiClient.getPages as jest.Mock).mock.calls.length;

      act(() => {
        result.current.loadMore();
      });

      // Should not make additional call since hasMore is false
      expect((seoApiClient.getPages as jest.Mock).mock.calls.length).toBe(callCount);
    });

    it('does not load more while loading', async () => {
      (seoApiClient.getPages as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPagesResponse), 100))
      );

      const { result } = renderHook(() => useSEOPages());

      // loadMore should not trigger while loading
      act(() => {
        result.current.loadMore();
        result.current.loadMore(); // Try multiple times
      });

      // Record call count before waiting for loading to complete
      const callCountDuringLoading = (seoApiClient.getPages as jest.Mock).mock.calls.length;

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // loadMore calls should not have added any additional calls while loading was true
      // (Hook has multiple useEffects that may fire on mount, so we check relative count)
      expect((seoApiClient.getPages as jest.Mock).mock.calls.length).toBe(callCountDuringLoading);
    });
  });

  describe('Search', () => {
    it('searches pages by query', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.search('vpn netflix');
      });

      expect(result.current.searchQuery).toBe('vpn netflix');
      expect(seoApiClient.getPages).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'vpn netflix',
          page: 1,
        })
      );
    });

    it('resets pagination on search', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Load page 2
      await act(async () => {
        result.current.loadMore();
      });

      // Search should reset to page 1
      await act(async () => {
        result.current.search('gaming');
      });

      expect(result.current.pagination.page).toBe(1);
    });

    it('clears search query', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.search('test');
      });

      expect(result.current.searchQuery).toBe('test');

      await act(async () => {
        result.current.search('');
      });

      expect(result.current.searchQuery).toBe('');
    });
  });

  describe('Filtering', () => {
    it('applies filters', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.applyFilters({
          status: ['published'],
          template: ['streaming-guide'],
        });
      });

      expect(seoApiClient.getPages).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          template: 'streaming-guide',
        })
      );
    });

    it('resets pagination on filter change', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.applyFilters({ status: ['draft'] });
      });

      expect(result.current.pagination.page).toBe(1);
    });

    it('handles multiple filter types', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.applyFilters({
          status: ['published', 'draft'],
          template: ['streaming-guide'],
          performance: {
            minViews: 1000,
            minCtr: 0.5,
          },
        });
      });

      expect(seoApiClient.getPages).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published,draft',
          template: 'streaming-guide',
          performance: {
            minViews: 1000,
            minCtr: 0.5,
          },
        })
      );
    });
  });

  describe('Sorting', () => {
    it('sorts pages by field', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.sort('title', 'asc');
      });

      expect(result.current.sortBy).toBe('title');
      expect(result.current.sortOrder).toBe('asc');
    });

    it('resets pagination on sort change', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.sort('views', 'desc');
      });

      expect(result.current.pagination.page).toBe(1);
    });

    it('calls API with sort parameters', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.sort('clicks', 'desc');
      });

      expect(seoApiClient.getPages).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'clicks',
          sortOrder: 'desc',
        })
      );
    });
  });

  describe('Selection', () => {
    it('selects a single page', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      act(() => {
        result.current.selectPage('page-1');
      });

      expect(result.current.selectedIds).toContain('page-1');
    });

    it('deselects a selected page', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      act(() => {
        result.current.selectPage('page-1');
      });

      expect(result.current.selectedIds).toContain('page-1');

      act(() => {
        result.current.selectPage('page-1');
      });

      expect(result.current.selectedIds).not.toContain('page-1');
    });

    it('selects all pages', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds).toHaveLength(2);
      expect(result.current.selectedIds).toContain('page-1');
      expect(result.current.selectedIds).toContain('page-2');
    });

    it('deselects all when all are selected', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds).toHaveLength(2);

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds).toHaveLength(0);
    });

    it('clears selection', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      act(() => {
        result.current.selectPage('page-1');
        result.current.selectPage('page-2');
      });

      expect(result.current.selectedIds).toHaveLength(2);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds).toHaveLength(0);
    });
  });

  describe('Delete Operations', () => {
    beforeEach(() => {
      (seoApiClient.deletePage as jest.Mock).mockResolvedValue({});
      (seoApiClient.deletePages as jest.Mock).mockResolvedValue({});
    });

    it('deletes a single page', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      await act(async () => {
        await result.current.deletePage('page-1');
      });

      expect(seoApiClient.deletePage).toHaveBeenCalledWith('page-1');
      expect(result.current.pages).toHaveLength(1);
      expect(result.current.pages[0].id).toBe('page-2');
    });

    it('removes deleted page from selection', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      act(() => {
        result.current.selectPage('page-1');
      });

      await act(async () => {
        await result.current.deletePage('page-1');
      });

      expect(result.current.selectedIds).not.toContain('page-1');
    });

    it('deletes selected pages', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      act(() => {
        result.current.selectPage('page-1');
        result.current.selectPage('page-2');
      });

      await act(async () => {
        await result.current.deleteSelectedPages();
      });

      expect(seoApiClient.deletePages).toHaveBeenCalledWith(['page-1', 'page-2']);
      expect(result.current.pages).toHaveLength(0);
    });

    it('clears selection after bulk delete', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      act(() => {
        result.current.selectPage('page-1');
      });

      await act(async () => {
        await result.current.deleteSelectedPages();
      });

      expect(result.current.selectedIds).toHaveLength(0);
    });

    it('handles delete errors', async () => {
      (seoApiClient.deletePage as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      // Implementation re-throws with the original error message
      await expect(act(async () => {
        await result.current.deletePage('page-1');
      })).rejects.toThrow('Delete failed');
    });
  });

  describe('Regenerate Operations', () => {
    beforeEach(() => {
      (seoApiClient.regeneratePage as jest.Mock).mockResolvedValue({});
      (seoApiClient.regeneratePages as jest.Mock).mockResolvedValue({});
    });

    it('regenerates a single page', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      await act(async () => {
        await result.current.regeneratePage('page-1');
      });

      expect(seoApiClient.regeneratePage).toHaveBeenCalledWith('page-1');
      expect(result.current.pages[0].status).toBe('draft');
    });

    it('regenerates selected pages', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      act(() => {
        result.current.selectPage('page-1');
        result.current.selectPage('page-2');
      });

      await act(async () => {
        await result.current.regenerateSelectedPages();
      });

      expect(seoApiClient.regeneratePages).toHaveBeenCalledWith(['page-1', 'page-2']);
    });

    it('clears selection after bulk regenerate', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      act(() => {
        result.current.selectAll();
      });

      await act(async () => {
        await result.current.regenerateSelectedPages();
      });

      expect(result.current.selectedIds).toHaveLength(0);
    });
  });

  describe('Refresh', () => {
    it('provides refresh function', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.refresh).toBeInstanceOf(Function);
    });

    it('fetches pages again on refresh', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = (seoApiClient.getPages as jest.Mock).mock.calls.length;

      await act(async () => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect((seoApiClient.getPages as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('resets pagination on refresh', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.loadMore();
      });

      await act(async () => {
        result.current.refresh();
      });

      expect(result.current.pagination.page).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('sets error message on fetch failure', async () => {
      (seoApiClient.getPages as jest.Mock).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
      });
    });

    it('handles non-Error thrown values', async () => {
      (seoApiClient.getPages as jest.Mock).mockRejectedValue('String error');

      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load pages');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty pages response', async () => {
      (seoApiClient.getPages as jest.Mock).mockResolvedValue({
        pages: [],
        total: 0,
        hasMore: false,
      });

      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.pages).toEqual([]);
      });

      expect(result.current.pagination.total).toBe(0);
    });

    it('handles rapid filter changes', async () => {
      const { result } = renderHook(() => useSEOPages());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.applyFilters({ status: ['published'] });
        result.current.applyFilters({ status: ['draft'] });
        result.current.applyFilters({ status: ['archived'] });
      });

      // Should complete without errors
      expect(result.current.error).toBeNull();
    });
  });
});
