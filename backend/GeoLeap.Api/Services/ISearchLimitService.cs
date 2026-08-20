namespace GeoLeap.Api.Services;

/// <summary>
/// Search limit result containing limit check status and metadata
/// </summary>
public record SearchLimitResult(
    bool CanSearch,
    int SearchesUsed,
    int SearchLimit,
    string? BlockReason,  // "signup_required" | "upgrade_required" | null
    DateTime? ResetsAt
);

/// <summary>
/// Service for managing search limits based on user tier
/// Implements 2-step conversion funnel:
/// - Anonymous: 1 search total, then signup required
/// - Free: 5 searches/day, then upgrade required
/// - Premium: Unlimited
/// </summary>
public interface ISearchLimitService
{
    /// <summary>
    /// Check if user can perform a search and increment counter if allowed
    /// </summary>
    /// <param name="userId">Authenticated user ID (null for anonymous)</param>
    /// <param name="anonymousId">Anonymous user ID from localStorage</param>
    /// <param name="ipFingerprint">IP+UserAgent hash for fallback tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>SearchLimitResult with status and metadata</returns>
    Task<SearchLimitResult> CheckAndIncrementAsync(
        Guid? userId,
        string? anonymousId,
        string? ipFingerprint,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get remaining searches without incrementing
    /// </summary>
    Task<SearchLimitResult> GetLimitStatusAsync(
        Guid? userId,
        string? anonymousId,
        string? ipFingerprint,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Clear search count for a user (used when user upgrades to premium)
    /// </summary>
    Task ClearLimitsAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Migrate anonymous search history to authenticated user on registration
    /// </summary>
    Task MigrateAnonymousToUserAsync(
        string anonymousId,
        string? ipFingerprint,
        Guid userId,
        CancellationToken cancellationToken = default);
}
