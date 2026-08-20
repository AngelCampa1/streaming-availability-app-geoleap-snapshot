using System.Collections.Concurrent;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Infrastructure.Fakes;

/// <summary>
/// Fake implementation of ISmsService that captures all SMS messages for test verification.
/// Does NOT send any actual SMS messages - all operations are in-memory only.
/// </summary>
public class FakeSmsService : ISmsService
{
    private readonly ConcurrentBag<SentSms> _sentMessages = new();
    private readonly ConcurrentDictionary<string, bool> _verifiedNumbers = new();
    private readonly ConcurrentDictionary<string, int> _failureConfig = new();
    private bool _shouldFail = false;

    /// <summary>
    /// All SMS messages that have been "sent" through this fake service
    /// </summary>
    public IReadOnlyCollection<SentSms> SentMessages => _sentMessages.ToList().AsReadOnly();

    /// <summary>
    /// Configure the fake to fail all SMS operations
    /// </summary>
    public void SetShouldFail(bool shouldFail)
    {
        _shouldFail = shouldFail;
    }

    /// <summary>
    /// Configure a phone number to fail the next N SMS attempts
    /// </summary>
    public void ConfigureFailure(string phoneNumber, int failCount = 1)
    {
        _failureConfig[NormalizePhoneNumber(phoneNumber)] = failCount;
    }

    /// <summary>
    /// Mark a phone number as verified
    /// </summary>
    public void SetPhoneVerified(string phoneNumber, bool verified = true)
    {
        _verifiedNumbers[NormalizePhoneNumber(phoneNumber)] = verified;
    }

    /// <summary>
    /// Clear all sent messages and failure configurations
    /// </summary>
    public void Reset()
    {
        _sentMessages.Clear();
        _verifiedNumbers.Clear();
        _failureConfig.Clear();
        _shouldFail = false;
    }

    /// <summary>
    /// Get all SMS messages sent to a specific phone number
    /// </summary>
    public IReadOnlyCollection<SentSms> GetMessagesTo(string phoneNumber)
    {
        var normalized = NormalizePhoneNumber(phoneNumber);
        return _sentMessages
            .Where(m => NormalizePhoneNumber(m.PhoneNumber) == normalized)
            .ToList()
            .AsReadOnly();
    }

    private string NormalizePhoneNumber(string phoneNumber)
    {
        return new string(phoneNumber.Where(char.IsDigit).ToArray());
    }

    private bool ShouldFail(string phoneNumber)
    {
        if (_shouldFail) return true;

        var key = NormalizePhoneNumber(phoneNumber);
        if (_failureConfig.TryGetValue(key, out var failCount) && failCount > 0)
        {
            _failureConfig[key] = failCount - 1;
            if (_failureConfig[key] <= 0)
                _failureConfig.TryRemove(key, out _);
            return true;
        }
        return false;
    }

    public Task<bool> SendSmsAsync(string phoneNumber, string message, string correlationId)
    {
        return SendSmsAsync(phoneNumber, message, correlationId, null);
    }

    public Task<bool> SendSmsAsync(string phoneNumber, string message, string correlationId, Dictionary<string, object>? metadata = null)
    {
        if (ShouldFail(phoneNumber))
            return Task.FromResult(false);

        var externalId = Guid.NewGuid().ToString();
        _sentMessages.Add(new SentSms
        {
            PhoneNumber = phoneNumber,
            Message = message,
            CorrelationId = correlationId,
            ExternalId = externalId,
            Metadata = metadata ?? new Dictionary<string, object>(),
            SentAt = DateTime.UtcNow,
            Status = "delivered"
        });

        return Task.FromResult(true);
    }

    public Task<bool> SendSmsAsync(string phoneNumber, string message)
    {
        return SendSmsAsync(phoneNumber, message, Guid.NewGuid().ToString(), null);
    }

    public Task<bool> VerifyPhoneNumberAsync(string phoneNumber, string correlationId)
    {
        if (_shouldFail)
            return Task.FromResult(false);

        var normalized = NormalizePhoneNumber(phoneNumber);

        // Check if already verified
        if (_verifiedNumbers.TryGetValue(normalized, out var isVerified) && isVerified)
            return Task.FromResult(true);

        // Send verification code
        var code = new Random().Next(100000, 999999).ToString();
        _sentMessages.Add(new SentSms
        {
            PhoneNumber = phoneNumber,
            Message = $"Your verification code is: {code}",
            CorrelationId = correlationId,
            ExternalId = Guid.NewGuid().ToString(),
            Metadata = new Dictionary<string, object> { ["verificationCode"] = code },
            SentAt = DateTime.UtcNow,
            Status = "delivered"
        });

        return Task.FromResult(true);
    }

    public Task<Dictionary<string, object>> GetSmsDeliveryStatusAsync(string externalId)
    {
        var message = _sentMessages.FirstOrDefault(m => m.ExternalId == externalId);

        if (message == null)
        {
            return Task.FromResult(new Dictionary<string, object>
            {
                ["status"] = "not_found",
                ["externalId"] = externalId
            });
        }

        return Task.FromResult(new Dictionary<string, object>
        {
            ["status"] = message.Status,
            ["externalId"] = externalId,
            ["phoneNumber"] = message.PhoneNumber,
            ["sentAt"] = message.SentAt,
            ["deliveredAt"] = message.SentAt.AddSeconds(2)
        });
    }
}

/// <summary>
/// Represents an SMS message that was "sent" through the fake SMS service
/// </summary>
public class SentSms
{
    public string PhoneNumber { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string CorrelationId { get; set; } = string.Empty;
    public string ExternalId { get; set; } = string.Empty;
    public Dictionary<string, object> Metadata { get; set; } = new();
    public DateTime SentAt { get; set; }
    public string Status { get; set; } = "pending";
}
