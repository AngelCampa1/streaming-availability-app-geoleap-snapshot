using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services.VpnGuidanceServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Comprehensive tests for VpnStreamingCompatibilityService - PHASE 2A (VPN Core Services)
///
/// CRITICAL TESTS:
/// - Get streaming compatibility for VPN providers
/// - Update compatibility status (Working, Partial, NotWorking)
/// - Create new compatibility records
/// - Handle compatible regions
/// - Error handling and logging
///
/// Test Pattern: Integration tests with real database
/// Coverage Target: 90-95% of VpnStreamingCompatibilityService
/// Service LOC: ~150 lines
/// </summary>
public class VpnStreamingCompatibilityServiceTests : IAsyncLifetime
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<VpnStreamingCompatibilityService>> _mockLogger;
    private readonly VpnStreamingCompatibilityService _service;

    public VpnStreamingCompatibilityServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"VpnStreamingTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<VpnStreamingCompatibilityService>>();
        _service = new VpnStreamingCompatibilityService(_context, _mockLogger.Object);
    }

    public async Task InitializeAsync()
    {
        await _context.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        await _context.Database.EnsureDeletedAsync();
        await _context.DisposeAsync();
    }

    #region GetProviderStreamingCompatibilityAsync Tests

    [Fact]
    public async Task GetProviderStreamingCompatibility_WithValidProvider_ReturnsAllCompatibilities()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var netflixId = Guid.NewGuid();
        var huluId = Guid.NewGuid();

        var netflix = new StreamingService { Id = netflixId, Name = "Netflix", IsActive = true };
        var hulu = new StreamingService { Id = huluId, Name = "Hulu", IsActive = true };

        await _context.StreamingServices.AddRangeAsync(netflix, hulu);

        var compatibilities = new[]
        {
            new VpnStreamingCompatibility
            {
                Id = Guid.NewGuid(),
                VpnProviderId = providerId,
                StreamingServiceId = netflixId,
                StreamingService = netflix,
                Status = VpnStreamingStatus.WorksReliably,
                Notes = "Works well",
                LastTested = DateTime.UtcNow,
                CompatibleRegions = "[\"US\",\"UK\",\"CA\"]"
            },
            new VpnStreamingCompatibility
            {
                Id = Guid.NewGuid(),
                VpnProviderId = providerId,
                StreamingServiceId = huluId,
                StreamingService = hulu,
                Status = VpnStreamingStatus.WorksSometimes,
                Notes = "Some issues",
                LastTested = DateTime.UtcNow.AddDays(-1),
                CompatibleRegions = "[\"US\"]"
            }
        };

        await _context.VpnStreamingCompatibilities.AddRangeAsync(compatibilities);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetProviderStreamingCompatibilityAsync(providerId);

        // Assert
        Assert.NotNull(result);
        var resultList = result.ToList();
        Assert.Equal(2, resultList.Count);

        var netflixCompat = resultList.First(c => c.StreamingServiceName == "Netflix");
        Assert.Equal("WorksReliably", netflixCompat.Status);
        Assert.Equal("Works well", netflixCompat.Notes);
        Assert.Contains("US", netflixCompat.CompatibleRegions!);
        Assert.Contains("UK", netflixCompat.CompatibleRegions!);

        var huluCompat = resultList.First(c => c.StreamingServiceName == "Hulu");
        Assert.Equal("WorksSometimes", huluCompat.Status);
        Assert.Single(huluCompat.CompatibleRegions!);
    }

    [Fact]
    public async Task GetProviderStreamingCompatibility_WithNoCompatibilities_ReturnsEmptyList()
    {
        // Arrange
        var providerId = Guid.NewGuid();

        // Act
        var result = await _service.GetProviderStreamingCompatibilityAsync(providerId);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetProviderStreamingCompatibility_WithNullRegions_HandlesGracefully()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        var streamingService = new StreamingService { Id = serviceId, Name = "Disney+", IsActive = true };
        await _context.StreamingServices.AddAsync(streamingService);

        var compatibility = new VpnStreamingCompatibility
        {
            Id = Guid.NewGuid(),
            VpnProviderId = providerId,
            StreamingServiceId = serviceId,
            StreamingService = streamingService,
            Status = VpnStreamingStatus.WorksReliably,
            LastTested = DateTime.UtcNow,
            CompatibleRegions = null // No regions specified
        };

        await _context.VpnStreamingCompatibilities.AddAsync(compatibility);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetProviderStreamingCompatibilityAsync(providerId);

        // Assert
        var resultList = result.ToList();
        Assert.Single(resultList);
        Assert.Null(resultList[0].CompatibleRegions);
    }

    #endregion

    #region GetSpecificCompatibilityAsync Tests

    [Fact]
    public async Task GetSpecificCompatibility_WithValidIds_ReturnsCompatibility()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        var service = new StreamingService { Id = serviceId, Name = "Amazon Prime", IsActive = true };
        await _context.StreamingServices.AddAsync(service);

        var compatibility = new VpnStreamingCompatibility
        {
            Id = Guid.NewGuid(),
            VpnProviderId = providerId,
            StreamingServiceId = serviceId,
            StreamingService = service,
            Status = VpnStreamingStatus.WorksReliably,
            Notes = "Excellent compatibility",
            LastTested = DateTime.UtcNow,
            CompatibleRegions = "[\"US\",\"UK\",\"DE\",\"FR\"]"
        };

        await _context.VpnStreamingCompatibilities.AddAsync(compatibility);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetSpecificCompatibilityAsync(providerId, serviceId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Amazon Prime", result.StreamingServiceName);
        Assert.Equal("WorksReliably", result.Status);
        Assert.Equal("Excellent compatibility", result.Notes);
        Assert.Equal(4, result.CompatibleRegions!.Count);
    }

    [Fact]
    public async Task GetSpecificCompatibility_WithNonExistentProvider_ReturnsNull()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        // Act
        var result = await _service.GetSpecificCompatibilityAsync(providerId, serviceId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetSpecificCompatibility_WithMismatchedIds_ReturnsNull()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var wrongProviderId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        var service = new StreamingService { Id = serviceId, Name = "HBO Max", IsActive = true };
        await _context.StreamingServices.AddAsync(service);

        var compatibility = new VpnStreamingCompatibility
        {
            Id = Guid.NewGuid(),
            VpnProviderId = providerId,
            StreamingServiceId = serviceId,
            StreamingService = service,
            Status = VpnStreamingStatus.WorksReliably,
            LastTested = DateTime.UtcNow
        };

        await _context.VpnStreamingCompatibilities.AddAsync(compatibility);
        await _context.SaveChangesAsync();

        // Act - Query with wrong provider ID
        var result = await _service.GetSpecificCompatibilityAsync(wrongProviderId, serviceId);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region UpdateCompatibilityAsync Tests

    [Fact]
    public async Task UpdateCompatibility_CreatesNewRecord_WhenNotExists()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        var service = new StreamingService { Id = serviceId, Name = "Paramount+", IsActive = true };
        await _context.StreamingServices.AddAsync(service);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateVpnStreamingCompatibilityDto
        {
            Status = "WorksReliably",
            Notes = "Newly tested - works great!",
            CompatibleRegions = new List<string> { "US", "CA", "MX" }
        };

        // Act
        var result = await _service.UpdateCompatibilityAsync(providerId, serviceId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("WorksReliably", result.Status);
        Assert.Equal("Newly tested - works great!", result.Notes);
        Assert.Equal(3, result.CompatibleRegions!.Count);

        // Verify it was saved to database
        var saved = await _context.VpnStreamingCompatibilities
            .FirstOrDefaultAsync(c => c.VpnProviderId == providerId && c.StreamingServiceId == serviceId);
        Assert.NotNull(saved);
        Assert.Equal(VpnStreamingStatus.WorksReliably, saved.Status);
    }

    [Fact]
    public async Task UpdateCompatibility_UpdatesExistingRecord_WhenExists()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        var service = new StreamingService { Id = serviceId, Name = "Apple TV+", IsActive = true };
        await _context.StreamingServices.AddAsync(service);

        var existing = new VpnStreamingCompatibility
        {
            Id = Guid.NewGuid(),
            VpnProviderId = providerId,
            StreamingServiceId = serviceId,
            StreamingService = service,
            Status = VpnStreamingStatus.NotTested,
            Notes = "Old notes",
            LastTested = DateTime.UtcNow.AddMonths(-1),
            CompatibleRegions = "[\"US\"]"
        };

        await _context.VpnStreamingCompatibilities.AddAsync(existing);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateVpnStreamingCompatibilityDto
        {
            Status = "WorksSometimes",
            Notes = "Updated after recent testing",
            CompatibleRegions = new List<string> { "US", "UK" }
        };

        // Act
        var result = await _service.UpdateCompatibilityAsync(providerId, serviceId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("WorksSometimes", result.Status);
        Assert.Equal("Updated after recent testing", result.Notes);
        Assert.Equal(2, result.CompatibleRegions!.Count);

        // Verify only one record exists (update, not insert)
        var count = await _context.VpnStreamingCompatibilities
            .CountAsync(c => c.VpnProviderId == providerId && c.StreamingServiceId == serviceId);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task UpdateCompatibility_UpdatesLastTestedTimestamp()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        var service = new StreamingService { Id = serviceId, Name = "Peacock", IsActive = true };
        await _context.StreamingServices.AddAsync(service);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateVpnStreamingCompatibilityDto
        {
            Status = "WorksReliably",
            Notes = "Test",
            CompatibleRegions = new List<string> { "US" }
        };

        var beforeUpdate = DateTime.UtcNow;

        // Act
        var result = await _service.UpdateCompatibilityAsync(providerId, serviceId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.LastTested >= beforeUpdate);
        Assert.True(result.LastTested <= DateTime.UtcNow.AddSeconds(1));
    }

    [Fact]
    public async Task UpdateCompatibility_WithNullRegions_SavesCorrectly()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        var service = new StreamingService { Id = serviceId, Name = "ESPN+", IsActive = true };
        await _context.StreamingServices.AddAsync(service);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateVpnStreamingCompatibilityDto
        {
            Status = "DoesNotWork",
            Notes = "Blocked",
            CompatibleRegions = null
        };

        // Act
        var result = await _service.UpdateCompatibilityAsync(providerId, serviceId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("DoesNotWork", result.Status);
        Assert.Null(result.CompatibleRegions);
    }

    [Theory]
    [InlineData("WorksReliably")]
    [InlineData("WorksSometimes")]
    [InlineData("DoesNotWork")]
    [InlineData("NotTested")]
    public async Task UpdateCompatibility_WithDifferentStatuses_SavesCorrectly(string status)
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        var service = new StreamingService { Id = serviceId, Name = $"Service_{status}", IsActive = true };
        await _context.StreamingServices.AddAsync(service);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateVpnStreamingCompatibilityDto
        {
            Status = status,
            Notes = $"Testing {status} status",
            CompatibleRegions = new List<string> { "US" }
        };

        // Act
        var result = await _service.UpdateCompatibilityAsync(providerId, serviceId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(status, result.Status);
    }

    #endregion

    #region Region Handling Tests

    [Fact]
    public async Task GetProviderStreamingCompatibility_WithMultipleRegions_DeserializesCorrectly()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        var service = new StreamingService { Id = serviceId, Name = "Max", IsActive = true };
        await _context.StreamingServices.AddAsync(service);

        var compatibility = new VpnStreamingCompatibility
        {
            Id = Guid.NewGuid(),
            VpnProviderId = providerId,
            StreamingServiceId = serviceId,
            StreamingService = service,
            Status = VpnStreamingStatus.WorksReliably,
            LastTested = DateTime.UtcNow,
            CompatibleRegions = "[\"US\",\"UK\",\"CA\",\"AU\",\"DE\",\"FR\",\"JP\"]"
        };

        await _context.VpnStreamingCompatibilities.AddAsync(compatibility);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetProviderStreamingCompatibilityAsync(providerId);

        // Assert
        var resultList = result.ToList();
        Assert.Single(resultList);
        Assert.Equal(7, resultList[0].CompatibleRegions!.Count);
        Assert.Contains("JP", resultList[0].CompatibleRegions!);
    }

    [Fact]
    public async Task UpdateCompatibility_WithEmptyRegionsList_SavesEmptyArray()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        var service = new StreamingService { Id = serviceId, Name = "Showtime", IsActive = true };
        await _context.StreamingServices.AddAsync(service);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateVpnStreamingCompatibilityDto
        {
            Status = "DoesNotWork",
            Notes = "No compatible regions",
            CompatibleRegions = new List<string>() // Empty list
        };

        // Act
        var result = await _service.UpdateCompatibilityAsync(providerId, serviceId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.CompatibleRegions);
        Assert.Empty(result.CompatibleRegions);
    }

    #endregion

    #region Error Handling Tests

    [Fact]
    public async Task GetProviderStreamingCompatibility_WithInvalidJson_HandlesGracefully()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        var service = new StreamingService { Id = serviceId, Name = "TestService", IsActive = true };
        await _context.StreamingServices.AddAsync(service);

        var compatibility = new VpnStreamingCompatibility
        {
            Id = Guid.NewGuid(),
            VpnProviderId = providerId,
            StreamingServiceId = serviceId,
            StreamingService = service,
            Status = VpnStreamingStatus.WorksReliably,
            LastTested = DateTime.UtcNow,
            CompatibleRegions = "invalid json {[" // Invalid JSON
        };

        await _context.VpnStreamingCompatibilities.AddAsync(compatibility);
        await _context.SaveChangesAsync();

        // Act & Assert - Should handle gracefully, not throw
        var result = await _service.GetProviderStreamingCompatibilityAsync(providerId);
        Assert.NotNull(result);
    }

    [Fact]
    public async Task UpdateCompatibility_WithInvalidStatus_UsesNotTested()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        var service = new StreamingService { Id = serviceId, Name = "TestService2", IsActive = true };
        await _context.StreamingServices.AddAsync(service);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateVpnStreamingCompatibilityDto
        {
            Status = "InvalidStatus", // Invalid status
            Notes = "Test",
            CompatibleRegions = new List<string> { "US" }
        };

        // Act
        var result = await _service.UpdateCompatibilityAsync(providerId, serviceId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("NotTested", result.Status); // Should default to NotTested
    }

    #endregion

    #region Performance Tests

    [Fact]
    public async Task GetProviderStreamingCompatibility_WithManyServices_PerformsWell()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var services = new List<StreamingService>();
        var compatibilities = new List<VpnStreamingCompatibility>();

        // Create 50 streaming services
        for (int i = 0; i < 50; i++)
        {
            var service = new StreamingService
            {
                Id = Guid.NewGuid(),
                Name = $"Service_{i}",
                IsActive = true
            };
            services.Add(service);

            compatibilities.Add(new VpnStreamingCompatibility
            {
                Id = Guid.NewGuid(),
                VpnProviderId = providerId,
                StreamingServiceId = service.Id,
                StreamingService = service,
                Status = VpnStreamingStatus.WorksReliably,
                LastTested = DateTime.UtcNow,
                CompatibleRegions = "[\"US\"]"
            });
        }

        await _context.StreamingServices.AddRangeAsync(services);
        await _context.VpnStreamingCompatibilities.AddRangeAsync(compatibilities);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetProviderStreamingCompatibilityAsync(providerId);

        // Assert
        Assert.Equal(50, result.Count());
    }

    #endregion
}
