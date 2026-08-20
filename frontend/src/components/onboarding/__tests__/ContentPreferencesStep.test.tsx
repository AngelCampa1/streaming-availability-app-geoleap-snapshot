/**
 * ContentPreferencesStep Integration Tests
 * Tests content type selection and personalization preview
 * Session 10 - Final Push to 90%+ Coverage
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentPreferencesStep } from '../steps/ContentPreferencesStep';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { createMockOnboardingStatus } from '@/test-utils/mockFactories';

// Mock the OnboardingContext
jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: jest.fn(),
}));

const mockUseOnboarding = useOnboarding as jest.MockedFunction<typeof useOnboarding>;

describe('ContentPreferencesStep', () => {
  const mockUpdateStep = jest.fn();
  const mockAddContentPreferences = jest.fn();
  const mockTrackAnalyticsEvent = jest.fn();

  const defaultMockState = {
    status: createMockOnboardingStatus({
      currentStep: 4,
      isCompleted: false,
      streamingServices: [],
      regionPreferences: [],
      contentPreferences: [],
    }),
    progress: null,
    isLoading: false,
    error: null,
    updateStep: mockUpdateStep,
    addContentPreferences: mockAddContentPreferences,
    trackAnalyticsEvent: mockTrackAnalyticsEvent,
    getStatus: jest.fn(),
    getProgress: jest.fn(),
    clearError: jest.fn(),
    startOnboarding: jest.fn(),
    addStreamingServices: jest.fn(),
    removeStreamingService: jest.fn(),
    addRegionPreferences: jest.fn(),
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

  describe('Initial Rendering', () => {
    it('renders the step title and description', () => {
      render(<ContentPreferencesStep />);

      expect(screen.getByText('What Do You Like to Watch?')).toBeInTheDocument();
      expect(screen.getByText(/Select your preferred content types/)).toBeInTheDocument();
    });

    it('renders Popular Choices section', () => {
      render(<ContentPreferencesStep />);

      expect(screen.getByText('Popular Choices')).toBeInTheDocument();
    });

    it('displays all 4 popular content types', () => {
      render(<ContentPreferencesStep />);

      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('TV Shows')).toBeInTheDocument();
      expect(screen.getByText('Documentaries')).toBeInTheDocument();
      expect(screen.getByText('Anime')).toBeInTheDocument();
    });

    it('renders More Options section with toggle button', () => {
      render(<ContentPreferencesStep />);

      expect(screen.getByText('More Options')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Show more options/i })).toBeInTheDocument();
    });

    it('renders Continue and Skip buttons', () => {
      render(<ContentPreferencesStep />);

      expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Skip this step/i })).toBeInTheDocument();
    });
  });

  describe('Content Selection', () => {
    it('selects a content type when clicked', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      // Find Movies button (first occurrence in Popular Choices)
      const moviesButtons = screen.getAllByText('Movies');
      const moviesButton = moviesButtons[0].closest('button');
      await user.click(moviesButton!);

      await waitFor(() => {
        expect(screen.getByText('Your content preferences (1):')).toBeInTheDocument();
      });
    });

    it('deselects a content type when clicked again', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      // Find Movies button in Popular Choices section (first occurrence)
      const moviesButtons = screen.getAllByText('Movies');
      const moviesButton = moviesButtons[0].closest('button');

      // Select
      await user.click(moviesButton!);
      await waitFor(() => {
        expect(screen.getByText('Your content preferences (1):')).toBeInTheDocument();
      });

      // Deselect - find button again after state update (Movies appears in summary badge too)
      const moviesButtonsAfter = screen.getAllByText('Movies');
      const moviesButtonAfter = moviesButtonsAfter[0].closest('button');
      await user.click(moviesButtonAfter!);

      // After deselection, preferences section should be hidden
      await waitFor(() => {
        expect(screen.queryByText(/Your content preferences/)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('allows selecting multiple content types', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      await user.click(screen.getAllByText('Movies')[0].closest('button')!);
      await user.click(screen.getAllByText('TV Shows')[0].closest('button')!);
      await user.click(screen.getAllByText('Anime')[0].closest('button')!);

      await waitFor(() => {
        expect(screen.getByText('Your content preferences (3):')).toBeInTheDocument();
      });
    });

    it('updates continue button text with selection count', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      await user.click(screen.getAllByText('Movies')[0].closest('button')!);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Continue with 1 preference/i })).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('TV Shows')[0].closest('button')!);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Continue with 2 preferences/i })).toBeInTheDocument();
      });
    });
  });

  describe('Show More Options', () => {
    it('shows additional content types when Show button is clicked', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      await user.click(screen.getByRole('button', { name: /Show more options/i }));

      await waitFor(() => {
        expect(screen.getByText('Comedy Specials')).toBeInTheDocument();
        expect(screen.getByText('Reality TV')).toBeInTheDocument();
        expect(screen.getByText('Kids & Family')).toBeInTheDocument();
        expect(screen.getByText('Sports')).toBeInTheDocument();
        expect(screen.getByText('News')).toBeInTheDocument();
        expect(screen.getByText('Music')).toBeInTheDocument();
      });
    });

    it('hides additional content types when Hide button is clicked', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      // Show
      await user.click(screen.getByRole('button', { name: /Show more options/i }));
      await waitFor(() => {
        expect(screen.getByText('Comedy Specials')).toBeInTheDocument();
      });

      // Hide
      await user.click(screen.getByRole('button', { name: /Hide more options/i }));
      await waitFor(() => {
        expect(screen.queryByText('Comedy Specials')).not.toBeInTheDocument();
      });
    });
  });

  describe('Personalization Preview', () => {
    it('shows personalization preview when content is selected', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      await user.click(screen.getAllByText('Movies')[0].closest('button')!);

      await waitFor(() => {
        expect(screen.getByText('Personalization Preview')).toBeInTheDocument();
        expect(screen.getByText(/we'll prioritize.*movies/i)).toBeInTheDocument();
      });
    });

    it('shows multiple selected content types in preview', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      await user.click(screen.getAllByText('Movies')[0].closest('button')!);
      await user.click(screen.getAllByText('TV Shows')[0].closest('button')!);

      await waitFor(() => {
        expect(screen.getByText(/movies and tv shows/i)).toBeInTheDocument();
      });
    });

    it('shows count of additional types when more than 2 selected', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      await user.click(screen.getAllByText('Movies')[0].closest('button')!);
      await user.click(screen.getAllByText('TV Shows')[0].closest('button')!);
      await user.click(screen.getAllByText('Documentaries')[0].closest('button')!);

      await waitFor(() => {
        expect(screen.getByText(/and 1 other type/i)).toBeInTheDocument();
      });
    });
  });

  describe('Selection Summary', () => {
    it('displays selected content types in summary', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      await user.click(screen.getAllByText('Movies')[0].closest('button')!);
      await user.click(screen.getAllByText('Anime')[0].closest('button')!);

      await waitFor(() => {
        // Summary badges should show selected items
        const summarySection = screen.getByText('Your content preferences (2):').parentElement;
        expect(summarySection).toBeInTheDocument();
      });
    });

    it('shows help text about preferences', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      await user.click(screen.getAllByText('Movies')[0].closest('button')!);

      await waitFor(() => {
        expect(screen.getByText(/These preferences help us show you the most relevant content/)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('calls updateStep with 5 when Continue is clicked', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => {
        expect(mockUpdateStep).toHaveBeenCalledWith(5);
      });
    });

    it('saves content preferences when Continue is clicked with selections', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      await user.click(screen.getAllByText('Movies')[0].closest('button')!);
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => {
        expect(mockAddContentPreferences).toHaveBeenCalled();
      });
    });

    it('tracks step_completed analytics on Continue', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => {
        expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith('step_completed', 4, expect.any(Object));
      });
    });

    it('calls Skip handler and advances to step 5', async () => {
      const user = userEvent.setup();
      render(<ContentPreferencesStep />);

      await user.click(screen.getByRole('button', { name: /Skip this step/i }));

      await waitFor(() => {
        expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith('step_skipped', 4);
        expect(mockUpdateStep).toHaveBeenCalledWith(5);
      });
    });
  });

  describe('Loading State', () => {
    it('disables buttons when loading', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        isLoading: true,
      });

      render(<ContentPreferencesStep />);

      expect(screen.getByRole('button', { name: /Skip this step/i })).toBeDisabled();
    });

    it('shows loading spinner in Continue button when loading', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        isLoading: true,
      });

      render(<ContentPreferencesStep />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('Existing Preferences', () => {
    it('initializes with existing content preferences', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: {
          ...defaultMockState.status!,
          contentPreferences: [
            { contentType: 'movie', isEnabled: true, priority: 1 },
            { contentType: 'anime', isEnabled: true, priority: 2 },
          ],
        },
      });

      render(<ContentPreferencesStep />);

      // Should show existing selections
      expect(screen.getByText('Your content preferences (2):')).toBeInTheDocument();
    });
  });

  describe('Content Icons and Descriptions', () => {
    it('displays content descriptions', () => {
      render(<ContentPreferencesStep />);

      expect(screen.getByText('Feature films and cinema releases')).toBeInTheDocument();
      expect(screen.getByText('Series, seasons, and episodic content')).toBeInTheDocument();
      expect(screen.getByText('Educational and factual programming')).toBeInTheDocument();
      expect(screen.getByText('Japanese animation series and films')).toBeInTheDocument();
    });

    it('displays Popular badges for popular content types', () => {
      render(<ContentPreferencesStep />);

      const badges = screen.getAllByText('Popular');
      expect(badges.length).toBe(4); // 4 popular content types
    });
  });
});
