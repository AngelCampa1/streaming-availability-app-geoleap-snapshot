import { API_BASE_URL } from '@/config/api';

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
  turnstileToken?: string;
  companyWebsite?: string;
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
  const response = await fetch(`${API_BASE_URL}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      ...request,
      platform: request.platform || 'Web',
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
}

/**
 * Get available feedback categories from the API
 * Falls back to default categories if API fails or network error occurs
 */
export async function getFeedbackCategories(): Promise<FeedbackCategoryDto[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/feedback/categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Return default categories if API returns error
      return Object.entries(FeedbackCategoryLabels).map(([value, displayName]) => ({
        value: parseInt(value),
        name: FeedbackCategory[parseInt(value) as FeedbackCategory],
        displayName,
      }));
    }

    return response.json();
  } catch (_error) {
    // Return default categories if network error occurs
    return Object.entries(FeedbackCategoryLabels).map(([value, displayName]) => ({
      value: parseInt(value),
      name: FeedbackCategory[parseInt(value) as FeedbackCategory],
      displayName,
    }));
  }
}
