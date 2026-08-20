// Grid View Component for Watchlist Items

'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useMemo, useCallback, useState } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { WatchlistItem } from '@/types/watchlist';
import { WatchlistItemCard } from './WatchlistItemCard';
import { cn } from '@/lib/utils';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { EmptyState } from '@/components/ui/empty-state';
import { Tv } from 'lucide-react';

interface WatchlistGridProps {
  items: WatchlistItem[];
  selectedItems: Set<string>;
  isLoading: boolean;
  gridSize: 'small' | 'medium' | 'large';
  onItemSelect: (id: string) => void;
  onItemUpdate: (item: WatchlistItem) => void;
  onItemRemove: (id: string) => void;
  className?: string;
}

export const WatchlistGrid: React.FC<WatchlistGridProps> = ({
  items,
  selectedItems,
  isLoading,
  gridSize,
  onItemSelect,
  onItemUpdate,
  onItemRemove,
  className,
}) => {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const { width, height } = useResizeObserver(containerRef);

  // Grid sizing configuration
  const gridConfig = useMemo(() => {
    const configs = {
      small: { width: 200, height: 300, gap: 12 },
      medium: { width: 240, height: 360, gap: 16 },
      large: { width: 280, height: 420, gap: 20 },
    };
    return configs[gridSize];
  }, [gridSize]);

  // Calculate grid dimensions
  const { columnCount, rowCount, columnWidth, rowHeight } = useMemo(() => {
    if (!width || !height) {
      return { columnCount: 0, rowCount: 0, columnWidth: 0, rowHeight: 0 };
    }

    const availableWidth = width - gridConfig.gap;
    const _availableHeight = height - gridConfig.gap;

    const columnCount = Math.max(1, Math.floor(availableWidth / (gridConfig.width + gridConfig.gap)));
    const rowCount = Math.ceil(items.length / columnCount);

    const columnWidth = Math.floor(availableWidth / columnCount);
    const rowHeight = gridConfig.height + gridConfig.gap;

    return { columnCount, rowCount, columnWidth, rowHeight };
  }, [width, height, gridConfig, items.length]);

  // Grid cell renderer
  const Cell = useCallback(
    ({ columnIndex, rowIndex, style }: any) => {
      const itemIndex = rowIndex * columnCount + columnIndex;
      const item = items[itemIndex];

      if (!item) {
        return <div style={style} />;
      }

      const isSelected = selectedItems.has(item.id);

      return (
        <div
          style={{
            ...style,
            padding: gridConfig.gap / 2,
          }}
        >
          <WatchlistItemCard
            item={item}
            view="grid"
            isSelected={isSelected}
            onSelect={onItemSelect}
            onUpdate={onItemUpdate}
            onRemove={onItemRemove}
            className="h-full"
          />
        </div>
      );
    },
    [items, selectedItems, columnCount, gridConfig.gap, onItemSelect, onItemUpdate, onItemRemove]
  );

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6">
      {Array.from({ length: 20 }).map((_, index) => (
        <div key={index} className="animate-pulse bg-muted rounded-lg min-h-[44px]" style={{ height: gridConfig.height }}>
          <div className="h-3/4 bg-muted-foreground/20 rounded-t-lg" />
          <div className="p-3 sm:p-4 md:p-6 space-y-2">
            <div className="h-4 bg-muted-foreground/20 rounded" />
            <div className="h-3 bg-muted-foreground/20 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state using shared EmptyState component
  const WatchlistEmptyState = () => (
    <EmptyState
      icon={<Tv className="h-12 w-12" />}
      title="No items in your watchlist"
      description="Start building your watchlist by adding movies and TV shows"
      action={{
        label: 'Add Your First Item',
        onClick: () => {
          /* Handle add item */
        },
      }}
      suggestions={[
        'Search for movies or TV shows',
        'Browse trending content',
        'Check out recommendations',
      ]}
      className="h-full"
    />
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (items.length === 0) {
    return <WatchlistEmptyState />;
  }

  if (!width || !height) {
    return <div ref={setContainerRef} className={cn('w-full h-full', className)} />;
  }

  return (
    <div ref={setContainerRef} className={cn('w-full h-full', className)}>
      <Grid
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={height}
        rowCount={rowCount}
        rowHeight={rowHeight}
        width={width}
        overscanRowCount={2}
        overscanColumnCount={2}
        style={{
          scrollbarWidth: 'thin',
        }}
      >
        {Cell}
      </Grid>
    </div>
  );
};
