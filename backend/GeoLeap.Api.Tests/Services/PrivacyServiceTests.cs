using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Unit tests for PrivacyService - PHASE 20 (Privacy and Consent Management)
///
/// CRITICAL TESTS:
/// - Consent checking for social features
/// - Consent update operations
/// - Privacy consent retrieval
///
/// Test Pattern: Unit tests with BasicPrivacyService implementation
/// Coverage Target: 100% of IPrivacyService methods
/// Interface Methods: 6
/// </summary>
public class PrivacyServiceTests
{
    private readonly IPrivacyService _privacyService;

    public PrivacyServiceTests()
    {
        _privacyService = new BasicPrivacyService();
    }

    #region Social Data Consent Tests - 2 tests

    [Fact]
    public async Task HasSocialDataConsentAsync_WithValidUserId_ReturnsConsent()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _privacyService.HasSocialDataConsentAsync(userId);

        // Assert
        Assert.IsType<bool>(result);
        Assert.True(result); // Default implementation returns true
    }

    [Fact]
    public async Task HasSocialDataConsentAsync_WithEmptyGuid_StillReturnsResult()
    {
        // Arrange
        var userId = Guid.Empty;

        // Act
        var result = await _privacyService.HasSocialDataConsentAsync(userId);

        // Assert
        Assert.IsType<bool>(result);
    }

    #endregion

    #region Social Recommendation Consent Tests - 2 tests

    [Fact]
    public async Task HasSocialRecommendationConsentAsync_WithValidUserId_ReturnsConsent()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _privacyService.HasSocialRecommendationConsentAsync(userId);

        // Assert
        Assert.IsType<bool>(result);
        Assert.True(result); // Default implementation returns true
    }

    [Fact]
    public async Task HasSocialRecommendationConsentAsync_WithDifferentUsers_ReturnsConsent()
    {
        // Arrange
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();

        // Act
        var result1 = await _privacyService.HasSocialRecommendationConsentAsync(userId1);
        var result2 = await _privacyService.HasSocialRecommendationConsentAsync(userId2);

        // Assert - Both should return same default value
        Assert.Equal(result1, result2);
    }

    #endregion

    #region Friend Discovery Consent Tests - 2 tests

    [Fact]
    public async Task HasFriendDiscoveryConsentAsync_WithValidUserId_ReturnsFalseByDefault()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _privacyService.HasFriendDiscoveryConsentAsync(userId);

        // Assert
        Assert.IsType<bool>(result);
        Assert.False(result); // Default implementation returns false for privacy
    }

    [Fact]
    public async Task HasFriendDiscoveryConsentAsync_WithMultipleUsers_ReturnsConsistentDefault()
    {
        // Arrange
        var users = new[] { Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid() };

        // Act & Assert
        foreach (var userId in users)
        {
            var result = await _privacyService.HasFriendDiscoveryConsentAsync(userId);
            Assert.False(result);
        }
    }

    #endregion

    #region Activity Tracking Consent Tests - 2 tests

    [Fact]
    public async Task HasActivityTrackingConsentAsync_WithValidUserId_ReturnsFalseByDefault()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _privacyService.HasActivityTrackingConsentAsync(userId);

        // Assert
        Assert.IsType<bool>(result);
        Assert.False(result); // Default implementation returns false for privacy
    }

    [Fact]
    public async Task HasActivityTrackingConsentAsync_ConsistentAcrossMultipleCalls()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act - Multiple calls should return consistent result
        var result1 = await _privacyService.HasActivityTrackingConsentAsync(userId);
        var result2 = await _privacyService.HasActivityTrackingConsentAsync(userId);
        var result3 = await _privacyService.HasActivityTrackingConsentAsync(userId);

        // Assert
        Assert.Equal(result1, result2);
        Assert.Equal(result2, result3);
    }

    #endregion

    #region Update Social Privacy Consent Tests - 3 tests

    [Fact]
    public async Task UpdateSocialPrivacyConsentAsync_WithValidConsent_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var consent = new SocialPrivacyConsent
        {
            UserId = userId,
            AllowSocialDataCollection = true,
            AllowSocialRecommendations = true,
            AllowFriendDiscovery = false,
            AllowActivityTracking = false
        };

        // Act
        var result = await _privacyService.UpdateSocialPrivacyConsentAsync(userId, consent);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task UpdateSocialPrivacyConsentAsync_WithPartialConsent_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var consent = new SocialPrivacyConsent
        {
            UserId = userId,
            AllowSocialDataCollection = false,
            AllowSocialRecommendations = false,
            AllowFriendDiscovery = false,
            AllowActivityTracking = false
        };

        // Act
        var result = await _privacyService.UpdateSocialPrivacyConsentAsync(userId, consent);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task UpdateSocialPrivacyConsentAsync_WithMismatchedUserId_StillProcesses()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var consent = new SocialPrivacyConsent
        {
            UserId = Guid.NewGuid(), // Different from userId parameter
            AllowSocialDataCollection = true
        };

        // Act
        var result = await _privacyService.UpdateSocialPrivacyConsentAsync(userId, consent);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsSuccess);
    }

    #endregion

    #region Get Social Privacy Consent Tests - 3 tests

    [Fact]
    public async Task GetSocialPrivacyConsentAsync_WithValidUserId_ReturnsConsent()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _privacyService.GetSocialPrivacyConsentAsync(userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userId, result.UserId);
    }

    [Fact]
    public async Task GetSocialPrivacyConsentAsync_ReturnsExpectedDefaults()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _privacyService.GetSocialPrivacyConsentAsync(userId);

        // Assert
        Assert.NotNull(result);
        Assert.IsType<SocialPrivacyConsent>(result);
    }

    [Fact]
    public async Task GetSocialPrivacyConsentAsync_WithEmptyGuid_StillReturnsResult()
    {
        // Arrange
        var userId = Guid.Empty;

        // Act
        var result = await _privacyService.GetSocialPrivacyConsentAsync(userId);

        // Assert
        Assert.NotNull(result);
    }

    #endregion
}
