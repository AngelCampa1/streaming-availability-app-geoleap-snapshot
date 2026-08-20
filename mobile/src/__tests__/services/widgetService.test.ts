/**
 * WidgetService Tests
 *
 * Tests widget and app shortcut management with logger verification.
 */

import { widgetService, WidgetService, WidgetData, AppShortcut, WidgetConfig } from '../../services/widgetService';
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

describe('WidgetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = WidgetService.getInstance();
      const instance2 = WidgetService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should export a singleton instance', () => {
      expect(widgetService).toBeInstanceOf(WidgetService);
      expect(widgetService).toBe(WidgetService.getInstance());
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await widgetService.initialize();

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] WidgetService initialized'
      );
    });
  });

  describe('Widget Management', () => {
    it('should create a widget', async () => {
      const widgetData: WidgetData = {
        id: 'widget-1',
        type: 'trending',
        title: 'Trending Content',
        content: { items: [] },
        config: { size: 'medium' },
      };

      await widgetService.createWidget(widgetData);

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] Creating widget',
        { widgetId: 'widget-1', type: 'trending' }
      );
    });

    it('should create a widget without config', async () => {
      const widgetData: WidgetData = {
        id: 'widget-2',
        type: 'watchlist',
        title: 'My Watchlist',
        content: {},
      };

      await widgetService.createWidget(widgetData);

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] Creating widget',
        { widgetId: 'widget-2', type: 'watchlist' }
      );
    });

    it('should update a widget', async () => {
      const updates: Partial<WidgetData> = {
        title: 'Updated Title',
        content: { updated: true },
      };

      await widgetService.updateWidget('widget-1', updates);

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] Updating widget',
        { widgetId: 'widget-1', updates: ['title', 'content'] }
      );
    });

    it('should update a widget with single field', async () => {
      await widgetService.updateWidget('widget-2', { title: 'New Title' });

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] Updating widget',
        { widgetId: 'widget-2', updates: ['title'] }
      );
    });

    it('should remove a widget', async () => {
      await widgetService.removeWidget('widget-1');

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] Removing widget',
        { widgetId: 'widget-1' }
      );
    });
  });

  describe('App Shortcuts', () => {
    it('should create an app shortcut', async () => {
      const shortcut: AppShortcut = {
        id: 'shortcut-1',
        title: 'Search',
        description: 'Quick search',
        icon: 'search-icon',
        action: 'OPEN_SEARCH',
        data: { query: '' },
      };

      await widgetService.createShortcut(shortcut);

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] Creating shortcut',
        { shortcutId: 'shortcut-1', action: 'OPEN_SEARCH' }
      );
    });

    it('should create a shortcut without optional fields', async () => {
      const shortcut: AppShortcut = {
        id: 'shortcut-2',
        title: 'Home',
        action: 'OPEN_HOME',
      };

      await widgetService.createShortcut(shortcut);

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] Creating shortcut',
        { shortcutId: 'shortcut-2', action: 'OPEN_HOME' }
      );
    });

    it('should remove an app shortcut', async () => {
      await widgetService.removeShortcut('shortcut-1');

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] Removing shortcut',
        { shortcutId: 'shortcut-1' }
      );
    });
  });

  describe('Widget Refresh', () => {
    it('should refresh a widget', async () => {
      await widgetService.refreshWidget('widget-1');

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] Refreshing widget',
        { widgetId: 'widget-1' }
      );
    });
  });

  describe('Widget Configuration', () => {
    it('should configure a widget', async () => {
      const config: Partial<WidgetConfig> = {
        size: 'large',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
      };

      await widgetService.configureWidget('widget-1', config);

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] Configuring widget',
        { widgetId: 'widget-1', config }
      );
    });

    it('should configure widget with partial config', async () => {
      const config: Partial<WidgetConfig> = {
        updateInterval: 3600,
      };

      await widgetService.configureWidget('widget-2', config);

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] Configuring widget',
        { widgetId: 'widget-2', config }
      );
    });
  });

  describe('Widget Toggle', () => {
    it('should toggle widget to enabled', async () => {
      await widgetService.toggleWidget('widget-1', true);

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] Toggling widget',
        { widgetId: 'widget-1', enabled: true }
      );
    });

    it('should toggle widget to disabled', async () => {
      await widgetService.toggleWidget('widget-2', false);

      expect(logger.info).toHaveBeenCalledWith(
        '[WidgetService] Toggling widget',
        { widgetId: 'widget-2', enabled: false }
      );
    });
  });

  describe('Method Chaining', () => {
    it('should handle multiple operations in sequence', async () => {
      const widgetData: WidgetData = {
        id: 'widget-chain',
        type: 'recommendations',
        title: 'For You',
        content: {},
      };

      await widgetService.createWidget(widgetData);
      await widgetService.refreshWidget('widget-chain');
      await widgetService.configureWidget('widget-chain', { size: 'medium' });
      await widgetService.toggleWidget('widget-chain', true);

      expect(logger.info).toHaveBeenCalledTimes(4);
      expect(logger.info).toHaveBeenNthCalledWith(1, '[WidgetService] Creating widget', expect.any(Object));
      expect(logger.info).toHaveBeenNthCalledWith(2, '[WidgetService] Refreshing widget', expect.any(Object));
      expect(logger.info).toHaveBeenNthCalledWith(3, '[WidgetService] Configuring widget', expect.any(Object));
      expect(logger.info).toHaveBeenNthCalledWith(4, '[WidgetService] Toggling widget', expect.any(Object));
    });
  });
});
