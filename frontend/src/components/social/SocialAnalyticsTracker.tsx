'use client';

import React, { useContext, createContext, useCallback, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

// Analytics event types
export interface SocialAnalyticsEvent {
  eventType:
    | 'social_login'
    | 'friend_request'
    | 'content_share'
    | 'recommendation_click'
    | 'feed_interaction'
    | 'privacy_change'
    | 'onboarding_step'
    | 'social_search';
  platform?: string;
  contentId?: string;
  contentType?: 'movie' | 'show' | 'episode' | 'person';
  userId?: string;
  sessionId: string;
  timestamp: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  conversionGoal?: 'signup' | 'subscription' | 'content_view' | 'friend_connect';
}

// Analytics context
interface SocialAnalyticsContextType {
  trackEvent: (event: Omit<SocialAnalyticsEvent, 'sessionId' | 'timestamp'>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackConversion: (goal: string, value?: number, metadata?: Record<string, any>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackPageView: (page: string, metadata?: Record<string, any>) => void;
  startSession: () => string;
  endSession: (sessionId?: string) => void;
  getSessionId: () => string;
}

const SocialAnalyticsContext = createContext<SocialAnalyticsContextType | undefined>(undefined);

interface SocialAnalyticsProviderProps {
  children: React.ReactNode;
  apiEndpoint?: string;
  sessionTimeoutMs?: number;
  enableDebugLogging?: boolean;
}

export function SocialAnalyticsProvider({
  children,
  apiEndpoint = '/api/analytics',
  sessionTimeoutMs = 30 * 60 * 1000, // 30 minutes
  enableDebugLogging = process.env.NODE_ENV === 'development',
}: SocialAnalyticsProviderProps) {
  const [sessionId, setSessionId] = useState<string>('');
  const [eventQueue, setEventQueue] = useState<SocialAnalyticsEvent[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Generate session ID
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Initialize session
  const startSession = useCallback(() => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);

    // Store session info
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        'socialAnalyticsSession',
        JSON.stringify({
          sessionId: newSessionId,
          startTime: Date.now(),
        })
      );
    }

    if (enableDebugLogging) {
      logger.info('[SocialAnalyticsProvider] Started social analytics session', { sessionId: newSessionId });
    }

    return newSessionId;
  }, [generateSessionId, enableDebugLogging]);

  // End session
  const endSession = useCallback(
    (targetSessionId?: string) => {
      const currentSessionId = targetSessionId || sessionId;

      if (currentSessionId) {
        // Calculate session duration safely
        let sessionDuration = 0;
        try {
          const sessionData = JSON.parse(localStorage.getItem('socialAnalyticsSession') || '{}');
          sessionDuration = Date.now() - (sessionData.startTime || Date.now());
        } catch {
          // Corrupted session data - use 0 duration
          sessionDuration = 0;
        }

        // Track session end event
        trackEvent({
          eventType: 'social_search', // Using existing type as placeholder for session_end
          metadata: {
            action: 'session_end',
            sessionDuration,
          },
        });
      }

      // Clear session
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('socialAnalyticsSession');
      }

      setSessionId('');

      if (enableDebugLogging) {
        logger.info('[SocialAnalyticsProvider] Ended social analytics session', { sessionId: currentSessionId });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, enableDebugLogging]
  );

  // Get current session ID
  const getSessionId = useCallback(() => {
    if (sessionId) return sessionId;

    // Try to restore from localStorage
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('socialAnalyticsSession');
      if (stored) {
        try {
          const { sessionId: storedSessionId, startTime } = JSON.parse(stored);
          // Check if session hasn't expired
          if (Date.now() - startTime < sessionTimeoutMs) {
            setSessionId(storedSessionId);
            return storedSessionId;
          } else {
            // Session expired, start new one
            localStorage.removeItem('socialAnalyticsSession');
          }
        } catch (_error) {
          localStorage.removeItem('socialAnalyticsSession');
        }
      }
    }

    // Start new session if none exists
    return startSession();
  }, [sessionId, sessionTimeoutMs, startSession]);

  // Send events to server
  const sendEvents = useCallback(
    async (events: SocialAnalyticsEvent[]) => {
      if (!isOnline || events.length === 0) return;

      try {
        // SECURITY: Use credentials: 'include' for cookie-based auth (no localStorage)
        const response = await fetch(`${apiEndpoint}/social-events`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events }),
        });

        if (response.ok) {
          if (enableDebugLogging) {
            logger.info('[SocialAnalyticsProvider] Sent social analytics events', { count: events.length });
          }
          // Clear sent events from queue
          setEventQueue(prev => prev.filter(event => !events.includes(event)));
        } else {
          throw new Error(`Failed to send events: ${response.status}`);
        }
      } catch (error) {
        logger.error('[SocialAnalyticsProvider] Failed to send social analytics events', { error: error instanceof Error ? error.message : String(error) });
        // Keep events in queue for retry
      }
    },
    [apiEndpoint, isOnline, enableDebugLogging]
  );

  // Track event
  const trackEvent = useCallback(
    (eventData: Omit<SocialAnalyticsEvent, 'sessionId' | 'timestamp'>) => {
      const event: SocialAnalyticsEvent = {
        ...eventData,
        sessionId: getSessionId(),
        timestamp: Date.now(),
      };

      if (enableDebugLogging) {
        logger.info('[SocialAnalyticsProvider] Tracking social event', { eventType: event.eventType });
      }

      // Add to queue
      setEventQueue(prev => [...prev, event]);

      // Send immediately if online, otherwise queue for later
      if (isOnline) {
        setTimeout(() => sendEvents([event]), 100);
      }
    },
    [getSessionId, enableDebugLogging, sendEvents, isOnline]
  );

  // Track conversion
  const trackConversion = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (goal: string, value?: number, metadata?: Record<string, any>) => {
      trackEvent({
        eventType: 'social_search', // Using existing type as placeholder for conversion
        metadata: {
          action: 'conversion',
          conversionGoal: goal,
          conversionValue: value,
          ...metadata,
        },
      });
    },
    [trackEvent]
  );

  // Track page view
  const trackPageView = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (page: string, metadata?: Record<string, any>) => {
      trackEvent({
        eventType: 'social_search', // Using existing type as placeholder for page_view
        metadata: {
          action: 'page_view',
          page,
          url: typeof window !== 'undefined' ? window.location.href : '',
          referrer: typeof document !== 'undefined' ? document.referrer : '',
          ...metadata,
        },
      });
    },
    [trackEvent]
  );

  // Handle online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      // Send queued events when back online
      if (eventQueue.length > 0) {
        sendEvents(eventQueue);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [eventQueue, sendEvents]);

  // Batch send events periodically
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      if (eventQueue.length > 0) {
        sendEvents(eventQueue.slice(0, 10)); // Send in batches of 10
      }
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [eventQueue, sendEvents, isOnline]);

  // Initialize session on mount
  useEffect(() => {
    getSessionId();
  }, [getSessionId]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        endSession(sessionId);
      }
    };
  }, [sessionId, endSession]);

  const contextValue: SocialAnalyticsContextType = {
    trackEvent,
    trackConversion,
    trackPageView,
    startSession,
    endSession,
    getSessionId,
  };

  return <SocialAnalyticsContext.Provider value={contextValue}>{children}</SocialAnalyticsContext.Provider>;
}

