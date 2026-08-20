/**
 * Feedback Service for GeoLeap Mobile App
 * Handles feedback submission to the backend API
 */

import { apiConfig, buildUrl } from '../config/api';
import { logger } from '../utils/logger';

/**
 * Feedback category enum matching backend
 */
export enum FeedbackCategory {
  General = 0,
  Bug = 1,
  FeatureRequest = 2,
  Question = 3,
  Complaint = 4,
  Other = 5,
}

/**
 * Display names for feedback categories
 */
export const FeedbackCategoryLabels: Record<FeedbackCategory, string> = {
  [FeedbackCategory.General]: 'General',
  [FeedbackCategory.Bug]: 'Bug Report',
  [FeedbackCategory.FeatureRequest]: 'Feature Request',
  [FeedbackCategory.Question]: 'Question',
  [FeedbackCategory.Complaint]: 'Complaint',
  [FeedbackCategory.Other]: 'Other',
};

/**
 * Request payload for submitting feedback
 */
export interface FeedbackRequest {
  message: string;
  subject?: string;
  category: FeedbackCategory;
  email?: string;
  platform?: string;
}

/**
 * Response from feedback submission
 */
export interface FeedbackResponse {
  success: boolean;
  message: string;
}

/**
 * Category DTO from API
 */
export interface FeedbackCategoryDto {
  value: number;
  name: string;
  displayName: string;
}

/**
 * Submit user feedback to the backend
 */
export async function submitFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
  try {
    // BUG-005 FIX: Use buildUrl helper to avoid duplicate /api prefix
    const response = await fetch(buildUrl('/api/feedback'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        platform: request.platform || 'Mobile',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to submit feedback. Please try again.',
      };
    }

    return data;
  } catch (error) {
    logger.error('[FeedbackService] Feedback submission error', error);
    return {
      success: false,
      message: 'Network error. Please check your connection and try again.',
    };
  }
}

/**
 * Get all feedback categories
 */
export function getFeedbackCategories(): FeedbackCategoryDto[] {
  return Object.entries(FeedbackCategoryLabels).map(([value, displayName]) => ({
    value: parseInt(value),
    name: FeedbackCategory[parseInt(value) as FeedbackCategory],
    displayName,
  }));
}
