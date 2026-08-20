using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.AspNetCore.Identity;
using GeoLeap.Api.Models;
using System.Text.Json;

namespace GeoLeap.Api.Data.Repositories;

/// <summary>
/// Implementation of Unit of Work pattern for managing transactions and coordinating repositories
/// </summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private readonly IDistributedCache _cache;
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;
    private IDbContextTransaction? _transaction;

    // Repository instances
    private IUserRepository? _userRepository;
    private IContentRepository? _contentRepository;
    private IPaymentRepository? _paymentRepository;
    private ISubscriptionRepository? _subscriptionRepository;

    // Generic repositories
    private readonly Dictionary<Type, object> _repositories = new();

    public UnitOfWork(
        ApplicationDbContext context, 
        IDistributedCache cache,
        UserManager<User> userManager,
        RoleManager<IdentityRole<Guid>> roleManager)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
        _roleManager = roleManager ?? throw new ArgumentNullException(nameof(roleManager));
    }

    // Specialized repositories
    public IUserRepository Users => _userRepository ??= new UserRepository(_context, _userManager, _roleManager);
    // TODO: Re-enable when implementations are fixed
    public IContentRepository? Contents => null; // _contentRepository ??= new ContentRepository(_context);
    public IPaymentRepository? Payments => null; // _paymentRepository ??= new PaymentRepository(_context);
    public ISubscriptionRepository? Subscriptions => null; // _subscriptionRepository ??= new SubscriptionRepository(_context);

    // Generic repositories
    public IRepository<UserRole, Guid> UserRoles => GetRepository<UserRole, Guid>();
    public IRepository<Role, Guid> Roles => GetRepository<Role, Guid>();
    public IRepository<Permission, Guid> Permissions => GetRepository<Permission, Guid>();
    public IRepository<RolePermission, Guid> RolePermissions => GetRepository<RolePermission, Guid>();
    public IRepository<UserSession, Guid> UserSessions => GetRepository<UserSession, Guid>();
    public IRepository<PasswordResetToken, Guid> PasswordResetTokens => GetRepository<PasswordResetToken, Guid>();
    public IRepository<PasswordHistory, Guid> PasswordHistories => GetRepository<PasswordHistory, Guid>();
    public IRepository<SecurityEvent, Guid> SecurityEvents => GetRepository<SecurityEvent, Guid>();
    public IRepository<SecurityPreferences, Guid> SecurityPreferences => GetRepository<SecurityPreferences, Guid>();
    public IRepository<SearchableContent, int> SearchableContents => GetRepository<SearchableContent, int>();
    public IRepository<ContentStreamingOption, int> ContentStreamingOptions => GetRepository<ContentStreamingOption, int>();
    public IRepository<ContentAlternativeTitle, int> ContentAlternativeTitles => GetRepository<ContentAlternativeTitle, int>();
    public IRepository<ContentMetadata, Guid> ContentMetadata => GetRepository<ContentMetadata, Guid>();
    public IRepository<PaymentMethod, Guid> PaymentMethods => GetRepository<PaymentMethod, Guid>();
    public IRepository<StripeCustomer, Guid> StripeCustomers => GetRepository<StripeCustomer, Guid>();
    public IRepository<WebhookEvent, Guid> WebhookEvents => GetRepository<WebhookEvent, Guid>();
    public IRepository<Invoice, Guid> Invoices => GetRepository<Invoice, Guid>();
    public IRepository<InvoiceLineItem, Guid> InvoiceLineItems => GetRepository<InvoiceLineItem, Guid>();
    public IRepository<SearchHistory, Guid> SearchHistories => GetRepository<SearchHistory, Guid>();
    public IRepository<SearchAnalytics, Guid> SearchAnalytics => GetRepository<SearchAnalytics, Guid>();
    public IRepository<SearchAnalyticsEvent, Guid> SearchAnalyticsEvents => GetRepository<SearchAnalyticsEvent, Guid>();
    public IRepository<SearchJourney, Guid> SearchJourneys => GetRepository<SearchJourney, Guid>();
    public IRepository<SearchStep, Guid> SearchSteps => GetRepository<SearchStep, Guid>();
    public IRepository<SearchTrend, Guid> SearchTrends => GetRepository<SearchTrend, Guid>();
    public IRepository<NotificationPreferences, Guid> NotificationPreferences => GetRepository<NotificationPreferences, Guid>();
    public IRepository<UserPreferences, Guid> UserPreferences => GetRepository<UserPreferences, Guid>();
    public IRepository<UserOnboarding, Guid> UserOnboardings => GetRepository<UserOnboarding, Guid>();
    public IRepository<UserStreamingService, Guid> UserStreamingServices => GetRepository<UserStreamingService, Guid>();
    public IRepository<AdminAction, Guid> AdminActions => GetRepository<AdminAction, Guid>();
    public IRepository<UserAuditLog, Guid> UserAuditLogs => GetRepository<UserAuditLog, Guid>();
    public IRepository<UserActivityLog, Guid> UserActivityLogs => GetRepository<UserActivityLog, Guid>();
    public IRepository<SystemAlert, Guid> SystemAlerts => GetRepository<SystemAlert, Guid>();
    public IRepository<SeoMetadata, Guid> SeoMetadata => GetRepository<SeoMetadata, Guid>();
    public IRepository<SitemapEntry, Guid> SitemapEntries => GetRepository<SitemapEntry, Guid>();
    public IRepository<CoreWebVitals, Guid> CoreWebVitals => GetRepository<CoreWebVitals, Guid>();
    public IRepository<SocialShare, Guid> SocialShares => GetRepository<SocialShare, Guid>();
    public IRepository<SocialShareEvent, Guid> SocialShareEvents => GetRepository<SocialShareEvent, Guid>();
    public IRepository<ShareLinkClick, Guid> ShareLinkClicks => GetRepository<ShareLinkClick, Guid>();
    public IRepository<ABExperiment, Guid> ABExperiments => GetRepository<ABExperiment, Guid>();
    public IRepository<ExperimentVariant, Guid> ExperimentVariants => GetRepository<ExperimentVariant, Guid>();
    public IRepository<ExperimentEvent, Guid> ExperimentEvents => GetRepository<ExperimentEvent, Guid>();
    public IRepository<ExperimentAssignment, Guid> ExperimentAssignments => GetRepository<ExperimentAssignment, Guid>();

    /// <summary>
    /// Gets or creates a generic repository instance
    /// </summary>
    private IRepository<TEntity, TKey> GetRepository<TEntity, TKey>() where TEntity : class
    {
        var type = typeof(TEntity);
        if (_repositories.ContainsKey(type))
        {
            return (IRepository<TEntity, TKey>)_repositories[type];
        }

        var repository = new Repository<TEntity, TKey>(_context);
        _repositories[type] = repository;
        return repository;
    }

    // Transaction Management
    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<TResult> ExecuteTransactionAsync<TResult>(Func<Task<TResult>> operation, CancellationToken cancellationToken = default)
    {
        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var result = await operation();
            await transaction.CommitAsync(cancellationToken);
            return result;
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        _transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
    }

    public async Task CommitTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction != null)
        {
            await _transaction.CommitAsync(cancellationToken);
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public async Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync(cancellationToken);
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    // Bulk Operations
    public async Task<int> BulkSaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // For better performance with large datasets, consider using EF Core Extensions
        return await SaveChangesAsync(cancellationToken);
    }

    public async Task<int> ExecuteBulkOperationAsync<T>(Func<Task<int>> operation) where T : class
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var result = await operation();
            await transaction.CommitAsync();
            return result;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // Cache Management
    public async Task InvalidateCacheAsync(params string[] cacheKeys)
    {
        foreach (var key in cacheKeys)
        {
            await _cache.RemoveAsync(key);
        }
    }

    public async Task<T?> GetFromCacheAsync<T>(string cacheKey) where T : class
    {
        var cachedData = await _cache.GetStringAsync(cacheKey);
        return cachedData != null ? JsonSerializer.Deserialize<T>(cachedData) : null;
    }

    public async Task SetCacheAsync<T>(string cacheKey, T value, TimeSpan? expiration = null) where T : class
    {
        var options = new DistributedCacheEntryOptions();
        if (expiration.HasValue)
        {
            options.SetAbsoluteExpiration(expiration.Value);
        }
        else
        {
            options.SetAbsoluteExpiration(TimeSpan.FromMinutes(30)); // Default cache time
        }

        var serializedValue = JsonSerializer.Serialize(value);
        await _cache.SetStringAsync(cacheKey, serializedValue, options);
    }

    // Audit Trail
    public async Task<IEnumerable<UserAuditLog>> GetAuditTrailAsync(Guid userId, int? limit = null)
    {
        return await Users.GetUserAuditLogsAsync(userId, limit);
    }

    public async Task LogUserActionAsync(Guid userId, string action, object? details = null)
    {
        var detailsJson = details != null ? JsonSerializer.Serialize(details) : null;
        await Users.LogUserActionAsync(userId, action, detailsJson);
    }

    // Health Check
    public async Task<bool> IsHealthyAsync()
    {
        try
        {
            return await _context.Database.CanConnectAsync();
        }
        catch
        {
            return false;
        }
    }

    public async Task<Dictionary<string, object>> GetConnectionInfoAsync()
    {
        var info = new Dictionary<string, object>
        {
            ["DatabaseName"] = _context.Database.GetDbConnection().Database,
            ["ServerVersion"] = _context.Database.GetDbConnection().ServerVersion ?? "Unknown",
            ["ConnectionState"] = _context.Database.GetDbConnection().State.ToString(),
            ["CanConnect"] = await _context.Database.CanConnectAsync(),
            ["PendingMigrations"] = (await _context.Database.GetPendingMigrationsAsync()).Count(),
            ["RepositoryCount"] = _repositories.Count
        };

        return info;
    }

    // Dispose pattern
    public void Dispose()
    {
        _transaction?.Dispose();
        _context?.Dispose();
    }
}