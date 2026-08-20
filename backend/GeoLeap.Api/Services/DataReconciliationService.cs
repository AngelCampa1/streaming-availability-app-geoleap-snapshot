using System.Diagnostics;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for reconciling conflicting data from multiple sources
/// </summary>
public class DataReconciliationService : IDataReconciliationService
{
    private readonly ILogger<DataReconciliationService> _logger;
    private readonly List<IReconciliationStrategy<ContentMetadata>> _contentStrategies;
    private readonly List<IReconciliationStrategy<StreamingAvailabilityResponse>> _streamingStrategies;

    public DataReconciliationService(ILogger<DataReconciliationService> logger)
    {
        _logger = logger;
        _contentStrategies = new List<IReconciliationStrategy<ContentMetadata>>();
        _streamingStrategies = new List<IReconciliationStrategy<StreamingAvailabilityResponse>>();
    }

    public async Task<ReconciliationResult> ReconcileContentMetadataAsync(List<ContentMetadata> conflictingData)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            if (conflictingData == null || !conflictingData.Any())
            {
                return new ReconciliationResult { Success = false };
            }

            if (conflictingData.Count == 1)
            {
                return new ReconciliationResult 
                { 
                    Success = true, 
                    ReconciledData = conflictingData[0],
                    SourceCount = 1,
                    ReconciliationStrategy = "NoConflict"
                };
            }

            _logger.LogDebug("Starting content metadata reconciliation for {SourceCount} conflicting sources", 
                conflictingData.Count);

            // Try registered strategies first
            var applicableStrategy = _contentStrategies
                .Where(s => s.CanReconcile(conflictingData))
                .OrderByDescending(s => s.Priority)
                .FirstOrDefault();

            ReconciliationResult result;
            
            if (applicableStrategy != null)
            {
                result = await applicableStrategy.ReconcileAsync(conflictingData);
                result.ReconciliationStrategy = applicableStrategy.Name;
            }
            else
            {
                // Use default reconciliation logic
                result = await ReconcileContentMetadataDefault(conflictingData);
                result.ReconciliationStrategy = "Default";
            }

            stopwatch.Stop();
            result.ExecutionTime = stopwatch.Elapsed;
            result.SourceCount = conflictingData.Count;

