/**
 * VPN Recommendation List Component
 * Displays VPN recommendations with language compatibility badges
 */

import React, { useState, useMemo } from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text, Chip, Surface, Divider, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { VpnRecommendation } from '../../types/vpn.types';
import { VpnProviderCard } from './VpnProviderCard';
import { useLanguagePreferences } from '../../hooks/useLanguagePreferences';
import { getLanguageByCode } from '../../types/language.types';

interface VpnRecommendationListProps {
  recommendations: VpnRecommendation[];
  onProviderSelect?: (providerId: string) => void;
  showLanguageMatch?: boolean;
  compact?: boolean;
}

type SortOption = 'language' | 'quality';

export const VpnRecommendationList: React.FC<VpnRecommendationListProps> = ({
  recommendations,
  onProviderSelect,
  showLanguageMatch = true,
  compact = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { preferences } = useLanguagePreferences();
  const [sortBy, setSortBy] = useState<SortOption>('quality');
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());

  // Calculate language match scores for each recommendation
  const recommendationsWithLanguageScore = useMemo(() => {
    if (!preferences || !showLanguageMatch) {
      return recommendations.map(rec => ({ ...rec, languageScore: 0 }));
    }

    return recommendations.map(rec => {
      // Mock language support data - in production, this would come from the API
      const mockAudioLanguages = ['en', 'es', 'fr', 'de', 'ja'];
      const mockSubtitleLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'];

      const audioMatches = preferences.audioLanguages.filter(lang =>
        mockAudioLanguages.includes(lang),
      ).length;
      const subtitleMatches = preferences.subtitleLanguages.filter(lang =>
        mockSubtitleLanguages.includes(lang),
      ).length;

      const audioScore = preferences.audioLanguages.length > 0
        ? (audioMatches / preferences.audioLanguages.length) * 60
        : 0;
      const subtitleScore = preferences.subtitleLanguages.length > 0
        ? (subtitleMatches / preferences.subtitleLanguages.length) * 40
        : 0;

      const languageScore = Math.round(audioScore + subtitleScore);

      return {
        ...rec,
        languageScore,
        matchedAudioLanguages: preferences.audioLanguages.filter(lang =>
          mockAudioLanguages.includes(lang),
        ),
        matchedSubtitleLanguages: preferences.subtitleLanguages.filter(lang =>
          mockSubtitleLanguages.includes(lang),
        ),
      };
    });
  }, [recommendations, preferences, showLanguageMatch]);

  // Sort recommendations based on selected option
  const sortedRecommendations = useMemo(() => {
    const sorted = [...recommendationsWithLanguageScore];
    if (sortBy === 'language') {
      return sorted.sort((a, b) => b.languageScore - a.languageScore);
    }
    return sorted.sort((a, b) => b.score - a.score);
  }, [recommendationsWithLanguageScore, sortBy]);

  const toggleExpanded = (providerId: string) => {
    setExpandedProviders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(providerId)) {
        newSet.delete(providerId);
      } else {
        newSet.add(providerId);
      }
      return newSet;
    });
  };

  const getLanguageMatchBadgeColor = (score: number): string => {
    if (score >= 80) {return theme.colors.success[500];} // Green - #22c55e
    if (score >= 60) {return theme.colors.warning[500];} // Amber - #f59e0b
    if (score >= 40) {return theme.colors.warning[400];} // Light Amber - #fbbf24
    return theme.colors.gray[400]; // Gray - #9ca3af
  };

  const getLanguageMatchLabel = (score: number): string => {
    if (score >= 80) {return 'Excellent Match';}
    if (score >= 60) {return 'Good Match';}
    if (score >= 40) {return 'Fair Match';}
    return 'Limited Match';
  };

  const renderLanguageMatchBadge = (item: any) => {
    if (!showLanguageMatch || !preferences || item.languageScore === 0) {
      return null;
    }

    const badgeColor = getLanguageMatchBadgeColor(item.languageScore);
    const label = getLanguageMatchLabel(item.languageScore);

    return (
      <View style={styles.languageMatchContainer}>
        <Chip
          mode="flat"
          style={[styles.languageMatchBadge, { backgroundColor: `${badgeColor}20` }]}
          textStyle={[styles.languageMatchText, { color: badgeColor }]}
          icon={() => <Icon name="language" size={16} color={badgeColor} />}
        >
          {label} ({item.languageScore}%)
        </Chip>
      </View>
    );
  };

  const renderLanguageDetails = (item: any) => {
    const isExpanded = expandedProviders.has(item.provider.id);

    if (!showLanguageMatch || !preferences || item.languageScore === 0) {
      return null;
    }

    return (
      <View style={styles.languageDetailsContainer}>
        <TouchableOpacity
          style={styles.languageDetailsHeader}
          onPress={() => toggleExpanded(item.provider.id)}
          activeOpacity={0.7}
        >
          <Icon
            name="translate"
            size={20}
            color={theme.colors.primary}
            style={{ marginRight: theme.spacing[2] }}
          />
          <Text style={[styles.languageDetailsTitle, { color: typeof theme.colors.primary === 'string' ? theme.colors.primary : theme.colors.primary[500] }]}>
            Language Support
          </Text>
          <Icon
            name={isExpanded ? 'expand-less' : 'expand-more'}
            size={20}
            color={theme.colors.primary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.languageDetailsContent}>
            {/* Audio Languages */}
            {item.matchedAudioLanguages && item.matchedAudioLanguages.length > 0 && (
              <View style={styles.languageSection}>
                <View style={styles.languageSectionHeader}>
                  <Icon name="volume-up" size={16} color={theme.semantic.text.secondary} />
                  <Text
                    style={[styles.languageSectionTitle, { color: theme.semantic.text.secondary }]}
                  >
                    Matched Audio Languages
                  </Text>
                </View>
                <View style={styles.languageChips}>
                  {item.matchedAudioLanguages.map((code: string) => {
                    const lang = getLanguageByCode(code);
                    return lang ? (
                      <Chip key={code} mode="outlined" style={styles.languageChip} compact>
                        {lang.flag} {lang.name}
                      </Chip>
                    ) : null;
                  })}
                </View>
              </View>
            )}

            {/* Subtitle Languages */}
            {item.matchedSubtitleLanguages && item.matchedSubtitleLanguages.length > 0 && (
              <View style={styles.languageSection}>
                <View style={styles.languageSectionHeader}>
                  <Icon name="subtitles" size={16} color={theme.semantic.text.secondary} />
                  <Text
                    style={[styles.languageSectionTitle, { color: theme.semantic.text.secondary }]}
                  >
                    Matched Subtitle Languages
                  </Text>
                </View>
                <View style={styles.languageChips}>
                  {item.matchedSubtitleLanguages.map((code: string) => {
                    const lang = getLanguageByCode(code);
                    return lang ? (
                      <Chip key={code} mode="outlined" style={styles.languageChip} compact>
                        {lang.flag} {lang.name}
                      </Chip>
                    ) : null;
                  })}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderRecommendation = ({ item, index }: { item: any; index: number }) => {
    const isBestMatch = sortBy === 'language' && index === 0 && item.languageScore >= 80;

    return (
      <Surface style={styles.recommendationCard as any} elevation={2}>
        {/* Best Match Badge */}
        {isBestMatch && (
          <View style={[styles.bestMatchBadge, { backgroundColor: theme.colors.success[500] }]}>
            <Icon name="stars" size={16} color={theme.semantic.background.primary} />
            <Text style={styles.bestMatchText}>Best Language Match</Text>
          </View>
        )}

        {/* Language Match Badge */}
        {renderLanguageMatchBadge(item)}

        {/* VPN Provider Card */}
        <VpnProviderCard
          provider={item.provider}
          recommendation={item}
          onLearnMore={() => onProviderSelect?.(item.provider.id)}
          onGetStarted={() => onProviderSelect?.(item.provider.id)}
          showRecommendationBadge={false}
          compact={compact}
        />

        {/* Language Details */}
        {renderLanguageDetails(item)}
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sort Options */}
      {showLanguageMatch && preferences && (
        <Surface style={styles.sortContainer}>
          <Text variant="labelLarge" style={{ color: theme.semantic.text.primary, marginBottom: theme.spacing[3] }}>
            Sort by:
          </Text>
          <View style={styles.sortButtons}>
            <Button
              mode={sortBy === 'quality' ? 'contained' : 'outlined'}
              onPress={() => setSortBy('quality')}
              style={styles.sortButton}
              icon="star"
              compact
            >
              Best Quality
            </Button>
            <Button
              mode={sortBy === 'language' ? 'contained' : 'outlined'}
              onPress={() => setSortBy('language')}
              style={styles.sortButton}
              icon="language"
              compact
            >
              Best Language Match
            </Button>
          </View>
        </Surface>
      )}

      <Divider />

      {/* Recommendations List */}
      <FlatList
        data={sortedRecommendations}
        renderItem={renderRecommendation}
        keyExtractor={item => item.provider.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        maxToRenderPerBatch={3}
        removeClippedSubviews={true}
        initialNumToRender={5}
        updateCellsBatchingPeriod={50}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="search-off" size={48} color={theme.semantic.text.secondary} />
            <Text
              variant="titleMedium"
              style={{ color: theme.semantic.text.secondary, marginTop: theme.spacing[4] }}
            >
              No VPN recommendations available
            </Text>
          </View>
        }
      />
    </View>
  );
};

const createStyles = (theme: any) => ({
  container: {
    flex: 1,
  },
  sortContainer: {
    padding: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  sortButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing[3],
  },
  sortButton: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing[4],
  },
  recommendationCard: {
    borderRadius: theme.borderRadius['2xl'],
    marginBottom: theme.spacing[4],
    overflow: 'hidden',
  },
  bestMatchBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    gap: theme.spacing[2],
  },
  bestMatchText: {
    color: theme.semantic.background.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  languageMatchContainer: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[2],
  },
  languageMatchBadge: {
    alignSelf: 'flex-start' as const,
  },
  languageMatchText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  languageDetailsContainer: {
    padding: theme.spacing[4],
    paddingTop: theme.spacing[2],
  },
  languageDetailsHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing[2],
  },
  languageDetailsTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  languageDetailsContent: {
    marginTop: theme.spacing[3],
  },
  languageSection: {
    marginBottom: theme.spacing[3],
  },
  languageSectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing[2],
    gap: theme.spacing[2],
  },
  languageSectionTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  languageChips: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing[2],
  },
  languageChip: {
    marginRight: theme.spacing[1],
    marginBottom: theme.spacing[1],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing[12],
  },
});

export default VpnRecommendationList;
