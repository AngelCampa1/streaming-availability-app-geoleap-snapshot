using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using GeoLeap.Api.Data;
using GeoLeap.Api.ProgrammaticSeo.Models;
using System.Text.Json;
using System.Net.Http;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Content metadata service for programmatic SEO system
/// Handles content freshness, trending detection, and metadata enrichment
/// </summary>
public class ContentMetadataService : IContentMetadataService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ContentMetadataService> _logger;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    public ContentMetadataService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<ContentMetadataService> logger,
        IConfiguration configuration,
        HttpClient httpClient)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
        _configuration = configuration;
        _httpClient = httpClient;
    }

    #region Content Freshness System

    /// <summary>
    /// Update content trending scores based on real-time data
    /// </summary>
    public async Task UpdateContentTrendingScoresAsync()
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-30);
            var pages = await _context.SeoPages
                .Where(p => p.IsPublished && p.GeneratedAt > cutoffDate)
                .Include(p => p.Template)
                .ToListAsync();

            var updatedCount = 0;

            foreach (var page in pages)
            {
                var variables = JsonSerializer.Deserialize<Dictionary<string, object>>(page.VariableValues) ?? new();
                var trendingScore = await CalculateTrendingScoreAsync(variables, page.Template?.Type ?? "general");
                
                // Update page if trending score changed significantly
                if (Math.Abs(page.TrendingScore - trendingScore) > 0.1f)
                {
                    page.TrendingScore = trendingScore;
                    page.LastUpdated = DateTime.UtcNow;
                    updatedCount++;
                }
            }

            if (updatedCount > 0)
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Updated trending scores for {Count} pages", updatedCount);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update content trending scores");
            throw;
        }
    }

    /// <summary>
    /// Get trending content within specified hours
    /// </summary>
    public async Task<List<TrendingContent>> GetTrendingContentAsync(int hours = 24)
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddHours(-hours);
            
            var trendingContent = new List<TrendingContent>();

            // Get trending from various sources
            var socialTrends = await GetSocialMediaTrendsAsync(hours);
            var searchTrends = await GetSearchTrendsAsync(hours);
            var newsTrends = await GetNewsTrendsAsync(hours);

            // Combine and score trending content
            var allTrends = socialTrends.Concat(searchTrends).Concat(newsTrends)
                .GroupBy(t => t.Topic.ToLowerInvariant())
                .Select(g => new TrendingContent
                {
                    Topic = g.First().Topic,
                    ContentType = DetermineContentType(g.First().Topic),
                    TrendingScore = g.Sum(t => t.TrendingScore),
                    Sources = g.SelectMany(t => t.Sources).Distinct().ToList(),
                    Keywords = ExtractKeywords(g.First().Topic),
                    EstimatedSearchVolume = g.Max(t => t.EstimatedSearchVolume),
                    TrendStarted = g.Min(t => t.TrendStarted),
                    VelocityScore = CalculateVelocityScore(g.ToList()),
                    ContentOpportunities = await GenerateContentOpportunitiesAsync(g.First().Topic)
                })
                .OrderByDescending(t => t.TrendingScore)
                .Take(50)
                .ToList();

            return allTrends;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get trending content");
            return new List<TrendingContent>();
        }
    }

    /// <summary>
    /// Import streaming availability data for content enrichment
    /// </summary>
    public async Task<List<ContentMetadata>> ImportStreamingAvailabilityAsync(string country = "US")
    {
        try
        {
            var cacheKey = $"streaming_availability_{country}";
            if (_cache.TryGetValue(cacheKey, out List<ContentMetadata>? cached))
            {
                return cached!;
            }

            var contentList = new List<ContentMetadata>();
            
            // Simulate streaming API data import
            var streamingServices = new[] { "Netflix", "Amazon Prime", "Hulu", "Disney+", "HBO Max", "Apple TV+" };
            var genres = new[] { "Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Documentary", "Romance" };
            
            for (int i = 0; i < 1000; i++) // Import 1000 content items
            {
                var random = new Random(i);
                var content = new ContentMetadata
                {
                    ExternalId = $"tmdb_{10000 + i}",
                    Title = GenerateContentTitle(genres[random.Next(genres.Length)], random),
                    ContentType = random.Next(2) == 0 ? "movie" : "tv_series",
                    Genre = genres[random.Next(genres.Length)],
                    Country = country,
                    Language = GetLanguageForCountry(country),
                    ReleaseYear = random.Next(2010, 2025),
                    Rating = (float)(random.NextDouble() * 4 + 6), // 6.0 - 10.0
                    Duration = random.Next(90, 180), // minutes
                    StreamingServices = streamingServices
                        .Where(s => random.NextDouble() > 0.7) // 30% chance per service
                        .ToList(),
                    PopularityScore = (float)(random.NextDouble() * 100),
                    TrendingScore = CalculateInitialTrendingScore(random),
                    Keywords = GenerateKeywordsForContent(genres[random.Next(genres.Length)]),
                    LastUpdated = DateTime.UtcNow,
                    IsActive = true
                };

                // Add synopsis and other metadata
                content.Synopsis = GenerateSynopsis(content.Title, content.Genre);
                content.Cast = GenerateCast(random);
                content.Directors = GenerateDirectors(random);
                
                contentList.Add(content);
            }

            // Store in database
            foreach (var content in contentList)
            {
                var existing = await _context.ContentMetadata
                    .FirstOrDefaultAsync(c => c.ExternalId == content.ExternalId);

                if (existing == null)
                {
                    _context.ContentMetadata.Add(content);
                }
                else
                {
                    // Update existing
                    existing.StreamingServices = content.StreamingServices;
                    existing.PopularityScore = content.PopularityScore;
                    existing.TrendingScore = content.TrendingScore;
                    existing.LastUpdated = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            // Cache for 6 hours
            _cache.Set(cacheKey, contentList, TimeSpan.FromHours(6));

            _logger.LogInformation("Imported {Count} content metadata items for {Country}", contentList.Count, country);
            
            return contentList;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to import streaming availability for {Country}", country);
            throw;
        }
    }

    /// <summary>
    /// Detect content staleness and flag for refresh
    /// </summary>
    public async Task<List<StaleContent>> DetectStaleContentAsync(int maxDaysOld = 30)
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-maxDaysOld);
            
            var stalePages = await _context.SeoPages
                .Where(p => p.IsPublished && p.LastUpdated < cutoffDate)
                .Include(p => p.Template)
                .ToListAsync();

            var staleContent = new List<StaleContent>();

            foreach (var page in stalePages)
            {
                var variables = JsonSerializer.Deserialize<Dictionary<string, object>>(page.VariableValues) ?? new();
                var staleness = await CalculateContentStalenessAsync(page, variables);
                
                if (staleness.Score > 0.5f) // 50% staleness threshold
                {
                    staleContent.Add(new StaleContent
                    {
                        PageId = page.Id,
                        Slug = page.Slug,
                        Title = page.MetaTitle,
                        LastUpdated = page.LastUpdated ?? page.GeneratedAt,
                        StalenessScore = staleness.Score,
                        StalenessReasons = staleness.Reasons,
                        Priority = staleness.Score > 0.8f ? "High" : staleness.Score > 0.6f ? "Medium" : "Low",
                        RecommendedActions = staleness.RecommendedActions
                    });
                }
            }

            return staleContent.OrderByDescending(s => s.StalenessScore).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to detect stale content");
            return new List<StaleContent>();
        }
    }

    /// <summary>
    /// Auto-refresh stale content based on triggers
    /// </summary>
    public async Task<int> AutoRefreshStaleContentAsync(int batchSize = 50)
    {
        try
        {
            var staleContent = await DetectStaleContentAsync();
            var highPriorityStale = staleContent
                .Where(s => s.Priority == "High")
                .Take(batchSize)
                .ToList();

            var refreshedCount = 0;

            foreach (var stale in highPriorityStale)
            {
                var page = await _context.SeoPages
                    .Include(p => p.Template)
                    .FirstOrDefaultAsync(p => p.Id == stale.PageId);

                if (page != null && page.Template != null)
                {
                    // Refresh page variables with new data
                    var updatedVariables = await RefreshPageVariablesAsync(page);
                    
                    // Update page content
                    if (updatedVariables.Any())
                    {
                        page.VariableValues = JsonSerializer.Serialize(updatedVariables);
                        page.LastUpdated = DateTime.UtcNow;
                        refreshedCount++;
                    }
                }
            }

            if (refreshedCount > 0)
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Auto-refreshed {Count} stale content pages", refreshedCount);
            }

            return refreshedCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to auto-refresh stale content");
            throw;
        }
    }

    #endregion

    #region Content Enrichment

    /// <summary>
    /// Enrich content with additional metadata
    /// </summary>
    public async Task<ContentMetadata> EnrichContentMetadataAsync(ContentMetadata content)
    {
        try
        {
            // Add trending keywords
            content.TrendingKeywords = await GetTrendingKeywordsForContentAsync(content);
            
            // Update popularity scores
            content.PopularityScore = await CalculatePopularityScoreAsync(content);
            
            // Add related content
            content.RelatedContent = await FindRelatedContentAsync(content);
            
            // Update streaming availability
            if (content.StreamingServices?.Any() != true)
            {
                content.StreamingServices = await GetStreamingServicesAsync(content.ExternalId);
            }
            
            // Generate SEO-optimized keywords
            content.SeoKeywords = await GenerateSeoKeywordsAsync(content);
            
            content.LastEnriched = DateTime.UtcNow;
            
            return content;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to enrich content metadata for {ContentId}", content.Id);
            return content;
        }
    }

    /// <summary>
    /// Generate content variants for A/B testing
    /// </summary>
    public async Task<List<ContentVariant>> GenerateContentVariantsAsync(long contentId, int variantCount = 3)
    {
        try
        {
            var content = await _context.ContentMetadata.FindAsync(contentId);
            if (content == null) return new List<ContentVariant>();

            var variants = new List<ContentVariant>();
            
            for (int i = 0; i < variantCount; i++)
            {
                var variant = new ContentVariant
                {
                    ContentId = contentId,
                    VariantName = $"Variant_{i + 1}",
                    Title = GenerateTitleVariant(content.Title, i),
                    Synopsis = GenerateSynopsisVariant(content.Synopsis, i),
                    Keywords = GenerateKeywordVariants(content.Keywords, i),
                    MetaTitle = GenerateMetaTitleVariant(content.Title, i),
                    MetaDescription = GenerateMetaDescriptionVariant(content.Synopsis, i),
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true,
                    TestingWeight = 100 / variantCount // Equal distribution
                };

                variants.Add(variant);
            }

            return variants;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate content variants for {ContentId}", contentId);
            return new List<ContentVariant>();
        }
    }

    #endregion

    #region Helper Methods

    private async Task<float> CalculateTrendingScoreAsync(Dictionary<string, object> variables, string contentType)
    {
        float score = 0f;

        try
        {
            // Base score from view metrics (simulated)
            if (variables.ContainsKey("views"))
            {
                var views = Convert.ToInt32(variables["views"]);
                score += Math.Min(50f, views / 1000f);
            }

            // Social mentions factor
            if (variables.ContainsKey("title"))
            {
                var socialMentions = await GetSocialMentionsAsync(variables["title"].ToString()!);
                score += Math.Min(25f, socialMentions / 100f);
            }

            // Recency factor
            if (variables.ContainsKey("release_date"))
            {
                var releaseDate = DateTime.Parse(variables["release_date"].ToString()!);
                var daysSinceRelease = (DateTime.UtcNow - releaseDate).TotalDays;
                
                if (daysSinceRelease <= 30)
                    score += 20f;
                else if (daysSinceRelease <= 90)
                    score += 10f;
            }

            // Content type multiplier
            var typeMultiplier = contentType switch
            {
                "movie" => 1.2f,
                "tv_series" => 1.1f,
                "documentary" => 0.9f,
                _ => 1.0f
            };

            score *= typeMultiplier;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error calculating trending score, using default");
            score = 25f; // Default score
        }

        return Math.Min(100f, Math.Max(0f, score));
    }

    private async Task<List<TrendingContent>> GetSocialMediaTrendsAsync(int hours)
    {
        // Simulated social media trends
        var trends = new List<TrendingContent>();
        var topics = new[] 
        { 
            "Marvel Phase 5", "Netflix Originals", "Oscar Winners", "Summer Blockbusters",
            "Horror Movies", "Superhero Films", "Romantic Comedies", "Sci-Fi Series"
        };

        foreach (var topic in topics.Take(10))
        {
            trends.Add(new TrendingContent
            {
                Topic = topic,
                TrendingScore = (float)(new Random(topic.GetHashCode()).NextDouble() * 80 + 20),
                Sources = new List<string> { "Twitter", "Instagram", "TikTok" },
                EstimatedSearchVolume = new Random(topic.GetHashCode()).Next(1000, 50000),
                TrendStarted = DateTime.UtcNow.AddHours(-new Random(topic.GetHashCode()).Next(1, hours))
            });
        }

        return trends;
    }

    private async Task<List<TrendingContent>> GetSearchTrendsAsync(int hours)
    {
        // Simulated search trends
        var trends = new List<TrendingContent>();
        var searchTerms = new[]
        {
            "watch movies online", "best TV shows 2024", "streaming services comparison",
            "new releases this month", "movie reviews", "where to watch"
        };

        foreach (var term in searchTerms)
        {
            trends.Add(new TrendingContent
            {
                Topic = term,
                TrendingScore = (float)(new Random(term.GetHashCode()).NextDouble() * 70 + 30),
                Sources = new List<string> { "Google Trends", "Bing" },
                EstimatedSearchVolume = new Random(term.GetHashCode()).Next(5000, 100000),
                TrendStarted = DateTime.UtcNow.AddHours(-new Random(term.GetHashCode()).Next(2, hours))
            });
        }

        return trends;
    }

    private async Task<List<TrendingContent>> GetNewsTrendsAsync(int hours)
    {
        // Simulated news trends
        var trends = new List<TrendingContent>();
        var newsTopics = new[]
        {
            "Box Office Results", "Streaming Wars", "Celebrity News", "Film Festival",
            "Award Season", "Movie Trailers", "TV Renewals", "Netflix Cancellations"
        };

        foreach (var topic in newsTopics.Take(8))
        {
            trends.Add(new TrendingContent
            {
                Topic = topic,
                TrendingScore = (float)(new Random(topic.GetHashCode()).NextDouble() * 60 + 40),
                Sources = new List<string> { "Entertainment News", "Trade Publications" },
                EstimatedSearchVolume = new Random(topic.GetHashCode()).Next(2000, 30000),
                TrendStarted = DateTime.UtcNow.AddHours(-new Random(topic.GetHashCode()).Next(3, hours))
            });
        }

        return trends;
    }

    private string DetermineContentType(string topic)
    {
        var movieKeywords = new[] { "movie", "film", "cinema", "blockbuster", "box office" };
        var tvKeywords = new[] { "tv", "series", "show", "season", "episode" };
        
        var lowerTopic = topic.ToLowerInvariant();
        
        if (movieKeywords.Any(k => lowerTopic.Contains(k)))
            return "movie";
        
        if (tvKeywords.Any(k => lowerTopic.Contains(k)))
            return "tv_series";
        
        return "general";
    }

    private List<string> ExtractKeywords(string topic)
    {
        var keywords = new List<string>();
        var words = topic.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        
        // Add individual significant words
        foreach (var word in words.Where(w => w.Length > 3))
        {
            keywords.Add(word.ToLowerInvariant());
        }
        
        // Add the full topic as a long-tail keyword
        keywords.Add(topic.ToLowerInvariant());
        
        return keywords.Distinct().ToList();
    }

    private float CalculateVelocityScore(List<TrendingContent> trends)
    {
        if (!trends.Any()) return 0f;
        
        // Calculate how quickly the trend is growing
        var timeSpan = DateTime.UtcNow - trends.Min(t => t.TrendStarted);
        var scoreIncrease = trends.Sum(t => t.TrendingScore);
        
        if (timeSpan.TotalHours > 0)
        {
            return (float)(scoreIncrease / timeSpan.TotalHours);
        }
        
        return scoreIncrease;
    }

    private async Task<List<ContentOpportunity>> GenerateContentOpportunitiesAsync(string topic)
    {
        var opportunities = new List<ContentOpportunity>();
        var templates = new[] { "review", "guide", "comparison", "news", "analysis" };
        
        foreach (var template in templates.Take(3))
        {
            opportunities.Add(new ContentOpportunity
            {
                Topic = topic,
                ContentType = template,
                EstimatedTraffic = new Random($"{topic}{template}".GetHashCode()).Next(500, 5000),
                DifficultyScore = (float)(new Random($"{topic}{template}".GetHashCode()).NextDouble() * 100),
                OpportunityScore = new Random($"{topic}{template}".GetHashCode()).Next(20, 95)
            });
        }
        
        return opportunities;
    }

    private async Task<ContentStalenessInfo> CalculateContentStalenessAsync(SeoPage page, Dictionary<string, object> variables)
    {
        var info = new ContentStalenessInfo();
        var reasons = new List<string>();
        var actions = new List<string>();
        
        float score = 0f;
        
        // Age factor
        var daysSinceUpdate = (DateTime.UtcNow - (page.LastUpdated ?? page.GeneratedAt)).TotalDays;
        if (daysSinceUpdate > 30)
        {
            score += 0.3f;
            reasons.Add($"Content hasn't been updated for {daysSinceUpdate:F0} days");
            actions.Add("Update content with latest information");
        }
        
        // Performance decline
        if (page.ViewCount < 100)
        {
            score += 0.2f;
            reasons.Add("Low view count indicates declining relevance");
            actions.Add("Optimize for better keywords or trending topics");
        }
        
        // Keyword relevance decline (simulated)
        if (variables.ContainsKey("keywords"))
        {
            var keywordsOutdated = await AreKeywordsOutdatedAsync(variables["keywords"].ToString()!);
            if (keywordsOutdated)
            {
                score += 0.3f;
                reasons.Add("Target keywords are no longer trending");
                actions.Add("Research and update with trending keywords");
            }
        }
        
        // Content type specific factors
        if (variables.ContainsKey("year"))
        {
            var year = Convert.ToInt32(variables["year"]);
            if (year < DateTime.UtcNow.Year - 2)
            {
                score += 0.2f;
                reasons.Add("Content references outdated year");
                actions.Add("Update year references and related information");
            }
        }
        
        info.Score = Math.Min(1f, score);
        info.Reasons = reasons;
        info.RecommendedActions = actions;
        
        return info;
    }

    private async Task<Dictionary<string, object>> RefreshPageVariablesAsync(SeoPage page)
    {
        var variables = JsonSerializer.Deserialize<Dictionary<string, object>>(page.VariableValues) ?? new();
        var updated = false;
        
        // Update year to current
        if (variables.ContainsKey("year"))
        {
            variables["year"] = DateTime.UtcNow.Year.ToString();
            updated = true;
        }
        
        // Update trending keywords
        if (variables.ContainsKey("genre"))
        {
            var trendingKeywords = await GetTrendingKeywordsForGenreAsync(variables["genre"].ToString()!);
            if (trendingKeywords.Any())
            {
                variables["trending_keywords"] = string.Join(", ", trendingKeywords);
                updated = true;
            }
        }
        
        // Update last_updated timestamp
        variables["last_updated"] = DateTime.UtcNow.ToString("yyyy-MM-dd");
        updated = true;
        
        return updated ? variables : new Dictionary<string, object>();
    }

    private string GenerateContentTitle(string genre, Random random)
    {
        var titleFormats = new[]
        {
            "Best {0} Movies of {1}",
            "Top {0} Films to Watch",
            "Ultimate {0} Movie Guide",
            "Must-Watch {0} Movies",
            "Greatest {0} Films Ever Made"
        };
        
        var format = titleFormats[random.Next(titleFormats.Length)];
        return string.Format(format, genre, DateTime.UtcNow.Year);
    }

    private string GetLanguageForCountry(string country)
    {
        return country switch
        {
            "US" => "en",
            "UK" => "en",
            "CA" => "en",
            "AU" => "en",
            "DE" => "de",
            "FR" => "fr",
            "ES" => "es",
            "IT" => "it",
            "JP" => "ja",
            _ => "en"
        };
    }

    private float CalculateInitialTrendingScore(Random random)
    {
        return (float)(random.NextDouble() * 60 + 20); // 20-80 range
    }

    private List<string> GenerateKeywordsForContent(string genre)
    {
        var keywords = new List<string>
        {
            $"{genre.ToLower()} movies",
            $"best {genre.ToLower()} films",
            $"watch {genre.ToLower()}",
            $"{genre.ToLower()} streaming",
            "movie reviews",
            "film recommendations"
        };
        
        return keywords;
    }

    private string GenerateSynopsis(string title, string genre)
    {
        var templates = new[]
        {
            "Discover the best {0} content with our comprehensive guide to {1}. From classic films to modern masterpieces, explore everything you need to know.",
            "Your ultimate resource for {0} entertainment. Find the top {1} movies and shows, complete with streaming availability and expert reviews.",
            "Explore the world of {0} with our detailed analysis of the best {1} content available for streaming today."
        };
        
        var template = templates[new Random(title.GetHashCode()).Next(templates.Length)];
        return string.Format(template, genre.ToLower(), genre.ToLower());
    }

    private List<string> GenerateCast(Random random)
    {
        var actors = new[]
        {
            "John Smith", "Emma Johnson", "Michael Brown", "Sarah Davis",
            "David Wilson", "Lisa Anderson", "Robert Taylor", "Jennifer Miller"
        };
        
        return actors.OrderBy(x => random.Next()).Take(random.Next(3, 6)).ToList();
    }

    private List<string> GenerateDirectors(Random random)
    {
        var directors = new[]
        {
            "Christopher Nolan", "Steven Spielberg", "Martin Scorsese", "Quentin Tarantino",
            "Denis Villeneuve", "Jordan Peele", "Greta Gerwig", "Chloé Zhao"
        };
        
        return directors.OrderBy(x => random.Next()).Take(random.Next(1, 3)).ToList();
    }

    private async Task<int> GetSocialMentionsAsync(string title)
    {
        // Simulated social media mentions
        return new Random(title.GetHashCode()).Next(50, 1000);
    }

    private async Task<bool> AreKeywordsOutdatedAsync(string keywords)
    {
        // Simplified outdated keyword detection
        var outdatedTerms = new[] { "2022", "2021", "2020", "last year", "this year" };
        return outdatedTerms.Any(term => keywords.ToLowerInvariant().Contains(term));
    }

    private async Task<List<string>> GetTrendingKeywordsForGenreAsync(string genre)
    {
        // Simulated trending keywords for genre
        return new List<string>
        {
            $"{genre.ToLower()} 2024",
            $"new {genre.ToLower()} movies",
            $"trending {genre.ToLower()}",
            $"popular {genre.ToLower()} shows"
        };
    }

    // Additional helper methods for content enrichment
    private async Task<List<string>> GetTrendingKeywordsForContentAsync(ContentMetadata content)
    {
        var keywords = new List<string>();
        
        // Add trending keywords based on content
        if (!string.IsNullOrEmpty(content.Genre))
        {
            keywords.AddRange(await GetTrendingKeywordsForGenreAsync(content.Genre));
        }
        
        // Add year-based trending keywords
        keywords.Add($"{content.ContentType} {DateTime.UtcNow.Year}");
        keywords.Add($"new {content.ContentType} releases");
        
        return keywords;
    }

    private async Task<float> CalculatePopularityScoreAsync(ContentMetadata content)
    {
        float score = content.PopularityScore;
        
        // Boost based on recent activity
        if (content.LastUpdated > DateTime.UtcNow.AddDays(-7))
            score += 10;
        
        // Boost based on streaming availability
        if (content.StreamingServices?.Count > 2)
            score += 5;
        
        return Math.Min(100, score);
    }

    private async Task<List<string>> FindRelatedContentAsync(ContentMetadata content)
    {
        var related = await _context.ContentMetadata
            .Where(c => c.Genre == content.Genre && c.Id != content.Id)
            .Select(c => c.Title)
            .Take(5)
            .ToListAsync();
        
        return related;
    }

    private async Task<List<string>> GetStreamingServicesAsync(string externalId)
    {
        // Simulated streaming service lookup
        var services = new[] { "Netflix", "Amazon Prime", "Hulu", "Disney+" };
        return services.Where(s => new Random(externalId.GetHashCode()).NextDouble() > 0.6).ToList();
    }

    private async Task<List<string>> GenerateSeoKeywordsAsync(ContentMetadata content)
    {
        var keywords = new List<string>
        {
            $"watch {content.Title.ToLower()}",
            $"{content.Title.ToLower()} streaming",
            $"{content.Title.ToLower()} online",
            $"where to watch {content.Title.ToLower()}",
            $"{content.Genre.ToLower()} movies"
        };
        
        return keywords;
    }

    // Content variant generation methods
    private string GenerateTitleVariant(string originalTitle, int variantIndex)
    {
        var prefixes = new[] { "Ultimate", "Complete", "Best", "Top", "Essential" };
        var suffixes = new[] { "Guide", "Collection", "Review", "Analysis", "Overview" };
        
        return variantIndex switch
        {
            0 => $"{prefixes[variantIndex % prefixes.Length]} {originalTitle}",
            1 => $"{originalTitle} {suffixes[variantIndex % suffixes.Length]}",
            _ => originalTitle
        };
    }

    private string GenerateSynopsisVariant(string originalSynopsis, int variantIndex)
    {
        if (string.IsNullOrEmpty(originalSynopsis)) return originalSynopsis;
        
        var variations = new[]
        {
            originalSynopsis,
            $"Comprehensive overview: {originalSynopsis}",
            $"In-depth analysis: {originalSynopsis}"
        };
        
        return variations[Math.Min(variantIndex, variations.Length - 1)];
    }

    private List<string> GenerateKeywordVariants(List<string> originalKeywords, int variantIndex)
    {
        var variants = new List<string>(originalKeywords);
        
        var additionalKeywords = variantIndex switch
        {
            0 => new[] { "comprehensive", "detailed", "ultimate" },
            1 => new[] { "complete", "full", "extensive" },
            _ => new[] { "best", "top", "essential" }
        };
        
        variants.AddRange(additionalKeywords);
        return variants;
    }

    private string GenerateMetaTitleVariant(string title, int variantIndex)
    {
        var patterns = new[]
        {
            title,
            $"{title} | Complete Guide",
            $"{title} - Everything You Need to Know"
        };
        
        return patterns[Math.Min(variantIndex, patterns.Length - 1)];
    }

    private string GenerateMetaDescriptionVariant(string synopsis, int variantIndex)
    {
        if (string.IsNullOrEmpty(synopsis)) return synopsis;
        
        var patterns = new[]
        {
            synopsis,
            $"Discover everything about: {synopsis}",
            $"Complete guide to: {synopsis}"
        };
        
        return patterns[Math.Min(variantIndex, patterns.Length - 1)];
    }

    #endregion
}

