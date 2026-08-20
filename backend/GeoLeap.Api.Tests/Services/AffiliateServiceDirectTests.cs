using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Text.Json;

namespace GeoLeap.Api.Tests.Services;

public class AffiliateServiceDirectTests : IAsyncLifetime
{
    private readonly DbContextOptions<ApplicationDbContext> _dbOptions;
    private readonly Mock<ILogger<AffiliateService>> _mockLogger;
    private readonly Mock<IDbContextFactory<ApplicationDbContext>> _mockFactory;
    private readonly AffiliateService _service;

    public AffiliateServiceDirectTests()
    {
        _dbOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"AffiliateTestDb_{Guid.NewGuid()}")
            .Options;

        _mockLogger = new Mock<ILogger<AffiliateService>>();
        _mockFactory = new Mock<IDbContextFactory<ApplicationDbContext>>();
        _mockFactory
            .Setup(f => f.CreateDbContextAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new ApplicationDbContext(_dbOptions));
        _mockFactory
            .Setup(f => f.CreateDbContext())
            .Returns(() => new ApplicationDbContext(_dbOptions));

        _service = new AffiliateService(_mockFactory.Object, _mockLogger.Object);
    }

    public Task InitializeAsync() => Task.CompletedTask;

    public async Task DisposeAsync()
    {
        await _service.DisposeAsync();
        await using var ctx = new ApplicationDbContext(_dbOptions);
        await ctx.Database.EnsureDeletedAsync();
    }

    private ApplicationDbContext CreateContext() => new ApplicationDbContext(_dbOptions);

    // -------------------------------------------------------------------------
    // GetActivePartnersForContextAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetActivePartnersForContextAsync_ReturnsOnlyActivePartners()
    {
        // Arrange
        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.AddRange(
                new AffiliatePartner { Id = Guid.NewGuid(), Name = "Active VPN", AffiliateUrlTemplate = "https://active.com", IsActive = true, Priority = 1 },
                new AffiliatePartner { Id = Guid.NewGuid(), Name = "Inactive VPN", AffiliateUrlTemplate = "https://inactive.com", IsActive = false, Priority = 0 }
            );
            await ctx.SaveChangesAsync();
        }

        // Act
        var result = await _service.GetActivePartnersForContextAsync(null, null);

        // Assert
        Assert.Single(result);
        Assert.Equal("Active VPN", result[0].Name);
    }

    [Fact]
    public async Task GetActivePartnersForContextAsync_SortsByPriorityDescending()
    {
        // Arrange
        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.AddRange(
                new AffiliatePartner { Id = Guid.NewGuid(), Name = "Low Priority", AffiliateUrlTemplate = "https://low.com", IsActive = true, Priority = 1 },
                new AffiliatePartner { Id = Guid.NewGuid(), Name = "High Priority", AffiliateUrlTemplate = "https://high.com", IsActive = true, Priority = 10 },
                new AffiliatePartner { Id = Guid.NewGuid(), Name = "Mid Priority", AffiliateUrlTemplate = "https://mid.com", IsActive = true, Priority = 5 }
            );
            await ctx.SaveChangesAsync();
        }

        // Act
        var result = await _service.GetActivePartnersForContextAsync(null, null);

        // Assert
        Assert.Equal(3, result.Count);
        Assert.Equal("High Priority", result[0].Name);
        Assert.Equal("Mid Priority", result[1].Name);
        Assert.Equal("Low Priority", result[2].Name);
    }

    [Fact]
    public async Task GetActivePartnersForContextAsync_FiltersOutPartnersNotMatchingCountryCode()
    {
        // Arrange
        using (var ctx = CreateContext())
        {
            var usOnlyPartner = new AffiliatePartner
            {
                Id = Guid.NewGuid(),
                Name = "US Only VPN",
                AffiliateUrlTemplate = "https://us.com",
                IsActive = true,
                Priority = 1,
                TargetCountries = JsonSerializer.Serialize(new[] { "US", "CA" })
            };
            var globalPartner = new AffiliatePartner
            {
                Id = Guid.NewGuid(),
                Name = "Global VPN",
                AffiliateUrlTemplate = "https://global.com",
                IsActive = true,
                Priority = 2,
                TargetCountries = null // null = all countries
            };

            ctx.AffiliatePartners.AddRange(usOnlyPartner, globalPartner);
            await ctx.SaveChangesAsync();
        }

        // Act - request for UK
        var result = await _service.GetActivePartnersForContextAsync("UK", null);

        // Assert - US-only partner is filtered out; global partner remains
        Assert.Single(result);
        Assert.Equal("Global VPN", result[0].Name);
    }

    [Fact]
    public async Task GetActivePartnersForContextAsync_ReturnsAllPartnersWhenTargetCountriesIsNull()
    {
        // Arrange
        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.AddRange(
                new AffiliatePartner { Id = Guid.NewGuid(), Name = "Global A", AffiliateUrlTemplate = "https://a.com", IsActive = true, Priority = 1, TargetCountries = null },
                new AffiliatePartner { Id = Guid.NewGuid(), Name = "Global B", AffiliateUrlTemplate = "https://b.com", IsActive = true, Priority = 2, TargetCountries = null }
            );
            await ctx.SaveChangesAsync();
        }

        // Act
        var result = await _service.GetActivePartnersForContextAsync("DE", null);

        // Assert
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetActivePartnersForContextAsync_FiltersOutPartnersNotMatchingStreamingService()
    {
        // Arrange
        using (var ctx = CreateContext())
        {
            var netflixPartner = new AffiliatePartner
            {
                Id = Guid.NewGuid(),
                Name = "Netflix VPN",
                AffiliateUrlTemplate = "https://netflix-vpn.com",
                IsActive = true,
                Priority = 1,
                TargetStreamingServices = JsonSerializer.Serialize(new[] { "netflix" })
            };
            var allServicesPartner = new AffiliatePartner
            {
                Id = Guid.NewGuid(),
                Name = "All Services VPN",
                AffiliateUrlTemplate = "https://all-vpn.com",
                IsActive = true,
                Priority = 2,
                TargetStreamingServices = null
            };

            ctx.AffiliatePartners.AddRange(netflixPartner, allServicesPartner);
            await ctx.SaveChangesAsync();
        }

        // Act - request for Disney+
        var result = await _service.GetActivePartnersForContextAsync(null, "disney-plus");

        // Assert - only allServicesPartner should be returned
        Assert.Single(result);
        Assert.Equal("All Services VPN", result[0].Name);
    }

    // -------------------------------------------------------------------------
    // CreatePartnerAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task CreatePartnerAsync_CreatesPartnerWithCorrectProperties()
    {
        // Arrange
        var request = new CreateAffiliatePartnerRequest
        {
            Name = "NordVPN",
            AffiliateUrlTemplate = "https://go.nordvpn.net/aff_c?offer_id={offerId}&aff_id={affId}",
            CommissionRate = 40m,
            CommissionType = "percentage",
            Priority = 5,
            TargetCountries = new[] { "US", "UK" }
        };

        // Act
        var partner = await _service.CreatePartnerAsync(request);

        // Assert
        Assert.NotEqual(Guid.Empty, partner.Id);
        Assert.Equal("NordVPN", partner.Name);
        Assert.Equal("https://go.nordvpn.net/aff_c?offer_id={offerId}&aff_id={affId}", partner.AffiliateUrlTemplate);
        Assert.Equal(40m, partner.CommissionRate);
        Assert.Equal("percentage", partner.CommissionType);
        Assert.Equal(5, partner.Priority);
        Assert.True(partner.IsActive);
        // TargetCountries is stored as JSON
        Assert.NotNull(partner.TargetCountries);

        // Verify it's in the database
        using var ctx = CreateContext();
        var dbPartner = await ctx.AffiliatePartners.FindAsync(partner.Id);
        Assert.NotNull(dbPartner);
        Assert.Equal("NordVPN", dbPartner.Name);
    }

    // -------------------------------------------------------------------------
    // UpdatePartnerAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task UpdatePartnerAsync_UpdatesOnlyProvidedFields()
    {
        // Arrange
        var partnerId = Guid.NewGuid();
        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.Add(new AffiliatePartner
            {
                Id = partnerId,
                Name = "Original Name",
                AffiliateUrlTemplate = "https://original.com",
                IsActive = true,
                Priority = 3,
                CommissionRate = 20m
            });
            await ctx.SaveChangesAsync();
        }

        var updateRequest = new UpdateAffiliatePartnerRequest
        {
            Name = "Updated Name",
            Priority = 10
        };

        // Act
        var updated = await _service.UpdatePartnerAsync(partnerId, updateRequest);

        // Assert
        Assert.Equal("Updated Name", updated.Name);
        Assert.Equal(10, updated.Priority);
        // Fields not in request should remain unchanged
        Assert.Equal("https://original.com", updated.AffiliateUrlTemplate);
        Assert.Equal(20m, updated.CommissionRate);
        Assert.True(updated.IsActive);
    }

    [Fact]
    public async Task UpdatePartnerAsync_ThrowsKeyNotFoundWhenPartnerDoesNotExist()
    {
        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _service.UpdatePartnerAsync(Guid.NewGuid(), new UpdateAffiliatePartnerRequest { Name = "New" }));
    }

    // -------------------------------------------------------------------------
    // DeletePartnerAsync (soft delete)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task DeletePartnerAsync_SetsIsActiveToFalse()
    {
        // Arrange
        var partnerId = Guid.NewGuid();
        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.Add(new AffiliatePartner
            {
                Id = partnerId,
                Name = "To Delete",
                AffiliateUrlTemplate = "https://delete.com",
                IsActive = true
            });
            await ctx.SaveChangesAsync();
        }

        // Act
        var result = await _service.DeletePartnerAsync(partnerId);

        // Assert
        Assert.True(result);
        using var verifyCtx = CreateContext();
        var dbPartner = await verifyCtx.AffiliatePartners.FindAsync(partnerId);
        Assert.NotNull(dbPartner);
        Assert.False(dbPartner!.IsActive); // Soft delete - record still exists
    }

    [Fact]
    public async Task DeletePartnerAsync_ReturnsFalseWhenPartnerDoesNotExist()
    {
        // Act
        var result = await _service.DeletePartnerAsync(Guid.NewGuid());

        // Assert
        Assert.False(result);
    }

    // -------------------------------------------------------------------------
    // TogglePartnerActiveAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task TogglePartnerActiveAsync_TogglesFromActiveToInactive()
    {
        // Arrange
        var partnerId = Guid.NewGuid();
        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.Add(new AffiliatePartner
            {
                Id = partnerId,
                Name = "Toggle Partner",
                AffiliateUrlTemplate = "https://toggle.com",
                IsActive = true
            });
            await ctx.SaveChangesAsync();
        }

        // Act
        var isActive = await _service.TogglePartnerActiveAsync(partnerId);

        // Assert
        Assert.False(isActive);
        using var verifyCtx = CreateContext();
        var dbPartner = await verifyCtx.AffiliatePartners.FindAsync(partnerId);
        Assert.False(dbPartner!.IsActive);
    }

    [Fact]
    public async Task TogglePartnerActiveAsync_TogglesFromInactiveToActive()
    {
        // Arrange
        var partnerId = Guid.NewGuid();
        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.Add(new AffiliatePartner
            {
                Id = partnerId,
                Name = "Toggle Partner",
                AffiliateUrlTemplate = "https://toggle.com",
                IsActive = false
            });
            await ctx.SaveChangesAsync();
        }

        // Act
        var isActive = await _service.TogglePartnerActiveAsync(partnerId);

        // Assert
        Assert.True(isActive);
    }

    [Fact]
    public async Task TogglePartnerActiveAsync_ReturnsFalseWhenPartnerDoesNotExist()
    {
        // Act
        var result = await _service.TogglePartnerActiveAsync(Guid.NewGuid());

        // Assert
        Assert.False(result);
    }

    // -------------------------------------------------------------------------
    // GenerateAffiliateUrlAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GenerateAffiliateUrlAsync_ResolvesTemplatePlaceholders()
    {
        // Arrange
        var partnerId = Guid.NewGuid();
        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.Add(new AffiliatePartner
            {
                Id = partnerId,
                Name = "NordVPN",
                AffiliateUrlTemplate = "https://go.nordvpn.net/aff_c?offer_id={offerId}&aff_id={affId}",
                IsActive = true,
                TemplateParameters = JsonSerializer.Serialize(new Dictionary<string, string>
                {
                    { "offerId", "15" },
                    { "affId", "12345" }
                })
            });
            await ctx.SaveChangesAsync();
        }

        // Act
        var url = await _service.GenerateAffiliateUrlAsync(partnerId);

        // Assert
        Assert.Equal("https://go.nordvpn.net/aff_c?offer_id=15&aff_id=12345", url);
    }

    [Fact]
    public async Task GenerateAffiliateUrlAsync_AppliesOverrides()
    {
        // Arrange
        var partnerId = Guid.NewGuid();
        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.Add(new AffiliatePartner
            {
                Id = partnerId,
                Name = "TestVPN",
                AffiliateUrlTemplate = "https://vpn.com/aff?id={affId}",
                IsActive = true,
                TemplateParameters = JsonSerializer.Serialize(new Dictionary<string, string>
                {
                    { "affId", "default123" }
                })
            });
            await ctx.SaveChangesAsync();
        }

        // Act
        var url = await _service.GenerateAffiliateUrlAsync(partnerId, new Dictionary<string, string>
        {
            { "affId", "override456" }
        });

        // Assert
        Assert.Equal("https://vpn.com/aff?id=override456", url);
    }

    [Fact]
    public async Task GenerateAffiliateUrlAsync_ThrowsKeyNotFoundWhenPartnerDoesNotExist()
    {
        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _service.GenerateAffiliateUrlAsync(Guid.NewGuid()));
    }

    // -------------------------------------------------------------------------
    // GetDashboardAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetDashboardAsync_ReturnsCorrectTotals()
    {
        // Arrange
        var partnerId = Guid.NewGuid();
        var from = DateTime.UtcNow.AddDays(-7);
        var to = DateTime.UtcNow;

        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.Add(new AffiliatePartner
            {
                Id = partnerId,
                Name = "Test VPN",
                AffiliateUrlTemplate = "https://test.com",
                IsActive = true,
                Priority = 1
            });

            ctx.AffiliateClicks.AddRange(
                new AffiliateClick { Id = Guid.NewGuid(), AffiliatePartnerId = partnerId, ClickedAt = DateTime.UtcNow.AddDays(-1) },
                new AffiliateClick { Id = Guid.NewGuid(), AffiliatePartnerId = partnerId, ClickedAt = DateTime.UtcNow.AddDays(-2) },
                new AffiliateClick { Id = Guid.NewGuid(), AffiliatePartnerId = partnerId, ClickedAt = DateTime.UtcNow.AddDays(-3) }
            );
            ctx.AffiliateConversions.AddRange(
                new AffiliateConversion { Id = Guid.NewGuid(), AffiliatePartnerId = partnerId, Revenue = 100m, Commission = 40m, ConvertedAt = DateTime.UtcNow.AddDays(-1) },
                new AffiliateConversion { Id = Guid.NewGuid(), AffiliatePartnerId = partnerId, Revenue = 200m, Commission = 80m, ConvertedAt = DateTime.UtcNow.AddDays(-2) }
            );
            await ctx.SaveChangesAsync();
        }

        // Act
        var dashboard = await _service.GetDashboardAsync(from, to);

        // Assert
        Assert.Equal(3, dashboard.TotalClicks);
        Assert.Equal(2, dashboard.TotalConversions);
        Assert.Equal(300m, dashboard.TotalRevenue);
        Assert.Equal(120m, dashboard.TotalCommission);
        Assert.Equal(from, dashboard.From);
        Assert.Equal(to, dashboard.To);
    }

    [Fact]
    public async Task GetDashboardAsync_ConversionRateIsCorrect()
    {
        // Arrange
        var partnerId = Guid.NewGuid();
        var from = DateTime.UtcNow.AddDays(-7);
        var to = DateTime.UtcNow;

        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.Add(new AffiliatePartner
            {
                Id = partnerId,
                Name = "Test VPN",
                AffiliateUrlTemplate = "https://test.com",
                IsActive = true
            });

            // 4 clicks, 1 conversion = 25%
            for (int i = 0; i < 4; i++)
            {
                ctx.AffiliateClicks.Add(new AffiliateClick
                {
                    Id = Guid.NewGuid(),
                    AffiliatePartnerId = partnerId,
                    ClickedAt = DateTime.UtcNow.AddDays(-1)
                });
            }
            ctx.AffiliateConversions.Add(new AffiliateConversion
            {
                Id = Guid.NewGuid(),
                AffiliatePartnerId = partnerId,
                Revenue = 50m,
                Commission = 20m,
                ConvertedAt = DateTime.UtcNow.AddDays(-1)
            });
            await ctx.SaveChangesAsync();
        }

        // Act
        var dashboard = await _service.GetDashboardAsync(from, to);

        // Assert
        Assert.Equal(25.0, dashboard.ConversionRate, precision: 1);
    }

    // -------------------------------------------------------------------------
    // RecordConversionAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task RecordConversionAsync_SavesConversionRecord()
    {
        // Arrange
        var partnerId = Guid.NewGuid();
        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.Add(new AffiliatePartner
            {
                Id = partnerId,
                Name = "Test VPN",
                AffiliateUrlTemplate = "https://test.com",
                IsActive = true
            });
            await ctx.SaveChangesAsync();
        }

        var request = new AffiliateConversionRequest
        {
            PartnerId = partnerId,
            ExternalConversionId = "EXT-12345",
            Revenue = 149.99m,
            Commission = 59.99m
        };

        // Act
        await _service.RecordConversionAsync(request);

        // Assert
        using var verifyCtx = CreateContext();
        var conversion = await verifyCtx.AffiliateConversions.FirstOrDefaultAsync(c => c.AffiliatePartnerId == partnerId);
        Assert.NotNull(conversion);
        Assert.Equal("EXT-12345", conversion!.ExternalConversionId);
        Assert.Equal(149.99m, conversion.Revenue);
        Assert.Equal(59.99m, conversion.Commission);
        Assert.Equal("pending", conversion.Status);
    }

    // -------------------------------------------------------------------------
    // GetAllPartnersAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetAllPartnersAsync_PaginatesCorrectly()
    {
        // Arrange
        using (var ctx = CreateContext())
        {
            for (int i = 0; i < 5; i++)
            {
                ctx.AffiliatePartners.Add(new AffiliatePartner
                {
                    Id = Guid.NewGuid(),
                    Name = $"VPN {i}",
                    AffiliateUrlTemplate = $"https://vpn{i}.com",
                    IsActive = true,
                    Priority = i
                });
            }
            await ctx.SaveChangesAsync();
        }

        // Act - page 2, pageSize 2
        var result = await _service.GetAllPartnersAsync(page: 2, pageSize: 2, activeOnly: null);

        // Assert
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAllPartnersAsync_FiltersActiveOnlyWhenRequested()
    {
        // Arrange
        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.AddRange(
                new AffiliatePartner { Id = Guid.NewGuid(), Name = "Active", AffiliateUrlTemplate = "https://a.com", IsActive = true },
                new AffiliatePartner { Id = Guid.NewGuid(), Name = "Inactive", AffiliateUrlTemplate = "https://b.com", IsActive = false }
            );
            await ctx.SaveChangesAsync();
        }

        // Act
        var result = await _service.GetAllPartnersAsync(page: 1, pageSize: 20, activeOnly: true);

        // Assert
        Assert.Single(result);
        Assert.Equal("Active", result[0].Name);
    }

    // -------------------------------------------------------------------------
    // GetPartnerByIdAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetPartnerByIdAsync_ReturnsNullWhenNotFound()
    {
        // Act
        var result = await _service.GetPartnerByIdAsync(Guid.NewGuid());

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetPartnerByIdAsync_ReturnsCorrectPartner()
    {
        // Arrange
        var partnerId = Guid.NewGuid();
        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.Add(new AffiliatePartner
            {
                Id = partnerId,
                Name = "FindMe VPN",
                AffiliateUrlTemplate = "https://findme.com",
                IsActive = true
            });
            await ctx.SaveChangesAsync();
        }

        // Act
        var result = await _service.GetPartnerByIdAsync(partnerId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("FindMe VPN", result!.Name);
    }

    // -------------------------------------------------------------------------
    // GetPartnerAnalyticsAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetPartnerAnalyticsAsync_ReturnsCorrectAnalyticsForDateRange()
    {
        // Arrange
        var partnerId = Guid.NewGuid();
        var from = DateTime.UtcNow.AddDays(-30);
        var to = DateTime.UtcNow;

        using (var ctx = CreateContext())
        {
            ctx.AffiliatePartners.Add(new AffiliatePartner
            {
                Id = partnerId,
                Name = "Analytics VPN",
                AffiliateUrlTemplate = "https://analytics.com",
                IsActive = true
            });

            ctx.AffiliateClicks.AddRange(
                new AffiliateClick { Id = Guid.NewGuid(), AffiliatePartnerId = partnerId, ClickedAt = DateTime.UtcNow.AddDays(-5) },
                new AffiliateClick { Id = Guid.NewGuid(), AffiliatePartnerId = partnerId, ClickedAt = DateTime.UtcNow.AddDays(-10) },
                // Outside range
                new AffiliateClick { Id = Guid.NewGuid(), AffiliatePartnerId = partnerId, ClickedAt = DateTime.UtcNow.AddDays(-40) }
            );
            ctx.AffiliateConversions.Add(new AffiliateConversion
            {
                Id = Guid.NewGuid(),
                AffiliatePartnerId = partnerId,
                Revenue = 100m,
                Commission = 40m,
                ConvertedAt = DateTime.UtcNow.AddDays(-5)
            });
            await ctx.SaveChangesAsync();
        }

        // Act
        var dto = await _service.GetPartnerAnalyticsAsync(partnerId, from, to);

        // Assert
        Assert.Equal("Analytics VPN", dto.Name);
        Assert.Equal(2, dto.TotalClicks); // Only clicks within date range
        Assert.Equal(1, dto.TotalConversions);
        Assert.Equal(100m, dto.TotalRevenue);
    }
}
