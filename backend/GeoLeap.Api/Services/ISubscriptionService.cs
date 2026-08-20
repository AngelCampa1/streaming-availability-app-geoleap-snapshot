using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface ISubscriptionService
{
    Task<SubscriptionDto> CreateSubscriptionAsync(Guid userId, CreateSubscriptionRequest request, string correlationId);
    Task<SubscriptionDto> CancelSubscriptionAsync(Guid userId, Guid subscriptionId, string correlationId);
    Task<SubscriptionDto> ReactivateSubscriptionAsync(Guid userId, Guid subscriptionId, string correlationId);
    Task<SubscriptionDto> UpdateSubscriptionAsync(Guid userId, Guid subscriptionId, string newPriceId, string correlationId);
    Task<SubscriptionDto> UpdateSubscriptionAsync(Guid userId, UpdateSubscriptionRequest request);
    Task<SubscriptionDto?> GetUserActiveSubscriptionAsync(Guid userId);
    Task<List<SubscriptionDto>> GetUserSubscriptionHistoryAsync(Guid userId);
    Task<UserSubscription?> GetUserSubscriptionStatusAsync(Guid userId);
    Task UpdateUserSubscriptionTierAsync(Guid userId, SubscriptionTier tier);
    Task<bool> SyncSubscriptionWithStripeAsync(Guid userId, string correlationId);
    
    // Missing methods for test compatibility
    Task<UserSubscription?> GetUserSubscriptionAsync(Guid userId);
    Task<List<SubscriptionDto>> GetSubscriptionHistoryAsync(Guid userId);
    Task<SubscriptionDto> RenewSubscriptionAsync(Guid userId, RenewSubscriptionRequest request);
    Task<List<SubscriptionPlan>> GetAvailablePlansAsync();
    Task<bool> IsSubscriptionActiveAsync(Guid userId);
    Task<UsageMetrics> GetUsageMetricsAsync(Guid userId);
    Task<SubscriptionDto?> GetCurrentSubscription(Guid userId);
}