using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services.ValidationRules;

/// <summary>
/// Calculates completeness score for ContentMetadata
/// </summary>
public class ContentCompletenessScore : IScoringRule<ContentMetadata>
{
    private readonly ILogger<ContentCompletenessScore> _logger;

    public string Name => "Completeness";
    public string Description => "Measures how complete the content metadata is";
    public double Weight => 0.3;

    public ContentCompletenessScore(ILogger<ContentCompletenessScore> logger)
    {
        _logger = logger;
    }

    public async Task<QualityScoreResult> CalculateScoreAsync(ContentMetadata data)
    {
        try
        {
            var fieldScores = new Dictionary<string, double>();
            var totalFields = 0;
            var completedFields = 0;

            // Essential fields (higher weight)
            var essentialFields = new[]
            {
                (nameof(data.Title), !string.IsNullOrWhiteSpace(data.Title), 3.0),
                (nameof(data.Overview), !string.IsNullOrWhiteSpace(data.Overview), 2.0),
                (nameof(data.ReleaseDate), data.ReleaseDate.HasValue, 2.0),
                (nameof(data.Genres), data.Genres?.Any() == true, 2.0),
                (nameof(data.PosterPath), !string.IsNullOrWhiteSpace(data.PosterPath), 1.5)
            };

            // Important fields
            var importantFields = new[]
            {
                (nameof(data.VoteAverage), data.VoteAverage.HasValue && data.VoteAverage > 0, 1.0),
                (nameof(data.VoteCount), data.VoteCount > 0, 1.0),
                (nameof(data.BackdropPath), !string.IsNullOrWhiteSpace(data.BackdropPath), 1.0),
                (nameof(data.Cast), data.Cast?.Any() == true, 1.0),
                (nameof(data.Crew), data.Crew?.Any() == true, 0.8),
                (nameof(data.ProductionCountries), data.ProductionCountries?.Any() == true, 0.8),
                (nameof(data.OriginalLanguage), !string.IsNullOrWhiteSpace(data.OriginalLanguage), 0.7),
                (nameof(data.Status), !string.IsNullOrWhiteSpace(data.Status), 0.5)
            };

            // Type-specific fields
            var typeSpecificFields = data.Type == TmdbContentType.Movie
                ? new[] { (nameof(data.Runtime), data.Runtime.HasValue && data.Runtime > 0, 1.0) }
                : new[] 
                { 
                    (nameof(data.NumberOfSeasons), data.NumberOfSeasons.HasValue && data.NumberOfSeasons > 0, 1.0),
                    (nameof(data.NumberOfEpisodes), data.NumberOfEpisodes.HasValue && data.NumberOfEpisodes > 0, 0.8)
                };

            // Calculate weighted scores
            double totalWeight = 0;
            double weightedScore = 0;

            foreach (var (fieldName, hasValue, weight) in essentialFields.Concat(importantFields).Concat(typeSpecificFields))
            {
                var fieldScore = hasValue ? 100.0 : 0.0;
                fieldScores[fieldName] = fieldScore;
                
                weightedScore += fieldScore * weight;
                totalWeight += weight;
                
                if (hasValue) completedFields++;
                totalFields++;
            }

            var finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

            return new QualityScoreResult 
            { 
                Value = finalScore,
                Details = fieldScores.ToDictionary(kvp => kvp.Key, kvp => (object)kvp.Value),
                Explanation = $"Completeness: {completedFields}/{totalFields} fields completed ({finalScore:F1}%)"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate completeness score");
            return new QualityScoreResult { Value = 0 };
        }
    }
}

/// <summary>
/// Calculates data freshness score for streaming availability
/// </summary>
public class DataFreshnessScore : IScoringRule<StreamingAvailabilityResponse>
{
    private readonly ILogger<DataFreshnessScore> _logger;

    public string Name => "Freshness";
    public string Description => "Measures how recent the streaming availability data is";
    public double Weight => 0.2;

    public DataFreshnessScore(ILogger<DataFreshnessScore> logger)
    {
        _logger = logger;
    }

