using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Models;
using GeoLeap.Api.Data;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Progressive loading service for phased search result delivery
/// </summary>
public class ProgressiveLoadingService : IProgressiveLoadingService
{
    private readonly ISearchService _searchService;
    private readonly IDatabaseOptimizationService _databaseService;
    private readonly ICacheService _cacheService;
    private readonly ILogger<ProgressiveLoadingService> _logger;
    private readonly ApplicationDbContext _context;
    private readonly ProgressiveLoadingOptions _options;

    public ProgressiveLoadingService(
        ISearchService searchService,
        IDatabaseOptimizationService databaseService,
        ICacheService cacheService,
        ILogger<ProgressiveLoadingService> logger,
        ApplicationDbContext context,
        Microsoft.Extensions.Options.IOptions<ProgressiveLoadingOptions> options)
    {
        _searchService = searchService;
        _databaseService = databaseService;
        _cacheService = cacheService;
        _logger = logger;
        _context = context;
        _options = options.Value;
    }

    /// <summary>
    /// Phase 1: Basic search results (less than 200ms target)
    /// Returns essential content information for immediate display
    /// </summary>
    public async Task<ProgressiveSearchResponse> GetBasicResultsAsync(
        GlobalSearchRequest request,
        string correlationId,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            _logger.LogInformation("Progressive Loading Phase 1 - Basic Results Started. CorrelationId: {CorrelationId}", correlationId);

            // Check cache first for basic results
            var cacheKey = $"progressive_basic_{GenerateCacheKey(request)}";
            var cachedResults = await _cacheService.GetAsync<ProgressiveSearchResponse>(cacheKey);
            
            if (cachedResults != null)
            {
                stopwatch.Stop();
                cachedResults.ResponseTime = stopwatch.Elapsed;
                cachedResults.Metadata.UsedCache = true;
                
                _logger.LogInformation("Progressive Loading Phase 1 - Cache Hit. CorrelationId: {CorrelationId}, Duration: {Duration}ms", 
                    correlationId, stopwatch.ElapsedMilliseconds);
                
                return cachedResults;
            }

            // Get optimized basic query - only essential fields
            var basicQuery = await _databaseService.GetOptimizedSearchQuery(
                request.Query, request.ContentType, request.Year, 
                request.IncludeAdult, request.Language, cancellationToken);

            // Project to basic result structure to minimize data transfer
            var basicResults = await basicQuery
                .Select(c => new BasicSearchResult
                {
                    Id = c.Id.ToString(),
                    Title = c.Title,
                    Type = c.Type,
                    Year = c.Year,
                    Rating = c.Rating,
                    PosterUrl = c.PosterUrl,
                    AvailableCountries = c.AvailableCountriesCount,
                    AvailableServices = c.AvailableServicesCount,
                    RelevanceScore = c.SearchScore
                })
                .OrderByDescending(r => r.RelevanceScore)
                .Take(request.PageSize)
                .ToListAsync(cancellationToken);

            var response = new ProgressiveSearchResponse
            {
                Phase = LoadingPhase.Basic,
                Results = basicResults.Cast<object>().ToList(),
                TotalResults = basicResults.Count,
                Query = request.Query,
                SearchedAt = DateTime.UtcNow,
                ResponseTime = stopwatch.Elapsed,
                Metadata = new SearchMetadata
                {
                    UsedCache = false,
                    CorrelationId = correlationId,
                    ProcessedProviders = new List<string> { "LocalDatabase" },
                    DataSources = new List<string> { "LocalDatabase" },
                    SourceResponseTimes = new Dictionary<string, TimeSpan> 
                    { 
                        ["LocalDatabase"] = stopwatch.Elapsed 
                    },
                    SourceSuccess = new Dictionary<string, bool> 
                    { 
                        ["LocalDatabase"] = true 
                    }
                }
            };

            // Cache basic results with short TTL for fast subsequent requests
            await _cacheService.SetAsync(cacheKey, response, TimeSpan.FromMinutes(5));

            stopwatch.Stop();
            response.ResponseTime = stopwatch.Elapsed;

            _logger.LogInformation("Progressive Loading Phase 1 - Completed. CorrelationId: {CorrelationId}, Results: {Count}, Duration: {Duration}ms", 
                correlationId, basicResults.Count, stopwatch.ElapsedMilliseconds);

            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Progressive Loading Phase 1 - Failed. CorrelationId: {CorrelationId}, Duration: {Duration}ms", 
                correlationId, stopwatch.ElapsedMilliseconds);
            throw;
        }
    }

    /// <summary>
    /// Phase 2: Enhanced results with metadata (less than 500ms target)
    /// Adds detailed metadata and availability information
    /// </summary>
    public async Task<ProgressiveSearchResponse> GetEnhancedResultsAsync(
        GlobalSearchRequest request,
        string correlationId,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            _logger.LogInformation("Progressive Loading Phase 2 - Enhanced Results Started. CorrelationId: {CorrelationId}", correlationId);

            var cacheKey = $"progressive_enhanced_{GenerateCacheKey(request)}";
            var cachedResults = await _cacheService.GetAsync<ProgressiveSearchResponse>(cacheKey);
            
            if (cachedResults != null)
            {
                stopwatch.Stop();
                cachedResults.ResponseTime = stopwatch.Elapsed;
                cachedResults.Metadata.UsedCache = true;
                return cachedResults;
            }

            // Get enhanced query with more metadata
            var enhancedQuery = await _databaseService.GetRankedSearchQuery(
                request.Query, request.ContentType, request.Year, 
                request.IncludeAdult, request.Language, 
                request.Page, request.PageSize, cancellationToken);

            var searchableContent = await enhancedQuery.ToListAsync(cancellationToken);
            
            var enhancedResults = searchableContent.Select(c => new EnhancedSearchResult
            {
                Id = c.Id.ToString(),
                Title = c.Title,
                OriginalTitle = c.OriginalTitle,
                Type = c.Type,
                Year = c.Year,
                Overview = c.Overview?.Length > 200 ? c.Overview.Substring(0, 200) : c.Overview,
                Rating = c.Rating,
                VoteCount = c.VoteCount,
                Popularity = c.Popularity,
                RuntimeMinutes = c.RuntimeMinutes,
                Language = c.Language,
                ContentRating = c.ContentRating,
                PosterUrl = c.PosterUrl,
                BackdropUrl = c.BackdropUrl,
                Genres = JsonSerializer.Deserialize<List<string>>(c.GenresJson) ?? new List<string>(),
                TopCast = JsonSerializer.Deserialize<List<CastMember>>(c.CastJson)?.Take(5).ToList() ?? new List<CastMember>(),
                AvailableCountries = c.AvailableCountriesCount,
                AvailableServices = c.AvailableServicesCount,
                RelevanceScore = c.SearchScore,
                LastUpdated = c.UpdatedAt
            }).ToList();

            var response = new ProgressiveSearchResponse
            {
                Phase = LoadingPhase.Enhanced,
                Results = enhancedResults.Cast<object>().ToList(),
                TotalResults = enhancedResults.Count,
                Query = request.Query,
                SearchedAt = DateTime.UtcNow,
                ResponseTime = stopwatch.Elapsed,
                Metadata = new SearchMetadata
                {
                    UsedCache = false,
                    CorrelationId = correlationId,
                    ProcessedProviders = new List<string> { "LocalDatabase" },
                    DataSources = new List<string> { "LocalDatabase" }
                }
            };

            // Cache enhanced results
            await _cacheService.SetAsync(cacheKey, response, TimeSpan.FromMinutes(10));

            stopwatch.Stop();
            response.ResponseTime = stopwatch.Elapsed;

            _logger.LogInformation("Progressive Loading Phase 2 - Completed. CorrelationId: {CorrelationId}, Results: {Count}, Duration: {Duration}ms", 
                correlationId, enhancedResults.Count, stopwatch.ElapsedMilliseconds);

            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Progressive Loading Phase 2 - Failed. CorrelationId: {CorrelationId}, Duration: {Duration}ms", 
                correlationId, stopwatch.ElapsedMilliseconds);
            throw;
        }
    }

    /// <summary>
    /// Phase 3: Complete results with streaming data (less than 1000ms target)
    /// Includes full streaming availability and pricing information
    /// </summary>
    public async Task<ProgressiveSearchResponse> GetCompleteResultsAsync(
        GlobalSearchRequest request,
        string correlationId,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            _logger.LogInformation("Progressive Loading Phase 3 - Complete Results Started. CorrelationId: {CorrelationId}", correlationId);

            var cacheKey = $"progressive_complete_{GenerateCacheKey(request)}";
            var cachedResults = await _cacheService.GetAsync<ProgressiveSearchResponse>(cacheKey);
            
            if (cachedResults != null)
            {
                stopwatch.Stop();
                cachedResults.ResponseTime = stopwatch.Elapsed;
                cachedResults.Metadata.UsedCache = true;
                return cachedResults;
            }

            // Use the full search service for complete results
            var globalResponse = await _searchService.SearchGlobalContentAsync(request, correlationId, null, cancellationToken);

            var response = new ProgressiveSearchResponse
            {
                Phase = LoadingPhase.Complete,
                Results = globalResponse.Results.Cast<object>().ToList(),
                TotalResults = globalResponse.TotalResults,
                Query = request.Query,
                SearchedAt = globalResponse.SearchedAt,
                ResponseTime = stopwatch.Elapsed,
                Metadata = globalResponse.Metadata ?? new SearchMetadata { Query = request.Query },
                Suggestions = globalResponse.Suggestions
            };

            // Cache complete results with longer TTL
            await _cacheService.SetAsync(cacheKey, response, TimeSpan.FromMinutes(15));

            stopwatch.Stop();
            response.ResponseTime = stopwatch.Elapsed;

            _logger.LogInformation("Progressive Loading Phase 3 - Completed. CorrelationId: {CorrelationId}, Results: {Count}, Duration: {Duration}ms", 
                correlationId, globalResponse.Results.Count, stopwatch.ElapsedMilliseconds);

            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Progressive Loading Phase 3 - Failed. CorrelationId: {CorrelationId}, Duration: {Duration}ms", 
                correlationId, stopwatch.ElapsedMilliseconds);
            throw;
        }
    }

    /// <summary>
    /// Background enrichment (Phase 4): Additional metadata and recommendations
    /// Runs asynchronously to enhance cached results
    /// </summary>
    public async Task EnrichResultsInBackgroundAsync(
        GlobalSearchRequest request,
        string correlationId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Progressive Loading Phase 4 - Background Enrichment Started. CorrelationId: {CorrelationId}", correlationId);

            // This runs in the background and doesn't block the response
            _ = Task.Run(async () =>
            {
                try
                {
                    // Enrich with additional metadata, recommendations, similar content, etc.
                    await EnrichCachedResultsAsync(request, correlationId, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background enrichment failed for CorrelationId: {CorrelationId}", correlationId);
                }
            }, cancellationToken);

            _logger.LogInformation("Progressive Loading Phase 4 - Background Enrichment Queued. CorrelationId: {CorrelationId}", correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to queue background enrichment. CorrelationId: {CorrelationId}", correlationId);
        }
    }

    private async Task EnrichCachedResultsAsync(GlobalSearchRequest request, string correlationId, CancellationToken cancellationToken)
    {
        // Add recommendations, update popularity scores, refresh streaming data, etc.
        // This could include calls to external APIs for fresh data
        
        var cacheKey = $"progressive_enriched_{GenerateCacheKey(request)}";
        
        // Simulate enrichment process - in real implementation, this would:
        // 1. Fetch latest streaming availability data
        // 2. Calculate updated popularity scores
        // 3. Generate personalized recommendations
        // 4. Update view counts and click-through rates
        
        await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken); // Simulate processing time
        
        _logger.LogInformation("Background enrichment completed for CorrelationId: {CorrelationId}", correlationId);
    }

    private static string GenerateCacheKey(GlobalSearchRequest request)
    {
        var keyData = $"{request.Query}_{request.ContentType}_{request.Year}_{request.IncludeAdult}_{request.Language}_{request.Page}_{request.PageSize}";
        
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(keyData));
        return Convert.ToBase64String(hashBytes)[..16];
    }
}

