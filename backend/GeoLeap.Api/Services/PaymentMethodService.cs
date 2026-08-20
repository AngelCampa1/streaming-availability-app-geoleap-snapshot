using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Exceptions;
using Stripe;
using Polly;
using System.Net;

namespace GeoLeap.Api.Services;

public class PaymentMethodService : IPaymentMethodService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PaymentMethodService> _logger;
    private readonly IAsyncPolicy _retryPolicy;
    private readonly IRbacService _rbacService;
    private readonly IEmailService _emailService;
    private readonly Stripe.PaymentMethodService _stripePaymentMethodService;
    private readonly CustomerService _customerService;

    public PaymentMethodService(
        ApplicationDbContext context,
        ILogger<PaymentMethodService> logger,
        IRbacService rbacService,
        IEmailService emailService,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _rbacService = rbacService;
        _emailService = emailService;

        // Initialize Stripe
        var stripeSecretKey = configuration["Stripe:SecretKey"];
        if (string.IsNullOrEmpty(stripeSecretKey))
        {
            // In testing environments, use a default test key
            var environment = configuration["ASPNETCORE_ENVIRONMENT"] ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            if (environment == "Development" || environment == "Test" || environment == "Testing")
            {
                stripeSecretKey = "sk_test_fake_key_for_testing";
                logger.LogWarning("Using fake Stripe key for testing environment");
            }
            else
            {
                throw new InvalidOperationException("Stripe secret key not configured");
            }
        }

        StripeConfiguration.ApiKey = stripeSecretKey;
        _stripePaymentMethodService = new Stripe.PaymentMethodService();
        _customerService = new CustomerService();

        // Configure retry policy
        _retryPolicy = Policy
            .Handle<StripeException>(ex => IsRetriableStripeError(ex))
            .Or<HttpRequestException>()
            .Or<TaskCanceledException>()
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                onRetry: (exception, timespan, retryCount, context) =>
                {
                    _logger.LogWarning("Payment method operation retry {RetryCount} after {Delay}ms: {Exception}",
                        retryCount, timespan.TotalMilliseconds, exception.Message);
                });
    }

    public async Task<PaymentMethodDto> AddPaymentMethodAsync(Guid userId, PaymentMethodRequest request, string correlationId)
    {
        try
        {
            _logger.LogInformation("Adding payment method for user {UserId} with correlation {CorrelationId}", 
                userId, correlationId);

            // Validate user exists and has permission
            if (!await _rbacService.HasPermissionAsync(userId, "payment_method:create"))
                throw new UnauthorizedError("User does not have permission to add payment methods");

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                throw new NotFoundError("User not found");

            // Get or create Stripe customer
            var stripeCustomerId = await GetOrCreateStripeCustomerAsync(userId, correlationId);
            
            // Validate and retrieve payment method from Stripe
            var stripePaymentMethod = await _retryPolicy.ExecuteAsync(async () =>
                await _stripePaymentMethodService.GetAsync(request.StripePaymentMethodId));

            // Attach payment method to customer if not already attached
            if (stripePaymentMethod.CustomerId != stripeCustomerId)
            {
                await _retryPolicy.ExecuteAsync(async () =>
                    await _stripePaymentMethodService.AttachAsync(request.StripePaymentMethodId, 
                        new PaymentMethodAttachOptions { Customer = stripeCustomerId }));
            }

            // Check if this payment method already exists for the user
            var existingPaymentMethod = await _context.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.UserId == userId && pm.StripePaymentMethodId == request.StripePaymentMethodId);

            if (existingPaymentMethod != null)
                throw new ConflictError("Payment method already exists for this user");

            // If setting as default, unset other defaults
            if (request.SetAsDefault)
            {
                await UnsetDefaultPaymentMethodsAsync(userId);
            }

            // Create payment method record
            var paymentMethod = new GeoLeap.Api.Models.PaymentMethod
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                StripePaymentMethodId = request.StripePaymentMethodId,
                Type = stripePaymentMethod.Type,
                Nickname = request.Nickname,
                IsDefault = request.SetAsDefault,
                Country = stripePaymentMethod.Card?.Country ?? string.Empty,
                Last4 = stripePaymentMethod.Card?.Last4 ?? string.Empty,
                Brand = stripePaymentMethod.Card?.Brand ?? string.Empty,
                ExpiryMonth = (int?)stripePaymentMethod.Card?.ExpMonth,
                ExpiryYear = (int?)stripePaymentMethod.Card?.ExpYear,
                Fingerprint = stripePaymentMethod.Card?.Fingerprint ?? string.Empty,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.PaymentMethods.Add(paymentMethod);
            await _context.SaveChangesAsync();

            // Log activity
            await LogPaymentMethodActivityAsync(userId, paymentMethod.Id, "payment_method_added", correlationId);

            // Send notification
            await SendPaymentMethodAddedNotificationAsync(userId, paymentMethod.Id, correlationId);

            _logger.LogInformation("Payment method {PaymentMethodId} added successfully for user {UserId}", 
                paymentMethod.Id, userId);

            return MapToDto(paymentMethod);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add payment method for user {UserId} with correlation {CorrelationId}", 
                userId, correlationId);
            throw;
        }
    }

    public async Task<PaymentMethodDto> UpdatePaymentMethodAsync(Guid userId, Guid paymentMethodId, UpdatePaymentMethodRequest request, string correlationId)
    {
        try
        {
            _logger.LogInformation("Updating payment method {PaymentMethodId} for user {UserId}", 
                paymentMethodId, userId);

            if (!await _rbacService.HasPermissionAsync(userId, "payment_method:update"))
                throw new UnauthorizedError("User does not have permission to update payment methods");

            var paymentMethod = await _context.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.Id == paymentMethodId && pm.UserId == userId && pm.IsActive);

            if (paymentMethod == null)
                throw new NotFoundError("Payment method not found or not accessible");

            // Update nickname if provided
            if (!string.IsNullOrWhiteSpace(request.Nickname))
            {
                paymentMethod.Nickname = request.Nickname;
            }

            // Update default status if provided
            if (request.SetAsDefault.HasValue)
            {
                if (request.SetAsDefault.Value)
                {
                    await UnsetDefaultPaymentMethodsAsync(userId);
                    paymentMethod.IsDefault = true;
                }
                else
                {
                    paymentMethod.IsDefault = false;
                }
            }

            // Update expiry if provided (for display purposes, actual Stripe data is authoritative)
            if (request.ExpiryMonth.HasValue)
                paymentMethod.ExpiryMonth = request.ExpiryMonth.Value;
            
            if (request.ExpiryYear.HasValue)
                paymentMethod.ExpiryYear = request.ExpiryYear.Value;

            paymentMethod.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Log activity
            await LogPaymentMethodActivityAsync(userId, paymentMethodId, "payment_method_updated", correlationId);

            // Send notification
            await SendPaymentMethodUpdatedNotificationAsync(userId, paymentMethodId, correlationId);

            _logger.LogInformation("Payment method {PaymentMethodId} updated successfully for user {UserId}", 
                paymentMethodId, userId);

            return MapToDto(paymentMethod);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update payment method {PaymentMethodId} for user {UserId}", 
                paymentMethodId, userId);
            throw;
        }
    }

    public async Task<bool> RemovePaymentMethodAsync(Guid userId, Guid paymentMethodId, string correlationId)
    {
        try
        {
            _logger.LogInformation("Removing payment method {PaymentMethodId} for user {UserId}", 
                paymentMethodId, userId);

            if (!await _rbacService.HasPermissionAsync(userId, "payment_method:delete"))
                throw new UnauthorizedError("User does not have permission to remove payment methods");

            var paymentMethod = await _context.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.Id == paymentMethodId && pm.UserId == userId && pm.IsActive);

            if (paymentMethod == null)
                throw new NotFoundError("Payment method not found or not accessible");

            // Check if this is the last payment method and user has active subscription
            var activePaymentMethodsCount = await _context.PaymentMethods
                .CountAsync(pm => pm.UserId == userId && pm.IsActive && pm.Id != paymentMethodId);

            var hasActiveSubscription = await _context.UserSubscriptions
                .AnyAsync(s => s.UserId == userId && s.IsActive);

            if (activePaymentMethodsCount == 0 && hasActiveSubscription)
                throw new ValidationException("Cannot remove last payment method with active subscription");

            // Detach from Stripe
            await _retryPolicy.ExecuteAsync(async () =>
                await _stripePaymentMethodService.DetachAsync(paymentMethod.StripePaymentMethodId));

            // Soft delete the payment method
            paymentMethod.IsActive = false;
            paymentMethod.DeletedAt = DateTime.UtcNow;
            paymentMethod.UpdatedAt = DateTime.UtcNow;

            // If this was the default, set another as default
            if (paymentMethod.IsDefault && activePaymentMethodsCount > 0)
            {
                var newDefault = await _context.PaymentMethods
                    .Where(pm => pm.UserId == userId && pm.IsActive && pm.Id != paymentMethodId)
                    .OrderBy(pm => pm.CreatedAt)
                    .FirstOrDefaultAsync();

                if (newDefault != null)
                {
                    newDefault.IsDefault = true;
                    newDefault.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            // Log activity
            await LogPaymentMethodActivityAsync(userId, paymentMethodId, "payment_method_removed", correlationId);

            // Send notification
            await SendPaymentMethodRemovedNotificationAsync(userId, paymentMethodId, correlationId);

            _logger.LogInformation("Payment method {PaymentMethodId} removed successfully for user {UserId}", 
                paymentMethodId, userId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove payment method {PaymentMethodId} for user {UserId}", 
                paymentMethodId, userId);
            throw;
        }
    }

    public async Task<PaymentMethodDto?> GetPaymentMethodAsync(Guid userId, Guid paymentMethodId)
    {
        var paymentMethod = await _context.PaymentMethods
            .FirstOrDefaultAsync(pm => pm.Id == paymentMethodId && pm.UserId == userId && pm.IsActive);

        return paymentMethod != null ? MapToDto(paymentMethod) : null;
    }

    public async Task<List<PaymentMethodDto>> GetUserPaymentMethodsAsync(Guid userId)
    {
        var paymentMethods = await _context.PaymentMethods
            .Where(pm => pm.UserId == userId && pm.IsActive)
            .OrderByDescending(pm => pm.IsDefault)
            .ThenBy(pm => pm.CreatedAt)
            .ToListAsync();

        return paymentMethods.Select(MapToDto).ToList();
    }

    public async Task<PaymentMethodDto> SetDefaultPaymentMethodAsync(Guid userId, Guid paymentMethodId, string correlationId)
    {
        try
        {
            _logger.LogInformation("Setting payment method {PaymentMethodId} as default for user {UserId}", 
                paymentMethodId, userId);

            if (!await _rbacService.HasPermissionAsync(userId, "payment_method:update"))
                throw new UnauthorizedError("User does not have permission to set default payment method");

            var paymentMethod = await _context.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.Id == paymentMethodId && pm.UserId == userId && pm.IsActive);

            if (paymentMethod == null)
                throw new NotFoundError("Payment method not found or not accessible");

            // Unset other defaults
            await UnsetDefaultPaymentMethodsAsync(userId);

            // Set new default
            paymentMethod.IsDefault = true;
            paymentMethod.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Log activity
            await LogPaymentMethodActivityAsync(userId, paymentMethodId, "default_payment_method_changed", correlationId);

            _logger.LogInformation("Payment method {PaymentMethodId} set as default for user {UserId}", 
                paymentMethodId, userId);

            return MapToDto(paymentMethod);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set default payment method {PaymentMethodId} for user {UserId}", 
                paymentMethodId, userId);
            throw;
        }
    }

    public async Task<PaymentMethodDto?> GetDefaultPaymentMethodAsync(Guid userId)
    {
        var paymentMethod = await _context.PaymentMethods
            .FirstOrDefaultAsync(pm => pm.UserId == userId && pm.IsDefault && pm.IsActive);

        return paymentMethod != null ? MapToDto(paymentMethod) : null;
    }

    public async Task<bool> ValidatePaymentMethodAsync(Guid userId, PaymentMethodValidationRequest request, string correlationId)
    {
        try
        {
            _logger.LogInformation("Validating payment method {StripePaymentMethodId} for user {UserId}", 
                request.StripePaymentMethodId, userId);

            // Retrieve payment method from Stripe to validate
            var stripePaymentMethod = await _retryPolicy.ExecuteAsync(async () =>
                await _stripePaymentMethodService.GetAsync(request.StripePaymentMethodId));

            // Validate payment method is valid and not expired
            if (stripePaymentMethod.Card != null)
            {
                var now = DateTime.UtcNow;
                var expiryDate = new DateTime((int)stripePaymentMethod.Card.ExpYear, (int)stripePaymentMethod.Card.ExpMonth, 1).AddMonths(1);
                
                if (expiryDate <= now)
                {
                    _logger.LogWarning("Payment method {StripePaymentMethodId} is expired", request.StripePaymentMethodId);
                    return false;
                }
            }

            return true;
        }
        catch (StripeException ex)
        {
            _logger.LogWarning(ex, "Stripe validation failed for payment method {StripePaymentMethodId}", 
                request.StripePaymentMethodId);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate payment method {StripePaymentMethodId} for user {UserId}", 
                request.StripePaymentMethodId, userId);
            throw;
        }
    }

    public async Task<bool> IsPaymentMethodExpiringSoonAsync(Guid paymentMethodId, int warningDays = 30)
    {
        var paymentMethod = await _context.PaymentMethods
            .FirstOrDefaultAsync(pm => pm.Id == paymentMethodId && pm.IsActive);

        if (paymentMethod == null || !paymentMethod.ExpiryMonth.HasValue || !paymentMethod.ExpiryYear.HasValue)
            return false;

        var expiryDate = new DateTime(paymentMethod.ExpiryYear.Value, paymentMethod.ExpiryMonth.Value, 1).AddMonths(1);
        var warningDate = DateTime.UtcNow.AddDays(warningDays);

        return expiryDate <= warningDate;
    }

    public async Task<List<PaymentMethodDto>> GetExpiringPaymentMethodsAsync(int warningDays = 30)
    {
        var warningDate = DateTime.UtcNow.AddDays(warningDays);

        var expiringMethods = await _context.PaymentMethods
            .Where(pm => pm.IsActive && pm.ExpiryMonth.HasValue && pm.ExpiryYear.HasValue)
            .ToListAsync();

        var expiringSoon = expiringMethods
            .Where(pm =>
            {
                var expiryDate = new DateTime(pm.ExpiryYear.Value, pm.ExpiryMonth.Value, 1).AddMonths(1);
                return expiryDate <= warningDate;
            })
            .ToList();

        return expiringSoon.Select(MapToDto).ToList();
    }

    public async Task<bool> SyncPaymentMethodWithStripeAsync(Guid paymentMethodId, string correlationId)
    {
        try
        {
            var paymentMethod = await _context.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.Id == paymentMethodId && pm.IsActive);

            if (paymentMethod == null)
                return false;

            var stripePaymentMethod = await _retryPolicy.ExecuteAsync(async () =>
                await _stripePaymentMethodService.GetAsync(paymentMethod.StripePaymentMethodId));

            // Update local data with Stripe data
            paymentMethod.Type = stripePaymentMethod.Type;
            paymentMethod.Last4 = stripePaymentMethod.Card?.Last4 ?? string.Empty;
            paymentMethod.Brand = stripePaymentMethod.Card?.Brand ?? string.Empty;
            paymentMethod.ExpiryMonth = (int?)stripePaymentMethod.Card?.ExpMonth;
            paymentMethod.ExpiryYear = (int?)stripePaymentMethod.Card?.ExpYear;
            paymentMethod.Country = stripePaymentMethod.Card?.Country ?? string.Empty;
            paymentMethod.Fingerprint = stripePaymentMethod.Card?.Fingerprint ?? string.Empty;
            paymentMethod.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Payment method {PaymentMethodId} synchronized with Stripe", paymentMethodId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync payment method {PaymentMethodId} with Stripe", paymentMethodId);
            return false;
        }
    }

    public async Task<bool> SyncAllUserPaymentMethodsAsync(Guid userId, string correlationId)
    {
        var paymentMethods = await _context.PaymentMethods
            .Where(pm => pm.UserId == userId && pm.IsActive)
            .ToListAsync();

        var successCount = 0;
        foreach (var paymentMethod in paymentMethods)
        {
            if (await SyncPaymentMethodWithStripeAsync(paymentMethod.Id, correlationId))
                successCount++;
        }

        _logger.LogInformation("Synchronized {SuccessCount}/{TotalCount} payment methods for user {UserId}", 
            successCount, paymentMethods.Count, userId);

        return successCount == paymentMethods.Count;
    }

    public async Task LogPaymentMethodActivityAsync(Guid userId, Guid? paymentMethodId, string action, string correlationId, Dictionary<string, object>? metadata = null)
    {
        try
        {
            var activityLog = new UserActivityLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ActivityType = action,
                Description = $"Payment method operation: {action}",
                CreatedAt = DateTime.UtcNow
            };

            _context.UserActivityLogs.Add(activityLog);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log payment method activity for user {UserId}", userId);
        }
    }

    public async Task<bool> IsPaymentMethodOwnedByUserAsync(Guid userId, Guid paymentMethodId)
    {
        return await _context.PaymentMethods
            .AnyAsync(pm => pm.Id == paymentMethodId && pm.UserId == userId && pm.IsActive);
    }

    public async Task SendPaymentMethodAddedNotificationAsync(Guid userId, Guid paymentMethodId, string correlationId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            var paymentMethod = await _context.PaymentMethods.FindAsync(paymentMethodId);

            if (user != null && paymentMethod != null)
            {
                var subject = "Payment Method Added - GeoLeap";
                var message = $"A new {paymentMethod.Brand} card ending in {paymentMethod.Last4} has been added to your account.";
                
                await _emailService.SendPlainEmailAsync(user.Email, subject, message, correlationId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send payment method added notification for user {UserId}", userId);
        }
    }

    public async Task SendPaymentMethodUpdatedNotificationAsync(Guid userId, Guid paymentMethodId, string correlationId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            var paymentMethod = await _context.PaymentMethods.FindAsync(paymentMethodId);

            if (user != null && paymentMethod != null)
            {
                var subject = "Payment Method Updated - GeoLeap";
                var message = $"Your {paymentMethod.Brand} card ending in {paymentMethod.Last4} has been updated.";
                
                await _emailService.SendPlainEmailAsync(user.Email, subject, message, correlationId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send payment method updated notification for user {UserId}", userId);
        }
    }

    public async Task SendPaymentMethodRemovedNotificationAsync(Guid userId, Guid paymentMethodId, string correlationId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);

            if (user != null)
            {
                var subject = "Payment Method Removed - GeoLeap";
                var message = "A payment method has been removed from your account for security.";
                
                await _emailService.SendPlainEmailAsync(user.Email, subject, message, correlationId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send payment method removed notification for user {UserId}", userId);
        }
    }

    public async Task SendPaymentMethodExpirationWarningAsync(Guid userId, Guid paymentMethodId, string correlationId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            var paymentMethod = await _context.PaymentMethods.FindAsync(paymentMethodId);

            if (user != null && paymentMethod != null)
            {
                var expiryDate = new DateTime(paymentMethod.ExpiryYear.Value, paymentMethod.ExpiryMonth.Value, 1).AddMonths(1);
                var subject = "Payment Method Expiring Soon - GeoLeap";
                var message = $"Your {paymentMethod.Brand} card ending in {paymentMethod.Last4} expires on {expiryDate:MM/yy}. Please update your payment method to avoid service interruption.";
                
                await _emailService.SendPlainEmailAsync(user.Email, subject, message, correlationId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send payment method expiration warning for user {UserId}", userId);
        }
    }

    public async Task<Dictionary<string, object>> GetPaymentMethodAnalyticsAsync(Guid? userId = null, DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.PaymentMethods.AsQueryable();

        if (userId.HasValue)
            query = query.Where(pm => pm.UserId == userId.Value);

        if (startDate.HasValue)
            query = query.Where(pm => pm.CreatedAt >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(pm => pm.CreatedAt <= endDate.Value);

        var totalMethods = await query.CountAsync();
        var activeMethods = await query.CountAsync(pm => pm.IsActive);
        var methodsByBrand = await query
            .Where(pm => pm.IsActive)
            .GroupBy(pm => pm.Brand)
            .Select(g => new { Brand = g.Key, Count = g.Count() })
            .ToListAsync();

        return new Dictionary<string, object>
        {
            ["totalMethods"] = totalMethods,
            ["activeMethods"] = activeMethods,
            ["methodsByBrand"] = methodsByBrand.ToDictionary(x => x.Brand, x => x.Count),
            ["generatedAt"] = DateTime.UtcNow
        };
    }

    public async Task<List<PaymentMethodDto>> GetMostUsedPaymentMethodsAsync(int limit = 10)
    {
        // This would require usage tracking - for now return most recently added
        var methods = await _context.PaymentMethods
            .Where(pm => pm.IsActive)
            .OrderByDescending(pm => pm.CreatedAt)
            .Take(limit)
            .ToListAsync();

        return methods.Select(MapToDto).ToList();
    }

    public async Task<bool> DisablePaymentMethodAsync(Guid paymentMethodId, string reason, string correlationId)
    {
        try
        {
            var paymentMethod = await _context.PaymentMethods.FindAsync(paymentMethodId);
            if (paymentMethod == null) return false;

            paymentMethod.IsActive = false;
            paymentMethod.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await LogPaymentMethodActivityAsync(paymentMethod.UserId, paymentMethodId, "payment_method_disabled", correlationId, 
                new Dictionary<string, object> { ["reason"] = reason });

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to disable payment method {PaymentMethodId}", paymentMethodId);
            return false;
        }
    }

    public async Task<bool> EnablePaymentMethodAsync(Guid paymentMethodId, string correlationId)
    {
        try
        {
            var paymentMethod = await _context.PaymentMethods.FindAsync(paymentMethodId);
            if (paymentMethod == null) return false;

            paymentMethod.IsActive = true;
            paymentMethod.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await LogPaymentMethodActivityAsync(paymentMethod.UserId, paymentMethodId, "payment_method_enabled", correlationId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to enable payment method {PaymentMethodId}", paymentMethodId);
            return false;
        }
    }

    private async Task<string> GetOrCreateStripeCustomerAsync(Guid userId, string correlationId)
    {
        var existingCustomer = await _context.Set<StripeCustomer>()
            .FirstOrDefaultAsync(sc => sc.UserId == userId);

        if (existingCustomer != null)
            return existingCustomer.StripeCustomerId;

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new NotFoundError("User not found");

        // Create customer in Stripe
        var customerOptions = new CustomerCreateOptions
        {
            Email = user.Email,
            Name = $"{user.FirstName} {user.LastName}",
            Metadata = new Dictionary<string, string>
            {
                ["user_id"] = userId.ToString(),
                ["correlation_id"] = correlationId
            }
        };

        var stripeCustomer = await _retryPolicy.ExecuteAsync(async () =>
            await _customerService.CreateAsync(customerOptions));

        // Store in database
        var customerRecord = new StripeCustomer
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StripeCustomerId = stripeCustomer.Id,
            Email = stripeCustomer.Email,
            Name = stripeCustomer.Name,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Set<StripeCustomer>().Add(customerRecord);
        await _context.SaveChangesAsync();

        return customerRecord.StripeCustomerId;
    }

    private async Task UnsetDefaultPaymentMethodsAsync(Guid userId)
    {
        var defaultMethods = await _context.PaymentMethods
            .Where(pm => pm.UserId == userId && pm.IsDefault && pm.IsActive)
            .ToListAsync();

        foreach (var method in defaultMethods)
        {
            method.IsDefault = false;
            method.UpdatedAt = DateTime.UtcNow;
        }
    }

    private PaymentMethodDto MapToDto(GeoLeap.Api.Models.PaymentMethod paymentMethod)
    {
        var isExpiringSoon = false;
        if (paymentMethod.ExpiryMonth.HasValue && paymentMethod.ExpiryYear.HasValue)
        {
            var expiryDate = new DateTime(paymentMethod.ExpiryYear.Value, paymentMethod.ExpiryMonth.Value, 1).AddMonths(1);
            isExpiringSoon = expiryDate <= DateTime.UtcNow.AddDays(30);
        }

        var displayName = !string.IsNullOrWhiteSpace(paymentMethod.Nickname) 
            ? paymentMethod.Nickname 
            : $"{paymentMethod.Brand?.ToUpperInvariant()} ••••{paymentMethod.Last4}";

        return new PaymentMethodDto
        {
            Id = paymentMethod.Id,
            Type = paymentMethod.Type,
            Last4 = paymentMethod.Last4,
            Brand = paymentMethod.Brand,
            ExpiryMonth = paymentMethod.ExpiryMonth,
            ExpiryYear = paymentMethod.ExpiryYear,
            IsDefault = paymentMethod.IsDefault,
            IsActive = paymentMethod.IsActive,
            Country = paymentMethod.Country,
            Nickname = paymentMethod.Nickname,
            CreatedAt = paymentMethod.CreatedAt,
            UpdatedAt = paymentMethod.UpdatedAt,
            IsExpiringSoon = isExpiringSoon,
            DisplayName = displayName
        };
    }

    private static bool IsRetriableStripeError(StripeException ex)
    {
        return ex.StripeError?.Type == "api_connection_error" ||
               ex.StripeError?.Type == "rate_limit_error" ||
               (ex.HttpStatusCode >= HttpStatusCode.InternalServerError);
    }
}