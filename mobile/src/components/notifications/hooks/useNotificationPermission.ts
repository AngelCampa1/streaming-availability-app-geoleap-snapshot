import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import NotificationService from '../../../services/notificationService';
import NotificationAnalytics from '../../../services/notificationAnalytics';
import { logger } from '../../../utils/logger';

export interface UseNotificationPermissionReturn {
  // State
  hasPermission: boolean;
  isLoading: boolean;
  isRequesting: boolean;
  error: string | null;

  // Actions
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<boolean>;
  openSettings: () => Promise<void>;

  // Utility
  canRequestPermission: boolean;
  shouldShowRationale: boolean;
}

export const useNotificationPermission = (): UseNotificationPermissionReturn => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldShowRationale, setShouldShowRationale] = useState(false);

  const checkPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const permission = await NotificationService.checkPermission();
      setHasPermission(permission);
      return permission;
    } catch (err) {
      logger.error('[useNotificationPermission] Failed to check notification permission', err);
      setError(err instanceof Error ? err.message : 'Failed to check permission');
      return false;
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (isRequesting) {
      return hasPermission;
    }

    setIsRequesting(true);
    setError(null);

    try {
      // Track permission request
      await NotificationAnalytics.trackPermissionRequested();

      const granted = await NotificationService.requestPermission();

      setHasPermission(granted);

      if (granted) {
        await NotificationAnalytics.trackPermissionGranted();
      } else {
        await NotificationAnalytics.trackPermissionDenied();
        setShouldShowRationale(true);
      }

      return granted;
    } catch (err) {
      logger.error('[useNotificationPermission] Failed to request notification permission', err);
      setError(err instanceof Error ? err.message : 'Failed to request permission');
      await NotificationAnalytics.trackPermissionDenied();
      return false;
    } finally {
      setIsRequesting(false);
    }
  }, [isRequesting, hasPermission]);

  const openSettings = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (err) {
      logger.error('[useNotificationPermission] Failed to open settings', err);
      setError(err instanceof Error ? err.message : 'Failed to open settings');

      Alert.alert(
        'Unable to Open Settings',
        'Please manually open your device settings and navigate to the app permissions.',
        [{ text: 'OK' }],
      );
    }
  }, []);

  useEffect(() => {
    const initializePermission = async () => {
      setIsLoading(true);
      try {
        await checkPermission();
      } finally {
        setIsLoading(false);
      }
    };

    initializePermission();
  }, [checkPermission]);

  // Determine if we can request permission
  const canRequestPermission = Platform.OS === 'android' || !shouldShowRationale;

  return {
    // State
    hasPermission,
    isLoading,
    isRequesting,
    error,

    // Actions
    requestPermission,
    checkPermission,
    openSettings,

    // Utility
    canRequestPermission,
    shouldShowRationale,
  };
};
