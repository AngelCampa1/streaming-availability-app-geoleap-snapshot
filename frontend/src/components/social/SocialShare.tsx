/**
 * Social Share Component
 * Comprehensive social media sharing with platform-specific optimizations
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { SocialPlatform, SocialShareContent, SocialPostRequest, SocialPostResult } from '../../types/social';
import { useSocialAuth } from '../../contexts/SocialAuthContext';
import { getSocialColor } from '../../lib/social-platform-colors';

interface SocialShareProps {
  content: SocialShareContent;
  isOpen: boolean;
  onClose: () => void;
  onShare?: (platform: SocialPlatform, result: SocialPostResult) => void;
  className?: string;
}

interface PlatformShareConfig {
  name: string;
  icon: string;
  color: string;
  maxLength: number;
  supportsImages: boolean;
  supportsHashtags: boolean;
  defaultMessage: (content: SocialShareContent) => string;
}

const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformShareConfig> = {
  [SocialPlatform.Facebook]: {
    name: 'Facebook',
    icon: '📘',
    color: getSocialColor('facebook'),
    maxLength: 63206,
    supportsImages: true,
    supportsHashtags: true,
    defaultMessage: content => `Just watched "${content.title}" - highly recommend! ${content.url}`,
  },
  [SocialPlatform.Twitter]: {
    name: 'Twitter',
    icon: '🐦',
    color: getSocialColor('twitter'),
    maxLength: 280,
    supportsImages: true,
    supportsHashtags: true,
    defaultMessage: content =>
      `Just watched "${content.title}" 🎬 ${
        content.hashtags
          ?.slice(0, 2)
          .map(h => `#${h}`)
          .join(' ') || ''
      } ${content.url}`,
  },
  [SocialPlatform.Instagram]: {
    name: 'Instagram',
    icon: '📷',
    color: getSocialColor('instagram'),
    maxLength: 2200,
    supportsImages: true,
    supportsHashtags: true,
    defaultMessage: content =>
      `${content.description || content.title} 📸\n\n${content.hashtags?.map(h => `#${h}`).join(' ') || ''}\n\n${content.url}`,
  },
  [SocialPlatform.TikTok]: {
    name: 'TikTok',
    icon: '🎵',
    color: getSocialColor('tiktok'),
    maxLength: 150,
    supportsImages: false,
    supportsHashtags: true,
    defaultMessage: content =>
      `${content.title} 🎵 ${
        content.hashtags
          ?.slice(0, 3)
          .map(h => `#${h}`)
          .join(' ') || ''
      }`,
  },
  [SocialPlatform.LinkedIn]: {
    name: 'LinkedIn',
    icon: '💼',
    color: getSocialColor('linkedin'),
    maxLength: 3000,
    supportsImages: true,
    supportsHashtags: true,
    defaultMessage: content =>
      `Highly recommend "${content.title}". ${content.description || 'Great content!'}\n\n${content.url}`,
  },
  [SocialPlatform.YouTube]: {
    name: 'YouTube',
    icon: '📺',
    color: getSocialColor('youtube'),
    maxLength: 5000,
    supportsImages: true,
    supportsHashtags: true,
    defaultMessage: content =>
      `Check out "${content.title}" - ${content.description || 'Amazing content!'}\n\n${content.url}`,
  },
  [SocialPlatform.Discord]: {
    name: 'Discord',
    icon: '🎮',
    color: getSocialColor('discord'),
    maxLength: 2000,
    supportsImages: true,
    supportsHashtags: false,
    defaultMessage: content => `Just watched "${content.title}" - you should check it out! ${content.url}`,
  },
  [SocialPlatform.Twitch]: {
    name: 'Twitch',
    icon: '🎮',
    color: getSocialColor('twitch'),
    maxLength: 500,
    supportsImages: true,
    supportsHashtags: true,
    defaultMessage: content => `Watching "${content.title}" right now! ${content.url}`,
  },
  [SocialPlatform.Reddit]: {
    name: 'Reddit',
    icon: '🔗',
    color: getSocialColor('reddit'),
    maxLength: 40000,
    supportsImages: true,
    supportsHashtags: false,
    defaultMessage: content => `Found this great ${content.type}: "${content.title}" ${content.url}`,
  },
  [SocialPlatform.WhatsApp]: {
    name: 'WhatsApp',
    icon: '💬',
    color: getSocialColor('whatsapp'),
    maxLength: 4096,
    supportsImages: true,
    supportsHashtags: false,
    defaultMessage: content =>
      `Check out "${content.title}" - ${content.description || 'worth watching!'} ${content.url}`,
  },
};

export const SocialShare: React.FC<SocialShareProps> = ({ content, isOpen, onClose, onShare, className = '' }) => {
  const { connections, isProviderConnected, privacySettings, error: authError } = useSocialAuth();

  // State
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<SocialPlatform>>(new Set());
  const [customMessages, setCustomMessages] = useState<Partial<Record<SocialPlatform, string>>>({});
  const [isSharing, setIsSharing] = useState(false);
  const [shareResults, setShareResults] = useState<Partial<Record<SocialPlatform, SocialPostResult>>>({});
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [schedulePost, setSchedulePost] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');

  // Initialize default messages
  useEffect(() => {
    const defaultMessages: Record<SocialPlatform, string> = {} as Record<SocialPlatform, string>;
    Object.values(SocialPlatform).forEach(platform => {
      const config = PLATFORM_CONFIGS[platform];
      defaultMessages[platform] = config.defaultMessage(content);
    });
    setCustomMessages(defaultMessages);
  }, [content]);

  // Get connected platforms
  const _connectedPlatforms = connections.filter(c => c.isTokenValid).map(c => c.platform);

  // Mock API function for sharing (replace with actual API call)
  const shareToAPI = useCallback(
    async (platform: SocialPlatform, _postData: SocialPostRequest): Promise<SocialPostResult> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // Simulate occasional failures
      if (Math.random() < 0.1) {
        throw new Error(`Failed to post to ${platform}`);
      }

      return {
        isSuccess: true,
        postId: `post_${Date.now()}_${platform}`,
        postUrl: `https://${platform}.com/post/${Date.now()}`,
        postedAt: new Date().toISOString(),
      };
    },
    []
  );

  // Handle platform selection
  const handlePlatformToggle = useCallback((platform: SocialPlatform) => {
    setSelectedPlatforms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(platform)) {
        newSet.delete(platform);
      } else {
        newSet.add(platform);
      }
      return newSet;
    });
  }, []);

  // Handle message change
  const handleMessageChange = useCallback((platform: SocialPlatform, message: string) => {
    const config = PLATFORM_CONFIGS[platform];
    if (message.length <= config.maxLength) {
      setCustomMessages(prev => ({
        ...prev,
        [platform]: message,
      }));
    }
  }, []);

  // Handle share
  const handleShare = useCallback(async () => {
    if (selectedPlatforms.size === 0) {
      setError('Please select at least one platform to share to');
      return;
    }

    // Check privacy consent
    if (!privacySettings?.allowSocialDataCollection) {
      setError('Social sharing is disabled in your privacy settings');
      return;
    }

    try {
      setIsSharing(true);
      setError(null);
      setShareResults({});

      const sharePromises = Array.from(selectedPlatforms).map(async platform => {
        try {
          const postData: SocialPostRequest = {
            content: customMessages[platform] || PLATFORM_CONFIGS[platform].defaultMessage(content),
            mediaUrls: content.imageUrl ? [content.imageUrl] : undefined,
            hashtags: content.hashtags,
            platforms: [platform],
            schedulePost,
            scheduledFor: scheduledTime || undefined,
          };

          const result = await shareToAPI(platform, postData);

          setShareResults(prev => ({
            ...prev,
            [platform]: result,
          }));

          onShare?.(platform, result);
          return { platform, result };
        } catch (error) {
          const errorResult: SocialPostResult = {
            isSuccess: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'SHARE_FAILED',
          };

          setShareResults(prev => ({
            ...prev,
            [platform]: errorResult,
          }));

          return { platform, result: errorResult };
        }
      });

      await Promise.all(sharePromises);

      // Check if all shares were successful
      const hasFailures = Object.values(shareResults).some(result => !result.isSuccess);
      if (!hasFailures) {
        // Auto-close on success after a delay
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to share content');
    } finally {
      setIsSharing(false);
    }
  }, [
    selectedPlatforms,
    customMessages,
    content,
    schedulePost,
    scheduledTime,
    shareToAPI,
    onShare,
    onClose,
    privacySettings,
    shareResults,
  ]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedPlatforms(new Set());
      setShareResults({});
      setError(null);
      setSchedulePost(false);
      setScheduledTime('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${className}`}>
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Share Content</h2>
              <p className="text-muted-foreground text-sm mt-1">Share &quot;{content.title}&quot; to your social media accounts</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close share modal">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content preview */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center space-x-4 p-3 bg-muted rounded-lg">
            {content.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.imageUrl}
                alt={content.title}
                className="w-16 h-16 rounded-lg object-cover"
                onError={e => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            )}
            <div className="flex-1">
              <h3 className="font-medium text-foreground">{content.title}</h3>
              {content.description && <p className="text-sm text-muted-foreground mt-1">{content.description}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                {content.type} • {content.url}
              </p>
            </div>
          </div>
        </div>

        {/* Error display */}
        {(error || authError) && (
          <div className="mx-6 mt-4 p-4 bg-error/10 border border-error/20 rounded-lg">
            <div className="flex items-center">
              <span className="text-error mr-2">⚠️</span>
              <p className="text-error text-sm">{error || authError?.message}</p>
              <button onClick={() => setError(null)} className="ml-auto text-error hover:text-error/80">
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="px-6 py-4">
          {/* Platform selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-foreground mb-3">
              Select Platforms ({selectedPlatforms.size} selected)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.values(SocialPlatform).map(platform => {
                const config = PLATFORM_CONFIGS[platform];
                const isConnected = isProviderConnected(platform);
                const isSelected = selectedPlatforms.has(platform);
                const result = shareResults[platform];

                return (
                  <div
                    key={platform}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      isConnected
                        ? isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-muted-foreground'
                        : 'border-border bg-muted cursor-not-allowed opacity-50'
                    }`}
                    onClick={() => isConnected && handlePlatformToggle(platform)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{config.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{config.name}</p>
                        <p className="text-xs text-muted-foreground">{isConnected ? 'Connected' : 'Not connected'}</p>
                      </div>
                      {isConnected && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handlePlatformToggle(platform)}
                          className="rounded border-border text-primary focus:ring-ring"
                        />
                      )}
                      {result && (
                        <span className={`text-sm ${result.isSuccess ? 'text-success' : 'text-error'}`}>
                          {result.isSuccess ? '✓' : '✗'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Message customization */}
          {selectedPlatforms.size > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-foreground mb-3">Customize Messages</h3>
              <div className="space-y-4">
                {Array.from(selectedPlatforms).map(platform => {
                  const config = PLATFORM_CONFIGS[platform];
                  const message = customMessages[platform] || '';
                  const remaining = config.maxLength - message.length;

                  return (
                    <div key={platform} className="border border-border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{config.icon}</span>
                        <span className="font-medium text-sm">{config.name}</span>
                        <span
                          className={`text-xs ${remaining < 0 ? 'text-error' : remaining < 50 ? 'text-warning' : 'text-muted-foreground'}`}
                        >
                          {remaining} characters remaining
                        </span>
                      </div>
                      <textarea
                        value={message}
                        onChange={e => handleMessageChange(platform, e.target.value)}
                        placeholder={`Write your ${config.name} post...`}
                        rows={3}
                        className={`w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground ${
                          remaining < 0 ? 'border-error' : 'border-border'
                        }`}
                      />
                      {config.supportsHashtags && content.hashtags && content.hashtags.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Suggested hashtags:</p>
                          <div className="flex flex-wrap gap-1">
                            {content.hashtags.map(hashtag => (
                              <span
                                key={hashtag}
                                className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded cursor-pointer hover:bg-primary/20"
                                onClick={() => {
                                  const newMessage = message + ` #${hashtag}`;
                                  handleMessageChange(platform, newMessage);
                                }}
                              >
                                #{hashtag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Advanced options */}
          <div className="mb-6">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              {showAdvanced ? '▼' : '▶'} Advanced Options
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 bg-muted rounded-lg">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="schedule-post"
                      checked={schedulePost}
                      onChange={e => setSchedulePost(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-ring"
                    />
                    <label htmlFor="schedule-post" className="text-sm font-medium text-foreground">
                      Schedule post for later
                    </label>
                  </div>

                  {schedulePost && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Schedule for:</label>
                      <input
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={e => setScheduledTime(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Share results */}
          {Object.keys(shareResults).length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-foreground mb-3">Share Results</h3>
              <div className="space-y-2">
                {Object.entries(shareResults).map(([platform, result]) => (
                  <div
                    key={platform}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      result.isSuccess ? 'bg-success/10 border border-success/20' : 'bg-error/10 border border-error/20'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{PLATFORM_CONFIGS[platform as SocialPlatform].icon}</span>
                      <span className="font-medium text-sm">{PLATFORM_CONFIGS[platform as SocialPlatform].name}</span>
                    </div>
                    <div className="text-sm">
                      {result.isSuccess ? (
                        <span className="text-success">✓ Posted successfully</span>
                      ) : (
                        <span className="text-error">✗ {result.errorMessage}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={selectedPlatforms.size === 0 || isSharing}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSharing
                ? 'Sharing...'
                : `Share to ${selectedPlatforms.size} platform${selectedPlatforms.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialShare;
