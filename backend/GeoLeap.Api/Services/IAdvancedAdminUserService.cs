using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Extended admin user management service with advanced search and bulk operations
/// </summary>
public interface IAdvancedAdminUserService
{
    /// <summary>
    /// Advanced user search with filtering and faceting
    /// </summary>
    Task<AdminUserSearchResponse> SearchUsersAsync(AdminUserSearchRequest request, string correlationId);

    /// <summary>
    /// Get detailed user information for admin view
    /// </summary>
    Task<AdminUserSummary?> GetUserDetailAsync(Guid userId, string correlationId);

    /// <summary>
    /// Process bulk actions on multiple users
    /// </summary>
    Task<BulkActionResult> ProcessBulkActionAsync(
        BulkUserActionRequest request, 
        Guid performedBy, 
        string correlationId);

    /// <summary>
    /// Get status of bulk action operation
    /// </summary>
    Task<BulkActionResult?> GetBulkActionStatusAsync(Guid actionId, string correlationId);

    /// <summary>
    /// Export user data in various formats
    /// </summary>
    Task<Stream> ExportUsersAsync(
        AdminUserSearchRequest searchRequest, 
        string format,
        Guid requestedBy,
        string correlationId);

    /// <summary>
    /// Get user activity timeline
    /// </summary>
    Task<List<UserActivityEntry>> GetUserActivityTimelineAsync(
        Guid userId, 
        DateTime? fromDate, 
        DateTime? toDate,
        int page = 1,
        int pageSize = 50,
        string correlationId = "");

    /// <summary>
    /// Get user's subscription history
    /// </summary>
    Task<List<UserSubscriptionHistory>> GetUserSubscriptionHistoryAsync(
        Guid userId, 
        string correlationId);

    /// <summary>
    /// Get user's payment history
    /// </summary>
    Task<List<UserPaymentHistory>> GetUserPaymentHistoryAsync(
        Guid userId, 
        string correlationId);

    /// <summary>
    /// Get user's support ticket history
    /// </summary>
    Task<List<UserSupportHistory>> GetUserSupportHistoryAsync(
        Guid userId, 
        string correlationId);

    /// <summary>
    /// Merge duplicate user accounts
    /// </summary>
    Task<bool> MergeUserAccountsAsync(
        Guid primaryUserId, 
        Guid duplicateUserId, 
        Guid performedBy,
        string reason,
        string correlationId);

    /// <summary>
    /// Get user merge candidates based on email/name similarity
    /// </summary>
    Task<List<UserMergeCandidate>> GetUserMergeCandidatesAsync(
        Guid userId, 
        string correlationId);

    /// <summary>
    /// Reset user password with admin override
    /// </summary>
    Task<bool> AdminPasswordResetAsync(
        Guid userId, 
        string newPassword, 
        bool requirePasswordChange,
        Guid performedBy,
        string correlationId);

    /// <summary>
    /// Force email verification for user
    /// </summary>
    Task<bool> ForceEmailVerificationAsync(
        Guid userId, 
        Guid performedBy,
        string correlationId);

    /// <summary>
    /// Get comprehensive user statistics
    /// </summary>
    Task<Dictionary<string, object>> GetUserStatisticsAsync(
        DateTime? fromDate,
        DateTime? toDate,
        string correlationId);

    /// <summary>
    /// Archive inactive users
    /// </summary>
    Task<BulkActionResult> ArchiveInactiveUsersAsync(
        int inactiveDays,
        bool dryRun,
        Guid performedBy,
        string correlationId);
}

// Supporting models for extended user management are defined in AdminModels.cs

public class UserSupportHistory
{
    public Guid Id { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? AssignedAgent { get; set; }
}

public class UserMergeCandidate
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
    public DateTime CreatedAt { get; set; }
    public double SimilarityScore { get; set; }
    public List<string> MatchingFields { get; set; } = new();
    public string? RecommendedAction { get; set; }
}