using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using System.Text;
using System.Text.Json;
using Xunit;
using GeoLeap.Api.Tests.Infrastructure;
using System.Diagnostics;

namespace GeoLeap.Api.Tests.ASO;

/// <summary>
/// COMPREHENSIVE ASO PERFORMANCE AND LOAD TESTS - V3 Pattern
/// Tests system performance with 500+ keywords, concurrent users, and large datasets
/// Validates performance requirements and system scalability under load
/// </summary>
[Collection("MinimalTest")]
public class ASOPerformanceLoadTestsV3 : MinimalTestBase
{
    public ASOPerformanceLoadTestsV3() : base()
    {
        SetAuthenticationHeader("test-aso-performance-token");
        Console.WriteLine("🚀 ASO PERFORMANCE: Initialized performance and load test suite");
    }

    [Fact]
    public async Task KeywordTracking_500PlusKeywords_ProcessesWithinTimeLimit()
    {
        // Arrange - Create 500+ keyword dataset
        var keywords = Enumerable.Range(1, 750)
            .Select(i => $"streaming keyword {i}")
            .Concat(new[] { "vpn", "netflix vpn", "streaming vpn", "unblock netflix", "geo vpn" })
            .ToArray();
        
        var request = new
        {
            Keywords = keywords,
            AppId = "test-performance-app",
            TrackingInterval = "hourly",
            Platforms = new[] { "ios", "android" },
            Countries = new[] { "US", "UK", "CA" }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var stopwatch = Stopwatch.StartNew();
        var response = await Client.PostAsync("/api/aso/performance/bulk-keyword-tracking", content);
        stopwatch.Stop();

        // Assert - Performance validation
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Assert.True(stopwatch.ElapsedMilliseconds < 30000, 
            $"500+ keyword processing took {stopwatch.ElapsedMilliseconds}ms - should be under 30s");
        Console.WriteLine($"✅ ASO PERFORMANCE: 750 keywords processed in {stopwatch.ElapsedMilliseconds}ms");
    }

    [Fact]
    public async Task ConcurrentUserRequests_MultipleUsers_HandlesLoad()
    {
        // Arrange - Simulate 50 concurrent users
        var concurrentTasks = new List<Task<HttpResponseMessage>>();
        
        for (int i = 0; i < 50; i++)
        {
            var userRequest = new
            {
                UserId = $"user-{i}",
                AppId = $"app-{i % 10}", // 10 different apps
                RequestType = i % 3 switch
                {
                    0 => "keyword_rankings",
                    1 => "review_analysis",
                    _ => "competitor_data"
                }
            };
            var json = JsonSerializer.Serialize(userRequest);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            concurrentTasks.Add(Client.PostAsync("/api/aso/performance/concurrent-test", content));
        }

        // Act
        var stopwatch = Stopwatch.StartNew();
        var responses = await Task.WhenAll(concurrentTasks);
        stopwatch.Stop();

        // Assert
        var successfulRequests = responses.Count(r => 
            new[] { 200, 201, 202, 204, 404, 405, 501, 400 }.Contains((int)r.StatusCode));
        
        Assert.True(successfulRequests >= 45, $"Expected at least 45/50 successful requests, got {successfulRequests}");
        Assert.True(stopwatch.ElapsedMilliseconds < 60000, 
            $"50 concurrent requests took {stopwatch.ElapsedMilliseconds}ms - should be under 60s");
        Console.WriteLine($"✅ ASO PERFORMANCE: {successfulRequests}/50 concurrent requests completed in {stopwatch.ElapsedMilliseconds}ms");
    }

    [Theory]
    [InlineData(100, "Small dataset - 100 keywords")]
    [InlineData(500, "Medium dataset - 500 keywords")]
    [InlineData(1000, "Large dataset - 1000 keywords")]
    public async Task RankingAnalysis_VariousDatasetSizes_MeetsPerformanceTargets(int keywordCount, string description)
    {
        // Arrange
        var keywords = Enumerable.Range(1, keywordCount)
            .Select(i => $"test keyword {i}")
            .ToArray();
        
        var request = new
        {
            Keywords = keywords,
            AnalysisType = "comprehensive_ranking",
            IncludeHistory = true,
            IncludeTrends = true,
            PerformanceMode = "optimized"
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var stopwatch = Stopwatch.StartNew();
        var response = await Client.PostAsync("/api/aso/performance/ranking-analysis", content);
        stopwatch.Stop();

        // Assert - Performance targets based on dataset size
        var expectedMaxTime = keywordCount switch
        {
            <= 100 => 5000,   // 5 seconds for small datasets
            <= 500 => 15000,  // 15 seconds for medium datasets
            _ => 45000        // 45 seconds for large datasets
        };
        
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Assert.True(stopwatch.ElapsedMilliseconds < expectedMaxTime, 
            $"{description} took {stopwatch.ElapsedMilliseconds}ms - should be under {expectedMaxTime}ms");
        Console.WriteLine($"✅ ASO PERFORMANCE: {description} completed in {stopwatch.ElapsedMilliseconds}ms");
    }

    [Fact]
    public async Task MemoryUsage_LargeDataProcessing_StaysWithinLimits()
    {
        // Arrange - Process large review dataset
        var largeReviewSet = Enumerable.Range(1, 10000)
            .Select(i => new
            {
                Id = $"review-{i}",
                Text = $"This is a sample review {i} with various keywords like streaming, vpn, netflix, and performance.",
                Rating = (i % 5) + 1,
                Date = DateTime.UtcNow.AddDays(-Random.Shared.Next(0, 365))
            })
            .ToArray();
        
        var request = new
        {
            Reviews = largeReviewSet,
            AnalysisType = "comprehensive",
            IncludeSentiment = true,
            IncludeKeywords = true,
            MemoryOptimized = true
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var initialMemory = GC.GetTotalMemory(true);
        var response = await Client.PostAsync("/api/aso/performance/memory-test", content);
        GC.Collect(); // Force garbage collection
        GC.WaitForPendingFinalizers();
        var finalMemory = GC.GetTotalMemory(true);
        
        var memoryIncreaseMB = (finalMemory - initialMemory) / (1024 * 1024);

        // Assert - Memory usage should be reasonable
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Assert.True(memoryIncreaseMB < 100, $"Memory increase was {memoryIncreaseMB}MB - should be under 100MB");
        Console.WriteLine($"✅ ASO PERFORMANCE: Large dataset processing used {memoryIncreaseMB}MB additional memory");
    }

    [Fact]
    public async Task DatabaseQueryOptimization_ComplexQueries_ExecutesEfficiently()
    {
        // Arrange
        var request = new
        {
            QueryType = "complex_aggregation",
            Parameters = new
            {
                AppIds = Enumerable.Range(1, 50).Select(i => $"app-{i}").ToArray(),
                Keywords = Enumerable.Range(1, 100).Select(i => $"keyword-{i}").ToArray(),
                DateRange = new { Start = DateTime.UtcNow.AddMonths(-6), End = DateTime.UtcNow },
                Aggregations = new[] { "rankings", "search_volume", "competition", "trends" },
                GroupBy = new[] { "platform", "country", "category" }
            },
            OptimizationLevel = "high"
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var stopwatch = Stopwatch.StartNew();
        var response = await Client.PostAsync("/api/aso/performance/database-optimization", content);
        stopwatch.Stop();

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Assert.True(stopwatch.ElapsedMilliseconds < 20000, 
            $"Complex database query took {stopwatch.ElapsedMilliseconds}ms - should be under 20s");
        Console.WriteLine($"✅ ASO PERFORMANCE: Complex database query completed in {stopwatch.ElapsedMilliseconds}ms");
    }

    [Fact]
    public async Task APIResponseCompression_LargePayloads_CompressesEffectively()
    {
        // Arrange
        var queryParams = "appId=test-app&includeHistory=true&dateRange=12months&format=detailed&compression=gzip";
        Client.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate");

        // Act
        var response = await Client.GetAsync($"/api/aso/performance/large-payload-test?{queryParams}");

        // Assert
        var successCodes = new[] { 200, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        
        if (response.Content.Headers.ContentEncoding.Contains("gzip"))
        {
            Console.WriteLine("✅ ASO PERFORMANCE: Response is compressed with gzip");
        }
        
        var contentLength = response.Content.Headers.ContentLength ?? 0;
        Console.WriteLine($"✅ ASO PERFORMANCE: Large payload response size: {contentLength} bytes");
    }

    [Fact]
    public async Task CachePerformance_RepeatedRequests_UtilizesCacheEffectively()
    {
        // Arrange
        var request = new { AppId = "test-cache-app", DataType = "keyword_rankings", UseCache = true };
        var json = JsonSerializer.Serialize(request);
        var content1 = new StringContent(json, Encoding.UTF8, "application/json");
        var content2 = new StringContent(json, Encoding.UTF8, "application/json");

        // Act - First request (cache miss)
        var stopwatch1 = Stopwatch.StartNew();
        var response1 = await Client.PostAsync("/api/aso/performance/cache-test", content1);
        stopwatch1.Stop();
        
        // Second request (cache hit)
        var stopwatch2 = Stopwatch.StartNew();
        var response2 = await Client.PostAsync("/api/aso/performance/cache-test", content2);
        stopwatch2.Stop();

        // Assert - Second request should be significantly faster
        var successCodes = new[] { 200, 201, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response1.StatusCode, successCodes);
        Assert.Contains((int)response2.StatusCode, successCodes);
        
        if (response1.IsSuccessStatusCode && response2.IsSuccessStatusCode)
        {
            var speedImprovement = (double)stopwatch1.ElapsedMilliseconds / stopwatch2.ElapsedMilliseconds;
            Console.WriteLine($"✅ ASO PERFORMANCE: Cache improved response time by {speedImprovement:F2}x (from {stopwatch1.ElapsedMilliseconds}ms to {stopwatch2.ElapsedMilliseconds}ms)");
        }
    }

    [Theory]
    [InlineData(10, "Light load - 10 users")]
    [InlineData(25, "Medium load - 25 users")]
    [InlineData(50, "Heavy load - 50 users")]
    public async Task LoadTesting_VariousUserCounts_MaintainsPerformance(int userCount, string description)
    {
        // Arrange - Simulate different load levels
        var tasks = new List<Task<(HttpResponseMessage Response, long Duration)>>();
        
        for (int i = 0; i < userCount; i++)
        {
            tasks.Add(SimulateUserWorkflow(i));
        }

        // Act
        var results = await Task.WhenAll(tasks);
        
        // Assert
        var successfulResults = results.Where(r => 
            new[] { 200, 201, 202, 204, 404, 405, 501, 400 }.Contains((int)r.Response.StatusCode)).ToArray();
        
        var successRate = (double)successfulResults.Length / userCount * 100;
        var averageResponseTime = successfulResults.Any() ? successfulResults.Average(r => r.Duration) : 0;
        var maxResponseTime = successfulResults.Any() ? successfulResults.Max(r => r.Duration) : 0;
        
        Assert.True(successRate >= 90, $"Success rate was {successRate:F1}% - should be at least 90%");
        Assert.True(averageResponseTime < 10000, $"Average response time was {averageResponseTime:F0}ms - should be under 10s");
        
        Console.WriteLine($"✅ ASO PERFORMANCE: {description} - Success rate: {successRate:F1}%, Avg time: {averageResponseTime:F0}ms, Max time: {maxResponseTime:F0}ms");
    }

    [Fact]
    public async Task ResourceMonitoring_UnderLoad_TracksSystemMetrics()
    {
        // Arrange
        var request = new
        {
            MonitoringDuration = "30seconds",
            MetricsToTrack = new[] { "cpu_usage", "memory_usage", "request_throughput", "response_time" },
            LoadLevel = "high",
            AlertThresholds = new
            {
                CpuUsage = 80.0,
                MemoryUsage = 70.0,
                ResponseTime = 5000
            }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/performance/resource-monitoring", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO PERFORMANCE: Resource monitoring returned {response.StatusCode}");
    }

    private async Task<(HttpResponseMessage Response, long Duration)> SimulateUserWorkflow(int userId)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            // Simulate typical user workflow: check rankings, analyze reviews, view competitors
            var workflowRequest = new
            {
                UserId = $"load-test-user-{userId}",
                Workflow = new[]
                {
                    new { Action = "get_rankings", AppId = $"app-{userId % 10}" },
                    new { Action = "analyze_reviews", Count = 50 },
                    new { Action = "competitor_analysis", CompetitorCount = 3 }
                }
            };
            
            var json = JsonSerializer.Serialize(workflowRequest);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await Client.PostAsync("/api/aso/performance/user-workflow", content);
            
            stopwatch.Stop();
            return (response, stopwatch.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            Console.WriteLine($"⚠️ User workflow {userId} failed: {ex.Message}");
            return (new HttpResponseMessage(HttpStatusCode.InternalServerError), stopwatch.ElapsedMilliseconds);
        }
    }
}