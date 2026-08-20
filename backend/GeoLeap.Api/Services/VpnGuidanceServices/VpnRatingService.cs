using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services.VpnGuidanceServices;

public class VpnRatingService : IVpnRatingService
{
    private readonly ApplicationDbContext _context;
    private readonly IVpnAnalyticsService _analyticsService;
    private readonly ILogger<VpnRatingService> _logger;

    public VpnRatingService(
        ApplicationDbContext context,
        IVpnAnalyticsService analyticsService,
        ILogger<VpnRatingService> logger)
    {
        _context = context;
        _analyticsService = analyticsService;
        _logger = logger;
    }

    public async Task<VpnProviderRating?> GetRatingAsync(Guid userId, Guid providerId, CancellationToken cancellationToken = default)
    {
        return await _context.VpnProviderRatings
            .FirstOrDefaultAsync(r => r.UserId == userId && r.VpnProviderId == providerId, cancellationToken);
    }

    public async Task<IEnumerable<VpnProviderRating>> GetProviderRatingsAsync(Guid providerId, int pageSize = 20, int pageNumber = 1, CancellationToken cancellationToken = default)
    {
        return await _context.VpnProviderRatings
            .Where(r => r.VpnProviderId == providerId)
            .Include(r => r.User)
            .OrderByDescending(r => r.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<VpnProviderRating>> GetUserRatingsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.VpnProviderRatings
            .Where(r => r.UserId == userId)
            .Include(r => r.VpnProvider)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<VpnProviderRating?> SubmitRatingAsync(Guid userId, VpnRatingDto rating, CancellationToken cancellationToken = default)
    {
        try
        {
            // BUG FIX: P8-B3 - Validate rating values are within valid range (1-5)
            if (!ValidateRatingValues(rating))
            {
                _logger.LogWarning("Invalid rating values submitted by user {UserId} for provider {ProviderId}", userId, rating.VpnProviderId);
                return null;
            }

            var existingRating = await GetRatingAsync(userId, rating.VpnProviderId, cancellationToken);

            if (existingRating != null)
            {
                // Update existing rating
                return await UpdateRatingAsync(userId, rating.VpnProviderId, rating, cancellationToken);
            }

            // Create new rating
            var newRating = new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                VpnProviderId = rating.VpnProviderId,
                UserId = userId,
                RatingType = rating.RatingType,
                Rating = rating.Rating,
                Review = rating.Review,
                SpeedRating = rating.SpeedRating,
                ReliabilityRating = rating.ReliabilityRating,
                EaseOfUseRating = rating.EaseOfUseRating,
                CustomerSupportRating = rating.CustomerSupportRating,
                ValueForMoneyRating = rating.ValueForMoneyRating,
                CreatedAt = DateTime.UtcNow,
                IsVerified = false,
                IsHelpful = false,
                HelpfulVotes = 0,
                UnhelpfulVotes = 0
            };

            _context.VpnProviderRatings.Add(newRating);
            await _context.SaveChangesAsync(cancellationToken);

            // Recalculate provider ratings
            await RecalculateProviderRatingsAsync(rating.VpnProviderId, cancellationToken);

            // Track analytics
            await _analyticsService.TrackEventAsync(
                VpnGuidanceEventType.ProviderRated,
                userId,
                rating.VpnProviderId,
                additionalData: new Dictionary<string, object> { ["rating"] = rating.Rating },
                cancellationToken: cancellationToken);

            return newRating;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting rating for provider {ProviderId} by user {UserId}", rating.VpnProviderId, userId);
            return null;
        }
    }

    public async Task<VpnProviderRating?> UpdateRatingAsync(Guid userId, Guid providerId, VpnRatingDto rating, CancellationToken cancellationToken = default)
    {
        try
        {
            // BUG FIX: P8-B3 - Validate rating values are within valid range (1-5)
            if (!ValidateRatingValues(rating))
            {
                _logger.LogWarning("Invalid rating values in update by user {UserId} for provider {ProviderId}", userId, providerId);
                return null;
            }

            var existingRating = await GetRatingAsync(userId, providerId, cancellationToken);
            if (existingRating == null)
            {
                return await SubmitRatingAsync(userId, rating, cancellationToken);
            }

            existingRating.RatingType = rating.RatingType;
            existingRating.Rating = rating.Rating;
            existingRating.Review = rating.Review;
            existingRating.SpeedRating = rating.SpeedRating;
            existingRating.ReliabilityRating = rating.ReliabilityRating;
            existingRating.EaseOfUseRating = rating.EaseOfUseRating;
            existingRating.CustomerSupportRating = rating.CustomerSupportRating;
            existingRating.ValueForMoneyRating = rating.ValueForMoneyRating;
            existingRating.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            await RecalculateProviderRatingsAsync(providerId, cancellationToken);

            return existingRating;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating rating for provider {ProviderId} by user {UserId}", providerId, userId);
            return null;
        }
    }

    public async Task<bool> DeleteRatingAsync(Guid userId, Guid providerId, CancellationToken cancellationToken = default)
    {
        try
        {
            var rating = await GetRatingAsync(userId, providerId, cancellationToken);
            if (rating == null)
            {
                return false;
            }

            _context.VpnProviderRatings.Remove(rating);
            await _context.SaveChangesAsync(cancellationToken);
            await RecalculateProviderRatingsAsync(providerId, cancellationToken);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting rating for provider {ProviderId} by user {UserId}", providerId, userId);
            return false;
        }
    }

    public async Task<Dictionary<string, object>> GetRatingStatsAsync(Guid providerId, CancellationToken cancellationToken = default)
    {
        try
        {
            var ratings = await _context.VpnProviderRatings
                .Where(r => r.VpnProviderId == providerId)
                .ToListAsync(cancellationToken);

            if (!ratings.Any())
            {
                return new Dictionary<string, object>
                {
                    ["totalRatings"] = 0,
                    ["averageRating"] = 0,
                    ["ratingDistribution"] = new Dictionary<int, int>()
                };
            }

            var totalRatings = ratings.Count;
            var averageRating = ratings.Average(r => r.Rating);

            var distribution = new Dictionary<int, int>();
            for (int i = 1; i <= 5; i++)
            {
                distribution[i] = ratings.Count(r => r.Rating == i);
            }

            // BUG FIX: P8-B1 - Added .Any() checks to prevent InvalidOperationException on empty sequences
            var speedRatings = ratings.Where(r => r.SpeedRating.HasValue);
            var reliabilityRatings = ratings.Where(r => r.ReliabilityRating.HasValue);
            var easeOfUseRatings = ratings.Where(r => r.EaseOfUseRating.HasValue);
            var customerSupportRatings = ratings.Where(r => r.CustomerSupportRating.HasValue);

            var averageSpeed = speedRatings.Any() ? speedRatings.Average(r => r.SpeedRating!.Value) : 0.0;
            var averageReliability = reliabilityRatings.Any() ? reliabilityRatings.Average(r => r.ReliabilityRating!.Value) : 0.0;
            var averageEaseOfUse = easeOfUseRatings.Any() ? easeOfUseRatings.Average(r => r.EaseOfUseRating!.Value) : 0.0;
            var averageCustomerSupport = customerSupportRatings.Any() ? customerSupportRatings.Average(r => r.CustomerSupportRating!.Value) : 0.0;

            return new Dictionary<string, object>
            {
                ["totalRatings"] = totalRatings,
                ["averageRating"] = Math.Round(averageRating, 2),
                ["ratingDistribution"] = distribution,
                ["categoryAverages"] = new Dictionary<string, double>
                {
                    ["speed"] = Math.Round(averageSpeed, 2),
                    ["reliability"] = Math.Round(averageReliability, 2),
                    ["easeOfUse"] = Math.Round(averageEaseOfUse, 2),
                    ["customerSupport"] = Math.Round(averageCustomerSupport, 2)
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting rating stats for provider {ProviderId}", providerId);
            return new Dictionary<string, object>();
        }
    }

    public async Task RecalculateProviderRatingsAsync(Guid providerId, CancellationToken cancellationToken = default)
    {
        try
        {
            var provider = await _context.VpnProviders.FindAsync(providerId, cancellationToken);
            if (provider == null) return;

            var ratings = await _context.VpnProviderRatings
                .Where(r => r.VpnProviderId == providerId)
                .ToListAsync(cancellationToken);

            provider.TotalRatings = ratings.Count;
            
            if (ratings.Any())
            {
                provider.OverallRating = Math.Round(ratings.Average(r => r.Rating), 2);
                
                // Update specific rating categories
                if (ratings.Any(r => r.SpeedRating.HasValue))
                    provider.AverageSpeedRating = Math.Round(ratings.Where(r => r.SpeedRating.HasValue).Average(r => r.SpeedRating!.Value), 2);
                
                if (ratings.Any(r => r.ReliabilityRating.HasValue))
                    provider.ReliabilityRating = Math.Round(ratings.Where(r => r.ReliabilityRating.HasValue).Average(r => r.ReliabilityRating!.Value), 2);
                
                if (ratings.Any(r => r.EaseOfUseRating.HasValue))
                    provider.EaseOfUseRating = Math.Round(ratings.Where(r => r.EaseOfUseRating.HasValue).Average(r => r.EaseOfUseRating!.Value), 2);
                
                if (ratings.Any(r => r.CustomerSupportRating.HasValue))
                    provider.CustomerSupportRating = Math.Round(ratings.Where(r => r.CustomerSupportRating.HasValue).Average(r => r.CustomerSupportRating!.Value), 2);
            }
            else
            {
                provider.OverallRating = null;
                provider.AverageSpeedRating = null;
                provider.ReliabilityRating = null;
                provider.EaseOfUseRating = null;
                provider.CustomerSupportRating = null;
            }

            provider.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recalculating ratings for provider {ProviderId}", providerId);
        }
    }

    public async Task RecalculateAllProviderRatingsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var providerIds = await _context.VpnProviders
                .Where(p => p.IsActive)
                .Select(p => p.Id)
                .ToListAsync(cancellationToken);

            foreach (var providerId in providerIds)
            {
                await RecalculateProviderRatingsAsync(providerId, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recalculating all provider ratings");
        }
    }

    public async Task<bool> VoteRatingHelpfulnessAsync(Guid ratingId, Guid voterId, bool isHelpful, CancellationToken cancellationToken = default)
    {
        try
        {
            var rating = await _context.VpnProviderRatings.FindAsync(ratingId, cancellationToken);
            if (rating == null)
            {
                return false;
            }

            // In a full implementation, you'd track individual votes to prevent duplicate voting
            // For now, just increment the counters
            if (isHelpful)
            {
                rating.HelpfulVotes++;
            }
            else
            {
                rating.UnhelpfulVotes++;
            }

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error voting on rating helpfulness for rating {RatingId}", ratingId);
            return false;
        }
    }

    #region Private Helper Methods

    /// <summary>
    /// BUG FIX: P8-B3 - Validates that all rating values are within the valid range (1-5)
    /// </summary>
    private static bool ValidateRatingValues(VpnRatingDto rating)
    {
        // Main rating must be between 1 and 5
        if (rating.Rating < 1 || rating.Rating > 5)
        {
            return false;
        }

        // Optional sub-ratings must be between 1 and 5 if provided
        if (rating.SpeedRating.HasValue && (rating.SpeedRating.Value < 1 || rating.SpeedRating.Value > 5))
        {
            return false;
        }

        if (rating.ReliabilityRating.HasValue && (rating.ReliabilityRating.Value < 1 || rating.ReliabilityRating.Value > 5))
        {
            return false;
        }

        if (rating.EaseOfUseRating.HasValue && (rating.EaseOfUseRating.Value < 1 || rating.EaseOfUseRating.Value > 5))
        {
            return false;
        }

        if (rating.CustomerSupportRating.HasValue && (rating.CustomerSupportRating.Value < 1 || rating.CustomerSupportRating.Value > 5))
        {
            return false;
        }

        if (rating.ValueForMoneyRating.HasValue && (rating.ValueForMoneyRating.Value < 1 || rating.ValueForMoneyRating.Value > 5))
        {
            return false;
        }

        return true;
    }

    #endregion
}