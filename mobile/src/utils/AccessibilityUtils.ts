/**
 * Accessibility Utilities for Mobile App
 * Provides helpers for screen reader announcements and accessibility improvements
 * Meets WCAG 2.1 AA standards
 */

import { AccessibilityInfo, Platform } from 'react-native';
import { logger } from './logger';

/**
 * Announces a message to screen readers (VoiceOver on iOS, TalkBack on Android)
 * @param message - The message to announce
 * @param options - Optional configuration for the announcement
 */
export const announceForAccessibility = (
  message: string,
  options?: {
    queue?: boolean; // Queue announcement instead of interrupting
    delay?: number; // Delay before announcement (ms)
  }
) => {
  const { queue: _queue = false, delay = 0 } = options || {};

  const announce = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      AccessibilityInfo.announceForAccessibility(message);
    }
  };

  if (delay > 0) {
    setTimeout(announce, delay);
  } else {
    announce();
  }
};

/**
 * Checks if a screen reader is currently enabled
 * @returns Promise<boolean> - True if screen reader is enabled
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch (error) {
    logger.warn('[AccessibilityUtils] Failed to check screen reader status', error);
    return false;
  }
};

/**
 * Sets focus to a specific element (useful for form validation errors)
 * @param reactTag - The React tag of the element to focus
 */
export const setAccessibilityFocus = (reactTag: number) => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }
};

/**
 * Announces success messages to screen readers
 * @param message - Success message to announce
 */
export const announceSuccess = (message: string) => {
  announceForAccessibility(`Success: ${message}`, { delay: 300 });
};

/**
 * Announces error messages to screen readers with higher priority
 * @param message - Error message to announce
 */
export const announceError = (message: string) => {
  announceForAccessibility(`Error: ${message}`, { delay: 100 });
};

/**
 * Announces warning messages to screen readers
 * @param message - Warning message to announce
 */
export const announceWarning = (message: string) => {
  announceForAccessibility(`Warning: ${message}`, { delay: 200 });
};

/**
 * Announces loading state changes
 * @param isLoading - Whether content is loading
 * @param customMessage - Optional custom loading message
 */
export const announceLoadingState = (
  isLoading: boolean,
  customMessage?: string
) => {
  const message = customMessage || (isLoading ? 'Loading content' : 'Content loaded');
  announceForAccessibility(message, { delay: 300 });
};

/**
 * Announces navigation changes
 * @param screenName - Name of the screen navigated to
 */
export const announceNavigation = (screenName: string) => {
  announceForAccessibility(`Navigated to ${screenName}`, { delay: 500 });
};

/**
 * Creates an accessible label for form inputs
 * @param label - Input label
 * @param required - Whether the field is required
 * @param error - Error message if validation failed
 */
export const createInputAccessibilityLabel = (
  label: string,
  required?: boolean,
  error?: string
): string => {
  let accessibilityLabel = label;

  if (required) {
    accessibilityLabel += ', required';
  }

  if (error) {
    accessibilityLabel += `, error: ${error}`;
  }

  return accessibilityLabel;
};

/**
 * Creates an accessible hint for form inputs
 * @param hint - Base hint text
 * @param characterCount - Current character count
 * @param maxCharacters - Maximum allowed characters
 */
export const createInputAccessibilityHint = (
  hint?: string,
  characterCount?: number,
  maxCharacters?: number
): string => {
  const hints: string[] = [];

  if (hint) {
    hints.push(hint);
  }

  if (characterCount !== undefined && maxCharacters !== undefined) {
    hints.push(`${characterCount} of ${maxCharacters} characters`);
  }

  return hints.join('. ');
};

/**
 * Hook for subscribing to screen reader state changes
 */
export const subscribeToScreenReaderChanges = (
  callback: (isEnabled: boolean) => void
) => {
  const subscription = AccessibilityInfo.addEventListener(
    'screenReaderChanged',
    callback
  );

  return () => {
    if (subscription && typeof subscription.remove === 'function') {
      subscription.remove();
    }
  };
};

/**
 * Accessibility constants for common roles and traits
 */
export const AccessibilityRoles = {
  BUTTON: 'button' as const,
  LINK: 'link' as const,
  SEARCH: 'search' as const,
  IMAGE: 'image' as const,
  TEXT: 'text' as const,
  HEADER: 'header' as const,
  SUMMARY: 'summary' as const,
  ALERT: 'alert' as const,
  CHECKBOX: 'checkbox' as const,
  RADIO: 'radio' as const,
  SWITCH: 'switch' as const,
  MENU: 'menu' as const,
  MENUBAR: 'menubar' as const,
  MENUITEM: 'menuitem' as const,
  PROGRESSBAR: 'progressbar' as const,
  TAB: 'tab' as const,
  TABLIST: 'tablist' as const,
  TIMER: 'timer' as const,
  TOOLBAR: 'toolbar' as const,
};

/**
 * Minimum touch target size (44x44 points) per Apple HIG and Material Design
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Helper to ensure minimum touch target size
 * @param size - Current size
 * @returns Minimum of size or MIN_TOUCH_TARGET_SIZE
 */
export const ensureMinTouchTarget = (size: number): number => {
  return Math.max(size, MIN_TOUCH_TARGET_SIZE);
};

/**
 * Validates if an element meets accessibility guidelines
 * @param props - Accessibility props to validate
 * @returns Validation result with warnings
 */
export const validateAccessibilityProps = (props: {
  accessibilityLabel?: string;
  accessibilityRole?: string;
  touchTargetSize?: { width: number; height: number };
}): { isValid: boolean; warnings: string[] } => {
  const warnings: string[] = [];

  if (!props.accessibilityLabel) {
    warnings.push('Missing accessibilityLabel - screen readers won\'t know what this element is');
  }

  if (!props.accessibilityRole) {
    warnings.push('Missing accessibilityRole - screen readers won\'t know how to interact with this element');
  }

  if (props.touchTargetSize) {
    const { width, height } = props.touchTargetSize;
    if (width < MIN_TOUCH_TARGET_SIZE || height < MIN_TOUCH_TARGET_SIZE) {
      warnings.push(
        `Touch target too small (${width}x${height}). Minimum is ${MIN_TOUCH_TARGET_SIZE}x${MIN_TOUCH_TARGET_SIZE}`
      );
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
};

export default {
  announceForAccessibility,
  isScreenReaderEnabled,
  setAccessibilityFocus,
  announceSuccess,
  announceError,
  announceWarning,
  announceLoadingState,
  announceNavigation,
  createInputAccessibilityLabel,
  createInputAccessibilityHint,
  subscribeToScreenReaderChanges,
  AccessibilityRoles,
  MIN_TOUCH_TARGET_SIZE,
  ensureMinTouchTarget,
  validateAccessibilityProps,
};