    public async Task<QualityScoreResult> CalculateScoreAsync(StreamingAvailabilityResponse data)
    {
        try
        {
            var hoursSinceUpdate = (DateTime.UtcNow - data.LastUpdated).TotalHours;
            
            var score = hoursSinceUpdate switch
            {
                < 1 => 100,      // Very fresh
                < 6 => 95,       // Fresh
                < 24 => 85,      // Good
                < 72 => 70,      // Acceptable
                < 168 => 50,     // Week old - getting stale
                < 720 => 25,     // Month old - stale
                _ => 10          // Very stale
            };

            var explanation = hoursSinceUpdate switch
            {
                < 1 => "Very fresh (< 1 hour old)",
                < 6 => "Fresh (< 6 hours old)", 
                < 24 => "Good (< 1 day old)",
                < 72 => "Acceptable (< 3 days old)",
                < 168 => "Getting stale (< 1 week old)",
                < 720 => "Stale (< 1 month old)",
                _ => "Very stale (> 1 month old)"
            };

            return new QualityScoreResult 
            { 
                Value = score,
                Details = new Dictionary<string, object>
                {
                    { "HoursSinceUpdate", hoursSinceUpdate },
                    { "LastUpdated", data.LastUpdated },
                    { "Age", TimeSpan.FromHours(hoursSinceUpdate).ToString(@"d\.hh\:mm\:ss") }
                },
                Explanation = explanation
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate freshness score");
            return new QualityScoreResult { Value = 0 };
        }
    }
}

/// <summary>
/// Calculates consistency score for content metadata
/// </summary>
public class ContentConsistencyScore : IScoringRule<ContentMetadata>
{
    private readonly ILogger<ContentConsistencyScore> _logger;
    private readonly IDataConsistencyChecker _consistencyChecker;

    public string Name => "Consistency";
    public string Description => "Measures internal data consistency and logical coherence";
    public double Weight => 0.25;

    public ContentConsistencyScore(
        ILogger<ContentConsistencyScore> logger,
        IDataConsistencyChecker consistencyChecker)
    {
        _logger = logger;
        _consistencyChecker = consistencyChecker;
    }

    public async Task<QualityScoreResult> CalculateScoreAsync(ContentMetadata data)
    {
        try
        {
            var consistencyIssues = await _consistencyChecker.CheckConsistencyAsync(data);
            var issueDetails = new Dictionary<string, object>();

            // Note: totalChecks would be used for percentage calculations if needed
            // var totalChecks = 12; // Number of consistency checks we perform
            var criticalIssues = consistencyIssues.Count(i => i.Level == ConsistencyLevel.Critical);
            var majorIssues = consistencyIssues.Count(i => i.Level == ConsistencyLevel.Major);
            var moderateIssues = consistencyIssues.Count(i => i.Level == ConsistencyLevel.Moderate);
            var minorIssues = consistencyIssues.Count(i => i.Level == ConsistencyLevel.Minor);

            // Weight issues by severity
            var penaltyScore = (criticalIssues * 25) + (majorIssues * 15) + (moderateIssues * 8) + (minorIssues * 3);
            var score = Math.Max(0, 100 - penaltyScore);

            issueDetails["CriticalIssues"] = criticalIssues;
            issueDetails["MajorIssues"] = majorIssues;
            issueDetails["ModerateIssues"] = moderateIssues;
            issueDetails["MinorIssues"] = minorIssues;
            issueDetails["TotalIssues"] = consistencyIssues.Count;

            var explanation = consistencyIssues.Count == 0 
                ? "No consistency issues found"
                : $"Found {consistencyIssues.Count} consistency issues (Critical: {criticalIssues}, Major: {majorIssues}, Moderate: {moderateIssues}, Minor: {minorIssues})";

            return new QualityScoreResult 
            { 
                Value = score,
                Details = issueDetails,
                Explanation = explanation
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate consistency score");
            return new QualityScoreResult { Value = 0 };
        }
    }
}

/// <summary>
/// Calculates availability coverage score for streaming data
/// </summary>
public class AvailabilityCoverageScore : IScoringRule<StreamingAvailabilityResponse>
{
    private readonly ILogger<AvailabilityCoverageScore> _logger;

    public string Name => "Coverage";
    public string Description => "Measures the breadth of streaming availability across services and regions";
    public double Weight => 0.3;

    public AvailabilityCoverageScore(ILogger<AvailabilityCoverageScore> logger)
    {
        _logger = logger;
    }

