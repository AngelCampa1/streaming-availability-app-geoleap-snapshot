using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Phase 4.6 - Direct tests for SocialSharingService
/// Testing social sharing, link generation, tracking, and analytics
/// Pattern: Tier 2 DirectTests with boundary-only mocking
/// </summary>
public class SocialSharingServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILoggerService> _mockLogger;
    private readonly Mock<IShareLinkService> _mockShareLinkService;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly SocialSharingService _service;
    private readonly Guid _userId;
    private readonly Guid _userId2;

    public SocialSharingServiceDirectTests()
    {
        // In-memory database setup
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"SocialSharingServiceTests_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);

        // Mock external services only (boundary-only mocking)
        _mockLogger = new Mock<ILoggerService>();
        _mockShareLinkService = new Mock<IShareLinkService>();
        _mockConfiguration = new Mock<IConfiguration>();

        // Configure mock configuration
        _mockConfiguration.Setup(c => c["BaseUrl"]).Returns("https://geoleap.com");
        _mockConfiguration.Setup(c => c["App:BaseUrl"]).Returns("https://geoleap.com");

        // Configure mock share link service
        _mockShareLinkService
            .Setup(s => s.CreateTrackableLinkAsync(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string url, Dictionary<string, string> utm, Guid id, CancellationToken ct) =>
                $"{url}?utm_source=test&share_id={id}");

        _mockShareLinkService
            .Setup(s => s.ShortenUrlAsync(It.IsAny<string>(), It.IsAny<Guid>()))
            .ReturnsAsync((string url, Guid userId) => $"https://short.link/{Guid.NewGuid().ToString().Substring(0, 8)}");

        _service = new SocialSharingService(
            _context,
            _mockLogger.Object,
            _mockShareLinkService.Object,
            _mockConfiguration.Object
        );

        // Initialize test user IDs
        _userId = Guid.NewGuid();
        _userId2 = Guid.NewGuid();

        // Seed test data
        SeedTestData();
    }

    private void SeedTestData()
    {
        // Add test users
        var users = new[]
        {
            new User
            {
                Id = _userId,
                UserName = "testuser",
                Email = "test@example.com",
                CreatedAt = DateTime.UtcNow.AddMonths(-3)
            },
            new User
            {
                Id = _userId2,
                UserName = "friend",
                Email = "friend@example.com",
                CreatedAt = DateTime.UtcNow.AddMonths(-2)
            }
        };
        _context.Users.AddRange(users);

        // Add existing sharing preferences for userId2
        var existingPrefs = new SocialSharingPreferences
        {
            UserId = _userId2,
            AllowSocialSharing = true,
            ShareWithPersonalInfo = true,
            AllowShareAnalytics = true,
            AutoGenerateHashtags = false
        };
        _context.SocialSharingPreferences.Add(existingPrefs);

        // Add some share events for analytics
        var shareEvents = new[]
        {
            new SocialShareEvent
            {
                Id = Guid.NewGuid(),
                UserId = _userId,
                ContentId = "movie-123",
                ContentType = "movie",
                ContentTitle = "Test Movie",
                Platform = "facebook",
                ShareMethod = "native_share",
                Status = "completed",
                IsSuccessful = true,
                ClickCount = 5,
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new SocialShareEvent
            {
                Id = Guid.NewGuid(),
                UserId = _userId,
                ContentId = "movie-123",
                ContentType = "movie",
                ContentTitle = "Test Movie",
                Platform = "twitter",
                ShareMethod = "modal",
                Status = "completed",
                IsSuccessful = true,
                ClickCount = 3,
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new SocialShareEvent
            {
                Id = Guid.NewGuid(),
                UserId = _userId2,
                ContentId = "show-456",
                ContentType = "tv",
                ContentTitle = "Test Show",
                Platform = "facebook",
                ShareMethod = "direct_api",
                Status = "completed",
                IsSuccessful = true,
                ClickCount = 10,
                CreatedAt = DateTime.UtcNow.AddHours(-6)
            }
        };
        _context.SocialShareEvents.AddRange(shareEvents);

        _context.SaveChanges();
    }

    [Fact]
    public async Task GenerateShareLinkAsync_CreatesShareEventAndReturnsLink()
    {
        // Arrange
        var request = new ShareContentRequest
        {
            ContentId = "test-123",
            ContentType = "movie",
            Platform = "facebook",
            CustomMessage = "Check out this movie!",
            IncludePersonalInfo = false,
            TrackAnalytics = true
        };
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var result = await _service.GenerateShareLinkAsync(request, _userId, correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.ShareUrl);
        Assert.Contains("geoleap.com", result.ShareUrl);
        Assert.NotNull(result.ShareMessage);
        Assert.NotEqual(Guid.Empty, result.ShareEventId);

        // Verify share event was created
        var shareEvent = await _context.SocialShareEvents
            .FirstOrDefaultAsync(se => se.Id == result.ShareEventId);
        Assert.NotNull(shareEvent);
        Assert.Equal(_userId, shareEvent.UserId);
        Assert.Equal("test-123", shareEvent.ContentId);
    }

    [Fact]
    public async Task GenerateShareLinkAsync_CreatesTrackableLink_AndShareEvent()
    {
        // Arrange
        var request = new ShareContentRequest
        {
            ContentId = "test-456",
            ContentType = "tv",
            Platform = "facebook" // Using facebook for simpler URL structure
        };

        // Act
        var result = await _service.GenerateShareLinkAsync(request, _userId, "corr-123");

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.ShareUrl);
        Assert.Contains("test-456", result.ShareUrl);
        Assert.NotEqual(Guid.Empty, result.ShareEventId);

        // Verify ShareLinkService was called to create trackable link
        _mockShareLinkService.Verify(
            s => s.CreateTrackableLinkAsync(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Once
        );

        // Verify share event was created with ShareMethod
        var shareEvent = await _context.SocialShareEvents.FindAsync(result.ShareEventId);
        Assert.NotNull(shareEvent);
        Assert.Equal("modal", shareEvent.ShareMethod);
    }

    [Fact]
    public async Task GenerateShareLinkAsync_FallsBackToBaseUrl_WhenShareLinkServiceFails()
    {
        // Arrange
        _mockShareLinkService
            .Setup(s => s.CreateTrackableLinkAsync(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Service unavailable"));

        var request = new ShareContentRequest
        {
            ContentId = "test-789",
            ContentType = "movie",
            Platform = "facebook"
        };

        // Act
        var result = await _service.GenerateShareLinkAsync(request, _userId, "corr-456");

        // Assert
        Assert.NotNull(result);
        Assert.Contains("geoleap.com", result.ShareUrl);
        Assert.Contains("test-789", result.ShareUrl);
        // Should still create share event even with fallback
        Assert.NotEqual(Guid.Empty, result.ShareEventId);
    }

    [Fact]
    public async Task UpdateShareEventStatusAsync_UpdatesStatusToCompleted()
    {
        // Arrange
        var shareEvent = new SocialShareEvent
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            ContentId = "test-update",
            ContentType = "movie",
            Platform = "facebook",
            ShareMethod = "native_share",
            Status = "initiated"
        };
        _context.SocialShareEvents.Add(shareEvent);
        await _context.SaveChangesAsync();

        // Act
        await _service.UpdateShareEventStatusAsync(shareEvent.Id, ShareStatus.Completed);

        // Assert
        var updated = await _context.SocialShareEvents.FindAsync(shareEvent.Id);
        Assert.NotNull(updated);
        Assert.Equal("completed", updated.Status);
        Assert.NotNull(updated.CompletedAt);
    }

    [Fact]
    public async Task UpdateShareEventStatusAsync_UpdatesStatusToFailed_WithErrorMessage()
    {
        // Arrange
        var shareEvent = new SocialShareEvent
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            ContentId = "test-fail",
            ContentType = "movie",
            Platform = "facebook",
            ShareMethod = "modal",
            Status = "initiated"
        };
        _context.SocialShareEvents.Add(shareEvent);
        await _context.SaveChangesAsync();

        // Act
        await _service.UpdateShareEventStatusAsync(shareEvent.Id, ShareStatus.Failed, "Network error");

        // Assert
        var updated = await _context.SocialShareEvents.FindAsync(shareEvent.Id);
        Assert.NotNull(updated);
        Assert.Equal("failed", updated.Status);
        Assert.Equal("Network error", updated.ErrorMessage);
        Assert.NotNull(updated.FailedAt);
    }

    [Fact]
    public async Task TrackShareLinkClickAsync_CreatesClickRecord()
    {
        // Arrange
        var shareEvent = new SocialShareEvent
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            ContentId = "click-test",
            ContentType = "movie",
            Platform = "facebook",
            ShareMethod = "native_share"
        };
        _context.SocialShareEvents.Add(shareEvent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.TrackShareLinkClickAsync(
            shareEvent.Id,
            "192.168.1.1",
            "Mozilla/5.0",
            "https://twitter.com"
        );

        // Assert
        Assert.NotNull(result);
        Assert.Equal(shareEvent.Id, result.ShareEventId);
        Assert.Equal("192.168.1.1", result.IpAddress);
        Assert.Equal("Mozilla/5.0", result.UserAgent);
        Assert.Equal("https://twitter.com", result.RefererUrl);

        // Verify click was saved
        var clicks = await _context.ShareLinkClicks
            .Where(c => c.ShareEventId == shareEvent.Id)
            .ToListAsync();
        Assert.Single(clicks);
    }

    [Fact]
    public async Task UpdateConversionTrackingAsync_TracksConversion()
    {
        // Arrange
        var shareEvent = new SocialShareEvent
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            ContentId = "convert-test",
            ContentType = "movie",
            Platform = "facebook",
            ShareMethod = "direct_api"
        };
        _context.SocialShareEvents.Add(shareEvent);

        var click = new ShareLinkClick
        {
            ShareEventId = shareEvent.Id,
            IpAddress = "192.168.1.1",
            UserAgent = "Mozilla/5.0",
            ClickedAt = DateTime.UtcNow,
            ConvertedToRegistration = false
        };
        _context.ShareLinkClicks.Add(click);
        await _context.SaveChangesAsync();

        var newUserId = Guid.NewGuid();

        // Act
        await _service.UpdateConversionTrackingAsync(shareEvent.Id, newUserId);

        // Assert
        var updated = await _context.ShareLinkClicks.FindAsync(click.Id);
        Assert.NotNull(updated);
        Assert.True(updated.ConvertedToRegistration);
        Assert.Equal(newUserId, updated.ConvertedUserId);
        Assert.NotNull(updated.ConversionDate);
    }

    [Fact]
    public async Task GetUserSharingPreferencesAsync_CreatesDefaultPreferences_WhenNotExist()
    {
        // Arrange
        var newUserId = Guid.NewGuid();

        // Act
        var result = await _service.GetUserSharingPreferencesAsync(newUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(newUserId, result.UserId);
        Assert.True(result.AllowSocialSharing);
        Assert.False(result.ShareWithPersonalInfo);
        Assert.True(result.AllowShareAnalytics);
        Assert.True(result.AutoGenerateHashtags);

        // Verify preferences were saved
        var saved = await _context.SocialSharingPreferences
            .FirstOrDefaultAsync(p => p.UserId == newUserId);
        Assert.NotNull(saved);
    }

    [Fact]
    public async Task GetUserSharingPreferencesAsync_ReturnsExistingPreferences()
    {
        // Act
        var result = await _service.GetUserSharingPreferencesAsync(_userId2);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_userId2, result.UserId);
        Assert.True(result.ShareWithPersonalInfo); // From seeded data
        Assert.False(result.AutoGenerateHashtags); // From seeded data
    }

    [Fact]
    public async Task UpdateUserSharingPreferencesAsync_CreatesNew_WhenNotExist()
    {
        // Arrange
        var newUserId = Guid.NewGuid();
        var prefs = new SocialSharingPreferences
        {
            AllowSocialSharing = false,
            ShareWithPersonalInfo = true,
            AllowShareAnalytics = false,
            AutoGenerateHashtags = true
        };

        // Act
        var result = await _service.UpdateUserSharingPreferencesAsync(newUserId, prefs);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(newUserId, result.UserId);
        Assert.False(result.AllowSocialSharing);
        Assert.True(result.ShareWithPersonalInfo);
    }

    [Fact]
    public async Task UpdateUserSharingPreferencesAsync_UpdatesExisting()
    {
        // Arrange
        var prefs = new SocialSharingPreferences
        {
            AllowSocialSharing = false,
            ShareWithPersonalInfo = false,
            AllowShareAnalytics = false,
            AutoGenerateHashtags = true
        };

        // Act
        var result = await _service.UpdateUserSharingPreferencesAsync(_userId2, prefs);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_userId2, result.UserId);
        Assert.False(result.AllowSocialSharing);
        Assert.False(result.ShareWithPersonalInfo);
        Assert.True(result.AutoGenerateHashtags);
    }

    [Fact]
    public async Task GetContentSharingMetricsAsync_CalculatesMetricsCorrectly()
    {
        // Arrange
        var shareEventId = Guid.NewGuid();
        var shareEvent = new SocialShareEvent
        {
            Id = shareEventId,
            UserId = _userId,
            ContentId = "metrics-test",
            ContentType = "movie",
            ContentTitle = "Metrics Movie",
            Platform = "facebook",
            ShareMethod = "native_share",
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };
        _context.SocialShareEvents.Add(shareEvent);

        var clicks = new[]
        {
            new ShareLinkClick
            {
                ShareEventId = shareEventId,
                IpAddress = "192.168.1.1",
                ConvertedToRegistration = true,
                ConvertedUserId = Guid.NewGuid(),
                ClickedAt = DateTime.UtcNow
            },
            new ShareLinkClick
            {
                ShareEventId = shareEventId,
                IpAddress = "192.168.1.2",
                ConvertedToRegistration = false,
                ClickedAt = DateTime.UtcNow
            }
        };
        _context.ShareLinkClicks.AddRange(clicks);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetContentSharingMetricsAsync("metrics-test");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("metrics-test", result.ContentId);
        Assert.Equal("Metrics Movie", result.ContentTitle);
        Assert.Equal(1, result.TotalShares);
        Assert.Equal(2, result.TotalClicks);
        Assert.Equal(0.5, result.ConversionRate); // 1 conversion out of 2 clicks
    }

    [Fact]
    public async Task GetSharingAnalyticsAsync_FiltersCorrectly()
    {
        // Arrange
        var request = new ShareAnalyticsRequest
        {
            Platform = "facebook",
            StartDate = DateTime.UtcNow.AddDays(-3),
            EndDate = DateTime.UtcNow,
            Limit = 50
        };

        // Act
        var result = await _service.GetSharingAnalyticsAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.All(result, se => Assert.Equal("facebook", se.Platform));
        Assert.All(result, se => Assert.True(se.CreatedAt >= request.StartDate));
        Assert.All(result, se => Assert.True(se.CreatedAt <= request.EndDate));
    }

    [Fact]
    public async Task GetAvailablePlatformsAsync_ReturnsEnabledPlatforms()
    {
        // Act
        var result = await _service.GetAvailablePlatformsAsync();

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Count > 0);
        Assert.All(result, p => Assert.True(p.IsEnabled));
        Assert.Contains(result, p => p.PlatformName == "facebook");
        Assert.Contains(result, p => p.PlatformName == "twitter");
    }

    [Fact]
    public async Task GenerateShareMessageAsync_UsesCustomMessage_WhenProvided()
    {
        // Arrange
        var customMessage = "This is my custom share message!";

        // Act
        var result = await _service.GenerateShareMessageAsync("facebook", "Test Movie", customMessage, _userId);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("This is my custom share message", result);
    }

    [Fact]
    public async Task GenerateHashtagsAsync_GeneratesRelevantHashtags()
    {
        // Act
        var result = await _service.GenerateHashtagsAsync("Amazing Action Movie", "movie", "Action, Thriller");

        // Assert
        Assert.NotNull(result);
        Assert.Contains("GeoLeap", result); // Always includes brand
        Assert.Contains("movie", result);
        Assert.Contains("Action", result);
        Assert.True(result.Count <= 5); // Limited to 5
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}
