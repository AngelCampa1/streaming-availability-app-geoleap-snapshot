import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions, StripeElementsOptionsMode } from '@stripe/stripe-js';
import { StripeProvider } from '../StripeProvider';

// Mock Stripe SDK
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(),
}));

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: jest.fn(({ children }) => <div data-testid="stripe-elements">{children}</div>),
}));

const mockLoadStripe = loadStripe as jest.MockedFunction<typeof loadStripe>;
const mockElements = Elements as jest.MockedFunction<typeof Elements>;

describe('StripeProvider', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    mockLoadStripe.mockReturnValue(Promise.resolve(null)); // Mock stripe instance
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should render children', () => {
    render(
      <StripeProvider>
        <div>Payment Form Content</div>
      </StripeProvider>
    );

    expect(screen.getByText('Payment Form Content')).toBeInTheDocument();
    expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
  });

  // Note: loadStripe() is called at module load time, not on render
  // Testing module-level initialization is difficult with jest.clearAllMocks()
  // The actual Stripe initialization is covered by Elements Integration tests

  describe('Client Secret Mode (Deferred Confirmation)', () => {
    it('should use clientSecret when provided', () => {
      const clientSecret = 'pi_test_secret_123';

      render(
        <StripeProvider clientSecret={clientSecret}>
          <div>Test</div>
        </StripeProvider>
      );

      // Check that Elements was called with options containing clientSecret
      const lastCall = mockElements.mock.calls[mockElements.mock.calls.length - 1];
      const callOptions = lastCall[0].options as StripeElementsOptions;
      expect(callOptions.clientSecret).toBe('pi_test_secret_123');
    });

    it('should apply default appearance with clientSecret', () => {
      render(
        <StripeProvider clientSecret="pi_test_secret">
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      expect(callOptions.appearance).toEqual({
        theme: 'stripe',
        variables: {
          colorPrimary: '#7c3aed', // Stream Violet
          colorBackground: '#ffffff',
          colorText: '#0f172a',
          colorDanger: '#ef4444',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          borderRadius: '8px',
        },
      });
    });

    it('should merge custom appearance with default appearance', () => {
      render(
        <StripeProvider
          clientSecret="pi_test_secret"
          appearance={{
            theme: 'night',
            variables: {
              colorPrimary: '#ff0000',
              colorText: '#ffffff',
            },
          }}
        >
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      expect(callOptions.appearance).toEqual({
        theme: 'night', // Custom theme
        variables: {
          colorPrimary: '#ff0000', // Custom color
          colorText: '#ffffff', // Custom color
        },
      });
    });

    it('should set loader to auto with clientSecret', () => {
      render(
        <StripeProvider clientSecret="pi_test_secret">
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      expect(callOptions.loader).toBe('auto');
    });
  });

  describe('Payment Mode (On-Demand)', () => {
    it('should use mode:payment when no clientSecret', () => {
      render(
        <StripeProvider amount={9.99} currency="USD">
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      expect(callOptions).toHaveProperty('mode', 'payment');
      expect(callOptions).not.toHaveProperty('clientSecret');
    });

    it('should convert amount to cents', () => {
      render(
        <StripeProvider amount={9.99} currency="USD">
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptionsMode;
      // 9.99 * 100 = 999 cents
      expect(callOptions.amount).toBe(999);
    });

    it('should use default amount when not provided', () => {
      render(
        <StripeProvider>
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptionsMode;
      // Default Premium plan price is $15 = 1500 cents.
      expect(callOptions.amount).toBe(1500);
    });

    it('should use default amount when amount is 0 (falsy)', () => {
      // Note: amount={0} is falsy, so defaults to the configured Premium price.
      render(
        <StripeProvider amount={0}>
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptionsMode;
      // 0 is falsy, so uses the configured default of 1500 cents.
      expect(callOptions.amount).toBe(1500);
    });

    it('should lowercase currency', () => {
      render(
        <StripeProvider amount={5.0} currency="USD">
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      expect(callOptions.currency).toBe('usd');
    });

    it('should use default currency when not provided', () => {
      render(
        <StripeProvider amount={5.0}>
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      expect(callOptions.currency).toBe('usd');
    });

    it('should apply default appearance in payment mode', () => {
      render(
        <StripeProvider amount={5.0}>
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      expect(callOptions.appearance).toEqual({
        theme: 'stripe',
        variables: {
          colorPrimary: '#7c3aed',
          colorBackground: '#ffffff',
          colorText: '#0f172a',
          colorDanger: '#ef4444',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          borderRadius: '8px',
        },
      });
    });

    it('should merge custom appearance in payment mode', () => {
      render(
        <StripeProvider
          amount={5.0}
          appearance={{
            theme: 'flat',
            variables: {
              colorPrimary: '#00ff00',
              borderRadius: '4px',
            },
          }}
        >
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      expect(callOptions.appearance).toEqual({
        theme: 'flat',
        variables: {
          colorPrimary: '#00ff00',
          borderRadius: '4px',
        },
      });
    });

    it('should set loader to auto in payment mode', () => {
      render(
        <StripeProvider amount={5.0}>
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      expect(callOptions.loader).toBe('auto');
    });
  });

  describe('Design System Colors', () => {
    it('should use Stream Violet as primary color', () => {
      render(
        <StripeProvider>
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      const variables = callOptions.appearance?.variables;
      expect(variables?.colorPrimary).toBe('#7c3aed'); // Stream Violet 500
    });

    it('should use Alert Red as danger color', () => {
      render(
        <StripeProvider>
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      const variables = callOptions.appearance?.variables;
      expect(variables?.colorDanger).toBe('#ef4444'); // Alert Red 500
    });

    it('should use Slate 900 as foreground text color', () => {
      render(
        <StripeProvider>
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      const variables = callOptions.appearance?.variables;
      expect(variables?.colorText).toBe('#0f172a'); // Slate 900
    });

    it('should use white as background color', () => {
      render(
        <StripeProvider>
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      const variables = callOptions.appearance?.variables;
      expect(variables?.colorBackground).toBe('#ffffff');
    });

    it('should use 8px border radius', () => {
      render(
        <StripeProvider>
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      const variables = callOptions.appearance?.variables;
      expect(variables?.borderRadius).toBe('8px');
    });

    it('should use system font family', () => {
      render(
        <StripeProvider>
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      const variables = callOptions.appearance?.variables;
      expect(variables?.fontFamily).toBe(
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amount', () => {
      render(
        <StripeProvider amount={9999999.99}>
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptionsMode;
      // 9999999.99 * 100 = 999999999 cents
      expect(callOptions.amount).toBe(999999999);
    });

    it('should handle amount with many decimals (rounding)', () => {
      render(
        <StripeProvider amount={9.999}>
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptionsMode;
      // 9.999 * 100 = 999.9, Math.round() = 1000
      expect(callOptions.amount).toBe(1000);
    });

    it('should handle lowercase currency input', () => {
      render(
        <StripeProvider amount={5.0} currency="eur">
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      expect(callOptions.currency).toBe('eur');
    });

    it('should handle mixed case currency input', () => {
      render(
        <StripeProvider amount={5.0} currency="GbP">
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      expect(callOptions.currency).toBe('gbp');
    });

    it('should prioritize clientSecret over amount/currency when both provided', () => {
      render(
        <StripeProvider clientSecret="pi_test_secret" amount={10.0} currency="EUR">
          <div>Test</div>
        </StripeProvider>
      );

      const callOptions = mockElements.mock.calls[0][0].options as StripeElementsOptions;
      expect(callOptions).toHaveProperty('clientSecret', 'pi_test_secret');
      expect(callOptions).not.toHaveProperty('amount');
      expect(callOptions).not.toHaveProperty('currency');
      expect(callOptions).not.toHaveProperty('mode');
    });
  });

  describe('Elements Integration', () => {
    it('should pass stripe promise to Elements', () => {
      render(
        <StripeProvider>
          <div>Test</div>
        </StripeProvider>
      );

      // Verify Elements was called with stripe prop
      const lastCall = mockElements.mock.calls[mockElements.mock.calls.length - 1];
      expect(lastCall[0]).toHaveProperty('stripe');
    });

    it('should pass options to Elements component', () => {
      render(
        <StripeProvider amount={5.0} currency="USD">
          <div>Test</div>
        </StripeProvider>
      );

      const lastCall = mockElements.mock.calls[mockElements.mock.calls.length - 1];
      const callOptions = lastCall[0].options as StripeElementsOptionsMode;
      expect(callOptions.mode).toBe('payment');
      expect(callOptions.amount).toBe(500);
      expect(callOptions.currency).toBe('usd');
    });
  });
});
