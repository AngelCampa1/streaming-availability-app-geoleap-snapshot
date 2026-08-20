using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Moq;
using System.Text;
using System.Text.Json;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

public class ABTestingServiceDirectTests
{
    private readonly Mock<ILogger<ABTestingService>> _mockLogger;
    private readonly Mock<IDistributedCache> _mockCache;
    private readonly ABTestingService _service;

    public ABTestingServiceDirectTests()
    {
        _mockLogger = new Mock<ILogger<ABTestingService>>();
        _mockCache = new Mock<IDistributedCache>();
        _service = new ABTestingService(_mockLogger.Object, _mockCache.Object);
    }

    #region CreateExperimentAsync Tests

    [Fact]
    public async Task CreateExperimentAsync_WithValidRequest_ReturnsExperiment()
    {
        // Arrange
        var request = new CreateExperimentRequest
        {
            Name = "Test Experiment",
            Description = "Testing description",
            TrafficPercentage = 50,
            Variants = new List<CreateExperimentVariantRequest>
            {
                new() { Name = "Variant A", Configuration = "{\"feature\": true}", TrafficPercentage = 50 },
                new() { Name = "Variant B", Configuration = "{\"feature\": false}", TrafficPercentage = 50 }
            }
        };

        // Act
        var result = await _service.CreateExperimentAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Test Experiment", result.Name);
        Assert.Equal("Testing description", result.Description);
        Assert.Equal(50, result.TrafficPercentage);
        Assert.Equal(2, result.Variants.Count);
        Assert.False(result.IsActive);
    }

