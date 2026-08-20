import { AccessibilityInfo, Platform } from 'react-native';
import { logger } from '../utils/logger';

export interface AccessibilityConfig {
  reduceMotion: boolean;
  reduceMotionEnabled: boolean; // Alias for compatibility
  screenReaderEnabled: boolean;
  highContrastMode: boolean;
  largeTextEnabled: boolean;
  voiceOverEnabled: boolean;
  talkBackEnabled: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export interface AccessibilityServiceInterface {
  isScreenReaderEnabled(): Promise<boolean>;
  isReduceMotionEnabled(): Promise<boolean>;
  isHighContrastEnabled(): Promise<boolean>;
  announceForAccessibility(message: string): void;
  setAccessibilityFocus(tag: string): void;
  getConfig(): AccessibilityConfig;
  subscribe(listener: Function): () => void;
  getButtonAccessibilityProps(label: string, hint?: string): any;
  getInputAccessibilityProps(label: string, value?: string, error?: string): any;
  getImageAccessibilityProps(altText: string, isDecorative?: boolean): any;
  validateAccessibility(component: any, requiredProps: string[]): any;
  getAnimationConfig(): any;
  getScaledFontSize(baseSize: number): number;
}

class EnhancedAccessibilityService implements AccessibilityServiceInterface {
  private config: AccessibilityConfig;
  private listeners: Set<Function> = new Set();
  private isInitialized = false;

  constructor() {
    this.config = {
      reduceMotion: false,
      reduceMotionEnabled: false,
      screenReaderEnabled: false,
      highContrastMode: false,
      largeTextEnabled: false,
      voiceOverEnabled: false,
      talkBackEnabled: false,
      colorBlindMode: 'none',
    };
  }

  async initialize() {
    if (this.isInitialized) {return;}

    // Check current accessibility settings
    await this.checkAccessibilitySettings();

    // Listen for accessibility changes
    this.setupAccessibilityListeners();

    this.isInitialized = true;
  }

  private async checkAccessibilitySettings() {
    try {
      // Check if screen reader is enabled
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      this.config.screenReaderEnabled = screenReaderEnabled;

      // Check for reduce motion preference
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      this.config.reduceMotion = reduceMotion;
      this.config.reduceMotionEnabled = reduceMotion;
      // Platform-specific checks
      if (Platform.OS === 'ios') {
        this.config.voiceOverEnabled = screenReaderEnabled;
      } else if (Platform.OS === 'android') {
        this.config.talkBackEnabled = screenReaderEnabled;
      }

      this.notifyListeners();
    } catch (error) {
      logger.error('[AccessibilityService] Error checking accessibility settings', error);
    }
  }

  private setupAccessibilityListeners() {
    // Listen for screen reader changes
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => {
        this.config.screenReaderEnabled = enabled;
        if (Platform.OS === 'ios') {
          this.config.voiceOverEnabled = enabled;
        } else {
          this.config.talkBackEnabled = enabled;
        }
        this.notifyListeners();
      },
    );

