using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IAdminActionLogger
{
    Task LogAdminActionAsync(AdminActionType actionType, Guid adminUserId, Guid? targetUserId, object? details, string correlationId);
    Task LogActionAsync(Guid userId, string action, string entity, string category, string correlationId, Guid? targetId = null, object? details = null);
    Task<IEnumerable<AdminAction>> GetAdminActionsAsync(Guid? adminUserId = null, Guid? targetUserId = null, DateTime? from = null, DateTime? to = null, int skip = 0, int take = 50);
    Task<AdminAction?> GetAdminActionAsync(Guid actionId);
}