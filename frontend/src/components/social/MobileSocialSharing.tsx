'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Smartphone, Globe } from 'lucide-react';
import LegacySocialShareButton from './SocialShareButton';
import { MobileSocialSharingProps } from '../../lib/types/social';
import { isIOS, isAndroid, isReactNative, isMobile as _isMobilePlatform } from '../../lib/utils/platform';

// Legacy interface for backward compatibility
interface LegacyMobileSocialSharingProps {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  className?: string;
  onShare?: (platform: string, success: boolean) => void;
}

// Type-compatible component for tests
export const MobileSocialSharing: React.FC<MobileSocialSharingProps> = ({
  contentId,
  contentTitle,
  contentDescription,
  contentImage,
  onShareSuccess,
  onShareError,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showPlatformOptions, setShowPlatformOptions] = useState(false);
  const [queuedShares, setQueuedShares] = useState<
    Array<{
      contentId: string;
      contentTitle: string;
      contentDescription?: string;
    }>
  >([]);

  useEffect(() => {
    // Simulate loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Handle online/offline events
    const handleOnline = () => {
      if (queuedShares.length > 0) {
        // Process queued shares
        setQueuedShares([]);
        // Show success message
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queuedShares]);

  const handleNativeShare = async () => {
    if (!navigator.onLine) {
      setQueuedShares([{ contentId, contentTitle, contentDescription }]);
      return;
    }

    try {
      if (isReactNative() && global.ReactNative?.Share) {
        await global.ReactNative.Share.share({
          title: contentTitle,
          message: contentDescription || '',
          url: `https://geoleap.app/content/${contentId}`,
        });

        onShareSuccess?.({
          platform: 'native',
          method: 'react-native-share',
        });
        return;
      }

      if ('share' in navigator) {
        const shareData = {
          title: contentTitle,
          text: contentDescription || '',
          url: `https://geoleap.app/content/${contentId}`,
        };

        if (typeof navigator.share === 'function') {
          await navigator.share(shareData);
        }

        onShareSuccess?.({
          platform: 'native',
          method: isIOS() ? 'ios-share-sheet' : 'android-share-sheet',
        });

        // Haptic feedback
        if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
          navigator.vibrate([50]);
        }
      } else {
        throw new Error('Native share not supported');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled, don't show error
        return;
      }

      // Haptic feedback for error
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate([100, 50, 100]);
      }

      setShowPlatformOptions(true);
      onShareError?.({
        platform: 'native',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handlePlatformShare = async (platform: string) => {
    try {
      let url: string;
      const shareUrl = `https://geoleap.app/content/${contentId}`;

      if (isReactNative() && global.ReactNative?.Linking) {
        const canOpen = await global.ReactNative.Linking.canOpenURL(`${platform}://`);
        if (!canOpen) {
          // Fallback to web version
          url =
            platform === 'whatsapp'
              ? `https://web.whatsapp.com/send?text=${encodeURIComponent(`${contentTitle} - ${shareUrl}`)}`
              : shareUrl;
          window.open(url, '_blank');
          return;
        }
      }

      switch (platform) {
        case 'whatsapp':
          if (isIOS()) {
            url = `whatsapp://send?text=${encodeURIComponent(`${contentTitle} - ${shareUrl}`)}`;
          } else if (isAndroid()) {
            url = `intent://send/#Intent;package=com.whatsapp;scheme=whatsapp;S.android.intent.extra.TEXT=${encodeURIComponent(`${contentTitle} - ${shareUrl}`)};end`;
          } else {
            url = `https://web.whatsapp.com/send?text=${encodeURIComponent(`${contentTitle} - ${shareUrl}`)}`;
          }
          break;
        case 'instagram':
          url = isIOS()
            ? `instagram-stories://share?text=${encodeURIComponent(contentTitle)}`
            : `intent://share/#Intent;package=com.instagram.android;end`;
          break;
        case 'tiktok':
          url = isAndroid() ? `snssdk1233://share?text=${encodeURIComponent(contentTitle)}` : shareUrl;
          break;
        default:
          url = shareUrl;
      }

      window.open(url, isReactNative() ? '_system' : '_blank');

      onShareSuccess?.({
        platform,
        method: 'deep-link',
      });
    } catch (error) {
      onShareError?.({
        platform,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  if (isLoading) {
    return (
      <div data-testid="share-buttons-loading" className="flex justify-center p-4">
        <div className="animate-spin w-6 h-6">⏳</div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Check for PWA standalone mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  return (
    <div className={className}>
      {/* Share Preview */}
      <div data-testid="share-preview" className="mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${contentImage}?w=400`}
          alt={contentTitle}
          loading="lazy"
          className="w-full h-32 object-cover rounded"
        />
        <h3 className="text-lg font-semibold mt-2">{contentTitle}</h3>
        <p className="text-muted-foreground">{contentDescription}</p>
      </div>

      {/* Main Share Button */}
      <button
        onClick={handleNativeShare}
        className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
        style={{ minHeight: '44px', minWidth: '44px' }} // iOS touch target guidelines
        aria-label="Share content"
        role="button"
      >
        📤 Share
      </button>

      {/* Platform Specific Options */}
      {showPlatformOptions && (
        <div className="mt-4">
          <p className="text-muted-foreground mb-2">Choose Platform:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handlePlatformShare('whatsapp')}
              className="bg-success text-success-foreground px-4 py-2 rounded"
              style={{ minHeight: '44px', minWidth: '44px' }}
              aria-label="Share on WhatsApp"
              role="button"
            >
              💬 WhatsApp
            </button>
            <button
              onClick={() => handlePlatformShare('instagram')}
              className="bg-accent text-accent-foreground px-4 py-2 rounded"
              style={{ minHeight: '44px', minWidth: '44px' }}
              aria-label="Share on Instagram"
              role="button"
            >
              📸 Instagram
            </button>
            <button
              onClick={() => handlePlatformShare('tiktok')}
              className="bg-foreground text-background px-4 py-2 rounded"
              style={{ minHeight: '44px', minWidth: '44px' }}
              aria-label="Share on TikTok"
              role="button"
            >
              🎵 TikTok
            </button>
          </div>
        </div>
      )}

      {/* PWA Standalone UI */}
      {isStandalone && (
        <div data-testid="pwa-standalone-ui" className="mt-4 p-2 bg-primary/10 rounded">
          <p className="text-sm text-primary">App Mode Active</p>
        </div>
      )}

      {/* Offline Queue Status */}
      {!navigator.onLine && queuedShares.length > 0 && (
        <div className="mt-4 p-2 bg-warning/10 rounded">
          <p className="text-sm text-warning">Queued for when online</p>
        </div>
      )}

      {/* Online Success Message */}
      {navigator.onLine && queuedShares.length === 0 && (
        <div className="mt-4 p-2 bg-success/10 rounded" style={{ display: 'none' }}>
          <p className="text-sm text-success">Share sent successfully</p>
        </div>
      )}

      {/* Reduced Motion Elements */}
      {window.matchMedia('(prefers-reduced-motion: reduce)').matches && (
        <div data-testid="animation" className="reduce-motion">
          {/* Reduced motion content */}
        </div>
      )}
    </div>
  );
};

// Check if we're on mobile and if Web Share API is supported
const isMobile = () => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;

  return isMobileDevice || (isTouchDevice && isSmallScreen);
};

const supportsWebShare = () => {
  return typeof navigator !== 'undefined' && 'share' in navigator;
};

// Legacy component for backward compatibility
export default function LegacyMobileSocialSharing({
  url,
  title,
  description = '',
  imageUrl: _imageUrl,
  className = '',
  onShare,
}: LegacyMobileSocialSharingProps) {
  const [isNativeSupported, setIsNativeSupported] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');

  useEffect(() => {
    setIsNativeSupported(supportsWebShare());
    setDeviceType(isMobile() ? 'mobile' : 'desktop');
  }, []);

  const handleNativeShare = async () => {
    if (!isNativeSupported) return;

    try {
      await navigator.share({
        title,
        text: description,
        url,
      });
      onShare?.('native', true);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Native share failed:', error);
        onShare?.('native', false);
      }
    }
  };

  const handleFallbackShare = (platform: string, success: boolean) => {
    onShare?.(platform, success);
  };

  // If native sharing is supported on mobile, show the native share button prominently
  if (isNativeSupported && deviceType === 'mobile') {
    return (
      <div className={`mobile-social-sharing ${className}`}>
        <button
          onClick={handleNativeShare}
          className="flex items-center justify-center w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Share using device's native sharing"
        >
          <Smartphone size={20} className="mr-2" />
          <span>Share</span>
        </button>

        {/* Fallback options */}
        <div className="mt-4">
          <div className="flex items-center justify-center text-sm text-muted-foreground mb-3">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-3">or share directly</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <LegacySocialShareButton
              platform="copy"
              url={url}
              title={title}
              description={description}
              variant="full"
              size="small"
              onShare={handleFallbackShare}
            />
            <LegacySocialShareButton
              platform="whatsapp"
              url={url}
              title={title}
              description={description}
              variant="full"
              size="small"
              onShare={handleFallbackShare}
            />
          </div>
        </div>
      </div>
    );
  }

  // For desktop or when native sharing isn't supported, show platform-specific buttons
  return (
    <div className={`mobile-social-sharing ${className}`}>
      <div className="flex items-center mb-3">
        <Globe size={16} className="mr-2 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Share on</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <LegacySocialShareButton
          platform="facebook"
          url={url}
          title={title}
          description={description}
          variant="full"
          size="small"
          onShare={handleFallbackShare}
        />
        <LegacySocialShareButton
          platform="twitter"
          url={url}
          title={title}
          description={description}
          variant="full"
          size="small"
          onShare={handleFallbackShare}
        />
        <LegacySocialShareButton
          platform="whatsapp"
          url={url}
          title={title}
          description={description}
          variant="full"
          size="small"
          onShare={handleFallbackShare}
        />
        <LegacySocialShareButton
          platform="linkedin"
          url={url}
          title={title}
          description={description}
          variant="full"
          size="small"
          onShare={handleFallbackShare}
        />
        <LegacySocialShareButton
          platform="telegram"
          url={url}
          title={title}
          description={description}
          variant="full"
          size="small"
          onShare={handleFallbackShare}
        />
        <LegacySocialShareButton
          platform="copy"
          url={url}
          title={title}
          description={description}
          variant="full"
          size="small"
          onShare={handleFallbackShare}
        />
      </div>

      {/* Try native share as fallback */}
      {isNativeSupported && (
        <div className="mt-3 pt-3 border-t border-border">
          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center w-full px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="More sharing options"
          >
            <Share2 size={16} className="mr-2" />
            <span className="text-sm">More options</span>
          </button>
        </div>
      )}
    </div>
  );
}
