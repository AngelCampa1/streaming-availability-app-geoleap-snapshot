using System.Globalization;
using System.Text.Json;
using System.Web;
using GeoLeap.Api.Models;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;

namespace GeoLeap.Api.Services;

/// <summary>
/// TMDb API client with rate limiting, caching, and resilience
/// </summary>
public class TmdbClient : ITmdbClient, IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly IOptionsMonitor<TmdbSettings> _settings;
    private readonly IDistributedCache _cache;
    private readonly ILogger<TmdbClient> _logger;
    private readonly TmdbRateLimiter _rateLimiter;
    private readonly SemaphoreSlim _configSemaphore = new(1, 1);
    
    private TmdbConfiguration? _configuration;
    private DateTime _configLastFetched = DateTime.MinValue;
    private readonly TimeSpan _configCacheTimeout = TimeSpan.FromHours(24);
    
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    public TmdbClient(
        HttpClient httpClient,
        IOptionsMonitor<TmdbSettings> settings,
        IDistributedCache cache,
        ILogger<TmdbClient> logger)
    {
        _httpClient = httpClient;
        _settings = settings;
        _cache = cache;
        _logger = logger;
        _rateLimiter = new TmdbRateLimiter(settings.CurrentValue);
        
        ConfigureHttpClient();
    }

    private void ConfigureHttpClient()
    {
        var settings = _settings.CurrentValue;
        _httpClient.BaseAddress = new Uri(settings.BaseUrl);
        _httpClient.Timeout = TimeSpan.FromMilliseconds(settings.TimeoutMs);
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
    }

    public async Task<SearchResponse<ContentMetadata>> SearchMultiAsync(
        string query, 
        int page = 1, 
        string language = "en-US", 
        bool includeAdult = false)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new SearchResponse<ContentMetadata>();
        }

        var cacheKey = $"tmdb:search:multi:{HashString(query)}:{page}:{language}:{includeAdult}";
        var cachedResult = await GetFromCacheAsync<SearchResponse<ContentMetadata>>(cacheKey);
        if (cachedResult != null)
        {
            _logger.LogDebug("Cache hit for TMDb multi search: {Query}", query);
            return cachedResult;
        }

        var requestUri = BuildSearchUri("search/multi", query, page, language, includeAdult: includeAdult);
        
        var response = await _rateLimiter.ExecuteAsync(async () =>
        {
            var httpResponse = await _httpClient.GetAsync(requestUri);
            httpResponse.EnsureSuccessStatusCode();
            return await httpResponse.Content.ReadAsStringAsync();
        });

        var tmdbResponse = JsonSerializer.Deserialize<TmdbSearchResponse<TmdbMultiSearchResult>>(response, JsonOptions);
        var result = MapToSearchResponse(tmdbResponse);

        var cacheTimeout = TimeSpan.FromHours(_settings.CurrentValue.SearchCacheDurationHours);
        await SetCacheAsync(cacheKey, result, cacheTimeout);

        _logger.LogInformation("TMDb multi search executed successfully for query: {Query}, Page: {Page}, Language: {Language}, IncludeAdult: {IncludeAdult}, ResultCount: {ResultCount}",
            query, page, language, includeAdult, result.Results.Count);

        return result;
    }

    public async Task<SearchResponse<ContentMetadata>> SearchMoviesAsync(
        string query, 
        int page = 1, 
        string language = "en-US", 
        int? year = null,
        int? primaryReleaseYear = null,
        bool includeAdult = false)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new SearchResponse<ContentMetadata>();
        }

        var cacheKey = $"tmdb:search:movie:{HashString(query)}:{page}:{language}:{year}:{primaryReleaseYear}:{includeAdult}";
        var cachedResult = await GetFromCacheAsync<SearchResponse<ContentMetadata>>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var requestUri = BuildSearchUri("search/movie", query, page, language, year: year, primaryReleaseYear: primaryReleaseYear, includeAdult: includeAdult);
        
        var response = await _rateLimiter.ExecuteAsync(async () =>
        {
            var httpResponse = await _httpClient.GetAsync(requestUri);
            httpResponse.EnsureSuccessStatusCode();
            return await httpResponse.Content.ReadAsStringAsync();
        });

        var tmdbResponse = JsonSerializer.Deserialize<TmdbSearchResponse<TmdbMovieSearchResult>>(response, JsonOptions);
        var result = MapMovieSearchToResponse(tmdbResponse);

        var cacheTimeout = TimeSpan.FromHours(_settings.CurrentValue.SearchCacheDurationHours);
        await SetCacheAsync(cacheKey, result, cacheTimeout);

        return result;
    }

    public async Task<SearchResponse<ContentMetadata>> SearchTvShowsAsync(
        string query, 
        int page = 1, 
        string language = "en-US", 
        int? firstAirDateYear = null,
        bool includeAdult = false)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new SearchResponse<ContentMetadata>();
        }

        var cacheKey = $"tmdb:search:tv:{HashString(query)}:{page}:{language}:{firstAirDateYear}:{includeAdult}";
        var cachedResult = await GetFromCacheAsync<SearchResponse<ContentMetadata>>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var requestUri = BuildSearchUri("search/tv", query, page, language, firstAirDateYear: firstAirDateYear, includeAdult: includeAdult);
        
        var response = await _rateLimiter.ExecuteAsync(async () =>
        {
            var httpResponse = await _httpClient.GetAsync(requestUri);
            httpResponse.EnsureSuccessStatusCode();
            return await httpResponse.Content.ReadAsStringAsync();
        });

        var tmdbResponse = JsonSerializer.Deserialize<TmdbSearchResponse<TmdbTvSearchResult>>(response, JsonOptions);
        var result = MapTvSearchToResponse(tmdbResponse);

        var cacheTimeout = TimeSpan.FromHours(_settings.CurrentValue.SearchCacheDurationHours);
        await SetCacheAsync(cacheKey, result, cacheTimeout);

        return result;
    }

    public async Task<ContentMetadata?> GetMovieDetailsAsync(
        int movieId, 
        string language = "en-US", 
        string? appendToResponse = "credits,external_ids")
    {
        var cacheKey = $"tmdb:movie:{movieId}:{language}:{appendToResponse ?? "basic"}";
        var cachedResult = await GetFromCacheAsync<ContentMetadata>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var requestUri = BuildDetailsUri($"movie/{movieId}", language, appendToResponse);
        
        var response = await _rateLimiter.ExecuteAsync(async () =>
        {
            var httpResponse = await _httpClient.GetAsync(requestUri);
            if (httpResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null;
            }
            httpResponse.EnsureSuccessStatusCode();
            return await httpResponse.Content.ReadAsStringAsync();
        });

        if (response == null)
        {
            return null;
        }

        var tmdbMovie = JsonSerializer.Deserialize<TmdbMovieDetails>(response, JsonOptions);
        var result = MapMovieToContentMetadata(tmdbMovie);

        var cacheTimeout = TimeSpan.FromHours(_settings.CurrentValue.CacheDurationHours);
        await SetCacheAsync(cacheKey, result, cacheTimeout);

        return result;
    }

    public async Task<ContentMetadata?> GetTvShowDetailsAsync(
        int tvId, 
        string language = "en-US", 
        string? appendToResponse = "credits,external_ids")
    {
        var cacheKey = $"tmdb:tv:{tvId}:{language}:{appendToResponse ?? "basic"}";
        var cachedResult = await GetFromCacheAsync<ContentMetadata>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var requestUri = BuildDetailsUri($"tv/{tvId}", language, appendToResponse);
        
        var response = await _rateLimiter.ExecuteAsync(async () =>
        {
            var httpResponse = await _httpClient.GetAsync(requestUri);
            if (httpResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null;
            }
            httpResponse.EnsureSuccessStatusCode();
            return await httpResponse.Content.ReadAsStringAsync();
        });

        if (response == null)
        {
            return null;
        }

        var tmdbTv = JsonSerializer.Deserialize<TmdbTvDetails>(response, JsonOptions);
        var result = MapTvToContentMetadata(tmdbTv);

        var cacheTimeout = TimeSpan.FromHours(_settings.CurrentValue.CacheDurationHours);
        await SetCacheAsync(cacheKey, result, cacheTimeout);

        return result;
    }

    public async Task<PersonDetails?> GetPersonDetailsAsync(
        int personId, 
        string language = "en-US", 
        string? appendToResponse = "external_ids")
    {
        var cacheKey = $"tmdb:person:{personId}:{language}:{appendToResponse ?? "basic"}";
        var cachedResult = await GetFromCacheAsync<PersonDetails>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var requestUri = BuildDetailsUri($"person/{personId}", language, appendToResponse);
        
        var response = await _rateLimiter.ExecuteAsync(async () =>
        {
            var httpResponse = await _httpClient.GetAsync(requestUri);
            if (httpResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null;
            }
            httpResponse.EnsureSuccessStatusCode();
            return await httpResponse.Content.ReadAsStringAsync();
        });

        if (response == null)
        {
            return null;
        }

        var tmdbPerson = JsonSerializer.Deserialize<TmdbPersonDetails>(response, JsonOptions);
        var result = MapPersonToDetails(tmdbPerson);

        var cacheTimeout = TimeSpan.FromHours(_settings.CurrentValue.CacheDurationHours);
        await SetCacheAsync(cacheKey, result, cacheTimeout);

        return result;
    }

    public async Task<List<Genre>> GetMovieGenresAsync(string language = "en-US")
    {
        var cacheKey = $"tmdb:genres:movie:{language}";
        var cachedResult = await GetFromCacheAsync<List<Genre>>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var requestUri = BuildGenreUri("genre/movie/list", language);
        
        var response = await _rateLimiter.ExecuteAsync(async () =>
        {
            var httpResponse = await _httpClient.GetAsync(requestUri);
            httpResponse.EnsureSuccessStatusCode();
            return await httpResponse.Content.ReadAsStringAsync();
        });

        var tmdbResponse = JsonSerializer.Deserialize<TmdbGenreResponse>(response, JsonOptions);
        var result = tmdbResponse?.Genres?.Select(g => new Genre { Id = g.Id, Name = g.Name ?? string.Empty }).ToList() ?? new List<Genre>();

        var cacheTimeout = TimeSpan.FromDays(_settings.CurrentValue.GenreCacheDurationDays);
        await SetCacheAsync(cacheKey, result, cacheTimeout);

        return result;
    }

    public async Task<List<Genre>> GetTvGenresAsync(string language = "en-US")
    {
        var cacheKey = $"tmdb:genres:tv:{language}";
        var cachedResult = await GetFromCacheAsync<List<Genre>>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var requestUri = BuildGenreUri("genre/tv/list", language);
        
        var response = await _rateLimiter.ExecuteAsync(async () =>
        {
            var httpResponse = await _httpClient.GetAsync(requestUri);
            httpResponse.EnsureSuccessStatusCode();
            return await httpResponse.Content.ReadAsStringAsync();
        });

        var tmdbResponse = JsonSerializer.Deserialize<TmdbGenreResponse>(response, JsonOptions);
        var result = tmdbResponse?.Genres?.Select(g => new Genre { Id = g.Id, Name = g.Name ?? string.Empty }).ToList() ?? new List<Genre>();

        var cacheTimeout = TimeSpan.FromDays(_settings.CurrentValue.GenreCacheDurationDays);
        await SetCacheAsync(cacheKey, result, cacheTimeout);

        return result;
    }

    public string GetImageUrl(string? imagePath, ImageSize size = ImageSize.Original)
    {
        if (string.IsNullOrWhiteSpace(imagePath))
        {
            return GetPlaceholderImageUrl();
        }

        var settings = _settings.CurrentValue;
        var sizeString = GetSizeString(size);
        
        return $"{settings.ImageBaseUrl}{sizeString}{imagePath}";
    }

    public async Task<TmdbConfiguration?> GetConfigurationAsync()
    {
        if (_configuration != null && DateTime.UtcNow - _configLastFetched < _configCacheTimeout)
        {
            return _configuration;
        }

        await _configSemaphore.WaitAsync();
        try
        {
            // Double-check pattern
            if (_configuration != null && DateTime.UtcNow - _configLastFetched < _configCacheTimeout)
            {
                return _configuration;
            }

            var requestUri = $"configuration?api_key={_settings.CurrentValue.ApiKey}";
            
            var response = await _rateLimiter.ExecuteAsync(async () =>
            {
                var httpResponse = await _httpClient.GetAsync(requestUri);
                httpResponse.EnsureSuccessStatusCode();
                return await httpResponse.Content.ReadAsStringAsync();
            });

            _configuration = JsonSerializer.Deserialize<TmdbConfiguration>(response, JsonOptions);
            _configLastFetched = DateTime.UtcNow;

            return _configuration;
        }
        finally
        {
            _configSemaphore.Release();
        }
    }

    #region Private Helper Methods

    private string BuildSearchUri(string endpoint, string query, int page, string language, int? year = null, int? primaryReleaseYear = null, int? firstAirDateYear = null, bool includeAdult = false)
    {
        var queryParams = HttpUtility.ParseQueryString(string.Empty);
        queryParams.Add("api_key", _settings.CurrentValue.ApiKey);
        queryParams.Add("query", query);
        queryParams.Add("page", page.ToString());
        queryParams.Add("language", language);
        queryParams.Add("include_adult", includeAdult.ToString().ToLower());
        
        if (year.HasValue)
            queryParams.Add("year", year.Value.ToString());
            
        if (primaryReleaseYear.HasValue)
            queryParams.Add("primary_release_year", primaryReleaseYear.Value.ToString());
            
        if (firstAirDateYear.HasValue)
            queryParams.Add("first_air_date_year", firstAirDateYear.Value.ToString());

        return $"{endpoint}?{queryParams}";
    }

    private string BuildDetailsUri(string endpoint, string language, string? appendToResponse)
    {
        var queryParams = HttpUtility.ParseQueryString(string.Empty);
        queryParams.Add("api_key", _settings.CurrentValue.ApiKey);
        queryParams.Add("language", language);
        
        if (!string.IsNullOrEmpty(appendToResponse))
            queryParams.Add("append_to_response", appendToResponse);

        return $"{endpoint}?{queryParams}";
    }

    private string BuildGenreUri(string endpoint, string language)
    {
        var queryParams = HttpUtility.ParseQueryString(string.Empty);
        queryParams.Add("api_key", _settings.CurrentValue.ApiKey);
        queryParams.Add("language", language);

        return $"{endpoint}?{queryParams}";
    }

    private string GetSizeString(ImageSize size)
    {
        return size switch
        {
            ImageSize.W92 => "w92",
            ImageSize.W154 => "w154",
            ImageSize.W185 => "w185",
            ImageSize.W342 => "w342",
            ImageSize.W500 => "w500",
            ImageSize.W780 => "w780",
            ImageSize.W1280 => "w1280",
            ImageSize.Original => "original",
            _ => "original"
        };
    }

    private string GetPlaceholderImageUrl()
    {
        return "/images/placeholder-poster.jpg";
    }

    private string HashString(string input)
    {
        var hash = input.GetHashCode();
        return Math.Abs(hash).ToString();
    }

    private async Task<T?> GetFromCacheAsync<T>(string key) where T : class
    {
        try
        {
            var cached = await _cache.GetStringAsync(key);
            if (cached != null)
            {
                return JsonSerializer.Deserialize<T>(cached, JsonOptions);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve from cache: {Key}", key);
        }
        
        return null;
    }

    private async Task SetCacheAsync<T>(string key, T value, TimeSpan expiration)
    {
        try
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration
            };
            
            var serialized = JsonSerializer.Serialize(value, JsonOptions);
            await _cache.SetStringAsync(key, serialized, options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to set cache: {Key}", key);
        }
    }

    private SearchResponse<ContentMetadata> MapToSearchResponse(TmdbSearchResponse<TmdbMultiSearchResult>? tmdbResponse)
    {
        if (tmdbResponse == null)
        {
            return new SearchResponse<ContentMetadata>();
        }

        var results = tmdbResponse.Results.Select(MapMultiSearchResultToContentMetadata).Where(r => r != null).ToList();

        return new SearchResponse<ContentMetadata>
        {
            Page = tmdbResponse.Page,
            Results = results!,
            // TotalPages is computed automatically from TotalResults and PageSize
            TotalResults = tmdbResponse.TotalResults
        };
    }

    private SearchResponse<ContentMetadata> MapMovieSearchToResponse(TmdbSearchResponse<TmdbMovieSearchResult>? tmdbResponse)
    {
        if (tmdbResponse == null)
        {
            return new SearchResponse<ContentMetadata>();
        }

        var results = tmdbResponse.Results.Select(MapMovieSearchResultToContentMetadata).ToList();

        return new SearchResponse<ContentMetadata>
        {
            Page = tmdbResponse.Page,
            Results = results,
            // TotalPages is computed automatically from TotalResults and PageSize
            TotalResults = tmdbResponse.TotalResults
        };
    }

    private SearchResponse<ContentMetadata> MapTvSearchToResponse(TmdbSearchResponse<TmdbTvSearchResult>? tmdbResponse)
    {
        if (tmdbResponse == null)
        {
            return new SearchResponse<ContentMetadata>();
        }

        var results = tmdbResponse.Results.Select(MapTvSearchResultToContentMetadata).ToList();

        return new SearchResponse<ContentMetadata>
        {
            Page = tmdbResponse.Page,
            Results = results,
            // TotalPages is computed automatically from TotalResults and PageSize
            TotalResults = tmdbResponse.TotalResults
        };
    }

    private ContentMetadata? MapMultiSearchResultToContentMetadata(TmdbMultiSearchResult result)
    {
        var type = result.MediaType?.ToLower() switch
        {
            "movie" => TmdbContentType.Movie,
            "tv" => TmdbContentType.TvSeries,
            "person" => TmdbContentType.Person,
            _ => (TmdbContentType?)null
        };

        if (!type.HasValue || type.Value == TmdbContentType.Person)
        {
            return null; // Skip person results in content search
        }

        return new ContentMetadata
        {
            TmdbId = result.Id,
            Type = type.Value,
            Title = result.Title ?? result.Name ?? string.Empty,
            OriginalTitle = result.OriginalTitle ?? result.OriginalName,
            Overview = result.Overview,
            ReleaseDate = ParseDate(result.ReleaseDate ?? result.FirstAirDate),
            VoteAverage = result.VoteAverage,
            VoteCount = result.VoteCount,
            Popularity = result.Popularity,
            PosterPath = result.PosterPath,
            BackdropPath = result.BackdropPath,
            OriginalLanguage = result.OriginalLanguage,
            Adult = result.Adult,
            Genres = new List<string>() // Genre names would need to be resolved from IDs
        };
    }

    private ContentMetadata MapMovieSearchResultToContentMetadata(TmdbMovieSearchResult result)
    {
        return new ContentMetadata
        {
            TmdbId = result.Id,
            Type = TmdbContentType.Movie,
            Title = result.Title ?? string.Empty,
            OriginalTitle = result.OriginalTitle,
            Overview = result.Overview,
            ReleaseDate = ParseDate(result.ReleaseDate),
            VoteAverage = result.VoteAverage,
            VoteCount = result.VoteCount,
            Popularity = result.Popularity,
            PosterPath = result.PosterPath,
            BackdropPath = result.BackdropPath,
            OriginalLanguage = result.OriginalLanguage,
            Adult = result.Adult,
            Genres = new List<string>()
        };
    }

    private ContentMetadata MapTvSearchResultToContentMetadata(TmdbTvSearchResult result)
    {
        return new ContentMetadata
        {
            TmdbId = result.Id,
            Type = TmdbContentType.TvSeries,
            Title = result.Name ?? string.Empty,
            OriginalTitle = result.OriginalName,
            Overview = result.Overview,
            ReleaseDate = ParseDate(result.FirstAirDate),
            VoteAverage = result.VoteAverage,
            VoteCount = result.VoteCount,
            Popularity = result.Popularity,
            PosterPath = result.PosterPath,
            BackdropPath = result.BackdropPath,
            OriginalLanguage = result.OriginalLanguage,
            Adult = result.Adult,
            ProductionCountries = result.OriginCountry,
            Genres = new List<string>()
        };
    }

    private ContentMetadata? MapMovieToContentMetadata(TmdbMovieDetails? movie)
    {
        if (movie == null) return null;

        return new ContentMetadata
        {
            TmdbId = movie.Id,
            Type = TmdbContentType.Movie,
            Title = movie.Title ?? string.Empty,
            OriginalTitle = movie.OriginalTitle,
            Overview = movie.Overview,
            ReleaseDate = ParseDate(movie.ReleaseDate),
            Runtime = movie.Runtime,
            VoteAverage = movie.VoteAverage,
            VoteCount = movie.VoteCount,
            Popularity = movie.Popularity,
            PosterPath = movie.PosterPath,
            BackdropPath = movie.BackdropPath,
            Genres = movie.Genres?.Select(g => g.Name ?? string.Empty).Where(n => !string.IsNullOrEmpty(n)).ToList() ?? new List<string>(),
            ProductionCountries = movie.ProductionCountries?.Select(pc => pc.Name ?? string.Empty).Where(n => !string.IsNullOrEmpty(n)).ToList() ?? new List<string>(),
            OriginalLanguages = movie.SpokenLanguages?.Select(sl => sl.EnglishName ?? string.Empty).Where(n => !string.IsNullOrEmpty(n)).ToList() ?? new List<string>(),
            OriginalLanguage = movie.OriginalLanguage,
            Adult = movie.Adult,
            Budget = movie.Budget,
            Revenue = movie.Revenue,
            Status = movie.Status,
            Tagline = movie.Tagline,
            Homepage = movie.Homepage,
            Cast = movie.Credits?.Cast?.Select(MapCastMember).ToList() ?? new List<CastMember>(),
            Crew = movie.Credits?.Crew?.Select(MapCrewMember).ToList() ?? new List<CrewMember>(),
            ExternalIds = MapExternalIds(movie.ExternalIds)
        };
    }

    private ContentMetadata? MapTvToContentMetadata(TmdbTvDetails? tv)
    {
        if (tv == null) return null;

        return new ContentMetadata
        {
            TmdbId = tv.Id,
            Type = TmdbContentType.TvSeries,
            Title = tv.Name ?? string.Empty,
            OriginalTitle = tv.OriginalName,
            Overview = tv.Overview,
            ReleaseDate = ParseDate(tv.FirstAirDate),
            NumberOfSeasons = tv.NumberOfSeasons,
            NumberOfEpisodes = tv.NumberOfEpisodes,
            VoteAverage = tv.VoteAverage,
            VoteCount = tv.VoteCount,
            Popularity = tv.Popularity,
            PosterPath = tv.PosterPath,
            BackdropPath = tv.BackdropPath,
            Genres = tv.Genres?.Select(g => g.Name ?? string.Empty).Where(n => !string.IsNullOrEmpty(n)).ToList() ?? new List<string>(),
            ProductionCountries = tv.ProductionCountries?.Select(pc => pc.Name ?? string.Empty).Where(n => !string.IsNullOrEmpty(n)).ToList() ?? new List<string>(),
            OriginalLanguages = tv.SpokenLanguages?.Select(sl => sl.EnglishName ?? string.Empty).Where(n => !string.IsNullOrEmpty(n)).ToList() ?? new List<string>(),
            OriginalLanguage = tv.OriginalLanguage,
            Adult = tv.Adult,
            Status = tv.Status,
            Tagline = tv.Tagline,
            Homepage = tv.Homepage,
            Cast = tv.Credits?.Cast?.Select(MapCastMember).ToList() ?? new List<CastMember>(),
            Crew = tv.Credits?.Crew?.Select(MapCrewMember).ToList() ?? new List<CrewMember>(),
            ExternalIds = MapExternalIds(tv.ExternalIds)
        };
    }

    private PersonDetails? MapPersonToDetails(TmdbPersonDetails? person)
    {
        if (person == null) return null;

        return new PersonDetails
        {
            Id = person.Id,
            Name = person.Name ?? string.Empty,
            Biography = person.Biography,
            Birthday = ParseDate(person.Birthday),
            Deathday = ParseDate(person.Deathday),
            Gender = person.Gender,
            Homepage = person.Homepage,
            PlaceOfBirth = person.PlaceOfBirth,
            ProfilePath = person.ProfilePath,
            AlsoKnownAs = person.AlsoKnownAs,
            Popularity = person.Popularity,
            KnownForDepartment = person.KnownForDepartment,
            ExternalIds = MapExternalIds(person.ExternalIds)
        };
    }

    private CastMember MapCastMember(TmdbCastMember cast)
    {
        return new CastMember
        {
            PersonId = cast.Id,
            Name = cast.Name ?? string.Empty,
            Character = cast.Character,
            ProfilePath = cast.ProfilePath,
            Order = cast.Order,
            CreditId = cast.CreditId,
            Gender = cast.Gender
        };
    }

    private CrewMember MapCrewMember(TmdbCrewMember crew)
    {
        return new CrewMember
        {
            PersonId = crew.Id,
            Name = crew.Name ?? string.Empty,
            Job = crew.Job ?? string.Empty,
            Department = crew.Department ?? string.Empty,
            ProfilePath = crew.ProfilePath,
            CreditId = crew.CreditId,
            Gender = crew.Gender
        };
    }

    private List<TmdbExternalId> MapExternalIds(TmdbExternalIds? externalIds)
    {
        var result = new List<TmdbExternalId>();
        
        if (externalIds == null) return result;

        if (!string.IsNullOrEmpty(externalIds.ImdbId))
            result.Add(new TmdbExternalId { Source = "IMDB", ExternalIdValue = externalIds.ImdbId });
            
        if (externalIds.TvdbId.HasValue)
            result.Add(new TmdbExternalId { Source = "TVDB", ExternalIdValue = externalIds.TvdbId.Value.ToString() });
            
        if (!string.IsNullOrEmpty(externalIds.FacebookId))
            result.Add(new TmdbExternalId { Source = "Facebook", ExternalIdValue = externalIds.FacebookId });
            
        if (!string.IsNullOrEmpty(externalIds.InstagramId))
            result.Add(new TmdbExternalId { Source = "Instagram", ExternalIdValue = externalIds.InstagramId });
            
        if (!string.IsNullOrEmpty(externalIds.TwitterId))
            result.Add(new TmdbExternalId { Source = "Twitter", ExternalIdValue = externalIds.TwitterId });

        return result;
    }

    private DateTime? ParseDate(string? dateString)
    {
        if (string.IsNullOrWhiteSpace(dateString))
            return null;
            
        if (DateTime.TryParseExact(dateString, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            return date;
            
        return null;
    }

    #endregion

    public async Task<List<ContentMetadata>> GetPopularMoviesAsync(int page = 1, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"tmdb:popular:movie:{page}";
        var cachedResult = await GetFromCacheAsync<List<ContentMetadata>>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var requestUri = $"movie/popular?page={page}&language=en-US";

        var response = await _rateLimiter.ExecuteAsync(async () =>
        {
            var httpResponse = await _httpClient.GetAsync(requestUri, cancellationToken);
            httpResponse.EnsureSuccessStatusCode();
            return await httpResponse.Content.ReadAsStringAsync(cancellationToken);
        });

        var tmdbResponse = JsonSerializer.Deserialize<TmdbSearchResponse<TmdbMovieSearchResult>>(response, JsonOptions);
        var mapped = MapMovieSearchToResponse(tmdbResponse);
        var result = mapped.Results;

        var cacheTimeout = TimeSpan.FromHours(_settings.CurrentValue.SearchCacheDurationHours);
        await SetCacheAsync(cacheKey, result, cacheTimeout);

        return result;
    }

    public async Task<List<ContentMetadata>> GetPopularTvShowsAsync(int page = 1, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"tmdb:popular:tv:{page}";
        var cachedResult = await GetFromCacheAsync<List<ContentMetadata>>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var requestUri = $"tv/popular?page={page}&language=en-US";

        var response = await _rateLimiter.ExecuteAsync(async () =>
        {
            var httpResponse = await _httpClient.GetAsync(requestUri, cancellationToken);
            httpResponse.EnsureSuccessStatusCode();
            return await httpResponse.Content.ReadAsStringAsync(cancellationToken);
        });

        var tmdbResponse = JsonSerializer.Deserialize<TmdbSearchResponse<TmdbTvSearchResult>>(response, JsonOptions);
        var mapped = MapTvSearchToResponse(tmdbResponse);
        var result = mapped.Results;

        var cacheTimeout = TimeSpan.FromHours(_settings.CurrentValue.SearchCacheDurationHours);
        await SetCacheAsync(cacheKey, result, cacheTimeout);

        return result;
    }

    public void Dispose()
    {
        _configSemaphore?.Dispose();
        _rateLimiter?.Dispose();
    }
}

/// <summary>
/// Rate limiter for TMDb API requests
/// </summary>
public class TmdbRateLimiter : IDisposable
{
    private readonly SemaphoreSlim _semaphore;
    private readonly Queue<DateTime> _requestTimes = new();
    private readonly object _lock = new();
    private readonly TmdbSettings _settings;

    public TmdbRateLimiter(TmdbSettings settings)
    {
        _settings = settings;
        _semaphore = new SemaphoreSlim(settings.RateLimitPerSecond, settings.RateLimitPerSecond);
    }

    public async Task<T> ExecuteAsync<T>(Func<Task<T>> operation)
    {
        await _semaphore.WaitAsync();
        
        try
        {
            await EnsureRateLimitCompliance();
            
            lock (_lock)
            {
                _requestTimes.Enqueue(DateTime.UtcNow);
            }
            
            return await operation();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private async Task EnsureRateLimitCompliance()
    {
        TimeSpan waitTime = TimeSpan.Zero;
        
        lock (_lock)
        {
            var now = DateTime.UtcNow;
            var cutoff = now.AddSeconds(-10);
            
            // Remove requests older than 10 seconds
            while (_requestTimes.Count > 0 && _requestTimes.Peek() < cutoff)
            {
                _requestTimes.Dequeue();
            }
            
            // Check if we need to wait
            if (_requestTimes.Count >= _settings.MaxRequestsPer10Seconds)
            {
                var oldestRequest = _requestTimes.Peek();
                waitTime = oldestRequest.AddSeconds(10) - now;
            }
        }
        
        // Perform async wait outside of lock to prevent deadlock
        if (waitTime > TimeSpan.Zero)
        {
            await Task.Delay(waitTime);
        }
    }

    public void Dispose()
    {
        _semaphore?.Dispose();
    }
}