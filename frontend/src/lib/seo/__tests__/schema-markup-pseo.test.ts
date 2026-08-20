import {
  generateStreamingServiceSchema,
  generateComparisonPageSchema,
  generateArticleSchema,
  generateGlossaryTermSchema,
  generateCollectionPageSchema,
} from '../schema-markup';

describe('schema-markup pSEO extensions', () => {
  describe('generateStreamingServiceSchema', () => {
    const platform = {
      name: 'Netflix',
      slug: 'netflix',
      description: 'The worlds leading streaming service',
      url: 'https://netflix.com',
    };

    it('returns an Organization schema', () => {
      const schema = generateStreamingServiceSchema(platform);
      expect(schema['@type']).toBe('Organization');
    });

    it('includes @context', () => {
      const schema = generateStreamingServiceSchema(platform);
      expect(schema['@context']).toBe('https://schema.org');
    });

    it('includes platform name', () => {
      const schema = generateStreamingServiceSchema(platform);
      expect(schema['name']).toBe('Netflix');
    });

    it('includes platform description', () => {
      const schema = generateStreamingServiceSchema(platform);
      expect(schema['description']).toBe(platform.description);
    });

    it('includes URL when provided', () => {
      const schema = generateStreamingServiceSchema(platform);
      expect(schema['url']).toBe('https://netflix.com');
    });

    it('works without URL', () => {
      const schema = generateStreamingServiceSchema({ name: 'Hulu', slug: 'hulu', description: 'desc' });
      expect(schema['@type']).toBe('Organization');
    });
  });

  describe('generateComparisonPageSchema', () => {
    const opts = {
      title: 'Netflix vs Hulu',
      description: 'Compare Netflix and Hulu',
      url: 'https://geoleap.app/compare/netflix-vs-hulu',
    };

    it('returns a WebPage schema', () => {
      const schema = generateComparisonPageSchema(opts);
      expect(schema['@type']).toBe('WebPage');
    });

    it('includes @context', () => {
      const schema = generateComparisonPageSchema(opts);
      expect(schema['@context']).toBe('https://schema.org');
    });

    it('includes title', () => {
      const schema = generateComparisonPageSchema(opts);
      expect(schema['name']).toBe('Netflix vs Hulu');
    });

    it('includes url', () => {
      const schema = generateComparisonPageSchema(opts);
      expect(schema['url']).toBe(opts.url);
    });

    it('includes description', () => {
      const schema = generateComparisonPageSchema(opts);
      expect(schema['description']).toBe(opts.description);
    });
  });

  describe('generateArticleSchema', () => {
    const article = {
      title: 'Best Streaming Services 2026',
      description: 'Our picks for the best streaming services',
      url: 'https://geoleap.app/guides/best-streaming-services',
      datePublished: '2026-01-01',
      dateModified: '2026-03-15',
    };

    it('returns an Article schema', () => {
      const schema = generateArticleSchema(article);
      expect(schema['@type']).toBe('Article');
    });

    it('includes @context', () => {
      const schema = generateArticleSchema(article);
      expect(schema['@context']).toBe('https://schema.org');
    });

    it('includes headline', () => {
      const schema = generateArticleSchema(article);
      expect(schema['headline']).toBe(article.title);
    });

    it('includes datePublished', () => {
      const schema = generateArticleSchema(article);
      expect(schema['datePublished']).toBe('2026-01-01');
    });

    it('includes dateModified when provided', () => {
      const schema = generateArticleSchema(article);
      expect(schema['dateModified']).toBe('2026-03-15');
    });

    it('works without dateModified', () => {
      const schema = generateArticleSchema({ ...article, dateModified: undefined });
      expect(schema['@type']).toBe('Article');
    });
  });

  describe('generateGlossaryTermSchema', () => {
    const term = {
      term: 'SVOD',
      definition: 'Subscription Video on Demand - a streaming model where users pay a recurring fee',
      url: 'https://geoleap.app/glossary/svod',
    };

    it('returns a DefinedTerm schema', () => {
      const schema = generateGlossaryTermSchema(term);
      expect(schema['@type']).toBe('DefinedTerm');
    });

    it('includes @context', () => {
      const schema = generateGlossaryTermSchema(term);
      expect(schema['@context']).toBe('https://schema.org');
    });

    it('includes term name', () => {
      const schema = generateGlossaryTermSchema(term);
      expect(schema['name']).toBe('SVOD');
    });

    it('includes description', () => {
      const schema = generateGlossaryTermSchema(term);
      expect(schema['description']).toBe(term.definition);
    });

    it('includes url', () => {
      const schema = generateGlossaryTermSchema(term);
      expect(schema['url']).toBe(term.url);
    });
  });

  describe('generateCollectionPageSchema', () => {
    const opts = {
      title: 'Streaming Platforms',
      description: 'Browse all streaming platforms',
      url: 'https://geoleap.app/platforms',
      items: [
        { name: 'Netflix', url: 'https://geoleap.app/platforms/netflix' },
        { name: 'Hulu', url: 'https://geoleap.app/platforms/hulu' },
      ],
    };

    it('returns a CollectionPage schema', () => {
      const schema = generateCollectionPageSchema(opts);
      expect(schema['@type']).toBe('CollectionPage');
    });

    it('includes @context', () => {
      const schema = generateCollectionPageSchema(opts);
      expect(schema['@context']).toBe('https://schema.org');
    });

    it('includes title', () => {
      const schema = generateCollectionPageSchema(opts);
      expect(schema['name']).toBe('Streaming Platforms');
    });

    it('includes url', () => {
      const schema = generateCollectionPageSchema(opts);
      expect(schema['url']).toBe(opts.url);
    });

    it('includes items', () => {
      const schema = generateCollectionPageSchema(opts);
      const hasPart = schema['hasPart'] as Array<{ name: string; url: string }>;
      expect(hasPart).toHaveLength(2);
      expect(hasPart[0].name).toBe('Netflix');
    });
  });
});
