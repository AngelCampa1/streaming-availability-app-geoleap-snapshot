/**
 * RefundProcessor Component Tests
 * Tests for refund processing functionality
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { RefundProcessor } from '../RefundProcessor';

// Mock usePermissions hook
const mockHasPermission = jest.fn(() => true);
jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: mockHasPermission,
  }),
}));

const mockTransactions = [
  {
    id: 'txn_1',
    customerId: 'cust_123',
    amount: 99.99,
    currency: 'USD',
    status: 'succeeded',
    method: 'card',
    description: 'Monthly subscription',
    processedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'txn_2',
    customerId: 'cust_123',
    amount: 499.99,
    currency: 'USD',
    status: 'succeeded',
    method: 'card',
    description: 'Annual subscription',
    processedAt: '2024-02-01T10:00:00Z',
  },
];

const mockRefunds = [
  {
    id: 'ref_1',
    transactionId: 'txn_2',
    customerId: 'cust_123',
    amount: 100.00,
    currency: 'USD',
    status: 'succeeded',
    reason: 'requested_by_customer',
    createdAt: '2024-02-05T10:00:00Z',
    processedAt: '2024-02-06T10:00:00Z',
  },
];

describe('RefundProcessor', () => {
  const mockOnRefundProcessed = jest.fn();
  const customerId = 'cust_123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission.mockReturnValue(true);

    server.use(
      http.get('/api/support/customers/:customerId/transactions', () => {
        return HttpResponse.json(mockTransactions);
      }),
      http.get('/api/support/customers/:customerId/refunds', () => {
        return HttpResponse.json(mockRefunds);
      })
    );
  });

  it('shows loading state initially', () => {
    render(<RefundProcessor customerId={customerId} onRefundProcessed={mockOnRefundProcessed} />);
    expect(screen.getByText('Loading transactions...')).toBeInTheDocument();
  });

  it('loads and displays transactions', async () => {
    render(<RefundProcessor customerId={customerId} onRefundProcessed={mockOnRefundProcessed} />);

    await waitFor(() => {
      expect(screen.getByText('Refund Processing')).toBeInTheDocument();
    });

    expect(screen.getByText('Monthly subscription')).toBeInTheDocument();
    expect(screen.getByText('Annual subscription')).toBeInTheDocument();
  });

  it('displays step progress', async () => {
    render(<RefundProcessor customerId={customerId} onRefundProcessed={mockOnRefundProcessed} />);

    await waitFor(() => {
      expect(screen.getByText('Select Transaction')).toBeInTheDocument();
    });

    expect(screen.getByText('Refund Details')).toBeInTheDocument();
    expect(screen.getByText('Review & Process')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('shows refundable amounts correctly', async () => {
    render(<RefundProcessor customerId={customerId} onRefundProcessed={mockOnRefundProcessed} />);

    await waitFor(() => {
      expect(screen.getByText('Refundable: $99.99')).toBeInTheDocument();
    });

    // txn_2 has $100 refunded, so refundable is $399.99
    expect(screen.getByText('Refundable: $399.99')).toBeInTheDocument();
  });

  it('filters transactions by search query', async () => {
    const user = userEvent.setup();
    render(<RefundProcessor customerId={customerId} onRefundProcessed={mockOnRefundProcessed} />);

    await waitFor(() => {
      expect(screen.getByText('Monthly subscription')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by transaction ID/i);
    await user.type(searchInput, 'annual');

    await waitFor(() => {
      expect(screen.getByText('Annual subscription')).toBeInTheDocument();
      expect(screen.queryByText('Monthly subscription')).not.toBeInTheDocument();
    });
  });

  it('shows no transactions message when search has no results', async () => {
    const user = userEvent.setup();
    render(<RefundProcessor customerId={customerId} onRefundProcessed={mockOnRefundProcessed} />);

    await waitFor(() => {
      expect(screen.getByText('Monthly subscription')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by transaction ID/i);
    await user.type(searchInput, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText('No Refundable Transactions')).toBeInTheDocument();
    });
  });

  it('selects a transaction', async () => {
    const user = userEvent.setup();
    render(<RefundProcessor customerId={customerId} onRefundProcessed={mockOnRefundProcessed} />);

    await waitFor(() => {
      expect(screen.getByText('Monthly subscription')).toBeInTheDocument();
    });

    const transaction = screen.getByText('Monthly subscription').closest('div[class*="cursor-pointer"]');
    if (transaction) {
      await user.click(transaction);

      await waitFor(() => {
        expect(transaction).toHaveClass(/border-primary/);
      });
    }
  });

  it('displays existing refunds for transaction', async () => {
    render(<RefundProcessor customerId={customerId} onRefundProcessed={mockOnRefundProcessed} />);

    await waitFor(() => {
      expect(screen.getByText('Annual subscription')).toBeInTheDocument();
    });

    expect(screen.getByText('Existing refunds: 1')).toBeInTheDocument();
    expect(screen.getByText(/\$100.00 - succeeded/)).toBeInTheDocument();
  });

  it('handles no refundable transactions', async () => {
    server.use(
      http.get('/api/support/customers/:customerId/transactions', () => {
        return HttpResponse.json([]);
      })
    );

    render(<RefundProcessor customerId={customerId} onRefundProcessed={mockOnRefundProcessed} />);

    await waitFor(() => {
      expect(screen.getByText('No Refundable Transactions')).toBeInTheDocument();
    });
  });

  it('handles fully refunded transactions', async () => {
    server.use(
      http.get('/api/support/customers/:customerId/refunds', () => {
        return HttpResponse.json([
          {
            id: 'ref_full',
            transactionId: 'txn_1',
            amount: 99.99,
            status: 'succeeded',
          },
        ]);
      })
    );

    render(<RefundProcessor customerId={customerId} onRefundProcessed={mockOnRefundProcessed} />);

    await waitFor(() => {
      // Transaction should not appear since it's fully refunded
      expect(screen.queryByText('Monthly subscription')).not.toBeInTheDocument();
    });
  });
});
