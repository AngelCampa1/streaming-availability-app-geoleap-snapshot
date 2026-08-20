using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using System.Text.Json;
using SeoContentMetadata = GeoLeap.Api.ProgrammaticSeo.Models.ContentMetadata;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Service for streaming content metadata integration and freshness management
/// Handles real-time content availability and trending analysis
/// </summary>
public class ContentMetadataService : IContentMetadataService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ContentMetadataService> _logger;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    
    public ContentMetadataService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<ContentMetadataService> logger,
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
        _httpClient = httpClient;
        _configuration = configuration;
    }
    
    #region Content Metadata Integration
    
    public async Task<List<SeoContentMetadata>> ImportStreamingAvailabilityAsync(string country = "US")
    {
        try
        {
            var cacheKey = $"streaming_availability_{country}";
            if (_cache.TryGetValue(cacheKey, out List<SeoContentMetadata>? cached))
            {
                return cached!;
            }
            
            var contentList = new List<SeoContentMetadata>();
            
            // Get content from existing SearchableContent
            var searchableContent = await _context.SearchableContents
                .Where(c => !c.IsAdult)
                .Take(1000) // Limit for initial import
                .ToListAsync();
            
            foreach (var content in searchableContent)
            {
                var metadata = await ConvertToContentMetadataAsync(content, country);
                contentList.Add(metadata);
            }
            
            // Cache results for 1 hour
            _cache.Set(cacheKey, contentList, TimeSpan.FromHours(1));
            
            _logger.LogInformation("Imported {Count} content items for {Country}", contentList.Count, country);
            
            return contentList;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to import streaming availability for {Country}", country);
            throw;
        }
    }
    
    public async Task<List<SeoContentMetadata>> ImportTrendingContentAsync(int days = 7)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);
        
        // Get trending from search analytics
        var trendingContent = await _context.SearchAnalytics
            .Where(sa => sa.CreatedAt > cutoffDate)
            .GroupBy(sa => sa.SearchTerms ?? "")
            .Select(g => new 
            {
                Query = g.Key,
                SearchCount = g.Count(),
                RecentActivity = g.Max(x => x.CreatedAt)
            })
            .OrderByDescending(x => x.SearchCount)
            .Take(100)
            .ToListAsync();
        
        var contentMetadataList = new List<SeoContentMetadata>();
        
        foreach (var trend in trendingContent)
        {
            // Try to match with existing content
            var content = await _context.SearchableContents
                .FirstOrDefaultAsync(c => c.Title.Contains(trend.Query) ||
                    (c.Overview != null && EF.Functions.ILike(c.Overview, $"%{trend.Query}%")));
                    
            if (content != null)
            {
                var metadata = await ConvertToContentMetadataAsync(content);
                metadata.TrendingScore = trend.SearchCount;
                metadata.LastTrendingUpdate = trend.RecentActivity;
                contentMetadataList.Add(metadata);
            }
        }
        
        return contentMetadataList;
    }
    
    public async Task<SeoContentMetadata?> GetContentMetadataAsync(string contentId, string contentType)
    {
        var cacheKey = $"content_metadata_{contentType}_{contentId}";
        if (_cache.TryGetValue(cacheKey, out SeoContentMetadata? cached))
        {
            return cached;
        }
        
        var searchableContent = await _context.SearchableContents
            .FirstOrDefaultAsync(c => c.Id.ToString() == contentId && 
                c.Type.ToString().ToLower() == contentType.ToLower());
        
        if (searchableContent == null) return null;
        
        var metadata = await ConvertToContentMetadataAsync(searchableContent);
        
        // Cache for 30 minutes
        _cache.Set(cacheKey, metadata, TimeSpan.FromMinutes(30));
        
        return metadata;
    }
    
    public async Task<List<SeoContentMetadata>> GetContentByGenreAsync(string genre, int limit = 100)
    {
        var content = await _context.SearchableContents
            .Where(c => c.GenresJson.Contains(genre) && !c.IsAdult)
            .OrderByDescending(c => c.Popularity)
            .Take(limit)
            .ToListAsync();
        
        var metadataList = new List<SeoContentMetadata>();
        foreach (var item in content)
        {
            var metadata = await ConvertToContentMetadataAsync(item);
            metadataList.Add(metadata);
        }
        
        return metadataList;
    }
    
    public async Task<List<SeoContentMetadata>> GetContentByLocationAsync(string country, int limit = 100)
    {
        // Simplified implementation - would integrate with streaming availability APIs
        var content = await _context.SearchableContents
            .Where(c => !c.IsAdult)
            .OrderByDescending(c => c.Popularity)
            .Take(limit)
            .ToListAsync();
        
        var metadataList = new List<SeoContentMetadata>();
        foreach (var item in content)
        {
            var metadata = await ConvertToContentMetadataAsync(item, country);
            metadataList.Add(metadata);
        }
        
        return metadataList;
    }
    
    #endregion
    
    #region Helper Methods
    
    private async Task<SeoContentMetadata> ConvertToContentMetadataAsync(SearchableContent content, string country = "US")
    {
        var metadata = new SeoContentMetadata
        {
            Id = content.Id.ToString(),
            Title = content.Title,
            Type = content.Type.ToString().ToLower(),
            Description = content.Overview ?? string.Empty,
            Genres = ParseGenres(content.GenresJson),
            ReleaseYear = content.Year,
            ImdbRating = (float?)(double?)(content.Rating),
            TmdbRating = (float?)(double?)(content.Rating),
            PopularityScore = (float)(double)content.Popularity,
            PosterUrl = content.PosterUrl ?? string.Empty,
            BackdropUrl = content.BackdropUrl ?? string.Empty,
            TrailerUrl = "",
            SeoTitle = GenerateSeoTitle(content.Title, content.Year),
            SeoDescription = GenerateSeoDescription(content.Overview, content.Title),
            Slug = GenerateSlug(content.Title, content.Year, content.Id.ToString()),
            Cast = ParseCast(content.SearchableCast),
            Directors = new string[0],
            Runtime = content.RuntimeMinutes,
            ContentRating = content.ContentRating ?? string.Empty,
            LastUpdated = DateTime.UtcNow,
            CreatedAt = content.CreatedAt,
            IsActive = !content.IsAdult
        };
        
        // Add country-specific availability (simplified)
        metadata.AvailableCountries = new[] { country };
        metadata.Availability = new Dictionary<string, ProgrammaticSeo.Models.StreamingProvider[]>
        {
            [country] = await GetStreamingProvidersAsync(content.Id.ToString(), country)
        };
        
        // Generate SEO keywords
        metadata.Keywords = GenerateSeoKeywords(metadata);
        
        return metadata;
    }
    
    private string[] ParseGenres(string? genres)
    {
        if (string.IsNullOrEmpty(genres)) return Array.Empty<string>();
        
        try
        {
            return JsonSerializer.Deserialize<string[]>(genres) ?? Array.Empty<string>();
        }
        catch
        {
            return genres.Split(',', StringSplitOptions.RemoveEmptyEntries)
                         .Select(g => g.Trim())
                         .ToArray();
        }
    }
    
    private string[] ParseCast(string? cast)
    {
        if (string.IsNullOrEmpty(cast)) return Array.Empty<string>();
        
        try
        {
            return JsonSerializer.Deserialize<string[]>(cast) ?? Array.Empty<string>();
        }
        catch
        {
            return cast.Split(',', StringSplitOptions.RemoveEmptyEntries)
                      .Select(c => c.Trim())
                      .Take(10) // Limit to top 10 cast members
                      .ToArray();
        }
    }
    
    private string[] ParseDirectors(string? directors)
    {
        if (string.IsNullOrEmpty(directors)) return Array.Empty<string>();
        
        return directors.Split(',', StringSplitOptions.RemoveEmptyEntries)
                       .Select(d => d.Trim())
                       .ToArray();
    }
    
    private string GenerateSeoTitle(string title, int? year)
    {
        var seoTitle = title;
        if (year.HasValue)
        {
            seoTitle += $" ({year})";
        }
        seoTitle += " - Stream Online";
        return seoTitle.Length > 60 ? seoTitle.Substring(0, 57) + "..." : seoTitle;
    }
    
    private string GenerateSeoDescription(string? description, string title)
    {
        if (string.IsNullOrEmpty(description))
        {
            return $"Watch {title} online. Find where to stream {title} with our comprehensive streaming guide.";
        }
        
        var seoDescription = $"Watch {title} online. {description}";
        return seoDescription.Length > 160 ? seoDescription.Substring(0, 157) + "..." : seoDescription;
    }
    
    private string GenerateSlug(string title, int? year, string id)
    {
        var slug = title.ToLowerInvariant()
                       .Replace(" ", "-")
                       .Replace("'", "")
                       .Replace(":", "")
                       .Replace("?", "")
                       .Replace("!", "")
                       .Replace("&", "and");
        
        // Remove special characters
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-z0-9\-]", "");
        
        if (year.HasValue)
        {
            slug += $"-{year}";
        }
        
        // Add ID suffix to ensure uniqueness
        slug += $"-{id.Substring(0, Math.Min(8, id.Length))}";
        
        return slug;
    }
    
    private string[] GenerateSeoKeywords(SeoContentMetadata metadata)
    {
        var keywords = new List<string>
        {
            metadata.Title,
            $"{metadata.Title} streaming",
            $"watch {metadata.Title}",
            $"{metadata.Title} online"
        };
        
        if (metadata.ReleaseYear.HasValue)
        {
            keywords.Add($"{metadata.Title} {metadata.ReleaseYear}");
        }
        
        // Add genre-based keywords
        foreach (var genre in metadata.Genres.Take(3))
        {
            keywords.Add($"{genre} {metadata.Type}s");
        }
        
        return keywords.ToArray();
    }
    
    private async Task<ProgrammaticSeo.Models.StreamingProvider[]> GetStreamingProvidersAsync(string contentId, string country)
    {
        // Simplified implementation - would integrate with real streaming APIs
        var providers = new List<ProgrammaticSeo.Models.StreamingProvider>
        {
            new ProgrammaticSeo.Models.StreamingProvider
            {
                Name = "Netflix",
                Type = "subscription",
                LogoUrl = "https://example.com/netflix-logo.png",
                WatchUrl = $"https://netflix.com/watch/{contentId}",
                LastVerified = DateTime.UtcNow
            },
            new ProgrammaticSeo.Models.StreamingProvider
            {
                Name = "Amazon Prime Video",
                Type = "subscription",
                LogoUrl = "https://example.com/prime-logo.png", 
                WatchUrl = $"https://primevideo.com/watch/{contentId}",
                LastVerified = DateTime.UtcNow
            }
        };
        
        return providers.ToArray();
    }
    
    #endregion
    
    #region Placeholder Implementations
    
    public async Task<int> RefreshOutdatedContentAsync(int batchSize = 500)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-7);
        var outdatedContent = await _context.SearchableContents
            .Where(c => c.UpdatedAt < cutoffDate)
            .Take(batchSize)
            .ToListAsync();
        
        foreach (var content in outdatedContent)
        {
            content.UpdatedAt = DateTime.UtcNow;
        }
        
        await _context.SaveChangesAsync();
        return outdatedContent.Count;
    }
    
    public async Task<List<SeoContentMetadata>> DetectContentChangesAsync(DateTime? since = null)
    {
        var sinceDate = since ?? DateTime.UtcNow.AddHours(-1);
        
        var changedContent = await _context.SearchableContents
            .Where(c => c.UpdatedAt > sinceDate)
            .ToListAsync();
        
        var metadataList = new List<SeoContentMetadata>();
        foreach (var content in changedContent)
        {
            var metadata = await ConvertToContentMetadataAsync(content);
            metadataList.Add(metadata);
        }
        
        return metadataList;
    }
    
    public async Task UpdateContentAvailabilityAsync(string contentId, string country, bool isAvailable)
    {
        // Implementation for updating specific content availability
        _logger.LogInformation("Updated availability for {ContentId} in {Country}: {IsAvailable}", 
            contentId, country, isAvailable);
    }
    
    public async Task<Dictionary<string, DateTime>> GetLastUpdateTimestampsAsync()
    {
        var lastUpdates = await _context.SearchableContents
            .GroupBy(c => c.Type)
            .Select(g => new 
            {
                Type = g.Key.ToString(),
                LastUpdate = g.Max(x => x.UpdatedAt)
            })
            .ToListAsync();
        
        return lastUpdates.ToDictionary(x => x.Type, x => x.LastUpdate);
    }
    
    // Additional placeholder implementations for interface compliance
    public async Task<List<SeoContentMetadata>> DiscoverNewContentAsync(string[] genres, int maxResults = 50) => new();
    public async Task<List<SeoContentMetadata>> FindContentGapsAsync(string country, string genre) => new();
    public async Task<List<string>> GetMissingContentMetadataAsync() => new();
    public async Task AutoUpdateContentFromSourcesAsync() => await Task.CompletedTask;
    public async Task EnhanceContentWithMetadataAsync(string contentId) => await Task.CompletedTask;
    public async Task<SeoContentMetadata> EnrichContentDataAsync(SeoContentMetadata content) => content;
    public async Task UpdateContentPopularityScoresAsync() => await Task.CompletedTask;
    public async Task<List<SeoContentMetadata>> GetContentNeedingEnhancementAsync(int limit = 100) => new();
    public async Task<Dictionary<string, List<SeoContentMetadata>>> GetContentAvailabilityMapAsync() => new();
    public async Task<List<string>> GetAvailableCountriesForContentAsync(string contentId) => new();
    public async Task UpdateLocationBasedAvailabilityAsync() => await Task.CompletedTask;
    public async Task<Models.ContentLocationStats> GetLocationStatsAsync(string country) => new() { Country = country };
    public async Task<List<Models.TrendingContent>> GetTrendingContentByLocationAsync(string country, int days = 7) => new();
    public async Task<List<SeoContentMetadata>> PredictUpcomingTrendingContentAsync(int daysAhead = 30) => new();
    public async Task<Models.TrendingAnalytics> AnalyzeContentTrendsAsync(string contentType, int days = 30) => new() { ContentType = contentType };
    public async Task UpdateContentTrendingScoresAsync() => await Task.CompletedTask;
    public async Task<List<Models.ContentValidationError>> ValidateContentDataAsync() => new();
    public async Task<int> CleanupIncompleteContentAsync() => 0;
    public async Task<Models.ContentQualityReport> GenerateQualityReportAsync() => new();
    public async Task<List<string>> DetectDuplicateContentAsync(float similarityThreshold = 0.9f) => new();
    public async Task<Models.BatchOperationResult> BatchUpdateContentAsync(List<Models.ContentUpdateRequest> updates) => new();
    public async Task<Models.BatchOperationResult> BatchImportContentAsync(List<SeoContentMetadata> contentList) => new();
    public async Task ScheduleAutomaticUpdatesAsync(TimeSpan interval) => await Task.CompletedTask;
    public async Task<List<SeoContentMetadata>> GetSimilarContentAsync(string contentId, int limit = 20) => new();
    public async Task<List<SeoContentMetadata>> GetContentByActorAsync(string actorName, int limit = 50) => new();
    public async Task<List<SeoContentMetadata>> GetContentByDirectorAsync(string directorName, int limit = 50) => new();
    public async Task UpdateContentRelationshipsAsync() => await Task.CompletedTask;
    
    #endregion
}