    public async Task<QualityScoreResult> CalculateScoreAsync(StreamingAvailabilityResponse data)
    {
        try
        {
            if (data.StreamingOptions?.Any() != true)
            {
                return new QualityScoreResult 
                { 
                    Value = 0,
                    Explanation = "No streaming options available"
                };
            }

            var details = new Dictionary<string, object>();
            
            // Count unique services
            var uniqueServices = data.StreamingOptions.Select(o => o.ServiceId).Distinct().Count();
            details["UniqueServices"] = uniqueServices;
            
            // Count unique countries
            var uniqueCountries = data.StreamingOptions.Select(o => o.CountryCode).Distinct().Count();
            details["UniqueCountries"] = uniqueCountries;
            
            // Count streaming types
            var streamingTypes = data.StreamingOptions.Select(o => o.Type).Distinct().Count();
            details["StreamingTypes"] = streamingTypes;
            
            // Check for major streaming services
            var majorServices = new[] { "netflix", "amazon", "disney", "hulu", "hbo", "apple", "paramount" };
            var majorServicesCount = data.StreamingOptions.Count(o => 
                majorServices.Any(major => o.ServiceId.Contains(major, StringComparison.OrdinalIgnoreCase)));
            details["MajorServicesCount"] = majorServicesCount;
            
            // Check for free options
            var freeOptionsCount = data.StreamingOptions.Count(o => o.Type == StreamingType.Free);
            details["FreeOptionsCount"] = freeOptionsCount;
            
            // Calculate score
            var serviceScore = Math.Min(100, uniqueServices * 15); // Up to 100 for 7+ services
            var countryScore = Math.Min(100, uniqueCountries * 10); // Up to 100 for 10+ countries  
            var typeScore = streamingTypes * 25; // 25 points per streaming type
            var majorServiceBonus = majorServicesCount * 5; // Bonus for major services
            var freeBonus = freeOptionsCount > 0 ? 10 : 0; // Bonus for free options

            var totalScore = Math.Min(100, (serviceScore + countryScore + typeScore + majorServiceBonus + freeBonus) / 3);

            var explanation = $"Coverage across {uniqueServices} services, {uniqueCountries} countries, {streamingTypes} types";
            if (majorServicesCount > 0)
                explanation += $", {majorServicesCount} major services";
            if (freeOptionsCount > 0)
                explanation += $", {freeOptionsCount} free options";

            return new QualityScoreResult 
            { 
                Value = totalScore,
                Details = details,
                Explanation = explanation
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate coverage score");
            return new QualityScoreResult { Value = 0 };
        }
    }
}

/// <summary>
/// Calculates accuracy score based on validation results
/// </summary>
public class DataAccuracyScore : IScoringRule<ContentMetadata>
{
    private readonly ILogger<DataAccuracyScore> _logger;

    public string Name => "Accuracy";
    public string Description => "Measures data accuracy based on validation checks";
    public double Weight => 0.2;

    public DataAccuracyScore(ILogger<DataAccuracyScore> logger)
    {
        _logger = logger;
    }

    public async Task<QualityScoreResult> CalculateScoreAsync(ContentMetadata data)
    {
        try
        {
            var details = new Dictionary<string, object>();
            var accuracyChecks = new List<(string check, bool passed, double weight)>();

            // Title accuracy checks
            var titleAccurate = !string.IsNullOrWhiteSpace(data.Title) && 
                               data.Title.Length >= 1 && 
                               data.Title.Length <= 500;
            accuracyChecks.Add(("Title Format", titleAccurate, 2.0));

            // Date accuracy checks
            var dateAccurate = !data.ReleaseDate.HasValue ||
                              (data.ReleaseDate.Value >= new DateTime(1888, 1, 1) && 
                               data.ReleaseDate.Value <= DateTime.UtcNow.AddYears(5));
            accuracyChecks.Add(("Release Date Range", dateAccurate, 1.5));

            // Rating accuracy checks
            var ratingAccurate = !data.VoteAverage.HasValue ||
                               (data.VoteAverage.Value >= 0 && data.VoteAverage.Value <= 10);
            accuracyChecks.Add(("Rating Range", ratingAccurate, 1.5));

            // Vote consistency
            var voteConsistent = !data.VoteAverage.HasValue || 
                               data.VoteCount > 0 || 
                               data.VoteAverage.Value == 0;
            accuracyChecks.Add(("Vote Consistency", voteConsistent, 1.0));

            // Runtime accuracy (for movies)
            var runtimeAccurate = data.Type != TmdbContentType.Movie ||
                                !data.Runtime.HasValue ||
                                (data.Runtime.Value > 0 && data.Runtime.Value <= 1000);
            accuracyChecks.Add(("Runtime Range", runtimeAccurate, 1.0));

            // Language code format
            var languageAccurate = string.IsNullOrEmpty(data.OriginalLanguage) ||
                                 data.OriginalLanguage.Length == 2;
            accuracyChecks.Add(("Language Format", languageAccurate, 0.8));

            // Path format checks
            var pathsAccurate = (string.IsNullOrEmpty(data.PosterPath) || data.PosterPath.StartsWith("/")) &&
                              (string.IsNullOrEmpty(data.BackdropPath) || data.BackdropPath.StartsWith("/"));
            accuracyChecks.Add(("Path Formats", pathsAccurate, 0.7));

            // Calculate weighted accuracy score
            var totalWeight = accuracyChecks.Sum(c => c.weight);
            var weightedScore = accuracyChecks.Sum(c => c.passed ? c.weight * 100 : 0);
            var accuracy = totalWeight > 0 ? weightedScore / totalWeight : 100;

            // Add details
            foreach (var (check, passed, weight) in accuracyChecks)
            {
                dynamic obj = new System.Dynamic.ExpandoObject();
                obj.Passed = passed;
                obj.Weight = weight;
                details[check] = obj;
            }

            var passedChecks = accuracyChecks.Count(c => c.passed);
            var totalChecks = accuracyChecks.Count;

            return new QualityScoreResult 
            { 
                Value = accuracy,
                Details = details,
                Explanation = $"Accuracy: {passedChecks}/{totalChecks} checks passed ({accuracy:F1}%)"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate accuracy score");
            return new QualityScoreResult { Value = 0 };
        }
    }
}

/// <summary>
/// Calculates richness score for streaming availability
/// </summary>
public class StreamingRichnessScore : IScoringRule<StreamingAvailabilityResponse>
{
    private readonly ILogger<StreamingRichnessScore> _logger;

