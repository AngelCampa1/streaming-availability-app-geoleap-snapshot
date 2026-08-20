using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public class RbacService : IRbacService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<RbacService> _logger;
    private readonly TimeSpan _cacheExpiry = TimeSpan.FromMinutes(15);

    public RbacService(ApplicationDbContext context, IMemoryCache cache, ILogger<RbacService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    public async Task<bool> HasPermissionAsync(Guid userId, string permission)
    {
        try
        {
            var cacheKey = $"user_permissions_{userId}";
            
            if (!_cache.TryGetValue(cacheKey, out HashSet<string>? userPermissions))
            {
                userPermissions = await LoadUserPermissionsAsync(userId);
                _cache.Set(cacheKey, userPermissions, _cacheExpiry);
            }

            return userPermissions?.Contains(permission) ?? false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking permission {Permission} for user {UserId}", permission, userId);
            return false; // Fail secure
        }
    }

    public async Task<bool> HasPermissionAsync(Guid userId, string resource, string action)
    {
        var permission = $"{resource}:{action}";
        return await HasPermissionAsync(userId, permission);
    }

    public async Task<IEnumerable<string>> GetUserPermissionsAsync(Guid userId)
    {
        try
        {
            var cacheKey = $"user_permissions_{userId}";
            
            if (!_cache.TryGetValue(cacheKey, out HashSet<string>? userPermissions))
            {
                userPermissions = await LoadUserPermissionsAsync(userId);
                _cache.Set(cacheKey, userPermissions, _cacheExpiry);
            }

            return userPermissions ?? new HashSet<string>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading permissions for user {UserId}", userId);
            return new List<string>();
        }
    }

    public async Task<IEnumerable<Role>> GetUserRolesAsync(Guid userId)
    {
        try
        {
            var cacheKey = $"user_roles_{userId}";
            
            if (!_cache.TryGetValue(cacheKey, out List<Role>? userRoles))
            {
                userRoles = await _context.UserRoles
                    .Where(ur => ur.UserId == userId && ur.IsActive)
                    .Include(ur => ur.Role)
                    .Select(ur => ur.Role)
                    .Where(r => r.IsActive)
                    .OrderBy(r => r.Priority)
                    .ToListAsync();

                _cache.Set(cacheKey, userRoles, _cacheExpiry);
            }

            return userRoles ?? new List<Role>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading roles for user {UserId}", userId);
            return new List<Role>();
        }
    }

    public async Task<bool> AssignRoleAsync(Guid userId, string roleName, Guid? assignedBy = null)
    {
        try
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == roleName && r.IsActive);
            if (role == null)
            {
                _logger.LogWarning("Role {RoleName} not found", roleName);
                return false;
            }

            var existingUserRole = await _context.UserRoles
                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == role.Id);

            if (existingUserRole != null)
            {
                if (existingUserRole.IsActive)
                {
                    _logger.LogInformation("User {UserId} already has role {RoleName}", userId, roleName);
                    return true;
                }
                
                // Reactivate existing role assignment
                existingUserRole.IsActive = true;
                existingUserRole.AssignedAt = DateTime.UtcNow;
                existingUserRole.AssignedBy = assignedBy;
            }
            else
            {
                // Create new role assignment
                var userRole = new UserRole
                {
                    UserId = userId,
                    RoleId = role.Id,
                    AssignedBy = assignedBy,
                    AssignedAt = DateTime.UtcNow,
                    IsActive = true
                };

                await _context.UserRoles.AddAsync(userRole);
            }

            await _context.SaveChangesAsync();

            // Clear cache
            ClearUserCache(userId);

            // Log the assignment
            await LogRoleChangeAsync(userId, role.Id, "role_assigned", assignedBy);

            _logger.LogInformation("Role {RoleName} assigned to user {UserId} by {AssignedBy}", roleName, userId, assignedBy);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning role {RoleName} to user {UserId}", roleName, userId);
            return false;
        }
    }

    public async Task<bool> RemoveRoleAsync(Guid userId, string roleName, Guid? removedBy = null)
    {
        try
        {
            var userRole = await _context.UserRoles
                .Include(ur => ur.Role)
                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.Role.Name == roleName && ur.IsActive);

            if (userRole == null)
            {
                _logger.LogWarning("User {UserId} does not have active role {RoleName}", userId, roleName);
                return false;
            }

            userRole.IsActive = false;
            await _context.SaveChangesAsync();

            // Clear cache
            ClearUserCache(userId);

            // Log the removal
            await LogRoleChangeAsync(userId, userRole.RoleId, "role_removed", removedBy);

            _logger.LogInformation("Role {RoleName} removed from user {UserId} by {RemovedBy}", roleName, userId, removedBy);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing role {RoleName} from user {UserId}", roleName, userId);
            return false;
        }
    }

    public async Task<bool> IsInRoleAsync(Guid userId, string roleName)
    {
        try
        {
            var roles = await GetUserRolesAsync(userId);
            return roles.Any(r => r.Name == roleName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if user {UserId} is in role {RoleName}", userId, roleName);
            return false;
        }
    }

    public async Task LogAccessAttemptAsync(Guid userId, string resource, string action, bool success, string? details = null, string? ipAddress = null, string? userAgent = null)
    {
        try
        {
            var auditLog = new UserAuditLog
            {
                UserId = userId,
                Action = action,
                Resource = resource,
                Details = details ?? string.Empty,
                IpAddress = ipAddress ?? string.Empty,
                UserAgent = userAgent ?? string.Empty,
                Success = success,
                Timestamp = DateTime.UtcNow
            };

            await _context.UserAuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging access attempt for user {UserId} on {Resource}:{Action}", userId, resource, action);
        }
    }

    public async Task<User?> GetUserWithRolesAsync(Guid userId)
    {
        try
        {
            return await _context.Users
                .Include(u => u.UserRoles.Where(ur => ur.IsActive))
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading user {UserId} with roles", userId);
            return null;
        }
    }

    public async Task<bool> CanAccessResourceAsync(Guid userId, string resource, string action)
    {
        var hasPermission = await HasPermissionAsync(userId, resource, action);
        
        // Log the access attempt
        await LogAccessAttemptAsync(userId, resource, action, hasPermission);
        
        return hasPermission;
    }

    private async Task<HashSet<string>> LoadUserPermissionsAsync(Guid userId)
    {
        // Load role-based permissions
        var rolePermissions = await _context.UserRoles
            .Where(ur => ur.UserId == userId && ur.IsActive)
            .Include(ur => ur.Role)
            .ThenInclude(r => r.RolePermissions.Where(rp => rp.IsActive))
            .ThenInclude(rp => rp.Permission)
            .SelectMany(ur => ur.Role.RolePermissions
                .Where(rp => rp.IsActive && rp.Permission.IsActive)
                .Select(rp => rp.Permission.Name))
            .Distinct()
            .ToListAsync();

        var permissions = new HashSet<string>(rolePermissions);

        // Add default permissions for all authenticated users (basic self-service operations)
        permissions.Add("User:ViewProfile");
        permissions.Add("User:UpdateProfile");
        permissions.Add("User:ViewPreferences");
        permissions.Add("User:UpdatePreferences");
        permissions.Add("User:ViewActivityLog");
        permissions.Add("User:ViewSocialAccounts");
        permissions.Add("User:ManageSocialAccounts");
        permissions.Add("User:ChangeEmail");
        permissions.Add("User:ChangePassword");

        // Add default content permissions (free tier)
        permissions.Add("Watchlist:View");
        permissions.Add("Watchlist:Add");
        permissions.Add("Watchlist:Remove");
        permissions.Add("Search:Basic");
        permissions.Add("Search:History:View");
        permissions.Add("Search:History:Delete");
        permissions.Add("Notifications:View");
        permissions.Add("Notifications:Manage");
        permissions.Add("Dashboard:View");

        // Check subscription status and add subscription-based permissions
        var userSubscription = await _context.UserSubscriptions
            .FirstOrDefaultAsync(us => us.UserId == userId && us.IsActive);

        if (userSubscription != null && userSubscription.Tier >= SubscriptionTier.Premium)
        {
            // Add premium subscription permissions
            permissions.Add("content:search:unlimited");
            permissions.Add("content:details:full");
            permissions.Add("content:streaming:urls");
            permissions.Add("content:export");
            permissions.Add("content:recommendations");
            permissions.Add("subscription:manage");
            permissions.Add("subscription:history:view");
        }
        else if (userSubscription != null && userSubscription.Tier >= SubscriptionTier.Basic)
        {
            // Add basic subscription permissions
            permissions.Add("content:search:extended");
            permissions.Add("subscription:manage");
            permissions.Add("subscription:history:view");
        }

        return permissions;
    }

    public async Task<bool> SyncSubscriptionRoleAsync(Guid userId)
    {
        try
        {
            var userSubscription = await _context.UserSubscriptions
                .FirstOrDefaultAsync(us => us.UserId == userId);

            // Determine target role based on subscription
            string targetRoleName = userSubscription?.IsActive == true && userSubscription.Tier >= SubscriptionTier.Premium 
                ? "Premium" 
                : "User";

            // Check current premium role status
            var currentPremiumRole = await _context.UserRoles
                .Include(ur => ur.Role)
                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.Role.Name == "Premium" && ur.IsActive);

            var currentUserRole = await _context.UserRoles
                .Include(ur => ur.Role)
                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.Role.Name == "User" && ur.IsActive);

            // Apply role changes based on subscription status
            if (targetRoleName == "Premium" && currentPremiumRole == null)
            {
                // Add premium role if subscription is active
                await AssignRoleAsync(userId, "Premium", null);
                _logger.LogInformation("Premium role assigned to user {UserId} based on subscription", userId);
            }
            else if (targetRoleName == "User" && currentPremiumRole != null)
            {
                // Remove premium role if subscription is inactive
                await RemoveRoleAsync(userId, "Premium", null);
                
                // Ensure user has basic User role
                if (currentUserRole == null)
                {
                    await AssignRoleAsync(userId, "User", null);
                }
                _logger.LogInformation("Premium role removed from user {UserId} due to subscription status", userId);
            }

            // Clear cache to ensure fresh permissions
            ClearUserCache(userId);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing subscription role for user {UserId}", userId);
            return false;
        }
    }

    private async Task LogRoleChangeAsync(Guid userId, Guid roleId, string action, Guid? performedBy)
    {
        try
        {
            var auditLog = new UserAuditLog
            {
                UserId = performedBy ?? userId,
                AffectedUserId = userId,
                RoleId = roleId,
                Action = action,
                Resource = "role",
                Success = true,
                Timestamp = DateTime.UtcNow
            };

            await _context.UserAuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging role change for user {UserId}", userId);
        }
    }

    private void ClearUserCache(Guid userId)
    {
        _cache.Remove($"user_permissions_{userId}");
        _cache.Remove($"user_roles_{userId}");
    }
}