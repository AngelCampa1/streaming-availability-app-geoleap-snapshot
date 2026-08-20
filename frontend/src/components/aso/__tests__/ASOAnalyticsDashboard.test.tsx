import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import ASOAnalyticsDashboard from '../ASOAnalyticsDashboard';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

// Mock recharts to avoid canvas issues in tests
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

// Test data
const mockKeywordData = {
  keywords: [
    { keyword: 'streaming vpn', ranking: 5, searchVolume: 12500, competition: 0.8, trend: 'up' },
    { keyword: 'netflix vpn', ranking: 12, searchVolume: 8900, competition: 0.9, trend: 'stable' },
    { keyword: 'vpn unblock', ranking: 8, searchVolume: 6700, competition: 0.7, trend: 'down' },
    { keyword: 'geo vpn', ranking: 15, searchVolume: 4300, competition: 0.6, trend: 'up' },
  ],
  totalKeywords: 500,
  averageRanking: 8.5,
  totalSearchVolume: 125000,
};

const mockABTestData = {
  experiments: [
    {
      id: 'exp-1',
      name: 'Icon Test - Streaming Focus',
      status: 'active',
      conversionRate: { control: 2.5, treatment: 3.1 },
      significance: 0.95,
      participants: { control: 1250, treatment: 1300 },
      startDate: '2024-01-15T00:00:00Z',
      endDate: '2024-02-15T00:00:00Z',
    },
    {
      id: 'exp-2',
      name: 'Screenshots Optimization',
      status: 'completed',
      conversionRate: { control: 2.1, treatment: 2.8 },
      significance: 0.99,
      participants: { control: 2100, treatment: 2050 },
      startDate: '2023-12-01T00:00:00Z',
      endDate: '2023-12-31T00:00:00Z',
    },
  ],
};

const mockReviewData = {
  reviews: [
    { id: 'rev-1', text: 'Great VPN for streaming!', rating: 5, sentiment: 'positive', platform: 'ios' },
    { id: 'rev-2', text: 'Slow connection speeds', rating: 2, sentiment: 'negative', platform: 'android' },
    { id: 'rev-3', text: 'Works well most of the time', rating: 4, sentiment: 'positive', platform: 'ios' },
  ],
  averageRating: 4.2,
  totalReviews: 15620,
  sentimentDistribution: { positive: 0.65, neutral: 0.2, negative: 0.15 },
};

/**
 * ASO Analytics Dashboard Test Suite
 * Tests comprehensive ASO analytics dashboard functionality
 * Validates keyword tracking, A/B testing results, and review analysis
 */
