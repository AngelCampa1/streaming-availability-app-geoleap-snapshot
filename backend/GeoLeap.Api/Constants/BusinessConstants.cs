namespace GeoLeap.Api.Constants;

/// <summary>
/// Business logic constants and magic numbers centralized
/// </summary>
public static class BusinessConstants
{
    /// <summary>
    /// Pagination constants
    /// </summary>
    public static class Pagination
    {
        /// <summary>
        /// Default page size for list endpoints
        /// </summary>
        public const int DefaultPageSize = 20;

        /// <summary>
        /// Minimum allowed page size
        /// </summary>
        public const int MinPageSize = 1;

        /// <summary>
        /// Maximum allowed page size to prevent excessive data retrieval
        /// </summary>
        public const int MaxPageSize = 100;

        /// <summary>
        /// Default batch size for background processing
        /// </summary>
        public const int DefaultBatchSize = 100;

        /// <summary>
        /// Maximum batch size for bulk operations
        /// </summary>
        public const int MaxBatchSize = 1000;
    }

    /// <summary>
    /// Time-related constants
    /// </summary>
    public static class Time
    {
        /// <summary>
        /// Token expiration time in minutes
        /// </summary>
        public const int TokenExpirationMinutes = 60;

        /// <summary>
        /// Refresh token expiration in days
        /// </summary>
        public const int RefreshTokenExpirationDays = 30;

        /// <summary>
        /// Password reset token expiration in hours
        /// </summary>
        public const int PasswordResetTokenExpirationHours = 24;

        /// <summary>
        /// Email verification token expiration in hours
        /// </summary>
        public const int EmailVerificationTokenExpirationHours = 48;

        /// <summary>
        /// Session timeout in minutes
        /// </summary>
        public const int SessionTimeoutMinutes = 30;

        /// <summary>
        /// Cache duration for static content in seconds
        /// </summary>
        public const int StaticContentCacheSeconds = 7200; // 2 hours

        /// <summary>
        /// Cache duration for dynamic content in seconds
        /// </summary>
        public const int DynamicContentCacheSeconds = 300; // 5 minutes
    }

    /// <summary>
    /// Data retention constants
    /// </summary>
    public static class DataRetention
    {
        /// <summary>
        /// Days to keep user activity logs
        /// </summary>
        public const int UserActivityLogRetentionDays = 90;

        /// <summary>
        /// Days to keep notification logs
        /// </summary>
        public const int NotificationLogRetentionDays = 30;

        /// <summary>
        /// Days to keep audit logs
        /// </summary>
        public const int AuditLogRetentionDays = 365;

        /// <summary>
        /// Days to keep temporary files
        /// </summary>
        public const int TempFileRetentionDays = 7;

        /// <summary>
        /// Days to keep deleted user data before permanent deletion
        /// </summary>
        public const int DeletedUserDataRetentionDays = 30;
    }

    /// <summary>
    /// Rate limiting constants
    /// </summary>
    public static class RateLimits
    {
        /// <summary>
        /// Maximum API requests per minute for authenticated users
        /// </summary>
        public const int AuthenticatedRequestsPerMinute = 60;

        /// <summary>
        /// Maximum API requests per minute for anonymous users
        /// </summary>
        public const int AnonymousRequestsPerMinute = 20;

        /// <summary>
        /// Maximum login attempts before lockout
        /// </summary>
        public const int MaxLoginAttempts = 5;

        /// <summary>
        /// Lockout duration in minutes after failed login attempts
        /// </summary>
        public const int LockoutDurationMinutes = 30;

        /// <summary>
        /// Maximum concurrent sessions per user
        /// </summary>
        public const int MaxConcurrentSessions = 5;
    }

    /// <summary>
    /// Content-related constants
    /// </summary>
    public static class Content
    {
        /// <summary>
        /// Maximum watchlist items per user
        /// </summary>
        public const int MaxWatchlistItemsPerUser = 500;

        /// <summary>
        /// Maximum number of watchlists per user
        /// </summary>
        public const int MaxWatchlistsPerUser = 50;

        /// <summary>
        /// Maximum search results to return
        /// </summary>
        public const int MaxSearchResults = 100;

        /// <summary>
        /// Maximum recommendations to return
        /// </summary>
        public const int MaxRecommendations = 50;

        /// <summary>
        /// Days to consider content as "new"
        /// </summary>
        public const int NewContentThresholdDays = 30;

        /// <summary>
        /// Minimum rating threshold for recommendations
        /// </summary>
        public const double MinRecommendationRating = 6.0;
    }

    /// <summary>
    /// Notification constants
    /// </summary>
    public static class Notifications
    {
        /// <summary>
        /// Maximum notifications to send per batch
        /// </summary>
        public const int MaxNotificationsPerBatch = 100;

        /// <summary>
        /// Maximum retry attempts for failed notifications
        /// </summary>
        public const int MaxNotificationRetries = 3;

        /// <summary>
        /// Delay between retry attempts in seconds
        /// </summary>
        public const int RetryDelaySeconds = 60;

        /// <summary>
        /// Maximum notification history to keep per user
        /// </summary>
        public const int MaxNotificationHistoryPerUser = 100;

        /// <summary>
        /// Days to keep unread notifications
        /// </summary>
        public const int UnreadNotificationRetentionDays = 30;
    }

