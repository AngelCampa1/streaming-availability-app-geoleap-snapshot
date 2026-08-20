using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Data transformation service implementation with provider-specific transformations and merging
/// </summary>
public class DataTransformationService : IDataTransformationService
{
    private readonly ILogger<DataTransformationService> _logger;

    public DataTransformationService(ILogger<DataTransformationService> logger)
    {
        _logger = logger;
    }

    public async Task<ContentSearchResult> TransformSearchResultAsync(ProviderSearchResult providerResult, ProviderType providerType, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Transforming search result from provider type {ProviderType} with {Count} items", 
            providerType, providerResult.Results.Count);
            
        var transformedResults = new List<ContentSummary>();
        
        foreach (var item in providerResult.Results)
        {
            var transformedItem = new ContentSummary
            {
                Id = item.Id,
                Title = NormalizeTitle(item.Title),
                OriginalTitle = NormalizeTitle(item.OriginalTitle),
                Type = item.Type,
                Year = item.Year,
                Overview = NormalizeOverview(item.Overview),
                Genres = NormalizeGenres(item.Genres),
                ImageUrl = NormalizeImageUrl(item.ImageUrl, providerType),
                Rating = NormalizeRating(item.Rating),
                RuntimeMinutes = null, // Not typically available in search results
                Language = ExtractLanguage(item.OriginalTitle, item.Title),
                AvailableCountries = 0, // Will be populated later if needed
                DataSources = new List<string> { providerResult.ProviderId }
            };
            
            transformedResults.Add(transformedItem);
        }
        
