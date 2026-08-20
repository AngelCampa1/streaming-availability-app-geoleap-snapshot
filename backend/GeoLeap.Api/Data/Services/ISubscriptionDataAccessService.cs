using GeoLeap.Api.Models;

namespace GeoLeap.Api.Data.Services;

/// <summary>
/// Interface for Subscription data access operations
/// </summary>
public interface ISubscriptionDataAccessService
{
    Task<Subscription?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Subscription>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Subscription> CreateAsync(Subscription subscription, CancellationToken cancellationToken = default);
    Task<Subscription> UpdateAsync(Subscription subscription, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Subscription>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Subscription?> GetActiveSubscriptionAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Subscription?> GetByStripeSubscriptionIdAsync(string stripeSubscriptionId, CancellationToken cancellationToken = default);
    Task<decimal> GetMonthlyRecurringRevenueAsync(CancellationToken cancellationToken = default);
}