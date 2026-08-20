import React, { memo, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { SearchItem } from '../../types/search';
import { useTheme } from '../../theme/ThemeProvider';

interface ResultCardProps {
  item: SearchItem;
  index: number;
  onPress: (item: SearchItem) => void;
  onWatchlistPress?: (item: SearchItem) => void;
  onSharePress?: (item: SearchItem) => void;
  isInWatchlist?: boolean;
  viewMode?: 'list' | 'grid';
  style?: ViewStyle;
  testID?: string;
}

const { width } = Dimensions.get('window');
// CARD_MARGIN will be calculated using theme.spacing[4] (16) in the component
const getGridCardWidth = (spacing: number) => (width - spacing * 3) / 2;

const ResultCard: React.FC<ResultCardProps> = memo(({
  item,
  index,
  onPress,
  onWatchlistPress,
  onSharePress,
  isInWatchlist = false,
  viewMode = 'list',
  style,
  testID = 'result-card',
}) => {
  const { theme } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  // Animation for card entrance
  React.useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 300 + index * 100,
    });
  }, [index, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: interpolate(opacity.value, [0, 1], [20, 0]) },
    ] as any,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1);
  }, [scale]);

  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const handleWatchlistPress = useCallback(() => {
    onWatchlistPress?.(item);
  }, [item, onWatchlistPress]);

  const handleSharePress = useCallback(() => {
    onSharePress?.(item);
  }, [item, onSharePress]);

  const getTypeIcon = (type: SearchItem['type']): string => {
    switch (type) {
      case 'content':
        return 'play-circle-outline';
      case 'user':
        return 'person-outline';
      case 'channel':
        return 'tv';
      case 'location':
        return 'location-on';
      default:
        return 'search';
    }
  };

  const getTypeColor = useCallback((type: SearchItem['type']): string => {
    switch (type) {
      case 'content':
        return theme.colors.success[500];
      case 'user':
        return theme.colors.primary[500];
      case 'channel':
        return theme.colors.error[500];
      case 'location':
        return theme.colors.warning[500];
      default:
        return theme.semantic.text.tertiary;
    }
  }, [theme]);

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {return 'Today';}
    if (diffInDays === 1) {return 'Yesterday';}
    if (diffInDays < 7) {return `${diffInDays}d ago`;}
    if (diffInDays < 30) {return `${Math.floor(diffInDays / 7)}w ago`;}
    if (diffInDays < 365) {return `${Math.floor(diffInDays / 30)}mo ago`;}

    return date.toLocaleDateString();
  };

  const formatPopularity = (popularity?: number): string => {
    if (!popularity) {return '';}
    if (popularity > 1000000) {return `${(popularity / 1000000).toFixed(1)}M`;}
    if (popularity > 1000) {return `${(popularity / 1000).toFixed(1)}K`;}
    return popularity.toString();
  };

  const GRID_CARD_WIDTH = useMemo(() => getGridCardWidth(theme.spacing[4]), [theme.spacing]);
  const styles = useMemo(() => createStyles(theme, GRID_CARD_WIDTH), [theme, GRID_CARD_WIDTH]);

  const cardStyle = viewMode === 'grid' ? styles.gridCard : styles.listCard;
  const imageStyle = viewMode === 'grid' ? styles.gridImage : styles.listImage;
  const contentStyle = viewMode === 'grid' ? styles.gridContent : styles.listContent;

  return (
    <Animated.View  style={[animatedStyle, style]} testID={testID}>
      <TouchableOpacity
         style={[styles.card, cardStyle]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}${item.description ? ` - ${item.description}` : ''}`}
        accessibilityHint={`Tap to view ${item.type || 'content'} details`}
        testID="result-card-touchable"
      >
        {/* Image Container */}
        <View  style={styles.imageContainer}>
          {item.thumbnail && !imageError ? (
            <>
              <Image
                source={{ uri: item.thumbnail }}
                style={[imageStyle, { opacity: imageLoaded ? 1 : 0 }]}
                contentFit="cover"
                priority="normal"
                cachePolicy="memory-disk"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                testID="result-image"
              />
              {!imageLoaded && (
                <View  style={[styles.imagePlaceholder, imageStyle]} testID="image-loading-placeholder">
                  <Icon name="image" size={24} color={theme.semantic.text.tertiary} />
                </View>
              )}
            </>
          ) : (
            <View  style={[styles.imagePlaceholder, imageStyle, { backgroundColor: getTypeColor(item.type) }]} testID="image-placeholder">
              <Icon
                name={getTypeIcon(item.type)}
                size={viewMode === 'grid' ? 32 : 40}
                color={theme.semantic.text.inverse}
              />
            </View>
          )}

          {/* Type Badge */}
          <View  style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]} testID="type-badge">
            <Icon
              name={getTypeIcon(item.type)}
              size={theme.typography.fontSize.xs}
              color={theme.semantic.background.primary}
            />
          </View>

          {/* Quick Actions Overlay */}
          <View  style={styles.quickActions}>
            {onWatchlistPress && (
              <TouchableOpacity
                 style={[styles.quickActionButton, { backgroundColor: isInWatchlist ? theme.colors.error[500] : theme.colors.success[500] }]}
                onPress={handleWatchlistPress}
                testID="watchlist-button"
                accessibilityRole="button"
                accessibilityLabel={isInWatchlist ? 'Remove from watchlist. In watchlist' : 'Add to watchlist'}
                accessibilityHint={isInWatchlist ? 'Tap to remove from your watchlist' : 'Tap to add to your watchlist'}
              >
                <Icon
                  name={isInWatchlist ? 'bookmark' : 'bookmark-border'}
                  size={16}
                  color={theme.semantic.background.primary}
                />
              </TouchableOpacity>
            )}
            {onSharePress && (
              <TouchableOpacity
                 style={styles.quickActionButton}
                onPress={handleSharePress}
                testID="share-button"
                accessibilityRole="button"
                accessibilityLabel="Share"
                accessibilityHint="Tap to share this content"
              >
                <Icon name="share" size={16} color={theme.semantic.background.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        <View  style={[styles.content, contentStyle]}>
          <Text  style={styles.title} numberOfLines={viewMode === 'grid' ? 2 : 2}>
            {item.title}
          </Text>

          {item.description && viewMode === 'list' && (
            <Text  style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {/* Meta Information */}
          <View  style={styles.metaContainer}>
            <View  style={styles.metaRow}>
              <Text  style={[styles.typeText, { color: getTypeColor(item.type) }]}>
                {item.type.toUpperCase()}
              </Text>
              <Text  style={styles.dateText}>
                {formatDate(item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt))}
              </Text>
            </View>

            {item.popularity && (
              <View  style={styles.popularityContainer}>
                <Icon name="trending-up" size={12} color={theme.semantic.text.tertiary} />
                <Text  style={styles.popularityText}>
                  {formatPopularity(item.popularity)}
                </Text>
              </View>
            )}
          </View>

          {/* Tags (only for list view) */}
          {item.tags && item.tags.length > 0 && viewMode === 'list' && (
            <View  style={styles.tagsContainer}>
              {item.tags.slice(0, 2).map((tag, tagIndex) => (
                <View key={tagIndex}  style={styles.tag}>
                  <Text  style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
              {item.tags.length > 2 && (
                <Text  style={styles.moreTagsText}>+{item.tags.length - 2}</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const createStyles = (theme: any, gridCardWidth: number) => StyleSheet.create({
  card: {
    backgroundColor: theme.semantic.background.primary,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.sm,
    overflow: 'hidden',
  },
  listCard: {
    marginHorizontal: theme.spacing[4],
    marginVertical: theme.spacing[2],
    flexDirection: 'row',
  },
  gridCard: {
    width: gridCardWidth,
    marginBottom: theme.spacing[4],
  },
  imageContainer: {
    position: 'relative',
  },
  listImage: {
    width: 100,
    height: 100,
  },
  gridImage: {
    width: '100%',
    height: 120,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.semantic.background.secondary,
  },
  typeBadge: {
    position: 'absolute',
    top: theme.spacing[2],
    right: theme.spacing[2],
    width: 20,
    height: 20,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.semantic.background.primary,
  },
  quickActions: {
    position: 'absolute',
    bottom: theme.spacing[2],
    right: theme.spacing[2],
    flexDirection: 'row',
    gap: theme.spacing[1],
  },
  quickActionButton: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.overlay.lightest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: theme.spacing[3],
  },
  listContent: {
    flex: 1,
  },
  gridContent: {
    // Grid specific content styles
  },
  title: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
    lineHeight: 20,
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    lineHeight: 18,
    marginBottom: theme.spacing[2],
  },
  metaContainer: {
    marginBottom: theme.spacing[2],
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  typeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '700',
    letterSpacing: theme.typography.letterSpacing.wide,
  },
  dateText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.tertiary,
  },
  popularityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  popularityText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.tertiary,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing[1],
  },
  tag: {
    backgroundColor: theme.semantic.background.secondary,
    paddingHorizontal: theme.spacing[1.5],
    paddingVertical: theme.spacing[0.5],
    borderRadius: theme.borderRadius.lg,
  },
  tagText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.tertiary,
    fontStyle: 'italic',
  },
});

ResultCard.displayName = 'ResultCard';

export default ResultCard;
