import { AccessibilityInfo, Alert, Platform } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import { logger } from '../../utils/logger';

export interface AccessibilitySettings {
  reduceMotion: boolean;
  screenReaderEnabled: boolean;
  highContrastMode: boolean;
  largeTextEnabled: boolean;
}

export class AccessibilityService {
  private static instance: AccessibilityService;
  private settings: AccessibilitySettings = {
    reduceMotion: false,
    screenReaderEnabled: false,
    highContrastMode: false,
    largeTextEnabled: false,
  };
  private listeners: Array<(settings: AccessibilitySettings) => void> = [];
  private subscriptions: EmitterSubscription[] = [];

  private constructor() {
    this.initializeAccessibilitySettings();
  }

  public static getInstance(): AccessibilityService {
    if (!AccessibilityService.instance) {
      AccessibilityService.instance = new AccessibilityService();
    }
    return AccessibilityService.instance;
  }

  /**
   * Initialize accessibility settings and listeners
   */
  private async initializeAccessibilitySettings(): Promise<void> {
    try {
      // Check current accessibility settings
      const [reduceMotion, screenReader, highContrast, largeText] = await Promise.all([
        this.isReduceMotionEnabled(),
        this.isScreenReaderEnabled(),
        this.isHighContrastEnabled(),
        this.isLargeTextEnabled(),
      ]);

      this.settings = {
        reduceMotion,
        screenReaderEnabled: screenReader,
        highContrastMode: highContrast,
        largeTextEnabled: largeText,
      };

      // Set up listeners for changes
      this.setupAccessibilityListeners();
    } catch (error) {
      logger.warn('[AccessibilityService] Failed to initialize accessibility settings', error);
    }
  }

  /**
   * Set up listeners for accessibility changes
   */
  private setupAccessibilityListeners(): void {
    // Listen for reduce motion changes - store subscription for cleanup
    const reduceMotionSub = AccessibilityInfo.addEventListener('reduceMotionChanged', (isReduced) => {
      this.updateSetting('reduceMotion', isReduced);
    });
    this.subscriptions.push(reduceMotionSub);

    // Listen for screen reader changes - store subscription for cleanup
    const screenReaderSub = AccessibilityInfo.addEventListener('screenReaderChanged', (isEnabled) => {
      this.updateSetting('screenReaderEnabled', isEnabled);
    });
    this.subscriptions.push(screenReaderSub);

    // Add platform-specific listeners
    if (Platform.OS === 'ios') {
      const changeSub = AccessibilityInfo.addEventListener('change', () => {
        this.refreshAccessibilitySettings();
      });
      this.subscriptions.push(changeSub);
    }
  }

  /**
   * Clean up all subscriptions to prevent memory leaks
   */
  public dispose(): void {
    this.subscriptions.forEach(sub => sub.remove());
    this.subscriptions = [];
    this.listeners = [];
  }

  /**
   * Update a specific setting and notify listeners
   */
  private updateSetting(key: keyof AccessibilitySettings, value: boolean): void {
    if (this.settings[key] !== value) {
      this.settings[key] = value;
      this.notifyListeners();
    }
  }

  /**
   * Notify all listeners of accessibility changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.settings }));
  }

  /**
   * Refresh all accessibility settings
   */
  private async refreshAccessibilitySettings(): Promise<void> {
    try {
      const [reduceMotion, screenReader, highContrast, largeText] = await Promise.all([
        this.isReduceMotionEnabled(),
        this.isScreenReaderEnabled(),
        this.isHighContrastEnabled(),
        this.isLargeTextEnabled(),
      ]);

      const newSettings = {
        reduceMotion,
        screenReaderEnabled: screenReader,
        highContrastMode: highContrast,
        largeTextEnabled: largeText,
      };

      // Only update if settings changed
      if (JSON.stringify(this.settings) !== JSON.stringify(newSettings)) {
        this.settings = newSettings;
        this.notifyListeners();
      }
    } catch (error) {
      logger.warn('[AccessibilityService] Failed to refresh accessibility settings', error);
    }
  }

