/**
 * @jest-environment jsdom
 */

import {
  validateNotification,
  createDefaultNotification,
  createWatchlistNotification,
  createSecurityNotification,
  getNotificationIcon,
  getNotificationColor,
  getPriorityWeight,
  sortNotificationsByPriority,
  filterNotificationsByCategory,
  getUnreadCount,
  getCriticalCount,
  isWatchlistNotification,
  isSecurityNotification,
  isSystemNotification,
  isBillingNotification,
} from '../NotificationTypes';

describe('NotificationTypes', () => {
  describe('validateNotification', () => {
    it('validates valid notification', () => {
      const notification = {
        title: 'Valid Title',
        message: 'Valid message',
        type: 'info' as const,
        category: 'system' as const,
        priority: 'medium' as const,
      };

      const errors = validateNotification(notification);
      expect(errors).toHaveLength(0);
    });

    it('returns errors for invalid notification', () => {
      const notification = {
        title: '',
        message: '',
        type: 'invalid' as any,
        category: 'invalid' as any,
        priority: 'invalid' as any,
      };

      const errors = validateNotification(notification);
      expect(errors).toContain('Title is required');
      expect(errors).toContain('Message is required');
      expect(errors).toContain('Invalid notification type');
      expect(errors).toContain('Invalid notification category');
      expect(errors).toContain('Invalid notification priority');
    });

    it('validates length constraints', () => {
      const notification = {
        title: 'x'.repeat(101), // Too long
        message: 'x'.repeat(501), // Too long
      };

      const errors = validateNotification(notification);
      expect(errors).toContain('Title must be 100 characters or less');
      expect(errors).toContain('Message must be 500 characters or less');
    });
  });

  describe('createDefaultNotification', () => {
    it('creates notification with default values', () => {
      const notification = createDefaultNotification();

      expect(notification).toMatchObject({
        title: 'Notification',
        message: 'You have a new notification',
        type: 'info',
        category: 'system',
        priority: 'medium',
        read: false,
        archived: false,
        starred: false,
        actionable: false,
      });
      expect(notification.id).toBeDefined();
      expect(notification.timestamp).toBeInstanceOf(Date);
    });

    it('applies overrides correctly', () => {
      const overrides = {
        title: 'Custom Title',
        type: 'error' as const,
        priority: 'critical' as const,
      };

      const notification = createDefaultNotification(overrides);

      expect(notification.title).toBe('Custom Title');
      expect(notification.type).toBe('error');
      expect(notification.priority).toBe('critical');
    });
  });

  describe('createWatchlistNotification', () => {
    it('creates watchlist notification for new content', () => {
      const notification = createWatchlistNotification('Breaking Bad', 'Netflix', 'breaking-bad', 'new');

      expect(notification.category).toBe('watchlist');
      expect(notification.title).toBe('Watchlist Update');
      expect(notification.message).toBe('Breaking Bad is now available on Netflix');
      expect(notification.type).toBe('info');
      expect(notification.priority).toBe('medium');
      expect(notification.actions).toHaveLength(2);
      expect(notification.metadata?.contentId).toBe('breaking-bad');
    });

    it('creates watchlist notification for expiring content', () => {
      const notification = createWatchlistNotification('The Office', 'Netflix', 'the-office', 'expiring');

      expect(notification.title).toBe('Content Expiring');
      expect(notification.message).toBe('The Office is leaving Netflix soon');
      expect(notification.type).toBe('warning');
      expect(notification.priority).toBe('high');
    });
  });

  describe('createSecurityNotification', () => {
    it('creates security notification with correct properties', () => {
      const notification = createSecurityNotification('login', 'high');

      expect(notification.category).toBe('security');
      expect(notification.title).toBe('Security Alert');
      expect(notification.message).toBe('New login detected from an unrecognized device');
      expect(notification.type).toBe('warning');
      expect(notification.priority).toBe('high');
      expect(notification.metadata?.securityEventType).toBe('login');
      expect(notification.metadata?.riskLevel).toBe('high');
    });

    it('creates critical security notification', () => {
      const notification = createSecurityNotification('data_breach', 'critical');

      expect(notification.type).toBe('error');
      expect(notification.priority).toBe('critical');
      expect(notification.metadata?.actionRequired).toBe(true);
    });
  });

  describe('Utility functions', () => {
    describe('getNotificationIcon', () => {
      it('returns correct icons for different types', () => {
        expect(getNotificationIcon(createDefaultNotification({ type: 'success' }))).toBe('✅');
        expect(getNotificationIcon(createDefaultNotification({ type: 'warning' }))).toBe('⚠️');
        expect(getNotificationIcon(createDefaultNotification({ type: 'error' }))).toBe('❌');
        expect(getNotificationIcon(createDefaultNotification({ type: 'info' }))).toBe('ℹ️');
      });
    });

    describe('getNotificationColor', () => {
      it('returns correct colors for different types', () => {
        expect(getNotificationColor(createDefaultNotification({ type: 'success' }))).toBe('green');
        expect(getNotificationColor(createDefaultNotification({ type: 'warning' }))).toBe('yellow');
        expect(getNotificationColor(createDefaultNotification({ type: 'error' }))).toBe('red');
        expect(getNotificationColor(createDefaultNotification({ type: 'info' }))).toBe('blue');
      });
    });

    describe('getPriorityWeight', () => {
      it('returns correct weights for priorities', () => {
        expect(getPriorityWeight('low')).toBe(1);
        expect(getPriorityWeight('medium')).toBe(2);
        expect(getPriorityWeight('high')).toBe(3);
        expect(getPriorityWeight('critical')).toBe(4);
      });
    });

    describe('sortNotificationsByPriority', () => {
      it('sorts notifications by priority and timestamp', () => {
        const notifications = [
          createDefaultNotification({
            priority: 'low',
            timestamp: new Date('2024-01-01T10:00:00'),
          }),
          createDefaultNotification({
            priority: 'critical',
            timestamp: new Date('2024-01-01T09:00:00'),
          }),
          createDefaultNotification({
            priority: 'medium',
            timestamp: new Date('2024-01-01T11:00:00'),
          }),
        ];

        const sorted = sortNotificationsByPriority(notifications);

        expect(sorted[0].priority).toBe('critical');
        expect(sorted[1].priority).toBe('medium');
        expect(sorted[2].priority).toBe('low');
      });

      it('sorts by timestamp when priorities are equal', () => {
        const notifications = [
          createDefaultNotification({
            priority: 'medium',
            timestamp: new Date('2024-01-01T10:00:00'),
          }),
          createDefaultNotification({
            priority: 'medium',
            timestamp: new Date('2024-01-01T11:00:00'),
          }),
        ];

        const sorted = sortNotificationsByPriority(notifications);

        expect(sorted[0].timestamp.getTime()).toBeGreaterThan(sorted[1].timestamp.getTime());
      });
    });

    describe('filterNotificationsByCategory', () => {
      it('filters notifications by category', () => {
        const notifications = [
          createDefaultNotification({ category: 'watchlist' }),
          createDefaultNotification({ category: 'security' }),
          createDefaultNotification({ category: 'system' }),
        ];

        const filtered = filterNotificationsByCategory(notifications, 'watchlist');
        expect(filtered).toHaveLength(1);
        expect(filtered[0].category).toBe('watchlist');
      });

      it('returns all notifications for "all" category', () => {
        const notifications = [
          createDefaultNotification({ category: 'watchlist' }),
          createDefaultNotification({ category: 'security' }),
        ];

        const filtered = filterNotificationsByCategory(notifications, 'all');
        expect(filtered).toHaveLength(2);
      });
    });

    describe('getUnreadCount', () => {
      it('counts unread notifications', () => {
        const notifications = [
          createDefaultNotification({ read: false, archived: false }),
          createDefaultNotification({ read: true, archived: false }),
          createDefaultNotification({ read: false, archived: true }),
        ];

        const count = getUnreadCount(notifications);
        expect(count).toBe(1);
      });
    });

    describe('getCriticalCount', () => {
      it('counts critical unread notifications', () => {
        const notifications = [
          createDefaultNotification({ priority: 'critical', read: false, archived: false }),
          createDefaultNotification({ priority: 'critical', read: true, archived: false }),
          createDefaultNotification({ priority: 'high', read: false, archived: false }),
        ];

        const count = getCriticalCount(notifications);
        expect(count).toBe(1);
      });
    });
  });

  describe('Type guards', () => {
    it('identifies watchlist notifications', () => {
      const watchlistNotification = createWatchlistNotification('Test', 'Netflix', 'test');
      const systemNotification = createDefaultNotification({ category: 'system' });

      expect(isWatchlistNotification(watchlistNotification)).toBe(true);
      expect(isWatchlistNotification(systemNotification)).toBe(false);
    });

    it('identifies security notifications', () => {
      const securityNotification = createSecurityNotification('login');
      const systemNotification = createDefaultNotification({ category: 'system' });

      expect(isSecurityNotification(securityNotification)).toBe(true);
      expect(isSecurityNotification(systemNotification)).toBe(false);
    });

    it('identifies system notifications', () => {
      const systemNotification = createDefaultNotification({ category: 'system' });
      const securityNotification = createSecurityNotification('login');

      expect(isSystemNotification(systemNotification)).toBe(true);
      expect(isSystemNotification(securityNotification)).toBe(false);
    });

    it('identifies billing notifications', () => {
      const billingNotification = createDefaultNotification({ category: 'billing' });
      const systemNotification = createDefaultNotification({ category: 'system' });

      expect(isBillingNotification(billingNotification)).toBe(true);
      expect(isBillingNotification(systemNotification)).toBe(false);
    });
  });
});
