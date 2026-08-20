/**
 * PromoCodeInput Component for React Native
 * Allows users to enter and validate promotional codes
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Promotion,
  PromoCodeInputProps,
  PromoCodeFormState,
  formatPromotionDiscount,
  formatPromotionDuration,
  getPromotionDisplayInfo,
} from '../../types/promotion';
import promotionService from '../../services/promotionService';
import { useTheme } from '../../hooks/useTheme';

export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
  onValidate,
  onApply,
  onRemove,
  appliedPromotion = null,
  disabled = false,
  style,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [state, setState] = useState<PromoCodeFormState>({
    code: '',
    isValidating: false,
    isApplying: false,
    error: null,
    validatedPromotion: null,
    appliedPromotion: appliedPromotion,
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleCodeChange = useCallback((text: string) => {
    const newCode = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
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
      const result = await promotionService.validatePromoCode(state.code);

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
    } catch (error) {
      setState(prev => ({
        ...prev,
        isValidating: false,
        error: 'Failed to validate code. Please try again.',
      }));
    }
  }, [state.code, onValidate]);

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
    } catch (error) {
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

  // If there's an applied promotion, show the applied state
  if (state.appliedPromotion) {
    const displayInfo = getPromotionDisplayInfo(state.appliedPromotion);

    return (
      <View style={[styles.appliedContainer, style]}>
        <View style={styles.appliedContent}>
          <Text style={styles.checkIcon}>✓</Text>
          <View style={styles.appliedTextContainer}>
            <Text style={styles.appliedCode}>{state.appliedPromotion.code}</Text>
            <Text style={styles.appliedDiscount}>
              {displayInfo.discountText} {displayInfo.durationText}
            </Text>
          </View>
        </View>
        {!disabled && (
          <TouchableOpacity onPress={handleRemove} style={styles.removeButton}>
            <Text style={styles.removeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Collapsed state - just show toggle button
  if (!isExpanded) {
    return (
      <TouchableOpacity
        onPress={() => setIsExpanded(true)}
        disabled={disabled}
        style={[styles.toggleButton, disabled && styles.toggleButtonDisabled, style]}
      >
        <Text style={styles.tagIcon}>🏷️</Text>
        <Text style={[styles.toggleText, disabled && styles.toggleTextDisabled]}>
          Have a promo code?
        </Text>
      </TouchableOpacity>
    );
  }

  // Expanded state - show input form
  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, state.error && styles.inputError]}
            placeholder="Enter promo code"
            placeholderTextColor={theme.semantic.text.tertiary}
            value={state.code}
            onChangeText={handleCodeChange}
            onSubmitEditing={state.validatedPromotion ? handleApply : handleValidate}
            editable={!disabled && !state.isValidating && !state.isApplying}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
            returnKeyType="go"
          />
          {state.code && !state.validatedPromotion && (
            <TouchableOpacity
              onPress={handleValidate}
              disabled={disabled || state.isValidating || !state.code}
              style={styles.applyButton}
            >
              {state.isValidating ? (
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
              ) : (
                <Text style={styles.applyButtonText}>Apply</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            setIsExpanded(false);
            setState(prev => ({ ...prev, code: '', error: null, validatedPromotion: null }));
          }}
          style={styles.closeButton}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Error message */}
      {state.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}

      {/* Validated promotion preview */}
      {state.validatedPromotion && (
        <View style={styles.previewContainer}>
          <View style={styles.previewContent}>
            <Text style={styles.percentIcon}>%</Text>
            <View style={styles.previewTextContainer}>
              <Text style={styles.previewName}>{state.validatedPromotion.name}</Text>
              <Text style={styles.previewDiscount}>
                {formatPromotionDiscount(state.validatedPromotion)}{' '}
                {formatPromotionDuration(state.validatedPromotion)}
              </Text>
              {state.validatedPromotion.description && (
                <Text style={styles.previewDescription}>
                  {state.validatedPromotion.description}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={handleApply}
            disabled={state.isApplying}
            style={styles.confirmButton}
          >
            {state.isApplying ? (
              <ActivityIndicator size="small" color={theme.semantic.text.inverse} />
            ) : (
              <Text style={styles.confirmButtonText}>Apply</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// PromoCodeBadge component
export const PromoCodeBadge: React.FC<{
  promotion: Promotion;
  onRemove?: () => void;
  showRemove?: boolean;
  style?: object;
}> = ({ promotion, onRemove, showRemove = true, style }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const displayInfo = getPromotionDisplayInfo(promotion);

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeTag}>🏷️</Text>
      <Text style={styles.badgeCode}>{promotion.code}</Text>
      <Text style={styles.badgeDiscount}>({displayInfo.discountText})</Text>
      {showRemove && onRemove && (
        <TouchableOpacity onPress={onRemove} style={styles.badgeRemove}>
          <Text style={styles.badgeRemoveText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Dynamic styles function - receives theme from useTheme() hook
const createStyles = (theme: any) => StyleSheet.create({
  container: {
    gap: 12,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  toggleButtonDisabled: {
    opacity: 0.5,
  },
  tagIcon: {
    fontSize: 16,
  },
  toggleText: {
    color: theme.colors.primary[500],
    fontSize: 14,
  },
  toggleTextDisabled: {
    color: theme.semantic.text.tertiary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
    color: theme.semantic.text.primary,
  },
  inputError: {
    borderColor: theme.colors.error[500],
  },
  applyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  applyButtonText: {
    color: theme.colors.primary[500],
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: theme.semantic.text.secondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.semantic.background.error,
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  errorIcon: {
    fontSize: 14,
  },
  errorText: {
    color: theme.colors.error[600],
    fontSize: 14,
    flex: 1,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: theme.semantic.background.info,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.info[200],
    gap: 12,
  },
  previewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  percentIcon: {
    fontSize: 20,
    color: theme.colors.info[600],
  },
  previewTextContainer: {
    flex: 1,
    gap: 2,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.info[800],
  },
  previewDiscount: {
    fontSize: 14,
    color: theme.colors.info[600],
  },
  previewDescription: {
    fontSize: 12,
    color: theme.colors.info[500],
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  confirmButtonText: {
    color: theme.semantic.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  appliedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.semantic.background.success,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.success[300],
  },
  appliedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIcon: {
    fontSize: 16,
    color: theme.colors.success[600],
  },
  appliedTextContainer: {
    gap: 2,
  },
  appliedCode: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success[800],
  },
  appliedDiscount: {
    fontSize: 12,
    color: theme.colors.success[600],
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 16,
    color: theme.colors.success[600],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  badgeTag: {
    fontSize: 12,
  },
  badgeCode: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success[800],
  },
  badgeDiscount: {
    fontSize: 12,
    color: theme.colors.success[600],
  },
  badgeRemove: {
    marginLeft: 4,
    padding: 2,
  },
  badgeRemoveText: {
    fontSize: 12,
    color: theme.colors.success[800],
  },
});

export default PromoCodeInput;
