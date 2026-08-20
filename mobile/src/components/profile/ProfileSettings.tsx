/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { logger } from '../../utils/logger';

// Define types for image picker to avoid import issues
interface ImagePickerAsset {
  uri?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

interface ImagePickerResponse {
  assets?: ImagePickerAsset[];
  didCancel: boolean;
  errorCode?: string;
  errorMessage?: string;
}

interface MediaType {
  photo: 'photo';
  video: 'video';
  mixed: 'mixed';
}

// Mock react-native-image-picker for test environment
let mockImagePicker: {
  launchImageLibrary: (_options: any, callback: (response: ImagePickerResponse) => void) => void;
  MediaType: MediaType;
};

try {
  // Try to import the real module
  const imagePickerModule = require('react-native-image-picker');
  mockImagePicker = imagePickerModule;
} catch (error) {
  // Create a mock implementation for tests
  mockImagePicker = {
    launchImageLibrary: (_options: any, callback: (response: ImagePickerResponse) => void) => {
      callback({
        assets: [{ uri: 'mock-image-uri' }],
        didCancel: false,
        errorCode: null,
        errorMessage: null,
      });
    },
    MediaType: {
      photo: 'photo',
      video: 'video',
      mixed: 'mixed',
    },
  };
}
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  website?: string;
  birthDate?: string;
  phone?: string;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  publicProfile: boolean;
  showWatchlist: boolean;
  showStats: boolean;
  allowRecommendations: boolean;
}

interface ProfileSettingsProps {
  initialProfile?: UserProfile;
  onSave: (profile: Partial<UserProfile>) => Promise<void>;
  onCancel?: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  initialProfile,
  onSave,
  onCancel,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [profile, setProfile] = useState<Partial<UserProfile>>(
    initialProfile || {
      name: '',
      email: '',
      bio: '',
      avatar: '',
      location: '',
      website: '',
      birthDate: '',
      phone: '',
      publicProfile: false,
      showWatchlist: true,
      showStats: true,
      allowRecommendations: true,
    },
  );

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

const [hasChanges, setHasChanges] = useState(false);

