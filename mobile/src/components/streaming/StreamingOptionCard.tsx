/**
 * Streaming Option Card Component
 * Displays streaming service availability with language support indicators
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { Text, Chip, Surface, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { StreamingAvailability } from '../../types/streaming.types';
import { useLanguagePreferences } from '../../hooks/useLanguagePreferences';
import { getLanguageByCode, calculateLanguageMatchScore } from '../../types/language.types';
import { getStreamingLogo } from '@/assets';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

interface StreamingOptionCardProps {
  availability: StreamingAvailability;
  onPress?: () => void;
  showLanguageMatch?: boolean;
  compact?: boolean;
}

export const StreamingOptionCard: React.FC<StreamingOptionCardProps> = ({
  availability,
  onPress,
  showLanguageMatch = true,
  compact = false,
}) => {
  const { theme } = useTheme();
  const { preferences } = useLanguagePreferences();
  const [isExpanded, setIsExpanded] = useState(false);
  const styles = createStyles(theme);

  // Mock language data - in production, this would come from the API
  const mockLanguages = {
    audioLanguages: ['en', 'es', 'fr', 'de', 'ja'],
    subtitleLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'ar', 'hi'],
  };

  // Calculate language match
  const languageMatch = preferences
    ? calculateLanguageMatchScore(preferences, mockLanguages)
    : null;

  const getQualityColor = (quality?: string): string => {
    switch (quality) {
      case '4K':
        return theme.colors.success[500];
      case 'HD':
        return theme.colors.primary[500];
      case 'SD':
        return theme.colors.warning[500];
      default:
        return theme.semantic.text.secondary;
    }
  };

  const getLanguageMatchColor = (score: number): string => {
    if (score >= 80) {return theme.colors.success[500];}
    if (score >= 60) {return theme.colors.warning[500];}
    if (score >= 40) {return theme.colors.warning[400];}
    return theme.semantic.text.tertiary;
  };

  const renderLanguageBadge = () => {
    if (!showLanguageMatch || !languageMatch || languageMatch.matchScore === 0) {
      return null;
    }

    const badgeColor = getLanguageMatchColor(languageMatch.matchScore);

    return (
      <Chip
        mode="flat"
        style={[styles.languageBadge, { backgroundColor: `${badgeColor}20` }]}
        textStyle={[styles.languageBadgeText, { color: badgeColor }]}
        icon={() => <Icon name="language" size={14} color={badgeColor} />}
        compact
      >
        {languageMatch.matchScore}% Match
      </Chip>
    );
  };

  const renderLanguageDetails = () => {
    if (!showLanguageMatch || !languageMatch || !isExpanded) {
      return null;
    }

    return (
      <View style={styles.languageDetailsContainer}>
        <Divider style={{ marginVertical: theme.spacing[3] }} />

        {/* Audio Languages */}
        <View style={styles.languageSection}>
          <View style={styles.languageSectionHeader}>
            <Icon name="volume-up" size={16} color={theme.semantic.text.secondary} />
            <Text style={[styles.languageSectionTitle, { color: theme.semantic.text.secondary }]}>
              Audio Languages
            </Text>
            {languageMatch.matchedAudio && (
              <Icon name="check-circle" size={16} color={theme.colors.success[500]} />
            )}
          </View>
          <View style={styles.languageChips}>
            {mockLanguages.audioLanguages.slice(0, 6).map(code => {
              const lang = getLanguageByCode(code);
              const isMatched =
                preferences?.audioLanguages.includes(code) || false;
              return lang ? (
                <Chip
                  key={code}
                  mode={isMatched ? 'flat' : 'outlined'}
                  style={[
                    styles.languageChip,
                    isMatched && { backgroundColor: `${theme.colors.success[500]}20` },
                  ]}
                  textStyle={isMatched ? { color: theme.colors.success[500], fontWeight: '600' } : {}}
                  compact
                >
                  {lang.flag} {lang.name}
                </Chip>
              ) : null;
            })}
            {mockLanguages.audioLanguages.length > 6 && (
              <Chip mode="outlined" style={styles.languageChip} compact>
                +{mockLanguages.audioLanguages.length - 6} more
              </Chip>
            )}
          </View>
        </View>

        {/* Subtitle Languages */}
        <View style={styles.languageSection}>
          <View style={styles.languageSectionHeader}>
            <Icon name="subtitles" size={16} color={theme.semantic.text.secondary} />
            <Text style={[styles.languageSectionTitle, { color: theme.semantic.text.secondary }]}>
              Subtitle Languages
            </Text>
            {languageMatch.matchedSubtitles && (
              <Icon name="check-circle" size={16} color={theme.colors.success[500]} />
            )}
          </View>
          <View style={styles.languageChips}>
            {mockLanguages.subtitleLanguages.slice(0, 8).map(code => {
              const lang = getLanguageByCode(code);
              const isMatched =
                preferences?.subtitleLanguages.includes(code) || false;
              return lang ? (
                <Chip
                  key={code}
                  mode={isMatched ? 'flat' : 'outlined'}
                  style={[
                    styles.languageChip,
                    isMatched && { backgroundColor: `${theme.colors.success[500]}20` },
                  ]}
                  textStyle={isMatched ? { color: theme.colors.success[500], fontWeight: '600' } : {}}
                  compact
                >
                  {lang.flag} {lang.name}
                </Chip>
              ) : null;
            })}
            {mockLanguages.subtitleLanguages.length > 8 && (
              <Chip mode="outlined" style={styles.languageChip} compact>
                +{mockLanguages.subtitleLanguages.length - 8} more
              </Chip>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: theme.semantic.background.secondary }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.compactContent}>
          <Text variant="titleMedium" style={{ fontWeight: '600' }}>
            {availability.serviceName}
          </Text>
          <View style={styles.compactBadges}>
            {availability.quality && (
              <Chip
                mode="flat"
                style={[
                  styles.qualityChip,
                  { backgroundColor: `${getQualityColor(availability.quality)}20` },
                ]}
                textStyle={{ color: getQualityColor(availability.quality), fontSize: 10 }}
                compact
              >
                {availability.quality}
              </Chip>
            )}
            {renderLanguageBadge()}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Surface style={[styles.card, { width: CARD_WIDTH }]} elevation={2}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {/* Header */}
        <View style={styles.header}>
          {(() => {
            const logo = getStreamingLogo(availability.serviceId);
            if (logo?.svg) {
              return (
                <View style={[styles.serviceIcon, { backgroundColor: logo.color, justifyContent: 'center', alignItems: 'center' }]}>
                  <SvgXml
                    xml={logo.svg}
                    width={32}
                    height={32}
                    testID="streaming-option-logo"
                  />
                </View>
              );
            }
            // Fallback for services without SVG
            return (
              <View style={[styles.serviceIcon, { backgroundColor: theme.semantic.border.primary, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.semantic.text.primary, fontWeight: '600' }}>
                  {availability.serviceName.charAt(0)}
                </Text>
              </View>
            );
          })()}
          <View style={styles.headerInfo}>
            <Text variant="titleLarge" style={{ fontWeight: '600' }}>
              {availability.serviceName}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.semantic.text.secondary }}>
              {availability.region}
            </Text>
          </View>
        </View>

        {/* Badges */}
        <View style={styles.badgesContainer}>
          {/* Availability Badge */}
          <Chip
            mode="flat"
            style={[
              styles.availabilityChip,
              {
                backgroundColor: availability.availableNow ? `${theme.colors.success[500]}20` : `${theme.colors.error[500]}20`,
              },
            ]}
            textStyle={{
              color: availability.availableNow ? theme.colors.success[500] : theme.colors.error[500],
              fontWeight: '600',
            }}
            icon={() => (
              <Icon
                name={availability.availableNow ? 'check-circle' : 'cancel'}
                size={16}
                color={availability.availableNow ? theme.colors.success[500] : theme.colors.error[500]}
              />
            )}
          >
            {availability.availableNow ? 'Available Now' : 'Not Available'}
          </Chip>

          {/* Quality Badge */}
          {availability.quality && (
            <Chip
              mode="flat"
              style={[
                styles.qualityChip,
                { backgroundColor: `${getQualityColor(availability.quality)}20` },
              ]}
              textStyle={{
                color: getQualityColor(availability.quality),
                fontWeight: '600',
              }}
              icon={() => (
                <Icon
                  name="high-quality"
                  size={16}
                  color={getQualityColor(availability.quality)}
                />
              )}
            >
              {availability.quality}
            </Chip>
          )}

          {/* Language Match Badge */}
          {renderLanguageBadge()}
        </View>

        {/* VPN Required Info */}
        {availability.vpnLocationRequired && (
          <View style={[styles.vpnInfo, { backgroundColor: `${theme.colors.primary[500]}20` }]}>
            <Icon name="vpn-key" size={20} color={theme.colors.primary[500]} />
            <Text style={[styles.vpnText, { color: theme.colors.primary[500] }]}>
              VPN Required: {availability.vpnLocationRequired}
            </Text>
          </View>
        )}

        {/* Language Toggle */}
        {showLanguageMatch && languageMatch && languageMatch.matchScore > 0 && (
          <TouchableOpacity
            style={styles.languageToggle}
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.7}
          >
            <Icon name="translate" size={20} color={theme.colors.primary[500]} />
            <Text style={[styles.languageToggleText, { color: theme.colors.primary[500] }]}>
              {isExpanded ? 'Hide' : 'Show'} Language Support
            </Text>
            <Icon
              name={isExpanded ? 'expand-less' : 'expand-more'}
              size={20}
              color={theme.colors.primary[500]}
            />
          </TouchableOpacity>
        )}

        {/* Language Details (Expandable) */}
        {renderLanguageDetails()}
      </TouchableOpacity>
    </Surface>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius['2xl'],
    marginBottom: theme.spacing[4],
    overflow: 'hidden',
  },
  compactCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[2],
    ...theme.shadows.sm,
  },
  compactContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactBadges: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[3],
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing[4],
  },
  headerInfo: {
    flex: 1,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[3],
    gap: theme.spacing[2],
  },
  availabilityChip: {
    marginRight: theme.spacing[1],
  },
  qualityChip: {
    marginRight: theme.spacing[1],
  },
  languageBadge: {
    marginRight: theme.spacing[1],
  },
  languageBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
  },
  vpnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing[2],
  },
  vpnText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  languageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    gap: theme.spacing[2],
  },
  languageToggleText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  languageDetailsContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
  },
  languageSection: {
    marginBottom: theme.spacing[4],
  },
  languageSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
    gap: theme.spacing[2],
  },
  languageSectionTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  languageChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  languageChip: {
    marginRight: theme.spacing[1],
    marginBottom: theme.spacing[1],
  },
});

export default StreamingOptionCard;
