/**
 * FeedbackService Tests
 *
 * Tests feedback submission and category retrieval functionality.
 */

import {
  submitFeedback,
  getFeedbackCategories,
  FeedbackCategory,
  FeedbackCategoryLabels,
  FeedbackRequest,
  FeedbackResponse,
} from '../../services/feedbackService';
import { buildUrl } from '../../config/api';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../config/api', () => ({
  buildUrl: jest.fn((path: string) => `https://api.geoleap.com${path}`),
  apiConfig: {
    baseUrl: 'https://api.geoleap.com',
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('FeedbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FeedbackCategory Enum', () => {
    it('should have correct enum values', () => {
      expect(FeedbackCategory.General).toBe(0);
      expect(FeedbackCategory.Bug).toBe(1);
      expect(FeedbackCategory.FeatureRequest).toBe(2);
      expect(FeedbackCategory.Question).toBe(3);
      expect(FeedbackCategory.Complaint).toBe(4);
      expect(FeedbackCategory.Other).toBe(5);
    });
  });

  describe('FeedbackCategoryLabels', () => {
    it('should have correct labels for all categories', () => {
      expect(FeedbackCategoryLabels[FeedbackCategory.General]).toBe('General');
      expect(FeedbackCategoryLabels[FeedbackCategory.Bug]).toBe('Bug Report');
      expect(FeedbackCategoryLabels[FeedbackCategory.FeatureRequest]).toBe('Feature Request');
      expect(FeedbackCategoryLabels[FeedbackCategory.Question]).toBe('Question');
      expect(FeedbackCategoryLabels[FeedbackCategory.Complaint]).toBe('Complaint');
      expect(FeedbackCategoryLabels[FeedbackCategory.Other]).toBe('Other');
    });
  });

  describe('submitFeedback', () => {
    const mockRequest: FeedbackRequest = {
      message: 'Great app!',
      subject: 'Feedback',
      category: FeedbackCategory.General,
      email: 'user@example.com',
    };

    it('should submit feedback successfully', async () => {
      const mockResponse: FeedbackResponse = {
        success: true,
        message: 'Thank you for your feedback!',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await submitFeedback(mockRequest);

      expect(buildUrl).toHaveBeenCalledWith('/api/feedback');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.geoleap.com/api/feedback',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...mockRequest,
            platform: 'Mobile',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use default platform "Mobile" when not provided', async () => {
      const requestWithoutPlatform: FeedbackRequest = {
        message: 'Test',
        category: FeedbackCategory.Bug,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Success' }),
      });

      await submitFeedback(requestWithoutPlatform);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const bodyData = JSON.parse(fetchCall[1].body);
      expect(bodyData.platform).toBe('Mobile');
    });

    it('should preserve custom platform when provided', async () => {
      const requestWithPlatform: FeedbackRequest = {
        message: 'Test',
        category: FeedbackCategory.Bug,
        platform: 'iOS',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Success' }),
      });

      await submitFeedback(requestWithPlatform);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const bodyData = JSON.parse(fetchCall[1].body);
      expect(bodyData.platform).toBe('iOS');
    });

    it('should handle API error response', async () => {
      const errorMessage = 'Invalid feedback format';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ message: errorMessage }),
      });

      const result = await submitFeedback(mockRequest);

      expect(result).toEqual({
        success: false,
        message: errorMessage,
      });
    });

    it('should handle API error without message', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      const result = await submitFeedback(mockRequest);

      expect(result).toEqual({
        success: false,
        message: 'Failed to submit feedback. Please try again.',
      });
    });

    it('should handle network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await submitFeedback(mockRequest);

      expect(logger.error).toHaveBeenCalledWith(
        '[FeedbackService] Feedback submission error',
        expect.any(Error)
      );
      expect(result).toEqual({
        success: false,
        message: 'Network error. Please check your connection and try again.',
      });
    });

    it('should handle fetch timeout', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Request timeout'));

      const result = await submitFeedback(mockRequest);

      expect(logger.error).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error. Please check your connection and try again.');
    });

    it('should submit bug report feedback', async () => {
      const bugReport: FeedbackRequest = {
        message: 'App crashes on startup',
        subject: 'Critical Bug',
        category: FeedbackCategory.Bug,
        email: 'dev@example.com',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Bug report received' }),
      });

      const result = await submitFeedback(bugReport);

      expect(result.success).toBe(true);
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const bodyData = JSON.parse(fetchCall[1].body);
      expect(bodyData.category).toBe(FeedbackCategory.Bug);
    });

    it('should submit feature request feedback', async () => {
      const featureRequest: FeedbackRequest = {
        message: 'Add Light-Only Mode support',
        subject: 'Feature Request',
        category: FeedbackCategory.FeatureRequest,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Feature request noted' }),
      });

      const result = await submitFeedback(featureRequest);

      expect(result.success).toBe(true);
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const bodyData = JSON.parse(fetchCall[1].body);
      expect(bodyData.category).toBe(FeedbackCategory.FeatureRequest);
    });

    it('should submit minimal feedback without optional fields', async () => {
      const minimalFeedback: FeedbackRequest = {
        message: 'Simple feedback',
        category: FeedbackCategory.General,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Feedback received' }),
      });

      const result = await submitFeedback(minimalFeedback);

      expect(result.success).toBe(true);
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const bodyData = JSON.parse(fetchCall[1].body);
      expect(bodyData.message).toBe('Simple feedback');
      expect(bodyData.category).toBe(FeedbackCategory.General);
      expect(bodyData.platform).toBe('Mobile');
    });
  });

  describe('getFeedbackCategories', () => {
    it('should return all feedback categories', () => {
      const categories = getFeedbackCategories();

      expect(categories).toHaveLength(6);
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

    it('should return General category with correct values', () => {
      const categories = getFeedbackCategories();
      const general = categories.find(c => c.value === FeedbackCategory.General);

      expect(general).toBeDefined();
      expect(general?.value).toBe(0);
      expect(general?.name).toBe('General');
      expect(general?.displayName).toBe('General');
    });

    it('should return Bug category with correct values', () => {
      const categories = getFeedbackCategories();
      const bug = categories.find(c => c.value === FeedbackCategory.Bug);

      expect(bug).toBeDefined();
      expect(bug?.value).toBe(1);
      expect(bug?.name).toBe('Bug');
      expect(bug?.displayName).toBe('Bug Report');
    });

    it('should return FeatureRequest category with correct values', () => {
      const categories = getFeedbackCategories();
      const featureRequest = categories.find(c => c.value === FeedbackCategory.FeatureRequest);

      expect(featureRequest).toBeDefined();
      expect(featureRequest?.value).toBe(2);
      expect(featureRequest?.name).toBe('FeatureRequest');
      expect(featureRequest?.displayName).toBe('Feature Request');
    });

    it('should return Question category with correct values', () => {
      const categories = getFeedbackCategories();
      const question = categories.find(c => c.value === FeedbackCategory.Question);

      expect(question).toBeDefined();
      expect(question?.value).toBe(3);
      expect(question?.name).toBe('Question');
      expect(question?.displayName).toBe('Question');
    });

    it('should return Complaint category with correct values', () => {
      const categories = getFeedbackCategories();
      const complaint = categories.find(c => c.value === FeedbackCategory.Complaint);

      expect(complaint).toBeDefined();
      expect(complaint?.value).toBe(4);
      expect(complaint?.name).toBe('Complaint');
      expect(complaint?.displayName).toBe('Complaint');
    });

    it('should return Other category with correct values', () => {
      const categories = getFeedbackCategories();
      const other = categories.find(c => c.value === FeedbackCategory.Other);

      expect(other).toBeDefined();
      expect(other?.value).toBe(5);
      expect(other?.name).toBe('Other');
      expect(other?.displayName).toBe('Other');
    });

    it('should return categories in consistent order', () => {
      const categories1 = getFeedbackCategories();
      const categories2 = getFeedbackCategories();

      expect(categories1.map(c => c.value)).toEqual(categories2.map(c => c.value));
    });
  });
});