            _logger.LogInformation("Content metadata reconciliation completed in {Duration}ms: Success={Success}, Conflicts={ConflictCount}",
                stopwatch.ElapsedMilliseconds, result.Success, result.Conflicts.Count);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Content metadata reconciliation failed");
            stopwatch.Stop();
            return new ReconciliationResult 
            { 
                Success = false,
                ExecutionTime = stopwatch.Elapsed
            };
        }
    }

    public async Task<ReconciliationResult> ReconcileStreamingAvailabilityAsync(List<StreamingAvailabilityResponse> conflictingData)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            if (conflictingData == null || !conflictingData.Any())
            {
                return new ReconciliationResult { Success = false };
            }

            if (conflictingData.Count == 1)
            {
                return new ReconciliationResult 
                { 
                    Success = true, 
                    ReconciledData = conflictingData[0],
                    SourceCount = 1,
                    ReconciliationStrategy = "NoConflict"
                };
            }

            _logger.LogDebug("Starting streaming availability reconciliation for {SourceCount} conflicting sources", 
                conflictingData.Count);

            // Try registered strategies first
            var applicableStrategy = _streamingStrategies
                .Where(s => s.CanReconcile(conflictingData))
                .OrderByDescending(s => s.Priority)
                .FirstOrDefault();

            ReconciliationResult result;
            
            if (applicableStrategy != null)
            {
                result = await applicableStrategy.ReconcileAsync(conflictingData);
                result.ReconciliationStrategy = applicableStrategy.Name;
            }
            else
            {
                // Use default reconciliation logic
                result = await ReconcileStreamingAvailabilityDefault(conflictingData);
                result.ReconciliationStrategy = "Default";
            }

            stopwatch.Stop();
            result.ExecutionTime = stopwatch.Elapsed;
            result.SourceCount = conflictingData.Count;

            _logger.LogInformation("Streaming availability reconciliation completed in {Duration}ms: Success={Success}, Conflicts={ConflictCount}",
                stopwatch.ElapsedMilliseconds, result.Success, result.Conflicts.Count);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Streaming availability reconciliation failed");
            stopwatch.Stop();
            return new ReconciliationResult 
            { 
                Success = false,
                ExecutionTime = stopwatch.Elapsed
            };
        }
    }

    public async Task RegisterReconciliationStrategyAsync<T>(IReconciliationStrategy<T> strategy) where T : class
    {
        switch (strategy)
        {
            case IReconciliationStrategy<ContentMetadata> contentStrategy:
                if (!_contentStrategies.Contains(contentStrategy))
                {
                    _contentStrategies.Add(contentStrategy);
                    _logger.LogInformation("Registered content reconciliation strategy: {StrategyName} (Priority: {Priority})",
                        contentStrategy.Name, contentStrategy.Priority);
                }
                break;
                
            case IReconciliationStrategy<StreamingAvailabilityResponse> streamingStrategy:
                if (!_streamingStrategies.Contains(streamingStrategy))
                {
                    _streamingStrategies.Add(streamingStrategy);
                    _logger.LogInformation("Registered streaming reconciliation strategy: {StrategyName} (Priority: {Priority})",
                        streamingStrategy.Name, streamingStrategy.Priority);
                }
                break;
                
            default:
                _logger.LogWarning("Unknown reconciliation strategy type: {StrategyType}", typeof(T).Name);
                break;
        }
    }

    private async Task<ReconciliationResult> ReconcileContentMetadataDefault(List<ContentMetadata> conflictingData)
    {
        var reconciled = new ContentMetadata();
        var conflicts = new List<DataConflict>();

        // Basic information reconciliation
        reconciled.TmdbId = GetMostFrequentValue(conflictingData.Select(d => d.TmdbId).ToList(), conflicts, "TmdbId");
        reconciled.Type = GetMostFrequentValue(conflictingData.Select(d => d.Type).ToList(), conflicts, "Type");
        
        // Title reconciliation - prefer non-empty, most frequent
        var titles = conflictingData.Select(d => d.Title).Where(t => !string.IsNullOrWhiteSpace(t)).ToList();
        reconciled.Title = GetMostFrequentStringValue(titles, conflicts, "Title");
        
        // Original title reconciliation
        var originalTitles = conflictingData.Select(d => d.OriginalTitle).Where(t => !string.IsNullOrWhiteSpace(t)).ToList();
        reconciled.OriginalTitle = GetMostFrequentStringValue(originalTitles, conflicts, "OriginalTitle");

        // Overview - prefer longest non-empty description
        reconciled.Overview = GetLongestStringValue(conflictingData.Select(d => d.Overview).ToList());

        // Dates - prefer most recent non-null date (assuming more recent data is more accurate)
        reconciled.ReleaseDate = GetMostRecentDateValue(conflictingData.Select(d => d.ReleaseDate).ToList());

        // Ratings - use weighted average if multiple sources, prefer higher vote count sources
        reconciled.VoteAverage = CalculateWeightedAverage(conflictingData, d => d.VoteAverage, d => d.VoteCount);
        reconciled.VoteCount = conflictingData.Sum(d => d.VoteCount); // Sum all vote counts

        // Popularity - use maximum (assuming it represents peak popularity)
        reconciled.Popularity = conflictingData.Where(d => d.Popularity.HasValue).Max(d => d.Popularity);

        // Images - prefer non-empty paths
        reconciled.PosterPath = GetFirstNonEmptyStringValue(conflictingData.Select(d => d.PosterPath).ToList());
        reconciled.BackdropPath = GetFirstNonEmptyStringValue(conflictingData.Select(d => d.BackdropPath).ToList());

        // Collections - merge and deduplicate
        reconciled.Genres = MergeStringLists(conflictingData.SelectMany(d => d.Genres ?? new List<string>()).ToList());
        reconciled.ProductionCountries = MergeStringLists(conflictingData.SelectMany(d => d.ProductionCountries ?? new List<string>()).ToList());
        reconciled.OriginalLanguages = MergeStringLists(conflictingData.SelectMany(d => d.OriginalLanguages ?? new List<string>()).ToList());

        // Cast and crew - merge with deduplication and ordering
        reconciled.Cast = MergeCastInformation(conflictingData.SelectMany(d => d.Cast ?? new List<CastMember>()).ToList());
        reconciled.Crew = MergeCrewInformation(conflictingData.SelectMany(d => d.Crew ?? new List<CrewMember>()).ToList());

        // Type-specific fields
        if (reconciled.Type == TmdbContentType.Movie)
        {
            reconciled.Runtime = GetAverageValue(conflictingData.Select(d => d.Runtime).ToList());
            reconciled.Budget = GetAverageValue(conflictingData.Select(d => d.Budget).ToList());
            reconciled.Revenue = GetAverageValue(conflictingData.Select(d => d.Revenue).ToList());
        }
        else if (reconciled.Type == TmdbContentType.TvSeries)
        {
            reconciled.NumberOfSeasons = GetMaxValue(conflictingData.Select(d => d.NumberOfSeasons).ToList());
            reconciled.NumberOfEpisodes = GetMaxValue(conflictingData.Select(d => d.NumberOfEpisodes).ToList());
        }

        // String fields - prefer non-empty values
        reconciled.Status = GetFirstNonEmptyStringValue(conflictingData.Select(d => d.Status).ToList());
        reconciled.OriginalLanguage = GetFirstNonEmptyStringValue(conflictingData.Select(d => d.OriginalLanguage).ToList());
        reconciled.Tagline = GetFirstNonEmptyStringValue(conflictingData.Select(d => d.Tagline).ToList());
        reconciled.Homepage = GetFirstNonEmptyStringValue(conflictingData.Select(d => d.Homepage).ToList());

        // Boolean fields - use majority vote
        var adultVotes = conflictingData.Select(d => d.Adult).ToList();
        reconciled.Adult = adultVotes.Count(a => a) > adultVotes.Count(a => !a);

        // External IDs - merge all
        reconciled.ExternalIds = MergeExternalIds(conflictingData.SelectMany(d => d.ExternalIds ?? new List<TmdbExternalId>()).ToList());

        var confidenceScore = CalculateConfidenceScore(conflicts, conflictingData.Count);

        return new ReconciliationResult
        {
            Success = true,
            ReconciledData = reconciled,
            Conflicts = conflicts,
            ConfidenceScore = confidenceScore
        };
    }

    private async Task<ReconciliationResult> ReconcileStreamingAvailabilityDefault(List<StreamingAvailabilityResponse> conflictingData)
    {
        var reconciled = new StreamingAvailabilityResponse();
        var conflicts = new List<DataConflict>();

        // Basic information
        var contentIds = conflictingData.Select(d => d.ContentId).Where(id => !string.IsNullOrWhiteSpace(id)).ToList();
        reconciled.ContentId = GetMostFrequentStringValue(contentIds, conflicts, "ContentId");

        var titles = conflictingData.Select(d => d.Title).Where(t => !string.IsNullOrWhiteSpace(t)).ToList();
        reconciled.Title = GetMostFrequentStringValue(titles, conflicts, "Title");

        reconciled.Type = GetMostFrequentValue(conflictingData.Select(d => d.Type).ToList(), conflicts, "Type");

        // Use most recent update time
        reconciled.LastUpdated = conflictingData.Max(d => d.LastUpdated);

        // Merge streaming options from all sources
        var allStreamingOptions = conflictingData
            .SelectMany(d => d.StreamingOptions ?? new List<StreamingOption>())
            .ToList();

        reconciled.StreamingOptions = MergeStreamingOptions(allStreamingOptions, conflicts);

        var confidenceScore = CalculateConfidenceScore(conflicts, conflictingData.Count);

        return new ReconciliationResult
        {
            Success = true,
            ReconciledData = reconciled,
            Conflicts = conflicts,
            ConfidenceScore = confidenceScore
        };
    }

    // Helper methods for reconciliation

    private T GetMostFrequentValue<T>(List<T> values, List<DataConflict> conflicts, string fieldName)
    {
        var nonNullValues = values.Where(v => v != null).ToList();
        if (!nonNullValues.Any()) return default(T);

        var groups = nonNullValues.GroupBy(v => v).ToList();
        
        if (groups.Count > 1)
        {
            conflicts.Add(new DataConflict
            {
                FieldName = fieldName,
                ConflictingValues = groups.Select(g => g.Key?.ToString() ?? "null").ToList(),
                ResolutionStrategy = "MostFrequent",
                DataSources = groups.SelectMany(g => g.Select(_ => "Source")).ToList()
            });
        }

        // FIXED: Week 1 Day 3 - Use FirstOrDefault with fallback to prevent exceptions
        // FIXED: Week 1 Day 5 - Cannot use ? operator on generic T (makes it nullable), check for null explicitly
        var mostFrequentGroup = groups.OrderByDescending(g => g.Count()).FirstOrDefault();
        if (mostFrequentGroup != null)
            return mostFrequentGroup.Key;

        // Return default value if no groups found
        return default(T);
    }

    private string GetMostFrequentStringValue(List<string> values, List<DataConflict> conflicts, string fieldName)
    {
        var nonEmptyValues = values.Where(v => !string.IsNullOrWhiteSpace(v)).ToList();
        if (!nonEmptyValues.Any()) return string.Empty;

        var groups = nonEmptyValues.GroupBy(v => v, StringComparer.OrdinalIgnoreCase).ToList();
        
        if (groups.Count > 1)
        {
            // FIXED: Week 1 Day 3 - Use FirstOrDefault with fallback to prevent exceptions
            var mostFrequent = groups.OrderByDescending(g => g.Count()).FirstOrDefault();
            var firstGroup = groups.FirstOrDefault();

            conflicts.Add(new DataConflict
            {
                FieldName = fieldName,
                ConflictingValues = groups.Select(g => g.Key).ToList(),
                ResolutionStrategy = "MostFrequent",
                ResolvedValue = mostFrequent?.Key ?? string.Empty,
                ConfidenceLevel = firstGroup != null ? (double)firstGroup.Count() / nonEmptyValues.Count : 0
            });
        }

        // FIXED: Week 1 Day 3 - Use FirstOrDefault with fallback
        return groups.OrderByDescending(g => g.Count()).FirstOrDefault()?.Key ?? string.Empty;
    }

    private string GetLongestStringValue(List<string?> values)
    {
        return values
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .OrderByDescending(v => v!.Length)
            .FirstOrDefault() ?? string.Empty;
    }

    private string GetFirstNonEmptyStringValue(List<string?> values)
    {
        return values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? string.Empty;
    }

    private DateTime? GetMostRecentDateValue(List<DateTime?> values)
    {
        return values.Where(v => v.HasValue).Max();
    }

    private double? CalculateWeightedAverage(List<ContentMetadata> data, Func<ContentMetadata, double?> valueSelector, Func<ContentMetadata, int> weightSelector)
    {
        var validItems = data.Where(d => valueSelector(d).HasValue && weightSelector(d) > 0).ToList();
        if (!validItems.Any()) return null;

        var totalWeight = validItems.Sum(d => weightSelector(d));
        var weightedSum = validItems.Sum(d => valueSelector(d)!.Value * weightSelector(d));

        return totalWeight > 0 ? weightedSum / totalWeight : null;
    }

    private T? GetAverageValue<T>(List<T?> values) where T : struct
    {
        var validValues = values.Where(v => v.HasValue).Select(v => v!.Value).ToList();
        if (!validValues.Any()) return null;

        if (typeof(T) == typeof(int))
        {
            var intValues = validValues.Cast<int>().ToList();
            return (T)(object)(intValues.Sum() / intValues.Count);
        }
        
        if (typeof(T) == typeof(long))
        {
            var longValues = validValues.Cast<long>().ToList();
            return (T)(object)(longValues.Sum() / longValues.Count);
        }
        
        if (typeof(T) == typeof(double))
        {
            var doubleValues = validValues.Cast<double>().ToList();
            return (T)(object)(doubleValues.Sum() / doubleValues.Count);
        }

        // FIXED: Week 1 Day 3 - Use FirstOrDefault with fallback for other types
        return validValues.FirstOrDefault();
    }

    private T? GetMaxValue<T>(List<T?> values) where T : struct, IComparable<T>
    {
        return values.Where(v => v.HasValue).Max();
    }

    private List<string> MergeStringLists(List<string> allItems)
    {
        return allItems
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private List<CastMember> MergeCastInformation(List<CastMember> allCast)
    {
        // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
        return allCast
            .GroupBy(c => c.Name, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.OrderBy(c => c.Order).FirstOrDefault())
            .Where(c => c != null) // Remove nulls
            .OrderBy(c => c!.Order)
            .Take(20) // Limit to top 20 cast members
            .ToList()!;
    }

    private List<CrewMember> MergeCrewInformation(List<CrewMember> allCrew)
    {
        // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
        return allCrew
            .GroupBy(c => $"{c.Name?.ToLowerInvariant()}:{c.Job?.ToLowerInvariant()}")
            .Select(g => g.FirstOrDefault())
            .Where(c => c != null) // Remove nulls
            .Take(50) // Limit crew size
            .ToList()!;
    }

    private List<TmdbExternalId> MergeExternalIds(List<TmdbExternalId> allIds)
    {
        // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
        return allIds
            .GroupBy(id => id.Source, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.FirstOrDefault())
            .Where(id => id != null) // Remove nulls
            .ToList()!;
    }

    private List<StreamingOption> MergeStreamingOptions(List<StreamingOption> allOptions, List<DataConflict> conflicts)
    {
        // Group by service, country, and type to identify duplicates
        var grouped = allOptions
            .GroupBy(o => new { o.ServiceId, o.CountryCode, o.Type })
            .ToList();

        var mergedOptions = new List<StreamingOption>();

        foreach (var group in grouped)
        {
            if (group.Count() == 1)
            {
                // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
                var single = group.FirstOrDefault();
                if (single != null)
                {
                    mergedOptions.Add(single);
                }
            }
            else
            {
                // Merge conflicting options
                var merged = MergeConflictingStreamingOptions(group.ToList(), conflicts);
                mergedOptions.Add(merged);
            }
        }

        return mergedOptions.OrderBy(o => o.ServiceName).ThenBy(o => o.CountryCode).ToList();
    }

    private StreamingOption MergeConflictingStreamingOptions(List<StreamingOption> options, List<DataConflict> conflicts)
    {
        // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
        var firstOption = options.FirstOrDefault() ?? new StreamingOption();

        var merged = new StreamingOption
        {
            ServiceId = firstOption.ServiceId,
            ServiceName = firstOption.ServiceName,
            CountryCode = firstOption.CountryCode,
            Type = firstOption.Type
        };

        // Country name - prefer non-empty
        merged.CountryName = options.FirstOrDefault(o => !string.IsNullOrWhiteSpace(o.CountryName))?.CountryName ?? string.Empty;

        // Price - use average for consistency
        var prices = options.Where(o => o.Price.HasValue && o.Price.Value > 0).Select(o => o.Price.Value).ToList();
        if (prices.Any())
        {
            merged.Price = prices.Average();
            if (prices.Distinct().Count() > 1)
            {
                conflicts.Add(new DataConflict
                {
                    FieldName = $"Price_{merged.ServiceId}_{merged.CountryCode}",
                    ConflictingValues = prices.Select(p => p.ToString("C")).ToList(),
                    ResolutionStrategy = "Average",
                    ResolvedValue = merged.Price?.ToString("C")
                });
            }
        }

        // Currency - most frequent
        var currencies = options.Where(o => !string.IsNullOrWhiteSpace(o.Currency)).Select(o => o.Currency).ToList();
        merged.Currency = currencies.GroupBy(c => c, StringComparer.OrdinalIgnoreCase).OrderByDescending(g => g.Count()).FirstOrDefault()?.Key ?? string.Empty;

        // URL - prefer non-empty
        merged.StreamingUrl = options.FirstOrDefault(o => !string.IsNullOrWhiteSpace(o.StreamingUrl))?.StreamingUrl ?? string.Empty;

        // Quality, languages - merge all unique values
        merged.VideoQuality = options.SelectMany(o => o.VideoQuality ?? new List<string>()).Distinct().ToList();
        merged.AudioLanguages = options.SelectMany(o => o.AudioLanguages ?? new List<string>()).Distinct().ToList();
        merged.SubtitleLanguages = options.SelectMany(o => o.SubtitleLanguages ?? new List<string>()).Distinct().ToList();

        // Expiration - use earliest non-null date (most conservative)
        var expirationDates = options.Where(o => o.ExpiresAt.HasValue).Select(o => o.ExpiresAt.Value).ToList();
        merged.ExpiresAt = expirationDates.Any() ? expirationDates.Min() : null;

        // Last updated - use most recent
        merged.LastUpdated = options.Max(o => o.LastUpdated);

        return merged;
    }

    private double CalculateConfidenceScore(List<DataConflict> conflicts, int sourceCount)
    {
        if (sourceCount <= 1) return 1.0;

        // Base confidence starts at 100%
        var baseConfidence = 100.0;
        
        // Reduce confidence based on number and severity of conflicts
        var conflictPenalty = conflicts.Count * (100.0 / (sourceCount * 10)); // Max 10% penalty per conflict
        
        // Additional penalty for critical conflicts
        var criticalConflicts = conflicts.Count(c => c.FieldName.Contains("Id") || c.FieldName.Contains("Title"));
        var criticalPenalty = criticalConflicts * 15.0;
        
        var finalConfidence = Math.Max(0, baseConfidence - conflictPenalty - criticalPenalty);
        
        return finalConfidence / 100.0; // Return as 0-1 scale
    }
}