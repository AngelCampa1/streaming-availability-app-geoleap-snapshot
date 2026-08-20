using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.ProgrammaticSeo.Models;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Net.Http;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Service for automated keyword research and trending content detection
/// Integrates with multiple data sources for comprehensive keyword analysis
/// </summary>
public class KeywordResearchService : IKeywordResearchService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<KeywordResearchService> _logger;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    
    // External API configurations
    private readonly string _googleTrendsApiKey;
    private readonly string _semrushApiKey;
    private readonly string _keywordsEverywhereApiKey;
    
    public KeywordResearchService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<KeywordResearchService> logger,
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
        _httpClient = httpClient;
        _configuration = configuration;
        
        // Get API keys from configuration
        _googleTrendsApiKey = configuration["KeywordResearch:GoogleTrendsApiKey"] ?? "";
        _semrushApiKey = configuration["KeywordResearch:SemrushApiKey"] ?? "";
        _keywordsEverywhereApiKey = configuration["KeywordResearch:KeywordsEverywhereApiKey"] ?? "";
    }
    
    #region Keyword Discovery
    
    public async Task<List<SeoKeyword>> DiscoverKeywordsAsync(string seedKeyword, int maxResults = 100)
    {
        try
        {
            var cacheKey = $"keyword_discovery_{seedKeyword}_{maxResults}";
            if (_cache.TryGetValue(cacheKey, out List<SeoKeyword>? cachedKeywords))
            {
                return cachedKeywords!;
            }
            
            var keywords = new List<SeoKeyword>();
            
            // Generate variations
            keywords.AddRange(await GenerateKeywordVariationsAsync(seedKeyword));
            
            // Add related keywords from external APIs
            if (!string.IsNullOrEmpty(_keywordsEverywhereApiKey))
            {
                keywords.AddRange(await GetRelatedKeywordsFromApiAsync(seedKeyword));
            }
            
            // Add long-tail variations
            keywords.AddRange(await GenerateLongTailKeywordsAsync(seedKeyword));
            
            // Analyze each keyword
            var analyzedKeywords = new List<SeoKeyword>();
            foreach (var keyword in keywords.Take(maxResults))
            {
                var analyzed = await AnalyzeKeywordAsync(keyword.Keyword);
                analyzedKeywords.Add(analyzed);
                
                // Add small delay to prevent API rate limiting
                await Task.Delay(100);
            }
            
            // Sort by opportunity score (high volume, low competition)
            var sortedKeywords = analyzedKeywords
                .Where(k => k.SearchVolume > 0)
                .OrderByDescending(k => CalculateOpportunityScore(k))
                .Take(maxResults)
                .ToList();
            
            // Cache results for 1 hour
            _cache.Set(cacheKey, sortedKeywords, TimeSpan.FromHours(1));
            
            _logger.LogInformation("Discovered {Count} keywords for seed '{SeedKeyword}'", sortedKeywords.Count, seedKeyword);
            
            return sortedKeywords;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to discover keywords for seed '{SeedKeyword}'", seedKeyword);
            throw;
        }
    }
    
    public async Task<List<SeoKeyword>> GetTrendingKeywordsAsync(string contentType = "all", int days = 7)
    {
        try
        {
            var cacheKey = $"trending_keywords_{contentType}_{days}";
            if (_cache.TryGetValue(cacheKey, out List<SeoKeyword>? cachedTrending))
            {
                return cachedTrending!;
            }
            
            var trendingKeywords = new List<SeoKeyword>();
            
            // Get trending from Google Trends API
            if (!string.IsNullOrEmpty(_googleTrendsApiKey))
            {
                trendingKeywords.AddRange(await GetGoogleTrendingKeywordsAsync(contentType, days));
            }
            
            // Analyze trending content from our database
            var dbTrending = await GetDatabaseTrendingKeywordsAsync(contentType, days);
            trendingKeywords.AddRange(dbTrending);
            
            // Get social media trends (Twitter/X, TikTok, etc.)
            trendingKeywords.AddRange(await GetSocialMediaTrendsAsync(contentType));
            
            // Deduplicate and analyze
            var uniqueKeywords = trendingKeywords
                .GroupBy(k => k.Keyword.ToLowerInvariant())
                .Select(g => g.OrderByDescending(k => k.TrendingScore).First())
                .OrderByDescending(k => k.TrendingScore)
                .Take(50)
                .ToList();
            
            // Cache for 30 minutes (trending data changes frequently)
            _cache.Set(cacheKey, uniqueKeywords, TimeSpan.FromMinutes(30));
            
            return uniqueKeywords;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get trending keywords for type '{ContentType}'", contentType);
            return new List<SeoKeyword>();
        }
    }
    
    public async Task<List<SeoKeyword>> AnalyzeCompetitorKeywordsAsync(string competitorDomain)
    {
        // Implementation for competitor keyword analysis
        // Would integrate with SEMrush, Ahrefs, or similar APIs
        return new List<SeoKeyword>();
    }
    
    public async Task<List<SeoKeyword>> GetSeasonalKeywordsAsync(string category, int monthsAhead = 3)
    {
        var seasonalKeywords = new List<SeoKeyword>();
        var currentMonth = DateTime.UtcNow.Month;
        
        // Define seasonal patterns for different categories
        var seasonalPatterns = GetSeasonalPatterns();
        
        if (seasonalPatterns.TryGetValue(category.ToLower(), out var patterns))
        {
            foreach (var pattern in patterns)
            {
                for (int i = 0; i < monthsAhead; i++)
                {
                    var targetMonth = (currentMonth + i) % 12;
                    if (targetMonth == 0) targetMonth = 12;
                    
                    if (pattern.Months.Contains(targetMonth))
                    {
                        foreach (var keyword in pattern.Keywords)
                        {
                            var seasonalKeyword = await AnalyzeKeywordAsync(keyword);
                            seasonalKeyword.TrendingReason = $"seasonal_{pattern.Season}";
                            seasonalKeyword.TrendingDate = DateTime.UtcNow.AddMonths(i);
                            seasonalKeywords.Add(seasonalKeyword);
                        }
                    }
                }
            }
        }
        
        return seasonalKeywords.OrderByDescending(k => k.SearchVolume).ToList();
    }
    
    #endregion
    
    #region Keyword Analysis
    
    public async Task<SeoKeyword> AnalyzeKeywordAsync(string keyword)
    {
        try
        {
            // Check if keyword already exists and is recent
            var existingKeyword = await _context.SeoKeywords
                .FirstOrDefaultAsync(k => k.Keyword == keyword && 
                    k.LastUpdated > DateTime.UtcNow.AddHours(-24));
                    
            if (existingKeyword != null)
            {
                return existingKeyword;
            }
            
            var seoKeyword = new SeoKeyword
            {
                Keyword = keyword,
                WordCount = keyword.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length,
                IsLongTail = keyword.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length > 3,
                CreatedAt = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            };
            
            // Get search volume
            seoKeyword.SearchVolume = await GetSearchVolumeAsync(keyword);
            
            // Calculate keyword difficulty
            seoKeyword.KeywordDifficulty = await CalculateKeywordDifficultyAsync(keyword);
            
            // Get competition score
            seoKeyword.CompetitionScore = await CalculateCompetitionScoreAsync(keyword);
            
            // Get CPC data
            seoKeyword.CostPerClick = await GetCostPerClickAsync(keyword);
            
            // Determine content type and category
            seoKeyword.ContentType = DetermineContentType(keyword);
            seoKeyword.Category = DetermineCategory(keyword);
            
            // Generate related keywords
            var relatedKeywords = await GenerateRelatedKeywordsAsync(keyword);
            seoKeyword.RelatedKeywords = JsonSerializer.Serialize(relatedKeywords.Take(10).ToList());
            
            // Save to database if new
            if (existingKeyword == null)
            {
                _context.SeoKeywords.Add(seoKeyword);
                await _context.SaveChangesAsync();
            }
            else
            {
                // Update existing
                existingKeyword.SearchVolume = seoKeyword.SearchVolume;
                existingKeyword.KeywordDifficulty = seoKeyword.KeywordDifficulty;
                existingKeyword.CompetitionScore = seoKeyword.CompetitionScore;
                existingKeyword.CostPerClick = seoKeyword.CostPerClick;
                existingKeyword.LastUpdated = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return existingKeyword;
            }
            
            return seoKeyword;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze keyword '{Keyword}'", keyword);
            throw;
        }
    }
    
    public async Task<float> CalculateKeywordDifficultyAsync(string keyword)
    {
        try
        {
            // Simplified keyword difficulty calculation
            // In production, would use APIs like Moz, Ahrefs, or SEMrush
            
            float difficulty = 0;
            
            // Factors that increase difficulty:
            // - Length (shorter = harder)
            var words = keyword.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            difficulty += Math.Max(0, 5 - words.Length) * 10; // Up to 50 points
            
            // - Commercial intent
            var commercialTerms = new[] { "buy", "purchase", "order", "price", "cost", "cheap", "deal", "sale" };
            if (commercialTerms.Any(term => keyword.ToLower().Contains(term)))
            {
                difficulty += 20;
            }
            
            // - High-value industry terms
            var highValueTerms = new[] { "insurance", "lawyer", "mortgage", "loan", "credit" };
            if (highValueTerms.Any(term => keyword.ToLower().Contains(term)))
            {
                difficulty += 30;
            }
            
            // - Generic terms
            var genericTerms = new[] { "best", "top", "review", "compare" };
            if (genericTerms.Any(term => keyword.ToLower().Contains(term)))
            {
                difficulty += 15;
            }
            
            return Math.Min(100, difficulty);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to calculate keyword difficulty for '{Keyword}'", keyword);
            return 50; // Default medium difficulty
        }
    }
    
    public async Task<int> GetSearchVolumeAsync(string keyword)
    {
        try
        {
            // Placeholder implementation
            // In production, integrate with Google Keyword Planner API or similar
            
            // Simulate based on keyword characteristics
            var words = keyword.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var baseVolume = 1000;
            
            // Longer keywords = lower volume
            baseVolume = (int)(baseVolume / Math.Pow(1.5, Math.Max(0, words.Length - 2)));
            
            // Add randomization
            var random = new Random(keyword.GetHashCode());
            var variation = random.Next(-50, 51);
            
            return Math.Max(0, baseVolume + (baseVolume * variation / 100));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get search volume for '{Keyword}'", keyword);
            return 0;
        }
    }
    
    public async Task<decimal?> GetCostPerClickAsync(string keyword)
    {
        // Placeholder implementation
        // In production, integrate with Google Ads API
        return null;
    }
    
    public async Task<float> CalculateCompetitionScoreAsync(string keyword)
    {
        // Simplified competition calculation
        var difficulty = await CalculateKeywordDifficultyAsync(keyword);
        return difficulty / 100f;
    }
    
    #endregion
    
    #region Keyword Clustering
    
    public async Task<List<List<SeoKeyword>>> ClusterKeywordsBySemanticsAsync(List<SeoKeyword> keywords)
    {
        var clusters = new List<List<SeoKeyword>>();
        var used = new HashSet<int>();
        
        for (int i = 0; i < keywords.Count; i++)
        {
            if (used.Contains(i)) continue;
            
            var cluster = new List<SeoKeyword> { keywords[i] };
            used.Add(i);
            
            // Find similar keywords
            for (int j = i + 1; j < keywords.Count; j++)
            {
                if (used.Contains(j)) continue;
                
                var similarity = CalculateSemantic​Similarity(keywords[i].Keyword, keywords[j].Keyword);
                if (similarity > 0.7f)
                {
                    cluster.Add(keywords[j]);
                    used.Add(j);
                }
            }
            
            if (cluster.Count > 1)
            {
                clusters.Add(cluster);
            }
        }
        
        return clusters;
    }
    
    public async Task<List<SeoKeyword>> GetRelatedKeywordsAsync(string keyword, float similarityThreshold = 0.7f)
    {
        var allKeywords = await _context.SeoKeywords
            .Where(k => k.LastUpdated > DateTime.UtcNow.AddDays(-30))
            .ToListAsync();
        
        var relatedKeywords = new List<SeoKeyword>();
        
        foreach (var k in allKeywords)
        {
            if (k.Keyword == keyword) continue;
            
            var similarity = CalculateSemantic​Similarity(keyword, k.Keyword);
            if (similarity >= similarityThreshold)
            {
                relatedKeywords.Add(k);
            }
        }
        
        return relatedKeywords
            .OrderByDescending(k => CalculateSemantic​Similarity(keyword, k.Keyword))
            .Take(20)
            .ToList();
    }
    
    public async Task<Dictionary<string, List<SeoKeyword>>> GroupKeywordsByIntentAsync(List<SeoKeyword> keywords)
    {
        var intentGroups = new Dictionary<string, List<SeoKeyword>>
        {
            ["informational"] = new(),
            ["navigational"] = new(),
            ["transactional"] = new(),
            ["commercial"] = new()
        };
        
        foreach (var keyword in keywords)
        {
            var intent = DetermineSearchIntent(keyword.Keyword);
            if (intentGroups.ContainsKey(intent))
            {
                intentGroups[intent].Add(keyword);
            }
        }
        
        return intentGroups;
    }
    
    #endregion
    
    #region Helper Methods
    
    private async Task<List<SeoKeyword>> GenerateKeywordVariationsAsync(string seedKeyword)
    {
        var variations = new List<SeoKeyword>();
        var modifiers = GetKeywordModifiers();
        
        foreach (var modifier in modifiers)
        {
            // Prefix variations
            variations.Add(new SeoKeyword { Keyword = $"{modifier} {seedKeyword}" });
            
            // Suffix variations  
            variations.Add(new SeoKeyword { Keyword = $"{seedKeyword} {modifier}" });
        }
        
        return variations;
    }
    
    private async Task<List<SeoKeyword>> GenerateLongTailKeywordsAsync(string seedKeyword)
    {
        var longTailVariations = new List<SeoKeyword>();
        var questions = new[] { "how to", "what is", "why", "when", "where", "best way to" };
        var prepositions = new[] { "in", "for", "with", "without", "near", "around" };
        var years = new[] { "2024", "2025" };
        
        foreach (var question in questions)
        {
            longTailVariations.Add(new SeoKeyword 
            { 
                Keyword = $"{question} {seedKeyword}",
                IsLongTail = true
            });
        }
        
        foreach (var prep in prepositions)
        {
            longTailVariations.Add(new SeoKeyword 
            { 
                Keyword = $"{seedKeyword} {prep}",
                IsLongTail = true
            });
        }
        
        return longTailVariations;
    }
    
    private List<string> GetKeywordModifiers()
    {
        return new List<string>
        {
            "best", "top", "free", "online", "guide", "tips", "review", "comparison",
            "cheap", "affordable", "premium", "professional", "easy", "simple",
            "advanced", "beginner", "expert", "ultimate", "complete", "comprehensive"
        };
    }
    
    private float CalculateOpportunityScore(SeoKeyword keyword)
    {
        if (keyword.SearchVolume == 0) return 0;
        
        // Higher score = higher volume, lower competition
        var volumeScore = Math.Min(100, keyword.SearchVolume / 100f);
        var competitionPenalty = keyword.CompetitionScore * 50;
        var difficultyPenalty = keyword.KeywordDifficulty * 0.3f;
        
        return Math.Max(0, volumeScore - competitionPenalty - difficultyPenalty);
    }
    
    private string DetermineContentType(string keyword)
    {
        var movieTerms = new[] { "movie", "film", "cinema", "watch", "streaming" };
        var tvTerms = new[] { "tv", "series", "show", "episode", "season" };
        var locationTerms = new[] { "country", "where", "available", "region" };
        
        if (movieTerms.Any(term => keyword.ToLower().Contains(term)))
            return "movie";
        
        if (tvTerms.Any(term => keyword.ToLower().Contains(term)))
            return "tv";
        
        if (locationTerms.Any(term => keyword.ToLower().Contains(term)))
            return "location";
        
        return "general";
    }
    
    private string DetermineCategory(string keyword)
    {
        // Determine category based on keyword content
        return "streaming"; // Default for this streaming service
    }
    
    private string DetermineSearchIntent(string keyword)
    {
        var informationalTerms = new[] { "what", "how", "why", "guide", "tutorial", "learn" };
        var transactionalTerms = new[] { "buy", "purchase", "order", "download", "subscribe" };
        var commercialTerms = new[] { "best", "review", "compare", "vs", "top", "price" };
        var navigationalTerms = new[] { "login", "website", "official", "homepage" };
        
        var lowerKeyword = keyword.ToLower();
        
        if (informationalTerms.Any(term => lowerKeyword.Contains(term)))
            return "informational";
        
        if (transactionalTerms.Any(term => lowerKeyword.Contains(term)))
            return "transactional";
        
        if (commercialTerms.Any(term => lowerKeyword.Contains(term)))
            return "commercial";
        
        if (navigationalTerms.Any(term => lowerKeyword.Contains(term)))
            return "navigational";
        
        return "informational"; // Default
    }
    
    private float CalculateSemantic​Similarity(string keyword1, string keyword2)
    {
        // Simplified similarity calculation
        // In production, would use more sophisticated NLP techniques
        
        var words1 = keyword1.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
        var words2 = keyword2.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
        
        var intersection = words1.Intersect(words2).Count();
        var union = words1.Union(words2).Count();
        
        return union > 0 ? (float)intersection / union : 0;
    }
    
    private Dictionary<string, List<SeasonalPattern>> GetSeasonalPatterns()
    {
        return new Dictionary<string, List<SeasonalPattern>>
        {
            ["streaming"] = new List<SeasonalPattern>
            {
                new() { Season = "holiday", Months = new[] { 11, 12, 1 }, Keywords = new[] { "christmas movies", "holiday shows", "new year specials" } },
                new() { Season = "summer", Months = new[] { 6, 7, 8 }, Keywords = new[] { "summer blockbusters", "vacation movies", "beach shows" } }
            }
        };
    }
    
    private async Task<List<SeoKeyword>> GetRelatedKeywordsFromApiAsync(string keyword)
    {
        // Placeholder for external API integration
        return new List<SeoKeyword>();
    }
    
    private async Task<List<SeoKeyword>> GetGoogleTrendingKeywordsAsync(string contentType, int days)
    {
        // Placeholder for Google Trends API integration
        return new List<SeoKeyword>();
    }
    
    private async Task<List<SeoKeyword>> GetDatabaseTrendingKeywordsAsync(string contentType, int days)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);
        
        return await _context.SeoKeywords
            .Where(k => k.LastUpdated > cutoffDate && k.TrendingScore > 0)
            .OrderByDescending(k => k.TrendingScore)
            .Take(20)
            .ToListAsync();
    }
    
    private async Task<List<SeoKeyword>> GetSocialMediaTrendsAsync(string contentType)
    {
        // Placeholder for social media trends integration
        return new List<SeoKeyword>();
    }
    
    private async Task<List<string>> GenerateRelatedKeywordsAsync(string keyword)
    {
        // Generate simple related keywords
        var related = new List<string>();
        var modifiers = GetKeywordModifiers().Take(5);
        
        foreach (var modifier in modifiers)
        {
            related.Add($"{keyword} {modifier}");
        }
        
        return related;
    }
    
    #endregion
    
    #region Placeholder Implementations
    
    public async Task<List<SeoKeyword>> DetectTrendingContentAsync(string contentType)
    {
        return await GetTrendingKeywordsAsync(contentType);
    }
    
    public async Task<List<string>> GetViralTopicsAsync(int hours = 24)
    {
        return new List<string>();
    }
    
    public async Task<Dictionary<string, float>> AnalyzeTrendVelocityAsync(List<string> keywords)
    {
        return new Dictionary<string, float>();
    }
    
    public async Task<List<SeoKeyword>> PredictUpcomingTrendsAsync(string category, int daysAhead = 30)
    {
        return new List<SeoKeyword>();
    }
    
    public async Task<List<ContentOpportunity>> FindContentGapsAsync(string niche)
    {
        return new List<ContentOpportunity>();
    }
    
    public async Task<List<string>> GetLowCompetitionKeywordsAsync(string category, int maxDifficulty = 30)
    {
        var keywords = await _context.SeoKeywords
            .Where(k => k.Category == category && k.KeywordDifficulty <= maxDifficulty)
            .OrderBy(k => k.KeywordDifficulty)
            .Take(50)
            .Select(k => k.Keyword)
            .ToListAsync();
            
        return keywords;
    }
    
    public async Task<Dictionary<string, int>> AnalyzeKeywordSeasonsAsync(List<string> keywords)
    {
        return new Dictionary<string, int>();
    }
    
    public async Task<List<KeywordCluster>> GetKeywordClustersForTemplatesAsync()
    {
        return new List<KeywordCluster>();
    }
    
    public async Task<KeywordPerformanceReport> GetKeywordPerformanceAsync(string keyword, DateTime? startDate = null, DateTime? endDate = null)
    {
        return new KeywordPerformanceReport { Keyword = keyword };
    }
    
    public async Task<List<SeoKeyword>> GetUnderperformingKeywordsAsync(int minSearchVolume = 100)
    {
        return new List<SeoKeyword>();
    }
    
    public async Task<Dictionary<string, object>> GetKeywordRankingsAsync(List<string> keywords)
    {
        return new Dictionary<string, object>();
    }
    
    public async Task<int> RefreshKeywordDataAsync(int batchSize = 500)
    {
        return 0;
    }
    
    public async Task ScheduleKeywordResearchAsync(string category, TimeSpan interval)
    {
        await Task.CompletedTask;
    }
    
    public async Task<List<SeoKeyword>> AutoGenerateKeywordVariationsAsync(string baseKeyword)
    {
        return await GenerateKeywordVariationsAsync(baseKeyword);
    }
    
    public async Task ImportKeywordsFromSearchConsoleAsync(int days = 30)
    {
        await Task.CompletedTask;
    }
    
    public async Task<List<SeoKeyword>> AnalyzeCurrentContentKeywordsAsync()
    {
        return new List<SeoKeyword>();
    }
    
    public async Task SyncKeywordsWithContentAsync()
    {
        await Task.CompletedTask;
    }
    
    #endregion
}

/// <summary>
/// Seasonal pattern for keyword predictions
/// </summary>
internal class SeasonalPattern
{
    public string Season { get; set; } = string.Empty;
    public int[] Months { get; set; } = Array.Empty<int>();
    public string[] Keywords { get; set; } = Array.Empty<string>();
}