/**
 * Advanced Security Settings Screen
 * Privacy settings, session management, device tracking, and login notifications
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Appbar, Surface, Switch, List, Divider, Button, RadioButton, Dialog, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'AdvancedSecurity'>;

interface SecuritySettings {
  // Privacy Settings
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  personalizedAdsEnabled: boolean;
  shareUsageData: boolean;

  // Session Settings
  sessionTimeout: '15min' | '30min' | '1hr' | '4hr' | 'never';
  autoLockEnabled: boolean;
  requireBiometricOnResume: boolean;

  // Device Tracking
  trustedDevicesEnabled: boolean;
  deviceFingerprintEnabled: boolean;
  locationTrackingEnabled: boolean;

  // Login Notifications
  emailOnNewLogin: boolean;
  pushOnNewLogin: boolean;
  emailOnPasswordChange: boolean;
  emailOnSecurityChange: boolean;
}

interface ActiveSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export const AdvancedSecurityScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [settings, setSettings] = useState<SecuritySettings>({
    analyticsEnabled: true,
    crashReportingEnabled: true,
    personalizedAdsEnabled: false,
    shareUsageData: false,
    sessionTimeout: '1hr',
    autoLockEnabled: false,
    requireBiometricOnResume: false,
    trustedDevicesEnabled: true,
    deviceFingerprintEnabled: true,
    locationTrackingEnabled: false,
    emailOnNewLogin: true,
    pushOnNewLogin: true,
    emailOnPasswordChange: true,
    emailOnSecurityChange: true,
  });

  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const [showSessionsDialog, setShowSessionsDialog] = useState(false);
  const [activeSessions] = useState<ActiveSession[]>([
    {
      id: '1',
      device: 'iPhone 15 Pro',
      location: 'New York, US',
      lastActive: 'Now',
      isCurrent: true,
    },
    {
      id: '2',
      device: 'MacBook Pro',
      location: 'New York, US',
      lastActive: '2 hours ago',
      isCurrent: false,
    },
    {
      id: '3',
      device: 'Chrome on Windows',
      location: 'Los Angeles, US',
      lastActive: '1 day ago',
      isCurrent: false,
    },
  ]);

  const updateSetting = useCallback(<K extends keyof SecuritySettings>(
    key: K,
    value: SecuritySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleRevokeSession = useCallback((sessionId: string) => {
    Alert.alert(
      'Revoke Session',
      'Are you sure you want to log out this device? They will need to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            // TODO: Call API to revoke session
            Alert.alert('Session Revoked', 'The device has been logged out.');
          },
        },
      ]
    );
  }, []);

  const handleRevokeAllSessions = useCallback(() => {
    Alert.alert(
      'Revoke All Sessions',
      'This will log you out from all devices except this one. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke All',
          style: 'destructive',
          onPress: () => {
            // TODO: Call API to revoke all sessions
            Alert.alert('Sessions Revoked', 'All other devices have been logged out.');
          },
        },
      ]
    );
  }, []);

  const getTimeoutLabel = (timeout: string): string => {
    const labels: Record<string, string> = {
      '15min': '15 minutes',
      '30min': '30 minutes',
      '1hr': '1 hour',
      '4hr': '4 hours',
      'never': 'Never',
    };
    return labels[timeout] || timeout;
  };

  const renderSectionHeader = (title: string, icon: string, description?: string) => (
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={24} color={theme.colors.primary[500]} />
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description && <Text style={styles.sectionDescription}>{description}</Text>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Security & Privacy" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Privacy Settings */}
        <Surface style={styles.section} elevation={1}>
          {renderSectionHeader('Privacy Settings', 'privacy-tip', 'Control how your data is collected and used')}
          <Divider style={styles.divider} />

          <List.Item
            title="Analytics"
            description="Help improve the app with usage data"
            left={() => <List.Icon icon="analytics" />}
            right={() => (
              <Switch
                value={settings.analyticsEnabled}
                onValueChange={(v) => updateSetting('analyticsEnabled', v)}
                color={theme.colors.primary[500]}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Crash Reporting"
            description="Send crash reports to help fix bugs"
            left={() => <List.Icon icon="bug-report" />}
            right={() => (
              <Switch
                value={settings.crashReportingEnabled}
                onValueChange={(v) => updateSetting('crashReportingEnabled', v)}
                color={theme.colors.primary[500]}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Personalized Recommendations"
            description="Use viewing history for suggestions"
            left={() => <List.Icon icon="recommend" />}
            right={() => (
              <Switch
                value={settings.personalizedAdsEnabled}
                onValueChange={(v) => updateSetting('personalizedAdsEnabled', v)}
                color={theme.colors.primary[500]}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Share Usage Data"
            description="Share anonymized data with partners"
            left={() => <List.Icon icon="share" />}
            right={() => (
              <Switch
                value={settings.shareUsageData}
                onValueChange={(v) => updateSetting('shareUsageData', v)}
                color={theme.colors.primary[500]}
              />
            )}
          />
        </Surface>

        {/* Session Settings */}
        <Surface style={styles.section} elevation={1}>
          {renderSectionHeader('Session Security', 'access-time', 'Manage automatic logout and session behavior')}
          <Divider style={styles.divider} />

          <List.Item
            title="Session Timeout"
            description={`Auto logout after ${getTimeoutLabel(settings.sessionTimeout)}`}
            left={() => <List.Icon icon="timer" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => setShowTimeoutDialog(true)}
          />
          <Divider />
          <List.Item
            title="Auto-Lock App"
            description="Lock app when switching away"
            left={() => <List.Icon icon="lock-outline" />}
            right={() => (
              <Switch
                value={settings.autoLockEnabled}
                onValueChange={(v) => updateSetting('autoLockEnabled', v)}
                color={theme.colors.primary[500]}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Biometric on Resume"
            description="Require Face ID/fingerprint when returning"
            left={() => <List.Icon icon="fingerprint" />}
            right={() => (
              <Switch
                value={settings.requireBiometricOnResume}
                onValueChange={(v) => updateSetting('requireBiometricOnResume', v)}
                color={theme.colors.primary[500]}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Active Sessions"
            description={`${activeSessions.length} devices logged in`}
            left={() => <List.Icon icon="devices" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => setShowSessionsDialog(true)}
          />
        </Surface>

        {/* Device Tracking */}
        <Surface style={styles.section} elevation={1}>
          {renderSectionHeader('Device Security', 'devices', 'Manage trusted devices and tracking')}
          <Divider style={styles.divider} />

          <List.Item
            title="Trusted Devices"
            description="Remember devices for faster login"
            left={() => <List.Icon icon="verified-user" />}
            right={() => (
              <Switch
                value={settings.trustedDevicesEnabled}
                onValueChange={(v) => updateSetting('trustedDevicesEnabled', v)}
                color={theme.colors.primary[500]}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Device Fingerprinting"
            description="Use device info for security checks"
            left={() => <List.Icon icon="fingerprint" />}
            right={() => (
              <Switch
                value={settings.deviceFingerprintEnabled}
                onValueChange={(v) => updateSetting('deviceFingerprintEnabled', v)}
                color={theme.colors.primary[500]}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Location-Based Security"
            description="Alert on logins from new locations"
            left={() => <List.Icon icon="location-on" />}
            right={() => (
              <Switch
                value={settings.locationTrackingEnabled}
                onValueChange={(v) => updateSetting('locationTrackingEnabled', v)}
                color={theme.colors.primary[500]}
              />
            )}
          />
        </Surface>

        {/* Login Notifications */}
        <Surface style={styles.section} elevation={1}>
          {renderSectionHeader('Login Alerts', 'notifications', 'Get notified about account activity')}
          <Divider style={styles.divider} />

          <List.Item
            title="Email on New Login"
            description="Receive email when logging in from new device"
            left={() => <List.Icon icon="email" />}
            right={() => (
              <Switch
                value={settings.emailOnNewLogin}
                onValueChange={(v) => updateSetting('emailOnNewLogin', v)}
                color={theme.colors.primary[500]}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Push on New Login"
            description="Receive push notification on new login"
            left={() => <List.Icon icon="notifications-active" />}
            right={() => (
              <Switch
                value={settings.pushOnNewLogin}
                onValueChange={(v) => updateSetting('pushOnNewLogin', v)}
                color={theme.colors.primary[500]}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Password Change Alert"
            description="Email when password is changed"
            left={() => <List.Icon icon="lock" />}
            right={() => (
              <Switch
                value={settings.emailOnPasswordChange}
                onValueChange={(v) => updateSetting('emailOnPasswordChange', v)}
                color={theme.colors.primary[500]}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Security Settings Alert"
            description="Email when security settings change"
            left={() => <List.Icon icon="security" />}
            right={() => (
              <Switch
                value={settings.emailOnSecurityChange}
                onValueChange={(v) => updateSetting('emailOnSecurityChange', v)}
                color={theme.colors.primary[500]}
              />
            )}
          />
        </Surface>

        {/* Danger Zone */}
        <Surface style={styles.dangerSection} elevation={1}>
          {renderSectionHeader('Account Actions', 'warning', 'Sensitive account operations')}
          <Divider style={styles.divider} />

          <Button
            mode="outlined"
            onPress={handleRevokeAllSessions}
            textColor={theme.colors.error[500]}
            style={styles.dangerButton}
            icon="logout"
          >
            Log Out All Devices
          </Button>
        </Surface>
      </ScrollView>

      {/* Session Timeout Dialog */}
      <Portal>
        <Dialog visible={showTimeoutDialog} onDismiss={() => setShowTimeoutDialog(false)}>
          <Dialog.Title>Session Timeout</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => updateSetting('sessionTimeout', value as SecuritySettings['sessionTimeout'])}
              value={settings.sessionTimeout}
            >
              {['15min', '30min', '1hr', '4hr', 'never'].map((option) => (
                <RadioButton.Item
                  key={option}
                  label={getTimeoutLabel(option)}
                  value={option}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowTimeoutDialog(false)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Active Sessions Dialog */}
      <Portal>
        <Dialog visible={showSessionsDialog} onDismiss={() => setShowSessionsDialog(false)} style={styles.sessionsDialog}>
          <Dialog.Title>Active Sessions</Dialog.Title>
          <Dialog.ScrollArea style={styles.sessionsScrollArea}>
            <ScrollView>
              {activeSessions.map((session) => (
                <View key={session.id} style={styles.sessionItem}>
                  <View style={styles.sessionInfo}>
                    <Icon
                      name={session.device.includes('iPhone') ? 'phone-iphone' : session.device.includes('Mac') ? 'laptop-mac' : 'computer'}
                      size={32}
                      color={session.isCurrent ? theme.colors.primary[500] : theme.semantic.text.secondary}
                    />
                    <View style={styles.sessionDetails}>
                      <Text style={styles.sessionDevice}>
                        {session.device}
                        {session.isCurrent && (
                          <Text style={styles.currentBadge}> (This device)</Text>
                        )}
                      </Text>
                      <Text style={styles.sessionMeta}>
                        {session.location} • {session.lastActive}
                      </Text>
                    </View>
                  </View>
                  {!session.isCurrent && (
                    <Button
                      mode="text"
                      textColor={theme.colors.error[500]}
                      onPress={() => handleRevokeSession(session.id)}
                      compact
                    >
                      Revoke
                    </Button>
                  )}
                </View>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowSessionsDialog(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[10],
    gap: theme.spacing[4],
  },
  section: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[3],
    padding: theme.spacing[4],
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  sectionDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    lineHeight: 18,
  },
  divider: {
    marginBottom: theme.spacing[2],
  },
  dangerSection: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.error[200],
  },
  dangerButton: {
    borderColor: theme.colors.error[500],
    marginTop: theme.spacing[3],
  },
  sessionsDialog: {
    maxHeight: '70%',
  },
  sessionsScrollArea: {
    paddingHorizontal: 0,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.semantic.border.primary,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    flex: 1,
  },
  sessionDetails: {
    flex: 1,
  },
  sessionDevice: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  currentBadge: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.normal,
  },
  sessionMeta: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
});

export default AdvancedSecurityScreen;
