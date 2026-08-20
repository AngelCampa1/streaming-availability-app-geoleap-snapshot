/**
 * ManualPaymentProcessor Component Tests
 * Tests for manual payment processing workflow
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { ManualPaymentProcessor } from '../ManualPaymentProcessor';
import { CustomerAccount } from '@/lib/types/support';

// Mock usePermissions hook
const mockHasPermission = jest.fn(() => true);
jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: mockHasPermission,
  }),
}));

// Mock icons to avoid render complexity
jest.mock('lucide-react', () => ({
  DollarSign: () => <div>DollarSign</div>,
  CreditCard: () => <div>CreditCard</div>,
  CheckCircle: () => <div>CheckCircle</div>,
  AlertTriangle: () => <div>AlertTriangle</div>,
  Clock: () => <div>Clock</div>,
  FileText: () => <div>FileText</div>,
  Send: () => <div>Send</div>,
  Eye: () => <div>Eye</div>,
  RefreshCw: () => <div>RefreshCw</div>,
  Calculator: () => <div>Calculator</div>,
  Shield: () => <div>Shield</div>,
  Info: () => <div>Info</div>,
  Loader2: () => <div>Loader2</div>,
  ArrowRight: () => <div>ArrowRight</div>,
  Calendar: () => <div>Calendar</div>,
}));

const mockCustomer: CustomerAccount = {
  id: 'cust_123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  tier: 'premium',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  totalPaid: 500.0,
  lastPaymentDate: '2024-01-15T10:00:00Z',
  nextBillingDate: '2024-02-01T00:00:00Z',
};

const mockOpenInvoices = [
  {
    id: 'inv_1',
    customerId: 'cust_123',
    number: 'INV-001',
    description: 'Monthly subscription',
    status: 'open',
    amountDue: 99.99,
    currency: 'USD',
    dueDate: '2024-02-01',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'inv_2',
    customerId: 'cust_123',
    number: 'INV-002',
    description: 'Additional services',
    status: 'past_due',
    amountDue: 49.99,
    currency: 'USD',
    dueDate: '2024-01-20',
    createdAt: '2024-01-10T00:00:00Z',
  },
];

const mockCalculation = {
  subtotal: 100.0,
  tax: 8.5,
  fees: 3.0,
  total: 111.5,
  currency: 'USD',
};

const mockConfirmation = {
  transactionId: 'txn_abc123',
  estimatedProcessingTime: '2-3 business days',
  confirmationType: 'pending_confirmation',
  nextSteps: [
    'Monitor transaction status in the dashboard',
    'Customer will receive email notification',
    'Funds will be available within 2-3 business days',
  ],
};

describe('ManualPaymentProcessor', () => {
  const mockOnPaymentProcessed = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission.mockReturnValue(true);

    server.use(
      http.get('/api/support/customers/:customerId/invoices', () => {
        return HttpResponse.json(mockOpenInvoices);
      }),
      http.post('/api/support/payments/calculate', () => {
        return HttpResponse.json(mockCalculation);
      }),
      http.post('/api/support/payments/manual', () => {
        return HttpResponse.json(mockConfirmation);
      })
    );
  });

  describe('Initial Rendering', () => {
    it('renders the component with header', async () => {
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByText('Manual Payment Processing')).toBeInTheDocument();
      });

      expect(screen.getByText('Secure Processing')).toBeInTheDocument();
    });

    it('displays step progress indicator', async () => {
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByText('Enter payment amount and method')).toBeInTheDocument();
      });

      expect(screen.getByText('Review & Verify')).toBeInTheDocument();
      expect(screen.getByText('Confirmation')).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('loads and displays open invoices', async () => {
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByText('Invoice #INV-001')).toBeInTheDocument();
        expect(screen.getByText('Invoice #INV-002')).toBeInTheDocument();
      });

      expect(screen.getByText('Monthly subscription')).toBeInTheDocument();
      expect(screen.getByText('Additional services')).toBeInTheDocument();
    });

    it('displays customer information', async () => {
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('PREMIUM')).toBeInTheDocument();
    });
  });

  describe('Payment Form Validation', () => {
    it('validates required amount field', async () => {
      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /Continue to Review/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Payment amount must be greater than 0/i)).toBeInTheDocument();
      });
    });

    it('validates amount maximum limit', async () => {
      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      });

      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '15000');

      const descriptionInput = screen.getByPlaceholderText(/Manual payment for subscription renewal/i);
      await user.type(descriptionInput, 'Test payment');

      const continueButton = screen.getByRole('button', { name: /Continue to Review/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/exceeds maximum limit/i)).toBeInTheDocument();
      });
    });

    it('validates required description field', async () => {
      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      });

      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '100');

      const continueButton = screen.getByRole('button', { name: /Continue to Review/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Payment description is required/i)).toBeInTheDocument();
      });
    });

    it('validates check number for check payments', async () => {
      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      });

      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '100');

      const descriptionInput = screen.getByPlaceholderText(/Manual payment for subscription renewal/i);
      await user.type(descriptionInput, 'Test payment');

      const methodSelect = screen.getByDisplayValue(/Credit\/Debit Card/i);
      await user.selectOptions(methodSelect, 'check');

      const continueButton = screen.getByRole('button', { name: /Continue to Review/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Check number is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Payment Calculation', () => {
    it('requests calculation when amount is entered', async () => {
      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      });

      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '100');

      await waitFor(() => {
        expect(screen.getByText('Payment Calculation')).toBeInTheDocument();
      });
    });

    it('displays calculation breakdown', async () => {
      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      });

      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '100');

      await waitFor(() => {
        expect(screen.getByText('Payment Calculation')).toBeInTheDocument();
        expect(screen.getByText(/Subtotal:/i)).toBeInTheDocument();
        expect(screen.getByText(/Tax:/i)).toBeInTheDocument();
        expect(screen.getByText(/Processing Fees:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Payment Method Selection', () => {
    it('shows check number field for check payments', async () => {
      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue(/Credit\/Debit Card/i)).toBeInTheDocument();
      });

      const methodSelect = screen.getByDisplayValue(/Credit\/Debit Card/i);
      await user.selectOptions(methodSelect, 'check');

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter check number/i)).toBeInTheDocument();
      });
    });

    it('shows reference field for bank transfers', async () => {
      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue(/Credit\/Debit Card/i)).toBeInTheDocument();
      });

      const methodSelect = screen.getByDisplayValue(/Credit\/Debit Card/i);
      await user.selectOptions(methodSelect, 'bank_transfer');

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter reference\/confirmation number/i)).toBeInTheDocument();
      });
    });

    it('allows currency selection', async () => {
      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue(/USD - US Dollar/i)).toBeInTheDocument();
      });

      const currencySelect = screen.getByDisplayValue(/USD - US Dollar/i);
      await user.selectOptions(currencySelect, 'EUR');

      expect(currencySelect).toHaveValue('EUR');
    });
  });

  describe('Processing Options', () => {
    it('allows toggling skip notification option', async () => {
      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByText('Skip customer notification')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const skipNotificationCheckbox = checkboxes[0];
      expect(skipNotificationCheckbox).not.toBeChecked();

      await user.click(skipNotificationCheckbox);
      expect(skipNotificationCheckbox).toBeChecked();
    });

    it('allows toggling mark as paid option', async () => {
      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByText(/Mark as already paid/i)).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const markAsPaidCheckbox = checkboxes[1];
      expect(markAsPaidCheckbox).not.toBeChecked();

      await user.click(markAsPaidCheckbox);
      expect(markAsPaidCheckbox).toBeChecked();
    });
  });

  describe('Permission Checks', () => {
    it('blocks payment processing without permission', async () => {
      mockHasPermission.mockReturnValue(false);
      const user = userEvent.setup();

      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      });

      // Fill in required fields
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '100');

      const descriptionInput = screen.getByPlaceholderText(/Manual payment for subscription renewal/i);
      await user.type(descriptionInput, 'Test payment');

      // Navigate to confirmation step
      const continueButton = screen.getByRole('button', { name: /Continue to Review/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Review Payment Details/i)).toBeInTheDocument();
      });

      const continueToConfirmButton = screen.getByRole('button', { name: /Continue to Confirmation/i });
      await user.click(continueToConfirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Final Confirmation Required/i)).toBeInTheDocument();
      });

      // Try to process payment
      const processButton = screen.getByRole('button', { name: /Process Payment Now/i });
      await user.click(processButton);

      await waitFor(() => {
        expect(screen.getByText(/You do not have permission/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error when payment processing fails', async () => {
      server.use(
        http.post('/api/support/payments/manual', () => {
          return HttpResponse.json({ message: 'Payment gateway error' }, { status: 500 });
        })
      );

      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      });

      // Fill in form
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '100');

      const descriptionInput = screen.getByPlaceholderText(/Manual payment for subscription renewal/i);
      await user.type(descriptionInput, 'Test payment');

      // Navigate to review
      const continueButton = screen.getByRole('button', { name: /Continue to Review/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Review Payment Details/i)).toBeInTheDocument();
      });

      // Navigate to confirmation
      const continueToConfirmButton = screen.getByRole('button', { name: /Continue to Confirmation/i });
      await user.click(continueToConfirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Final Confirmation Required/i)).toBeInTheDocument();
      });

      // Process payment
      const processButton = screen.getByRole('button', { name: /Process Payment Now/i });
      await user.click(processButton);

      await waitFor(() => {
        expect(screen.getByText(/Payment gateway error/i)).toBeInTheDocument();
      });
    });

    it('handles invoice loading errors gracefully', async () => {
      server.use(
        http.get('/api/support/customers/:customerId/invoices', () => {
          return HttpResponse.json({ error: 'Failed to load' }, { status: 500 });
        })
      );

      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      });

      // Component should still render even if invoices fail to load
      expect(screen.queryByText('Invoice #INV-001')).not.toBeInTheDocument();
    });
  });

  describe('Success Flow', () => {
    it('calls onPaymentProcessed callback on success', async () => {
      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      });

      // Fill in form
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '100');

      const descriptionInput = screen.getByPlaceholderText(/Manual payment for subscription renewal/i);
      await user.type(descriptionInput, 'Test payment');

      // Navigate through steps
      const continueButton = screen.getByRole('button', { name: /Continue to Review/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Review Payment Details/i)).toBeInTheDocument();
      });

      const continueToConfirmButton = screen.getByRole('button', { name: /Continue to Confirmation/i });
      await user.click(continueToConfirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Final Confirmation Required/i)).toBeInTheDocument();
      });

      const processButton = screen.getByRole('button', { name: /Process Payment Now/i });
      await user.click(processButton);

      await waitFor(() => {
        expect(mockOnPaymentProcessed).toHaveBeenCalledWith(100);
      });
    });

    it('displays success message with transaction details', async () => {
      const user = userEvent.setup();
      render(<ManualPaymentProcessor customer={mockCustomer} onPaymentProcessed={mockOnPaymentProcessed} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      });

      // Fill in form and navigate to success
      const amountInput = screen.getByPlaceholderText('0.00');
      await user.type(amountInput, '100');

      const descriptionInput = screen.getByPlaceholderText(/Manual payment for subscription renewal/i);
      await user.type(descriptionInput, 'Test payment');

      const continueButton = screen.getByRole('button', { name: /Continue to Review/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Review Payment Details/i)).toBeInTheDocument();
      });

      const continueToConfirmButton = screen.getByRole('button', { name: /Continue to Confirmation/i });
      await user.click(continueToConfirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Final Confirmation Required/i)).toBeInTheDocument();
      });

      const processButton = screen.getByRole('button', { name: /Process Payment Now/i });
      await user.click(processButton);

      await waitFor(() => {
        expect(screen.getByText(/Payment Processed Successfully!/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/txn_abc123/i)).toBeInTheDocument();
      expect(screen.getByText(/Processing Time:/i)).toBeInTheDocument();
    });
  });
});
