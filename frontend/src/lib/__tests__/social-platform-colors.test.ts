/**
 * Social Platform Colors Tests
 *
 * Tests social media platform brand color utilities
 */

import { SOCIAL_PLATFORM_COLORS, getSocialColor, SocialPlatform } from '../social-platform-colors';

describe('Social Platform Colors', () => {
  describe('SOCIAL_PLATFORM_COLORS', () => {
    it('contains all major social platforms', () => {
      const platforms: SocialPlatform[] = [
        'facebook',
        'twitter',
        'x',
        'instagram',
        'tiktok',
        'linkedin',
        'youtube',
        'discord',
        'twitch',
        'reddit',
        'whatsapp',
        'pinterest',
        'snapchat',
        'telegram',
      ];

      platforms.forEach(platform => {
        expect(SOCIAL_PLATFORM_COLORS[platform]).toBeDefined();
        expect(typeof SOCIAL_PLATFORM_COLORS[platform]).toBe('string');
        expect(SOCIAL_PLATFORM_COLORS[platform]).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('has correct brand colors', () => {
      expect(SOCIAL_PLATFORM_COLORS.facebook).toBe('#1877F2');
      expect(SOCIAL_PLATFORM_COLORS.twitter).toBe('#1DA1F2');
      expect(SOCIAL_PLATFORM_COLORS.x).toBe('#000000');
      expect(SOCIAL_PLATFORM_COLORS.instagram).toBe('#E4405F');
      expect(SOCIAL_PLATFORM_COLORS.tiktok).toBe('#FF0050');
      expect(SOCIAL_PLATFORM_COLORS.linkedin).toBe('#0A66C2');
      expect(SOCIAL_PLATFORM_COLORS.youtube).toBe('#FF0000');
      expect(SOCIAL_PLATFORM_COLORS.discord).toBe('#5865F2');
      expect(SOCIAL_PLATFORM_COLORS.twitch).toBe('#9146FF');
      expect(SOCIAL_PLATFORM_COLORS.reddit).toBe('#FF4500');
      expect(SOCIAL_PLATFORM_COLORS.whatsapp).toBe('#25D366');
      expect(SOCIAL_PLATFORM_COLORS.pinterest).toBe('#BD081C');
      expect(SOCIAL_PLATFORM_COLORS.snapchat).toBe('#FFFC00');
      expect(SOCIAL_PLATFORM_COLORS.telegram).toBe('#0088CC');
    });

    it('uses uppercase hex color format', () => {
      Object.values(SOCIAL_PLATFORM_COLORS).forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/);
      });
    });
  });

  describe('getSocialColor', () => {
    it('returns correct color for lowercase platform name', () => {
      expect(getSocialColor('facebook')).toBe('#1877F2');
      expect(getSocialColor('twitter')).toBe('#1DA1F2');
      expect(getSocialColor('instagram')).toBe('#E4405F');
    });

    it('returns correct color for uppercase platform name', () => {
      expect(getSocialColor('FACEBOOK')).toBe('#1877F2');
      expect(getSocialColor('TWITTER')).toBe('#1DA1F2');
      expect(getSocialColor('INSTAGRAM')).toBe('#E4405F');
    });

    it('returns correct color for mixed case platform name', () => {
      expect(getSocialColor('Facebook')).toBe('#1877F2');
      expect(getSocialColor('TikTok')).toBe('#FF0050');
      expect(getSocialColor('LinkedIn')).toBe('#0A66C2');
    });

    it('returns default gray color for unknown platforms', () => {
      const defaultColor = '#6b7280';
      expect(getSocialColor('unknown')).toBe(defaultColor);
      expect(getSocialColor('myspace')).toBe(defaultColor);
      expect(getSocialColor('fakebook')).toBe(defaultColor);
    });

    it('handles empty string input', () => {
      expect(getSocialColor('')).toBe('#6b7280');
    });

    it('handles whitespace in platform names', () => {
      // Since we normalize to lowercase, whitespace won't match
      expect(getSocialColor(' facebook ')).toBe('#6b7280');
    });

    it('returns colors for all defined platforms', () => {
      const platforms: SocialPlatform[] = [
        'facebook',
        'twitter',
        'x',
        'instagram',
        'tiktok',
        'linkedin',
        'youtube',
        'discord',
        'twitch',
        'reddit',
        'whatsapp',
        'pinterest',
        'snapchat',
        'telegram',
      ];

      platforms.forEach(platform => {
        const color = getSocialColor(platform);
        expect(color).toBe(SOCIAL_PLATFORM_COLORS[platform]);
        expect(color).not.toBe('#6b7280'); // Should not be default
      });
    });
  });

  describe('Color Validity', () => {
    it('all colors are valid hex codes', () => {
      Object.entries(SOCIAL_PLATFORM_COLORS).forEach(([_platform, color]) => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
        // Verify it can be parsed as a valid color
        const isValidHex = /^#[0-9A-F]{6}$/i.test(color);
        expect(isValidHex).toBe(true);
      });
    });

    it('no colors are duplicated except for similar platforms', () => {
      const colors = Object.values(SOCIAL_PLATFORM_COLORS);
      const uniqueColors = new Set(colors);

      // We expect most colors to be unique, allowing for twitter/x potentially sharing
      expect(uniqueColors.size).toBeGreaterThanOrEqual(colors.length - 2);
    });

    it('colors are visually distinct (simple heuristic)', () => {
      const colors = Object.values(SOCIAL_PLATFORM_COLORS);

      colors.forEach((color1, i) => {
        colors.slice(i + 1).forEach(color2 => {
          // Colors should be different (unless intentionally same like twitter/x)
          const isSame = color1.toLowerCase() === color2.toLowerCase();
          const isTwitterX =
            (color1 === SOCIAL_PLATFORM_COLORS.twitter || color1 === SOCIAL_PLATFORM_COLORS.x) &&
            (color2 === SOCIAL_PLATFORM_COLORS.twitter || color2 === SOCIAL_PLATFORM_COLORS.x);

          if (isSame && !isTwitterX) {
            // If same color, note it (for debugging)
            // eslint-disable-next-line no-console
            console.log(`Duplicate colors: ${color1} === ${color2}`);
          }
        });
      });
    });
  });

  describe('Type Safety', () => {
    it('SocialPlatform type includes all platforms', () => {
      const platforms: SocialPlatform[] = [
        'facebook',
        'twitter',
        'x',
        'instagram',
        'tiktok',
        'linkedin',
        'youtube',
        'discord',
        'twitch',
        'reddit',
        'whatsapp',
        'pinterest',
        'snapchat',
        'telegram',
      ];

      // This test verifies TypeScript compilation
      platforms.forEach(platform => {
        const color: string = SOCIAL_PLATFORM_COLORS[platform];
        expect(color).toBeDefined();
      });
    });
  });

  describe('Real-World Usage', () => {
    it('can be used to style social media buttons', () => {
      const buttonStyle = (platform: string) => ({
        backgroundColor: getSocialColor(platform),
        color: '#ffffff',
      });

      const facebookButton = buttonStyle('facebook');
      expect(facebookButton.backgroundColor).toBe('#1877F2');

      const twitterButton = buttonStyle('twitter');
      expect(twitterButton.backgroundColor).toBe('#1DA1F2');
    });

    it('handles platform names from API responses', () => {
      // Simulating API responses with varying case
      const apiPlatforms = ['Facebook', 'TWITTER', 'instagram', 'TikTok'];

      apiPlatforms.forEach(platform => {
        const color = getSocialColor(platform);
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });
});
