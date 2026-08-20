using System;
using System.Threading.Tasks;
using Xunit;
using Xunit.Abstractions;

namespace GeoLeap.Api.Tests.Framework
{
    /// <summary>
    /// Provides retry policies and timeout management for different test categories
    /// Implements circuit breaker pattern for failing external dependencies
    /// </summary>
    public class TestRetryPolicy
    {
        private readonly ITestOutputHelper? _output;

        public TestRetryPolicy(ITestOutputHelper? output = null)
        {
            _output = output;
        }

        /// <summary>
        /// Execute a test action with retry policy for transient failures
        /// </summary>
        public async Task<T> ExecuteWithRetry<T>(
            Func<Task<T>> action,
            int maxRetries = 3,
            TimeSpan? baseDelay = null,
            Func<Exception, bool>? shouldRetry = null)
        {
            var delay = baseDelay ?? TimeSpan.FromMilliseconds(100);
            var retryCount = 0;
            Exception? lastException = null;

            while (retryCount <= maxRetries)
            {
                try
                {
                    return await action();
                }
                catch (Exception ex) when (retryCount < maxRetries && (shouldRetry?.Invoke(ex) ?? IsTransientFailure(ex)))
                {
                    lastException = ex;
                    retryCount++;
                    
                    _output?.WriteLine($"Test attempt {retryCount} failed: {ex.Message}. Retrying in {delay.TotalMilliseconds}ms...");
                    
                    await Task.Delay(delay);
                    delay = TimeSpan.FromMilliseconds(delay.TotalMilliseconds * 1.5); // Exponential backoff
                }
            }

            throw new RetryExhaustedException($"Test failed after {maxRetries + 1} attempts", lastException);
        }

        /// <summary>
        /// Execute a test action with circuit breaker for external dependencies
        /// </summary>
        public async Task<T> ExecuteWithCircuitBreaker<T>(
            Func<Task<T>> action,
            string circuitName,
            int failureThreshold = 5,
            TimeSpan? circuitOpenDuration = null)
        {
            var circuit = CircuitBreakerRegistry.GetOrCreate(circuitName, failureThreshold, circuitOpenDuration);
            
            if (circuit.State == CircuitState.Open)
            {
                if (DateTime.UtcNow < circuit.NextAttemptTime)
                {
                    throw new CircuitBreakerOpenException($"Circuit breaker '{circuitName}' is open until {circuit.NextAttemptTime}");
                }
                
                circuit.State = CircuitState.HalfOpen;
            }

            try
            {
                var result = await action();
                
                if (circuit.State == CircuitState.HalfOpen)
                {
                    circuit.Reset();
                    _output?.WriteLine($"Circuit breaker '{circuitName}' reset to closed state");
                }
                
                return result;
            }
            catch (Exception ex) when (IsCircuitBreakerException(ex))
            {
                circuit.RecordFailure();
                
                if (circuit.FailureCount >= circuit.FailureThreshold)
                {
                    circuit.Open();
                    _output?.WriteLine($"Circuit breaker '{circuitName}' opened due to {circuit.FailureCount} failures");
                }
                
                throw;
            }
        }

        /// <summary>
        /// Execute test with timeout protection
        /// </summary>
        public async Task<T> ExecuteWithTimeout<T>(
            Func<Task<T>> action,
            TimeSpan timeout,
            string? timeoutMessage = null)
        {
            using var cts = new CancellationTokenSource(timeout);
            
            try
            {
                return await action();
            }
            catch (OperationCanceledException) when (cts.Token.IsCancellationRequested)
            {
                var message = timeoutMessage ?? $"Test operation timed out after {timeout.TotalSeconds} seconds";
                throw new TimeoutException(message);
            }
        }

        /// <summary>
        /// Determine if an exception represents a transient failure that should be retried
        /// </summary>
        private static bool IsTransientFailure(Exception ex)
        {
            return ex switch
            {
                TimeoutException => true,
                TaskCanceledException => true,
                OperationCanceledException => true,
                HttpRequestException => true,
                // Add more transient exception types as needed
                _ when ex.Message.Contains("connection", StringComparison.OrdinalIgnoreCase) => true,
                _ when ex.Message.Contains("timeout", StringComparison.OrdinalIgnoreCase) => true,
                _ when ex.Message.Contains("network", StringComparison.OrdinalIgnoreCase) => true,
                _ => false
            };
        }

