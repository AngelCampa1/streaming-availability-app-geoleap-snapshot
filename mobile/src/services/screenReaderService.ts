import { AccessibilityInfo } from 'react-native';
import { logger } from '../utils/logger';

export interface ScreenReaderServiceInterface {
  isEnabled(): Promise<boolean>;
  announceMessage(message: string): void;
  setScreenReaderEnabled(enabled: boolean): void;
}

class ScreenReaderService implements ScreenReaderServiceInterface {
  private enabled: boolean = false;

  async isEnabled(): Promise<boolean> {
    try {
      this.enabled = await AccessibilityInfo.isScreenReaderEnabled();
      return this.enabled;
    } catch (error) {
      logger.error('[ScreenReaderService] Failed to check screen reader status', error);
      return false;
    }
  }

  announceMessage(message: string): void {
    if (this.enabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  setScreenReaderEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export const screenReaderService = new ScreenReaderService();
export default screenReaderService;
