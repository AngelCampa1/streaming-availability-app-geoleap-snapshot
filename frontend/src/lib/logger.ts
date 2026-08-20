/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

// Application Insights types  -  imported dynamically to avoid bundling into CF Workers
type ApplicationInsights = import('@microsoft/applicationinsights-web').ApplicationInsights;

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
  timestamp: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
}

interface UserActionLog extends Record<string, any> {
  action: string;
  component?: string;
  data?: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

interface PerformanceLog extends Record<string, any> {
  metric: string;
  value: number;
  context?: string;
  timestamp: string;
}

export class LoggerService {
  private appInsights?: ApplicationInsights;
  private logs: LogEntry[] = [];
  private maxLogBuffer = 100;
  private sessionId: string;
  private userId?: string;
  private correlationId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupApplicationInsights();
    this.setupUnhandledErrorCapture();
    this.setupPerformanceObserver();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupApplicationInsights() {
    // Only load Application Insights on the client  -  the SDK uses Error subclasses
    // that conflict with Cloudflare Workers esbuild __name helper
    if (typeof window === 'undefined') return;

    try {
      const connectionString = process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING;
      if (!connectionString) return;

      // Dynamic import to avoid bundling into server/worker
      Promise.all([
        import('@microsoft/applicationinsights-web'),
        import('@microsoft/applicationinsights-react-js'),
      ]).then(([{ ApplicationInsights: AI }, { ReactPlugin }]) => {
        const reactPlugin = new ReactPlugin();
        this.appInsights = new AI({
          config: {
            connectionString,
            extensions: [reactPlugin],
            extensionConfig: {
              [reactPlugin.identifier]: {
                history: (window as Window & { history?: History }).history,
              },
            },
            disableFetchTracking: false,
            disableAjaxTracking: false,
            disableExceptionTracking: false,
            enableAutoRouteTracking: true,
            enableCorsCorrelation: true,
            enableRequestHeaderTracking: true,
            enableResponseHeaderTracking: true,
            samplingPercentage: process.env.NODE_ENV === 'production' ? 10 : 100,
          },
        });

        this.appInsights.loadAppInsights();
        this.appInsights.setAuthenticatedUserContext(this.userId || 'anonymous');
        this.appInsights.addTelemetryInitializer(envelope => {
          envelope.tags = envelope.tags || {};
          envelope.tags['ai.session.id'] = this.sessionId;
          if (this.correlationId) {
            envelope.tags['ai.operation.id'] = this.correlationId;
          }
          return true;
        });

        (window as Window & { appInsights?: ApplicationInsights }).appInsights = this.appInsights;
      }).catch(error => {
        console.error('Failed to initialize Application Insights:', error);
      });
    } catch (error) {
      console.error('Failed to initialize Application Insights:', error);
    }
  }

