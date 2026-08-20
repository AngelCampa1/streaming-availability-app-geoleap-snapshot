import { render, screen } from '@testing-library/react';
import { genreGuides } from '@/data/genres';
import { countries } from '@/data/countries';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

// Import after mocks
import GenreCountryPage, {
  generateStaticParams,
  generateMetadata,
} from '../page';

describe('Genre x Country pSEO Page', () => {
  describe('generateStaticParams', () => {
    it('returns the correct number of params (genres * countries)', async () => {
      const params = await generateStaticParams();
      expect(params).toHaveLength(genreGuides.length * countries.length);
    });

    it('returns objects with slug and country properties', async () => {
      const params = await generateStaticParams();
      expect(params[0]).toHaveProperty('slug');
      expect(params[0]).toHaveProperty('country');
    });
  });

  describe('generateMetadata', () => {
    it('returns correct title and description for a valid genre+country combo', async () => {
      const genre = genreGuides[0]; // anime
      const country = countries[0]; // united-states

      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: genre.slug, country: country.slug }),
      });

      expect(metadata.title).toContain(genre.displayName);
      expect(metadata.title).toContain(country.name);
      // Title no longer includes "| GeoLeap"  -  the root layout template adds it
      const og = metadata.openGraph as { title?: string } | undefined;
      expect(og?.title).toContain('GeoLeap');
      expect(metadata.description).toBeTruthy();
      expect(typeof metadata.description).toBe('string');
    });

    it('handles unknown genre gracefully', async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'nonexistent-genre', country: 'united-states' }),
      });

      expect(metadata.title).toContain('Not Found');
    });

    it('handles unknown country gracefully', async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'anime', country: 'nonexistent-country' }),
      });

      expect(metadata.title).toContain('Not Found');
    });
  });

  describe('Page rendering', () => {
    it('renders with correct H1 for valid data', async () => {
      const genre = genreGuides[0]; // anime
      const country = countries[0]; // united-states

      const PageComponent = await GenreCountryPage({
        params: Promise.resolve({ slug: genre.slug, country: country.slug }),
      });

      render(PageComponent);

      expect(
        screen.getByRole('heading', { level: 1 }),
      ).toHaveTextContent(
        `Best ${genre.displayName} Streaming in ${country.name}`,
      );
    });

    it('calls notFound() for invalid genre slug', async () => {
      await expect(
        GenreCountryPage({
          params: Promise.resolve({ slug: 'nonexistent', country: 'united-states' }),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('calls notFound() for invalid country slug', async () => {
      await expect(
        GenreCountryPage({
          params: Promise.resolve({ slug: 'anime', country: 'nonexistent' }),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('shows green availability banner when platforms are available', async () => {
      const genre = genreGuides[0]; // anime  -  has platforms available in US
      const country = countries[0]; // united-states

      const PageComponent = await GenreCountryPage({
        params: Promise.resolve({ slug: genre.slug, country: country.slug }),
      });
      render(PageComponent);

      expect(screen.getByText(/streaming is available in/i)).toBeInTheDocument();
    });

    it('shows amber banner when no genre platforms are available in country', async () => {
      // Find a genre/country combo where no best-platforms are available
      // Use a genre with niche platforms and a country with limited availability
      const genre = genreGuides.find(g => g.slug === 'anime')!;
      const country = countries.find(c => {
        const available = genre.bestPlatforms.filter(bp =>
          c.availablePlatforms.includes(bp.platformSlug)
        );
        return available.length === 0;
      });

      if (country) {
        const PageComponent = await GenreCountryPage({
          params: Promise.resolve({ slug: genre.slug, country: country.slug }),
        });
        render(PageComponent);

        expect(screen.getByText(/limited/i)).toBeInTheDocument();
      }
    });
  });
});
