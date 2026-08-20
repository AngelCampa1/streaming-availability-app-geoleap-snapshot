using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto, string? ipAddress = null, string? userAgent = null);
    Task<AuthResponseDto> LoginAsync(LoginDto loginDto, string? ipAddress = null, string? userAgent = null, string? deviceInfo = null);
    Task<AuthResponseDto> ExternalLoginAsync(string provider, string providerUserId, string email, 
        string firstName, string lastName, string? ipAddress = null, string? userAgent = null, string? deviceInfo = null);
    Task<UserInfoDto?> GetUserInfoAsync(Guid userId);
    Task<bool> UpdateUserProfileAsync(Guid userId, UpdateProfileDto updateProfileDto);
    Task<TokenResponseDto?> RefreshTokenAsync(string refreshToken, string? ipAddress = null, string? userAgent = null);
    Task<bool> LogoutAsync(string? refreshToken = null);
    Task<bool> LogoutAllSessionsAsync(Guid userId);
}