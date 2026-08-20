import { render, screen } from '@testing-library/react';
import PricingPage from './page';
import { formatUsd, premiumPlan } from '@/lib/pricing';

// Mock AppLayout
jest.mock('@/components/layout/AppLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock useAuth
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

describe('PricingPage', () => {
  it('renders "Free" plan name', () => {
    render(<PricingPage />);
    const freeElements = screen.getAllByText('Free');
    expect(freeElements.length).toBeGreaterThan(0);
  });

  it('renders "Premium" plan name', () => {
    render(<PricingPage />);
    const premiumElements = screen.getAllByText(/^Premium$/i);
    expect(premiumElements.length).toBeGreaterThan(0);
  });

  it('does NOT render "Lifetime" tier', () => {
    render(<PricingPage />);
    expect(screen.queryByText(/Lifetime/i)).not.toBeInTheDocument();
  });

  it('does NOT render "$89.99"', () => {
    render(<PricingPage />);
    expect(screen.queryByText(/\$89\.99/)).not.toBeInTheDocument();
  });

  it('does NOT render monthly billing toggle', () => {
    render(<PricingPage />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    // "monthly" may appear in price comparison text (e.g., "Save 58% vs monthly")
    // but there should be no billing toggle switch
  });

  it('renders rounded Premium annual price', () => {
    render(<PricingPage />);
    const priceElements = screen.getAllByText(formatUsd(premiumPlan.priceUsd));
    expect(priceElements.length).toBeGreaterThan(0);
  });

  it('renders "30-Day Free Trial" text', () => {
    render(<PricingPage />);
    const trialElements = screen.getAllByText(/30-Day Free Trial/i);
    expect(trialElements.length).toBeGreaterThan(0);
  });

  it('renders "30 days" or "30-day" in trial description', () => {
    render(<PricingPage />);
    const trialText = screen.getAllByText(/30.?-day/i);
    expect(trialText.length).toBeGreaterThan(0);
  });
});
