using GeoLeap.Api.Data.Repositories;
using GeoLeap.Api.Models;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;

namespace GeoLeap.Api.Data.Services;

/// <summary>
/// Data access service implementation for User domain operations
/// </summary>
public class UserDataAccessService : IUserDataAccessService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UserDataAccessService> _logger;

    public UserDataAccessService(IUnitOfWork unitOfWork, ILogger<UserDataAccessService> logger)
    {
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    // Basic CRUD operations
    public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _unitOfWork.Users.GetByIdAsync(id, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user by ID {UserId}", id);
            throw;
        }
    }

    public async Task<IEnumerable<User>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _unitOfWork.Users.GetAllAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all users");
            throw;
        }
    }

    public async Task<User> CreateAsync(User entity, CancellationToken cancellationToken = default)
    {
        try
        {
            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            
            var user = await _unitOfWork.Users.AddAsync(entity, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            
            await _unitOfWork.Users.LogUserActionAsync(user.Id, "UserCreated", $"User account created: {user.Email}");
            await _unitOfWork.CommitTransactionAsync(cancellationToken);
            
            _logger.LogInformation("User created successfully: {UserId} - {Email}", user.Id, user.Email);
            return user;
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            _logger.LogError(ex, "Error creating user: {Email}", entity.Email);
            throw;
        }
    }

    public async Task<User> UpdateAsync(User entity, CancellationToken cancellationToken = default)
    {
        try
        {
            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            
            await _unitOfWork.Users.UpdateAsync(entity, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            
            await _unitOfWork.Users.LogUserActionAsync(entity.Id, "UserUpdated", $"User profile updated: {entity.Email}");
            await _unitOfWork.CommitTransactionAsync(cancellationToken);
            
            _logger.LogInformation("User updated successfully: {UserId} - {Email}", entity.Id, entity.Email);
            return entity;
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            _logger.LogError(ex, "Error updating user: {UserId}", entity.Id);
            throw;
        }
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            
            var user = await _unitOfWork.Users.GetByIdAsync(id, cancellationToken);
            if (user == null) return false;

            await _unitOfWork.Users.DeleteAsync(id, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            
            await _unitOfWork.CommitTransactionAsync(cancellationToken);
            
            _logger.LogInformation("User deleted successfully: {UserId} - {Email}", id, user.Email);
            return true;
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            _logger.LogError(ex, "Error deleting user: {UserId}", id);
            throw;
        }
    }

    public async Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _unitOfWork.Users.ExistsAsync(id, cancellationToken);
    }

    public async Task<int> CountAsync(CancellationToken cancellationToken = default)
    {
        return await _unitOfWork.Users.CountAsync(cancellationToken);
    }

    // User authentication and management
    public async Task<User?> AuthenticateUserAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        try
        {
            var user = await _unitOfWork.Users.AuthenticateAsync(email, password, cancellationToken);
            if (user != null)
            {
                await _unitOfWork.Users.UpdateLastLoginAsync(user.Id, DateTime.UtcNow, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                await _unitOfWork.Users.LogUserActionAsync(user.Id, "UserLogin", "User logged in successfully");
                
                _logger.LogInformation("User authenticated successfully: {Email}", email);
            }
            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error authenticating user: {Email}", email);
            throw;
        }
    }

    public async Task<User?> GetUserByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _unitOfWork.Users.GetByEmailAsync(email, cancellationToken);
    }

    public async Task<User?> GetUserByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        return await _unitOfWork.Users.GetByUsernameAsync(username, cancellationToken);
    }

    public async Task<bool> IsEmailAvailableAsync(string email, Guid? excludeUserId = null, CancellationToken cancellationToken = default)
    {
        return !await _unitOfWork.Users.IsEmailTakenAsync(email, excludeUserId, cancellationToken);
    }

    public async Task<bool> IsUsernameAvailableAsync(string username, Guid? excludeUserId = null, CancellationToken cancellationToken = default)
    {
        return !await _unitOfWork.Users.IsUsernameTakenAsync(username, excludeUserId, cancellationToken);
    }

    // User profile and preferences
    public async Task<User> GetUserWithProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _unitOfWork.Users.GetUserWithPreferencesAsync(userId, cancellationToken);
    }

    public async Task<User> UpdateUserProfileAsync(Guid userId, User updatedUser, CancellationToken cancellationToken = default)
    {
        try
        {
            var existingUser = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
            if (existingUser == null)
                throw new ArgumentException($"User with ID {userId} not found");

            // Update user properties
            existingUser.FirstName = updatedUser.FirstName;
            existingUser.LastName = updatedUser.LastName;
            existingUser.DisplayName = updatedUser.DisplayName;
            existingUser.Bio = updatedUser.Bio;
            existingUser.ProfileImageUrl = updatedUser.ProfileImageUrl;
            existingUser.Timezone = updatedUser.Timezone;
            existingUser.Language = updatedUser.Language;
            existingUser.ModifiedAt = DateTime.UtcNow;

            return await UpdateAsync(existingUser, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user profile: {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> UpdateUserPreferencesAsync(Guid userId, UserPreferences preferences, CancellationToken cancellationToken = default)
    {
        try
        {
            preferences.UserId = userId.ToString();
            await _unitOfWork.UserPreferences.UpdateAsync(preferences, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            
            _logger.LogInformation("User preferences updated: {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user preferences: {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> UpdateUserStreamingServicesAsync(Guid userId, IEnumerable<Guid> streamingServiceIds, CancellationToken cancellationToken = default)
    {
        try
        {
            await _unitOfWork.BeginTransactionAsync(cancellationToken);

            // Remove existing streaming services
            var existingServices = await _unitOfWork.UserStreamingServices.FindAsync(uss => uss.UserId == userId, cancellationToken);
            await _unitOfWork.UserStreamingServices.DeleteRangeAsync(existingServices, cancellationToken);

            // Add new streaming services
            var userStreamingServices = streamingServiceIds.Select(serviceId => new UserStreamingService
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                StreamingServiceId = serviceId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });

            await _unitOfWork.UserStreamingServices.AddRangeAsync(userStreamingServices, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitTransactionAsync(cancellationToken);

            _logger.LogInformation("User streaming services updated: {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            _logger.LogError(ex, "Error updating user streaming services: {UserId}", userId);
            throw;
        }
    }

    // User security and sessions
    public async Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!await _unitOfWork.Users.ValidatePasswordAsync(userId, currentPassword, cancellationToken))
            {
                return false;
            }

            var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
            if (user == null) return false;

            // Note: In production, use proper password hashing (ASP.NET Core Identity handles this)
            user.PasswordHash = HashPassword(newPassword);
            user.ModifiedAt = DateTime.UtcNow;

            await _unitOfWork.Users.UpdateAsync(user, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            await _unitOfWork.Users.LogUserActionAsync(userId, "PasswordChanged", "User password changed successfully");
            
            _logger.LogInformation("Password changed successfully for user: {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password for user: {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> ResetPasswordAsync(string email, string resetToken, string newPassword, CancellationToken cancellationToken = default)
    {
        try
        {
            var user = await _unitOfWork.Users.GetByEmailAsync(email, cancellationToken);
            if (user == null) return false;

            // Validate reset token (simplified - in production, verify token expiry and security)
            var tokenRecord = await _unitOfWork.PasswordResetTokens.GetAsync(
                t => t.UserId == user.Id && t.Token == resetToken && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow,
                cancellationToken);

            if (tokenRecord == null) return false;

            // Reset password
            user.PasswordHash = HashPassword(newPassword);
            user.ModifiedAt = DateTime.UtcNow;
            
            // Mark token as used
            tokenRecord.IsUsed = true;
            tokenRecord.UsedAt = DateTime.UtcNow;

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            await _unitOfWork.Users.UpdateAsync(user, cancellationToken);
            await _unitOfWork.PasswordResetTokens.UpdateAsync(tokenRecord, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitTransactionAsync(cancellationToken);

            await _unitOfWork.Users.LogUserActionAsync(user.Id, "PasswordReset", "User password reset successfully");
            
            _logger.LogInformation("Password reset successfully for user: {Email}", email);
            return true;
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            _logger.LogError(ex, "Error resetting password for user: {Email}", email);
            throw;
        }
    }

    public async Task<string> GeneratePasswordResetTokenAsync(string email, CancellationToken cancellationToken = default)
    {
        try
        {
            var user = await _unitOfWork.Users.GetByEmailAsync(email, cancellationToken);
            if (user == null) throw new ArgumentException("User not found");

            var token = GenerateSecureToken();
            var resetToken = new PasswordResetToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = token,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(1), // 1 hour expiry
                IsUsed = false
            };

            await _unitOfWork.PasswordResetTokens.AddAsync(resetToken, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            await _unitOfWork.Users.LogUserActionAsync(user.Id, "PasswordResetRequested", "Password reset token generated");
            
            _logger.LogInformation("Password reset token generated for user: {Email}", email);
            return token;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating password reset token for user: {Email}", email);
            throw;
        }
    }

    public async Task<UserSession> CreateUserSessionAsync(Guid userId, string deviceInfo, string ipAddress, CancellationToken cancellationToken = default)
    {
        try
        {
            var sessionToken = GenerateSecureToken();
            var session = await _unitOfWork.Users.CreateSessionAsync(userId, sessionToken, deviceInfo, ipAddress, cancellationToken);
            
            _logger.LogInformation("User session created: {UserId} - {SessionId}", userId, session.Id);
            return session;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user session: {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> InvalidateUserSessionAsync(string sessionToken, CancellationToken cancellationToken = default)
    {
        try
        {
            await _unitOfWork.Users.InvalidateSessionAsync(sessionToken, cancellationToken);
            
            _logger.LogInformation("User session invalidated: {SessionToken}", sessionToken);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error invalidating user session: {SessionToken}", sessionToken);
            throw;
        }
    }

    // User roles and permissions
    public async Task<IEnumerable<string>> GetUserRolesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _unitOfWork.Users.GetUserRolesAsync(userId, cancellationToken);
    }

    public async Task<bool> AssignUserRoleAsync(Guid userId, string roleName, CancellationToken cancellationToken = default)
    {
        try
        {
            await _unitOfWork.Users.AddToRoleAsync(userId, roleName, cancellationToken);
            await _unitOfWork.Users.LogUserActionAsync(userId, "RoleAssigned", $"Role assigned: {roleName}");
            
            _logger.LogInformation("Role assigned to user: {UserId} - {RoleName}", userId, roleName);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning role to user: {UserId} - {RoleName}", userId, roleName);
            throw;
        }
    }

    public async Task<bool> RemoveUserRoleAsync(Guid userId, string roleName, CancellationToken cancellationToken = default)
    {
        try
        {
            await _unitOfWork.Users.RemoveFromRoleAsync(userId, roleName, cancellationToken);
            await _unitOfWork.Users.LogUserActionAsync(userId, "RoleRemoved", $"Role removed: {roleName}");
            
            _logger.LogInformation("Role removed from user: {UserId} - {RoleName}", userId, roleName);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing role from user: {UserId} - {RoleName}", userId, roleName);
            throw;
        }
    }

    public async Task<bool> UserHasPermissionAsync(Guid userId, string permission, CancellationToken cancellationToken = default)
    {
        return await _unitOfWork.Users.HasPermissionAsync(userId, permission, cancellationToken);
    }

    // User administration
    public async Task<bool> SuspendUserAsync(Guid userId, string reason, Guid adminUserId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _unitOfWork.Users.SuspendUserAsync(userId, reason, adminUserId, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            
            _logger.LogInformation("User suspended: {UserId} by {AdminUserId} - {Reason}", userId, adminUserId, reason);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error suspending user: {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> UnsuspendUserAsync(Guid userId, Guid adminUserId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _unitOfWork.Users.UnsuspendUserAsync(userId, adminUserId, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            
            _logger.LogInformation("User unsuspended: {UserId} by {AdminUserId}", userId, adminUserId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unsuspending user: {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> ActivateUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
            if (user == null) return false;

            user.IsActive = true;
            user.ModifiedAt = DateTime.UtcNow;

            await _unitOfWork.Users.UpdateAsync(user, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            
            _logger.LogInformation("User activated: {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating user: {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> DeactivateUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
            if (user == null) return false;

            user.IsActive = false;
            user.ModifiedAt = DateTime.UtcNow;

            await _unitOfWork.Users.UpdateAsync(user, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            
            _logger.LogInformation("User deactivated: {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating user: {UserId}", userId);
            throw;
        }
    }

    // User analytics and reporting
    public async Task<(IEnumerable<User> Users, int TotalCount)> SearchUsersAsync(
        string? searchTerm = null,
        bool? isActive = null,
        bool? isEmailVerified = null,
        bool? isSuspended = null,
        DateTime? registeredAfter = null,
        DateTime? registeredBefore = null,
        int page = 1,
        int pageSize = 20,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default)
    {
        return await _unitOfWork.Users.SearchUsersAsync(
            searchTerm, isActive, isEmailVerified, isSuspended,
            registeredAfter, registeredBefore, page, pageSize,
            sortBy, sortDescending, cancellationToken);
    }

    public async Task<Dictionary<string, int>> GetUserStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null, CancellationToken cancellationToken = default)
    {
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end = endDate ?? DateTime.UtcNow;
        
        return await _unitOfWork.Users.GetUserStatsByDateRangeAsync(start, end, cancellationToken);
    }

    public async Task<IEnumerable<User>> GetActiveUsersAsync(int days = 30, CancellationToken cancellationToken = default)
    {
        var since = DateTime.UtcNow.AddDays(-days);
        return await _unitOfWork.Users.GetActiveUsersAsync(since, cancellationToken);
    }

    public async Task<IEnumerable<User>> GetInactiveUsersAsync(int days = 30, CancellationToken cancellationToken = default)
    {
        var since = DateTime.UtcNow.AddDays(-days);
        return await _unitOfWork.Users.GetInactiveUsersAsync(since, cancellationToken);
    }

    // Bulk operations
    public async Task<int> BulkActivateUsersAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken = default)
    {
        return await _unitOfWork.Users.BulkActivateUsersAsync(userIds, cancellationToken);
    }

    public async Task<int> BulkDeactivateUsersAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken = default)
    {
        return await _unitOfWork.Users.BulkDeactivateUsersAsync(userIds, cancellationToken);
    }

    public async Task<int> BulkDeleteInactiveUsersAsync(int inactiveDays = 365, CancellationToken cancellationToken = default)
    {
        var inactiveSince = DateTime.UtcNow.AddDays(-inactiveDays);
        return await _unitOfWork.Users.BulkDeleteInactiveUsersAsync(inactiveSince, cancellationToken);
    }

    // Helper methods
    private string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }

    private string GenerateSecureToken()
    {
        using var rng = RandomNumberGenerator.Create();
        var tokenBytes = new byte[32];
        rng.GetBytes(tokenBytes);
        return Convert.ToBase64String(tokenBytes);
    }
}