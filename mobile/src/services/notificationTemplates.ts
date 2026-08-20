import { NotificationData } from './notificationService';
import { logger } from '../utils/logger';

export interface NotificationTemplate {
  id: string;
  name: string;
  category: string;
  template: (data: Record<string, any>) => NotificationData;
}

class NotificationTemplatesClass {
  private static templates: Map<string, NotificationTemplate> = new Map();

  static registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  static getTemplate(templateId: string): NotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  static getAllTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  static createNotificationFromTemplate(templateId: string, data: Record<string, any>): NotificationData | null {
    const template = this.getTemplate(templateId);
    if (!template) {
      logger.warn('[NotificationTemplates] Template not found', { templateId });
      return null;
    }

    try {
      return template.template(data);
    } catch (error) {
      logger.error('[NotificationTemplates] Failed to create notification from template', { templateId, error });
      return null;
    }
  }
}

// Security Alert Template
const securityAlertTemplate: NotificationTemplate = {
  id: 'security_alert',
  name: 'Security Alert',
  category: 'security',
  template: (data) => ({
    id: `security_${Date.now()}`,
    title: 'Security Alert',
    body: data.message || 'A security event requires your attention',
    imageUrl: data.imageUrl || 'https://example.com/icons/security-alert.png',
    category: 'security',
    priority: 'high',
    actions: [
      { id: 'view_details', title: 'View Details', type: undefined },
      { id: 'dismiss', title: 'Dismiss', type: 'destructive' },
    ],
    deepLink: data.deepLink || 'geoleap://security/alerts',
    data: {
      alertType: data.alertType,
      severity: data.severity,
      timestamp: new Date().toISOString(),
    },
    sound: 'security_alert.mp3',
  }),
};

// Connection Status Template
const connectionStatusTemplate: NotificationTemplate = {
  id: 'connection_status',
  name: 'Connection Status',
  category: 'default',
  template: (data) => ({
    id: `connection_${Date.now()}`,
    title: data.connected ? 'VPN Connected' : 'VPN Disconnected',
    body: data.connected
      ? `Connected to ${data.serverName || 'VPN server'}`
      : 'Your VPN connection has been lost',
    imageUrl: data.connected
      ? 'https://example.com/icons/connected.png'
      : 'https://example.com/icons/disconnected.png',
    category: 'default',
    priority: data.connected ? 'normal' : 'high',
    actions: data.connected
      ? [
          { id: 'view_status', title: 'View Status' },
          { id: 'disconnect', title: 'Disconnect', type: 'destructive' },
        ]
      : [
          { id: 'reconnect', title: 'Reconnect' },
          { id: 'view_servers', title: 'Choose Server' },
        ],
    deepLink: data.connected
      ? 'geoleap://status'
      : 'geoleap://connect',
    data: {
      connected: data.connected,
      serverName: data.serverName,
      location: data.location,
      ip: data.ip,
    },
  }),
};

// Server Maintenance Template
const serverMaintenanceTemplate: NotificationTemplate = {
  id: 'server_maintenance',
  name: 'Server Maintenance',
  category: 'updates',
  template: (data) => ({
    id: `maintenance_${Date.now()}`,
    title: 'Server Maintenance',
    body: `${data.serverName || 'Server'} will undergo maintenance ${data.schedule || 'soon'}`,
    imageUrl: 'https://example.com/icons/maintenance.png',
    category: 'updates',
    priority: 'normal',
    actions: [
      { id: 'view_schedule', title: 'View Schedule' },
      { id: 'find_alternative', title: 'Find Alternative' },
    ],
    deepLink: 'geoleap://servers/maintenance',
    data: {
      serverName: data.serverName,
      schedule: data.schedule,
      duration: data.duration,
      affectedServers: data.affectedServers,
    },
  }),
};

// Promotional Template
const promotionalTemplate: NotificationTemplate = {
  id: 'promotional',
  name: 'Promotional',
  category: 'promotional',
  template: (data) => ({
    id: `promo_${Date.now()}`,
    title: data.title || 'Special Offer',
    body: data.message || 'Don\'t miss out on this limited-time offer!',
    imageUrl: data.imageUrl || 'https://example.com/icons/promotion.png',
    category: 'promotional',
    priority: 'low',
    actions: [
      { id: 'view_offer', title: 'View Offer' },
      { id: 'dismiss', title: 'Not Interested', type: 'destructive' },
    ],
    deepLink: data.deepLink || 'geoleap://promotions',
    data: {
      promoCode: data.promoCode,
      discount: data.discount,
      validUntil: data.validUntil,
    },
  }),
};

