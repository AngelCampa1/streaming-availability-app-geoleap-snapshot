using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for checking data consistency
/// </summary>
public class DataConsistencyChecker : IDataConsistencyChecker
{
    private readonly ILogger<DataConsistencyChecker> _logger;

    public DataConsistencyChecker(ILogger<DataConsistencyChecker> logger)
    {
        _logger = logger;
    }

    public async Task<List<ConsistencyIssue>> CheckConsistencyAsync<T>(T data) where T : class
    {
        var issues = new List<ConsistencyIssue>();

        try
        {
            switch (data)
            {
                case ContentMetadata content:
                    issues.AddRange(await CheckContentMetadataConsistency(content));
                    break;
                case StreamingAvailabilityResponse streaming:
                    issues.AddRange(await CheckStreamingAvailabilityConsistency(streaming));
                    break;
                default:
                    _logger.LogWarning("No consistency checks available for type {DataType}", typeof(T).Name);
                    break;
            }

            _logger.LogDebug("Consistency check completed for {DataType}: found {IssueCount} issues", 
                typeof(T).Name, issues.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Consistency check failed for {DataType}", typeof(T).Name);
            issues.Add(new ConsistencyIssue
            {
                Field = "General",
                Issue = $"Consistency check failed: {ex.Message}",
                Level = ConsistencyLevel.Critical
            });
        }

        return issues;
    }

    public async Task<List<ConsistencyIssue>> CheckConsistencyAcrossDataAsync<T>(List<T> dataItems) where T : class
    {
        var issues = new List<ConsistencyIssue>();

        if (!dataItems.Any())
            return issues;

        try
        {
            // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when checking data type
            var firstItem = dataItems.FirstOrDefault();
            if (firstItem == null)
                return issues;

            switch (firstItem)
            {
                case ContentMetadata:
                    var contentItems = dataItems.Cast<ContentMetadata>().ToList();
                    issues.AddRange(await CheckContentMetadataConsistencyAcrossItems(contentItems));
                    break;
                case StreamingAvailabilityResponse:
                    var streamingItems = dataItems.Cast<StreamingAvailabilityResponse>().ToList();
                    issues.AddRange(await CheckStreamingConsistencyAcrossItems(streamingItems));
                    break;
                default:
                    _logger.LogWarning("No cross-item consistency checks available for type {DataType}", typeof(T).Name);
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cross-item consistency check failed for {DataType}", typeof(T).Name);
        }

        return issues;
    }

    private async Task<List<ConsistencyIssue>> CheckContentMetadataConsistency(ContentMetadata content)
    {
        var issues = new List<ConsistencyIssue>();

        // Check title consistency
        if (!string.IsNullOrWhiteSpace(content.Title) && !string.IsNullOrWhiteSpace(content.OriginalTitle))
        {
            if (content.Title.Length > content.OriginalTitle.Length * 3)
            {
                issues.Add(new ConsistencyIssue
                {
                    Field = "Title",
                    Issue = "Title is significantly longer than original title",
                    Expected = $"Similar length to original title ({content.OriginalTitle.Length} chars)",
                    Actual = $"Title length: {content.Title.Length} chars",
                    Level = ConsistencyLevel.Minor
                });
            }
        }

        // Check rating and vote consistency
        if (content.VoteAverage.HasValue && content.VoteCount > 0)
        {
            if (content.VoteAverage.Value > 9 && content.VoteCount < 10)
            {
                issues.Add(new ConsistencyIssue
                {
                    Field = "VoteAverage",
                    Issue = "Very high rating with very few votes is suspicious",
                    Expected = "More votes for high ratings or lower rating",
                    Actual = $"Rating: {content.VoteAverage.Value}, Votes: {content.VoteCount}",
                    Level = ConsistencyLevel.Moderate
                });
            }

            if (content.VoteAverage.Value < 3 && content.VoteCount < 5)
            {
                issues.Add(new ConsistencyIssue
                {
                    Field = "VoteAverage", 
                    Issue = "Very low rating with very few votes may be unreliable",
                    Expected = "More votes for reliable rating",
                    Actual = $"Rating: {content.VoteAverage.Value}, Votes: {content.VoteCount}",
                    Level = ConsistencyLevel.Minor
                });
            }
        }

        // Check release date consistency
        if (content.ReleaseDate.HasValue)
        {
            var releaseYear = content.ReleaseDate.Value.Year;
            
            // Check against TMDb ID patterns (rough heuristic)
            if (content.TmdbId > 0 && releaseYear > 0)
            {
                var estimatedYearFromId = EstimateYearFromTmdbId(content.TmdbId);
                if (estimatedYearFromId.HasValue && Math.Abs(releaseYear - estimatedYearFromId.Value) > 20)
                {
                    issues.Add(new ConsistencyIssue
                    {
                        Field = "ReleaseDate",
                        Issue = "Release date seems inconsistent with TMDb ID",
                        Expected = $"Year around {estimatedYearFromId.Value}",
                        Actual = $"Release year: {releaseYear}",
                        Level = ConsistencyLevel.Moderate
                    });
                }
            }
        }

        // Check type-specific consistency
        if (content.Type == TmdbContentType.Movie)
        {
            await CheckMovieSpecificConsistency(content, issues);
        }
        else if (content.Type == TmdbContentType.TvSeries)
        {
            await CheckTvSeriesSpecificConsistency(content, issues);
        }

        // Check budget vs revenue consistency
        if (content.Budget.HasValue && content.Revenue.HasValue && content.Type == TmdbContentType.Movie)
        {
            if (content.Budget.Value > 0 && content.Revenue.Value > 0)
            {
                var ratio = (double)content.Revenue.Value / content.Budget.Value;
                if (ratio > 50) // More than 50x return seems suspicious
                {
                    issues.Add(new ConsistencyIssue
                    {
                        Field = "Revenue",
                        Issue = "Revenue to budget ratio seems unusually high",
                        Expected = "More reasonable revenue-to-budget ratio",
                        Actual = $"Ratio: {ratio:F1}x (Budget: ${content.Budget.Value:N0}, Revenue: ${content.Revenue.Value:N0})",
                        Level = ConsistencyLevel.Minor
                    });
                }
            }
        }

        // Check cast and crew consistency
        if (content.Cast?.Any() == true && content.Crew?.Any() == true)
        {
            var castNames = content.Cast.Select(c => c.Name.ToLowerInvariant()).ToHashSet();
            var crewNames = content.Crew.Select(c => c.Name.ToLowerInvariant()).ToHashSet();
            var overlap = castNames.Intersect(crewNames).ToList();
            
            if (overlap.Count > content.Cast.Count * 0.5) // More than 50% overlap seems unusual
            {
                issues.Add(new ConsistencyIssue
                {
                    Field = "Cast",
                    Issue = "Unusually high overlap between cast and crew",
                    Expected = "Distinct cast and crew members",
                    Actual = $"{overlap.Count} people in both cast and crew",
                    Level = ConsistencyLevel.Minor
                });
            }
        }

        return issues;
    }

    private async Task<List<ConsistencyIssue>> CheckMovieSpecificConsistency(ContentMetadata content, List<ConsistencyIssue> issues)
    {
        // Runtime consistency checks
        if (content.Runtime.HasValue)
        {
            var runtime = content.Runtime.Value;
            
            // Check runtime vs genre consistency
            if (content.Genres?.Any() == true)
            {
                var hasActionGenre = content.Genres.Any(g => g.Contains("Action", StringComparison.OrdinalIgnoreCase));
                var hasDocumentaryGenre = content.Genres.Any(g => g.Contains("Documentary", StringComparison.OrdinalIgnoreCase));
                
                if (hasDocumentaryGenre && runtime < 30)
                {
                    issues.Add(new ConsistencyIssue
                    {
                        Field = "Runtime",
                        Issue = "Documentary with very short runtime",
                        Expected = "Typically 60+ minutes for documentaries",
                        Actual = $"Runtime: {runtime} minutes",
                        Level = ConsistencyLevel.Minor
                    });
                }

                if (hasActionGenre && runtime < 70)
                {
                    issues.Add(new ConsistencyIssue
                    {
                        Field = "Runtime",
                        Issue = "Action movie with unusually short runtime",
                        Expected = "Typically 90+ minutes for action movies",
                        Actual = $"Runtime: {runtime} minutes", 
                        Level = ConsistencyLevel.Minor
                    });
                }
            }
        }

        // Check for TV-specific fields in movie
        if (content.NumberOfSeasons.HasValue || content.NumberOfEpisodes.HasValue)
        {
            issues.Add(new ConsistencyIssue
            {
                Field = "Type",
                Issue = "Movie has TV series fields (seasons/episodes)",
                Expected = "No season/episode data for movies",
                Actual = $"Seasons: {content.NumberOfSeasons}, Episodes: {content.NumberOfEpisodes}",
                Level = ConsistencyLevel.Major
            });
        }

        return issues;
    }

    private async Task<List<ConsistencyIssue>> CheckTvSeriesSpecificConsistency(ContentMetadata content, List<ConsistencyIssue> issues)
    {
        // Season/episode consistency
        if (content.NumberOfSeasons.HasValue && content.NumberOfEpisodes.HasValue)
        {
            var avgEpisodesPerSeason = (double)content.NumberOfEpisodes.Value / content.NumberOfSeasons.Value;
            
            if (avgEpisodesPerSeason < 1)
            {
                issues.Add(new ConsistencyIssue
                {
                    Field = "NumberOfEpisodes",
                    Issue = "Less than 1 episode per season on average",
                    Expected = "At least 1 episode per season",
                    Actual = $"Avg: {avgEpisodesPerSeason:F1} episodes per season",
                    Level = ConsistencyLevel.Major
                });
            }
            else if (avgEpisodesPerSeason > 200)
            {
                issues.Add(new ConsistencyIssue
                {
                    Field = "NumberOfEpisodes",
                    Issue = "Unusually high number of episodes per season",
                    Expected = "Typically < 50 episodes per season",
                    Actual = $"Avg: {avgEpisodesPerSeason:F1} episodes per season",
                    Level = ConsistencyLevel.Moderate
                });
            }
        }

        // Check for movie-specific fields in TV series
        if (content.Runtime.HasValue && content.Runtime.Value > 300) // > 5 hours
        {
            issues.Add(new ConsistencyIssue
            {
                Field = "Runtime",
                Issue = "TV series has unusually long runtime (might be total series runtime instead of episode runtime)",
                Expected = "Episode runtime typically 20-90 minutes",
                Actual = $"Runtime: {content.Runtime.Value} minutes",
                Level = ConsistencyLevel.Moderate
            });
        }

        if (content.Budget.HasValue || content.Revenue.HasValue)
        {
            issues.Add(new ConsistencyIssue
            {
                Field = "Type",
                Issue = "TV series has budget/revenue data (typically movie fields)",
                Expected = "No budget/revenue for TV series",
                Actual = $"Budget: {content.Budget}, Revenue: {content.Revenue}",
                Level = ConsistencyLevel.Minor
            });
        }

        return issues;
    }

    private async Task<List<ConsistencyIssue>> CheckStreamingAvailabilityConsistency(StreamingAvailabilityResponse streaming)
    {
        var issues = new List<ConsistencyIssue>();

        if (streaming.StreamingOptions?.Any() != true)
            return issues;

        // Check for duplicate options
        var duplicateGroups = streaming.StreamingOptions
            .GroupBy(o => new { o.ServiceId, o.CountryCode, o.Type })
            .Where(g => g.Count() > 1)
            .ToList();

        foreach (var group in duplicateGroups)
        {
            issues.Add(new ConsistencyIssue
            {
                Field = "StreamingOptions",
                Issue = "Duplicate streaming options found",
                Expected = "Unique combinations of service, country, and type",
                Actual = $"Service: {group.Key.ServiceId}, Country: {group.Key.CountryCode}, Type: {group.Key.Type} appears {group.Count()} times",
                Level = ConsistencyLevel.Moderate
            });
        }

        // Check price consistency for same service across countries
        var serviceGroups = streaming.StreamingOptions
            .Where(o => o.Price.HasValue && o.Price.Value > 0)
            .GroupBy(o => new { o.ServiceId, o.Type })
            .Where(g => g.Count() > 1)
            .ToList();

        foreach (var group in serviceGroups)
        {
            var prices = group.Select(o => o.Price.Value).ToList();
            var minPrice = prices.Min();
            var maxPrice = prices.Max();
            
            if (maxPrice > minPrice * 10) // 10x price difference seems suspicious
            {
                issues.Add(new ConsistencyIssue
                {
                    Field = "Price",
                    Issue = "Extreme price variation for same service and type across countries",
                    Expected = "More consistent pricing across regions",
                    Actual = $"Price range: {minPrice:C} - {maxPrice:C} for {group.Key.ServiceId} {group.Key.Type}",
                    Level = ConsistencyLevel.Moderate
                });
            }
        }

        // Check expiration date consistency
        var expiredOptions = streaming.StreamingOptions
            .Where(o => o.ExpiresAt.HasValue && o.ExpiresAt.Value < DateTime.UtcNow)
            .ToList();

        if (expiredOptions.Any())
        {
            issues.Add(new ConsistencyIssue
            {
                Field = "ExpiresAt",
                Issue = "Some streaming options have already expired",
                Expected = "Current or future expiration dates",
                Actual = $"{expiredOptions.Count} expired options found",
                Level = ConsistencyLevel.Major
            });
        }

        return issues;
    }

    private async Task<List<ConsistencyIssue>> CheckContentMetadataConsistencyAcrossItems(List<ContentMetadata> items)
    {
        var issues = new List<ConsistencyIssue>();

        if (items.Count < 2) return issues;

        // Check for potential duplicates based on title and year
        var potentialDuplicates = items
            .GroupBy(i => new { 
                Title = i.Title?.Trim().ToLowerInvariant(), 
                Year = i.ReleaseDate?.Year 
            })
            .Where(g => g.Count() > 1 && !string.IsNullOrWhiteSpace(g.Key.Title))
            .ToList();

        foreach (var group in potentialDuplicates)
        {
            issues.Add(new ConsistencyIssue
            {
                Field = "Title",
                Issue = "Potential duplicate content found",
                Expected = "Unique content items",
                Actual = $"'{group.Key.Title}' ({group.Key.Year}) appears {group.Count()} times",
                Level = ConsistencyLevel.Major
            });
        }

        return issues;
    }

    private async Task<List<ConsistencyIssue>> CheckStreamingConsistencyAcrossItems(List<StreamingAvailabilityResponse> items)
    {
        var issues = new List<ConsistencyIssue>();

        if (items.Count < 2) return issues;

        // Check for content ID conflicts
        var idConflicts = items
            .GroupBy(i => i.ContentId)
            .Where(g => g.Count() > 1 && !string.IsNullOrWhiteSpace(g.Key))
            .ToList();

        foreach (var group in idConflicts)
        {
            var titles = group.Select(i => i.Title).Distinct().ToList();
            if (titles.Count > 1) // Same ID but different titles
            {
                issues.Add(new ConsistencyIssue
                {
                    Field = "ContentId",
                    Issue = "Same content ID used for different titles",
                    Expected = "Unique content ID per unique content",
                    Actual = $"ID '{group.Key}' used for: {string.Join(", ", titles)}",
                    Level = ConsistencyLevel.Critical
                });
            }
        }

        return issues;
    }

    private int? EstimateYearFromTmdbId(int tmdbId)
    {
        // This is a rough heuristic based on TMDb ID patterns
        // TMDb started around 2008, and IDs have generally increased over time
        
        if (tmdbId < 10000) return 2008;
        if (tmdbId < 50000) return 2009;
        if (tmdbId < 100000) return 2010;
        if (tmdbId < 200000) return 2012;
        if (tmdbId < 300000) return 2014;
        if (tmdbId < 400000) return 2016;
        if (tmdbId < 500000) return 2018;
        if (tmdbId < 700000) return 2020;
        if (tmdbId < 1000000) return 2022;
        
        return 2023; // For very high IDs
    }
}