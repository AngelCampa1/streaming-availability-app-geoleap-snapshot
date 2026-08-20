import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SearchHistory, SearchFilter } from '../../types/search';
import { useTheme } from '../../theme/ThemeProvider';

interface SearchHistoryComponentProps {
  history: SearchHistory[];
  onHistoryPress: (query: string, filters?: SearchFilter) => void;
  onRemoveHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  isLoading?: boolean;
  style?: any;
}

const { width: _width } = Dimensions.get('window');

const SearchHistoryComponent: React.FC<SearchHistoryComponentProps> = ({
  history,
  onHistoryPress,
  onRemoveHistoryItem,
  onClearHistory,
  isLoading = false,
  style,
}) => {
  const { theme } = useTheme();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.primary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.semantic.text.primary,
    },
    clearAllButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    clearAllText: {
      fontSize: 14,
      color: theme.colors.error[500],
      fontWeight: '500',
    },
    list: {
      flex: 1,
    },
    historyItem: {
      backgroundColor: theme.semantic.background.primary,
    },
    historyButton: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    historyContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    historyIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    contentContainer: {
      flex: 1,
    },
    queryText: {
      fontSize: 16,
      color: theme.semantic.text.primary,
      marginBottom: 4,
      fontWeight: '500',
    },
    metaContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    timeText: {
      fontSize: 12,
      color: theme.semantic.text.tertiary,
    },
    metaSeparator: {
      fontSize: 12,
      color: theme.semantic.text.tertiary,
      marginHorizontal: 6,
    },
    resultCountText: {
      fontSize: 12,
      color: theme.semantic.text.secondary,
    },
    filtersText: {
      fontSize: 12,
      color: theme.colors.primary[500],
      textDecorationLine: 'underline',
    },
    filtersContainer: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.semantic.border.primary,
    },
    filtersLabel: {
      fontSize: 12,
      color: theme.semantic.text.secondary,
      fontWeight: '500',
      marginBottom: 2,
    },
    filtersDetail: {
      fontSize: 12,
      color: theme.semantic.text.tertiary,
    },
    actionsContainer: {
      marginLeft: 8,
    },
    actionButton: {
      padding: 4,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 64,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.semantic.text.primary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: theme.semantic.text.tertiary,
      textAlign: 'center',
      lineHeight: 20,
    },
    loadingContainer: {
      padding: 16,
    },
    loadingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    loadingIcon: {
      width: 20,
      height: 20,
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: 10,
      marginRight: 12,
    },
    loadingContent: {
      flex: 1,
    },
    loadingText: {
      height: 16,
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: 8,
      marginBottom: 4,
    },
  }), [theme]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {return 'Just now';}
    if (diffInMinutes < 60) {return `${diffInMinutes}m ago`;}

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {return `${diffInHours}h ago`;}

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {return `${diffInDays}d ago`;}

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {return `${diffInWeeks}w ago`;}

    return date.toLocaleDateString();
  };

  const getFilterSummary = (filters?: SearchFilter): string => {
    if (!filters) {return '';}

    const parts: string[] = [];

    if (filters.type && filters.type.length > 0 && !filters.type.includes('all')) {
      parts.push(filters.type.join(', '));
    }

    if (filters.category) {
      parts.push(filters.category);
    }

    if (filters.sortBy && filters.sortBy !== 'relevance') {
      parts.push(`sorted by ${filters.sortBy}`);
    }

    if (filters.region) {
      parts.push(filters.region);
    }

    return parts.join(', ');
  };

  const handleRemoveItem = (item: SearchHistory) => {
    Alert.alert(
      'Remove Search',
      `Remove "${item.query}" from search history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemoveHistoryItem(item.id),
        },
      ],
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Search History',
      'This will remove all search history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: onClearHistory,
        },
      ],
    );
  };

  const renderHistoryItem = ({ item }: { item: SearchHistory }) => {
    const isExpanded = expandedItems.has(item.id);
    const filterSummary = getFilterSummary(item.filters);
    const hasFilters = filterSummary.length > 0;

    return (
      <View  style={styles.historyItem}>
        <TouchableOpacity
           style={styles.historyButton}
          onPress={() => onHistoryPress(item.query, item.filters)}
          activeOpacity={0.7}
        >
          <View  style={styles.historyContent}>
            <Icon
              name="history"
              size={20}
              color={theme.semantic.text.secondary}
               style={styles.historyIcon}
            />

            <View  style={styles.contentContainer}>
              <Text  style={styles.queryText} numberOfLines={1}>
                {item.query}
              </Text>

              <View  style={styles.metaContainer}>
                <Text  style={styles.timeText}>
                  {formatTimeAgo(new Date(item.timestamp))}
                </Text>

                {item.resultCount !== undefined && (
                  <>
                    <Text  style={styles.metaSeparator}>•</Text>
                    <Text  style={styles.resultCountText}>
                      {item.resultCount} results
                    </Text>
                  </>
                )}

                {hasFilters && (
                  <>
                    <Text  style={styles.metaSeparator}>•</Text>
                    <TouchableOpacity
                      onPress={() => toggleExpanded(item.id)}
                      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                    >
                      <Text  style={styles.filtersText}>
                        {isExpanded ? 'Hide filters' : 'Show filters'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {isExpanded && hasFilters && (
                <View  style={styles.filtersContainer}>
                  <Text  style={styles.filtersLabel}>Filters:</Text>
                  <Text  style={styles.filtersDetail}>{filterSummary}</Text>
                </View>
              )}
            </View>

            <View  style={styles.actionsContainer}>
              <TouchableOpacity
                 style={styles.actionButton}
                onPress={() => handleRemoveItem(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={16} color={theme.semantic.text.tertiary} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View  style={styles.emptyContainer}>
      <Icon name="history" size={48} color={theme.semantic.text.tertiary} />
      <Text  style={styles.emptyTitle}>No Search History</Text>
      <Text  style={styles.emptyText}>
        Your recent searches will appear here
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View  style={styles.header}>
      <Text  style={styles.headerTitle}>Recent Searches</Text>
      {history.length > 0 && (
        <TouchableOpacity
           style={styles.clearAllButton}
          onPress={handleClearAll}
        >
          <Text  style={styles.clearAllText}>Clear All</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderLoadingState = () => (
    <View  style={styles.loadingContainer}>
      {Array.from({ length: 5 }).map((_, _index) => (
        <View key={_index}  style={styles.loadingItem}>
          <View  style={styles.loadingIcon} />
          <View  style={styles.loadingContent}>
            <View  style={[styles.loadingText, { width: '60%' }]} />
            <View  style={[styles.loadingText, { width: '40%', height: 12 }]} />
          </View>
        </View>
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <View  style={[styles.container, style]}>
        {renderHeader()}
        {renderLoadingState()}
      </View>
    );
  }

  return (
    <View  style={[styles.container, style]}>
      {renderHeader()}

      {history.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
           style={styles.list}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}
    </View>
  );
};

export default SearchHistoryComponent;
