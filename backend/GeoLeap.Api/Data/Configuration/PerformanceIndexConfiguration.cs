using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Data.Configuration;

/// <summary>
/// Database performance optimization configurations including indexes and constraints
/// </summary>
public static class PerformanceIndexConfiguration
{
    /// <summary>
    /// Configures performance indexes for the ApplicationDbContext
    /// </summary>
    public static void ConfigurePerformanceIndexes(ModelBuilder modelBuilder)
    {
        ConfigureUserIndexes(modelBuilder);
        ConfigureContentIndexes(modelBuilder);
        ConfigurePaymentIndexes(modelBuilder);
        ConfigureSearchIndexes(modelBuilder);
        ConfigureAuditIndexes(modelBuilder);
        ConfigureAnalyticsIndexes(modelBuilder);
        ConfigureSEOIndexes(modelBuilder);
    }

    private static void ConfigureUserIndexes(ModelBuilder modelBuilder)
    {
        // User entity indexes
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique().HasDatabaseName("IX_Users_Email");
            entity.HasIndex(e => e.UserName).IsUnique().HasDatabaseName("IX_Users_UserName");
            entity.HasIndex(e => e.GoogleId).HasDatabaseName("IX_Users_GoogleId").HasFilter("[GoogleId] IS NOT NULL");
            entity.HasIndex(e => e.AppleId).HasDatabaseName("IX_Users_AppleId").HasFilter("[AppleId] IS NOT NULL");
            entity.HasIndex(e => new { e.IsActive, e.CreatedAt }).HasDatabaseName("IX_Users_Active_Created");
            entity.HasIndex(e => new { e.IsSuspended, e.SuspendedAt }).HasDatabaseName("IX_Users_Suspended");
            entity.HasIndex(e => new { e.EmailConfirmed, e.CreatedAt }).HasDatabaseName("IX_Users_EmailVerified_Created");
            entity.HasIndex(e => e.LastLoginAt).HasDatabaseName("IX_Users_LastLogin");
        });

        // User roles and permissions indexes
        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.RoleId }).IsUnique().HasDatabaseName("IX_UserRoles_User_Role");
            entity.HasIndex(e => e.UserId).HasDatabaseName("IX_UserRoles_UserId");
            entity.HasIndex(e => e.RoleId).HasDatabaseName("IX_UserRoles_RoleId");
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasIndex(e => new { e.RoleId, e.PermissionId }).IsUnique().HasDatabaseName("IX_RolePermissions_Role_Permission");
            entity.HasIndex(e => e.RoleId).HasDatabaseName("IX_RolePermissions_RoleId");
            entity.HasIndex(e => e.PermissionId).HasDatabaseName("IX_RolePermissions_PermissionId");
        });

        // User sessions indexes
        modelBuilder.Entity<UserSession>(entity =>
        {
            entity.HasIndex(e => e.SessionToken).IsUnique().HasDatabaseName("IX_UserSessions_SessionToken");
            entity.HasIndex(e => new { e.UserId, e.IsActive }).HasDatabaseName("IX_UserSessions_User_Active");
            entity.HasIndex(e => e.LastAccessedAt).HasDatabaseName("IX_UserSessions_LastAccessed");
        });

        // User audit logs indexes
        modelBuilder.Entity<UserAuditLog>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.Timestamp }).HasDatabaseName("IX_UserAuditLogs_User_Timestamp");
            entity.HasIndex(e => e.Action).HasDatabaseName("IX_UserAuditLogs_Action");
            entity.HasIndex(e => e.Timestamp).HasDatabaseName("IX_UserAuditLogs_Timestamp");
        });
    }

    private static void ConfigureContentIndexes(ModelBuilder modelBuilder)
    {
        // Content entity indexes
        modelBuilder.Entity<SearchableContent>(entity =>
        {
            entity.HasIndex(e => e.Title).HasDatabaseName("IX_Content_Title");
            entity.HasIndex(e => new { e.ContentType, e.ReleaseYear }).HasDatabaseName("IX_Content_Type_Year");
            entity.HasIndex(e => new { e.ContentType, e.ImdbRating }).HasDatabaseName("IX_Content_Type_Rating");
            entity.HasIndex(e => e.ExternalId).HasDatabaseName("IX_Content_ExternalId");
            entity.HasIndex(e => new { e.ExternalSource, e.ExternalId }).IsUnique().HasDatabaseName("IX_Content_Source_ExternalId");
            entity.HasIndex(e => e.Genre).HasDatabaseName("IX_Content_Genre");
            entity.HasIndex(e => e.CreatedAt).HasDatabaseName("IX_Content_Created");
            entity.HasIndex(e => e.UpdatedAt).HasDatabaseName("IX_Content_Updated");
        });

        // Content streaming options indexes
        modelBuilder.Entity<ContentStreamingOption>(entity =>
        {
            entity.HasIndex(e => new { e.ContentId, e.ServiceName }).HasDatabaseName("IX_ContentStreamingOptions_Content_Service");
            entity.HasIndex(e => new { e.ServiceName, e.Country }).HasDatabaseName("IX_ContentStreamingOptions_Service_Country");
            entity.HasIndex(e => new { e.ContentId, e.Country }).HasDatabaseName("IX_ContentStreamingOptions_Content_Country");
        });

        // Content alternative titles indexes
        modelBuilder.Entity<ContentAlternativeTitle>(entity =>
        {
            entity.HasIndex(e => e.ContentId).HasDatabaseName("IX_ContentAlternativeTitles_ContentId");
            entity.HasIndex(e => e.Title).HasDatabaseName("IX_ContentAlternativeTitles_Title");
            entity.HasIndex(e => new { e.ContentId, e.Language }).HasDatabaseName("IX_ContentAlternativeTitles_Content_Language");
        });
    }

    private static void ConfigurePaymentIndexes(ModelBuilder modelBuilder)
    {
        // Payment transactions indexes
        modelBuilder.Entity<PaymentTransaction>(entity =>
        {
            entity.HasIndex(e => e.UserId).HasDatabaseName("IX_PaymentTransactions_UserId");
            entity.HasIndex(e => e.StripePaymentIntentId).IsUnique().HasDatabaseName("IX_PaymentTransactions_StripePaymentIntentId")
                .HasFilter("[StripePaymentIntentId] IS NOT NULL");
            entity.HasIndex(e => new { e.Status, e.CreatedAt }).HasDatabaseName("IX_PaymentTransactions_Status_Created");
            entity.HasIndex(e => e.CreatedAt).HasDatabaseName("IX_PaymentTransactions_Created");
        });

        // Subscriptions indexes
        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.HasIndex(e => e.UserId).HasDatabaseName("IX_Subscriptions_UserId");
            entity.HasIndex(e => e.StripeSubscriptionId).IsUnique().HasDatabaseName("IX_Subscriptions_StripeSubscriptionId")
                .HasFilter("[StripeSubscriptionId] IS NOT NULL");
            entity.HasIndex(e => new { e.Status, e.CurrentPeriodEnd }).HasDatabaseName("IX_Subscriptions_Status_PeriodEnd");
            entity.HasIndex(e => e.PlanId).HasDatabaseName("IX_Subscriptions_PlanId");
        });

        // Payment methods indexes
        modelBuilder.Entity<PaymentMethod>(entity =>
        {
            entity.HasIndex(e => e.UserId).HasDatabaseName("IX_PaymentMethods_UserId");
            entity.HasIndex(e => e.StripePaymentMethodId).IsUnique().HasDatabaseName("IX_PaymentMethods_StripePaymentMethodId");
            entity.HasIndex(e => new { e.UserId, e.IsDefault }).HasDatabaseName("IX_PaymentMethods_User_Default");
        });

        // Stripe customers indexes
        modelBuilder.Entity<StripeCustomer>(entity =>
        {
            entity.HasIndex(e => e.UserId).IsUnique().HasDatabaseName("IX_StripeCustomers_UserId");
            entity.HasIndex(e => e.StripeCustomerId).IsUnique().HasDatabaseName("IX_StripeCustomers_StripeCustomerId");
        });
    }

    private static void ConfigureSearchIndexes(ModelBuilder modelBuilder)
    {
        // Search history indexes
        modelBuilder.Entity<SearchHistory>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.SearchedAt }).HasDatabaseName("IX_SearchHistory_User_SearchedAt");
            entity.HasIndex(e => e.SearchTerm).HasDatabaseName("IX_SearchHistory_SearchTerm");
            entity.HasIndex(e => e.SearchedAt).HasDatabaseName("IX_SearchHistory_SearchedAt");
        });

        // Search analytics indexes
        modelBuilder.Entity<SearchAnalytics>(entity =>
        {
            entity.HasIndex(e => new { e.SearchTerm, e.Date }).HasDatabaseName("IX_SearchAnalytics_Term_Date");
            entity.HasIndex(e => e.Date).HasDatabaseName("IX_SearchAnalytics_Date");
            entity.HasIndex(e => e.ResultCount).HasDatabaseName("IX_SearchAnalytics_ResultCount");
        });

        // Search journey indexes
        modelBuilder.Entity<SearchJourney>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.StartedAt }).HasDatabaseName("IX_SearchJourneys_User_Started");
            entity.HasIndex(e => e.SessionId).HasDatabaseName("IX_SearchJourneys_SessionId");
        });

        // Search trends indexes
        modelBuilder.Entity<SearchTrend>(entity =>
        {
            entity.HasIndex(e => new { e.SearchTerm, e.Date }).IsUnique().HasDatabaseName("IX_SearchTrends_Term_Date");
            entity.HasIndex(e => new { e.Date, e.SearchCount }).HasDatabaseName("IX_SearchTrends_Date_Count");
        });
    }

    private static void ConfigureAuditIndexes(ModelBuilder modelBuilder)
    {
        // User activity logs indexes
        modelBuilder.Entity<UserActivityLog>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.Timestamp }).HasDatabaseName("IX_UserActivityLogs_User_Timestamp");
            entity.HasIndex(e => e.ActivityType).HasDatabaseName("IX_UserActivityLogs_ActivityType");
            entity.HasIndex(e => e.Timestamp).HasDatabaseName("IX_UserActivityLogs_Timestamp");
        });

        // Security events indexes
        modelBuilder.Entity<SecurityEvent>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.EventType, e.Timestamp }).HasDatabaseName("IX_SecurityEvents_User_Type_Timestamp");
            entity.HasIndex(e => new { e.EventType, e.Severity }).HasDatabaseName("IX_SecurityEvents_Type_Severity");
            entity.HasIndex(e => e.IpAddress).HasDatabaseName("IX_SecurityEvents_IpAddress");
        });

        // Admin actions indexes
        modelBuilder.Entity<AdminAction>(entity =>
        {
            entity.HasIndex(e => new { e.AdminUserId, e.Timestamp }).HasDatabaseName("IX_AdminActions_AdminUser_Timestamp");
            entity.HasIndex(e => e.ActionType).HasDatabaseName("IX_AdminActions_ActionType");
            entity.HasIndex(e => e.TargetUserId).HasDatabaseName("IX_AdminActions_TargetUserId")
                .HasFilter("[TargetUserId] IS NOT NULL");
        });
    }

    private static void ConfigureAnalyticsIndexes(ModelBuilder modelBuilder)
    {
        // API usage records indexes
        modelBuilder.Entity<ApiUsageRecord>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.Timestamp }).HasDatabaseName("IX_ApiUsageRecords_User_Timestamp");
            entity.HasIndex(e => new { e.Endpoint, e.Timestamp }).HasDatabaseName("IX_ApiUsageRecords_Endpoint_Timestamp");
            entity.HasIndex(e => e.ResponseTime).HasDatabaseName("IX_ApiUsageRecords_ResponseTime");
        });

        // Paywall analytics indexes
        modelBuilder.Entity<PaywallAnalytics>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.EventDate }).HasDatabaseName("IX_PaywallAnalytics_User_Date");
            entity.HasIndex(e => new { e.EventType, e.EventDate }).HasDatabaseName("IX_PaywallAnalytics_Type_Date");
        });

        // A/B experiment indexes
        modelBuilder.Entity<ExperimentAssignment>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.ExperimentId }).IsUnique().HasDatabaseName("IX_ExperimentAssignments_User_Experiment");
            entity.HasIndex(e => e.ExperimentId).HasDatabaseName("IX_ExperimentAssignments_ExperimentId");
        });
    }

    private static void ConfigureSEOIndexes(ModelBuilder modelBuilder)
    {
        // SEO metadata indexes
        modelBuilder.Entity<SeoMetadata>(entity =>
        {
            entity.HasIndex(e => e.Path).IsUnique().HasDatabaseName("IX_SeoMetadata_Path");
            entity.HasIndex(e => e.UpdatedAt).HasDatabaseName("IX_SeoMetadata_Updated");
        });

        // Sitemap entries indexes
        modelBuilder.Entity<SitemapEntry>(entity =>
        {
            entity.HasIndex(e => e.Url).IsUnique().HasDatabaseName("IX_SitemapEntries_Url");
            entity.HasIndex(e => new { e.Priority, e.LastModified }).HasDatabaseName("IX_SitemapEntries_Priority_LastModified");
        });

        // Core Web Vitals indexes
        modelBuilder.Entity<CoreWebVitals>(entity =>
        {
            entity.HasIndex(e => new { e.Url, e.MeasuredAt }).HasDatabaseName("IX_CoreWebVitals_Url_MeasuredAt");
            entity.HasIndex(e => e.MeasuredAt).HasDatabaseName("IX_CoreWebVitals_MeasuredAt");
        });
    }
}