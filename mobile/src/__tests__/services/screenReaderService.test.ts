/**
 * ScreenReaderService Tests
 *
 * Tests REAL business logic for screen reader accessibility.
 * Target: 95%+ coverage
 *
 * Philosophy: Execute real service logic, only mock external I/O
 * - Mock: AccessibilityInfo, logger
 * - Real: All business logic, state management
 */

import { AccessibilityInfo } from 'react-native';
import { screenReaderService } from '../../services/screenReaderService';

// Mock external dependencies (I/O only)
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(),
    announceForAccessibility: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('ScreenReaderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Instance', () => {
    it('should export a service instance', () => {
      expect(screenReaderService).toBeDefined();
      expect(typeof screenReaderService).toBe('object');
    });

    it('should have isEnabled method', () => {
      expect(typeof screenReaderService.isEnabled).toBe('function');
    });

    it('should have announceMessage method', () => {
      expect(typeof screenReaderService.announceMessage).toBe('function');
    });

    it('should have setScreenReaderEnabled method', () => {
      expect(typeof screenReaderService.setScreenReaderEnabled).toBe('function');
    });
  });

  describe('isEnabled()', () => {
    it('should return true when screen reader is enabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);

      const result = await screenReaderService.isEnabled();

      expect(result).toBe(true);
      expect(AccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalled();
    });

    it('should return false when screen reader is disabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);

      const result = await screenReaderService.isEnabled();

      expect(result).toBe(false);
      expect(AccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalled();
    });

    it('should update internal enabled state when checking', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);

      await screenReaderService.isEnabled();

      // Verify internal state updated by calling announceMessage (which uses the state)
      screenReaderService.announceMessage('Test message');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Test message');
    });

    it('should handle errors and return false', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockRejectedValue(
        new Error('AccessibilityInfo error')
      );

      const result = await screenReaderService.isEnabled();

      expect(result).toBe(false);
    });
  });

  describe('announceMessage()', () => {
    it('should announce message when screen reader is enabled', async () => {
      // Enable screen reader
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await screenReaderService.isEnabled();

      screenReaderService.announceMessage('Important announcement');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Important announcement');
    });

    it('should not announce message when screen reader is disabled', async () => {
      // Disable screen reader
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);
      await screenReaderService.isEnabled();

      screenReaderService.announceMessage('Should not be announced');

      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });

    it('should announce multiple messages when enabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await screenReaderService.isEnabled();

      screenReaderService.announceMessage('First message');
      screenReaderService.announceMessage('Second message');
      screenReaderService.announceMessage('Third message');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(3);
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenNthCalledWith(1, 'First message');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenNthCalledWith(2, 'Second message');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenNthCalledWith(3, 'Third message');
    });

    it('should handle empty message strings', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await screenReaderService.isEnabled();

      screenReaderService.announceMessage('');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('');
    });

    it('should respect enabled state set by setScreenReaderEnabled', () => {
      screenReaderService.setScreenReaderEnabled(true);
      screenReaderService.announceMessage('Test with manual enable');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Test with manual enable');
    });
  });

  describe('setScreenReaderEnabled()', () => {
    it('should enable announcements when set to true', () => {
      screenReaderService.setScreenReaderEnabled(true);
      screenReaderService.announceMessage('Message after enable');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Message after enable');
    });

    it('should disable announcements when set to false', () => {
      screenReaderService.setScreenReaderEnabled(false);
      screenReaderService.announceMessage('Message after disable');

      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });

    it('should toggle enabled state multiple times', () => {
      // Enable
      screenReaderService.setScreenReaderEnabled(true);
      screenReaderService.announceMessage('Enabled');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);

      // Disable
      screenReaderService.setScreenReaderEnabled(false);
      screenReaderService.announceMessage('Disabled');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1); // Still 1, not 2

      // Enable again
      screenReaderService.setScreenReaderEnabled(true);
      screenReaderService.announceMessage('Enabled again');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(2);
    });

    it('should override state from isEnabled check', async () => {
      // First, check shows disabled
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);
      await screenReaderService.isEnabled();

      // Manually enable
      screenReaderService.setScreenReaderEnabled(true);
      screenReaderService.announceMessage('Manual override');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Manual override');
    });
  });

  describe('Integration Scenarios', () => {
    it('should complete full enable and announce flow', async () => {
      // Check status
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      const isEnabled = await screenReaderService.isEnabled();
      expect(isEnabled).toBe(true);

      // Announce message
      screenReaderService.announceMessage('Integration test message');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Integration test message');
    });

    it('should complete full disable flow', async () => {
      // Check status (disabled)
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);
      const isEnabled = await screenReaderService.isEnabled();
      expect(isEnabled).toBe(false);

      // Try to announce (should not work)
      screenReaderService.announceMessage('Should not announce');
      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });

    it('should handle state changes during operation', async () => {
      // Start disabled
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);
      await screenReaderService.isEnabled();

      screenReaderService.announceMessage('Disabled state');
      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();

      // Enable manually
      screenReaderService.setScreenReaderEnabled(true);
      screenReaderService.announceMessage('Enabled state');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Enabled state');

      // Check again (now enabled from system)
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await screenReaderService.isEnabled();

      screenReaderService.announceMessage('System enabled');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('System enabled');
    });

    it('should handle error during check but continue with manual control', async () => {
      // Error during check
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockRejectedValue(
        new Error('System error')
      );
      const isEnabled = await screenReaderService.isEnabled();
      expect(isEnabled).toBe(false);

      // Manual enable should still work
      screenReaderService.setScreenReaderEnabled(true);
      screenReaderService.announceMessage('Manual after error');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Manual after error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in messages', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await screenReaderService.isEnabled();

      const specialMessage = 'Test with émojis 🎉 and spëcial chars!';
      screenReaderService.announceMessage(specialMessage);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(specialMessage);
    });

    it('should handle very long messages', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await screenReaderService.isEnabled();

      const longMessage = 'A'.repeat(1000);
      screenReaderService.announceMessage(longMessage);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(longMessage);
    });

    it('should handle whitespace-only messages', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await screenReaderService.isEnabled();

      screenReaderService.announceMessage('   ');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('   ');
    });

    it('should handle newlines in messages', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await screenReaderService.isEnabled();

      const multilineMessage = 'Line 1\nLine 2\nLine 3';
      screenReaderService.announceMessage(multilineMessage);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(multilineMessage);
    });
  });

  describe('State Management', () => {
    it('should maintain state between multiple isEnabled calls', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);

      const result1 = await screenReaderService.isEnabled();
      const result2 = await screenReaderService.isEnabled();

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(AccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalledTimes(2);
    });

    it('should reflect state changes from system', async () => {
      // First check: enabled
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      let enabled = await screenReaderService.isEnabled();
      expect(enabled).toBe(true);

      // Second check: disabled
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);
      enabled = await screenReaderService.isEnabled();
      expect(enabled).toBe(false);

      // Announce should not work now
      screenReaderService.announceMessage('Should not announce');
      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });

    it('should handle concurrent isEnabled and announceMessage calls', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);

      // Start checking in background
      const checkPromise = screenReaderService.isEnabled();

      // Try to announce before check completes (using old state)
      screenReaderService.announceMessage('Before check completes');

      // Wait for check to complete
      await checkPromise;

      // Now announce should work
      screenReaderService.announceMessage('After check completes');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('After check completes');
    });
  });
});
