/**
 * Affiliate Dashboard Page Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AffiliateDashboardPage from './page';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="trending-up-icon">trend</span>,
  MousePointer: () => <span data-testid="mouse-pointer-icon">click</span>,
  DollarSign: () => <span data-testid="dollar-sign-icon">$</span>,
  Percent: () => <span data-testid="percent-icon">%</span>,
}));

const mockDashboard = {
  totalClicks: 5000,
  totalConversions: 250,
  totalRevenue: 12500.75,
  totalCommission: 1875.11,
  conversionRate: 5.0,
  topPartners: [
    { id: 'p1', name: 'NordVPN', totalClicks: 3000, totalRevenue: 8000.5 },
    { id: 'p2', name: 'ExpressVPN', totalClicks: 2000, totalRevenue: 4500.25 },
  ],
  from: '2024-01-01',
  to: '2024-12-31',
};

describe('AffiliateDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Affiliate Dashboard" heading', () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

    render(<AffiliateDashboardPage />);

    expect(screen.getByText('Affiliate Dashboard')).toBeInTheDocument();
  });

  it('renders loading state initially', () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

    render(<AffiliateDashboardPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows stat cards with correct values from API response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDashboard,
    });

    render(<AffiliateDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Clicks')).toBeInTheDocument();
      expect(screen.getByText('5,000')).toBeInTheDocument();
    });

    expect(screen.getByText('Conversions')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    // Revenue value rendered via toFixed(2)  -  matches component output
    expect(screen.getByText(/\$12[,.]?500\.75/)).toBeInTheDocument();
    expect(screen.getByText('Conv. Rate')).toBeInTheDocument();
    expect(screen.getByText('5.0%')).toBeInTheDocument();
  });

  it('shows top partners section when data is available', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDashboard,
    });

    render(<AffiliateDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Top Partners')).toBeInTheDocument();
      expect(screen.getByText('NordVPN')).toBeInTheDocument();
      expect(screen.getByText('ExpressVPN')).toBeInTheDocument();
    });
  });

  it('does not show top partners section when list is empty', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockDashboard, topPartners: [] }),
    });

    render(<AffiliateDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Clicks')).toBeInTheDocument();
    });

    expect(screen.queryByText('Top Partners')).not.toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    render(<AffiliateDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch dashboard/i)).toBeInTheDocument();
    });
  });
});
