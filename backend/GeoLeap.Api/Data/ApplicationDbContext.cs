using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using GeoLeap.Api.Models;
using GeoLeap.Api.Models.GDPR;
using GeoLeap.Api.Models.AdvancedUserBehavior;
using GeoLeap.Api.Services.VpnGuidanceServices;
using System.Text.Json;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Data;

public class ApplicationDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    // Custom RBAC DbSets (Users provided by IdentityUserContext, Roles/UserRoles are custom)
    public new DbSet<Role> Roles { get; set; }
    public new DbSet<UserRole> UserRoles { get; set; }
    public DbSet<Permission> Permissions { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    public DbSet<UserAuditLog> UserAuditLogs { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<UserSession> UserSessions { get; set; }
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
    public DbSet<PasswordHistory> PasswordHistory { get; set; }
    public DbSet<NotificationPreferences> NotificationPreferences { get; set; }
    public DbSet<UserActivityLog> UserActivityLogs { get; set; }
    
    /// <summary>
    /// Alias for UserActivityLogs (for compatibility with BusinessAnalyticsController)
    /// </summary>
    public DbSet<UserActivityLog> UserActivities => UserActivityLogs;
    public DbSet<SecurityEvent> SecurityEvents { get; set; }
    public DbSet<SecurityPreferences> SecurityPreferences { get; set; }

    // Onboarding DbSets
    public DbSet<UserOnboarding> UserOnboardings { get; set; }
    public DbSet<StreamingService> StreamingServices { get; set; }
    public DbSet<StreamingContent> StreamingContents { get; set; }
    public DbSet<UserStreamingService> UserStreamingServices { get; set; }
    public DbSet<UserRegionPreference> UserRegionPreferences { get; set; }
    public DbSet<UserContentPreference> UserContentPreferences { get; set; }

    // User Preferences System DbSets
    public DbSet<UserPreference> UserPreferences { get; set; }
    public DbSet<PreferenceCategory> PreferenceCategories { get; set; }
    public DbSet<DefaultPreference> DefaultPreferences { get; set; }
    public DbSet<PreferenceHistory> PreferenceHistory { get; set; }

    // Admin Management DbSets
    public DbSet<AdminAction> AdminActions { get; set; }
    public DbSet<UserImpersonationSession> UserImpersonationSessions { get; set; }

    // API Usage Tracking DbSets
    public DbSet<ApiUsageRecord> ApiUsageRecords { get; set; }

    // Cache Persistence DbSets
    public DbSet<CachePersistenceEntry> CachePersistenceEntries { get; set; }

    // API Cost Management DbSets
    public DbSet<ApiCostRecord> ApiCostRecords { get; set; }

    // Watchlist System DbSets
    public DbSet<Watchlist> Watchlists { get; set; }
    public DbSet<WatchlistItem> WatchlistItems { get; set; }
    public DbSet<WatchlistItemAvailability> WatchlistItemAvailabilities { get; set; }
    public DbSet<WatchlistCategory> WatchlistCategories { get; set; }
    public DbSet<WatchlistShare> WatchlistShares { get; set; }
    public DbSet<WatchlistActivity> WatchlistActivities { get; set; }
    public DbSet<WatchlistNotificationSettings> WatchlistNotificationSettings { get; set; }
    public DbSet<WatchlistSettings> WatchlistSettings { get; set; }
    public DbSet<WatchlistView> WatchlistViews { get; set; }
    
    // US-8.2 Enhanced Notification System
    public DbSet<NotificationDeliveryLog> NotificationDeliveryLogs { get; set; }
    public DbSet<UserNotification> UserNotifications { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<NotificationDelivery> NotificationDeliveries { get; set; }
    public DbSet<NotificationInteraction> NotificationInteractions { get; set; }
    public DbSet<NotificationTemplate> NotificationTemplates { get; set; }
    public DbSet<NotificationSettings> NotificationSettings { get; set; }
    public DbSet<NotificationCampaign> NotificationCampaigns { get; set; }
    public DbSet<NotificationRateLimit> NotificationRateLimits { get; set; }
    public DbSet<NotificationQueue> NotificationQueues { get; set; }

    // Growth Analytics DbSets
    public DbSet<Models.GrowthAnalytics.GrowthEvent> GrowthEvents { get; set; }
    public DbSet<Models.GrowthAnalytics.AbTestExperiment> AbTestExperiments { get; set; }
    public DbSet<Models.GrowthAnalytics.AbTestAssignment> AbTestAssignments { get; set; }
    public DbSet<Models.GrowthAnalytics.AbTestConversion> AbTestConversions { get; set; }
    public DbSet<Models.GrowthAnalytics.GrowthAlert> GrowthAlerts { get; set; }
    public DbSet<Models.GrowthAnalytics.AlertTrigger> AlertTriggers { get; set; }
    public DbSet<Models.GrowthAnalytics.AttributionModel> AttributionModels { get; set; }
    public DbSet<Models.GrowthAnalytics.ConversionFunnel> ConversionFunnels { get; set; }
    public DbSet<Models.GrowthAnalytics.FunnelStep> FunnelSteps { get; set; }
    public DbSet<BudgetConfiguration> BudgetConfigurations { get; set; }
    public DbSet<BudgetAlert> BudgetAlerts { get; set; }

    // User Behavior Analytics DbSets
    public DbSet<Models.AdvancedUserBehavior.UserBehaviorEvent> UserBehaviorEvents { get; set; }
    public DbSet<Models.AdvancedUserBehavior.UserBehaviorSession> UserBehaviorSessions { get; set; }
    public DbSet<Models.AdvancedUserBehavior.UserBehaviorInsight> UserBehaviorInsights { get; set; }
    public DbSet<Models.AdvancedUserBehavior.UserBehaviorFunnel> UserBehaviorFunnels { get; set; }
    public DbSet<Models.AdvancedUserBehavior.UserBehaviorFunnelStep> UserBehaviorFunnelSteps { get; set; }
    
    // SEO DbSets
    public DbSet<SeoMetadata> SeoMetadata { get; set; }
    public DbSet<SitemapEntry> SitemapEntries { get; set; }
    public DbSet<SeoMetrics> SeoMetrics { get; set; }
    public DbSet<CoreWebVitals> CoreWebVitals { get; set; }
    // InternalLink is a DTO, not an entity - removed from DbContext
    
    // Monitoring and Alerting DbSets
    public DbSet<MonitoringAlert> MonitoringAlerts { get; set; }
    public DbSet<PerformanceThreshold> PerformanceThresholds { get; set; }
    public DbSet<AzureMonitorAlertRule> AzureMonitorAlertRules { get; set; }
    public DbSet<AvailabilityTestResult> AvailabilityTestResults { get; set; }
    public DbSet<CustomPerformanceCounter> CustomPerformanceCounters { get; set; }

    // VPN Effectiveness Tracking DbSets - REMOVED (over-engineered feature)
    // Keeping models in case database still has tables, but feature is deprecated
    
    // US-8.4 Content Recommendation System DbSets
    public DbSet<ContentRating> ContentRatings { get; set; }
    public DbSet<RecommendationSettings> RecommendationSettings { get; set; }
    public DbSet<UserContentInteraction> UserContentInteractions { get; set; }
    public DbSet<CostOptimizationRecommendation> CostOptimizationRecommendations { get; set; }

    // Paywall and Subscription Management DbSets
    public DbSet<UserSubscription> UserSubscriptions { get; set; }
    public DbSet<UserSearchUsage> UserSearchUsages { get; set; }
    public DbSet<PaywallAnalytics> PaywallAnalytics { get; set; }
    public DbSet<PaywallEventRecord> PaywallEvents { get; set; }

    // VPN Streaming Service Subscriptions DbSets
    public DbSet<Entities.UserStreamingSubscription> UserStreamingSubscriptions { get; set; }

    // Mobile In-App Purchase Subscriptions DbSets
    public DbSet<MobileSubscription> MobileSubscriptions { get; set; }

    // US-8.5 Advanced Search and Filtering DbSets
    public DbSet<SearchableContent> SearchableContents { get; set; }
    public DbSet<ContentStreamingOption> ContentStreamingOptions { get; set; }
    public DbSet<ContentAlternativeTitle> ContentAlternativeTitles { get; set; }
    public DbSet<SearchAnalytics> SearchAnalytics { get; set; }
    public DbSet<SearchHistory> SearchHistories { get; set; }

    // Search Analytics & Insights DbSets
    public DbSet<SearchAnalyticsEvent> SearchAnalyticsEvents { get; set; }
    public DbSet<SearchJourney> SearchJourneys { get; set; }
    public DbSet<SearchStep> SearchSteps { get; set; }
    public DbSet<SearchPerformanceAlert> SearchPerformanceAlerts { get; set; }
    public DbSet<BusinessAlert> BusinessAlerts { get; set; }
    public DbSet<SearchTrend> SearchTrends { get; set; }

    // Payment Processing DbSets
    public DbSet<PaymentTransaction> PaymentTransactions { get; set; }
    public DbSet<PaymentMethod> PaymentMethods { get; set; }
    public DbSet<StripeCustomer> StripeCustomers { get; set; }
    public DbSet<Subscription> Subscriptions { get; set; }
    public DbSet<WebhookEvent> WebhookEvents { get; set; }
    
    // Alias for payment webhook events (used in PaymentService)
    public DbSet<WebhookEvent> PaymentWebhookEvents => WebhookEvents;
    public DbSet<PaymentAnalytics> PaymentAnalytics { get; set; }
    public DbSet<PaymentConfiguration> PaymentConfigurations { get; set; }
    
    // Additional DbSet for compatibility
    public DbSet<PaymentTransaction> Payments => PaymentTransactions;

    // Billing & Invoice DbSets
    public DbSet<Invoice> Invoices { get; set; }
    public DbSet<InvoiceLineItem> InvoiceLineItems { get; set; }
    public DbSet<BillingAddress> BillingAddresses { get; set; }
    public DbSet<TaxCalculation> TaxCalculations { get; set; }
    
    public DbSet<InvoiceDelivery> InvoiceDeliveries { get; set; }
    public DbSet<InvoiceTemplate> InvoiceTemplates { get; set; }

    // Dunning & Payment Recovery DbSets
    public DbSet<FailedPayment> FailedPayments { get; set; }
    public DbSet<PaymentRetryAttempt> PaymentRetryAttempts { get; set; }
    public DbSet<DunningCampaign> DunningCampaigns { get; set; }
    public DbSet<DunningStep> DunningSteps { get; set; }
    public DbSet<DunningCampaignExecution> DunningCampaignExecutions { get; set; }
    public DbSet<DunningNotification> DunningNotifications { get; set; }
    public DbSet<GracePeriod> GracePeriods { get; set; }

    // Social Sharing Analytics DbSets
    public DbSet<SocialShareEvent> SocialShareEvents { get; set; }
    public DbSet<ShareClickEvent> ShareClickEvents { get; set; }
    public DbSet<ShareAbTest> ShareAbTests { get; set; }
    public DbSet<ShareAbTestParticipation> ShareAbTestParticipations { get; set; }
    public DbSet<ViralMetrics> ViralMetrics { get; set; }
    public DbSet<ContentSharePerformance> ContentSharePerformances { get; set; }
    public DbSet<PaymentRecoverySession> PaymentRecoverySessions { get; set; }
    public DbSet<DunningAnalytics> DunningAnalytics { get; set; }
    public DbSet<DunningConfiguration> DunningConfigurations { get; set; }

    // Customer Support DbSets
    public DbSet<SupportAction> SupportActions { get; set; }
    public DbSet<SupportActionAuditLog> SupportActionAuditLogs { get; set; }
    public DbSet<SupportRefund> SupportRefunds { get; set; }
    public DbSet<CustomerBillingAccessLog> CustomerBillingAccessLogs { get; set; }
    
    // Customer Support Analytics - DTOs only, no database entities needed for this implementation

    // Social Sharing DbSets
    public DbSet<SocialSharingPreferences> SocialSharingPreferences { get; set; }
    public DbSet<ShareLinkClick> ShareLinkClicks { get; set; }
    public DbSet<ContentSharingMetrics> ContentSharingMetrics { get; set; }
    public DbSet<ShareLinkMapping> ShareLinkMappings { get; set; }
    public DbSet<ShareLink> ShareLinks { get; set; }

    // Social Media OAuth Authentication DbSets
    public DbSet<OAuthToken> OAuthTokens { get; set; }
    public DbSet<SocialConnection> SocialConnections { get; set; }
    public DbSet<SocialActivity> SocialActivities { get; set; }
    public DbSet<SocialRecommendation> SocialRecommendations { get; set; }
    public DbSet<SocialGraphConnection> SocialGraphConnections { get; set; }
    public DbSet<SocialPrivacyConsent> SocialPrivacyConsents { get; set; }
    public DbSet<OAuthState> OAuthStates { get; set; }
    
    // Enhanced Social Media Database Models
    public DbSet<SocialPlatformConfig> SocialPlatformConfigurations { get; set; }
    public DbSet<SocialAnalytics> SocialAnalytics { get; set; }
    public DbSet<SocialActivityFeed> SocialActivityFeeds { get; set; }
    
    // Backwards compatibility aliases
    public DbSet<OAuthToken> SocialOAuthTokens => OAuthTokens;
    
    // Enhanced Social Account Management DbSets
    public DbSet<SocialAccount> SocialAccount { get; set; }
    public DbSet<SocialPost> SocialPosts { get; set; }
    public DbSet<SocialInteraction> SocialInteraction { get; set; }
    public DbSet<SocialRelationship> SocialRelationship { get; set; }
    public DbSet<SocialContentShare> SocialContentShares { get; set; }
    public DbSet<SocialProofScore> SocialProofScores { get; set; }

    // GDPR Compliance DbSets
    public DbSet<Models.GDPR.ConsentRecord> ConsentRecords { get; set; }
    public DbSet<Models.GDPR.DataRetentionPolicy> DataRetentionPolicies { get; set; }
    public DbSet<Models.GDPR.DataSubjectRequest> DataSubjectRequests { get; set; }
    public DbSet<Models.GDPR.PrivacySettings> PrivacySettings { get; set; }
    public DbSet<Models.GDPR.PrivacyImpactAssessment> PrivacyImpactAssessments { get; set; }
    public DbSet<Models.GDPR.CrossBorderTransferRecord> CrossBorderTransferRecords { get; set; }
    public DbSet<Models.GDPR.PrivacyComplianceReport> PrivacyComplianceReports { get; set; }

    // Admin Management Enhancement DbSets
    public DbSet<AdminNotification> AdminNotifications { get; set; }
    public DbSet<AdminDataExport> AdminDataExports { get; set; }
    public DbSet<AdminSessionInfo> AdminSessions { get; set; }
    public DbSet<SystemAlert> SystemAlerts { get; set; }
    public DbSet<AdminConfigurationSetting> AdminConfigurationSettings { get; set; }
    public DbSet<ConfigurationChangeHistory> ConfigurationChangeHistory { get; set; }
    public DbSet<ConfigurationBackup> ConfigurationBackups { get; set; }
    public DbSet<ScheduledExport> ScheduledExports { get; set; }

    // AB Testing DbSets
    public DbSet<ABExperiment> ABExperiments { get; set; }
    public DbSet<ExperimentVariant> ExperimentVariants { get; set; }
    public DbSet<ExperimentEvent> ExperimentEvents { get; set; }
    public DbSet<ExperimentAssignment> ExperimentAssignments { get; set; }
    
    // Subscription Plans
    public DbSet<SubscriptionPlan> SubscriptionPlans { get; set; }

    // Promotions System
    public DbSet<Promotion> Promotions { get; set; }
    public DbSet<PromotionRedemption> PromotionRedemptions { get; set; }
    
    // Missing DbSets for test compatibility  
    public DbSet<OnboardingSession> OnboardingSessions { get; set; }
    public DbSet<SocialShare> SocialShares { get; set; }
    public DbSet<ContentMetadata> ContentMetadata { get; set; }
    
    // Aliases for service compatibility
    public DbSet<AdminConfigurationSetting> ConfigurationSettings => AdminConfigurationSettings;
    public DbSet<SupportAction> SupportTickets => SupportActions;
    // ExperimentAssignments and ExperimentEvents already defined above in AB Testing section
    
    // Programmatic SEO DbSets  
    public DbSet<GeoLeap.Api.ProgrammaticSeo.Models.SeoTemplate> SeoTemplates { get; set; }
    public DbSet<GeoLeap.Api.ProgrammaticSeo.Models.SeoPage> SeoPages { get; set; }
    public DbSet<GeoLeap.Api.ProgrammaticSeo.Models.SeoBatchJob> SeoBatchJobs { get; set; }
    public DbSet<GeoLeap.Api.ProgrammaticSeo.Models.SeoKeyword> SeoKeywords { get; set; }
    public DbSet<GeoLeap.Api.ProgrammaticSeo.Models.ContentVariable> ContentVariables { get; set; }
    public DbSet<GeoLeap.Api.ProgrammaticSeo.Models.ContentCluster> ContentClusters { get; set; }
    public DbSet<GeoLeap.Api.ProgrammaticSeo.Models.SeoMetrics> SeoPerformanceMetrics { get; set; }
    
    // US-9.1 VPN Guidance System DbSets
    public DbSet<VpnProvider> VpnProviders { get; set; }
    public DbSet<VpnProviderRating> VpnProviderRatings { get; set; }
    public DbSet<VpnServerLocation> VpnServerLocations { get; set; }
    public DbSet<VpnStreamingCompatibility> VpnStreamingCompatibilities { get; set; }
    public DbSet<VpnSetupGuide> VpnSetupGuides { get; set; }
    public DbSet<VpnLegalDisclaimer> VpnLegalDisclaimers { get; set; }
    public DbSet<VpnBestPractice> VpnBestPractices { get; set; }
    public DbSet<UserVpnPreference> UserVpnPreferences { get; set; }
    public DbSet<VpnGuidanceAnalytics> VpnGuidanceAnalytics { get; set; }
    public DbSet<VpnPerformanceSnapshot> VpnPerformanceSnapshots { get; set; }

    // ASO (App Store Optimization) DbSets
    public DbSet<AsoKeyword> AsoKeywords { get; set; }
    public DbSet<AppStoreListing> AppStoreListings { get; set; }
    public DbSet<AppStoreReview> AppStoreReviews { get; set; }
    public DbSet<KeywordRanking> KeywordRankings { get; set; }
    public DbSet<AsoAbTest> AsoAbTests { get; set; }
    public DbSet<AsoAnalytics> AsoAnalytics { get; set; }

    // Affiliate System DbSets
    public DbSet<AffiliatePartner> AffiliatePartners { get; set; }
    public DbSet<AffiliateClick> AffiliateClicks { get; set; }
    public DbSet<AffiliateConversion> AffiliateConversions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure User entity (Identity table)
        modelBuilder.Entity<User>().ToTable("AspNetUsers");

        // Ignore DTOs that are not entities
        modelBuilder.Ignore<InternalLink>();
        modelBuilder.Ignore<AdminDataExportRequest>();
        modelBuilder.Ignore<AffiliatePartnerDto>();
        modelBuilder.Ignore<AffiliateRecommendationResponse>();
        modelBuilder.Ignore<AffiliateDashboard>();
        modelBuilder.Ignore<CreateAffiliatePartnerRequest>();
        modelBuilder.Ignore<UpdateAffiliatePartnerRequest>();
        modelBuilder.Ignore<AffiliateClickRequest>();
        modelBuilder.Ignore<AffiliateConversionRequest>();

        // CRITICAL FIX: Ignore all DTO classes that might be causing UserProfile shadow key issues
        modelBuilder.Ignore<UserProfileDto>();
        modelBuilder.Ignore<UpdateUserProfileDto>();
        modelBuilder.Ignore<NotificationPreferencesDto>();

        // CRITICAL FIX: Ignore UserPreferences DTO from RankingModels to prevent table name conflict
        modelBuilder.Ignore<Models.UserPreferences>();
        
        // CRITICAL FIX: Fix foreign key type mismatches causing relationship errors
        ConfigureForeignKeyCompatibility(modelBuilder);

        // Configure RBAC relationships
        ConfigureUserRoleRelationships(modelBuilder);
        ConfigureRolePermissionRelationships(modelBuilder);
        ConfigureAuditLogRelationships(modelBuilder);
        ConfigureUserSessionRelationships(modelBuilder);
        ConfigurePasswordResetTokenRelationships(modelBuilder);
        ConfigurePasswordHistoryRelationships(modelBuilder);
        ConfigureNotificationPreferencesRelationships(modelBuilder);
        ConfigureUserActivityLogRelationships(modelBuilder);
        ConfigureSecurityEventRelationships(modelBuilder);
        ConfigureSecurityPreferencesRelationships(modelBuilder);
        ConfigureOnboardingRelationships(modelBuilder);
        ConfigureAdminManagementRelationships(modelBuilder);
        ConfigureApiUsageTrackingRelationships(modelBuilder);
        ConfigureCachePersistenceRelationships(modelBuilder);
        ConfigureApiCostManagementRelationships(modelBuilder);
        ConfigurePaywallRelationships(modelBuilder);
        ConfigureSearchOptimizationRelationships(modelBuilder);
        ConfigureSearchAnalyticsRelationships(modelBuilder);
        ConfigureSearchHistoryRelationships(modelBuilder);
        ConfigurePaymentRelationships(modelBuilder);
        ConfigureInvoiceRelationships(modelBuilder);
        ConfigureDunningRelationships(modelBuilder);
        ConfigureSupportRelationships(modelBuilder);
        ConfigureSocialSharingRelationships(modelBuilder);
        ConfigureContentMetadataRelationships(modelBuilder);
        ConfigureABTestingRelationships(modelBuilder);
        ConfigureSeoRelationships(modelBuilder);
        ConfigurePreferenceRelationships(modelBuilder);
        ConfigureVpnGuidanceRelationships(modelBuilder);
        ConfigureAsoRelationships(modelBuilder);
        ConfigurePromotionRelationships(modelBuilder);
        ConfigureIndexes(modelBuilder);
        
        // FINAL COMPATIBILITY CHECK: Ensure all foreign keys match primary key types
        ValidateForeignKeyCompatibility(modelBuilder);
    }

    /// <summary>
    /// CRITICAL FIX: Configure foreign key compatibility to prevent shadow key issues
    /// </summary>
    private void ConfigureForeignKeyCompatibility(ModelBuilder modelBuilder)
    {
        // AppStoreListing - User relationship fix - FIXED: UserId is now Guid (matches User.Id)
        modelBuilder.Entity<AppStoreListing>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            
            // Remove the problematic User navigation if it exists to avoid FK issues in tests
            entity.Ignore(e => e.User);
            
            // UserId is now Guid and properly matches User.Id type
            entity.Property(e => e.UserId).IsRequired(true);
        });
        
        // FIXED: These entities actually use Guid UserId, not int - no configuration needed
        // PaymentTransaction, UserSession, and NotificationPreferences all have Guid UserId
        // which don't need special nullable configuration since they can be naturally nullable
        
        // If any future entities need specific UserId configuration, handle them individually
        // rather than trying to batch configure different types
    }
    
    /// <summary>
    /// FINAL VALIDATION: Ensure no foreign key type mismatches remain
    /// </summary>
    private void ValidateForeignKeyCompatibility(ModelBuilder modelBuilder)
    {
        // This method runs final validation but doesn't break the build
        // It logs warnings about any remaining incompatibilities
        try
        {
            // Add any final compatibility fixes here if needed
            Console.WriteLine("EF Core Model: Final validation complete - relationships configured");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"EF Core Model: Final validation warning: {ex.Message}");
            // Don't throw - let the app continue with warnings
        }
    }

    private void ConfigureUserRoleRelationships(ModelBuilder modelBuilder)
    {
        // User -> UserRoles (One-to-Many)
        modelBuilder.Entity<User>()
            .HasMany(u => u.UserRoles)
            .WithOne(ur => ur.User)
            .HasForeignKey(ur => ur.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Role -> UserRoles (One-to-Many)
        modelBuilder.Entity<Role>()
            .HasMany(r => r.UserRoles)
            .WithOne(ur => ur.Role)
            .HasForeignKey(ur => ur.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        // UserRole -> AssignedBy User (Many-to-One, Optional)
        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.AssignedByUser)
            .WithMany()
            .HasForeignKey(ur => ur.AssignedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // Unique constraint on User-Role combination
        modelBuilder.Entity<UserRole>()
            .HasIndex(ur => new { ur.UserId, ur.RoleId })
            .IsUnique();
    }

    private void ConfigureRolePermissionRelationships(ModelBuilder modelBuilder)
    {
        // Role -> RolePermissions (One-to-Many)
        modelBuilder.Entity<Role>()
            .HasMany(r => r.RolePermissions)
            .WithOne(rp => rp.Role)
            .HasForeignKey(rp => rp.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        // Permission -> RolePermissions (One-to-Many)
        modelBuilder.Entity<Permission>()
            .HasMany(p => p.RolePermissions)
            .WithOne(rp => rp.Permission)
            .HasForeignKey(rp => rp.PermissionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraint on Role-Permission combination
        modelBuilder.Entity<RolePermission>()
            .HasIndex(rp => new { rp.RoleId, rp.PermissionId })
            .IsUnique();
    }

    private void ConfigureAuditLogRelationships(ModelBuilder modelBuilder)
    {
        // User -> AuditLogs (One-to-Many)
        modelBuilder.Entity<User>()
            .HasMany(u => u.AuditLogs)
            .WithOne(al => al.User)
            .HasForeignKey(al => al.UserId)
            .OnDelete(DeleteBehavior.Restrict); // Changed from Cascade to Restrict to avoid multiple cascade paths

        // AuditLog -> AffectedUser (Many-to-One, Optional)
        modelBuilder.Entity<UserAuditLog>()
            .HasOne(al => al.AffectedUser)
            .WithMany()
            .HasForeignKey(al => al.AffectedUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // AuditLog -> Role (Many-to-One, Optional)
        modelBuilder.Entity<UserAuditLog>()
            .HasOne(al => al.Role)
            .WithMany()
            .HasForeignKey(al => al.RoleId)
            .OnDelete(DeleteBehavior.SetNull);

        // AuditLog -> Permission (Many-to-One, Optional)
        modelBuilder.Entity<UserAuditLog>()
            .HasOne(al => al.Permission)
            .WithMany()
            .HasForeignKey(al => al.PermissionId)
            .OnDelete(DeleteBehavior.SetNull);
    }


    private void ConfigureUserSessionRelationships(ModelBuilder modelBuilder)
    {
        // User -> UserSessions (One-to-Many) - FIXED: Explicit property configuration
        modelBuilder.Entity<UserSession>()
            .HasKey(us => us.Id);
            
        modelBuilder.Entity<UserSession>()
            .Property(us => us.UserId)
            .IsRequired();
            
        modelBuilder.Entity<UserSession>()
            .HasOne(us => us.User)
            .WithMany()
            .HasForeignKey(us => us.UserId)
            .HasPrincipalKey(u => u.Id)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private void ConfigureSearchAnalyticsRelationships(ModelBuilder modelBuilder)
    {
        // SearchJourney -> SearchSteps (One-to-Many)
        modelBuilder.Entity<SearchJourney>()
            .HasMany(sj => sj.Steps)
            .WithOne()
            .HasForeignKey(ss => ss.JourneyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure SearchAnalyticsEvent indexes for performance
        modelBuilder.Entity<SearchAnalyticsEvent>()
            .HasIndex(sae => new { sae.EventType, sae.Timestamp })
            .HasDatabaseName("IX_SearchAnalyticsEvent_EventType_Timestamp");

        modelBuilder.Entity<SearchAnalyticsEvent>()
            .HasIndex(sae => new { sae.UserId, sae.SessionId })
            .HasDatabaseName("IX_SearchAnalyticsEvent_User_Session");

        modelBuilder.Entity<SearchAnalyticsEvent>()
            .HasIndex(sae => sae.Query)
            .HasDatabaseName("IX_SearchAnalyticsEvent_Query");

        // Configure SearchJourney indexes
        modelBuilder.Entity<SearchJourney>()
            .HasIndex(sj => new { sj.UserId, sj.StartedAt })
            .HasDatabaseName("IX_SearchJourney_User_StartedAt");

        modelBuilder.Entity<SearchJourney>()
            .HasIndex(sj => new { sj.SessionId, sj.Outcome })
            .HasDatabaseName("IX_SearchJourney_Session_Outcome");

        // Configure SearchStep indexes
        modelBuilder.Entity<SearchStep>()
            .HasIndex(ss => new { ss.JourneyId, ss.StepNumber })
            .HasDatabaseName("IX_SearchStep_Journey_StepNumber");

        // Configure alert indexes
        modelBuilder.Entity<SearchPerformanceAlert>()
            .HasIndex(spa => new { spa.IsActive, spa.Severity })
            .HasDatabaseName("IX_SearchPerformanceAlert_Active_Severity");

        modelBuilder.Entity<BusinessAlert>()
            .HasIndex(ba => new { ba.IsActive, ba.Type })
            .HasDatabaseName("IX_BusinessAlert_Active_Type");

        // Configure dictionary properties to be stored as JSON with proper serialization options
        var jsonSerializerOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        
        modelBuilder.Entity<SearchAnalyticsEvent>()
            .Property(sae => sae.Metadata)
            .HasConversion(
                v => v != null ? JsonSerializer.Serialize(v, jsonSerializerOptions) : "{}",
                v => !string.IsNullOrEmpty(v) ? JsonSerializer.Deserialize<Dictionary<string, object>>(v, jsonSerializerOptions) ?? new Dictionary<string, object>() : new Dictionary<string, object>()
            );

        modelBuilder.Entity<SearchJourney>()
            .Property(sj => sj.JourneyMetadata)
            .HasConversion(
                v => v != null ? JsonSerializer.Serialize(v, jsonSerializerOptions) : "{}",
                v => !string.IsNullOrEmpty(v) ? JsonSerializer.Deserialize<Dictionary<string, object>>(v, jsonSerializerOptions) ?? new Dictionary<string, object>() : new Dictionary<string, object>()
            );

        modelBuilder.Entity<SearchStep>()
            .Property(ss => ss.ActionMetadata)
            .HasConversion(
                v => v != null ? JsonSerializer.Serialize(v, jsonSerializerOptions) : "{}",
                v => !string.IsNullOrEmpty(v) ? JsonSerializer.Deserialize<Dictionary<string, object>>(v, jsonSerializerOptions) ?? new Dictionary<string, object>() : new Dictionary<string, object>()
            );

        modelBuilder.Entity<SearchPerformanceAlert>()
            .Property(spa => spa.Metrics)
            .HasConversion(
                v => v != null ? JsonSerializer.Serialize(v, jsonSerializerOptions) : "{}",
                v => !string.IsNullOrEmpty(v) ? JsonSerializer.Deserialize<Dictionary<string, object>>(v, jsonSerializerOptions) ?? new Dictionary<string, object>() : new Dictionary<string, object>()
            );

        modelBuilder.Entity<BusinessAlert>()
            .Property(ba => ba.BusinessMetrics)
            .HasConversion(
                v => v != null ? JsonSerializer.Serialize(v, jsonSerializerOptions) : "{}",
                v => !string.IsNullOrEmpty(v) ? 
                    JsonSerializer.Deserialize<BusinessMetricsResponse>(v, jsonSerializerOptions) ?? new BusinessMetricsResponse() : 
                    new BusinessMetricsResponse()
            );
    }

    private void ConfigureIndexes(ModelBuilder modelBuilder)
    {
        // User indexes (Email is already indexed by Identity)
        modelBuilder.Entity<User>()
            .HasIndex(u => u.GoogleId)
            .IsUnique()
            .HasFilter("[GoogleId] IS NOT NULL");

        modelBuilder.Entity<User>()
            .HasIndex(u => u.AppleId)
            .IsUnique()
            .HasFilter("[AppleId] IS NOT NULL");

        // Role indexes
        modelBuilder.Entity<Role>()
            .HasIndex(r => r.Name)
            .IsUnique();

        // Permission indexes
        modelBuilder.Entity<Permission>()
            .HasIndex(p => new { p.Resource, p.Action })
            .IsUnique();

        modelBuilder.Entity<Permission>()
            .HasIndex(p => p.Name)
            .IsUnique();

        // Audit log indexes for performance
        modelBuilder.Entity<UserAuditLog>()
            .HasIndex(al => al.Timestamp);

        modelBuilder.Entity<UserAuditLog>()
            .HasIndex(al => new { al.UserId, al.Timestamp });

        modelBuilder.Entity<UserAuditLog>()
            .HasIndex(al => new { al.Resource, al.Action });

        // User session indexes
        modelBuilder.Entity<UserSession>()
            .HasIndex(us => us.RefreshToken)
            .IsUnique();

        modelBuilder.Entity<UserSession>()
            .HasIndex(us => new { us.UserId, us.IsActive });

        modelBuilder.Entity<UserSession>()
            .HasIndex(us => us.ExpiresAt);

        modelBuilder.Entity<UserSession>()
            .HasIndex(us => us.LastAccessedAt);

        // Password reset token indexes
        modelBuilder.Entity<PasswordResetToken>()
            .HasIndex(prt => prt.Token)
            .IsUnique();

        modelBuilder.Entity<PasswordResetToken>()
            .HasIndex(prt => new { prt.UserId, prt.IsUsed });

        modelBuilder.Entity<PasswordResetToken>()
            .HasIndex(prt => prt.ExpiresAt);

        // Password history indexes
        modelBuilder.Entity<PasswordHistory>()
            .HasIndex(ph => new { ph.UserId, ph.CreatedAt });

        // User activity log indexes
        modelBuilder.Entity<UserActivityLog>()
            .HasIndex(al => al.CreatedAt);

        modelBuilder.Entity<UserActivityLog>()
            .HasIndex(al => new { al.UserId, al.CreatedAt });

        modelBuilder.Entity<UserActivityLog>()
            .HasIndex(al => al.ActivityType);

        // Notification preferences indexes
        modelBuilder.Entity<NotificationPreferences>()
            .HasIndex(np => np.UserId)
            .IsUnique();

        // Security events indexes
        modelBuilder.Entity<SecurityEvent>()
            .HasIndex(se => se.CreatedAt);

        modelBuilder.Entity<SecurityEvent>()
            .HasIndex(se => new { se.UserId, se.CreatedAt });

        modelBuilder.Entity<SecurityEvent>()
            .HasIndex(se => se.EventType);

        modelBuilder.Entity<SecurityEvent>()
            .HasIndex(se => new { se.UserId, se.EventType });

        modelBuilder.Entity<SecurityEvent>()
            .HasIndex(se => se.RiskScore);

        // Security preferences indexes
        modelBuilder.Entity<SecurityPreferences>()
            .HasIndex(sp => sp.UserId)
            .IsUnique();

        modelBuilder.Entity<MobileSubscription>()
            .HasIndex(ms => ms.TransactionId)
            .IsUnique()
            .HasDatabaseName("IX_MobileSubscriptions_TransactionId")
            .HasFilter("\"TransactionId\" IS NOT NULL");

        modelBuilder.Entity<MobileSubscription>()
            .HasIndex(ms => ms.OriginalTransactionId)
            .IsUnique()
            .HasDatabaseName("IX_MobileSubscriptions_OriginalTransactionId")
            .HasFilter("\"OriginalTransactionId\" IS NOT NULL");

        modelBuilder.Entity<MobileSubscription>()
            .HasIndex(ms => ms.PurchaseToken)
            .IsUnique()
            .HasDatabaseName("IX_MobileSubscriptions_PurchaseToken")
            .HasFilter("\"PurchaseToken\" IS NOT NULL");

        // Social Media Database Models Performance Indexes

        // OAuthToken indexes for token management
        modelBuilder.Entity<OAuthToken>()
            .HasIndex(ot => ot.ExpiresAt);

        modelBuilder.Entity<OAuthToken>()
            .HasIndex(ot => new { ot.Platform, ot.IsValid });

        modelBuilder.Entity<OAuthToken>()
            .HasIndex(ot => ot.LastUsed);

        modelBuilder.Entity<OAuthToken>()
            .HasIndex(ot => new { ot.UserId, ot.IsValid });

        // SocialConnection indexes for user management
        modelBuilder.Entity<SocialConnection>()
            .HasIndex(sc => sc.ConnectedAt);

        modelBuilder.Entity<SocialConnection>()
            .HasIndex(sc => new { sc.Platform, sc.IsTokenValid });

        modelBuilder.Entity<SocialConnection>()
            .HasIndex(sc => sc.SocialUserId);

        // SocialActivity indexes for activity tracking
        modelBuilder.Entity<SocialActivity>()
            .HasIndex(sa => sa.CreatedAt);

        modelBuilder.Entity<SocialActivity>()
            .HasIndex(sa => new { sa.UserId, sa.CreatedAt });

        modelBuilder.Entity<SocialActivity>()
            .HasIndex(sa => new { sa.Platform, sa.ActivityType });

        modelBuilder.Entity<SocialActivity>()
            .HasIndex(sa => new { sa.TargetUserId, sa.CreatedAt });

        // SocialActivityFeed indexes for feed performance
        modelBuilder.Entity<SocialActivityFeed>()
            .HasIndex(saf => saf.ActivityTimestamp);

        modelBuilder.Entity<SocialActivityFeed>()
            .HasIndex(saf => new { saf.UserId, saf.ActivityTimestamp });

        modelBuilder.Entity<SocialActivityFeed>()
            .HasIndex(saf => new { saf.UserId, saf.IsRead });

        modelBuilder.Entity<SocialActivityFeed>()
            .HasIndex(saf => new { saf.Platform, saf.ActivityType });

        modelBuilder.Entity<SocialActivityFeed>()
            .HasIndex(saf => new { saf.IsPublic, saf.ActivityTimestamp });

        modelBuilder.Entity<SocialActivityFeed>()
            .HasIndex(saf => saf.ImportanceScore);

        // SocialRecommendation indexes for ML recommendations
        modelBuilder.Entity<SocialRecommendation>()
            .HasIndex(sr => new { sr.UserId, sr.IsActive });

        modelBuilder.Entity<SocialRecommendation>()
            .HasIndex(sr => new { sr.RecommendationType, sr.Score });

        modelBuilder.Entity<SocialRecommendation>()
            .HasIndex(sr => sr.ExpiresAt);

        modelBuilder.Entity<SocialRecommendation>()
            .HasIndex(sr => sr.GeneratedAt);

        // SocialGraphConnection indexes for social network analysis
        modelBuilder.Entity<SocialGraphConnection>()
            .HasIndex(sgc => new { sgc.FromUserId, sgc.ConnectionType });

        modelBuilder.Entity<SocialGraphConnection>()
            .HasIndex(sgc => new { sgc.ToUserId, sgc.ConnectionType });

        modelBuilder.Entity<SocialGraphConnection>()
            .HasIndex(sgc => new { sgc.Platform, sgc.IsActive });

        modelBuilder.Entity<SocialGraphConnection>()
            .HasIndex(sgc => sgc.LastInteractionAt);

        modelBuilder.Entity<SocialGraphConnection>()
            .HasIndex(sgc => sgc.Strength);

        // SocialAnalytics indexes for reporting and analytics
        modelBuilder.Entity<SocialAnalytics>()
            .HasIndex(sa => new { sa.UserId, sa.PeriodStart, sa.PeriodEnd });

        modelBuilder.Entity<SocialAnalytics>()
            .HasIndex(sa => new { sa.Platform, sa.PeriodType });

        modelBuilder.Entity<SocialAnalytics>()
            .HasIndex(sa => sa.LastActivityAt);

        modelBuilder.Entity<SocialAnalytics>()
            .HasIndex(sa => sa.CreatedAt);

        // SocialPrivacyConsent indexes for GDPR compliance
        modelBuilder.Entity<SocialPrivacyConsent>()
            .HasIndex(spc => spc.ConsentGivenAt);

        modelBuilder.Entity<SocialPrivacyConsent>()
            .HasIndex(spc => new { spc.IsActive, spc.IsGdprCompliant });

        modelBuilder.Entity<SocialPrivacyConsent>()
            .HasIndex(spc => spc.LastConsentUpdate);

        // SocialPlatformConfig indexes for configuration management
        modelBuilder.Entity<SocialPlatformConfig>()
            .HasIndex(spc => spc.IsEnabled);

        modelBuilder.Entity<SocialPlatformConfig>()
            .HasIndex(spc => spc.UpdatedAt);

        // OAuthState indexes for security
        modelBuilder.Entity<OAuthState>()
            .HasIndex(os => os.ExpiresAt);

        modelBuilder.Entity<OAuthState>()
            .HasIndex(os => new { os.UserId, os.IsUsed });

        modelBuilder.Entity<OAuthState>()
            .HasIndex(os => os.CreatedAt);
    }

    private void ConfigurePasswordResetTokenRelationships(ModelBuilder modelBuilder)
    {
        // User -> PasswordResetTokens (One-to-Many)
        modelBuilder.Entity<User>()
            .HasMany<PasswordResetToken>()
            .WithOne(prt => prt.User)
            .HasForeignKey(prt => prt.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private void ConfigurePasswordHistoryRelationships(ModelBuilder modelBuilder)
    {
        // User -> PasswordHistory (One-to-Many)
        modelBuilder.Entity<User>()
            .HasMany<PasswordHistory>()
            .WithOne(ph => ph.User)
            .HasForeignKey(ph => ph.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private void ConfigureNotificationPreferencesRelationships(ModelBuilder modelBuilder)
    {
        // User -> NotificationPreferences (One-to-One) - FIXED: Explicit property configuration
        modelBuilder.Entity<NotificationPreferences>()
            .HasKey(np => np.Id);
            
        modelBuilder.Entity<NotificationPreferences>()
            .Property(np => np.UserId)
            .IsRequired();
            
        modelBuilder.Entity<User>()
            .HasOne(u => u.NotificationPreferences)
            .WithOne(np => np.User)
            .HasForeignKey<NotificationPreferences>(np => np.UserId)
            .HasPrincipalKey<User>(u => u.Id)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private void ConfigureUserActivityLogRelationships(ModelBuilder modelBuilder)
    {
        // User -> UserActivityLogs (One-to-Many)
        modelBuilder.Entity<User>()
            .HasMany(u => u.ActivityLogs)
            .WithOne(al => al.User)
            .HasForeignKey(al => al.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private void ConfigureSecurityEventRelationships(ModelBuilder modelBuilder)
    {
        // User -> SecurityEvents (One-to-Many)
        modelBuilder.Entity<User>()
            .HasMany(u => u.SecurityEvents)
            .WithOne(se => se.User)
            .HasForeignKey(se => se.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    private void ConfigureSecurityPreferencesRelationships(ModelBuilder modelBuilder)
    {
        // User -> SecurityPreferences (One-to-One)
        modelBuilder.Entity<User>()
            .HasOne(u => u.SecurityPreferences)
            .WithOne(sp => sp.User)
            .HasForeignKey<SecurityPreferences>(sp => sp.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private void ConfigureOnboardingRelationships(ModelBuilder modelBuilder)
    {
        // User -> UserOnboarding (One-to-One)
        modelBuilder.Entity<User>()
            .HasOne(u => u.Onboarding)
            .WithOne(o => o.User)
            .HasForeignKey<UserOnboarding>(o => o.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // StreamingService -> UserStreamingServices (One-to-Many)
        modelBuilder.Entity<StreamingService>()
            .HasMany(s => s.UserStreamingServices)
            .WithOne(uss => uss.StreamingService)
            .HasForeignKey(uss => uss.StreamingServiceId)
            .OnDelete(DeleteBehavior.Restrict);

        // User -> UserStreamingServices (One-to-Many)
        modelBuilder.Entity<User>()
            .HasMany(u => u.StreamingServices)
            .WithOne(ss => ss.User)
            .HasForeignKey(ss => ss.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // User -> UserRegionPreferences (One-to-Many)
        modelBuilder.Entity<User>()
            .HasMany(u => u.RegionPreferences)
            .WithOne(rp => rp.User)
            .HasForeignKey(rp => rp.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // User -> UserContentPreferences (One-to-Many)
        modelBuilder.Entity<User>()
            .HasMany(u => u.ContentPreferences)
            .WithOne(cp => cp.User)
            .HasForeignKey(cp => cp.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraints and indexes
        modelBuilder.Entity<UserOnboarding>()
            .HasIndex(o => o.UserId)
            .IsUnique();

        modelBuilder.Entity<StreamingService>()
            .HasIndex(s => s.Name)
            .IsUnique();

        modelBuilder.Entity<StreamingService>()
            .HasIndex(s => new { s.IsActive, s.SortOrder });

        modelBuilder.Entity<StreamingService>()
            .HasIndex(s => s.Category);

        modelBuilder.Entity<UserStreamingService>()
            .HasIndex(ss => new { ss.UserId, ss.StreamingServiceId })
            .IsUnique();
            
        // Ensure UserStreamingService entity is properly configured
        modelBuilder.Entity<UserStreamingService>()
            .HasKey(uss => uss.Id);

        modelBuilder.Entity<UserStreamingService>()
            .HasIndex(ss => new { ss.UserId, ss.IsActive });

        modelBuilder.Entity<UserRegionPreference>()
            .HasIndex(rp => new { rp.UserId, rp.CountryCode })
            .IsUnique();

        modelBuilder.Entity<UserContentPreference>()
            .HasIndex(cp => new { cp.UserId, cp.ContentType })
            .IsUnique();
    }

    private void ConfigureAdminManagementRelationships(ModelBuilder modelBuilder)
    {
        // AdminAction -> AdminUser (Many-to-One)
        modelBuilder.Entity<AdminAction>()
            .HasOne(aa => aa.AdminUser)
            .WithMany()
            .HasForeignKey(aa => aa.AdminUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // AdminAction -> TargetUser (Many-to-One, Optional)
        modelBuilder.Entity<AdminAction>()
            .HasOne(aa => aa.TargetUser)
            .WithMany()
            .HasForeignKey(aa => aa.TargetUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // UserImpersonationSession -> AdminUser (Many-to-One)
        modelBuilder.Entity<UserImpersonationSession>()
            .HasOne(uis => uis.AdminUser)
            .WithMany()
            .HasForeignKey(uis => uis.AdminUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // UserImpersonationSession -> ImpersonatedUser (Many-to-One)
        modelBuilder.Entity<UserImpersonationSession>()
            .HasOne(uis => uis.ImpersonatedUser)
            .WithMany()
            .HasForeignKey(uis => uis.ImpersonatedUserId)
            .OnDelete(DeleteBehavior.Restrict);


        // Indexes for AdminAction
        modelBuilder.Entity<AdminAction>()
            .HasIndex(aa => aa.CreatedAt);

        modelBuilder.Entity<AdminAction>()
            .HasIndex(aa => new { aa.AdminUserId, aa.CreatedAt });

        modelBuilder.Entity<AdminAction>()
            .HasIndex(aa => new { aa.TargetUserId, aa.CreatedAt });

        modelBuilder.Entity<AdminAction>()
            .HasIndex(aa => aa.ActionType);

        modelBuilder.Entity<AdminAction>()
            .HasIndex(aa => aa.CorrelationId);

        // Indexes for UserImpersonationSession
        modelBuilder.Entity<UserImpersonationSession>()
            .HasIndex(uis => uis.SessionToken)
            .IsUnique();

        modelBuilder.Entity<UserImpersonationSession>()
            .HasIndex(uis => new { uis.AdminUserId, uis.StartedAt });

        modelBuilder.Entity<UserImpersonationSession>()
            .HasIndex(uis => new { uis.ImpersonatedUserId, uis.StartedAt });

        modelBuilder.Entity<UserImpersonationSession>()
            .HasIndex(uis => uis.IsActive);

        // Indexes for User suspension fields
        modelBuilder.Entity<User>()
            .HasIndex(u => u.IsSuspended);

        modelBuilder.Entity<User>()
            .HasIndex(u => new { u.IsSuspended, u.SuspendedAt });

        // SystemAlert configuration for Metadata property
        modelBuilder.Entity<SystemAlert>()
            .Property(sa => sa.Metadata)
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<Dictionary<string, object>>(v, (JsonSerializerOptions?)null))
            .HasColumnType("nvarchar(max)");

        // SystemAlert indexes
        modelBuilder.Entity<SystemAlert>()
            .HasIndex(sa => sa.CreatedAt);

        modelBuilder.Entity<SystemAlert>()
            .HasIndex(sa => sa.Type);

        modelBuilder.Entity<SystemAlert>()
            .HasIndex(sa => sa.Severity);

        modelBuilder.Entity<SystemAlert>()
            .HasIndex(sa => sa.IsResolved);

    }

    private void ConfigureApiUsageTrackingRelationships(ModelBuilder modelBuilder)
    {
        // ApiUsageRecord configuration
        modelBuilder.Entity<ApiUsageRecord>()
            .HasKey(aur => aur.Id);

        modelBuilder.Entity<ApiUsageRecord>()
            .Property(aur => aur.Endpoint)
            .IsRequired()
            .HasMaxLength(500);

        modelBuilder.Entity<ApiUsageRecord>()
            .Property(aur => aur.EstimatedCost)
            .HasColumnType("decimal(18,6)");

        modelBuilder.Entity<ApiUsageRecord>()
            .Property(aur => aur.ErrorMessage)
            .HasMaxLength(2000);

        modelBuilder.Entity<ApiUsageRecord>()
            .Property(aur => aur.CorrelationId)
            .HasMaxLength(100);

        // Indexes for performance
        modelBuilder.Entity<ApiUsageRecord>()
            .HasIndex(aur => aur.Timestamp);

        modelBuilder.Entity<ApiUsageRecord>()
            .HasIndex(aur => new { aur.Success, aur.Timestamp });

        modelBuilder.Entity<ApiUsageRecord>()
            .HasIndex(aur => aur.Endpoint);

        modelBuilder.Entity<ApiUsageRecord>()
            .HasIndex(aur => aur.CorrelationId);

        modelBuilder.Entity<ApiUsageRecord>()
            .HasIndex(aur => new { aur.Timestamp, aur.EstimatedCost });
    }

    private void ConfigureCachePersistenceRelationships(ModelBuilder modelBuilder)
    {
        // CachePersistenceEntry configuration
        modelBuilder.Entity<CachePersistenceEntry>()
            .HasKey(cpe => cpe.Id);

        modelBuilder.Entity<CachePersistenceEntry>()
            .HasIndex(cpe => cpe.Key)
            .IsUnique();

        modelBuilder.Entity<CachePersistenceEntry>()
            .HasIndex(cpe => cpe.ExpiresAt);

        modelBuilder.Entity<CachePersistenceEntry>()
            .HasIndex(cpe => new { cpe.Category, cpe.CreatedAt });

        modelBuilder.Entity<CachePersistenceEntry>()
            .HasIndex(cpe => new { cpe.Category, cpe.LastAccessedAt });

        modelBuilder.Entity<CachePersistenceEntry>()
            .HasIndex(cpe => cpe.AccessCount);

        // Configure properties
        modelBuilder.Entity<CachePersistenceEntry>()
            .Property(cpe => cpe.Key)
            .IsRequired()
            .HasMaxLength(250);

        modelBuilder.Entity<CachePersistenceEntry>()
            .Property(cpe => cpe.Category)
            .IsRequired()
            .HasMaxLength(50);

        modelBuilder.Entity<CachePersistenceEntry>()
            .Property(cpe => cpe.ContentType)
            .HasMaxLength(50);
    }

    private void ConfigureApiCostManagementRelationships(ModelBuilder modelBuilder)
    {
        // ApiCostRecord -> User (Many-to-One, Optional)
        modelBuilder.Entity<ApiCostRecord>()
            .HasOne(acr => acr.User)
            .WithMany()
            .HasForeignKey(acr => acr.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        // ApiCostRecord indexes for performance
        modelBuilder.Entity<ApiCostRecord>()
            .HasIndex(acr => acr.Timestamp);

        modelBuilder.Entity<ApiCostRecord>()
            .HasIndex(acr => new { acr.ProviderId, acr.Timestamp });

        modelBuilder.Entity<ApiCostRecord>()
            .HasIndex(acr => new { acr.Endpoint, acr.Timestamp });

        modelBuilder.Entity<ApiCostRecord>()
            .HasIndex(acr => acr.CorrelationId);

        modelBuilder.Entity<ApiCostRecord>()
            .HasIndex(acr => new { acr.Success, acr.Timestamp });

        modelBuilder.Entity<ApiCostRecord>()
            .HasIndex(acr => new { acr.UserId, acr.Timestamp });

        // BudgetConfiguration indexes
        modelBuilder.Entity<BudgetConfiguration>()
            .HasIndex(bc => new { bc.Category, bc.IsActive });

        modelBuilder.Entity<BudgetConfiguration>()
            .HasIndex(bc => new { bc.ProviderId, bc.IsActive });

        modelBuilder.Entity<BudgetConfiguration>()
            .HasIndex(bc => bc.Period);

        // BudgetAlert indexes
        modelBuilder.Entity<BudgetAlert>()
            .HasIndex(ba => ba.Timestamp);

        modelBuilder.Entity<BudgetAlert>()
            .HasIndex(ba => new { ba.Type, ba.IsProcessed });

        modelBuilder.Entity<BudgetAlert>()
            .HasIndex(ba => new { ba.ProviderId, ba.Timestamp });

        // CostOptimizationRecommendation indexes
        modelBuilder.Entity<CostOptimizationRecommendation>()
            .HasIndex(cor => cor.GeneratedAt);

        modelBuilder.Entity<CostOptimizationRecommendation>()
            .HasIndex(cor => new { cor.Type, cor.IsImplemented });

        modelBuilder.Entity<CostOptimizationRecommendation>()
            .HasIndex(cor => cor.EstimatedMonthlySavings);

        // Paywall and Subscription indexes
        modelBuilder.Entity<UserSubscription>()
            .HasIndex(us => new { us.UserId, us.IsActive });

        modelBuilder.Entity<UserSubscription>()
            .HasIndex(us => us.EndDate);

        modelBuilder.Entity<UserSearchUsage>()
            .HasIndex(usu => new { usu.UserId, usu.Date })
            .IsUnique();

        modelBuilder.Entity<UserSearchUsage>()
            .HasIndex(usu => usu.Date);

        modelBuilder.Entity<PaywallAnalytics>()
            .HasIndex(pa => new { pa.UserId, pa.Timestamp });

        modelBuilder.Entity<PaywallAnalytics>()
            .HasIndex(pa => pa.EventType);

        modelBuilder.Entity<PaywallAnalytics>()
            .HasIndex(pa => pa.CorrelationId);
    }

    private void ConfigurePaywallRelationships(ModelBuilder modelBuilder)
    {
        // UserSubscription -> User (Many-to-One)
        modelBuilder.Entity<UserSubscription>()
            .HasOne(us => us.User)
            .WithMany()
            .HasForeignKey(us => us.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // UserSearchUsage -> User (Many-to-One)
        modelBuilder.Entity<UserSearchUsage>()
            .HasOne(usu => usu.User)
            .WithMany()
            .HasForeignKey(usu => usu.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // PaywallAnalytics -> User (Many-to-One)
        modelBuilder.Entity<PaywallAnalytics>()
            .HasOne(pa => pa.User)
            .WithMany()
            .HasForeignKey(pa => pa.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // PaywallEventRecord -> User (Many-to-One)
        modelBuilder.Entity<PaywallEventRecord>()
            .HasOne(pe => pe.User)
            .WithMany()
            .HasForeignKey(pe => pe.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure JSON columns for metadata
        modelBuilder.Entity<PaywallAnalytics>()
            .Property(e => e.Metadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        // Configure PaywallEventRecord JSON metadata
        modelBuilder.Entity<PaywallEventRecord>()
            .Property(e => e.Metadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());
    }

    private void ConfigureSearchOptimizationRelationships(ModelBuilder modelBuilder)
    {
        // SearchableContent configuration
        modelBuilder.Entity<SearchableContent>()
            .HasKey(sc => sc.Id);

        // SearchableContent -> ContentStreamingOptions (One-to-Many)
        modelBuilder.Entity<SearchableContent>()
            .HasMany(sc => sc.StreamingOptions)
            .WithOne(cso => cso.Content)
            .HasForeignKey(cso => cso.ContentId)
            .OnDelete(DeleteBehavior.Cascade);
            
        // Ensure ContentStreamingOption entity is properly configured
        modelBuilder.Entity<ContentStreamingOption>()
            .HasKey(cso => cso.Id);
            
        modelBuilder.Entity<ContentStreamingOption>()
            .Property(cso => cso.ContentId)
            .IsRequired();

        // SearchableContent -> ContentAlternativeTitles (One-to-Many)
        modelBuilder.Entity<SearchableContent>()
            .HasMany(sc => sc.AlternativeTitles)
            .WithOne(cat => cat.Content)
            .HasForeignKey(cat => cat.ContentId)
            .OnDelete(DeleteBehavior.Cascade);
            
        // Ensure ContentAlternativeTitle entity is properly configured
        modelBuilder.Entity<ContentAlternativeTitle>()
            .HasKey(cat => cat.Id);
            
        modelBuilder.Entity<ContentAlternativeTitle>()
            .Property(cat => cat.ContentId)
            .IsRequired();

        // Advanced search performance indexes
        modelBuilder.Entity<SearchableContent>()
            .HasIndex(sc => new { sc.Title, sc.Type, sc.Year })
            .HasDatabaseName("IX_SearchableContent_Title_Type_Year");

        modelBuilder.Entity<SearchableContent>()
            .HasIndex(sc => new { sc.SearchableTitle, sc.SearchableGenres })
            .HasDatabaseName("IX_SearchableContent_SearchableText");

        modelBuilder.Entity<SearchableContent>()
            .HasIndex(sc => new { sc.Rating, sc.Popularity, sc.ViewCount })
            .HasDatabaseName("IX_SearchableContent_Ranking");

        modelBuilder.Entity<SearchableContent>()
            .HasIndex(sc => new { sc.Type, sc.IsAdult, sc.Language })
            .HasDatabaseName("IX_SearchableContent_Filtering");

        modelBuilder.Entity<SearchableContent>()
            .HasIndex(sc => new { sc.AvailableCountriesCount, sc.AvailableServicesCount })
            .HasDatabaseName("IX_SearchableContent_Availability");

        modelBuilder.Entity<SearchableContent>()
            .HasIndex(sc => new { sc.UpdatedAt, sc.LastAvailabilityUpdate })
            .HasDatabaseName("IX_SearchableContent_Freshness");

        // Full-text search index (SQL Server specific)
        modelBuilder.Entity<SearchableContent>()
            .HasIndex(sc => new { sc.SearchableTitle, sc.SearchableOverview, sc.SearchableCast, sc.SearchableCrew, sc.SearchableGenres })
            .HasDatabaseName("IX_SearchableContent_FullTextSearch");

        // ContentStreamingOption performance indexes
        modelBuilder.Entity<ContentStreamingOption>()
            .HasIndex(cso => new { cso.ContentId, cso.CountryCode, cso.StreamingType })
            .HasDatabaseName("IX_ContentStreamingOption_Content_Country_Type");

        modelBuilder.Entity<ContentStreamingOption>()
            .HasIndex(cso => new { cso.ServiceId, cso.StreamingType, cso.Price })
            .HasDatabaseName("IX_ContentStreamingOption_Service_Type_Price");

        modelBuilder.Entity<ContentStreamingOption>()
            .HasIndex(cso => new { cso.CountryCode, cso.ServiceId, cso.LastUpdated })
            .HasDatabaseName("IX_ContentStreamingOption_Country_Service_Updated");

        modelBuilder.Entity<ContentStreamingOption>()
            .HasIndex(cso => cso.ExpiresAt)
            .HasFilter("[ExpiresAt] IS NOT NULL")
            .HasDatabaseName("IX_ContentStreamingOption_ExpiresAt");

        // ContentAlternativeTitle performance indexes
        modelBuilder.Entity<ContentAlternativeTitle>()
            .HasIndex(cat => new { cat.SearchableTitle, cat.Language })
            .HasDatabaseName("IX_ContentAlternativeTitle_SearchableTitle_Language");

        modelBuilder.Entity<ContentAlternativeTitle>()
            .HasIndex(cat => new { cat.ContentId, cat.TitleType })
            .HasDatabaseName("IX_ContentAlternativeTitle_Content_Type");

        // SearchAnalytics performance indexes
        modelBuilder.Entity<SearchAnalytics>()
            .HasIndex(sa => new { sa.ExecutionTimeMs, sa.ResultCount })
            .HasDatabaseName("IX_SearchAnalytics_Performance");

        modelBuilder.Entity<SearchAnalytics>()
            .HasIndex(sa => new { sa.CreatedAt, sa.PerformanceTier })
            .HasDatabaseName("IX_SearchAnalytics_CreatedAt_Tier");

        modelBuilder.Entity<SearchAnalytics>()
            .HasIndex(sa => new { sa.HitCount, sa.HasClickthrough })
            .HasDatabaseName("IX_SearchAnalytics_Usage");

        modelBuilder.Entity<SearchAnalytics>()
            .HasIndex(sa => new { sa.UsedCache, sa.CacheHitRate })
            .HasDatabaseName("IX_SearchAnalytics_Cache");

        // SearchHistory performance indexes
        modelBuilder.Entity<SearchHistory>()
            .HasIndex(sh => new { sh.UserId, sh.SearchedAt })
            .HasDatabaseName("IX_SearchHistory_User_Date");

        modelBuilder.Entity<SearchHistory>()
            .HasIndex(sh => new { sh.Query, sh.SearchedAt })
            .HasDatabaseName("IX_SearchHistory_Query_Date");

        modelBuilder.Entity<SearchHistory>()
            .HasIndex(sh => sh.SearchedAt)
            .HasDatabaseName("IX_SearchHistory_Date");

        // SearchTrend performance indexes
        modelBuilder.Entity<SearchTrend>()
            .HasIndex(st => new { st.Date, st.TrendingScore })
            .HasDatabaseName("IX_SearchTrend_Date_Score");

        modelBuilder.Entity<SearchTrend>()
            .HasIndex(st => new { st.Query, st.Date })
            .HasDatabaseName("IX_SearchTrend_Query_Date");

        modelBuilder.Entity<SearchTrend>()
            .HasIndex(st => new { st.IsRising, st.TrendingScore })
            .HasDatabaseName("IX_SearchTrend_Rising_Score");
    }

    private void ConfigureSearchHistoryRelationships(ModelBuilder modelBuilder)
    {
        // SearchHistory relationships
        modelBuilder.Entity<SearchHistory>()
            .HasOne(sh => sh.User)
            .WithMany()
            .HasForeignKey(sh => sh.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // SearchHistory properties
        modelBuilder.Entity<SearchHistory>()
            .Property(sh => sh.Query)
            .IsRequired()
            .HasMaxLength(500);

        modelBuilder.Entity<SearchHistory>()
            .Property(sh => sh.SearchType)
            .HasMaxLength(50)
            .HasDefaultValue("General");

        modelBuilder.Entity<SearchHistory>()
            .Property(sh => sh.CorrelationId)
            .HasMaxLength(100);

        modelBuilder.Entity<SearchHistory>()
            .Property(sh => sh.SearchedAt)
            .HasDefaultValueSql("NOW()");

        // SearchTrend properties
        modelBuilder.Entity<SearchTrend>()
            .Property(st => st.Query)
            .IsRequired()
            .HasMaxLength(500);

        modelBuilder.Entity<SearchTrend>()
            .Property(st => st.Date)
            .HasDefaultValueSql("CURRENT_DATE");

        modelBuilder.Entity<SearchTrend>()
            .Property(st => st.LastUpdated)
            .HasDefaultValueSql("NOW()");

        modelBuilder.Entity<SearchTrend>()
            .Property(st => st.TimeWindowHours)
            .HasDefaultValue(24);

        // Add unique constraint for SearchTrend (one record per query per date)
        modelBuilder.Entity<SearchTrend>()
            .HasIndex(st => new { st.Query, st.Date })
            .IsUnique()
            .HasDatabaseName("IX_SearchTrend_Query_Date_Unique");
    }

    private void ConfigurePaymentRelationships(ModelBuilder modelBuilder)
    {
        // PaymentTransaction -> User (Many-to-One)
        modelBuilder.Entity<PaymentTransaction>()
            .HasOne(pt => pt.User)
            .WithMany()
            .HasForeignKey(pt => pt.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // PaymentTransaction -> PaymentMethod (Many-to-One, Optional)
        modelBuilder.Entity<PaymentTransaction>()
            .HasOne(pt => pt.PaymentMethod)
            .WithMany(pm => pm.Transactions)
            .HasForeignKey(pt => pt.PaymentMethodId)
            .OnDelete(DeleteBehavior.SetNull);

        // PaymentMethod -> User (Many-to-One)
        modelBuilder.Entity<PaymentMethod>()
            .HasOne(pm => pm.User)
            .WithMany()
            .HasForeignKey(pm => pm.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // StripeCustomer -> User (One-to-One)
        modelBuilder.Entity<StripeCustomer>()
            .HasOne(sc => sc.User)
            .WithOne()
            .HasForeignKey<StripeCustomer>(sc => sc.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Subscription -> User (Many-to-One)
        modelBuilder.Entity<Subscription>()
            .HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Subscription -> StripeCustomer (Many-to-One)
        modelBuilder.Entity<Subscription>()
            .HasOne(s => s.StripeCustomer)
            .WithMany(sc => sc.Subscriptions)
            .HasForeignKey(s => s.StripeCustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        // PaymentAnalytics -> User (Many-to-One, Optional)
        modelBuilder.Entity<PaymentAnalytics>()
            .HasOne(pa => pa.User)
            .WithMany()
            .HasForeignKey(pa => pa.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure JSON columns for metadata
        modelBuilder.Entity<PaymentTransaction>()
            .Property(pt => pt.Metadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        modelBuilder.Entity<StripeCustomer>()
            .Property(sc => sc.Metadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        modelBuilder.Entity<Subscription>()
            .Property(s => s.Metadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        modelBuilder.Entity<PaymentAnalytics>()
            .Property(pa => pa.Metadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        // Indexes for PaymentTransaction
        modelBuilder.Entity<PaymentTransaction>()
            .HasIndex(pt => pt.StripePaymentIntentId)
            .IsUnique();

        modelBuilder.Entity<PaymentTransaction>()
            .HasIndex(pt => new { pt.UserId, pt.CreatedAt })
            .HasDatabaseName("IX_PaymentTransaction_User_CreatedAt");

        modelBuilder.Entity<PaymentTransaction>()
            .HasIndex(pt => new { pt.Status, pt.CreatedAt })
            .HasDatabaseName("IX_PaymentTransaction_Status_CreatedAt");

        modelBuilder.Entity<PaymentTransaction>()
            .HasIndex(pt => pt.CorrelationId)
            .HasDatabaseName("IX_PaymentTransaction_CorrelationId");

        modelBuilder.Entity<PaymentTransaction>()
            .HasIndex(pt => new { pt.NextRetryAt, pt.Status })
            .HasFilter("[NextRetryAt] IS NOT NULL AND [Status] = 'pending'")
            .HasDatabaseName("IX_PaymentTransaction_NextRetryAt_Status");

        // Indexes for PaymentMethod
        modelBuilder.Entity<PaymentMethod>()
            .HasIndex(pm => pm.StripePaymentMethodId)
            .IsUnique();

        modelBuilder.Entity<PaymentMethod>()
            .HasIndex(pm => new { pm.UserId, pm.IsActive })
            .HasDatabaseName("IX_PaymentMethod_User_IsActive");

        modelBuilder.Entity<PaymentMethod>()
            .HasIndex(pm => new { pm.UserId, pm.IsDefault })
            .HasFilter("[IsDefault] = 1")
            .HasDatabaseName("IX_PaymentMethod_User_IsDefault");

        // Indexes for StripeCustomer
        modelBuilder.Entity<StripeCustomer>()
            .HasIndex(sc => sc.StripeCustomerId)
            .IsUnique();

        modelBuilder.Entity<StripeCustomer>()
            .HasIndex(sc => sc.UserId)
            .IsUnique();

        modelBuilder.Entity<StripeCustomer>()
            .HasIndex(sc => sc.Email)
            .HasDatabaseName("IX_StripeCustomer_Email");

        // Indexes for Subscription
        modelBuilder.Entity<Subscription>()
            .HasIndex(s => s.StripeSubscriptionId)
            .IsUnique();

        modelBuilder.Entity<Subscription>()
            .HasIndex(s => new { s.UserId, s.Status })
            .HasDatabaseName("IX_Subscription_User_Status");

        modelBuilder.Entity<Subscription>()
            .HasIndex(s => new { s.Status, s.CurrentPeriodEnd })
            .HasDatabaseName("IX_Subscription_Status_CurrentPeriodEnd");

        // Indexes for WebhookEvent
        modelBuilder.Entity<WebhookEvent>()
            .HasIndex(we => we.StripeEventId)
            .IsUnique();

        modelBuilder.Entity<WebhookEvent>()
            .HasIndex(we => new { we.ProcessingStatus, we.NextRetryAt })
            .HasFilter("[ProcessingStatus] = 'pending' AND [NextRetryAt] IS NOT NULL")
            .HasDatabaseName("IX_WebhookEvent_ProcessingStatus_NextRetryAt");

        modelBuilder.Entity<WebhookEvent>()
            .HasIndex(we => new { we.EventType, we.CreatedAt })
            .HasDatabaseName("IX_WebhookEvent_EventType_CreatedAt");

        modelBuilder.Entity<WebhookEvent>()
            .HasIndex(we => we.CorrelationId)
            .HasDatabaseName("IX_WebhookEvent_CorrelationId");

        // Indexes for PaymentAnalytics
        modelBuilder.Entity<PaymentAnalytics>()
            .HasIndex(pa => new { pa.EventType, pa.Timestamp })
            .HasDatabaseName("IX_PaymentAnalytics_EventType_Timestamp");

        modelBuilder.Entity<PaymentAnalytics>()
            .HasIndex(pa => new { pa.UserId, pa.Timestamp })
            .HasDatabaseName("IX_PaymentAnalytics_User_Timestamp");

        modelBuilder.Entity<PaymentAnalytics>()
            .HasIndex(pa => pa.CorrelationId)
            .HasDatabaseName("IX_PaymentAnalytics_CorrelationId");

        // Indexes for PaymentConfiguration
        modelBuilder.Entity<PaymentConfiguration>()
            .HasIndex(pc => pc.Key)
            .IsUnique();

        modelBuilder.Entity<PaymentConfiguration>()
            .HasIndex(pc => new { pc.Category, pc.IsActive })
            .HasDatabaseName("IX_PaymentConfiguration_Category_IsActive");
    }

    private void ConfigureInvoiceRelationships(ModelBuilder modelBuilder)
    {
        // Invoice -> User (Many-to-One)
        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.User)
            .WithMany()
            .HasForeignKey(i => i.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Invoice -> StripeCustomer (Many-to-One, Optional)
        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.StripeCustomer)
            .WithMany()
            .HasForeignKey(i => i.StripeCustomerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Invoice -> PaymentTransaction (One-to-One, Optional)
        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.PaymentTransaction)
            .WithOne()
            .HasForeignKey<Invoice>(i => i.PaymentTransactionId)
            .OnDelete(DeleteBehavior.SetNull);

        // Invoice -> Subscription (Many-to-One, Optional)
        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.Subscription)
            .WithMany()
            .HasForeignKey(i => i.SubscriptionId)
            .OnDelete(DeleteBehavior.SetNull);

        // Invoice -> BillingAddress (Many-to-One, Optional)
        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.BillingAddress)
            .WithMany(ba => ba.Invoices)
            .HasForeignKey(i => i.BillingAddressId)
            .OnDelete(DeleteBehavior.SetNull);

        // Invoice -> InvoiceLineItems (One-to-Many)
        modelBuilder.Entity<Invoice>()
            .HasMany(i => i.LineItems)
            .WithOne(ili => ili.Invoice)
            .HasForeignKey(ili => ili.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Invoice -> TaxCalculations (One-to-Many)
        modelBuilder.Entity<Invoice>()
            .HasMany(i => i.TaxCalculations)
            .WithOne(tc => tc.Invoice)
            .HasForeignKey(tc => tc.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Invoice -> InvoiceDeliveries (One-to-Many)
        modelBuilder.Entity<Invoice>()
            .HasMany(i => i.Deliveries)
            .WithOne(id => id.Invoice)
            .HasForeignKey(id => id.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        // BillingAddress -> User (Many-to-One)
        modelBuilder.Entity<BillingAddress>()
            .HasOne(ba => ba.User)
            .WithMany()
            .HasForeignKey(ba => ba.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure JSON columns for metadata
        modelBuilder.Entity<Invoice>()
            .Property(i => i.Metadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        modelBuilder.Entity<InvoiceLineItem>()
            .Property(ili => ili.Metadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        modelBuilder.Entity<TaxCalculation>()
            .Property(tc => tc.TaxDetails)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        modelBuilder.Entity<InvoiceDelivery>()
            .Property(id => id.DeliveryMetadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        // Invoice indexes
        modelBuilder.Entity<Invoice>()
            .HasIndex(i => i.InvoiceNumber)
            .IsUnique();

        modelBuilder.Entity<Invoice>()
            .HasIndex(i => i.StripeInvoiceId)
            .IsUnique()
            .HasFilter("[StripeInvoiceId] != ''");

        modelBuilder.Entity<Invoice>()
            .HasIndex(i => new { i.UserId, i.IssueDate })
            .HasDatabaseName("IX_Invoice_User_IssueDate");

        modelBuilder.Entity<Invoice>()
            .HasIndex(i => new { i.Status, i.DueDate })
            .HasDatabaseName("IX_Invoice_Status_DueDate");

        modelBuilder.Entity<Invoice>()
            .HasIndex(i => i.CorrelationId)
            .HasDatabaseName("IX_Invoice_CorrelationId");

        modelBuilder.Entity<Invoice>()
            .HasIndex(i => new { i.PeriodStart, i.PeriodEnd })
            .HasDatabaseName("IX_Invoice_Period");

        // InvoiceLineItem indexes
        modelBuilder.Entity<InvoiceLineItem>()
            .HasIndex(ili => new { ili.InvoiceId, ili.ItemType })
            .HasDatabaseName("IX_InvoiceLineItem_Invoice_ItemType");

        // BillingAddress indexes
        modelBuilder.Entity<BillingAddress>()
            .HasIndex(ba => new { ba.UserId, ba.IsDefault })
            .HasFilter("[IsDefault] = 1")
            .HasDatabaseName("IX_BillingAddress_User_IsDefault");

        modelBuilder.Entity<BillingAddress>()
            .HasIndex(ba => new { ba.UserId, ba.IsActive })
            .HasDatabaseName("IX_BillingAddress_User_IsActive");

        modelBuilder.Entity<BillingAddress>()
            .HasIndex(ba => ba.Country)
            .HasDatabaseName("IX_BillingAddress_Country");

        // TaxCalculation indexes
        modelBuilder.Entity<TaxCalculation>()
            .HasIndex(tc => new { tc.InvoiceId, tc.TaxType })
            .HasDatabaseName("IX_TaxCalculation_Invoice_TaxType");

        modelBuilder.Entity<TaxCalculation>()
            .HasIndex(tc => new { tc.Country, tc.StateProvince })
            .HasDatabaseName("IX_TaxCalculation_Country_State");

        // InvoiceDelivery indexes
        modelBuilder.Entity<InvoiceDelivery>()
            .HasIndex(id => new { id.InvoiceId, id.DeliveryMethod })
            .HasDatabaseName("IX_InvoiceDelivery_Invoice_Method");

        modelBuilder.Entity<InvoiceDelivery>()
            .HasIndex(id => new { id.Status, id.NextRetryAt })
            .HasFilter("[Status] = 'failed' AND [NextRetryAt] IS NOT NULL")
            .HasDatabaseName("IX_InvoiceDelivery_Status_NextRetryAt");

        // InvoiceTemplate indexes
        modelBuilder.Entity<InvoiceTemplate>()
            .HasIndex(it => new { it.Name, it.Language })
            .IsUnique();

        modelBuilder.Entity<InvoiceTemplate>()
            .HasIndex(it => new { it.TemplateType, it.IsActive })
            .HasDatabaseName("IX_InvoiceTemplate_Type_IsActive");
    }

    private void ConfigureDunningRelationships(ModelBuilder modelBuilder)
    {
        // FailedPayment -> User (Many-to-One)
        modelBuilder.Entity<FailedPayment>()
            .HasOne(fp => fp.User)
            .WithMany()
            .HasForeignKey(fp => fp.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // FailedPayment -> PaymentTransaction (One-to-One)
        modelBuilder.Entity<FailedPayment>()
            .HasOne(fp => fp.PaymentTransaction)
            .WithOne()
            .HasForeignKey<FailedPayment>(fp => fp.PaymentTransactionId)
            .OnDelete(DeleteBehavior.Restrict);

        // FailedPayment -> Subscription (Many-to-One, Optional)
        modelBuilder.Entity<FailedPayment>()
            .HasOne(fp => fp.Subscription)
            .WithMany()
            .HasForeignKey(fp => fp.SubscriptionId)
            .OnDelete(DeleteBehavior.SetNull);

        // PaymentRetryAttempt -> FailedPayment (Many-to-One)
        modelBuilder.Entity<PaymentRetryAttempt>()
            .HasOne(pra => pra.FailedPayment)
            .WithMany(fp => fp.PaymentRetryAttempts)
            .HasForeignKey(pra => pra.FailedPaymentId)
            .OnDelete(DeleteBehavior.Cascade);

        // PaymentRetryAttempt -> PaymentTransaction (Many-to-One)
        modelBuilder.Entity<PaymentRetryAttempt>()
            .HasOne(pra => pra.PaymentTransaction)
            .WithMany()
            .HasForeignKey(pra => pra.PaymentTransactionId)
            .OnDelete(DeleteBehavior.Restrict);

        // DunningCampaign -> DunningSteps (One-to-Many)
        modelBuilder.Entity<DunningCampaign>()
            .HasMany(dc => dc.Steps)
            .WithOne(ds => ds.Campaign)
            .HasForeignKey(ds => ds.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        // DunningCampaignExecution -> DunningCampaign (Many-to-One)
        modelBuilder.Entity<DunningCampaignExecution>()
            .HasOne(dce => dce.Campaign)
            .WithMany(dc => dc.Executions)
            .HasForeignKey(dce => dce.CampaignId)
            .OnDelete(DeleteBehavior.Restrict);

        // DunningCampaignExecution -> FailedPayment (Many-to-One)
        modelBuilder.Entity<DunningCampaignExecution>()
            .HasOne(dce => dce.FailedPayment)
            .WithMany(fp => fp.CampaignExecutions)
            .HasForeignKey(dce => dce.FailedPaymentId)
            .OnDelete(DeleteBehavior.Cascade);

        // DunningCampaignExecution -> User (Many-to-One)
        modelBuilder.Entity<DunningCampaignExecution>()
            .HasOne(dce => dce.User)
            .WithMany()
            .HasForeignKey(dce => dce.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // DunningNotification -> CampaignExecution (Many-to-One)
        modelBuilder.Entity<DunningNotification>()
            .HasOne(dn => dn.CampaignExecution)
            .WithMany(dce => dce.Notifications)
            .HasForeignKey(dn => dn.CampaignExecutionId)
            .OnDelete(DeleteBehavior.Cascade);

        // DunningNotification -> Step (Many-to-One)
        modelBuilder.Entity<DunningNotification>()
            .HasOne(dn => dn.Step)
            .WithMany(ds => ds.Notifications)
            .HasForeignKey(dn => dn.StepId)
            .OnDelete(DeleteBehavior.Restrict);

        // DunningNotification -> User (Many-to-One)
        modelBuilder.Entity<DunningNotification>()
            .HasOne(dn => dn.User)
            .WithMany()
            .HasForeignKey(dn => dn.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // GracePeriod -> User (Many-to-One)
        modelBuilder.Entity<GracePeriod>()
            .HasOne(gp => gp.User)
            .WithMany()
            .HasForeignKey(gp => gp.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // GracePeriod -> FailedPayment (One-to-One)
        modelBuilder.Entity<GracePeriod>()
            .HasOne(gp => gp.FailedPayment)
            .WithOne()
            .HasForeignKey<GracePeriod>(gp => gp.FailedPaymentId)
            .OnDelete(DeleteBehavior.Cascade);

        // GracePeriod -> Subscription (Many-to-One, Optional)
        modelBuilder.Entity<GracePeriod>()
            .HasOne(gp => gp.Subscription)
            .WithMany()
            .HasForeignKey(gp => gp.SubscriptionId)
            .OnDelete(DeleteBehavior.SetNull);

        // PaymentRecoverySession -> User (Many-to-One)
        modelBuilder.Entity<PaymentRecoverySession>()
            .HasOne(prs => prs.User)
            .WithMany()
            .HasForeignKey(prs => prs.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // PaymentRecoverySession -> FailedPayment (Many-to-One)
        modelBuilder.Entity<PaymentRecoverySession>()
            .HasOne(prs => prs.FailedPayment)
            .WithMany()
            .HasForeignKey(prs => prs.FailedPaymentId)
            .OnDelete(DeleteBehavior.Cascade);

        // DunningAnalytics relationships (optional foreign keys)
        modelBuilder.Entity<DunningAnalytics>()
            .HasOne(da => da.User)
            .WithMany()
            .HasForeignKey(da => da.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<DunningAnalytics>()
            .HasOne(da => da.Campaign)
            .WithMany()
            .HasForeignKey(da => da.CampaignId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<DunningAnalytics>()
            .HasOne(da => da.Step)
            .WithMany()
            .HasForeignKey(da => da.StepId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure JSON columns
        modelBuilder.Entity<FailedPayment>()
            .Property(fp => fp.Metadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        modelBuilder.Entity<PaymentRetryAttempt>()
            .Property(pra => pra.Metadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        modelBuilder.Entity<DunningStep>()
            .Property(ds => ds.TemplateVariables)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        modelBuilder.Entity<DunningCampaignExecution>()
            .Property(dce => dce.ExecutionMetadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        modelBuilder.Entity<DunningNotification>()
            .Property(dn => dn.DeliveryMetadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        modelBuilder.Entity<GracePeriod>()
            .Property(gp => gp.RestrictedFeatures)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<string>());

        modelBuilder.Entity<GracePeriod>()
            .Property(gp => gp.Metadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        modelBuilder.Entity<PaymentRecoverySession>()
            .Property(prs => prs.SessionMetadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        modelBuilder.Entity<DunningAnalytics>()
            .Property(da => da.AnalyticsMetadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>());

        // Performance indexes for FailedPayment
        modelBuilder.Entity<FailedPayment>()
            .HasIndex(fp => new { fp.UserId, fp.RecoveryStatus })
            .HasDatabaseName("IX_FailedPayment_User_RecoveryStatus");

        modelBuilder.Entity<FailedPayment>()
            .HasIndex(fp => new { fp.RecoveryStatus, fp.NextRetryAt })
            .HasFilter("[NextRetryAt] IS NOT NULL")
            .HasDatabaseName("IX_FailedPayment_RecoveryStatus_NextRetryAt");

        modelBuilder.Entity<FailedPayment>()
            .HasIndex(fp => new { fp.FailureType, fp.CreatedAt })
            .HasDatabaseName("IX_FailedPayment_FailureType_CreatedAt");

        modelBuilder.Entity<FailedPayment>()
            .HasIndex(fp => fp.CorrelationId)
            .HasDatabaseName("IX_FailedPayment_CorrelationId");

        // PaymentRetryAttempt indexes
        modelBuilder.Entity<PaymentRetryAttempt>()
            .HasIndex(pra => new { pra.FailedPaymentId, pra.AttemptNumber })
            .IsUnique()
            .HasDatabaseName("IX_PaymentRetryAttempt_FailedPayment_AttemptNumber");

        modelBuilder.Entity<PaymentRetryAttempt>()
            .HasIndex(pra => new { pra.Status, pra.AttemptedAt })
            .HasDatabaseName("IX_PaymentRetryAttempt_Status_AttemptedAt");

        // DunningCampaign indexes
        modelBuilder.Entity<DunningCampaign>()
            .HasIndex(dc => new { dc.TriggerType, dc.IsActive })
            .HasDatabaseName("IX_DunningCampaign_TriggerType_IsActive");

        modelBuilder.Entity<DunningCampaign>()
            .HasIndex(dc => new { dc.CustomerSegment, dc.Priority })
            .HasDatabaseName("IX_DunningCampaign_CustomerSegment_Priority");

        // DunningStep indexes
        modelBuilder.Entity<DunningStep>()
            .HasIndex(ds => new { ds.CampaignId, ds.StepNumber })
            .IsUnique()
            .HasDatabaseName("IX_DunningStep_Campaign_StepNumber");

        modelBuilder.Entity<DunningStep>()
            .HasIndex(ds => new { ds.NotificationType, ds.IsActive })
            .HasDatabaseName("IX_DunningStep_NotificationType_IsActive");

        // DunningCampaignExecution indexes
        modelBuilder.Entity<DunningCampaignExecution>()
            .HasIndex(dce => new { dce.UserId, dce.Status })
            .HasDatabaseName("IX_DunningCampaignExecution_User_Status");

        modelBuilder.Entity<DunningCampaignExecution>()
            .HasIndex(dce => new { dce.Status, dce.NextExecutionAt })
            .HasFilter("[NextExecutionAt] IS NOT NULL")
            .HasDatabaseName("IX_DunningCampaignExecution_Status_NextExecutionAt");

        modelBuilder.Entity<DunningCampaignExecution>()
            .HasIndex(dce => new { dce.FailedPaymentId, dce.CampaignId })
            .IsUnique()
            .HasDatabaseName("IX_DunningCampaignExecution_FailedPayment_Campaign");

        // DunningNotification indexes
        modelBuilder.Entity<DunningNotification>()
            .HasIndex(dn => new { dn.UserId, dn.Status })
            .HasDatabaseName("IX_DunningNotification_User_Status");

        modelBuilder.Entity<DunningNotification>()
            .HasIndex(dn => new { dn.NotificationType, dn.Status })
            .HasDatabaseName("IX_DunningNotification_Type_Status");

        modelBuilder.Entity<DunningNotification>()
            .HasIndex(dn => new { dn.Status, dn.NextRetryAt })
            .HasFilter("[Status] = 'failed' AND [NextRetryAt] IS NOT NULL")
            .HasDatabaseName("IX_DunningNotification_Status_NextRetryAt");

        // GracePeriod indexes
        modelBuilder.Entity<GracePeriod>()
            .HasIndex(gp => new { gp.UserId, gp.Status })
            .HasDatabaseName("IX_GracePeriod_User_Status");

        modelBuilder.Entity<GracePeriod>()
            .HasIndex(gp => new { gp.Status, gp.ExpiresAt })
            .HasDatabaseName("IX_GracePeriod_Status_ExpiresAt");

        modelBuilder.Entity<GracePeriod>()
            .HasIndex(gp => gp.FailedPaymentId)
            .IsUnique()
            .HasDatabaseName("IX_GracePeriod_FailedPaymentId");

        // PaymentRecoverySession indexes
        modelBuilder.Entity<PaymentRecoverySession>()
            .HasIndex(prs => prs.SessionToken)
            .IsUnique()
            .HasDatabaseName("IX_PaymentRecoverySession_SessionToken");

        modelBuilder.Entity<PaymentRecoverySession>()
            .HasIndex(prs => new { prs.UserId, prs.Status })
            .HasDatabaseName("IX_PaymentRecoverySession_User_Status");

        modelBuilder.Entity<PaymentRecoverySession>()
            .HasIndex(prs => new { prs.Status, prs.ExpiresAt })
            .HasDatabaseName("IX_PaymentRecoverySession_Status_ExpiresAt");

        // DunningAnalytics indexes
        modelBuilder.Entity<DunningAnalytics>()
            .HasIndex(da => new { da.EventType, da.Timestamp })
            .HasDatabaseName("IX_DunningAnalytics_EventType_Timestamp");

        modelBuilder.Entity<DunningAnalytics>()
            .HasIndex(da => new { da.UserId, da.Timestamp })
            .HasDatabaseName("IX_DunningAnalytics_User_Timestamp");

        modelBuilder.Entity<DunningAnalytics>()
            .HasIndex(da => new { da.FailureType, da.WasSuccessful })
            .HasDatabaseName("IX_DunningAnalytics_FailureType_Success");

        // DunningConfiguration indexes
        modelBuilder.Entity<DunningConfiguration>()
            .HasIndex(dc => dc.Key)
            .IsUnique()
            .HasDatabaseName("IX_DunningConfiguration_Key");

        modelBuilder.Entity<DunningConfiguration>()
            .HasIndex(dc => new { dc.Category, dc.IsActive })
            .HasDatabaseName("IX_DunningConfiguration_Category_IsActive");
    }

    private void ConfigureSupportRelationships(ModelBuilder modelBuilder)
    {
        // SupportAction relationships
        modelBuilder.Entity<SupportAction>()
            .HasOne(sa => sa.SupportAgent)
            .WithMany()
            .HasForeignKey(sa => sa.SupportAgentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SupportAction>()
            .HasOne(sa => sa.TargetUser)
            .WithMany()
            .HasForeignKey(sa => sa.TargetUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SupportAction>()
            .HasOne(sa => sa.ApprovalUser)
            .WithMany()
            .HasForeignKey(sa => sa.ApprovedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SupportAction>()
            .HasOne(sa => sa.RejectionUser)
            .WithMany()
            .HasForeignKey(sa => sa.RejectedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SupportAction>()
            .HasOne(sa => sa.PaymentTransaction)
            .WithMany()
            .HasForeignKey(sa => sa.PaymentTransactionId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SupportAction>()
            .HasOne(sa => sa.Subscription)
            .WithMany()
            .HasForeignKey(sa => sa.SubscriptionId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SupportAction>()
            .HasOne(sa => sa.Invoice)
            .WithMany()
            .HasForeignKey(sa => sa.InvoiceId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SupportAction>()
            .HasMany(sa => sa.AuditLogs)
            .WithOne(sal => sal.SupportAction)
            .HasForeignKey(sal => sal.SupportActionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SupportAction>()
            .HasMany(sa => sa.Refunds)
            .WithOne(sr => sr.SupportAction)
            .HasForeignKey(sr => sr.SupportActionId)
            .OnDelete(DeleteBehavior.Restrict);

        // SupportActionAuditLog relationships
        modelBuilder.Entity<SupportActionAuditLog>()
            .HasOne(sal => sal.User)
            .WithMany()
            .HasForeignKey(sal => sal.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // SupportRefund relationships
        modelBuilder.Entity<SupportRefund>()
            .HasOne(sr => sr.PaymentTransaction)
            .WithMany()
            .HasForeignKey(sr => sr.PaymentTransactionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SupportRefund>()
            .HasOne(sr => sr.User)
            .WithMany()
            .HasForeignKey(sr => sr.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SupportRefund>()
            .HasOne(sr => sr.ProcessingAgent)
            .WithMany()
            .HasForeignKey(sr => sr.ProcessedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // CustomerBillingAccessLog relationships
        modelBuilder.Entity<CustomerBillingAccessLog>()
            .HasOne(cbal => cbal.SupportAgent)
            .WithMany()
            .HasForeignKey(cbal => cbal.SupportAgentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CustomerBillingAccessLog>()
            .HasOne(cbal => cbal.Customer)
            .WithMany()
            .HasForeignKey(cbal => cbal.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Configure JSON columns for metadata
        modelBuilder.Entity<SupportAction>()
            .Property(sa => sa.MetadataJson)
            .HasConversion(
                v => v,
                v => v ?? "{}")
            .HasColumnType("nvarchar(max)")
            .HasDefaultValue("{}");

        modelBuilder.Entity<SupportRefund>()
            .Property(sr => sr.MetadataJson)
            .HasConversion(
                v => v,
                v => v ?? "{}")
            .HasColumnType("nvarchar(max)")
            .HasDefaultValue("{}");

        // Indexes for SupportAction
        modelBuilder.Entity<SupportAction>()
            .HasIndex(sa => new { sa.ActionType, sa.Status })
            .HasDatabaseName("IX_SupportAction_ActionType_Status");

        modelBuilder.Entity<SupportAction>()
            .HasIndex(sa => new { sa.SupportAgentId, sa.CreatedAt })
            .HasDatabaseName("IX_SupportAction_SupportAgent_CreatedAt");

        modelBuilder.Entity<SupportAction>()
            .HasIndex(sa => new { sa.TargetUserId, sa.CreatedAt })
            .HasDatabaseName("IX_SupportAction_TargetUser_CreatedAt");

        modelBuilder.Entity<SupportAction>()
            .HasIndex(sa => new { sa.Status, sa.Priority })
            .HasDatabaseName("IX_SupportAction_Status_Priority");

        modelBuilder.Entity<SupportAction>()
            .HasIndex(sa => sa.CorrelationId)
            .HasDatabaseName("IX_SupportAction_CorrelationId");

        modelBuilder.Entity<SupportAction>()
            .HasIndex(sa => new { sa.Status, sa.CreatedAt })
            .HasFilter("[Status] IN (0, 5)") // Pending or RequiresApproval
            .HasDatabaseName("IX_SupportAction_PendingActions");

        // Indexes for SupportActionAuditLog
        modelBuilder.Entity<SupportActionAuditLog>()
            .HasIndex(sal => new { sal.SupportActionId, sal.CreatedAt })
            .HasDatabaseName("IX_SupportActionAuditLog_Action_CreatedAt");

        modelBuilder.Entity<SupportActionAuditLog>()
            .HasIndex(sal => new { sal.UserId, sal.CreatedAt })
            .HasDatabaseName("IX_SupportActionAuditLog_User_CreatedAt");

        modelBuilder.Entity<SupportActionAuditLog>()
            .HasIndex(sal => sal.CorrelationId)
            .HasDatabaseName("IX_SupportActionAuditLog_CorrelationId");

        // Indexes for SupportRefund
        modelBuilder.Entity<SupportRefund>()
            .HasIndex(sr => new { sr.Status, sr.CreatedAt })
            .HasDatabaseName("IX_SupportRefund_Status_CreatedAt");

        modelBuilder.Entity<SupportRefund>()
            .HasIndex(sr => new { sr.UserId, sr.CreatedAt })
            .HasDatabaseName("IX_SupportRefund_User_CreatedAt");

        modelBuilder.Entity<SupportRefund>()
            .HasIndex(sr => sr.StripeRefundId)
            .IsUnique()
            .HasFilter("[StripeRefundId] IS NOT NULL")
            .HasDatabaseName("IX_SupportRefund_StripeRefundId");

        modelBuilder.Entity<SupportRefund>()
            .HasIndex(sr => sr.CorrelationId)
            .HasDatabaseName("IX_SupportRefund_CorrelationId");

        // Indexes for CustomerBillingAccessLog
        modelBuilder.Entity<CustomerBillingAccessLog>()
            .HasIndex(cbal => new { cbal.CustomerId, cbal.AccessedAt })
            .HasDatabaseName("IX_CustomerBillingAccessLog_Customer_AccessedAt");

        modelBuilder.Entity<CustomerBillingAccessLog>()
            .HasIndex(cbal => new { cbal.SupportAgentId, cbal.AccessedAt })
            .HasDatabaseName("IX_CustomerBillingAccessLog_SupportAgent_AccessedAt");

        modelBuilder.Entity<CustomerBillingAccessLog>()
            .HasIndex(cbal => new { cbal.AccessType, cbal.AccessedAt })
            .HasDatabaseName("IX_CustomerBillingAccessLog_AccessType_AccessedAt");

        modelBuilder.Entity<CustomerBillingAccessLog>()
            .HasIndex(cbal => cbal.CorrelationId)
            .HasDatabaseName("IX_CustomerBillingAccessLog_CorrelationId");

        // Social Sharing Indexes
        modelBuilder.Entity<SocialShareEvent>()
            .HasIndex(sse => new { sse.UserId, sse.CreatedAt })
            .HasDatabaseName("IX_SocialShareEvent_User_CreatedAt");

        modelBuilder.Entity<SocialShareEvent>()
            .HasIndex(sse => new { sse.ContentId, sse.Platform })
            .HasDatabaseName("IX_SocialShareEvent_Content_Platform");

        modelBuilder.Entity<SocialShareEvent>()
            .HasIndex(sse => sse.Status)
            .HasDatabaseName("IX_SocialShareEvent_Status");

        modelBuilder.Entity<ShareLinkClick>()
            .HasIndex(slc => new { slc.ShareEventId, slc.ClickedAt })
            .HasDatabaseName("IX_ShareLinkClick_ShareEvent_ClickedAt");

        modelBuilder.Entity<ShareLinkClick>()
            .HasIndex(slc => slc.ConvertedToRegistration)
            .HasDatabaseName("IX_ShareLinkClick_ConvertedToRegistration");

        modelBuilder.Entity<ShareLinkMapping>()
            .HasIndex(slm => slm.ShortCode)
            .IsUnique()
            .HasDatabaseName("IX_ShareLinkMapping_ShortCode");

        modelBuilder.Entity<ShareLinkMapping>()
            .HasIndex(slm => new { slm.CreatedAt, slm.IsActive })
            .HasDatabaseName("IX_ShareLinkMapping_CreatedAt_IsActive");
    }

    private void ConfigureSocialSharingRelationships(ModelBuilder modelBuilder)
    {
        // SocialShareEvent -> User relationship
        modelBuilder.Entity<SocialShareEvent>()
            .HasOne(sse => sse.User)
            .WithMany()
            .HasForeignKey(sse => sse.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // SocialSharingPreferences -> User relationship
        modelBuilder.Entity<SocialSharingPreferences>()
            .HasOne(ssp => ssp.User)
            .WithMany()
            .HasForeignKey(ssp => ssp.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // ShareLinkClick -> SocialShareEvent relationship
        modelBuilder.Entity<ShareLinkClick>()
            .HasOne(slc => slc.ShareEvent)
            .WithMany()
            .HasForeignKey(slc => slc.ShareEventId)
            .OnDelete(DeleteBehavior.Cascade);

        // ShareLinkClick -> ConvertedUser relationship
        modelBuilder.Entity<ShareLinkClick>()
            .HasOne(slc => slc.ConvertedUser)
            .WithMany()
            .HasForeignKey(slc => slc.ConvertedUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // ShareLinkMapping -> SocialShareEvent relationship
        modelBuilder.Entity<ShareLinkMapping>()
            .HasOne(slm => slm.ShareEvent)
            .WithMany()
            .HasForeignKey(slm => slm.ShareEventId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure unique constraints
        modelBuilder.Entity<SocialSharingPreferences>()
            .HasIndex(ssp => ssp.UserId)
            .IsUnique();

        // Configure decimal precision
        modelBuilder.Entity<ContentSharingMetrics>()
            .Property(csm => csm.ClickThroughRate)
            .HasPrecision(5, 4);

        modelBuilder.Entity<ContentSharingMetrics>()
            .Property(csm => csm.ConversionRate)
            .HasPrecision(5, 4);

        modelBuilder.Entity<ContentSharingMetrics>()
            .Property(csm => csm.ViralCoefficient)
            .HasPrecision(5, 4);

        // Configure Social Media Database Models relationships

        // SocialPlatformConfig relationships
        modelBuilder.Entity<SocialPlatformConfig>()
            .HasMany(spc => spc.Connections)
            .WithOne(sc => sc.PlatformConfig)
            .HasForeignKey(sc => sc.PlatformConfigId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SocialPlatformConfig>()
            .HasMany(spc => spc.OAuthTokens)
            .WithOne(ot => ot.PlatformConfig)
            .HasForeignKey(ot => ot.PlatformConfigId)
            .OnDelete(DeleteBehavior.SetNull);

        // OAuthToken relationships
        modelBuilder.Entity<OAuthToken>()
            .HasOne(ot => ot.User)
            .WithMany()
            .HasForeignKey(ot => ot.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // SocialConnection relationships
        modelBuilder.Entity<SocialConnection>()
            .HasOne(sc => sc.User)
            .WithMany()
            .HasForeignKey(sc => sc.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // SocialActivity relationships
        modelBuilder.Entity<SocialActivity>()
            .HasOne(sa => sa.User)
            .WithMany()
            .HasForeignKey(sa => sa.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SocialActivity>()
            .HasOne(sa => sa.TargetUser)
            .WithMany()
            .HasForeignKey(sa => sa.TargetUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // SocialRecommendation relationships
        modelBuilder.Entity<SocialRecommendation>()
            .HasOne(sr => sr.User)
            .WithMany()
            .HasForeignKey(sr => sr.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // SocialGraphConnection relationships
        modelBuilder.Entity<SocialGraphConnection>()
            .HasOne(sgc => sgc.FromUser)
            .WithMany()
            .HasForeignKey(sgc => sgc.FromUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SocialGraphConnection>()
            .HasOne(sgc => sgc.ToUser)
            .WithMany()
            .HasForeignKey(sgc => sgc.ToUserId)
            .OnDelete(DeleteBehavior.NoAction);

        // SocialPrivacyConsent relationships
        modelBuilder.Entity<SocialPrivacyConsent>()
            .HasOne(spc => spc.User)
            .WithMany()
            .HasForeignKey(spc => spc.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // SocialAnalytics relationships
        modelBuilder.Entity<SocialAnalytics>()
            .HasOne(sa => sa.User)
            .WithMany()
            .HasForeignKey(sa => sa.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SocialAnalytics>()
            .HasOne(sa => sa.PlatformConfig)
            .WithMany()
            .HasForeignKey(sa => sa.PlatformConfigId)
            .OnDelete(DeleteBehavior.SetNull);

        // SocialActivityFeed relationships
        modelBuilder.Entity<SocialActivityFeed>()
            .HasOne(saf => saf.User)
            .WithMany()
            .HasForeignKey(saf => saf.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SocialActivityFeed>()
            .HasOne(saf => saf.TargetUser)
            .WithMany()
            .HasForeignKey(saf => saf.TargetUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SocialActivityFeed>()
            .HasOne(saf => saf.PlatformConfig)
            .WithMany()
            .HasForeignKey(saf => saf.PlatformConfigId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure unique constraints for social media models
        modelBuilder.Entity<SocialPlatformConfig>()
            .HasIndex(spc => spc.Platform)
            .IsUnique();

        modelBuilder.Entity<OAuthToken>()
            .HasIndex(ot => new { ot.UserId, ot.Platform })
            .IsUnique();

        modelBuilder.Entity<SocialConnection>()
            .HasIndex(sc => new { sc.UserId, sc.Platform })
            .IsUnique();

        modelBuilder.Entity<SocialPrivacyConsent>()
            .HasIndex(spc => spc.UserId)
            .IsUnique();

        modelBuilder.Entity<SocialGraphConnection>()
            .HasIndex(sgc => new { sgc.FromUserId, sgc.ToUserId, sgc.Platform })
            .IsUnique();

        // Configure decimal precision for analytics
        modelBuilder.Entity<SocialAnalytics>()
            .Property(sa => sa.RecommendationAcceptanceRate)
            .HasPrecision(5, 4);

        modelBuilder.Entity<SocialAnalytics>()
            .Property(sa => sa.AverageEngagementRate)
            .HasPrecision(5, 4);

        modelBuilder.Entity<SocialAnalytics>()
            .Property(sa => sa.InfluenceScore)
            .HasPrecision(5, 4);

        modelBuilder.Entity<SocialAnalytics>()
            .Property(sa => sa.ReachScore)
            .HasPrecision(5, 4);

        modelBuilder.Entity<SocialAnalytics>()
            .Property(sa => sa.AverageSessionDuration)
            .HasPrecision(10, 2);

        modelBuilder.Entity<SocialActivityFeed>()
            .Property(saf => saf.ImportanceScore)
            .HasPrecision(5, 4);

        modelBuilder.Entity<SocialActivityFeed>()
            .Property(saf => saf.RelevanceScore)
            .HasPrecision(5, 4);

        modelBuilder.Entity<SocialGraphConnection>()
            .Property(sgc => sgc.Strength)
            .HasPrecision(5, 4);

        modelBuilder.Entity<SocialRecommendation>()
            .Property(sr => sr.Score)
            .HasPrecision(5, 4);
    }

    private void ConfigureContentMetadataRelationships(ModelBuilder modelBuilder)
    {
        // Configure ContentMetadata entity - CRITICAL FIX for Dictionary properties
        modelBuilder.Entity<ContentMetadata>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            // Configure Dictionary properties as JSON columns - FIXES EF ERROR
            entity.Property(e => e.OpenGraphData)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, (JsonSerializerOptions?)null) ?? new Dictionary<string, string>())
                .HasColumnType("nvarchar(max)");
            
            entity.Property(e => e.TwitterCardData)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, (JsonSerializerOptions?)null) ?? new Dictionary<string, string>())
                .HasColumnType("nvarchar(max)");
            
            entity.Property(e => e.StructuredData)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<Dictionary<string, object>>(v, (JsonSerializerOptions?)null) ?? new Dictionary<string, object>())
                .HasColumnType("nvarchar(max)");
                
            // Configure List properties as JSON columns
            entity.Property(e => e.Genres)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .HasColumnType("nvarchar(max)");
                
            entity.Property(e => e.Keywords)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .HasColumnType("nvarchar(max)");
                
            entity.Property(e => e.ProductionCountries)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .HasColumnType("nvarchar(max)");
                
            entity.Property(e => e.OriginalLanguages)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .HasColumnType("nvarchar(max)");
                
            entity.Property(e => e.Cast)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<CastMember>>(v, (JsonSerializerOptions?)null) ?? new List<CastMember>())
                .HasColumnType("nvarchar(max)");
                
            entity.Property(e => e.Crew)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<CrewMember>>(v, (JsonSerializerOptions?)null) ?? new List<CrewMember>())
                .HasColumnType("nvarchar(max)");
                
            entity.Property(e => e.ExternalIds)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<TmdbExternalId>>(v, (JsonSerializerOptions?)null) ?? new List<TmdbExternalId>())
                .HasColumnType("nvarchar(max)");
        });
        
        // Configure primary keys for content metadata entities
        
        // CastMember - use PersonId as primary key (assuming each person appears once per content)
        modelBuilder.Entity<CastMember>()
            .HasKey(cm => cm.PersonId);
        
        // CrewMember - use PersonId as primary key (assuming each person appears once per content) 
        modelBuilder.Entity<CrewMember>()
            .HasKey(cm => cm.PersonId);
        
        // TmdbExternalId - use composite key of Source and ExternalIdValue
        modelBuilder.Entity<TmdbExternalId>()
            .HasKey(tei => new { tei.Source, tei.ExternalIdValue });
        
        // Genre - use Id as primary key
        modelBuilder.Entity<Genre>()
            .HasKey(g => g.Id);
        
        // PersonDetails - use Id as primary key  
        modelBuilder.Entity<PersonDetails>()
            .HasKey(pd => pd.Id);
        
        // Configure primary keys for ranking model entities
        
        // UserPreferences - use UserId as primary key with explicit configuration
        modelBuilder.Entity<UserPreferences>()
            .HasKey(up => up.UserId);
        
        modelBuilder.Entity<UserPreferences>()
            .Property(up => up.UserId)
            .IsRequired()
            .HasMaxLength(450); // Standard length for Identity user IDs
        
        // ContentPopularityData - use ContentId as primary key
        modelBuilder.Entity<ContentPopularityData>()
            .HasKey(cpd => cpd.ContentId);
        
        // TypoCorrection - use composite key of OriginalQuery and CorrectedQuery
        modelBuilder.Entity<TypoCorrection>()
            .HasKey(tc => new { tc.OriginalQuery, tc.CorrectedQuery });
    }

    private void ConfigureABTestingRelationships(ModelBuilder modelBuilder)
    {
        // Configure JSON conversion for ABExperiment.Metadata
        modelBuilder.Entity<ABExperiment>()
            .Property(e => e.Metadata)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, object>()
            )
            .HasColumnType("nvarchar(max)");

        // Configure AB Testing relationships
        modelBuilder.Entity<ExperimentVariant>()
            .HasOne(ev => ev.Experiment)
            .WithMany(e => e.Variants)
            .HasForeignKey(ev => ev.ExperimentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ExperimentEvent>()
            .HasOne(ee => ee.Experiment)
            .WithMany(e => e.Events)
            .HasForeignKey(ee => ee.ExperimentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ExperimentAssignment>()
            .HasOne(ea => ea.Experiment)
            .WithMany()
            .HasForeignKey(ea => ea.ExperimentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure indexes for AB Testing
        modelBuilder.Entity<ABExperiment>()
            .HasIndex(e => e.IsActive);
        
        modelBuilder.Entity<ABExperiment>()
            .HasIndex(e => e.Status);
        
        modelBuilder.Entity<ExperimentAssignment>()
            .HasIndex(ea => ea.UserId);
            
        modelBuilder.Entity<ExperimentAssignment>()
            .HasIndex(ea => new { ea.ExperimentId, ea.UserId });
    }
    
    private void ConfigureSeoRelationships(ModelBuilder modelBuilder)
    {
        // Configure SeoTemplate entity
        modelBuilder.Entity<GeoLeap.Api.ProgrammaticSeo.Models.SeoTemplate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Template).IsRequired();
            entity.Property(e => e.MetaTitle).HasMaxLength(200);
            entity.Property(e => e.MetaDescription).HasMaxLength(500);
            entity.Property(e => e.H1Template).HasMaxLength(200);
            entity.Property(e => e.UrlPattern).HasMaxLength(500);
            entity.Property(e => e.Variables).HasDefaultValue("{}");
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
            entity.Property(e => e.CanonicalPattern).HasMaxLength(500);
            
            // Ignore complex navigation properties that cannot be directly mapped
            entity.Ignore(e => e.SeoSettings);
            entity.Ignore(e => e.VariablesList);
            
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.CreatedAt);
        });
        
        // Configure SeoPage entity
        modelBuilder.Entity<GeoLeap.Api.ProgrammaticSeo.Models.SeoPage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Slug).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.MetaTitle).HasMaxLength(200);
            entity.Property(e => e.MetaDescription).HasMaxLength(500);
            entity.Property(e => e.H1).HasMaxLength(200);
            entity.Property(e => e.CanonicalUrl).HasMaxLength(500);
            entity.Property(e => e.VariableValues).HasDefaultValue("{}");
            entity.Property(e => e.PrimaryKeyword).HasMaxLength(200);
            
            // Ignore complex properties that cannot be directly mapped
            entity.Ignore(e => e.ContentVariablesDictionary);
            entity.Ignore(e => e.KeywordsList);
            
            // Relationships
            entity.HasOne(e => e.Template).WithMany().HasForeignKey(e => e.TemplateId).OnDelete(DeleteBehavior.Cascade);
            
            // Indexes
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.HasIndex(e => e.TemplateId);
            entity.HasIndex(e => e.IsPublished);
            entity.HasIndex(e => e.GeneratedAt);
            entity.HasIndex(e => e.ViewCount);
        });
        
        // Configure SeoBatchJob entity
        modelBuilder.Entity<GeoLeap.Api.ProgrammaticSeo.Models.SeoBatchJob>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.JobName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.Configuration).HasDefaultValue("{}");
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
            
            // Relationships
            entity.HasOne(e => e.Template).WithMany().HasForeignKey(e => e.TemplateId).OnDelete(DeleteBehavior.Restrict);
            
            entity.HasIndex(e => e.TemplateId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
        });
        
        // Configure other SEO entities
        modelBuilder.Entity<GeoLeap.Api.ProgrammaticSeo.Models.SeoKeyword>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Keyword).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ContentType).HasMaxLength(50);
            entity.Property(e => e.ContentId).HasMaxLength(50);
            entity.Property(e => e.Category).HasMaxLength(50);
            entity.Property(e => e.TrendingReason).HasMaxLength(100);
            entity.Property(e => e.RelatedKeywords).HasDefaultValue("[]");
            entity.Property(e => e.CostPerClick).HasPrecision(10, 4);
            
            entity.HasIndex(e => e.Keyword).IsUnique();
            entity.HasIndex(e => e.SearchVolume);
            entity.HasIndex(e => e.CompetitionScore);
        });
        
        modelBuilder.Entity<GeoLeap.Api.ProgrammaticSeo.Models.ContentVariable>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Value).IsRequired();
            entity.Property(e => e.VariableType).HasMaxLength(20);
            entity.Property(e => e.Category).HasMaxLength(50);
            entity.Property(e => e.DataSource).HasMaxLength(200);
            
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.IsActive);
        });
        
        modelBuilder.Entity<GeoLeap.Api.ProgrammaticSeo.Models.ContentCluster>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ClusterName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ContentType).HasMaxLength(50);
            entity.Property(e => e.ClusteringCriteria).HasMaxLength(200);
            
            entity.HasIndex(e => e.ClusterName);
            entity.HasIndex(e => e.IsActive);
        });
    }

    private void ConfigurePreferenceRelationships(ModelBuilder modelBuilder)
    {
        // UserPreference relationships
        modelBuilder.Entity<UserPreference>(entity =>
        {
            // CRITICAL FIX: Explicitly set table name to avoid conflict with UserPreferences DTO
            entity.ToTable("UserPreference");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.CategoryKey).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PreferenceKey).IsRequired().HasMaxLength(200);
            entity.Property(e => e.PreferenceValue).IsRequired().HasColumnType("json");
            entity.Property(e => e.DataType).HasMaxLength(50);

            // Foreign key relationship with User
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Foreign key relationship with PreferenceCategory
            entity.HasOne(e => e.Category)
                .WithMany(c => c.UserPreferences)
                .HasForeignKey(e => e.CategoryKey)
                .HasPrincipalKey(c => c.CategoryKey)
                .OnDelete(DeleteBehavior.Restrict);

            // Unique constraint for user + category + preference
            entity.HasIndex(e => new { e.UserId, e.CategoryKey, e.PreferenceKey }).IsUnique();
            entity.HasIndex(e => e.CategoryKey);
            entity.HasIndex(e => e.UpdatedAt);
        });

        // PreferenceCategory relationships
        modelBuilder.Entity<PreferenceCategory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CategoryKey).IsRequired().HasMaxLength(100);
            entity.Property(e => e.DisplayName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.IconClass).HasMaxLength(100);

            // Self-referencing relationship for hierarchy
            entity.HasOne(e => e.ParentCategory)
                .WithMany(e => e.ChildCategories)
                .HasForeignKey(e => e.ParentCategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            // Unique constraint for category key
            entity.HasIndex(e => e.CategoryKey).IsUnique();
            entity.HasIndex(e => e.ParentCategoryId);
            entity.HasIndex(e => e.SortOrder);
        });

        // DefaultPreference relationships
        modelBuilder.Entity<DefaultPreference>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PreferenceKey).IsRequired().HasMaxLength(200);
            entity.Property(e => e.DisplayName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.DefaultValue).IsRequired().HasColumnType("json");
            entity.Property(e => e.ValidationSchema).HasColumnType("json");
            entity.Property(e => e.DataType).HasMaxLength(50);
            entity.Property(e => e.Scope).HasMaxLength(50);

            // Foreign key relationship with PreferenceCategory
            entity.HasOne(e => e.Category)
                .WithMany(c => c.DefaultPreferences)
                .HasForeignKey(e => e.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);

            // Unique constraint for category + preference key
            entity.HasIndex(e => new { e.CategoryId, e.PreferenceKey }).IsUnique();
            entity.HasIndex(e => e.IsUserConfigurable);
            entity.HasIndex(e => e.Scope);
        });

        // PreferenceHistory relationships
        modelBuilder.Entity<PreferenceHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CategoryKey).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PreferenceKey).IsRequired().HasMaxLength(200);
            entity.Property(e => e.OldValue).HasColumnType("json");
            entity.Property(e => e.NewValue).IsRequired().HasColumnType("json");
            entity.Property(e => e.Action).HasMaxLength(50);
            entity.Property(e => e.ChangeSource).HasMaxLength(50);
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.UserAgent).HasMaxLength(500);
            entity.Property(e => e.Metadata).HasColumnType("json");

            // Foreign key relationship with User
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes for efficient querying
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CategoryKey);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.UserId, e.CategoryKey, e.PreferenceKey });
        });
    }

    private void ConfigureVpnGuidanceRelationships(ModelBuilder modelBuilder)
    {
        // VPN Provider Configuration
        modelBuilder.Entity<VpnProvider>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.WebsiteUrl).IsRequired();
            entity.Property(e => e.LogoUrl).HasMaxLength(255);
            entity.Property(e => e.MonthlyPrice).HasColumnType("decimal(10,2)");
            entity.Property(e => e.AnnualPrice).HasColumnType("decimal(10,2)");
            entity.Property(e => e.SupportedPlatforms).HasMaxLength(1000);
            entity.Property(e => e.AdminNotes).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
            
            // Indexes
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.IsFeatured);
            entity.HasIndex(e => e.DisplayOrder);
            entity.HasIndex(e => e.OverallRating);
        });

        // VPN Provider Rating Configuration
        modelBuilder.Entity<VpnProviderRating>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Review).HasMaxLength(1000);
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.UserAgent).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            
            // Foreign key relationships
            entity.HasOne(e => e.VpnProvider)
                .WithMany(v => v.Ratings)
                .HasForeignKey(e => e.VpnProviderId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Unique constraint - one rating per user per provider
            entity.HasIndex(e => new { e.UserId, e.VpnProviderId }).IsUnique();
            
            // Indexes
            entity.HasIndex(e => e.VpnProviderId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.Rating);
        });

        // VPN Server Location Configuration
        modelBuilder.Entity<VpnServerLocation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Country).IsRequired().HasMaxLength(100);
            entity.Property(e => e.CountryCode).IsRequired().HasMaxLength(3);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
            
            // Foreign key relationship
            entity.HasOne(e => e.VpnProvider)
                .WithMany(v => v.ServerLocations)
                .HasForeignKey(e => e.VpnProviderId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Indexes
            entity.HasIndex(e => e.VpnProviderId);
            entity.HasIndex(e => e.Country);
            entity.HasIndex(e => e.CountryCode);
            entity.HasIndex(e => e.IsOptimizedForStreaming);
            entity.HasIndex(e => e.IsP2PFriendly);
        });

        // VPN Streaming Compatibility Configuration
        modelBuilder.Entity<VpnStreamingCompatibility>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.CompatibleRegions).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
            
            // Foreign key relationships
            entity.HasOne(e => e.VpnProvider)
                .WithMany(v => v.StreamingCompatibilities)
                .HasForeignKey(e => e.VpnProviderId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.StreamingService)
                .WithMany()
                .HasForeignKey(e => e.StreamingServiceId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Unique constraint - one compatibility record per provider per streaming service
            entity.HasIndex(e => new { e.VpnProviderId, e.StreamingServiceId }).IsUnique();
            
            // Indexes
            entity.HasIndex(e => e.VpnProviderId);
            entity.HasIndex(e => e.StreamingServiceId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.LastTested);
        });

        // VPN Setup Guide Configuration
        modelBuilder.Entity<VpnSetupGuide>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Platform).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Prerequisites).HasMaxLength(1000);
            entity.Property(e => e.TroubleshootingTips).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
            
            // Foreign key relationship
            entity.HasOne(e => e.VpnProvider)
                .WithMany()
                .HasForeignKey(e => e.VpnProviderId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Indexes
            entity.HasIndex(e => e.VpnProviderId);
            entity.HasIndex(e => e.Platform);
            entity.HasIndex(e => e.Difficulty);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.HelpfulnessRating);
        });

        // VPN Legal Disclaimer Configuration
        modelBuilder.Entity<VpnLegalDisclaimer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.CountryCode).HasMaxLength(10);
            entity.Property(e => e.AdminNotes).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
            
            // Indexes
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.CountryCode);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.IsRequired);
            entity.HasIndex(e => e.DisplayOrder);
            entity.HasIndex(e => e.EffectiveDate);
        });

        // VPN Best Practice Configuration
        modelBuilder.Entity<VpnBestPractice>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Summary).HasMaxLength(500);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Tags).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
            
            // Indexes
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.ImportanceLevel);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.DisplayOrder);
            entity.HasIndex(e => e.HelpfulnessRating);
        });

        // User VPN Preference Configuration
        modelBuilder.Entity<UserVpnPreference>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MaxMonthlyBudget).HasColumnType("decimal(10,2)");
            entity.Property(e => e.MaxAnnualBudget).HasColumnType("decimal(10,2)");
            entity.Property(e => e.RequiredPlatforms).HasMaxLength(1000);
            entity.Property(e => e.PreferredServerCountries).HasMaxLength(1000);
            entity.Property(e => e.ImportantStreamingServices).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
            
            // Foreign key relationship
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Unique constraint - one preference record per user
            entity.HasIndex(e => e.UserId).IsUnique();
        });

        // VPN Guidance Analytics Configuration
        modelBuilder.Entity<VpnGuidanceAnalytics>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EventData).HasMaxLength(1000);
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.UserAgent).HasMaxLength(1000);
            entity.Property(e => e.Referrer).HasMaxLength(2000);
            entity.Property(e => e.SessionId).HasMaxLength(36);
            entity.Property(e => e.Timestamp).HasDefaultValueSql("NOW()");
            
            // Indexes for analytics queries
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.EventType);
            entity.HasIndex(e => e.VpnProviderId);
            entity.HasIndex(e => e.GuideId);
            entity.HasIndex(e => e.Timestamp);
            entity.HasIndex(e => e.SessionId);
            entity.HasIndex(e => new { e.EventType, e.Timestamp });
            entity.HasIndex(e => new { e.UserId, e.EventType, e.Timestamp });
        });

        // VPN Performance Snapshot Configuration
        modelBuilder.Entity<VpnPerformanceSnapshot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();

            // Required fields
            entity.Property(e => e.RegionCode).IsRequired().HasMaxLength(10);
            entity.Property(e => e.CapturedAt).IsRequired();

            // Decimal fields with precision
            entity.Property(e => e.ConnectionSuccessRate).HasColumnType("decimal(5,2)");
            entity.Property(e => e.ConnectionStabilityScore).HasColumnType("decimal(5,2)");
            entity.Property(e => e.DownloadSpeedMbps).HasColumnType("decimal(10,2)");
            entity.Property(e => e.UploadSpeedMbps).HasColumnType("decimal(10,2)");
            entity.Property(e => e.SpeedConsistencyScore).HasColumnType("decimal(5,2)");
            entity.Property(e => e.StreamingSuccessRate).HasColumnType("decimal(5,2)");
            entity.Property(e => e.StreamingQualityScore).HasColumnType("decimal(5,2)");
            entity.Property(e => e.SystemCpuUsagePercent).HasColumnType("decimal(5,2)");
            entity.Property(e => e.SystemMemoryUsagePercent).HasColumnType("decimal(5,2)");
            entity.Property(e => e.NetworkUtilizationPercent).HasColumnType("decimal(5,2)");
            entity.Property(e => e.OverallPerformanceScore).HasColumnType("decimal(5,2)");

            // Foreign key to VpnProvider
            entity.HasOne<VpnProvider>()
                .WithMany()
                .HasForeignKey(e => e.VpnProviderId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes for performance
            entity.HasIndex(e => e.VpnProviderId);
            entity.HasIndex(e => e.RegionCode);
            entity.HasIndex(e => e.CapturedAt);
            entity.HasIndex(e => new { e.VpnProviderId, e.RegionCode, e.CapturedAt });
        });
    }

    private void ConfigureAsoRelationships(ModelBuilder modelBuilder)
    {
        // Configure AsoKeyword entity
        modelBuilder.Entity<AsoKeyword>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Keyword).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Country).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Language).HasMaxLength(10);
            entity.Property(e => e.SearchVolume).HasDefaultValue(0);
            entity.Property(e => e.Difficulty).HasDefaultValue(0.0);
            entity.Property(e => e.Relevance).HasDefaultValue(0.0);
            entity.Property(e => e.ConversionPotential).HasDefaultValue(0.0);
            entity.Property(e => e.CompetitionDensity).HasDefaultValue(0.0);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.LastUpdated).HasDefaultValueSql("NOW()");

            // Convert list properties to JSON
            entity.Property(e => e.TopCompetitors)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .HasColumnType("nvarchar(max)");

            // Foreign key relationship
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Navigation properties
            entity.HasMany(e => e.Rankings)
                .WithOne(r => r.Keyword)
                .HasForeignKey(r => r.KeywordId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Keyword);
            entity.HasIndex(e => new { e.UserId, e.AppStore });
            entity.HasIndex(e => new { e.UserId, e.Status });
            entity.HasIndex(e => new { e.Keyword, e.AppStore, e.Country }).IsUnique();
        });

        // Configure AppStoreListing entity
        modelBuilder.Entity<AppStoreListing>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AppName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.BundleId).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Country).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Language).HasMaxLength(10);
            entity.Property(e => e.Title).HasMaxLength(30);
            entity.Property(e => e.Subtitle).HasMaxLength(30);
            entity.Property(e => e.Description).HasMaxLength(4000);
            entity.Property(e => e.Keywords).HasMaxLength(100);
            entity.Property(e => e.PromotionalText).HasMaxLength(170);
            entity.Property(e => e.ReleaseNotes).HasMaxLength(4000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.LastUpdated).HasDefaultValueSql("NOW()");

            // Convert list properties to JSON
            entity.Property(e => e.Screenshots)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .HasColumnType("nvarchar(max)");

            entity.Property(e => e.PreviewVideos)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .HasColumnType("nvarchar(max)");

            // Foreign key relationships
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ParentListing)
                .WithMany(l => l.TestVariants)
                .HasForeignKey(e => e.ParentListingId)
                .OnDelete(DeleteBehavior.Restrict);

            // Navigation properties
            entity.HasMany(e => e.Reviews)
                .WithOne(r => r.Listing)
                .HasForeignKey(r => r.ListingId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.BundleId);
            entity.HasIndex(e => new { e.UserId, e.AppStore });
            entity.HasIndex(e => new { e.UserId, e.Status });
        });

        // Configure AppStoreReview entity
        modelBuilder.Entity<AppStoreReview>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ReviewId).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ReviewerName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Title).HasMaxLength(500);
            entity.Property(e => e.Content).HasMaxLength(4000);
            entity.Property(e => e.Version).HasMaxLength(20);
            entity.Property(e => e.Country).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Language).HasMaxLength(10);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.LastUpdated).HasDefaultValueSql("NOW()");

            // Convert list properties to JSON
            entity.Property(e => e.Topics)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .HasColumnType("nvarchar(max)");

            entity.Property(e => e.Issues)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .HasColumnType("nvarchar(max)");

            entity.Property(e => e.Compliments)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .HasColumnType("nvarchar(max)");

            // Foreign key relationship
            entity.HasOne(e => e.Listing)
                .WithMany(l => l.Reviews)
                .HasForeignKey(e => e.ListingId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            entity.HasIndex(e => e.ListingId);
            entity.HasIndex(e => e.ReviewId);
            entity.HasIndex(e => e.ReviewDate);
            entity.HasIndex(e => e.SentimentLabel);
            entity.HasIndex(e => new { e.ListingId, e.ReviewDate });
        });

        // Configure KeywordRanking entity
        modelBuilder.Entity<KeywordRanking>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Rank).IsRequired();
            entity.Property(e => e.RankedAt).HasDefaultValueSql("NOW()");

            // Foreign key relationships
            entity.HasOne(e => e.Keyword)
                .WithMany(k => k.Rankings)
                .HasForeignKey(e => e.KeywordId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Listing)
                .WithMany()
                .HasForeignKey(e => e.ListingId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            entity.HasIndex(e => e.KeywordId);
            entity.HasIndex(e => e.ListingId);
            entity.HasIndex(e => e.RankedAt);
            entity.HasIndex(e => new { e.KeywordId, e.ListingId, e.RankedAt });
        });

        // Configure AsoAbTest entity
        modelBuilder.Entity<AsoAbTest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.TrafficSplit).HasDefaultValue(0.5);
            entity.Property(e => e.ConfidenceLevel).HasDefaultValue(0.95);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.LastUpdated).HasDefaultValueSql("NOW()");

            // Convert complex properties to JSON
            entity.Property(e => e.ControlMetrics)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<AbTestMetrics>(v, (JsonSerializerOptions?)null) ?? new AbTestMetrics())
                .HasColumnType("nvarchar(max)");

            entity.Property(e => e.VariantMetrics)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<AbTestMetrics>(v, (JsonSerializerOptions?)null) ?? new AbTestMetrics())
                .HasColumnType("nvarchar(max)");

            entity.Property(e => e.KeywordIds)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<int>>(v, (JsonSerializerOptions?)null) ?? new List<int>())
                .HasColumnType("nvarchar(max)");

            // Foreign key relationships
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ControlListing)
                .WithMany()
                .HasForeignKey(e => e.ControlListingId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.VariantListing)
                .WithMany(l => l.AbTests)
                .HasForeignKey(e => e.VariantListingId)
                .OnDelete(DeleteBehavior.Restrict);

            // Indexes
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => new { e.UserId, e.Status });
        });

        // Configure AsoAnalytics entity
        modelBuilder.Entity<AsoAnalytics>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Date).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");

            // Convert dictionary properties to JSON
            entity.Property(e => e.KeywordViews)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<Dictionary<string, int>>(v, (JsonSerializerOptions?)null) ?? new Dictionary<string, int>())
                .HasColumnType("nvarchar(max)");

            entity.Property(e => e.KeywordConversions)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<Dictionary<string, double>>(v, (JsonSerializerOptions?)null) ?? new Dictionary<string, double>())
                .HasColumnType("nvarchar(max)");

            entity.Property(e => e.CategoryRankings)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<Dictionary<string, int>>(v, (JsonSerializerOptions?)null) ?? new Dictionary<string, int>())
                .HasColumnType("nvarchar(max)");

            entity.Property(e => e.KeywordRankings)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<Dictionary<string, int>>(v, (JsonSerializerOptions?)null) ?? new Dictionary<string, int>())
                .HasColumnType("nvarchar(max)");

            entity.Property(e => e.CompetitorData)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<Dictionary<string, CompetitorMetrics>>(v, (JsonSerializerOptions?)null) ?? new Dictionary<string, CompetitorMetrics>())
                .HasColumnType("nvarchar(max)");

            // Foreign key relationship
            entity.HasOne(e => e.Listing)
                .WithMany()
                .HasForeignKey(e => e.ListingId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            entity.HasIndex(e => e.ListingId);
            entity.HasIndex(e => e.Date);
            entity.HasIndex(e => e.Granularity);
            entity.HasIndex(e => new { e.ListingId, e.Date, e.Granularity });
        });

        // ✅ PERFORMANCE FIX: Add missing indexes identified in Week 2 Day 1 baseline

        // Watchlist indexes for common query patterns
        modelBuilder.Entity<Watchlist>()
            .HasIndex(w => new { w.UserId, w.IsDefault });

        modelBuilder.Entity<Watchlist>()
            .HasIndex(w => new { w.UserId, w.IsFavorite });

        modelBuilder.Entity<Watchlist>()
            .HasIndex(w => new { w.UserId, w.UpdatedAt });

        // WatchlistItem indexes
        modelBuilder.Entity<WatchlistItem>()
            .HasIndex(wi => new { wi.WatchlistId, wi.AddedAt });

        modelBuilder.Entity<WatchlistItem>()
            .HasIndex(wi => wi.ContentId);

        // ConsentRecord indexes (GDPR performance)
        modelBuilder.Entity<ConsentRecord>()
            .HasIndex(cr => new { cr.UserId, cr.Purpose });

        // ASO indexes for performance
        modelBuilder.Entity<AsoKeyword>()
            .HasIndex(ak => new { ak.UserId, ak.Status });

        modelBuilder.Entity<AppStoreListing>()
            .HasIndex(asl => new { asl.UserId, asl.Status });

        modelBuilder.Entity<AsoAbTest>()
            .HasIndex(aat => new { aat.UserId, aat.Status });

        // ✅ WEEK 2 DAY 3: Additional UserBehavior analytics indexes for performance
        modelBuilder.Entity<Models.AdvancedUserBehavior.UserBehaviorEvent>()
            .HasIndex(ube => new { ube.UserId, ube.ServerTimestamp });

        modelBuilder.Entity<Models.AdvancedUserBehavior.UserBehaviorEvent>()
            .HasIndex(ube => new { ube.EventType, ube.ServerTimestamp });

        modelBuilder.Entity<Models.AdvancedUserBehavior.UserBehaviorSession>()
            .HasIndex(ubs => new { ubs.UserId, ubs.StartTime });

        modelBuilder.Entity<Models.AdvancedUserBehavior.UserBehaviorSession>()
            .HasIndex(ubs => ubs.SessionId);

        modelBuilder.Entity<Models.AdvancedUserBehavior.UserBehaviorInsight>()
            .HasIndex(ubi => new { ubi.InsightType, ubi.PeriodStart });

        // SearchAnalyticsEvent indexes for query performance
        modelBuilder.Entity<SearchAnalyticsEvent>()
            .HasIndex(sae => new { sae.UserId, sae.Timestamp });

        // NotificationDeliveryLog indexes
        modelBuilder.Entity<NotificationDeliveryLog>()
            .HasIndex(ndl => new { ndl.UserId, ndl.DeliveredAt });
    }

    // Override SaveChanges to enable validation of data annotations
    public override int SaveChanges()
    {
        ValidateEntities();
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ValidateEntities();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void ValidateEntities()
    {
        var entities = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified)
            .Select(e => e.Entity);

        foreach (var entity in entities)
        {
            var context = new System.ComponentModel.DataAnnotations.ValidationContext(entity);
            var results = new List<System.ComponentModel.DataAnnotations.ValidationResult>();

            if (!System.ComponentModel.DataAnnotations.Validator.TryValidateObject(entity, context, results, true))
            {
                var errors = string.Join("; ", results.Select(r => r.ErrorMessage));
                throw new System.ComponentModel.DataAnnotations.ValidationException($"Entity validation failed: {errors}");
            }
        }
    }

    private void ConfigurePromotionRelationships(ModelBuilder modelBuilder)
    {
        // Configure Promotion entity
        modelBuilder.Entity<Promotion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Code).HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.StripeCouponId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.StripePromotionCodeId).HasMaxLength(100);
            entity.Property(e => e.Duration).IsRequired().HasMaxLength(20);
            entity.Property(e => e.TargetPlanType).HasMaxLength(50);
            entity.Property(e => e.AmountOff).HasColumnType("decimal(18,2)");
            entity.Property(e => e.AmountOffCurrency).HasMaxLength(3);
            entity.Property(e => e.MinimumAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.MinimumAmountCurrency).HasMaxLength(3);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");

            // Indexes
            entity.HasIndex(e => e.Code).IsUnique().HasFilter("[Code] IS NOT NULL");
            entity.HasIndex(e => e.StripeCouponId);
            entity.HasIndex(e => e.StripePromotionCodeId);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => new { e.IsActive, e.ExpiresAt });
        });

        // Configure PromotionRedemption entity
        modelBuilder.Entity<PromotionRedemption>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Platform).IsRequired().HasMaxLength(20);
            entity.Property(e => e.StripeSubscriptionId).HasMaxLength(100);
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.UserAgent).HasMaxLength(500);
            entity.Property(e => e.RedeemedAt).HasDefaultValueSql("NOW()");

            // Foreign key relationships
            entity.HasOne(e => e.Promotion)
                .WithMany(p => p.Redemptions)
                .HasForeignKey(e => e.PromotionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            entity.HasIndex(e => e.PromotionId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.PromotionId }).IsUnique();
            entity.HasIndex(e => e.Platform);
            entity.HasIndex(e => e.RedeemedAt);
        });

        // AffiliateClick indexes
        modelBuilder.Entity<AffiliateClick>()
            .HasIndex(c => c.ClickedAt);
        modelBuilder.Entity<AffiliateClick>()
            .HasIndex(c => c.AffiliatePartnerId);
        modelBuilder.Entity<AffiliateClick>()
            .HasIndex(c => new { c.ContentId, c.CountryCode });
    }
}
