import { countries, getCountryBySlug, getCountryByIso } from '../countries';
import { platforms } from '../platforms';

describe('countries data', () => {
  it('has at least 30 countries', () => {
    expect(countries.length).toBeGreaterThanOrEqual(30);
  });

  it('has no duplicate slugs', () => {
    const slugs = countries.map(c => c.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it('has no duplicate ISO codes', () => {
    const isos = countries.map(c => c.iso);
    const unique = new Set(isos);
    expect(unique.size).toBe(isos.length);
  });

  it('all countries have required fields', () => {
    countries.forEach(c => {
      expect(c.slug).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.iso).toBeTruthy();
      expect(c.region).toBeTruthy();
      expect(c.currency).toBeTruthy();
      expect(c.availablePlatforms).toBeInstanceOf(Array);
      expect(c.topPlatforms).toBeInstanceOf(Array);
      expect(c.streamingLandscape).toBeTruthy();
      expect(c.faqs).toBeInstanceOf(Array);
    });
  });

  it('getCountryBySlug returns the correct country', () => {
    const usa = getCountryBySlug('united-states');
    expect(usa).toBeDefined();
    expect(usa?.iso).toBe('US');
  });

  it('getCountryBySlug returns undefined for unknown slug', () => {
    expect(getCountryBySlug('nonexistent-country')).toBeUndefined();
  });

  it('getCountryByIso returns the correct country', () => {
    const uk = getCountryByIso('GB');
    expect(uk).toBeDefined();
    expect(uk?.name).toBe('United Kingdom');
  });

  it('getCountryByIso returns undefined for unknown ISO', () => {
    expect(getCountryByIso('ZZ')).toBeUndefined();
  });

  it('all topPlatforms slugs exist in platforms array', () => {
    const allPlatformSlugs = new Set(platforms.map(p => p.slug));
    countries.forEach(country => {
      country.topPlatforms.forEach(platformSlug => {
        expect(allPlatformSlugs.has(platformSlug)).toBe(true);
      });
    });
  });

  it('all availablePlatforms slugs exist in platforms array', () => {
    const allPlatformSlugs = new Set(platforms.map(p => p.slug));
    countries.forEach(country => {
      country.availablePlatforms.forEach(platformSlug => {
        expect(allPlatformSlugs.has(platformSlug)).toBe(true);
      });
    });
  });

  it('includes key markets', () => {
    const slugs = countries.map(c => c.slug);
    const required = ['united-states', 'united-kingdom', 'canada', 'australia'];
    required.forEach(slug => {
      expect(slugs).toContain(slug);
    });
  });

  it('ISO codes are uppercase', () => {
    countries.forEach(c => {
      expect(c.iso).toBe(c.iso.toUpperCase());
    });
  });
});
