using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using System.Text;

namespace GeoLeap.Api.Services;

/// <summary>
/// Database optimization service for search performance enhancements
/// </summary>
public class DatabaseOptimizationService : IDatabaseOptimizationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DatabaseOptimizationService> _logger;
    private readonly DatabaseOptimizationOptions _options;

    public DatabaseOptimizationService(
        ApplicationDbContext context,
        ILogger<DatabaseOptimizationService> logger,
        IOptions<DatabaseOptimizationOptions> options)
    {
        _context = context;
        _logger = logger;
        _options = options.Value;
    }

    /// <summary>
    /// Optimizes database queries for search operations
    /// </summary>
    public async Task<IQueryable<SearchableContent>> GetOptimizedSearchQuery(
        string searchTerm,
        ContentType? contentType = null,
        int? year = null,
        bool includeAdult = false,
        string? language = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.SearchableContents.AsNoTracking();

        // Apply basic filters first (most selective)
        if (!includeAdult)
        {
            query = query.Where(c => !c.IsAdult);
        }

        if (contentType.HasValue)
        {
            query = query.Where(c => c.Type == contentType);
        }

        if (year.HasValue)
        {
            query = query.Where(c => c.Year == year);
        }

        if (!string.IsNullOrEmpty(language))
        {
            query = query.Where(c => c.Language == language);
        }

        // Apply search filters with full-text capabilities
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var normalizedTerm = NormalizeSearchTerm(searchTerm);
            
            var likeTerm = $"%{normalizedTerm}%";
            query = query.Where(c =>
                EF.Functions.ILike(c.SearchableTitle, likeTerm) ||
                EF.Functions.ILike(c.SearchableOverview, likeTerm) ||
                EF.Functions.ILike(c.SearchableCast, likeTerm) ||
                EF.Functions.ILike(c.SearchableCrew, likeTerm) ||
                EF.Functions.ILike(c.SearchableGenres, likeTerm) ||
                c.AlternativeTitles.Any(at => EF.Functions.ILike(at.SearchableTitle, likeTerm))
            );
        }

        return query;
    }

    /// <summary>
    /// Creates optimized search query with ranking and scoring
    /// </summary>
    public async Task<IQueryable<SearchableContent>> GetRankedSearchQuery(
        string searchTerm,
        ContentType? contentType = null,
        int? year = null,
        bool includeAdult = false,
        string? language = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var baseQuery = await GetOptimizedSearchQuery(
            searchTerm, contentType, year, includeAdult, language, cancellationToken);

        // Order by pre-calculated search score and popularity
        var rankedQuery = baseQuery
            .OrderByDescending(c => c.SearchScore)
            .ThenByDescending(c => c.Popularity)
            .ThenByDescending(c => c.Rating);

        return rankedQuery.Skip((page - 1) * pageSize).Take(pageSize);
    }

    /// <summary>
    /// Updates search analytics for performance monitoring
    /// </summary>
    public async Task RecordSearchAnalyticsAsync(
        string searchQuery,
        int resultCount,
        int executionTimeMs,
        bool usedCache,
        decimal? cacheHitRate,
        bool hasClickthrough,
        string effectiveStrategy,
        CancellationToken cancellationToken = default)
    {
        var queryHash = GenerateQueryHash(searchQuery);
        
        var existing = await _context.SearchAnalytics
            .FirstOrDefaultAsync(sa => sa.QueryHash == queryHash, cancellationToken);

        if (existing != null)
        {
            // Update existing analytics
            existing.HitCount++;
            existing.LastExecutedAt = DateTime.UtcNow;
            existing.ExecutionTimeMs = (existing.ExecutionTimeMs + executionTimeMs) / 2; // Moving average
            existing.HasClickthrough = existing.HasClickthrough || hasClickthrough;
            existing.CacheHitRate = cacheHitRate;
            existing.PerformanceTier = DeterminePerformanceTier(executionTimeMs);
        }
        else
        {
            // Create new analytics record
            var analytics = new SearchAnalytics
            {
                QueryHash = queryHash,
                SearchTerms = _options.AnonymizeQueries ? null : searchQuery,
                ResultCount = resultCount,
                ExecutionTimeMs = executionTimeMs,
                UsedCache = usedCache,
                CacheHitRate = cacheHitRate,
                HitCount = 1,
                EffectiveStrategy = effectiveStrategy,
                HasClickthrough = hasClickthrough,
                PerformanceTier = DeterminePerformanceTier(executionTimeMs)
            };

            _context.SearchAnalytics.Add(analytics);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Gets search performance metrics
    /// </summary>
    public async Task<DatabaseSearchPerformanceMetrics> GetPerformanceMetricsAsync(
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default)
    {
        var analytics = await _context.SearchAnalytics
            .Where(sa => sa.CreatedAt >= from && sa.CreatedAt <= to)
            .ToListAsync(cancellationToken);

        return new DatabaseSearchPerformanceMetrics
        {
            TotalSearches = analytics.Sum(a => a.HitCount),
            AverageExecutionTime = analytics.Any() ? analytics.Average(a => a.ExecutionTimeMs) : 0,
            CacheHitRate = analytics.Where(a => a.CacheHitRate.HasValue).Any() 
                ? analytics.Where(a => a.CacheHitRate.HasValue).Average(a => a.CacheHitRate!.Value) 
                : 0,
            ClickThroughRate = analytics.Any() 
                ? (decimal)analytics.Count(a => a.HasClickthrough) / analytics.Count() * 100 
                : 0,
            FastSearches = analytics.Count(a => a.PerformanceTier == "Fast"),
            MediumSearches = analytics.Count(a => a.PerformanceTier == "Medium"),
            SlowSearches = analytics.Count(a => a.PerformanceTier == "Slow"),
            UniqueQueries = analytics.Count(),
            PopularQueries = analytics
                .OrderByDescending(a => a.HitCount)
                .Take(10)
                .Select(a => new DatabasePopularQuery 
                { 
                    Query = a.SearchTerms ?? "Anonymous", 
                    HitCount = a.HitCount,
                    AverageExecutionTime = a.ExecutionTimeMs
                })
                .ToList()
        };
    }

    /// <summary>
    /// Optimizes database connection settings for search workload
    /// </summary>
    public async Task OptimizeConnectionPoolAsync()
    {
        // Connection pool optimization is handled at the service registration level
        // This method provides visibility into current connection statistics
        
        _logger.LogInformation("Database connection pool optimization - Current settings: " +
            "MaxPoolSize: {MaxPoolSize}, MinPoolSize: {MinPoolSize}, ConnectionTimeout: {ConnectionTimeout}",
            _options.MaxPoolSize, _options.MinPoolSize, _options.ConnectionTimeoutSeconds);

        // Force connection warmup by executing a lightweight query
        var connectionTest = await _context.Database.CanConnectAsync();
        
        if (connectionTest)
        {
            _logger.LogInformation("Database connection pool warmed up successfully");
        }
        else
        {
            _logger.LogWarning("Database connection pool warmup failed");
        }
    }

    /// <summary>
    /// Runs database maintenance for search performance
    /// </summary>
    public async Task PerformMaintenanceAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Starting database maintenance for search optimization");

            // Update statistics for search indexes
            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE STATISTICS SearchableContents", cancellationToken);
            
            // Clean up old search analytics (keep last 90 days)
            var cutoffDate = DateTime.UtcNow.AddDays(-90);
            await _context.SearchAnalytics
                .Where(sa => sa.CreatedAt < cutoffDate)
                .ExecuteDeleteAsync(cancellationToken);

            _logger.LogInformation("Database maintenance completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database maintenance failed");
            throw;
        }
    }

    private static string NormalizeSearchTerm(string term)
    {
        return term.Trim().ToLowerInvariant();
    }

    private static decimal CalculateRelevanceScore(SearchableContent content, string searchTerm)
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
            return 1.0m;

        var score = 0m;
        var normalizedTerm = searchTerm.ToLowerInvariant();

        // Exact title match gets highest score
        if (content.Title.ToLowerInvariant().Contains(normalizedTerm))
            score += 10m;

        // Partial title match
        if (content.SearchableTitle.ToLowerInvariant().Contains(normalizedTerm))
            score += 5m;

        // Cast/crew match
        if (content.SearchableCast.ToLowerInvariant().Contains(normalizedTerm))
            score += 3m;

        // Genre match
        if (content.SearchableGenres.ToLowerInvariant().Contains(normalizedTerm))
            score += 2m;

        return Math.Min(score, 10m); // Cap at 10
    }

    private static decimal CalculateFreshnessScore(SearchableContent content)
    {
        var daysSinceUpdate = (DateTime.UtcNow - content.UpdatedAt).TotalDays;
        return Math.Max(0, 10m - (decimal)(daysSinceUpdate / 30)); // Decay over 30 days
    }

    private static decimal CalculatePopularityScore(SearchableContent content)
    {
        // Normalize popularity to 0-10 scale
        return Math.Min(content.Popularity / 100m, 10m);
    }

    private static decimal CalculateAvailabilityScore(SearchableContent content)
    {
        // Score based on how widely available the content is
        var availabilityScore = (content.AvailableCountriesCount * 0.1m) + 
                               (content.AvailableServicesCount * 0.2m);
        return Math.Min(availabilityScore, 10m);
    }

    private static string GenerateQueryHash(string query)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(query.ToLowerInvariant()));
        return Convert.ToBase64String(hashBytes)[..16]; // Take first 16 characters for compact hash
    }

    private static string DeterminePerformanceTier(int executionTimeMs)
    {
        return executionTimeMs switch
        {
            < 200 => "Fast",
            < 1000 => "Medium",
            _ => "Slow"
        };
    }
}

