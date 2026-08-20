/**
 * Promotion Service for mobile app
 * Handles promo code validation and redemption via API
 */

import { Platform } from 'react-native';
import { ApiService } from './api/ApiService';
import { logger } from '../utils/logger';
import {
  Promotion,
  ValidatePromotionResult,
  RedeemPromotionRequest,
  RedeemPromotionResult,
  PromotionRedemption,
} from '../types/promotion';

// Get current platform
const getCurrentPlatform = (): 'ios' | 'android' => {
  return Platform.OS === 'ios' ? 'ios' : 'android';
};

/**
 * Get all active promotions available on mobile
 */
export const getActivePromotions = async (): Promise<Promotion[]> => {
  try {
    const platform = getCurrentPlatform();
    const apiService = new ApiService();
    const response = await apiService.get<Promotion[]>(`/promotions/active?platform=${platform}`);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get active promotions');
    }

    return response.data;
  } catch (error) {
    logger.error('[PromotionService] Failed to get active promotions', error);
    return [];
  }
};

/**
 * Validate a promo code for the current user
 */
export const validatePromoCode = async (code: string): Promise<ValidatePromotionResult> => {
  try {
    const platform = getCurrentPlatform();
    const apiService = new ApiService();
    const response = await apiService.get<ValidatePromotionResult>(
      `/promotions/validate/${encodeURIComponent(code)}?platform=${platform}`,
    );

    if (!response.success || !response.data) {
      return {
        isValid: false,
        errorMessage: response.error?.message || 'Failed to validate code',
        errorCode: response.error?.code || 'unknown_error',
      };
    }

    return response.data;
  } catch (error: any) {
    logger.error('[PromotionService] Failed to validate promo code', error);

    // Handle error
    const errorMessage = error instanceof Error ? error.message : 'Failed to validate code. Please try again.';

    return {
      isValid: false,
      errorMessage,
      errorCode: 'network_error',
    };
  }
};

/**
 * Redeem a promo code (grants access via server-side entitlement)
 */
export const redeemPromoCode = async (code: string): Promise<RedeemPromotionResult> => {
  try {
    const platform = getCurrentPlatform();
    const request: RedeemPromotionRequest = {
      code,
      platform,
    };

    const apiService = new ApiService();
    const response = await apiService.post<RedeemPromotionResult>('/api/promotions/redeem', request);

    if (!response.success || !response.data) {
      return {
        success: false,
        errorMessage: response.error?.message || 'Failed to redeem code',
        errorCode: response.error?.code || 'unknown_error',
      };
    }

    return response.data;
  } catch (error: any) {
    logger.error('[PromotionService] Failed to redeem promo code', error);

    // Handle error
    const errorMessage = error instanceof Error ? error.message : 'Failed to redeem code. Please try again.';

    return {
      success: false,
      errorMessage,
      errorCode: 'network_error',
    };
  }
};

/**
 * Get user's redemption history
 */
export const getUserRedemptions = async (): Promise<PromotionRedemption[]> => {
  try {
    const apiService = new ApiService();
    const response = await apiService.get<PromotionRedemption[]>('/api/promotions/my-redemptions');

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get user redemptions');
    }

    return response.data;
  } catch (error) {
    logger.error('[PromotionService] Failed to get user redemptions', error);
    return [];
  }
};

/**
 * Get promotion details by code
 */
export const getPromotionByCode = async (code: string): Promise<Promotion | null> => {
  try {
    const apiService = new ApiService();
    const response = await apiService.get<Promotion>(`/promotions/code/${encodeURIComponent(code)}`);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get promotion');
    }

    return response.data;
  } catch (error) {
    logger.error('[PromotionService] Failed to get promotion by code', error);
    return null;
  }
};

// Default export for convenience
export default {
  getActivePromotions,
  validatePromoCode,
  redeemPromoCode,
  getUserRedemptions,
  getPromotionByCode,
};
