/**
 * CompletionStep Integration Tests
 * Tests the final onboarding step with preferences summary and completion flow
 * Session 10 - Final Push to 90%+ Coverage
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompletionStep } from '../steps/CompletionStep';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useRouter } from 'next/navigation';
import { createMockOnboardingStatus } from '@/test-utils/mockFactories';
import { formatPlanPrice, formatPremiumMonthlyEquivalent, premiumPlan } from '@/lib/pricing';

// Mock the OnboardingContext
jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockUseOnboarding = useOnboarding as jest.MockedFunction<typeof useOnboarding>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('CompletionStep', () => {
  const mockCompleteOnboarding = jest.fn();
  const mockTrackAnalyticsEvent = jest.fn();
  const mockRouterPush = jest.fn();

  const defaultMockState = {
    status: createMockOnboardingStatus({
      currentStep: 5,
      isCompleted: false,
      streamingServices: [],
      regionPreferences: [],
      contentPreferences: [],
    }),
    progress: null,
    isLoading: false,
    error: null,
    completeOnboarding: mockCompleteOnboarding,
    trackAnalyticsEvent: mockTrackAnalyticsEvent,
    getStatus: jest.fn(),
    getProgress: jest.fn(),
    clearError: jest.fn(),
    startOnboarding: jest.fn(),
    updateStep: jest.fn(),
    addStreamingServices: jest.fn(),
    removeStreamingService: jest.fn(),
    addRegionPreferences: jest.fn(),
    addContentPreferences: jest.fn(),
    skipOnboarding: jest.fn(),
    resetOnboarding: jest.fn(),
    getPopularServices: jest.fn(),
    getPersonalizationPreferences: jest.fn(),
    popularServices: [],
    personalizationPreferences: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOnboarding.mockReturnValue(defaultMockState);
    mockUseRouter.mockReturnValue({
      push: mockRouterPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    });
  });

  describe('Initial Rendering', () => {
    it('renders the completion celebration', () => {
      render(<CompletionStep />);

      expect(screen.getByText("You're All Set!")).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('renders Start Searching button', () => {
      render(<CompletionStep />);

      expect(screen.getByRole('button', { name: /Start Searching/i })).toBeInTheDocument();
    });

    it('renders What\'s Next section', () => {
      render(<CompletionStep />);

      expect(screen.getByText("What's Next?")).toBeInTheDocument();
      // "Start Searching" appears twice - button and heading. Use getAllByText
      const startSearchingElements = screen.getAllByText('Start Searching');
      expect(startSearchingElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Adjust Preferences')).toBeInTheDocument();
      expect(screen.getByText('Get Personalized Results')).toBeInTheDocument();
      expect(screen.getByText('VPN-Friendly')).toBeInTheDocument();
    });

    it('renders free trial promotion', () => {
      render(<CompletionStep />);

      expect(screen.getByText('Start Your 30-Day Free Trial')).toBeInTheDocument();
      expect(screen.getByText(/Unlimited searches/)).toBeInTheDocument();
      expect(screen.getByText(/Access to 42 streaming services/)).toBeInTheDocument();
    });

    it('renders Learn More button for pricing', () => {
      render(<CompletionStep />);

      expect(screen.getByRole('button', { name: /Learn More About Premium/i })).toBeInTheDocument();
    });
  });

  describe('Summary Message', () => {
    it('shows message for no preferences set', () => {
      render(<CompletionStep />);

      expect(screen.getByText(/You chose to explore GeoLeap without setting preferences/)).toBeInTheDocument();
    });

    it('shows summary with streaming services count', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: {
          ...defaultMockState.status!,
          streamingServices: [
            { serviceName: 'Netflix', id: '1', isActive: true, addedAt: '2024-01-01T00:00:00Z' },
            { serviceName: 'Disney+', id: '2', isActive: true, addedAt: '2024-01-01T00:00:00Z' },
          ],
        },
      });

      render(<CompletionStep />);

      expect(screen.getAllByText(/2 streaming services/).length).toBeGreaterThanOrEqual(1);
    });

    it('shows summary with regions count', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: {
          ...defaultMockState.status!,
          regionPreferences: [
            { countryCode: 'US', isPrimary: true, priority: 1 },
            { countryCode: 'GB', isPrimary: false, priority: 2 },
            { countryCode: 'CA', isPrimary: false, priority: 3 },
          ],
        },
      });

      render(<CompletionStep />);

      expect(screen.getByText(/3 regions/)).toBeInTheDocument();
    });

    it('shows summary with content types count', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: {
          ...defaultMockState.status!,
          contentPreferences: [
            { contentType: 'movie', isEnabled: true, priority: 1 },
          ],
        },
      });

      render(<CompletionStep />);

      expect(screen.getByText(/1 content type/)).toBeInTheDocument();
    });

    it('combines all preferences in summary message', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: {
          ...defaultMockState.status!,
          streamingServices: [{ serviceName: 'Netflix', id: '1', isActive: true, addedAt: '2024-01-01T00:00:00Z' }],
          regionPreferences: [{ countryCode: 'US', isPrimary: true, priority: 1 }],
          contentPreferences: [{ contentType: 'movie', isEnabled: true, priority: 1 }],
        },
      });

      render(<CompletionStep />);

      expect(screen.getByText(/Perfect!/)).toBeInTheDocument();
    });
  });

  describe('Preferences Summary Display', () => {
    it('shows streaming services section when services are selected', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: {
          ...defaultMockState.status!,
          streamingServices: [
            { serviceName: 'Netflix', id: '1', isActive: true, addedAt: '2024-01-01T00:00:00Z' },
            { serviceName: 'Disney+', id: '2', isActive: true, addedAt: '2024-01-01T00:00:00Z' },
          ],
        },
      });

      render(<CompletionStep />);

      expect(screen.getByText('Your Services')).toBeInTheDocument();
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText('Disney+')).toBeInTheDocument();
    });

    it('shows +N more badge when more than 3 services', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: {
          ...defaultMockState.status!,
          streamingServices: [
            { serviceName: 'Netflix', id: '1', isActive: true, addedAt: '2024-01-01T00:00:00Z' },
            { serviceName: 'Disney+', id: '2', isActive: true, addedAt: '2024-01-01T00:00:00Z' },
            { serviceName: 'HBO Max', id: '3', isActive: true, addedAt: '2024-01-01T00:00:00Z' },
            { serviceName: 'Prime Video', id: '4', isActive: true, addedAt: '2024-01-01T00:00:00Z' },
            { serviceName: 'Hulu', id: '5', isActive: true, addedAt: '2024-01-01T00:00:00Z' },
          ],
        },
      });

      render(<CompletionStep />);

      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('shows regions section when regions are selected', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: {
          ...defaultMockState.status!,
          regionPreferences: [
            { countryCode: 'US', isPrimary: true, priority: 1 },
          ],
        },
      });

      render(<CompletionStep />);

      expect(screen.getByText('Your Regions')).toBeInTheDocument();
      expect(screen.getByText(/United States/)).toBeInTheDocument();
    });

    it('shows content preferences section when content is selected', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: {
          ...defaultMockState.status!,
          contentPreferences: [
            { contentType: 'movie', isEnabled: true, priority: 1 },
            { contentType: 'tv_show', isEnabled: true, priority: 2 },
          ],
        },
      });

      render(<CompletionStep />);

      expect(screen.getByText('Your Interests')).toBeInTheDocument();
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('TV Shows')).toBeInTheDocument();
    });

    it('does not show preferences section when nothing is selected', () => {
      render(<CompletionStep />);

      expect(screen.queryByText('Your Services')).not.toBeInTheDocument();
      expect(screen.queryByText('Your Regions')).not.toBeInTheDocument();
      expect(screen.queryByText('Your Interests')).not.toBeInTheDocument();
    });
  });

  describe('Completion Flow', () => {
    it('calls completeOnboarding when Start Searching is clicked', async () => {
      const user = userEvent.setup();
      render(<CompletionStep />);

      await user.click(screen.getByRole('button', { name: /Start Searching/i }));

      await waitFor(() => {
        expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
      });
    });

    it('tracks onboarding_completed analytics event', async () => {
      const user = userEvent.setup();
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: {
          ...defaultMockState.status!,
          streamingServices: [{ serviceName: 'Netflix', id: '1', isActive: true, addedAt: '2024-01-01T00:00:00Z' }],
          regionPreferences: [{ countryCode: 'US', isPrimary: true, priority: 1 }],
          contentPreferences: [{ contentType: 'movie', isEnabled: true, priority: 1 }],
        },
      });

      render(<CompletionStep />);

      await user.click(screen.getByRole('button', { name: /Start Searching/i }));

      await waitFor(() => {
        expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith('onboarding_completed', 5, {
          total_services: 1,
          total_regions: 1,
          total_content_types: 1,
        });
      });
    });

    it('redirects to home when no onComplete callback provided', async () => {
      const user = userEvent.setup();
      render(<CompletionStep />);

      await user.click(screen.getByRole('button', { name: /Start Searching/i }));

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/');
      });
    });

    it('calls onComplete callback when provided', async () => {
      const user = userEvent.setup();
      const onComplete = jest.fn();

      render(<CompletionStep onComplete={onComplete} />);

      await user.click(screen.getByRole('button', { name: /Start Searching/i }));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Pricing Navigation', () => {
    it('navigates to pricing page when Learn More is clicked', async () => {
      const user = userEvent.setup();
      render(<CompletionStep />);

      await user.click(screen.getByRole('button', { name: /Learn More About Premium/i }));

      expect(mockRouterPush).toHaveBeenCalledWith('/pricing');
    });
  });

  describe('Loading State', () => {
    it('disables Start Searching button when loading', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        isLoading: true,
      });

      render(<CompletionStep />);

      expect(screen.getByRole('button', { name: /Setting up.../i })).toBeDisabled();
    });

    it('shows loading spinner in button when loading', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        isLoading: true,
      });

      render(<CompletionStep />);

      expect(screen.getByText('Setting up...')).toBeInTheDocument();
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks step_started event on mount', () => {
      render(<CompletionStep />);

      expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith('step_started', 5);
    });
  });

  describe('Feature Highlights', () => {
    it('displays all free trial features', () => {
      render(<CompletionStep />);

      expect(screen.getByText('Unlimited searches and streaming discovery')).toBeInTheDocument();
      expect(screen.getByText('Access to 42 streaming services')).toBeInTheDocument();
      expect(screen.getByText('Personalized VPN recommendations')).toBeInTheDocument();
      expect(screen.getByText('Cancel anytime during your trial')).toBeInTheDocument();
    });

    it('displays pricing information', () => {
      render(<CompletionStep />);

      expect(screen.getByText(new RegExp(formatPlanPrice(premiumPlan).replace('$', '\\$')))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`about ${formatPremiumMonthlyEquivalent().replace('$', '\\$')}`))).toBeInTheDocument();
    });
  });

  describe('What\'s Next Section', () => {
    it('displays search guidance', () => {
      render(<CompletionStep />);

      expect(screen.getByText(/Search for any movie or TV show/)).toBeInTheDocument();
    });

    it('displays preferences guidance', () => {
      render(<CompletionStep />);

      expect(screen.getByText(/Update your preferences anytime/)).toBeInTheDocument();
    });

    it('displays personalization guidance', () => {
      render(<CompletionStep />);

      expect(screen.getByText(/Your preferences will help show/)).toBeInTheDocument();
    });

    it('displays VPN guidance', () => {
      render(<CompletionStep />);

      expect(screen.getByText(/designed to work seamlessly with VPN/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible call to action', () => {
      render(<CompletionStep />);

      const ctaButton = screen.getByRole('button', { name: /Start Searching/i });
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).not.toBeDisabled();
    });

    it('provides helpful context about next steps', () => {
      render(<CompletionStep />);

      expect(screen.getByText(/Ready to discover where your favorite content is streaming/)).toBeInTheDocument();
    });
  });
});