        /// <summary>
        /// Determine if an exception should trigger circuit breaker
        /// </summary>
        private static bool IsCircuitBreakerException(Exception ex)
        {
            return ex switch
            {
                TimeoutException => true,
                HttpRequestException => true,
                TaskCanceledException => true,
                // Database connection failures
                _ when ex.Message.Contains("database", StringComparison.OrdinalIgnoreCase) => true,
                _ when ex.Message.Contains("connection", StringComparison.OrdinalIgnoreCase) => true,
                // External service failures
                _ when ex.Message.Contains("service unavailable", StringComparison.OrdinalIgnoreCase) => true,
                _ when ex.Message.Contains("502", StringComparison.OrdinalIgnoreCase) => true,
                _ when ex.Message.Contains("503", StringComparison.OrdinalIgnoreCase) => true,
                _ => false
            };
        }
    }

    /// <summary>
    /// Circuit breaker implementation for test resilience
    /// </summary>
    public class CircuitBreaker
    {
        public string Name { get; }
        public int FailureThreshold { get; }
        public TimeSpan OpenDuration { get; }
        public CircuitState State { get; set; } = CircuitState.Closed;
        public int FailureCount { get; private set; } = 0;
        public DateTime NextAttemptTime { get; private set; } = DateTime.MinValue;

        public CircuitBreaker(string name, int failureThreshold, TimeSpan openDuration)
        {
            Name = name;
            FailureThreshold = failureThreshold;
            OpenDuration = openDuration;
        }

        public void RecordFailure()
        {
            FailureCount++;
        }

        public void Reset()
        {
            FailureCount = 0;
            State = CircuitState.Closed;
            NextAttemptTime = DateTime.MinValue;
        }

        public void Open()
        {
            State = CircuitState.Open;
            NextAttemptTime = DateTime.UtcNow.Add(OpenDuration);
        }
    }

    /// <summary>
    /// Circuit breaker state enumeration
    /// </summary>
    public enum CircuitState
    {
        Closed,
        Open,
        HalfOpen
    }

    /// <summary>
    /// Registry for managing circuit breaker instances
    /// </summary>
    public static class CircuitBreakerRegistry
    {
        private static readonly Dictionary<string, CircuitBreaker> _circuits = new();
        private static readonly object _lock = new();

        public static CircuitBreaker GetOrCreate(string name, int failureThreshold, TimeSpan? openDuration = null)
        {
            lock (_lock)
            {
                if (_circuits.TryGetValue(name, out var existing))
                    return existing;

                var duration = openDuration ?? TimeSpan.FromMinutes(1);
                var circuit = new CircuitBreaker(name, failureThreshold, duration);
                _circuits[name] = circuit;
                return circuit;
            }
        }

        public static void Reset(string name)
        {
            lock (_lock)
            {
                if (_circuits.TryGetValue(name, out var circuit))
                    circuit.Reset();
            }
        }

        public static void ResetAll()
        {
            lock (_lock)
            {
                foreach (var circuit in _circuits.Values)
                    circuit.Reset();
            }
        }
    }

    /// <summary>
    /// Custom exceptions for retry and circuit breaker functionality
    /// </summary>
    public class RetryExhaustedException : Exception
    {
        public RetryExhaustedException(string message, Exception? innerException = null) 
            : base(message, innerException) { }
    }

    public class CircuitBreakerOpenException : Exception
    {
        public CircuitBreakerOpenException(string message) : base(message) { }
    }

    /// <summary>
    /// Attribute to mark tests that should be retried on failure
    /// </summary>
    [AttributeUsage(AttributeTargets.Method)]
    public class RetryTestAttribute : Attribute
    {
        public int MaxRetries { get; set; } = 3;
        public int DelayMs { get; set; } = 100;
        public Type[]? RetryableExceptions { get; set; }

        public RetryTestAttribute(int maxRetries = 3, int delayMs = 100)
        {
            MaxRetries = maxRetries;
            DelayMs = delayMs;
        }
    }
}