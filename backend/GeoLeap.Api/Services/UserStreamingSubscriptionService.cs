using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Data.Entities;

namespace GeoLeap.Api.Services;

/// <summary>
/// Implementation of user streaming subscription management service
/// </summary>
public class UserStreamingSubscriptionService : IUserStreamingSubscriptionService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<UserStreamingSubscriptionService> _logger;

    public UserStreamingSubscriptionService(
        ApplicationDbContext context,
        ILogger<UserStreamingSubscriptionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<UserStreamingSubscription>> GetUserSubscriptionsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.UserStreamingSubscriptions
                .Where(s => s.UserId == userId && s.IsActive)
                .OrderBy(s => s.ServiceName)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subscriptions for user {UserId}", userId);
            throw;
        }
    }

    public async Task<List<string>> GetUserServiceIdsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.UserStreamingSubscriptions
                .Where(s => s.UserId == userId && s.IsActive)
                .Select(s => s.ServiceId)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting service IDs for user {UserId}", userId);
            throw;
        }
    }

    public async Task<UserStreamingSubscription> AddSubscriptionAsync(
        Guid userId,
        string serviceId,
        string serviceName,
        string? subscriptionTier = null,
        string? notes = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Check if subscription already exists
            var existing = await _context.UserStreamingSubscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId && s.ServiceId == serviceId, cancellationToken);

            if (existing != null)
            {
                // Reactivate if it was removed
                if (!existing.IsActive)
                {
                    existing.IsActive = true;
                    existing.RemovedAt = null;
                    existing.AddedAt = DateTime.UtcNow;
                    existing.SubscriptionTier = subscriptionTier;
                    existing.Notes = notes;

                    await _context.SaveChangesAsync(cancellationToken);

                    _logger.LogInformation("Reactivated subscription {ServiceId} for user {UserId}", serviceId, userId);
                    return existing;
                }

                // Already active
                _logger.LogWarning("Subscription {ServiceId} already exists for user {UserId}", serviceId, userId);
                return existing;
            }

            // Create new subscription
            var subscription = new UserStreamingSubscription
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ServiceId = serviceId,
                ServiceName = serviceName,
                IsActive = true,
                AddedAt = DateTime.UtcNow,
                SubscriptionTier = subscriptionTier,
                Notes = notes
            };

            _context.UserStreamingSubscriptions.Add(subscription);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Added subscription {ServiceId} for user {UserId}", serviceId, userId);
            return subscription;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding subscription {ServiceId} for user {UserId}", serviceId, userId);
            throw;
        }
    }

    public async Task<bool> RemoveSubscriptionAsync(
        Guid userId,
        string serviceId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var subscription = await _context.UserStreamingSubscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId && s.ServiceId == serviceId && s.IsActive, cancellationToken);

            if (subscription == null)
            {
                _logger.LogWarning("Subscription {ServiceId} not found for user {UserId}", serviceId, userId);
                return false;
            }

            // Soft delete
            subscription.IsActive = false;
            subscription.RemovedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Removed subscription {ServiceId} for user {UserId}", serviceId, userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing subscription {ServiceId} for user {UserId}", serviceId, userId);
            throw;
        }
    }

    public async Task<bool> HasSubscriptionAsync(
        Guid userId,
        string serviceId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.UserStreamingSubscriptions
                .AnyAsync(s => s.UserId == userId && s.ServiceId == serviceId && s.IsActive, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking subscription {ServiceId} for user {UserId}", serviceId, userId);
            throw;
        }
    }

    public async Task<UserStreamingSubscription?> UpdateSubscriptionAsync(
        Guid userId,
        string serviceId,
        string? subscriptionTier = null,
        string? notes = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var subscription = await _context.UserStreamingSubscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId && s.ServiceId == serviceId && s.IsActive, cancellationToken);

            if (subscription == null)
            {
                _logger.LogWarning("Subscription {ServiceId} not found for user {UserId}", serviceId, userId);
                return null;
            }

            if (subscriptionTier != null)
                subscription.SubscriptionTier = subscriptionTier;

            if (notes != null)
                subscription.Notes = notes;

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Updated subscription {ServiceId} for user {UserId}", serviceId, userId);
            return subscription;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating subscription {ServiceId} for user {UserId}", serviceId, userId);
            throw;
        }
    }

    public async Task<UserStreamingSubscription?> GetSubscriptionAsync(
        Guid userId,
        string serviceId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.UserStreamingSubscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId && s.ServiceId == serviceId && s.IsActive, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subscription {ServiceId} for user {UserId}", serviceId, userId);
            throw;
        }
    }
}
