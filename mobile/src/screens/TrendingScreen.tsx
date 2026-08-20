/**
 * Trending Screen
 * Dedicated page for trending content across streaming services
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { Text, Appbar, Surface, Chip, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TrendingItem {
  id: string;
  title: string;
  type: 'movie' | 'series';
  year: number;
  rating: number;
  posterUrl?: string;
  trendingRank: number;
  trendingChange: 'up' | 'down' | 'same' | 'new';
  changeAmount?: number;
  streamingServices: string[];
  genre: string;
}

type TrendingCategory = 'all' | 'movies' | 'tv' | 'new';
type TrendingPeriod = 'day' | 'week' | 'month';

// Mock trending data
const MOCK_TRENDING: TrendingItem[] = [
  { id: '1', title: 'Squid Game Season 2', type: 'series', year: 2024, rating: 8.9, trendingRank: 1, trendingChange: 'new', streamingServices: ['netflix'], genre: 'Drama' },
  { id: '2', title: 'Dune: Part Two', type: 'movie', year: 2024, rating: 8.6, trendingRank: 2, trendingChange: 'up', changeAmount: 3, streamingServices: ['hbo'], genre: 'Sci-Fi' },
  { id: '3', title: 'The Bear', type: 'series', year: 2024, rating: 8.7, trendingRank: 3, trendingChange: 'same', streamingServices: ['hulu'], genre: 'Drama' },
  { id: '4', title: 'Oppenheimer', type: 'movie', year: 2023, rating: 8.5, trendingRank: 4, trendingChange: 'down', changeAmount: 2, streamingServices: ['prime'], genre: 'Biography' },
  { id: '5', title: 'Shogun', type: 'series', year: 2024, rating: 8.8, trendingRank: 5, trendingChange: 'up', changeAmount: 5, streamingServices: ['hulu'], genre: 'Drama' },
  { id: '6', title: 'Poor Things', type: 'movie', year: 2023, rating: 8.0, trendingRank: 6, trendingChange: 'new', streamingServices: ['hulu'], genre: 'Comedy' },
  { id: '7', title: 'True Detective: Night Country', type: 'series', year: 2024, rating: 7.8, trendingRank: 7, trendingChange: 'down', changeAmount: 1, streamingServices: ['hbo'], genre: 'Crime' },
  { id: '8', title: 'The Gentlemen', type: 'series', year: 2024, rating: 8.1, trendingRank: 8, trendingChange: 'up', changeAmount: 4, streamingServices: ['netflix'], genre: 'Action' },
  { id: '9', title: 'Fallout', type: 'series', year: 2024, rating: 8.4, trendingRank: 9, trendingChange: 'new', streamingServices: ['prime'], genre: 'Sci-Fi' },
  { id: '10', title: 'Anyone But You', type: 'movie', year: 2023, rating: 6.3, trendingRank: 10, trendingChange: 'down', changeAmount: 3, streamingServices: ['netflix'], genre: 'Romance' },
];

export const TrendingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [category, setCategory] = useState<TrendingCategory>('all');
  const [period, setPeriod] = useState<TrendingPeriod>('day');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [trendingData, setTrendingData] = useState<TrendingItem[]>(MOCK_TRENDING);

  const filteredData = useMemo(() => {
    let data = [...trendingData];

    if (category === 'movies') {
      data = data.filter(item => item.type === 'movie');
    } else if (category === 'tv') {
      data = data.filter(item => item.type === 'series');
    } else if (category === 'new') {
      data = data.filter(item => item.trendingChange === 'new');
    }

    return data;
  }, [trendingData, category]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
    setRefreshing(false);
  }, []);

  const handleItemPress = useCallback((item: TrendingItem) => {
    navigation.navigate('ContentDetail', { item });
  }, [navigation]);

  const getTrendingIcon = (change: TrendingItem['trendingChange']) => {
    switch (change) {
      case 'up': return { name: 'trending-up', color: theme.colors.success[500] };
      case 'down': return { name: 'trending-down', color: theme.colors.error[500] };
      case 'new': return { name: 'fiber-new', color: theme.colors.primary[500] };
      default: return { name: 'remove', color: theme.semantic.text.tertiary };
    }
  };

  const renderTrendingItem = ({ item, index }: { item: TrendingItem; index: number }) => {
    const trendingIcon = getTrendingIcon(item.trendingChange);

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        {/* Rank Badge */}
        <View style={[styles.rankBadge, index < 3 && styles.topRankBadge]}>
          <Text style={[styles.rankText, index < 3 && styles.topRankText]}>
            {item.trendingRank}
          </Text>
        </View>

        {/* Poster */}
        {item.posterUrl ? (
          <Image source={{ uri: item.posterUrl }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Icon name="movie" size={32} color={theme.colors.gray[400]} />
          </View>
        )}

        {/* Content */}
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>

          <View style={styles.itemMeta}>
            <Text style={styles.itemType}>
              {item.type === 'movie' ? 'Movie' : 'TV Series'}
            </Text>
            <Text style={styles.itemYear}>{item.year}</Text>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color={theme.colors.warning[500]} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          </View>

          <Text style={styles.genreText}>{item.genre}</Text>

          {/* Streaming Services */}
          <View style={styles.servicesContainer}>
            {item.streamingServices.map(service => (
              <Chip
                key={service}
                style={styles.serviceChip}
                textStyle={styles.serviceChipText}
                compact
              >
                {service}
              </Chip>
            ))}
          </View>
        </View>

        {/* Trending Indicator */}
        <View style={styles.trendingIndicator}>
          <Icon name={trendingIcon.name} size={20} color={trendingIcon.color} />
          {item.changeAmount && (
            <Text style={[styles.changeText, { color: trendingIcon.color }]}>
              {item.changeAmount}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Trending Now" />
      </Appbar.Header>

      {/* Period Selector */}
      <View style={styles.periodContainer}>
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as TrendingPeriod)}
          buttons={[
            { value: 'day', label: 'Today' },
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' },
          ]}
          style={styles.periodSelector}
        />
      </View>

      {/* Category Chips */}
      <View style={styles.categoryContainer}>
        {(['all', 'movies', 'tv', 'new'] as TrendingCategory[]).map((cat) => (
          <Chip
            key={cat}
            selected={category === cat}
            onPress={() => setCategory(cat)}
            style={[styles.categoryChip, category === cat && styles.categoryChipSelected]}
            textStyle={category === cat ? styles.categoryChipTextSelected : undefined}
          >
            {cat === 'all' ? 'All' : cat === 'movies' ? 'Movies' : cat === 'tv' ? 'TV Shows' : 'New Entries'}
          </Chip>
        ))}
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredData.length} trending {category === 'all' ? 'titles' : category}
        </Text>
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="filter-list" size={20} color={theme.colors.primary[500]} />
          <Text style={styles.filterText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Trending List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderTrendingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="trending-up" size={48} color={theme.semantic.text.tertiary} />
              <Text style={styles.emptyTitle}>No trending content</Text>
              <Text style={styles.emptyText}>
                Check back later for the latest trending titles
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  header: {
    backgroundColor: theme.semantic.background.primary,
  },
  periodContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  periodSelector: {
    backgroundColor: theme.semantic.background.secondary,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[3],
    gap: theme.spacing[2],
  },
  categoryChip: {
    backgroundColor: theme.semantic.background.secondary,
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.primary[500],
  },
  categoryChipTextSelected: {
    color: theme.colors.white,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[3],
  },
  resultsCount: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  filterText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[500],
  },
  listContent: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[10],
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[3],
    overflow: 'hidden',
    padding: theme.spacing[3],
  },
  rankBadge: {
    position: 'absolute',
    top: theme.spacing[2],
    left: theme.spacing[2],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.semantic.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  topRankBadge: {
    backgroundColor: theme.colors.primary[500],
  },
  rankText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
  },
  topRankText: {
    color: theme.colors.white,
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: theme.borderRadius.md,
  },
  posterPlaceholder: {
    width: 80,
    height: 120,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: theme.spacing[3],
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  itemType: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
  },
  itemYear: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.tertiary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
  },
  genreText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary[500],
    marginBottom: theme.spacing[2],
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[1],
  },
  serviceChip: {
    height: 24,
    backgroundColor: theme.semantic.background.primary,
  },
  serviceChipText: {
    fontSize: 10,
  },
  trendingIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
  },
  changeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
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
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
  },
});

export default TrendingScreen;
