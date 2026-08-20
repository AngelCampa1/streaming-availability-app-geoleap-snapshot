/**
 * SupportDashboard Component Tests
 *
 * Tests the main support dashboard with customer search, tab navigation,
 * and integration with all support sub-components.
 */

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupportDashboard } from '../SupportDashboard';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import {
  createMockSupportUser,
  createMockMetrics,
  createMockCustomer,
} from '@/__tests__/support/utils/mockFactories';

// Mock usePermissions hook
jest.mock('@/hooks/usePermissions');

// Mock child components to focus on SupportDashboard logic
jest.mock('../CustomerBillingOverview', () => ({
  CustomerBillingOverview: ({ customer, onActionComplete }: any) => (
    <div data-testid="customer-billing-overview">
      Billing for {customer.name}
      <button onClick={() => onActionComplete('test')}>Complete Action</button>
    </div>
  ),
}));

jest.mock('../PaymentMethodManager', () => ({
  PaymentMethodManager: ({ customerId, onUpdate }: any) => (
    <div data-testid="payment-method-manager">
      Payment methods for {customerId}
      <button onClick={onUpdate}>Update</button>
    </div>
  ),
}));

jest.mock('../ManualPaymentProcessor', () => ({
  ManualPaymentProcessor: ({ customer, onPaymentProcessed }: any) => (
    <div data-testid="manual-payment-processor">
      Process payment for {customer.name}
      <button onClick={() => onPaymentProcessed(50)}>Process Payment</button>
    </div>
  ),
}));

jest.mock('../SubscriptionModifier', () => ({
  SubscriptionModifier: ({ customerId, onModificationComplete }: any) => (
    <div data-testid="subscription-modifier">
      Modify subscription for {customerId}
      <button onClick={() => onModificationComplete('upgrade')}>Complete Modification</button>
    </div>
  ),
}));

jest.mock('../InvoiceManager', () => ({
  InvoiceManager: ({ customerId, onInvoiceAction }: any) => (
    <div data-testid="invoice-manager">
      Invoices for {customerId}
      <button onClick={() => onInvoiceAction('regenerated')}>Invoice Action</button>
    </div>
  ),
}));

jest.mock('../RefundProcessor', () => ({
  RefundProcessor: ({ customerId, onRefundProcessed }: any) => (
    <div data-testid="refund-processor">
      Refunds for {customerId}
      <button onClick={() => onRefundProcessed(25)}>Process Refund</button>
    </div>
  ),
}));

jest.mock('../SupportActionHistory', () => ({
  SupportActionHistory: ({ customerId }: any) => (
    <div data-testid="support-action-history">History for {customerId}</div>
  ),
}));

// Import usePermissions after mocking
import { usePermissions } from '@/hooks/usePermissions';
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>;

/**
 * Helper function to create mock permissions object
 */
const createMockPermissions = (permissionMap: Record<string, boolean> = {}) => {
  const defaultPermissions = {
    hasPermission: (permission: string) => permissionMap[permission] ?? false,
    hasAnyPermission: (permissions: string[]) => permissions.some(p => permissionMap[p] ?? false),
    hasRole: (_role: string) => false,
    permissions: Object.keys(permissionMap).filter(key => permissionMap[key]),
    roles: [],
    canSearchBasic: () => permissionMap['view_customer_overview'] ?? false,
    canSearchFull: () => permissionMap['view_customer_overview'] ?? false,
    canViewContentDetails: () => permissionMap['view_customer_overview'] ?? false,
    canViewProfile: () => false,
    canEditProfile: () => false,
    canManageWatchlist: () => false,
    canManagePreferences: () => false,
    canViewUsers: () => false,
    canManageUsers: () => false,
    canManageRoles: () => false,
    canConfigureSystem: () => false,
    canViewAnalytics: () => false,
    isGuest: () => true,
    isUser: () => false,
    isPremium: () => false,
    isAdmin: () => false,
    isSuperAdmin: () => false,
    hasAnyAdminAccess: () => false,
    hasFullContentAccess: () => false,
    canAccessAdminPanel: () => false,
    canAccessUserSettings: () => false,
    canAccessPremiumFeatures: () => false,
  };

  return () => defaultPermissions;
};

