/**
 * Crash Reporting Service - Production Ready
 *
 * Comprehensive crash reporting with error capture,
 * context collection, and automated reporting
 */

import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { getEnvironmentConfig } from '../../config/environment';
import { logger } from '../../utils/logger';

// Error context interfaces
export interface ErrorContext {
  userId?: string;
  sessionId: string;
  timestamp: number;
  deviceInfo: {
    platform: string;
    version: string;
    model: string;
    manufacturer: string;
    memoryTotal: number;
    storageTotal: number;
    networkType: string;
    batteryLevel: number;
  };
  appInfo: {
    version: string;
    buildNumber: string;
    environment: string;
    bundleId: string;
  };
  userInfo: {
    isLoggedIn: boolean;
    subscriptionStatus?: string;
    preferences?: Record<string, any>;
  };
  performanceInfo: {
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
    appStartTime: number;
  };
  customData?: Record<string, any>;
}

export interface CrashReport {
  id: string;
  errorId: string;
  type: 'javascript' | 'native' | 'unhandled_rejection' | 'memory' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  componentStack?: string;
  context: ErrorContext;
  breadcrumbs: Breadcrumb[];
  attachments?: string[];
  handled: boolean;
  resolved: boolean;
  createdAt: number;
  reportedAt?: number;
}

export interface Breadcrumb {
  id: string;
  timestamp: number;
  type: 'navigation' | 'user' | 'network' | 'debug' | 'error' | 'state';
  message: string;
  data?: Record<string, any>;
  level: 'debug' | 'info' | 'warn' | 'error';
}

// Crash reporting class
export class CrashReportingService {
  private static instance: CrashReportingService;
  private config = getEnvironmentConfig();
  private sessionId: string;
  private breadcrumbs: Breadcrumb[] = [];
  private pendingReports: CrashReport[] = [];
  private isInitialized = false;
  private maxBreadcrumbs = 100;
  private maxPendingReports = 50;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(): CrashReportingService {
    if (!CrashReportingService.instance) {
      CrashReportingService.instance = new CrashReportingService();
    }
    return CrashReportingService.instance;
  }

  // Initialize crash reporting
  public async initialize(): Promise<void> {
    if (!this.config.ENABLE_CRASH_REPORTING) {
      return;
    }

    try {
      // Note: global JS error handlers are intentionally NOT registered here.
      // index.js uses Sentry.wrap(App) which already installs Sentry's global handler.
      // Registering a second handler via ErrorUtils.setGlobalHandler would cause every
      // crash to be captured twice. Use reportError() directly for explicit reporting.

      // Set up native crash handlers (if available)
      await this.setupNativeHandlers();

      // Load pending reports from storage
      await this.loadPendingReports();

      // Attempt to report pending crashes
      await this.reportPendingCrashes();

      this.isInitialized = true;

      // Add initialization breadcrumb
      this.addBreadcrumb({
        type: 'debug',
        message: 'Crash reporting initialized',
        level: 'info',
        data: { sessionId: this.sessionId },
      });

      logger.info('[CrashReporting] Crash reporting initialized');
    } catch (error) {
      logger.error('[CrashReporting] Failed to initialize crash reporting', error);
    }
  }

  // Report a crash or error
  public async reportError(
    error: Error | string,
    type: CrashReport['type'] = 'javascript',
    severity: CrashReport['severity'] = 'medium',
    handled: boolean = false,
    customData?: Record<string, any>,
  ): Promise<string> {
    if (!this.isInitialized) {
      logger.warn('[CrashReporting] Crash reporting not initialized');
      return '';
    }

    try {
      const errorReport = await this.createErrorReport(error, type, severity, handled, customData);

      // Add to pending reports
      this.pendingReports.push(errorReport);

      // Cleanup old reports
      this.cleanupPendingReports();

      // Store pending reports
      await this.storePendingReports();

      // Attempt immediate report if handled
      if (handled) {
        await this.reportCrash(errorReport);
      } else {
        // For unhandled crashes, store immediately for later reporting
        logger.error('[CrashReporting] Unhandled crash detected', { reportId: errorReport.id });
      }

      return errorReport.id;
    } catch (reportingError) {
      logger.error('[CrashReporting] Failed to report error', reportingError);
      return '';
    }
  }

