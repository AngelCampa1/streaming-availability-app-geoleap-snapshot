import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
 import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logger } from '../utils/logger';
import { SearchItem } from '../types/search';
import { SearchResult, StreamingContent } from '../types/streaming';
import StreamingService from '../services/streaming/StreamingService';
import { watchlistService, WatchlistItem } from '../services/watchlist/WatchlistService';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { POPULAR_SERVICES } from '../types/streaming';
import { useStreamingServices } from '../hooks/useStreamingServices';
import { StreamingAvailabilityComponent } from '../components/content/StreamingAvailability';
import { VpnRecommendationModal } from '../components/vpn/VpnRecommendationModal';
import { LanguageOptionsDisplay } from '../components/content/LanguageOptionsDisplay';
import { RegionalAvailability, getCountryInfo } from '../components/content/RegionalAvailability';
import { useLanguagePreferences } from '../hooks/useLanguagePreferences';
import '../types/streaming.types';
import { LAYOUT_CONSTANTS } from '../constants/layout';

interface ContentDetailScreenProps {
  route: {
    params: {
      item: SearchItem;
    };
  };
  navigation: any;
}

interface StreamingInfo {
  platform: string;
  available: boolean;
  url?: string;
  price?: string;
  quality?: string[];
  subtitle?: boolean;
}

interface RelatedContent {
  id: string;
  title: string;
  thumbnail: string;
  type: string;
  rating?: number;
}

const { width: screenWidth } = Dimensions.get('window');

/**
 * Map a streaming content type onto the watchlist item type taxonomy.
 * StreamingContent uses 'tv'/'series' while watchlist items use 'tv_series';
 * anything unrecognized falls back to 'other'.
 */
const mapContentTypeToWatchlistType = (
  type: StreamingContent['type'] | undefined,
): WatchlistItem['type'] => {
  switch (type) {
    case 'movie':
      return 'movie';
    case 'tv':
    case 'series':
      return 'tv_series';
    case 'documentary':
      return 'documentary';
    case 'anime':
      return 'anime';
    default:
      return 'other';
  }
};

