/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';

// TypeScript interfaces for user behavior API
interface UserBehaviorOverview {
  totalUsers: number;
  totalSessions: number;
  totalPageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  totalInteractions: number;
  avgScrollDepth: number;
}

interface PagePerformanceMetric {
  pageUrl: string;
  pageTitle: string;
  views: number;
  uniqueViews: number;
  avgTimeOnPage: number;
  bounceRate: number;
  exitRate: number;
  conversionRate: number;
  interactions: number;
}

interface DeviceMetric {
  deviceType: string;
  users: number;
  sessions: number;
  percentage: number;
  avgSessionDuration: number;
  bounceRate: number;
}

interface GeographicMetric {
  country: string;
  countryName: string;
  users: number;
  sessions: number;
  percentage: number;
  avgSessionDuration: number;
}

interface InteractionHotspot {
  pageUrl: string;
  elementSelector: string;
  elementText: string;
  clicks: number;
  clickRate: number;
  avgMouseX: number;
  avgMouseY: number;
}

interface UserPathStep {
  fromPage: string;
  toPage: string;
  count: number;
  percentage: number;
}

interface UserBehaviorDashboard {
  periodStart: string;
  periodEnd: string;
  overview: UserBehaviorOverview;
  topPages: PagePerformanceMetric[];
  commonUserPaths: UserPathStep[];
  deviceBreakdown: DeviceMetric[];
  geographicBreakdown: GeographicMetric[];
  hotspots: InteractionHotspot[];
}

interface RealTimeUserBehavior {
  activeUsers: number;
  activeSessions: number;
  livePageViews: LivePageView[];
  recentActions: RecentUserAction[];
  currentConversionRate: number;
  trendingPage: string;
}

interface LivePageView {
  pageUrl: string;
  pageTitle: string;
  activeUsers: number;
  lastActivity: string;
}

interface RecentUserAction {
  actionType: string;
  pageUrl: string;
  description: string;
  timestamp: string;
  userType: string;
}

interface UserBehaviorEventRequest {
  userId?: string;
  sessionId: string;
  eventType: string;
  pageUrl: string;
  pageTitle?: string;
  elementTarget?: string;
  elementText?: string;
  elementSelector?: string;
  timestamp?: Date;
  timeOnPage?: number;
  scrollDepth?: number;
  mouseX?: number;
  mouseY?: number;
  screenResolution?: string;
  viewportSize?: string;
  deviceType?: string;
  browser?: string;
  operatingSystem?: string;
  referrer?: string;
  properties?: Record<string, any>;
  hasConsent?: boolean;
}

interface UseUserBehaviorReturn {
  dashboardData: UserBehaviorDashboard | null;
  realTimeData: RealTimeUserBehavior | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboard: (timeRange?: string) => Promise<void>;
  fetchRealTime: () => Promise<void>;
  trackEvent: (event: UserBehaviorEventRequest) => Promise<boolean>;
  trackBatchEvents: (events: UserBehaviorEventRequest[]) => Promise<boolean>;
  exportData: (timeRange: string, format?: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useUserBehavior = (): UseUserBehaviorReturn => {
  const [dashboardData, setDashboardData] = useState<UserBehaviorDashboard | null>(null);
  const [realTimeData, setRealTimeData] = useState<RealTimeUserBehavior | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = '/api/UserBehaviorAnalytics';

  // Helper function to get auth headers
  // With httpOnly cookies, auth is handled automatically via credentials: 'include'
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'X-Auth-Mode': 'cookie',
    };
  };

  // Helper function to handle API errors
  const handleApiError = (error: any, context: string) => {
    console.error(`${context}:`, error);
    const message = error instanceof Error ? error.message : `Failed to ${context.toLowerCase()}`;
    setError(message);
    throw error;
  };

