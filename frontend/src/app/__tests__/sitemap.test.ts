/**
 * Tests for GeoLeap flat sitemap (Cloudflare Workers compatible)
 */

import type { MetadataRoute } from 'next'

// Mock the API functions
const mockGetPopularContent = jest.fn()
jest.mock('@/lib/api/content', () => ({
  getPopularContent: (...args: unknown[]) => mockGetPopularContent(...args),
}))

const mockGenerateSitemapUrls = jest.fn()
const mockGenerateContentSlug = jest.fn()
jest.mock('@/lib/seo/url-generation', () => ({
  generateSitemapUrls: (...args: unknown[]) => mockGenerateSitemapUrls(...args),
  generateContentSlug: (...args: unknown[]) => mockGenerateContentSlug(...args),
}))

describe('GeoLeap Sitemap', () => {
  let sitemap: () => Promise<MetadataRoute.Sitemap>

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock: return empty arrays (no content)
    mockGetPopularContent.mockResolvedValue([])
    mockGenerateSitemapUrls.mockReturnValue([])
    mockGenerateContentSlug.mockImplementation((id: string, title: string, year?: number) => {
      const baseSlug = `${id}-${title.toLowerCase().replace(/\s+/g, '-')}`
      return year ? `${baseSlug}-${year}` : baseSlug
    })
  })

  beforeAll(async () => {
    const sitemapModule = await import('../sitemap')
    sitemap = sitemapModule.default
  })

  /** Helper: call sitemap() and return the flat array */
  async function getAllEntries(): Promise<MetadataRoute.Sitemap> {
    return sitemap()
  }

  describe('flat sitemap', () => {
    it('returns a non-empty array', async () => {
      const result = await getAllEntries()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('includes homepage with highest priority', async () => {
      const result = await getAllEntries()

      const homepageEntry = result.find(
        (p) => p.url === 'https://geoleap.app' || !p.url.includes('/', 8)
      )

      expect(homepageEntry).toBeDefined()
      expect(homepageEntry?.priority).toBe(1.0)
    })

    it('includes search page', async () => {
      const result = await getAllEntries()
      const search = result.find((p) => p.url.includes('/search'))

      expect(search).toBeDefined()
      expect(search?.priority).toBeGreaterThanOrEqual(0.8)
    })

    it('does not list non-existent content category routes', async () => {
      const result = await getAllEntries()
      const movies = result.find((p) => new URL(p.url).pathname === '/movies')
      const tvShows = result.find((p) => new URL(p.url).pathname === '/tv-shows')
      const documentaries = result.find((p) => new URL(p.url).pathname === '/documentaries')

      expect(movies).toBeUndefined()
      expect(tvShows).toBeUndefined()
      expect(documentaries).toBeUndefined()
    })

    it('includes pricing and about pages', async () => {
      const result = await getAllEntries()
      const pricing = result.find((p) => p.url.includes('/pricing'))
      const about = result.find((p) => p.url.includes('/about'))

      expect(pricing).toBeDefined()
      expect(about).toBeDefined()
    })

    it('includes legal pages with lower priority', async () => {
      const result = await getAllEntries()
      const privacy = result.find((p) => p.url.includes('/privacy'))
      const terms = result.find((p) => p.url.includes('/terms'))

      expect(privacy).toBeDefined()
      expect(terms).toBeDefined()
      expect(privacy?.priority).toBeLessThanOrEqual(0.5)
      expect(terms?.priority).toBeLessThanOrEqual(0.5)
    })

    it('includes platform pages', async () => {
      const result = await getAllEntries()
      const platformIndex = result.find((p) => p.url.endsWith('/platforms'))
      const platformPages = result.filter((p) => p.url.includes('/platforms/'))

      expect(platformIndex).toBeDefined()
      expect(platformPages.length).toBeGreaterThan(0)
    })

    it('includes country pages', async () => {
      const result = await getAllEntries()
      const countriesIndex = result.find((p) => p.url.endsWith('/countries'))
      const countryPages = result.filter((p) => p.url.includes('/countries/'))

      expect(countriesIndex).toBeDefined()
      expect(countryPages.length).toBeGreaterThan(0)
    })

    it('includes blog index', async () => {
      const result = await getAllEntries()
      const blogIndex = result.find((p) => p.url.endsWith('/blog'))

      expect(blogIndex).toBeDefined()
    })

    it('includes guides index', async () => {
      const result = await getAllEntries()
      const guidesIndex = result.find((p) => p.url.endsWith('/guides'))

      expect(guidesIndex).toBeDefined()
    })

    it('includes glossary index and glossary detail pages', async () => {
      const result = await getAllEntries()
      const glossaryIndex = result.find((p) => p.url.endsWith('/glossary'))
      const glossaryPages = result.filter((p) => p.url.includes('/glossary/'))

      expect(glossaryIndex).toBeDefined()
      expect(glossaryPages.length).toBeGreaterThan(0)
    })

    it('includes feature index and feature detail pages', async () => {
      const result = await getAllEntries()
      const featureIndex = result.find((p) => p.url.endsWith('/features'))
      const featurePages = result.filter((p) => p.url.includes('/features/'))

      expect(featureIndex).toBeDefined()
      expect(featurePages.length).toBeGreaterThan(0)
    })

    it('includes compare index, base comparison pages, and compare-country pages', async () => {
      const result = await getAllEntries()
      const compareIndex = result.find((p) => p.url.endsWith('/compare'))
      const baseComparePages = result.filter((p) => p.url.includes('/compare/') && !p.url.includes('/in/'))
      const compareCountryPages = result.filter((p) => p.url.includes('/compare/') && p.url.includes('/in/'))

      expect(compareIndex).toBeDefined()
      expect(baseComparePages.length).toBeGreaterThan(0)
      expect(compareCountryPages.length).toBeGreaterThan(0)
    })

    it('includes sports index, sport pages, and sport-country pages', async () => {
      const result = await getAllEntries()
      const sportsIndex = result.find((p) => p.url.endsWith('/sports'))
      const baseSportPages = result.filter((p) => {
        const path = new URL(p.url).pathname
        return path.startsWith('/sports/') && path.split('/').length === 3
      })
      const sportCountryPages = result.filter((p) => {
        const path = new URL(p.url).pathname
        return path.startsWith('/sports/') && path.split('/').length === 4
      })

      expect(sportsIndex).toBeDefined()
      expect(baseSportPages.length).toBeGreaterThan(0)
      expect(sportCountryPages.length).toBeGreaterThan(0)
    })

    it('includes genres index and genre-country pages', async () => {
      const result = await getAllEntries()
      const genresIndex = result.find((p) => p.url.endsWith('/genres'))
      const genreCountryPages = result.filter((p) => {
        const path = new URL(p.url).pathname
        return path.startsWith('/genres/') && path.split('/').length === 4
      })

      expect(genresIndex).toBeDefined()
      expect(genreCountryPages.length).toBeGreaterThan(0)
    })

    it('includes unblock index, platform hub pages, and indexable country pages', async () => {
      const result = await getAllEntries()
      const unblockIndex = result.find((p) => p.url.endsWith('/unblock'))
      const unblockPages = result.filter((p) => {
        const path = new URL(p.url).pathname
        return path.startsWith('/unblock/') && path.split('/').length === 3
      })
      const unblockCountryPages = result.filter((p) => {
        const path = new URL(p.url).pathname
        return path.startsWith('/unblock/') && path.split('/').length === 4
      })

      expect(unblockIndex).toBeDefined()
      expect(unblockPages.length).toBeGreaterThan(0)
      expect(unblockCountryPages.length).toBeGreaterThan(0)
    })

    it('includes how-to-watch index', async () => {
      const result = await getAllEntries()
      const howToWatchIndex = result.find((p) => p.url.endsWith('/how-to-watch'))

      expect(howToWatchIndex).toBeDefined()
    })

    it('handles API errors gracefully', async () => {
      mockGetPopularContent.mockRejectedValue(new Error('API Error'))

      const result = await getAllEntries()

      expect(Array.isArray(result)).toBe(true)
      // Should still have all non-API pages
      expect(result.length).toBeGreaterThan(50)
    })

    it('includes movie pages from API', async () => {
      mockGetPopularContent.mockResolvedValue([
        { id: '1', title: 'Inception', releaseYear: 2010 },
        { id: '2', title: 'The Matrix', releaseYear: 1999 },
      ])
      mockGenerateSitemapUrls.mockReturnValue([
        { url: 'https://geoleap.app/content/movie/1-inception-2010', lastmod: '2024-01-01', priority: 0.7 },
        { url: 'https://geoleap.app/content/movie/2-the-matrix-1999', lastmod: '2024-01-01', priority: 0.7 },
      ])

      const result = await getAllEntries()
      const moviePages = result.filter((p) => p.url.includes('/content/movie/'))
      const howToWatchCountryPages = result.filter((p) => p.url.includes('/how-to-watch/movie/1-inception-2010/in/'))

      expect(moviePages.length).toBeGreaterThanOrEqual(2)
      expect(howToWatchCountryPages.length).toBeGreaterThan(0)
    })
  })

  describe('entry validation', () => {
    it('all entries have valid URLs', async () => {
      const result = await getAllEntries()

      result.forEach((entry) => {
        expect(entry.url).toMatch(/^https?:\/\//)
      })
    })

    it('all entries have lastModified', async () => {
      const result = await getAllEntries()

      result.forEach((entry) => {
        expect(entry.lastModified).toBeDefined()
      })
    })

    it('all entries have changeFrequency', async () => {
      const result = await getAllEntries()
      const validFrequencies = [
        'always',
        'hourly',
        'daily',
        'weekly',
        'monthly',
        'yearly',
        'never',
      ]

      result.forEach((entry) => {
        expect(validFrequencies).toContain(entry.changeFrequency)
      })
    })

    it('all entries have priority between 0 and 1', async () => {
      const result = await getAllEntries()

      result.forEach((entry) => {
        expect(entry.priority).toBeGreaterThanOrEqual(0)
        expect(entry.priority).toBeLessThanOrEqual(1)
      })
    })

    it('has expected minimum number of entries', async () => {
      const result = await getAllEntries()

      // Static pages (9) + genres (18 * 3) + years (~45 * 3) + pSEO pages
      expect(result.length).toBeGreaterThan(50)
    })

    it('no duplicate URLs across all segments', async () => {
      const result = await getAllEntries()
      const urls = result.map((p) => p.url)
      const uniqueUrls = [...new Set(urls)]

      expect(urls.length).toBe(uniqueUrls.length)
    })
  })
})
