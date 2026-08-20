/**
 * PaywalledSearchResultCard Watchlist Integration Tests
 *
 * TDD Phase 1 (RED): Tests for bookmark/watchlist functionality
 * These tests are written FIRST before implementation
 *
 * Test Categories:
 * 1. Bookmark Button Rendering (4 tests)
 * 2. Bookmark Click Behavior (4 tests)
 * 3. Bookmark State Display (3 tests)
 * 4. Edge Cases (2 tests)
 *
 * Mocking Strategy: Boundary-only mocking
 * - Mock Next.js Image component (external dependency)
 * - Mock API functions from '@/lib/api'
 * - Test REAL component logic and rendering
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaywalledSearchResultCard } from '../PaywalledSearchResultCard';
import { PaywalledSearchResult, ContentType } from '@/lib/types/paywall';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock API functions at boundary
jest.mock('@/lib/api', () => ({
  logPaywallInteraction: jest.fn().mockResolvedValue(undefined),
}));

describe('PaywalledSearchResultCard - Watchlist Integration', () => {
  const mockResult: PaywalledSearchResult = {
    id: 'test-movie-123',
    title: 'Test Movie',
    type: ContentType.Movie,
    year: 2024,
    posterUrl: '/test-poster.jpg',
    description: 'A test movie for watchlist integration',
    imdbRating: 8.5,
    genres: ['Action', 'Drama'],
    cast: ['Actor One', 'Actor Two'],
    director: 'Test Director',
    availableCountries: 10,
    streamingOptions: [
      {
        serviceId: 'netflix',
        serviceName: 'Netflix',
        type: 'subscription',
        price: 15.99,
        currency: '$',
        url: 'https://netflix.com/test',
        availableInCountries: ['US', 'GB'],
      },
    ],
    isPaywalled: false,
    relevanceScore: 90,
  };

  const mockTvResult: PaywalledSearchResult = {
    ...mockResult,
    id: 'test-tv-456',
    title: 'Test TV Show',
    type: ContentType.Show,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // CATEGORY 1: BOOKMARK BUTTON RENDERING (4 tests)
  // ============================================================================

  describe('Bookmark Button Rendering', () => {
    it('renders bookmark button when onBookmarkClick is provided', () => {
      const onBookmarkClick = jest.fn();
      render(
        <PaywalledSearchResultCard
          result={mockResult}
          onBookmarkClick={onBookmarkClick}
        />
      );

      const bookmarkButton = screen.getByRole('button', { name: /watchlist/i });
      expect(bookmarkButton).toBeInTheDocument();
    });

    it('does not render bookmark button when onBookmarkClick is not provided', () => {
      render(<PaywalledSearchResultCard result={mockResult} />);

      const bookmarkButton = screen.queryByRole('button', { name: /watchlist/i });
      expect(bookmarkButton).not.toBeInTheDocument();
    });

    it('renders bookmark button in compact mode', () => {
      const onBookmarkClick = jest.fn();
      render(
        <PaywalledSearchResultCard
          result={mockResult}
          onBookmarkClick={onBookmarkClick}
          compactMode={true}
        />
      );

      const bookmarkButton = screen.getByRole('button', { name: /watchlist/i });
      expect(bookmarkButton).toBeInTheDocument();
    });

    it('shows correct aria-label for non-bookmarked item', () => {
      const onBookmarkClick = jest.fn();
      render(
        <PaywalledSearchResultCard
          result={mockResult}
          onBookmarkClick={onBookmarkClick}
          isInWatchlist={false}
        />
      );

      const bookmarkButton = screen.getByRole('button', { name: /add to watchlist/i });
      expect(bookmarkButton).toBeInTheDocument();
    });
  });

  // ============================================================================
  // CATEGORY 2: BOOKMARK CLICK BEHAVIOR (4 tests)
  // ============================================================================

  describe('Bookmark Click Behavior', () => {
    it('calls onBookmarkClick with result and isAdding=true when adding', () => {
      const onBookmarkClick = jest.fn();
      render(
        <PaywalledSearchResultCard
          result={mockResult}
          onBookmarkClick={onBookmarkClick}
          isInWatchlist={false}
        />
      );

      const bookmarkButton = screen.getByRole('button', { name: /add to watchlist/i });
      fireEvent.click(bookmarkButton);

      expect(onBookmarkClick).toHaveBeenCalledTimes(1);
      expect(onBookmarkClick).toHaveBeenCalledWith(mockResult, true);
    });

    it('calls onBookmarkClick with result and isAdding=false when removing', () => {
      const onBookmarkClick = jest.fn();
      render(
        <PaywalledSearchResultCard
          result={mockResult}
          onBookmarkClick={onBookmarkClick}
          isInWatchlist={true}
        />
      );

      const bookmarkButton = screen.getByRole('button', { name: /remove from watchlist/i });
      fireEvent.click(bookmarkButton);

      expect(onBookmarkClick).toHaveBeenCalledTimes(1);
      expect(onBookmarkClick).toHaveBeenCalledWith(mockResult, false);
    });

    it('prevents event propagation to card click handler', () => {
      const onBookmarkClick = jest.fn();
      const onViewDetails = jest.fn();
      render(
        <PaywalledSearchResultCard
          result={mockResult}
          onBookmarkClick={onBookmarkClick}
          onViewDetails={onViewDetails}
          isInWatchlist={false}
        />
      );

      const bookmarkButton = screen.getByRole('button', { name: /add to watchlist/i });
      fireEvent.click(bookmarkButton);

      expect(onBookmarkClick).toHaveBeenCalledTimes(1);
      // Card click should NOT be called when bookmark is clicked
      expect(onViewDetails).not.toHaveBeenCalled();
    });

    it('disables bookmark button when bookmarkLoading is true', () => {
      const onBookmarkClick = jest.fn();
      render(
        <PaywalledSearchResultCard
          result={mockResult}
          onBookmarkClick={onBookmarkClick}
          bookmarkLoading={true}
        />
      );

      const bookmarkButton = screen.getByRole('button', { name: /watchlist/i });
      expect(bookmarkButton).toBeDisabled();

      fireEvent.click(bookmarkButton);
      expect(onBookmarkClick).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CATEGORY 3: BOOKMARK STATE DISPLAY (3 tests)
  // ============================================================================

  describe('Bookmark State Display', () => {
    it('shows outline bookmark icon when not in watchlist', () => {
      const onBookmarkClick = jest.fn();
      render(
        <PaywalledSearchResultCard
          result={mockResult}
          onBookmarkClick={onBookmarkClick}
          isInWatchlist={false}
        />
      );

      // The button should have aria-label indicating it can be added
      const bookmarkButton = screen.getByRole('button', { name: /add to watchlist/i });
      expect(bookmarkButton).toBeInTheDocument();
    });

    it('shows filled bookmark icon when in watchlist', () => {
      const onBookmarkClick = jest.fn();
      render(
        <PaywalledSearchResultCard
          result={mockResult}
          onBookmarkClick={onBookmarkClick}
          isInWatchlist={true}
        />
      );

      // The button should have aria-label indicating it can be removed
      const bookmarkButton = screen.getByRole('button', { name: /remove from watchlist/i });
      expect(bookmarkButton).toBeInTheDocument();
    });

    it('defaults to not in watchlist when isInWatchlist is undefined', () => {
      const onBookmarkClick = jest.fn();
      render(
        <PaywalledSearchResultCard
          result={mockResult}
          onBookmarkClick={onBookmarkClick}
        />
      );

      const bookmarkButton = screen.getByRole('button', { name: /add to watchlist/i });
      expect(bookmarkButton).toBeInTheDocument();
    });
  });

  // ============================================================================
  // CATEGORY 4: EDGE CASES (2 tests)
  // ============================================================================

  describe('Edge Cases', () => {
    it('works with TV show content type', () => {
      const onBookmarkClick = jest.fn();
      render(
        <PaywalledSearchResultCard
          result={mockTvResult}
          onBookmarkClick={onBookmarkClick}
          isInWatchlist={false}
        />
      );

      const bookmarkButton = screen.getByRole('button', { name: /add to watchlist/i });
      fireEvent.click(bookmarkButton);

      expect(onBookmarkClick).toHaveBeenCalledWith(mockTvResult, true);
    });

    it('has accessible title attribute for tooltip', () => {
      const onBookmarkClick = jest.fn();
      render(
        <PaywalledSearchResultCard
          result={mockResult}
          onBookmarkClick={onBookmarkClick}
          isInWatchlist={false}
        />
      );

      const bookmarkButton = screen.getByRole('button', { name: /add to watchlist/i });
      expect(bookmarkButton).toHaveAttribute('title', 'Add to watchlist');
    });
  });
});
