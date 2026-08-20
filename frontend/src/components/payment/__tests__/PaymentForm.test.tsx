import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaymentForm } from '../PaymentForm';
import { useStripe, useElements } from '@stripe/react-stripe-js';
import {
  createPaymentIntent,
  confirmPaymentIntent,
  mapStripeErrorToPaymentError,
  getPaymentErrorMessage,
} from '@/lib/api';
import { PaymentTransaction } from '@/lib/types/payment';

// Mock Stripe React hooks
jest.mock('@stripe/react-stripe-js', () => ({
  useStripe: jest.fn(),
  useElements: jest.fn(),
  PaymentElement: () => <div data-testid="payment-element">Payment Element Mock</div>,
  AddressElement: () => <div data-testid="address-element">Address Element Mock</div>,
}));

// Mock API functions
jest.mock('@/lib/api', () => ({
  createPaymentIntent: jest.fn(),
  confirmPaymentIntent: jest.fn(),
  mapStripeErrorToPaymentError: jest.fn(),
  getPaymentErrorMessage: jest.fn(),
}));

const mockUseStripe = useStripe as jest.MockedFunction<typeof useStripe>;
const mockUseElements = useElements as jest.MockedFunction<typeof useElements>;
const mockCreatePaymentIntent = createPaymentIntent as jest.MockedFunction<typeof createPaymentIntent>;
const mockConfirmPaymentIntent = confirmPaymentIntent as jest.MockedFunction<typeof confirmPaymentIntent>;
const mockMapStripeErrorToPaymentError = mapStripeErrorToPaymentError as jest.MockedFunction<
  typeof mapStripeErrorToPaymentError
>;
const mockGetPaymentErrorMessage = getPaymentErrorMessage as jest.MockedFunction<
  typeof getPaymentErrorMessage
>;