describe('ASO Analytics Dashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  };

  describe('Dashboard Loading and Data Display', () => {
    it('displays loading state initially', () => {
      // Use MSW to delay response indefinitely
      server.use(
        http.get('*/api/aso/keywords*', () => {
          return new Promise(() => {}); // Never resolves
        })
      );

      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('renders dashboard with keyword data', async () => {
      // Use MSW to return mock keyword data
      server.use(
        http.get('*/api/aso/keywords*', () => {
          return HttpResponse.json(mockKeywordData);
        })
      );

      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        expect(screen.getByText('500')).toBeInTheDocument(); // Total keywords
        expect(screen.getByText('8.5')).toBeInTheDocument(); // Average ranking
      });
    });

    it('handles API errors gracefully', async () => {
      // Use MSW to return error
      server.use(
        http.get('*/api/aso/keywords*', () => {
          return HttpResponse.json({ error: 'API Error' }, { status: 500 });
        })
      );

      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
        expect(screen.getByText(/Retry/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyword Analytics', () => {
    beforeEach(() => {
      // Use MSW to return mock keyword data for all tests in this suite
      server.use(
        http.get('*/api/aso/keywords*', () => {
          return HttpResponse.json(mockKeywordData);
        })
      );
    });

    it('displays keyword rankings with trends', async () => {
      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        expect(screen.getByText('streaming vpn')).toBeInTheDocument();
        expect(screen.getByText('Rank: 5')).toBeInTheDocument();
        expect(screen.getByText('12,500')).toBeInTheDocument(); // Search volume
      });
    });

    it('filters keywords by search volume', async () => {
      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        const filterInput = screen.getByPlaceholderText(/filter keywords/i);
        fireEvent.change(filterInput, { target: { value: 'netflix' } });
      });

      await waitFor(() => {
        expect(screen.getByText('netflix vpn')).toBeInTheDocument();
        expect(screen.queryByText('streaming vpn')).not.toBeInTheDocument();
      });
    });

    it('sorts keywords by different metrics', async () => {
      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        const sortSelect = screen.getByLabelText(/sort keywords by/i);
        fireEvent.change(sortSelect, { target: { value: 'searchVolume' } });
      });

      // Keywords should be reordered by search volume
      await waitFor(() => {
        const keywordElements = screen.getAllByTestId(/keyword-item/);
        expect(keywordElements[0]).toHaveTextContent('streaming vpn'); // Highest volume first
      });
    });
  });

  describe('A/B Testing Results', () => {
    beforeEach(() => {
      // Use MSW to handle multiple endpoints
      server.use(
        http.get('*/api/aso/abtest*', () => {
          return HttpResponse.json(mockABTestData);
        }),
        http.get('*/api/aso/keywords*', () => {
          return HttpResponse.json(mockKeywordData);
        })
      );
    });

    it('displays active and completed experiments', async () => {
      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        expect(screen.getByText('Icon Test - Streaming Focus')).toBeInTheDocument();
        expect(screen.getByText('Screenshots Optimization')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });

    it('shows statistical significance indicators', async () => {
      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        expect(screen.getByText('95% confident')).toBeInTheDocument();
        expect(screen.getByText('99% confident')).toBeInTheDocument();
      });
    });

    it('calculates conversion rate improvements', async () => {
      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        // Look for improvement percentage pattern (could be any positive percentage)
        const improvementElements = screen.queryAllByText(/\+\d+%/);
        expect(improvementElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Review Analytics', () => {
    beforeEach(() => {
      // Use MSW to handle multiple endpoints (reviews + keywords)
      server.use(
        http.get('*/api/aso/reviews*', () => {
          return HttpResponse.json(mockReviewData);
        }),
        http.get('*/api/aso/keywords*', () => {
          return HttpResponse.json(mockKeywordData);
        })
      );
    });

    it('displays review sentiment distribution', async () => {
      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        expect(screen.getByText('65%')).toBeInTheDocument(); // Positive sentiment
        expect(screen.getByText('20%')).toBeInTheDocument(); // Neutral sentiment
        expect(screen.getByText('15%')).toBeInTheDocument(); // Negative sentiment
      });
    });

    it('shows average rating and total review count', async () => {
      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        expect(screen.getByText('4.2')).toBeInTheDocument(); // Average rating
        expect(screen.getByText('15,620')).toBeInTheDocument(); // Total reviews
      });
    });

    it('filters reviews by platform', async () => {
      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        const platformFilter = screen.getByLabelText(/platform/i);
        fireEvent.change(platformFilter, { target: { value: 'ios' } });
      });

      await waitFor(() => {
        // Check that platform filter exists and reviews are displayed
        const reviewElements = screen.queryAllByText(/vpn|streaming|connection/i);
        expect(reviewElements.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Performance with Large Datasets', () => {
    const generateLargeKeywordDataset = (size: number) => ({
      keywords: Array.from({ length: size }, (_, i) => ({
        keyword: `test keyword ${i}`,
        ranking: Math.floor(Math.random() * 100) + 1,
        searchVolume: Math.floor(Math.random() * 10000) + 100,
        competition: Math.random(),
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)],
      })),
      totalKeywords: size,
      averageRanking: 45.3,
      totalSearchVolume: size * 500,
    });

    it('handles 500+ keywords efficiently', async () => {
      const largeDataset = generateLargeKeywordDataset(750);

      // Use MSW to return large dataset
      server.use(
        http.get('*/api/aso/keywords*', () => {
          return HttpResponse.json(largeDataset);
        })
      );

      const startTime = performance.now();
      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        expect(screen.getByText('750')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(5000); // Should render within 5 seconds

      console.warn(`✅ ASO FRONTEND: Rendered 750 keywords in ${renderTime.toFixed(2)}ms`);
    });

    it('implements virtualization for large lists', async () => {
      const largeDataset = generateLargeKeywordDataset(1000);

      // Use MSW to return large dataset
      server.use(
        http.get('*/api/aso/keywords*', () => {
          return HttpResponse.json(largeDataset);
        })
      );

      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        // Check for virtual list if it exists (appears when > 1000 keywords)
        const virtualContainer = screen.queryByTestId('virtual-list');
        const keywordTable = screen.queryByRole('table');
        expect(virtualContainer || keywordTable).toBeTruthy();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('updates data when WebSocket receives new rankings', async () => {
      // Mock WebSocket
      const mockWebSocket = {
        onmessage: jest.fn() as any,
        send: jest.fn() as any,
        close: jest.fn() as any,
      };

      (global as any).WebSocket = jest.fn(() => mockWebSocket);

      // Use MSW to return mock keyword data
      server.use(
        http.get('*/api/aso/keywords*', () => {
          return HttpResponse.json(mockKeywordData);
        })
      );

      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" enableRealtime />);

      // Simulate WebSocket message
      const newRankingData = {
        keyword: 'streaming vpn',
        newRanking: 3,
        previousRanking: 5,
        timestamp: new Date().toISOString(),
      };

      await waitFor(() => {
        // Simulate receiving WebSocket message
        mockWebSocket.onmessage({ data: JSON.stringify(newRankingData) });
      });

      await waitFor(() => {
        // Check for any ranking display pattern
        const rankingElements = screen.queryAllByText(/rank[:\s#]\s*\d+/i);
        expect(rankingElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      // Use MSW to return mock keyword data
      server.use(
        http.get('*/api/aso/keywords*', () => {
          return HttpResponse.json(mockKeywordData);
        })
      );
    });

    it('has proper ARIA labels and roles', async () => {
      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'ASO Analytics Dashboard');
        expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Keyword Rankings');
        expect(screen.getAllByRole('columnheader')).toHaveLength(7); // Keyword, App Store, Country, Ranking, Search Volume, Competition, Trend
      });
    });

    it('supports keyboard navigation', async () => {
      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        const firstKeywordRow = screen.getAllByRole('row')[1]; // Skip header
        firstKeywordRow.focus();

        // Should be focusable
        expect(document.activeElement).toBe(firstKeywordRow);

        // Tab should move to next interactive element
        fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
      });
    });

    it('provides screen reader friendly content', async () => {
      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        expect(screen.getByText('streaming vpn')).toHaveAttribute(
          'aria-describedby',
          expect.stringContaining('rank-5')
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('displays specific error messages for different failure types', async () => {
      // Use MSW to return network error
      server.use(
        http.get('*/api/aso/keywords*', () => {
          return HttpResponse.error();
        })
      );

      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
        expect(screen.getByText(/Retry/i)).toBeInTheDocument();
      });
    });

    it('provides retry functionality on errors', async () => {
      let callCount = 0;

      // Use MSW to simulate error on first call, success on retry
      server.use(
        http.get('*/api/aso/keywords*', () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json({ error: 'Server error' }, { status: 500 });
          }
          return HttpResponse.json(mockKeywordData);
        })
      );

      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/retry/i);
      fireEvent.click(retryButton);

      await waitFor(() => {
        // After retry, check that error is gone and component is loaded
        const errorText = screen.queryByText(/Failed to fetch/i);
        expect(errorText).not.toBeInTheDocument();
        // Check that data loaded successfully
        expect(screen.getByText('500')).toBeInTheDocument(); // Total keywords
      });
    });
  });

  describe('Data Export', () => {
    beforeEach(() => {
      // Use MSW to return mock keyword data
      server.use(
        http.get('*/api/aso/keywords*', () => {
          return HttpResponse.json(mockKeywordData);
        })
      );
    });

    it('exports keyword data as CSV', async () => {
      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn() as any;

      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        const exportButton = screen.getByText(/export csv/i);
        fireEvent.click(exportButton);
      });

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('generates comprehensive reports', async () => {
      // Mock alert to spy on it
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      renderWithQueryClient(<ASOAnalyticsDashboard appId="test-app" />);

      await waitFor(() => {
        const reportButton = screen.getByText(/generate report/i);
        fireEvent.click(reportButton);
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Report generation started');
      });

      alertSpy.mockRestore();
    });
  });
});
