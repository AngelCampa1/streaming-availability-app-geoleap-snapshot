using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace GeoLeap.Api.Models;

// Generic Pagination Model
public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public bool HasPrevious => PageNumber > 1;
    public bool HasNext => PageNumber < TotalPages;
}

// Business Metrics Models
public class BusinessMetricsResponse
{
    public DateTime Timestamp { get; set; }
    public BusinessKpis Kpis { get; set; } = new();
    public List<MetricTrend> Trends { get; set; } = new();
    public Dictionary<string, object> RealTimeMetrics { get; set; } = new();
    public List<BusinessAlert> Alerts { get; set; } = new();
}

public class BusinessKpis
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int TrialUsers { get; set; }
    public decimal MonthlyRecurringRevenue { get; set; }
    public decimal AverageRevenuePerUser { get; set; }
    public double ChurnRate { get; set; }
    public double ConversionRate { get; set; }
    public double CustomerSatisfactionScore { get; set; }
    public int SupportTickets { get; set; }
    public double SystemUptime { get; set; }
}

public class MetricTrend
{
    public string MetricName { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public double CurrentValue { get; set; }
    public double PreviousValue { get; set; }
    public double ChangePercentage { get; set; }
    public TrendDirection Direction { get; set; }
    public List<DataPoint> DataPoints { get; set; } = new();
}

public class DataPoint
{
    public DateTime Timestamp { get; set; }
    public double Value { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

// User Management Models
public record AdminUserSearchRequest
{
    public string? SearchTerm { get; set; }
    public string? Email { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsSuspended { get; set; }
    public bool? IsEmailVerified { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public DateTime? LastLoginAfter { get; set; }
    public DateTime? LastLoginBefore { get; set; }
    public string? SubscriptionStatus { get; set; }
    public string? PaymentStatus { get; set; }
    public bool? EmailConfirmed { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string SortBy { get; set; } = "CreatedAt";
    public string SortDirection { get; set; } = "desc";
    public bool SortDescending { get; set; } = false;
}

public class AdminUserSearchResponse
{
    public List<AdminUserSummary> Users { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public UserSearchFacets Facets { get; set; } = new();
}

// Essential Admin Models to fix compilation errors
public class AdminUserSummary
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? UserName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public bool IsActive { get; set; }
    public bool EmailConfirmed { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLogin { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public int FailedLoginAttempts { get; set; }
    public bool IsLockedOut { get; set; }
    public bool IsSuspended { get; set; }
    public DateTimeOffset? LockoutEnd { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime? SuspendedAt { get; set; }
    public string? SuspensionReason { get; set; }
    public string? Role { get; set; }
    public List<string> Roles { get; set; } = new();
    public string? SubscriptionStatus { get; set; }
}

public class AdminUserListRequest
{
    public string? Search { get; set; }
    public string? SearchTerm => Search; // Alias for compatibility
    public string? Email { get; set; }
    public bool? IsActive { get; set; }
    public bool? EmailConfirmed { get; set; }
    public bool? IsSuspended { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public DateTime? RegisteredFrom { get; set; }
    public DateTime? RegisteredTo { get; set; }
    public string? Role { get; set; }
    public string? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string SortBy { get; set; } = "CreatedAt";
    public string SortDirection { get; set; } = "desc";
    public bool SortDescending { get; set; } = true;
}

public class AdminUserListResponse
{
    public List<AdminUserSummary> Users { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

public class AdminUserDetail : AdminUserSummary
{
    public string? PhoneNumber { get; set; }
    public bool PhoneNumberConfirmed { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public new List<string> Roles { get; set; } = new();
    public Dictionary<string, object> Profile { get; set; } = new();
    public List<UserActivity> RecentActivity { get; set; } = new();
    public Guid? SuspendedBy { get; set; }
    public string? SuspendedByName { get; set; }
    public string? LastAdminAction { get; set; }
    public string? TimeZone { get; set; }
    public string? Language { get; set; }
    public string? ProfileImageUrl { get; set; }
    public string? Bio { get; set; }
    public List<string> RecentAdminActions { get; set; } = new();
    public List<SecurityEventSummary> RecentSecurityEvents { get; set; } = new();
}

public class AdminActionSummary
{
    public Guid Id { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? Details { get; set; }
    public string? AdminUserName { get; set; }
}

public class SecurityEventSummary  
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? IpAddress { get; set; }
    public string? Details { get; set; }
    public int RiskScore { get; set; }
}

public class BulkUserActionRequest
{
    public List<Guid> UserIds { get; set; } = new();
    public string Action { get; set; } = string.Empty;
    /// <summary>
    /// ActionType alias for compatibility
    /// </summary>
    public BulkActionType ActionType => Enum.TryParse<BulkActionType>(Action, ignoreCase: true, out var result) ? result : BulkActionType.Suspend;
    public string? Reason { get; set; }
    public Dictionary<string, object>? Parameters { get; set; }
}

public class UserSuspensionRequest
{
    public Guid UserId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime? SuspendUntil { get; set; }
    public bool IsPermanent { get; set; } = false;
    public bool NotifyUser { get; set; } = true;
}

public class UserUnsuspensionRequest
{
    public Guid UserId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool NotifyUser { get; set; } = true;
}

public class ImpersonationRequest
{
    public Guid UserId { get; set; }
    public Guid TargetUserId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public int DurationMinutes { get; set; } = 60;
}

public class UserActivity
{
    public DateTime Timestamp { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}

public class UserSearchFacets
{
    public Dictionary<string, int> ByRole { get; set; } = new();
    public Dictionary<string, int> ByStatus { get; set; } = new();
    public Dictionary<string, int> BySubscriptionPlan { get; set; } = new();
    public Dictionary<string, int> ByPaymentStatus { get; set; } = new();
    public Dictionary<string, int> ByRegistrationMonth { get; set; } = new();
}

public enum BulkActionType
{
    Suspend,
    Unsuspend,
    Deactivate,
    Reactivate,
    AssignRole,
    RemoveRole,
    UpdateSubscription,
    SendEmail,
    ExportData
}

public enum BulkActionStatus
{
    Pending,
    InProgress,
    Completed,
    Failed,
    PartiallyCompleted
}

public class BulkActionResult
{
    public Guid ActionId { get; set; }
    public BulkActionType ActionType { get; set; }
    public int TotalUsers { get; set; }
    public int SuccessfulActions { get; set; }
    public int FailedActions { get; set; }
    public List<BulkActionError> Errors { get; set; } = new();
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public BulkActionStatus Status { get; set; }
    
    // Additional properties for compatibility
    public string StatusText => Status.ToString();
    public int ProcessedUsers { get; set; }
    public int SuccessfulUsers { get; set; }
    public int FailedUsers { get; set; }
}

public class BulkActionError
{
    public Guid UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public string Message => ErrorMessage;
}

// Analytics Models
public class AdminAnalyticsRequest
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? MetricType { get; set; }
    public string? Granularity { get; set; } = "daily";
    public List<string>? Dimensions { get; set; }
    public Dictionary<string, object>? Filters { get; set; }
}

public class AdminAnalyticsResponse
{
    public string MetricType { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Granularity { get; set; } = string.Empty;
    public List<AnalyticsDataPoint> Data { get; set; } = new();
    public Dictionary<string, object> Summary { get; set; } = new();
    public List<string> Dimensions { get; set; } = new();
}

public class AnalyticsDataPoint
{
    public DateTime Timestamp { get; set; }
    public Dictionary<string, double> Metrics { get; set; } = new();
    public Dictionary<string, object> Dimensions { get; set; } = new();
}

// Notification Models
public class AdminNotification
{
    public Guid Id { get; set; }
    public NotificationType Type { get; set; }
    public NotificationSeverity Severity { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public NotificationPriority Priority { get; set; } = NotificationPriority.Normal;
    public string? Email { get; set; }
    public Guid? CreatedBy { get; set; }
    
    // Data for storing notification-specific information
    [Column(TypeName = "nvarchar(max)")]
    public string DataJson { get; set; } = "{}";

    [NotMapped]
    public Dictionary<string, object>? Data
    {
        get => string.IsNullOrEmpty(DataJson) || DataJson == "{}" 
            ? null 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(DataJson);
        set => DataJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public bool IsRead { get; set; }
    public Guid? UserId { get; set; }
    public string? CorrelationId { get; set; }
}

public enum NotificationType
{
    SystemAlert,
    UserAction,
    PaymentIssue,
    SubscriptionChange,
    SupportTicket,
    SecurityEvent,
    PerformanceAlert,
    BusinessMetric,
    BusinessAlert,
    SystemHealth
}

public enum NotificationSeverity
{
    Info,
    Warning,
    Error,
    Critical
}

public enum NotificationPriority
{
    Low,
    Normal,
    High,
    Critical
}

public enum UserStatus
{
    Active,
    Inactive,
    Suspended,
    Banned,
    PendingVerification,
    EmailUnverified
}

// Session Management Models
public class AdminSession
{
    [Key]
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string SessionToken { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
    public List<string> Permissions { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime LastActivity { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsActive { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    public Dictionary<string, object>? Metadata { get; set; }
    
    // SessionData for storing session-specific information
    [Column(TypeName = "nvarchar(max)")]
    public string SessionDataJson { get; set; } = "{}";

    [NotMapped]
    public Dictionary<string, object>? SessionData
    {
        get => string.IsNullOrEmpty(SessionDataJson) || SessionDataJson == "{}" 
            ? null 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(SessionDataJson);
        set => SessionDataJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
}

public class AdminSessionInfo
{
    [Key]
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
    public List<string> Permissions { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime LastActivity { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsActive { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    
    // SessionData for storing session-specific information
    [Column(TypeName = "nvarchar(max)")]
    public string SessionDataJson { get; set; } = "{}";

    [NotMapped]
    public Dictionary<string, object>? SessionData
    {
        get => string.IsNullOrEmpty(SessionDataJson) || SessionDataJson == "{}" 
            ? null 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(SessionDataJson);
        set => SessionDataJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
}

public class AdminSessionRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public bool? IsActive { get; set; }
    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public int TimeoutMinutes { get; set; } = 60;
    public List<string> Permissions { get; set; } = new();
    public Dictionary<string, object>? Metadata { get; set; }
}

// Data Export Models
public class AdminDataExportRequest
{
    [Required]
    public string ExportType { get; set; } = string.Empty;
    
    /// <summary>
    /// EntityType alias for compatibility
    /// </summary>
    public string EntityType => ExportType;
    
    [Required]
    public string Format { get; set; } = "csv";
    
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public Dictionary<string, object>? Filters { get; set; }
    public List<string>? Columns { get; set; }
    public bool IncludeHeaders { get; set; } = true;
    public string? EmailTo { get; set; }
}

public class AdminDataExport
{
    public Guid Id { get; set; }
    public string ExportType { get; set; } = string.Empty;
    public string Format { get; set; } = string.Empty;
    public ExportStatus Status { get; set; }
    public string? FileName { get; set; }
    public string? FilePath { get; set; }
    public long? FileSizeBytes { get; set; }
    public int? RecordCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public Guid RequestedBy { get; set; }
    public string? ErrorMessage { get; set; }
    public string? Parameters { get; set; }
    
    // Metadata for storing export-specific data
    [Column(TypeName = "nvarchar(max)")]
    public string MetadataJson { get; set; } = "{}";

    [NotMapped]
    public Dictionary<string, object> Metadata
    {
        get => string.IsNullOrEmpty(MetadataJson) 
            ? new Dictionary<string, object>() 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(MetadataJson) ?? new Dictionary<string, object>();
        set => MetadataJson = JsonSerializer.Serialize(value);
    }
}

public enum ExportStatus
{
    Pending,
    InProgress,
    Completed,
    Failed,
    Expired,
    Cancelled
}

// System Health Models
public class SystemHealthStatus
{
    public string Status { get; set; } = string.Empty;
    
    // Alias for compatibility with SystemHealthService
    public string OverallStatus { get; set; } = string.Empty;
    
    public DateTime Timestamp { get; set; }
    public Dictionary<string, ComponentHealth> Components { get; set; } = new();
    public SystemMetrics Metrics { get; set; } = new();
    public List<SystemAlert> Alerts { get; set; } = new();
}

public class ComponentHealth
{
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Message { get; set; }
    public DateTime LastChecked { get; set; }
    public double? ResponseTime { get; set; }
    public Dictionary<string, object>? Details { get; set; }
}

public class SystemMetrics
{
    public double CpuUsagePercentage { get; set; }
    public double MemoryUsagePercentage { get; set; }
    public double DiskUsagePercentage { get; set; }
    
    // Additional compatibility properties
    public double CpuUsagePercent { get; set; }
    public double MemoryUsageMB { get; set; }
    public double TotalMemoryMB { get; set; }
    public double DiskUsagePercent { get; set; }
    
    public int ActiveConnections { get; set; }
    public double RequestsPerSecond { get; set; }
    public double RequestsPerMinute { get; set; }
    public double AverageResponseTime { get; set; }
    public double AverageResponseTimeMs { get; set; }
    public int ThreadCount { get; set; }
    public long GCCollections { get; set; }
    public double ErrorRate { get; set; }
    public double Uptime { get; set; }
}

public class SystemAlert
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public bool IsResolved { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

// Configuration Models
public class AdminConfigurationSetting
{
    [Key]
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public bool IsEncrypted { get; set; }
    public bool IsReadOnly { get; set; }
    public DateTime LastModified { get; set; }
    public Guid? ModifiedBy { get; set; }
    public string? ValidationRule { get; set; }
    
    // Missing properties causing compilation errors
    public Guid Id { get; set; } = Guid.NewGuid();
    public string DataType { get; set; } = string.Empty;
    public bool IsSecure { get; set; }
    public string? DefaultValue { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}

public class UpdateConfigurationRequest
{
    [Required]
    public string Key { get; set; } = string.Empty;
    
    [Required]
    public string Value { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Reason { get; set; }
    
    public bool ValidateOnly { get; set; } = false;
}

// Audit Models
public class AdminAuditLogRequest
{
    public Guid? UserId { get; set; }
    public string? Action { get; set; }
    public string? Resource { get; set; }
    public string? Entity { get; set; }
    public bool? Success { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? EntityId { get; set; }
    public string? EntityType { get; set; }
    public string? CorrelationId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 100;
    public string SortBy { get; set; } = "Timestamp";
    public string SortDirection { get; set; } = "desc";
}

public class AdminAuditLogResponse
{
    public List<AdminAuditLogEntry> Logs { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public AuditLogFacets Facets { get; set; } = new();
}

public class AdminAuditLogEntry
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public DateTime CreatedAt { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string? UserAgent { get; set; }
    public string? CorrelationId { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class AuditLogFacets
{
    public Dictionary<string, int> ByAction { get; set; } = new();
    public Dictionary<string, int> ByResource { get; set; } = new();
    public Dictionary<string, int> ByUser { get; set; } = new();
    public Dictionary<string, int> BySuccess { get; set; } = new();
    public Dictionary<string, int> ByHour { get; set; } = new();
}

// Role Management Models
public class RoleAssignmentRequest
{
    public Guid UserId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public Guid AssignedBy { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class RoleRemovalRequest
{
    public Guid UserId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public Guid RemovedBy { get; set; }
}

// Business Validation Models
public class BusinessValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public Dictionary<string, object>? Metadata { get; set; }
}

// Additional Models for Audit Service
public class UserAuditTimelineEntry
{
    public Guid Id { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string? Details { get; set; }
}

public class FailedActionPattern
{
    public string Action { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public int Count { get; set; }
    public DateTime FirstOccurrence { get; set; }
    public DateTime LastOccurrence { get; set; }
}

public enum TrendDirection
{
    Up,
    Down,
    Stable
}

// Business Alert Model
public class BusinessAlert
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public bool IsResolved { get; set; }
    public bool IsActive { get; set; } = true;
    
    // Navigation property
    public virtual BusinessMetricsResponse? BusinessMetrics { get; set; }
}

// Missing Models for AdvancedAdminUserService
public class UserActivityEntry
{
    public Guid Id { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? Details { get; set; }
    // Compatibility properties
    public string ActivityType => Action;
    public string Description => Details ?? string.Empty;
    public DateTime Timestamp => CreatedAt;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class UserSubscriptionHistory
{
    public Guid Id { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal Amount { get; set; }
    public string BillingInterval { get; set; } = string.Empty;
    public string? CancellationReason { get; set; }
}

public class UserPaymentHistory
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? FailureReason { get; set; }
    // Compatibility property
    public DateTime Date => CreatedAt;
}

// Configuration Models for ConfigurationManagementService (AdminConfigurationSetting already defined above)

public class ConfigurationSetting
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string DataType { get; set; } = "string";
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsReadOnly { get; set; }
    public bool IsSecure { get; set; }
    public string? DefaultValue { get; set; }
    public string? ValidationRule { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}
