// List View Component for Watchlist Items

'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { WatchlistItem } from '@/types/watchlist';
import { WatchlistItemCard } from './WatchlistItemCard';
import { cn } from '@/lib/utils';

interface WatchlistListProps {
  items: WatchlistItem[];
  selectedItems: Set<string>;
  isLoading: boolean;
  view: 'list' | 'compact';
  columnsVisible?: string[];
  onItemSelect: (id: string) => void;
  onItemUpdate: (item: WatchlistItem) => void;
  onItemRemove: (id: string) => void;
  className?: string;
}

export const WatchlistList: React.FC<WatchlistListProps> = ({
  items,
  selectedItems,
  isLoading,
  view,
  columnsVisible: _columnsVisible,
  onItemSelect,
  onItemUpdate,
  onItemRemove,
  className,
}) => {
  const itemHeight = view === 'compact' ? 60 : 80;

  const Row = ({ index, style }: any) => {
    const item = items[index];
    const isSelected = selectedItems.has(item.id);

    return (
      <div style={style}>
        <WatchlistItemCard
          item={item}
          view={view}
          isSelected={isSelected}
          onSelect={onItemSelect}
          onUpdate={onItemUpdate}
          onRemove={onItemRemove}
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="animate-pulse flex items-center p-3 border-b">
            <div className="w-4 h-4 bg-muted rounded mr-3" />
            <div className="w-12 h-16 bg-muted rounded mr-3" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
            <div className="flex gap-2">
              <div className="w-12 h-6 bg-muted rounded" />
              <div className="w-12 h-6 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('h-full', className)}>
      <List height={600} width="100%" itemCount={items.length} itemSize={itemHeight} overscanCount={5}>
        {Row}
      </List>
    </div>
  );
};
