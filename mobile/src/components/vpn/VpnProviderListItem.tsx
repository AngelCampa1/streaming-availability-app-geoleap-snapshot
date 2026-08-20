/**
 * VPN Provider List Item Component
 * Displays a single VPN provider within a country recommendation
 */

import React from 'react';
import { View, TouchableOpacity, Linking, Alert, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text, Surface, Chip, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { VpnProviderSummary } from '../../types/vpn-country.types';
import { STREAMING_BRAND_COLORS } from '../../tokens/designTokens';
import { logger } from '../../utils/logger';

interface VpnProviderListItemProps {
  provider: VpnProviderSummary;
  countryCode: string;
  countryName: string;
  onPress?: (provider: VpnProviderSummary) => void;
  showDivider?: boolean;
  compact?: boolean;
}

export const VpnProviderListItem: React.FC<VpnProviderListItemProps> = ({
  provider,
  countryCode: _countryCode,
  countryName,
  onPress,
  showDivider = false,
  compact = false,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const handlePress = () => {
    if (onPress) {
      onPress(provider);
    }
  };

  const handleAffiliatePress = async () => {
    if (!provider.affiliateUrl) {
      return;
    }

    Alert.alert(
      `Visit ${provider.name}`,
      `This will open ${provider.name}'s website with a special offer.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Visit Website',
          onPress: async () => {
            try {
              const supported = await Linking.canOpenURL(provider.affiliateUrl!);
              if (supported) {
                await Linking.openURL(provider.affiliateUrl!);
              } else {
                Alert.alert('Error', `Cannot open ${provider.name} URL`);
              }
            } catch (error) {
              logger.error('[VpnProviderListItem] Failed to open affiliate URL', error);
              Alert.alert('Error', `Failed to open ${provider.name} website`);
            }
          },
        },
      ],
    );
  };

  const renderStreamingIcons = () => {
    const streamingServices = [];

    if (provider.worksWithNetflix) {
      streamingServices.push({ name: 'Netflix', icon: 'play-circle-filled', color: STREAMING_BRAND_COLORS.netflix });
    }
    if (provider.worksWithPrimeVideo) {
      streamingServices.push({ name: 'Prime Video', icon: 'shopping-cart', color: STREAMING_BRAND_COLORS.primeVideo });
    }
    if (provider.worksWithDisneyPlus) {
      streamingServices.push({ name: 'Disney+', icon: 'castle', color: STREAMING_BRAND_COLORS.disneyPlus });
    }

    if (streamingServices.length === 0) {
      return null;
    }

    return (
      <View style={styles.streamingIconsContainer}>
        <Text style={[styles.streamingLabel, { color: theme.semantic.text.secondary }]}>
          Works with:
        </Text>
        <View style={styles.streamingIcons}>
          {streamingServices.map((service, index) => (
            <View key={index} style={[styles.streamingIcon, { backgroundColor: service.color }]}>
              <Icon name={service.icon} size={12} color={theme.semantic.background.primary} />
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { backgroundColor: theme.semantic.background.secondary }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.compactLeft}>
          {provider.logoUrl && (
            <Image
              source={{ uri: provider.logoUrl }}
              style={styles.compactLogo}
              contentFit="contain"
            />
          )}
          <View style={styles.compactInfo}>
            <Text style={[styles.compactName, { color: theme.semantic.text.primary }]} numberOfLines={1}>
              {provider.name}
            </Text>
            <Text style={[styles.compactServers, { color: theme.semantic.text.secondary }]}>
              {provider.serverCountInCountry} servers in {countryName}
            </Text>
          </View>
        </View>
        {provider.overallRating && (
          <View style={styles.compactRating}>
            <Icon name="star" size={14} color={theme.colors.warning[500]} />
            <Text style={[styles.compactRatingText, { color: theme.semantic.text.primary }]}>{provider.overallRating.toFixed(1)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <Surface style={styles.container} elevation={1}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <View style={styles.header}>
          {provider.logoUrl && (
            <Image
              source={{ uri: provider.logoUrl }}
              style={styles.logo}
              contentFit="contain"
            />
          )}
          <View style={styles.headerInfo}>
            <Text style={[styles.name, { color: theme.semantic.text.primary }]} numberOfLines={1}>
              {provider.name}
            </Text>
            <View style={styles.metaRow}>
              {provider.overallRating && (
                <View style={styles.rating}>
                  <Icon name="star" size={16} color={theme.colors.warning[500]} />
                  <Text style={[styles.ratingText, { color: theme.semantic.text.primary }]}>
                    {provider.overallRating.toFixed(1)}
                  </Text>
                </View>
              )}
              <Text style={[styles.price, { color: theme.colors.primary[500] }]}>
                ${provider.monthlyPrice}/mo
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.details}>
          {/* Server Count */}
          <View style={styles.detailRow}>
            <Icon name="dns" size={16} color={theme.semantic.text.secondary} />
            <Text style={[styles.detailText, { color: theme.semantic.text.secondary }]}>
              {provider.serverCountInCountry} servers in {countryName}
            </Text>
          </View>

          {/* Speed */}
          {provider.speedMbps && (
            <View style={styles.detailRow}>
              <Icon name="speed" size={16} color={theme.semantic.text.secondary} />
              <Text style={[styles.detailText, { color: theme.semantic.text.secondary }]}>
                Up to {provider.speedMbps} Mbps
              </Text>
            </View>
          )}

          {/* Streaming Support */}
          {renderStreamingIcons()}
        </View>

        {/* Features */}
        {provider.features && provider.features.length > 0 && (
          <View style={styles.features}>
            {provider.features.slice(0, 3).map((feature, index) => (
              <Chip key={index} mode="outlined" compact style={styles.featureChip}>
                {feature}
              </Chip>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.detailsButton, { borderColor: theme.colors.primary[500] }]}
            onPress={handlePress}
          >
            <Text style={[styles.detailsButtonText, { color: theme.colors.primary[500] }]}>
              View Details
            </Text>
          </TouchableOpacity>

          {provider.affiliateUrl && (
            <TouchableOpacity
              style={[styles.getButton, { backgroundColor: theme.colors.primary[500] }]}
              onPress={handleAffiliatePress}
            >
              <Text style={[styles.getButtonText, { color: theme.semantic.background.primary }]}>Get Started</Text>
              <Icon name="open-in-new" size={16} color={theme.semantic.background.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {showDivider && <Divider style={styles.divider} />}
    </Surface>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing[3],
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[3],
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing[3],
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing[1],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  ratingText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  price: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
  },
  details: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[3],
    gap: theme.spacing[2],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  detailText: {
    fontSize: theme.typography.fontSize.sm,
  },
  streamingIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  streamingLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  streamingIcons: {
    flexDirection: 'row',
    gap: theme.spacing[1],
  },
  streamingIcon: {
    width: 20,
    height: 20,
    borderRadius: theme.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[3],
    gap: theme.spacing[2],
  },
  featureChip: {
    height: 28,
  },
  actions: {
    flexDirection: 'row',
    padding: theme.spacing[4],
    paddingTop: theme.spacing[2],
    gap: theme.spacing[3],
  },
  detailsButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  getButton: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  getButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  divider: {
    marginHorizontal: theme.spacing[4],
  },
  // Compact mode styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[2],
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactLogo: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing[3],
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing[1],
  },
  compactServers: {
    fontSize: theme.typography.fontSize.xs,
  },
  compactRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  compactRatingText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

export default VpnProviderListItem;
