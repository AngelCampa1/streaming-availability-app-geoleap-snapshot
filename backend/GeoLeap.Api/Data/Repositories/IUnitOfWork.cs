using GeoLeap.Api.Models;

namespace GeoLeap.Api.Data.Repositories;

/// <summary>
/// Unit of Work pattern for managing transactions and coordinating repositories
/// </summary>
public interface IUnitOfWork : IDisposable
{
    // User Management Repositories
    IUserRepository Users { get; }
    IRepository<UserRole, Guid> UserRoles { get; }
    IRepository<Role, Guid> Roles { get; }
    IRepository<Permission, Guid> Permissions { get; }
    IRepository<RolePermission, Guid> RolePermissions { get; }

    // Authentication & Security Repositories
    IRepository<UserSession, Guid> UserSessions { get; }
    IRepository<PasswordResetToken, Guid> PasswordResetTokens { get; }
    IRepository<PasswordHistory, Guid> PasswordHistories { get; }
    IRepository<SecurityEvent, Guid> SecurityEvents { get; }
    IRepository<SecurityPreferences, Guid> SecurityPreferences { get; }

    // Content Management Repositories
    IContentRepository? Contents { get; }
    IRepository<SearchableContent, int> SearchableContents { get; }
    IRepository<ContentStreamingOption, int> ContentStreamingOptions { get; }
    IRepository<ContentAlternativeTitle, int> ContentAlternativeTitles { get; }
    IRepository<ContentMetadata, Guid> ContentMetadata { get; }

    // Payment & Subscription Repositories
    IPaymentRepository? Payments { get; }
    ISubscriptionRepository? Subscriptions { get; }
    IRepository<PaymentMethod, Guid> PaymentMethods { get; }
    IRepository<StripeCustomer, Guid> StripeCustomers { get; }
    IRepository<WebhookEvent, Guid> WebhookEvents { get; }
    IRepository<Invoice, Guid> Invoices { get; }
    IRepository<InvoiceLineItem, Guid> InvoiceLineItems { get; }

    // Search & Analytics Repositories
    IRepository<SearchHistory, Guid> SearchHistories { get; }
    IRepository<SearchAnalytics, Guid> SearchAnalytics { get; }
    IRepository<SearchAnalyticsEvent, Guid> SearchAnalyticsEvents { get; }
    IRepository<SearchJourney, Guid> SearchJourneys { get; }
    IRepository<SearchStep, Guid> SearchSteps { get; }
    IRepository<SearchTrend, Guid> SearchTrends { get; }

    // Notification & User Preferences Repositories
    IRepository<NotificationPreferences, Guid> NotificationPreferences { get; }
    IRepository<UserPreferences, Guid> UserPreferences { get; }
    IRepository<UserOnboarding, Guid> UserOnboardings { get; }
    IRepository<UserStreamingService, Guid> UserStreamingServices { get; }

    // Admin & System Repositories
    IRepository<AdminAction, Guid> AdminActions { get; }
    IRepository<UserAuditLog, Guid> UserAuditLogs { get; }
    IRepository<UserActivityLog, Guid> UserActivityLogs { get; }
    IRepository<SystemAlert, Guid> SystemAlerts { get; }

    // SEO & Optimization Repositories
    IRepository<SeoMetadata, Guid> SeoMetadata { get; }
    IRepository<SitemapEntry, Guid> SitemapEntries { get; }
    IRepository<CoreWebVitals, Guid> CoreWebVitals { get; }

    // Social Sharing Repositories
    IRepository<SocialShare, Guid> SocialShares { get; }
    IRepository<SocialShareEvent, Guid> SocialShareEvents { get; }
    IRepository<ShareLinkClick, Guid> ShareLinkClicks { get; }

    // A/B Testing Repositories
    IRepository<ABExperiment, Guid> ABExperiments { get; }
    IRepository<ExperimentVariant, Guid> ExperimentVariants { get; }
    IRepository<ExperimentEvent, Guid> ExperimentEvents { get; }
    IRepository<ExperimentAssignment, Guid> ExperimentAssignments { get; }

    // Transaction Management
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<TResult> ExecuteTransactionAsync<TResult>(Func<Task<TResult>> operation, CancellationToken cancellationToken = default);
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);

    // Bulk Operations
    Task<int> BulkSaveChangesAsync(CancellationToken cancellationToken = default);
    Task<int> ExecuteBulkOperationAsync<T>(Func<Task<int>> operation) where T : class;

    // Cache Management
    Task InvalidateCacheAsync(params string[] cacheKeys);
    Task<T?> GetFromCacheAsync<T>(string cacheKey) where T : class;
    Task SetCacheAsync<T>(string cacheKey, T value, TimeSpan? expiration = null) where T : class;

    // Audit Trail
    Task<IEnumerable<UserAuditLog>> GetAuditTrailAsync(Guid userId, int? limit = null);
    Task LogUserActionAsync(Guid userId, string action, object? details = null);

    // Health Check
    Task<bool> IsHealthyAsync();
    Task<Dictionary<string, object>> GetConnectionInfoAsync();
}