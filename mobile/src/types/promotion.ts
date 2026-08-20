/**
 * Promotion types for Stripe Coupons/Promotion Codes integration
 * Mobile-specific types matching backend PromotionDto
 */

// Core Promotion interface
export interface Promotion {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  maxRedemptions?: number;
  currentRedemptions: number;
  expiresAt?: string;
  percentOff?: number;
  amountOff?: number;
  amountOffCurrency?: string;
  duration: string;
  durationInMonths?: number;
  targetPlanType?: string;
  firstTimeOnly: boolean;
  autoApply: boolean;
  availableOnMobile: boolean;
  availableOnWeb: boolean;
  createdAt: string;
}

// Redemption record interface
export interface PromotionRedemption {
  id: string;
  promotionId: string;
  userId: string;
  redeemedAt: string;
  platform: string;
  stripeSubscriptionId?: string;
  promotion?: Promotion;
}

// Validation result
export interface ValidatePromotionResult {
  isValid: boolean;
  promotion?: Promotion;
  errorMessage?: string;
  errorCode?: string;
  discountDescription?: string;
  savings?: number;
}

// Redemption request
export interface RedeemPromotionRequest {
  code: string;
  platform: 'ios' | 'android';
}

// Redemption result
export interface RedeemPromotionResult {
  success: boolean;
  errorMessage?: string;
  errorCode?: string;
  redemption?: PromotionRedemption;
  accessGranted?: boolean;
  accessExpiresAt?: string;
  tierGranted?: string;
}

// Form state for PromoCodeInput
export interface PromoCodeFormState {
  code: string;
  isValidating: boolean;
  isApplying: boolean;
  error: string | null;
  validatedPromotion: Promotion | null;
  appliedPromotion: Promotion | null;
}

// Component props
export interface PromoCodeInputProps {
  onValidate?: (result: ValidatePromotionResult) => void;
  onApply?: (code: string) => Promise<void>;
  onRemove?: () => void;
  appliedPromotion?: Promotion | null;
  disabled?: boolean;
  platform?: 'ios' | 'android';
  style?: object;
}

// Display info
export interface PromotionDisplayInfo {
  title: string;
  description: string;
  discountText: string;
  durationText: string;
  expiryText?: string;
  remainingText?: string;
  badgeText?: string;
}

// Error codes
export enum PromotionErrorCode {
  INVALID_CODE = 'invalid_code',
  EXPIRED = 'expired',
  LIMIT_REACHED = 'limit_reached',
  ALREADY_REDEEMED = 'already_redeemed',
  NOT_ELIGIBLE = 'not_eligible',
  PLATFORM_NOT_SUPPORTED = 'platform_not_supported',
  FIRST_TIME_ONLY = 'first_time_only',
  INVALID_PLAN = 'invalid_plan',
  SERVER_ERROR = 'server_error',
}

// Utility functions
export const formatPromotionDiscount = (promotion: Promotion): string => {
  if (promotion.percentOff) {
    return `${promotion.percentOff}% off`;
  }
  if (promotion.amountOff) {
    const currency = promotion.amountOffCurrency?.toUpperCase() || 'USD';
    return `$${promotion.amountOff.toFixed(2)} ${currency} off`;
  }
  return 'Discount';
};

export const formatPromotionDuration = (promotion: Promotion): string => {
  switch (promotion.duration) {
    case 'once':
      return 'one-time';
    case 'forever':
      return 'forever';
    case 'repeating':
      return promotion.durationInMonths
        ? `for ${promotion.durationInMonths} month${promotion.durationInMonths > 1 ? 's' : ''}`
        : 'limited time';
    default:
      return 'limited time';
  }
};

export const isPromotionActive = (promotion: Promotion): boolean => {
  if (!promotion.isActive) return false;
  if (promotion.expiresAt && new Date(promotion.expiresAt) < new Date()) return false;
  if (promotion.maxRedemptions && promotion.currentRedemptions >= promotion.maxRedemptions) return false;
  return true;
};

export const canRedeemPromotion = (promotion: Promotion, platform: string): boolean => {
  if (!isPromotionActive(promotion)) return false;
  if ((platform === 'ios' || platform === 'android') && !promotion.availableOnMobile) return false;
  return true;
};

export const getPromotionDisplayInfo = (promotion: Promotion): PromotionDisplayInfo => {
  const discountText = formatPromotionDiscount(promotion);
  const durationText = formatPromotionDuration(promotion);

  let expiryText: string | undefined;
  if (promotion.expiresAt) {
    const expiryDate = new Date(promotion.expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
      expiryText = `Expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`;
    } else if (daysUntilExpiry > 7) {
      expiryText = `Expires ${expiryDate.toLocaleDateString()}`;
    }
  }

  let remainingText: string | undefined;
  if (promotion.maxRedemptions) {
    const remaining = promotion.maxRedemptions - promotion.currentRedemptions;
    if (remaining > 0 && remaining <= 50) {
      remainingText = `Only ${remaining} left!`;
    }
  }

  let badgeText: string | undefined;
  if (promotion.percentOff === 100) {
    badgeText = 'FREE';
  } else if (promotion.firstTimeOnly) {
    badgeText = 'New Customers';
  }

  return {
    title: promotion.name,
    description: promotion.description || `Get ${discountText} ${durationText}`,
    discountText,
    durationText,
    expiryText,
    remainingText,
    badgeText,
  };
};
