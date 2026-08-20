/**
 * logger.test.ts - Comprehensive tests for logging utilities
 *
 * Test Strategy: Focus on bug detection through log level filtering,
 * contextual logging, and proper message formatting.
 *
 * Coverage Target: 100% of logger.ts (88 lines)
 */

import { logger, LogLevel, logInfo, logError, logWarn, logDebug } from './logger';

describe('logger', () => {
  // Mock console methods
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleTraceSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleTraceSpy = jest.spyOn(console, 'trace').mockImplementation();

    // Reset to default INFO level
    logger.setLevel(LogLevel.INFO);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================================================
  // LogLevel Enum Tests
  // ==========================================================================

  describe('LogLevel', () => {
    it('has correct numeric values in ascending order', () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
      expect(LogLevel.NONE).toBe(4);
    });

    it('levels are in increasing severity order', () => {
      expect(LogLevel.DEBUG).toBeLessThan(LogLevel.INFO);
      expect(LogLevel.INFO).toBeLessThan(LogLevel.WARN);
      expect(LogLevel.WARN).toBeLessThan(LogLevel.ERROR);
      expect(LogLevel.ERROR).toBeLessThan(LogLevel.NONE);
    });
  });

  // ==========================================================================
  // Logger Instance Tests
  // ==========================================================================

  describe('logger instance', () => {
    it('is defined and accessible', () => {
      expect(logger).toBeDefined();
      expect(logger.debug).toBeInstanceOf(Function);
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
      expect(logger.error).toBeInstanceOf(Function);
      expect(logger.log).toBeInstanceOf(Function);
      expect(logger.trace).toBeInstanceOf(Function);
    });

    it('starts with INFO level by default', () => {
      const newLogger = logger;
      expect(newLogger.getLevel()).toBe(LogLevel.INFO);
    });
  });

  // ==========================================================================
  // setLevel / getLevel Tests
  // ==========================================================================

  describe('setLevel / getLevel', () => {
    it('sets and gets DEBUG level', () => {
      logger.setLevel(LogLevel.DEBUG);
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('sets and gets INFO level', () => {
      logger.setLevel(LogLevel.INFO);
      expect(logger.getLevel()).toBe(LogLevel.INFO);
    });

    it('sets and gets WARN level', () => {
      logger.setLevel(LogLevel.WARN);
      expect(logger.getLevel()).toBe(LogLevel.WARN);
    });

    it('sets and gets ERROR level', () => {
      logger.setLevel(LogLevel.ERROR);
      expect(logger.getLevel()).toBe(LogLevel.ERROR);
    });

    it('sets and gets NONE level', () => {
      logger.setLevel(LogLevel.NONE);
      expect(logger.getLevel()).toBe(LogLevel.NONE);
    });

    it('persists level changes', () => {
      logger.setLevel(LogLevel.DEBUG);
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);

      logger.setLevel(LogLevel.ERROR);
      expect(logger.getLevel()).toBe(LogLevel.ERROR);
    });
  });

  // ==========================================================================
  // debug() Tests
  // ==========================================================================

  describe('debug', () => {
    it('logs debug message when level is DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('Test debug message');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Test debug message');
    });

    it('does not log debug message when level is INFO', () => {
      logger.setLevel(LogLevel.INFO);
      logger.debug('Test debug message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('does not log debug message when level is WARN', () => {
      logger.setLevel(LogLevel.WARN);
      logger.debug('Test debug message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('does not log debug message when level is ERROR', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.debug('Test debug message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('does not log debug message when level is NONE', () => {
      logger.setLevel(LogLevel.NONE);
      logger.debug('Test debug message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('logs debug message with additional arguments', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('User action', { userId: '123', action: 'click' });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[DEBUG] User action',
        { userId: '123', action: 'click' }
      );
    });

    it('logs debug message with multiple arguments', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('Event', 'type', 'data', 123);

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Event', 'type', 'data', 123);
    });

    it('handles empty message', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] ');
    });
  });

  // ==========================================================================
  // info() Tests
  // ==========================================================================

  describe('info', () => {
    it('logs info message when level is DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.info('Test info message');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Test info message');
    });

    it('logs info message when level is INFO', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('Test info message');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Test info message');
    });

    it('does not log info message when level is WARN', () => {
      logger.setLevel(LogLevel.WARN);
      logger.info('Test info message');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('does not log info message when level is ERROR', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.info('Test info message');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('does not log info message when level is NONE', () => {
      logger.setLevel(LogLevel.NONE);
      logger.info('Test info message');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('logs info message with additional arguments', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('API call', { endpoint: '/users', method: 'GET' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] API call',
        { endpoint: '/users', method: 'GET' }
      );
    });
  });

  // ==========================================================================
  // warn() Tests
  // ==========================================================================

  describe('warn', () => {
    it('logs warn message when level is DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.warn('Test warn message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Test warn message');
    });

    it('logs warn message when level is INFO', () => {
      logger.setLevel(LogLevel.INFO);
      logger.warn('Test warn message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Test warn message');
    });

    it('logs warn message when level is WARN', () => {
      logger.setLevel(LogLevel.WARN);
      logger.warn('Test warn message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Test warn message');
    });

    it('does not log warn message when level is ERROR', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.warn('Test warn message');

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('does not log warn message when level is NONE', () => {
      logger.setLevel(LogLevel.NONE);
      logger.warn('Test warn message');

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('logs warn message with additional arguments', () => {
      logger.setLevel(LogLevel.WARN);
      logger.warn('Deprecated API', { api: 'getUserInfo', replacement: 'getUser' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WARN] Deprecated API',
        { api: 'getUserInfo', replacement: 'getUser' }
      );
    });
  });

  // ==========================================================================
  // error() Tests
  // ==========================================================================

  describe('error', () => {
    it('logs error message when level is DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message');
    });

    it('logs error message when level is INFO', () => {
      logger.setLevel(LogLevel.INFO);
      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message');
    });

    it('logs error message when level is WARN', () => {
      logger.setLevel(LogLevel.WARN);
      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message');
    });

    it('logs error message when level is ERROR', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message');
    });

    it('does not log error message when level is NONE', () => {
      logger.setLevel(LogLevel.NONE);
      logger.error('Test error message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('logs error message with Error object', () => {
      logger.setLevel(LogLevel.ERROR);
      const error = new Error('Something went wrong');
      logger.error('Failed to process', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Failed to process', error);
    });

    it('logs error message with stack trace', () => {
      logger.setLevel(LogLevel.ERROR);
      const error = new Error('Stack trace test');
      logger.error('Exception caught', error, { context: 'handler' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR] Exception caught',
        error,
        { context: 'handler' }
      );
    });
  });

  // ==========================================================================
  // log() Tests
  // ==========================================================================

  describe('log', () => {
    it('always logs regardless of level (DEBUG)', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.log('Test log message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[LOG] Test log message');
    });

    it('always logs regardless of level (INFO)', () => {
      logger.setLevel(LogLevel.INFO);
      logger.log('Test log message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[LOG] Test log message');
    });

    it('always logs regardless of level (WARN)', () => {
      logger.setLevel(LogLevel.WARN);
      logger.log('Test log message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[LOG] Test log message');
    });

    it('always logs regardless of level (ERROR)', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.log('Test log message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[LOG] Test log message');
    });

    it('always logs even when level is NONE', () => {
      logger.setLevel(LogLevel.NONE);
      logger.log('Test log message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[LOG] Test log message');
    });

    it('logs with additional arguments', () => {
      logger.setLevel(LogLevel.INFO);
      logger.log('General message', { data: 'value' });

      expect(consoleLogSpy).toHaveBeenCalledWith('[LOG] General message', { data: 'value' });
    });
  });

  // ==========================================================================
  // trace() Tests
  // ==========================================================================

  describe('trace', () => {
    it('logs trace when level is DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.trace('Test trace message');

      expect(consoleTraceSpy).toHaveBeenCalledWith('[TRACE] Test trace message');
    });

    it('does not log trace when level is INFO', () => {
      logger.setLevel(LogLevel.INFO);
      logger.trace('Test trace message');

      expect(consoleTraceSpy).not.toHaveBeenCalled();
    });

    it('does not log trace when level is WARN', () => {
      logger.setLevel(LogLevel.WARN);
      logger.trace('Test trace message');

      expect(consoleTraceSpy).not.toHaveBeenCalled();
    });

    it('does not log trace when level is ERROR', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.trace('Test trace message');

      expect(consoleTraceSpy).not.toHaveBeenCalled();
    });

    it('does not log trace when level is NONE', () => {
      logger.setLevel(LogLevel.NONE);
      logger.trace('Test trace message');

      expect(consoleTraceSpy).not.toHaveBeenCalled();
    });

    it('logs trace with additional arguments', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.trace('Function entry', { args: [1, 2, 3] });

      expect(consoleTraceSpy).toHaveBeenCalledWith('[TRACE] Function entry', { args: [1, 2, 3] });
    });
  });

  // ==========================================================================
  // createLogger (Contextual Logger) Tests
  // ==========================================================================

  describe('createLogger', () => {
    it('creates contextual logger with prefix', () => {
      logger.setLevel(LogLevel.INFO);
      const authLogger = logger.createLogger('Auth');

      authLogger.info('User logged in');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] [Auth] User logged in');
    });

    it('contextual logger respects parent log level (debug filtered)', () => {
      logger.setLevel(LogLevel.INFO);
      const apiLogger = logger.createLogger('API');

      apiLogger.debug('Request sent');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('contextual logger respects parent log level (info allowed)', () => {
      logger.setLevel(LogLevel.INFO);
      const apiLogger = logger.createLogger('API');

      apiLogger.info('Response received');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] [API] Response received');
    });

    it('contextual logger warns with context', () => {
      logger.setLevel(LogLevel.WARN);
      const cacheLogger = logger.createLogger('Cache');

      cacheLogger.warn('Cache miss');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] [Cache] Cache miss');
    });

    it('contextual logger errors with context', () => {
      logger.setLevel(LogLevel.ERROR);
      const dbLogger = logger.createLogger('Database');

      dbLogger.error('Connection failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] [Database] Connection failed');
    });

    it('contextual logger logs with context (always logs)', () => {
      logger.setLevel(LogLevel.NONE);
      const sysLogger = logger.createLogger('System');

      sysLogger.log('System event');

      expect(consoleLogSpy).toHaveBeenCalledWith('[LOG] [System] System event');
    });

    it('contextual logger traces with context', () => {
      logger.setLevel(LogLevel.DEBUG);
      const tracerLogger = logger.createLogger('Tracer');

      tracerLogger.trace('Stack trace');

      expect(consoleTraceSpy).toHaveBeenCalledWith('[TRACE] [Tracer] Stack trace');
    });

    it('contextual logger passes additional arguments', () => {
      logger.setLevel(LogLevel.INFO);
      const eventLogger = logger.createLogger('Event');

      eventLogger.info('Button clicked', { buttonId: 'submit', userId: '123' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] [Event] Button clicked',
        { buttonId: 'submit', userId: '123' }
      );
    });

    it('creates multiple independent contextual loggers', () => {
      logger.setLevel(LogLevel.INFO);
      const logger1 = logger.createLogger('Module1');
      const logger2 = logger.createLogger('Module2');

      logger1.info('Message from module 1');
      logger2.info('Message from module 2');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] [Module1] Message from module 1');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] [Module2] Message from module 2');
    });

    it('contextual logger updates when parent level changes', () => {
      logger.setLevel(LogLevel.INFO);
      const dynamicLogger = logger.createLogger('Dynamic');

      dynamicLogger.debug('Should not log');
      expect(consoleDebugSpy).not.toHaveBeenCalled();

      logger.setLevel(LogLevel.DEBUG);
      dynamicLogger.debug('Should log now');
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] [Dynamic] Should log now');
    });
  });

  // ==========================================================================
  // Convenience Function Tests
  // ==========================================================================

  describe('convenience functions', () => {
    describe('logInfo', () => {
      it('logs info message', () => {
        logger.setLevel(LogLevel.INFO);
        logInfo('Info via convenience function');

        expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Info via convenience function');
      });

      it('passes additional arguments', () => {
        logger.setLevel(LogLevel.INFO);
        logInfo('Info with data', { key: 'value' });

        expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Info with data', { key: 'value' });
      });
    });

    describe('logError', () => {
      it('logs error message', () => {
        logger.setLevel(LogLevel.ERROR);
        logError('Error via convenience function');

        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error via convenience function');
      });

      it('passes additional arguments', () => {
        logger.setLevel(LogLevel.ERROR);
        const error = new Error('Test');
        logError('Error occurred', error);

        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error occurred', error);
      });
    });

    describe('logWarn', () => {
      it('logs warn message', () => {
        logger.setLevel(LogLevel.WARN);
        logWarn('Warning via convenience function');

        expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warning via convenience function');
      });

      it('passes additional arguments', () => {
        logger.setLevel(LogLevel.WARN);
        logWarn('Deprecation warning', { feature: 'oldAPI' });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[WARN] Deprecation warning',
          { feature: 'oldAPI' }
        );
      });
    });

    describe('logDebug', () => {
      it('logs debug message when level is DEBUG', () => {
        logger.setLevel(LogLevel.DEBUG);
        logDebug('Debug via convenience function');

        expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Debug via convenience function');
      });

      it('does not log debug message when level is INFO', () => {
        logger.setLevel(LogLevel.INFO);
        logDebug('Debug via convenience function');

        expect(consoleDebugSpy).not.toHaveBeenCalled();
      });

      it('passes additional arguments', () => {
        logger.setLevel(LogLevel.DEBUG);
        logDebug('Debug info', { step: 1, data: 'test' });

        expect(consoleDebugSpy).toHaveBeenCalledWith(
          '[DEBUG] Debug info',
          { step: 1, data: 'test' }
        );
      });
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('handles very long messages', () => {
      logger.setLevel(LogLevel.INFO);
      const longMessage = 'x'.repeat(10000);
      logger.info(longMessage);

      expect(consoleInfoSpy).toHaveBeenCalledWith(`[INFO] ${longMessage}`);
    });

    it('handles special characters in messages', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('Message with\nnewlines\tand\ttabs');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Message with\nnewlines\tand\ttabs');
    });

    it('handles unicode characters', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('Unicode: 你好 🚀 ñ');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Unicode: 你好 🚀 ñ');
    });

    it('handles null as additional argument', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('Message', null);

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Message', null);
    });

    it('handles undefined as additional argument', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('Message', undefined);

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Message', undefined);
    });

    it('handles circular object references', () => {
      logger.setLevel(LogLevel.INFO);
      const obj: any = { name: 'test' };
      obj.self = obj; // Circular reference

      logger.info('Circular object', obj);

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Circular object', obj);
    });

    it('handles many arguments', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('Many args', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] Many args',
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10
      );
    });
  });
});
