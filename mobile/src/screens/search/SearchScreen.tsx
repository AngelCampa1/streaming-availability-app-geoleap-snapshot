import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Animated,
  Keyboard,
  Alert,
  Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Hooks
import { useSearch } from '../../hooks/useSearch';
import { useStreamingServices } from '../../hooks/useStreamingServices';
import { useTheme } from '../../theme/ThemeProvider';
import { useSearchLimit } from '../../hooks/useSearchLimit';
import { useAuth } from '../../context/AuthContext';

// Components
import VoiceSearchComponent from '../../components/search/VoiceSearchComponent';
// AvailabilityBadge import removed - not used
import BarcodeScannerComponent from '../../components/search/BarcodeScannerComponent';
import SearchAutocompleteComponent from '../../components/search/SearchAutocompleteComponent';
import SearchHistoryComponent from '../../components/search/SearchHistoryComponent';
import { logger } from '../../utils/logger';
import SearchFiltersComponent from '../../components/search/SearchFiltersComponent';
import SearchResultsComponent from '../../components/search/SearchResultsComponent';
import SearchLimitModal from '../../components/search/SearchLimitModal';
import PaywallBanner from '../../components/paywall/PaywallBanner';

// Types
import { SearchItem, SearchFilter, QRCodeResult, SearchResults } from '../../types/search';
import { RootStackParamList } from '../../navigation/types';

