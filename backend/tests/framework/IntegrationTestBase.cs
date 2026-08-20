using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Net.Http;
using System.Threading.Tasks;
using Xunit;
using GeoLeap.Api.Data;

namespace GeoLeap.Api.Tests.Framework
{
    /// <summary>
    /// Base class for integration tests with controlled dependencies
    /// - In-memory database
    /// - Real services with mocked external dependencies
    /// - HTTP client for API testing
    /// Target execution time: <500ms per test
    /// </summary>
    [Trait("Category", TestCategories.Integration)]
    public abstract class IntegrationTestBase : IAsyncDisposable
    {
        protected readonly WebApplicationFactory<Program> Factory;
        protected readonly HttpClient Client;
        protected readonly IServiceScope Scope;
        protected readonly ApplicationDbContext DbContext;
        private bool _disposed = false;

        protected IntegrationTestBase()
        {
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

                        // Add in-memory database with unique name for isolation
                        var dbName = $"TestDb_{Guid.NewGuid()}";
                        services.AddDbContext<ApplicationDbContext>(options =>
                        {
                            options.UseInMemoryDatabase(dbName);
                            options.EnableServiceProviderCaching(false);
                            options.EnableSensitiveDataLogging(false);
                        });

                        // Configure logging for integration tests
                        services.AddLogging(builder => 
                            builder.AddConsole().SetMinimumLevel(LogLevel.Error));

                        ConfigureTestServices(services);
                    });

                    builder.UseEnvironment("Testing");
                });

            Client = Factory.CreateClient();
            Scope = Factory.Services.CreateScope();
            DbContext = Scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            // Ensure database is created
            DbContext.Database.EnsureCreated();
            
            // Seed test data
            SeedTestData().GetAwaiter().GetResult();
        }

        /// <summary>
        /// Override to configure additional test services
        /// </summary>
        protected virtual void ConfigureTestServices(IServiceCollection services)
        {
            // Default: no additional configuration
        }

        /// <summary>
        /// Override to seed test data specific to the test
        /// </summary>
        protected virtual async Task SeedTestData()
        {
            await Task.CompletedTask;
        }

        /// <summary>
        /// Get a service from the test container
        /// </summary>
        protected T GetService<T>() where T : notnull
        {
            return Scope.ServiceProvider.GetRequiredService<T>();
        }

        /// <summary>
        /// Create a new scope for isolated service access
        /// </summary>
        protected IServiceScope CreateScope()
        {
            return Factory.Services.CreateScope();
        }

        /// <summary>
        /// Clean the database between tests
        /// </summary>
        protected async Task CleanDatabase()
        {
            var entities = DbContext.ChangeTracker.Entries()
                .Where(e => e.Entity != null && e.State != EntityState.Unchanged)
                .Select(e => e.Entity)
                .ToArray();

            foreach (var entity in entities)
            {
                DbContext.Entry(entity).State = EntityState.Detached;
            }

            await DbContext.Database.EnsureDeletedAsync();
            await DbContext.Database.EnsureCreatedAsync();
        }

        /// <summary>
        /// Assert that an integration test completes within the expected timeframe
        /// </summary>
        protected async Task AssertCompletesWithinTimeout(Func<Task> testAction, TimeSpan? timeout = null)
        {
            var timeoutValue = timeout ?? TestTimeouts.Integration;
            var startTime = DateTime.UtcNow;
            
            await testAction();
            
            var duration = DateTime.UtcNow - startTime;
            Assert.True(duration < timeoutValue, 
                $"Integration test took {duration.TotalMilliseconds}ms, expected less than {timeoutValue.TotalMilliseconds}ms");
        }

        public virtual async ValueTask DisposeAsync()
        {
            if (_disposed) return;

            try
            {
                if (DbContext != null)
                {
                    await DbContext.Database.EnsureDeletedAsync();
                    await DbContext.DisposeAsync();
                }
            }
            catch
            {
                // Ignore disposal exceptions
            }

            Scope?.Dispose();
            Client?.Dispose();
            
            if (Factory != null)
                await Factory.DisposeAsync();

            _disposed = true;
            GC.SuppressFinalize(this);
        }
    }
}