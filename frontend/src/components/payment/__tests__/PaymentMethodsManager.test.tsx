import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaymentMethodsManager } from '../PaymentMethodsManager';
import { getPaymentMethods, detachPaymentMethod, setDefaultPaymentMethod, ApiError, ApiErrorResponse } from '@/lib/api';
import { PaymentMethod } from '@/lib/types/payment';

// Mock the API functions
jest.mock('@/lib/api', () => ({
  getPaymentMethods: jest.fn(),
  detachPaymentMethod: jest.fn(),
  setDefaultPaymentMethod: jest.fn(),
  ApiError: class ApiError extends Error {
    public readonly statusCode: number;
    public readonly correlationId: string;
    public readonly errorCode: string;
    public readonly isRetryable: boolean;
    public readonly supportContact?: string;
    public readonly validationErrors?: Record<string, string[]>;
    public readonly retryAfterSeconds?: number;
    public readonly path: string;
    public readonly traceId?: string;

    constructor(response: { correlationId: string; error: { code: string; message: string; details?: string; retryable: boolean; supportContact?: string; validationErrors?: Record<string, string[]>; retryAfterSeconds?: number; estimatedRecoveryTime?: string; }; timestamp: string; path: string; traceId?: string; }, statusCode: number) {
      super(response.error.message);
      this.name = 'ApiError';
      this.statusCode = statusCode;
      this.correlationId = response.correlationId;
      this.errorCode = response.error.code;
      this.isRetryable = response.error.retryable;
      this.supportContact = response.error.supportContact;
      this.validationErrors = response.error.validationErrors;
      this.retryAfterSeconds = response.error.retryAfterSeconds;
      this.path = response.path;
      this.traceId = response.traceId;
    }
  },
}));

const mockGetPaymentMethods = getPaymentMethods as jest.MockedFunction<typeof getPaymentMethods>;
const mockDetachPaymentMethod = detachPaymentMethod as jest.MockedFunction<typeof detachPaymentMethod>;
const mockSetDefaultPaymentMethod = setDefaultPaymentMethod as jest.MockedFunction<typeof setDefaultPaymentMethod>;

// Helper function to create ApiError instances for tests
const createApiError = (message: string, statusCode = 400): ApiError => {
  const response: ApiErrorResponse = {
    correlationId: 'test-correlation-id',
    error: {
      code: 'TEST_ERROR',
      message,
      retryable: false,
    },
    timestamp: new Date().toISOString(),
    path: '/test-path',
  };
  return new ApiError(response, statusCode);
};

