/**
 * SEO Pages Hook - Manages page listing, filtering, and bulk operations
 */

import { useState, useEffect, useCallback } from 'react';
import { seoApiClient } from '@/lib/seo/api-client';
import { SeoPage, PaginationInfo, FilterOptions } from '@/lib/seo/types';

export function useSEOPages() {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  });
  const [filters, setFilters] = useState<FilterOptions>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchPages = useCallback(
    async (resetPagination = false) => {
      try {
        setLoading(true);
        const page = resetPagination ? 1 : pagination.page;

        const response = await seoApiClient.getPages({
          page,
          limit: pagination.limit,
          search: searchQuery || undefined,
          sortBy,
          sortOrder,
          // Convert array filters to comma-separated strings
          status: filters.status?.join(','),
          template: filters.template?.join(','),
          // Other filters that don't need conversion can be spread
          ...(filters.dateRange && { dateRange: filters.dateRange }),
          ...(filters.performance && { performance: filters.performance }),
        });

        if (resetPagination) {
          setPages(response.pages);
          setPagination({
            page: 1,
            limit: pagination.limit,
            total: response.total,
            hasMore: response.hasMore,
          });
        } else {
          setPages(prev => (page === 1 ? response.pages : [...prev, ...response.pages]));
          setPagination(prev => ({
            ...prev,
            page,
            total: response.total,
            hasMore: response.hasMore,
          }));
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pages');
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.limit, searchQuery, sortBy, sortOrder, filters]
  );

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const search = (query: string) => {
    setSearchQuery(query);
    fetchPages(true);
  };

  const applyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    fetchPages(true);
  };

  const sort = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
    fetchPages(true);
  };

  const selectPage = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === pages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pages.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const deletePage = async (id: string) => {
    try {
      await seoApiClient.deletePage(id);
      setPages(prev => prev.filter(p => p.id !== id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete page');
    }
  };

  const deleteSelectedPages = async () => {
    try {
      const idsToDelete = Array.from(selectedIds);
      await seoApiClient.deletePages(idsToDelete);
      setPages(prev => prev.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete pages');
    }
  };

  const regeneratePage = async (id: string) => {
    try {
      await seoApiClient.regeneratePage(id);
      // Optionally update the page status
      setPages(prev =>
        prev.map(p => (p.id === id ? { ...p, status: 'draft' as const, updatedAt: new Date().toISOString() } : p))
      );
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to regenerate page');
    }
  };

  const regenerateSelectedPages = async () => {
    try {
      const idsToRegenerate = Array.from(selectedIds);
      await seoApiClient.regeneratePages(idsToRegenerate);
      // Update pages status
      setPages(prev =>
        prev.map(p =>
          selectedIds.has(p.id) ? { ...p, status: 'draft' as const, updatedAt: new Date().toISOString() } : p
        )
      );
      setSelectedIds(new Set());
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to regenerate pages');
    }
  };

  useEffect(() => {
    fetchPages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  useEffect(() => {
    fetchPages(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sortBy, sortOrder, filters]);

  return {
    pages,
    loading,
    error,
    selectedIds: Array.from(selectedIds),
    pagination,
    searchQuery,
    sortBy,
    sortOrder,
    filters,
    loadMore,
    search,
    applyFilters,
    sort,
    selectPage,
    selectAll,
    clearSelection,
    deletePage,
    deleteSelectedPages,
    regeneratePage,
    regenerateSelectedPages,
    refresh: () => fetchPages(true),
  };
}
