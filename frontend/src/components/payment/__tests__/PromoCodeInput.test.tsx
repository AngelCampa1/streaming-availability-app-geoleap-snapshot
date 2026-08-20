/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromoCodeInput, PromoCodeBadge } from '../PromoCodeInput';
import { Promotion } from '../../../lib/types/promotion';
import { server, http, HttpResponse } from '@/mocks/server';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Sample promotion data for testing
const mockPromotion: Promotion = {
  id: 'promo-123',
  name: 'Launch Special',
  code: 'LAUNCH100',
  description: 'Get 3 months free!',
  isActive: true,
  maxRedemptions: 100,
  currentRedemptions: 50,
  expiresAt: '2025-12-31T23:59:59Z',
  percentOff: 100,
  duration: 'repeating',
  durationInMonths: 3,
  targetPlanType: 'premium',
  firstTimeOnly: true,
  autoApply: false,
  availableOnMobile: true,
  availableOnWeb: true,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('PromoCodeInput', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    // Default handler for promo validation
    server.use(
      http.get('*/api/promotions/validate/*', () => {
        return HttpResponse.json({
          isValid: true,
          promotion: mockPromotion,
        });
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('Initial State', () => {
    it('renders collapsed state with "Have a promo code?" text', () => {
      render(<PromoCodeInput />);

      expect(screen.getByText('Have a promo code?')).toBeInTheDocument();
    });

    it('expands input field when clicked', async () => {
      render(<PromoCodeInput />);

      const toggleButton = screen.getByText('Have a promo code?');
      await user.click(toggleButton);

      expect(screen.getByPlaceholderText('Enter promo code')).toBeInTheDocument();
    });

    it('does not expand when disabled', async () => {
      render(<PromoCodeInput disabled />);

      const toggleButton = screen.getByText('Have a promo code?');
      // The button should have cursor-not-allowed class when disabled
      expect(toggleButton).toBeInTheDocument();
      // Check if the button's parent has the disabled styling
      expect(toggleButton.closest('button')).toHaveAttribute('disabled');
    });
  });

  describe('Input Field Behavior', () => {
    it('converts input to uppercase', async () => {
      render(<PromoCodeInput />);

      // Expand the input
      await user.click(screen.getByText('Have a promo code?'));

      const input = screen.getByPlaceholderText('Enter promo code');
      await user.type(input, 'launch100');

      expect(input).toHaveValue('LAUNCH100');
    });

    it('removes non-alphanumeric characters', async () => {
      render(<PromoCodeInput />);

      await user.click(screen.getByText('Have a promo code?'));

      const input = screen.getByPlaceholderText('Enter promo code');
      await user.type(input, 'launch-100!@#');

      expect(input).toHaveValue('LAUNCH100');
    });

    it('shows Apply button when code is entered', async () => {
      render(<PromoCodeInput />);

      await user.click(screen.getByText('Have a promo code?'));

      const input = screen.getByPlaceholderText('Enter promo code');
      await user.type(input, 'TEST');

      expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    });

    it('closes input when X button is clicked', async () => {
      render(<PromoCodeInput />);

      await user.click(screen.getByText('Have a promo code?'));

      // Find and click the close button (X icon)
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.querySelector('svg.lucide-x'));
      if (closeButton) {
        await user.click(closeButton);
      }

      // Should be back to collapsed state
      await waitFor(() => {
        expect(screen.getByText('Have a promo code?')).toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('shows error when trying to apply empty code', async () => {
      render(<PromoCodeInput />);

      await user.click(screen.getByText('Have a promo code?'));

      // The input would be empty, so the Apply button shouldn't appear
      // But we test the validation logic
      const input = screen.getByPlaceholderText('Enter promo code');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Please enter a promo code')).toBeInTheDocument();
      });
    });

    it('calls validatePromoCode API when Apply is clicked', async () => {
      let capturedCode: string | null = null;

      // Use MSW to capture the code being validated
      server.use(
        http.get('*/api/promotions/validate/:code', ({ params }) => {
          capturedCode = params.code as string;
          return HttpResponse.json({
            isValid: true,
            promotion: mockPromotion,
          });
        })
      );

      render(<PromoCodeInput />);

      await user.click(screen.getByText('Have a promo code?'));

      const input = screen.getByPlaceholderText('Enter promo code');
      await user.type(input, 'LAUNCH100');

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await user.click(applyButton);

      await waitFor(() => {
        expect(capturedCode).toBe('LAUNCH100');
      });
    });

    it('shows validated promotion preview', async () => {
      // Uses default handler from beforeEach

      render(<PromoCodeInput />);

      await user.click(screen.getByText('Have a promo code?'));

      const input = screen.getByPlaceholderText('Enter promo code');
      await user.type(input, 'LAUNCH100');

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText('Launch Special')).toBeInTheDocument();
        expect(screen.getByText(/100% off/)).toBeInTheDocument();
      });
    });

    it('shows error for invalid promo code', async () => {
      // Override handler to return invalid
      server.use(
        http.get('*/api/promotions/validate/:code', () => {
          return HttpResponse.json({
            isValid: false,
            errorMessage: 'Promo code not found',
          });
        })
      );

      render(<PromoCodeInput />);

      await user.click(screen.getByText('Have a promo code?'));

      const input = screen.getByPlaceholderText('Enter promo code');
      await user.type(input, 'INVALID');

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText('Promo code not found')).toBeInTheDocument();
      });
    });

    it('handles API error gracefully', async () => {
      // Use MSW to simulate network error
      server.use(
        http.get('*/api/promotions/validate/:code', () => {
          return HttpResponse.error();
        })
      );

      render(<PromoCodeInput />);

      await user.click(screen.getByText('Have a promo code?'));

      const input = screen.getByPlaceholderText('Enter promo code');
      await user.type(input, 'TEST');

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to validate code. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Applied Promotion State', () => {
    it('shows applied promotion badge when appliedPromotion prop is provided', () => {
      render(<PromoCodeInput appliedPromotion={mockPromotion} />);

      expect(screen.getByText('LAUNCH100')).toBeInTheDocument();
      expect(screen.getByText(/100% off/)).toBeInTheDocument();
    });

    it('calls onRemove when remove button is clicked', async () => {
      const onRemove = jest.fn();
      render(<PromoCodeInput appliedPromotion={mockPromotion} onRemove={onRemove} />);

      // Find and click the remove button (X icon)
      const removeButton = screen.getByRole('button');
      await user.click(removeButton);

      expect(onRemove).toHaveBeenCalled();
    });

    it('does not show remove button when disabled', () => {
      render(<PromoCodeInput appliedPromotion={mockPromotion} disabled />);

      // Should not find any buttons when disabled
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('calls onValidate after validation', async () => {
      const onValidate = jest.fn();
      // Uses default handler from beforeEach

      render(<PromoCodeInput onValidate={onValidate} />);

      await user.click(screen.getByText('Have a promo code?'));

      const input = screen.getByPlaceholderText('Enter promo code');
      await user.type(input, 'LAUNCH100');

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await user.click(applyButton);

      await waitFor(() => {
        expect(onValidate).toHaveBeenCalledWith(
          expect.objectContaining({
            isValid: true,
            promotion: expect.objectContaining({ code: 'LAUNCH100' }),
          })
        );
      });
    });

    it('calls onApply when applying validated promotion', async () => {
      const onApply = jest.fn().mockResolvedValue(undefined);
      // Uses default handler from beforeEach

      render(<PromoCodeInput onApply={onApply} />);

      await user.click(screen.getByText('Have a promo code?'));

      const input = screen.getByPlaceholderText('Enter promo code');
      await user.type(input, 'LAUNCH100');

      // First click validates
      await user.click(screen.getByRole('button', { name: 'Apply' }));

      // Wait for validation preview
      await waitFor(() => {
        expect(screen.getByText('Launch Special')).toBeInTheDocument();
      });

      // Second Apply button in the preview
      const applyButtons = screen.getAllByRole('button', { name: 'Apply' });
      await user.click(applyButtons[applyButtons.length - 1]);

      await waitFor(() => {
        expect(onApply).toHaveBeenCalledWith('LAUNCH100');
      });
    });
  });

  describe('Platform Support', () => {
    it('sends platform parameter in validation request', async () => {
      let capturedUrl: string | null = null;

      // Use MSW to capture the request URL
      server.use(
        http.get('*/api/promotions/validate/:code', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            isValid: true,
            promotion: mockPromotion,
          });
        })
      );

      render(<PromoCodeInput platform="ios" />);

      await user.click(screen.getByText('Have a promo code?'));

      const input = screen.getByPlaceholderText('Enter promo code');
      await user.type(input, 'TEST');

      await user.click(screen.getByRole('button', { name: 'Apply' }));

      await waitFor(() => {
        expect(capturedUrl).toContain('platform=ios');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('validates on Enter key press', async () => {
      let validationCalled = false;

      // Use MSW to verify API was called
      server.use(
        http.get('*/api/promotions/validate/:code', () => {
          validationCalled = true;
          return HttpResponse.json({
            isValid: true,
            promotion: mockPromotion,
          });
        })
      );

      render(<PromoCodeInput />);

      await user.click(screen.getByText('Have a promo code?'));

      const input = screen.getByPlaceholderText('Enter promo code');
      await user.type(input, 'LAUNCH100');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(validationCalled).toBe(true);
      });
    });
  });
});

describe('PromoCodeBadge', () => {
  const mockPromotion: Promotion = {
    id: 'promo-123',
    name: 'Test Promo',
    code: 'TEST50',
    isActive: true,
    currentRedemptions: 0,
    percentOff: 50,
    duration: 'once',
    firstTimeOnly: false,
    autoApply: false,
    availableOnMobile: true,
    availableOnWeb: true,
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('renders promotion code and discount', () => {
    render(<PromoCodeBadge promotion={mockPromotion} />);

    expect(screen.getByText('TEST50')).toBeInTheDocument();
    expect(screen.getByText('(50% off)')).toBeInTheDocument();
  });

  it('shows remove button when showRemove is true', () => {
    const onRemove = jest.fn();
    render(<PromoCodeBadge promotion={mockPromotion} onRemove={onRemove} showRemove />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('hides remove button when showRemove is false', () => {
    render(<PromoCodeBadge promotion={mockPromotion} showRemove={false} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked', async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(<PromoCodeBadge promotion={mockPromotion} onRemove={onRemove} showRemove />);

    await user.click(screen.getByRole('button'));

    expect(onRemove).toHaveBeenCalled();
  });

  it('displays amount off correctly', () => {
    const amountPromotion: Promotion = {
      ...mockPromotion,
      percentOff: undefined,
      amountOff: 10,
      amountOffCurrency: 'USD',
    };

    render(<PromoCodeBadge promotion={amountPromotion} />);

    expect(screen.getByText('($10.00 USD off)')).toBeInTheDocument();
  });
});
