import type { ContentData } from '@/lib/api/content';
import {
  generateContentSchema,
  generateContentFaqSchema,
  generateStreamingHowToSchema,
  generateWebApplicationSchema,
  generateOrganizationSchema,
  generateCountryAvailabilitySchema,
  generateStreamingServiceSchema,
  generatePlatformProductSchema,
  generateComparisonPageSchema,
  generateArticleSchema,
  generateGlossaryTermSchema,
  generateCollectionPageSchema,
  generateSpeakableSchema,
  generatePlatformCountryHowToSchema,
  generateHomepageHowToSchema,
  generateSportsPageSchema,
  generateSportsHowToSchema,
  generateGenreGuideSchema,
  generateStreamingGuideSchema,
  generateVideoObjectSchema,
} from '../schema-markup';

// Mock external dependency
jest.mock('../url-generation', () => ({
  generateCanonicalUrl: jest.fn(
    (type: string, slug: string) => `https://geoleap.app/content/${type}/${slug}`
  ),
  generateContentSlug: jest.fn((id: string, title: string, year?: number) => {
    const titleSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');

    return year ? `${id}-${titleSlug}-${year}` : `${id}-${titleSlug}`;
  }),
  generateCategoryUrl: jest.fn(() => '/how-to-watch'),
}));

// ---------------------------------------------------------------------------
// Valid schema.org types used across GeoLeap generators
// ---------------------------------------------------------------------------
const VALID_SCHEMA_TYPES = new Set([
  'WebApplication',
  'Organization',
  'Movie',
  'TVSeries',
  'CreativeWork',
  'FAQPage',
  'HowTo',
  'Article',
  'BlogPosting',
  'Product',
  'BreadcrumbList',
  'ItemList',
  'DefinedTerm',
  'CollectionPage',
  'WebPage',
  'SportsEvent',
  'VideoObject',
  'Person',
  'AggregateRating',
  'Offer',
  'SpeakableSpecification',
  'SearchAction',
  'ListItem',
  'HowToStep',
  'HowToSupply',
  'HowToTool',
  'ContactPoint',
  'Question',
  'Answer',
  'Country',
  'ImageObject',
  'Brand',
  'DefinedTermSet',
  'AggregateOffer',
  'Schedule',
  'Thing',
  'WatchAction',
  'EntryPoint',
]);

// ---------------------------------------------------------------------------
// Type definitions for the validators
// ---------------------------------------------------------------------------
interface SchemaObject {
  '@context'?: string;
  '@type'?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validates that a schema object has the correct @context value.
 */
function validateSchemaContext(schema: SchemaObject): void {
  expect(schema).toHaveProperty('@context');
  expect(schema['@context']).toBe('https://schema.org');
}

/**
 * Validates that a schema object has a @type from the known set.
 */
function validateSchemaType(schema: SchemaObject, validTypes: Set<string>): void {
  expect(schema).toHaveProperty('@type');
  expect(validTypes.has(schema['@type'] as string)).toBe(true);
}

/**
 * Recursively asserts no property value is undefined or null.
 * JSON.stringify drops undefined values and converts null to "null",
 * but having them in the source object is a sign of a bug.
 */
function assertNoNullish(obj: unknown, path = 'root'): void {
  if (obj === null) {
    throw new Error(`Found null at ${path}`);
  }
  if (obj === undefined) {
    throw new Error(`Found undefined at ${path}`);
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => assertNoNullish(item, `${path}[${index}]`));
    return;
  }
  if (typeof obj === 'object' && obj !== null) {
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      assertNoNullish(record[key], `${path}.${key}`);
    }
  }
}

/**
 * URL-like property names that should contain valid HTTP(S) URLs.
 */
const URL_PROPERTY_NAMES = new Set(['url', 'image', 'sameAs', '@id', 'target', 'item', 'logo']);

/**
 * Recursively checks that properties whose names imply a URL contain valid
 * http:// or https:// strings (or arrays of such strings).
 */
function validateUrls(obj: unknown, path = 'root'): void {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => validateUrls(item, `${path}[${index}]`));
    return;
  }
  if (typeof obj === 'object' && obj !== null) {
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const value = record[key];
      if (URL_PROPERTY_NAMES.has(key)) {
        assertValidUrlValue(value, `${path}.${key}`);
      }
      // Recurse regardless so nested objects are checked
      validateUrls(value, `${path}.${key}`);
    }
  }
}

