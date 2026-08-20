/**
 * Centralized social platform brand colors
 * These are official brand colors and should not use design system tokens
 * as they represent external brand identity
 */
export const SOCIAL_PLATFORM_COLORS = {
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  x: '#000000',
  instagram: '#E4405F',
  tiktok: '#FF0050',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  discord: '#5865F2',
  twitch: '#9146FF',
  reddit: '#FF4500',
  whatsapp: '#25D366',
  pinterest: '#BD081C', // Updated to match social-sharing.ts
  snapchat: '#FFFC00',
  telegram: '#0088CC', // Updated to match social-sharing.ts
} as const;

export type SocialPlatform = keyof typeof SOCIAL_PLATFORM_COLORS;

export function getSocialColor(platform: string): string {
  const normalizedPlatform = platform.toLowerCase() as SocialPlatform;
  return SOCIAL_PLATFORM_COLORS[normalizedPlatform] || '#6b7280';
}
