/**
 * Social Privacy Settings Component
 * GDPR-compliant privacy controls for social media features
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { UpdateSocialPreferencesRequest, SocialPlatform } from '../../types/social';
import { useSocialAuth } from '../../contexts/SocialAuthContext';
import { Switch } from '@/components/ui/switch';
import { logger } from '@/lib/logger';

interface SocialPrivacySettingsProps {
  onClose?: () => void;
  className?: string;
}

interface PrivacySection {
  id: keyof UpdateSocialPreferencesRequest;
  title: string;
  description: string;
  gdprCategory: string;
  lawfulBasis: string;
  consequences: string;
  icon: string;
}

const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'allowSocialSharing',
    title: 'Social Sharing',
    description: 'Allow sharing your activity and content to connected social media platforms',
    gdprCategory: 'Performance and Functionality',
    lawfulBasis: 'Consent (Art. 6(1)(a) GDPR)',
    consequences: 'Without this, you cannot share content to social media platforms',
    icon: '📤',
  },
  {
    id: 'allowFriendDiscovery',
    title: 'Friend Discovery',
    description: 'Use your social connections to find friends who are also using our platform',
    gdprCategory: 'Social Features',
    lawfulBasis: 'Consent (Art. 6(1)(a) GDPR)',
    consequences: 'Without this, you cannot see which of your social media friends are using our platform',
    icon: '👥',
  },
  {
    id: 'allowRecommendations',
    title: 'Social Recommendations',
    description: 'Use your social connections and activity to provide personalized content recommendations',
    gdprCategory: 'Analytics and Personalization',
    lawfulBasis: 'Consent (Art. 6(1)(a) GDPR)',
    consequences: 'Without this, recommendations will be based only on your direct activity',
    icon: '🎯',
  },
  {
    id: 'allowActivityTracking',
    title: 'Activity Tracking',
    description: 'Track your social media interactions to improve recommendations and show activity feeds',
    gdprCategory: 'Analytics and Personalization',
    lawfulBasis: 'Consent (Art. 6(1)(a) GDPR)',
    consequences: 'Without this, we cannot show you activity feeds or improve recommendations based on social activity',
    icon: '📊',
  },
];

const PLATFORM_SETTINGS = {
  [SocialPlatform.Facebook]: {
    name: 'Facebook',
    icon: '📘',
    permissions: ['public_profile', 'email', 'user_friends', 'user_posts'],
  },
  [SocialPlatform.Twitter]: {
    name: 'Twitter',
    icon: '🐦',
    permissions: ['read', 'write', 'users.read', 'tweet.read'],
  },
  [SocialPlatform.Instagram]: {
    name: 'Instagram',
    icon: '📷',
    permissions: ['user_profile', 'user_media'],
  },
  [SocialPlatform.TikTok]: {
    name: 'TikTok',
    icon: '🎵',
    permissions: ['user.info.basic', 'video.list'],
  },
  [SocialPlatform.LinkedIn]: {
    name: 'LinkedIn',
    icon: '💼',
    permissions: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
  },
  [SocialPlatform.YouTube]: {
    name: 'YouTube',
    icon: '📺',
    permissions: ['youtube.readonly', 'youtube.upload'],
  },
};

export const SocialPrivacySettings: React.FC<SocialPrivacySettingsProps> = ({ onClose, className = '' }) => {
  const { privacySettings, connections, updatePrivacySettings, isLoading, error, clearError } = useSocialAuth();

  // Local state for form
  const [formData, setFormData] = useState<UpdateSocialPreferencesRequest>({
    allowSocialSharing: true,
    allowFriendDiscovery: false,
    allowRecommendations: true,
    allowActivityTracking: false,
    preferredPlatforms: [],
    platformSettings: {},
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Initialize form data from privacy settings
  useEffect(() => {
    if (privacySettings) {
      setFormData({
        allowSocialSharing: privacySettings.allowSocialDataCollection,
        allowFriendDiscovery: privacySettings.allowFriendDiscovery,
        allowRecommendations: privacySettings.allowSocialRecommendations,
        allowActivityTracking: privacySettings.allowActivityTracking,
        preferredPlatforms: connections.filter(c => c.isTokenValid).map(c => c.platform),
        platformSettings: {},
      });
    }
  }, [privacySettings, connections]);

  // Handle form field changes
  const handleFieldChange = useCallback((field: keyof UpdateSocialPreferencesRequest, value: boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  }, []);

  // Handle platform preference toggle
  const handlePlatformToggle = useCallback(
    (platform: SocialPlatform) => {
      const connectedPlatforms = connections.filter(c => c.isTokenValid).map(c => c.platform);

      if (!connectedPlatforms.includes(platform)) {
        return; // Can't select disconnected platforms
      }

      setFormData(prev => {
        const currentPreferred = prev.preferredPlatforms || [];
        const isCurrentlySelected = currentPreferred.includes(platform);

        return {
          ...prev,
          preferredPlatforms: isCurrentlySelected
            ? currentPreferred.filter(p => p !== platform)
            : [...currentPreferred, platform],
        };
      });
      setHasChanges(true);
    },
    [connections]
  );

  // Save settings
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      clearError();

      await updatePrivacySettings(formData);
      setHasChanges(false);

      // Show success message
      logger.info('[SocialPrivacySettings] Privacy settings saved successfully');
    } catch (error) {
      logger.error('[SocialPrivacySettings] Failed to save privacy settings', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsSaving(false);
    }
  }, [formData, updatePrivacySettings, clearError]);

  // Reset to original settings
  const handleReset = useCallback(() => {
    if (privacySettings) {
      setFormData({
        allowSocialSharing: privacySettings.allowSocialDataCollection,
        allowFriendDiscovery: privacySettings.allowFriendDiscovery,
        allowRecommendations: privacySettings.allowSocialRecommendations,
        allowActivityTracking: privacySettings.allowActivityTracking,
        preferredPlatforms: connections.filter(c => c.isTokenValid).map(c => c.platform),
        platformSettings: {},
      });
      setHasChanges(false);
    }
  }, [privacySettings, connections]);

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSection(prev => (prev === sectionId ? null : sectionId));
  }, []);

  // Export user data (GDPR right to portability)
  const handleExportData = useCallback(async () => {
    try {
      // This would call an API endpoint to export user's social data
      logger.info('[SocialPrivacySettings] Exporting social data');
      // Implementation would download a JSON file with user's data
    } catch (error) {
      logger.error('[SocialPrivacySettings] Failed to export data', { error: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  // Delete user data (GDPR right to erasure)
  const handleDeleteData = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete all your social data? This action cannot be undone.')) {
      try {
        // This would call an API endpoint to delete user's social data
        logger.info('[SocialPrivacySettings] Deleting social data');
        // Implementation would delete all social connections and data
      } catch (error) {
        logger.error('[SocialPrivacySettings] Failed to delete data', { error: error instanceof Error ? error.message : String(error) });
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className={`social-privacy-settings loading ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`social-privacy-settings ${className}`}>
      <div className="bg-card rounded-lg shadow-lg max-w-4xl mx-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Privacy Settings</h2>
              <p className="text-muted-foreground mt-1">Control how your social media data is used (GDPR Compliant)</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close privacy settings"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-error/10 border border-error/20 rounded-lg">
            <div className="flex items-center">
              <span className="text-error mr-2">⚠️</span>
              <div>
                <p className="text-error font-medium">Error</p>
                <p className="text-error text-sm">{error.message}</p>
              </div>
              <button onClick={clearError} className="ml-auto text-error hover:text-error/80">
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="px-6 py-4">
          {/* Privacy Controls */}
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">🔒 Data Usage Permissions</h3>

            {PRIVACY_SECTIONS.map(section => (
              <div key={section.id} className="border border-border rounded-lg">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{section.icon}</span>
                      <div>
                        <h4 className="font-medium text-foreground">{section.title}</h4>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Switch
                        checked={formData[section.id] as boolean}
                        onCheckedChange={(val) => handleFieldChange(section.id, val)}
                        aria-label={`Toggle ${section.title}`}
                      />
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Show details for ${section.title}`}
                      >
                        {expandedSection === section.id ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedSection === section.id && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-foreground mb-1">GDPR Category:</p>
                          <p className="text-muted-foreground">{section.gdprCategory}</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground mb-1">Lawful Basis:</p>
                          <p className="text-muted-foreground">{section.lawfulBasis}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="font-medium text-foreground mb-1">Consequences of Withdrawal:</p>
                          <p className="text-muted-foreground">{section.consequences}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Platform Preferences */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">📱 Platform Preferences</h3>
            <p className="text-muted-foreground mb-4">
              Choose which connected platforms to use for sharing and recommendations
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(PLATFORM_SETTINGS).map(([platform, config]) => {
                const isConnected = connections.some(c => c.platform === platform && c.isTokenValid);
                const isSelected = formData.preferredPlatforms?.includes(platform as SocialPlatform);

                return (
                  <div
                    key={platform}
                    className={`border rounded-lg p-4 ${
                      isConnected ? 'border-border bg-card' : 'border-border bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                          <h4 className="font-medium text-foreground">{config.name}</h4>
                          <p className="text-sm text-muted-foreground">{isConnected ? 'Connected' : 'Not connected'}</p>
                        </div>
                      </div>
                      <Switch
                        checked={isSelected}
                        disabled={!isConnected}
                        onCheckedChange={() => handlePlatformToggle(platform as SocialPlatform)}
                        aria-label={`Toggle ${config.name}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GDPR Rights */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">⚖️ Your Rights (GDPR)</h3>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-primary text-sm mb-4">
                Under GDPR, you have the right to access, rectify, erase, restrict processing, data portability, and
                object to processing of your personal data.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleExportData}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
                >
                  📥 Export My Data
                </button>
                <button
                  onClick={handleDeleteData}
                  className="px-4 py-2 bg-error text-white rounded-md hover:bg-error/90 text-sm"
                >
                  🗑️ Delete My Data
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="mb-8">
            <div className="bg-muted border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Privacy Notice</h4>
              <p className="text-foreground text-sm mb-2">
                Last updated:{' '}
                {privacySettings?.updatedAt ? new Date(privacySettings.updatedAt).toLocaleDateString() : 'Unknown'}
              </p>
              <p className="text-foreground text-sm">
                Your data is processed in accordance with GDPR. For more information, see our{' '}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">{hasChanges && '• You have unsaved changes'}</div>
            <div className="flex space-x-3">
              <button
                onClick={handleReset}
                disabled={!hasChanges || isSaving}
                className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted disabled:opacity-50"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialPrivacySettings;
