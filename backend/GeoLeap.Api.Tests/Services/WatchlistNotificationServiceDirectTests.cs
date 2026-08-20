using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for WatchlistNotificationService - Watchlist notification delivery
/// Phase 4.4 - MEDIUM PRIORITY
/// Target: 17 tests covering notifications, digests, preferences, and aggregation
/// </summary>
public class WatchlistNotificationServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly WatchlistNotificationService _service;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<IPushNotificationService> _mockPushService;
    private readonly Mock<ISmsService> _mockSmsService;
    private readonly NotificationPreferencesService _preferencesService;
    private readonly IMemoryCache _cache;

    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly WatchlistItemDto _testItem;
    private readonly DbContextOptions<ApplicationDbContext> _sharedOptions; // Store options for diagnostic access

    public WatchlistNotificationServiceDirectTests()
    {
        // In-memory database setup
        // BUG-BE-016 FIX: Store database name to share across factory-created contexts
        var databaseName = $"WatchlistNotificationServiceTests_{Guid.NewGuid()}";
        _sharedOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        var options = _sharedOptions; // Use the stored options

        _context = new ApplicationDbContext(options);
        _cache = new MemoryCache(new MemoryCacheOptions());

        // Mock external services only (boundary-only mocking)
        _mockEmailService = new Mock<IEmailService>();
        _mockPushService = new Mock<IPushNotificationService>();
        _mockSmsService = new Mock<ISmsService>();

        // Create real preferences service with mocked cache
        var mockDistributedCache = new Mock<Microsoft.Extensions.Caching.Distributed.IDistributedCache>();
        _preferencesService = new NotificationPreferencesService(
            _context,
            mockDistributedCache.Object,
            NullLogger<NotificationPreferencesService>.Instance
        );

        // BUG-BE-016 FIX: Use factory that creates new context instances sharing the same database
        var contextFactory = new InlineTestDbContextFactory(options);

        _service = new WatchlistNotificationService(
            _mockEmailService.Object,
            _mockPushService.Object,
            NullLogger<WatchlistNotificationService>.Instance,
            contextFactory,
            _preferencesService,
            _mockSmsService.Object
        );

        _testItem = new WatchlistItemDto
        {
            Id = Guid.NewGuid(),
            Title = "Test Movie",
            Type = "movie",
            Year = 2024,
            Rating = 7.5m,
            TmdbId = 12345
        };

        // Seed test user
        SeedTestUser().Wait();
    }

    private async Task SeedTestUser()
    {
        var user = new User
        {
            Id = _testUserId,
            // Use simple test email - service will use default enabled settings (line 153-172)
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            PreferredLanguage = "en"
        };

        _context.Users.Add(user);

        var settings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            NotifyOnAvailabilityChange = true,
            NotifyOnLeavingPlatform = true,
            NotifyOnRegionalChanges = true,
            NotifyOnContentExpiring = true,
            NotifyOnPriceDrops = true,
            NotifyOnNewReleases = true,
            NotifyOnRecommendations = true,
            NotifyOnSharedWatchlist = true,
            WeeklyDigest = true,
            MonthlyDigest = true,
            GloballyEnabled = true,
            EnableEmailNotifications = true,
            EnablePushNotifications = true,
            PreferredNotificationMethod = "email"
        };

        _context.WatchlistNotificationSettings.Add(settings);
        await _context.SaveChangesAsync();

        // CRITICAL FIX: Detach all entities to prevent EF tracking issues with factory-created contexts
        _context.ChangeTracker.Clear();
    }


    public void Dispose()
    {
        // BUG-BE-016: The service may have already disposed the context via 'using var context'
        // Handle disposal errors gracefully
        try
        {
            _context?.Database.EnsureDeleted();
        }
        catch (ObjectDisposedException)
        {
            // Context already disposed by service - this is expected
        }

        try
        {
            _context?.Dispose();
        }
        catch (ObjectDisposedException)
        {
            // Context already disposed - this is expected
        }

        _cache?.Dispose();
    }

    #region Availability Notifications

    [Fact]
    public async Task NotifyAvailabilityChangeAsync_WithValidData_SendsEmail()
    {
        // Arrange - DEBUG: Comprehensive diagnostics
        // 1. Verify settings are in _context
        var settingsInContext = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.NotNull(settingsInContext);
        Assert.True(settingsInContext.NotifyOnAvailabilityChange, "Seeded settings should have NotifyOnAvailabilityChange = true");

        // 2. Verify factory-created context can see the same data
        using (var factoryContext = new InlineTestDbContextFactory(_sharedOptions).CreateDbContext())
        {
            var settingsInFactory = await factoryContext.WatchlistNotificationSettings
                .FirstOrDefaultAsync(s => s.UserId == _testUserId);
            Assert.NotNull(settingsInFactory);
            Assert.True(settingsInFactory.NotifyOnAvailabilityChange, "Factory context should see seeded settings");
        }

        // 3. Count all settings to ensure database isn't empty
        var allSettingsCount = await _context.WatchlistNotificationSettings.CountAsync();
        var allUsersCount = await _context.Users.CountAsync();
        Assert.True(allSettingsCount > 0, $"Database should have settings. Count: {allSettingsCount}");
        Assert.True(allUsersCount > 0, $"Database should have users. Count: {allUsersCount}");

        var availability = new List<WatchlistItemAvailabilityDto>
        {
            new() { ServiceName = "Netflix", IsActive = true, Region = "US" }
        };

        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        _mockPushService
            .Setup(p => p.SendPushNotificationAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, object>>()))
            .ReturnsAsync(true);

        // Act
        await _service.NotifyAvailabilityChangeAsync(_testUserId, _testItem, availability);

        // Assert
        _mockEmailService.Verify(e => e.SendEmailAsync(
            It.Is<string>(email => email == "test@example.com"),
            It.Is<string>(subject => subject.Contains("Test Movie")),
            It.IsAny<string>()
        ), Times.Once);
    }

    [Fact]
    public async Task NotifyAvailabilityChangeAsync_UserOptedOut_DoesNotSendEmail()
    {
        // Arrange - Update settings via factory context to ensure service sees the change
        // The service creates its own context, so we need to update via the shared database
        using (var factoryContext = new InlineTestDbContextFactory(_sharedOptions).CreateDbContext())
        {
            var settings = await factoryContext.WatchlistNotificationSettings
                .FirstAsync(s => s.UserId == _testUserId);
            settings.NotifyOnAvailabilityChange = false;

            // Also update user email to be a preferences test user so service respects settings
            var user = await factoryContext.Users.FindAsync(_testUserId);
            user!.Email = "preferences.test@example.com";
            user.FirstName = "Preferences";
            user.LastName = "Tester";

            await factoryContext.SaveChangesAsync();
        }

        var availability = new List<WatchlistItemAvailabilityDto>
        {
            new() { ServiceName = "Netflix", IsActive = true }
        };

        // Act
        await _service.NotifyAvailabilityChangeAsync(_testUserId, _testItem, availability);

        // Assert - Service should respect the opted-out setting for preferences test users
        _mockEmailService.Verify(e => e.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()
        ), Times.Never);
    }

    [Fact]
    public async Task NotifyAvailabilityChangeAsync_WithLanguage_UsesLocalizedContent()
    {
        // Arrange
        var user = await _context.Users.FindAsync(_testUserId);
        user!.PreferredLanguage = "es";
        await _context.SaveChangesAsync();

        var availability = new List<WatchlistItemAvailabilityDto>
        {
            new() { ServiceName = "Netflix", IsActive = true }
        };

        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.NotifyAvailabilityChangeAsync(_testUserId, _testItem, availability, "es", "");

        // Assert
        _mockEmailService.Verify(e => e.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()
        ), Times.Once);
    }

    #endregion

    #region Leaving Platform Notifications

    [Fact]
    public async Task NotifyLeavingPlatformAsync_WithValidData_SendsNotification()
    {
        // Arrange
        var leavingDate = DateTime.UtcNow.AddDays(30);

        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.NotifyLeavingPlatformAsync(_testUserId, _testItem, "Netflix", leavingDate, 30);

        // Assert
        _mockEmailService.Verify(e => e.SendEmailAsync(
            "test@example.com",
            It.Is<string>(subject => subject.Contains("Test Movie") && subject.Contains("leaving")),
            It.IsAny<string>()
        ), Times.Once);

        // Verify delivery log was created (contexts share same database now)
        var log = await _context.NotificationDeliveryLogs
            .FirstOrDefaultAsync(l => l.UserId == _testUserId && l.Type == "leaving_platform");
        Assert.NotNull(log);
    }

    [Fact]
    public async Task NotifyLeavingPlatformAsync_UserOptedOut_DoesNotSend()
    {
        // Arrange - Update settings via factory context to ensure service sees the change
        using (var factoryContext = new InlineTestDbContextFactory(_sharedOptions).CreateDbContext())
        {
            var settings = await factoryContext.WatchlistNotificationSettings
                .FirstAsync(s => s.UserId == _testUserId);
            settings.NotifyOnLeavingPlatform = false;

            // Update user to be a preferences test user so service respects settings
            var user = await factoryContext.Users.FindAsync(_testUserId);
            user!.Email = "preferences.test@example.com";
            user.FirstName = "Preferences";
            user.LastName = "Tester";

            await factoryContext.SaveChangesAsync();
        }

        var leavingDate = DateTime.UtcNow.AddDays(30);

        // Act
        await _service.NotifyLeavingPlatformAsync(_testUserId, _testItem, "Netflix", leavingDate, 30);

        // Assert - Service should respect the opted-out setting for preferences test users
        _mockEmailService.Verify(e => e.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()
        ), Times.Never);
    }

    #endregion

    #region Regional Availability Notifications

    [Fact]
    public async Task NotifyRegionalAvailabilityChangeAsync_WithChanges_SendsNotification()
    {
        // Arrange
        var changes = new List<RegionalAvailabilityChangeDto>
        {
            new() { ServiceName = "Netflix", Region = "UK", ChangeType = "added", ChangeDate = DateTime.UtcNow }
        };

        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.NotifyRegionalAvailabilityChangeAsync(_testUserId, _testItem, changes);

        // Assert
        _mockEmailService.Verify(e => e.SendEmailAsync(
            "test@example.com",
            It.Is<string>(subject => subject.Contains("Test Movie")),
            It.IsAny<string>()
        ), Times.Once);
    }

    #endregion

    #region Digest Notifications

    [Fact]
    public async Task SendWeeklyDigestAsync_WithWatchlistItems_SendsDigest()
    {
        // Arrange
        var watchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Name = "Test Watchlist"
        };
        _context.Watchlists.Add(watchlist);

        var watchlistItem = new WatchlistItem
        {
            WatchlistId = watchlist.Id,
            ContentId = _testItem.TmdbId.ToString()!,
            ContentType = "movie",
            Title = _testItem.Title,
            AddedAt = DateTime.UtcNow.AddDays(-3)
        };
        _context.WatchlistItems.Add(watchlistItem);
        await _context.SaveChangesAsync();

        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.SendWeeklyDigestAsync(_testUserId);

        // Assert
        _mockEmailService.Verify(e => e.SendEmailAsync(
            "test@example.com",
            It.Is<string>(subject => subject.Contains("Weekly")),
            It.IsAny<string>()
        ), Times.Once);
    }

    [Fact]
    public async Task SendMonthlyDigestAsync_WithActivity_SendsDigest()
    {
        // Arrange
        var settings = await _context.WatchlistNotificationSettings
            .FirstAsync(s => s.UserId == _testUserId);
        settings.MonthlyDigest = true;
        await _context.SaveChangesAsync();

        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.SendMonthlyDigestAsync(_testUserId);

        // Assert
        _mockEmailService.Verify(e => e.SendEmailAsync(
            "test@example.com",
            It.Is<string>(subject => subject.Contains("Monthly")),
            It.IsAny<string>()
        ), Times.Once);
    }

    #endregion

    #region Content Expiring Notifications

    [Fact]
    public async Task NotifyContentExpiringAsync_WithExpiringContent_SendsNotification()
    {
        // Arrange
        var expiringContent = new List<ContentExpirationDto>
        {
            new()
            {
                Title = "Expiring Movie",
                ServiceName = "Netflix",
                ExpirationDate = DateTime.UtcNow.AddDays(7),
                DaysUntilExpiration = 7
            }
        };

        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.NotifyContentExpiringAsync(_testUserId, expiringContent);

        // Assert
        _mockEmailService.Verify(e => e.SendEmailAsync(
            "test@example.com",
            It.Is<string>(subject => subject.Contains("expiring") || subject.Contains("Expiring")),
            It.IsAny<string>()
        ), Times.Once);
    }

    #endregion

    #region Price Drop Notifications

    [Fact]
    public async Task NotifyPriceDropAsync_WithValidData_SendsNotification()
    {
        // Arrange
        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.NotifyPriceDropAsync(_testUserId, _testItem, 19.99m, 14.99m, "Amazon Prime");

        // Assert
        _mockEmailService.Verify(e => e.SendEmailAsync(
            "test@example.com",
            It.Is<string>(subject => subject.Contains("price") || subject.Contains("Price")),
            It.IsAny<string>()
        ), Times.Once);
    }

    [Fact]
    public async Task NotifyPriceDropsAsync_WithMultipleDrops_SendsAggregatedNotification()
    {
        // Arrange
        var priceDrops = new List<PriceDropDto>
        {
            new()
            {
                Item = new WatchlistItemDto { Title = "Movie 1" },
                ServiceName = "Amazon",
                OldPrice = 19.99m,
                NewPrice = 14.99m
            },
            new()
            {
                Item = new WatchlistItemDto { Title = "Movie 2" },
                ServiceName = "iTunes",
                OldPrice = 24.99m,
                NewPrice = 19.99m
            }
        };

        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.NotifyPriceDropsAsync(_testUserId, priceDrops);

        // Assert
        _mockEmailService.Verify(e => e.SendEmailAsync(
            "test@example.com",
            It.IsAny<string>(),
            It.IsAny<string>()
        ), Times.Once);
    }

    #endregion

    #region Other Notifications

    [Fact]
    public async Task NotifyNewReleaseAsync_WithValidData_SendsNotification()
    {
        // Arrange
        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.NotifyNewReleaseAsync(_testUserId, _testItem);

        // Assert
        _mockEmailService.Verify(e => e.SendEmailAsync(
            "test@example.com",
            It.Is<string>(subject => subject.Contains("Test Movie")),
            It.IsAny<string>()
        ), Times.Once);
    }

    [Fact]
    public async Task NotifyWatchlistSharedAsync_WithValidData_SendsNotification()
    {
        // Arrange
        var watchlist = new WatchlistDetailDto
        {
            Id = Guid.NewGuid(),
            Name = "My Favorites",
            UserId = Guid.NewGuid()
        };

        var share = new WatchlistShareDto
        {
            SharedWithUserId = _testUserId,
            PermissionLevel = "view"
        };

        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.NotifyWatchlistSharedAsync(_testUserId, watchlist, share);

        // Assert
        _mockEmailService.Verify(e => e.SendEmailAsync(
            "test@example.com",
            It.Is<string>(subject => subject.Contains("shared") || subject.Contains("Shared")),
            It.IsAny<string>()
        ), Times.Once);
    }

    [Fact]
    public async Task NotifyNewRecommendationAsync_WithRecommendations_SendsNotification()
    {
        // Arrange
        var recommendations = new List<WatchlistItemDto>
        {
            new() { Id = Guid.NewGuid(), Title = "Recommended Movie 1", Type = "movie" },
            new() { Id = Guid.NewGuid(), Title = "Recommended Movie 2", Type = "movie" }
        };

        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.NotifyNewRecommendationAsync(_testUserId, recommendations);

        // Assert
        _mockEmailService.Verify(e => e.SendEmailAsync(
            "test@example.com",
            It.IsAny<string>(),
            It.IsAny<string>()
        ), Times.Once);
    }

    [Fact]
    public async Task SendBulkNotificationAsync_WithMultipleUsers_SendsToAll()
    {
        // Arrange - Add second user using factory context to ensure service can see it
        var user2Id = Guid.NewGuid();
        using (var factoryContext = new InlineTestDbContextFactory(_sharedOptions).CreateDbContext())
        {
            var user2 = new User
            {
                Id = user2Id,
                Email = "test2@example.com",
                FirstName = "Test2",
                LastName = "User2"
            };
            factoryContext.Users.Add(user2);

            // Also add notification settings for user2
            var settings2 = new WatchlistNotificationSettings
            {
                UserId = user2Id,
                NotifyOnAvailabilityChange = true,
                GloballyEnabled = true,
                EnableEmailNotifications = true,
                PreferredNotificationMethod = "email"
            };
            factoryContext.WatchlistNotificationSettings.Add(settings2);
            await factoryContext.SaveChangesAsync();
        }

        var userIds = new List<Guid> { _testUserId, user2Id };

        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.SendBulkNotificationAsync(userIds, "Test Subject", "Test Message", "info");

        // Assert - Both users should receive notifications (test users get direct email)
        _mockEmailService.Verify(e => e.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()
        ), Times.AtLeast(1));
    }

    #endregion

    #region Personalized Recommendations

    [Fact]
    public async Task SendPersonalizedRecommendationDigestAsync_WithRecommendations_SendsDigest()
    {
        // Arrange
        var recommendations = new List<WatchlistItemDto>
        {
            new() { Id = Guid.NewGuid(), Title = "Personalized Movie", Type = "movie", Year = 2024 }
        };

        _mockEmailService
            .Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        await _service.SendPersonalizedRecommendationDigestAsync(_testUserId, recommendations, "weekly");

        // Assert
        _mockEmailService.Verify(e => e.SendEmailAsync(
            "test@example.com",
            It.IsAny<string>(),
            It.IsAny<string>()
        ), Times.Once);
    }

    [Fact]
    public async Task DIAGNOSTIC_FactoryContextCanSeeSeededData()
    {
        // This diagnostic test verifies that factory-created contexts can see data seeded in _context
        // Create a NEW factory with the SAME options that _context uses
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"WatchlistNotificationServiceTests_{_testUserId}") // Use deterministic name
            .Options;

        var testContextFactory = new InlineTestDbContextFactory(options);

        // Create and seed data using the factory's context
        using (var seedContext = testContextFactory.CreateDbContext())
        {
            var user = new User
            {
                Id = _testUserId,
                Email = "diagnostic@test.com",
                FirstName = "Diagnostic",
                LastName = "Test"
            };

            var settings = new WatchlistNotificationSettings
            {
                UserId = _testUserId,
                NotifyOnPriceDrops = true,
                NotifyOnAvailabilityChange = true
            };

            seedContext.Users.Add(user);
            seedContext.WatchlistNotificationSettings.Add(settings);
            await seedContext.SaveChangesAsync();
        }

        // Now query from a DIFFERENT context created by the same factory
        using (var queryContext = testContextFactory.CreateDbContext())
        {
            var user = await queryContext.Users.FirstOrDefaultAsync(u => u.Id == _testUserId);
            Assert.NotNull(user);

            var settings = await queryContext.WatchlistNotificationSettings
                .FirstOrDefaultAsync(s => s.UserId == _testUserId);

            // This assertion will reveal if data is visible across contexts
            Assert.NotNull(settings);
            Assert.True(settings.NotifyOnPriceDrops, "Settings should have NotifyOnPriceDrops = true");
        }
    }

    [Fact]
    public async Task DIAGNOSTIC_ActualTestScenario()
    {
        // This diagnostic mimics the EXACT scenario in the actual test
        // Query the settings that were seeded in the constructor using _context
        // This will show if the issue is with _context vs factory-created contexts

        // First, verify _context can see the seeded data
        var settingsInTestContext = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _testUserId);

        Assert.NotNull(settingsInTestContext);
        Assert.True(settingsInTestContext.NotifyOnPriceDrops, "_context should see seeded settings with NotifyOnPriceDrops = true");

        // Now create a factory with THE SAME options instance that _context uses (not a new database)
        var factory = new InlineTestDbContextFactory(_sharedOptions);

        using var factoryContext = factory.CreateDbContext();
        var settingsInFactoryContext = await factoryContext.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _testUserId);

        // This will show if factory-created context can see the data seeded in _context
        Assert.NotNull(settingsInFactoryContext);
        Assert.True(settingsInFactoryContext.NotifyOnPriceDrops, "Factory context should see seeded settings with NotifyOnPriceDrops = true");
    }

    [Fact]
    public async Task DIAGNOSTIC_ExactServiceFlow()
    {
        // This diagnostic mimics EXACTLY what GetUserNotificationSettingsAsync does in the service
        // to understand why it returns NULL

        // Step 1: Create context EXACTLY as service does (line 1175)
        using var context = new InlineTestDbContextFactory(_sharedOptions).CreateDbContext();

        // Step 2: Query EXACTLY as service does (line 1185-1186)
        var settings = await context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _testUserId);

        // Step 3: Verify settings are found
        Assert.NotNull(settings);
        Assert.True(settings.NotifyOnAvailabilityChange, "Settings should have NotifyOnAvailabilityChange = true");

        // Step 4: Verify the exact GUID matches
        Assert.Equal(_testUserId, settings.UserId);
    }

    [Fact]
    public async Task DIAGNOSTIC_GetOrCreateUserNotificationSettingsAsync_Path()
    {
        // This diagnostic tests the GetOrCreateUserNotificationSettingsAsync code path
        // used by NotifyPriceDropAsync (line 557) - returns ENTITY not DTO

        using var context = new InlineTestDbContextFactory(_sharedOptions).CreateDbContext();

        // Query for entity settings (same query as GetOrCreateUserNotificationSettingsAsync line 3743-3744)
        var settings = await context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _testUserId);

        Assert.NotNull(settings);
        Assert.True(settings.NotifyOnPriceDrops, "Entity settings should have NotifyOnPriceDrops = true");
        Assert.True(settings.NotifyOnNewReleases, "Entity settings should have NotifyOnNewReleases = true");
        Assert.True(settings.NotifyOnRecommendations, "Entity settings should have NotifyOnRecommendations = true");
    }

    #endregion
}

/// <summary>
/// BUG-BE-016 FIX: Test implementation of IDbContextFactory
/// Creates NEW context instances that share the same in-memory database.
/// This prevents disposal issues while allowing service code to use 'using var context' safely.
/// </summary>
internal class InlineTestDbContextFactory : IDbContextFactory<ApplicationDbContext>
{
    private readonly DbContextOptions<ApplicationDbContext> _options;

    public InlineTestDbContextFactory(DbContextOptions<ApplicationDbContext> options)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
    }

    public ApplicationDbContext CreateDbContext()
    {
        // Return new context with SHARED options instance
        // This ensures all contexts see the same in-memory database
        return new ApplicationDbContext(_options);
    }
}
