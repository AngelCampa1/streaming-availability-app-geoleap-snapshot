using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Optimized Resource Pool implementing US82 resource management patterns
/// Provides efficient resource pooling for database connections and service contexts
/// </summary>
public sealed class OptimizedResourcePool : IAsyncDisposable
{
    private readonly ConcurrentDictionary<string, ResourceContext> _activeContexts;
    private readonly ConcurrentQueue<PooledDbContext> _dbContextPool;
    private readonly ConcurrentDictionary<string, IServiceScope> _serviceScopePool;
    private readonly SemaphoreSlim _contextSemaphore;
    private readonly SemaphoreSlim _dbPoolSemaphore;
    private readonly Timer _cleanupTimer;
    private readonly ILogger<OptimizedResourcePool>? _logger;
    private readonly ResourcePoolConfiguration _config;
    private bool _disposed = false;

    // Pool statistics
    private long _totalContextsCreated = 0;
    private long _totalContextsReused = 0;
    private long _totalDbConnectionsCreated = 0;
    private readonly Stopwatch _sessionStopwatch = Stopwatch.StartNew();

    public OptimizedResourcePool(ILogger<OptimizedResourcePool>? logger = null)
    {
        _logger = logger;
        _config = new ResourcePoolConfiguration();
        _activeContexts = new ConcurrentDictionary<string, ResourceContext>();
        _dbContextPool = new ConcurrentQueue<PooledDbContext>();
        _serviceScopePool = new ConcurrentDictionary<string, IServiceScope>();
        _contextSemaphore = new SemaphoreSlim(_config.MaxConcurrentContexts, _config.MaxConcurrentContexts);
        _dbPoolSemaphore = new SemaphoreSlim(_config.MaxDbConnections, _config.MaxDbConnections);
        
        // Start cleanup timer
        _cleanupTimer = new Timer(CleanupResourcesAsync, null, 
            _config.CleanupInterval, _config.CleanupInterval);
        
        _logger?.LogInformation("🏊 RESOURCE POOL: Initialized with max contexts: {MaxContexts}, max DB connections: {MaxDb}", 
            _config.MaxConcurrentContexts, _config.MaxDbConnections);
    }

    /// <summary>
    /// Acquire resource context for test execution
    /// </summary>
    public async Task<ResourceContext> AcquireContextAsync(string resourceProfile, CancellationToken cancellationToken = default)
    {
        await _contextSemaphore.WaitAsync(cancellationToken);
        
        try
        {
            var contextId = Guid.NewGuid().ToString("N")[..8];
            var context = await CreateResourceContextAsync(contextId, resourceProfile);
            
            _activeContexts.TryAdd(contextId, context);
            Interlocked.Increment(ref _totalContextsCreated);
            
            _logger?.LogDebug("📦 CONTEXT ACQUIRED: {ContextId} with profile {Profile}", contextId, resourceProfile);
            return context;
        }
        catch
        {
            _contextSemaphore.Release();
            throw;
        }
    }

    /// <summary>
    /// Create isolated scope for resource management
    /// </summary>
    public async Task<IsolatedResourceScope> CreateIsolatedScopeAsync(Dictionary<string, object> resourceRequirements)
    {
        var scopeId = Guid.NewGuid().ToString("N")[..8];
        
        // Create service scope
        var serviceScope = await CreateServiceScopeAsync(resourceRequirements);
        
        // Get or create database context
        var dbContext = await AcquireDbContextAsync();
        
        var isolatedScope = new IsolatedResourceScope(scopeId, serviceScope, dbContext, this);
        
        _logger?.LogDebug("🔒 ISOLATED SCOPE: Created {ScopeId}", scopeId);
        return isolatedScope;
    }

