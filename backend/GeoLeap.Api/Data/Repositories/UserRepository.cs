using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using GeoLeap.Api.Models;
using System.Linq.Expressions;

namespace GeoLeap.Api.Data.Repositories;

/// <summary>
/// Implementation of User repository with specialized user operations
/// </summary>
public class UserRepository : Repository<User, Guid>, IUserRepository
{
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;

    public UserRepository(ApplicationDbContext context, UserManager<User> userManager, RoleManager<IdentityRole<Guid>> roleManager) 
        : base(context)
    {
        _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
        _roleManager = roleManager ?? throw new ArgumentNullException(nameof(roleManager));
    }

    // User-specific query operations
    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
    }

    public async Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.UserName == username, cancellationToken);
    }

    public async Task<User?> GetByGoogleIdAsync(string googleId, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.GoogleId == googleId, cancellationToken);
    }

    public async Task<User?> GetByAppleIdAsync(string appleId, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.AppleId == appleId, cancellationToken);
    }

    public async Task<bool> IsEmailTakenAsync(string email, Guid? excludeUserId = null, CancellationToken cancellationToken = default)
    {
        var query = _dbSet.Where(u => u.Email == email);
        if (excludeUserId.HasValue)
        {
            query = query.Where(u => u.Id != excludeUserId.Value);
        }
        return await query.AnyAsync(cancellationToken);
    }

    public async Task<bool> IsUsernameTakenAsync(string username, Guid? excludeUserId = null, CancellationToken cancellationToken = default)
    {
        var query = _dbSet.Where(u => u.UserName == username);
        if (excludeUserId.HasValue)
        {
            query = query.Where(u => u.Id != excludeUserId.Value);
        }
        return await query.AnyAsync(cancellationToken);
    }

    // User authentication and security
    public async Task<User?> AuthenticateAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        var user = await GetByEmailAsync(email, cancellationToken);
        if (user != null && await _userManager.CheckPasswordAsync(user, password))
        {
            return user;
        }
        return null;
    }

    public async Task<bool> ValidatePasswordAsync(Guid userId, string password, CancellationToken cancellationToken = default)
    {
        var user = await GetByIdAsync(userId, cancellationToken);
        return user != null && await _userManager.CheckPasswordAsync(user, password);
    }

    public async Task UpdateLastLoginAsync(Guid userId, DateTime loginTime, CancellationToken cancellationToken = default)
    {
        var user = await GetByIdAsync(userId, cancellationToken);
        if (user != null)
        {
            user.LastLoginAt = loginTime;
            await UpdateAsync(user, cancellationToken);
        }
    }

    public async Task<IEnumerable<User>> GetSuspendedUsersAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet.Where(u => u.IsSuspended).ToListAsync(cancellationToken);
    }

    public async Task SuspendUserAsync(Guid userId, string reason, Guid adminUserId, CancellationToken cancellationToken = default)
    {
        var user = await GetByIdAsync(userId, cancellationToken);
        if (user != null)
        {
            user.IsSuspended = true;
            user.SuspendedAt = DateTime.UtcNow;
            user.SuspensionReason = reason;
            user.LastAdminAction = DateTime.UtcNow;
            user.ModifiedBy = adminUserId;
            user.ModifiedAt = DateTime.UtcNow;
            await UpdateAsync(user, cancellationToken);
        }
    }

    public async Task UnsuspendUserAsync(Guid userId, Guid adminUserId, CancellationToken cancellationToken = default)
    {
        var user = await GetByIdAsync(userId, cancellationToken);
        if (user != null)
        {
            user.IsSuspended = false;
            user.SuspendedAt = null;
            user.SuspensionReason = null;
            user.LastAdminAction = DateTime.UtcNow;
            user.ModifiedBy = adminUserId;
            user.ModifiedAt = DateTime.UtcNow;
            await UpdateAsync(user, cancellationToken);
        }
    }

    // User profile and preferences
    public async Task<User> GetUserWithPreferencesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(u => u.NotificationPreferences)
            .Include(u => u.SecurityPreferences)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken) 
            ?? throw new ArgumentException($"User with ID {userId} not found");
    }

    public async Task<User> GetUserWithStreamingServicesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(u => u.StreamingServices)
            .ThenInclude(uss => uss.StreamingService)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new ArgumentException($"User with ID {userId} not found");
    }

    public async Task<User> GetUserWithOnboardingAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(u => u.Onboarding)
            .Include(u => u.RegionPreferences)
            .Include(u => u.ContentPreferences)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new ArgumentException($"User with ID {userId} not found");
    }

    public async Task<User> GetUserWithRolesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new ArgumentException($"User with ID {userId} not found");
    }

    public async Task<User> GetUserWithSubscriptionAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new ArgumentException($"User with ID {userId} not found");
    }

    // User activity and analytics
    public async Task<IEnumerable<User>> GetActiveUsersAsync(DateTime since, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(u => u.IsActive && u.LastLoginAt >= since)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<User>> GetInactiveUsersAsync(DateTime since, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(u => u.LastLoginAt < since || u.LastLoginAt == null)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<User>> GetNewUsersAsync(DateTime since, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(u => u.CreatedAt >= since)
            .ToListAsync(cancellationToken);
    }

    public async Task<Dictionary<string, int>> GetUserStatsByDateRangeAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        var stats = new Dictionary<string, int>
        {
            ["TotalUsers"] = await _dbSet.CountAsync(cancellationToken),
            ["ActiveUsers"] = await _dbSet.CountAsync(u => u.IsActive, cancellationToken),
            ["VerifiedUsers"] = await _dbSet.CountAsync(u => u.EmailConfirmed, cancellationToken),
            ["SuspendedUsers"] = await _dbSet.CountAsync(u => u.IsSuspended, cancellationToken),
            ["NewUsersInRange"] = await _dbSet.CountAsync(u => u.CreatedAt >= startDate && u.CreatedAt <= endDate, cancellationToken),
            ["ActiveInRange"] = await _dbSet.CountAsync(u => u.LastLoginAt >= startDate && u.LastLoginAt <= endDate, cancellationToken)
        };

        return stats;
    }

    // User search and filtering
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
        var query = _dbSet.AsQueryable();

        // Apply filters
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            query = query.Where(u =>
                (u.Email != null && u.Email.Contains(searchTerm)) ||
                (u.UserName != null && u.UserName.Contains(searchTerm)) ||
                (u.FirstName != null && u.FirstName.Contains(searchTerm)) ||
                (u.LastName != null && u.LastName.Contains(searchTerm)) ||
                (u.DisplayName != null && u.DisplayName.Contains(searchTerm)));
        }

        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        if (isEmailVerified.HasValue)
            query = query.Where(u => u.EmailConfirmed == isEmailVerified.Value);

        if (isSuspended.HasValue)
            query = query.Where(u => u.IsSuspended == isSuspended.Value);

        if (registeredAfter.HasValue)
            query = query.Where(u => u.CreatedAt >= registeredAfter.Value);

        if (registeredBefore.HasValue)
            query = query.Where(u => u.CreatedAt <= registeredBefore.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        // Apply sorting
        query = sortBy?.ToLower() switch
        {
            "email" => sortDescending ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
            "username" => sortDescending ? query.OrderByDescending(u => u.UserName!) : query.OrderBy(u => u.UserName!),
            "created" => sortDescending ? query.OrderByDescending(u => u.CreatedAt) : query.OrderBy(u => u.CreatedAt),
            "lastlogin" => sortDescending ? query.OrderByDescending(u => u.LastLoginAt) : query.OrderBy(u => u.LastLoginAt),
            _ => query.OrderByDescending(u => u.CreatedAt)
        };

        var users = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (users, totalCount);
    }

    // User roles and permissions
    public async Task<IEnumerable<string>> GetUserRolesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await GetByIdAsync(userId, cancellationToken);
        return user != null ? await _userManager.GetRolesAsync(user) : new List<string>();
    }

    public async Task<IEnumerable<string>> GetUserPermissionsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var permissions = await _context.UserRoles
            .Where(ur => ur.UserId == userId)
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Name)
            .Distinct()
            .ToListAsync(cancellationToken);

        return permissions;
    }

    public async Task<bool> HasRoleAsync(Guid userId, string roleName, CancellationToken cancellationToken = default)
    {
        var user = await GetByIdAsync(userId, cancellationToken);
        return user != null && await _userManager.IsInRoleAsync(user, roleName);
    }

    public async Task<bool> HasPermissionAsync(Guid userId, string permission, CancellationToken cancellationToken = default)
    {
        return await _context.UserRoles
            .Where(ur => ur.UserId == userId)
            .SelectMany(ur => ur.Role.RolePermissions)
            .AnyAsync(rp => rp.Permission.Name == permission, cancellationToken);
    }

    public async Task AddToRoleAsync(Guid userId, string roleName, CancellationToken cancellationToken = default)
    {
        var user = await GetByIdAsync(userId, cancellationToken);
        if (user != null)
        {
            await _userManager.AddToRoleAsync(user, roleName);
        }
    }

    public async Task RemoveFromRoleAsync(Guid userId, string roleName, CancellationToken cancellationToken = default)
    {
        var user = await GetByIdAsync(userId, cancellationToken);
        if (user != null)
        {
            await _userManager.RemoveFromRoleAsync(user, roleName);
        }
    }

    // User audit and history
    public async Task<IEnumerable<UserAuditLog>> GetUserAuditLogsAsync(Guid userId, int? limit = null, CancellationToken cancellationToken = default)
    {
        var query = _context.UserAuditLogs
            .Where(log => log.UserId == userId)
            .OrderByDescending(log => log.Timestamp);

        if (limit.HasValue)
            query = (IOrderedQueryable<UserAuditLog>)query.Take(limit.Value);

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<UserActivityLog>> GetUserActivityLogsAsync(Guid userId, int? limit = null, CancellationToken cancellationToken = default)
    {
        var query = _context.UserActivityLogs
            .Where(log => log.UserId == userId)
            .OrderByDescending(log => log.Timestamp);

        if (limit.HasValue)
            query = (IOrderedQueryable<UserActivityLog>)query.Take(limit.Value);

        return await query.ToListAsync(cancellationToken);
    }

    public async Task LogUserActionAsync(Guid userId, string action, string? details = null, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var auditLog = new UserAuditLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = action,
            Details = details ?? string.Empty,
            IpAddress = ipAddress ?? string.Empty,
            Timestamp = DateTime.UtcNow
        };

        _context.UserAuditLogs.Add(auditLog);
        await _context.SaveChangesAsync(cancellationToken);
    }

    // User sessions
    public async Task<IEnumerable<UserSession>> GetActiveSessionsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.UserSessions
            .Where(s => s.UserId == userId && s.IsActive)
            .ToListAsync(cancellationToken);
    }

    public async Task<UserSession> CreateSessionAsync(Guid userId, string sessionToken, string? deviceInfo = null, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var session = new UserSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SessionToken = sessionToken,
            DeviceInfo = deviceInfo,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync(cancellationToken);
        return session;
    }

    public async Task InvalidateSessionAsync(string sessionToken, CancellationToken cancellationToken = default)
    {
        var session = await _context.UserSessions
            .FirstOrDefaultAsync(s => s.SessionToken == sessionToken, cancellationToken);

        if (session != null)
        {
            session.IsActive = false;
            session.EndedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task InvalidateAllUserSessionsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var sessions = await _context.UserSessions
            .Where(s => s.UserId == userId && s.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var session in sessions)
        {
            session.IsActive = false;
            session.EndedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    // Bulk operations
    public async Task<int> BulkActivateUsersAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken = default)
    {
        var users = await _dbSet.Where(u => userIds.Contains(u.Id)).ToListAsync(cancellationToken);
        foreach (var user in users)
        {
            user.IsActive = true;
            user.ModifiedAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync(cancellationToken);
        return users.Count;
    }

    public async Task<int> BulkDeactivateUsersAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken = default)
    {
        var users = await _dbSet.Where(u => userIds.Contains(u.Id)).ToListAsync(cancellationToken);
        foreach (var user in users)
        {
            user.IsActive = false;
            user.ModifiedAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync(cancellationToken);
        return users.Count;
    }

    public async Task<int> BulkDeleteInactiveUsersAsync(DateTime inactiveSince, CancellationToken cancellationToken = default)
    {
        var inactiveUsers = await _dbSet
            .Where(u => (u.LastLoginAt < inactiveSince || u.LastLoginAt == null) && u.CreatedAt < inactiveSince)
            .ToListAsync(cancellationToken);

        _dbSet.RemoveRange(inactiveUsers);
        await _context.SaveChangesAsync(cancellationToken);
        return inactiveUsers.Count;
    }

    // Export operations
    public async Task<IEnumerable<User>> GetUsersForExportAsync(
        Expression<Func<User, bool>>? filter = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbSet.AsQueryable();
        if (filter != null)
            query = query.Where(filter);

        return await query.ToListAsync(cancellationToken);
    }

    // Legacy compatibility methods
    public async Task<User?> FindByEmailAsync(string email) => await GetByEmailAsync(email);
    public async Task<User?> FindByUsernameAsync(string username) => await GetByUsernameAsync(username);
    public async Task<bool> EmailExistsAsync(string email) => await IsEmailTakenAsync(email);
    public async Task<bool> UsernameExistsAsync(string username) => await IsUsernameTakenAsync(username);

    public async Task<List<User>> FindByRoleAsync(string roleName)
    {
        var roleUsers = await _userManager.GetUsersInRoleAsync(roleName);
        return roleUsers.ToList();
    }

    public async Task<List<User>> SearchAsync(string searchTerm, int skip = 0, int take = 50)
    {
        var page = take > 0 ? (skip / take) + 1 : 1;
        var (users, _) = await SearchUsersAsync(searchTerm, page: page, pageSize: take);
        return users.ToList();
    }

    public async Task<int> GetTotalCountAsync() => await CountAsync();
    public async Task<int> GetActiveCountAsync() => await CountAsync(u => u.IsActive);

    public async Task<List<User>> GetRecentlyActiveAsync(int days = 30, int limit = 100)
    {
        var since = DateTime.UtcNow.AddDays(-days);
        var users = await GetActiveUsersAsync(since);
        return users.Take(limit).ToList();
    }

    public async Task<User?> GetByIdWithRolesAsync(Guid userId) => await GetUserWithRolesAsync(userId);
    public async Task<List<User>> GetUsersWithSubscriptionsAsync() => await _dbSet.ToListAsync();

    public async Task<bool> UpdateLastLoginAsync(Guid userId, DateTime lastLoginAt)
    {
        var user = await GetByIdAsync(userId);
        if (user != null)
        {
            user.LastLoginAt = lastLoginAt;
            await UpdateAsync(user);
        }
        return true;
    }

    public async Task<bool> UpdateEmailVerificationAsync(Guid userId, bool isVerified, DateTime? verifiedAt = null)
    {
        var user = await GetByIdAsync(userId);
        if (user != null)
        {
            user.EmailConfirmed = isVerified;
            user.ModifiedAt = verifiedAt ?? DateTime.UtcNow;
            await UpdateAsync(user);
            return true;
        }
        return false;
    }
}