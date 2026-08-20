using System.Diagnostics;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for enriching incomplete data
/// </summary>
public class DataEnrichmentService : IDataEnrichmentService
{
    private readonly List<IDataEnricher> _enrichers;
    private readonly ILogger<DataEnrichmentService> _logger;

    public DataEnrichmentService(ILogger<DataEnrichmentService> logger)
    {
        _enrichers = new List<IDataEnricher>();
        _logger = logger;
    }

    public async Task<EnrichmentResult> EnrichContentMetadataAsync(ContentMetadata data)
    {
        var stopwatch = Stopwatch.StartNew();
        var result = new EnrichmentResult 
        { 
            OriginalData = data, 
            EnrichedData = CloneContentMetadata(data) 
        };

        try
        {
            var enrichedData = result.EnrichedData as ContentMetadata;
            if (enrichedData == null)
            {
                result.Success = false;
                result.Issues.Add("Failed to clone original data");
                return result;
            }

            var applicableEnrichers = _enrichers
                .Where(e => e.CanEnrich<ContentMetadata>())
                .OrderByDescending(e => e.Priority)
                .ToList();

            _logger.LogDebug("Starting enrichment for ContentMetadata with {EnricherCount} enrichers", 
                applicableEnrichers.Count);

            foreach (var enricher in applicableEnrichers)
            {
                try
                {
                    var enrichmentApplied = await enricher.EnrichAsync(enrichedData);
                    if (enrichmentApplied)
                    {
                        result.EnrichmentSteps.Add(enricher.Name);
                        _logger.LogDebug("Applied enrichment: {EnricherName}", enricher.Name);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Enrichment failed with {EnricherType}", enricher.GetType().Name);
                    result.Issues.Add($"Enricher '{enricher.Name}' failed: {ex.Message}");
                }
            }

            stopwatch.Stop();
            result.ExecutionTime = stopwatch.Elapsed;
            result.Success = result.EnrichmentSteps.Any();
            
            if (result.Success)
            {
                _logger.LogInformation("Content metadata enrichment completed in {Duration}ms with {StepCount} steps applied",
                    stopwatch.ElapsedMilliseconds, result.EnrichmentSteps.Count);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Content metadata enrichment failed");
            stopwatch.Stop();
            result.Success = false;
            result.ExecutionTime = stopwatch.Elapsed;
            result.Issues.Add($"Enrichment failed: {ex.Message}");
            return result;
        }
    }

    public async Task<EnrichmentResult> EnrichStreamingAvailabilityAsync(StreamingAvailabilityResponse data)
    {
        var stopwatch = Stopwatch.StartNew();
        var result = new EnrichmentResult 
        { 
            OriginalData = data, 
            EnrichedData = CloneStreamingAvailability(data) 
        };

        try
        {
            var enrichedData = result.EnrichedData as StreamingAvailabilityResponse;
            if (enrichedData == null)
            {
                result.Success = false;
                result.Issues.Add("Failed to clone original data");
                return result;
            }

            var applicableEnrichers = _enrichers
                .Where(e => e.CanEnrich<StreamingAvailabilityResponse>())
                .OrderByDescending(e => e.Priority)
                .ToList();

            _logger.LogDebug("Starting enrichment for StreamingAvailabilityResponse with {EnricherCount} enrichers", 
                applicableEnrichers.Count);

            foreach (var enricher in applicableEnrichers)
            {
                try
                {
                    var enrichmentApplied = await enricher.EnrichAsync(enrichedData);
                    if (enrichmentApplied)
                    {
                        result.EnrichmentSteps.Add(enricher.Name);
                        _logger.LogDebug("Applied enrichment: {EnricherName}", enricher.Name);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Enrichment failed with {EnricherType}", enricher.GetType().Name);
                    result.Issues.Add($"Enricher '{enricher.Name}' failed: {ex.Message}");
                }
            }

            stopwatch.Stop();
            result.ExecutionTime = stopwatch.Elapsed;
            result.Success = result.EnrichmentSteps.Any();

            if (result.Success)
            {
                _logger.LogInformation("Streaming availability enrichment completed in {Duration}ms with {StepCount} steps applied",
                    stopwatch.ElapsedMilliseconds, result.EnrichmentSteps.Count);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Streaming availability enrichment failed");
            stopwatch.Stop();
            result.Success = false;
            result.ExecutionTime = stopwatch.Elapsed;
            result.Issues.Add($"Enrichment failed: {ex.Message}");
            return result;
        }
    }

    public async Task RegisterEnricherAsync(IDataEnricher enricher)
    {
        if (!_enrichers.Contains(enricher))
        {
            _enrichers.Add(enricher);
            _logger.LogInformation("Registered data enricher: {EnricherName} (Priority: {Priority})", 
                enricher.Name, enricher.Priority);
        }
    }

    private ContentMetadata CloneContentMetadata(ContentMetadata original)
    {
        return new ContentMetadata
        {
            TmdbId = original.TmdbId,
            Title = original.Title,
            OriginalTitle = original.OriginalTitle,
            Overview = original.Overview,
            ReleaseDate = original.ReleaseDate,
            Type = original.Type,
            VoteAverage = original.VoteAverage,
            VoteCount = original.VoteCount,
            Popularity = original.Popularity,
            PosterPath = original.PosterPath,
            BackdropPath = original.BackdropPath,
            Genres = new List<string>(original.Genres ?? new List<string>()),
            Cast = original.Cast?.Select(c => new CastMember
            {
                PersonId = c.PersonId,
                Name = c.Name,
                Character = c.Character,
                ProfilePath = c.ProfilePath,
                Order = c.Order,
                CreditId = c.CreditId,
                Gender = c.Gender
            }).ToList() ?? new List<CastMember>(),
            Crew = original.Crew?.Select(c => new CrewMember
            {
                PersonId = c.PersonId,
                Name = c.Name,
                Job = c.Job,
                Department = c.Department,
                ProfilePath = c.ProfilePath,
                CreditId = c.CreditId,
                Gender = c.Gender
            }).ToList() ?? new List<CrewMember>(),
            ProductionCountries = new List<string>(original.ProductionCountries ?? new List<string>()),
            OriginalLanguages = new List<string>(original.OriginalLanguages ?? new List<string>()),
            Runtime = original.Runtime,
            NumberOfSeasons = original.NumberOfSeasons,
            NumberOfEpisodes = original.NumberOfEpisodes,
            Status = original.Status,
            ExternalIds = original.ExternalIds?.Select(e => new TmdbExternalId
            {
                Source = e.Source,
                ExternalIdValue = e.ExternalIdValue
            }).ToList() ?? new List<TmdbExternalId>(),
            OriginalLanguage = original.OriginalLanguage,
            Adult = original.Adult,
            Budget = original.Budget,
            Revenue = original.Revenue,
            Tagline = original.Tagline,
            Homepage = original.Homepage
        };
    }

    private StreamingAvailabilityResponse CloneStreamingAvailability(StreamingAvailabilityResponse original)
    {
        return new StreamingAvailabilityResponse
        {
            ContentId = original.ContentId,
            Title = original.Title,
            Type = original.Type,
            LastUpdated = original.LastUpdated,
            StreamingOptions = original.StreamingOptions?.Select(o => new StreamingOption
            {
                ServiceId = o.ServiceId,
                ServiceName = o.ServiceName,
                CountryCode = o.CountryCode,
                CountryName = o.CountryName,
                Type = o.Type,
                Price = o.Price,
                Currency = o.Currency,
                StreamingUrl = o.StreamingUrl,
                VideoQuality = new List<string>(o.VideoQuality ?? new List<string>()),
                AudioLanguages = new List<string>(o.AudioLanguages ?? new List<string>()),
                SubtitleLanguages = new List<string>(o.SubtitleLanguages ?? new List<string>()),
                ExpiresAt = o.ExpiresAt,
                LastUpdated = o.LastUpdated
            }).ToList() ?? new List<StreamingOption>()
        };
    }
}

/// <summary>
/// Enricher for missing genres based on title keywords and patterns
/// </summary>
public class MissingGenreEnricher : IDataEnricher
{
    private readonly ILogger<MissingGenreEnricher> _logger;
    private readonly Dictionary<string, List<string>> _keywordGenreMap;

    public string Name => "Missing Genre Enricher";
    public int Priority => 100;

    public MissingGenreEnricher(ILogger<MissingGenreEnricher> logger)
    {
        _logger = logger;
        _keywordGenreMap = InitializeKeywordGenreMap();
    }

    public bool CanEnrich<T>() where T : class => typeof(T) == typeof(ContentMetadata);

    public async Task<bool> EnrichAsync<T>(T data) where T : class
    {
        if (data is not ContentMetadata metadata) return false;

        try
        {
            if (metadata.Genres?.Any() == true) return false; // Already has genres

            var inferredGenres = await InferGenresFromTitleAsync(metadata.Title);
            if (inferredGenres.Any())
            {
                metadata.Genres = inferredGenres;
                _logger.LogDebug("Inferred genres for '{Title}': {Genres}", 
                    metadata.Title, string.Join(", ", inferredGenres));
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to enrich genres for content: {Title}", metadata.Title);
            return false;
        }
    }

    private async Task<List<string>> InferGenresFromTitleAsync(string title)
    {
        if (string.IsNullOrWhiteSpace(title)) return new List<string>();

        var genres = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var titleLower = title.ToLowerInvariant();
        
        foreach (var (keyword, genreList) in _keywordGenreMap)
        {
            if (titleLower.Contains(keyword))
            {
                foreach (var genre in genreList)
                {
                    genres.Add(genre);
                }
            }
        }

        return genres.ToList();
    }

    private Dictionary<string, List<string>> InitializeKeywordGenreMap()
    {
        return new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase)
        {
            // Horror indicators
            { "horror", new List<string> { "Horror" } },
            { "nightmare", new List<string> { "Horror" } },
            { "scream", new List<string> { "Horror" } },
            { "haunted", new List<string> { "Horror" } },
            { "ghost", new List<string> { "Horror" } },
            { "zombie", new List<string> { "Horror" } },
            { "vampire", new List<string> { "Horror" } },
            { "demon", new List<string> { "Horror" } },
            
            // Comedy indicators
            { "comedy", new List<string> { "Comedy" } },
            { "funny", new List<string> { "Comedy" } },
            { "laugh", new List<string> { "Comedy" } },
            { "joke", new List<string> { "Comedy" } },
            { "humor", new List<string> { "Comedy" } },
            
            // Action indicators
            { "action", new List<string> { "Action" } },
            { "fighter", new List<string> { "Action" } },
            { "warrior", new List<string> { "Action" } },
            { "battle", new List<string> { "Action" } },
            { "combat", new List<string> { "Action" } },
            { "fight", new List<string> { "Action" } },
            { "war", new List<string> { "Action", "War" } },
            
            // Romance indicators
            { "love", new List<string> { "Romance" } },
            { "romance", new List<string> { "Romance" } },
            { "heart", new List<string> { "Romance" } },
            { "wedding", new List<string> { "Romance" } },
            { "bride", new List<string> { "Romance" } },
            
            // Sci-Fi indicators
            { "space", new List<string> { "Science Fiction" } },
            { "alien", new List<string> { "Science Fiction" } },
            { "robot", new List<string> { "Science Fiction" } },
            { "future", new List<string> { "Science Fiction" } },
            { "galaxy", new List<string> { "Science Fiction" } },
            { "cyber", new List<string> { "Science Fiction" } },
            
            // Documentary indicators
            { "documentary", new List<string> { "Documentary" } },
            { "the making of", new List<string> { "Documentary" } },
            { "behind the scenes", new List<string> { "Documentary" } },
            
            // Animation indicators
            { "animated", new List<string> { "Animation" } },
            { "cartoon", new List<string> { "Animation" } },
            
            // Thriller indicators
            { "thriller", new List<string> { "Thriller" } },
            { "suspense", new List<string> { "Thriller" } },
            { "mystery", new List<string> { "Mystery", "Thriller" } },
            
            // Adventure indicators
            { "adventure", new List<string> { "Adventure" } },
            { "quest", new List<string> { "Adventure" } },
            { "journey", new List<string> { "Adventure" } },
            { "treasure", new List<string> { "Adventure" } },
            
            // Crime indicators
            { "crime", new List<string> { "Crime" } },
            { "detective", new List<string> { "Crime", "Mystery" } },
            { "police", new List<string> { "Crime" } },
            { "murder", new List<string> { "Crime", "Mystery" } },
            { "heist", new List<string> { "Crime", "Action" } }
        };
    }
}

/// <summary>
/// Enricher for missing overview/descriptions
/// </summary>
public class MissingOverviewEnricher : IDataEnricher
{
    private readonly ILogger<MissingOverviewEnricher> _logger;

    public string Name => "Missing Overview Enricher";
    public int Priority => 80;

    public MissingOverviewEnricher(ILogger<MissingOverviewEnricher> logger)
    {
        _logger = logger;
    }

    public bool CanEnrich<T>() where T : class => typeof(T) == typeof(ContentMetadata);

    public async Task<bool> EnrichAsync<T>(T data) where T : class
    {
        if (data is not ContentMetadata metadata) return false;

        try
        {
            if (!string.IsNullOrWhiteSpace(metadata.Overview)) return false; // Already has overview

            // Generate basic overview from available data
            var generatedOverview = await GenerateBasicOverviewAsync(metadata);
            if (!string.IsNullOrWhiteSpace(generatedOverview))
            {
                metadata.Overview = generatedOverview;
                _logger.LogDebug("Generated overview for '{Title}': {Overview}", 
                    metadata.Title, generatedOverview);
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to enrich overview for content: {Title}", metadata.Title);
            return false;
        }
    }

    private async Task<string> GenerateBasicOverviewAsync(ContentMetadata metadata)
    {
        var parts = new List<string>();

        // Add type information
        var typeDescription = metadata.Type == TmdbContentType.Movie ? "A movie" : "A TV series";
        parts.Add(typeDescription);

        // Add genre information
        if (metadata.Genres?.Any() == true)
        {
            var genreText = metadata.Genres.Count == 1 
                ? metadata.Genres[0].ToLower()
                : string.Join(", ", metadata.Genres.Take(2).Select(g => g.ToLower()));
            parts.Add($"in the {genreText} genre");
        }

        // Add release year
        if (metadata.ReleaseDate.HasValue)
        {
            parts.Add($"from {metadata.ReleaseDate.Value.Year}");
        }

        // Add cast information if available
        // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when getting lead actor
        if (metadata.Cast?.Any() == true)
        {
            var leadActor = metadata.Cast.OrderBy(c => c.Order).FirstOrDefault()?.Name;
            if (!string.IsNullOrEmpty(leadActor))
            {
                parts.Add($"starring {leadActor}");
            }
        }

        // Add runtime for movies
        if (metadata.Type == TmdbContentType.Movie && metadata.Runtime.HasValue)
        {
            var hours = metadata.Runtime.Value / 60;
            var minutes = metadata.Runtime.Value % 60;
            if (hours > 0)
                parts.Add($"with a runtime of {hours}h {minutes}m");
            else
                parts.Add($"with a runtime of {minutes} minutes");
        }

        // Add season info for TV series
        if (metadata.Type == TmdbContentType.TvSeries && metadata.NumberOfSeasons.HasValue)
        {
            var seasonText = metadata.NumberOfSeasons.Value == 1 ? "1 season" : $"{metadata.NumberOfSeasons.Value} seasons";
            parts.Add($"with {seasonText}");
        }

        if (!parts.Any()) return string.Empty;

        // Combine parts into a coherent sentence
        var overview = string.Join(" ", parts) + ".";
        return overview.Substring(0, 1).ToUpper() + overview.Substring(1); // Capitalize first letter
    }
}

/// <summary>
/// Enricher for missing runtime information
/// </summary>
public class MissingRuntimeEnricher : IDataEnricher
{
    private readonly ILogger<MissingRuntimeEnricher> _logger;
    
    // Average runtimes by genre (in minutes)
    private readonly Dictionary<string, int> _genreAverageRuntimes = new()
    {
        { "Documentary", 95 },
        { "Action", 110 },
        { "Comedy", 95 },
        { "Drama", 115 },
        { "Horror", 100 },
        { "Romance", 105 },
        { "Science Fiction", 120 },
        { "Thriller", 105 },
        { "Adventure", 115 },
        { "Animation", 90 },
        { "Crime", 110 },
        { "Fantasy", 120 },
        { "Mystery", 105 }
    };

    public string Name => "Missing Runtime Enricher";
    public int Priority => 60;

    public MissingRuntimeEnricher(ILogger<MissingRuntimeEnricher> logger)
    {
        _logger = logger;
    }

    public bool CanEnrich<T>() where T : class => typeof(T) == typeof(ContentMetadata);

    public async Task<bool> EnrichAsync<T>(T data) where T : class
    {
        if (data is not ContentMetadata metadata) return false;
        if (metadata.Type != TmdbContentType.Movie) return false; // Only enrich movie runtimes

        try
        {
            if (metadata.Runtime.HasValue && metadata.Runtime.Value > 0) return false; // Already has runtime

            var estimatedRuntime = await EstimateRuntimeAsync(metadata);
            if (estimatedRuntime > 0)
            {
                metadata.Runtime = estimatedRuntime;
                _logger.LogDebug("Estimated runtime for '{Title}': {Runtime} minutes", 
                    metadata.Title, estimatedRuntime);
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to enrich runtime for content: {Title}", metadata.Title);
            return false;
        }
    }

    private async Task<int> EstimateRuntimeAsync(ContentMetadata metadata)
    {
        var estimates = new List<int>();

        // Estimate based on genres
        if (metadata.Genres?.Any() == true)
        {
            foreach (var genre in metadata.Genres)
            {
                if (_genreAverageRuntimes.TryGetValue(genre, out var avgRuntime))
                {
                    estimates.Add(avgRuntime);
                }
            }
        }

        // If no genre-based estimate, use general average
        if (!estimates.Any())
        {
            estimates.Add(105); // General movie average
        }

        // Return the average of all estimates
        return (int)estimates.Average();
    }
}

/// <summary>
/// Enricher for country name resolution in streaming options
/// </summary>
public class CountryNameEnricher : IDataEnricher
{
    private readonly ILogger<CountryNameEnricher> _logger;
    private readonly Dictionary<string, string> _countryCodeToName;

    public string Name => "Country Name Enricher";
    public int Priority => 70;

    public CountryNameEnricher(ILogger<CountryNameEnricher> logger)
    {
        _logger = logger;
        _countryCodeToName = InitializeCountryCodeMap();
    }

    public bool CanEnrich<T>() where T : class => typeof(T) == typeof(StreamingAvailabilityResponse);

    public async Task<bool> EnrichAsync<T>(T data) where T : class
    {
        if (data is not StreamingAvailabilityResponse streaming) return false;

        try
        {
            var enriched = false;
            
            if (streaming.StreamingOptions?.Any() == true)
            {
                foreach (var option in streaming.StreamingOptions)
                {
                    if (!string.IsNullOrWhiteSpace(option.CountryCode) && 
                        string.IsNullOrWhiteSpace(option.CountryName))
                    {
                        if (_countryCodeToName.TryGetValue(option.CountryCode.ToUpper(), out var countryName))
                        {
                            option.CountryName = countryName;
                            enriched = true;
                        }
                    }
                }
            }

            if (enriched)
            {
                _logger.LogDebug("Enriched country names for streaming availability: {ContentId}", 
                    streaming.ContentId);
            }

            return enriched;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to enrich country names for streaming availability: {ContentId}", 
                streaming.ContentId);
            return false;
        }
    }

    private Dictionary<string, string> InitializeCountryCodeMap()
    {
        return new Dictionary<string, string>
        {
            { "US", "United States" },
            { "GB", "United Kingdom" },
            { "CA", "Canada" },
            { "AU", "Australia" },
            { "DE", "Germany" },
            { "FR", "France" },
            { "IT", "Italy" },
            { "ES", "Spain" },
            { "NL", "Netherlands" },
            { "SE", "Sweden" },
            { "NO", "Norway" },
            { "DK", "Denmark" },
            { "FI", "Finland" },
            { "JP", "Japan" },
            { "KR", "South Korea" },
            { "BR", "Brazil" },
            { "MX", "Mexico" },
            { "AR", "Argentina" },
            { "IN", "India" },
            { "BE", "Belgium" },
            { "AT", "Austria" },
            { "CH", "Switzerland" },
            { "PT", "Portugal" },
            { "IE", "Ireland" },
            { "NZ", "New Zealand" },
            { "PL", "Poland" },
            { "CZ", "Czech Republic" },
            { "HU", "Hungary" },
            { "RO", "Romania" },
            { "BG", "Bulgaria" },
            { "GR", "Greece" },
            { "TR", "Turkey" },
            { "RU", "Russia" },
            { "CN", "China" },
            { "TH", "Thailand" },
            { "SG", "Singapore" },
            { "MY", "Malaysia" },
            { "PH", "Philippines" },
            { "ID", "Indonesia" },
            { "VN", "Vietnam" },
            { "ZA", "South Africa" },
            { "EG", "Egypt" },
            { "NG", "Nigeria" },
            { "KE", "Kenya" },
            { "IL", "Israel" },
            { "AE", "United Arab Emirates" },
            { "SA", "Saudi Arabia" }
        };
    }
}