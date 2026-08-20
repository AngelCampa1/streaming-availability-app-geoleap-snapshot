using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using System.Text;
using System.Text.Json;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for AccountingExportService - Invoice and revenue export functionality
/// Service: AccountingExportService.cs (380 LOC, 8 methods)
/// Focus: Accounting/billing export (2.0x business value multiplier)
/// </summary>
public class AccountingExportServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<AccountingExportService>> _mockLogger;
    private readonly Mock<ITaxCalculationService> _mockTaxService;
    private readonly AccountingExportService _service;
    private readonly Guid _userId;
    private readonly Guid _billingAddressId;

    public AccountingExportServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"AccountingExportTests_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<AccountingExportService>>();
        _mockTaxService = new Mock<ITaxCalculationService>();

        _service = new AccountingExportService(
            _context,
            _mockLogger.Object,
            _mockTaxService.Object
        );

        _userId = Guid.NewGuid();
        _billingAddressId = Guid.NewGuid();

        // Seed test data
        SeedTestData();
    }

    private void SeedTestData()
    {
        // Add test user
        var user = new User
        {
            Id = _userId,
            Email = "test@example.com",
            UserName = "testuser",
            FirstName = "Test",
            LastName = "User"
        };
        _context.Users.Add(user);

        // Add billing address
        var billingAddress = new BillingAddress
        {
            Id = _billingAddressId,
            UserId = _userId,
            FullName = "Test User",
            CompanyName = "Test Company Inc",
            AddressLine1 = "123 Test St",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            Country = "US"
        };
        _context.BillingAddresses.Add(billingAddress);

        // Add test invoices
        var invoice1 = new Invoice
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            BillingAddressId = _billingAddressId,
            InvoiceNumber = "INV-001",
            IssueDate = DateTime.UtcNow.AddDays(-10),
            DueDate = DateTime.UtcNow.AddDays(20),
            PaidAt = DateTime.UtcNow.AddDays(-5),
            Status = "paid",
            Subtotal = 100.00m,
            TaxAmount = 10.00m,
            Total = 110.00m,
            Currency = "USD",
            Description = "Monthly subscription"
        };

        var invoice2 = new Invoice
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            BillingAddressId = _billingAddressId,
            InvoiceNumber = "INV-002",
            IssueDate = DateTime.UtcNow.AddDays(-5),
            DueDate = DateTime.UtcNow.AddDays(25),
            PaidAt = DateTime.UtcNow,
            Status = "paid",
            Subtotal = 150.00m,
            TaxAmount = 15.00m,
            Total = 165.00m,
            Currency = "USD",
            Description = "Premium subscription"
        };

        var invoice3 = new Invoice
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            BillingAddressId = _billingAddressId,
            InvoiceNumber = "INV-003",
            IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(30),
            Status = "unpaid",
            Subtotal = 200.00m,
            TaxAmount = 20.00m,
            Total = 220.00m,
            Currency = "USD",
            Description = "Enterprise subscription"
        };

        _context.Invoices.AddRange(invoice1, invoice2, invoice3);

        // Add tax calculations
        var taxCalc1 = new TaxCalculation
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice1.Id,
            Jurisdiction = "CA",
            TaxType = "sales_tax",
            TaxName = "Sales Tax",
            Rate = 0.10m,
            TaxableAmount = 100.00m,
            TaxAmount = 10.00m,
            Country = "US"
        };

        var taxCalc2 = new TaxCalculation
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice2.Id,
            Jurisdiction = "CA",
            TaxType = "sales_tax",
            TaxName = "Sales Tax",
            Rate = 0.10m,
            TaxableAmount = 150.00m,
            TaxAmount = 15.00m,
            Country = "US"
        };

        _context.TaxCalculations.AddRange(taxCalc1, taxCalc2);

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region ExportInvoiceDataAsync Tests

    [Fact]
    public async Task ExportInvoiceDataAsync_WithCsvFormat_ReturnsCsvData()
    {
        // Arrange
        var filter = new InvoiceFilterRequest
        {
            StartDate = DateTime.UtcNow.AddDays(-15),
            EndDate = DateTime.UtcNow.AddDays(5),
            Status = "paid"
        };

        // Act
        var result = await _service.ExportInvoiceDataAsync(filter, "csv", "test-correlation");

        // Assert
        Assert.NotNull(result);
        var csv = Encoding.UTF8.GetString(result);
        Assert.Contains("InvoiceNumber", csv); // Header
        Assert.Contains("INV-001", csv);
        Assert.Contains("INV-002", csv);
        Assert.DoesNotContain("INV-003", csv); // Unpaid, should be filtered out
    }

    [Fact]
    public async Task ExportInvoiceDataAsync_WithJsonFormat_ReturnsJsonData()
    {
        // Arrange
        var filter = new InvoiceFilterRequest
        {
            StartDate = DateTime.UtcNow.AddDays(-15),
            EndDate = DateTime.UtcNow.AddDays(5)
        };

        // Act
        var result = await _service.ExportInvoiceDataAsync(filter, "json", "test-correlation");

        // Assert
        Assert.NotNull(result);
        var json = Encoding.UTF8.GetString(result);
        var invoices = JsonSerializer.Deserialize<List<InvoiceExportDto>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        Assert.NotNull(invoices);
        Assert.Equal(3, invoices.Count);
        Assert.Contains(invoices, i => i.InvoiceNumber == "INV-001");
    }

    [Fact]
    public async Task ExportInvoiceDataAsync_WithExcelFormat_ReturnsCsvData()
    {
        // Arrange
        var filter = new InvoiceFilterRequest();

        // Act
        var result = await _service.ExportInvoiceDataAsync(filter, "excel", "test-correlation");

        // Assert - Excel format currently returns CSV
        Assert.NotNull(result);
        var csv = Encoding.UTF8.GetString(result);
        Assert.Contains("InvoiceNumber", csv);
    }

    [Fact]
    public async Task ExportInvoiceDataAsync_WithQuickBooksFormat_ReturnsQuickBooksFormat()
    {
        // Arrange
        var filter = new InvoiceFilterRequest();

        // Act
        var result = await _service.ExportInvoiceDataAsync(filter, "quickbooks", "test-correlation");

        // Assert
        Assert.NotNull(result);
        var csv = Encoding.UTF8.GetString(result);
        Assert.Contains("Invoice No.,Customer,Customer Email,Date,Due Date", csv); // QuickBooks headers
        Assert.Contains("Test User", csv);
    }

    [Fact]
    public async Task ExportInvoiceDataAsync_WithXeroFormat_ReturnsXeroFormat()
    {
        // Arrange
        var filter = new InvoiceFilterRequest();

        // Act
        var result = await _service.ExportInvoiceDataAsync(filter, "xero", "test-correlation");

        // Assert
        Assert.NotNull(result);
        var csv = Encoding.UTF8.GetString(result);
        Assert.Contains("ContactName,EmailAddress,InvoiceNumber", csv); // Xero headers
        Assert.Contains("Test User", csv);
        Assert.Contains("4000", csv); // Account code
    }

    [Fact]
    public async Task ExportInvoiceDataAsync_WithUnsupportedFormat_ThrowsArgumentException()
    {
        // Arrange
        var filter = new InvoiceFilterRequest();

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.ExportInvoiceDataAsync(filter, "invalid-format", "test-correlation")
        );
    }

    [Fact]
    public async Task ExportInvoiceDataAsync_WithDateFilter_FiltersCorrectly()
    {
        // Arrange
        var filter = new InvoiceFilterRequest
        {
            StartDate = DateTime.UtcNow.AddDays(-6),
            EndDate = DateTime.UtcNow.AddDays(1)
        };

        // Act
        var result = await _service.ExportInvoiceDataAsync(filter, "json", "test-correlation");

        // Assert
        var json = Encoding.UTF8.GetString(result);
        var invoices = JsonSerializer.Deserialize<List<InvoiceExportDto>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        Assert.NotNull(invoices);
        Assert.Equal(2, invoices.Count); // INV-002 and INV-003
        Assert.Contains(invoices, i => i.InvoiceNumber == "INV-002");
        Assert.Contains(invoices, i => i.InvoiceNumber == "INV-003");
    }

    [Fact]
    public async Task ExportInvoiceDataAsync_WithStatusFilter_FiltersCorrectly()
    {
        // Arrange
        var filter = new InvoiceFilterRequest
        {
            Status = "unpaid"
        };

        // Act
        var result = await _service.ExportInvoiceDataAsync(filter, "json", "test-correlation");

        // Assert
        var json = Encoding.UTF8.GetString(result);
        var invoices = JsonSerializer.Deserialize<List<InvoiceExportDto>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        Assert.NotNull(invoices);
        Assert.Single(invoices);
        Assert.Equal("INV-003", invoices[0].InvoiceNumber);
    }

    #endregion

    #region ExportTaxReportAsync Tests

    [Fact]
    public async Task ExportTaxReportAsync_WithJsonFormat_ReturnsJsonData()
    {
        // Arrange
        var taxReport = new Dictionary<string, object>
        {
            ["jurisdiction"] = "CA",
            ["start_date"] = DateTime.UtcNow.AddDays(-30),
            ["end_date"] = DateTime.UtcNow,
            ["total_tax_collected"] = 25.00m,
            ["total_taxable_amount"] = 250.00m,
            ["transaction_count"] = 2
        };

        _mockTaxService
            .Setup(x => x.GenerateTaxReportAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>()))
            .ReturnsAsync(taxReport);

        // Act
        var result = await _service.ExportTaxReportAsync(
            DateTime.UtcNow.AddDays(-30),
            DateTime.UtcNow,
            "CA",
            "json"
        );

        // Assert
        Assert.NotNull(result);
        var json = Encoding.UTF8.GetString(result);
        Assert.Contains("CA", json);
        Assert.Contains("25", json);
    }

    [Fact]
    public async Task ExportTaxReportAsync_WithCsvFormat_ReturnsCsvData()
    {
        // Arrange
        var taxReport = new Dictionary<string, object>
        {
            ["jurisdiction"] = "NY",
            ["start_date"] = DateTime.UtcNow.AddDays(-30),
            ["end_date"] = DateTime.UtcNow,
            ["total_tax_collected"] = 30.00m,
            ["total_taxable_amount"] = 300.00m,
            ["transaction_count"] = 3
        };

        _mockTaxService
            .Setup(x => x.GenerateTaxReportAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>()))
            .ReturnsAsync(taxReport);

        // Act
        var result = await _service.ExportTaxReportAsync(
            DateTime.UtcNow.AddDays(-30),
            DateTime.UtcNow,
            "NY",
            "csv"
        );

        // Assert
        Assert.NotNull(result);
        var csv = Encoding.UTF8.GetString(result);
        Assert.Contains("Jurisdiction,Start Date,End Date", csv); // Header
        Assert.Contains("NY", csv);
        Assert.Contains("30.00", csv);
    }

    [Fact]
    public async Task ExportTaxReportAsync_WithUnsupportedFormat_ThrowsArgumentException()
    {
        // Arrange
        _mockTaxService
            .Setup(x => x.GenerateTaxReportAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>()))
            .ReturnsAsync(new Dictionary<string, object>());

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.ExportTaxReportAsync(DateTime.UtcNow.AddDays(-30), DateTime.UtcNow, "CA", "xml")
        );
    }

    #endregion

    #region ExportRevenueReportAsync Tests

    [Fact]
    public async Task ExportRevenueReportAsync_WithCsvFormat_ReturnsRevenueData()
    {
        // Act
        var result = await _service.ExportRevenueReportAsync(
            DateTime.UtcNow.AddDays(-15),
            DateTime.UtcNow.AddDays(5),
            "csv"
        );

        // Assert
        Assert.NotNull(result);
        var csv = Encoding.UTF8.GetString(result);
        Assert.Contains("GrossRevenue", csv); // Header
        Assert.Contains("110.00", csv); // Invoice 1 total
        Assert.Contains("165.00", csv); // Invoice 2 total
    }

    [Fact]
    public async Task ExportRevenueReportAsync_WithJsonFormat_ReturnsJsonData()
    {
        // Act
        var result = await _service.ExportRevenueReportAsync(
            DateTime.UtcNow.AddDays(-15),
            DateTime.UtcNow.AddDays(5),
            "json"
        );

        // Assert
        Assert.NotNull(result);
        var json = Encoding.UTF8.GetString(result);
        var report = JsonSerializer.Deserialize<List<RevenueReportDto>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        Assert.NotNull(report);
        Assert.True(report.Count > 0);
        Assert.All(report, r => Assert.True(r.GrossRevenue > 0));
    }

    [Fact]
    public async Task ExportRevenueReportAsync_OnlyIncludesPaidInvoices()
    {
        // Act
        var result = await _service.ExportRevenueReportAsync(
            DateTime.UtcNow.AddDays(-15),
            DateTime.UtcNow.AddDays(5),
            "json"
        );

        // Assert
        var json = Encoding.UTF8.GetString(result);
        var report = JsonSerializer.Deserialize<List<RevenueReportDto>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        Assert.NotNull(report);
        // Should only include 2 paid invoices (INV-001 and INV-002)
        var totalRevenue = report.Sum(r => r.GrossRevenue);
        Assert.Equal(275.00m, totalRevenue); // 110 + 165
    }

    [Fact]
    public async Task ExportRevenueReportAsync_WithUnsupportedFormat_ThrowsArgumentException()
    {
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.ExportRevenueReportAsync(DateTime.UtcNow.AddDays(-15), DateTime.UtcNow, "pdf")
        );
    }

    #endregion

    #region ExportToCsvAsync Tests

    [Fact]
    public async Task ExportToCsvAsync_WithData_ReturnsFormattedCsv()
    {
        // Arrange
        var data = new List<TestDto>
        {
            new TestDto { Name = "Test 1", Value = 100 },
            new TestDto { Name = "Test 2", Value = 200 }
        };

        // Act
        var result = await _service.ExportToCsvAsync(data, "test");

        // Assert
        Assert.NotNull(result);
        var csv = Encoding.UTF8.GetString(result);
        Assert.Contains("Name,Value", csv); // Header
        Assert.Contains("Test 1,100", csv);
        Assert.Contains("Test 2,200", csv);
    }

    [Fact]
    public async Task ExportToCsvAsync_WithEmptyData_ReturnsNoDataMessage()
    {
        // Arrange
        var data = new List<TestDto>();

        // Act
        var result = await _service.ExportToCsvAsync(data, "test");

        // Assert
        Assert.NotNull(result);
        var csv = Encoding.UTF8.GetString(result);
        Assert.Equal("No data available", csv);
    }

    [Fact]
    public async Task ExportToCsvAsync_WithSpecialCharacters_EscapesCorrectly()
    {
        // Arrange
        var data = new List<TestDto>
        {
            new TestDto { Name = "Test, with comma", Value = 100 },
            new TestDto { Name = "Test \"with quotes\"", Value = 200 }
        };

        // Act
        var result = await _service.ExportToCsvAsync(data, "test");

        // Assert
        var csv = Encoding.UTF8.GetString(result);
        Assert.Contains("\"Test, with comma\"", csv); // Quoted due to comma
        Assert.Contains("\"Test \"\"with quotes\"\"\"", csv); // Escaped quotes
    }

    #endregion

    #region ExportToJsonAsync Tests

    [Fact]
    public async Task ExportToJsonAsync_WithData_ReturnsFormattedJson()
    {
        // Arrange
        var data = new List<TestDto>
        {
            new TestDto { Name = "Test 1", Value = 100 },
            new TestDto { Name = "Test 2", Value = 200 }
        };

        // Act
        var result = await _service.ExportToJsonAsync(data, "test");

        // Assert
        Assert.NotNull(result);
        var json = Encoding.UTF8.GetString(result);
        var deserialized = JsonSerializer.Deserialize<List<TestDto>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        Assert.NotNull(deserialized);
        Assert.Equal(2, deserialized.Count);
        Assert.Equal("Test 1", deserialized[0].Name);
    }

    #endregion

    #region GetChartOfAccountsMappingAsync Tests

    [Fact]
    public async Task GetChartOfAccountsMappingAsync_ReturnsDefaultMappings()
    {
        // Act
        var result = await _service.GetChartOfAccountsMappingAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Equal("4000", result["subscription_revenue"]);
        Assert.Equal("2200", result["sales_tax_collected"]);
        Assert.Equal("2210", result["vat_collected"]);
        Assert.Equal("5200", result["processing_fees"]);
        Assert.Equal("4100", result["refunds"]);
    }

    #endregion

    #region UpdateChartOfAccountsMappingAsync Tests

    [Fact]
    public async Task UpdateChartOfAccountsMappingAsync_WithValidMapping_UpdatesSuccessfully()
    {
        // Arrange
        var newMapping = new Dictionary<string, string>
        {
            ["subscription_revenue"] = "5000",
            ["sales_tax_collected"] = "3000"
        };

        // Act
        var result = await _service.UpdateChartOfAccountsMappingAsync(newMapping, "admin");

        // Assert
        Assert.True(result);

        // Verify update by getting mapping
        var updated = await _service.GetChartOfAccountsMappingAsync();
        Assert.Equal("5000", updated["subscription_revenue"]);
        Assert.Equal("3000", updated["sales_tax_collected"]);
    }

    [Fact]
    public async Task UpdateChartOfAccountsMappingAsync_LogsUpdate()
    {
        // Arrange
        var newMapping = new Dictionary<string, string>
        {
            ["subscription_revenue"] = "6000"
        };

        // Act
        await _service.UpdateChartOfAccountsMappingAsync(newMapping, "test-admin");

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Updated chart of accounts mapping")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    // Helper DTO for testing generic export methods
    private class TestDto
    {
        public string Name { get; set; } = string.Empty;
        public int Value { get; set; }
    }
}
