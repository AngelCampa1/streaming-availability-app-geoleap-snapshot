// Drag and Drop functionality for Watchlist organization

'use client';

import React, { useState, useCallback } from 'react';
import { WatchlistItem, WatchlistCategory } from '@/types/watchlist';
import { cn } from '@/lib/utils';

interface DragDropContextProps {
  children: React.ReactNode;
  onItemMove?: (itemId: string, newCategory: string) => void;
  onItemReorder?: (itemId: string, newIndex: number) => void;
}

// Simple drag and drop context without external libraries
export const WatchlistDragDropContext: React.FC<DragDropContextProps> = ({ children, onItemMove: _onItemMove, onItemReorder: _onItemReorder }) => {
  const [_draggedItem, _setDraggedItem] = useState<string | null>(null);
  const [_dropTarget, _setDropTarget] = useState<string | null>(null);

  return <div className="h-full">{children}</div>;
};

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  className?: string;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
  id,
  children,
  onDragStart,
  onDragEnd,
  isDragging = false,
  className,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      setIsDragActive(true);
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
      onDragStart?.(id);
    },
    [id, onDragStart]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragActive(false);
    onDragEnd?.();
  }, [onDragEnd]);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'transition-all duration-200',
        (isDragging || isDragActive) && 'opacity-50 scale-95 rotate-2',
        className
      )}
    >
      {children}
    </div>
  );
};

interface DropZoneProps {
  id: string;
  children: React.ReactNode;
  onDrop?: (droppedId: string, targetId: string) => void;
  acceptTypes?: string[];
  className?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({ id, children, onDrop, acceptTypes: _acceptTypes = ['*'], className }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only set isOver to false if we're leaving the dropzone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);

      const droppedId = e.dataTransfer.getData('text/plain');
      if (droppedId && droppedId !== id) {
        onDrop?.(droppedId, id);
      }
    },
    [id, onDrop]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'transition-all duration-200',
        isOver && 'bg-primary/10 border-primary border-dashed border-2',
        className
      )}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 bg-primary/5 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-primary font-medium">Drop here</div>
        </div>
      )}
    </div>
  );
};

// Category drop zone component
interface CategoryDropZoneProps {
  category: WatchlistCategory;
  onItemDrop: (itemId: string, categoryId: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const CategoryDropZone: React.FC<CategoryDropZoneProps> = ({ category, onItemDrop, children, className }) => {
  return (
    <DropZone
      id={category.id}
      onDrop={(droppedId, targetId) => onItemDrop(droppedId, targetId)}
      className={cn('relative', className)}
    >
      {children}
    </DropZone>
  );
};

// Sortable list for reordering items
interface SortableListProps {
  items: WatchlistItem[];
  onReorder: (itemId: string, newIndex: number) => void;
  renderItem: (item: WatchlistItem, index: number) => React.ReactNode;
  className?: string;
}

export const SortableList: React.FC<SortableListProps> = ({ items, onReorder, renderItem, className }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [_dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  }, []);

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex !== toIndex && items[fromIndex]) {
        onReorder(items[fromIndex].id, toIndex);
      }
    },
    [items, onReorder]
  );

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item, index) => (
        <div key={item.id} className="relative">
          {/* Drop zone above each item */}
          <DropZone
            id={`before-${index}`}
            onDrop={droppedId => {
              const draggedItem = items.find(i => i.id === droppedId);
              const draggedIdx = items.findIndex(i => i.id === droppedId);
              if (draggedItem && draggedIdx !== -1) {
                handleReorder(draggedIdx, index);
              }
            }}
            className="h-2 -mb-2 relative z-10"
          >
            <div className="h-full w-full" />
          </DropZone>

          <DraggableItem
            id={item.id}
            onDragStart={() => handleDragStart(index)}
            onDragEnd={handleDragEnd}
            isDragging={draggedIndex === index}
          >
            {renderItem(item, index)}
          </DraggableItem>
        </div>
      ))}

      {/* Final drop zone */}
      <DropZone
        id={`after-${items.length}`}
        onDrop={droppedId => {
          const draggedItem = items.find(i => i.id === droppedId);
          const draggedIdx = items.findIndex(i => i.id === droppedId);
          if (draggedItem && draggedIdx !== -1) {
            handleReorder(draggedIdx, items.length);
          }
        }}
        className="h-4"
      >
        <div className="h-full w-full" />
      </DropZone>
    </div>
  );
};

// Hook for drag and drop functionality
export const useDragAndDrop = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const startDrag = useCallback((itemId: string) => {
    setIsDragging(true);
    setDraggedItem(itemId);
  }, []);

  const endDrag = useCallback(() => {
    setIsDragging(false);
    setDraggedItem(null);
  }, []);

  return {
    isDragging,
    draggedItem,
    startDrag,
    endDrag,
  };
};

// Touch gestures for mobile drag and drop
export const useTouchGestures = () => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Detect swipe gestures
    if (distance > 50) {
      const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

      if (Math.abs(angle) < 45) {
        // Right swipe
        return 'swipe-right';
      } else if (Math.abs(angle) > 135) {
        // Left swipe
        return 'swipe-left';
      } else if (angle > 45 && angle < 135) {
        // Down swipe
        return 'swipe-down';
      } else if (angle < -45 && angle > -135) {
        // Up swipe
        return 'swipe-up';
      }
    }

    return null;
  }, [touchStart, touchEnd]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};
