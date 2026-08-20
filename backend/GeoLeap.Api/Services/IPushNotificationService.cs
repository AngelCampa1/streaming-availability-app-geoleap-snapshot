namespace GeoLeap.Api.Services;

public interface IPushNotificationService
{
    Task<bool> SendPushNotificationAsync(Guid userId, string title, string body, string correlationId);
    
    // Main overload that tests expect (5 parameters)
    Task<bool> SendPushNotificationAsync(Guid userId, string title, string message, string category, Dictionary<string, object>? data);
    
    Task<bool> RegisterDeviceTokenAsync(Guid userId, string deviceToken, string platform, string correlationId);
    Task<bool> UnregisterDeviceTokenAsync(string deviceToken, string correlationId);
    Task<Dictionary<string, object>> GetPushDeliveryStatusAsync(string externalId);
}