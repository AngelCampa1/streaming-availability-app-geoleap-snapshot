/**
 * Regional Availability Component
 * Shows which countries have access to content with VPN indicators
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Text, Surface, Button, Chip, Divider, IconButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';

interface RegionInfo {
  countryCode: string;
  countryName: string;
  flag: string;
  services: string[];
  vpnRequired: boolean;
}

interface RegionalAvailabilityProps {
  regions: RegionInfo[];
  userCountry?: string;
  onRegionPress?: (region: RegionInfo) => void;
  onVpnSetupPress?: (region: RegionInfo) => void;
  maxVisible?: number;
}

// Country flags and names
const COUNTRY_DATA: Record<string, { name: string; flag: string }> = {
  US: { name: 'United States', flag: '🇺🇸' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  FR: { name: 'France', flag: '🇫🇷' },
  IT: { name: 'Italy', flag: '🇮🇹' },
  ES: { name: 'Spain', flag: '🇪🇸' },
  JP: { name: 'Japan', flag: '🇯🇵' },
  KR: { name: 'South Korea', flag: '🇰🇷' },
  BR: { name: 'Brazil', flag: '🇧🇷' },
  MX: { name: 'Mexico', flag: '🇲🇽' },
  IN: { name: 'India', flag: '🇮🇳' },
  NL: { name: 'Netherlands', flag: '🇳🇱' },
  SE: { name: 'Sweden', flag: '🇸🇪' },
  NO: { name: 'Norway', flag: '🇳🇴' },
  DK: { name: 'Denmark', flag: '🇩🇰' },
  FI: { name: 'Finland', flag: '🇫🇮' },
  PL: { name: 'Poland', flag: '🇵🇱' },
  RU: { name: 'Russia', flag: '🇷🇺' },
  AR: { name: 'Argentina', flag: '🇦🇷' },
  CL: { name: 'Chile', flag: '🇨🇱' },
  CO: { name: 'Colombia', flag: '🇨🇴' },
  NZ: { name: 'New Zealand', flag: '🇳🇿' },
  SG: { name: 'Singapore', flag: '🇸🇬' },
  HK: { name: 'Hong Kong', flag: '🇭🇰' },
  TW: { name: 'Taiwan', flag: '🇹🇼' },
  TH: { name: 'Thailand', flag: '🇹🇭' },
  MY: { name: 'Malaysia', flag: '🇲🇾' },
  ID: { name: 'Indonesia', flag: '🇮🇩' },
  PH: { name: 'Philippines', flag: '🇵🇭' },
  VN: { name: 'Vietnam', flag: '🇻🇳' },
  ZA: { name: 'South Africa', flag: '🇿🇦' },
  AE: { name: 'United Arab Emirates', flag: '🇦🇪' },
  SA: { name: 'Saudi Arabia', flag: '🇸🇦' },
  IL: { name: 'Israel', flag: '🇮🇱' },
  TR: { name: 'Turkey', flag: '🇹🇷' },
  CZ: { name: 'Czech Republic', flag: '🇨🇿' },
  AT: { name: 'Austria', flag: '🇦🇹' },
  CH: { name: 'Switzerland', flag: '🇨🇭' },
  BE: { name: 'Belgium', flag: '🇧🇪' },
  PT: { name: 'Portugal', flag: '🇵🇹' },
  IE: { name: 'Ireland', flag: '🇮🇪' },
  GR: { name: 'Greece', flag: '🇬🇷' },
};

export const getCountryInfo = (code: string) => {
  return COUNTRY_DATA[code.toUpperCase()] || { name: code, flag: '🌍' };
};

export const RegionalAvailability: React.FC<RegionalAvailabilityProps> = ({
  regions,
  userCountry = 'US',
  onRegionPress,
  onVpnSetupPress,
  maxVisible = 5,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showAllModal, setShowAllModal] = useState(false);

  // Sort regions: user's country first, then available regions, then VPN required
  const sortedRegions = useMemo(() => {
    return [...regions].sort((a, b) => {
      // User's country first
      if (a.countryCode === userCountry) return -1;
      if (b.countryCode === userCountry) return 1;
      // Then available without VPN
      if (!a.vpnRequired && b.vpnRequired) return -1;
      if (a.vpnRequired && !b.vpnRequired) return 1;
      // Then by number of services
      return b.services.length - a.services.length;
    });
  }, [regions, userCountry]);

  const visibleRegions = sortedRegions.slice(0, maxVisible);
  const hasMore = sortedRegions.length > maxVisible;

  const renderRegionItem = (region: RegionInfo, isCompact = false) => {
    const isUserCountry = region.countryCode === userCountry;

    return (
      <TouchableOpacity
        key={region.countryCode}
        style={[
          styles.regionItem,
          isUserCountry && styles.userCountryItem,
          isCompact && styles.regionItemCompact,
        ]}
        onPress={() => onRegionPress?.(region)}
        activeOpacity={0.7}
      >
        <View style={styles.regionHeader}>
          <Text style={styles.flag}>{region.flag}</Text>
          <View style={styles.regionInfo}>
            <View style={styles.regionNameRow}>
              <Text
                style={[styles.regionName, isUserCountry && styles.userCountryText]}
                numberOfLines={1}
              >
                {region.countryName}
              </Text>
              {isUserCountry && (
                <Chip
                  mode="flat"
                  compact
                  style={styles.yourLocationChip}
                  textStyle={styles.yourLocationText}
                >
                  You
                </Chip>
              )}
            </View>
            <Text style={styles.serviceCount}>
              {region.services.length} service{region.services.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.regionStatus}>
            {region.vpnRequired ? (
              <View style={styles.vpnBadge}>
                <Icon name="vpn-key" size={14} color={theme.colors.warning[600]} />
                <Text style={styles.vpnText}>VPN</Text>
              </View>
            ) : (
              <Icon name="check-circle" size={20} color={theme.colors.success[500]} />
            )}
          </View>
        </View>

        {region.vpnRequired && onVpnSetupPress && (
          <Button
            mode="contained-tonal"
            compact
            onPress={() => onVpnSetupPress(region)}
            style={styles.vpnButton}
            icon="shield-key"
          >
            Setup VPN for {region.countryName}
          </Button>
        )}
      </TouchableOpacity>
    );
  };

  if (regions.length === 0) {
    return (
      <Surface style={styles.emptyContainer} elevation={1}>
        <Icon name="public-off" size={48} color={theme.semantic.text.tertiary} />
        <Text style={styles.emptyText}>No regional availability data</Text>
      </Surface>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="public" size={20} color={theme.colors.primary[500]} />
        <Text style={styles.title}>
          Available in {regions.length} {regions.length === 1 ? 'country' : 'countries'}
        </Text>
      </View>

      <Surface style={styles.regionsList} elevation={1}>
        {visibleRegions.map((region) => renderRegionItem(region))}

        {hasMore && (
          <TouchableOpacity
            style={styles.showMoreButton}
            onPress={() => setShowAllModal(true)}
          >
            <Text style={styles.showMoreText}>
              +{sortedRegions.length - maxVisible} more countries
            </Text>
            <Icon name="chevron-right" size={20} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        )}
      </Surface>

      {/* Full Countries Modal */}
      <Modal
        visible={showAllModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAllModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Available Countries</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setShowAllModal(false)}
            />
          </View>
          <Divider />
          <FlatList
            data={sortedRegions}
            keyExtractor={(item) => item.countryCode}
            renderItem={({ item }) => renderRegionItem(item, true)}
            contentContainerStyle={styles.modalList}
            ItemSeparatorComponent={() => <Divider />}
          />
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      marginVertical: theme.spacing[2],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
      marginBottom: theme.spacing[3],
    },
    title: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
    },
    regionsList: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.semantic.background.secondary,
      overflow: 'hidden',
    },
    regionItem: {
      padding: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    },
    regionItemCompact: {
      paddingVertical: theme.spacing[2],
    },
    userCountryItem: {
      backgroundColor: theme.colors.primary[50],
    },
    regionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    flag: {
      fontSize: 24,
      marginRight: theme.spacing[3],
    },
    regionInfo: {
      flex: 1,
    },
    regionNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
    },
    regionName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.semantic.text.primary,
    },
    userCountryText: {
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary[700],
    },
    yourLocationChip: {
      height: 20,
      backgroundColor: theme.colors.primary[500],
    },
    yourLocationText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.inverse,
    },
    serviceCount: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      marginTop: 2,
    },
    regionStatus: {
      marginLeft: theme.spacing[2],
    },
    vpnBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.warning[100],
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.md,
      gap: 4,
    },
    vpnText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.warning[700],
    },
    vpnButton: {
      marginTop: theme.spacing[2],
    },
    showMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing[3],
      gap: theme.spacing[1],
    },
    showMoreText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.primary[500],
    },
    emptyContainer: {
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[6],
      alignItems: 'center',
      backgroundColor: theme.semantic.background.secondary,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.secondary,
      marginTop: theme.spacing[2],
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.semantic.background.primary,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[2],
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.semantic.text.primary,
    },
    modalList: {
      paddingBottom: theme.spacing[10],
    },
  });

export default RegionalAvailability;
