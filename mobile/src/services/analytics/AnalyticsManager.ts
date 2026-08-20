/**
 * AnalyticsManager - Centralized Mobile Analytics Coordinator
 *
 * Singleton service that coordinates all mobile analytics:
 * - Generates and persists deviceId (install-scoped, not user-scoped)
 * - Manages consent state per-user (BUG-034 FIX)
 * - userId is included in every event for correct attribution (BUG-033 FIX)
 * - Unified event queue with AsyncStorage persistence
 * - Batch upload (50 events or 30 seconds)
 * - Retry logic with exponential backoff
 * - Network state monitoring
 * - Clears user-scoped data on logout (BUG-034/038 FIX)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { v4 as uuidv4 } from 'uuid';
import { AnalyticsApiClient } from './AnalyticsApiClient';
import { AnalyticsTransformer } from './AnalyticsTransformer';
import { logger } from '../../utils/logger';
import {
  QueuedEvent,
  AnalyticsConfig,
  UserBehaviorEventRequest,
  STORAGE_KEYS,
  BATCH_CONFIG,
  RETRY_DELAYS,
} from './types';

export class AnalyticsManager {
  private static instance: AnalyticsManager | null = null;
  // Install-scoped deviceId: shared across users on the same install (intentional)
  private deviceId: string = '';
  private sessionId: string = '';
  private userId?: string;
  // BUG-034 FIX: consent is per-user, defaults to false for each new user
  private hasConsent: boolean = false;
  private consentCategories: string = '';
  private eventQueue: QueuedEvent[] = [];
  private failedQueue: QueuedEvent[] = [];
  private flushTimer?: ReturnType<typeof setInterval>;
  private netInfoUnsubscribe?: () => void;
  private isInitialized = false;
  private apiClient: AnalyticsApiClient;
  private transformer: AnalyticsTransformer;

  private constructor() {
    this.apiClient = new AnalyticsApiClient();
    this.transformer = new AnalyticsTransformer();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager();
    }
    return AnalyticsManager.instance;
  }

  /**
   * Initialize analytics manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Generate/load deviceId (install-scoped, not user-scoped)
      this.deviceId = await this.getOrCreateDeviceId();

      // Generate new sessionId for this app launch
      this.sessionId = uuidv4();

      // BUG-034 FIX: consent defaults to false; only loaded after user is set via setUserId
      this.hasConsent = false;
      this.consentCategories = '';

      // Set up periodic flush
      this.startPeriodicFlush();

      // Set up network monitoring
      this.setupNetworkMonitoring();

      this.isInitialized = true;
      logger.info('[AnalyticsManager] Initialized successfully');
    } catch (error) {
      logger.error('[AnalyticsManager] Initialization failed', error);
    }
  }

  /**
   * Track event (add to queue)
   * BUG-033 FIX: userId is always included in queued events via config at flush time.
   */
  public async trackEvent(event: QueuedEvent): Promise<void> {
    try {
      // Check consent before adding to queue
      if (!this.hasConsent) {
        logger.debug('[AnalyticsManager] Skipping event - no consent');
        return;
      }

      // Add to queue
      this.eventQueue.push(event);

      // Persist queue
      await this.persistQueue();

      // Trigger flush if batch size reached
      if (this.eventQueue.length >= BATCH_CONFIG.SIZE) {
        await this.flushQueue();
      }
    } catch (error) {
      logger.error('[AnalyticsManager] Failed to track event', error);
    }
  }

  /**
   * Flush queue to backend
   */
  public async flushQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    // Check consent
    if (!this.hasConsent) {
      logger.debug('[AnalyticsManager] Skipping flush - no consent');
      return;
    }

    // Check network
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      logger.debug('[AnalyticsManager] Skipping flush - offline');
      return;
    }

    try {
      // Get events to upload
      const eventsToUpload = [...this.eventQueue];
      this.eventQueue = [];
      await this.persistQueue();

      // Transform to backend format
      // BUG-033 FIX: userId is included in every transformed event
      const config: AnalyticsConfig = {
        userId: this.userId,
        sessionId: this.sessionId,
        deviceId: this.deviceId,
        hasConsent: this.hasConsent,
        consentCategories: this.consentCategories,
      };

      const transformedEvents = eventsToUpload.map((event) =>
        this.transformer.toUserBehaviorEvent(event, config)
      );

      // Upload with retry logic
      await this.uploadWithRetry(transformedEvents, eventsToUpload);

      logger.info('[AnalyticsManager] Flushed events', { count: transformedEvents.length });
    } catch (error) {
      logger.error('[AnalyticsManager] Flush failed', error);
    }
  }

  /**
   * Set consent state for the current user.
   * BUG-034 FIX: Consent is stored per-user using userId-scoped key.
   */
  public async setConsent(hasConsent: boolean, categories: string[]): Promise<void> {
    this.hasConsent = hasConsent;
    this.consentCategories = categories.join(',');

    try {
      const consentKey = this.getConsentKey();
      await AsyncStorage.setItem(
        consentKey,
        JSON.stringify({
          hasConsent,
          categories,
          timestamp: Date.now(),
        })
      );

      logger.info('[AnalyticsManager] Consent updated', { hasConsent, categories });
    } catch (error) {
      logger.error('[AnalyticsManager] Failed to save consent', error);
    }
  }

  /**
   * Get device ID (install-scoped)
   */
  public getDeviceId(): string {
    return this.deviceId;
  }

  /**
   * Get session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Check if user has consented
   */
  public hasUserConsent(): boolean {
    return this.hasConsent;
  }

  /**
   * Set user ID and load that user's consent state.
   * BUG-034 FIX: Each user has their own consent, defaulting to false.
   * Call this on login/user-switch.
   */
  public async setUserId(userId: string): Promise<void> {
    const changed = this.userId !== userId;
    this.userId = userId;

    if (changed) {
      // Reset consent to false for the new user before loading
      this.hasConsent = false;
      this.consentCategories = '';
      // Load this user's persisted consent (may stay false if never consented)
      await this.loadConsentState();
      // Load this user's queued events
      await this.loadQueue();
    }
  }

  /**
   * Clear user-specific data on logout.
   * BUG-034/BUG-038 FIX: Clears consent and analytics queue for the current user.
   */
  public async clearUserData(): Promise<void> {
    try {
      const keysToRemove: string[] = [
        this.getConsentKey(),
        this.getQueueKey(),
        this.getFailedQueueKey(),
      ];
      await AsyncStorage.multiRemove(keysToRemove);
      logger.info('[AnalyticsManager] Cleared user-specific data');
    } catch (error) {
      logger.error('[AnalyticsManager] Failed to clear user data', error);
    }

    // Reset in-memory state
    this.hasConsent = false;
    this.consentCategories = '';
    this.eventQueue = [];
    this.failedQueue = [];
    this.userId = undefined;
  }

  /**
   * Get or create device ID (install-scoped, shared across users on same install).
   * BUG-033: Device ID is intentionally install-scoped (not user-scoped).
   * The userId is included in every event for correct user attribution.
   */
  private async getOrCreateDeviceId(): Promise<string> {
    try {
      // Try to load existing deviceId
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      if (stored) {
        return stored;
      }

      // Generate new deviceId using uuid v4 for uniqueness
      const deviceId = `device_${uuidv4()}`;

      // Persist
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);

      return deviceId;
    } catch (error) {
      logger.error('[AnalyticsManager] Failed to get/create deviceId', error);
      return `temp_${uuidv4()}`;
    }
  }

  /**
   * Get user-scoped consent key.
   * BUG-034 FIX: Each user has their own consent state.
   */
  private getConsentKey(): string {
    if (this.userId) {
      return `${STORAGE_KEYS.CONSENT}_${this.userId}`;
    }
    return STORAGE_KEYS.CONSENT;
  }

  /**
   * Get user-scoped analytics queue key.
   * BUG-035 FIX: Each user has their own event queue.
   */
  private getQueueKey(): string {
    if (this.userId) {
      return `${STORAGE_KEYS.ANALYTICS_QUEUE}_${this.userId}`;
    }
    return STORAGE_KEYS.ANALYTICS_QUEUE;
  }

  /**
   * Get user-scoped failed queue key.
   */
  private getFailedQueueKey(): string {
    if (this.userId) {
      return `${STORAGE_KEYS.FAILED_QUEUE}_${this.userId}`;
    }
    return STORAGE_KEYS.FAILED_QUEUE;
  }

  /**
   * Load consent state from AsyncStorage for the current user.
   * BUG-034 FIX: Defaults to false if no consent found for user.
   */
  private async loadConsentState(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.getConsentKey());
      if (stored) {
        const consent = JSON.parse(stored);
        this.hasConsent = consent.hasConsent || false;
        this.consentCategories = (consent.categories || []).join(',');
      } else {
        // Default to opted-out for new user
        this.hasConsent = false;
        this.consentCategories = '';
      }
    } catch (error) {
      logger.error('[AnalyticsManager] Failed to load consent', error);
      this.hasConsent = false;
    }
  }

  /**
   * Load event queue from AsyncStorage for the current user.
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.getQueueKey());
      if (stored) {
        this.eventQueue = JSON.parse(stored);
      } else {
        this.eventQueue = [];
      }

      const failedStored = await AsyncStorage.getItem(this.getFailedQueueKey());
      if (failedStored) {
        this.failedQueue = JSON.parse(failedStored);
      } else {
        this.failedQueue = [];
      }
    } catch (error) {
      logger.error('[AnalyticsManager] Failed to load queue', error);
      this.eventQueue = [];
      this.failedQueue = [];
    }
  }

  /**
   * Persist event queue to AsyncStorage for the current user.
   */
  private async persistQueue(): Promise<void> {
    try {
      // Limit queue size
      if (this.eventQueue.length > BATCH_CONFIG.MAX_QUEUE_SIZE) {
        this.eventQueue = this.eventQueue.slice(-BATCH_CONFIG.MAX_QUEUE_SIZE);
      }

      await AsyncStorage.setItem(this.getQueueKey(), JSON.stringify(this.eventQueue));
    } catch (error) {
      logger.error('[AnalyticsManager] Failed to persist queue', error);
    }
  }

  /**
   * Persist failed queue to AsyncStorage for the current user.
   */
  private async persistFailedQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.getFailedQueueKey(), JSON.stringify(this.failedQueue));
    } catch (error) {
      logger.error('[AnalyticsManager] Failed to persist failed queue', error);
    }
  }

  /**
   * Upload events with retry logic
   */
  private async uploadWithRetry(transformedEvents: UserBehaviorEventRequest[], originalEvents: QueuedEvent[]): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < BATCH_CONFIG.MAX_RETRIES; attempt++) {
      try {
        await this.apiClient.batchTrackUserBehavior(transformedEvents);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        logger.error('[AnalyticsManager] Upload attempt failed', { attempt: attempt + 1, error });

        // Don't retry on authentication errors (401/403)
        if (error instanceof Error && error.message.includes('Authentication error')) {
          logger.error('[AnalyticsManager] Authentication error - not retrying');
          return; // Don't add to failed queue for auth errors
        }

        // Wait before retry (exponential backoff)
        if (attempt < BATCH_CONFIG.MAX_RETRIES - 1) {
          await this.delay(RETRY_DELAYS[attempt]);
        }
      }
    }

    // Failed after all retries - move to failed queue
    logger.error('[AnalyticsManager] Upload failed after all retries', lastError);
    this.failedQueue.push(...originalEvents);
    await this.persistFailedQueue();
  }

  /**
   * Start periodic flush timer
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushQueue();
    }, BATCH_CONFIG.FLUSH_INTERVAL);
  }

  /**
   * Set up network monitoring
   */
  private setupNetworkMonitoring(): void {
    // Store unsubscribe function for cleanup in dispose()
    this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        logger.info('[AnalyticsManager] Network reconnected - flushing queue');
        this.flushQueue();
      }
    });
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources and flush remaining events.
   * BUG-038 FIX: Also clears user-specific storage on logout/dispose.
   */
  public async dispose(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    // Clean up NetInfo listener to prevent memory leak
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = undefined;
    }
    await this.flushQueue();
    // Clear user-specific data (consent, queues) so next user starts fresh
    await this.clearUserData();
  }
}

export default AnalyticsManager;
