import { comparisons, getComparisonBySlug } from '../comparisons';
import { platforms } from '../platforms';

describe('comparisons data', () => {
  it('has at least 15 comparisons', () => {
    expect(comparisons.length).toBeGreaterThanOrEqual(15);
  });

  it('has no duplicate slugs', () => {
    const slugs = comparisons.map(c => c.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it('all comparisons have required fields', () => {
    comparisons.forEach(c => {
      expect(c.slug).toBeTruthy();
      expect(c.platformSlugs).toHaveLength(2);
      expect(c.headline).toBeTruthy();
      expect(c.introduction).toBeTruthy();
      expect(c.comparisonPoints).toBeInstanceOf(Array);
      expect(c.verdict).toBeTruthy();
      expect(c.faqs).toBeInstanceOf(Array);
    });
  });

  it('both platformSlugs exist in platforms array', () => {
    const allPlatformSlugs = new Set(platforms.map(p => p.slug));
    comparisons.forEach(c => {
      expect(allPlatformSlugs.has(c.platformSlugs[0])).toBe(true);
      expect(allPlatformSlugs.has(c.platformSlugs[1])).toBe(true);
    });
  });

  it('getComparisonBySlug returns the correct comparison', () => {
    const comparison = getComparisonBySlug('netflix-vs-hulu');
    expect(comparison).toBeDefined();
    expect(comparison?.platformSlugs).toContain('netflix');
    expect(comparison?.platformSlugs).toContain('hulu');
  });

  it('getComparisonBySlug returns undefined for unknown slug', () => {
    expect(getComparisonBySlug('nonexistent-vs-nothing')).toBeUndefined();
  });

  it('comparison points have winner values of a, b, tie or undefined', () => {
    comparisons.forEach(c => {
      c.comparisonPoints.forEach(point => {
        if (point.winner !== undefined) {
          expect(['a', 'b', 'tie']).toContain(point.winner);
        }
      });
    });
  });
});
