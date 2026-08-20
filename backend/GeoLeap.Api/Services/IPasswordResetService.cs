using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IPasswordResetService
{
    Task<bool> InitiatePasswordResetAsync(string email, string correlationId);
    Task<bool> ValidateResetTokenAsync(string token);
    Task<bool> ResetPasswordAsync(string token, string newPassword, string correlationId);
    Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, string correlationId);
    Task InvalidateUserSessionsAsync(Guid userId, string correlationId);
    Task<bool> CanRequestPasswordResetAsync(string email);
}