using GeoLeap.Api.Data.Entities;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for managing user's external streaming service subscriptions
/// Used for VPN-based content access feature
/// </summary>
public interface IUserStreamingSubscriptionService
{
    /// <summary>
    /// Get all active subscriptions for a user
    /// </summary>
    Task<List<UserStreamingSubscription>> GetUserSubscriptionsAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get list of service IDs for user's active subscriptions
    /// </summary>
    Task<List<string>> GetUserServiceIdsAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Add a new streaming service subscription for a user
    /// </summary>
    Task<UserStreamingSubscription> AddSubscriptionAsync(
        Guid userId,
        string serviceId,
        string serviceName,
        string? subscriptionTier = null,
        string? notes = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Remove a streaming service subscription (soft delete)
    /// </summary>
    Task<bool> RemoveSubscriptionAsync(Guid userId, string serviceId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if user has a specific subscription
    /// </summary>
    Task<bool> HasSubscriptionAsync(Guid userId, string serviceId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update subscription details
    /// </summary>
    Task<UserStreamingSubscription?> UpdateSubscriptionAsync(
        Guid userId,
        string serviceId,
        string? subscriptionTier = null,
        string? notes = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get subscription by service ID
    /// </summary>
    Task<UserStreamingSubscription?> GetSubscriptionAsync(Guid userId, string serviceId, CancellationToken cancellationToken = default);
}
