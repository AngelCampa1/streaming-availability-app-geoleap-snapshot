using GeoLeap.Api.Models;
using System.Linq.Expressions;

namespace GeoLeap.Api.Data.Repositories;

/// <summary>
/// Specialized repository interface for User entity operations
/// </summary>
public interface IUserRepository : IRepository<User, Guid>
{
    // User-specific query operations
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<User?> GetByGoogleIdAsync(string googleId, CancellationToken cancellationToken = default);
    Task<User?> GetByAppleIdAsync(string appleId, CancellationToken cancellationToken = default);
    Task<bool> IsEmailTakenAsync(string email, Guid? excludeUserId = null, CancellationToken cancellationToken = default);
    Task<bool> IsUsernameTakenAsync(string username, Guid? excludeUserId = null, CancellationToken cancellationToken = default);

    // User authentication and security
    Task<User?> AuthenticateAsync(string email, string password, CancellationToken cancellationToken = default);
    Task<bool> ValidatePasswordAsync(Guid userId, string password, CancellationToken cancellationToken = default);
    Task UpdateLastLoginAsync(Guid userId, DateTime loginTime, CancellationToken cancellationToken = default);
    Task<IEnumerable<User>> GetSuspendedUsersAsync(CancellationToken cancellationToken = default);
    Task SuspendUserAsync(Guid userId, string reason, Guid adminUserId, CancellationToken cancellationToken = default);
    Task UnsuspendUserAsync(Guid userId, Guid adminUserId, CancellationToken cancellationToken = default);

    // User profile and preferences
    Task<User> GetUserWithPreferencesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<User> GetUserWithStreamingServicesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<User> GetUserWithOnboardingAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<User> GetUserWithRolesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<User> GetUserWithSubscriptionAsync(Guid userId, CancellationToken cancellationToken = default);

    // User activity and analytics
    Task<IEnumerable<User>> GetActiveUsersAsync(DateTime since, CancellationToken cancellationToken = default);
    Task<IEnumerable<User>> GetInactiveUsersAsync(DateTime since, CancellationToken cancellationToken = default);
    Task<IEnumerable<User>> GetNewUsersAsync(DateTime since, CancellationToken cancellationToken = default);
    Task<Dictionary<string, int>> GetUserStatsByDateRangeAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);

    // User search and filtering
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

    // User roles and permissions
    Task<IEnumerable<string>> GetUserRolesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<string>> GetUserPermissionsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> HasRoleAsync(Guid userId, string roleName, CancellationToken cancellationToken = default);
    Task<bool> HasPermissionAsync(Guid userId, string permission, CancellationToken cancellationToken = default);
    Task AddToRoleAsync(Guid userId, string roleName, CancellationToken cancellationToken = default);
    Task RemoveFromRoleAsync(Guid userId, string roleName, CancellationToken cancellationToken = default);

    // User audit and history
    Task<IEnumerable<UserAuditLog>> GetUserAuditLogsAsync(Guid userId, int? limit = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<UserActivityLog>> GetUserActivityLogsAsync(Guid userId, int? limit = null, CancellationToken cancellationToken = default);
    Task LogUserActionAsync(Guid userId, string action, string? details = null, string? ipAddress = null, CancellationToken cancellationToken = default);

    // User sessions
    Task<IEnumerable<UserSession>> GetActiveSessionsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<UserSession> CreateSessionAsync(Guid userId, string sessionToken, string? deviceInfo = null, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task InvalidateSessionAsync(string sessionToken, CancellationToken cancellationToken = default);
    Task InvalidateAllUserSessionsAsync(Guid userId, CancellationToken cancellationToken = default);

    // Bulk operations
    Task<int> BulkActivateUsersAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken = default);
    Task<int> BulkDeactivateUsersAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken = default);
    Task<int> BulkDeleteInactiveUsersAsync(DateTime inactiveSince, CancellationToken cancellationToken = default);

    // Export operations
    Task<IEnumerable<User>> GetUsersForExportAsync(
        Expression<Func<User, bool>>? filter = null,
        CancellationToken cancellationToken = default);

    // Legacy compatibility methods
    Task<User?> FindByEmailAsync(string email);
    Task<User?> FindByUsernameAsync(string username);
    Task<List<User>> FindByRoleAsync(string roleName);
    Task<bool> EmailExistsAsync(string email);
    Task<bool> UsernameExistsAsync(string username);
    Task<List<User>> SearchAsync(string searchTerm, int skip = 0, int take = 50);
    Task<int> GetTotalCountAsync();
    Task<int> GetActiveCountAsync();
    Task<List<User>> GetRecentlyActiveAsync(int days = 30, int limit = 100);
    Task<User?> GetByIdWithRolesAsync(Guid userId);
    Task<List<User>> GetUsersWithSubscriptionsAsync();
    Task<bool> UpdateLastLoginAsync(Guid userId, DateTime lastLoginAt);
    Task<bool> UpdateEmailVerificationAsync(Guid userId, bool isVerified, DateTime? verifiedAt = null);
}