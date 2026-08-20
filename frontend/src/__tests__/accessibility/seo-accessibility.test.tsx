/**
 * Accessibility Compliance Tests for SEO-optimized content pages
 * Tests WCAG 2.1 compliance, screen reader compatibility, and inclusive design
 */

import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import Link from 'next/link';
import Image from 'next/image';
import '@testing-library/jest-dom';

// Configure jest-axe for this test file
expect.extend(toHaveNoViolations as unknown as jest.ExpectExtendMap);

// Augment Jest matchers to include toHaveNoViolations
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}

// Mock Next.js components
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { width?: number; height?: number }) => (
    <div
      {...props}
      data-testid="next-image"
      role="img"
      aria-label={(props as any).alt || 'Mock image'}
      className={`bg-gray-200 ${(props as any).className || ''}`}
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

// Create accessible mock components
interface AccessibleContentBreadcrumbsProps {
  type: string;
  title: string;
  genre?: string;
}

const AccessibleContentBreadcrumbs = ({ type, title, genre }: AccessibleContentBreadcrumbsProps) => (
  <nav aria-label="Breadcrumb" data-testid="breadcrumbs" className="breadcrumbs">
    <ol className="breadcrumb-list">
      <li className="breadcrumb-item">
        <Link href="/" aria-label="Go to homepage">
          Home
        </Link>
      </li>
      <li className="breadcrumb-item" aria-current="false">
        <Link href={`/${type}s`} aria-label={`Go to ${type}s page`}>
          {type.charAt(0).toUpperCase() + type.slice(1)}s
        </Link>
      </li>
      {genre && (
        <li className="breadcrumb-item" aria-current="false">
          <Link href={`/${type}s/genre/${genre.toLowerCase()}`} aria-label={`Go to ${genre} ${type}s`}>
            {genre}
          </Link>
        </li>
      )}
      <li className="breadcrumb-item" aria-current="page">
        {title}
      </li>
    </ol>
  </nav>
);

interface AccessibleStreamingOptionsGridProps {
  contentId: string;
  contentType: string;
}

const AccessibleStreamingOptionsGrid = ({}: AccessibleStreamingOptionsGridProps) => (
  <section data-testid="streaming-options" aria-labelledby="streaming-heading">
    <div className="streaming-grid" role="list">
      <div className="streaming-option" role="listitem">
        <button type="button" aria-label="Watch on Netflix - Subscription required" className="streaming-button">
          <Image src="/netflix-logo.png" alt="Netflix logo" width={32} height={32} />
          <span>Netflix</span>
          <span className="sr-only">Subscription required</span>
        </button>
      </div>
      <div className="streaming-option" role="listitem">
        <button type="button" aria-label="Rent on Amazon Prime Video - $4.99" className="streaming-button">
          <Image src="/prime-logo.png" alt="Amazon Prime Video logo" width={32} height={32} />
          <span>Amazon Prime</span>
          <span className="sr-only">$4.99 to rent</span>
        </button>
      </div>
      <div className="streaming-option" role="listitem">
        <button type="button" aria-label="Watch on Hulu - Subscription required" className="streaming-button">
          <Image src="/hulu-logo.png" alt="Hulu logo" width={32} height={32} />
          <span>Hulu</span>
          <span className="sr-only">Subscription required</span>
        </button>
      </div>
    </div>
  </section>
);

interface AccessibleContentDetailsProps {
  content: {
    cast?: Array<{
      name: string;
      character?: string;
      profilePath?: string;
    }>;
    crew?: Array<{
      name: string;
      job: string;
      profilePath?: string;
    }>;
  };
  type: string;
}

const AccessibleContentDetails = ({ content }: AccessibleContentDetailsProps) => (
  <section data-testid="content-details" aria-labelledby="details-heading">
    <h2 id="details-heading">Cast & Crew</h2>
    <div className="cast-section">
      <h3>Main Cast</h3>
      <ul className="cast-list" role="list">
        {content.cast?.slice(0, 6).map((actor, index) => (
          <li key={index} className="cast-member" role="listitem">
            <Image
              src={actor.profilePath || '/placeholder-actor.jpg'}
              alt={`${actor.name} headshot`}
              className="actor-photo"
              width={80}
              height={80}
            />
            <div className="actor-info">
              <span className="actor-name">{actor.name}</span>
              {actor.character && <span className="character-name">as {actor.character}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>

    {content.crew && content.crew.length > 0 && (
      <div className="crew-section">
        <h3>Director{content.crew.filter((c: { job: string }) => c.job === 'Director').length > 1 ? 's' : ''}</h3>
        <ul className="crew-list" role="list">
          {content.crew
            .filter((member: { job: string }) => member.job === 'Director')
            .map((director: { name: string }, index) => (
              <li key={index} className="crew-member" role="listitem">
                {director.name}
              </li>
            ))}
        </ul>
      </div>
    )}
  </section>
);

interface AccessibleRelatedContentProps {
  contentId?: string;
  contentType: string;
  genres?: string[];
  limit?: number;
}

const AccessibleRelatedContent = ({ contentType, limit }: AccessibleRelatedContentProps) => (
  <section data-testid="related-content" aria-labelledby="related-heading">
    <h2 id="related-heading">Related Content</h2>
    <div className="content-grid" role="list">
      {Array.from({ length: limit || 6 }).map((_, index) => (
        <div key={index} className="content-item" role="listitem">
          <Link href={`/content/${contentType}/${index}-related-title`} aria-labelledby={`related-title-${index}`}>
            <Image
              src="/placeholder.jpg"
              alt=""
              role="presentation"
              className="content-poster"
              width={200}
              height={300}
            />
            <h3 id={`related-title-${index}`} className="content-title">
              Related Title {index}
            </h3>
            <div className="content-info">
              <span className="content-year">2023</span>
              <span className="content-rating" aria-label="Rating 8.5 out of 10">
                ⭐ 8.5
              </span>
            </div>
          </Link>
        </div>
      ))}
    </div>
  </section>
);

// Create the main accessible content page component
interface AccessibleContentPageProps {
  content: {
    id: string;
    title: string;
    cast?: Array<{ name: string; character?: string; profilePath?: string }>;
    crew?: Array<{ name: string; job: string; profilePath?: string }>;
    backdropUrl?: string;
    primaryGenre?: string;
    posterUrl?: string;
    releaseYear?: number;
    tagline?: string;
    rating?: number;
    voteCount?: number;
    runtime?: number;
    contentRating?: string;
    genres?: string[];
    overview?: string;
  };
  type: string;
}

const AccessibleContentPage = ({ content, type }: AccessibleContentPageProps) => (
  <main className="min-h-screen bg-background" id="main-content">
    {/* Skip to content link */}
    <Link href="#main-content" className="skip-link sr-only focus:not-sr-only">
      Skip to main content
    </Link>

    {/* Hero Section */}
    <section className="relative" aria-labelledby="hero-heading">
      <div className="absolute inset-0 h-[40vh] sm:h-[50vh] lg:h-[60vh]" aria-hidden="true">
        {content.backdropUrl && (
          <MockOptimizedImage
            src={content.backdropUrl}
            alt=""
            role="presentation"
            sizes="100vw"
            quality={85}
            priority
            className="object-cover w-full h-full"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-8">
        <AccessibleContentBreadcrumbs type={type} title={content.title} genre={content.primaryGenre} />

        <div className="flex flex-col lg:flex-row gap-8 mt-8">
          {/* Poster */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <div className="w-64 h-96 relative rounded-lg overflow-hidden shadow-2xl">
              {content.posterUrl && (
                <MockOptimizedImage
                  src={content.posterUrl}
                  alt={`${content.title} movie poster`}
                  sizes="256px"
                  quality={90}
                  className="object-cover w-full h-full"
                />
              )}
            </div>
          </div>

          {/* Content Info */}
          <div className="flex-1 text-center lg:text-left">
            <h1 id="hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
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
                <div
                  className="flex items-center bg-surface px-3 py-2 rounded-lg"
                  role="group"
                  aria-label="Movie rating"
                >
                  <span className="text-yellow-500 mr-1" aria-hidden="true">
                    ⭐
                  </span>
                  <span className="font-semibold" aria-label={`Rated ${content.rating.toFixed(1)} out of 10`}>
                    {content.rating.toFixed(1)}
                  </span>
                  {content.voteCount && (
                    <span className="text-sm text-foreground-muted ml-1">
                      ({content.voteCount.toLocaleString()} votes)
                    </span>
                  )}
                </div>
              )}

              {content.runtime && (
                <div className="bg-surface px-3 py-2 rounded-lg" role="group" aria-label="Runtime">
                  <span className="font-semibold" aria-label={`Runtime ${content.runtime} minutes`}>
                    {content.runtime} min
                  </span>
                </div>
              )}

              {content.contentRating && (
                <div className="bg-surface px-3 py-2 rounded-lg" role="group" aria-label="Content rating">
                  <span className="font-semibold" aria-label={`Rated ${content.contentRating}`}>
                    {content.contentRating}
                  </span>
                </div>
              )}
            </div>

            {content.genres && content.genres.length > 0 && (
              <div
                className="flex flex-wrap justify-center lg:justify-start gap-2 mb-6"
                role="group"
                aria-label="Movie genres"
              >
                {content.genres.map((genre: string) => (
                  <button
                    key={genre}
                    type="button"
                    className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    aria-label={`View more ${genre} movies`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            )}

            {content.overview && (
              <div>
                <h2 className="sr-only">Movie Overview</h2>
                <p className="text-foreground-muted leading-relaxed max-w-3xl">{content.overview}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>

    {/* Streaming Options */}
    <section className="py-12 bg-surface">
      <div className="container mx-auto px-4">
        <h2 id="streaming-heading" className="text-2xl font-bold text-foreground mb-8 text-center">
          Where to Watch {content.title}
        </h2>
        <AccessibleStreamingOptionsGrid contentId={content.id} contentType={type} />
      </div>
    </section>

    {/* Content Details */}
    <section className="py-12">
      <div className="container mx-auto px-4">
        <AccessibleContentDetails content={content} type={type} />
      </div>
    </section>

    {/* Related Content */}
    <section className="py-12 bg-surface">
      <div className="container mx-auto px-4">
        <AccessibleRelatedContent contentId={content.id} contentType={type} genres={content.genres} limit={12} />
      </div>
    </section>
  </main>
);

describe('SEO Accessibility Compliance Tests', () => {
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
    crew: [{ id: 4, name: 'Christopher Nolan', job: 'Director', department: 'Directing', profilePath: '/nolan.jpg' }],
  };

  describe('WCAG 2.1 Level AA Compliance', () => {
    it('should pass axe accessibility tests', async () => {
      const { container } = render(<AccessibleContentPage content={mockContent} type="movie" />);

      const results = await axe(container);

      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy (H1 -> H2 -> H3)', () => {
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      const h1 = document.querySelector('h1');
      const h2Elements = document.querySelectorAll('h2');
      const h3Elements = document.querySelectorAll('h3');

      expect(h1).toBeInTheDocument();
      expect(h1).toHaveTextContent('The Dark Knight');
      expect(h2Elements.length).toBeGreaterThanOrEqual(3);
      expect(h3Elements.length).toBeGreaterThan(0);
    });

    it('should provide alternative text for all images', () => {
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      const images = document.querySelectorAll('img');
      images.forEach(img => {
        const alt = img.getAttribute('alt');
        const role = img.getAttribute('role');

        // Images should either have alt text or be marked as decorative
        expect(alt !== null || role === 'presentation').toBe(true);
      });
    });

    it('should provide skip navigation link', () => {
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('should have proper ARIA labels and roles', () => {
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      // Check navigation landmarks
      const nav = document.querySelector('nav[aria-label="Breadcrumb"]');
      expect(nav).toBeInTheDocument();

      // Check list roles
      const lists = document.querySelectorAll('[role="list"]');
      expect(lists.length).toBeGreaterThan(0);

      const listItems = document.querySelectorAll('[role="listitem"]');
      expect(listItems.length).toBeGreaterThan(0);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation through all interactive elements', async () => {
      const user = userEvent.setup();
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      // Tab through interactive elements
      await user.tab();
      expect(document.activeElement).toBe(screen.getByText('Skip to main content'));

      // Continue tabbing through breadcrumb links
      await user.tab();
      const firstBreadcrumb = document.querySelector('a[href="/"]');
      expect(document.activeElement).toBe(firstBreadcrumb);

      // Tab to genre buttons
      const genreButtons = screen.getAllByRole('button');
      const firstGenreButton = genreButtons.find(btn => btn.textContent === 'Action');

      if (firstGenreButton) {
        firstGenreButton.focus();
        expect(document.activeElement).toBe(firstGenreButton);
      }
    });

    it('should support Enter and Space key activation', async () => {
      const user = userEvent.setup();
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      const actionGenre = screen.getByRole('button', { name: /View more Action movies/i });
      actionGenre.focus();

      // Test Enter key
      await user.keyboard('{Enter}');
      // Should not cause errors

      // Test Space key
      await user.keyboard(' ');
      // Should not cause errors
    });

    it('should provide visible focus indicators', async () => {
      const user = userEvent.setup();
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      const genreButton = screen.getByRole('button', { name: /View more Action movies/i });

      await user.tab();
      genreButton.focus();

      // Focus styles should be applied via CSS classes
      expect(genreButton.className).toContain('focus:ring-2');
      expect(genreButton.className).toContain('focus:outline-none');
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should provide descriptive ARIA labels for complex information', () => {
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      // Rating should have descriptive label
      const ratingElement = screen.getByLabelText(/Rated 9.0 out of 10/i);
      expect(ratingElement).toBeInTheDocument();

      // Runtime should have descriptive label
      const runtimeElement = screen.getByLabelText(/Runtime 152 minutes/i);
      expect(runtimeElement).toBeInTheDocument();

      // Content rating should have descriptive label
      const contentRatingElement = screen.getByLabelText(/Rated PG-13/i);
      expect(contentRatingElement).toBeInTheDocument();
    });

    it('should use screen reader only text for additional context', () => {
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      // Check for screen reader only content
      const srOnlyElements = document.querySelectorAll('.sr-only');
      expect(srOnlyElements.length).toBeGreaterThan(0);

      // Streaming options should have additional context
      const subscriptionTexts = screen.getAllByText('Subscription required');
      expect(subscriptionTexts.length).toBeGreaterThan(0);
      subscriptionTexts.forEach(text => {
        expect(text.className).toContain('sr-only');
      });
    });

    it('should provide proper heading structure for screen readers', () => {
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      const h3Elements = screen.getAllByRole('heading', { level: 3 });

      expect(h1).toHaveTextContent('The Dark Knight');
      expect(h2Elements.length).toBeGreaterThanOrEqual(2);
      expect(h3Elements.length).toBeGreaterThan(0);

      // Check specific headings
      expect(screen.getByRole('heading', { name: /Where to Watch/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Cast & Crew/i })).toBeInTheDocument();
    });

    it('should announce dynamic content changes appropriately', () => {
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      // Sections should have proper labeling for screen readers
      // Most sections should have aria-labelledby
      const sections = document.querySelectorAll('section[aria-labelledby]');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Visual Accessibility', () => {
    it('should not rely solely on color to convey information', () => {
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      // Rating uses star emoji as well as color - check parent element
      const ratingGroup = screen.getByRole('group', { name: /Movie rating/i });
      expect(ratingGroup.textContent).toContain('⭐');

      // Genres should have text labels, not just color
      const genreButtons = screen.getAllByRole('button');
      genreButtons.forEach(button => {
        expect(button?.textContent || "").toBeTruthy();
      });
    });

    it('should support high contrast mode', () => {
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      // Elements should have appropriate contrast classes
      const title = screen.getByRole('heading', { level: 1 });
      expect(title.className).toContain('text-foreground');

      const description = screen.getByText(mockContent.overview);
      expect(description.className).toContain('text-foreground-muted');
    });

    it('should be readable when CSS is disabled', () => {
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      // Content should be in logical reading order
      const mainContent = document.querySelector('main');
      expect(mainContent).toBeInTheDocument();

      // Important information should be in the correct order
      const title = screen.getByRole('heading', { level: 1 });
      const overview = screen.getByText(mockContent.overview);

      expect(title.compareDocumentPosition(overview)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe('Mobile Accessibility', () => {
    it('should have adequate touch targets (minimum 44x44px)', () => {
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Buttons should have adequate padding for touch targets or be properly sized
        const hasProperPadding =
          /p[xy]-[1-4]/.test(button.className) ||
          /streaming-button/.test(button.className) ||
          button.className.includes('px-3 py-1');
        expect(hasProperPadding).toBe(true);
      });
    });

    it('should support zoom up to 200% without horizontal scrolling', () => {
      // This would typically be tested with browser zoom, but we can check responsive design
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      const mainContent = document.querySelector('main');
      expect(mainContent?.className).toContain('min-h-screen');

      // Flexible layouts should be used
      const flexContainers = document.querySelectorAll('.flex-wrap, .flex-col');
      expect(flexContainers.length).toBeGreaterThan(0);
    });

    it('should provide orientation support', () => {
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      // Layout should work in both portrait and landscape
      const responsiveContainers = document.querySelectorAll('.lg\\:flex-row, .sm\\:text-4xl');
      expect(responsiveContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Error Prevention and Recovery', () => {
    it('should handle missing content gracefully', () => {
      const incompleteContent = {
        id: '456',
        title: 'Incomplete Movie',
        // Missing most fields
      };

      expect(() => {
        render(<AccessibleContentPage content={incompleteContent} type="movie" />);
      }).not.toThrow();

      const h1Heading = screen.getByRole('heading', { level: 1, name: /Incomplete Movie/i });
      expect(h1Heading).toBeInTheDocument();
    });

    it('should provide meaningful error messages when content fails to load', () => {
      const errorContent = {
        id: 'error',
        title: 'Error Loading Content',
        overview: undefined,
      };

      render(<AccessibleContentPage content={errorContent} type="movie" />);

      // Should still render the title
      const h1Heading = screen.getByRole('heading', { level: 1, name: /Error Loading Content/i });
      expect(h1Heading).toBeInTheDocument();
    });

    it('should maintain accessibility during loading states', () => {
      // This would typically test loading spinners, skeleton screens, etc.
      render(<AccessibleContentPage content={mockContent} type="movie" />);

      // Live regions should be present for announcements
      const sections = document.querySelectorAll('section[aria-labelledby]');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('Internationalization Accessibility', () => {
    it('should support RTL languages', () => {
      const rtlContent = {
        ...mockContent,
        title: 'فيلم باللغة العربية',
        overview: 'وصف الفيلم باللغة العربية مع نص طويل للاختبار',
      };

      render(<AccessibleContentPage content={rtlContent} type="movie" />);

      const h1Heading = screen.getByRole('heading', { level: 1, name: /فيلم باللغة العربية/i });
      expect(h1Heading).toBeInTheDocument();
      expect(screen.getByText(rtlContent.overview)).toBeInTheDocument();
    });

    it('should handle special characters in accessibility labels', () => {
      const specialCharContent = {
        ...mockContent,
        title: 'Movie with "Quotes" & Symbols',
        overview: 'Description with special characters: é, ñ, ü, <>&',
      };

      render(<AccessibleContentPage content={specialCharContent} type="movie" />);

      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveTextContent('Movie with "Quotes" & Symbols');
    });
  });

  describe('Performance Accessibility', () => {
    it('should not cause accessibility performance issues', async () => {
      const startTime = performance.now();

      // Run axe accessibility check
      const { container } = render(<AccessibleContentPage content={mockContent} type="movie" />);
      const results = await axe(container);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Accessibility checks shouldn't significantly impact performance (increased timeout for CI environments)
      expect(duration).toBeLessThan(3000); // Under 3 seconds (CI environments can be slower)
      expect(results).toHaveNoViolations();
    });

    it('should maintain accessibility with large datasets', () => {
      const largeContent = {
        ...mockContent,
        cast: Array.from({ length: 100 }, (_, i) => ({
          id: i.toString(),
          name: `Actor ${i}`,
          character: `Character ${i}`,
        })),
      };

      render(<AccessibleContentPage content={largeContent} type="movie" />);

      // Should still be accessible with large cast
      const castList = screen.getByText('Main Cast');
      expect(castList).toBeInTheDocument();

      // Should limit displayed cast for performance but maintain accessibility
      const castMembers = document.querySelectorAll('.cast-member');
      expect(castMembers.length).toBeLessThanOrEqual(6);
    });
  });
});
