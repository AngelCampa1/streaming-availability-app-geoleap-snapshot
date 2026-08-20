# User Story US-3.1: Streaming Availability API Integration

**Epic:** Data Integration & API Setup  
**Priority:** P0 (Must-Have)  
**Story Points:** 8  
**Sprint:** 4-5  

## User Story
**As a** system  
**I need** access to global streaming availability data  
**So that** I can provide users with accurate information about where content is available worldwide

## Acceptance Criteria
- [ ] Integration with Streaming Availability API (RapidAPI) is functional and secure
- [ ] API can retrieve availability data for movies and TV shows across 60+ countries
- [ ] Data includes service names, country availability, streaming URLs, and pricing
- [ ] API responses are parsed and normalized into consistent internal format
- [ ] Comprehensive error handling for API failures, rate limits, and timeouts
- [ ] API keys are securely managed through Azure Key Vault
- [ ] Usage monitoring tracks API calls, costs, and performance metrics
- [ ] Retry logic with exponential backoff handles transient failures

## Definition of Done
- [ ] API integration successfully retrieves streaming data for major content
- [ ] Data format is normalized and consistent across all countries/services
- [ ] Error handling covers all failure scenarios gracefully
- [ ] Usage monitoring keeps API costs within budget limits
- [ ] Performance meets sub-2-second response time requirements
- [ ] Integration tests validate API contract and data quality
- [ ] Circuit breaker protects against API service outages
- [ ] Comprehensive logging tracks all API interactions

## Implementation Tasks

### Backend Implementation
- [ ] Set up RapidAPI account and configure Streaming Availability API access
- [ ] Create API client service with proper authentication
- [ ] Implement HTTP client with timeout and retry policies
- [ ] Build data models for streaming availability responses
- [ ] Create data normalization service for consistent formatting
- [ ] Implement comprehensive error handling and logging
- [ ] Add API usage tracking and cost monitoring
- [ ] Set up circuit breaker pattern for API resilience
- [ ] Create unit and integration tests for API client
- [ ] Implement API response caching strategy

### API Client Architecture
```csharp
public interface IStreamingAvailabilityClient
{
    Task<StreamingAvailabilityResponse> GetAvailabilityAsync(string contentId, ContentType contentType);
    Task<SearchResponse> SearchContentAsync(string query, ContentType? contentType = null);
    Task<List<StreamingService>> GetSupportedServicesAsync();
    Task<List<Country>> GetSupportedCountriesAsync();
    Task<ApiUsageStats> GetUsageStatsAsync();
}

public class StreamingAvailabilityClient : IStreamingAvailabilityClient
{
    private readonly HttpClient _httpClient;
    private readonly IOptionsMonitor<StreamingApiSettings> _settings;
    private readonly ILogger<StreamingAvailabilityClient> _logger;
    private readonly IDistributedCache _cache;
    private readonly CircuitBreakerPolicy _circuitBreaker;
}
```

### Data Models
```csharp
public class StreamingAvailabilityResponse
{
    public string ContentId { get; set; }
    public string Title { get; set; }
    public ContentType Type { get; set; }
    public List<StreamingOption> StreamingOptions { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class StreamingOption
{
    public string ServiceId { get; set; }
    public string ServiceName { get; set; }
    public string CountryCode { get; set; }
    public string CountryName { get; set; }
    public StreamingType Type { get; set; } // Subscription, Rental, Purchase
    public decimal? Price { get; set; }
    public string Currency { get; set; }
    public string StreamingUrl { get; set; }
    public List<string> VideoQuality { get; set; } // HD, 4K, etc.
    public List<string> AudioLanguages { get; set; }
    public List<string> SubtitleLanguages { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public enum StreamingType
{
    Subscription,
    Rental,
    Purchase,
    Free,
    Ads
}
```

### API Configuration
```json
{
  "StreamingApi": {
    "BaseUrl": "https://streaming-availability.p.rapidapi.com",
    "ApiKey": "[Retrieved from Azure Key Vault]",
    "Timeout": 30000,
    "RetryCount": 3,
    "CircuitBreakerFailureThreshold": 5,
    "CircuitBreakerRecoveryTimeout": 60000,
    "RateLimitPerMinute": 100,
    "CacheDurationMinutes": 60
  }
}
```

### Error Handling Strategy
```csharp
public class StreamingApiErrorHandler
{
    public async Task<T> ExecuteWithRetryAsync<T>(Func<Task<T>> apiCall, string operationName)
    {
        var retryPolicy = Policy
            .Handle<HttpRequestException>()
            .Or<TaskCanceledException>()
            .OrResult<HttpResponseMessage>(r => !r.IsSuccessStatusCode && IsRetryableStatusCode(r.StatusCode))
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                onRetry: (outcome, timespan, retryCount, context) =>
                {
                    _logger.LogWarning("Retry {RetryCount} for {Operation} after {Delay}ms", 
                        retryCount, operationName, timespan.TotalMilliseconds);
                });
                
        return await retryPolicy.ExecuteAsync(apiCall);
    }
    
    private bool IsRetryableStatusCode(HttpStatusCode statusCode)
    {
        return statusCode == HttpStatusCode.TooManyRequests ||
               statusCode == HttpStatusCode.InternalServerError ||
               statusCode == HttpStatusCode.BadGateway ||
               statusCode == HttpStatusCode.ServiceUnavailable ||
               statusCode == HttpStatusCode.GatewayTimeout;
    }
}
```

