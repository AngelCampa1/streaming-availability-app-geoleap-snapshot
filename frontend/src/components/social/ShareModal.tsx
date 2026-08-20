'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Share2, Check, Edit3 } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import ShareButton from './ShareButton';
import { ShareModalProps, SOCIAL_PLATFORMS, SocialSharingPreferences } from '../../lib/types/social-sharing';
import {
  getUserSharingPreferences,
  updateUserSharingPreferences,
  canUseWebShare,
  isMobileDevice,
} from '../../lib/social-sharing-api';

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  contentId,
  contentType,
  contentTitle,
  contentDescription,
  contentImage,
  customMessage: initialCustomMessage,
  onShareComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'share' | 'settings'>('share');
  const [customMessage, setCustomMessage] = useState(initialCustomMessage || '');
  const [preferences, setPreferences] = useState<SocialSharingPreferences | null>(null);
  const [_isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<{ platform: string; success: boolean } | null>(null);

  // Platform categories for better UX
  const primaryPlatforms = ['facebook', 'twitter', 'whatsapp', 'linkedin'];
  const socialPlatforms = ['instagram', 'tiktok', 'pinterest', 'reddit'];
  const messagingPlatforms = ['telegram', 'discord'];

  // Load user preferences
  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadPreferences = async () => {
    try {
      setIsLoadingPreferences(true);
      const userPrefs = await getUserSharingPreferences();
      setPreferences(userPrefs);

      // Set default message if none provided
      if (!initialCustomMessage && !customMessage) {
        const defaultMessage = `Check out this amazing ${contentType}: "${contentTitle}" - I found it on GeoLeap!`;
        setCustomMessage(defaultMessage);
      }
    } catch (error) {
      console.error('Failed to load sharing preferences:', error);
      // Use default preferences
      setPreferences({
        allowSocialSharing: true,
        shareWithPersonalInfo: false,
        allowShareAnalytics: true,
        autoGenerateHashtags: true,
      });
    } finally {
      setIsLoadingPreferences(false);
    }
  };

  const updatePreferences = async (updates: Partial<SocialSharingPreferences>) => {
    if (!preferences) return;

    try {
      const updatedPrefs = await updateUserSharingPreferences({ ...preferences, ...updates });
      setPreferences(updatedPrefs);
    } catch (error) {
      console.error('Failed to update sharing preferences:', error);
    }
  };

  const handleShareComplete = useCallback(
    (platform: string, success: boolean) => {
      setShareSuccess({ platform, success });
      setTimeout(() => setShareSuccess(null), 3000);
      onShareComplete?.(platform, success);
    },
    [onShareComplete]
  );

  const generateSuggestedMessage = () => {
    const suggestions = [
      `Just discovered "${contentTitle}" on GeoLeap! 🎬 This looks amazing!`,
      `Found the perfect ${contentType} to watch: "${contentTitle}" 📺`,
      `"${contentTitle}" - adding this to my watchlist! Found on @GeoLeap`,
      `You need to see this! "${contentTitle}" looks incredible 🔥`,
      `Binge-worthy alert! "${contentTitle}" discovered on GeoLeap ✨`,
    ];

    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    setCustomMessage(randomSuggestion);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Share2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Share Content</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab Navigation */}
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setActiveTab('share')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  activeTab === 'share'
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Share
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Settings
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {activeTab === 'share' && (
            <div className="p-4 space-y-6">
              {/* Content Preview */}
              <div className="flex gap-4 p-4 bg-muted rounded-lg">
                {contentImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={contentImage} alt={contentTitle} className="w-16 h-24 object-cover rounded" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{contentTitle}</h3>
                  {contentDescription && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{contentDescription}</p>
                  )}
                  <span className="text-xs text-muted-foreground mt-2 block capitalize">{contentType}</span>
                </div>
              </div>

              {/* Custom Message */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="share-message" className="text-sm font-medium">
                    Customize your message
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateSuggestedMessage}
                    className="text-xs text-primary hover:text-primary/90"
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    Generate
                  </Button>
                </div>
                <Textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Add your personal message..."
                  className="min-h-[80px]"
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground text-right">{customMessage.length}/500 characters</div>
              </div>

              {/* Mobile Native Share */}
              {canUseWebShare() && isMobileDevice() && (
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-primary">Quick Share</h4>
                      <p className="text-sm text-primary/80">Use your device&apos;s native share menu</p>
                    </div>
                    <ShareButton
                      contentId={contentId}
                      contentType={contentType}
                      contentTitle={contentTitle}
                      contentImage={contentImage}
                      customMessage={customMessage}
                      onShareComplete={handleShareComplete}
                      size="sm"
                    />
                  </div>
                </div>
              )}

              {/* Primary Platforms */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  Popular Platforms
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {primaryPlatforms.map(platformKey => {
                    const platform = SOCIAL_PLATFORMS[platformKey];
                    if (!platform) return null;

                    return (
                      <ShareButton
                        key={platformKey}
                        contentId={contentId}
                        contentType={contentType}
                        contentTitle={contentTitle}
                        contentImage={contentImage}
                        platform={platformKey}
                        customMessage={customMessage}
                        onShareComplete={handleShareComplete}
                        className="justify-start"
                      />
                    );
                  })}
                </div>
              </div>

              {/* Social Media Platforms */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  Social Media
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {socialPlatforms.map(platformKey => {
                    const platform = SOCIAL_PLATFORMS[platformKey];
                    if (!platform) return null;

                    return (
                      <ShareButton
                        key={platformKey}
                        contentId={contentId}
                        contentType={contentType}
                        contentTitle={contentTitle}
                        contentImage={contentImage}
                        platform={platformKey}
                        customMessage={customMessage}
                        onShareComplete={handleShareComplete}
                        className="justify-start"
                      />
                    );
                  })}
                </div>
              </div>

              {/* Messaging Platforms */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 bg-success rounded-full"></span>
                  Messaging
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {messagingPlatforms.map(platformKey => {
                    const platform = SOCIAL_PLATFORMS[platformKey];
                    if (!platform) return null;

                    return (
                      <ShareButton
                        key={platformKey}
                        contentId={contentId}
                        contentType={contentType}
                        contentTitle={contentTitle}
                        contentImage={contentImage}
                        platform={platformKey}
                        customMessage={customMessage}
                        onShareComplete={handleShareComplete}
                        className="justify-start"
                      />
                    );
                  })}
                </div>
              </div>

              {/* Copy Link */}
              <div className="pt-4 border-t border-border">
                <ShareButton
                  contentId={contentId}
                  contentType={contentType}
                  contentTitle={contentTitle}
                  contentImage={contentImage}
                  customMessage={customMessage}
                  onShareComplete={handleShareComplete}
                  variant="minimal"
                  className="w-full justify-center"
                />
              </div>
            </div>
          )}

          {activeTab === 'settings' && preferences && (
            <div className="p-4 space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Privacy & Preferences</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Allow Social Sharing</Label>
                      <p className="text-sm text-muted-foreground">Enable sharing content to social media platforms</p>
                    </div>
                    <Switch
                      checked={preferences.allowSocialSharing}
                      onCheckedChange={checked => updatePreferences({ allowSocialSharing: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Include Personal Info</Label>
                      <p className="text-sm text-muted-foreground">Add your name and profile to shared content</p>
                    </div>
                    <Switch
                      checked={preferences.shareWithPersonalInfo}
                      onCheckedChange={checked => updatePreferences({ shareWithPersonalInfo: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Share Analytics</Label>
                      <p className="text-sm text-muted-foreground">Allow tracking of share performance and clicks</p>
                    </div>
                    <Switch
                      checked={preferences.allowShareAnalytics}
                      onCheckedChange={checked => updatePreferences({ allowShareAnalytics: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Auto-Generate Hashtags</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically add relevant hashtags to your shares
                      </p>
                    </div>
                    <Switch
                      checked={preferences.autoGenerateHashtags}
                      onCheckedChange={checked => updatePreferences({ autoGenerateHashtags: checked })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success Message */}
        {shareSuccess && (
          <div className="fixed bottom-4 right-4 bg-success/10 border border-success/20 text-success px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Check className="w-4 h-4" />
            {shareSuccess.success
              ? `Shared on ${SOCIAL_PLATFORMS[shareSuccess.platform]?.displayName || shareSuccess.platform}!`
              : 'Share failed - please try again'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
