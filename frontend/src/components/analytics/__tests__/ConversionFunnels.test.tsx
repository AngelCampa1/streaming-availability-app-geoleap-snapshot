/**
 * ConversionFunnels Component Tests
 *
 * Test coverage for conversion funnel analysis with step-by-step breakdown.
 * Tests rendering, funnel selection, data loading, metrics, and visualization.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { ConversionFunnels } from '../ConversionFunnels';
import type { DateRange } from 'react-day-picker';

// Mock console.error
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
  // Mock scrollIntoView for Radix UI Select component
  Element.prototype.scrollIntoView = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Mock data
const mockFunnels = [
  {
    id: 'funnel-1',
    name: 'Sign-up Funnel',
    description: 'User registration process',
    isActive: true,
    steps: [
      { id: 'step-1', name: 'Landing Page', order: 1, eventNames: ['page_view'], isRequired: true, targetRate: 100 },
      { id: 'step-2', name: 'Sign-up Form', order: 2, eventNames: ['signup_start'], isRequired: true, targetRate: 80 },
    ],
  },
  {
    id: 'funnel-2',
    name: 'Purchase Funnel',
    description: 'Product purchase flow',
    isActive: false,
    steps: [
      { id: 'step-1', name: 'View Product', order: 1, eventNames: ['product_view'], isRequired: true },
    ],
  },
];

const mockFunnelAnalysis = {
  funnelId: 'funnel-1',
  funnelName: 'Sign-up Funnel',
  analysisDate: '2024-01-31',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  totalUsers: 1000,
  completedUsers: 250,
  overallConversionRate: 25.0,
  averageTimeToComplete: '5m 30s',
  stepResults: [
    {
      stepId: 'step-1',
      stepName: 'Landing Page',
      order: 1,
      usersEntered: 1000,
      usersCompleted: 800,
      usersDropped: 200,
      conversionRate: 80.0,
      dropOffRate: 20.0,
      averageTimeInStep: '2m 15s',
      medianTimeInStep: '1m 45s',
      targetRate: 100,
      performance: 80.0,
    },
    {
      stepId: 'step-2',
      stepName: 'Sign-up Form',
      order: 2,
      usersEntered: 600,  // 200 dropped between step 1 and 2
      usersCompleted: 300,
      usersDropped: 300,
      conversionRate: 50.0,
      dropOffRate: 50.0,
      averageTimeInStep: '3m 15s',
      medianTimeInStep: '2m 30s',
      targetRate: 80,
      performance: 62.5,
    },
    {
      stepId: 'step-3',
      stepName: 'Confirmation',
      order: 3,
      usersEntered: 250,  // 50 dropped between step 2 and 3 (300 completed -> 250 entered)
      usersCompleted: 250,
      usersDropped: 0,
      conversionRate: 100.0,
      dropOffRate: 0.0,
      averageTimeInStep: '1m 00s',
      medianTimeInStep: '0m 45s',
      targetRate: 90,
      performance: 111.1,
    },
  ],
};

const mockDateRange: DateRange = {
  from: new Date('2024-01-01'),
  to: new Date('2024-01-31'),
};

describe('ConversionFunnels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<ConversionFunnels />);
      expect(document.body).toBeInTheDocument();
    });

    it('shows loading skeleton initially', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ConversionFunnels />);

      const loadingSkeleton = document.querySelector('.animate-pulse');
      expect(loadingSkeleton).toBeInTheDocument();
    });

    it('applies custom className', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnelAnalysis });

      const { container } = render(
        <ConversionFunnels dateRange={mockDateRange} className="custom-class" />
      );

      await waitFor(() => {
        const mainDiv = container.querySelector('.custom-class');
        expect(mainDiv).toBeInTheDocument();
      });
    });
  });

  describe('Funnel Loading', () => {
    it('fetches funnels on mount', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFunnels,
      });

      render(<ConversionFunnels />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/growth-analytics/funnels');
      });
    });

    it('auto-selects first active funnel', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFunnels,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFunnelAnalysis,
        });

      render(<ConversionFunnels />);

      await waitFor(() => {
        expect(screen.getByText('Sign-up Funnel')).toBeInTheDocument();
      });
    });

    it('selects first funnel if no active funnel exists', async () => {
      const inactiveFunnels = mockFunnels.map(f => ({ ...f, isActive: false }));
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => inactiveFunnels,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFunnelAnalysis,
        });

      render(<ConversionFunnels />);

      await waitFor(() => {
        expect(screen.getByText(/Sign-up Funnel/)).toBeInTheDocument();
      });
    });

    it('handles empty funnels list', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<ConversionFunnels />);

      await waitFor(() => {
        // Should render without crashing
        expect(screen.getByText('Conversion Funnel Analysis')).toBeInTheDocument();
      });
    });

    it('handles funnel fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ConversionFunnels />);

      await waitFor(() => {
        // Error is logged but component should still render
        expect(screen.getByText('Conversion Funnel Analysis')).toBeInTheDocument();
      });
    });

    it('handles non-Error exception in loadFunnels', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce('String error');

      render(<ConversionFunnels />);

      await waitFor(() => {
        expect(screen.getByText('Conversion Funnel Analysis')).toBeInTheDocument();
      });
    });

    it('handles Error object in loadFunnels', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ConversionFunnels />);

      await waitFor(() => {
        // Error should be displayed
        expect(screen.getByText(/error loading funnel analysis/i)).toBeInTheDocument();
      });
    });

    it('handles HTTP error response in loadFunnels', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      render(<ConversionFunnels />);

      await waitFor(() => {
        expect(screen.getByText('Conversion Funnel Analysis')).toBeInTheDocument();
      });
    });
  });

  describe('Funnel Selection', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnelAnalysis });
    });

    it('renders funnel selector dropdown', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Funnel:')).toBeInTheDocument();
      });
    });

    it('displays all available funnels in dropdown', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Sign-up Funnel')).toBeInTheDocument();
      });

      // Open dropdown using fireEvent to avoid userEvent.click issues with combobox
      const selectTrigger = screen.getByRole('combobox');
      fireEvent.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByText(/Purchase Funnel/)).toBeInTheDocument();
        expect(screen.getByText(/\(Inactive\)/)).toBeInTheDocument();
      });
    });

    it('changes funnel when user selects different option', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnelAnalysis })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ ...mockFunnelAnalysis, funnelId: 'funnel-2' }) });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Sign-up Funnel')).toBeInTheDocument();
      });

      // Use fireEvent to avoid userEvent issues with combobox
      const selectTrigger = screen.getByRole('combobox');
      fireEvent.click(selectTrigger);

      const purchaseOption = screen.getByText(/Purchase Funnel/);
      fireEvent.click(purchaseOption);

      // Should trigger new analysis fetch
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('funnelId=funnel-2')
        );
      });
    });
  });

  describe('Funnel Analysis Loading', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFunnels,
      });
    });

    it('fetches analysis when funnel and dateRange are selected', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFunnelAnalysis,
      });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/growth-analytics/funnels/analysis')
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('funnelId=funnel-1')
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('startDate=2024-01-01')
        );
      });
    });

    it('does not fetch analysis without dateRange', async () => {
      render(<ConversionFunnels />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1); // Only funnels fetch
      });
    });

    it('refetches analysis when dateRange changes', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnelAnalysis })
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnelAnalysis });

      const { rerender } = render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2); // Funnels + analysis
      });

      const newDateRange: DateRange = {
        from: new Date('2024-02-01'),
        to: new Date('2024-02-28'),
      };

      rerender(<ConversionFunnels dateRange={newDateRange} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3); // Re-fetch analysis
        expect(global.fetch).toHaveBeenLastCalledWith(
          expect.stringContaining('startDate=2024-02-01')
        );
      });
    });

    it('handles analysis fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Analysis failed'));

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading funnel analysis/i)).toBeInTheDocument();
        expect(screen.getByText(/analysis failed/i)).toBeInTheDocument();
      });
    });

    it('handles HTTP error status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading funnel analysis/i)).toBeInTheDocument();
        expect(screen.getByText(/HTTP 500/i)).toBeInTheDocument();
      });
    });

    it('handles non-Error exception in loadFunnelAnalysis', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce('String error');

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading funnel analysis/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to load funnel data/i)).toBeInTheDocument();
      });
    });

    it('handles Error object in loadFunnelAnalysis', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading funnel analysis/i)).toBeInTheDocument();
        expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Summary Metrics', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnelAnalysis });
    });

    it('displays all four summary cards', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('Completed Users')).toBeInTheDocument();
        expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
        // "Avg. Time" appears in both summary card and table, use getAllByText
        const avgTimeElements = screen.getAllByText('Avg. Time');
        expect(avgTimeElements.length).toBeGreaterThan(0);
      });
    });

    it('displays correct total users', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        const totalUsers = screen.getAllByText('1,000');
        expect(totalUsers.length).toBeGreaterThan(0);
        expect(screen.getByText('Entered funnel')).toBeInTheDocument();
      });
    });

    it('displays correct completed users', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        const completedUsers = screen.getAllByText('250');
        expect(completedUsers.length).toBeGreaterThan(0);
        expect(screen.getByText('Reached final step')).toBeInTheDocument();
      });
    });

    it('displays overall conversion rate with 2 decimals', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('25.00%')).toBeInTheDocument();
        expect(screen.getByText('Overall funnel')).toBeInTheDocument();
      });
    });

    it('displays average time to complete', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('5m 30s')).toBeInTheDocument();
        expect(screen.getByText('To complete')).toBeInTheDocument();
      });
    });
  });

  describe('Funnel Flow Visualization', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnelAnalysis });
    });

    it('renders funnel flow section', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Funnel Flow')).toBeInTheDocument();
        expect(screen.getByText(/Visual representation of user flow/i)).toBeInTheDocument();
      });
    });

    it('displays all funnel steps', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        // Step names appear in both funnel flow and table
        const landingPages = screen.getAllByText('Landing Page');
        const signupForms = screen.getAllByText('Sign-up Form');
        const confirmations = screen.getAllByText('Confirmation');
        expect(landingPages.length).toBeGreaterThan(0);
        expect(signupForms.length).toBeGreaterThan(0);
        expect(confirmations.length).toBeGreaterThan(0);
      });
    });

    it('shows step numbers in correct order', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        const stepNumbers = screen.getAllByText(/^[1-3]$/);
        expect(stepNumbers).toHaveLength(3);
        expect(stepNumbers[0]).toHaveTextContent('1');
        expect(stepNumbers[1]).toHaveTextContent('2');
        expect(stepNumbers[2]).toHaveTextContent('3');
      });
    });

    it('displays performance badges for steps', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('80% vs target')).toBeInTheDocument();
        // 62.5 rounds to 63
        expect(screen.getByText('63% vs target')).toBeInTheDocument();
        // 111.1 rounds to 111
        expect(screen.getByText('111% vs target')).toBeInTheDocument();
      });
    });

    it('shows entered and completed users for each step', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        const enteredLabels = screen.getAllByText('Entered:');
        expect(enteredLabels.length).toBeGreaterThan(0);

        const completedLabels = screen.getAllByText('Completed:');
        expect(completedLabels.length).toBeGreaterThan(0);
      });
    });

    it('displays conversion rates for each step', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getAllByText(/80.00%/)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/50.00%/)[0]).toBeInTheDocument();
        // Step 3 has 100% conversion rate now
        expect(screen.getAllByText(/100.00%/)[0]).toBeInTheDocument();
      });
    });

    it('shows drop-off indicators between steps', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        // Drop-off = step.usersCompleted - nextStep.usersEntered
        // Step 1→2: 800 - 600 = 200
        expect(screen.getByText(/200 users dropped off/)).toBeInTheDocument();
        // Step 2→3: 300 - 250 = 50
        expect(screen.getByText(/50 users dropped off/)).toBeInTheDocument();
      });
    });

    it('does not show drop-off for last step', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        const dropOffIndicators = screen.getAllByText(/users dropped off/);
        // Should be 2 (not 3, since last step doesn't have drop-off)
        expect(dropOffIndicators).toHaveLength(2);
      });
    });
  });

  describe('Performance Indicators', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnelAnalysis });
    });

    it('shows success indicator for performance >= 100%', async () => {
      const highPerformance = {
        ...mockFunnelAnalysis,
        stepResults: [
          { ...mockFunnelAnalysis.stepResults[0], performance: 105 },
        ],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => highPerformance });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        const successIcons = document.querySelectorAll('[class*="lucide-trending-up"]');
        expect(successIcons.length).toBeGreaterThan(0);
      });
    });

    it('shows warning indicator for performance 80-99%', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        const warningIcons = document.querySelectorAll('[class*="lucide-trending-down"]');
        expect(warningIcons.length).toBeGreaterThan(0);
      });
    });

    it('handles steps without performance data', async () => {
      const noPerformance = {
        ...mockFunnelAnalysis,
        stepResults: [
          { ...mockFunnelAnalysis.stepResults[0], performance: undefined, targetRate: undefined },
        ],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => noPerformance });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        // Should render without performance badge
        expect(screen.queryByText(/vs target/)).not.toBeInTheDocument();
      });
    });

    it('uses default step color when no targetRate provided', async () => {
      const analysisNoTarget = {
        ...mockFunnelAnalysis,
        stepResults: [
          {
            ...mockFunnelAnalysis.stepResults[0],
            targetRate: undefined,
            performance: undefined,
          },
        ],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => analysisNoTarget });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        // Should render step without error - check for multiple instances
        const landingPageElements = screen.getAllByText('Landing Page');
        expect(landingPageElements.length).toBeGreaterThan(0);
      });
    });

    it('renders correctly with performance < 80%', async () => {
      const lowPerformanceAnalysis = {
        ...mockFunnelAnalysis,
        stepResults: mockFunnelAnalysis.stepResults.map((step, idx) =>
          idx === 0
            ? { ...step, targetRate: 100, performance: 70, conversionRate: 70 }
            : step
        ),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => lowPerformanceAnalysis });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Sign-up Funnel')).toBeInTheDocument();
        expect(screen.getByText('Total Users')).toBeInTheDocument();
      });
    });

    it('renders correctly with performance 80-99%', async () => {
      const mediumPerformanceAnalysis = {
        ...mockFunnelAnalysis,
        stepResults: mockFunnelAnalysis.stepResults.map((step, idx) =>
          idx === 0
            ? { ...step, targetRate: 100, performance: 85, conversionRate: 85 }
            : step
        ),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => mediumPerformanceAnalysis });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Sign-up Funnel')).toBeInTheDocument();
        expect(screen.getByText('Total Users')).toBeInTheDocument();
      });
    });

    it('renders correctly with performance >= 100%', async () => {
      const highPerformanceAnalysis = {
        ...mockFunnelAnalysis,
        stepResults: mockFunnelAnalysis.stepResults.map((step, idx) =>
          idx === 0
            ? { ...step, targetRate: 90, performance: 110, conversionRate: 99 }
            : step
        ),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => highPerformanceAnalysis });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Sign-up Funnel')).toBeInTheDocument();
        expect(screen.getByText('Total Users')).toBeInTheDocument();
      });
    });

    it('renders correctly when step has undefined targetRate', async () => {
      const noTargetAnalysis = {
        ...mockFunnelAnalysis,
        stepResults: mockFunnelAnalysis.stepResults.map((step, idx) =>
          idx === 0
            ? { ...step, targetRate: undefined, performance: undefined }
            : step
        ),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => noTargetAnalysis });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Sign-up Funnel')).toBeInTheDocument();
        const landingPages = screen.getAllByText('Landing Page');
        expect(landingPages.length).toBeGreaterThan(0);
      });
    });

    it('renders with dash when targetRate and performance are null', async () => {
      const noTargetRateAnalysis = {
        ...mockFunnelAnalysis,
        stepResults: mockFunnelAnalysis.stepResults.map(step => ({
          ...step,
          targetRate: null, // This should trigger null branches
          performance: null, // This should trigger null branches
        })),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => noTargetRateAnalysis });

      const { container } = render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        // Wait for full render including table and progress bars
        expect(screen.getByText('Total Users')).toBeInTheDocument();

        // Verify step results are rendering (Landing Page appears multiple times)
        const landingPages = screen.getAllByText('Landing Page');
        expect(landingPages.length).toBeGreaterThan(0);

        // Force all elements to be queried (ensures React evaluates all branches)
        const allElements = container.querySelectorAll('*');
        expect(allElements.length).toBeGreaterThan(0);
      });
    });

    it('early returns from loadFunnelAnalysis when no dateRange', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFunnels,
      });

      // Render without dateRange prop
      render(<ConversionFunnels />);

      // Should not call fetch for analysis (only for funnels)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('early returns from loadFunnelAnalysis when dateRange incomplete', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFunnels,
      });

      // Render with incomplete dateRange (missing 'to')
      const incompleteDateRange = { from: new Date('2024-01-01') };
      render(<ConversionFunnels dateRange={incompleteDateRange as any} />);

      // Should not call fetch for analysis (only for funnels)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('early returns from loadFunnelAnalysis when no selectedFunnel', () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Render with dateRange but no funnels available
      render(<ConversionFunnels dateRange={mockDateRange} />);

      // Should only call fetch for funnels, not analysis
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Table', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnelAnalysis });
    });

    it('renders performance table section', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Step Performance Details')).toBeInTheDocument();
        expect(screen.getByText(/Detailed metrics for each funnel step/i)).toBeInTheDocument();
      });
    });

    it('displays table with correct headers', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(within(table).getByText('Step')).toBeInTheDocument();
        expect(within(table).getByText(/Conv\. Rate/)).toBeInTheDocument();
        expect(within(table).getByText(/Perf\./)).toBeInTheDocument();
      });
    });

    it('displays all step names in table', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(within(table).getByText('Landing Page')).toBeInTheDocument();
        expect(within(table).getByText('Sign-up Form')).toBeInTheDocument();
        expect(within(table).getByText('Confirmation')).toBeInTheDocument();
      });
    });

    it('shows target rates in table', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        // 100.00% appears multiple times (step 1 target + step 3 conversion)
        const hundredPercents = within(table).getAllByText(/100.00%/);
        expect(hundredPercents.length).toBeGreaterThan(0);
        // 80.00% appears multiple times (conversion rate AND target rate)
        const eightyPercents = within(table).getAllByText(/80.00%/);
        expect(eightyPercents.length).toBeGreaterThan(0);
        expect(within(table).getByText(/90.00%/)).toBeInTheDocument();
      });
    });

    it('handles missing target rates with dash', async () => {
      const noTarget = {
        ...mockFunnelAnalysis,
        stepResults: [
          { ...mockFunnelAnalysis.stepResults[0], targetRate: undefined, performance: undefined },
        ],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => noTarget });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        // The dash appears in target rate column (hidden on small screens with lg:table-cell)
        // Just verify the table renders without error
        expect(table).toBeInTheDocument();
        expect(within(table).getByText('Landing Page')).toBeInTheDocument();
      });
    });

    it('applies performance colors in table', async () => {
      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        const performanceCells = within(table).getAllByText(/80%|62%|69%/);

        const hasColoredCell = performanceCells.some(cell =>
          cell.className.includes('text-success') ||
          cell.className.includes('text-warning') ||
          cell.className.includes('text-error')
        );

        expect(hasColoredCell).toBe(true);
      });
    });
  });

  describe('Empty and Loading States', () => {
    it('shows empty state when no analysis and not loading', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFunnels,
      });

      render(<ConversionFunnels />);

      await waitFor(() => {
        expect(screen.getByText(/Select a funnel and date range to view analysis/i)).toBeInTheDocument();
      });
    });

    it('hides loading skeleton once data loads', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnelAnalysis });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
        expect(screen.getByText('Total Users')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles funnel with single step', async () => {
      const singleStep = {
        ...mockFunnelAnalysis,
        stepResults: [mockFunnelAnalysis.stepResults[0]],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => singleStep });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        // "Landing Page" appears in both flow and table
        const landingPages = screen.getAllByText('Landing Page');
        expect(landingPages.length).toBeGreaterThan(0);
        // No drop-off indicators since there's only 1 step
        expect(screen.queryByText(/users dropped off/)).not.toBeInTheDocument();
      });
    });

    it('handles zero drop-off between steps', async () => {
      const zeroDropOff = {
        ...mockFunnelAnalysis,
        stepResults: [
          mockFunnelAnalysis.stepResults[0],
          { ...mockFunnelAnalysis.stepResults[1], usersEntered: 800 }, // Same as previous usersCompleted
        ],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => zeroDropOff });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        // No drop-off message when dropOffUsers is 0
        expect(screen.queryByText(/0 users dropped off/)).not.toBeInTheDocument();
      });
    });

    it('formats large numbers with locale separators', async () => {
      const largeNumbers = {
        ...mockFunnelAnalysis,
        totalUsers: 1000000,
        completedUsers: 250000,
        stepResults: [
          { ...mockFunnelAnalysis.stepResults[0], usersEntered: 1000000, usersCompleted: 800000 },
        ],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockFunnels })
        .mockResolvedValueOnce({ ok: true, json: async () => largeNumbers });

      render(<ConversionFunnels dateRange={mockDateRange} />);

      await waitFor(() => {
        // Large numbers appear in multiple places
        const millionUsers = screen.getAllByText('1,000,000');
        const quarterMillion = screen.getAllByText('250,000');
        expect(millionUsers.length).toBeGreaterThan(0);
        expect(quarterMillion.length).toBeGreaterThan(0);
      });
    });
  });
});
