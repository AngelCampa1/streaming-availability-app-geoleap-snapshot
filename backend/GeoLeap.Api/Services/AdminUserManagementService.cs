using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace GeoLeap.Api.Services;

public class AdminUserManagementService : IAdminUserManagementService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IAdminActionLogger _adminActionLogger;
    private readonly IRbacService _rbacService;
    private readonly ILogger<AdminUserManagementService> _logger;

    public AdminUserManagementService(
        ApplicationDbContext dbContext,
        IAdminActionLogger adminActionLogger,
        IRbacService rbacService,
        ILogger<AdminUserManagementService> logger)
    {
        _dbContext = dbContext;
        _adminActionLogger = adminActionLogger;
        _rbacService = rbacService;
        _logger = logger;
    }

    public async Task<AdminUserListResponse> GetUsersAsync(AdminUserListRequest request)
    {
        var query = _dbContext.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .AsQueryable();

        // Apply filters
        // FIXED: Week 1 Day 5 - Null reference warnings (CS8601/CS8602)
        if (!string.IsNullOrEmpty(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm;
            query = query.Where(u =>
                (u.Email != null && u.Email.Contains(searchTerm)) ||
                (u.FirstName != null && u.FirstName.Contains(searchTerm)) ||
                (u.LastName != null && u.LastName.Contains(searchTerm)) ||
                (u.DisplayName != null && u.DisplayName.Contains(searchTerm)));
        }

        if (!string.IsNullOrEmpty(request.Email))
        {
            var email = request.Email;
            query = query.Where(u => u.Email != null && u.Email.Contains(email));
        }

        if (request.IsSuspended.HasValue)
        {
            query = query.Where(u => u.IsSuspended == request.IsSuspended.Value);
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(u => u.IsActive == request.IsActive.Value);
        }

        if (request.RegisteredFrom.HasValue)
        {
            query = query.Where(u => u.CreatedAt >= request.RegisteredFrom.Value);
        }

        if (request.RegisteredTo.HasValue)
        {
            query = query.Where(u => u.CreatedAt <= request.RegisteredTo.Value);
        }

        if (!string.IsNullOrEmpty(request.Role))
        {
            query = query.Where(u => u.UserRoles.Any(ur => ur.Role!.Name == request.Role));
        }

        switch (request.Status)
        {
            case nameof(UserStatus.Active):
                query = query.Where(u => u.IsActive && !u.IsSuspended);
                break;
            case nameof(UserStatus.Inactive):
                query = query.Where(u => !u.IsActive);
                break;
            case nameof(UserStatus.Suspended):
                query = query.Where(u => u.IsSuspended);
                break;
            case nameof(UserStatus.EmailUnverified):
                query = query.Where(u => !u.EmailConfirmed);
                break;
        }

        // Get total count before pagination
        var totalCount = await query.CountAsync();

        // Apply sorting
        query = request.SortBy?.ToLower() switch
        {
            "email" => request.SortDirection?.ToLower() == "asc" 
                ? query.OrderBy(u => u.Email) 
                : query.OrderByDescending(u => u.Email),
            "firstname" => request.SortDirection?.ToLower() == "asc"
                ? query.OrderBy(u => u.FirstName!)
                : query.OrderByDescending(u => u.FirstName!),
            "lastname" => request.SortDirection?.ToLower() == "asc"
                ? query.OrderBy(u => u.LastName!)
                : query.OrderByDescending(u => u.LastName!),
            "lastloginat" => request.SortDirection?.ToLower() == "asc" 
                ? query.OrderBy(u => u.LastLoginAt) 
                : query.OrderByDescending(u => u.LastLoginAt),
            _ => request.SortDirection?.ToLower() == "asc" 
                ? query.OrderBy(u => u.CreatedAt) 
                : query.OrderByDescending(u => u.CreatedAt)
        };

        // Apply pagination
        var users = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        var userSummaries = users.Select(u => new AdminUserSummary
        {
            Id = u.Id,
            Email = u.Email ?? "",
            FirstName = u.FirstName,
            LastName = u.LastName,
            DisplayName = u.DisplayName ?? string.Empty,
            IsActive = u.IsActive,
            IsSuspended = u.IsSuspended,
            EmailConfirmed = u.EmailConfirmed,
            CreatedAt = u.CreatedAt,
            LastLoginAt = u.LastLoginAt,
            SuspendedAt = u.SuspendedAt,
            SuspensionReason = u.SuspensionReason,
            Roles = u.UserRoles.Where(ur => ur.IsActive).Select(ur => ur.Role!.Name).ToList()
        }).ToList();

        return new AdminUserListResponse
        {
            Users = userSummaries,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalPages = (int)Math.Ceiling((double)totalCount / request.PageSize)
        };
    }

    public async Task<AdminUserDetail?> GetUserDetailAsync(Guid userId)
    {
        var user = await _dbContext.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.SecurityEvents.OrderByDescending(se => se.CreatedAt).Take(10))
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return null;

        // Get recent admin actions for this user
        var recentAdminActions = await _dbContext.AdminActions
            .Where(aa => aa.TargetUserId == userId)
            .Include(aa => aa.AdminUser)
            .OrderByDescending(aa => aa.CreatedAt)
            .Take(10)
            .ToListAsync();

        // Get suspended by user name if applicable (removed SuspendedBy field due to cascade issues)
        string? suspendedByName = null;

        return new AdminUserDetail
        {
            Id = user.Id,
            Email = user.Email ?? "",
            FirstName = user.FirstName,
            LastName = user.LastName,
            DisplayName = user.DisplayName,
            PhoneNumber = user.PhoneNumber,
            IsActive = user.IsActive,
            IsSuspended = user.IsSuspended,
            EmailConfirmed = user.EmailConfirmed,
            PhoneNumberConfirmed = user.PhoneNumberConfirmed,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            SuspendedAt = user.SuspendedAt,
            SuspendedBy = null,
            SuspendedByName = suspendedByName,
            SuspensionReason = user.SuspensionReason,
            LastAdminAction = user.LastAdminAction?.ToString("yyyy-MM-dd HH:mm:ss"),
            TimeZone = user.Timezone,
            Language = user.Language,
            ProfileImageUrl = user.ProfileImageUrl,
            Bio = user.Bio,
            Roles = user.UserRoles.Where(ur => ur.IsActive).Select(ur => ur.Role!.Name).ToList(),
            RecentAdminActions = recentAdminActions.Select(aa => 
                $"{aa.ActionType} - {aa.Details} ({aa.CreatedAt:yyyy-MM-dd})"
            ).ToList(),
            RecentSecurityEvents = user.SecurityEvents.Select(se => new SecurityEventSummary
            {
                Id = se.Id,
                EventType = se.EventType,
                CreatedAt = se.CreatedAt,
                IpAddress = se.IpAddress,
                RiskScore = se.RiskScore
            }).ToList()
        };
    }

    public async Task<bool> SuspendUserAsync(UserSuspensionRequest request, Guid adminUserId, string correlationId)
    {
        var user = await _dbContext.Users.FindAsync(request.UserId);
        if (user == null || user.IsSuspended) return false;

        user.IsSuspended = true;
        user.SuspendedAt = DateTime.UtcNow;
        // user.SuspendedBy = adminUserId; // Removed due to cascade issues
        user.SuspensionReason = request.Reason;
        user.LastAdminAction = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        await _adminActionLogger.LogAdminActionAsync(
            AdminActionType.UserSuspend,
            adminUserId,
            request.UserId,
            new { request.Reason, request.IsPermanent, request.SuspendUntil },
            correlationId);

        _logger.LogInformation("User suspended", new
        {
            UserId = request.UserId,
            AdminUserId = adminUserId,
            CorrelationId = correlationId
        });

        return true;
    }

    public async Task<bool> UnsuspendUserAsync(UserUnsuspensionRequest request, Guid adminUserId, string correlationId)
    {
        var user = await _dbContext.Users.FindAsync(request.UserId);
        if (user == null || !user.IsSuspended) return false;

        user.IsSuspended = false;
        user.SuspendedAt = null;
        // user.SuspendedBy = null; // Removed due to cascade issues
        user.SuspensionReason = null;
        user.LastAdminAction = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        await _adminActionLogger.LogAdminActionAsync(
            AdminActionType.UserUnsuspend,
            adminUserId,
            request.UserId,
            new { request.Reason },
            correlationId);

        _logger.LogInformation("User unsuspended", new
        {
            UserId = request.UserId,
            AdminUserId = adminUserId,
            CorrelationId = correlationId
        });

        return true;
    }

    public async Task<bool> DeactivateUserAsync(Guid userId, string reason, Guid adminUserId, string correlationId)
    {
        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null || !user.IsActive) return false;

        user.IsActive = false;
        user.LastAdminAction = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        await _adminActionLogger.LogAdminActionAsync(
            AdminActionType.UserDeactivate,
            adminUserId,
            userId,
            new { Reason = reason },
            correlationId);

        return true;
    }

    public async Task<bool> ReactivateUserAsync(Guid userId, string reason, Guid adminUserId, string correlationId)
    {
        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null || user.IsActive) return false;

        user.IsActive = true;
        user.LastAdminAction = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        await _adminActionLogger.LogAdminActionAsync(
            AdminActionType.UserReactivate,
            adminUserId,
            userId,
            new { Reason = reason },
            correlationId);

        return true;
    }

    public async Task<bool> AssignRoleAsync(RoleAssignmentRequest request, Guid adminUserId, string correlationId)
    {
        var user = await _dbContext.Users.FindAsync(request.UserId);
        var role = await _dbContext.Roles.FirstOrDefaultAsync(r => r!.Name == request.RoleName);
        
        if (user == null || role == null) return false;

        // Check if user already has this role
        var existingUserRole = await _dbContext.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == request.UserId && ur.RoleId == role.Id && ur.IsActive);
        
        if (existingUserRole != null) return false;

        var userRole = new UserRole
        {
            UserId = request.UserId,
            RoleId = role.Id,
            AssignedBy = adminUserId,
            AssignedAt = DateTime.UtcNow,
            ExpiresAt = request.ExpiresAt,
            IsActive = true
        };

        _dbContext.UserRoles.Add(userRole);
        user.LastAdminAction = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        await _adminActionLogger.LogAdminActionAsync(
            AdminActionType.RoleAssign,
            adminUserId,
            request.UserId,
            new { request.RoleName, request.Reason, request.ExpiresAt },
            correlationId);

        return true;
    }

    public async Task<bool> RemoveRoleAsync(RoleRemovalRequest request, Guid adminUserId, string correlationId)
    {
        var role = await _dbContext.Roles.FirstOrDefaultAsync(r => r!.Name == request.RoleName);
        if (role == null) return false;

        var userRole = await _dbContext.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == request.UserId && ur.RoleId == role.Id && ur.IsActive);
        
        if (userRole == null) return false;

        userRole.IsActive = false;
        userRole.RevokedAt = DateTime.UtcNow;
        userRole.RevokedBy = adminUserId;

        var user = await _dbContext.Users.FindAsync(request.UserId);
        if (user != null)
        {
            user.LastAdminAction = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync();

        await _adminActionLogger.LogAdminActionAsync(
            AdminActionType.RoleRemove,
            adminUserId,
            request.UserId,
            new { request.RoleName, request.Reason },
            correlationId);

        return true;
    }

    public async Task<string> StartImpersonationAsync(ImpersonationRequest request, Guid adminUserId, string correlationId)
    {
        var user = await _dbContext.Users.FindAsync(request.UserId);
        if (user == null) throw new ArgumentException("User not found");

        // Generate secure session token
        var sessionToken = GenerateSecureToken();

        var impersonationSession = new UserImpersonationSession
        {
            AdminUserId = adminUserId,
            ImpersonatedUserId = request.UserId,
            SessionToken = sessionToken,
            Reason = request.Reason,
            StartedAt = DateTime.UtcNow,
            IsActive = true
        };

        _dbContext.UserImpersonationSessions.Add(impersonationSession);
        
        user.LastAdminAction = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        await _adminActionLogger.LogAdminActionAsync(
            AdminActionType.UserImpersonationStart,
            adminUserId,
            request.UserId,
            new { request.Reason, DurationMinutes = request.DurationMinutes },
            correlationId);

        return sessionToken;
    }

    public async Task<bool> EndImpersonationAsync(Guid sessionId, Guid adminUserId, string correlationId)
    {
        var session = await _dbContext.UserImpersonationSessions.FindAsync(sessionId);
        if (session == null || !session.IsActive) return false;

        session.IsActive = false;
        session.EndedAt = DateTime.UtcNow;
        session.EndReason = ImpersonationEndReason.ManualEnd.ToString();

        await _dbContext.SaveChangesAsync();

        await _adminActionLogger.LogAdminActionAsync(
            AdminActionType.UserImpersonationEnd,
            adminUserId,
            session.ImpersonatedUserId,
            new { SessionId = sessionId, EndReason = "ManualEnd" },
            correlationId);

        return true;
    }

    public async Task<UserImpersonationSession?> GetActiveImpersonationSessionAsync(string sessionToken)
    {
        return await _dbContext.UserImpersonationSessions
            .Include(uis => uis.AdminUser)
            .Include(uis => uis.ImpersonatedUser)
            .FirstOrDefaultAsync(uis => uis.SessionToken == sessionToken && uis.IsActive);
    }

    public async Task<bool> ProcessBulkActionAsync(BulkUserActionRequest request, Guid adminUserId, string correlationId)
    {
        var users = await _dbContext.Users
            .Where(u => request.UserIds.Contains(u.Id))
            .ToListAsync();

        if (!users.Any()) return false;

        foreach (var user in users)
        {
            switch (request.Action.ToLower())
            {
                case "suspend":
                    if (!user.IsSuspended)
                    {
                        user.IsSuspended = true;
                        user.SuspendedAt = DateTime.UtcNow;
                        // user.SuspendedBy = adminUserId; // Removed due to cascade issues
                        user.SuspensionReason = request.Reason;
                    }
                    break;
                case "unsuspend":
                    if (user.IsSuspended)
                    {
                        user.IsSuspended = false;
                        user.SuspendedAt = null;
                        // user.SuspendedBy = null; // Removed due to cascade issues
                        user.SuspensionReason = null;
                    }
                    break;
                case "deactivate":
                    user.IsActive = false;
                    break;
                case "reactivate":
                    user.IsActive = true;
                    break;
            }
            user.LastAdminAction = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync();

        await _adminActionLogger.LogAdminActionAsync(
            AdminActionType.BulkOperation,
            adminUserId,
            null,
            new { request.Action, UserCount = users.Count, request.Reason },
            correlationId);

        return true;
    }

    private static string GenerateSecureToken()
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[32];
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }
}