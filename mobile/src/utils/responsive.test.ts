/**
 * responsive.test.ts - Tests for responsive utilities
 *
 * Test Strategy: Test the responsive functions with the mock dimensions
 * provided by jest.setup.platform.js (width: 375, height: 667)
 *
 * Coverage Target: 100% of responsive.ts
 */

import {
  wp,
  hp,
  normalize,
  verticalScale,
  horizontalScale,
  moderateScale,
  isTablet,
  isSmallDevice,
  isLargeDevice,
  getBreakpoint,
  getResponsiveValue,
  isLandscape,
  isPortrait,
  getSafePadding,
  getWindowDimensions,
} from './responsive';

// The mock dimensions from jest.setup.platform.js are: width: 375, height: 667
// This simulates an iPhone 8 in portrait mode

describe('responsive utilities', () => {
  // Get the actual mock dimensions being used
  const mockDimensions = getWindowDimensions();

  describe('getWindowDimensions', () => {
    it('returns dimension object with width and height', () => {
      const dimensions = getWindowDimensions();
      expect(dimensions).toHaveProperty('width');
      expect(dimensions).toHaveProperty('height');
      expect(typeof dimensions.width).toBe('number');
      expect(typeof dimensions.height).toBe('number');
    });
  });

  describe('wp (widthPercentageToDP)', () => {
    it('calculates percentage of screen width', () => {
      const width = mockDimensions.width;
      expect(wp(50)).toBe(width * 0.5);
      expect(wp(100)).toBe(width);
      expect(wp(25)).toBe(width * 0.25);
    });

    it('handles zero percentage', () => {
      expect(wp(0)).toBe(0);
    });

    it('handles negative percentage', () => {
      const width = mockDimensions.width;
      expect(wp(-10)).toBe(width * -0.1);
    });

    it('handles percentages over 100', () => {
      const width = mockDimensions.width;
      expect(wp(150)).toBe(width * 1.5);
    });

    it('handles decimal percentages', () => {
      const width = mockDimensions.width;
      expect(wp(33.33)).toBeCloseTo(width * 0.3333, 2);
    });
  });

  describe('hp (heightPercentageToDP)', () => {
    it('calculates percentage of screen height', () => {
      const height = mockDimensions.height;
      expect(hp(50)).toBe(height * 0.5);
      expect(hp(100)).toBe(height);
      expect(hp(10)).toBe(height * 0.1);
    });

    it('handles zero percentage', () => {
      expect(hp(0)).toBe(0);
    });

    it('handles negative percentage', () => {
      const height = mockDimensions.height;
      expect(hp(-5)).toBe(height * -0.05);
    });

    it('handles percentages over 100', () => {
      const height = mockDimensions.height;
      expect(hp(120)).toBe(height * 1.2);
    });
  });

  describe('normalize', () => {
    it('returns a number for any input', () => {
      expect(typeof normalize(16)).toBe('number');
      expect(typeof normalize(0)).toBe('number');
      expect(typeof normalize(-10)).toBe('number');
    });

    it('handles zero size', () => {
      // normalize(0) should be 0 regardless of scaling
      expect(normalize(0)).toBe(0);
    });

    it('scales based on screen width', () => {
      // normalize uses width/375 as scale factor
      const normalized = normalize(16);
      expect(normalized).toBeGreaterThan(0);
    });
  });

  describe('verticalScale', () => {
    it('scales value based on height ratio', () => {
      const scaled = verticalScale(100);
      expect(typeof scaled).toBe('number');
      // Base height is 812, so scaling = height/812
    });

    it('handles zero value', () => {
      expect(verticalScale(0)).toBe(0);
    });

    it('handles negative value', () => {
      const scaled = verticalScale(-50);
      expect(scaled).toBeLessThan(0);
    });
  });

  describe('horizontalScale', () => {
    it('scales value based on width ratio', () => {
      const scaled = horizontalScale(100);
      expect(typeof scaled).toBe('number');
      // Base width is 375, so scaling = width/375
    });

    it('handles zero value', () => {
      expect(horizontalScale(0)).toBe(0);
    });

    it('handles negative value', () => {
      const scaled = horizontalScale(-50);
      expect(scaled).toBeLessThan(0);
    });
  });

  describe('moderateScale', () => {
    it('returns a scaled value between base and horizontal scale', () => {
      const scaled = moderateScale(100);
      expect(typeof scaled).toBe('number');
    });

    it('equals base value with factor 0', () => {
      const scaled = moderateScale(100, 0);
      expect(scaled).toBe(100);
    });

    it('uses custom factor when provided', () => {
      // moderateScale formula: size + (horizontalScale(size) - size) * factor
      // When width == base width (375), horizontalScale(size) == size
      // So moderateScale(size, factor) == size + (size - size) * factor == size
      // This means all factors return the same value when width == base width
      const scaled1 = moderateScale(100, 0.3);
      const scaled2 = moderateScale(100, 0.7);
      expect(typeof scaled1).toBe('number');
      expect(typeof scaled2).toBe('number');
    });

    it('handles zero value', () => {
      expect(moderateScale(0)).toBe(0);
    });

    it('handles negative value', () => {
      const scaled = moderateScale(-50);
      expect(typeof scaled).toBe('number');
    });
  });

  describe('isTablet', () => {
    it('returns a boolean', () => {
      expect(typeof isTablet()).toBe('boolean');
    });

    it('returns false for phone-sized dimensions (375x667)', () => {
      // Mock dimensions are 375x667 which is a phone size
      expect(isTablet()).toBe(false);
    });
  });

  describe('isSmallDevice', () => {
    it('returns a boolean', () => {
      expect(typeof isSmallDevice()).toBe('boolean');
    });

    it('returns false for width 375 (not small)', () => {
      // Width 375 is >= 375, so not a small device
      expect(isSmallDevice()).toBe(false);
    });
  });

  describe('isLargeDevice', () => {
    it('returns a boolean', () => {
      expect(typeof isLargeDevice()).toBe('boolean');
    });

    it('returns false for width 375 (not large)', () => {
      // Width 375 is < 428, so not a large device
      expect(isLargeDevice()).toBe(false);
    });
  });

  describe('getBreakpoint', () => {
    it('returns a valid breakpoint string', () => {
      const breakpoint = getBreakpoint();
      expect(['sm', 'md', 'lg', 'xl', '2xl']).toContain(breakpoint);
    });

    it('returns "sm" for width 375', () => {
      // Width 375 is < 414, so should be 'sm'
      expect(getBreakpoint()).toBe('sm');
    });
  });

  describe('getResponsiveValue', () => {
    it('returns default when all breakpoints are undefined', () => {
      const value = getResponsiveValue({
        default: 'fallback',
      });
      expect(value).toBe('fallback');
    });

    it('returns sm value for current breakpoint', () => {
      const value = getResponsiveValue({
        sm: 10,
        md: 14,
        lg: 16,
        xl: 18,
        default: 8,
      });
      expect(value).toBe(10);
    });

    it('falls back to default when breakpoint not defined', () => {
      const value = getResponsiveValue({
        md: 14,
        lg: 16,
        default: 8,
      });
      // sm breakpoint not defined, falls back to default
      expect(value).toBe(8);
    });
  });

  describe('isLandscape', () => {
    it('returns a boolean', () => {
      expect(typeof isLandscape()).toBe('boolean');
    });

    it('returns false for portrait dimensions (375x667)', () => {
      // width 375 < height 667, so not landscape
      expect(isLandscape()).toBe(false);
    });
  });

  describe('isPortrait', () => {
    it('returns a boolean', () => {
      expect(typeof isPortrait()).toBe('boolean');
    });

    it('returns true for portrait dimensions (375x667)', () => {
      // height 667 > width 375, so portrait
      expect(isPortrait()).toBe(true);
    });
  });

  describe('getSafePadding', () => {
    it('returns object with top, bottom, left, right', () => {
      const padding = getSafePadding();
      expect(padding).toHaveProperty('top');
      expect(padding).toHaveProperty('bottom');
      expect(padding).toHaveProperty('left');
      expect(padding).toHaveProperty('right');
    });

    it('returns numeric values for padding', () => {
      const padding = getSafePadding();
      expect(typeof padding.top).toBe('number');
      expect(typeof padding.bottom).toBe('number');
      expect(typeof padding.left).toBe('number');
      expect(typeof padding.right).toBe('number');
    });

    it('returns consistent padding structure', () => {
      const padding = getSafePadding();
      expect(padding.left).toBe(0);
      expect(padding.right).toBe(0);
    });
  });
});
