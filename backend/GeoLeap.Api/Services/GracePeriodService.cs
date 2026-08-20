using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public class GracePeriodService : IGracePeriodService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GracePeriodService> _logger;
    private readonly IEmailService _emailService;
    private readonly Dictionary<string, int> _defaultGracePeriodDays;

    public GracePeriodService(
        ApplicationDbContext context,
        ILogger<GracePeriodService> logger,
        IEmailService emailService)
    {
        _context = context;
        _logger = logger;
        _emailService = emailService;

        // Default grace period configurations
        _defaultGracePeriodDays = new Dictionary<string, int>
        {
            ["payment_failure"] = 7,          // 7 days for payment failures
            ["subscription_past_due"] = 5,    // 5 days for past due subscriptions
            ["billing_dispute"] = 14,         // 14 days for billing disputes
            ["high_value_customer"] = 14,     // Extended grace for high-value customers
            ["new_customer"] = 3,             // Shorter grace for new customers
            ["long_term_customer"] = 10       // Extended grace for loyal customers
        };
    }

    public async Task<GracePeriodDto> StartGracePeriodAsync(Guid failedPaymentId, string correlationId)
    {
        try
        {
            var failedPayment = await _context.FailedPayments
                .Include(fp => fp.User)
                .Include(fp => fp.Subscription)
                .FirstOrDefaultAsync(fp => fp.Id == failedPaymentId);

            if (failedPayment == null)
                throw new ArgumentException("Failed payment not found");

            // Check if grace period already exists
            var existingGracePeriod = await _context.GracePeriods
                .FirstOrDefaultAsync(gp => gp.FailedPaymentId == failedPaymentId);

            if (existingGracePeriod != null)
            {
                return MapToGracePeriodDto(existingGracePeriod);
            }

            _logger.LogInformation("Starting grace period for failed payment {FailedPaymentId}", failedPaymentId);

            // Determine grace period duration and restrictions
            var gracePeriodDays = await GetGracePeriodDaysAsync(failedPayment.UserId);
            var (limitFeatures, restrictedFeatures) = await DetermineServiceRestrictionsAsync(failedPayment.UserId);

            var gracePeriod = new GracePeriod
            {
                Id = Guid.NewGuid(),
                UserId = failedPayment.UserId,
                FailedPaymentId = failedPaymentId,
                SubscriptionId = failedPayment.SubscriptionId,
                Status = "active",
                GracePeriodType = "payment_failure",
                GracePeriodDays = gracePeriodDays,
                StartedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(gracePeriodDays),
                LimitFeatures = limitFeatures,
                RestrictedFeatures = restrictedFeatures,
                ShowGracePeriodWarnings = true,
                CorrelationId = correlationId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.GracePeriods.Add(gracePeriod);
            await _context.SaveChangesAsync();

            await LogGracePeriodAnalyticsAsync("grace_period_started", gracePeriod.Id, true, correlationId, new Dictionary<string, object>
            {
                ["grace_period_days"] = gracePeriodDays,
                ["limit_features"] = limitFeatures,
                ["restricted_features_count"] = restrictedFeatures.Count,
                ["failure_type"] = failedPayment.FailureType
            });

            _logger.LogInformation("Started grace period {GracePeriodId} for user {UserId}, expires {ExpiresAt}",
                gracePeriod.Id, failedPayment.UserId, gracePeriod.ExpiresAt);

            return MapToGracePeriodDto(gracePeriod);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting grace period for failed payment {FailedPaymentId}", failedPaymentId);
            throw;
        }
    }

    public async Task<GracePeriodDto> ExtendGracePeriodAsync(Guid gracePeriodId, int additionalDays, string reason, string extendedBy, string correlationId)
    {
        try
        {
            var gracePeriod = await _context.GracePeriods
                .FirstOrDefaultAsync(gp => gp.Id == gracePeriodId);

            if (gracePeriod == null)
                throw new ArgumentException("Grace period not found");

            if (gracePeriod.Status != "active")
                throw new InvalidOperationException("Cannot extend inactive grace period");

            _logger.LogInformation("Extending grace period {GracePeriodId} by {AdditionalDays} days, reason: {Reason}",
                gracePeriodId, additionalDays, reason);

            var oldExpiryDate = gracePeriod.ExpiresAt;
            gracePeriod.ExpiresAt = gracePeriod.ExpiresAt.AddDays(additionalDays);
            gracePeriod.GracePeriodDays += additionalDays;
            gracePeriod.UpdatedAt = DateTime.UtcNow;

            gracePeriod.Metadata["extension_reason"] = reason;
            gracePeriod.Metadata["extended_by"] = extendedBy;
            gracePeriod.Metadata["extension_date"] = DateTime.UtcNow;
            gracePeriod.Metadata["additional_days"] = additionalDays;

            await _context.SaveChangesAsync();

            await LogGracePeriodAnalyticsAsync("grace_period_extended", gracePeriod.Id, true, correlationId, new Dictionary<string, object>
            {
                ["additional_days"] = additionalDays,
                ["new_expiry_date"] = gracePeriod.ExpiresAt,
                ["old_expiry_date"] = oldExpiryDate,
                ["extension_reason"] = reason,
                ["extended_by"] = extendedBy
            });

            _logger.LogInformation("Extended grace period {GracePeriodId} to {NewExpiryDate}",
                gracePeriodId, gracePeriod.ExpiresAt);

            return MapToGracePeriodDto(gracePeriod);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extending grace period {GracePeriodId}", gracePeriodId);
            throw;
        }
    }

    public async Task<GracePeriodDto> EndGracePeriodAsync(Guid failedPaymentId, string endReason, string correlationId)
    {
        try
        {
            var gracePeriod = await _context.GracePeriods
                .FirstOrDefaultAsync(gp => gp.FailedPaymentId == failedPaymentId && gp.Status == "active");

            if (gracePeriod == null)
                throw new ArgumentException("Active grace period not found for failed payment");

            _logger.LogInformation("Ending grace period {GracePeriodId} for failed payment {FailedPaymentId}, reason: {Reason}",
                gracePeriod.Id, failedPaymentId, endReason);

            gracePeriod.Status = "resolved";
            gracePeriod.ResolvedAt = DateTime.UtcNow;
            gracePeriod.UpdatedAt = DateTime.UtcNow;

            gracePeriod.Metadata["end_reason"] = endReason;
            gracePeriod.Metadata["resolved_date"] = DateTime.UtcNow;
            gracePeriod.Metadata["days_used"] = (DateTime.UtcNow - gracePeriod.StartedAt).TotalDays;

            await _context.SaveChangesAsync();

            await LogGracePeriodAnalyticsAsync("grace_period_ended", gracePeriod.Id, true, correlationId, new Dictionary<string, object>
            {
                ["end_reason"] = endReason,
                ["days_used"] = (DateTime.UtcNow - gracePeriod.StartedAt).TotalDays,
                ["total_days_allocated"] = gracePeriod.GracePeriodDays,
                ["was_extended"] = gracePeriod.Metadata.ContainsKey("extension_reason")
            });

            _logger.LogInformation("Ended grace period {GracePeriodId}, reason: {Reason}",
                gracePeriod.Id, endReason);

            return MapToGracePeriodDto(gracePeriod);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ending grace period for failed payment {FailedPaymentId}", failedPaymentId);
            throw;
        }
    }

    public async Task<GracePeriodDto?> GetActiveGracePeriodAsync(Guid userId)
    {
        var gracePeriod = await _context.GracePeriods
            .FirstOrDefaultAsync(gp => gp.UserId == userId && gp.Status == "active");

        return gracePeriod == null ? null : MapToGracePeriodDto(gracePeriod);
    }

    public async Task<GracePeriodDto?> GetGracePeriodByFailedPaymentAsync(Guid failedPaymentId)
    {
        var gracePeriod = await _context.GracePeriods
            .FirstOrDefaultAsync(gp => gp.FailedPaymentId == failedPaymentId);

        return gracePeriod == null ? null : MapToGracePeriodDto(gracePeriod);
    }

    public async Task<bool> IsUserInGracePeriodAsync(Guid userId)
    {
        var gracePeriod = await GetActiveGracePeriodAsync(userId);
        return gracePeriod != null && gracePeriod.ExpiresAt > DateTime.UtcNow;
    }

    public async Task<List<string>> GetRestrictedFeaturesAsync(Guid userId)
    {
        var gracePeriod = await _context.GracePeriods
            .FirstOrDefaultAsync(gp => gp.UserId == userId && gp.Status == "active");

        if (gracePeriod == null || !gracePeriod.LimitFeatures)
            return new List<string>();

        return gracePeriod.RestrictedFeatures;
    }

    public async Task<bool> IsFeatureAvailableAsync(Guid userId, string featureName)
    {
        var restrictedFeatures = await GetRestrictedFeaturesAsync(userId);
        return !restrictedFeatures.Contains(featureName);
    }

    public async Task<int> GetGracePeriodDaysAsync(Guid userId, string gracePeriodType = "payment_failure")
    {
        try
        {
            // Check for user-specific configuration
            var userSegment = await DetermineUserGracePeriodSegmentAsync(userId);
            var configKey = $"grace_period_days_{userSegment}_{gracePeriodType}";
            var customConfig = await GetDunningConfigurationAsync(configKey);

            if (customConfig != null && int.TryParse(customConfig, out var customDays))
                return customDays;

            // Check for general configuration
            configKey = $"grace_period_days_{gracePeriodType}";
            customConfig = await GetDunningConfigurationAsync(configKey);

            if (customConfig != null && int.TryParse(customConfig, out var generalDays))
                return generalDays;

            // Return default
            return _defaultGracePeriodDays.GetValueOrDefault(gracePeriodType, 7);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting grace period days for user {UserId}", userId);
            return 7; // Default fallback
        }
    }

    public async Task ProcessExpiringGracePeriodsAsync()
    {
        try
        {
            _logger.LogInformation("Processing expiring grace periods");

            var expiringGracePeriods = await _context.GracePeriods
                .Include(gp => gp.User)
                .Include(gp => gp.FailedPayment)
                .Where(gp => gp.Status == "active" 
                          && gp.ExpiresAt <= DateTime.UtcNow.AddDays(1) 
                          && gp.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();

            foreach (var gracePeriod in expiringGracePeriods)
            {
                try
                {
                    await SendGracePeriodExpirationWarningAsync(gracePeriod);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending expiration warning for grace period {GracePeriodId}", 
                        gracePeriod.Id);
                }
            }

            _logger.LogInformation("Processed {Count} expiring grace periods", expiringGracePeriods.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ProcessExpiringGracePeriodsAsync");
            throw;
        }
    }

    public async Task ProcessExpiredGracePeriodsAsync()
    {
        try
        {
            _logger.LogInformation("Processing expired grace periods");

            var expiredGracePeriods = await _context.GracePeriods
                .Include(gp => gp.User)
                .Include(gp => gp.FailedPayment)
                .Where(gp => gp.Status == "active" && gp.ExpiresAt <= DateTime.UtcNow)
                .ToListAsync();

            foreach (var gracePeriod in expiredGracePeriods)
            {
                try
                {
                    await ExpireGracePeriodAsync(gracePeriod);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error expiring grace period {GracePeriodId}", gracePeriod.Id);
                }
            }

            if (expiredGracePeriods.Any())
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Expired {Count} grace periods", expiredGracePeriods.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ProcessExpiredGracePeriodsAsync");
            throw;
        }
    }

    public async Task<List<GracePeriodDto>> GetExpiringGracePeriodsAsync(int daysUntilExpiry = 1)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(daysUntilExpiry);
        
        var gracePeriods = await _context.GracePeriods
            .Where(gp => gp.Status == "active" 
                      && gp.ExpiresAt <= cutoffDate 
                      && gp.ExpiresAt > DateTime.UtcNow)
            .OrderBy(gp => gp.ExpiresAt)
            .ToListAsync();

        return gracePeriods.Select(MapToGracePeriodDto).ToList();
    }

    public async Task<List<GracePeriodDto>> GetExpiredGracePeriodsAsync()
    {
        var gracePeriods = await _context.GracePeriods
            .Where(gp => gp.Status == "active" && gp.ExpiresAt <= DateTime.UtcNow)
            .OrderBy(gp => gp.ExpiresAt)
            .ToListAsync();

        return gracePeriods.Select(MapToGracePeriodDto).ToList();
    }

    public async Task UpdateServiceAccessControlAsync(Guid gracePeriodId, bool limitFeatures, List<string> restrictedFeatures, string correlationId)
    {
        try
        {
            var gracePeriod = await _context.GracePeriods
                .FirstOrDefaultAsync(gp => gp.Id == gracePeriodId);

            if (gracePeriod == null)
                throw new ArgumentException("Grace period not found");

            var oldLimitFeatures = gracePeriod.LimitFeatures;
            var oldRestrictedFeatures = gracePeriod.RestrictedFeatures.ToList();

            gracePeriod.LimitFeatures = limitFeatures;
            gracePeriod.RestrictedFeatures = restrictedFeatures;
            gracePeriod.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await LogGracePeriodAnalyticsAsync("service_access_updated", gracePeriod.Id, true, correlationId, new Dictionary<string, object>
            {
                ["old_limit_features"] = oldLimitFeatures,
                ["new_limit_features"] = limitFeatures,
                ["old_restricted_count"] = oldRestrictedFeatures.Count,
                ["new_restricted_count"] = restrictedFeatures.Count
            });

            _logger.LogInformation("Updated service access control for grace period {GracePeriodId}",
                gracePeriodId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating service access control for grace period {GracePeriodId}", gracePeriodId);
            throw;
        }
    }

    public async Task<Dictionary<string, int>> GetGracePeriodConfigurationAsync()
    {
        var configs = await _context.DunningConfigurations
            .Where(dc => dc.Category == "grace_periods" && dc.IsActive)
            .ToListAsync();

        var result = new Dictionary<string, int>(_defaultGracePeriodDays);

        foreach (var config in configs)
        {
            if (config.Key.StartsWith("grace_period_days_") && int.TryParse(config.Value, out var days))
            {
                var type = config.Key.Replace("grace_period_days_", "");
                result[type] = days;
            }
        }

        return result;
    }

    public async Task UpdateGracePeriodConfigurationAsync(string gracePeriodType, int days, string updatedBy)
    {
        await UpsertDunningConfigurationAsync($"grace_period_days_{gracePeriodType}", days.ToString(), "grace_periods", updatedBy);

        _logger.LogInformation("Updated grace period configuration for {Type} to {Days} days by {UpdatedBy}",
            gracePeriodType, days, updatedBy);
    }

    public async Task SendGracePeriodWarningsAsync()
    {
        var warningGracePeriods = await _context.GracePeriods
            .Include(gp => gp.User)
            .Include(gp => gp.FailedPayment)
            .Where(gp => gp.Status == "active" 
                      && gp.ShowGracePeriodWarnings
                      && gp.ExpiresAt <= DateTime.UtcNow.AddDays(2)
                      && gp.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var gracePeriod in warningGracePeriods)
        {
            try
            {
                await SendGracePeriodExpirationWarningAsync(gracePeriod);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending grace period warning for {GracePeriodId}", gracePeriod.Id);
            }
        }
    }

    public async Task SendGracePeriodExpirationNoticesAsync()
    {
        var expiredGracePeriods = await _context.GracePeriods
            .Include(gp => gp.User)
            .Include(gp => gp.FailedPayment)
            .Where(gp => gp.Status == "active" && gp.ExpiresAt <= DateTime.UtcNow)
            .ToListAsync();

        foreach (var gracePeriod in expiredGracePeriods)
        {
            try
            {
                await SendGracePeriodExpiredNoticeAsync(gracePeriod);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending grace period expiration notice for {GracePeriodId}", gracePeriod.Id);
            }
        }
    }

    public async Task<Dictionary<string, object>> GetGracePeriodAnalyticsAsync(DateTime startDate, DateTime endDate)
    {
        var gracePeriods = await _context.GracePeriods
            .Where(gp => gp.CreatedAt >= startDate && gp.CreatedAt <= endDate)
            .ToListAsync();

        var analytics = await _context.DunningAnalytics
            .Where(da => da.EventType.Contains("grace_period") 
                      && da.Timestamp >= startDate 
                      && da.Timestamp <= endDate)
            .ToListAsync();

        var totalCreated = gracePeriods.Count;
        var resolved = gracePeriods.Count(gp => gp.Status == "resolved");
        var expired = gracePeriods.Count(gp => gp.Status == "expired");
        var active = gracePeriods.Count(gp => gp.Status == "active");

        var averageDuration = gracePeriods.Where(gp => gp.ResolvedAt.HasValue)
            .Average(gp => (gp.ResolvedAt!.Value - gp.StartedAt).TotalDays);

        return new Dictionary<string, object>
        {
            ["period"] = new { start = startDate, end = endDate },
            ["grace_periods"] = new
            {
                total_created = totalCreated,
                resolved = resolved,
                expired = expired,
                active = active,
                resolution_rate = totalCreated > 0 ? (double)resolved / totalCreated : 0,
                average_duration_days = averageDuration
            },
            ["utilization"] = new
            {
                with_feature_limits = gracePeriods.Count(gp => gp.LimitFeatures),
                extended_periods = gracePeriods.Count(gp => gp.Metadata.ContainsKey("extension_reason")),
                early_resolutions = gracePeriods.Count(gp => gp.ResolvedAt.HasValue && gp.ResolvedAt < gp.ExpiresAt)
            }
        };
    }

    // Private helper methods
    private async Task<(bool limitFeatures, List<string> restrictedFeatures)> DetermineServiceRestrictionsAsync(Guid userId)
    {
        try
        {
            // Determine user segment to decide restriction level
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return (false, new List<string>());

            // Check subscription type and payment history
            var hasActiveSubscription = await _context.Subscriptions
                .AnyAsync(s => s.UserId == userId && s.Status == "active");

            var paymentFailureCount = await _context.FailedPayments
                .CountAsync(fp => fp.UserId == userId);

            // New or problematic users get more restrictions
            var accountAgeMonths = (DateTime.UtcNow - user.CreatedAt).TotalDays / 30;

            if (accountAgeMonths < 3 || paymentFailureCount > 2)
            {
                return (true, new List<string> { "advanced_search", "export_features", "bulk_operations", "api_access" });
            }

            if (!hasActiveSubscription)
            {
                return (true, new List<string> { "advanced_search", "export_features" });
            }

            // Loyal customers get minimal restrictions
            return (false, new List<string>());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error determining service restrictions for user {UserId}", userId);
            return (false, new List<string>()); // Default to no restrictions on error
        }
    }

    private async Task<string> DetermineUserGracePeriodSegmentAsync(Guid userId)
    {
        // Similar logic to DunningService.DetermineCustomerSegmentAsync but focused on grace period
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return "standard";

        var accountAgeMonths = (DateTime.UtcNow - user.CreatedAt).TotalDays / 30;
        var paymentCount = await _context.PaymentTransactions
            .CountAsync(pt => pt.UserId == userId && pt.Status == "succeeded");

        if (paymentCount > 24) return "high_value_customer";
        if (accountAgeMonths >= 12) return "long_term_customer";
        if (accountAgeMonths <= 1) return "new_customer";
        
        return "standard";
    }

    private async Task ExpireGracePeriodAsync(GracePeriod gracePeriod)
    {
        gracePeriod.Status = "expired";
        gracePeriod.UpdatedAt = DateTime.UtcNow;

        gracePeriod.Metadata["expired_date"] = DateTime.UtcNow;
        gracePeriod.Metadata["days_used"] = (DateTime.UtcNow - gracePeriod.StartedAt).TotalDays;

        // Update failed payment to indicate grace period expired
        if (gracePeriod.FailedPayment != null && gracePeriod.FailedPayment.RecoveryStatus == "active")
        {
            gracePeriod.FailedPayment.RecoveryStatus = "abandoned";
            gracePeriod.FailedPayment.UpdatedAt = DateTime.UtcNow;
        }

        await LogGracePeriodAnalyticsAsync("grace_period_expired", gracePeriod.Id, false, $"expire-processor-{Guid.NewGuid()}", new Dictionary<string, object>
        {
            ["days_allocated"] = gracePeriod.GracePeriodDays,
            ["days_used"] = (DateTime.UtcNow - gracePeriod.StartedAt).TotalDays,
            ["had_feature_limits"] = gracePeriod.LimitFeatures,
            ["was_extended"] = gracePeriod.Metadata.ContainsKey("extension_reason")
        });

        _logger.LogInformation("Expired grace period {GracePeriodId} for user {UserId}",
            gracePeriod.Id, gracePeriod.UserId);
    }

    private async Task SendGracePeriodExpirationWarningAsync(GracePeriod gracePeriod)
    {
        var daysRemaining = Math.Ceiling((gracePeriod.ExpiresAt - DateTime.UtcNow).TotalDays);
        
        var subject = $"Action Required: Your GeoLeap account expires in {daysRemaining} day(s)";
        var message = $@"
        <h2>Payment Issue - Action Required</h2>
        <p>Hello {gracePeriod.User?.FirstName},</p>
        <p>Your GeoLeap account will be suspended in {daysRemaining} day(s) due to a payment issue.</p>
        <p><strong>What you need to do:</strong></p>
        <ul>
            <li>Update your payment method</li>
            <li>Ensure sufficient funds are available</li>
            <li>Contact support if you need assistance</li>
        </ul>
        <p>Failed payment amount: {gracePeriod.FailedPayment?.Amount:C}</p>
        <p>Grace period expires: {gracePeriod.ExpiresAt:MMM dd, yyyy at HH:mm} UTC</p>
        <p><a href=""/account/billing"" style=""background: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;"">Update Payment Method</a></p>
        <p>If you have any questions, please contact our support team at support@geoleap.com</p>
        <p>Thank you,<br>The GeoLeap Team</p>
        ";

        await _emailService.SendPlainEmailAsync(
            gracePeriod.User?.Email ?? "",
            subject,
            message,
            $"grace-warning-{gracePeriod.Id}");

        _logger.LogInformation("Sent grace period warning to user {UserId}, expires in {Days} days",
            gracePeriod.UserId, daysRemaining);
    }

    private async Task SendGracePeriodExpiredNoticeAsync(GracePeriod gracePeriod)
    {
        var subject = "GeoLeap Account Suspended - Payment Required";
        var message = $@"
        <h2>Account Suspended</h2>
        <p>Hello {gracePeriod.User?.FirstName},</p>
        <p>Your GeoLeap account has been suspended due to an unresolved payment issue.</p>
        <p><strong>Account Details:</strong></p>
        <ul>
            <li>Failed payment amount: {gracePeriod.FailedPayment?.Amount:C}</li>
            <li>Grace period ended: {gracePeriod.ExpiresAt:MMM dd, yyyy}</li>
            <li>Original failure date: {gracePeriod.FailedPayment?.CreatedAt:MMM dd, yyyy}</li>
        </ul>
        <p><strong>To reactivate your account:</strong></p>
        <ol>
            <li>Update your payment method</li>
            <li>Retry the failed payment</li>
            <li>Contact support if you continue to experience issues</li>
        </ol>
        <p>Your account data will be retained for 30 days to allow for reactivation.</p>
        <p><a href=""/account/billing"" style=""background: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;"">Reactivate Account</a></p>
        <p>If you have any questions, please contact our support team at support@geoleap.com</p>
        <p>Thank you,<br>The GeoLeap Team</p>
        ";

        await _emailService.SendPlainEmailAsync(
            gracePeriod.User?.Email ?? "",
            subject,
            message,
            $"grace-expired-{gracePeriod.Id}");

        _logger.LogInformation("Sent grace period expiration notice to user {UserId}", gracePeriod.UserId);
    }

    public async Task LogGracePeriodAnalyticsAsync(string eventType, Guid gracePeriodId, bool wasSuccessful, string correlationId, Dictionary<string, object>? metadata = null)
    {
        try
        {
            var gracePeriod = await _context.GracePeriods
                .FirstOrDefaultAsync(gp => gp.Id == gracePeriodId);

            var analytics = new DunningAnalytics
            {
                Id = Guid.NewGuid(),
                UserId = gracePeriod?.UserId,
                EventType = eventType,
                FailureType = "grace_period",
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
            _logger.LogError(ex, "Error logging grace period analytics for event {EventType}", eventType);
        }
    }

    private async Task<string?> GetDunningConfigurationAsync(string key)
    {
        var config = await _context.DunningConfigurations
            .FirstOrDefaultAsync(dc => dc.Key == key && dc.IsActive);

        return config?.Value;
    }

    private async Task UpsertDunningConfigurationAsync(string key, string value, string category, string updatedBy)
    {
        var existing = await _context.DunningConfigurations
            .FirstOrDefaultAsync(dc => dc.Key == key);

        if (existing != null)
        {
            existing.Value = value;
            existing.UpdatedBy = updatedBy;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            var config = new DunningConfiguration
            {
                Id = Guid.NewGuid(),
                Key = key,
                Value = value,
                Category = category,
                UpdatedBy = updatedBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.DunningConfigurations.Add(config);
        }

        await _context.SaveChangesAsync();
    }

    private static GracePeriodDto MapToGracePeriodDto(GracePeriod gracePeriod)
    {
        return new GracePeriodDto
        {
            Id = gracePeriod.Id,
            UserId = gracePeriod.UserId,
            Status = gracePeriod.Status,
            GracePeriodType = gracePeriod.GracePeriodType,
            GracePeriodDays = gracePeriod.GracePeriodDays,
            StartedAt = gracePeriod.StartedAt,
            ExpiresAt = gracePeriod.ExpiresAt,
            LimitFeatures = gracePeriod.LimitFeatures,
            RestrictedFeatures = gracePeriod.RestrictedFeatures,
            ShowGracePeriodWarnings = gracePeriod.ShowGracePeriodWarnings,
            CreatedAt = gracePeriod.CreatedAt
        };
    }
}