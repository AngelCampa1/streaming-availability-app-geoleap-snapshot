using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IPaymentRetryService
{
    // Failed Payment Management
    Task<FailedPaymentDto> CreateFailedPaymentAsync(Guid userId, Guid paymentTransactionId, string failureType, string stripeDeclineCode, string failureReason, string correlationId);
    Task<FailedPaymentDto?> GetFailedPaymentAsync(Guid failedPaymentId);
    Task<List<FailedPaymentDto>> GetUserFailedPaymentsAsync(Guid userId, bool activeOnly = true);
    Task<FailedPaymentDto> UpdateFailedPaymentStatusAsync(Guid failedPaymentId, string newStatus, string correlationId);

    // Intelligent Retry Logic
    Task<bool> ShouldRetryPaymentAsync(Guid failedPaymentId);
    Task<TimeSpan> CalculateNextRetryDelayAsync(Guid failedPaymentId);
    Task<PaymentRetryAttempt> SchedulePaymentRetryAsync(Guid failedPaymentId, string attemptType, string correlationId);
    Task ProcessScheduledPaymentRetriesAsync();
    Task<PaymentRetryAttempt> ExecutePaymentRetryAsync(Guid failedPaymentId, string correlationId, bool isManual = false);

    // Retry Configuration and Rules
    Task<int> GetMaxRetryAttemptsAsync(string failureType, Guid? userId = null);
    Task<List<TimeSpan>> GetRetryDelayScheduleAsync(string failureType);
    Task<bool> IsRetriableFailureTypeAsync(string failureType, string stripeDeclineCode);
    Task UpdateRetryRulesAsync(string failureType, int maxAttempts, List<TimeSpan> delaySchedule, string updatedBy);

    // Recovery Session Management
    Task<PaymentRecoverySessionDto> CreateRecoverySessionAsync(Guid failedPaymentId, string correlationId);
    Task<PaymentRecoverySessionDto?> GetRecoverySessionAsync(string sessionToken);
    Task<PaymentRecoverySessionDto> CompleteRecoverySessionAsync(string sessionToken, string completionType, string correlationId);
    Task CleanupExpiredRecoverySessionsAsync();

    // Analytics and Reporting
    Task LogRetryAnalyticsAsync(string eventType, Guid failedPaymentId, bool wasSuccessful, string correlationId, Dictionary<string, object>? metadata = null);
    Task<Dictionary<string, object>> GetRetryAnalyticsAsync(DateTime startDate, DateTime endDate);
    Task<Dictionary<string, object>> GetFailurePatternAnalysisAsync(DateTime startDate, DateTime endDate);

    // Manual Retry Operations (for customer support)
    Task<PaymentRetryAttempt> ManuallyRetryPaymentAsync(Guid failedPaymentId, string reason, string performedBy, string correlationId);
    Task<FailedPaymentDto> ForceResolveFailedPaymentAsync(Guid failedPaymentId, string reason, string performedBy, string correlationId);
    Task<List<FailedPaymentDto>> GetFailedPaymentsRequiringActionAsync(int daysOld = 1);
}