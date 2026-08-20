import { buildPageMetadata, withMarketingTitle, enhanceDescription } from '../marketing-metadata';
import { SITE_NAME, SITE_URL } from '../site-config';

describe('marketing-metadata', () => {
  describe('buildPageMetadata', () => {
    it('returns raw title without site name suffix (layout template adds it)', () => {
      const metadata = buildPageMetadata({
        title: 'Streaming Platforms Guide',
        description: 'A test page description',
        path: '/test',
      });
      expect(metadata.title).toBe('Streaming Platforms Guide');
    });

    it('returns OG title with site name suffix', () => {
      const metadata = buildPageMetadata({
        title: 'Streaming Platforms Guide',
        description: 'A test page description',
        path: '/test',
      });
      const og = metadata.openGraph as { title?: string } | undefined;
      expect(og?.title).toBe('Streaming Platforms Guide | GeoLeap');
    });

    it('does not double-suffix OG title when title already contains site name', () => {
      const metadata = buildPageMetadata({
        title: 'GeoLeap Premium Features',
        description: 'A test page description',
        path: '/test',
      });
      const og = metadata.openGraph as { title?: string } | undefined;
      expect(og?.title).toBe('GeoLeap Premium Features');
      const occurrences = (og?.title?.match(/GeoLeap/g) || []).length;
      expect(occurrences).toBe(1);
    });

    it('returns correct description', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test',
      });
      expect(metadata.description).toBe('A test page description');
    });

    it('sets canonical URL', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test',
      });
      const alternates = metadata.alternates as { canonical?: string } | undefined;
      expect(alternates?.canonical).toBe(`${SITE_URL}/test`);
    });

    it('supports overriding the canonical path for consolidated pages', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test/child',
        canonicalPath: '/test',
      });
      const alternates = metadata.alternates as { canonical?: string } | undefined;
      expect(alternates?.canonical).toBe(`${SITE_URL}/test`);
    });

    it('sets OG title with suffix', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test',
      });
      const og = metadata.openGraph as { title?: string } | undefined;
      expect(og?.title).toBe('Test Page | GeoLeap');
    });

    it('sets OG description', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test',
      });
      const og = metadata.openGraph as { description?: string } | undefined;
      expect(og?.description).toBe('A test page description');
    });

    it('sets twitter metadata', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test',
      });
      expect(metadata.twitter).toBeDefined();
    });

    it('sets noindex when noIndex is true', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test',
        noIndex: true,
      });
      const robots = metadata.robots as { index?: boolean; follow?: boolean } | undefined;
      expect(robots?.index).toBe(false);
    });

    it('includes keywords when provided', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test',
        keywords: ['streaming', 'vpn'],
      });
      expect(metadata.keywords).toEqual(['streaming', 'vpn']);
    });

    it('does not set noindex by default', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test',
      });
      const robots = metadata.robots as { index?: boolean } | undefined;
      // Either undefined (index allowed) or explicitly true
      if (robots?.index !== undefined) {
        expect(robots.index).not.toBe(false);
      }
    });

    it('sets OG type to article when dateModified is provided', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test',
        dateModified: '2026-03-01',
      });
      const og = metadata.openGraph as { type?: string } | undefined;
      expect(og?.type).toBe('article');
    });

    it('sets OG type to article when datePublished is provided', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test',
        datePublished: '2026-01-15',
      });
      const og = metadata.openGraph as { type?: string } | undefined;
      expect(og?.type).toBe('article');
    });

    it('sets OG type to website when no dates are provided', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test',
      });
      const og = metadata.openGraph as { type?: string } | undefined;
      expect(og?.type).toBe('website');
    });

    it('includes citation_title and citation_author in other metadata', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test',
      });
      const other = metadata.other as Record<string, string> | undefined;
      expect(other?.citation_title).toBe('Test Page');
      expect(other?.citation_author).toBe('GeoLeap');
    });

    it('includes citation_date when datePublished is provided', () => {
      const metadata = buildPageMetadata({
        title: 'Test Page',
        description: 'A test page description',
        path: '/test',
        datePublished: '2026-01-15',
      });
      const other = metadata.other as Record<string, string> | undefined;
      expect(other?.citation_date).toBe('2026-01-15');
    });
  });

  describe('enhanceDescription', () => {
    it.each([
      ['sport', 'Legal viewing options by country'],
      ['genre', 'Top platforms ranked by library size'],
      ['guide', 'Practical tips without subscription sprawl'],
      ['blog', 'Streaming data, tradeoffs, and recommendations.'],
      ['how-to-watch', 'Check availability in your country'],
      ['country', 'Search 42 services by country'],
      ['platform', 'Compare prices across 57 countries'],
      ['compare', 'Side-by-side pricing and tradeoffs'],
      ['glossary', 'Plain-English definitions for streamers.'],
    ])('appends correct CTA suffix for %s page type', (pageType, expectedSuffix) => {
      const result = enhanceDescription('Base description', pageType);
      expect(result).toContain(expectedSuffix);
    });

    it('uses default suffix for unknown page types', () => {
      const result = enhanceDescription('Base description', 'unknown');
      expect(result).toContain('Discover more at GeoLeap.');
    });

    it('truncates base description to fit within 160 chars', () => {
      const longDescription = 'A'.repeat(200);
      const result = enhanceDescription(longDescription, 'sport');
      expect(result.length).toBeLessThanOrEqual(160);
    });
  });

  describe('withMarketingTitle', () => {
    it('returns raw title without suffix (layout template adds it)', () => {
      const result = withMarketingTitle({ title: 'My Page' });
      expect(result.title).toBe('My Page');
    });

    it('sets OG title with site name suffix', () => {
      const result = withMarketingTitle({ title: 'My Page' });
      const og = result.openGraph as { title?: string } | undefined;
      expect(og?.title).toBe('My Page | GeoLeap');
    });

    it('does not double-append suffix in OG if already present', () => {
      const result = withMarketingTitle({ title: `My Page | ${SITE_NAME}` });
      const og = result.openGraph as { title?: string } | undefined;
      const occurrences = (og?.title?.match(new RegExp(SITE_NAME, 'g')) || []).length;
      expect(occurrences).toBe(1);
    });

    it('sets OG site name', () => {
      const result = withMarketingTitle({ title: 'My Page' });
      const og = result.openGraph as { siteName?: string } | undefined;
      expect(og?.siteName).toBe(SITE_NAME);
    });

    it('preserves existing metadata fields', () => {
      const result = withMarketingTitle({ title: 'My Page', description: 'desc' });
      expect(result.description).toBe('desc');
    });
  });
});
