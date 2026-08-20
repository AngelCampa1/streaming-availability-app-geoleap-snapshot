using Xunit;
using Moq;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using GeoLeap.Api.Services;
using GeoLeap.Api.Exceptions;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct unit tests for RateLimitingService bypassing HTTP layer
/// Tests rate limiting algorithms, window management, and concurrent access
/// </summary>
public class RateLimitingServiceDirectTests : IDisposable
{
    private readonly IMemoryCache _cache;
    private readonly Mock<ILogger<RateLimitingService>> _mockLogger;
    private readonly RateLimitingService _service;

    public RateLimitingServiceDirectTests()
    {
        var cacheOptions = new MemoryCacheOptions
        {
            SizeLimit = 1024
        };
        _cache = new MemoryCache(cacheOptions);
        _mockLogger = new Mock<ILogger<RateLimitingService>>();
        _service = new RateLimitingService(_cache, _mockLogger.Object);
    }

    public void Dispose()
    {
        _cache?.Dispose();
    }

    #region Basic Rate Limiting Tests

    [Fact]
    public async Task CheckRateLimitAsync_FirstRequest_AllowsRequest()
    {
        // Arrange
        var key = "test-key-1";
        var maxRequests = 5;
        var window = TimeSpan.FromMinutes(1);

        // Act
        var result = await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Assert
        Assert.True(result.IsAllowed);
        Assert.Equal(4, result.RemainingRequests); // 5 max - 1 used = 4 remaining
        Assert.Equal(1, result.TotalRequestsInWindow);
        Assert.Equal(TimeSpan.Zero, result.RetryAfter);
    }

    [Fact]
    public async Task CheckRateLimitAsync_WithinLimit_AllowsRequests()
    {
        // Arrange
        var key = "test-key-2";
        var maxRequests = 3;
        var window = TimeSpan.FromMinutes(1);

        // Act - Make 3 requests (at limit)
        var result1 = await _service.CheckRateLimitAsync(key, maxRequests, window);
        var result2 = await _service.CheckRateLimitAsync(key, maxRequests, window);
        var result3 = await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Assert
        Assert.True(result1.IsAllowed);
        Assert.True(result2.IsAllowed);
        Assert.True(result3.IsAllowed);
        Assert.Equal(0, result3.RemainingRequests); // All 3 used
        Assert.Equal(3, result3.TotalRequestsInWindow);
    }

    [Fact]
    public async Task CheckRateLimitAsync_ExceedsLimit_BlocksRequest()
    {
        // Arrange
        var key = "test-key-3";
        var maxRequests = 2;
        var window = TimeSpan.FromMinutes(1);

        // Act - Make 3 requests (1 over limit)
        await _service.CheckRateLimitAsync(key, maxRequests, window);
        await _service.CheckRateLimitAsync(key, maxRequests, window);
        var result3 = await _service.CheckRateLimitAsync(key, maxRequests, window); // Should be blocked

        // Assert
        Assert.False(result3.IsAllowed);
        Assert.Equal(0, result3.RemainingRequests);
        Assert.Equal(2, result3.TotalRequestsInWindow); // Still shows 2 (blocked request not counted)
        Assert.True(result3.RetryAfter > TimeSpan.Zero);
    }

    [Fact]
    public async Task CheckRateLimitAsync_DifferentKeys_IndependentLimits()
    {
        // Arrange
        var key1 = "user-1";
        var key2 = "user-2";
        var maxRequests = 2;
        var window = TimeSpan.FromMinutes(1);

        // Act
        await _service.CheckRateLimitAsync(key1, maxRequests, window);
        await _service.CheckRateLimitAsync(key1, maxRequests, window);
        var result1 = await _service.CheckRateLimitAsync(key1, maxRequests, window); // Should be blocked

        var result2 = await _service.CheckRateLimitAsync(key2, maxRequests, window); // Different key, should be allowed

        // Assert
        Assert.False(result1.IsAllowed); // key1 is blocked
        Assert.True(result2.IsAllowed);  // key2 is allowed (independent limit)
    }

    #endregion

    #region Window Reset Tests

    [Fact]
    public async Task CheckRateLimitAsync_AfterWindowExpires_ResetsLimit()
    {
        // Arrange
        var key = "test-key-4";
        var maxRequests = 2;
        var window = TimeSpan.FromMilliseconds(100); // Very short window for test

        // Act - Use up the limit
        await _service.CheckRateLimitAsync(key, maxRequests, window);
        await _service.CheckRateLimitAsync(key, maxRequests, window);
        var blockedResult = await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Wait for window to expire
        await Task.Delay(150);

        // Try again after window expiration
        var allowedResult = await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Assert
        Assert.False(blockedResult.IsAllowed); // Was blocked before window reset
        Assert.True(allowedResult.IsAllowed);  // Allowed after window reset
        Assert.Equal(1, allowedResult.RemainingRequests); // Fresh window, 1 request used
    }

