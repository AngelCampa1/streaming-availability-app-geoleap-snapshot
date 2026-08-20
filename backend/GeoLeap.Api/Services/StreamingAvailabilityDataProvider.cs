using GeoLeap.Api.Models;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Services;

/// <summary>
/// Streaming Availability API data provider implementation with rate limiting and health monitoring
/// </summary>
public class StreamingAvailabilityDataProvider : IDataProvider
{
    public string Id => "streaming-availability";
    public string Name => "Streaming Availability API";
    public ProviderType ProviderType => ProviderType.StreamingAvailability;
    public ProviderCapability Capabilities => ProviderCapability.Search | 
                                              ProviderCapability.StreamingAvailability |
                                              ProviderCapability.ContentDetails;

    private readonly IStreamingAvailabilityClient _client;
    private readonly ILogger<StreamingAvailabilityDataProvider> _logger;
    private readonly ConcurrentQueue<DateTime> _requestTimestamps = new();
    private readonly SemaphoreSlim _rateLimitSemaphore = new(10, 10); // Conservative rate limiting
    private readonly object _statsLock = new();
    private ProviderStats _stats = new();

    public StreamingAvailabilityDataProvider(
        IStreamingAvailabilityClient client, 
        ILogger<StreamingAvailabilityDataProvider> logger)
    {
        _client = client;
        _logger = logger;
    }

    public async Task<bool> CheckHealthAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _client.IsHealthyAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Streaming Availability health check failed");
            return false;
        }
    }

    public async Task<ProviderSearchResult> SearchContentAsync(ContentSearchRequest request, CancellationToken cancellationToken = default)
    {
        await EnsureRateLimitAsync(cancellationToken);
        
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            var result = await _client.SearchContentAsync(
                request.Query, 
                request.ContentType, 
                request.Countries,
                request.Page,
                request.PageSize,
                cancellationToken);
            
            stopwatch.Stop();
            await RecordRequestAsync(cancellationToken);
            RecordSuccess(stopwatch.Elapsed);
            
            return new ProviderSearchResult
            {
                Results = result.Results.Select(r => new ProviderContentSummary
                {
                    Id = r.Id,
                    Title = r.Title,
                    OriginalTitle = r.Title, // SearchResult doesn't have OriginalTitle
                    Type = r.Type,
                    Year = r.Year,
                    Overview = r.Overview ?? "",
                    Genres = r.Genres ?? new List<string>(),
                    ImageUrl = r.ImageUrl ?? "",
                    Rating = null, // Streaming API might not have ratings
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
            _logger.LogError(ex, "Streaming Availability search failed for query: {Query}", request.Query);
            throw;
        }
    }

    public async Task<ProviderContentDetails> GetContentDetailsAsync(string contentId, ContentType type, CancellationToken cancellationToken = default)
    {
        await EnsureRateLimitAsync(cancellationToken);
        
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            // Streaming API typically doesn't have separate content details endpoint
            // Return basic details from content ID
            return new ProviderContentDetails
            {
                Id = contentId,
                Title = "Unknown Title",
                OriginalTitle = "Unknown Title",
                Overview = "",
                ReleaseDate = null,
                Type = type,
                Genres = new List<string>(),
                Cast = new List<ProviderCastMember>(),
                Crew = new List<ProviderCrewMember>(),
                Rating = null,
                VoteCount = null,
                PosterUrl = "",
                BackdropUrl = "",
                ProviderId = Id
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            RecordError();
            _logger.LogError(ex, "Streaming Availability get content details failed for ID: {ContentId}", contentId);
            throw;
        }
    }

    public async Task<ProviderStreamingAvailability> GetStreamingAvailabilityAsync(string contentId, string? countryCode = null, CancellationToken cancellationToken = default)
    {
        await EnsureRateLimitAsync(cancellationToken);
        
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            var availability = await _client.GetAvailabilityAsync(contentId, ContentType.Movie, cancellationToken);
            
            stopwatch.Stop();
            await RecordRequestAsync(cancellationToken);
            RecordSuccess(stopwatch.Elapsed);
            
            return new ProviderStreamingAvailability
            {
                ContentId = contentId,
                Title = availability.Title,
                Type = availability.Type,
                StreamingOptions = availability.StreamingOptions.Select(so => new ProviderStreamingOption
                {
                    ServiceId = so.ServiceId,
                    ServiceName = so.ServiceName,
                    CountryCode = so.CountryCode,
                    Type = so.Type.ToString(),
                    Price = so.Price,
                    Currency = so.Currency,
                    StreamingUrl = so.StreamingUrl,
                    LastUpdated = so.LastUpdated
                }).ToList(),
                LastUpdated = availability.LastUpdated,
                ProviderId = Id
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            RecordError();
            _logger.LogError(ex, "Streaming Availability get availability failed for ID: {ContentId}", contentId);
            throw;
        }
    }

    public async Task<ProviderPersonDetails> GetPersonDetailsAsync(string personId, CancellationToken cancellationToken = default)
    {
        // Streaming Availability API doesn't typically provide person details
        throw new NotSupportedException("Streaming Availability provider does not support person details");
    }

    public async Task<List<ProviderGenre>> GetGenresAsync(ContentType type, CancellationToken cancellationToken = default)
    {
        await EnsureRateLimitAsync(cancellationToken);
        
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            // Streaming API typically doesn't have genres endpoint
            // Return empty list
            stopwatch.Stop();
            await RecordRequestAsync(cancellationToken);
            RecordSuccess(stopwatch.Elapsed);
            
            return new List<ProviderGenre>();
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            RecordError();
            _logger.LogError(ex, "Streaming Availability get genres failed for type: {Type}", type);
            throw;
        }
    }

    public async Task<List<ProviderStreamingService>> GetAvailableServicesAsync(string? countryCode = null, CancellationToken cancellationToken = default)
    {
        await EnsureRateLimitAsync(cancellationToken);
        
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            var services = await _client.GetSupportedServicesAsync(cancellationToken);
            
            stopwatch.Stop();
            await RecordRequestAsync(cancellationToken);
            RecordSuccess(stopwatch.Elapsed);
            
            return services.Select(s => new ProviderStreamingService
            {
                Id = s.Id.ToString(),
                Name = s.Name,
                CountryCode = countryCode ?? "US",
                SupportedTypes = new List<string> { "subscription", "rent", "buy" }
            }).ToList();
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            RecordError();
            _logger.LogError(ex, "Streaming Availability get services failed");
            throw;
        }
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
            RequestsPerMinute = 10, // Conservative estimate
            RequestsPerHour = 600,
            RequestsPerDay = 14400,
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
                var delay = TimeSpan.FromSeconds(6); // Wait 6 seconds if rate limited
                _logger.LogWarning("Streaming Availability rate limit reached, waiting {Delay}ms", delay.TotalMilliseconds);
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

    private ContentType MapContentType(string? type)
    {
        return type?.ToLower() switch
        {
            "movie" => ContentType.Movie,
            "tv" or "show" or "series" => ContentType.TvSeries,
            _ => ContentType.Movie
        };
    }
}