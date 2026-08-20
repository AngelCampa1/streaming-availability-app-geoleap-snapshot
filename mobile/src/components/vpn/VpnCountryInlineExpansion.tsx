/**
 * VPN Country Inline Expansion (Mobile)
 * React Native version with LayoutAnimation
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, LayoutAnimation, Platform, UIManager, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useUserSubscriptions } from '../../hooks/useUserSubscriptions';
import { API_BASE_URL } from '../../config/api';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface CountryRecommendation {
  countryCode: string;
  countryName: string;
  countryFlag: string;
  languageMatchQuality: 'Perfect' | 'Good' | 'Partial' | 'Limited';
  streamingServices: string[];
  audioLanguages?: string[];
  subtitleLanguages?: string[];
}

export interface ContentCountryRecommendationsDto {
  contentId: string;
  contentTitle?: string;
  recommendedCountries: CountryRecommendation[];
}

interface VpnCountryInlineExpansionProps {
  contentId: string;
  isExpanded: boolean;
  onCollapse: () => void;
  audioLanguages?: string[];
  subtitleLanguages?: string[];
}

export const VpnCountryInlineExpansion: React.FC<VpnCountryInlineExpansionProps> = ({
  contentId,
  isExpanded,
  onCollapse,
  audioLanguages = [],
  subtitleLanguages = [],
}) => {
  const theme = useTheme();
  const [data, setData] = useState<ContentCountryRecommendationsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const { getServiceIds, hasSetupSubscriptions } = useUserSubscriptions();
  const userServiceIds = getServiceIds();

  // Fetch VPN country data when expanded
  useEffect(() => {
    if (!isExpanded) return;

    let cancelled = false;

    const fetchCountryData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams();
        audioLanguages.forEach(lang => params.append('audioLanguages', lang));
        subtitleLanguages.forEach(lang => params.append('subtitleLanguages', lang));

        const url = `${API_BASE_URL}/api/vpnguidance/countries-for-content/${contentId}?${params.toString()}`;

        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch VPN locations');
        }

        const result: ContentCountryRecommendationsDto = await response.json();

        if (!cancelled) {
          // Animate layout change
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching VPN country data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load VPN locations');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCountryData();

    return () => {
      cancelled = true;
    };
  }, [isExpanded, contentId, audioLanguages, subtitleLanguages, retryTrigger]);

  // Error state with retry functionality
  const handleRetry = () => {
    setError(null);
    setData(null);
    setRetryTrigger(prev => prev + 1);
  };

  // Don't render anything when collapsed
  if (!isExpanded) {
    return null;
  }

  const styles = createStyles(theme);

  // Loading state
  if (loading) {
    return (
      <View style={styles.container} testID="vpn-expansion-loading">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Finding VPN locations for you...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container} testID="vpn-expansion-error">
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Failed to load VPN locations</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // No data state
  if (!data || data.recommendedCountries.length === 0) {
    return (
      <View style={styles.container} testID="vpn-expansion-container">
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyText}>
            This content is not available via VPN in any region.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.collapseButton}
          onPress={onCollapse}
          activeOpacity={0.7}
        >
          <Text style={styles.collapseButtonText}>Hide</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Group countries by streaming service
  const countriesByService: Record<string, CountryRecommendation[]> = {};

  // Determine which services to show
  const servicesToShow = hasSetupSubscriptions ? userServiceIds : null;

  data.recommendedCountries.forEach(country => {
    country.streamingServices.forEach(serviceId => {
      // Filter by user subscriptions if they have any configured
      if (servicesToShow && !servicesToShow.includes(serviceId)) {
        return;
      }

      if (!countriesByService[serviceId]) {
        countriesByService[serviceId] = [];
      }

      // Avoid duplicates
      if (!countriesByService[serviceId].some(c => c.countryCode === country.countryCode)) {
        countriesByService[serviceId].push(country);
      }
    });
  });

  // Map service IDs to display names
  const serviceNames: Record<string, string> = {
    netflix: 'Netflix',
    prime: 'Prime Video',
    disney: 'Disney+',
    hbo: 'HBO Max',
    hulu: 'Hulu',
    apple: 'Apple TV+',
    paramount: 'Paramount+',
    peacock: 'Peacock',
  };

  // Get quality badge style
  const getQualityBadgeStyle = (quality: string) => {
    switch (quality) {
      case 'Perfect':
        return styles.badgePerfect;
      case 'Good':
        return styles.badgeGood;
      case 'Partial':
        return styles.badgePartial;
      default:
        return styles.badgeLimited;
    }
  };

  return (
    <View style={styles.container} testID="vpn-expansion-container">
      <View style={styles.content}>
        {Object.entries(countriesByService).map(([serviceId, countries]) => (
          <View key={serviceId} style={styles.serviceSection} testID={`service-${serviceId}`}>
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceIcon}>📺</Text>
              <Text style={styles.serviceTitle}>
                {serviceNames[serviceId] || serviceId}
              </Text>
            </View>

            {countries.map(country => (
              <View
                key={country.countryCode}
                style={styles.countryCard}
                testID={`country-${country.countryCode}`}
              >
                <View style={styles.countryHeader}>
                  <View style={styles.countryInfo}>
                    <Text style={styles.countryFlag}>{country.countryFlag}</Text>
                    <View>
                      <Text style={styles.countryName}>{country.countryName}</Text>
                      <Text style={styles.countryCode}>{country.countryCode}</Text>
                    </View>
                  </View>

                  <View
                    style={[styles.badge, getQualityBadgeStyle(country.languageMatchQuality)]}
                    testID={`badge-${country.languageMatchQuality}`}
                  >
                    <Text style={styles.badgeText}>{country.languageMatchQuality}</Text>
                  </View>
                </View>

                {/* Language info */}
                {country.audioLanguages && country.audioLanguages.length > 0 && (
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageLabel}>
                      Audio: <Text style={styles.languageText}>{country.audioLanguages.join(', ')}</Text>
                    </Text>
                  </View>
                )}
                {country.subtitleLanguages && country.subtitleLanguages.length > 0 && (
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageLabel}>
                      Subs: <Text style={styles.languageText}>{country.subtitleLanguages.join(', ')}</Text>
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Collapse button */}
      <TouchableOpacity
        style={styles.collapseButton}
        onPress={onCollapse}
        activeOpacity={0.7}
      >
        <Text style={styles.collapseButtonText}>Hide</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      marginTop: theme.spacing[4],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      padding: theme.spacing[4],
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing[6],
    },
    loadingText: {
      marginTop: theme.spacing[3],
      color: theme.semantic.text.secondary,
      fontSize: theme.typography.fontSize.sm,
    },
    errorContainer: {
      paddingVertical: theme.spacing[4],
    },
    errorTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.error[500],
      marginBottom: theme.spacing[2],
    },
    errorMessage: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      marginBottom: theme.spacing[4],
    },
    retryButton: {
      backgroundColor: theme.colors.primary[500],
      paddingVertical: theme.spacing[2],
      paddingHorizontal: theme.spacing[4],
      borderRadius: theme.borderRadius.md,
      alignSelf: 'flex-start',
    },
    retryButtonText: {
      color: theme.colors.primary.foreground,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing[6],
    },
    emptyIcon: {
      fontSize: 32,
      marginBottom: theme.spacing[2],
    },
    emptyText: {
      color: theme.semantic.text.secondary,
      fontSize: theme.typography.fontSize.sm,
      textAlign: 'center',
    },
    content: {
      gap: theme.spacing[4],
    },
    serviceSection: {
      marginBottom: theme.spacing[3],
    },
    serviceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
      gap: theme.spacing[2],
    },
    serviceIcon: {
      fontSize: 18,
    },
    serviceTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
    },
    countryCard: {
      backgroundColor: theme.semantic.background.primary,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
      padding: theme.spacing[3],
      marginBottom: theme.spacing[2],
    },
    countryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing[2],
    },
    countryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
      flex: 1,
    },
    countryFlag: {
      fontSize: 20,
    },
    countryName: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.semantic.text.primary,
    },
    countryCode: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      textTransform: 'uppercase',
    },
    badge: {
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
    },
    badgePerfect: {
      backgroundColor: `${theme.colors.success[500]}20`,
      borderColor: `${theme.colors.success[500]}50`,
    },
    badgeGood: {
      backgroundColor: `${theme.colors.primary[500]}20`,
      borderColor: `${theme.colors.primary[500]}50`,
    },
    badgePartial: {
      backgroundColor: `${theme.colors.warning[500]}20`,
      borderColor: `${theme.colors.warning[500]}50`,
    },
    badgeLimited: {
      backgroundColor: `${theme.semantic.text.secondary}20`,
      borderColor: `${theme.semantic.text.secondary}50`,
    },
    badgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.semantic.text.primary,
    },
    languageInfo: {
      marginTop: theme.spacing[1],
    },
    languageLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
    },
    languageText: {
      color: theme.semantic.text.primary,
    },
    collapseButton: {
      marginTop: theme.spacing[4],
      paddingVertical: theme.spacing[2],
      alignItems: 'center',
    },
    collapseButtonText: {
      color: theme.colors.primary[500],
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
