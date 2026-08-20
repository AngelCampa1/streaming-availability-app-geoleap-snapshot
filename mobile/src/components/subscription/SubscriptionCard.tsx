import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { UserStreamingSubscription } from '../../types/streaming';
import { useTheme } from '../../theme/ThemeProvider';
import { Card } from '../common/Card';
import StreamingServiceIcon from './StreamingServiceIcon';
import SubscriptionBadge from './SubscriptionBadge';

interface SubscriptionCardProps {
  subscription: UserStreamingSubscription;
  onEdit?: (subscription: UserStreamingSubscription) => void;
  onRemove?: (serviceId: string) => void;
}

/**
 * Card component displaying a single subscription with actions
 */
export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onEdit,
  onRemove,
}) => {
  const { theme } = useTheme();
  const [removing, setRemoving] = useState(false);

  const handleRemove = () => {
    Alert.alert(
      'Remove Subscription',
      `Are you sure you want to remove ${subscription.serviceName} from your subscriptions?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            if (onRemove) {
              await onRemove(subscription.serviceId);
            }
            setRemoving(false);
          },
        },
      ],
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const styles = StyleSheet.create({
    card: {
      marginBottom: theme.spacing[3],
    },
    container: {
      padding: theme.spacing[4],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing[3],
    },
    info: {
      flex: 1,
      marginLeft: theme.spacing[3],
    },
    serviceName: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[2],
    },
    date: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      marginTop: theme.spacing[1],
    },
    notesContainer: {
      marginTop: theme.spacing[3],
      padding: theme.spacing[3],
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.lg,
    },
    notesLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.secondary,
      marginBottom: theme.spacing[1],
    },
    notes: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.primary,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
    },
    actions: {
      flexDirection: 'row',
      marginTop: theme.spacing[4],
      gap: theme.spacing[3],
    },
    button: {
      flex: 1,
      paddingVertical: theme.spacing[3],
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editButton: {
      backgroundColor: theme.colors.primary[100],
    },
    editButtonText: {
      color: theme.colors.primary[600],
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    removeButton: {
      backgroundColor: theme.colors.error[100],
    },
    removeButtonText: {
      color: theme.colors.error[600],
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.container}>
        <View style={styles.header}>
          <StreamingServiceIcon serviceId={subscription.serviceId} size="medium" />
          <View style={styles.info}>
            <Text style={styles.serviceName}>{subscription.serviceName}</Text>
            <SubscriptionBadge
              isActive={subscription.isActive}
              tier={subscription.subscriptionTier}
            />
            <Text style={styles.date}>Added {formatDate(subscription.addedAt)}</Text>
          </View>
        </View>

        {subscription.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notes}>{subscription.notes}</Text>
          </View>
        )}

        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => onEdit(subscription)}
              disabled={removing}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
          {onRemove && (
            <TouchableOpacity
              style={[styles.button, styles.removeButton]}
              onPress={handleRemove}
              disabled={removing}
            >
              <Text style={styles.removeButtonText}>
                {removing ? 'Removing...' : 'Remove'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );
};

export default SubscriptionCard;