const ContentDetailScreen: React.FC<ContentDetailScreenProps> = ({ route, navigation }) => {
  const { item } = route.params;
  const { theme } = useTheme();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [watchlistItemId, setWatchlistItemId] = useState<string | null>(null);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [_streamingData, setStreamingData] = useState<StreamingInfo[]>([]);
  const [relatedContent, setRelatedContent] = useState<RelatedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [contentDetails, setContentDetails] = useState<SearchResult | null>(null);
  const [showVpnModal, setShowVpnModal] = useState(false);

  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const backButtonScale = useSharedValue(1);

  // Get user's subscriptions
  const { subscriptions: _subscriptions, getServiceIds } = useSubscriptions();
  const userServiceIds = getServiceIds();

  // Get user's selected streaming services
  const { selectedServices } = useStreamingServices();

  // Get user's language preferences for VPN recommendations
  const { preferences } = useLanguagePreferences();

  useEffect(() => {
    // Load streaming information using the official streaming-availability API
    const loadStreamingInfo = async () => {
      setIsLoading(true);

      try {
        // Get detailed content information
        const details = await StreamingService.getContentDetails(item.id);

        if (details) {
          setContentDetails(details);

          // Convert streaming availability to our interface
          const streamingInfo: StreamingInfo[] = details.availability.map((availability: any) => ({
            platform: availability.service.name,
            available: availability.available,
            url: availability.service.baseUrl,
            price: availability.price ? `${availability.currency} ${availability.price}` : 'Included with subscription',
            quality: availability.quality,
            subtitle: availability.subtitles ? availability.subtitles.length > 0 : false,
          }));

          // Get recommendations for related content
          const recommendations = await StreamingService.getRecommendations(item.id);

          const relatedInfo: RelatedContent[] = recommendations.map((rec) => ({
            id: rec.content.id,
            title: rec.content.title,
            thumbnail: rec.content.poster || 'https://via.placeholder.com/150x200',
            type: rec.content.type,
            rating: rec.content.rating,
          }));

          setStreamingData(streamingInfo);
          setRelatedContent(relatedInfo);
        } else {
          // Fallback to mock data if API fails
          const mockStreamingData: StreamingInfo[] = [
            {
              platform: 'Netflix',
              available: true,
              url: 'https://netflix.com',
              price: 'Included with subscription',
              quality: ['HD', '4K'],
              subtitle: true,
            },
            {
              platform: 'Amazon Prime',
              available: true,
              url: 'https://prime.amazon.com',
              price: '$8.99/month',
              quality: ['HD'],
              subtitle: true,
            },
            {
              platform: 'Hulu',
              available: false,
            },
          ];

          const mockRelatedContent: RelatedContent[] = [
            {
              id: '1',
              title: 'Similar Content 1',
              thumbnail: 'https://via.placeholder.com/150x200',
              type: 'movie',
              rating: 8.5,
            },
          ];

          setStreamingData(mockStreamingData);
          setRelatedContent(mockRelatedContent);
        }
      } catch (error) {
        logger.error('[ContentDetailScreen] Failed to load streaming info', error);
        // Set empty data on error
        setStreamingData([]);
        setRelatedContent([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadStreamingInfo();
  }, [item.id]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;

      const threshold = LAYOUT_CONSTANTS.HEADER_HEIGHT_LARGE - LAYOUT_CONSTANTS.HEADER_HEIGHT_COLLAPSED;
      const progress = Math.min(event.contentOffset.y / threshold, 1);

      headerOpacity.value = withTiming(1 - progress, { duration: theme.animations.duration.fast });

      runOnJS(setHeaderCollapsed)(event.contentOffset.y > threshold);
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, LAYOUT_CONSTANTS.HEADER_HEIGHT_LARGE],
          [0, -LAYOUT_CONSTANTS.HEADER_HEIGHT_LARGE / 2],
        ),
      },
    ],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, LAYOUT_CONSTANTS.HEADER_HEIGHT_COLLAPSED], [0, 1]),
    transform: [
      {
        translateY: interpolate(scrollY.value, [0, LAYOUT_CONSTANTS.HEADER_HEIGHT_COLLAPSED], [theme.spacing[5], 0]),
      },
    ],
  }));

  const handleBackPress = useCallback(() => {
    backButtonScale.value = withSpring(0.9, {}, () => {
      backButtonScale.value = withSpring(1);
    });
    (navigation as any).goBack();
  }, [navigation, backButtonScale]);

  const handleWatchlistToggle = useCallback(async () => {
    if (watchlistLoading) return;

    // Optimistic UI update
    const previousState = isInWatchlist;
    const previousItemId = watchlistItemId;
    setIsInWatchlist(!previousState);
    setWatchlistLoading(true);

    try {
      // Resolve the user's real default watchlist id (backend keys by Guid;
      // there is no static 'default' watchlist).
      const watchlistId = await watchlistService.getOrCreateDefaultWatchlistId();

      if (previousState && previousItemId) {
        await watchlistService.removeFromWatchlist(watchlistId, previousItemId);
        setWatchlistItemId(null);
      } else {
        // Enrich with the fetched content details when available.
        const content = contentDetails?.content;
        const newItem: Omit<WatchlistItem, 'id' | 'addedAt'> = {
          title: content?.title ?? item.title,
          type: mapContentTypeToWatchlistType(content?.type),
          rating: content?.rating ?? 0,
          year: content?.releaseYear ?? 0,
          availableOn: [],
          poster: content?.poster ?? item.thumbnail ?? undefined,
          genres: content?.genres ?? [],
          status: 'to_watch',
          priority: 'medium',
        };
        const added = await watchlistService.addToWatchlist(watchlistId, newItem);
        setWatchlistItemId(added.id);
      }
    } catch (error) {
      // Rollback optimistic update on failure
      setIsInWatchlist(previousState);
      setWatchlistItemId(previousItemId);
      logger.error('[ContentDetailScreen] Watchlist toggle failed', error);
      Alert.alert(
        'Watchlist Error',
        previousState
          ? 'Failed to remove from watchlist. Please try again.'
          : 'Failed to add to watchlist. Please try again.',
      );
    } finally {
      setWatchlistLoading(false);
    }
  }, [isInWatchlist, watchlistItemId, watchlistLoading, item, contentDetails]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out ${item.title}`,
        url: item.url || '',
        title: item.title,
      });
    } catch (error) {
      logger.error('[ContentDetailScreen] Error sharing', error);
    }
  }, [item]);

  const _handleStreamingPress = useCallback(async (streaming: StreamingInfo) => {
    if (streaming.available && streaming.url) {
      Alert.alert(
        `Watch on ${streaming.platform}`,
        `This will open ${streaming.platform} app or website.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Open',
            onPress: async () => {
              try {
                const supported = await Linking.canOpenURL(streaming.url!);
                if (supported) {
                  await Linking.openURL(streaming.url!);
                } else {
                  Alert.alert('Error', `Cannot open ${streaming.platform} URL`);
                }
              } catch (error) {
                logger.error('[ContentDetailScreen] Failed to open URL', error);
                Alert.alert('Error', `Failed to open ${streaming.platform}`);
              }
            },
          },
        ],
      );
    } else if (!streaming.available) {
      Alert.alert('Not Available', `${streaming.platform} is not available in your region.`);
    }
  }, []);

  const _getPlatformIcon = (platform: string): string => {
    switch (platform.toLowerCase()) {
      case 'netflix':
        return 'play-circle-filled';
      case 'amazon prime':
      case 'prime video':
        return 'shopping-cart';
      case 'hulu':
        return 'live-tv';
      case 'disney+':
      case 'disney plus':
        return 'castle';
      default:
        return 'play-arrow';
    }
  };

  const _getPlatformColor = (platform: string): string => {
    switch (platform.toLowerCase()) {
      case 'netflix':
        return theme.colors.error[500]; // Netflix brand red
      case 'amazon prime':
      case 'prime video':
        return theme.colors.info[500]; // Amazon brand blue
      case 'hulu':
        return theme.colors.success[500]; // Hulu brand green
      case 'disney+':
      case 'disney plus':
        return theme.colors.primary[600]; // Disney+ brand blue
      default:
        return theme.colors.primary[500]; // Fallback to theme primary for unknown services
    }
  };

  // Helper to find service ID from platform name
  const findServiceId = (platformName: string): string | null => {
    const normalized = platformName.toLowerCase().trim();

    // Try exact match first
    let service = POPULAR_SERVICES.find(s =>
      s.name.toLowerCase() === normalized ||
      s.id.toLowerCase() === normalized,
    );

    // Try partial match
    if (!service) {
      service = POPULAR_SERVICES.find(s =>
        normalized.includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(normalized),
      );
    }

    return service ? service.id : null;
  };

  // Check if user has a subscription for this platform
  const _hasUserSubscription = (platformName: string): boolean => {
    const serviceId = findServiceId(platformName);
    return serviceId ? userServiceIds.includes(serviceId) : false;
  };

  const backButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backButtonScale.value }],
  }));

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.primary,
    },
    scrollContent: {
      paddingBottom: theme.spacing[10],
    },
    headerContainer: {
      height: LAYOUT_CONSTANTS.HEADER_HEIGHT_LARGE,
      width: screenWidth,
    },
    headerImage: {
      width: '100%',
      height: '100%',
    },
    headerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.overlay.lighter,
    },
    fixedHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
    },
    headerControls: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[4],
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      height: LAYOUT_CONSTANTS.HEADER_HEIGHT_COLLAPSED,
    },
    backButton: {
      width: LAYOUT_CONSTANTS.ICON_BUTTON_SIZE,
      height: LAYOUT_CONSTANTS.ICON_BUTTON_SIZE,
      borderRadius: LAYOUT_CONSTANTS.ICON_BUTTON_RADIUS,
      backgroundColor: theme.colors.overlay.lighter,
      alignItems: 'center',
      justifyContent: 'center',
    },
    collapsedTitle: {
      flex: 1,
      marginHorizontal: theme.spacing[4],
    },
    collapsedTitleText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.inverse,
    },
    rightControls: {
      flexDirection: 'row',
      gap: theme.spacing[2],
    },
    actionButton: {
      width: LAYOUT_CONSTANTS.ICON_BUTTON_SIZE,
      height: LAYOUT_CONSTANTS.ICON_BUTTON_SIZE,
      borderRadius: LAYOUT_CONSTANTS.ICON_BUTTON_RADIUS,
      backgroundColor: theme.colors.overlay.lighter,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contentContainer: {
      backgroundColor: theme.semantic.background.primary,
      borderTopLeftRadius: theme.borderRadius['2xl'],
      borderTopRightRadius: theme.borderRadius['2xl'],
      marginTop: -theme.spacing[5],
      paddingTop: theme.spacing[5],
      paddingHorizontal: theme.spacing[5],
    },
    titleSection: {
      marginBottom: theme.spacing[5],
    },
    title: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[2],
      lineHeight: theme.typography.fontSize['3xl'] * theme.typography.lineHeight.tight,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
    },
    typeChip: {
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.xl,
    },
    typeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.inverse,
      letterSpacing: theme.typography.letterSpacing.wide,
    },
    dateText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.secondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[1],
    },
    ratingText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[3],
    },
    descriptionSection: {
      marginBottom: theme.spacing[6],
    },
    description: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
      color: theme.semantic.text.secondary,
    },
    tagsSection: {
      marginBottom: theme.spacing[6],
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing[2],
    },
    tag: {
      backgroundColor: theme.semantic.background.secondary,
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[2],
      borderRadius: theme.borderRadius['2xl'],
    },
    tagText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    streamingSection: {
      marginBottom: theme.spacing[6],
    },
    loadingContainer: {
      padding: theme.spacing[5],
      alignItems: 'center',
    },
    loadingText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.secondary,
    },
    streamingList: {
      gap: theme.spacing[3],
    },
    streamingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing[4],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.xl,
    },
    streamingItemDisabled: {
      opacity: 0.5,
    },
    streamingItemSubscribed: {
      borderWidth: theme.spacing[1] / 2,
      borderColor: theme.colors.success[500],
      backgroundColor: theme.colors.success[50],
    },
    streamingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    platformIcon: {
      width: LAYOUT_CONSTANTS.ICON_BUTTON_SIZE,
      height: LAYOUT_CONSTANTS.ICON_BUTTON_SIZE,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing[3],
    },
    platformInfo: {
      flex: 1,
    },
    platformNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
      marginBottom: theme.spacing[1] / 2,
    },
    platformName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
    },
    subscribedBadge: {
      backgroundColor: theme.colors.success[500],
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1] / 2,
      borderRadius: theme.borderRadius.lg,
    },
    subscribedBadgeText: {
      color: theme.semantic.text.inverse,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    platformPrice: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.success[500],
      fontWeight: theme.typography.fontWeight.medium,
      marginBottom: theme.spacing[1] / 2,
    },
    platformQuality: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
    },
    platformUnavailable: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.tertiary,
      fontStyle: 'italic',
    },
    languageSection: {
      marginBottom: theme.spacing[6],
    },
    regionalSection: {
      marginBottom: theme.spacing[6],
    },
    relatedSection: {
      marginBottom: theme.spacing[6],
    },
    relatedList: {
      paddingRight: theme.spacing[5],
      gap: theme.spacing[3],
    },
    relatedItem: {
      width: 120,
    },
    relatedImage: {
      width: 120,
      height: 160,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing[2],
    },
    relatedTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[1],
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.tight,
    },
    relatedRating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[1] / 2,
    },
    relatedRatingText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    noServicesContainer: {
      alignItems: 'center',
      padding: theme.spacing[8],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.xl,
    },
    noServicesText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      marginVertical: theme.spacing[4],
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
    },
    selectServicesButton: {
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: theme.spacing[6],
      paddingVertical: theme.spacing[3],
      borderRadius: theme.borderRadius.lg,
      marginTop: theme.spacing[2],
    },
    selectServicesButtonText: {
      color: theme.semantic.text.inverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  }), [theme]);

  return (
    <View  style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Image */}
        <Animated.View  style={[styles.headerContainer, headerAnimatedStyle]}>
          <Image
            source={{
              uri: item.thumbnail || 'https://via.placeholder.com/400x280',
            }}
            priority="high"
            cachePolicy="memory-disk"
            style={styles.headerImage}
            contentFit="cover"
          />
          <View  style={styles.headerOverlay} />
        </Animated.View>

        {/* Content */}
        <View  style={styles.contentContainer}>
          {/* Title and Meta */}
          <View  style={styles.titleSection}>
            <Text  style={styles.title}>{item.title}</Text>
            <View  style={styles.metaRow}>
              <View  style={styles.typeChip}>
                <Text  style={styles.typeText}>{item.type.toUpperCase()}</Text>
              </View>
              <Text  style={styles.dateText}>
                {new Date(item.createdAt).getFullYear()}
              </Text>
              {item.popularity && (
                <View  style={styles.ratingContainer}>
                  <Icon name="star" size={16} color={theme.colors.warning[500]} />
                  <Text  style={styles.ratingText}>
                    {(item.popularity / 1000).toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          {item.description && (
            <View  style={styles.descriptionSection}>
              <Text  style={styles.sectionTitle}>Description</Text>
              <Text  style={styles.description}>{item.description}</Text>
            </View>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <View  style={styles.tagsSection}>
              <Text  style={styles.sectionTitle}>Tags</Text>
              <View  style={styles.tagsContainer}>
                {item.tags.map((tag, index) => (
                  <View key={index}  style={styles.tag}>
                    <Text  style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Streaming Platforms - Enhanced with new component */}
          {contentDetails && selectedServices.length > 0 ? (
            <View style={styles.streamingSection}>
              <Text style={styles.sectionTitle}>Where to Watch</Text>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading streaming options...</Text>
                </View>
              ) : (
                <StreamingAvailabilityComponent
                  availability={{
                    contentId: item.id,
                    contentTitle: item.title,
                    availableOn: contentDetails.availability.map(avail => ({
                      serviceId: avail.service.id || avail.service.name.toLowerCase().replace(/\s+/g, ''),
                      serviceName: avail.service.name,
                      region: "US",
                      availableNow: avail.available,
                      vpnLocationRequired: undefined,
                      streamingUrl: avail.service.baseUrl,
                      quality: avail.quality?.[0] as 'SD' | 'HD' | '4K',
                      subscriptionRequired: avail.price > 0,
                    })),
                    notAvailableOn: [],
                  }}
                  userServices={selectedServices}
                  onVpnSetupPress={(_serviceId, location) => {
                    // Show VPN recommendation modal with country focus
                    Alert.alert(
                      'VPN Setup Required',
                      `You need to connect to a VPN server in ${location} to watch this content.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Find VPN',
                          onPress: () => setShowVpnModal(true),
                        },
                      ]
                    );
                  }}
                />
              )}
            </View>
          ) : selectedServices.length === 0 ? (
            <View style={styles.streamingSection}>
              <Text style={styles.sectionTitle}>Where to Watch</Text>
              <View style={styles.noServicesContainer}>
                <Icon name="info-outline" size={48} color={theme.semantic.text.tertiary} />
                <Text style={styles.noServicesText}>
                  Select your streaming services to see where this content is available
                </Text>
                <TouchableOpacity
                  style={styles.selectServicesButton}
                  onPress={() => (navigation as any).navigate('StreamingServiceSelection', { isOnboarding: false })}
                >
                  <Text style={styles.selectServicesButtonText}>Select Services</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Language Options */}
          {contentDetails && contentDetails.availability.length > 0 && (
            <View style={styles.languageSection}>
              <LanguageOptionsDisplay
                audioLanguages={[
                  ...new Set(
                    contentDetails.availability
                      .flatMap(avail => avail.audioLanguages || [])
                  ),
                ]}
                subtitleLanguages={[
                  ...new Set(
                    contentDetails.availability
                      .flatMap(avail => avail.subtitles || [])
                  ),
                ]}
              />
            </View>
          )}

          {/* Regional Availability */}
          {contentDetails && contentDetails.availability.length > 0 && (
            <View style={styles.regionalSection}>
              <RegionalAvailability
                regions={
                  Object.entries(
                    contentDetails.availability.reduce((acc, avail) => {
                      const countryCode = avail.country?.code || 'US';
                      if (!acc[countryCode]) {
                        const info = getCountryInfo(countryCode);
                        acc[countryCode] = {
                          countryCode,
                          countryName: avail.country?.name || info.name,
                          flag: avail.country?.flag || info.flag,
                          services: [],
                          vpnRequired: countryCode !== 'US', // VPN required for non-US regions
                        };
                      }
                      acc[countryCode].services.push(avail.service.name);
                      return acc;
                    }, {} as Record<string, { countryCode: string; countryName: string; flag: string; services: string[]; vpnRequired: boolean }>)
                  ).map(([_, region]) => region)
                }
                userCountry="US"
                onRegionPress={(region) => {
                  if (region.vpnRequired) {
                    Alert.alert(
                      'VPN Required',
                      `This content requires a VPN connection to ${region.countryName} to access.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Setup VPN', onPress: () => setShowVpnModal(true) },
                      ]
                    );
                  }
                }}
                onVpnSetupPress={(_region) => setShowVpnModal(true)}
              />
            </View>
          )}

          {/* Related Content */}
          {relatedContent.length > 0 && (
            <View  style={styles.relatedSection}>
              <Text  style={styles.sectionTitle}>Related Content</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedList}
              >
                {relatedContent.map((related) => (
                  <TouchableOpacity key={related.id}  style={styles.relatedItem}>
                    <Image
                      source={{ uri: related.thumbnail }}
                       style={styles.relatedImage}
                      contentFit="cover"
                    />
                    <Text  style={styles.relatedTitle} numberOfLines={2}>
                      {related.title}
                    </Text>
                    {related.rating && (
                      <View  style={styles.relatedRating}>
                        <Icon name="star" size={12} color={theme.colors.warning[500]} />
                        <Text  style={styles.relatedRatingText}>
                          {related.rating}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed Header */}
      <SafeAreaView  style={styles.fixedHeader}>
        <View  style={styles.headerControls}>
          <Animated.View  style={backButtonAnimatedStyle}>
            <TouchableOpacity  style={styles.backButton} onPress={handleBackPress}>
              <Icon name="arrow-back" size={24} color={theme.semantic.text.inverse} />
            </TouchableOpacity>
          </Animated.View>

          {headerCollapsed && (
            <Animated.View  style={[styles.collapsedTitle, titleAnimatedStyle]}>
              <Text  style={styles.collapsedTitleText} numberOfLines={1}>
                {item.title}
              </Text>
            </Animated.View>
          )}

          <View  style={styles.rightControls}>
            <TouchableOpacity  style={styles.actionButton} onPress={handleShare}>
              <Icon name="share" size={20} color={theme.semantic.text.inverse} />
            </TouchableOpacity>
            <TouchableOpacity  style={styles.actionButton} onPress={handleWatchlistToggle}>
              <Icon
                name={isInWatchlist ? 'bookmark' : 'bookmark-border'}
                size={20}
                color={isInWatchlist ? theme.colors.warning[500] : theme.semantic.text.inverse}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* VPN Recommendation Modal */}
      {preferences && (
        <VpnRecommendationModal
          visible={showVpnModal}
          onClose={() => setShowVpnModal(false)}
          contentId={item.id}
          contentTitle={item.title}
          audioLanguages={preferences.audioLanguages}
          subtitleLanguages={preferences.subtitleLanguages}
          onProviderPress={(providerId) => {
            setShowVpnModal(false);
            (navigation as any).navigate('VpnProviderComparison', { providerId });
          }}
        />
      )}
    </View>
  );
};

export default ContentDetailScreen;
