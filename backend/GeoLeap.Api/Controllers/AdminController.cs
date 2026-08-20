using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Attributes;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Middleware;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequirePermission("admin", "system:configure")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IRbacService _rbacService;
    private readonly IAdminUserManagementService _adminUserManagementService;
    private readonly IAdminActionLogger _adminActionLogger;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        ApplicationDbContext context, 
        IRbacService rbacService, 
        IAdminUserManagementService adminUserManagementService,
        IAdminActionLogger adminActionLogger,
        ILogger<AdminController> logger)
    {
        _context = context;
        _rbacService = rbacService;
        _adminUserManagementService = adminUserManagementService;
        _adminActionLogger = adminActionLogger;
        _logger = logger;
    }

    [HttpGet("users")]
    [RequirePermission("admin:users:view")]
    public async Task<ActionResult<AdminUserListResponse>> GetUsers([FromQuery] AdminUserListRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var result = await _adminUserManagementService.GetUsersAsync(request);

            try
            {
                await _adminActionLogger.LogAdminActionAsync(
                    AdminActionType.UserView,
                    GetCurrentUserId() ?? Guid.Empty,
                    null,
                    new { Action = "ListUsers", request.SearchTerm, request.Page, request.PageSize },
                    correlationId);
            }
            catch (Exception logEx)
            {
                _logger.LogError(logEx, "Failed to log admin action for GetUsers");
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving users");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error retrieving users", correlationId));
        }
    }

    [HttpGet("users/{userId:guid}")]
    [RequirePermission("admin:users:view")]
    public async Task<ActionResult<AdminUserDetail>> GetUser(Guid userId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userDetail = await _adminUserManagementService.GetUserDetailAsync(userId);
            if (userDetail == null)
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "User", userId.ToString(), correlationId));

            try
            {
                await _adminActionLogger.LogAdminActionAsync(
                    AdminActionType.UserView,
                    GetCurrentUserId() ?? Guid.Empty,
                    userId,
                    new { Action = "ViewUserDetail" },
                    correlationId);
            }
            catch (Exception logEx)
            {
                _logger.LogError(logEx, "Failed to log admin action for GetUser {UserId}", userId);
            }

            return Ok(userDetail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user {UserId}", userId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error retrieving user", correlationId));
        }
    }

    [HttpPost("users/{userId:guid}/roles")]
    [HttpPost("users/{userId:guid}/assign-role")] // Alternative route for tests
    [RequirePermission("admin:users:manage")]
    public async Task<ActionResult> AssignRole(Guid userId, [FromBody] AssignRoleRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            // Support both RoleName and Role properties for compatibility
            var roleName = !string.IsNullOrWhiteSpace(request.RoleName) ? request.RoleName : request.Role;
            if (string.IsNullOrWhiteSpace(roleName))
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "Role name is required", correlationId));

            var success = await _rbacService.AssignRoleAsync(userId, roleName, currentUserId);

            if (!success)
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "Failed to assign role", correlationId));

            return Ok(new { message = $"Role '{roleName}' assigned successfully" });
        }
        catch (Exception ex)
        {
            var roleName = !string.IsNullOrWhiteSpace(request.RoleName) ? request.RoleName : request.Role;
            _logger.LogError(ex, "Error assigning role {RoleName} to user {UserId}", roleName, userId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error assigning role", correlationId));
        }
    }

    [HttpDelete("users/{userId:guid}/roles/{roleName}")]
    [RequirePermission("admin:users:manage")]
    public async Task<ActionResult> RemoveRole(Guid userId, string roleName)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var success = await _rbacService.RemoveRoleAsync(userId, roleName, currentUserId);

            if (!success)
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "Failed to remove role", correlationId));

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing role {RoleName} from user {UserId}", roleName, userId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error removing role", correlationId));
        }
    }

    [HttpGet("roles")]
    [RequirePermission("admin:roles:manage")]
    public async Task<ActionResult<IEnumerable<object>>> GetRoles()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var roles = await _context.Roles
                .Include(r => r.RolePermissions.Where(rp => rp.IsActive))
                .ThenInclude(rp => rp.Permission)
                .Where(r => r.IsActive)
                .OrderBy(r => r.Priority)
                .Select(r => new
                {
                    r.Id,
                    r.Name,
                    r.Description,
                    r.IsSystemRole,
                    r.Priority,
                    r.CreatedAt,
                    Permissions = r.RolePermissions
                        .Where(rp => rp.IsActive && rp.Permission.IsActive)
                        .Select(rp => rp.Permission.Name),
                    UserCount = r.UserRoles.Count(ur => ur.IsActive)
                })
                .ToListAsync();

            return Ok(roles);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving roles");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error retrieving roles", correlationId));
        }
    }

    [HttpGet("permissions")]
    [RequirePermission("admin:roles:manage")]
    public async Task<ActionResult<IEnumerable<object>>> GetPermissions()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var permissions = await _context.Permissions
                .Where(p => p.IsActive)
                .OrderBy(p => p.Resource)
                .ThenBy(p => p.Action)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Resource,
                    p.Action,
                    p.Description
                })
                .ToListAsync();

            return Ok(permissions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving permissions");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error retrieving permissions", correlationId));
        }
    }

    [HttpGet("audit-logs")]
    [RequirePermission("admin:analytics:view")]
    public async Task<ActionResult<IEnumerable<object>>> GetAuditLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 100, [FromQuery] Guid? userId = null)
    {
        var correlationId = GetCorrelationId();
        try
        {
            pageSize = Math.Min(pageSize, 100);
            var skip = (page - 1) * pageSize;

            var countQuery = _context.UserAuditLogs.AsQueryable();
            if (userId.HasValue)
            {
                countQuery = countQuery.Where(al => al.UserId == userId.Value || al.AffectedUserId == userId.Value);
            }
            var totalLogs = await countQuery.CountAsync();

            var dataQuery = _context.UserAuditLogs
                .Include(al => al.User)
                .Include(al => al.AffectedUser)
                .Include(al => al.Role)
                .AsQueryable();

            if (userId.HasValue)
            {
                dataQuery = dataQuery.Where(al => al.UserId == userId.Value || al.AffectedUserId == userId.Value);
            }

            var auditLogs = await dataQuery
                .OrderByDescending(al => al.Timestamp)
                .Skip(skip)
                .Take(pageSize)
                .Select(al => new
                {
                    al.Id,
                    al.UserId,
                    UserEmail = al.User.Email,
                    al.AffectedUserId,
                    AffectedUserEmail = al.AffectedUser != null ? al.AffectedUser.Email : null,
                    al.Action,
                    al.Resource,
                    al.Details,
                    al.IpAddress,
                    al.Success,
                    al.Timestamp,
                    RoleName = al.Role != null ? al.Role.Name : null
                })
                .ToListAsync();

            return Ok(new
            {
                AuditLogs = auditLogs,
                TotalCount = totalLogs,
                Page = page,
                PageSize = pageSize,
                TotalPages = pageSize > 0 ? (int)Math.Ceiling((double)totalLogs / pageSize) : 0
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving audit logs");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error retrieving audit logs", correlationId));
        }
    }

    // Admin User Management Endpoints
    [HttpPost("users/{userId:guid}/suspend")]
    [RequirePermission("admin:users:suspend")]
    public async Task<IActionResult> SuspendUser(Guid userId, [FromBody] UserSuspensionRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            request.UserId = userId;

            var success = await _adminUserManagementService.SuspendUserAsync(request, GetCurrentUserId() ?? Guid.Empty, correlationId);
            if (!success)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "User not found or already suspended", correlationId));
            }

            return Ok(new { Message = "User suspended successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error suspending user {UserId}", userId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error suspending user", correlationId));
        }
    }

    [HttpPost("users/{userId:guid}/unsuspend")]
    [RequirePermission("admin:users:suspend")]
    public async Task<IActionResult> UnsuspendUser(Guid userId, [FromBody] UserUnsuspensionRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            request.UserId = userId;

            var success = await _adminUserManagementService.UnsuspendUserAsync(request, GetCurrentUserId() ?? Guid.Empty, correlationId);
            if (!success)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "User not found or not suspended", correlationId));
            }

            return Ok(new { Message = "User unsuspended successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unsuspending user {UserId}", userId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error unsuspending user", correlationId));
        }
    }

    [HttpPost("users/{userId:guid}/deactivate")]
    [RequirePermission("admin:users:edit")]
    public async Task<IActionResult> DeactivateUser(Guid userId, [FromBody] AdminActionRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var success = await _adminUserManagementService.DeactivateUserAsync(userId, request.Reason, GetCurrentUserId() ?? Guid.Empty, correlationId);
            if (!success)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "User not found or already deactivated", correlationId));
            }

            return Ok(new { Message = "User deactivated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating user {UserId}", userId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error deactivating user", correlationId));
        }
    }

    [HttpPost("users/{userId:guid}/reactivate")]
    [RequirePermission("admin:users:edit")]
    public async Task<IActionResult> ReactivateUser(Guid userId, [FromBody] AdminActionRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var success = await _adminUserManagementService.ReactivateUserAsync(userId, request.Reason, GetCurrentUserId() ?? Guid.Empty, correlationId);
            if (!success)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "User not found or already activated", correlationId));
            }

            return Ok(new { Message = "User reactivated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reactivating user {UserId}", userId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error reactivating user", correlationId));
        }
    }

    [HttpPost("users/{userId:guid}/impersonate")]
    [RequirePermission("admin:users:impersonate")]
    public async Task<IActionResult> StartImpersonation(Guid userId, [FromBody] ImpersonationRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            request.UserId = userId;

            var sessionToken = await _adminUserManagementService.StartImpersonationAsync(request, GetCurrentUserId() ?? Guid.Empty, correlationId);
            return Ok(new { SessionToken = sessionToken, Message = "Impersonation session started" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting impersonation for user {UserId}", userId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error starting impersonation", correlationId));
        }
    }

    [HttpPost("impersonation/{sessionId:guid}/end")]
    [RequirePermission("admin:users:impersonate")]
    public async Task<IActionResult> EndImpersonation(Guid sessionId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var success = await _adminUserManagementService.EndImpersonationAsync(sessionId, GetCurrentUserId() ?? Guid.Empty, correlationId);
            if (!success)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "Session not found or already ended", correlationId));
            }

            return Ok(new { Message = "Impersonation session ended" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ending impersonation session {SessionId}", sessionId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error ending impersonation session", correlationId));
        }
    }

    [HttpPost("users/bulk-actions")]
    [RequirePermission("admin:users:edit")]
    public async Task<IActionResult> ProcessBulkAction([FromBody] BulkUserActionRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var success = await _adminUserManagementService.ProcessBulkActionAsync(request, GetCurrentUserId() ?? Guid.Empty, correlationId);
            if (!success)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "No users found or invalid action", correlationId));
            }

            return Ok(new { Message = $"Bulk action '{request.Action}' processed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing bulk action {Action}", request.Action);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error processing bulk action", correlationId));
        }
    }

    [HttpGet("admin-actions")]
    [RequirePermission("admin:audit:view")]
    public async Task<IActionResult> GetAdminActions(
        [FromQuery] Guid? adminUserId = null,
        [FromQuery] Guid? targetUserId = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var actions = await _adminActionLogger.GetAdminActionsAsync(adminUserId, targetUserId, from, to, skip, take);
            return Ok(actions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving admin actions");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error retrieving admin actions", correlationId));
        }
    }

    [HttpGet("admin-actions/{actionId:guid}")]
    [RequirePermission("admin:audit:view")]
    public async Task<IActionResult> GetAdminAction(Guid actionId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var action = await _adminActionLogger.GetAdminActionAsync(actionId);
            if (action == null)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "AdminAction", actionId.ToString(), correlationId));
            }

            return Ok(action);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving admin action {ActionId}", actionId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error retrieving admin action", correlationId));
        }
    }


    /// <summary>
    /// Get system statistics for admin dashboard
    /// </summary>
    [HttpGet("system-stats")]
    [RequirePermission("admin", "system:view")]
    public async Task<ActionResult> GetSystemStats()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var currentUserId = GetCurrentUserId() ?? Guid.Empty;

            // Mock system statistics
            var stats = new
            {
                totalUsers = await _context.Users.CountAsync(),
                activeUsers = await _context.Users.Where(u => u.LastLoginAt > DateTime.UtcNow.AddDays(-30)).CountAsync(),
                totalContent = 42000, // Mock value
                systemHealth = "Healthy",
                uptime = TimeSpan.FromDays(15).ToString(),
                memoryUsage = "512 MB",
                cpuUsage = "15%",
                timestamp = DateTime.UtcNow
            };

            try
            {
                await _adminActionLogger.LogAdminActionAsync(
                    AdminActionType.DataExport,
                    currentUserId,
                    null,
                    new { Action = "ViewSystemStats" },
                    correlationId);
            }
            catch (Exception logEx)
            {
                _logger.LogError(logEx, "Failed to log admin action for GetSystemStats");
            }

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving system statistics");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Error retrieving system statistics", correlationId));
        }
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    private string GetCorrelationId()
    {
        return HttpContext.GetCorrelationId() ?? HttpContext.TraceIdentifier;
    }
}

public class AssignRoleRequest
{
    public string RoleName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // Alternative property name for compatibility
}

public class AdminActionRequest
{
    public string Reason { get; set; } = string.Empty;
}