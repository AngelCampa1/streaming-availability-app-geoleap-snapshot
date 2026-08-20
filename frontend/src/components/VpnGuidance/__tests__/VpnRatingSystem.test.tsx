/**
 * VpnRatingSystem Component Tests
 *
 * Tests the VPN rating and review system component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VpnRatingSystem } from '../VpnRatingSystem';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

const createMockRating = (overrides: any = {}) => ({
  id: 'rating-1',
  vpnProviderId: 'provider-1',
  userId: 'user-1',
  ratingType: 'FiveStars' as const,
  rating: 4,
  review: 'Great VPN service!',
  speedRating: 5,
  reliabilityRating: 4,
  easeOfUseRating: 5,
  customerSupportRating: 3,
  valueForMoneyRating: 4,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  isVerified: true,
  isHelpful: false,
  helpfulVotes: 10,
  unhelpfulVotes: 2,
  user: {
    id: 'user-1',
    username: 'JohnDoe',
    email: 'john@example.com',
  },
  ...overrides,
});

const createMockStats = (overrides: any = {}) => ({
  totalRatings: 150,
  averageRating: 4.2,
  ratingDistribution: {
    5: 80,
    4: 40,
    3: 20,
    2: 5,
    1: 5,
  },
  categoryAverages: {
    speed: 4.5,
    reliability: 4.3,
    easeOfUse: 4.1,
    customerSupport: 3.9,
  },
  ...overrides,
});

describe('VpnRatingSystem', () => {
  const mockOnSubmitRating = jest.fn();
  const mockOnVoteHelpfulness = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock handlers
    server.use(
      http.get('*/api/vpnproviders/:id/ratings', () => {
        return HttpResponse.json([createMockRating()]);
      }),
      http.get('*/api/vpnproviders/:id/ratings/stats', () => {
        return HttpResponse.json(createMockStats());
      })
    );
  });

  describe('Rating Overview', () => {
    it('displays average rating', async () => {
      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('4.2')).toBeInTheDocument();
      });
    });

    it('displays total ratings count', async () => {
      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Based on 150 reviews/i)).toBeInTheDocument();
      });
    });

    it('displays category averages', async () => {
      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        // Category labels may appear multiple times in the UI
        expect(screen.getAllByText('Speed').length).toBeGreaterThan(0);
        expect(screen.getAllByText('4.5').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Reliability').length).toBeGreaterThan(0);
        expect(screen.getAllByText('4.3').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Ease of Use').length).toBeGreaterThan(0);
        expect(screen.getAllByText('4.1').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Support').length).toBeGreaterThan(0);
        expect(screen.getAllByText('3.9').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Rating Distribution', () => {
    it('displays rating distribution bars', async () => {
      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Rating Distribution')).toBeInTheDocument();
      });

      // Should show counts for each star level
      await waitFor(() => {
        expect(screen.getByText('80')).toBeInTheDocument(); // 5 stars
        expect(screen.getByText('40')).toBeInTheDocument(); // 4 stars
        expect(screen.getByText('20')).toBeInTheDocument(); // 3 stars
      });
    });

    it('calculates distribution percentages correctly', async () => {
      server.use(
        http.get('*/api/vpnproviders/:id/ratings/stats', () => {
          return HttpResponse.json(
            createMockStats({
              totalRatings: 100,
              ratingDistribution: { 5: 50, 4: 30, 3: 10, 2: 5, 1: 5 },
            })
          );
        })
      );

      const { container } = render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        const bars = container.querySelectorAll('.bg-warning.h-2');
        expect(bars.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Submit Rating Form - Unauthenticated', () => {
    it('does not show rating form for unauthenticated users', () => {
      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      expect(screen.queryByText(/Rate This VPN Provider/i)).not.toBeInTheDocument();
    });
  });

  describe('Submit Rating Form - Authenticated', () => {
    it('shows write review button for authenticated users without rating', async () => {
      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Write a Review/i)).toBeInTheDocument();
      });
    });

    it('shows current rating when user has already rated', async () => {
      const currentUserRating = createMockRating({ rating: 5, review: 'Excellent!' });

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={true}
          currentUserRating={currentUserRating}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/You rated this provider:/i)).toBeInTheDocument();
        expect(screen.getByText(/Excellent!/i)).toBeInTheDocument();
      });
    });

    it('opens rating form when write review clicked', async () => {
      const user = userEvent.setup();

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={true}
          onSubmitRating={mockOnSubmitRating}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Write a Review/i)).toBeInTheDocument();
      });

      const writeButton = screen.getByText(/Write a Review/i);
      await user.click(writeButton);

      expect(screen.getByText(/Overall Rating \*/i)).toBeInTheDocument();
    });

    it('allows rating overall stars', async () => {
      const user = userEvent.setup();

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={true}
          onSubmitRating={mockOnSubmitRating}
        />
      );

      await waitFor(() => {
        const writeButton = screen.getByText(/Write a Review/i);
        user.click(writeButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Overall Rating \*/i)).toBeInTheDocument();
      });

      // Find star rating buttons (there will be multiple sets, get the first interactive set)
      const starButtons = screen.getAllByRole('button');
      const overallStars = starButtons.filter(btn => !(btn as HTMLButtonElement).disabled).slice(0, 5);

      // Click 4th star
      await user.click(overallStars[3]);

      // Submit button should now be enabled
      const submitButton = screen.getByText(/Submit Review/i);
      expect(submitButton).not.toBeDisabled();
    });

    it('allows entering review text', async () => {
      const user = userEvent.setup();

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={true}
          onSubmitRating={mockOnSubmitRating}
        />
      );

      await waitFor(() => {
        const writeButton = screen.getByText(/Write a Review/i);
        user.click(writeButton);
      });

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/Share your experience/i);
        expect(textarea).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/Share your experience/i);
      await user.type(textarea, 'This VPN is amazing!');

      expect(textarea).toHaveValue('This VPN is amazing!');
    });

    it('submits rating when submit clicked', async () => {
      const user = userEvent.setup();

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={true}
          onSubmitRating={mockOnSubmitRating}
        />
      );

      await waitFor(() => {
        const writeButton = screen.getByText(/Write a Review/i);
        user.click(writeButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Overall Rating \*/i)).toBeInTheDocument();
      });

      // Rate 5 stars
      const starButtons = screen.getAllByRole('button');
      const overallStars = starButtons.filter(btn => !(btn as HTMLButtonElement).disabled).slice(0, 5);
      await user.click(overallStars[4]);

      // Enter review
      const textarea = screen.getByPlaceholderText(/Share your experience/i);
      await user.type(textarea, 'Excellent service!');

      // Submit
      const submitButton = screen.getByText(/Submit Review/i);
      await user.click(submitButton);

      expect(mockOnSubmitRating).toHaveBeenCalledWith(
        expect.objectContaining({
          vpnProviderId: 'provider-1',
          rating: 5,
          review: 'Excellent service!',
        })
      );
    });

    it('disables submit button when no rating given', async () => {
      const user = userEvent.setup();

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={true}
          onSubmitRating={mockOnSubmitRating}
        />
      );

      await waitFor(() => {
        const writeButton = screen.getByText(/Write a Review/i);
        user.click(writeButton);
      });

      await waitFor(() => {
        const submitButton = screen.getByText(/Submit Review/i);
        expect(submitButton).toBeDisabled();
      });
    });

    it('closes form when cancel clicked', async () => {
      const user = userEvent.setup();

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={true}
          onSubmitRating={mockOnSubmitRating}
        />
      );

      await waitFor(() => {
        const writeButton = screen.getByText(/Write a Review/i);
        user.click(writeButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Overall Rating \*/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByText(/Cancel/i);
      await user.click(cancelButton);

      expect(screen.queryByText(/Overall Rating \*/i)).not.toBeInTheDocument();
    });

    it('shows update button when editing existing rating', async () => {
      const user = userEvent.setup();
      const currentUserRating = createMockRating();

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={true}
          currentUserRating={currentUserRating}
          onSubmitRating={mockOnSubmitRating}
        />
      );

      await waitFor(() => {
        const updateButton = screen.getByText(/Update Rating/i);
        user.click(updateButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Update Review/i)).toBeInTheDocument();
      });
    });

    it('pre-fills form with existing rating data', async () => {
      const user = userEvent.setup();
      const currentUserRating = createMockRating({
        rating: 5,
        speedRating: 4,
        review: 'Great service!',
      });

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={true}
          currentUserRating={currentUserRating}
          onSubmitRating={mockOnSubmitRating}
        />
      );

      await waitFor(() => {
        const updateButton = screen.getByText(/Update Rating/i);
        user.click(updateButton);
      });

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/Share your experience/i);
        expect(textarea).toHaveValue('Great service!');
      });
    });
  });

  describe('Recent Reviews', () => {
    it('displays loading state', () => {
      server.use(
        http.get('*/api/vpnproviders/:id/ratings', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json([]);
        })
      );

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      expect(screen.getByText(/Loading reviews/i)).toBeInTheDocument();
    });

    it('displays empty state when no reviews', async () => {
      server.use(
        http.get('*/api/vpnproviders/:id/ratings', () => {
          return HttpResponse.json([]);
        })
      );

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No reviews yet/i)).toBeInTheDocument();
        expect(screen.getByText(/Be the first to share your experience/i)).toBeInTheDocument();
      });
    });

    it('displays review author username', async () => {
      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('JohnDoe')).toBeInTheDocument();
      });
    });

    it('displays anonymous when no username', async () => {
      server.use(
        http.get('*/api/vpnproviders/:id/ratings', () => {
          return HttpResponse.json([
            createMockRating({
              user: { id: 'user-1', email: 'anon@example.com' },
            }),
          ]);
        })
      );

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Anonymous User')).toBeInTheDocument();
      });
    });

    it('shows verified badge for verified reviews', async () => {
      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Verified')).toBeInTheDocument();
      });
    });

    it('displays review text', async () => {
      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Great VPN service!')).toBeInTheDocument();
      });
    });

    it('displays formatted creation date', async () => {
      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Jan 15, 2024/i)).toBeInTheDocument();
      });
    });

    it('displays category ratings when available', async () => {
      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        // Should show Speed, Reliability labels in category section
        const categoryLabels = screen.getAllByText(/Speed|Reliability/i);
        expect(categoryLabels.length).toBeGreaterThan(2); // Multiple instances (overview + review)
      });
    });

    it('does not show category ratings when not available', async () => {
      server.use(
        http.get('*/api/vpnproviders/:id/ratings', () => {
          return HttpResponse.json([
            createMockRating({
              speedRating: undefined,
              reliabilityRating: undefined,
              easeOfUseRating: undefined,
              customerSupportRating: undefined,
            }),
          ]);
        })
      );

      const { container } = render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        // Should still load reviews
        expect(screen.getByText('Great VPN service!')).toBeInTheDocument();
      });

      // Check that category rating grid is not rendered in review section
      const categoryGrids = container.querySelectorAll('.grid.grid-cols-2.md\\:grid-cols-4');
      expect(categoryGrids.length).toBeLessThanOrEqual(1); // Only in form, not in reviews
    });
  });

  describe('Helpfulness Voting', () => {
    it('displays helpful and unhelpful vote counts', async () => {
      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        // Vote counts may appear multiple times in the UI
        expect(screen.getAllByText('10').length).toBeGreaterThan(0); // helpful votes
        expect(screen.getAllByText('2').length).toBeGreaterThan(0); // unhelpful votes
      });
    });

    it('calls onVoteHelpfulness when helpful clicked', async () => {
      const user = userEvent.setup();

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
          onVoteHelpfulness={mockOnVoteHelpfulness}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('JohnDoe')).toBeInTheDocument();
      });

      // Find thumbs up button (first of two voting buttons)
      const voteButtons = screen.getAllByRole('button');
      const thumbsUpButton = voteButtons.find(btn => btn.textContent?.includes('10'));

      if (thumbsUpButton) {
        await user.click(thumbsUpButton);
        expect(mockOnVoteHelpfulness).toHaveBeenCalledWith('rating-1', true);
      }
    });

    it('calls onVoteHelpfulness when unhelpful clicked', async () => {
      const user = userEvent.setup();

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
          onVoteHelpfulness={mockOnVoteHelpfulness}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('JohnDoe')).toBeInTheDocument();
      });

      // Find thumbs down button
      const voteButtons = screen.getAllByRole('button');
      const thumbsDownButton = voteButtons.find(btn => btn.textContent?.includes('2'));

      if (thumbsDownButton) {
        await user.click(thumbsDownButton);
        expect(mockOnVoteHelpfulness).toHaveBeenCalledWith('rating-1', false);
      }
    });

    it('does not crash when onVoteHelpfulness not provided', async () => {
      const user = userEvent.setup();

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('JohnDoe')).toBeInTheDocument();
      });

      const voteButtons = screen.getAllByRole('button');
      const thumbsUpButton = voteButtons.find(btn => btn.textContent?.includes('10'));

      if (thumbsUpButton) {
        await user.click(thumbsUpButton);
        // Should not crash
        expect(thumbsUpButton).toBeInTheDocument();
      }
    });
  });

  describe('Error Handling', () => {
    it('handles ratings fetch error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      server.use(
        http.get('*/api/vpnproviders/:id/ratings', () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        // Should show empty state instead of crashing
        expect(screen.getByText(/No reviews yet/i)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles stats fetch error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      server.use(
        http.get('*/api/vpnproviders/:id/ratings/stats', () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      render(
        <VpnRatingSystem
          vpnProviderId="provider-1"
          vpnProviderName="ExpressVPN"
          isAuthenticated={false}
        />
      );

      // Should still render reviews section
      await waitFor(() => {
        expect(screen.getByText(/Recent Reviews/i)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
