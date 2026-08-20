using GeoLeap.Api.Models;

namespace GeoLeap.Api.Data.Repositories;

/// <summary>
/// Repository interface for PaymentTransaction management
/// </summary>
public interface IPaymentRepository : IRepository<PaymentTransaction, Guid>
{
    Task<IEnumerable<PaymentTransaction>> GetPaymentsByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<PaymentTransaction>> GetPaymentsByStatusAsync(string status, CancellationToken cancellationToken = default);
    Task<PaymentTransaction?> GetPaymentByTransactionIdAsync(string transactionId, CancellationToken cancellationToken = default);
    Task<PaymentTransaction?> GetPaymentByStripePaymentIntentAsync(string paymentIntentId, CancellationToken cancellationToken = default);
    Task<IEnumerable<PaymentTransaction>> GetPaymentsByDateRangeAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<decimal> GetTotalPaymentsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<PaymentTransaction>> GetFailedPaymentsAsync(CancellationToken cancellationToken = default);
}