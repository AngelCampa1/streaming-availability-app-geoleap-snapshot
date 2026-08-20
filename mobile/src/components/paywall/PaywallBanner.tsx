/**
 * PaywallBanner - Dismissible banner shown when approaching search limit
 *
 * Displays a warning banner with remaining search count and upgrade CTA
 * when user is within 5 searches of their daily limit.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { SearchLimitState } from '../../hooks/useSearchLimit';

export interface PaywallBannerProps {
  searchLimitState: SearchLimitState;
  onDismiss?: () => void;
  showUpgradeButton?: boolean;
}

type UrgencyLevel = 'low' | 'medium' | 'high';

export const PaywallBanner: React.FC<PaywallBannerProps> = ({
  searchLimitState,
  onDismiss,
  showUpgradeButton = true,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [dismissed, setDismissed] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  const { remainingSearches, searchLimit, tier, isApproachingLimit, hasReachedLimit } = searchLimitState;

  // Determine urgency level based on remaining searches
  const getUrgencyLevel = (): UrgencyLevel => {
    if (remainingSearches <= 1) return 'high';
    if (remainingSearches <= 3) return 'medium';
    return 'low';
  };

  const urgency = getUrgencyLevel();

  // useMemo must be called before any early returns (React hooks rules)
  const styles = useMemo(() => createStyles(theme, urgency), [theme, urgency]);

  // Don't show if not approaching limit, has unlimited, already reached limit, or dismissed
  if (!isApproachingLimit || searchLimit === Infinity || hasReachedLimit || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDismissed(true);
      onDismiss?.();
    });
  };

  const handleUpgrade = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'SubscriptionPlans',
      })
    );
  };

  const getMessage = () => {
    if (remainingSearches === 1) {
      return `Last search! Upgrade for unlimited.`;
    }
    if (remainingSearches <= 3) {
      return `Only ${remainingSearches} searches left today!`;
    }
    return `${remainingSearches} searches remaining today`;
  };

  const getIcon = (): string => {
    switch (urgency) {
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'search';
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.contentRow}>
        <View style={styles.iconContainer}>
          <Icon name={getIcon()} size={20} color={styles.iconColor.color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.message}>{getMessage()}</Text>
          {tier !== 'anonymous' && (
            <Text style={styles.tierText}>{tier} plan</Text>
          )}
        </View>
        {showUpgradeButton && (
          <TouchableOpacity
            onPress={handleUpgrade}
            style={styles.upgradeButton}
            accessibilityLabel="Upgrade to premium"
            accessibilityRole="button"
            testID="banner-upgrade-button"
          >
            <Text style={styles.upgradeText}>Upgrade</Text>
          </TouchableOpacity>
        )}
        <IconButton
          icon="close"
          size={18}
          onPress={handleDismiss}
          style={styles.dismissButton}
          accessibilityLabel="Dismiss banner"
          testID="banner-dismiss-button"
        />
      </View>
    </Animated.View>
  );
};

const createStyles = (theme: any, urgency: UrgencyLevel) => {
  // Colors based on urgency level
  const getColors = () => {
    switch (urgency) {
      case 'high':
        return {
          background: theme.colors.error[50],
          border: theme.colors.error[200],
          icon: theme.colors.error[500],
          text: theme.colors.error[700],
        };
      case 'medium':
        return {
          background: theme.colors.warning[50],
          border: theme.colors.warning[200],
          icon: theme.colors.warning[500],
          text: theme.colors.warning[700],
        };
      default:
        return {
          background: theme.colors.primary[50],
          border: theme.colors.primary[200],
          icon: theme.colors.primary[500],
          text: theme.colors.primary[700],
        };
    }
  };

  const colors = getColors();

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      marginHorizontal: 16,
      marginVertical: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
    } as ViewStyle,
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
    } as ViewStyle,
    iconContainer: {
      marginRight: 8,
    } as ViewStyle,
    iconColor: {
      color: colors.icon,
    } as TextStyle,
    textContainer: {
      flex: 1,
    } as ViewStyle,
    message: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: colors.text,
    } as TextStyle,
    tierText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      marginTop: 2,
    } as TextStyle,
    upgradeButton: {
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      marginRight: 4,
    } as ViewStyle,
    upgradeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.semantic.text.inverse,
    } as TextStyle,
    dismissButton: {
      margin: 0,
      padding: 0,
    } as ViewStyle,
  });
};

export default PaywallBanner;
