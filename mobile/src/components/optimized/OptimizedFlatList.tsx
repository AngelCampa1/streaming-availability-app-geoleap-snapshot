/**
 * Optimized FlatList Component
 * Demonstrates best practices for FlatList performance
 *
 * OPTIMIZATIONS:
 * - windowSize for virtual scrolling
 * - getItemLayout for skipping measurement
 * - removeClippedSubviews for Android optimization
 * - Memoized renderItem
 * - Proper key extraction
 */

import React, { useCallback, useMemo } from 'react';
import { FlatList, FlatListProps, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface OptimizedFlatListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactElement;
  itemHeight?: number; // If all items have same height, provide it for optimization
  keyExtractor: (item: T, index: number) => string;
}

/**
 * Optimized FlatList with performance best practices
 */
export function OptimizedFlatList<T>({
  items,
  renderItem,
  itemHeight,
  keyExtractor,
  ...rest
}: OptimizedFlatListProps<T>) {
  // Memoize renderItem to prevent recreating on every render
  const memoizedRenderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      return renderItem(item, index);
    },
    [renderItem]
  );

  // Optimize getItemLayout if item height is known
  const getItemLayout = useMemo(() => {
    if (itemHeight) {
      return (_data: unknown, index: number) => ({
        length: itemHeight,
        offset: itemHeight * index,
        index,
      });
    }
    return undefined;
  }, [itemHeight]);

  return (
    <FlatList
      data={items}
      renderItem={memoizedRenderItem}
      keyExtractor={keyExtractor}
      // Performance optimizations
      windowSize={5} // Render 5 screens worth of content
      maxToRenderPerBatch={10} // Batch render 10 items at a time
      initialNumToRender={10} // Initial render count
      removeClippedSubviews={true} // Remove offscreen views (Android optimization)
      updateCellsBatchingPeriod={50} // Debounce updates by 50ms
      getItemLayout={getItemLayout}
      {...rest}
    />
  );
}

/**
 * Example: Optimized Search Results List
 */
interface SearchResult {
  id: string;
  title: string;
  description: string;
  updatedAt: number;
}

// Memoize individual list items
const SearchResultItem = React.memo<{
  result: SearchResult;
  onPress: (id: string) => void;
}>(
  ({ result, onPress }) => {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    const handlePress = useCallback(() => {
      onPress(result.id);
    }, [onPress, result.id]);

    return (
      <View style={styles.resultItem}>
        <Text style={styles.title}>{result.title}</Text>
        <Text style={styles.description}>{result.description}</Text>
        <Text style={styles.meta} onPress={handlePress}>
          View Details
        </Text>
      </View>
    );
  },
  // Custom comparison function for deep equality
  (prevProps, nextProps) => {
    return (
      prevProps.result.id === nextProps.result.id &&
      prevProps.result.updatedAt === nextProps.result.updatedAt &&
      prevProps.onPress === nextProps.onPress
    );
  }
);

/**
 * Example usage of OptimizedFlatList with SearchResults
 */
export const SearchResultsList: React.FC<{
  results: SearchResult[];
  onResultPress: (id: string) => void;
}> = ({ results, onResultPress }) => {
  // Memoize callback to prevent recreating on every render
  const handleResultPress = useCallback(
    (id: string) => {
      onResultPress(id);
    },
    [onResultPress]
  );

  // Memoize renderItem
  const renderResult = useCallback(
    (result: SearchResult) => {
      return <SearchResultItem result={result} onPress={handleResultPress} />;
    },
    [handleResultPress]
  );

  // Memoize key extractor
  const keyExtractor = useCallback((result: SearchResult) => result.id, []);

  return (
    <OptimizedFlatList
      data={results}
      items={results}
      renderItem={renderResult}
      keyExtractor={keyExtractor}
      itemHeight={80} // If all items are 80px tall
    />
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.semantic.border.primary,
    height: 80,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: theme.semantic.text.primary,
  },
  description: {
    fontSize: 14,
    color: theme.semantic.text.secondary,
    marginBottom: 8,
  },
  meta: {
    fontSize: 12,
    color: theme.colors.primary[500],
  },
});

export default OptimizedFlatList;
