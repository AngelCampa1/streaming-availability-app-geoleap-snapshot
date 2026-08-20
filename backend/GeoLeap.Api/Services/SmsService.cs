using GeoLeap.Api.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.Text.RegularExpressions;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for SMS notification functionality
/// </summary>
public class SmsService : ISmsService
{
    private readonly ILogger<SmsService> _logger;
    private readonly IConfiguration _configuration;
    private static readonly ConcurrentDictionary<string, SmsDeliveryStatus> _deliveryStatus = new();
    private static readonly Regex PhoneRegex = new(@"^\+?[1-9]\d{1,14}$");

    public SmsService(
        ILogger<SmsService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// Send SMS message
    /// </summary>
    public async Task<bool> SendSmsAsync(string phoneNumber, string message, string correlationId)
    {
        return await SendSmsAsync(phoneNumber, message, correlationId, null);
    }

    /// <summary>
    /// Send SMS message without correlation ID (for test compatibility)
    /// </summary>
    public async Task<bool> SendSmsAsync(string phoneNumber, string message)
    {
        return await SendSmsAsync(phoneNumber, message, Guid.NewGuid().ToString(), null);
    }

    /// <summary>
    /// Send SMS message with metadata
    /// </summary>
    public async Task<bool> SendSmsAsync(
        string phoneNumber, 
        string message, 
        string correlationId, 
        Dictionary<string, object>? metadata = null)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Sending SMS to {PhoneNumber}", 
                correlationId, MaskPhoneNumber(phoneNumber));

            // Validate phone number
            if (!IsValidPhoneNumber(phoneNumber))
            {
                _logger.LogWarning("[{CorrelationId}] Invalid phone number format: {PhoneNumber}", 
                    correlationId, MaskPhoneNumber(phoneNumber));
                return false;
            }

            // Validate message
            if (string.IsNullOrWhiteSpace(message))
            {
                _logger.LogWarning("[{CorrelationId}] Empty message not allowed", correlationId);
                return false;
            }

            if (message.Length > 1600) // SMS character limit
            {
                _logger.LogWarning("[{CorrelationId}] Message too long: {Length} characters", 
                    correlationId, message.Length);
                return false;
            }

            var smsRequest = new SmsRequest
            {
                Id = Guid.NewGuid(),
                PhoneNumber = phoneNumber,
                Message = message,
                Metadata = metadata ?? new Dictionary<string, object>(),
                CreatedAt = DateTime.UtcNow,
                Status = "Pending"
            };

            // Send via SMS provider
            var success = await SendViaSmsProviderAsync(smsRequest, correlationId);

            // Track delivery status
            var externalId = smsRequest.Id.ToString();
            _deliveryStatus.TryAdd(externalId, new SmsDeliveryStatus
            {
                ExternalId = externalId,
                PhoneNumber = phoneNumber,
                Status = success ? "Sent" : "Failed",
                SentAt = success ? DateTime.UtcNow : null,
                Error = success ? null : "SMS delivery failed",
                Attempts = 1,
                LastAttempt = DateTime.UtcNow
            });

