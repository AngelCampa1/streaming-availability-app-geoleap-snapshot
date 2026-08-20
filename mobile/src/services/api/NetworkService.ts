/**
 * Network Service for GeoLeap Mobile App
 * Provides comprehensive network monitoring, connection management, and optimization
 * Handles network state changes, connection quality monitoring, and auto-recovery
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { logger as loggerImport } from '../../utils/logger';
import { delayService, TimerHandle } from '../../utils/DelayService';

// Safe logger wrapper that handles undefined cases in test environments
const logger = {
  debug: (...args: Parameters<typeof console.log>) => loggerImport?.debug?.(...args),
  info: (...args: Parameters<typeof console.log>) => loggerImport?.info?.(...args),
  warn: (...args: Parameters<typeof console.warn>) => loggerImport?.warn?.(...args),
  error: (...args: Parameters<typeof console.error>) => {
    if (loggerImport?.error) {
      loggerImport.error(...args);
    } else {
      console.error(...args);
    }
  },
};

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: NetInfoStateType;
  details: any;
  quality: NetworkQuality;
  timestamp: number;
}

export interface NetworkQuality {
  score: number; // 0-100
  latency: number; // milliseconds
  downloadSpeed: number; // Mbps
  uploadSpeed: number; // Mbps
  packetLoss: number; // percentage
  jitter: number; // milliseconds
}

export interface NetworkTest {
  latency: number;
  downloadSpeed: number;
  uploadSpeed: number;
  packetLoss: number;
  jitter: number;
  timestamp: number;
  server: string;
}

export interface ConnectionConfig {
  testInterval: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
  timeoutDuration: number; // milliseconds
  qualityThresholds: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

type NetworkChangeListener = (status: NetworkStatus) => void;
type QualityChangeListener = (quality: NetworkQuality) => void;

class NetworkService {
  private currentStatus: NetworkStatus | null = null;
  private currentQuality: NetworkQuality | null = null;
  private isMonitoring = false;
  private testIntervalId: TimerHandle | null = null;
  private networkChangeListeners: NetworkChangeListener[] = [];
  private qualityChangeListeners: QualityChangeListener[] = [];
  private testHistory: NetworkTest[] = [];
  private connectionTestPromise: Promise<NetworkQuality> | null = null;
  private initializationPromise: Promise<void>;
  private isInitialized = false;

  private readonly config: ConnectionConfig = {
    testInterval: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 2000, // 2 seconds
    timeoutDuration: 10000, // 10 seconds
    qualityThresholds: {
      excellent: 90,
      good: 70,
      fair: 50,
      poor: 30,
    },
  };

  private readonly STORAGE_KEYS = {
    TEST_HISTORY: 'network_test_history',
    LAST_STATUS: 'network_last_status',
    LAST_QUALITY: 'network_last_quality',
  };

  private readonly TEST_SERVERS = [
    'https://api.geoleap.com/health',
    'https://httpbin.org/get',
    'https://jsonplaceholder.typicode.com/posts/1',
  ];

  constructor() {
    // Store initialization promise instead of just calling initialize()
    this.initializationPromise = this.initialize();
  }

  /**
   * Initialize network monitoring
   */
  private async initialize(): Promise<void> {
    try {
      // Load persisted data
      await this.loadPersistedData();

      // Start monitoring
      this.startMonitoring();

      this.isInitialized = true;
      logger.info('NetworkService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize NetworkService:', error);
    }
  }

  /**
   * Wait for service to be ready (for tests)
   */
  async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }

  /**
   * Load persisted data from AsyncStorage
   */
  private async loadPersistedData(): Promise<void> {
    try {
      // Load test history (keep last 50 entries)
      const historyData = await AsyncStorage.getItem(this.STORAGE_KEYS.TEST_HISTORY);
      if (historyData) {
        const allHistory = JSON.parse(historyData);
        this.testHistory = allHistory.slice(-50);
      }

      // Load last known status
      const statusData = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_STATUS);
      if (statusData) {
        this.currentStatus = JSON.parse(statusData);
      }

      // Load last known quality
      const qualityData = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_QUALITY);
      if (qualityData) {
        this.currentQuality = JSON.parse(qualityData);
      }

      logger.info('Loaded network data:', {
        historyEntries: this.testHistory.length,
        hasStatus: !!this.currentStatus,
        hasQuality: !!this.currentQuality,
      });
    } catch (error) {
      logger.error('Failed to load persisted network data:', error);
    }
  }

  /**
   * Persist data to AsyncStorage
   */
  private async persistData(): Promise<void> {
    try {
      // Skip async operations in test environment to prevent teardown issues
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.TEST_HISTORY, JSON.stringify(this.testHistory)),
        this.currentStatus
          ? AsyncStorage.setItem(this.STORAGE_KEYS.LAST_STATUS, JSON.stringify(this.currentStatus))
          : AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_STATUS),
        this.currentQuality
          ? AsyncStorage.setItem(this.STORAGE_KEYS.LAST_QUALITY, JSON.stringify(this.currentQuality))
          : AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_QUALITY),
      ]);

      logger.debug('Persisted network data successfully');
    } catch (error) {
      logger.error('Failed to persist network data:', error);
    }
  }

  /**
   * Start network monitoring
   */
  private async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    try {
      // Subscribe to network state changes
      NetInfo.addEventListener(this.handleNetworkChange.bind(this));

      // Get initial network state
      const initialState = await NetInfo.fetch();
      this.handleNetworkChange(initialState);

      // Start periodic quality testing
      this.startQualityTesting();

      this.isMonitoring = true;
      logger.info('Network monitoring started');
    } catch (error) {
      logger.error('Failed to start network monitoring:', error);
    }
  }

  /**
   * Handle network state changes
   * BUG-024 FIX: Web platform compatibility - assume internet reachable on web when connected
   */
  private handleNetworkChange(state: NetInfoState): void {
    // On web, isInternetReachable is often null, so we assume it's true if connected
    const isWeb = typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined' && typeof (globalThis as any).window.navigator !== 'undefined';
    const isInternetReachable = isWeb
      ? (state.isConnected ?? false) // On web, if connected, assume internet is reachable
      : (state.isInternetReachable ?? false); // On native, use actual value

    const newStatus: NetworkStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable,
      type: state.type,
      details: state.details,
      quality: this.currentQuality || this.getDefaultQuality(),
      timestamp: Date.now(),
    };

    const previousStatus = this.currentStatus;
    this.currentStatus = newStatus;

    // Log significant changes
    if (previousStatus?.isConnected !== newStatus.isConnected) {
      if (newStatus.isConnected) {
        logger.info('Network connected:', {
          type: newStatus.type,
          internetReachable: newStatus.isInternetReachable,
        });
      } else {
        logger.warn('Network disconnected');
      }
    }

    // Notify listeners
    this.notifyNetworkChangeListeners(newStatus);

    // Trigger immediate quality test on connection
    if (newStatus.isConnected && (!previousStatus?.isConnected || previousStatus.type !== newStatus.type)) {
      this.testConnectionQuality();
    }

    this.persistData();
  }

  /**
   * Start periodic quality testing
   */
  private startQualityTesting(): void {
    if (this.testIntervalId) {
      this.testIntervalId.clear();
    }

    this.testIntervalId = delayService.interval(() => {
      if (this.currentStatus?.isConnected) {
        this.testConnectionQuality();
      }
    }, this.config.testInterval);

    logger.debug('Network quality testing started');
  }

  /**
   * Test connection quality
   */
  async testConnectionQuality(): Promise<NetworkQuality> {
    if (this.connectionTestPromise) {
      return this.connectionTestPromise;
    }

    this.connectionTestPromise = this.performQualityTest();

    try {
      const quality = await this.connectionTestPromise;
      this.updateQuality(quality);
      return quality;
    } finally {
      this.connectionTestPromise = null;
    }
  }

  /**
   * Perform actual quality test
   */
  private async performQualityTest(): Promise<NetworkQuality> {
    const testResults: Partial<NetworkTest>[] = [];

    // Test multiple servers for reliability
    for (const server of this.TEST_SERVERS) {
      try {
        const result = await this.testServer(server);
        testResults.push(result);
      } catch (error) {
        logger.debug('Server test failed:', { server });
      }
    }

    if (testResults.length === 0) {
      throw new Error('All connection tests failed');
    }

    // Calculate averages
    const avgLatency = testResults.reduce((sum, r) => sum + r.latency!, 0) / testResults.length;
    const avgDownloadSpeed = testResults.reduce((sum, r) => sum + r.downloadSpeed!, 0) / testResults.length;
    const avgUploadSpeed = testResults.reduce((sum, r) => sum + r.uploadSpeed!, 0) / testResults.length;
    const avgPacketLoss = testResults.reduce((sum, r) => sum + r.packetLoss!, 0) / testResults.length;
    const avgJitter = testResults.reduce((sum, r) => sum + r.jitter!, 0) / testResults.length;

    // Calculate quality score
    const score = this.calculateQualityScore({
      latency: avgLatency,
      downloadSpeed: avgDownloadSpeed,
      uploadSpeed: avgUploadSpeed,
      packetLoss: avgPacketLoss,
      jitter: avgJitter,
    });

    const quality: NetworkQuality = {
      score,
      latency: avgLatency,
      downloadSpeed: avgDownloadSpeed,
      uploadSpeed: avgUploadSpeed,
      packetLoss: avgPacketLoss,
      jitter: avgJitter,
    };

    // Store test result
    const testResult: NetworkTest = {
      latency: avgLatency,
      downloadSpeed: avgDownloadSpeed,
      uploadSpeed: avgUploadSpeed,
      packetLoss: avgPacketLoss,
      jitter: avgJitter,
      timestamp: Date.now(),
      server: this.TEST_SERVERS[0],
    };

    this.testHistory.push(testResult);

    // Keep only last 100 tests
    if (this.testHistory.length > 100) {
      this.testHistory = this.testHistory.slice(-100);
    }

    await this.persistData();

    logger.debug('Connection quality test completed:', quality);
    return quality;
  }

  /**
   * Test individual server
   */
  private async testServer(server: string): Promise<Partial<NetworkTest>> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutTimer = delayService.timeout(() => controller.abort(), this.config.timeoutDuration);

      const response = await fetch(server, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      timeoutTimer.clear();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const latency = Date.now() - startTime;

      // For simplicity, we'll estimate speeds based on latency and response size
      const responseSize = JSON.stringify(await response.json()).length;
      const downloadSpeed = (responseSize * 8) / (latency / 1000) / 1000000; // Mbps

      return {
        latency,
        downloadSpeed: Math.max(0.1, downloadSpeed), // Minimum 0.1 Mbps
        uploadSpeed: downloadSpeed * 0.8, // Estimate 80% of download speed
        packetLoss: 0, // Would need more complex testing to measure
        jitter: 0, // Would need multiple pings to measure
      };

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Connection timeout');
      }
      throw error;
    }
  }

  /**
   * Calculate quality score (0-100)
   */
  private calculateQualityScore(test: Partial<NetworkTest>): number {
    let score = 100;

    // Latency penalty (higher latency = lower score)
    if (test.latency) {
      if (test.latency < 50) {score -= 0;}
      else if (test.latency < 100) {score -= 10;}
      else if (test.latency < 200) {score -= 25;}
      else if (test.latency < 500) {score -= 50;}
      else {score -= 70;}
    }

    // Download speed penalty (slower speed = lower score)
    if (test.downloadSpeed) {
      if (test.downloadSpeed > 10) {score -= 0;}
      else if (test.downloadSpeed > 5) {score -= 10;}
      else if (test.downloadSpeed > 2) {score -= 25;}
      else if (test.downloadSpeed > 1) {score -= 40;}
      else {score -= 60;}
    }

    // Packet loss penalty
    if (test.packetLoss) {
      score -= test.packetLoss * 2; // 2 points per percentage point
    }

    // Jitter penalty
    if (test.jitter) {
      if (test.jitter < 20) {score -= 0;}
      else if (test.jitter < 50) {score -= 10;}
      else if (test.jitter < 100) {score -= 25;}
      else {score -= 40;}
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Update current network quality
   */
  private updateQuality(quality: NetworkQuality): void {
    const previousQuality = this.currentQuality;
    this.currentQuality = quality;

    // Update current status with new quality
    if (this.currentStatus) {
      this.currentStatus.quality = quality;
    }

    // Notify listeners of significant quality changes
    if (!previousQuality || Math.abs(previousQuality.score - quality.score) > 10) {
      this.notifyQualityChangeListeners(quality);
    }

    this.persistData();
  }

  /**
   * Get default quality values
   */
  private getDefaultQuality(): NetworkQuality {
    return {
      score: 50,
      latency: 200,
      downloadSpeed: 2,
      uploadSpeed: 1,
      packetLoss: 0,
      jitter: 30,
    };
  }

  /**
   * Notify network change listeners
   */
  private notifyNetworkChangeListeners(status: NetworkStatus): void {
    this.networkChangeListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        logger.error('Error in network change listener:', error);
      }
    });
  }

  /**
   * Notify quality change listeners
   */
  private notifyQualityChangeListeners(quality: NetworkQuality): void {
    this.qualityChangeListeners.forEach(listener => {
      try {
        listener(quality);
      } catch (error) {
        logger.error('Error in quality change listener:', error);
      }
    });
  }

  /**
   * Check if network is connected
   * BUG-024 FIX: Web platform compatibility
   */
  async isConnected(): Promise<boolean> {
    if (this.currentStatus) {
      return this.currentStatus.isConnected && this.currentStatus.isInternetReachable;
    }

    try {
      const state = await NetInfo.fetch();

      // On web, isInternetReachable is often null, so we assume it's true if connected
      const isWeb = typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined' && typeof (globalThis as any).window.navigator !== 'undefined';
      const isInternetReachable = isWeb
        ? (state.isConnected ?? false)
        : (state.isInternetReachable ?? false);

      return (state.isConnected ?? false) && isInternetReachable;
    } catch (error) {
      logger.error('Failed to check connection status:', error);
      return false;
    }
  }

  /**
   * Get current network status
   */
  getCurrentStatus(): NetworkStatus | null {
    return this.currentStatus;
  }

  /**
   * Get current network quality
   */
  getCurrentQuality(): NetworkQuality | null {
    return this.currentQuality;
  }

  /**
   * Get connection type string
   */
  getConnectionTypeString(): string {
    if (!this.currentStatus) {return 'Unknown';}

    switch (this.currentStatus.type) {
      case NetInfoStateType.wifi:
        return 'Wi-Fi';
      case NetInfoStateType.cellular:
        return 'Cellular';
      case NetInfoStateType.ethernet:
        return 'Ethernet';
      case NetInfoStateType.bluetooth:
        return 'Bluetooth';
      case NetInfoStateType.wimax:
        return 'WiMAX';
      case NetInfoStateType.vpn:
        return 'VPN';
      case NetInfoStateType.other:
        return 'Other';
      case NetInfoStateType.none:
        return 'None';
      case NetInfoStateType.unknown:
      default:
        return 'Unknown';
    }
  }

  /**
   * Get quality level string
   */
  getQualityLevel(): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {
    if (!this.currentQuality) {return 'unknown';}

    const score = this.currentQuality.score;
    const thresholds = this.config.qualityThresholds;

    if (score >= thresholds.excellent) {return 'excellent';}
    if (score >= thresholds.good) {return 'good';}
    if (score >= thresholds.fair) {return 'fair';}
    if (score >= thresholds.poor) {return 'poor';}
    return 'unknown';
  }

  /**
   * Subscribe to network changes
   */
  onConnectionChange(listener: NetworkChangeListener): () => void {
    this.networkChangeListeners.push(listener);

    // Immediately call with current status
    if (this.currentStatus) {
      listener(this.currentStatus);
    }

    // Return unsubscribe function
    return () => {
      const index = this.networkChangeListeners.indexOf(listener);
      if (index > -1) {
        this.networkChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to quality changes
   */
  onQualityChange(listener: QualityChangeListener): () => void {
    this.qualityChangeListeners.push(listener);

    // Immediately call with current quality
    if (this.currentQuality) {
      listener(this.currentQuality);
    }

    // Return unsubscribe function
    return () => {
      const index = this.qualityChangeListeners.indexOf(listener);
      if (index > -1) {
        this.qualityChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get test history
   */
  getTestHistory(limit: number = 50): NetworkTest[] {
    return this.testHistory.slice(-limit);
  }

  /**
   * Clear test history
   */
  async clearTestHistory(): Promise<void> {
    this.testHistory = [];
    await this.persistData();
  }

  /**
   * Force connection test
   */
  async testConnection(): Promise<boolean> {
    try {
      const quality = await this.testConnectionQuality();
      return quality.score > this.config.qualityThresholds.poor;
    } catch (error) {
      logger.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.testIntervalId) {
      this.testIntervalId.clear();
      this.testIntervalId = null;
    }

    this.isMonitoring = false;
    logger.info('Network monitoring stopped');
  }

  /**
   * Restart monitoring
   */
  async restartMonitoring(): Promise<void> {
    this.stopMonitoring();
    await this.startMonitoring();
  }
}

// Export singleton instance
const networkService = new NetworkService();
export default networkService;
export { NetworkService };
