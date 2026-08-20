/**
 * Mock logger for testing
 * This file is automatically used by Jest when logger is imported
 */

export const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  trace: jest.fn(),
};

export default logger;
