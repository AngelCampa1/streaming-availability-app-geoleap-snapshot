export default {
  configure: jest.fn(() => Promise.resolve({ taskId: 'mock-task-id' })),
  start: jest.fn(() => Promise.resolve({ taskId: 'mock-task-id' })),
  stop: jest.fn(() => Promise.resolve()),
  status: jest.fn(() => Promise.resolve({ available: true })),
  finish: jest.fn(),
  scheduleTask: jest.fn(() => Promise.resolve()),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  isHeadless: jest.fn(() => false),
};