    /// <summary>
    /// Acquire database context from pool or create new
    /// </summary>
    public async Task<PooledDbContext> AcquireDbContextAsync()
    {
        await _dbPoolSemaphore.WaitAsync();
        
        try
        {
            // Try to get from pool first
            if (_dbContextPool.TryDequeue(out var pooledContext) && IsDbContextHealthy(pooledContext))
            {
                await ResetDbContextAsync(pooledContext);
                Interlocked.Increment(ref _totalContextsReused);
                
                _logger?.LogDebug("♻️ DB CONTEXT: Reused from pool");
                return pooledContext;
            }
            
            // Create new context
            var newContext = await CreateDbContextAsync();
            Interlocked.Increment(ref _totalDbConnectionsCreated);
            
            _logger?.LogDebug("🆕 DB CONTEXT: Created new context");
            return newContext;
        }
        catch
        {
            _dbPoolSemaphore.Release();
            throw;
        }
    }

    /// <summary>
    /// Return database context to pool
    /// </summary>
    public async Task ReturnDbContextAsync(PooledDbContext dbContext)
    {
        try
        {
            if (IsDbContextHealthy(dbContext) && _dbContextPool.Count < _config.MaxPooledDbContexts)
            {
                await PrepareDbContextForReuseAsync(dbContext);
                _dbContextPool.Enqueue(dbContext);
                
                _logger?.LogDebug("🔄 DB CONTEXT: Returned to pool");
            }
            else
            {
                await dbContext.DisposeAsync();
                _logger?.LogDebug("🗑️ DB CONTEXT: Disposed (unhealthy or pool full)");
            }
        }
        finally
        {
            _dbPoolSemaphore.Release();
        }
    }

    /// <summary>
    /// Cleanup batch resources after test execution
    /// </summary>
    public async Task CleanupBatchResourcesAsync(string batchId)
    {
        var contextsToCleanup = _activeContexts.Values
            .Where(ctx => ctx.BatchId == batchId)
            .ToArray();
        
        foreach (var context in contextsToCleanup)
        {
            try
            {
                await context.DisposeAsync();
                _activeContexts.TryRemove(context.ContextId, out _);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "⚠️ CLEANUP: Error cleaning up context {ContextId}", context.ContextId);
            }
        }
        
