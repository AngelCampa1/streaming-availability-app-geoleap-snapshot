namespace GeoLeap.Api.Services;

/// <summary>
/// Mock email service for development and testing
/// </summary>
public class MockEmailService : IEmailService
{
    private readonly ILogger<MockEmailService> _logger;

    public MockEmailService(ILogger<MockEmailService> logger)
    {
        _logger = logger;
    }

    public async Task<bool> SendEmailVerificationAsync(string email, string firstName, string verificationToken)
    {
        _logger.LogInformation("Mock Email verification sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendWelcomeEmailAsync(string email, string firstName)
    {
        _logger.LogInformation("Mock Welcome email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendPasswordResetEmailAsync(string email, string resetToken, string firstName)
    {
        _logger.LogInformation("Mock Password reset email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendPasswordResetConfirmationEmailAsync(string email, string firstName)
    {
        _logger.LogInformation("Mock Password reset confirmation sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendPasswordChangeNotificationEmailAsync(string email, string firstName)
    {
        _logger.LogInformation("Mock Password change notification sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendEmailChangeVerificationAsync(string email, string firstName, string verificationToken)
    {
        _logger.LogInformation("Mock Email change verification sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendEmailChangeNotificationAsync(string email, string firstName, string newEmail, bool isConfirmation = false)
    {
        _logger.LogInformation("Mock Email change notification sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendEmailChangeConfirmationAsync(string email, string firstName)
    {
        _logger.LogInformation("Mock Email change confirmation sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendSubscriptionCreatedEmailAsync(string email, string firstName, string planType, decimal amount, string interval)
    {
        _logger.LogInformation("Mock Subscription created email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendSubscriptionUpgradedEmailAsync(string email, string firstName, string oldPlan, string newPlan, decimal newAmount, string interval)
    {
        _logger.LogInformation("Mock Subscription upgraded email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendSubscriptionDowngradedEmailAsync(string email, string firstName, string oldPlan, string newPlan, decimal newAmount, string interval)
    {
        _logger.LogInformation("Mock Subscription downgraded email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendSubscriptionCancelledEmailAsync(string email, string firstName, string planType, string accessEndDate)
    {
        _logger.LogInformation("Mock Subscription cancelled email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendSubscriptionReactivatedEmailAsync(string email, string firstName, string planType, decimal amount, string interval)
    {
        _logger.LogInformation("Mock Subscription reactivated email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendPaymentFailedEmailAsync(string email, string firstName, string planType, decimal amount, string nextRetryDate)
    {
        _logger.LogInformation("Mock Payment failed email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendAsync(string email, string subject, string body, Dictionary<string, object>? data = null)
    {
        _logger.LogInformation("Mock Email sent to {Email}: {Subject}", email, subject);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendSubscriptionExpiringEmailAsync(string email, string firstName, string planType, string expiryDate)
    {
        _logger.LogInformation("Mock Subscription expiring email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendSubscriptionWelcomeEmailAsync(string email, string firstName, string planType)
    {
        _logger.LogInformation("Mock Subscription welcome email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendPlainEmailAsync(string email, string subject, string body, string correlationId)
    {
        _logger.LogInformation("Mock Plain email sent to {Email}: {Subject}", email, subject);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendEmailWithAttachmentsAsync(string email, string subject, string body, Dictionary<string, byte[]> attachments, string correlationId)
    {
        _logger.LogInformation("Mock Email with attachments sent to {Email}: {Subject}", email, subject);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendBulkSubscriptionEmailAsync(IEnumerable<string> emails, string templateId, string subject)
    {
        _logger.LogInformation("Mock Bulk subscription email sent to {Count} recipients", emails.Count());
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendPaymentReceiptEmailAsync(string email, string firstName, decimal amount, string currency, string transactionId, string planType)
    {
        _logger.LogInformation("Mock Payment receipt email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendSubscriptionUpgradeEmailAsync(string email, string firstName, string oldPlan, string newPlan, decimal newAmount, string interval)
    {
        _logger.LogInformation("Mock Subscription upgrade email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendSubscriptionCancellationEmailAsync(string email, string firstName, string planType, string accessEndDate)
    {
        _logger.LogInformation("Mock Subscription cancellation email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendInvoiceEmailAsync(string email, string firstName, string invoiceNumber, decimal amount, string currency, byte[] pdfContent)
    {
        _logger.LogInformation("Mock Invoice email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendTrialExpiringEmailAsync(string email, string firstName, string planType, string expiryDate)
    {
        _logger.LogInformation("Mock Trial expiring email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendAccountSuspensionEmailAsync(string email, string firstName, string reason)
    {
        _logger.LogInformation("Mock Account suspension email sent to {Email}", email);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendMarketingEmailAsync(string email, string firstName, string subject, string body)
    {
        _logger.LogInformation("Mock Marketing email sent to {Email}: {Subject}", email, subject);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string body)
    {
        _logger.LogInformation("Mock Email sent to {Email}: {Subject}", toEmail, subject);
        await Task.Delay(100);
        return true;
    }

    public async Task<bool> SendTemplateEmailAsync(string toEmail, string templateId, Dictionary<string, object> templateData)
    {
        _logger.LogInformation("Mock Template email sent to {Email} using template {TemplateId}", toEmail, templateId);
        await Task.Delay(100);
        return true;
    }
}

/// <summary>
/// Mock SMS service for development and testing
/// </summary>
public class MockSmsService : ISmsService
{
    private readonly ILogger<MockSmsService> _logger;

    public MockSmsService(ILogger<MockSmsService> logger)
    {
        _logger = logger;
    }

    public async Task<bool> SendSmsAsync(string phoneNumber, string message, string correlationId)
    {
        _logger.LogInformation("Mock SMS sent to {PhoneNumber}: {Message} (ID: {CorrelationId})", phoneNumber, message, correlationId);
        await Task.Delay(50);
        return true;
    }

    public async Task<bool> SendSmsAsync(string phoneNumber, string message, string correlationId, Dictionary<string, object>? metadata = null)
    {
        _logger.LogInformation("Mock SMS with metadata sent to {PhoneNumber}: {Message} (ID: {CorrelationId})", phoneNumber, message, correlationId);
        await Task.Delay(50);
        return true;
    }

    public async Task<bool> SendSmsAsync(string phoneNumber, string message)
    {
        _logger.LogInformation("Mock SMS sent to {PhoneNumber}: {Message}", phoneNumber, message);
        await Task.Delay(50);
        return true;
    }

    public async Task<bool> VerifyPhoneNumberAsync(string phoneNumber, string correlationId)
    {
        _logger.LogInformation("Mock phone number verification for {PhoneNumber} (ID: {CorrelationId})", phoneNumber, correlationId);
        await Task.Delay(50);
        return true;
    }

    public async Task<Dictionary<string, object>> GetSmsDeliveryStatusAsync(string externalId)
    {
        _logger.LogInformation("Mock SMS delivery status check for {ExternalId}", externalId);
        await Task.Delay(50);
        return new Dictionary<string, object>
        {
            ["status"] = "delivered",
            ["deliveredAt"] = DateTime.UtcNow,
            ["externalId"] = externalId
        };
    }
}