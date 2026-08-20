/**
 * Region Preferences Screen
 * Onboarding step for users to select their primary and secondary regions
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, ProgressBar, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OnboardingStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'RegionPreferences'>;

interface Region {
  code: string;
  name: string;
  flag: string;
  popular?: boolean;
}

const REGIONS: Region[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', popular: true },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', popular: true },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', popular: true },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', popular: true },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', popular: true },
  { code: 'FR', name: 'France', flag: '🇫🇷', popular: true },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', popular: true },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
];

export const RegionPreferencesScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [primaryRegion, setPrimaryRegion] = useState<string | null>(null);
  const [secondaryRegions, setSecondaryRegions] = useState<string[]>([]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const popularRegions = REGIONS.filter(r => r.popular);
  const otherRegions = REGIONS.filter(r => !r.popular);

  const handleSelectPrimary = (code: string) => {
    if (primaryRegion === code) {
      setPrimaryRegion(null);
    } else {
      setPrimaryRegion(code);
      // Remove from secondary if it was there
      setSecondaryRegions(prev => prev.filter(c => c !== code));
    }
  };

  const handleToggleSecondary = (code: string) => {
    if (code === primaryRegion) return; // Can't select primary as secondary

    setSecondaryRegions(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : prev.length < 5 ? [...prev, code] : prev
    );
  };

  const handleContinue = () => {
    // TODO: Save preferences via API
    navigation.navigate('GenrePreferences');
  };

  const handleSkip = () => {
    navigation.navigate('GenrePreferences');
  };

  const renderRegionItem = (region: Region, isPrimarySelection: boolean) => {
    const isSelected = isPrimarySelection
      ? primaryRegion === region.code
      : secondaryRegions.includes(region.code);
    const isPrimary = region.code === primaryRegion;

    return (
      <TouchableOpacity
        key={region.code}
        style={[
          styles.regionItem,
          isSelected && styles.regionItemSelected,
          !isPrimarySelection && isPrimary && styles.regionItemDisabled,
        ]}
        onPress={() => isPrimarySelection
          ? handleSelectPrimary(region.code)
          : handleToggleSecondary(region.code)
        }
        disabled={!isPrimarySelection && isPrimary}
        activeOpacity={0.7}
      >
        <Text style={styles.flag}>{region.flag}</Text>
        <Text style={[
          styles.regionName,
          isSelected && styles.regionNameSelected,
        ]}>
          {region.name}
        </Text>
        {isSelected && (
          <Icon
            name="check-circle"
            size={20}
            color={theme.colors.primary[500]}
          />
        )}
        {!isPrimarySelection && isPrimary && (
          <Chip mode="flat" compact style={styles.primaryChip}>Primary</Chip>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={0.6}
          color={theme.colors.primary[500]}
          style={styles.progressBar}
        />
        <Text style={styles.progressText}>Step 3 of 5</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Where do you want to watch?
          </Text>
          <Text style={styles.subtitle}>
            Select your primary region and additional regions you're interested in. We'll show content availability for these locations.
          </Text>
        </View>

        {/* Primary Region Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="star" size={20} color={theme.colors.warning[500]} />
            <Text style={styles.sectionTitle}>Primary Region</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Your main location for content availability
          </Text>
          <View style={styles.regionGrid}>
            {popularRegions.map(region => renderRegionItem(region, true))}
          </View>
        </View>

        {/* Secondary Regions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="public" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.sectionTitle}>
              Additional Regions ({secondaryRegions.length}/5)
            </Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Other regions you'd like to see content for (VPN recommended)
          </Text>
          <View style={styles.regionGrid}>
            {REGIONS.map(region => renderRegionItem(region, false))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.actions}>
        <Button
          mode="text"
          onPress={handleSkip}
          style={styles.skipButton}
        >
          Skip
        </Button>
        <Button
          mode="contained"
          onPress={handleContinue}
          style={styles.continueButton}
          disabled={!primaryRegion}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[3],
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.semantic.background.secondary,
  },
  progressText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    marginTop: theme.spacing[2],
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[5],
  },
  header: {
    marginBottom: theme.spacing[6],
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    lineHeight: theme.typography.fontSize.base * 1.5,
  },
  section: {
    marginBottom: theme.spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
  },
  sectionSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[3],
  },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderWidth: 2,
    borderColor: 'transparent',
    gap: theme.spacing[2],
  },
  regionItemSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  regionItemDisabled: {
    opacity: 0.5,
  },
  flag: {
    fontSize: 20,
  },
  regionName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
  },
  regionNameSelected: {
    color: theme.colors.primary[700],
  },
  primaryChip: {
    height: 20,
    backgroundColor: theme.colors.warning[100],
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.semantic.border.primary,
    gap: theme.spacing[3],
  },
  skipButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
});

export default RegionPreferencesScreen;
