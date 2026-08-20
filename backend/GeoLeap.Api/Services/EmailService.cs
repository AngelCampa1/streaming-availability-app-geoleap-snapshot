using System.Net;
using System.Net.Mail;
using Polly;
using Polly.Retry;

namespace GeoLeap.Api.Services;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly IConfiguration _configuration;
    private readonly AsyncRetryPolicy _retryPolicy;

    // In-memory queue for failed emails (for basic retry functionality)
    private static readonly System.Collections.Concurrent.ConcurrentQueue<FailedEmailInfo> _failedEmailQueue = new();

    public EmailService(ILogger<EmailService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;

        // Configure retry policy: 3 attempts with exponential backoff (1s, 2s, 4s)
        _retryPolicy = Policy
            .Handle<Exception>()
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt - 1)),
                onRetry: (exception, timeSpan, retryCount, context) =>
                {
                    _logger.LogWarning(
                        "Email send attempt {RetryCount} failed. Retrying in {DelaySeconds}s. Error: {ErrorMessage}",
                        retryCount,
                        timeSpan.TotalSeconds,
                        exception.Message);
                });
    }


    public async Task<bool> SendWelcomeEmailAsync(string email, string firstName)
    {
        try
        {
            var subject = "Welcome to GeoLeap - Your Global Streaming Journey Begins!";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Welcome to GeoLeap</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>🎉 Welcome to GeoLeap!</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Your account is now active</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            Congratulations! Your GeoLeap account is now active and you're ready to discover streaming content from around the world.
        </p>
        
        <h3 style='color: #667eea; margin-top: 25px;'>🌍 What's Next?</h3>
        <ul style='font-size: 15px; padding-left: 20px;'>
            <li style='margin-bottom: 10px;'><strong>Start Searching:</strong> Find your favorite movies and shows across global streaming platforms</li>
            <li style='margin-bottom: 10px;'><strong>Discover New Content:</strong> Explore what's available in different countries</li>
            <li style='margin-bottom: 10px;'><strong>Save Favorites:</strong> Keep track of content you want to watch</li>
            <li style='margin-bottom: 10px;'><strong>Get VPN Guidance:</strong> We'll help you access content safely and legally</li>
        </ul>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{_configuration["App:BaseUrl"]}/dashboard' 
               style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                Start Exploring
            </a>
        </div>
        
        <div style='background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-top: 25px;'>
            <h4 style='color: #1565c0; margin-top: 0;'>💡 Pro Tip</h4>
            <p style='margin-bottom: 0; font-size: 14px; color: #333;'>
                Did you know? Different streaming platforms have different content libraries in different countries. 
                GeoLeap helps you discover what's available where, so you never miss out on great content!
            </p>
        </div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>
            Need help? Visit our <a href='{_configuration["App:BaseUrl"]}/help' style='color: #667eea;'>Help Center</a> 
            or <a href='mailto:support@geoleap.com' style='color: #667eea;'>contact support</a>.
        </p>
        <p style='margin-top: 10px;'>
            © 2025 GeoLeap. All rights reserved.
        </p>
    </div>
</body>
</html>";

            var textBody = $@"
Welcome to GeoLeap!

Hi {firstName},

Congratulations! Your GeoLeap account is now active and you're ready to discover streaming content from around the world.

What's Next?
- Start Searching: Find your favorite movies and shows across global streaming platforms
- Discover New Content: Explore what's available in different countries
- Save Favorites: Keep track of content you want to watch
- Get VPN Guidance: We'll help you access content safely and legally

Visit your dashboard: {_configuration["App:BaseUrl"]}/dashboard

Pro Tip: Different streaming platforms have different content libraries in different countries. GeoLeap helps you discover what's available where, so you never miss out on great content!

Need help? Visit our Help Center or contact support at support@geoleap.com.

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send welcome email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendPasswordResetEmailAsync(string email, string resetToken, string firstName)
    {
        try
        {
            var subject = "Reset Your GeoLeap Password";
            var resetUrl = $"{_configuration["App:BaseUrl"]}/auth/reset-password?token={resetToken}&email={Uri.EscapeDataString(email)}";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Reset Your Password</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>Reset Your Password</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>GeoLeap Account Security</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            We received a request to reset your password for your GeoLeap account. If you made this request, 
            click the button below to create a new password.
        </p>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{resetUrl}' 
               style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                Reset Password
            </a>
        </div>
        
        <p style='font-size: 14px; color: #666; margin-top: 20px;'>
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href='{resetUrl}' style='color: #667eea; word-break: break-all;'>{resetUrl}</a>
        </p>
        
        <div style='background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-top: 25px;'>
            <p style='margin: 0; font-size: 14px; color: #856404;'>
                <strong>⚠️ Security Notice:</strong> This password reset link will expire in 1 hour for security reasons. 
                If you didn't request this password reset, please ignore this email or contact support.
            </p>
        </div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>
            This email was sent to {email}. If you didn't request a password reset, 
            please <a href='mailto:support@geoleap.com' style='color: #667eea;'>contact support</a> immediately.
        </p>
        <p style='margin-top: 10px;'>
            © 2025 GeoLeap. All rights reserved.
        </p>
    </div>
</body>
</html>";

            var textBody = $@"
Reset Your Password - GeoLeap

Hi {firstName},

We received a request to reset your password for your GeoLeap account. If you made this request, use the link below to create a new password.

Reset Link: {resetUrl}

Security Notice: This password reset link will expire in 1 hour for security reasons. If you didn't request this password reset, please ignore this email or contact support.

This email was sent to {email}. If you didn't request a password reset, please contact support at support@geoleap.com immediately.

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendPasswordResetConfirmationEmailAsync(string email, string firstName)
    {
        try
        {
            var subject = "Password Reset Successful - GeoLeap";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Password Reset Successful</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>✅ Password Reset Successful</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Your GeoLeap account is secure</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            Your password has been successfully reset for your GeoLeap account. Your account is now secure with your new password.
        </p>
        
        <div style='background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;'>
            <p style='margin: 0; font-size: 14px; color: #155724;'>
                <strong>🔒 Security Confirmation:</strong> All your other active sessions have been automatically logged out for security.
            </p>
        </div>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{_configuration["App:BaseUrl"]}/auth/login' 
               style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                Sign In to Your Account
            </a>
        </div>
        
        <div style='background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-top: 25px;'>
            <p style='margin: 0; font-size: 14px; color: #856404;'>
                <strong>⚠️ Important:</strong> If you didn't reset your password, please contact support immediately 
                at <a href='mailto:support@geoleap.com' style='color: #667eea;'>support@geoleap.com</a>.
            </p>
        </div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>
            This email was sent to {email} to confirm your password reset.
        </p>
        <p style='margin-top: 10px;'>
            © 2025 GeoLeap. All rights reserved.
        </p>
    </div>
</body>
</html>";

            var textBody = $@"
Password Reset Successful - GeoLeap

Hi {firstName},

Your password has been successfully reset for your GeoLeap account. Your account is now secure with your new password.

Security Confirmation: All your other active sessions have been automatically logged out for security.

Sign in to your account: {_configuration["App:BaseUrl"]}/auth/login

Important: If you didn't reset your password, please contact support immediately at support@geoleap.com.

This email was sent to {email} to confirm your password reset.

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset confirmation email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendPasswordChangeNotificationEmailAsync(string email, string firstName)
    {
        try
        {
            var subject = "Password Changed - GeoLeap Security Alert";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Password Changed</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>🔒 Password Changed</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>GeoLeap Security Notification</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            This is a security notification to inform you that your password for your GeoLeap account was successfully changed.
        </p>
        
        <div style='background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;'>
            <p style='margin: 0; font-size: 14px; color: #1565c0;'>
                <strong>📅 Date & Time:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC<br>
                <strong>🔒 Security Action:</strong> Password changed successfully<br>
                <strong>📧 Account:</strong> {email}
            </p>
        </div>
        
        <div style='background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;'>
            <p style='margin: 0; font-size: 14px; color: #155724;'>
                <strong>🔒 Security Confirmation:</strong> All your other active sessions have been automatically logged out for security.
            </p>
        </div>
        
        <div style='background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin-top: 25px;'>
            <p style='margin: 0; font-size: 14px; color: #721c24;'>
                <strong>⚠️ Security Alert:</strong> If you didn't make this change, your account may be compromised. 
                Please contact support immediately at <a href='mailto:support@geoleap.com' style='color: #dc3545;'>support@geoleap.com</a> 
                or reset your password again.
            </p>
        </div>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{_configuration["App:BaseUrl"]}/auth/forgot-password' 
               style='background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                Reset Password Again
            </a>
        </div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>
            This is an automated security notification sent to {email}.
        </p>
        <p style='margin-top: 10px;'>
            © 2025 GeoLeap. All rights reserved.
        </p>
    </div>
</body>
</html>";

            var textBody = $@"
Password Changed - GeoLeap Security Alert

Hi {firstName},

This is a security notification to inform you that your password for your GeoLeap account was successfully changed.

Date & Time: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC
Security Action: Password changed successfully
Account: {email}

Security Confirmation: All your other active sessions have been automatically logged out for security.

Security Alert: If you didn't make this change, your account may be compromised. Please contact support immediately at support@geoleap.com or reset your password again.

Reset password: {_configuration["App:BaseUrl"]}/auth/forgot-password

This is an automated security notification sent to {email}.

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password change notification email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendEmailChangeVerificationAsync(string email, string firstName, string verificationToken)
    {
        try
        {
            var subject = "Verify Your New Email Address - GeoLeap";
            var verificationUrl = $"{_configuration["App:BaseUrl"]}/auth/verify-email-change?token={verificationToken}";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Verify Your New Email Address</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>Verify Your New Email</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>GeoLeap Account Security</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            You requested to change your email address for your GeoLeap account. To confirm this change, 
            please verify your new email address by clicking the button below.
        </p>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{verificationUrl}' 
               style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                Verify New Email Address
            </a>
        </div>
        
        <p style='font-size: 14px; color: #666; margin-top: 20px;'>
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href='{verificationUrl}' style='color: #667eea; word-break: break-all;'>{verificationUrl}</a>
        </p>
        
        <div style='background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-top: 25px;'>
            <p style='margin: 0; font-size: 14px; color: #856404;'>
                <strong>⚠️ Security Notice:</strong> This verification link will expire in 24 hours. 
                Once verified, all your active sessions will be logged out for security.
            </p>
        </div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>
            This email was sent to {email} to verify your new email address.
        </p>
        <p style='margin-top: 10px;'>
            © 2025 GeoLeap. All rights reserved.
        </p>
    </div>
</body>
</html>";

            var textBody = $@"
Verify Your New Email Address - GeoLeap

Hi {firstName},

You requested to change your email address for your GeoLeap account. To confirm this change, please verify your new email address.

Verification Link: {verificationUrl}

Security Notice: This verification link will expire in 24 hours. Once verified, all your active sessions will be logged out for security.

This email was sent to {email} to verify your new email address.

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email change verification to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendEmailChangeNotificationAsync(string email, string firstName, string newEmail, bool isConfirmation = false)
    {
        try
        {
            var subject = isConfirmation ? "Email Address Changed Successfully - GeoLeap" : "Email Change Request - GeoLeap Security Alert";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>{(isConfirmation ? "Email Changed" : "Email Change Request")}</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, {(isConfirmation ? "#28a745" : "#ffc107")} 0%, {(isConfirmation ? "#20c997" : "#fd7e14")} 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>{(isConfirmation ? "✅ Email Address Changed" : "⚠️ Email Change Request")}</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>GeoLeap Security Notification</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            {(isConfirmation 
                ? $"Your email address has been successfully changed from {email} to {newEmail}." 
                : $"A request has been made to change your email address from {email} to {newEmail}.")}
        </p>
        
        <div style='background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;'>
            <p style='margin: 0; font-size: 14px; color: #1565c0;'>
                <strong>📅 Date & Time:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC<br>
                <strong>🔒 Security Action:</strong> Email change {(isConfirmation ? "completed" : "requested")}<br>
                <strong>📧 {(isConfirmation ? "Previous" : "Current")} Email:</strong> {email}<br>
                <strong>📧 New Email:</strong> {newEmail}
            </p>
        </div>
        
        {(isConfirmation 
            ? @"<div style='background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;'>
                <p style='margin: 0; font-size: 14px; color: #155724;'>
                    <strong>🔒 Security Confirmation:</strong> All your active sessions have been logged out for security.
                </p>
            </div>" 
            : @"<div style='background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;'>
                <p style='margin: 0; font-size: 14px; color: #856404;'>
                    <strong>🔍 Next Step:</strong> A verification email has been sent to your new email address. 
                    You must verify the new email to complete the change.
                </p>
            </div>")}
        
        {(!isConfirmation 
            ? @"<div style='background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin-top: 25px;'>
                <p style='margin: 0; font-size: 14px; color: #721c24;'>
                    <strong>⚠️ Security Alert:</strong> If you didn't request this email change, please contact support 
                    immediately at <a href='mailto:support@geoleap.com' style='color: #dc3545;'>support@geoleap.com</a>.
                </p>
            </div>" 
            : "")}
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>
            This is an automated security notification sent to {email}.
        </p>
        <p style='margin-top: 10px;'>
            © 2025 GeoLeap. All rights reserved.
        </p>
    </div>
</body>
</html>";

            var textBody = $@"
{subject}

Hi {firstName},

{(isConfirmation 
    ? $"Your email address has been successfully changed from {email} to {newEmail}." 
    : $"A request has been made to change your email address from {email} to {newEmail}.")}

Date & Time: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC
Security Action: Email change {(isConfirmation ? "completed" : "requested")}
{(isConfirmation ? "Previous" : "Current")} Email: {email}
New Email: {newEmail}

{(isConfirmation 
    ? "Security Confirmation: All your active sessions have been logged out for security." 
    : "Next Step: A verification email has been sent to your new email address. You must verify the new email to complete the change.")}

{(!isConfirmation 
    ? "Security Alert: If you didn't request this email change, please contact support immediately at support@geoleap.com." 
    : "")}

This is an automated security notification sent to {email}.

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email change notification to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendEmailChangeConfirmationAsync(string email, string firstName)
    {
        return await SendEmailChangeNotificationAsync(email, firstName, email, true);
    }

    public async Task<bool> SendSubscriptionCreatedEmailAsync(string email, string firstName, string planType, decimal amount, string interval)
    {
        try
        {
            var subject = $"Welcome to {planType} - Your GeoLeap Subscription is Active!";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Subscription Created</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>🎉 Welcome to {planType}!</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Your subscription is now active</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            Thank you for subscribing to {planType}! Your subscription is now active and you have immediate access to all premium features.
        </p>
        
        <div style='background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;'>
            <h3 style='color: #1565c0; margin-top: 0;'>📋 Subscription Details</h3>
            <p style='margin: 0; font-size: 14px; color: #333;'>
                <strong>Plan:</strong> {planType}<br>
                <strong>Amount:</strong> ${amount:F2} per {interval}<br>
                <strong>Status:</strong> Active<br>
                <strong>Started:</strong> {DateTime.UtcNow:yyyy-MM-dd}
            </p>
        </div>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{_configuration["App:BaseUrl"]}/dashboard' 
               style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                Access Your Dashboard
            </a>
        </div>
        
        <div style='background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;'>
            <h4 style='color: #155724; margin-top: 0;'>✨ Your Premium Benefits</h4>
            <ul style='margin: 0; padding-left: 20px; font-size: 14px; color: #333;'>
                <li>Unlimited searches and results</li>
                <li>Direct streaming links</li>
                <li>Advanced filtering options</li>
                <li>Export search results</li>
                <li>Priority support</li>
            </ul>
        </div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>
            Manage your subscription at <a href='{_configuration["App:BaseUrl"]}/dashboard/subscription' style='color: #667eea;'>Account Settings</a>
        </p>
        <p style='margin-top: 10px;'>
            © 2025 GeoLeap. All rights reserved.
        </p>
    </div>
</body>
</html>";

            var textBody = $@"
Welcome to {planType} - Your GeoLeap Subscription is Active!

Hi {firstName},

Thank you for subscribing to {planType}! Your subscription is now active and you have immediate access to all premium features.

Subscription Details:
- Plan: {planType}
- Amount: ${amount:F2} per {interval}
- Status: Active
- Started: {DateTime.UtcNow:yyyy-MM-dd}

Your Premium Benefits:
- Unlimited searches and results
- Direct streaming links
- Advanced filtering options
- Export search results
- Priority support

Access your dashboard: {_configuration["App:BaseUrl"]}/dashboard

Manage your subscription: {_configuration["App:BaseUrl"]}/dashboard/subscription

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send subscription created email to {{Email}}", email);
            return false;
        }
    }

    public async Task<bool> SendSubscriptionUpgradedEmailAsync(string email, string firstName, string oldPlan, string newPlan, decimal newAmount, string interval)
    {
        try
        {
            var subject = $"Subscription Upgraded to {newPlan} - GeoLeap";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Subscription Upgraded</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>🚀 Subscription Upgraded!</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>You now have access to {newPlan}</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            Great news! Your subscription has been successfully upgraded from {oldPlan} to {newPlan}. 
            You now have immediate access to all enhanced features.
        </p>
        
        <div style='background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;'>
            <h3 style='color: #1565c0; margin-top: 0;'>📈 Upgrade Details</h3>
            <p style='margin: 0; font-size: 14px; color: #333;'>
                <strong>Previous Plan:</strong> {oldPlan}<br>
                <strong>New Plan:</strong> {newPlan}<br>
                <strong>New Amount:</strong> ${newAmount:F2} per {interval}<br>
                <strong>Effective Date:</strong> {DateTime.UtcNow:yyyy-MM-dd}<br>
                <strong>Status:</strong> Active
            </p>
        </div>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{_configuration["App:BaseUrl"]}/dashboard' 
               style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                Explore New Features
            </a>
        </div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>
            Manage your subscription at <a href='{_configuration["App:BaseUrl"]}/dashboard/subscription' style='color: #667eea;'>Account Settings</a>
        </p>
        <p style='margin-top: 10px;'>
            © 2025 GeoLeap. All rights reserved.
        </p>
    </div>
</body>
</html>";

            var textBody = $@"
Subscription Upgraded to {newPlan} - GeoLeap

Hi {firstName},

Great news! Your subscription has been successfully upgraded from {oldPlan} to {newPlan}. You now have immediate access to all enhanced features.

Upgrade Details:
- Previous Plan: {oldPlan}
- New Plan: {newPlan}
- New Amount: ${newAmount:F2} per {interval}
- Effective Date: {DateTime.UtcNow:yyyy-MM-dd}
- Status: Active

Explore your new features: {_configuration["App:BaseUrl"]}/dashboard

Manage your subscription: {_configuration["App:BaseUrl"]}/dashboard/subscription

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send subscription upgraded email to {{Email}}", email);
            return false;
        }
    }

    public async Task<bool> SendSubscriptionDowngradedEmailAsync(string email, string firstName, string oldPlan, string newPlan, decimal newAmount, string interval)
    {
        try
        {
            var subject = $"Subscription Changed to {newPlan} - GeoLeap";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Subscription Changed</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #17a2b8 0%, #6c757d 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>Subscription Updated</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Your plan has been changed</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            Your subscription has been changed from {oldPlan} to {newPlan}. The change is effective immediately.
        </p>
        
        <div style='background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;'>
            <h3 style='color: #1565c0; margin-top: 0;'>📋 Updated Subscription</h3>
            <p style='margin: 0; font-size: 14px; color: #333;'>
                <strong>Previous Plan:</strong> {oldPlan}<br>
                <strong>Current Plan:</strong> {newPlan}<br>
                <strong>New Amount:</strong> ${newAmount:F2} per {interval}<br>
                <strong>Effective Date:</strong> {DateTime.UtcNow:yyyy-MM-dd}<br>
                <strong>Status:</strong> Active
            </p>
        </div>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{_configuration["App:BaseUrl"]}/dashboard' 
               style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                View Your Dashboard
            </a>
        </div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>
            Manage your subscription at <a href='{_configuration["App:BaseUrl"]}/dashboard/subscription' style='color: #667eea;'>Account Settings</a>
        </p>
        <p style='margin-top: 10px;'>
            © 2025 GeoLeap. All rights reserved.
        </p>
    </div>
</body>
</html>";

            var textBody = $@"
Subscription Changed to {newPlan} - GeoLeap

Hi {firstName},

Your subscription has been changed from {oldPlan} to {newPlan}. The change is effective immediately.

Updated Subscription:
- Previous Plan: {oldPlan}
- Current Plan: {newPlan}
- New Amount: ${newAmount:F2} per {interval}
- Effective Date: {DateTime.UtcNow:yyyy-MM-dd}
- Status: Active

View your dashboard: {_configuration["App:BaseUrl"]}/dashboard

Manage your subscription: {_configuration["App:BaseUrl"]}/dashboard/subscription

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send subscription downgraded email to {{Email}}", email);
            return false;
        }
    }

    public async Task<bool> SendSubscriptionCancelledEmailAsync(string email, string firstName, string planType, string accessEndDate)
    {
        try
        {
            var subject = "Subscription Cancelled - GeoLeap";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Subscription Cancelled</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>😢 Subscription Cancelled</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>We're sorry to see you go</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            Your {planType} subscription has been cancelled as requested. You'll continue to have access to premium features until {accessEndDate}.
        </p>
        
        <div style='background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;'>
            <h3 style='color: #856404; margin-top: 0;'>⏰ Access Timeline</h3>
            <p style='margin: 0; font-size: 14px; color: #333;'>
                <strong>Premium Access Until:</strong> {accessEndDate}<br>
                <strong>What Happens Next:</strong> Your account will automatically switch to the Free plan<br>
                <strong>Data:</strong> Your search history and preferences will be preserved
            </p>
        </div>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{_configuration["App:BaseUrl"]}/dashboard/subscription' 
               style='background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block; 
                      margin-right: 15px;'>
                Reactivate Subscription
            </a>
            <a href='{_configuration["App:BaseUrl"]}/dashboard' 
               style='background: linear-gradient(135deg, #6c757d 0%, #495057 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                View Dashboard
            </a>
        </div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>
            Questions? Contact us at <a href='mailto:support@geoleap.com' style='color: #667eea;'>support@geoleap.com</a>
        </p>
        <p style='margin-top: 10px;'>
            © 2025 GeoLeap. All rights reserved.
        </p>
    </div>
</body>
</html>";

            var textBody = $@"
Subscription Cancelled - GeoLeap

Hi {firstName},

Your {planType} subscription has been cancelled as requested. You'll continue to have access to premium features until {accessEndDate}.

Access Timeline:
- Premium Access Until: {accessEndDate}
- What Happens Next: Your account will automatically switch to the Free plan
- Data: Your search history and preferences will be preserved

You can reactivate your subscription anytime before {accessEndDate}: {_configuration["App:BaseUrl"]}/dashboard/subscription

View your dashboard: {_configuration["App:BaseUrl"]}/dashboard

Questions? Contact us at support@geoleap.com

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send subscription cancelled email to {{Email}}", email);
            return false;
        }
    }

    public async Task<bool> SendSubscriptionReactivatedEmailAsync(string email, string firstName, string planType, decimal amount, string interval)
    {
        try
        {
            var subject = $"Welcome Back to {planType} - GeoLeap";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Subscription Reactivated</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>🎉 Welcome Back!</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Your {planType} subscription is reactivated</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            Welcome back! Your {planType} subscription has been successfully reactivated. 
            You now have immediate access to all premium features again.
        </p>
        
        <div style='background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;'>
            <h3 style='color: #1565c0; margin-top: 0;'>📋 Subscription Details</h3>
            <p style='margin: 0; font-size: 14px; color: #333;'>
                <strong>Plan:</strong> {planType}<br>
                <strong>Amount:</strong> ${amount:F2} per {interval}<br>
                <strong>Status:</strong> Active<br>
                <strong>Reactivated:</strong> {DateTime.UtcNow:yyyy-MM-dd}
            </p>
        </div>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{_configuration["App:BaseUrl"]}/dashboard' 
               style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                Continue Your Journey
            </a>
        </div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>
            Manage your subscription at <a href='{_configuration["App:BaseUrl"]}/dashboard/subscription' style='color: #667eea;'>Account Settings</a>
        </p>
        <p style='margin-top: 10px;'>
            © 2025 GeoLeap. All rights reserved.
        </p>
    </div>
</body>
</html>";

            var textBody = $@"
Welcome Back to {planType} - GeoLeap

Hi {firstName},

Welcome back! Your {planType} subscription has been successfully reactivated. You now have immediate access to all premium features again.

Subscription Details:
- Plan: {planType}
- Amount: ${amount:F2} per {interval}
- Status: Active
- Reactivated: {DateTime.UtcNow:yyyy-MM-dd}

Continue your journey: {_configuration["App:BaseUrl"]}/dashboard

Manage your subscription: {_configuration["App:BaseUrl"]}/dashboard/subscription

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send subscription reactivated email to {{Email}}", email);
            return false;
        }
    }

    public async Task<bool> SendPaymentFailedEmailAsync(string email, string firstName, string planType, decimal amount, string nextRetryDate)
    {
        try
        {
            var subject = "Payment Failed - Action Required - GeoLeap";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Payment Failed</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>⚠️ Payment Failed</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Action required to maintain your subscription</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            We were unable to process your payment for your {planType} subscription (${amount:F2}). 
            Your subscription is still active, but we'll try again on {nextRetryDate}.
        </p>
        
        <div style='background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0;'>
            <h3 style='color: #721c24; margin-top: 0;'>🚨 Action Required</h3>
            <p style='margin: 0; font-size: 14px; color: #333;'>
                <strong>Next Retry:</strong> {nextRetryDate}<br>
                <strong>Amount Due:</strong> ${amount:F2}<br>
                <strong>Plan:</strong> {planType}<br>
                <strong>What to Do:</strong> Update your payment method or check your card/account
            </p>
        </div>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{_configuration["App:BaseUrl"]}/dashboard/subscription' 
               style='background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                Update Payment Method
            </a>
        </div>
        
        <div style='background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-top: 25px;'>
            <p style='margin: 0; font-size: 14px; color: #856404;'>
                <strong>💡 Common Issues:</strong> Expired card, insufficient funds, changed billing address, or card issuer restrictions. 
                Contact your bank or update your payment method to resolve.
            </p>
        </div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>
            Need help? Contact us at <a href='mailto:support@geoleap.com' style='color: #667eea;'>support@geoleap.com</a>
        </p>
        <p style='margin-top: 10px;'>
            © 2025 GeoLeap. All rights reserved.
        </p>
    </div>
</body>
</html>";

            var textBody = $@"
Payment Failed - Action Required - GeoLeap

Hi {firstName},

We were unable to process your payment for your {planType} subscription (${amount:F2}). Your subscription is still active, but we'll try again on {nextRetryDate}.

Action Required:
- Next Retry: {nextRetryDate}
- Amount Due: ${amount:F2}
- Plan: {planType}
- What to Do: Update your payment method or check your card/account

Update your payment method: {_configuration["App:BaseUrl"]}/dashboard/subscription

Common Issues: Expired card, insufficient funds, changed billing address, or card issuer restrictions. Contact your bank or update your payment method to resolve.

Need help? Contact us at support@geoleap.com

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send payment failed email to {{Email}}", email);
            return false;
        }
    }

    public async Task<bool> SendSubscriptionExpiringEmailAsync(string email, string firstName, string planType, string expiryDate)
    {
        try
        {
            var subject = $"Your {planType} Subscription Expires Soon - GeoLeap";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Subscription Expiring</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>⏰ Subscription Expiring</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Don't lose access to premium features</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            Your {planType} subscription is expiring soon on {expiryDate}. 
            To continue enjoying unlimited searches and premium features, please reactivate your subscription.
        </p>
        
        <div style='background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;'>
            <h3 style='color: #856404; margin-top: 0;'>📅 Expiration Details</h3>
            <p style='margin: 0; font-size: 14px; color: #333;'>
                <strong>Current Plan:</strong> {planType}<br>
                <strong>Expiry Date:</strong> {expiryDate}<br>
                <strong>Status:</strong> Expiring Soon<br>
                <strong>Action Required:</strong> Reactivate to maintain access
            </p>
        </div>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{_configuration["App:BaseUrl"]}/dashboard/subscription' 
               style='background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                Reactivate Subscription
            </a>
        </div>
        
        <div style='background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;'>
            <h4 style='color: #1565c0; margin-top: 0;'>💡 What You'll Lose</h4>
            <ul style='margin: 0; padding-left: 20px; font-size: 14px; color: #333;'>
                <li>Unlimited searches (back to 20 per day)</li>
                <li>Direct streaming links</li>
                <li>Advanced filtering options</li>
                <li>Export functionality</li>
                <li>Priority support</li>
            </ul>
        </div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>
            Questions? Contact us at <a href='mailto:support@geoleap.com' style='color: #667eea;'>support@geoleap.com</a>
        </p>
        <p style='margin-top: 10px;'>
            © 2025 GeoLeap. All rights reserved.
        </p>
    </div>
</body>
</html>";

            var textBody = $@"
Your {planType} Subscription Expires Soon - GeoLeap

Hi {firstName},

Your {planType} subscription is expiring soon on {expiryDate}. To continue enjoying unlimited searches and premium features, please reactivate your subscription.

Expiration Details:
- Current Plan: {planType}
- Expiry Date: {expiryDate}
- Status: Expiring Soon
- Action Required: Reactivate to maintain access

What You'll Lose:
- Unlimited searches (back to 20 per day)
- Direct streaming links
- Advanced filtering options
- Export functionality
- Priority support

Reactivate subscription: {_configuration["App:BaseUrl"]}/dashboard/subscription

Questions? Contact us at support@geoleap.com

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send subscription expiring email to {{Email}}", email);
            return false;
        }
    }

    public async Task<bool> SendSubscriptionWelcomeEmailAsync(string email, string firstName, string planType)
    {
        try
        {
            var subject = $"Welcome to {planType} - GeoLeap";
            
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Welcome to GeoLeap</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>🎉 Welcome to {planType}!</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Your subscription is now active</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            Welcome to GeoLeap! Your {planType} subscription is now active and ready to use.
            Start discovering global streaming content right away.
        </p>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{_configuration["App:BaseUrl"]}/dashboard' 
               style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                Start Exploring
            </a>
        </div>
    </div>
</body>
</html>";

            var textBody = $@"
Welcome to {planType} - GeoLeap

Hi {firstName},

Welcome to GeoLeap! Your {planType} subscription is now active and ready to use.
Start discovering global streaming content right away.

Start exploring: {_configuration["App:BaseUrl"]}/dashboard

© 2025 GeoLeap. All rights reserved.
";

            return await SendEmailAsync(email, subject, htmlBody, textBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send subscription welcome email to {Email}", email);
            return false;
        }
    }

    private async Task<bool> SendEmailAsync(string to, string subject, string htmlBody, string textBody)
    {
        try
        {
            // In development, log emails instead of sending them
            if (_configuration["Environment"] == "Development" || _configuration["Environment"] == "Testing")
            {
                _logger.LogInformation("Email would be sent to {Email} with subject: {Subject}", to, subject);
                _logger.LogDebug("Email content: {Content}", textBody);
                return true;
            }

            // For production, you would implement actual email sending using:
            // - Azure Communication Services
            // - SendGrid
            // - AWS SES
            // - Or another email service

            var smtpHost = _configuration["Email:SmtpHost"];
            var smtpPortStr = _configuration["Email:SmtpPort"] ?? "587";
            if (!int.TryParse(smtpPortStr, out var smtpPort))
            {
                _logger.LogWarning("Invalid SMTP port configuration: {Port}. Using default port 587", smtpPortStr);
                smtpPort = 587;
            }
            var smtpUsername = _configuration["Email:Username"];
            var smtpPassword = _configuration["Email:Password"];
            var fromEmail = _configuration["Email:FromAddress"] ?? "noreply@geoleap.com";
            var fromName = _configuration["Email:FromName"] ?? "GeoLeap";

            if (string.IsNullOrEmpty(smtpHost))
            {
                _logger.LogWarning("SMTP configuration missing. Email not sent to {Email}", to);
                return true; // Return true in development to not block registration
            }

            // Wrap email sending in retry policy
            return await _retryPolicy.ExecuteAsync(async () =>
            {
                using var client = new SmtpClient(smtpHost, smtpPort);
                client.UseDefaultCredentials = false;
                client.Credentials = new NetworkCredential(smtpUsername, smtpPassword);
                client.EnableSsl = true;

                using var message = new MailMessage();
                message.From = new MailAddress(fromEmail, fromName);
                message.To.Add(to);
                message.Subject = subject;
                message.Body = htmlBody;
                message.IsBodyHtml = true;

                // Add plain text alternative
                var plainTextView = AlternateView.CreateAlternateViewFromString(textBody, null, "text/plain");
                var htmlView = AlternateView.CreateAlternateViewFromString(htmlBody, null, "text/html");
                message.AlternateViews.Add(plainTextView);
                message.AlternateViews.Add(htmlView);

                await client.SendMailAsync(message);

                _logger.LogInformation("Email sent successfully to {Email}", to);
                return true;
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email} after {RetryCount} attempts", to, 3);

            // Queue for background retry
            _failedEmailQueue.Enqueue(new FailedEmailInfo
            {
                To = to,
                Subject = subject,
                HtmlBody = htmlBody,
                TextBody = textBody,
                FailedAt = DateTime.UtcNow,
                AttemptCount = 3
            });

            _logger.LogInformation("Queued failed email to {Email} for background retry", to);
            return false;
        }
    }

    // Helper class for tracking failed emails
    private class FailedEmailInfo
    {
        public string To { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string HtmlBody { get; set; } = string.Empty;
        public string TextBody { get; set; } = string.Empty;
        public DateTime FailedAt { get; set; }
        public int AttemptCount { get; set; }
    }

    public async Task<bool> SendPlainEmailAsync(string email, string subject, string body, string correlationId)
    {
        try
        {
            _logger.LogInformation("Sending plain email to {Email} with correlation {CorrelationId}", email, correlationId);
            return await SendEmailAsync(email, subject, body, body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send plain email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendEmailWithAttachmentsAsync(string email, string subject, string body, Dictionary<string, byte[]> attachments, string correlationId)
    {
        try
        {
            // In development/testing, log emails instead of sending them
            if (_configuration["Environment"] == "Development" || _configuration["Environment"] == "Testing")
            {
                _logger.LogInformation("Email with {AttachmentCount} attachments would be sent to {Email} with subject: {Subject}", attachments.Count, email, subject);
                _logger.LogDebug("Email content: {Content}", body);
                _logger.LogDebug("Attachments: {AttachmentNames}", string.Join(", ", attachments.Keys));
                return true;
            }

            _logger.LogInformation("Sending email with {AttachmentCount} attachments to {Email}", attachments.Count, email);

            var fromEmail = _configuration["Email:FromAddress"] ?? "noreply@geoleap.com";
            var fromName = _configuration["Email:FromName"] ?? "GeoLeap";
            var smtpHost = _configuration["Email:SmtpHost"] ?? "localhost";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUsername = _configuration["Email:SmtpUsername"] ?? "";
            var smtpPassword = _configuration["Email:SmtpPassword"] ?? "";

            using var client = new SmtpClient(smtpHost, smtpPort);
            client.Credentials = new NetworkCredential(smtpUsername, smtpPassword);
            client.EnableSsl = true;

            using var message = new MailMessage();
            message.From = new MailAddress(fromEmail, fromName);
            message.To.Add(email);
            message.Subject = subject;
            message.Body = body;
            message.IsBodyHtml = true;

            // Add attachments
            foreach (var attachment in attachments)
            {
                var memoryStream = new MemoryStream(attachment.Value);
                var mailAttachment = new Attachment(memoryStream, attachment.Key);
                message.Attachments.Add(mailAttachment);
            }

            await client.SendMailAsync(message);
            
            _logger.LogInformation("Email with attachments sent successfully to {Email}", email);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email with attachments to {Email}", email);
            return false;
        }
    }

    private async Task<bool> SendEmailWithTemplateAsync(string to, string subject, string htmlBody, string textBody, string correlationId)
    {
        try
        {
            var fromEmail = _configuration["Email:FromAddress"] ?? "noreply@geoleap.com";
            var fromName = _configuration["Email:FromName"] ?? "GeoLeap";
            var smtpHost = _configuration["Email:SmtpHost"] ?? "localhost";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUsername = _configuration["Email:SmtpUsername"] ?? "";
            var smtpPassword = _configuration["Email:SmtpPassword"] ?? "";

            using var client = new SmtpClient(smtpHost, smtpPort);
            client.Credentials = new NetworkCredential(smtpUsername, smtpPassword);
            client.EnableSsl = true;

            using var message = new MailMessage();
            message.From = new MailAddress(fromEmail, fromName);
            message.To.Add(to);
            message.Subject = subject;
            message.Body = htmlBody;
            message.IsBodyHtml = true;

            var plainTextView = AlternateView.CreateAlternateViewFromString(textBody, null, "text/plain");
            var htmlView = AlternateView.CreateAlternateViewFromString(htmlBody, null, "text/html");
            message.AlternateViews.Add(plainTextView);
            message.AlternateViews.Add(htmlView);

            await client.SendMailAsync(message);
            
            _logger.LogInformation("Email sent successfully to {Email} with correlation {CorrelationId}", to, correlationId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email} with correlation {CorrelationId}", to, correlationId);
            return false;
        }
    }

    public async Task<bool> SendSubscriptionUpgradeEmailAsync(string email, string firstName, string oldPlan, string newPlan, decimal newAmount, string interval)
    {
        try
        {
            _logger.LogInformation("Sending subscription upgrade email to {Email}", email);

            var subject = "Subscription Upgraded - GeoLeap";
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Subscription Upgraded</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>Subscription Upgraded!</h1>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p>Your subscription has been successfully upgraded from {oldPlan} to {newPlan}.</p>
        <p><strong>New Plan:</strong> {newPlan}</p>
        <p><strong>Amount:</strong> ${newAmount:F2} per {interval}</p>
        <p>Thank you for upgrading! You now have access to additional features.</p>
    </div>
</body>
</html>";

            await SendEmailAsync(email, subject, htmlBody, "");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send subscription upgrade email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendSubscriptionCancellationEmailAsync(string email, string firstName, string planType, string accessEndDate)
    {
        try
        {
            _logger.LogInformation("Sending subscription cancellation email to {Email}", email);

            var subject = "Subscription Cancelled - GeoLeap";
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Subscription Cancelled</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>Subscription Cancelled</h1>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p>Your {planType} subscription has been cancelled.</p>
        <p>Your access will continue until: {accessEndDate}</p>
        <p>Thank you for being a GeoLeap user. You can reactivate anytime!</p>
    </div>
</body>
</html>";

            await SendEmailAsync(email, subject, htmlBody, "");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send subscription cancellation email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendPaymentReceiptEmailAsync(string email, string firstName, decimal amount, string currency, string transactionId, string planType)
    {
        try
        {
            _logger.LogInformation("Sending payment receipt email to {Email}", email);

            var subject = "Payment Receipt - GeoLeap";
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Payment Receipt</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>Payment Received</h1>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p>Thank you for your payment! Here are the details:</p>
        <p><strong>Amount:</strong> {amount:F2} {currency.ToUpper()}</p>
        <p><strong>Plan:</strong> {planType}</p>
        <p><strong>Transaction ID:</strong> {transactionId}</p>
        <p><strong>Date:</strong> {DateTime.UtcNow:MMM dd, yyyy}</p>
    </div>
</body>
</html>";

            await SendEmailAsync(email, subject, htmlBody, "");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send payment receipt email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendBulkSubscriptionEmailAsync(IEnumerable<string> emails, string templateId, string subject)
    {
        try
        {
            _logger.LogInformation("Sending bulk subscription email to {Count} recipients with template {TemplateId}", 
                emails.Count(), templateId);

            var tasks = emails.Select(async email =>
            {
                try
                {
                    // Generate appropriate content based on templateId
                    var (htmlBody, textBody) = GenerateTemplateContent(templateId, email);
                    return await SendEmailAsync(email, subject, htmlBody, textBody);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send bulk email to {Email}", email);
                    return false;
                }
            });

            var results = await Task.WhenAll(tasks);
            var successCount = results.Count(r => r);
            var totalCount = results.Length;

            _logger.LogInformation("Bulk email completed: {SuccessCount}/{TotalCount} sent successfully", 
                successCount, totalCount);

            return successCount > 0; // Return true if at least one email was sent
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during bulk subscription email send");
            return false;
        }
    }

    private (string htmlBody, string textBody) GenerateTemplateContent(string templateId, string email)
    {
        var htmlBody = templateId switch
        {
            "subscription_welcome" => $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Welcome to GeoLeap</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>🎉 Welcome to GeoLeap!</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Your subscription is now active</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hello!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            Welcome to GeoLeap! Your subscription is now active and ready to use.
            Start discovering global streaming content right away.
        </p>
    </div>
    
    <div style='text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #eee; color: #666; font-size: 14px;'>
        <p>Best regards,<br/>The GeoLeap Team</p>
    </div>
</body>
</html>",
            "subscription_reminder" => $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>GeoLeap Subscription Reminder</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>📅 Subscription Reminder</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Don't miss out on great content!</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hello!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            This is a friendly reminder about your GeoLeap subscription. 
            Continue enjoying unlimited access to global streaming content.
        </p>
    </div>
    
    <div style='text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #eee; color: #666; font-size: 14px;'>
        <p>Best regards,<br/>The GeoLeap Team</p>
    </div>
</body>
</html>",
            _ => $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>GeoLeap Notification</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #6c757d 0%, #495057 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>📧 GeoLeap Notification</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Thank you for being a valued user</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;'>
        <h2 style='color: #333; margin-top: 0;'>Hello!</h2>
        <p style='font-size: 16px; margin-bottom: 20px;'>
            This is a notification from GeoLeap regarding your subscription.
            Thank you for being a valued member of our community.
        </p>
    </div>
    
    <div style='text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #eee; color: #666; font-size: 14px;'>
        <p>Best regards,<br/>The GeoLeap Team</p>
    </div>
</body>
</html>"
        };

        var textBody = templateId switch
        {
            "subscription_welcome" => "Welcome to GeoLeap! Your subscription is now active and ready to use. Start discovering global streaming content right away.",
            "subscription_reminder" => "This is a friendly reminder about your GeoLeap subscription. Continue enjoying unlimited access to global streaming content.",
            _ => "This is a notification from GeoLeap regarding your subscription. Thank you for being a valued member of our community."
        };

        return (htmlBody, textBody);
    }

    // Missing methods from interface
    public async Task<bool> SendInvoiceEmailAsync(string email, string firstName, string invoiceNumber, decimal amount, string currency, byte[] pdfContent)
    {
        try
        {
            _logger.LogInformation("Sending invoice email to {Email} for invoice {InvoiceNumber}", email, invoiceNumber);

            var subject = $"Invoice {invoiceNumber} - GeoLeap";
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Invoice {invoiceNumber}</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>Invoice {invoiceNumber}</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Payment Receipt</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p>Thank you for your payment! Please find your invoice attached.</p>
        <p><strong>Invoice Number:</strong> {invoiceNumber}</p>
        <p><strong>Amount:</strong> {amount:F2} {currency.ToUpper()}</p>
        <p><strong>Date:</strong> {DateTime.UtcNow:MMM dd, yyyy}</p>
    </div>
</body>
</html>";

            var attachments = new Dictionary<string, byte[]>
            {
                [$"invoice-{invoiceNumber}.pdf"] = pdfContent
            };

            return await SendEmailWithAttachmentsAsync(email, subject, htmlBody, attachments, invoiceNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send invoice email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendTrialExpiringEmailAsync(string email, string firstName, string planType, string expiryDate)
    {
        try
        {
            _logger.LogInformation("Sending trial expiring email to {Email}", email);

            var subject = $"Your {planType} Trial Expires Soon - GeoLeap";
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Trial Expiring</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>Trial Expiring Soon</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Don't lose your premium access</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p>Your {planType} trial expires on {expiryDate}. Subscribe now to continue enjoying premium features!</p>
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{_configuration["App:BaseUrl"]}/dashboard/subscription' 
               style='background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      font-size: 16px; 
                      display: inline-block;'>
                Subscribe Now
            </a>
        </div>
    </div>
</body>
</html>";

            return await SendEmailAsync(email, subject, htmlBody, "");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send trial expiring email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendAccountSuspensionEmailAsync(string email, string firstName, string reason)
    {
        try
        {
            _logger.LogInformation("Sending account suspension email to {Email}", email);

            var subject = "Account Suspended - GeoLeap";
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Account Suspended</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>Account Suspended</h1>
        <p style='color: white; margin: 10px 0 0 0; font-size: 16px;'>Important Account Notice</p>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <p>Your GeoLeap account has been suspended.</p>
        <p><strong>Reason:</strong> {reason}</p>
        <p>If you believe this is an error, please contact support at support@geoleap.com</p>
    </div>
</body>
</html>";

            return await SendEmailAsync(email, subject, htmlBody, "");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send account suspension email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendMarketingEmailAsync(string email, string firstName, string subject, string body)
    {
        try
        {
            _logger.LogInformation("Sending marketing email to {Email}", email);

            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>{subject}</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>GeoLeap</h1>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px;'>
        <h2 style='color: #333; margin-top: 0;'>Hi {firstName}!</h2>
        <div>{body}</div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>© 2025 GeoLeap. All rights reserved.</p>
    </div>
</body>
</html>";

            return await SendEmailAsync(email, subject, htmlBody, body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send marketing email to {Email}", email);
            return false;
        }
    }
    
    // Generic email method for AdminNotificationService compatibility
    public async Task<bool> SendEmailAsync(string toEmail, string subject, string body)
    {
        try
        {
            var htmlBody = $@"
<html>
<head>
    <meta charset='utf-8'>
    <title>{subject}</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;'>
        <h1 style='color: white; margin: 0; font-size: 28px;'>GeoLeap</h1>
    </div>
    
    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 10px;'>
        <div>{body}</div>
    </div>
    
    <div style='text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;'>
        <p>© 2025 GeoLeap. All rights reserved.</p>
    </div>
</body>
</html>";

            return await SendEmailAsync(toEmail, subject, htmlBody, body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
            return false;
        }
    }

    public async Task<bool> SendTemplateEmailAsync(string toEmail, string templateId, Dictionary<string, object> templateData)
    {
        try
        {
            // Simple template implementation - in production this would use a template engine
            var subject = templateData.ContainsKey("subject") ? templateData["subject"].ToString() : $"Notification - {templateId}";
            var body = templateData.ContainsKey("body") ? templateData["body"].ToString() : $"Template: {templateId}";
            
            return await SendEmailAsync(toEmail, subject!, body!);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send template email {TemplateId} to {Email}", templateId, toEmail);
            return false;
        }
    }

    public async Task<bool> SendAsync(string email, string subject, string body, Dictionary<string, object>? data = null)
    {
        try
        {
            // Basic implementation that uses the existing SendEmailAsync method
            return await SendEmailAsync(email, subject, body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send generic email to {Email}", email);
            return false;
        }
    }
}