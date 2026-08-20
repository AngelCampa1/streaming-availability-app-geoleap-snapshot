using GeoLeap.Api.Models;

namespace GeoLeap.Api.Data.Services;

/// <summary>
/// Data access service interface for User domain operations
/// </summary>
public interface IUserDataAccessService : IDataAccessService<User, Guid>
{
    // User authentication and management
    Task<User?> AuthenticateUserAsync(string email, string password, CancellationToken cancellationToken = default);
    Task<User?> GetUserByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<User?> GetUserByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<bool> IsEmailAvailableAsync(string email, Guid? excludeUserId = null, CancellationToken cancellationToken = default);
    Task<bool> IsUsernameAvailableAsync(string username, Guid? excludeUserId = null, CancellationToken cancellationToken = default);
    
    // User profile and preferences
    Task<User> GetUserWithProfileAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<User> UpdateUserProfileAsync(Guid userId, User updatedUser, CancellationToken cancellationToken = default);
    Task<bool> UpdateUserPreferencesAsync(Guid userId, UserPreferences preferences, CancellationToken cancellationToken = default);
    Task<bool> UpdateUserStreamingServicesAsync(Guid userId, IEnumerable<Guid> streamingServiceIds, CancellationToken cancellationToken = default);
    
    // User security and sessions
    Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken cancellationToken = default);
    Task<bool> ResetPasswordAsync(string email, string resetToken, string newPassword, CancellationToken cancellationToken = default);
    Task<string> GeneratePasswordResetTokenAsync(string email, CancellationToken cancellationToken = default);
    Task<UserSession> CreateUserSessionAsync(Guid userId, string deviceInfo, string ipAddress, CancellationToken cancellationToken = default);
    Task<bool> InvalidateUserSessionAsync(string sessionToken, CancellationToken cancellationToken = default);
    
    // User roles and permissions
    Task<IEnumerable<string>> GetUserRolesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> AssignUserRoleAsync(Guid userId, string roleName, CancellationToken cancellationToken = default);
    Task<bool> RemoveUserRoleAsync(Guid userId, string roleName, CancellationToken cancellationToken = default);
    Task<bool> UserHasPermissionAsync(Guid userId, string permission, CancellationToken cancellationToken = default);
    
    // User administration
    Task<bool> SuspendUserAsync(Guid userId, string reason, Guid adminUserId, CancellationToken cancellationToken = default);
    Task<bool> UnsuspendUserAsync(Guid userId, Guid adminUserId, CancellationToken cancellationToken = default);
    Task<bool> ActivateUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> DeactivateUserAsync(Guid userId, CancellationToken cancellationToken = default);
    
    // User analytics and reporting
    Task<(IEnumerable<User> Users, int TotalCount)> SearchUsersAsync(
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
        CancellationToken cancellationToken = default);
    
    Task<Dictionary<string, int>> GetUserStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<User>> GetActiveUsersAsync(int days = 30, CancellationToken cancellationToken = default);
    Task<IEnumerable<User>> GetInactiveUsersAsync(int days = 30, CancellationToken cancellationToken = default);
    
    // Bulk operations
    Task<int> BulkActivateUsersAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken = default);
    Task<int> BulkDeactivateUsersAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken = default);
    Task<int> BulkDeleteInactiveUsersAsync(int inactiveDays = 365, CancellationToken cancellationToken = default);
}