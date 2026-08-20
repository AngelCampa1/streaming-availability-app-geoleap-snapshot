using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Distributed;
using Hangfire;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for WatchlistService - Phase 3.4
/// Tests watchlist CRUD, item management, categories, sharing, and analytics
/// Coverage: Core operations, caching, permissions, constraints
/// </summary>
public class WatchlistServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly WatchlistService _service;
    private readonly Mock<IDistributedCache> _mockCache;
    private readonly Mock<ILogger<WatchlistService>> _mockLogger;
    private readonly Mock<IWatchlistNotificationService> _mockNotificationService;
    private readonly Mock<IWatchlistAvailabilityService> _mockAvailabilityService;
    private readonly Mock<IBackgroundJobClient> _mockBackgroundJobClient;

    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testWatchlistId = Guid.NewGuid();
    private readonly Guid _testCategoryId = Guid.NewGuid();

    public WatchlistServiceDirectTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"WatchlistServiceTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);

        // Setup mocks
        _mockCache = new Mock<IDistributedCache>();
        _mockLogger = new Mock<ILogger<WatchlistService>>();
        _mockNotificationService = new Mock<IWatchlistNotificationService>();
        _mockAvailabilityService = new Mock<IWatchlistAvailabilityService>();
        _mockBackgroundJobClient = new Mock<IBackgroundJobClient>();

        _service = new WatchlistService(
            _context,
            _mockCache.Object,
            _mockLogger.Object,
            _mockNotificationService.Object,
            _mockAvailabilityService.Object,
            _mockBackgroundJobClient.Object
        );

        // Seed test data
        SeedTestData().Wait();
    }

    private async Task SeedTestData()
    {
        // Seed test user
        var testUser = new User
        {
            Id = _testUserId,
            UserName = "testuser@example.com",
            Email = "testuser@example.com",
            EmailConfirmed = true,
            DisplayName = "Test User"
        };
        _context.Users.Add(testUser);

        // Seed test category
        var category = new WatchlistCategory
        {
            Id = _testCategoryId,
            UserId = _testUserId,
            Name = "Action Movies",
            Color = "#FF0000",
            Icon = "fire",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.WatchlistCategories.Add(category);

        // Seed test watchlist
        var watchlist = new Watchlist
        {
            Id = _testWatchlistId,
            UserId = _testUserId,
            Name = "My Favorites",
            Description = "Test watchlist",
            CategoryId = _testCategoryId,
            IsPublic = false,
            IsDefault = true,
            IsFavorite = true,
            SortOrder = "DateAdded",
            SortDirection = "DESC",
            CreatedBy = _testUserId,
            UpdatedBy = _testUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Watchlists.Add(watchlist);

        await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context?.Database.EnsureDeleted();
        _context?.Dispose();
    }

    // ============================================
    // Watchlist CRUD Tests (6 tests)
    // ============================================

    #region Watchlist CRUD

    [Fact]
    public async Task CreateWatchlistAsync_WithValidData_CreatesWatchlist()
    {
        // Arrange
        var dto = new CreateWatchlistDto
        {
            Name = "New Watchlist",
            Description = "A new test watchlist",
            CategoryId = _testCategoryId,
            IsPublic = true,
            IsDefault = false,
            IsFavorite = false
        };

        // Act
        var result = await _service.CreateWatchlistAsync(_testUserId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("New Watchlist", result.Name);
        Assert.Equal("A new test watchlist", result.Description);
        Assert.True(result.IsPublic);
        Assert.Equal(_testUserId, result.UserId);
    }

    [Fact]
    public async Task CreateWatchlistAsync_WithInvalidCategory_ThrowsArgumentException()
    {
        // Arrange
        var dto = new CreateWatchlistDto
        {
            Name = "Invalid Category Watchlist",
            CategoryId = Guid.NewGuid() // Non-existent category
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.CreateWatchlistAsync(_testUserId, dto));
    }

    [Fact]
    public async Task GetWatchlistAsync_WithValidId_ReturnsWatchlist()
    {
        // Arrange
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null); // No cache

        // Act
        var result = await _service.GetWatchlistAsync(_testWatchlistId, _testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testWatchlistId, result.Id);
        Assert.Equal("My Favorites", result.Name);
        Assert.True(result.IsDefault);
    }

    [Fact]
    public async Task GetWatchlistAsync_WithWrongUserId_ReturnsNull()
    {
        // Arrange
        var wrongUserId = Guid.NewGuid();
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.GetWatchlistAsync(_testWatchlistId, wrongUserId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateWatchlistAsync_WithValidData_UpdatesWatchlist()
    {
        // Arrange
        var dto = new UpdateWatchlistDto
        {
            Name = "Updated Favorites",
            Description = "Updated description",
            IsPublic = true
        };

        // Act
        var result = await _service.UpdateWatchlistAsync(_testWatchlistId, _testUserId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated Favorites", result.Name);
        Assert.Equal("Updated description", result.Description);
        Assert.True(result.IsPublic);
    }

    [Fact]
    public async Task DeleteWatchlistAsync_WithOnlyDefaultWatchlist_ThrowsInvalidOperationException()
    {
        // Arrange - _testWatchlistId is the only watchlist and it's default

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.DeleteWatchlistAsync(_testWatchlistId, _testUserId));
    }

    #endregion

    // ============================================
    // Item Management Tests (6 tests)
    // ============================================

    #region Item Management

    [Fact]
    public async Task AddItemToWatchlistAsync_WithValidData_AddsItem()
    {
        // Arrange
        var dto = new AddWatchlistItemDto
        {
            ContentType = "Movie",
            ContentId = "12345",
            Title = "Inception",
            Overview = "A mind-bending thriller",
            Rating = 8.8m,
            ReleaseYear = 2010,
            Status = "plan_to_watch",
            Priority = 5
        };

        // Act
        var result = await _service.AddItemToWatchlistAsync(_testWatchlistId, _testUserId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Inception", result.Title);
        Assert.Equal("Movie", result.ContentType);
        Assert.Equal(_testWatchlistId, result.WatchlistId);
    }

    [Fact]
    public async Task AddItemToWatchlistAsync_WithDuplicateItem_ThrowsInvalidOperationException()
    {
        // Arrange - Add item first time
        var dto = new AddWatchlistItemDto
        {
            ContentType = "Movie",
            ContentId = "99999",
            Title = "Test Movie"
        };
        await _service.AddItemToWatchlistAsync(_testWatchlistId, _testUserId, dto);

        // Act & Assert - Try to add same item again
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.AddItemToWatchlistAsync(_testWatchlistId, _testUserId, dto));
    }

    [Fact]
    public async Task UpdateWatchlistItemAsync_WithValidData_UpdatesItem()
    {
        // Arrange - Add item first
        var addDto = new AddWatchlistItemDto
        {
            ContentType = "Movie",
            ContentId = "54321",
            Title = "The Matrix"
        };
        var addedItem = await _service.AddItemToWatchlistAsync(_testWatchlistId, _testUserId, addDto);

        var updateDto = new UpdateWatchlistItemDto
        {
            Status = "watched",
            IsWatched = true,
            UserRating = 9
        };

        // Act
        var result = await _service.UpdateWatchlistItemAsync(addedItem.Id, _testUserId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("watched", result.Status);
        Assert.True(result.IsWatched);
        Assert.Equal(9, result.UserRating);
    }

    [Fact]
    public async Task RemoveItemFromWatchlistAsync_WithValidId_RemovesItem()
    {
        // Arrange - Add item first
        var dto = new AddWatchlistItemDto
        {
            ContentType = "Movie",
            ContentId = "11111",
            Title = "Interstellar"
        };
        var addedItem = await _service.AddItemToWatchlistAsync(_testWatchlistId, _testUserId, dto);

        // Act
        var result = await _service.RemoveItemFromWatchlistAsync(addedItem.Id, _testUserId);

        // Assert
        Assert.True(result);

        // Verify item is removed from database
        var item = await _context.WatchlistItems.FindAsync(addedItem.Id);
        Assert.Null(item);
    }

    [Fact]
    public async Task MoveItemToWatchlistAsync_WithValidTarget_MovesItem()
    {
        // Arrange - Create target watchlist
        var targetWatchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Name = "Target Watchlist",
            IsDefault = false,
            CreatedBy = _testUserId,
            UpdatedBy = _testUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Watchlists.Add(targetWatchlist);
        await _context.SaveChangesAsync();

        // Add item to source watchlist
        var dto = new AddWatchlistItemDto
        {
            ContentType = "Movie",
            ContentId = "22222",
            Title = "The Godfather"
        };
        var addedItem = await _service.AddItemToWatchlistAsync(_testWatchlistId, _testUserId, dto);

        // Act
        var result = await _service.MoveItemToWatchlistAsync(addedItem.Id, targetWatchlist.Id, _testUserId);

        // Assert
        Assert.True(result);

        // Verify item moved
        var movedItem = await _context.WatchlistItems.FindAsync(addedItem.Id);
        Assert.NotNull(movedItem);
        Assert.Equal(targetWatchlist.Id, movedItem.WatchlistId);
    }

    [Fact]
    public async Task GetWatchlistItemsAsync_WithItems_ReturnsPagedItems()
    {
        // Arrange - Add multiple items
        for (int i = 0; i < 5; i++)
        {
            var dto = new AddWatchlistItemDto
            {
                ContentType = "Movie",
                ContentId = $"test-{i}",
                Title = $"Test Movie {i}"
            };
            await _service.AddItemToWatchlistAsync(_testWatchlistId, _testUserId, dto);
        }

        // Act
        var result = await _service.GetWatchlistItemsAsync(_testWatchlistId, _testUserId, page: 1, pageSize: 3);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(3, result.Count);
    }

    #endregion

    // ============================================
    // Category Management Tests (3 tests)
    // ============================================

    #region Category Management

    [Fact]
    public async Task CreateCategoryAsync_WithValidData_CreatesCategory()
    {
        // Arrange
        var dto = new CreateWatchlistCategoryDto
        {
            Name = "Comedy Movies",
            Description = "Funny movies",
            Color = "#00FF00",
            Icon = "smile"
        };

        // Act
        var result = await _service.CreateCategoryAsync(_testUserId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Comedy Movies", result.Name);
        Assert.Equal("#00FF00", result.Color);
        Assert.Equal("smile", result.Icon);
    }

    [Fact]
    public async Task GetUserCategoriesAsync_WithCategories_ReturnsCategories()
    {
        // Act
        var result = await _service.GetUserCategoriesAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result); // Only the seeded category
        Assert.Equal("Action Movies", result[0].Name);
    }

    [Fact]
    public async Task DeleteCategoryAsync_WithNoWatchlists_HardDeletes()
    {
        // Arrange - Create category with no watchlists
        var dto = new CreateWatchlistCategoryDto
        {
            Name = "Drama Movies",
            Color = "#0000FF"
        };
        var category = await _service.CreateCategoryAsync(_testUserId, dto);

        // Act
        var result = await _service.DeleteCategoryAsync(category.Id, _testUserId);

        // Assert
        Assert.True(result);

        // Verify hard deleted
        var deletedCategory = await _context.WatchlistCategories.FindAsync(category.Id);
        Assert.Null(deletedCategory);
    }

    #endregion

    // ============================================
    // Sharing Tests (4 tests)
    // ============================================

    #region Sharing

    [Fact]
    public async Task ShareWatchlistAsync_WithValidData_CreatesShare()
    {
        // Arrange
        var sharedUser = new User
        {
            Id = Guid.NewGuid(),
            UserName = "shared@example.com",
            Email = "shared@example.com",
            EmailConfirmed = true
        };
        _context.Users.Add(sharedUser);
        await _context.SaveChangesAsync();

        var dto = new ShareWatchlistDto
        {
            SharedWithUserId = sharedUser.Id,
            SharedWithEmail = sharedUser.Email,
            PermissionLevel = "view"
        };

        // Act
        var result = await _service.ShareWatchlistAsync(_testWatchlistId, _testUserId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testWatchlistId, result.WatchlistId);
        Assert.Equal(sharedUser.Id, result.SharedWithUserId);
        Assert.Equal("view", result.PermissionLevel);
        Assert.NotNull(result.ShareToken);
    }

    [Fact]
    public async Task RevokeWatchlistShareAsync_WithValidShare_RevokesShare()
    {
        // Arrange - Create share first
        var sharedUser = new User
        {
            Id = Guid.NewGuid(),
            UserName = "revoke@example.com",
            Email = "revoke@example.com",
            EmailConfirmed = true
        };
        _context.Users.Add(sharedUser);
        await _context.SaveChangesAsync();

        var dto = new ShareWatchlistDto
        {
            SharedWithUserId = sharedUser.Id,
            PermissionLevel = "view"
        };
        var share = await _service.ShareWatchlistAsync(_testWatchlistId, _testUserId, dto);

        // Act
        var result = await _service.RevokeWatchlistShareAsync(share.Id, _testUserId);

        // Assert
        Assert.True(result);

        // Verify share is inactive
        var revokedShare = await _context.WatchlistShares.FindAsync(share.Id);
        Assert.NotNull(revokedShare);
        Assert.False(revokedShare.IsActive);
    }

    [Fact]
    public async Task GetSharedWatchlistAsync_WithValidToken_ReturnsWatchlist()
    {
        // Arrange - Create share first
        var sharedUser = new User
        {
            Id = Guid.NewGuid(),
            UserName = "getshared@example.com",
            Email = "getshared@example.com",
            EmailConfirmed = true
        };
        _context.Users.Add(sharedUser);
        await _context.SaveChangesAsync();

        var dto = new ShareWatchlistDto
        {
            SharedWithUserId = sharedUser.Id,
            PermissionLevel = "view"
        };
        var share = await _service.ShareWatchlistAsync(_testWatchlistId, _testUserId, dto);

        // Act
        var result = await _service.GetSharedWatchlistAsync(share.ShareToken!);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testWatchlistId, result.Id);
        Assert.Equal("My Favorites", result.Name);
        Assert.False(result.CanEdit); // View permission
    }

    [Fact]
    public async Task AcceptWatchlistShareAsync_WithValidShare_AcceptsShare()
    {
        // Arrange - Create share first
        var acceptingUser = new User
        {
            Id = Guid.NewGuid(),
            UserName = "accept@example.com",
            Email = "accept@example.com",
            EmailConfirmed = true
        };
        _context.Users.Add(acceptingUser);
        await _context.SaveChangesAsync();

        var dto = new ShareWatchlistDto
        {
            SharedWithEmail = acceptingUser.Email,
            PermissionLevel = "view"
        };
        var share = await _service.ShareWatchlistAsync(_testWatchlistId, _testUserId, dto);

        // Act
        var result = await _service.AcceptWatchlistShareAsync(share.Id, acceptingUser.Id);

        // Assert
        Assert.True(result);

        // Verify share is accepted
        var acceptedShare = await _context.WatchlistShares.FindAsync(share.Id);
        Assert.NotNull(acceptedShare);
        Assert.NotNull(acceptedShare.AcceptedAt);
        Assert.Equal(acceptingUser.Id, acceptedShare.SharedWithUserId);
    }

    #endregion

    // ============================================
    // Analytics & Search Tests (3 tests)
    // ============================================

    #region Analytics & Search

    [Fact]
    public async Task GetUserAnalyticsAsync_WithData_ReturnsAnalytics()
    {
        // Arrange - Add some items
        for (int i = 0; i < 3; i++)
        {
            var dto = new AddWatchlistItemDto
            {
                ContentType = "Movie",
                ContentId = $"analytics-{i}",
                Title = $"Analytics Movie {i}",
                Status = i == 0 ? "watched" : "plan_to_watch"
            };
            await _service.AddItemToWatchlistAsync(_testWatchlistId, _testUserId, dto);
        }

        // Act
        var result = await _service.GetUserAnalyticsAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(1, result.TotalWatchlists);
        Assert.Equal(3, result.TotalItems);
        Assert.True(result.ItemsByStatus.ContainsKey("watched"));
        Assert.True(result.ItemsByStatus.ContainsKey("plan_to_watch"));
    }

    [Fact]
    public async Task SearchWatchlistsAsync_WithQuery_ReturnsMatchingWatchlists()
    {
        // Arrange - Create another watchlist with searchable name
        var dto = new CreateWatchlistDto
        {
            Name = "Science Fiction Collection",
            Description = "Sci-fi movies"
        };
        await _service.CreateWatchlistAsync(_testUserId, dto);

        // Act
        var result = await _service.SearchWatchlistsAsync(_testUserId, "Fiction");

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Contains("Fiction", result[0].Name);
    }

    [Fact]
    public async Task SearchWatchlistItemsAsync_WithQuery_ReturnsMatchingItems()
    {
        // Arrange - Add items with searchable titles
        var dto1 = new AddWatchlistItemDto
        {
            ContentType = "Movie",
            ContentId = "search-1",
            Title = "The Dark Knight"
        };
        var dto2 = new AddWatchlistItemDto
        {
            ContentType = "Movie",
            ContentId = "search-2",
            Title = "The Matrix"
        };
        await _service.AddItemToWatchlistAsync(_testWatchlistId, _testUserId, dto1);
        await _service.AddItemToWatchlistAsync(_testWatchlistId, _testUserId, dto2);

        // Act
        var result = await _service.SearchWatchlistItemsAsync(_testWatchlistId, _testUserId, "Dark");

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Contains("Dark", result[0].Title);
    }

    #endregion

    // ============================================
    // Notification Settings Tests (2 tests)
    // ============================================

    #region Notification Settings

    [Fact]
    public async Task GetNotificationSettingsAsync_WithNoSettings_ReturnsDefaults()
    {
        // Act
        var result = await _service.GetNotificationSettingsAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.GloballyEnabled);
        Assert.True(result.NotifyOnAvailabilityChange);
        Assert.True(result.EnableEmailNotifications);
        Assert.Equal(6.0m, result.MinimumRating);
    }

    [Fact]
    public async Task UpdateNotificationSettingsAsync_WithValidData_UpdatesSettings()
    {
        // Arrange
        var dto = new WatchlistNotificationSettingsDto
        {
            GloballyEnabled = false,
            NotifyOnAvailabilityChange = false,
            NotifyOnPriceDrops = true,
            EnableEmailNotifications = false,
            EnablePushNotifications = true,
            MinimumRating = 7.5m,
            MaxNotificationsPerDay = 5
        };

        // Act
        var result = await _service.UpdateNotificationSettingsAsync(_testUserId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.GloballyEnabled);
        Assert.False(result.NotifyOnAvailabilityChange);
        Assert.True(result.NotifyOnPriceDrops);
        Assert.False(result.EnableEmailNotifications);
        Assert.True(result.EnablePushNotifications);
        Assert.Equal(7.5m, result.MinimumRating);
        Assert.Equal(5, result.MaxNotificationsPerDay);

        // Verify saved to database
        var savedSettings = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.NotNull(savedSettings);
        Assert.False(savedSettings.GloballyEnabled);
    }

    #endregion
}
