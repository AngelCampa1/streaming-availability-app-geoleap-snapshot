import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';

import { useTheme } from '../../hooks/useTheme';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface AccountSettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  autoPlay: boolean;
  defaultQuality: 'auto' | 'low' | 'medium' | 'high' | 'ultra';
  downloadQuality: 'low' | 'medium' | 'high';
  cellularDownloads: boolean;
  subtitlesEnabled: boolean;
  defaultLanguage: string;
}

interface AccountSettingsProps {
  initialSettings?: Partial<AccountSettings>;
  onSave: (settings: Partial<AccountSettings>) => Promise<void>;
  onChangePassword?: (oldPassword: string, newPassword: string) => Promise<void>;
  onEnable2FA?: () => Promise<void>;
  onDisable2FA?: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  initialSettings,
  onSave,
  onChangePassword,
  onEnable2FA,
  onDisable2FA,
  onDeleteAccount,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [settings, setSettings] = useState<Partial<AccountSettings>>(
    initialSettings || {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      twoFactorEnabled: false,
      sessionTimeout: 30,
      autoPlay: true,
      defaultQuality: 'auto',
      downloadQuality: 'medium',
      cellularDownloads: false,
      subtitlesEnabled: true,
      defaultLanguage: 'en',
    },
  );

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

const [hasChanges, setHasChanges] = useState(false);

  const handleInputChange = (field: keyof AccountSettings, value: string | boolean | number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    setHasChanges(true);
  };

