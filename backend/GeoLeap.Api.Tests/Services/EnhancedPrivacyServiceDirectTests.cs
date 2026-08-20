using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for EnhancedPrivacyService covering all 6 public methods
/// Service: EnhancedPrivacyService.cs (151 LOC)
/// Focus: GDPR compliance, social privacy consent management (2.0x business value multiplier)
/// </summary>
public class EnhancedPrivacyServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILoggerService> _mockLogger;
    private readonly EnhancedPrivacyService _service;
    private readonly Guid _testUserId;

    public EnhancedPrivacyServiceDirectTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"EnhancedPrivacyTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILoggerService>();

        _service = new EnhancedPrivacyService(_context, _mockLogger.Object);
        _testUserId = Guid.NewGuid();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
        GC.SuppressFinalize(this);
    }

    #region HasSocialDataConsentAsync Tests

    [Fact]
    public async Task HasSocialDataConsentAsync_WithConsent_ReturnsTrue()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowSocialDataCollection = true,
            ConsentGivenAt = DateTime.UtcNow,
            ConsentRevokedAt = null
        };
        _context.SocialPrivacyConsents.Add(consent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasSocialDataConsentAsync(_testUserId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HasSocialDataConsentAsync_WithoutConsent_ReturnsFalse()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowSocialDataCollection = false,
            ConsentGivenAt = DateTime.UtcNow
        };
        _context.SocialPrivacyConsents.Add(consent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasSocialDataConsentAsync(_testUserId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HasSocialDataConsentAsync_WithRevokedConsent_ReturnsFalse()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowSocialDataCollection = true,
            ConsentGivenAt = DateTime.UtcNow,
            ConsentRevokedAt = DateTime.UtcNow
        };
        _context.SocialPrivacyConsents.Add(consent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasSocialDataConsentAsync(_testUserId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HasSocialDataConsentAsync_WithNoConsent_ReturnsFalse()
    {
        // Act
        var result = await _service.HasSocialDataConsentAsync(_testUserId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region HasSocialRecommendationConsentAsync Tests

    [Fact]
    public async Task HasSocialRecommendationConsentAsync_WithConsent_ReturnsTrue()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowSocialRecommendations = true,
            ConsentGivenAt = DateTime.UtcNow,
            ConsentRevokedAt = null
        };
        _context.SocialPrivacyConsents.Add(consent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasSocialRecommendationConsentAsync(_testUserId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HasSocialRecommendationConsentAsync_WithRevokedConsent_ReturnsFalse()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowSocialRecommendations = true,
            ConsentGivenAt = DateTime.UtcNow,
            ConsentRevokedAt = DateTime.UtcNow
        };
        _context.SocialPrivacyConsents.Add(consent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasSocialRecommendationConsentAsync(_testUserId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HasSocialRecommendationConsentAsync_WithNoConsent_ReturnsFalse()
    {
        // Act
        var result = await _service.HasSocialRecommendationConsentAsync(_testUserId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region HasFriendDiscoveryConsentAsync Tests

    [Fact]
    public async Task HasFriendDiscoveryConsentAsync_WithConsent_ReturnsTrue()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowFriendDiscovery = true,
            ConsentGivenAt = DateTime.UtcNow,
            ConsentRevokedAt = null
        };
        _context.SocialPrivacyConsents.Add(consent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasFriendDiscoveryConsentAsync(_testUserId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HasFriendDiscoveryConsentAsync_WithRevokedConsent_ReturnsFalse()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowFriendDiscovery = true,
            ConsentGivenAt = DateTime.UtcNow,
            ConsentRevokedAt = DateTime.UtcNow
        };
        _context.SocialPrivacyConsents.Add(consent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasFriendDiscoveryConsentAsync(_testUserId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HasFriendDiscoveryConsentAsync_WithNoConsent_ReturnsFalse()
    {
        // Act
        var result = await _service.HasFriendDiscoveryConsentAsync(_testUserId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region HasActivityTrackingConsentAsync Tests

    [Fact]
    public async Task HasActivityTrackingConsentAsync_WithConsent_ReturnsTrue()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowActivityTracking = true,
            ConsentGivenAt = DateTime.UtcNow,
            ConsentRevokedAt = null
        };
        _context.SocialPrivacyConsents.Add(consent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasActivityTrackingConsentAsync(_testUserId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HasActivityTrackingConsentAsync_WithRevokedConsent_ReturnsFalse()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowActivityTracking = true,
            ConsentGivenAt = DateTime.UtcNow,
            ConsentRevokedAt = DateTime.UtcNow
        };
        _context.SocialPrivacyConsents.Add(consent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasActivityTrackingConsentAsync(_testUserId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HasActivityTrackingConsentAsync_WithNoConsent_ReturnsFalse()
    {
        // Act
        var result = await _service.HasActivityTrackingConsentAsync(_testUserId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region UpdateSocialPrivacyConsentAsync Tests

    [Fact]
    public async Task UpdateSocialPrivacyConsentAsync_WithNewConsent_CreatesConsent()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            AllowSocialDataCollection = true,
            AllowFriendDiscovery = true,
            AllowSocialRecommendations = true,
            AllowActivityTracking = false
        };

        // Act
        var result = await _service.UpdateSocialPrivacyConsentAsync(_testUserId, consent);

        // Assert
        Assert.True(result.IsSuccess);
        var savedConsent = await _context.SocialPrivacyConsents.FirstOrDefaultAsync(c => c.UserId == _testUserId);
        Assert.NotNull(savedConsent);
        Assert.Equal(_testUserId, savedConsent.UserId);
        Assert.True(savedConsent.AllowSocialDataCollection);
        Assert.True(savedConsent.AllowFriendDiscovery);
        Assert.True(savedConsent.AllowSocialRecommendations);
        Assert.False(savedConsent.AllowActivityTracking);
        Assert.True(savedConsent.IsGdprCompliant);
        Assert.Equal("2.0", savedConsent.ConsentVersion);
        Assert.Equal("consent", savedConsent.GdprLawfulBasis);
    }

    [Fact]
    public async Task UpdateSocialPrivacyConsentAsync_WithExistingConsent_UpdatesConsent()
    {
        // Arrange
        var existingConsent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowSocialDataCollection = false,
            AllowFriendDiscovery = false,
            AllowSocialRecommendations = false,
            AllowActivityTracking = false,
            ConsentGivenAt = DateTime.UtcNow.AddDays(-10)
        };
        _context.SocialPrivacyConsents.Add(existingConsent);
        await _context.SaveChangesAsync();

        var updatedConsent = new SocialPrivacyConsent
        {
            AllowSocialDataCollection = true,
            AllowFriendDiscovery = true,
            AllowSocialRecommendations = false,
            AllowActivityTracking = true
        };

        // Act
        var result = await _service.UpdateSocialPrivacyConsentAsync(_testUserId, updatedConsent);

        // Assert
        Assert.True(result.IsSuccess);
        var savedConsent = await _context.SocialPrivacyConsents.FirstOrDefaultAsync(c => c.UserId == _testUserId);
        Assert.NotNull(savedConsent);
        Assert.True(savedConsent.AllowSocialDataCollection);
        Assert.True(savedConsent.AllowFriendDiscovery);
        Assert.False(savedConsent.AllowSocialRecommendations);
        Assert.True(savedConsent.AllowActivityTracking);
        Assert.Null(savedConsent.ConsentRevokedAt);
    }

    [Fact]
    public async Task UpdateSocialPrivacyConsentAsync_WithAllFalse_RevokesConsent()
    {
        // Arrange
        var existingConsent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowSocialDataCollection = true,
            AllowFriendDiscovery = true,
            AllowSocialRecommendations = true,
            AllowActivityTracking = true,
            ConsentGivenAt = DateTime.UtcNow.AddDays(-10)
        };
        _context.SocialPrivacyConsents.Add(existingConsent);
        await _context.SaveChangesAsync();

        var revokedConsent = new SocialPrivacyConsent
        {
            AllowSocialDataCollection = false,
            AllowFriendDiscovery = false,
            AllowSocialRecommendations = false,
            AllowActivityTracking = false
        };

        // Act
        var result = await _service.UpdateSocialPrivacyConsentAsync(_testUserId, revokedConsent);

        // Assert
        Assert.True(result.IsSuccess);
        var savedConsent = await _context.SocialPrivacyConsents.FirstOrDefaultAsync(c => c.UserId == _testUserId);
        Assert.NotNull(savedConsent);
        Assert.False(savedConsent.AllowSocialDataCollection);
        Assert.False(savedConsent.AllowFriendDiscovery);
        Assert.False(savedConsent.AllowSocialRecommendations);
        Assert.False(savedConsent.AllowActivityTracking);
        Assert.NotNull(savedConsent.ConsentRevokedAt);
    }

    [Fact]
    public async Task UpdateSocialPrivacyConsentAsync_AfterRevocation_ReactivatesConsent()
    {
        // Arrange
        var existingConsent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowSocialDataCollection = false,
            AllowFriendDiscovery = false,
            AllowSocialRecommendations = false,
            AllowActivityTracking = false,
            ConsentGivenAt = DateTime.UtcNow.AddDays(-10),
            ConsentRevokedAt = DateTime.UtcNow.AddDays(-5)
        };
        _context.SocialPrivacyConsents.Add(existingConsent);
        await _context.SaveChangesAsync();

        var reactivatedConsent = new SocialPrivacyConsent
        {
            AllowSocialDataCollection = true,
            AllowFriendDiscovery = false,
            AllowSocialRecommendations = false,
            AllowActivityTracking = false
        };

        // Act
        var result = await _service.UpdateSocialPrivacyConsentAsync(_testUserId, reactivatedConsent);

        // Assert
        Assert.True(result.IsSuccess);
        var savedConsent = await _context.SocialPrivacyConsents.FirstOrDefaultAsync(c => c.UserId == _testUserId);
        Assert.NotNull(savedConsent);
        Assert.True(savedConsent.AllowSocialDataCollection);
        Assert.Null(savedConsent.ConsentRevokedAt);
        Assert.NotNull(savedConsent.ConsentGivenAt);
    }

    [Fact]
    public async Task UpdateSocialPrivacyConsentAsync_UpdatesTimestamps()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            AllowSocialDataCollection = true,
            AllowFriendDiscovery = true,
            AllowSocialRecommendations = false,
            AllowActivityTracking = false
        };

        var beforeUpdate = DateTime.UtcNow;

        // Act
        await Task.Delay(10); // Small delay to ensure timestamp difference
        var result = await _service.UpdateSocialPrivacyConsentAsync(_testUserId, consent);

        // Assert
        Assert.True(result.IsSuccess);
        var savedConsent = await _context.SocialPrivacyConsents.FirstOrDefaultAsync(c => c.UserId == _testUserId);
        Assert.NotNull(savedConsent);
        Assert.True(savedConsent.UpdatedAt >= beforeUpdate);
        Assert.True(savedConsent.ConsentGivenAt >= beforeUpdate);
    }

    #endregion

    #region GetSocialPrivacyConsentAsync Tests

    [Fact]
    public async Task GetSocialPrivacyConsentAsync_WithExistingConsent_ReturnsConsent()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowSocialDataCollection = true,
            AllowFriendDiscovery = false,
            AllowSocialRecommendations = true,
            AllowActivityTracking = false,
            ConsentGivenAt = DateTime.UtcNow
        };
        _context.SocialPrivacyConsents.Add(consent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetSocialPrivacyConsentAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.True(result.AllowSocialDataCollection);
        Assert.False(result.AllowFriendDiscovery);
        Assert.True(result.AllowSocialRecommendations);
        Assert.False(result.AllowActivityTracking);
    }

    [Fact]
    public async Task GetSocialPrivacyConsentAsync_WithNoConsent_ReturnsNull()
    {
        // Act
        var result = await _service.GetSocialPrivacyConsentAsync(_testUserId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetSocialPrivacyConsentAsync_WithRevokedConsent_StillReturnsConsent()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowSocialDataCollection = false,
            AllowFriendDiscovery = false,
            AllowSocialRecommendations = false,
            AllowActivityTracking = false,
            ConsentGivenAt = DateTime.UtcNow.AddDays(-10),
            ConsentRevokedAt = DateTime.UtcNow
        };
        _context.SocialPrivacyConsents.Add(consent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetSocialPrivacyConsentAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.NotNull(result.ConsentRevokedAt);
    }

    [Fact]
    public async Task GetSocialPrivacyConsentAsync_WithMultipleUsers_ReturnsCorrectUser()
    {
        // Arrange
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();

        var consent1 = new SocialPrivacyConsent
        {
            UserId = userId1,
            AllowSocialDataCollection = true,
            ConsentGivenAt = DateTime.UtcNow
        };

        var consent2 = new SocialPrivacyConsent
        {
            UserId = userId2,
            AllowSocialDataCollection = false,
            ConsentGivenAt = DateTime.UtcNow
        };

        _context.SocialPrivacyConsents.AddRange(consent1, consent2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetSocialPrivacyConsentAsync(userId1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userId1, result.UserId);
        Assert.True(result.AllowSocialDataCollection);
    }

    #endregion
}