// Data Usage Alert Template
const dataUsageTemplate: NotificationTemplate = {
  id: 'data_usage',
  name: 'Data Usage Alert',
  category: 'default',
  template: (data) => ({
    id: `data_${Date.now()}`,
    title: 'Data Usage Alert',
    body: `You've used ${data.usedGB || 0}GB of data this month`,
    imageUrl: 'https://example.com/icons/data-usage.png',
    category: 'default',
    priority: data.isOverLimit ? 'high' : 'normal',
    actions: [
      { id: 'view_usage', title: 'View Usage' },
      { id: 'manage_plan', title: 'Manage Plan' },
    ],
    deepLink: 'geoleap://usage',
    data: {
      usedGB: data.usedGB,
      totalGB: data.totalGB,
      isOverLimit: data.isOverLimit,
      billingCycle: data.billingCycle,
    },
  }),
};

// Speed Test Results Template
const speedTestTemplate: NotificationTemplate = {
  id: 'speed_test',
  name: 'Speed Test Results',
  category: 'default',
  template: (data) => ({
    id: `speed_${Date.now()}`,
    title: 'Speed Test Complete',
    body: `Download: ${data.download || 0} Mbps, Upload: ${data.upload || 0} Mbps`,
    imageUrl: 'https://example.com/icons/speed-test.png',
    category: 'default',
    priority: 'normal',
    actions: [
      { id: 'view_results', title: 'View Results' },
      { id: 'run_again', title: 'Test Again' },
    ],
    deepLink: 'geoleap://speed-test/results',
    data: {
      download: data.download,
      upload: data.upload,
      ping: data.ping,
      server: data.server,
      timestamp: new Date().toISOString(),
    },
  }),
};

// New Feature Template
const newFeatureTemplate: NotificationTemplate = {
  id: 'new_feature',
  name: 'New Feature',
  category: 'updates',
  template: (data) => ({
    id: `feature_${Date.now()}`,
    title: 'New Feature Available',
    body: data.description || 'Check out the latest feature in the app!',
    imageUrl: data.imageUrl || 'https://example.com/icons/new-feature.png',
    category: 'updates',
    priority: 'normal',
    actions: [
      { id: 'try_feature', title: 'Try Now' },
      { id: 'learn_more', title: 'Learn More' },
    ],
    deepLink: data.deepLink || 'geoleap://features/new',
    data: {
      featureName: data.featureName,
      version: data.version,
      releaseDate: data.releaseDate,
    },
  }),
};

// Survey/Feedback Template
const feedbackTemplate: NotificationTemplate = {
  id: 'feedback_request',
  name: 'Feedback Request',
  category: 'promotional',
  template: (data) => ({
    id: `feedback_${Date.now()}`,
    title: 'How are we doing?',
    body: data.message || 'Help us improve by sharing your feedback',
    imageUrl: 'https://example.com/icons/feedback.png',
    category: 'promotional',
    priority: 'low',
    actions: [
      { id: 'give_feedback', title: 'Give Feedback' },
      { id: 'rate_app', title: 'Rate App' },
      { id: 'remind_later', title: 'Remind Later' },
    ],
    deepLink: 'geoleap://feedback',
    data: {
      surveyId: data.surveyId,
      incentive: data.incentive,
    },
  }),
};

// Chat Support Template
const supportChatTemplate: NotificationTemplate = {
  id: 'support_chat',
  name: 'Support Chat',
  category: 'default',
  template: (data) => ({
    id: `chat_${Date.now()}`,
    title: 'Support Message',
    body: data.message || 'You have a new message from support',
    imageUrl: 'https://example.com/icons/support.png',
    category: 'default',
    priority: 'normal',
    actions: [
      { id: 'open_chat', title: 'Open Chat' },
      { id: 'reply', title: 'Reply', type: 'input', placeholder: 'Type your reply...' },
    ],
    deepLink: 'geoleap://support/chat',
    data: {
      chatId: data.chatId,
      supportAgent: data.supportAgent,
      ticketNumber: data.ticketNumber,
    },
  }),
};

export const NotificationTemplates = NotificationTemplatesClass;

// Register all templates
const initializeTemplates = () => {
  NotificationTemplates.registerTemplate(securityAlertTemplate);
  NotificationTemplates.registerTemplate(connectionStatusTemplate);
  NotificationTemplates.registerTemplate(serverMaintenanceTemplate);
  NotificationTemplates.registerTemplate(promotionalTemplate);
  NotificationTemplates.registerTemplate(dataUsageTemplate);
  NotificationTemplates.registerTemplate(speedTestTemplate);
  NotificationTemplates.registerTemplate(newFeatureTemplate);
  NotificationTemplates.registerTemplate(feedbackTemplate);
  NotificationTemplates.registerTemplate(supportChatTemplate);
};

// Initialize templates when module is loaded
initializeTemplates();
export default NotificationTemplatesClass;
