/**
 * Subscription Status Card Component
 * Displays current subscription status and quick actions
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text, Card, Button, Chip} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { UserSubscription } from '../../types/subscription.types';

interface SubscriptionStatusCardProps {
  subscription: UserSubscription | null;
  onManage?: () => void;
  onUpgrade?: () => void;
}

export const SubscriptionStatusCard: React.FC<SubscriptionStatusCardProps> = ({
  subscription,
  onManage,
  onUpgrade,
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    card: {
      marginBottom: theme.spacing[4],
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing[4],
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
      marginBottom: theme.spacing[2],
    },
    statusChip: {
      height: 28,
    },
    statusText: {
      color: theme.semantic.text.inverse,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    expirationSection: {
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[4],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing[3],
    },
    expirationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
    },
    renewSection: {
      paddingVertical: theme.spacing[2],
      marginBottom: theme.spacing[3],
    },
    renewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
    },
    actions: {
      marginTop: theme.spacing[2],
    },
    manageButton: {
      marginBottom: theme.spacing[2],
    },
    upgradeButton: {
      marginTop: theme.spacing[4],
    },
  });

  if (!subscription || subscription.tier === 'free') {
    return (
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.header}>
            <Icon name="info-outline" size={48} color={theme.colors.primary[500]} />
            <Text variant="headlineSmall" style={{ fontWeight: '600', marginTop: theme.spacing[2] }}>
              Free Plan
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.semantic.text.secondary, textAlign: 'center', marginTop: theme.spacing[1] }}>
              Upgrade to unlock premium features
            </Text>
          </View>
          <Button
            mode="contained"
            onPress={onUpgrade}
            style={styles.upgradeButton}
            icon="arrow-up-circle"
          >
            Upgrade Now
          </Button>
        </Card.Content>
      </Card>
    );
  }

  const endDate = new Date(subscription.endDate);
  const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const getStatusColor = () => {
    switch (subscription.status) {
      case 'active':
        return theme.colors.primary[500];
      case 'trial':
        return theme.colors.info[500];
      case 'canceled':
      case 'expired':
        return theme.colors.error[500];
      default:
        return theme.colors.gray[400];
    }
  };

  const getStatusLabel = () => {
    switch (subscription.status) {
      case 'active':
        return 'Active';
      case 'trial':
        return 'Trial';
      case 'canceled':
        return 'Canceled';
      case 'expired':
        return 'Expired';
      case 'past_due':
        return 'Past Due';
      default:
        return subscription.status;
    }
  };

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text variant="headlineSmall" style={{ fontWeight: '600', color: subscription.plan.color }}>
              {subscription.plan.displayName}
            </Text>
            <Chip
              mode="flat"
              style={[styles.statusChip, { backgroundColor: getStatusColor() }]}
              textStyle={styles.statusText}
            >
              {getStatusLabel()}
            </Chip>
          </View>
        </View>

        {/* Expiration Info */}
        {subscription.status === 'active' && (
          <View style={styles.expirationSection}>
            <View style={styles.expirationRow}>
              <Icon name="event" size={20} color={theme.semantic.text.secondary} />
              <Text variant="bodyMedium" style={{ color: theme.semantic.text.secondary }}>
                {subscription.autoRenew ? 'Renews on' : 'Expires on'} {endDate.toLocaleDateString()}
              </Text>
            </View>
            {daysRemaining <= 7 && (
              <Text variant="bodySmall" style={{ color: theme.colors.error[600], marginTop: theme.spacing[1] }}>
                {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
              </Text>
            )}
          </View>
        )}

        {/* Auto-Renew Status */}
        <View style={styles.renewSection}>
          <View style={styles.renewRow}>
            <Icon
              name={subscription.autoRenew ? 'refresh' : 'cancel'}
              size={20}
              color={subscription.autoRenew ? theme.colors.primary[500] : theme.colors.error[500]}
            />
            <Text variant="bodyMedium">
              Auto-renewal: {subscription.autoRenew ? 'On' : 'Off'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={onManage}
            style={styles.manageButton}
          >
            Manage Subscription
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};
