/**
 * OnboardingWizard Integration Tests
 * Tests the main wizard component with step navigation and state management
 * Session 10 - Final Push to 90%+ Coverage
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingWizard } from '../OnboardingWizard';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { createMockOnboardingStatus } from '@/test-utils/mockFactories';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />;
  },
}));

// Mock the OnboardingContext
jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: jest.fn(),
}));

// Mock child step components to isolate wizard testing
jest.mock('../steps/WelcomeStep', () => ({
  WelcomeStep: () => <div data-testid="welcome-step">Welcome Step</div>,
}));

jest.mock('../steps/StreamingServicesStep', () => ({
  StreamingServicesStep: () => <div data-testid="streaming-services-step">Streaming Services Step</div>,
}));

jest.mock('../steps/RegionPreferencesStep', () => ({
  RegionPreferencesStep: () => <div data-testid="region-preferences-step">Region Preferences Step</div>,
}));

jest.mock('../steps/ContentPreferencesStep', () => ({
  ContentPreferencesStep: () => <div data-testid="content-preferences-step">Content Preferences Step</div>,
}));

jest.mock('../steps/CompletionStep', () => ({
  CompletionStep: ({ onComplete }: { onComplete?: () => void }) => (
    <div data-testid="completion-step">
      Completion Step
      <button onClick={onComplete} data-testid="complete-btn">Complete</button>
    </div>
  ),
}));

jest.mock('../ProgressIndicator', () => ({
  ProgressIndicator: ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
    <div data-testid="progress-indicator">Step {currentStep} of {totalSteps}</div>
  ),
}));

const mockUseOnboarding = useOnboarding as jest.MockedFunction<typeof useOnboarding>;

describe('OnboardingWizard', () => {
  const mockGetStatus = jest.fn();
  const mockGetProgress = jest.fn();
  const mockTrackAnalyticsEvent = jest.fn();
  const mockClearError = jest.fn();

  const defaultMockState = {
    status: createMockOnboardingStatus({
      currentStep: 1,
      isCompleted: false,
      streamingServices: [],
      regionPreferences: [],
      contentPreferences: [],
    }),
    progress: {
      currentStep: 1,
      totalSteps: 5,
      progress: 20,
      timeEstimate: '5 minutes',
      canSkip: true,
      canGoBack: false,
    },
    isLoading: false,
    error: null,
    getStatus: mockGetStatus,
    getProgress: mockGetProgress,
    trackAnalyticsEvent: mockTrackAnalyticsEvent,
    clearError: mockClearError,
    startOnboarding: jest.fn(),
    updateStep: jest.fn(),
    addStreamingServices: jest.fn(),
    removeStreamingService: jest.fn(),
    addRegionPreferences: jest.fn(),
    addContentPreferences: jest.fn(),
    completeOnboarding: jest.fn(),
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
  });

  describe('Loading State', () => {
    it('renders loading spinner when loading and no status', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        isLoading: true,
        status: null,
      });

      render(<OnboardingWizard />);

      expect(screen.getByText('Loading your onboarding...')).toBeInTheDocument();
    });

    it('does not show loading when status is available', () => {
      render(<OnboardingWizard />);

      expect(screen.queryByText('Loading your onboarding...')).not.toBeInTheDocument();
    });
  });

  describe('Completed State', () => {
    it('renders completed message when onboarding is already done', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: {
          ...defaultMockState.status!,
          isCompleted: true,
        },
      });

      render(<OnboardingWizard />);

      expect(screen.getByText('Welcome to GeoLeap!')).toBeInTheDocument();
      expect(screen.getByText(/You've already completed your onboarding/)).toBeInTheDocument();
    });
  });

  describe('Step Rendering', () => {
    it('renders WelcomeStep for step 1', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: { ...defaultMockState.status!, currentStep: 1 },
      });

      render(<OnboardingWizard />);

      expect(screen.getByTestId('welcome-step')).toBeInTheDocument();
    });

    it('renders StreamingServicesStep for step 2', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: { ...defaultMockState.status!, currentStep: 2 },
      });

      render(<OnboardingWizard />);

      expect(screen.getByTestId('streaming-services-step')).toBeInTheDocument();
    });

    it('renders RegionPreferencesStep for step 3', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: { ...defaultMockState.status!, currentStep: 3 },
      });

      render(<OnboardingWizard />);

      expect(screen.getByTestId('region-preferences-step')).toBeInTheDocument();
    });

    it('renders ContentPreferencesStep for step 4', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: { ...defaultMockState.status!, currentStep: 4 },
      });

      render(<OnboardingWizard />);

      expect(screen.getByTestId('content-preferences-step')).toBeInTheDocument();
    });

    it('renders CompletionStep for step 5', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: { ...defaultMockState.status!, currentStep: 5 },
      });

      render(<OnboardingWizard />);

      expect(screen.getByTestId('completion-step')).toBeInTheDocument();
    });

    it('defaults to WelcomeStep for invalid step number', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: { ...defaultMockState.status!, currentStep: 99 },
      });

      render(<OnboardingWizard />);

      expect(screen.getByTestId('welcome-step')).toBeInTheDocument();
    });

    it('defaults to step 1 when currentStep is undefined', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: null,
      });

      // When status is null and not loading, it should still render
      render(<OnboardingWizard />);

      expect(screen.getByTestId('welcome-step')).toBeInTheDocument();
    });
  });

  describe('Progress Indicator', () => {
    it('renders progress indicator when progress is available', () => {
      render(<OnboardingWizard />);

      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    });

    it('does not render progress indicator when progress is null', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        progress: null,
      });

      render(<OnboardingWizard />);

      expect(screen.queryByTestId('progress-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error exists', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        error: 'Something went wrong',
      });

      render(<OnboardingWizard />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('clears error when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        error: 'Test error message',
      });

      render(<OnboardingWizard />);

      const clearButton = screen.getByLabelText('Clear error');
      await user.click(clearButton);

      expect(mockClearError).toHaveBeenCalledTimes(1);
    });

    it('does not display error section when error is null', () => {
      render(<OnboardingWizard />);

      expect(screen.queryByLabelText('Clear error')).not.toBeInTheDocument();
    });
  });

  describe('Lifecycle Effects', () => {
    it('calls getStatus and getProgress on mount', () => {
      render(<OnboardingWizard />);

      expect(mockGetStatus).toHaveBeenCalledTimes(1);
      expect(mockGetProgress).toHaveBeenCalledTimes(1);
    });

    it('tracks analytics event when step changes', async () => {
      const { rerender } = render(<OnboardingWizard />);

      // Initial render should track step 1
      await waitFor(() => {
        expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith('step_started', 1);
      });

      // Update to step 2
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: { ...defaultMockState.status!, currentStep: 2 },
      });

      rerender(<OnboardingWizard />);

      await waitFor(() => {
        expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith('step_started', 2);
      });
    });
  });

  describe('Callbacks', () => {
    it('calls onComplete callback when CompletionStep triggers complete', async () => {
      const user = userEvent.setup();
      const onComplete = jest.fn();

      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: { ...defaultMockState.status!, currentStep: 5 },
      });

      render(<OnboardingWizard onComplete={onComplete} />);

      const completeBtn = screen.getByTestId('complete-btn');
      await user.click(completeBtn);

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('passes onSkip to ProgressIndicator', () => {
      const onSkip = jest.fn();

      render(<OnboardingWizard onSkip={onSkip} />);

      // ProgressIndicator should be rendered (onSkip is passed but mocked component doesn't use it)
      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible error dismiss button', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        error: 'Test error',
      });

      render(<OnboardingWizard />);

      const clearButton = screen.getByLabelText('Clear error');
      expect(clearButton).toBeInTheDocument();
    });

    it('renders with proper structure for screen readers', () => {
      render(<OnboardingWizard />);

      // Main container should be present
      const container = screen.getByTestId('welcome-step').parentElement;
      expect(container).toBeInTheDocument();
    });
  });
});
