/**
 * Jest Global Cleanup
 *
 * Cleanup singleton services after all tests complete
 * to prevent memory leaks from setInterval timers
 */

// Global afterAll hook to cleanup singleton services
afterAll(async () => {
  // Cleanup CacheService instances
  try {
    const { globalCache } = require('../../services/api');
    if (globalCache && typeof globalCache.destroy === 'function') {
      globalCache.destroy();
    }
  } catch (error) {
    // Service might not be initialized
  }

  // Cleanup BackgroundTaskService
  try {
    const { BackgroundTaskService } = require('../../services/backgroundTaskService');
    const instance = BackgroundTaskService.getInstance();
    if (instance && typeof instance.destroy === 'function') {
      instance.destroy();
    }
  } catch (error) {
    // Service might not be initialized
  }

  // Cleanup AnalyticsManager
  try {
    const { AnalyticsManager } = require('../../services/analytics/AnalyticsManager');
    const instance = AnalyticsManager.getInstance();
    if (instance && typeof instance.dispose === 'function') {
      instance.dispose();
    }
  } catch (error) {
    // Service might not be initialized
  }
});
