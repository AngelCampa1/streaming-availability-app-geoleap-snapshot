using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IAdminUserManagementService
{
    Task<AdminUserListResponse> GetUsersAsync(AdminUserListRequest request);
    Task<AdminUserDetail?> GetUserDetailAsync(Guid userId);
    Task<bool> SuspendUserAsync(UserSuspensionRequest request, Guid adminUserId, string correlationId);
    Task<bool> UnsuspendUserAsync(UserUnsuspensionRequest request, Guid adminUserId, string correlationId);
    Task<bool> DeactivateUserAsync(Guid userId, string reason, Guid adminUserId, string correlationId);
    Task<bool> ReactivateUserAsync(Guid userId, string reason, Guid adminUserId, string correlationId);
    Task<bool> AssignRoleAsync(RoleAssignmentRequest request, Guid adminUserId, string correlationId);
    Task<bool> RemoveRoleAsync(RoleRemovalRequest request, Guid adminUserId, string correlationId);
    Task<string> StartImpersonationAsync(ImpersonationRequest request, Guid adminUserId, string correlationId);
    Task<bool> EndImpersonationAsync(Guid sessionId, Guid adminUserId, string correlationId);
    Task<UserImpersonationSession?> GetActiveImpersonationSessionAsync(string sessionToken);
    Task<bool> ProcessBulkActionAsync(BulkUserActionRequest request, Guid adminUserId, string correlationId);
}