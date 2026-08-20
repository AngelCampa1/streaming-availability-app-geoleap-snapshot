using System.Text.RegularExpressions;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for linking streaming availability data with TMDb metadata
/// </summary>
public interface IContentLinkingService
{
    /// <summary>
    /// Link streaming availability data with TMDb metadata
    /// </summary>
    /// <param name="streamingData">Streaming availability information</param>
    /// <param name="language">Language for metadata lookup</param>
    /// <returns>Linked content with confidence score</returns>
    Task<LinkedContent> LinkContentDataAsync(StreamingAvailability streamingData, string language = "en-US");
    
    /// <summary>
    /// Batch link multiple streaming items
    /// </summary>
    /// <param name="streamingItems">Collection of streaming availability items</param>
    /// <param name="language">Language for metadata lookup</param>
    /// <returns>Collection of linked content items</returns>
    Task<List<LinkedContent>> LinkMultipleContentAsync(IEnumerable<StreamingAvailability> streamingItems, string language = "en-US");
    
    /// <summary>
    /// Find best TMDb match for streaming content using various strategies
    /// </summary>
    /// <param name="title">Content title</param>
    /// <param name="year">Release/air year</param>
    /// <param name="type">Content type hint</param>
    /// <param name="language">Search language</param>
    /// <returns>Best matching content metadata</returns>
    Task<ContentMetadata?> FindBestMetadataMatchAsync(string title, int? year, string? type, string language = "en-US");
    
    /// <summary>
    /// Calculate confidence score for a potential link between streaming and metadata
    /// </summary>
    /// <param name="streamingData">Streaming availability data</param>
    /// <param name="metadata">TMDb metadata</param>
    /// <returns>Confidence score between 0.0 and 1.0</returns>
    double CalculateLinkConfidence(StreamingAvailability streamingData, ContentMetadata? metadata);
}

public class ContentLinkingService : IContentLinkingService
{
    private readonly ITmdbClient _tmdbClient;
    private readonly ILogger<ContentLinkingService> _logger;
    
    // Confidence thresholds
    private const double HIGH_CONFIDENCE_THRESHOLD = 0.9;
    private const double MEDIUM_CONFIDENCE_THRESHOLD = 0.7;
    private const double LOW_CONFIDENCE_THRESHOLD = 0.5;
    
    // Year tolerance for matching
    private const int YEAR_TOLERANCE = 1;
    
    // Common title variations and their normalized forms
    private static readonly Dictionary<string, string> TitleNormalizations = new()
    {
        { "&", "and" },
        { ":", "" },
        { "'", "" },
        { "\"", "" },
        { "!", "" },
        { "?", "" },
        { "-", " " },
        { "_", " " }
    };

    public ContentLinkingService(ITmdbClient tmdbClient, ILogger<ContentLinkingService> logger)
    {
        _tmdbClient = tmdbClient;
        _logger = logger;
    }