        _logger?.LogDebug("🧹 BATCH CLEANUP: Cleaned {Count} contexts for batch {BatchId}", 
            contextsToCleanup.Length, batchId);
    }

    /// <summary>
    /// Generate resource utilization report
    /// </summary>
    public async Task<ResourceReport> GenerateResourceReportAsync()
    {
        var activeConnections = _activeContexts.Count;
        var pooledConnections = _dbContextPool.Count;
        var totalCreated = _totalContextsCreated + _totalDbConnectionsCreated;
        var efficiency = totalCreated > 0 ? (double)_totalContextsReused / totalCreated : 1.0;
        
        var bottlenecks = await AnalyzeResourceBottlenecksAsync();
        
        return new ResourceReport
        {
            ActiveConnections = activeConnections,
            PooledConnections = pooledConnections,
            PoolEfficiency = efficiency,
            ResourceBottlenecks = bottlenecks,
            SessionDuration = _sessionStopwatch.Elapsed,
            TotalResourcesCreated = totalCreated,
            ResourceReuseRate = efficiency
        };
    }

    #region Private Implementation

    private async Task<ResourceContext> CreateResourceContextAsync(string contextId, string resourceProfile)
    {
        var serviceScope = await CreateServiceScopeAsync(GetResourceRequirements(resourceProfile));
        var dbContext = await AcquireDbContextAsync();
        
        return new ResourceContext(contextId, serviceScope, dbContext, resourceProfile, this);
    }

    private async Task<IServiceScope> CreateServiceScopeAsync(Dictionary<string, object> requirements)
    {
        // Create optimized service collection
        var services = new ServiceCollection();
        
        // Configure based on requirements
        ConfigureServicesForRequirements(services, requirements);
        
        var serviceProvider = services.BuildServiceProvider();
        return serviceProvider.CreateScope();
    }

    private void ConfigureServicesForRequirements(IServiceCollection services, Dictionary<string, object> requirements)
    {
        // Add basic services
        services.AddLogging();
        
        // Configure database if needed
        if (requirements.ContainsKey("database"))
        {
            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options.UseInMemoryDatabase($"TestDb_{Guid.NewGuid():N}");
                options.EnableServiceProviderCaching(false);
                options.EnableSensitiveDataLogging(false);
            });
        }
        
        // Add other required services based on requirements
        foreach (var requirement in requirements)
        {
            ConfigureServiceForRequirement(services, requirement.Key, requirement.Value);
        }
    }

    private void ConfigureServiceForRequirement(IServiceCollection services, string requirementType, object value)
    {
        switch (requirementType.ToLowerInvariant())
        {
            case "authentication":
                // Configure authentication services
                break;
                
            case "caching":
                // Configure caching services
                break;
                
            case "logging":
                // Configure additional logging
                break;
        }
    }

    private async Task<PooledDbContext> CreateDbContextAsync()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"PooledDb_{Guid.NewGuid():N}")
            .EnableServiceProviderCaching(false)
            .EnableSensitiveDataLogging(false)
            .Options;
        
        var context = new ApplicationDbContext(options);
        await context.Database.EnsureCreatedAsync();
        
        return new PooledDbContext(context, DateTime.UtcNow);
    }

    private bool IsDbContextHealthy(PooledDbContext pooledContext)
    {
        try
        {
            // Check if context is not disposed and connection is valid
            if (pooledContext.Context.Database.CanConnect())
            {
                // Check age
                var age = DateTime.UtcNow - pooledContext.CreatedAt;
                return age < _config.MaxDbContextAge;
            }
        }
        catch
        {
            // Context is unhealthy
        }
        
        return false;
    }

    private async Task ResetDbContextAsync(PooledDbContext pooledContext)
    {
        try
        {
            // Clear any tracked entities
            pooledContext.Context.ChangeTracker.Clear();
            
            // Reset database state if needed
            await pooledContext.Context.Database.EnsureDeletedAsync();
            await pooledContext.Context.Database.EnsureCreatedAsync();
            
            pooledContext.LastUsed = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "⚠️ DB RESET: Error resetting database context");
            throw;
        }
    }

    private async Task PrepareDbContextForReuseAsync(PooledDbContext pooledContext)
    {
        try
        {
            // Save any pending changes
            if (pooledContext.Context.ChangeTracker.HasChanges())
            {
                await pooledContext.Context.SaveChangesAsync();
            }
            
            // Clear change tracker
            pooledContext.Context.ChangeTracker.Clear();
            
            pooledContext.LastUsed = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "⚠️ DB PREPARE: Error preparing context for reuse");
            throw;
        }
    }

    private Dictionary<string, object> GetResourceRequirements(string resourceProfile)
    {
        return resourceProfile.ToLowerInvariant() switch
        {
            "database" => new Dictionary<string, object> { { "database", true }, { "logging", "minimal" } },
            "api" => new Dictionary<string, object> { { "authentication", true }, { "logging", "normal" } },
            "integration" => new Dictionary<string, object> { { "database", true }, { "authentication", true }, { "caching", true } },
            _ => new Dictionary<string, object> { { "logging", "minimal" } }
        };
    }

    private async Task<List<string>> AnalyzeResourceBottlenecksAsync()
    {
        var bottlenecks = new List<string>();
        
        var activeCount = _activeContexts.Count;
        var poolCount = _dbContextPool.Count;
        
        if (activeCount > _config.MaxConcurrentContexts * 0.8)
        {
            bottlenecks.Add($"High active context usage: {activeCount}/{_config.MaxConcurrentContexts}");
        }
        
        if (poolCount < 2 && _totalDbConnectionsCreated > 10)
        {
            bottlenecks.Add("Low database connection pool utilization");
        }
        
        var efficiency = _totalContextsCreated > 0 ? (double)_totalContextsReused / _totalContextsCreated : 1.0;
        if (efficiency < 0.3)
        {
            bottlenecks.Add($"Low resource reuse efficiency: {efficiency:P1}");
        }
        
        await Task.CompletedTask;
        return bottlenecks;
    }

    private async void CleanupResourcesAsync(object? state)
    {
        try
        {
            // Cleanup expired contexts
            await CleanupExpiredContextsAsync();
            
            // Cleanup old database contexts
            await CleanupOldDbContextsAsync();
            
            // Cleanup service scopes
            CleanupServiceScopes();
            
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "❌ CLEANUP: Error during resource cleanup");
        }
    }

    private async Task CleanupExpiredContextsAsync()
    {
        var expiredContexts = _activeContexts.Values
            .Where(ctx => ctx.IsExpired(_config.MaxContextAge))
            .ToArray();
        
        foreach (var context in expiredContexts)
        {
            try
            {
                await context.DisposeAsync();
                _activeContexts.TryRemove(context.ContextId, out _);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "⚠️ CLEANUP: Error disposing expired context {ContextId}", 
                    context.ContextId);
            }
        }
        
        if (expiredContexts.Length > 0)
        {
            _logger?.LogDebug("🧹 CLEANUP: Removed {Count} expired contexts", expiredContexts.Length);
        }
    }

    private async Task CleanupOldDbContextsAsync()
    {
        var cleanupQueue = new ConcurrentQueue<PooledDbContext>();
        var now = DateTime.UtcNow;
        
        while (_dbContextPool.TryDequeue(out var pooledContext))
        {
            if (now - pooledContext.LastUsed > _config.MaxDbContextAge)
            {
                try
                {
                    await pooledContext.DisposeAsync();
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "⚠️ CLEANUP: Error disposing old DB context");
                }
            }
            else
            {
                cleanupQueue.Enqueue(pooledContext);
            }
        }
        
        // Re-add non-expired contexts
        while (cleanupQueue.TryDequeue(out var context))
        {
            _dbContextPool.Enqueue(context);
        }
    }

    private void CleanupServiceScopes()
    {
        var expiredScopes = _serviceScopePool.Where(kvp => 
            kvp.Value == null || IsServiceScopeExpired(kvp.Value)).ToArray();
        
        foreach (var kvp in expiredScopes)
        {
            try
            {
                kvp.Value?.Dispose();
                _serviceScopePool.TryRemove(kvp.Key, out _);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "⚠️ CLEANUP: Error disposing service scope {ScopeId}", kvp.Key);
            }
        }
    }

    private bool IsServiceScopeExpired(IServiceScope scope)
    {
        // Simple implementation - in practice you might track creation time
        return false;
    }

    internal void NotifyContextDisposed(string contextId)
    {
        _activeContexts.TryRemove(contextId, out _);
        _contextSemaphore.Release();
        
        _logger?.LogDebug("📦 CONTEXT DISPOSED: {ContextId}", contextId);
    }

    #endregion

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        _disposed = true;

        try
        {
            _logger?.LogInformation("🧹 DISPOSAL: Disposing OptimizedResourcePool");
            
            _cleanupTimer?.Dispose();
            
            // Dispose all active contexts
            foreach (var context in _activeContexts.Values)
            {
                try
                {
                    await context.DisposeAsync();
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "⚠️ DISPOSAL: Error disposing context {ContextId}", 
                        context.ContextId);
                }
            }
            _activeContexts.Clear();
            
            // Dispose pooled database contexts
            while (_dbContextPool.TryDequeue(out var pooledContext))
            {
                try
                {
                    await pooledContext.DisposeAsync();
                }
                catch
                {
                    // Ignore disposal errors
                }
            }
            
            // Dispose service scopes
            foreach (var scope in _serviceScopePool.Values)
            {
                try
                {
                    scope?.Dispose();
                }
                catch
                {
                    // Ignore disposal errors
                }
            }
            _serviceScopePool.Clear();
            
            _contextSemaphore.Dispose();
            _dbPoolSemaphore.Dispose();
            
            _logger?.LogInformation("✅ DISPOSAL: ResourcePool disposed - Contexts created: {Created}, Reused: {Reused}, Efficiency: {Efficiency:P1}", 
                _totalContextsCreated, _totalContextsReused, 
                _totalContextsCreated > 0 ? (double)_totalContextsReused / _totalContextsCreated : 1.0);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "❌ DISPOSAL: Error during OptimizedResourcePool disposal");
        }
    }
}

