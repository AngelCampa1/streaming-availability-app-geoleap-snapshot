using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Services;

public class DunningService : IDunningService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DunningService> _logger;
    private readonly IEmailService _emailService;
    private readonly ISmsService? _smsService;
    private readonly IPushNotificationService? _pushNotificationService;

    public DunningService(
        ApplicationDbContext context,
        ILogger<DunningService> logger,
        IEmailService emailService,
        ISmsService? smsService = null,
        IPushNotificationService? pushNotificationService = null)
    {
        _context = context;
        _logger = logger;
        _emailService = emailService;
        _smsService = smsService;
        _pushNotificationService = pushNotificationService;
    }

    public async Task<DunningCampaignDto> CreateCampaignAsync(CreateDunningCampaignRequest request, string createdBy, string correlationId)
    {
        try
        {
            _logger.LogInformation("Creating dunning campaign {Name} by {CreatedBy}", request.Name, createdBy);

            var campaign = new DunningCampaign
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Description = request.Description,
                TriggerType = request.TriggerType,
                CustomerSegment = request.CustomerSegment,
                DelayAfterTrigger = request.DelayAfterTrigger,
                SequenceInterval = request.SequenceInterval,
                MaxExecutions = request.MaxExecutions,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.DunningCampaigns.Add(campaign);
            await _context.SaveChangesAsync();

            // Create dunning steps
            for (int i = 0; i < request.Steps.Count; i++)
            {
                var stepRequest = request.Steps[i];
                var step = new DunningStep
                {
                    Id = Guid.NewGuid(),
                    CampaignId = campaign.Id,
                    StepNumber = i + 1,
                    Name = stepRequest.Name,
                    NotificationType = stepRequest.NotificationType,
                    Subject = stepRequest.Subject,
                    MessageTemplate = stepRequest.MessageTemplate,
                    DelayFromPrevious = stepRequest.DelayFromPrevious,
                    UrgencyLevel = stepRequest.UrgencyLevel,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.DunningSteps.Add(step);
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Created dunning campaign {CampaignId} with {StepCount} steps",
                campaign.Id, request.Steps.Count);

            return new DunningCampaignDto
            {
                Id = campaign.Id,
                Name = campaign.Name,
                Description = campaign.Description,
                TriggerType = campaign.TriggerType,
                CustomerSegment = campaign.CustomerSegment,
                IsActive = campaign.IsActive,
                StepCount = request.Steps.Count,
                CreatedAt = campaign.CreatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating dunning campaign {Name}", request.Name);
            throw;
        }
    }

    public async Task TriggerDunningCampaignAsync(Guid failedPaymentId, string correlationId)
    {
        try
        {
            var failedPayment = await _context.FailedPayments
                .Include(fp => fp.User)
                .FirstOrDefaultAsync(fp => fp.Id == failedPaymentId);

            if (failedPayment == null)
                throw new ArgumentException("Failed payment not found");

            _logger.LogInformation("Triggering dunning campaigns for failed payment {FailedPaymentId}", failedPaymentId);

            // Determine customer segment
            var customerSegment = await DetermineCustomerSegmentAsync(failedPayment.UserId);

            // Get applicable campaigns
            var campaigns = await _context.DunningCampaigns
                .Where(dc => dc.IsActive 
                          && dc.TriggerType == "failed_payment"
                          && (dc.CustomerSegment == "all" || dc.CustomerSegment == customerSegment))
                .OrderByDescending(dc => dc.Priority)
                .ThenBy(dc => dc.CreatedAt)
                .ToListAsync();

            foreach (var campaign in campaigns)
            {
                // Check if execution already exists
                var existingExecution = await _context.DunningCampaignExecutions
                    .FirstOrDefaultAsync(dce => dce.FailedPaymentId == failedPaymentId && dce.CampaignId == campaign.Id);

                if (existingExecution != null)
                    continue;

                // Create campaign execution
                var execution = new DunningCampaignExecution
                {
                    Id = Guid.NewGuid(),
                    CampaignId = campaign.Id,
                    FailedPaymentId = failedPaymentId,
                    UserId = failedPayment.UserId,
                    Status = "active",
                    CurrentStepNumber = 0,
                    NextExecutionAt = DateTime.UtcNow.Add(campaign.DelayAfterTrigger),
                    CorrelationId = correlationId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.DunningCampaignExecutions.Add(execution);

                _logger.LogInformation("Created dunning campaign execution {ExecutionId} for campaign {CampaignId}",
                    execution.Id, campaign.Id);
            }

            await _context.SaveChangesAsync();

            await LogDunningAnalyticsAsync("campaign_triggered", null, null, failedPayment.UserId, true, correlationId, new Dictionary<string, object>
            {
                ["failed_payment_id"] = failedPaymentId,
                ["customer_segment"] = customerSegment,
                ["campaigns_triggered"] = campaigns.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error triggering dunning campaigns for failed payment {FailedPaymentId}", failedPaymentId);
            throw;
        }
    }

    public async Task ProcessDunningCampaignExecutionsAsync()
    {
        try
        {
            _logger.LogInformation("Processing dunning campaign executions");

            var dueExecutions = await _context.DunningCampaignExecutions
                .Include(dce => dce.Campaign)
                    .ThenInclude(dc => dc.Steps)
                .Include(dce => dce.FailedPayment)
                .Where(dce => dce.Status == "active" 
                           && dce.NextExecutionAt <= DateTime.UtcNow)
                .ToListAsync();

            var processedCount = 0;

            foreach (var execution in dueExecutions)
            {
                try
                {
                    // Check if failed payment is still active
                    if (execution.FailedPayment.RecoveryStatus != "active")
                    {
                        execution.Status = "stopped";
                        execution.CompletionReason = "payment_resolved";
                        execution.CompletedAt = DateTime.UtcNow;
                        execution.UpdatedAt = DateTime.UtcNow;
                        continue;
                    }

                    // Find next step to execute
                    var nextStep = execution.Campaign.Steps
                        .Where(s => s.IsActive && s.StepNumber > execution.CurrentStepNumber)
                        .OrderBy(s => s.StepNumber)
                        .FirstOrDefault();

                    if (nextStep == null)
                    {
                        // Campaign completed
                        execution.Status = "completed";
                        execution.CompletionReason = "all_steps_completed";
                        execution.CompletedAt = DateTime.UtcNow;
                        execution.UpdatedAt = DateTime.UtcNow;
                        continue;
                    }

                    // Execute the step
                    var correlationId = $"dunning-processor-{Guid.NewGuid()}";
                    await ExecuteDunningStepAsync(execution.Id, nextStep.Id, correlationId);

                    processedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing dunning execution {ExecutionId}", execution.Id);
                    
                    execution.Status = "failed";
                    execution.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Processed {ProcessedCount} dunning campaign executions", processedCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ProcessDunningCampaignExecutionsAsync");
            throw;
        }
    }

    public async Task ExecuteDunningStepAsync(Guid campaignExecutionId, Guid stepId, string correlationId)
    {
        try
        {
            var execution = await _context.DunningCampaignExecutions
                .Include(dce => dce.Campaign)
                .Include(dce => dce.FailedPayment)
                .Include(dce => dce.User)
                .FirstOrDefaultAsync(dce => dce.Id == campaignExecutionId);

            var step = await _context.DunningSteps
                .FirstOrDefaultAsync(ds => ds.Id == stepId);

            if (execution == null || step == null)
                throw new ArgumentException("Execution or step not found");

            _logger.LogInformation("Executing dunning step {StepId} for campaign execution {ExecutionId}",
                stepId, campaignExecutionId);

            // Send notification
            var notification = await SendDunningNotificationAsync(campaignExecutionId, stepId, correlationId);

            // Update execution
            execution.CurrentStepNumber = step.StepNumber;
            execution.TotalExecutions++;
            execution.LastExecutedAt = DateTime.UtcNow;

            // Schedule next execution if more steps remain
            var nextStep = await _context.DunningSteps
                .Where(ds => ds.CampaignId == execution.CampaignId 
                          && ds.IsActive 
                          && ds.StepNumber > step.StepNumber)
                .OrderBy(ds => ds.StepNumber)
                .FirstOrDefaultAsync();

            if (nextStep != null && execution.TotalExecutions < execution.Campaign.MaxExecutions)
            {
                execution.NextExecutionAt = DateTime.UtcNow.Add(nextStep.DelayFromPrevious);
            }
            else
            {
                // Campaign completed
                execution.Status = "completed";
                execution.CompletionReason = "all_steps_completed";
                execution.CompletedAt = DateTime.UtcNow;
                execution.NextExecutionAt = null;
            }

            execution.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await LogDunningAnalyticsAsync("step_executed", execution.CampaignId, stepId, execution.UserId, 
                notification.Status == "sent", correlationId, new Dictionary<string, object>
                {
                    ["step_number"] = step.StepNumber,
                    ["notification_type"] = step.NotificationType,
                    ["urgency_level"] = step.UrgencyLevel,
                    ["execution_count"] = execution.TotalExecutions
                });

            _logger.LogInformation("Executed dunning step {StepId}, notification status: {NotificationStatus}",
                stepId, notification.Status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing dunning step {StepId} for execution {ExecutionId}", stepId, campaignExecutionId);
            throw;
        }
    }

    public async Task<DunningNotification> SendDunningNotificationAsync(Guid campaignExecutionId, Guid stepId, string correlationId)
    {
        try
        {
            var execution = await _context.DunningCampaignExecutions
                .Include(dce => dce.User)
                .Include(dce => dce.FailedPayment)
                .FirstOrDefaultAsync(dce => dce.Id == campaignExecutionId);

            var step = await _context.DunningSteps
                .FirstOrDefaultAsync(ds => ds.Id == stepId);

            if (execution == null || step == null)
                throw new ArgumentException("Execution or step not found");

            // Process message templates
            var processedSubject = await ProcessSubjectTemplateAsync(step.Subject, execution.UserId, execution.FailedPaymentId);
            var processedMessage = await ProcessMessageTemplateAsync(step.MessageTemplate, execution.UserId, execution.FailedPaymentId);

            var notification = new DunningNotification
            {
                Id = Guid.NewGuid(),
                CampaignExecutionId = campaignExecutionId,
                StepId = stepId,
                UserId = execution.UserId,
                NotificationType = step.NotificationType,
                Subject = processedSubject,
                Message = processedMessage,
                Status = "pending",
                CorrelationId = correlationId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.DunningNotifications.Add(notification);
            await _context.SaveChangesAsync();

            // Send notification based on type
            try
            {
                switch (step.NotificationType.ToLower())
                {
                    case "email":
                        await SendEmailNotificationAsync(notification, execution.User);
                        break;
                    case "sms":
                        if (_smsService != null)
                            await SendSmsNotificationAsync(notification, execution.User);
                        else
                            throw new InvalidOperationException("SMS service not available");
                        break;
                    case "push":
                        if (_pushNotificationService != null)
                            await SendPushNotificationAsync(notification, execution.User);
                        else
                            throw new InvalidOperationException("Push notification service not available");
                        break;
                    case "in_app":
                        await CreateInAppNotificationAsync(notification, execution.User);
                        break;
                    default:
                        throw new ArgumentException($"Unsupported notification type: {step.NotificationType}");
                }

                notification.Status = "sent";
                notification.SentAt = DateTime.UtcNow;
            }
            catch (Exception notificationEx)
            {
                _logger.LogError(notificationEx, "Failed to send {NotificationType} notification {NotificationId}",
                    step.NotificationType, notification.Id);

                notification.Status = "failed";
                notification.ErrorMessage = notificationEx.Message;
                notification.NextRetryAt = DateTime.UtcNow.AddMinutes(30); // Retry in 30 minutes
            }

            notification.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return notification;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending dunning notification for execution {ExecutionId}, step {StepId}",
                campaignExecutionId, stepId);
            throw;
        }
    }

    public async Task<string> DetermineCustomerSegmentAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return "unknown";

            // Get user's subscription history
            var subscriptions = await _context.Subscriptions
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();

            var activeSubscription = subscriptions.FirstOrDefault(s => s.Status == "active");

            // Check account age
            var accountAgeMonths = (DateTime.UtcNow - user.CreatedAt).TotalDays / 30;

            // Check payment history
            var paymentCount = await _context.PaymentTransactions
                .CountAsync(pt => pt.UserId == userId && pt.Status == "succeeded");

            var failedPaymentCount = await _context.FailedPayments
                .CountAsync(fp => fp.UserId == userId);

            // Determine segment based on criteria
            if (activeSubscription?.PlanType == "pro" || paymentCount > 24) // 2+ years of payments
                return "high_value";

            if (accountAgeMonths >= 12 && failedPaymentCount <= 1)
                return "long_term";

            if (activeSubscription?.PlanType == "premium")
                return "premium";

            if (accountAgeMonths <= 1)
                return "new";

            if (failedPaymentCount > 3)
                return "at_risk";

            return "standard";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error determining customer segment for user {UserId}", userId);
            return "unknown";
        }
    }

    public async Task<List<DunningCampaignDto>> GetCampaignsForSegmentAsync(string customerSegment, string triggerType)
    {
        var campaigns = await _context.DunningCampaigns
            .Where(dc => dc.IsActive 
                      && dc.TriggerType == triggerType
                      && (dc.CustomerSegment == "all" || dc.CustomerSegment == customerSegment))
            .OrderByDescending(dc => dc.Priority)
            .ThenBy(dc => dc.CreatedAt)
            .ToListAsync();

        return campaigns.Select(c => new DunningCampaignDto
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            TriggerType = c.TriggerType,
            CustomerSegment = c.CustomerSegment,
            IsActive = c.IsActive,
            StepCount = 0, // Will be populated if needed
            CreatedAt = c.CreatedAt
        }).ToList();
    }

    public async Task<string> ProcessMessageTemplateAsync(string template, Guid userId, Guid failedPaymentId, Dictionary<string, object>? additionalVariables = null)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            var failedPayment = await _context.FailedPayments
                .Include(fp => fp.PaymentTransaction)
                .Include(fp => fp.Subscription)
                .FirstOrDefaultAsync(fp => fp.Id == failedPaymentId);

            if (user == null || failedPayment == null)
                return template;

            var variables = new Dictionary<string, object>
            {
                ["user_first_name"] = user.FirstName ?? "",
                ["user_email"] = user.Email ?? "",
                ["payment_amount"] = failedPayment.Amount.ToString("C"),
                ["payment_currency"] = failedPayment.Currency,
                ["failure_date"] = failedPayment.CreatedAt.ToString("MMM dd, yyyy"),
                ["failure_reason"] = failedPayment.FailureReason,
                ["retry_attempts"] = failedPayment.RetryCount,
                ["account_url"] = "/account/billing",
                ["update_payment_url"] = $"/payment/update?session={await CreateRecoverySessionToken(failedPaymentId)}",
                ["support_email"] = "support@geoleap.com",
                ["company_name"] = "GeoLeap"
            };

            // Add grace period information if available
            var gracePeriod = await _context.GracePeriods
                .FirstOrDefaultAsync(gp => gp.FailedPaymentId == failedPaymentId && gp.Status == "active");

            if (gracePeriod != null)
            {
                variables["grace_period_expires"] = gracePeriod.ExpiresAt.ToString("MMM dd, yyyy");
                variables["grace_period_days_remaining"] = Math.Max(0, (gracePeriod.ExpiresAt - DateTime.UtcNow).TotalDays);
            }

            // Merge additional variables
            if (additionalVariables != null)
            {
                foreach (var kvp in additionalVariables)
                {
                    variables[kvp.Key] = kvp.Value;
                }
            }

            // Replace template variables
            var processedTemplate = template;
            foreach (var variable in variables)
            {
                var placeholder = $"{{{{{variable.Key}}}}}";
                processedTemplate = processedTemplate.Replace(placeholder, variable.Value?.ToString() ?? "");
            }

            return processedTemplate;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing message template for user {UserId}", userId);
            return template; // Return original template if processing fails
        }
    }

    public async Task<string> ProcessSubjectTemplateAsync(string template, Guid userId, Guid failedPaymentId, Dictionary<string, object>? additionalVariables = null)
    {
        // Use same processing logic as message template but for subject line
        return await ProcessMessageTemplateAsync(template, userId, failedPaymentId, additionalVariables);
    }

    public async Task StopDunningCampaignAsync(Guid failedPaymentId, string reason, string correlationId)
    {
        try
        {
            var executions = await _context.DunningCampaignExecutions
                .Where(dce => dce.FailedPaymentId == failedPaymentId && dce.Status == "active")
                .ToListAsync();

            foreach (var execution in executions)
            {
                execution.Status = "stopped";
                execution.CompletionReason = reason;
                execution.CompletedAt = DateTime.UtcNow;
                execution.UpdatedAt = DateTime.UtcNow;

                await LogDunningAnalyticsAsync("campaign_stopped", execution.CampaignId, null, execution.UserId, 
                    true, correlationId, new Dictionary<string, object>
                    {
                        ["stop_reason"] = reason,
                        ["steps_completed"] = execution.CurrentStepNumber,
                        ["total_notifications"] = execution.TotalExecutions
                    });
            }

            if (executions.Any())
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Stopped {Count} dunning campaign executions for failed payment {FailedPaymentId}",
                    executions.Count, failedPaymentId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping dunning campaigns for failed payment {FailedPaymentId}", failedPaymentId);
            throw;
        }
    }

    public async Task LogDunningAnalyticsAsync(string eventType, Guid? campaignId, Guid? stepId, Guid? userId, bool wasSuccessful, string correlationId, Dictionary<string, object>? metadata = null)
    {
        try
        {
            var analytics = new DunningAnalytics
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                EventType = eventType,
                FailureType = "", // Will be populated based on context
                CampaignId = campaignId,
                StepId = stepId,
                WasSuccessful = wasSuccessful,
                CorrelationId = correlationId,
                AnalyticsMetadata = metadata ?? new Dictionary<string, object>(),
                Timestamp = DateTime.UtcNow
            };

            _context.DunningAnalytics.Add(analytics);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging dunning analytics for event {EventType}", eventType);
        }
    }

    // Private helper methods for notifications
    private async Task SendEmailNotificationAsync(DunningNotification notification, User user)
    {
        try
        {
            await _emailService.SendPlainEmailAsync(
                user.Email ?? "",
                notification.Subject,
                notification.Message,
                notification.CorrelationId);

            notification.ExternalId = $"email-{notification.Id}";
            notification.DeliveryMetadata["provider"] = "email_service";
            notification.DeliveryMetadata["recipient"] = user.Email;

            _logger.LogInformation("Sent dunning email notification {NotificationId} to {Email}",
                notification.Id, user.Email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send dunning email notification {NotificationId}", notification.Id);
            throw;
        }
    }

    private async Task SendSmsNotificationAsync(DunningNotification notification, User user)
    {
        if (_smsService == null)
            throw new InvalidOperationException("SMS service not configured");

        // This would be implemented based on the SMS service interface
        // For now, just log the attempt
        _logger.LogInformation("SMS notification would be sent to user {UserId}: {Message}",
            user.Id, notification.Message);
        
        notification.ExternalId = $"sms-{notification.Id}";
        notification.DeliveryMetadata["provider"] = "sms_service";
    }

    private async Task SendPushNotificationAsync(DunningNotification notification, User user)
    {
        if (_pushNotificationService == null)
            throw new InvalidOperationException("Push notification service not configured");

        // This would be implemented based on the push notification service interface
        _logger.LogInformation("Push notification would be sent to user {UserId}: {Subject}",
            user.Id, notification.Subject);
        
        notification.ExternalId = $"push-{notification.Id}";
        notification.DeliveryMetadata["provider"] = "push_service";
    }

    private async Task CreateInAppNotificationAsync(DunningNotification notification, User user)
    {
        // Create an in-app notification record
        // This would integrate with existing notification system
        _logger.LogInformation("In-app notification created for user {UserId}: {Subject}",
            user.Id, notification.Subject);
        
        notification.ExternalId = $"inapp-{notification.Id}";
        notification.DeliveryMetadata["provider"] = "in_app";
    }

    private async Task<string> CreateRecoverySessionToken(Guid failedPaymentId)
    {
        // This would create a recovery session and return the token
        // For now, return a placeholder
        return "recovery-token-placeholder";
    }

    public async Task<List<DunningCampaignDto>> GetActiveCampaignsAsync()
    {
        var campaigns = await _context.DunningCampaigns
            .Where(dc => dc.IsActive && dc.ArchivedAt == null)
            .Include(dc => dc.Steps)
            .OrderByDescending(dc => dc.Priority)
            .ThenBy(dc => dc.Name)
            .ToListAsync();

        return campaigns.Select(c => new DunningCampaignDto
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            TriggerType = c.TriggerType,
            CustomerSegment = c.CustomerSegment,
            IsActive = c.IsActive,
            StepCount = c.Steps.Count,
            CreatedAt = c.CreatedAt
        }).ToList();
    }

    public async Task<DunningCampaignDto?> GetCampaignAsync(Guid campaignId)
    {
        var campaign = await _context.DunningCampaigns
            .Include(dc => dc.Steps)
            .FirstOrDefaultAsync(dc => dc.Id == campaignId);

        if (campaign == null)
            return null;

        return new DunningCampaignDto
        {
            Id = campaign.Id,
            Name = campaign.Name,
            Description = campaign.Description,
            TriggerType = campaign.TriggerType,
            CustomerSegment = campaign.CustomerSegment,
            IsActive = campaign.IsActive,
            StepCount = campaign.Steps.Count,
            CreatedAt = campaign.CreatedAt
        };
    }

    public async Task<Dictionary<string, object>> GetCampaignPerformanceAsync(Guid campaignId, DateTime startDate, DateTime endDate)
    {
        var executions = await _context.DunningCampaignExecutions
            .Include(dce => dce.Notifications)
            .Where(dce => dce.CampaignId == campaignId 
                       && dce.CreatedAt >= startDate 
                       && dce.CreatedAt <= endDate)
            .ToListAsync();

        var analytics = await _context.DunningAnalytics
            .Where(da => da.CampaignId == campaignId
                      && da.Timestamp >= startDate 
                      && da.Timestamp <= endDate)
            .ToListAsync();

        var totalExecutions = executions.Count;
        var completedExecutions = executions.Count(e => e.Status == "completed");
        var stoppedExecutions = executions.Count(e => e.Status == "stopped");
        var totalNotifications = executions.Sum(e => e.Notifications.Count);
        var successfulNotifications = executions.SelectMany(e => e.Notifications).Count(n => n.Status == "sent" || n.Status == "delivered");

        return new Dictionary<string, object>
        {
            ["campaign_id"] = campaignId,
            ["period"] = new { start = startDate, end = endDate },
            ["executions"] = new
            {
                total = totalExecutions,
                completed = completedExecutions,
                stopped = stoppedExecutions,
                completion_rate = totalExecutions > 0 ? (double)completedExecutions / totalExecutions : 0
            },
            ["notifications"] = new
            {
                total = totalNotifications,
                successful = successfulNotifications,
                delivery_rate = totalNotifications > 0 ? (double)successfulNotifications / totalNotifications : 0
            },
            ["recovery_metrics"] = new
            {
                payments_recovered = analytics.Count(a => a.EventType == "recovery_completed" && a.WasSuccessful),
                total_amount_recovered = analytics.Where(a => a.EventType == "recovery_completed" && a.WasSuccessful).Sum(a => a.Amount ?? 0)
            }
        };
    }

    public async Task<Dictionary<string, object>> GetDunningOverviewAnalyticsAsync(DateTime startDate, DateTime endDate)
    {
        var analytics = await _context.DunningAnalytics
            .Where(da => da.Timestamp >= startDate && da.Timestamp <= endDate)
            .ToListAsync();

        var failedPayments = analytics.Where(a => a.EventType == "payment_failed");
        var recoveredPayments = analytics.Where(a => a.EventType == "recovery_completed" && a.WasSuccessful);
        var totalNotifications = analytics.Where(a => a.EventType == "notification_sent");

        return new Dictionary<string, object>
        {
            ["period"] = new { start = startDate, end = endDate },
            ["failed_payments"] = new
            {
                total_count = failedPayments.Count(),
                total_amount = failedPayments.Sum(fp => fp.Amount ?? 0),
                unique_users = failedPayments.Select(fp => fp.UserId).Distinct().Count()
            },
            ["recovery_performance"] = new
            {
                recovered_count = recoveredPayments.Count(),
                recovered_amount = recoveredPayments.Sum(rp => rp.Amount ?? 0),
                recovery_rate = failedPayments.Count() > 0 ? (double)recoveredPayments.Count() / failedPayments.Count() : 0,
                average_days_to_recovery = recoveredPayments.Count() > 0 ? recoveredPayments.Average(rp => rp.DaysSinceFailure) : 0
            },
            ["notification_performance"] = new
            {
                total_sent = totalNotifications.Count(),
                unique_recipients = totalNotifications.Select(n => n.UserId).Distinct().Count(),
                notifications_per_recovery = recoveredPayments.Count() > 0 ? (double)totalNotifications.Count() / recoveredPayments.Count() : 0
            }
        };
    }

    public async Task<DunningCampaignDto> UpdateCampaignAsync(Guid campaignId, CreateDunningCampaignRequest request, string updatedBy, string correlationId)
    {
        var campaign = await _context.DunningCampaigns
            .Include(dc => dc.Steps)
            .FirstOrDefaultAsync(dc => dc.Id == campaignId);

        if (campaign == null)
            throw new ArgumentException("Campaign not found");

        campaign.Name = request.Name;
        campaign.Description = request.Description;
        campaign.TriggerType = request.TriggerType;
        campaign.CustomerSegment = request.CustomerSegment;
        campaign.DelayAfterTrigger = request.DelayAfterTrigger;
        campaign.SequenceInterval = request.SequenceInterval;
        campaign.MaxExecutions = request.MaxExecutions;
        campaign.UpdatedAt = DateTime.UtcNow;

        // Remove existing steps and add new ones
        _context.DunningSteps.RemoveRange(campaign.Steps);

        for (int i = 0; i < request.Steps.Count; i++)
        {
            var stepRequest = request.Steps[i];
            var step = new DunningStep
            {
                Id = Guid.NewGuid(),
                CampaignId = campaign.Id,
                StepNumber = i + 1,
                Name = stepRequest.Name,
                NotificationType = stepRequest.NotificationType,
                Subject = stepRequest.Subject,
                MessageTemplate = stepRequest.MessageTemplate,
                DelayFromPrevious = stepRequest.DelayFromPrevious,
                UrgencyLevel = stepRequest.UrgencyLevel,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.DunningSteps.Add(step);
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated dunning campaign {CampaignId} by {UpdatedBy}", campaignId, updatedBy);

        return new DunningCampaignDto
        {
            Id = campaign.Id,
            Name = campaign.Name,
            Description = campaign.Description,
            TriggerType = campaign.TriggerType,
            CustomerSegment = campaign.CustomerSegment,
            IsActive = campaign.IsActive,
            StepCount = request.Steps.Count,
            CreatedAt = campaign.CreatedAt
        };
    }

    public async Task<bool> DeleteCampaignAsync(Guid campaignId, string deletedBy, string correlationId)
    {
        var campaign = await _context.DunningCampaigns
            .FirstOrDefaultAsync(dc => dc.Id == campaignId);

        if (campaign == null)
            return false;

        campaign.IsActive = false;
        campaign.ArchivedAt = DateTime.UtcNow;
        campaign.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Archived dunning campaign {CampaignId} by {DeletedBy}", campaignId, deletedBy);
        return true;
    }

    public async Task ProcessFailedNotificationsAsync()
    {
        var failedNotifications = await _context.DunningNotifications
            .Where(dn => dn.Status == "failed" 
                      && dn.NextRetryAt <= DateTime.UtcNow
                      && dn.RetryCount < 3)
            .Include(dn => dn.User)
            .ToListAsync();

        foreach (var notification in failedNotifications)
        {
            try
            {
                var correlationId = $"notification-retry-{Guid.NewGuid()}";
                await RetryFailedNotificationAsync(notification.Id, correlationId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrying failed notification {NotificationId}", notification.Id);
            }
        }
    }

    public async Task<bool> RetryFailedNotificationAsync(Guid notificationId, string correlationId)
    {
        var notification = await _context.DunningNotifications
            .Include(dn => dn.User)
            .FirstOrDefaultAsync(dn => dn.Id == notificationId);

        if (notification == null)
            return false;

        notification.Status = "pending";
        notification.RetryCount++;
        notification.CorrelationId = correlationId;
        notification.UpdatedAt = DateTime.UtcNow;

        try
        {
            switch (notification.NotificationType.ToLower())
            {
                case "email":
                    await SendEmailNotificationAsync(notification, notification.User);
                    break;
                case "sms":
                    if (_smsService != null)
                        await SendSmsNotificationAsync(notification, notification.User);
                    break;
                case "push":
                    if (_pushNotificationService != null)
                        await SendPushNotificationAsync(notification, notification.User);
                    break;
                case "in_app":
                    await CreateInAppNotificationAsync(notification, notification.User);
                    break;
            }

            notification.Status = "sent";
            notification.SentAt = DateTime.UtcNow;
            notification.NextRetryAt = null;
        }
        catch (Exception ex)
        {
            notification.Status = "failed";
            notification.ErrorMessage = ex.Message;
            notification.NextRetryAt = DateTime.UtcNow.AddHours(2); // Retry in 2 hours
        }

        await _context.SaveChangesAsync();
        return notification.Status == "sent";
    }

    public async Task<DunningStep?> SelectOptimalStepVariantAsync(Guid stepId, Guid userId)
    {
        // For now, return the default step
        // In a full implementation, this would select between A/B test variants
        return await _context.DunningSteps.FirstOrDefaultAsync(ds => ds.Id == stepId);
    }

    public async Task RecordStepPerformanceAsync(Guid stepId, string variant, bool wasSuccessful, string correlationId)
    {
        // Record A/B test performance data
        await LogDunningAnalyticsAsync("ab_test_result", null, stepId, null, wasSuccessful, correlationId, new Dictionary<string, object>
        {
            ["variant"] = variant,
            ["step_id"] = stepId
        });
    }

    public async Task OverrideFailedPaymentProcessAsync(Guid failedPaymentId, string reason, Guid supportAgentId, string correlationId)
    {
        _logger.LogInformation("Overriding failed payment process for {FailedPaymentId} by agent {SupportAgentId}: {Reason}", 
            failedPaymentId, supportAgentId, reason);
        
        // In a full implementation, this would stop dunning processes and mark payment as handled
        await LogDunningAnalyticsAsync("support_override", null, null, null, true, correlationId, new Dictionary<string, object>
        {
            ["failed_payment_id"] = failedPaymentId,
            ["support_agent_id"] = supportAgentId,
            ["reason"] = reason
        });
    }

    public async Task ExtendGracePeriodAsync(Guid failedPaymentId, int additionalDays, string reason, Guid supportAgentId, string correlationId)
    {
        _logger.LogInformation("Extending grace period for {FailedPaymentId} by {AdditionalDays} days by agent {SupportAgentId}: {Reason}", 
            failedPaymentId, additionalDays, supportAgentId, reason);
        
        // In a full implementation, this would extend the grace period and adjust dunning schedules
        await LogDunningAnalyticsAsync("grace_period_extension", null, null, null, true, correlationId, new Dictionary<string, object>
        {
            ["failed_payment_id"] = failedPaymentId,
            ["additional_days"] = additionalDays,
            ["support_agent_id"] = supportAgentId,
            ["reason"] = reason
        });
    }
}