describe('PaymentForm', () => {
  const mockStripe = {
    confirmPayment: jest.fn(),
  };

  const mockElements = {
    submit: jest.fn(),
  };

  const mockTransaction: PaymentTransaction = {
    id: 'pi_123',
    userId: 'user_123',
    stripePaymentIntentId: 'pi_123',
    clientSecret: 'pi_123_secret_456',
    amount: 2.99,
    currency: 'USD',
    status: 'succeeded',
    createdAt: '2024-01-01T00:00:00Z',
    processedAt: '2024-01-01T00:00:05Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStripe.mockReturnValue(mockStripe as any);
    mockUseElements.mockReturnValue(mockElements as any);
    // Default to successful validation
    mockElements.submit.mockResolvedValue({ error: null } as any);
  });

  describe('Rendering', () => {
    it('should render payment form with all elements', () => {
      render(<PaymentForm />);

      expect(screen.getByText('Secure Payment')).toBeInTheDocument();
      expect(screen.getByText('GeoLeap Premium Subscription')).toBeInTheDocument();
      expect(screen.getByText('$15.00')).toBeInTheDocument();
      expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      expect(screen.getByTestId('address-element')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pay \$15.00/i })).toBeInTheDocument();
    });

    it('should render custom description and amount', () => {
      render(<PaymentForm amount={9.99} currency="USD" description="Annual Subscription" />);

      expect(screen.getByText('Annual Subscription')).toBeInTheDocument();
      expect(screen.getByText('$9.99')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pay \$9.99/i })).toBeInTheDocument();
    });

    it('should render save payment method checkbox when enabled', () => {
      render(<PaymentForm showSavePaymentMethod={true} />);

      expect(screen.getByText('Save payment method for future purchases')).toBeInTheDocument();
    });

    it('should not render save payment method checkbox when disabled', () => {
      render(<PaymentForm showSavePaymentMethod={false} />);

      expect(screen.queryByText('Save payment method for future purchases')).not.toBeInTheDocument();
    });

    it('should render cancel button when onCancel provided', () => {
      const onCancel = jest.fn();
      render(<PaymentForm onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should not render cancel button when onCancel not provided', () => {
      render(<PaymentForm />);

      expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
    });

    it('should display security badges', () => {
      render(<PaymentForm />);

      expect(screen.getByText('Secured by Stripe')).toBeInTheDocument();
      expect(screen.getByText('PCI DSS Level 1')).toBeInTheDocument();
      expect(screen.getByText('256-bit SSL')).toBeInTheDocument();
      expect(screen.getByText('PCI Compliant')).toBeInTheDocument();
      expect(screen.getByText('Bank-level Security')).toBeInTheDocument();
    });
  });

  describe('Form Submission - Stripe Not Ready', () => {
    it('should show error when Stripe is not loaded', async () => {
      mockUseStripe.mockReturnValue(null);

      render(<PaymentForm />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Payment system not ready. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show error when Elements is not loaded', async () => {
      mockUseElements.mockReturnValue(null);

      render(<PaymentForm />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Payment system not ready. Please try again.')).toBeInTheDocument();
      });
    });

    it('should disable submit button when Stripe not ready', () => {
      mockUseStripe.mockReturnValue(null);

      render(<PaymentForm />);

      expect(screen.getByRole('button', { name: /Pay/i })).toBeDisabled();
    });
  });

  describe('Form Validation Errors', () => {
    it('should handle validation errors from elements.submit()', async () => {
      const submitError = { type: 'validation_error', message: 'Card number is invalid' };
      mockElements.submit.mockResolvedValue({ error: submitError } as any);
      mockMapStripeErrorToPaymentError.mockReturnValue({ code: 'card_declined', message: 'Card declined' } as any);
      mockGetPaymentErrorMessage.mockReturnValue('Your card was declined');

      const onError = jest.fn();
      render(<PaymentForm onError={onError} />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockMapStripeErrorToPaymentError).toHaveBeenCalledWith(submitError);
        expect(mockGetPaymentErrorMessage).toHaveBeenCalled();
        expect(screen.getByText('Your card was declined')).toBeInTheDocument();
        expect(onError).toHaveBeenCalledWith('Your card was declined');
      });
    });
  });

  describe('Payment Intent Creation', () => {
    it('should create payment intent with correct parameters', async () => {
      mockCreatePaymentIntent.mockResolvedValue(mockTransaction);
      mockStripe.confirmPayment.mockResolvedValue({
        error: null,
        paymentIntent: { id: 'pi_123', status: 'succeeded' },
      } as any);
      mockConfirmPaymentIntent.mockResolvedValue(mockTransaction);

      render(<PaymentForm amount={9.99} currency="EUR" description="Premium Plan" />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockCreatePaymentIntent).toHaveBeenCalledWith({
          amount: 9.99,
          currency: 'EUR',
          description: 'Premium Plan',
          confirmPayment: false,
        });
      });
    });

    it('should handle missing client secret from payment intent', async () => {
      mockCreatePaymentIntent.mockResolvedValue({ ...mockTransaction, clientSecret: undefined });

      const onError = jest.fn();
      render(<PaymentForm onError={onError} />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Failed to get payment client secret')).toBeInTheDocument();
        expect(onError).toHaveBeenCalledWith('Failed to get payment client secret');
      });
    });
  });

  describe('Payment Confirmation', () => {
    it('should confirm payment with Stripe', async () => {
      mockCreatePaymentIntent.mockResolvedValue(mockTransaction);
      mockStripe.confirmPayment.mockResolvedValue({
        error: null,
        paymentIntent: { id: 'pi_123', status: 'succeeded' },
      } as any);
      mockConfirmPaymentIntent.mockResolvedValue(mockTransaction);

      render(<PaymentForm />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockStripe.confirmPayment).toHaveBeenCalledWith({
          elements: mockElements,
          clientSecret: 'pi_123_secret_456',
          confirmParams: {
            return_url: expect.stringContaining('/payment/success'),
            save_payment_method: true,
          },
          redirect: 'if_required',
        });
      });
    });

    it('should send savePaymentMethod as false when checkbox unchecked', async () => {
      mockCreatePaymentIntent.mockResolvedValue(mockTransaction);
      mockStripe.confirmPayment.mockResolvedValue({
        error: null,
        paymentIntent: { id: 'pi_123', status: 'succeeded' },
      } as any);
      mockConfirmPaymentIntent.mockResolvedValue(mockTransaction);

      render(<PaymentForm showSavePaymentMethod={true} />);

      // Uncheck the save payment method checkbox
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockStripe.confirmPayment).toHaveBeenCalledWith(
          expect.objectContaining({
            confirmParams: expect.objectContaining({
              save_payment_method: false,
            }),
          })
        );
      });
    });

    it('should handle payment confirmation error', async () => {
      mockCreatePaymentIntent.mockResolvedValue(mockTransaction);
      const confirmError = { type: 'card_error', message: 'Insufficient funds' };
      mockStripe.confirmPayment.mockResolvedValue({ error: confirmError, paymentIntent: null } as any);
      mockMapStripeErrorToPaymentError.mockReturnValue({ code: 'insufficient_funds', message: 'Insufficient funds' } as any);
      mockGetPaymentErrorMessage.mockReturnValue('Your card has insufficient funds');

      const onError = jest.fn();
      render(<PaymentForm onError={onError} />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Your card has insufficient funds')).toBeInTheDocument();
        expect(onError).toHaveBeenCalledWith('Your card has insufficient funds');
      });
    });
  });

  describe('Backend Confirmation', () => {
    it('should confirm payment with backend when Stripe succeeds', async () => {
      mockCreatePaymentIntent.mockResolvedValue(mockTransaction);
      mockStripe.confirmPayment.mockResolvedValue({
        error: null,
        paymentIntent: { id: 'pi_123', status: 'succeeded' },
      } as any);
      mockConfirmPaymentIntent.mockResolvedValue(mockTransaction);

      const onSuccess = jest.fn();
      render(<PaymentForm onSuccess={onSuccess} />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockConfirmPaymentIntent).toHaveBeenCalledWith('pi_123');
        expect(onSuccess).toHaveBeenCalledWith(mockTransaction);
      });
    });

    it('should still call onSuccess even if backend confirmation fails', async () => {
      mockCreatePaymentIntent.mockResolvedValue(mockTransaction);
      mockStripe.confirmPayment.mockResolvedValue({
        error: null,
        paymentIntent: { id: 'pi_123', status: 'succeeded' },
      } as any);
      mockConfirmPaymentIntent.mockRejectedValue(new Error('Backend error'));

      const onSuccess = jest.fn();
      render(<PaymentForm onSuccess={onSuccess} />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        // Even though backend confirmation failed, onSuccess should still be called
        // because Stripe payment succeeded
        expect(onSuccess).toHaveBeenCalled();
        const callArg = onSuccess.mock.calls[0][0];
        expect(callArg.status).toBe('succeeded');
      });
    });
  });

  describe('Loading States', () => {
    it('should show processing state during payment', async () => {
      mockCreatePaymentIntent.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<PaymentForm />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });

    it('should disable buttons during processing', async () => {
      mockCreatePaymentIntent.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<PaymentForm onCancel={jest.fn()} />);

      const submitButton = screen.getByRole('button', { name: /Pay/i });
      const form = submitButton.closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
      });
    });
  });

  describe('Callbacks', () => {
    it('should call onCancel when cancel button clicked', () => {
      const onCancel = jest.fn();
      render(<PaymentForm onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Display', () => {
    it('should clear previous errors on new submission', async () => {
      // First submission fails
      mockElements.submit.mockResolvedValueOnce({ error: { message: 'First error' } } as any);
      mockMapStripeErrorToPaymentError.mockReturnValue({ code: 'error', message: 'First error' } as any);
      mockGetPaymentErrorMessage.mockReturnValue('First error');

      render(<PaymentForm />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Second submission should clear the first error
      mockElements.submit.mockResolvedValueOnce({ error: null } as any);
      mockCreatePaymentIntent.mockResolvedValue(mockTransaction);
      mockStripe.confirmPayment.mockResolvedValue({
        error: null,
        paymentIntent: { id: 'pi_123', status: 'succeeded' },
      } as any);
      mockConfirmPaymentIntent.mockResolvedValue(mockTransaction);

      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Currency Formatting', () => {
    it('should format USD currency', () => {
      render(<PaymentForm amount={9.99} currency="USD" />);

      expect(screen.getByText('$9.99')).toBeInTheDocument();
    });

    it('should format EUR currency', () => {
      render(<PaymentForm amount={19.99} currency="EUR" />);

      expect(screen.getByText('€19.99')).toBeInTheDocument();
    });

    it('should format GBP currency', () => {
      render(<PaymentForm amount={15} currency="GBP" />);

      expect(screen.getByText('£15.00')).toBeInTheDocument();
    });
  });

  describe('Error Handling - Generic Errors', () => {
    it('should handle generic error during payment processing', async () => {
      mockCreatePaymentIntent.mockRejectedValue(new Error('Network failure'));

      const onError = jest.fn();
      render(<PaymentForm onError={onError} />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Network failure')).toBeInTheDocument();
        expect(onError).toHaveBeenCalledWith('Network failure');
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockCreatePaymentIntent.mockRejectedValue('String error');

      const onError = jest.fn();
      render(<PaymentForm onError={onError} />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Payment processing failed')).toBeInTheDocument();
        expect(onError).toHaveBeenCalledWith('Payment processing failed');
      });
    });
  });

  describe('Edge Cases - Session 10 Enhancements', () => {
    it('should handle very large amounts', () => {
      render(<PaymentForm amount={999999.99} currency="USD" />);

      expect(screen.getByText('$999,999.99')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pay \$999,999.99/i })).toBeInTheDocument();
    });

    it('should handle very small amounts', () => {
      render(<PaymentForm amount={0.01} currency="USD" />);

      expect(screen.getByText('$0.01')).toBeInTheDocument();
    });

    it('should handle zero amount gracefully', () => {
      render(<PaymentForm amount={0} currency="USD" />);

      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('should handle undefined amount with default', () => {
      render(<PaymentForm />);

      // Default amount comes from the Premium plan config.
      expect(screen.getByText('$15.00')).toBeInTheDocument();
    });

    it('should maintain form state after failed validation', async () => {
      const submitError = { type: 'validation_error', message: 'Card number is invalid' };
      mockElements.submit.mockResolvedValue({ error: submitError } as any);
      mockMapStripeErrorToPaymentError.mockReturnValue({ code: 'card_declined', message: 'Card declined' } as any);
      mockGetPaymentErrorMessage.mockReturnValue('Your card was declined');

      render(<PaymentForm showSavePaymentMethod={true} />);

      // Check checkbox
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();

      // Submit form
      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Your card was declined')).toBeInTheDocument();
      });

      // Checkbox should maintain state after error
      expect(checkbox).not.toBeChecked();
    });

    it('should disable submit during processing to prevent double submission', async () => {
      // Use a promise that we control to simulate slow API
      let resolvePaymentIntent: (value: typeof mockTransaction) => void;
      const paymentIntentPromise = new Promise<typeof mockTransaction>((resolve) => {
        resolvePaymentIntent = resolve;
      });
      mockCreatePaymentIntent.mockReturnValue(paymentIntentPromise);

      render(<PaymentForm />);

      const submitButton = screen.getByRole('button', { name: /Pay/i });
      const form = submitButton.closest('form');

      // First submission
      fireEvent.submit(form!);

      // Button should be disabled during processing
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });

      // Resolve the promise to complete test
      resolvePaymentIntent!(mockTransaction);
    });

    it('should handle payment with special characters in description', () => {
      render(<PaymentForm description="Premium Plan - VIP & Gold + Extras (Special)" />);

      expect(screen.getByText('Premium Plan - VIP & Gold + Extras (Special)')).toBeInTheDocument();
    });

    it('should render correctly with all props provided', () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const onCancel = jest.fn();

      render(
        <PaymentForm
          amount={49.99}
          currency="GBP"
          description="Annual Premium"
          showSavePaymentMethod={true}
          onSuccess={onSuccess}
          onError={onError}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText('Annual Premium')).toBeInTheDocument();
      expect(screen.getByText('£49.99')).toBeInTheDocument();
      expect(screen.getByText('Save payment method for future purchases')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should handle JPY currency (no decimal places)', () => {
      render(<PaymentForm amount={1000} currency="JPY" />);

      expect(screen.getByText('¥1,000')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form elements', () => {
      render(<PaymentForm showSavePaymentMethod={true} onCancel={jest.fn()} />);

      // Check for proper button roles
      expect(screen.getByRole('button', { name: /Pay/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();

      // Check for checkbox
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should indicate disabled state accessibly', () => {
      mockUseStripe.mockReturnValue(null);

      render(<PaymentForm />);

      const submitButton = screen.getByRole('button', { name: /Pay/i });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute('disabled');
    });

    it('should display error messages accessibly', async () => {
      mockElements.submit.mockResolvedValue({ error: { message: 'Test error' } } as any);
      mockMapStripeErrorToPaymentError.mockReturnValue({ code: 'error', message: 'Test error' } as any);
      mockGetPaymentErrorMessage.mockReturnValue('Accessible error message');

      render(<PaymentForm />);

      const form = screen.getByRole('button', { name: /Pay/i }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        const errorElement = screen.getByText('Accessible error message');
        expect(errorElement).toBeInTheDocument();
        // Error should be visible to screen readers
        expect(errorElement).toBeVisible();
      });
    });
  });
});
