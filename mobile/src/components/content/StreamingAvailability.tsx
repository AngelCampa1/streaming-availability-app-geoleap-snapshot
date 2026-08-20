/**
 * Streaming Availability Component
 * Full detailed view of content streaming availability
 * Shows where content is available with VPN indicators and watch links
 */

import React from 'react';
import { View, StyleSheet,  Linking, Image, ScrollView } from 'react-native';
import { Text, Card, Button, Chip } from 'react-native-paper';
import { useTheme } from '../../theme/ThemeProvider';
import { logger } from '../../utils/logger';
import { StreamingAvailability, ContentAvailability } from '../../types/streaming.types';
import { getServiceById } from '../../types/streaming.types';

interface StreamingAvailabilityProps {
  availability: ContentAvailability;
  userServices: string[];
  onVpnSetupPress?: (serviceId: string, location: string) => void;
}

export const StreamingAvailabilityComponent: React.FC<StreamingAvailabilityProps> = ({
  availability,
  userServices,
  onVpnSetupPress,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Group availability by user's services vs other services
  const userServicesAvailability = availability.availableOn.filter(a =>
    userServices.includes(a.serviceId),
  );
  const otherServicesAvailability = availability.availableOn.filter(
    a => !userServices.includes(a.serviceId),
  );

  // Further split user services into available now vs VPN required
  const availableNow = userServicesAvailability.filter(a => a.availableNow);
  const vpnRequired = userServicesAvailability.filter(a => !a.availableNow);

  const handleStreamingLinkPress = async (url: string) => {
    if (!url) {return;}
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      logger.error('[StreamingAvailability] Failed to open streaming link', error);
    }
  };

  const renderAvailabilityItem = (avail: StreamingAvailability, isUserService: boolean) => {
    const service = getServiceById(avail.serviceId);
    if (!service) {return null;}

    return (
      <Card
        key={`${avail.serviceId}-${avail.region}`}
        style={[
          styles.availabilityCard,
          isUserService && {
            borderColor: service.color,
            borderWidth: 2,
          },
        ]}
        mode="outlined"
      >
        <Card.Content>
          <View style={styles.serviceHeader}>
            {/* Service Logo */}
            <Image
              source={{ uri: service.logoUrl }}
              style={styles.serviceLogo}
              resizeMode="contain"
            />

            <View style={styles.serviceInfo}>
              <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                {service.displayName}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.semantic.text.secondary }}
              >
                {avail.region}
              </Text>
            </View>

            {/* Quality Badge */}
            {avail.quality && (
              <Chip mode="flat" compact style={styles.qualityBadge}>
                {avail.quality}
              </Chip>
            )}
          </View>

          {/* Availability Status */}
          <View style={styles.statusSection}>
            {avail.availableNow ? (
              <View style={styles.statusRow}>
                <Text style={[styles.statusIcon, { color: theme.colors.primary[500] }]}>
                  ✓
                </Text>
                <Text
                  style={[
                    styles.statusText,
                    { color: theme.colors.primary[500], fontWeight: '600' },
                  ]}
                >
                  Available Now
                </Text>
              </View>
            ) : avail.vpnLocationRequired ? (
              <View style={styles.statusRow}>
                <Text style={[styles.statusIcon, { color: theme.colors.secondary[500] }]}>
                  🛡️
                </Text>
                <Text
                  style={[styles.statusText, { color: theme.colors.secondary[500] }]}
                >
                  VPN Required: {avail.vpnLocationRequired}
                </Text>
              </View>
            ) : (
              <View style={styles.statusRow}>
                <Text style={[styles.statusIcon, { color: theme.colors.error[500] }]}>
                  ✗
                </Text>
                <Text style={[styles.statusText, { color: theme.colors.error[500] }]}>
                  Not Available
                </Text>
              </View>
            )}

            {avail.subscriptionRequired && (
              <Text
                variant="bodySmall"
                style={[styles.subscriptionNote, { color: theme.semantic.text.secondary }]}
              >
                Subscription required
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {avail.availableNow && avail.streamingUrl && (
              <Button
                mode="contained"
                onPress={() => handleStreamingLinkPress(avail.streamingUrl!)}
                icon="play"
                style={[styles.watchButton, { backgroundColor: service.color }]}
              >
                Watch Now
              </Button>
            )}

            {!avail.availableNow && avail.vpnLocationRequired && isUserService && (
              <Button
                mode="contained"
                onPress={() => onVpnSetupPress?.(avail.serviceId, avail.vpnLocationRequired!)}
                icon="shield-key"
                style={styles.vpnButton}
                buttonColor={theme.colors.primary[500]}
                textColor="#ffffff"
              >
                Setup VPN
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (availability.availableOn.length === 0) {
    return (
      <Card style={styles.emptyCard} mode="outlined">
        <Card.Content>
          <Text
            variant="bodyLarge"
            style={[styles.emptyText, { color: theme.semantic.text.secondary }]}
          >
            😔 Not currently available on any streaming service
          </Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {/* Available Now Section */}
      {availableNow.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.primary[500] }]}>
            🎉 Available Now on Your Services
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {availableNow.map(avail => renderAvailabilityItem(avail, true))}
          </ScrollView>
        </View>
      )}

      {/* VPN Required Section */}
      {vpnRequired.length > 0 && (
        <View style={styles.section}>
          <Text
            variant="titleLarge"
            style={[styles.sectionTitle, { color: theme.colors.secondary[500] }]}
          >
            🛡️ Available with VPN
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {vpnRequired.map(avail => renderAvailabilityItem(avail, true))}
          </ScrollView>
        </View>
      )}

      {/* Other Services Section */}
      {otherServicesAvailability.length > 0 && (
        <View style={styles.section}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.semantic.text.secondary }]}
          >
            Also Available On
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.sectionSubtitle, { color: theme.semantic.text.secondary }]}
          >
            These services are not in your selected list
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {otherServicesAvailability.map(avail => renderAvailabilityItem(avail, false))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: theme.spacing[6],
  },
  sectionTitle: {
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing[1],
    paddingHorizontal: theme.spacing[4],
  },
  sectionSubtitle: {
    marginBottom: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
  },
  availabilityCard: {
    marginHorizontal: theme.spacing[2],
    width: 320,
    marginBottom: theme.spacing[2],
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  serviceLogo: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing[3],
  },
  serviceInfo: {
    flex: 1,
  },
  qualityBadge: {
    height: 24,
  },
  statusSection: {
    marginBottom: theme.spacing[3],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  statusIcon: {
    fontSize: theme.typography.fontSize.lg,
    marginRight: theme.spacing[2],
  },
  statusText: {
    fontSize: theme.typography.fontSize.sm,
  },
  subscriptionNote: {
    fontSize: theme.typography.fontSize.xs,
    fontStyle: 'italic',
    marginTop: theme.spacing[1],
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  watchButton: {
    flex: 1,
  },
  vpnButton: {
    flex: 1,
  },
  emptyCard: {
    marginHorizontal: theme.spacing[4],
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: theme.spacing[6],
  },
});
