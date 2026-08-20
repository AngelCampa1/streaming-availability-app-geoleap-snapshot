/**
 * Genre Stats Card Component
 * Displays user's favorite genres with visual breakdown
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';

interface GenreStat {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface GenreStatsCardProps {
  genres: GenreStat[];
  totalWatched: number;
  onPress?: () => void;
}

const GENRE_ICONS: Record<string, string> = {
  'Action': 'local-fire-department',
  'Comedy': 'sentiment-very-satisfied',
  'Drama': 'theater-comedy',
  'Horror': 'pest-control',
  'Sci-Fi': 'rocket-launch',
  'Romance': 'favorite',
  'Thriller': 'psychology',
  'Documentary': 'videocam',
  'Animation': 'animation',
  'Fantasy': 'auto-awesome',
  'Mystery': 'search',
  'Crime': 'gavel',
};

export const GenreStatsCard: React.FC<GenreStatsCardProps> = ({
  genres,
  totalWatched,
  onPress,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const topGenres = genres.slice(0, 5);

  return (
    <Surface style={styles.container} elevation={1} onTouchEnd={onPress}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="category" size={20} color={theme.colors.primary[500]} />
          <Text style={styles.title}>Favorite Genres</Text>
        </View>
        <Text style={styles.subtitle}>{totalWatched} titles watched</Text>
      </View>

      <View style={styles.genreList}>
        {topGenres.map((genre, index) => (
          <View key={genre.name} style={styles.genreRow}>
            <View style={styles.genreInfo}>
              <View style={[styles.genreIcon, { backgroundColor: genre.color + '20' }]}>
                <Icon
                  name={GENRE_ICONS[genre.name] || 'local-movies'}
                  size={16}
                  color={genre.color}
                />
              </View>
              <Text style={styles.genreName}>{genre.name}</Text>
            </View>

            <View style={styles.genreStats}>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${genre.percentage}%`, backgroundColor: genre.color },
                  ]}
                />
              </View>
              <Text style={styles.genrePercentage}>{genre.percentage}%</Text>
            </View>
          </View>
        ))}
      </View>

      {genres.length > 5 && (
        <Text style={styles.moreText}>
          +{genres.length - 5} more genres
        </Text>
      )}
    </Surface>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[4],
  },
  header: {
    marginBottom: theme.spacing[4],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    marginLeft: 28, // Align with title
  },
  genreList: {
    gap: theme.spacing[3],
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    flex: 1,
  },
  genreIcon: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
  },
  genreStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    flex: 1,
    justifyContent: 'flex-end',
  },
  progressBarContainer: {
    width: 80,
    height: 6,
    backgroundColor: theme.colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  genrePercentage: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.secondary,
    width: 36,
    textAlign: 'right',
  },
  moreText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[500],
    textAlign: 'center',
    marginTop: theme.spacing[3],
  },
});

export default GenreStatsCard;
