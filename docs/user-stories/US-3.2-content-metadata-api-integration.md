# User Story US-3.2: Content Metadata API Integration (TMDb)

**Epic:** Data Integration & API Setup  
**Priority:** P0 (Must-Have)  
**Story Points:** 5  
**Sprint:** 5  

## User Story
**As a** user  
**I want** to see rich information about movies and TV shows  
**So that** I can identify the correct content and make informed viewing decisions

## Acceptance Criteria
- [ ] Integration with The Movie Database (TMDb) API is functional and secure
- [ ] API retrieves comprehensive metadata: titles, descriptions, cast, crew, ratings, artwork
- [ ] Multiple image sizes are available for different UI contexts (thumbnails, posters, backdrops)
- [ ] Search functionality finds content by title, cast, director, or keywords
- [ ] API responses are cached to improve performance and reduce costs
- [ ] Metadata is properly linked to streaming availability data
- [ ] Multi-language support for international content
- [ ] Rate limiting respects TMDb API limits and terms of service

## Definition of Done
- [ ] Content metadata is accurate and comprehensive for popular titles
- [ ] Search can reliably find content with various query types
- [ ] Images and artwork display correctly across all UI components
- [ ] Data is properly normalized and linked between APIs
- [ ] Caching strategy optimizes performance and costs
- [ ] Error handling gracefully manages API failures
- [ ] Integration tests validate data quality and API contract
- [ ] Performance meets sub-1-second response requirements

## Implementation Tasks

### Backend Implementation
- [ ] Set up TMDb API account and configure access
- [ ] Create TMDb API client service with authentication
- [ ] Implement content search endpoints
- [ ] Build detailed content retrieval functionality
- [ ] Create image URL generation and resizing
- [ ] Add cast and crew information retrieval
- [ ] Implement multi-language content support
- [ ] Create data linking service between TMDb and streaming APIs
- [ ] Add comprehensive caching for metadata
- [ ] Implement rate limiting and usage monitoring

### Data Models
```csharp
public class ContentMetadata
{
    public int TmdbId { get; set; }
    public string Title { get; set; }
    public string OriginalTitle { get; set; }
    public string Overview { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public ContentType Type { get; set; }
    public double? VoteAverage { get; set; }
    public int VoteCount { get; set; }
    public double? Popularity { get; set; }
    public string PosterPath { get; set; }
    public string BackdropPath { get; set; }
    public List<string> Genres { get; set; }
    public List<CastMember> Cast { get; set; }
    public List<CrewMember> Crew { get; set; }
    public List<string> ProductionCountries { get; set; }
    public List<string> OriginalLanguages { get; set; }
    public int? Runtime { get; set; } // For movies
    public int? NumberOfSeasons { get; set; } // For TV shows
    public int? NumberOfEpisodes { get; set; } // For TV shows
    public string Status { get; set; }
    public List<ExternalId> ExternalIds { get; set; }
}

public class CastMember
{
    public int PersonId { get; set; }
    public string Name { get; set; }
    public string Character { get; set; }
    public string ProfilePath { get; set; }
    public int Order { get; set; }
}

public class CrewMember
{
    public int PersonId { get; set; }
    public string Name { get; set; }
    public string Job { get; set; }
    public string Department { get; set; }
    public string ProfilePath { get; set; }
}

public class ExternalId
{
    public string Source { get; set; } // IMDB, TVDB, etc.
    public string ExternalId { get; set; }
}
```

### TMDb API Client
```csharp
public interface ITmdbClient
{
    Task<SearchResponse<ContentMetadata>> SearchMultiAsync(string query, int page = 1, string language = "en-US");
    Task<ContentMetadata> GetMovieDetailsAsync(int movieId, string language = "en-US");
    Task<ContentMetadata> GetTvShowDetailsAsync(int tvId, string language = "en-US");
    Task<PersonDetails> GetPersonDetailsAsync(int personId, string language = "en-US");
    Task<List<Genre>> GetMovieGenresAsync(string language = "en-US");
    Task<List<Genre>> GetTvGenresAsync(string language = "en-US");
    string GetImageUrl(string imagePath, ImageSize size = ImageSize.Original);
}

public class TmdbClient : ITmdbClient
{
    private readonly HttpClient _httpClient;
    private readonly IOptionsMonitor<TmdbSettings> _settings;
    private readonly IDistributedCache _cache;
    private readonly ILogger<TmdbClient> _logger;
    
    private const string BaseImageUrl = "https://image.tmdb.org/t/p/";
    
    public async Task<SearchResponse<ContentMetadata>> SearchMultiAsync(string query, int page = 1, string language = "en-US")
    {
        var cacheKey = $"tmdb:search:{query}:{page}:{language}";
        var cachedResult = await _cache.GetStringAsync(cacheKey);
        
        if (!string.IsNullOrEmpty(cachedResult))
        {
            return JsonSerializer.Deserialize<SearchResponse<ContentMetadata>>(cachedResult);
        }
        
        var requestUri = $"search/multi?api_key={_settings.CurrentValue.ApiKey}&query={Uri.EscapeDataString(query)}&page={page}&language={language}";
        
        var response = await _httpClient.GetAsync(requestUri);
        response.EnsureSuccessStatusCode();
        
        var jsonContent = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<SearchResponse<ContentMetadata>>(jsonContent);
        
        await _cache.SetStringAsync(cacheKey, jsonContent, TimeSpan.FromHours(6));
        
        _logger.LogInformation("TMDb search executed", new {
            Query = query,
            ResultCount = result.Results.Count,
            Page = page,
            Language = language
        });
        
        return result;
    }
}
```

