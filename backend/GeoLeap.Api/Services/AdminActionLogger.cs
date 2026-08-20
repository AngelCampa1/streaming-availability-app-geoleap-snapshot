using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GeoLeap.Api.Services;

public class AdminActionLogger : IAdminActionLogger
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<AdminActionLogger> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AdminActionLogger(
        ApplicationDbContext dbContext, 
        ILogger<AdminActionLogger> logger, 
        IHttpContextAccessor httpContextAccessor)
    {
        _dbContext = dbContext;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogAdminActionAsync(AdminActionType actionType, Guid adminUserId, Guid? targetUserId, object? details, string correlationId)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        
        var adminAction = new AdminAction
        {
            ActionType = actionType.ToString(),
            AdminUserId = adminUserId,
            TargetUserId = targetUserId,
            Details = details != null ? JsonSerializer.Serialize(details, new JsonSerializerOptions { WriteIndented = false }) : null,
            CorrelationId = Guid.Parse(correlationId),
            IpAddress = httpContext?.Connection?.RemoteIpAddress?.ToString(),
            UserAgent = httpContext?.Request?.Headers["User-Agent"].FirstOrDefault()
        };

        _dbContext.AdminActions.Add(adminAction);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Admin action logged successfully", new
        {
            ActionId = adminAction.Id,
            ActionType = actionType,
            AdminUserId = adminUserId,
            TargetUserId = targetUserId,
            CorrelationId = correlationId,
            IpAddress = adminAction.IpAddress
        });
    }

    public async Task<IEnumerable<AdminAction>> GetAdminActionsAsync(
        Guid? adminUserId = null, 
        Guid? targetUserId = null, 
        DateTime? from = null, 
        DateTime? to = null, 
        int skip = 0, 
        int take = 50)
    {
        var query = _dbContext.AdminActions
            .Include(aa => aa.AdminUser)
            .Include(aa => aa.TargetUser)
            .AsQueryable();

        if (adminUserId.HasValue)
        {
            query = query.Where(aa => aa.AdminUserId == adminUserId.Value);
        }

        if (targetUserId.HasValue)
        {
            query = query.Where(aa => aa.TargetUserId == targetUserId.Value);
        }

        if (from.HasValue)
        {
            query = query.Where(aa => aa.CreatedAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(aa => aa.CreatedAt <= to.Value);
        }

        return await query
            .OrderByDescending(aa => aa.CreatedAt)
            .Skip(skip)
            .Take(Math.Min(take, 100)) // Cap at 100 to prevent excessive data retrieval
            .ToListAsync();
    }

    public async Task<AdminAction?> GetAdminActionAsync(Guid actionId)
    {
        return await _dbContext.AdminActions
            .Include(aa => aa.AdminUser)
            .Include(aa => aa.TargetUser)
            .FirstOrDefaultAsync(aa => aa.Id == actionId);
    }

    public async Task LogActionAsync(Guid userId, string action, string entity, string category, string correlationId, Guid? targetId = null, object? details = null)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        
        var adminAction = new AdminAction
        {
            ActionType = $"{action}_{entity}",
            AdminUserId = userId,
            TargetUserId = targetId,
            Details = details != null ? JsonSerializer.Serialize(details, new JsonSerializerOptions { WriteIndented = false }) : null,
            CorrelationId = Guid.Parse(correlationId),
            IpAddress = httpContext?.Connection?.RemoteIpAddress?.ToString(),
            UserAgent = httpContext?.Request?.Headers["User-Agent"].FirstOrDefault()
        };

        _dbContext.AdminActions.Add(adminAction);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Admin action logged", new
        {
            ActionId = adminAction.Id,
            Action = action,
            Entity = entity,
            Category = category,
            UserId = userId,
            TargetId = targetId,
            CorrelationId = correlationId,
            IpAddress = adminAction.IpAddress
        });
    }
}