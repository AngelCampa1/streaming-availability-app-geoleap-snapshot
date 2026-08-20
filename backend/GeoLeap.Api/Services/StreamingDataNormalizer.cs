using System.Globalization;
using System.Text.RegularExpressions;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public class StreamingDataNormalizer : IStreamingDataNormalizer
{
    private readonly ILogger<StreamingDataNormalizer> _logger;

    // Service ID mapping for consistent naming
    private static readonly Dictionary<string, string> ServiceNameMapping = new()
    {
        ["netflix"] = "Netflix",
        ["amazon"] = "Amazon Prime Video",
        ["amazon_prime"] = "Amazon Prime Video",
        ["prime"] = "Amazon Prime Video",
        ["disney"] = "Disney+",
        ["disney_plus"] = "Disney+",
        ["disneyplus"] = "Disney+",
        ["hbo"] = "HBO Max",
        ["hbo_max"] = "HBO Max",
        ["hbomax"] = "HBO Max",
        ["hulu"] = "Hulu",
        ["paramount"] = "Paramount+",
        ["paramount_plus"] = "Paramount+",
        ["paramountplus"] = "Paramount+",
        ["peacock"] = "Peacock",
        ["apple"] = "Apple TV+",
        ["apple_tv"] = "Apple TV+",
        ["appletv"] = "Apple TV+",
        ["youtube"] = "YouTube",
        ["youtube_tv"] = "YouTube TV"
    };

    // Country code to name mapping
    private static readonly Dictionary<string, string> CountryMapping = new()
    {
        ["us"] = "United States",
        ["ca"] = "Canada",
        ["gb"] = "United Kingdom",
        ["uk"] = "United Kingdom",
        ["au"] = "Australia",
        ["de"] = "Germany",
        ["fr"] = "France",
        ["jp"] = "Japan",
        ["kr"] = "South Korea",
        ["in"] = "India",
        ["br"] = "Brazil",
        ["mx"] = "Mexico",
        ["es"] = "Spain",
        ["it"] = "Italy",
        ["nl"] = "Netherlands"
    };

    public StreamingDataNormalizer(ILogger<StreamingDataNormalizer> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Normalizes external API response to internal model
    /// </summary>
    public StreamingAvailabilityResponse NormalizeResponse(ExternalApiResponse externalResponse)
    {
        try
        {
            var normalized = new StreamingAvailabilityResponse
            {
                ContentId = externalResponse.Id.ToString(),
                Title = CleanTitle(externalResponse.Title),
                Type = MapContentType(externalResponse.Type),
                LastUpdated = DateTime.UtcNow,
                StreamingOptions = new List<StreamingOption>()
            };

            // Process streaming info
            foreach (var countryInfo in externalResponse.StreamingInfo)
            {
                var countryCode = countryInfo.Key;
                var streamingOptions = countryInfo.Value;

                foreach (var option in streamingOptions)
                {
                    var normalizedOption = NormalizeStreamingOption(countryCode, option);
                    if (normalizedOption != null)
                    {
                        normalized.StreamingOptions.Add(normalizedOption);
                    }
                }
            }

            normalized.Available = normalized.StreamingOptions.Any();
            return normalized;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error normalizing external API response");
            return new StreamingAvailabilityResponse();
        }
    }

    /// <summary>
    /// Converts official StreamingAvailabilityShow to legacy StreamingAvailabilityResponse
    /// </summary>
    public StreamingAvailabilityResponse ConvertToLegacyResponse(StreamingAvailabilityShow show)
    {
        try
        {
            if (show == null)
                return new StreamingAvailabilityResponse();

            var normalized = new StreamingAvailabilityResponse
            {
                ContentId = show.Id,
                Title = CleanTitle(show.Title),
                Type = MapOfficialShowType(show.ShowType),
                LastUpdated = DateTime.UtcNow,
                Available = show.StreamingInfo?.Any() == true,
                StreamingOptions = new List<StreamingOption>()
            };

            // Process streaming info from the official API structure
            foreach (var countryInfo in show.StreamingInfo)
            {
                var countryCode = countryInfo.Key;
                var streamingOptions = countryInfo.Value;

                foreach (var option in streamingOptions)
                {
                    var normalizedOption = NormalizeStreamingOptionFromOfficial(countryCode, option);
                    if (normalizedOption != null)
                    {
                        normalized.StreamingOptions.Add(normalizedOption);
                    }
                }
            }

            _logger.LogDebug("Normalized response for content {ContentId}: {OptionCount} streaming options", 
                normalized.ContentId, normalized.StreamingOptions.Count);

            return normalized;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error normalizing response for content ID {ContentId}", show.Id);

            // Return minimal response on error
            return new StreamingAvailabilityResponse
            {
                ContentId = show.Id,
                Title = CleanTitle(show.Title ?? "Unknown"),
                Type = MapOfficialShowType(show.ShowType ?? "movie"),
                LastUpdated = DateTime.UtcNow,
                StreamingOptions = new List<StreamingOption>()
            };
        }
    }

    /// <summary>
    /// Converts V2 API V2ShowResult to legacy StreamingAvailabilityResponse
    /// </summary>
    public StreamingAvailabilityResponse ConvertToLegacyResponse(V2ShowResult v2Show)
    {
        try
        {
            if (v2Show == null)
                return new StreamingAvailabilityResponse();

            var normalized = new StreamingAvailabilityResponse
            {
                ContentId = v2Show.Id,
                Title = CleanTitle(v2Show.Title),
                Type = MapContentType(v2Show.Type),
                LastUpdated = DateTime.UtcNow,
                Available = v2Show.StreamingOptions?.Any() == true,
                StreamingOptions = new List<StreamingOption>()
            };

            // Process streaming info from the V2 API structure
            foreach (var countryInfo in v2Show.StreamingOptions)
            {
                var countryCode = countryInfo.Key;
                var streamingOptions = countryInfo.Value;

                foreach (var option in streamingOptions)
                {
                    var normalizedOption = NormalizeStreamingOptionFromV2(countryCode, option);
                    if (normalizedOption != null)
                    {
                        normalized.StreamingOptions.Add(normalizedOption);
                    }
                }
            }

            _logger.LogDebug("Normalized V2 response for content {ContentId}: {OptionCount} streaming options",
                normalized.ContentId, normalized.StreamingOptions.Count);

            return normalized;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error normalizing V2 response for content ID {ContentId}", v2Show.Id);

            // Return minimal response on error
            return new StreamingAvailabilityResponse
            {
                ContentId = v2Show.Id,
                Title = CleanTitle(v2Show.Title ?? "Unknown"),
                Type = MapContentType(v2Show.Type ?? "movie"),
                LastUpdated = DateTime.UtcNow,
                StreamingOptions = new List<StreamingOption>()
            };
        }
    }

    public SearchResponse<GlobalSearchResult> NormalizeSearchResponse(List<ExternalApiResponse> externalResults, int totalResults, int page, int pageSize)
    {
        try
        {
            var normalizedResults = new List<GlobalSearchResult>();

            foreach (var external in externalResults)
            {
                try
                {
                    var result = new GlobalSearchResult
                    {
                        Id = external.Id.ToString(),
                        Title = CleanTitle(external.Title),
                        Type = MapContentType(external.Type),
                        Year = external.Year,
                        Overview = external.Overview?.Trim() ?? "",
                        Genres = external.Genres?.Select(g => g.Name).ToList() ?? new List<string>(),
                        PosterUrl = GetImageUrl(external.ImageSet),
                        StreamingOptions = new List<GlobalStreamingOption>()
                    };

                    normalizedResults.Add(result);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error normalizing search result for content ID {ContentId}", external.Id);
                    // Continue with other results
                }
            }

            return new SearchResponse<GlobalSearchResult>
            {
                Results = normalizedResults,
                TotalResults = totalResults,
                Page = page,
                TotalPages = (int)Math.Ceiling((double)totalResults / pageSize),
                HasMore = (page * pageSize) < totalResults
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error normalizing search response");
            
            return new SearchResponse<GlobalSearchResult>
            {
                Results = new List<GlobalSearchResult>(),
                TotalResults = 0,
                Page = page,
                TotalPages = 0,
                HasMore = false
            };
        }
    }

    public StreamingOption NormalizeStreamingOption(string countryCode, ExternalStreamingOption external)
    {
        try
        {
            var serviceId = external.Service?.ToLowerInvariant() ?? "unknown";
            var serviceName = ServiceNameMapping.GetValueOrDefault(serviceId, external.Service ?? "Unknown Service");

            return new StreamingOption
            {
                ServiceId = serviceId,
                ServiceName = serviceName,
                CountryCode = countryCode.ToLowerInvariant(),
                CountryName = CountryMapping.GetValueOrDefault(countryCode.ToLowerInvariant(), countryCode.ToUpperInvariant()),
                Type = MapStreamingType(external.Type),
                Price = ParsePrice(external.Price),
                Currency = external.Price?.Currency ?? "",
                StreamingUrl = external.Link ?? "",
                VideoQuality = ParseVideoQuality(external.Quality),
                AudioLanguages = ExtractAudioLanguages(external.Audios),
                SubtitleLanguages = ExtractSubtitleLanguages(external.Subtitles),
                ExpiresAt = ConvertUnixTimestamp(external.ExpiresOn)
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error normalizing streaming option for service {Service} in country {Country}", 
                external.Service, countryCode);
            return null;
        }
    }

    public ContentType MapContentType(string externalType)
    {
        return externalType?.ToLowerInvariant() switch
        {
            "movie" => ContentType.Movie,
            "show" => ContentType.TvSeries,
            "series" => ContentType.TvSeries,
            "tv" => ContentType.TvSeries,
            _ => ContentType.Movie // Default to movie
        };
    }

    public StreamingType MapStreamingType(string externalType)
    {
        return externalType?.ToLowerInvariant() switch
        {
            "subscription" => StreamingType.Subscription,
            "rent" => StreamingType.Rental,
            "rental" => StreamingType.Rental,
            "buy" => StreamingType.Purchase,
            "purchase" => StreamingType.Purchase,
            "free" => StreamingType.Free,
            "ads" => StreamingType.Ads,
            "ad" => StreamingType.Ads,
            _ => StreamingType.Subscription // Default to subscription
        };
    }

    public string CleanTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            return "";

        // Remove extra whitespace and normalize
        title = Regex.Replace(title, @"\s+", " ").Trim();
        
        // Remove common suffixes that might be inconsistent
        title = Regex.Replace(title, @"\s+\(.*\)$", "", RegexOptions.IgnoreCase);
        
        return title;
    }

    public string GetImageUrl(ExternalImageSet? imageSet)
    {
        if (imageSet?.VerticalPoster == null)
            return "";

        // Return the highest quality available
        return imageSet.VerticalPoster.W720 ??
               imageSet.VerticalPoster.W600 ??
               imageSet.VerticalPoster.W480 ??
               imageSet.VerticalPoster.W360 ??
               imageSet.VerticalPoster.W240 ??
               "";
    }

    public List<string> ExtractAudioLanguages(List<ExternalAudio> audios)
    {
        if (audios == null || audios.Count == 0)
            return new List<string>();

        return audios
            .Where(a => !string.IsNullOrWhiteSpace(a.Language))
            .Select(a => NormalizeLanguage(a.Language))
            .Distinct()
            .OrderBy(lang => lang)
            .ToList();
    }

    public List<string> ExtractSubtitleLanguages(List<ExternalSubtitle> subtitles)
    {
        if (subtitles == null || subtitles.Count == 0)
            return new List<string>();

        return subtitles
            .Where(s => !string.IsNullOrWhiteSpace(s.Locale?.Language))
            .Select(s => NormalizeLanguage(s.Locale.Language))
            .Distinct()
            .OrderBy(lang => lang)
            .ToList();
    }

    /// <summary>
    /// Normalize streaming option from official API structure
    /// </summary>
    private StreamingOption NormalizeStreamingOptionFromOfficial(string countryCode, StreamingInfo option)
    {
        try
        {
            return new StreamingOption
            {
                ServiceId = option.Service,
                ServiceName = NormalizeServiceName(option.Service),
                CountryCode = countryCode,
                CountryName = GetCountryName(countryCode),
                Type = MapToStreamingType(option.StreamingType),
                Price = option.Price?.Amount,
                Currency = option.Price?.Currency ?? "USD",
                StreamingUrl = option.Link,
                VideoQuality = option.VideoFormat ?? new List<string>(),
                AudioLanguages = option.Audio ?? new List<string>(),
                SubtitleLanguages = option.Subs ?? new List<string>(),
                ExpiresAt = option.LeaveAt,
                LastUpdated = option.AvailableSince ?? DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error normalizing streaming option for service {Service}", option.Service);
            return null;
        }
    }

    /// <summary>
    /// Normalize streaming option from V2 API structure
    /// </summary>
    private StreamingOption NormalizeStreamingOptionFromV2(string countryCode, V2StreamingOption option)
    {
        try
        {
            // Parse price from V2 format (now nested in Price object)
            decimal? price = null;
            string currency = "USD";
            if (option.Price != null)
            {
                if (!string.IsNullOrWhiteSpace(option.Price.Amount) && decimal.TryParse(option.Price.Amount, out var parsedPrice))
                {
                    price = parsedPrice;
                }
                currency = option.Price.Currency ?? "USD";
            }

            var serviceId = option.Service?.Id?.ToLowerInvariant() ?? "unknown";
            var serviceName = option.Service?.Name ?? NormalizeServiceName(serviceId);

            return new StreamingOption
            {
                ServiceId = serviceId,
                ServiceName = serviceName,
                CountryCode = countryCode.ToLowerInvariant(),
                CountryName = GetCountryName(countryCode),
                Type = MapStreamingType(option.Type),
                Price = price,
                Currency = currency,
                StreamingUrl = option.Link ?? "",
                VideoQuality = ParseVideoQuality(option.Quality),
                AudioLanguages = new List<string>(), // V2 API doesn't provide audio info
                SubtitleLanguages = new List<string>(), // V2 API doesn't provide subtitle info
                ExpiresAt = null, // V2 API doesn't provide expiry info
                LastUpdated = option.AvailableSince.HasValue ? DateTimeOffset.FromUnixTimeSeconds(option.AvailableSince.Value).DateTime : DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error normalizing V2 streaming option for service {ServiceId}", option.Service?.Id);
            return null;
        }
    }

    /// <summary>
    /// Map official streaming type to internal streaming type
    /// </summary>
    private StreamingType MapToStreamingType(string streamingType)
    {
        return streamingType?.ToLowerInvariant() switch
        {
            "subscription" => StreamingType.Subscription,
            "buy" => StreamingType.Purchase,
            "purchase" => StreamingType.Purchase,
            "rent" => StreamingType.Rent,
            "rental" => StreamingType.Rental,
            "free" => StreamingType.Free,
            "ads" => StreamingType.Ads,
            _ => StreamingType.Subscription
        };
    }

    /// <summary>
    /// Map official show type to internal content type (for official API)
    /// </summary>
    private ContentType MapOfficialShowType(string showType)
    {
        return showType?.ToLowerInvariant() switch
        {
            "movie" => ContentType.Movie,
            "series" => ContentType.TvSeries,
            "show" => ContentType.TvSeries,
            "episode" => ContentType.TvSeries,
            _ => ContentType.All
        };
    }

    public DateTime? ConvertUnixTimestamp(long? unixTimestamp)
    {
        if (!unixTimestamp.HasValue || unixTimestamp.Value <= 0)
            return null;

        try
        {
            return DateTimeOffset.FromUnixTimeSeconds(unixTimestamp.Value).DateTime;
        }
        catch
        {
            return null;
        }
    }

    public decimal? ParsePrice(ExternalPrice? price)
    {
        if (price == null || string.IsNullOrWhiteSpace(price.Amount))
            return null;

        // Remove currency symbols and parse
        var cleanAmount = Regex.Replace(price.Amount, @"[^\d.,]", "");
        
        if (decimal.TryParse(cleanAmount, NumberStyles.Currency, CultureInfo.InvariantCulture, out var result))
        {
            return result;
        }

        return null;
    }

    private List<string> ParseVideoQuality(string quality)
    {
        if (string.IsNullOrWhiteSpace(quality))
            return new List<string>();

        var qualities = new List<string>();
        var qualityLower = quality.ToLowerInvariant();

        if (qualityLower.Contains("4k") || qualityLower.Contains("2160p"))
            qualities.Add("4K");
        if (qualityLower.Contains("hd") || qualityLower.Contains("1080p"))
            qualities.Add("HD");
        if (qualityLower.Contains("720p"))
            qualities.Add("HD");
        if (qualityLower.Contains("sd") || qualityLower.Contains("480p"))
            qualities.Add("SD");

        return qualities.Distinct().ToList();
    }

    private string NormalizeLanguage(string language)
    {
        if (string.IsNullOrWhiteSpace(language))
            return "";

        // Basic language normalization
        var languageMapping = new Dictionary<string, string>
        {
            ["en"] = "English",
            ["es"] = "Spanish",
            ["fr"] = "French",
            ["de"] = "German",
            ["it"] = "Italian",
            ["pt"] = "Portuguese",
            ["ja"] = "Japanese",
            ["ko"] = "Korean",
            ["zh"] = "Chinese",
            ["ru"] = "Russian",
            ["ar"] = "Arabic",
            ["hi"] = "Hindi"
        };

        var langCode = language.ToLowerInvariant().Substring(0, Math.Min(2, language.Length));
        return languageMapping.GetValueOrDefault(langCode, language);
    }

    /// <summary>
    /// Normalize service name from official API
    /// </summary>
    private string NormalizeServiceName(string service)
    {
        if (string.IsNullOrWhiteSpace(service))
            return "Unknown Service";

        return ServiceNameMapping.GetValueOrDefault(service.ToLowerInvariant(), service);
    }

    /// <summary>
    /// Get country name from country code
    /// </summary>
    private string GetCountryName(string countryCode)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
            return "Unknown Country";

        return CountryMapping.GetValueOrDefault(countryCode.ToLowerInvariant(), countryCode.ToUpperInvariant());
    }

    /// <summary>
    /// Normalize V2 show details for VPN streaming availability feature
    /// Processes country-specific streaming info and marks user subscriptions
    /// </summary>
    public ShowStreamingDetails NormalizeShowDetails(V2ShowResult v2Show, List<string>? userServiceIds = null, string? userCountry = null)
    {
        try
        {
            if (v2Show == null)
            {
                _logger.LogWarning("Null V2ShowResult provided to NormalizeShowDetails");
                return new ShowStreamingDetails();
            }

            var details = new ShowStreamingDetails
            {
                Id = v2Show.Id,
                Title = CleanTitle(v2Show.Title),
                AvailabilityByCountry = new Dictionary<string, CountryStreamingInfo>(),
                TotalCountries = 0,
                CountriesWithUserSubscriptions = 0,
                UserServicesWithContent = new List<string>()
            };

            // Normalize user service IDs for comparison
            var normalizedUserServices = userServiceIds?.Select(s => s.ToLowerInvariant()).ToHashSet()
                ?? new HashSet<string>();

            var userServicesFound = new HashSet<string>();

            // Process streaming info by country
            if (v2Show.StreamingOptions != null && v2Show.StreamingOptions.Any())
            {
                foreach (var countryInfo in v2Show.StreamingOptions)
                {
                    var countryCode = countryInfo.Key.ToLowerInvariant();
                    var streamingOptions = countryInfo.Value;

                    if (!streamingOptions.Any())
                        continue;

                    var countryStreaming = new CountryStreamingInfo
                    {
                        CountryCode = countryCode,
                        CountryName = GetCountryName(countryCode),
                        Services = new List<ServiceAvailability>(),
                        HasUserSubscriptions = false,
                        UserServicesCount = 0
                    };

                    // Process each streaming option in this country
                    foreach (var option in streamingOptions)
                    {
                        var serviceId = option.Service?.Id?.ToLowerInvariant() ?? "unknown";
                        var isUserSubscription = normalizedUserServices.Contains(serviceId);

                        if (isUserSubscription)
                        {
                            countryStreaming.HasUserSubscriptions = true;
                            countryStreaming.UserServicesCount++;
                            userServicesFound.Add(serviceId);
                        }

                        // Parse audio and subtitle languages from V2 format
                        var audioLanguages = new List<string>();
                        var subtitleLanguages = new List<string>();

                        // V2 API may not provide these - keeping empty for now
                        // Future enhancement: Extract from additional API data if available

                        var serviceAvailability = new ServiceAvailability
                        {
                            ServiceId = serviceId,
                            ServiceName = NormalizeServiceName(option.Service?.Name ?? option.Service?.Id ?? "Unknown"),
                            Type = MapStreamingType(option.Type),
                            Url = option.Link ?? "",
                            Quality = option.Quality ?? "",
                            AudioLanguages = audioLanguages,
                            SubtitleLanguages = subtitleLanguages,
                            IsUserSubscription = isUserSubscription
                        };

                        countryStreaming.Services.Add(serviceAvailability);
                    }

                    // Only add country if it has services
                    if (countryStreaming.Services.Any())
                    {
                        details.AvailabilityByCountry[countryCode] = countryStreaming;
                        details.TotalCountries++;

                        if (countryStreaming.HasUserSubscriptions)
                        {
                            details.CountriesWithUserSubscriptions++;
                        }
                    }
                }
            }

            // Track which user services have this content
            details.UserServicesWithContent = userServicesFound.ToList();

            // Sort countries: user's country first, then by user subscription count, then alphabetically
            if (!string.IsNullOrEmpty(userCountry))
            {
                var sortedCountries = details.AvailabilityByCountry
                    .OrderByDescending(c => c.Key.Equals(userCountry, StringComparison.OrdinalIgnoreCase))
                    .ThenByDescending(c => c.Value.UserServicesCount)
                    .ThenBy(c => c.Value.CountryName)
                    .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

                details.AvailabilityByCountry = sortedCountries;
            }

            _logger.LogInformation(
                "Normalized show details for {ShowId}: {TotalCountries} countries, {UserCountries} with user subscriptions",
                v2Show.Id,
                details.TotalCountries,
                details.CountriesWithUserSubscriptions
            );

            return details;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error normalizing show details for content ID {ContentId}", v2Show?.Id);
            return new ShowStreamingDetails
            {
                Id = v2Show?.Id ?? "unknown",
                Title = v2Show?.Title ?? "Unknown",
                AvailabilityByCountry = new Dictionary<string, CountryStreamingInfo>(),
                TotalCountries = 0,
                CountriesWithUserSubscriptions = 0,
                UserServicesWithContent = new List<string>()
            };
        }
    }
}