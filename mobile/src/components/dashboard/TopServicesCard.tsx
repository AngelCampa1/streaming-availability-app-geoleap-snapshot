/**
 * Top Services Card Component
 * Displays user's most used streaming services
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';

interface ServiceStat {
  id: string;
  name: string;
  logoUrl?: string;
  watchCount: number;
  hoursWatched: number;
  color: string;
}

interface TopServicesCardProps {
  services: ServiceStat[];
  onPress?: () => void;
}

// Service colors are now centralized in theme.colors.streamingServices
// This function retrieves the color from theme or falls back to service.color
const getServiceColor = (serviceId: string, theme: any, fallbackColor: string): string => {
  const streamingColors = theme.colors.streamingServices;
  const lowerServiceId = serviceId.toLowerCase();
  return streamingColors?.[lowerServiceId] || fallbackColor;
};

export const TopServicesCard: React.FC<TopServicesCardProps> = ({
  services,
  onPress,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const topServices = services.slice(0, 4);
  const totalHours = services.reduce((sum, s) => sum + s.hoursWatched, 0);

  return (
    <Surface style={styles.container} elevation={1} onTouchEnd={onPress}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="subscriptions" size={20} color={theme.colors.primary[500]} />
          <Text style={styles.title}>Top Services</Text>
        </View>
        <Text style={styles.subtitle}>{totalHours} hours total</Text>
      </View>

      <View style={styles.serviceGrid}>
        {topServices.map((service, index) => (
          <View key={service.id} style={styles.serviceItem}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>

            <View style={[styles.serviceLogo, { backgroundColor: service.color + '20' }]}>
              {service.logoUrl ? (
                <Image
                  source={{ uri: service.logoUrl }}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              ) : (
                <Icon name="play-circle" size={24} color={service.color} />
              )}
            </View>

            <Text style={styles.serviceName} numberOfLines={1}>
              {service.name}
            </Text>
            <Text style={styles.serviceStats}>
              {service.watchCount} titles
            </Text>
            <Text style={styles.serviceHours}>
              {service.hoursWatched}h
            </Text>
          </View>
        ))}
      </View>

      {services.length > 4 && (
        <View style={styles.moreContainer}>
          <Text style={styles.moreText}>
            +{services.length - 4} more services
          </Text>
          <Icon name="chevron-right" size={16} color={theme.colors.primary[500]} />
        </View>
      )}
    </Surface>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[4],
  },
  header: {
    marginBottom: theme.spacing[4],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    marginLeft: 28,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  serviceItem: {
    width: '46%',
    backgroundColor: theme.semantic.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    alignItems: 'center',
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.inverse,
  },
  serviceLogo: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  serviceName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[1],
  },
  serviceStats: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
  },
  serviceHours: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary[500],
  },
  moreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing[3],
    gap: theme.spacing[1],
  },
  moreText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[500],
  },
});

export default TopServicesCard;
