/**
 * Network Status Hook for GeoLeap Mobile App
 * Provides real-time network connectivity and quality information
 * Wraps the NetworkService for React component usage
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { NetworkService, type NetworkStatus, type NetworkQuality } from '../services/api/NetworkService';
import { logger } from '../utils/logger';

export interface UseNetworkStatusOptions {
  onStatusChange?: (status: NetworkStatus) => void;
  onQualityChange?: (quality: NetworkQuality) => void;
  testOnMount?: boolean;
  testInterval?: number;
}

/**
 * Custom hook for network status monitoring
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}) {
  const {
    onStatusChange,
    onQualityChange,
    testOnMount = false,
    testInterval = 0, // 0 = no periodic testing
  } = options;

  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [lastTestTime, setLastTestTime] = useState<number | null>(null);

  const networkServiceRef = useRef<NetworkService>(new NetworkService());

  // Update status
  const updateStatus = useCallback((newStatus: NetworkStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Update quality
  const updateQuality = useCallback((quality: NetworkQuality) => {
    if (status) {
      updateStatus({ ...status, quality });
    }
    onQualityChange?.(quality);
  }, [status, updateStatus, onQualityChange]);

  // Test connection
  const testConnection = useCallback(async (): Promise<boolean> => {
    setIsTesting(true);
    try {
      const isHealthy = await networkServiceRef.current.testConnection();
      setLastTestTime(Date.now());
      return isHealthy;
    } catch (error) {
      logger.error('[useNetworkStatus] Connection test failed', error);
      return false;
    } finally {
      setIsTesting(false);
    }
  }, []);

  // Initialize and setup listeners
  useEffect(() => {
    let unsubscribeStatus: (() => void) | null = null;
    let unsubscribeQuality: (() => void) | null = null;
    let testTimer: ReturnType<typeof setInterval> | null = null;

    const initialize = async () => {
      // Get initial status
      const initialStatus = networkServiceRef.current.getCurrentStatus();
      if (initialStatus) {
        updateStatus(initialStatus);
      }

      // Setup status listener
      unsubscribeStatus = networkServiceRef.current.onConnectionChange(updateStatus);

      // Setup quality listener
      unsubscribeQuality = networkServiceRef.current.onQualityChange(updateQuality);

      // Test connection on mount if requested
      if (testOnMount) {
        await testConnection();
      }

      // Setup periodic testing
      if (testInterval > 0) {
        testTimer = setInterval(testConnection, testInterval);
      }
    };

    initialize();

    return () => {
      unsubscribeStatus?.();
      unsubscribeQuality?.();
      if (testTimer) {
        clearInterval(testTimer);
      }
    };
  }, [
    updateStatus,
    updateQuality,
    testOnMount,
    testInterval,
    testConnection,
  ]);

  return {
    // Connection status
    isConnected: status?.isConnected ?? false,
    isInternetReachable: status?.isInternetReachable ?? false,
    connectionType: status?.type ?? 'unknown',
    connectionState: status?.details ?? null,

    // Network quality
    quality: status?.quality?.score ?
      (status.quality.score >= 90 ? 'excellent' :
       status.quality.score >= 70 ? 'good' :
       status.quality.score >= 50 ? 'fair' :
       status.quality.score >= 30 ? 'poor' : 'unknown') : 'unknown',
    latency: status?.quality?.latency ?? null,
    downloadSpeed: status?.quality?.downloadSpeed ?? null,
    uploadSpeed: status?.quality?.uploadSpeed ?? null,
    qualityScore: status?.quality?.score ?? null,

    // Testing
    isTesting,
    lastTestTime,
    testConnection,

    // Raw status object
    rawStatus: status,
  };
}

export default useNetworkStatus;
