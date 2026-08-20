import { render, screen } from '@testing-library/react';
import HowToWatchPage, { generateMetadata } from '../page';

// Mock next/navigation
const mockNotFound = jest.fn();
jest.mock('next/navigation', () => ({
  notFound: () => {
    mockNotFound();
    throw new Error('NEXT_NOT_FOUND');
  },
}));

// Mock API content module (external boundary)
const mockGetContentBySlug = jest.fn();
const mockGetStreamingOptionsForCountry = jest.fn();
jest.mock('@/lib/api/content', () => ({
  getContentBySlug: (...args: unknown[]) => mockGetContentBySlug(...args),
  getStreamingOptionsForCountry: (...args: unknown[]) => mockGetStreamingOptionsForCountry(...args),
}));

// Sample data
const mockContent = {
  id: '550',
  title: 'Fight Club',
  overview: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.',
  releaseYear: 1999,
  rating: 8.4,
  voteCount: 25000,
  runtime: 139,
  genres: ['Drama', 'Thriller'],
  primaryGenre: 'Drama',
  posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
  contentRating: 'R',
};

const mockStreamingOptions = [
  {
    serviceId: 'netflix',
    serviceName: 'Netflix',
    type: 'subscription' as const,
    price: 15.49,
    currency: 'USD',
    url: 'https://netflix.com/watch/550',
    quality: ['HD', '4K'],
    videoLink: 'https://netflix.com/watch/550',
    expiresSoon: false,
    availableSince: '2024-01-01',
  },
  {
    serviceId: 'amazon-prime-video',
    serviceName: 'Amazon Prime Video',
    type: 'rental' as const,
    price: 3.99,
    currency: 'USD',
    url: 'https://amazon.com/watch/550',
    quality: ['HD'],
    videoLink: 'https://amazon.com/watch/550',
    expiresSoon: false,
    availableSince: '2024-01-01',
  },
];

function makeParams(type: string, slug: string, country: string) {
  return { params: Promise.resolve({ type, slug, country }) };
}

describe('How to Watch page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetContentBySlug.mockResolvedValue(mockContent);
    mockGetStreamingOptionsForCountry.mockResolvedValue(mockStreamingOptions);
  });

  describe('Page rendering', () => {
    it('renders correct H1 with content title and country name', async () => {
      const props = makeParams('movie', '550-fight-club-1999', 'united-states');
      const page = await HowToWatchPage(props);
      render(page);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'How to Watch Fight Club in United States'
      );
    });

    it('shows green availability banner when streaming options exist', async () => {
      const props = makeParams('movie', '550-fight-club-1999', 'united-states');
      const page = await HowToWatchPage(props);
      render(page);

      expect(screen.getByText(/is available to stream in United States/)).toBeInTheDocument();
    });

    it('shows red unavailability banner when no streaming options', async () => {
      mockGetStreamingOptionsForCountry.mockResolvedValue([]);
      const props = makeParams('movie', '550-fight-club-1999', 'united-states');
      const page = await HowToWatchPage(props);
      render(page);

      expect(screen.getByText(/is not currently available in United States/)).toBeInTheDocument();
    });

    it('shows streaming options table with correct columns', async () => {
      const props = makeParams('movie', '550-fight-club-1999', 'united-states');
      const page = await HowToWatchPage(props);
      render(page);

      expect(screen.getByText('Platform')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Quality')).toBeInTheDocument();
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText('Amazon Prime Video')).toBeInTheDocument();
    });

    it('shows GeoLeap CTA section', async () => {
      const props = makeParams('movie', '550-fight-club-1999', 'united-states');
      const page = await HowToWatchPage(props);
      render(page);

      expect(screen.getByText(/Track price changes|Use GeoLeap/)).toBeInTheDocument();
    });
  });

  describe('generateMetadata', () => {
    it('returns correct title with content title, country, and year', async () => {
      const props = makeParams('movie', '550-fight-club-1999', 'united-states');
      const metadata = await generateMetadata(props);
      const title = typeof metadata.title === 'string' ? metadata.title : '';

      expect(title).toContain('Fight Club');
      expect(title).toContain('United States');
      // Title no longer includes "| GeoLeap"  -  the root layout template adds it
      const og = metadata.openGraph as { title?: string } | undefined;
      expect(og?.title).toContain('GeoLeap');
    });

    it('returns description mentioning platforms when available', async () => {
      const props = makeParams('movie', '550-fight-club-1999', 'united-states');
      const metadata = await generateMetadata(props);
      expect(metadata.description).toContain('Fight Club');
      expect(metadata.description).toContain('United States');
    });

    it('returns unavailability description when no options', async () => {
      mockGetStreamingOptionsForCountry.mockResolvedValue([]);
      const props = makeParams('movie', '550-fight-club-1999', 'united-states');
      const metadata = await generateMetadata(props);
      expect(metadata.description).toContain('Fight Club');
      expect(metadata.description).toContain('United States');
    });
  });

  describe('content types', () => {
    it('renders correctly for tv-show type', async () => {
      mockGetContentBySlug.mockResolvedValue({
        ...mockContent,
        id: '1399',
        title: 'Breaking Bad',
      });
      const props = makeParams('tv-show', '1399-breaking-bad', 'united-states');
      const page = await HowToWatchPage(props);
      render(page);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'How to Watch Breaking Bad in United States'
      );
    });

    it('renders correctly for documentary type', async () => {
      mockGetContentBySlug.mockResolvedValue({
        ...mockContent,
        id: '100',
        title: 'Planet Earth',
      });
      const props = makeParams('documentary', '100-planet-earth', 'united-kingdom');
      const page = await HowToWatchPage(props);
      render(page);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'How to Watch Planet Earth in United Kingdom'
      );
    });
  });

  describe('notFound()', () => {
    it('called for invalid type parameter', async () => {
      const props = makeParams('podcast', '550-fight-club-1999', 'united-states');
      await expect(async () => {
        const page = await HowToWatchPage(props);
        render(page);
      }).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mockNotFound).toHaveBeenCalled();
    });

    it('called for unknown country', async () => {
      const props = makeParams('movie', '550-fight-club-1999', 'narnia');
      await expect(async () => {
        const page = await HowToWatchPage(props);
        render(page);
      }).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mockNotFound).toHaveBeenCalled();
    });

    it('called when content not found', async () => {
      mockGetContentBySlug.mockResolvedValue(null);
      const props = makeParams('movie', '550-fight-club-1999', 'united-states');
      await expect(async () => {
        const page = await HowToWatchPage(props);
        render(page);
      }).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mockNotFound).toHaveBeenCalled();
    });
  });
});
