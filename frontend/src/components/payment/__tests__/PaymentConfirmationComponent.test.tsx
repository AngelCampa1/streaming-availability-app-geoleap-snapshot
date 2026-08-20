import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaymentConfirmationComponent } from '../PaymentConfirmation';
import { PaymentConfirmation } from '@/lib/types/payment';

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe('PaymentConfirmationComponent', () => {
  const mockConfirmation: PaymentConfirmation = {
    transaction: {
      id: 'pi_1234567890abcdef',
      userId: 'user_123',
      stripePaymentIntentId: 'pi_1234567890abcdef',
      clientSecret: 'pi_1234567890abcdef_secret',
      amount: 9.99,
      currency: 'USD',
      description: 'Premium Subscription',
      status: 'succeeded',
      createdAt: '2024-01-15T10:30:00Z',
      processedAt: '2024-01-15T10:30:05Z',
    },
    receiptUrl: 'https://example.com/receipt.pdf',
    nextSteps: [
      'Check your email for the receipt',
      'Access your premium features from the dashboard',
      'Contact support if you have any questions',
    ],
    isSubscription: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Success Header', () => {
    it('should render success header with icon', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} />);

      expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
      expect(screen.getByText('Your payment has been processed successfully')).toBeInTheDocument();
      expect(screen.getByText('Transaction Complete')).toBeInTheDocument();
    });
  });

  describe('Transaction Details', () => {
    it('should display formatted amount with currency', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} />);

      expect(screen.getByText('$9.99')).toBeInTheDocument();
    });

    it('should display transaction description', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} />);

      expect(screen.getByText('Premium Subscription')).toBeInTheDocument();
    });

    it('should display truncated transaction ID', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} />);

      // Should show first 8 characters plus ellipsis
      expect(screen.getByText('pi_12345...')).toBeInTheDocument();
    });

    it('should display formatted date from processedAt', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} />);

      // Date should be formatted as "January 15, 2024, 10:30 AM" (or similar based on locale)
      expect(screen.getByText(/January 15, 2024/i)).toBeInTheDocument();
    });

    it('should use createdAt if processedAt is not available', () => {
      const confirmationWithoutProcessedAt: PaymentConfirmation = {
        ...mockConfirmation,
        transaction: {
          ...mockConfirmation.transaction,
          processedAt: undefined,
        },
      };

      render(<PaymentConfirmationComponent confirmation={confirmationWithoutProcessedAt} />);

      expect(screen.getByText(/January 15, 2024/i)).toBeInTheDocument();
    });

    it('should display transaction status badge', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} />);

      expect(screen.getByText('succeeded')).toBeInTheDocument();
    });

    it('should format EUR currency correctly', () => {
      const eurConfirmation: PaymentConfirmation = {
        ...mockConfirmation,
        transaction: {
          ...mockConfirmation.transaction,
          amount: 19.99,
          currency: 'EUR',
        },
      };

      render(<PaymentConfirmationComponent confirmation={eurConfirmation} />);

      expect(screen.getByText('€19.99')).toBeInTheDocument();
    });

    it('should format GBP currency correctly', () => {
      const gbpConfirmation: PaymentConfirmation = {
        ...mockConfirmation,
        transaction: {
          ...mockConfirmation.transaction,
          amount: 15,
          currency: 'GBP',
        },
      };

      render(<PaymentConfirmationComponent confirmation={gbpConfirmation} />);

      expect(screen.getByText('£15.00')).toBeInTheDocument();
    });

    it('should handle lowercase currency codes', () => {
      const lowercaseCurrencyConfirmation: PaymentConfirmation = {
        ...mockConfirmation,
        transaction: {
          ...mockConfirmation.transaction,
          currency: 'usd',
        },
      };

      render(<PaymentConfirmationComponent confirmation={lowercaseCurrencyConfirmation} />);

      expect(screen.getByText('$9.99')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render receipt button when receiptUrl is provided', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} />);

      expect(screen.getByRole('button', { name: /Receipt/i })).toBeInTheDocument();
    });

    it('should not render receipt button when receiptUrl is not provided', () => {
      const confirmationWithoutReceipt: PaymentConfirmation = {
        ...mockConfirmation,
        receiptUrl: undefined,
      };

      render(<PaymentConfirmationComponent confirmation={confirmationWithoutReceipt} />);

      expect(screen.queryByRole('button', { name: /Receipt/i })).not.toBeInTheDocument();
    });

    it('should call onDownloadReceipt when receipt button clicked', () => {
      const onDownloadReceipt = jest.fn();
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} onDownloadReceipt={onDownloadReceipt} />);

      fireEvent.click(screen.getByRole('button', { name: /Receipt/i }));

      expect(onDownloadReceipt).toHaveBeenCalledTimes(1);
    });

    it('should render copy ID button', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} />);

      expect(screen.getByRole('button', { name: /Copy ID/i })).toBeInTheDocument();
    });

    it('should copy transaction ID to clipboard when copy button clicked', async () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} />);

      fireEvent.click(screen.getByRole('button', { name: /Copy ID/i }));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('pi_1234567890abcdef');
      });
    });
  });

  describe('Next Steps Section', () => {
    it('should render next steps when provided and showNextSteps is true', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} showNextSteps={true} />);

      expect(screen.getByText("What's Next?")).toBeInTheDocument();
      expect(screen.getByText('Check your email for the receipt')).toBeInTheDocument();
      expect(screen.getByText('Access your premium features from the dashboard')).toBeInTheDocument();
      expect(screen.getByText('Contact support if you have any questions')).toBeInTheDocument();
    });

    it('should not render next steps when showNextSteps is false', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} showNextSteps={false} />);

      expect(screen.queryByText("What's Next?")).not.toBeInTheDocument();
    });

    it('should not render next steps when nextSteps is empty', () => {
      const confirmationWithoutSteps: PaymentConfirmation = {
        ...mockConfirmation,
        nextSteps: [],
      };

      render(<PaymentConfirmationComponent confirmation={confirmationWithoutSteps} showNextSteps={true} />);

      expect(screen.queryByText("What's Next?")).not.toBeInTheDocument();
    });

    it('should not render next steps when nextSteps is undefined', () => {
      const confirmationWithoutSteps: PaymentConfirmation = {
        ...mockConfirmation,
        nextSteps: undefined,
      };

      render(<PaymentConfirmationComponent confirmation={confirmationWithoutSteps} showNextSteps={true} />);

      expect(screen.queryByText("What's Next?")).not.toBeInTheDocument();
    });

    it('should render numbered steps correctly', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} showNextSteps={true} />);

      // Check for step numbers 1, 2, 3
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render subscription badge when isSubscription is true', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} showNextSteps={true} />);

      expect(screen.getByText('Premium features are now active!')).toBeInTheDocument();
      expect(
        screen.getByText('You can start enjoying unlimited searches and global results immediately.')
      ).toBeInTheDocument();
    });

    it('should not render subscription badge when isSubscription is false', () => {
      const oneTimePaymentConfirmation: PaymentConfirmation = {
        ...mockConfirmation,
        isSubscription: false,
      };

      render(<PaymentConfirmationComponent confirmation={oneTimePaymentConfirmation} showNextSteps={true} />);

      expect(screen.queryByText('Premium features are now active!')).not.toBeInTheDocument();
    });

    it('should default showNextSteps to true', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} />);

      expect(screen.getByText("What's Next?")).toBeInTheDocument();
    });
  });

  describe('Continue Button', () => {
    it('should render continue button when onContinue is provided', () => {
      const onContinue = jest.fn();
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} onContinue={onContinue} />);

      expect(screen.getByRole('button', { name: /Continue to Dashboard/i })).toBeInTheDocument();
    });

    it('should not render continue button when onContinue is not provided', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} />);

      expect(screen.queryByRole('button', { name: /Continue to Dashboard/i })).not.toBeInTheDocument();
    });

    it('should call onContinue when continue button clicked', () => {
      const onContinue = jest.fn();
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} onContinue={onContinue} />);

      fireEvent.click(screen.getByRole('button', { name: /Continue to Dashboard/i }));

      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });

  describe('Security Footer', () => {
    it('should always render security footer', () => {
      render(<PaymentConfirmationComponent confirmation={mockConfirmation} />);

      expect(screen.getByText('Stripe Security')).toBeInTheDocument();
      expect(screen.getByText('PCI Compliant')).toBeInTheDocument();
      expect(screen.getByText('Your payment was processed securely. Receipt sent to your email.')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', () => {
      const largeAmountConfirmation: PaymentConfirmation = {
        ...mockConfirmation,
        transaction: {
          ...mockConfirmation.transaction,
          amount: 9999.99,
        },
      };

      render(<PaymentConfirmationComponent confirmation={largeAmountConfirmation} />);

      expect(screen.getByText('$9,999.99')).toBeInTheDocument();
    });

    it('should handle decimal amounts correctly', () => {
      const decimalConfirmation: PaymentConfirmation = {
        ...mockConfirmation,
        transaction: {
          ...mockConfirmation.transaction,
          amount: 0.99,
        },
      };

      render(<PaymentConfirmationComponent confirmation={decimalConfirmation} />);

      expect(screen.getByText('$0.99')).toBeInTheDocument();
    });

    it('should handle very long transaction IDs', () => {
      const longIdConfirmation: PaymentConfirmation = {
        ...mockConfirmation,
        transaction: {
          ...mockConfirmation.transaction,
          id: 'pi_verylongtransactionid1234567890abcdefghijklmnop',
        },
      };

      render(<PaymentConfirmationComponent confirmation={longIdConfirmation} />);

      // Should still show first 8 characters plus ellipsis
      expect(screen.getByText('pi_veryl...')).toBeInTheDocument();
    });

    it('should handle single next step', () => {
      const singleStepConfirmation: PaymentConfirmation = {
        ...mockConfirmation,
        nextSteps: ['Check your email'],
      };

      render(<PaymentConfirmationComponent confirmation={singleStepConfirmation} showNextSteps={true} />);

      expect(screen.getByText('Check your email')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should render complete payment confirmation with all features', () => {
      const onContinue = jest.fn();
      const onDownloadReceipt = jest.fn();

      render(
        <PaymentConfirmationComponent
          confirmation={mockConfirmation}
          onContinue={onContinue}
          onDownloadReceipt={onDownloadReceipt}
          showNextSteps={true}
        />
      );

      // Success header
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument();

      // Transaction details
      expect(screen.getByText('$9.99')).toBeInTheDocument();
      expect(screen.getByText('Premium Subscription')).toBeInTheDocument();

      // Action buttons
      expect(screen.getByRole('button', { name: /Receipt/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copy ID/i })).toBeInTheDocument();

      // Next steps
      expect(screen.getByText("What's Next?")).toBeInTheDocument();
      expect(screen.getByText('Premium features are now active!')).toBeInTheDocument();

      // Continue button
      expect(screen.getByRole('button', { name: /Continue to Dashboard/i })).toBeInTheDocument();

      // Security footer
      expect(screen.getByText('Stripe Security')).toBeInTheDocument();
    });

    it('should render minimal payment confirmation without optional features', () => {
      const minimalConfirmation: PaymentConfirmation = {
        transaction: {
          id: 'pi_minimal',
          userId: 'user_123',
          stripePaymentIntentId: 'pi_minimal',
          clientSecret: 'pi_minimal_secret',
          amount: 5.0,
          currency: 'USD',
          description: 'One-time Payment',
          status: 'succeeded',
          createdAt: '2024-01-15T10:30:00Z',
        },
        receiptUrl: undefined,
        nextSteps: undefined,
        isSubscription: false,
      };

      render(<PaymentConfirmationComponent confirmation={minimalConfirmation} showNextSteps={false} />);

      // Success header - always shown
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument();

      // Transaction details - always shown
      expect(screen.getByText('$5.00')).toBeInTheDocument();

      // No receipt button
      expect(screen.queryByRole('button', { name: /Receipt/i })).not.toBeInTheDocument();

      // Copy button still shown
      expect(screen.getByRole('button', { name: /Copy ID/i })).toBeInTheDocument();

      // No next steps
      expect(screen.queryByText("What's Next?")).not.toBeInTheDocument();

      // No continue button
      expect(screen.queryByRole('button', { name: /Continue to Dashboard/i })).not.toBeInTheDocument();

      // Security footer - always shown
      expect(screen.getByText('Stripe Security')).toBeInTheDocument();
    });
  });
});
