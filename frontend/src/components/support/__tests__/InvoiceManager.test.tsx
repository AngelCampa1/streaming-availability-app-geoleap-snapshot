/**
 * InvoiceManager Component Tests
 * Tests for invoice management, filtering, and bulk actions
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { InvoiceManager } from '../InvoiceManager';
import { SupportInvoice } from '@/lib/types/support';

// Mock usePermissions hook
jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: jest.fn(() => ({
    hasPermission: jest.fn((_permission: string) => {
      // Grant all permissions by default
      return true;
    }),
  })),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
  FileText: () => <div data-testid="file-text-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Send: () => <div data-testid="send-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  DollarSign: () => <div data-testid="dollar-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-icon" />,
  AlertTriangle: () => <div data-testid="alert-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Archive: () => <div data-testid="archive-icon" />,
}));

const mockInvoices: SupportInvoice[] = [
  {
    id: 'inv_1',
    customerId: 'cust_123',
    number: 'INV-001',
    description: 'Subscription payment',
    status: 'paid',
    amount: 49.99,
    amountDue: 0,
    amountPaid: 49.99,
    currency: 'USD',
    createdAt: '2024-01-15T10:00:00Z',
    dueDate: '2024-02-15T10:00:00Z',
    paidAt: '2024-01-16T10:00:00Z',
    lineItems: [
      {
        id: 'li_1',
        description: 'Premium Plan',
        quantity: 1,
        amount: 49.99,
      },
    ],
  },
  {
    id: 'inv_2',
    customerId: 'cust_123',
    number: 'INV-002',
    description: 'Annual subscription',
    status: 'open',
    amount: 499.99,
    amountDue: 499.99,
    amountPaid: 0,
    currency: 'USD',
    createdAt: '2024-02-01T10:00:00Z',
    dueDate: '2024-03-01T10:00:00Z',
    lineItems: [],
  },
  {
    id: 'inv_3',
    customerId: 'cust_123',
    number: 'INV-003',
    description: 'Draft invoice',
    status: 'draft',
    amount: 99.99,
    amountDue: 99.99,
    amountPaid: 0,
    currency: 'USD',
    createdAt: '2024-02-10T10:00:00Z',
    lineItems: [],
  },
];

describe('InvoiceManager', () => {
  const mockOnInvoiceAction = jest.fn();
  const customerId = 'cust_123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Default MSW handler for invoices
    server.use(
      http.get('/api/support/customers/:customerId/invoices', () => {
        return HttpResponse.json(mockInvoices);
      })
    );
  });

  describe('Initial Rendering', () => {
    it('loads and displays invoices', async () => {
      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      expect(screen.getByText('Loading invoices...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Invoice Management')).toBeInTheDocument();
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
        expect(screen.getByText('Invoice #INV-002')).toBeInTheDocument();
        expect(screen.getByText('Invoice #INV-003')).toBeInTheDocument();
      });
    });

    it('displays invoice count', async () => {
      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoices (3)')).toBeInTheDocument();
      });
    });

    it('displays total amounts', async () => {
      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText(/Total: \$649.97/)).toBeInTheDocument();
        expect(screen.getByText(/Due: \$599.98/)).toBeInTheDocument();
      });
    });

    it('handles loading error', async () => {
      server.use(
        http.get('/api/support/customers/:customerId/invoices', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load customer invoices')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters invoices by search query', async () => {
      const user = userEvent.setup();
      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by invoice number/);
      await user.type(searchInput, 'INV-001');

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
        expect(screen.queryByText('Invoice #INV-002')).not.toBeInTheDocument();
        expect(screen.queryByText('Invoice #INV-003')).not.toBeInTheDocument();
      });
    });

    it('searches by description', async () => {
      const user = userEvent.setup();
      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by invoice number/);
      await user.type(searchInput, 'annual');

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-002')).toBeInTheDocument();
        expect(screen.queryByText('Invoice #INV-001')).not.toBeInTheDocument();
      });
    });

    it('shows no results message when no matches', async () => {
      const user = userEvent.setup();
      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by invoice number/);
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No invoices match your current filters.')).toBeInTheDocument();
      });
    });
  });

  describe('Status Filtering', () => {
    it('filters by status', async () => {
      const user = userEvent.setup();
      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
      });

      // Open filters
      const filterButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filterButton);

      // Check "paid" status
      const paidCheckbox = screen.getByRole('checkbox', { name: /paid/i });
      await user.click(paidCheckbox);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
        expect(screen.queryByText('Invoice #INV-002')).not.toBeInTheDocument();
        expect(screen.queryByText('Invoice #INV-003')).not.toBeInTheDocument();
      });
    });

    it('filters by multiple statuses', async () => {
      const user = userEvent.setup();
      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
      });

      const filterButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filterButton);

      const paidCheckbox = screen.getByRole('checkbox', { name: /paid/i });
      const openCheckbox = screen.getByRole('checkbox', { name: /open/i });

      await user.click(paidCheckbox);
      await user.click(openCheckbox);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
        expect(screen.getByText('Invoice #INV-002')).toBeInTheDocument();
        expect(screen.queryByText('Invoice #INV-003')).not.toBeInTheDocument();
      });
    });

    it('clears filters', async () => {
      const user = userEvent.setup();
      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
      });

      const filterButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filterButton);

      const paidCheckbox = screen.getByRole('checkbox', { name: /paid/i });
      await user.click(paidCheckbox);

      await waitFor(() => {
        expect(screen.queryByText('Invoice #INV-002')).not.toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: /Clear Filters/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
        expect(screen.getByText('Invoice #INV-002')).toBeInTheDocument();
        expect(screen.getByText('Invoice #INV-003')).toBeInTheDocument();
      });
    });
  });

  describe('Invoice Actions', () => {
    it('downloads invoice', async () => {
      const user = userEvent.setup();

      // Mock URL methods if they don't exist
      if (!global.URL.createObjectURL) {
        global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      }
      if (!global.URL.revokeObjectURL) {
        global.URL.revokeObjectURL = jest.fn();
      }

      const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL');
      const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL');

      server.use(
        http.post('/api/support/invoices/:invoiceId/download', () => {
          return HttpResponse.arrayBuffer(new ArrayBuffer(100));
        })
      );

      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
      });

      const downloadButtons = screen.getAllByRole('button', { name: /Download/i });
      await user.click(downloadButtons[0]);

      await waitFor(() => {
        expect(mockOnInvoiceAction).toHaveBeenCalledWith('download');
      });

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('sends draft invoice', async () => {
      const user = userEvent.setup();

      server.use(
        http.post('/api/support/invoices/:invoiceId/send', () => {
          return HttpResponse.json({ success: true });
        })
      );

      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-003')).toBeInTheDocument();
      });

      const sendButton = screen.getByRole('button', { name: /^Send$/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockOnInvoiceAction).toHaveBeenCalledWith('send');
      });
    });

    it('marks invoice as paid', async () => {
      const user = userEvent.setup();

      server.use(
        http.post('/api/support/invoices/:invoiceId/mark_paid', () => {
          return HttpResponse.json({ success: true });
        })
      );

      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-002')).toBeInTheDocument();
      });

      const markPaidButton = screen.getByRole('button', { name: /Mark Paid/i });
      await user.click(markPaidButton);

      await waitFor(() => {
        expect(mockOnInvoiceAction).toHaveBeenCalledWith('mark_paid');
      });
    });

    it('voids invoice with confirmation', async () => {
      const user = userEvent.setup();
      global.confirm = jest.fn(() => true);

      server.use(
        http.post('/api/support/invoices/:invoiceId/void', () => {
          return HttpResponse.json({ success: true });
        })
      );

      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-003')).toBeInTheDocument();
      });

      const voidButtons = screen.getAllByRole('button', { name: /Void/i });
      await user.click(voidButtons[0]);

      expect(global.confirm).toHaveBeenCalled();

      await waitFor(() => {
        expect(mockOnInvoiceAction).toHaveBeenCalledWith('void');
      });
    });

    it('handles action error', async () => {
      const user = userEvent.setup();

      server.use(
        http.post('/api/support/invoices/:invoiceId/download', () => {
          return HttpResponse.json({ message: 'Download failed' }, { status: 500 });
        })
      );

      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
      });

      const downloadButtons = screen.getAllByRole('button', { name: /Download/i });
      await user.click(downloadButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Download failed')).toBeInTheDocument();
      });
    });
  });

  describe('Bulk Actions', () => {
    it('selects multiple invoices', async () => {
      const user = userEvent.setup();
      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByText('2 invoices selected')).toBeInTheDocument();
      });
    });

    it('executes bulk send action', async () => {
      const user = userEvent.setup();

      server.use(
        http.post('/api/support/invoices/:invoiceId/send', () => {
          return HttpResponse.json({ success: true });
        })
      );

      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      const bulkSendButton = screen.getAllByRole('button', { name: /Send/i })[0];
      await user.click(bulkSendButton);

      await waitFor(() => {
        expect(mockOnInvoiceAction).toHaveBeenCalledWith('bulk_send');
      });
    });

    it('clears selection', async () => {
      const user = userEvent.setup();
      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      await waitFor(() => {
        expect(screen.getByText('1 invoice selected')).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: /Clear Selection/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByText('1 invoice selected')).not.toBeInTheDocument();
      });
    });
  });

  describe('Date Range Filtering', () => {
    it('filters by date range', async () => {
      const user = userEvent.setup();
      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
      });

      const dateSelect = screen.getByRole('combobox');
      await user.selectOptions(dateSelect, '30d');

      // This would filter based on current date, so we can't assert exact results
      // Just verify the component doesn't crash
      await waitFor(() => {
        expect(screen.getByText('Invoice Management')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('refreshes invoice list', async () => {
      const user = userEvent.setup();
      let callCount = 0;

      server.use(
        http.get('/api/support/customers/:customerId/invoices', () => {
          callCount++;
          return HttpResponse.json(mockInvoices);
        })
      );

      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
      });

      expect(callCount).toBe(1);

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(callCount).toBe(2);
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no invoices', async () => {
      server.use(
        http.get('/api/support/customers/:customerId/invoices', () => {
          return HttpResponse.json([]);
        })
      );

      render(<InvoiceManager customerId={customerId} onInvoiceAction={mockOnInvoiceAction} />);

      await waitFor(() => {
        expect(screen.getByText('No Invoices Found')).toBeInTheDocument();
        expect(screen.getByText('This customer has no invoices.')).toBeInTheDocument();
      });
    });
  });
});
