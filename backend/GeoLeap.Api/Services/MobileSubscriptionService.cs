using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Controllers;
using System.Text.Json;
using System.Net.Http.Headers;
using Npgsql;

namespace GeoLeap.Api.Services;

/// <summary>
/// Mobile In-App Purchase subscription service
/// Handles iOS and Android receipt verification and subscription management
/// </summary>
public class MobileSubscriptionService : IMobileSubscriptionService
{
    private readonly ApplicationDbContext _context;
    private readonly IIosReceiptVerificationService _iosVerification;
    private readonly IAndroidReceiptVerificationService _androidVerification;
    private readonly ILogger<MobileSubscriptionService> _logger;
    private readonly IConfiguration _configuration;

    // Subscription tier feature mappings
    private static readonly Dictionary<string, List<string>> TierFeatures = new()
    {
        { "free", new List<string> { "basic-search", "service-selection-3" } },
        { "basic", new List<string> { "basic-search", "service-selection", "advanced-search", "vpn-recommendations", "streaming-availability" } },
        { "premium", new List<string> { "basic-search", "service-selection", "advanced-search", "vpn-recommendations", "streaming-availability", "offline-downloads", "ad-free", "priority-support" } },
        { "pro", new List<string> { "basic-search", "service-selection", "advanced-search", "vpn-recommendations", "streaming-availability", "offline-downloads", "ad-free", "priority-support", "family-sharing", "early-access" } }
    };

    private static readonly Dictionary<string, string> ProductTierById = new(StringComparer.Ordinal)
    {
        { "com.geoleap.free.monthly", "free" },
        { "com.geoleap.free.yearly", "free" },
        { "com.geoleap.basic.monthly", "basic" },
        { "com.geoleap.basic.yearly", "basic" },
        { "com.geoleap.premium.monthly", "premium" },
        { "com.geoleap.premium.yearly", "premium" },
        { "com.geoleap.pro.monthly", "pro" },
        { "com.geoleap.pro.yearly", "pro" },
        { "geoleap_basic_monthly", "basic" },
        { "geoleap_basic_yearly", "basic" },
        { "geoleap_premium_monthly", "premium" },
        { "geoleap_premium_yearly", "premium" },
        { "geoleap_pro_monthly", "pro" },
        { "geoleap_pro_yearly", "pro" }
    };

