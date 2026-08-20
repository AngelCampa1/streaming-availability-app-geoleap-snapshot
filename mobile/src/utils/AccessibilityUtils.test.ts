/**
 * AccessibilityUtils.test.ts - Tests for accessibility utilities
 *
 * Test Strategy: Test the exported utility functions with mocked AccessibilityInfo.
 * Tests verify WCAG 2.1 AA compliance helpers.
 */

import {
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
  validateAccessibilityProps,
  ensureMinTouchTarget,
  MIN_TOUCH_TARGET_SIZE,
  AccessibilityRoles,
} from './AccessibilityUtils';
import { AccessibilityInfo, Platform } from 'react-native';

// Mock AccessibilityInfo
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
    setAccessibilityFocus: jest.fn(),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Platform: {
    OS: 'ios',
  },
}));

// Mock logger
jest.mock('./logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

describe('AccessibilityUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('announceForAccessibility', () => {
    it('announces message to screen readers', () => {
      announceForAccessibility('Test message');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Test message');
    });

    it('handles empty message', () => {
      announceForAccessibility('');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('');
    });

    it('handles message with delay option', () => {
      jest.useFakeTimers();
      announceForAccessibility('Delayed message', { delay: 100 });

      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Delayed message');

      jest.useRealTimers();
    });
  });

  describe('isScreenReaderEnabled', () => {
    it('returns true when screen reader is enabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValueOnce(true);
      const result = await isScreenReaderEnabled();
      expect(result).toBe(true);
    });

    it('returns false when screen reader is disabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValueOnce(false);
      const result = await isScreenReaderEnabled();
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockRejectedValueOnce(new Error('Failed'));
      const result = await isScreenReaderEnabled();
      expect(result).toBe(false);
    });
  });

  describe('setAccessibilityFocus', () => {
    it('sets focus to element with valid reactTag', () => {
      setAccessibilityFocus(123);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(123);
    });
  });

  describe('announceSuccess', () => {
    it('announces success message with prefix', () => {
      jest.useFakeTimers();
      announceSuccess('Operation completed');
      jest.advanceTimersByTime(300);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringContaining('Success')
      );
      jest.useRealTimers();
    });
  });

  describe('announceError', () => {
    it('announces error message with prefix', () => {
      jest.useFakeTimers();
      announceError('Something went wrong');
      jest.advanceTimersByTime(100);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
      jest.useRealTimers();
    });
  });

  describe('announceWarning', () => {
    it('announces warning message with prefix', () => {
      jest.useFakeTimers();
      announceWarning('Please review');
      jest.advanceTimersByTime(200);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringContaining('Warning')
      );
      jest.useRealTimers();
    });
  });

  describe('announceLoadingState', () => {
    it('announces loading state', () => {
      jest.useFakeTimers();
      announceLoadingState(true);
      jest.advanceTimersByTime(300);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringContaining('Loading')
      );
      jest.useRealTimers();
    });

    it('announces loaded state', () => {
      jest.useFakeTimers();
      announceLoadingState(false);
      jest.advanceTimersByTime(300);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringContaining('loaded')
      );
      jest.useRealTimers();
    });

    it('uses custom message when provided', () => {
      jest.useFakeTimers();
      announceLoadingState(true, 'Custom loading');
      jest.advanceTimersByTime(300);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Custom loading');
      jest.useRealTimers();
    });
  });

  describe('announceNavigation', () => {
    it('announces navigation to screen', () => {
      jest.useFakeTimers();
      announceNavigation('Settings');
      jest.advanceTimersByTime(500);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringContaining('Settings')
      );
      jest.useRealTimers();
    });
  });

  describe('createInputAccessibilityLabel', () => {
    it('returns label string', () => {
      const label = createInputAccessibilityLabel('Email');
      expect(label).toBe('Email');
    });

    it('adds required suffix when true', () => {
      const label = createInputAccessibilityLabel('Email', true);
      expect(label).toContain('Email');
      expect(label).toContain('required');
    });

    it('adds error message when provided', () => {
      const label = createInputAccessibilityLabel('Email', false, 'Invalid email');
      expect(label).toContain('Email');
      expect(label).toContain('Invalid email');
    });

    it('handles all options', () => {
      const label = createInputAccessibilityLabel('Password', true, 'Too short');
      expect(label).toContain('Password');
      expect(label).toContain('required');
      expect(label).toContain('Too short');
    });
  });

  describe('createInputAccessibilityHint', () => {
    it('returns empty string when no params', () => {
      const hint = createInputAccessibilityHint();
      expect(hint).toBe('');
    });

    it('returns hint when provided', () => {
      const hint = createInputAccessibilityHint('Enter your email');
      expect(hint).toBe('Enter your email');
    });

    it('includes character count when provided', () => {
      const hint = createInputAccessibilityHint('Enter text', 5, 100);
      expect(hint).toContain('5');
      expect(hint).toContain('100');
    });

    it('handles only hint without character count', () => {
      const hint = createInputAccessibilityHint('Type here');
      expect(hint).toBe('Type here');
    });
  });

  describe('subscribeToScreenReaderChanges', () => {
    it('returns unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = subscribeToScreenReaderChanges(callback);
      expect(typeof unsubscribe).toBe('function');
    });

    it('subscribes to screenReaderChanged event', () => {
      const callback = jest.fn();
      subscribeToScreenReaderChanges(callback);
      expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'screenReaderChanged',
        callback
      );
    });

    it('unsubscribe calls remove', () => {
      const mockRemove = jest.fn();
      (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValueOnce({
        remove: mockRemove,
      });

      const callback = jest.fn();
      const unsubscribe = subscribeToScreenReaderChanges(callback);
      unsubscribe();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('validateAccessibilityProps', () => {
    it('returns valid for complete props', () => {
      const result = validateAccessibilityProps({
        accessibilityLabel: 'Button label',
        accessibilityRole: 'button',
      });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('warns when accessibilityLabel is missing', () => {
      const result = validateAccessibilityProps({
        accessibilityRole: 'button',
      });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('warns when accessibilityRole is missing', () => {
      const result = validateAccessibilityProps({
        accessibilityLabel: 'Button',
      });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('warns when touch target is too small', () => {
      const result = validateAccessibilityProps({
        accessibilityLabel: 'Button',
        accessibilityRole: 'button',
        touchTargetSize: { width: 30, height: 30 },
      });
      expect(result.warnings.some(w => w.includes('Touch target'))).toBe(true);
    });

    it('passes when touch target meets minimum', () => {
      const result = validateAccessibilityProps({
        accessibilityLabel: 'Button',
        accessibilityRole: 'button',
        touchTargetSize: { width: 44, height: 44 },
      });
      expect(result.warnings.some(w => w.includes('Touch target'))).toBe(false);
    });
  });

  describe('ensureMinTouchTarget', () => {
    it('returns input when >= minimum', () => {
      expect(ensureMinTouchTarget(50)).toBe(50);
      expect(ensureMinTouchTarget(44)).toBe(44);
    });

    it('returns minimum when < minimum', () => {
      expect(ensureMinTouchTarget(30)).toBe(44);
      expect(ensureMinTouchTarget(0)).toBe(44);
    });

    it('handles negative values', () => {
      expect(ensureMinTouchTarget(-10)).toBe(44);
    });
  });

  describe('constants', () => {
    it('exports MIN_TOUCH_TARGET_SIZE', () => {
      expect(MIN_TOUCH_TARGET_SIZE).toBe(44);
    });

    it('exports AccessibilityRoles', () => {
      expect(AccessibilityRoles.BUTTON).toBe('button');
      expect(AccessibilityRoles.LINK).toBe('link');
      expect(AccessibilityRoles.HEADER).toBe('header');
    });
  });
});
