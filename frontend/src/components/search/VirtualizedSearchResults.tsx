'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { FixedSizeList as List, ListOnItemsRenderedProps } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { useIntersectionObserver } from '@/lib/performance-utils';
import { PaywalledSearchResult } from '@/lib/types/paywall';

interface VirtualizedSearchResultsProps {
  results: PaywalledSearchResult[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadMore: () => void;
  itemHeight?: number;
  height?: number;
  className?: string;
  renderItem: (result: PaywalledSearchResult, index: number) => React.ReactNode;
  onItemClick?: (result: PaywalledSearchResult, index: number) => void;
}

interface ListItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    results: PaywalledSearchResult[];
    hasNextPage: boolean;
    renderItem: (result: PaywalledSearchResult, index: number) => React.ReactNode;
    onItemClick?: (result: PaywalledSearchResult, index: number) => void;
  };
}

const ListItem: React.FC<ListItemProps> = React.memo(({ index, style, data }) => {
  const { results, hasNextPage: _hasNextPage, renderItem, onItemClick } = data;
  const isItemLoaded = index < results.length;

  // Loading placeholder
  if (!isItemLoaded) {
    return (
      <div style={style} className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  const result = results[index];

  return (
    <div
      style={style}
      onClick={() => onItemClick?.(result, index)}
      className="cursor-pointer hover:bg-muted transition-colors"
    >
      {renderItem(result, index)}
    </div>
  );
});

ListItem.displayName = 'ListItem';

export const VirtualizedSearchResults: React.FC<VirtualizedSearchResultsProps> = React.memo(
  ({
    results,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
    itemHeight = 200,
    height = 600,
    className = '',
    renderItem,
    onItemClick,
  }) => {
    const [listRef, setListRef] = useState<List | null>(null);

    // Memoize the item count
    const itemCount = useMemo(() => {
      return hasNextPage ? results.length + 1 : results.length;
    }, [results.length, hasNextPage]);

    // Memoize the item data
    const itemData = useMemo(
      () => ({
        results,
        hasNextPage,
        renderItem,
        onItemClick,
      }),
      [results, hasNextPage, renderItem, onItemClick]
    );

    // Check if an item is loaded
    const isItemLoaded = useCallback(
      (index: number) => {
        return index < results.length;
      },
      [results.length]
    );

    // Load more items
    const loadMoreItems = useCallback(async () => {
      if (!isFetchingNextPage && hasNextPage) {
        loadMore();
      }
    }, [isFetchingNextPage, hasNextPage, loadMore]);

    // Intersection observer for detecting when we need to load more
    const handleIntersection = useCallback(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            loadMore();
          }
        });
      },
      [hasNextPage, isFetchingNextPage, loadMore]
    );

    const { observe: _observeIntersection } = useIntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: '100px',
    });

    // Observe the last few items for infinite loading
    useEffect(() => {
      if (listRef && results.length > 0) {
        const _lastItemIndex = Math.max(0, results.length - 3);
        // This would ideally observe the actual DOM elements, but react-window
        // handles virtualization. We rely on InfiniteLoader instead.
      }
    }, [listRef, results.length]);

    // Reset scroll position when results change significantly
    useEffect(() => {
      if (listRef && results.length === 0) {
        listRef.scrollToItem(0);
      }
    }, [listRef, results.length]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (!listRef) return;

        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            // Implement keyboard navigation if needed
            break;
          case 'ArrowUp':
            event.preventDefault();
            // Implement keyboard navigation if needed
            break;
          case 'Home':
            event.preventDefault();
            listRef.scrollToItem(0);
            break;
          case 'End':
            event.preventDefault();
            listRef.scrollToItem(results.length - 1);
            break;
        }
      },
      [listRef, results.length]
    );

    if (results.length === 0 && !hasNextPage) {
      return (
        <div className={`flex items-center justify-center ${className}`} style={{ height }}>
          <p className="text-muted-foreground text-lg">No results found</p>
        </div>
      );
    }

    return (
      <div
        className={`${className} focus-within:outline-none`}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="listbox"
        aria-label="Search results"
      >
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={itemCount}
          loadMoreItems={loadMoreItems}
          threshold={5} // Start loading when 5 items away from the end
        >
          {({ onItemsRendered, ref }) => (
            <List
              ref={list => {
                ref(list);
                setListRef(list);
              }}
              height={height}
              width="100%"
              itemCount={itemCount}
              itemSize={itemHeight}
              itemData={itemData}
              onItemsRendered={(props: ListOnItemsRenderedProps) => {
                onItemsRendered({
                  startIndex: props.visibleStartIndex,
                  stopIndex: props.visibleStopIndex,
                });
              }}
              className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-muted/30"
              overscanCount={5} // Render 5 extra items outside viewport
            >
              {ListItem}
            </List>
          )}
        </InfiniteLoader>

        {/* Loading indicator */}
        {isFetchingNextPage && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading more results...</span>
          </div>
        )}
      </div>
    );
  }
);

VirtualizedSearchResults.displayName = 'VirtualizedSearchResults';

export default VirtualizedSearchResults;
