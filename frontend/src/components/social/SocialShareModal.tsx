'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import { X, Settings, Eye, EyeOff } from 'lucide-react';
import { LegacySocialShareButton } from './SocialShareButton';

export interface SocialShareModalProps {
  // Add compatibility with test props
  contentId?: string;
  contentTitle?: string;
  contentDescription?: string;
  contentImage?: string;
  onShareSuccess?: (data: any) => void;
  onShareError?: (error: any) => void;
  // Existing props
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  contentType?: string;
  onShare?: (platform: string, success: boolean, customMessage?: string) => void;
}

const platforms = ['facebook', 'twitter', 'instagram', 'whatsapp', 'linkedin', 'telegram', 'tiktok', 'copy'] as const;

export function SocialShareModal({
  isOpen,
  onClose,
  url,
  title,
  description = '',
  imageUrl,
  contentType = 'content',
  contentId = '',
  contentTitle,
  contentDescription,
  contentImage,
  onShareSuccess,
  onShareError,
  onShare,
}: SocialShareModalProps) {
  // Handle both prop styles for compatibility
  const modalTitle = title || contentTitle || '';
  const modalDescription = description || contentDescription || '';
  const modalImage = imageUrl || contentImage || '';
  const _modalContentId = contentId || '';

  const _handleShareComplete = (platform: string, success: boolean, customMessage?: string) => {
    if (success) {
      onShareSuccess?.({
        platform,
        shareUrl: url,
      });
    } else {
      onShareError?.({
        platform,
        error: 'Share failed',
      });
    }
    onShare?.(platform, success, customMessage);
  };
  const [customMessage, setCustomMessage] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    trackAnalytics: true,
    shareUserInfo: false,
    enableLocation: false,
  });

  // Initialize custom message with title and description
  useEffect(() => {
    if (isOpen) {
      setCustomMessage(`${modalTitle}${modalDescription ? ` - ${modalDescription}` : ''}`);
      const defaultMessage = description ? `${title}: ${description}` : title;
      setCustomMessage(defaultMessage);

      // Auto-generate hashtags based on content type
      const autoHashtags = [];
      if (contentType === 'movie') autoHashtags.push('movie', 'streaming');
      if (contentType === 'tv_show') autoHashtags.push('tvshow', 'streaming');
      autoHashtags.push('GeoLeap', 'StreamingAvailability');
      setHashtags(autoHashtags);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, title, description, contentType]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleShare = (platform: string, success: boolean) => {
    if (success) {
      // Track the share event with custom message
      onShare?.(platform, success, customMessage);
    }
  };

  const addHashtag = (hashtag: string) => {
    if (hashtag.trim() && !hashtags.includes(hashtag.trim())) {
      setHashtags([...hashtags, hashtag.trim()]);
    }
  };

  const removeHashtag = (index: number) => {
    setHashtags(hashtags.filter((_, i) => i !== index));
  };

  const handleHashtagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      addHashtag(target.value);
      target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 id="modal-title" className="text-2xl font-bold text-foreground">
            Share Content
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Preview Toggle */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Share Options</h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2 px-3 py-1 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="text-sm">Preview</span>
            </button>
          </div>

          {/* Preview Card */}
          {showPreview && (
            <div className="bg-muted rounded-lg p-4 border border-border">
              <div className="flex space-x-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {modalImage && <img src={modalImage} alt={modalTitle} className="w-24 h-24 object-cover rounded-lg" />}
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{modalTitle}</h4>
                  <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{modalDescription}</p>
                  <p className="text-primary text-sm mt-2 truncate">{url}</p>
                </div>
              </div>
            </div>
          )}

          {/* Custom Message */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Custom Message</label>
            <textarea
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring resize-none bg-background text-foreground"
              rows={3}
              maxLength={280}
              placeholder="Add your personal message..."
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Customize your message before sharing</span>
              <span>{customMessage.length}/280</span>
            </div>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Hashtags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {hashtags.map((hashtag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary text-sm rounded-lg"
                >
                  #{hashtag}
                  <button onClick={() => removeHashtag(index)} className="ml-1 hover:text-primary">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              onKeyDown={handleHashtagKeyPress}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
              placeholder="Add hashtags (press Enter, Space, or comma to add)"
            />
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3">
            <div className="flex items-center">
              <Settings size={16} className="mr-2" />
              <span className="text-sm font-medium text-foreground">Privacy Settings</span>
            </div>
            <div className="space-y-2 ml-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={privacySettings.trackAnalytics}
                  onChange={e =>
                    setPrivacySettings({
                      ...privacySettings,
                      trackAnalytics: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-sm text-muted-foreground">Enable analytics tracking</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={privacySettings.shareUserInfo}
                  onChange={e =>
                    setPrivacySettings({
                      ...privacySettings,
                      shareUserInfo: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-sm text-muted-foreground">Include my profile info</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={privacySettings.enableLocation}
                  onChange={e =>
                    setPrivacySettings({
                      ...privacySettings,
                      enableLocation: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-sm text-muted-foreground">Share location data</span>
              </label>
            </div>
          </div>

          {/* Platform Buttons */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Choose Platform</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {platforms
                .filter(platform => platform !== 'tiktok')
                .map(platform => (
                  <LegacySocialShareButton
                    key={platform}
                    platform={
                      platform as
                        | 'facebook'
                        | 'twitter'
                        | 'instagram'
                        | 'whatsapp'
                        | 'linkedin'
                        | 'telegram'
                        | 'copy'
                        | 'native'
                    }
                    url={url}
                    title={customMessage || modalTitle}
                    description={modalDescription}
                    hashtags={hashtags}
                    variant="full"
                    size="medium"
                    onShare={handleShare}
                    className="w-full"
                  />
                ))}
            </div>
          </div>

          {/* Native Share */}
          <div className="pt-4 border-t">
            <LegacySocialShareButton
              platform="native"
              url={url}
              title={customMessage || title}
              description={description}
              variant="full"
              size="large"
              onShare={handleShare}
              className="w-full"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Sharing helps others discover great content. Your privacy settings will be respected.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SocialShareModal;
