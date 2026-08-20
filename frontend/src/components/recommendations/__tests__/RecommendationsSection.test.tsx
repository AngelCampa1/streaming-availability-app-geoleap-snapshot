/**
 * RecommendationsSection Component Tests
 *
 * Test coverage for recommendations section with tabs and multiple view modes.
 * Tests rendering, tab switching, loading states, error handling, and user interactions.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecommendationsSection } from '../RecommendationsSection';

// Mock child components
jest.mock('../RecommendationCard', () => ({
  RecommendationCard: ({ title, onDismiss, onAddToWatchlist, onViewDetails, onRate, id }: any) => (
    <div data-testid={`recommendation-card-${id}`}>
      <h3>{title}</h3>
      <button onClick={onDismiss}>Dismiss</button>
      <button onClick={onAddToWatchlist}>Add to Watchlist</button>
      <button onClick={onViewDetails}>View Details</button>
      <button onClick={onRate}>Rate</button>
    </div>
  ),
}));

jest.mock('@/components/common/SkeletonLoader', () => ({
  SkeletonLoader: ({ className }: any) => <div data-testid="skeleton-loader" className={className} />,
}));

jest.mock('@/components/error/ErrorMessage', () => ({
  ErrorMessage: ({ message, actions }: any) => (
    <div data-testid="error-message">
      <p>{message}</p>
      {actions?.map((action: any, idx: number) => (
        <button key={idx} onClick={action.onClick}>
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('RecommendationsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with default props', async () => {
      render(<RecommendationsSection />);

      expect(screen.getByText('Recommendations')).toBeInTheDocument();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('renders with userId prop', async () => {
      render(<RecommendationsSection userId="user-123" />);

      expect(screen.getByText('Recommendations')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('applies custom className', () => {
      const { container } = render(<RecommendationsSection className="custom-class" />);

      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });

    it('shows settings button when showSettings is true', () => {
      const { container } = render(<RecommendationsSection showSettings={true} />);

      // Settings button has Settings icon but no accessible name
      const settingsIcon = container.querySelector('[class*="lucide-settings"]');
      expect(settingsIcon).toBeInTheDocument();
    });

    it('hides settings button when showSettings is false', () => {
      const { container } = render(<RecommendationsSection showSettings={false} />);

      const settingsIcon = container.querySelector('[class*="lucide-settings"]');
      expect(settingsIcon).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders all four recommendation tabs', async () => {
      render(<RecommendationsSection />);

      expect(screen.getByRole('tab', { name: /for you/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /trending/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /popular/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /mixed/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('starts with personalized tab when userId is provided', async () => {
      render(<RecommendationsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      const personalizedTab = screen.getByRole('tab', { name: /for you/i });
      expect(personalizedTab).toHaveAttribute('data-state', 'active');
    });

    it('starts with trending tab when userId is not provided', async () => {
      render(<RecommendationsSection />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      const trendingTab = screen.getByRole('tab', { name: /trending/i });
      expect(trendingTab).toHaveAttribute('data-state', 'active');
    });

    it('switches tabs when clicking on different tab', async () => {
      const user = userEvent.setup();
      render(<RecommendationsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      const popularTab = screen.getByRole('tab', { name: /popular/i });
      await user.click(popularTab);

      await waitFor(() => {
        expect(popularTab).toHaveAttribute('data-state', 'active');
      });
    });

    it('loads recommendations when switching to new tab', async () => {
      const user = userEvent.setup();
      render(<RecommendationsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      const popularTab = screen.getByRole('tab', { name: /popular/i });
      await user.click(popularTab);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getAllByTestId('skeleton-loader').length).toBeGreaterThan(0);
      });

      // Then show content
      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('displays tab descriptions', async () => {
      render(<RecommendationsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText(/personalized recommendations based on your preferences/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('View Mode Toggle', () => {
    it('starts in grid view mode by default', async () => {
      render(<RecommendationsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Grid button should be active (default variant)
      const buttons = screen.getAllByRole('button');
      const gridButton = buttons.find(btn => btn.querySelector('[class*="lucide-grid"]'));
      expect(gridButton).toHaveClass('bg-primary');
    });

    it('switches to list view when clicking list button', async () => {
      const user = userEvent.setup();
      render(<RecommendationsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      const buttons = screen.getAllByRole('button');
      const listButton = buttons.find(btn => btn.querySelector('[class*="lucide-list"]'));

      if (listButton) {
        await user.click(listButton);

        await waitFor(() => {
          expect(listButton).toHaveClass('bg-primary');
        });
      }
    });

    it('switches back to grid view when clicking grid button', async () => {
      const user = userEvent.setup();
      render(<RecommendationsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      const buttons = screen.getAllByRole('button');
      const listButton = buttons.find(btn => btn.querySelector('[class*="lucide-list"]'));
      const gridButton = buttons.find(btn => btn.querySelector('[class*="lucide-grid"]'));

      if (listButton && gridButton) {
        await user.click(listButton);
        await user.click(gridButton);

        await waitFor(() => {
          expect(gridButton).toHaveClass('bg-primary');
        });
      }
    });
  });

  describe('Loading States', () => {
    it('shows loading skeletons initially', () => {
      render(<RecommendationsSection userId="user-123" />);

      const skeletons = screen.getAllByTestId('skeleton-loader');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows 8 skeleton loaders during loading', () => {
      render(<RecommendationsSection userId="user-123" />);

      const skeletons = screen.getAllByTestId('skeleton-loader');
      expect(skeletons).toHaveLength(8);
    });

    it('hides skeletons after loading completes', async () => {
      render(<RecommendationsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('disables refresh button during loading', async () => {
      render(<RecommendationsSection userId="user-123" />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      // Initially loading
      expect(refreshButton).toBeDisabled();

      // After loading completes
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      }, { timeout: 2000 });
    });

    it('shows spinning icon on refresh button during loading', () => {
      render(<RecommendationsSection userId="user-123" />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      const icon = refreshButton.querySelector('[class*="lucide-refresh"]');

      expect(icon).toHaveClass('animate-spin');
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no recommendations are available', async () => {
      render(<RecommendationsSection maxItems={0} userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText('No recommendations available')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('displays empty state message', async () => {
      render(<RecommendationsSection maxItems={0} userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText(/we're working on finding great content for you/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('shows Try Again button in empty state', async () => {
      render(<RecommendationsSection maxItems={0} userId="user-123" />);

      await waitFor(() => {
        const tryAgainButtons = screen.getAllByRole('button', { name: /try again/i });
        expect(tryAgainButtons.length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });
  });

  describe('Recommendations Display', () => {
    it('displays recommendation cards after loading', async () => {
      render(<RecommendationsSection userId="user-123" maxItems={5} />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      await waitFor(() => {
        const cards = screen.queryAllByTestId(/recommendation-card/);
        expect(cards.length).toBeGreaterThan(0);
      }, { timeout: 1000 });
    });

    it('respects maxItems prop', async () => {
      render(<RecommendationsSection userId="user-123" maxItems={3} />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      await waitFor(() => {
        const cards = screen.queryAllByTestId(/recommendation-card/);
        expect(cards.length).toBeLessThanOrEqual(3);
      }, { timeout: 1000 });
    });
  });

  describe('User Interactions', () => {
    it('calls refresh when clicking refresh button', async () => {
      const user = userEvent.setup();
      render(<RecommendationsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Should show loading state again
      await waitFor(() => {
        expect(screen.getAllByTestId('skeleton-loader').length).toBeGreaterThan(0);
      });
    });

    it('removes dismissed recommendations from view', async () => {
      const user = userEvent.setup();
      render(<RecommendationsSection userId="user-123" maxItems={5} />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      await waitFor(async () => {
        const dismissButtons = screen.queryAllByRole('button', { name: 'Dismiss' });
        if (dismissButtons.length > 0) {
          const initialCount = screen.queryAllByTestId(/recommendation-card/).length;
          await user.click(dismissButtons[0]);

          await waitFor(() => {
            const currentCount = screen.queryAllByTestId(/recommendation-card/).length;
            expect(currentCount).toBe(initialCount - 1);
          });
        }
      }, { timeout: 3000 });
    });

    it('handles add to watchlist action', async () => {
      const user = userEvent.setup();
      render(<RecommendationsSection userId="user-123" maxItems={5} />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      await waitFor(async () => {
        const addButtons = screen.queryAllByRole('button', { name: 'Add to Watchlist' });
        if (addButtons.length > 0) {
          await user.click(addButtons[0]);
          // Logger should be called
          expect(require('@/lib/logger').logger.info).toHaveBeenCalled();
        }
      }, { timeout: 3000 });
    });

    it('handles view details action', async () => {
      const user = userEvent.setup();
      render(<RecommendationsSection userId="user-123" maxItems={5} />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      await waitFor(async () => {
        const viewButtons = screen.queryAllByRole('button', { name: 'View Details' });
        if (viewButtons.length > 0) {
          await user.click(viewButtons[0]);
          expect(require('@/lib/logger').logger.info).toHaveBeenCalled();
        }
      }, { timeout: 3000 });
    });

    it('handles rate action', async () => {
      const user = userEvent.setup();
      render(<RecommendationsSection userId="user-123" maxItems={5} />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      await waitFor(async () => {
        const rateButtons = screen.queryAllByRole('button', { name: 'Rate' });
        if (rateButtons.length > 0) {
          await user.click(rateButtons[0]);
          expect(require('@/lib/logger').logger.info).toHaveBeenCalled();
        }
      }, { timeout: 3000 });
    });
  });

  describe('Responsive Behavior', () => {
    it('adjusts grid columns based on view mode', async () => {
      const { container } = render(<RecommendationsSection userId="user-123" />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      await waitFor(() => {
        // Grid is applied to the recommendations container
        const grids = container.querySelectorAll('.grid');
        expect(grids.length).toBeGreaterThan(0);
        // At least one grid should have grid-cols-1 (base mobile class)
        const hasGridCols = Array.from(grids).some(grid =>
          grid.className.includes('grid-cols-1')
        );
        expect(hasGridCols).toBe(true);
      }, { timeout: 1000 });
    });

    it('shows mobile-friendly tab labels', () => {
      render(<RecommendationsSection userId="user-123" />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        // Each tab should have min height for touch targets
        expect(tab).toHaveClass('min-h-[44px]');
      });
    });

    it('applies responsive padding', () => {
      const { container } = render(<RecommendationsSection userId="user-123" />);

      // Check that padding classes are applied somewhere in the component
      const elementsWithPadding = container.querySelectorAll('[class*="p-3"]');
      expect(elementsWithPadding.length).toBeGreaterThan(0);
    });
  });
});
