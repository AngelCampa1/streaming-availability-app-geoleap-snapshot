/**
 * RegionPreferencesStep Integration Tests
 * Tests region selection, primary region setting, and search functionality
 * Session 10 - Final Push to 90%+ Coverage
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegionPreferencesStep } from '../steps/RegionPreferencesStep';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { createMockOnboardingStatus } from '@/test-utils/mockFactories';

// Mock the OnboardingContext
jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: jest.fn(),
}));

const mockUseOnboarding = useOnboarding as jest.MockedFunction<typeof useOnboarding>;

describe('RegionPreferencesStep', () => {
  const mockUpdateStep = jest.fn();
  const mockAddRegionPreferences = jest.fn();
  const mockTrackAnalyticsEvent = jest.fn();

  const defaultMockState = {
    status: createMockOnboardingStatus({
      currentStep: 3,
      isCompleted: false,
      streamingServices: [],
      regionPreferences: [],
      contentPreferences: [],
    }),
    progress: null,
    isLoading: false,
    error: null,
    updateStep: mockUpdateStep,
    addRegionPreferences: mockAddRegionPreferences,
    trackAnalyticsEvent: mockTrackAnalyticsEvent,
    getStatus: jest.fn(),
    getProgress: jest.fn(),
    clearError: jest.fn(),
    startOnboarding: jest.fn(),
    addStreamingServices: jest.fn(),
    removeStreamingService: jest.fn(),
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

  describe('Initial Rendering', () => {
    it('renders the step title and description', () => {
      render(<RegionPreferencesStep />);

      expect(screen.getByText('Choose Your Regions')).toBeInTheDocument();
      expect(screen.getByText(/Select countries where you frequently access streaming content/)).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<RegionPreferencesStep />);

      expect(screen.getByPlaceholderText('Search countries...')).toBeInTheDocument();
    });

    it('renders popular VPN locations section', () => {
      render(<RegionPreferencesStep />);

      expect(screen.getByText('Popular VPN Locations')).toBeInTheDocument();
    });

    it('displays all 8 popular regions', () => {
      render(<RegionPreferencesStep />);

      expect(screen.getByText('United States')).toBeInTheDocument();
      expect(screen.getByText('United Kingdom')).toBeInTheDocument();
      expect(screen.getByText('Canada')).toBeInTheDocument();
      expect(screen.getByText('Australia')).toBeInTheDocument();
      expect(screen.getByText('Japan')).toBeInTheDocument();
      expect(screen.getByText('Germany')).toBeInTheDocument();
      expect(screen.getByText('France')).toBeInTheDocument();
      expect(screen.getByText('Netherlands')).toBeInTheDocument();
    });

    it('renders Continue and Skip buttons', () => {
      render(<RegionPreferencesStep />);

      expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Skip this step/i })).toBeInTheDocument();
    });
  });

  describe('Region Selection', () => {
    it('selects a region when clicked', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      const usButton = screen.getByText('United States').closest('button');
      await user.click(usButton!);

      // Should show selection summary
      await waitFor(() => {
        expect(screen.getByText('Selected regions (1):')).toBeInTheDocument();
      });
    });

    it('deselects a region when clicked again', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      const usButton = screen.getByText('United States').closest('button');

      // Select
      await user.click(usButton!);
      await waitFor(() => {
        expect(screen.getByText('Selected regions (1):')).toBeInTheDocument();
      });

      // Deselect - find the button again after state update
      const usButtonAfter = screen.getByText('United States').closest('button');
      await user.click(usButtonAfter!);

      // After deselection, should show 0 regions (summary section hidden)
      await waitFor(() => {
        expect(screen.queryByText(/Selected regions/)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('allows selecting multiple regions', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      await user.click(screen.getByText('United States').closest('button')!);
      await user.click(screen.getByText('United Kingdom').closest('button')!);
      await user.click(screen.getByText('Canada').closest('button')!);

      await waitFor(() => {
        expect(screen.getByText('Selected regions (3):')).toBeInTheDocument();
      });
    });

    it('updates continue button text with selection count', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      await user.click(screen.getByText('United States').closest('button')!);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Continue with 1 region/i })).toBeInTheDocument();
      });

      await user.click(screen.getByText('Canada').closest('button')!);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Continue with 2 regions/i })).toBeInTheDocument();
      });
    });
  });

  describe('Primary Region', () => {
    it('shows Set Primary button for selected regions', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      await user.click(screen.getByText('United States').closest('button')!);

      await waitFor(() => {
        expect(screen.getByText('Set Primary')).toBeInTheDocument();
      });
    });

    it('shows tip about setting primary region when none is set', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      await user.click(screen.getByText('United States').closest('button')!);

      await waitFor(() => {
        expect(screen.getByText(/Tip: Set one region as primary/)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters regions by name', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      const searchInput = screen.getByPlaceholderText('Search countries...');
      await user.type(searchInput, 'United');

      await waitFor(() => {
        expect(screen.getByText('Search Results')).toBeInTheDocument();
        expect(screen.getByText('United States')).toBeInTheDocument();
        expect(screen.getByText('United Kingdom')).toBeInTheDocument();
      });
    });

    it('filters regions by country code', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      const searchInput = screen.getByPlaceholderText('Search countries...');
      await user.type(searchInput, 'US');

      await waitFor(() => {
        expect(screen.getByText('United States')).toBeInTheDocument();
      });
    });

    it('shows no popular section when searching', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      const searchInput = screen.getByPlaceholderText('Search countries...');
      await user.type(searchInput, 'Spain');

      await waitFor(() => {
        expect(screen.queryByText('Popular VPN Locations')).not.toBeInTheDocument();
        expect(screen.getByText('Search Results')).toBeInTheDocument();
      });
    });
  });

  describe('Show All Regions', () => {
    it('shows "Show all regions" button initially', () => {
      render(<RegionPreferencesStep />);

      expect(screen.getByRole('button', { name: /Show all regions/i })).toBeInTheDocument();
    });

    it('shows all regions when Show all button is clicked', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      await user.click(screen.getByRole('button', { name: /Show all regions/i }));

      await waitFor(() => {
        expect(screen.getByText('All Regions')).toBeInTheDocument();
        // Should show non-popular regions like Spain, Italy
        expect(screen.getByText('Spain')).toBeInTheDocument();
        expect(screen.getByText('Italy')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('calls updateStep with 4 when Continue is clicked', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => {
        expect(mockUpdateStep).toHaveBeenCalledWith(4);
      });
    });

    it('saves region preferences when Continue is clicked with selections', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      await user.click(screen.getByText('United States').closest('button')!);
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => {
        expect(mockAddRegionPreferences).toHaveBeenCalled();
      });
    });

    it('tracks step_completed analytics on Continue', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      await user.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => {
        expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith('step_completed', 3, expect.any(Object));
      });
    });

    it('calls Skip handler and advances to step 4', async () => {
      const user = userEvent.setup();
      render(<RegionPreferencesStep />);

      await user.click(screen.getByRole('button', { name: /Skip this step/i }));

      await waitFor(() => {
        expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith('step_skipped', 3);
        expect(mockUpdateStep).toHaveBeenCalledWith(4);
      });
    });
  });

  describe('Loading State', () => {
    it('disables buttons when loading', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        isLoading: true,
      });

      render(<RegionPreferencesStep />);

      expect(screen.getByRole('button', { name: /Skip this step/i })).toBeDisabled();
    });

    it('shows loading spinner in Continue button when loading', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        isLoading: true,
      });

      render(<RegionPreferencesStep />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('Existing Preferences', () => {
    it('initializes with existing region preferences', () => {
      mockUseOnboarding.mockReturnValue({
        ...defaultMockState,
        status: {
          ...defaultMockState.status!,
          regionPreferences: [
            { countryCode: 'US', isPrimary: true, priority: 1 },
            { countryCode: 'GB', isPrimary: false, priority: 2 },
          ],
        },
      });

      render(<RegionPreferencesStep />);

      // Should show existing selections
      expect(screen.getByText('Selected regions (2):')).toBeInTheDocument();
    });
  });

  describe('Popular VPN Badge', () => {
    it('displays Popular VPN badge for popular regions', () => {
      render(<RegionPreferencesStep />);

      const badges = screen.getAllByText('Popular VPN');
      expect(badges.length).toBeGreaterThan(0);
    });
  });
});
