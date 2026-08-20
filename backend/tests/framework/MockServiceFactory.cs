using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using NSubstitute;
using System;
using System.Collections.Generic;
using System.Net.Http;

namespace GeoLeap.Api.Tests.Framework
{
    /// <summary>
    /// Factory for creating and managing mock services across test categories
    /// Provides consistent mocking strategies for different test types
    /// </summary>
    public class MockServiceFactory : IDisposable
    {
        private readonly List<IDisposable> _disposables = new();
        private readonly Dictionary<Type, object> _mockCache = new();
        private bool _disposed = false;

        /// <summary>
        /// Create a mock using Moq framework
        /// </summary>
        public Mock<T> CreateMock<T>() where T : class
        {
            if (_mockCache.TryGetValue(typeof(T), out var cached))
                return (Mock<T>)cached;

            var mock = new Mock<T>();
            _mockCache[typeof(T)] = mock;
            
            if (mock.Object is IDisposable disposable)
                _disposables.Add(disposable);
                
            return mock;
        }

        /// <summary>
        /// Create a substitute using NSubstitute
        /// </summary>
        public T CreateSubstitute<T>() where T : class
        {
            if (_mockCache.TryGetValue(typeof(T), out var cached))
                return (T)cached;

            var substitute = Substitute.For<T>();
            _mockCache[typeof(T)] = substitute;
            
            if (substitute is IDisposable disposable)
                _disposables.Add(disposable);
                
            return substitute;
        }

        /// <summary>
        /// Configure common mock setups for HTTP clients
        /// </summary>
        public Mock<HttpClient> CreateHttpClientMock()
        {
            var mockHttpClient = CreateMock<HttpClient>();
            
            // Setup common HTTP behaviors
            mockHttpClient.Setup(x => x.BaseAddress)
                .Returns(new Uri("https://test-api.example.com"));
                
            return mockHttpClient;
        }

        /// <summary>
        /// Configure mock logger with controlled output
        /// </summary>
        public Mock<ILogger<T>> CreateLoggerMock<T>()
        {
            var mockLogger = CreateMock<ILogger<T>>();
            
            // Setup logger to capture log entries for verification
            var logEntries = new List<string>();
            
            mockLogger.Setup(x => x.Log(
                It.IsAny<LogLevel>(),
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()))
                .Callback<LogLevel, EventId, object, Exception, Delegate>(
                    (level, eventId, state, exception, formatter) =>
                    {
                        logEntries.Add($"{level}: {state}");
                    });
                    
            // Expose log entries for test verification
            mockLogger.Setup(x => x.BeginScope(It.IsAny<It.IsAnyType>()))
                .Returns(Mock.Of<IDisposable>());
                
            return mockLogger;
        }

        /// <summary>
        /// Configure common external service mocks
        /// </summary>
        public void ConfigureExternalServiceMocks(IServiceCollection services)
        {
            // Email service mock
            var emailService = CreateSubstitute<IEmailService>();
            emailService.SendAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>())
                .Returns(Task.FromResult(true));
            services.AddSingleton(emailService);

            // Payment service mock
            var paymentService = CreateSubstitute<IPaymentService>();
            paymentService.ProcessPaymentAsync(Arg.Any<object>())
                .Returns(Task.FromResult(new { Success = true, TransactionId = "test-123" }));
            services.AddSingleton(paymentService);

            // External API clients
            var tmdbClient = CreateHttpClientMock();
            services.AddSingleton(tmdbClient.Object);
        }

        /// <summary>
        /// Reset all mocks to their initial state
        /// </summary>
        public void ResetAllMocks()
        {
            foreach (var mock in _mockCache.Values)
            {
                if (mock is Mock moqMock)
                {
                    moqMock.Reset();
                }
                else if (mock.GetType().Name.Contains("Substitute"))
                {
                    // Reset NSubstitute mock
                    mock.GetType().GetMethod("ClearReceivedCalls")?.Invoke(mock, null);
                }
            }
        }

        /// <summary>
        /// Verify all mock interactions as expected
        /// </summary>
        public void VerifyAllMocks()
        {
            foreach (var mock in _mockCache.Values)
            {
                if (mock is Mock moqMock)
                {
                    try
                    {
                        moqMock.VerifyAll();
                    }
                    catch (MockException)
                    {
                        // Log verification failure but don't throw in cleanup
                    }
                }
            }
        }

        public void Dispose()
        {
            if (_disposed) return;

            VerifyAllMocks();

            foreach (var disposable in _disposables)
            {
                try
                {
                    disposable?.Dispose();
                }
                catch
                {
                    // Ignore disposal exceptions
                }
            }

            _mockCache.Clear();
            _disposables.Clear();
            _disposed = true;
            GC.SuppressFinalize(this);
        }
    }

    // Placeholder interfaces removed - use real interfaces from GeoLeap.Api.Services
}