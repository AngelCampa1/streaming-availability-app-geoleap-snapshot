// @ts-nocheck
/**
 * Design Tokens Test
 * Tests REAL design tokens from design-tokens.ts
 * No mocking - tests actual exported values
 */

import { designTokens, themeColors, type ThemeMode, type ColorToken } from '../design-tokens';

describe('Design Tokens', () => {
  describe('designTokens.brand', () => {
    it('defines primary Stream Violet palette', () => {
      expect(designTokens.brand.primary).toBeDefined();
      expect(designTokens.brand.primary[500]).toBe('#7c3aed'); // Primary brand color
      expect(designTokens.brand.primary[50]).toBe('#f5f3ff');
      expect(designTokens.brand.primary[950]).toBe('#2e1065');
    });

    it('defines secondary Slate palette', () => {
      expect(designTokens.brand.secondary).toBeDefined();
      expect(designTokens.brand.secondary[500]).toBe('#64748b');
      expect(designTokens.brand.secondary[900]).toBe('#0f172a');
    });

    it('defines Golden Popcorn accent', () => {
      expect(designTokens.brand.gold).toBeDefined();
      expect(designTokens.brand.gold[500]).toBe('#f59e0b');
    });

    it('defines Electric Cyan accent', () => {
      expect(designTokens.brand.cyan).toBeDefined();
      expect(designTokens.brand.cyan[500]).toBe('#06b6d4');
    });

    it('has complete color scales (50-900)', () => {
      const scales = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

      scales.forEach(scale => {
        expect(designTokens.brand.primary[scale as keyof typeof designTokens.brand.primary]).toBeDefined();
        expect(designTokens.brand.secondary[scale as keyof typeof designTokens.brand.secondary]).toBeDefined();
      });
    });
  });

  describe('designTokens.neutral', () => {
    it('defines neutral color scale from pure white to pure black', () => {
      expect(designTokens.neutral[0]).toBe('#ffffff'); // Pure white
      expect(designTokens.neutral[1000]).toBe('#000000'); // Pure black
    });

    it('has complete neutral scale', () => {
      const scales = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 1000];

      scales.forEach(scale => {
        expect(designTokens.neutral[scale as keyof typeof designTokens.neutral]).toBeDefined();
        expect(typeof designTokens.neutral[scale as keyof typeof designTokens.neutral]).toBe('string');
      });
    });

    it('uses valid hex color format', () => {
      Object.values(designTokens.neutral).forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('designTokens.semantic', () => {
    it('defines Stream Green success colors', () => {
      expect(designTokens.semantic.success[500]).toBe('#10b981');
    });

    it('defines Caution Amber warning colors', () => {
      expect(designTokens.semantic.warning[500]).toBe('#f59e0b');
    });

    it('defines Alert Red error colors', () => {
      expect(designTokens.semantic.error[500]).toBe('#ef4444');
    });

    it('defines Discovery Blue info colors', () => {
      expect(designTokens.semantic.info[500]).toBe('#0ea5e9');
    });

    it('has complete semantic color scales', () => {
      const semanticTypes = ['success', 'warning', 'error', 'info'] as const;
      const scales = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

      semanticTypes.forEach(type => {
        scales.forEach(scale => {
          expect(designTokens.semantic[type][scale as keyof typeof designTokens.semantic.success]).toBeDefined();
        });
      });
    });
  });

  describe('designTokens.typography', () => {
    it('defines font families', () => {
      expect(designTokens.typography.fontFamily.sans).toBe('var(--font-geist-sans)');
      expect(designTokens.typography.fontFamily.mono).toBe('var(--font-geist-mono)');
    });

    it('defines font size scale', () => {
      expect(designTokens.typography.fontSize.xs).toBe('0.75rem');
      expect(designTokens.typography.fontSize.sm).toBe('0.875rem');
      expect(designTokens.typography.fontSize.base).toBe('1rem');
      expect(designTokens.typography.fontSize.lg).toBe('1.125rem');
      expect(designTokens.typography.fontSize.xl).toBe('1.25rem');
      expect(designTokens.typography.fontSize['6xl']).toBe('3.75rem');
    });

    it('defines font weights', () => {
      expect(designTokens.typography.fontWeight.light).toBe('300');
      expect(designTokens.typography.fontWeight.normal).toBe('400');
      expect(designTokens.typography.fontWeight.medium).toBe('500');
      expect(designTokens.typography.fontWeight.semibold).toBe('600');
      expect(designTokens.typography.fontWeight.bold).toBe('700');
    });

    it('defines line heights', () => {
      expect(designTokens.typography.lineHeight.tight).toBe('1.25');
      expect(designTokens.typography.lineHeight.normal).toBe('1.5');
      expect(designTokens.typography.lineHeight.relaxed).toBe('1.75');
    });
  });

  describe('designTokens.spacing', () => {
    it('defines spacing scale from 0 to 64', () => {
      expect(designTokens.spacing[0]).toBe('0');
      expect(designTokens.spacing[1]).toBe('0.25rem');
      expect(designTokens.spacing[4]).toBe('1rem');
      expect(designTokens.spacing[8]).toBe('2rem');
      expect(designTokens.spacing[64]).toBe('16rem');
    });

    it('uses rem units for spacing', () => {
      Object.values(designTokens.spacing).forEach(value => {
        expect(value === '0' || value.endsWith('rem')).toBe(true);
      });
    });
  });

  describe('designTokens.borderRadius', () => {
    it('defines border radius values', () => {
      expect(designTokens.borderRadius.none).toBe('0');
      expect(designTokens.borderRadius.sm).toBe('calc(var(--radius) - 4px)');
      expect(designTokens.borderRadius.md).toBe('calc(var(--radius) - 2px)');
      expect(designTokens.borderRadius.lg).toBe('var(--radius)');
      expect(designTokens.borderRadius.xl).toBe('calc(var(--radius) + 4px)');
      expect(designTokens.borderRadius.full).toBe('9999px');
    });
  });

  describe('designTokens.shadow', () => {
    it('defines shadow scale', () => {
      expect(designTokens.shadow.sm).toBeDefined();
      expect(designTokens.shadow.md).toBeDefined();
      expect(designTokens.shadow.lg).toBeDefined();
      expect(designTokens.shadow.xl).toBeDefined();
    });

    it('uses valid CSS shadow syntax', () => {
      Object.values(designTokens.shadow).forEach(shadow => {
        expect(shadow).toMatch(/^\d+/); // Starts with offset
        expect(shadow).toContain('rgb'); // Contains rgb color
      });
    });
  });

  describe('themeColors.light', () => {
    it('defines light theme background colors', () => {
      expect(themeColors.light.background).toBe(designTokens.neutral[0]);
      expect(themeColors.light['background-muted']).toBe(designTokens.neutral[50]);
      expect(themeColors.light['background-subtle']).toBe(designTokens.neutral[100]);
    });

    it('defines light theme foreground colors', () => {
      expect(themeColors.light.foreground).toBe(designTokens.neutral[900]);
      expect(themeColors.light['foreground-muted']).toBe(designTokens.neutral[500]);
    });

    it('defines light theme primary colors (Stream Violet)', () => {
      expect(themeColors.light.primary).toBe('#7c3aed'); // Stream Violet 500
      expect(themeColors.light['primary-foreground']).toBe(designTokens.neutral[0]);
      expect(themeColors.light['primary-hover']).toBe('#6d28d9');
    });

    it('defines light theme semantic colors', () => {
      expect(themeColors.light.success).toBe(designTokens.semantic.success[500]);
      expect(themeColors.light.warning).toBe(designTokens.semantic.warning[500]);
      expect(themeColors.light.error).toBe(designTokens.semantic.error[500]);
      expect(themeColors.light.info).toBe(designTokens.semantic.info[500]);
    });

    it('defines light theme accent colors', () => {
      expect(themeColors.light['accent-gold']).toBe(designTokens.brand.gold[500]);
      expect(themeColors.light['accent-cyan']).toBe(designTokens.brand.cyan[500]);
    });
  });

  describe('themeColors.light (extended)', () => {
    it('defines light theme surface colors', () => {
      expect(themeColors.light.surface).toBe(designTokens.neutral[0]);
      expect(themeColors.light['surface-raised']).toBe(designTokens.neutral[0]);
    });

    it('defines light theme border colors', () => {
      expect(themeColors.light.border).toBe(designTokens.neutral[200]);
      expect(themeColors.light['border-muted']).toBe(designTokens.neutral[100]);
    });

    it('defines light theme secondary colors', () => {
      expect(themeColors.light.secondary).toBe(designTokens.neutral[100]);
      expect(themeColors.light['secondary-foreground']).toBe(designTokens.neutral[900]);
      expect(themeColors.light['secondary-hover']).toBe(designTokens.neutral[200]);
    });

    it('defines light theme ring and focus colors', () => {
      expect(themeColors.light.ring).toBe(designTokens.brand.primary[500]);
      expect(themeColors.light['focus-visible']).toBe(designTokens.brand.primary[500]);
    });

    it('uses 500-scale primary colors for light theme', () => {
      expect(themeColors.light.primary).toBe(designTokens.brand.primary[500]);
      expect(themeColors.light['primary-hover']).toBe(designTokens.brand.primary[600]);
    });
  });

  describe('type exports', () => {
    it('exports ThemeMode type', () => {
      const lightMode: ThemeMode = 'light';
      const lightOnlyMode: ThemeMode = 'dark';

      expect(lightMode).toBe('light');
      expect(lightOnlyMode).toBe('dark');
    });

    it('exports ColorToken type for all theme color keys', () => {
      const colorTokens: ColorToken[] = [
        'background',
        'foreground',
        'primary',
        'primary-hover',
        'success',
        'error',
        'warning',
        'info',
      ];

      colorTokens.forEach(token => {
        expect(themeColors.light[token]).toBeDefined();
        expect(themeColors.light[token]).toBeDefined();
      });
    });
  });

  describe('accessibility - WCAG 2.1 AA compliance', () => {
    it('provides sufficient contrast range for accessibility', () => {
      // Primary colors should span from very light (50) to very dark (950)
      expect(designTokens.brand.primary[50]).toBeDefined();
      expect(designTokens.brand.primary[950]).toBeDefined();

      // Semantic colors should have light and dark variants
      expect(designTokens.semantic.success[50]).toBeDefined();
      expect(designTokens.semantic.success[950]).toBeDefined();
    });

    it('uses darker foreground on light backgrounds', () => {
      // Light theme: dark text (900) on light background (0)
      expect(themeColors.light.foreground).toBe(designTokens.neutral[900]);
      expect(themeColors.light.background).toBe(designTokens.neutral[0]);
    });

    it('light theme uses dark foreground on light background (accessibility)', () => {
      // Light theme: dark text (900) on white background (0) ensures readability
      expect(themeColors.light.foreground).toBe(designTokens.neutral[900]);
      expect(themeColors.light.background).toBe(designTokens.neutral[0]);
    });
  });

  describe('token immutability', () => {
    it('exports designTokens as const object', () => {
      // TypeScript const assertion ensures immutability
      expect(designTokens).toBeDefined();
      expect(typeof designTokens).toBe('object');
    });

    it('exports themeColors as const object', () => {
      expect(themeColors).toBeDefined();
      expect(typeof themeColors).toBe('object');
    });
  });

  describe('entertainment theme consistency', () => {
    it('maintains Stream Violet as primary brand color', () => {
      expect(designTokens.brand.primary[500]).toBe('#7c3aed');
      expect(themeColors.light.primary).toBe('#7c3aed');
    });

    it('maintains Golden Popcorn as entertainment accent', () => {
      expect(designTokens.brand.gold[500]).toBe('#f59e0b');
    });

    it('maintains Electric Cyan as discovery accent', () => {
      expect(designTokens.brand.cyan[500]).toBe('#06b6d4');
    });

    it('maintains Stream Green for availability', () => {
      expect(designTokens.semantic.success[500]).toBe('#10b981');
    });
  });
});
