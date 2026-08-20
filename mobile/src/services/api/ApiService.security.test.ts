jest.mock('./NetworkService', () => {
  const instance = { isConnected: jest.fn().mockResolvedValue(false) };
  return {
    __esModule: true,
    default: instance,
    NetworkService: jest.fn().mockImplementation(() => instance),
  };
});

jest.mock('./CacheService', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    getStats: jest.fn().mockReturnValue({ totalSize: 0 }),
  },
}));

jest.mock('./OfflineService', () => {
  const queueRequest = jest.fn().mockResolvedValue('queue-id-123');
  const instance = { queueRequest };
  return {
    __esModule: true,
    default: instance,
    OfflineService: jest.fn().mockImplementation(() => instance),
  };
});

jest.mock('../authService', () => ({
  default: {
    getTokens: jest.fn().mockResolvedValue({
      accessToken: 'fresh-access-token',
      refreshToken: 'fresh-refresh-token',
    }),
  },
}));

jest.mock('../../utils/DelayService', () => ({
  delayService: {
    wait: jest.fn().mockResolvedValue(undefined),
    timeout: jest.fn().mockReturnValue({ clear: jest.fn() }),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { ApiService } from './ApiService';

const mockQueueRequest = (jest.requireMock('./OfflineService') as { default: { queueRequest: jest.Mock } }).default.queueRequest;

describe('ApiService security regressions', () => {
  beforeEach(() => {
    mockQueueRequest.mockClear();
  });

  it('queues offline non-GET requests without persisted headers or token-bearing body fields', async () => {
    const service = new ApiService();

    await expect(service.post('/test', {
      name: 'safe',
      accessToken: 'body-access-token',
      password: 'body-password',
      nested: {
        refresh_token: 'body-refresh-token',
        keep: 'safe nested field',
      },
    })).rejects.toThrow('No network connection available');

    expect(mockQueueRequest).toHaveBeenCalledWith({
      endpoint: '/test',
      method: 'POST',
      body: {
        name: 'safe',
        nested: {
          keep: 'safe nested field',
        },
      },
      params: undefined,
      priority: 'normal',
      maxRetries: 3,
    });
  });
});
