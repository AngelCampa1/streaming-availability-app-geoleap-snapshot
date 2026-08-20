using GeoLeap.Api.Models;

namespace GeoLeap.Api.Data.Repositories;

/// <summary>
/// Repository interface for Subscription operations
/// </summary>
public interface ISubscriptionRepository : IRepository<Subscription, Guid>
{
    Task<Subscription?> FindByStripeSubscriptionIdAsync(string stripeSubscriptionId);
    Task<List<Subscription>> GetByUserIdAsync(Guid userId);
    Task<Subscription?> GetActiveSubscriptionAsync(Guid userId);
    Task<List<Subscription>> GetByStatusAsync(string status, int skip = 0, int take = 50);
    Task<List<Subscription>> GetExpiringSoonAsync(int days = 7, int limit = 100);
    Task<List<Subscription>> GetCanceledSubscriptionsAsync(DateTime? startDate = null, DateTime? endDate = null);
    Task<List<Subscription>> GetTrialSubscriptionsAsync(bool expiredOnly = false);
    Task<int> GetActiveSubscriptionCountAsync();
    Task<int> GetSubscriptionCountByPlanAsync(string planType);
    Task<decimal> GetMonthlyRecurringRevenueAsync();
    Task<decimal> GetAverageRevenuePerUserAsync();
    Task<double> GetChurnRateAsync(int months = 12);
    Task<bool> UpdateStatusAsync(Guid subscriptionId, string status);
    Task<bool> UpdateEndDateAsync(Guid subscriptionId, DateTime endDate);
    Task<bool> SetCancelledAsync(Guid subscriptionId, DateTime cancelledAt, bool cancelAtPeriodEnd = true);
    Task<List<Subscription>> GetSubscriptionsForRenewalAsync(DateTime date);
    Task<Dictionary<string, int>> GetSubscriptionStatusCountsAsync();
    Task<Dictionary<string, decimal>> GetRevenueByPlanTypeAsync(DateTime? startDate = null, DateTime? endDate = null);
    Task<List<Subscription>> GetSubscriptionHistoryAsync(Guid userId, int limit = 50);
}