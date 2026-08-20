/**
 * VPN Provider Card Component
 * Displays VPN provider information with features and pricing
 */

import React, { useMemo } from 'react';
import { View, Image, Linking, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text, Chip, Button, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { VpnProvider, VpnRecommendation } from '../../types/vpn.types';

interface VpnProviderCardProps {
  provider: VpnProvider;
  recommendation?: VpnRecommendation;
  onLearnMore?: (provider: VpnProvider) => void;
  onGetStarted?: (provider: VpnProvider) => void;
  showRecommendationBadge?: boolean;
  compact?: boolean;
}

export const VpnProviderCard: React.FC<VpnProviderCardProps> = ({
  provider,
  recommendation,
  onLearnMore,
  onGetStarted,
  showRecommendationBadge = false,
  compact = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleOpenWebsite = async () => {
    const url = provider.affiliateLink || provider.websiteUrl;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-border'}
          size={16}
          color={theme.colors.warning[400]} // Unified color - amber/gold for stars
        />,
      );
    }
    return stars;
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: theme.semantic.background.secondary }]}
        onPress={() => onLearnMore?.(provider)}
      >
        <View style={styles.compactHeader}>
          <Image source={{ uri: provider.logoUrl }} style={styles.compactLogo} resizeMode="contain" />
          <View style={styles.compactInfo}>
            <Text variant="titleMedium" style={{ fontWeight: '600' }}>
              {provider.displayName}
            </Text>
            <View style={styles.compactRating}>{renderStars(provider.rating)}</View>
          </View>
          <Text variant="titleLarge" style={[styles.compactPrice, { color: provider.color }]}>
            ${recommendation?.pricePerMonth || (provider.yearlyPrice / 12).toFixed(2)}
            <Text variant="bodySmall">/mo</Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.semantic.background.secondary }]}>
      {/* Recommendation Badge */}
      {showRecommendationBadge && recommendation && (
        <View style={[styles.recommendationBadge, { backgroundColor: provider.color }]}>
          <Icon name="recommend" size={16} color={theme.semantic.text.inverse} />
          <Text style={styles.recommendationText}>Recommended</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Image source={{ uri: provider.logoUrl }} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerInfo}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
            {provider.displayName}
          </Text>
          <View style={styles.ratingRow}>
            {renderStars(provider.rating)}
            <Text style={[styles.ratingText, { color: theme.semantic.text.secondary }]}>
              {provider.rating.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Recommendation Reason */}
      {recommendation && (
        <View style={[styles.reasonBox, { backgroundColor: `${provider.color}15` }]}>
          <Text style={[styles.reasonText, { color: provider.color }]}>
            {recommendation.reason}
          </Text>
        </View>
      )}

      {/* Pricing */}
      <View style={styles.pricingSection}>
        <View style={styles.priceRow}>
          <Text variant="headlineMedium" style={[styles.price, { color: provider.color }]}>
            ${recommendation?.pricePerMonth || (provider.yearlyPrice / 12).toFixed(2)}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.semantic.text.secondary }}>
            /month (yearly plan)
          </Text>
        </View>
        <Text variant="bodySmall" style={{ color: theme.semantic.text.secondary }}>
          ${provider.monthlyPrice}/month (monthly plan)
        </Text>
      </View>

      <Divider style={styles.divider} />

      {/* Features */}
      <View style={styles.featuresSection}>
        <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 8 }}>
          Key Features
        </Text>
        {provider.features.slice(0, 4).map(feature => (
          <View key={feature.id} style={styles.featureRow}>
            <Icon name="check-circle" size={20} color={provider.color} />
            <Text style={styles.featureText}>{feature.name}</Text>
          </View>
        ))}
      </View>

      <Divider style={styles.divider} />

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Icon name="public" size={24} color={theme.colors.primary} />
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            {provider.serverCount}+
          </Text>
          <Text variant="bodySmall" style={{ color: theme.semantic.text.secondary }}>
            Servers
          </Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="location-on" size={24} color={theme.colors.primary} />
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            {provider.serverLocations.length}+
          </Text>
          <Text variant="bodySmall" style={{ color: theme.semantic.text.secondary }}>
            Countries
          </Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="speed" size={24} color={theme.colors.primary} />
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            {provider.speedRating}/5
          </Text>
          <Text variant="bodySmall" style={{ color: theme.semantic.text.secondary }}>
            Speed
          </Text>
        </View>
      </View>

      {/* Trial Info */}
      {provider.trialAvailable && (
        <Chip mode="flat" style={styles.trialChip} icon="schedule">
          {provider.trialDays}-day free trial
        </Chip>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => { onGetStarted?.(provider); void handleOpenWebsite(); }}
          style={[styles.getStartedButton, { backgroundColor: provider.color }]}
        >
          Get Started
        </Button>
        <Button
          mode="outlined"
          onPress={() => onLearnMore?.(provider)}
          style={styles.learnMoreButton}
        >
          Learn More
        </Button>
      </View>

      {/* Refund Policy */}
      <Text
        variant="bodySmall"
        style={[styles.refundText, { color: theme.semantic.text.secondary }]}
      >
        {provider.refundDays}-day money-back guarantee
      </Text>
    </View>
  );
};

const createStyles = (theme: any) => ({
  card: {
    borderRadius: theme.borderRadius['2xl'],
    padding: theme.spacing[5],
    marginBottom: theme.spacing[4],
    ...theme.shadows.md,
  },
  recommendationBadge: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderTopRightRadius: theme.borderRadius['2xl'],
    borderBottomLeftRadius: theme.borderRadius['2xl'],
    gap: theme.spacing[1],
  },
  recommendationText: {
    color: theme.semantic.background.primary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing[4],
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: theme.spacing[4],
  },
  headerInfo: {
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: theme.spacing[1],
    gap: theme.spacing[1],
  },
  ratingText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    marginLeft: theme.spacing[1],
  },
  reasonBox: {
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[4],
  },
  reasonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  pricingSection: {
    marginBottom: theme.spacing[4],
  },
  priceRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: theme.spacing[1],
  },
  price: {
    fontWeight: theme.typography.fontWeight.bold,
  },
  divider: {
    marginVertical: theme.spacing[4],
  },
  featuresSection: {
    marginBottom: theme.spacing[4],
  },
  featureRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing[2],
    gap: theme.spacing[2],
  },
  featureText: {
    fontSize: theme.typography.fontSize.sm,
  },
  statsSection: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginBottom: theme.spacing[4],
  },
  statItem: {
    alignItems: 'center' as const,
    gap: theme.spacing[1],
  },
  trialChip: {
    alignSelf: 'flex-start' as const,
    marginBottom: theme.spacing[4],
  },
  actions: {
    flexDirection: 'row' as const,
    gap: theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  getStartedButton: {
    flex: 2,
  },
  learnMoreButton: {
    flex: 1,
  },
  refundText: {
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },
  compactCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    ...theme.shadows.sm,
  },
  compactHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  compactLogo: {
    width: 40,
    height: 40,
    marginRight: theme.spacing[3],
  },
  compactInfo: {
    flex: 1,
  },
  compactRating: {
    flexDirection: 'row' as const,
    marginTop: theme.spacing[1],
  },
  compactPrice: {
    fontWeight: theme.typography.fontWeight.bold,
  },
});
