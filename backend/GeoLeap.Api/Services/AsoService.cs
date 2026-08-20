using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Globalization;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Services;

/// <summary>
/// ASO (App Store Optimization) service with ML-powered keyword discovery and comprehensive analytics
/// </summary>
public class AsoService : IAsoService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AsoService> _logger;
    private readonly HttpClient _httpClient;
    private readonly Random _random = new();

    public AsoService(ApplicationDbContext context, ILogger<AsoService> logger, HttpClient httpClient)
    {
        _context = context;
        _logger = logger;
        _httpClient = httpClient;
    }

    #region Keyword Management

    public async Task<List<AsoKeywordDto>> GetKeywordsAsync(Guid userId, AppStore? appStore = null, string? country = null)
    {
        try
        {
            var query = _context.AsoKeywords
                .Where(k => k.UserId == userId)
                .AsQueryable();

            if (appStore.HasValue)
                query = query.Where(k => k.AppStore == appStore.Value);

            if (!string.IsNullOrEmpty(country))
                query = query.Where(k => k.Country == country);

            var keywords = await query
                .Include(k => k.Rankings.Take(10))
                .OrderByDescending(k => k.LastUpdated)
                .Select(k => new AsoKeywordDto
                {
                    Id = k.Id,
                    Keyword = k.Keyword,
                    AppStore = k.AppStore,
                    Country = k.Country,
                    Language = k.Language,
                    SearchVolume = k.SearchVolume,
                    Difficulty = k.Difficulty,
                    Relevance = k.Relevance,
                    ConversionPotential = k.ConversionPotential,
                    CurrentRank = k.CurrentRank,
                    BestRank = k.BestRank,
                    PreviousRank = k.PreviousRank,
                    CompetitionDensity = k.CompetitionDensity,
                    TopCompetitors = k.TopCompetitors,
                    Source = k.Source,
                    Status = k.Status,
                    CreatedAt = k.CreatedAt,
                    LastUpdated = k.LastUpdated
                })
                .ToListAsync();

            _logger.LogInformation("Retrieved {Count} keywords for user {UserId}", keywords.Count, userId);
            return keywords;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving keywords for user {UserId}", userId);
            throw;
        }
    }

    public async Task<AsoKeywordDto> GetKeywordAsync(int id, Guid userId)
    {
        try
        {
            var keyword = await _context.AsoKeywords
                .Where(k => k.Id == id && k.UserId == userId)
                .Include(k => k.Rankings.OrderByDescending(r => r.RankedAt).Take(30))
                .Select(k => new AsoKeywordDto
                {
                    Id = k.Id,
                    Keyword = k.Keyword,
                    AppStore = k.AppStore,
                    Country = k.Country,
                    Language = k.Language,
                    SearchVolume = k.SearchVolume,
                    Difficulty = k.Difficulty,
                    Relevance = k.Relevance,
                    ConversionPotential = k.ConversionPotential,
                    CurrentRank = k.CurrentRank,
                    BestRank = k.BestRank,
                    PreviousRank = k.PreviousRank,
                    CompetitionDensity = k.CompetitionDensity,
                    TopCompetitors = k.TopCompetitors,
                    Source = k.Source,
                    Status = k.Status,
                    CreatedAt = k.CreatedAt,
                    LastUpdated = k.LastUpdated
                })
                .FirstOrDefaultAsync();

            if (keyword == null)
                throw new KeyNotFoundException($"Keyword {id} not found for user {userId}");

            return keyword;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving keyword {Id} for user {UserId}", id, userId);
            throw;
        }
    }

    public async Task<AsoKeywordDto> CreateKeywordAsync(CreateAsoKeywordDto dto, Guid userId)
    {
        try
        {
            // Check for duplicates
            var existingKeyword = await _context.AsoKeywords
                .FirstOrDefaultAsync(k => k.Keyword == dto.Keyword && k.AppStore == dto.AppStore && k.Country == dto.Country && k.UserId == userId);

            if (existingKeyword != null)
                throw new InvalidOperationException($"Keyword '{dto.Keyword}' already exists for {dto.AppStore} in {dto.Country}");

            var keyword = new AsoKeyword
            {
                Keyword = dto.Keyword,
                AppStore = dto.AppStore,
                Country = dto.Country,
                Language = dto.Language,
                Source = dto.Source,
                Status = dto.Status,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            };

            // Initialize with ML-powered metrics
            await EnrichKeywordWithMlMetricsAsync(keyword);

            _context.AsoKeywords.Add(keyword);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created keyword '{Keyword}' for user {UserId}", dto.Keyword, userId);

            return new AsoKeywordDto
            {
                Id = keyword.Id,
                Keyword = keyword.Keyword,
                AppStore = keyword.AppStore,
                Country = keyword.Country,
                Language = keyword.Language,
                SearchVolume = keyword.SearchVolume,
                Difficulty = keyword.Difficulty,
                Relevance = keyword.Relevance,
                ConversionPotential = keyword.ConversionPotential,
                CurrentRank = keyword.CurrentRank,
                BestRank = keyword.BestRank,
                PreviousRank = keyword.PreviousRank,
                CompetitionDensity = keyword.CompetitionDensity,
                TopCompetitors = keyword.TopCompetitors,
                Source = keyword.Source,
                Status = keyword.Status,
                CreatedAt = keyword.CreatedAt,
                LastUpdated = keyword.LastUpdated
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating keyword '{Keyword}' for user {UserId}", dto.Keyword, userId);
            throw;
        }
    }

    public async Task<AsoKeywordDto> UpdateKeywordAsync(int id, CreateAsoKeywordDto dto, Guid userId)
    {
        try
        {
            var keyword = await _context.AsoKeywords
                .FirstOrDefaultAsync(k => k.Id == id && k.UserId == userId);

            if (keyword == null)
                throw new KeyNotFoundException($"Keyword {id} not found for user {userId}");

            keyword.Keyword = dto.Keyword;
            keyword.AppStore = dto.AppStore;
            keyword.Country = dto.Country;
            keyword.Language = dto.Language;
            keyword.Source = dto.Source;
            keyword.Status = dto.Status;
            keyword.LastUpdated = DateTime.UtcNow;

            // Re-analyze with updated info
            await EnrichKeywordWithMlMetricsAsync(keyword);

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated keyword {Id} for user {UserId}", id, userId);

            return await GetKeywordAsync(id, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating keyword {Id} for user {UserId}", id, userId);
            throw;
        }
    }

    public async Task<bool> DeleteKeywordAsync(int id, Guid userId)
    {
        try
        {
            var keyword = await _context.AsoKeywords
                .Include(k => k.Rankings)
                .FirstOrDefaultAsync(k => k.Id == id && k.UserId == userId);

            if (keyword == null)
                return false;

            _context.KeywordRankings.RemoveRange(keyword.Rankings);
            _context.AsoKeywords.Remove(keyword);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted keyword {Id} for user {UserId}", id, userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting keyword {Id} for user {UserId}", id, userId);
            throw;
        }
    }

    #endregion

    #region ML-Powered Keyword Discovery

    public async Task<List<AsoKeywordDto>> DiscoverKeywordsAsync(KeywordDiscoveryRequestDto request, Guid userId)
    {
        try
        {
            _logger.LogInformation("Starting keyword discovery for user {UserId} with seeds: {SeedKeywords}", userId, request.SeedKeywords);

            var seedKeywords = request.SeedKeywords
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(k => k.Trim().ToLowerInvariant())
                .ToList();

            var discoveredKeywords = new List<AsoKeyword>();

            // 1. Semantic expansion using word associations
            var semanticKeywords = await GenerateSemanticVariationsAsync(seedKeywords, request.Language);
            discoveredKeywords.AddRange(semanticKeywords);

            // 2. Competitor analysis if bundle IDs provided
            if (!string.IsNullOrEmpty(request.CompetitorBundleIds))
            {
                var competitorIds = request.CompetitorBundleIds.Split(',', StringSplitOptions.RemoveEmptyEntries);
                foreach (var bundleId in competitorIds)
                {
                    var competitorKeywords = await AnalyzeCompetitorAppAsync(bundleId.Trim(), request.AppStore, request.Country);
                    discoveredKeywords.AddRange(competitorKeywords);
                }
            }

            // 3. Trend-based keyword generation
            var trendKeywords = await GenerateTrendBasedKeywordsAsync(seedKeywords, request.AppStore, request.Country);
            discoveredKeywords.AddRange(trendKeywords);

            // 4. Long-tail keyword generation
            var longTailKeywords = await GenerateLongTailKeywordsAsync(seedKeywords, request.Language);
            discoveredKeywords.AddRange(longTailKeywords);

            // 5. Filter and rank by relevance
            // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
            var filteredKeywords = discoveredKeywords
                .GroupBy(k => k.Keyword.ToLowerInvariant())
                .Select(g => g.FirstOrDefault())
                .Where(k => k != null && k.Relevance >= request.MinRelevance)
                .OrderByDescending(k => k.ConversionPotential)
                .ThenByDescending(k => k.Relevance)
                .ThenBy(k => k.Difficulty)
                .Take(request.MaxResults)
                .ToList();

            // 6. Enrich with additional metrics
            foreach (var keyword in filteredKeywords)
            {
                keyword.UserId = userId;
                keyword.Source = KeywordSource.MLDiscovery;
                await EnrichKeywordWithMlMetricsAsync(keyword);
            }

            _logger.LogInformation("Discovered {Count} keywords from {SeedCount} seeds for user {UserId}", 
                filteredKeywords.Count, seedKeywords.Count, userId);

            return filteredKeywords.Select(k => new AsoKeywordDto
            {
                Id = k.Id,
                Keyword = k.Keyword,
                AppStore = k.AppStore,
                Country = k.Country,
                Language = k.Language,
                SearchVolume = k.SearchVolume,
                Difficulty = k.Difficulty,
                Relevance = k.Relevance,
                ConversionPotential = k.ConversionPotential,
                CurrentRank = k.CurrentRank,
                BestRank = k.BestRank,
                PreviousRank = k.PreviousRank,
                CompetitionDensity = k.CompetitionDensity,
                TopCompetitors = k.TopCompetitors,
                Source = k.Source,
                Status = k.Status,
                CreatedAt = k.CreatedAt,
                LastUpdated = k.LastUpdated
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in keyword discovery for user {UserId}", userId);
            throw;
        }
    }

    public async Task<List<AsoKeywordDto>> AnalyzeCompetitorKeywordsAsync(string bundleId, AppStore appStore, string country, Guid userId)
    {
        try
        {
            _logger.LogInformation("Analyzing competitor keywords for bundle {BundleId}", bundleId);

            var competitorKeywords = await AnalyzeCompetitorAppAsync(bundleId, appStore, country);

            // Enrich with user context
            foreach (var keyword in competitorKeywords)
            {
                keyword.UserId = userId;
                keyword.Source = KeywordSource.CompetitorAnalysis;
                await EnrichKeywordWithMlMetricsAsync(keyword);
            }

            return competitorKeywords.Select(k => new AsoKeywordDto
            {
                Id = k.Id,
                Keyword = k.Keyword,
                AppStore = k.AppStore,
                Country = k.Country,
                Language = k.Language,
                SearchVolume = k.SearchVolume,
                Difficulty = k.Difficulty,
                Relevance = k.Relevance,
                ConversionPotential = k.ConversionPotential,
                CurrentRank = k.CurrentRank,
                BestRank = k.BestRank,
                PreviousRank = k.PreviousRank,
                CompetitionDensity = k.CompetitionDensity,
                TopCompetitors = k.TopCompetitors,
                Source = k.Source,
                Status = k.Status,
                CreatedAt = k.CreatedAt,
                LastUpdated = k.LastUpdated
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing competitor keywords for {BundleId}", bundleId);
            throw;
        }
    }

    public async Task UpdateKeywordMetricsAsync(int keywordId)
    {
        try
        {
            var keyword = await _context.AsoKeywords.FindAsync(keywordId);
            if (keyword == null)
                return;

            await EnrichKeywordWithMlMetricsAsync(keyword);
            keyword.LastUpdated = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated metrics for keyword {KeywordId}", keywordId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating keyword metrics for {KeywordId}", keywordId);
            throw;
        }
    }

    #endregion

    #region App Store Listing Management

    public async Task<List<AppStoreListingDto>> GetListingsAsync(Guid userId, AppStore? appStore = null)
    {
        try
        {
            var query = _context.AppStoreListings
                .Where(l => l.UserId == userId)
                .AsQueryable();

            if (appStore.HasValue)
                query = query.Where(l => l.AppStore == appStore.Value);

            var listings = await query
                .Include(l => l.Reviews.Take(5))
                .OrderByDescending(l => l.LastUpdated)
                .Select(l => new AppStoreListingDto
                {
                    Id = l.Id,
                    AppName = l.AppName,
                    BundleId = l.BundleId,
                    AppStore = l.AppStore,
                    Country = l.Country,
                    Language = l.Language,
                    Title = l.Title,
                    Subtitle = l.Subtitle,
                    Description = l.Description,
                    Keywords = l.Keywords,
                    PromotionalText = l.PromotionalText,
                    ReleaseNotes = l.ReleaseNotes,
                    Screenshots = l.Screenshots,
                    PreviewVideos = l.PreviewVideos,
                    IconUrl = l.IconUrl,
                    ConversionRate = l.ConversionRate,
                    Downloads = l.Downloads,
                    Views = l.Views,
                    Rating = l.Rating,
                    ReviewCount = l.ReviewCount,
                    Status = l.Status,
                    CreatedAt = l.CreatedAt,
                    PublishedAt = l.PublishedAt
                })
                .ToListAsync();

            _logger.LogInformation("Retrieved {Count} listings for user {UserId}", listings.Count, userId);
            return listings;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving listings for user {UserId}", userId);
            throw;
        }
    }

    public async Task<AppStoreListingDto> GetListingAsync(int id, Guid userId)
    {
        try
        {
            var listing = await _context.AppStoreListings
                .Where(l => l.Id == id && l.UserId == userId)
                .Include(l => l.Reviews.OrderByDescending(r => r.ReviewDate).Take(50))
                .Include(l => l.TestVariants)
                .Select(l => new AppStoreListingDto
                {
                    Id = l.Id,
                    AppName = l.AppName,
                    BundleId = l.BundleId,
                    AppStore = l.AppStore,
                    Country = l.Country,
                    Language = l.Language,
                    Title = l.Title,
                    Subtitle = l.Subtitle,
                    Description = l.Description,
                    Keywords = l.Keywords,
                    PromotionalText = l.PromotionalText,
                    ReleaseNotes = l.ReleaseNotes,
                    Screenshots = l.Screenshots,
                    PreviewVideos = l.PreviewVideos,
                    IconUrl = l.IconUrl,
                    ConversionRate = l.ConversionRate,
                    Downloads = l.Downloads,
                    Views = l.Views,
                    Rating = l.Rating,
                    ReviewCount = l.ReviewCount,
                    Status = l.Status,
                    CreatedAt = l.CreatedAt,
                    PublishedAt = l.PublishedAt
                })
                .FirstOrDefaultAsync();

            if (listing == null)
                throw new KeyNotFoundException($"Listing {id} not found for user {userId}");

            return listing;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving listing {Id} for user {UserId}", id, userId);
            throw;
        }
    }

    public async Task<AppStoreListingDto> CreateListingAsync(CreateAppStoreListingDto dto, Guid userId)
    {
        try
        {
            var listing = new AppStoreListing
            {
                AppName = dto.AppName,
                BundleId = dto.BundleId,
                AppStore = dto.AppStore,
                Country = dto.Country,
                Language = dto.Language,
                Title = dto.Title,
                Subtitle = dto.Subtitle,
                Description = dto.Description,
                Keywords = dto.Keywords,
                PromotionalText = dto.PromotionalText,
                ReleaseNotes = dto.ReleaseNotes,
                Screenshots = dto.Screenshots,
                PreviewVideos = dto.PreviewVideos,
                IconUrl = dto.IconUrl,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            };

            _context.AppStoreListings.Add(listing);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created listing '{AppName}' for user {UserId}", dto.AppName, userId);

            return await GetListingAsync(listing.Id, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating listing '{AppName}' for user {UserId}", dto.AppName, userId);
            throw;
        }
    }

    public async Task<AppStoreListingDto> UpdateListingAsync(int id, CreateAppStoreListingDto dto, Guid userId)
    {
        try
        {
            var listing = await _context.AppStoreListings
                .FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId);

            if (listing == null)
                throw new KeyNotFoundException($"Listing {id} not found for user {userId}");

            listing.AppName = dto.AppName;
            listing.BundleId = dto.BundleId;
            listing.AppStore = dto.AppStore;
            listing.Country = dto.Country;
            listing.Language = dto.Language;
            listing.Title = dto.Title;
            listing.Subtitle = dto.Subtitle;
            listing.Description = dto.Description;
            listing.Keywords = dto.Keywords;
            listing.PromotionalText = dto.PromotionalText;
            listing.ReleaseNotes = dto.ReleaseNotes;
            listing.Screenshots = dto.Screenshots;
            listing.PreviewVideos = dto.PreviewVideos;
            listing.IconUrl = dto.IconUrl;
            listing.LastUpdated = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated listing {Id} for user {UserId}", id, userId);

            return await GetListingAsync(id, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating listing {Id} for user {UserId}", id, userId);
            throw;
        }
    }

    public async Task<bool> DeleteListingAsync(int id, Guid userId)
    {
        try
        {
            var listing = await _context.AppStoreListings
                .Include(l => l.Reviews)
                .Include(l => l.AbTests)
                .FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId);

            if (listing == null)
                return false;

            _context.AppStoreReviews.RemoveRange(listing.Reviews);
            _context.AsoAbTests.RemoveRange(listing.AbTests);
            _context.AppStoreListings.Remove(listing);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted listing {Id} for user {UserId}", id, userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting listing {Id} for user {UserId}", id, userId);
            throw;
        }
    }

    #endregion

    #region Review Management with Sentiment Analysis

    public async Task<List<AppStoreReview>> GetReviewsAsync(int listingId, Guid userId, DateTime? fromDate = null)
    {
        try
        {
            var listing = await _context.AppStoreListings
                .FirstOrDefaultAsync(l => l.Id == listingId && l.UserId == userId);

            if (listing == null)
                throw new KeyNotFoundException($"Listing {listingId} not found for user {userId}");

            var query = _context.AppStoreReviews
                .Where(r => r.ListingId == listingId)
                .AsQueryable();

            if (fromDate.HasValue)
                query = query.Where(r => r.ReviewDate >= fromDate.Value);

            var reviews = await query
                .OrderByDescending(r => r.ReviewDate)
                .ToListAsync();

            _logger.LogInformation("Retrieved {Count} reviews for listing {ListingId}", reviews.Count, listingId);
            return reviews;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving reviews for listing {ListingId}", listingId);
            throw;
        }
    }

    public async Task<AppStoreReview> AnalyzeReviewSentimentAsync(int reviewId)
    {
        try
        {
            var review = await _context.AppStoreReviews.FindAsync(reviewId);
            if (review == null)
                throw new KeyNotFoundException($"Review {reviewId} not found");

            // Simple sentiment analysis (in production, use Azure Cognitive Services or similar)
            var sentimentResult = AnalyzeTextSentiment(review.Content);
            
            review.SentimentScore = sentimentResult.Score;
            review.SentimentLabel = sentimentResult.Label;
            review.Confidence = sentimentResult.Confidence;
            
            // Extract topics and issues
            review.Topics = ExtractTopics(review.Content);
            review.Issues = ExtractIssues(review.Content);
            review.Compliments = ExtractCompliments(review.Content);
            
            review.LastUpdated = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Analyzed sentiment for review {ReviewId}: {SentimentLabel} ({Score})", 
                reviewId, review.SentimentLabel, review.SentimentScore);

            return review;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing sentiment for review {ReviewId}", reviewId);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetReviewAnalyticsAsync(int listingId, Guid userId, DateTime? fromDate = null)
    {
        try
        {
            var reviews = await GetReviewsAsync(listingId, userId, fromDate);

            if (!reviews.Any())
                return new Dictionary<string, object>();

            var analytics = new Dictionary<string, object>
            {
                ["TotalReviews"] = reviews.Count,
                ["AverageRating"] = reviews.Average(r => r.Rating),
                ["AverageSentiment"] = reviews.Where(r => r.SentimentScore != 0).Average(r => r.SentimentScore),
                ["RatingDistribution"] = reviews.GroupBy(r => r.Rating).ToDictionary(g => g.Key.ToString(), g => g.Count()),
                ["SentimentDistribution"] = reviews.GroupBy(r => r.SentimentLabel).ToDictionary(g => g.Key.ToString(), g => g.Count()),
                ["TopIssues"] = reviews.SelectMany(r => r.Issues).GroupBy(i => i).OrderByDescending(g => g.Count()).Take(10).ToDictionary(g => g.Key, g => g.Count()),
                ["TopCompliments"] = reviews.SelectMany(r => r.Compliments).GroupBy(c => c).OrderByDescending(g => g.Count()).Take(10).ToDictionary(g => g.Key, g => g.Count()),
                ["ResponseRate"] = reviews.Count(r => r.HasDeveloperResponse) / (double)reviews.Count * 100
            };

            _logger.LogInformation("Generated review analytics for listing {ListingId}: {TotalReviews} reviews", listingId, reviews.Count);
            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating review analytics for listing {ListingId}", listingId);
            throw;
        }
    }

    public async Task SyncReviewsAsync(int listingId, Guid userId)
    {
        try
        {
            var listing = await _context.AppStoreListings
                .FirstOrDefaultAsync(l => l.Id == listingId && l.UserId == userId);

            if (listing == null)
                throw new KeyNotFoundException($"Listing {listingId} not found for user {userId}");

            // Simulate fetching reviews from app store APIs
            var newReviews = await FetchReviewsFromAppStoreAsync(listing.BundleId, listing.AppStore, listing.Country);

            foreach (var reviewData in newReviews)
            {
                // Extract ReviewId to avoid dynamic operations in LINQ expression tree
                string reviewId = reviewData.ReviewId;
                var existingReview = await _context.AppStoreReviews
                    .FirstOrDefaultAsync(r => r.ReviewId == reviewId && r.ListingId == listingId);

                if (existingReview == null)
                {
                    var review = new AppStoreReview
                    {
                        ReviewId = reviewData.ReviewId,
                        ListingId = listingId,
                        ReviewerName = reviewData.ReviewerName,
                        Rating = reviewData.Rating,
                        Title = reviewData.Title,
                        Content = reviewData.Content,
                        Version = reviewData.Version,
                        ReviewDate = reviewData.ReviewDate,
                        Country = reviewData.Country,
                        Language = reviewData.Language,
                        IsVerifiedPurchase = reviewData.IsVerifiedPurchase,
                        CreatedAt = DateTime.UtcNow,
                        LastUpdated = DateTime.UtcNow
                    };

                    // Analyze sentiment for new reviews
                    var sentimentResult = AnalyzeTextSentiment(review.Content);
                    review.SentimentScore = sentimentResult.Score;
                    review.SentimentLabel = sentimentResult.Label;
                    review.Confidence = sentimentResult.Confidence;
                    review.Topics = ExtractTopics(review.Content);
                    review.Issues = ExtractIssues(review.Content);
                    review.Compliments = ExtractCompliments(review.Content);

                    _context.AppStoreReviews.Add(review);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Synced {Count} new reviews for listing {ListingId}", newReviews.Count, listingId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing reviews for listing {ListingId}", listingId);
            throw;
        }
    }

    #endregion

    #region A/B Testing with Statistical Significance

    public async Task<AsoAbTest> CreateAbTestAsync(CreateAsoAbTestDto dto, Guid userId)
    {
        try
        {
            // Validate listings belong to user
            var controlListing = await _context.AppStoreListings
                .FirstOrDefaultAsync(l => l.Id == dto.ControlListingId && l.UserId == userId);
            var variantListing = await _context.AppStoreListings
                .FirstOrDefaultAsync(l => l.Id == dto.VariantListingId && l.UserId == userId);

            if (controlListing == null || variantListing == null)
                throw new InvalidOperationException("Invalid control or variant listing");

            var abTest = new AsoAbTest
            {
                Name = dto.Name,
                Description = dto.Description,
                Type = dto.Type,
                Status = AbTestStatus.Draft,
                ControlListingId = dto.ControlListingId,
                VariantListingId = dto.VariantListingId,
                TrafficSplit = dto.TrafficSplit,
                ConfidenceLevel = dto.ConfidenceLevel,
                KeywordIds = dto.KeywordIds,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            };

            _context.AsoAbTests.Add(abTest);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created A/B test '{Name}' for user {UserId}", dto.Name, userId);
            return abTest;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating A/B test '{Name}' for user {UserId}", dto.Name, userId);
            throw;
        }
    }

    public async Task<AsoAbTest> GetAbTestAsync(int id, Guid userId)
    {
        try
        {
            var abTest = await _context.AsoAbTests
                .Include(t => t.ControlListing)
                .Include(t => t.VariantListing)
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (abTest == null)
                throw new KeyNotFoundException($"A/B test {id} not found for user {userId}");

            return abTest;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving A/B test {Id} for user {UserId}", id, userId);
            throw;
        }
    }

    public async Task<List<AsoAbTest>> GetAbTestsAsync(Guid userId, AbTestStatus? status = null)
    {
        try
        {
            var query = _context.AsoAbTests
                .Where(t => t.UserId == userId)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(t => t.Status == status.Value);

            var abTests = await query
                .Include(t => t.ControlListing)
                .Include(t => t.VariantListing)
                .OrderByDescending(t => t.LastUpdated)
                .ToListAsync();

            return abTests;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving A/B tests for user {UserId}", userId);
            throw;
        }
    }

    public async Task<AsoAbTest> StartAbTestAsync(int id, Guid userId)
    {
        try
        {
            var abTest = await GetAbTestAsync(id, userId);
            
            if (abTest.Status != AbTestStatus.Draft)
                throw new InvalidOperationException($"Cannot start A/B test in {abTest.Status} status");

            abTest.Status = AbTestStatus.Running;
            abTest.StartDate = DateTime.UtcNow;
            abTest.LastUpdated = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Started A/B test {Id} for user {UserId}", id, userId);
            return abTest;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting A/B test {Id} for user {UserId}", id, userId);
            throw;
        }
    }

    public async Task<AsoAbTest> StopAbTestAsync(int id, Guid userId)
    {
        try
        {
            var abTest = await GetAbTestAsync(id, userId);
            
            if (abTest.Status != AbTestStatus.Running)
                throw new InvalidOperationException($"Cannot stop A/B test in {abTest.Status} status");

            abTest.Status = AbTestStatus.Completed;
            abTest.EndDate = DateTime.UtcNow;
            abTest.LastUpdated = DateTime.UtcNow;

            // Calculate final statistical significance
            var results = await CalculateAbTestStatisticalSignificanceAsync(abTest);
            abTest.StatisticalSignificance = results.PValue;
            abTest.IsStatisticallySignificant = results.IsSignificant;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Stopped A/B test {Id} for user {UserId} - Statistical significance: {IsSignificant}", 
                id, userId, abTest.IsStatisticallySignificant);
            return abTest;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping A/B test {Id} for user {UserId}", id, userId);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetAbTestResultsAsync(int id, Guid userId)
    {
        try
        {
            var abTest = await GetAbTestAsync(id, userId);
            var statisticalResults = await CalculateAbTestStatisticalSignificanceAsync(abTest);

            var results = new Dictionary<string, object>
            {
                ["TestName"] = abTest.Name,
                ["Status"] = abTest.Status.ToString(),
                ["StartDate"] = abTest.StartDate,
                ["EndDate"] = abTest.EndDate,
                ["Duration"] = abTest.EndDate.HasValue && abTest.StartDate.HasValue
                    ? abTest.EndDate.Value.Subtract(abTest.StartDate.Value).TotalDays
                    : 0,
                ["ControlMetrics"] = abTest.ControlMetrics,
                ["VariantMetrics"] = abTest.VariantMetrics,
                ["StatisticalSignificance"] = statisticalResults.PValue,
                ["IsSignificant"] = statisticalResults.IsSignificant,
                ["ConfidenceLevel"] = abTest.ConfidenceLevel,
                ["Uplift"] = statisticalResults.Uplift,
                ["Winner"] = statisticalResults.Winner
            };

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting A/B test results for {Id}", id);
            throw;
        }
    }

    public async Task UpdateAbTestMetricsAsync(int id)
    {
        try
        {
            var abTest = await _context.AsoAbTests
                .Include(t => t.ControlListing)
                .Include(t => t.VariantListing)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (abTest == null || abTest.Status != AbTestStatus.Running)
                return;

            // Simulate metrics update (in production, fetch from app store analytics)
            abTest.ControlMetrics = await FetchListingMetricsAsync(abTest.ControlListing);
            abTest.VariantMetrics = await FetchListingMetricsAsync(abTest.VariantListing);

            // Update statistical significance if enough data
            if (abTest.ControlMetrics.Views > 100 && abTest.VariantMetrics.Views > 100)
            {
                var significance = await CalculateAbTestStatisticalSignificanceAsync(abTest);
                abTest.StatisticalSignificance = significance.PValue;
                abTest.IsStatisticallySignificant = significance.IsSignificant;
            }

            abTest.LastUpdated = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated metrics for A/B test {Id}", id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating A/B test metrics for {Id}", id);
            throw;
        }
    }

    #endregion

    #region Analytics and Reporting

    public async Task<List<AsoAnalyticsDto>> GetAnalyticsAsync(int listingId, Guid userId, DateTime fromDate, DateTime toDate, AnalyticsGranularity granularity = AnalyticsGranularity.Daily)
    {
        try
        {
            var listing = await _context.AppStoreListings
                .FirstOrDefaultAsync(l => l.Id == listingId && l.UserId == userId);

            if (listing == null)
                throw new KeyNotFoundException($"Listing {listingId} not found for user {userId}");

            var analytics = await _context.AsoAnalytics
                .Where(a => a.ListingId == listingId && a.Date >= fromDate && a.Date <= toDate && a.Granularity == granularity)
                .OrderBy(a => a.Date)
                .Select(a => new AsoAnalyticsDto
                {
                    Date = a.Date,
                    Granularity = a.Granularity,
                    Views = a.Views,
                    Downloads = a.Downloads,
                    ConversionRate = a.ConversionRate,
                    OrganicViews = a.OrganicViews,
                    SearchViews = a.SearchViews,
                    BrowseViews = a.BrowseViews,
                    ReferralViews = a.ReferralViews,
                    KeywordViews = a.KeywordViews,
                    KeywordConversions = a.KeywordConversions,
                    AverageRating = a.AverageRating,
                    TotalReviews = a.TotalReviews,
                    NewReviews = a.NewReviews,
                    SentimentScore = a.SentimentScore,
                    CategoryRankings = a.CategoryRankings,
                    KeywordRankings = a.KeywordRankings,
                    CompetitorData = a.CompetitorData
                })
                .ToListAsync();

            _logger.LogInformation("Retrieved {Count} analytics records for listing {ListingId}", analytics.Count, listingId);
            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving analytics for listing {ListingId}", listingId);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetKeywordPerformanceAsync(Guid userId, DateTime? fromDate = null)
    {
        try
        {
            var startDate = fromDate ?? DateTime.UtcNow.AddDays(-30);
            
            var keywords = await _context.AsoKeywords
                .Where(k => k.UserId == userId)
                .Include(k => k.Rankings.Where(r => r.RankedAt >= startDate))
                .ToListAsync();

            var performance = new Dictionary<string, object>
            {
                ["TotalKeywords"] = keywords.Count,
                ["TrackingKeywords"] = keywords.Count(k => k.Status == KeywordStatus.Active),
                ["AverageRank"] = keywords.Where(k => k.CurrentRank.HasValue).Average(k => k.CurrentRank.Value),
                ["TopPerformers"] = keywords.Where(k => k.CurrentRank.HasValue && k.CurrentRank <= 10)
                    .Select(k => new { k.Keyword, k.CurrentRank, k.ConversionPotential })
                    .OrderBy(k => k.CurrentRank)
                    .Take(10)
                    .ToList(),
                ["OpportunityKeywords"] = keywords.Where(k => k.Difficulty < 0.5 && k.ConversionPotential > 0.7)
                    .Select(k => new { k.Keyword, k.Difficulty, k.ConversionPotential, k.SearchVolume })
                    .OrderByDescending(k => k.ConversionPotential)
                    .Take(20)
                    .ToList(),
                ["RankingTrends"] = keywords.Where(k => k.Rankings.Count >= 2)
                    .Select(k => new
                    {
                        Keyword = k.Keyword,
                        CurrentRank = k.CurrentRank,
                        PreviousRank = k.PreviousRank,
                        Change = k.PreviousRank - k.CurrentRank,
                        Trend = k.Rankings.OrderBy(r => r.RankedAt).Select(r => r.Rank).ToList()
                    })
                    .ToList()
            };

            return performance;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving keyword performance for user {UserId}", userId);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetCompetitorAnalysisAsync(int listingId, Guid userId)
    {
        try
        {
            var listing = await _context.AppStoreListings
                .FirstOrDefaultAsync(l => l.Id == listingId && l.UserId == userId);

            if (listing == null)
                throw new KeyNotFoundException($"Listing {listingId} not found for user {userId}");

            // Get latest analytics with competitor data
            var latestAnalytics = await _context.AsoAnalytics
                .Where(a => a.ListingId == listingId)
                .OrderByDescending(a => a.Date)
                .FirstOrDefaultAsync();

            var competitorData = latestAnalytics?.CompetitorData ?? new Dictionary<string, CompetitorMetrics>();

            var analysis = new Dictionary<string, object>
            {
                ["TotalCompetitors"] = competitorData.Count,
                ["TopCompetitors"] = competitorData.Values
                    .OrderBy(c => c.Rank)
                    .Take(10)
                    .ToList(),
                ["RankingComparison"] = competitorData.Values
                    .Select(c => new { c.AppName, c.Rank, c.Rating, c.ReviewCount })
                    .OrderBy(c => c.Rank)
                    .ToList(),
                ["KeywordOverlap"] = await AnalyzeKeywordOverlapAsync(listing, competitorData.Keys.ToList()),
                ["GapAnalysis"] = await IdentifyKeywordGapsAsync(listing, competitorData.Values.ToList())
            };

            return analysis;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving competitor analysis for listing {ListingId}", listingId);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetRankingTrendsAsync(int listingId, Guid userId, DateTime? fromDate = null)
    {
        try
        {
            var startDate = fromDate ?? DateTime.UtcNow.AddDays(-30);
            
            var rankings = await _context.KeywordRankings
                .Include(r => r.Keyword)
                .Where(r => r.Listing.UserId == userId && r.ListingId == listingId && r.RankedAt >= startDate)
                .OrderBy(r => r.RankedAt)
                .ToListAsync();

            var trends = new Dictionary<string, object>
            {
                ["TotalDataPoints"] = rankings.Count,
                ["KeywordTrends"] = rankings
                    .GroupBy(r => r.Keyword.Keyword)
                    .Select(g => new
                    {
                        Keyword = g.Key,
                        Trend = g.OrderBy(r => r.RankedAt).Select(r => new { Date = r.RankedAt, Rank = r.Rank }).ToList(),
                        BestRank = g.Min(r => r.Rank),
                        WorstRank = g.Max(r => r.Rank),
                        // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
                        CurrentRank = g.OrderByDescending(r => r.RankedAt).FirstOrDefault()?.Rank ?? 0,
                        AverageRank = g.Average(r => r.Rank)
                    })
                    .ToList(),
                ["OverallTrend"] = rankings
                    .GroupBy(r => r.RankedAt.Date)
                    .Select(g => new { Date = g.Key, AverageRank = g.Average(r => r.Rank) })
                    .OrderBy(g => g.Date)
                    .ToList(),
                ["CategoryPerformance"] = rankings
                    .Where(r => !string.IsNullOrEmpty(r.Category))
                    .GroupBy(r => r.Category)
                    .Select(g => new
                    {
                        Category = g.Key,
                        AverageRank = g.Average(r => r.CategoryRank ?? r.Rank),
                        KeywordCount = g.Select(r => r.Keyword.Keyword).Distinct().Count()
                    })
                    .ToList()
            };

            return trends;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving ranking trends for listing {ListingId}", listingId);
            throw;
        }
    }

    #endregion

    #region Cross-Platform Integration

    public async Task<Dictionary<string, object>> SynchronizeWithSeoKeywordsAsync(Guid userId)
    {
        try
        {
            // Get SEO keywords from existing SEO system
            var seoKeywords = await GetSeoKeywordsAsync(userId);
            var asoKeywords = await _context.AsoKeywords.Where(k => k.UserId == userId).ToListAsync();
            
            var synchronizationResults = new Dictionary<string, object>
            {
                ["SEOKeywords"] = seoKeywords.Count,
                ["ASOKeywords"] = asoKeywords.Count,
                ["CommonKeywords"] = new List<string>(),
                ["SEOOnlyKeywords"] = new List<string>(),
                ["ASOOnlyKeywords"] = new List<string>(),
                ["RecommendedCrossPromotion"] = new List<object>()
            };

            var seoKeywordSet = seoKeywords.Select(k => k.ToLowerInvariant()).ToHashSet();
            var asoKeywordSet = asoKeywords.Select(k => k.Keyword.ToLowerInvariant()).ToHashSet();

            var commonKeywords = seoKeywordSet.Intersect(asoKeywordSet).ToList();
            var seoOnlyKeywords = seoKeywordSet.Except(asoKeywordSet).ToList();
            var asoOnlyKeywords = asoKeywordSet.Except(seoKeywordSet).ToList();

            synchronizationResults["CommonKeywords"] = commonKeywords;
            synchronizationResults["SEOOnlyKeywords"] = seoOnlyKeywords.Take(50).ToList();
            synchronizationResults["ASOOnlyKeywords"] = asoOnlyKeywords.Take(50).ToList();

            // Recommend cross-promotion opportunities
            var recommendations = new List<object>();
            
            // High-performing SEO keywords for ASO
            foreach (var seoKeyword in seoOnlyKeywords.Take(10))
            {
                recommendations.Add(new
                {
                    Type = "SEOToASO",
                    Keyword = seoKeyword,
                    Reason = "High-performing SEO keyword with ASO potential"
                });
            }

            // High-converting ASO keywords for SEO
            var highConvertingAsoKeywords = asoKeywords
                .Where(k => k.ConversionPotential > 0.7 && asoOnlyKeywords.Contains(k.Keyword.ToLowerInvariant()))
                .Take(10)
                .ToList();

            foreach (var asoKeyword in highConvertingAsoKeywords)
            {
                recommendations.Add(new
                {
                    Type = "ASOToSEO",
                    Keyword = asoKeyword.Keyword,
                    ConversionPotential = asoKeyword.ConversionPotential,
                    Reason = "High-converting ASO keyword with SEO potential"
                });
            }

            synchronizationResults["RecommendedCrossPromotion"] = recommendations;

            _logger.LogInformation("Synchronized SEO-ASO keywords for user {UserId}: {Common} common, {SEOOnly} SEO-only, {ASOOnly} ASO-only", 
                userId, commonKeywords.Count, seoOnlyKeywords.Count, asoOnlyKeywords.Count);

            return synchronizationResults;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error synchronizing SEO-ASO keywords for user {UserId}", userId);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetWebToAppAttributionAsync(Guid userId, DateTime? fromDate = null)
    {
        try
        {
            var startDate = fromDate ?? DateTime.UtcNow.AddDays(-30);
            
            // Simulate web-to-app attribution data (in production, integrate with analytics)
            var attributionData = new Dictionary<string, object>
            {
                ["TotalWebVisitors"] = _random.Next(10000, 50000),
                ["AppStoreVisits"] = _random.Next(1000, 5000),
                ["AppDownloads"] = _random.Next(100, 1000),
                ["ConversionFunnel"] = new
                {
                    WebVisitors = _random.Next(10000, 50000),
                    AppStoreClicks = _random.Next(1000, 5000),
                    AppStoreViews = _random.Next(800, 4000),
                    Downloads = _random.Next(100, 1000),
                    WebToAppStoreConversion = Math.Round(_random.NextDouble() * 0.1 + 0.05, 4),
                    AppStoreToDownloadConversion = Math.Round(_random.NextDouble() * 0.3 + 0.1, 4)
                },
                ["TopReferringSources"] = new List<object>
                {
                    new { Source = "Google Search", Visitors = _random.Next(3000, 8000), Conversions = _random.Next(50, 200) },
                    new { Source = "Social Media", Visitors = _random.Next(1000, 3000), Conversions = _random.Next(20, 80) },
                    new { Source = "Direct Traffic", Visitors = _random.Next(2000, 5000), Conversions = _random.Next(30, 120) },
                    new { Source = "Email Marketing", Visitors = _random.Next(500, 2000), Conversions = _random.Next(15, 60) }
                },
                ["BestPerformingContent"] = new List<object>
                {
                    new { Page = "/features", Visitors = _random.Next(2000, 4000), AppStoreClicks = _random.Next(200, 400) },
                    new { Page = "/pricing", Visitors = _random.Next(1500, 3000), AppStoreClicks = _random.Next(150, 300) },
                    new { Page = "/blog/how-to-guide", Visitors = _random.Next(1000, 2500), AppStoreClicks = _random.Next(100, 250) }
                }
            };

            _logger.LogInformation("Generated web-to-app attribution data for user {UserId}", userId);
            return attributionData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving web-to-app attribution for user {UserId}", userId);
            throw;
        }
    }

    public async Task<List<string>> OptimizeDeepLinksAsync(int listingId, Guid userId)
    {
        try
        {
            var listing = await _context.AppStoreListings
                .FirstOrDefaultAsync(l => l.Id == listingId && l.UserId == userId);

            if (listing == null)
                throw new KeyNotFoundException($"Listing {listingId} not found for user {userId}");

            var optimizedDeepLinks = new List<string>();

            // Generate optimized deep links for different scenarios
            var baseUrl = listing.AppStore == AppStore.iOS ? "https://apps.apple.com/app" : "https://play.google.com/store/apps/details";
            var idParam = listing.AppStore == AppStore.iOS ? "id" : "id";
            var bundleId = listing.BundleId;

            // Standard app store link
            optimizedDeepLinks.Add($"{baseUrl}?{idParam}={bundleId}");

            // Campaign-specific links
            var campaigns = new[] { "social", "email", "web", "blog", "ads", "influencer" };
            foreach (var campaign in campaigns)
            {
                optimizedDeepLinks.Add($"{baseUrl}?{idParam}={bundleId}&ct={campaign}&pt=ASO_Campaign_{campaign}");
            }

            // Keyword-specific links
            var topKeywords = await _context.AsoKeywords
                .Where(k => k.UserId == userId && k.Status == KeywordStatus.Active)
                .OrderByDescending(k => k.ConversionPotential)
                .Take(5)
                .Select(k => k.Keyword.Replace(" ", "_"))
                .ToListAsync();

            foreach (var keyword in topKeywords)
            {
                optimizedDeepLinks.Add($"{baseUrl}?{idParam}={bundleId}&ct=keyword_{keyword}&pt=ASO_Keyword");
            }

            // A/B test specific links
            var activeAbTests = await _context.AsoAbTests
                .Where(t => t.UserId == userId && t.Status == AbTestStatus.Running)
                .Take(3)
                .ToListAsync();

            foreach (var abTest in activeAbTests)
            {
                optimizedDeepLinks.Add($"{baseUrl}?{idParam}={bundleId}&ct=abtest_{abTest.Id}&pt=ASO_ABTest");
            }

            _logger.LogInformation("Generated {Count} optimized deep links for listing {ListingId}", optimizedDeepLinks.Count, listingId);
            return optimizedDeepLinks;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error optimizing deep links for listing {ListingId}", listingId);
            throw;
        }
    }

    #endregion

    #region Bulk Operations

    public async Task<List<AsoKeywordDto>> BulkImportKeywordsAsync(List<CreateAsoKeywordDto> keywords, Guid userId)
    {
        try
        {
            var importedKeywords = new List<AsoKeywordDto>();
            var errors = new List<string>();

            foreach (var keywordDto in keywords)
            {
                try
                {
                    var imported = await CreateKeywordAsync(keywordDto, userId);
                    importedKeywords.Add(imported);
                }
                catch (Exception ex)
                {
                    errors.Add($"Error importing keyword '{keywordDto.Keyword}': {ex.Message}");
                    _logger.LogWarning(ex, "Error importing keyword '{Keyword}' for user {UserId}", keywordDto.Keyword, userId);
                }
            }

            _logger.LogInformation("Bulk imported {Success} keywords with {Errors} errors for user {UserId}", 
                importedKeywords.Count, errors.Count, userId);

            return importedKeywords;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in bulk keyword import for user {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> BulkUpdateKeywordRankingsAsync(List<KeywordRanking> rankings)
    {
        try
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            foreach (var ranking in rankings)
            {
                _context.KeywordRankings.Add(ranking);
                
                // Update keyword current rank
                var keyword = await _context.AsoKeywords.FindAsync(ranking.KeywordId);
                if (keyword != null)
                {
                    keyword.PreviousRank = keyword.CurrentRank;
                    keyword.CurrentRank = ranking.Rank;
                    keyword.LastRanked = ranking.RankedAt;
                    keyword.LastUpdated = DateTime.UtcNow;
                    
                    // Update best rank if applicable
                    if (!keyword.BestRank.HasValue || ranking.Rank < keyword.BestRank.Value)
                    {
                        keyword.BestRank = ranking.Rank;
                    }
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation("Bulk updated {Count} keyword rankings", rankings.Count);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in bulk keyword ranking update");
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GenerateAsoReportAsync(Guid userId, DateTime fromDate, DateTime toDate)
    {
        try
        {
            // ✅ FIX: Execute all queries in parallel to reduce N+1 query time
            var keywordsTask = _context.AsoKeywords.Where(k => k.UserId == userId).ToListAsync();
            var listingsTask = _context.AppStoreListings.Where(l => l.UserId == userId).ToListAsync();
            var abTestsTask = _context.AsoAbTests.Where(t => t.UserId == userId).ToListAsync();

            await Task.WhenAll(keywordsTask, listingsTask, abTestsTask);

            var keywords = await keywordsTask;
            var listings = await listingsTask;
            var abTests = await abTestsTask;

            var report = new Dictionary<string, object>
            {
                ["ReportPeriod"] = new { From = fromDate, To = toDate },
                ["GeneratedAt"] = DateTime.UtcNow,
                ["Summary"] = new
                {
                    TotalKeywords = keywords.Count,
                    ActiveKeywords = keywords.Count(k => k.Status == KeywordStatus.Active),
                    TotalListings = listings.Count,
                    ActiveListings = listings.Count(l => l.Status == ListingStatus.Live),
                    TotalAbTests = abTests.Count,
                    RunningAbTests = abTests.Count(t => t.Status == AbTestStatus.Running),
                    CompletedAbTests = abTests.Count(t => t.Status == AbTestStatus.Completed)
                },
                ["KeywordPerformance"] = await GetKeywordPerformanceAsync(userId, fromDate),
                ["TopPerformingKeywords"] = keywords
                    .Where(k => k.CurrentRank.HasValue && k.CurrentRank <= 20)
                    .OrderBy(k => k.CurrentRank)
                    .Take(10)
                    .Select(k => new { k.Keyword, k.CurrentRank, k.ConversionPotential, k.SearchVolume })
                    .ToList(),
                ["OpportunityKeywords"] = keywords
                    .Where(k => k.Difficulty < 0.5 && k.ConversionPotential > 0.6)
                    .OrderByDescending(k => k.ConversionPotential)
                    .Take(20)
                    .Select(k => new { k.Keyword, k.Difficulty, k.ConversionPotential, k.SearchVolume })
                    .ToList(),
                ["AbTestResults"] = new List<object>(),
                ["Recommendations"] = await GenerateAsoRecommendationsAsync(userId)
            };

            // Add A/B test results
            var abTestResults = new List<object>();
            foreach (var abTest in abTests.Where(t => t.Status == AbTestStatus.Completed).Take(5))
            {
                var results = await GetAbTestResultsAsync(abTest.Id, userId);
                abTestResults.Add(results);
            }
            report["AbTestResults"] = abTestResults;

            _logger.LogInformation("Generated comprehensive ASO report for user {UserId}", userId);
            return report;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating ASO report for user {UserId}", userId);
            throw;
        }
    }

    #endregion

    #region Private Helper Methods

    private async Task EnrichKeywordWithMlMetricsAsync(AsoKeyword keyword)
    {
        try
        {
            // ML-powered metrics calculation (simplified for demo)
            var keywordLength = keyword.Keyword.Length;
            var wordCount = keyword.Keyword.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
            
            // Search volume estimation (in production, use actual data from APIs)
            keyword.SearchVolume = Math.Max(100, _random.Next(1000, 50000) / Math.Max(1, keywordLength - 5));
            
            // Difficulty calculation (0-1 scale)
            keyword.Difficulty = Math.Min(1.0, Math.Max(0.1, (wordCount * 0.2) + (_random.NextDouble() * 0.6)));
            
            // Relevance calculation based on keyword characteristics
            keyword.Relevance = CalculateKeywordRelevance(keyword.Keyword);
            
            // Conversion potential (0-1 scale)
            keyword.ConversionPotential = CalculateConversionPotential(keyword.Keyword, keyword.SearchVolume, keyword.Difficulty);
            
            // Competition density
            keyword.CompetitionDensity = Math.Min(1.0, keyword.Difficulty + (_random.NextDouble() * 0.3));
            
            // Generate top competitors (simplified)
            keyword.TopCompetitors = GenerateTopCompetitors(keyword.Keyword, keyword.AppStore);
            
            _logger.LogDebug("Enriched keyword '{Keyword}' with ML metrics: Volume={Volume}, Difficulty={Difficulty}, Relevance={Relevance}", 
                keyword.Keyword, keyword.SearchVolume, keyword.Difficulty, keyword.Relevance);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enriching keyword '{Keyword}' with ML metrics", keyword.Keyword);
        }
    }

    private double CalculateKeywordRelevance(string keyword)
    {
        // Simplified relevance calculation
        var relevanceFactors = 0.0;
        
        // Length factor (medium length is better)
        if (keyword.Length >= 10 && keyword.Length <= 30) relevanceFactors += 0.3;
        
        // Word count factor (2-4 words typically perform well)
        var wordCount = keyword.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        if (wordCount >= 2 && wordCount <= 4) relevanceFactors += 0.3;
        
        // Contains action words
        var actionWords = new[] { "best", "top", "free", "new", "fast", "easy", "quick", "smart", "pro" };
        if (actionWords.Any(word => keyword.ToLowerInvariant().Contains(word))) relevanceFactors += 0.2;
        
        // Add random factor for variation
        relevanceFactors += _random.NextDouble() * 0.4;
        
        return Math.Min(1.0, Math.Max(0.1, relevanceFactors));
    }

    private double CalculateConversionPotential(string keyword, int searchVolume, double difficulty)
    {
        // Higher search volume but lower difficulty = higher conversion potential
        var volumeScore = Math.Min(1.0, searchVolume / 10000.0);
        var difficultyScore = 1.0 - difficulty;
        
        // Intent-based scoring
        var intentScore = 0.5;
        var buyingIntentWords = new[] { "best", "buy", "download", "get", "install", "free", "premium", "pro" };
        if (buyingIntentWords.Any(word => keyword.ToLowerInvariant().Contains(word)))
        {
            intentScore = 0.8;
        }
        
        var conversionPotential = (volumeScore * 0.4) + (difficultyScore * 0.4) + (intentScore * 0.2);
        return Math.Min(1.0, Math.Max(0.1, conversionPotential));
    }

    private List<string> GenerateTopCompetitors(string keyword, AppStore appStore)
    {
        // Simplified competitor generation (in production, use actual app store data)
        var competitorPrefixes = new[] { "Super", "Pro", "Best", "Smart", "Quick", "Easy", "Top", "Ultimate" };
        var competitorSuffixes = new[] { "App", "Tool", "Pro", "Plus", "X", "2024", "Premium" };
        
        var competitors = new List<string>();
        for (int i = 0; i < Math.Min(5, _random.Next(2, 6)); i++)
        {
            var prefix = competitorPrefixes[_random.Next(competitorPrefixes.Length)];
            var suffix = competitorSuffixes[_random.Next(competitorSuffixes.Length)];
            competitors.Add($"{prefix} {suffix}");
        }
        
        return competitors;
    }

    private async Task<List<AsoKeyword>> GenerateSemanticVariationsAsync(List<string> seedKeywords, string language)
    {
        var variations = new List<AsoKeyword>();
        
        var synonyms = new Dictionary<string, List<string>>
        {
            ["app"] = new() { "application", "tool", "software", "program" },
            ["best"] = new() { "top", "great", "awesome", "excellent", "premium" },
            ["free"] = new() { "no cost", "gratis", "zero cost", "complimentary" },
            ["fast"] = new() { "quick", "rapid", "speedy", "swift", "instant" },
            ["easy"] = new() { "simple", "effortless", "straightforward", "user-friendly" }
        };
        
        foreach (var seed in seedKeywords)
        {
            var words = seed.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            
            // Generate synonym variations
            foreach (var word in words)
            {
                var lowerWord = word.ToLowerInvariant();
                if (synonyms.ContainsKey(lowerWord))
                {
                    foreach (var synonym in synonyms[lowerWord])
                    {
                        var variation = seed.Replace(word, synonym, StringComparison.OrdinalIgnoreCase);
                        variations.Add(new AsoKeyword
                        {
                            Keyword = variation,
                            AppStore = AppStore.Both, // Will be set by caller
                            Country = "US",
                            Language = language,
                            Relevance = CalculateKeywordRelevance(variation),
                            CreatedAt = DateTime.UtcNow,
                            LastUpdated = DateTime.UtcNow
                        });
                    }
                }
            }
            
            // Generate long-tail variations
            var modifiers = new[] { "2024", "pro", "premium", "plus", "advanced", "ultimate", "best", "top" };
            foreach (var modifier in modifiers.Take(3))
            {
                variations.Add(new AsoKeyword
                {
                    Keyword = $"{seed} {modifier}",
                    AppStore = AppStore.Both,
                    Country = "US",
                    Language = language,
                    Relevance = CalculateKeywordRelevance($"{seed} {modifier}"),
                    CreatedAt = DateTime.UtcNow,
                    LastUpdated = DateTime.UtcNow
                });
                
                variations.Add(new AsoKeyword
                {
                    Keyword = $"{modifier} {seed}",
                    AppStore = AppStore.Both,
                    Country = "US",
                    Language = language,
                    Relevance = CalculateKeywordRelevance($"{modifier} {seed}"),
                    CreatedAt = DateTime.UtcNow,
                    LastUpdated = DateTime.UtcNow
                });
            }
        }
        
        return variations.Take(50).ToList();
    }

    private async Task<List<AsoKeyword>> AnalyzeCompetitorAppAsync(string bundleId, AppStore appStore, string country)
    {
        // Simulate competitor app analysis (in production, scrape app store or use APIs)
        var competitorKeywords = new List<AsoKeyword>();
        
        var commonKeywords = new[]
        {
            "productivity app", "business tool", "mobile app", "smartphone app",
            "professional tool", "work app", "office app", "utility app",
            "communication app", "social app", "entertainment app", "lifestyle app"
        };
        
        foreach (var keyword in commonKeywords.Take(_random.Next(5, 10)))
        {
            competitorKeywords.Add(new AsoKeyword
            {
                Keyword = keyword,
                AppStore = appStore,
                Country = country,
                Language = "en",
                Relevance = CalculateKeywordRelevance(keyword),
                Source = KeywordSource.CompetitorAnalysis,
                CreatedAt = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            });
        }
        
        return competitorKeywords;
    }

    private async Task<List<AsoKeyword>> GenerateTrendBasedKeywordsAsync(List<string> seedKeywords, AppStore appStore, string country)
    {
        // Simulate trend-based keyword generation
        var trendingTerms = new[] { "2024", "AI", "smart", "automated", "instant", "cloud", "sync", "secure" };
        var trendKeywords = new List<AsoKeyword>();
        
        foreach (var seed in seedKeywords.Take(3))
        {
            foreach (var trend in trendingTerms.Take(4))
            {
                var trendKeyword = $"{seed} {trend}";
                trendKeywords.Add(new AsoKeyword
                {
                    Keyword = trendKeyword,
                    AppStore = appStore,
                    Country = country,
                    Language = "en",
                    Relevance = CalculateKeywordRelevance(trendKeyword),
                    Source = KeywordSource.MLDiscovery,
                    CreatedAt = DateTime.UtcNow,
                    LastUpdated = DateTime.UtcNow
                });
            }
        }
        
        return trendKeywords;
    }

    private async Task<List<AsoKeyword>> GenerateLongTailKeywordsAsync(List<string> seedKeywords, string language)
    {
        var longTailKeywords = new List<AsoKeyword>();
        var questions = new[] { "how to", "what is", "best way to", "tips for", "guide to" };
        var intents = new[] { "for beginners", "step by step", "tutorial", "explained", "made easy" };
        
        foreach (var seed in seedKeywords.Take(2))
        {
            // Question-based long tail
            foreach (var question in questions.Take(2))
            {
                longTailKeywords.Add(new AsoKeyword
                {
                    Keyword = $"{question} {seed}",
                    AppStore = AppStore.Both,
                    Country = "US",
                    Language = language,
                    Relevance = CalculateKeywordRelevance($"{question} {seed}"),
                    Source = KeywordSource.MLDiscovery,
                    CreatedAt = DateTime.UtcNow,
                    LastUpdated = DateTime.UtcNow
                });
            }
            
            // Intent-based long tail
            foreach (var intent in intents.Take(2))
            {
                longTailKeywords.Add(new AsoKeyword
                {
                    Keyword = $"{seed} {intent}",
                    AppStore = AppStore.Both,
                    Country = "US",
                    Language = language,
                    Relevance = CalculateKeywordRelevance($"{seed} {intent}"),
                    Source = KeywordSource.MLDiscovery,
                    CreatedAt = DateTime.UtcNow,
                    LastUpdated = DateTime.UtcNow
                });
            }
        }
        
        return longTailKeywords;
    }

    private (double Score, SentimentLabel Label, double Confidence) AnalyzeTextSentiment(string text)
    {
        // Simplified sentiment analysis (in production, use Azure Cognitive Services, AWS Comprehend, etc.)
        var positiveWords = new[] { "great", "excellent", "amazing", "love", "perfect", "awesome", "fantastic", "wonderful", "brilliant" };
        var negativeWords = new[] { "terrible", "awful", "hate", "worst", "bad", "horrible", "useless", "disappointing", "broken" };
        
        var lowerText = text.ToLowerInvariant();
        var positiveCount = positiveWords.Count(word => lowerText.Contains(word));
        var negativeCount = negativeWords.Count(word => lowerText.Contains(word));
        
        var score = (positiveCount - negativeCount) / Math.Max(1.0, positiveCount + negativeCount);
        var normalizedScore = Math.Max(-1.0, Math.Min(1.0, score));
        
        SentimentLabel label;
        double confidence;
        
        if (normalizedScore > 0.5)
        {
            label = SentimentLabel.VeryPositive;
            confidence = 0.8 + (_random.NextDouble() * 0.2);
        }
        else if (normalizedScore > 0.1)
        {
            label = SentimentLabel.Positive;
            confidence = 0.7 + (_random.NextDouble() * 0.2);
        }
        else if (normalizedScore > -0.1)
        {
            label = SentimentLabel.Neutral;
            confidence = 0.6 + (_random.NextDouble() * 0.3);
        }
        else if (normalizedScore > -0.5)
        {
            label = SentimentLabel.Negative;
            confidence = 0.7 + (_random.NextDouble() * 0.2);
        }
        else
        {
            label = SentimentLabel.VeryNegative;
            confidence = 0.8 + (_random.NextDouble() * 0.2);
        }
        
        return (normalizedScore, label, confidence);
    }

    private List<string> ExtractTopics(string text)
    {
        // Simplified topic extraction
        var topics = new List<string>();
        var topicKeywords = new Dictionary<string, List<string>>
        {
            ["Performance"] = new() { "fast", "slow", "speed", "performance", "lag", "quick" },
            ["UI/UX"] = new() { "interface", "design", "ui", "ux", "layout", "navigation", "user-friendly" },
            ["Features"] = new() { "feature", "function", "option", "tool", "capability" },
            ["Bugs"] = new() { "bug", "crash", "error", "issue", "problem", "glitch" },
            ["Support"] = new() { "support", "help", "customer service", "response", "assistance" }
        };
        
        var lowerText = text.ToLowerInvariant();
        foreach (var topic in topicKeywords)
        {
            if (topic.Value.Any(keyword => lowerText.Contains(keyword)))
            {
                topics.Add(topic.Key);
            }
        }
        
        return topics;
    }

    private List<string> ExtractIssues(string text)
    {
        var issues = new List<string>();
        var issuePatterns = new Dictionary<string, List<string>>
        {
            ["App Crashes"] = new() { "crash", "crashes", "crashing", "force close", "stops working" },
            ["Slow Performance"] = new() { "slow", "lag", "lagging", "takes forever", "not responsive" },
            ["Login Issues"] = new() { "login", "sign in", "authentication", "password", "account" },
            ["Payment Problems"] = new() { "payment", "billing", "charge", "subscription", "refund" },
            ["Missing Features"] = new() { "missing", "lack", "doesn't have", "need", "should add" }
        };
        
        var lowerText = text.ToLowerInvariant();
        foreach (var issue in issuePatterns)
        {
            if (issue.Value.Any(pattern => lowerText.Contains(pattern)))
            {
                issues.Add(issue.Key);
            }
        }
        
        return issues;
    }

    private List<string> ExtractCompliments(string text)
    {
        var compliments = new List<string>();
        var complimentPatterns = new Dictionary<string, List<string>>
        {
            ["Great Performance"] = new() { "fast", "quick", "smooth", "responsive", "efficient" },
            ["Excellent Design"] = new() { "beautiful", "clean", "intuitive", "easy to use", "well designed" },
            ["Helpful Features"] = new() { "useful", "helpful", "convenient", "saves time", "exactly what I needed" },
            ["Great Support"] = new() { "support", "helpful team", "quick response", "resolved quickly" },
            ["Good Value"] = new() { "worth it", "good value", "reasonable price", "great deal" }
        };
        
        var lowerText = text.ToLowerInvariant();
        foreach (var compliment in complimentPatterns)
        {
            if (compliment.Value.Any(pattern => lowerText.Contains(pattern)))
            {
                compliments.Add(compliment.Key);
            }
        }
        
        return compliments;
    }

    private async Task<List<dynamic>> FetchReviewsFromAppStoreAsync(string bundleId, AppStore appStore, string country)
    {
        // Simulate fetching reviews from app store APIs
        var reviews = new List<dynamic>();
        
        for (int i = 0; i < _random.Next(5, 20); i++)
        {
            reviews.Add(new
            {
                ReviewId = Guid.NewGuid().ToString(),
                ReviewerName = $"User{i + 1}",
                Rating = _random.Next(1, 6),
                Title = $"Review title {i + 1}",
                Content = $"This is a sample review content for testing purposes. Review number {i + 1}.",
                Version = "1.0.0",
                ReviewDate = DateTime.UtcNow.AddDays(-_random.Next(1, 30)),
                Country = country,
                Language = "en",
                IsVerifiedPurchase = _random.NextDouble() > 0.3
            });
        }
        
        return reviews;
    }

    private async Task<(double PValue, bool IsSignificant, double Uplift, string Winner)> CalculateAbTestStatisticalSignificanceAsync(AsoAbTest abTest)
    {
        // Simplified statistical significance calculation
        var controlConversion = abTest.ControlMetrics.ConversionRate;
        var variantConversion = abTest.VariantMetrics.ConversionRate;
        var controlViews = abTest.ControlMetrics.Views;
        var variantViews = abTest.VariantMetrics.Views;
        
        if (controlViews < 100 || variantViews < 100)
        {
            return (1.0, false, 0.0, "Insufficient data");
        }
        
        // Calculate uplift
        var uplift = controlConversion > 0 ? (variantConversion - controlConversion) / controlConversion * 100 : 0;
        
        // Simplified p-value calculation (in production, use proper statistical tests)
        var pooledConversion = (abTest.ControlMetrics.Downloads + abTest.VariantMetrics.Downloads) / 
                              (double)(controlViews + variantViews);
        
        var standardError = Math.Sqrt(pooledConversion * (1 - pooledConversion) * (1.0/controlViews + 1.0/variantViews));
        var zScore = Math.Abs(variantConversion - controlConversion) / Math.Max(0.001, standardError);
        
        // Approximate p-value from z-score
        var pValue = Math.Max(0.001, 2 * (1 - NormalCdf(Math.Abs(zScore))));
        var isSignificant = pValue < (1 - (abTest.ConfidenceLevel ?? 0.95));
        
        var winner = Math.Abs(uplift) < 1 ? "No significant difference" : 
                    uplift > 0 ? "Variant" : "Control";
        
        return (pValue, isSignificant, uplift, winner);
    }
    
    private static double NormalCdf(double x)
    {
        // Approximation of normal cumulative distribution function
        return 0.5 * (1 + Math.Sign(x) * Math.Sqrt(1 - Math.Exp(-2 * x * x / Math.PI)));
    }

    private async Task<AbTestMetrics> FetchListingMetricsAsync(AppStoreListing listing)
    {
        // Simulate fetching metrics from app store analytics
        return new AbTestMetrics
        {
            Views = _random.Next(1000, 10000),
            Downloads = _random.Next(100, 1000),
            ConversionRate = Math.Round(_random.NextDouble() * 0.15 + 0.05, 4),
            UniqueUsers = _random.Next(800, 8000),
            AverageRating = Math.Round(3.0 + _random.NextDouble() * 2.0, 1),
            ReviewCount = _random.Next(10, 100),
            Revenue = Math.Round(_random.NextDouble() * 5000 + 1000, 2)
        };
    }

    private async Task<List<string>> GetSeoKeywordsAsync(Guid userId)
    {
        // Simulate getting SEO keywords from existing SEO system
        // In production, integrate with existing SEO models/services
        var seoKeywords = new List<string>
        {
            "vpn service", "secure vpn", "best vpn", "private vpn",
            "streaming vpn", "vpn for netflix", "fast vpn", "cheap vpn",
            "vpn comparison", "vpn review", "vpn guide", "vpn setup"
        };
        
        return seoKeywords;
    }

    private async Task<Dictionary<string, object>> AnalyzeKeywordOverlapAsync(AppStoreListing listing, List<string> competitorBundleIds)
    {
        // Simulate keyword overlap analysis
        return new Dictionary<string, object>
        {
            ["OverlapPercentage"] = Math.Round(_random.NextDouble() * 60 + 20, 1),
            ["CommonKeywords"] = new[] { "mobile app", "productivity", "business tool" },
            ["UniqueKeywords"] = new[] { "custom feature", "proprietary tool", "exclusive access" }
        };
    }

    private async Task<List<object>> IdentifyKeywordGapsAsync(AppStoreListing listing, List<CompetitorMetrics> competitors)
    {
        // Simulate keyword gap identification
        var gaps = new List<object>
        {
            new { Keyword = "premium features", Opportunity = "High", CompetitorUsage = 3 },
            new { Keyword = "enterprise solution", Opportunity = "Medium", CompetitorUsage = 2 },
            new { Keyword = "mobile-first design", Opportunity = "High", CompetitorUsage = 4 }
        };
        
        return gaps;
    }

    private async Task<List<object>> GenerateAsoRecommendationsAsync(Guid userId)
    {
        var recommendations = new List<object>
        {
            new
            {
                Type = "Keyword Opportunity",
                Title = "Target long-tail keywords",
                Description = "Focus on 3-4 word keywords with lower competition",
                Priority = "High",
                Impact = "20-30% increase in organic visibility"
            },
            new
            {
                Type = "A/B Test Suggestion",
                Title = "Test app title variations",
                Description = "Try including primary keyword in app title",
                Priority = "Medium",
                Impact = "10-15% conversion rate improvement"
            },
            new
            {
                Type = "Review Management",
                Title = "Improve review response rate",
                Description = "Respond to more negative reviews to improve ratings",
                Priority = "High",
                Impact = "0.2-0.4 rating improvement"
            }
        };
        
        return recommendations;
    }

    #endregion
}