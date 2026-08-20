using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using Stripe;

namespace GeoLeap.Api.Services;

public interface ISubscriptionRecoveryService
{
    Task<bool> RecoverFailedSubscriptionAsync(Guid userId, string stripeSubscriptionId, string correlationId);
    Task<bool> RecoverFromPaymentFailureAsync(Guid userId, string correlationId);
    Task<bool> SyncSubscriptionStateAsync(Guid userId, string correlationId);
    Task<List<Guid>> FindInconsistentSubscriptionsAsync();
    Task<bool> ReconcileSubscriptionDataAsync(Guid userId, string correlationId);
}

public class SubscriptionRecoveryService : ISubscriptionRecoveryService
{
    private readonly ApplicationDbContext _context;
    private readonly IPaymentService _paymentService;
    private readonly IRbacService _rbacService;
    private readonly IEmailService _emailService;
    private readonly ISubscriptionErrorHandlingService _errorHandling;
    private readonly ILogger<SubscriptionRecoveryService> _logger;

    public SubscriptionRecoveryService(
        ApplicationDbContext context,
        IPaymentService paymentService,
        IRbacService rbacService,
        IEmailService emailService,
        ISubscriptionErrorHandlingService errorHandling,
        ILogger<SubscriptionRecoveryService> logger)
    {
        _context = context;
        _paymentService = paymentService;
        _rbacService = rbacService;
        _emailService = emailService;
        _errorHandling = errorHandling;
        _logger = logger;
    }

    public async Task<bool> RecoverFailedSubscriptionAsync(Guid userId, string stripeSubscriptionId, string correlationId)
    {
        try
        {
            _logger.LogInformation("Starting subscription recovery for user {UserId}, stripe subscription {StripeSubscriptionId}",
                userId, stripeSubscriptionId);

            // Step 1: Get current state from Stripe
            var stripeSubscription = await _errorHandling.ExecuteWithRetryAsync(async () =>
            {
                var subscriptionService = new Stripe.SubscriptionService();
                return await subscriptionService.GetAsync(stripeSubscriptionId);
            }, "get_stripe_subscription", correlationId);

            if (stripeSubscription == null)
            {
                _logger.LogWarning("Stripe subscription {StripeSubscriptionId} not found during recovery", stripeSubscriptionId);
                return false;
            }

            // Step 2: Update local database to match Stripe state
            var localSubscription = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSubscriptionId);

            if (localSubscription == null)
            {
                _logger.LogWarning("Local subscription record not found for Stripe subscription {StripeSubscriptionId}", stripeSubscriptionId);
                return false;
            }

            // Update local subscription with Stripe data
            localSubscription.Status = stripeSubscription.Status;
            localSubscription.CurrentPeriodStart = stripeSubscription.CurrentPeriodStart;
            localSubscription.CurrentPeriodEnd = stripeSubscription.CurrentPeriodEnd;
            localSubscription.CanceledAt = stripeSubscription.CanceledAt;
            localSubscription.CancelAtPeriodEnd = stripeSubscription.CancelAtPeriodEnd;
            localSubscription.IsCanceled = stripeSubscription.CanceledAt.HasValue;
            localSubscription.UpdatedAt = DateTime.UtcNow;

            // Step 3: Update user subscription status
            await UpdateUserSubscriptionFromStripeAsync(userId, stripeSubscription);

            // Step 4: Sync RBAC permissions
            await _rbacService.SyncSubscriptionRoleAsync(userId);

            await _context.SaveChangesAsync();

            _logger.LogInformation("Successfully recovered subscription for user {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            await _errorHandling.LogSubscriptionFailureAsync("subscription_recovery", userId, ex, correlationId);
            return false;
        }
    }

