/**
 * NotificationTemplates Tests
 *
 * Tests notification template management with template registration and creation.
 */

import { NotificationTemplates } from '../../services/notificationTemplates';
import { NotificationTemplate } from '../../services/notificationTemplates';
import { logger } from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('NotificationTemplates', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Template Registration', () => {
    it('should register a new template', () => {
      const customTemplate: NotificationTemplate = {
        id: 'custom_test',
        name: 'Custom Test',
        category: 'test',
        template: (data) => ({
          id: `custom_${Date.now()}`,
          title: data.title || 'Test Title',
          body: data.body || 'Test Body',
          category: 'test',
          priority: 'normal',
        }),
      };

      NotificationTemplates.registerTemplate(customTemplate);

      const retrieved = NotificationTemplates.getTemplate('custom_test');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('custom_test');
      expect(retrieved?.name).toBe('Custom Test');
    });

    it('should overwrite existing template with same ID', () => {
      const template1: NotificationTemplate = {
        id: 'test_overwrite',
        name: 'Original',
        category: 'test',
        template: () => ({ id: '1', title: 'Original', body: 'Original', category: 'test', priority: 'normal' }),
      };

      const template2: NotificationTemplate = {
        id: 'test_overwrite',
        name: 'Updated',
        category: 'test',
        template: () => ({ id: '2', title: 'Updated', body: 'Updated', category: 'test', priority: 'normal' }),
      };

      NotificationTemplates.registerTemplate(template1);
      NotificationTemplates.registerTemplate(template2);

      const retrieved = NotificationTemplates.getTemplate('test_overwrite');
      expect(retrieved?.name).toBe('Updated');
    });
  });

  describe('Get Template', () => {
    it('should get pre-registered security_alert template', () => {
      const template = NotificationTemplates.getTemplate('security_alert');

      expect(template).toBeDefined();
      expect(template?.id).toBe('security_alert');
      expect(template?.name).toBe('Security Alert');
      expect(template?.category).toBe('security');
    });

    it('should get pre-registered connection_status template', () => {
      const template = NotificationTemplates.getTemplate('connection_status');

      expect(template).toBeDefined();
      expect(template?.id).toBe('connection_status');
      expect(template?.name).toBe('Connection Status');
    });

    it('should get pre-registered server_maintenance template', () => {
      const template = NotificationTemplates.getTemplate('server_maintenance');

      expect(template).toBeDefined();
      expect(template?.id).toBe('server_maintenance');
      expect(template?.name).toBe('Server Maintenance');
    });

    it('should get pre-registered promotional template', () => {
      const template = NotificationTemplates.getTemplate('promotional');

      expect(template).toBeDefined();
      expect(template?.id).toBe('promotional');
      expect(template?.name).toBe('Promotional');
      expect(template?.category).toBe('promotional');
    });

    it('should return undefined for non-existent template', () => {
      const template = NotificationTemplates.getTemplate('non_existent');

      expect(template).toBeUndefined();
    });
  });

  describe('Get All Templates', () => {
    it('should return all registered templates', () => {
      const allTemplates = NotificationTemplates.getAllTemplates();

      expect(allTemplates).toBeInstanceOf(Array);
      expect(allTemplates.length).toBeGreaterThanOrEqual(9); // At least 9 pre-registered templates
    });

    it('should include all pre-registered template IDs', () => {
      const allTemplates = NotificationTemplates.getAllTemplates();
      const templateIds = allTemplates.map(t => t.id);

      expect(templateIds).toContain('security_alert');
      expect(templateIds).toContain('connection_status');
      expect(templateIds).toContain('server_maintenance');
      expect(templateIds).toContain('promotional');
      expect(templateIds).toContain('data_usage');
      expect(templateIds).toContain('speed_test');
      expect(templateIds).toContain('new_feature');
      expect(templateIds).toContain('feedback_request');
      expect(templateIds).toContain('support_chat');
    });
  });

  describe('Create Notification from Template - Security Alert', () => {
    it('should create notification from security_alert template with data', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('security_alert', {
        message: 'Suspicious login detected',
        alertType: 'login_attempt',
        severity: 'high',
        deepLink: 'geoleap://security/alert/123',
      });

      expect(notification).toBeDefined();
      expect(notification?.title).toBe('Security Alert');
      expect(notification?.body).toBe('Suspicious login detected');
      expect(notification?.category).toBe('security');
      expect(notification?.priority).toBe('high');
      expect(notification?.actions).toHaveLength(2);
      expect(notification?.deepLink).toBe('geoleap://security/alert/123');
      expect(notification?.data?.alertType).toBe('login_attempt');
      expect(notification?.data?.severity).toBe('high');
    });

    it('should create notification from security_alert template with defaults', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('security_alert', {});

      expect(notification).toBeDefined();
      expect(notification?.title).toBe('Security Alert');
      expect(notification?.body).toBe('A security event requires your attention');
      expect(notification?.deepLink).toBe('geoleap://security/alerts');
    });
  });

  describe('Create Notification from Template - Connection Status', () => {
    it('should create connected notification', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('connection_status', {
        connected: true,
        serverName: 'US East',
        location: 'New York',
        ip: '192.168.1.1',
      });

      expect(notification).toBeDefined();
      expect(notification?.title).toBe('VPN Connected');
      expect(notification?.body).toBe('Connected to US East');
      expect(notification?.priority).toBe('normal');
      expect(notification?.deepLink).toBe('geoleap://status');
      expect(notification?.data?.connected).toBe(true);
      expect(notification?.data?.serverName).toBe('US East');
    });

    it('should create disconnected notification', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('connection_status', {
        connected: false,
      });

      expect(notification).toBeDefined();
      expect(notification?.title).toBe('VPN Disconnected');
      expect(notification?.body).toBe('Your VPN connection has been lost');
      expect(notification?.priority).toBe('high');
      expect(notification?.deepLink).toBe('geoleap://connect');
      expect(notification?.data?.connected).toBe(false);
    });

    it('should use default server name when not provided for connected state', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('connection_status', {
        connected: true,
      });

      expect(notification?.body).toBe('Connected to VPN server');
    });
  });

  describe('Create Notification from Template - Server Maintenance', () => {
    it('should create server maintenance notification with full data', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('server_maintenance', {
        serverName: 'US West',
        schedule: 'tomorrow at 3 AM EST',
        duration: '2 hours',
        affectedServers: ['US West 1', 'US West 2'],
      });

      expect(notification).toBeDefined();
      expect(notification?.title).toBe('Server Maintenance');
      expect(notification?.body).toBe('US West will undergo maintenance tomorrow at 3 AM EST');
      expect(notification?.category).toBe('updates');
      expect(notification?.priority).toBe('normal');
      expect(notification?.data?.serverName).toBe('US West');
      expect(notification?.data?.duration).toBe('2 hours');
    });

    it('should use defaults when data not provided', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('server_maintenance', {});

      expect(notification?.body).toBe('Server will undergo maintenance soon');
    });
  });

  describe('Create Notification from Template - Promotional', () => {
    it('should create promotional notification with custom data', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('promotional', {
        title: '50% Off Premium',
        message: 'Limited time offer - upgrade now!',
        promoCode: 'SAVE50',
        imageUrl: 'https://example.com/promo.png',
        deepLink: 'geoleap://promo/save50',
      });

      expect(notification).toBeDefined();
      expect(notification?.title).toBe('50% Off Premium');
      expect(notification?.body).toBe('Limited time offer - upgrade now!');
      expect(notification?.category).toBe('promotional');
      expect(notification?.priority).toBe('low');
      expect(notification?.data?.promoCode).toBe('SAVE50');
      expect(notification?.imageUrl).toBe('https://example.com/promo.png');
    });

    it('should use default promotional values', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('promotional', {});

      expect(notification?.title).toBe('Special Offer');
      expect(notification?.body).toBe('Don\'t miss out on this limited-time offer!');
      expect(notification?.deepLink).toBe('geoleap://promotions');
    });
  });

  describe('Create Notification from Template - Data Usage', () => {
    it('should create data usage notification', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('data_usage', {
        usedGB: 5.2,
        totalGB: 10,
        isOverLimit: false,
      });

      expect(notification).toBeDefined();
      expect(notification?.title).toContain('Data Usage');
      expect(notification?.category).toBe('default');
      expect(notification?.data?.usedGB).toBe(5.2);
      expect(notification?.data?.totalGB).toBe(10);
    });
  });

  describe('Create Notification from Template - Speed Test', () => {
    it('should create speed test notification', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('speed_test', {
        download: 150.5,
        upload: 50.2,
        ping: 15,
        server: 'US East',
      });

      expect(notification).toBeDefined();
      expect(notification?.title).toContain('Speed Test');
      expect(notification?.category).toBe('default');
      expect(notification?.data?.download).toBe(150.5);
      expect(notification?.data?.ping).toBe(15);
    });
  });

  describe('Create Notification from Template - New Feature', () => {
    it('should create new feature notification', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('new_feature', {
        featureName: 'Kill Switch',
        description: 'Protect your privacy with automatic disconnect',
      });

      expect(notification).toBeDefined();
      expect(notification?.title).toContain('New Feature');
      expect(notification?.category).toBe('updates');
      expect(notification?.data?.featureName).toBe('Kill Switch');
    });
  });

  describe('Create Notification from Template - Feedback', () => {
    it('should create feedback notification', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('feedback_request', {
        surveyId: 'survey_123',
        incentive: '$5 Amazon Gift Card',
      });

      expect(notification).toBeDefined();
      expect(notification?.title).toContain('How are we doing');
      expect(notification?.category).toBe('promotional');
      expect(notification?.data?.surveyId).toBe('survey_123');
      expect(notification?.data?.incentive).toBe('$5 Amazon Gift Card');
    });
  });

  describe('Create Notification from Template - Support Chat', () => {
    it('should create support chat notification', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('support_chat', {
        message: 'Agent John replied to your ticket',
        chatId: 'chat_456',
        supportAgent: 'John',
        ticketNumber: 'TKT-789',
      });

      expect(notification).toBeDefined();
      expect(notification?.title).toBe('Support Message');
      expect(notification?.body).toBe('Agent John replied to your ticket');
      expect(notification?.category).toBe('default');
      expect(notification?.data?.chatId).toBe('chat_456');
      expect(notification?.data?.ticketNumber).toBe('TKT-789');
    });

    it('should use default message when not provided', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('support_chat', {});

      expect(notification?.body).toBe('You have a new message from support');
    });
  });

  describe('Error Handling', () => {
    it('should return null for non-existent template', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('non_existent', {});

      expect(notification).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        '[NotificationTemplates] Template not found',
        { templateId: 'non_existent' }
      );
    });

    it('should return null and log error when template function throws', () => {
      const brokenTemplate: NotificationTemplate = {
        id: 'broken_template',
        name: 'Broken',
        category: 'test',
        template: () => {
          throw new Error('Template error');
        },
      };

      NotificationTemplates.registerTemplate(brokenTemplate);

      const notification = NotificationTemplates.createNotificationFromTemplate('broken_template', {});

      expect(notification).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        '[NotificationTemplates] Failed to create notification from template',
        expect.objectContaining({
          templateId: 'broken_template',
          error: expect.any(Error),
        })
      );
    });
  });

  describe('Template Data Validation', () => {
    it('should handle empty data object for all templates', () => {
      const templateIds = ['security_alert', 'connection_status', 'server_maintenance',
                           'promotional', 'data_usage', 'speed_test', 'new_feature',
                           'feedback_request', 'support_chat'];

      templateIds.forEach(templateId => {
        const notification = NotificationTemplates.createNotificationFromTemplate(templateId, {});
        expect(notification).toBeDefined();
        expect(notification?.id).toBeDefined();
        expect(notification?.title).toBeDefined();
        expect(notification?.body).toBeDefined();
      });
    });

    it('should generate unique IDs with timestamps', async () => {
      const notification1 = NotificationTemplates.createNotificationFromTemplate('security_alert', {});

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2));

      const notification2 = NotificationTemplates.createNotificationFromTemplate('security_alert', {});

      expect(notification1?.id).toBeDefined();
      expect(notification2?.id).toBeDefined();
      expect(notification1?.id).toMatch(/^security_\d+$/);
      expect(notification2?.id).toMatch(/^security_\d+$/);
      // IDs should be different due to Date.now()
      expect(notification1?.id).not.toBe(notification2?.id);
    });
  });

  describe('Template Actions', () => {
    it('should include actions in security_alert template', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('security_alert', {});

      expect(notification?.actions).toHaveLength(2);
      expect(notification?.actions?.[0].id).toBe('view_details');
      expect(notification?.actions?.[1].id).toBe('dismiss');
      expect(notification?.actions?.[1].type).toBe('destructive');
    });

    it('should include different actions based on connection state', () => {
      const connectedNotif = NotificationTemplates.createNotificationFromTemplate('connection_status', {
        connected: true,
      });

      const disconnectedNotif = NotificationTemplates.createNotificationFromTemplate('connection_status', {
        connected: false,
      });

      expect(connectedNotif?.actions).toHaveLength(2);
      expect(connectedNotif?.actions?.[0].id).toBe('view_status');
      expect(connectedNotif?.actions?.[1].id).toBe('disconnect');

      expect(disconnectedNotif?.actions).toHaveLength(2);
      expect(disconnectedNotif?.actions?.[0].id).toBe('reconnect');
      expect(disconnectedNotif?.actions?.[1].id).toBe('view_servers');
    });

    it('should include input action in support_chat template', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('support_chat', {});

      expect(notification?.actions).toHaveLength(2);
      const replyAction = notification?.actions?.find(a => a.id === 'reply');
      expect(replyAction?.type).toBe('input');
      expect(replyAction?.placeholder).toBe('Type your reply...');
    });
  });

  describe('Template Categories', () => {
    it('should have correct categories for all templates', () => {
      const expectations = [
        { id: 'security_alert', category: 'security' },
        { id: 'connection_status', category: 'default' },
        { id: 'server_maintenance', category: 'updates' },
        { id: 'promotional', category: 'promotional' },
        { id: 'data_usage', category: 'default' },
        { id: 'speed_test', category: 'default' },
        { id: 'new_feature', category: 'updates' },
        { id: 'feedback_request', category: 'promotional' },
        { id: 'support_chat', category: 'default' },
      ];

      expectations.forEach(({ id, category }) => {
        const notification = NotificationTemplates.createNotificationFromTemplate(id, {});
        expect(notification?.category).toBe(category);
      });
    });
  });

  describe('Template Priorities', () => {
    it('should assign correct priorities', () => {
      const securityNotif = NotificationTemplates.createNotificationFromTemplate('security_alert', {});
      expect(securityNotif?.priority).toBe('high');

      const promoNotif = NotificationTemplates.createNotificationFromTemplate('promotional', {});
      expect(promoNotif?.priority).toBe('low');

      const maintenanceNotif = NotificationTemplates.createNotificationFromTemplate('server_maintenance', {});
      expect(maintenanceNotif?.priority).toBe('normal');
    });

    it('should assign high priority to disconnected state', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('connection_status', {
        connected: false,
      });

      expect(notification?.priority).toBe('high');
    });

    it('should assign normal priority to connected state', () => {
      const notification = NotificationTemplates.createNotificationFromTemplate('connection_status', {
        connected: true,
      });

      expect(notification?.priority).toBe('normal');
    });
  });
});