// Hook to use social analytics
export function useSocialAnalytics() {
  const context = useContext(SocialAnalyticsContext);
  if (context === undefined) {
    throw new Error('useSocialAnalytics must be used within a SocialAnalyticsProvider');
  }
  return context;
}

// HOC for automatic event tracking
interface WithSocialAnalyticsProps {
  trackingProps?: {
    eventType: SocialAnalyticsEvent['eventType'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: Record<string, any>;
  };
}

export function withSocialAnalytics<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  defaultTrackingProps?: WithSocialAnalyticsProps['trackingProps']
) {
  const WithSocialAnalyticsComponent = (props: P & WithSocialAnalyticsProps) => {
    const { trackEvent } = useSocialAnalytics();
    const { trackingProps, ...componentProps } = props;

    useEffect(() => {
      const trackingData = trackingProps || defaultTrackingProps;
      if (trackingData) {
        trackEvent({
          eventType: trackingData.eventType,
          metadata: {
            componentName: WrappedComponent.displayName || WrappedComponent.name,
            ...trackingData.metadata,
          },
        });
      }
    }, [trackEvent, trackingProps]);

    return <WrappedComponent {...(componentProps as P)} />;
  };

  WithSocialAnalyticsComponent.displayName = `withSocialAnalytics(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithSocialAnalyticsComponent;
}

// Predefined tracking hooks
export function useTrackSocialLogin() {
  const { trackEvent } = useSocialAnalytics();

  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (platform: string, success: boolean, metadata?: Record<string, any>) => {
      trackEvent({
        eventType: 'social_login',
        platform,
        metadata: {
          success,
          loginMethod: 'oauth',
          ...metadata,
        },
      });
    },
    [trackEvent]
  );
}

export function useTrackFriendRequest() {
  const { trackEvent } = useSocialAnalytics();

  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (action: 'send' | 'accept' | 'decline', userId: string, metadata?: Record<string, any>) => {
      trackEvent({
        eventType: 'friend_request',
        userId,
        metadata: {
          action,
          ...metadata,
        },
      });
    },
    [trackEvent]
  );
}

export function useTrackContentShare() {
  const { trackEvent } = useSocialAnalytics();

  return useCallback(
    (
      platform: string,
      contentId: string,
      contentType: 'movie' | 'show' | 'episode' | 'person',
      success: boolean,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata?: Record<string, any>
    ) => {
      trackEvent({
        eventType: 'content_share',
        platform,
        contentId,
        contentType,
        metadata: {
          success,
          shareMethod: 'social_button',
          ...metadata,
        },
      });
    },
    [trackEvent]
  );
}

export function useTrackRecommendationClick() {
  const { trackEvent } = useSocialAnalytics();

  return useCallback(
    (
      contentId: string,
      contentType: 'movie' | 'show' | 'episode' | 'person',
      recommendationSource: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata?: Record<string, any>
    ) => {
      trackEvent({
        eventType: 'recommendation_click',
        contentId,
        contentType,
        metadata: {
          recommendationSource,
          ...metadata,
        },
      });
    },
    [trackEvent]
  );
}

export function useTrackFeedInteraction() {
  const { trackEvent } = useSocialAnalytics();

  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (interactionType: 'like' | 'comment' | 'share' | 'view', contentId?: string, metadata?: Record<string, any>) => {
      trackEvent({
        eventType: 'feed_interaction',
        contentId,
        metadata: {
          interactionType,
          ...metadata,
        },
      });
    },
    [trackEvent]
  );
}

export default SocialAnalyticsProvider;
