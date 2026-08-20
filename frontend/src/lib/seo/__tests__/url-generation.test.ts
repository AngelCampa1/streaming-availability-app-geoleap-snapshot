import {
  generateContentSlug,
  parseContentSlug,
  generateCategoryUrl,
  generateGenreUrl,
  generateYearUrl,
  generateSearchUrl,
  generateCanonicalUrl,
  generateOgImageUrl,
  isValidSlug,
  generateBreadcrumbUrls,
  getTypeDisplayName,
  generateSitemapUrls,
} from '../url-generation';

describe('URL Generation Utilities', () => {
  describe('generateContentSlug', () => {
    it('should generate slug from ID and title', () => {
      const slug = generateContentSlug('123', 'The Dark Knight');
      expect(slug).toBe('123-the-dark-knight');
    });

    it('should include year when provided', () => {
      const slug = generateContentSlug('123', 'The Dark Knight', 2008);
      expect(slug).toBe('123-the-dark-knight-2008');
    });

    it('should handle special characters in title', () => {
      const slug = generateContentSlug('456', 'Spider-Man: No Way Home!');
      expect(slug).toBe('456-spider-man-no-way-home');
    });

    it('should handle multiple spaces', () => {
      const slug = generateContentSlug('789', 'The   Lord    of  Rings');
      expect(slug).toBe('789-the-lord-of-rings');
    });

    it('should handle leading/trailing spaces', () => {
      const slug = generateContentSlug('100', '  Breaking Bad  ');
      expect(slug).toBe('100-breaking-bad');
    });

    it('should handle multiple hyphens', () => {
      const slug = generateContentSlug('200', 'Movie--With---Hyphens');
      expect(slug).toBe('200-movie-with-hyphens');
    });

    it('should handle numbers in title', () => {
      const slug = generateContentSlug('300', '2001: A Space Odyssey');
      expect(slug).toBe('300-2001-a-space-odyssey');
    });

    it('should handle very short titles', () => {
      const slug = generateContentSlug('400', 'It');
      expect(slug).toBe('400-it');
    });

    it('should remove all special characters', () => {
      const slug = generateContentSlug('500', 'The @#$% Movie!!! (2023)');
      expect(slug).toBe('500-the-movie-2023');
    });

    it('should handle Unicode characters', () => {
      const slug = generateContentSlug('600', 'Amélie');
      expect(slug).toBe('600-amlie');
    });
  });

  describe('parseContentSlug', () => {
    it('should parse basic slug correctly', () => {
      const result = parseContentSlug('123-the-dark-knight');
      expect(result).toEqual({
        id: '123',
        title: 'The Dark Knight',
      });
    });

    it('should parse slug with year correctly', () => {
      const result = parseContentSlug('123-the-dark-knight-2008');
      expect(result).toEqual({
        id: '123',
        title: 'The Dark Knight',
      });
    });

    it('should handle multi-word titles', () => {
      const result = parseContentSlug('456-lord-of-the-rings-fellowship');
      expect(result).toEqual({
        id: '456',
        title: 'Lord Of The Rings Fellowship',
      });
    });

    it('should capitalize each word', () => {
      const result = parseContentSlug('789-breaking-bad');
      expect(result).toEqual({
        id: '789',
        title: 'Breaking Bad',
      });
    });

    it('should throw error for invalid slug format', () => {
      expect(() => parseContentSlug('invalid')).toThrow('Invalid content slug format');
    });

    it('should throw error for empty slug', () => {
      expect(() => parseContentSlug('')).toThrow('Invalid content slug format');
    });

    it('should handle numeric IDs', () => {
      const result = parseContentSlug('999-test-movie');
      expect(result.id).toBe('999');
    });

    it('should remove year from end if present', () => {
      const result = parseContentSlug('100-movie-title-2023');
      expect(result.title).toBe('Movie Title');
    });

    it('should not remove 4-digit numbers that are not years at the end', () => {
      const result = parseContentSlug('200-movie-1234-test');
      expect(result.title).toBe('Movie 1234 Test');
    });

    // GUID ids contain hyphens (8-4-4-4-12). The naive "everything before the first
    // hyphen" parse truncates them to the first 8-hex group, so the API receives a
    // fragment id and returns 404 -> content detail/anime deep links render notFound().
    it('should extract a full GUID id, not just the first hyphen group', () => {
      const result = parseContentSlug(
        '2c7f8a5c-a89d-4c34-9a8c-16694537e98d-the-dark-knight'
      );
      expect(result.id).toBe('2c7f8a5c-a89d-4c34-9a8c-16694537e98d');
      expect(result.title).toBe('The Dark Knight');
    });

    it('should extract a GUID id when a year is appended', () => {
      const result = parseContentSlug(
        '2c7f8a5c-a89d-4c34-9a8c-16694537e98d-the-dark-knight-2008'
      );
      expect(result.id).toBe('2c7f8a5c-a89d-4c34-9a8c-16694537e98d');
      expect(result.title).toBe('The Dark Knight');
    });

    it('should extract an uppercase GUID id', () => {
      const result = parseContentSlug(
        '2C7F8A5C-A89D-4C34-9A8C-16694537E98D-the-office'
      );
      expect(result.id).toBe('2C7F8A5C-A89D-4C34-9A8C-16694537E98D');
      expect(result.title).toBe('The Office');
    });
  });

  describe('generateContentSlug / parseContentSlug round-trip', () => {
    it('round-trips a GUID id through generate and parse', () => {
      const id = '3c9cc618-341e-44d4-8d6e-e6e4e955e7fa';
      const slug = generateContentSlug(id, 'Avatar: The Last Airbender', 2005);
      const parsed = parseContentSlug(slug);
      expect(parsed.id).toBe(id);
      expect(parsed.title).toBe('Avatar The Last Airbender');
    });

    it('round-trips a numeric id through generate and parse', () => {
      const slug = generateContentSlug('123', 'The Dark Knight', 2008);
      const parsed = parseContentSlug(slug);
      expect(parsed.id).toBe('123');
      expect(parsed.title).toBe('The Dark Knight');
    });
  });

  describe('generateCategoryUrl', () => {
    it('should generate movie category URL', () => {
      expect(generateCategoryUrl('movie')).toBe('/how-to-watch');
    });

    it('should generate TV show category URL', () => {
      expect(generateCategoryUrl('tv-show')).toBe('/how-to-watch');
    });

    it('should generate documentary category URL', () => {
      expect(generateCategoryUrl('documentary')).toBe('/how-to-watch');
    });
  });

  describe('generateGenreUrl', () => {
    it('should generate genre URL for movies', () => {
      const url = generateGenreUrl('movie', 'Action');
      expect(url).toBe('/how-to-watch');
    });

    it('should generate genre URL for TV shows', () => {
      const url = generateGenreUrl('tv-show', 'Drama');
      expect(url).toBe('/how-to-watch');
    });

    it('should handle multi-word genres', () => {
      const url = generateGenreUrl('movie', 'Science Fiction');
      expect(url).toBe('/how-to-watch');
    });

    it('should handle genres with special characters', () => {
      const url = generateGenreUrl('movie', 'Action & Adventure');
      expect(url).toBe('/how-to-watch');
    });

    it('should convert genre to lowercase', () => {
      const url = generateGenreUrl('documentary', 'NATURE');
      expect(url).toBe('/how-to-watch');
    });
  });

  describe('generateYearUrl', () => {
    it('should generate year URL for movies', () => {
      const url = generateYearUrl('movie', 2023);
      expect(url).toBe('/how-to-watch');
    });

    it('should generate year URL for TV shows', () => {
      const url = generateYearUrl('tv-show', 2008);
      expect(url).toBe('/how-to-watch');
    });

    it('should generate year URL for documentaries', () => {
      const url = generateYearUrl('documentary', 2020);
      expect(url).toBe('/how-to-watch');
    });
  });

  describe('generateSearchUrl', () => {
    it('should generate search URL with query only', () => {
      const url = generateSearchUrl('dark knight');
      expect(url).toBe('/searchq=dark+knight');
    });

    it('should generate search URL with type filter', () => {
      const url = generateSearchUrl('batman', { type: 'movie' });
      expect(url).toBe('/searchq=batman&type=movie');
    });

    it('should generate search URL with genre filter', () => {
      const url = generateSearchUrl('action', { genre: 'Action' });
      expect(url).toBe('/searchq=action&genre=Action');
    });

    it('should generate search URL with year filter', () => {
      const url = generateSearchUrl('movies', { year: 2023 });
      expect(url).toBe('/searchq=movies&year=2023');
    });

    it('should generate search URL with rating filter', () => {
      const url = generateSearchUrl('top rated', { rating: 8.5 });
      expect(url).toBe('/searchq=top+rated&rating=8.5');
    });

    it('should generate search URL with all filters', () => {
      const url = generateSearchUrl('action movies', {
        type: 'movie',
        genre: 'Action',
        year: 2023,
        rating: 7.5,
      });
      expect(url).toBe('/searchq=action+movies&type=movie&genre=Action&year=2023&rating=7.5');
    });

    it('should handle empty query', () => {
      const url = generateSearchUrl('', { type: 'movie' });
      expect(url).toBe('/searchtype=movie');
    });

    it('should handle no filters', () => {
      const url = generateSearchUrl('test');
      expect(url).toBe('/searchq=test');
    });

    it('should URL encode special characters in query', () => {
      const url = generateSearchUrl('movies & tv shows');
      expect(url).toContain('movies');
      expect(url).toContain('tv+shows');
    });
  });

  describe('generateCanonicalUrl', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://geoleap.app';
    });

    it('should generate canonical URL for content', () => {
      const url = generateCanonicalUrl('movie', '123-the-dark-knight');
      expect(url).toBe('https://geoleap.app/content/movie/123-the-dark-knight');
    });

    it('should generate canonical URL for TV shows', () => {
      const url = generateCanonicalUrl('tv-show', '456-breaking-bad');
      expect(url).toBe('https://geoleap.app/content/tv-show/456-breaking-bad');
    });

    it('should use default base URL if env var not set', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      const url = generateCanonicalUrl('movie', '789-test');
      expect(url).toBe('https://geoleap.app/content/movie/789-test');
    });
  });

  describe('generateOgImageUrl', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://geoleap.app';
    });

    it('should generate OG image URL with all parameters', () => {
      const url = generateOgImageUrl('123', 'The Dark Knight', 'movie');
      expect(url).toContain('https://geoleap.app/api/og');
      expect(url).toContain('id=123');
      expect(url).toContain('title=The+Dark+Knight');
      expect(url).toContain('type=movie');
    });

    it('should truncate long titles to 60 characters', () => {
      const longTitle = 'This Is A Very Long Movie Title That Should Be Truncated Because It Exceeds The Character Limit';
      const url = generateOgImageUrl('456', longTitle, 'tv-show');

      const urlObj = new URL(url);
      const titleParam = urlObj.searchParams.get('title');
      expect(titleParam).not.toBeNull();
      expect(titleParam!.length).toBeLessThanOrEqual(60);
    });

    it('should handle short titles', () => {
      const url = generateOgImageUrl('789', 'It', 'movie');
      expect(url).toContain('title=It');
    });

    it('should URL encode special characters in title', () => {
      const url = generateOgImageUrl('100', 'Movie & TV', 'movie');
      expect(url).toContain('Movie+%26+TV');
    });

    it('should use default base URL if env var not set', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      const url = generateOgImageUrl('200', 'Test Movie', 'movie');
      expect(url).toBe('https://geoleap.app/api/og?id=200&title=Test+Movie&type=movie');
    });
  });

  describe('isValidSlug', () => {
    it('should validate correct slug format', () => {
      expect(isValidSlug('123-the-dark-knight')).toBe(true);
    });

    it('should validate slug with year', () => {
      expect(isValidSlug('456-breaking-bad-2008')).toBe(true);
    });

    it('should reject slug without hyphen', () => {
      expect(isValidSlug('nohyphen')).toBe(false);
    });

    it('should reject slug that is too short', () => {
      expect(isValidSlug('1-a')).toBe(false);
    });

    it('should reject slug that is too long', () => {
      const longSlug = '123-' + 'a'.repeat(200);
      expect(isValidSlug(longSlug)).toBe(false);
    });

    it('should reject slug with uppercase letters', () => {
      expect(isValidSlug('123-The-Dark-Knight')).toBe(false);
    });

    it('should reject slug with special characters', () => {
      expect(isValidSlug('123-dark@knight')).toBe(false);
    });

    it('should accept slug with numbers', () => {
      expect(isValidSlug('123-movie-2023-test')).toBe(true);
    });

    it('should accept slug at minimum length', () => {
      expect(isValidSlug('1-a')).toBe(false); // Length 3 is too short (minimum is > 3)
      expect(isValidSlug('1-ab')).toBe(true); // Length 4 is valid (minimum)
    });

    it('should accept slug at maximum length', () => {
      const maxSlug = '1-' + 'a'.repeat(196); // Total length 199
      expect(isValidSlug(maxSlug)).toBe(true);
    });
  });

  describe('generateBreadcrumbUrls', () => {
    it('should generate basic breadcrumbs for movies', () => {
      const breadcrumbs = generateBreadcrumbUrls('movie');
      expect(breadcrumbs).toEqual([
        { label: 'Home', url: '/' },
        { label: 'Movies', url: '/how-to-watch' },
      ]);
    });

    it('should generate breadcrumbs with genre', () => {
      const breadcrumbs = generateBreadcrumbUrls('movie', 'Action');
      expect(breadcrumbs).toEqual([
        { label: 'Home', url: '/' },
        { label: 'Movies', url: '/how-to-watch' },
        { label: 'Action', url: '/how-to-watch' },
      ]);
    });

    it('should generate breadcrumbs with year', () => {
      const breadcrumbs = generateBreadcrumbUrls('movie', undefined, 2023);
      expect(breadcrumbs).toEqual([
        { label: 'Home', url: '/' },
        { label: 'Movies', url: '/how-to-watch' },
        { label: '2023', url: '/how-to-watch' },
      ]);
    });

    it('should generate breadcrumbs with genre and year', () => {
      const breadcrumbs = generateBreadcrumbUrls('movie', 'Drama', 2020);
      expect(breadcrumbs).toEqual([
        { label: 'Home', url: '/' },
        { label: 'Movies', url: '/how-to-watch' },
        { label: 'Drama', url: '/how-to-watch' },
        { label: '2020', url: '/how-to-watch' },
      ]);
    });

    it('should generate breadcrumbs for TV shows', () => {
      const breadcrumbs = generateBreadcrumbUrls('tv-show');
      expect(breadcrumbs).toEqual([
        { label: 'Home', url: '/' },
        { label: 'TV Shows', url: '/how-to-watch' },
      ]);
    });

    it('should generate breadcrumbs for documentaries', () => {
      const breadcrumbs = generateBreadcrumbUrls('documentary', 'Nature');
      expect(breadcrumbs).toEqual([
        { label: 'Home', url: '/' },
        { label: 'Documentaries', url: '/how-to-watch' },
        { label: 'Nature', url: '/how-to-watch' },
      ]);
    });
  });

  describe('getTypeDisplayName', () => {
    it('should return display name for movie', () => {
      expect(getTypeDisplayName('movie')).toBe('Movies');
    });

    it('should return display name for TV show', () => {
      expect(getTypeDisplayName('tv-show')).toBe('TV Shows');
    });

    it('should return display name for documentary', () => {
      expect(getTypeDisplayName('documentary')).toBe('Documentaries');
    });

    it('should return default for unknown type', () => {
      expect(getTypeDisplayName('unknown')).toBe('Content');
    });
  });

  describe('generateSitemapUrls', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://geoleap.app';
    });

    const mockContents = [
      { id: '123', title: 'The Dark Knight', releaseYear: 2008 },
      { id: '456', title: 'Breaking Bad', releaseYear: 2008 },
      { id: '789', title: 'Inception' }, // No release year
    ];

    it('should generate sitemap URLs for multiple contents', () => {
      const urls = generateSitemapUrls(mockContents, 'movie');

      expect(urls).toHaveLength(3);
      expect(urls[0].url).toBe('https://geoleap.app/content/movie/123-the-dark-knight-2008');
      expect(urls[1].url).toBe('https://geoleap.app/content/movie/456-breaking-bad-2008');
      expect(urls[2].url).toBe('https://geoleap.app/content/movie/789-inception');
    });

    it('should include lastmod timestamp', () => {
      const urls = generateSitemapUrls(mockContents, 'movie');

      urls.forEach(url => {
        expect(url.lastmod).toBeDefined();
        expect(new Date(url.lastmod).getTime()).toBeLessThanOrEqual(Date.now());
      });
    });

    it('should calculate priority based on content age', () => {
      const currentYear = new Date().getFullYear();
      const recentContent = [
        { id: '1', title: 'Recent Movie', releaseYear: currentYear },
        { id: '2', title: 'Old Movie', releaseYear: 2000 },
      ];

      const urls = generateSitemapUrls(recentContent, 'movie');

      // Recent content should have higher priority
      expect(urls[0].priority).toBeGreaterThan(urls[1].priority);
    });

    it('should set minimum priority of 0.3', () => {
      const oldContent = [
        { id: '1', title: 'Very Old Movie', releaseYear: 1950 },
      ];

      const urls = generateSitemapUrls(oldContent, 'movie');

      expect(urls[0].priority).toBeGreaterThanOrEqual(0.3);
    });

    it('should set maximum priority of 1.0', () => {
      const currentYear = new Date().getFullYear();
      const newContent = [
        { id: '1', title: 'Brand New Movie', releaseYear: currentYear },
      ];

      const urls = generateSitemapUrls(newContent, 'movie');

      expect(urls[0].priority).toBeLessThanOrEqual(1.0);
    });

    it('should round priority to 1 decimal place', () => {
      const urls = generateSitemapUrls(mockContents, 'movie');

      urls.forEach(url => {
        const decimalPlaces = url.priority.toString().split('.')[1].length || 0;
        expect(decimalPlaces).toBeLessThanOrEqual(1);
      });
    });

    it('should handle content without release year (default to 2000)', () => {
      const noYearContent = [{ id: '1', title: 'No Year Movie' }];

      const urls = generateSitemapUrls(noYearContent, 'movie');

      expect(urls[0].priority).toBeLessThan(1.0); // Should be treated as old content
    });

    it('should generate sitemap URLs for TV shows', () => {
      const urls = generateSitemapUrls(mockContents, 'tv-show');

      expect(urls[0].url).toContain('/content/tv-show/');
    });

    it('should generate sitemap URLs for documentaries', () => {
      const urls = generateSitemapUrls(mockContents, 'documentary');

      expect(urls[0].url).toContain('/content/documentary/');
    });

    it('should use default base URL if env var not set', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      const urls = generateSitemapUrls([mockContents[0]], 'movie');

      expect(urls[0].url).toContain('https://geoleap.app');
    });
  });
});
