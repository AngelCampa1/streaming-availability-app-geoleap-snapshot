import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  List,
  Switch,
  Button,
  Surface,
  Divider,
  Dialog,
  Portal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { biometricAuth } from '../../services/biometricAuth';
// import { oauthService } from '../../services/oauthService';
import { BiometricType, SecuritySettings, SocialConnection } from '../../types/auth';
import { logger } from '../../utils/logger';

export default function AuthenticationSettingsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { state, enableBiometric, disableBiometric, logout, clearError } = useAuth();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('None');
  const [biometricTypeName, setBiometricTypeName] = useState('Biometric');
  const [isChangingBiometric, setIsChangingBiometric] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    biometricEnabled: false,
    autoLockEnabled: true,
    autoLockTimeout: 5,
    sessionTimeout: 30,
    twoFactorEnabled: false,
  });
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);

  useEffect(() => {
    initializeSettings();
    return () => clearError();
  }, [clearError]);

  useEffect(() => {
    if (state.user) {
      setSecuritySettings(prev => ({
        ...prev,
        biometricEnabled: state.user?.biometricEnabled || false,
        twoFactorEnabled: state.user?.twoFactorEnabled || false,
      }));
      setSocialConnections(state.user?.socialConnections || []);
    }
  }, [state.user]);

  const initializeSettings = async () => {
    try {
      const { available, biometryType } = await biometricAuth.isAvailable();
      setBiometricAvailable(available);
      setBiometricType(biometryType);
      setBiometricTypeName(biometricAuth.getBiometricTypeName(biometryType));
    } catch (error) {
      logger.error('[AuthenticationSettingsScreen] Failed to initialize settings', error);
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (!biometricAvailable) {
      Alert.alert(
        'Not Available',
        'Biometric authentication is not available on this device.',
        [{ text: 'OK' }],
      );
      return;
    }

    try {
      setIsChangingBiometric(true);

      if (enabled) {
        await enableBiometric();
        Alert.alert(
          'Success',
          `${biometricTypeName} authentication has been enabled.`,
          [{ text: 'OK' }],
        );
      } else {
        Alert.alert(
          'Disable Biometric Authentication',
          `Are you sure you want to disable ${biometricTypeName} authentication?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                try {
                  await disableBiometric();
                  Alert.alert(
                    'Disabled',
                    `${biometricTypeName} authentication has been disabled.`,
                    [{ text: 'OK' }],
                  );
                } catch (error) {
                  Alert.alert(
                    'Error',
                    error instanceof Error ? error.message : 'Failed to disable biometric authentication',
                    [{ text: 'OK' }],
                  );
                }
              },
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to change biometric settings',
        [{ text: 'OK' }],
      );
    } finally {
      setIsChangingBiometric(false);
    }
  };

  const handleSocialDisconnect = (provider: string) => {
    Alert.alert(
      'Disconnect Account',
      `Are you sure you want to disconnect your ${provider} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement social disconnect API call
              Alert.alert('Success', `${provider} account has been disconnected.`);
            } catch (error) {
              logger.error('[AuthenticationSettingsScreen] Failed to disconnect account', error);
              Alert.alert('Error', `Failed to disconnect ${provider} account.`);
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    setShowLogoutDialog(false);
    try {
      await logout();
      // BUG-002 FIX: Explicitly reset navigation to Auth screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }] as any,
      });
    } catch (error) {
      logger.error('[AuthenticationSettingsScreen] Logout failed', error);
      Alert.alert(
        'Error',
        'Failed to logout. Please try again.',
        [{ text: 'OK' }],
      );
    }
  };

  const getSocialIcon = (provider: string): string => {
    switch (provider.toLowerCase()) {
      case 'google':
        return 'google';
      case 'apple':
        return 'apple';
      case 'facebook':
        return 'facebook';
      default:
        return 'account';
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.secondary,
    },
    scrollView: {
      flex: 1,
    },
    section: {
      margin: theme.spacing[4],
      marginBottom: theme.spacing[2],
      borderRadius: theme.borderRadius.md,
      elevation: 2,
    },
    sectionTitle: {
      padding: theme.spacing[4],
      paddingBottom: theme.spacing[2],
      fontWeight: 'bold',
    },
    errorContainer: {
      margin: theme.spacing[4],
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.error[50],
    },
    errorText: {
      color: theme.colors.error[500],
      textAlign: 'center',
    },
  }), [theme]);

  return (
    <SafeAreaView  style={styles.container}>
      <ScrollView  style={styles.scrollView}>
        {/* Biometric Authentication Section */}
        <Surface  style={styles.section}>
          <Text variant="titleMedium"  style={styles.sectionTitle}>
            Biometric Authentication
          </Text>

          <List.Item
            title={`${biometricTypeName} Authentication`}
            description={biometricAvailable
              ? `Use ${biometricTypeName.toLowerCase()} to sign in quickly and securely`
              : 'Not available on this device'
            }
            left={() => (
              <List.Icon
                icon={biometricType === 'FaceID' ? 'face-recognition' : 'fingerprint'}
                color={biometricAvailable ? theme.colors.primary[500] : theme.semantic.text.tertiary}
              />
            )}
            right={() => (
              <Switch
                value={state.user?.biometricEnabled || false}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable || isChangingBiometric || state.isLoading}
              />
            )}
            disabled={!biometricAvailable}
          />
        </Surface>

        {/* Security Settings Section */}
        <Surface  style={styles.section}>
          <Text variant="titleMedium"  style={styles.sectionTitle}>
            Security Settings
          </Text>

          <List.Item
            title="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
            left={() => <List.Icon icon="two-factor-authentication" />}
            right={() => (
              <Switch
                value={securitySettings.twoFactorEnabled}
                onValueChange={(value) => {
                  // TODO: Implement 2FA toggle
                  setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: value }));
                }}
                disabled={state.isLoading}
              />
            )}
            onPress={() => {
              // TODO: Navigate to 2FA setup
            }}
          />

          <Divider />

          <List.Item
            title="Auto-Lock"
            description="Automatically lock the app when inactive"
            left={() => <List.Icon icon="lock-clock" />}
            right={() => (
              <Switch
                value={securitySettings.autoLockEnabled}
                onValueChange={(value) => {
                  setSecuritySettings(prev => ({ ...prev, autoLockEnabled: value }));
                }}
              />
            )}
          />

          {securitySettings.autoLockEnabled && (
            <List.Item
              title="Auto-Lock Timeout"
              description={`Lock after ${securitySettings.autoLockTimeout} minutes of inactivity`}
              left={() => <List.Icon icon="timer" />}
              onPress={() => {
                // TODO: Show timeout picker
              }}
            />
          )}
        </Surface>

        {/* Connected Accounts Section */}
        <Surface  style={styles.section}>
          <Text variant="titleMedium"  style={styles.sectionTitle}>
            Connected Accounts
          </Text>

          {socialConnections.length > 0 ? (
            socialConnections.map((connection, index) => (
              <View key={connection.provider}>
                <List.Item
                  title={`${connection.provider.charAt(0).toUpperCase() + connection.provider.slice(1)}`}
                  description={connection.email || connection.displayName || 'Connected'}
                  left={() => (
                    <List.Icon
                      icon={getSocialIcon(connection.provider)}
                      color={theme.colors.primary[500]}
                    />
                  )}
                  right={() => (
                    <Button
                      mode="text"
                      textColor={theme.colors.error[500]}
                      onPress={() => handleSocialDisconnect(connection.provider)}
                      compact
                    >
                      Disconnect
                    </Button>
                  )}
                />
                {index < socialConnections.length - 1 && <Divider />}
              </View>
            ))
          ) : (
            <List.Item
              title="No connected accounts"
              description="Connect social accounts for easy sign-in"
              left={() => <List.Icon icon="account-plus" color={theme.semantic.text.tertiary} />}
              onPress={() => {
                // TODO: Navigate to connect accounts screen
              }}
            />
          )}
        </Surface>

        {/* Account Actions Section */}
        <Surface  style={styles.section}>
          <Text variant="titleMedium"  style={styles.sectionTitle}>
            Account Actions
          </Text>

          <List.Item
            title="Change Password"
            description="Update your account password"
            left={() => <List.Icon icon="lock-reset" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => {
              // TODO: Navigate to change password screen
            }}
          />

          <Divider />

          <List.Item
            title="Privacy Settings"
            description="Manage your privacy preferences"
            left={() => <List.Icon icon="shield-account" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => {
              // TODO: Navigate to privacy settings
            }}
          />

          <Divider />

          <List.Item
            title="Sign Out"
            description="Sign out of your GeoLeap account"
            left={() => <List.Icon icon="logout" color={theme.colors.error[500]} />}
            titleStyle={{ color: theme.colors.error[500] }}
            onPress={handleLogout}
          />
        </Surface>

        {state.error && (
          <Surface  style={styles.errorContainer}>
            <Text variant="bodySmall"  style={styles.errorText}>
              {state.error}
            </Text>
          </Surface>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={showLogoutDialog} onDismiss={() => setShowLogoutDialog(false)}>
          <Dialog.Title>Sign Out</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to sign out of your GeoLeap account?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)}>Cancel</Button>
            <Button onPress={confirmLogout} textColor={theme.colors.error[500]}>
              Sign Out
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}
