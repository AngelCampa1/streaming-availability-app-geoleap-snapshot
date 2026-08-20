using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IRbacService
{
    Task<bool> HasPermissionAsync(Guid userId, string permission);
    Task<bool> HasPermissionAsync(Guid userId, string resource, string action);
    Task<IEnumerable<string>> GetUserPermissionsAsync(Guid userId);
    Task<IEnumerable<Role>> GetUserRolesAsync(Guid userId);
    Task<bool> AssignRoleAsync(Guid userId, string roleName, Guid? assignedBy = null);
    Task<bool> RemoveRoleAsync(Guid userId, string roleName, Guid? removedBy = null);
    Task<bool> IsInRoleAsync(Guid userId, string roleName);
    Task LogAccessAttemptAsync(Guid userId, string resource, string action, bool success, string? details = null, string? ipAddress = null, string? userAgent = null);
    Task<User?> GetUserWithRolesAsync(Guid userId);
    Task<bool> CanAccessResourceAsync(Guid userId, string resource, string action);
    Task<bool> SyncSubscriptionRoleAsync(Guid userId);
}