  const handleInputChange = (field: keyof UserProfile, value: string | boolean) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    setHasChanges(true);
  };

  const handleAvatarSelect = () => {
    const _options = {
      mediaType: 'photo' as const,
      includeBase64: false,
      maxHeight: 200,
      maxWidth: 200,
      quality: 0.8,
    };

    mockImagePicker.launchImageLibrary(_options, (response: ImagePickerResponse) => {
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        if (asset.uri) {
          handleInputChange('avatar', asset.uri);
        }
      }
    });
  };

  const validateProfile = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profile.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!profile.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (profile.website && !isValidUrl(profile.website)) {
      newErrors.website = 'Invalid website URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateProfile()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(profile);
      setHasChanges(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
      logger.error('[ProfileSettings] Failed to save profile', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to cancel?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard Changes',
            style: 'destructive',
            onPress: onCancel,
          },
        ],
      );
    } else {
      onCancel?.();
    }
  };

  const renderAvatarSection = () => (
    <Card style={styles.avatarCard}>
      <Text style={styles.sectionTitle}>Profile Picture</Text>

      <View style={styles.avatarContainer}>
        <TouchableOpacity style={styles.avatarButton} onPress={handleAvatarSelect}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.semantic.background.primary }]}>
              <Text style={styles.avatarPlaceholderText}>👤</Text>
              <Text style={styles.avatarPlaceholderSubtext}>Tap to add photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.avatarInfo}>
          <Text style={styles.avatarInfoTitle}>Profile Picture</Text>
          <Text style={styles.avatarInfoText}>
            Add a photo to personalize your profile. Recommended size is 200x200px.
          </Text>
          <Button
            title="Change Photo"
            onPress={handleAvatarSelect}
            variant="outline"
            size="small"
            style={styles.changePhotoButton}
          />
        </View>
      </View>

      {profile.avatar && (
        <TouchableOpacity
          style={styles.removePhotoButton}
          onPress={() => handleInputChange('avatar', '')}
        >
          <Text style={styles.removePhotoText}>Remove Photo</Text>
        </TouchableOpacity>
      )}
    </Card>
  );

  const renderBasicInfo = () => (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>Basic Information</Text>

      <Input
        label="Name"
        value={profile.name || ''}
        onChangeText={(value) => handleInputChange('name', value)}
        error={errors.name}
        placeholder="Enter your name"
        autoCapitalize="words"
      />

      <Input
        label="Email"
        value={profile.email || ''}
        onChangeText={(value) => handleInputChange('email', value)}
        error={errors.email}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Input
        label="Bio"
        value={profile.bio || ''}
        onChangeText={(value) => handleInputChange('bio', value)}
        placeholder="Tell us about yourself"
        multiline
        numberOfLines={3}
        maxLength={500}
      />

      <Input
        label="Location"
        value={profile.location || ''}
        onChangeText={(value) => handleInputChange('location', value)}
        placeholder="City, Country"
        autoCapitalize="words"
      />

      <Input
        label="Website"
        value={profile.website || ''}
        onChangeText={(value) => handleInputChange('website', value)}
        error={errors.website}
        placeholder="https://yourwebsite.com"
        keyboardType="url"
        autoCapitalize="none"
      />

      <Input
        label="Phone"
        value={profile.phone || ''}
        onChangeText={(value) => handleInputChange('phone', value)}
        placeholder="+1 (555) 123-4567"
        keyboardType="phone-pad"
      />

      <Input
        label="Birth Date"
        value={profile.birthDate || ''}
        onChangeText={(value) => handleInputChange('birthDate', value)}
        placeholder="YYYY-MM-DD"
        keyboardType="numeric"
        maxLength={10}
      />
    </Card>
  );

  const renderPrivacySettings = () => (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>Privacy Settings</Text>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Public Profile</Text>
          <Text style={styles.settingDescription}>
            Allow other users to find and view your profile
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.toggle,
            profile.publicProfile ? styles.toggleActive : styles.toggleInactive,
          ]}
          onPress={() => handleInputChange('publicProfile', !profile.publicProfile)}
        >
          <View
            style={[
              styles.toggleSlider,
              profile.publicProfile ? styles.toggleSliderActive : styles.toggleSliderInactive,
            ]}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Show Watchlist</Text>
          <Text style={styles.settingDescription}>
            Display your watchlist on your public profile
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.toggle,
            profile.showWatchlist ? styles.toggleActive : styles.toggleInactive,
          ]}
          onPress={() => handleInputChange('showWatchlist', !profile.showWatchlist)}
        >
          <View
            style={[
              styles.toggleSlider,
              profile.showWatchlist ? styles.toggleSliderActive : styles.toggleSliderInactive,
            ]}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Show Stats</Text>
          <Text style={styles.settingDescription}>
            Share your viewing statistics on your profile
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.toggle,
            profile.showStats ? styles.toggleActive : styles.toggleInactive,
          ]}
          onPress={() => handleInputChange('showStats', !profile.showStats)}
        >
          <View
            style={[
              styles.toggleSlider,
              profile.showStats ? styles.toggleSliderActive : styles.toggleSliderInactive,
            ]}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Allow Recommendations</Text>
          <Text style={styles.settingDescription}>
            Let friends recommend content to you
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.toggle,
            profile.allowRecommendations ? styles.toggleActive : styles.toggleInactive,
          ]}
          onPress={() => handleInputChange('allowRecommendations', !profile.allowRecommendations)}
        >
          <View
            style={[
              styles.toggleSlider,
              profile.allowRecommendations ? styles.toggleSliderActive : styles.toggleSliderInactive,
            ]}
          />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderActions = () => (
    <View style={styles.actionsContainer}>
      <Button
        title="Cancel"
        onPress={handleCancel}
        variant="outline"
        style={styles.cancelButton}
      />

      <Button
        title="Save Changes"
        onPress={handleSave}
        loading={loading}
        disabled={!hasChanges}
        style={Object.assign({},
          styles.saveButton,
          !hasChanges && styles.saveButtonDisabled,
        )}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderAvatarSection()}
      {renderBasicInfo()}
      {renderPrivacySettings()}
      {renderActions()}
    </ScrollView>
  );
};

// Dynamic styles function - receives theme from useTheme() hook
const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  card: {
    margin: theme.spacing[6],
    padding: theme.spacing[6],
  },
  avatarCard: {
    margin: theme.spacing[6],
    padding: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing[6],
    textAlign: 'left',
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  avatarButton: {
    marginRight: theme.spacing[6],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.full,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.semantic.border.primary,
    borderStyle: 'dashed',
  },
  avatarPlaceholderText: {
    fontSize: theme.typography.fontSize['4xl'],
    marginBottom: theme.spacing[1],
  },
  avatarPlaceholderSubtext: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
  },
  avatarInfo: {
    flex: 1,
  },
  avatarInfoTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  avatarInfoText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[4],
  },
  changePhotoButton: {
    alignSelf: 'flex-start',
  },
  removePhotoButton: {
    alignSelf: 'center',
    paddingVertical: theme.spacing[2],
  },
  removePhotoText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error[500],
    fontWeight: '500',
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
    fontWeight: '500',
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
    textAlign: 'left',
  },
  settingDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    textAlign: 'left',
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: theme.borderRadius.full,
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
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.semantic.background.primary,
    shadowColor: theme.colors.neutral?.[900] || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleSliderActive: {
    alignSelf: 'flex-end',
  },
  toggleSliderInactive: {
    alignSelf: 'flex-start',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: theme.spacing[6],
    gap: theme.spacing[4],
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});
