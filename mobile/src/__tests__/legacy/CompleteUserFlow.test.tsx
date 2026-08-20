/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'react-native-paper';
import { AppProvider } from '../../context/AppContext';
import { AuthProvider } from '../../context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from '../../navigation/RootNavigator';

// Mock all services and external dependencies
jest.mock('../../services/authService');
jest.mock('../../services/searchService');
jest.mock('../../services/biometricAuth');
// Firebase removed - using expo-notifications with Azure Notification Hubs
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock network status
jest.mock('@react-native-community/netinfo', () => ({
  fetch: () => Promise.resolve({ isConnected: true, isInternetReachable: true }),
  addEventListener: () => jest.fn(),
}));

// Mock environment config
jest.mock('../../config/environment', () => ({
  config: {
    API_URL: 'http://localhost:8020/api',
    ENABLE_LOGGING: true,
    ENABLE_ANALYTICS: false,
    FEATURE_FLAGS: {
      ENABLE_OFFLINE_MODE: true,
      ENABLE_PUSH_NOTIFICATIONS: true,
      ENABLE_BIOMETRIC_AUTH: true,
      ENABLE_VOICE_SEARCH: true,
      ENABLE_BARCODE_SCANNER: true,
      ENABLE_SOCIAL_SHARING: true,
      ENABLE_DARK_MODE: true,
    },
  },
}));

// Create test query client
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

