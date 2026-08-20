using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Moq;

namespace GeoLeap.Api.Tests.Services;

public class WatchlistServiceTests : IAsyncLifetime
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IDistributedCache> _mockCache;
    private readonly Mock<ILogger<WatchlistService>> _mockLogger;
    private readonly Mock<IWatchlistNotificationService> _mockNotificationService;
    private readonly Mock<IWatchlistAvailabilityService> _mockAvailabilityService;
    private readonly Mock<IBackgroundJobClient> _mockBackgroundJobClient;
    private readonly WatchlistService _service;
    private readonly Guid _testUserId;
    private readonly Guid _otherUserId;

    public WatchlistServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"WatchlistServiceTests_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
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

        _testUserId = Guid.NewGuid();
        _otherUserId = Guid.NewGuid();

        // Setup cache to always return null (cache miss)
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);
    }

    public async Task InitializeAsync()
    {
        // Seed test data
        var testUser = new User
        {
            Id = _testUserId,
            Email = "test@example.com",
            UserName = "testuser",
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };

        var otherUser = new User
        {
            Id = _otherUserId,
            Email = "other@example.com",
            UserName = "otheruser",
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.AddRange(testUser, otherUser);
        await _context.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        await _context.Database.EnsureDeletedAsync();
        await _context.DisposeAsync();
    }

    [Fact]
    public async Task CreateWatchlistAsync_ValidData_CreatesWatchlist()
    {
        // Arrange
        var createDto = new CreateWatchlistDto
        {
            Name = "My Movies",
            Description = "Movies to watch",
            IsPublic = false,
            IsDefault = false
        };

        // Act
        var result = await _service.CreateWatchlistAsync(_testUserId, createDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("My Movies", result.Name);
        Assert.Equal("Movies to watch", result.Description);
        Assert.False(result.IsPublic);
        Assert.Equal(_testUserId, result.UserId);

        // Verify it was saved to database
        var dbWatchlist = await _context.Watchlists.FirstOrDefaultAsync(w => w.Id == result.Id);
        Assert.NotNull(dbWatchlist);
        Assert.Equal("My Movies", dbWatchlist.Name);
    }

    [Fact(Skip = "ExecuteUpdateAsync not supported by in-memory database - requires integration test with real DB")]
    public async Task CreateWatchlistAsync_IsDefault_UpdatesOtherDefaults()
    {
        // Arrange - Create existing default watchlist
        var existingDefault = new Watchlist
        {
            Id = Guid.NewGuid(),
            Name = "Old Default",
            UserId = _testUserId,
            IsDefault = true
        };
        _context.Watchlists.Add(existingDefault);
        await _context.SaveChangesAsync();

        var createDto = new CreateWatchlistDto
        {
            Name = "New Default",
            IsDefault = true
        };

        // Act
        var result = await _service.CreateWatchlistAsync(_testUserId, createDto);

        // Assert
        Assert.True(result.IsDefault);

        // Verify old default was updated
        await _context.Entry(existingDefault).ReloadAsync();
        Assert.False(existingDefault.IsDefault);
    }

    [Fact]
    public async Task CreateWatchlistAsync_InvalidCategoryId_ThrowsException()
    {
        // Arrange
        var createDto = new CreateWatchlistDto
        {
            Name = "Test Watchlist",
            CategoryId = Guid.NewGuid() // Non-existent category
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.CreateWatchlistAsync(_testUserId, createDto));
    }

    [Fact]
    public async Task CreateWatchlistAsync_ValidCategoryId_CreatesWithCategory()
    {
        // Arrange - Create category first
        var category = new WatchlistCategory
        {
            Id = Guid.NewGuid(),
            Name = "Action Movies",
            UserId = _testUserId
        };
        _context.WatchlistCategories.Add(category);
        await _context.SaveChangesAsync();

        var createDto = new CreateWatchlistDto
        {
            Name = "Action Watchlist",
            CategoryId = category.Id
        };

        // Act
        var result = await _service.CreateWatchlistAsync(_testUserId, createDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(category.Id, result.Category?.Id);
    }

    [Fact]
    public async Task GetWatchlistAsync_ExistingWatchlist_ReturnsDetails()
    {
        // Arrange
        var watchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            Name = "My Watchlist",
            Description = "Test Description",
            UserId = _testUserId
        };
        _context.Watchlists.Add(watchlist);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetWatchlistAsync(watchlist.Id, _testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(watchlist.Id, result.Id);
        Assert.Equal("My Watchlist", result.Name);
        Assert.Equal("Test Description", result.Description);
    }

    [Fact]
    public async Task GetWatchlistAsync_NonExistent_ReturnsNull()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.GetWatchlistAsync(nonExistentId, _testUserId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserWatchlistsAsync_ReturnsOwnedWatchlists()
    {
        // Arrange - Create multiple watchlists
        var watchlist1 = new Watchlist
        {
            Id = Guid.NewGuid(),
            Name = "Watchlist 1",
            UserId = _testUserId,
            IsDefault = true
        };
        var watchlist2 = new Watchlist
        {
            Id = Guid.NewGuid(),
            Name = "Watchlist 2",
            UserId = _testUserId,
            IsFavorite = true
        };
        var otherUserWatchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            Name = "Other Watchlist",
            UserId = _otherUserId
        };

        _context.Watchlists.AddRange(watchlist1, watchlist2, otherUserWatchlist);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserWatchlistsAsync(_testUserId, includeShared: false);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, w => w.Name == "Watchlist 1");
        Assert.Contains(result, w => w.Name == "Watchlist 2");
        Assert.DoesNotContain(result, w => w.Name == "Other Watchlist");
    }

    [Fact]
    public async Task UpdateWatchlistAsync_ValidData_UpdatesWatchlist()
    {
        // Arrange
        var watchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            Name = "Original Name",
            Description = "Original Description",
            UserId = _testUserId
        };
        _context.Watchlists.Add(watchlist);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateWatchlistDto
        {
            Name = "Updated Name",
            Description = "Updated Description"
        };

        // Act
        var result = await _service.UpdateWatchlistAsync(watchlist.Id, _testUserId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated Name", result.Name);
        Assert.Equal("Updated Description", result.Description);

        // Verify database was updated
        await _context.Entry(watchlist).ReloadAsync();
        Assert.Equal("Updated Name", watchlist.Name);
        Assert.Equal("Updated Description", watchlist.Description);
    }

    [Fact]
    public async Task DeleteWatchlistAsync_ExistingWatchlist_DeletesSuccessfully()
    {
        // Arrange
        var watchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            Name = "To Delete",
            UserId = _testUserId
        };
        _context.Watchlists.Add(watchlist);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DeleteWatchlistAsync(watchlist.Id, _testUserId);

        // Assert
        Assert.True(result);

        // Verify it was deleted
        var dbWatchlist = await _context.Watchlists.FindAsync(watchlist.Id);
        Assert.Null(dbWatchlist);
    }

    [Fact(Skip = "Requires Hangfire initialization for background jobs - requires integration test")]
    public async Task AddItemToWatchlistAsync_ValidData_AddsItem()
    {
        // Arrange
        var watchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            Name = "My Watchlist",
            UserId = _testUserId
        };
        _context.Watchlists.Add(watchlist);
        await _context.SaveChangesAsync();

        var addItemDto = new AddWatchlistItemDto
        {
            ContentId = "12345",
            ContentType = "movie",
            Title = "Test Movie",
            PosterUrl = "/poster.jpg",
            ReleaseYear = 2024
        };

        // Act
        var result = await _service.AddItemToWatchlistAsync(watchlist.Id, _testUserId, addItemDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("12345", result.ContentId);
        Assert.Equal("movie", result.ContentType);
        Assert.Equal("Test Movie", result.Title);

        // Verify it was saved
        var dbItem = await _context.WatchlistItems
            .FirstOrDefaultAsync(i => i.WatchlistId == watchlist.Id && i.ContentId == "12345");
        Assert.NotNull(dbItem);
    }

    [Fact]
    public async Task RemoveItemFromWatchlistAsync_ExistingItem_RemovesSuccessfully()
    {
        // Arrange
        var watchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            Name = "My Watchlist",
            UserId = _testUserId
        };
        var item = new WatchlistItem
        {
            Id = Guid.NewGuid(),
            WatchlistId = watchlist.Id,
            ContentId = "12345",
            ContentType = "movie",
            Title = "Test Movie",
            AddedBy = _testUserId
        };
        _context.Watchlists.Add(watchlist);
        _context.WatchlistItems.Add(item);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.RemoveItemFromWatchlistAsync(item.Id, _testUserId);

        // Assert
        Assert.True(result);

        // Verify it was removed
        var dbItem = await _context.WatchlistItems.FindAsync(item.Id);
        Assert.Null(dbItem);
    }

    [Fact]
    public async Task GetWatchlistItemsAsync_ReturnsAllItems()
    {
        // Arrange
        var watchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            Name = "My Watchlist",
            UserId = _testUserId
        };
        var item1 = new WatchlistItem
        {
            Id = Guid.NewGuid(),
            WatchlistId = watchlist.Id,
            ContentId = "12345",
            ContentType = "movie",
            Title = "Movie 1",
            AddedBy = _testUserId
        };
        var item2 = new WatchlistItem
        {
            Id = Guid.NewGuid(),
            WatchlistId = watchlist.Id,
            ContentId = "67890",
            ContentType = "tv",
            Title = "TV Show 1",
            AddedBy = _testUserId
        };

        _context.Watchlists.Add(watchlist);
        _context.WatchlistItems.AddRange(item1, item2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetWatchlistItemsAsync(watchlist.Id, _testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, i => i.ContentId == "12345");
        Assert.Contains(result, i => i.ContentId == "67890");
    }

    [Fact]
    public async Task CreateCategoryAsync_ValidData_CreatesCategory()
    {
        // Arrange
        var createDto = new CreateWatchlistCategoryDto
        {
            Name = "Action Movies",
            Description = "All action movies"
        };

        // Act
        var result = await _service.CreateCategoryAsync(_testUserId, createDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Action Movies", result.Name);
        Assert.Equal("All action movies", result.Description);
        Assert.Equal(_testUserId, result.UserId);

        // Verify it was saved
        var dbCategory = await _context.WatchlistCategories
            .FirstOrDefaultAsync(c => c.Id == result.Id);
        Assert.NotNull(dbCategory);
    }

    [Fact]
    public async Task GetUserCategoriesAsync_ReturnsUserCategories()
    {
        // Arrange
        var category1 = new WatchlistCategory
        {
            Id = Guid.NewGuid(),
            Name = "Category 1",
            UserId = _testUserId
        };
        var category2 = new WatchlistCategory
        {
            Id = Guid.NewGuid(),
            Name = "Category 2",
            UserId = _testUserId
        };
        var otherUserCategory = new WatchlistCategory
        {
            Id = Guid.NewGuid(),
            Name = "Other Category",
            UserId = _otherUserId
        };

        _context.WatchlistCategories.AddRange(category1, category2, otherUserCategory);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserCategoriesAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, c => c.Name == "Category 1");
        Assert.Contains(result, c => c.Name == "Category 2");
        Assert.DoesNotContain(result, c => c.Name == "Other Category");
    }

    [Fact]
    public async Task DeleteCategoryAsync_ExistingCategory_DeletesSuccessfully()
    {
        // Arrange
        var category = new WatchlistCategory
        {
            Id = Guid.NewGuid(),
            Name = "To Delete",
            UserId = _testUserId
        };
        _context.WatchlistCategories.Add(category);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DeleteCategoryAsync(category.Id, _testUserId);

        // Assert
        Assert.True(result);

        // Verify it was deleted
        var dbCategory = await _context.WatchlistCategories.FindAsync(category.Id);
        Assert.Null(dbCategory);
    }
}
