import { platforms, getPlatformBySlug } from '../platforms';

describe('platforms data', () => {
  it('has at least 20 platforms', () => {
    expect(platforms.length).toBeGreaterThanOrEqual(20);
  });

  it('has no duplicate slugs', () => {
    const slugs = platforms.map(p => p.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it('all platforms have required fields', () => {
    platforms.forEach(p => {
      expect(p.slug).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.shortDescription).toBeTruthy();
      expect(p.longDescription).toBeTruthy();
      expect(p.websiteUrl).toBeTruthy();
      expect(p.pricing).toBeDefined();
      expect(typeof p.pricing.startsAt).toBe('number');
      expect(p.pricing.currency).toBeTruthy();
      expect(p.features).toBeInstanceOf(Array);
      expect(p.faqs).toBeInstanceOf(Array);
    });
  });

  it('all platforms have at least one FAQ', () => {
    platforms.forEach(p => {
      expect(p.faqs.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('getPlatformBySlug returns the correct platform', () => {
    const netflix = getPlatformBySlug('netflix');
    expect(netflix).toBeDefined();
    expect(netflix?.name).toBe('Netflix');
  });

  it('getPlatformBySlug returns undefined for unknown slug', () => {
    expect(getPlatformBySlug('nonexistent-platform')).toBeUndefined();
  });

  it('all competitor slugs exist in platforms array', () => {
    const allSlugs = new Set(platforms.map(p => p.slug));
    platforms.forEach(platform => {
      platform.competitors.forEach(competitorSlug => {
        expect(allSlugs.has(competitorSlug)).toBe(true);
      });
    });
  });

  it('includes key streaming platforms', () => {
    const slugs = platforms.map(p => p.slug);
    const required = ['netflix', 'hulu', 'disney-plus', 'amazon-prime-video'];
    required.forEach(slug => {
      expect(slugs).toContain(slug);
    });
  });

  it('all pricing has valid billing period', () => {
    platforms.forEach(p => {
      expect(['monthly', 'annual']).toContain(p.pricing.billingPeriod);
    });
  });
});