// Wrapper component for tests
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <NavigationContainer>
              {children}
            </NavigationContainer>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Complete User Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Flow', () => {
    it('allows user to sign up and login', async () => {
      const mockAuthService = require('../../services/authService');
      mockAuthService.signUp = jest.fn().mockResolvedValue({
        success: true,
        user: { id: '1', email: 'test@example.com' },
      });
      mockAuthService.signIn = jest.fn().mockResolvedValue({
        success: true,
        user: { id: '1', email: 'test@example.com' },
        token: 'mock_token',
      });

      render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>,
      );

      // Start with signup
      await waitFor(() => {
        expect(screen.getByText('Sign Up')).toBeTruthy();
      });

      // Fill signup form
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
      fireEvent.changeText(screen.getByPlaceholderText('Confirm Password'), 'password123');

      // Submit signup
      fireEvent.press(screen.getByText('Create Account'));

      await waitFor(() => {
        expect(mockAuthService.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Should redirect to login after successful signup
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeTruthy();
      });

      // Login with created account
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
      fireEvent.press(screen.getByText('Sign In'));

      await waitFor(() => {
        expect(mockAuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      // Should navigate to main app
      await waitFor(() => {
        expect(screen.getByText('Search')).toBeTruthy();
      });
    });

    it('handles biometric authentication', async () => {
      const mockBiometricAuth = require('../../services/biometricAuth');
      mockBiometricAuth.isAvailable = jest.fn().mockResolvedValue(true);
      mockBiometricAuth.authenticate = jest.fn().mockResolvedValue(true);

      const mockAuthService = require('../../services/authService');
      mockAuthService.signInWithBiometric = jest.fn().mockResolvedValue({
        success: true,
        user: { id: '1', email: 'test@example.com' },
        token: 'biometric_token',
      });

      render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>,
      );

      // Click biometric login button
      await waitFor(() => {
        expect(screen.getByTestId('biometric-login-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('biometric-login-button'));

      await waitFor(() => {
        expect(mockBiometricAuth.authenticate).toHaveBeenCalled();
        expect(mockAuthService.signInWithBiometric).toHaveBeenCalled();
      });

      // Should navigate to main app
      await waitFor(() => {
        expect(screen.getByText('Search')).toBeTruthy();
      });
    });
  });

  describe('Search and Discovery Flow', () => {
    beforeEach(() => {
      const mockAuthService = require('../../services/authService');
      mockAuthService.getCurrentUser = jest.fn().mockResolvedValue({
        id: '1',
        email: 'test@example.com',
      });
    });

    it('allows searching for content and viewing results', async () => {
      const mockSearchService = require('../../services/searchService');
      mockSearchService.search = jest.fn().mockResolvedValue([
        {
          id: '1',
          title: 'Test Movie',
          type: 'movie',
          year: 2023,
          rating: 8.5,
          poster: 'test-poster.jpg',
        },
        {
          id: '2',
          title: 'Test TV Show',
          type: 'tv',
          year: 2023,
          rating: 9.0,
          poster: 'test-poster2.jpg',
        },
      ]);

      render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>,
      );

      // Navigate to search
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search movies, TV shows...')).toBeTruthy();
      });

      // Perform search
      const searchInput = screen.getByPlaceholderText('Search movies, TV shows...');
      fireEvent.changeText(searchInput, 'test query');
      fireEvent.submitEditing(searchInput);

      await waitFor(() => {
        expect(mockSearchService.search).toHaveBeenCalledWith('test query');
      });

      // View search results
      await waitFor(() => {
        expect(screen.getByText('Test Movie')).toBeTruthy();
        expect(screen.getByText('Test TV Show')).toBeTruthy();
      });

      // Tap on a result to view details
      fireEvent.press(screen.getByText('Test Movie'));

      await waitFor(() => {
        expect(screen.getByText('Test Movie')).toBeTruthy();
        expect(screen.getByText('2023')).toBeTruthy();
        expect(screen.getByText('8.5')).toBeTruthy();
      });
    });

    it('supports filtering and sorting search results', async () => {
      const mockSearchService = require('../../services/searchService');
      mockSearchService.search = jest.fn().mockResolvedValue([
        { id: '1', title: 'Action Movie', type: 'movie', genre: 'action', year: 2023, rating: 8.0 },
        { id: '2', title: 'Comedy Movie', type: 'movie', genre: 'comedy', year: 2022, rating: 7.5 },
      ]);

      mockSearchService.getFilters = jest.fn().mockResolvedValue({
        genres: ['action', 'comedy', 'drama'],
        years: [2021, 2022, 2023],
        types: ['movie', 'tv'],
      });

      render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>,
      );

      // Perform search
      const searchInput = screen.getByPlaceholderText('Search movies, TV shows...');
      fireEvent.changeText(searchInput, 'movie');
      fireEvent.submitEditing(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Action Movie')).toBeTruthy();
      });

      // Open filters
      fireEvent.press(screen.getByTestId('filter-button'));

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeTruthy();
      });

      // Apply genre filter
      fireEvent.press(screen.getByText('Action'));
      fireEvent.press(screen.getByText('Apply Filters'));

      await waitFor(() => {
        expect(mockSearchService.search).toHaveBeenCalledWith('movie', {
          genres: ['action'],
          years: [],
          types: [],
          sortBy: 'relevance',
        });
      });
    });

    it('supports voice search', async () => {
      render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('voice-search-button')).toBeTruthy();
      });

      // Start voice search
      fireEvent.press(screen.getByTestId('voice-search-button'));

      // Simulate voice search result
      const searchInput = screen.getByPlaceholderText('Search movies, TV shows...');
      fireEvent(searchInput, 'voiceResult', 'action movies');

      await waitFor(() => {
        expect(searchInput.props.value).toBe('action movies');
      });
    });
  });

  describe('User Profile and Settings Flow', () => {
    beforeEach(() => {
      const mockAuthService = require('../../services/authService');
      mockAuthService.getCurrentUser = jest.fn().mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('allows viewing and editing user profile', async () => {
      const mockUserService = require('../../services/userService');
      mockUserService.getProfile = jest.fn().mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        preferences: {
          theme: 'light',
          language: 'en',
          notifications: true,
        },
      });

      mockUserService.updateProfile = jest.fn().mockResolvedValue({
        success: true,
        profile: {
          id: '1',
          email: 'test@example.com',
          name: 'Updated Name',
        },
      });

      render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>,
      );

      // Navigate to profile
      fireEvent.press(screen.getByTestId('profile-tab'));

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeTruthy();
        expect(screen.getByText('Test User')).toBeTruthy();
        expect(screen.getByText('test@example.com')).toBeTruthy();
      });

      // Edit profile
      fireEvent.press(screen.getByTestId('edit-profile-button'));

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeTruthy();
      });

      // Update name
      const nameInput = screen.getByDisplayValue('Test User');
      fireEvent.changeText(nameInput, 'Updated Name');

      // Save changes
      fireEvent.press(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockUserService.updateProfile).toHaveBeenCalledWith({
          name: 'Updated Name',
        });
      });

      // Should show updated name
      await waitFor(() => {
        expect(screen.getByText('Updated Name')).toBeTruthy();
      });
    });

    it('allows managing watchlist', async () => {
      const mockWatchlistService = require('../../services/watchlist/WatchlistService');
      mockWatchlistService.getWatchlist = jest.fn().mockResolvedValue([
        { id: '1', title: 'Movie 1', type: 'movie', addedAt: '2023-01-01' },
        { id: '2', title: 'TV Show 1', type: 'tv', addedAt: '2023-01-02' },
      ]);

      render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>,
      );

      // Navigate to watchlist
      fireEvent.press(screen.getByTestId('profile-tab'));
      await waitFor(() => {
        expect(screen.getByTestId('watchlist-section')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('watchlist-section'));

      await waitFor(() => {
        expect(mockWatchlistService.getWatchlist).toHaveBeenCalled();
        expect(screen.getByText('Movie 1')).toBeTruthy();
        expect(screen.getByText('TV Show 1')).toBeTruthy();
      });

      // Remove item from watchlist
      mockWatchlistService.removeFromWatchlist = jest.fn().mockResolvedValue({ success: true });

      fireEvent.press(screen.getByTestId('remove-item-1'));

      await waitFor(() => {
        expect(mockWatchlistService.removeFromWatchlist).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('Offline Functionality Flow', () => {
    beforeEach(() => {
      const mockAuthService = require('../../services/authService');
      mockAuthService.getCurrentUser = jest.fn().mockResolvedValue({
        id: '1',
        email: 'test@example.com',
      });
    });

    it('works offline with cached data', async () => {
      const mockOfflineService = require('../../services/offlineService');
      mockOfflineService.isOnline = jest.fn().mockReturnValue(false);
      mockOfflineService.getCachedSearchResults = jest.fn().mockResolvedValue([
        { id: '1', title: 'Cached Movie', type: 'movie' },
      ]);

      render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>,
      );

      // Should show offline status
      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeTruthy();
      });

      // Search while offline
      const searchInput = screen.getByPlaceholderText('Search movies, TV shows...');
      fireEvent.changeText(searchInput, 'test');

      await waitFor(() => {
        expect(mockOfflineService.getCachedSearchResults).toHaveBeenCalledWith('test');
        expect(screen.getByText('Cached Movie')).toBeTruthy();
      });

      // Should show offline indicator
      expect(screen.getByTestId('offline-indicator')).toBeTruthy();
    });

    it('syncs data when coming back online', async () => {
      const mockOfflineService = require('../../services/offlineService');
      const mockSyncService = require('../../services/api/SyncService');

      // Start offline
      mockOfflineService.isOnline = jest.fn().mockReturnValue(false);

      render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeTruthy();
      });

      // Simulate coming back online
      mockOfflineService.isOnline = jest.fn().mockReturnValue(true);
      mockSyncService.syncPendingActions = jest.fn().mockResolvedValue({ synced: 5 });

      // Trigger sync
      fireEvent(screen.getByTestId('offline-indicator'), 'comeOnline');

      await waitFor(() => {
        expect(mockSyncService.syncPendingActions).toHaveBeenCalled();
        expect(screen.getByText('5 items synced')).toBeTruthy();
      });
    });
  });

  describe('Error Handling Flow', () => {
    it('handles network errors gracefully', async () => {
      const mockSearchService = require('../../services/searchService');
      mockSearchService.search = jest.fn().mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>,
      );

      const searchInput = screen.getByPlaceholderText('Search movies, TV shows...');
      fireEvent.changeText(searchInput, 'test');
      fireEvent.submitEditing(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Network error. Please check your connection.')).toBeTruthy();
      });

      // Should provide retry option
      expect(screen.getByText('Retry')).toBeTruthy();

      fireEvent.press(screen.getByText('Retry'));

      await waitFor(() => {
        expect(mockSearchService.search).toHaveBeenCalledTimes(2);
      });
    });

    it('handles authentication errors', async () => {
      const mockAuthService = require('../../services/authService');
      mockAuthService.getCurrentUser = jest.fn().mockRejectedValue(new Error('Token expired'));
      mockAuthService.refreshToken = jest.fn().mockRejectedValue(new Error('Refresh failed'));

      render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText('Session expired. Please log in again.')).toBeTruthy();
      });

      // Should redirect to login screen
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeTruthy();
      });
    });
  });

  describe('Performance and Accessibility', () => {
    it('maintains smooth scrolling performance', async () => {
      const mockSearchService = require('../../services/searchService');
      // Create many results to test performance
      const manyResults = Array.from({ length: 100 }, (_, i) => ({
        id: i.toString(),
        title: `Movie ${i}`,
        type: 'movie',
      }));
      mockSearchService.search = jest.fn().mockResolvedValue(manyResults);

      render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>,
      );

      const searchInput = screen.getByPlaceholderText('Search movies, TV shows...');
      fireEvent.changeText(searchInput, 'test');
      fireEvent.submitEditing(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Movie 0')).toBeTruthy();
      });

      // Test scrolling performance
      const resultsList = screen.getByTestId('search-results-list');
      fireEvent(resultsList, 'scroll', {
        nativeEvent: {
          contentOffset: { y: 1000 },
          contentSize: { height: 2000 },
          layoutMeasurement: { height: 500 },
        },
      });

      // Should load more items smoothly
      await waitFor(() => {
        expect(screen.getByText('Movie 50')).toBeTruthy();
      });
    });

    it('supports accessibility features', async () => {
      render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>,
      );

      // Test screen reader support
      const searchInput = screen.getByPlaceholderText('Search movies, TV shows...');
      expect(searchInput.props.accessibilityLabel).toBe('Search movies, TV shows and more');
      expect(searchInput.props.accessibilityRole).toBe('searchbox');

      // Test accessibility navigation
      fireEvent.press(screen.getByTestId('profile-tab'));
      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeTruthy();
      });

      // All interactive elements should be accessible
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element.props.accessible).toBe(true);
      });
    });
  });
});