### Usage Monitoring
```csharp
public class ApiUsageTracker
{
    public async Task TrackApiCallAsync(string endpoint, bool success, int responseTime, decimal cost)
    {
        var usage = new ApiUsageRecord
        {
            Endpoint = endpoint,
            Timestamp = DateTime.UtcNow,
            Success = success,
            ResponseTimeMs = responseTime,
            EstimatedCost = cost,
            CorrelationId = Activity.Current?.Id
        };
        
        await _repository.SaveUsageAsync(usage);
        
        // Update real-time metrics
        _telemetryClient.TrackMetric("api.streaming.calls", 1, new Dictionary<string, string>
        {
            ["endpoint"] = endpoint,
            ["success"] = success.ToString()
        });
        
        _telemetryClient.TrackMetric("api.streaming.cost", (double)cost);
        _telemetryClient.TrackMetric("api.streaming.response_time", responseTime);
    }
}
```

### Data Normalization Service
```csharp
public class StreamingDataNormalizer
{
    public StreamingAvailabilityResponse NormalizeResponse(ExternalApiResponse externalResponse)
    {
        return new StreamingAvailabilityResponse
        {
            ContentId = externalResponse.Id?.ToString(),
            Title = CleanTitle(externalResponse.Title),
            Type = MapContentType(externalResponse.Type),
            StreamingOptions = externalResponse.StreamingInfo
                .SelectMany(kv => kv.Value.Select(option => NormalizeStreamingOption(kv.Key, option)))
                .Where(option => option != null)
                .ToList(),
            LastUpdated = DateTime.UtcNow
        };
    }
    
    private StreamingOption NormalizeStreamingOption(string countryCode, ExternalStreamingOption external)
    {
        // Normalize service names, prices, quality indicators, etc.
        // Handle edge cases and inconsistencies in external data
    }
}
```

### Caching Strategy
- **Popular content:** Cache for 1 hour
- **Obscure content:** Cache for 6 hours
- **Service/country metadata:** Cache for 24 hours
- **Error responses:** Cache for 5 minutes (to avoid repeated failures)
- **Cache keys:** Include content ID, country filters, and data version

## Cost Management

### Budget Monitoring
```csharp
public class ApiCostManager
{
    public async Task<bool> CanMakeApiCallAsync()
    {
        var dailyUsage = await GetDailyUsageAsync();
        var monthlyUsage = await GetMonthlyUsageAsync();
        
        var dailyBudget = _settings.DailyBudgetLimit;
        var monthlyBudget = _settings.MonthlyBudgetLimit;
        
        if (dailyUsage.Cost >= dailyBudget * 0.9m) // 90% of daily budget
        {
            await _notificationService.SendBudgetAlertAsync("Daily budget 90% reached");
            return dailyUsage.Cost < dailyBudget;
        }
        
        if (monthlyUsage.Cost >= monthlyBudget * 0.8m) // 80% of monthly budget
        {
            await _notificationService.SendBudgetAlertAsync("Monthly budget 80% reached");
        }
        
        return monthlyUsage.Cost < monthlyBudget;
    }
}
```

### Performance Requirements
- **API response time:** < 2 seconds for single content queries
- **Batch operations:** < 5 seconds for up to 10 content items
- **Cache hit ratio:** > 70% for repeat queries
- **Error rate:** < 2% of API calls should fail
- **Circuit breaker:** Activate after 5 consecutive failures

## Testing Strategy
- [ ] Unit tests for API client and data normalization
- [ ] Integration tests with actual API (using test data)
- [ ] Mock API tests for error scenarios
- [ ] Performance tests under various load conditions
- [ ] Cost monitoring tests with budget limit validation
- [ ] Circuit breaker tests with simulated API failures
- [ ] Cache effectiveness tests
- [ ] Data quality validation tests

## Security Considerations
- API keys stored in Azure Key Vault, never in configuration files
- HTTPS-only communication with API endpoints
- Input validation for all API parameters
- Rate limiting to prevent abuse and cost overruns
- Audit logging of all API calls with correlation IDs
- No sensitive data stored in cache (only public streaming info)

## Dependencies
- Azure Key Vault for secure API key storage (US-1.5)
- Logging infrastructure for API call tracking (US-1.3)
- Error handling infrastructure (US-1.4)
- Caching infrastructure with Redis
- HTTP client configuration with retry policies

## Success Metrics
- **API availability:** > 99.5% successful API calls
- **Response time:** < 2 seconds for 95% of requests
- **Cost efficiency:** API costs stay within $200/month budget
- **Data accuracy:** > 95% accuracy for popular content availability
- **Cache effectiveness:** > 70% cache hit rate
- **Error recovery:** < 1% permanent failures after retries

## Monitoring and Alerting
- Real-time API usage and cost dashboards
- Alerts for budget thresholds (daily and monthly)
- Performance degradation alerts
- Error rate spike notifications
- Circuit breaker state change alerts
- Data quality anomaly detection