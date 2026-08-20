using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using GeoLeap.Api.Data;

namespace GeoLeap.Api.Tests.Framework
{
    /// <summary>
    /// Base class for end-to-end tests with full application stack
    /// - Separate database instance per test
    /// - Real external service integrations (with controlled test data)
    /// - Complete workflow testing
    /// Target execution time: <5s per test
    /// </summary>
    [Trait("Category", TestCategories.E2E)]
    public abstract class E2ETestBase : IAsyncDisposable
    {
        protected readonly WebApplicationFactory<Program> Factory;
        protected readonly HttpClient Client;
        protected readonly string DatabaseName;
        private readonly CancellationTokenSource _cancellationTokenSource;
        private bool _disposed = false;

        protected E2ETestBase()
        {
            _cancellationTokenSource = new CancellationTokenSource(TestTimeouts.E2E);
            DatabaseName = $"E2ETestDb_{Guid.NewGuid()}";

            Factory = new WebApplicationFactory<Program>()
                .WithWebHostBuilder(builder =>
                {
                    builder.ConfigureServices(services =>
                    {
                        // Remove real database
                        var descriptor = services.SingleOrDefault(
                            d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                        if (descriptor != null)
                            services.Remove(descriptor);

                        // Add isolated test database
                        services.AddDbContext<ApplicationDbContext>(options =>
                        {
                            options.UseInMemoryDatabase(DatabaseName);
                            options.EnableServiceProviderCaching(false);
                        });

                        // Configure logging for E2E tests
                        services.AddLogging(builder => 
                            builder.AddConsole().SetMinimumLevel(LogLevel.Information));

                        ConfigureE2EServices(services);
                    });

                    builder.UseEnvironment("E2ETesting");
                });

            Client = Factory.CreateClient();
            
            // Initialize test environment
            InitializeE2EEnvironment().GetAwaiter().GetResult();
        }

        /// <summary>
        /// Override to configure services specific to E2E testing
        /// </summary>
        protected virtual void ConfigureE2EServices(IServiceCollection services)
        {
            // Default: use real services for E2E testing
        }

        /// <summary>
        /// Initialize the E2E test environment
        /// </summary>
        protected virtual async Task InitializeE2EEnvironment()
        {
            using var scope = Factory.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            
            await dbContext.Database.EnsureCreatedAsync();
            await SeedE2ETestData(dbContext);
        }

        /// <summary>
        /// Override to seed comprehensive test data for E2E scenarios
        /// </summary>
        protected virtual async Task SeedE2ETestData(ApplicationDbContext context)
        {
            await Task.CompletedTask;
        }

        /// <summary>
        /// Execute a complete E2E workflow with timeout protection
        /// </summary>
        protected async Task<T> ExecuteE2EWorkflow<T>(Func<CancellationToken, Task<T>> workflowAction)
        {
            using var timeoutSource = new CancellationTokenSource(TestTimeouts.E2E);
            using var combinedSource = CancellationTokenSource.CreateLinkedTokenSource(
                _cancellationTokenSource.Token, timeoutSource.Token);

            try
            {
                return await workflowAction(combinedSource.Token);
            }
            catch (OperationCanceledException) when (timeoutSource.Token.IsCancellationRequested)
            {
                throw new TimeoutException($"E2E workflow exceeded timeout of {TestTimeouts.E2E.TotalSeconds} seconds");
            }
        }

        /// <summary>
        /// Get a fresh service scope for E2E testing
        /// </summary>
        protected IServiceScope CreateServiceScope()
        {
            return Factory.Services.CreateScope();
        }

        /// <summary>
        /// Verify the complete state of the application after E2E test
        /// </summary>
        protected async Task VerifyE2EState(Func<ApplicationDbContext, Task<bool>> stateVerifier)
        {
            using var scope = CreateServiceScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            
            var isValid = await stateVerifier(dbContext);
            Assert.True(isValid, "E2E test did not result in expected application state");
        }

        /// <summary>
        /// Clean up test data after E2E test
        /// </summary>
        protected async Task CleanupE2EData()
        {
            using var scope = CreateServiceScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            
            await dbContext.Database.EnsureDeletedAsync();
        }

        public virtual async ValueTask DisposeAsync()
        {
            if (_disposed) return;

            try
            {
                await CleanupE2EData();
            }
            catch
            {
                // Ignore cleanup exceptions
            }

            _cancellationTokenSource?.Cancel();
            _cancellationTokenSource?.Dispose();
            
            Client?.Dispose();
            
            if (Factory != null)
                await Factory.DisposeAsync();

            _disposed = true;
            GC.SuppressFinalize(this);
        }
    }
}