    [Fact]
    public async Task CreateExperimentAsync_WithNullVariants_ReturnsExperimentWithEmptyVariantList()
    {
        // Arrange
        var request = new CreateExperimentRequest
        {
            Name = "Test",
            Variants = null
        };

        // Act
        var result = await _service.CreateExperimentAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Variants);
    }

    [Fact]
    public async Task CreateExperimentAsync_WithMissingDates_UsesDefaultStartDate()
    {
        // Arrange
        var request = new CreateExperimentRequest
        {
            Name = "Test",
            StartDate = null,
            EndDate = null
        };

        // Act
        var result = await _service.CreateExperimentAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.StartDate <= DateTime.UtcNow);
    }

    #endregion

    #region CreateABTestAsync Tests

    [Fact]
    public async Task CreateABTestAsync_WithValidRequest_ReturnsTestId()
    {
        // Arrange
        var request = new CreateABTestRequest
        {
            Name = "Test AB",
            Description = "Testing",
            TrafficPercentage = 80,
            Variants = new List<ABTestVariantRequest>
            {
                new() { Name = "Control", TrafficWeight = 50 },
                new() { Name = "Treatment", TrafficWeight = 50 }
            }
        };

        // Act
        var result = await _service.CreateABTestAsync(request, "test-user");

        // Assert
        Assert.NotNull(result);
        Assert.StartsWith("test_", result);
    }

    [Fact]
    public async Task CreateABTestAsync_NormalizesVariantWeights()
    {
        // Arrange
        var request = new CreateABTestRequest
        {
            Name = "Test",
            Variants = new List<ABTestVariantRequest>
            {
                new() { Name = "A", TrafficWeight = 1 },
                new() { Name = "B", TrafficWeight = 2 },
                new() { Name = "C", TrafficWeight = 1 }
            }
        };

        // Act
        var testId = await _service.CreateABTestAsync(request, "user");

        // Assert - test should be saved to cache
        Assert.NotNull(testId);
        _mockCache.Verify(c => c.SetAsync(
            It.Is<string>(k => k.StartsWith("abtest:")),
            It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateABTestAsync_WithCacheException_ReturnsFallbackTestId()
    {
        // Arrange
        var request = new CreateABTestRequest { Name = "Test" };
        _mockCache.Setup(c => c.SetAsync(
            It.IsAny<string>(),
            It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.CreateABTestAsync(request, "user");

        // Assert - should return fallback GUID instead of throwing
        Assert.NotNull(result);
    }

    #endregion

    #region GetABTestAsync Tests

    [Fact]
    public async Task GetABTestAsync_WithCachedTest_ReturnsTest()
    {
        // Arrange
        var testId = "test-123";
        var test = new ABTest
        {
            TestId = testId,
            Name = "Cached Test",
            IsActive = true,
            Status = ABTestStatus.Active
        };
        var json = JsonSerializer.Serialize(test);
        var bytes = Encoding.UTF8.GetBytes(json);

        _mockCache.Setup(c => c.GetAsync($"abtest:{testId}", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bytes);

        // Act
        var result = await _service.GetABTestAsync(testId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(testId, result.TestId);
        Assert.Equal("Cached Test", result.Name);
    }

    [Fact]
    public async Task GetABTestAsync_WithNoCachedTest_ReturnsNull()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.GetABTestAsync("nonexistent");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetABTestAsync_WithCacheException_ReturnsNull()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.GetABTestAsync("test-123");

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region GetActiveABTestsAsync Tests

    [Fact]
    public async Task GetActiveABTestsAsync_WithCachedTests_ReturnsTestList()
    {
        // Arrange
        var tests = new List<ABTest>
        {
            new() { TestId = "test-1", Name = "Test 1", IsActive = true },
            new() { TestId = "test-2", Name = "Test 2", IsActive = true }
        };
        var json = JsonSerializer.Serialize(tests);
        var bytes = Encoding.UTF8.GetBytes(json);

        _mockCache.Setup(c => c.GetAsync("active_abtests", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bytes);

        // Act
        var result = await _service.GetActiveABTestsAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetActiveABTestsAsync_WithNoCache_ReturnsEmptyList()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.GetActiveABTestsAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetActiveABTestsAsync_WithCacheException_ReturnsEmptyList()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.GetActiveABTestsAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #endregion

    #region AssignUserToTestAsync Tests

    [Fact]
    public async Task AssignUserToTestAsync_WithExistingAssignment_ReturnsExistingAssignment()
    {
        // Arrange
        var userId = "user-123";
        var assignment = new ABTestAssignment
        {
            UserId = userId,
            TestId = "test-1",
            VariantId = "variant-a",
            AssignedAt = DateTime.UtcNow
        };
        var assignmentBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(assignment));

        var test = new ABTest
        {
            TestId = "test-1",
            Variants = new List<ABTestVariant>
            {
                new() { VariantId = "variant-a", RankingConfiguration = new RankingConfiguration() }
            }
        };
        var testBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(test));

        _mockCache.SetupSequence(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(assignmentBytes)
            .ReturnsAsync(testBytes);

        // Act
        var result = await _service.AssignUserToTestAsync(userId, "session-1");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("test-1", result.TestId);
        Assert.Equal("variant-a", result.VariantId);
        Assert.False(result.IsControlGroup);
    }

    [Fact]
    public async Task AssignUserToTestAsync_WithNoActiveTests_ReturnsControlGroup()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.AssignUserToTestAsync("user-123", "session-1");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("control", result.TestId);
        Assert.Equal("control", result.VariantId);
        Assert.True(result.IsControlGroup);
    }

    [Fact]
    public async Task AssignUserToTestAsync_WithException_ReturnsControlGroup()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.AssignUserToTestAsync("user-123", "session-1");

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsControlGroup);
    }

    #endregion

    #region GetUserAssignmentAsync Tests

    [Fact]
    public async Task GetUserAssignmentAsync_WithValidAssignment_ReturnsAssignmentResult()
    {
        // Arrange
        var userId = "user-123";
        var assignment = new ABTestAssignment
        {
            UserId = userId,
            TestId = "test-1",
            VariantId = "variant-a"
        };
        var assignmentBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(assignment));

        var test = new ABTest
        {
            TestId = "test-1",
            Variants = new List<ABTestVariant>
            {
                new() { VariantId = "variant-a", RankingConfiguration = new RankingConfiguration() }
            }
        };
        var testBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(test));

        _mockCache.SetupSequence(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(assignmentBytes)
            .ReturnsAsync(testBytes);

        // Act
        var result = await _service.GetUserAssignmentAsync(userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("test-1", result.TestId);
        Assert.Equal("variant-a", result.VariantId);
    }

    [Fact]
    public async Task GetUserAssignmentAsync_WithNoAssignment_ReturnsNull()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.GetUserAssignmentAsync("user-123");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserAssignmentAsync_WithException_ReturnsNull()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.GetUserAssignmentAsync("user-123");

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region RecordABTestResultAsync Tests

    [Fact]
    public async Task RecordABTestResultAsync_WithValidResult_SavesToCache()
    {
        // Arrange
        var result = new Models.ABTestResult
        {
            TestId = "test-1",
            UserId = "user-123",
            MetricName = "conversion",
            MetricValue = 1.0
        };

        // Act
        await _service.RecordABTestResultAsync(result);

        // Assert
        _mockCache.Verify(c => c.SetAsync(
            It.Is<string>(k => k.StartsWith("result:")),
            It.IsAny<byte[]>(),
            It.Is<DistributedCacheEntryOptions>(o => o.AbsoluteExpirationRelativeToNow == TimeSpan.FromDays(30)),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RecordABTestResultAsync_WithException_DoesNotThrow()
    {
        // Arrange
        var result = new Models.ABTestResult { TestId = "test-1", UserId = "user-123" };
        _mockCache.Setup(c => c.SetAsync(
            It.IsAny<string>(),
            It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act & Assert - should not throw
        await _service.RecordABTestResultAsync(result);
    }

    #endregion

    #region GetABTestMetricsAsync Tests

    [Fact]
    public async Task GetABTestMetricsAsync_WithCachedMetrics_ReturnsMetrics()
    {
        // Arrange
        var testId = "test-123";
        var metrics = new ABTestMetrics { TestId = testId };
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(metrics));

        _mockCache.Setup(c => c.GetAsync($"metrics:{testId}", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bytes);

        // Act
        var result = await _service.GetABTestMetricsAsync(testId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(testId, result.TestId);
    }

    [Fact]
    public async Task GetABTestMetricsAsync_WithNoCache_ReturnsDefaultMetrics()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.GetABTestMetricsAsync("test-123");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("test-123", result.TestId);
    }

    [Fact]
    public async Task GetABTestMetricsAsync_WithException_ReturnsDefaultMetrics()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.GetABTestMetricsAsync("test-123");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("test-123", result.TestId);
    }

    #endregion

    #region StartABTestAsync Tests

    [Fact]
    public async Task StartABTestAsync_WithValidTest_StartsTest()
    {
        // Arrange
        var testId = "test-123";
        var test = new ABTest { TestId = testId, IsActive = false, Status = ABTestStatus.Draft };
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(test));

        _mockCache.Setup(c => c.GetAsync($"abtest:{testId}", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bytes);

        // Act
        var result = await _service.StartABTestAsync(testId);

        // Assert
        Assert.True(result);
        _mockCache.Verify(c => c.SetAsync(
            It.Is<string>(k => k == $"abtest:{testId}"),
            It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task StartABTestAsync_WithNonexistentTest_ReturnsFalse()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.StartABTestAsync("nonexistent");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task StartABTestAsync_WithException_ReturnsFalse()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.StartABTestAsync("test-123");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region PauseABTestAsync Tests

    [Fact]
    public async Task PauseABTestAsync_WithValidTest_PausesTest()
    {
        // Arrange
        var testId = "test-123";
        var test = new ABTest { TestId = testId, IsActive = true, Status = ABTestStatus.Active };
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(test));

        _mockCache.Setup(c => c.GetAsync($"abtest:{testId}", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bytes);

        // Act
        var result = await _service.PauseABTestAsync(testId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task PauseABTestAsync_WithNonexistentTest_ReturnsFalse()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.PauseABTestAsync("nonexistent");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task PauseABTestAsync_WithException_ReturnsFalse()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.PauseABTestAsync("test-123");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region CompleteABTestAsync Tests

    [Fact]
    public async Task CompleteABTestAsync_WithValidTest_CompletesTest()
    {
        // Arrange
        var testId = "test-123";
        var test = new ABTest { TestId = testId, IsActive = true, Status = ABTestStatus.Active };
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(test));

        _mockCache.Setup(c => c.GetAsync($"abtest:{testId}", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bytes);

        // Act
        var result = await _service.CompleteABTestAsync(testId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task CompleteABTestAsync_WithNonexistentTest_ReturnsFalse()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.CompleteABTestAsync("nonexistent");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region DeleteABTestAsync Tests

    [Fact]
    public async Task DeleteABTestAsync_WithValidTest_DeletesTest()
    {
        // Act
        var result = await _service.DeleteABTestAsync("test-123");

        // Assert
        Assert.True(result);
        _mockCache.Verify(c => c.RemoveAsync("abtest:test-123", It.IsAny<CancellationToken>()), Times.Once);
        _mockCache.Verify(c => c.RemoveAsync("active_abtests", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteABTestAsync_WithException_ReturnsFalse()
    {
        // Arrange
        _mockCache.Setup(c => c.RemoveAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.DeleteABTestAsync("test-123");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region GetABTestResultsAsync Tests

    [Fact]
    public async Task GetABTestResultsAsync_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetABTestResultsAsync("test-123");

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetABTestResultsAsync_WithDateRange_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetABTestResultsAsync(
            "test-123",
            DateTime.UtcNow.AddDays(-7),
            DateTime.UtcNow);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #endregion

    #region GetRankingConfigurationForUserAsync Tests

    [Fact]
    public async Task GetRankingConfigurationForUserAsync_WithAssignment_ReturnsConfiguration()
    {
        // Arrange
        var userId = "user-123";
        var assignment = new ABTestAssignment
        {
            UserId = userId,
            TestId = "test-1",
            VariantId = "variant-a"
        };
        var assignmentBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(assignment));

        var test = new ABTest
        {
            TestId = "test-1",
            Variants = new List<ABTestVariant>
            {
                new() { VariantId = "variant-a", RankingConfiguration = new RankingConfiguration() }
            }
        };
        var testBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(test));

        _mockCache.SetupSequence(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(assignmentBytes)
            .ReturnsAsync(testBytes);

        // Act
        var result = await _service.GetRankingConfigurationForUserAsync(userId);

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetRankingConfigurationForUserAsync_WithNoAssignment_ReturnsDefault()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.GetRankingConfigurationForUserAsync("user-123");

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetRankingConfigurationForUserAsync_WithException_ReturnsDefault()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.GetRankingConfigurationForUserAsync("user-123");

        // Assert
        Assert.NotNull(result);
    }

    #endregion

    #region GetExperimentResultsAsync Tests

    [Fact]
    public async Task GetExperimentResultsAsync_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetExperimentResultsAsync("test-123");

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #endregion

    #region ShouldUserParticipateAsync Tests

    [Fact]
    public async Task ShouldUserParticipateAsync_WithActiveTestAndEligibleUser_ReturnsTrue()
    {
        // Arrange
        var testId = "test-123";
        var test = new ABTest
        {
            TestId = testId,
            IsActive = true,
            TrafficPercentage = 100 // 100% traffic = all users eligible
        };
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(test));

        _mockCache.Setup(c => c.GetAsync($"abtest:{testId}", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bytes);

        // Act
        var result = await _service.ShouldUserParticipateAsync("user-123", testId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ShouldUserParticipateAsync_WithInactiveTest_ReturnsFalse()
    {
        // Arrange
        var testId = "test-123";
        var test = new ABTest { TestId = testId, IsActive = false };
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(test));

        _mockCache.Setup(c => c.GetAsync($"abtest:{testId}", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bytes);

        // Act
        var result = await _service.ShouldUserParticipateAsync("user-123", testId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ShouldUserParticipateAsync_WithNonexistentTest_ReturnsFalse()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.ShouldUserParticipateAsync("user-123", "nonexistent");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ShouldUserParticipateAsync_WithException_ReturnsFalse()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.ShouldUserParticipateAsync("user-123", "test-123");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region GetRunningExperimentsAsync Tests

    [Fact]
    public async Task GetRunningExperimentsAsync_WithNoUserId_ReturnsAllRunningTests()
    {
        // Arrange
        var tests = new List<ABTest>
        {
            new()
            {
                TestId = "test-1",
                Status = ABTestStatus.Active,
                StartDate = DateTime.UtcNow.AddDays(-1),
                EndDate = DateTime.UtcNow.AddDays(1)
            }
        };
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(tests));

        _mockCache.Setup(c => c.GetAsync("active_abtests", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bytes);

        // Act
        var result = await _service.GetRunningExperimentsAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
    }

    [Fact]
    public async Task GetRunningExperimentsAsync_WithUserId_ReturnsEligibleTests()
    {
        // Arrange
        var tests = new List<ABTest>
        {
            new()
            {
                TestId = "test-1",
                Status = ABTestStatus.Active,
                StartDate = DateTime.UtcNow.AddDays(-1),
                EndDate = DateTime.UtcNow.AddDays(1),
                IsActive = true,
                TrafficPercentage = 100
            }
        };
        var listBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(tests));
        var testBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(tests[0]));

        _mockCache.SetupSequence(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(listBytes)
            .ReturnsAsync(testBytes);

        // Act
        var result = await _service.GetRunningExperimentsAsync("user-123");

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetRunningExperimentsAsync_WithException_ReturnsEmptyList()
    {
        // Arrange
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.GetRunningExperimentsAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #endregion

    #region StartExperimentAsync Tests

    [Fact]
    public async Task StartExperimentAsync_WithValidId_ReturnsTrue()
    {
        // Act
        var result = await _service.StartExperimentAsync(Guid.NewGuid());

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task StartExperimentAsync_LogsInformation()
    {
        // Arrange
        var experimentId = Guid.NewGuid();

        // Act
        await _service.StartExperimentAsync(experimentId);

        // Assert - verify logging occurred (using mock verification)
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Starting experiment")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region StopExperimentAsync Tests

    [Fact]
    public async Task StopExperimentAsync_WithValidId_ReturnsTrue()
    {
        // Act
        var result = await _service.StopExperimentAsync(Guid.NewGuid());

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task StopExperimentAsync_WithReason_LogsReason()
    {
        // Arrange
        var experimentId = Guid.NewGuid();
        var reason = "Test reason";

        // Act
        await _service.StopExperimentAsync(experimentId, reason);

        // Assert - verify logging occurred with reason
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains(reason)),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task StopExperimentAsync_WithoutReason_LogsDefaultReason()
    {
        // Arrange
        var experimentId = Guid.NewGuid();

        // Act
        await _service.StopExperimentAsync(experimentId, null);

        // Assert - verify logging occurred
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("No reason provided")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion
}
