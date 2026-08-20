using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using System.Security.Cryptography;
using System.Text;

namespace GeoLeap.Api.Services;

public class PasswordResetService : IPasswordResetService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;
    private readonly IPasswordValidationService _passwordValidationService;
    private readonly ILogger<PasswordResetService> _logger;
    private readonly IEmailService _emailService;

    private const int TokenExpirationHours = 24;
    private const int MaxResetAttemptsPerHour = 3;
    private const int TokenLengthBytes = 32;

    public PasswordResetService(
        ApplicationDbContext context,
        UserManager<User> userManager,
        IPasswordValidationService passwordValidationService,
        ILogger<PasswordResetService> logger,
        IEmailService emailService)
    {
        _context = context;
        _userManager = userManager;
        _passwordValidationService = passwordValidationService;
        _logger = logger;
        _emailService = emailService;
    }

    public async Task<bool> InitiatePasswordResetAsync(string email, string correlationId)
    {
        try
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                _logger.LogWarning("Password reset attempted for non-existent email {Email} - {CorrelationId}", email, correlationId);
                // Don't reveal that email doesn't exist
                return true;
            }

            if (!await CanRequestPasswordResetAsync(email))
            {
                _logger.LogWarning("Password reset rate limit exceeded for {Email} - {CorrelationId}", email, correlationId);
                return false;
            }

            // Invalidate any existing reset tokens
            await InvalidateExistingResetTokensAsync(user.Id);

            // Generate secure token
            var token = GenerateSecureToken();
            var resetToken = new PasswordResetToken
            {
                UserId = user.Id,
                Email = email,
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddHours(TokenExpirationHours)
            };

            _context.PasswordResetTokens.Add(resetToken);
            await _context.SaveChangesAsync();

            // Send reset email
            await _emailService.SendPasswordResetEmailAsync(user.Email!, token, user.FirstName);

            _logger.LogInformation("Password reset initiated for user {UserId} - {CorrelationId}", user.Id, correlationId);

            // Log security event
            await LogSecurityEventAsync(user.Id, "PasswordResetInitiated", $"Password reset initiated for email {email}");

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initiating password reset for {Email} - {CorrelationId}", email, correlationId);
            return false;
        }
    }

    public async Task<bool> ValidateResetTokenAsync(string token)
    {
        try
        {
            var resetToken = await _context.PasswordResetTokens
                .FirstOrDefaultAsync(rt => rt.Token == token && !rt.IsUsed && rt.ExpiresAt > DateTime.UtcNow);

            return resetToken != null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating reset token");
            return false;
        }
    }

    public async Task<bool> ResetPasswordAsync(string token, string newPassword, string correlationId)
    {
        try
        {
            var resetToken = await _context.PasswordResetTokens
                .FirstOrDefaultAsync(rt => rt.Token == token && !rt.IsUsed && rt.ExpiresAt > DateTime.UtcNow);

            if (resetToken == null)
            {
                _logger.LogWarning("Invalid or expired reset token used - {CorrelationId}", correlationId);
                return false;
            }

            // Get user
            var user = await _userManager.FindByIdAsync(resetToken.UserId.ToString());
            if (user == null)
            {
                _logger.LogError("User not found for valid reset token {UserId} - {CorrelationId}",
                    resetToken.UserId, correlationId);
                return false;
            }

            // Validate new password
            var validation = _passwordValidationService.ValidatePassword(newPassword);
            if (!validation.IsValid)
            {
                _logger.LogWarning("Password reset failed due to invalid password for user {UserId} - {CorrelationId}", 
                    resetToken.UserId, correlationId);
                return false;
            }

            // Check password reuse
            if (await _passwordValidationService.IsPasswordReusedAsync(resetToken.UserId, newPassword))
            {
                _logger.LogWarning("Password reset failed due to password reuse for user {UserId} - {CorrelationId}", 
                    resetToken.UserId, correlationId);
                return false;
            }

            // Mark token as used BEFORE changing password to prevent concurrent reuse
            resetToken.IsUsed = true;
            await _context.SaveChangesAsync();

            // Store current password in history
            await StorePasswordInHistoryAsync(resetToken.UserId, user.PasswordHash!);

            // Update password - use Remove + Add for password reset (no current password available)
            var removeResult = await _userManager.RemovePasswordAsync(user);
            if (!removeResult.Succeeded)
            {
                _logger.LogError("Failed to remove password for user {UserId}: {Errors} - {CorrelationId}",
                    resetToken.UserId, string.Join(", ", removeResult.Errors.Select(e => e.Description)), correlationId);
                return false;
            }

            var addResult = await _userManager.AddPasswordAsync(user, newPassword);
            if (!addResult.Succeeded)
            {
                _logger.LogError("Failed to add new password for user {UserId}: {Errors} - {CorrelationId}",
                    resetToken.UserId, string.Join(", ", addResult.Errors.Select(e => e.Description)), correlationId);
                return false;
            }

            // Invalidate all user sessions
            await InvalidateUserSessionsAsync(resetToken.UserId, correlationId);

            _logger.LogInformation("Password successfully reset for user {UserId} - {CorrelationId}", 
                resetToken.UserId, correlationId);

            // Log security event
            await LogSecurityEventAsync(resetToken.UserId, "PasswordReset", "Password reset completed successfully");

            // Send confirmation email
            await _emailService.SendPasswordResetConfirmationEmailAsync(user.Email!, user.FirstName);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password - {CorrelationId}", correlationId);
            return false;
        }
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, string correlationId)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                _logger.LogWarning("Password change attempted for non-existent user {UserId} - {CorrelationId}", userId, correlationId);
                return false;
            }

            // Check if user can change password (rate limiting)
            if (!await _passwordValidationService.CanUserChangePasswordAsync(userId))
            {
                _logger.LogWarning("Password change rate limit exceeded for user {UserId} - {CorrelationId}", userId, correlationId);
                return false;
            }

            // Verify current password
            var isCurrentPasswordValid = await _userManager.CheckPasswordAsync(user, currentPassword);
            if (!isCurrentPasswordValid)
            {
                _logger.LogWarning("Invalid current password provided for user {UserId} - {CorrelationId}", userId, correlationId);
                await LogSecurityEventAsync(userId, "InvalidPasswordAttempt", "Invalid current password provided during password change");
                return false;
            }

            // Validate new password
            var validation = _passwordValidationService.ValidatePassword(newPassword);
            if (!validation.IsValid)
            {
                _logger.LogWarning("Password change failed due to invalid new password for user {UserId} - {CorrelationId}", userId, correlationId);
                return false;
            }

            // Check password reuse
            if (await _passwordValidationService.IsPasswordReusedAsync(userId, newPassword))
            {
                _logger.LogWarning("Password change failed due to password reuse for user {UserId} - {CorrelationId}", userId, correlationId);
                return false;
            }

            // Store current password in history
            await StorePasswordInHistoryAsync(userId, user.PasswordHash!);

            // Change password
            var result = await _userManager.ChangePasswordAsync(user, currentPassword, newPassword);
            if (!result.Succeeded)
            {
                _logger.LogError("Failed to change password for user {UserId}: {Errors} - {CorrelationId}", 
                    userId, string.Join(", ", result.Errors.Select(e => e.Description)), correlationId);
                return false;
            }

            // Invalidate other user sessions
            await InvalidateUserSessionsAsync(userId, correlationId);

            _logger.LogInformation("Password successfully changed for user {UserId} - {CorrelationId}", userId, correlationId);

            // Log security event
            await LogSecurityEventAsync(userId, "PasswordChanged", "Password changed successfully");

            // Send notification email
            await _emailService.SendPasswordChangeNotificationEmailAsync(user.Email!, user.FirstName);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password for user {UserId} - {CorrelationId}", userId, correlationId);
            return false;
        }
    }

    public async Task InvalidateUserSessionsAsync(Guid userId, string correlationId)
    {
        try
        {
            var activeSessions = await _context.UserSessions
                .Where(s => s.UserId == userId && s.IsActive)
                .ToListAsync();

            foreach (var session in activeSessions)
            {
                session.IsActive = false;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Invalidated {SessionCount} sessions for user {UserId} - {CorrelationId}", 
                activeSessions.Count, userId, correlationId);

            await LogSecurityEventAsync(userId, "SessionsInvalidated", 
                $"Invalidated {activeSessions.Count} sessions due to password change");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error invalidating sessions for user {UserId} - {CorrelationId}", userId, correlationId);
        }
    }

    public async Task<bool> CanRequestPasswordResetAsync(string email)
    {
        try
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                return true; // Don't reveal non-existent emails
            }

            var recentRequests = await _context.PasswordResetTokens
                .Where(rt => rt.UserId == user.Id && rt.CreatedAt > DateTime.UtcNow.AddHours(-1))
                .CountAsync();

            return recentRequests < MaxResetAttemptsPerHour;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking password reset rate limit for {Email}", email);
            return false;
        }
    }

    private async Task InvalidateExistingResetTokensAsync(Guid userId)
    {
        var existingTokens = await _context.PasswordResetTokens
            .Where(rt => rt.UserId == userId && !rt.IsUsed && rt.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var token in existingTokens)
        {
            token.IsUsed = true;
        }

        if (existingTokens.Any())
        {
            await _context.SaveChangesAsync();
        }
    }

    private async Task StorePasswordInHistoryAsync(Guid userId, string passwordHash)
    {
        var historyEntry = new PasswordHistory
        {
            UserId = userId,
            PasswordHash = passwordHash
        };

        _context.PasswordHistory.Add(historyEntry);
        await _context.SaveChangesAsync();

        // Clean up old history entries (keep only last 5)
        var oldEntries = await _context.PasswordHistory
            .Where(ph => ph.UserId == userId)
            .OrderByDescending(ph => ph.CreatedAt)
            .Skip(5)
            .ToListAsync();

        if (oldEntries.Any())
        {
            _context.PasswordHistory.RemoveRange(oldEntries);
            await _context.SaveChangesAsync();
        }
    }

    private async Task LogSecurityEventAsync(Guid userId, string eventType, string description)
    {
        try
        {
            var auditLog = new UserAuditLog
            {
                UserId = userId,
                Action = eventType,
                Resource = "Password",
                Details = description,
                IpAddress = "System", // This would normally come from HttpContext
                UserAgent = "System",
                Success = true,
            };

            _context.UserAuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging security event {EventType} for user {UserId}", 
                eventType, userId);
        }
    }

    private static string GenerateSecureToken()
    {
        using var rng = RandomNumberGenerator.Create();
        var tokenBytes = new byte[TokenLengthBytes];
        rng.GetBytes(tokenBytes);
        return Convert.ToBase64String(tokenBytes).Replace("/", "_").Replace("+", "-").TrimEnd('=');
    }
}