  const validatePasswordChange = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!settings.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!settings.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (settings.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!settings.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (settings.newPassword !== settings.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordChange()) {
      return;
    }

    setPasswordLoading(true);
    try {
      await onChangePassword?.(settings.currentPassword!, settings.newPassword!);
      Alert.alert('Success', 'Password changed successfully!');
      setSettings(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error) {
      Alert.alert('Error', 'Failed to change password. Please check your current password and try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(settings);
      setHasChanges(false);
      Alert.alert('Success', 'Account settings updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update account settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAChange = async () => {
    if (settings.twoFactorEnabled) {
      // Disable 2FA
      Alert.alert(
        'Disable Two-Factor Authentication',
        'Are you sure you want to disable 2FA? This will make your account less secure.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              try {
                await onDisable2FA?.();
                handleInputChange('twoFactorEnabled', false);
                Alert.alert('Success', '2FA has been disabled.');
              } catch (error) {
                Alert.alert('Error', 'Failed to disable 2FA.');
              }
            },
          },
        ],
      );
    } else {
      // Enable 2FA
      try {
        await onEnable2FA?.();
        handleInputChange('twoFactorEnabled', true);
        Alert.alert('Success', '2FA has been enabled. Please check your email for setup instructions.');
      } catch (error) {
        Alert.alert('Error', 'Failed to enable 2FA.');
      }
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDeleteAccount?.();
              Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please contact support.');
            }
          },
        },
      ],
    );
  };

  const renderPasswordSection = () => (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>Change Password</Text>

      {/* BUG-022 FIX: Wrap password inputs with proper accessibility attributes */}
      <View
        accessible={true}
        accessibilityLabel="Change password form"
      >
        <Input
          label="Current Password"
          value={settings.currentPassword || ''}
          onChangeText={(value) => handleInputChange('currentPassword', value)}
          error={errors.currentPassword}
          placeholder="Enter current password"
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />

        <Input
          label="New Password"
          value={settings.newPassword || ''}
          onChangeText={(value) => handleInputChange('newPassword', value)}
          error={errors.newPassword}
          placeholder="Enter new password (min 8 characters)"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <Input
          label="Confirm New Password"
          value={settings.confirmPassword || ''}
          onChangeText={(value) => handleInputChange('confirmPassword', value)}
          error={errors.confirmPassword}
          placeholder="Confirm new password"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
      </View>

        <Button
          title="Change Password"
          onPress={handleChangePassword}
          loading={passwordLoading}
          disabled={!settings.currentPassword || !settings.newPassword || !settings.confirmPassword}
          style={styles.changePasswordButton}
          accessibilityRole="button"
          accessibilityLabel="Change password"
          accessibilityHint="Submit new password after filling all fields"
        />

      <View style={styles.passwordRequirements}>
        <Text style={styles.requirementsTitle}>Password Requirements:</Text>
        <Text style={styles.requirementText}>• At least 8 characters long</Text>
        <Text style={styles.requirementText}>• Contains uppercase and lowercase letters</Text>
        <Text style={styles.requirementText}>• Contains at least one number</Text>
        <Text style={styles.requirementText}>• Contains at least one special character</Text>
      </View>
    </Card>
  );

  const renderNotificationSettings = () => (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>Notification Preferences</Text>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Email Notifications</Text>
          <Text style={styles.settingDescription}>
            Receive updates about your account via email
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.toggle,
            settings.emailNotifications ? styles.toggleActive : styles.toggleInactive,
          ]}
          onPress={() => handleInputChange('emailNotifications', !settings.emailNotifications)}
        >
          <View
            style={[
              styles.toggleSlider,
              settings.emailNotifications ? styles.toggleSliderActive : styles.toggleSliderInactive,
            ]}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Push Notifications</Text>
          <Text style={styles.settingDescription}>
            Receive push notifications on your device
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.toggle,
            settings.pushNotifications ? styles.toggleActive : styles.toggleInactive,
          ]}
          onPress={() => handleInputChange('pushNotifications', !settings.pushNotifications)}
        >
          <View
            style={[
              styles.toggleSlider,
              settings.pushNotifications ? styles.toggleSliderActive : styles.toggleSliderInactive,
            ]}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Marketing Emails</Text>
          <Text style={styles.settingDescription}>
            Receive promotional offers and updates
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.toggle,
            settings.marketingEmails ? styles.toggleActive : styles.toggleInactive,
          ]}
          onPress={() => handleInputChange('marketingEmails', !settings.marketingEmails)}
        >
          <View
            style={[
              styles.toggleSlider,
              settings.marketingEmails ? styles.toggleSliderActive : styles.toggleSliderInactive,
            ]}
          />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderSecuritySettings = () => (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>Security</Text>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
          <Text style={styles.settingDescription}>
            Add an extra layer of security to your account
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.toggle,
            settings.twoFactorEnabled ? styles.toggleActive : styles.toggleInactive,
          ]}
          onPress={handle2FAChange}
        >
          <View
            style={[
              styles.toggleSlider,
              settings.twoFactorEnabled ? styles.toggleSliderActive : styles.toggleSliderInactive,
            ]}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Session Timeout</Text>
          <Text style={styles.settingDescription}>
            Automatically log out after inactivity
          </Text>
        </View>
        <View style={styles.timeoutButtons}>
          {[15, 30, 60, 120].map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.timeoutButton,
                settings.sessionTimeout === minutes && styles.timeoutButtonActive,
              ]}
              onPress={() => handleInputChange('sessionTimeout', minutes)}
            >
              <Text
                style={[
                  styles.timeoutButtonText,
                  settings.sessionTimeout === minutes && styles.timeoutButtonTextActive,
                ]}
              >
                {minutes}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Card>
  );

  const renderPlaybackSettings = () => (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>Playback Preferences</Text>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Auto-Play Next Episode</Text>
          <Text style={styles.settingDescription}>
            Automatically play the next episode in a series
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.toggle,
            settings.autoPlay ? styles.toggleActive : styles.toggleInactive,
          ]}
          onPress={() => handleInputChange('autoPlay', !settings.autoPlay)}
        >
          <View
            style={[
              styles.toggleSlider,
              settings.autoPlay ? styles.toggleSliderActive : styles.toggleSliderInactive,
            ]}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Default Video Quality</Text>
          <Text style={styles.settingDescription}>
            Preferred streaming quality
          </Text>
        </View>
        <View style={styles.qualityButtons}>
          {['auto', 'low', 'medium', 'high', 'ultra'].map((quality) => (
            <TouchableOpacity
              key={quality}
              style={[
                styles.qualityButton,
                settings.defaultQuality === quality && styles.qualityButtonActive,
              ]}
              onPress={() => handleInputChange('defaultQuality', quality as any)}
            >
              <Text
                style={[
                  styles.qualityButtonText,
                  settings.defaultQuality === quality && styles.qualityButtonTextActive,
                ]}
              >
                {quality.charAt(0).toUpperCase() + quality.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Download Quality</Text>
          <Text style={styles.settingDescription}>
            Quality for offline downloads
          </Text>
        </View>
        <View style={styles.qualityButtons}>
          {['low', 'medium', 'high'].map((quality) => (
            <TouchableOpacity
              key={quality}
              style={[
                styles.qualityButton,
                settings.downloadQuality === quality && styles.qualityButtonActive,
              ]}
              onPress={() => handleInputChange('downloadQuality', quality as any)}
            >
              <Text
                style={[
                  styles.qualityButtonText,
                  settings.downloadQuality === quality && styles.qualityButtonTextActive,
                ]}
              >
                {quality.charAt(0).toUpperCase() + quality.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Cellular Downloads</Text>
          <Text style={styles.settingDescription}>
            Allow downloads using cellular data
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.toggle,
            settings.cellularDownloads ? styles.toggleActive : styles.toggleInactive,
          ]}
          onPress={() => handleInputChange('cellularDownloads', !settings.cellularDownloads)}
        >
          <View
            style={[
              styles.toggleSlider,
              settings.cellularDownloads ? styles.toggleSliderActive : styles.toggleSliderInactive,
            ]}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Subtitles</Text>
          <Text style={styles.settingDescription}>
            Show subtitles by default
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.toggle,
            settings.subtitlesEnabled ? styles.toggleActive : styles.toggleInactive,
          ]}
          onPress={() => handleInputChange('subtitlesEnabled', !settings.subtitlesEnabled)}
        >
          <View
            style={[
              styles.toggleSlider,
              settings.subtitlesEnabled ? styles.toggleSliderActive : styles.toggleSliderInactive,
            ]}
          />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderDangerZone = () => (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>Danger Zone</Text>

      <View style={styles.dangerItem}>
        <View style={styles.dangerInfo}>
          <Text style={styles.dangerTitle}>Delete Account</Text>
          <Text style={styles.dangerDescription}>
            Permanently delete your account and all associated data
          </Text>
        </View>
        <Button
          title="Delete Account"
          onPress={handleDeleteAccount}
          variant="outline"
          size="small"
          style={styles.dangerButton}
        />
      </View>

      <View style={styles.dangerItem}>
        <View style={styles.dangerInfo}>
          <Text style={styles.dangerTitle}>Export Data</Text>
          <Text style={styles.dangerDescription}>
            Download a copy of your personal data
          </Text>
        </View>
        <Button
          title="Export Data"
          onPress={() => Linking.openURL('mailto:support@geoleap.com')}
          variant="outline"
          size="small"
        />
      </View>
    </Card>
  );

  const renderActions = () => (
    <View style={styles.actionsContainer}>
      <Button
        title="Save Settings"
        onPress={handleSave}
        loading={loading}
        disabled={!hasChanges}
        style={styles.saveButton}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderPasswordSection()}
      {renderNotificationSettings()}
      {renderSecuritySettings()}
      {renderPlaybackSettings()}
      {renderDangerZone()}
      {renderActions()}
    </ScrollView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  card: {
    margin: theme.spacing[6],
    padding: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing[6],
  },
  changePasswordButton: {
    marginTop: theme.spacing[4],
  },
  passwordRequirements: {
    marginTop: theme.spacing[6],
    padding: theme.spacing[4],
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.borderRadius.sm,
  },
  requirementsTitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing[2],
  },
  requirementText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[1],
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.semantic.border.secondary,
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing[4],
  },
  settingTitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing[1],
  },
  settingDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary[500],
  },
  toggleInactive: {
    backgroundColor: theme.semantic.background.tertiary,
  },
  toggleSlider: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: theme.semantic.background.primary,
    ...theme.shadows.sm,
  },
  toggleSliderActive: {
    alignSelf: 'flex-end',
  },
  toggleSliderInactive: {
    alignSelf: 'flex-start',
  },
  timeoutButtons: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  timeoutButton: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.semantic.background.secondary,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
  },
  timeoutButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  timeoutButtonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.primary,
    fontWeight: '500',
  },
  timeoutButtonTextActive: {
    color: theme.semantic.background.primary,
  },
  qualityButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  qualityButton: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.semantic.background.secondary,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
  },
  qualityButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  qualityButtonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.primary,
    fontWeight: '500',
  },
  qualityButtonTextActive: {
    color: theme.semantic.background.primary,
  },
  dangerZone: {
    backgroundColor: theme.colors.error[50],
    borderColor: theme.colors.error[200],
    borderWidth: 1,
  },
  dangerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.error[200],
  },
  dangerInfo: {
    flex: 1,
    marginRight: theme.spacing[4],
  },
  dangerTitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error[500],
    fontWeight: '600',
    marginBottom: theme.spacing[1],
  },
  dangerDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  dangerButton: {
    borderColor: theme.colors.error[500],
  },
  actionsContainer: {
    padding: theme.spacing[6],
  },
  saveButton: {
    marginBottom: theme.spacing[8],
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});
