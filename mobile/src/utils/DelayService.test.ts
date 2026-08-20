import { DelayService, delayService } from './DelayService';

describe('DelayService', () => {
  let service: DelayService;

  beforeEach(() => {
    DelayService.resetInstance();
    service = DelayService.getInstance();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('returns same instance from getInstance()', () => {
      const instance1 = DelayService.getInstance();
      const instance2 = DelayService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('exported instance is a DelayService', () => {
      // Note: After resetInstance, the exported delayService may not match getInstance()
      // because delayService was captured at module load time
      expect(delayService).toBeDefined();
      expect(typeof delayService.wait).toBe('function');
      expect(typeof delayService.timeout).toBe('function');
      expect(typeof delayService.interval).toBe('function');
      expect(typeof delayService.clear).toBe('function');
    });

    it('resetInstance creates new instance', () => {
      const instance1 = DelayService.getInstance();
      DelayService.resetInstance();
      const instance2 = DelayService.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('wait()', () => {
    it('resolves after specified delay', async () => {
      jest.useFakeTimers();
      const startTime = Date.now();

      const waitPromise = service.wait(1000);
      expect(Date.now() - startTime).toBe(0);

      await jest.advanceTimersByTimeAsync(1000);
      await waitPromise;

      expect(Date.now() - startTime).toBe(1000);
    });

    it('can be awaited in sequence', async () => {
      jest.useFakeTimers();
      const times: number[] = [];
      const startTime = Date.now();

      const promise = (async () => {
        times.push(Date.now() - startTime);
        await service.wait(500);
        times.push(Date.now() - startTime);
        await service.wait(500);
        times.push(Date.now() - startTime);
      })();

      await jest.advanceTimersByTimeAsync(1000);
      await promise;

      expect(times).toEqual([0, 500, 1000]);
    });

    it('supports parallel waits', async () => {
      jest.useFakeTimers();
      const results: string[] = [];

      const promise = Promise.all([
        service.wait(300).then(() => results.push('A')),
        service.wait(100).then(() => results.push('B')),
        service.wait(200).then(() => results.push('C')),
      ]);

      await jest.advanceTimersByTimeAsync(300);
      await promise;

      expect(results).toEqual(['B', 'C', 'A']); // Shortest delay first
    });
  });

  describe('timeout()', () => {
    it('executes callback after delay', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();

      service.timeout(callback, 1000);
      expect(callback).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1000);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('returns handle with clear method', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();

      const handle = service.timeout(callback, 1000);
      expect(handle.id).toBeDefined();
      expect(handle.clear).toBeInstanceOf(Function);

      handle.clear();
      await jest.advanceTimersByTimeAsync(1000);
      expect(callback).not.toHaveBeenCalled();
    });

    it('clear() cancels timeout', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();

      const handle = service.timeout(callback, 1000);
      service.clear(handle);

      await jest.advanceTimersByTimeAsync(1000);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('interval()', () => {
    it('executes callback repeatedly', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();

      service.interval(callback, 100);

      await jest.advanceTimersByTimeAsync(100);
      expect(callback).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(100);
      expect(callback).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(100);
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('returns handle with clear method', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();

      const handle = service.interval(callback, 100);
      expect(handle.id).toBeDefined();
      expect(handle.clear).toBeInstanceOf(Function);

      await jest.advanceTimersByTimeAsync(200);
      expect(callback).toHaveBeenCalledTimes(2);

      handle.clear();
      await jest.advanceTimersByTimeAsync(200);
      expect(callback).toHaveBeenCalledTimes(2); // No more calls
    });

    it('clear() stops interval', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();

      const handle = service.interval(callback, 100);

      await jest.advanceTimersByTimeAsync(200);
      expect(callback).toHaveBeenCalledTimes(2);

      service.clear(handle);
      await jest.advanceTimersByTimeAsync(200);
      expect(callback).toHaveBeenCalledTimes(2); // No more calls
    });
  });

  describe('Real Timers', () => {
    it('wait() works with real timers', async () => {
      const startTime = Date.now();
      await service.wait(50); // Short delay for test speed
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(50);
      expect(elapsed).toBeLessThan(150); // Allow some margin
    });

    it('timeout() works with real timers', done => {
      const callback = jest.fn(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        done();
      });

      service.timeout(callback, 50);
    });

    it('interval() works with real timers', done => {
      let count = 0;
      const callback = jest.fn(() => {
        count++;
        if (count === 3) {
          handle.clear();
          expect(callback).toHaveBeenCalledTimes(3);
          done();
        }
      });

      const handle = service.interval(callback, 50);
    });
  });

  describe('Mocking Guide', () => {
    it('demonstrates how to mock wait() in tests', async () => {
      // This is how other services should mock DelayService
      const mockDelayService = {
        wait: jest.fn().mockResolvedValue(undefined), // Instant resolution
        timeout: jest.fn(),
        interval: jest.fn(),
        clear: jest.fn(),
      };

      // Replace singleton
      (DelayService as any).instance = mockDelayService;

      // Test code using DelayService
      const result = await DelayService.getInstance().wait(5000);

      // Verify: No actual delay occurred
      expect(mockDelayService.wait).toHaveBeenCalledWith(5000);
      expect(result).toBeUndefined();
    });

    it('demonstrates how to mock timeout() in tests', () => {
      const mockHandle = {
        id: 123 as any,
        clear: jest.fn(),
      };

      const mockDelayService = {
        wait: jest.fn(),
        timeout: jest.fn().mockReturnValue(mockHandle),
        interval: jest.fn(),
        clear: jest.fn(),
      };

      (DelayService as any).instance = mockDelayService;

      // Test code using DelayService
      const callback = jest.fn();
      const handle = DelayService.getInstance().timeout(callback, 1000);

      expect(mockDelayService.timeout).toHaveBeenCalledWith(callback, 1000);
      expect(handle).toBe(mockHandle);

      // Can clear without real timer
      handle.clear();
      expect(mockHandle.clear).toHaveBeenCalled();
    });
  });
});
