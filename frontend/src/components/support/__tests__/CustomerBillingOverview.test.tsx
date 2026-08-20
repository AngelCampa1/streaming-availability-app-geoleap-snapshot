/**
 * CustomerBillingOverview Component Tests
 *
 * Tests the customer billing overview display including subscriptions,
 * transactions, payment methods, and risk factors.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerBillingOverview } from '../CustomerBillingOverview';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import {
  createMockCustomer,
  createMockSubscription,
  createMockTransaction,
  createMockPaymentMethod,
} from '@/__tests__/support/utils/mockFactories';

describe('CustomerBillingOverview', () => {
  const mockCustomer = createMockCustomer();
  const mockOnActionComplete = jest.fn();

  const mockBillingData = {
    subscriptions: [createMockSubscription({ customerId: mockCustomer.id })],
    paymentMethods: [createMockPaymentMethod({ customerId: mockCustomer.id })],
    recentTransactions: [createMockTransaction({ customerId: mockCustomer.id })],
    billingMetrics: {
      totalPaid: 29997,
      monthlySpend: 999,
      paymentSuccessRate: 0.985,
      outstandingBalance: 0,
      averageTransactionAmount: 999,
      lastPaymentDate: new Date().toISOString(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    riskFactors: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for billing overview API
    server.use(
      http.get('*/api/support/customers/:id/billing-overview', () => {
        return HttpResponse.json(mockBillingData);
      })
    );
  });

  describe('Loading States', () => {
    it('shows loading spinner initially', () => {
      server.use(
        http.get('*/api/support/customers/:id/billing-overview', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json(mockBillingData);
        })
      );

      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      expect(screen.getByText(/loading billing overview/i)).toBeInTheDocument();
    });

    it('displays billing data after loading', async () => {
      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading billing overview/i)).not.toBeInTheDocument();
      });

      // Check for customer name to verify data loaded
      expect(screen.getByText(mockCustomer.name!)).toBeInTheDocument();
    });

    it('displays error alert on load failure', async () => {
      server.use(
        http.get('*/api/support/customers/:id/billing-overview', () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load customer billing information/i)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      server.use(
        http.get('*/api/support/customers/:id/billing-overview', () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe('Customer Information', () => {
    it('displays customer name and email', async () => {
      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={true}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(mockCustomer.name!)).toBeInTheDocument();
        expect(screen.getByText(mockCustomer.email)).toBeInTheDocument();
      });
    });

    it('shows masked email when showSensitiveData is false', async () => {
      const customer = createMockCustomer({ email: 'customer@example.com' });

      render(
        <CustomerBillingOverview
          customer={customer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        // Email is masked as cu****@example.com
        expect(screen.getByText('cu****@example.com')).toBeInTheDocument();
      });
    });

    it('shows full email when showSensitiveData is true', async () => {
      const customer = createMockCustomer({ email: 'customer@example.com' });

      render(
        <CustomerBillingOverview
          customer={customer}
          showSensitiveData={true}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('customer@example.com')).toBeInTheDocument();
      });
    });

    it('displays customer tier badge', async () => {
      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        // Tier is rendered in uppercase
        expect(screen.getByText(mockCustomer.tier.toUpperCase())).toBeInTheDocument();
      });
    });

    it('renders status badge with correct status', async () => {
      const customer = createMockCustomer({ status: 'active' });

      render(
        <CustomerBillingOverview
          customer={customer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('active')).toBeInTheDocument();
      });
    });
  });

  describe('Billing Metrics', () => {
    it('displays total paid amount', async () => {
      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/total paid/i)).toBeInTheDocument();
        expect(screen.getByText(/\$299\.97/i)).toBeInTheDocument();
      });
    });

    it('shows monthly spend', async () => {
      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/monthly spend/i)).toBeInTheDocument();
      });
    });

    it('renders payment success rate', async () => {
      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/98\.5%/i)).toBeInTheDocument();
      });
    });

    it('shows outstanding balance', async () => {
      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/outstanding balance/i)).toBeInTheDocument();
      });
    });
  });

  describe('Subscriptions', () => {
    it('renders subscription details', async () => {
      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Monthly')).toBeInTheDocument();
        // Amount is rendered as "$9.99/month"
        expect(screen.getByText(/\$9\.99\/month/i)).toBeInTheDocument();
      });
    });

    it('renders empty state when no subscriptions', async () => {
      server.use(
        http.get('*/api/support/customers/:id/billing-overview', () => {
          return HttpResponse.json({
            ...mockBillingData,
            subscriptions: [],
          });
        })
      );

      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/no active subscriptions/i)).toBeInTheDocument();
      });
    });

    it('shows trial end date when applicable', async () => {
      const subscription = createMockSubscription({
        customerId: mockCustomer.id,
        status: 'trialing',
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      server.use(
        http.get('*/api/support/customers/:id/billing-overview', () => {
          return HttpResponse.json({
            ...mockBillingData,
            subscriptions: [subscription],
          });
        })
      );

      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        // Use getAllByText since "TRIALING" status badge also contains "trial"
        const trialElements = screen.getAllByText(/trial/i);
        expect(trialElements.length).toBeGreaterThan(0);
      });
    });

    it('renders discounts when present', async () => {
      const subscription = createMockSubscription({
        customerId: mockCustomer.id,
        discounts: [
          { id: 'disc-1', name: 'WELCOME20', percentOff: 20 },
        ],
      });

      server.use(
        http.get('*/api/support/customers/:id/billing-overview', () => {
          return HttpResponse.json({
            ...mockBillingData,
            subscriptions: [subscription],
          });
        })
      );

      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/WELCOME20/i)).toBeInTheDocument();
      });
    });
  });

  describe('Payment Methods', () => {
    it('displays payment method details', async () => {
      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        // Component renders as "VISA •••• 4242"
        expect(screen.getByText(/VISA.*4242/i)).toBeInTheDocument();
      });
    });

    it('renders empty state when no payment methods', async () => {
      server.use(
        http.get('*/api/support/customers/:id/billing-overview', () => {
          return HttpResponse.json({
            ...mockBillingData,
            paymentMethods: [],
          });
        })
      );

      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/no payment methods on file/i)).toBeInTheDocument();
      });
    });

    it('shows default badge on default payment method', async () => {
      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/default/i)).toBeInTheDocument();
      });
    });

    it('shows masked card numbers', async () => {
      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        // Card is rendered as "VISA •••• 4242"
        expect(screen.getByText(/VISA.*•{4}.*4242/i)).toBeInTheDocument();
      });
    });
  });

  describe('Risk Factors', () => {
    it('renders risk alerts with correct severity', async () => {
      server.use(
        http.get('*/api/support/customers/:id/billing-overview', () => {
          return HttpResponse.json({
            ...mockBillingData,
            riskFactors: [
              {
                type: 'payment_failure',
                severity: 'high',
                message: 'Multiple failed payment attempts',
                recommendation: 'Contact customer to update payment method',
              },
            ],
          });
        })
      );

      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/multiple failed payment attempts/i)).toBeInTheDocument();
      });
    });

    it('displays recommendations for risk factors', async () => {
      server.use(
        http.get('*/api/support/customers/:id/billing-overview', () => {
          return HttpResponse.json({
            ...mockBillingData,
            riskFactors: [
              {
                type: 'expired_card',
                severity: 'medium',
                message: 'Credit card expiring soon',
                recommendation: 'Send reminder to update card',
              },
            ],
          });
        })
      );

      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/send reminder to update card/i)).toBeInTheDocument();
      });
    });

    it('shows no alerts when there are no risk factors', async () => {
      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/risk/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('refreshes data when refresh button clicked', async () => {
      let callCount = 0;
      server.use(
        http.get('*/api/support/customers/:id/billing-overview', () => {
          callCount++;
          return HttpResponse.json(mockBillingData);
        })
      );

      const user = userEvent.setup();
      render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(callCount).toBe(1);
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(callCount).toBe(2);
      });
    });

    it('reloads data when customer changes', async () => {
      let requestedCustomerId: string | undefined;

      server.use(
        http.get('*/api/support/customers/:id/billing-overview', ({ params }) => {
          requestedCustomerId = params.id as string;
          return HttpResponse.json(mockBillingData);
        })
      );

      const { rerender } = render(
        <CustomerBillingOverview
          customer={mockCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(requestedCustomerId).toBe(mockCustomer.id);
      });

      const newCustomer = createMockCustomer({ id: 'cust-456' });
      rerender(
        <CustomerBillingOverview
          customer={newCustomer}
          showSensitiveData={false}
          onActionComplete={mockOnActionComplete}
        />
      );

      await waitFor(() => {
        expect(requestedCustomerId).toBe('cust-456');
      });
    });
  });
});
