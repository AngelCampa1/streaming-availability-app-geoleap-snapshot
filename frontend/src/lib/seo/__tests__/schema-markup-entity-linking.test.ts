import {
  generateStreamingServiceSchema,
  generatePlatformProductSchema,
  generateHomepageHowToSchema,
} from '../schema-markup';

describe('Entity Linking (sameAs) on Platform Schemas', () => {
  describe('generateStreamingServiceSchema with entity linking', () => {
    const platform = {
      name: 'Netflix',
      slug: 'netflix',
      description: 'The worlds leading streaming service',
      url: 'https://netflix.com',
    };

    it('includes wikipediaUrl in sameAs when provided', () => {
      const schema = generateStreamingServiceSchema({
        ...platform,
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Netflix',
      });
      const sameAs = schema['sameAs'] as string[];
      expect(sameAs).toContain('https://en.wikipedia.org/wiki/Netflix');
    });

    it('includes wikidataId in sameAs when provided', () => {
      const schema = generateStreamingServiceSchema({
        ...platform,
        wikidataId: 'https://www.wikidata.org/wiki/Q907311',
      });
      const sameAs = schema['sameAs'] as string[];
      expect(sameAs).toContain('https://www.wikidata.org/wiki/Q907311');
    });

    it('includes both wikipedia and wikidata in sameAs', () => {
      const schema = generateStreamingServiceSchema({
        ...platform,
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Netflix',
        wikidataId: 'https://www.wikidata.org/wiki/Q907311',
      });
      const sameAs = schema['sameAs'] as string[];
      expect(sameAs).toContain('https://en.wikipedia.org/wiki/Netflix');
      expect(sameAs).toContain('https://www.wikidata.org/wiki/Q907311');
    });

    it('still includes the platform page URL in sameAs', () => {
      const schema = generateStreamingServiceSchema({
        ...platform,
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Netflix',
      });
      const sameAs = schema['sameAs'] as string[];
      expect(sameAs.some(url => url.includes('/platforms/netflix'))).toBe(true);
    });

    it('works without wikipedia/wikidata (backward compatible)', () => {
      const schema = generateStreamingServiceSchema(platform);
      const sameAs = schema['sameAs'] as string[];
      expect(sameAs).toHaveLength(1);
      expect(sameAs[0]).toContain('/platforms/netflix');
    });
  });

  describe('generatePlatformProductSchema with entity linking', () => {
    const platform = {
      name: 'Netflix',
      slug: 'netflix',
      description: 'Streaming service',
      pricing: {
        startsAt: 6.99,
        currency: 'USD',
        billingPeriod: 'monthly',
        hasFreeTier: false,
        hasTrial: false,
      },
      availableCountries: ['US', 'GB'],
    };

    it('includes sameAs with wikipedia and wikidata when provided', () => {
      const schema = generatePlatformProductSchema({
        ...platform,
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Netflix',
        wikidataId: 'https://www.wikidata.org/wiki/Q907311',
      });
      const sameAs = schema['sameAs'] as string[];
      expect(sameAs).toContain('https://en.wikipedia.org/wiki/Netflix');
      expect(sameAs).toContain('https://www.wikidata.org/wiki/Q907311');
    });

    it('does not include sameAs when no entity links provided', () => {
      const schema = generatePlatformProductSchema(platform);
      expect(schema['sameAs']).toBeUndefined();
    });
  });
});

describe('Homepage HowTo Schema', () => {
  it('returns a HowTo schema type', () => {
    const schema = generateHomepageHowToSchema();
    expect(schema['@type']).toBe('HowTo');
  });

  it('includes @context', () => {
    const schema = generateHomepageHowToSchema();
    expect(schema['@context']).toBe('https://schema.org');
  });

  it('has a descriptive name', () => {
    const schema = generateHomepageHowToSchema();
    expect(schema['name']).toBe('How to Find Where to Watch Any Show Globally');
  });

  it('includes a description', () => {
    const schema = generateHomepageHowToSchema();
    expect(typeof schema['description']).toBe('string');
    expect((schema['description'] as string).length).toBeGreaterThan(0);
  });

  it('has exactly 3 steps', () => {
    const schema = generateHomepageHowToSchema();
    const steps = schema['step'] as Array<Record<string, unknown>>;
    expect(steps).toHaveLength(3);
  });

  it('each step is a HowToStep with position, name, and text', () => {
    const schema = generateHomepageHowToSchema();
    const steps = schema['step'] as Array<Record<string, unknown>>;
    steps.forEach((step, index) => {
      expect(step['@type']).toBe('HowToStep');
      expect(step['position']).toBe(index + 1);
      expect(typeof step['name']).toBe('string');
      expect(typeof step['text']).toBe('string');
    });
  });
});
