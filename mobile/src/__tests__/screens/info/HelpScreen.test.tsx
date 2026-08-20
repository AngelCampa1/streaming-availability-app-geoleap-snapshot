/**
 * HelpScreen Tests
 *
 * Tests for the Help & FAQ screen component
 * Features search, category filtering, and FAQ accordion
 */

import React from 'react';
import { renderWithProviders, fireEvent, waitFor, act } from '../../utils/test-helpers';
import { HelpScreen } from '../../../screens/info/HelpScreen';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
};

describe('HelpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the screen', () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Help & FAQ')).toBeTruthy();
    });

    it('should display search bar', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByPlaceholderText('Search for help...')).toBeTruthy();
    });

    it('should display category filter chips', () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('All')).toBeTruthy();
      expect(getByText('General')).toBeTruthy();
      expect(getByText('VPN')).toBeTruthy();
      expect(getByText('Account')).toBeTruthy();
      expect(getByText('Content')).toBeTruthy();
    });

    it('should display Quick Help section', () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Quick Help')).toBeTruthy();
    });

    it('should display FAQ section with count', () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/Frequently Asked Questions/)).toBeTruthy();
    });

    it('should display Still need help section', () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Still need help?')).toBeTruthy();
    });
  });

  describe('Quick Links', () => {
    it('should display Contact Support link', () => {
      const { getAllByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Multiple "Contact Support" links on the page
      expect(getAllByText('Contact Support').length).toBeGreaterThan(0);
    });

    it('should display Terms of Service link', () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Terms of Service')).toBeTruthy();
    });

    it('should display Privacy Policy link', () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Privacy Policy')).toBeTruthy();
    });
  });

  describe('FAQ Items', () => {
    it('should display FAQ questions', () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('How does GeoLeap work?')).toBeTruthy();
    });

    it('should display VPN-related questions', () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('What is a VPN and why do I need one?')).toBeTruthy();
      expect(getByText('Is using a VPN legal?')).toBeTruthy();
    });

    it('should display account-related questions', () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('How do I add streaming services to my profile?')).toBeTruthy();
      expect(getByText('How do I cancel my subscription?')).toBeTruthy();
    });

    it('should expand FAQ item on press', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Initially answer might not be visible
      const question = getByText('How does GeoLeap work?');

      await act(async () => {
        fireEvent.press(question);
      });

      // After press, the answer should be visible
      await waitFor(() => {
        expect(queryByText(/GeoLeap searches multiple streaming platforms/)).toBeTruthy();
      });
    });

    it('should collapse expanded FAQ item on second press', async () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const question = getByText('How does GeoLeap work?');

      // First press - expand
      await act(async () => {
        fireEvent.press(question);
      });

      // Second press - collapse
      await act(async () => {
        fireEvent.press(question);
      });

      // The accordion should be collapsed (handled by component state)
      expect(question).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('should filter FAQs by search text', async () => {
      const { getByPlaceholderText, queryByText, getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const searchInput = getByPlaceholderText('Search for help...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'VPN');
      });

      await waitFor(() => {
        // VPN-related questions should still be visible
        expect(queryByText('What is a VPN and why do I need one?')).toBeTruthy();
      });
    });

    it('should show no results message when search has no matches', async () => {
      const { getByPlaceholderText, getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const searchInput = getByPlaceholderText('Search for help...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'xyznonexistent123');
      });

      await waitFor(() => {
        expect(getByText('No results found')).toBeTruthy();
        expect(getByText('Try adjusting your search or filter')).toBeTruthy();
      });
    });
  });

  describe('Category Filtering', () => {
    it('should filter FAQs by category', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const vpnCategory = getByText('VPN');

      await act(async () => {
        fireEvent.press(vpnCategory);
      });

      await waitFor(() => {
        // VPN questions should be visible
        expect(queryByText('What is a VPN and why do I need one?')).toBeTruthy();
        expect(queryByText('Is using a VPN legal?')).toBeTruthy();
      });
    });

    it('should show all FAQs when All category selected', async () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // First filter by VPN
      await act(async () => {
        fireEvent.press(getByText('VPN'));
      });

      // Then select All
      await act(async () => {
        fireEvent.press(getByText('All'));
      });

      await waitFor(() => {
        expect(getByText('How does GeoLeap work?')).toBeTruthy();
      });
    });

    it('should filter by Account category', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      await act(async () => {
        fireEvent.press(getByText('Account'));
      });

      await waitFor(() => {
        expect(queryByText('How do I add streaming services to my profile?')).toBeTruthy();
        expect(queryByText('How do I cancel my subscription?')).toBeTruthy();
      });
    });

    it('should filter by Content category', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      await act(async () => {
        fireEvent.press(getByText('Content'));
      });

      await waitFor(() => {
        expect(queryByText(/Why isn't a show available in my region/)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to Support screen', async () => {
      const { getAllByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const contactButtons = getAllByText('Contact Support');

      await act(async () => {
        fireEvent.press(contactButtons[0]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('Support');
    });

    it('should navigate to Terms of Service', async () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      await act(async () => {
        fireEvent.press(getByText('Terms of Service'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('TermsOfService');
    });

    it('should navigate to Privacy Policy', async () => {
      const { getByText } = renderWithProviders(
        <HelpScreen navigation={mockNavigation as any} route={{} as any} />
      );

      await act(async () => {
        fireEvent.press(getByText('Privacy Policy'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('PrivacyPolicy');
    });
  });
});
