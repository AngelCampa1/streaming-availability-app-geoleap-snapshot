import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
  Alert,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SearchBar from '../components/SearchBar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { unifiedSearchService } from '../services/search/UnifiedSearchService';
import { useTheme } from '../theme/ThemeProvider';
import { useSearchLimit } from '../hooks/useSearchLimit';
import { SearchLimitModal } from '../components/search/SearchLimitModal';
import { PaywallBanner } from '../components/paywall/PaywallBanner';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'movie' | 'show' | 'content';
  score: number;
  year?: number;
  rating?: number;
  poster?: string;
  streamingServices?: string[];
  genres?: string[];
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
}

export interface SearchScreenState {
  searchQuery: string;
  searchResults: SearchResult[];
  searchHistory: SearchHistory[];
  isLoading: boolean;
  error: string | null;
  selectedContentType: 'all' | 'movie' | 'show';
  selectedCountry: string;
  selectedServices: string[];
}

const SearchScreen: React.FC = () => {
  const { theme } = useTheme();
  const searchLimit = useSearchLimit();
  const [showLimitModal, setShowLimitModal] = useState(false);

  const [state, setState] = useState<SearchScreenState>({
    searchQuery: '',
    searchResults: [],
    searchHistory: [],
    isLoading: false,
    error: null,
    selectedContentType: 'all',
    selectedCountry: 'US',
    selectedServices: [],
  });

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, searchResults: [], error: null }));
      return;
    }

    // Check if user can perform search (hasn't reached limit)
    if (!searchLimit.canPerformSearch()) {
      setShowLimitModal(true);
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Increment search count before performing search
      const canSearch = await searchLimit.incrementSearchCount();
      if (!canSearch) {
        setShowLimitModal(true);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Use real API via UnifiedSearchService
      const searchResults = await unifiedSearchService.performUnifiedSearch(query);

      // Limit results based on user tier
      const resultsLimit = searchLimit.getResultsLimit();
      const limitedResults = resultsLimit === Infinity
        ? searchResults.combinedResults
        : searchResults.combinedResults.slice(0, resultsLimit);

      // Add to search history
      const historyEntry: SearchHistory = {
        id: Date.now().toString(),
        query,
        timestamp: Date.now(),
        resultCount: limitedResults.length,
      };

      setState(prev => ({
        ...prev,
        searchResults: limitedResults,
        isLoading: false,
        searchHistory: [historyEntry, ...prev.searchHistory.slice(0, 9)], // Keep last 10
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed. Please check your connection and try again.';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        searchResults: [],
      }));
    }
  }, [searchLimit]);

  const handleSearchSubmit = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
    performSearch(query);
  }, [performSearch]);

  const handleContentTypeChange = useCallback((type: 'all' | 'movie' | 'show') => {
    setState(prev => ({ ...prev, selectedContentType: type }));
    if (state.searchQuery) {
      performSearch(state.searchQuery);
    }
  }, [performSearch, state.searchQuery]);

  const handleAddToWatchlist = useCallback((result: SearchResult) => {
    Alert.alert(
      'Add to Watchlist',
      `${result.title} has been added to your watchlist.`,
      [{ text: 'OK' }]
    );
  }, []);

  const handleHistoryItemPress = useCallback((historyItem: SearchHistory) => {
    setState(prev => ({ ...prev, searchQuery: historyItem.query }));
    performSearch(historyItem.query);
  }, [performSearch]);

  const clearSearchHistory = useCallback(() => {
    setState(prev => ({ ...prev, searchHistory: [] }));
  }, []);

  const handleResultPress = useCallback((result: SearchResult) => {
    const services = result.streamingServices?.join(', ') || 'Not available';
    const rating = result.rating ? `Rating: ${result.rating}/10` : '';
    const year = result.year ? `(${result.year})` : '';

    Alert.alert(
      `${result.title} ${year}`,
      `${result.description}\n\n${rating}\n\nAvailable on: ${services}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Watchlist',
          onPress: () => handleAddToWatchlist(result),
        },
        {
          text: 'View Details',
          onPress: () => {
            Alert.alert('Content Details', `Viewing details for ${result.title}`);
          },
        },
      ],
    );
  }, [handleAddToWatchlist]);

  const renderSearchResult = useCallback(({ item }: { item: SearchResult }) => (
    <View style={styles.resultItem}>
      <TouchableOpacity
        onPress={() => handleResultPress(item)}
        testID={`search-result-${item.id}`}
        accessibilityLabel={`${item.title}: ${item.description}`}
        accessibilityRole="button"
        style={styles.resultMainContent}
      >
        <View style={styles.resultHeader}>
          <Icon
            name={item.type === 'movie' ? 'movie' : item.type === 'show' ? 'tv' : 'play-circle-outline'}
            size={20}
            color={theme.colors.primary[500]}
          />
          <Text style={styles.resultTitle}>
            {item.title}{item.year ? ` (${item.year})` : ''}
          </Text>
          {item.rating && (
            <Text style={styles.resultScore}>★ {item.rating.toFixed(1)}</Text>
          )}
        </View>
        <Text style={styles.resultDescription}>{item.description}</Text>
        <View style={styles.resultMeta}>
          <Text style={styles.resultType}>{item.type.toUpperCase()}</Text>
          {item.streamingServices && item.streamingServices.length > 0 && (
            <Text style={styles.streamingServices}>
              {item.streamingServices.slice(0, 3).join(', ')}
              {item.streamingServices.length > 3 ? ` +${item.streamingServices.length - 3}` : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.resultFooter}>
        <TouchableOpacity
          onPress={() => handleAddToWatchlist(item)}
          style={styles.watchlistButton}
          accessibilityLabel={`Add ${item.title} to watchlist`}
          accessibilityRole="button"
        >
          <Icon name="add" size={16} color={theme.colors.primary[500]} />
        </TouchableOpacity>
      </View>
    </View>
  ), [handleResultPress, handleAddToWatchlist, theme.colors.primary]);

  const renderHistoryItem = useCallback(({ item }: { item: SearchHistory }) => (
    <TouchableOpacity
       style={styles.historyItem}
      onPress={() => handleHistoryItemPress(item)}
      testID={`search-history-${item.id}`}
      accessibilityLabel={`Search history: ${item.query}`}
      accessibilityRole="button"
    >
      <Icon name="history" size={16} color={theme.semantic.text.secondary} />
      <Text  style={styles.historyQuery}>{item.query}</Text>
      <Text  style={styles.historyCount}>({item.resultCount})</Text>
    </TouchableOpacity>
  ), [handleHistoryItemPress, theme]);

  const renderFilterChip = useCallback((type: 'all' | 'movie' | 'show', label: string) => (
    <TouchableOpacity
      style={[styles.filterChip, state.selectedContentType === type && styles.activeFilterChip]}
      onPress={() => handleContentTypeChange(type)}
      testID={`filter-${type}`}
      accessibilityLabel={`Filter by ${label}`}
      accessibilityRole="button"
    >
      <Text style={[
        styles.filterChipText,
        state.selectedContentType === type && styles.activeFilterChipText,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  ), [state.selectedContentType, handleContentTypeChange]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView  style={styles.container} testID="search-screen">
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
      <ScrollView  style={styles.content} testID="search-content">
        <SearchBar
          value={state.searchQuery}
          onChangeText={(text) => setState(prev => ({ ...prev, searchQuery: text }))}
          onSubmit={handleSearchSubmit}
          placeholder="Search movies and TV shows..."
          testID="main-search-bar"
        />

        {/* Content Type Filters */}
        <View style={styles.filterContainer}>
          {renderFilterChip('all', 'All')}
          {renderFilterChip('movie', 'Movies')}
          {renderFilterChip('show', 'TV Shows')}
        </View>

        {/* Paywall Banner - shows when approaching search limit */}
        <PaywallBanner
          searchLimitState={searchLimit}
          showUpgradeButton={true}
        />

          {state.isLoading && (
            <View
              style={styles.loadingContainer}
              testID="search-loading"
              accessibilityLiveRegion="polite"
              accessibilityLabel="Loading search results"
              accessibilityRole="progressbar"
            >
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              <Text  style={styles.loadingText}>Searching...</Text>
            </View>
          )}

          {state.error && (
            <View  style={styles.errorContainer} testID="search-error">
              <Text  style={styles.errorText}>{state.error}</Text>
            </View>
          )}

          {state.searchResults.length > 0 && (
            <View  style={styles.resultsContainer} testID="search-results">
              <Text  style={styles.sectionTitle}>
                Results ({state.searchResults.length})
              </Text>
              <FlatList
                data={state.searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}

          {state.searchHistory.length > 0 && !state.isLoading && (
            <View  style={styles.historyContainer} testID="search-history">
              <View  style={styles.historyHeader}>
                <Text  style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity
                  onPress={clearSearchHistory}
                  testID="clear-history-button"
                  accessibilityLabel="Clear search history"
                  accessibilityRole="button"
                  style={styles.clearHistoryButton}
                >
                  <Text  style={styles.clearHistoryText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={state.searchHistory}
                renderItem={renderHistoryItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Search Limit Modal - shows when limit reached */}
      <SearchLimitModal
        visible={showLimitModal}
        onDismiss={() => setShowLimitModal(false)}
        searchLimitState={searchLimit}
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  } as ViewStyle,
  keyboardAvoidingView: {
    flex: 1,
  } as ViewStyle,
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: theme.spacing[2],
  } as ViewStyle,
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.semantic.background.secondary,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
  } as ViewStyle,
  activeFilterChip: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  } as ViewStyle,
  filterChipText: {
    fontSize: 14,
    color: theme.semantic.text.secondary,
    fontWeight: '500',
  } as TextStyle,
  activeFilterChipText: {
    color: theme.semantic.text.inverse,
  } as TextStyle,
  watchlistButton: {
    padding: theme.spacing[1],
  } as ViewStyle,
  content: {
    flex: 1,
  } as ViewStyle,
  loadingContainer: {
    padding: theme.spacing[5],
    alignItems: 'center',
  } as ViewStyle,
  loadingText: {
    fontSize: 16,
    color: theme.semantic.text.secondary,
  } as TextStyle,
  errorContainer: {
    backgroundColor: theme.colors.error[50],
    margin: theme.spacing[4],
    padding: theme.spacing[3],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.error[200],
  } as ViewStyle,
  errorText: {
    color: theme.colors.error[500],
    fontSize: 14,
    textAlign: 'center',
  } as TextStyle,
  resultsContainer: {
    margin: theme.spacing[4],
  } as ViewStyle,
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.semantic.text.primary,
    marginBottom: 12,
  } as TextStyle,
  resultItem: {
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: 8,
    padding: theme.spacing[4],
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
    flexDirection: 'row',
    alignItems: 'flex-start',
  } as ViewStyle,
  resultMainContent: {
    flex: 1,
  } as ViewStyle,
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  } as ViewStyle,
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  resultTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.semantic.text.primary,
    marginLeft: 8,
  } as TextStyle,
  resultScore: {
    fontSize: 12,
    color: theme.colors.primary[500],
    fontWeight: 'bold',
  } as TextStyle,
  resultDescription: {
    fontSize: 14,
    color: theme.semantic.text.secondary,
    marginBottom: 8,
  } as TextStyle,
  resultFooter: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingLeft: 8,
  } as ViewStyle,
  resultType: {
    fontSize: 10,
    color: theme.semantic.text.tertiary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  } as TextStyle,
  streamingServices: {
    fontSize: 11,
    color: theme.semantic.text.secondary,
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  } as TextStyle,
  historyContainer: {
    margin: theme.spacing[4],
  } as ViewStyle,
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  } as ViewStyle,
  clearHistoryText: {
    color: theme.colors.primary[500],
    fontSize: 14,
  } as TextStyle,
  clearHistoryButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: 8,
    marginBottom: 4,
  } as ViewStyle,
  historyQuery: {
    flex: 1,
    fontSize: 14,
    color: theme.semantic.text.primary,
    marginLeft: 8,
  } as TextStyle,
  historyCount: {
    fontSize: 12,
    color: theme.semantic.text.secondary,
  } as TextStyle,
});

export default SearchScreen;
