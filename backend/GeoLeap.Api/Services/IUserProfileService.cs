using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IUserProfileService
{
    Task<UserProfileDto?> GetUserProfileAsync(Guid userId);
    Task<UserProfileDto> UpdateUserProfileAsync(Guid userId, UpdateUserProfileDto updateDto);
    Task<bool> ChangeEmailAsync(Guid userId, ChangeEmailRequestDto requestDto);
    Task<bool> VerifyEmailChangeAsync(string token);
    Task<NotificationPreferencesDto> GetNotificationPreferencesAsync(Guid userId);
    Task<NotificationPreferencesDto> UpdateNotificationPreferencesAsync(Guid userId, NotificationPreferencesDto preferencesDto);
    Task<IEnumerable<UserActivityLogDto>> GetUserActivityLogAsync(Guid userId, int skip = 0, int take = 50);
    Task LogUserActivityAsync(Guid userId, string activityType, string? description = null, string? ipAddress = null, string? userAgent = null);
    Task<IEnumerable<SocialAccountDto>> GetConnectedSocialAccountsAsync(Guid userId);
    Task<bool> DisconnectSocialAccountAsync(Guid userId, DisconnectSocialAccountDto disconnectDto);
    Task DeleteAccountAsync(Guid userId);
}
