using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Stripe;
using System.Security.Cryptography;
using System.Text;

namespace GeoLeap.Api.Services;

public class PaymentRetryService : IPaymentRetryService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PaymentRetryService> _logger;
    private readonly IPaymentService _paymentService;
    private readonly IDunningService _dunningService;
    private readonly IGracePeriodService _gracePeriodService;
    private readonly PaymentIntentService _stripePaymentIntentService;
    private readonly Dictionary<string, object> _defaultRetryRules;

    public PaymentRetryService(
        ApplicationDbContext context,
        ILogger<PaymentRetryService> logger,
        IPaymentService paymentService,
        IDunningService dunningService,
        IGracePeriodService gracePeriodService)
    {
        _context = context;
        _logger = logger;
        _paymentService = paymentService;
        _dunningService = dunningService;
        _gracePeriodService = gracePeriodService;
        _stripePaymentIntentService = new PaymentIntentService();

        // Default retry rules based on Stripe decline codes
        _defaultRetryRules = new Dictionary<string, object>
        {
            ["card_declined"] = new { maxAttempts = 3, delays = new[] { 1, 6, 24 } }, // hours
            ["insufficient_funds"] = new { maxAttempts = 5, delays = new[] { 1, 6, 24, 72, 168 } }, // hours
            ["expired_card"] = new { maxAttempts = 1, delays = new[] { 0 } }, // Immediate, requires action
            ["incorrect_cvc"] = new { maxAttempts = 1, delays = new[] { 0 } }, // Requires action
            ["processing_error"] = new { maxAttempts = 4, delays = new[] { 0.5, 2, 8, 24 } }, // hours
            ["authentication_required"] = new { maxAttempts = 1, delays = new[] { 0 } }, // Requires action
            ["generic_decline"] = new { maxAttempts = 2, delays = new[] { 6, 24 } }, // hours
            ["issuer_not_available"] = new { maxAttempts = 3, delays = new[] { 2, 12, 48 } }, // hours
            ["lost_card"] = new { maxAttempts = 0, delays = new int[] { } }, // No retry
            ["stolen_card"] = new { maxAttempts = 0, delays = new int[] { } }, // No retry
            ["do_not_honor"] = new { maxAttempts = 1, delays = new[] { 24 } } // hours
        };
    }

    public async Task<FailedPaymentDto> CreateFailedPaymentAsync(Guid userId, Guid paymentTransactionId, string failureType, string stripeDeclineCode, string failureReason, string correlationId)
    {
        try
        {
            _logger.LogInformation("Creating failed payment record for user {UserId}, transaction {TransactionId}", 
                userId, paymentTransactionId);

            var paymentTransaction = await _context.PaymentTransactions
                .Include(pt => pt.User)
                .FirstOrDefaultAsync(pt => pt.Id == paymentTransactionId && pt.UserId == userId);

            if (paymentTransaction == null)
                throw new ArgumentException("Payment transaction not found");

            // Check if failed payment already exists
            var existingFailedPayment = await _context.FailedPayments
                .FirstOrDefaultAsync(fp => fp.PaymentTransactionId == paymentTransactionId);

            if (existingFailedPayment != null)
            {
                return MapToFailedPaymentDto(existingFailedPayment, paymentTransaction);
            }

            // Determine retry configuration
            var isRetriable = await IsRetriableFailureTypeAsync(failureType, stripeDeclineCode);
            var maxRetryAttempts = await GetMaxRetryAttemptsAsync(failureType, userId);
            var requiresAction = RequiresUserAction(stripeDeclineCode);

            var failedPayment = new FailedPayment
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                PaymentTransactionId = paymentTransactionId,
                SubscriptionId = GetSubscriptionIdFromTransaction(paymentTransaction),
                FailureType = failureType,
                StripeDeclineCode = stripeDeclineCode,
                FailureReason = failureReason,
                Amount = paymentTransaction.Amount,
                Currency = paymentTransaction.Currency,
                RecoveryStatus = "active",
                IsRetriable = isRetriable,
                RequiresAction = requiresAction,
                MaxRetryAttempts = maxRetryAttempts,
                CorrelationId = correlationId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Schedule first retry if retriable and doesn't require immediate action
            if (isRetriable && !requiresAction)
            {
                var nextRetryDelay = await CalculateNextRetryDelayAsync(failedPayment.Id);
                failedPayment.NextRetryAt = DateTime.UtcNow.Add(nextRetryDelay);
            }

            _context.FailedPayments.Add(failedPayment);
            await _context.SaveChangesAsync();

            // Start grace period if applicable
            await _gracePeriodService.StartGracePeriodAsync(failedPayment.Id, correlationId);

            // Trigger dunning campaign
            await _dunningService.TriggerDunningCampaignAsync(failedPayment.Id, correlationId);

            // Log analytics
            await LogRetryAnalyticsAsync("payment_failed", failedPayment.Id, false, correlationId, new Dictionary<string, object>
            {
                ["failure_type"] = failureType,
                ["stripe_decline_code"] = stripeDeclineCode,
                ["is_retriable"] = isRetriable,
                ["requires_action"] = requiresAction,
                ["amount"] = paymentTransaction.Amount,
                ["currency"] = paymentTransaction.Currency
            });

            _logger.LogInformation("Created failed payment record {FailedPaymentId} for user {UserId}",
                failedPayment.Id, userId);

            return MapToFailedPaymentDto(failedPayment, paymentTransaction);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating failed payment record for user {UserId}, transaction {TransactionId}",
                userId, paymentTransactionId);
            throw;
        }
    }

    public async Task<FailedPaymentDto?> GetFailedPaymentAsync(Guid failedPaymentId)
    {
        var failedPayment = await _context.FailedPayments
            .Include(fp => fp.PaymentTransaction)
            .Include(fp => fp.Subscription)
            .FirstOrDefaultAsync(fp => fp.Id == failedPaymentId);

        return failedPayment == null ? null : MapToFailedPaymentDto(failedPayment, failedPayment.PaymentTransaction);
    }

    public async Task<List<FailedPaymentDto>> GetUserFailedPaymentsAsync(Guid userId, bool activeOnly = true)
    {
        var query = _context.FailedPayments
            .Include(fp => fp.PaymentTransaction)
            .Include(fp => fp.Subscription)
            .Where(fp => fp.UserId == userId);

        if (activeOnly)
        {
            query = query.Where(fp => fp.RecoveryStatus == "active");
        }

        var failedPayments = await query
            .OrderByDescending(fp => fp.CreatedAt)
            .ToListAsync();

        return failedPayments.Select(fp => MapToFailedPaymentDto(fp, fp.PaymentTransaction)).ToList();
    }

    public async Task<bool> ShouldRetryPaymentAsync(Guid failedPaymentId)
    {
        var failedPayment = await _context.FailedPayments
            .FirstOrDefaultAsync(fp => fp.Id == failedPaymentId);

        if (failedPayment == null || !failedPayment.IsRetriable || failedPayment.RequiresAction)
            return false;

        if (failedPayment.RecoveryStatus != "active")
            return false;

        if (failedPayment.RetryCount >= failedPayment.MaxRetryAttempts)
            return false;

        return true;
    }

    public async Task<TimeSpan> CalculateNextRetryDelayAsync(Guid failedPaymentId)
    {
        var failedPayment = await _context.FailedPayments
            .FirstOrDefaultAsync(fp => fp.Id == failedPaymentId);

        if (failedPayment == null)
            throw new ArgumentException("Failed payment not found");

        var delaySchedule = await GetRetryDelayScheduleAsync(failedPayment.FailureType);
        
        // Get the delay for the next retry attempt
        var attemptIndex = Math.Min(failedPayment.RetryCount, delaySchedule.Count - 1);
        var lastDelay = delaySchedule.LastOrDefault();
        var baseDelay = attemptIndex < delaySchedule.Count ? delaySchedule[attemptIndex] : (lastDelay != default ? lastDelay : TimeSpan.FromHours(24));

        // Add jitter (±25%) to avoid thundering herd
        var jitterFactor = (Random.Shared.NextDouble() - 0.5) * 0.5; // -25% to +25%
        var delayWithJitter = baseDelay.Add(TimeSpan.FromMilliseconds(baseDelay.TotalMilliseconds * jitterFactor));

        // Ensure minimum delay of 30 minutes for failed payments
        return TimeSpan.FromMinutes(Math.Max(30, delayWithJitter.TotalMinutes));
    }

    public async Task<PaymentRetryAttempt> SchedulePaymentRetryAsync(Guid failedPaymentId, string attemptType, string correlationId)
    {
        try
        {
            var failedPayment = await _context.FailedPayments
                .Include(fp => fp.PaymentRetryAttempts)
                .FirstOrDefaultAsync(fp => fp.Id == failedPaymentId);

            if (failedPayment == null)
                throw new ArgumentException("Failed payment not found");

            if (!await ShouldRetryPaymentAsync(failedPaymentId))
                throw new InvalidOperationException("Payment retry not allowed");

            var nextDelay = await CalculateNextRetryDelayAsync(failedPaymentId);
            var delayFromPrevious = failedPayment.LastRetryAt.HasValue 
                ? nextDelay 
                : TimeSpan.FromMinutes(30); // Default initial delay

            var retryAttempt = new PaymentRetryAttempt
            {
                Id = Guid.NewGuid(),
                FailedPaymentId = failedPaymentId,
                PaymentTransactionId = failedPayment.PaymentTransactionId,
                AttemptType = attemptType,
                Status = "pending",
                AttemptNumber = failedPayment.RetryCount + 1,
                DelayFromPrevious = delayFromPrevious,
                CorrelationId = correlationId,
                CreatedAt = DateTime.UtcNow
            };

            _context.PaymentRetryAttempts.Add(retryAttempt);

            // Update failed payment
            failedPayment.NextRetryAt = DateTime.UtcNow.Add(nextDelay);
            failedPayment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Scheduled payment retry attempt {AttemptNumber} for failed payment {FailedPaymentId}",
                retryAttempt.AttemptNumber, failedPaymentId);

            return retryAttempt;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scheduling payment retry for failed payment {FailedPaymentId}", failedPaymentId);
            throw;
        }
    }

    public async Task ProcessScheduledPaymentRetriesAsync()
    {
        try
        {
            _logger.LogInformation("Processing scheduled payment retries");

            var dueRetries = await _context.FailedPayments
                .Where(fp => fp.RecoveryStatus == "active" 
                          && fp.IsRetriable 
                          && !fp.RequiresAction
                          && fp.NextRetryAt <= DateTime.UtcNow
                          && fp.RetryCount < fp.MaxRetryAttempts)
                .ToListAsync();

            var processedCount = 0;
            var successCount = 0;

            foreach (var failedPayment in dueRetries)
            {
                try
                {
                    var correlationId = $"retry-processor-{Guid.NewGuid()}";
                    var attempt = await ExecutePaymentRetryAsync(failedPayment.Id, correlationId);
                    
                    processedCount++;
                    if (attempt.Status == "succeeded")
                        successCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing retry for failed payment {FailedPaymentId}", 
                        failedPayment.Id);
                }
            }

            _logger.LogInformation("Processed {ProcessedCount} payment retries, {SuccessCount} successful",
                processedCount, successCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ProcessScheduledPaymentRetriesAsync");
            throw;
        }
    }

    public async Task<PaymentRetryAttempt> ExecutePaymentRetryAsync(Guid failedPaymentId, string correlationId, bool isManual = false)
    {
        try
        {
            var failedPayment = await _context.FailedPayments
                .Include(fp => fp.PaymentTransaction)
                .Include(fp => fp.User)
                .FirstOrDefaultAsync(fp => fp.Id == failedPaymentId);

            if (failedPayment == null)
                throw new ArgumentException("Failed payment not found");

            _logger.LogInformation("Executing payment retry for failed payment {FailedPaymentId}, attempt {AttemptNumber}",
                failedPaymentId, failedPayment.RetryCount + 1);

            var attemptType = isManual ? "manual" : "automatic";
            var retryAttempt = new PaymentRetryAttempt
            {
                Id = Guid.NewGuid(),
                FailedPaymentId = failedPaymentId,
                PaymentTransactionId = failedPayment.PaymentTransactionId,
                AttemptType = attemptType,
                Status = "pending",
                AttemptNumber = failedPayment.RetryCount + 1,
                DelayFromPrevious = failedPayment.LastRetryAt.HasValue 
                    ? DateTime.UtcNow - failedPayment.LastRetryAt.Value 
                    : DateTime.UtcNow - failedPayment.CreatedAt,
                CorrelationId = correlationId,
                CreatedAt = DateTime.UtcNow,
                AttemptedAt = DateTime.UtcNow
            };

            _context.PaymentRetryAttempts.Add(retryAttempt);

            try
            {
                // Attempt to retry the payment with Stripe
                var paymentIntent = await _stripePaymentIntentService.GetAsync(
                    failedPayment.PaymentTransaction.StripePaymentIntentId);

                if (paymentIntent.Status == "succeeded")
                {
                    // Payment already succeeded (webhook might have processed it)
                    retryAttempt.Status = "succeeded";
                    await ResolveFailedPaymentAsync(failedPayment, "payment_succeeded", correlationId);
                }
                else if (paymentIntent.Status == "requires_payment_method" || paymentIntent.Status == "requires_action")
                {
                    // Requires user action
                    retryAttempt.Status = "skipped";
                    retryAttempt.FailureReason = "Requires user action";
                    failedPayment.RequiresAction = true;
                }
                else
                {
                    // Try to confirm the payment intent
                    try
                    {
                        var confirmedIntent = await _stripePaymentIntentService.ConfirmAsync(
                            paymentIntent.Id,
                            new PaymentIntentConfirmOptions());

                        if (confirmedIntent.Status == "succeeded")
                        {
                            retryAttempt.Status = "succeeded";
                            await ResolveFailedPaymentAsync(failedPayment, "payment_succeeded", correlationId);
                        }
                        else
                        {
                            retryAttempt.Status = "failed";
                            retryAttempt.FailureReason = confirmedIntent.LastPaymentError?.Message ?? "Payment retry failed";
                            retryAttempt.StripeDeclineCode = confirmedIntent.LastPaymentError?.DeclineCode ?? "";
                        }
                    }
                    catch (StripeException stripeEx)
                    {
                        retryAttempt.Status = "failed";
                        retryAttempt.FailureReason = stripeEx.Message;
                        retryAttempt.StripeDeclineCode = stripeEx.StripeError?.DeclineCode ?? "";
                    }
                }
            }
            catch (Exception retryEx)
            {
                _logger.LogError(retryEx, "Stripe retry failed for payment {PaymentIntentId}", 
                    failedPayment.PaymentTransaction.StripePaymentIntentId);
                
                retryAttempt.Status = "failed";
                retryAttempt.FailureReason = retryEx.Message;
            }

            retryAttempt.CompletedAt = DateTime.UtcNow;

            // Update failed payment
            failedPayment.RetryCount++;
            failedPayment.LastRetryAt = DateTime.UtcNow;

            if (retryAttempt.Status != "succeeded")
            {
                // Schedule next retry if applicable
                if (await ShouldRetryPaymentAsync(failedPaymentId))
                {
                    var nextDelay = await CalculateNextRetryDelayAsync(failedPaymentId);
                    failedPayment.NextRetryAt = DateTime.UtcNow.Add(nextDelay);
                }
                else
                {
                    failedPayment.NextRetryAt = null;
                    // Mark as abandoned if max retries reached and no user action required
                    if (!failedPayment.RequiresAction && failedPayment.RetryCount >= failedPayment.MaxRetryAttempts)
                    {
                        failedPayment.RecoveryStatus = "abandoned";
                    }
                }
            }

            failedPayment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Log analytics
            await LogRetryAnalyticsAsync("retry_attempted", failedPayment.Id, retryAttempt.Status == "succeeded", correlationId, new Dictionary<string, object>
            {
                ["attempt_number"] = retryAttempt.AttemptNumber,
                ["attempt_type"] = attemptType,
                ["result_status"] = retryAttempt.Status,
                ["failure_reason"] = retryAttempt.FailureReason,
                ["stripe_decline_code"] = retryAttempt.StripeDeclineCode
            });

            _logger.LogInformation("Completed payment retry attempt {AttemptId} with status {Status}",
                retryAttempt.Id, retryAttempt.Status);

            return retryAttempt;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing payment retry for failed payment {FailedPaymentId}", failedPaymentId);
            throw;
        }
    }

    public async Task<int> GetMaxRetryAttemptsAsync(string failureType, Guid? userId = null)
    {
        // Check for custom configuration
        var configKey = $"retry_max_attempts_{failureType}";
        var configValue = await GetDunningConfigurationAsync(configKey);

        if (configValue != null && int.TryParse(configValue, out var customMax))
            return customMax;

        // Check user-specific overrides for high-value customers
        if (userId.HasValue)
        {
            var userOverride = await GetUserSpecificRetryLimitAsync(userId.Value, failureType);
            if (userOverride.HasValue)
                return userOverride.Value;
        }

        // Return default from rules
        if (_defaultRetryRules.ContainsKey(failureType))
        {
            dynamic rule = _defaultRetryRules[failureType];
            return rule.maxAttempts;
        }

        return 2; // Default fallback
    }

    public async Task<List<TimeSpan>> GetRetryDelayScheduleAsync(string failureType)
    {
        // Check for custom configuration
        var configKey = $"retry_delay_schedule_{failureType}";
        var configValue = await GetDunningConfigurationAsync(configKey);

        if (configValue != null)
        {
            try
            {
                var delays = System.Text.Json.JsonSerializer.Deserialize<int[]>(configValue);
                return delays?.Select(hours => TimeSpan.FromHours(hours)).ToList() ?? GetDefaultDelaySchedule(failureType);
            }
            catch (System.Text.Json.JsonException)
            {
                _logger.LogWarning("Invalid retry delay schedule configuration for failure type {FailureType}", failureType);
            }
        }

        return GetDefaultDelaySchedule(failureType);
    }

    public async Task<bool> IsRetriableFailureTypeAsync(string failureType, string stripeDeclineCode)
    {
        // Non-retriable decline codes
        var nonRetriableDeclineCodes = new HashSet<string>
        {
            "lost_card", "stolen_card", "fraudulent", "pickup_card", "restricted_card",
            "security_violation", "service_not_allowed", "transaction_not_allowed",
            "currency_not_supported", "duplicate_transaction", "invalid_account",
            "new_account_information_available", "try_again_later", "stop_payment_order"
        };

        if (nonRetriableDeclineCodes.Contains(stripeDeclineCode))
            return false;

        // Check configuration override
        var configKey = $"is_retriable_{failureType}";
        var configValue = await GetDunningConfigurationAsync(configKey);

        if (configValue != null && bool.TryParse(configValue, out var customRetriable))
            return customRetriable;

        // Check default rules
        if (_defaultRetryRules.ContainsKey(failureType))
        {
            dynamic rule = _defaultRetryRules[failureType];
            return rule.maxAttempts > 0;
        }

        return true; // Default to retriable
    }

    public async Task<PaymentRecoverySessionDto> CreateRecoverySessionAsync(Guid failedPaymentId, string correlationId)
    {
        try
        {
            var failedPayment = await _context.FailedPayments
                .Include(fp => fp.PaymentTransaction)
                .Include(fp => fp.User)
                .FirstOrDefaultAsync(fp => fp.Id == failedPaymentId);

            if (failedPayment == null)
                throw new ArgumentException("Failed payment not found");

            // Generate secure session token
            var sessionToken = GenerateSecureToken();
            var recoveryUrl = $"/payment/recovery/{sessionToken}";

            var recoverySession = new PaymentRecoverySession
            {
                Id = Guid.NewGuid(),
                UserId = failedPayment.UserId,
                FailedPaymentId = failedPaymentId,
                SessionToken = sessionToken,
                Status = "active",
                RecoveryUrl = recoveryUrl,
                ExpiresAt = DateTime.UtcNow.AddDays(7), // 7-day expiration
                CorrelationId = correlationId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.PaymentRecoverySessions.Add(recoverySession);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created payment recovery session {SessionId} for failed payment {FailedPaymentId}",
                recoverySession.Id, failedPaymentId);

            return new PaymentRecoverySessionDto
            {
                Id = recoverySession.Id,
                Status = recoverySession.Status,
                RecoveryUrl = recoverySession.RecoveryUrl,
                ExpiresAt = recoverySession.ExpiresAt,
                FailedPayment = MapToFailedPaymentDto(failedPayment, failedPayment.PaymentTransaction)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating payment recovery session for failed payment {FailedPaymentId}", failedPaymentId);
            throw;
        }
    }

    public async Task<PaymentRecoverySessionDto?> GetRecoverySessionAsync(string sessionToken)
    {
        var session = await _context.PaymentRecoverySessions
            .Include(prs => prs.FailedPayment)
                .ThenInclude(fp => fp.PaymentTransaction)
            .Include(prs => prs.User)
            .FirstOrDefaultAsync(prs => prs.SessionToken == sessionToken && prs.Status == "active");

        if (session == null || session.ExpiresAt <= DateTime.UtcNow)
            return null;

        // Update last accessed
        session.LastAccessedAt = DateTime.UtcNow;
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new PaymentRecoverySessionDto
        {
            Id = session.Id,
            Status = session.Status,
            RecoveryUrl = session.RecoveryUrl,
            ExpiresAt = session.ExpiresAt,
            FailedPayment = MapToFailedPaymentDto(session.FailedPayment, session.FailedPayment.PaymentTransaction)
        };
    }

    public async Task<FailedPaymentDto> UpdateFailedPaymentStatusAsync(Guid failedPaymentId, string newStatus, string correlationId)
    {
        var failedPayment = await _context.FailedPayments
            .Include(fp => fp.PaymentTransaction)
            .FirstOrDefaultAsync(fp => fp.Id == failedPaymentId);

        if (failedPayment == null)
            throw new ArgumentException("Failed payment not found");

        var oldStatus = failedPayment.RecoveryStatus;
        failedPayment.RecoveryStatus = newStatus;
        failedPayment.UpdatedAt = DateTime.UtcNow;

        if (newStatus == "resolved")
        {
            failedPayment.ResolvedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        await LogRetryAnalyticsAsync("status_changed", failedPaymentId, newStatus == "resolved", correlationId, new Dictionary<string, object>
        {
            ["old_status"] = oldStatus,
            ["new_status"] = newStatus
        });

        _logger.LogInformation("Updated failed payment {FailedPaymentId} status from {OldStatus} to {NewStatus}",
            failedPaymentId, oldStatus, newStatus);

        return MapToFailedPaymentDto(failedPayment, failedPayment.PaymentTransaction);
    }

    public async Task<PaymentRetryAttempt> ManuallyRetryPaymentAsync(Guid failedPaymentId, string reason, string performedBy, string correlationId)
    {
        try
        {
            _logger.LogInformation("Manual payment retry initiated by {PerformedBy} for failed payment {FailedPaymentId}",
                performedBy, failedPaymentId);

            var retryAttempt = await ExecutePaymentRetryAsync(failedPaymentId, correlationId, isManual: true);

            retryAttempt.Metadata["manual_retry_reason"] = reason;
            retryAttempt.Metadata["performed_by"] = performedBy;
            retryAttempt.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return retryAttempt;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in manual payment retry for failed payment {FailedPaymentId}", failedPaymentId);
            throw;
        }
    }

    public async Task<List<FailedPaymentDto>> GetFailedPaymentsRequiringActionAsync(int daysOld = 1)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-daysOld);
        
        var failedPayments = await _context.FailedPayments
            .Include(fp => fp.PaymentTransaction)
            .Include(fp => fp.Subscription)
            .Where(fp => fp.RecoveryStatus == "active" 
                      && (fp.RequiresAction || fp.RetryCount >= fp.MaxRetryAttempts)
                      && fp.CreatedAt <= cutoffDate)
            .OrderByDescending(fp => fp.CreatedAt)
            .ToListAsync();

        return failedPayments.Select(fp => MapToFailedPaymentDto(fp, fp.PaymentTransaction)).ToList();
    }

    public async Task LogRetryAnalyticsAsync(string eventType, Guid failedPaymentId, bool wasSuccessful, string correlationId, Dictionary<string, object>? metadata = null)
    {
        try
        {
            var failedPayment = await _context.FailedPayments
                .FirstOrDefaultAsync(fp => fp.Id == failedPaymentId);

            if (failedPayment == null) return;

            var analytics = new DunningAnalytics
            {
                Id = Guid.NewGuid(),
                UserId = failedPayment.UserId,
                EventType = eventType,
                FailureType = failedPayment.FailureType,
                Amount = failedPayment.Amount,
                Currency = failedPayment.Currency,
                WasSuccessful = wasSuccessful,
                DaysSinceFailure = (int)(DateTime.UtcNow - failedPayment.CreatedAt).TotalDays,
                RecoveryAttempt = failedPayment.RetryCount,
                CorrelationId = correlationId,
                AnalyticsMetadata = metadata ?? new Dictionary<string, object>(),
                Timestamp = DateTime.UtcNow
            };

            _context.DunningAnalytics.Add(analytics);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging retry analytics for event {EventType}", eventType);
        }
    }

    public async Task<Dictionary<string, object>> GetRetryAnalyticsAsync(DateTime startDate, DateTime endDate)
    {
        var analytics = await _context.DunningAnalytics
            .Where(da => da.Timestamp >= startDate && da.Timestamp <= endDate)
            .GroupBy(da => da.EventType)
            .Select(g => new
            {
                EventType = g.Key,
                TotalEvents = g.Count(),
                SuccessfulEvents = g.Count(da => da.WasSuccessful),
                AverageAmount = g.Where(da => da.Amount.HasValue).Average(da => da.Amount),
                UniqueUsers = g.Select(da => da.UserId).Distinct().Count()
            })
            .ToListAsync();

        var result = new Dictionary<string, object>
        {
            ["period_start"] = startDate,
            ["period_end"] = endDate,
            ["summary"] = analytics.ToDictionary(a => a.EventType, a => new
            {
                total_events = a.TotalEvents,
                successful_events = a.SuccessfulEvents,
                success_rate = a.TotalEvents > 0 ? (double)a.SuccessfulEvents / a.TotalEvents : 0,
                average_amount = a.AverageAmount,
                unique_users = a.UniqueUsers
            })
        };

        return result;
    }

    // Private helper methods
    private static bool RequiresUserAction(string stripeDeclineCode)
    {
        var actionRequiredCodes = new HashSet<string>
        {
            "expired_card", "incorrect_cvc", "incorrect_zip", "authentication_required",
            "card_not_supported", "currency_not_supported", "incorrect_number",
            "invalid_cvc", "invalid_expiry_month", "invalid_expiry_year"
        };

        return actionRequiredCodes.Contains(stripeDeclineCode);
    }

    private static Guid? GetSubscriptionIdFromTransaction(PaymentTransaction transaction)
    {
        if (string.IsNullOrEmpty(transaction.StripeSubscriptionId))
            return null;

        // This would need to be implemented based on how subscription IDs are stored
        return null; // Placeholder
    }

    private List<TimeSpan> GetDefaultDelaySchedule(string failureType)
    {
        if (_defaultRetryRules.ContainsKey(failureType))
        {
            dynamic rule = _defaultRetryRules[failureType];
            var delays = (int[])rule.delays;
            return delays.Select(hours => TimeSpan.FromHours(hours)).ToList();
        }

        // Default schedule: 1 hour, 6 hours, 24 hours
        return new List<TimeSpan> { TimeSpan.FromHours(1), TimeSpan.FromHours(6), TimeSpan.FromHours(24) };
    }

    private async Task<string?> GetDunningConfigurationAsync(string key)
    {
        var config = await _context.DunningConfigurations
            .FirstOrDefaultAsync(dc => dc.Key == key && dc.IsActive);

        return config?.Value;
    }

    private async Task<int?> GetUserSpecificRetryLimitAsync(Guid userId, string failureType)
    {
        // Check if user is high-value or has special treatment
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return null;

        // Example: Premium users get more retry attempts
        // This would be based on subscription tier or user flags
        return null; // Placeholder for now
    }

    private async Task ResolveFailedPaymentAsync(FailedPayment failedPayment, string resolutionType, string correlationId)
    {
        failedPayment.RecoveryStatus = "resolved";
        failedPayment.ResolvedAt = DateTime.UtcNow;
        failedPayment.UpdatedAt = DateTime.UtcNow;

        // End grace period
        await _gracePeriodService.EndGracePeriodAsync(failedPayment.Id, resolutionType, correlationId);

        // Stop dunning campaigns
        await _dunningService.StopDunningCampaignAsync(failedPayment.Id, resolutionType, correlationId);

        await LogRetryAnalyticsAsync("recovery_completed", failedPayment.Id, true, correlationId, new Dictionary<string, object>
        {
            ["resolution_type"] = resolutionType,
            ["days_to_resolution"] = (DateTime.UtcNow - failedPayment.CreatedAt).TotalDays,
            ["total_retry_attempts"] = failedPayment.RetryCount
        });
    }

    private static string GenerateSecureToken()
    {
        using var rng = RandomNumberGenerator.Create();
        var tokenBytes = new byte[32];
        rng.GetBytes(tokenBytes);
        return Convert.ToBase64String(tokenBytes).Replace("/", "_").Replace("+", "-");
    }

    private static FailedPaymentDto MapToFailedPaymentDto(FailedPayment failedPayment, PaymentTransaction paymentTransaction)
    {
        return new FailedPaymentDto
        {
            Id = failedPayment.Id,
            UserId = failedPayment.UserId,
            FailureType = failedPayment.FailureType,
            FailureReason = failedPayment.FailureReason,
            Amount = failedPayment.Amount,
            Currency = failedPayment.Currency,
            RecoveryStatus = failedPayment.RecoveryStatus,
            RetryCount = failedPayment.RetryCount,
            NextRetryAt = failedPayment.NextRetryAt,
            IsRetriable = failedPayment.IsRetriable,
            RequiresAction = failedPayment.RequiresAction,
            CreatedAt = failedPayment.CreatedAt,
            PaymentTransaction = new PaymentTransactionDto
            {
                Id = paymentTransaction.Id,
                Status = paymentTransaction.Status,
                Amount = paymentTransaction.Amount,
                Currency = paymentTransaction.Currency,
                Description = paymentTransaction.Description,
                CreatedAt = paymentTransaction.CreatedAt,
                ProcessedAt = paymentTransaction.ProcessedAt,
                FailureReason = paymentTransaction.FailureReason
            }
        };
    }

    public async Task<Dictionary<string, object>> GetFailurePatternAnalysisAsync(DateTime startDate, DateTime endDate)
    {
        var patterns = await _context.DunningAnalytics
            .Where(da => da.Timestamp >= startDate && da.Timestamp <= endDate && da.EventType == "payment_failed")
            .GroupBy(da => da.FailureType)
            .Select(g => new
            {
                FailureType = g.Key,
                TotalFailures = g.Count(),
                TotalAmount = g.Sum(da => da.Amount ?? 0),
                AverageAmount = g.Average(da => da.Amount ?? 0),
                RecoveredCount = g.Count(da => da.WasSuccessful),
                UniqueUsers = g.Select(da => da.UserId).Distinct().Count()
            })
            .ToListAsync();

        return new Dictionary<string, object>
        {
            ["analysis_period"] = new { start = startDate, end = endDate },
            ["failure_patterns"] = patterns.ToDictionary(p => p.FailureType, p => new
            {
                total_failures = p.TotalFailures,
                total_amount = p.TotalAmount,
                average_amount = p.AverageAmount,
                recovery_rate = p.TotalFailures > 0 ? (double)p.RecoveredCount / p.TotalFailures : 0,
                unique_users_affected = p.UniqueUsers
            })
        };
    }

    public async Task UpdateRetryRulesAsync(string failureType, int maxAttempts, List<TimeSpan> delaySchedule, string updatedBy)
    {
        // Update max attempts configuration
        await UpsertDunningConfigurationAsync($"retry_max_attempts_{failureType}", maxAttempts.ToString(), "retry_rules", updatedBy);
        
        // Update delay schedule configuration
        var delayHours = delaySchedule.Select(ts => (int)ts.TotalHours).ToArray();
        var delayJson = System.Text.Json.JsonSerializer.Serialize(delayHours);
        await UpsertDunningConfigurationAsync($"retry_delay_schedule_{failureType}", delayJson, "retry_rules", updatedBy);

        _logger.LogInformation("Updated retry rules for failure type {FailureType}: {MaxAttempts} attempts, delays: {DelaySchedule}",
            failureType, maxAttempts, string.Join(", ", delayHours.Select(h => $"{h}h")));
    }

    public async Task<PaymentRecoverySessionDto> CompleteRecoverySessionAsync(string sessionToken, string completionType, string correlationId)
    {
        var session = await _context.PaymentRecoverySessions
            .Include(prs => prs.FailedPayment)
                .ThenInclude(fp => fp.PaymentTransaction)
            .FirstOrDefaultAsync(prs => prs.SessionToken == sessionToken);

        if (session == null)
            throw new ArgumentException("Recovery session not found");

        session.Status = "completed";
        session.CompletionType = completionType;
        session.CompletedAt = DateTime.UtcNow;
        session.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new PaymentRecoverySessionDto
        {
            Id = session.Id,
            Status = session.Status,
            RecoveryUrl = session.RecoveryUrl,
            ExpiresAt = session.ExpiresAt,
            FailedPayment = MapToFailedPaymentDto(session.FailedPayment, session.FailedPayment.PaymentTransaction)
        };
    }

    public async Task CleanupExpiredRecoverySessionsAsync()
    {
        var expiredSessions = await _context.PaymentRecoverySessions
            .Where(prs => prs.Status == "active" && prs.ExpiresAt <= DateTime.UtcNow)
            .ToListAsync();

        foreach (var session in expiredSessions)
        {
            session.Status = "expired";
            session.UpdatedAt = DateTime.UtcNow;
        }

        if (expiredSessions.Any())
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Cleaned up {Count} expired payment recovery sessions", expiredSessions.Count);
        }
    }

    public async Task<FailedPaymentDto> ForceResolveFailedPaymentAsync(Guid failedPaymentId, string reason, string performedBy, string correlationId)
    {
        var failedPayment = await _context.FailedPayments
            .Include(fp => fp.PaymentTransaction)
            .FirstOrDefaultAsync(fp => fp.Id == failedPaymentId);

        if (failedPayment == null)
            throw new ArgumentException("Failed payment not found");

        await ResolveFailedPaymentAsync(failedPayment, "manual_resolution", correlationId);

        failedPayment.Metadata["forced_resolution_reason"] = reason;
        failedPayment.Metadata["resolved_by"] = performedBy;
        failedPayment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Force resolved failed payment {FailedPaymentId} by {PerformedBy}: {Reason}",
            failedPaymentId, performedBy, reason);

        return MapToFailedPaymentDto(failedPayment, failedPayment.PaymentTransaction);
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
}