    public async Task<LinkedContent> LinkContentDataAsync(StreamingAvailability streamingData, string language = "en-US")
    {
        var correlationId = Guid.NewGuid().ToString();
        
        _logger.LogDebug("Starting content linking for: {Title} ({Year})", 
            streamingData.Title, streamingData.Year);

        LinkedContent result;
        
        try
        {
            // Strategy 1: Try exact title and year match
            var exactMatch = await TryExactMatchAsync(streamingData, language);
            if (exactMatch != null)
            {
                var exactConfidence = CalculateLinkConfidence(streamingData, exactMatch);
                if (exactConfidence >= HIGH_CONFIDENCE_THRESHOLD)
                {
                    result = new LinkedContent
                    {
                        StreamingData = streamingData,
                        Metadata = exactMatch,
                        LinkConfidence = exactConfidence,
                        LinkMethod = "ExactMatch"
                    };
                    
                    _logger.LogInformation("High confidence exact match found for: {Title}", 
                        streamingData.Title, correlationId);
                    return result;
                }
            }
            
            // Strategy 2: Try normalized title matching
            var normalizedMatch = await TryNormalizedMatchAsync(streamingData, language);
            if (normalizedMatch != null)
            {
                var normalizedConfidence = CalculateLinkConfidence(streamingData, normalizedMatch);
                if (normalizedConfidence >= MEDIUM_CONFIDENCE_THRESHOLD)
                {
                    result = new LinkedContent
                    {
                        StreamingData = streamingData,
                        Metadata = normalizedMatch,
                        LinkConfidence = normalizedConfidence,
                        LinkMethod = "NormalizedMatch"
                    };
                    
                    _logger.LogInformation("Medium confidence normalized match found for: {Title}", 
                        streamingData.Title, correlationId);
                    return result;
                }
            }
            
            // Strategy 3: Try fuzzy matching with multiple search terms
            var fuzzyMatch = await TryFuzzyMatchAsync(streamingData, language);
            if (fuzzyMatch != null)
            {
                var fuzzyConfidence = CalculateLinkConfidence(streamingData, fuzzyMatch);
                if (fuzzyConfidence >= LOW_CONFIDENCE_THRESHOLD)
                {
                    result = new LinkedContent
                    {
                        StreamingData = streamingData,
                        Metadata = fuzzyMatch,
                        LinkConfidence = fuzzyConfidence,
                        LinkMethod = "FuzzyMatch"
                    };
                    
                    _logger.LogInformation("Low confidence fuzzy match found for: {Title}", 
                        streamingData.Title, correlationId);
                    return result;
                }
            }
            
            // No suitable match found
            result = new LinkedContent
            {
                StreamingData = streamingData,
                Metadata = null,
                LinkConfidence = 0.0,
                LinkMethod = "NoMatch"
            };
            
            _logger.LogWarning("No suitable TMDb match found for: {Title} ({Year})", 
                streamingData.Title, streamingData.Year);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during content linking for: {Title}", streamingData.Title);
            
            result = new LinkedContent
            {
                StreamingData = streamingData,
                Metadata = null,
                LinkConfidence = 0.0,
                LinkMethod = "Error"
            };
        }
        
        return result;
    }

    public async Task<List<LinkedContent>> LinkMultipleContentAsync(
        IEnumerable<StreamingAvailability> streamingItems, 
        string language = "en-US")
    {
        var tasks = streamingItems.Select(item => LinkContentDataAsync(item, language));
        var results = await Task.WhenAll(tasks);
        
        _logger.LogInformation("Linked {Total} content items, {Successful} successful links", 
            results.Length, results.Count(r => r.Metadata != null));
        
        return results.ToList();
    }

