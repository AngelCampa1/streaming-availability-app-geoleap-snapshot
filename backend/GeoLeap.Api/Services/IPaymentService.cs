using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IPaymentService
{
    // Payment Intent Management
    Task<PaymentTransactionDto> CreatePaymentIntentAsync(Guid userId, CreatePaymentIntentRequest request, string correlationId);
    Task<PaymentTransactionDto> ConfirmPaymentIntentAsync(Guid userId, string paymentIntentId, string correlationId);
    Task<PaymentTransactionDto> CancelPaymentIntentAsync(Guid userId, string paymentIntentId, string correlationId);
    Task<PaymentTransactionDto?> GetPaymentTransactionAsync(Guid userId, Guid transactionId);
    Task<List<PaymentTransactionDto>> GetUserPaymentHistoryAsync(Guid userId, int page = 1, int pageSize = 20);

    // Payment Method Management
    Task<PaymentMethodDto> AttachPaymentMethodAsync(Guid userId, PaymentMethodRequest request, string correlationId);
    Task<PaymentMethodDto> DetachPaymentMethodAsync(Guid userId, Guid paymentMethodId, string correlationId);
    Task<PaymentMethodDto> SetDefaultPaymentMethodAsync(Guid userId, Guid paymentMethodId, string correlationId);
    Task<List<PaymentMethodDto>> GetUserPaymentMethodsAsync(Guid userId);

    // Subscription Management
    Task<SubscriptionDto> CreateSubscriptionAsync(Guid userId, CreateSubscriptionRequest request, string correlationId);
    Task<SubscriptionDto> CancelSubscriptionAsync(Guid userId, Guid subscriptionId, string correlationId);
    Task<SubscriptionDto> UpdateSubscriptionAsync(Guid userId, Guid subscriptionId, string newPriceId, string correlationId);
    Task<SubscriptionDto?> GetUserActiveSubscriptionAsync(Guid userId);
    Task<List<SubscriptionDto>> GetUserSubscriptionHistoryAsync(Guid userId);

    // Customer Management
    Task<string> GetOrCreateStripeCustomerAsync(Guid userId, string correlationId);
    Task<bool> DeleteStripeCustomerAsync(Guid userId, string correlationId);

    // Webhook Processing
    Task<bool> ProcessWebhookAsync(string stripeEventId, string eventType, string eventData, string correlationId);
    Task RetryFailedWebhooksAsync();

    // Analytics and Reporting
    Task LogPaymentAnalyticsAsync(string eventType, Guid? userId, string paymentMethod, decimal? amount, string currency, string correlationId, Dictionary<string, object>? metadata = null);
    Task<PaymentAnalyticsResult> GetPaymentAnalyticsAsync(DateTime startDate, DateTime endDate);

    // Payment Retry Logic
    Task ProcessFailedPaymentsAsync();
    Task<bool> RetryPaymentAsync(Guid transactionId, string correlationId);

    // Configuration Management
    Task<string?> GetPaymentConfigurationAsync(string key);
    Task SetPaymentConfigurationAsync(string key, string value, string category, string updatedBy);
    
    // Missing methods identified from tests
    Task<PaymentTransactionDto?> GetPaymentDetailsAsync(Guid paymentId);
    Task<bool> CancelPaymentAsync(Guid paymentId);
    Task<bool> HandleWebhookAsync(string payload, string signature = "");
    Task<bool> CanCancelPaymentAsync(Guid paymentId);
    Task<PaymentResult> ProcessPaymentAsync(PaymentRequest paymentRequest);
    
    // Method overloads for test compatibility
    Task<bool> ProcessPaymentAsync(Guid paymentIntentId, string stripePaymentIntentId, string correlationId);
    Task<PaymentResult> RefundPaymentAsync(RefundRequest request);
    Task<RefundResult> RefundPaymentAsync(Guid paymentId, RefundRequest refundRequest);
    Task<bool> ValidatePaymentMethodAsync(PaymentMethodValidationRequest request);
}