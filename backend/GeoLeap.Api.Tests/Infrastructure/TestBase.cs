using Microsoft.Extensions.DependencyInjection;
using GeoLeap.Api.Data;

namespace GeoLeap.Api.Tests.Infrastructure
{
    /// <summary>
    /// 🚨 NUCLEAR BASE CLASS: Forces all tests to use singleton factory
    /// Eliminates inotify instance exhaustion
    /// </summary>
    public abstract class TestBase : IDisposable
    {
        protected readonly SingletonWebApplicationFactory Factory;
        protected readonly HttpClient Client;

        protected TestBase()
        {
            Factory = SingletonWebApplicationFactory.Instance;
            Client = Factory.CreateClient();
            
            // Reset database state before each test
            ResetTestState();
        }

        protected virtual void ResetTestState()
        {
            try
            {
                Factory.ResetDatabase();
                
                // Force garbage collection between tests
                GC.Collect();
                GC.WaitForPendingFinalizers();
                GC.Collect();
            }
            catch
            {
                // Ignore cleanup errors
            }
        }

        protected ApplicationDbContext GetDbContext()
        {
            var scope = Factory.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        }

        public virtual void Dispose()
        {
            try
            {
                Client?.Dispose();
            }
            catch
            {
                // Ignore disposal errors
            }
        }
    }
}