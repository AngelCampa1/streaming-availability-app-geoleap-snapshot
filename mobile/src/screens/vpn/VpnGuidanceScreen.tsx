/**
 * VPN Guidance Screen
 * Shows recommended VPN providers based on user's streaming services
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, Appbar, Banner, Searchbar, SegmentedButtons } from 'react-native-paper';
import { useTheme } from '../../theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useVpnRecommendations } from '../../hooks/useVpnRecommendations';
import { VpnProviderCard } from '../../components/vpn/VpnProviderCard';
import { VpnProvider, VPN_PROVIDERS } from '../../types/vpn.types';
import { useStreamingServices } from '../../hooks/useStreamingServices';
import { logger } from '../../utils/logger';

type Props = NativeStackScreenProps<RootStackParamList, 'VpnGuidance'>;

type ViewMode = 'recommended' | 'all' | 'countries';

// Popular countries for VPN browsing
const POPULAR_COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', vpnCount: 4 },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', vpnCount: 4 },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', vpnCount: 4 },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', vpnCount: 4 },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', vpnCount: 4 },
  { code: 'FR', name: 'France', flag: '🇫🇷', vpnCount: 4 },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', vpnCount: 4 },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', vpnCount: 3 },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', vpnCount: 4 },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', vpnCount: 2 },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', vpnCount: 3 },
  { code: 'IN', name: 'India', flag: '🇮🇳', vpnCount: 2 },
];

export const VpnGuidanceScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { selectedServices } = useStreamingServices();
  const { recommendations, hasRecommendations } = useVpnRecommendations(3);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('recommended');

  const handleLearnMore = (provider: VpnProvider) => {
    navigation.navigate('VpnProviderComparison', { providerId: provider.id });
  };

  const handleGetStarted = (provider: VpnProvider) => {
    // TODO: Navigate to subscription flow or open website
    logger.log('[VpnGuidanceScreen] Get started with VPN provider', { providerName: provider.name });
  };

  // Filter providers based on view mode
  const filteredProviders = (() => {
    if (viewMode === 'recommended') {
      return recommendations.map(r => r.provider);
    } else if (viewMode === 'all') {
      return VPN_PROVIDERS.filter(p =>
        p.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return []; // Countries view doesn't show providers directly
  })();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.semantic.background.primary }]} edges={['top']}>
      {/* Header */}
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="VPN Guidance" />
      </Appbar.Header>

      {/* No Services Banner */}
      {selectedServices.length === 0 && (
        <Banner
          visible={true}
          actions={[
            {
              label: 'Select Services',
              onPress: () => navigation.navigate('StreamingServiceSelection', { isOnboarding: false }),
            },
          ]}
          icon="information"
        >
          Select your streaming services to get personalized VPN recommendations.
        </Banner>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Text */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.semantic.text.primary }]}>
            {viewMode === 'countries' ? 'Browse by Country' : 'Find Your Perfect VPN'}
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.semantic.text.secondary }]}>
            {viewMode === 'countries'
              ? 'Select a country to see available VPN providers and streaming content'
              : hasRecommendations
              ? `Based on your ${selectedServices.length} streaming service${selectedServices.length > 1 ? 's' : ''}, here are our top recommendations:`
              : 'Browse all available VPN providers:'}
          </Text>
        </View>

        {/* View Mode Tabs */}
        <SegmentedButtons
          value={viewMode}
          onValueChange={(value) => setViewMode(value as ViewMode)}
          buttons={[
            {
              value: 'recommended',
              label: 'For You',
              icon: 'recommend',
              disabled: !hasRecommendations,
            },
            {
              value: 'countries',
              label: 'Countries',
              icon: 'public',
            },
            {
              value: 'all',
              label: 'All VPNs',
              icon: 'list',
            },
          ]}
          style={styles.filterTabs}
        />

        {/* Search (only for "All" mode) */}
        {viewMode === 'all' && (
          <Searchbar
            placeholder="Search VPN providers..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
        )}

        {/* Countries View Info */}
        {viewMode === 'countries' && (
          <View style={[styles.infoBox, { backgroundColor: theme.semantic.background.secondary, marginBottom: theme.spacing[4] }]}>
            <Text variant="bodyMedium" style={{ color: theme.semantic.text.secondary, lineHeight: 22 }}>
              Choose a country to discover which VPN providers have servers there and what streaming content is available in that region.
            </Text>
          </View>
        )}

        {/* Countries View - Popular Countries */}
        {viewMode === 'countries' && (
          <View style={styles.countriesGrid}>
            {POPULAR_COUNTRIES.map((country) => (
              <TouchableOpacity
                key={country.code}
                style={[styles.countryCard, { backgroundColor: theme.semantic.background.secondary }]}
                onPress={() => {
                  // TODO: Navigate to country detail screen or show country modal
                  logger.log('[VpnGuidanceScreen] Selected country', { countryName: country.name });
                }}
              >
                <Text style={styles.countryFlag}>{country.flag}</Text>
                <Text style={[styles.countryName, { color: theme.semantic.text.primary }]}>
                  {country.name}
                </Text>
                <Text style={[styles.countryVpnCount, { color: theme.colors.primary[500] }]}>
                  {country.vpnCount} VPNs
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Provider Cards (For You & All VPNs views) */}
        {viewMode !== 'countries' && filteredProviders.length > 0 ? (
          filteredProviders.map((provider, index) => {
            const rec = recommendations.find(r => r.provider.id === provider.id);
            return (
              <VpnProviderCard
                key={provider.id}
                provider={provider}
                recommendation={rec}
                showRecommendationBadge={viewMode === 'recommended' && index === 0}
                onLearnMore={handleLearnMore}
                onGetStarted={handleGetStarted}
              />
            );
          })
        ) : viewMode !== 'countries' ? (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ color: theme.semantic.text.secondary }}>
              {searchQuery ? `No VPN providers found for "${searchQuery}"` : 'No VPN providers available'}
            </Text>
          </View>
        ) : null}

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: theme.semantic.background.secondary }]}>
          <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: theme.spacing[2] }}>
            Why do I need a VPN?
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.semantic.text.secondary, lineHeight: 22 }}>
            Many streaming services have different content libraries in different countries. A VPN lets you connect to servers in other regions, giving you access to content that might not be available where you live.
          </Text>
        </View>

        {/* Compare All Button */}
        {filteredProviders.length > 1 && (
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('VpnProviderComparison')}
            style={styles.compareButton}
            icon="compare"
          >
            Compare All Providers
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: theme.spacing[4],
      paddingBottom: theme.spacing[8],
    },
    header: {
      marginBottom: theme.spacing[6],
    },
    title: {
      fontWeight: 'bold',
      marginBottom: theme.spacing[2],
    },
    subtitle: {
      lineHeight: 24,
    },
    filterTabs: {
      marginBottom: theme.spacing[4],
    },
    searchbar: {
      marginBottom: theme.spacing[4],
    },
    emptyState: {
      padding: theme.spacing[10],
      alignItems: 'center',
    },
    infoBox: {
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.xl,
      marginTop: theme.spacing[6],
      marginBottom: theme.spacing[4],
    },
    compareButton: {
      marginTop: theme.spacing[2],
    },
    countriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: theme.spacing[3],
    },
    countryCard: {
      width: '48%',
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.xl,
      alignItems: 'center',
      marginBottom: theme.spacing[3],
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    countryFlag: {
      fontSize: theme.typography.fontSize['5xl'] || 48,
      marginBottom: theme.spacing[2],
    },
    countryName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: '600',
      marginBottom: theme.spacing[1],
      textAlign: 'center',
    },
    countryVpnCount: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
    },
  });
