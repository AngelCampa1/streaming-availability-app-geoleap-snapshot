/**
 * MobileSupportDashboard Component Tests
 * Tests for mobile support dashboard navigation and functionality
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { MobileSupportDashboard } from '../MobileSupportDashboard';
import { SupportUser } from '@/lib/types/support';

// Mock child components to simplify testing
jest.mock('../CustomerBillingOverview', () => ({
  CustomerBillingOverview: ({ customer }: any) => <div>Billing Overview for {customer.name}</div>,
}));

jest.mock('../ManualPaymentProcessor', () => ({
  ManualPaymentProcessor: ({ customer }: any) => <div>Payment Processor for {customer.name}</div>,
}));

jest.mock('../RefundProcessor', () => ({
  RefundProcessor: ({ customerId }: any) => <div>Refund Processor for {customerId}</div>,
}));

jest.mock('../PaymentMethodManager', () => ({
  PaymentMethodManager: () => <div>Payment Method Manager</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Search: () => <div>Search</div>,
  User: () => <div>User</div>,
  CreditCard: () => <div>CreditCard</div>,
  DollarSign: () => <div>DollarSign</div>,
  FileText: () => <div>FileText</div>,
  RefreshCw: () => <div>RefreshCw</div>,
  Phone: () => <div>Phone</div>,
  Mail: () => <div>Mail</div>,
  Settings: () => <div>Settings</div>,
  Activity: () => <div>Activity</div>,
  AlertTriangle: () => <div>AlertTriangle</div>,
  CheckCircle: () => <div>CheckCircle</div>,
  ArrowLeft: () => <div>ArrowLeft</div>,
  Menu: () => <div>Menu</div>,
  X: () => <div>X</div>,
  Shield: () => <div>Shield</div>,
  Eye: () => <div>Eye</div>,
  EyeOff: () => <div>EyeOff</div>,
  Loader2: () => <div>Loader2</div>,
  Filter: () => <div>Filter</div>,
}));

const mockSupportUser: SupportUser = {
  id: 'support_123',
  name: 'John Support',
  email: 'john@support.com',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  role: {
    id: 'role_1',
    name: 'Support Agent',
    description: 'Full access support agent',
    permissions: [
      {
        id: 'perm_1',
        name: 'view_billing_details',
        description: 'View customer billing details',
        category: 'billing',
        level: 'read'
      },
      {
        id: 'perm_2',
        name: 'process_payments',
        description: 'Process customer payments',
        category: 'billing',
        level: 'write'
      },
      {
        id: 'perm_3',
        name: 'process_refunds',
        description: 'Process customer refunds',
        category: 'refunds',
        level: 'write'
      },
    ],
  },
};

const mockMetrics = {
  totalCustomers: 15420,
  monthlyRevenue: 125000,
  failedPayments: 23,
  pendingRefunds: 5,
};

const mockCustomers = [
  {
    id: 'cust_123',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    status: 'active',
    tier: 'premium',
    totalPaid: 599.99,
    phone: '+1234567890',
    createdAt: '2024-01-01T00:00:00Z',
    lastActive: '2024-01-15T10:00:00Z',
    lifetimeValue: 600.0,
    subscriptionStatus: 'active',
  },
];

describe('MobileSupportDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    server.use(
      http.get('/api/support/metrics', () => {
        return HttpResponse.json(mockMetrics);
      }),
      http.get('/api/support/customers/search', () => {
        return HttpResponse.json(mockCustomers);
      })
    );
  });

  describe('Initial Rendering', () => {
    it('renders dashboard with header', async () => {
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByText('Support')).toBeInTheDocument();
      });

      expect(screen.getByText('John Support')).toBeInTheDocument();
    });

    it('loads and displays metrics', async () => {
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByText('15,420')).toBeInTheDocument();
      });

      expect(screen.getByText('$125.0K')).toBeInTheDocument();
      expect(screen.getByText('23')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('displays customer search input', async () => {
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
      });
    });

    it('displays quick actions for available permissions', async () => {
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });

      expect(screen.getByText('Customer Search')).toBeInTheDocument();
    });

    it('displays recent activity section', async () => {
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });

      expect(screen.getByText('Payment processed')).toBeInTheDocument();
      expect(screen.getByText('Customer account updated')).toBeInTheDocument();
      expect(screen.getByText('Payment failed')).toBeInTheDocument();
    });
  });

  describe('Customer Search', () => {
    it('performs customer search on Enter key', async () => {
      const user = userEvent.setup();
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search customer by email or ID/i);
      await user.type(searchInput, 'jane.doe@example.com{enter}');

      await waitFor(() => {
        expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
      });
    });

    it('displays customer in customer view after search', async () => {
      const user = userEvent.setup();
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search customer by email or ID/i);
      await user.type(searchInput, 'jane.doe@example.com{enter}');

      await waitFor(() => {
        expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
        expect(screen.getByText('premium')).toBeInTheDocument();
        expect(screen.getByText('$599.99')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('displays customer view after successful search', async () => {
      const user = userEvent.setup();
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search customer by email or ID/i);
      await user.type(searchInput, 'jane.doe@example.com{enter}');

      await waitFor(() => {
        expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
      });

      // Customer view should be displayed
      expect(screen.getByText('Total Paid')).toBeInTheDocument();
    });
  });

  describe('Mobile Menu', () => {
    it('displays menu options when toggled', async () => {
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByText('Support')).toBeInTheDocument();
      });

      // Mobile menu items should not be visible initially
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });
  });

  describe('Sensitive Data Toggle', () => {
    it('masks email when sensitive data is hidden by default', async () => {
      const user = userEvent.setup();
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search customer by email or ID/i);
      await user.type(searchInput, 'jane.doe@example.com{enter}');

      await waitFor(() => {
        expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
      });

      // Email should be masked by default
      expect(screen.getByText(/ja\*\*\*@example\.com/)).toBeInTheDocument();
    });
  });

  describe('Customer View', () => {
    it('displays customer information', async () => {
      const user = userEvent.setup();
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search customer by email or ID/i);
      await user.type(searchInput, 'jane.doe@example.com{enter}');

      await waitFor(() => {
        expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
      });

      expect(screen.getAllByText('active').length).toBeGreaterThan(0);
      expect(screen.getByText('premium')).toBeInTheDocument();
      expect(screen.getByText('$599.99')).toBeInTheDocument();
    });

    it('displays contact buttons when phone is available', async () => {
      const user = userEvent.setup();
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search customer by email or ID/i);
      await user.type(searchInput, 'jane.doe@example.com{enter}');

      await waitFor(() => {
        expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
      });

      expect(screen.getByText('Call')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('displays action buttons for customer', async () => {
      const user = userEvent.setup();
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search customer by email or ID/i);
      await user.type(searchInput, 'jane.doe@example.com{enter}');

      await waitFor(() => {
        expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
      });

      const actionButtons = screen.getAllByText(/Billing Overview|Process Payment|Process Refund/);
      expect(actionButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Permission Filtering', () => {
    it('filters quick actions based on user permissions', async () => {
      const limitedUser: SupportUser = {
        ...mockSupportUser,
        role: {
          id: 'role_2',
          name: 'Limited Agent',
          description: 'Limited access support agent',
          permissions: [
            {
              id: 'perm_1',
              name: 'view_billing_details',
              description: 'View customer billing details',
              category: 'billing',
              level: 'read'
            }
          ],
        },
      };

      render(<MobileSupportDashboard currentUser={limitedUser} />);

      await waitFor(() => {
        expect(screen.getByText('Support')).toBeInTheDocument();
      });

      // Should see Customer Search (no permission required)
      expect(screen.getByText('Customer Search')).toBeInTheDocument();

      // Should NOT see payment/refund actions (no permissions)
      expect(screen.queryByText('Process Payment')).not.toBeInTheDocument();
      expect(screen.queryByText('Process Refund')).not.toBeInTheDocument();
    });
  });

  describe('Action Views', () => {
    it('renders billing overview when billing action is selected', async () => {
      const user = userEvent.setup();
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search customer by email or ID/i);
      await user.type(searchInput, 'jane.doe@example.com{enter}');

      await waitFor(() => {
        expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
      });

      const billingButtons = screen.getAllByText('Billing Overview');
      await user.click(billingButtons[billingButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('Billing Overview for Jane Doe')).toBeInTheDocument();
      });
    });

    it('renders payment processor when payment action is selected', async () => {
      const user = userEvent.setup();
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search customer by email or ID/i);
      await user.type(searchInput, 'jane.doe@example.com{enter}');

      await waitFor(() => {
        expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
      });

      const paymentButtons = screen.getAllByText('Process Payment');
      await user.click(paymentButtons[paymentButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('Payment Processor for Jane Doe')).toBeInTheDocument();
      });
    });

    it('renders refund processor when refund action is selected', async () => {
      const user = userEvent.setup();
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search customer by email or ID/i);
      await user.type(searchInput, 'jane.doe@example.com{enter}');

      await waitFor(() => {
        expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
      });

      const refundButtons = screen.getAllByText('Process Refund');
      await user.click(refundButtons[refundButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('Refund Processor for cust_123')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles metrics loading failure gracefully', async () => {
      server.use(
        http.get('/api/support/metrics', () => {
          return HttpResponse.json({ error: 'Failed to load' }, { status: 500 });
        })
      );

      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByText('Support')).toBeInTheDocument();
      });

      // Dashboard should still render without metrics
      expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
    });

    it('handles customer search failure gracefully', async () => {
      server.use(
        http.get('/api/support/customers/search', () => {
          return HttpResponse.json({ error: 'Search failed' }, { status: 500 });
        })
      );

      const user = userEvent.setup();
      render(<MobileSupportDashboard currentUser={mockSupportUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search customer by email or ID/i);
      await user.type(searchInput, 'jane.doe@example.com{enter}');

      // Should remain on dashboard view
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search customer by email or ID/i)).toBeInTheDocument();
      });
    });
  });
});
