import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { logger } from '../utils/logger';
import { calculateCardWidth } from '../constants/layout';
import StreamingService from '../services/streaming/StreamingService';
import { SearchResult } from '../types/streaming';
import { SearchItem } from '../types/search';

const CARD_WIDTH = calculateCardWidth(3, 32, 12); // 3 cards per row with 16px padding on each side

export interface ContentItem {
  id: string;
  title: string;
  year?: number;
  rating?: number;
  poster?: string;
  type: 'movie' | 'show' | 'tv';
  genres?: string[];
  streamingServices?: string[];
}

export interface BrowseSection {
  id: string;
  title: string;
  items: ContentItem[];
}

export interface BrowseScreenState {
  sections: BrowseSection[];
  isLoading: boolean;
  error: string | null;
  selectedGenre: string | null;
  isRefreshing: boolean;
}

const GENRES = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi',
  'Romance', 'Thriller', 'Documentary', 'Animation'
];

/**
 * Convert SearchResult to ContentItem for display
 */
const convertToContentItem = (result: SearchResult): ContentItem => {
  return {
    id: result.content.id,
    title: result.content.title,
    year: result.content.releaseYear,
    rating: result.content.rating || result.userRating,
    poster: result.content.poster,
    type: result.content.type === 'tv' ? 'tv' : 'movie',
    genres: result.content.genres,
    streamingServices: result.availability?.map(a => a.service.name) || [],
  };
};

/**
 * Convert ContentItem to SearchItem for navigation to ContentDetailScreen
 */
const convertToSearchItem = (item: ContentItem): SearchItem => {
  return {
    id: item.id,
    title: item.title,
    description: item.genres?.join(', ') || '',
    type: 'content',
    thumbnail: item.poster,
    tags: item.genres,
    createdAt: new Date(),
    popularity: item.rating ? item.rating * 10 : undefined,
  };
};

const BrowseScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const [state, setState] = useState<BrowseScreenState>({
    sections: [],
    isLoading: true,
    error: null,
    selectedGenre: null,
    isRefreshing: false,
  });

  useEffect(() => {
    loadBrowseContent();
  }, []);

  const loadBrowseContent = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setState(prev => ({ ...prev, isRefreshing: true, error: null }));
    } else {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      // Fetch content from backend via StreamingService
      const [trendingContent, popularMovies, popularShows] = await Promise.all([
        StreamingService.getPopularContent('all', 'us', 10),
        StreamingService.getPopularContent('movie', 'us', 10),
        StreamingService.getPopularContent('tv', 'us', 10),
      ]);

      const sections: BrowseSection[] = [
        {
          id: 'trending',
          title: 'Trending Now',
          items: trendingContent.map(convertToContentItem),
        },
        {
          id: 'popular-movies',
          title: 'Popular Movies',
          items: popularMovies.map(convertToContentItem),
        },
        {
          id: 'popular-shows',
          title: 'Popular TV Shows',
          items: popularShows.map(convertToContentItem),
        },
      ];

      setState(prev => ({
        ...prev,
        sections,
        isLoading: false,
        isRefreshing: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load content';
      logger.error('[BrowseScreen] Failed to load content', error);
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        isRefreshing: false,
      }));
    }
  }, []);

  const handleRefresh = useCallback(() => {
    loadBrowseContent(true);
  }, [loadBrowseContent]);

  const handleContentPress = useCallback((item: ContentItem) => {
    // Convert to SearchItem format expected by ContentDetailScreen
    const searchItem = convertToSearchItem(item);
    // Navigate to content details
    navigation.navigate('ContentDetail', { item: searchItem });
  }, [navigation]);

  const handleGenrePress = useCallback((genre: string) => {
    setState(prev => ({
      ...prev,
      selectedGenre: prev.selectedGenre === genre ? null : genre,
    }));
  }, []);

  const renderContentCard = useCallback(({ item }: { item: ContentItem }) => (
    <TouchableOpacity
      style={styles.contentCard}
      onPress={() => handleContentPress(item)}
      testID={`content-card-${item.id}`}
      accessibilityLabel={`${item.title}, ${item.type}`}
      accessibilityRole="button"
    >
      <View style={styles.cardPoster}>
        {item.poster ? (
          <Image
            source={{ uri: item.poster }}
            style={styles.posterImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Icon name={item.type === 'movie' ? 'movie' : 'tv'} size={32} color={theme.colors.primary[500]} />
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.rating && (
          <View style={styles.cardRating}>
            <Icon name="star" size={12} color={theme.colors.warning[500]} />
            <Text style={styles.cardRatingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
        {item.year && (
          <Text style={styles.cardYear}>{item.year}</Text>
        )}
      </View>
    </TouchableOpacity>
  ), [handleContentPress, theme.colors.primary, theme.colors.warning]);

  const renderSection = useCallback(({ item: section }: { item: BrowseSection }) => {
    // Filter by genre if selected
    let filteredItems = section.items;
    if (state.selectedGenre) {
      filteredItems = section.items.filter(item =>
        item.genres?.some(g => g.toLowerCase().includes(state.selectedGenre!.toLowerCase()))
      );
    }

    // Don't render section if no items after filtering
    if (filteredItems.length === 0 && state.selectedGenre) {
      return null;
    }

    return (
      <View style={styles.section} key={section.id}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <FlatList
          data={filteredItems}
          renderItem={renderContentCard}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionList}
        />
      </View>
    );
  }, [renderContentCard, state.selectedGenre]);

  const renderGenreChip = useCallback((genre: string) => (
    <TouchableOpacity
      key={genre}
      style={[
        styles.genreChip,
        state.selectedGenre === genre && styles.activeGenreChip,
      ]}
      onPress={() => handleGenrePress(genre)}
      testID={`genre-${genre}`}
      accessibilityLabel={`Filter by ${genre}`}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.genreChipText,
          state.selectedGenre === genre && styles.activeGenreChipText,
        ]}
      >
        {genre}
      </Text>
    </TouchableOpacity>
  ), [state.selectedGenre, handleGenrePress]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  if (state.isLoading) {
    return (
      <SafeAreaView style={styles.container} testID="browse-screen">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="browse-screen">
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={state.isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Browse</Text>
          <Text style={styles.headerSubtitle}>Discover new content</Text>
        </View>

        {/* Genre Filters */}
        <View style={styles.genreContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreScroll}
          >
            {GENRES.map(renderGenreChip)}
          </ScrollView>
        </View>

        {/* Error State */}
        {state.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{state.error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadBrowseContent()}
              testID="retry-button"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content Sections */}
        {state.sections.map((section) => renderSection({ item: section }))}

        {/* Empty state when genre filter has no results */}
        {state.selectedGenre && state.sections.every(s =>
          s.items.filter(item =>
            item.genres?.some(g => g.toLowerCase().includes(state.selectedGenre!.toLowerCase()))
          ).length === 0
        ) && (
          <View style={styles.emptyContainer}>
            <Icon name="movie-filter" size={48} color={theme.semantic.text.tertiary} />
            <Text style={styles.emptyText}>No {state.selectedGenre} content found</Text>
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => setState(prev => ({ ...prev, selectedGenre: null }))}
            >
              <Text style={styles.clearFilterText}>Clear Filter</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  } as ViewStyle,
  content: {
    flex: 1,
  } as ViewStyle,
  header: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[2],
  } as ViewStyle,
  headerTitle: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
  } as TextStyle,
  headerSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    marginTop: theme.spacing[1],
  } as TextStyle,
  genreContainer: {
    marginVertical: theme.spacing[4],
  } as ViewStyle,
  genreScroll: {
    paddingHorizontal: theme.spacing[4],
    gap: theme.spacing[2],
  } as ViewStyle,
  genreChip: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius['2xl'],
    backgroundColor: theme.semantic.background.secondary,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
    marginRight: theme.spacing[2],
  } as ViewStyle,
  activeGenreChip: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  } as ViewStyle,
  genreChipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  } as TextStyle,
  activeGenreChipText: {
    color: theme.semantic.text.inverse,
  } as TextStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    marginTop: theme.spacing[3],
  } as TextStyle,
  errorContainer: {
    backgroundColor: theme.colors.error[50],
    margin: theme.spacing[4],
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error[200],
    alignItems: 'center',
  } as ViewStyle,
  errorText: {
    color: theme.colors.error[500],
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  } as TextStyle,
  retryButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
  } as ViewStyle,
  retryButtonText: {
    color: theme.semantic.text.inverse,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  } as TextStyle,
  section: {
    marginBottom: theme.spacing[6],
  } as ViewStyle,
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
  } as TextStyle,
  sectionList: {
    paddingHorizontal: theme.spacing[4],
  } as ViewStyle,
  contentCard: {
    width: CARD_WIDTH,
    marginRight: theme.spacing[3],
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
  } as ViewStyle,
  cardPoster: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    backgroundColor: theme.semantic.border.primary,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  posterImage: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    padding: theme.spacing[2],
  } as ViewStyle,
  cardTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  } as TextStyle,
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[1] / 2,
  } as ViewStyle,
  cardRatingText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    marginLeft: theme.spacing[1],
  } as TextStyle,
  cardYear: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.tertiary,
  } as TextStyle,
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[8],
  } as ViewStyle,
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[4],
  } as TextStyle,
  clearFilterButton: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary[500],
  } as ViewStyle,
  clearFilterText: {
    color: theme.semantic.text.inverse,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  } as TextStyle,
});

export default BrowseScreen;
