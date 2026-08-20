/* eslint-disable @typescript-eslint/no-require-imports */
import { Alert, Linking } from 'react-native';
import { logger } from '../utils/logger';

export interface ShareContent {
  title: string;
  message: string;
  url?: string;
  type?: string;
  filename?: string;
  imageBase64?: string;
  subject?: string;
  email?: string;
}

export interface ShareTarget {
  social: string;
  whatsAppNumber?: string;
  email?: string;
  smsNumber?: string;
}

export interface ShareResponse {
  success: boolean;
  message?: string;
}

export interface ShareAnalytics {
  contentId: string;
  shareType: string;
  platform: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

class NativeSharingService {
  private analytics: ShareAnalytics[] = [];

  async shareContent(content: ShareContent): Promise<ShareResponse> {
    try {
      // Simplified share using Linking for now
      const shareText = `${content.title}\n\n${content.message}${content.url ? `\n\n${content.url}` : ''}`;
      const encodedText = encodeURIComponent(shareText);

      // Use a generic share URL (this would be platform-specific in real implementation)
      await Linking.openURL(`sms:?body=${encodedText}`);

      await this.trackShare({
        contentId: content.url || content.title,
        shareType: 'native',
        platform: 'system',
        timestamp: Date.now(),
        success: true,
      });

      return { success: true };
    } catch (  error: unknown) {
      logger.error('[NativeSharingService] Failed to share content', error);

      await this.trackShare({
        contentId: content.url || content.title,
        shareType: 'native',
        platform: 'system',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async shareToSocial(content: ShareContent, target: ShareTarget): Promise<ShareResponse> {
    try {
      const shareText = `${content.title}\n\n${content.message}${content.url ? `\n\n${content.url}` : ''}`;
      const encodedText = encodeURIComponent(shareText);

      // Simplified social sharing via system share
      await Linking.openURL(`sms:?body=${encodedText}`);

      await this.trackShare({
        contentId: content.url || content.title,
        shareType: 'social',
        platform: target.social,
        timestamp: Date.now(),
        success: true,
      });

      return { success: true };
    } catch (  error: unknown) {
      logger.error('[NativeSharingService] Failed to share to social platform', {
        platform: target.social,
        error,
      });

      await this.trackShare({
        contentId: content.url || content.title,
        shareType: 'social',
        platform: target.social,
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async shareViaSMS(content: ShareContent, phoneNumber?: string): Promise<void> {
    try {
      const message = encodeURIComponent(
        `${content.title}\n\n${content.message}${content.url ? `\n\n${content.url}` : ''}`,
      );

      const smsUrl = phoneNumber
        ? `sms:${phoneNumber}?body=${message}`
        : `sms:?body=${message}`;

      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);

        await this.trackShare({
          contentId: content.url || content.title,
          shareType: 'sms',
          platform: 'sms',
          timestamp: Date.now(),
          success: true,
        });
      } else {
        throw new Error('SMS not available on this device');
      }
    } catch (  error: unknown) {
      logger.error('[NativeSharingService] Failed to share via SMS', error);

      await this.trackShare({
        contentId: content.url || content.title,
        shareType: 'sms',
        platform: 'sms',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  async shareViaEmail(content: ShareContent, email?: string): Promise<void> {
    try {
      const subject = encodeURIComponent(content.subject || content.title);
      const body = encodeURIComponent(
        `${content.message}${content.url ? `\n\n${content.url}` : ''}`,
      );

      const emailUrl = email
        ? `mailto:${email}?subject=${subject}&body=${body}`
        : `mailto:?subject=${subject}&body=${body}`;

      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);

        await this.trackShare({
          contentId: content.url || content.title,
          shareType: 'email',
          platform: 'email',
          timestamp: Date.now(),
          success: true,
        });
      } else {
        throw new Error('Email not available on this device');
      }
    } catch (  error: unknown) {
      logger.error('[NativeSharingService] Failed to share via email', error);

      await this.trackShare({
        contentId: content.url || content.title,
        shareType: 'email',
        platform: 'email',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  async copyToClipboard(content: ShareContent): Promise<void> {
    try {
      const { Clipboard } = require('react-native');
      const textToCopy = `${content.title}\n\n${content.message}${content.url ? `\n\n${content.url}` : ''}`;

      await Clipboard.setString(textToCopy);

      Alert.alert('Success', 'Content copied to clipboard');

      await this.trackShare({
        contentId: content.url || content.title,
        shareType: 'clipboard',
        platform: 'clipboard',
        timestamp: Date.now(),
        success: true,
      });
    } catch (  error: unknown) {
      logger.error('[NativeSharingService] Failed to copy to clipboard', error);

      await this.trackShare({
        contentId: content.url || content.title,
        shareType: 'clipboard',
        platform: 'clipboard',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      Alert.alert('Error', 'Failed to copy to clipboard');
      throw error;
    }
  }

  async shareWithDeepLink(
    content: ShareContent,
    deepLinkPath: string,
    customMessage?: string,
  ): Promise<ShareResponse> {
    try {
      const deepLink = `geoleap://content/${deepLinkPath}`;
      const shareMessage = customMessage ||
        `Check out this content on GeoLeap: ${content.title}`;

      const fullMessage = `${shareMessage}\n\n${deepLink}`;
      const encodedMessage = encodeURIComponent(fullMessage);

      await Linking.openURL(`sms:?body=${encodedMessage}`);

      await this.trackShare({
        contentId: deepLinkPath,
        shareType: 'deeplink',
        platform: 'system',
        timestamp: Date.now(),
        success: true,
      });

      return { success: true };
    } catch (  error: unknown) {
      logger.error('[NativeSharingService] Failed to share with deep link', error);

      await this.trackShare({
        contentId: deepLinkPath,
        shareType: 'deeplink',
        platform: 'system',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  getAvailableShareOptions(): string[] {
    const baseOptions = ['native', 'sms', 'email', 'clipboard'];
    return baseOptions;
  }

  async isShareOptionAvailable(option: string): Promise<boolean> {
    try {
      const availableOptions = this.getAvailableShareOptions();
      return availableOptions.includes(option);
    } catch (error) {
      logger.error('[NativeSharingService] Failed to check availability for share option', {
        option,
        error,
      });
      return false;
    }
  }

  private async trackShare(analytics: ShareAnalytics): Promise<void> {
    try {
      this.analytics.push(analytics);

      if (this.analytics.length > 1000) {
        this.analytics = this.analytics.slice(-1000);
      }

      logger.debug('[NativeSharingService] Share analytics tracked', analytics);
    } catch (error) {
      logger.error('[NativeSharingService] Failed to track share analytics', error);
    }
  }

  getShareAnalytics(): ShareAnalytics[] {
    return [...this.analytics];
  }

  getShareStatistics(): {
    totalShares: number;
    successfulShares: number;
    failedShares: number;
    mostUsedPlatform: string;
    sharesByType: Record<string, number>;
  } {
    const totalShares = this.analytics.length;
    const successfulShares = this.analytics.filter(a => a.success).length;
    const failedShares = totalShares - successfulShares;

    const platformCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    this.analytics.forEach(analytics => {
      platformCounts[analytics.platform] = (platformCounts[analytics.platform] || 0) + 1;
      typeCounts[analytics.shareType] = (typeCounts[analytics.shareType] || 0) + 1;
    });

    const mostUsedPlatform = Object.keys(platformCounts).reduce(
      (a, b) => platformCounts[a] > platformCounts[b] ? a : b,
      'unknown',
    );

    return {
      totalShares,
      successfulShares,
      failedShares,
      mostUsedPlatform,
      sharesByType: typeCounts,
    };
  }

  clearAnalytics(): void {
    this.analytics = [];
  }
}

export const nativeSharingService = new NativeSharingService();
export default nativeSharingService;
