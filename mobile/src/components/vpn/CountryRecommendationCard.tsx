/**
 * Country Recommendation Card Component
 * Displays a country with language match quality and VPN provider list
 */

import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text, Surface, Chip, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import {
  CountryRecommendation,
  getMatchQualityColor,
  getMatchQualityDescription,
} from '../../types/vpn-country.types';
import { VpnProviderListItem } from './VpnProviderListItem';
import { getLanguageByCode } from '../../types/language.types';

interface CountryRecommendationCardProps {
  country: CountryRecommendation;
  onProviderPress?: (providerId: string) => void;
  defaultExpanded?: boolean;
}

export const CountryRecommendationCard: React.FC<CountryRecommendationCardProps> = ({
  country,
  onProviderPress,
  defaultExpanded = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotation = useSharedValue(defaultExpanded ? 1 : 0);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    rotation.value = withTiming(isExpanded ? 0 : 1, { duration: 200 });
  };

  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(rotation.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  const matchColor = getMatchQualityColor(country.languageMatchQuality);
  const matchDescription = getMatchQualityDescription(country.languageMatchQuality);

  const renderLanguageHighlights = () => {
    if (!country.languageHighlights || country.languageHighlights.length === 0) {
      return null;
    }

    return (
      <View style={styles.languageHighlights}>
        {country.languageHighlights.map((highlight, index) => (
          <View key={index} style={styles.highlightRow}>
            <Icon name="check-circle" size={14} color={matchColor} />
            <Text style={[styles.highlightText, { color: theme.semantic.text.secondary }]}>
              {highlight}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderLanguageChips = () => {
    const allLanguages = [
      ...country.audioLanguages.map(code => ({ code, type: 'audio' as const })),
      ...country.subtitleLanguages.map(code => ({ code, type: 'subtitle' as const })),
    ];

    // Remove duplicates
    const uniqueLanguages = allLanguages.filter(
      (lang, index, self) =>
        index === self.findIndex(l => l.code === lang.code && l.type === lang.type),
    );

    if (uniqueLanguages.length === 0) {
      return null;
    }

    return (
      <View style={styles.languageChips}>
        {uniqueLanguages.slice(0, 6).map((lang, index) => {
          const language = getLanguageByCode(lang.code);
          if (!language) return null;

          return (
            <Chip
              key={`${lang.code}-${lang.type}-${index}`}
              mode="outlined"
              compact
              style={styles.languageChip}
              textStyle={styles.languageChipText}
              icon={lang.type === 'audio' ? 'volume-up' : 'subtitles'}
            >
              {language.flag} {language.name}
            </Chip>
          );
        })}
        {uniqueLanguages.length > 6 && (
          <Text style={[styles.moreLanguages, { color: theme.semantic.text.secondary }]}>
            +{uniqueLanguages.length - 6} more
          </Text>
        )}
      </View>
    );
  };

  const renderStreamingServices = () => {
    if (!country.streamingServices || country.streamingServices.length === 0) {
      return null;
    }

    return (
      <View style={styles.streamingServices}>
        <Text style={[styles.streamingLabel, { color: theme.semantic.text.secondary }]}>
          Available on:
        </Text>
        <View style={styles.serviceChips}>
          {country.streamingServices.slice(0, 4).map((service, index) => (
            <Chip key={index} mode="flat" compact style={styles.serviceChip}>
              {service}
            </Chip>
          ))}
          {country.streamingServices.length > 4 && (
            <Text style={[styles.moreServices, { color: theme.semantic.text.secondary }]}>
              +{country.streamingServices.length - 4}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <Surface style={styles.container} elevation={2}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.flag}>{country.countryFlag}</Text>
          <View style={styles.headerInfo}>
            <Text style={[styles.countryName, { color: theme.semantic.text.primary }]}>
              {country.countryName}
            </Text>
            <View style={styles.matchBadge}>
              <Chip
                mode="flat"
                compact
                style={[styles.matchQualityChip, { backgroundColor: `${matchColor}20` }]}
                textStyle={[styles.matchQualityText, { color: matchColor }]}
                icon={() => <Icon name="language" size={14} color={matchColor} />}
              >
                {country.languageMatchQuality} Match ({country.languageScore}%)
              </Chip>
            </View>
          </View>
        </View>

        <Animated.View style={arrowAnimatedStyle}>
          <Icon name="expand-more" size={24} color={theme.semantic.text.secondary} />
        </Animated.View>
      </TouchableOpacity>

      {/* Summary (always visible) */}
      <View style={styles.summary}>
        <Text style={[styles.matchDescription, { color: theme.semantic.text.secondary }]}>
          {matchDescription}
        </Text>

        <View style={styles.vpnCount}>
          <Icon name="vpn-lock" size={16} color={theme.colors.primary[500]} />
          <Text style={[styles.vpnCountText, { color: theme.colors.primary[500] }]}>
            {country.availableVpnProviders.length} VPN provider
            {country.availableVpnProviders.length !== 1 ? 's' : ''} available
          </Text>
        </View>
      </View>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <Divider style={styles.divider} />

          {/* Language Highlights */}
          {renderLanguageHighlights()}

          {/* Language Chips */}
          {renderLanguageChips()}

          {/* Streaming Services */}
          {renderStreamingServices()}

          {/* VPN Providers */}
          {country.availableVpnProviders.length > 0 && (
            <View style={styles.vpnProviders}>
              <Text style={[styles.vpnProvidersTitle, { color: theme.semantic.text.primary }]}>
                VPN Providers in {country.countryName}
              </Text>

              {country.availableVpnProviders.map((provider, index) => (
                <VpnProviderListItem
                  key={provider.id}
                  provider={provider}
                  countryCode={country.countryCode}
                  countryName={country.countryName}
                  onPress={() => onProviderPress?.(provider.id)}
                  showDivider={index < country.availableVpnProviders.length - 1}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </Surface>
  );
};

const createStyles = (theme: any) => ({
  container: {
    borderRadius: theme.borderRadius['2xl'],
    marginBottom: theme.spacing[4],
    backgroundColor: theme.semantic.background.primary,
    overflow: 'hidden' as const,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[3],
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  flag: {
    fontSize: 40,
    marginRight: theme.spacing[3],
  },
  headerInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing[2],
  },
  matchBadge: {
    alignSelf: 'flex-start' as const,
  },
  matchQualityChip: {
    height: 28,
  },
  matchQualityText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  summary: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    gap: theme.spacing[2],
  },
  matchDescription: {
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
  },
  vpnCount: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing[2],
  },
  vpnCountText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  expandedContent: {
    paddingBottom: theme.spacing[4],
  },
  divider: {
    marginBottom: theme.spacing[4],
  },
  languageHighlights: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    gap: theme.spacing[2],
  },
  highlightRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing[2],
  },
  highlightText: {
    fontSize: theme.typography.fontSize.sm,
    flex: 1,
  },
  languageChips: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    gap: theme.spacing[2],
  },
  languageChip: {
    height: 30,
  },
  languageChipText: {
    fontSize: theme.typography.fontSize.xs,
  },
  moreLanguages: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    marginTop: theme.spacing[1],
  },
  streamingServices: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  streamingLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing[2],
  },
  serviceChips: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing[2],
  },
  serviceChip: {
    height: 28,
    backgroundColor: theme.colors.success[50],
  },
  moreServices: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing[1],
  },
  vpnProviders: {
    paddingHorizontal: theme.spacing[4],
  },
  vpnProvidersTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing[3],
  },
});

export default CountryRecommendationCard;
