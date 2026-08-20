using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IPaymentMethodService
{
    // Payment Method CRUD Operations
    Task<PaymentMethodDto> AddPaymentMethodAsync(Guid userId, PaymentMethodRequest request, string correlationId);
    Task<PaymentMethodDto> UpdatePaymentMethodAsync(Guid userId, Guid paymentMethodId, UpdatePaymentMethodRequest request, string correlationId);
    Task<bool> RemovePaymentMethodAsync(Guid userId, Guid paymentMethodId, string correlationId);
    Task<PaymentMethodDto?> GetPaymentMethodAsync(Guid userId, Guid paymentMethodId);
    Task<List<PaymentMethodDto>> GetUserPaymentMethodsAsync(Guid userId);

    // Default Payment Method Management
    Task<PaymentMethodDto> SetDefaultPaymentMethodAsync(Guid userId, Guid paymentMethodId, string correlationId);
    Task<PaymentMethodDto?> GetDefaultPaymentMethodAsync(Guid userId);

    // Payment Method Validation
    Task<bool> ValidatePaymentMethodAsync(Guid userId, PaymentMethodValidationRequest request, string correlationId);
    Task<bool> IsPaymentMethodExpiringSoonAsync(Guid paymentMethodId, int warningDays = 30);
    Task<List<PaymentMethodDto>> GetExpiringPaymentMethodsAsync(int warningDays = 30);

    // Stripe Synchronization
    Task<bool> SyncPaymentMethodWithStripeAsync(Guid paymentMethodId, string correlationId);
    Task<bool> SyncAllUserPaymentMethodsAsync(Guid userId, string correlationId);

    // Security and Audit
    Task LogPaymentMethodActivityAsync(Guid userId, Guid? paymentMethodId, string action, string correlationId, Dictionary<string, object>? metadata = null);
    Task<bool> IsPaymentMethodOwnedByUserAsync(Guid userId, Guid paymentMethodId);

    // Notification Management
    Task SendPaymentMethodAddedNotificationAsync(Guid userId, Guid paymentMethodId, string correlationId);
    Task SendPaymentMethodUpdatedNotificationAsync(Guid userId, Guid paymentMethodId, string correlationId);
    Task SendPaymentMethodRemovedNotificationAsync(Guid userId, Guid paymentMethodId, string correlationId);
    Task SendPaymentMethodExpirationWarningAsync(Guid userId, Guid paymentMethodId, string correlationId);

    // Analytics and Reporting
    Task<Dictionary<string, object>> GetPaymentMethodAnalyticsAsync(Guid? userId = null, DateTime? startDate = null, DateTime? endDate = null);
    Task<List<PaymentMethodDto>> GetMostUsedPaymentMethodsAsync(int limit = 10);

    // Emergency Operations
    Task<bool> DisablePaymentMethodAsync(Guid paymentMethodId, string reason, string correlationId);
    Task<bool> EnablePaymentMethodAsync(Guid paymentMethodId, string correlationId);
}