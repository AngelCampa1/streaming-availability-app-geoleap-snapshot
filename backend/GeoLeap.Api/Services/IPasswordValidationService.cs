using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IPasswordValidationService
{
    PasswordValidationResult ValidatePassword(string password);
    PasswordStrengthResult AnalyzePasswordStrength(string password);
    Task<bool> IsPasswordReusedAsync(Guid userId, string password);
    Task<bool> CanUserChangePasswordAsync(Guid userId);
}