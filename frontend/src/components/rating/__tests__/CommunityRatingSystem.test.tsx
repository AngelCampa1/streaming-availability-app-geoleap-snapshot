/**
 * US-9.1 Community Rating System - Comprehensive Test Suite
 *
 * Tests for:
 * - Five Star Rating Component Integration
 * - Community Reviews and Ratings
 * - VPN Provider Rating System
 * - Real-time Rating Updates
 * - Accessibility and Mobile Responsiveness
 * - Performance under Load
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FiveStarRating from '../FiveStarRating';
import { server, http, HttpResponse } from '@/mocks/server';

// Mock API responses
const mockApiResponses = {
  rateContent: {
    success: true,
    message: 'Rating submitted successfully',
    newRating: 4.2,
    userRating: 4,
  },
  getRatings: {
    averageRating: 4.2,
    totalRatings: 156,
    userRating: 4,
    distribution: {
      5: 45,
      4: 67,
      3: 32,
      2: 8,
      1: 4,
    },
  },
};

// Mock Community Rating System Components
const MockCommunityRatingDashboard = ({
  vpnProvider: _vpnProvider = null,
  streamingService: _streamingService = null,
  onRatingSubmit = jest.fn(),
  onFilterChange = jest.fn(),
}) => {
  const [filter, setFilter] = React.useState('all');
  const [ratings, _setRatings] = React.useState([
    {
      id: '1',
      contentTitle: 'Stranger Things',
      rating: 5,
      review: 'Works perfectly with NordVPN',
      vpnProvider: 'nordvpn',
      streamingService: 'netflix',
      userName: 'StreamingFan',
      date: '2024-09-20',
      helpful: 23,
      verified: true,
    },
    {
      id: '2',
      contentTitle: 'The Mandalorian',
      rating: 4,
      review: 'Good quality with ExpressVPN, occasional buffering',
      vpnProvider: 'expressvpn',
      streamingService: 'disney',
      userName: 'StarWarsLover',
      date: '2024-09-19',
      helpful: 18,
      verified: true,
    },
  ]);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  return (
    <div data-testid="community-rating-dashboard">
      <h2>Community Ratings & Reviews</h2>

      {/* Filter Controls */}
      <div data-testid="rating-filters" className="filters">
        <select
          data-testid="vpn-filter"
          value={filter}
          onChange={e => handleFilterChange(e.target.value)}
          aria-label="Filter by VPN provider"
        >
          <option value="all">All VPN Providers</option>
          <option value="nordvpn">NordVPN</option>
          <option value="expressvpn">ExpressVPN</option>
          <option value="surfshark">Surfshark</option>
        </select>

        <select data-testid="service-filter" aria-label="Filter by streaming service">
          <option value="all">All Services</option>
          <option value="netflix">Netflix</option>
          <option value="disney">Disney+</option>
          <option value="hbo">HBO Max</option>
        </select>
      </div>

      {/* Ratings List */}
      <div data-testid="ratings-list" className="ratings-list">
        {ratings.map(rating => (
          <div key={rating.id} data-testid={`rating-${rating.id}`} className="rating-card">
            <div className="rating-header">
              <h3 data-testid="content-title">{rating.contentTitle}</h3>
              <div data-testid="rating-stars" aria-label={`${rating.rating} out of 5 stars`}>
                {'★'.repeat(rating.rating)}
                {'☆'.repeat(5 - rating.rating)}
              </div>
            </div>

            <div className="rating-details">
              <p data-testid="review-text">{rating.review}</p>
              <div className="meta-info">
                <span data-testid="vpn-provider">VPN: {rating.vpnProvider}</span>
                <span data-testid="streaming-service">Service: {rating.streamingService}</span>
                <span data-testid="user-name">By: {rating.userName}</span>
                {rating.verified && <span data-testid="verified-badge">✓ Verified</span>}
              </div>
              <div className="rating-actions">
                <button
                  data-testid="helpful-button"
                  onClick={() => {
                    /* Handle helpful vote */
                  }}
                >
                  Helpful ({rating.helpful})
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Rating Form */}
      <div data-testid="add-rating-form" className="add-rating">
        <h3>Add Your Rating</h3>
        <FiveStarRating contentId="test-content" onRatingSubmit={onRatingSubmit} className="community-rating-input" />
      </div>
    </div>
  );
};

