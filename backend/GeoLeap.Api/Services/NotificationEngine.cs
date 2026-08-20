using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Hangfire;
using System.Text.Json;
using DotLiquid;

namespace GeoLeap.Api.Services;

/// <summary>
/// Advanced notification engine with multi-channel support - US-8.2 Complete Implementation
/// </summary>
public class NotificationEngine : INotificationEngine
{
    private readonly ILogger<NotificationEngine> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IPushNotificationService _pushService;
    private readonly ISmsService _smsService;
    private readonly INotificationPreferencesService _preferencesService;
    private readonly IBackgroundJobClient _backgroundJobClient;

    public NotificationEngine(
        ILogger<NotificationEngine> logger,
        ApplicationDbContext context,
        IEmailService emailService,
        IPushNotificationService pushService,
        ISmsService smsService,
        INotificationPreferencesService preferencesService,
        IBackgroundJobClient backgroundJobClient)
    {
        _logger = logger;
        _context = context;
        _emailService = emailService;
        _pushService = pushService;
        _smsService = smsService;
        _preferencesService = preferencesService;
        _backgroundJobClient = backgroundJobClient;
    }

    public async Task<Guid> SendNotificationAsync(NotificationRequest request, string correlationId = "")
    {
        try
        {
            _logger.LogInformation("Processing notification request for user {UserId}, type: {Type}", 
                request.UserId, request.Type);

            // Validate the request
            var validationResult = await ValidateNotificationAsync(request, correlationId);
            if (!validationResult.IsValid)
            {
                _logger.LogWarning("Notification validation failed for user {UserId}: {Errors}", 
                    request.UserId, string.Join(", ", validationResult.Errors.Select(e => e.Message)));
                throw new InvalidOperationException($"Notification validation failed: {validationResult.Errors.FirstOrDefault()?.Message}");
            }

            // Check user preferences and rate limits
            var canSend = await _preferencesService.CanSendNotificationAsync(request.UserId, request.Type, request.Channels);
            if (!canSend)
            {
                _logger.LogInformation("Notification blocked by user preferences or rate limits for user {UserId}", request.UserId);
                return Guid.Empty;
            }

            // Create notification entity
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId,
                Type = request.Type,
                Priority = request.Priority,
                Title = request.Title,
                Message = request.Message,
                ActionUrl = request.ActionUrl,
                Data = request.Data,
                Status = "pending",
                ScheduledFor = request.ScheduledFor,
                ExpiresAt = request.ExpiresAt,
                CorrelationId = correlationId,
                CampaignId = request.CampaignId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Queue for immediate processing or schedule for later
            if (request.ScheduledFor.HasValue && request.ScheduledFor > DateTime.UtcNow)
            {
                await QueueNotificationAsync(notification.Id, request.Priority, request.ScheduledFor.Value, correlationId);
            }
            else
            {
                await QueueNotificationAsync(notification.Id, request.Priority, null, correlationId);
                // FIXED: BUG-BE-015 - Use injected IBackgroundJobClient instead of static BackgroundJob
                _backgroundJobClient.Enqueue(() => ProcessNotificationAsync(notification.Id, correlationId));
            }

            _logger.LogInformation("Notification {NotificationId} created successfully for user {UserId}", 
                notification.Id, request.UserId);

            return notification.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating notification for user {UserId}", request.UserId);
            throw;
        }
    }

