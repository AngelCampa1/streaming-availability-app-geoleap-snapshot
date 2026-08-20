export default {
  analytics: jest.fn(() => ({
    logEvent: jest.fn(),
    logScreenView: jest.fn(),
    setUserId: jest.fn(),
    setUserProperty: jest.fn(),
    logAppOpen: jest.fn(),
  })),
  crashlytics: jest.fn(() => ({
    recordError: jest.fn(),
    log: jest.fn(),
    setUserId: jest.fn(),
    setUserIdentifier: jest.fn(),
  })),
  perf: jest.fn(() => ({
    newTrace: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
    })),
    newMetric: jest.fn(() => ({
      putMetric: jest.fn(),
    })),
  })),
};
