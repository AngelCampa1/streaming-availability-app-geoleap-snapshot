using GeoLeap.Api.Models;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Services;

/// <summary>
/// TMDb data provider implementation with rate limiting and health monitoring
/// </summary>
public class TmdbDataProvider : IDataProvider
{
    public string Id => "tmdb";
    public string Name => "The Movie Database";
    public ProviderType ProviderType => ProviderType.ContentMetadata;
    public ProviderCapability Capabilities => ProviderCapability.Search | 
                                              ProviderCapability.ContentDetails | 
                                              ProviderCapability.PersonDetails | 
                                              ProviderCapability.Genres;

    private readonly ITmdbClient _client;
    private readonly ILogger<TmdbDataProvider> _logger;
    private readonly ConcurrentQueue<DateTime> _requestTimestamps = new();
    private readonly SemaphoreSlim _rateLimitSemaphore = new(40, 40); // TMDb allows 40 requests per 10 seconds
    private readonly object _statsLock = new();
    private ProviderStats _stats = new();

    public TmdbDataProvider(ITmdbClient client, ILogger<TmdbDataProvider> logger)
    {
        _client = client;
        _logger = logger;
    }

    public async Task<bool> CheckHealthAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var config = await _client.GetConfigurationAsync();
            return config != null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TMDb health check failed");
            return false;
        }
    }

    public async Task<ProviderSearchResult> SearchContentAsync(ContentSearchRequest request, CancellationToken cancellationToken = default)
    {
        await EnsureRateLimitAsync(cancellationToken);
        
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            var result = await _client.SearchMultiAsync(
                request.Query, 
                request.Page, 
                request.Language ?? "en-US");
            
            stopwatch.Stop();
            await RecordRequestAsync(cancellationToken);
            RecordSuccess(stopwatch.Elapsed);
            
            return new ProviderSearchResult
            {
                Results = result.Results.Select(r => new ProviderContentSummary
                {
                    Id = r.TmdbId.ToString(),
                    Title = r.Title,
                    OriginalTitle = r.OriginalTitle ?? r.Title,
                    Type = r.Type == TmdbContentType.Movie ? ContentType.Movie : ContentType.TvSeries,
                    Year = r.ReleaseDate?.Year,
                    Overview = r.Overview ?? "",
                    Genres = new List<string>(), // Will be populated later if needed
                    ImageUrl = _client.GetImageUrl(r.PosterPath, ImageSize.W342),
                    Rating = r.VoteAverage.HasValue ? (decimal)r.VoteAverage.Value : null,
                    ProviderId = Id
                }).ToList(),
                TotalCount = result.TotalResults,
                Page = result.Page,
                PageSize = request.PageSize,
                ProviderId = Id,
                SearchedAt = DateTime.UtcNow,
                ResponseTime = stopwatch.Elapsed
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            RecordError();
            _logger.LogError(ex, "TMDb search failed for query: {Query}", request.Query);
            throw;
        }
    }

    public async Task<ProviderContentDetails> GetContentDetailsAsync(string contentId, ContentType type, CancellationToken cancellationToken = default)
    {
        await EnsureRateLimitAsync(cancellationToken);
        
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            if (!int.TryParse(contentId, out var tmdbId))
            {
                throw new ArgumentException($"Invalid TMDb content ID: {contentId}");
            }
            
            var content = type == ContentType.Movie
                ? await _client.GetMovieDetailsAsync(tmdbId)
                : await _client.GetTvShowDetailsAsync(tmdbId);
            
            if (content == null)
            {
                throw new InvalidOperationException($"Content not found: {contentId}");
            }
            
            stopwatch.Stop();
            await RecordRequestAsync(cancellationToken);
            RecordSuccess(stopwatch.Elapsed);
            
            return new ProviderContentDetails
            {
                Id = contentId,
                Title = content.Title,
                OriginalTitle = content.OriginalTitle ?? content.Title,
                Overview = content.Overview ?? "",
                ReleaseDate = content.ReleaseDate,
                Type = content.Type == TmdbContentType.Movie ? ContentType.Movie : ContentType.TvSeries,
                Genres = content.Genres?.Select(g => g).ToList() ?? new List<string>(),
                Cast = content.Cast?.Select(c => new ProviderCastMember
                {
                    Name = c.Name,
                    Character = c.Character ?? "",
                    ProfilePath = _client.GetImageUrl(c.ProfilePath, ImageSize.W185),
                    Order = c.Order
                }).ToList() ?? new(),
                Crew = content.Crew?.Select(c => new ProviderCrewMember
                {
                    Name = c.Name,
                    Job = c.Job,
                    Department = c.Department,
                    ProfilePath = _client.GetImageUrl(c.ProfilePath, ImageSize.W185)
                }).ToList() ?? new(),
                Rating = content.VoteAverage.HasValue ? (decimal)content.VoteAverage.Value : null,
                VoteCount = content.VoteCount,
                PosterUrl = _client.GetImageUrl(content.PosterPath, ImageSize.W500),
                BackdropUrl = _client.GetImageUrl(content.BackdropPath, ImageSize.W1280),
                ProviderId = Id
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            RecordError();
            _logger.LogError(ex, "TMDb get content details failed for ID: {ContentId}", contentId);
            throw;
        }
    }

    public async Task<ProviderStreamingAvailability> GetStreamingAvailabilityAsync(string contentId, string? countryCode = null, CancellationToken cancellationToken = default)
    {
        // TMDb doesn't provide streaming availability directly
        throw new NotSupportedException("TMDb provider does not support streaming availability data");
    }

    public async Task<ProviderPersonDetails> GetPersonDetailsAsync(string personId, CancellationToken cancellationToken = default)
    {
        await EnsureRateLimitAsync(cancellationToken);
        
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            if (!int.TryParse(personId, out var tmdbPersonId))
            {
                throw new ArgumentException($"Invalid TMDb person ID: {personId}");
            }
            
            var person = await _client.GetPersonDetailsAsync(tmdbPersonId);
            
            stopwatch.Stop();
            await RecordRequestAsync(cancellationToken);
            RecordSuccess(stopwatch.Elapsed);
            
            return new ProviderPersonDetails
            {
                Id = personId,
                Name = person.Name,
                Biography = person.Biography ?? "",
                Birthday = person.Birthday,
                Deathday = person.Deathday,
                PlaceOfBirth = person.PlaceOfBirth,
                ProfileUrl = _client.GetImageUrl(person.ProfilePath, ImageSize.W500),
                ProviderId = Id
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            RecordError();
            _logger.LogError(ex, "TMDb get person details failed for ID: {PersonId}", personId);
            throw;
        }
    }

    public async Task<List<ProviderGenre>> GetGenresAsync(ContentType type, CancellationToken cancellationToken = default)
    {
        await EnsureRateLimitAsync(cancellationToken);
        
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            var genres = type == ContentType.Movie
                ? await _client.GetMovieGenresAsync()
                : await _client.GetTvGenresAsync();
            
            stopwatch.Stop();
            await RecordRequestAsync(cancellationToken);
            RecordSuccess(stopwatch.Elapsed);
            
            return genres.Select(g => new ProviderGenre
            {
                Id = g.Id.ToString(),
                Name = g.Name
            }).ToList();
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            RecordError();
            _logger.LogError(ex, "TMDb get genres failed for type: {Type}", type);
            throw;
        }
    }

    public async Task<List<ProviderStreamingService>> GetAvailableServicesAsync(string? countryCode = null, CancellationToken cancellationToken = default)
    {
        // TMDb doesn't provide streaming services directly
        return new List<ProviderStreamingService>();
    }

    public async Task<ProviderStats> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        lock (_statsLock)
        {
            return new ProviderStats
            {
                RequestsToday = _stats.RequestsToday,
                RequestsThisMonth = _stats.RequestsThisMonth,
                SuccessfulRequests = _stats.SuccessfulRequests,
                FailedRequests = _stats.FailedRequests,
                AverageResponseTime = _stats.AverageResponseTime,
                CostToday = _stats.CostToday,
                CostThisMonth = _stats.CostThisMonth
            };
        }
    }

    public ProviderRateLimitInfo GetRateLimitInfo()
    {
        var now = DateTime.UtcNow;
        var oneMinuteAgo = now.AddMinutes(-1);
        
        // Clean old timestamps
        while (_requestTimestamps.TryPeek(out var timestamp) && timestamp < oneMinuteAgo)
        {
            _requestTimestamps.TryDequeue(out _);
        }
        
        return new ProviderRateLimitInfo
        {
            RequestsPerMinute = 40, // TMDb limit
            RequestsPerHour = 2400,
            RequestsPerDay = 57600,
            CurrentMinuteCount = _requestTimestamps.Count,
            NextResetTime = now.AddMinutes(1).AddSeconds(-now.Second).AddMilliseconds(-now.Millisecond)
        };
    }

    public async Task<bool> CanMakeRequestAsync(CancellationToken cancellationToken = default)
    {
        var rateLimitInfo = GetRateLimitInfo();
        return rateLimitInfo.CurrentMinuteCount < rateLimitInfo.RequestsPerMinute;
    }

    public async Task RecordRequestAsync(CancellationToken cancellationToken = default)
    {
        _requestTimestamps.Enqueue(DateTime.UtcNow);
        
        lock (_statsLock)
        {
            _stats.RequestsToday++;
            _stats.RequestsThisMonth++;
        }
    }

    private async Task EnsureRateLimitAsync(CancellationToken cancellationToken)
    {
        await _rateLimitSemaphore.WaitAsync(cancellationToken);
        
        try
        {
            if (!await CanMakeRequestAsync(cancellationToken))
            {
                var delay = TimeSpan.FromSeconds(10); // Wait 10 seconds if rate limited
                _logger.LogWarning("TMDb rate limit reached, waiting {Delay}ms", delay.TotalMilliseconds);
                await Task.Delay(delay, cancellationToken);
            }
        }
        finally
        {
            _rateLimitSemaphore.Release();
        }
    }

    private void RecordSuccess(TimeSpan responseTime)
    {
        lock (_statsLock)
        {
            _stats.SuccessfulRequests++;
            var currentAvg = _stats.AverageResponseTime.TotalMilliseconds;
            var newAvg = currentAvg == 0 ? responseTime.TotalMilliseconds : (currentAvg * 0.8) + (responseTime.TotalMilliseconds * 0.2);
            _stats.AverageResponseTime = TimeSpan.FromMilliseconds(newAvg);
        }
    }

    private void RecordError()
    {
        lock (_statsLock)
        {
            _stats.FailedRequests++;
        }
    }
}