    public async Task<bool> RecoverFromPaymentFailureAsync(Guid userId, string correlationId)
    {
        try
        {
            _logger.LogInformation("Starting payment failure recovery for user {UserId}", userId);

            // Get user's current subscription
            var userSubscription = await _context.UserSubscriptions
                .FirstOrDefaultAsync(us => us.UserId == userId && us.IsActive);

            if (userSubscription == null)
            {
                _logger.LogInformation("No active subscription found for user {UserId} during payment recovery", userId);
                return true; // Nothing to recover
            }

            // Check if subscription is still active in Stripe
            var stripeCustomer = await _context.StripeCustomers
                .FirstOrDefaultAsync(sc => sc.UserId == userId);

            if (stripeCustomer != null)
            {
                var activeStripeSubscription = await _errorHandling.ExecuteWithRetryAsync(async () =>
                {
                    var subscriptionService = new Stripe.SubscriptionService();
                    var subscriptions = await subscriptionService.ListAsync(new Stripe.SubscriptionListOptions
                    {
                        Customer = stripeCustomer.StripeCustomerId,
                        Status = "active"
                    });
                    return subscriptions.Data.FirstOrDefault();
                }, "check_active_stripe_subscription", correlationId);

                if (activeStripeSubscription == null)
                {
                    // No active Stripe subscription - downgrade to free
                    _logger.LogInformation("No active Stripe subscription found, downgrading user {UserId} to free tier", userId);
                    
                    userSubscription.Tier = SubscriptionTier.Free;
                    userSubscription.IsActive = false;
                    userSubscription.EndDate = DateTime.UtcNow;
                    userSubscription.AutoRenew = false;
                    userSubscription.LastUpdated = DateTime.UtcNow;

                    await _rbacService.SyncSubscriptionRoleAsync(userId);
                    await _context.SaveChangesAsync();

                    // Send notification email
                    await SendPaymentRecoveryEmailAsync(userId, "downgraded_to_free");
                }
                else
                {
                    // Stripe subscription is active - ensure local state matches
                    await UpdateUserSubscriptionFromStripeAsync(userId, activeStripeSubscription);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Synchronized subscription state for user {UserId} during payment recovery", userId);
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            await _errorHandling.LogSubscriptionFailureAsync("payment_recovery", userId, ex, correlationId);
            return false;
        }
    }

    public async Task<bool> SyncSubscriptionStateAsync(Guid userId, string correlationId)
    {
        try
        {
            _logger.LogInformation("Syncing subscription state for user {UserId}", userId);

            var stripeCustomer = await _context.StripeCustomers
                .FirstOrDefaultAsync(sc => sc.UserId == userId);

            if (stripeCustomer == null)
            {
                // Ensure user has free tier if no Stripe customer
                var userSubscription = await _context.UserSubscriptions
                    .FirstOrDefaultAsync(us => us.UserId == userId);

                if (userSubscription == null)
                {
                    userSubscription = new UserSubscription
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        Tier = SubscriptionTier.Free,
                        IsActive = false,
                        StartDate = DateTime.UtcNow,
                        LastUpdated = DateTime.UtcNow
                    };
                    _context.UserSubscriptions.Add(userSubscription);
                }
                else
                {
                    userSubscription.Tier = SubscriptionTier.Free;
                    userSubscription.IsActive = false;
                    userSubscription.LastUpdated = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                await _rbacService.SyncSubscriptionRoleAsync(userId);
                return true;
            }

            // Sync with Stripe data
            var stripeSubscriptions = await _errorHandling.ExecuteWithRetryAsync(async () =>
            {
                var subscriptionService = new Stripe.SubscriptionService();
                return await subscriptionService.ListAsync(new Stripe.SubscriptionListOptions
                {
                    Customer = stripeCustomer.StripeCustomerId,
                    Status = "all"
                });
            }, "list_stripe_subscriptions", correlationId);

            var activeSubscription = stripeSubscriptions.Data
                .Where(s => s.Status == "active" || s.Status == "trialing")
                .OrderByDescending(s => s.Created)
                .FirstOrDefault();

            if (activeSubscription != null)
            {
                await UpdateUserSubscriptionFromStripeAsync(userId, activeSubscription);
            }
            else
            {
                // No active subscription - ensure user is on free tier
                await EnsureFreeSubscriptionAsync(userId);
            }

            await _rbacService.SyncSubscriptionRoleAsync(userId);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Successfully synced subscription state for user {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            await _errorHandling.LogSubscriptionFailureAsync("subscription_sync", userId, ex, correlationId);
            return false;
        }
    }

    public async Task<List<Guid>> FindInconsistentSubscriptionsAsync()
    {
        try
        {
            var inconsistentUserIds = new List<Guid>();

            // Find users with mismatched subscription states
            var usersWithSubscriptions = await _context.UserSubscriptions
                .Where(us => us.IsActive)
                .Join(_context.Users, us => us.UserId, u => u.Id, (us, u) => new { us.UserId, us.Tier, us.IsActive })
                .ToListAsync();

            foreach (var userSub in usersWithSubscriptions)
            {
                try
                {
                    var stripeCustomer = await _context.StripeCustomers
                        .FirstOrDefaultAsync(sc => sc.UserId == userSub.UserId);

                    if (stripeCustomer != null)
                    {
                        // Check if Stripe has active subscription matching local state
                        var subscriptionService = new Stripe.SubscriptionService();
                        var stripeSubscriptions = await subscriptionService.ListAsync(new Stripe.SubscriptionListOptions
                        {
                            Customer = stripeCustomer.StripeCustomerId,
                            Status = "active"
                        });

                        var hasActiveStripeSubscription = stripeSubscriptions.Data.Any();
                        
                        if (userSub.IsActive && !hasActiveStripeSubscription)
                        {
                            inconsistentUserIds.Add(userSub.UserId);
                            _logger.LogWarning("Inconsistent subscription found: User {UserId} has active local subscription but no active Stripe subscription",
                                userSub.UserId);
                        }
                    }
                    else if (userSub.IsActive)
                    {
                        // User has active subscription but no Stripe customer - inconsistent
                        inconsistentUserIds.Add(userSub.UserId);
                        _logger.LogWarning("Inconsistent subscription found: User {UserId} has active subscription but no Stripe customer",
                            userSub.UserId);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error checking subscription consistency for user {UserId}", userSub.UserId);
                    // Continue checking other users
                }
            }

            _logger.LogInformation("Found {Count} users with inconsistent subscription states", inconsistentUserIds.Count);
            return inconsistentUserIds;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error finding inconsistent subscriptions");
            return new List<Guid>();
        }
    }

    public async Task<bool> ReconcileSubscriptionDataAsync(Guid userId, string correlationId)
    {
        try
        {
            _logger.LogInformation("Reconciling subscription data for user {UserId}", userId);

            // Force sync with Stripe to resolve any inconsistencies
            var syncResult = await SyncSubscriptionStateAsync(userId, correlationId);
            
            if (!syncResult)
            {
                _logger.LogError("Failed to sync subscription state during reconciliation for user {UserId}", userId);
                return false;
            }

            // Verify RBAC permissions are correct
            await _rbacService.SyncSubscriptionRoleAsync(userId);

            // Log successful reconciliation
            _logger.LogInformation("Successfully reconciled subscription data for user {UserId}", userId);
            
            // Send notification email about the reconciliation
            await SendSubscriptionReconciliationEmailAsync(userId);

            return true;
        }
        catch (Exception ex)
        {
            await _errorHandling.LogSubscriptionFailureAsync("subscription_reconciliation", userId, ex, correlationId);
            return false;
        }
    }

    private async Task UpdateUserSubscriptionFromStripeAsync(Guid userId, Stripe.Subscription stripeSubscription)
    {
        var userSubscription = await _context.UserSubscriptions
            .FirstOrDefaultAsync(us => us.UserId == userId);

        var tier = DetermineSubscriptionTier(stripeSubscription);

        if (userSubscription == null)
        {
            userSubscription = new UserSubscription
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Tier = tier,
                IsActive = stripeSubscription.Status == "active" || stripeSubscription.Status == "trialing",
                StartDate = stripeSubscription.CurrentPeriodStart,
                EndDate = stripeSubscription.Status == "canceled" ? stripeSubscription.CurrentPeriodEnd : null,
                AutoRenew = !stripeSubscription.CancelAtPeriodEnd,
                LastUpdated = DateTime.UtcNow
            };
            _context.UserSubscriptions.Add(userSubscription);
        }
        else
        {
            userSubscription.Tier = tier;
            userSubscription.IsActive = stripeSubscription.Status == "active" || stripeSubscription.Status == "trialing";
            userSubscription.EndDate = stripeSubscription.Status == "canceled" ? stripeSubscription.CurrentPeriodEnd : null;
            userSubscription.AutoRenew = !stripeSubscription.CancelAtPeriodEnd;
            userSubscription.LastUpdated = DateTime.UtcNow;
        }
    }

    private async Task EnsureFreeSubscriptionAsync(Guid userId)
    {
        var userSubscription = await _context.UserSubscriptions
            .FirstOrDefaultAsync(us => us.UserId == userId);

        if (userSubscription == null)
        {
            userSubscription = new UserSubscription
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Tier = SubscriptionTier.Free,
                IsActive = false,
                StartDate = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            };
            _context.UserSubscriptions.Add(userSubscription);
        }
        else
        {
            userSubscription.Tier = SubscriptionTier.Free;
            userSubscription.IsActive = false;
            userSubscription.EndDate = DateTime.UtcNow;
            userSubscription.AutoRenew = false;
            userSubscription.LastUpdated = DateTime.UtcNow;
        }
    }

    private static SubscriptionTier DetermineSubscriptionTier(Stripe.Subscription stripeSubscription)
    {
        // Extract plan type from Stripe subscription
        var planType = stripeSubscription.Items.Data.FirstOrDefault()?.Price.Metadata?.GetValueOrDefault("plan_type")
                      ?? "free";

        return planType.ToLowerInvariant() switch
        {
            "premium" => SubscriptionTier.Premium,
            "basic" => SubscriptionTier.Basic,
            _ => SubscriptionTier.Free
        };
    }

    private async Task SendPaymentRecoveryEmailAsync(Guid userId, string recoveryAction)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return;

            switch (recoveryAction)
            {
                case "downgraded_to_free":
                    await _emailService.SendSubscriptionDowngradedEmailAsync(
                        user.Email, user.FirstName, "premium", "free", 0m, "month");
                    break;
                case "payment_retry_scheduled":
                    await _emailService.SendPaymentFailedEmailAsync(
                        user.Email, user.FirstName, "premium", 1.99m, DateTime.UtcNow.AddDays(3).ToString("MMMM dd, yyyy"));
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send payment recovery email for user {UserId}", userId);
            // Don't propagate email errors
        }
    }

    private async Task SendSubscriptionReconciliationEmailAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return;

            // TODO: Implement reconciliation email template
            _logger.LogInformation("Subscription reconciliation email would be sent to user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send reconciliation email for user {UserId}", userId);
            // Don't propagate email errors
        }
    }
}