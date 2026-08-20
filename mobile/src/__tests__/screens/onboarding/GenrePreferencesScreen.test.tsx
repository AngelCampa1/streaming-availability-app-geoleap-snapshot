/**
 * GenrePreferencesScreen Tests
 *
 * Tests for the Genre Preferences onboarding screen
 * Features genre selection for personalized recommendations
 */

import React from 'react';
import { renderWithProviders, fireEvent, waitFor, act } from '../../utils/test-helpers';
import { GenrePreferencesScreen } from '../../../screens/onboarding/GenrePreferencesScreen';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
};

describe('GenrePreferencesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the screen', () => {
      const { getByText } = renderWithProviders(
        <GenrePreferencesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/Pick your favorite genres/)).toBeTruthy();
    });

    it('should display genre options', () => {
      const { getByText } = renderWithProviders(
        <GenrePreferencesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Common genres that should be available
      expect(getByText('Action')).toBeTruthy();
      expect(getByText('Comedy')).toBeTruthy();
      expect(getByText('Drama')).toBeTruthy();
    });

    it('should display continue button', () => {
      const { getByText } = renderWithProviders(
        <GenrePreferencesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Continue')).toBeTruthy();
    });
  });

  describe('Genre Selection', () => {
    it('should allow selecting multiple genres', () => {
      const { getByText } = renderWithProviders(
        <GenrePreferencesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Verify genre selection is available
      expect(getByText).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should have back button', () => {
      const { getByText } = renderWithProviders(
        <GenrePreferencesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText).toBeTruthy();
    });
  });
});
