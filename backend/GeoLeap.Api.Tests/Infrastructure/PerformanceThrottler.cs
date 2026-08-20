using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

namespace GeoLeap.Api.Tests.Infrastructure
{
    /// <summary>
    /// Performance throttling utilities to control resource usage during tests
    /// </summary>
    public class PerformanceThrottler : IDisposable
    {
        private readonly SemaphoreSlim _semaphore;
        private readonly int _maxConcurrency;
        private readonly ConcurrentQueue<DateTime> _requestTimes;
        private readonly Timer _cleanupTimer;
        private bool _disposed = false;

        public PerformanceThrottler(int maxConcurrency = 10, int maxRequestsPerSecond = 50)
        {
            _maxConcurrency = maxConcurrency;
            _semaphore = new SemaphoreSlim(maxConcurrency, maxConcurrency);
            _requestTimes = new ConcurrentQueue<DateTime>();
            MaxRequestsPerSecond = maxRequestsPerSecond;

            // Cleanup old request times every second
            _cleanupTimer = new Timer(CleanupOldRequests, null, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(1));
        }

        public int MaxRequestsPerSecond { get; }

        /// <summary>
        /// Throttles execution to stay within performance limits
        /// </summary>
        /// <param name="action">Action to execute</param>
        /// <param name="cancellationToken">Cancellation token</param>
        public async Task ThrottleAsync(Func<Task> action, CancellationToken cancellationToken = default)
        {
            await EnforceRateLimit(cancellationToken);
            
            await _semaphore.WaitAsync(cancellationToken);
            try
            {
                await action();
            }
            finally
            {
                _semaphore.Release();
            }
        }

        /// <summary>
        /// Throttles execution to stay within performance limits with return value
        /// </summary>
        /// <typeparam name="T">Return type</typeparam>
        /// <param name="func">Function to execute</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Result of the function</returns>
        public async Task<T> ThrottleAsync<T>(Func<Task<T>> func, CancellationToken cancellationToken = default)
        {
            await EnforceRateLimit(cancellationToken);
            
            await _semaphore.WaitAsync(cancellationToken);
            try
            {
                return await func();
            }
            finally
            {
                _semaphore.Release();
            }
        }

        /// <summary>
        /// Executes multiple actions with throttling
        /// </summary>
        /// <param name="actions">Actions to execute</param>
        /// <param name="cancellationToken">Cancellation token</param>
        public async Task ThrottleBatchAsync(IEnumerable<Func<Task>> actions, CancellationToken cancellationToken = default)
        {
            var tasks = actions.Select(action => ThrottleAsync(action, cancellationToken));
            await Task.WhenAll(tasks);
        }

        /// <summary>
        /// Gets current throttle status
        /// </summary>
        /// <returns>Throttle status information</returns>
        public ThrottleStatus GetStatus()
        {
            var currentTime = DateTime.UtcNow;
            var recentRequests = 0;
            
            // Count requests in the last second
            foreach (var requestTime in _requestTimes)
            {
                if ((currentTime - requestTime).TotalSeconds <= 1)
                    recentRequests++;
            }

            return new ThrottleStatus
            {
                AvailableSlots = _semaphore.CurrentCount,
                MaxConcurrency = _maxConcurrency,
                RecentRequestsPerSecond = recentRequests,
                MaxRequestsPerSecond = MaxRequestsPerSecond,
                IsThrottled = recentRequests >= MaxRequestsPerSecond || _semaphore.CurrentCount == 0
            };
        }

        private async Task EnforceRateLimit(CancellationToken cancellationToken)
        {
            var currentTime = DateTime.UtcNow;
            _requestTimes.Enqueue(currentTime);

            // Check if we're exceeding rate limit
            var recentRequests = 0;
            foreach (var requestTime in _requestTimes)
            {
                if ((currentTime - requestTime).TotalSeconds <= 1)
                    recentRequests++;
            }

            if (recentRequests >= MaxRequestsPerSecond)
            {
                // Wait until we can make another request
                var delay = TimeSpan.FromMilliseconds(1000.0 / MaxRequestsPerSecond);
                await Task.Delay(delay, cancellationToken);
            }
        }

        private void CleanupOldRequests(object? state)
        {
            var cutoff = DateTime.UtcNow.AddSeconds(-2); // Keep requests from last 2 seconds
            
            while (_requestTimes.TryPeek(out var oldestRequest) && oldestRequest < cutoff)
            {
                _requestTimes.TryDequeue(out _);
            }
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                _disposed = true;
                _cleanupTimer?.Dispose();
                _semaphore?.Dispose();
            }
        }
    }

    /// <summary>
    /// Status information for the throttler
    /// </summary>
    public class ThrottleStatus
    {
        public int AvailableSlots { get; set; }
        public int MaxConcurrency { get; set; }
        public int RecentRequestsPerSecond { get; set; }
        public int MaxRequestsPerSecond { get; set; }
        public bool IsThrottled { get; set; }

        public override string ToString()
        {
            var status = IsThrottled ? "THROTTLED" : "OK";
            return $"Throttle Status: {status} - Slots: {AvailableSlots}/{MaxConcurrency}, RPS: {RecentRequestsPerSecond}/{MaxRequestsPerSecond}";
        }
    }
}