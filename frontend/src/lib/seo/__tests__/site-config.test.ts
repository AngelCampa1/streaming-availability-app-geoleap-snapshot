import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  CURRENT_YEAR,
  PROGRAMMATIC_PAGES_LAST_UPDATED,
  LAST_UPDATED,
  SOCIAL_LINKS,
  BRAND_COLORS,
  formatLastUpdated,
} from '../site-config';

describe('site-config', () => {
  describe('SITE_URL', () => {
    it('defaults to geoleap.app when env var is not set', () => {
      // When NEXT_PUBLIC_SITE_URL is not set, it should use geoleap.app
      expect(SITE_URL).toContain('geoleap.app');
    });

    it('does not use geoleap.com', () => {
      expect(SITE_URL).not.toContain('geoleap.com');
    });
  });

  describe('SITE_NAME', () => {
    it('is GeoLeap', () => {
      expect(SITE_NAME).toBe('GeoLeap');
    });
  });

  describe('SITE_DESCRIPTION', () => {
    it('mentions streaming', () => {
      expect(SITE_DESCRIPTION.toLowerCase()).toContain('stream');
    });

    it('mentions streaming services', () => {
      expect(SITE_DESCRIPTION.toLowerCase()).toContain('streaming services');
    });
  });

  describe('CURRENT_YEAR', () => {
    it('is the verified SEO content year', () => {
      expect(CURRENT_YEAR).toBe(2026);
    });

    it('is a number', () => {
      expect(typeof CURRENT_YEAR).toBe('number');
    });
  });

  describe('PROGRAMMATIC_PAGES_LAST_UPDATED', () => {
    it('is a valid date string', () => {
      expect(() => new Date(PROGRAMMATIC_PAGES_LAST_UPDATED)).not.toThrow();
      expect(new Date(PROGRAMMATIC_PAGES_LAST_UPDATED).toISOString()).toBeTruthy();
    });
  });

  describe('LAST_UPDATED', () => {
    it('has all required category keys', () => {
      expect(LAST_UPDATED).toHaveProperty('platforms');
      expect(LAST_UPDATED).toHaveProperty('countries');
      expect(LAST_UPDATED).toHaveProperty('comparisons');
      expect(LAST_UPDATED).toHaveProperty('sports');
      expect(LAST_UPDATED).toHaveProperty('genres');
      expect(LAST_UPDATED).toHaveProperty('guides');
      expect(LAST_UPDATED).toHaveProperty('glossary');
      expect(LAST_UPDATED).toHaveProperty('howToWatch');
    });

    it('all values are valid date strings', () => {
      for (const value of Object.values(LAST_UPDATED)) {
        expect(() => new Date(value)).not.toThrow();
        expect(new Date(value).getFullYear()).toBeGreaterThanOrEqual(2026);
      }
    });
  });

  describe('SOCIAL_LINKS', () => {
    it('has twitter link', () => {
      expect(SOCIAL_LINKS.twitter).toContain('twitter.com');
    });

    it('has instagram link', () => {
      expect(SOCIAL_LINKS.instagram).toContain('instagram.com');
    });
  });

  describe('BRAND_COLORS', () => {
    it('has violet color', () => {
      expect(BRAND_COLORS.violet).toBe('#7c3aed');
    });

    it('has amber color', () => {
      expect(BRAND_COLORS.amber).toBe('#f59e0b');
    });

    it('has cyan color', () => {
      expect(BRAND_COLORS.cyan).toBe('#06b6d4');
    });

    it('has green color', () => {
      expect(BRAND_COLORS.green).toBe('#10b981');
    });
  });

  describe('formatLastUpdated', () => {
    it('returns an ISO string', () => {
      const result = formatLastUpdated('2026-03-15');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('parses a date string correctly', () => {
      const result = formatLastUpdated('2026-03-15');
      expect(new Date(result).getFullYear()).toBe(2026);
    });
  });
});