/// <summary>
/// Interface for database optimization service
/// </summary>
public interface IDatabaseOptimizationService
{
    Task<IQueryable<SearchableContent>> GetOptimizedSearchQuery(
        string searchTerm,
        ContentType? contentType = null,
        int? year = null,
        bool includeAdult = false,
        string? language = null,
        CancellationToken cancellationToken = default);

    Task<IQueryable<SearchableContent>> GetRankedSearchQuery(
        string searchTerm,
        ContentType? contentType = null,
        int? year = null,
        bool includeAdult = false,
        string? language = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    Task RecordSearchAnalyticsAsync(
        string searchQuery,
        int resultCount,
        int executionTimeMs,
        bool usedCache,
        decimal? cacheHitRate,
        bool hasClickthrough,
        string effectiveStrategy,
        CancellationToken cancellationToken = default);

    Task<DatabaseSearchPerformanceMetrics> GetPerformanceMetricsAsync(
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default);

    Task OptimizeConnectionPoolAsync();
    Task PerformMaintenanceAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Configuration options for database optimization
/// </summary>
public class DatabaseOptimizationOptions
{
    public int MaxPoolSize { get; set; } = 100;
    public int MinPoolSize { get; set; } = 5;
    public int ConnectionTimeoutSeconds { get; set; } = 30;
    public bool AnonymizeQueries { get; set; } = true;
    public bool EnableQueryPlanCaching { get; set; } = true;
    public bool EnableIndexOptimization { get; set; } = true;
}

/// <summary>
/// Search performance metrics
/// </summary>
public class DatabaseSearchPerformanceMetrics
{
    public int TotalSearches { get; set; }
    public double AverageExecutionTime { get; set; }
    public decimal CacheHitRate { get; set; }
    public decimal ClickThroughRate { get; set; }
    public int FastSearches { get; set; }
    public int MediumSearches { get; set; }
    public int SlowSearches { get; set; }
    public int UniqueQueries { get; set; }
    public List<DatabasePopularQuery> PopularQueries { get; set; } = new();
}

/// <summary>
/// Popular query analytics
/// </summary>
public class DatabasePopularQuery
{
    public string Query { get; set; } = string.Empty;
    public int HitCount { get; set; }
    public double AverageExecutionTime { get; set; }
}