using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface ISupportService
{
    // Customer Billing Data Access (with RBAC and Data Masking)
    Task<CustomerBillingDataResponse> GetCustomerBillingDataAsync(Guid customerId, Guid supportAgentId, string justification, string? correlationId = null);
    Task<bool> HasBillingDataAccessAsync(Guid supportAgentId, string accessType);
    Task LogBillingDataAccessAsync(Guid supportAgentId, Guid customerId, string accessType, string? resource = null, string? justification = null, string? correlationId = null);

    // Manual Payment Processing
    Task<PaymentTransaction> ProcessManualPaymentAsync(ManualPaymentRequest request, Guid supportAgentId, string? correlationId = null);
    Task<PaymentTransaction> VoidPaymentTransactionAsync(Guid transactionId, Guid supportAgentId, string reason, string? correlationId = null);
    Task<List<PaymentTransaction>> GetPendingPaymentTransactionsAsync(int page = 1, int pageSize = 50);

    // Subscription Modification Tools
    Task<SupportAction> CreateSubscriptionModificationAsync(SubscriptionModificationRequest request, Guid supportAgentId, string? correlationId = null);
    Task<Models.Subscription> ApplySubscriptionModificationAsync(Guid supportActionId, Guid approverUserId, string? correlationId = null);
    Task<Models.Subscription> PauseSubscriptionAsync(Guid subscriptionId, Guid supportAgentId, DateTime? resumeDate = null, string? reason = null, string? correlationId = null);
    Task<Models.Subscription> ResumeSubscriptionAsync(Guid subscriptionId, Guid supportAgentId, string? reason = null, string? correlationId = null);

    // Invoice Regeneration and Delivery
    Task<Models.Invoice> RegenerateInvoiceAsync(Guid invoiceId, Guid supportAgentId, bool sendToCustomer = true, string? correlationId = null);
    Task<Models.Invoice> CreateManualInvoiceAsync(Guid customerId, List<Models.InvoiceLineItem> lineItems, Guid supportAgentId, string? correlationId = null);
    Task<bool> ResendInvoiceAsync(Guid invoiceId, Guid supportAgentId, string deliveryMethod = "email", string? correlationId = null);
    Task<List<Models.Invoice>> GetFailedInvoiceDeliveriesAsync(int page = 1, int pageSize = 50);

    // Refund Processing Workflow
    Task<SupportRefund> ProcessRefundAsync(ProcessRefundRequest request, Guid supportAgentId, string? correlationId = null);
    Task<SupportRefund> GetRefundStatusAsync(Guid refundId);
    Task<List<SupportRefund>> GetPendingRefundsAsync(int page = 1, int pageSize = 50);
    Task<SupportRefund> CancelRefundAsync(Guid refundId, Guid supportAgentId, string reason, string? correlationId = null);

    // Support Action Management
    Task<SupportAction> CreateSupportActionAsync(CreateSupportActionRequest request, Guid supportAgentId, string? correlationId = null);
    Task<SupportAction> GetSupportActionAsync(Guid supportActionId);
    Task<List<SupportAction>> GetSupportActionsAsync(Guid? userId = null, SupportActionStatus? status = null, SupportActionType? actionType = null, int page = 1, int pageSize = 50);
    Task<SupportAction> UpdateSupportActionStatusAsync(Guid supportActionId, SupportActionStatus status, Guid userId, string? notes = null, string? correlationId = null);
    Task<SupportAction> ApproveSupportActionAsync(Guid supportActionId, Guid approverUserId, string? notes = null, string? correlationId = null);
    Task<SupportAction> RejectSupportActionAsync(Guid supportActionId, Guid rejectorUserId, string reason, string? correlationId = null);

    // Audit Trail and Logging
    Task LogSupportActionAsync(Guid supportActionId, Guid userId, string eventName, string? description = null, object? oldValues = null, object? newValues = null, string? ipAddress = null, string? userAgent = null, string? correlationId = null);
    Task<List<SupportActionAuditLog>> GetSupportActionAuditLogsAsync(Guid supportActionId, int page = 1, int pageSize = 50);
    Task<List<CustomerBillingAccessLog>> GetBillingAccessLogsAsync(Guid? customerId = null, Guid? supportAgentId = null, DateTime? fromDate = null, DateTime? toDate = null, int page = 1, int pageSize = 50);

    // Data Export and Reporting
    Task<Stream> ExportCustomerBillingDataAsync(Guid customerId, Guid supportAgentId, string format = "csv", string? correlationId = null);
    Task<Stream> ExportSupportActionsReportAsync(DateTime fromDate, DateTime toDate, Guid requestingUserId, string format = "csv", string? correlationId = null);
    Task<Dictionary<string, object>> GetSupportMetricsAsync(DateTime fromDate, DateTime toDate, Guid? supportAgentId = null);

    // Customer Account Management
    Task<User> UpdateCustomerBillingAddressAsync(Guid customerId, BillingAddress newAddress, Guid supportAgentId, string? correlationId = null);
    Task<User> ApplyAccountCreditAsync(Guid customerId, decimal creditAmount, string reason, Guid supportAgentId, string? correlationId = null);
    Task<User> FreezeCustomerAccountAsync(Guid customerId, Guid supportAgentId, string reason, DateTime? unfreezeDate = null, string? correlationId = null);
    Task<User> UnfreezeCustomerAccountAsync(Guid customerId, Guid supportAgentId, string? reason = null, string? correlationId = null);

    // Dunning and Recovery Override
    Task<DunningCampaignExecution> OverrideDunningProcessAsync(Guid failedPaymentId, Guid supportAgentId, string action, string reason, string? correlationId = null);
    Task<GracePeriod> ExtendGracePeriodAsync(Guid gracePeriodId, int additionalDays, Guid supportAgentId, string reason, string? correlationId = null);

    // Payment Method Management
    Task<Models.PaymentMethod> UpdateCustomerPaymentMethodAsync(Guid customerId, Guid paymentMethodId, Guid supportAgentId, Dictionary<string, object> updates, string? correlationId = null);
    Task<Models.PaymentMethod> RemoveCustomerPaymentMethodAsync(Guid customerId, Guid paymentMethodId, Guid supportAgentId, string reason, string? correlationId = null);
    Task<Models.PaymentMethod> SetDefaultPaymentMethodAsync(Guid customerId, Guid paymentMethodId, Guid supportAgentId, string? correlationId = null);

    // Approval Workflows
    Task<List<SupportAction>> GetPendingApprovalsAsync(Guid? approverUserId = null, int page = 1, int pageSize = 50);
    Task<bool> CanApproveActionAsync(Guid supportActionId, Guid userId);
    Task<List<string>> GetRequiredPermissionsForActionAsync(SupportActionType actionType);

    // Notification and Communication
    Task<bool> SendCustomerNotificationAsync(Guid customerId, string template, Dictionary<string, object> parameters, Guid supportAgentId, string? correlationId = null);
    Task<bool> SendInternalNotificationAsync(Guid userId, string message, SupportPriority priority, Guid senderUserId, string? correlationId = null);

    // Configuration and Settings
    Task<Dictionary<string, object>> GetSupportConfigurationAsync();
    Task UpdateSupportConfigurationAsync(string key, object value, Guid userId, string? correlationId = null);
    Task<List<string>> GetAvailablePaymentMethodsAsync();
    Task<List<string>> GetAvailableRefundMethodsAsync();
}