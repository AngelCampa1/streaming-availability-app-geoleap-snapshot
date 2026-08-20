/**
 * MSW Handlers for FeedbackService
 *
 * Mocks:
 * - POST /api/feedback - Submit feedback
 */

import { http, HttpResponse } from 'msw';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

interface FeedbackRequest {
  message: string;
  category: number;
  email?: string;
}

// Mock feedback storage for testing
let submittedFeedback: any[] = [];

/**
 * Reset mock feedback storage (for test cleanup)
 */
export function resetMockFeedback() {
  submittedFeedback = [];
}

/**
 * Get submitted feedback (for test assertions)
 */
export function getSubmittedFeedback() {
  return [...submittedFeedback];
}

export const feedbackHandlers = [
  // POST /api/feedback - Submit feedback
  http.post(`${BASE_URL}/api/feedback`, async ({ request }) => {
    console.log('[MSW HANDLER] Feedback handler START');
    try {
      console.log('[MSW HANDLER] Parsing request body...');
      const body = await request.json() as FeedbackRequest;
      console.log('[MSW HANDLER] Body parsed:', JSON.stringify(body));

      // Validate required fields
      if (!body.message || body.message.trim() === '') {
        return HttpResponse.json(
          {
            success: false,
            message: 'Feedback message is required',
          },
          { status: 400 }
        );
      }

      if (body.category === undefined || body.category === null) {
        return HttpResponse.json(
          {
            success: false,
            message: 'Feedback category is required',
          },
          { status: 400 }
        );
      }

      // Simulate validation: message length
      if (body.message.length > 5000) {
        return HttpResponse.json(
          {
            success: false,
            message: 'Feedback message must be less than 5000 characters',
          },
          { status: 400 }
        );
      }

      // Simulate validation: email format (if provided)
      if (body.email && !isValidEmail(body.email)) {
        return HttpResponse.json(
          {
            success: false,
            message: 'Invalid email format',
          },
          { status: 400 }
        );
      }

      // Store feedback for test assertions
      const feedback = {
        id: `feedback-${Date.now()}`,
        ...body,
        createdAt: new Date().toISOString(),
      };
      submittedFeedback.push(feedback);

      // Success response
      console.log('[MSW HANDLER] Returning SUCCESS response');
      return HttpResponse.json({
        success: true,
        message: 'Thank you for your feedback! We will review it shortly.',
      });
    } catch (error) {
      console.error('[MSW HANDLER] CATCH block hit:', error);
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

console.log('[MSW] feedbackHandlers array length:', feedbackHandlers.length);
console.log('[MSW] feedbackHandler[0]:', feedbackHandlers[0] ? 'exists' : 'MISSING');

/**
 * Simple email validation helper
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
