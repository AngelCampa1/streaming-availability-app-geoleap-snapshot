using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using GeoLeap.Api.Models;
using System.Text;
using System.Diagnostics;

namespace GeoLeap.Api.Services;

public class StreamingAvailabilityClient : IStreamingAvailabilityClient
{
    private readonly HttpClient _httpClient;
    private readonly IOptionsMonitor<StreamingApiSettings> _settings;
    private readonly ILogger<StreamingAvailabilityClient> _logger;
    private readonly IDistributedCache _cache;
    private readonly IStreamingApiErrorHandler _errorHandler;
    private readonly IApiUsageTracker _usageTracker;
    private readonly IStreamingDataNormalizer _dataNormalizer;
    private readonly JsonSerializerOptions _jsonOptions;

    public StreamingAvailabilityClient(
        HttpClient httpClient,
        IOptionsMonitor<StreamingApiSettings> settings,
        ILogger<StreamingAvailabilityClient> logger,
        IDistributedCache cache,
        IStreamingApiErrorHandler errorHandler,
        IApiUsageTracker usageTracker,
        IStreamingDataNormalizer dataNormalizer)
    {
        _httpClient = httpClient;
        _settings = settings;
        _logger = logger;
        _cache = cache;
        _errorHandler = errorHandler;
        _usageTracker = usageTracker;
        _dataNormalizer = dataNormalizer;

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        ConfigureHttpClient();
    }

    private void ConfigureHttpClient()
    {
        var settings = _settings.CurrentValue;
        
        _httpClient.BaseAddress = new Uri(settings.BaseUrl);
        _httpClient.Timeout = TimeSpan.FromMilliseconds(settings.TimeoutMs);
        
        if (!string.IsNullOrEmpty(settings.ApiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-RapidAPI-Key", settings.ApiKey);
            _httpClient.DefaultRequestHeaders.Add("X-RapidAPI-Host", "streaming-availability.p.rapidapi.com");
        }
        
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "GeoLeap/1.0");
    }

