/**
 * About Screen
 * Displays app information, version, and credits
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Text, Appbar, Surface, List, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { logger } from '../../utils/logger';
import Constants from 'expo-constants';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

export const AboutScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1';

  const handleOpenUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      logger.error('[AboutScreen] Failed to open URL', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="About" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {/* App Logo and Info */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Icon name="vpn-key" size={64} color={theme.colors.primary[500]} />
          </View>
          <Text style={styles.appName}>GeoLeap</Text>
          <Text style={styles.appTagline}>
            Find and watch content from anywhere in the world
          </Text>
          <Text style={styles.versionText}>
            Version {appVersion} (Build {buildNumber})
          </Text>
        </View>

        {/* About Description */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.description}>
            GeoLeap helps you discover where your favorite movies and TV shows are available to stream.
            Get personalized recommendations for VPN services to access geo-restricted content from around the world.
          </Text>
        </Surface>

        {/* Links Section */}
        <Surface style={styles.linksCard} elevation={1}>
          <List.Item
            title="Privacy Policy"
            left={() => <List.Icon icon="shield-lock" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <Divider />
          <List.Item
            title="Terms of Service"
            left={() => <List.Icon icon="file-document" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('TermsOfService')}
          />
          <Divider />
          <List.Item
            title="Visit Our Website"
            left={() => <List.Icon icon="web" />}
            right={() => <Icon name="open-in-new" size={20} color={theme.semantic.text.tertiary} />}
            onPress={() => handleOpenUrl('https://geoleap.app')}
          />
          <Divider />
          <List.Item
            title="Rate This App"
            left={() => <List.Icon icon="star" />}
            right={() => <Icon name="open-in-new" size={20} color={theme.semantic.text.tertiary} />}
            onPress={() => handleOpenUrl('https://apps.apple.com')}
          />
        </Surface>

        {/* Technical Info */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Technical Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>React Native / Expo</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SDK Version</Text>
            <Text style={styles.infoValue}>{Constants.expoConfig?.sdkVersion || 'N/A'}</Text>
          </View>
        </Surface>

        {/* Credits */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Credits</Text>
          <Text style={styles.creditsText}>
            Built with love using React Native, Expo, and modern mobile technologies.
          </Text>
          <Text style={styles.creditsText}>
            Streaming data powered by JustWatch and other providers.
          </Text>
        </Surface>

        {/* Copyright */}
        <View style={styles.copyrightSection}>
          <Text style={styles.copyrightText}>
            © {new Date().getFullYear()} GeoLeap. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  header: {
    backgroundColor: theme.semantic.background.primary,
  },
  content: {
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[10],
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  appName: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  appTagline: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
  },
  versionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.tertiary,
  },
  card: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[4],
    backgroundColor: theme.semantic.background.secondary,
    marginBottom: theme.spacing[4],
  },
  linksCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    marginBottom: theme.spacing[4],
    overflow: 'hidden',
  },
  description: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    lineHeight: theme.typography.fontSize.base * 1.6,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.semantic.border.primary,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
  },
  creditsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    lineHeight: theme.typography.fontSize.sm * 1.5,
    marginBottom: theme.spacing[2],
  },
  copyrightSection: {
    alignItems: 'center',
    marginTop: theme.spacing[4],
  },
  copyrightText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.tertiary,
  },
});

export default AboutScreen;
