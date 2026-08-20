import { generateContentMetadata, generateMetaTags } from '../content-metadata';
import type { ContentData } from '@/lib/api/content';

// Mock the url-generation module
jest.mock('../url-generation', () => ({
  generateContentSlug: jest.fn((id, title, year) => {
    const titleSlug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').replace(/^-+|-+$/g, '');
    return year ? `${id}-${titleSlug}-${year}` : `${id}-${titleSlug}`;
  }),
  generateCanonicalUrl: jest.fn((type, slug) => `https://geoleap.app/content/${type}/${slug}`),
  generateOgImageUrl: jest.fn((id, title, type) => `https://geoleap.app/api/og?id=${id}&title=${encodeURIComponent(title)}&type=${type}`),
}));

describe('Content Metadata Generation', () => {
  const mockMovieContent: ContentData = {
    id: '123',
    title: 'The Dark Knight',
    originalTitle: 'The Dark Knight',
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
    ],
    crew: [
      { id: 4, name: 'Christopher Nolan', job: 'Director', department: 'Directing', profilePath: '/nolan.jpg' },
      { id: 5, name: 'Jonathan Nolan', job: 'Writer', department: 'Writing', profilePath: '/jonathan.jpg' },
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
    ],
    streamingOptions: [],
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://geoleap.app';
  });

  describe('generateContentMetadata', () => {
    it('should generate comprehensive metadata for movies', async () => {
      const metadata = await generateContentMetadata(mockMovieContent, 'movie');

      expect(metadata.title).toContain('The Dark Knight');
      expect(metadata.title).toContain('2008');
      expect(metadata.title).toContain('GeoLeap');

      expect(metadata.description).toContain('The Dark Knight');
      expect(metadata.description).toContain('Available on 2 streaming platform');
      expect(typeof metadata.description === 'string' ? metadata.description.length : 0).toBeLessThanOrEqual(160);

      expect(metadata.keywords).toContain('The Dark Knight');
      expect(metadata.keywords).toContain('movie, film, cinema');
      expect(metadata.keywords).toContain('2008');
    });

    it('should generate metadata for TV shows', async () => {
      const metadata = await generateContentMetadata(mockTvShowContent, 'tv-show');

      expect(metadata.title).toContain('Breaking Bad');
      expect(metadata.title).toContain('GeoLeap');

      expect(metadata.description).toContain('Breaking Bad');
      expect(metadata.description).toContain('Find streaming options');
    });

    it('should handle content without streaming options', async () => {
      const metadata = await generateContentMetadata(mockTvShowContent, 'tv-show');

      expect(metadata.title).toContain('GeoLeap');
      expect(metadata.description).toContain('Find streaming options');
      expect(typeof metadata.description === 'string' ? metadata.description.length : 0).toBeLessThanOrEqual(160);
    });

    it('should generate proper OpenGraph metadata', async () => {
      const metadata = await generateContentMetadata(mockMovieContent, 'movie');

      expect(metadata.openGraph).toBeDefined();
      // Type assertion needed because openGraph is a union type
      expect((metadata.openGraph as any)?.type).toBe('video.movie');
      expect(metadata.openGraph?.title).toContain('The Dark Knight');
      expect(metadata.openGraph?.siteName).toBe('GeoLeap');
      expect(metadata.openGraph?.locale).toBe('en_US');

      const images = metadata.openGraph?.images as any[];
      expect(images).toBeDefined();
      expect(images.length).toBeGreaterThan(0);
    });

    it('should generate Twitter Card metadata', async () => {
      const metadata = await generateContentMetadata(mockMovieContent, 'movie');

      // Type assertion needed because twitter is a union type
      expect((metadata.twitter as any)?.card).toBe('summary_large_image');
      expect(metadata.twitter?.title).toContain('The Dark Knight');
      expect(metadata.twitter?.creator).toBe('@GeoLeapApp');
      expect(metadata.twitter?.site).toBe('@GeoLeapApp');
    });

    it('should include video-specific metadata for movies', async () => {
      const metadata = await generateContentMetadata(mockMovieContent, 'movie');

      expect((metadata.openGraph as any)?.type).toBe('video.movie');
      expect((metadata.openGraph as any)?.releaseDate).toBe('2008-01-01');
      expect((metadata.openGraph as any)?.genre).toEqual(['Action', 'Crime', 'Drama']);
      expect((metadata.openGraph as any)?.actor).toBeDefined();
      expect((metadata.openGraph as any)?.director).toEqual(['Christopher Nolan']);
      expect((metadata.openGraph as any)?.duration).toBe(9120); // 152 minutes * 60
    });

    it('should handle TV show specific metadata', async () => {
      const metadata = await generateContentMetadata(mockTvShowContent, 'tv-show');

      expect((metadata.openGraph as any)?.type).toBe('video.tv_show');
    });

    it('should set proper robots configuration', async () => {
      const metadata = await generateContentMetadata(mockMovieContent, 'movie');

      expect(metadata.robots).toEqual({
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      });
    });

    it('should truncate long titles for Twitter', async () => {
      const longTitleContent: ContentData = {
        ...mockMovieContent,
        title: 'This Is A Very Long Movie Title That Should Be Truncated For Twitter Cards Because It Exceeds The Character Limit',
      };

      const metadata = await generateContentMetadata(longTitleContent, 'movie');
      const twitterTitle = metadata.twitter?.title;
      expect(typeof twitterTitle === 'string' ? twitterTitle.length : 0).toBeLessThanOrEqual(70);
    });

    it('should truncate long descriptions for Twitter', async () => {
      const longDescContent: ContentData = {
        ...mockMovieContent,
        overview: 'This is a very long movie description that should be truncated for Twitter cards because it exceeds the character limit. '.repeat(5),
      };

      const metadata = await generateContentMetadata(longDescContent, 'movie');
      expect(metadata.twitter?.description?.length).toBeLessThanOrEqual(160);
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalContent: ContentData = {
        id: '789',
        title: 'Minimal Movie',
        genres: [],
      };

      const metadata = await generateContentMetadata(minimalContent, 'movie');

      expect(metadata.title).toContain('Minimal Movie');
      expect(metadata.description).toContain('Find streaming options');
      expect(metadata.keywords).toContain('Minimal Movie');
    });

    it('should include app links when streaming options exist', async () => {
      const metadata = await generateContentMetadata(mockMovieContent, 'movie');

      expect(metadata.appLinks).toBeDefined();
      // Handle both single object and array cases
      const webLinks = metadata.appLinks?.web;
      if (Array.isArray(webLinks)) {
        expect(webLinks[0]?.url).toContain('/content/movie/');
      } else {
        expect(webLinks?.url).toContain('/content/movie/');
      }
    });

    it('should not include app links when no streaming options', async () => {
      const metadata = await generateContentMetadata(mockTvShowContent, 'tv-show');

      expect(metadata.appLinks).toBeUndefined();
    });
  });

  describe('generateMetaTags', () => {
    it('should generate HTML meta tags for movies', () => {
      const metaTags = generateMetaTags(mockMovieContent, 'movie');

      expect(metaTags).toContain('<meta name="description"');
      expect(metaTags).toContain('<meta name="keywords"');
      expect(metaTags).toContain('<meta property="og:type" content="video.movie"');
      expect(metaTags).toContain('<meta property="og:title" content="The Dark Knight"');
      expect(metaTags).toContain('<meta property="og:image"');
      expect(metaTags).toContain('<meta property="video:release_date" content="2008-01-01"');
      expect(metaTags).toContain('<meta property="video:duration" content="9120"');
      expect(metaTags).toContain('<meta name="twitter:card" content="summary_large_image"');
    });

    it('should generate HTML meta tags for TV shows', () => {
      const metaTags = generateMetaTags(mockTvShowContent, 'tv-show');

      expect(metaTags).toContain('<meta property="og:type" content="video.tv_show"');
      expect(metaTags).toContain('Breaking Bad');
    });

    it('should handle content without poster images', () => {
      const contentWithoutPoster: ContentData = {
        ...mockMovieContent,
        posterUrl: undefined,
      };

      const metaTags = generateMetaTags(contentWithoutPoster, 'movie');

      expect(metaTags).not.toContain('<meta property="og:image"');
      expect(metaTags).not.toContain('<meta name="twitter:image"');
    });

    it('should handle content without runtime', () => {
      const contentWithoutRuntime: ContentData = {
        ...mockMovieContent,
        runtime: undefined,
      };

      const metaTags = generateMetaTags(contentWithoutRuntime, 'movie');

      expect(metaTags).not.toContain('<meta property="video:duration"');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very short titles', async () => {
      const shortTitleContent: ContentData = {
        ...mockMovieContent,
        title: 'It',
      };
      const metadata = await generateContentMetadata(shortTitleContent, 'movie');

      expect(metadata.title).toContain('It');
      const titleLength = typeof metadata.title === 'string' ? metadata.title.length : String(metadata.title).length;
      expect(titleLength).toBeGreaterThan(5);
    });

    it('should handle content with no genres', async () => {
      const noGenresContent: ContentData = {
        ...mockMovieContent,
        genres: [],
      };
      const metadata = await generateContentMetadata(noGenresContent, 'movie');

      expect(metadata.keywords).not.toContain('undefined');
      expect(metadata.openGraph).toBeDefined();
    });

    it('should handle content with no cast or crew', async () => {
      const noCastContent: ContentData = {
        ...mockMovieContent,
        cast: [],
        crew: [],
      };
      const metadata = await generateContentMetadata(noCastContent, 'movie');

      expect(metadata.keywords).not.toContain('undefined');
    });

    it('should handle zero ratings gracefully', async () => {
      const zeroRatingContent: ContentData = {
        ...mockMovieContent,
        rating: 0,
        voteCount: 0,
      };
      const metadata = await generateContentMetadata(zeroRatingContent, 'movie');

      expect(metadata.title).not.toContain('0/10');
    });

    it('should handle null/undefined streaming options', async () => {
      const noStreamingContent: ContentData = {
        ...mockMovieContent,
        streamingOptions: undefined,
      };
      const metadata = await generateContentMetadata(noStreamingContent, 'movie');

      expect(metadata.description).toContain('Find streaming options');
      expect(metadata.title).toContain('GeoLeap');
    });

    it('should generate keywords with cast members', async () => {
      const metadata = await generateContentMetadata(mockMovieContent, 'movie');

      expect(metadata.keywords).toContain('Christian Bale');
      expect(metadata.keywords).toContain('Heath Ledger');
      expect(metadata.keywords).toContain('Aaron Eckhart');
    });

    it('should generate keywords with director', async () => {
      const metadata = await generateContentMetadata(mockMovieContent, 'movie');

      expect(metadata.keywords).toContain('Christopher Nolan');
    });

    it('should include streaming platforms in keywords', async () => {
      const metadata = await generateContentMetadata(mockMovieContent, 'movie');

      expect(metadata.keywords).toContain('Netflix');
      expect(metadata.keywords).toContain('Amazon Prime Video');
    });

    it('should include watch online keywords', async () => {
      const metadata = await generateContentMetadata(mockMovieContent, 'movie');

      expect(metadata.keywords).toContain('watch online');
      expect(metadata.keywords).toContain('streaming');
      expect(metadata.keywords).toContain('where to watch');
    });

    it('should handle documentary type', async () => {
      const metadata = await generateContentMetadata(mockMovieContent, 'documentary');

      expect(metadata.title).toContain('Documentary');
      expect(metadata.keywords).toContain('documentary');
    });

    it('should handle anime type', async () => {
      const metadata = await generateContentMetadata(mockMovieContent, 'anime');

      expect(metadata.title).toContain('Anime');
      expect(metadata.keywords).toContain('anime');
    });
  });

  describe('anime content type', () => {
    const mockAnimeContent: ContentData = {
      id: '789',
      title: 'Fullmetal Alchemist: Brotherhood',
      originalTitle: 'Hagane no Renkinjutsushi: Fullmetal Alchemist',
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
      streamingOptions: [
        {
          serviceId: 'crunchyroll',
          serviceName: 'Crunchyroll',
          url: 'https://crunchyroll.com/watch/fma',
          type: 'subscription' as const,
          quality: ['HD'],
        },
      ],
    };

    it('should generate valid metadata for anime without throwing', async () => {
      await expect(generateContentMetadata(mockAnimeContent, 'anime')).resolves.not.toThrow();
    });

    it('should include title and description in anime metadata', async () => {
      const metadata = await generateContentMetadata(mockAnimeContent, 'anime');

      expect(metadata.title).toBeDefined();
      expect(typeof metadata.title === 'string' || typeof metadata.title === 'object').toBe(true);
      const titleStr = typeof metadata.title === 'string' ? metadata.title : String(metadata.title);
      expect(titleStr).toContain('Fullmetal Alchemist: Brotherhood');
      expect(titleStr).toContain('GeoLeap');

      expect(metadata.description).toBeDefined();
      expect(typeof metadata.description).toBe('string');
      expect(metadata.description as string).toContain('Fullmetal Alchemist: Brotherhood');
    });

    it('should generate proper OpenGraph metadata for anime', async () => {
      const metadata = await generateContentMetadata(mockAnimeContent, 'anime');

      expect(metadata.openGraph).toBeDefined();
      expect(metadata.openGraph?.siteName).toBe('GeoLeap');
    });

    it('should generate Twitter Card metadata for anime', async () => {
      const metadata = await generateContentMetadata(mockAnimeContent, 'anime');

      expect((metadata.twitter as Record<string, unknown>)?.card).toBe('summary_large_image');
      expect(metadata.twitter?.creator).toBe('@GeoLeapApp');
    });

    it('should set proper robots configuration for anime', async () => {
      const metadata = await generateContentMetadata(mockAnimeContent, 'anime');

      expect(metadata.robots).toEqual({
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      });
    });
  });
});