    public async Task<StreamingAvailabilityResponse> GetAvailabilityAsync(
        string contentId,
        ContentType contentType,
        CancellationToken cancellationToken = default)
    {
        const string operation = "GetAvailability";
        var correlationId = Activity.Current?.Id;
        var stopwatch = Stopwatch.StartNew();

        try
        {
            _logger.LogInformation("Getting streaming availability for content {ContentId} of type {ContentType}",
                contentId, contentType);

            // Check cache first
            var cacheKey = $"streaming_availability_{contentId}_{contentType}";
            var cachedResult = await GetFromCacheAsync<StreamingAvailabilityResponse>(cacheKey);
            if (cachedResult != null)
            {
                _logger.LogInformation("Cache hit for streaming availability {ContentId}", contentId);
                return cachedResult;
            }

            // Check if we can make API call
            if (!await _usageTracker.CanMakeApiCallAsync())
            {
                throw new StreamingApiException(operation, "API usage budget exceeded", correlationId);
            }

            var response = await _errorHandler.ExecuteWithRetryAsync(async () =>
            {
                // Use the official library endpoint structure
                var endpoint = $"/v2/get/basic?country=us&ids={contentId}&output_language=en";
                var httpResponse = await _httpClient.GetAsync(endpoint, cancellationToken);

                await _usageTracker.TrackApiCallAsync(
                    endpoint,
                    httpResponse.IsSuccessStatusCode,
                    (int)stopwatch.ElapsedMilliseconds,
                    _settings.CurrentValue.CostPerCall,
                    correlationId,
                    httpResponse.IsSuccessStatusCode ? null : httpResponse.ReasonPhrase,
                    (int)httpResponse.StatusCode);

                if (!httpResponse.IsSuccessStatusCode)
                {
                    var errorContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
                    throw new StreamingApiException(operation,
                        $"API call failed: {httpResponse.StatusCode} - {errorContent}",
                        null, (int)httpResponse.StatusCode, correlationId);
                }

                return httpResponse;
            }, operation, cancellationToken);

            var jsonContent = await response.Content.ReadAsStringAsync(cancellationToken);
            var v2Response = JsonSerializer.Deserialize<V2BasicDetailsResponse>(jsonContent, _jsonOptions);

            if (v2Response == null || v2Response.Shows == null || !v2Response.Shows.Any())
            {
                throw new StreamingApiException(operation, "Failed to deserialize V2 API response", correlationId);
            }

            // Convert to legacy model for backward compatibility
            var firstShow = v2Response.Shows.FirstOrDefault();
            if (firstShow == null)
            {
                throw new StreamingApiException(operation, "No shows returned in V2 API response", correlationId);
            }

            var legacyResponse = _dataNormalizer.ConvertToLegacyResponse(firstShow);

            // Cache the result
            await SetCacheAsync(cacheKey, legacyResponse, TimeSpan.FromMinutes(_settings.CurrentValue.CacheDurationMinutes));

            _logger.LogInformation("Successfully retrieved streaming availability for {ContentId} - {Title}",
                contentId, firstShow.Title);

            return legacyResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting streaming availability for content {ContentId}: {Error}",
                contentId, ex.Message);

            await _usageTracker.TrackApiCallAsync(
                $"get_availability_{contentId}",
                false,
                (int)stopwatch.ElapsedMilliseconds,
                0,
                correlationId,
                ex.Message,
                0);

            throw;
        }
    }

    public async Task<SearchResponse<GlobalSearchResult>> SearchContentAsync(
        string query,
        ContentType? contentType = null,
        string[]? countries = null,
        int page = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        const string operation = "SearchContent";
        var correlationId = Activity.Current?.Id;
        var stopwatch = Stopwatch.StartNew();

        try
        {
            _logger.LogInformation("Searching content with query '{Query}', type {ContentType}, page {Page}",
                query, contentType, page);

            // Check cache first
            var cacheKey = $"search_{GetSearchCacheKey(query, contentType, countries, page, pageSize)}";
            var cachedResult = await GetFromCacheAsync<SearchResponse<GlobalSearchResult>>(cacheKey);
            if (cachedResult != null)
            {
                _logger.LogInformation("Cache hit for search query '{Query}'", query);
                return cachedResult;
            }

            // Check if we can make API call
            if (!await _usageTracker.CanMakeApiCallAsync())
            {
                throw new StreamingApiException(operation, "API usage budget exceeded", correlationId);
            }

            var response = await _errorHandler.ExecuteWithRetryAsync(async () =>
            {
                // Use the official library search endpoint
                // NOTE: Despite documentation suggesting country is optional for global data,
                // the API returns error "mandatory parameter country is missing" when omitted.
                // Default to US if no country specified.
                var countryCode = countries?.Any() == true
                    ? countries.First().ToLowerInvariant()
                    : "us";

                var queryParams = new List<string>
                {
                    $"title={Uri.EscapeDataString(query)}",
                    $"country={countryCode}",
                    $"output_language=en"
                };

                if (contentType.HasValue && contentType.Value != ContentType.All)
                {
                    queryParams.Add($"showType={contentType.Value.ToString().ToLower()}");
                }

                queryParams.Add($"series_granularity=show");

                var endpoint = $"/shows/search/title?{string.Join("&", queryParams)}";
                var httpResponse = await _httpClient.GetAsync(endpoint, cancellationToken);

                await _usageTracker.TrackApiCallAsync(
                    endpoint,
                    httpResponse.IsSuccessStatusCode,
                    (int)stopwatch.ElapsedMilliseconds,
                    _settings.CurrentValue.CostPerCall,
                    correlationId,
                    httpResponse.IsSuccessStatusCode ? null : httpResponse.ReasonPhrase,
                    (int)httpResponse.StatusCode);

                if (!httpResponse.IsSuccessStatusCode)
                {
                    var errorContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
                    throw new StreamingApiException(operation,
                        $"API call failed: {httpResponse.StatusCode} - {errorContent}",
                        null, (int)httpResponse.StatusCode, correlationId);
                }

                return httpResponse;
            }, operation, cancellationToken);

            var jsonContent = await response.Content.ReadAsStringAsync(cancellationToken);

            // DEBUG: Log a snippet of the raw API response to see the streaming data structure
            Console.WriteLine($"*** STREAMING API RAW RESPONSE LENGTH: {jsonContent.Length} ***");

            // Find and log a snippet around "streamingOptions" to see structure
            var streamingOptionsIndex = jsonContent.IndexOf("\"streamingOptions\"");
            if (streamingOptionsIndex >= 0)
            {
                var snippet = jsonContent.Substring(streamingOptionsIndex, Math.Min(1500, jsonContent.Length - streamingOptionsIndex));
                Console.WriteLine($"*** STREAMING OPTIONS SNIPPET: {snippet} ***");
            }
            else
            {
                Console.WriteLine($"*** NO streamingOptions FOUND IN RESPONSE ***");
            }

            // /shows/search/title returns an array directly, not a wrapped response
            var shows = JsonSerializer.Deserialize<List<V2ShowResult>>(jsonContent, _jsonOptions);

            if (shows == null)
            {
                throw new StreamingApiException(operation, "Failed to deserialize shows array response", correlationId);
            }

            // DEBUG: Log first show's streaming options
            if (shows.Any())
            {
                var firstShow = shows.First();
                Console.WriteLine($"*** FIRST SHOW: {firstShow.Title}, StreamingOptions null: {firstShow.StreamingOptions == null}, count: {firstShow.StreamingOptions?.Count ?? 0} ***");
                if (firstShow.StreamingOptions != null && firstShow.StreamingOptions.Any())
                {
                    foreach (var country in firstShow.StreamingOptions.Take(3))
                    {
                        Console.WriteLine($"*** STREAMING OPTIONS - Country: {country.Key}, Options Count: {country.Value?.Count ?? 0} ***");
                        if (country.Value?.Any() == true)
                        {
                            var first = country.Value.First();
                            Console.WriteLine($"*** FIRST OPTION: Service={first.Service?.Id}, Type={first.Type}, Quality={first.Quality} ***");
                        }
                    }
                }
            }

            // Convert V2 API results to legacy search response
            var globalSearchResults = new List<GlobalSearchResult>();
            foreach (var show in shows)
            {
                var legacyResponse = _dataNormalizer.ConvertToLegacyResponse(show);

                // BUG FIX: Extract streaming data from all countries in the V2 response
                // The V2 API returns streamingOptions as Dictionary<countryCode, List<V2StreamingOption>>
                var globalStreamingOptions = new List<GlobalStreamingOption>();
                var availableCountryCodes = new HashSet<string>();

                // Process streamingOptions which contains per-country streaming data
                if (show.StreamingOptions != null && show.StreamingOptions.Count > 0)
                {
                    foreach (var countryEntry in show.StreamingOptions)
                    {
                        var countryCode = countryEntry.Key;
                        availableCountryCodes.Add(countryCode.ToUpperInvariant());

                        if (countryEntry.Value != null)
                        {
                            foreach (var streamingOption in countryEntry.Value)
                            {
                                // The V2StreamingOption has Service.Id and Type fields
                                var serviceId = streamingOption.Service?.Id ?? "unknown";
                                var serviceName = streamingOption.Service?.Name ?? FormatServiceName(serviceId);

                                // Find or create a GlobalStreamingOption for this service
                                var existingOption = globalStreamingOptions.FirstOrDefault(o => o.ServiceId == serviceId);
                                if (existingOption == null)
                                {
                                    existingOption = new GlobalStreamingOption
                                    {
                                        ServiceId = serviceId,
                                        ServiceName = serviceName,
                                        Type = MapStreamingType(streamingOption.Type),
                                        Countries = new List<CountryAvailability>(),
                                        VideoQuality = !string.IsNullOrEmpty(streamingOption.Quality)
                                            ? new List<string> { streamingOption.Quality }
                                            : new List<string>()
                                    };
                                    globalStreamingOptions.Add(existingOption);
                                }

                                // Parse price if available
                                decimal? price = null;
                                if (streamingOption.Price != null && !string.IsNullOrEmpty(streamingOption.Price.Amount) &&
                                    decimal.TryParse(streamingOption.Price.Amount, out var parsedPrice))
                                {
                                    price = parsedPrice;
                                }

                                // Add country availability - use Link (not Url) for the streaming URL
                                existingOption.Countries.Add(new CountryAvailability
                                {
                                    CountryCode = countryCode.ToUpperInvariant(),
                                    CountryName = GetCountryName(countryCode),
                                    StreamingUrl = streamingOption.Link ?? string.Empty,
                                    Price = price,
                                    Currency = streamingOption.Price?.Currency ?? "USD"
                                });
                            }
                        }
                    }
                }

                // Fallback to legacy conversion if no streaming info was parsed
                if (!globalStreamingOptions.Any())
                {
                    globalStreamingOptions = legacyResponse.StreamingOptions.Select(option => new GlobalStreamingOption
                    {
                        ServiceId = option.ServiceId,
                        ServiceName = option.ServiceName,
                        CountryCode = option.CountryCode,
                        Type = option.Type,
                        Price = option.Price,
                        Currency = option.Currency,
                        Url = option.StreamingUrl,
                        VideoQuality = option.VideoQuality,
                        HasSubtitles = option.SubtitleLanguages.Any(),
                        HasAudioTracks = option.AudioLanguages.Any(),
                        Countries = new List<CountryAvailability>
                        {
                            new() { CountryCode = option.CountryCode, CountryName = option.CountryName }
                        }
                    }).ToList();

                    // Count countries from legacy options
                    foreach (var opt in legacyResponse.StreamingOptions)
                    {
                        if (!string.IsNullOrEmpty(opt.CountryCode))
                        {
                            availableCountryCodes.Add(opt.CountryCode.ToUpperInvariant());
                        }
                    }
                }

                // Extract poster URL from imageSet (v4 API format) with fallback to poster.url (v2 format)
                var posterUrl = _dataNormalizer.GetImageUrl(show.ImageSet);
                if (string.IsNullOrEmpty(posterUrl))
                {
                    posterUrl = show.Poster?.Url ?? string.Empty;
                }

                globalSearchResults.Add(new GlobalSearchResult
                {
                    Id = show.Id,
                    Title = show.Title,
                    Overview = show.Overview,
                    Type = legacyResponse.Type,
                    Year = show.Year,
                    ReleaseYear = show.Year,  // Bug 3 fix: populate releaseYear
                    Rating = 0,  // V2ShowResult doesn't have rating data; rating populated later from TMDB
                    PosterUrl = posterUrl,
                    StreamingOptions = globalStreamingOptions,
                    Available = legacyResponse.Available,
                    AvailableCountries = availableCountryCodes.Count,
                    AvailableServices = globalStreamingOptions.Count
                });
            }

            // Bug 4 fix: Implement client-side pagination to avoid duplicates
            var totalResults = globalSearchResults.Count;
            var skip = (page - 1) * pageSize;
            var paginatedResults = globalSearchResults.Skip(skip).Take(pageSize).ToList();

            var searchResponse = new SearchResponse<GlobalSearchResult>
            {
                Results = paginatedResults,
                TotalResults = totalResults,
                Page = page,
                PageSize = pageSize,
                HasMore = skip + pageSize < totalResults
            };

            // Cache the result for a shorter duration for search queries
            await SetCacheAsync(cacheKey, searchResponse, TimeSpan.FromMinutes(30));

            _logger.LogInformation("Successfully searched content with query '{Query}', found {ResultCount} results from {TotalShows} shows",
                query, searchResponse.Results.Count, shows.Count);

            return searchResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching content with query '{Query}': {Error}", query, ex.Message);

            await _usageTracker.TrackApiCallAsync(
                $"search_{query}",
                false,
                (int)stopwatch.ElapsedMilliseconds,
                0,
                correlationId,
                ex.Message,
                0);

            throw;
        }
    }

    public async Task<List<StreamingService>> GetSupportedServicesAsync(CancellationToken cancellationToken = default)
    {
        const string operation = "GetSupportedServices";
        var correlationId = Activity.Current?.Id;
        var cacheKey = "supported_services";

        try
        {
            // Check cache first - services don't change often
            var cachedResult = await GetFromCacheAsync<List<StreamingService>>(cacheKey);
            if (cachedResult != null)
            {
                return cachedResult;
            }

            // For now, return a static list of major streaming services
            // This can be enhanced later to call the actual API endpoint
            var services = new List<StreamingService>
            {
                new() { Name = "Netflix", DisplayName = "Netflix", WebsiteUrl = "https://netflix.com", Category = "Subscription" },
                new() { Name = "Amazon Prime Video", DisplayName = "Amazon Prime Video", WebsiteUrl = "https://amazon.com/prime", Category = "Subscription" },
                new() { Name = "Disney+", DisplayName = "Disney+", WebsiteUrl = "https://disneyplus.com", Category = "Subscription" },
                new() { Name = "HBO Max", DisplayName = "HBO Max", WebsiteUrl = "https://hbomax.com", Category = "Subscription" },
                new() { Name = "Hulu", DisplayName = "Hulu", WebsiteUrl = "https://hulu.com", Category = "Subscription" },
                new() { Name = "Paramount+", DisplayName = "Paramount+", WebsiteUrl = "https://paramountplus.com", Category = "Subscription" },
                new() { Name = "Peacock", DisplayName = "Peacock", WebsiteUrl = "https://peacocktv.com", Category = "Subscription" },
                new() { Name = "Apple TV+", DisplayName = "Apple TV+", WebsiteUrl = "https://tv.apple.com", Category = "Subscription" }
            };

            // Cache for 24 hours
            await SetCacheAsync(cacheKey, services, TimeSpan.FromHours(24));

            return services;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting supported services: {Error}", ex.Message);
            throw new StreamingApiException(operation, $"Failed to get supported services: {ex.Message}", correlationId);
        }
    }

    public async Task<List<Country>> GetSupportedCountriesAsync(CancellationToken cancellationToken = default)
    {
        const string operation = "GetSupportedCountries";
        var correlationId = Activity.Current?.Id;
        var cacheKey = "supported_countries";

        try
        {
            // Check cache first - countries don't change often
            var cachedResult = await GetFromCacheAsync<List<Country>>(cacheKey);
            if (cachedResult != null)
            {
                return cachedResult;
            }

            // For now, return a static list of major countries
            // This can be enhanced later to call the actual API endpoint
            var countries = new List<Country>
            {
                new() { Code = "us", Name = "United States", Currency = "USD" },
                new() { Code = "ca", Name = "Canada", Currency = "CAD" },
                new() { Code = "gb", Name = "United Kingdom", Currency = "GBP" },
                new() { Code = "au", Name = "Australia", Currency = "AUD" },
                new() { Code = "de", Name = "Germany", Currency = "EUR" },
                new() { Code = "fr", Name = "France", Currency = "EUR" },
                new() { Code = "jp", Name = "Japan", Currency = "JPY" },
                new() { Code = "kr", Name = "South Korea", Currency = "KRW" },
                new() { Code = "in", Name = "India", Currency = "INR" },
                new() { Code = "br", Name = "Brazil", Currency = "BRL" }
            };

            // Cache for 24 hours
            await SetCacheAsync(cacheKey, countries, TimeSpan.FromHours(24));

            return countries;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting supported countries: {Error}", ex.Message);
            throw new StreamingApiException(operation, $"Failed to get supported countries: {ex.Message}", correlationId);
        }
    }

    public async Task<ShowStreamingDetails> GetShowDetailsAsync(
        string showId,
        List<string>? userServiceIds = null,
        string? userCountry = null,
        CancellationToken cancellationToken = default)
    {
        const string operation = "GetShowDetails";
        var correlationId = Activity.Current?.Id;
        var stopwatch = Stopwatch.StartNew();

        try
        {
            _logger.LogInformation("Getting detailed streaming availability for show {ShowId}", showId);

            // Check cache first (24 hour TTL for show details)
            var cacheKey = $"show_details_{showId}";
            var cachedResult = await GetFromCacheAsync<V2ShowResult>(cacheKey);

            V2ShowResult showResult;

            if (cachedResult != null)
            {
                _logger.LogInformation("Cache hit for show details {ShowId}", showId);
                showResult = cachedResult;
            }
            else
            {
                // Check if we can make API call
                if (!await _usageTracker.CanMakeApiCallAsync())
                {
                    throw new StreamingApiException(operation, "API usage budget exceeded", correlationId);
                }

                // Call /shows/{id} endpoint for complete details
                var response = await _errorHandler.ExecuteWithRetryAsync(async () =>
                {
                    var endpoint = $"/shows/{showId}";
                    var httpResponse = await _httpClient.GetAsync(endpoint, cancellationToken);

                    await _usageTracker.TrackApiCallAsync(
                        endpoint,
                        httpResponse.IsSuccessStatusCode,
                        (int)stopwatch.ElapsedMilliseconds,
                        _settings.CurrentValue.CostPerCall,
                        correlationId,
                        httpResponse.IsSuccessStatusCode ? null : httpResponse.ReasonPhrase,
                        (int)httpResponse.StatusCode);

                    if (!httpResponse.IsSuccessStatusCode)
                    {
                        var errorContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
                        throw new StreamingApiException(operation,
                            $"API call failed: {httpResponse.StatusCode} - {errorContent}",
                            null, (int)httpResponse.StatusCode, correlationId);
                    }

                    return httpResponse;
                }, operation, cancellationToken);

                var jsonContent = await response.Content.ReadAsStringAsync(cancellationToken);
                showResult = JsonSerializer.Deserialize<V2ShowResult>(jsonContent, _jsonOptions)
                    ?? throw new StreamingApiException(operation, "Failed to deserialize show details response", correlationId);

                // Cache for 24 hours
                await SetCacheAsync(cacheKey, showResult, TimeSpan.FromHours(24));
            }

            // Convert to ShowStreamingDetails model using normalizer
            var details = _dataNormalizer.NormalizeShowDetails(showResult, userServiceIds, userCountry);

            _logger.LogInformation("Successfully retrieved streaming details for {ShowId} - {Title}",
                showId, details.Title);

            return details;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting show details for {ShowId}: {Error}", showId, ex.Message);

            await _usageTracker.TrackApiCallAsync(
                $"get_show_details_{showId}",
                false,
                (int)stopwatch.ElapsedMilliseconds,
                0,
                correlationId,
                ex.Message,
                0);

            throw;
        }
    }

    public async Task<ApiUsageStats> GetUsageStatsAsync(CancellationToken cancellationToken = default)
    {
        return await _usageTracker.GetUsageStatsAsync();
    }

    public async Task<bool> IsHealthyAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var healthCheckEndpoint = "/v4/get/services";
            var response = await _httpClient.GetAsync(healthCheckEndpoint, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    private async Task<T?> GetFromCacheAsync<T>(string key) where T : class
    {
        try
        {
            var cachedValue = await _cache.GetStringAsync(key);
            if (!string.IsNullOrEmpty(cachedValue))
            {
                return JsonSerializer.Deserialize<T>(cachedValue, _jsonOptions);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error retrieving from cache with key {Key}", key);
        }

        return null;
    }

    private async Task SetCacheAsync<T>(string key, T value, TimeSpan expiration)
    {
        try
        {
            var json = JsonSerializer.Serialize(value, _jsonOptions);
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration
            };
            await _cache.SetStringAsync(key, json, options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error setting cache with key {Key}", key);
        }
    }

    private static string GetSearchCacheKey(string query, ContentType? contentType, string[]? countries, int page, int pageSize)
    {
        var keyParts = new List<string> { query, contentType?.ToString() ?? "all", page.ToString(), pageSize.ToString() };
        if (countries?.Length > 0)
        {
            keyParts.Add(string.Join(",", countries.OrderBy(c => c)));
        }
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(string.Join("|", keyParts)));
    }

    /// <summary>
    /// Formats a service ID into a human-readable service name
    /// </summary>
    private static string FormatServiceName(string serviceId)
    {
        return serviceId.ToLowerInvariant() switch
        {
            "netflix" => "Netflix",
            "prime" or "amazon" or "amazonprime" => "Amazon Prime Video",
            "disney" or "disneyplus" => "Disney+",
            "hbo" or "hbomax" or "max" => "Max (HBO)",
            "hulu" => "Hulu",
            "paramount" or "paramountplus" => "Paramount+",
            "peacock" => "Peacock",
            "apple" or "appletv" or "appletvplus" => "Apple TV+",
            "youtube" => "YouTube",
            "googlepay" or "googleplay" => "Google Play",
            "vudu" => "Vudu",
            "showtime" => "Showtime",
            "starz" => "Starz",
            "crunchyroll" => "Crunchyroll",
            "tubi" => "Tubi",
            "pluto" or "plutotv" => "Pluto TV",
            "discovery" or "discoveryplus" => "Discovery+",
            "espn" or "espnplus" => "ESPN+",
            "mubi" => "MUBI",
            "criterion" => "Criterion Channel",
            "curiosity" or "curiositystream" => "CuriosityStream",
            "funimation" => "Funimation",
            "britbox" => "BritBox",
            "shudder" => "Shudder",
            "amc" or "amcplus" => "AMC+",
            "epix" or "mgmplus" => "MGM+",
            "hotstar" or "disneyhotstar" => "Disney+ Hotstar",
            "stan" => "Stan",
            "now" or "nowtv" => "NOW",
            "skygo" or "sky" => "Sky",
            "crave" => "Crave",
            "iqiyi" => "iQIYI",
            "wetv" => "WeTV",
            "viki" => "Viki",
            _ => char.ToUpper(serviceId[0]) + serviceId[1..] // Title case the first letter
        };
    }

    /// <summary>
    /// Maps V2 API streaming type string to StreamingType enum
    /// </summary>
    private static StreamingType MapStreamingType(string? type)
    {
        return type?.ToLowerInvariant() switch
        {
            "subscription" => StreamingType.Subscription,
            "rent" or "rental" => StreamingType.Rent,
            "buy" or "purchase" => StreamingType.Buy,
            "free" => StreamingType.Free,
            "ads" or "addon" => StreamingType.Ads, // Map addon to Ads as closest match
            _ => StreamingType.Subscription
        };
    }

    /// <summary>
    /// Gets a human-readable country name from a country code
    /// </summary>
    private static string GetCountryName(string countryCode)
    {
        return countryCode.ToUpperInvariant() switch
        {
            "US" => "United States",
            "CA" => "Canada",
            "GB" => "United Kingdom",
            "AU" => "Australia",
            "DE" => "Germany",
            "FR" => "France",
            "JP" => "Japan",
            "KR" => "South Korea",
            "IN" => "India",
            "BR" => "Brazil",
            "MX" => "Mexico",
            "ES" => "Spain",
            "IT" => "Italy",
            "NL" => "Netherlands",
            "SE" => "Sweden",
            "NO" => "Norway",
            "DK" => "Denmark",
            "FI" => "Finland",
            "PL" => "Poland",
            "AT" => "Austria",
            "CH" => "Switzerland",
            "BE" => "Belgium",
            "PT" => "Portugal",
            "IE" => "Ireland",
            "NZ" => "New Zealand",
            "SG" => "Singapore",
            "HK" => "Hong Kong",
            "TW" => "Taiwan",
            "TH" => "Thailand",
            "MY" => "Malaysia",
            "PH" => "Philippines",
            "ID" => "Indonesia",
            "VN" => "Vietnam",
            "ZA" => "South Africa",
            "AR" => "Argentina",
            "CL" => "Chile",
            "CO" => "Colombia",
            "PE" => "Peru",
            "VE" => "Venezuela",
            "TR" => "Turkey",
            "RU" => "Russia",
            "UA" => "Ukraine",
            "CZ" => "Czech Republic",
            "HU" => "Hungary",
            "RO" => "Romania",
            "GR" => "Greece",
            "IL" => "Israel",
            "AE" => "United Arab Emirates",
            "SA" => "Saudi Arabia",
            "EG" => "Egypt",
            _ => countryCode.ToUpperInvariant()
        };
    }
}