  private setupUnhandledErrorCapture() {
    if (typeof window === 'undefined') return;

    // Capture unhandled JavaScript errors
    window.addEventListener('error', event => {
      this.logError('UnhandledError', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      this.logError('UnhandledPromiseRejection', {
        reason: event.reason,
        stack: event.reason?.stack,
      });
    });
  }

  private setupPerformanceObserver() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.logPerformance('PageLoad', navEntry.loadEventEnd - navEntry.startTime);
            this.logPerformance('DOMContentLoaded', navEntry.domContentLoadedEventEnd - navEntry.startTime);
            this.logPerformance('FirstContentfulPaint', navEntry.loadEventEnd - navEntry.startTime);
          }
        });
      });
      navObserver.observe({ type: 'navigation', buffered: true });

      // Observe resource timing (API calls, etc.)
      const resourceObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name.includes('/api/') || entry.name.includes('http')) {
            this.logPerformance('ApiCall', entry.duration, entry.name);
          }
        });
      });
      resourceObserver.observe({ type: 'resource', buffered: true });
    } catch (error) {
      console.warn('Performance Observer not supported or failed to initialize:', error);
    }
  }

  public setUser(userId: string) {
    this.userId = userId;
    this.appInsights?.setAuthenticatedUserContext(userId);
  }

  public setCorrelationId(correlationId: string) {
    this.correlationId = correlationId;
  }

  public log(level: LogEntry['level'], message: string, data?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      userId: this.userId,
      sessionId: this.sessionId,
    };

    // Add to local buffer
    this.logs.push(entry);
    if (this.logs.length > this.maxLogBuffer) {
      this.logs.shift(); // Remove oldest entry
    }

    // Console logging in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      const logMethod = console[level] || console.log;
      logMethod(`[${level.toUpperCase()}] ${message}`, data || '');
    }

    // Send to Application Insights
    if (this.appInsights) {
      const properties = {
        level,
        correlationId: this.correlationId,
        userId: this.userId,
        sessionId: this.sessionId,
        ...data,
      };

      switch (level) {
        case 'error':
          this.appInsights.trackException({
            exception: data instanceof Error ? data : new Error(message),
            properties,
          });
          break;
        default:
          this.appInsights.trackTrace({
            message,
            severityLevel: this.getSeverityLevel(level),
            properties,
          });
      }
    }
  }

  public debug(message: string, data?: Record<string, any>) {
    this.log('debug', message, data);
  }

  public info(message: string, data?: Record<string, any>) {
    this.log('info', message, data);
  }

  public warn(message: string, data?: Record<string, any>) {
    this.log('warn', message, data);
  }

  public error(message: string, data?: Record<string, any>) {
    this.log('error', message, data);
  }

  public logError(type: string, errorData: Record<string, any>) {
    this.error(`${type}: ${errorData.message || 'Unknown error'}`, errorData);
  }

  public logUserAction(action: string, component?: string, data?: Record<string, any>) {
    const actionLog: UserActionLog = {
      action,
      component,
      data,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.info(`User action: ${action}`, actionLog);

    // Track as custom event in Application Insights
    if (this.appInsights) {
      this.appInsights.trackEvent({
        name: 'UserAction',
        properties: {
          action,
          component,
          userId: this.userId,
          sessionId: this.sessionId,
          timestamp: actionLog.timestamp,
        },
        measurements: data && typeof data === 'object' ? (data as Record<string, number>) : undefined,
      });
    }
  }

  public logPerformance(metric: string, value: number, context?: string) {
    const perfLog: PerformanceLog = {
      metric,
      value,
      context,
      timestamp: new Date().toISOString(),
    };

    this.debug(`Performance: ${metric} = ${value}ms`, perfLog);

    // Track as metric in Application Insights
    if (this.appInsights) {
      this.appInsights.trackMetric({
        name: metric,
        average: value,
        properties: {
          context,
          sessionId: this.sessionId,
          timestamp: perfLog.timestamp,
        },
      });
    }
  }

  public logApiCall(url: string, method: string, statusCode: number, responseTime: number, success: boolean) {
    const apiLog = {
      url,
      method,
      statusCode,
      responseTime,
      success,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
    };

    const level = success ? 'info' : 'warn';
    this.log(level, `API ${method} ${url}: ${statusCode} (${responseTime}ms)`, apiLog);

    // Track as dependency in Application Insights
    if (this.appInsights) {
      this.appInsights.trackDependencyData({
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `${method} ${url}`,
        data: url,
        duration: responseTime,
        success,
        responseCode: statusCode,
        properties: apiLog,
      });
    }
  }

  public logPageView(pageName: string, url?: string, duration?: number) {
    if (this.appInsights) {
      this.appInsights.trackPageView({
        name: pageName,
        uri: url || (typeof window !== 'undefined' ? window.location.href : ''),
        properties: {
          userId: this.userId,
          sessionId: this.sessionId,
        },
        measurements: duration ? { duration } : undefined,
      });
    }
  }

  public flush() {
    if (this.appInsights) {
      this.appInsights.flush();
    }
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  private getSeverityLevel(level: LogEntry['level']): number {
    switch (level) {
      case 'debug':
        return 0; // Verbose
      case 'info':
        return 1; // Information
      case 'warn':
        return 2; // Warning
      case 'error':
        return 3; // Error
      default:
        return 1;
    }
  }
}

// Create singleton instance
export const logger = new LoggerService();

// Make logger globally available for error boundary and other components
if (typeof window !== 'undefined') {
  (window as Window & { loggerService?: LoggerService }).loggerService = logger;
}

// Hook for React components
export const useLogger = () => {
  return logger;
};

// HOC for automatic component logging
export function withLogging<T extends object>(Component: React.ComponentType<T>, componentName?: string) {
  const WrappedComponent = (props: T) => {
    const componentDisplayName = componentName || Component.displayName || Component.name;

    React.useEffect(() => {
      logger.debug(`Component ${componentDisplayName} mounted`);
      return () => {
        logger.debug(`Component ${componentDisplayName} unmounted`);
      };
    }, [componentDisplayName]);

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withLogging(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