            _logger.LogInformation("[{CorrelationId}] SMS {Status} for {PhoneNumber}", 
                correlationId, success ? "sent successfully" : "failed", MaskPhoneNumber(phoneNumber));

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error sending SMS to {PhoneNumber}", 
                correlationId, MaskPhoneNumber(phoneNumber));
            return false;
        }
    }

    /// <summary>
    /// Verify phone number format and validity
    /// </summary>
    public async Task<bool> VerifyPhoneNumberAsync(string phoneNumber, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Verifying phone number: {PhoneNumber}", 
                correlationId, MaskPhoneNumber(phoneNumber));

            await Task.CompletedTask; // Placeholder for async signature

            // Basic format validation
            if (!IsValidPhoneNumber(phoneNumber))
            {
                _logger.LogInformation("[{CorrelationId}] Phone number format validation failed", correlationId);
                return false;
            }

            // In a real implementation, this could:
            // - Check against carrier databases
            // - Validate with external phone verification services
            // - Check if number is mobile vs landline
            // - Verify country code validity

            // Mock validation logic
            var isValid = !phoneNumber.Contains("000") && // Block obviously fake numbers
                         phoneNumber.Length >= 10 && 
                         phoneNumber.Length <= 15;

            _logger.LogInformation("[{CorrelationId}] Phone number verification result: {IsValid}", 
                correlationId, isValid);

            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error verifying phone number", correlationId);
            return false;
        }
    }

    /// <summary>
    /// Get SMS delivery status
    /// </summary>
    public async Task<Dictionary<string, object>> GetSmsDeliveryStatusAsync(string externalId)
    {
        try
        {
            await Task.CompletedTask; // Placeholder for async signature

            if (_deliveryStatus.TryGetValue(externalId, out var status))
            {
                return new Dictionary<string, object>
                {
                    { "externalId", status.ExternalId },
                    { "phoneNumber", MaskPhoneNumber(status.PhoneNumber) },
                    { "status", status.Status },
                    { "sentAt", status.SentAt },
                    { "deliveredAt", status.DeliveredAt },
                    { "error", status.Error },
                    { "attempts", status.Attempts },
                    { "lastAttempt", status.LastAttempt },
                    { "cost", status.Cost },
                    { "provider", status.Provider }
                };
            }

            return new Dictionary<string, object>
            {
                { "externalId", externalId },
                { "status", "NotFound" },
                { "error", "SMS delivery status not found" }
            };
        }
        catch (Exception ex)
        {
            return new Dictionary<string, object>
            {
                { "externalId", externalId },
                { "status", "Error" },
                { "error", ex.Message }
            };
        }
    }

    private async Task<bool> SendViaSmsProviderAsync(SmsRequest request, string correlationId)
    {
        try
        {
            // In a real implementation, this would integrate with SMS providers like:
            // - Twilio
            // - Amazon SNS
            // - Azure Communication Services
            // - SendGrid
            // - MessageBird

            var provider = _configuration["SMS:Provider"] ?? "Mock";
            
            _logger.LogInformation("[{CorrelationId}] Sending SMS via provider: {Provider}", 
                correlationId, provider);

            return provider.ToLower() switch
            {
                "twilio" => await SendViaTwilioAsync(request, correlationId),
                "aws-sns" => await SendViaAwsSnsAsync(request, correlationId),
                "azure" => await SendViaAzureAsync(request, correlationId),
                _ => await SendViaMockProviderAsync(request, correlationId)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error sending SMS via provider", correlationId);
            return false;
        }
    }

    private async Task<bool> SendViaTwilioAsync(SmsRequest request, string correlationId)
    {
        try
        {
            await Task.Delay(100); // Simulate API call delay
            
            // Mock Twilio integration
            _logger.LogInformation("[{CorrelationId}] SMS sent via Twilio successfully", correlationId);
            
            // Update delivery status with provider-specific info
            if (_deliveryStatus.TryGetValue(request.Id.ToString(), out var status))
            {
                status.Provider = "Twilio";
                status.Cost = 0.0075m; // Mock cost
            }
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Twilio SMS sending failed", correlationId);
            return false;
        }
    }

    private async Task<bool> SendViaAwsSnsAsync(SmsRequest request, string correlationId)
    {
        try
        {
            await Task.Delay(120); // Simulate API call delay
            
            // Mock AWS SNS integration
            _logger.LogInformation("[{CorrelationId}] SMS sent via AWS SNS successfully", correlationId);
            
            // Update delivery status
            if (_deliveryStatus.TryGetValue(request.Id.ToString(), out var status))
            {
                status.Provider = "AWS SNS";
                status.Cost = 0.00645m; // Mock cost
            }
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] AWS SNS SMS sending failed", correlationId);
            return false;
        }
    }

    private async Task<bool> SendViaAzureAsync(SmsRequest request, string correlationId)
    {
        try
        {
            await Task.Delay(90); // Simulate API call delay
            
            // Mock Azure Communication Services integration
            _logger.LogInformation("[{CorrelationId}] SMS sent via Azure Communication Services successfully", correlationId);
            
            // Update delivery status
            if (_deliveryStatus.TryGetValue(request.Id.ToString(), out var status))
            {
                status.Provider = "Azure";
                status.Cost = 0.008m; // Mock cost
            }
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Azure SMS sending failed", correlationId);
            return false;
        }
    }

    private async Task<bool> SendViaMockProviderAsync(SmsRequest request, string correlationId)
    {
        try
        {
            await Task.Delay(50); // Simulate processing delay
            
            _logger.LogInformation("[{CorrelationId}] SMS sent via mock provider successfully", correlationId);
            
            // Update delivery status
            if (_deliveryStatus.TryGetValue(request.Id.ToString(), out var status))
            {
                status.Provider = "Mock";
                status.Cost = 0.01m; // Mock cost
                
                // Simulate delivery confirmation after a delay
                _ = Task.Run(async () =>
                {
                    await Task.Delay(5000); // 5 second delivery simulation
                    status.Status = "Delivered";
                    status.DeliveredAt = DateTime.UtcNow;
                });
            }
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Mock SMS provider failed", correlationId);
            return false;
        }
    }

    private static bool IsValidPhoneNumber(string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            return false;

        // Remove common formatting characters
        var cleanNumber = phoneNumber.Replace(" ", "")
                                    .Replace("-", "")
                                    .Replace("(", "")
                                    .Replace(")", "")
                                    .Replace(".", "");

        return PhoneRegex.IsMatch(cleanNumber);
    }

    private static string MaskPhoneNumber(string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber) || phoneNumber.Length < 4)
            return "***";

        var start = phoneNumber.Substring(0, Math.Min(3, phoneNumber.Length));
        var end = phoneNumber.Length > 3 ? phoneNumber.Substring(phoneNumber.Length - 2) : "";
        var middle = new string('*', Math.Max(0, phoneNumber.Length - 5));
        
        return $"{start}{middle}{end}";
    }
}

// Helper classes
public class SmsRequest
{
    public Guid Id { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public Dictionary<string, object> Metadata { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class SmsDeliveryStatus
{
    public string ExternalId { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? SentAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public string? Error { get; set; }
    public int Attempts { get; set; }
    public DateTime? LastAttempt { get; set; }
    public decimal? Cost { get; set; }
    public string? Provider { get; set; }
}
