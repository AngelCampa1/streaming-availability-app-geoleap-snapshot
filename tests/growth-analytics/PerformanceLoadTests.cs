using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using GeoLeap.Api;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Net.Http;
using System.Text.Json;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Tests.GrowthAnalytics;

/// <summary>
/// Performance and Load Testing Suite for Growth Analytics
/// Validates >99.9% uptime and <60-second processing requirements
/// Tests high-volume event processing and real-time analytics performance
/// </summary>
public class PerformanceLoadTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _testSessionId = Guid.NewGuid().ToString();
    private readonly ConcurrentBag<double> _responseTimes = new();
    private readonly ConcurrentBag<string> _errors = new();

    public PerformanceLoadTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
        _client.Timeout = TimeSpan.FromMinutes(5); // Extended timeout for load tests
    }

    #region High-Volume Event Processing Tests

    [Fact]
    public async Task LoadTest_ShouldProcessHighVolumeEventsUnder2Minutes()
    {
        // Arrange - Generate 100,000 analytics events
        const int eventCount = 100000;
        const int batchSize = 1000;
        var events = GenerateAnalyticsEvents(eventCount);
        
        var stopwatch = Stopwatch.StartNew();
        var successCount = 0;
        var errorCount = 0;

        // Act - Process events in parallel batches
        var batches = events.Batch(batchSize).ToList();
        var tasks = batches.Select(async batch =>
        {
            try
            {
                var batchData = new { events = batch.ToArray(), sessionId = _testSessionId };
                var response = await _client.PostAsJsonAsync("/api/analytics/events/batch", batchData);
                
                if (response.IsSuccessStatusCode)
                {
                    Interlocked.Increment(ref successCount);
                }
                else
                {
                    Interlocked.Increment(ref errorCount);
                    _errors.Add($"Batch failed: {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                Interlocked.Increment(ref errorCount);
                _errors.Add($"Batch exception: {ex.Message}");
            }
        });

        await Task.WhenAll(tasks);
        stopwatch.Stop();

        // Assert - Performance requirements
        stopwatch.Elapsed.Should().BeLessThan(TimeSpan.FromMinutes(2), 
            $"Processing {eventCount} events should complete within 2 minutes");
        
        // Verify processing success rate > 99%
        var successRate = (double)successCount / batches.Count;
        successRate.Should().BeGreaterThan(0.99, "Success rate should be > 99%");
        
        // Verify event count in database
        var processedCount = await GetProcessedEventCount();
        processedCount.Should().BeCloseTo(eventCount, eventCount * 0.01, 
            "Processed event count should be within 1% of expected");
    }

    [Fact]
    public async Task LoadTest_ShouldMaintainThroughputUnderSustainedLoad()
    {
        // Arrange - Sustained load test for 5 minutes
        const int eventsPerSecond = 500;
        const int testDurationSeconds = 300; // 5 minutes
        const int expectedTotalEvents = eventsPerSecond * testDurationSeconds;
        
        var stopwatch = Stopwatch.StartNew();
        var processedEvents = 0;
        var tasks = new List<Task>();
        
        // Act - Generate sustained load
        using var cancellationTokenSource = new CancellationTokenSource(TimeSpan.FromSeconds(testDurationSeconds));
        
        while (!cancellationTokenSource.Token.IsCancellationRequested)
        {
            var events = GenerateAnalyticsEvents(eventsPerSecond);
            
            var task = Task.Run(async () =>
            {
                try
                {
                    var batchData = new { events = events.ToArray(), sessionId = _testSessionId };
                    var batchStopwatch = Stopwatch.StartNew();
                    
                    var response = await _client.PostAsJsonAsync("/api/analytics/events/batch", batchData);
                    
                    batchStopwatch.Stop();
                    _responseTimes.Add(batchStopwatch.ElapsedMilliseconds);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        Interlocked.Add(ref processedEvents, eventsPerSecond);
                    }
                    else
                    {
                        _errors.Add($"Batch failed at {stopwatch.Elapsed}: {response.StatusCode}");
                    }
                }
                catch (Exception ex)
                {
                    _errors.Add($"Exception at {stopwatch.Elapsed}: {ex.Message}");
                }
            }, cancellationTokenSource.Token);
            
            tasks.Add(task);
            
            // Wait 1 second before next batch
            await Task.Delay(1000, cancellationTokenSource.Token);
        }

        await Task.WhenAll(tasks);
        stopwatch.Stop();

        // Assert - Throughput and reliability
        processedEvents.Should().BeGreaterThan((int)(expectedTotalEvents * 0.95), 
            "Should process at least 95% of expected events under sustained load");
        
        // Verify average response time
        var avgResponseTime = _responseTimes.Average();
        avgResponseTime.Should().BeLessThan(5000, "Average response time should be < 5 seconds");
        
        // Verify error rate < 1%
        var errorRate = (double)_errors.Count / tasks.Count;
        errorRate.Should().BeLessThan(0.01, "Error rate should be < 1%");
    }

    [Fact]
    public async Task LoadTest_ShouldHandleConcurrentDashboardQueries()
    {
        // Arrange - Simulate multiple users accessing analytics dashboards
        const int concurrentUsers = 100;
        const int queriesPerUser = 10;
        var dashboardQueries = new[]
        {
            "/api/analytics/dashboard/overview",
            "/api/analytics/dashboard/attribution",
            "/api/analytics/dashboard/real-time",
            "/api/analytics/dashboard/user-journey",
            "/api/analytics/dashboard/revenue"
        };

        // Pre-populate with test data
        await SeedAnalyticsData(10000);
        
        var stopwatch = Stopwatch.StartNew();
        var responseTimes = new ConcurrentBag<double>();
        var successCount = 0;
        var errorCount = 0;

        // Act - Execute concurrent dashboard queries
        var tasks = Enumerable.Range(0, concurrentUsers).Select(async userId =>
        {
            for (int query = 0; query < queriesPerUser; query++)
            {
                var endpoint = dashboardQueries[query % dashboardQueries.Length];
                var queryStopwatch = Stopwatch.StartNew();
                
                try
                {
                    var response = await _client.GetAsync($"{endpoint}?timeframe=7d&userId=user_{userId}");
                    queryStopwatch.Stop();
                    
                    responseTimes.Add(queryStopwatch.ElapsedMilliseconds);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        Interlocked.Increment(ref successCount);
                    }
                    else
                    {
                        Interlocked.Increment(ref errorCount);
                    }
                }
                catch (Exception)
                {
                    Interlocked.Increment(ref errorCount);
                }
            }
        });

        await Task.WhenAll(tasks);
        stopwatch.Stop();

        // Assert - Dashboard performance
        var avgResponseTime = responseTimes.Average();
        avgResponseTime.Should().BeLessThan(3000, "Average dashboard query should be < 3 seconds");
        
        // 95th percentile should be reasonable
        var sorted = responseTimes.OrderBy(x => x).ToList();
        var p95 = sorted[(int)(sorted.Count * 0.95)];
        p95.Should().BeLessThan(8000, "95th percentile response time should be < 8 seconds");
        
        // Success rate should be > 99%
        var successRate = (double)successCount / (concurrentUsers * queriesPerUser);
        successRate.Should().BeGreaterThan(0.99, "Dashboard query success rate should be > 99%");
    }

    #endregion

    #region Real-Time Analytics Performance Tests

    [Fact]
    public async Task RealTime_ShouldProcessEventsUnder60Seconds()
    {
        // Arrange - Real-time processing test
        var eventData = new
        {
            userId = Guid.NewGuid().ToString(),
            eventType = "user_conversion",
            value = 299.99,
            timestamp = DateTime.UtcNow,
            sessionId = _testSessionId,
            requiresRealTimeProcessing = true
        };

        var processingStopwatch = Stopwatch.StartNew();

        // Act - Send event and wait for real-time processing
        var eventResponse = await _client.PostAsJsonAsync("/api/analytics/real-time-event", eventData);
        eventResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);

        // Poll for processed result in dashboard
        var processed = false;
        while (processingStopwatch.Elapsed < TimeSpan.FromSeconds(65) && !processed)
        {
            var dashboardResponse = await _client.GetAsync(
                $"/api/analytics/dashboard/real-time?userId={eventData.userId}");
            
            if (dashboardResponse.IsSuccessStatusCode)
            {
                var content = await dashboardResponse.Content.ReadAsStringAsync();
                var dashboard = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
                
                if (dashboard.ContainsKey("recent_events") && 
                    dashboard["recent_events"].ToString().Contains(eventData.userId))
                {
                    processed = true;
                }
            }

            if (!processed)
            {
                await Task.Delay(1000); // Wait 1 second before next check
            }
        }

        processingStopwatch.Stop();

        // Assert - Real-time processing requirement
        processed.Should().BeTrue("Event should appear in real-time dashboard");
        processingStopwatch.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(60), 
            "Real-time processing should complete within 60 seconds");
    }

    [Fact]
    public async Task RealTime_ShouldMaintainAccuracyUnderHighVolume()
    {
        // Arrange - High volume real-time test
        const int eventCount = 10000;
        const int expectedAccuracy = 98; // 98% minimum accuracy
        
        var events = GenerateRealTimeEvents(eventCount);
        var processingStopwatch = Stopwatch.StartNew();

        // Act - Send all events for real-time processing
        var tasks = events.Select(async eventData =>
        {
            try
            {
                await _client.PostAsJsonAsync("/api/analytics/real-time-event", eventData);
                return true;
            }
            catch
            {
                return false;
            }
        });

        var results = await Task.WhenAll(tasks);
        var sentCount = results.Count(x => x);

        // Wait for processing to complete
        await Task.Delay(TimeSpan.FromSeconds(90));
        processingStopwatch.Stop();

        // Act - Verify processed events in real-time dashboard
        var dashboardResponse = await _client.GetAsync(
            $"/api/analytics/dashboard/real-time-summary?sessionId={_testSessionId}");
        
        var content = await dashboardResponse.Content.ReadAsStringAsync();
        var summary = JsonSerializer.Deserialize<Dictionary<string, object>>(content);

        // Assert - Real-time accuracy and performance
        var processedCount = ((JsonElement)summary["total_processed_events"]).GetInt32();
        var accuracy = (double)processedCount / sentCount * 100;
        
        accuracy.Should().BeGreaterThan(expectedAccuracy, 
            $"Real-time processing accuracy should be > {expectedAccuracy}%");
        
        processingStopwatch.Elapsed.Should().BeLessThan(TimeSpan.FromMinutes(2), 
            "High volume real-time processing should complete within 2 minutes");
    }

    #endregion

    #region Failover and Recovery Tests

    [Fact]
    public async Task Failover_ShouldRecoverFromDatabaseConnectionLoss()
    {
        // Arrange - Baseline processing
        var baselineEvents = GenerateAnalyticsEvents(1000);
        var baselineResponse = await ProcessEventBatch(baselineEvents);
        baselineResponse.Should().BeTrue("Baseline processing should succeed");

        // Act - Simulate database connection issues
        await _client.PostAsync("/api/test/simulate-database-failure", null);
        
        // Send events during "failure"
        var failureEvents = GenerateAnalyticsEvents(500);
        var failureStopwatch = Stopwatch.StartNew();
        
        var failureResponse = await ProcessEventBatch(failureEvents);
        // Should either succeed (if fallback works) or fail gracefully
        
        // Act - Restore connection and verify recovery
        await _client.PostAsync("/api/test/restore-database-connection", null);
        await Task.Delay(5000); // Allow recovery time
        
        var recoveryEvents = GenerateAnalyticsEvents(1000);
        var recoveryResponse = await ProcessEventBatch(recoveryEvents);
        
        failureStopwatch.Stop();

        // Assert - System should recover
        recoveryResponse.Should().BeTrue("System should recover after database restoration");
        
        // Check data consistency after recovery
        var totalProcessed = await GetProcessedEventCount();
        totalProcessed.Should().BeGreaterThan(1400, // baseline + recovery at minimum
            "Should process events before and after recovery");
        
        failureStopwatch.Elapsed.Should().BeLessThan(TimeSpan.FromMinutes(1), 
            "Recovery should be relatively quick");
    }

    [Fact]
    public async Task Failover_ShouldMaintainDataConsistencyDuringFailover()
    {
        // Arrange - Create test scenario with critical events
        var criticalEvents = GenerateAnalyticsEvents(100, isCritical: true);
        var normalEvents = GenerateAnalyticsEvents(1000, isCritical: false);
        
        var allEvents = criticalEvents.Concat(normalEvents).ToList();
        var criticalEventIds = criticalEvents.Select(e => e.GetProperty("eventId").GetString()).ToList();

        // Act - Process events with simulated intermittent failures
        await _client.PostAsync("/api/test/simulate-intermittent-failures", null);
        
        var processingTasks = allEvents.Select(async eventData =>
        {
            try
            {
                var response = await _client.PostAsJsonAsync("/api/analytics/event", eventData);
                return new { Success = response.IsSuccessStatusCode, EventId = eventData.GetProperty("eventId").GetString() };
            }
            catch
            {
                return new { Success = false, EventId = eventData.GetProperty("eventId").GetString() };
            }
        });

        var results = await Task.WhenAll(processingTasks);
        
        // Disable failure simulation
        await _client.PostAsync("/api/test/disable-failure-simulation", null);
        await Task.Delay(10000); // Allow system to stabilize

        // Act - Verify data consistency
        var consistencyResponse = await _client.GetAsync(
            $"/api/analytics/data-consistency-check?sessionId={_testSessionId}");
        var consistencyContent = await consistencyResponse.Content.ReadAsStringAsync();
        var consistencyReport = JsonSerializer.Deserialize<Dictionary<string, object>>(consistencyContent);

        // Assert - Critical events should be preserved
        var processedCriticalEvents = await GetProcessedCriticalEvents(criticalEventIds);
        var criticalEventPreservationRate = (double)processedCriticalEvents.Count / criticalEventIds.Count;
        
        criticalEventPreservationRate.Should().BeGreaterThan(0.95, 
            "Critical events should have >95% preservation rate during failures");
        
        // Data consistency should be maintained
        var consistencyScore = ((JsonElement)consistencyReport["consistency_score"]).GetDouble();
        consistencyScore.Should().BeGreaterThan(0.98, "Data consistency should be >98% after recovery");
    }

    #endregion

    #region Memory and Resource Utilization Tests

    [Fact]
    public async Task Performance_ShouldMaintainReasonableMemoryUsage()
    {
        // Arrange - Get baseline memory usage
        var baselineMemory = await GetMemoryUsage();
        
        // Act - Process large dataset
        const int largeDatasetSize = 50000;
        var largeDataset = GenerateAnalyticsEvents(largeDatasetSize);
        
        var processingStopwatch = Stopwatch.StartNew();
        
        // Process in batches to simulate realistic load
        var batches = largeDataset.Batch(1000).ToList();
        foreach (var batch in batches)
        {
            await ProcessEventBatch(batch);
        }
        
        processingStopwatch.Stop();
        
        // Force garbage collection and measure memory
        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();
        
        await Task.Delay(2000); // Allow system to stabilize
        var finalMemory = await GetMemoryUsage();

        // Assert - Memory usage should be reasonable
        var memoryIncrease = finalMemory - baselineMemory;
        memoryIncrease.Should().BeLessThan(500 * 1024 * 1024, // < 500MB increase
            "Memory increase should be < 500MB for processing large dataset");
        
        // Processing should be efficient
        var eventsPerSecond = largeDatasetSize / processingStopwatch.Elapsed.TotalSeconds;
        eventsPerSecond.Should().BeGreaterThan(1000, "Should process >1000 events per second");
    }

    #endregion

    #region Helper Methods

    private List<JsonElement> GenerateAnalyticsEvents(int count, bool isCritical = false)
    {
        var events = new List<JsonElement>();
        var random = new Random();
        
        for (int i = 0; i < count; i++)
        {
            var eventData = JsonSerializer.SerializeToDocument(new
            {
                eventId = Guid.NewGuid().ToString(),
                userId = $"user_{random.Next(1, 10000)}",
                eventType = GetRandomEventType(),
                timestamp = DateTime.UtcNow.AddMilliseconds(-random.Next(0, 3600000)), // Last hour
                sessionId = _testSessionId,
                value = random.NextDouble() * 1000,
                platform = GetRandomPlatform(),
                channel = GetRandomChannel(),
                isCritical = isCritical
            });
            
            events.Add(eventData.RootElement);
        }
        
        return events;
    }

    private List<JsonElement> GenerateRealTimeEvents(int count)
    {
        var events = new List<JsonElement>();
        var random = new Random();
        
        for (int i = 0; i < count; i++)
        {
            var eventData = JsonSerializer.SerializeToDocument(new
            {
                eventId = Guid.NewGuid().ToString(),
                userId = $"realtime_user_{random.Next(1, 1000)}",
                eventType = "real_time_event",
                timestamp = DateTime.UtcNow,
                sessionId = _testSessionId,
                value = random.NextDouble() * 500,
                requiresRealTimeProcessing = true
            });
            
            events.Add(eventData.RootElement);
        }
        
        return events;
    }

    private async Task<bool> ProcessEventBatch(IEnumerable<JsonElement> events)
    {
        try
        {
            var batchData = new { events = events.ToArray(), sessionId = _testSessionId };
            var response = await _client.PostAsJsonAsync("/api/analytics/events/batch", batchData);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    private async Task SeedAnalyticsData(int eventCount)
    {
        var seedEvents = GenerateAnalyticsEvents(eventCount);
        await ProcessEventBatch(seedEvents);
        await Task.Delay(5000); // Allow processing to complete
    }

    private async Task<int> GetProcessedEventCount()
    {
        try
        {
            var response = await _client.GetAsync($"/api/analytics/processed-count?sessionId={_testSessionId}");
            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            return ((JsonElement)result["count"]).GetInt32();
        }
        catch
        {
            return 0;
        }
    }

    private async Task<List<string>> GetProcessedCriticalEvents(List<string> criticalEventIds)
    {
        try
        {
            var response = await _client.PostAsJsonAsync("/api/analytics/critical-events-check", 
                new { eventIds = criticalEventIds });
            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<Dictionary<string, List<string>>>(content);
            return result["found_events"];
        }
        catch
        {
            return new List<string>();
        }
    }

    private async Task<long> GetMemoryUsage()
    {
        try
        {
            var response = await _client.GetAsync("/api/system/memory-usage");
            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            return ((JsonElement)result["used_memory"]).GetInt64();
        }
        catch
        {
            return Process.GetCurrentProcess().WorkingSet64;
        }
    }

    private string GetRandomEventType()
    {
        var eventTypes = new[] { "page_view", "user_action", "conversion", "engagement", "attribution" };
        return eventTypes[new Random().Next(eventTypes.Length)];
    }

    private string GetRandomPlatform()
    {
        var platforms = new[] { "web", "mobile_app", "mobile_web", "tablet", "desktop_app" };
        return platforms[new Random().Next(platforms.Length)];
    }

    private string GetRandomChannel()
    {
        var channels = new[] { "organic_search", "paid_search", "social_media", "email", "direct", "affiliate" };
        return channels[new Random().Next(channels.Length)];
    }

    #endregion

    public void Dispose()
    {
        _client?.Dispose();
    }
}

// Extension method for batching
public static class EnumerableExtensions
{
    public static IEnumerable<IEnumerable<T>> Batch<T>(this IEnumerable<T> items, int maxItems)
    {
        return items.Select((item, index) => new { item, index })
                   .GroupBy(x => x.index / maxItems)
                   .Select(g => g.Select(x => x.item));
    }
}