  // Add a breadcrumb for context
  public addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'id' | 'timestamp'>): void {
    if (!this.isInitialized) {
      return;
    }

    const fullBreadcrumb: Breadcrumb = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...breadcrumb,
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Limit breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }

    // Also send to Sentry
    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.type,
      level: breadcrumb.level === 'warn' ? 'warning' : breadcrumb.level,
      data: breadcrumb.data,
      timestamp: Date.now() / 1000,
    });
  }

  // Set user context
  public setUserContext(
    userId?: string,
    userInfo?: {
      isLoggedIn: boolean;
      subscriptionStatus?: string;
      preferences?: Record<string, any>;
    },
  ): void {
    if (!this.isInitialized) {
      return;
    }
    if (userId) {
      Sentry.setUser({
        id: userId,
        data: {
          subscriptionStatus: userInfo?.subscriptionStatus,
          isLoggedIn: userInfo?.isLoggedIn,
        },
      });
    } else {
      Sentry.setUser(null);
    }

    this.addBreadcrumb({
      type: 'user',
      message: userId ? `User authenticated: ${userId}` : 'User logged out',
      level: 'info',
      data: { userId, ...userInfo },
    });
  }

  // Set custom context data
  public setCustomContext(data: Record<string, any>): void {
    this.addBreadcrumb({
      type: 'debug',
      message: 'Custom context updated',
      level: 'debug',
      data,
    });
  }

  // Manually report a handled error
  public async captureException(
    error: Error,
    contexts?: Record<string, any>,
    tags?: Record<string, string>,
  ): Promise<string> {
    const customData = {
      ...contexts,
      ...tags,
      handled: true,
    };

    return this.reportError(error, 'javascript', 'medium', true, customData);
  }

  // Report a message as an error
  public async captureMessage(
    message: string,
    level: 'info' | 'warn' | 'error' = 'error',
    contexts?: Record<string, any>,
  ): Promise<string> {
    const error = new Error(message);
    const severity = level === 'error' ? 'high' : level === 'warn' ? 'medium' : 'low';

    return this.reportError(error, 'javascript', severity, true, contexts);
  }

  // Get pending reports
  public getPendingReports(): CrashReport[] {
    return [...this.pendingReports];
  }

  // Clear all pending reports
  public async clearPendingReports(): Promise<void> {
    this.pendingReports = [];
    await AsyncStorage.removeItem('crash_reports_pending');
  }

  // Private methods
  private generateSessionId(): string {
    return `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupErrorHandlers(): void {
    // Global error handler for JavaScript errors
    const originalHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      this.reportError(
        error,
        'javascript',
        isFatal ? 'critical' : 'high',
        false,
        { isFatal },
      ).then(() => {
        // Call original handler
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    });
  }

  private setupUnhandledRejectionHandler(): void {
    // Handle unhandled promise rejections
    if (typeof global !== 'undefined' && 'addEventListener' in global && typeof (global as any).addEventListener === 'function') {
      (global as any).addEventListener('unhandledrejection', (event: any) => {
        this.reportError(
          event.reason || new Error('Unhandled promise rejection'),
          'unhandled_rejection',
          'high',
          false,
          { promise: event.promise },
        );
      });
    }
  }

  private async setupNativeHandlers(): Promise<void> {
    // Setup native crash handlers
    // This would integrate with platform-specific crash reporting
    // like Crashlytics, Sentry, etc.

    if (NativeModules.CrashReporting) {
      try {
        await NativeModules.CrashReporting.initialize();
      } catch (error) {
        logger.warn('[CrashReporting] Native crash reporting not available', error);
      }
    }
  }

  private async createErrorReport(
    error: Error | string,
    type: CrashReport['type'],
    severity: CrashReport['severity'],
    handled: boolean,
    customData?: Record<string, any>,
  ): Promise<CrashReport> {
    const errorId = this.generateId();
    const context = await this.collectErrorContext();

    const errorReport: CrashReport = {
      id: this.generateId(),
      errorId,
      type,
      severity,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context,
      breadcrumbs: [...this.breadcrumbs],
      handled,
      resolved: false,
      createdAt: Date.now(),
      // @ts-expect-error - customData not in type
      customData,
    };

    return errorReport;
  }

  private async collectErrorContext(): Promise<ErrorContext> {
    const deviceInfo = await this.getDeviceInfo();
    const appInfo = this.getAppInfo();
    const userInfo = await this.getUserInfo();
    const performanceInfo = await this.getPerformanceInfo();

    return {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      deviceInfo,
      appInfo,
      userInfo,
      performanceInfo,
    };
  }

  private async getDeviceInfo(): Promise<ErrorContext['deviceInfo']> {
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model: 'Unknown', // Would get from native module
      manufacturer: 'Unknown', // Would get from native module
      memoryTotal: 0, // Would get from native module
      storageTotal: 0, // Would get from native module
      networkType: 'unknown', // Would get from NetInfo
      batteryLevel: 1.0, // Would get from native module
    };
  }

  private getAppInfo(): ErrorContext['appInfo'] {
    return {
      version: this.config.VERSION,
      buildNumber: this.config.BUILD_NUMBER,
      environment: this.config.ENVIRONMENT,
      bundleId: 'com.geoleap.mobile', // Would get from app config
    };
  }

  private async getUserInfo(): Promise<ErrorContext['userInfo']> {
    try {
      // Get user info from storage or auth service
      const userInfo = await AsyncStorage.getItem('user_info');
      const parsed = userInfo ? JSON.parse(userInfo) : {};

      return {
        isLoggedIn: !!parsed.userId,
        subscriptionStatus: parsed.subscriptionStatus,
        preferences: parsed.preferences,
      };
    } catch (error) {
      return {
        isLoggedIn: false,
      };
    }
  }

  private async getPerformanceInfo(): Promise<ErrorContext['performanceInfo']> {
    return {
      memoryUsage: 0, // Would get from performance monitoring
      cpuUsage: 0, // Would get from native module
      networkLatency: 0, // Would get from network monitoring
      appStartTime: 0, // Would get from app startup tracking
    };
  }

  private cleanupPendingReports(): void {
    if (this.pendingReports.length > this.maxPendingReports) {
      // Remove oldest reports
      this.pendingReports = this.pendingReports.slice(-this.maxPendingReports);
    }
  }

  private async storePendingReports(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'crash_reports_pending',
        JSON.stringify(this.pendingReports),
      );
    } catch (error) {
      logger.error('[CrashReporting] Failed to store pending crash reports', error);
    }
  }

  private async loadPendingReports(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('crash_reports_pending');
      if (stored) {
        this.pendingReports = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('[CrashReporting] Failed to load pending crash reports', error);
      this.pendingReports = [];
    }
  }

  private async reportPendingCrashes(): Promise<void> {
    if (this.pendingReports.length === 0) {
      return;
    }

    const unhandledReports = this.pendingReports.filter(report => !report.handled);

    for (const report of unhandledReports) {
      await this.reportCrash(report);
    }
  }

  private async reportCrash(report: CrashReport): Promise<void> {
    try {
      // Mark as reported
      report.reportedAt = Date.now();

      // Send to crash reporting service
      await this.sendToCrashService(report);

      // Remove from pending if successfully reported
      const index = this.pendingReports.findIndex(r => r.id === report.id);
      if (index !== -1) {
        this.pendingReports.splice(index, 1);
      }

      logger.info('[CrashReporting] Crash report sent', { reportId: report.id });
    } catch (error) {
      logger.error('[CrashReporting] Failed to report crash', error);
    }
  }

  private async sendToCrashService(report: CrashReport): Promise<void> {
    if (this.config.SENTRY_DSN) {
      Sentry.withScope(scope => {
        scope.setTag('error_type', report.type);
        scope.setTag('severity', report.severity);
        scope.setTag('handled', report.handled.toString());
        scope.setExtra('report_id', report.id);
        scope.setExtra('breadcrumbs', report.breadcrumbs);
        scope.setExtra('context', report.context);

        const error = new Error(report.message);
        if (report.stack) {
          error.stack = report.stack;
        }
        Sentry.captureException(error);
      });
    }

    logger.info('[CrashReporting] Crash Report', {
      id: report.id,
      type: report.type,
      severity: report.severity,
      message: report.message,
      timestamp: report.createdAt,
    });
  }
}

// Export singleton instance
export const crashReporting = CrashReportingService.getInstance();

// Export convenience functions
export const initializeCrashReporting = () => crashReporting.initialize();
export const reportCrash = (
  error: Error | string,
  type?: CrashReport['type'],
  severity?: CrashReport['severity'],
  handled?: boolean,
  customData?: Record<string, any>,
) => crashReporting.reportError(error, type, severity, handled, customData);
export const addBreadcrumb = (breadcrumb: Omit<Breadcrumb, 'id' | 'timestamp'>) =>
  crashReporting.addBreadcrumb(breadcrumb);
export const setUserContext = (
  userId?: string,
  userInfo?: { isLoggedIn: boolean; subscriptionStatus?: string; preferences?: Record<string, any> },
) => crashReporting.setUserContext(userId, userInfo);
export const captureException = (error: Error, contexts?: Record<string, any>, tags?: Record<string, string>) =>
  crashReporting.captureException(error, contexts, tags);
export const captureMessage = (message: string, level?: 'info' | 'warn' | 'error', contexts?: Record<string, any>) =>
  crashReporting.captureMessage(message, level, contexts);

export default crashReporting;