    public string Name => "Richness";
    public string Description => "Measures the richness of streaming information (quality, languages, etc.)";
    public double Weight => 0.15;

    public StreamingRichnessScore(ILogger<StreamingRichnessScore> logger)
    {
        _logger = logger;
    }

    public async Task<QualityScoreResult> CalculateScoreAsync(StreamingAvailabilityResponse data)
    {
        try
        {
            if (data.StreamingOptions?.Any() != true)
            {
                return new QualityScoreResult 
                { 
                    Value = 0,
                    Explanation = "No streaming options to evaluate"
                };
            }

            var details = new Dictionary<string, object>();
            var totalOptions = data.StreamingOptions.Count;
            var richFeatureCount = 0;

            // Video quality information
            var optionsWithQuality = data.StreamingOptions.Count(o => o.VideoQuality?.Any() == true);
            details["OptionsWithQuality"] = optionsWithQuality;
            if (optionsWithQuality > 0) richFeatureCount++;

            // Audio language information  
            var optionsWithAudio = data.StreamingOptions.Count(o => o.AudioLanguages?.Any() == true);
            details["OptionsWithAudio"] = optionsWithAudio;
            if (optionsWithAudio > 0) richFeatureCount++;

            // Subtitle information
            var optionsWithSubtitles = data.StreamingOptions.Count(o => o.SubtitleLanguages?.Any() == true);
            details["OptionsWithSubtitles"] = optionsWithSubtitles;
            if (optionsWithSubtitles > 0) richFeatureCount++;

            // Pricing information (for paid options)
            var paidOptions = data.StreamingOptions.Where(o => o.Type == StreamingType.Rental || o.Type == StreamingType.Purchase);
            var paidOptionsWithPrice = paidOptions.Count(o => o.Price.HasValue);
            details["PaidOptionsWithPrice"] = paidOptionsWithPrice;
            if (paidOptions.Any() && paidOptionsWithPrice > 0) richFeatureCount++;

            // Streaming URLs
            var optionsWithUrls = data.StreamingOptions.Count(o => !string.IsNullOrWhiteSpace(o.StreamingUrl));
            details["OptionsWithUrls"] = optionsWithUrls;
            if (optionsWithUrls > 0) richFeatureCount++;

            // Expiration dates
            var optionsWithExpiration = data.StreamingOptions.Count(o => o.ExpiresAt.HasValue);
            details["OptionsWithExpiration"] = optionsWithExpiration;
            if (optionsWithExpiration > 0) richFeatureCount++;

            // Calculate richness score
            var qualityRichness = optionsWithQuality * 100.0 / totalOptions;
            var audioRichness = optionsWithAudio * 100.0 / totalOptions;  
            var subtitleRichness = optionsWithSubtitles * 100.0 / totalOptions;
            var urlRichness = optionsWithUrls * 100.0 / totalOptions;

            var averageRichness = (qualityRichness + audioRichness + subtitleRichness + urlRichness) / 4;
            var featureBonus = richFeatureCount * 5; // Bonus for having diverse rich features
            
            var totalScore = Math.Min(100, averageRichness + featureBonus);

            return new QualityScoreResult 
            { 
                Value = totalScore,
                Details = details,
                Explanation = $"Richness: {richFeatureCount}/6 feature types present, avg completeness {averageRichness:F1}%"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate richness score");
            return new QualityScoreResult { Value = 0 };
        }
    }
}