using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using GeoLeap.Api.Data;
using GeoLeap.Api.Services;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Tests for PreferenceService initialization/seeding (B6/B7 wiring).
/// Verifies that SeedDefaultPreferencesAsync is idempotent and creates
/// the expected default categories.
/// </summary>
public class PreferenceServiceInitTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly PreferenceService _service;

    public PreferenceServiceInitTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);
        var mockLogger = new Mock<ILogger<PreferenceService>>();
        _service = new PreferenceService(_context, mockLogger.Object);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task SeedDefaultPreferencesAsync_CreatesExpectedCategories()
    {
        // Act
        await _service.SeedDefaultPreferencesAsync();

        // Assert — at least the standard categories are present
        var categories = await _context.PreferenceCategories.ToListAsync();
        Assert.NotEmpty(categories);
        Assert.Contains(categories, c => c.CategoryKey == "ui");
        Assert.Contains(categories, c => c.CategoryKey == "notifications");
        Assert.Contains(categories, c => c.CategoryKey == "privacy");
    }

    [Fact]
    public async Task SeedDefaultPreferencesAsync_IsIdempotent_DoesNotDuplicate()
    {
        // Act — call twice
        await _service.SeedDefaultPreferencesAsync();
        await _service.SeedDefaultPreferencesAsync();

        // Assert — categories appear exactly once (no duplicates)
        var uiCategories = await _context.PreferenceCategories
            .Where(c => c.CategoryKey == "ui")
            .ToListAsync();

        Assert.Single(uiCategories);
    }

    [Fact]
    public async Task SeedDefaultPreferencesAsync_CreatesDefaultPreferences()
    {
        // Act
        await _service.SeedDefaultPreferencesAsync();

        // Assert — default preferences (theme, language, etc.) are seeded
        var defaults = await _context.DefaultPreferences.ToListAsync();
        Assert.NotEmpty(defaults);
        Assert.Contains(defaults, d => d.PreferenceKey == "theme");
        Assert.Contains(defaults, d => d.PreferenceKey == "language");
    }
}
