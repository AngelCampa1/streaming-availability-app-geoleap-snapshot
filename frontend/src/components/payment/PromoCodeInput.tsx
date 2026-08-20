'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert } from '../ui/alert';
import { Badge } from '../ui/badge';
import {
  Promotion,
  ValidatePromotionResult,
  PromoCodeInputProps,
  PromoCodeFormState,
  formatPromotionDiscount,
  formatPromotionDuration,
  getPromotionDisplayInfo,
} from '../../lib/types/promotion';
import { Tag, X, Check, Loader2, AlertCircle, Percent } from 'lucide-react';
import { cn } from '../../lib/utils';

// API helper functions
const validatePromoCode = async (code: string, platform: string = 'web'): Promise<ValidatePromotionResult> => {
  // SECURITY: Use credentials: 'include' for cookie-based auth instead of localStorage tokens
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/promotions/validate/${encodeURIComponent(code)}?platform=${platform}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return {
      isValid: false,
      errorMessage: errorData.error || 'Failed to validate promotion code',
      errorCode: errorData.errorCode,
    };
  }

  return response.json();
};

export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
  onValidate,
  onApply,
  onRemove,
  appliedPromotion = null,
  disabled = false,
  platform = 'web',
  className,
}) => {
  const [state, setState] = useState<PromoCodeFormState>({
    code: '',
    isValidating: false,
    isApplying: false,
    error: null,
    validatedPromotion: null,
    appliedPromotion: appliedPromotion,
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setState(prev => ({
      ...prev,
      code: newCode,
      error: null,
      validatedPromotion: null,
    }));
  }, []);

  const handleValidate = useCallback(async () => {
    if (!state.code.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a promo code' }));
      return;
    }

    setState(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const result = await validatePromoCode(state.code, platform);

      if (result.isValid && result.promotion) {
        setState(prev => ({
          ...prev,
          isValidating: false,
          validatedPromotion: result.promotion!,
          error: null,
        }));
        onValidate?.(result);
      } else {
        setState(prev => ({
          ...prev,
          isValidating: false,
          validatedPromotion: null,
          error: result.errorMessage || 'Invalid promo code',
        }));
        onValidate?.(result);
      }
    } catch (_error) {
      setState(prev => ({
        ...prev,
        isValidating: false,
        error: 'Failed to validate code. Please try again.',
      }));
    }
  }, [state.code, platform, onValidate]);

  const handleApply = useCallback(async () => {
    if (!state.validatedPromotion) return;

    setState(prev => ({ ...prev, isApplying: true }));

    try {
      await onApply?.(state.code);
      setState(prev => ({
        ...prev,
        isApplying: false,
        appliedPromotion: prev.validatedPromotion,
        validatedPromotion: null,
        code: '',
      }));
      setIsExpanded(false);
    } catch (_error) {
      setState(prev => ({
        ...prev,
        isApplying: false,
        error: 'Failed to apply promo code. Please try again.',
      }));
    }
  }, [state.code, state.validatedPromotion, onApply]);

  const handleRemove = useCallback(() => {
    setState(prev => ({
      ...prev,
      appliedPromotion: null,
      code: '',
      validatedPromotion: null,
      error: null,
    }));
    onRemove?.();
  }, [onRemove]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (state.validatedPromotion) {
        handleApply();
      } else {
        handleValidate();
      }
    }
  }, [state.validatedPromotion, handleApply, handleValidate]);

  // If there's an applied promotion, show the applied state
  if (state.appliedPromotion) {
    const displayInfo = getPromotionDisplayInfo(state.appliedPromotion);

    return (
      <div className={cn('flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-lg', className)}>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-success" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-success">
              {state.appliedPromotion.code}
            </span>
            <span className="text-xs text-success/80">
              {displayInfo.discountText} {displayInfo.durationText}
            </span>
          </div>
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-success hover:text-success/80 hover:bg-success/10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Collapsed state - just show toggle button
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <Tag className="h-4 w-4" />
        <span>Have a promo code?</span>
      </button>
    );
  }

  // Expanded state - show input form
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Enter promo code"
            value={state.code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || state.isValidating || state.isApplying}
            className={cn(
              'pr-20 uppercase tracking-wider font-mono',
              state.error && 'border-destructive focus:ring-destructive'
            )}
            maxLength={20}
          />
          {state.code && !state.validatedPromotion && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleValidate}
              disabled={disabled || state.isValidating || !state.code}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
            >
              {state.isValidating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Apply'
              )}
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsExpanded(false);
            setState(prev => ({ ...prev, code: '', error: null, validatedPromotion: null }));
          }}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Error message */}
      {state.error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{state.error}</span>
        </Alert>
      )}

      {/* Validated promotion preview */}
      {state.validatedPromotion && (
        <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Percent className="h-5 w-5 text-info mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-medium text-info">
                  {state.validatedPromotion.name}
                </span>
                <span className="text-sm text-info/80">
                  {formatPromotionDiscount(state.validatedPromotion)} {formatPromotionDuration(state.validatedPromotion)}
                </span>
                {state.validatedPromotion.description && (
                  <span className="text-xs text-info/70">
                    {state.validatedPromotion.description}
                  </span>
                )}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={state.isApplying}
              className="shrink-0"
            >
              {state.isApplying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Apply'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple inline promo code badge component for displaying applied codes
export const PromoCodeBadge: React.FC<{
  promotion: Promotion;
  onRemove?: () => void;
  showRemove?: boolean;
  className?: string;
}> = ({ promotion, onRemove, showRemove = true, className }) => {
  const displayInfo = getPromotionDisplayInfo(promotion);

  return (
    <Badge
      variant="secondary"
      className={cn(
        'flex items-center gap-1.5 py-1 px-2 bg-success/10 text-success',
        className
      )}
    >
      <Tag className="h-3 w-3" />
      <span className="font-medium">{promotion.code}</span>
      <span className="text-success/80">({displayInfo.discountText})</span>
      {showRemove && onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:text-success/80"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
};

export default PromoCodeInput;