/// <summary>
/// Interface for progressive loading service
/// </summary>
public interface IProgressiveLoadingService
{
    Task<ProgressiveSearchResponse> GetBasicResultsAsync(GlobalSearchRequest request, string correlationId, CancellationToken cancellationToken = default);
    Task<ProgressiveSearchResponse> GetEnhancedResultsAsync(GlobalSearchRequest request, string correlationId, CancellationToken cancellationToken = default);
    Task<ProgressiveSearchResponse> GetCompleteResultsAsync(GlobalSearchRequest request, string correlationId, CancellationToken cancellationToken = default);
    Task EnrichResultsInBackgroundAsync(GlobalSearchRequest request, string correlationId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Progressive search response for phased loading
/// </summary>
public class ProgressiveSearchResponse
{
    public LoadingPhase Phase { get; set; }
    public List<object> Results { get; set; } = new();
    public int TotalResults { get; set; }
    public string Query { get; set; } = string.Empty;
    public DateTime SearchedAt { get; set; }
    public TimeSpan ResponseTime { get; set; }
    public SearchMetadata Metadata { get; set; } = new();
    public List<SearchSuggestion> Suggestions { get; set; } = new();
}

/// <summary>
/// Loading phases for progressive search
/// </summary>
public enum LoadingPhase
{
    Basic = 1,
    Enhanced = 2,
    Complete = 3,
    Enriched = 4
}

/// <summary>
/// Basic search result for Phase 1 (less than 200ms)
/// </summary>
public class BasicSearchResult
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public ContentType Type { get; set; }
    public int? Year { get; set; }
    public decimal? Rating { get; set; }
    public string? PosterUrl { get; set; }
    public int AvailableCountries { get; set; }
    public int AvailableServices { get; set; }
    public decimal RelevanceScore { get; set; }
}

/// <summary>
/// Enhanced search result for Phase 2 (less than 500ms)
/// </summary>
public class EnhancedSearchResult : BasicSearchResult
{
    public string? OriginalTitle { get; set; }
    public string? Overview { get; set; }
    public int VoteCount { get; set; }
    public decimal Popularity { get; set; }
    public int? RuntimeMinutes { get; set; }
    public string? Language { get; set; }
    public string? ContentRating { get; set; }
    public string? BackdropUrl { get; set; }
    public List<string> Genres { get; set; } = new();
    public List<CastMember> TopCast { get; set; } = new();
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Configuration options for progressive loading
/// </summary>
public class ProgressiveLoadingOptions
{
    public int BasicResultsTimeoutMs { get; set; } = 200;
    public int EnhancedResultsTimeoutMs { get; set; } = 500;
    public int CompleteResultsTimeoutMs { get; set; } = 1000;
    public bool EnableBackgroundEnrichment { get; set; } = true;
    public int MaxBasicResults { get; set; } = 20;
    public int MaxEnhancedResults { get; set; } = 50;
}