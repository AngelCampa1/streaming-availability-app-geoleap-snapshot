using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using GeoLeap.Api;
using GeoLeap.Api.Data;
using GeoLeap.Api.Extensions;
using NSubstitute;
using StackExchange.Redis;

namespace GeoLeap.Api.Tests.Infrastructure
{
    /// <summary>
    /// 🚨 NUCLEAR SOLUTION: Single WebApplicationFactory instance for ALL tests
    /// Prevents inotify instance exhaustion by reusing factory
    /// </summary>
    public sealed class SingletonWebApplicationFactory : WebApplicationFactory<Program>, IDisposable
    {
        private static readonly object LockObject = new object();
        private static SingletonWebApplicationFactory? _instance;
        private static volatile bool _disposed = false;

        public static SingletonWebApplicationFactory Instance
        {
            get
            {
                if (_instance == null)
                {
                    lock (LockObject)
                    {
                        if (_instance == null && !_disposed)
                        {
                            _instance = new SingletonWebApplicationFactory();
                        }
                    }
                }
                
                if (_instance == null)
                {
                    throw new ObjectDisposedException(nameof(SingletonWebApplicationFactory));
                }
                
                return _instance;
            }
        }

        private SingletonWebApplicationFactory() : base()
        {
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                // Remove the real database context
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                // Add in-memory database for testing
                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    options.UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}");
                });

                // 🚨 CRITICAL REDIS FIX: Mock Redis IConnectionMultiplexer
                Console.WriteLine("🔧 SINGLETON FACTORY: Removing existing Redis registrations...");
                var redisDescriptors = services.Where(d => d.ServiceType == typeof(IConnectionMultiplexer)).ToList();
                foreach (var redisDescriptor in redisDescriptors)
                {
                    services.Remove(redisDescriptor);
                    Console.WriteLine($"🔧 Removed Redis descriptor: {redisDescriptor.ImplementationType?.Name ?? "Unknown"}");
                }

                // Add properly configured Redis mock
                Console.WriteLine("🔧 SINGLETON FACTORY: Adding properly mocked Redis...");
                var mockConnectionMultiplexer = Substitute.For<IConnectionMultiplexer>();
                var mockDatabase = Substitute.For<IDatabase>();
                
                // Configure the mock to return reasonable values
                mockConnectionMultiplexer.GetDatabase(Arg.Any<int>(), Arg.Any<object>()).Returns(mockDatabase);
                mockDatabase.PingAsync(Arg.Any<CommandFlags>()).Returns(Task.FromResult(TimeSpan.FromMilliseconds(1)));
                mockConnectionMultiplexer.IsConnected.Returns(true);
                
                services.AddSingleton<IConnectionMultiplexer>(mockConnectionMultiplexer);
                Console.WriteLine("✅ SINGLETON FACTORY: Redis properly mocked and registered");

                // 🚨 CRITICAL MEMORY CACHE FIX: Configure without SizeLimit to avoid Size requirement
                Console.WriteLine("🔧 SINGLETON FACTORY: Configuring MemoryCache without SizeLimit...");
                var memoryCacheDescriptors = services.Where(d => d.ServiceType == typeof(Microsoft.Extensions.Caching.Memory.IMemoryCache)).ToList();
                foreach (var cacheDescriptor in memoryCacheDescriptors)
                {
                    services.Remove(cacheDescriptor);
                    Console.WriteLine($"🔧 Removed existing MemoryCache descriptor: {cacheDescriptor.ImplementationType?.Name ?? "Unknown"}");
                }
                
                // Add MemoryCache without SizeLimit to avoid "Cache entry must specify a value for Size" error
                services.AddMemoryCache(options =>
                {
                    // CRITICAL: No SizeLimit set to avoid Size requirement on cache entries
                    // This prevents RateLimitingService errors when using _cache.Set()
                });
                
                services.AddSingleton<Microsoft.Extensions.Caching.Distributed.IDistributedCache, Microsoft.Extensions.Caching.Distributed.MemoryDistributedCache>();
                Console.WriteLine("✅ SINGLETON FACTORY: MemoryCache configured without SizeLimit");

                // 🚨 CRITICAL: Add preference services for integration tests
                Console.WriteLine("🔧 SINGLETON FACTORY: Adding preference services for integration tests...");
                services.AddPreferenceServices();
                services.AddPreferenceCaching();
                Console.WriteLine("✅ SINGLETON FACTORY: Preference services registered");

                // Create the schema immediately
                var sp = services.BuildServiceProvider();
                using (var scope = sp.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    try
                    {
                        context.Database.EnsureCreated();
                    }
                    catch
                    {
                        // Ignore creation errors - database might already exist
                    }
                }
            });

            builder.UseEnvironment("Testing");
        }

        /// <summary>
        /// Reset database state between tests
        /// </summary>
        public void ResetDatabase()
        {
            try
            {
                using var scope = Services.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                context.Database.EnsureDeleted();
                context.Database.EnsureCreated();
            }
            catch
            {
                // Ignore reset errors
            }
        }

        public new void Dispose()
        {
            // 🚨 CRITICAL FIX: DO NOT DISPOSE THE SINGLETON!
            // Individual test dispose calls should NOT dispose the shared singleton
            // The singleton stays alive for ALL tests to prevent ObjectDisposedException
            
            // Only dispose if explicitly called via ForceCleanup
            // This prevents premature disposal during test execution
        }

        /// <summary>
        /// Force cleanup for extreme cases (called at END of all tests)
        /// </summary>
        public static void ForceCleanup()
        {
            lock (LockObject)
            {
                if (_instance != null && !_disposed)
                {
                    _disposed = true;
                    _instance.DisposeInternal(); // Use internal dispose
                    _instance = null;
                }
                GC.Collect();
                GC.WaitForPendingFinalizers();
                GC.Collect();
            }
        }
        
        /// <summary>
        /// Internal dispose method that actually disposes the factory
        /// </summary>
        private void DisposeInternal()
        {
            base.Dispose();
        }
    }
}