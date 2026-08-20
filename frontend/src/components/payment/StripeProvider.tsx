'use client';

import React, { ReactNode } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { premiumPlan } from '@/lib/pricing';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export interface StripeProviderProps {
  children: ReactNode;
  clientSecret?: string;
  /** When true and no clientSecret, uses deferred payment mode */
  amount?: number;
  currency?: string;
  appearance?: {
    theme?: 'stripe' | 'night' | 'flat';
    variables?: {
      colorPrimary?: string;
      colorBackground?: string;
      colorText?: string;
      colorDanger?: string;
      fontFamily?: string;
      borderRadius?: string;
    };
  };
}

export const StripeProvider: React.FC<StripeProviderProps> = ({
  children,
  clientSecret,
  amount,
  currency = 'usd',
  appearance,
}) => {
  // Design system color mappings for Stripe theme
  // Uses Stream Violet palette - see docs/UNIFIED_COLOR_SYSTEM.md
  const STRIPE_THEME_COLORS = {
    colorPrimary: '#7c3aed', // --primary (Stream Violet 500)
    colorBackground: '#ffffff', // --background (light mode)
    colorText: '#0f172a', // --foreground (Slate 900)
    colorDanger: '#ef4444', // --error (Alert Red 500)
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    borderRadius: '8px',
  } as const;

  const defaultAppearance = {
    theme: 'stripe' as const,
    variables: STRIPE_THEME_COLORS,
  };

  // If clientSecret is provided, use it (deferred confirmation flow)
  // Otherwise, use mode: 'payment' for on-demand payment intent creation
  const options: StripeElementsOptions = clientSecret
    ? {
        clientSecret,
        appearance: { ...defaultAppearance, ...appearance },
        loader: 'auto' as const,
      }
    : {
        mode: 'payment' as const,
        amount: amount ? Math.round(amount * 100) : Math.round(premiumPlan.priceUsd * 100),
        currency: currency.toLowerCase(),
        appearance: { ...defaultAppearance, ...appearance },
        loader: 'auto' as const,
      };

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
