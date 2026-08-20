using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Stripe;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for managing promotions with Stripe integration
/// </summary>
public class PromotionService : IPromotionService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PromotionService> _logger;
    private readonly CouponService _stripeCouponService;
    private readonly PromotionCodeService _stripePromotionCodeService;

    public PromotionService(
        ApplicationDbContext context,
        ILogger<PromotionService> logger)
    {
        _context = context;
        _logger = logger;
        _stripeCouponService = new CouponService();
        _stripePromotionCodeService = new PromotionCodeService();
    }

    #region Admin Operations

    public async Task<Models.Promotion> CreatePromotionAsync(CreatePromotionRequest request)
    {
        _logger.LogInformation("Creating promotion: {Name}", request.Name);

        // Create coupon in Stripe
        var couponOptions = new CouponCreateOptions
        {
            Name = request.Name,
            Duration = request.Duration,
            Metadata = request.Metadata?.ToDictionary(k => k.Key, v => v.Value)
        };

        if (request.PercentOff.HasValue)
        {
            couponOptions.PercentOff = request.PercentOff.Value;
        }
        else if (request.AmountOff.HasValue && !string.IsNullOrEmpty(request.Currency))
        {
            couponOptions.AmountOff = request.AmountOff.Value;
            couponOptions.Currency = request.Currency.ToLower();
        }

        if (request.Duration == "repeating" && request.DurationInMonths.HasValue)
        {
            couponOptions.DurationInMonths = request.DurationInMonths.Value;
        }

        if (request.MaxRedemptions.HasValue)
        {
            couponOptions.MaxRedemptions = request.MaxRedemptions.Value;
        }

        if (request.RedeemBy.HasValue)
        {
            couponOptions.RedeemBy = DateTimeOffset.FromUnixTimeSeconds(request.RedeemBy.Value).UtcDateTime;
        }

        Coupon stripeCoupon;
        try
        {
            stripeCoupon = await _stripeCouponService.CreateAsync(couponOptions);
            _logger.LogInformation("Created Stripe coupon: {CouponId}", stripeCoupon.Id);
        }
        catch (StripeException ex)
        {
            _logger.LogError(ex, "Failed to create Stripe coupon");
            throw new InvalidOperationException($"Failed to create Stripe coupon: {ex.Message}", ex);
        }

        // Create promotion code in Stripe if code is provided
        string? stripePromotionCodeId = null;
        if (!string.IsNullOrEmpty(request.Code))
        {
            var promoCodeOptions = new PromotionCodeCreateOptions
            {
                Coupon = stripeCoupon.Id,
                Code = request.Code.ToUpper(),
                Active = true
            };

            if (request.FirstTimeOnly)
            {
                promoCodeOptions.Restrictions = new PromotionCodeRestrictionsOptions
                {
                    FirstTimeTransaction = true
                };
            }

            if (request.MinimumAmount.HasValue && !string.IsNullOrEmpty(request.MinimumAmountCurrency))
            {
                promoCodeOptions.Restrictions ??= new PromotionCodeRestrictionsOptions();
                promoCodeOptions.Restrictions.MinimumAmount = request.MinimumAmount.Value;
                promoCodeOptions.Restrictions.MinimumAmountCurrency = request.MinimumAmountCurrency.ToLower();
            }

            if (request.MaxRedemptions.HasValue)
            {
                promoCodeOptions.MaxRedemptions = request.MaxRedemptions.Value;
            }

            try
            {
                var stripePromoCode = await _stripePromotionCodeService.CreateAsync(promoCodeOptions);
                stripePromotionCodeId = stripePromoCode.Id;
                _logger.LogInformation("Created Stripe promotion code: {PromoCodeId}", stripePromoCode.Id);
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Failed to create Stripe promotion code");
                // Clean up the coupon we just created
                await _stripeCouponService.DeleteAsync(stripeCoupon.Id);
                throw new InvalidOperationException($"Failed to create Stripe promotion code: {ex.Message}", ex);
            }
        }

        // Create local promotion record
        var promotion = new Models.Promotion
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Code = request.Code?.ToUpper(),
            Description = request.Description ?? string.Empty,
            StripeCouponId = stripeCoupon.Id,
            StripePromotionCodeId = stripePromotionCodeId,
            IsActive = true,
            MaxRedemptions = request.MaxRedemptions,
            CurrentRedemptions = 0,
            ExpiresAt = request.RedeemBy.HasValue
                ? DateTimeOffset.FromUnixTimeSeconds(request.RedeemBy.Value).UtcDateTime
                : null,
            PercentOff = request.PercentOff ?? 0,
            AmountOff = request.AmountOff.HasValue ? request.AmountOff.Value / 100m : null,
            AmountOffCurrency = request.Currency?.ToUpper(),
            Duration = request.Duration,
            DurationInMonths = request.DurationInMonths,
            TargetPlanType = request.TargetPlanType,
            FirstTimeOnly = request.FirstTimeOnly,
            AutoApply = request.AutoApply,
            AvailableOnMobile = request.AvailableOnMobile,
            AvailableOnWeb = request.AvailableOnWeb,
            MinimumAmount = request.MinimumAmount.HasValue ? request.MinimumAmount.Value / 100m : null,
            MinimumAmountCurrency = request.MinimumAmountCurrency?.ToUpper(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Promotions.Add(promotion);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created local promotion: {PromotionId}", promotion.Id);
        return promotion;
    }

    public async Task<Models.Promotion> UpdatePromotionAsync(Guid id, UpdatePromotionRequest request)
    {
        var promotion = await _context.Promotions.FindAsync(id);
        if (promotion == null)
        {
            throw new KeyNotFoundException($"Promotion not found: {id}");
        }

        // Update local fields that don't affect Stripe
        if (request.Name != null)
        {
            promotion.Name = request.Name;
        }

        if (request.Description != null)
        {
            promotion.Description = request.Description;
        }

        if (request.AvailableOnMobile.HasValue)
        {
            promotion.AvailableOnMobile = request.AvailableOnMobile.Value;
        }

        if (request.AvailableOnWeb.HasValue)
        {
            promotion.AvailableOnWeb = request.AvailableOnWeb.Value;
        }

        if (request.IsActive.HasValue)
        {
            await TogglePromotionAsync(id, request.IsActive.Value);
        }

        promotion.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return promotion;
    }

    public async Task<bool> TogglePromotionAsync(Guid id, bool isActive)
    {
        var promotion = await _context.Promotions.FindAsync(id);
        if (promotion == null)
        {
            throw new KeyNotFoundException($"Promotion not found: {id}");
        }

        // Update Stripe promotion code if exists
        if (!string.IsNullOrEmpty(promotion.StripePromotionCodeId))
        {
            try
            {
                await _stripePromotionCodeService.UpdateAsync(
                    promotion.StripePromotionCodeId,
                    new PromotionCodeUpdateOptions { Active = isActive });
                _logger.LogInformation("Updated Stripe promotion code {PromoCodeId} active={IsActive}",
                    promotion.StripePromotionCodeId, isActive);
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Failed to update Stripe promotion code {PromoCodeId}",
                    promotion.StripePromotionCodeId);
                throw new InvalidOperationException($"Failed to update Stripe promotion code: {ex.Message}", ex);
            }
        }

        promotion.IsActive = isActive;
        promotion.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task SyncFromStripeAsync()
    {
        _logger.LogInformation("Syncing promotions from Stripe");

        // Get all coupons from Stripe
        var coupons = await _stripeCouponService.ListAsync(new CouponListOptions { Limit = 100 });

        foreach (var stripeCoupon in coupons)
        {
            var existingPromotion = await _context.Promotions
                .FirstOrDefaultAsync(p => p.StripeCouponId == stripeCoupon.Id);

            if (existingPromotion == null)
            {
                // Create new local record
                var promotion = new Models.Promotion
                {
                    Id = Guid.NewGuid(),
                    Name = stripeCoupon.Name ?? stripeCoupon.Id,
                    StripeCouponId = stripeCoupon.Id,
                    IsActive = stripeCoupon.Valid,
                    MaxRedemptions = (int?)stripeCoupon.MaxRedemptions,
                    CurrentRedemptions = (int)stripeCoupon.TimesRedeemed,
                    ExpiresAt = stripeCoupon.RedeemBy,
                    PercentOff = (int)(stripeCoupon.PercentOff ?? 0),
                    AmountOff = stripeCoupon.AmountOff.HasValue ? stripeCoupon.AmountOff.Value / 100m : null,
                    AmountOffCurrency = stripeCoupon.Currency?.ToUpper(),
                    Duration = stripeCoupon.Duration,
                    DurationInMonths = (int?)stripeCoupon.DurationInMonths,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Promotions.Add(promotion);
                _logger.LogInformation("Added promotion from Stripe: {CouponId}", stripeCoupon.Id);
            }
            else
            {
                // Update existing record
                existingPromotion.IsActive = stripeCoupon.Valid;
                existingPromotion.CurrentRedemptions = (int)stripeCoupon.TimesRedeemed;
                existingPromotion.UpdatedAt = DateTime.UtcNow;
            }
        }

        // Sync promotion codes
        var promoCodes = await _stripePromotionCodeService.ListAsync(new PromotionCodeListOptions { Limit = 100 });

        foreach (var stripePromoCode in promoCodes)
        {
            var promotion = await _context.Promotions
                .FirstOrDefaultAsync(p => p.StripeCouponId == stripePromoCode.Coupon.Id);

            if (promotion != null)
            {
                promotion.Code = stripePromoCode.Code;
                promotion.StripePromotionCodeId = stripePromoCode.Id;
                promotion.FirstTimeOnly = stripePromoCode.Restrictions?.FirstTimeTransaction ?? false;
                promotion.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Sync from Stripe completed");
    }

    public async Task<List<PromotionDto>> GetAllPromotionsAsync()
    {
        return await _context.Promotions
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => MapToDto(p))
            .ToListAsync();
    }

    public async Task<PromotionDto?> GetPromotionAsync(Guid id)
    {
        var promotion = await _context.Promotions.FindAsync(id);
        return promotion != null ? MapToDto(promotion) : null;
    }

    public async Task<PromotionStatsDto?> GetPromotionStatsAsync(Guid id)
    {
        var promotion = await _context.Promotions
            .Include(p => p.Redemptions)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (promotion == null)
        {
            return null;
        }

        return new PromotionStatsDto
        {
            PromotionId = promotion.Id,
            Name = promotion.Name,
            Code = promotion.Code,
            TotalRedemptions = promotion.CurrentRedemptions,
            MaxRedemptions = promotion.MaxRedemptions,
            WebRedemptions = promotion.Redemptions.Count(r => r.Platform == "web"),
            IosRedemptions = promotion.Redemptions.Count(r => r.Platform == "ios"),
            AndroidRedemptions = promotion.Redemptions.Count(r => r.Platform == "android"),
            FirstRedemption = promotion.Redemptions.OrderBy(r => r.RedeemedAt).FirstOrDefault()?.RedeemedAt,
            LastRedemption = promotion.Redemptions.OrderByDescending(r => r.RedeemedAt).FirstOrDefault()?.RedeemedAt
        };
    }

    #endregion

    #region User Operations

    public async Task<List<PromotionDto>> GetActivePromotionsAsync(string? platform = null)
    {
        var query = _context.Promotions
            .Where(p => p.IsActive)
            .Where(p => !p.ExpiresAt.HasValue || p.ExpiresAt > DateTime.UtcNow)
            .Where(p => !p.MaxRedemptions.HasValue || p.CurrentRedemptions < p.MaxRedemptions);

        if (platform == "ios" || platform == "android")
        {
            query = query.Where(p => p.AvailableOnMobile);
        }
        else if (platform == "web")
        {
            query = query.Where(p => p.AvailableOnWeb);
        }

        return await query
            .OrderByDescending(p => p.PercentOff)
            .ThenByDescending(p => p.DurationInMonths)
            .Select(p => MapToDto(p))
            .ToListAsync();
    }

    public async Task<PromotionDto?> GetPromotionByCodeAsync(string code)
    {
        var promotion = await _context.Promotions
            .FirstOrDefaultAsync(p => p.Code == code.ToUpper());

        return promotion != null ? MapToDto(promotion) : null;
    }

    public async Task<ValidatePromotionResult> ValidatePromotionForUserAsync(string code, Guid userId, string platform = "web")
    {
        var promotion = await _context.Promotions
            .FirstOrDefaultAsync(p => p.Code == code.ToUpper());

        if (promotion == null)
        {
            return new ValidatePromotionResult
            {
                IsValid = false,
                ErrorMessage = "Invalid promotion code"
            };
        }

        // Check if promotion is active
        if (!promotion.IsActive)
        {
            return new ValidatePromotionResult
            {
                IsValid = false,
                ErrorMessage = "This promotion is no longer active"
            };
        }

        // Check if promotion has expired
        if (promotion.ExpiresAt.HasValue && promotion.ExpiresAt < DateTime.UtcNow)
        {
            return new ValidatePromotionResult
            {
                IsValid = false,
                ErrorMessage = "This promotion has expired"
            };
        }

        // Check if promotion has reached max redemptions
        if (promotion.MaxRedemptions.HasValue && promotion.CurrentRedemptions >= promotion.MaxRedemptions)
        {
            return new ValidatePromotionResult
            {
                IsValid = false,
                ErrorMessage = "This promotion has reached its redemption limit"
            };
        }

        // Check platform availability
        if ((platform == "ios" || platform == "android") && !promotion.AvailableOnMobile)
        {
            return new ValidatePromotionResult
            {
                IsValid = false,
                ErrorMessage = "This promotion is not available on mobile"
            };
        }

        if (platform == "web" && !promotion.AvailableOnWeb)
        {
            return new ValidatePromotionResult
            {
                IsValid = false,
                ErrorMessage = "This promotion is not available on web"
            };
        }

        // Check if user has already redeemed this promotion
        var existingRedemption = await _context.PromotionRedemptions
            .AnyAsync(r => r.PromotionId == promotion.Id && r.UserId == userId);

        if (existingRedemption)
        {
            return new ValidatePromotionResult
            {
                IsValid = false,
                ErrorMessage = "You have already used this promotion"
            };
        }

        // Check first-time only restriction
        if (promotion.FirstTimeOnly)
        {
            var hasExistingSubscription = await _context.Subscriptions
                .AnyAsync(s => s.UserId == userId && s.Status == "active");

            var hasMobileSubscription = await _context.MobileSubscriptions
                .AnyAsync(m => m.UserId == userId && m.Status == "active");

            if (hasExistingSubscription || hasMobileSubscription)
            {
                return new ValidatePromotionResult
                {
                    IsValid = false,
                    ErrorMessage = "This promotion is only available for first-time subscribers"
                };
            }
        }

        return new ValidatePromotionResult
        {
            IsValid = true,
            Promotion = MapToDto(promotion)
        };
    }

    public async Task<RedeemPromotionResult> RedeemPromotionAsync(
        Guid userId,
        RedeemPromotionRequest request,
        string? ipAddress = null,
        string? userAgent = null)
    {
        // Validate the promotion
        var validation = await ValidatePromotionForUserAsync(request.Code, userId, request.Platform);
        if (!validation.IsValid)
        {
            return new RedeemPromotionResult
            {
                Success = false,
                ErrorMessage = validation.ErrorMessage
            };
        }

        var promotion = await _context.Promotions
            .FirstOrDefaultAsync(p => p.Code == request.Code.ToUpper());

        if (promotion == null)
        {
            return new RedeemPromotionResult
            {
                Success = false,
                ErrorMessage = "Promotion not found"
            };
        }

        // For web users, just return the Stripe promotion code ID
        if (request.Platform == "web")
        {
            // Record the redemption (will be updated by webhook when subscription is created)
            var redemption = new PromotionRedemption
            {
                Id = Guid.NewGuid(),
                PromotionId = promotion.Id,
                UserId = userId,
                Platform = "web",
                IpAddress = ipAddress,
                UserAgent = userAgent,
                RedeemedAt = DateTime.UtcNow
            };

            _context.PromotionRedemptions.Add(redemption);
            promotion.CurrentRedemptions++;
            promotion.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new RedeemPromotionResult
            {
                Success = true,
                StripePromotionCodeId = promotion.StripePromotionCodeId,
                Redemption = new PromotionRedemptionDto
                {
                    Id = redemption.Id,
                    PromotionId = promotion.Id,
                    PromotionName = promotion.Name,
                    PromotionCode = promotion.Code,
                    RedeemedAt = redemption.RedeemedAt,
                    Platform = redemption.Platform
                }
            };
        }

        // For mobile users, grant server-side access
        var mobileSubscription = await _context.MobileSubscriptions
            .FirstOrDefaultAsync(m => m.UserId == userId && m.Platform == request.Platform);

        var accessEnd = DateTime.UtcNow;
        if (promotion.Duration == "once" || promotion.Duration == "forever")
        {
            // For "once" or "forever", grant 1 month as a starting point
            accessEnd = DateTime.UtcNow.AddMonths(1);
        }
        else if (promotion.Duration == "repeating" && promotion.DurationInMonths.HasValue)
        {
            accessEnd = DateTime.UtcNow.AddMonths(promotion.DurationInMonths.Value);
        }

        if (mobileSubscription == null)
        {
            mobileSubscription = new MobileSubscription
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Platform = request.Platform,
                Tier = promotion.TargetPlanType ?? "premium",
                Status = "active",
                IsPromotionalAccess = true,
                PromotionId = promotion.Id,
                PromotionalAccessStart = DateTime.UtcNow,
                PromotionalAccessEnd = accessEnd,
                StartDate = DateTime.UtcNow,
                EndDate = accessEnd,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.MobileSubscriptions.Add(mobileSubscription);
        }
        else
        {
            mobileSubscription.Tier = promotion.TargetPlanType ?? "premium";
            mobileSubscription.Status = "active";
            mobileSubscription.IsPromotionalAccess = true;
            mobileSubscription.PromotionId = promotion.Id;
            mobileSubscription.PromotionalAccessStart = DateTime.UtcNow;
            mobileSubscription.PromotionalAccessEnd = accessEnd;
            mobileSubscription.EndDate = accessEnd;
            mobileSubscription.UpdatedAt = DateTime.UtcNow;
        }

        // Record the redemption
        var mobileRedemption = new PromotionRedemption
        {
            Id = Guid.NewGuid(),
            PromotionId = promotion.Id,
            UserId = userId,
            Platform = request.Platform,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            RedeemedAt = DateTime.UtcNow
        };

        _context.PromotionRedemptions.Add(mobileRedemption);
        promotion.CurrentRedemptions++;
        promotion.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Redeemed promotion {PromotionId} for user {UserId} on {Platform}",
            promotion.Id, userId, request.Platform);

        return new RedeemPromotionResult
        {
            Success = true,
            GrantedTier = promotion.TargetPlanType ?? "premium",
            AccessExpiresAt = accessEnd,
            Redemption = new PromotionRedemptionDto
            {
                Id = mobileRedemption.Id,
                PromotionId = promotion.Id,
                PromotionName = promotion.Name,
                PromotionCode = promotion.Code,
                RedeemedAt = mobileRedemption.RedeemedAt,
                Platform = mobileRedemption.Platform
            }
        };
    }

    public async Task<List<PromotionRedemptionDto>> GetUserRedemptionsAsync(Guid userId)
    {
        return await _context.PromotionRedemptions
            .Include(r => r.Promotion)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.RedeemedAt)
            .Select(r => new PromotionRedemptionDto
            {
                Id = r.Id,
                PromotionId = r.PromotionId,
                PromotionName = r.Promotion.Name,
                PromotionCode = r.Promotion.Code,
                RedeemedAt = r.RedeemedAt,
                Platform = r.Platform
            })
            .ToListAsync();
    }

    #endregion

    #region Webhook Handlers

    public async Task HandleStripeCouponEventAsync(string eventType, string couponId, object? couponData = null)
    {
        _logger.LogInformation("Handling Stripe coupon event: {EventType} for {CouponId}", eventType, couponId);

        var promotion = await _context.Promotions
            .FirstOrDefaultAsync(p => p.StripeCouponId == couponId);

        switch (eventType)
        {
            case "coupon.created":
            case "coupon.updated":
                if (couponData is Coupon coupon)
                {
                    if (promotion == null)
                    {
                        promotion = new Models.Promotion
                        {
                            Id = Guid.NewGuid(),
                            StripeCouponId = couponId,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.Promotions.Add(promotion);
                    }

                    promotion.Name = coupon.Name ?? coupon.Id;
                    promotion.IsActive = coupon.Valid;
                    promotion.MaxRedemptions = (int?)coupon.MaxRedemptions;
                    promotion.CurrentRedemptions = (int)coupon.TimesRedeemed;
                    promotion.ExpiresAt = coupon.RedeemBy;
                    promotion.PercentOff = (int)(coupon.PercentOff ?? 0);
                    promotion.AmountOff = coupon.AmountOff.HasValue ? coupon.AmountOff.Value / 100m : null;
                    promotion.AmountOffCurrency = coupon.Currency?.ToUpper();
                    promotion.Duration = coupon.Duration;
                    promotion.DurationInMonths = (int?)coupon.DurationInMonths;
                    promotion.UpdatedAt = DateTime.UtcNow;
                }
                break;

            case "coupon.deleted":
                if (promotion != null)
                {
                    promotion.IsActive = false;
                    promotion.UpdatedAt = DateTime.UtcNow;
                }
                break;
        }

        await _context.SaveChangesAsync();
    }

    public async Task HandleStripePromotionCodeEventAsync(string eventType, string promotionCodeId, object? promotionCodeData = null)
    {
        _logger.LogInformation("Handling Stripe promotion code event: {EventType} for {PromoCodeId}", eventType, promotionCodeId);

        if (promotionCodeData is Stripe.PromotionCode promoCode)
        {
            var promotion = await _context.Promotions
                .FirstOrDefaultAsync(p => p.StripeCouponId == promoCode.Coupon.Id);

            if (promotion != null)
            {
                promotion.Code = promoCode.Code;
                promotion.StripePromotionCodeId = promoCode.Id;
                promotion.IsActive = promoCode.Active;
                promotion.FirstTimeOnly = promoCode.Restrictions?.FirstTimeTransaction ?? false;
                promotion.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
    }

    public async Task RecordStripeRedemptionAsync(string stripeSubscriptionId, string? stripePromotionCodeId, Guid userId)
    {
        if (string.IsNullOrEmpty(stripePromotionCodeId))
        {
            return;
        }

        var promotion = await _context.Promotions
            .FirstOrDefaultAsync(p => p.StripePromotionCodeId == stripePromotionCodeId);

        if (promotion == null)
        {
            _logger.LogWarning("Promotion not found for Stripe promotion code: {PromoCodeId}", stripePromotionCodeId);
            return;
        }

        // Check if already recorded
        var existingRedemption = await _context.PromotionRedemptions
            .AnyAsync(r => r.PromotionId == promotion.Id && r.UserId == userId);

        if (!existingRedemption)
        {
            var redemption = new PromotionRedemption
            {
                Id = Guid.NewGuid(),
                PromotionId = promotion.Id,
                UserId = userId,
                Platform = "web",
                StripeSubscriptionId = stripeSubscriptionId,
                RedeemedAt = DateTime.UtcNow
            };

            _context.PromotionRedemptions.Add(redemption);
            promotion.CurrentRedemptions++;
            promotion.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Recorded Stripe redemption for promotion {PromotionId}, user {UserId}",
                promotion.Id, userId);
        }
    }

    #endregion

    #region Helpers

    private static PromotionDto MapToDto(Models.Promotion promotion)
    {
        return new PromotionDto
        {
            Id = promotion.Id,
            Name = promotion.Name,
            Code = promotion.Code,
            Description = promotion.Description,
            IsActive = promotion.IsActive,
            MaxRedemptions = promotion.MaxRedemptions,
            CurrentRedemptions = promotion.CurrentRedemptions,
            ExpiresAt = promotion.ExpiresAt,
            PercentOff = promotion.PercentOff,
            AmountOff = promotion.AmountOff,
            AmountOffCurrency = promotion.AmountOffCurrency,
            Duration = promotion.Duration,
            DurationInMonths = promotion.DurationInMonths,
            TargetPlanType = promotion.TargetPlanType,
            FirstTimeOnly = promotion.FirstTimeOnly,
            AutoApply = promotion.AutoApply,
            AvailableOnMobile = promotion.AvailableOnMobile,
            AvailableOnWeb = promotion.AvailableOnWeb,
            CreatedAt = promotion.CreatedAt
        };
    }

    #endregion
}
