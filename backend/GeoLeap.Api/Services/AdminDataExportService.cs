using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text;
using System.Globalization;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for data export functionality
/// </summary>
public class AdminDataExportService : IAdminDataExportService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdminDataExportService> _logger;
    private readonly IAdminActionLogger _adminActionLogger;

    public AdminDataExportService(
        ApplicationDbContext context,
        ILogger<AdminDataExportService> logger,
        IAdminActionLogger adminActionLogger)
    {
        _context = context;
        _logger = logger;
        _adminActionLogger = adminActionLogger;
    }

    /// <summary>
    /// Export data based on request parameters
    /// </summary>
    public async Task<Stream> ExportDataAsync(DataExportRequest request, Guid requestedBy, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Exporting data: {EntityType} in {Format} format", 
                correlationId, request.EntityType, request.Format);

            var stream = new MemoryStream();

            switch (request.EntityType.ToLower())
            {
                case "users":
                    await ExportUsersAsync(stream, request, correlationId);
                    break;
                case "subscriptions":
                    await ExportSubscriptionsAsync(stream, request, correlationId);
                    break;
                case "payments":
                    await ExportPaymentsAsync(stream, request, correlationId);
                    break;
                case "auditlogs":
                    await ExportAuditLogsAsync(stream, request, correlationId);
                    break;
                case "content":
                    await ExportContentAsync(stream, request, correlationId);
                    break;
                default:
                    throw new ArgumentException($"Unsupported entity type: {request.EntityType}");
            }

            // Log admin action
            await _adminActionLogger.LogActionAsync(
                requestedBy,
                "Data Export",
                request.EntityType,
                "Bulk",
                correlationId,
                null,
                new { Format = request.Format, EntityType = request.EntityType });

            stream.Position = 0;
            return stream;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error exporting data for {EntityType}", correlationId, request.EntityType);
            throw;
        }
    }

    /// <summary>
    /// Get available export formats for entity type
    /// </summary>
    public async Task<List<ExportFormat>> GetAvailableFormatsAsync(string entityType, string correlationId)
    {
        await Task.CompletedTask; // Placeholder for async signature

        var formats = new List<ExportFormat>
        {
            new ExportFormat { Id = "csv", Name = "CSV", Description = "Comma-separated values", MimeType = "text/csv" },
            new ExportFormat { Id = "json", Name = "JSON", Description = "JavaScript Object Notation", MimeType = "application/json" },
            new ExportFormat { Id = "xlsx", Name = "Excel", Description = "Microsoft Excel format", MimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
        };

        return formats;
    }

    /// <summary>
    /// Request a new data export
    /// </summary>
    public async Task<AdminDataExport> RequestDataExportAsync(
        AdminDataExportRequest request,
        Guid requestedBy,
        string correlationId)
    {
        try
        {
            var export = new AdminDataExport
            {
                Id = Guid.NewGuid(),
                ExportType = request.ExportType,
                Format = request.Format,
                Status = ExportStatus.Pending,
                RequestedBy = requestedBy,
                CreatedAt = DateTime.UtcNow,
                Parameters = JsonSerializer.Serialize(request)
            };

            _context.AdminDataExports.Add(export);
            await _context.SaveChangesAsync();

            return export;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error requesting data export", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get status of an export request
    /// </summary>
    public async Task<AdminDataExport?> GetExportStatusAsync(Guid exportId, string correlationId)
    {
        try
        {
            return await _context.AdminDataExports
                .FirstOrDefaultAsync(e => e.Id == exportId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting export status for {ExportId}", correlationId, exportId);
            throw;
        }
    }

    /// <summary>
    /// Download completed export file
    /// </summary>
    public async Task<ExportDownloadResult?> DownloadExportAsync(
        Guid exportId,
        Guid userId,
        string correlationId)
    {
        try
        {
            var export = await _context.AdminDataExports
                .FirstOrDefaultAsync(e => e.Id == exportId && e.RequestedBy == userId);

            if (export == null || export.Status != ExportStatus.Completed || string.IsNullOrEmpty(export.FilePath))
                return null;

            var fileStream = new MemoryStream(Encoding.UTF8.GetBytes("Mock export data"));
            return new ExportDownloadResult
            {
                FileStream = fileStream,
                FileName = $"export_{exportId}.{export.Format}",
                ContentType = GetContentType(export.Format),
                FileSizeBytes = fileStream.Length
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error downloading export {ExportId}", correlationId, exportId);
            throw;
        }
    }

    /// <summary>
    /// Get export requests for a specific user
    /// </summary>
    public async Task<List<AdminDataExport>> GetUserExportsAsync(
        Guid userId,
        ExportStatus? status,
        int page,
        int pageSize,
        string correlationId)
    {
        try
        {
            var query = _context.AdminDataExports.Where(e => e.RequestedBy == userId);

            if (status.HasValue)
                query = query.Where(e => e.Status == status.Value);

            return await query
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting user exports for {UserId}", correlationId, userId);
            throw;
        }
    }

    /// <summary>
    /// Get all export requests (admin only)
    /// </summary>
    public async Task<List<AdminDataExport>> GetAllExportsAsync(
        ExportStatus? status,
        Guid? userId,
        int page,
        int pageSize,
        string correlationId)
    {
        try
        {
            var query = _context.AdminDataExports.AsQueryable();

            if (status.HasValue)
                query = query.Where(e => e.Status == status.Value);

            if (userId.HasValue)
                query = query.Where(e => e.RequestedBy == userId.Value);

            return await query
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting all exports", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Cancel a pending export request
    /// </summary>
    public async Task<bool> CancelExportAsync(Guid exportId, Guid userId, string correlationId)
    {
        try
        {
            var export = await _context.AdminDataExports
                .FirstOrDefaultAsync(e => e.Id == exportId && e.RequestedBy == userId);

            if (export == null || export.Status != ExportStatus.Pending)
                return false;

            export.Status = ExportStatus.Cancelled;
            export.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error cancelling export {ExportId}", correlationId, exportId);
            throw;
        }
    }

    /// <summary>
    /// Delete an export and its associated file
    /// </summary>
    public async Task<bool> DeleteExportAsync(Guid exportId, Guid userId, string correlationId)
    {
        try
        {
            var export = await _context.AdminDataExports
                .FirstOrDefaultAsync(e => e.Id == exportId && e.RequestedBy == userId);

            if (export == null)
                return false;

            _context.AdminDataExports.Remove(export);
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error deleting export {ExportId}", correlationId, exportId);
            throw;
        }
    }

    /// <summary>
    /// Get available export types and configurations
    /// </summary>
    public async Task<List<ExportTypeInfo>> GetAvailableExportTypesAsync(string correlationId)
    {
        await Task.CompletedTask;
        
        return new List<ExportTypeInfo>
        {
            new() { Id = "users", Name = "Users", Description = "Export user data", SupportedFormats = new() { "csv", "json", "xlsx" } },
            new() { Id = "subscriptions", Name = "Subscriptions", Description = "Export subscription data", SupportedFormats = new() { "csv", "json", "xlsx" } },
            new() { Id = "payments", Name = "Payments", Description = "Export payment data", SupportedFormats = new() { "csv", "json", "xlsx" } },
            new() { Id = "auditlogs", Name = "Audit Logs", Description = "Export audit log data", SupportedFormats = new() { "csv", "json" } },
            new() { Id = "content", Name = "Content", Description = "Export content data", SupportedFormats = new() { "csv", "json", "xlsx" } }
        };
    }

    /// <summary>
    /// Get export statistics and usage analytics
    /// </summary>
    public async Task<Dictionary<string, object>> GetExportStatisticsAsync(
        DateTime startDate,
        DateTime endDate,
        string correlationId)
    {
        try
        {
            var exports = await _context.AdminDataExports
                .Where(e => e.CreatedAt >= startDate && e.CreatedAt <= endDate)
                .ToListAsync();

            return new Dictionary<string, object>
            {
                { "totalExports", exports.Count },
                { "completedExports", exports.Count(e => e.Status == ExportStatus.Completed) },
                { "failedExports", exports.Count(e => e.Status == ExportStatus.Failed) },
                { "byType", exports.GroupBy(e => e.ExportType).ToDictionary(g => g.Key, g => g.Count()) },
                { "byFormat", exports.GroupBy(e => e.Format).ToDictionary(g => g.Key, g => g.Count()) }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting export statistics", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Cleanup expired export files
    /// </summary>
    public async Task<CleanupResult> CleanupExpiredExportsAsync(
        int olderThanDays,
        bool dryRun,
        Guid performedBy,
        string correlationId)
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-olderThanDays);
            var expiredExports = await _context.AdminDataExports
                .Where(e => e.CreatedAt < cutoffDate && e.Status == ExportStatus.Completed)
                .ToListAsync();

            if (dryRun)
            {
                return new CleanupResult
                {
                    Success = true,
                    FilesDeleted = expiredExports.Count,
                    Message = $"Would delete {expiredExports.Count} expired exports"
                };
            }

            _context.AdminDataExports.RemoveRange(expiredExports);
            await _context.SaveChangesAsync();

            return new CleanupResult
            {
                Success = true,
                FilesDeleted = expiredExports.Count,
                Message = $"Deleted {expiredExports.Count} expired exports"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error cleaning up expired exports", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Preview export data (first 100 rows)
    /// </summary>
    public async Task<object> PreviewExportDataAsync(
        AdminDataExportRequest request,
        Guid userId,
        string correlationId)
    {
        try
        {
            switch (request.ExportType.ToLower())
            {
                case "users":
                    return await _context.Users
                        .Take(100)
                        .Select(u => new { u.Id, u.Email, u.FirstName, u.LastName, u.CreatedAt })
                        .ToListAsync();
                        
                case "subscriptions":
                    return await _context.Subscriptions
                        .Take(100)
                        .Select(s => new { s.Id, s.UserId, s.PlanType, s.Status, s.CreatedAt })
                        .ToListAsync();
                        
                default:
                    return new { message = "Preview not available for this export type" };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error previewing export data", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Schedule a recurring export
    /// </summary>
    public async Task<ScheduledExport> ScheduleRecurringExportAsync(
        ScheduleExportRequest request,
        Guid createdBy,
        string correlationId)
    {
        try
        {
            await Task.CompletedTask;
            var scheduledExport = new ScheduledExport
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                ExportRequest = request.ExportRequest,
                CronExpression = request.CronExpression,
                IsEnabled = request.IsEnabled,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow,
                Recipients = request.Recipients
            };

            // In a real implementation, this would be stored in the database
            return scheduledExport;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error scheduling recurring export", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get scheduled export details
    /// </summary>
    public async Task<ScheduledExport?> GetScheduledExportAsync(Guid scheduleId, string correlationId)
    {
        await Task.CompletedTask;
        // In a real implementation, this would retrieve from database
        return null;
    }

    /// <summary>
    /// Execute scheduled exports
    /// </summary>
    public async Task ExecuteScheduledExportsAsync(string correlationId)
    {
        await Task.CompletedTask;
        // In a real implementation, this would find and execute due scheduled exports
    }

    /// <summary>
    /// Process export queue (background service)
    /// </summary>
    public async Task ProcessExportQueueAsync(string correlationId)
    {
        await Task.CompletedTask;
        // In a real implementation, this would process queued export requests
    }

    /// <summary>
    /// Generate export file in specified format
    /// </summary>
    public async Task<string> GenerateExportFileAsync(
        AdminDataExport export,
        string correlationId)
    {
        try
        {
            // Mock file generation
            var fileName = $"export_{export.Id}.{export.Format}";
            var filePath = Path.Combine(Path.GetTempPath(), fileName);
            
            await File.WriteAllTextAsync(filePath, "Mock export file content");
            
            export.FilePath = filePath;
            export.Status = ExportStatus.Completed;
            export.CompletedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            return filePath;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error generating export file for {ExportId}", correlationId, export.Id);
            throw;
        }
    }

    /// <summary>
    /// Validate export request parameters
    /// </summary>
    public async Task<ValidationResult> ValidateExportRequestAsync(
        AdminDataExportRequest request,
        string correlationId)
    {
        await Task.CompletedTask;
        
        var result = new ValidationResult { IsValid = true };
        
        if (string.IsNullOrEmpty(request.ExportType))
        {
            result.IsValid = false;
            result.Errors.Add("Export type is required");
        }
        
        if (string.IsNullOrEmpty(request.Format))
        {
            result.IsValid = false;
            result.Errors.Add("Format is required");
        }
        
        return result;
    }

    /// <summary>
    /// Get export size estimate
    /// </summary>
    public async Task<ExportSizeEstimate> EstimateExportSizeAsync(
        AdminDataExportRequest request,
        string correlationId)
    {
        try
        {
            long estimatedRecords = request.ExportType.ToLower() switch
            {
                "users" => await _context.Users.CountAsync(),
                "subscriptions" => await _context.Subscriptions.CountAsync(),
                "payments" => await _context.Payments.CountAsync(),
                "auditlogs" => await _context.AuditLogs.CountAsync(),
                "content" => await _context.StreamingContents.CountAsync(),
                _ => 1000
            };
            
            return new ExportSizeEstimate
            {
                EstimatedRecords = estimatedRecords,
                EstimatedSizeBytes = estimatedRecords * 1024, // Rough estimate
                EstimatedDuration = TimeSpan.FromMinutes(estimatedRecords / 1000),
                RequiresStreaming = estimatedRecords > 100000,
                RecommendedFormat = estimatedRecords > 50000 ? "csv" : "json"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error estimating export size", correlationId);
            throw;
        }
    }

    private async Task ExportUsersAsync(Stream stream, DataExportRequest request, string correlationId)
    {
        var query = _context.Users.AsQueryable();

        // Apply date filters
        if (request.StartDate.HasValue)
            query = query.Where(u => u.CreatedAt >= request.StartDate.Value);

        if (request.EndDate.HasValue)
            query = query.Where(u => u.CreatedAt <= request.EndDate.Value);

        var users = await query
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.UserName,
                u.FirstName,
                u.LastName,
                u.IsActive,
                u.EmailConfirmed,
                u.CreatedAt,
                u.LastLogin
            })
            .ToListAsync();

        await WriteDataToStreamAsync(stream, users, request.Format);
    }

    private async Task ExportSubscriptionsAsync(Stream stream, DataExportRequest request, string correlationId)
    {
        var query = _context.Subscriptions.AsQueryable();

        // Apply date filters
        if (request.StartDate.HasValue)
            query = query.Where(s => s.CreatedAt >= request.StartDate.Value);

        if (request.EndDate.HasValue)
            query = query.Where(s => s.CreatedAt <= request.EndDate.Value);

        var subscriptions = await query
            .Select(s => new
            {
                s.Id,
                s.UserId,
                s.PlanType,
                s.Status,
                s.StartDate,
                s.EndDate,
                s.Price,
                s.CreatedAt
            })
            .ToListAsync();

        await WriteDataToStreamAsync(stream, subscriptions, request.Format);
    }

    private async Task ExportPaymentsAsync(Stream stream, DataExportRequest request, string correlationId)
    {
        var query = _context.Payments.AsQueryable();

        // Apply date filters
        if (request.StartDate.HasValue)
            query = query.Where(p => p.CreatedAt >= request.StartDate.Value);

        if (request.EndDate.HasValue)
            query = query.Where(p => p.CreatedAt <= request.EndDate.Value);

        var payments = await query
            .Select(p => new
            {
                p.Id,
                p.UserId,
                p.Amount,
                p.Currency,
                p.Status,
                p.PaymentMethod,
                p.TransactionId,
                p.CreatedAt
            })
            .ToListAsync();

        await WriteDataToStreamAsync(stream, payments, request.Format);
    }

    private async Task ExportAuditLogsAsync(Stream stream, DataExportRequest request, string correlationId)
    {
        var query = _context.AuditLogs.AsQueryable();

        // Apply date filters
        if (request.StartDate.HasValue)
            query = query.Where(a => a.CreatedAt >= request.StartDate.Value);

        if (request.EndDate.HasValue)
            query = query.Where(a => a.CreatedAt <= request.EndDate.Value);

        var auditLogs = await query
            .Select(a => new
            {
                a.Id,
                a.UserId,
                a.Action,
                a.EntityType,
                a.EntityId,
                a.CreatedAt,
                a.IpAddress,
                a.UserAgent
            })
            .ToListAsync();

        await WriteDataToStreamAsync(stream, auditLogs, request.Format);
    }

    private async Task ExportContentAsync(Stream stream, DataExportRequest request, string correlationId)
    {
        var query = _context.StreamingContents.AsQueryable();

        // Apply date filters
        if (request.StartDate.HasValue)
            query = query.Where(c => c.CreatedAt >= request.StartDate.Value);

        if (request.EndDate.HasValue)
            query = query.Where(c => c.CreatedAt <= request.EndDate.Value);

        var content = await query
            .Select(c => new
            {
                c.Id,
                c.Title,
                c.Type,
                c.Genre,
                c.ReleaseYear,
                c.Rating,
                c.CreatedAt,
                c.UpdatedAt
            })
            .ToListAsync();

        await WriteDataToStreamAsync(stream, content, request.Format);
    }

    private async Task WriteDataToStreamAsync<T>(Stream stream, IEnumerable<T> data, string format)
    {
        var writer = new StreamWriter(stream, Encoding.UTF8, leaveOpen: true);

        if (format.Equals("csv", StringComparison.OrdinalIgnoreCase))
        {
            await WriteCsvDataAsync(writer, data);
        }
        else if (format.Equals("json", StringComparison.OrdinalIgnoreCase))
        {
            var json = JsonSerializer.Serialize(data, new JsonSerializerOptions 
            { 
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            await writer.WriteAsync(json);
        }
        else
        {
            throw new ArgumentException($"Unsupported format: {format}");
        }

        await writer.FlushAsync();
    }
    
    private string GetContentType(string format)
    {
        return format.ToLower() switch
        {
            "csv" => "text/csv",
            "json" => "application/json",
            "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            _ => "application/octet-stream"
        };
    }

    private async Task WriteCsvDataAsync<T>(StreamWriter writer, IEnumerable<T> data)
    {
        var dataList = data.ToList();
        if (!dataList.Any()) return;

        var properties = typeof(T).GetProperties();
        
        // Write header
        var header = string.Join(",", properties.Select(p => p.Name));
        await writer.WriteLineAsync(header);

        // Write data rows
        foreach (var item in dataList)
        {
            var values = properties.Select(p => 
            {
                var value = p.GetValue(item);
                if (value == null) return "";
                if (value is DateTime dt) return dt.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
                return value.ToString()?.Replace(",", ";") ?? "";
            });
            
            var row = string.Join(",", values);
            await writer.WriteLineAsync(row);
        }
    }
}
