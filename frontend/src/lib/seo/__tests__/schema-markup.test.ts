import {
  generateContentSchema,
  generateContentFaqSchema,
  generateStreamingHowToSchema,
  generateWebApplicationSchema,
  generateOrganizationSchema,
  generateCountryAvailabilitySchema,
  generateWebSiteSchema,
  generateDataCatalogSchema,
  generateGlossaryTermSetSchema,
  generateFeatureIndexFaqSchema,
} from '../schema-markup';
import type { ContentData } from '@/lib/api/content';

// Mock the url-generation module
jest.mock('../url-generation', () => ({
  generateContentSlug: jest.fn((id, title, year) => {
    const titleSlug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').replace(/^-+|-+$/g, '');
    return year ? `${id}-${titleSlug}-${year}` : `${id}-${titleSlug}`;
  }),
  generateCategoryUrl: jest.fn((type) => {
    const typeMap: Record<string, string> = {
      movie: '/how-to-watch',
      'tv-show': '/how-to-watch',
      documentary: '/how-to-watch',
      anime: '/genres/anime',
    };
    return typeMap[type] ?? '/how-to-watch';
  }),
  generateCanonicalUrl: jest.fn((type, slug) => `https://geoleap.app/content/${type}/${slug}`),
}));

describe('Schema Markup Generation', () => {
  const mockMovieContent: ContentData = {
    id: '123',
    title: 'The Dark Knight',
    overview: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1920/backdrop.jpg',
    releaseYear: 2008,
    genres: ['Action', 'Crime', 'Drama'],
    rating: 9.0,
    voteCount: 2500000,
    runtime: 152,
    contentRating: 'PG-13',
    cast: [
      { id: 1, name: 'Christian Bale', character: 'Bruce Wayne / Batman', profilePath: '/christian-bale.jpg', order: 1 },
      { id: 2, name: 'Heath Ledger', character: 'Joker', profilePath: '/heath-ledger.jpg', order: 2 },
      { id: 3, name: 'Aaron Eckhart', character: 'Harvey Dent', profilePath: '/aaron-eckhart.jpg', order: 3 },
      { id: 4, name: 'Gary Oldman', character: 'Commissioner Gordon', profilePath: '/gary-oldman.jpg', order: 4 },
      { id: 5, name: 'Michael Caine', character: 'Alfred', profilePath: '/michael-caine.jpg', order: 5 },
    ],
    crew: [
      { id: 6, name: 'Christopher Nolan', job: 'Director', department: 'Directing', profilePath: '/nolan.jpg' },
      { id: 7, name: 'Jonathan Nolan', job: 'Writer', department: 'Writing', profilePath: '/jonathan.jpg' },
      { id: 8, name: 'David S. Goyer', job: 'Writer', department: 'Writing', profilePath: '/goyer.jpg' },
    ],
    streamingOptions: [
      {
        serviceId: 'netflix',
        serviceName: 'Netflix',
        url: 'https://netflix.com/watch/123',
        type: 'subscription' as const,
        quality: ['HD'],
        price: 15.99,
        currency: 'USD',
      },
      {
        serviceId: 'amazon-prime',
        serviceName: 'Amazon Prime Video',
        url: 'https://primevideo.com/watch/123',
        type: 'rental' as const,
        quality: ['4K'],
        price: 4.99,
        currency: 'USD',
      },
    ],
  };

  const mockTvShowContent: ContentData = {
    id: '456',
    title: 'Breaking Bad',
    overview: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/tv-poster.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1920/tv-backdrop.jpg',
    releaseYear: 2008,
    genres: ['Crime', 'Drama', 'Thriller'],
    rating: 9.5,
    voteCount: 1800000,
    contentRating: 'TV-MA',
    cast: [
      { id: 10, name: 'Bryan Cranston', character: 'Walter White', profilePath: '/bryan-cranston.jpg', order: 1 },
      { id: 11, name: 'Aaron Paul', character: 'Jesse Pinkman', profilePath: '/aaron-paul.jpg', order: 2 },
    ],
    crew: [
      { id: 12, name: 'Vince Gilligan', job: 'Creator', department: 'Writing', profilePath: '/vince-gilligan.jpg' },
      { id: 13, name: 'Peter Gould', job: 'Producer', department: 'Production', profilePath: '/peter-gould.jpg' },
    ],
    streamingOptions: [
      {
        serviceId: 'hulu',
        serviceName: 'Hulu',
        url: 'https://hulu.com/watch/breaking-bad',
        type: 'subscription' as const,
        quality: ['4K'],
      },
    ],
  };

  beforeEach(() => {
    // SITE_URL constant is evaluated at module load, not at test time  -  test against actual default
  });

  describe('generateContentSchema', () => {
    it('should generate basic movie schema', () => {
      const schemas = generateContentSchema(mockMovieContent, 'movie');
      expect(Array.isArray(schemas)).toBe(true);
      expect(schemas).toHaveLength(2);

      const [contentSchema, _breadcrumbSchema] = schemas;

      expect(contentSchema['@context']).toBe('https://schema.org');
      expect(contentSchema['@type']).toBe('Movie');
      expect(contentSchema.name).toBe('The Dark Knight');
      expect(contentSchema.identifier).toBe('123');
      expect(contentSchema.description).toBe(mockMovieContent.overview);
    });

    it('should generate TV show schema', () => {
      const schemas = generateContentSchema(mockTvShowContent, 'tv-show');
      const [contentSchema] = schemas;

      expect(contentSchema['@type']).toBe('TVSeries');
      expect(contentSchema.name).toBe('Breaking Bad');
    });

    it('should generate documentary schema', () => {
      const documentaryContent: ContentData = { ...mockMovieContent, title: 'Planet Earth' };
      const schemas = generateContentSchema(documentaryContent, 'documentary');
      const [contentSchema] = schemas;

      expect(contentSchema['@type']).toBe('Movie'); // Documentaries use Movie schema
      expect(contentSchema.name).toBe('Planet Earth');
    });

    it('should include images when available', () => {
      const schemas = generateContentSchema(mockMovieContent, 'movie');
      const [contentSchema] = schemas;

      expect(contentSchema.image).toEqual([
        mockMovieContent.posterUrl,
        mockMovieContent.backdropUrl,
      ]);
    });

    it('should handle content without backdrop image', () => {
      const contentWithoutBackdrop: ContentData = { ...mockMovieContent, backdropUrl: undefined };
      const schemas = generateContentSchema(contentWithoutBackdrop, 'movie');
      const [contentSchema] = schemas;

      expect(contentSchema.image).toEqual([mockMovieContent.posterUrl]);
    });

    it('should include release date', () => {
      const schemas = generateContentSchema(mockMovieContent, 'movie');
      const [contentSchema] = schemas;

      expect(contentSchema.datePublished).toBe('2008-01-01');
    });

    it('should include genres', () => {
      const schemas = generateContentSchema(mockMovieContent, 'movie');
      const [contentSchema] = schemas;

      expect(contentSchema.genre).toEqual(['Action', 'Crime', 'Drama']);
    });

    it('should include aggregate rating', () => {
      const schemas = generateContentSchema(mockMovieContent, 'movie');
      const [contentSchema] = schemas;

      expect(contentSchema.aggregateRating).toEqual({
        '@type': 'AggregateRating',
        ratingValue: 9.0,
        ratingCount: 2500000,
        bestRating: 10,
        worstRating: 1,
      });
    });

    it('should include cast members (limited to 10)', () => {
      const schemas = generateContentSchema(mockMovieContent, 'movie');
      const [contentSchema] = schemas;

      expect((contentSchema as any).actor).toHaveLength(5);
      expect((contentSchema as any).actor[0]).toEqual({
        '@type': 'Person',
        name: 'Christian Bale',
        roleName: 'Bruce Wayne / Batman',
        image: '/christian-bale.jpg',
      });
    });

    it('should include directors (limited to 5)', () => {
      const schemas = generateContentSchema(mockMovieContent, 'movie');
      const [contentSchema] = schemas;

      expect((contentSchema as any).director).toHaveLength(1);
      expect(contentSchema.director[0]).toEqual({
        '@type': 'Person',
        name: 'Christopher Nolan',
        image: '/nolan.jpg',
      });
    });

    it('should include streaming offers', () => {
      const schemas = generateContentSchema(mockMovieContent, 'movie');
      const [contentSchema] = schemas;

      expect((contentSchema as any).offers).toHaveLength(2);
      expect((contentSchema as any).offers[0]).toEqual({
        '@type': 'Offer',
        url: 'https://netflix.com/watch/123',
        seller: {
          '@type': 'Organization',
          name: 'Netflix',
        },
        availability: 'https://schema.org/OnlineOnly',
        price: 15.99,
        priceCurrency: 'USD',
        category: 'subscription',
      });
    });

    it('should include movie runtime', () => {
      const schemas = generateContentSchema(mockMovieContent, 'movie');
      const [contentSchema] = schemas;

      expect(contentSchema.duration).toBe('PT152M');
      expect(contentSchema.contentRating).toBe('PG-13');
    });

    it('should include TV show content rating', () => {
      const schemas = generateContentSchema(mockTvShowContent, 'tv-show');
      const [contentSchema] = schemas;

      expect(contentSchema.contentRating).toBe('TV-MA');
      expect(contentSchema.duration).toBeUndefined(); // TV shows don't have runtime
    });

    it('should include provider information', () => {
      const schemas = generateContentSchema(mockMovieContent, 'movie');
      const [contentSchema] = schemas;

      expect(contentSchema.provider).toEqual({
        '@type': 'Organization',
        name: 'GeoLeap',
        url: 'https://geoleap.app',
        logo: 'https://geoleap.app/logo.png',
      });
    });

    it('should generate breadcrumb schema', () => {
      const schemas = generateContentSchema(mockMovieContent, 'movie');
      const [, breadcrumbSchema] = schemas;

      expect(breadcrumbSchema['@context']).toBe('https://schema.org');
      expect(breadcrumbSchema['@type']).toBe('BreadcrumbList');
      expect(breadcrumbSchema.itemListElement).toHaveLength(3);
      expect(breadcrumbSchema.itemListElement[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://geoleap.app',
      });
      expect(breadcrumbSchema.itemListElement[1]).toEqual({
        '@type': 'ListItem',
        position: 2,
        name: 'Movies',
        item: 'https://geoleap.app/how-to-watch',
      });
    });

    it('should handle content without optional fields', () => {
      const minimalContent: ContentData = {
        id: '789',
        title: 'Minimal Movie',
        genres: [],
      };

      const schemas = generateContentSchema(minimalContent, 'movie');
      const [contentSchema] = schemas;

      expect(contentSchema.name).toBe('Minimal Movie');
      expect(contentSchema.description).toBe('Watch Minimal Movie online');
      expect(contentSchema.image).toBeUndefined();
      expect(contentSchema.aggregateRating).toBeUndefined();
      expect(contentSchema.actor).toBeUndefined();
      expect(contentSchema.offers).toBeUndefined();
    });
  });

  describe('generateContentFaqSchema', () => {
    it('should generate FAQ schema with streaming options', () => {
      const faqSchema = generateContentFaqSchema(mockMovieContent, 'movie');

      expect(faqSchema).not.toBeNull();
      expect(faqSchema!['@context']).toBe('https://schema.org');
      expect(faqSchema!['@type']).toBe('FAQPage');
      expect(faqSchema!.mainEntity.length).toBeGreaterThan(0);

      // Where to watch FAQ
      const whereToWatchFaq = faqSchema!.mainEntity.find((q: any) =>
        q.name.includes('Where can I watch')
      );
      expect(whereToWatchFaq).toBeDefined();
      expect(whereToWatchFaq.acceptedAnswer.text).toContain('Netflix');
    });

    it('should generate FAQ schema for TV shows', () => {
      const faqSchema = generateContentFaqSchema(mockTvShowContent, 'tv-show');

      expect(faqSchema).not.toBeNull();
      expect(faqSchema!.mainEntity.length).toBeGreaterThan(0);
    });

    it('should include rating FAQ when rating exists', () => {
      const faqSchema = generateContentFaqSchema(mockMovieContent, 'movie');

      const ratingFaq = faqSchema!.mainEntity.find((q: any) =>
        q.name.includes('rating')
      );
      expect(ratingFaq).toBeDefined();
      expect(ratingFaq.acceptedAnswer.text).toContain('9/10');
    });

    it('should include release year FAQ', () => {
      const faqSchema = generateContentFaqSchema(mockMovieContent, 'movie');

      const releaseFaq = faqSchema!.mainEntity.find((q: any) =>
        q.name.includes('released')
      );
      expect(releaseFaq).toBeDefined();
      expect(releaseFaq.acceptedAnswer.text).toContain('2008');
    });

    it('should include genre FAQ', () => {
      const faqSchema = generateContentFaqSchema(mockMovieContent, 'movie');

      const genreFaq = faqSchema!.mainEntity.find((q: any) =>
        q.name.includes('genre')
      );
      expect(genreFaq).toBeDefined();
      expect(genreFaq.acceptedAnswer.text).toContain('Action');
    });

    it('should include runtime FAQ for movies', () => {
      const faqSchema = generateContentFaqSchema(mockMovieContent, 'movie');

      const runtimeFaq = faqSchema!.mainEntity.find((q: any) =>
        q.name.includes('How long')
      );
      expect(runtimeFaq).toBeDefined();
      expect(runtimeFaq.acceptedAnswer.text).toContain('152 minutes');
    });

    it('should format every FAQ name as a question', () => {
      const faqSchema = generateContentFaqSchema(mockMovieContent, 'movie');

      expect(faqSchema).not.toBeNull();
      faqSchema!.mainEntity.forEach((question: any) => {
        expect(question.name).toMatch(/\?$/);
      });
    });

    it('should handle content without streaming options', () => {
      const noStreamingContent: ContentData = { ...mockMovieContent, streamingOptions: [] };
      const faqSchema = generateContentFaqSchema(noStreamingContent, 'movie');

      const whereToWatchFaq = faqSchema!.mainEntity.find((q: any) =>
        q.name.includes('Where can I watch')
      );
      expect(whereToWatchFaq).toBeUndefined();
    });

    it('should handle content without rating', () => {
      const noRatingContent: ContentData = { ...mockMovieContent, rating: undefined };
      const faqSchema = generateContentFaqSchema(noRatingContent, 'movie');

      const ratingQuestion = faqSchema!.mainEntity.find((q: any) =>
        q.name.includes('rating')
      );
      expect(ratingQuestion).toBeUndefined();
    });

    it('should handle content without release year', () => {
      const noYearContent: ContentData = { ...mockMovieContent, releaseYear: undefined };
      const faqSchema = generateContentFaqSchema(noYearContent, 'movie');

      const yearQuestion = faqSchema!.mainEntity.find((q: any) =>
        q.name.includes('released')
      );
      expect(yearQuestion).toBeUndefined();
    });

    it('should handle content without genres', () => {
      const noGenresContent: ContentData = { ...mockMovieContent, genres: [] };
      const faqSchema = generateContentFaqSchema(noGenresContent, 'movie');

      const genreQuestion = faqSchema!.mainEntity.find((q: any) =>
        q.name.includes('genre')
      );
      expect(genreQuestion).toBeUndefined();
    });

    it('should handle content without runtime', () => {
      const noRuntimeContent: ContentData = { ...mockMovieContent, runtime: undefined };
      const faqSchema = generateContentFaqSchema(noRuntimeContent, 'movie');

      const runtimeQuestion = faqSchema!.mainEntity.find((q: any) =>
        q.name.includes('How long')
      );
      expect(runtimeQuestion).toBeUndefined();
    });

    it('should return null when no FAQs can be generated', () => {
      const minimalContent: ContentData = {
        id: '789',
        title: 'Minimal Movie',
        genres: [],
      };

      const faqSchema = generateContentFaqSchema(minimalContent, 'movie');
      expect(faqSchema).toBeNull();
    });
  });

  describe('generateStreamingHowToSchema', () => {
    it('should generate How-to schema for streaming', () => {
      const howToSchema = generateStreamingHowToSchema(mockMovieContent, 'movie');

      expect(howToSchema).not.toBeNull();
      expect(howToSchema!['@context']).toBe('https://schema.org');
      expect(howToSchema!['@type']).toBe('HowTo');
      expect(howToSchema!.name).toBe('How to Watch The Dark Knight Online');
      expect(howToSchema!.description).toContain('Netflix');
      expect(howToSchema!.totalTime).toBe('PT5M');

      // Check supplies
      expect((howToSchema as any).supply).toHaveLength(2);
      expect((howToSchema as any).supply[0]).toEqual({
        '@type': 'HowToSupply',
        name: 'Internet connection',
      });
      expect((howToSchema as any).supply[1]).toEqual({
        '@type': 'HowToSupply',
        name: 'Netflix subscription',
      });

      // Check tools
      expect((howToSchema as any).tool).toHaveLength(1);
      expect((howToSchema as any).tool[0]).toEqual({
        '@type': 'HowToTool',
        name: 'Device (computer, tablet, or phone)',
      });

      // Check steps
      expect((howToSchema as any).step).toHaveLength(4);
      expect((howToSchema as any).step[0].name).toBe('Visit Netflix');
    });

    it('should return null when no streaming options available', () => {
      const noStreamingContent: ContentData = { ...mockMovieContent, streamingOptions: [] };
      const howToSchema = generateStreamingHowToSchema(noStreamingContent, 'movie');

      expect(howToSchema).toBeNull();
    });

    it('should return null when streaming options is undefined', () => {
      const undefinedStreamingContent: ContentData = {
        ...mockMovieContent,
        streamingOptions: undefined
      };
      const howToSchema = generateStreamingHowToSchema(undefinedStreamingContent, 'movie');

      expect(howToSchema).toBeNull();
    });

    it('should use first streaming platform as primary', () => {
      const howToSchema = generateStreamingHowToSchema(mockMovieContent, 'movie');

      expect(howToSchema!.description).toContain('Netflix');
      expect((howToSchema as any).supply[1].name).toBe('Netflix subscription');
      expect((howToSchema as any).step[0].name).toBe('Visit Netflix');
      expect((howToSchema as any).step[0].url).toBe('https://netflix.com/watch/123');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very large cast arrays', () => {
      const largeCastContent: ContentData = {
        ...mockMovieContent,
        cast: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `Actor ${i}`,
          character: `Character ${i}`,
          profilePath: `/actor${i}.jpg`,
          order: i + 1,
        })),
      };

      const schemas = generateContentSchema(largeCastContent, 'movie');
      const [contentSchema] = schemas;

      expect((contentSchema as any).actor).toHaveLength(10); // Should be limited to 10
    });

    it('should handle multiple directors', () => {
      const multiDirectorContent: ContentData = {
        ...mockMovieContent,
        crew: [
          { id: 1, name: 'Director One', job: 'Director', department: 'Directing', profilePath: '/dir1.jpg' },
          { id: 2, name: 'Director Two', job: 'Director', department: 'Directing', profilePath: '/dir2.jpg' },
          { id: 3, name: 'Producer', job: 'Producer', department: 'Production', profilePath: '/prod.jpg' },
          { id: 4, name: 'Director Three', job: 'Director', department: 'Directing', profilePath: '/dir3.jpg' },
          { id: 5, name: 'Director Four', job: 'Director', department: 'Directing', profilePath: '/dir4.jpg' },
          { id: 6, name: 'Director Five', job: 'Director', department: 'Directing', profilePath: '/dir5.jpg' },
          { id: 7, name: 'Director Six', job: 'Director', department: 'Directing', profilePath: '/dir6.jpg' },
        ],
      };

      const schemas = generateContentSchema(multiDirectorContent, 'movie');
      const [contentSchema] = schemas;

      expect(contentSchema.director).toHaveLength(5); // Should be limited to 5
      expect(contentSchema.director.map((d: any) => d.name)).not.toContain('Director Six');
    });

    it('should handle streaming options without price', () => {
      const freeStreamingContent: ContentData = {
        ...mockMovieContent,
        streamingOptions: [
          {
            serviceId: 'free-platform',
            serviceName: 'Free Platform',
            url: 'https://freeplatform.com/watch/123',
            type: 'free' as const,
            quality: ['HD'],
          },
        ],
      };

      const schemas = generateContentSchema(freeStreamingContent, 'movie');
      const [contentSchema] = schemas;

      const offers = contentSchema.offers as Array<{ price?: unknown; priceCurrency?: unknown }>;
      expect(offers[0].price).toBeUndefined();
      expect(offers[0].priceCurrency).toBeUndefined();
    });

    it('should handle cast without character information', () => {
      const noCharacterContent: ContentData = {
        ...mockMovieContent,
        cast: [
          { id: 1, name: 'Actor Name', profilePath: '/actor.jpg', order: 1 },
        ],
      };

      const schemas = generateContentSchema(noCharacterContent, 'movie');
      const [contentSchema] = schemas;

      expect((contentSchema as any).actor[0].roleName).toBeUndefined();
    });

    it('should handle breadcrumb for TV shows', () => {
      const schemas = generateContentSchema(mockTvShowContent, 'tv-show');
      const [, breadcrumbSchema] = schemas;

      expect(breadcrumbSchema.itemListElement[1].name).toBe('TV Shows');
      expect(breadcrumbSchema.itemListElement[1].item).toBe('https://geoleap.app/how-to-watch');
    });

    it('should handle breadcrumb for documentaries', () => {
      const docContent: ContentData = { ...mockMovieContent, title: 'Documentary Film' };
      const schemas = generateContentSchema(docContent, 'documentary');
      const [, breadcrumbSchema] = schemas;

      expect(breadcrumbSchema.itemListElement[1].name).toBe('Documentaries');
      expect(breadcrumbSchema.itemListElement[1].item).toBe('https://geoleap.app/how-to-watch');
    });
  });

  describe('generateWebApplicationSchema', () => {
    it('should generate valid WebApplication schema', () => {
      const schema = generateWebApplicationSchema();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebApplication');
      expect(schema.name).toBe('GeoLeap');
      expect(schema.applicationCategory).toBe('EntertainmentApplication');
      expect(schema.operatingSystem).toBe('Web');
    });

    it('should include browser requirements', () => {
      const schema = generateWebApplicationSchema();

      expect(schema.browserRequirements).toBeDefined();
    });

    it('should include feature list', () => {
      const schema = generateWebApplicationSchema();

      expect(schema.featureList).toBeDefined();
      expect(Array.isArray(schema.featureList)).toBe(true);
      expect((schema.featureList as unknown[]).length).toBeGreaterThan(0);
    });

    it('should include offers', () => {
      const schema = generateWebApplicationSchema();

      expect(schema.offers).toBeDefined();
    });
  });

  describe('generateOrganizationSchema', () => {
    it('should generate valid Organization schema', () => {
      const schema = generateOrganizationSchema();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Organization');
      expect(schema.name).toBe('GeoLeap');
      expect(schema.url).toBeDefined();
      expect(schema.logo).toBeDefined();
    });

    it('should include contact point', () => {
      const schema = generateOrganizationSchema();

      expect(schema.contactPoint).toBeDefined();
      expect((schema.contactPoint as Record<string, unknown>)['@type']).toBe('ContactPoint');
    });
  });

  describe('generateCountryAvailabilitySchema', () => {
    it('should generate valid ItemList schema for country availability', () => {
      const countries = [
        { name: 'United States', code: 'US', servicesCount: 50 },
        { name: 'United Kingdom', code: 'GB', servicesCount: 35 },
      ];

      const schema = generateCountryAvailabilitySchema(countries);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('ItemList');
      expect(schema.itemListElement).toHaveLength(2);
    });

    it('should include country details in list items', () => {
      const countries = [
        { name: 'Germany', code: 'DE', servicesCount: 25 },
      ];

      const schema = generateCountryAvailabilitySchema(countries);

      expect(schema.itemListElement[0]['@type']).toBe('ListItem');
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[0].item['@type']).toBe('Country');
      expect(schema.itemListElement[0].item.name).toBe('Germany');
    });

    it('should set positions correctly', () => {
      const countries = [
        { name: 'France', code: 'FR', servicesCount: 30 },
        { name: 'Spain', code: 'ES', servicesCount: 28 },
        { name: 'Italy', code: 'IT', servicesCount: 26 },
      ];

      const schema = generateCountryAvailabilitySchema(countries);

      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[1].position).toBe(2);
      expect(schema.itemListElement[2].position).toBe(3);
    });
  });
});

