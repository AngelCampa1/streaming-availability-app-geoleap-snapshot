/**
 * RecommendationSettings Component Tests
 *
 * Test coverage for recommendation settings/preferences component.
 * Tests rendering, form interactions, save/reset functionality, and validation.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecommendationSettings } from '../RecommendationSettings';

describe('RecommendationSettings', () => {
  const mockOnSettingsChange = jest.fn();
  const defaultProps = {
    userId: 'user-123',
    onSettingsChange: mockOnSettingsChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders with required props', async () => {
      render(<RecommendationSettings {...defaultProps} />);

      expect(screen.getByText('Recommendation Settings')).toBeInTheDocument();

      // Advance timers to complete loading (1000ms delay in component)
      jest.advanceTimersByTime(1000);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      render(<RecommendationSettings {...defaultProps} />);

      // Should show loading state (skeleton divs with animate-pulse)
      const loadingContainer = document.querySelector('.animate-pulse');
      expect(loadingContainer).toBeInTheDocument();
    });

    it('applies custom className', async () => {
      const { container } = render(
        <RecommendationSettings {...defaultProps} className="custom-settings" />
      );

      const card = container.querySelector('.custom-settings');
      expect(card).toBeInTheDocument();

      // Advance timers to complete loading
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });
    });
  });

  describe('Content Type Toggles', () => {
    it('renders all content type checkboxes', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // Click Content tab
      const contentTab = screen.getByRole('tab', { name: /content/i });
      await user.click(contentTab);

      // Check for content type labels
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('TV Shows')).toBeInTheDocument();
      expect(screen.getByText('Documentaries')).toBeInTheDocument();
    });

    it('toggles movie preference', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // Navigate to Content tab
      const contentTab = screen.getByRole('tab', { name: /content/i });
      await user.click(contentTab);

      const movieCheckbox = screen.getByRole('checkbox', { name: /movies/i });
      await user.click(movieCheckbox);

      // Should mark as having changes - Save button should appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });

    it('toggles TV show preference', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      const contentTab = screen.getByRole('tab', { name: /content/i });
      await user.click(contentTab);

      const tvCheckbox = screen.getByRole('checkbox', { name: /tv shows/i });
      await user.click(tvCheckbox);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });

    it('toggles documentary preference', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      const contentTab = screen.getByRole('tab', { name: /content/i });
      await user.click(contentTab);

      const docCheckbox = screen.getByRole('checkbox', { name: /documentaries/i });
      await user.click(docCheckbox);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });
  });

  describe('Recommendation Type Toggles', () => {
    it('renders recommendation type switches', async () => {
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // Check for recommendation type labels (on General tab by default)
      expect(screen.getByText(/show trending content/i)).toBeInTheDocument();
      expect(screen.getByText(/show popular content/i)).toBeInTheDocument();
    });

    it('toggles trending content preference', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // Find the trending switch (should be on General tab by default)
      const switches = screen.getAllByRole('switch');
      const trendingSwitch = switches.find(sw => {
        const label = sw.closest('.flex')?.querySelector('label');
        return label?.textContent === 'Show Trending Content';
      });

      if (trendingSwitch) {
        await user.click(trendingSwitch);

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
        });
      }
    });

    it('toggles popular content preference', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      const switches = screen.getAllByRole('switch');
      const popularSwitch = switches.find(sw => {
        const label = sw.closest('.flex')?.querySelector('label');
        return label?.textContent === 'Show Popular Content';
      });

      if (popularSwitch) {
        await user.click(popularSwitch);

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
        });
      }
    });
  });

  describe('Language Preferences', () => {
    it('renders available languages', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // Navigate to Content tab where languages are
      const contentTab = screen.getByRole('tab', { name: /content/i });
      await user.click(contentTab);

      // Should show common languages
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Spanish')).toBeInTheDocument();
    });

    it('toggles language preference', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      const contentTab = screen.getByRole('tab', { name: /content/i });
      await user.click(contentTab);

      // Languages are buttons, not checkboxes
      const spanishButton = screen.getByRole('button', { name: /spanish/i });
      await user.click(spanishButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });
  });

  describe('Genre Preferences', () => {
    it('renders genre selection', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // Navigate to Preferences tab
      const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
      await user.click(preferencesTab);

      // Should show common genres (use getAllByText since genres appear in both sections)
      await waitFor(() => {
        const actionElements = screen.getAllByText('Action');
        expect(actionElements.length).toBeGreaterThan(0);
      });
      expect(screen.getAllByText('Comedy').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Drama').length).toBeGreaterThan(0);
    });

    it('adds preferred genre', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
      await user.click(preferencesTab);

      await waitFor(() => {
        const actionElements = screen.getAllByText('Action');
        expect(actionElements.length).toBeGreaterThan(0);
      });

      // Genres are rendered as Badge elements (not buttons), so click on the text
      const actionBadge = screen.getAllByText('Action')[0]; // First occurrence is in Preferred Genres
      await user.click(actionBadge);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });

    it('excludes genre', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
      await user.click(preferencesTab);

      await waitFor(() => {
        expect(screen.getAllByText('Action').length).toBeGreaterThan(1);
      });

      // Second Action text is in Excluded Genres section
      const actionBadges = screen.getAllByText('Action');
      await user.click(actionBadges[1]); // Click the one in Excluded section

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });
  });

  describe('Save and Reset Functionality', () => {
    it('shows save button after making changes', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // Save button should not be visible initially (no changes)
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();

      // Make a change
      const switches = screen.getAllByRole('switch');
      await user.click(switches[0]); // Click any switch

      // Now save button should appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });

    it('shows reset button after making changes', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // Make a change
      const switches = screen.getAllByRole('switch');
      await user.click(switches[0]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
      });
    });

    it('calls onSettingsChange when saving', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // Make a change
      const contentTab = screen.getByRole('tab', { name: /content/i });
      await user.click(contentTab);

      const movieCheckbox = screen.getByRole('checkbox', { name: /movies/i });
      await user.click(movieCheckbox);

      // Save
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Advance timer for save delay
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalled();
      });
    });

    it('resets to default settings', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // Make a change
      const switches = screen.getAllByRole('switch');
      await user.click(switches[0]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
      });

      // Reset
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      // Save button should still be enabled after reset (hasChanges = true)
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('disables save button while saving', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // Make a change
      const switches = screen.getAllByRole('switch');
      await user.click(switches[0]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });

      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Button should be disabled during save
      expect(saveButton).toBeDisabled();

      // Advance timer for save delay
      jest.advanceTimersByTime(1000);

      // Wait for save to complete
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalled();
      });
    });
  });

  describe('Algorithm Settings', () => {
    it('renders algorithm preference switches', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // Navigate to Algorithms tab
      const algorithmsTab = screen.getByRole('tab', { name: /algorithms/i });
      await user.click(algorithmsTab);

      // Check for algorithm options
      await waitFor(() => {
        expect(screen.getByText(/collaborative filtering/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/content-based filtering/i)).toBeInTheDocument();
    });

    it('toggles collaborative filtering', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      const algorithmsTab = screen.getByRole('tab', { name: /algorithms/i });
      await user.click(algorithmsTab);

      await waitFor(() => {
        expect(screen.getByText(/collaborative filtering/i)).toBeInTheDocument();
      });

      // Find the switch next to Collaborative Filtering label
      const switches = screen.getAllByRole('switch');
      const collaborativeSwitch = switches.find(sw => {
        const container = sw.closest('.p-4');
        return container?.textContent?.includes('Collaborative Filtering');
      });

      if (collaborativeSwitch) {
        await user.click(collaborativeSwitch);

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
        });
      }
    });

    it('toggles content-based filtering', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      const algorithmsTab = screen.getByRole('tab', { name: /algorithms/i });
      await user.click(algorithmsTab);

      await waitFor(() => {
        expect(screen.getByText(/content-based filtering/i)).toBeInTheDocument();
      });

      const switches = screen.getAllByRole('switch');
      const contentBasedSwitch = switches.find(sw => {
        const container = sw.closest('.p-4');
        return container?.textContent?.includes('Content-Based Filtering');
      });

      if (contentBasedSwitch) {
        await user.click(contentBasedSwitch);

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
        });
      }
    });
  });

  describe('Minimum Rating Filter', () => {
    it('renders minimum rating slider', async () => {
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // Slider is on General tab (default)
      expect(screen.getByText(/minimum rating threshold/i)).toBeInTheDocument();
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThan(0);
    });

    it('adjusts minimum rating', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      const slider = screen.getAllByRole('slider')[0];

      // Use userEvent to interact with slider via keyboard (Arrow Right increases value)
      slider.focus();
      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });
  });

  describe('Master Toggle', () => {
    it('renders enable recommendations switch', async () => {
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // The master toggle is the first switch
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
      expect(switches[0]).toBeInTheDocument();
    });

    it('toggles enable recommendations', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RecommendationSettings {...defaultProps} />);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Enable Recommendations')).toBeInTheDocument();
      });

      // The master switch is the first switch next to "Enable Recommendations" label
      const switches = screen.getAllByRole('switch');
      const enableSwitch = switches[0]; // First switch is the master enable toggle

      await user.click(enableSwitch);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });
  });
});
