using Resend;

namespace GeoLeap.Api.Services;

/// <summary>
/// Email service implementation using Resend API
/// Replaces AcsEmailService for transactional email delivery
/// </summary>
public class ResendEmailService : IEmailService
{
    private readonly ILogger<ResendEmailService> _logger;
    private readonly IConfiguration _configuration;
    private readonly IResend _resendClient;
    private readonly string _fromAddress;
    private readonly string _fromName;

    public ResendEmailService(
        ILogger<ResendEmailService> logger,
        IConfiguration configuration,
        IResend resendClient)
    {
        _logger = logger;
        _configuration = configuration;
        _resendClient = resendClient;

        _fromAddress = configuration["Resend:FromAddress"]
            ?? throw new InvalidOperationException("Resend:FromAddress not configured");
        _fromName = configuration["Resend:FromName"] ?? "GeoLeap";
    }

    public async Task<bool> SendWelcomeEmailAsync(string email, string firstName)
    {
        var subject = "Welcome to GeoLeap - Your Global Streaming Journey Begins!";
        var htmlBody = GetWelcomeEmailHtml(firstName);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendPasswordResetEmailAsync(string email, string resetToken, string firstName)
    {
        var baseUrl = _configuration["App:BaseUrl"] ?? "https://geoleap.com";
        var resetUrl = $"{baseUrl}/reset-password?token={Uri.EscapeDataString(resetToken)}";
        var subject = "Reset Your Password - GeoLeap";
        var htmlBody = GetPasswordResetEmailHtml(firstName, resetUrl);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendPasswordResetConfirmationEmailAsync(string email, string firstName)
    {
        var subject = "Password Reset Successful - GeoLeap";
        var htmlBody = GetPasswordResetConfirmationHtml(firstName);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendPasswordChangeNotificationEmailAsync(string email, string firstName)
    {
        var subject = "Password Changed - GeoLeap";
        var htmlBody = GetPasswordChangeNotificationHtml(firstName);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendEmailChangeVerificationAsync(string email, string firstName, string verificationToken)
    {
        var baseUrl = _configuration["App:BaseUrl"] ?? "https://geoleap.com";
        var verifyUrl = $"{baseUrl}/verify-email?token={Uri.EscapeDataString(verificationToken)}";
        var subject = "Verify Your New Email - GeoLeap";
        var htmlBody = GetEmailChangeVerificationHtml(firstName, verifyUrl);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendEmailChangeNotificationAsync(string email, string firstName, string newEmail, bool isConfirmation = false)
    {
        var subject = isConfirmation ? "Email Changed Successfully - GeoLeap" : "Email Change Request - GeoLeap";
        var htmlBody = GetEmailChangeNotificationHtml(firstName, newEmail, isConfirmation);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendEmailChangeConfirmationAsync(string email, string firstName)
    {
        var subject = "Email Changed Successfully - GeoLeap";
        var htmlBody = GetEmailChangeConfirmationHtml(firstName);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendSubscriptionCreatedEmailAsync(string email, string firstName, string planType, decimal amount, string interval)
    {
        var subject = $"Welcome to GeoLeap {planType}!";
        var htmlBody = GetSubscriptionCreatedHtml(firstName, planType, amount, interval);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendSubscriptionUpgradedEmailAsync(string email, string firstName, string oldPlan, string newPlan, decimal newAmount, string interval)
    {
        var subject = $"Upgrade Successful - Welcome to {newPlan}!";
        var htmlBody = GetSubscriptionUpgradedHtml(firstName, oldPlan, newPlan, newAmount, interval);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendSubscriptionDowngradedEmailAsync(string email, string firstName, string oldPlan, string newPlan, decimal newAmount, string interval)
    {
        var subject = "Subscription Change Confirmed";
        var htmlBody = GetSubscriptionDowngradedHtml(firstName, oldPlan, newPlan, newAmount, interval);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendSubscriptionCancelledEmailAsync(string email, string firstName, string planType, string accessEndDate)
    {
        var subject = "Subscription Cancelled - We're Sorry to See You Go";
        var htmlBody = GetSubscriptionCancelledHtml(firstName, planType, accessEndDate);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendSubscriptionReactivatedEmailAsync(string email, string firstName, string planType, decimal amount, string interval)
    {
        var subject = "Welcome Back to GeoLeap!";
        var htmlBody = GetSubscriptionReactivatedHtml(firstName, planType, amount, interval);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendPaymentFailedEmailAsync(string email, string firstName, string planType, decimal amount, string nextRetryDate)
    {
        var subject = "Payment Failed - Action Required";
        var htmlBody = GetPaymentFailedHtml(firstName, planType, amount, nextRetryDate);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendAsync(string email, string subject, string body, Dictionary<string, object>? data = null)
    {
        return await SendEmailInternalAsync(email, subject, body);
    }

    public async Task<bool> SendSubscriptionExpiringEmailAsync(string email, string firstName, string planType, string expiryDate)
    {
        var subject = "Your Subscription is Expiring Soon";
        var htmlBody = GetSubscriptionExpiringHtml(firstName, planType, expiryDate);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendSubscriptionWelcomeEmailAsync(string email, string firstName, string planType)
    {
        var subject = $"Welcome to GeoLeap {planType}!";
        var htmlBody = GetSubscriptionWelcomeHtml(firstName, planType);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendPlainEmailAsync(string email, string subject, string body, string correlationId)
    {
        _logger.LogInformation("Sending plain email to {Email} with correlation {CorrelationId}", email, correlationId);
        return await SendEmailInternalAsync(email, subject, body);
    }

    public async Task<bool> SendEmailWithAttachmentsAsync(string email, string subject, string body, Dictionary<string, byte[]> attachments, string correlationId)
    {
        try
        {
            _logger.LogInformation("Sending email with {AttachmentCount} attachments to {Email}", attachments.Count, email);

            var message = new EmailMessage();
            message.From = $"{_fromName} <{_fromAddress}>";
            message.To.Add(email);
            message.Subject = subject;
            message.HtmlBody = body;
            message.TextBody = StripHtml(body);

            foreach (var attachment in attachments)
            {
                message.Attachments.Add(new EmailAttachment
                {
                    Filename = attachment.Key,
                    Content = attachment.Value,
                    ContentType = GetContentType(attachment.Key)
                });
            }

            var response = await _resendClient.EmailSendAsync(message);

            _logger.LogInformation("Email with attachments sent successfully. MessageId: {MessageId}", response.Content);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email with attachments to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendBulkSubscriptionEmailAsync(IEnumerable<string> emails, string templateId, string subject)
    {
        var successCount = 0;
        var emailList = emails.ToList();

        foreach (var email in emailList)
        {
            var result = await SendEmailInternalAsync(email, subject, $"<p>Template: {templateId}</p>");
            if (result) successCount++;
        }

        _logger.LogInformation("Bulk email sent to {SuccessCount}/{TotalCount} recipients", successCount, emailList.Count);
        return successCount > 0;
    }

    public async Task<bool> SendPaymentReceiptEmailAsync(string email, string firstName, decimal amount, string currency, string transactionId, string planType)
    {
        var subject = "Payment Receipt - GeoLeap";
        var htmlBody = GetPaymentReceiptHtml(firstName, amount, currency, transactionId, planType);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendSubscriptionUpgradeEmailAsync(string email, string firstName, string oldPlan, string newPlan, decimal newAmount, string interval)
    {
        return await SendSubscriptionUpgradedEmailAsync(email, firstName, oldPlan, newPlan, newAmount, interval);
    }

    public async Task<bool> SendSubscriptionCancellationEmailAsync(string email, string firstName, string planType, string accessEndDate)
    {
        return await SendSubscriptionCancelledEmailAsync(email, firstName, planType, accessEndDate);
    }

    public async Task<bool> SendInvoiceEmailAsync(string email, string firstName, string invoiceNumber, decimal amount, string currency, byte[] pdfContent)
    {
        var subject = $"Invoice {invoiceNumber} - GeoLeap";
        var body = GetInvoiceEmailHtml(firstName, invoiceNumber, amount, currency);
        var attachments = new Dictionary<string, byte[]> { { $"Invoice-{invoiceNumber}.pdf", pdfContent } };
        return await SendEmailWithAttachmentsAsync(email, subject, body, attachments, invoiceNumber);
    }

    public async Task<bool> SendTrialExpiringEmailAsync(string email, string firstName, string planType, string expiryDate)
    {
        var subject = "Your Trial is Ending Soon - GeoLeap";
        var htmlBody = GetTrialExpiringHtml(firstName, planType, expiryDate);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendAccountSuspensionEmailAsync(string email, string firstName, string reason)
    {
        var subject = "Account Suspended - GeoLeap";
        var htmlBody = GetAccountSuspensionHtml(firstName, reason);
        return await SendEmailInternalAsync(email, subject, htmlBody);
    }

    public async Task<bool> SendMarketingEmailAsync(string email, string firstName, string subject, string body)
    {
        return await SendEmailInternalAsync(email, subject, body);
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string body)
    {
        return await SendEmailInternalAsync(toEmail, subject, body);
    }

    public async Task<bool> SendTemplateEmailAsync(string toEmail, string templateId, Dictionary<string, object> templateData)
    {
        var subject = templateData.TryGetValue("subject", out var s) ? s.ToString() : "GeoLeap Notification";
        var body = templateData.TryGetValue("body", out var b) ? b.ToString() : "";
        return await SendEmailInternalAsync(toEmail, subject ?? "GeoLeap Notification", body ?? "");
    }

    private async Task<bool> SendEmailInternalAsync(string toEmail, string subject, string htmlBody)
    {
        try
        {
            var message = new EmailMessage();
            message.From = $"{_fromName} <{_fromAddress}>";
            message.To.Add(toEmail);
            message.Subject = subject;
            message.HtmlBody = htmlBody;
            message.TextBody = StripHtml(htmlBody);

            var response = await _resendClient.EmailSendAsync(message);

            _logger.LogInformation("Email sent successfully to {Email} via Resend. MessageId: {MessageId}", toEmail, response.Content);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email} via Resend. Subject: {Subject}", toEmail, subject);
            return false;
        }
    }

    private static string StripHtml(string html)
    {
        return System.Text.RegularExpressions.Regex.Replace(html, "<[^>]*>", " ")
            .Replace("&nbsp;", " ")
            .Replace("  ", " ")
            .Trim();
    }

    private static string GetContentType(string fileName)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return extension switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".csv" => "text/csv",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            _ => "application/octet-stream"
        };
    }

    #region Email Templates

    private string GetWelcomeEmailHtml(string firstName)
    {
        var baseUrl = _configuration["App:BaseUrl"] ?? "https://geoleap.com";
        return $@"
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'><title>Welcome to GeoLeap</title></head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0;'>Welcome to GeoLeap!</h1>
    </div>
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px;'>
        <h2>Hi {firstName}!</h2>
        <p>Your GeoLeap account is now active. Start discovering streaming content from around the world!</p>
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{baseUrl}/dashboard' style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;'>Start Exploring</a>
        </div>
    </div>
    <div style='text-align: center; font-size: 12px; color: #999; margin-top: 20px;'>
        <p>&copy; {DateTime.UtcNow.Year} GeoLeap. All rights reserved.</p>
    </div>
</body>
</html>";
    }

    private string GetPasswordResetEmailHtml(string firstName, string resetUrl)
    {
        return $@"
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'><title>Reset Your Password</title></head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0;'>Password Reset</h1>
    </div>
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px;'>
        <h2>Hi {firstName},</h2>
        <p>We received a request to reset your password. Click the button below to create a new password.</p>
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{resetUrl}' style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;'>Reset Password</a>
        </div>
        <p style='font-size: 14px; color: #666;'>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
    </div>
</body>
</html>";
    }

    private string GetPasswordResetConfirmationHtml(string firstName) => GetGenericNotificationHtml(firstName, "Password Reset Successful", "Your password has been successfully reset. You can now log in with your new password.");
    private string GetPasswordChangeNotificationHtml(string firstName) => GetGenericNotificationHtml(firstName, "Password Changed", "Your password was recently changed. If you didn't make this change, please contact support immediately.");
    private string GetEmailChangeVerificationHtml(string firstName, string verifyUrl) => $@"
<!DOCTYPE html>
<html>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <h2>Hi {firstName},</h2>
    <p>Please verify your new email address by clicking the button below.</p>
    <div style='text-align: center; margin: 30px 0;'>
        <a href='{verifyUrl}' style='background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px;'>Verify Email</a>
    </div>
</body>
</html>";
    private string GetEmailChangeNotificationHtml(string firstName, string newEmail, bool isConfirmation) => GetGenericNotificationHtml(firstName, isConfirmation ? "Email Changed" : "Email Change Request", isConfirmation ? $"Your email has been changed to {newEmail}." : $"A request was made to change your email to {newEmail}.");
    private string GetEmailChangeConfirmationHtml(string firstName) => GetGenericNotificationHtml(firstName, "Email Changed Successfully", "Your email address has been successfully updated.");
    private string GetSubscriptionCreatedHtml(string firstName, string planType, decimal amount, string interval) => GetGenericNotificationHtml(firstName, $"Welcome to {planType}!", $"Your subscription is now active. You'll be charged ${amount:F2}/{interval}.");
    private string GetSubscriptionUpgradedHtml(string firstName, string oldPlan, string newPlan, decimal newAmount, string interval) => GetGenericNotificationHtml(firstName, "Upgrade Successful", $"You've upgraded from {oldPlan} to {newPlan}. New rate: ${newAmount:F2}/{interval}.");
    private string GetSubscriptionDowngradedHtml(string firstName, string oldPlan, string newPlan, decimal newAmount, string interval) => GetGenericNotificationHtml(firstName, "Plan Changed", $"Your plan has changed from {oldPlan} to {newPlan}. New rate: ${newAmount:F2}/{interval}.");
    private string GetSubscriptionCancelledHtml(string firstName, string planType, string accessEndDate) => GetGenericNotificationHtml(firstName, "Subscription Cancelled", $"Your {planType} subscription has been cancelled. You'll have access until {accessEndDate}.");
    private string GetSubscriptionReactivatedHtml(string firstName, string planType, decimal amount, string interval) => GetGenericNotificationHtml(firstName, "Welcome Back!", $"Your {planType} subscription is active again at ${amount:F2}/{interval}.");
    private string GetPaymentFailedHtml(string firstName, string planType, decimal amount, string nextRetryDate) => GetGenericNotificationHtml(firstName, "Payment Failed", $"We couldn't process your ${amount:F2} payment for {planType}. We'll retry on {nextRetryDate}. Please update your payment method.");
    private string GetSubscriptionExpiringHtml(string firstName, string planType, string expiryDate) => GetGenericNotificationHtml(firstName, "Subscription Expiring", $"Your {planType} subscription expires on {expiryDate}. Renew now to keep your access.");
    private string GetSubscriptionWelcomeHtml(string firstName, string planType) => GetGenericNotificationHtml(firstName, $"Welcome to {planType}!", "Thank you for subscribing! Enjoy all the premium features.");
    private string GetPaymentReceiptHtml(string firstName, decimal amount, string currency, string transactionId, string planType) => GetGenericNotificationHtml(firstName, "Payment Receipt", $"Payment of {currency} {amount:F2} for {planType} received. Transaction ID: {transactionId}");
    private string GetInvoiceEmailHtml(string firstName, string invoiceNumber, decimal amount, string currency) => GetGenericNotificationHtml(firstName, $"Invoice {invoiceNumber}", $"Please find attached your invoice for {currency} {amount:F2}.");
    private string GetTrialExpiringHtml(string firstName, string planType, string expiryDate) => GetGenericNotificationHtml(firstName, "Trial Ending Soon", $"Your {planType} trial expires on {expiryDate}. Subscribe now to continue enjoying premium features!");
    private string GetAccountSuspensionHtml(string firstName, string reason) => GetGenericNotificationHtml(firstName, "Account Suspended", $"Your account has been suspended. Reason: {reason}. Please contact support.");

    private string GetGenericNotificationHtml(string firstName, string title, string message)
    {
        return $@"
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'><title>{title}</title></head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0;'>{title}</h1>
    </div>
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px;'>
        <h2>Hi {firstName},</h2>
        <p>{message}</p>
    </div>
    <div style='text-align: center; font-size: 12px; color: #999; margin-top: 20px;'>
        <p>&copy; {DateTime.UtcNow.Year} GeoLeap. All rights reserved.</p>
    </div>
</body>
</html>";
    }

    #endregion
}