// Constants
const WATCHLIST_STORAGE_KEY = '@watchlist_items';

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Search'>;

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { theme } = useTheme();
  const { state } = useAuth();
  const isAuthenticated = state.isAuthenticated;

  // Search hook
  const {
    query,
    filters,
    isSearching,
    results,
    totalResults,
    hasMoreResults,
    isLoadingMore,
    autoCompleteResults,
    isLoadingAutoComplete,
    searchHistory,
    trendingSearches,
    performSearch,
    clearSearch,
    updateFilters,
    fetchMoreResults,
    clearHistory,
    removeHistoryItem,
    refetchResults,
  } = useSearch();

  // Search limit hook
  const searchLimitState = useSearchLimit();
  const { incrementSearchCount, hasReachedLimit, isApproachingLimit } = searchLimitState;

  // Local state
  const [searchText, setSearchText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<string[]>([]);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Get user's selected streaming services
  const { selectedServices } = useStreamingServices();

  // Refs
  const searchInputRef = useRef<TextInput>(null);
  const searchContainerAnimation = useRef(new Animated.Value(0));

  // Effects
  useEffect(() => {
    // Focus search input when screen loads
    const unsubscribe = navigation.addListener('focus', () => {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 500);
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    // Load watchlist from storage
    loadWatchlist();
  }, []);

  useEffect(() => {
    // Show/hide autocomplete based on input and focus
    const shouldShowAutocomplete = isInputFocused && searchText.length > 0 && !isSearching;
    const shouldShowHistory = isInputFocused && searchText.length === 0 && searchHistory.length > 0;

    setShowAutocomplete(shouldShowAutocomplete);
    setShowHistory(shouldShowHistory);
  }, [isInputFocused, searchText, isSearching, searchHistory.length]);

  useEffect(() => {
    // Animate search container based on focus state
    Animated.timing(searchContainerAnimation.current, {
      toValue: isInputFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isInputFocused, searchContainerAnimation]);

  // Handlers
  const handleSearchSubmit = async () => {
    if (!searchText.trim()) {
      return;
    }

    // Check search limit before performing search
    if (hasReachedLimit) {
      setShowLimitModal(true);
      return;
    }

    // Increment search count
    const allowed = await incrementSearchCount();
    if (!allowed) {
      // Limit reached after attempting to increment
      setShowLimitModal(true);
      return;
    }

    // Perform search
    performSearch(searchText.trim(), filters);
    setIsInputFocused(false);
    Keyboard.dismiss();
  };

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    setErrorMessage(null);
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    // Delay to allow for autocomplete/history item taps
    setTimeout(() => {
      setIsInputFocused(false);
    }, 150);
  };

  const handleClearSearch = () => {
    setSearchText('');
    clearSearch();
    setErrorMessage(null);
    searchInputRef.current?.focus();
  };

  const handleVoiceSearchResult = async (voiceQuery: string) => {
    setSearchText(voiceQuery);

    // Check search limit
    if (hasReachedLimit) {
      setShowLimitModal(true);
      return;
    }

    const allowed = await incrementSearchCount();
    if (!allowed) {
      setShowLimitModal(true);
      return;
    }

    performSearch(voiceQuery, filters);
    setIsInputFocused(false);
  };

  const handleVoiceSearchError = (error: string) => {
    setErrorMessage(error);
  };

  const handleBarcodeResult = async (result: QRCodeResult) => {
    // Use the scanned data as search query
    const searchQuery = result.data;
    setSearchText(searchQuery);

    // Check search limit
    if (hasReachedLimit) {
      setShowLimitModal(true);
      return;
    }

    const allowed = await incrementSearchCount();
    if (!allowed) {
      setShowLimitModal(true);
      return;
    }

    performSearch(searchQuery, filters);
    setIsInputFocused(false);
  };

  const handleBarcodeError = (error: string) => {
    setErrorMessage(error);
  };

  const handleAutocompleteSuggestion = async (suggestion: any) => {
    setSearchText(suggestion.text);

    // Check search limit
    if (hasReachedLimit) {
      setShowLimitModal(true);
      return;
    }

    const allowed = await incrementSearchCount();
    if (!allowed) {
      setShowLimitModal(true);
      return;
    }

    performSearch(suggestion.text, filters);
    setIsInputFocused(false);
  };

  const handleHistoryPress = async (historyQuery: string, historyFilters?: SearchFilter) => {
    setSearchText(historyQuery);

    // Check search limit
    if (hasReachedLimit) {
      setShowLimitModal(true);
      return;
    }

    const allowed = await incrementSearchCount();
    if (!allowed) {
      setShowLimitModal(true);
      return;
    }

    performSearch(historyQuery, historyFilters || filters);
    setIsInputFocused(false);
  };

  const handleFiltersChange = (newFilters: SearchFilter) => {
    updateFilters(newFilters);
  };

  const handleApplyFilters = async () => {
    if (!searchText.trim()) {
      return;
    }

    // Check search limit (filter changes trigger a new search)
    if (hasReachedLimit) {
      setShowLimitModal(true);
      return;
    }

    const allowed = await incrementSearchCount();
    if (!allowed) {
      setShowLimitModal(true);
      return;
    }

    performSearch(searchText.trim(), filters);
  };

  const handleClearFilters = () => {
    updateFilters({});
    if (searchText.trim()) {
      performSearch(searchText.trim(), {});
    }
  };

  const loadWatchlist = async () => {
    try {
      const savedWatchlist = await AsyncStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (savedWatchlist) {
        setWatchlistItems(JSON.parse(savedWatchlist));
      }
    } catch (error) {
      logger.error('[SearchScreen] Error loading watchlist', error);
    }
  };

  const saveWatchlist = async (items: string[]) => {
    try {
      await AsyncStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
      setWatchlistItems(items);
    } catch (error) {
      logger.error('[SearchScreen] Error saving watchlist', error);
    }
  };

  const handleWatchlistToggle = async (item: SearchItem) => {
    const isInWatchlist = watchlistItems.includes(item.id);
    let updatedItems: string[];

    if (isInWatchlist) {
      updatedItems = watchlistItems.filter(id => id !== item.id);
      Alert.alert(
        'Removed from Watchlist',
        `${item.title} has been removed from your watchlist.`,
        [{ text: 'OK' }],
      );
    } else {
      updatedItems = [...watchlistItems, item.id];
      Alert.alert(
        'Added to Watchlist',
        `${item.title} has been added to your watchlist.`,
        [{ text: 'OK' }],
      );
    }

    await saveWatchlist(updatedItems);
  };

  const handleResultPress = (result: SearchItem) => {
    // Navigate to content detail screen
    navigation.navigate('ContentDetail', { item: result });
  };

  const handleLoadMore = () => {
    if (hasMoreResults && !isLoadingMore) {
      fetchMoreResults();
    }
  };

  const handleRefresh = () => {
    if (searchText.trim()) {
      refetchResults();
    }
  };

  // Render search input container
  const renderSearchInput = () => {
    const containerStyle = {
      borderRadius: searchContainerAnimation.current.interpolate({
        inputRange: [0, 1],
        outputRange: [25, 12],
      }),
      elevation: searchContainerAnimation.current.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 6],
      }),
    };

    return (
      <Animated.View  style={[styles.searchContainer, containerStyle]}>
        <View  style={styles.searchInputContainer}>
          {/* Search Icon */}
          <Icon name="search" size={24} color={theme.semantic.text.secondary}  style={styles.searchIcon} />

          {/* Text Input */}
          <TextInput
            ref={searchInputRef}
            testID="main-search-bar-input"
             style={styles.searchInput}
            placeholder="Search content, users, channels..."
            placeholderTextColor={theme.semantic.text.tertiary}
            value={searchText}
            onChangeText={handleSearchTextChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="never"
          />

          {/* Clear Button */}
          {searchText.length > 0 && (
            <TouchableOpacity
               style={styles.clearButton}
              onPress={handleClearSearch}
            >
              <Icon name="close" size={20} color={theme.semantic.text.tertiary} />
            </TouchableOpacity>
          )}

          {/* Voice Search */}
          <VoiceSearchComponent
            onSearchResult={handleVoiceSearchResult}
            onError={handleVoiceSearchError}
             style={styles.voiceButton}
          />

          {/* Barcode Scanner */}
          <BarcodeScannerComponent
            onScanResult={handleBarcodeResult}
            onError={handleBarcodeError}
             style={styles.scanButton}
          />

          {/* Filters */}
          <SearchFiltersComponent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
             style={styles.filterButton}
          />
        </View>
      </Animated.View>
    );
  };

  // Render main content
  const renderContent = () => {
    // Show autocomplete
    if (showAutocomplete) {
      return (
        <SearchAutocompleteComponent
          suggestions={autoCompleteResults as any}
          isLoading={isLoadingAutoComplete}
          onSuggestionPress={handleAutocompleteSuggestion}
           style={styles.autocompleteContainer}
        />
      );
    }

    // Show history
    if (showHistory) {
      return (
        <SearchHistoryComponent
          history={searchHistory as any}
          onHistoryPress={handleHistoryPress}
          onRemoveHistoryItem={removeHistoryItem}
          onClearHistory={clearHistory}
           style={styles.historyContainer}
        />
      );
    }

    // Show search results
    if (results.length > 0 || isSearching) {
      const searchResults: SearchResults = {
        items: results,
        totalCount: totalResults,
        hasMore: hasMoreResults,
        nextPage: undefined,
        filters: filters,
        query: query,
      };

      return (
        <SearchResultsComponent
          searchResults={searchResults}
          isLoading={isSearching}
          isLoadingMore={isLoadingMore}
          onResultPress={handleResultPress}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          onFiltersChange={handleFiltersChange}
          watchlistItems={watchlistItems}
          onWatchlistToggle={handleWatchlistToggle}
           style={styles.resultsContainer}
        />
      );
    }

    // Show welcome/trending content
    return (
      <View style={styles.welcomeContainer}>
        <Icon name="search" size={64} color={theme.semantic.border.primary} />
        <Text style={styles.welcomeTitle}>Discover Content</Text>
        <Text style={styles.welcomeText}>
          Search for movies and TV shows available on your streaming services
        </Text>

        {/* Streaming Services Info */}
        {selectedServices.length > 0 ? (
          <View style={styles.servicesInfo}>
            <Text style={styles.servicesInfoTitle}>
              Searching across {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              style={styles.editServicesButton}
              onPress={() => navigation.navigate('StreamingServiceSelection', { isOnboarding: false })}
            >
              <Icon name="edit" size={16} color={theme.colors.primary[500]} />
              <Text style={styles.editServicesText}>Edit Services</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noServicesPrompt}>
            <Icon name="info-outline" size={32} color={theme.semantic.text.tertiary} />
            <Text style={styles.noServicesPromptText}>
              Select your streaming services for personalized results
            </Text>
            <TouchableOpacity
              style={styles.selectServicesPromptButton}
              onPress={() => navigation.navigate('StreamingServiceSelection', { isOnboarding: false })}
            >
              <Text style={styles.selectServicesPromptButtonText}>Select Services</Text>
            </TouchableOpacity>
          </View>
        )}

        {trendingSearches.length > 0 && (
          <View  style={styles.trendingContainer}>
            <Text  style={styles.trendingTitle}>Trending Searches</Text>
            <View  style={styles.trendingTags}>
              {trendingSearches.slice(0, 5).map((trend, index) => (
                <TouchableOpacity
                  key={index}
                   style={styles.trendingTag}
                  onPress={() => {
                    setSearchText(trend.text);
                    performSearch(trend.text, filters);
                  }}
                >
                  <Text  style={styles.trendingTagText}>{trend.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView testID="search-screen" style={styles.container}>
      <KeyboardAvoidingView
         style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View  style={styles.header}>
          <TouchableOpacity
             style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={theme.semantic.text.primary} />
          </TouchableOpacity>

          {renderSearchInput()}
        </View>

        {/* Error Message */}
        {errorMessage && (
          <View  style={styles.errorContainer}>
            <Icon name="error-outline" size={20} color={theme.colors.error[500]} />
            <Text  style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity onPress={() => setErrorMessage(null)}>
              <Icon name="close" size={20} color={theme.colors.error[500]} />
            </TouchableOpacity>
          </View>
        )}

        {/* Paywall Banner - Show when approaching limit */}
        {isApproachingLimit && !hasReachedLimit && (
          <PaywallBanner
            searchLimitState={searchLimitState}
            onDismiss={() => {}}
            showUpgradeButton={true}
          />
        )}

        {/* Content */}
        <View  style={styles.contentContainer}>
          {renderContent()}
        </View>
      </KeyboardAvoidingView>

      {/* Search Limit Modal */}
      <SearchLimitModal
        visible={showLimitModal}
        onDismiss={() => setShowLimitModal(false)}
        searchLimitState={searchLimitState}
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.secondary,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.semantic.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.semantic.border.secondary,
  },
  backButton: {
    padding: theme.spacing[2],
    marginRight: theme.spacing[2],
  },
  searchContainer: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.semantic.text.primary,
    paddingVertical: 8,
  },
  clearButton: {
    padding: theme.spacing[1],
    marginHorizontal: theme.spacing[1],
  },
  voiceButton: {
    marginHorizontal: 4,
  },
  scanButton: {
    marginHorizontal: 4,
  },
  filterButton: {
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning[50],
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: theme.spacing[2],
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.warning[700],
  },
  contentContainer: {
    flex: 1,
  },
  autocompleteContainer: {
    margin: theme.spacing[4],
  },
  historyContainer: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
    margin: theme.spacing[4],
    borderRadius: 12,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsContainer: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  trendingContainer: {
    width: '100%',
    alignItems: 'center',
  },
  trendingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginBottom: 16,
  },
  trendingTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing[2],
  },
  trendingTag: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  trendingTagText: {
    color: theme.semantic.text.inverse,
    fontSize: 14,
    fontWeight: '500',
  },
  servicesInfo: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
    padding: theme.spacing[4],
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: 12,
  },
  servicesInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginBottom: 8,
  },
  editServicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    paddingVertical: 6,
  },
  editServicesText: {
    fontSize: 14,
    color: theme.colors.primary[500],
    fontWeight: '500',
  },
  noServicesPrompt: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
    padding: theme.spacing[6],
    backgroundColor: theme.colors.warning[50],
    borderRadius: 12,
  },
  noServicesPromptText: {
    fontSize: 16,
    color: theme.colors.warning[700],
    textAlign: 'center',
    marginVertical: 12,
  },
  selectServicesPromptButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  selectServicesPromptButtonText: {
    color: theme.semantic.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SearchScreen;