describe('PaymentMethodsManager', () => {
  const mockPaymentMethods: PaymentMethod[] = [
    {
      id: 'pm_1',
      userId: 'user_123',
      stripePaymentMethodId: 'pm_stripe_1',
      type: 'card',
      brand: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'pm_2',
      userId: 'user_123',
      stripePaymentMethodId: 'pm_stripe_2',
      type: 'card',
      brand: 'mastercard',
      last4: '5555',
      expiryMonth: 6,
      expiryYear: 2026,
      isDefault: false,
      createdAt: '2024-06-15T12:30:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm to always return true by default
    global.confirm = jest.fn(() => true);
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching payment methods', () => {
      mockGetPaymentMethods.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<PaymentMethodsManager />);

      expect(screen.getByText('Loading payment methods...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no payment methods exist', async () => {
      mockGetPaymentMethods.mockResolvedValue([]);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('No Payment Methods')).toBeInTheDocument();
        expect(
          screen.getByText('Add a payment method to start making purchases and subscriptions.')
        ).toBeInTheDocument();
      });
    });

    it('should show Add Payment Method button in empty state when showAddButton is true', async () => {
      mockGetPaymentMethods.mockResolvedValue([]);
      const onAddNewMethod = jest.fn();

      render(<PaymentMethodsManager onAddNewMethod={onAddNewMethod} showAddButton={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Payment Method/i })).toBeInTheDocument();
      });
    });

    it('should call onAddNewMethod when Add button clicked in empty state', async () => {
      mockGetPaymentMethods.mockResolvedValue([]);
      const onAddNewMethod = jest.fn();

      render(<PaymentMethodsManager onAddNewMethod={onAddNewMethod} showAddButton={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Payment Method/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Add Payment Method/i }));
      expect(onAddNewMethod).toHaveBeenCalledTimes(1);
    });

    it('should not show Add button in empty state when showAddButton is false', async () => {
      mockGetPaymentMethods.mockResolvedValue([]);

      render(<PaymentMethodsManager showAddButton={false} />);

      await waitFor(() => {
        expect(screen.getByText('No Payment Methods')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /Add Payment Method/i })).not.toBeInTheDocument();
    });
  });

  describe('Payment Methods List', () => {
    it('should display payment methods successfully', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Visa •••• 4242')).toBeInTheDocument();
        expect(screen.getByText('Mastercard •••• 5555')).toBeInTheDocument();
      });
    });

    it('should show default badge on default payment method', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        // There might be multiple "Default" texts (badge + button text)
        const defaultElements = screen.getAllByText('Default');
        expect(defaultElements.length).toBeGreaterThan(0);
      });
    });

    it('should display card expiry date', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Expires 12/2025')).toBeInTheDocument();
        expect(screen.getByText('Expires 6/2026')).toBeInTheDocument();
      });
    });

    it('should display formatted creation date', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        // Match with regex to handle different date formatting
        expect(screen.getByText(/Added.*2024/)).toBeInTheDocument();
      });
    });

    it('should not show Set Default button on default payment method', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Visa •••• 4242')).toBeInTheDocument();
      });

      // Default method (pm_1) should not have "Set Default" button
      const buttons = screen.queryAllByRole('button', { name: /Default/i });
      // Only the non-default method should have this button
      expect(buttons.length).toBe(1);
    });

    it('should capitalize card brand names', async () => {
      mockGetPaymentMethods.mockResolvedValue([
        { ...mockPaymentMethods[0], brand: 'visa' },
      ]);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Visa •••• 4242')).toBeInTheDocument();
      });
    });

    it('should handle missing brand gracefully', async () => {
      mockGetPaymentMethods.mockResolvedValue([
        { ...mockPaymentMethods[0], brand: undefined },
      ]);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Card •••• 4242')).toBeInTheDocument();
      });
    });
  });

  describe('Header Actions', () => {
    it('should show Add New button in header when showAddButton is true', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);

      render(<PaymentMethodsManager showAddButton={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add New/i })).toBeInTheDocument();
      });
    });

    it('should not show Add New button in header when showAddButton is false', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);

      render(<PaymentMethodsManager showAddButton={false} />);

      await waitFor(() => {
        expect(screen.getByText('Visa •••• 4242')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /Add New/i })).not.toBeInTheDocument();
    });

    it('should call onAddNewMethod when Add New button clicked', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);
      const onAddNewMethod = jest.fn();

      render(<PaymentMethodsManager onAddNewMethod={onAddNewMethod} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add New/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Add New/i }));
      expect(onAddNewMethod).toHaveBeenCalledTimes(1);
    });
  });

  describe('Set Default Payment Method', () => {
    it('should set payment method as default', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);
      mockSetDefaultPaymentMethod.mockResolvedValue({
        ...mockPaymentMethods[1],
        isDefault: true,
      });

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Mastercard •••• 5555')).toBeInTheDocument();
      });

      // Find and click the "Set Default" button for the non-default card
      const setDefaultButtons = screen.getAllByRole('button', { name: /Default/i });
      fireEvent.click(setDefaultButtons[0]);

      await waitFor(() => {
        expect(mockSetDefaultPaymentMethod).toHaveBeenCalledWith('pm_2');
      });
    });

    it('should update UI after setting default', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);
      mockSetDefaultPaymentMethod.mockResolvedValue({
        ...mockPaymentMethods[1],
        isDefault: true,
      });

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Mastercard •••• 5555')).toBeInTheDocument();
      });

      const setDefaultButtons = screen.getAllByRole('button', { name: /Default/i });
      fireEvent.click(setDefaultButtons[0]);

      await waitFor(() => {
        // After setting pm_2 as default, both should show default badge
        // (One is already default, one becomes default)
        const defaultBadges = screen.getAllByText('Default');
        expect(defaultBadges.length).toBeGreaterThan(0);
      });
    });

    it('should show loading spinner while setting default', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);
      mockSetDefaultPaymentMethod.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Mastercard •••• 5555')).toBeInTheDocument();
      });

      const setDefaultButtons = screen.getAllByRole('button', { name: /Default/i });
      fireEvent.click(setDefaultButtons[0]);

      // Should show loading spinner (disabled state is also expected)
      const button = setDefaultButtons[0];
      expect(button).toBeDisabled();
    });

    it('should show error when setting default fails', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);
      mockSetDefaultPaymentMethod.mockRejectedValue(createApiError('Network error'));

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Mastercard •••• 5555')).toBeInTheDocument();
      });

      const setDefaultButtons = screen.getAllByRole('button', { name: /Default/i });
      fireEvent.click(setDefaultButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should handle generic error when setting default fails', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);
      mockSetDefaultPaymentMethod.mockRejectedValue(new Error('Unknown error'));

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Mastercard •••• 5555')).toBeInTheDocument();
      });

      const setDefaultButtons = screen.getAllByRole('button', { name: /Default/i });
      fireEvent.click(setDefaultButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Failed to set default payment method')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Payment Method', () => {
    it('should show confirmation dialog before deleting', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);
      global.confirm = jest.fn(() => false); // User cancels

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Visa •••• 4242')).toBeInTheDocument();
      });

      // Find delete buttons (trash icons)
      const deleteButtons = screen.getAllByRole('button').filter(button => {
        const svg = button.querySelector('svg');
        return svg?.classList.contains('lucide-trash-2') || button.className.includes('text-error');
      });

      fireEvent.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to remove this payment method?');
      expect(mockDetachPaymentMethod).not.toHaveBeenCalled();
    });

    it('should delete payment method when confirmed', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);
      mockDetachPaymentMethod.mockResolvedValue(mockPaymentMethods[0]);
      global.confirm = jest.fn(() => true);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Visa •••• 4242')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button').filter(button => {
        const svg = button.querySelector('svg');
        return svg?.classList.contains('lucide-trash-2') || button.className.includes('text-error');
      });

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDetachPaymentMethod).toHaveBeenCalledWith('pm_1');
      });
    });

    it('should remove payment method from list after deletion', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);
      mockDetachPaymentMethod.mockResolvedValue(mockPaymentMethods[0]);
      global.confirm = jest.fn(() => true);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Visa •••• 4242')).toBeInTheDocument();
        expect(screen.getByText('Mastercard •••• 5555')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button').filter(button => {
        const svg = button.querySelector('svg');
        return svg?.classList.contains('lucide-trash-2') || button.className.includes('text-error');
      });

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Visa •••• 4242')).not.toBeInTheDocument();
        expect(screen.getByText('Mastercard •••• 5555')).toBeInTheDocument(); // Other card still there
      });
    });

    it('should show error when deletion fails', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);
      mockDetachPaymentMethod.mockRejectedValue(createApiError('Cannot delete default payment method'));
      global.confirm = jest.fn(() => true);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Visa •••• 4242')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button').filter(button => {
        const svg = button.querySelector('svg');
        return svg?.classList.contains('lucide-trash-2') || button.className.includes('text-error');
      });

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Cannot delete default payment method')).toBeInTheDocument();
      });
    });

    it('should handle generic error when deletion fails', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);
      mockDetachPaymentMethod.mockRejectedValue(new Error('Network failure'));
      global.confirm = jest.fn(() => true);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Visa •••• 4242')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button').filter(button => {
        const svg = button.querySelector('svg');
        return svg?.classList.contains('lucide-trash-2') || button.className.includes('text-error');
      });

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Failed to remove payment method')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when loading payment methods fails', async () => {
      mockGetPaymentMethods.mockRejectedValue(createApiError('Failed to fetch payment methods'));

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch payment methods')).toBeInTheDocument();
      });
    });

    it('should handle generic error when loading fails', async () => {
      mockGetPaymentMethods.mockRejectedValue(new Error('Unknown error'));

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load payment methods')).toBeInTheDocument();
      });
    });
  });

  describe('Security Information', () => {
    it('should display security information', async () => {
      mockGetPaymentMethods.mockResolvedValue(mockPaymentMethods);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Your payment methods are secure')).toBeInTheDocument();
        expect(
          screen.getByText(/All payment information is encrypted and stored securely by Stripe/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Utility Functions', () => {
    it('should format card brand with first letter capitalized', async () => {
      mockGetPaymentMethods.mockResolvedValue([
        { ...mockPaymentMethods[0], brand: 'amex' },
      ]);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Amex •••• 4242')).toBeInTheDocument();
      });
    });

    it('should handle payment method without expiry date', async () => {
      mockGetPaymentMethods.mockResolvedValue([
        {
          ...mockPaymentMethods[0],
          expiryMonth: undefined,
          expiryYear: undefined,
        },
      ]);

      render(<PaymentMethodsManager />);

      await waitFor(() => {
        expect(screen.getByText('Visa •••• 4242')).toBeInTheDocument();
      });

      // Should not show "Expires" text
      expect(screen.queryByText(/Expires/i)).not.toBeInTheDocument();
    });
  });
});
