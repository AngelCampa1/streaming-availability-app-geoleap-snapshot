using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using NSubstitute;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace GeoLeap.Api.Tests.Framework
{
    /// <summary>
    /// Base class for fast unit tests with zero external dependencies
    /// - No database connections
    /// - No HTTP clients
    /// - No file system access
    /// - All dependencies mocked
    /// Target execution time: <50ms per test
    /// </summary>
    [Trait("Category", TestCategories.Unit)]
    public abstract class UnitTestBase : IDisposable
    {
        protected readonly ServiceCollection Services;
        protected readonly ServiceProvider ServiceProvider;
        protected readonly ILogger Logger;
        private readonly List<IDisposable> _disposables = new();
        private bool _disposed = false;

        protected UnitTestBase()
        {
            Services = new ServiceCollection();
            
            // Add minimal logging for unit tests
            Services.AddLogging(builder => builder.AddConsole().SetMinimumLevel(LogLevel.Warning));
            
            ConfigureServices(Services);
            
            ServiceProvider = Services.BuildServiceProvider();
            Logger = ServiceProvider.GetRequiredService<ILogger<UnitTestBase>>();
        }

        /// <summary>
        /// Override to configure services for the unit test
        /// </summary>
        protected virtual void ConfigureServices(IServiceCollection services)
        {
            // Default: no services configured - pure unit testing
        }

        /// <summary>
        /// Create a mock object using Moq
        /// </summary>
        protected Mock<T> CreateMock<T>() where T : class
        {
            var mock = new Mock<T>();
            _disposables.Add(mock.As<IDisposable>().Object);
            return mock;
        }

        /// <summary>
        /// Create a substitute using NSubstitute
        /// </summary>
        protected T CreateSubstitute<T>() where T : class
        {
            var substitute = Substitute.For<T>();
            if (substitute is IDisposable disposable)
                _disposables.Add(disposable);
            return substitute;
        }

        /// <summary>
        /// Get a service from the test container
        /// </summary>
        protected T GetService<T>() where T : notnull
        {
            return ServiceProvider.GetRequiredService<T>();
        }

        /// <summary>
        /// Assert that a unit test completes within the expected timeframe
        /// </summary>
        protected async Task AssertCompletesWithinTimeout(Func<Task> testAction, TimeSpan? timeout = null)
        {
            var timeoutValue = timeout ?? TestTimeouts.Unit;
            var startTime = DateTime.UtcNow;
            
            await testAction();
            
            var duration = DateTime.UtcNow - startTime;
            Assert.True(duration < timeoutValue, 
                $"Unit test took {duration.TotalMilliseconds}ms, expected less than {timeoutValue.TotalMilliseconds}ms");
        }

        public void Dispose()
        {
            if (_disposed) return;
            
            foreach (var disposable in _disposables)
            {
                try
                {
                    disposable?.Dispose();
                }
                catch
                {
                    // Ignore disposal exceptions in unit tests
                }
            }
            
            ServiceProvider?.Dispose();
            _disposed = true;
            GC.SuppressFinalize(this);
        }
    }
}