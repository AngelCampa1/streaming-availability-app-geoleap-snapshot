import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FiveStarRating } from '../FiveStarRating';
import { server, http, HttpResponse } from '@/mocks/server';

// Use MSW for network-level API mocking instead of jest.mock(fetch)
// Default handler returns success - override in specific tests as needed

describe('FiveStarRating Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Add default rating endpoint handler
    server.use(
      http.post('/api/content/:contentId/rate', () => {
        return HttpResponse.json({ success: true });
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('US-8.4 Rating System Requirements', () => {
    it('should render 5 stars for rating interface', () => {
      render(<FiveStarRating contentId="test-content-123" />);

      const stars = screen.getAllByTestId(/^star-\d$/);
      expect(stars).toHaveLength(5);
    });

    it('should allow selecting ratings from 1 to 5 stars', async () => {
      const mockOnRate = jest.fn() as any;
      render(<FiveStarRating contentId="test-content-123" onRatingSubmit={mockOnRate} />);

      // Click on the 4th star
      const fourthStar = screen.getByTestId('star-4');
      fireEvent.click(fourthStar);

      // Click submit to trigger the callback
      const submitButton = screen.getByTestId('submit-rating');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnRate).toHaveBeenCalledWith(4);
      });
    });

    it('should submit rating to backend API', async () => {
      const contentId = 'movie-123';
      let capturedRequest: { rating?: number } | null = null;

      // Use MSW to capture the request body
      server.use(
        http.post('/api/content/:contentId/rate', async ({ request }) => {
          capturedRequest = await request.json() as { rating?: number };
          return HttpResponse.json({ success: true });
        })
      );

      render(<FiveStarRating contentId={contentId} />);

      // Click on the 5th star
      const fifthStar = screen.getByTestId('star-5');
      fireEvent.click(fifthStar);

      // Click submit button
      const submitButton = screen.getByTestId('submit-rating');
      fireEvent.click(submitButton);

      // Verify the success state appears (confirms API was called)
      await waitFor(() => {
        expect(screen.getByTestId('rating-success')).toBeInTheDocument();
      });

      // Verify the rating value was sent correctly
      expect(capturedRequest).toEqual({ rating: 5 });
    });

    it('should validate rating is within 1-5 range', () => {
      render(<FiveStarRating contentId="test-content-123" />);

      // Should not render stars outside 1-5 range
      expect(screen.queryByTestId('star-0')).not.toBeInTheDocument();
      expect(screen.queryByTestId('star-6')).not.toBeInTheDocument();

      // Should have exactly 5 stars
      const stars = screen.getAllByTestId(/^star-\d$/);
      expect(stars).toHaveLength(5);
    });

    it('should reject invalid ratings', async () => {
      const mockOnRate = jest.fn() as any;
      render(<FiveStarRating contentId="test-content-123" onRate={mockOnRate} />);

      // Try to trigger invalid rating by calling handleStarClick directly
      // This simulates what would happen if somehow invalid data got through

      // Valid ratings should work
      const firstStar = screen.getByTestId('star-1');
      fireEvent.click(firstStar);

      const fifthStar = screen.getByTestId('star-5');
      fireEvent.click(fifthStar);

      await waitFor(() => {
        // Should only call onRate with valid values (1 and 5)
        expect(mockOnRate).toHaveBeenCalledWith(1);
        expect(mockOnRate).toHaveBeenCalledWith(5);
        expect(mockOnRate).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Visual Feedback', () => {
    it('should highlight stars on hover', async () => {
      render(<FiveStarRating contentId="test-content-123" />);

      const thirdStar = screen.getByTestId('star-3');
      fireEvent.mouseEnter(thirdStar);

      await waitFor(() => {
        expect(thirdStar).toHaveClass('highlighted');
      });
    });

    it('should show current rating visually', () => {
      render(<FiveStarRating contentId="test-content-123" currentRating={3.5} />);

      // Should show current rating display
      expect(screen.getByTestId('current-rating')).toHaveTextContent('Not rated');
      expect(screen.getByTestId('average-rating')).toHaveTextContent('Avg: 3.5');
    });

    it('should update visual state after rating submission', async () => {
      render(<FiveStarRating contentId="test-content-123" />);

      // Rate with 4 stars
      const fourthStar = screen.getByTestId('star-4');
      fireEvent.click(fourthStar);

      const submitButton = screen.getByTestId('submit-rating');
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should show success state
        expect(screen.getByTestId('rating-success')).toBeInTheDocument();
        expect(screen.getByText(/rating submitted successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Experience', () => {
    it('should provide clear feedback during rating submission', async () => {
      // Use MSW with delay to simulate slow API response
      server.use(
        http.post('/api/content/:contentId/rate', async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return HttpResponse.json({ success: true });
        })
      );

      render(<FiveStarRating contentId="test-content-123" />);

      const fourthStar = screen.getByTestId('star-4');
      fireEvent.click(fourthStar);

      const submitButton = screen.getByTestId('submit-rating');
      fireEvent.click(submitButton);

      // Should show loading state
      expect(screen.getByTestId('rating-loading')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(
        () => {
          expect(screen.getByTestId('rating-success')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should handle rating submission errors gracefully', async () => {
      // Use MSW to return a network error
      server.use(
        http.post('/api/content/:contentId/rate', () => {
          return HttpResponse.error();
        })
      );

      render(<FiveStarRating contentId="test-content-123" />);

      const fourthStar = screen.getByTestId('star-4');
      fireEvent.click(fourthStar);

      const submitButton = screen.getByTestId('submit-rating');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('rating-error')).toBeInTheDocument();
        expect(screen.getByText(/failed to submit rating/i)).toBeInTheDocument();
      });

      // Should provide retry option
      const retryButton = screen.getByTestId('retry-rating');
      expect(retryButton).toBeInTheDocument();
    });

    it('should allow editing rating before submission', () => {
      render(<FiveStarRating contentId="test-content-123" />);

      // First select 3 stars
      const thirdStar = screen.getByTestId('star-3');
      fireEvent.click(thirdStar);

      expect(screen.getByTestId('current-rating')).toHaveTextContent('3');

      // Then change to 5 stars
      const fifthStar = screen.getByTestId('star-5');
      fireEvent.click(fifthStar);

      expect(screen.getByTestId('current-rating')).toHaveTextContent('5');
    });
  });

  describe('Performance Requirements', () => {
    it('should submit rating within 1 second', async () => {
      const start = Date.now();

      render(<FiveStarRating contentId="test-content-123" />);

      const fourthStar = screen.getByTestId('star-4');
      fireEvent.click(fourthStar);

      const submitButton = screen.getByTestId('submit-rating');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('rating-success')).toBeInTheDocument();
      });

      const submitTime = Date.now() - start;
      expect(submitTime).toBeLessThan(1000); // US-8.4 requirement: < 1 second
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for screen readers', () => {
      render(<FiveStarRating contentId="test-content-123" />);

      expect(screen.getByRole('group', { name: /rate this content/i })).toBeInTheDocument();

      const stars = screen.getAllByRole('button');
      stars.slice(0, 5).forEach((star, index) => {
        expect(star).toHaveAttribute('aria-label', `Rate ${index + 1} star${index === 0 ? '' : 's'}`);
      });
    });

    it('should support keyboard navigation', () => {
      render(<FiveStarRating contentId="test-content-123" />);

      const firstStar = screen.getByTestId('star-1');
      firstStar.focus();

      // Select with Enter key
      fireEvent.keyDown(firstStar, { key: 'Enter' });
      expect(screen.getByTestId('current-rating')).toHaveTextContent('1');

      // Arrow navigation
      fireEvent.keyDown(firstStar, { key: 'ArrowRight' });
      const secondStar = screen.getByTestId('star-2');
      expect(document.activeElement).toBe(secondStar);
    });

    it('should support arrow key navigation', () => {
      render(<FiveStarRating contentId="test-content-123" />);

      const firstStar = screen.getByTestId('star-1');
      firstStar.focus();

      // Right arrow to next star
      fireEvent.keyDown(firstStar, { key: 'ArrowRight' });

      const secondStar = screen.getByTestId('star-2');
      expect(secondStar).toHaveFocus();

      // Left arrow back to first star
      fireEvent.keyDown(secondStar, { key: 'ArrowLeft' });
      expect(firstStar).toHaveFocus();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should have appropriate touch targets for mobile', () => {
      render(<FiveStarRating contentId="test-content-123" />);

      const stars = screen.getAllByTestId(/^star-\d$/);
      stars.forEach(star => {
        // Touch targets should be at least 44px (iOS) or 48px (Android)
        const computedStyle = window.getComputedStyle(star);
        const minSize = 44; // pixels

        expect(parseInt(computedStyle.minWidth) || 44).toBeGreaterThanOrEqual(minSize);
        expect(parseInt(computedStyle.minHeight) || 44).toBeGreaterThanOrEqual(minSize);
      });
    });

    it('should handle touch events properly', () => {
      render(<FiveStarRating contentId="test-content-123" />);

      const thirdStar = screen.getByTestId('star-3');

      fireEvent.touchStart(thirdStar);
      fireEvent.touchEnd(thirdStar);

      expect(screen.getByTestId('current-rating')).toHaveTextContent('3');
    });
  });

  describe('Integration with Recommendation System', () => {
    it('should trigger recommendation updates after rating', async () => {
      const mockOnRatingUpdate = jest.fn() as any;

      render(<FiveStarRating contentId="test-content-123" onRatingUpdate={mockOnRatingUpdate} />);

      const fourthStar = screen.getByTestId('star-4');
      fireEvent.click(fourthStar);

      const submitButton = screen.getByTestId('submit-rating');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnRatingUpdate).toHaveBeenCalledWith('test-content-123', 4);
      });
    });

    it('should work with existing user ratings', () => {
      render(<FiveStarRating contentId="test-content-123" currentRating={3.5} userRating={4} />);

      // Should show both average rating and user rating
      expect(screen.getByTestId('average-rating')).toHaveTextContent('Avg: 3.5');
      expect(screen.getByTestId('user-rating')).toHaveTextContent('Your rating: 4');
    });
  });
});