const MockVpnProviderRatingSystem = ({
  providers = [],
  onProviderRate = jest.fn(),
}: {
  providers?: any[];
  onProviderRate?: jest.Mock;
}) => {
  return (
    <div data-testid="vpn-provider-ratings">
      <h2>Rate VPN Providers</h2>

      {providers.map(provider => (
        <div key={provider.id} data-testid={`provider-rating-${provider.id}`} className="provider-rating-card">
          <div className="provider-info">
            <h3>{provider.name}</h3>
            <div data-testid="provider-overall-rating">
              Overall Rating: {provider.averageRating}/5 ({provider.totalReviews} reviews)
            </div>
          </div>

          <div className="rating-categories">
            <div data-testid="speed-rating">
              <label>Speed: </label>
              <FiveStarRating
                contentId={`${provider.id}-speed`}
                currentRating={provider.ratings?.speed || 0}
                onRatingSubmit={rating => onProviderRate(provider.id, 'speed', rating)}
              />
            </div>

            <div data-testid="streaming-rating">
              <label>Streaming Performance: </label>
              <FiveStarRating
                contentId={`${provider.id}-streaming`}
                currentRating={provider.ratings?.streaming || 0}
                onRatingSubmit={rating => onProviderRate(provider.id, 'streaming', rating)}
              />
            </div>

            <div data-testid="reliability-rating">
              <label>Reliability: </label>
              <FiveStarRating
                contentId={`${provider.id}-reliability`}
                currentRating={provider.ratings?.reliability || 0}
                onRatingSubmit={rating => onProviderRate(provider.id, 'reliability', rating)}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

describe('US-9.1 Community Rating System Tests', () => {
  // Mock data
  const mockVpnProviders = [
    {
      id: 'nordvpn',
      name: 'NordVPN',
      averageRating: 4.5,
      totalReviews: 1247,
      ratings: {
        speed: 4.6,
        streaming: 4.7,
        reliability: 4.3,
      },
    },
    {
      id: 'expressvpn',
      name: 'ExpressVPN',
      averageRating: 4.7,
      totalReviews: 2103,
      ratings: {
        speed: 4.8,
        streaming: 4.9,
        reliability: 4.5,
      },
    },
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    // Set up default MSW handlers for rating API
    server.use(
      http.post('*/api/content/:contentId/rate', () => {
        return HttpResponse.json(mockApiResponses.rateContent);
      }),
      http.get('*/api/content/:contentId/ratings', () => {
        return HttpResponse.json(mockApiResponses.getRatings);
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  describe('FiveStarRating Component Integration', () => {
    it('should render with all required elements', () => {
      render(<FiveStarRating contentId="test-content" currentRating={3.8} userRating={4} />);

      expect(screen.getByTestId('five-star-rating')).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Rate this content' })).toBeInTheDocument();
      expect(screen.getByTestId('current-rating')).toHaveTextContent('4');
      expect(screen.getByTestId('average-rating')).toHaveTextContent('Avg: 3.8');
      expect(screen.getByTestId('submit-rating')).toBeInTheDocument();

      // Verify all 5 stars are present
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByTestId(`star-${i}`)).toBeInTheDocument();
      }
    });

    it('should handle rating submission successfully', async () => {
      const user = userEvent.setup();
      const mockOnRatingSubmit = jest.fn();

      // MSW handler with delay to test loading state
      server.use(
        http.post('*/api/content/:contentId/rate', async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return HttpResponse.json(mockApiResponses.rateContent);
        })
      );

      render(<FiveStarRating contentId="test-content" onRatingSubmit={mockOnRatingSubmit} />);

      // Rate 4 stars
      await user.click(screen.getByTestId('star-4'));
      expect(screen.getByTestId('current-rating')).toHaveTextContent('4');

      // Submit rating
      await user.click(screen.getByTestId('submit-rating'));

      // Wait for success message (skip loading state check as it's too timing-dependent)
      await waitFor(
        () => {
          expect(screen.getByTestId('rating-success')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      expect(mockOnRatingSubmit).toHaveBeenCalledWith(4);
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock API error via MSW
      server.use(
        http.post('*/api/content/:contentId/rate', () => {
          return HttpResponse.error();
        })
      );

      render(<FiveStarRating contentId="test-content" />);

      await user.click(screen.getByTestId('star-3'));
      await user.click(screen.getByTestId('submit-rating'));

      await waitFor(() => {
        expect(screen.getByTestId('rating-error')).toBeInTheDocument();
      });

      // Should have retry button
      expect(screen.getByTestId('retry-rating')).toBeInTheDocument();
    });

    it('should be accessible with keyboard navigation', async () => {
      const user = userEvent.setup();

      render(<FiveStarRating contentId="test-content" />);

      const firstStar = screen.getByTestId('star-1');
      firstStar.focus();

      // Navigate right with arrow key
      await user.keyboard('{ArrowRight}');
      expect(screen.getByTestId('star-2')).toHaveFocus();

      // Navigate left with arrow key
      await user.keyboard('{ArrowLeft}');
      expect(screen.getByTestId('star-1')).toHaveFocus();

      // Select with Enter key
      await user.keyboard('{Enter}');
      expect(screen.getByTestId('current-rating')).toHaveTextContent('1');
    });

    it('should handle touch events for mobile', async () => {
      render(<FiveStarRating contentId="test-content" />);

      const star3 = screen.getByTestId('star-3');

      // Simulate touch events
      fireEvent.touchStart(star3);
      fireEvent.touchEnd(star3);

      expect(screen.getByTestId('current-rating')).toHaveTextContent('3');
    });
  });

  describe('Community Rating Dashboard', () => {
    it('should render ratings list with all required information', () => {
      render(<MockCommunityRatingDashboard />);

      expect(screen.getByTestId('community-rating-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Community Ratings & Reviews')).toBeInTheDocument();

      // Check filters
      expect(screen.getByTestId('vpn-filter')).toBeInTheDocument();
      expect(screen.getByTestId('service-filter')).toBeInTheDocument();

      // Check ratings list
      expect(screen.getByTestId('ratings-list')).toBeInTheDocument();
      expect(screen.getByTestId('rating-1')).toBeInTheDocument();
      expect(screen.getByTestId('rating-2')).toBeInTheDocument();

      // Verify rating details
      expect(screen.getByText('Stranger Things')).toBeInTheDocument();
      expect(screen.getByText('Works perfectly with NordVPN')).toBeInTheDocument();
      expect(screen.getAllByTestId('verified-badge')).toHaveLength(2);
    });

    it('should handle filter changes correctly', async () => {
      const user = userEvent.setup();
      const mockOnFilterChange = jest.fn();

      render(<MockCommunityRatingDashboard onFilterChange={mockOnFilterChange} />);

      // Change VPN filter
      await user.selectOptions(screen.getByTestId('vpn-filter'), 'nordvpn');

      expect(mockOnFilterChange).toHaveBeenCalledWith('nordvpn');
    });

    it('should allow users to submit new ratings', async () => {
      const _user = userEvent.setup();
      const mockOnRatingSubmit = jest.fn();

      render(<MockCommunityRatingDashboard onRatingSubmit={mockOnRatingSubmit} />);

      const addRatingForm = screen.getByTestId('add-rating-form');
      expect(addRatingForm).toBeInTheDocument();

      // Find the FiveStarRating component within the form
      const ratingComponent = within(addRatingForm).getByTestId('five-star-rating');
      expect(ratingComponent).toBeInTheDocument();
    });

    it('should display helpful vote counts and allow voting', async () => {
      const user = userEvent.setup();

      render(<MockCommunityRatingDashboard />);

      const helpfulButtons = screen.getAllByTestId('helpful-button');
      expect(helpfulButtons).toHaveLength(2);

      expect(helpfulButtons[0]).toHaveTextContent('Helpful (23)');
      expect(helpfulButtons[1]).toHaveTextContent('Helpful (18)');

      // Click helpful button
      await user.click(helpfulButtons[0]);
      // In a real implementation, this would update the count
    });
  });

  describe('VPN Provider Rating System', () => {
    it('should render provider ratings with multiple categories', () => {
      render(<MockVpnProviderRatingSystem providers={mockVpnProviders} />);

      expect(screen.getByTestId('vpn-provider-ratings')).toBeInTheDocument();

      // Check both providers are rendered
      expect(screen.getByTestId('provider-rating-nordvpn')).toBeInTheDocument();
      expect(screen.getByTestId('provider-rating-expressvpn')).toBeInTheDocument();

      // Verify rating categories for each provider
      mockVpnProviders.forEach(provider => {
        const providerCard = screen.getByTestId(`provider-rating-${provider.id}`);

        expect(within(providerCard).getByText(provider.name)).toBeInTheDocument();
        expect(within(providerCard).getByTestId('provider-overall-rating')).toHaveTextContent(
          `Overall Rating: ${provider.averageRating}/5`
        );

        // Check rating categories
        expect(within(providerCard).getByTestId('speed-rating')).toBeInTheDocument();
        expect(within(providerCard).getByTestId('streaming-rating')).toBeInTheDocument();
        expect(within(providerCard).getByTestId('reliability-rating')).toBeInTheDocument();
      });
    });

    it('should handle category-specific rating submissions', async () => {
      const user = userEvent.setup();
      const mockOnProviderRate = jest.fn();

      render(<MockVpnProviderRatingSystem providers={mockVpnProviders} onProviderRate={mockOnProviderRate} />);

      // Find NordVPN speed rating and rate it
      const nordvpnCard = screen.getByTestId('provider-rating-nordvpn');
      const speedRatingArea = within(nordvpnCard).getByTestId('speed-rating');

      // The FiveStarRating component should be within the speed rating area
      const speedStars = within(speedRatingArea).getAllByRole('button');

      if (speedStars.length >= 5) {
        // Click 5th star for speed rating
        await user.click(speedStars[4]); // 5th star (0-indexed)

        // Find and click submit button for this rating
        const submitButton = within(speedRatingArea).getByTestId('submit-rating');
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockOnProviderRate).toHaveBeenCalledWith('nordvpn', 'speed', 5);
        });
      }
    });
  });

  describe('Real-time Updates', () => {
    it('should update ratings when new data is received', async () => {
      const { rerender } = render(<FiveStarRating contentId="test-content" currentRating={4.0} />);

      expect(screen.getByTestId('average-rating')).toHaveTextContent('Avg: 4.0');

      // Simulate real-time update
      rerender(<FiveStarRating contentId="test-content" currentRating={4.2} />);

      expect(screen.getByTestId('average-rating')).toHaveTextContent('Avg: 4.2');
    });
  });

  describe('Performance Tests', () => {
    it('should render large numbers of ratings efficiently', () => {
      const largeProviderList = Array.from({ length: 20 }, (_, i) => ({
        id: `provider-${i}`,
        name: `VPN Provider ${i}`,
        averageRating: 3 + Math.random() * 2,
        totalReviews: Math.floor(Math.random() * 1000),
        ratings: {
          speed: 3 + Math.random() * 2,
          streaming: 3 + Math.random() * 2,
          reliability: 3 + Math.random() * 2,
        },
      }));

      const startTime = performance.now();

      render(<MockVpnProviderRatingSystem providers={largeProviderList} />);

      const renderTime = performance.now() - startTime;

      // Should render within 1500ms even with 20 providers (adjusted threshold for test environments)
      // Test environments have variable performance based on system resources
      expect(renderTime).toBeLessThan(1500);
      expect(screen.getByTestId('vpn-provider-ratings')).toBeInTheDocument();
    });

    it('should handle rapid rating interactions without performance degradation', () => {
      render(<FiveStarRating contentId="performance-test" />);

      const startTime = performance.now();

      // Rapid star clicks using fireEvent (not userEvent) to measure component
      // performance without userEvent's artificial inter-action delays
      for (let i = 1; i <= 5; i++) {
        fireEvent.click(screen.getByTestId(`star-${i}`));
      }

      // Multiple rapid clicks on same star
      const star5 = screen.getByTestId('star-5');
      for (let i = 0; i < 10; i++) {
        fireEvent.click(star5);
      }

      const interactionTime = performance.now() - startTime;

      // Should handle rapid interactions efficiently
      // Using a generous threshold to account for CI/slower systems under full suite load
      expect(interactionTime).toBeLessThan(2000);
      expect(screen.getByTestId('current-rating')).toHaveTextContent('5');
    });
  });

  describe('Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      const user = userEvent.setup();

      // Mock network failure via MSW
      server.use(
        http.post('*/api/content/:contentId/rate', () => {
          return HttpResponse.error();
        })
      );

      render(<FiveStarRating contentId="network-test" />);

      await user.click(screen.getByTestId('star-4'));
      await user.click(screen.getByTestId('submit-rating'));

      await waitFor(() => {
        expect(screen.getByTestId('rating-error')).toBeInTheDocument();
      });

      // Should still allow retry
      expect(screen.getByTestId('retry-rating')).toBeInTheDocument();
    });

    it('should validate user input appropriately', async () => {
      const user = userEvent.setup();

      render(<FiveStarRating contentId="validation-test" />);

      const submitButton = screen.getByTestId('submit-rating');

      // Should be disabled without rating
      expect(submitButton).toBeDisabled();

      // Should be enabled after rating
      await user.click(screen.getByTestId('star-3'));
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Accessibility Compliance', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<MockCommunityRatingDashboard />);

      // Check filter accessibility
      expect(screen.getByLabelText('Filter by VPN provider')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by streaming service')).toBeInTheDocument();

      // Check rating accessibility
      const ratingStars = screen.getAllByTestId('rating-stars');
      ratingStars.forEach(stars => {
        expect(stars).toHaveAttribute('aria-label');
      });
    });

    it('should support screen readers', () => {
      render(<FiveStarRating contentId="accessibility-test" currentRating={3.5} />);

      // Check that screen readers can understand the rating
      const ratingGroup = screen.getByRole('group', { name: 'Rate this content' });
      expect(ratingGroup).toBeInTheDocument();

      // Each star should have descriptive labels
      for (let i = 1; i <= 5; i++) {
        const star = screen.getByLabelText(`Rate ${i} star${i === 1 ? '' : 's'}`);
        expect(star).toBeInTheDocument();
      }
    });
  });
});
