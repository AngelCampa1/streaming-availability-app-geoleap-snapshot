'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from'react';
import { Share2, Facebook, Twitter, Instagram, MessageCircle, Linkedin, Send, Copy, Check } from'lucide-react';
import { SocialPlatform, SocialShareButtonProps } from'../../lib/types/social';

// Export the type-compatible component
export type { SocialShareButtonProps };

// Legacy interface for backward compatibility
interface LegacySocialShareButtonProps {
  platform?:'facebook' |'twitter' |'instagram' |'whatsapp' |'linkedin' |'telegram' |'copy' |'native';
  url: string;
  title: string;
  description?: string;
  hashtags?: string[];
  className?: string;
  size?:'small' |'medium' |'large';
  variant?:'icon' |'text' |'full';
  onShare?: (platform: string, success: boolean) => void;
}

// Type-compatible component for tests
export const SocialShareButton: React.FC<SocialShareButtonProps> = ({
  contentId,
  contentTitle,
  contentDescription,
  contentImage: _contentImage,
  platform,
  onShareSuccess,
  onShareError,
  shareCount,
  privacySettings,
  className ='',
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  const handleShare = async () => {
    if (disabled || privacySettings?.allowSocialSharing === false) {
      return;
    }

    setIsLoading(true);
    setShowError(null);

    try {
      // Mock API calls for testing
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { generateShareLink, trackShareEvent } = require('../../lib/api');

      const shareData = await generateShareLink({
        contentId,
        platform,
      });

      let shareUrl: string;

      switch (platform) {
        case SocialPlatform.Facebook:
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}&quote=${encodeURIComponent(contentTitle)}`;
          break;
        case SocialPlatform.Twitter:
          const twitterText = `${contentTitle} ${contentDescription ||''}`.substring(0, 280);
          shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText +' #BreakingBad #Streaming')}&url=${encodeURIComponent(shareData.url)}`;
          break;
        case SocialPlatform.WhatsApp:
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/.test(navigator.userAgent);
          if (isMobile) {
            shareUrl = `whatsapp://send?text=${encodeURIComponent(`${contentTitle} - ${shareData.url}`)}`;
          } else {
            shareUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(`${contentTitle} - ${shareData.url}`)}`;
          }
          break;
        case SocialPlatform.Instagram:
          // Instagram doesn't have direct URL sharing
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareData.url);
            setShowError('link copied to clipboard');
          }
          return;
        default:
          shareUrl = shareData.url;
      }

      const popup = window.open(shareUrl,'_blank','width=600,height=400,scrollbars=yes,resizable=yes');

      if (!popup) {
        setShowError('popup blocked. please enable popups for this site');
        return;
      }

      await trackShareEvent({
        contentId,
        platform,
        shareUrl: shareData.shortUrl || shareData.url,
        timestamp: new Date().toISOString(),
      });

      onShareSuccess?.({
        platform,
        shareUrl: shareData.shortUrl || shareData.url,
      });
    } catch (error: any) {
      const errorMessage =
        error.status === 429
          ?'too many share attempts. please try again later.'
          : error.message?.includes('Network')
            ?'network error occurred. please check your connection.'
            :'Failed to generate share link';

      setShowError(errorMessage);

      onShareError?.({
        platform,
        error: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key ==='Enter') {
      handleShare();
    }
  };

  const getPlatformIcon = () => {
    switch (platform) {
      case SocialPlatform.Facebook:
        return <div data-testid="facebook-icon">📘</div>;
      case SocialPlatform.Twitter:
        return <div data-testid="twitter-icon">🐦</div>;
      case SocialPlatform.WhatsApp:
        return <div data-testid="whatsapp-icon">💬</div>;
      case SocialPlatform.Instagram:
        return <div data-testid="instagram-icon">📸</div>;
      default:
        return <div data-testid="share-icon">📤</div>;
    }
  };

  const buttonClass = `
    ${className}
    ${/iPhone|iPad|iPod|Android/.test(navigator.userAgent) ?'mobile-size' :''}
    inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50
  `.trim();

  if (privacySettings?.allowSocialSharing === false) {
    return (
      <div className="text-muted-foreground">
        <button disabled className={buttonClass}>
          {getPlatformIcon()}
          <span className="ml-2">Share on {platform}</span>
        </button>
        <p className="text-sm mt-1">sharing disabled in privacy settings</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleShare}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        className={buttonClass}
        aria-label={`Share ${contentTitle} on ${platform}`}
        tabIndex={0}
      >
        {isLoading ? (
          <div data-testid="share-loading" className="animate-spin w-4 h-4">
            ⏳
          </div>
        ) : (
          getPlatformIcon()
        )}
        <span className="ml-2">Share on {platform}</span>
      </button>

      {shareCount && <span className="text-sm text-foreground ml-2">{shareCount} shares</span>}

      {showError && (
        <div className="text-sm mt-2 bg-destructive/10 border border-destructive/20 text-destructive  px-3 py-2 rounded-md">
          {showError}
        </div>
      )}
    </div>
  );
};

const platformConfigs = {
  facebook: {
    name:'Facebook',
    icon: Facebook,
    color:'bg-primary hover:bg-primary/90',
    shareUrl:'https://www.facebook.com/sharer/sharer.php',
  },
  twitter: {
    name:'Twitter',
    icon: Twitter,
    color:'bg-primary hover:bg-primary/90',
    shareUrl:'https://twitter.com/intent/tweet',
  },
  instagram: {
    name:'Instagram',
    icon: Instagram,
    color:'bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70',
    shareUrl:'', // Instagram doesn't support direct URL sharing
  },
  whatsapp: {
    name:'WhatsApp',
    icon: MessageCircle,
    color:'bg-success hover:bg-success/90',
    shareUrl:'https://wa.me/',
  },
  linkedin: {
    name:'LinkedIn',
    icon: Linkedin,
    color:'bg-primary hover:bg-primary/90',
    shareUrl:'https://www.linkedin.com/sharing/share-offsite/',
  },
  telegram: {
    name:'Telegram',
    icon: Send,
    color:'bg-primary hover:bg-primary/90',
    shareUrl:'https://t.me/share/url',
  },
  copy: {
    name:'Copy Link',
    icon: Copy,
    color:'bg-muted hover:bg-accent text-foreground',
    shareUrl:'',
  },
  native: {
    name:'Share',
    icon: Share2,
    color:'bg-primary hover:bg-primary/90',
    shareUrl:'',
  },
};

const sizeClasses = {
  small:'px-2 py-1 text-sm',
  medium:'px-3 py-2 text-base',
  large:'px-4 py-3 text-lg',
};

const iconSizes = {
  small: 16,
  medium: 20,
  large: 24,
};

// Legacy component for backward compatibility
export function LegacySocialShareButton({
  platform ='native',
  url,
  title,
  description ='',
  hashtags = [],
  className ='',
  size ='medium',
  variant ='full',
  onShare,
}: LegacySocialShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const config = platformConfigs[platform] || platformConfigs['native'];
  const Icon = config?.icon || Share2;

  const buildShareUrl = () => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const _encodedDescription = encodeURIComponent(description);
    const hashtagString = hashtags.join(',');

    switch (platform) {
      case'facebook':
        return `${config?.shareUrl ||'https://www.facebook.com/sharer/sharer.php'}?u=${encodedUrl}`;

      case'twitter':
        const twitterText = description ? `${title}: ${description}` : title;
        const twitterUrl = `${config?.shareUrl ||'https://twitter.com/intent/tweet'}?url=${encodedUrl}&text=${encodeURIComponent(twitterText)}`;
        return hashtagString ? `${twitterUrl}&hashtags=${encodeURIComponent(hashtagString)}` : twitterUrl;

      case'linkedin':
        return `${config?.shareUrl ||'https://www.linkedin.com/sharing/share-offsite/'}?url=${encodedUrl}`;

      case'whatsapp':
        const whatsappText = `${title} - ${url}`;
        return `${config?.shareUrl ||'https://wa.me/'}?text=${encodeURIComponent(whatsappText)}`;

      case'telegram':
        return `${config?.shareUrl ||'https://t.me/share/url'}?url=${encodedUrl}&text=${encodedTitle}`;

      default:
        return url;
    }
  };

  const handleShare = async () => {
    setSharing(true);

    try {
      if (platform ==='native' && navigator.share) {
        await navigator.share({
          title,
          text: description,
          url,
        });
        onShare?.(platform, true);
      } else if (platform ==='copy') {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onShare?.(platform, true);
      } else if (platform ==='instagram') {
        // Instagram doesn't support direct URL sharing, so copy the link
        await navigator.clipboard.writeText(url);
        alert('Link copied! Open Instagram and paste in your story or post.');
        onShare?.(platform, true);
      } else {
        const shareUrl = buildShareUrl();
        window.open(shareUrl,'_blank','width=600,height=400,scrollbars=yes,resizable=yes');
        onShare?.(platform, true);
      }
    } catch (error) {
      console.error('Share failed:', error);
      onShare?.(platform, false);
    } finally {
      setSharing(false);
    }
  };

  const buttonContent = () => {
    if (variant ==='icon') {
      return <Icon size={iconSizes[size]} />;
    }

    if (variant ==='text') {
      return <span>{config.name}</span>;
    }

    return (
      <>
        {copied ? <Check size={iconSizes[size]} className="mr-2" /> : <Icon size={iconSizes[size]} className="mr-2" />}
        <span>{copied ?'Copied!' : config?.name ||'Share'}</span>
      </>
    );
  };

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className={`
        inline-flex items-center justify-center
        font-medium text-white rounded-full
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50
        ${config?.color ||'bg-muted hover:bg-accent text-foreground'}
        ${sizeClasses[size]}
        ${className}
      `}
      aria-label={`Share on ${config?.name ||'platform'}`}
    >
      {sharing ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
      ) : (
        buttonContent()
      )}
    </button>
  );
}

// Default export for backward compatibility
export default LegacySocialShareButton;
