using GeoLeap.Api.Models;
using GeoLeap.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services;

/// <summary>
/// Mock implementation of ISearchService for testing and development
/// </summary>
public class MockSearchService : ISearchService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<MockSearchService> _logger;

    public MockSearchService(ApplicationDbContext context, ILogger<MockSearchService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<GlobalSearchResponse> SearchGlobalContentAsync(
        GlobalSearchRequest request, 
        string correlationId, 
        string? userId = null, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var results = new List<GlobalSearchResult>();

            // Search in the SearchableContent table
            var query = _context.SearchableContents.AsQueryable();

            if (request.ContentType.HasValue)
            {
                query = query.Where(c => c.Type == request.ContentType.Value);
            }

            if (!string.IsNullOrEmpty(request.Query))
            {
                query = query.Where(c => 
                    c.Title.Contains(request.Query) || 
                    (c.OriginalTitle != null && c.OriginalTitle.Contains(request.Query)));
            }

            var searchResults = await query
                .OrderByDescending(c => c.Popularity)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync(cancellationToken);

            var contentSummaries = searchResults.Select(c => new ContentSummary
            {
                Id = c.Id.ToString(),
                Title = c.Title,
                Type = c.Type,
                Year = c.Year,
                Overview = c.Overview,
                Genres = c.Genres ?? new List<string>(),
                ImageUrl = c.PosterUrl,
                Rating = c.Rating
            }).ToList();

            return new GlobalSearchResponse
            {
                Results = contentSummaries,
                TotalResults = contentSummaries.Count,
                Page = request.Page,
                PageSize = request.PageSize,
                HasMore = contentSummaries.Count >= request.PageSize,
                SearchedAt = DateTime.UtcNow,
                ResponseTime = TimeSpan.FromMilliseconds(50)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in global content search for query: {Query}", request.Query);
            return new GlobalSearchResponse
            {
                Results = new List<ContentSummary>(),
                TotalResults = 0,
                Page = request.Page,
                PageSize = request.PageSize,
                HasMore = false,
                SearchedAt = DateTime.UtcNow,
                ResponseTime = TimeSpan.Zero
            };
        }
    }

    public async Task<GlobalSearchResult> GetSearchResultDetailsAsync(
        string contentId, 
        ContentType contentType, 
        string correlationId, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var content = await _context.SearchableContents
                .FirstOrDefaultAsync(c => c.Id.ToString() == contentId, cancellationToken);

            if (content == null)
            {
                return new GlobalSearchResult();
            }

            return new GlobalSearchResult
            {
                Id = content.Id.ToString(),
                Title = content.Title,
                Type = content.Type,
                Year = content.Year,
                Overview = content.Overview,
                Genres = content.Genres ?? new List<string>(),
                ImageUrl = content.PosterUrl,
                Rating = (double?)(content.Rating),
                StreamingOptions = new List<GlobalStreamingOption>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting search result details for ID: {ContentId}", contentId);
            return new GlobalSearchResult();
        }
    }

    public async Task<List<SearchSuggestion>> GetSearchSuggestionsAsync(
        string query, 
        string correlationId, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            await Task.Delay(50, cancellationToken);
            
            return new List<SearchSuggestion>
            {
                new SearchSuggestion { Text = query + " movie", Category = "movie", Score = 0.8 },
                new SearchSuggestion { Text = query + " tv show", Category = "tv", Score = 0.7 },
                new SearchSuggestion { Text = query + " 2023", Category = "year", Score = 0.6 }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting search suggestions for query: {Query}", query);
            return new List<SearchSuggestion>();
        }
    }

    public async Task<List<string>> GetAutocompleteSuggestionsAsync(
        string partialQuery, 
        int maxResults = 10, 
        string correlationId = "", 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var suggestions = await _context.SearchableContents
                .Where(c => c.Title.StartsWith(partialQuery))
                .OrderByDescending(c => c.Popularity)
                .Take(maxResults)
                .Select(c => c.Title)
                .Distinct()
                .ToListAsync(cancellationToken);

            return suggestions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting autocomplete suggestions for query: {Query}", partialQuery);
            return new List<string>();
        }
    }

    public async Task<List<GlobalSearchResult>> GetPopularContentAsync(
        ContentType? contentType = null, 
        string? country = null, 
        int limit = 20, 
        string correlationId = "", 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var query = _context.SearchableContents.AsQueryable();

            if (contentType.HasValue)
            {
                query = query.Where(c => c.Type == contentType.Value);
            }

            var popularContent = await query
                .OrderByDescending(c => c.Popularity)
                .Take(limit)
                .ToListAsync(cancellationToken);

            return popularContent.Select(c => new GlobalSearchResult
            {
                Id = c.Id.ToString(),
                Title = c.Title,
                Type = c.Type,
                Year = c.Year,
                Overview = c.Overview,
                Genres = c.Genres ?? new List<string>(),
                ImageUrl = c.PosterUrl,
                Rating = (double?)(c.Rating)
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular content");
            return new List<GlobalSearchResult>();
        }
    }

    public async Task<SearchResponse<GlobalSearchResult>> SearchAsync(
        SearchRequest request, 
        CancellationToken cancellationToken = default)
    {
        var globalRequest = new GlobalSearchRequest
        {
            Query = request.Query,
            ContentType = request.ContentType,
            Countries = request.Countries,
            Page = request.Page,
            PageSize = request.PageSize
        };

        var globalResponse = await SearchGlobalContentAsync(globalRequest, "", null, cancellationToken);

        return new SearchResponse<GlobalSearchResult>
        {
            Results = globalResponse.Results.Select(cs => new GlobalSearchResult
            {
                Id = cs.Id,
                Title = cs.Title,
                Type = cs.Type,
                Year = cs.Year,
                Overview = cs.Overview,
                Genres = cs.Genres,
                ImageUrl = cs.ImageUrl,
                Rating = (double?)cs.Rating
            }).ToList(),
            TotalResults = globalResponse.TotalResults,
            Page = globalResponse.Page,
            PageSize = globalResponse.PageSize,
            TotalPages = (int)Math.Ceiling((double)globalResponse.TotalResults / globalResponse.PageSize)
        };
    }

    public async Task<SearchResponse<GlobalSearchResult>> SearchContentAsync(
        string query, 
        ContentType? contentType, 
        string? country = null, 
        int page = 1, 
        int pageSize = 10, 
        CancellationToken cancellationToken = default)
    {
        var request = new SearchRequest
        {
            Query = query,
            ContentType = contentType,
            Countries = country != null ? new List<string> { country } : null,
            Page = page,
            PageSize = pageSize
        };

        return await SearchAsync(request, cancellationToken);
    }

    public async Task<List<Models.TrendingSearch>> GetTrendingSearchesAsync(
        int limit,
        string? region = null,
        CancellationToken cancellationToken = default)
    {
        await Task.Delay(50, cancellationToken);

        var mockTrending = new List<Models.TrendingSearch>
        {
            new Models.TrendingSearch
            {
                Query = "netflix movies",
                SearchCount = 1250,
                UniqueUsers = 890,
                TrendingScore = 95.5m,
                TimeWindow = 86400000,
                IsRising = true,
                LastUpdated = DateTime.UtcNow
            },
            new Models.TrendingSearch
            {
                Query = "disney plus shows",
                SearchCount = 980,
                UniqueUsers = 720,
                TrendingScore = 88.2m,
                TimeWindow = 86400000,
                IsRising = true,
                LastUpdated = DateTime.UtcNow
            },
            new Models.TrendingSearch
            {
                Query = "action movies",
                SearchCount = 850,
                UniqueUsers = 640,
                TrendingScore = 82.1m,
                TimeWindow = 86400000,
                IsRising = false,
                LastUpdated = DateTime.UtcNow
            },
            new Models.TrendingSearch
            {
                Query = "comedy series",
                SearchCount = 720,
                UniqueUsers = 580,
                TrendingScore = 75.8m,
                TimeWindow = 86400000,
                IsRising = false,
                LastUpdated = DateTime.UtcNow
            },
            new Models.TrendingSearch
            {
                Query = "marvel movies",
                SearchCount = 690,
                UniqueUsers = 520,
                TrendingScore = 71.4m,
                TimeWindow = 86400000,
                IsRising = true,
                LastUpdated = DateTime.UtcNow
            }
        };

        return mockTrending.Take(limit).ToList();
    }

    public async Task<List<GlobalSearchResult>> GetPopularContentAsync(
        ContentType contentType,
        string region,
        int limit,
        string correlationId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Direct implementation to avoid recursion issues
            var query = _context.SearchableContents.AsQueryable();

            if (contentType != ContentType.All)
            {
                query = query.Where(c => c.Type == contentType);
            }

            var popularContent = await query
                .OrderByDescending(c => c.Popularity)
                .Take(limit)
                .ToListAsync(cancellationToken);

            return popularContent.Select(c => new GlobalSearchResult
            {
                Id = c.Id.ToString(),
                Title = c.Title,
                Type = c.Type,
                Year = c.Year,
                Overview = c.Overview,
                Genres = c.Genres ?? new List<string>(),
                ImageUrl = c.PosterUrl,
                Rating = (double?)(c.Rating)
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular content for region {Region}", region);
            return new List<GlobalSearchResult>();
        }
    }

    public async Task RecordSearchAsync(
        Guid userId,
        string query,
        int resultCount,
        string region = "US",
        CancellationToken cancellationToken = default)
    {
        try
        {
            var searchHistory = new Models.SearchHistory
            {
                UserId = userId,
                Query = query,
                ResultCount = resultCount,
                SearchedAt = DateTime.UtcNow
            };

            _context.SearchHistories.Add(searchHistory);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogDebug("Recorded search for user {UserId}: {Query} with {ResultCount} results",
                userId, query, resultCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record search for user {UserId}: {Query}", userId, query);
        }
    }
}