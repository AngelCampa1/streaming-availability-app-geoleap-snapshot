'use client';

import React, { useState, useCallback } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { ShareButtonProps, ShareStatus, SOCIAL_PLATFORMS } from '../../lib/types/social-sharing';
import {
  generateShareLink,
  updateShareStatus,
  getPlatformShareUrl,
  canUseWebShare,
  nativeWebShare,
  trackShareEvent,
  isMobileDevice,
} from '../../lib/social-sharing-api';

export const ShareButton: React.FC<ShareButtonProps> = ({
  contentId,
  contentType,
  contentTitle,
  contentImage,
  platform,
  showText = true,
  size = 'md',
  variant = 'default',
  className = '',
  onShareStart,
  onShareComplete,
  customMessage,
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (isSharing) return;

    setIsSharing(true);
    onShareStart?.(platform || 'generic');

    try {
      // If no specific platform and Web Share API is available, use native sharing
      if (!platform && canUseWebShare()) {
        await nativeWebShare({
          title: `Check out: ${contentTitle}`,
          text: customMessage || `I found this great ${contentType} on GeoLeap!`,
          url: window.location.href,
        });
        onShareComplete?.(platform || 'native', true);
        return;
      }

      // Generate share link
      const shareRequest = {
        contentId,
        contentType,
        platform: platform || 'generic',
        customMessage,
        includePersonalInfo: false,
        trackAnalytics: true,
      };

      const shareResponse = await generateShareLink(shareRequest);

      trackShareEvent('share_initiated', platform || 'generic', contentId, contentType, shareResponse.shareEventId);

      if (platform) {
        // Open platform-specific share URL
        const platformShareUrl = getPlatformShareUrl(
          platform,
          shareResponse.shareUrl,
          shareResponse.shareMessage,
          contentImage
        );

        // Open in new window/tab
        const shareWindow = window.open(platformShareUrl, 'share', 'width=600,height=400,scrollbars=yes,resizable=yes');

        if (shareWindow) {
          // Monitor if window was closed (indicates sharing attempt)
          const checkClosed = setInterval(() => {
            if (shareWindow.closed) {
              clearInterval(checkClosed);
              updateShareStatus(shareResponse.shareEventId, ShareStatus.Completed);
              trackShareEvent('share_completed', platform, contentId, contentType, shareResponse.shareEventId);
              onShareComplete?.(platform, true);
            }
          }, 1000);

          // Clean up after 30 seconds
          setTimeout(() => {
            clearInterval(checkClosed);
            if (!shareWindow.closed) {
              shareWindow.close();
            }
          }, 30000);
        } else {
          // Popup blocked, fallback to copying link
          await copyToClipboard(shareResponse.shareUrl);
        }
      } else {
        // Copy link to clipboard as fallback
        await copyToClipboard(shareResponse.shareUrl);
      }
    } catch (error) {
      console.error('Share failed:', error);
      onShareComplete?.(platform || 'generic', false);

      // Track failure
      if (platform) {
        trackShareEvent('share_failed', platform, contentId, contentType, '', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } finally {
      setIsSharing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    contentId,
    contentType,
    contentTitle,
    contentImage,
    platform,
    customMessage,
    onShareStart,
    onShareComplete,
    isSharing,
  ]);

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      onShareComplete?.(platform || 'copy', true);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      onShareComplete?.(platform || 'copy', false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 px-2 text-xs';
      case 'lg':
        return 'h-12 px-6 text-base';
      default:
        return 'h-10 px-4 text-sm';
    }
  };

  const getVariantClasses = () => {
    if (platform && SOCIAL_PLATFORMS[platform]) {
      const _config = SOCIAL_PLATFORMS[platform];
      switch (variant) {
        case 'minimal':
          return `bg-muted hover:bg-muted/80 text-foreground border-border`;
        case 'icon-only':
          return `bg-muted hover:bg-muted/80 text-foreground border-border aspect-square`;
        default:
          return `text-white border-transparent hover:opacity-90`;
      }
    }
    return 'bg-primary hover:bg-primary/90 text-primary-foreground border-primary';
  };

  const getButtonStyle = () => {
    if (platform && SOCIAL_PLATFORMS[platform] && variant === 'default') {
      const config = SOCIAL_PLATFORMS[platform];
      return { backgroundColor: config.color };
    }
    return {};
  };

  const getIcon = () => {
    if (isCopied) {
      return <Check className="w-4 h-4" />;
    }

    if (platform && SOCIAL_PLATFORMS[platform]) {
      return <span className="text-lg">{SOCIAL_PLATFORMS[platform].icon}</span>;
    }

    if (!platform && canUseWebShare() && isMobileDevice()) {
      return <Share2 className="w-4 h-4" />;
    }

    return <Copy className="w-4 h-4" />;
  };

  const getButtonText = () => {
    if (isCopied) {
      return 'Copied!';
    }

    if (isSharing) {
      return 'Sharing...';
    }

    if (platform && SOCIAL_PLATFORMS[platform]) {
      const config = SOCIAL_PLATFORMS[platform];
      return showText && variant !== 'icon-only' ? `Share on ${config.displayName}` : '';
    }

    if (!platform && canUseWebShare() && isMobileDevice()) {
      return showText && variant !== 'icon-only' ? 'Share' : '';
    }

    return showText && variant !== 'icon-only' ? 'Copy Link' : '';
  };

  return (
    <Button
      onClick={handleShare}
      disabled={isSharing}
      className={`
        ${getSizeClasses()}
        ${getVariantClasses()}
        flex items-center gap-2
        transition-all duration-200
        ${className}
      `}
      style={getButtonStyle()}
      title={`Share ${contentTitle} ${platform ? `on ${SOCIAL_PLATFORMS[platform]?.displayName}` : ''}`}
    >
      {getIcon()}
      {getButtonText()}
    </Button>
  );
};

export default ShareButton;