/**
 * Asserts a value (string, string[], or nested object with url) is a valid URL.
 */
function assertValidUrlValue(value: unknown, path: string): void {
  if (typeof value === 'string') {
    expect(value).toMatch(/^https?:\/\//);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === 'string') {
        expect(item).toMatch(/^https?:\/\//);
      } else if (typeof item === 'object' && item !== null) {
        // nested object (e.g. an item inside sameAs could be an object)
        validateUrls(item, `${path}[${index}]`);
      }
    });
    return;
  }
  // If the value is an object (e.g. logo: { @type: 'ImageObject', url: '...' }),
  // the recursive call from validateUrls will handle its inner properties.
}

// Required properties per top-level @type
const REQUIRED_PROPS_BY_TYPE: Record<string, string[]> = {
  Movie: ['name'],
  TVSeries: ['name'],
  FAQPage: ['mainEntity'],
  HowTo: ['name', 'step'],
  Article: ['headline', 'datePublished'],
  BlogPosting: ['headline', 'datePublished'],
  Product: ['name'],
  BreadcrumbList: ['itemListElement'],
  Organization: ['name'],
  ItemList: ['itemListElement'],
  WebPage: ['url'],
  CollectionPage: ['name'],
  DefinedTerm: ['name'],
  WebApplication: ['name'],
};

/**
 * Validates that a schema has the required properties for its @type.
 */
