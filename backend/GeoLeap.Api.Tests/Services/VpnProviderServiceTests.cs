using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services.VpnGuidanceServices;
using System.Text.Json;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Phase 2D: Comprehensive tests for VpnProviderService
/// Goal: Achieve 80%+ coverage for VPN provider CRUD, search, recommendations, and comparisons
/// Focus: Provider management, recommendation engine, search filters, comparison matrix
/// Expected coverage: ~600+ lines out of 738 total
/// </summary>
public class VpnProviderServiceTests : IAsyncLifetime
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IVpnAnalyticsService> _mockAnalyticsService;
    private readonly Mock<ILogger<VpnProviderService>> _mockLogger;
    private readonly VpnProviderService _service;

    // Test data
    private readonly Guid _testProviderId1 = Guid.NewGuid();
    private readonly Guid _testProviderId2 = Guid.NewGuid();
    private readonly Guid _testProviderId3 = Guid.NewGuid();
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _streamingServiceId = Guid.NewGuid();

    public VpnProviderServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"VpnProviderTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockAnalyticsService = new Mock<IVpnAnalyticsService>();
        _mockLogger = new Mock<ILogger<VpnProviderService>>();

        _service = new VpnProviderService(_context, _mockAnalyticsService.Object, _mockLogger.Object);
    }

    public async Task InitializeAsync()
    {
        await SeedTestDataAsync();
    }

    public Task DisposeAsync()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
        return Task.CompletedTask;
    }

    private async Task SeedTestDataAsync()
    {
        // Create test streaming service
        var streamingService = new StreamingService
        {
            Id = _streamingServiceId,
            Name = "Netflix",
            IsActive = true
        };

        // Create test VPN providers
        var provider1 = new VpnProvider
        {
            Id = _testProviderId1,
            Name = "ExpressVPN",
            Description = "Fast and reliable VPN service",
            WebsiteUrl = "https://expressvpn.com",
            AffiliateUrl = "https://expressvpn.com/refer",
            LogoUrl = "https://expressvpn.com/logo.png",
            MonthlyPrice = 12.95m,
            AnnualPrice = 99.95m,
            HasFreeTrial = true,
            FreeTrialDays = 30,
            ServerCount = 3000,
            CountryCount = 94,
            SupportsP2P = true,
            SupportsStreaming = true,
            HasKillSwitch = true,
            HasNoLogsPolicy = true,
            MaxSimultaneousConnections = 5,
            SupportedPlatforms = JsonSerializer.Serialize(new List<string> { "Windows", "Mac", "iOS", "Android" }),
            OverallRating = 4.7,
            TotalRatings = 1500,
            AverageSpeedRating = 8.5,
            ReliabilityRating = 9.0,
            EaseOfUseRating = 4.5,
            CustomerSupportRating = 4.8,
            IsActive = true,
            IsFeatured = true,
            DisplayOrder = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var provider2 = new VpnProvider
        {
            Id = _testProviderId2,
            Name = "NordVPN",
            Description = "Secure and private VPN service",
            WebsiteUrl = "https://nordvpn.com",
            MonthlyPrice = 11.95m,
            AnnualPrice = 59.88m,
            HasFreeTrial = false,
            ServerCount = 5000,
            CountryCount = 60,
            SupportsP2P = true,
            SupportsStreaming = true,
            HasKillSwitch = true,
            HasNoLogsPolicy = true,
            MaxSimultaneousConnections = 6,
            SupportedPlatforms = JsonSerializer.Serialize(new List<string> { "Windows", "Mac", "Linux" }),
            OverallRating = 4.5,
            TotalRatings = 2000,
            AverageSpeedRating = 7.8,
            ReliabilityRating = 8.5,
            EaseOfUseRating = 4.2,
            CustomerSupportRating = 4.3,
            IsActive = true,
            IsFeatured = true,
            DisplayOrder = 2,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var provider3 = new VpnProvider
        {
            Id = _testProviderId3,
            Name = "InactiveVPN",
            Description = "Inactive provider for testing",
            WebsiteUrl = "https://inactivevpn.com",
            MonthlyPrice = 9.99m,
            AnnualPrice = 79.99m,
            ServerCount = 1000,
            CountryCount = 30,
            IsActive = false, // Inactive provider
            IsFeatured = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Add server locations
        provider1.ServerLocations = new List<VpnServerLocation>
        {
            new() { Country = "United States", CountryCode = "US", City = "New York", ServerCount = 500, IsOptimizedForStreaming = true, IsP2PFriendly = true },
            new() { Country = "United Kingdom", CountryCode = "GB", City = "London", ServerCount = 300, IsOptimizedForStreaming = true, IsP2PFriendly = false }
        };

        provider2.ServerLocations = new List<VpnServerLocation>
        {
            new() { Country = "Germany", CountryCode = "DE", City = "Berlin", ServerCount = 400, IsOptimizedForStreaming = false, IsP2PFriendly = true }
        };

        // Add streaming compatibilities
        provider1.StreamingCompatibilities = new List<VpnStreamingCompatibility>
        {
            new()
            {
                StreamingServiceId = _streamingServiceId,
                Status = VpnStreamingStatus.WorksReliably,
                LastTested = DateTime.UtcNow.AddDays(-5),
                Notes = "Works great with all regions",
                CompatibleRegions = JsonSerializer.Serialize(new List<string> { "US", "UK", "CA" })
            }
        };

        provider2.StreamingCompatibilities = new List<VpnStreamingCompatibility>
        {
            new()
            {
                StreamingServiceId = _streamingServiceId,
                Status = VpnStreamingStatus.WorksSometimes,
                LastTested = DateTime.UtcNow.AddDays(-10),
                Notes = "Intermittent issues"
            }
        };

        // Create test user
        var user = new User
        {
            Id = _testUserId,
            Email = "testuser@example.com",
            UserName = "testuser@example.com",
            FirstName = "Test",
            LastName = "User"
        };

        _context.StreamingServices.Add(streamingService);
        _context.VpnProviders.AddRange(provider1, provider2, provider3);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
    }

    #region GetVpnProviderAsync Tests

    [Fact]
    public async Task GetVpnProviderAsync_WhenProviderExists_ReturnsProvider()
    {
        // Act
        var result = await _service.GetVpnProviderAsync(_testProviderId1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("ExpressVPN", result.Name);
        Assert.Equal(_testProviderId1, result.Id);
        Assert.Equal(12.95m, result.MonthlyPrice);
        Assert.True(result.IsFeatured);
        Assert.Equal(2, result.ServerLocations.Count); // Includes related data
        Assert.Single(result.StreamingCompatibilities);
    }

    [Fact]
    public async Task GetVpnProviderAsync_WhenProviderDoesNotExist_ReturnsNull()
    {
        // Act
        var result = await _service.GetVpnProviderAsync(Guid.NewGuid());

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetVpnProviderAsync_WhenProviderIsInactive_ReturnsNull()
    {
        // Act
        var result = await _service.GetVpnProviderAsync(_testProviderId3);

        // Assert - Inactive providers should not be returned
        Assert.Null(result);
    }

    #endregion

    #region GetAllVpnProvidersAsync Tests

    [Fact]
    public async Task GetAllVpnProvidersAsync_ReturnsOnlyActiveProviders_ByDefault()
    {
        // Act
        var results = await _service.GetAllVpnProvidersAsync();

        // Assert
        Assert.Equal(2, results.Count()); // Only active providers
        Assert.All(results, p => Assert.NotEqual(_testProviderId3, p.Id));
    }

    [Fact]
    public async Task GetAllVpnProvidersAsync_WithIncludeInactive_ReturnsAllProviders()
    {
        // Act
        var results = await _service.GetAllVpnProvidersAsync(includeInactive: true);

        // Assert
        Assert.Equal(3, results.Count()); // All providers including inactive
        Assert.Contains(results, p => p.Id == _testProviderId3);
    }

    [Fact]
    public async Task GetAllVpnProvidersAsync_OrdersByDisplayOrderThenRating()
    {
        // Act
        var results = (await _service.GetAllVpnProvidersAsync()).ToList();

        // Assert
        Assert.Equal(2, results.Count);
        Assert.Equal("ExpressVPN", results[0].Name); // DisplayOrder 1, higher rating
        Assert.Equal("NordVPN", results[1].Name); // DisplayOrder 2
    }

    #endregion

    #region GetFeaturedVpnProvidersAsync Tests

    [Fact]
    public async Task GetFeaturedVpnProvidersAsync_ReturnsOnlyFeaturedActiveProviders()
    {
        // Act
        var results = await _service.GetFeaturedVpnProvidersAsync();

        // Assert
        Assert.Equal(2, results.Count()); // Both provider1 and provider2 are featured
        Assert.All(results, p => Assert.True(p.IsFeatured));
    }

    #endregion

    #region CreateVpnProviderAsync Tests

    [Fact]
    public async Task CreateVpnProviderAsync_CreatesNewProvider_WithGeneratedId()
    {
        // Arrange
        var newProvider = new VpnProvider
        {
            Name = "NewVPN",
            Description = "Test VPN",
            WebsiteUrl = "https://newvpn.com",
            MonthlyPrice = 9.99m,
            AnnualPrice = 79.99m,
            IsActive = true
        };

        // Act
        var result = await _service.CreateVpnProviderAsync(newProvider);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("NewVPN", result.Name);
        Assert.NotEqual(Guid.Empty, result.Id); // ID should be generated

        // Verify in database
        var dbProvider = await _context.VpnProviders.FindAsync(result.Id);
        Assert.NotNull(dbProvider);
        Assert.Equal("NewVPN", dbProvider.Name);
    }

    #endregion

    #region UpdateVpnProviderAsync Tests

    [Fact]
    public async Task UpdateVpnProviderAsync_UpdatesExistingProvider()
    {
        // Arrange
        var updates = new VpnProvider
        {
            Name = "ExpressVPN Updated",
            Description = "Updated description",
            WebsiteUrl = "https://expressvpn.com",
            MonthlyPrice = 13.95m,
            AnnualPrice = 109.95m,
            HasKillSwitch = false,
            DisplayOrder = 5,
            ServerCount = 3000,
            CountryCount = 94,
            SupportsP2P = true,
            SupportsStreaming = true,
            HasNoLogsPolicy = true,
            MaxSimultaneousConnections = 5,
            SupportedPlatforms = JsonSerializer.Serialize(new List<string> { "Windows", "Mac" })
        };

        // Act
        var result = await _service.UpdateVpnProviderAsync(_testProviderId1, updates);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("ExpressVPN Updated", result.Name);
        Assert.Equal(13.95m, result.MonthlyPrice);
    }

    [Fact]
    public async Task UpdateVpnProviderAsync_WhenProviderDoesNotExist_ReturnsNull()
    {
        // Arrange
        var updates = new VpnProvider { Name = "Non-existent" };

        // Act
        var result = await _service.UpdateVpnProviderAsync(Guid.NewGuid(), updates);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region DeleteVpnProviderAsync Tests

    [Fact]
    public async Task DeleteVpnProviderAsync_SoftDeletesProvider()
    {
        // Act
        var result = await _service.DeleteVpnProviderAsync(_testProviderId2);

        // Assert
        Assert.True(result);

        // Verify soft delete (IsActive = false)
        var dbProvider = await _context.VpnProviders.FindAsync(_testProviderId2);
        Assert.NotNull(dbProvider);
        Assert.False(dbProvider.IsActive);
    }

    [Fact]
    public async Task DeleteVpnProviderAsync_WhenProviderDoesNotExist_ReturnsFalse()
    {
        // Act
        var result = await _service.DeleteVpnProviderAsync(Guid.NewGuid());

        // Assert
        Assert.False(result);
    }

    #endregion

    #region SearchVpnProvidersAsync Tests

    [Fact]
    public async Task SearchVpnProvidersAsync_WithNoFilters_ReturnsAllActiveProviders()
    {
        // Act
        var results = await _service.SearchVpnProvidersAsync();

        // Assert
        Assert.Equal(2, results.Count());
    }

    [Fact]
    public async Task SearchVpnProvidersAsync_WithSearchTerm_FiltersProviders()
    {
        // Act
        var results = await _service.SearchVpnProvidersAsync(searchTerm: "Express");

        // Assert
        Assert.Single(results);
        Assert.Equal("ExpressVPN", results.First().Name);
    }

    [Fact]
    public async Task SearchVpnProvidersAsync_WithMaxMonthlyPrice_FiltersProviders()
    {
        // Act
        var results = await _service.SearchVpnProvidersAsync(maxMonthlyPrice: 12.00m);

        // Assert
        Assert.Single(results);
        Assert.Equal("NordVPN", results.First().Name); // 11.95 < 12.00
    }

    [Fact]
    public async Task SearchVpnProvidersAsync_WithSupportsStreaming_FiltersProviders()
    {
        // Act
        var results = await _service.SearchVpnProvidersAsync(supportsStreaming: true);

        // Assert
        Assert.Equal(2, results.Count()); // Both support streaming
    }

    [Fact]
    public async Task SearchVpnProvidersAsync_WithRequiredPlatforms_FiltersProviders()
    {
        // Act - Search for providers supporting both Windows and Mac
        var results = await _service.SearchVpnProvidersAsync(
            requiredPlatforms: new List<string> { "Windows", "Mac" });

        // Assert
        Assert.Equal(2, results.Count()); // Both support Windows and Mac
    }

    [Fact]
    public async Task SearchVpnProvidersAsync_WithRequiredCountries_FiltersProviders()
    {
        // Act
        var results = await _service.SearchVpnProvidersAsync(
            requiredCountries: new List<string> { "US" });

        // Assert
        Assert.Single(results);
        Assert.Equal("ExpressVPN", results.First().Name); // Has US server
    }

    [Fact]
    public async Task SearchVpnProvidersAsync_WithMinRating_FiltersProviders()
    {
        // Act
        var results = await _service.SearchVpnProvidersAsync(minRating: 4.6);

        // Assert
        Assert.Single(results);
        Assert.Equal("ExpressVPN", results.First().Name); // 4.7 rating
    }

    [Fact]
    public async Task SearchVpnProvidersAsync_WithMultipleFilters_AppliesAllFilters()
    {
        // Act - Find affordable VPNs with streaming support
        var results = await _service.SearchVpnProvidersAsync(
            maxMonthlyPrice: 12.00m,
            supportsStreaming: true,
            hasKillSwitch: true);

        // Assert
        Assert.Single(results);
        Assert.Equal("NordVPN", results.First().Name);
    }

    #endregion

    #region GetRecommendationsAsync Tests

    [Fact]
    public async Task GetRecommendationsAsync_BestOverall_ReturnsHighestRatedProviders()
    {
        // Act
        var result = await _service.GetRecommendationsAsync(
            recommendationType: VpnRecommendationType.BestOverall);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(VpnRecommendationType.BestOverall, result.RecommendationType);
        Assert.Equal(2, result.RecommendedProviders.Count);
        Assert.Equal("ExpressVPN", result.RecommendedProviders[0].Name); // Highest rating
        Assert.Contains("Top-rated", result.RecommendationReason);
        Assert.True(result.ConfidenceScore > 0);
    }

    [Fact]
    public async Task GetRecommendationsAsync_BestValue_ReturnsAffordableProviders()
    {
        // Act
        var result = await _service.GetRecommendationsAsync(
            recommendationType: VpnRecommendationType.BestValue);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(VpnRecommendationType.BestValue, result.RecommendationType);
        Assert.Contains("value", result.RecommendationReason.ToLower());
        Assert.True(result.Criteria.ContainsKey("minRating"));
        Assert.Equal(3.5, result.Criteria["minRating"]);
    }

    [Fact]
    public async Task GetRecommendationsAsync_BestForStreaming_ReturnsStreamingOptimizedProviders()
    {
        // Act
        var result = await _service.GetRecommendationsAsync(
            recommendationType: VpnRecommendationType.BestForStreaming);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(VpnRecommendationType.BestForStreaming, result.RecommendationType);
        Assert.All(result.RecommendedProviders, p => Assert.True(p.SupportsStreaming));
        Assert.Contains("streaming", result.RecommendationReason.ToLower());
    }

    [Fact]
    public async Task GetRecommendationsAsync_BestForP2P_ReturnsP2PProviders()
    {
        // Act
        var result = await _service.GetRecommendationsAsync(
            recommendationType: VpnRecommendationType.BestForP2P);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(VpnRecommendationType.BestForP2P, result.RecommendationType);
        Assert.All(result.RecommendedProviders, p => Assert.True(p.SupportsP2P));
    }

    [Fact]
    public async Task GetRecommendationsAsync_BestForBeginners_ReturnsEasyToUseProviders()
    {
        // Act
        var result = await _service.GetRecommendationsAsync(
            recommendationType: VpnRecommendationType.BestForBeginners);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(VpnRecommendationType.BestForBeginners, result.RecommendationType);
        Assert.Contains("beginner", result.RecommendationReason.ToLower());
        Assert.True(result.Criteria.ContainsKey("minEaseOfUse"));
    }

    [Fact]
    public async Task GetRecommendationsAsync_BestForSecurity_ReturnsSecureProviders()
    {
        // Act
        var result = await _service.GetRecommendationsAsync(
            recommendationType: VpnRecommendationType.BestForSecurity);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(VpnRecommendationType.BestForSecurity, result.RecommendationType);
        Assert.True((bool)result.Criteria["hasKillSwitch"]);
        Assert.True((bool)result.Criteria["hasNoLogsPolicy"]);
    }

    [Fact]
    public async Task GetRecommendationsAsync_BestForSpeed_ReturnsFastProviders()
    {
        // Act
        var result = await _service.GetRecommendationsAsync(
            recommendationType: VpnRecommendationType.BestForSpeed);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(VpnRecommendationType.BestForSpeed, result.RecommendationType);
        Assert.Contains("speed", result.RecommendationReason.ToLower());
    }

    #endregion

    #region GetPersonalizedRecommendationsAsync Tests

    [Fact]
    public async Task GetPersonalizedRecommendationsAsync_WithNoPreferences_FallsBackToGeneral()
    {
        // Act
        var result = await _service.GetPersonalizedRecommendationsAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.RecommendedProviders);
    }

    [Fact]
    public async Task GetPersonalizedRecommendationsAsync_WithPreferences_AppliesFilters()
    {
        // Arrange - Create user preferences (less restrictive to match test data)
        var preferences = new UserVpnPreference
        {
            UserId = _testUserId,
            MaxMonthlyBudget = 15.00m, // Higher budget to match both providers
            NeedsStreamingSupport = true,
            NeedsP2PSupport = false,
            RequiredSimultaneousConnections = 5,
            RequiredPlatforms = JsonSerializer.Serialize(new List<string> { "Windows" }), // Just Windows to match both
            PreferredServerCountries = JsonSerializer.Serialize(new List<string> { "US" }) // Just US to match provider1
        };
        _context.UserVpnPreferences.Add(preferences);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetPersonalizedRecommendationsAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("personalized", result.RecommendationReason.ToLower());
        Assert.True((bool)result.Criteria["personalized"]);
        Assert.True((bool)result.Criteria["hasPreferences"]);
        Assert.NotEmpty(result.RecommendedProviders);
    }

    #endregion

    #region CompareProvidersAsync Tests

    [Fact]
    public async Task CompareProvidersAsync_WithPriceComparison_ReturnsComparisonMatrix()
    {
        // Arrange
        var criteria = new VpnComparisonCriteria
        {
            ComparePrice = true,
            CompareFeatures = false,
            CompareRatings = false,
            CompareServers = false,
            CompareStreaming = false
        };

        // Act
        var result = await _service.CompareProvidersAsync(
            new List<Guid> { _testProviderId1, _testProviderId2 },
            criteria);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Providers.Count);
        Assert.True(result.ComparisonMatrix.ContainsKey("pricing"));
    }

    [Fact]
    public async Task CompareProvidersAsync_WithFeaturesComparison_IncludesFeatureMatrix()
    {
        // Arrange
        var criteria = new VpnComparisonCriteria
        {
            ComparePrice = false,
            CompareFeatures = true,
            CompareRatings = false
        };

        // Act
        var result = await _service.CompareProvidersAsync(
            new List<Guid> { _testProviderId1, _testProviderId2 },
            criteria);

        // Assert
        Assert.True(result.ComparisonMatrix.ContainsKey("features"));
    }

    [Fact]
    public async Task CompareProvidersAsync_WithRatingsComparison_IncludesRatingMatrix()
    {
        // Arrange
        var criteria = new VpnComparisonCriteria
        {
            CompareRatings = true
        };

        // Act
        var result = await _service.CompareProvidersAsync(
            new List<Guid> { _testProviderId1, _testProviderId2 },
            criteria);

        // Assert
        Assert.True(result.ComparisonMatrix.ContainsKey("ratings"));
    }

    [Fact]
    public async Task CompareProvidersAsync_WithServersComparison_IncludesServerMatrix()
    {
        // Arrange
        var criteria = new VpnComparisonCriteria
        {
            CompareServers = true
        };

        // Act
        var result = await _service.CompareProvidersAsync(
            new List<Guid> { _testProviderId1, _testProviderId2 },
            criteria);

        // Assert
        Assert.True(result.ComparisonMatrix.ContainsKey("servers"));
    }

    [Fact]
    public async Task CompareProvidersAsync_WithStreamingComparison_IncludesStreamingMatrix()
    {
        // Arrange
        var criteria = new VpnComparisonCriteria
        {
            CompareStreaming = true
        };

        // Act
        var result = await _service.CompareProvidersAsync(
            new List<Guid> { _testProviderId1, _testProviderId2 },
            criteria);

        // Assert
        Assert.True(result.ComparisonMatrix.ContainsKey("streaming"));
    }

    #endregion

    #region Analytics Tracking Tests

    [Fact]
    public async Task TrackProviderViewAsync_CallsAnalyticsService()
    {
        // Act
        await _service.TrackProviderViewAsync(_testProviderId1, _testUserId, "session123");

        // Assert
        _mockAnalyticsService.Verify(
            x => x.TrackEventAsync(
                VpnGuidanceEventType.ProviderViewed,
                _testUserId,
                _testProviderId1,
                null,
                null,
                "session123",
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task TrackProviderClickAsync_WithAffiliateClick_TracksCorrectly()
    {
        // Act
        await _service.TrackProviderClickAsync(_testProviderId1, _testUserId, "session123", isAffiliateClick: true);

        // Assert
        _mockAnalyticsService.Verify(
            x => x.TrackEventAsync(
                VpnGuidanceEventType.AffiliateClicked,
                _testUserId,
                _testProviderId1,
                null,
                It.Is<Dictionary<string, object>>(d => (bool)d["isAffiliateClick"] == true),
                "session123",
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task TrackProviderClickAsync_WithNonAffiliateClick_TracksCorrectly()
    {
        // Act
        await _service.TrackProviderClickAsync(_testProviderId1, _testUserId, "session123", isAffiliateClick: false);

        // Assert
        _mockAnalyticsService.Verify(
            x => x.TrackEventAsync(
                VpnGuidanceEventType.ProviderClicked,
                It.IsAny<Guid?>(),
                It.IsAny<Guid?>(),
                It.IsAny<Guid?>(),
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    #endregion
}