/// <summary>
/// Resource context for managing test execution resources
/// </summary>
public sealed class ResourceContext : IAsyncDisposable
{
    private readonly IServiceScope _serviceScope;
    private readonly PooledDbContext _dbContext;
    private readonly OptimizedResourcePool _pool;
    private readonly DateTime _createdAt;
    private bool _disposed = false;

    public string ContextId { get; }
    public string ResourceProfile { get; }
    public string BatchId { get; set; } = string.Empty;
    public IServiceProvider ServiceProvider => _serviceScope.ServiceProvider;
    public ApplicationDbContext DbContext => _dbContext.Context;

    internal ResourceContext(string contextId, IServiceScope serviceScope, PooledDbContext dbContext, 
        string resourceProfile, OptimizedResourcePool pool)
    {
        ContextId = contextId;
        _serviceScope = serviceScope;
        _dbContext = dbContext;
        ResourceProfile = resourceProfile;
        _pool = pool;
        _createdAt = DateTime.UtcNow;
    }

    public bool IsExpired(TimeSpan maxAge) => DateTime.UtcNow - _createdAt > maxAge;

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        _disposed = true;

        try
        {
            _serviceScope?.Dispose();
            await _pool.ReturnDbContextAsync(_dbContext);
            _pool.NotifyContextDisposed(ContextId);
        }
        catch
        {
            // Ignore disposal errors
        }
    }
}

