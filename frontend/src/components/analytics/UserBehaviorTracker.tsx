'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUserBehavior, userBehaviorUtils } from '@/hooks/useUserBehavior';

interface UserBehaviorEvent {
  userId?: string;
  sessionId: string;
  eventType: string;
  pageUrl: string;
  pageTitle?: string;
  timeOnPage?: number;
  scrollDepth?: number;
  timestamp: Date;
  hasConsent: boolean;
  elementTarget?: string;
  elementText?: string;
  elementSelector?: string;
  mouseX?: number;
  mouseY?: number;
  viewportSize?: string;
}

interface UserBehaviorTrackerProps {
  userId?: string;
  trackPageViews?: boolean;
  trackClicks?: boolean;
  trackScrolling?: boolean;
  trackTimeOnPage?: boolean;
  respectConsent?: boolean;
  batchSize?: number;
  flushInterval?: number;
}

const UserBehaviorTracker: React.FC<UserBehaviorTrackerProps> = ({
  userId,
  trackPageViews = true,
  trackClicks = true,
  trackScrolling = true,
  trackTimeOnPage = true,
  respectConsent = true,
  batchSize = 10,
  flushInterval = 30000, // 30 seconds
}) => {
  const pathname = usePathname();
  const { trackBatchEvents } = useUserBehavior();
  const eventQueue = useRef<UserBehaviorEvent[]>([]);
  const sessionId = useRef<string>('');
  const pageStartTime = useRef<number>(0);
  const lastScrollDepth = useRef<number>(0);
  const flushTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize session ID
  useEffect(() => {
    let existingSessionId = sessionStorage.getItem('user_session_id');
    if (!existingSessionId) {
      existingSessionId = userBehaviorUtils.generateSessionId();
      sessionStorage.setItem('user_session_id', existingSessionId);
    }
    sessionId.current = existingSessionId;
  }, []);

  // Queue and flush events
  const queueEvent = (event: UserBehaviorEvent) => {
    if (!respectConsent || getConsentStatus()) {
      eventQueue.current.push(event);

      if (eventQueue.current.length >= batchSize) {
        flushEvents();
      }
    }
  };

  const flushEvents = async () => {
    if (eventQueue.current.length === 0) return;

    const eventsToSend = [...eventQueue.current];
    eventQueue.current = [];

    try {
      await trackBatchEvents(eventsToSend);
    } catch (error) {
      console.error('Failed to track behavior events:', error);
      // Re-queue events on failure (with limit to prevent infinite growth)
      if (eventQueue.current.length < batchSize * 2) {
        eventQueue.current.unshift(...eventsToSend);
      }
    }
  };

  // Check consent status (you can customize this based on your consent mechanism)
  const getConsentStatus = (): boolean => {
    if (!respectConsent) return true;
    const consent = localStorage.getItem('user_consent');
    return consent === 'accepted' || consent === 'true';
  };

  // Track page view
  useEffect(() => {
    if (!trackPageViews) return;

    pageStartTime.current = Date.now();
    lastScrollDepth.current = 0;

    const pageViewEvent = userBehaviorUtils.createPageViewEvent(pathname, document.title, userId);

    queueEvent(pageViewEvent as UserBehaviorEvent);

    // Track page exit when component unmounts or pathname changes
    return () => {
      if (trackTimeOnPage && pageStartTime.current) {
        const timeOnPage = Date.now() - pageStartTime.current;

        queueEvent({
          userId,
          sessionId: sessionId.current,
          eventType: 'page_exit',
          pageUrl: pathname,
          pageTitle: document.title,
          timeOnPage,
          scrollDepth: lastScrollDepth.current,
          timestamp: new Date(),
          hasConsent: getConsentStatus(),
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, userId, trackPageViews, trackTimeOnPage]);

  // Track clicks
  useEffect(() => {
    if (!trackClicks) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const elementTarget = target.tagName.toLowerCase();
      const elementText = target.textContent?.slice(0, 100) || '';
      const elementSelector = generateSelector(target);

      const clickEvent = userBehaviorUtils.createClickEvent(
        pathname,
        elementTarget,
        elementText,
        elementSelector,
        event.clientX,
        event.clientY,
        userId
      );

      queueEvent(clickEvent as UserBehaviorEvent);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, userId, trackClicks]);

  // Track scrolling
  useEffect(() => {
    if (!trackScrolling) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollDepth = userBehaviorUtils.getScrollDepth();

        // Only track significant scroll changes (at least 10% difference)
        if (Math.abs(scrollDepth - lastScrollDepth.current) >= 10) {
          lastScrollDepth.current = scrollDepth;

          queueEvent({
            userId,
            sessionId: sessionId.current,
            eventType: 'scroll',
            pageUrl: pathname,
            scrollDepth,
            timestamp: new Date(),
            viewportSize: userBehaviorUtils.getViewportSize(),
            hasConsent: getConsentStatus(),
          });
        }
      }, 500); // Debounce scroll events
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, userId, trackScrolling]);

  // Set up periodic flush
  useEffect(() => {
    flushTimer.current = setInterval(flushEvents, flushInterval);
    return () => {
      if (flushTimer.current) {
        clearInterval(flushTimer.current);
      }
      flushEvents(); // Final flush on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flushInterval]);

  // Generate CSS selector for an element
  const generateSelector = (element: HTMLElement): string => {
    if (element.id) {
      return `#${element.id}`;
    }

    const path = [];
    let current = element;

    while (current && current.tagName !== 'BODY') {
      let selector = current.tagName.toLowerCase();

      if (current.className) {
        const classes = current.className.split(' ').filter(cls => cls.length > 0);
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).join('.');
        }
      }

      path.unshift(selector);
      current = current.parentElement as HTMLElement;

      if (path.length >= 4) break; // Limit selector depth
    }

    return path.join(' > ');
  };

  // This component doesn't render anything
  return null;
};

export default UserBehaviorTracker;
