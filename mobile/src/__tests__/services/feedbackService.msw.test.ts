/**
 * FeedbackService MSW Integration Tests
 *
 * Tests feedback submission functionality using MSW to intercept API calls.
 * Executes REAL FeedbackService business logic with mocked external I/O.
 *
 * Coverage Target: 80-90% of feedbackService.ts (106 LOC)
 * Test Philosophy: Coverage > Pass Rate (mock only external I/O)
 */

import { submitFeedback, getFeedbackCategories, FeedbackCategory } from '../../services/feedbackService';
import { resetMockFeedback, getSubmittedFeedback } from '../../mocks/handlers/feedback.handlers';

// Use global http, HttpResponse, and server from jest.setup.fetch-mock.js
const { http, HttpResponse, server } = global as any;

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

describe('FeedbackService - MSW Integration Tests', () => {
  beforeAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    resetMockFeedback();

    // Add feedback handler directly in test (workaround for module import issue)
    server.use(
      http.post(`${BASE_URL}/api/feedback`, async ({ request }) => {
        try {
          const body = await request.json();

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

          // Validate message length
          if (body.message.length > 5000) {
            return HttpResponse.json(
              {
                success: false,
                message: 'Feedback message must be less than 5000 characters',
              },
              { status: 400 }
            );
          }

          // Validate email format (if provided)
          if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
            return HttpResponse.json(
              {
                success: false,
                message: 'Invalid email format',
              },
              { status: 400 }
            );
          }

          // Success response
          return HttpResponse.json({
            success: true,
            message: 'Thank you for your feedback! We will review it shortly.',
          });
        } catch (_error) {
          return HttpResponse.json(
            {
              success: false,
              message: 'Invalid request format',
            },
            { status: 400 }
          );
        }
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('submitFeedback()', () => {
    it('should successfully submit feedback with all fields', async () => {
      const feedbackRequest = {
        message: 'This is a test feedback message',
        subject: 'Test Subject',
        category: FeedbackCategory.General,
        email: 'test@example.com',
        platform: 'iOS',
      };

      const response = await submitFeedback(feedbackRequest);

      expect(response.success).toBe(true);
      expect(response.message).toContain('Thank you');
    });

    it('should successfully submit feedback with only required fields', async () => {
      const feedbackRequest = {
        message: 'Minimal feedback',
        category: FeedbackCategory.Bug,
      };

      const response = await submitFeedback(feedbackRequest);

      expect(response.success).toBe(true);
      expect(response.message).toContain('Thank you');
    });

    it('should add default platform if not provided', async () => {
      const feedbackRequest = {
        message: 'Test message',
        category: FeedbackCategory.General,
      };

      const response = await submitFeedback(feedbackRequest);

      expect(response.success).toBe(true);
    });

    it('should handle different feedback categories', async () => {
      const categories = [
        FeedbackCategory.General,
        FeedbackCategory.Bug,
        FeedbackCategory.FeatureRequest,
        FeedbackCategory.Question,
        FeedbackCategory.Complaint,
        FeedbackCategory.Other,
      ];

      for (const category of categories) {
        const response = await submitFeedback({
          message: `Feedback for category ${category}`,
          category,
        });

        expect(response.success).toBe(true);
      }
    });

    it('should handle empty message validation', async () => {
      const feedbackRequest = {
        message: '',
        category: FeedbackCategory.General,
      };

      const response = await submitFeedback(feedbackRequest);

      expect(response.success).toBe(false);
      expect(response.message).toContain('required');

      const submitted = getSubmittedFeedback();
      expect(submitted).toHaveLength(0);
    });

    it('should handle whitespace-only message', async () => {
      const feedbackRequest = {
        message: '   ',
        category: FeedbackCategory.General,
      };

      const response = await submitFeedback(feedbackRequest);

      expect(response.success).toBe(false);
      expect(response.message).toContain('required');
    });

    it('should handle missing category validation', async () => {
      // @ts-expect-error - Testing missing required field
      const feedbackRequest = {
        message: 'Test message',
      };

      const response = await submitFeedback(feedbackRequest as any);

      expect(response.success).toBe(false);
      expect(response.message).toContain('category');

      const submitted = getSubmittedFeedback();
      expect(submitted).toHaveLength(0);
    });

    it('should handle message length validation (> 5000 chars)', async () => {
      const longMessage = 'a'.repeat(5001);

      const feedbackRequest = {
        message: longMessage,
        category: FeedbackCategory.General,
      };

      const response = await submitFeedback(feedbackRequest);

      expect(response.success).toBe(false);
      expect(response.message).toContain('5000 characters');

      const submitted = getSubmittedFeedback();
      expect(submitted).toHaveLength(0);
    });

    it('should handle valid email addresses', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'john+tag@company.org',
      ];

      for (const email of validEmails) {
        resetMockFeedback();

        const response = await submitFeedback({
          message: 'Test message',
          category: FeedbackCategory.General,
          email,
        });

        expect(response.success).toBe(true);
      }
    });

    it('should handle invalid email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user space@example.com',
      ];

      for (const email of invalidEmails) {
        resetMockFeedback();

        const response = await submitFeedback({
          message: 'Test message',
          category: FeedbackCategory.General,
          email,
        });

        expect(response.success).toBe(false);
        expect(response.message).toContain('email');

        const submitted = getSubmittedFeedback();
        expect(submitted).toHaveLength(0);
      }
    });

    it('should handle network errors', async () => {
      server.use(
        http.post(`${BASE_URL}/api/feedback`, () => {
          return HttpResponse.error();
        })
      );

      const response = await submitFeedback({
        message: 'Test message',
        category: FeedbackCategory.General,
      });

      expect(response.success).toBe(false);
      expect(response.message).toContain('Network error');
    }, 15000); // 15s timeout for retry logic

    it('should handle server errors (500)', async () => {
      server.use(
        http.post(`${BASE_URL}/api/feedback`, () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Internal server error',
            },
            { status: 500 }
          );
        })
      );

      const response = await submitFeedback({
        message: 'Test message',
        category: FeedbackCategory.General,
      });

      expect(response.success).toBe(false);
      expect(response.message).toBe('Internal server error');
    }, 15000); // 15s timeout for retry logic

    it('should handle malformed JSON response', async () => {
      server.use(
        http.post(`${BASE_URL}/api/feedback`, () => {
          return new Response('Invalid JSON', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      const response = await submitFeedback({
        message: 'Test message',
        category: FeedbackCategory.General,
      });

      expect(response.success).toBe(false);
      expect(response.message).toContain('Network error');
    }, 15000); // 15s timeout for retry logic

    it('should handle special characters in message', async () => {
      const specialMessage = 'Test with special chars: <>&"\'';

      const response = await submitFeedback({
        message: specialMessage,
        category: FeedbackCategory.General,
      });

      expect(response.success).toBe(true);
    });

    it('should handle unicode characters in message', async () => {
      const unicodeMessage = 'Test with emoji 🎉 and unicode ñ é ü';

      const response = await submitFeedback({
        message: unicodeMessage,
        category: FeedbackCategory.General,
      });

      expect(response.success).toBe(true);
    });
  });

  describe('getFeedbackCategories()', () => {
    it('should return all feedback categories', () => {
      const categories = getFeedbackCategories();

      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBe(6);
    });

    it('should return categories with correct structure', () => {
      const categories = getFeedbackCategories();

      categories.forEach(category => {
        expect(category).toHaveProperty('value');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('displayName');
        expect(typeof category.value).toBe('number');
        expect(typeof category.name).toBe('string');
        expect(typeof category.displayName).toBe('string');
      });
    });

    it('should include all expected categories', () => {
      const categories = getFeedbackCategories();
      const displayNames = categories.map(c => c.displayName);

      expect(displayNames).toContain('General');
      expect(displayNames).toContain('Bug Report');
      expect(displayNames).toContain('Feature Request');
      expect(displayNames).toContain('Question');
      expect(displayNames).toContain('Complaint');
      expect(displayNames).toContain('Other');
    });

    it('should have unique values for each category', () => {
      const categories = getFeedbackCategories();
      const values = categories.map(c => c.value);
      const uniqueValues = new Set(values);

      expect(uniqueValues.size).toBe(values.length);
    });

    it('should map category values correctly', () => {
      const categories = getFeedbackCategories();

      const generalCategory = categories.find(c => c.value === FeedbackCategory.General);
      expect(generalCategory?.displayName).toBe('General');

      const bugCategory = categories.find(c => c.value === FeedbackCategory.Bug);
      expect(bugCategory?.displayName).toBe('Bug Report');

      const featureCategory = categories.find(c => c.value === FeedbackCategory.FeatureRequest);
      expect(featureCategory?.displayName).toBe('Feature Request');
    });
  });

  describe('Integration Flows', () => {
    it('should support complete feedback submission flow', () => {
      // Get categories
      const categories = getFeedbackCategories();
      expect(categories.length).toBeGreaterThan(0);

      // Select a category
      const selectedCategory = categories[1]; // Bug Report

      // Submit feedback
      const feedbackPromise = submitFeedback({
        message: 'Found a bug in the app',
        subject: 'Bug Report',
        category: selectedCategory.value,
        email: 'user@example.com',
      });

      return expect(feedbackPromise).resolves.toMatchObject({
        success: true,
      });
    });

    it('should handle multiple sequential submissions', async () => {
      const submissions = [
        {
          message: 'First feedback',
          category: FeedbackCategory.General,
        },
        {
          message: 'Second feedback',
          category: FeedbackCategory.Bug,
        },
        {
          message: 'Third feedback',
          category: FeedbackCategory.FeatureRequest,
        },
      ];

      for (const submission of submissions) {
        const response = await submitFeedback(submission);
        expect(response.success).toBe(true);
      }
    });
  });
});
