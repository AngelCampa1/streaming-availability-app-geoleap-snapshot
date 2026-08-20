/* eslint-disable @typescript-eslint/no-explicit-any */
import { SOCIAL_PLATFORM_COLORS } from '@/lib/social-platform-colors';

export interface ShareContentRequest {
  contentId: string;
  contentType: string;
  platform: string;
  customMessage?: string;
  includePersonalInfo?: boolean;
  trackAnalytics?: boolean;
  utmParameters?: Record<string, string>;
}

export interface ShareLinkResponse {
  shareUrl: string;
  shareMessage: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  shareEventId: string;
}

export interface SocialPlatformConfig {
  id: string;
  platformName: string;
  displayName: string;
  isEnabled: boolean;
  iconUrl?: string;
  colorCode?: string;
  characterLimit: number;
  supportsImages: boolean;
  supportsVideo: boolean;
  supportsHashtags: boolean;
  sortOrder: number;
}

export interface SocialSharingPreferences {
  allowSocialSharing: boolean;
  shareWithPersonalInfo: boolean;
  allowShareAnalytics: boolean;
  autoGenerateHashtags: boolean;
  platformPreferences?: string;
  customShareTemplates?: string;
}

export interface SocialShareMetrics {
  contentId: string;
  contentTitle: string;
  totalShares: number;
  totalClicks: number;
  conversionRate: number;
  viralCoefficient: number;
  platformBreakdown: Record<string, number>;
  lastSharedAt: string;
}

export interface OpenGraphData {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  type: string;
  siteName: string;
  additionalProperties?: Record<string, string>;
}

export interface TwitterCardData {
  card: string;
  title: string;
  description: string;
  imageUrl: string;
  site: string;
  additionalProperties?: Record<string, string>;
}

export enum ShareStatus {
  Initiated = 0,
  Completed = 1,
  Failed = 2,
  Cancelled = 3,
}

export enum SocialPlatform {
  Facebook = 1,
  Twitter = 2,
  Instagram = 3,
  TikTok = 4,
  WhatsApp = 5,
  LinkedIn = 6,
  Pinterest = 7,
  Reddit = 8,
  Telegram = 9,
  Discord = 10,
}

// Platform-specific share configuration
export interface PlatformShareConfig {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  baseUrl: string;
  supportsWebShare: boolean;
  requiresApp: boolean;
  mobileOnly?: boolean;
}

export const SOCIAL_PLATFORMS: Record<string, PlatformShareConfig> = {
  facebook: {
    name: 'facebook',
    displayName: 'Facebook',
    icon: '📘',
    color: SOCIAL_PLATFORM_COLORS.facebook,
    baseUrl: 'https://www.facebook.com/sharer/sharer.php',
    supportsWebShare: false,
    requiresApp: false,
  },
  twitter: {
    name: 'twitter',
    displayName: 'Twitter/X',
    icon: '𝕏',
    color: SOCIAL_PLATFORM_COLORS.x,
    baseUrl: 'https://twitter.com/intent/tweet',
    supportsWebShare: false,
    requiresApp: false,
  },
  instagram: {
    name: 'instagram',
    displayName: 'Instagram',
    icon: '📷',
    color: SOCIAL_PLATFORM_COLORS.instagram,
    baseUrl: '',
    supportsWebShare: true,
    requiresApp: true,
    mobileOnly: true,
  },
  tiktok: {
    name: 'tiktok',
    displayName: 'TikTok',
    icon: '🎵',
    color: SOCIAL_PLATFORM_COLORS.tiktok,
    baseUrl: '',
    supportsWebShare: true,
    requiresApp: true,
    mobileOnly: true,
  },
  whatsapp: {
    name: 'whatsapp',
    displayName: 'WhatsApp',
    icon: '💬',
    color: SOCIAL_PLATFORM_COLORS.whatsapp,
    baseUrl: 'https://api.whatsapp.com/send',
    supportsWebShare: true,
    requiresApp: false,
  },
  linkedin: {
    name: 'linkedin',
    displayName: 'LinkedIn',
    icon: '💼',
    color: SOCIAL_PLATFORM_COLORS.linkedin,
    baseUrl: 'https://www.linkedin.com/sharing/share-offsite/',
    supportsWebShare: false,
    requiresApp: false,
  },
  pinterest: {
    name: 'pinterest',
    displayName: 'Pinterest',
    icon: '📌',
    color: SOCIAL_PLATFORM_COLORS.pinterest,
    baseUrl: 'https://pinterest.com/pin/create/button/',
    supportsWebShare: false,
    requiresApp: false,
  },
  reddit: {
    name: 'reddit',
    displayName: 'Reddit',
    icon: '🔴',
    color: SOCIAL_PLATFORM_COLORS.reddit,
    baseUrl: 'https://reddit.com/submit',
    supportsWebShare: false,
    requiresApp: false,
  },
  telegram: {
    name: 'telegram',
    displayName: 'Telegram',
    icon: '✈️',
    color: SOCIAL_PLATFORM_COLORS.telegram,
    baseUrl: 'https://t.me/share/url',
    supportsWebShare: true,
    requiresApp: false,
  },
  discord: {
    name: 'discord',
    displayName: 'Discord',
    icon: '🎮',
    color: SOCIAL_PLATFORM_COLORS.discord,
    baseUrl: '',
    supportsWebShare: true,
    requiresApp: true,
  },
};

// Share analytics event types
export interface ShareAnalyticsEvent {
  eventType: 'share_initiated' | 'share_completed' | 'share_failed' | 'share_cancelled';
  platform: string;
  contentId: string;
  contentType: string;
  shareEventId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Mobile share sheet data
export interface ShareData {
  title: string;
  text: string;
  url: string;
  files?: File[];
}

// Share button props
export interface ShareButtonProps {
  contentId: string;
  contentType: string;
  contentTitle: string;
  contentImage?: string;
  platform?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'icon-only';
  className?: string;
  onShareStart?: (platform: string) => void;
  onShareComplete?: (platform: string, success: boolean) => void;
  customMessage?: string;
}

// Share modal props
export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentType: string;
  contentTitle: string;
  contentDescription?: string;
  contentImage?: string;
  customMessage?: string;
  onShareComplete?: (platform: string, success: boolean) => void;
}

// Share analytics hooks return type
export interface ShareAnalyticsData {
  totalShares: number;
  platformBreakdown: Record<string, number>;
  recentShares: ShareAnalyticsEvent[];
  conversionRate: number;
  isLoading: boolean;
  error: string | null;
}
