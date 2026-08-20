/**
 * Draggable Watchlist Component
 * Allows drag-drop reordering of watchlist items
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Animated, PanResponder } from 'react-native';
import { Text, Surface, IconButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';

interface WatchlistItem {
  id: string;
  title: string;
  type: 'movie' | 'series';
  year?: number;
  posterUrl?: string;
  rating?: number;
  progress?: number;
  streamingService?: string;
}

interface DraggableWatchlistProps {
  items: WatchlistItem[];
  onReorder: (items: WatchlistItem[]) => void;
  onItemPress?: (item: WatchlistItem) => void;
  onRemoveItem?: (item: WatchlistItem) => void;
  isEditMode?: boolean;
}

export const DraggableWatchlist: React.FC<DraggableWatchlistProps> = ({
  items,
  onReorder,
  onItemPress,
  onRemoveItem,
  isEditMode = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [orderedItems, setOrderedItems] = useState(items);

  // Update when items prop changes
  React.useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;

    const newItems = [...orderedItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setOrderedItems(newItems);
    onReorder(newItems);
  }, [orderedItems, onReorder]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === orderedItems.length - 1) return;

    const newItems = [...orderedItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setOrderedItems(newItems);
    onReorder(newItems);
  }, [orderedItems, onReorder]);

  const renderItem = (item: WatchlistItem, index: number) => {
    const isFirst = index === 0;
    const isLast = index === orderedItems.length - 1;

    return (
      <Surface
        key={item.id}
        style={[
          styles.itemCard,
          draggedIndex === index && styles.draggedCard,
        ]}
        elevation={draggedIndex === index ? 4 : 1}
      >
        {isEditMode && (
          <View style={styles.reorderControls}>
            <IconButton
              icon="arrow-upward"
              size={20}
              onPress={() => handleMoveUp(index)}
              disabled={isFirst}
              style={[styles.reorderButton, isFirst && styles.disabledButton]}
            />
            <IconButton
              icon="arrow-downward"
              size={20}
              onPress={() => handleMoveDown(index)}
              disabled={isLast}
              style={[styles.reorderButton, isLast && styles.disabledButton]}
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => !isEditMode && onItemPress?.(item)}
          activeOpacity={isEditMode ? 1 : 0.7}
        >
          {/* Position Badge */}
          <View style={[styles.positionBadge, { backgroundColor: theme.colors.primary[500] }]}>
            <Text style={styles.positionText}>{index + 1}</Text>
          </View>

          {/* Poster */}
          {item.posterUrl ? (
            <Image
              source={{ uri: item.posterUrl }}
              style={styles.poster}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.posterPlaceholder, { backgroundColor: theme.colors.gray[200] }]}>
              <Icon name="movie" size={24} color={theme.colors.gray[400]} />
            </View>
          )}

          {/* Info */}
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.itemMeta}>
              <Text style={styles.itemType}>
                {item.type === 'movie' ? 'Movie' : 'TV Series'}
              </Text>
              {item.year && (
                <Text style={styles.itemYear}>{item.year}</Text>
              )}
            </View>
            {item.progress !== undefined && item.progress > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${item.progress}%`, backgroundColor: theme.colors.primary[500] },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{item.progress}%</Text>
              </View>
            )}
          </View>

          {/* Rating */}
          {item.rating && (
            <View style={styles.ratingContainer}>
              <Icon name="star" size={16} color={theme.colors.warning[500]} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </TouchableOpacity>

        {isEditMode && onRemoveItem && (
          <IconButton
            icon="close"
            size={20}
            onPress={() => onRemoveItem(item)}
            style={styles.removeButton}
            iconColor={theme.colors.error[500]}
          />
        )}

        {!isEditMode && (
          <Icon
            name="chevron-right"
            size={24}
            color={theme.semantic.text.tertiary}
            style={styles.chevron}
          />
        )}
      </Surface>
    );
  };

  if (orderedItems.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Icon name="bookmark-border" size={48} color={theme.semantic.text.tertiary} />
        <Text style={styles.emptyTitle}>No items in watchlist</Text>
        <Text style={styles.emptyDescription}>
          Add movies and shows to keep track of what you want to watch
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {orderedItems.map((item, index) => renderItem(item, index))}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    gap: theme.spacing[3],
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.semantic.background.secondary,
    overflow: 'hidden',
  },
  draggedCard: {
    opacity: 0.9,
    transform: [{ scale: 1.02 }],
  },
  reorderControls: {
    justifyContent: 'center',
    paddingLeft: theme.spacing[1],
  },
  reorderButton: {
    margin: 0,
  },
  disabledButton: {
    opacity: 0.3,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    gap: theme.spacing[3],
  },
  positionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.inverse,
  },
  poster: {
    width: 50,
    height: 75,
    borderRadius: theme.borderRadius.sm,
  },
  posterPlaceholder: {
    width: 50,
    height: 75,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  itemMeta: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  itemType: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  itemYear: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.tertiary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginTop: theme.spacing[2],
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    width: 32,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  ratingText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
  },
  removeButton: {
    margin: 0,
  },
  chevron: {
    marginRight: theme.spacing[2],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing[10],
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  emptyDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing[6],
  },
});

export default DraggableWatchlist;