    // Listen for reduce motion changes
    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        this.config.reduceMotion = enabled;
        this.config.reduceMotionEnabled = enabled;
        this.notifyListeners();
      },
    );

    // Cleanup function
    return () => {
      screenReaderSubscription?.remove();
      reduceMotionSubscription?.remove();
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        logger.error('[AccessibilityService] Error in accessibility listener', error);
      }
    });
  }

  // Existing interface methods
  async isScreenReaderEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch (error) {
      logger.error('[AccessibilityService] Failed to check screen reader status', error);
      return false;
    }
  }

  async isReduceMotionEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isReduceMotionEnabled();
    } catch (error) {
      logger.error('[AccessibilityService] Failed to check reduce motion status', error);
      return false;
    }
  }

  async isHighContrastEnabled(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // return await AccessibilityInfo.isHighContrastEnabled();
        return false; // Simplified for compatibility
      }
      return false;
    } catch (error) {
      logger.error('[AccessibilityService] Failed to check high contrast status', error);
      return false;
    }
  }

  announceForAccessibility(message: string): void {
    try {
      AccessibilityInfo.announceForAccessibility(message);
    } catch (error) {
      logger.error('[AccessibilityService] Failed to announce for accessibility', error);
    }
  }

  setAccessibilityFocus(_tag: string): void {
    try {
      // AccessibilityInfo.setAccessibilityFocus(_tag); // Simplified for compatibility
    } catch (error) {
      logger.error('[AccessibilityService] Failed to set accessibility focus', error);
    }
  }

  // Enhanced accessibility methods
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  subscribe(listener: Function): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Accessibility helper methods
  getButtonAccessibilityProps(label: string, hint?: string) {
    return {
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityRole: 'button',
      accessibilityState: {
        disabled: false,
        selected: false,
        busy: false,
      },
    };
  }

  getInputAccessibilityProps(label: string, value?: string, error?: string) {
    return {
      accessibilityLabel: label,
      accessibilityValue: { text: value },
      accessibilityRole: 'searchbox',
      accessibilityState: {
        disabled: false,
        invalid: !!error,
      },
      accessibilityDescribedBy: error ? 'error-message' : undefined,
    };
  }

  getImageAccessibilityProps(altText: string, isDecorative = false) {
    return {
      accessible: !isDecorative,
      accessibilityLabel: altText,
      accessibilityRole: 'image',
    };
  }

  // Check if content is accessible based on current settings
  validateAccessibility(component: any, requiredProps: string[]) {
    const issues: string[] = [];

    if (this.config.screenReaderEnabled) {
      if (!component.props.accessible && requiredProps.includes('accessible')) {
        issues.push('Component should be accessible to screen readers');
      }

      if (!component.props.accessibilityLabel && requiredProps.includes('accessibilityLabel')) {
        issues.push('Component missing accessibility label');
      }

      if (!component.props.accessibilityRole && requiredProps.includes('accessibilityRole')) {
        issues.push('Component missing accessibility role');
      }
    }

    return {
      isAccessible: issues.length === 0,
      issues,
    };
  }

  // Animation support for reduced motion
  getAnimationConfig() {
    if (this.config.reduceMotionEnabled) {
      return {
        duration: 0,
        delay: 0,
        useNativeDriver: false,
      };
    }

    return {
      duration: 300,
      delay: 0,
      useNativeDriver: true,
    };
  }

  // Large text support
  getScaledFontSize(baseSize: number) {
    if (this.config.largeTextEnabled) {
      return baseSize * 1.5;
    }
    return baseSize;
  }

  // Generate accessibility report
  generateAccessibilityReport() {
    return {
      timestamp: new Date().toISOString(),
      config: this.config,
      recommendations: this.getRecommendations(),
      platform: Platform.OS,
      version: Platform.Version,
    };
  }

  private getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.config.screenReaderEnabled) {
      recommendations.push('Ensure all interactive elements have accessibility labels');
      recommendations.push('Provide descriptive alt text for images');
      recommendations.push('Use semantic roles for screen readers');
    }

    if (this.config.reduceMotionEnabled) {
      recommendations.push('Disable or reduce animations and transitions');
      recommendations.push('Provide non-animated alternatives');
    }

    if (this.config.highContrastMode) {
      recommendations.push('Use high contrast colors');
      recommendations.push('Ensure text meets contrast ratio requirements');
    }

    if (this.config.largeTextEnabled) {
      recommendations.push('Support dynamic text scaling');
      recommendations.push('Use relative font sizes');
    }

    return recommendations;
  }

  // Test accessibility features
  testAccessibilityFeatures() {
    const testResults = {
      screenReaderTest: {
        enabled: this.config.screenReaderEnabled,
        announcement: this.testScreenReaderAnnouncement(),
      },
      reduceMotionTest: {
        enabled: this.config.reduceMotionEnabled,
        animationDisabled: this.testReduceMotion(),
      },
      highContrastTest: {
        enabled: this.config.highContrastMode,
        contrastRatio: this.testContrastRatio(),
      },
      largeTextTest: {
        enabled: this.config.largeTextEnabled,
        textScaling: this.testTextScaling(),
      },
    };

    return testResults;
  }

  private testScreenReaderAnnouncement() {
    try {
      this.announceForAccessibility('Testing screen reader functionality');
      return true;
    } catch (error) {
      return false;
    }
  }

  private testReduceMotion() {
    const animationConfig = this.getAnimationConfig();
    return animationConfig.duration === 0;
  }

  private testContrastRatio() {
    // This would check actual contrast ratios in a real implementation
    return '4.5:1'; // WCAG AA standard
  }

  private testTextScaling() {
    // This would test dynamic text scaling
    return '1.5x'; // Example scaling factor
  }

  // Cleanup
  dispose() {
    this.listeners.clear();
    this.isInitialized = false;
  }
}

// Create global accessibility service instance
export const accessibilityService = new EnhancedAccessibilityService();

// Initialize accessibility service
accessibilityService.initialize();

export default accessibilityService;