    [Fact]
    public async Task CheckRateLimitAsync_WindowResetTime_IsAccurate()
    {
        // Arrange
        var key = "test-key-5";
        var maxRequests = 3;
        var window = TimeSpan.FromMinutes(5);

        // Act
        var result = await _service.CheckRateLimitAsync(key, maxRequests, window);
        var afterCallTime = DateTime.UtcNow;

        // Assert - Window reset time should be in the future but within the window duration
        // Since windows are floor-aligned, reset time could be anywhere from now to now+window
        Assert.True(result.WindowResetTime > DateTime.UtcNow.AddSeconds(-5), "Window reset time should be in the future or very recent");
        Assert.True(result.WindowResetTime <= afterCallTime.Add(window), $"Window reset time should not exceed current time + window duration");

        // Verify it's a reasonable time (within window range)
        var timeUntilReset = result.WindowResetTime - DateTime.UtcNow;
        Assert.True(timeUntilReset.TotalSeconds >= 0 && timeUntilReset <= window,
            $"Time until reset ({timeUntilReset.TotalSeconds}s) should be between 0 and window duration ({window.TotalSeconds}s)");
    }

    #endregion

    #region User + Endpoint Key Tests

    [Fact]
    public async Task CheckRateLimitAsync_WithUserIdAndEndpoint_FormatsKeyCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var endpoint = "/api/search";
        var maxRequests = 5;
        var window = TimeSpan.FromMinutes(1);

        // Act
        var result = await _service.CheckRateLimitAsync(userId, endpoint, maxRequests, window);