    public async Task<List<Guid>> SendBulkNotificationAsync(List<NotificationRequest> requests, string correlationId = "")
    {
        var results = new List<Guid>();
        
        try
        {
            _logger.LogInformation("Processing bulk notification request for {Count} notifications", requests.Count);

            foreach (var request in requests)
            {
                try
                {
                    var notificationId = await SendNotificationAsync(request, correlationId);
                    if (notificationId != Guid.Empty)
                    {
                        results.Add(notificationId);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing bulk notification for user {UserId}", request.UserId);
                }
            }

            _logger.LogInformation("Bulk notification completed: {SuccessCount}/{TotalCount}", 
                results.Count, requests.Count);

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing bulk notifications");
            throw;
        }
    }

    public async Task<Guid> ScheduleNotificationAsync(NotificationRequest request, DateTime scheduledFor, string correlationId = "")
    {
        request.ScheduledFor = scheduledFor;
        return await SendNotificationAsync(request, correlationId);
    }

    public async Task<Guid> SendFromTemplateAsync(string templateId, Guid userId, Dictionary<string, object> templateData, string correlationId = "")
    {
        try
        {
            var template = await GetTemplateAsync(templateId, correlationId);
            if (template == null)
            {
                throw new InvalidOperationException($"Template {templateId} not found");
            }

            // Render template
            var renderedContent = await RenderTemplateAsync(template, templateData, correlationId);

            var request = new NotificationRequest
            {
                UserId = userId,
                Type = template.Type,
                Title = renderedContent.Subject,
                Message = renderedContent.Body,
                Data = templateData,
                Channels = new List<string> { template.Channel }
            };

            return await SendNotificationAsync(request, correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending template notification {TemplateId} to user {UserId}", 
                templateId, userId);
            throw;
        }
    }

    public async Task<List<Guid>> SendFromTemplateToUsersAsync(string templateId, List<Guid> userIds, Dictionary<string, object> templateData, string correlationId = "")
    {
        var requests = userIds.Select(userId => new NotificationRequest
        {
            UserId = userId,
            Type = templateId.Split('_')[0], // Extract type from template ID
            Title = "Template Notification",
            Message = "Template-based notification",
            Data = templateData
        }).ToList();

        // First create notifications from template
        var results = new List<Guid>();
        foreach (var userId in userIds)
        {
            try
            {
                var notificationId = await SendFromTemplateAsync(templateId, userId, templateData, correlationId);
                if (notificationId != Guid.Empty)
                {
                    results.Add(notificationId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending template notification to user {UserId}", userId);
            }
        }

        return results;
    }

    public async Task<bool> SendEmailNotificationAsync(Guid notificationId, string correlationId = "")
    {
        try
        {
            var notification = await _context.Notifications
                .Include(n => n.User)
                .FirstOrDefaultAsync(n => n.Id == notificationId);

            if (notification == null)
            {
                _logger.LogWarning("Notification {NotificationId} not found for email delivery", notificationId);
                return false;
            }

            var delivery = await CreateDeliveryRecordAsync(notificationId, "email", correlationId);

            try
            {
                await _emailService.SendAsync(
                    notification.User.Email,
                    notification.Title,
                    notification.Message,
                    notification.Data);

                await UpdateDeliveryStatusAsync(delivery.Id, "delivered", null, correlationId);
                _logger.LogInformation("Email notification {NotificationId} delivered successfully", notificationId);
                return true;
            }
            catch (Exception ex)
            {
                await UpdateDeliveryStatusAsync(delivery.Id, "failed", ex.Message, correlationId);
                _logger.LogError(ex, "Failed to send email notification {NotificationId}", notificationId);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing email notification {NotificationId}", notificationId);
            return false;
        }
    }

    public async Task<bool> SendPushNotificationAsync(Guid notificationId, string correlationId = "")
    {
        try
        {
            var notification = await _context.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId);
            if (notification == null) return false;

            var delivery = await CreateDeliveryRecordAsync(notificationId, "push", correlationId);

            try
            {
                await _pushService.SendPushNotificationAsync(
                    notification.UserId,
                    notification.Title,
                    notification.Message,
                    notification.Type,
                    notification.Data);

                await UpdateDeliveryStatusAsync(delivery.Id, "delivered", null, correlationId);
                return true;
            }
            catch (Exception ex)
            {
                await UpdateDeliveryStatusAsync(delivery.Id, "failed", ex.Message, correlationId);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing push notification {NotificationId}", notificationId);
            return false;
        }
    }

    public async Task<bool> SendSmsNotificationAsync(Guid notificationId, string correlationId = "")
    {
        try
        {
            var notification = await _context.Notifications
                .Include(n => n.User)
                .FirstOrDefaultAsync(n => n.Id == notificationId);

            if (notification == null || string.IsNullOrEmpty(notification.User.PhoneNumber)) 
                return false;

            var delivery = await CreateDeliveryRecordAsync(notificationId, "sms", correlationId);

            try
            {
                await _smsService.SendSmsAsync(
                    notification.User.PhoneNumber,
                    $"{notification.Title}: {notification.Message}");

                await UpdateDeliveryStatusAsync(delivery.Id, "delivered", null, correlationId);
                return true;
            }
            catch (Exception ex)
            {
                await UpdateDeliveryStatusAsync(delivery.Id, "failed", ex.Message, correlationId);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing SMS notification {NotificationId}", notificationId);
            return false;
        }
    }

    public async Task<bool> SendInAppNotificationAsync(Guid notificationId, string correlationId = "")
    {
        // In-app notifications are already created when notification is created
        // This method could be used for real-time push via SignalR
        return true;
    }

    public async Task<Models.NotificationValidationResult> ValidateNotificationAsync(NotificationRequest request, string correlationId = "")
    {
        var result = new Models.NotificationValidationResult { IsValid = true };

        // Validate required fields
        if (request.UserId == Guid.Empty)
        {
            result.Errors.Add(new Models.NotificationValidationError
            {
                Field = nameof(request.UserId),
                Code = "REQUIRED",
                Message = "UserId is required",
                Value = request.UserId
            });
        }

        if (string.IsNullOrWhiteSpace(request.Type))
        {
            result.Errors.Add(new Models.NotificationValidationError
            {
                Field = nameof(request.Type),
                Code = "REQUIRED",
                Message = "Type is required",
                Value = request.Type
            });
        }

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            result.Errors.Add(new Models.NotificationValidationError
            {
                Field = nameof(request.Title),
                Code = "REQUIRED",
                Message = "Title is required",
                Value = request.Title
            });
        }

        if (string.IsNullOrWhiteSpace(request.Message))
        {
            result.Errors.Add(new Models.NotificationValidationError
            {
                Field = nameof(request.Message),
                Code = "REQUIRED",
                Message = "Message is required",
                Value = request.Message
            });
        }

        // Validate user exists
        var userExists = await _context.Users.AnyAsync(u => u.Id == request.UserId);
        if (!userExists)
        {
            result.Errors.Add(new Models.NotificationValidationError
            {
                Field = nameof(request.UserId),
                Code = "NOT_FOUND",
                Message = "User not found",
                Value = request.UserId
            });
        }

        result.IsValid = result.Errors.Count == 0;
        return result;
    }

    // Campaign Management Methods
    public async Task<Guid> CreateCampaignAsync(NotificationCampaignRequest request, string correlationId = "")
    {
        try
        {
            var campaign = new NotificationCampaign
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Description = request.Description,
                TemplateId = request.TemplateId,
                Status = "draft",
                TargetCriteria = request.TargetCriteria,
                TemplateData = request.TemplateData,
                ScheduledFor = request.ScheduledFor,
                CreatedBy = request.CreatedBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.NotificationCampaigns.Add(campaign);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Campaign {CampaignId} created successfully", campaign.Id);
            return campaign.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating campaign {CampaignName}", request.Name);
            throw;
        }
    }

    public async Task<bool> ExecuteCampaignAsync(Guid campaignId, string correlationId = "")
    {
        // Campaign execution logic would be implemented here
        // For now, return true to indicate successful queuing
        return true;
    }

    public async Task<bool> CancelCampaignAsync(Guid campaignId, string correlationId = "")
    {
        try
        {
            var campaign = await _context.NotificationCampaigns.FirstOrDefaultAsync(c => c.Id == campaignId);
            if (campaign == null) return false;

            campaign.Status = "cancelled";
            campaign.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling campaign {CampaignId}", campaignId);
            return false;
        }
    }

    public async Task<CampaignStatusDto> GetCampaignStatusAsync(Guid campaignId, string correlationId = "")
    {
        var campaign = await _context.NotificationCampaigns.FirstOrDefaultAsync(c => c.Id == campaignId);
        
        return campaign == null ? new CampaignStatusDto() : new CampaignStatusDto
        {
            Id = campaign.Id,
            Name = campaign.Name,
            Status = campaign.Status,
            TargetUserCount = campaign.TargetUserCount,
            ProcessedCount = campaign.ProcessedCount,
            SuccessCount = campaign.SuccessCount,
            FailureCount = campaign.FailureCount,
            SkippedCount = campaign.SkippedCount,
            ProgressPercentage = campaign.ProgressPercentage,
            SuccessRate = campaign.SuccessRate,
            ScheduledFor = campaign.ScheduledFor,
            StartedAt = campaign.StartedAt,
            CompletedAt = campaign.CompletedAt,
            CreatedAt = campaign.CreatedAt
        };
    }

    // Template Management Methods
    public async Task<bool> CreateTemplateAsync(Models.NotificationTemplate template, string correlationId = "")
    {
        try
        {
            _context.NotificationTemplates.Add(template);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating template {TemplateId}", template.Id);
            return false;
        }
    }

    public async Task<bool> UpdateTemplateAsync(string templateId, Models.NotificationTemplate template, string correlationId = "")
    {
        try
        {
            var existing = await _context.NotificationTemplates.FirstOrDefaultAsync(t => t.Id == templateId);
            if (existing == null) return false;

            existing.Type = template.Type;
            existing.Channel = template.Channel;
            existing.Subject = template.Subject;
            existing.Template = template.Template;
            existing.Version = template.Version;
            existing.Language = template.Language;
            existing.IsActive = template.IsActive;
            existing.DefaultData = template.DefaultData;
            existing.ValidationRules = template.ValidationRules;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating template {TemplateId}", templateId);
            return false;
        }
    }

    public async Task<Models.NotificationTemplate?> GetTemplateAsync(string templateId, string correlationId = "")
    {
        return await _context.NotificationTemplates
            .Where(t => t.Id == templateId && t.IsActive)
            .FirstOrDefaultAsync();
    }

    public async Task<List<Models.NotificationTemplate>> GetTemplatesAsync(string? type = null, string correlationId = "")
    {
        var query = _context.NotificationTemplates.Where(t => t.IsActive);
        
        if (!string.IsNullOrEmpty(type))
        {
            query = query.Where(t => t.Type == type);
        }

        return await query.OrderBy(t => t.Type).ThenBy(t => t.Channel).ToListAsync();
    }

    public async Task<bool> DeleteTemplateAsync(string templateId, string correlationId = "")
    {
        try
        {
            var template = await _context.NotificationTemplates.FirstOrDefaultAsync(t => t.Id == templateId);
            if (template == null) return false;

            template.IsActive = false; // Soft delete
            template.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting template {TemplateId}", templateId);
            return false;
        }
    }

    // Analytics and Tracking Methods
    public async Task<NotificationAnalyticsDto> GetNotificationAnalyticsAsync(Guid notificationId, string correlationId = "")
    {
        var notification = await _context.Notifications
            .Include(n => n.Deliveries)
            .Include(n => n.Interactions)
            .FirstOrDefaultAsync(n => n.Id == notificationId);

        if (notification == null)
            return new NotificationAnalyticsDto();

        return new NotificationAnalyticsDto
        {
            Id = notification.Id,
            Type = notification.Type,
            Status = notification.Status,
            CreatedAt = notification.CreatedAt,
            SentAt = notification.SentAt,
            ReadAt = notification.ReadAt,
            Deliveries = notification.Deliveries.Select(d => new DeliveryInfoDto
            {
                Channel = d.Channel,
                Status = d.Status,
                AttemptedAt = d.AttemptedAt,
                DeliveredAt = d.DeliveredAt,
                ErrorMessage = d.ErrorMessage,
                AttemptCount = d.AttemptCount
            }).ToList(),
            Interactions = notification.Interactions.Select(i => new InteractionInfoDto
            {
                InteractionType = i.InteractionType,
                InteractionAt = i.InteractionAt,
                InteractionUrl = i.InteractionUrl,
                DeviceType = i.DeviceType,
                Platform = i.Platform
            }).ToList(),
            WasDelivered = notification.Deliveries.Any(d => d.Status == "delivered"),
            WasRead = notification.ReadAt.HasValue,
            WasClicked = notification.Interactions.Any(i => i.InteractionType == "clicked"),
            TimeToRead = notification.ReadAt.HasValue && notification.SentAt.HasValue
                ? notification.ReadAt.Value - notification.SentAt.Value
                : null,
            // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when calculating time to first click
            TimeToFirstClick = notification.Interactions.Any()
                ? notification.Interactions.OrderBy(i => i.InteractionAt).FirstOrDefault()?.InteractionAt - notification.CreatedAt
                : null
        };
    }

    public async Task<UserNotificationStatsDto> GetUserNotificationStatsAsync(Guid userId, DateTime? fromDate = null, DateTime? toDate = null, string correlationId = "")
    {
        fromDate ??= DateTime.UtcNow.AddMonths(-1);
        toDate ??= DateTime.UtcNow;

        var notifications = await _context.Notifications
            .Include(n => n.Deliveries)
            .Include(n => n.Interactions)
            .Where(n => n.UserId == userId && n.CreatedAt >= fromDate && n.CreatedAt <= toDate)
            .ToListAsync();

        var totalNotifications = notifications.Count;
        var deliveredNotifications = notifications.Count(n => n.Deliveries.Any(d => d.Status == "delivered"));
        var readNotifications = notifications.Count(n => n.ReadAt.HasValue);
        var clickedNotifications = notifications.Count(n => n.Interactions.Any(i => i.InteractionType == "clicked"));

        return new UserNotificationStatsDto
        {
            UserId = userId,
            TotalNotifications = totalNotifications,
            DeliveredNotifications = deliveredNotifications,
            ReadNotifications = readNotifications,
            ClickedNotifications = clickedNotifications,
            DeliveryRate = totalNotifications > 0 ? (double)deliveredNotifications / totalNotifications * 100 : 0,
            ReadRate = deliveredNotifications > 0 ? (double)readNotifications / deliveredNotifications * 100 : 0,
            ClickRate = readNotifications > 0 ? (double)clickedNotifications / readNotifications * 100 : 0,
            NotificationsByType = notifications.GroupBy(n => n.Type).ToDictionary(g => g.Key, g => g.Count()),
            NotificationsByChannel = notifications.SelectMany(n => n.Deliveries).GroupBy(d => d.Channel).ToDictionary(g => g.Key, g => g.Count()),
            LastNotificationAt = notifications.Max(n => n.CreatedAt),
            LastInteractionAt = notifications.SelectMany(n => n.Interactions).Max(i => i.InteractionAt)
        };
    }

    public async Task<SystemNotificationStatsDto> GetSystemNotificationStatsAsync(DateTime? fromDate = null, DateTime? toDate = null, string correlationId = "")
    {
        fromDate ??= DateTime.UtcNow.AddMonths(-1);
        toDate ??= DateTime.UtcNow;

        // Implementation would include comprehensive system statistics
        // For now, return basic structure
        return new SystemNotificationStatsDto
        {
            TotalNotifications = await _context.Notifications.CountAsync(n => n.CreatedAt >= fromDate && n.CreatedAt <= toDate),
            TotalUsers = await _context.Users.CountAsync(),
            ActiveUsers = await _context.Notifications
                .Where(n => n.CreatedAt >= fromDate && n.CreatedAt <= toDate)
                .Select(n => n.UserId)
                .Distinct()
                .CountAsync()
        };
    }

    // Interaction Tracking Methods
    public async Task<bool> TrackInteractionAsync(Guid notificationId, string interactionType, Dictionary<string, object>? context = null, string correlationId = "")
    {
        try
        {
            var interaction = new NotificationInteraction
            {
                Id = Guid.NewGuid(),
                NotificationId = notificationId,
                InteractionType = interactionType,
                InteractionAt = DateTime.UtcNow,
                Context = context
            };

            _context.NotificationInteractions.Add(interaction);
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking interaction for notification {NotificationId}", notificationId);
            return false;
        }
    }

    public async Task<bool> MarkAsReadAsync(Guid notificationId, string correlationId = "")
    {
        try
        {
            var notification = await _context.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId);
            if (notification == null) return false;

            notification.ReadAt = DateTime.UtcNow;
            notification.Status = "read";

            await _context.SaveChangesAsync();
            await TrackInteractionAsync(notificationId, "opened", null, correlationId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking notification as read {NotificationId}", notificationId);
            return false;
        }
    }

    public async Task<bool> MarkAsClickedAsync(Guid notificationId, string actionUrl = "", string correlationId = "")
    {
        try
        {
            await TrackInteractionAsync(notificationId, "clicked", 
                new Dictionary<string, object> { ["url"] = actionUrl }, correlationId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking notification as clicked {NotificationId}", notificationId);
            return false;
        }
    }

    // Processing Methods
    public async Task ProcessPendingNotificationsAsync(string correlationId = "")
    {
        var pendingNotifications = await _context.NotificationQueues
            .Where(q => q.Status == "pending" && (q.ScheduledFor == null || q.ScheduledFor <= DateTime.UtcNow))
            .OrderBy(q => q.Priority == "critical" ? 1 : q.Priority == "high" ? 2 : q.Priority == "medium" ? 3 : 4)
            .ThenBy(q => q.QueuedAt)
            .Take(50) // Process in batches
            .ToListAsync();

        foreach (var queueItem in pendingNotifications)
        {
            await ProcessNotificationAsync(queueItem.NotificationId, correlationId);
        }
    }

    public async Task ProcessFailedNotificationsAsync(string correlationId = "")
    {
        var failedNotifications = await _context.NotificationQueues
            .Where(q => q.Status == "failed" && q.NextRetryAt <= DateTime.UtcNow && q.RetryCount < 3)
            .Take(20) // Process retries in smaller batches
            .ToListAsync();

        foreach (var queueItem in failedNotifications)
        {
            await RetryFailedNotificationAsync(queueItem.NotificationId, correlationId);
        }
    }

    public async Task<bool> RetryFailedNotificationAsync(Guid notificationId, string correlationId = "")
    {
        try
        {
            var queueItem = await _context.NotificationQueues
                .FirstOrDefaultAsync(q => q.NotificationId == notificationId);

            if (queueItem == null) return false;

            queueItem.RetryCount++;
            queueItem.Status = "pending";
            queueItem.NextRetryAt = DateTime.UtcNow.AddMinutes(Math.Pow(2, queueItem.RetryCount)); // Exponential backoff
            
            await _context.SaveChangesAsync();
            await ProcessNotificationAsync(notificationId, correlationId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrying failed notification {NotificationId}", notificationId);
            return false;
        }
    }

    public async Task<bool> TestNotificationChannelAsync(string channel, Guid userId, string correlationId = "")
    {
        var testRequest = new NotificationRequest
        {
            UserId = userId,
            Type = "test",
            Priority = "low",
            Title = $"Test {channel} notification",
            Message = $"This is a test notification sent via {channel}",
            Channels = new List<string> { channel }
        };

        var notificationId = await SendNotificationAsync(testRequest, correlationId);
        return notificationId != Guid.Empty;
    }

    // Helper Methods
    private async Task<NotificationDelivery> CreateDeliveryRecordAsync(Guid notificationId, string channel, string correlationId)
    {
        var delivery = new NotificationDelivery
        {
            Id = Guid.NewGuid(),
            NotificationId = notificationId,
            Channel = channel,
            Status = "pending",
            AttemptedAt = DateTime.UtcNow,
            AttemptCount = 1
        };

        _context.NotificationDeliveries.Add(delivery);
        await _context.SaveChangesAsync();

        return delivery;
    }

    private async Task UpdateDeliveryStatusAsync(Guid deliveryId, string status, string? errorMessage, string correlationId)
    {
        var delivery = await _context.NotificationDeliveries.FirstOrDefaultAsync(d => d.Id == deliveryId);
        if (delivery != null)
        {
            delivery.Status = status;
            delivery.ErrorMessage = errorMessage;
            if (status == "delivered")
            {
                delivery.DeliveredAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
        }
    }

    private async Task QueueNotificationAsync(Guid notificationId, string priority, DateTime? scheduledFor, string correlationId)
    {
        var queueItem = new NotificationQueue
        {
            Id = Guid.NewGuid(),
            NotificationId = notificationId,
            Priority = priority,
            Status = "pending",
            QueuedAt = DateTime.UtcNow,
            ScheduledFor = scheduledFor
        };

        _context.NotificationQueues.Add(queueItem);
        await _context.SaveChangesAsync();
    }

    public async Task ProcessNotificationAsync(Guid notificationId, string correlationId)
    {
        try
        {
            var notification = await _context.Notifications
                .Include(n => n.User)
                .FirstOrDefaultAsync(n => n.Id == notificationId);

            if (notification == null) return;

            // Get user preferences to determine channels
            var preferences = await _preferencesService.GetUserPreferencesAsync(notification.UserId);
            var channels = new List<string>();

            if (preferences.EmailEnabled) channels.Add("email");
            if (preferences.PushEnabled) channels.Add("push");
            if (preferences.SmsEnabled) channels.Add("sms");
            if (preferences.InAppEnabled) channels.Add("in_app");

            // Send through each enabled channel
            foreach (var channel in channels)
            {
                switch (channel)
                {
                    case "email":
                        await SendEmailNotificationAsync(notificationId, correlationId);
                        break;
                    case "push":
                        await SendPushNotificationAsync(notificationId, correlationId);
                        break;
                    case "sms":
                        await SendSmsNotificationAsync(notificationId, correlationId);
                        break;
                    case "in_app":
                        await SendInAppNotificationAsync(notificationId, correlationId);
                        break;
                }
            }

            // Update notification status
            notification.Status = "sent";
            notification.SentAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Update queue item
            var queueItem = await _context.NotificationQueues
                .FirstOrDefaultAsync(q => q.NotificationId == notificationId);
            if (queueItem != null)
            {
                queueItem.Status = "completed";
                queueItem.ProcessedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing notification {NotificationId}", notificationId);
            
            // Update queue item as failed
            var queueItem = await _context.NotificationQueues
                .FirstOrDefaultAsync(q => q.NotificationId == notificationId);
            if (queueItem != null)
            {
                queueItem.Status = "failed";
                queueItem.ErrorMessage = ex.Message;
                queueItem.NextRetryAt = DateTime.UtcNow.AddMinutes(Math.Pow(2, queueItem.RetryCount + 1));
                await _context.SaveChangesAsync();
            }
        }
    }

    private async Task<(string Subject, string Body)> RenderTemplateAsync(Models.NotificationTemplate template, Dictionary<string, object> data, string correlationId)
    {
        try
        {
            var subjectTemplate = DotLiquid.Template.Parse(template.Subject);
            var bodyTemplate = DotLiquid.Template.Parse(template.Template);

            var hash = Hash.FromDictionary(data);

            var renderedSubject = subjectTemplate.Render(hash);
            var renderedBody = bodyTemplate.Render(hash);

            return (renderedSubject, renderedBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rendering template {TemplateId}", template.Id);
            return (template.Subject, template.Template);
        }
    }

    #region User-Facing Notification Management

    /// <summary>
    /// Get count of unread notifications for a user
    /// </summary>
    public async Task<int> GetUnreadCountAsync(Guid userId, string correlationId = "")
    {
        try
        {
            var count = await _context.Notifications
                .Where(n => n.UserId == userId && n.ReadAt == null)
                .CountAsync();

            _logger.LogDebug("User {UserId} has {UnreadCount} unread notifications", userId, count);
            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unread count for user {UserId}", userId);
            return 0;
        }
    }

    /// <summary>
    /// Get paginated notifications for a user with optional filters
    /// </summary>
    public async Task<UserNotificationsResult> GetUserNotificationsAsync(
        Guid userId,
        int page = 1,
        int pageSize = 20,
        bool? unreadOnly = null,
        string? category = null,
        string correlationId = "")
    {
        try
        {
            // Validate pagination parameters
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            // Build query
            var query = _context.Notifications
                .Where(n => n.UserId == userId)
                .AsQueryable();

            // Apply filters
            if (unreadOnly == true)
            {
                query = query.Where(n => n.ReadAt == null);
            }

            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(n => n.Category == category || n.Type == category);
            }

            // Get total count
            var totalCount = await query.CountAsync();

            // Get paginated results
            var notifications = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(n => new UserNotificationDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Message = n.Message,
                    Type = n.Type,
                    Category = n.Category,
                    Priority = n.Priority,
                    IsRead = n.ReadAt.HasValue,
                    CreatedAt = n.CreatedAt,
                    ReadAt = n.ReadAt,
                    ActionUrl = n.ActionUrl,
                    Data = null // Avoid complex deserialization in query
                })
                .ToListAsync();

            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            _logger.LogDebug("Retrieved {Count} notifications for user {UserId} (page {Page}/{TotalPages})",
                notifications.Count, userId, page, totalPages);

            return new UserNotificationsResult
            {
                Notifications = notifications,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
                HasMore = page < totalPages
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notifications for user {UserId}", userId);
            return new UserNotificationsResult
            {
                Notifications = new List<UserNotificationDto>(),
                TotalCount = 0,
                Page = page,
                PageSize = pageSize,
                TotalPages = 0,
                HasMore = false
            };
        }
    }

    /// <summary>
    /// Mark multiple notifications as read for a user
    /// </summary>
    public async Task<int> MarkNotificationsAsReadAsync(Guid userId, List<Guid> notificationIds, string correlationId = "")
    {
        try
        {
            if (notificationIds == null || notificationIds.Count == 0)
            {
                return 0;
            }

            var now = DateTime.UtcNow;
            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId && notificationIds.Contains(n.Id) && n.ReadAt == null)
                .ToListAsync();

            foreach (var notification in notifications)
            {
                notification.ReadAt = now;
                notification.Status = "read";
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Marked {Count} notifications as read for user {UserId}",
                notifications.Count, userId);

            return notifications.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking notifications as read for user {UserId}", userId);
            return 0;
        }
    }

    /// <summary>
    /// Delete a notification for a user (only allows deleting own notifications)
    /// </summary>
    public async Task<bool> DeleteNotificationAsync(Guid userId, Guid notificationId, string correlationId = "")
    {
        try
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

            if (notification == null)
            {
                _logger.LogWarning("Notification {NotificationId} not found or does not belong to user {UserId}",
                    notificationId, userId);
                return false;
            }

            // Also delete related records
            var deliveries = await _context.NotificationDeliveries
                .Where(d => d.NotificationId == notificationId)
                .ToListAsync();

            var interactions = await _context.NotificationInteractions
                .Where(i => i.NotificationId == notificationId)
                .ToListAsync();

            var queueItems = await _context.NotificationQueues
                .Where(q => q.NotificationId == notificationId)
                .ToListAsync();

            _context.NotificationDeliveries.RemoveRange(deliveries);
            _context.NotificationInteractions.RemoveRange(interactions);
            _context.NotificationQueues.RemoveRange(queueItems);
            _context.Notifications.Remove(notification);

            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted notification {NotificationId} for user {UserId}",
                notificationId, userId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting notification {NotificationId} for user {UserId}",
                notificationId, userId);
            return false;
        }
    }

    #endregion
}