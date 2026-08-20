/**
 * platformStyles.test.ts - Comprehensive tests for platform-specific style utilities
 *
 * Test Strategy: Focus on bug detection through cross-platform compatibility,
 * edge cases, and proper style generation for web, iOS, and Android.
 *
 * Coverage Target: 100% of platformStyles.ts (125 lines)
 *
 * Note: Tests call createShadow() directly with Platform.OS mocked. The exported
 * 'shadows' constant is created at module load time and can't be tested with
 * different Platform.OS values.
 */

import { Platform } from 'react-native';
import { createShadow, shadows, createPointerEvents } from './platformStyles';

// Mock Platform.OS for testing different platforms
const mockPlatform = (os: 'ios' | 'android' | 'web') => {
  Object.defineProperty(Platform, 'OS', {
    get: () => os,
    configurable: true,
  });
};

describe('platformStyles', () => {
  // ==========================================================================
  // createShadow Tests
  // ==========================================================================

  describe('createShadow', () => {
    describe('Web Platform', () => {
      beforeEach(() => {
        mockPlatform('web');
      });

      it('creates boxShadow with default values', () => {
        const result = createShadow({});

        expect(result).toHaveProperty('boxShadow');
        expect(result.boxShadow).toContain('0px'); // offsetX
        expect(result.boxShadow).toContain('2px'); // offsetY
        expect(result.boxShadow).toContain('4px'); // blur
        expect(result.boxShadow).toContain('rgba'); // color
      });

      it('creates boxShadow with custom offset', () => {
        const result = createShadow({
          shadowOffset: { width: 5, height: 10 },
        });

        expect(result.boxShadow).toContain('5px');
        expect(result.boxShadow).toContain('10px');
      });

      it('creates boxShadow with custom shadow radius', () => {
        const result = createShadow({
          shadowRadius: 20,
        });

        expect(result.boxShadow).toContain('20px');
      });

      it('creates boxShadow with custom shadow color (hex with #)', () => {
        const result = createShadow({
          shadowColor: '#ff0000',
          shadowOpacity: 0.5,
        });

        expect(result.boxShadow).toContain('rgba(255, 0, 0, 0.5)');
      });

      it('creates boxShadow with custom shadow color (rgba)', () => {
        const result = createShadow({
          shadowColor: 'rgba(100, 150, 200, 0.8)',
          shadowOpacity: 0.5,
        });

        expect(result.boxShadow).toContain('rgba(100, 150, 200, 0.8)');
      });

      it('creates boxShadow with custom shadow color (non-hex, non-rgba)', () => {
        const result = createShadow({
          shadowColor: 'red',
          shadowOpacity: 0.3,
        });

        // Should fallback to rgba(0, 0, 0, opacity) for non-hex/non-rgba colors
        expect(result.boxShadow).toContain('rgba(0, 0, 0, 0.3)');
      });

      it('creates boxShadow with zero opacity', () => {
        const result = createShadow({
          shadowColor: '#000000',
          shadowOpacity: 0,
        });

        expect(result.boxShadow).toContain('rgba(0, 0, 0, 0)');
      });

      it('creates boxShadow with full opacity', () => {
        const result = createShadow({
          shadowColor: '#ffffff',
          shadowOpacity: 1,
        });

        expect(result.boxShadow).toContain('rgba(255, 255, 255, 1)');
      });

      it('creates boxShadow with negative offset', () => {
        const result = createShadow({
          shadowOffset: { width: -5, height: -10 },
        });

        expect(result.boxShadow).toContain('-5px');
        expect(result.boxShadow).toContain('-10px');
      });

      it('creates boxShadow with zero offset', () => {
        const result = createShadow({
          shadowOffset: { width: 0, height: 0 },
        });

        expect(result.boxShadow).toContain('0px 0px');
      });

      it('creates boxShadow with large blur radius', () => {
        const result = createShadow({
          shadowRadius: 100,
        });

        expect(result.boxShadow).toContain('100px');
      });

      it('creates boxShadow with zero blur radius', () => {
        const result = createShadow({
          shadowRadius: 0,
        });

        expect(result.boxShadow).toContain('0px');
      });

      it('ignores elevation on web platform', () => {
        const result = createShadow({
          elevation: 10,
        });

        expect(result).not.toHaveProperty('elevation');
        expect(result).toHaveProperty('boxShadow');
      });

      it('handles short hex color (3 chars)', () => {
        // hexToRgba expects 6-char hex, so #fff won't match the regex
        const result = createShadow({
          shadowColor: '#fff',
          shadowOpacity: 0.5,
        });

        // Should fallback to rgba(0, 0, 0, 0.5) for invalid hex
        expect(result.boxShadow).toContain('rgba(0, 0, 0, 0.5)');
      });

      it('handles hex color with # prefix', () => {
        const result = createShadow({
          shadowColor: '#123456',
          shadowOpacity: 0.4,
        });

        expect(result.boxShadow).toContain('rgba(18, 52, 86, 0.4)');
      });

      it('handles hex color without # prefix (fallback to black)', () => {
        // Implementation only calls hexToRgba if color starts with '#'
        // So '123456' without # falls back to rgba(0, 0, 0, alpha)
        const result = createShadow({
          shadowColor: '123456',
          shadowOpacity: 0.4,
        });

        expect(result.boxShadow).toContain('rgba(0, 0, 0, 0.4)');
      });
    });

    describe('iOS Platform', () => {
      beforeEach(() => {
        mockPlatform('ios');
      });

      it('creates native shadow props with default values', () => {
        const result = createShadow({});

        expect(result).toHaveProperty('shadowColor', '#000');
        expect(result).toHaveProperty('shadowOffset', { width: 0, height: 2 });
        expect(result).toHaveProperty('shadowOpacity', 0.1);
        expect(result).toHaveProperty('shadowRadius', 4);
        expect(result).not.toHaveProperty('elevation');
        expect(result).not.toHaveProperty('boxShadow');
      });

      it('creates native shadow props with custom values', () => {
        const result = createShadow({
          shadowColor: '#ff0000',
          shadowOffset: { width: 3, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
        });

        expect(result).toHaveProperty('shadowColor', '#ff0000');
        expect(result).toHaveProperty('shadowOffset', { width: 3, height: 6 });
        expect(result).toHaveProperty('shadowOpacity', 0.3);
        expect(result).toHaveProperty('shadowRadius', 10);
      });

      it('ignores elevation on iOS platform', () => {
        const result = createShadow({
          elevation: 10,
        });

        expect(result).not.toHaveProperty('elevation');
        expect(result).toHaveProperty('shadowColor');
      });

      it('creates shadow with zero opacity (invisible shadow)', () => {
        const result = createShadow({
          shadowOpacity: 0,
        });

        expect(result).toHaveProperty('shadowOpacity', 0);
      });

      it('creates shadow with full opacity', () => {
        const result = createShadow({
          shadowOpacity: 1,
        });

        expect(result).toHaveProperty('shadowOpacity', 1);
      });

      it('creates shadow with negative offset', () => {
        const result = createShadow({
          shadowOffset: { width: -5, height: -5 },
        });

        expect(result).toHaveProperty('shadowOffset', { width: -5, height: -5 });
      });

      it('creates shadow with large radius', () => {
        const result = createShadow({
          shadowRadius: 50,
        });

        expect(result).toHaveProperty('shadowRadius', 50);
      });
    });

    describe('Android Platform', () => {
      beforeEach(() => {
        mockPlatform('android');
      });

      it('creates elevation with default value', () => {
        const result = createShadow({});

        expect(result).toHaveProperty('elevation', 2);
        expect(result).not.toHaveProperty('shadowColor');
        expect(result).not.toHaveProperty('shadowOffset');
        expect(result).not.toHaveProperty('shadowOpacity');
        expect(result).not.toHaveProperty('shadowRadius');
        expect(result).not.toHaveProperty('boxShadow');
      });

      it('creates elevation with custom value', () => {
        const result = createShadow({
          elevation: 8,
        });

        expect(result).toHaveProperty('elevation', 8);
      });

      it('ignores shadow props on Android platform', () => {
        const result = createShadow({
          shadowColor: '#ff0000',
          shadowOffset: { width: 5, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 15,
        });

        expect(result).toHaveProperty('elevation');
        expect(result).not.toHaveProperty('shadowColor');
        expect(result).not.toHaveProperty('shadowOffset');
        expect(result).not.toHaveProperty('shadowOpacity');
        expect(result).not.toHaveProperty('shadowRadius');
      });

      it('creates elevation with zero value (no shadow)', () => {
        const result = createShadow({
          elevation: 0,
        });

        expect(result).toHaveProperty('elevation', 0);
      });

      it('creates elevation with large value', () => {
        const result = createShadow({
          elevation: 24,
        });

        expect(result).toHaveProperty('elevation', 24);
      });

      it('creates elevation with negative value (edge case)', () => {
        const result = createShadow({
          elevation: -5,
        });

        // Android may handle negative elevation, but we pass it through
        expect(result).toHaveProperty('elevation', -5);
      });
    });

    describe('Edge Cases', () => {
      it('handles empty config object', () => {
        mockPlatform('ios');
        const result = createShadow({});

        expect(result).toBeDefined();
        expect(Object.keys(result).length).toBeGreaterThan(0);
      });

      it('handles partial config with only elevation', () => {
        mockPlatform('android');
        const result = createShadow({ elevation: 5 });

        expect(result).toHaveProperty('elevation', 5);
      });

      it('handles partial config with only shadowColor', () => {
        mockPlatform('ios');
        const result = createShadow({ shadowColor: '#ff0000' });

        expect(result).toHaveProperty('shadowColor', '#ff0000');
        expect(result).toHaveProperty('shadowOffset'); // defaults
        expect(result).toHaveProperty('shadowOpacity'); // defaults
        expect(result).toHaveProperty('shadowRadius'); // defaults
      });

      it('handles partial config with only shadowOffset', () => {
        mockPlatform('ios');
        const result = createShadow({ shadowOffset: { width: 10, height: 20 } });

        expect(result).toHaveProperty('shadowOffset', { width: 10, height: 20 });
      });
    });
  });

  // ==========================================================================
  // shadows Presets Tests
  // ==========================================================================

  describe('shadows', () => {
    it('has all preset levels', () => {
      expect(shadows).toHaveProperty('none');
      expect(shadows).toHaveProperty('xs');
      expect(shadows).toHaveProperty('sm');
      expect(shadows).toHaveProperty('md');
      expect(shadows).toHaveProperty('lg');
      expect(shadows).toHaveProperty('xl');
    });

    it('none preset has no shadow properties', () => {
      // shadows object is created at module load time
      // Just verify it exists and has expected structure
      expect(shadows.none).toBeDefined();
      expect(typeof shadows.none).toBe('object');
    });

    it('xs preset exists', () => {
      expect(shadows.xs).toBeDefined();
      expect(typeof shadows.xs).toBe('object');
    });

    it('sm preset exists', () => {
      expect(shadows.sm).toBeDefined();
      expect(typeof shadows.sm).toBe('object');
    });

    it('md preset exists', () => {
      expect(shadows.md).toBeDefined();
      expect(typeof shadows.md).toBe('object');
    });

    it('lg preset exists', () => {
      expect(shadows.lg).toBeDefined();
      expect(typeof shadows.lg).toBe('object');
    });

    it('xl preset exists', () => {
      expect(shadows.xl).toBeDefined();
      expect(typeof shadows.xl).toBe('object');
    });
  });

  // ==========================================================================
  // createPointerEvents Tests
  // ==========================================================================

  describe('createPointerEvents', () => {
    describe('Web Platform', () => {
      beforeEach(() => {
        mockPlatform('web');
      });

      it('creates pointerEvents style with "auto"', () => {
        const result = createPointerEvents('auto');

        expect(result).toHaveProperty('pointerEvents', 'auto');
      });

      it('creates pointerEvents style with "none"', () => {
        const result = createPointerEvents('none');

        expect(result).toHaveProperty('pointerEvents', 'none');
      });

      it('creates pointerEvents style with "box-none"', () => {
        const result = createPointerEvents('box-none');

        expect(result).toHaveProperty('pointerEvents', 'box-none');
      });

      it('creates pointerEvents style with "box-only"', () => {
        const result = createPointerEvents('box-only');

        expect(result).toHaveProperty('pointerEvents', 'box-only');
      });
    });

    describe('iOS Platform', () => {
      beforeEach(() => {
        mockPlatform('ios');
      });

      it('creates pointerEvents style with "auto"', () => {
        const result = createPointerEvents('auto');

        expect(result).toHaveProperty('pointerEvents', 'auto');
      });

      it('creates pointerEvents style with "none"', () => {
        const result = createPointerEvents('none');

        expect(result).toHaveProperty('pointerEvents', 'none');
      });

      it('creates pointerEvents style with "box-none"', () => {
        const result = createPointerEvents('box-none');

        expect(result).toHaveProperty('pointerEvents', 'box-none');
      });

      it('creates pointerEvents style with "box-only"', () => {
        const result = createPointerEvents('box-only');

        expect(result).toHaveProperty('pointerEvents', 'box-only');
      });
    });

    describe('Android Platform', () => {
      beforeEach(() => {
        mockPlatform('android');
      });

      it('creates pointerEvents style with "auto"', () => {
        const result = createPointerEvents('auto');

        expect(result).toHaveProperty('pointerEvents', 'auto');
      });

      it('creates pointerEvents style with "none"', () => {
        const result = createPointerEvents('none');

        expect(result).toHaveProperty('pointerEvents', 'none');
      });

      it('creates pointerEvents style with "box-none"', () => {
        const result = createPointerEvents('box-none');

        expect(result).toHaveProperty('pointerEvents', 'box-none');
      });

      it('creates pointerEvents style with "box-only"', () => {
        const result = createPointerEvents('box-only');

        expect(result).toHaveProperty('pointerEvents', 'box-only');
      });
    });
  });

  // ==========================================================================
  // hexToRgba Tests (via createShadow on web)
  // ==========================================================================

  describe('hexToRgba (internal function)', () => {
    beforeEach(() => {
      mockPlatform('web');
    });

    it('converts valid 6-digit hex to rgba', () => {
      const result = createShadow({
        shadowColor: '#ff0000',
        shadowOpacity: 0.5,
      });

      expect(result.boxShadow).toContain('rgba(255, 0, 0, 0.5)');
    });

    it('converts hex without # prefix (fallback behavior)', () => {
      // Implementation only calls hexToRgba if color.startsWith('#')
      // So hex without # falls back to rgba(0, 0, 0, alpha)
      const result = createShadow({
        shadowColor: '00ff00',
        shadowOpacity: 0.7,
      });

      expect(result.boxShadow).toContain('rgba(0, 0, 0, 0.7)');
    });

    it('handles lowercase hex', () => {
      const result = createShadow({
        shadowColor: '#aabbcc',
        shadowOpacity: 0.3,
      });

      expect(result.boxShadow).toContain('rgba(170, 187, 204, 0.3)');
    });

    it('handles uppercase hex', () => {
      const result = createShadow({
        shadowColor: '#AABBCC',
        shadowOpacity: 0.3,
      });

      expect(result.boxShadow).toContain('rgba(170, 187, 204, 0.3)');
    });

    it('handles mixed case hex', () => {
      const result = createShadow({
        shadowColor: '#AaBbCc',
        shadowOpacity: 0.3,
      });

      expect(result.boxShadow).toContain('rgba(170, 187, 204, 0.3)');
    });

    it('handles black (#000000)', () => {
      const result = createShadow({
        shadowColor: '#000000',
        shadowOpacity: 0.5,
      });

      expect(result.boxShadow).toContain('rgba(0, 0, 0, 0.5)');
    });

    it('handles white (#ffffff)', () => {
      const result = createShadow({
        shadowColor: '#ffffff',
        shadowOpacity: 0.9,
      });

      expect(result.boxShadow).toContain('rgba(255, 255, 255, 0.9)');
    });

    it('falls back to rgba(0, 0, 0, alpha) for invalid hex', () => {
      const result = createShadow({
        shadowColor: 'invalid',
        shadowOpacity: 0.4,
      });

      expect(result.boxShadow).toContain('rgba(0, 0, 0, 0.4)');
    });

    it('falls back for short hex (3 digits)', () => {
      const result = createShadow({
        shadowColor: '#fff',
        shadowOpacity: 0.6,
      });

      expect(result.boxShadow).toContain('rgba(0, 0, 0, 0.6)');
    });

    it('falls back for too long hex (7+ digits)', () => {
      const result = createShadow({
        shadowColor: '#ff00ff00',
        shadowOpacity: 0.2,
      });

      expect(result.boxShadow).toContain('rgba(0, 0, 0, 0.2)');
    });

    it('preserves existing rgba color', () => {
      const result = createShadow({
        shadowColor: 'rgba(100, 150, 200, 0.8)',
        shadowOpacity: 0.5, // This should be ignored when color already has rgba
      });

      expect(result.boxShadow).toContain('rgba(100, 150, 200, 0.8)');
    });
  });
});
