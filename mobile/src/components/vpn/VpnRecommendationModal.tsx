/**
 * VPN Recommendation Modal Component
 * Full-screen modal displaying country recommendations grouped by language match quality
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SectionList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Text, Surface, Chip, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CountryRecommendation } from '../../types/vpn-country.types';
import { CountryRecommendationCard } from './CountryRecommendationCard';
import { useCountriesForContent } from '../../hooks/useCountriesForContent';
import { getLanguageByCode } from '../../types/language.types';
import { useTheme } from '../../theme/ThemeProvider';

const { height: _screenHeight } = Dimensions.get('window');

interface VpnRecommendationModalProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
  audioLanguages: string[];
  subtitleLanguages: string[];
  onProviderPress?: (providerId: string) => void;
}

interface SectionData {
  title: string;
  data: CountryRecommendation[];
  color: string;
  icon: string;
  description: string;
}

export const VpnRecommendationModal: React.FC<VpnRecommendationModalProps> = ({
  visible,
  onClose,
  contentId,
  contentTitle,
  audioLanguages,
  subtitleLanguages,
  onProviderPress,
}) => {
  const { theme } = useTheme();
  const [showOtherCountries, setShowOtherCountries] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    groupedCountries,
    response,
    isLoading,
    error,
    refetch,
  } = useCountriesForContent({
    contentId,
    audioLanguages,
    subtitleLanguages,
    enabled: visible,
  });

  const sections: SectionData[] = useMemo(() => {
    const sectionsData: SectionData[] = [];

    if (groupedCountries.perfect.length > 0) {
      sectionsData.push({
        title: 'Perfect Match',
        data: groupedCountries.perfect,
        color: theme.colors.success[500],
        icon: 'check-circle',
        description: 'All your preferred languages are available',
      });
    }

    if (groupedCountries.good.length > 0) {
      sectionsData.push({
        title: 'Good Match',
        data: groupedCountries.good,
        color: theme.colors.primary[500],
        icon: 'thumb-up',
        description: 'Most of your preferred languages are available',
      });
    }

    if (groupedCountries.partial.length > 0) {
      sectionsData.push({
        title: 'Partial Match',
        data: groupedCountries.partial,
        color: theme.colors.warning[500],
        icon: 'info',
        description: 'Some of your preferred languages are available',
      });
    }

    if (showOtherCountries && groupedCountries.other.length > 0) {
      sectionsData.push({
        title: 'Other Countries',
        data: groupedCountries.other,
        color: theme.colors.neutral[500],
        icon: 'public',
        description: 'Limited language support',
      });
    }

    return sectionsData;
  }, [groupedCountries, showOtherCountries, theme]);

  const renderHeader = useCallback(() => (
    <Surface style={styles.headerContainer} elevation={2}>
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Icon name="close" size={24} color={theme.semantic.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.semantic.text.primary }]} numberOfLines={1}>
          Where to Watch
        </Text>
        <View style={{ width: theme.spacing[10] }} />
      </View>

      <Text style={[styles.contentTitle, { color: theme.semantic.text.primary }]} numberOfLines={2}>
        {contentTitle}
      </Text>

      {/* User Language Preferences */}
      <View style={styles.languagePreferences}>
        <Text style={[styles.preferencesLabel, { color: theme.semantic.text.secondary }]}>
          Your language preferences:
        </Text>
        <View style={styles.languageChips}>
          {audioLanguages.map(code => {
            const lang = getLanguageByCode(code);
            return lang ? (
              <Chip
                key={`audio-${code}`}
                mode="outlined"
                compact
                icon="volume-up"
                style={styles.preferenceChip}
              >
                {lang.flag} {lang.name}
              </Chip>
            ) : null;
          })}
          {subtitleLanguages.map(code => {
            const lang = getLanguageByCode(code);
            return lang ? (
              <Chip
                key={`subtitle-${code}`}
                mode="outlined"
                compact
                icon="subtitles"
                style={styles.preferenceChip}
              >
                {lang.flag} {lang.name}
              </Chip>
            ) : null;
          })}
        </View>
      </View>

      {/* Summary Stats */}
      {response && (
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary[500] }]}>
              {response.totalCountriesAnalyzed}
            </Text>
            <Text style={[styles.statLabel, { color: theme.semantic.text.secondary }]}>
              Countries
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.success[500] }]}>
              {response.countriesWithPerfectMatch}
            </Text>
            <Text style={[styles.statLabel, { color: theme.semantic.text.secondary }]}>
              Perfect Matches
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary[500] }]}>
              {response.countriesWithGoodMatch}
            </Text>
            <Text style={[styles.statLabel, { color: theme.semantic.text.secondary }]}>
              Good Matches
            </Text>
          </View>
        </View>
      )}
    </Surface>
  ), [contentTitle, audioLanguages, subtitleLanguages, response, styles, theme, onClose]);

  const renderSectionHeader = useCallback(({ section }: { section: SectionData }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.semantic.background.primary }]}>
      <View style={[styles.sectionBadge, { backgroundColor: `${section.color}20` }]}>
        <Icon name={section.icon} size={20} color={section.color} />
      </View>
      <View style={styles.sectionInfo}>
        <Text style={[styles.sectionTitle, { color: theme.semantic.text.primary }]}>
          {section.title}
        </Text>
        <Text style={[styles.sectionDescription, { color: theme.semantic.text.secondary }]}>
          {section.description} • {section.data.length} countr
          {section.data.length === 1 ? 'y' : 'ies'}
        </Text>
      </View>
    </View>
  ), [styles, theme]);

  const renderItem = useCallback(({ item }: { item: CountryRecommendation }) => (
    <CountryRecommendationCard
      country={item}
      onProviderPress={onProviderPress}
      defaultExpanded={false}
    />
  ), [onProviderPress]);

  const renderFooter = useCallback(() => {
    if (groupedCountries.other.length === 0 || showOtherCountries) {
      return null;
    }

    return (
      <View style={styles.footer}>
        <Button
          mode="outlined"
          onPress={() => setShowOtherCountries(true)}
          icon="expand-more"
          style={styles.showMoreButton}
        >
          Show {groupedCountries.other.length} More Countries
        </Button>
      </View>
    );
  }, [groupedCountries.other.length, showOtherCountries, styles]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Icon name="public-off" size={64} color={theme.semantic.text.secondary} />
      <Text style={[styles.emptyTitle, { color: theme.semantic.text.primary }]}>
        No Countries Found
      </Text>
      <Text style={[styles.emptyMessage, { color: theme.semantic.text.secondary }]}>
        We couldn't find any countries with VPN providers for this content.
      </Text>
      <Button mode="contained" onPress={refetch} style={styles.retryButton}>
        Try Again
      </Button>
    </View>
  ), [refetch, styles, theme]);

  const renderErrorState = useCallback(() => (
    <View style={styles.errorState}>
      <Icon name="error-outline" size={64} color={theme.colors.error[500]} />
      <Text style={[styles.errorTitle, { color: theme.semantic.text.primary }]}>
        Oops! Something went wrong
      </Text>
      <Text style={[styles.errorMessage, { color: theme.semantic.text.secondary }]}>
        {error?.message || 'Failed to load country recommendations'}
      </Text>
      <Button mode="contained" onPress={refetch} style={styles.retryButton}>
        Retry
      </Button>
    </View>
  ), [error, refetch, styles, theme]);

  const renderLoadingState = useCallback(() => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      <Text style={[styles.loadingText, { color: theme.semantic.text.secondary }]}>
        Finding the best countries for you...
      </Text>
    </View>
  ), [styles, theme]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.semantic.background.primary }]} edges={['top', 'bottom']}>
        {renderHeader()}

        {isLoading && !response ? (
          renderLoadingState()
        ) : error && !response ? (
          renderErrorState()
        ) : sections.length === 0 ? (
          renderEmptyState()
        ) : (
          <SectionList
            sections={sections}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item, index) => `${item.countryCode}-${index}`}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refetch}
                colors={[theme.colors.primary[500]]}
              />
            }
            ListFooterComponent={renderFooter}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.semantic.border.primary,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[5],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[3],
  },
  closeButton: {
    width: theme.spacing[10],
    height: theme.spacing[10],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    flex: 1,
    textAlign: 'center',
  },
  contentTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing[4],
    lineHeight: theme.typography.fontSize['2xl'] * theme.typography.lineHeight.tight,
  },
  languagePreferences: {
    marginBottom: theme.spacing[4],
  },
  preferencesLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing[2],
  },
  languageChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  preferenceChip: {
    height: theme.spacing[7],
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing[1],
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  listContent: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[3],
  },
  sectionBadge: {
    width: theme.spacing[11],
    height: theme.spacing[11],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[3],
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing[1],
  },
  sectionDescription: {
    fontSize: theme.typography.fontSize.sm,
  },
  footer: {
    paddingVertical: theme.spacing[4],
    alignItems: 'center',
  },
  showMoreButton: {
    minWidth: theme.spacing[50],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  emptyMessage: {
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    marginTop: theme.spacing[4],
  },
  retryButton: {
    minWidth: theme.spacing[38],
  },
});

export default VpnRecommendationModal;
