/**
 * Availability Badge Component
 * Shows streaming availability status on search results and content cards
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { StreamingAvailability } from '../../types/streaming.types';
import { getServiceById } from '../../types/streaming.types';
import { useTheme } from '../../theme/ThemeProvider';

interface AvailabilityBadgeProps {
  availability: StreamingAvailability[];
  userServices: string[];
  compact?: boolean;
  maxDisplay?: number;
}

export const AvailabilityBadge: React.FC<AvailabilityBadgeProps> = ({
  availability,
  userServices,
  compact = false,
  maxDisplay = 3,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Filter to show only user's services
  const userAvailability = availability.filter(a =>
    userServices.includes(a.serviceId),
  );

  // Split into available now vs VPN required
  const availableNow = userAvailability.filter(a => a.availableNow);
  const _vpnRequired = userAvailability.filter(a => !a.availableNow && a.vpnLocationRequired);

  if (userAvailability.length === 0) {
    return (
      <Chip
        mode="flat"
        style={[styles.badge, { backgroundColor: theme.colors.error[100] }]}
        textStyle={[styles.badgeText, { color: theme.colors.error[700] }]}
        compact={compact}
      >
        Not on your services
      </Chip>
    );
  }

  if (compact) {
    // Compact mode: Just show count and status
    const hasAvailableNow = availableNow.length > 0;
    return (
      <Chip
        mode="flat"
        style={[
          styles.badge,
          {
            backgroundColor: hasAvailableNow
              ? theme.colors.primary[100]
              : theme.colors.secondary[100],
          },
        ]}
        textStyle={[
          styles.badgeText,
          {
            color: hasAvailableNow
              ? theme.colors.primary[700]
              : theme.colors.secondary[700],
          },
        ]}
        icon={hasAvailableNow ? 'check-circle' : 'shield-key'}
        compact
      >
        {hasAvailableNow ? 'Available Now' : 'VPN Required'}
      </Chip>
    );
  }

  // Full mode: Show individual service badges
  const displayAvailability = userAvailability.slice(0, maxDisplay);
  const remainingCount = userAvailability.length - maxDisplay;

  return (
    <View style={styles.container}>
      {displayAvailability.map(avail => {
        const service = getServiceById(avail.serviceId);
        if (!service) {return null;}

        return (
          <Chip
            key={avail.serviceId}
            mode="flat"
            style={[
              styles.serviceBadge,
              {
                backgroundColor: avail.availableNow
                  ? `${service.color}20`
                  : theme.semantic.background.secondary,
                borderColor: service.color,
                borderWidth: 1,
              },
            ]}
            textStyle={[
              styles.serviceBadgeText,
              { color: avail.availableNow ? service.color : theme.semantic.text.secondary },
            ]}
            icon={avail.availableNow ? undefined : 'shield-key'}
            compact
          >
            {service.displayName}
            {!avail.availableNow && avail.vpnLocationRequired && ` (${avail.vpnLocationRequired})`}
          </Chip>
        );
      })}

      {remainingCount > 0 && (
        <Chip
          mode="flat"
          style={[styles.serviceBadge, { backgroundColor: theme.semantic.background.secondary }]}
          textStyle={[styles.serviceBadgeText, { color: theme.semantic.text.secondary }]}
          compact
        >
          +{remainingCount} more
        </Chip>
      )}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  badge: {
    height: 28,
  },
  badgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
  },
  serviceBadge: {
    height: 26,
    marginRight: theme.spacing[1],
    marginBottom: theme.spacing[1],
  },
  serviceBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
  },
});