describe('SupportDashboard', () => {
  const mockUser = createMockSupportUser();
  const mockMetrics = createMockMetrics();
  const mockCustomer = createMockCustomer();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default permission mock - all permissions granted
    mockUsePermissions.mockReturnValue(
      createMockPermissions({
        'view_customer_overview': true,
        'view_billing_details': true,
        'process_payments': true,
        'modify_subscriptions': true,
        'manage_invoices': true,
        'process_refunds': true,
        'view_action_history': true,
        'view_sensitive_data': true,
      })()
    );
  });

  describe('Initial Rendering', () => {
    it('renders dashboard header with current user information', () => {
      render(<SupportDashboard currentUser={mockUser} />);

      expect(screen.getByText('Customer Support Dashboard')).toBeInTheDocument();
      expect(screen.getByText(`Logged in as ${mockUser.name} (${mockUser.role.name})`)).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('loads and displays metrics cards on mount', async () => {
      server.use(
        http.get('/api/support/metrics', () => {
          return HttpResponse.json(mockMetrics);
        })
      );

      render(<SupportDashboard currentUser={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Active Customers')).toBeInTheDocument();
        expect(screen.getByText(mockMetrics.totalCustomers.toLocaleString())).toBeInTheDocument();
        expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
        expect(screen.getByText('Failed Payments')).toBeInTheDocument();
        expect(screen.getByText('Pending Refunds')).toBeInTheDocument();
      });
    });

    it('displays customer search input', () => {
      render(<SupportDashboard currentUser={mockUser} />);

      const searchInput = screen.getByPlaceholderText(/search by email, customer id, or phone/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('shows welcome message when no customer selected', () => {
      render(<SupportDashboard currentUser={mockUser} />);

      expect(screen.getByText('Welcome to Support Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/search for a customer above to get started/i)).toBeInTheDocument();
    });
  });

  describe('Customer Search', () => {
    it('searches customer by email successfully', async () => {
      const user = userEvent.setup();

      server.use(
        http.get('/api/support/customers/search', ({ request }) => {
          const url = new URL(request.url);
          const query = url.searchParams.get('query');

          return HttpResponse.json([{ ...mockCustomer, email: query }]);
        })
      );

      render(<SupportDashboard currentUser={mockUser} />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      await user.type(searchInput, 'customer@example.com');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(mockCustomer.name!)).toBeInTheDocument();
        expect(screen.getByText(mockCustomer.email)).toBeInTheDocument();
      });
    });

    it('searches customer on Enter key press', async () => {
      const user = userEvent.setup();

      server.use(
        http.get('/api/support/customers/search', () => {
          return HttpResponse.json([mockCustomer]);
        })
      );

      render(<SupportDashboard currentUser={mockUser} />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      await user.type(searchInput, 'customer@example.com{Enter}');

      await waitFor(() => {
        expect(screen.getByText(mockCustomer.name!)).toBeInTheDocument();
      });
    });

    it('shows loading state during search', async () => {
      const user = userEvent.setup();

      server.use(
        http.get('/api/support/customers/search', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json([mockCustomer]);
        })
      );

      render(<SupportDashboard currentUser={mockUser} />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      await user.type(searchInput, 'test');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Loading spinner should appear
      expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
    });

    it('handles search with no results', async () => {
      const user = userEvent.setup();

      server.use(
        http.get('/api/support/customers/search', () => {
          return HttpResponse.json([]);
        })
      );

      render(<SupportDashboard currentUser={mockUser} />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      await user.type(searchInput, 'nonexistent@example.com');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      // Should not show customer info
      await waitFor(() => {
        expect(screen.queryByText(mockCustomer.name!)).not.toBeInTheDocument();
      });
    });

    it('displays error notification on search failure', async () => {
      const user = userEvent.setup();

      server.use(
        http.get('/api/support/customers/search', () => {
          return HttpResponse.error();
        })
      );

      render(<SupportDashboard currentUser={mockUser} />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      await user.type(searchInput, 'test@example.com');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/customer search failed/i)).toBeInTheDocument();
      });
    });

    it('disables search button when query is empty', () => {
      render(<SupportDashboard currentUser={mockUser} />);

      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toBeDisabled();
    });
  });

  describe('Customer Display', () => {
    beforeEach(async () => {
      server.use(
        http.get('/api/support/customers/search', () => {
          return HttpResponse.json([mockCustomer]);
        })
      );

      const user = userEvent.setup();
      render(<SupportDashboard currentUser={mockUser} />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText(mockCustomer.name!)).toBeInTheDocument();
      });
    });

    it('displays customer status badge', () => {
      const statusBadge = screen.getByText(mockCustomer.status);
      expect(statusBadge).toBeInTheDocument();
    });

    it('displays customer tier badge', () => {
      const tierBadge = screen.getByText(mockCustomer.tier);
      expect(tierBadge).toBeInTheDocument();
    });

    it('shows sensitive data toggle button when user has permission', () => {
      const buttons = screen.getAllByRole('button');
      const eyeButton = buttons.find(btn => btn.querySelector('[class*="eye"]'));
      expect(eyeButton).toBeDefined();
    });

    it('hides sensitive data toggle when user lacks permission', async () => {
      cleanup(); // Clean up previous render from beforeEach
      mockUsePermissions.mockReturnValue(
        createMockPermissions({
          'view_customer_overview': true,
          'view_sensitive_data': false  // No sensitive data permission
        })()
      );

      server.use(
        http.get('/api/support/customers/search', () => {
          return HttpResponse.json([mockCustomer]);
        })
      );

      const user = userEvent.setup();
      render(<SupportDashboard currentUser={mockUser} />);

      // Load a customer
      const searchInput = screen.getByPlaceholderText(/search by email/i);
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText(mockCustomer.name!)).toBeInTheDocument();
      });

      // No eye icon button should be visible
      const buttons = screen.getAllByRole('button');
      const eyeButton = buttons.find(btn => btn.querySelector('[class*="eye"]'));
      expect(eyeButton).toBeUndefined();
    });

    it('clears active customer when close button clicked', async () => {
      const user = userEvent.setup();

      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg?.classList.toString().includes('lucide-x');
      });

      if (closeButton) {
        await user.click(closeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText(mockCustomer.name!)).not.toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(async () => {
      server.use(
        http.get('/api/support/customers/search', () => {
          return HttpResponse.json([mockCustomer]);
        })
      );

      const user = userEvent.setup();
      render(<SupportDashboard currentUser={mockUser} />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText(mockCustomer.name!)).toBeInTheDocument();
      });
    });

    it('displays all tabs based on permissions', () => {
      expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /billing/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /payments/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /subscriptions/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /invoices/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refunds/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
    });

    it('switches to billing tab when clicked', async () => {
      const user = userEvent.setup();

      const billingTab = screen.getByRole('button', { name: /billing/i });
      await user.click(billingTab);

      await waitFor(() => {
        expect(screen.getByTestId('payment-method-manager')).toBeInTheDocument();
      });
    });

    it('switches to payments tab when clicked', async () => {
      const user = userEvent.setup();

      const paymentsTab = screen.getByRole('button', { name: /payments/i });
      await user.click(paymentsTab);

      await waitFor(() => {
        expect(screen.getByTestId('manual-payment-processor')).toBeInTheDocument();
      });
    });

    it('switches to subscriptions tab when clicked', async () => {
      const user = userEvent.setup();

      const subscriptionsTab = screen.getByRole('button', { name: /subscriptions/i });
      await user.click(subscriptionsTab);

      await waitFor(() => {
        expect(screen.getByTestId('subscription-modifier')).toBeInTheDocument();
      });
    });

    it('switches to invoices tab when clicked', async () => {
      const user = userEvent.setup();

      const invoicesTab = screen.getByRole('button', { name: /invoices/i });
      await user.click(invoicesTab);

      await waitFor(() => {
        expect(screen.getByTestId('invoice-manager')).toBeInTheDocument();
      });
    });

    it('switches to refunds tab when clicked', async () => {
      const user = userEvent.setup();

      const refundsTab = screen.getByRole('button', { name: /refunds/i });
      await user.click(refundsTab);

      await waitFor(() => {
        expect(screen.getByTestId('refund-processor')).toBeInTheDocument();
      });
    });

    it('switches to history tab when clicked', async () => {
      const user = userEvent.setup();

      const historyTab = screen.getByRole('button', { name: /history/i });
      await user.click(historyTab);

      await waitFor(() => {
        expect(screen.getByTestId('support-action-history')).toBeInTheDocument();
      });
    });

    it('disables non-overview tabs when no customer selected', () => {
      cleanup(); // Clean up previous render from beforeEach
      render(<SupportDashboard currentUser={mockUser} />);

      expect(screen.getByRole('button', { name: /billing/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /payments/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /refunds/i })).toBeDisabled();
    });

    it('filters tabs based on user permissions', () => {
      cleanup(); // Clean up previous render from beforeEach
      mockUsePermissions.mockReturnValue(
        createMockPermissions({
          'view_customer_overview': true,
          'process_refunds': false, // No refunds permission
        })()
      );

      render(<SupportDashboard currentUser={mockUser} />);

      expect(screen.queryByRole('button', { name: /refunds/i })).not.toBeInTheDocument();
    });
  });

  describe('Notifications', () => {
    beforeEach(async () => {
      server.use(
        http.get('/api/support/customers/search', () => {
          return HttpResponse.json([mockCustomer]);
        })
      );

      const user = userEvent.setup();
      render(<SupportDashboard currentUser={mockUser} />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText(mockCustomer.name!)).toBeInTheDocument();
      });
    });

    it('shows notification when action completed', async () => {
      const user = userEvent.setup();

      const billingTab = screen.getByRole('button', { name: /billing/i });
      await user.click(billingTab);

      await waitFor(() => {
        expect(screen.getByTestId('payment-method-manager')).toBeInTheDocument();
      });

      const updateButton = screen.getByRole('button', { name: /update/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/payment methods updated/i)).toBeInTheDocument();
      });
    });

    it('shows notification count badge when notifications exist', async () => {
      const user = userEvent.setup();

      const paymentsTab = screen.getByRole('button', { name: /payments/i });
      await user.click(paymentsTab);

      const processButton = screen.getByRole('button', { name: /process payment/i });
      await user.click(processButton);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // Notification count
      });
    });

    it('auto-dismisses notifications after 5 seconds', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      const paymentsTab = screen.getByRole('button', { name: /payments/i });
      await user.click(paymentsTab);

      const processButton = screen.getByRole('button', { name: /process payment/i });
      await user.click(processButton);

      await waitFor(() => {
        expect(screen.getByText(/payment of \$50 processed successfully/i)).toBeInTheDocument();
      });

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.queryByText(/payment of \$50 processed successfully/i)).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('closes notification when close button clicked', async () => {
      const user = userEvent.setup();

      const refundsTab = screen.getByRole('button', { name: /refunds/i });
      await user.click(refundsTab);

      const processButton = screen.getByRole('button', { name: /process refund/i });
      await user.click(processButton);

      await waitFor(() => {
        expect(screen.getByText(/refund of \$25 processed/i)).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByRole('button');
      const notificationCloseButton = closeButtons.find(btn => {
        const parent = btn.closest('[class*="fixed"]');
        return parent !== null;
      });

      if (notificationCloseButton) {
        await user.click(notificationCloseButton);
      }

      await waitFor(() => {
        expect(screen.queryByText(/refund of \$25 processed/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Mobile View', () => {
    it('renders mobile menu toggle when isMobile is true', async () => {
      server.use(
        http.get('/api/support/customers/search', () => {
          return HttpResponse.json([mockCustomer]);
        })
      );

      const user = userEvent.setup();
      render(<SupportDashboard currentUser={mockUser} isMobile={true} />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Wait for customer to load first
      await waitFor(() => {
        expect(screen.getByText(mockCustomer.name!)).toBeInTheDocument();
      });

      // Then check for mobile menu toggle (shows active tab name, which is "Overview" after loading customer)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
      });
    });

    it('opens mobile menu when toggle clicked', async () => {
      server.use(
        http.get('/api/support/customers/search', () => {
          return HttpResponse.json([mockCustomer]);
        })
      );

      const user = userEvent.setup();
      render(<SupportDashboard currentUser={mockUser} isMobile={true} />);

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Wait for customer to load first
      await waitFor(() => {
        expect(screen.getByText(mockCustomer.name!)).toBeInTheDocument();
      });

      // Then interact with mobile menu toggle (shows active tab name, which is "Overview")
      const menuToggle = await screen.findByRole('button', { name: /overview/i });
      await user.click(menuToggle);

      // All tab options should be visible
      await waitFor(() => {
        const allButtons = screen.getAllByRole('button');
        const billingButton = allButtons.find(btn => btn.textContent?.includes('Billing'));
        expect(billingButton).toBeInTheDocument();
      });
    });
  });

  describe('Metrics Refresh', () => {
    it('refreshes metrics after payment processed', async () => {
      let metricsCalls = 0;
      server.use(
        http.get('/api/support/metrics', () => {
          metricsCalls++;
          return HttpResponse.json(mockMetrics);
        }),
        http.get('/api/support/customers/search', () => {
          return HttpResponse.json([mockCustomer]);
        })
      );

      const user = userEvent.setup();
      render(<SupportDashboard currentUser={mockUser} />);

      // Wait for initial metrics load
      await waitFor(() => {
        expect(metricsCalls).toBe(1);
      });

      const searchInput = screen.getByPlaceholderText(/search by email/i);
      await user.type(searchInput, 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(screen.getByText(mockCustomer.name!)).toBeInTheDocument();
      });

      const paymentsTab = screen.getByRole('button', { name: /payments/i });
      await user.click(paymentsTab);

      const processButton = screen.getByRole('button', { name: /process payment/i });
      await user.click(processButton);

      // Metrics should be refreshed
      await waitFor(() => {
        expect(metricsCalls).toBe(2);
      });
    });
  });
});