    public async Task<ContentMetadata?> FindBestMetadataMatchAsync(
        string title, 
        int? year, 
        string? type, 
        string language = "en-US")
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return null;
        }

        // Create a temporary streaming availability object for matching logic
        var tempStreamingData = new StreamingAvailability
        {
            Title = title,
            Year = year,
            Type = type ?? "movie"
        };

        var linkedContent = await LinkContentDataAsync(tempStreamingData, language);
        return linkedContent.Metadata;
    }

    public double CalculateLinkConfidence(StreamingAvailability streamingData, ContentMetadata? metadata)
    {
        if (metadata == null)
        {
            return 0.0;
        }

        double confidence = 0.0;
        double maxPoints = 0.0;

        // Title similarity (40% weight)
        var titleSimilarity = CalculateTitleSimilarity(streamingData.Title, metadata.Title);
        confidence += titleSimilarity * 0.4;
        maxPoints += 0.4;

        // Original title similarity (20% weight) - if available
        if (!string.IsNullOrEmpty(metadata.OriginalTitle) && 
            !string.Equals(metadata.Title, metadata.OriginalTitle, StringComparison.OrdinalIgnoreCase))
        {
            var originalTitleSimilarity = CalculateTitleSimilarity(streamingData.Title, metadata.OriginalTitle);
            confidence += Math.Max(titleSimilarity, originalTitleSimilarity) * 0.2;
            maxPoints += 0.2;
        }

        // Year proximity (25% weight)
        if (streamingData.Year.HasValue && metadata.ReleaseDate.HasValue)
        {
            var yearDiff = Math.Abs(streamingData.Year.Value - metadata.ReleaseDate.Value.Year);
            var yearScore = yearDiff <= YEAR_TOLERANCE ? 1.0 : Math.Max(0.0, 1.0 - (yearDiff - YEAR_TOLERANCE) * 0.2);
            confidence += yearScore * 0.25;
            maxPoints += 0.25;
        }

        // Type consistency (15% weight)
        var typeScore = CalculateTypeConsistency(streamingData.Type, metadata.Type);
        confidence += typeScore * 0.15;
        maxPoints += 0.15;

        // Normalize confidence to account for missing data
        return maxPoints > 0 ? Math.Min(1.0, confidence / maxPoints) : 0.0;
    }

    #region Private Helper Methods

    private async Task<ContentMetadata?> TryExactMatchAsync(StreamingAvailability streamingData, string language)
    {
        var query = streamingData.Year.HasValue 
            ? $"{streamingData.Title} {streamingData.Year}" 
            : streamingData.Title;

        var searchResults = await _tmdbClient.SearchMultiAsync(query, language: language);
        
        return FindBestMatchFromResults(streamingData, searchResults.Results);
    }

    private async Task<ContentMetadata?> TryNormalizedMatchAsync(StreamingAvailability streamingData, string language)
    {
        var normalizedTitle = NormalizeTitle(streamingData.Title);
        var query = streamingData.Year.HasValue 
            ? $"{normalizedTitle} {streamingData.Year}" 
            : normalizedTitle;

        var searchResults = await _tmdbClient.SearchMultiAsync(query, language: language);
        
        return FindBestMatchFromResults(streamingData, searchResults.Results);
    }

    private async Task<ContentMetadata?> TryFuzzyMatchAsync(StreamingAvailability streamingData, string language)
    {
        // Try searching with just the main title (without subtitle)
        var mainTitle = ExtractMainTitle(streamingData.Title);
        if (!string.Equals(mainTitle, streamingData.Title, StringComparison.OrdinalIgnoreCase))
        {
            var searchResults = await _tmdbClient.SearchMultiAsync(mainTitle, language: language);
            var match = FindBestMatchFromResults(streamingData, searchResults.Results);
            if (match != null)
            {
                return match;
            }
        }

        // Try searching without year if year search didn't work
        if (streamingData.Year.HasValue)
        {
            var searchResults = await _tmdbClient.SearchMultiAsync(streamingData.Title, language: language);
            var match = FindBestMatchFromResults(streamingData, searchResults.Results);
            if (match != null)
            {
                return match;
            }
        }

        // Try type-specific searches
        if (IsLikelyMovie(streamingData))
        {
            var movieResults = await _tmdbClient.SearchMoviesAsync(
                streamingData.Title, 
                language: language, 
                year: streamingData.Year);
            var movieMatch = FindBestMatchFromResults(streamingData, movieResults.Results);
            if (movieMatch != null)
            {
                return movieMatch;
            }
        }
        else
        {
            var tvResults = await _tmdbClient.SearchTvShowsAsync(
                streamingData.Title, 
                language: language, 
                firstAirDateYear: streamingData.Year);
            var tvMatch = FindBestMatchFromResults(streamingData, tvResults.Results);
            if (tvMatch != null)
            {
                return tvMatch;
            }
        }

        return null;
    }

    private ContentMetadata? FindBestMatchFromResults(StreamingAvailability streamingData, List<ContentMetadata> results)
    {
        if (!results.Any())
        {
            return null;
        }

        var scoredResults = results
            .Select(result => new { 
                Content = result, 
                Score = CalculateLinkConfidence(streamingData, result) 
            })
            .Where(x => x.Score >= LOW_CONFIDENCE_THRESHOLD)
            .OrderByDescending(x => x.Score)
            .ToList();

        return scoredResults.FirstOrDefault()?.Content;
    }

    private double CalculateTitleSimilarity(string title1, string? title2)
    {
        if (string.IsNullOrWhiteSpace(title2))
        {
            return 0.0;
        }

        // Normalize both titles
        var norm1 = NormalizeTitle(title1);
        var norm2 = NormalizeTitle(title2);

        // Exact match
        if (string.Equals(norm1, norm2, StringComparison.OrdinalIgnoreCase))
        {
            return 1.0;
        }

        // Calculate Levenshtein distance-based similarity
        var distance = CalculateLevenshteinDistance(norm1, norm2);
        var maxLength = Math.Max(norm1.Length, norm2.Length);
        
        if (maxLength == 0) return 1.0;
        
        var similarity = 1.0 - (double)distance / maxLength;
        
        // Boost similarity for partial matches
        if (norm1.Contains(norm2, StringComparison.OrdinalIgnoreCase) || 
            norm2.Contains(norm1, StringComparison.OrdinalIgnoreCase))
        {
            similarity = Math.Max(similarity, 0.8);
        }

        return Math.Max(0.0, similarity);
    }

    private double CalculateTypeConsistency(string? streamingType, TmdbContentType metadataType)
    {
        if (string.IsNullOrEmpty(streamingType))
        {
            return 0.5; // Neutral if type is unknown
        }

        var normalizedStreamingType = streamingType.ToLower();
        
        return normalizedStreamingType switch
        {
            "movie" when metadataType == TmdbContentType.Movie => 1.0,
            "tv" when metadataType == TmdbContentType.TvSeries => 1.0,
            "series" when metadataType == TmdbContentType.TvSeries => 1.0,
            "show" when metadataType == TmdbContentType.TvSeries => 1.0,
            _ => 0.0
        };
    }

    private string NormalizeTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return string.Empty;
        }

        var normalized = title.ToLowerInvariant();
        
        // Apply common normalizations
        foreach (var kvp in TitleNormalizations)
        {
            normalized = normalized.Replace(kvp.Key, kvp.Value);
        }
        
        // Remove extra whitespace
        normalized = Regex.Replace(normalized, @"\s+", " ").Trim();
        
        // Remove common articles at the beginning
        var articles = new[] { "the ", "a ", "an " };
        foreach (var article in articles)
        {
            if (normalized.StartsWith(article))
            {
                normalized = normalized[article.Length..];
                break;
            }
        }
        
        return normalized;
    }

    private string ExtractMainTitle(string title)
    {
        // Remove content in parentheses (often year or additional info)
        var withoutParens = Regex.Replace(title, @"\s*\([^)]*\)", "").Trim();
        
        // Remove content after colon or dash (often subtitles)
        var colonIndex = withoutParens.IndexOf(':');
        if (colonIndex > 0)
        {
            return withoutParens[..colonIndex].Trim();
        }
        
        var dashIndex = withoutParens.LastIndexOf(" - ");
        if (dashIndex > 0)
        {
            return withoutParens[..dashIndex].Trim();
        }
        
        return withoutParens;
    }

    private bool IsLikelyMovie(StreamingAvailability streamingData)
    {
        var type = streamingData.Type?.ToLower();
        return type == "movie" || type == "film";
    }

    private int CalculateLevenshteinDistance(string source, string target)
    {
        if (string.IsNullOrEmpty(source)) return target?.Length ?? 0;
        if (string.IsNullOrEmpty(target)) return source.Length;

        var sourceLength = source.Length;
        var targetLength = target.Length;
        var matrix = new int[sourceLength + 1, targetLength + 1];

        // Initialize first row and column
        for (var i = 0; i <= sourceLength; i++) matrix[i, 0] = i;
        for (var j = 0; j <= targetLength; j++) matrix[0, j] = j;

        for (var i = 1; i <= sourceLength; i++)
        {
            for (var j = 1; j <= targetLength; j++)
            {
                var cost = source[i - 1] == target[j - 1] ? 0 : 1;
                
                matrix[i, j] = Math.Min(
                    Math.Min(matrix[i - 1, j] + 1, matrix[i, j - 1] + 1),
                    matrix[i - 1, j - 1] + cost);
            }
        }

        return matrix[sourceLength, targetLength];
    }

    #endregion
}