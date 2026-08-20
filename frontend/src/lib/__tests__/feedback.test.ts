/**
 * Comprehensive tests for feedback.ts
 *
 * Coverage Target: 90%+
 * Strategy: Use MSW v2 for network-level API mocking, test real functions
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  FeedbackCategory,
  FeedbackCategoryLabels,
  submitFeedback,
  getFeedbackCategories,
  type FeedbackRequest,
  type FeedbackCategoryDto,
} from '../feedback';
import { API_BASE_URL } from '@/config/api';

// Setup MSW server for API mocking
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('FeedbackCategory enum', () => {
  it('defines all feedback categories with correct values', () => {
    expect(FeedbackCategory.General).toBe(0);
    expect(FeedbackCategory.Bug).toBe(1);
    expect(FeedbackCategory.FeatureRequest).toBe(2);
    expect(FeedbackCategory.Question).toBe(3);
    expect(FeedbackCategory.Complaint).toBe(4);
    expect(FeedbackCategory.Other).toBe(5);
  });

  it('has unique values for each category', () => {
    const values = Object.values(FeedbackCategory).filter((v) => typeof v === 'number');
    const uniqueValues = new Set(values);

    expect(uniqueValues.size).toBe(values.length);
  });
});

describe('FeedbackCategoryLabels', () => {
  it('defines display labels for all categories', () => {
    expect(FeedbackCategoryLabels[FeedbackCategory.General]).toBe('General');
    expect(FeedbackCategoryLabels[FeedbackCategory.Bug]).toBe('Bug Report');
    expect(FeedbackCategoryLabels[FeedbackCategory.FeatureRequest]).toBe('Feature Request');
    expect(FeedbackCategoryLabels[FeedbackCategory.Question]).toBe('Question');
    expect(FeedbackCategoryLabels[FeedbackCategory.Complaint]).toBe('Complaint');
    expect(FeedbackCategoryLabels[FeedbackCategory.Other]).toBe('Other');
  });

  it('has labels for all enum values', () => {
    const enumValues = Object.values(FeedbackCategory).filter((v) => typeof v === 'number');
    const labelKeys = Object.keys(FeedbackCategoryLabels).map(Number);

    expect(labelKeys.sort()).toEqual(enumValues.sort());
  });
});

describe('submitFeedback', () => {
  it('submits feedback successfully with all fields', async () => {
    const mockResponse = {
      success: true,
      message: 'Thank you for your feedback!',
    };

    server.use(
      http.post(`${API_BASE_URL}/api/feedback`, async ({ request }) => {
        const body = (await request.json()) as any;
        expect(body).toEqual({
          message: 'The app is great!',
          subject: 'Positive Feedback',
          category: FeedbackCategory.General,
          email: 'user@example.com',
          platform: 'Web',
        });

        return HttpResponse.json(mockResponse);
      })
    );

    const request: FeedbackRequest = {
      message: 'The app is great!',
      subject: 'Positive Feedback',
      category: FeedbackCategory.General,
      email: 'user@example.com',
      platform: 'Web',
    };

    const result = await submitFeedback(request);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Thank you for your feedback!');
  });

  it('submits feedback with minimal required fields', async () => {
    const mockResponse = {
      success: true,
      message: 'Feedback submitted',
    };

    server.use(
      http.post(`${API_BASE_URL}/api/feedback`, async ({ request }) => {
        const body = (await request.json()) as any;
        expect(body).toEqual({
          message: 'Bug found',
          category: FeedbackCategory.Bug,
          platform: 'Web', // Default platform
        });

        return HttpResponse.json(mockResponse);
      })
    );

    const request: FeedbackRequest = {
      message: 'Bug found',
      category: FeedbackCategory.Bug,
    };

    const result = await submitFeedback(request);

    expect(result.success).toBe(true);
  });

  it('defaults platform to "Web" when not provided', async () => {
    let receivedPlatform: string | undefined;

    server.use(
      http.post(`${API_BASE_URL}/api/feedback`, async ({ request }) => {
        const body = (await request.json()) as any;
        receivedPlatform = body.platform;

        return HttpResponse.json({
          success: true,
          message: 'OK',
        });
      })
    );

    const request: FeedbackRequest = {
      message: 'Test message',
      category: FeedbackCategory.Question,
    };

    await submitFeedback(request);

    expect(receivedPlatform).toBe('Web');
  });

  it('uses custom platform when provided', async () => {
    let receivedPlatform: string | undefined;

    server.use(
      http.post(`${API_BASE_URL}/api/feedback`, async ({ request }) => {
        const body = (await request.json()) as any;
        receivedPlatform = body.platform;

        return HttpResponse.json({
          success: true,
          message: 'OK',
        });
      })
    );

    const request: FeedbackRequest = {
      message: 'Mobile feedback',
      category: FeedbackCategory.FeatureRequest,
      platform: 'iOS',
    };

    await submitFeedback(request);

    expect(receivedPlatform).toBe('iOS');
  });

  it('handles API error with custom message', async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/feedback`, () => {
        return HttpResponse.json(
          {
            message: 'Validation failed: Message is required',
          },
          { status: 400 }
        );
      })
    );

    const request: FeedbackRequest = {
      message: '',
      category: FeedbackCategory.Bug,
    };

    const result = await submitFeedback(request);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Validation failed: Message is required');
  });

  it('handles API error with default message', async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/feedback`, () => {
        return HttpResponse.json({}, { status: 500 });
      })
    );

    const request: FeedbackRequest = {
      message: 'Test',
      category: FeedbackCategory.Other,
    };

    const result = await submitFeedback(request);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Failed to submit feedback. Please try again.');
  });

  it('handles network errors gracefully', async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/feedback`, () => {
        return HttpResponse.error();
      })
    );

    const request: FeedbackRequest = {
      message: 'Test feedback',
      category: FeedbackCategory.Complaint,
    };

    await expect(submitFeedback(request)).rejects.toThrow();
  });

  it('sends correct content-type header', async () => {
    let receivedContentType: string | null = null;

    server.use(
      http.post(`${API_BASE_URL}/api/feedback`, async ({ request }) => {
        receivedContentType = request.headers.get('Content-Type');

        return HttpResponse.json({
          success: true,
          message: 'OK',
        });
      })
    );

    const request: FeedbackRequest = {
      message: 'Header test',
      category: FeedbackCategory.General,
    };

    await submitFeedback(request);

    expect(receivedContentType).toBe('application/json');
  });

  it('includes credentials in request', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) =>
      originalFetch(input, init)
    ) as typeof fetch;

    server.use(
      http.post(`${API_BASE_URL}/api/feedback`, () => {
        return HttpResponse.json({
          success: true,
          message: 'OK',
        });
      })
    );

    const request: FeedbackRequest = {
      message: 'Credentials test',
      category: FeedbackCategory.General,
    };

    await submitFeedback(request);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/feedback`,
      expect.objectContaining({
        credentials: 'include',
      })
    );

    global.fetch = originalFetch;
  });
});

describe('getFeedbackCategories', () => {
  it('fetches categories from API successfully', async () => {
    const mockCategories: FeedbackCategoryDto[] = [
      { value: 0, name: 'General', displayName: 'General' },
      { value: 1, name: 'Bug', displayName: 'Bug Report' },
      { value: 2, name: 'FeatureRequest', displayName: 'Feature Request' },
    ];

    server.use(
      http.get(`${API_BASE_URL}/api/feedback/categories`, () => {
        return HttpResponse.json(mockCategories);
      })
    );

    const result = await getFeedbackCategories();

    expect(result).toEqual(mockCategories);
    expect(result).toHaveLength(3);
  });

  it('returns default categories when API fails', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/feedback/categories`, () => {
        return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
      })
    );

    const result = await getFeedbackCategories();

    // Should return all 6 default categories from FeedbackCategoryLabels
    expect(result).toHaveLength(6);
    expect(result[0]).toEqual({
      value: FeedbackCategory.General,
      name: 'General',
      displayName: 'General',
    });
    expect(result[1]).toEqual({
      value: FeedbackCategory.Bug,
      name: 'Bug',
      displayName: 'Bug Report',
    });
  });

  it('returns default categories when network fails', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/feedback/categories`, () => {
        return HttpResponse.error();
      })
    );

    const result = await getFeedbackCategories();

    // Should fallback to default categories
    expect(result).toHaveLength(6);
    expect(result.map((c) => c.value)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('default categories match FeedbackCategoryLabels', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/feedback/categories`, () => {
        return HttpResponse.json({}, { status: 404 });
      })
    );

    const result = await getFeedbackCategories();

    result.forEach((category) => {
      expect(FeedbackCategoryLabels[category.value as FeedbackCategory]).toBe(category.displayName);
    });
  });

  it('sends correct content-type header', async () => {
    let receivedContentType: string | null = null;

    server.use(
      http.get(`${API_BASE_URL}/api/feedback/categories`, ({ request }) => {
        receivedContentType = request.headers.get('Content-Type');

        return HttpResponse.json([]);
      })
    );

    await getFeedbackCategories();

    expect(receivedContentType).toBe('application/json');
  });
});

describe('Integration scenarios', () => {
  it('submits bug report with all feedback categories', async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/feedback`, () => {
        return HttpResponse.json({
          success: true,
          message: 'Feedback received',
        });
      })
    );

    const categories = Object.values(FeedbackCategory).filter(
      (v) => typeof v === 'number'
    ) as FeedbackCategory[];

    const results = await Promise.all(
      categories.map((category) =>
        submitFeedback({
          message: `Test for ${FeedbackCategoryLabels[category]}`,
          category,
        })
      )
    );

    results.forEach((result) => {
      expect(result.success).toBe(true);
    });
  });

  it('fetches categories and submits feedback using fetched categories', async () => {
    const mockCategories: FeedbackCategoryDto[] = [
      { value: 1, name: 'Bug', displayName: 'Bug Report' },
      { value: 2, name: 'FeatureRequest', displayName: 'Feature Request' },
    ];

    server.use(
      http.get(`${API_BASE_URL}/api/feedback/categories`, () => {
        return HttpResponse.json(mockCategories);
      }),
      http.post(`${API_BASE_URL}/api/feedback`, () => {
        return HttpResponse.json({
          success: true,
          message: 'OK',
        });
      })
    );

    // Fetch categories first
    const categories = await getFeedbackCategories();
    expect(categories).toHaveLength(2);

    // Use first category to submit feedback
    const result = await submitFeedback({
      message: 'Bug report',
      category: categories[0].value as FeedbackCategory,
    });

    expect(result.success).toBe(true);
  });
});