// ---------------------------------------------------------------------------
// pSEO schema enhancements
// ---------------------------------------------------------------------------

import {
  generateStreamingServiceSchema,
  generatePlatformProductSchema,
  generateComparisonPageSchema,
  generateGlossaryTermSchema,
  generateSpeakableSchema,
  generatePlatformCountryHowToSchema,
} from '../schema-markup';

describe('pSEO schema enhancements', () => {
  describe('dateModified on pSEO schemas', () => {
    it('generateStreamingServiceSchema includes dateModified', () => {
      const schema = generateStreamingServiceSchema({
        name: 'Netflix',
        slug: 'netflix',
        description: 'A streaming service',
      });
      expect(schema).toHaveProperty('dateModified');
      expect(typeof schema.dateModified).toBe('string');
    });

    it('generatePlatformProductSchema includes dateModified', () => {
      const schema = generatePlatformProductSchema({
        name: 'Netflix',
        slug: 'netflix',
        description: 'A streaming service',
        pricing: {
          startsAt: 9.99,
          currency: 'USD',
          billingPeriod: 'monthly',
          hasFreeTier: false,
          hasTrial: true,
        },
        availableCountries: ['US', 'GB'],
      });
      expect(schema).toHaveProperty('dateModified');
      expect(typeof schema.dateModified).toBe('string');
    });

    it('generateComparisonPageSchema includes dateModified', () => {
      const schema = generateComparisonPageSchema({
        title: 'Netflix vs Disney+',
        description: 'Compare the two',
        url: 'https://geoleap.app/compare/netflix-vs-disney-plus',
      });
      expect(schema).toHaveProperty('dateModified');
      expect(typeof schema.dateModified).toBe('string');
    });

    it('generateGlossaryTermSchema includes dateModified', () => {
      const schema = generateGlossaryTermSchema({
        term: 'Geo-restriction',
        definition: 'Content limited by region',
        url: 'https://geoleap.app/glossary/geo-restriction',
      });
      expect(schema).toHaveProperty('dateModified');
      expect(typeof schema.dateModified).toBe('string');
    });
  });

  describe('generateOrganizationSchema enhanced fields', () => {
    it('includes foundingDate', () => {
      const schema = generateOrganizationSchema();
      expect(schema.foundingDate).toBe('2025');
    });

    it('includes areaServed', () => {
      const schema = generateOrganizationSchema();
      expect(schema.areaServed).toBe('Worldwide');
    });

    it('includes knowsAbout array with expected topics', () => {
      const schema = generateOrganizationSchema();
      expect(Array.isArray(schema.knowsAbout)).toBe(true);
      const topics = schema.knowsAbout as string[];
      expect(topics).toContain('Streaming services');
      expect(topics).toContain('VPN technology');
      expect(topics.length).toBe(5);
    });

    it('includes slogan', () => {
      const schema = generateOrganizationSchema();
      expect(schema.slogan).toBe('Search globally, stream locally');
    });

    it('includes linkedin and github in sameAs', () => {
      const schema = generateOrganizationSchema();
      const sameAs = schema.sameAs as string[];
      expect(sameAs).toContain('https://linkedin.com/company/geoleap');
      expect(sameAs).toContain('https://github.com/geoleap');
    });
  });

  describe('generateSpeakableSchema', () => {
    it('returns correct structure with @type WebPage', () => {
      const schema = generateSpeakableSchema('https://geoleap.app/platforms/netflix');
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebPage');
      expect(schema.url).toBe('https://geoleap.app/platforms/netflix');
    });

    it('includes speakable with cssSelector array', () => {
      const schema = generateSpeakableSchema('https://geoleap.app/platforms/netflix');
      const speakable = schema.speakable as Record<string, unknown>;
      expect(speakable['@type']).toBe('SpeakableSpecification');
      expect(Array.isArray(speakable.cssSelector)).toBe(true);
      const selectors = speakable.cssSelector as string[];
      expect(selectors).toContain('.bluf-summary');
      expect(selectors).toContain('h1');
      expect(selectors).toContain('.faq-answer');
    });
  });

  describe('generatePlatformCountryHowToSchema', () => {
    it('returns HowTo schema with 3 steps when available', () => {
      const schema = generatePlatformCountryHowToSchema({
        platformName: 'Netflix',
        countryName: 'United States',
        isAvailable: true,
      });
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('HowTo');
      expect(schema.name).toBe('How to watch Netflix in United States');
      const steps = schema.step as Array<Record<string, unknown>>;
      expect(steps).toHaveLength(3);
      expect(steps[0].position).toBe(1);
      expect(steps[1].name).toBe('Sign up or log in');
      expect(steps[2].name).toBe('Start streaming');
    });

    it('returns alternative steps when not available', () => {
      const schema = generatePlatformCountryHowToSchema({
        platformName: 'HBO Max',
        countryName: 'Japan',
        isAvailable: false,
      });
      expect(schema.name).toBe('How to watch HBO Max in Japan');
      const steps = schema.step as Array<Record<string, unknown>>;
      expect(steps[1].name).toBe('Explore alternatives');
      expect((steps[2].text as string)).toContain('GeoLeap');
    });

    it('includes description matching availability', () => {
      const available = generatePlatformCountryHowToSchema({
        platformName: 'Netflix',
        countryName: 'UK',
        isAvailable: true,
      });
      expect((available.description as string)).toContain('Step-by-step guide');

      const unavailable = generatePlatformCountryHowToSchema({
        platformName: 'Netflix',
        countryName: 'UK',
        isAvailable: false,
      });
      expect((unavailable.description as string)).toContain('How to check');
    });
  });

  describe('generateWebSiteSchema', () => {
    it('returns WebSite type with @id', () => {
      const schema = generateWebSiteSchema();
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebSite');
      expect(schema['@id']).toBe('https://geoleap.app/#website');
    });

    it('includes SearchAction potentialAction', () => {
      const schema = generateWebSiteSchema();
      const action = schema.potentialAction as Record<string, unknown>;
      const target = action.target as Record<string, unknown>;
      expect(action['@type']).toBe('SearchAction');
      expect(target.urlTemplate).toBe('https://geoleap.app/search?q={search_term_string}');
    });

    it('references organization via publisher @id', () => {
      const schema = generateWebSiteSchema();
      const publisher = schema.publisher as Record<string, unknown>;
      expect(publisher['@id']).toBe('https://geoleap.app/#organization');
    });
  });

  describe('generateDataCatalogSchema', () => {
    it('returns DataCatalog type', () => {
      const schema = generateDataCatalogSchema();
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('DataCatalog');
    });

    it('includes three datasets', () => {
      const schema = generateDataCatalogSchema();
      const datasets = schema.dataset as unknown[];
      expect(datasets).toHaveLength(3);
    });

    it('all datasets have required fields', () => {
      const schema = generateDataCatalogSchema();
      const datasets = schema.dataset as Array<Record<string, unknown>>;
      for (const ds of datasets) {
        expect(ds['@type']).toBe('Dataset');
        expect(typeof ds.name).toBe('string');
        expect(typeof ds.url).toBe('string');
        expect(ds.isAccessibleForFree).toBe(true);
      }
    });

    it('references organization via provider @id', () => {
      const schema = generateDataCatalogSchema();
      const provider = schema.provider as Record<string, unknown>;
      expect(provider['@id']).toBe('https://geoleap.app/#organization');
    });
  });

  describe('generateGlossaryTermSetSchema', () => {
    const terms = [
      { term: 'SVOD', definition: 'Subscription Video on Demand', slug: 'svod' },
      { term: 'AVOD', definition: 'Ad-supported Video on Demand', slug: 'avod' },
    ];

    it('returns DefinedTermSet type', () => {
      const schema = generateGlossaryTermSetSchema(terms);
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('DefinedTermSet');
    });

    it('includes hasDefinedTerm array matching input', () => {
      const schema = generateGlossaryTermSetSchema(terms);
      const defined = schema.hasDefinedTerm as Array<Record<string, unknown>>;
      expect(defined).toHaveLength(2);
      expect(defined[0]['@type']).toBe('DefinedTerm');
      expect(defined[0].name).toBe('SVOD');
      expect(defined[1].name).toBe('AVOD');
    });

    it('generates correct URL for each term', () => {
      const schema = generateGlossaryTermSetSchema(terms);
      const defined = schema.hasDefinedTerm as Array<Record<string, unknown>>;
      expect(defined[0].url).toBe('https://geoleap.app/glossary/svod');
    });

    it('includes dateModified', () => {
      const schema = generateGlossaryTermSetSchema(terms);
      expect(typeof schema.dateModified).toBe('string');
    });
  });

  describe('generateWebApplicationSchema with offers', () => {
    it('includes both Free and Premium offers', () => {
      const schema = generateWebApplicationSchema();
      const offers = schema.offers as Array<Record<string, unknown>>;
      expect(Array.isArray(offers)).toBe(true);
      expect(offers).toHaveLength(2);
      const names = offers.map(o => o.name);
      expect(names).toContain('Free');
      expect(names).toContain('Premium');
    });

    it('free offer has price 0', () => {
      const schema = generateWebApplicationSchema();
      const offers = schema.offers as Array<Record<string, unknown>>;
      const free = offers.find(o => o.name === 'Free');
      expect(free?.price).toBe('0');
      expect(free?.description).toContain('Unlimited streaming searches');
    });

    it('has @id linking to webapp node', () => {
      const schema = generateWebApplicationSchema();
      expect(schema['@id']).toBe('https://geoleap.app/#webapp');
    });
  });

  describe('generateOrganizationSchema @id', () => {
    it('has @id linking to organization node', () => {
      const schema = generateOrganizationSchema();
      expect(schema['@id']).toBe('https://geoleap.app/#organization');
    });

    it('uses an existing support route for contact point', () => {
      const schema = generateOrganizationSchema();
      expect((schema.contactPoint as Record<string, unknown>).url).toBe('https://geoleap.app/support');
    });
  });

  describe('generateFeatureIndexFaqSchema', () => {
    it('generates FAQPage schema for the feature index', () => {
      const schema = generateFeatureIndexFaqSchema([
        { question: 'Which feature should I start with?', answer: 'Start with streaming search.' },
      ]);

      expect(schema['@type']).toBe('FAQPage');
      const questions = schema.mainEntity as Array<Record<string, unknown>>;
      expect(questions[0].name).toBe('Which feature should I start with?');
      expect((questions[0].acceptedAnswer as Record<string, unknown>).text).toBe('Start with streaming search.');
    });
  });

  describe('anime content type', () => {
    const mockAnimeContent: ContentData = {
      id: '789',
      title: 'Fullmetal Alchemist: Brotherhood',
      overview: 'Two brothers search for a Philosopher Stone after an attempt to revive their deceased mother goes wrong.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/anime-poster.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1920/anime-backdrop.jpg',
      releaseYear: 2009,
      genres: ['Animation', 'Action', 'Adventure'],
      rating: 9.1,
      voteCount: 1500000,
      contentRating: 'TV-14',
      cast: [
        { id: 20, name: 'Romi Park', character: 'Edward Elric', profilePath: '/romi-park.jpg', order: 1 },
      ],
      crew: [
        { id: 21, name: 'Yasuhiro Irie', job: 'Director', department: 'Directing', profilePath: '/yasuhiro-irie.jpg' },
      ],
      streamingOptions: [],
    };

    it('should generate anime schema with TVSeries type (same as tv-show)', () => {
      const schemas = generateContentSchema(mockAnimeContent, 'anime');
      expect(Array.isArray(schemas)).toBe(true);
      const [contentSchema] = schemas;
      expect(contentSchema['@type']).toBe('TVSeries');
    });

    it('should include content name and identifier in anime schema', () => {
      const schemas = generateContentSchema(mockAnimeContent, 'anime');
      const [contentSchema] = schemas;
      expect(contentSchema.name).toBe('Fullmetal Alchemist: Brotherhood');
      expect(contentSchema.identifier).toBe('789');
    });

    it('should generate breadcrumb schema for anime', () => {
      const schemas = generateContentSchema(mockAnimeContent, 'anime');
      const [, breadcrumbSchema] = schemas;
      expect(breadcrumbSchema['@type']).toBe('BreadcrumbList');
    });

    it('generateContentFaqSchema should work for anime type', () => {
      const animeWithFaq: ContentData = {
        ...mockAnimeContent,
        rating: 9.1,
        voteCount: 1500000,
        releaseYear: 2009,
        genres: ['Animation'],
      };
      const faqSchema = generateContentFaqSchema(animeWithFaq, 'anime');
      expect(faqSchema).not.toBeNull();
      expect(faqSchema!['@type']).toBe('FAQPage');
    });
  });
});