        return new ContentSearchResult
        {
            Results = transformedResults.Select(t => new ContentData
            {
                Id = t.Id,
                Title = t.Title,
                OriginalTitle = t.OriginalTitle,
                Type = t.Type.ToString().ToLower(),
                ReleaseYear = t.Year,
                Overview = t.Overview,
                Genres = t.Genres,
                PosterUrl = t.ImageUrl,
                Rating = t.Rating.HasValue ? (decimal?)t.Rating.Value : null
            }).ToList(),
            TotalResults = providerResult.TotalCount,
            Page = providerResult.Page,
            PageSize = providerResult.PageSize,
            HasMore = (providerResult.Page * providerResult.PageSize) < providerResult.TotalCount,
            SearchedAt = providerResult.SearchedAt,
            ResponseTime = providerResult.ResponseTime,
            DataSources = new List<string> { providerResult.ProviderId }
        };
    }

    public async Task<ContentDetails> TransformContentDetailsAsync(ProviderContentDetails providerDetails, ProviderType providerType, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Transforming content details from provider type {ProviderType} for content {ContentId}", 
            providerType, providerDetails.Id);
            
        var contentDetails = new ContentDetails
        {
            // Base ContentMetadata properties
            TmdbId = TryParseInt(providerDetails.Id) ?? 0,
            Title = NormalizeTitle(providerDetails.Title),
            OriginalTitle = NormalizeTitle(providerDetails.OriginalTitle),
            Overview = NormalizeOverview(providerDetails.Overview),
            ReleaseDate = providerDetails.ReleaseDate,
            Type = MapToTmdbContentType(providerDetails.Type),
            VoteAverage = providerDetails.Rating.HasValue ? (double)providerDetails.Rating.Value : null,
            VoteCount = providerDetails.VoteCount ?? 0,
            PosterPath = ExtractImagePath(providerDetails.PosterUrl),
            BackdropPath = ExtractImagePath(providerDetails.BackdropUrl),
            Genres = NormalizeGenres(providerDetails.Genres),
            Cast = TransformCastMembers(providerDetails.Cast),
            Crew = TransformCrewMembers(providerDetails.Crew),
            
            // Extended properties
            DataSources = new List<string> { providerDetails.ProviderId },
            LastUpdated = DateTime.UtcNow,
            AvailableCountries = 0, // Will be populated later
            ExternalIds = new ExternalIds
            {
                TmdbId = TryParseInt(providerDetails.Id)
            }
        };
        
        // Set ratings if available
        if (providerDetails.Rating.HasValue)
        {
            contentDetails.Ratings = new ContentRatings
            {
                UserRating = providerDetails.Rating.Value,
                VoteCount = providerDetails.VoteCount
            };
        }
        
        // Set images
        contentDetails.Images = new ContentImages
        {
            PosterUrl = NormalizeImageUrl(providerDetails.PosterUrl, providerType),
            BackdropUrl = NormalizeImageUrl(providerDetails.BackdropUrl, providerType)
        };
        
        return contentDetails;
    }

    public async Task<StreamingAvailabilityResponse> TransformStreamingAvailabilityAsync(ProviderStreamingAvailability providerAvailability, ProviderType providerType, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Transforming streaming availability from provider type {ProviderType} for content {ContentId}", 
            providerType, providerAvailability.ContentId);
            
        var streamingOptions = providerAvailability.StreamingOptions.Select(so => new StreamingOption
        {
            ServiceId = so.ServiceId,
            ServiceName = NormalizeServiceName(so.ServiceName),
            CountryCode = NormalizeCountryCode(so.CountryCode),
            Type = MapStreamingType(so.Type),
            Price = so.Price,
            Currency = so.Currency,
            StreamingUrl = so.StreamingUrl,
            LastUpdated = so.LastUpdated
        }).ToList();
        
        return new StreamingAvailabilityResponse
        {
            ContentId = providerAvailability.ContentId,
            Title = NormalizeTitle(providerAvailability.Title),
            Type = providerAvailability.Type,
            StreamingOptions = streamingOptions,
            LastUpdated = providerAvailability.LastUpdated
        };
    }

    public async Task<PersonDetails> TransformPersonDetailsAsync(ProviderPersonDetails providerPerson, ProviderType providerType, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Transforming person details from provider type {ProviderType} for person {PersonId}", 
            providerType, providerPerson.Id);
            
        return new PersonDetails
        {
            Id = TryParseInt(providerPerson.Id) ?? 0,
            Name = NormalizeTitle(providerPerson.Name),
            Biography = NormalizeOverview(providerPerson.Biography),
            Birthday = providerPerson.Birthday,
            Deathday = providerPerson.Deathday,
            PlaceOfBirth = providerPerson.PlaceOfBirth,
            ProfilePath = ExtractImagePath(providerPerson.ProfileUrl)
        };
    }

    public async Task<ContentSearchResult> MergeSearchResultsAsync(List<ContentSearchResult> searchResults, CancellationToken cancellationToken = default)
    {
        if (!searchResults.Any())
        {
            return new ContentSearchResult { Results = new List<ContentData>() };
        }
        
        _logger.LogDebug("Merging search results from {Count} providers", searchResults.Count);
        
        var allResults = searchResults.SelectMany(sr => sr.Results).ToList();
        var allSummaries = allResults.Cast<ContentSummary>().ToList();
        var deduplicatedResults = await DeduplicateContentAsync(allSummaries, cancellationToken);
        
        // Sort by relevance (higher ratings first, then by year)
        var sortedResults = deduplicatedResults
            .OrderByDescending(c => c.Rating ?? 0)
            .ThenByDescending(c => c.Year ?? 0)
            .ToList();
        
        return new ContentSearchResult
        {
            Results = sortedResults.Select(s => new ContentData
            {
                Id = s.Id,
                Title = s.Title,
                OriginalTitle = s.OriginalTitle,
                Type = s.Type.ToString().ToLower(),
                ReleaseYear = s.Year,
                Overview = s.Overview,
                Genres = s.Genres,
                PosterUrl = s.ImageUrl,
                Rating = s.Rating.HasValue ? (decimal?)s.Rating.Value : null
            }).ToList(),
            TotalResults = sortedResults.Count(),
            Page = 1,
            PageSize = sortedResults.Count(),
            HasMore = false,
            SearchedAt = DateTime.UtcNow,
            ResponseTime = TimeSpan.FromMilliseconds(searchResults.Sum(sr => sr.ResponseTime.TotalMilliseconds)),
            DataSources = searchResults.SelectMany(sr => sr.DataSources).Distinct().ToList()
        };
    }

    public async Task<StreamingAvailabilityResponse> MergeStreamingAvailabilityAsync(List<StreamingAvailabilityResponse> availabilityResults, CancellationToken cancellationToken = default)
    {
        if (!availabilityResults.Any())
        {
            throw new ArgumentException("No availability results to merge", nameof(availabilityResults));
        }
        
        _logger.LogDebug("Merging streaming availability from {Count} providers", availabilityResults.Count);

        // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
        var first = availabilityResults.FirstOrDefault()
            ?? throw new InvalidOperationException("Expected at least one availability result");
        var allOptions = availabilityResults.SelectMany(ar => ar.StreamingOptions).ToList();
        
        // Deduplicate streaming options
        var uniqueOptions = new Dictionary<string, StreamingOption>();
        foreach (var option in allOptions)
        {
            var key = $"{option.ServiceId}:{option.CountryCode}:{option.Type}";
            
            if (!uniqueOptions.ContainsKey(key) || IsMoreRecentStreamingOption(option, uniqueOptions[key]))
            {
                uniqueOptions[key] = option;
            }
        }
        
        return new StreamingAvailabilityResponse
        {
            ContentId = first.ContentId,
            Title = first.Title,
            Type = first.Type,
            StreamingOptions = uniqueOptions.Values.OrderBy(o => o.ServiceName).ThenBy(o => o.Type).ToList(),
            LastUpdated = availabilityResults.Max(ar => ar.LastUpdated)
        };
    }

    public async Task<List<ContentSummary>> DeduplicateContentAsync(List<ContentSummary> content, CancellationToken cancellationToken = default)
    {
        if (!content.Any()) return content;
        
        _logger.LogDebug("Deduplicating {Count} content items", content.Count);
        
        var uniqueContent = new List<ContentSummary>();
        var processedTitles = new HashSet<string>();
        
        foreach (var item in content)
        {
            var normalizedTitle = $"{NormalizeTitle(item.Title)}:{item.Year}:{item.Type}";
            
            if (!processedTitles.Contains(normalizedTitle))
            {
                // Find potential duplicates
                var duplicates = new List<ContentSummary>();
                foreach (var c in content)
                {
                    if (c != item && await CalculateContentMatchConfidenceAsync(item, c, cancellationToken) > 0.8)
                    {
                        duplicates.Add(c);
                    }
                }
                
                if (duplicates.Any())
                {
                    // Merge data from duplicates
                    var mergedItem = MergeContentSummaries(item, duplicates);
                    uniqueContent.Add(mergedItem);
                    
                    // Mark all duplicates as processed
                    foreach (var duplicate in duplicates)
                    {
                        var dupKey = $"{NormalizeTitle(duplicate.Title)}:{duplicate.Year}:{duplicate.Type}";
                        processedTitles.Add(dupKey);
                    }
                }
                else
                {
                    uniqueContent.Add(item);
                }
                
                processedTitles.Add(normalizedTitle);
            }
        }
        
        _logger.LogDebug("Deduplicated to {Count} unique items", uniqueContent.Count);
        return uniqueContent;
    }

    public async Task<double> CalculateContentMatchConfidenceAsync(ContentSummary content1, ContentSummary content2, CancellationToken cancellationToken = default)
    {
        var score = 0.0;
        var factors = 0;
        
        // Title similarity (most important)
        var titleSimilarity = CalculateStringSimilarity(
            NormalizeTitle(content1.Title), 
            NormalizeTitle(content2.Title));
        score += titleSimilarity * 0.4;
        factors++;
        
        // Original title similarity
        if (!string.IsNullOrEmpty(content1.OriginalTitle) && !string.IsNullOrEmpty(content2.OriginalTitle))
        {
            var originalTitleSimilarity = CalculateStringSimilarity(
                NormalizeTitle(content1.OriginalTitle), 
                NormalizeTitle(content2.OriginalTitle));
            score += originalTitleSimilarity * 0.3;
            factors++;
        }
        
        // Year match (exact match is high score)
        if (content1.Year.HasValue && content2.Year.HasValue)
        {
            var yearDiff = Math.Abs(content1.Year.Value - content2.Year.Value);
            var yearScore = yearDiff == 0 ? 1.0 : (yearDiff == 1 ? 0.8 : (yearDiff <= 2 ? 0.5 : 0.0));
            score += yearScore * 0.2;
            factors++;
        }
        
        // Type match
        if (content1.Type == content2.Type)
        {
            score += 0.1;
        }
        factors++;
        
        return factors > 0 ? score / factors : 0.0;
    }

    public async Task<ContentDetails> EnrichContentDetailsAsync(List<ContentDetails> contentDetails, CancellationToken cancellationToken = default)
    {
        if (!contentDetails.Any())
        {
            throw new ArgumentException("No content details to enrich", nameof(contentDetails));
        }
        
        _logger.LogDebug("Enriching content details from {Count} sources", contentDetails.Count);

        // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
        var primary = contentDetails.FirstOrDefault()
            ?? throw new InvalidOperationException("Expected at least one content detail");
        
        // Merge data from all sources
        foreach (var details in contentDetails.Skip(1))
        {
            // Merge basic info (prefer non-empty values)
            if (string.IsNullOrEmpty(primary.Overview) && !string.IsNullOrEmpty(details.Overview))
                primary.Overview = details.Overview;
                
            if (!primary.ReleaseDate.HasValue && details.ReleaseDate.HasValue)
                primary.ReleaseDate = details.ReleaseDate;
                
            // Merge genres (combine unique)
            primary.Genres = primary.Genres.Union(details.Genres).Distinct().ToList();
            
            // Merge cast (combine unique by name)
            var existingCastNames = primary.Cast.Select(c => c.Name).ToHashSet();
            var newCast = details.Cast.Where(c => !existingCastNames.Contains(c.Name));
            primary.Cast = primary.Cast.Concat(newCast).ToList();
            
            // Merge crew (combine unique by name and job)
            var existingCrewKeys = primary.Crew.Select(c => $"{c.Name}:{c.Job}").ToHashSet();
            var newCrew = details.Crew.Where(c => !existingCrewKeys.Contains($"{c.Name}:{c.Job}"));
            primary.Crew = primary.Crew.Concat(newCrew).ToList();
            
            // Merge data sources
            primary.DataSources = primary.DataSources.Union(details.DataSources).ToList();
            
            // Use best rating (highest vote count)
            if (details.Ratings?.VoteCount > primary.Ratings?.VoteCount)
            {
                primary.Ratings = details.Ratings;
            }
            
            // Use best images (prefer non-empty)
            if (primary.Images == null) primary.Images = new ContentImages();
            if (string.IsNullOrEmpty(primary.Images.PosterUrl) && !string.IsNullOrEmpty(details.Images?.PosterUrl))
                primary.Images.PosterUrl = details.Images.PosterUrl;
            if (string.IsNullOrEmpty(primary.Images.BackdropUrl) && !string.IsNullOrEmpty(details.Images?.BackdropUrl))
                primary.Images.BackdropUrl = details.Images.BackdropUrl;
        }
        
        primary.LastUpdated = DateTime.UtcNow;
        return primary;
    }

    #region Private Helper Methods

    private string NormalizeTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title)) return "";
        return title.Trim();
    }

    private string NormalizeOverview(string overview)
    {
        if (string.IsNullOrWhiteSpace(overview)) return "";
        return overview.Trim();
    }

    private List<string> NormalizeGenres(List<string> genres)
    {
        return genres?.Where(g => !string.IsNullOrWhiteSpace(g))
                    .Select(g => g.Trim())
                    .Distinct()
                    .ToList() ?? new List<string>();
    }

    private string NormalizeImageUrl(string imageUrl, ProviderType providerType)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return "";
        
        // Ensure absolute URL
        if (imageUrl.StartsWith("http")) return imageUrl;
        
        return providerType switch
        {
            ProviderType.ContentMetadata => $"https://image.tmdb.org/t/p/w500{imageUrl}",
            _ => imageUrl
        };
    }

    private decimal? NormalizeRating(decimal? rating)
    {
        if (!rating.HasValue) return null;
        
        // Ensure rating is between 0 and 10
        return Math.Max(0, Math.Min(10, rating.Value));
    }

    private string ExtractLanguage(string originalTitle, string title)
    {
        // Simple heuristic: if titles are different, likely different language
        return originalTitle != title ? "unknown" : "en";
    }

    private TmdbContentType MapToTmdbContentType(ContentType contentType)
    {
        return contentType switch
        {
            ContentType.Movie => TmdbContentType.Movie,
            ContentType.TvSeries => TmdbContentType.TvSeries,
            _ => TmdbContentType.Movie
        };
    }

    private int? TryParseInt(string value)
    {
        return int.TryParse(value, out var result) ? result : null;
    }

    private string ExtractImagePath(string imageUrl)
    {
        if (string.IsNullOrEmpty(imageUrl)) return "";
        
        // Extract path from TMDb URLs
        if (imageUrl.Contains("image.tmdb.org"))
        {
            var pathStart = imageUrl.LastIndexOf('/');
            return pathStart > 0 ? imageUrl.Substring(pathStart) : "";
        }
        
        return imageUrl;
    }

    private List<CastMember> TransformCastMembers(List<ProviderCastMember> providerCast)
    {
        return providerCast?.Select(c => new CastMember
        {
            Name = c.Name,
            Character = c.Character,
            ProfilePath = ExtractImagePath(c.ProfilePath),
            Order = c.Order
        }).ToList() ?? new List<CastMember>();
    }

    private List<CrewMember> TransformCrewMembers(List<ProviderCrewMember> providerCrew)
    {
        return providerCrew?.Select(c => new CrewMember
        {
            Name = c.Name,
            Job = c.Job,
            Department = c.Department,
            ProfilePath = ExtractImagePath(c.ProfilePath)
        }).ToList() ?? new List<CrewMember>();
    }

    private string NormalizeServiceName(string serviceName)
    {
        if (string.IsNullOrWhiteSpace(serviceName)) return "";
        return serviceName.Trim();
    }

    private string NormalizeCountryCode(string countryCode)
    {
        if (string.IsNullOrWhiteSpace(countryCode)) return "US";
        return countryCode.ToUpperInvariant();
    }

    private StreamingType MapStreamingType(string streamingType)
    {
        return streamingType?.ToLowerInvariant() switch
        {
            "subscription" => StreamingType.Subscription,
            "rent" or "rental" => StreamingType.Rental,
            "buy" or "purchase" => StreamingType.Purchase,
            "free" => StreamingType.Free,
            _ => StreamingType.Subscription
        };
    }

    private bool IsMoreRecentStreamingOption(StreamingOption newOption, StreamingOption existingOption)
    {
        return newOption.LastUpdated > existingOption.LastUpdated ||
               (!string.IsNullOrEmpty(newOption.StreamingUrl) && string.IsNullOrEmpty(existingOption.StreamingUrl));
    }

    private ContentSummary MergeContentSummaries(ContentSummary primary, List<ContentSummary> duplicates)
    {
        var merged = new ContentSummary
        {
            Id = primary.Id,
            Title = primary.Title,
            OriginalTitle = primary.OriginalTitle,
            Type = primary.Type,
            Year = primary.Year,
            Overview = primary.Overview,
            Genres = primary.Genres,
            ImageUrl = primary.ImageUrl,
            Rating = primary.Rating,
            RuntimeMinutes = primary.RuntimeMinutes,
            Language = primary.Language,
            AvailableCountries = primary.AvailableCountries,
            DataSources = primary.DataSources.ToList()
        };
        
        // Merge data from duplicates
        foreach (var duplicate in duplicates)
        {
            // Use better rating if available
            if (!merged.Rating.HasValue && duplicate.Rating.HasValue)
                merged.Rating = duplicate.Rating;
                
            // Use better overview if available
            if (string.IsNullOrEmpty(merged.Overview) && !string.IsNullOrEmpty(duplicate.Overview))
                merged.Overview = duplicate.Overview;
                
            // Merge genres
            merged.Genres = merged.Genres.Union(duplicate.Genres).Distinct().ToList();
            
            // Use better image if available
            if (string.IsNullOrEmpty(merged.ImageUrl) && !string.IsNullOrEmpty(duplicate.ImageUrl))
                merged.ImageUrl = duplicate.ImageUrl;
                
            // Merge data sources
            merged.DataSources = merged.DataSources.Union(duplicate.DataSources).ToList();
        }
        
        return merged;
    }

    private double CalculateStringSimilarity(string str1, string str2)
    {
        if (string.IsNullOrEmpty(str1) && string.IsNullOrEmpty(str2)) return 1.0;
        if (string.IsNullOrEmpty(str1) || string.IsNullOrEmpty(str2)) return 0.0;
        
        str1 = str1.ToLowerInvariant();
        str2 = str2.ToLowerInvariant();
        
        if (str1 == str2) return 1.0;
        
        // Simple Levenshtein distance-based similarity
        var distance = CalculateLevenshteinDistance(str1, str2);
        var maxLength = Math.Max(str1.Length, str2.Length);
        
        return 1.0 - (double)distance / maxLength;
    }

    private int CalculateLevenshteinDistance(string source, string target)
    {
        if (source.Length == 0) return target.Length;
        if (target.Length == 0) return source.Length;

        var distance = new int[source.Length + 1, target.Length + 1];

        for (var i = 0; i <= source.Length; i++)
            distance[i, 0] = i;
        for (var j = 0; j <= target.Length; j++)
            distance[0, j] = j;

        for (var i = 1; i <= source.Length; i++)
        {
            for (var j = 1; j <= target.Length; j++)
            {
                var cost = target[j - 1] == source[i - 1] ? 0 : 1;
                distance[i, j] = Math.Min(
                    Math.Min(distance[i - 1, j] + 1, distance[i, j - 1] + 1),
                    distance[i - 1, j - 1] + cost);
            }
        }

        return distance[source.Length, target.Length];
    }

    #endregion
}