/// <summary>
/// Isolated resource scope for controlled resource access
/// </summary>
public sealed class IsolatedResourceScope : IAsyncDisposable
{
    private readonly IServiceScope _serviceScope;
    private readonly PooledDbContext _dbContext;
    private readonly OptimizedResourcePool _pool;
    private bool _disposed = false;

    public string ScopeId { get; }
    public IServiceProvider ServiceProvider => _serviceScope.ServiceProvider;
    public ApplicationDbContext DbContext => _dbContext.Context;

    internal IsolatedResourceScope(string scopeId, IServiceScope serviceScope, PooledDbContext dbContext, 
        OptimizedResourcePool pool)
    {
        ScopeId = scopeId;
        _serviceScope = serviceScope;
        _dbContext = dbContext;
        _pool = pool;
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        _disposed = true;

        try
        {
            _serviceScope?.Dispose();
            await _pool.ReturnDbContextAsync(_dbContext);
        }
        catch
        {
            // Ignore disposal errors
        }
    }
}

/// <summary>
/// Pooled database context wrapper
/// </summary>
public sealed class PooledDbContext : IAsyncDisposable
{
    public ApplicationDbContext Context { get; }
    public DateTime CreatedAt { get; }
    public DateTime LastUsed { get; set; }

    internal PooledDbContext(ApplicationDbContext context, DateTime createdAt)
    {
        Context = context;
        CreatedAt = createdAt;
        LastUsed = createdAt;
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            await Context.DisposeAsync();
        }
        catch
        {
            // Ignore disposal errors
        }
    }
}

/// <summary>
/// Resource pool configuration
/// </summary>
public class ResourcePoolConfiguration
{
    public int MaxConcurrentContexts { get; set; } = 50;
    public int MaxDbConnections { get; set; } = 20;
    public int MaxPooledDbContexts { get; set; } = 10;
    public TimeSpan MaxContextAge { get; set; } = TimeSpan.FromMinutes(5);
    public TimeSpan MaxDbContextAge { get; set; } = TimeSpan.FromMinutes(2);
    public TimeSpan CleanupInterval { get; set; } = TimeSpan.FromMinutes(1);
}