  /**
   * Check if reduce motion is enabled
   */
  public async isReduceMotionEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isReduceMotionEnabled();
    } catch (error) {
      logger.warn('[AccessibilityService] Failed to check reduce motion', error);
      return false;
    }
  }

  /**
   * Check if screen reader is enabled
   */
  public async isScreenReaderEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch (error) {
      logger.warn('[AccessibilityService] Failed to check screen reader', error);
      return false;
    }
  }

  /**
   * Check if high contrast mode is enabled (iOS)
   */
  public async isHighContrastEnabled(): Promise<boolean> {
    try {
      // This is a platform-specific check that may not be available on all platforms
      return Platform.OS === 'ios' ? false : false; // Placeholder
    } catch (error) {
      logger.warn('[AccessibilityService] Failed to check high contrast', error);
      return false;
    }
  }

  /**
   * Check if large text is enabled
   */
  public async isLargeTextEnabled(): Promise<boolean> {
    // This would require additional platform-specific implementation
    return false; // Placeholder
  }

  /**
   * Get current accessibility settings
   */
  public getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  /**
   * Add listener for accessibility changes
   */
  public addListener(listener: (settings: AccessibilitySettings) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get accessibility-aware animation duration
   */
  public getAnimationDuration(defaultDuration: number): number {
    return this.settings.reduceMotion ? 0 : defaultDuration;
  }

  /**
   * Get appropriate font size based on settings
   */
  public getFontSize(baseSize: number): number {
    return this.settings.largeTextEnabled ? baseSize * 1.2 : baseSize;
  }

  /**
   * Get accessible colors based on contrast settings
   */
  public getAccessibleColors(defaultColors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  }): typeof defaultColors {
    if (this.settings.highContrastMode) {
      return {
        primary: '#000000',
        secondary: '#FFFFFF',
        background: '#FFFFFF',
        text: '#000000',
      };
    }
    return defaultColors;
  }

  /**
   * Generate accessibility labels for common components
   */
  public generateAccessibilityLabel(
    type: 'button' | 'input' | 'image' | 'link' | 'list' | 'item',
    content: string,
    additionalInfo?: string,
  ): string {
    let label = content;

    switch (type) {
      case 'button':
        label = `Button: ${content}`;
        break;
      case 'input':
        label = `Input field: ${content}`;
        break;
      case 'image':
        label = `Image: ${content}`;
        break;
      case 'link':
        label = `Link: ${content}`;
        break;
      case 'list':
        label = `List: ${content}`;
        break;
      case 'item':
        label = `Item: ${content}`;
        break;
    }

    if (additionalInfo) {
      label += `, ${additionalInfo}`;
    }

    return label;
  }

  /**
   * Generate accessibility hints for better context
   */
  public generateAccessibilityHint(
    action: string,
    result?: string,
  ): string {
    let hint = `Double tap to ${action}`;
    if (result) {
      hint += `. ${result}`;
    }
    return hint;
  }

  /**
   * Check if an element should be focusable
   */
  public isFocusable(
    type: string,
    hasAccessibilityLabel: boolean = true,
  ): boolean {
    const focusableTypes = ['button', 'link', 'input', 'tab'];
    return focusableTypes.includes(type) && hasAccessibilityLabel;
  }

  /**
   * Get accessible properties for common UI elements
   */
  public getAccessibleProps(
    type: 'button' | 'input' | 'image' | 'link' | 'list' | 'item',
    label: string,
    hint?: string,
    selected?: boolean,
  ): {
    accessible: boolean;
    accessibilityLabel: string;
    accessibilityHint?: string;
    accessibilityRole?: string;
    accessibilityState?: { selected?: boolean };
    accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  } {
    return {
      accessible: true,
      accessibilityLabel: this.generateAccessibilityLabel(type, label),
      accessibilityHint: hint ? this.generateAccessibilityHint(hint) : undefined,
      accessibilityRole: type === 'item' ? 'button' : type,
      accessibilityState: selected !== undefined ? { selected } : undefined,
      accessibilityLiveRegion: type === 'list' ? 'polite' : 'none',
    };
  }

  /**
   * Announce important changes to screen reader users
   */
  public announce(message: string): void {
    if (this.settings.screenReaderEnabled) {
      // Use a platform-appropriate method to announce
      AccessibilityInfo.announceForAccessibility?.(message);
    }
  }

  /**
   * Show accessibility help dialog
   */
  public showAccessibilityHelp(): void {
    const helpText = `
Accessibility Features:

• Screen Reader: Full support for VoiceOver and TalkBack
• High Contrast: Enhanced color contrast for better visibility
• Large Text: Automatically adjusts font sizes
• Reduce Motion: Disables animations for better performance
• Keyboard Navigation: Full keyboard support where applicable

For more help, contact support@geoleap.com
    `.trim();

    Alert.alert('Accessibility Help', helpText);
  }

  /**
   * Validate accessibility compliance for a component
   */
  public validateComponent(
    componentName: string,
    props: Record<string, any>,
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for accessibility label
    if (!props.accessibilityLabel && !props.accessibilityLabelledBy) {
      issues.push(`${componentName}: Missing accessibility label`);
    }

    // Check for accessibility role if needed
    if (props.accessible && !props.accessibilityRole) {
      issues.push(`${componentName}: Missing accessibility role`);
    }

    // Check for proper hint on interactive elements
    if (props.onPress && !props.accessibilityHint) {
      issues.push(`${componentName}: Interactive element missing accessibility hint`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get platform-specific accessibility shortcuts
   */
  public getAccessibilityShortcuts(): Record<string, string> {
    if (Platform.OS === 'ios') {
      return {
        'VoiceOver': 'Triple-click Home or Side button',
        'Zoom': 'Triple-click with three fingers',
        'Large Text': 'Settings > Display & Brightness > Text Size',
        'Reduce Motion': 'Settings > Accessibility > Motion',
      };
    } else {
      return {
        'TalkBack': 'Volume up + Volume down (3 seconds)',
        'Select to Speak': 'Settings > Accessibility > Select to Speak',
        'Large Text': 'Settings > Accessibility > Display > Font size',
        'Reduce Motion': 'Settings > Accessibility > Remove animations',
      };
    }
  }
}

// Export singleton instance
export const accessibilityService = AccessibilityService.getInstance();
