using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Paywall service interface for subscription-based content gating
/// </summary>
public interface IPaywallService
{
    /// <summary>
    /// Gets the current subscription status for a user
    /// </summary>
    /// <param name="userId">User identifier</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Current subscription information</returns>
    Task<UserSubscription> GetUserSubscriptionAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the subscription tier for a user with caching
    /// </summary>
    /// <param name="userId">User identifier</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>User's current subscription tier</returns>
    Task<SubscriptionTier> GetUserTierAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets access limits for a specific subscription tier
    /// </summary>
    /// <param name="tier">Subscription tier</param>
    /// <returns>Access limits configuration</returns>
    TierAccessLimits GetTierAccessLimits(SubscriptionTier tier);

    /// <summary>
    /// Applies paywall filtering to search results
    /// </summary>
    /// <param name="response">Original search response</param>
    /// <param name="userId">User identifier</param>
    /// <param name="correlationId">Correlation ID for tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Paywall-filtered search response</returns>
    Task<PaywalledSearchResponse> ApplyPaywallAsync(
        GlobalSearchResponse response, 
        Guid userId, 
        string correlationId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Applies paywall filtering to a single search result
    /// </summary>
    /// <param name="result">Original search result</param>
    /// <param name="userId">User identifier</param>
    /// <param name="correlationId">Correlation ID for tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Paywall-filtered search result</returns>
    Task<PaywalledSearchResult> ApplyPaywallToResultAsync(
        GlobalSearchResult result, 
        Guid userId, 
        string correlationId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if user can perform a search based on tier limits
    /// </summary>
    /// <param name="userId">User identifier</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if user can search, false if limit reached</returns>
    Task<bool> CanUserSearchAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Increments user's search count for daily limit tracking
    /// </summary>
    /// <param name="userId">User identifier</param>
    /// <param name="resultsReturned">Number of results returned</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task IncrementSearchUsageAsync(Guid userId, int resultsReturned, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates upgrade messaging based on user's tier and usage
    /// </summary>
    /// <param name="userId">User identifier</param>
    /// <param name="context">Context for message generation (search results, etc.)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Upgrade messaging and call-to-action</returns>
    Task<List<PaywallMessage>> GenerateUpgradeMessagingAsync(
        Guid userId, 
        PaywallContext context,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Logs paywall analytics event
    /// </summary>
    /// <param name="userId">User identifier</param>
    /// <param name="eventType">Type of paywall event</param>
    /// <param name="metadata">Additional event metadata</param>
    /// <param name="correlationId">Correlation ID for tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task LogPaywallEventAsync(
        Guid userId, 
        PaywallEvent eventType, 
        Dictionary<string, object>? metadata = null,
        string? correlationId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates subscription status and refreshes cache if needed
    /// </summary>
    /// <param name="userId">User identifier</param>
    /// <param name="forceRefresh">Force refresh from source</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated subscription information</returns>
    Task<UserSubscription> ValidateAndRefreshSubscriptionAsync(
        Guid userId, 
        bool forceRefresh = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if specific content features are accessible to user
    /// </summary>
    /// <param name="userId">User identifier</param>
    /// <param name="feature">Feature to check access for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if feature is accessible</returns>
    Task<bool> HasFeatureAccessAsync(
        Guid userId, 
        PaywallFeature feature,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets user's current search usage for the day
    /// </summary>
    /// <param name="userId">User identifier</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Today's search usage</returns>
    Task<UserSearchUsage> GetTodaysUsageAsync(Guid userId, CancellationToken cancellationToken = default);
}