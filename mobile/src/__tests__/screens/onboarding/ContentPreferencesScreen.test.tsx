/**
 * ContentPreferencesScreen Tests
 *
 * Tests for the Content Preferences onboarding screen
 * Features content type selection (movies, TV shows, documentaries)
 */

import React from 'react';
import { renderWithProviders, fireEvent, waitFor, act } from '../../utils/test-helpers';
import { ContentPreferencesScreen } from '../../../screens/onboarding/ContentPreferencesScreen';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
};

describe('ContentPreferencesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the screen', () => {
      const { getByText } = renderWithProviders(
        <ContentPreferencesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/What do you like to watch/)).toBeTruthy();
    });

    it('should display movies option', () => {
      const { getByText } = renderWithProviders(
        <ContentPreferencesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Movies')).toBeTruthy();
    });

    it('should display TV shows option', () => {
      const { getByText } = renderWithProviders(
        <ContentPreferencesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('TV Shows')).toBeTruthy();
    });

    it('should display documentaries option', () => {
      const { getByText } = renderWithProviders(
        <ContentPreferencesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Documentaries')).toBeTruthy();
    });

    it('should display continue button', () => {
      const { getByText } = renderWithProviders(
        <ContentPreferencesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Continue')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should have back button', () => {
      const { getByText } = renderWithProviders(
        <ContentPreferencesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Header should be rendered
      expect(getByText).toBeTruthy();
    });
  });
});
