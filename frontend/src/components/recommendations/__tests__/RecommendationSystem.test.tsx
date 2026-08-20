import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecommendationSystem } from '../RecommendationSystem';
import { RecommendationProvider } from '../../../contexts/RecommendationContext';
import { server, http, HttpResponse } from '@/mocks/server';

// Use MSW for network-level API mocking instead of jest.mock(fetch)

const mockRecommendations = [
  {
    id: '1',
    contentId: 'movie-123',
    contentType: 'movie' as const,
    title: 'Test Movie 1',
    description: 'A great test movie',
    poster: '/test-poster-1.jpg',
    rating: 8.5,
    genres: ['Action', 'Drama'],
    reasonCodes: ['trending', 'high_rated'],
    personalizedScore: 9.2,
    timestamp: new Date().toISOString(),
  },
  {
    id: '2',
    contentId: 'tv-456',
    contentType: 'show' as const,
    title: 'Test Show 1',
    description: 'An amazing test show',
    poster: '/test-poster-2.jpg',
    rating: 7.8,
    genres: ['Comedy', 'Romance'],
    reasonCodes: ['similar_taste', 'genre_match'],
    personalizedScore: 8.7,
    timestamp: new Date().toISOString(),
  },
];

const MockRecommendationSystem = (props: any) => (
  <RecommendationProvider>
    <RecommendationSystem {...props} />
  </RecommendationProvider>
);

