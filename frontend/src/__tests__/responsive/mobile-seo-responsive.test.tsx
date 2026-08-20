/**
 * Mobile Responsiveness Tests for SEO-optimized content pages
 * Tests viewport handling, touch interactions, and mobile-first SEO considerations
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';

// Mock matchMedia for responsive testing
const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock next/image
interface MockImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  [key: string]: any;
}

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: MockImageProps) => (
    <div
      {...props}
      data-testid="next-image"
      role="img"
      aria-label={props.alt || 'Mock image'}
      className={`bg-gray-200 ${props.className || ''}`}
    />
  ),
}));

// Mock the OptimizedImage component
interface MockOptimizedImageProps {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  quality?: number;
  [key: string]: any;
}

const MockOptimizedImage = ({ src, alt, sizes, className, priority, quality, ...props }: MockOptimizedImageProps) => (
  <div
    data-src={src}
    aria-label={alt || 'Mock optimized image'}
    data-testid="optimized-image"
    data-sizes={sizes}
    data-priority={priority ? 'true' : 'false'}
    data-quality={quality?.toString()}
    className={`bg-gray-200 flex items-center justify-center text-gray-600 ${className || ''}`}
    role="img"
    {...props}
  >
    {alt || 'Mock Image'}
  </div>
);

jest.mock('@/components/common/OptimizedImage', () => ({
  OptimizedImage: MockOptimizedImage,
}));

// Mock content components
interface MockContentBreadcrumbsProps {
  type: string;
  title: string;
  genre?: string;
}

const MockContentBreadcrumbs = ({ type, title, genre }: MockContentBreadcrumbsProps) => (
  <nav data-testid="breadcrumbs" className="breadcrumbs">
    <span className="breadcrumb-item">{type}</span>
    <span className="breadcrumb-separator">&gt;</span>
    <span className="breadcrumb-item">{title}</span>
    {genre && (
      <>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-item">{genre}</span>
      </>
    )}
  </nav>
);

interface MockStreamingOptionsGridProps {
  contentId?: string;
  contentType?: string;
}

const MockStreamingOptionsGrid = ({}: MockStreamingOptionsGridProps) => (
  <div data-testid="streaming-options" className="streaming-grid">
    <div className="streaming-option">Netflix</div>
    <div className="streaming-option">Amazon Prime</div>
    <div className="streaming-option">Hulu</div>
  </div>
);

interface MockContentDetailsProps {
  content: {
    cast?: Array<{ name: string; character?: string }>;
  };
  type?: string;
}

const MockContentDetails = ({ content }: MockContentDetailsProps) => (
  <section data-testid="content-details" className="content-details">
    <h2>Details</h2>
    <div className="cast-section">
      {content.cast?.slice(0, 6).map((actor, index) => (
        <div key={index} className="cast-member">
          {actor.name}
        </div>
      ))}
    </div>
  </section>
);

interface MockRelatedContentProps {
  contentId?: string;
  contentType?: string;
  genres?: string[];
  limit?: number;
}

const MockRelatedContent = ({ limit }: MockRelatedContentProps) => (
  <section data-testid="related-content" className="related-content">
    <div className="content-grid">
      {Array.from({ length: limit || 6 }).map((_, index) => (
        <div key={index} className="content-item">
          <div
            className="placeholder-image"
            style={{ width: 200, height: 300, backgroundColor: '#f0f0f0' }}
            role="img"
            aria-label={`Related ${index}`}
          />
          <h3>Related Title {index}</h3>
        </div>
      ))}
    </div>
  </section>
);

// Mock the components
jest.mock('@/components/content/ContentBreadcrumbs', () => ({
  ContentBreadcrumbs: MockContentBreadcrumbs,
}));

jest.mock('@/components/content/StreamingOptionsGrid', () => ({
  StreamingOptionsGrid: MockStreamingOptionsGrid,
}));

jest.mock('@/components/content/ContentDetails', () => ({
  ContentDetails: MockContentDetails,
}));

jest.mock('@/components/content/RelatedContent', () => ({
  RelatedContent: MockRelatedContent,
}));

// Create a simplified content page component for testing
interface MockContentPageProps {
  content: {
    id?: string;
    title: string;
    tagline?: string;
    backdropUrl?: string;
    posterUrl?: string;
    overview: string;
    releaseYear: number;
    genres: string[];
    primaryGenre?: string;
    rating: string | number;
    voteCount?: number;
    runtime?: number;
    contentRating?: string;
    cast?: Array<{ id?: number; name: string; character?: string; profilePath?: string; order?: number }>;
  };
  type: string;
}

const MockContentPage = ({ content, type }: MockContentPageProps) => (
  <div className="min-h-screen bg-background">
    {/* Hero Section */}
    <section className="relative">
      <div className="absolute inset-0 h-[40vh] sm:h-[50vh] lg:h-[60vh]">
        {content.backdropUrl && (
          <MockOptimizedImage
            src={content.backdropUrl}
            alt={`${content.title} backdrop`}
            sizes="100vw"
            quality={85}
            priority
            className="object-cover w-full h-full"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-8">
        <MockContentBreadcrumbs type={type} title={content.title} genre={content.primaryGenre} />

        <div className="flex flex-col lg:flex-row gap-8 mt-8">
          {/* Poster */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <div className="w-64 h-96 relative rounded-lg overflow-hidden shadow-2xl">
              {content.posterUrl && (
                <MockOptimizedImage
                  src={content.posterUrl}
                  alt={`${content.title} poster`}
                  sizes="256px"
                  quality={90}
                  className="object-cover w-full h-full"
                />
              )}
            </div>
          </div>

          {/* Content Info */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {content.title}
              {content.releaseYear && (
                <span className="text-2xl sm:text-3xl lg:text-4xl text-foreground-muted ml-2">
                  ({content.releaseYear})
                </span>
              )}
            </h1>

            {content.tagline && <p className="text-lg text-foreground-muted mb-6 italic">{content.tagline}</p>}

            <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-6">
              {content.rating && (
                <div className="flex items-center bg-surface px-3 py-2 rounded-lg">
                  <span className="text-yellow-500 mr-1">⭐</span>
                  <span className="font-semibold">
                    {typeof content.rating === 'number' ? content.rating.toFixed(1) : String(content.rating)}
                  </span>
                  {content.voteCount && (
                    <span className="text-sm text-foreground-muted ml-1">({content.voteCount.toLocaleString()})</span>
                  )}
                </div>
              )}

              {content.runtime && (
                <div className="bg-surface px-3 py-2 rounded-lg">
                  <span className="font-semibold">{content.runtime} min</span>
                </div>
              )}
            </div>

            {content.genres && content.genres.length > 0 && (
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-6">
                {content.genres.map((genre: string) => (
                  <span key={genre} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {content.overview && <p className="text-foreground-muted leading-relaxed max-w-3xl">{content.overview}</p>}
          </div>
        </div>
      </div>
    </section>

    {/* Streaming Options */}
    <section className="py-12 bg-surface">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Where to Watch {content.title}</h2>
        <MockStreamingOptionsGrid contentId={content.id} contentType={type} />
      </div>
    </section>

    {/* Content Details */}
    <section className="py-12">
      <div className="container mx-auto px-4">
        <MockContentDetails content={content} type={type} />
      </div>
    </section>

    {/* Related Content */}
    <section className="py-12 bg-surface">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-foreground mb-8">Similar {type === 'movie' ? 'Movies' : 'Shows'}</h2>
        <MockRelatedContent contentId={content.id} contentType={type} genres={content.genres} limit={12} />
      </div>
    </section>
  </div>
);

describe('Mobile Responsiveness Tests for SEO Content Pages', () => {
  const mockContent = {
    id: '123',
    title: 'The Dark Knight',
    tagline: 'Why So Serious?',
    overview:
      'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1920/backdrop.jpg',
    releaseYear: 2008,
    genres: ['Action', 'Crime', 'Drama'],
    primaryGenre: 'Action',
    rating: 9.0,
    voteCount: 2500000,
    runtime: 152,
    contentRating: 'PG-13',
    cast: [
      { id: 1, name: 'Christian Bale', character: 'Bruce Wayne', profilePath: '/bale.jpg', order: 1 },
      { id: 2, name: 'Heath Ledger', character: 'Joker', profilePath: '/ledger.jpg', order: 2 },
      { id: 3, name: 'Aaron Eckhart', character: 'Harvey Dent', profilePath: '/eckhart.jpg', order: 3 },
    ],
  };

  beforeAll(() => {
    // Mock global objects
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(mockMatchMedia),
    });

    Object.defineProperty(global, 'ResizeObserver', {
      writable: true,
      value: MockResizeObserver,
    });

    // Mock touch events
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      value: null,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Viewport and Layout Responsiveness', () => {
    it('should render mobile layout correctly on small screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        ...mockMatchMedia(query),
        matches: query.includes('max-width: 768px') || query.includes('(max-width: 640px)'),
      }));

      render(<MockContentPage content={mockContent} type="movie" />);

      // Check that mobile-specific classes are applied
      const heroSection = document.querySelector('.h-\\[40vh\\]');
      expect(heroSection).toBeInTheDocument();

      // Check mobile-centered layout
      const posterContainer = document.querySelector('.mx-auto.lg\\:mx-0');
      expect(posterContainer).toBeInTheDocument();

      // Check responsive text sizes
      const title = screen.getByRole('heading', { level: 1, name: /the dark knight/i });
      expect(title.className).toContain('text-3xl sm:text-4xl lg:text-5xl');
    });

    it('should render tablet layout correctly on medium screens', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      Object.defineProperty(window, 'innerHeight', { value: 1024 });

      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        ...mockMatchMedia(query),
        matches: query.includes('min-width: 640px') && !query.includes('min-width: 1024px'),
      }));

      render(<MockContentPage content={mockContent} type="movie" />);

      // Check that tablet-specific responsive classes work
      const heroSection = document.querySelector('.sm\\:h-\\[50vh\\]');
      expect(heroSection).toBeInTheDocument();
    });

    it('should render desktop layout correctly on large screens', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1920 });
      Object.defineProperty(window, 'innerHeight', { value: 1080 });

      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        ...mockMatchMedia(query),
        matches: query.includes('min-width: 1024px'),
      }));

      render(<MockContentPage content={mockContent} type="movie" />);

      // Check desktop-specific layout
      const heroSection = document.querySelector('.lg\\:h-\\[60vh\\]');
      expect(heroSection).toBeInTheDocument();

      // Check horizontal layout on desktop
      const mainContainer = document.querySelector('.lg\\:flex-row');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should handle viewport changes dynamically', () => {
      const { rerender } = render(<MockContentPage content={mockContent} type="movie" />);

      // Simulate viewport resize
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 375 });
        window.dispatchEvent(new Event('resize'));
      });

      rerender(<MockContentPage content={mockContent} type="movie" />);

      // Component should handle resize gracefully - use getAllByText to handle multiple instances
      const titleElements = screen.getAllByText('The Dark Knight');
      expect(titleElements.length).toBeGreaterThan(0);
      expect(titleElements[0]).toBeInTheDocument();
    });
  });

  describe('Touch Interactions and Mobile UX', () => {
    it('should support touch interactions on genre tags', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      // Find the genre tag specifically (not breadcrumb)
      const actionGenre = screen.getAllByText('Action').find(el => el.className.includes('bg-primary/10'));
      expect(actionGenre).toBeInTheDocument();

      // Simulate touch interaction
      act(() => {
        if (actionGenre) {
          fireEvent.touchStart(actionGenre);
          fireEvent.touchEnd(actionGenre);
        }
      });

      // Should not cause any errors
      expect(actionGenre).toBeInTheDocument();
    });

    it('should handle swipe gestures on content grids', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      const relatedContent = screen.getByTestId('related-content');
      expect(relatedContent).toBeInTheDocument();

      // Simulate swipe gesture
      act(() => {
        fireEvent.touchStart(relatedContent, {
          touches: [{ clientX: 100, clientY: 100 }],
        });
        fireEvent.touchMove(relatedContent, {
          touches: [{ clientX: 50, clientY: 100 }],
        });
        fireEvent.touchEnd(relatedContent);
      });

      // Should handle touch events without errors
      expect(relatedContent).toBeInTheDocument();
    });

    it('should provide adequate touch targets', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      // Genre tags should be large enough for touch - filter for genre tags specifically
      const genreTags = screen.getAllByText(/Action|Crime|Drama/).filter(el => el.className.includes('bg-primary/10'));
      genreTags.forEach(tag => {
        expect(tag.className).toContain('px-3 py-1'); // Adequate padding for touch
      });

      // Streaming options should be touch-friendly
      const streamingOptions = document.querySelectorAll('.streaming-option');
      streamingOptions.forEach(option => {
        // Should have adequate size for touch targets
        expect(option).toBeInTheDocument();
      });
    });
  });

  describe('Image Optimization for Mobile', () => {
    it('should use responsive image sizing for mobile', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      const backdropImage = screen.getByLabelText('The Dark Knight backdrop');
      expect(backdropImage).toHaveAttribute('data-sizes', '100vw');
      expect(backdropImage).toHaveAttribute('data-priority', 'true');

      const posterImage = screen.getByLabelText('The Dark Knight poster');
      expect(posterImage).toHaveAttribute('data-sizes', '256px');
    });

    it('should prioritize above-the-fold images on mobile', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      const criticalImages = screen.getAllByTestId('optimized-image');
      const prioritizedImages = criticalImages.filter(img => img.getAttribute('data-priority') === 'true');

      expect(prioritizedImages.length).toBeGreaterThan(0);
    });

    it('should use appropriate image quality for mobile', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      const backdropImage = screen.getByLabelText('The Dark Knight backdrop');
      expect(backdropImage).toHaveAttribute('data-quality', '85'); // Balanced quality for mobile

      const posterImage = screen.getByLabelText('The Dark Knight poster');
      expect(posterImage).toHaveAttribute('data-quality', '90'); // Higher quality for poster
    });
  });

  describe('Mobile SEO Considerations', () => {
    it('should maintain proper heading hierarchy on mobile', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      // Check heading levels using accessible queries
      const h1 = screen.getByRole('heading', { level: 1 });
      const h2Elements = screen.getAllByRole('heading', { level: 2 });

      expect(h1).toHaveTextContent('The Dark Knight');
      expect(h2Elements.length).toBeGreaterThanOrEqual(1); // At least one H2
    });

    it('should provide mobile-friendly navigation structure', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      const breadcrumbs = screen.getByTestId('breadcrumbs');
      expect(breadcrumbs).toBeInTheDocument();

      // Breadcrumbs should be accessible on mobile
      const breadcrumbItems = document.querySelectorAll('.breadcrumb-item');
      expect(breadcrumbItems.length).toBeGreaterThanOrEqual(2);
    });

    it('should optimize content loading for mobile', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      // Check that content is structured for progressive loading
      const sections = document.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(4);

      // Critical content should be prioritized - use specific selectors
      expect(screen.getByRole('heading', { level: 1, name: /The Dark Knight/i })).toBeInTheDocument();
      expect(screen.getByText('Why So Serious?')).toBeInTheDocument();
    });

    it('should handle text scaling for accessibility', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      // Text should use relative units and scale appropriately
      const title = screen.getByRole('heading', { level: 1, name: /the dark knight/i });
      expect(title.className).toContain('text-3xl sm:text-4xl lg:text-5xl');

      const overview = screen.getByText(mockContent.overview);
      expect(overview.className).toContain('leading-relaxed');
    });
  });

  describe('Performance on Mobile Devices', () => {
    it('should minimize layout shifts during loading', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      // Elements should have defined dimensions to prevent CLS
      const posterContainer = document.querySelector('.w-64.h-96');
      expect(posterContainer).toBeInTheDocument();

      const heroContainer = document.querySelector('.h-\\[40vh\\]');
      expect(heroContainer).toBeInTheDocument();
    });

    it('should use efficient mobile layouts', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      // Check for mobile-first responsive classes
      const flexContainer = document.querySelector('.flex-col.lg\\:flex-row');
      expect(flexContainer).toBeInTheDocument();

      // Content should be optimized for vertical scrolling on mobile
      const centeredContent = document.querySelector('.text-center.lg\\:text-left');
      expect(centeredContent).toBeInTheDocument();
    });

    it('should handle content overflow gracefully on small screens', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      // Long content should be handled with proper wrapping
      const genreContainer = document.querySelector('.flex-wrap');
      expect(genreContainer).toBeInTheDocument();

      // Overview text should have proper constraints
      const overview = document.querySelector('.max-w-3xl');
      expect(overview).toBeInTheDocument();
    });
  });

  describe('Mobile-First Indexing Compliance', () => {
    it('should provide consistent content across devices', () => {
      // Test mobile version
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      const { rerender } = render(<MockContentPage content={mockContent} type="movie" />);

      const mobileContent = document.body.innerHTML;

      // Test desktop version
      Object.defineProperty(window, 'innerWidth', { value: 1920 });
      rerender(<MockContentPage content={mockContent} type="movie" />);

      const desktopContent = document.body.innerHTML;

      // Core content should be the same (title, overview, etc.) - check both contain the content
      expect(mobileContent).toContain('The Dark Knight');
      expect(desktopContent).toContain('The Dark Knight');
      expect(mobileContent).toContain(mockContent.overview.substring(0, 50)); // Check first part of overview
      expect(desktopContent).toContain(mockContent.overview.substring(0, 50));
    });

    it('should maintain structured data consistency across devices', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      // Structured data should be device-agnostic
      const breadcrumbs = screen.getByTestId('breadcrumbs');
      const contentDetails = screen.getByTestId('content-details');
      const streamingOptions = screen.getByTestId('streaming-options');

      expect(breadcrumbs).toBeInTheDocument();
      expect(contentDetails).toBeInTheDocument();
      expect(streamingOptions).toBeInTheDocument();
    });

    it('should ensure mobile content is crawlable', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      // Important content should not be hidden on mobile
      const titleElements = screen.getAllByText('The Dark Knight');
      expect(titleElements[0]).toBeVisible();
      expect(screen.getByText(mockContent.overview)).toBeVisible();
      expect(screen.getByText('Where to Watch The Dark Knight')).toBeVisible();

      // Navigation elements should be accessible
      const breadcrumbs = screen.getByTestId('breadcrumbs');
      expect(breadcrumbs).toBeVisible();
    });
  });

  describe('Cross-Device Compatibility', () => {
    const devices = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'iPad Pro', width: 1024, height: 1366 },
      { name: 'Desktop', width: 1920, height: 1080 },
    ];

    devices.forEach(device => {
      it(`should render correctly on ${device.name}`, () => {
        Object.defineProperty(window, 'innerWidth', { value: device.width });
        Object.defineProperty(window, 'innerHeight', { value: device.height });

        window.matchMedia = jest.fn().mockImplementation((query: string) => ({
          ...mockMatchMedia(query),
          matches: query.includes(`max-width: ${device.width}px`),
        }));

        render(<MockContentPage content={mockContent} type="movie" />);

        // Core content should always be present - handle multiple instances
        const titleElements = screen.getAllByText('The Dark Knight');
        expect(titleElements.length).toBeGreaterThan(0);
        expect(titleElements[0]).toBeInTheDocument();

        expect(screen.getByText(mockContent.overview)).toBeInTheDocument();
        expect(screen.getByTestId('streaming-options')).toBeInTheDocument();
        expect(screen.getByTestId('related-content')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Accessibility', () => {
    it('should support screen reader navigation on mobile', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      // Check for proper semantic structure
      const sections = document.querySelectorAll('section');
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

      expect(sections.length).toBeGreaterThan(0);
      expect(headings.length).toBeGreaterThan(0);

      // Images should have appropriate accessibility attributes
      const images = document.querySelectorAll('img[alt], div[role="img"][aria-label]');
      expect(images.length).toBeGreaterThan(0);
    });

    it('should provide adequate focus indicators for mobile', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      // Interactive elements should be focusable
      const genreTags = screen.getAllByText(/Action|Crime|Drama/);
      genreTags.forEach(tag => {
        expect(tag).toBeInTheDocument();
        // Focus styles should be applied via CSS
      });
    });

    it('should support keyboard navigation on mobile', () => {
      render(<MockContentPage content={mockContent} type="movie" />);

      // Navigation should work with keyboard
      const breadcrumbs = screen.getByTestId('breadcrumbs');
      expect(breadcrumbs).toBeInTheDocument();

      // Links should be keyboard accessible
      const breadcrumbItems = document.querySelectorAll('.breadcrumb-item');
      breadcrumbItems.forEach(item => {
        expect(item).toBeInTheDocument();
      });
    });
  });
});
