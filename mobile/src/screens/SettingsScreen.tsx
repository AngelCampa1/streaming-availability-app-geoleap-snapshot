/**
 * Settings Screen
 * Full-featured settings screen with navigation to all app settings and info screens
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Appbar, Surface, List, Divider, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { state, logout } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const renderSectionHeader = (title: string, icon: string) => (
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={20} color={theme.colors.primary[500]} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title="Settings" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Account Section */}
        <Surface style={styles.card} elevation={1}>
          {renderSectionHeader('Account', 'person')}

          <List.Item
            title="Profile"
            description="View and edit your profile"
            left={() => <List.Icon icon="account-circle" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('Profile')}
          />
          <Divider />
          <List.Item
            title="Streaming Services"
            description="Manage your subscriptions"
            left={() => <List.Icon icon="subscriptions" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('StreamingServiceSelection', { isOnboarding: false })}
          />
          <Divider />
          <List.Item
            title="Subscription"
            description={(state.user as any)?.subscriptionTier || 'Free'}
            left={() => <List.Icon icon="card-membership" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('SubscriptionPlans')}
          />
          <Divider />
          <List.Item
            title="Payment History"
            description="View past transactions"
            left={() => <List.Icon icon="receipt" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('PaymentHistory')}
          />
        </Surface>

        {/* Security Section */}
        <Surface style={styles.card} elevation={1}>
          {renderSectionHeader('Security', 'security')}

          <List.Item
            title="Two-Factor Authentication"
            description="Add an extra layer of security"
            left={() => <List.Icon icon="lock" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('TwoFactorSetup')}
          />
          <Divider />
          <List.Item
            title="Advanced Security"
            description="Privacy, sessions, and device management"
            left={() => <List.Icon icon="security" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('AdvancedSecurity')}
          />
        </Surface>

        {/* Preferences Section */}
        <Surface style={styles.card} elevation={1}>
          {renderSectionHeader('Preferences', 'tune')}

          <List.Item
            title="Appearance"
            description="Light theme active"
            left={() => <List.Icon icon="brightness-5" />}
          />
          <Divider />
          <List.Item
            title="Notifications"
            description="Manage notification settings"
            left={() => <List.Icon icon="notifications" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('NotificationPreferences')}
          />
          <Divider />
          <List.Item
            title="Notification Center"
            description="View all notifications"
            left={() => <List.Icon icon="inbox" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('NotificationCenter')}
          />
          <Divider />
          <List.Item
            title="Export/Import Preferences"
            description="Backup and restore settings"
            left={() => <List.Icon icon="backup" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('PreferencesManagement')}
          />
        </Surface>

        {/* VPN Section */}
        <Surface style={styles.card} elevation={1}>
          {renderSectionHeader('VPN & Privacy', 'vpn-key')}

          <List.Item
            title="VPN Guidance"
            description="Setup and recommendations"
            left={() => <List.Icon icon="shield" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('VpnGuidance')}
          />
          <Divider />
          <List.Item
            title="VPN Providers"
            description="Compare VPN options"
            left={() => <List.Icon icon="compare" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('VpnProviderComparison', {})}
          />
          <Divider />
          <List.Item
            title="VPN Setup Guide"
            description="Step-by-step setup instructions"
            left={() => <List.Icon icon="school" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('VpnSetupGuide', {})}
          />
          <Divider />
          <List.Item
            title="VPN Effectiveness Test"
            description="Test your VPN connection security"
            left={() => <List.Icon icon="speed" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('VpnEffectivenessTest')}
          />
        </Surface>

        {/* Support Section */}
        <Surface style={styles.card} elevation={1}>
          {renderSectionHeader('Support', 'help')}

          <List.Item
            title="Help & FAQ"
            description="Find answers to common questions"
            left={() => <List.Icon icon="help-circle" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('Help')}
          />
          <Divider />
          <List.Item
            title="Contact Support"
            description="Get help from our team"
            left={() => <List.Icon icon="email" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('Support')}
          />
          <Divider />
          <List.Item
            title="Send Feedback"
            description="Help us improve the app"
            left={() => <List.Icon icon="message" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('Feedback')}
          />
        </Surface>

        {/* About Section */}
        <Surface style={styles.card} elevation={1}>
          {renderSectionHeader('About', 'info')}

          <List.Item
            title="About GeoLeap"
            description="Version, credits, and more"
            left={() => <List.Icon icon="information" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('About')}
          />
          <Divider />
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
        </Surface>

        {/* Sign Out Button */}
        {state.isAuthenticated && (
          <View style={styles.signOutContainer}>
            <Button
              mode="outlined"
              onPress={handleLogout}
              style={styles.signOutButton}
              textColor={theme.colors.error[500]}
              icon="logout"
            >
              Sign Out
            </Button>
          </View>
        )}

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            GeoLeap v1.0.0
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
    elevation: 0,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
  },
  content: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[10],
  },
  card: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    marginBottom: theme.spacing[4],
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[2],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  signOutContainer: {
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  signOutButton: {
    borderColor: theme.colors.error[500],
    borderWidth: 1,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[4],
  },
  versionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.tertiary,
  },
});

export default SettingsScreen;
