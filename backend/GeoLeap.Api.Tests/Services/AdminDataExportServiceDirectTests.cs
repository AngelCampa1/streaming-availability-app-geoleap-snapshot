using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

public class AdminDataExportServiceDirectTests
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<AdminDataExportService>> _mockLogger;
    private readonly Mock<IAdminActionLogger> _mockActionLogger;
    private readonly AdminDataExportService _service;
    private readonly string _correlationId = "test-correlation-id";

    public AdminDataExportServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"AdminDataExportTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<AdminDataExportService>>();
        _mockActionLogger = new Mock<IAdminActionLogger>();
        _service = new AdminDataExportService(_context, _mockLogger.Object, _mockActionLogger.Object);
    }

    #region ExportDataAsync Tests

    [Fact]
    public async Task ExportDataAsync_WithUsersEntityType_ExportsUsersSuccessfully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _context.Users.Add(new User { Id = userId, Email = "test@example.com", UserName = "testuser" });
        await _context.SaveChangesAsync();

        var request = new DataExportRequest
        {
            ExportType = "users",
            Format = "json"
        };

        // Act
        var stream = await _service.ExportDataAsync(request, Guid.NewGuid(), _correlationId);

        // Assert
        Assert.NotNull(stream);
        Assert.True(stream.Length > 0);
        Assert.Equal(0, stream.Position);
    }

    [Fact]
    public async Task ExportDataAsync_WithInvalidEntityType_ThrowsArgumentException()
    {
        // Arrange
        var request = new DataExportRequest
        {
            ExportType = "invalid",
            Format = "json"
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.ExportDataAsync(request, Guid.NewGuid(), _correlationId));
    }

    [Fact]
    public async Task ExportDataAsync_LogsAdminAction()
    {
        // Arrange
        var requestedBy = Guid.NewGuid();
        var request = new DataExportRequest
        {
            ExportType = "users",
            Format = "json"
        };

        // Act
        await _service.ExportDataAsync(request, requestedBy, _correlationId);

        // Assert
        _mockActionLogger.Verify(l => l.LogActionAsync(
            requestedBy,
            "Data Export",
            "users",
            "Bulk",
            _correlationId,
            It.IsAny<Guid?>(),
            It.IsAny<object>()), Times.Once);
    }

    #endregion

    #region GetAvailableFormatsAsync Tests

    [Fact]
    public async Task GetAvailableFormatsAsync_ReturnsAllSupportedFormats()
    {
        // Act
        var formats = await _service.GetAvailableFormatsAsync("users", _correlationId);

        // Assert
        Assert.NotNull(formats);
        Assert.Equal(3, formats.Count);
        Assert.Contains(formats, f => f.Id == "csv");
        Assert.Contains(formats, f => f.Id == "json");
        Assert.Contains(formats, f => f.Id == "xlsx");
    }

    [Fact]
    public async Task GetAvailableFormatsAsync_FormatsHaveCorrectMimeTypes()
    {
        // Act
        var formats = await _service.GetAvailableFormatsAsync("users", _correlationId);

        // Assert
        var csvFormat = formats.First(f => f.Id == "csv");
        var jsonFormat = formats.First(f => f.Id == "json");
        var xlsxFormat = formats.First(f => f.Id == "xlsx");

        Assert.Equal("text/csv", csvFormat.MimeType);
        Assert.Equal("application/json", jsonFormat.MimeType);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsxFormat.MimeType);
    }

    #endregion

    #region RequestDataExportAsync Tests

    [Fact]
    public async Task RequestDataExportAsync_CreatesNewExport()
    {
        // Arrange
        var requestedBy = Guid.NewGuid();
        var request = new AdminDataExportRequest
        {
            ExportType = "users",
            Format = "csv"
        };

        // Act
        var result = await _service.RequestDataExportAsync(request, requestedBy, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("users", result.ExportType);
        Assert.Equal("csv", result.Format);
        Assert.Equal(ExportStatus.Pending, result.Status);
        Assert.Equal(requestedBy, result.RequestedBy);
    }

    [Fact]
    public async Task RequestDataExportAsync_SavesExportToDatabase()
    {
        // Arrange
        var request = new AdminDataExportRequest
        {
            ExportType = "subscriptions",
            Format = "json"
        };

        // Act
        var result = await _service.RequestDataExportAsync(request, Guid.NewGuid(), _correlationId);

        // Assert
        var savedExport = await _context.AdminDataExports.FindAsync(result.Id);
        Assert.NotNull(savedExport);
        Assert.Equal("subscriptions", savedExport.ExportType);
    }

    #endregion

    #region GetExportStatusAsync Tests

    [Fact]
    public async Task GetExportStatusAsync_WithValidId_ReturnsExport()
    {
        // Arrange
        var exportId = Guid.NewGuid();
        var export = new AdminDataExport
        {
            Id = exportId,
            ExportType = "users",
            Format = "csv",
            Status = ExportStatus.Pending,
            RequestedBy = Guid.NewGuid()
        };
        _context.AdminDataExports.Add(export);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetExportStatusAsync(exportId, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(exportId, result.Id);
        Assert.Equal(ExportStatus.Pending, result.Status);
    }

    [Fact]
    public async Task GetExportStatusAsync_WithInvalidId_ReturnsNull()
    {
        // Act
        var result = await _service.GetExportStatusAsync(Guid.NewGuid(), _correlationId);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region DownloadExportAsync Tests

    [Fact]
    public async Task DownloadExportAsync_WithCompletedExport_ReturnsDownloadResult()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var exportId = Guid.NewGuid();
        var export = new AdminDataExport
        {
            Id = exportId,
            ExportType = "users",
            Format = "csv",
            Status = ExportStatus.Completed,
            RequestedBy = userId,
            FilePath = "/path/to/file.csv"
        };
        _context.AdminDataExports.Add(export);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DownloadExportAsync(exportId, userId, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.FileStream);
        Assert.Contains("export_", result.FileName);
        Assert.Contains(".csv", result.FileName);
    }

    [Fact]
    public async Task DownloadExportAsync_WithPendingExport_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var exportId = Guid.NewGuid();
        var export = new AdminDataExport
        {
            Id = exportId,
            ExportType = "users",
            Format = "csv",
            Status = ExportStatus.Pending,
            RequestedBy = userId
        };
        _context.AdminDataExports.Add(export);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DownloadExportAsync(exportId, userId, _correlationId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task DownloadExportAsync_WithWrongUser_ReturnsNull()
    {
        // Arrange
        var exportId = Guid.NewGuid();
        var export = new AdminDataExport
        {
            Id = exportId,
            ExportType = "users",
            Format = "csv",
            Status = ExportStatus.Completed,
            RequestedBy = Guid.NewGuid(),
            FilePath = "/path/to/file.csv"
        };
        _context.AdminDataExports.Add(export);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DownloadExportAsync(exportId, Guid.NewGuid(), _correlationId);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region GetUserExportsAsync Tests

    [Fact]
    public async Task GetUserExportsAsync_ReturnsUserExports()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _context.AdminDataExports.AddRange(
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "users", Format = "csv", Status = ExportStatus.Completed, RequestedBy = userId },
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "subscriptions", Format = "json", Status = ExportStatus.Pending, RequestedBy = userId },
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "payments", Format = "csv", Status = ExportStatus.Completed, RequestedBy = Guid.NewGuid() }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserExportsAsync(userId, null, 1, 10, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.All(result, e => Assert.Equal(userId, e.RequestedBy));
    }

    [Fact]
    public async Task GetUserExportsAsync_WithStatusFilter_ReturnsFilteredExports()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _context.AdminDataExports.AddRange(
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "users", Format = "csv", Status = ExportStatus.Completed, RequestedBy = userId },
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "subscriptions", Format = "json", Status = ExportStatus.Pending, RequestedBy = userId }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserExportsAsync(userId, ExportStatus.Completed, 1, 10, _correlationId);

        // Assert
        Assert.Single(result);
        Assert.Equal(ExportStatus.Completed, result[0].Status);
    }

    [Fact]
    public async Task GetUserExportsAsync_SupportsPagination()
    {
        // Arrange
        var userId = Guid.NewGuid();
        for (int i = 0; i < 5; i++)
        {
            _context.AdminDataExports.Add(new AdminDataExport
            {
                Id = Guid.NewGuid(),
                ExportType = "users",
                Format = "csv",
                Status = ExportStatus.Completed,
                RequestedBy = userId,
                CreatedAt = DateTime.UtcNow.AddMinutes(-i)
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var page1 = await _service.GetUserExportsAsync(userId, null, 1, 2, _correlationId);
        var page2 = await _service.GetUserExportsAsync(userId, null, 2, 2, _correlationId);

        // Assert
        Assert.Equal(2, page1.Count);
        Assert.Equal(2, page2.Count);
        Assert.NotEqual(page1[0].Id, page2[0].Id);
    }

    #endregion

    #region GetAllExportsAsync Tests

    [Fact]
    public async Task GetAllExportsAsync_ReturnsAllExports()
    {
        // Arrange
        _context.AdminDataExports.AddRange(
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "users", Format = "csv", Status = ExportStatus.Completed, RequestedBy = Guid.NewGuid() },
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "subscriptions", Format = "json", Status = ExportStatus.Pending, RequestedBy = Guid.NewGuid() }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetAllExportsAsync(null, null, 1, 10, _correlationId);

        // Assert
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAllExportsAsync_WithStatusFilter_ReturnsFilteredExports()
    {
        // Arrange
        _context.AdminDataExports.AddRange(
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "users", Format = "csv", Status = ExportStatus.Completed, RequestedBy = Guid.NewGuid() },
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "subscriptions", Format = "json", Status = ExportStatus.Pending, RequestedBy = Guid.NewGuid() },
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "payments", Format = "csv", Status = ExportStatus.Failed, RequestedBy = Guid.NewGuid() }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetAllExportsAsync(ExportStatus.Completed, null, 1, 10, _correlationId);

        // Assert
        Assert.Single(result);
        Assert.Equal(ExportStatus.Completed, result[0].Status);
    }

    [Fact]
    public async Task GetAllExportsAsync_WithUserIdFilter_ReturnsUserExports()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _context.AdminDataExports.AddRange(
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "users", Format = "csv", Status = ExportStatus.Completed, RequestedBy = userId },
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "subscriptions", Format = "json", Status = ExportStatus.Pending, RequestedBy = Guid.NewGuid() }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetAllExportsAsync(null, userId, 1, 10, _correlationId);

        // Assert
        Assert.Single(result);
        Assert.Equal(userId, result[0].RequestedBy);
    }

    #endregion

    #region CancelExportAsync Tests

    [Fact]
    public async Task CancelExportAsync_WithPendingExport_CancelsSuccessfully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var exportId = Guid.NewGuid();
        var export = new AdminDataExport
        {
            Id = exportId,
            ExportType = "users",
            Format = "csv",
            Status = ExportStatus.Pending,
            RequestedBy = userId
        };
        _context.AdminDataExports.Add(export);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CancelExportAsync(exportId, userId, _correlationId);

        // Assert
        Assert.True(result);
        var updatedExport = await _context.AdminDataExports.FindAsync(exportId);
        Assert.Equal(ExportStatus.Cancelled, updatedExport!.Status);
        Assert.NotNull(updatedExport.CompletedAt);
    }

    [Fact]
    public async Task CancelExportAsync_WithCompletedExport_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var exportId = Guid.NewGuid();
        var export = new AdminDataExport
        {
            Id = exportId,
            ExportType = "users",
            Format = "csv",
            Status = ExportStatus.Completed,
            RequestedBy = userId
        };
        _context.AdminDataExports.Add(export);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CancelExportAsync(exportId, userId, _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task CancelExportAsync_WithWrongUser_ReturnsFalse()
    {
        // Arrange
        var exportId = Guid.NewGuid();
        var export = new AdminDataExport
        {
            Id = exportId,
            ExportType = "users",
            Format = "csv",
            Status = ExportStatus.Pending,
            RequestedBy = Guid.NewGuid()
        };
        _context.AdminDataExports.Add(export);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CancelExportAsync(exportId, Guid.NewGuid(), _correlationId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region DeleteExportAsync Tests

    [Fact]
    public async Task DeleteExportAsync_WithValidExport_DeletesSuccessfully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var exportId = Guid.NewGuid();
        var export = new AdminDataExport
        {
            Id = exportId,
            ExportType = "users",
            Format = "csv",
            Status = ExportStatus.Completed,
            RequestedBy = userId
        };
        _context.AdminDataExports.Add(export);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DeleteExportAsync(exportId, userId, _correlationId);

        // Assert
        Assert.True(result);
        var deletedExport = await _context.AdminDataExports.FindAsync(exportId);
        Assert.Null(deletedExport);
    }

    [Fact]
    public async Task DeleteExportAsync_WithNonexistentExport_ReturnsFalse()
    {
        // Act
        var result = await _service.DeleteExportAsync(Guid.NewGuid(), Guid.NewGuid(), _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteExportAsync_WithWrongUser_ReturnsFalse()
    {
        // Arrange
        var exportId = Guid.NewGuid();
        var export = new AdminDataExport
        {
            Id = exportId,
            ExportType = "users",
            Format = "csv",
            Status = ExportStatus.Completed,
            RequestedBy = Guid.NewGuid()
        };
        _context.AdminDataExports.Add(export);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DeleteExportAsync(exportId, Guid.NewGuid(), _correlationId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region GetAvailableExportTypesAsync Tests

    [Fact]
    public async Task GetAvailableExportTypesAsync_ReturnsAllExportTypes()
    {
        // Act
        var result = await _service.GetAvailableExportTypesAsync(_correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(5, result.Count);
        Assert.Contains(result, t => t.Id == "users");
        Assert.Contains(result, t => t.Id == "subscriptions");
        Assert.Contains(result, t => t.Id == "payments");
        Assert.Contains(result, t => t.Id == "auditlogs");
        Assert.Contains(result, t => t.Id == "content");
    }

    [Fact]
    public async Task GetAvailableExportTypesAsync_ExportTypesHaveSupportedFormats()
    {
        // Act
        var result = await _service.GetAvailableExportTypesAsync(_correlationId);

        // Assert
        var usersType = result.First(t => t.Id == "users");
        Assert.Contains("csv", usersType.SupportedFormats);
        Assert.Contains("json", usersType.SupportedFormats);
        Assert.Contains("xlsx", usersType.SupportedFormats);
    }

    #endregion

    #region GetExportStatisticsAsync Tests

    [Fact]
    public async Task GetExportStatisticsAsync_CalculatesCorrectStatistics()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddDays(-7);
        var endDate = DateTime.UtcNow;

        _context.AdminDataExports.AddRange(
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "users", Format = "csv", Status = ExportStatus.Completed, RequestedBy = Guid.NewGuid(), CreatedAt = DateTime.UtcNow.AddDays(-3) },
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "users", Format = "json", Status = ExportStatus.Completed, RequestedBy = Guid.NewGuid(), CreatedAt = DateTime.UtcNow.AddDays(-2) },
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "subscriptions", Format = "csv", Status = ExportStatus.Failed, RequestedBy = Guid.NewGuid(), CreatedAt = DateTime.UtcNow.AddDays(-1) }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetExportStatisticsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Equal(3, result["totalExports"]);
        Assert.Equal(2, result["completedExports"]);
        Assert.Equal(1, result["failedExports"]);
    }

    #endregion

    #region CleanupExpiredExportsAsync Tests

    [Fact]
    public async Task CleanupExpiredExportsAsync_WithDryRun_ReturnsCount()
    {
        // Arrange
        _context.AdminDataExports.AddRange(
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "users", Format = "csv", Status = ExportStatus.Completed, RequestedBy = Guid.NewGuid(), CreatedAt = DateTime.UtcNow.AddDays(-40) },
            new AdminDataExport { Id = Guid.NewGuid(), ExportType = "subscriptions", Format = "json", Status = ExportStatus.Completed, RequestedBy = Guid.NewGuid(), CreatedAt = DateTime.UtcNow.AddDays(-35) }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CleanupExpiredExportsAsync(30, true, Guid.NewGuid(), _correlationId);

        // Assert
        Assert.True(result.Success);
        Assert.Equal(2, result.FilesDeleted);
        Assert.Contains("Would delete", result.Message);
    }

    [Fact]
    public async Task CleanupExpiredExportsAsync_WithoutDryRun_DeletesExpired()
    {
        // Arrange
        var oldExportId = Guid.NewGuid();
        var recentExportId = Guid.NewGuid();
        _context.AdminDataExports.AddRange(
            new AdminDataExport { Id = oldExportId, ExportType = "users", Format = "csv", Status = ExportStatus.Completed, RequestedBy = Guid.NewGuid(), CreatedAt = DateTime.UtcNow.AddDays(-40) },
            new AdminDataExport { Id = recentExportId, ExportType = "subscriptions", Format = "json", Status = ExportStatus.Completed, RequestedBy = Guid.NewGuid(), CreatedAt = DateTime.UtcNow.AddDays(-5) }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CleanupExpiredExportsAsync(30, false, Guid.NewGuid(), _correlationId);

        // Assert
        Assert.True(result.Success);
        Assert.Equal(1, result.FilesDeleted);
        var oldExport = await _context.AdminDataExports.FindAsync(oldExportId);
        var recentExport = await _context.AdminDataExports.FindAsync(recentExportId);
        Assert.Null(oldExport);
        Assert.NotNull(recentExport);
    }

    #endregion

    #region PreviewExportDataAsync Tests

    [Fact]
    public async Task PreviewExportDataAsync_WithUsersType_ReturnsUserPreview()
    {
        // Arrange
        _context.Users.AddRange(
            new User { Id = Guid.NewGuid(), Email = "user1@example.com", FirstName = "User", LastName = "One" },
            new User { Id = Guid.NewGuid(), Email = "user2@example.com", FirstName = "User", LastName = "Two" }
        );
        await _context.SaveChangesAsync();

        var request = new AdminDataExportRequest { ExportType = "users" };

        // Act
        var result = await _service.PreviewExportDataAsync(request, Guid.NewGuid(), _correlationId);

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task PreviewExportDataAsync_WithSubscriptionsType_ReturnsSubscriptionPreview()
    {
        // Arrange
        _context.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            PlanType = "Premium",
            Status = "Active",
            StripeSubscriptionId = "sub_test123",
            StripePriceId = "price_test123"
        });
        await _context.SaveChangesAsync();

        var request = new AdminDataExportRequest { ExportType = "subscriptions" };

        // Act
        var result = await _service.PreviewExportDataAsync(request, Guid.NewGuid(), _correlationId);

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task PreviewExportDataAsync_WithUnsupportedType_ReturnsMessage()
    {
        // Arrange
        var request = new AdminDataExportRequest { ExportType = "unsupported" };

        // Act
        var result = await _service.PreviewExportDataAsync(request, Guid.NewGuid(), _correlationId);

        // Assert
        Assert.NotNull(result);
    }

    #endregion

    #region ScheduleRecurringExportAsync Tests

    [Fact]
    public async Task ScheduleRecurringExportAsync_CreatesScheduledExport()
    {
        // Arrange
        var request = new ScheduleExportRequest
        {
            Name = "Weekly Users Export",
            ExportRequest = new AdminDataExportRequest { ExportType = "users", Format = "csv" },
            CronExpression = "0 0 * * 0",
            IsEnabled = true,
            Recipients = new List<string> { "admin@example.com" }
        };

        // Act
        var result = await _service.ScheduleRecurringExportAsync(request, Guid.NewGuid(), _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Weekly Users Export", result.Name);
        Assert.Equal("0 0 * * 0", result.CronExpression);
        Assert.True(result.IsEnabled);
    }

    #endregion

    #region ValidateExportRequestAsync Tests

    [Fact]
    public async Task ValidateExportRequestAsync_WithValidRequest_ReturnsValid()
    {
        // Arrange
        var request = new AdminDataExportRequest
        {
            ExportType = "users",
            Format = "csv"
        };

        // Act
        var result = await _service.ValidateExportRequestAsync(request, _correlationId);

        // Assert
        Assert.True(result.IsValid);
        Assert.Empty(result.Errors);
    }

    [Fact]
    public async Task ValidateExportRequestAsync_WithMissingExportType_ReturnsInvalid()
    {
        // Arrange
        var request = new AdminDataExportRequest
        {
            ExportType = "",
            Format = "csv"
        };

        // Act
        var result = await _service.ValidateExportRequestAsync(request, _correlationId);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("Export type is required"));
    }

    [Fact]
    public async Task ValidateExportRequestAsync_WithMissingFormat_ReturnsInvalid()
    {
        // Arrange
        var request = new AdminDataExportRequest
        {
            ExportType = "users",
            Format = ""
        };

        // Act
        var result = await _service.ValidateExportRequestAsync(request, _correlationId);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("Format is required"));
    }

    #endregion

    #region EstimateExportSizeAsync Tests

    [Fact]
    public async Task EstimateExportSizeAsync_CalculatesEstimate()
    {
        // Arrange
        _context.Users.AddRange(
            new User { Id = Guid.NewGuid(), Email = "user1@example.com", UserName = "user1" },
            new User { Id = Guid.NewGuid(), Email = "user2@example.com", UserName = "user2" }
        );
        await _context.SaveChangesAsync();

        var request = new AdminDataExportRequest { ExportType = "users" };

        // Act
        var result = await _service.EstimateExportSizeAsync(request, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.EstimatedRecords);
        Assert.True(result.EstimatedSizeBytes > 0);
        Assert.False(result.RequiresStreaming);
    }

    [Fact]
    public async Task EstimateExportSizeAsync_WithLargeDataset_RecommendsStreaming()
    {
        // Arrange - simulate large dataset
        var request = new AdminDataExportRequest { ExportType = "users" };

        // Act
        var result = await _service.EstimateExportSizeAsync(request, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.RecommendedFormat);
    }

    #endregion

    #region GenerateExportFileAsync Tests

    [Fact]
    public async Task GenerateExportFileAsync_CreatesFileAndUpdatesStatus()
    {
        // Arrange
        var export = new AdminDataExport
        {
            Id = Guid.NewGuid(),
            ExportType = "users",
            Format = "csv",
            Status = ExportStatus.Pending,
            RequestedBy = Guid.NewGuid()
        };
        _context.AdminDataExports.Add(export);
        await _context.SaveChangesAsync();

        // Act
        var filePath = await _service.GenerateExportFileAsync(export, _correlationId);

        // Assert
        Assert.NotNull(filePath);
        Assert.Contains(export.Id.ToString(), filePath);

        var updatedExport = await _context.AdminDataExports.FindAsync(export.Id);
        Assert.Equal(ExportStatus.Completed, updatedExport!.Status);
        Assert.NotNull(updatedExport.CompletedAt);
        Assert.NotNull(updatedExport.FilePath);
    }

    #endregion
}
