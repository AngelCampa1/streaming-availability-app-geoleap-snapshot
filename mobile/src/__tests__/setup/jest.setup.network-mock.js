/**
 * NetworkService Mock for Tests
 *
 * Prevents NetworkService from running background connection quality tests
 * during test execution, which can cause test failures and slow down test runs.
 */

// Mock the NetworkService to prevent background connection tests
jest.mock('../../services/api/NetworkService', () => {
  const NetworkQuality = {
    Excellent: 'excellent',
    Good: 'good',
    Fair: 'fair',
    Poor: 'poor',
    Offline: 'offline',
  };

  class MockNetworkService {
    static instance = null;

    static getInstance() {
      if (!MockNetworkService.instance) {
        MockNetworkService.instance = new MockNetworkService();
      }
      return MockNetworkService.instance;
    }

    // Mock methods to return successful values without making real network calls
    async testConnectionQuality() {
      return {
        quality: NetworkQuality.Excellent,
        latency: 10,
        downloadSpeed: 100,
        uploadSpeed: 50,
        timestamp: new Date().toISOString(),
      };
    }

    async performQualityTest() {
      return {
        quality: NetworkQuality.Excellent,
        latency: 10,
        downloadSpeed: 100,
        uploadSpeed: 50,
        timestamp: new Date().toISOString(),
      };
    }

    getQuality() {
      return NetworkQuality.Excellent;
    }

    isOnline() {
      return true;
    }

    isConnected() {
      return Promise.resolve(true);
    }

    getLatency() {
      return 10;
    }

    // Method used by OfflineService to subscribe to connection changes
    onConnectionChange(listener) {
      // Immediately call with online status in test environment
      if (typeof listener === 'function') {
        listener({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: {},
        });
      }
      // Return unsubscribe function
      return () => {};
    }

    getCurrentStatus() {
      return {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {},
        quality: {
          score: 100,
          latency: 10,
          downloadSpeed: 100,
          uploadSpeed: 50,
          packetLoss: 0,
          jitter: 1,
        },
        timestamp: Date.now(),
      };
    }
  }

  // Create a singleton instance
  const mockInstance = new MockNetworkService();

  return {
    __esModule: true,
    default: mockInstance, // Export instance as default
    NetworkService: MockNetworkService, // Export class as named export
    NetworkQuality,
  };
});