        // Assert
        Assert.True(result.IsAllowed);
        Assert.Equal(4, result.RemainingRequests);
    }

    [Fact]
    public async Task CheckRateLimitAsync_SameUserDifferentEndpoints_IndependentLimits()
    {
        // Arrange
        var userId = "user-456";
        var endpoint1 = "/api/content";
        var endpoint2 = "/api/search";
        var maxRequests = 1;
        var window = TimeSpan.FromMinutes(1);

        // Act - Max out endpoint1 limit
        await _service.CheckRateLimitAsync(userId, endpoint1, maxRequests, window);
        var result1 = await _service.CheckRateLimitAsync(userId, endpoint1, maxRequests, window);

        // endpoint2 should still be allowed (independent limit)
        var result2 = await _service.CheckRateLimitAsync(userId, endpoint2, maxRequests, window);

        // Assert
        Assert.False(result1.IsAllowed); // endpoint1 blocked
        Assert.True(result2.IsAllowed);  // endpoint2 still allowed
    }

    [Fact]
    public async Task CheckRateLimitAsync_DifferentUsersSameEndpoint_IndependentLimits()
    {
        // Arrange
        var user1 = "user-A";
        var user2 = "user-B";
        var endpoint = "/api/data";
        var maxRequests = 1;
        var window = TimeSpan.FromMinutes(1);

        // Act - Max out user1's limit
        await _service.CheckRateLimitAsync(user1, endpoint, maxRequests, window);
        var result1 = await _service.CheckRateLimitAsync(user1, endpoint, maxRequests, window);

        // user2 should still be allowed (independent user limit)
        var result2 = await _service.CheckRateLimitAsync(user2, endpoint, maxRequests, window);

        // Assert
        Assert.False(result1.IsAllowed); // user1 blocked
        Assert.True(result2.IsAllowed);  // user2 allowed
    }

    #endregion

    #region Reset Functionality Tests

    [Fact]
    public async Task ResetRateLimitAsync_ClearsLimit()
    {
        // Arrange
        var key = "test-key-6";
        var maxRequests = 1;
        var window = TimeSpan.FromMinutes(10); // Long window

        // Act - Use up the limit
        await _service.CheckRateLimitAsync(key, maxRequests, window);
        var blockedResult = await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Reset the limit
        await _service.ResetRateLimitAsync(key);

        // Try again after reset
        var allowedResult = await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Assert
        Assert.False(blockedResult.IsAllowed); // Was blocked before reset
        Assert.True(allowedResult.IsAllowed);  // Allowed after manual reset
    }

    [Fact]
    public async Task ResetRateLimitAsync_WithNonExistentKey_DoesNotThrow()
    {
        // Arrange
        var key = "nonexistent-key";

        // Act & Assert - Should not throw
        await _service.ResetRateLimitAsync(key);
    }

    #endregion

    #region Stats Retrieval Tests

    [Fact]
    public async Task GetRateLimitStatsAsync_WithActiveLimit_ReturnsStats()
    {
        // Arrange
        var key = "test-key-7";
        var maxRequests = 5;
        var window = TimeSpan.FromMinutes(1);

        // Act - Make some requests
        await _service.CheckRateLimitAsync(key, maxRequests, window);
        await _service.CheckRateLimitAsync(key, maxRequests, window);
        await _service.CheckRateLimitAsync(key, maxRequests, window);

        var stats = await _service.GetRateLimitStatsAsync(key);

        // Assert
        Assert.Equal(key, stats.Key);
        Assert.Equal(3, stats.RequestCount);
        Assert.Equal(5, stats.MaxRequests);
        Assert.False(stats.IsBlocked); // 3/5 requests used, not blocked yet
    }

    [Fact]
    public async Task GetRateLimitStatsAsync_WithExceededLimit_ShowsBlocked()
    {
        // Arrange
        var key = "test-key-8";
        var maxRequests = 2;
        var window = TimeSpan.FromMinutes(1);

        // Act - Exceed the limit
        await _service.CheckRateLimitAsync(key, maxRequests, window);
        await _service.CheckRateLimitAsync(key, maxRequests, window);
        await _service.CheckRateLimitAsync(key, maxRequests, window); // Blocked

        var stats = await _service.GetRateLimitStatsAsync(key);

        // Assert
        Assert.Equal(2, stats.RequestCount); // Only counts allowed requests
        Assert.Equal(2, stats.MaxRequests);
        Assert.True(stats.IsBlocked); // At limit, should be marked as blocked
    }

    [Fact]
    public async Task GetRateLimitStatsAsync_WithNonExistentKey_ReturnsEmptyStats()
    {
        // Arrange
        var key = "never-used-key";

        // Act
        var stats = await _service.GetRateLimitStatsAsync(key);

        // Assert
        Assert.Equal(key, stats.Key);
        Assert.Equal(0, stats.RequestCount);
        Assert.Equal(0, stats.MaxRequests);
        Assert.False(stats.IsBlocked);
    }

    #endregion

    #region Edge Cases and Stress Tests

    [Fact]
    public async Task CheckRateLimitAsync_ZeroMaxRequests_AlwaysBlocks()
    {
        // Arrange
        var key = "test-key-9";
        var maxRequests = 0;
        var window = TimeSpan.FromMinutes(1);

        // Act
        var result = await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Assert
        Assert.False(result.IsAllowed);
        Assert.Equal(0, result.RemainingRequests);
    }

    [Fact]
    public async Task CheckRateLimitAsync_VeryShortWindow_HandlesCorrectly()
    {
        // Arrange
        var key = "test-key-10";
        var maxRequests = 1;
        var window = TimeSpan.FromMilliseconds(1); // Extremely short

        // Act
        await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Wait for window to definitely expire
        await Task.Delay(10);

        var result = await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Assert - Should be allowed after window expiry
        Assert.True(result.IsAllowed);
    }

    [Fact]
    public async Task CheckRateLimitAsync_VeryLongWindow_HandlesCorrectly()
    {
        // Arrange
        var key = "test-key-11";
        var maxRequests = 1;
        var window = TimeSpan.FromDays(365); // Very long window

        // Act
        await _service.CheckRateLimitAsync(key, maxRequests, window);
        var result = await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Assert - Should be blocked (won't reset for a year)
        Assert.False(result.IsAllowed);
    }

    [Fact]
    public async Task CheckRateLimitAsync_ConcurrentRequests_HandlesCorrectly()
    {
        // Arrange
        var key = "test-key-12";
        var maxRequests = 10;
        var window = TimeSpan.FromMinutes(1);
        var tasks = new List<Task<RateLimitResult>>();

        // Act - Make 20 concurrent requests (10 should be allowed, 10 blocked)
        for (int i = 0; i < 20; i++)
        {
            tasks.Add(_service.CheckRateLimitAsync(key, maxRequests, window));
        }

        var results = await Task.WhenAll(tasks);

        // Assert
        var allowedCount = results.Count(r => r.IsAllowed);
        var blockedCount = results.Count(r => !r.IsAllowed);

        Assert.Equal(10, allowedCount); // Exactly 10 should be allowed
        Assert.Equal(10, blockedCount); // Exactly 10 should be blocked
    }

    [Fact]
    public async Task CheckRateLimitAsync_ExtremelyHighMaxRequests_HandlesCorrectly()
    {
        // Arrange
        var key = "test-key-13";
        var maxRequests = int.MaxValue;
        var window = TimeSpan.FromMinutes(1);

        // Act
        var result = await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Assert
        Assert.True(result.IsAllowed);
        Assert.True(result.RemainingRequests > 0);
    }

    [Fact]
    public async Task CheckRateLimitAsync_SpecialCharactersInKey_HandlesCorrectly()
    {
        // Arrange
        var key = "user:123:endpoint:/api/v1/data?query=test&limit=10";
        var maxRequests = 5;
        var window = TimeSpan.FromMinutes(1);

        // Act
        var result = await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Assert
        Assert.True(result.IsAllowed);
        Assert.Equal(4, result.RemainingRequests);
    }

    [Fact]
    public async Task CheckRateLimitAsync_EmptyKey_HandlesCorrectly()
    {
        // Arrange
        var key = "";
        var maxRequests = 5;
        var window = TimeSpan.FromMinutes(1);

        // Act
        var result = await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Assert - Should still work (empty key is valid, though not recommended)
        Assert.True(result.IsAllowed);
    }

    [Fact]
    public async Task CheckRateLimitAsync_RetryAfter_IsReasonable()
    {
        // Arrange
        var key = "test-key-14";
        var maxRequests = 1;
        var window = TimeSpan.FromMinutes(5);

        // Act - Exceed limit
        await _service.CheckRateLimitAsync(key, maxRequests, window);
        var blockedResult = await _service.CheckRateLimitAsync(key, maxRequests, window);

        // Assert
        Assert.True(blockedResult.RetryAfter > TimeSpan.Zero);
        Assert.True(blockedResult.RetryAfter <= window); // Should be less than or equal to window
        Assert.True(blockedResult.RetryAfter.TotalSeconds < 301); // Should be close to 5 minutes (300s) + buffer
    }

    #endregion

    #region Integration Scenario Tests

    [Fact]
    public async Task RateLimitScenario_BurstTrafficThenBackoff()
    {
        // Arrange
        var key = "user-burst-test";
        var maxRequests = 5;
        var window = TimeSpan.FromSeconds(10);

        // Act - Burst of requests (use up limit)
        for (int i = 0; i < 5; i++)
        {
            var result = await _service.CheckRateLimitAsync(key, maxRequests, window);
            Assert.True(result.IsAllowed, $"Request {i + 1} should be allowed");
        }

        // Next request should be blocked
        var blockedResult = await _service.CheckRateLimitAsync(key, maxRequests, window);
        Assert.False(blockedResult.IsAllowed);

        // Wait for window to reset
        await Task.Delay(TimeSpan.FromSeconds(11));

        // Should be allowed again after window reset
        var allowedAgainResult = await _service.CheckRateLimitAsync(key, maxRequests, window);
        Assert.True(allowedAgainResult.IsAllowed);
    }

    [Fact]
    public async Task RateLimitScenario_MultipleUsersMultipleEndpoints()
    {
        // Arrange
        var user1 = "user-A";
        var user2 = "user-B";
        var endpoint1 = "/api/search";
        var endpoint2 = "/api/content";
        var maxRequests = 2;
        var window = TimeSpan.FromMinutes(1);

        // Act & Assert - Each user+endpoint combination has independent limits

        // User1 on endpoint1
        var u1e1_r1 = await _service.CheckRateLimitAsync(user1, endpoint1, maxRequests, window);
        var u1e1_r2 = await _service.CheckRateLimitAsync(user1, endpoint1, maxRequests, window);
        var u1e1_r3 = await _service.CheckRateLimitAsync(user1, endpoint1, maxRequests, window);
        Assert.True(u1e1_r1.IsAllowed);
        Assert.True(u1e1_r2.IsAllowed);
        Assert.False(u1e1_r3.IsAllowed); // Blocked

        // User1 on endpoint2 (independent limit)
        var u1e2_r1 = await _service.CheckRateLimitAsync(user1, endpoint2, maxRequests, window);
        Assert.True(u1e2_r1.IsAllowed); // Still allowed on different endpoint

        // User2 on endpoint1 (independent limit)
        var u2e1_r1 = await _service.CheckRateLimitAsync(user2, endpoint1, maxRequests, window);
        Assert.True(u2e1_r1.IsAllowed); // Still allowed for different user
    }

    #endregion
}
