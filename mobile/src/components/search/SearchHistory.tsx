import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ViewStyle,
  TextStyle,
  Alert,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SearchHistory as SearchHistoryType } from '../../types/streaming';
import { useTheme } from '../../theme/ThemeProvider';
import { logger } from '../../utils/logger';

interface SearchHistoryProps {
  history: SearchHistoryType[];
  onHistoryItemPress: (item: SearchHistoryType) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onExportHistory?: () => void;
  maxItems?: number;
  showDate?: boolean;
  showResultCount?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  onHistoryItemPress,
  onRemoveItem,
  onClearAll,
  onExportHistory,
  maxItems = 10,
  showDate = true,
  showResultCount = true,
  style,
  testID = 'search-history',
}) => {
  const { theme } = useTheme();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const animatedValues = useMemo(() => {
    const values: Record<string, Animated.Value> = {};
    history.forEach(item => {
      values[item.id] = new Animated.Value(0);
    });
    return values;
  }, [history]);

  const displayHistory = useMemo(() => {
    return history.slice(0, maxItems);
  }, [history, maxItems]);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, SearchHistoryType[]> = {};
    const now = new Date();

    displayHistory.forEach(item => {
      const itemDate = new Date(item.timestamp);
      const diffTime = Math.abs(now.getTime() - itemDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let groupKey: string;
      if (diffDays === 0) {
        groupKey = 'Today';
      } else if (diffDays === 1) {
        groupKey = 'Yesterday';
      } else if (diffDays <= 7) {
        groupKey = 'This Week';
      } else if (diffDays <= 30) {
        groupKey = 'This Month';
      } else {
        groupKey = 'Older';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    return groups;
  }, [displayHistory]);

  // @ts-expect-error - SearchHistory type conflicts
  const handleItemPress = useCallback((item: SearchHistory) => {
    onHistoryItemPress(item);
  }, [onHistoryItemPress]);

  // @ts-expect-error - SearchHistory type conflicts
  const handleRemoveItem = useCallback((item: SearchHistory) => {
    Alert.alert(
      'Remove Search',
      `Remove "${item.query}" from search history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemoveItem(item.id),
        },
      ],
    );
  }, [onRemoveItem]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear Search History',
      'Are you sure you want to clear all search history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: onClearAll,
        },
      ],
    );
  }, [onClearAll]);

  const handleExpandItem = useCallback((itemId: string) => {
    if (expandedItem === itemId) {
      setExpandedItem(null);
      Animated.timing(animatedValues[itemId], {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      // Collapse previous item if any
      if (expandedItem) {
        Animated.timing(animatedValues[expandedItem], {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }

      setExpandedItem(itemId);
      Animated.timing(animatedValues[itemId], {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [expandedItem, animatedValues]);

  // @ts-expect-error - SearchHistory type conflicts
  const handleShareItem = useCallback((item: SearchHistory) => {
    // In a real app, this would open a share dialog
    Alert.alert(
      'Share Search',
      `Share search query: "${item.query}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => logger.log('[SearchHistory] Sharing', { query: item.query }) },
      ],
    );
  }, []);

  // @ts-expect-error - SearchHistory type conflicts
  const handleReplaySearch = useCallback((item: SearchHistory) => {
    onHistoryItemPress(item);
  }, [onHistoryItemPress]);

  const formatRelativeTime = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {return 'Just now';}
    if (minutes < 60) {return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;}
    if (hours < 24) {return `${hours} hour${hours > 1 ? 's' : ''} ago`;}
    if (days < 7) {return `${days} day${days > 1 ? 's' : ''} ago`;}
    return new Date(timestamp).toLocaleDateString();
  }, []);

  // @ts-expect-error - SearchHistory type conflicts
  const renderRightActions = useCallback((item: SearchHistory) => {
    return (
      <View style={styles(theme).swipeActions}>
        <TouchableOpacity
          style={[styles(theme).actionButton, styles(theme).shareButton]}
          onPress={() => handleShareItem(item)}
        >
          <Icon name="share" size={20} color={theme.semantic.text.inverse} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles(theme).actionButton, styles(theme).deleteButton]}
          onPress={() => handleRemoveItem(item)}
        >
          <Icon name="delete" size={20} color={theme.semantic.text.inverse} />
        </TouchableOpacity>
      </View>
    );
  }, [handleShareItem, handleRemoveItem, theme]);

  // @ts-expect-error - SearchHistory type conflicts
  const renderHistoryItem = useCallback(({ item, index }: { item: SearchHistory; index: number }) => {
    const isExpanded = expandedItem === item.id;
    const animatedHeight = animatedValues[item.id]?.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    }) || new Animated.Value(0);

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
        testID={`${testID}-swipeable-${index}`}
      >
        <TouchableOpacity
          style={[
            styles(theme).historyItem,
            isExpanded && styles(theme).historyItemExpanded,
          ]}
          onPress={() => handleItemPress(item)}
          onLongPress={() => handleExpandItem(item.id)}
          testID={`${testID}-item-${index}`}
        >
          <View style={styles(theme).historyItemContent}>
            {/* Icon */}
            <View style={styles(theme).historyIcon}>
              <Icon name="history" size={20} color={theme.semantic.text.secondary} />
            </View>

            {/* Main Content */}
            <View style={styles(theme).historyMainContent}>
              <View style={styles(theme).historyHeader}>
                <Text style={styles(theme).historyQuery} numberOfLines={isExpanded ? undefined : 1}>
                  {item.query}
                </Text>
                {showResultCount && (
                  <Text style={styles(theme).resultCount}>
                    {item.resultCount} results
                  </Text>
                )}
              </View>

              {showDate && (
                <Text style={styles(theme).historyTimestamp}>
                  {formatRelativeTime(item.timestamp)}
                </Text>
              )}

              {/* Expanded Content */}
              <Animated.View style={[styles(theme).expandedContent, { height: animatedHeight }]}>
                {isExpanded && (
                  <View style={styles(theme).expandedActions}>
                    <TouchableOpacity
                      style={styles(theme).expandedAction}
                      onPress={() => handleReplaySearch(item)}
                    >
                      <Icon name="replay" size={16} color={theme.colors.primary[500]} />
                      <Text style={styles(theme).expandedActionText}>Replay Search</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles(theme).expandedAction}
                      onPress={() => handleShareItem(item)}
                    >
                      <Icon name="share" size={16} color={theme.colors.primary[500]} />
                      <Text style={styles(theme).expandedActionText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles(theme).expandedAction}
                      onPress={() => handleRemoveItem(item)}
                    >
                      <Icon name="delete" size={16} color={theme.colors.error[500]} />
                      <Text style={[styles(theme).expandedActionText, styles(theme).expandedActionTextDanger]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>

              {/* Filters Summary */}
              {item.filters && Object.keys(item.filters).length > 0 && (
                <View style={styles(theme).filtersSummary}>
                  <Text style={styles(theme).filtersSummaryText}>
                    Filters applied: {Object.keys(item.filters).length}
                  </Text>
                </View>
              )}
            </View>

            {/* Expand/Collapse Icon */}
            {(showResultCount || item.filters) && (
              <Icon
                name={isExpanded ? 'expand-less' : 'expand-more'}
                size={20}
                color={theme.semantic.text.tertiary}
                style={styles(theme).expandIcon as any}
              />
            )}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  }, [
    expandedItem,
    animatedValues,
    showResultCount,
    showDate,
    handleItemPress,
    handleExpandItem,
    handleReplaySearch,
    handleShareItem,
    handleRemoveItem,
    renderRightActions,
    formatRelativeTime,
    testID,
    theme,
  ]);

  const renderSectionHeader = useCallback((title: string, itemCount: number) => (
    <View style={styles(theme).sectionHeader}>
      <Text style={styles(theme).sectionTitle}>{title}</Text>
      <Text style={styles(theme).sectionCount}>{itemCount} {itemCount === 1 ? 'search' : 'searches'}</Text>
    </View>
  ), [theme]);

  const renderEmptyState = useCallback(() => (
    <View style={styles(theme).emptyContainer}>
      <Icon name="history" size={48} color={theme.semantic.text.tertiary} />
      <Text style={styles(theme).emptyTitle}>No Search History</Text>
      <Text style={styles(theme).emptyMessage}>
        Your recent searches will appear here
      </Text>
    </View>
  ), [theme]);

  const renderHeader = useCallback(() => {
    if (history.length === 0) {return null;}

    return (
      <View style={styles(theme).header}>
        <Text style={styles(theme).headerTitle}>Search History</Text>
        <View style={styles(theme).headerActions}>
          {onExportHistory && (
            <TouchableOpacity
              style={styles(theme).headerButton}
              onPress={onExportHistory}
              testID={`${testID}-export-button`}
            >
              <Icon name="download" size={18} color={theme.colors.primary[500]} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles(theme).headerButton}
            onPress={handleClearAll}
            testID={`${testID}-clear-all-button`}
          >
            <Icon name="clear-all" size={18} color={theme.colors.error[500]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [history.length, onExportHistory, handleClearAll, testID, theme]);

  if (history.length === 0) {
    return (
      <View style={[styles(theme).container, style]} testID={testID}>
        {renderHeader()}
        {renderEmptyState()}
      </View>
    );
  }

  return (
    <View style={[styles(theme).container, style]} testID={testID}>
      {renderHeader()}

      <FlatList
        data={Object.entries(groupedHistory)}
        keyExtractor={([key]) => key}
        renderItem={({ item: [sectionTitle, sectionItems] }) => (
          <View style={styles(theme).section}>
            {renderSectionHeader(sectionTitle, sectionItems.length)}
            <View style={styles(theme).sectionContent}>
              {sectionItems.map((historyItem, itemIndex) => (
                <View key={historyItem.id}>
                  {renderHistoryItem({ item: historyItem, index: itemIndex })}
                  {itemIndex < sectionItems.length - 1 && (
                    <View style={styles(theme).itemSeparator} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles(theme).contentContainer}
      />
    </View>
  );
};

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.semantic.border.primary,
  } as ViewStyle,
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.semantic.text.primary,
  } as TextStyle,
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  } as ViewStyle,
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.semantic.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  contentContainer: {
    paddingBottom: 16,
  } as ViewStyle,
  section: {
    marginBottom: 24,
  } as ViewStyle,
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.semantic.background.secondary,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.semantic.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  sectionCount: {
    fontSize: 12,
    color: theme.semantic.text.tertiary,
  } as TextStyle,
  sectionContent: {
    paddingHorizontal: 16,
  } as ViewStyle,
  historyItem: {
    backgroundColor: theme.semantic.background.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.semantic.background.secondary,
  } as ViewStyle,
  historyItemExpanded: {
    backgroundColor: theme.colors.primary[50],
  } as ViewStyle,
  historyItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  } as ViewStyle,
  historyIcon: {
    marginRight: 12,
    marginTop: 2,
  } as ViewStyle,
  historyMainContent: {
    flex: 1,
  } as ViewStyle,
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  } as ViewStyle,
  historyQuery: {
    flex: 1,
    fontSize: 16,
    color: theme.semantic.text.primary,
    fontWeight: '500',
    marginRight: 12,
  } as TextStyle,
  resultCount: {
    fontSize: 13,
    color: theme.semantic.text.secondary,
  } as TextStyle,
  historyTimestamp: {
    fontSize: 13,
    color: theme.semantic.text.tertiary,
    marginBottom: 4,
  } as TextStyle,
  expandedContent: {
    overflow: 'hidden',
    marginTop: 8,
  } as ViewStyle,
  expandedActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  } as ViewStyle,
  expandedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  } as ViewStyle,
  expandedActionText: {
    fontSize: 14,
    color: theme.colors.primary[500],
    marginLeft: 6,
    fontWeight: '500',
  } as TextStyle,
  expandedActionTextDanger: {
    color: theme.colors.error[500],
  } as TextStyle,
  filtersSummary: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.primary[50],
    borderRadius: 6,
    alignSelf: 'flex-start',
  } as ViewStyle,
  filtersSummaryText: {
    fontSize: 12,
    color: theme.colors.primary[500],
    fontWeight: '500',
  } as TextStyle,
  expandIcon: {
    marginLeft: 8,
    marginTop: 2,
  } as ViewStyle,
  itemSeparator: {
    height: 1,
    backgroundColor: theme.semantic.background.secondary,
    marginLeft: 48,
  } as ViewStyle,
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  actionButton: {
    width: 70,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  shareButton: {
    backgroundColor: theme.colors.primary[500],
  } as ViewStyle,
  deleteButton: {
    backgroundColor: theme.colors.error[500],
  } as ViewStyle,
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginTop: 16,
    marginBottom: 8,
  } as TextStyle,
  emptyMessage: {
    fontSize: 14,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
  } as TextStyle,
});

export default SearchHistory;