    public MobileSubscriptionService(
        ApplicationDbContext context,
        IIosReceiptVerificationService iosVerification,
        IAndroidReceiptVerificationService androidVerification,
        ILogger<MobileSubscriptionService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _iosVerification = iosVerification;
        _androidVerification = androidVerification;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<MobileSubscriptionResponse> VerifyIosReceiptAsync(Guid userId, IosReceiptRequest request)
    {
        try
        {
            _logger.LogInformation("Verifying iOS receipt for user {UserId}, product {ProductId}, transactionId {TransactionId}",
                userId, request.ProductId, request.TransactionId);

            // Verify receipt with Apple before trusting product or transaction fields.
            var verificationResult = await _iosVerification.VerifyReceiptAsync(request.ReceiptData);

            if (verificationResult == null || !verificationResult.IsValid)
            {
                _logger.LogWarning("iOS receipt verification failed for user {UserId}: {Error}",
                    userId, verificationResult?.ErrorMessage);
                return new MobileSubscriptionResponse
                {
                    Success = false,
                    ErrorMessage = verificationResult?.ErrorMessage ?? "iOS receipt verification failed"
                };
            }

            var verifiedProductId = verificationResult.ProductId;
            var verifiedTransactionId = verificationResult.TransactionId;
            var verifiedOriginalTransactionId = verificationResult.OriginalTransactionId;

            if (string.IsNullOrWhiteSpace(verifiedProductId) ||
                string.IsNullOrWhiteSpace(verifiedTransactionId) ||
                string.IsNullOrWhiteSpace(verifiedOriginalTransactionId))
            {
                _logger.LogWarning("SECURITY: iOS receipt verification returned missing product, transaction, or original transaction for user {UserId}", userId);
                return new MobileSubscriptionResponse
                {
                    Success = false,
                    ErrorMessage = "Receipt verification did not include required purchase details"
                };
            }

            if (!string.Equals(request.ProductId, verifiedProductId, StringComparison.Ordinal))
            {
                _logger.LogWarning("SECURITY: iOS Product ID mismatch for user {UserId}. Requested {RequestedProductId}, verified {VerifiedProductId}",
                    userId, request.ProductId, verifiedProductId);
                return new MobileSubscriptionResponse
                {
                    Success = false,
                    ErrorMessage = "Product ID does not match verified receipt"
                };
            }

            var expectedBundleId = _configuration["MobileApp:iOS:BundleId"];
            if (!string.IsNullOrWhiteSpace(expectedBundleId))
            {
                if (string.IsNullOrWhiteSpace(verificationResult.BundleId) ||
                    !string.Equals(expectedBundleId, verificationResult.BundleId, StringComparison.Ordinal))
                {
                    _logger.LogWarning("SECURITY: iOS bundle ID mismatch for user {UserId}. Expected {ExpectedBundleId}, verified {VerifiedBundleId}",
                        userId, expectedBundleId, verificationResult.BundleId);
                    return new MobileSubscriptionResponse
                    {
                        Success = false,
                        ErrorMessage = "Receipt bundle ID does not match this application"
                    };
                }
            }

            if (!verificationResult.ExpirationDate.HasValue ||
                verificationResult.ExpirationDate.Value <= DateTime.UtcNow)
            {
                _logger.LogWarning("SECURITY: iOS receipt is expired for user {UserId}, transactionId {TransactionId}, expiryDate {ExpiryDate}",
                    userId, verifiedTransactionId, verificationResult.ExpirationDate);
                return new MobileSubscriptionResponse
                {
                    Success = false,
                    ErrorMessage = "Receipt subscription has expired"
                };
            }

            // BUG-040 FIX: REPLAY ATTACK PREVENTION - Check Apple-verified transaction IDs only.
            var existingByTransactionId = await _context.MobileSubscriptions
                .FirstOrDefaultAsync(s => s.TransactionId == verifiedTransactionId);

            if (existingByTransactionId != null)
            {
                _logger.LogWarning("SECURITY: Replay attack detected - iOS verified transaction ID {TransactionId} already used by user {ExistingUserId}",
                    verifiedTransactionId, existingByTransactionId.UserId);

                return new MobileSubscriptionResponse
                {
                    Success = false,
                    ErrorMessage = "This purchase has already been activated. Please contact support if you believe this is an error."
                };
            }

            // BUG-040 FIX: Also check verified OriginalTransactionId to prevent renewal replay attacks.
            if (!string.IsNullOrWhiteSpace(verifiedOriginalTransactionId))
            {
                var existingByOriginalId = await _context.MobileSubscriptions
                    .FirstOrDefaultAsync(s => s.OriginalTransactionId == verifiedOriginalTransactionId);

                if (existingByOriginalId != null && existingByOriginalId.UserId != userId)
                {
                    _logger.LogWarning("SECURITY: Replay attack detected - iOS verified original transaction ID {OriginalTransactionId} already used by different user {ExistingUserId}",
                        verifiedOriginalTransactionId, existingByOriginalId.UserId);

                    return new MobileSubscriptionResponse
                    {
                        Success = false,
                        ErrorMessage = "This purchase is already associated with another account."
                    };
                }
            }

            // BUG-040 FIX: AUDIT LOGGING - Log successful verification
            _logger.LogInformation("SECURITY: iOS receipt verified successfully for user {UserId}, transactionId {TransactionId}, product {ProductId}, expiryDate {ExpiryDate}",
                userId, verifiedTransactionId, verifiedProductId, verificationResult.ExpirationDate);

            // Extract subscription info from receipt
            var tier = DetermineSubscriptionTier(verifiedProductId);
            if (tier == null)
            {
                _logger.LogWarning("SECURITY: iOS receipt contained unknown product ID {ProductId} for user {UserId}",
                    verifiedProductId, userId);
                return new MobileSubscriptionResponse
                {
                    Success = false,
                    ErrorMessage = "Receipt product is not recognized"
                };
            }
            var expiryDate = verificationResult.ExpirationDate.Value;

            // Create or update subscription in database
            var subscription = await GetOrCreateMobileSubscription(userId, "ios");
            subscription.Tier = tier;
            subscription.Status = "active";
            subscription.ProductId = verifiedProductId;
            subscription.TransactionId = verifiedTransactionId;
            subscription.OriginalTransactionId = verifiedOriginalTransactionId;
            subscription.ReceiptData = request.ReceiptData;
            subscription.StartDate = DateTime.UtcNow;
            subscription.EndDate = expiryDate;
            subscription.AutoRenew = verificationResult.AutoRenew;
            subscription.LastVerified = DateTime.UtcNow;
            subscription.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("iOS subscription activated for user {UserId}, tier {Tier}", userId, tier);

            var status = await GetSubscriptionStatusAsync(userId);
            return new MobileSubscriptionResponse
            {
                Success = true,
                Subscription = status
            };
        }
        catch (DbUpdateException ex) when (IsMobileSubscriptionReplayConstraintViolation(ex))
        {
            _logger.LogWarning(ex, "SECURITY: Concurrent iOS receipt replay blocked by database uniqueness for user {UserId}", userId);
            return new MobileSubscriptionResponse
            {
                Success = false,
                ErrorMessage = "This purchase has already been activated. Please contact support if you believe this is an error."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying iOS receipt for user {UserId}", userId);
            return new MobileSubscriptionResponse
            {
                Success = false,
                ErrorMessage = "Receipt verification failed"
            };
        }
    }

    public async Task<MobileSubscriptionResponse> VerifyAndroidReceiptAsync(Guid userId, AndroidReceiptRequest request)
    {
        try
        {
            _logger.LogInformation("Verifying Android receipt for user {UserId}, product {ProductId}, purchaseToken {PurchaseTokenPrefix}",
                userId, request.ProductId, request.PurchaseToken?.Length > 10 ? request.PurchaseToken.Substring(0, 10) + "..." : request.PurchaseToken);

            // BUG-040 FIX: REPLAY ATTACK PREVENTION - Check if purchase token already used
            // This prevents malicious users from reusing the same purchase token multiple times
            var existingByPurchaseToken = await _context.MobileSubscriptions
                .FirstOrDefaultAsync(s => s.PurchaseToken == request.PurchaseToken);

            if (existingByPurchaseToken != null)
            {
                _logger.LogWarning("SECURITY: Replay attack detected - Android purchase token already used by user {ExistingUserId}",
                    existingByPurchaseToken.UserId);

                return new MobileSubscriptionResponse
                {
                    Success = false,
                    ErrorMessage = "This purchase has already been activated. Please contact support if you believe this is an error."
                };
            }

            // BUG-040 FIX: Also check OrderId if provided (additional safety)
            if (!string.IsNullOrEmpty(request.OrderId))
            {
                var existingByOrderId = await _context.MobileSubscriptions
                    .FirstOrDefaultAsync(s => s.TransactionId == request.OrderId);

                if (existingByOrderId != null && existingByOrderId.UserId != userId)
                {
                    _logger.LogWarning("SECURITY: Replay attack detected - Android order ID {OrderId} already used by different user {ExistingUserId}",
                        request.OrderId, existingByOrderId.UserId);

                    return new MobileSubscriptionResponse
                    {
                        Success = false,
                        ErrorMessage = "This purchase is already associated with another account."
                    };
                }
            }

            var expectedPackageId = _configuration["MobileApp:Android:PackageId"] ?? "com.geoleap.app";
            if (!string.IsNullOrWhiteSpace(request.PackageName) &&
                !string.Equals(expectedPackageId, request.PackageName, StringComparison.Ordinal))
            {
                _logger.LogWarning("SECURITY: Android package ID mismatch for user {UserId}. Expected {ExpectedPackageId}, requested {RequestedPackageId}",
                    userId, expectedPackageId, request.PackageName);
                return new MobileSubscriptionResponse
                {
                    Success = false,
                    ErrorMessage = "Purchase package ID does not match this application"
                };
            }

            // Verify purchase with Google Play using the server-configured package ID.
            var verificationResult = await _androidVerification.VerifyPurchaseAsync(
                expectedPackageId,
                request.ProductId,
                request.PurchaseToken);

            if (!verificationResult.IsValid)
            {
                _logger.LogWarning("Android receipt verification failed for user {UserId}: {Error}",
                    userId, verificationResult.ErrorMessage);
                return new MobileSubscriptionResponse
                {
                    Success = false,
                    ErrorMessage = verificationResult.ErrorMessage
                };
            }

            if (!verificationResult.ExpirationDate.HasValue ||
                verificationResult.ExpirationDate.Value <= DateTime.UtcNow)
            {
                _logger.LogWarning("SECURITY: Android receipt is missing a future expiry for user {UserId}, purchase token {PurchaseToken}",
                    userId, request.PurchaseToken);
                return new MobileSubscriptionResponse
                {
                    Success = false,
                    ErrorMessage = "Purchase subscription expiry is invalid"
                };
            }

            // BUG-040 FIX: AUDIT LOGGING - Log successful verification
            _logger.LogInformation("SECURITY: Android receipt verified successfully for user {UserId}, orderId {OrderId}, product {ProductId}, expiryDate {ExpiryDate}",
                userId, request.OrderId, request.ProductId, verificationResult.ExpirationDate);

            // Extract subscription info from purchase
            var tier = DetermineSubscriptionTier(request.ProductId);
            if (tier == null)
            {
                return new MobileSubscriptionResponse
                {
                    Success = false,
                    ErrorMessage = "Receipt product is not recognized"
                };
            }
            var expiryDate = verificationResult.ExpirationDate.Value;

            // Create or update subscription in database
            var subscription = await GetOrCreateMobileSubscription(userId, "android");
            subscription.Tier = tier;
            subscription.Status = "active";
            subscription.ProductId = request.ProductId;
            subscription.TransactionId = request.OrderId ?? Guid.NewGuid().ToString();
            subscription.PurchaseToken = request.PurchaseToken;
            subscription.StartDate = DateTime.UtcNow;
            subscription.EndDate = expiryDate;
            subscription.AutoRenew = verificationResult.AutoRenew;
            subscription.LastVerified = DateTime.UtcNow;
            subscription.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Android subscription activated for user {UserId}, tier {Tier}", userId, tier);

            var status = await GetSubscriptionStatusAsync(userId);
            return new MobileSubscriptionResponse
            {
                Success = true,
                Subscription = status
            };
        }
        catch (DbUpdateException ex) when (IsMobileSubscriptionReplayConstraintViolation(ex))
        {
            _logger.LogWarning(ex, "SECURITY: Concurrent Android receipt replay blocked by database uniqueness for user {UserId}", userId);
            return new MobileSubscriptionResponse
            {
                Success = false,
                ErrorMessage = "This purchase has already been activated. Please contact support if you believe this is an error."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying Android receipt for user {UserId}", userId);
            return new MobileSubscriptionResponse
            {
                Success = false,
                ErrorMessage = "Receipt verification failed"
            };
        }
    }

    public async Task<MobileSubscriptionStatus> GetSubscriptionStatusAsync(Guid userId)
    {
        var subscription = await _context.MobileSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId);

        if (subscription == null)
        {
            return new MobileSubscriptionStatus
            {
                UserId = userId,
                Tier = "free",
                Status = "inactive"
            };
        }

        // Check if subscription is still valid
        if (subscription.EndDate.HasValue && subscription.EndDate.Value < DateTime.UtcNow)
        {
            subscription.Status = "expired";
            await _context.SaveChangesAsync();
        }

        var plan = GetPlanInfoForTier(subscription.Tier);

        return new MobileSubscriptionStatus
        {
            UserId = userId,
            Tier = subscription.Tier,
            Status = subscription.Status,
            StartDate = subscription.StartDate,
            EndDate = subscription.EndDate,
            AutoRenew = subscription.AutoRenew,
            Platform = subscription.Platform,
            ProductId = subscription.ProductId,
            TransactionId = subscription.TransactionId,
            Plan = plan
        };
    }

    public async Task<MobileSubscriptionResponse> SyncSubscriptionAsync(Guid userId, SyncSubscriptionRequest request)
    {
        try
        {
            var subscription = await _context.MobileSubscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (subscription == null)
            {
                return new MobileSubscriptionResponse
                {
                    Success = false,
                    ErrorMessage = "No subscription found"
                };
            }

            // Re-verify with store
            if (request.Platform == "ios" && !string.IsNullOrEmpty(request.ReceiptData))
            {
                var verificationResult = await _iosVerification.VerifyReceiptAsync(request.ReceiptData);
                var verifiedProductId = verificationResult.ProductId;
                var verifiedTransactionId = verificationResult.TransactionId;
                var verifiedOriginalTransactionId = verificationResult.OriginalTransactionId;

                if (!verificationResult.IsValid)
                {
                    return new MobileSubscriptionResponse
                    {
                        Success = false,
                        ErrorMessage = verificationResult.ErrorMessage ?? "iOS receipt verification failed"
                    };
                }

                if (string.IsNullOrWhiteSpace(verifiedProductId) ||
                    string.IsNullOrWhiteSpace(verifiedTransactionId) ||
                    string.IsNullOrWhiteSpace(verifiedOriginalTransactionId))
                {
                    _logger.LogWarning("SECURITY: iOS sync returned missing product, transaction, or original transaction for user {UserId}", userId);
                    return new MobileSubscriptionResponse
                    {
                        Success = false,
                        ErrorMessage = "Receipt verification did not include required purchase details"
                    };
                }

                if (!string.Equals(subscription.ProductId, verifiedProductId, StringComparison.Ordinal))
                {
                    _logger.LogWarning("SECURITY: iOS sync product mismatch for user {UserId}. Stored {StoredProductId}, verified {VerifiedProductId}",
                        userId, subscription.ProductId, verifiedProductId);
                    return new MobileSubscriptionResponse
                    {
                        Success = false,
                        ErrorMessage = "Receipt product does not match the active subscription"
                    };
                }

                var expectedBundleId = _configuration["MobileApp:iOS:BundleId"];
                if (!string.IsNullOrWhiteSpace(expectedBundleId) &&
                    (string.IsNullOrWhiteSpace(verificationResult.BundleId) ||
                     !string.Equals(expectedBundleId, verificationResult.BundleId, StringComparison.Ordinal)))
                {
                    _logger.LogWarning("SECURITY: iOS sync bundle ID mismatch for user {UserId}. Expected {ExpectedBundleId}, verified {VerifiedBundleId}",
                        userId, expectedBundleId, verificationResult.BundleId);
                    return new MobileSubscriptionResponse
                    {
                        Success = false,
                        ErrorMessage = "Receipt bundle ID does not match this application"
                    };
                }

                if (!verificationResult.ExpirationDate.HasValue ||
                    verificationResult.ExpirationDate.Value <= DateTime.UtcNow)
                {
                    return new MobileSubscriptionResponse
                    {
                        Success = false,
                        ErrorMessage = "Receipt subscription has expired"
                    };
                }

                if (!string.IsNullOrWhiteSpace(subscription.OriginalTransactionId) &&
                    !string.Equals(subscription.OriginalTransactionId, verifiedOriginalTransactionId, StringComparison.Ordinal))
                {
                    _logger.LogWarning("SECURITY: iOS sync original transaction mismatch for user {UserId}. Stored {StoredOriginalTransactionId}, verified {VerifiedOriginalTransactionId}",
                        userId, subscription.OriginalTransactionId, verifiedOriginalTransactionId);
                    return new MobileSubscriptionResponse
                    {
                        Success = false,
                        ErrorMessage = "Receipt is not associated with the active subscription"
                    };
                }

                var existingByTransactionId = await _context.MobileSubscriptions
                    .FirstOrDefaultAsync(s => s.TransactionId == verifiedTransactionId);
                if (existingByTransactionId != null && existingByTransactionId.Id != subscription.Id)
                {
                    _logger.LogWarning("SECURITY: iOS sync transaction replay detected for user {UserId}, transaction {TransactionId}",
                        userId, verifiedTransactionId);
                    return new MobileSubscriptionResponse
                    {
                        Success = false,
                        ErrorMessage = "This purchase has already been activated. Please contact support if you believe this is an error."
                    };
                }

                var existingByOriginalTransactionId = await _context.MobileSubscriptions
                    .FirstOrDefaultAsync(s => s.OriginalTransactionId == verifiedOriginalTransactionId);
                if (existingByOriginalTransactionId != null && existingByOriginalTransactionId.UserId != userId)
                {
                    _logger.LogWarning("SECURITY: iOS sync original transaction replay detected for user {UserId}, original transaction {OriginalTransactionId}",
                        userId, verifiedOriginalTransactionId);
                    return new MobileSubscriptionResponse
                    {
                        Success = false,
                        ErrorMessage = "This purchase is already associated with another account."
                    };
                }

                var tier = DetermineSubscriptionTier(verifiedProductId);
                if (tier == null)
                {
                    return new MobileSubscriptionResponse
                    {
                        Success = false,
                        ErrorMessage = "Receipt product is not recognized"
                    };
                }

                subscription.Tier = tier;
                subscription.Status = "active";
                subscription.ProductId = verifiedProductId;
                subscription.TransactionId = verifiedTransactionId;
                subscription.OriginalTransactionId = verifiedOriginalTransactionId;
                subscription.ReceiptData = request.ReceiptData;
                subscription.EndDate = verificationResult.ExpirationDate;
                subscription.AutoRenew = verificationResult.AutoRenew;
                subscription.LastVerified = DateTime.UtcNow;
                subscription.UpdatedAt = DateTime.UtcNow;
            }
            else if (request.Platform == "android" && !string.IsNullOrEmpty(request.PurchaseToken))
            {
                // Get package ID from configuration or use default
                var packageId = _configuration["MobileApp:Android:PackageId"] ?? "com.geoleap.app";
                var verificationResult = await _androidVerification.VerifyPurchaseAsync(
                    packageId,
                    subscription.ProductId ?? "",
                    request.PurchaseToken);

                if (verificationResult.IsValid &&
                    verificationResult.ExpirationDate.HasValue &&
                    verificationResult.ExpirationDate.Value > DateTime.UtcNow)
                {
                    subscription.EndDate = verificationResult.ExpirationDate;
                    subscription.AutoRenew = verificationResult.AutoRenew;
                    subscription.LastVerified = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            var status = await GetSubscriptionStatusAsync(userId);
            return new MobileSubscriptionResponse
            {
                Success = true,
                Subscription = status
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing subscription for user {UserId}", userId);
            return new MobileSubscriptionResponse
            {
                Success = false,
                ErrorMessage = "Sync failed"
            };
        }
    }

    public async Task<RestorePurchasesResponse> RestorePurchasesAsync(Guid userId, RestorePurchasesRequest request)
    {
        try
        {
            _logger.LogInformation("Restoring purchases for user {UserId} on platform {Platform}", userId, request.Platform);

            // For now, just check if there's an existing subscription
            // In a full implementation, this would query the app stores for all purchases
            var subscription = await _context.MobileSubscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId && s.Platform == request.Platform);

            if (subscription != null && subscription.EndDate > DateTime.UtcNow)
            {
                var status = await GetSubscriptionStatusAsync(userId);
                return new RestorePurchasesResponse
                {
                    Success = true,
                    RestoredCount = 1,
                    ActiveSubscription = status
                };
            }

            return new RestorePurchasesResponse
            {
                Success = true,
                RestoredCount = 0
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring purchases for user {UserId}", userId);
            return new RestorePurchasesResponse
            {
                Success = false,
                ErrorMessage = "Restore failed"
            };
        }
    }

    public async Task<MobileSubscriptionResponse> CancelSubscriptionAsync(Guid userId)
    {
        try
        {
            var subscription = await _context.MobileSubscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (subscription == null)
            {
                return new MobileSubscriptionResponse
                {
                    Success = false,
                    ErrorMessage = "No subscription found"
                };
            }

            subscription.Status = "canceled";
            subscription.AutoRenew = false;
            subscription.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var status = await GetSubscriptionStatusAsync(userId);
            return new MobileSubscriptionResponse
            {
                Success = true,
                Subscription = status
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error canceling subscription for user {UserId}", userId);
            return new MobileSubscriptionResponse
            {
                Success = false,
                ErrorMessage = "Cancellation failed"
            };
        }
    }

    public async Task<bool> HasFeatureAccessAsync(Guid userId, string featureId)
    {
        var status = await GetSubscriptionStatusAsync(userId);

        if (!TierFeatures.ContainsKey(status.Tier))
            return false;

        return TierFeatures[status.Tier].Contains(featureId);
    }

    public async Task<List<MobileSubscriptionPlan>> GetAvailablePlansAsync(string platform)
    {
        // Return the 4 subscription plans matching mobile app
        return await Task.FromResult(new List<MobileSubscriptionPlan>
        {
            new MobileSubscriptionPlan
            {
                Id = "free",
                Tier = "free",
                Name = "Free",
                DisplayName = "Free Plan",
                Description = "Basic features to get started",
                MonthlyPrice = 0,
                YearlyPrice = 0,
                Currency = "USD",
                Features = new List<PlanFeature>
                {
                    new() { Id = "basic-search", Name = "Basic Search", Included = true },
                    new() { Id = "service-selection-3", Name = "Select Up to 3 Services", Included = true },
                    new() { Id = "unlimited-services", Name = "Unlimited Services", Included = false },
                    new() { Id = "advanced-search", Name = "Advanced Search & Filters", Included = false }
                },
                IapProductIds = new ProductIds
                {
                    Ios = new() { Monthly = "com.geoleap.free.monthly", Yearly = "com.geoleap.free.yearly" },
                    Android = new() { Monthly = "geoleap_free_monthly", Yearly = "geoleap_free_yearly" }
                },
                Color = "#6B7280"
            },
            new MobileSubscriptionPlan
            {
                Id = "basic",
                Tier = "basic",
                Name = "Basic",
                DisplayName = "Basic Plan",
                Description = "Essential features for regular streaming",
                MonthlyPrice = 4.99m,
                YearlyPrice = 49.99m,
                Currency = "USD",
                Features = new List<PlanFeature>
                {
                    new() { Id = "basic-search", Name = "Basic Search", Included = true },
                    new() { Id = "unlimited-services", Name = "Unlimited Services", Included = true },
                    new() { Id = "advanced-search", Name = "Advanced Search & Filters", Included = true },
                    new() { Id = "vpn-recommendations", Name = "VPN Recommendations", Included = true },
                    new() { Id = "offline-downloads", Name = "Offline Downloads", Included = false }
                },
                IapProductIds = new ProductIds
                {
                    Ios = new() { Monthly = "com.geoleap.basic.monthly", Yearly = "com.geoleap.basic.yearly" },
                    Android = new() { Monthly = "geoleap_basic_monthly", Yearly = "geoleap_basic_yearly" }
                },
                Color = "#3B82F6"
            },
            new MobileSubscriptionPlan
            {
                Id = "premium",
                Tier = "premium",
                Name = "Premium",
                DisplayName = "Premium Plan",
                Description = "Advanced features for power users",
                MonthlyPrice = 9.99m,
                YearlyPrice = 99.99m,
                Currency = "USD",
                IsMostPopular = true,
                Features = new List<PlanFeature>
                {
                    new() { Id = "basic-search", Name = "Basic Search", Included = true },
                    new() { Id = "unlimited-services", Name = "Unlimited Services", Included = true },
                    new() { Id = "advanced-search", Name = "Advanced Search & Filters", Included = true },
                    new() { Id = "vpn-recommendations", Name = "VPN Recommendations", Included = true },
                    new() { Id = "offline-downloads", Name = "Offline Downloads", Included = true },
                    new() { Id = "ad-free", Name = "Ad-Free Experience", Included = true },
                    new() { Id = "priority-support", Name = "Priority Support", Included = true },
                    new() { Id = "family-sharing", Name = "Family Sharing", Included = false }
                },
                IapProductIds = new ProductIds
                {
                    Ios = new() { Monthly = "com.geoleap.premium.monthly", Yearly = "com.geoleap.premium.yearly" },
                    Android = new() { Monthly = "geoleap_premium_monthly", Yearly = "geoleap_premium_yearly" }
                },
                Color = "#F59E0B"
            },
            new MobileSubscriptionPlan
            {
                Id = "pro",
                Tier = "pro",
                Name = "Pro",
                DisplayName = "Pro Plan",
                Description = "Complete access to all features",
                MonthlyPrice = 14.99m,
                YearlyPrice = 149.99m,
                Currency = "USD",
                IsRecommended = true,
                Features = new List<PlanFeature>
                {
                    new() { Id = "basic-search", Name = "Basic Search", Included = true },
                    new() { Id = "unlimited-services", Name = "Unlimited Services", Included = true },
                    new() { Id = "advanced-search", Name = "Advanced Search & Filters", Included = true },
                    new() { Id = "vpn-recommendations", Name = "VPN Recommendations", Included = true },
                    new() { Id = "offline-downloads", Name = "Offline Downloads", Included = true },
                    new() { Id = "ad-free", Name = "Ad-Free Experience", Included = true },
                    new() { Id = "priority-support", Name = "Priority Support", Included = true },
                    new() { Id = "family-sharing", Name = "Family Sharing (5 accounts)", Included = true },
                    new() { Id = "early-access", Name = "Early Access to New Features", Included = true }
                },
                IapProductIds = new ProductIds
                {
                    Ios = new() { Monthly = "com.geoleap.pro.monthly", Yearly = "com.geoleap.pro.yearly" },
                    Android = new() { Monthly = "geoleap_pro_monthly", Yearly = "geoleap_pro_yearly" }
                },
                Color = "#8B5CF6"
            }
        });
    }

    // ============================================================
    // PRIVATE HELPER METHODS
    // ============================================================

    private async Task<MobileSubscription> GetOrCreateMobileSubscription(Guid userId, string platform)
    {
        var subscription = await _context.MobileSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId);

        if (subscription == null)
        {
            subscription = new MobileSubscription
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Platform = platform,
                Tier = "free",
                Status = "inactive",
                AutoRenew = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.MobileSubscriptions.Add(subscription);
        }

        return subscription;
    }

    private string? DetermineSubscriptionTier(string productId)
    {
        return ProductTierById.TryGetValue(productId, out var tier) ? tier : null;
    }

    private static bool IsMobileSubscriptionReplayConstraintViolation(DbUpdateException exception)
    {
        const string uniqueViolation = "23505";
        var constraintNames = new[]
        {
            "IX_MobileSubscriptions_TransactionId",
            "IX_MobileSubscriptions_OriginalTransactionId",
            "IX_MobileSubscriptions_PurchaseToken"
        };

        if (exception.InnerException is PostgresException postgresException &&
            postgresException.SqlState == uniqueViolation &&
            constraintNames.Contains(postgresException.ConstraintName, StringComparer.Ordinal))
        {
            return true;
        }

        var message = exception.InnerException?.Message ?? exception.Message;
        return constraintNames.Any(name => message.Contains(name, StringComparison.Ordinal));
    }

    private MobileSubscriptionPlanInfo? GetPlanInfoForTier(string tier)
    {
        return tier switch
        {
            "free" => new MobileSubscriptionPlanInfo
            {
                Id = "free",
                Tier = "free",
                DisplayName = "Free Plan",
                Description = "Basic features",
                MonthlyPrice = 0,
                YearlyPrice = 0,
                Features = new List<string> { "Basic Search", "Up to 3 Services" }
            },
            "basic" => new MobileSubscriptionPlanInfo
            {
                Id = "basic",
                Tier = "basic",
                DisplayName = "Basic Plan",
                Description = "Essential features",
                MonthlyPrice = 4.99m,
                YearlyPrice = 49.99m,
                Features = new List<string> { "Basic Search", "Unlimited Services", "Advanced Search", "VPN Recommendations" }
            },
            "premium" => new MobileSubscriptionPlanInfo
            {
                Id = "premium",
                Tier = "premium",
                DisplayName = "Premium Plan",
                Description = "Advanced features",
                MonthlyPrice = 9.99m,
                YearlyPrice = 99.99m,
                Features = new List<string> { "All Basic features", "Offline Downloads", "Ad-Free", "Priority Support" }
            },
            "pro" => new MobileSubscriptionPlanInfo
            {
                Id = "pro",
                Tier = "pro",
                DisplayName = "Pro Plan",
                Description = "Complete access",
                MonthlyPrice = 14.99m,
                YearlyPrice = 149.99m,
                Features = new List<string> { "All Premium features", "Family Sharing", "Early Access" }
            },
            _ => null
        };
    }
}
