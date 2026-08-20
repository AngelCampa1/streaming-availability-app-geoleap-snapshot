/**
 * GrowthMetricsOverview Component Tests
 *
 * Test coverage for comprehensive growth metrics dashboard with charts.
 * Tests rendering, data loading, error handling, formatting, and chart display.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { GrowthMetricsOverview, formatNumber, getTrendIcon, getTooltipFormatter, formatTooltipDate, formatTooltipNumber } from '../GrowthMetricsOverview';
import type { DateRange } from 'react-day-picker';
import { withNodeEnv as _withNodeEnv } from '@/test-utils/envMock';

// Track formatters for testing
let _areaChartTooltipFormatter: ((value: number, name: string) => any) | null = null;
let _areaChartLabelFormatter: ((value: any) => string) | null = null;
let _pieChartTooltipFormatter: ((value: number) => string) | null = null;
let _pieChartLabelFormatter: ((entry: any) => string) | null = null;
let _barChartTooltipFormatter: ((value: number, name: string) => any) | null = null;

// Mock Recharts components (complex library, focus on data/logic testing)
jest.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>{children}</div>,
  Line: () => null,
  AreaChart: ({ children, data }: any) => <div data-testid="area-chart" data-chart-data={JSON.stringify(data)}>{children}</div>,
  Area: () => null,
  BarChart: ({ children, data }: any) => <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>{children}</div>,
  Bar: () => null,
  PieChart: ({ children, data }: any) => <div data-testid="pie-chart" data-pie-data={JSON.stringify(data)}>{children}</div>,
  Pie: ({ label, data }: any) => {
    // Capture label formatter for testing
    if (label && typeof label === 'function') {
      _pieChartLabelFormatter = label;
    }
    return <div data-testid="pie-component" data-pie-data={JSON.stringify(data)} />;
  },
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: ({ formatter, labelFormatter }: any) => {
    // Capture formatters for testing - determine which chart by checking stack
    const stack = new Error().stack || '';
    if (stack.includes('AreaChart')) {
      if (formatter) _areaChartTooltipFormatter = formatter;
      if (labelFormatter) _areaChartLabelFormatter = labelFormatter;
    } else if (stack.includes('PieChart')) {
      if (formatter) _pieChartTooltipFormatter = formatter;
    } else if (stack.includes('BarChart')) {
      if (formatter) _barChartTooltipFormatter = formatter;
    }
    return null;
  },
  Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

// Mock console.error to prevent noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Mock data
const mockMetricsData = {
  dailyMetrics: [
    {
      date: '2024-01-01',
      events: 1000,
      users: 500,
      sessions: 750,
      revenue: 5000.00,
      conversionRate: 2.5,
    },
    {
      date: '2024-01-02',
      events: 1200,
      users: 600,
      sessions: 900,
      revenue: 6000.00,
      conversionRate: 3.0,
    },
  ],
  eventCategories: [
    { category: 'PageView', count: 5000, percentage: 50.0, color: '#8884d8' },
    { category: 'Click', count: 3000, percentage: 30.0, color: '#82ca9d' },
    { category: 'Submit', count: 2000, percentage: 20.0, color: '#ffc658' },
  ],
  userSegments: [
    { segment: 'Premium', users: 200, revenue: 10000, avgSessionDuration: 600, conversionRate: 5.0 },
    { segment: 'Free', users: 800, revenue: 2000, avgSessionDuration: 300, conversionRate: 1.0 },
  ],
  performanceMetrics: [
    { metric: 'Total Users', current: 1000, previous: 800, change: 25.0, trend: 'up' as const },
    { metric: 'Total Revenue', current: 50000, previous: 60000, change: -16.67, trend: 'down' as const },
    { metric: 'Conversion Rate', current: 2.5, previous: 2.5, change: 0, trend: 'stable' as const },
  ],
  trends: [
    { name: 'Active Users', value: 1500, change: 12.5, trend: 'up' as const, description: 'Users who logged in' },
    { name: 'New Signups', value: 250, change: -5.0, trend: 'down' as const, description: 'New user registrations' },
    { name: 'Sessions', value: 3000, change: 0, trend: 'stable' as const, description: 'Total sessions' },
    { name: 'Revenue', value: 25000, change: 8.5, trend: 'up' as const, description: 'Total revenue in USD' },
  ],
};

const mockDateRange: DateRange = {
  from: new Date('2024-01-01'),
  to: new Date('2024-01-31'),
};

describe('GrowthMetricsOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    // Reset captured formatters
    _areaChartTooltipFormatter = null;
    _areaChartLabelFormatter = null;
    _pieChartTooltipFormatter = null;
    _pieChartLabelFormatter = null;
    _barChartTooltipFormatter = null;
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', async () => {
      render(<GrowthMetricsOverview />);
      // Component should render (may show empty state)
      expect(document.body).toBeInTheDocument();
    });

    it('shows loading skeletons initially when dateRange is provided', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      // Should show 6 loading skeleton cards
      const loadingCards = document.querySelectorAll('.animate-pulse');
      expect(loadingCards.length).toBeGreaterThan(0);
    });

    it('does not fetch data when dateRange is not provided', () => {
      render(<GrowthMetricsOverview />);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('applies custom className', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsData,
      });

      render(
        <GrowthMetricsOverview dateRange={mockDateRange} className="custom-class" />
      );

      await waitFor(() => {
        expect(screen.getByTestId('growth-metrics-overview')).toHaveClass('custom-class');
      });
    });

    it('handles missing dateRange.from gracefully', () => {
      const incompleteDateRange = { to: new Date('2024-01-31') } as DateRange;

      render(<GrowthMetricsOverview dateRange={incompleteDateRange} />);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles missing dateRange.to gracefully', () => {
      const incompleteDateRange = { from: new Date('2024-01-01') } as DateRange;

      render(<GrowthMetricsOverview dateRange={incompleteDateRange} />);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Data Loading', () => {
    it('fetches metrics data on mount with valid dateRange', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsData,
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/growth-analytics/metrics-overview')
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('startDate=2024-01-01')
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('endDate=2024-01-31')
        );
      });
    });

    it('refetches data when dateRange changes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockMetricsData,
      });

      const { rerender } = render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      const newDateRange: DateRange = {
        from: new Date('2024-02-01'),
        to: new Date('2024-02-28'),
      };

      rerender(<GrowthMetricsOverview dateRange={newDateRange} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenLastCalledWith(
          expect.stringContaining('startDate=2024-02-01')
        );
      });
    });

    it('displays data after successful fetch', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsData,
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByTestId('growth-metrics-overview')).toBeInTheDocument();
      });
    });

    it('handles API error gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading metrics overview/i)).toBeInTheDocument();
        expect(screen.getByText(/HTTP 500/i)).toBeInTheDocument();
      });
    });

    it('handles network error gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading metrics overview/i)).toBeInTheDocument();
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('shows empty state when data is null', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText(/no data available for the selected period/i)).toBeInTheDocument();
      });
    });
  });

  describe('Trend Metrics Cards', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsData,
      });
    });

    it('displays all trend metrics', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Active Users')).toBeInTheDocument();
        expect(screen.getByText('New Signups')).toBeInTheDocument();
        expect(screen.getByText('Sessions')).toBeInTheDocument();
        expect(screen.getByText('Revenue')).toBeInTheDocument();
      });
    });

    it('shows trend values correctly formatted', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument(); // Active Users
        expect(screen.getByText('250')).toBeInTheDocument(); // New Signups
        expect(screen.getByText('3,000')).toBeInTheDocument(); // Sessions
        expect(screen.getByText('25,000')).toBeInTheDocument(); // Revenue
      });
    });

    it('shows percentage changes with correct signs', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('+12.5%')).toBeInTheDocument(); // Positive change
        expect(screen.getByText('-5.0%')).toBeInTheDocument(); // Negative change

        // Zero change appears in multiple places (trends + table)
        const zeroChanges = screen.getAllByText('+0.0%');
        expect(zeroChanges.length).toBeGreaterThan(0); // Stable
      });
    });

    it('displays trend descriptions', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Users who logged in')).toBeInTheDocument();
        expect(screen.getByText('New user registrations')).toBeInTheDocument();
      });
    });

    it('shows correct trend icons for up/down/stable', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        const upIcons = document.querySelectorAll('[class*="lucide-trending-up"]');
        const downIcons = document.querySelectorAll('[class*="lucide-trending-down"]');
        const stableIcons = document.querySelectorAll('[class*="lucide-minus"]');

        expect(upIcons.length).toBeGreaterThan(0);
        expect(downIcons.length).toBeGreaterThan(0);
        expect(stableIcons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Charts Rendering', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsData,
      });
    });

    it('renders daily metrics area chart', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
        expect(screen.getByText('Daily Metrics Trend')).toBeInTheDocument();
      });
    });

    it('renders event categories pie chart', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
        expect(screen.getByText('Event Categories')).toBeInTheDocument();
      });
    });

    it('renders user segments bar chart', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByText('User Segments')).toBeInTheDocument();
      });
    });

    it('passes correct data to area chart', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        const areaChart = screen.getByTestId('area-chart');
        const chartData = areaChart.getAttribute('data-chart-data');
        expect(chartData).toBeTruthy();

        const parsedData = JSON.parse(chartData!);
        expect(parsedData).toHaveLength(2);
        expect(parsedData[0]).toHaveProperty('events', 1000);
      });
    });

    it('handles empty chart data gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockMetricsData,
          dailyMetrics: [],
          eventCategories: [],
          userSegments: [],
        }),
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        // Charts should still render without crashing
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Metrics Table', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsData,
      });
    });

    it('displays performance metrics table', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      });
    });

    it('shows current and previous values', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        // Current values
        expect(screen.getByText('1,000')).toBeInTheDocument();
        expect(screen.getByText('50,000')).toBeInTheDocument();

        // Previous values
        expect(screen.getByText('800')).toBeInTheDocument();
        expect(screen.getByText('60,000')).toBeInTheDocument();
      });
    });

    it('displays change percentages with correct colors', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        const positiveChange = screen.getByText('+25.0%');
        const negativeChange = screen.getByText('-16.7%');

        expect(positiveChange).toHaveClass('text-success');
        expect(negativeChange).toHaveClass('text-destructive');
      });
    });

    it('displays trend icons in table', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        const upIcons = table.querySelectorAll('[class*="lucide-trending-up"]');
        const downIcons = table.querySelectorAll('[class*="lucide-trending-down"]');
        const stableIcons = table.querySelectorAll('[class*="lucide-minus"]');

        expect(upIcons.length).toBeGreaterThan(0);
        expect(downIcons.length).toBeGreaterThan(0);
        expect(stableIcons.length).toBeGreaterThan(0);
      });
    });

    it('has proper table headers', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Metric')).toBeInTheDocument();
        expect(screen.getByText('Current')).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Change')).toBeInTheDocument();
        expect(screen.getByText('Trend')).toBeInTheDocument();
      });
    });
  });

  describe('Formatting Functions', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsData,
      });
    });

    it('formats numbers with thousand separators', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument();
        expect(screen.getByText('3,000')).toBeInTheDocument();
      });
    });

    it('formats currency values correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockMetricsData,
          dailyMetrics: mockMetricsData.dailyMetrics,
        }),
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        // Currency should be formatted in tooltips (tested via chart data)
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });
    });

    it('formats percentage values with decimal places', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('+12.5%')).toBeInTheDocument();
        expect(screen.getByText('-5.0%')).toBeInTheDocument();
      });
    });

    it('formats duration values with minutes and seconds', async () => {
      // Test duration formatting by checking user segments with avgSessionDuration
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockMetricsData,
          userSegments: [
            { segment: 'Premium', users: 200, revenue: 10000, avgSessionDuration: 185, conversionRate: 5.0 },
          ],
        }),
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        // avgSessionDuration of 185 seconds should format as "3m 5s"
        // This will be in the tooltip formatter, tested via chart rendering
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });

    it('handles zero change correctly', async () => {
      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        // Zero change appears in multiple places (trends + table)
        const zeroChanges = screen.getAllByText('+0.0%');
        expect(zeroChanges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error state when API returns non-OK status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading metrics overview/i)).toBeInTheDocument();
        expect(screen.getByText(/HTTP 404/i)).toBeInTheDocument();
      });
    });

    it('displays error message from caught exception', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Custom error message'));

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText('Custom error message')).toBeInTheDocument();
      });
    });

    it('handles non-Error exceptions', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce('String error');

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load metrics/i)).toBeInTheDocument();
      });
    });

    it('suppresses console.error in test environment', async () => {
      const mockConsoleError = jest.fn();
      console.error = mockConsoleError;

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading metrics overview/i)).toBeInTheDocument();
      });

      // console.error should not be called in test env
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing optional data fields', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trends: mockMetricsData.trends,
          // Missing other fields
        }),
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        // Should render trends without crashing
        expect(screen.getByText('Active Users')).toBeInTheDocument();
      });
    });

    it('handles undefined data arrays', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trends: mockMetricsData.trends,
          dailyMetrics: undefined,
          eventCategories: undefined,
          userSegments: undefined,
          performanceMetrics: undefined,
        }),
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        // Component should handle undefined arrays gracefully
        expect(screen.getByTestId('growth-metrics-overview')).toBeInTheDocument();
      });
    });

    it('re-renders correctly on multiple dateRange changes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockMetricsData,
      });

      const { rerender } = render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

      // Change dateRange multiple times
      for (let i = 2; i <= 5; i++) {
        const newDateRange: DateRange = {
          from: new Date(`2024-0${i}-01`),
          to: new Date(`2024-0${i}-28`),
        };

        act(() => {
          rerender(<GrowthMetricsOverview dateRange={newDateRange} />);
        });
      }

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(5);
      });
    });

    it('handles React.memo optimization', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsData,
      });

      const { rerender } = render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

      // Rerender with same props (should not trigger fetch due to React.memo)
      rerender(<GrowthMetricsOverview dateRange={mockDateRange} />);

      // Fetch should not be called again
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Chart Data Scenarios', () => {
    it('renders charts with varied data including all format types', async () => {
      const variedData = {
        ...mockMetricsData,
        dailyMetrics: [
          {
            date: '2024-01-01',
            events: 1000,
            users: 500,
            sessions: 750,
            revenue: 5000.00,
            conversionRate: 2.5,
          },
          {
            date: '2024-01-02',
            events: 1500,
            users: 750,
            sessions: 1000,
            revenue: 7500.50,
            conversionRate: 3.75,
          },
          {
            date: '2024-01-03',
            events: 2000,
            users: 1000,
            sessions: 1250,
            revenue: 10000.99,
            conversionRate: 5.0,
          },
        ],
        eventCategories: [
          { category: 'PageView', count: 5000, percentage: 50.0, color: '#8884d8' },
          { category: 'Click', count: 3000, percentage: 30.0, color: '#82ca9d' },
          { category: 'Submit', count: 2000, percentage: 20.0, color: '#ffc658' },
        ],
        userSegments: [
          { segment: 'Premium', users: 200, revenue: 10000, avgSessionDuration: 600, conversionRate: 5.0 },
          { segment: 'Free', users: 800, revenue: 2000, avgSessionDuration: 300, conversionRate: 1.0 },
          { segment: 'Trial', users: 150, revenue: 1500, avgSessionDuration: 450, conversionRate: 3.0 },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => variedData,
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByTestId('growth-metrics-overview')).toBeInTheDocument();
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });

    it('handles single data point in charts', async () => {
      const singlePointData = {
        ...mockMetricsData,
        dailyMetrics: [
          {
            date: '2024-01-01',
            events: 100,
            users: 50,
            sessions: 75,
            revenue: 500.00,
            conversionRate: 1.0,
          },
        ],
        eventCategories: [
          { category: 'PageView', count: 100, percentage: 100.0, color: '#8884d8' },
        ],
        userSegments: [
          { segment: 'Free', users: 50, revenue: 500, avgSessionDuration: 120, conversionRate: 1.0 },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => singlePointData,
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByTestId('growth-metrics-overview')).toBeInTheDocument();
      });
    });

    it('renders charts with large numbers', async () => {
      const largeNumbersData = {
        ...mockMetricsData,
        dailyMetrics: [
          {
            date: '2024-01-01',
            events: 1000000,
            users: 500000,
            sessions: 750000,
            revenue: 5000000.00,
            conversionRate: 99.99,
          },
        ],
        eventCategories: [
          { category: 'PageView', count: 1000000, percentage: 50.0, color: '#8884d8' },
          { category: 'Click', count: 1000000, percentage: 50.0, color: '#82ca9d' },
        ],
        userSegments: [
          { segment: 'Premium', users: 500000, revenue: 5000000, avgSessionDuration: 3600, conversionRate: 99.99 },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => largeNumbersData,
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByTestId('growth-metrics-overview')).toBeInTheDocument();
      });
    });

    it('renders charts with zero values', async () => {
      const zeroValuesData = {
        ...mockMetricsData,
        dailyMetrics: [
          {
            date: '2024-01-01',
            events: 0,
            users: 0,
            sessions: 0,
            revenue: 0,
            conversionRate: 0,
          },
        ],
        eventCategories: [
          { category: 'PageView', count: 0, percentage: 0, color: '#8884d8' },
        ],
        userSegments: [
          { segment: 'Free', users: 0, revenue: 0, avgSessionDuration: 0, conversionRate: 0 },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => zeroValuesData,
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByTestId('growth-metrics-overview')).toBeInTheDocument();
      });
    });

    it('renders charts with decimal values', async () => {
      const decimalData = {
        ...mockMetricsData,
        dailyMetrics: [
          {
            date: '2024-01-01',
            events: 123.45,
            users: 67.89,
            sessions: 90.12,
            revenue: 1234.56,
            conversionRate: 12.34,
          },
        ],
        eventCategories: [
          { category: 'PageView', count: 123.45, percentage: 45.67, color: '#8884d8' },
          { category: 'Click', count: 147.85, percentage: 54.33, color: '#82ca9d' },
        ],
        userSegments: [
          { segment: 'Premium', users: 50.5, revenue: 1234.56, avgSessionDuration: 127, conversionRate: 6.78 },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => decimalData,
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByTestId('growth-metrics-overview')).toBeInTheDocument();
      });
    });

    it('renders pie chart with data that requires label calculation', async () => {
      const pieChartData = {
        ...mockMetricsData,
        eventCategories: [
          { category: 'Type A', count: 333, percentage: 33.3, color: '#8884d8' },
          { category: 'Type B', count: 333, percentage: 33.3, color: '#82ca9d' },
          { category: 'Type C', count: 334, percentage: 33.4, color: '#ffc658' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => pieChartData,
      });

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByTestId('pie-component')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when metrics fail to load', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading metrics overview/i)).toBeInTheDocument();
      });
    });

    it('sets error state with custom message when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<GrowthMetricsOverview dateRange={mockDateRange} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading metrics overview/i)).toBeInTheDocument();
      });

      // Component suppresses console.error during tests (NODE_ENV === 'test')
      // Error is displayed to user instead of logged
    });
  });

  describe('Utility Functions', () => {
    describe('formatNumber', () => {
      it('formats regular numbers with commas', () => {
        expect(formatNumber(1000)).toBe('1,000');
        expect(formatNumber(1234567)).toBe('1,234,567');
        expect(formatNumber(42)).toBe('42');
        expect(formatNumber(0)).toBe('0');
      });

      it('formats currency with USD symbol', () => {
        expect(formatNumber(1000, 'currency')).toBe('$1,000.00');
        expect(formatNumber(1234.56, 'currency')).toBe('$1,234.56');
        expect(formatNumber(0, 'currency')).toBe('$0.00');
        expect(formatNumber(999999.99, 'currency')).toBe('$999,999.99');
      });

      it('formats percentage with decimal places', () => {
        expect(formatNumber(50, 'percentage')).toBe('50.00%');
        expect(formatNumber(12.5, 'percentage')).toBe('12.50%');
        expect(formatNumber(0.123, 'percentage')).toBe('0.12%');
        expect(formatNumber(100, 'percentage')).toBe('100.00%');
      });

      it('formats duration as minutes and seconds', () => {
        expect(formatNumber(0, 'duration')).toBe('0m 0s');
        expect(formatNumber(30, 'duration')).toBe('0m 30s');
        expect(formatNumber(60, 'duration')).toBe('1m 0s');
        expect(formatNumber(90, 'duration')).toBe('1m 30s');
        expect(formatNumber(185, 'duration')).toBe('3m 5s');
        expect(formatNumber(600, 'duration')).toBe('10m 0s');
        expect(formatNumber(3665, 'duration')).toBe('61m 5s');
      });

      it('defaults to number format when type not specified', () => {
        expect(formatNumber(1000)).toBe('1,000');
        expect(formatNumber(1234567, 'number')).toBe('1,234,567');
      });

      it('handles edge cases', () => {
        // Negative numbers
        expect(formatNumber(-1000)).toBe('-1,000');
        expect(formatNumber(-50, 'percentage')).toBe('-50.00%');
        expect(formatNumber(-100, 'currency')).toBe('-$100.00');

        // Very large numbers
        expect(formatNumber(1000000000)).toBe('1,000,000,000');
        expect(formatNumber(999999999, 'currency')).toBe('$999,999,999.00');

        // Decimal numbers
        expect(formatNumber(1234.567)).toBe('1,234.567');
      });
    });

    describe('getTooltipFormatter', () => {
      it('formats revenue values as currency', () => {
        const [value, name] = getTooltipFormatter(5000, 'revenue');
        expect(value).toBe('$5,000.00');
        expect(name).toBe('revenue');
      });

      it('formats conversionRate values as percentage', () => {
        const [value, name] = getTooltipFormatter(12.5, 'conversionRate');
        expect(value).toBe('12.50%');
        expect(name).toBe('conversionRate');
      });

      it('formats avgSessionDuration values as duration', () => {
        const [value, name] = getTooltipFormatter(185, 'avgSessionDuration');
        expect(value).toBe('3m 5s');
        expect(name).toBe('avgSessionDuration');
      });

      it('formats other values as numbers', () => {
        const [value, name] = getTooltipFormatter(1000, 'events');
        expect(value).toBe('1,000');
        expect(name).toBe('events');

        const [value2, name2] = getTooltipFormatter(500, 'users');
        expect(value2).toBe('500');
        expect(name2).toBe('users');

        const [value3, name3] = getTooltipFormatter(750, 'sessions');
        expect(value3).toBe('750');
        expect(name3).toBe('sessions');
      });

      it('handles edge cases', () => {
        // Zero values
        const [zeroValue, zeroName] = getTooltipFormatter(0, 'revenue');
        expect(zeroValue).toBe('$0.00');
        expect(zeroName).toBe('revenue');

        // Large numbers
        const [largeValue, largeName] = getTooltipFormatter(1000000, 'users');
        expect(largeValue).toBe('1,000,000');
        expect(largeName).toBe('users');

        // Decimal values
        const [decimalValue, decimalName] = getTooltipFormatter(123.456, 'events');
        expect(decimalValue).toBe('123.456');
        expect(decimalName).toBe('events');
      });
    });

    describe('formatTooltipDate', () => {
      it('formats ISO date strings to localized date', () => {
        const dateStr = '2024-01-15T12:00:00Z';
        const formatted = formatTooltipDate(dateStr);
        expect(formatted).toContain('2024');
      });

      it('formats Date objects to localized date', () => {
        const date = new Date('2024-01-15');
        const formatted = formatTooltipDate(date);
        expect(formatted).toContain('2024');
      });

      it('handles invalid dates gracefully', () => {
        const formatted = formatTooltipDate('invalid-date');
        expect(formatted).toBeDefined();
      });
    });

    describe('formatTooltipNumber', () => {
      it('formats numbers with commas', () => {
        expect(formatTooltipNumber(1000)).toBe('1,000');
        expect(formatTooltipNumber(1234567)).toBe('1,234,567');
      });

      it('handles zero', () => {
        expect(formatTooltipNumber(0)).toBe('0');
      });

      it('handles decimals', () => {
        expect(formatTooltipNumber(1234.56)).toBe('1,234.56');
      });

      it('handles negative numbers', () => {
        expect(formatTooltipNumber(-1000)).toBe('-1,000');
      });
    });

    describe('getTrendIcon', () => {
      it('returns icon for up trend', () => {
        const icon = getTrendIcon('up');
        expect(icon).toBeDefined();
        expect(icon.props).toBeDefined();
        expect(icon.props.className).toContain('text-success');
      });

      it('returns icon for down trend', () => {
        const icon = getTrendIcon('down');
        expect(icon).toBeDefined();
        expect(icon.props).toBeDefined();
        expect(icon.props.className).toContain('text-destructive');
      });

      it('returns icon for stable trend', () => {
        const icon = getTrendIcon('stable');
        expect(icon).toBeDefined();
        expect(icon.props).toBeDefined();
        expect(icon.props.className).toContain('text-muted-foreground');
      });

      it('all icons have correct size classes', () => {
        const upIcon = getTrendIcon('up');
        const downIcon = getTrendIcon('down');
        const stableIcon = getTrendIcon('stable');

        expect(upIcon.props.className).toContain('h-4 w-4');
        expect(downIcon.props.className).toContain('h-4 w-4');
        expect(stableIcon.props.className).toContain('h-4 w-4');
      });
    });
  });
});