describe('RecommendationSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Add default recommendation handlers using MSW
    server.use(
      http.get('/api/recommendations', () => {
        return HttpResponse.json({ recommendations: mockRecommendations });
      }),
      http.get('/api/recommendations/trending', () => {
        return HttpResponse.json({ recommendations: mockRecommendations });
      }),
      http.post('/api/content/:contentId/rate', () => {
        return HttpResponse.json({ success: true });
      }),
      http.post('/api/recommendations/:id/dismiss', () => {
        return HttpResponse.json({ success: true });
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('US-8.4 Core Requirements', () => {
    it('should display trending recommendations', async () => {
      render(<MockRecommendationSystem />);

      await waitFor(() => {
        expect(screen.getByText('Trending Now')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getAllByText('Test Movie 1').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Test Show 1').length).toBeGreaterThan(0);
      });
    });

    it('should display similar content recommendations', async () => {
      render(<MockRecommendationSystem />);

      await waitFor(() => {
        expect(screen.getByText('Similar to Your Watchlist')).toBeInTheDocument();
      });
    });

    it('should display genre-based recommendations', async () => {
      render(<MockRecommendationSystem />);

      await waitFor(() => {
        expect(screen.getAllByText('Action').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Comedy').length).toBeGreaterThan(0);
      });
    });

    it('should show recommendation categories', async () => {
      render(<MockRecommendationSystem />);

      await waitFor(() => {
        // US-8.4 requirement: organized in simple categories
        expect(screen.getByText('Trending Now')).toBeInTheDocument();
        expect(screen.getByText('Similar to Your Watchlist')).toBeInTheDocument();
      });
    });
  });

  describe('5-Star Rating System', () => {
    it('should display rating stars for content', async () => {
      render(<MockRecommendationSystem />);

      await waitFor(() => {
        // Should show star ratings for content
        const stars = screen.getAllByTestId(/star-rating/);
        expect(stars.length).toBeGreaterThan(0);
      });
    });

    it('should allow users to rate content with 5-star system', async () => {
      const mockRatingSubmit = jest.fn() as any;
      let capturedRating: { rating?: number } | null = null;

      // Use MSW to capture the rating request
      server.use(
        http.post('/api/content/:contentId/rate', async ({ request }) => {
          capturedRating = await request.json() as { rating?: number };
          return HttpResponse.json({ success: true });
        })
      );

      render(<MockRecommendationSystem onRateContent={mockRatingSubmit} />);

      await waitFor(() => {
        const ratingButton = screen.getAllByTestId(/rate-content-movie-123/)[0];
        fireEvent.click(ratingButton);
      });

      // Should open rating modal/interface
      await waitFor(() => {
        expect(screen.getByTestId('rating-interface')).toBeInTheDocument();
      });

      // Rate with 4 stars
      const fourthStar = screen.getByTestId('star-4');
      fireEvent.click(fourthStar);

      const submitButton = screen.getByTestId('submit-rating');
      fireEvent.click(submitButton);

      // Verify rating was captured correctly
      await waitFor(() => {
        expect(capturedRating).toEqual({ rating: 4 });
      });
    });

    it('should validate rating is between 1-5 stars', async () => {
      render(<MockRecommendationSystem />);

      await waitFor(() => {
        const ratingButton = screen.getAllByTestId(/rate-content-movie-123/)[0];
        fireEvent.click(ratingButton);
      });

      // Should not allow rating below 1 or above 5
      const stars = screen.getAllByTestId(/star-\d/);
      expect(stars).toHaveLength(5); // Exactly 5 stars
    });
  });

  describe('User Interaction Features', () => {
    it('should allow dismissing individual recommendations', async () => {
      let dismissCalled = false;
      let dismissedId: string | null = null;

      // Use MSW to capture dismiss request
      server.use(
        http.post('/api/recommendations/:id/dismiss', ({ params }) => {
          dismissCalled = true;
          dismissedId = params.id as string;
          return HttpResponse.json({ success: true });
        })
      );

      render(<MockRecommendationSystem />);

      await waitFor(() => {
        const dismissButton = screen.getAllByTestId(/dismiss-recommendation-1/)[0];
        fireEvent.click(dismissButton);
      });

      // Verify dismiss was called with correct ID
      await waitFor(() => {
        expect(dismissCalled).toBe(true);
        expect(dismissedId).toBe('1');
      });
    });

    it('should have recommendation settings to enable/disable categories', async () => {
      render(<MockRecommendationSystem />);

      await waitFor(() => {
        const settingsButton = screen.getByTestId('recommendation-settings');
        fireEvent.click(settingsButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('toggle-trending')).toBeInTheDocument();
        expect(screen.getByTestId('toggle-similar')).toBeInTheDocument();
        expect(screen.getByTestId('toggle-genre-based')).toBeInTheDocument();
      });
    });

    it('should respect recommendation settings', async () => {
      const mockSettings = {
        enableTrending: false,
        enableSimilar: true,
        enableGenreBased: true,
      };

      render(<MockRecommendationSystem initialSettings={mockSettings} />);

      await waitFor(() => {
        // Trending should be hidden when disabled
        expect(screen.queryByText('Trending Now')).not.toBeInTheDocument();
        // Similar should be shown when enabled
        expect(screen.getByText('Similar to Your Watchlist')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should load recommendations within 3 seconds', async () => {
      const start = Date.now();

      render(<MockRecommendationSystem />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Movie 1').length).toBeGreaterThan(0);
      });

      const loadTime = Date.now() - start;
      expect(loadTime).toBeLessThan(3000); // US-8.4 requirement: < 3 seconds
    });

    it('should handle loading states gracefully', async () => {
      // Use MSW to simulate slow API response
      server.use(
        http.get('/api/recommendations', async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return HttpResponse.json({ recommendations: mockRecommendations });
        }),
        http.get('/api/recommendations/trending', async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return HttpResponse.json({ recommendations: mockRecommendations });
        })
      );

      render(<MockRecommendationSystem />);

      // Should show loading state
      expect(screen.getByTestId('recommendations-loading')).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.getAllByText('Test Movie 1').length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Loading state should be gone
      expect(screen.queryByTestId('recommendations-loading')).not.toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render properly on mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<MockRecommendationSystem />);

      await waitFor(() => {
        const container = screen.getByTestId('recommendations-container');
        expect(container).toHaveClass('mobile-responsive');
      });
    });

    it('should handle touch interactions on mobile', async () => {
      const mockTouch = {
        identifier: 1,
        target: null,
        clientX: 100,
        clientY: 100,
        radiusX: 2.5,
        radiusY: 2.5,
        rotationAngle: 10,
        force: 0.5,
      };

      render(<MockRecommendationSystem />);

      await waitFor(() => {
        const recommendationCard = screen.getAllByTestId(/trending-recommendation-card-1/)[0];
        fireEvent.touchStart(recommendationCard, {
          touches: [mockTouch],
        });
        fireEvent.touchEnd(recommendationCard, {
          changedTouches: [mockTouch],
        });
      });

      // Should handle touch events without errors
      expect(screen.getAllByTestId(/trending-recommendation-card-1/)[0]).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Use MSW to return network error
      server.use(
        http.get('/api/recommendations', () => {
          return HttpResponse.error();
        }),
        http.get('/api/recommendations/trending', () => {
          return HttpResponse.error();
        })
      );

      render(<MockRecommendationSystem />);

      await waitFor(() => {
        expect(screen.getByTestId('recommendations-error')).toBeInTheDocument();
        expect(screen.getByText(/failed to load recommendations/i)).toBeInTheDocument();
      });
    });

    it('should handle network failures', async () => {
      // Use MSW to return 500 error
      server.use(
        http.get('/api/recommendations', () => {
          return HttpResponse.json({}, { status: 500, statusText: 'Internal Server Error' });
        }),
        http.get('/api/recommendations/trending', () => {
          return HttpResponse.json({}, { status: 500, statusText: 'Internal Server Error' });
        })
      );

      render(<MockRecommendationSystem />);

      await waitFor(() => {
        expect(screen.getByTestId('recommendations-error')).toBeInTheDocument();
      });
    });

    it('should provide retry functionality', async () => {
      let recommendationsAttempts = 0;
      let trendingAttempts = 0;

      // Use MSW to fail first attempt, succeed on retry
      server.use(
        http.get('/api/recommendations', () => {
          recommendationsAttempts++;
          if (recommendationsAttempts === 1) {
            return HttpResponse.error();
          }
          return HttpResponse.json({ recommendations: mockRecommendations });
        }),
        http.get('/api/recommendations/trending', () => {
          trendingAttempts++;
          if (trendingAttempts === 1) {
            return HttpResponse.error();
          }
          return HttpResponse.json({ recommendations: mockRecommendations });
        })
      );

      render(<MockRecommendationSystem />);

      await waitFor(() => {
        expect(screen.getByTestId('recommendations-error')).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId('retry-recommendations');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getAllByText('Test Movie 1').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for screen readers', async () => {
      render(<MockRecommendationSystem />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: /recommendations/i })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /rate this content/i })[0]).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /dismiss recommendation/i })[0]).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<MockRecommendationSystem />);

      await waitFor(() => {
        const recommendationCard = screen.getAllByTestId(/trending-recommendation-card-1/)[0];
        recommendationCard.focus();

        fireEvent.keyDown(recommendationCard, {
          key: 'Enter',
          code: 'Enter',
          charCode: 13,
        });
      });

      // Should handle keyboard interaction
      expect(screen.getAllByTestId(/trending-recommendation-card-1/)[0]).toHaveFocus();
    });
  });

  describe('Caching and Performance', () => {
    it('should cache recommendation data', async () => {
      let apiCallCount = 0;

      // Use MSW to track API calls
      server.use(
        http.get('/api/recommendations', () => {
          apiCallCount++;
          return HttpResponse.json({ recommendations: mockRecommendations });
        }),
        http.get('/api/recommendations/trending', () => {
          return HttpResponse.json({ recommendations: mockRecommendations });
        })
      );

      const { rerender } = render(<MockRecommendationSystem />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Movie 1').length).toBeGreaterThan(0);
      });

      const initialCallCount = apiCallCount;

      // Re-render should use cache (within cache period)
      rerender(<MockRecommendationSystem />);

      // Allow time for potential additional calls
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not call API again immediately (cache hit)
      expect(apiCallCount).toBe(initialCallCount);
    });
  });

  describe('External API Integration', () => {
    it('should integrate with TMDB for trending content', async () => {
      let trendingCalled = false;

      // Use MSW to track trending API call
      server.use(
        http.get('/api/recommendations/trending', () => {
          trendingCalled = true;
          return HttpResponse.json({ recommendations: mockRecommendations });
        })
      );

      render(<MockRecommendationSystem />);

      // Verify trending API was called
      await waitFor(() => {
        expect(trendingCalled).toBe(true);
      });
    });

    it('should handle TMDB API rate limiting', async () => {
      // Use MSW to simulate rate limiting
      server.use(
        http.get('/api/recommendations', () => {
          return HttpResponse.json(
            { error: 'Rate limited' },
            { status: 429, statusText: 'Too Many Requests' }
          );
        }),
        http.get('/api/recommendations/trending', () => {
          return HttpResponse.json(
            { error: 'Rate limited' },
            { status: 429, statusText: 'Too Many Requests' }
          );
        })
      );

      render(<MockRecommendationSystem />);

      await waitFor(() => {
        expect(screen.getByTestId('recommendations-error')).toBeInTheDocument();
        expect(screen.getByText(/service temporarily unavailable/i)).toBeInTheDocument();
      });
    });
  });
});

// Mock component interfaces for testing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface MockRecommendationSystemProps {
  onRateContent?: (contentId: string, rating: number) => void;
  initialSettings?: {
    enableTrending: boolean;
    enableSimilar: boolean;
    enableGenreBased: boolean;
  };
}
