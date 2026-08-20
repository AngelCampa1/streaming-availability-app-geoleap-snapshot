const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  trace: jest.fn(),
  createLogger: jest.fn(() => logger),
  setLevel: jest.fn(),
  getLevel: jest.fn(() => 'info'),
  registerLoggerConfig: jest.fn(),
};

export default logger;