### Image Management
```csharp
public class ImageService
{
    public enum ImageSize
    {
        W92,     // For thumbnails
        W154,    // For small posters
        W185,    // For medium posters
        W342,    // For large posters
        W500,    // For extra large posters
        W780,    // For backdrops
        W1280,   // For large backdrops
        Original // For original quality
    }
    
    public string GetOptimizedImageUrl(string imagePath, ImageSize targetSize, bool isRetina = false)
    {
        if (string.IsNullOrEmpty(imagePath)) return GetPlaceholderImageUrl();
        
        var size = isRetina ? GetRetinaSize(targetSize) : GetSizeString(targetSize);
        return $"{BaseImageUrl}{size}{imagePath}";
    }
    
    private string GetPlaceholderImageUrl()
    {
        return "/images/placeholder-poster.jpg";
    }
}
```

### Data Linking Service
```csharp
public class ContentLinkingService
{
    public async Task<LinkedContent> LinkContentDataAsync(StreamingAvailabilityResponse streamingData)
    {
        // Try to find TMDb data using title and year
        var searchResults = await _tmdbClient.SearchMultiAsync($"{streamingData.Title} {streamingData.Year}");
        
        ContentMetadata bestMatch = null;
        
        if (searchResults.Results.Any())
        {
            // Find best match using title similarity and release year
            bestMatch = FindBestMatch(streamingData, searchResults.Results);
        }
        
        // If no good match found, try alternative search strategies
        if (bestMatch == null)
        {
            bestMatch = await TryAlternativeSearchAsync(streamingData);
        }
        
        return new LinkedContent
        {
            StreamingData = streamingData,
            Metadata = bestMatch,
            LinkConfidence = CalculateLinkConfidence(streamingData, bestMatch)
        };
    }
    
    private ContentMetadata FindBestMatch(StreamingAvailabilityResponse streamingData, List<ContentMetadata> candidates)
    {
        return candidates
            .Select(candidate => new { 
                Content = candidate, 
                Score = CalculateSimilarityScore(streamingData, candidate) 
            })
            .OrderByDescending(x => x.Score)
            .FirstOrDefault(x => x.Score > 0.8)? // 80% similarity threshold
            .Content;
    }
}
```

### Caching Strategy
- **Search results:** Cache for 6 hours (content discovery doesn't change frequently)
- **Detailed metadata:** Cache for 24 hours (cast, crew, descriptions are stable)
- **Images:** Cache URLs for 7 days (TMDb image paths are persistent)
- **Genre lists:** Cache for 30 days (rarely change)
- **Person details:** Cache for 24 hours
- **Popular content:** Refresh cache proactively

## Multi-language Support
```csharp
public class LocalizedContentService
{
    public async Task<ContentMetadata> GetLocalizedContentAsync(int tmdbId, ContentType type, string language = "en-US")
    {
        var content = type == ContentType.Movie 
            ? await _tmdbClient.GetMovieDetailsAsync(tmdbId, language)
            : await _tmdbClient.GetTvShowDetailsAsync(tmdbId, language);
            
        // Fall back to English if localized version is incomplete
        if (IsContentIncomplete(content) && language != "en-US")
        {
            var englishContent = type == ContentType.Movie
                ? await _tmdbClient.GetMovieDetailsAsync(tmdbId, "en-US")
                : await _tmdbClient.GetTvShowDetailsAsync(tmdbId, "en-US");
                
            content = MergeLocalizedContent(content, englishContent);
        }
        
        return content;
    }
}
```

## Rate Limiting and Usage Management
```csharp
public class TmdbRateLimiter
{
    private readonly SemaphoreSlim _semaphore;
    private readonly Queue<DateTime> _requestTimes;
    private readonly int _maxRequestsPerSecond = 4; // TMDb limit is 40/10 seconds
    
    public async Task<T> ExecuteWithRateLimitAsync<T>(Func<Task<T>> apiCall)
    {
        await _semaphore.WaitAsync();
        
        try
        {
            // Remove old requests outside the time window
            var cutoff = DateTime.UtcNow.AddSeconds(-10);
            while (_requestTimes.Count > 0 && _requestTimes.Peek() < cutoff)
            {
                _requestTimes.Dequeue();
            }
            
            // Wait if we've hit the rate limit
            if (_requestTimes.Count >= 40)
            {
                var waitTime = _requestTimes.Peek().AddSeconds(10) - DateTime.UtcNow;
                if (waitTime > TimeSpan.Zero)
                {
                    await Task.Delay(waitTime);
                }
            }
            
            _requestTimes.Enqueue(DateTime.UtcNow);
            return await apiCall();
        }
        finally
        {
            _semaphore.Release();
        }
    }
}
```

## Testing Strategy
- [ ] Unit tests for API client and data normalization
- [ ] Integration tests with actual TMDb API
- [ ] Mock API tests for error scenarios
- [ ] Image URL generation tests
- [ ] Content linking accuracy tests
- [ ] Multi-language support tests
- [ ] Rate limiting tests
- [ ] Cache effectiveness tests
- [ ] Performance tests under load

## Dependencies
- Streaming Availability API integration (US-3.1) for data linking
- Caching infrastructure (Redis)
- Error handling system (US-1.4)
- Logging infrastructure (US-1.3)
- Image optimization and CDN setup

## Success Metrics
- **Metadata completeness:** > 95% of popular titles have complete metadata
- **Search accuracy:** > 90% of searches return relevant results in top 5
- **Image load success:** > 98% of images load successfully
- **API response time:** < 1 second for metadata requests
- **Cache hit ratio:** > 80% for repeat metadata requests
- **Content linking accuracy:** > 95% successful links between streaming and metadata