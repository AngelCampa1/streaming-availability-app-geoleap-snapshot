/**
 * Streaming Service Selector Component
 * Multi-select grid of streaming services with beautiful UI
 */

import React from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text, Chip } from 'react-native-paper';
import { STREAMING_SERVICES, StreamingService } from '../../types/streaming.types';

interface ServiceSelectorProps {
  selectedServices: string[];
  onToggleService: (serviceId: string) => void;
  maxSelection?: number;
  showDescription?: boolean;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  selectedServices,
  onToggleService,
  maxSelection,
  showDescription = true,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const isSelected = (serviceId: string) => selectedServices.includes(serviceId);
  const isMaxReached = maxSelection ? selectedServices.length >= maxSelection : false;

  const renderService = (service: StreamingService) => {
    const selected = isSelected(service.id);
    const disabled = !selected && isMaxReached;

    return (
      <TouchableOpacity
        key={service.id}
        style={[
          styles.serviceCard,
          selected && styles.serviceCardSelected,
          disabled && styles.serviceCardDisabled,
          {
            borderColor: selected ? service.color : theme.semantic.border.primary,
            backgroundColor: selected ? `${service.color}15` : theme.semantic.background.secondary,
          },
        ]}
        onPress={() => !disabled && onToggleService(service.id)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={styles.serviceContent}>
          {/* Service Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: service.logoUrl }}
              style={styles.logo}
              resizeMode="contain"
            />
            {selected && (
              <View style={[styles.checkmark, { backgroundColor: service.color }]}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </View>

          {/* Service Name */}
          <Text
            style={[
              styles.serviceName,
              { color: selected ? service.color : theme.semantic.text.primary },
            ]}
            numberOfLines={1}
          >
            {service.displayName}
          </Text>

          {/* Description (optional) */}
          {showDescription && (
            <Text
              style={[styles.serviceDescription, { color: theme.semantic.text.secondary }]}
              numberOfLines={2}
            >
              {service.description}
            </Text>
          )}

          {/* VPN Required Badge */}
          {service.vpnRequired && (
            <Chip
              mode="flat"
              style={styles.vpnBadge}
              textStyle={styles.vpnBadgeText}
              compact
            >
              VPN Required
            </Chip>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Selection Counter */}
      {maxSelection && (
        <View style={[styles.counter, { backgroundColor: theme.colors.primary[100] }]}>
          <Text style={[styles.counterText, { color: theme.colors.primary[700] }]}>
            {selectedServices.length} / {maxSelection} selected
          </Text>
        </View>
      )}

      {/* Service Grid */}
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {STREAMING_SERVICES.map(renderService)}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  counter: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius['2xl'],
    alignSelf: 'center',
    marginBottom: theme.spacing[4],
  },
  counterText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
  },
  serviceCard: {
    width: '48%',
    marginBottom: theme.spacing[4],
    borderRadius: theme.borderRadius.xl,
    borderWidth: 2,
    padding: theme.spacing[4],
    ...theme.shadows.md,
  },
  serviceCardSelected: {
    borderWidth: 3,
    ...theme.shadows.lg,
  },
  serviceCardDisabled: {
    opacity: 0.5,
  },
  serviceContent: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    marginBottom: theme.spacing[3],
    position: 'relative',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.lg,
  },
  checkmark: {
    position: 'absolute',
    top: -theme.spacing[1],
    right: -theme.spacing[1],
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  checkmarkText: {
    color: theme.semantic.background.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: 'bold',
  },
  serviceName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    marginBottom: theme.spacing[1],
    textAlign: 'center',
  },
  serviceDescription: {
    fontSize: theme.typography.fontSize.xs,
    textAlign: 'center',
    marginBottom: theme.spacing[2],
    lineHeight: 16,
  },
  vpnBadge: {
    height: 24,
    marginTop: theme.spacing[1],
  },
  vpnBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
  },
});
