import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContentPageTemplate from '../ContentPageTemplate';
import { ContentData } from '@/lib/api/content';

// Mock dependencies
jest.mock('@/components/common/OptimizedImage', () => ({
  OptimizedImage: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} data-testid="optimized-image" />
  ),
}));

jest.mock('../ContentBreadcrumbs', () => ({
  ContentBreadcrumbs: ({ title }: { title: string }) => <nav data-testid="breadcrumbs">{title}</nav>,
}));

jest.mock('../StreamingOptionsGrid', () => ({
  StreamingOptionsGrid: () => <div data-testid="streaming-options">Streaming Options</div>,
}));

jest.mock('../ContentDetails', () => ({
  ContentDetails: () => <div data-testid="content-details">Content Details</div>,
}));

jest.mock('../RelatedContent', () => ({
  RelatedContent: () => <div data-testid="related-content">Related Content</div>,
}));

jest.mock('../SocialShareSection', () => ({
  SocialShareSection: () => <div data-testid="social-share">Social Share</div>,
}));

jest.mock('../ContentLoadingSkeleton', () => ({
  ContentLoadingSkeleton: ({ type }: { type: string }) => (
    <div data-testid={`loading-skeleton-${type}`}>Loading {type}</div>
  ),
}));

jest.mock('../../seo/StructuredDataScript', () => ({
  StructuredDataScript: ({ schemas }: { schemas: any[] }) => (
    <script data-testid="structured-data">{JSON.stringify(schemas)}</script>
  ),
}));

// Mock SEO functions
jest.mock('@/lib/seo/schema-markup', () => ({
  generateContentSchema: () => ({ '@type': 'Movie', name: 'Test Movie' }),
  generateContentFaqSchema: () => null,
  generateStreamingHowToSchema: () => null,
}));

const mockContent: ContentData = {
  id: '123',
  title: 'Test Movie',
  originalTitle: 'Original Test Movie',
  overview: 'This is a test movie for unit testing.',
  tagline: 'The ultimate test',
  releaseYear: 2023,
  rating: 8.5,
  voteCount: 1000,
  runtime: 120,
  contentRating: 'PG-13',
  genres: ['Action', 'Adventure'],
  primaryGenre: 'Action',
  posterUrl: 'https://example.com/poster.jpg',
  backdropUrl: 'https://example.com/backdrop.jpg',
  // type: 'movie', // Removed - not part of ContentData type
  // slug: 'test-movie-2023', // Removed - not part of ContentData type
  cast: [
    {
      id: 1,
      name: 'John Doe',
      character: 'Hero',
      profilePath: '/actor1.jpg',
      order: 1,
    },
  ],
  crew: [
    {
      id: 1,
      name: 'Jane Director',
      job: 'Director',
      department: 'Directing',
      profilePath: '/director.jpg',
    },
  ],
  productionCountries: ['United States'],
  originalLanguage: 'en',
  status: 'Released',
  homepage: 'https://example.com/movie',
  // streamingAvailability: [ // Removed - not part of ContentData type
  //   {
  //     serviceId: 'netflix',
  //     serviceName: 'Netflix',
  //     streamingType: 'subscription',
  //     link: 'https://netflix.com/watch/123',
  //     country: 'US',
  //     price: 0,
  //   },
  // ],
};

describe('ContentPageTemplate', () => {
  it('renders content page with all sections', async () => {
    render(<ContentPageTemplate content={mockContent} type="movie" />);

    // Check main title is rendered
    expect(screen.getByRole('heading', { level: 1, name: /test movie/i })).toBeInTheDocument();
    expect(screen.getByText('(2023)')).toBeInTheDocument();

    // Check tagline
    expect(screen.getByText('The ultimate test')).toBeInTheDocument();

    // Check overview
    expect(screen.getByText('This is a test movie for unit testing.')).toBeInTheDocument();

    // Check rating
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getByText('(1,000)')).toBeInTheDocument();

    // Check runtime
    expect(screen.getByText('120 min')).toBeInTheDocument();

    // Check content rating
    expect(screen.getByText('PG-13')).toBeInTheDocument();

    // Check genres
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Adventure')).toBeInTheDocument();
  });

  it('renders structured data script', () => {
    render(<ContentPageTemplate content={mockContent} type="movie" />);

    expect(screen.getByTestId('structured-data')).toBeInTheDocument();
  });

  it('renders all component sections', async () => {
    render(<ContentPageTemplate content={mockContent} type="movie" />);

    // Wait for suspense components to load
    await waitFor(() => {
      expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
      expect(screen.getByTestId('streaming-options')).toBeInTheDocument();
      expect(screen.getByTestId('content-details')).toBeInTheDocument();
      expect(screen.getByTestId('social-share')).toBeInTheDocument();
      expect(screen.getByTestId('related-content')).toBeInTheDocument();
    });
  });

  it('renders poster and backdrop images', () => {
    render(<ContentPageTemplate content={mockContent} type="movie" />);

    const images = screen.getAllByTestId('optimized-image');
    expect(images).toHaveLength(2); // poster + backdrop

    expect(images[0]).toHaveAttribute('alt', 'Test Movie backdrop');
    expect(images[1]).toHaveAttribute('alt', 'Test Movie poster');
  });

  it('handles missing optional content gracefully', () => {
    const minimalContent: ContentData = {
      id: '456',
      title: 'Minimal Movie',
      genres: [],
    };

    render(<ContentPageTemplate content={minimalContent} type="movie" />);

    // Use getAllByText to handle multiple instances
    const titleElements = screen.getAllByText('Minimal Movie');
    expect(titleElements.length).toBeGreaterThan(0);
    expect(titleElements[0]).toBeInTheDocument();
    // Should not crash when optional fields are missing
  });

  it('applies correct ARIA labels and semantic HTML', () => {
    render(<ContentPageTemplate content={mockContent} type="movie" />);

    // Check semantic HTML
    expect(screen.getByRole('article')).toBeInTheDocument(); // main article

    // Check ARIA labels - use more flexible matching
    expect(screen.getByRole('region', { name: /where to watch/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /details/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /similar/i })).toBeInTheDocument();
  });

  it('renders different content types correctly', () => {
    const { rerender } = render(<ContentPageTemplate content={mockContent} type="tv-show" />);

    expect(screen.getByText('Similar Shows')).toBeInTheDocument();

    rerender(<ContentPageTemplate content={mockContent} type="documentary" />);
    expect(screen.getByText('Similar Documentaries')).toBeInTheDocument();
  });

  it('displays metadata pills correctly', () => {
    render(<ContentPageTemplate content={mockContent} type="movie" />);

    // Check that metadata is displayed in pills
    const ratingContainer = screen.getByText('8.5').closest('div');
    expect(ratingContainer).toHaveClass('bg-surface');

    const runtimeContainer = screen.getByText('120 min').closest('div');
    expect(runtimeContainer).toHaveClass('bg-surface');

    const ratingContainer2 = screen.getByText('PG-13').closest('div');
    expect(ratingContainer2).toHaveClass('bg-surface');
  });

  it('has proper responsive classes', () => {
    const { container } = render(<ContentPageTemplate content={mockContent} type="movie" />);

    // Check responsive layout classes
    expect(container.querySelector('.lg\\:flex-row')).toBeInTheDocument();
    expect(container.querySelector('.sm\\:text-4xl')).toBeInTheDocument();
    expect(container.querySelector('.lg\\:text-5xl')).toBeInTheDocument();
  });
});