  // Fetch dashboard data
  const fetchDashboard = useCallback(async (timeRange: string = '7d') => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/dashboard?timeRange=${timeRange}`, {
        credentials: 'include', // Send cookies for authentication
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      handleApiError(err, 'Fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch real-time data
  const fetchRealTime = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/realtime`, {
        credentials: 'include', // Send cookies for authentication
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch real-time data: ${response.statusText}`);
      }

      const data = await response.json();
      setRealTimeData(data);
    } catch (err) {
      handleApiError(err, 'Fetch real-time data');
    }
  }, []);

  // Track single event
  const trackEvent = useCallback(async (event: UserBehaviorEventRequest): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        credentials: 'include', // Send cookies for authentication
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...event,
          timestamp: event.timestamp || new Date(),
          hasConsent: event.hasConsent ?? true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to track event: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success;
    } catch (err) {
      handleApiError(err, 'Track event');
      return false;
    }
  }, []);

  // Track batch events
  const trackBatchEvents = useCallback(async (events: UserBehaviorEventRequest[]): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/events/batch`, {
        method: 'POST',
        credentials: 'include', // Send cookies for authentication
        headers: getAuthHeaders(),
        body: JSON.stringify(
          events.map(event => ({
            ...event,
            timestamp: event.timestamp || new Date(),
            hasConsent: event.hasConsent ?? true,
          }))
        ),
      });

      if (!response.ok) {
        throw new Error(`Failed to track batch events: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success;
    } catch (err) {
      handleApiError(err, 'Track batch events');
      return false;
    }
  }, []);

  // Export data with proper DOM cleanup
  const exportData = useCallback(async (timeRange: string, format: string = 'excel') => {
    let url: string | null = null;
    let anchorElement: HTMLAnchorElement | null = null;

    try {
      const response = await fetch(`${API_BASE}/export?timeRange=${timeRange}&format=${format}`, {
        method: 'POST',
        credentials: 'include', // Send cookies for authentication
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to export data: ${response.statusText}`);
      }

      const blob = await response.blob();
      url = window.URL.createObjectURL(blob);
      anchorElement = document.createElement('a');
      anchorElement.href = url;
      anchorElement.download = `user-behavior-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(anchorElement);
      anchorElement.click();
    } catch (err) {
      handleApiError(err, 'Export data');
    } finally {
      // Guaranteed cleanup of DOM elements and URL objects to prevent memory leaks
      if (url) {
        window.URL.revokeObjectURL(url);
      }
      if (anchorElement && anchorElement.parentNode) {
        document.body.removeChild(anchorElement);
      }
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      await Promise.all([fetchDashboard(), fetchRealTime()]);
    } catch (_err) {
      // Error already handled in individual functions
    }
  }, [fetchDashboard, fetchRealTime]);

  return {
    dashboardData,
    realTimeData,
    isLoading,
    error,
    fetchDashboard,
    fetchRealTime,
    trackEvent,
    trackBatchEvents,
    exportData,
    refreshData,
  };
};

// User behavior tracking utility functions
export const userBehaviorUtils = {
  // Generate session ID
  generateSessionId: (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Get device type
  getDeviceType: (): string => {
    if (typeof navigator === 'undefined') return 'unknown';
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  },

  // Get screen resolution
  getScreenResolution: (): string => {
    if (typeof screen === 'undefined') return 'unknown';
    return `${screen.width}x${screen.height}`;
  },

  // Get viewport size
  getViewportSize: (): string => {
    if (typeof window === 'undefined') return 'unknown';
    return `${window.innerWidth}x${window.innerHeight}`;
  },

  // Get browser information
  getBrowserInfo: (): string => {
    if (typeof navigator === 'undefined') return 'Unknown';
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';

    if (userAgent.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (userAgent.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (userAgent.indexOf('Safari') > -1) browser = 'Safari';
    else if (userAgent.indexOf('Edge') > -1) browser = 'Edge';
    else if (userAgent.indexOf('Opera') > -1) browser = 'Opera';

    return browser;
  },

  // Get operating system
  getOperatingSystem: (): string => {
    const userAgent = navigator.userAgent;
    let os = 'Unknown';

    if (userAgent.indexOf('Windows') > -1) os = 'Windows';
    else if (userAgent.indexOf('Mac') > -1) os = 'macOS';
    else if (userAgent.indexOf('Linux') > -1) os = 'Linux';
    else if (userAgent.indexOf('Android') > -1) os = 'Android';
    else if (userAgent.indexOf('iOS') > -1) os = 'iOS';

    return os;
  },

  // Create page view event
  createPageViewEvent: (pageUrl: string, pageTitle?: string, userId?: string): UserBehaviorEventRequest => ({
    userId,
    sessionId: sessionStorage.getItem('user_session_id') || userBehaviorUtils.generateSessionId(),
    eventType: 'page_view',
    pageUrl,
    pageTitle,
    timestamp: new Date(),
    screenResolution: userBehaviorUtils.getScreenResolution(),
    viewportSize: userBehaviorUtils.getViewportSize(),
    deviceType: userBehaviorUtils.getDeviceType(),
    browser: userBehaviorUtils.getBrowserInfo(),
    operatingSystem: userBehaviorUtils.getOperatingSystem(),
    referrer: document.referrer,
    hasConsent: true,
  }),

  // Create click event
  createClickEvent: (
    pageUrl: string,
    elementTarget: string,
    elementText?: string,
    elementSelector?: string,
    mouseX?: number,
    mouseY?: number,
    userId?: string
  ): UserBehaviorEventRequest => ({
    userId,
    sessionId: sessionStorage.getItem('user_session_id') || userBehaviorUtils.generateSessionId(),
    eventType: 'click',
    pageUrl,
    elementTarget,
    elementText,
    elementSelector,
    mouseX,
    mouseY,
    timestamp: new Date(),
    screenResolution: userBehaviorUtils.getScreenResolution(),
    viewportSize: userBehaviorUtils.getViewportSize(),
    deviceType: userBehaviorUtils.getDeviceType(),
    hasConsent: true,
  }),

  // Calculate scroll depth
  getScrollDepth: (): number => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset;
    const scrollDepth = (scrollTop + windowHeight) / documentHeight;
    return Math.round(scrollDepth * 100);
  },
};

export default useUserBehavior;
