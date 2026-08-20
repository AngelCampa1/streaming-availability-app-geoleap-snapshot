using GeoLeap.Api.Models;
using GeoLeap.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Services;

/// <summary>
/// Advanced autocomplete service with intelligent suggestions and personalization
/// </summary>
public class AutocompleteService : IAutocompleteService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _memoryCache;
    private readonly ILoggerService _loggerService;
    private readonly ISearchService _searchService;
    private readonly IContentDataService _contentDataService;

    private const string SUGGESTIONS_CACHE_PREFIX = "autocomplete:suggestions:";
    private const string TRENDING_CACHE_PREFIX = "autocomplete:trending";
    private const string HISTORY_CACHE_PREFIX = "autocomplete:history:";
    private static readonly TimeSpan SuggestionsCacheDuration = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan TrendingCacheDuration = TimeSpan.FromHours(1);
    private static readonly TimeSpan HistoryCacheDuration = TimeSpan.FromMinutes(5);

    // Fuzzy matching and typo correction data
    private static readonly Dictionary<string, string[]> CommonTypos = new()
    {
        { "marvel", new[] { "marval", "marvell", "mavel" } },
        { "disney", new[] { "disny", "disnay", "dizney" } },
        { "netflix", new[] { "netfix", "netflx", "netflik" } },
        { "spider", new[] { "spyder", "spidder", "spder" } },
        { "batman", new[] { "batmann", "batmen", "batman" } },
        { "avengers", new[] { "avanger", "avengers", "avengrs" } },
        { "friends", new[] { "freinds", "freind", "frends" } },
        { "office", new[] { "offic", "ofice", "oficce" } },
        { "breaking", new[] { "braking", "breking", "breakng" } },
        { "stranger", new[] { "strager", "stanger", "strangar" } },
        { "thrones", new[] { "throne", "trones", "throuns" } }
    };

    private static readonly Dictionary<string, string[]> Synonyms = new()
    {
        { "movie", new[] { "film", "cinema", "flick", "picture" } },
        { "show", new[] { "series", "tv", "television", "program", "programme" } },
        { "documentary", new[] { "doc", "docuseries", "factual" } },
        { "comedy", new[] { "funny", "humor", "humour", "comic" } },
        { "horror", new[] { "scary", "thriller", "spooky", "frightening" } },
        { "action", new[] { "adventure", "fight", "battle" } },
        { "romance", new[] { "romantic", "love", "dating" } },
        { "drama", new[] { "dramatic", "serious", "emotional" } },
        { "sci-fi", new[] { "science fiction", "scifi", "futuristic" } },
        { "fantasy", new[] { "magical", "magic", "supernatural" } }
    };

    public AutocompleteService(
        ApplicationDbContext context,
        IMemoryCache memoryCache,
        ILoggerService loggerService,
        ISearchService searchService,
        IContentDataService contentDataService)
    {
        _context = context;
        _memoryCache = memoryCache;
        _loggerService = loggerService;
        _searchService = searchService;
        _contentDataService = contentDataService;
    }

    public async Task<List<AutocompleteSuggestion>> GetIntelligentSuggestionsAsync(
        string partialQuery,
        int maxResults = 10,
        string? userId = null,
        string correlationId = "",
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{SUGGESTIONS_CACHE_PREFIX}{partialQuery.ToLowerInvariant()}:{maxResults}:{userId ?? "anonymous"}";

        if (_memoryCache.TryGetValue(cacheKey, out List<AutocompleteSuggestion>? cachedSuggestions) && cachedSuggestions != null)
        {
            return cachedSuggestions;
        }

        try
        {
            var suggestions = new List<AutocompleteSuggestion>();

            // Get different types of suggestions in parallel
            var tasks = new List<Task<List<AutocompleteSuggestion>>>
            {
                GetTitleSuggestionsAsync(partialQuery, maxResults / 2, cancellationToken),
                GetPersonSuggestionsAsync(partialQuery, maxResults / 4, cancellationToken),
                GetGenreSuggestionsAsync(partialQuery, 3, cancellationToken),
                GetTrendingSuggestionsAsync(partialQuery, 3, cancellationToken)
            };

            if (!string.IsNullOrEmpty(userId))
            {
                tasks.Add(GetPersonalizedSuggestionsAsync(partialQuery, userId, maxResults / 4, correlationId, cancellationToken));
            }

            var results = await Task.WhenAll(tasks);

            foreach (var result in results)
            {
                suggestions.AddRange(result);
            }

            // Add typo corrections
            var typoCorrections = GetTypoCorrections(partialQuery);
            suggestions.AddRange(typoCorrections);

            // Rank and filter suggestions
            var rankedSuggestions = RankSuggestions(suggestions, partialQuery)
                .Take(maxResults)
                .ToList();

            // Cache the results
            _memoryCache.Set(cacheKey, rankedSuggestions, SuggestionsCacheDuration);

            _loggerService.LogBusinessEvent("AutocompleteSuggestionsGenerated", new
            {
                PartialQuery = partialQuery,
                SuggestionCount = rankedSuggestions.Count,
                UserId = userId,
                CorrelationId = correlationId
            });

            return rankedSuggestions;
        }
        catch (Exception ex)
        {
            _loggerService.LogBusinessEvent("AutocompleteSuggestionsError", new
            {
                PartialQuery = partialQuery,
                Error = ex.Message,
                UserId = userId,
                CorrelationId = correlationId
            });

            return new List<AutocompleteSuggestion>();
        }
    }

    public async Task<List<SearchHistoryItem>> GetRecentSearchesAsync(
        string userId,
        int maxResults = 10,
        string correlationId = "",
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{HISTORY_CACHE_PREFIX}{userId}";

        if (_memoryCache.TryGetValue(cacheKey, out List<SearchHistoryItem>? cachedHistory) && cachedHistory != null)
        {
            return cachedHistory.Take(maxResults).ToList();
        }

        try
        {
            if (!Guid.TryParse(userId, out var userGuid))
            {
                return new List<SearchHistoryItem>();
            }

            var recentSearches = await _context.SearchHistories
                .Where(sh => sh.UserId == userGuid)
                .OrderByDescending(sh => sh.SearchedAt)
                .Take(maxResults)
                .Select(sh => new SearchHistoryItem
                {
                    Query = sh.Query,
                    SearchedAt = sh.SearchedAt,
                    ResultCount = sh.ResultCount
                })
                .ToListAsync(cancellationToken);

            // Cache the results
            _memoryCache.Set(cacheKey, recentSearches, HistoryCacheDuration);

            return recentSearches;
        }
        catch (Exception ex)
        {
            _loggerService.LogBusinessEvent("RecentSearchesError", new
            {
                UserId = userId,
                Error = ex.Message,
                CorrelationId = correlationId
            });

            return new List<SearchHistoryItem>();
        }
    }

    public async Task<List<TrendingSearch>> GetTrendingSearchesAsync(
        int maxResults = 10,
        TimeSpan? timeWindow = null,
        string correlationId = "",
        CancellationToken cancellationToken = default)
    {
        timeWindow ??= TimeSpan.FromHours(24);
        var cacheKey = $"{TRENDING_CACHE_PREFIX}:{maxResults}:{timeWindow.Value.TotalHours}";

        if (_memoryCache.TryGetValue(cacheKey, out List<TrendingSearch>? cachedTrending) && cachedTrending != null)
        {
            return cachedTrending;
        }

        try
        {
            var cutoffDate = DateTime.UtcNow.Date.AddDays(-timeWindow.Value.Days);

            var trendingData = await _context.SearchTrends
                .Where(st => st.Date >= cutoffDate)
                .OrderByDescending(st => st.TrendingScore)
                .ThenByDescending(st => st.SearchCount)
                .Take(maxResults)
                .Select(st => new TrendingSearch
                {
                    Query = st.Query,
                    SearchCount = st.SearchCount,
                    UniqueUsers = st.UniqueUsers,
                    TrendingScore = st.TrendingScore,
                    TimeWindow = (long)timeWindow.Value.TotalMilliseconds,
                    IsRising = st.IsRising
                })
                .ToListAsync(cancellationToken);

            // If we don't have enough real data, supplement with mock data
            if (trendingData.Count < maxResults)
            {
                var mockTrending = new List<TrendingSearch>
                {
                    new TrendingSearch { Query = "Marvel", SearchCount = 1250, UniqueUsers = 850, TrendingScore = 95.5m, IsRising = true, TimeWindow = (long)timeWindow.Value.TotalMilliseconds },
                    new TrendingSearch { Query = "Stranger Things", SearchCount = 980, UniqueUsers = 720, TrendingScore = 88.2m, IsRising = true, TimeWindow = (long)timeWindow.Value.TotalMilliseconds },
                    new TrendingSearch { Query = "Game of Thrones", SearchCount = 750, UniqueUsers = 580, TrendingScore = 75.8m, IsRising = false, TimeWindow = (long)timeWindow.Value.TotalMilliseconds },
                    new TrendingSearch { Query = "Breaking Bad", SearchCount = 650, UniqueUsers = 520, TrendingScore = 72.1m, IsRising = false, TimeWindow = (long)timeWindow.Value.TotalMilliseconds },
                    new TrendingSearch { Query = "Netflix Originals", SearchCount = 580, UniqueUsers = 450, TrendingScore = 68.5m, IsRising = true, TimeWindow = (long)timeWindow.Value.TotalMilliseconds },
                    new TrendingSearch { Query = "Disney Plus", SearchCount = 520, UniqueUsers = 410, TrendingScore = 65.2m, IsRising = true, TimeWindow = (long)timeWindow.Value.TotalMilliseconds },
                    new TrendingSearch { Query = "Horror Movies", SearchCount = 450, UniqueUsers = 380, TrendingScore = 61.8m, IsRising = false, TimeWindow = (long)timeWindow.Value.TotalMilliseconds },
                    new TrendingSearch { Query = "Comedy Series", SearchCount = 420, UniqueUsers = 350, TrendingScore = 58.9m, IsRising = false, TimeWindow = (long)timeWindow.Value.TotalMilliseconds }
                };

                // Add mock data that doesn't conflict with real data
                var existingQueries = new HashSet<string>(trendingData.Select(t => t.Query.ToLowerInvariant()));
                var mockToAdd = mockTrending
                    .Where(m => !existingQueries.Contains(m.Query.ToLowerInvariant()))
                    .Take(maxResults - trendingData.Count);

                trendingData.AddRange(mockToAdd);
            }

            var trending = trendingData
                .OrderByDescending(t => t.TrendingScore)
                .Take(maxResults)
                .ToList();

            // Cache the results
            _memoryCache.Set(cacheKey, trending, TrendingCacheDuration);

            return trending;
        }
        catch (Exception ex)
        {
            _loggerService.LogBusinessEvent("TrendingSearchesError", new
            {
                Error = ex.Message,
                CorrelationId = correlationId
            });

            return new List<TrendingSearch>();
        }
    }

    public async Task TrackSearchAsync(
        string query,
        string userId,
        int resultCount,
        string correlationId = "",
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!Guid.TryParse(userId, out var userGuid))
            {
                return;
            }

            // Save search to database
            var searchHistory = new SearchHistory
            {
                UserId = userGuid,
                Query = query,
                SearchedAt = DateTime.UtcNow,
                ResultCount = resultCount,
                CorrelationId = correlationId,
                SearchType = "General"
            };

            _context.SearchHistories.Add(searchHistory);
            await _context.SaveChangesAsync(cancellationToken);

            try
            {
                await UpdateSearchTrendAsync(query, cancellationToken);
            }
            catch (Exception ex)
            {
                _loggerService.LogBusinessEvent("SearchTrendUpdateError", new
                {
                    Query = query,
                    Error = ex.Message,
                    CorrelationId = correlationId
                });
            }

            // Invalidate user's history cache
            var cacheKey = $"{HISTORY_CACHE_PREFIX}{userId}";
            _memoryCache.Remove(cacheKey);

            _loggerService.LogBusinessEvent("SearchTracked", new
            {
                Query = query,
                UserId = userId,
                ResultCount = resultCount,
                CorrelationId = correlationId,
                Timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _loggerService.LogBusinessEvent("SearchTrackingError", new
            {
                Query = query,
                UserId = userId,
                Error = ex.Message,
                CorrelationId = correlationId
            });
        }
    }

    public async Task ClearSearchHistoryAsync(
        string userId,
        string correlationId = "",
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!Guid.TryParse(userId, out var userGuid))
            {
                return;
            }

            // Delete user's search history from database
            var searchHistories = await _context.SearchHistories
                .Where(sh => sh.UserId == userGuid)
                .ToListAsync(cancellationToken);

            _context.SearchHistories.RemoveRange(searchHistories);
            await _context.SaveChangesAsync(cancellationToken);

            // Clear the cache
            var cacheKey = $"{HISTORY_CACHE_PREFIX}{userId}";
            _memoryCache.Remove(cacheKey);

            _loggerService.LogBusinessEvent("SearchHistoryCleared", new
            {
                UserId = userId,
                DeletedCount = searchHistories.Count,
                CorrelationId = correlationId
            });
        }
        catch (Exception ex)
        {
            _loggerService.LogBusinessEvent("ClearSearchHistoryError", new
            {
                UserId = userId,
                Error = ex.Message,
                CorrelationId = correlationId
            });
        }
    }

    private async Task<List<AutocompleteSuggestion>> GetTitleSuggestionsAsync(
        string partialQuery,
        int maxResults,
        CancellationToken cancellationToken)
    {
        try
        {
            // Get popular content that matches the partial query
            var popularContent = await _searchService.GetPopularContentAsync(
                limit: 100,
                cancellationToken: cancellationToken);

            return popularContent
                .Where(content => content.Title.Contains(partialQuery, StringComparison.OrdinalIgnoreCase) ||
                                content.OriginalTitle.Contains(partialQuery, StringComparison.OrdinalIgnoreCase))
                .Take(maxResults)
                .Select(content => new AutocompleteSuggestion
                {
                    Text = content.Title,
                    Type = AutocompleteSuggestionType.Title,
                    ContentId = content.Id,
                    ContentType = content.Type,
                    PosterUrl = content.PosterUrl,
                    Year = content.Year,
                    Genres = content.Genres,
                    Rating = content.Rating.HasValue ? (decimal?)content.Rating.Value : null,
                    EstimatedResults = 1,
                    Score = CalculateTitleScore(content.Title, partialQuery)
                })
                .ToList();
        }
        catch (Exception ex)
        {
            _loggerService.LogBusinessEvent("TitleSuggestionsError", new
            {
                PartialQuery = partialQuery,
                Error = ex.Message
            });

            return new List<AutocompleteSuggestion>();
        }
    }

    private Task<List<AutocompleteSuggestion>> GetPersonSuggestionsAsync(
        string partialQuery,
        int maxResults,
        CancellationToken cancellationToken)
    {
        // Mock person suggestions - in production this would query cast/crew database
        var mockPersons = new[]
        {
            "Tom Hanks", "Meryl Streep", "Leonardo DiCaprio", "Jennifer Lawrence",
            "Robert Downey Jr.", "Scarlett Johansson", "Chris Evans", "Chris Hemsworth",
            "Mark Ruffalo", "Jeremy Renner", "Samuel L. Jackson", "Morgan Freeman",
            "Denzel Washington", "Will Smith", "Brad Pitt", "Angelina Jolie"
        };

        var result = mockPersons
            .Where(person => person.Contains(partialQuery, StringComparison.OrdinalIgnoreCase))
            .Take(maxResults)
            .Select(person => new AutocompleteSuggestion
            {
                Text = person,
                Type = AutocompleteSuggestionType.Person,
                EstimatedResults = new Random().Next(5, 25),
                Score = CalculatePersonScore(person, partialQuery)
            })
            .ToList();

        return Task.FromResult(result);
    }

    private Task<List<AutocompleteSuggestion>> GetGenreSuggestionsAsync(
        string partialQuery,
        int maxResults,
        CancellationToken cancellationToken)
    {
        var genres = new[]
        {
            "Action", "Adventure", "Comedy", "Drama", "Horror", "Thriller",
            "Romance", "Sci-Fi", "Fantasy", "Documentary", "Mystery", "Crime",
            "Family", "Animation", "War", "Western", "Musical", "Biography"
        };

        var result = genres
            .Where(genre => genre.Contains(partialQuery, StringComparison.OrdinalIgnoreCase))
            .Take(maxResults)
            .Select(genre => new AutocompleteSuggestion
            {
                Text = genre,
                Type = AutocompleteSuggestionType.Genre,
                EstimatedResults = new Random().Next(50, 500),
                Score = CalculateGenreScore(genre, partialQuery)
            })
            .ToList();

        return Task.FromResult(result);
    }

    private async Task<List<AutocompleteSuggestion>> GetTrendingSuggestionsAsync(
        string partialQuery,
        int maxResults,
        CancellationToken cancellationToken)
    {
        var trending = await GetTrendingSearchesAsync(20, null, "", cancellationToken);

        return trending
            .Where(trend => trend.Query.Contains(partialQuery, StringComparison.OrdinalIgnoreCase))
            .Take(maxResults)
            .Select(trend => new AutocompleteSuggestion
            {
                Text = trend.Query,
                Type = AutocompleteSuggestionType.Trending,
                EstimatedResults = trend.SearchCount / 10, // Estimate based on search volume
                Score = trend.TrendingScore,
                Metadata = new Dictionary<string, object>
                {
                    ["isRising"] = trend.IsRising,
                    ["searchCount"] = trend.SearchCount
                }
            })
            .ToList();
    }

    private async Task<List<AutocompleteSuggestion>> GetPersonalizedSuggestionsAsync(
        string partialQuery,
        string userId,
        int maxResults,
        string correlationId,
        CancellationToken cancellationToken)
    {
        try
        {
            var recentSearches = await GetRecentSearchesAsync(userId, 20, correlationId, cancellationToken);

            return recentSearches
                .Where(search => search.Query.Contains(partialQuery, StringComparison.OrdinalIgnoreCase))
                .Take(maxResults)
                .Select(search => new AutocompleteSuggestion
                {
                    Text = search.Query,
                    Type = AutocompleteSuggestionType.History,
                    EstimatedResults = search.ResultCount,
                    Score = CalculateHistoryScore(search, partialQuery),
                    Metadata = new Dictionary<string, object>
                    {
                        ["searchedAt"] = search.SearchedAt,
                        ["wasSuccessful"] = search.WasSuccessful
                    }
                })
                .ToList();
        }
        catch (Exception ex)
        {
            _loggerService.LogBusinessEvent("PersonalizedSuggestionsError", new
            {
                PartialQuery = partialQuery,
                UserId = userId,
                Error = ex.Message,
                CorrelationId = correlationId
            });

            return new List<AutocompleteSuggestion>();
        }
    }

    private List<AutocompleteSuggestion> GetTypoCorrections(string partialQuery)
    {
        var corrections = new List<AutocompleteSuggestion>();
        var queryLower = partialQuery.ToLowerInvariant();

        foreach (var (correct, typos) in CommonTypos)
        {
            foreach (var typo in typos)
            {
                if (queryLower.Contains(typo) && queryLower != correct)
                {
                    var correctedQuery = queryLower.Replace(typo, correct);
                    corrections.Add(new AutocompleteSuggestion
                    {
                        Text = correctedQuery,
                        Type = AutocompleteSuggestionType.Typo,
                        EstimatedResults = new Random().Next(1, 10),
                        Score = CalculateTypoScore(partialQuery, correctedQuery),
                        Metadata = new Dictionary<string, object>
                        {
                            ["originalQuery"] = partialQuery,
                            ["correction"] = correctedQuery
                        }
                    });
                }
            }
        }

        return corrections;
    }

    private List<AutocompleteSuggestion> RankSuggestions(List<AutocompleteSuggestion> suggestions, string partialQuery)
    {
        // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
        return suggestions
            .GroupBy(s => s.Text.ToLowerInvariant())
            .Select(g => g.OrderByDescending(s => s.Score).FirstOrDefault())
            .Where(s => s != null) // Remove nulls
            .OrderByDescending(s => s!.Score)
            .ThenByDescending(s => s.EstimatedResults)
            .ThenBy(s => s.Text.Length) // Prefer shorter matches
            .ToList()!;
    }

    private decimal CalculateTitleScore(string title, string partialQuery)
    {
        var score = 0m;
        var titleLower = title.ToLowerInvariant();
        var queryLower = partialQuery.ToLowerInvariant();

        if (titleLower.StartsWith(queryLower))
            score += 100m;
        else if (titleLower.Contains($" {queryLower}"))
            score += 80m;
        else if (titleLower.Contains(queryLower))
            score += 60m;

        // Boost shorter titles
        score += Math.Max(0, 50 - title.Length);

        return score;
    }

    private decimal CalculatePersonScore(string person, string partialQuery)
    {
        var score = 0m;
        var personLower = person.ToLowerInvariant();
        var queryLower = partialQuery.ToLowerInvariant();

        if (personLower.StartsWith(queryLower))
            score += 90m;
        else if (personLower.Contains($" {queryLower}"))
            score += 70m;
        else if (personLower.Contains(queryLower))
            score += 50m;

        return score;
    }

    private decimal CalculateGenreScore(string genre, string partialQuery)
    {
        var score = 0m;
        var genreLower = genre.ToLowerInvariant();
        var queryLower = partialQuery.ToLowerInvariant();

        if (genreLower.StartsWith(queryLower))
            score += 85m;
        else if (genreLower.Contains(queryLower))
            score += 65m;

        return score;
    }

    private decimal CalculateHistoryScore(SearchHistoryItem search, string partialQuery)
    {
        var score = 70m; // Base score for history items

        // Boost recent searches
        var daysSinceSearch = (DateTime.UtcNow - search.SearchedAt).Days;
        score += Math.Max(0, 30 - daysSinceSearch);

        // Boost successful searches
        if (search.WasSuccessful)
            score += 20m;

        return score;
    }

    private decimal CalculateTypoScore(string original, string corrected)
    {
        // Calculate Levenshtein distance and use it to score the correction
        var distance = LevenshteinDistance(original, corrected);
        return Math.Max(0, 40 - (distance * 10));
    }

    private int LevenshteinDistance(string source, string target)
    {
        if (string.IsNullOrEmpty(source))
            return string.IsNullOrEmpty(target) ? 0 : target.Length;

        if (string.IsNullOrEmpty(target))
            return source.Length;

        var matrix = new int[source.Length + 1, target.Length + 1];

        for (int i = 0; i <= source.Length; i++)
            matrix[i, 0] = i;

        for (int j = 0; j <= target.Length; j++)
            matrix[0, j] = j;

        for (int i = 1; i <= source.Length; i++)
        {
            for (int j = 1; j <= target.Length; j++)
            {
                int cost = (target[j - 1] == source[i - 1]) ? 0 : 1;
                matrix[i, j] = Math.Min(
                    Math.Min(matrix[i - 1, j] + 1, matrix[i, j - 1] + 1),
                    matrix[i - 1, j - 1] + cost);
            }
        }

        return matrix[source.Length, target.Length];
    }

    /// <summary>
    /// Update or create a search trend entry for the given query
    /// </summary>
    private async Task UpdateSearchTrendAsync(string query, CancellationToken cancellationToken)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var normalizedQuery = query.Trim().ToLowerInvariant();

            // Find or create trend record for today
            var trend = await _context.SearchTrends
                .FirstOrDefaultAsync(st => st.Query == normalizedQuery && st.Date == today, cancellationToken);

            if (trend == null)
            {
                // Create new trend record
                trend = new SearchTrend
                {
                    Query = normalizedQuery,
                    Date = today,
                    SearchCount = 1,
                    UniqueUsers = 1,
                    LastUpdated = DateTime.UtcNow
                };

                _context.SearchTrends.Add(trend);
            }
            else
            {
                // Update existing trend
                trend.SearchCount++;
                trend.LastUpdated = DateTime.UtcNow;
            }

            // Calculate trending score based on search volume and recency
            var yesterday = today.AddDays(-1);
            var yesterdayTrend = await _context.SearchTrends
                .FirstOrDefaultAsync(st => st.Query == normalizedQuery && st.Date == yesterday, cancellationToken);

            var yesterdayCount = yesterdayTrend?.SearchCount ?? 0;
            var growthRate = yesterdayCount > 0 
                ? (decimal)(trend.SearchCount - yesterdayCount) / yesterdayCount 
                : 1.0m; // New queries get a boost

            trend.IsRising = trend.SearchCount > yesterdayCount;
            trend.TrendingScore = Math.Min(100m, (decimal)trend.SearchCount + (growthRate * 50m));

            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _loggerService.LogBusinessEvent("UpdateSearchTrendError", new
            {
                Query = query,
                Error = ex.Message
            });
        }
    }
}
