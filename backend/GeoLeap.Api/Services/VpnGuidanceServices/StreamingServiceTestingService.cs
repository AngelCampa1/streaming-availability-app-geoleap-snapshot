using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Services.VpnGuidanceServices;

public interface IStreamingServiceTestingService
{
    Task<StreamingAccessibilityResult> TestStreamingAccessibilityAsync(
        string streamingService, 
        string regionCode, 
        CancellationToken cancellationToken = default);
    
    Task<List<StreamingAccessibilityResult>> TestMultipleStreamingServicesAsync(
        List<string> streamingServices, 
        string regionCode, 
        CancellationToken cancellationToken = default);
    
    Task<GeoBlockingTestResult> TestGeoBlockingStatusAsync(
        string streamingService, 
        string regionCode, 
        CancellationToken cancellationToken = default);
    
    Task<ContentAvailabilityResult> TestContentAvailabilityAsync(
        string streamingService, 
        string regionCode, 
        List<string> testContent, 
        CancellationToken cancellationToken = default);
    
    Task<StreamingQualityResult> TestStreamingQualityAsync(
        string streamingService, 
        string regionCode, 
        CancellationToken cancellationToken = default);
}

public class StreamingServiceTestingService : IStreamingServiceTestingService
{
    private readonly ILogger<StreamingServiceTestingService> _logger;
    private readonly ApplicationDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    // Streaming service test endpoints and patterns
    private readonly Dictionary<string, StreamingServiceConfig> _streamingConfigs = new()
    {
        ["Netflix"] = new()
        {
            BaseUrl = "https://www.netflix.com",
            TestEndpoints = new Dictionary<string, string>
            {
                ["US"] = "https://www.netflix.com/browse",
                ["UK"] = "https://www.netflix.com/gb/",
                ["CA"] = "https://www.netflix.com/ca/",
                ["AU"] = "https://www.netflix.com/au/",
                ["DE"] = "https://www.netflix.com/de/",
                ["FR"] = "https://www.netflix.com/fr/",
                ["JP"] = "https://www.netflix.com/jp/"
            },
            GeoBlockPatterns = new List<string>
            {
                "not available in your location",
                "not available in your country",
                "geographical restrictions",
                "vpn or proxy detected"
            },
            ContentTestUrls = new Dictionary<string, string>
            {
                ["popular"] = "/title/popular",
                ["originals"] = "/title/netflix-originals"
            },
            ExpectedHeaders = new Dictionary<string, string>
            {
                ["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        },
        ["Disney+"] = new()
        {
            BaseUrl = "https://www.disneyplus.com",
            TestEndpoints = new Dictionary<string, string>
            {
                ["US"] = "https://www.disneyplus.com/",
                ["UK"] = "https://www.disneyplus.com/en-gb",
                ["CA"] = "https://www.disneyplus.com/en-ca",
                ["AU"] = "https://www.disneyplus.com/en-au",
                ["DE"] = "https://www.disneyplus.com/de-de",
                ["FR"] = "https://www.disneyplus.com/fr-fr",
                ["JP"] = "https://www.disneyplus.com/ja-jp"
            },
            GeoBlockPatterns = new List<string>
            {
                "service is not available",
                "not available in your region",
                "geographical restrictions apply"
            },
            ContentTestUrls = new Dictionary<string, string>
            {
                ["marvel"] = "/movies/marvel",
                ["starwars"] = "/movies/star-wars"
            },
            ExpectedHeaders = new Dictionary<string, string>
            {
                ["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        },
        ["Amazon Prime Video"] = new()
        {
            BaseUrl = "https://www.primevideo.com",
            TestEndpoints = new Dictionary<string, string>
            {
                ["US"] = "https://www.primevideo.com/",
                ["UK"] = "https://www.primevideo.com/region/eu/",
                ["CA"] = "https://www.primevideo.com/region/na/",
                ["AU"] = "https://www.primevideo.com/region/au/",
                ["DE"] = "https://www.primevideo.com/region/eu/",
                ["FR"] = "https://www.primevideo.com/region/eu/",
                ["JP"] = "https://www.primevideo.com/region/ap/"
            },
            GeoBlockPatterns = new List<string>
            {
                "not available in your location",
                "geographical restrictions",
                "content not available"
            },
            ContentTestUrls = new Dictionary<string, string>
            {
                ["movies"] = "/movies",
                ["originals"] = "/originals"
            },
            ExpectedHeaders = new Dictionary<string, string>
            {
                ["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        },
        ["Hulu"] = new()
        {
            BaseUrl = "https://www.hulu.com",
            TestEndpoints = new Dictionary<string, string>
            {
                ["US"] = "https://www.hulu.com/",
                ["JP"] = "https://www.happyon.jp/" // Hulu Japan
            },
            GeoBlockPatterns = new List<string>
            {
                "not available in your location",
                "hulu is only available in the us",
                "geographical restrictions"
            },
            ContentTestUrls = new Dictionary<string, string>
            {
                ["tv"] = "/tv",
                ["movies"] = "/movies"
            },
            ExpectedHeaders = new Dictionary<string, string>
            {
                ["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        },
        ["HBO Max"] = new()
        {
            BaseUrl = "https://www.hbomax.com",
            TestEndpoints = new Dictionary<string, string>
            {
                ["US"] = "https://www.hbomax.com/",
                ["EU"] = "https://www.hbomax.com/eu"
            },
            GeoBlockPatterns = new List<string>
            {
                "not available in your region",
                "geographical restrictions",
                "hbo max is not available"
            },
            ContentTestUrls = new Dictionary<string, string>
            {
                ["series"] = "/series",
                ["movies"] = "/movies"
            },
            ExpectedHeaders = new Dictionary<string, string>
            {
                ["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        }
    };

    public StreamingServiceTestingService(
        ILogger<StreamingServiceTestingService> logger,
        ApplicationDbContext context,
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _logger = logger;
        _context = context;
        _httpClient = httpClient;
        _configuration = configuration;
        
        // Configure HttpClient for streaming tests
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
        _httpClient.DefaultRequestHeaders.Add("Accept", 
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
        _httpClient.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.5");
        _httpClient.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate, br");
        _httpClient.DefaultRequestHeaders.Add("Connection", "keep-alive");
        _httpClient.DefaultRequestHeaders.Add("Upgrade-Insecure-Requests", "1");
    }

    public async Task<StreamingAccessibilityResult> TestStreamingAccessibilityAsync(
        string streamingService, 
        string regionCode, 
        CancellationToken cancellationToken = default)
    {
        var testStartTime = DateTime.UtcNow;
        var testId = Guid.NewGuid();
        
        try
        {
            _logger.LogInformation("Starting streaming accessibility test {TestId} for {Service} in {Region}", 
                testId, streamingService, regionCode);

            var result = new StreamingAccessibilityResult
            {
                TestId = testId,
                StreamingService = streamingService,
                RegionCode = regionCode,
                StartTime = testStartTime
            };

            if (!_streamingConfigs.TryGetValue(streamingService, out var config))
            {
                result.EndTime = DateTime.UtcNow;
                result.IsAccessible = false;
                result.ErrorMessage = $"Unsupported streaming service: {streamingService}";
                return result;
            }

            // Step 1: Basic connectivity test
            var connectivityResult = await TestBasicConnectivityAsync(config, regionCode, cancellationToken);
            result.IsAccessible = connectivityResult.Success;
            result.ResponseTimeMs = connectivityResult.ResponseTimeMs;
            result.HttpStatusCode = connectivityResult.StatusCode;

            if (!result.IsAccessible)
            {
                result.ErrorMessage = connectivityResult.ErrorMessage;
                result.EndTime = DateTime.UtcNow;
                return result;
            }

            // Step 2: Geo-blocking detection
            var geoBlockResult = await TestGeoBlockingStatusAsync(streamingService, regionCode, cancellationToken);
            result.IsGeoBlocked = geoBlockResult.IsBlocked;
            result.GeoBlockReason = geoBlockResult.BlockReason;
            result.VpnDetected = geoBlockResult.VpnDetected;

            // Step 3: Content availability test
            var contentResult = await TestContentAvailabilityAsync(
                streamingService, regionCode, GetTestContent(streamingService), cancellationToken);
            result.ContentAvailable = contentResult.ContentCount > 0;
            result.AvailableContentCount = contentResult.ContentCount;
            result.ContentDetails = contentResult.ContentDetails;

            // Step 4: Streaming quality test (if accessible)
            if (result.IsAccessible && !result.IsGeoBlocked)
            {
                var qualityResult = await TestStreamingQualityAsync(streamingService, regionCode, cancellationToken);
                result.StreamingQuality = qualityResult.Quality;
                result.MaxResolution = qualityResult.MaxResolution;
                result.BufferingDetected = qualityResult.BufferingDetected;
            }

            result.OverallScore = CalculateOverallAccessibilityScore(result);
            result.EndTime = DateTime.UtcNow;
            result.TestDurationMs = (result.EndTime - result.StartTime).TotalMilliseconds;

            _logger.LogInformation("Streaming accessibility test {TestId} completed: Accessible={Accessible}, Score={Score}", 
                testId, result.IsAccessible && !result.IsGeoBlocked, result.OverallScore);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Streaming accessibility test {TestId} failed for {Service} in {Region}", 
                testId, streamingService, regionCode);
            
            return new StreamingAccessibilityResult
            {
                TestId = testId,
                StreamingService = streamingService,
                RegionCode = regionCode,
                StartTime = testStartTime,
                EndTime = DateTime.UtcNow,
                IsAccessible = false,
                ErrorMessage = ex.Message,
                TestDurationMs = (DateTime.UtcNow - testStartTime).TotalMilliseconds
            };
        }
    }

    public async Task<List<StreamingAccessibilityResult>> TestMultipleStreamingServicesAsync(
        List<string> streamingServices, 
        string regionCode, 
        CancellationToken cancellationToken = default)
    {
        var results = new List<StreamingAccessibilityResult>();
        var tasks = streamingServices.Select(service => 
            TestStreamingAccessibilityAsync(service, regionCode, cancellationToken));
        
        var completedTests = await Task.WhenAll(tasks);
        results.AddRange(completedTests);
        
        _logger.LogInformation("Completed batch streaming tests for {ServiceCount} services in {Region}: {SuccessCount} successful", 
            streamingServices.Count, regionCode, results.Count(r => r.IsAccessible && !r.IsGeoBlocked));
        
        return results;
    }

    public async Task<GeoBlockingTestResult> TestGeoBlockingStatusAsync(
        string streamingService, 
        string regionCode, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!_streamingConfigs.TryGetValue(streamingService, out var config))
            {
                return new GeoBlockingTestResult
                {
                    IsBlocked = true,
                    BlockReason = $"Unsupported streaming service: {streamingService}"
                };
            }

            var testUrl = GetTestEndpointForRegion(config, regionCode);
            if (string.IsNullOrEmpty(testUrl))
            {
                return new GeoBlockingTestResult
                {
                    IsBlocked = true,
                    BlockReason = $"No test endpoint available for region {regionCode}"
                };
            }

            // Set region-specific headers
            var request = new HttpRequestMessage(HttpMethod.Get, testUrl);
            foreach (var header in config.ExpectedHeaders)
            {
                request.Headers.Add(header.Key, header.Value);
            }

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            
            // Check for geo-blocking patterns in response
            var isBlocked = false;
            var blockReason = string.Empty;
            var vpnDetected = false;

            foreach (var pattern in config.GeoBlockPatterns)
            {
                if (content.Contains(pattern, StringComparison.OrdinalIgnoreCase))
                {
                    isBlocked = true;
                    blockReason = pattern;
                    
                    if (pattern.Contains("vpn", StringComparison.OrdinalIgnoreCase) ||
                        pattern.Contains("proxy", StringComparison.OrdinalIgnoreCase))
                    {
                        vpnDetected = true;
                    }
                    break;
                }
            }

            // Additional checks for common geo-blocking responses
            if (!isBlocked)
            {
                if (response.StatusCode == HttpStatusCode.Forbidden ||
                    response.StatusCode == HttpStatusCode.Unauthorized)
                {
                    isBlocked = true;
                    blockReason = $"HTTP {response.StatusCode} - Access denied";
                }
                else if (content.Contains("location", StringComparison.OrdinalIgnoreCase) &&
                         content.Contains("not available", StringComparison.OrdinalIgnoreCase))
                {
                    isBlocked = true;
                    blockReason = "Geographic restriction detected in content";
                }
            }

            return new GeoBlockingTestResult
            {
                IsBlocked = isBlocked,
                BlockReason = blockReason,
                VpnDetected = vpnDetected,
                HttpStatusCode = (int)response.StatusCode,
                ResponseHeaders = response.Headers.ToDictionary(h => h.Key, h => string.Join(", ", h.Value))
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Geo-blocking test failed for {Service} in {Region}", streamingService, regionCode);
            return new GeoBlockingTestResult
            {
                IsBlocked = true,
                BlockReason = $"Test failed: {ex.Message}",
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<ContentAvailabilityResult> TestContentAvailabilityAsync(
        string streamingService, 
        string regionCode, 
        List<string> testContent, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!_streamingConfigs.TryGetValue(streamingService, out var config))
            {
                return new ContentAvailabilityResult
                {
                    ContentCount = 0,
                    ErrorMessage = $"Unsupported streaming service: {streamingService}"
                };
            }

            var baseUrl = GetTestEndpointForRegion(config, regionCode);
            var contentDetails = new List<ContentItemResult>();
            var availableCount = 0;

            foreach (var contentType in config.ContentTestUrls.Keys)
            {
                try
                {
                    var contentUrl = baseUrl + config.ContentTestUrls[contentType];
                    var response = await _httpClient.GetAsync(contentUrl, cancellationToken);
                    var content = await response.Content.ReadAsStringAsync(cancellationToken);
                    
                    if (response.IsSuccessStatusCode && !string.IsNullOrWhiteSpace(content))
                    {
                        var contentCount = EstimateContentCount(content, contentType);
                        if (contentCount > 0)
                        {
                            availableCount += contentCount;
                            contentDetails.Add(new ContentItemResult
                            {
                                ContentType = contentType,
                                IsAvailable = true,
                                ItemCount = contentCount,
                                TestUrl = contentUrl
                            });
                        }
                    }
                    else
                    {
                        contentDetails.Add(new ContentItemResult
                        {
                            ContentType = contentType,
                            IsAvailable = false,
                            ErrorMessage = $"HTTP {response.StatusCode}",
                            TestUrl = contentUrl
                        });
                    }
                }
                catch (Exception ex)
                {
                    contentDetails.Add(new ContentItemResult
                    {
                        ContentType = contentType,
                        IsAvailable = false,
                        ErrorMessage = ex.Message
                    });
                }
            }

            return new ContentAvailabilityResult
            {
                ContentCount = availableCount,
                ContentDetails = contentDetails,
                TestTimestamp = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Content availability test failed for {Service} in {Region}", streamingService, regionCode);
            return new ContentAvailabilityResult
            {
                ContentCount = 0,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<StreamingQualityResult> TestStreamingQualityAsync(
        string streamingService, 
        string regionCode, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            // This would ideally test actual streaming quality
            // For now, we'll simulate quality testing based on accessibility
            
            var accessibilityResult = await TestStreamingAccessibilityAsync(streamingService, regionCode, cancellationToken);
            
            if (!accessibilityResult.IsAccessible || accessibilityResult.IsGeoBlocked)
            {
                return new StreamingQualityResult
                {
                    Quality = StreamingQuality.NotAvailable,
                    MaxResolution = "N/A",
                    BufferingDetected = false,
                    ErrorMessage = "Service not accessible or geo-blocked"
                };
            }

            // Estimate quality based on response time and accessibility
            var quality = EstimateStreamingQuality(accessibilityResult.ResponseTimeMs);
            var maxResolution = EstimateMaxResolution(quality);
            
            return new StreamingQualityResult
            {
                Quality = quality,
                MaxResolution = maxResolution,
                BufferingDetected = accessibilityResult.ResponseTimeMs > 5000, // Assume buffering if slow
                BitrateKbps = EstimateBitrate(quality),
                TestTimestamp = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Streaming quality test failed for {Service} in {Region}", streamingService, regionCode);
            return new StreamingQualityResult
            {
                Quality = StreamingQuality.NotAvailable,
                MaxResolution = "N/A",
                ErrorMessage = ex.Message
            };
        }
    }

    // Private helper methods
    private async Task<StreamingConnectivityTestResult> TestBasicConnectivityAsync(
        StreamingServiceConfig config, 
        string regionCode, 
        CancellationToken cancellationToken)
    {
        try
        {
            var testUrl = GetTestEndpointForRegion(config, regionCode);
            if (string.IsNullOrEmpty(testUrl))
            {
                return new StreamingConnectivityTestResult
                {
                    Success = false,
                    ErrorMessage = $"No test endpoint available for region {regionCode}"
                };
            }

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var response = await _httpClient.GetAsync(testUrl, cancellationToken);
            stopwatch.Stop();

            return new StreamingConnectivityTestResult
            {
                Success = response.IsSuccessStatusCode,
                ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds,
                StatusCode = (int)response.StatusCode,
                ErrorMessage = response.IsSuccessStatusCode ? null : $"HTTP {response.StatusCode}: {response.ReasonPhrase}"
            };
        }
        catch (Exception ex)
        {
            return new StreamingConnectivityTestResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    private string GetTestEndpointForRegion(StreamingServiceConfig config, string regionCode)
    {
        if (config.TestEndpoints.TryGetValue(regionCode, out var endpoint))
        {
            return endpoint;
        }
        
        // Fallback to base URL if region-specific endpoint not available
        return config.BaseUrl;
    }

    private List<string> GetTestContent(string streamingService)
    {
        // This would typically come from a database of test content
        var testContent = new Dictionary<string, List<string>>
        {
            ["Netflix"] = new() { "popular shows", "netflix originals", "movies" },
            ["Disney+"] = new() { "marvel content", "star wars", "disney classics" },
            ["Amazon Prime Video"] = new() { "prime originals", "movies", "tv shows" },
            ["Hulu"] = new() { "current tv shows", "movies", "hulu originals" },
            ["HBO Max"] = new() { "hbo series", "max originals", "movies" }
        };

        return testContent.TryGetValue(streamingService, out var content) ? content : new List<string>();
    }

    private int EstimateContentCount(string htmlContent, string contentType)
    {
        // Simple heuristic to estimate content availability
        // In a real implementation, this would parse structured data
        var contentIndicators = new[]
        {
            "movie", "series", "episode", "title", "video", "play", "watch"
        };

        var count = 0;
        foreach (var indicator in contentIndicators)
        {
            count += Regex.Matches(htmlContent, indicator, RegexOptions.IgnoreCase).Count;
        }

        // Return a normalized estimate
        return Math.Min(count / 10, 100); // Cap at 100 items
    }

    private StreamingQuality EstimateStreamingQuality(int responseTimeMs)
    {
        return responseTimeMs switch
        {
            < 1000 => StreamingQuality.Excellent,
            < 2000 => StreamingQuality.Good,
            < 3000 => StreamingQuality.Fair,
            < 5000 => StreamingQuality.Poor,
            _ => StreamingQuality.NotAvailable
        };
    }

    private string EstimateMaxResolution(StreamingQuality quality)
    {
        return quality switch
        {
            StreamingQuality.Excellent => "4K UHD",
            StreamingQuality.Good => "1080p HD",
            StreamingQuality.Fair => "720p HD",
            StreamingQuality.Poor => "480p SD",
            _ => "N/A"
        };
    }

    private int EstimateBitrate(StreamingQuality quality)
    {
        return quality switch
        {
            StreamingQuality.Excellent => 15000, // 15 Mbps for 4K
            StreamingQuality.Good => 5000,       // 5 Mbps for 1080p
            StreamingQuality.Fair => 2500,       // 2.5 Mbps for 720p
            StreamingQuality.Poor => 1000,       // 1 Mbps for 480p
            _ => 0
        };
    }

    private double CalculateOverallAccessibilityScore(StreamingAccessibilityResult result)
    {
        double score = 0;
        
        if (result.IsAccessible) score += 40;
        if (!result.IsGeoBlocked) score += 30;
        if (result.ContentAvailable) score += 20;
        if (result.StreamingQuality != StreamingQuality.NotAvailable) score += 10;
        
        // Bonus points for fast response time
        if (result.ResponseTimeMs < 1000) score += 5;
        else if (result.ResponseTimeMs < 2000) score += 3;
        else if (result.ResponseTimeMs < 3000) score += 1;
        
        return Math.Min(score, 100); // Cap at 100
    }
}

// Configuration and result classes
internal class StreamingServiceConfig
{
    public string BaseUrl { get; set; } = string.Empty;
    public Dictionary<string, string> TestEndpoints { get; set; } = new();
    public List<string> GeoBlockPatterns { get; set; } = new();
    public Dictionary<string, string> ContentTestUrls { get; set; } = new();
    public Dictionary<string, string> ExpectedHeaders { get; set; } = new();
}

public class StreamingAccessibilityResult
{
    public Guid TestId { get; set; }
    public string StreamingService { get; set; } = string.Empty;
    public string RegionCode { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public double TestDurationMs { get; set; }
    
    // Accessibility Results
    public bool IsAccessible { get; set; }
    public int ResponseTimeMs { get; set; }
    public int HttpStatusCode { get; set; }
    
    // Geo-blocking Results
    public bool IsGeoBlocked { get; set; }
    public string? GeoBlockReason { get; set; }
    public bool VpnDetected { get; set; }
    
    // Content Results
    public bool ContentAvailable { get; set; }
    public int AvailableContentCount { get; set; }
    public List<ContentItemResult> ContentDetails { get; set; } = new();
    
    // Quality Results
    public StreamingQuality StreamingQuality { get; set; }
    public string? MaxResolution { get; set; }
    public bool BufferingDetected { get; set; }
    
    // Overall Assessment
    public double OverallScore { get; set; }
    public string? ErrorMessage { get; set; }
}

public class GeoBlockingTestResult
{
    public bool IsBlocked { get; set; }
    public string? BlockReason { get; set; }
    public bool VpnDetected { get; set; }
    public int HttpStatusCode { get; set; }
    public Dictionary<string, string> ResponseHeaders { get; set; } = new();
    public string? ErrorMessage { get; set; }
}

public class ContentAvailabilityResult
{
    public int ContentCount { get; set; }
    public List<ContentItemResult> ContentDetails { get; set; } = new();
    public DateTime TestTimestamp { get; set; }
    public string? ErrorMessage { get; set; }
}

public class ContentItemResult
{
    public string ContentType { get; set; } = string.Empty;
    public bool IsAvailable { get; set; }
    public int ItemCount { get; set; }
    public string? TestUrl { get; set; }
    public string? ErrorMessage { get; set; }
}

public class StreamingQualityResult
{
    public StreamingQuality Quality { get; set; }
    public string MaxResolution { get; set; } = string.Empty;
    public bool BufferingDetected { get; set; }
    public int BitrateKbps { get; set; }
    public DateTime TestTimestamp { get; set; }
    public string? ErrorMessage { get; set; }
}

internal class StreamingConnectivityTestResult
{
    public bool Success { get; set; }
    public int ResponseTimeMs { get; set; }
    public int StatusCode { get; set; }
    public string? ErrorMessage { get; set; }
}

public enum StreamingQuality
{
    NotAvailable,
    Poor,
    Fair,
    Good,
    Excellent
}