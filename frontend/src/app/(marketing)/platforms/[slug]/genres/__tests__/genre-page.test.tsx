import { render, screen } from '@testing-library/react';
import { platforms } from '@/data/platforms';
import { genreGuides } from '@/data/genres';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

// Import after mocks
import PlatformGenrePage, {
  generateStaticParams,
  generateMetadata,
} from '../[genre]/page';

describe('Platform x Genre pSEO Page', () => {
  describe('generateStaticParams', () => {
    it('generates params for all platform x genre combinations', async () => {
      const params = await generateStaticParams();
      expect(params.length).toBeGreaterThan(1000);
    });

    it('returns the exact count of platforms * genres', async () => {
      const params = await generateStaticParams();
      expect(params.length).toBe(platforms.length * genreGuides.length);
    });

    it('params have required shape with slug and genre fields', async () => {
      const params = await generateStaticParams();
      expect(params[0]).toHaveProperty('slug');
      expect(params[0]).toHaveProperty('genre');
    });

    it('includes netflix/action combination', async () => {
      const params = await generateStaticParams();
      const netflixAction = params.find(
        p => p.slug === 'netflix' && p.genre === 'action',
      );
      expect(netflixAction).toBeDefined();
    });

    it('all params have non-empty slug and genre', async () => {
      const params = await generateStaticParams();
      params.forEach(p => {
        expect(p.slug).toBeTruthy();
        expect(p.genre).toBeTruthy();
      });
    });
  });

  describe('generateMetadata', () => {
    it('includes platform name and genre in title', async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'netflix', genre: 'action' }),
      });
      const title =
        typeof metadata.title === 'string'
          ? metadata.title
          : (metadata.title as { default?: string } | null)?.default ??
            JSON.stringify(metadata.title);
      expect(title).toContain('Netflix');
      expect(title.toLowerCase()).toContain('action');
    });

    it('returns a description', async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'netflix', genre: 'action' }),
      });
      expect(metadata.description).toBeTruthy();
      expect(typeof metadata.description).toBe('string');
    });

    it('sets canonical URL containing slug and genre', async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'netflix', genre: 'action' }),
      });
      const alternates = metadata.alternates as
        | { canonical?: string }
        | undefined;
      expect(alternates?.canonical).toContain('netflix');
      expect(alternates?.canonical).toContain('action');
    });

    it('handles unknown platform slug gracefully', async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'nonexistent-platform', genre: 'action' }),
      });
      const title =
        typeof metadata.title === 'string'
          ? metadata.title
          : (metadata.title as { default?: string } | null)?.default ??
            JSON.stringify(metadata.title);
      expect(title).toContain('Not Found');
    });

    it('handles unknown genre slug gracefully', async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'netflix', genre: 'nonexistent-genre' }),
      });
      const title =
        typeof metadata.title === 'string'
          ? metadata.title
          : (metadata.title as { default?: string } | null)?.default ??
            JSON.stringify(metadata.title);
      expect(title).toContain('Not Found');
    });

    it('OG title includes GeoLeap', async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'netflix', genre: 'action' }),
      });
      const og = metadata.openGraph as { title?: string } | undefined;
      expect(og?.title).toContain('GeoLeap');
    });
  });

  describe('Page rendering', () => {
    it('renders page for netflix/action without error', async () => {
      const PageComponent = await PlatformGenrePage({
        params: Promise.resolve({ slug: 'netflix', genre: 'action' }),
      });
      const { container } = render(PageComponent);
      expect(container).toBeTruthy();
    });

    it('renders H1 with platform name and genre', async () => {
      const PageComponent = await PlatformGenrePage({
        params: Promise.resolve({ slug: 'netflix', genre: 'action' }),
      });
      render(PageComponent);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(/action/i);
      expect(heading).toHaveTextContent(/netflix/i);
    });

    it('calls notFound() for invalid platform slug', async () => {
      await expect(
        PlatformGenrePage({
          params: Promise.resolve({ slug: 'nonexistent-platform', genre: 'action' }),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('calls notFound() for invalid genre slug', async () => {
      await expect(
        PlatformGenrePage({
          params: Promise.resolve({ slug: 'netflix', genre: 'nonexistent-genre' }),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('renders breadcrumbs with Home, Platforms, platform name, and genre', async () => {
      const PageComponent = await PlatformGenrePage({
        params: Promise.resolve({ slug: 'netflix', genre: 'action' }),
      });
      render(PageComponent);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Platforms')).toBeInTheDocument();
      expect(screen.getAllByText('Netflix').length).toBeGreaterThan(0);
    });

    it('renders internal link to genre page', async () => {
      const PageComponent = await PlatformGenrePage({
        params: Promise.resolve({ slug: 'netflix', genre: 'action' }),
      });
      render(PageComponent);
      const genreLink = screen.getByRole('link', { name: /all action streaming/i });
      expect(genreLink).toHaveAttribute('href', '/genres/action');
    });

    it('renders internal link to platform page', async () => {
      const PageComponent = await PlatformGenrePage({
        params: Promise.resolve({ slug: 'netflix', genre: 'action' }),
      });
      render(PageComponent);
      const platformLink = screen.getByRole('link', { name: /about netflix/i });
      expect(platformLink).toHaveAttribute('href', '/platforms/netflix');
    });

    it('renders page for platform that is not a top pick for this genre', async () => {
      // shudder is a horror platform  -  test it against a non-horror genre like k-drama
      const PageComponent = await PlatformGenrePage({
        params: Promise.resolve({ slug: 'shudder', genre: 'k-drama' }),
      });
      const { container } = render(PageComponent);
      expect(container).toBeTruthy();
    });

    it('renders "also available on" section listing other genre platforms', async () => {
      const PageComponent = await PlatformGenrePage({
        params: Promise.resolve({ slug: 'netflix', genre: 'anime' }),
      });
      render(PageComponent);
      // anime has multiple best platforms  -  should show others besides netflix
      expect(screen.getByText(/also available on/i)).toBeInTheDocument();
    });

    it('renders FAQ section with at least one question', async () => {
      const PageComponent = await PlatformGenrePage({
        params: Promise.resolve({ slug: 'netflix', genre: 'action' }),
      });
      render(PageComponent);
      // FAQ section heading
      expect(screen.getByText(/faq/i)).toBeInTheDocument();
    });
  });
});
