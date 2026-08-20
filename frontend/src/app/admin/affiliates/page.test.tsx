/**
 * Admin Affiliates Page Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AffiliatesAdminPage from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  })),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon">+</span>,
  Edit: () => <span data-testid="edit-icon">edit</span>,
  Trash2: () => <span data-testid="trash-icon">trash</span>,
  TrendingUp: () => <span data-testid="trending-up-icon">trend</span>,
  Toggle: () => <span data-testid="toggle-icon">toggle</span>,
}));

const mockPartners = [
  {
    id: 'partner-1',
    name: 'NordVPN',
    logoUrl: 'https://example.com/nordvpn.png',
    affiliateUrlTemplate: 'https://go.nordvpn.com?aff={affId}',
    priority: 1,
    isActive: true,
    commissionType: 'percentage' as const,
    totalClicks: 1500,
    totalRevenue: 3200.5,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'partner-2',
    name: 'ExpressVPN',
    logoUrl: undefined,
    affiliateUrlTemplate: 'https://go.expressvpn.com?ref={affId}',
    priority: 2,
    isActive: false,
    commissionType: 'flat' as const,
    totalClicks: 800,
    totalRevenue: 1200.0,
    createdAt: '2024-02-01T00:00:00Z',
  },
];

describe('AffiliatesAdminPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Affiliate Partners" heading', () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<AffiliatesAdminPage />);

    expect(screen.getByText('Affiliate Partners')).toBeInTheDocument();
  });

  it('renders loading state initially', () => {
    // Never resolves during this test
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

    render(<AffiliatesAdminPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders "Add Partner" button', () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<AffiliatesAdminPage />);

    expect(screen.getByText('Add Partner')).toBeInTheDocument();
  });

  it('renders partner list after fetch resolves', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPartners,
    });

    render(<AffiliatesAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('NordVPN')).toBeInTheDocument();
      expect(screen.getByText('ExpressVPN')).toBeInTheDocument();
    });
  });

  it('renders active/inactive status badges', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPartners,
    });

    render(<AffiliatesAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('renders empty state when no partners', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<AffiliatesAdminPage />);

    await waitFor(() => {
      expect(screen.getByText(/No affiliate partners yet/i)).toBeInTheDocument();
    });
  });

  it('calls toggle endpoint on toggle click', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPartners,
    });
    global.fetch = fetchMock;

    render(<AffiliatesAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('NordVPN')).toBeInTheDocument();
    });

    // Click the "Off" toggle button for the active partner
    const toggleButtons = screen.getAllByTitle(/Deactivate|Activate/i);
    fireEvent.click(toggleButtons[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/affiliates/partner-1/toggle'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  it('calls delete endpoint with confirmation on delete click', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPartners,
    });
    global.fetch = fetchMock;

    // Mock window.confirm to return true
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AffiliatesAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('NordVPN')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/affiliates/partner-1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    jest.restoreAllMocks();
  });

  it('does not call delete when confirmation is cancelled', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPartners,
    });
    global.fetch = fetchMock;

    jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(<AffiliatesAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('NordVPN')).toBeInTheDocument();
    });

    const callCountBeforeDelete = fetchMock.mock.calls.length;
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    // No additional fetch calls should be made
    expect(fetchMock.mock.calls.length).toBe(callCountBeforeDelete);

    jest.restoreAllMocks();
  });

  it('shows error message when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    render(<AffiliatesAdminPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch partners/i)).toBeInTheDocument();
    });
  });
});