function validateRequiredProps(schema: SchemaObject): void {
  const type = schema['@type'] as string;
  const required = REQUIRED_PROPS_BY_TYPE[type];
  if (!required) return;
  for (const prop of required) {
    expect(schema).toHaveProperty(prop);
  }
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const movieContent: ContentData = {
  id: '550',
  title: 'Fight Club',
  overview: 'An insomniac office worker and a soap salesman build a global underground empire.',
  posterUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  backdropUrl: 'https://image.tmdb.org/t/p/w1920/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg',
  releaseYear: 1999,
  genres: ['Drama', 'Thriller'],
  rating: 8.4,
  voteCount: 26000,
  runtime: 139,
  contentRating: 'R',
  cast: [
    { id: 1, name: 'Brad Pitt', character: 'Tyler Durden', profilePath: 'https://image.tmdb.org/t/p/w500/brad.jpg', order: 1 },
    { id: 2, name: 'Edward Norton', character: 'The Narrator', profilePath: 'https://image.tmdb.org/t/p/w500/norton.jpg', order: 2 },
  ],
  crew: [
    { id: 3, name: 'David Fincher', job: 'Director', department: 'Directing', profilePath: 'https://image.tmdb.org/t/p/w500/fincher.jpg' },
  ],
  streamingOptions: [
    {
      serviceId: 'hulu',
      serviceName: 'Hulu',
      url: 'https://hulu.com/watch/fight-club',
      type: 'subscription' as const,
      quality: ['HD'],
      price: 12.99,
      currency: 'USD',
    },
  ],
};

const tvContent: ContentData = {
  id: '1396',
  title: 'Breaking Bad',
  overview: 'A teacher turns to cooking meth.',
  posterUrl: 'https://image.tmdb.org/t/p/w500/bb.jpg',
  releaseYear: 2008,
  genres: ['Crime', 'Drama'],
  rating: 9.5,
  voteCount: 1800000,
  contentRating: 'TV-MA',
  cast: [
    { id: 10, name: 'Bryan Cranston', character: 'Walter White', profilePath: 'https://image.tmdb.org/t/p/w500/cranston.jpg', order: 1 },
  ],
  crew: [],
  streamingOptions: [
    {
      serviceId: 'netflix',
      serviceName: 'Netflix',
      url: 'https://netflix.com/watch/breaking-bad',
      type: 'subscription' as const,
      quality: ['4K'],
    },
  ],
};

// ---------------------------------------------------------------------------
// Gather ALL schemas produced by every generator
// ---------------------------------------------------------------------------

interface NamedSchema {
  generatorName: string;
  schema: SchemaObject;
}

function collectAllSchemas(): NamedSchema[] {
  const schemas: NamedSchema[] = [];

  const push = (generatorName: string, result: unknown) => {
    if (result === null || result === undefined) return;
    if (Array.isArray(result)) {
      result.forEach((s) => schemas.push({ generatorName, schema: s as SchemaObject }));
    } else {
      schemas.push({ generatorName, schema: result as SchemaObject });
    }
  };

  // Content-based generators
  push('generateContentSchema(movie)', generateContentSchema(movieContent, 'movie'));
  push('generateContentSchema(tv-show)', generateContentSchema(tvContent, 'tv-show'));
  push('generateContentSchema(documentary)', generateContentSchema(movieContent, 'documentary'));
  push('generateContentFaqSchema(movie)', generateContentFaqSchema(movieContent, 'movie'));
  push('generateContentFaqSchema(tv-show)', generateContentFaqSchema(tvContent, 'tv-show'));
  push('generateStreamingHowToSchema(movie)', generateStreamingHowToSchema(movieContent, 'movie'));

  // Static generators
  push('generateWebApplicationSchema', generateWebApplicationSchema());
  push('generateOrganizationSchema', generateOrganizationSchema());
  push('generateHomepageHowToSchema', generateHomepageHowToSchema());

  // Country availability
  push(
    'generateCountryAvailabilitySchema',
    generateCountryAvailabilitySchema([
      { name: 'United States', code: 'US', servicesCount: 50 },
      { name: 'United Kingdom', code: 'GB', servicesCount: 35 },
    ])
  );

  // pSEO generators
  push(
    'generateStreamingServiceSchema',
    generateStreamingServiceSchema({
      name: 'Netflix',
      slug: 'netflix',
      description: 'Leading streaming service',
      url: 'https://netflix.com',
      wikipediaUrl: 'https://en.wikipedia.org/wiki/Netflix',
    })
  );

  push(
    'generatePlatformProductSchema',
    generatePlatformProductSchema({
      name: 'Disney+',
      slug: 'disney-plus',
      description: 'Family streaming service',
      pricing: {
        startsAt: 7.99,
        currency: 'USD',
        billingPeriod: 'monthly',
        hasFreeTier: false,
        hasTrial: true,
      },
      availableCountries: ['US', 'GB', 'CA'],
      wikipediaUrl: 'https://en.wikipedia.org/wiki/Disney%2B',
    })
  );

  push(
    'generateComparisonPageSchema',
    generateComparisonPageSchema({
      title: 'Netflix vs Disney+',
      description: 'Side-by-side comparison',
      url: 'https://geoleap.app/compare/netflix-vs-disney-plus',
      platforms: ['Netflix', 'Disney+'],
      comparisonPoints: [
        { category: 'Price', platformA: '$15.49/mo', platformB: '$7.99/mo', winner: 'Disney+' },
        { category: 'Content Library', platformA: '15000+ titles', platformB: '1000+ titles', winner: 'Netflix' },
      ],
    })
  );

  push(
    'generateArticleSchema',
    generateArticleSchema({
      title: 'Best Streaming Services 2026',
      description: 'Our annual guide to streaming platforms',
      url: 'https://geoleap.app/guides/best-streaming-2026',
      datePublished: '2026-01-15',
      dateModified: '2026-03-01',
      mentions: [
        { name: 'Netflix', url: 'https://geoleap.app/platforms/netflix', type: 'Organization' },
      ],
    })
  );

  push(
    'generateGlossaryTermSchema',
    generateGlossaryTermSchema({
      term: 'Geo-restriction',
      definition: 'Limiting content access based on geographic location',
      url: 'https://geoleap.app/glossary/geo-restriction',
      inDefinedTermSet: {
        name: 'Streaming Glossary',
        url: 'https://geoleap.app/glossary',
      },
    })
  );

  push(
    'generateCollectionPageSchema',
    generateCollectionPageSchema({
      title: 'All Streaming Platforms',
      description: 'Browse all platforms',
      url: 'https://geoleap.app/platforms',
      items: [
        { name: 'Netflix', url: 'https://geoleap.app/platforms/netflix' },
        { name: 'Hulu', url: 'https://geoleap.app/platforms/hulu' },
      ],
    })
  );

  push(
    'generateSpeakableSchema',
    generateSpeakableSchema('https://geoleap.app/platforms/netflix')
  );

  push(
    'generatePlatformCountryHowToSchema(available)',
    generatePlatformCountryHowToSchema({
      platformName: 'Netflix',
      countryName: 'United States',
      isAvailable: true,
    })
  );

  push(
    'generatePlatformCountryHowToSchema(unavailable)',
    generatePlatformCountryHowToSchema({
      platformName: 'HBO Max',
      countryName: 'Japan',
      isAvailable: false,
    })
  );

  push(
    'generateSportsPageSchema',
    generateSportsPageSchema({
      name: 'Premier League',
      slug: 'premier-league',
      description: 'Watch Premier League matches online',
      season: '2025-2026',
      cheapestPrice: 9.99,
      cheapestCurrency: 'USD',
    })
  );

  push(
    'generateSportsHowToSchema',
    generateSportsHowToSchema({
      sportName: 'NFL',
      countryName: 'United Kingdom',
      platformName: 'DAZN',
    })
  );

  push(
    'generateGenreGuideSchema',
    generateGenreGuideSchema({
      name: 'Action',
      slug: 'action',
      description: 'Best action streaming services',
      platforms: [
        { name: 'Netflix', slug: 'netflix' },
        { name: 'Amazon Prime Video', slug: 'amazon-prime-video' },
      ],
    })
  );

  push(
    'generateStreamingGuideSchema',
    generateStreamingGuideSchema({
      title: 'How to Stream Anywhere',
      slug: 'stream-anywhere',
      description: 'Complete guide to global streaming',
      tldr: 'Use GeoLeap to find content across all platforms.',
      publishedAt: '2026-01-10',
      updatedAt: '2026-03-10',
      readingTime: 8,
      sections: [
        { id: 'intro', label: 'Introduction' },
        { id: 'platforms', label: 'Choose a Platform' },
      ],
    })
  );

  // Video object generator
  push(
    'generateVideoObjectSchema(movie)',
    generateVideoObjectSchema(movieContent, 'movie')
  );

  push(
    'generateVideoObjectSchema(tv-show)',
    generateVideoObjectSchema(tvContent, 'tv-show')
  );

  return schemas;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('JSON-LD Schema Structural Validation', () => {
  let allSchemas: NamedSchema[];

  beforeAll(() => {
    allSchemas = collectAllSchemas();
  });

  // 1. @context validation
  describe('@context validation', () => {
    it('every schema has @context set to https://schema.org', () => {
      for (const { generatorName, schema } of allSchemas) {
        try {
          validateSchemaContext(schema);
        } catch (error) {
          throw new Error(
            `@context validation failed for ${generatorName}: ${(error as Error).message}`
          );
        }
      }
    });
  });

  // 2. @type validation
  describe('@type validation', () => {
    it('every top-level schema has a valid @type', () => {
      for (const { generatorName, schema } of allSchemas) {
        try {
          validateSchemaType(schema, VALID_SCHEMA_TYPES);
        } catch (error) {
          throw new Error(
            `@type validation failed for ${generatorName} (got "${schema['@type']}"): ${(error as Error).message}`
          );
        }
      }
    });

    it('all nested @type values are from the known set', () => {
      function checkNestedTypes(obj: unknown, path: string): void {
        if (Array.isArray(obj)) {
          obj.forEach((item, i) => checkNestedTypes(item, `${path}[${i}]`));
          return;
        }
        if (typeof obj === 'object' && obj !== null) {
          const record = obj as Record<string, unknown>;
          if ('@type' in record) {
            const typeValue = record['@type'] as string;
            if (!VALID_SCHEMA_TYPES.has(typeValue)) {
              throw new Error(`Unknown @type "${typeValue}" at ${path}`);
            }
          }
          for (const key of Object.keys(record)) {
            checkNestedTypes(record[key], `${path}.${key}`);
          }
        }
      }

      for (const { generatorName, schema } of allSchemas) {
        checkNestedTypes(schema, generatorName);
      }
    });
  });

  // 3. No undefined/null values
  describe('no undefined/null values', () => {
    it('no schema contains undefined or null at any depth', () => {
      for (const { generatorName, schema } of allSchemas) {
        try {
          assertNoNullish(schema, generatorName);
        } catch (error) {
          throw new Error(
            `Nullish value found in ${generatorName}: ${(error as Error).message}`
          );
        }
      }
    });
  });

  // 4. URL validation
  describe('URL validation', () => {
    it('all URL-like properties contain valid http(s) URLs', () => {
      for (const { generatorName, schema } of allSchemas) {
        try {
          validateUrls(schema, generatorName);
        } catch (error) {
          throw new Error(
            `URL validation failed in ${generatorName}: ${(error as Error).message}`
          );
        }
      }
    });
  });

  // 5. Required properties by type
  describe('required properties by type', () => {
    it('every schema has the required properties for its @type', () => {
      for (const { generatorName, schema } of allSchemas) {
        try {
          validateRequiredProps(schema);
        } catch (error) {
          throw new Error(
            `Required props missing in ${generatorName} (@type=${schema['@type']}): ${(error as Error).message}`
          );
        }
      }
    });
  });

  // 6. Generators that can return null handle edge cases gracefully
  describe('nullable generators return null for empty data', () => {
    const minimalContent: ContentData = {
      id: '999',
      title: 'Empty',
      genres: [],
    };

    it('generateContentFaqSchema returns null when no FAQs can be built', () => {
      const result = generateContentFaqSchema(minimalContent, 'movie');
      expect(result).toBeNull();
    });

    it('generateStreamingHowToSchema returns null without streaming options', () => {
      const result = generateStreamingHowToSchema(minimalContent, 'movie');
      expect(result).toBeNull();
    });

    it('generateStreamingHowToSchema returns null for empty streaming array', () => {
      const emptyStreaming: ContentData = { ...minimalContent, streamingOptions: [] };
      const result = generateStreamingHowToSchema(emptyStreaming, 'movie');
      expect(result).toBeNull();
    });
  });

  // 7. Array-returning generators produce well-formed arrays
  describe('array-returning generators', () => {
    it('generateContentSchema returns exactly 2 schemas (content + breadcrumb)', () => {
      const result = generateContentSchema(movieContent, 'movie');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]['@type']).toBe('Movie');
      expect(result[1]['@type']).toBe('BreadcrumbList');
    });

    it('generateStreamingGuideSchema returns exactly 2 schemas (article + howto)', () => {
      const result = generateStreamingGuideSchema({
        title: 'Guide Title',
        slug: 'guide-slug',
        description: 'desc',
        tldr: 'tldr',
        publishedAt: '2026-01-01',
        updatedAt: '2026-03-01',
        readingTime: 5,
        sections: [{ id: 'intro', label: 'Intro' }],
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]['@type']).toBe('Article');
      expect(result[1]['@type']).toBe('HowTo');
    });
  });

  // 8. JSON serialization round-trip
  describe('JSON serialization', () => {
    it('all schemas survive JSON.stringify/parse round-trip', () => {
      for (const { generatorName, schema } of allSchemas) {
        const serialized = JSON.stringify(schema);
        expect(() => JSON.parse(serialized)).not.toThrow();
        const parsed = JSON.parse(serialized) as SchemaObject;
        expect(parsed['@context']).toBe('https://schema.org');
        expect(parsed['@type']).toBe(schema['@type']);
        // Ensure no data loss by checking key count
        expect(Object.keys(parsed).length).toBeGreaterThanOrEqual(
          // JSON.stringify drops undefined, so parsed may have fewer keys
          // but should not lose explicitly set values
          1
        );
        if (generatorName === 'generateContentSchema(movie)' && parsed['@type'] === 'Movie') {
          // Movie content schemas have many keys  -  sanity-check they survive
          expect(Object.keys(parsed).length).toBeGreaterThan(3);
        }
      }
    });
  });

  // 9. Consistency checks across generators
  describe('cross-generator consistency', () => {
    it('all Organization sub-schemas use "GeoLeap" as name', () => {
      function findOrgNames(obj: unknown, path: string, names: string[]): void {
        if (Array.isArray(obj)) {
          obj.forEach((item, i) => findOrgNames(item, `${path}[${i}]`, names));
          return;
        }
        if (typeof obj === 'object' && obj !== null) {
          const record = obj as Record<string, unknown>;
          if (record['@type'] === 'Organization' && typeof record['name'] === 'string') {
            // Only check GeoLeap-owned orgs (not external platform orgs like Netflix)
            const knownExternal = [
              'Netflix', 'Hulu', 'Disney+', 'Amazon Prime Video',
              'HBO Max', 'DAZN',
            ];
            if (!knownExternal.includes(record['name'] as string)) {
              names.push(record['name'] as string);
            }
          }
          for (const key of Object.keys(record)) {
            findOrgNames(record[key], `${path}.${key}`, names);
          }
        }
      }

      const orgNames: string[] = [];
      for (const { generatorName, schema } of allSchemas) {
        findOrgNames(schema, generatorName, orgNames);
      }
      // Every GeoLeap Organization reference should use the same name
      for (const name of orgNames) {
        expect(name).toBe('GeoLeap');
      }
    });

    it('all BreadcrumbList schemas have sequential positions starting at 1', () => {
      const breadcrumbs = allSchemas.filter((s) => s.schema['@type'] === 'BreadcrumbList');
      for (const { generatorName, schema } of breadcrumbs) {
        const items = schema.itemListElement as Array<Record<string, unknown>>;
        expect(Array.isArray(items)).toBe(true);
        items.forEach((item, index) => {
          expect(item.position).toBe(index + 1);
          if (item.position !== index + 1) {
            throw new Error(
              `BreadcrumbList position mismatch in ${generatorName}: expected ${index + 1}, got ${item.position}`
            );
          }
        });
      }
    });

    it('all HowTo schemas have at least one step', () => {
      const howTos = allSchemas.filter((s) => s.schema['@type'] === 'HowTo');
      for (const { generatorName, schema } of howTos) {
        const steps = schema.step as Array<Record<string, unknown>>;
        expect(Array.isArray(steps)).toBe(true);
        expect(steps.length).toBeGreaterThanOrEqual(1);
        if (steps.length < 1) {
          throw new Error(`HowTo in ${generatorName} has no steps`);
        }
      }
    });

    it('all HowToStep items have @type HowToStep', () => {
      const howTos = allSchemas.filter((s) => s.schema['@type'] === 'HowTo');
      for (const { schema } of howTos) {
        const steps = schema.step as Array<Record<string, unknown>>;
        for (const step of steps) {
          expect(step['@type']).toBe('HowToStep');
        }
      }
    });

    it('all Article schemas have a publisher with Organization type', () => {
      const articles = allSchemas.filter((s) => s.schema['@type'] === 'Article');
      for (const { generatorName, schema } of articles) {
        const publisher = schema.publisher as Record<string, unknown> | undefined;
        expect(publisher).toBeDefined();
        if (publisher) {
          expect(publisher['@type']).toBe('Organization');
          expect(publisher['name']).toBe('GeoLeap');
        } else {
          throw new Error(`Article in ${generatorName} is missing publisher`);
        }
      }
    });
  });

  // 10. Coverage of all exported generators
  describe('generator coverage', () => {
    it('collectAllSchemas produces schemas from every exported generator', () => {
      const generatorNames = allSchemas.map((s) => s.generatorName);

      // Verify we exercise every public generator
      const expectedPrefixes = [
        'generateContentSchema',
        'generateContentFaqSchema',
        'generateStreamingHowToSchema',
        'generateWebApplicationSchema',
        'generateOrganizationSchema',
        'generateCountryAvailabilitySchema',
        'generateStreamingServiceSchema',
        'generatePlatformProductSchema',
        'generateComparisonPageSchema',
        'generateArticleSchema',
        'generateGlossaryTermSchema',
        'generateCollectionPageSchema',
        'generateSpeakableSchema',
        'generatePlatformCountryHowToSchema',
        'generateHomepageHowToSchema',
        'generateSportsPageSchema',
        'generateSportsHowToSchema',
        'generateGenreGuideSchema',
        'generateStreamingGuideSchema',
        'generateVideoObjectSchema',
      ];

      for (const prefix of expectedPrefixes) {
        const found = generatorNames.some((name) => name.startsWith(prefix));
        expect(found).toBe(true);
      }
    });

    it('collected schemas is a non-trivial set', () => {
      // With all generators exercised we expect at least 20 schemas
      expect(allSchemas.length).toBeGreaterThanOrEqual(20);
    });
  });
});
