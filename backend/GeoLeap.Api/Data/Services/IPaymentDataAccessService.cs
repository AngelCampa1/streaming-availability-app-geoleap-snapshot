using GeoLeap.Api.Models;

namespace GeoLeap.Api.Data.Services;

/// <summary>
/// Interface for Payment data access operations
/// </summary>
public interface IPaymentDataAccessService
{
    Task<PaymentTransaction?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<PaymentTransaction>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PaymentTransaction> CreateAsync(PaymentTransaction payment, CancellationToken cancellationToken = default);
    Task<PaymentTransaction> UpdateAsync(PaymentTransaction payment, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<PaymentTransaction>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<PaymentTransaction?> GetByTransactionIdAsync(string transactionId, CancellationToken cancellationToken = default);
    Task<decimal> GetTotalPaymentsAsync(Guid userId, CancellationToken cancellationToken = default);
}