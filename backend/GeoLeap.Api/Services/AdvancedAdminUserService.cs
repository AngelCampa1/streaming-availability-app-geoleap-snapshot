using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Extended admin user management service with advanced search and bulk operations
/// </summary>
public class AdvancedAdminUserService : IAdvancedAdminUserService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdvancedAdminUserService> _logger;
    private readonly IAdminActionLogger _adminActionLogger;

    public AdvancedAdminUserService(
        ApplicationDbContext context,
        ILogger<AdvancedAdminUserService> logger,
        IAdminActionLogger adminActionLogger)
    {
        _context = context;
        _logger = logger;
        _adminActionLogger = adminActionLogger;
    }

    /// <summary>
    /// Advanced user search with filtering and faceting
    /// </summary>
    public async Task<AdminUserSearchResponse> SearchUsersAsync(AdminUserSearchRequest request, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Advanced user search with request: {@Request}", correlationId, request);

            var query = _context.Users.AsQueryable();

            // Apply text search
            // FIXED: Week 1 Day 5 - Null reference warnings (CS8601/CS8602)
            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm;
                query = query.Where(u =>
                    (u.Email != null && u.Email.Contains(searchTerm)) ||
                    (u.UserName != null && u.UserName.Contains(searchTerm)) ||
                    (u.FirstName != null && u.FirstName.Contains(searchTerm)) ||
                    (u.LastName != null && u.LastName.Contains(searchTerm)));
            }

            // Apply filters
            if (request.IsActive.HasValue)
                query = query.Where(u => u.IsActive == request.IsActive.Value);

            if (request.EmailConfirmed.HasValue)
                query = query.Where(u => u.EmailConfirmed == request.EmailConfirmed.Value);

            if (request.CreatedAfter.HasValue)
                query = query.Where(u => u.CreatedAt >= request.CreatedAfter.Value);

            if (request.CreatedBefore.HasValue)
                query = query.Where(u => u.CreatedAt <= request.CreatedBefore.Value);

            if (request.LastLoginAfter.HasValue)
                query = query.Where(u => u.LastLogin >= request.LastLoginAfter.Value);

            if (request.LastLoginBefore.HasValue)
                query = query.Where(u => u.LastLogin <= request.LastLoginBefore.Value);

            var totalCount = await query.CountAsync();

            // Apply sorting
            query = request.SortBy?.ToLower() switch
            {
                "email" => request.SortDescending ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
                "createdat" => request.SortDescending ? query.OrderByDescending(u => u.CreatedAt) : query.OrderBy(u => u.CreatedAt),
                "lastlogin" => request.SortDescending ? query.OrderByDescending(u => u.LastLogin) : query.OrderBy(u => u.LastLogin),
                _ => query.OrderByDescending(u => u.CreatedAt)
            };

            // FIXED: Week 1 Day 5 - Null reference warnings (CS8601/CS8602)
            var users = await query
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(u => new AdminUserSummary
                {
                    Id = u.Id,
                    Email = u.Email ?? string.Empty,
                    UserName = u.UserName ?? string.Empty,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    IsActive = u.IsActive,
                    EmailConfirmed = u.EmailConfirmed,
                    CreatedAt = u.CreatedAt,
                    LastLogin = u.LastLogin,
                    FailedLoginAttempts = u.AccessFailedCount,
                    IsLockedOut = u.LockoutEnd.HasValue && u.LockoutEnd > DateTimeOffset.UtcNow
                })
                .ToListAsync();

            return new AdminUserSearchResponse
            {
                Users = users,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / request.PageSize)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error searching users", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get detailed user information for admin view
    /// </summary>
    public async Task<AdminUserSummary?> GetUserDetailAsync(Guid userId, string correlationId)
    {
        try
        {
            // FIXED: Week 1 Day 5 - Null reference warnings (CS8601/CS8602)
            var user = await _context.Users
                .Where(u => u.Id == userId)
                .Select(u => new AdminUserSummary
                {
                    Id = u.Id,
                    Email = u.Email ?? string.Empty,
                    UserName = u.UserName ?? string.Empty,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    IsActive = u.IsActive,
                    EmailConfirmed = u.EmailConfirmed,
                    CreatedAt = u.CreatedAt,
                    LastLogin = u.LastLogin,
                    FailedLoginAttempts = u.AccessFailedCount,
                    IsLockedOut = u.LockoutEnd.HasValue && u.LockoutEnd > DateTimeOffset.UtcNow,
                    LockoutEnd = u.LockoutEnd
                })
                .FirstOrDefaultAsync();

            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting user detail for {UserId}", correlationId, userId);
            throw;
        }
    }

    /// <summary>
    /// Process bulk actions on multiple users
    /// </summary>
    public async Task<BulkActionResult> ProcessBulkActionAsync(
        BulkUserActionRequest request,
        Guid performedBy,
        string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Processing bulk action {Action} on {UserCount} users", 
                correlationId, request.Action, request.UserIds.Count);

            var actionId = Guid.NewGuid();
            var result = new BulkActionResult
            {
                ActionId = actionId,
                Status = BulkActionStatus.InProgress,
                TotalUsers = request.UserIds.Count,
                ProcessedUsers = 0,
                SuccessfulUsers = 0,
                FailedUsers = 0,
                Errors = new List<BulkActionError>()
            };

            var users = await _context.Users
                .Where(u => request.UserIds.Contains(u.Id))
                .ToListAsync();

            foreach (var user in users)
            {
                try
                {
                    switch (request.Action.ToLower())
                    {
                        case "activate":
                            user.IsActive = true;
                            break;
                        case "deactivate":
                            user.IsActive = false;
                            break;
                        case "unlock":
                            user.LockoutEnd = null;
                            user.AccessFailedCount = 0;
                            break;
                        case "lock":
                            user.LockoutEnd = DateTimeOffset.UtcNow.AddDays(30);
                            break;
                        case "confirmEmail":
                            user.EmailConfirmed = true;
                            break;
                        default:
                            result.Errors.Add(new BulkActionError { ErrorMessage = $"Unknown action: {request.Action}" });
                            continue;
                    }

                    result.SuccessfulUsers++;
                    
                    // Log admin action
                    await _adminActionLogger.LogActionAsync(
                        performedBy,
                        $"Bulk {request.Action}",
                        "User",
                        user.Id.ToString(),
                        correlationId,
                        null,
                        new { Action = request.Action, Reason = request.Reason });
                }
                catch (Exception ex)
                {
                    result.FailedUsers++;
                    result.Errors.Add(new BulkActionError { ErrorMessage = $"User {user.Id}: {ex.Message}" });
                    _logger.LogError(ex, "[{CorrelationId}] Error processing bulk action for user {UserId}", correlationId, user.Id);
                }
                finally
                {
                    result.ProcessedUsers++;
                }
            }

            await _context.SaveChangesAsync();

            result.Status = BulkActionStatus.Completed;
            result.CompletedAt = DateTime.UtcNow;

            _logger.LogInformation("[{CorrelationId}] Bulk action completed: {SuccessfulUsers}/{TotalUsers} successful",
                correlationId, result.SuccessfulUsers, result.TotalUsers);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error processing bulk action", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get status of bulk action operation
    /// </summary>
    public async Task<BulkActionResult?> GetBulkActionStatusAsync(Guid actionId, string correlationId)
    {
        try
        {
            await Task.CompletedTask;
            // In a real implementation, this would be stored in the database
            // For now, return a mock completed status
            return new BulkActionResult
            {
                ActionId = actionId,
                Status = BulkActionStatus.Completed,
                TotalUsers = 0,
                ProcessedUsers = 0,
                SuccessfulUsers = 0,
                FailedUsers = 0,
                Errors = new List<BulkActionError>(),
                CompletedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting bulk action status for {ActionId}", correlationId, actionId);
            throw;
        }
    }

    /// <summary>
    /// Export user data in various formats
    /// </summary>
    public async Task<Stream> ExportUsersAsync(
        AdminUserSearchRequest searchRequest,
        string format,
        Guid requestedBy,
        string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Exporting users in format: {Format}", correlationId, format);

            // Get all matching users without pagination
            var fullRequest = searchRequest with { Page = 1, PageSize = 10000 };
            var response = await SearchUsersAsync(fullRequest, correlationId);

            var stream = new MemoryStream();
            var writer = new StreamWriter(stream);

            if (format.Equals("csv", StringComparison.OrdinalIgnoreCase))
            {
                // Write CSV header
                await writer.WriteLineAsync("Id,Email,UserName,FirstName,LastName,IsActive,EmailConfirmed,CreatedAt,LastLogin");

                // Write data rows
                foreach (var user in response.Users)
                {
                    await writer.WriteLineAsync($"{user.Id},{user.Email},{user.UserName},{user.FirstName},{user.LastName},{user.IsActive},{user.EmailConfirmed},{user.CreatedAt:yyyy-MM-dd HH:mm:ss},{user.LastLogin:yyyy-MM-dd HH:mm:ss}");
                }
            }
            else
            {
                // Default to JSON
                var json = JsonSerializer.Serialize(response.Users, new JsonSerializerOptions { WriteIndented = true });
                await writer.WriteAsync(json);
            }

            await writer.FlushAsync();
            stream.Position = 0;

            // Log admin action
            await _adminActionLogger.LogActionAsync(
                requestedBy,
                "Export Users",
                "User",
                "Bulk",
                correlationId,
                null,
                new { Format = format, UserCount = response.Users.Count });

            return stream;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error exporting users", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get user activity timeline
    /// </summary>
    public async Task<List<UserActivityEntry>> GetUserActivityTimelineAsync(
        Guid userId,
        DateTime? fromDate,
        DateTime? toDate,
        int page = 1,
        int pageSize = 50,
        string correlationId = "")
    {
        try
        {
            var query = _context.AuditLogs.Where(a => a.UserId == userId);

            if (fromDate.HasValue)
                query = query.Where(a => a.CreatedAt >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(a => a.CreatedAt <= toDate.Value);

            var activities = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new UserActivityEntry
                {
                    Id = a.Id,
                    Action = a.Action ?? string.Empty,
                    EntityType = a.EntityType ?? string.Empty,
                    EntityId = a.EntityId ?? string.Empty,
                    CreatedAt = a.CreatedAt,
                    IpAddress = a.IpAddress,
                    UserAgent = a.UserAgent,
                    Details = a.NewValues ?? string.Empty
                })
                .ToListAsync();

            return activities;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting user activity timeline for {UserId}", correlationId, userId);
            throw;
        }
    }

    /// <summary>
    /// Get user's subscription history
    /// </summary>
    public async Task<List<UserSubscriptionHistory>> GetUserSubscriptionHistoryAsync(
        Guid userId, 
        string correlationId)
    {
        try
        {
            var subscriptions = await _context.Subscriptions
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new UserSubscriptionHistory
                {
                    Id = s.Id,
                    PlanName = s.PlanName,
                    Status = s.Status,
                    StartDate = s.StartDate ?? s.CreatedAt,
                    EndDate = s.EndDate ?? DateTime.UtcNow,
                    Amount = s.Amount,
                    BillingInterval = s.BillingInterval,
                    CancellationReason = s.CancellationReason
                })
                .ToListAsync();

            return subscriptions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting subscription history for user {UserId}", correlationId, userId);
            throw;
        }
    }

    /// <summary>
    /// Get user's payment history
    /// </summary>
    public async Task<List<UserPaymentHistory>> GetUserPaymentHistoryAsync(
        Guid userId, 
        string correlationId)
    {
        try
        {
            var payments = await _context.Payments
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new UserPaymentHistory
                {
                    Id = p.Id,
                    Amount = p.Amount,
                    Currency = p.Currency,
                    Status = p.Status,
                    PaymentMethod = p.PaymentMethod != null ? p.PaymentMethod.Type : "Unknown",
                    CreatedAt = p.CreatedAt,
                    ProcessedAt = p.ProcessedAt,
                    FailureReason = p.FailureReason
                })
                .ToListAsync();

            return payments;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting payment history for user {UserId}", correlationId, userId);
            throw;
        }
    }

    /// <summary>
    /// Get user's support ticket history
    /// </summary>
    public async Task<List<UserSupportHistory>> GetUserSupportHistoryAsync(
        Guid userId, 
        string correlationId)
    {
        try
        {
            var supportTickets = await _context.SupportTickets
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new UserSupportHistory
                {
                    Id = t.Id,
                    ActionType = t.ActionType.ToString(),
                    Title = t.Title,
                    Status = t.Status.ToString(),
                    Priority = t.Priority.ToString(),
                    CreatedAt = t.CreatedAt,
                    CompletedAt = t.CompletedAt,
                    AssignedAgent = t.AssignedTo != null ? t.AssignedTo.ToString() : "Unassigned"
                })
                .ToListAsync();

            return supportTickets;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting support history for user {UserId}", correlationId, userId);
            throw;
        }
    }

    /// <summary>
    /// Merge duplicate user accounts
    /// </summary>
    public async Task<bool> MergeUserAccountsAsync(
        Guid primaryUserId, 
        Guid duplicateUserId, 
        Guid performedBy,
        string reason,
        string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Merging user accounts: Primary {PrimaryUserId}, Duplicate {DuplicateUserId}", 
                correlationId, primaryUserId, duplicateUserId);

            var primaryUser = await _context.Users.FindAsync(primaryUserId);
            var duplicateUser = await _context.Users.FindAsync(duplicateUserId);

            if (primaryUser == null || duplicateUser == null)
                return false;

            // Transfer subscriptions
            var duplicateSubscriptions = await _context.Subscriptions
                .Where(s => s.UserId == duplicateUserId)
                .ToListAsync();
            
            foreach (var subscription in duplicateSubscriptions)
            {
                subscription.UserId = primaryUserId;
            }

            // Transfer payments
            var duplicatePayments = await _context.Payments
                .Where(p => p.UserId == duplicateUserId)
                .ToListAsync();
            
            foreach (var payment in duplicatePayments)
            {
                payment.UserId = primaryUserId;
            }

            // Deactivate duplicate user
            duplicateUser.IsActive = false;
            duplicateUser.Email = $"merged_{duplicateUserId}@deleted.local";

            await _context.SaveChangesAsync();

            // Log admin action
            await _adminActionLogger.LogActionAsync(
                performedBy,
                "Merge User Accounts",
                "User",
                primaryUserId.ToString(),
                correlationId,
                null,
                new { DuplicateUserId = duplicateUserId, Reason = reason });

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error merging user accounts", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get user merge candidates based on email/name similarity
    /// </summary>
    public async Task<List<UserMergeCandidate>> GetUserMergeCandidatesAsync(
        Guid userId, 
        string correlationId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return new List<UserMergeCandidate>();

            // FIXED: Week 1 Day 5 - Null reference warnings (CS8601/CS8602)
            var userEmail = user.Email ?? string.Empty;
            var atIndex = userEmail.IndexOf('@');
            if (atIndex <= 0) return new List<UserMergeCandidate>();

            var emailPrefix = userEmail.Substring(0, atIndex);

            var candidates = await _context.Users
                .Where(u => u.Id != userId &&
                           u.IsActive &&
                           ((u.Email != null && u.Email.Contains(emailPrefix)) ||
                            (user.FirstName != null && u.FirstName != null && u.FirstName == user.FirstName && u.LastName == user.LastName)))
                .Select(u => new UserMergeCandidate
                {
                    UserId = u.Id,
                    Email = u.Email ?? string.Empty,
                    Name = $"{u.FirstName} {u.LastName}".Trim(),
                    CreatedAt = u.CreatedAt,
                    SimilarityScore = 0.8, // Simplified scoring
                    MatchingFields = new List<string>(),
                    RecommendedAction = "Manual Review Required"
                })
                .Take(10)
                .ToListAsync();

            return candidates;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting merge candidates for user {UserId}", correlationId, userId);
            throw;
        }
    }

    /// <summary>
    /// Reset user password with admin override
    /// </summary>
    public async Task<bool> AdminPasswordResetAsync(
        Guid userId, 
        string newPassword, 
        bool requirePasswordChange,
        Guid performedBy,
        string correlationId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return false;

            // Hash the new password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            
            if (requirePasswordChange)
            {
                user.LastPasswordChangeDate = null; // Force password change
            }

            await _context.SaveChangesAsync();

            // Log admin action
            await _adminActionLogger.LogActionAsync(
                performedBy,
                "Admin Password Reset",
                "User",
                userId.ToString(),
                correlationId,
                null,
                new { RequirePasswordChange = requirePasswordChange });

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error resetting password for user {UserId}", correlationId, userId);
            throw;
        }
    }

    /// <summary>
    /// Force email verification for user
    /// </summary>
    public async Task<bool> ForceEmailVerificationAsync(
        Guid userId, 
        Guid performedBy,
        string correlationId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return false;

            user.EmailConfirmed = true;
            await _context.SaveChangesAsync();

            // Log admin action
            await _adminActionLogger.LogActionAsync(
                performedBy,
                "Force Email Verification",
                "User",
                userId.ToString(),
                correlationId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error forcing email verification for user {UserId}", correlationId, userId);
            throw;
        }
    }

    /// <summary>
    /// Get comprehensive user statistics
    /// </summary>
    public async Task<Dictionary<string, object>> GetUserStatisticsAsync(
        DateTime? fromDate,
        DateTime? toDate,
        string correlationId)
    {
        try
        {
            var query = _context.Users.AsQueryable();
            
            if (fromDate.HasValue)
                query = query.Where(u => u.CreatedAt >= fromDate.Value);
            
            if (toDate.HasValue)
                query = query.Where(u => u.CreatedAt <= toDate.Value);

            var stats = new Dictionary<string, object>
            {
                ["TotalUsers"] = await query.CountAsync(),
                ["ActiveUsers"] = await query.CountAsync(u => u.IsActive),
                ["VerifiedUsers"] = await query.CountAsync(u => u.EmailConfirmed),
                ["LockedUsers"] = await query.CountAsync(u => u.LockoutEnd.HasValue && u.LockoutEnd > DateTimeOffset.UtcNow),
                ["NewUsersToday"] = await query.CountAsync(u => u.CreatedAt.Date == DateTime.UtcNow.Date),
                ["NewUsersThisWeek"] = await query.CountAsync(u => u.CreatedAt >= DateTime.UtcNow.AddDays(-7)),
                ["NewUsersThisMonth"] = await query.CountAsync(u => u.CreatedAt >= DateTime.UtcNow.AddDays(-30))
            };

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting user statistics", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Archive inactive users
    /// </summary>
    public async Task<BulkActionResult> ArchiveInactiveUsersAsync(
        int inactiveDays,
        bool dryRun,
        Guid performedBy,
        string correlationId)
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-inactiveDays);
            var inactiveUsers = await _context.Users
                .Where(u => u.IsActive && 
                           (u.LastLogin == null || u.LastLogin < cutoffDate) &&
                           u.CreatedAt < cutoffDate)
                .ToListAsync();

            var result = new BulkActionResult
            {
                ActionId = Guid.NewGuid(),
                Status = dryRun ? BulkActionStatus.Completed : BulkActionStatus.Completed,
                TotalUsers = inactiveUsers.Count,
                ProcessedUsers = inactiveUsers.Count,
                SuccessfulUsers = dryRun ? 0 : inactiveUsers.Count,
                FailedUsers = 0,
                Errors = new List<BulkActionError>(),
                CompletedAt = DateTime.UtcNow
            };

            if (!dryRun)
            {
                foreach (var user in inactiveUsers)
                {
                    user.IsActive = false;
                    
                    // Log individual action
                    await _adminActionLogger.LogActionAsync(
                        performedBy,
                        "Archive Inactive User",
                        "User",
                        user.Id.ToString(),
                        correlationId,
                        null,
                        new { InactiveDays = inactiveDays });
                }

                await _context.SaveChangesAsync();
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error archiving inactive users", correlationId);
            throw;
        }
    }
}
