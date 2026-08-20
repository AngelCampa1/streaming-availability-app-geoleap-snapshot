using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface ISecurityService
{
    Task<SecurityEvent> LogSecurityEventAsync(Guid userId, string eventType, string ipAddress, string userAgent, string? details = null);
    Task<int> CalculateRiskScoreAsync(SecurityEvent securityEvent, User user);
    Task<IEnumerable<SecurityEvent>> GetUserSecurityHistoryAsync(Guid userId, int skip = 0, int take = 50);
    Task<bool> IsNewDeviceAsync(string userAgent, Guid userId);
    Task<bool> IsUnusualLocationAsync(string ipAddress, Guid userId);
    Task<bool> IsHighRiskIpAsync(string ipAddress);
    Task<bool> HasRecentFailedAttemptsAsync(Guid userId);
    Task<string?> GetLocationFromIpAsync(string ipAddress);
    Task<SecurityPreferences> GetUserSecurityPreferencesAsync(Guid userId);
    Task<SecurityPreferences> UpdateUserSecurityPreferencesAsync(Guid userId, SecurityPreferences preferences);
    Task<bool> ShouldSendSecurityAlertAsync(SecurityEvent securityEvent, User user);
    Task SendSecurityAlertAsync(User user, SecurityEvent securityEvent);
}