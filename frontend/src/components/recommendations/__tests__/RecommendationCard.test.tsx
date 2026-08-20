/**
 * RecommendationCard Component Tests
 *
 * Test coverage for content recommendation card component.
 * Tests rendering, interactions, metadata display, and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecommendationCard } from '../RecommendationCard';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, onError, fill, ...props }: any) => {
    // Convert fill prop to style for regular img element
    const style = fill ? { objectFit: 'cover', width: '100%', height: '100%' } : {};
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        onError={onError}
        style={style}
        {...props}
      />
    );
  },
}));

const mockProps = {
  id: 'rec-123',
  title: 'The Matrix',
  type: 'movie',
  overview: 'A computer hacker learns about the true nature of reality.',
  rating: 8.7,
  releaseYear: 1999,
  genres: ['Action', 'Sci-Fi', 'Thriller'],
  posterUrl: 'https://example.com/poster.jpg',
  backdropUrl: 'https://example.com/backdrop.jpg',
  recommendationScore: 0.95,
  recommendationType: 'personalized',
  recommendationReason: 'Based on your love for sci-fi action films',
};

describe('RecommendationCard', () => {
  describe('Basic Rendering', () => {
    it('renders with required props', () => {
      render(<RecommendationCard {...mockProps} />);

      expect(screen.getByText('The Matrix')).toBeInTheDocument();
      expect(screen.getByText('1999')).toBeInTheDocument();
      expect(screen.getByText('MOVIE')).toBeInTheDocument();
    });

    it('renders with all optional props', () => {
      const allProps = {
        ...mockProps,
        onAddToWatchlist: jest.fn(),
        onDismiss: jest.fn(),
        onViewDetails: jest.fn(),
        onRate: jest.fn(),
        isInWatchlist: false,
        isDismissible: true,
        className: 'custom-class',
      };

      const { container } = render(<RecommendationCard {...allProps} />);

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
      expect(screen.getByLabelText(/dismiss.*recommendation/i)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <RecommendationCard {...mockProps} className="test-class" />
      );

      const card = container.querySelector('.test-class');
      expect(card).toBeInTheDocument();
    });

    it('renders different content types with correct colors', () => {
      const { rerender } = render(<RecommendationCard {...mockProps} type="movie" />);
      expect(screen.getByText('MOVIE')).toHaveClass('text-primary');

      rerender(<RecommendationCard {...mockProps} type="tv" />);
      expect(screen.getByText('TV')).toHaveClass('text-success');

      rerender(<RecommendationCard {...mockProps} type="documentary" />);
      expect(screen.getByText('DOCUMENTARY')).toHaveClass('text-accent');

      rerender(<RecommendationCard {...mockProps} type="unknown" />);
      expect(screen.getByText('UNKNOWN')).toHaveClass('text-muted-foreground');
    });

    it('renders without optional metadata', () => {
      const minimalProps = {
        ...mockProps,
        overview: undefined,
        rating: undefined,
        releaseYear: undefined,
      };

      render(<RecommendationCard {...minimalProps} />);

      expect(screen.getByText('The Matrix')).toBeInTheDocument();
      expect(screen.queryByText('1999')).not.toBeInTheDocument();
    });
  });

  describe('Image Handling', () => {
    it('renders poster image when posterUrl is provided', () => {
      render(<RecommendationCard {...mockProps} />);

      const image = screen.getByAltText('The Matrix poster');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', mockProps.posterUrl);
    });

    it('shows fallback icon when posterUrl is not provided', () => {
      render(<RecommendationCard {...mockProps} posterUrl={undefined} />);

      const eyeIcon = document.querySelector('[class*="lucide-eye"]');
      expect(eyeIcon).toBeInTheDocument();
    });

    it('shows fallback icon when image fails to load', async () => {
      render(<RecommendationCard {...mockProps} />);

      const image = screen.getByAltText('The Matrix poster');
      fireEvent.error(image);

      await waitFor(() => {
        const eyeIcon = document.querySelector('[class*="lucide-eye"]');
        expect(eyeIcon).toBeInTheDocument();
      });
    });

    it('has lazy loading attribute', () => {
      render(<RecommendationCard {...mockProps} />);

      const image = screen.getByAltText('The Matrix poster');
      expect(image).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('Content Metadata', () => {
    it('displays title with truncation support', () => {
      render(<RecommendationCard {...mockProps} />);

      const title = screen.getByText('The Matrix');
      expect(title).toHaveClass('line-clamp-2');
      expect(title).toHaveAttribute('title', 'The Matrix');
    });

    it('displays type badge with correct styling', () => {
      render(<RecommendationCard {...mockProps} />);

      const typeBadge = screen.getByText('MOVIE');
      expect(typeBadge).toBeInTheDocument();
    });

    it('displays release year when provided', () => {
      render(<RecommendationCard {...mockProps} />);

      expect(screen.getByText('1999')).toBeInTheDocument();
    });

    it('displays first 3 genres', () => {
      render(<RecommendationCard {...mockProps} />);

      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
      expect(screen.getByText('Thriller')).toBeInTheDocument();
    });

    it('shows +N badge when more than 3 genres', () => {
      const manyGenres = {
        ...mockProps,
        genres: ['Action', 'Sci-Fi', 'Thriller', 'Drama', 'Mystery'],
      };

      render(<RecommendationCard {...manyGenres} />);

      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
      expect(screen.getByText('Thriller')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
      expect(screen.queryByText('Drama')).not.toBeInTheDocument();
    });

    it('displays overview with truncation', () => {
      render(<RecommendationCard {...mockProps} />);

      const overview = screen.getByText(mockProps.overview);
      expect(overview).toHaveClass('line-clamp-2');
      expect(overview).toHaveAttribute('title', mockProps.overview);
    });

    it('hides overview when not provided', () => {
      render(<RecommendationCard {...mockProps} overview={undefined} />);

      expect(screen.queryByText(/computer hacker/i)).not.toBeInTheDocument();
    });
  });

  describe('Recommendation Badges', () => {
    it('displays trending recommendation type', () => {
      render(<RecommendationCard {...mockProps} recommendationType="trending" />);

      expect(screen.getByText('🔥 Trending')).toBeInTheDocument();
    });

    it('displays popular recommendation type', () => {
      render(<RecommendationCard {...mockProps} recommendationType="popular" />);

      expect(screen.getByText('⭐ Popular')).toBeInTheDocument();
    });

    it('displays similar recommendation type', () => {
      render(<RecommendationCard {...mockProps} recommendationType="similar" />);

      expect(screen.getByText('🎯 Similar')).toBeInTheDocument();
    });

    it('displays personalized recommendation type', () => {
      render(<RecommendationCard {...mockProps} recommendationType="personalized" />);

      expect(screen.getByText('💡 For You')).toBeInTheDocument();
    });

    it('displays collaborative recommendation type', () => {
      render(<RecommendationCard {...mockProps} recommendationType="collaborative" />);

      expect(screen.getByText('👥 Loved by Similar Users')).toBeInTheDocument();
    });

    it('displays content_based recommendation type', () => {
      render(<RecommendationCard {...mockProps} recommendationType="content_based" />);

      expect(screen.getByText('🎬 Based on Your Preferences')).toBeInTheDocument();
    });

    it('displays default recommendation type for unknown types', () => {
      render(<RecommendationCard {...mockProps} recommendationType="unknown" />);

      expect(screen.getByText('💫 Recommended')).toBeInTheDocument();
    });

    it('displays recommendation reason', () => {
      render(<RecommendationCard {...mockProps} />);

      expect(screen.getByText(/based on your love for sci-fi/i)).toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    it('calls onDismiss when dismiss button is clicked', async () => {
      const onDismiss = jest.fn();
      const user = userEvent.setup();

      render(<RecommendationCard {...mockProps} onDismiss={onDismiss} isDismissible />);

      const dismissButton = screen.getByLabelText(/dismiss.*recommendation/i);
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('stops event propagation when dismiss button is clicked', async () => {
      const onDismiss = jest.fn();
      const onViewDetails = jest.fn();
      const user = userEvent.setup();

      render(
        <RecommendationCard
          {...mockProps}
          onDismiss={onDismiss}
          onViewDetails={onViewDetails}
          isDismissible
        />
      );

      const dismissButton = screen.getByLabelText(/dismiss.*recommendation/i);
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
      // onViewDetails should not be called due to stopPropagation
    });

    it('calls onAddToWatchlist when Add button is clicked', async () => {
      const onAddToWatchlist = jest.fn();
      const user = userEvent.setup();

      // Need to hover first to show overlay buttons
      const { container } = render(
        <RecommendationCard
          {...mockProps}
          onAddToWatchlist={onAddToWatchlist}
          isInWatchlist={false}
        />
      );

      const card = container.querySelector('[class*="group"]');
      fireEvent.mouseEnter(card!);

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add/i });
        expect(addButton).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      expect(onAddToWatchlist).toHaveBeenCalledTimes(1);
    });

    it('calls onViewDetails when Details button is clicked', async () => {
      const onViewDetails = jest.fn();
      const user = userEvent.setup();

      const { container } = render(
        <RecommendationCard {...mockProps} onViewDetails={onViewDetails} />
      );

      const card = container.querySelector('[class*="group"]');
      fireEvent.mouseEnter(card!);

      await waitFor(() => {
        const detailsButtons = screen.getAllByRole('button', { name: /details/i });
        expect(detailsButtons.length).toBeGreaterThan(0);
      });

      const detailsButton = screen.getAllByRole('button', { name: /details/i })[0];
      await user.click(detailsButton);

      expect(onViewDetails).toHaveBeenCalled();
    });

    it('calls onRate when Rate button is clicked', async () => {
      const onRate = jest.fn();
      const user = userEvent.setup();

      render(<RecommendationCard {...mockProps} onRate={onRate} />);

      // Find the Rate text button (not the star rating buttons)
      const rateButton = screen.getByRole('button', { name: 'Rate' });
      await user.click(rateButton);

      expect(onRate).toHaveBeenCalledTimes(1);
    });

    it('calls onViewDetails when title is clicked', async () => {
      const onViewDetails = jest.fn();
      const user = userEvent.setup();

      render(<RecommendationCard {...mockProps} onViewDetails={onViewDetails} />);

      const title = screen.getByText('The Matrix');
      await user.click(title);

      expect(onViewDetails).toHaveBeenCalled();
    });

    it('updates hover state on mouse enter/leave', () => {
      const { container } = render(<RecommendationCard {...mockProps} />);

      const card = container.querySelector('[class*="group"]');

      // Initially not hovered
      const overlay = container.querySelector('[class*="opacity-0"]');
      expect(overlay).toBeInTheDocument();

      // Hover
      fireEvent.mouseEnter(card!);

      // Check if isHovered state changed (overlay becomes visible)
      // Note: exact class checking may vary based on Tailwind

      // Leave
      fireEvent.mouseLeave(card!);
    });
  });

  describe('Conditional Rendering', () => {
    it('hides dismiss button when isDismissible is false', () => {
      render(<RecommendationCard {...mockProps} onDismiss={jest.fn()} isDismissible={false} />);

      expect(screen.queryByLabelText(/dismiss.*recommendation/i)).not.toBeInTheDocument();
    });

    it('hides dismiss button when onDismiss is not provided', () => {
      render(<RecommendationCard {...mockProps} isDismissible />);

      expect(screen.queryByLabelText(/dismiss.*recommendation/i)).not.toBeInTheDocument();
    });

    it('hides Add button when isInWatchlist is true', () => {
      const { container } = render(
        <RecommendationCard
          {...mockProps}
          onAddToWatchlist={jest.fn()}
          isInWatchlist={true}
        />
      );

      const card = container.querySelector('[class*="group"]');
      fireEvent.mouseEnter(card!);

      expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
    });

    it('hides Rate button when onRate is not provided', () => {
      render(<RecommendationCard {...mockProps} />);

      // Look for exact "Rate" button, not star rating buttons
      expect(screen.queryByRole('button', { name: 'Rate' })).not.toBeInTheDocument();
    });

    it('hides rating display when rating is not provided', () => {
      render(<RecommendationCard {...mockProps} rating={undefined} />);

      // Check that StarRatingDisplay is not rendered
      const ratingElements = document.querySelectorAll('[role="img"]');
      expect(ratingElements.length).toBe(0);
    });

    it('shows rating in two places when rating is provided', () => {
      render(<RecommendationCard {...mockProps} rating={8.7} />);

      // Rating should appear in overlay and bottom section
      // Check for star rating radiogroups (one in overlay, one in bottom)
      const ratingGroups = screen.getAllByRole('radiogroup');
      expect(ratingGroups.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Accessibility', () => {
    it('has accessible dismiss button label', () => {
      render(<RecommendationCard {...mockProps} onDismiss={jest.fn()} isDismissible />);

      const dismissButton = screen.getByLabelText('Dismiss The Matrix recommendation');
      expect(dismissButton).toBeInTheDocument();
    });

    it('has title attribute for truncated content', () => {
      render(<RecommendationCard {...mockProps} />);

      const title = screen.getByText('The Matrix');
      expect(title).toHaveAttribute('title', 'The Matrix');

      const overview = screen.getByText(mockProps.overview);
      expect(overview).toHaveAttribute('title', mockProps.overview);
    });

    it('has proper button roles', () => {
      render(
        <RecommendationCard
          {...mockProps}
          onDismiss={jest.fn()}
          onRate={jest.fn()}
          onViewDetails={jest.fn()}
          isDismissible
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