#region Supporting Models

/// <summary>
/// Trending content item
/// </summary>
public class TrendingContent
{
    public string Topic { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public float TrendingScore { get; set; }
    public List<string> Sources { get; set; } = new();
    public List<string> Keywords { get; set; } = new();
    public int EstimatedSearchVolume { get; set; }
    public DateTime TrendStarted { get; set; }
    public float VelocityScore { get; set; }
    public List<ContentOpportunity> ContentOpportunities { get; set; } = new();
}

/// <summary>
/// Content opportunity
/// </summary>
public class ContentOpportunity
{
    public string Topic { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public int EstimatedTraffic { get; set; }
    public float DifficultyScore { get; set; }
    public int OpportunityScore { get; set; }
}

/// <summary>
/// Stale content item
/// </summary>
public class StaleContent
{
    public long PageId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime LastUpdated { get; set; }
    public float StalenessScore { get; set; }
    public List<string> StalenessReasons { get; set; } = new();
    public string Priority { get; set; } = string.Empty;
    public List<string> RecommendedActions { get; set; } = new();
}

/// <summary>
/// Content staleness information
/// </summary>
public class ContentStalenessInfo
{
    public float Score { get; set; }
    public List<string> Reasons { get; set; } = new();
    public List<string> RecommendedActions { get; set; } = new();
}

/// <summary>
/// Content variant for A/B testing
/// </summary>
public class ContentVariant
{
    public long Id { get; set; }
    public long ContentId { get; set; }
    public string VariantName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Synopsis { get; set; } = string.Empty;
    public List<string> Keywords { get; set; } = new();
    public string MetaTitle { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
    public int TestingWeight { get; set; }
    public int Views { get; set; }
    public float ConversionRate { get; set; }
}

#endregion