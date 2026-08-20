import { useState, useEffect, useCallback } from 'react';
import NotificationAnalytics, { NotificationMetrics, AnalyticsConfig } from '../../../services/notificationAnalytics';
import { logger } from '../../../utils/logger';

export interface UseNotificationAnalyticsReturn {
  // State
  metrics: NotificationMetrics | null;
  config: AnalyticsConfig | null;
  queueStatus: { size: number; isUploading: boolean };
  isLoading: boolean;
  error: string | null;

  // Actions
  updateConfig: (config: Partial<AnalyticsConfig>) => Promise<void>;
  getMetrics: (days?: number) => Promise<void>;
  forceUpload: () => Promise<void>;
  clearData: () => Promise<void>;
  exportData: (startDate: Date, endDate: Date) => Promise<unknown[]>;

  // Utility
  refreshData: () => Promise<void>;
}

export const useNotificationAnalytics = (): UseNotificationAnalyticsReturn => {
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null);
  const [config, setConfig] = useState<AnalyticsConfig | null>(null);
  const [queueStatus, setQueueStatus] = useState<{ size: number; isUploading: boolean }>({ size: 0, isUploading: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [metricsData, configData, statusData] = await Promise.all([
        NotificationAnalytics.getMetrics(7), // Last 7 days
        Promise.resolve(NotificationAnalytics.getConfig()),
        Promise.resolve(NotificationAnalytics.getQueueStatus()),
      ]);

      setMetrics(metricsData);
      setConfig(configData);
      setQueueStatus(statusData);
    } catch (err) {
      logger.error('[useNotificationAnalytics] Failed to load analytics data', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (newConfig: Partial<AnalyticsConfig>) => {
    try {
      setError(null);
      await NotificationAnalytics.saveConfig(newConfig);

      // Update local state
      if (config) {
        setConfig({ ...config, ...newConfig });
      }
    } catch (err) {
      logger.error('[useNotificationAnalytics] Failed to update analytics config', err);
      setError(err instanceof Error ? err.message : 'Failed to update config');
      throw err;
    }
  }, [config]);

  const getMetrics = useCallback(async (days: number = 7) => {
    try {
      setError(null);
      const metricsData = await NotificationAnalytics.getMetrics(days);
      setMetrics(metricsData);
    } catch (err) {
      logger.error('[useNotificationAnalytics] Failed to get metrics', err);
      setError(err instanceof Error ? err.message : 'Failed to get metrics');
      throw err;
    }
  }, []);

  const forceUpload = useCallback(async () => {
    try {
      setError(null);
      await NotificationAnalytics.forceUpload();

      // Update queue status
      const status = NotificationAnalytics.getQueueStatus();
      setQueueStatus(status);
    } catch (err) {
      logger.error('[useNotificationAnalytics] Failed to upload analytics', err);
      setError(err instanceof Error ? err.message : 'Failed to upload data');
      throw err;
    }
  }, []);

  const clearData = useCallback(async () => {
    try {
      setError(null);
      await NotificationAnalytics.clearAllData();

      // Reset state
      setMetrics(null);
      setQueueStatus({ size: 0, isUploading: false });

      // Reload config
      const configData = NotificationAnalytics.getConfig();
      setConfig(configData);
    } catch (err) {
      logger.error('[useNotificationAnalytics] Failed to clear analytics data', err);
      setError(err instanceof Error ? err.message : 'Failed to clear data');
      throw err;
    }
  }, []);

  const exportData = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      setError(null);
      const events = await NotificationAnalytics.exportEvents(startDate, endDate);
      return events;
    } catch (err) {
      logger.error('[useNotificationAnalytics] Failed to export analytics data', err);
      setError(err instanceof Error ? err.message : 'Failed to export data');
      throw err;
    }
  }, []);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update queue status periodically
  useEffect(() => {
    const updateQueueStatus = () => {
      const status = NotificationAnalytics.getQueueStatus();
      setQueueStatus(status);
    };

    const interval = setInterval(updateQueueStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    // State
    metrics,
    config,
    queueStatus,
    isLoading,
    error,

    // Actions
    updateConfig,
    getMetrics,
    forceUpload,
    clearData,
    exportData,

    // Utility
    refreshData,
  };
};
