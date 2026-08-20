/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiClient } from './api';
import {
  ShareContentRequest,
  ShareLinkResponse,
  SocialPlatformConfig,
  SocialSharingPreferences,
  SocialShareMetrics,
  OpenGraphData,
  TwitterCardData,
  ShareStatus,
} from './types/social-sharing';
import { logger } from './logger';

const api = new ApiClient();

// Social Sharing API Functions
export async function generateShareLink(request: ShareContentRequest): Promise<ShareLinkResponse> {
  return api.post<ShareLinkResponse>('/api/share/generate-link', request);
}

export async function updateShareStatus(
  shareEventId: string,
  status: ShareStatus,
  errorMessage?: string
): Promise<void> {
  return api.post<void>('/api/share/update-status', {
    shareEventId,
    status,
    errorMessage,
  });
}

export async function getAvailablePlatforms(): Promise<SocialPlatformConfig[]> {
  return api.get<SocialPlatformConfig[]>('/api/share/platforms');
}

export async function getUserSharingPreferences(): Promise<SocialSharingPreferences> {
  return api.get<SocialSharingPreferences>('/api/share/preferences');
}

export async function updateUserSharingPreferences(
  preferences: Partial<SocialSharingPreferences>
): Promise<SocialSharingPreferences> {
  return api.put<SocialSharingPreferences>('/api/share/preferences', preferences);
}

export async function getContentSharingMetrics(contentId: string): Promise<SocialShareMetrics> {
  return api.get<SocialShareMetrics>(`/api/share/metrics/${contentId}`);
}

export async function getOpenGraphData(contentType: string, contentId: string): Promise<OpenGraphData> {
  return api.get<OpenGraphData>(`/api/share/og/${contentType}/${contentId}`);
}

export async function getTwitterCardData(contentType: string, contentId: string): Promise<TwitterCardData> {
  return api.get<TwitterCardData>(`/api/share/twitter-card/${contentType}/${contentId}`);
}

export async function trackShareConversion(shareEventId: string): Promise<void> {
  return api.post<void>('/api/share/track-conversion', { shareEventId });
}

// Platform-specific sharing functions
export function buildFacebookShareUrl(shareUrl: string, shareMessage?: string): string {
  const params = new URLSearchParams({
    u: shareUrl,
    quote: shareMessage || '',
  });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

export function buildTwitterShareUrl(shareUrl: string, shareMessage?: string): string {
  const params = new URLSearchParams({
    url: shareUrl,
    text: shareMessage || '',
    via: 'geoleap',
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function buildLinkedInShareUrl(shareUrl: string, shareMessage?: string): string {
  const params = new URLSearchParams({
    url: shareUrl,
    mini: 'true',
    title: shareMessage || '',
  });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

export function buildWhatsAppShareUrl(shareUrl: string, shareMessage?: string): string {
  const message = shareMessage ? `${shareMessage} ${shareUrl}` : shareUrl;
  const params = new URLSearchParams({ text: message });
  return `https://api.whatsapp.com/send?${params.toString()}`;
}

export function buildTelegramShareUrl(shareUrl: string, shareMessage?: string): string {
  const params = new URLSearchParams({
    url: shareUrl,
    text: shareMessage || '',
  });
  return `https://t.me/share/url?${params.toString()}`;
}

export function buildPinterestShareUrl(shareUrl: string, shareMessage?: string, imageUrl?: string): string {
  const params = new URLSearchParams({
    url: shareUrl,
    description: shareMessage || '',
    ...(imageUrl && { media: imageUrl }),
  });
  return `https://pinterest.com/pin/create/button/?${params.toString()}`;
}

export function buildRedditShareUrl(shareUrl: string, shareMessage?: string): string {
  const params = new URLSearchParams({
    url: shareUrl,
    title: shareMessage || '',
  });
  return `https://reddit.com/submit?${params.toString()}`;
}

// Native Web Share API
export function canUseWebShare(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

export async function nativeWebShare(data: { title: string; text?: string; url: string }): Promise<void> {
  if (!canUseWebShare()) {
    throw new Error('Web Share API not supported');
  }

  try {
    await navigator.share(data);
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      throw error;
    }
  }
}

// Mobile app detection
export function isMobileDevice(): boolean {
  return (
    typeof window !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

export function isIOS(): boolean {
  return typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  return typeof window !== 'undefined' && /Android/.test(navigator.userAgent);
}

// App-specific sharing (for platforms that require apps)
export function openAppOrFallback(appUrl: string, fallbackUrl: string): void {
  if (typeof window === 'undefined') return;

  const startTime = Date.now();

  // Try to open the app
  window.location.href = appUrl;

  // If app doesn't open within 2 seconds, redirect to fallback
  const timeout = setTimeout(() => {
    const elapsed = Date.now() - startTime;
    if (elapsed < 2100) {
      window.open(fallbackUrl, '_blank');
    }
  }, 2000);

  // Clean up timeout if page visibility changes (app opened successfully)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      if (timeout) clearTimeout(timeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Also clean up on page blur (for older browsers)
  const handleBlur = () => {
    if (timeout) clearTimeout(timeout);
    window.removeEventListener('blur', handleBlur);
  };

  window.addEventListener('blur', handleBlur);
}

// Analytics tracking helpers
export function trackShareEvent(
  eventType: 'share_initiated' | 'share_completed' | 'share_failed' | 'share_cancelled',
  platform: string,
  contentId: string,
  contentType: string,
  shareEventId: string,
  metadata?: Record<string, any>
): void {
  if (typeof window === 'undefined') return;

  // Track with analytics service
  try {
    // This would integrate with your analytics service (GA, Mixpanel, etc.)
    if ((window as { gtag?: (...args: unknown[]) => void }).gtag) {
      (window as { gtag?: (...args: unknown[]) => void }).gtag?.('event', 'share', {
        event_category: 'social_sharing',
        event_label: platform,
        custom_parameter_1: eventType,
        custom_parameter_2: contentId,
        custom_parameter_3: contentType,
        custom_parameter_4: shareEventId,
      });
    }

    // Custom analytics
    logger.info('[SocialSharingAPI] Share event', {
      eventType,
      platform,
      contentId,
      contentType,
      shareEventId,
      timestamp: new Date().toISOString(),
      metadata,
    });
  } catch (error) {
    console.warn('Failed to track share event:', error);
  }
}

// Utility to get platform share URL
export function getPlatformShareUrl(
  platform: string,
  shareUrl: string,
  shareMessage?: string,
  imageUrl?: string
): string {
  switch (platform.toLowerCase()) {
    case 'facebook':
      return buildFacebookShareUrl(shareUrl, shareMessage);
    case 'twitter':
      return buildTwitterShareUrl(shareUrl, shareMessage);
    case 'linkedin':
      return buildLinkedInShareUrl(shareUrl, shareMessage);
    case 'whatsapp':
      return buildWhatsAppShareUrl(shareUrl, shareMessage);
    case 'telegram':
      return buildTelegramShareUrl(shareUrl, shareMessage);
    case 'pinterest':
      return buildPinterestShareUrl(shareUrl, shareMessage, imageUrl);
    case 'reddit':
      return buildRedditShareUrl(shareUrl, shareMessage);
    default:
      return shareUrl;
  }
}
