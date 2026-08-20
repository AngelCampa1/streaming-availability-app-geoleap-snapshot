import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface SubscriptionBadgeProps {
  isActive: boolean;
  tier?: string;
}

/**
 * Badge component to show subscription status and tier
 */
export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({ isActive, tier }) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: theme.spacing[2],
    },
    badge: {
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.xl,
    },
    badgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    activeBadge: {
      backgroundColor: theme.colors.success[100],
    },
    activeText: {
      color: theme.colors.success[600],
    },
    inactiveBadge: {
      backgroundColor: theme.colors.error[100],
    },
    inactiveText: {
      color: theme.colors.error[600],
    },
    tierBadge: {
      backgroundColor: theme.colors.primary[100],
    },
    tierText: {
      color: theme.colors.primary[600],
    },
  });

  return (
    <View style={styles.container}>
      {isActive ? (
        <View style={[styles.badge, styles.activeBadge]}>
          <Text style={[styles.badgeText, styles.activeText]}>Active</Text>
        </View>
      ) : (
        <View style={[styles.badge, styles.inactiveBadge]}>
          <Text style={[styles.badgeText, styles.inactiveText]}>Inactive</Text>
        </View>
      )}
      {tier && (
        <View style={[styles.badge, styles.tierBadge]}>
          <Text style={[styles.badgeText, styles.tierText]}>
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </Text>
        </View>
      )}
    </View>
  );
};

export default SubscriptionBadge;
