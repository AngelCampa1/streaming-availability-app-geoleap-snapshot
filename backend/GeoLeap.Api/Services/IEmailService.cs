namespace GeoLeap.Api.Services;

public interface IEmailService
{
    Task<bool> SendWelcomeEmailAsync(string email, string firstName);
    Task<bool> SendPasswordResetEmailAsync(string email, string resetToken, string firstName);
    Task<bool> SendPasswordResetConfirmationEmailAsync(string email, string firstName);
    Task<bool> SendPasswordChangeNotificationEmailAsync(string email, string firstName);
    Task<bool> SendEmailChangeVerificationAsync(string email, string firstName, string verificationToken);
    Task<bool> SendEmailChangeNotificationAsync(string email, string firstName, string newEmail, bool isConfirmation = false);
    Task<bool> SendEmailChangeConfirmationAsync(string email, string firstName);
    
    // Subscription-related email notifications
    Task<bool> SendSubscriptionCreatedEmailAsync(string email, string firstName, string planType, decimal amount, string interval);
    Task<bool> SendSubscriptionUpgradedEmailAsync(string email, string firstName, string oldPlan, string newPlan, decimal newAmount, string interval);
    Task<bool> SendSubscriptionDowngradedEmailAsync(string email, string firstName, string oldPlan, string newPlan, decimal newAmount, string interval);
    Task<bool> SendSubscriptionCancelledEmailAsync(string email, string firstName, string planType, string accessEndDate);
    Task<bool> SendSubscriptionReactivatedEmailAsync(string email, string firstName, string planType, decimal amount, string interval);
    Task<bool> SendPaymentFailedEmailAsync(string email, string firstName, string planType, decimal amount, string nextRetryDate);
    
    // Generic notification email method
    Task<bool> SendAsync(string email, string subject, string body, Dictionary<string, object>? data = null);
    Task<bool> SendSubscriptionExpiringEmailAsync(string email, string firstName, string planType, string expiryDate);
    Task<bool> SendSubscriptionWelcomeEmailAsync(string email, string firstName, string planType);
    
    // General email methods for invoice delivery
    Task<bool> SendPlainEmailAsync(string email, string subject, string body, string correlationId);
    Task<bool> SendEmailWithAttachmentsAsync(string email, string subject, string body, Dictionary<string, byte[]> attachments, string correlationId);
    
    // Bulk subscription email methods
    Task<bool> SendBulkSubscriptionEmailAsync(IEnumerable<string> emails, string templateId, string subject);
    
    // Additional compatibility methods for tests
    Task<bool> SendPaymentReceiptEmailAsync(string email, string firstName, decimal amount, string currency, string transactionId, string planType);
    
    // Missing methods for test compatibility
    Task<bool> SendSubscriptionUpgradeEmailAsync(string email, string firstName, string oldPlan, string newPlan, decimal newAmount, string interval);
    Task<bool> SendSubscriptionCancellationEmailAsync(string email, string firstName, string planType, string accessEndDate);
    Task<bool> SendInvoiceEmailAsync(string email, string firstName, string invoiceNumber, decimal amount, string currency, byte[] pdfContent);
    Task<bool> SendTrialExpiringEmailAsync(string email, string firstName, string planType, string expiryDate);
    Task<bool> SendAccountSuspensionEmailAsync(string email, string firstName, string reason);
    Task<bool> SendMarketingEmailAsync(string email, string firstName, string subject, string body);
    
    // Generic email method for AdminNotificationService compatibility
    Task<bool> SendEmailAsync(string toEmail, string subject, string body);
    
    // Template email method for SupportService compatibility
    Task<bool> SendTemplateEmailAsync(string toEmail, string templateId, Dictionary<string, object> templateData);
}