    /// <summary>
    /// File upload constants
    /// </summary>
    public static class FileUpload
    {
        /// <summary>
        /// Maximum profile image size in bytes (5MB)
        /// </summary>
        public const long MaxProfileImageSizeBytes = 5 * 1024 * 1024;

        /// <summary>
        /// Maximum file upload size in bytes (10MB)
        /// </summary>
        public const long MaxFileUploadSizeBytes = 10 * 1024 * 1024;

        /// <summary>
        /// Allowed image file extensions
        /// </summary>
        public static readonly string[] AllowedImageExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp" };

        /// <summary>
        /// Allowed document file extensions
        /// </summary>
        public static readonly string[] AllowedDocumentExtensions = { ".pdf", ".doc", ".docx", ".txt" };
    }

    /// <summary>
    /// Search constants
    /// </summary>
    public static class Search
    {
        /// <summary>
        /// Minimum search query length
        /// </summary>
        public const int MinSearchQueryLength = 2;

        /// <summary>
        /// Maximum search query length
        /// </summary>
        public const int MaxSearchQueryLength = 200;

        /// <summary>
        /// Maximum search suggestions to return
        /// </summary>
        public const int MaxSearchSuggestions = 10;

        /// <summary>
        /// Maximum saved searches per user
        /// </summary>
        public const int MaxSavedSearchesPerUser = 20;

        /// <summary>
        /// Search query cache duration in seconds
        /// </summary>
        public const int SearchCacheDurationSeconds = 300; // 5 minutes
    }

    /// <summary>
    /// Social features constants
    /// </summary>
    public static class Social
    {
        /// <summary>
        /// Maximum followers per user
        /// </summary>
        public const int MaxFollowersPerUser = 10000;

        /// <summary>
        /// Maximum following per user
        /// </summary>
        public const int MaxFollowingPerUser = 1000;

        /// <summary>
        /// Maximum comment length
        /// </summary>
        public const int MaxCommentLength = 500;

        /// <summary>
        /// Maximum bio length
        /// </summary>
        public const int MaxBioLength = 500;

        /// <summary>
        /// Maximum display name length
        /// </summary>
        public const int MaxDisplayNameLength = 50;
    }

    /// <summary>
    /// Payment constants
    /// </summary>
    public static class Payment
    {
        /// <summary>
        /// Minimum payment amount
        /// </summary>
        public const decimal MinPaymentAmount = 0.50m;

        /// <summary>
        /// Maximum payment amount
        /// </summary>
        public const decimal MaxPaymentAmount = 10000m;

        /// <summary>
        /// Days before subscription renewal reminder
        /// </summary>
        public const int RenewalReminderDays = 7;

        /// <summary>
        /// Grace period days after payment failure
        /// </summary>
        public const int PaymentGracePeriodDays = 3;

        /// <summary>
        /// Maximum payment methods per user
        /// </summary>
        public const int MaxPaymentMethodsPerUser = 5;
    }

    /// <summary>
    /// Cache constants
    /// </summary>
    public static class Cache
    {
        /// <summary>
        /// Default cache duration in seconds
        /// </summary>
        public const int DefaultCacheDurationSeconds = 300; // 5 minutes

        /// <summary>
        /// Long cache duration in seconds
        /// </summary>
        public const int LongCacheDurationSeconds = 3600; // 1 hour

        /// <summary>
        /// Short cache duration in seconds
        /// </summary>
        public const int ShortCacheDurationSeconds = 60; // 1 minute

        /// <summary>
        /// Maximum cache size in bytes
        /// </summary>
        public const long MaxCacheSizeBytes = 100 * 1024 * 1024; // 100MB

        /// <summary>
        /// Cache compaction percentage
        /// </summary>
        public const double CacheCompactionPercentage = 0.25; // 25%
    }

    /// <summary>
    /// Performance thresholds
    /// </summary>
    public static class Performance
    {
        /// <summary>
        /// Maximum query execution time in milliseconds
        /// </summary>
        public const int MaxQueryExecutionTimeMs = 5000;

        /// <summary>
        /// Slow query threshold in milliseconds
        /// </summary>
        public const int SlowQueryThresholdMs = 1000;

        /// <summary>
        /// API response time SLA in milliseconds
        /// </summary>
        public const int ApiResponseTimeSlaMs = 500;

        /// <summary>
        /// Maximum concurrent database connections
        /// </summary>
        public const int MaxDatabaseConnections = 100;

        /// <summary>
        /// Connection pool minimum size
        /// </summary>
        public const int ConnectionPoolMinSize = 5;
    }

    /// <summary>
    /// Error handling constants
    /// </summary>
    public static class ErrorHandling
    {
        /// <summary>
        /// Maximum error message length
        /// </summary>
        public const int MaxErrorMessageLength = 1000;

        /// <summary>
        /// Maximum stack trace length to log
        /// </summary>
        public const int MaxStackTraceLength = 5000;

        /// <summary>
        /// Error log retention days
        /// </summary>
        public const int ErrorLogRetentionDays = 90;

        /// <summary>
        /// Maximum retry attempts for transient errors
        /// </summary>
        public const int MaxRetryAttempts = 3;

        /// <summary>
        /// Delay between retry attempts in milliseconds
        /// </summary>
        public const int RetryDelayMs = 1000;
    }
}
