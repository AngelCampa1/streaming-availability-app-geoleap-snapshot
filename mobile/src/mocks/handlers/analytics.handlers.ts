/**
 * MSW Handlers for Analytics Services
 *
 * Mocks:
 * - POST /userbehavioranalytics/events/batch - Batch upload user behavior events
 * - POST /viewing/session - Track viewing sessions
 */

import { http, HttpResponse } from 'msw';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

interface ViewingSessionRequest {
  sessionId: string;
  contentId?: string;
  duration?: number;
  timestamp?: string;
}

// Mock storage for analytics events (for test assertions)
let storedEvents: any[] = [];
let storedSessions: any[] = [];

/**
 * Reset mock storage (for test cleanup)
 */
export function resetMockAnalytics() {
  storedEvents = [];
  storedSessions = [];
}

/**
 * Get stored events (for test assertions)
 */
export function getStoredEvents() {
  return [...storedEvents];
}

/**
 * Get stored sessions (for test assertions)
 */
export function getStoredSessions() {
  return [...storedSessions];
}

export const analyticsHandlers = [
  // POST /userbehavioranalytics/events/batch - Batch upload events
  http.post(`${BASE_URL}/userbehavioranalytics/events/batch`, async ({ request }) => {
    try {
      const events = await request.json();

      // Validate request body
      if (!Array.isArray(events)) {
        return HttpResponse.json(
          {
            success: false,
            message: 'Events must be an array',
          },
          { status: 400 }
        );
      }

      // Validate each event has required fields
      for (const event of events) {
        if (!event.eventType || !event.category || !event.sessionId) {
          return HttpResponse.json(
            {
              success: false,
              message: 'Missing required event fields (eventType, category, sessionId)',
            },
            { status: 400 }
          );
        }
      }

      // Store events for test assertions
      storedEvents.push(...events);

      // Success response
      return HttpResponse.json(
        {
          success: true,
          eventsReceived: events.length,
          message: `Successfully processed ${events.length} events`,
        },
        { status: 200 }
      );
    } catch (_error) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Invalid request format',
        },
        { status: 400 }
      );
    }
  }),

  // POST /viewing/session - Track viewing session
  http.post(`${BASE_URL}/viewing/session`, async ({ request }) => {
    try {
      const session = await request.json() as ViewingSessionRequest;

      // Validate required fields
      if (!session.sessionId) {
        return HttpResponse.json(
          {
            success: false,
            message: 'Missing required field: sessionId',
          },
          { status: 400 }
        );
      }

      // Store session for test assertions
      storedSessions.push(session);

      // Success response
      return HttpResponse.json(
        {
          success: true,
          sessionId: session.sessionId,
          message: 'Viewing session tracked successfully',
        },
        { status: 200 }
      );
    } catch (_error) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Invalid request format',
        },
        { status: 400 }
      );
    }
  }),
];
