namespace GeoLeap.Api.Services;

public interface ISmsService
{
    Task<bool> SendSmsAsync(string phoneNumber, string message, string correlationId);
    Task<bool> SendSmsAsync(string phoneNumber, string message, string correlationId, Dictionary<string, object>? metadata = null);
    
    // Test-compatible overload without correlationId that tests expect
    Task<bool> SendSmsAsync(string phoneNumber, string message);
    
    Task<bool> VerifyPhoneNumberAsync(string phoneNumber, string correlationId);
    Task<Dictionary<string, object>> GetSmsDeliveryStatusAsync(string externalId);
}