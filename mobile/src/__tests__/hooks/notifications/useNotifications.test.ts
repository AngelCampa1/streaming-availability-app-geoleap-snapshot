/**
 * useNotifications Hook Tests
 * Day 5 Continuation - Remaining Hooks
 *
 * Tests for notification management including permissions, preferences, and sending
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNotifications } from '../../../hooks/useNotifications';
import NotificationService from '../../../services/notificationService';
import type { NotificationPreferences } from '../../../services/notificationService';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock NotificationService
const mockInitialize = jest.fn();
const mockCheckPermission = jest.fn();
const mockRequestPermission = jest.fn();
const mockGetPreferences = jest.fn();
const mockSavePreferences = jest.fn();
const mockGetNotificationHistory = jest.fn();
const mockClearNotificationHistory = jest.fn();

const mockWatchlistService = {
  sendAvailabilityNotification: jest.fn(),
  sendNewEpisodeNotification: jest.fn(),
  sendPersonalizedRecommendation: jest.fn(),
  sendBatchWatchlistUpdates: jest.fn(),
};

const mockSubscriptionService = {
  sendRenewalReminder: jest.fn(),
  sendPaymentFailedNotification: jest.fn(),
  sendPaymentExpiryNotification: jest.fn(),
  sendCancellationConfirmation: jest.fn(),
  sendFeatureAnnouncement: jest.fn(),
};

jest.mock('../../../services/notificationService', () => ({
  __esModule: true,
  default: {
    initialize: (...args: any[]) => mockInitialize(...args),
    checkPermission: (...args: any[]) => mockCheckPermission(...args),
    requestPermission: (...args: any[]) => mockRequestPermission(...args),
    getPreferences: (...args: any[]) => mockGetPreferences(...args),
    savePreferences: (...args: any[]) => mockSavePreferences(...args),
    getNotificationHistory: (...args: any[]) => mockGetNotificationHistory(...args),
    clearNotificationHistory: (...args: any[]) => mockClearNotificationHistory(...args),
    getWatchlistService: () => mockWatchlistService,
    getSubscriptionService: () => mockSubscriptionService,
  },
}));

describe('useNotifications Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockInitialize.mockResolvedValue(undefined);
    mockCheckPermission.mockResolvedValue(true);
    mockGetPreferences.mockResolvedValue({
      watchlistUpdates: true,
      newEpisodes: true,
      recommendations: false,
      subscriptionReminders: true,
      paymentAlerts: true,
      featureAnnouncements: false,
    });
    mockGetNotificationHistory.mockReturnValue([]);
  });

  describe('Initialization', () => {
    it('should initialize NotificationService on mount', async () => {
      renderHook(() => useNotifications());

      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled();
      });
    });

    it('should check permission status on initialization', async () => {
      mockCheckPermission.mockResolvedValue(true);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(mockCheckPermission).toHaveBeenCalled();
        expect(result.current.hasPermission).toBe(true);
      });
    });

    it('should load preferences on initialization', async () => {
      const mockPrefs: NotificationPreferences = {
        watchlistUpdates: true,
        newEpisodes: false,
        recommendations: true,
        subscriptionReminders: false,
        paymentAlerts: true,
        featureAnnouncements: false,
      };

      mockGetPreferences.mockResolvedValue(mockPrefs);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(mockGetPreferences).toHaveBeenCalled();
        expect(result.current.preferences).toEqual(mockPrefs);
      });
    });

    it('should load notification history on initialization', async () => {
      const mockHistory = [
        { id: '1', type: 'watchlist', title: 'Test', body: 'Test notification', timestamp: new Date() },
        { id: '2', type: 'episode', title: 'Test 2', body: 'Another notification', timestamp: new Date() },
      ];

      mockGetNotificationHistory.mockReturnValue(mockHistory);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(mockGetNotificationHistory).toHaveBeenCalled();
        expect(result.current.history).toEqual(mockHistory);
      });
    });

    it('should set isLoading correctly', async () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle initialization errors gracefully', async () => {
      mockInitialize.mockRejectedValue(new Error('Init failed'));

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Hook should still be usable even if initialization failed
      expect(result.current.requestPermission).toBeDefined();
    });
  });

  describe('Permission Management', () => {
    it('should request permission successfully', async () => {
      mockRequestPermission.mockResolvedValue(true);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let granted = false;
      await act(async () => {
        granted = await result.current.requestPermission();
      });

      expect(granted).toBe(true);
      expect(mockRequestPermission).toHaveBeenCalled();
      expect(result.current.hasPermission).toBe(true);
    });

    it('should handle permission denial', async () => {
      mockRequestPermission.mockResolvedValue(false);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let granted = true;
      await act(async () => {
        granted = await result.current.requestPermission();
      });

      expect(granted).toBe(false);
      expect(result.current.hasPermission).toBe(false);
    });

    it('should handle permission request errors', async () => {
      mockRequestPermission.mockRejectedValue(new Error('Permission error'));

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let granted = true;
      await act(async () => {
        granted = await result.current.requestPermission();
      });

      expect(granted).toBe(false);
    });
  });

  describe('Preferences Management', () => {
    it('should update preferences successfully', async () => {
      mockSavePreferences.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newPrefs: NotificationPreferences = {
        watchlistUpdates: false,
        newEpisodes: true,
        recommendations: true,
        subscriptionReminders: false,
        paymentAlerts: false,
        featureAnnouncements: true,
      };

      await act(async () => {
        await result.current.updatePreferences(newPrefs);
      });

      expect(mockSavePreferences).toHaveBeenCalledWith(newPrefs);
      expect(result.current.preferences).toEqual(newPrefs);
    });

    it('should handle preference update errors', async () => {
      mockSavePreferences.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newPrefs: NotificationPreferences = {
        watchlistUpdates: false,
        newEpisodes: false,
        recommendations: false,
        subscriptionReminders: false,
        paymentAlerts: false,
        featureAnnouncements: false,
      };

      await expect(
        act(async () => {
          await result.current.updatePreferences(newPrefs);
        })
      ).rejects.toThrow();
    });
  });

  describe('History Management', () => {
    it('should clear notification history', async () => {
      const mockHistory = [
        { id: '1', type: 'watchlist', title: 'Test', body: 'Test', timestamp: new Date() },
      ];
      mockGetNotificationHistory.mockReturnValue(mockHistory);
      mockClearNotificationHistory.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.history).toEqual(mockHistory);

      await act(async () => {
        await result.current.clearHistory();
      });

      expect(mockClearNotificationHistory).toHaveBeenCalled();
      expect(result.current.history).toEqual([]);
    });

    it('should handle clear history errors', async () => {
      mockClearNotificationHistory.mockRejectedValue(new Error('Clear failed'));

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.clearHistory();
        })
      ).rejects.toThrow();
    });
  });

  describe('Watchlist Notifications', () => {
    it('should send watchlist update notification', async () => {
      mockWatchlistService.sendAvailabilityNotification.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const update = {
        contentId: '123',
        title: 'Test Movie',
        type: 'movie' as const,
        service: 'Netflix',
        availableRegions: ['US'],
      };

      await act(async () => {
        await result.current.sendWatchlistUpdate(update);
      });

      expect(mockWatchlistService.sendAvailabilityNotification).toHaveBeenCalledWith(update);
    });

    it('should send new episode notification', async () => {
      mockWatchlistService.sendNewEpisodeNotification.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const update = {
        contentId: '456',
        title: 'Test Show S2E1',
        type: 'episode' as const,
        service: 'Hulu',
        availableRegions: ['US', 'CA'],
      };

      await act(async () => {
        await result.current.sendNewEpisodeNotification(update);
      });

      expect(mockWatchlistService.sendNewEpisodeNotification).toHaveBeenCalledWith(update);
    });

    it('should send personalized recommendation', async () => {
      mockWatchlistService.sendPersonalizedRecommendation.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const recommendation = {
        contentId: '789',
        title: 'Recommended Movie',
        reason: 'Based on your viewing history',
        service: 'Amazon Prime',
        genre: 'Action',
        rating: 8.5,
      };

      await act(async () => {
        await result.current.sendPersonalizedRecommendation(recommendation);
      });

      expect(mockWatchlistService.sendPersonalizedRecommendation).toHaveBeenCalledWith(recommendation);
    });

    it('should send batch watchlist updates', async () => {
      mockWatchlistService.sendBatchWatchlistUpdates.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updates = [
        { contentId: '1', title: 'Movie 1', type: 'movie' as const, service: 'Netflix', availableRegions: ['US'] },
        { contentId: '2', title: 'Movie 2', type: 'movie' as const, service: 'Hulu', availableRegions: ['US'] },
      ];

      await act(async () => {
        await result.current.sendBatchWatchlistUpdates(updates);
      });

      expect(mockWatchlistService.sendBatchWatchlistUpdates).toHaveBeenCalledWith(updates);
    });

    it('should handle watchlist notification errors', async () => {
      mockWatchlistService.sendAvailabilityNotification.mockRejectedValue(new Error('Send failed'));

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const update = {
        contentId: '123',
        title: 'Test',
        type: 'movie' as const,
        service: 'Netflix',
        availableRegions: ['US'],
      };

      await expect(
        act(async () => {
          await result.current.sendWatchlistUpdate(update);
        })
      ).rejects.toThrow();
    });
  });

  describe('Subscription Notifications', () => {
    it('should send renewal reminder', async () => {
      mockSubscriptionService.sendRenewalReminder.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const subscription = { id: 'sub-1', tier: 'premium', renewalDate: new Date() };

      await act(async () => {
        await result.current.sendRenewalReminder(subscription, 7);
      });

      expect(mockSubscriptionService.sendRenewalReminder).toHaveBeenCalledWith(subscription, 7);
    });

    it('should send payment failed notification', async () => {
      mockSubscriptionService.sendPaymentFailedNotification.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const subscription = { id: 'sub-1', tier: 'premium', renewalDate: new Date() };
      const payment = { id: 'pay-1', amount: 9.99, attemptDate: new Date() };

      await act(async () => {
        await result.current.sendPaymentFailedNotification(subscription, payment);
      });

      expect(mockSubscriptionService.sendPaymentFailedNotification).toHaveBeenCalledWith(subscription, payment);
    });

    it('should send payment expiry notification', async () => {
      mockSubscriptionService.sendPaymentExpiryNotification.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const payment = { id: 'pay-1', cardLast4: '1234', expiryDate: new Date() };

      await act(async () => {
        await result.current.sendPaymentExpiryNotification(payment, 14);
      });

      expect(mockSubscriptionService.sendPaymentExpiryNotification).toHaveBeenCalledWith(payment, 14);
    });

    it('should send cancellation confirmation', async () => {
      mockSubscriptionService.sendCancellationConfirmation.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const subscription = { id: 'sub-1', tier: 'premium', renewalDate: new Date() };
      const accessUntil = new Date('2025-12-31');

      await act(async () => {
        await result.current.sendCancellationConfirmation(subscription, accessUntil);
      });

      expect(mockSubscriptionService.sendCancellationConfirmation).toHaveBeenCalledWith(subscription, accessUntil);
    });

    it('should send feature announcement', async () => {
      mockSubscriptionService.sendFeatureAnnouncement.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const feature = {
        title: 'New Feature',
        description: 'Check out our new feature!',
        imageUrl: 'https://example.com/image.png',
        learnMoreUrl: 'https://example.com/feature',
      };

      await act(async () => {
        await result.current.sendFeatureAnnouncement(feature);
      });

      expect(mockSubscriptionService.sendFeatureAnnouncement).toHaveBeenCalledWith(feature);
    });
  });

  describe('Loading State', () => {
    it('should start with isLoading true', () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.isLoading).toBe(true);
    });

    it('should set isLoading to false after initialization completes', async () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
